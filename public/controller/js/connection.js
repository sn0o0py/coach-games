// ============================================================
// WebSocket Connection and State Management
// ============================================================

import { MSG, SCENE, WS_PATH, WS_PLAYER_COLORS } from '../../shared/constants.js';

// ---- State ----
export const state = {
    axes: [0, 0, 0, 0],   // lx, ly, rx, ry
    buttons: new Array(17).fill(false)
};

// Controller-specific enums
export const STATUS = {
    CONNECTED:     'connected',
    CONNECTED_RTC: 'connected-rtc',
    DISCONNECTED:  'disconnected',
};

export const MODE = {
    ARENA: 'arena',
    LOBBY: 'lobby',
    MENU:  'menu',
    MAZE:  'maze',
    SEQUENCE: 'sequence',
};

export let currentMode = MODE.ARENA;

// ---- WebSocket ----
let ws = null;
let playerId = null;

// ---- WebRTC ----
let rtcPc = null;
let rtcDc = null;
let rtcReady = false;
let rtcTimeoutId = null;
const RTC_TIMEOUT = 5000;

function updatePlayerColor() {
    if (playerId === null) return;
    const colorHex = WS_PLAYER_COLORS[parseInt(playerId) % 20];
    const r = (colorHex >> 16) & 0xFF;
    const g = (colorHex >> 8) & 0xFF;
    const b = colorHex & 0xFF;
    const colorStr = `rgb(${r}, ${g}, ${b})`;
    const playerColor = document.getElementById('player-color');
    playerColor.style.backgroundColor = colorStr;
    playerColor.style.display = 'inline-block';
}

function cleanupRtc() {
    if (rtcTimeoutId) {
        clearTimeout(rtcTimeoutId);
        rtcTimeoutId = null;
    }
    if (rtcDc) {
        try { rtcDc.close(); } catch (e) {}
        rtcDc = null;
    }
    if (rtcPc) {
        try { rtcPc.close(); } catch (e) {}
        rtcPc = null;
    }
    if (rtcReady) {
        rtcReady = false;
        updateStatus(STATUS.CONNECTED);
    }
}

async function handleRtcOffer(sdp, sdpType) {
    cleanupRtc();

    try {
        rtcPc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        rtcPc.onicecandidate = (e) => {
            if (e.candidate && ws && ws.readyState === 1) {
                ws.send(JSON.stringify({
                    type: MSG.RTC_CANDIDATE,
                    candidate: e.candidate.candidate,
                    mid: e.candidate.sdpMid
                }));
            }
        };

        rtcPc.ondatachannel = (e) => {
            rtcDc = e.channel;
            rtcDc.onopen = () => {
                rtcReady = true;
                updateStatus(STATUS.CONNECTED_RTC);
            };
            rtcDc.onclose = () => {
                rtcReady = false;
                rtcDc = null;
                updateStatus(STATUS.CONNECTED);
            };
            rtcDc.onerror = () => {
                rtcReady = false;
                rtcDc = null;
                updateStatus(STATUS.CONNECTED);
            };
        };

        rtcPc.onconnectionstatechange = () => {
            const s = rtcPc && rtcPc.connectionState;
            if (s === 'failed' || s === 'closed' || s === 'disconnected') {
                cleanupRtc();
            }
        };

        await rtcPc.setRemoteDescription({ type: sdpType || 'offer', sdp });
        const answer = await rtcPc.createAnswer();
        await rtcPc.setLocalDescription(answer);

        if (ws && ws.readyState === 1) {
            ws.send(JSON.stringify({
                type: MSG.RTC_ANSWER,
                sdp: answer.sdp,
                sdpType: answer.type
            }));
        }

        rtcTimeoutId = setTimeout(() => {
            if (!rtcReady) {
                console.warn('WebRTC timeout, falling back to WebSocket');
                cleanupRtc();
            }
        }, RTC_TIMEOUT);
    } catch (e) {
        console.warn('WebRTC offer handling failed:', e.message);
        cleanupRtc();
    }
}

