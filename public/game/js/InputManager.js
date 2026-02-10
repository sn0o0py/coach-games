// ============================================================
// InputManager (unified physical + WebSocket controllers)
// Gamepad players occupy slots 0-3.
// WebSocket players occupy slots 100+ (100 + server-assigned wsId).
// ============================================================

class InputManager {
    constructor() {
        this._phaserGamepad = null;
        this.wsPads = {};       // wsId (string) -> VirtualPad
        this._connectCbs = [];
        this._disconnectCbs = [];
        this.ws = null;
        this._lastScene = null; // remember last scene for re-send on (re)connect
        this._connectWebSocket();
    }

    _connectWebSocket() {
        try {
            const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
            this.ws = new WebSocket(`${protocol}//${location.host}/ws/game`);
            this.ws.onopen = () => {
                // Re-send the current scene so controllers catch up after (re)connect
                if (this._lastScene) {
                    this.ws.send(JSON.stringify({ type: 'scene', scene: this._lastScene }));
                }
            };
            this.ws.onmessage = (e) => this._onMessage(JSON.parse(e.data));
            this.ws.onclose = () => {
                this.ws = null;
                setTimeout(() => this._connectWebSocket(), 3000);
            };
            this.ws.onerror = () => {}; // suppress – will reconnect on close
        } catch (e) {
            // No server, physical gamepads only
        }
    }

    _onMessage(msg) {
        if (msg.type === 'ws_state') {
            for (const [id, state] of Object.entries(msg.controllers)) {
                // Auto-create pad if we see it in a state broadcast but haven't assigned yet
                if (!this.wsPads[id]) this._assignWsController(id);
                const vpad = this.wsPads[id];
                if (vpad) vpad.updateState(state.axes, state.buttons);
            }
        } else if (msg.type === 'ws_connected') {
            this._assignWsController(msg.id);
        } else if (msg.type === 'ws_disconnected') {
            this._removeWsController(msg.id);
        }
    }

    _assignWsController(wsId) {
        if (this.wsPads[wsId]) return; // already assigned
        const slot = 100 + parseInt(wsId);
        const vpad = new VirtualPad(slot);
        this.wsPads[wsId] = vpad;
        for (const cb of this._connectCbs) cb(vpad);
    }

    _removeWsController(wsId) {
        const vpad = this.wsPads[wsId];
        if (!vpad) return;
        vpad.connected = false;
        for (const cb of this._disconnectCbs) cb(vpad);
        delete this.wsPads[wsId];
    }

    setPhaserGamepad(plugin) {
        this._phaserGamepad = plugin;
    }

    /** Returns a pad-like object for the given slot, or null.
     *  Slots 0-3: physical gamepads.  Slots 100+: WebSocket pads. */
    getPad(index) {
        if (index < 100) {
            // Physical gamepad
            if (this._phaserGamepad) {
                const p = this._phaserGamepad.getPad(index);
                if (p && p.connected) return p;
            }
            return null;
        }
        // WebSocket pad – find by slot index
        for (const wsId in this.wsPads) {
            const vpad = this.wsPads[wsId];
            if (vpad.index === index && vpad.connected) return vpad;
        }
        return null;
    }

    /** Return array of all currently connected WS pad slot indices (100+). */
    getAllWsPadIndices() {
        const indices = [];
        for (const wsId in this.wsPads) {
            const vpad = this.wsPads[wsId];
            if (vpad.connected) indices.push(vpad.index);
        }
        return indices;
    }

    /** Return the first connected pad (physical 0-3, then WS 100+), or null. */
    getAnyPad() {
        for (let i = 0; i < 4; i++) {
            const p = this.getPad(i);
            if (p) return p;
        }
        for (const wsId in this.wsPads) {
            const vpad = this.wsPads[wsId];
            if (vpad.connected) return vpad;
        }
        return null;
    }

    /** Return array of all currently connected pad objects (physical 0-3 + WS 100+). */
    getAllConnectedPads() {
        const pads = [];
        for (let i = 0; i < 4; i++) {
            const p = this.getPad(i);
            if (p) pads.push(p);
        }
        for (const wsId in this.wsPads) {
            const vpad = this.wsPads[wsId];
            if (vpad.connected) pads.push(vpad);
        }
        return pads;
    }

    /** Send the current scene name to the server so controllers can adapt their UI. */
    broadcastScene(sceneName) {
        this._lastScene = sceneName;
        if (this.ws && this.ws.readyState === 1) {
            this.ws.send(JSON.stringify({ type: 'scene', scene: sceneName }));
        }
    }

    onConnect(cb) { this._connectCbs.push(cb); }
    offConnect(cb) { this._connectCbs = this._connectCbs.filter(c => c !== cb); }
    onDisconnect(cb) { this._disconnectCbs.push(cb); }
    offDisconnect(cb) { this._disconnectCbs = this._disconnectCbs.filter(c => c !== cb); }
}

const inputManager = new InputManager();
