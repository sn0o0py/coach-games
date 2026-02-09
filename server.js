const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Serve static files from project root
app.use(express.static(path.join(__dirname)));

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
let nextControllerId = 0;
const controllers = new Map(); // id -> { ws, state }

server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/ws/controller') {
        controllerWss.handleUpgrade(req, socket, head, (ws) => {
            controllerWss.emit('connection', ws, req);
        });
    } else if (url.pathname === '/ws/game') {
        gameWss.handleUpgrade(req, socket, head, (ws) => {
            gameWss.emit('connection', ws, req);
        });
    } else {
        socket.destroy();
    }
});

// ----- /ws/controller  – individual remote controllers -----
controllerWss.on('connection', (ws) => {
    const id = String(nextControllerId++);
    const defaultState = {
        axes: [0, 0, 0, 0],
        buttons: new Array(17).fill(false)
    };
    controllers.set(id, { ws, state: defaultState });

    // Tell the controller its assigned id
    ws.send(JSON.stringify({ type: 'id', id }));

    // Send current scene so the controller can adopt the right UI immediately
    if (currentScene) {
        ws.send(JSON.stringify({ type: 'scene', scene: currentScene }));
    }

    // Notify game frontend(s)
    broadcastToGame({ type: 'ws_connected', id });

    ws.on('message', (raw) => {
        try {
            const msg = JSON.parse(raw);
            // Expect { axes: [4 floats], buttons: [17 bools] }
            const entry = controllers.get(id);
            if (entry) entry.state = msg;
        } catch (e) { /* ignore bad data */ }
    });

    ws.on('close', () => {
        controllers.delete(id);
        broadcastToGame({ type: 'ws_disconnected', id });
    });
});

// ----- /ws/game – game frontend receives aggregated state -----
let currentScene = null; // track latest scene so new controllers get it

gameWss.on('connection', (ws) => {
    // Send current set of connected controllers so the game can catch up
    for (const [id] of controllers) {
        ws.send(JSON.stringify({ type: 'ws_connected', id }));
    }

    // Listen for messages from the game (e.g. scene changes)
    ws.on('message', (raw) => {
        try {
            const msg = JSON.parse(raw);
            if (msg.type === 'scene') {
                currentScene = msg.scene;
                broadcastToControllers(msg);
            }
        } catch (e) { /* ignore bad data */ }
    });
});

function broadcastToGame(msg) {
    const data = JSON.stringify(msg);
    for (const client of gameWss.clients) {
        if (client.readyState === 1) client.send(data);
    }
}

function broadcastToControllers(msg) {
    const data = JSON.stringify(msg);
    for (const client of controllerWss.clients) {
        if (client.readyState === 1) client.send(data);
    }
}

// Broadcast aggregated controller state at ~60 Hz
setInterval(() => {
    if (gameWss.clients.size === 0 || controllers.size === 0) return;

    const obj = {};
    for (const [id, ctrl] of controllers) {
        obj[id] = ctrl.state;
    }
    broadcastToGame({ type: 'ws_state', controllers: obj });
}, 16);

// ----- Start -----
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Tank Arena server running on http://0.0.0.0:${PORT}`);
});

