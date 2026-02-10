// ============================================================
// WebSocket Connection and State Management
// ============================================================

// ---- State ----
const state = {
    axes: [0, 0, 0, 0],   // lx, ly, rx, ry
    buttons: new Array(17).fill(false)
};

let currentMode = 'arena'; // 'arena' | 'lobby' | 'menu'

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
    const indicator = document.getElementById('player-color');
    indicator.style.backgroundColor = colorStr;
    indicator.style.display = 'inline-block';
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
        updateStatus('connected');
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
                    type: 'rtc-candidate',
                    candidate: e.candidate.candidate,
                    mid: e.candidate.sdpMid
                }));
            }
        };

        rtcPc.ondatachannel = (e) => {
            rtcDc = e.channel;
            rtcDc.onopen = () => {
                rtcReady = true;
                updateStatus('connected-rtc');
            };
            rtcDc.onclose = () => {
                rtcReady = false;
                rtcDc = null;
                updateStatus('connected');
            };
            rtcDc.onerror = () => {
                rtcReady = false;
                rtcDc = null;
                updateStatus('connected');
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
                type: 'rtc-answer',
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
    ws = new WebSocket(`${protocol}//${location.host}/ws/controller`);

    ws.onopen = () => updateStatus('connected');

    ws.onmessage = (e) => {
        try {
            const msg = JSON.parse(e.data);
            if (msg.type === 'id') {
                playerId = msg.id;
                updateStatus('connected');
                updatePlayerColor();
            } else if (msg.type === 'scene') {
                onSceneChange(msg.scene);
            } else if (msg.type === 'rtc-offer') {
                handleRtcOffer(msg.sdp, msg.sdpType);
            } else if (msg.type === 'rtc-candidate') {
                if (rtcPc) {
                    rtcPc.addIceCandidate({ candidate: msg.candidate, sdpMid: msg.mid })
                        .catch(() => {});
                }
            }
        } catch (err) {}
    };

    ws.onclose = () => {
        cleanupRtc();
        updateStatus('disconnected');
        playerId = null;
        const indicator = document.getElementById('player-color');
        indicator.style.display = 'none';
        setTimeout(connectWS, 2000);
    };

    ws.onerror = () => {};
}

function onSceneChange(sceneName) {
    const label = document.getElementById('scene-label');
    if (sceneName === 'TeamLobbyScene') {
        setMode('lobby');
        label.textContent = 'Team Selection';
    } else if (sceneName === 'ArenaScene') {
        setMode('arena');
        label.textContent = 'In Game';
    } else if (sceneName === 'MenuScene') {
        setMode('menu');
        label.textContent = 'Main Menu';
    } else if (sceneName === 'WinnerScene') {
        setMode('menu');
        label.textContent = 'Results';
    } else if (sceneName === 'SettingsScene') {
        setMode('menu');
        label.textContent = 'Settings';
    } else {
        setMode('arena');
        label.textContent = '';
    }
}

function setMode(mode) {
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
    document.getElementById('mode-arena').classList.toggle('hidden', mode !== 'arena');
    document.getElementById('mode-lobby').classList.toggle('hidden', mode !== 'lobby');
    document.getElementById('mode-menu').classList.toggle('hidden', mode !== 'menu');
}

function updateStatus(s) {
    const el = document.getElementById('status');
    const dot = el.querySelector('.dot');
    dot.className = 'dot';
    if (s === 'connected-rtc') {
        dot.classList.add('connected');
        el.innerHTML = '';
        el.appendChild(dot);
        el.append(` Connected` + (playerId !== null ? ` (RTC${playerId})` : ''));
    } else if (s === 'connected') {
        dot.classList.add('connected');
        el.innerHTML = '';
        el.appendChild(dot);
        el.append(` Connected` + (playerId !== null ? ` (WS${playerId})` : ''));
    } else if (s === 'disconnected') {
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

connectWS();
requestAnimationFrame(sendLoop);
