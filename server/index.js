const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const os = require('os');
const { MSG, SCENE, WS_PATH } = require('../public/shared/constants');

let nodeDataChannel = null;
try {
    nodeDataChannel = require('node-datachannel');
} catch (e) {
    console.warn('node-datachannel not available, WebRTC disabled:', e.message);
}

function startServer(options = {}) {
    const { ipcSendToGame, port: optPort } = options;
    const PORT = optPort || process.env.PORT || 3000;

    const app = express();
    const server = http.createServer(app);

    // Root redirect to /game/
    app.get('/', (req, res) => res.redirect('/game/'));

    // Serve static files from public directory
    app.use(express.static(path.join(__dirname, '..', 'public')));

    // API: return server's local network IP and port
    app.get('/api/server-info', (req, res) => {
        let ip = '127.0.0.1';
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            // Skip virtual adapters (VMware, VirtualBox, etc.)
            if (/vmware|virtualbox|vbox/i.test(name)) continue;
            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    ip = iface.address;
                    break;
                }
            }
            if (ip !== '127.0.0.1') break;
        }
        res.json({ ip, port: Number(PORT) });
    });

    // Two WebSocket servers (share the same HTTP server, distinguished by URL path)
    const controllerWss = new WebSocketServer({ noServer: true });
    const gameWss = new WebSocketServer({ noServer: true });

    // ----- Controller state storage -----
    const controllers = new Map(); // id -> { ws, state, pc, dc, useDataChannel }

    function getLowestAvailableId() {
        let id = 0;
        while (controllers.has(String(id))) id++;
        return String(id);
    }

    server.on('upgrade', (req, socket, head) => {
        const url = new URL(req.url, `http://${req.headers.host}`);

        if (url.pathname === WS_PATH.CONTROLLER) {
            controllerWss.handleUpgrade(req, socket, head, (ws) => {
                controllerWss.emit('connection', ws, req);
            });
        } else if (url.pathname === WS_PATH.GAME) {
            gameWss.handleUpgrade(req, socket, head, (ws) => {
                gameWss.emit('connection', ws, req);
            });
        } else {
            socket.destroy();
        }
    });

    // ----- WebRTC setup for a controller -----
    function setupWebRTC(id) {
        if (!nodeDataChannel) return;

        const entry = controllers.get(id);
        if (!entry) return;

        try {
            const pc = new nodeDataChannel.PeerConnection('controller-' + id, {
                iceServers: ['stun:stun.l.google.com:19302']
            });

            entry.pc = pc;

            pc.onStateChange((state) => {
                if (state === 'failed' || state === 'closed') {
                    entry.useDataChannel = false;
                    entry.dc = null;
                }
            });

            pc.onGatheringStateChange(() => {});

            pc.onLocalDescription((sdp, type) => {
                if (entry.ws.readyState === 1) {
                    entry.ws.send(JSON.stringify({ type: MSG.RTC_OFFER, sdp, sdpType: type }));
                }
            });

            pc.onLocalCandidate((candidate, mid) => {
                if (entry.ws.readyState === 1) {
                    entry.ws.send(JSON.stringify({ type: MSG.RTC_CANDIDATE, candidate, mid }));
                }
            });

            const dc = pc.createDataChannel('input', {
                unordered: true,
                maxRetransmits: 0
            });

            dc.onOpen(() => {
                entry.dc = dc;
                entry.useDataChannel = true;
                console.log(`Controller ${id}: WebRTC data channel open`);
            });

            dc.onClosed(() => {
                entry.useDataChannel = false;
                entry.dc = null;
                console.log(`Controller ${id}: WebRTC data channel closed`);
            });

            dc.onMessage((data) => {
                try {
                    const msg = JSON.parse(data);
                    if (entry) entry.state = msg;
                } catch (e) { /* ignore bad data */ }
            });
        } catch (e) {
            console.warn(`Controller ${id}: WebRTC setup failed:`, e.message);
        }
    }

    // ----- /ws/controller  -- individual remote controllers -----
    controllerWss.on('connection', (ws) => {
        const id = getLowestAvailableId();
        const defaultState = {
            axes: [0, 0, 0, 0],
            buttons: new Array(17).fill(false)
        };
        controllers.set(id, { ws, state: defaultState, pc: null, dc: null, useDataChannel: false });

        // Tell the controller its assigned id
        ws.send(JSON.stringify({ type: MSG.ID, id }));

        // Send current scene so the controller can adopt the right UI immediately
        if (currentScene) {
            ws.send(JSON.stringify({ type: MSG.SCENE, scene: currentScene }));
        }

        // Notify game frontend(s)
        broadcastToGame({ type: MSG.WS_CONNECTED, id });

        // Initiate WebRTC handshake
        setupWebRTC(id);

        ws.on('message', (raw) => {
            try {
                const msg = JSON.parse(raw);
                if (msg.type === MSG.RTC_ANSWER) {
                    const entry = controllers.get(id);
                    if (entry && entry.pc) {
                        entry.pc.setRemoteDescription(msg.sdp, msg.sdpType || 'answer');
                    }
                } else if (msg.type === MSG.RTC_CANDIDATE) {
                    const entry = controllers.get(id);
                    if (entry && entry.pc) {
                        entry.pc.addRemoteCandidate(msg.candidate, msg.mid);
                    }
                } else {
                    // Input state update (axes + buttons)
                    const entry = controllers.get(id);
                    if (entry) entry.state = msg;
                }
            } catch (e) { /* ignore bad data */ }
        });

        ws.on('close', () => {
            const entry = controllers.get(id);
            if (entry) {
                if (entry.dc) {
                    try { entry.dc.close(); } catch (e) {}
                }
                if (entry.pc) {
                    try { entry.pc.close(); } catch (e) {}
                }
            }
            controllers.delete(id);
            broadcastToGame({ type: MSG.WS_DISCONNECTED, id });
        });
    });

    // ----- /ws/game -- game frontend receives aggregated state -----
    let currentScene = null; // track latest scene so new controllers get it

    gameWss.on('connection', (ws) => {
        // Send current set of connected controllers so the game can catch up
        for (const [id] of controllers) {
            ws.send(JSON.stringify({ type: MSG.WS_CONNECTED, id }));
        }

        // Listen for messages from the game (e.g. scene changes)
        ws.on('message', (raw) => {
            try {
                const msg = JSON.parse(raw);
                handleGameMessage(msg);
            } catch (e) { /* ignore bad data */ }
        });
    });

    function handleGameMessage(msg) {
        if (msg.type === MSG.SCENE) {
            currentScene = msg.scene;
            broadcastToControllers(msg);
        }
        if (msg.type === MSG.BROADCAST_STATE) {
            broadcastToControllers(msg);
        }
        if (msg.type === MSG.PLAYER_MESSAGE) {
            // Send message to specific controller
            const entry = controllers.get(msg.targetId);
            if (entry && entry.ws && entry.ws.readyState === 1) {
                entry.ws.send(JSON.stringify({ type: MSG.PLAYER_MESSAGE, message: msg.message }));
            }
        }
    }

    function broadcastToGame(msg) {
        const data = JSON.stringify(msg);
        for (const client of gameWss.clients) {
            if (client.readyState === 1) client.send(data);
        }
        if (ipcSendToGame) ipcSendToGame(msg);
    }

    function broadcastToControllers(msg) {
        const data = JSON.stringify(msg);
        for (const client of controllerWss.clients) {
            if (client.readyState === 1) client.send(data);
        }
    }

    // Broadcast aggregated controller state at ~120 Hz
    setInterval(() => {
        if (gameWss.clients.size === 0 && !ipcSendToGame) return;
        if (controllers.size === 0) return;

        const obj = {};
        for (const [id, ctrl] of controllers) {
            obj[id] = ctrl.state;
        }
        broadcastToGame({ type: MSG.WS_STATE, controllers: obj });
    }, 1000 / 120);

    // ----- Start -----
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`Tank Arena server running on http://0.0.0.0:${PORT}`);
    });

    return { server, handleGameMessage };
}

if (require.main === module) {
    startServer();
}

module.exports = { startServer };