function connectWS() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}${WS_PATH.CONTROLLER}`);

    ws.onopen = () => updateStatus(STATUS.CONNECTED);

    ws.onmessage = (e) => {
        try {
            const msg = JSON.parse(e.data);
            console.log(msg);
            if (msg.type === MSG.ID) {
                playerId = msg.id;
                updateStatus(STATUS.CONNECTED);
                updatePlayerColor();
            } else if (msg.type === MSG.SCENE) {
                onSceneChange(msg.scene);
            } else if (msg.type === MSG.BROADCAST_STATE) {
                onBroadcastState(msg.state);
            } else if (msg.type === MSG.PLAYER_MESSAGE) {
                onPlayerMessage(msg.message);
            } else if (msg.type === MSG.RTC_OFFER) {
                handleRtcOffer(msg.sdp, msg.sdpType);
            } else if (msg.type === MSG.RTC_CANDIDATE) {
                if (rtcPc) {
                    rtcPc.addIceCandidate({ candidate: msg.candidate, sdpMid: msg.mid })
                        .catch(() => {});
                }
            }
        } catch (err) {}
    };

    ws.onclose = () => {
        cleanupRtc();
        updateStatus(STATUS.DISCONNECTED);
        playerId = null;
        const indicator = document.getElementById('player-color');
        indicator.style.display = 'none';
        setTimeout(connectWS, 2000);
    };

    ws.onerror = () => {};
}

function onSceneChange(sceneName) {
    const label = document.getElementById('scene-label');
    const menuBtn = document.getElementById('menu-btn');

    if (sceneName === 'paused') {
        setMode(MODE.MENU);
        label.textContent = 'Paused';
        menuBtn.classList.remove('hidden');
    } else if (sceneName === SCENE.ARENA) {
        setMode(MODE.ARENA);
        label.textContent = 'In Game';
        menuBtn.classList.remove('hidden');
    } else if (sceneName === SCENE.GAME_SELECTION) {
        setMode(MODE.MENU);
        label.textContent = 'Game Selection';
        menuBtn.classList.add('hidden');
    } else if (sceneName === SCENE.TANK_MENU) {
        setMode(MODE.MENU);
        label.textContent = 'Tank Menu';
        menuBtn.classList.add('hidden');
    } else if (sceneName === SCENE.MENU) {
        setMode(MODE.MENU);
        label.textContent = 'Main Menu';
        menuBtn.classList.add('hidden');
    } else if (sceneName === SCENE.WINNER) {
        setMode(MODE.MENU);
        label.textContent = 'Results';
        menuBtn.classList.add('hidden');
    } else if (sceneName === SCENE.SETTINGS) {
        setMode(MODE.MENU);
        label.textContent = 'Settings';
        menuBtn.classList.add('hidden');
    } else if (sceneName === SCENE.TEAM_LOBBY) {
        setMode(MODE.LOBBY);
        label.textContent = 'Team Selection';
        menuBtn.classList.add('hidden');
    } else if (sceneName === SCENE.MAZE_MENU) {
        setMode(MODE.MENU);
        label.textContent = 'Maze Menu';
        menuBtn.classList.add('hidden');
    } else if (sceneName === SCENE.MAZE) {
        setMode(MODE.MAZE);
        label.textContent = 'Maze Race';
        menuBtn.classList.remove('hidden');
    } else if (sceneName === SCENE.MAZE_WINNER) {
        setMode(MODE.MENU);
        label.textContent = 'Maze Results';
        menuBtn.classList.add('hidden');
    } else if (sceneName === SCENE.MAZE_SETTINGS) {
        setMode(MODE.MENU);
        label.textContent = 'Maze Settings';
        menuBtn.classList.add('hidden');
    } else if (sceneName === SCENE.SEQUENCE_MENU) {
        setMode(MODE.MENU);
        label.textContent = 'Sequence Menu';
        menuBtn.classList.add('hidden');
    } else if (sceneName === SCENE.SEQUENCE) {
        setMode(MODE.SEQUENCE);
        label.textContent = 'Sequence Challenge';
        menuBtn.classList.remove('hidden');
        // Check if we're in memorization phase (game will send this via custom message)
        // For now, we'll handle it via a data attribute or separate message
    } else if (sceneName === SCENE.SEQUENCE_WINNER) {
        setMode(MODE.MENU);
        label.textContent = 'Sequence Results';
        menuBtn.classList.add('hidden');
        // Clear eliminated message when moving to winner scene
        const eliminatedMsg = document.getElementById('eliminated-message');
        if (eliminatedMsg) eliminatedMsg.classList.add('hidden');
    } else if (sceneName === SCENE.SEQUENCE_SETTINGS) {
        setMode(MODE.MENU);
        label.textContent = 'Sequence Settings';
        menuBtn.classList.add('hidden');
    } else {
        setMode(MODE.ARENA);
        label.textContent = '';
        menuBtn.classList.remove('hidden');
    }
}

function onBroadcastState(state) {
    if (currentMode !== MODE.SEQUENCE) return;
    
    const memorizationMsg = document.getElementById('memorization-message');
    const eliminatedMsg = document.getElementById('eliminated-message');
    const buttons = document.querySelectorAll('#mode-sequence .color-btn');
    
    // Don't modify eliminated message here - it persists until game ends
    // Only check if player is already eliminated
    const isEliminated = eliminatedMsg && !eliminatedMsg.classList.contains('hidden');
    
    if (state === 'memorizing') {
        // Show memorization message and disable buttons
        if (memorizationMsg) memorizationMsg.classList.remove('hidden');
        // Don't hide eliminated message - it persists
        buttons.forEach(btn => {
            btn.disabled = true;
            btn.classList.add('disabled');
        });
    } else if (state === 'input') {
        // Hide memorization message
        if (memorizationMsg) memorizationMsg.classList.add('hidden');
        // Keep buttons disabled if eliminated, otherwise enable
        buttons.forEach(btn => {
            if (isEliminated) {
                btn.disabled = true;
                btn.classList.add('disabled');
            } else {
                btn.disabled = false;
                btn.classList.remove('disabled');
            }
        });
    } else {
        // Other states (countdown, etc.)
        if (memorizationMsg) memorizationMsg.classList.add('hidden');
        // Keep buttons disabled if eliminated, otherwise enable
        buttons.forEach(btn => {
            if (isEliminated) {
                btn.disabled = true;
                btn.classList.add('disabled');
            } else {
                btn.disabled = false;
                btn.classList.remove('disabled');
            }
        });
    }
}

function onPlayerMessage(message) {
    if (currentMode !== MODE.SEQUENCE) return;
    
    const eliminatedMsg = document.getElementById('eliminated-message');
    const buttons = document.querySelectorAll('#mode-sequence .color-btn');
    
    if (message === 'eliminated') {
        // Show eliminated message and disable buttons
        if (eliminatedMsg) eliminatedMsg.classList.remove('hidden');
        buttons.forEach(btn => {
            btn.disabled = true;
            btn.classList.add('disabled');
        });
    } else if (message === 'active') {
        // Hide eliminated message and enable buttons
        if (eliminatedMsg) eliminatedMsg.classList.add('hidden');
        buttons.forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('disabled');
        });
    }
}

export function setMode(mode) {
    if (currentMode === mode) return;
    currentMode = mode;

    // Reset all state axes and buttons when switching modes
    state.axes = [0, 0, 0, 0];
    for (let i = 0; i < state.buttons.length; i++) state.buttons[i] = false;

    // Reset READY button visual state
    const readyBtn = document.getElementById('ready-btn');
    if (readyBtn) {
        readyBtn.classList.remove('active', 'pressed');
        readyBtn.textContent = 'READY';
    }

    // Show/hide mode panels
    document.getElementById('mode-arena').classList.toggle('hidden', mode !== MODE.ARENA);
    document.getElementById('mode-lobby').classList.toggle('hidden', mode !== MODE.LOBBY);
    document.getElementById('mode-menu').classList.toggle('hidden', mode !== MODE.MENU);
    document.getElementById('mode-maze').classList.toggle('hidden', mode !== MODE.MAZE);
    document.getElementById('mode-sequence').classList.toggle('hidden', mode !== MODE.SEQUENCE);

    // Reset sequence state when switching away
    if (mode !== MODE.SEQUENCE) {
        // Clear eliminated message when leaving sequence mode
        const eliminatedMsg = document.getElementById('eliminated-message');
        if (eliminatedMsg) eliminatedMsg.classList.add('hidden');
        onBroadcastState('input'); // Reset to input state
    }

    // menu-btn visibility is handled per-case in onSceneChange
}

export function updateStatus(s) {
    const el = document.getElementById('status');
    const dot = el.querySelector('.dot');
    dot.className = 'dot';
    if (s === STATUS.CONNECTED_RTC) {
        dot.classList.add('connected');
        el.innerHTML = '';
        el.appendChild(dot);
        el.append(` Connected` + (playerId !== null ? ` (RTC${playerId})` : ''));
    } else if (s === STATUS.CONNECTED) {
        dot.classList.add('connected');
        el.innerHTML = '';
        el.appendChild(dot);
        el.append(` Connected` + (playerId !== null ? ` (WS${playerId})` : ''));
    } else if (s === STATUS.DISCONNECTED) {
        dot.classList.remove('connected', 'connecting');
        el.innerHTML = '';
        el.appendChild(dot);
        el.append(' Reconnecting...');
    } else {
        dot.classList.add('connecting');
    }
}

// Send state at ~60fps
function sendLoop() {
    if (rtcReady && rtcDc && rtcDc.readyState === 'open') {
        rtcDc.send(JSON.stringify(state));
    } else if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify(state));
    }
    requestAnimationFrame(sendLoop);
}

export function initConnection() {
    connectWS();
    requestAnimationFrame(sendLoop);
}
