// ============================================================
// Tank Arena – 2D Top-Down Multiplayer Tank Game (Phaser 3)
// Up to 4 players with gamepad / WebSocket controls
// Modes: Free For All, Team Deathmatch, Zone Capture
// ============================================================

// ----- Settings (mutable – editable via SettingsScene) -----
let TANK_SPEED = 220;
let BULLET_SPEED = 500;
let RELOAD_TIME = 50;             // ms
let RESPAWN_DELAY = 3000;         // ms
let INVINCIBILITY_TIME = 2000;    // ms
const DEADZONE = 0;
let WALL_COUNT = 13;
let WALL_MIN = 60;
let WALL_MAX = 180;
let FFA_KILL_TARGET = 10;
let TDM_KILL_TARGET = 15;
let ZONE_CAPTURE_TIME = 10000;    // ms to capture a zone
let ZONE_RESPAWN_DELAY = 3000;    // ms before next zone spawns
let ZONE_CAPTURE_TARGET = 10;     // captures needed to win
let ZONE_SIZE = 120;              // zone diameter in pixels

// ----- Settings persistence (localStorage) -----
function saveSettings() {
    const data = {
        TANK_SPEED, BULLET_SPEED, RELOAD_TIME, RESPAWN_DELAY,
        INVINCIBILITY_TIME, WALL_COUNT, WALL_MIN, WALL_MAX,
        FFA_KILL_TARGET, TDM_KILL_TARGET,
        ZONE_CAPTURE_TIME, ZONE_RESPAWN_DELAY, ZONE_CAPTURE_TARGET, ZONE_SIZE
    };
    localStorage.setItem('tankArenaSettings', JSON.stringify(data));
}

function loadSettings() {
    try {
        const raw = localStorage.getItem('tankArenaSettings');
        if (!raw) return;
        const d = JSON.parse(raw);
        if (d.TANK_SPEED !== undefined) TANK_SPEED = d.TANK_SPEED;
        if (d.BULLET_SPEED !== undefined) BULLET_SPEED = d.BULLET_SPEED;
        if (d.RELOAD_TIME !== undefined) RELOAD_TIME = d.RELOAD_TIME;
        if (d.RESPAWN_DELAY !== undefined) RESPAWN_DELAY = d.RESPAWN_DELAY;
        if (d.INVINCIBILITY_TIME !== undefined) INVINCIBILITY_TIME = d.INVINCIBILITY_TIME;
        if (d.WALL_COUNT !== undefined) WALL_COUNT = d.WALL_COUNT;
        if (d.WALL_MIN !== undefined) WALL_MIN = d.WALL_MIN;
        if (d.WALL_MAX !== undefined) WALL_MAX = d.WALL_MAX;
        if (d.FFA_KILL_TARGET !== undefined) FFA_KILL_TARGET = d.FFA_KILL_TARGET;
        if (d.TDM_KILL_TARGET !== undefined) TDM_KILL_TARGET = d.TDM_KILL_TARGET;
        if (d.ZONE_CAPTURE_TIME !== undefined) ZONE_CAPTURE_TIME = d.ZONE_CAPTURE_TIME;
        if (d.ZONE_RESPAWN_DELAY !== undefined) ZONE_RESPAWN_DELAY = d.ZONE_RESPAWN_DELAY;
        if (d.ZONE_CAPTURE_TARGET !== undefined) ZONE_CAPTURE_TARGET = d.ZONE_CAPTURE_TARGET;
        if (d.ZONE_SIZE !== undefined) ZONE_SIZE = d.ZONE_SIZE;
    } catch (e) { /* ignore corrupt data */ }
}
loadSettings();

const TEAM_COLORS = { A: 0xff8833, B: 0x8833ff }; // Orange, Purple

const PLAYER_COLORS = [
    0x3399ff, // Player 1 – blue
    0xff3333, // Player 2 – red
    0x33cc66, // Player 3 – green
    0xffcc00  // Player 4 – yellow
];

const PLAYER_NAMES = ['P1', 'P2', 'P3', 'P4'];

// 20 distinct colours for WebSocket players (indices 100-119)
const WS_PLAYER_COLORS = [
    0x00cccc, // teal
    0xff00ff, // magenta
    0x00ff88, // spring green
    0xff6688, // coral pink
    0x88aaff, // periwinkle
    0xffaa00, // amber
    0xaa44ff, // violet
    0x44ff44, // bright green
    0xff4488, // hot pink
    0x00aaff, // sky blue
    0xffdd44, // gold
    0x44ffcc, // aquamarine
    0xff8844, // tangerine
    0xaa88ff, // lavender
    0x88ff44, // chartreuse
    0xcc4444, // scarlet
    0x44aaff, // cornflower
    0xcc44ff, // orchid
    0xff88cc, // pink
    0x44ffaa  // mint
];

function getPlayerColor(index) {
    if (index < 100) return PLAYER_COLORS[index] || 0xffffff;
    return WS_PLAYER_COLORS[(index - 100) % WS_PLAYER_COLORS.length];
}

function getPlayerName(index) {
    if (index < 100) return PLAYER_NAMES[index] || ('P' + index);
    return 'WS' + (index - 100);
}

// ----- Helpers -----
function darken(color, factor) {
    const r = ((color >> 16) & 0xff) * factor;
    const g = ((color >> 8) & 0xff) * factor;
    const b = (color & 0xff) * factor;
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
}

function hexStr(color) {
    return '#' + color.toString(16).padStart(6, '0');
}

// ----- Virtual Gamepad (mimics Phaser Gamepad interface) -----
class VirtualPad {
    constructor(slotIndex) {
        this.index = slotIndex;
        this.connected = true;
        this._axes = [0, 0, 0, 0];
        this.axes = [
            { getValue: () => this._axes[0] },
            { getValue: () => this._axes[1] },
            { getValue: () => this._axes[2] },
            { getValue: () => this._axes[3] }
        ];
        this.buttons = [];
        for (let i = 0; i < 17; i++) {
            this.buttons.push({ pressed: false, value: 0 });
        }
    }

    updateState(axes, buttons) {
        if (axes) {
            for (let i = 0; i < 4; i++) this._axes[i] = axes[i] || 0;
        }
        if (buttons) {
            for (let i = 0; i < 17; i++) {
                const pressed = buttons[i] ? true : false;
                this.buttons[i].pressed = pressed;
                this.buttons[i].value = pressed ? 1 : 0;
            }
        }
    }
}

// ----- InputManager (unified physical + WebSocket controllers) -----
// Gamepad players occupy slots 0-3.
// WebSocket players occupy slots 100+ (100 + server-assigned wsId).
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

// Helper: generate body / turret / bullet textures for a single player index
function _genPlayerTextures(g, playerIndex) {
    const color = getPlayerColor(playerIndex);

    // Body
    g.clear();
    g.fillStyle(color, 1);
    g.fillRoundedRect(0, 0, 48, 36, 6);
    g.fillStyle(darken(color, 0.5), 1);
    g.fillRect(2, 0, 44, 5);
    g.fillRect(2, 31, 44, 5);
    g.generateTexture('tank_body_' + playerIndex, 48, 36);

    // Turret
    g.clear();
    g.fillStyle(darken(color, 0.7), 1);
    g.fillRoundedRect(0, 0, 30, 8, 2);
    g.fillStyle(0x333333, 1);
    g.fillRect(26, 1, 4, 6);
    g.generateTexture('tank_turret_' + playerIndex, 30, 8);

    // Bullet
    g.clear();
    g.fillStyle(color, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('bullet_' + playerIndex, 8, 8);

    // Team-coloured body variants (team center, player-coloured wheels)
    for (const team of ['A', 'B']) {
        const tc = TEAM_COLORS[team];
        g.clear();
        g.fillStyle(tc, 1);
        g.fillRoundedRect(0, 0, 48, 36, 6);
        g.fillStyle(color, 1);
        g.fillRect(2, 0, 44, 5);
        g.fillRect(2, 31, 44, 5);
        g.generateTexture('tank_body_team_' + team + '_' + playerIndex, 48, 36);
    }
}

// Generate all textures once (shared across scenes via texture manager)
function generateAllTextures(scene) {
    if (scene.textures.exists('tank_body_0')) return;

    const g = scene.make.graphics({ add: false });

    // Gamepad players 0-3
    for (let i = 0; i < 4; i++) {
        _genPlayerTextures(g, i);
    }

    // WebSocket players 100-119
    for (let i = 0; i < 20; i++) {
        _genPlayerTextures(g, 100 + i);
    }

    // Wall tile
    g.clear();
    g.fillStyle(0x666666, 1);
    g.fillRect(0, 0, 16, 16);
    g.lineStyle(1, 0x555555, 1);
    g.strokeRect(0, 0, 16, 16);
    g.generateTexture('wall_tile', 16, 16);

    // Team turrets and bullets (shared per team, not per player)
    for (const team of ['A', 'B']) {
        const color = TEAM_COLORS[team];

        g.clear();
        g.fillStyle(darken(color, 0.7), 1);
        g.fillRoundedRect(0, 0, 30, 8, 2);
        g.fillStyle(0x333333, 1);
        g.fillRect(26, 1, 4, 6);
        g.generateTexture('tank_turret_team_' + team, 30, 8);

        g.clear();
        g.fillStyle(color, 1);
        g.fillCircle(4, 4, 4);
        g.generateTexture('bullet_team_' + team, 8, 8);
    }

    // Explosion particle
    g.clear();
    g.fillStyle(0xff8800, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('particle_orange', 8, 8);

    g.destroy();
}


// ============================================================
// MenuScene – Mode Selection
// ============================================================
class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    preload() {
        generateAllTextures(this);
    }

    create() {
        inputManager.setPhaserGamepad(this.input.gamepad);
        inputManager.broadcastScene('MenuScene');

        const w = this.scale.width;
        const h = this.scale.height;

        // Title
        this.add.text(w / 2, h * 0.18, 'TANK ARENA', {
            fontFamily: 'Arial', fontSize: '72px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 8, fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(w / 2, h * 0.30, 'Select Game Mode', {
            fontFamily: 'Arial', fontSize: '24px', color: '#aaaaaa',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);

        // Mode options
        this.modes = [
            { label: 'Free For All', desc: 'First to ' + FFA_KILL_TARGET + ' kills wins' },
            { label: 'Team Deathmatch', desc: 'First team to ' + TDM_KILL_TARGET + ' kills wins' },
            { label: 'Zone Capture', desc: 'First team to ' + ZONE_CAPTURE_TARGET + ' captures wins' },
            { label: 'Settings', desc: 'Adjust game variables' }
        ];
        this.selectedIndex = 0;
        this.modeTexts = [];
        this.descTexts = [];

        for (let i = 0; i < this.modes.length; i++) {
            const y = h * 0.48 + i * 100;
            const txt = this.add.text(w / 2, y, this.modes[i].label, {
                fontFamily: 'Arial', fontSize: '36px', color: '#aaaaaa',
                stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5);
            this.modeTexts.push(txt);

            const desc = this.add.text(w / 2, y + 36, this.modes[i].desc, {
                fontFamily: 'Arial', fontSize: '18px', color: '#777777',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5);
            this.descTexts.push(desc);
        }

        // Selector arrow
        this.arrow = this.add.text(0, 0, '\u25B6', {
            fontFamily: 'Arial', fontSize: '30px', color: '#ffcc00',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);

        // Connect message
        this.connectMsg = this.add.text(w / 2, h * 0.85, 'Connect a controller to start', {
            fontFamily: 'Arial', fontSize: '22px', color: '#666666'
        }).setOrigin(0.5);

        // Decorative tank sprites at bottom
        for (let i = 0; i < 4; i++) {
            this.add.sprite(w * 0.2 + i * w * 0.2, h * 0.93, 'tank_body_' + i)
                .setAlpha(0.25).setScale(1.2);
        }

        this.updateSelection();

        // Per-pad debounce state (padIndex -> { prevUp, prevDown, prevA })
        this._padState = new Map();

        // QR code for controller URL
        this._loadControllerQR();
    }

    _getPadDebounce(padIndex) {
        if (!this._padState.has(padIndex)) {
            // Initialize as true to prevent carry-over
            this._padState.set(padIndex, { prevUp: true, prevDown: true, prevA: true });
        }
        return this._padState.get(padIndex);
    }

    _loadControllerQR() {
        const w = this.scale.width;
        const h = this.scale.height;

        fetch('/api/server-info')
            .then(r => r.json())
            .then(info => {
                // Scene may have changed while we were fetching
                if (!this.scene.isActive()) return;

                const url = `http://${info.ip}:${info.port}/controller.html`;

                // Generate QR using qrcode-generator
                const qr = qrcode(0, 'M');
                qr.addData(url);
                qr.make();

                // Render QR onto an offscreen canvas
                const cellSize = 4;
                const margin = 8;
                const moduleCount = qr.getModuleCount();
                const size = moduleCount * cellSize + margin * 2;
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, size, size);
                ctx.fillStyle = '#000000';
                for (let row = 0; row < moduleCount; row++) {
                    for (let col = 0; col < moduleCount; col++) {
                        if (qr.isDark(row, col)) {
                            ctx.fillRect(margin + col * cellSize, margin + row * cellSize, cellSize, cellSize);
                        }
                    }
                }

                // Remove old texture if it exists (menu can be revisited)
                if (this.textures.exists('qr_controller')) {
                    this.textures.remove('qr_controller');
                }
                this.textures.addCanvas('qr_controller', canvas);

                // Position: bottom-right corner
                const qrX = w - 100;
                const qrY = h * 0.78;
                const qrSprite = this.add.sprite(qrX, qrY, 'qr_controller')
                    .setOrigin(0.5)
                    .setScale(1);

                // Scale to ~140px display size
                const desiredSize = 140;
                qrSprite.setScale(desiredSize / size);

                // Label above QR
                this.add.text(qrX, qrY - desiredSize / 2 - 16, 'Scan to join', {
                    fontFamily: 'Arial', fontSize: '16px', color: '#aaaaaa',
                    stroke: '#000000', strokeThickness: 3
                }).setOrigin(0.5);

                // URL text below QR
                this.add.text(qrX, qrY + desiredSize / 2 + 14, `${info.ip}:${info.port}`, {
                    fontFamily: 'Arial', fontSize: '13px', color: '#666666',
                    stroke: '#000000', strokeThickness: 2
                }).setOrigin(0.5);
            })
            .catch(() => { /* server-info not available – skip QR */ });
    }

    update() {
        const pads = inputManager.getAllConnectedPads();
        if (pads.length === 0) {
            this.connectMsg.setVisible(true);
            return;
        }
        this.connectMsg.setVisible(false);

        for (const pad of pads) {
            const padIndex = pad.index;
            const state = this._getPadDebounce(padIndex);

            // Left-stick Y / D-pad navigation
            const ly = pad.axes.length > 1 ? pad.axes[1].getValue() : 0;
            const dUp = pad.buttons[12] ? pad.buttons[12].pressed : false;
            const dDown = pad.buttons[13] ? pad.buttons[13].pressed : false;
            const up = ly < -0.5 || dUp;
            const down = ly > 0.5 || dDown;

            if (up && !state.prevUp) {
                this.selectedIndex = Math.max(0, this.selectedIndex - 1);
                this.updateSelection();
            }
            if (down && !state.prevDown) {
                this.selectedIndex = Math.min(this.modes.length - 1, this.selectedIndex + 1);
                this.updateSelection();
            }
            state.prevUp = up;
            state.prevDown = down;

            // Confirm with A button (index 0)
            const aBtn = pad.buttons[0] ? pad.buttons[0].pressed : false;
            if (aBtn && !state.prevA) {
                this.confirmSelection();
                return; // Scene may transition, exit immediately
            }
            state.prevA = aBtn;
        }
    }

    updateSelection() {
        for (let i = 0; i < this.modeTexts.length; i++) {
            const sel = i === this.selectedIndex;
            this.modeTexts[i].setColor(sel ? '#ffffff' : '#aaaaaa');
            this.modeTexts[i].setFontSize(sel ? '40px' : '36px');
            this.descTexts[i].setColor(sel ? '#bbbbbb' : '#777777');
        }
        const t = this.modeTexts[this.selectedIndex];
        this.arrow.setPosition(t.x - t.width / 2 - 28, t.y);
    }

    confirmSelection() {
        if (this.selectedIndex === 3) {
            // Settings – no controller requirement
            this.scene.start('SettingsScene');
            return;
        }

        // Collect all connected pad indices (gamepad 0-3 + WS 100+)
        const padIndices = [];
        for (let i = 0; i < 4; i++) {
            const p = inputManager.getPad(i);
            if (p && p.connected) padIndices.push(i);
        }
        for (const wsIdx of inputManager.getAllWsPadIndices()) {
            if (!padIndices.includes(wsIdx)) padIndices.push(wsIdx);
        }
        if (padIndices.length === 0) return;

        if (this.selectedIndex === 0) {
            // Free For All – go straight to arena
            this.scene.start('ArenaScene', { mode: 'ffa', padIndices, teams: {} });
        } else if (this.selectedIndex === 1) {
            // Team Deathmatch – go to team lobby
            this.scene.start('TeamLobbyScene', { padIndices, nextMode: 'tdm' });
        } else if (this.selectedIndex === 2) {
            // Zone Capture – go to team lobby
            this.scene.start('TeamLobbyScene', { padIndices, nextMode: 'zone' });
        }
    }
}


// ============================================================
// TeamLobbyScene – Team Selection for Team Deathmatch
// ============================================================
class TeamLobbyScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TeamLobbyScene' });
    }

    init(data) {
        this.initialPadIndices = data.padIndices || [];
        this.nextMode = data.nextMode || 'tdm';
    }

    create() {
        inputManager.setPhaserGamepad(this.input.gamepad);
        inputManager.broadcastScene('TeamLobbyScene');
        const w = this.scale.width;
        const h = this.scale.height;
        const cx = w / 2;

        // Background halves
        const bg = this.add.graphics();
        bg.fillStyle(TEAM_COLORS.A, 0.12);
        bg.fillRect(0, 0, cx, h);
        bg.fillStyle(TEAM_COLORS.B, 0.12);
        bg.fillRect(cx, 0, cx, h);
        bg.lineStyle(3, 0xffffff, 0.35);
        bg.lineBetween(cx, 0, cx, h);

        // Team labels
        this.add.text(w * 0.25, 50, 'TEAM A', {
            fontFamily: 'Arial', fontSize: '44px', color: hexStr(TEAM_COLORS.A),
            stroke: '#000000', strokeThickness: 5, fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(w * 0.75, 50, 'TEAM B', {
            fontFamily: 'Arial', fontSize: '44px', color: hexStr(TEAM_COLORS.B),
            stroke: '#000000', strokeThickness: 5, fontStyle: 'bold'
        }).setOrigin(0.5);

        // Instructions
        this.add.text(cx, h - 45, 'Move to a side and press A to ready up', {
            fontFamily: 'Arial', fontSize: '22px', color: '#cccccc',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);

        this.players = [];
        this._prevA = {};
        this.countdownTimer = null;
        this.countdownText = null;
        this.countdownValue = 3;
        this.transitioning = false;

        // Create entries for connected pads
        for (const idx of this.initialPadIndices) {
            this.addPlayer(idx);
        }
    }

    addPlayer(padIndex) {
        if (this.players.find(p => p.padIndex === padIndex)) return;

        const w = this.scale.width;
        const h = this.scale.height;
        const startY = h * 0.3 + this.players.length * 80;

        const sprite = this.add.sprite(w / 2, startY, 'tank_body_' + padIndex).setDepth(10);

        const nameText = this.add.text(0, 0, getPlayerName(padIndex), {
            fontFamily: 'Arial', fontSize: '18px', color: hexStr(getPlayerColor(padIndex)),
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(10);

        const readyText = this.add.text(0, 0, '', {
            fontFamily: 'Arial', fontSize: '16px', color: '#66ff66',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(10);

        this.players.push({ padIndex, sprite, nameText, readyText, ready: false, team: null });
        // Start A-button debounce as "pressed" to avoid carry-over
        this._prevA[padIndex] = true;
    }

    update() {
        if (this.transitioning) return;

        const w = this.scale.width;
        const cx = w / 2;

        // Remove disconnected players
        this.players = this.players.filter(p => {
            const pad = inputManager.getPad(p.padIndex);
            if (!pad || !pad.connected) {
                p.sprite.destroy();
                p.nameText.destroy();
                p.readyText.destroy();
                return false;
            }
            return true;
        });

        // Detect newly connected pads (gamepad 0-3 + WS 100+)
        for (let i = 0; i < 4; i++) {
            const pad = inputManager.getPad(i);
            if (pad && pad.connected && !this.players.find(p => p.padIndex === i)) {
                this.addPlayer(i);
            }
        }
        for (const wsIdx of inputManager.getAllWsPadIndices()) {
            if (!this.players.find(p => p.padIndex === wsIdx)) {
                this.addPlayer(wsIdx);
            }
        }

        let allReady = this.players.length >= 2;
        let teamACount = 0;
        let teamBCount = 0;

        for (const p of this.players) {
            const pad = inputManager.getPad(p.padIndex);
            if (!pad) continue;

            // Movement with left stick
            let lx = pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
            let ly = pad.axes.length > 1 ? pad.axes[1].getValue() : 0;
            if (Math.abs(lx) < DEADZONE) lx = 0;
            if (Math.abs(ly) < DEADZONE) ly = 0;

            p.sprite.x = Phaser.Math.Clamp(p.sprite.x + lx * 6, 50, w - 50);
            p.sprite.y = Phaser.Math.Clamp(p.sprite.y + ly * 4, 100, this.scale.height - 100);

            // Team determined by which half they're on
            const prevTeam = p.team;
            p.team = p.sprite.x < cx ? 'A' : 'B';

            // Swap sprite texture & name color to team color when side changes
            if (p.team !== prevTeam) {
                p.sprite.setTexture('tank_body_team_' + p.team + '_' + p.padIndex);
                p.nameText.setColor(hexStr(TEAM_COLORS[p.team]));
            }

            // A button toggles ready
            const aBtn = pad.buttons[0] ? pad.buttons[0].pressed : false;
            const prevA = this._prevA[p.padIndex] || false;
            if (aBtn && !prevA) {
                p.ready = !p.ready;
            }
            this._prevA[p.padIndex] = aBtn;

            // Update labels
            p.nameText.setPosition(p.sprite.x, p.sprite.y + 28);
            p.readyText.setPosition(p.sprite.x, p.sprite.y + 46);
            p.readyText.setText(p.ready ? 'READY' : '');

            if (!p.ready) allReady = false;
            if (p.team === 'A') teamACount++;
            if (p.team === 'B') teamBCount++;
        }

        // Start or cancel countdown
        const canStart = allReady && this.players.length >= 2 && teamACount >= 1 && teamBCount >= 1;

        if (canStart && !this.countdownTimer) {
            this.startCountdown();
        } else if (!canStart && this.countdownTimer) {
            this.cancelCountdown();
        }
    }

    startCountdown() {
        this.countdownValue = 3;
        this.countdownText = this.add.text(
            this.scale.width / 2, this.scale.height * 0.5, '3',
            { fontFamily: 'Arial', fontSize: '80px', color: '#ffffff', stroke: '#000000', strokeThickness: 8 }
        ).setOrigin(0.5).setDepth(100);

        this.countdownTimer = this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.countdownValue--;
                if (this.countdownValue <= 0) {
                    this.countdownText.setText('GO!');
                    this.transitioning = true;
                    this.time.delayedCall(500, () => this.launchGame());
                } else {
                    this.countdownText.setText('' + this.countdownValue);
                }
            },
            repeat: 2
        });
    }

    cancelCountdown() {
        if (this.countdownTimer) { this.countdownTimer.remove(); this.countdownTimer = null; }
        if (this.countdownText) { this.countdownText.destroy(); this.countdownText = null; }
    }

    launchGame() {
        const teams = {};
        const padIndices = [];
        for (const p of this.players) {
            teams[p.padIndex] = p.team;
            padIndices.push(p.padIndex);
        }
        this.scene.start('ArenaScene', { mode: this.nextMode, padIndices, teams });
    }
}


// ============================================================
// ArenaScene – Main Gameplay
// ============================================================
class ArenaScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ArenaScene' });
    }

    init(data) {
        this.mode = data.mode || 'ffa';
        this.teams = data.teams || {};
        this.padIndices = data.padIndices || [];
    }

    preload() {
        generateAllTextures(this);
    }

    create() {
        inputManager.setPhaserGamepad(this.input.gamepad);
        inputManager.broadcastScene('ArenaScene');
        // Reset state
        this.tanks = [];
        this.scores = {};           // { playerIndex: score }
        this.hudEntries = {};       // { playerIndex: { swatch, text } }
        this.wallRects = [];
        this.gameOver = false;
        this.zone = null;

        // Zone capture scores (separate from kill scores)
        if (this.mode === 'zone') {
            this.zoneScores = { A: 0, B: 0 };
        }

        this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);

        // Groups
        this.walls = this.physics.add.staticGroup();
        this.bullets = this.physics.add.group({ defaultKey: 'bullet_0' });

        // Random walls (new layout every game)
        this.createWalls();

        // HUD (static labels)
        this.createHUD();

        // Spawn tanks for all pads passed from the previous scene
        for (const idx of this.padIndices) {
            const pad = inputManager.getPad(idx);
            if (pad && pad.connected) {
                this.scores[idx] = 0;
                this.spawnTank(idx, pad);
            }
        }
        this.rebuildPlayerHUD();
        this.updateHUD();

        // Spawn first zone in zone capture mode
        if (this.mode === 'zone') {
            this.spawnZone();
        }

        // Handle mid-game disconnects (physical + WebSocket)
        this.input.gamepad.on('disconnected', (pad) => this.onPadDisconnected(pad));
        this._wsDisconnectCb = (pad) => this.onPadDisconnected(pad);
        inputManager.onDisconnect(this._wsDisconnectCb);

        // Handle mid-game WS connects
        this._wsConnectCb = (pad) => this.onWsPadConnected(pad);
        inputManager.onConnect(this._wsConnectCb);

        // Resize handler
        this.scale.on('resize', (gs) => this.onResize(gs));

        // Clean up WS callbacks when scene shuts down
        this.events.on('shutdown', () => {
            if (this._wsConnectCb) inputManager.offConnect(this._wsConnectCb);
            if (this._wsDisconnectCb) inputManager.offDisconnect(this._wsDisconnectCb);
        });
    }

    // --------------------------------------------------------
    // Wall generation (random each game)
    // --------------------------------------------------------
    createWalls() {
        this.wallRects = [];
        const w = this.scale.width;
        const h = this.scale.height;
        const margin = 80;

        for (let i = 0; i < WALL_COUNT; i++) {
            const ww = Phaser.Math.Between(WALL_MIN, WALL_MAX);
            const wh = Phaser.Math.Between(WALL_MIN / 2, WALL_MAX / 2);
            const wx = Phaser.Math.Between(margin, w - margin - ww);
            const wy = Phaser.Math.Between(margin + 50, h - margin - wh);

            let overlap = false;
            for (const r of this.wallRects) {
                if (Phaser.Geom.Rectangle.Overlaps(
                    new Phaser.Geom.Rectangle(wx - 10, wy - 10, ww + 20, wh + 20), r)) {
                    overlap = true;
                    break;
                }
            }
            if (overlap) continue;

            this.wallRects.push(new Phaser.Geom.Rectangle(wx, wy, ww, wh));
            const wallSprite = this.add.tileSprite(wx + ww / 2, wy + wh / 2, ww, wh, 'wall_tile');
            this.physics.add.existing(wallSprite, true);
            wallSprite.body.setSize(ww, wh);
            this.walls.add(wallSprite);
        }
    }

    // --------------------------------------------------------
    // HUD – different layouts for FFA vs TDM
    // --------------------------------------------------------
    createHUD() {
        const w = this.scale.width;
        let modeLabel, targetText;
        if (this.mode === 'ffa') {
            modeLabel = 'FREE FOR ALL';
            targetText = 'First to ' + FFA_KILL_TARGET + ' kills';
        } else if (this.mode === 'tdm') {
            modeLabel = 'TEAM DEATHMATCH';
            targetText = 'First to ' + TDM_KILL_TARGET + ' kills';
        } else {
            modeLabel = 'ZONE CAPTURE';
            targetText = 'First to ' + ZONE_CAPTURE_TARGET + ' captures';
        }

        // Mode title + target at top centre
        this.modeText = this.add.text(w / 2, 8, modeLabel + '  \u2014  ' + targetText, {
            fontFamily: 'Arial', fontSize: '20px', color: '#cccccc',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5, 0).setDepth(200);

        // Team score labels (TDM and Zone)
        if (this.mode === 'tdm' || this.mode === 'zone') {
            const labelA = this.mode === 'zone' ? 'Team A: 0 caps' : 'Team A: 0';
            const labelB = this.mode === 'zone' ? 'Team B: 0 caps' : 'Team B: 0';
            this.teamAText = this.add.text(w * 0.12, 8, labelA, {
                fontFamily: 'Arial', fontSize: '22px', color: hexStr(TEAM_COLORS.A),
                stroke: '#000000', strokeThickness: 3, fontStyle: 'bold'
            }).setOrigin(0.5, 0).setDepth(200);

            this.teamBText = this.add.text(w * 0.88, 8, labelB, {
                fontFamily: 'Arial', fontSize: '22px', color: hexStr(TEAM_COLORS.B),
                stroke: '#000000', strokeThickness: 3, fontStyle: 'bold'
            }).setOrigin(0.5, 0).setDepth(200);
        }

        // Per-player HUD entries are built dynamically
        this.hudEntries = {};
    }

    /** Rebuild per-player HUD swatches + texts for all current padIndices. */
    rebuildPlayerHUD() {
        // Destroy existing entries
        for (const idx in this.hudEntries) {
            const e = this.hudEntries[idx];
            if (e.swatch) e.swatch.destroy();
            if (e.text) e.text.destroy();
        }
        this.hudEntries = {};

        const y = 34;
        let col = 0;
        for (const idx of this.padIndices) {
            const x = 20 + col * 160;
            const isTeamMode = (this.mode === 'tdm' || this.mode === 'zone') && this.teams[idx];
            const swatchColor = isTeamMode ? TEAM_COLORS[this.teams[idx]] : getPlayerColor(idx);
            const sw = this.add.graphics().setDepth(200);
            sw.fillStyle(swatchColor, 1);
            sw.fillRoundedRect(x, y, 20, 20, 4);

            const txt = this.add.text(x + 26, y, getPlayerName(idx) + ': 0', {
                fontFamily: 'Arial', fontSize: '18px', color: '#ffffff',
                stroke: '#000000', strokeThickness: 3
            }).setDepth(200);

            this.hudEntries[idx] = { swatch: sw, text: txt };
            col++;
        }
    }

    updateHUD() {
        // Per-player
        for (const idx of this.padIndices) {
            const entry = this.hudEntries[idx];
            if (!entry) continue;
            const score = this.scores[idx] || 0;
            let label = getPlayerName(idx) + ': ' + score;
            if ((this.mode === 'tdm' || this.mode === 'zone') && this.teams[idx]) {
                label += '  (T' + this.teams[idx] + ')';
            }
            entry.text.setText(label);
        }
        // Team scores
        if (this.mode === 'tdm') {
            const ts = this.getTeamScores();
            if (this.teamAText) this.teamAText.setText('Team A: ' + ts.A);
            if (this.teamBText) this.teamBText.setText('Team B: ' + ts.B);
        }
        if (this.mode === 'zone') {
            const zs = this.zoneScores;
            if (this.teamAText) this.teamAText.setText('Team A: ' + zs.A + ' caps');
            if (this.teamBText) this.teamBText.setText('Team B: ' + zs.B + ' caps');
        }
    }

    getTeamScores() {
        const ts = { A: 0, B: 0 };
        for (const idx of this.padIndices) {
            if (this.teams[idx]) ts[this.teams[idx]] += (this.scores[idx] || 0);
        }
        return ts;
    }

    // --------------------------------------------------------
    // Gamepad / WS disconnect (mid-game)
    // --------------------------------------------------------
    onPadDisconnected(pad) {
        const idx = pad.index;
        const tank = this.tanks.find(t => t && t.playerIndex === idx);
        if (tank) this.destroyTank(tank, false);
        // Remove from padIndices
        const pi = this.padIndices.indexOf(idx);
        if (pi !== -1) this.padIndices.splice(pi, 1);
        delete this.scores[idx];
        delete this.teams[idx];
        this.rebuildPlayerHUD();
        this.updateHUD();
    }

    // --------------------------------------------------------
    // WS controller connected mid-game
    // --------------------------------------------------------
    onWsPadConnected(pad) {
        if (this.gameOver) return;
        const idx = pad.index; // 100+
        if (this.padIndices.includes(idx)) return; // already in game

        // Auto-assign team in team modes
        if (this.mode === 'tdm' || this.mode === 'zone') {
            let countA = 0, countB = 0;
            for (const pi of this.padIndices) {
                if (this.teams[pi] === 'A') countA++;
                if (this.teams[pi] === 'B') countB++;
            }
            this.teams[idx] = countA <= countB ? 'A' : 'B';
        }

        this.padIndices.push(idx);
        this.scores[idx] = 0;
        this.spawnTank(idx, pad);
        this.rebuildPlayerHUD();
        this.updateHUD();
    }

    // --------------------------------------------------------
    // Tank spawn
    // --------------------------------------------------------
    spawnTank(playerIndex, pad) {
        const pos = this.findSpawnPosition();
        const team = this.teams[playerIndex] || null;
        const isTeamMode = (this.mode === 'tdm' || this.mode === 'zone') && team;

        const bodyKey = isTeamMode ? 'tank_body_team_' + team + '_' + playerIndex : 'tank_body_' + playerIndex;
        const turretKey = isTeamMode ? 'tank_turret_team_' + team : 'tank_turret_' + playerIndex;

        const body = this.physics.add.sprite(pos.x, pos.y, bodyKey);
        body.setDepth(10);
        body.setCollideWorldBounds(true);
        body.body.setSize(44, 32);

        const turret = this.add.sprite(pos.x, pos.y, turretKey);
        turret.setDepth(11);
        turret.setOrigin(0.2, 0.5);

        const reloadGfx = this.add.graphics().setDepth(12);

        const tank = {
            playerIndex,
            pad,
            body,
            turret,
            reloadGfx,
            alive: true,
            lastFireTime: -RELOAD_TIME,
            turretAngle: 0,
            invincible: false,
            invincibleUntil: 0,
            ghostSprite: null,
            team: this.teams[playerIndex] || null
        };

        this.tanks.push(tank);

        this.physics.add.collider(body, this.walls);
        for (const other of this.tanks) {
            if (other && other !== tank && other.alive) {
                this.physics.add.collider(body, other.body);
            }
        }

        this.setInvincible(tank);
    }

    // --------------------------------------------------------
    // Find clear spawn position
    // --------------------------------------------------------
    findSpawnPosition() {
        const w = this.scale.width;
        const h = this.scale.height;
        const margin = 60;

        for (let attempts = 0; attempts < 100; attempts++) {
            const x = Phaser.Math.Between(margin, w - margin);
            const y = Phaser.Math.Between(margin + 50, h - margin);
            const testRect = new Phaser.Geom.Rectangle(x - 30, y - 24, 60, 48);

            let clear = true;
            for (const wr of this.wallRects) {
                if (Phaser.Geom.Rectangle.Overlaps(testRect, wr)) { clear = false; break; }
            }
            if (clear) {
                for (const t of this.tanks) {
                    if (t && t.alive) {
                        if (Phaser.Math.Distance.Between(x, y, t.body.x, t.body.y) < 100) {
                            clear = false; break;
                        }
                    }
                }
            }
            if (clear) return { x, y };
        }
        return { x: w / 2, y: h / 2 };
    }

    // --------------------------------------------------------
    // Invincibility
    // --------------------------------------------------------
    setInvincible(tank) {
        tank.invincible = true;
        tank.invincibleUntil = this.time.now + INVINCIBILITY_TIME;

        if (tank._blinkTween) tank._blinkTween.remove();
        tank._blinkTween = this.tweens.add({
            targets: [tank.body, tank.turret],
            alpha: { from: 1, to: 0.25 },
            duration: 150,
            yoyo: true,
            repeat: Math.ceil(INVINCIBILITY_TIME / 300),
            onComplete: () => {
                if (tank.body && tank.body.active) {
                    tank.body.setAlpha(1);
                    tank.turret.setAlpha(1);
                }
            }
        });
    }

    // --------------------------------------------------------
    // Shooting – team-aware collision
    // --------------------------------------------------------
    fireBullet(tank) {
        if (this.gameOver) return;
        const now = this.time.now;
        if (now - tank.lastFireTime < RELOAD_TIME) return;
        tank.lastFireTime = now;

        const angle = tank.turretAngle;
        const bx = tank.body.x + Math.cos(angle) * 30;
        const by = tank.body.y + Math.sin(angle) * 30;

        const isTeamMode = (this.mode === 'tdm' || this.mode === 'zone') && tank.team;
        const bulletKey = isTeamMode ? 'bullet_team_' + tank.team : 'bullet_' + tank.playerIndex;
        const bullet = this.physics.add.sprite(bx, by, bulletKey);
        bullet.setDepth(9);
        bullet.ownerIndex = tank.playerIndex;
        this.bullets.add(bullet);

        bullet.body.setCircle(4);
        this.physics.velocityFromRotation(angle, BULLET_SPEED, bullet.body.velocity);

        // Bullet <-> wall
        this.physics.add.collider(bullet, this.walls, (b) => b.destroy());

        // Bullet <-> tanks (team-aware)
        for (const other of this.tanks) {
            if (!other || !other.alive) continue;

            let canHit;
            if (this.mode === 'ffa') {
                canHit = other.playerIndex !== tank.playerIndex;
            } else {
                // TDM / Zone – only hit different team
                canHit = this.teams[other.playerIndex] !== this.teams[tank.playerIndex];
            }

            if (canHit) {
                this.physics.add.overlap(bullet, other.body, (b) => {
                    this.onBulletHitTank(b, other);
                });
            }
        }

        this.time.delayedCall(5000, () => {
            if (bullet && bullet.active) bullet.destroy();
        });
    }

    // --------------------------------------------------------
    // Bullet hit
    // --------------------------------------------------------
    onBulletHitTank(bullet, tank) {
        if (!tank.alive || tank.invincible || this.gameOver) {
            if (bullet && bullet.active) bullet.destroy();
            return;
        }

        const attackerIndex = bullet.ownerIndex;
        if (this.scores[attackerIndex] === undefined) this.scores[attackerIndex] = 0;
        this.scores[attackerIndex]++;
        this.updateHUD();

        if (bullet && bullet.active) bullet.destroy();

        this.playExplosion(tank.body.x, tank.body.y);
        this.killTank(tank);

        // Check win condition after every kill
        this.checkWinCondition();
    }

    // --------------------------------------------------------
    // Win condition check
    // --------------------------------------------------------
    checkWinCondition() {
        if (this.gameOver) return;

        if (this.mode === 'ffa') {
            for (const idx of this.padIndices) {
                if ((this.scores[idx] || 0) >= FFA_KILL_TARGET) {
                    this.triggerWin({ winnerIndex: idx });
                    return;
                }
            }
        } else if (this.mode === 'tdm') {
            const ts = this.getTeamScores();
            if (ts.A >= TDM_KILL_TARGET) {
                this.triggerWin({ winningTeam: 'A', teamScores: { ...ts } });
                return;
            }
            if (ts.B >= TDM_KILL_TARGET) {
                this.triggerWin({ winningTeam: 'B', teamScores: { ...ts } });
                return;
            }
        } else if (this.mode === 'zone') {
            const zs = this.zoneScores;
            if (zs.A >= ZONE_CAPTURE_TARGET) {
                this.triggerWin({ winningTeam: 'A', teamScores: { ...zs } });
                return;
            }
            if (zs.B >= ZONE_CAPTURE_TARGET) {
                this.triggerWin({ winningTeam: 'B', teamScores: { ...zs } });
                return;
            }
        }
    }

    triggerWin(winData) {
        this.gameOver = true;

        // Freeze all tanks
        for (const tank of this.tanks) {
            if (tank && tank.alive) {
                tank.body.body.setVelocity(0, 0);
            }
        }

        // "GAME OVER" overlay
        const w = this.scale.width;
        const h = this.scale.height;
        this.add.text(w / 2, h / 2, 'GAME OVER', {
            fontFamily: 'Arial', fontSize: '64px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 8, fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(300);

        // Transition to WinnerScene after a brief pause
        this.time.delayedCall(1500, () => {
            this.scene.start('WinnerScene', {
                mode: this.mode,
                scores: { ...this.scores },
                teams: { ...this.teams },
                padIndices: [...this.padIndices],
                ...winData
            });
        });
    }

    // --------------------------------------------------------
    // Explosion effect
    // --------------------------------------------------------
    playExplosion(x, y) {
        const particles = this.add.particles(x, y, 'particle_orange', {
            speed: { min: 80, max: 250 },
            scale: { start: 1.2, end: 0 },
            lifespan: 500,
            quantity: 20,
            blendMode: 'ADD',
            emitting: false
        });
        particles.setDepth(50);
        particles.explode(20);
        this.time.delayedCall(600, () => particles.destroy());
    }

    // --------------------------------------------------------
    // Kill / Respawn
    // --------------------------------------------------------
    killTank(tank) {
        tank.alive = false;
        tank.body.setVisible(false);
        tank.body.body.enable = false;
        tank.turret.setVisible(false);
        tank.reloadGfx.setVisible(false);

        if (tank._blinkTween) {
            tank._blinkTween.remove();
            tank._blinkTween = null;
        }

        // Don't schedule respawn if game is over
        if (this.gameOver) return;

        const spawnPos = this.findSpawnPosition();

        // Ghost preview in last 1 second of respawn delay
        this.time.delayedCall(RESPAWN_DELAY - 1000, () => {
            if (!this.tanks.includes(tank) || this.gameOver) return;
            const isTeamMode = (this.mode === 'tdm' || this.mode === 'zone') && tank.team;
            const ghostKey = isTeamMode ? 'tank_body_team_' + tank.team + '_' + tank.playerIndex : 'tank_body_' + tank.playerIndex;
            const ghost = this.add.sprite(spawnPos.x, spawnPos.y, ghostKey);
            ghost.setAlpha(0.3).setDepth(5);
            tank.ghostSprite = ghost;

            this.tweens.add({
                targets: ghost,
                alpha: { from: 0.15, to: 0.45 },
                duration: 200,
                yoyo: true,
                repeat: 4
            });
        });

        this.time.delayedCall(RESPAWN_DELAY, () => {
            if (!this.tanks.includes(tank) || this.gameOver) return;

            if (tank.ghostSprite) {
                tank.ghostSprite.destroy();
                tank.ghostSprite = null;
            }

            tank.alive = true;
            tank.body.setPosition(spawnPos.x, spawnPos.y);
            tank.body.setVisible(true);
            tank.body.body.enable = true;
            tank.body.body.setVelocity(0, 0);
            tank.turret.setVisible(true);
            tank.reloadGfx.setVisible(true);
            tank.body.setAlpha(1);
            tank.turret.setAlpha(1);

            this.physics.add.collider(tank.body, this.walls);
            for (const other of this.tanks) {
                if (other && other !== tank && other.alive) {
                    this.physics.add.collider(tank.body, other.body);
                }
            }
            this.setInvincible(tank);
        });
    }

    destroyTank(tank, explode = true) {
        if (explode && tank.alive) {
            this.playExplosion(tank.body.x, tank.body.y);
        }
        tank.alive = false;
        if (tank._blinkTween) tank._blinkTween.remove();
        tank.body.destroy();
        tank.turret.destroy();
        tank.reloadGfx.destroy();
        if (tank.ghostSprite) tank.ghostSprite.destroy();

        const idx = this.tanks.indexOf(tank);
        if (idx !== -1) this.tanks.splice(idx, 1);
    }

    // --------------------------------------------------------
    // Update loop
    // --------------------------------------------------------
    update(time, delta) {
        if (this.gameOver) return;

        for (const tank of this.tanks) {
            if (!tank || !tank.alive) continue;
            this.updateTankInput(tank, time);
            this.updateReloadIndicator(tank, time);
            this.updateInvincibility(tank, time);
        }

        // Zone capture update
        if (this.mode === 'zone') {
            this.updateZone(delta);
        }

        // Destroy out-of-bounds bullets
        for (const bullet of this.bullets.getChildren()) {
            if (!bullet || !bullet.active) continue;
            if (bullet.x < -20 || bullet.x > this.scale.width + 20 ||
                bullet.y < -20 || bullet.y > this.scale.height + 20) {
                bullet.destroy();
            }
        }
    }

    // --------------------------------------------------------
    // Per-tank input
    // --------------------------------------------------------
    updateTankInput(tank, time) {
        const pad = tank.pad;
        if (!pad || !pad.connected) return;

        // Left stick: movement
        let lx = pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
        let ly = pad.axes.length > 1 ? pad.axes[1].getValue() : 0;
        if (Math.abs(lx) < DEADZONE) lx = 0;
        if (Math.abs(ly) < DEADZONE) ly = 0;

        const magnitude = Math.min(1, Math.sqrt(lx * lx + ly * ly));
        if (magnitude > DEADZONE) {
            const moveAngle = Math.atan2(ly, lx);
            const speed = TANK_SPEED * magnitude;
            tank.body.body.setVelocity(
                Math.cos(moveAngle) * speed,
                Math.sin(moveAngle) * speed
            );
            tank.body.rotation = Phaser.Math.Angle.RotateTo(
                tank.body.rotation, moveAngle, 0.15
            );
        } else {
            tank.body.body.setVelocity(0, 0);
        }

        // Right stick: turret aim
        let rx = pad.axes.length > 2 ? pad.axes[2].getValue() : 0;
        let ry = pad.axes.length > 3 ? pad.axes[3].getValue() : 0;
        if (Math.abs(rx) < DEADZONE) rx = 0;
        if (Math.abs(ry) < DEADZONE) ry = 0;

        if (Math.sqrt(rx * rx + ry * ry) > DEADZONE) {
            tank.turretAngle = Math.atan2(ry, rx);
        }

        tank.turret.setPosition(tank.body.x, tank.body.y);
        tank.turret.setRotation(tank.turretAngle);

        // RT / R2: fire
        const rt = pad.buttons[7];
        if (rt && rt.pressed) {
            this.fireBullet(tank);
        }
    }

    // --------------------------------------------------------
    // Reload indicator
    // --------------------------------------------------------
    updateReloadIndicator(tank, time) {
        const gfx = tank.reloadGfx;
        gfx.clear();

        const elapsed = time - tank.lastFireTime;
        if (elapsed >= RELOAD_TIME) return;

        const progress = Phaser.Math.Clamp(elapsed / RELOAD_TIME, 0, 1);
        const startAngle = Phaser.Math.DegToRad(-90);
        const endAngle = Phaser.Math.DegToRad(-90 + 360 * progress);
        const x = tank.body.x;
        const y = tank.body.y;

        gfx.lineStyle(3, 0x333333, 0.5);
        gfx.beginPath();
        gfx.arc(x, y, 28, 0, Math.PI * 2);
        gfx.strokePath();

        const isTeamMode = (this.mode === 'tdm' || this.mode === 'zone') && tank.team;
        const reloadColor = isTeamMode ? TEAM_COLORS[tank.team] : getPlayerColor(tank.playerIndex);
        gfx.lineStyle(3, reloadColor, 0.9);
        gfx.beginPath();
        gfx.arc(x, y, 28, startAngle, endAngle, false);
        gfx.strokePath();
    }

    // --------------------------------------------------------
    // Invincibility check
    // --------------------------------------------------------
    updateInvincibility(tank, time) {
        if (tank.invincible && time >= tank.invincibleUntil) {
            tank.invincible = false;
            tank.body.setAlpha(1);
            tank.turret.setAlpha(1);
        }
    }

    // --------------------------------------------------------
    // Zone Capture – spawn, update, destroy
    // --------------------------------------------------------
    findZonePosition() {
        const w = this.scale.width;
        const h = this.scale.height;
        const margin = 80;
        const radius = ZONE_SIZE / 2;

        for (let attempts = 0; attempts < 200; attempts++) {
            const x = Phaser.Math.Between(margin + radius, w - margin - radius);
            const y = Phaser.Math.Between(margin + 50 + radius, h - margin - radius);

            // Check overlap with walls (circle vs rectangle)
            let clear = true;
            for (const wr of this.wallRects) {
                // Expand wall rect by zone radius for circle-rect overlap test
                const expanded = new Phaser.Geom.Rectangle(
                    wr.x - radius, wr.y - radius,
                    wr.width + ZONE_SIZE, wr.height + ZONE_SIZE
                );
                if (expanded.contains(x, y)) {
                    clear = false;
                    break;
                }
            }
            if (clear) return { x, y };
        }
        return { x: w / 2, y: h / 2 };
    }

    spawnZone() {
        if (this.gameOver) return;
        const pos = this.findZonePosition();
        const radius = ZONE_SIZE / 2;

        const gfx = this.add.graphics().setDepth(2);
        const timerText = this.add.text(pos.x, pos.y, Math.ceil(ZONE_CAPTURE_TIME / 1000) + '', {
            fontFamily: 'Arial', fontSize: '32px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 5, fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(3);

        this.zone = {
            gfx,
            x: pos.x,
            y: pos.y,
            radius,
            capturingTeam: null,
            progress: ZONE_CAPTURE_TIME,
            timerText
        };

        this.drawZone(0xaaaaaa, 0.2);
    }

    drawZone(fillColor, fillAlpha) {
        const z = this.zone;
        if (!z) return;
        z.gfx.clear();
        // Filled circle
        z.gfx.fillStyle(fillColor, fillAlpha);
        z.gfx.fillCircle(z.x, z.y, z.radius);
        // Outline
        z.gfx.lineStyle(3, fillColor, 0.8);
        z.gfx.strokeCircle(z.x, z.y, z.radius);
    }

    updateZone(delta) {
        const z = this.zone;
        if (!z) return;

        // Determine which teams have alive tanks inside the zone
        const teamsInZone = { A: 0, B: 0 };
        for (const tank of this.tanks) {
            if (!tank || !tank.alive) continue;
            const dist = Phaser.Math.Distance.Between(tank.body.x, tank.body.y, z.x, z.y);
            if (dist < z.radius) {
                const team = this.teams[tank.playerIndex];
                if (team) teamsInZone[team]++;
            }
        }

        const aIn = teamsInZone.A > 0;
        const bIn = teamsInZone.B > 0;

        if (aIn && bIn) {
            // Contested – pause, show neutral flicker
            this.drawZone(0xffffff, 0.15);
            z.timerText.setColor('#ff4444');
        } else if (aIn || bIn) {
            const activeTeam = aIn ? 'A' : 'B';
            const teamColor = TEAM_COLORS[activeTeam];

            if (z.capturingTeam !== activeTeam) {
                // Different team took over – reset progress
                z.capturingTeam = activeTeam;
                z.progress = ZONE_CAPTURE_TIME;
            }

            // Count down
            z.progress -= delta;
            this.drawZone(teamColor, 0.25);
            z.timerText.setColor(hexStr(teamColor));

            if (z.progress <= 0) {
                // Zone captured!
                this.zoneScores[activeTeam]++;
                this.updateHUD();
                this.destroyZone();
                this.checkWinCondition();

                // Schedule next zone if game not over
                if (!this.gameOver) {
                    this.time.delayedCall(ZONE_RESPAWN_DELAY, () => {
                        if (!this.gameOver) this.spawnZone();
                    });
                }
                return;
            }
        } else {
            // No one – keep current state but neutral look
            const color = z.capturingTeam ? TEAM_COLORS[z.capturingTeam] : 0xaaaaaa;
            this.drawZone(color, 0.15);
            if (z.capturingTeam) {
                z.timerText.setColor(hexStr(color));
            } else {
                z.timerText.setColor('#ffffff');
            }
        }

        // Update countdown text
        z.timerText.setText(Math.ceil(z.progress / 1000) + '');
    }

    destroyZone() {
        if (this.zone) {
            this.zone.gfx.destroy();
            this.zone.timerText.destroy();
            this.zone = null;
        }
    }

    // --------------------------------------------------------
    // Resize handler
    // --------------------------------------------------------
    onResize(gameSize) {
        this.physics.world.setBounds(0, 0, gameSize.width, gameSize.height);
    }

}


// ============================================================
// WinnerScene – Victory Screen
// ============================================================
class WinnerScene extends Phaser.Scene {
    constructor() {
        super({ key: 'WinnerScene' });
    }

    init(data) {
        this.resultData = data;
    }

    create() {
        inputManager.setPhaserGamepad(this.input.gamepad);
        inputManager.broadcastScene('WinnerScene');
        const d = this.resultData;
        const w = this.scale.width;
        const h = this.scale.height;

        if (d.mode === 'ffa') {
            // --- Free For All winner ---
            const idx = d.winnerIndex;
            const color = hexStr(getPlayerColor(idx));

            this.add.text(w / 2, h * 0.15, getPlayerName(idx) + ' WINS!', {
                fontFamily: 'Arial', fontSize: '64px', color: color,
                stroke: '#000000', strokeThickness: 8, fontStyle: 'bold'
            }).setOrigin(0.5);

            this.add.text(w / 2, h * 0.27, 'Free For All', {
                fontFamily: 'Arial', fontSize: '24px', color: '#aaaaaa',
                stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5);

            this.add.sprite(w / 2, h * 0.38, 'tank_body_' + idx).setScale(2.5);
        } else {
            // --- Team-based winner (TDM or Zone Capture) ---
            const team = d.winningTeam;
            const color = hexStr(TEAM_COLORS[team]);
            const ts = d.teamScores;
            const subTitle = d.mode === 'zone' ? 'Zone Capture' : 'Team Deathmatch';
            const unit = d.mode === 'zone' ? ' caps' : ' kills';

            this.add.text(w / 2, h * 0.12, 'TEAM ' + team + ' WINS!', {
                fontFamily: 'Arial', fontSize: '64px', color: color,
                stroke: '#000000', strokeThickness: 8, fontStyle: 'bold'
            }).setOrigin(0.5);

            this.add.text(w / 2, h * 0.24, subTitle, {
                fontFamily: 'Arial', fontSize: '24px', color: '#aaaaaa',
                stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5);

            // Team totals
            this.add.text(w * 0.35, h * 0.34, 'Team A: ' + ts.A + unit, {
                fontFamily: 'Arial', fontSize: '30px', color: hexStr(TEAM_COLORS.A),
                stroke: '#000000', strokeThickness: 4, fontStyle: 'bold'
            }).setOrigin(0.5);

            this.add.text(w * 0.65, h * 0.34, 'Team B: ' + ts.B + unit, {
                fontFamily: 'Arial', fontSize: '30px', color: hexStr(TEAM_COLORS.B),
                stroke: '#000000', strokeThickness: 4, fontStyle: 'bold'
            }).setOrigin(0.5);
        }

        // --- Scoreboard ---
        this.add.text(w / 2, h * 0.50, 'SCOREBOARD', {
            fontFamily: 'Arial', fontSize: '28px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);

        const scores = d.scores || {};
        const padIndices = d.padIndices || [];

        // Sort players by score descending
        const sorted = [...padIndices].sort((a, b) => (scores[b] || 0) - (scores[a] || 0));

        for (let i = 0; i < sorted.length; i++) {
            const idx = sorted[i];
            const y = h * 0.58 + i * 32;
            let label = getPlayerName(idx) + ':  ' + (scores[idx] || 0) + ' kills';
            if ((d.mode === 'tdm' || d.mode === 'zone') && d.teams[idx]) {
                label += '   (Team ' + d.teams[idx] + ')';
            }
            this.add.sprite(w / 2 - 140, y, 'tank_body_' + idx).setScale(0.8);
            this.add.text(w / 2 - 110, y, label, {
                fontFamily: 'Arial', fontSize: '20px', color: hexStr(getPlayerColor(idx)),
                stroke: '#000000', strokeThickness: 3
            }).setOrigin(0, 0.5);
        }

        // Return info
        this.add.text(w / 2, h * 0.92, 'Returning to menu in 5 seconds...  (press A to skip)', {
            fontFamily: 'Arial', fontSize: '18px', color: '#888888',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);

        // Auto return after 5 seconds
        this.autoTimer = this.time.delayedCall(5000, () => this.returnToMenu());

        this._returned = false;
        // Start prevA as true so holding A from arena doesn't trigger immediately
        this._prevA = true;
    }

    update() {
        if (this._returned) return;

        // Any pad's A button can skip back to menu (gamepad + WS)
        let anyA = false;
        const allIndices = [0, 1, 2, 3, ...inputManager.getAllWsPadIndices()];
        for (const i of allIndices) {
            const pad = inputManager.getPad(i);
            if (pad && pad.connected && pad.buttons[0] && pad.buttons[0].pressed) {
                anyA = true;
                break;
            }
        }
        if (anyA && !this._prevA) {
            this.returnToMenu();
        }
        this._prevA = anyA;
    }

    returnToMenu() {
        if (this._returned) return;
        this._returned = true;
        this.scene.start('MenuScene');
    }
}


// ============================================================
// SettingsScene – Edit Game Variables
// ============================================================
class SettingsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SettingsScene' });
    }

    create() {
        inputManager.setPhaserGamepad(this.input.gamepad);
        inputManager.broadcastScene('SettingsScene');
        const w = this.scale.width;
        const h = this.scale.height;

        // Title
        this.add.text(w / 2, 30, 'SETTINGS', {
            fontFamily: 'Arial', fontSize: '52px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 8, fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(w / 2, 80, 'Use left stick to navigate, left/right to adjust. Press A to go back.', {
            fontFamily: 'Arial', fontSize: '16px', color: '#888888',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);

        // Slider definitions: { label, varName, min, max, step, get, set }
        this.sliders = [
            { label: 'Tank Speed',         min: 50,   max: 500,   step: 10,  get: () => TANK_SPEED,         set: v => { TANK_SPEED = v; } },
            { label: 'Bullet Speed',       min: 100,  max: 1000,  step: 25,  get: () => BULLET_SPEED,       set: v => { BULLET_SPEED = v; } },
            { label: 'Reload Time (ms)',   min: 0,    max: 3000,  step: 50,  get: () => RELOAD_TIME,        set: v => { RELOAD_TIME = v; } },
            { label: 'Respawn Delay (ms)', min: 500,  max: 10000, step: 250, get: () => RESPAWN_DELAY,      set: v => { RESPAWN_DELAY = v; } },
            { label: 'Invincibility (ms)', min: 0,    max: 5000,  step: 250, get: () => INVINCIBILITY_TIME, set: v => { INVINCIBILITY_TIME = v; } },
            { label: 'Wall Count',         min: 0,    max: 30,    step: 1,   get: () => WALL_COUNT,         set: v => { WALL_COUNT = v; } },
            { label: 'FFA Kill Target',    min: 1,    max: 50,    step: 1,   get: () => FFA_KILL_TARGET,    set: v => { FFA_KILL_TARGET = v; } },
            { label: 'TDM Kill Target',    min: 1,    max: 50,    step: 1,   get: () => TDM_KILL_TARGET,    set: v => { TDM_KILL_TARGET = v; } },
            { label: 'Zone Cap Time (ms)', min: 2000, max: 30000, step: 1000,get: () => ZONE_CAPTURE_TIME,  set: v => { ZONE_CAPTURE_TIME = v; } },
            { label: 'Zone Respawn (ms)',  min: 0,    max: 10000, step: 500, get: () => ZONE_RESPAWN_DELAY, set: v => { ZONE_RESPAWN_DELAY = v; } },
            { label: 'Zone Cap Target',   min: 1,    max: 30,    step: 1,   get: () => ZONE_CAPTURE_TARGET,set: v => { ZONE_CAPTURE_TARGET = v; } },
            { label: 'Zone Size',         min: 60,   max: 300,   step: 10,  get: () => ZONE_SIZE,          set: v => { ZONE_SIZE = v; } },
        ];

        this.selectedIndex = 0;
        // Extra "row" at end for the Back button
        this.totalRows = this.sliders.length + 1;

        // Layout
        const startY = 130;
        const rowH = 52;
        const trackX = w / 2 - 140;
        const trackW = 280;
        const labelX = w / 2 - 320;

        this.rows = [];
        for (let i = 0; i < this.sliders.length; i++) {
            const s = this.sliders[i];
            const y = startY + i * rowH;

            // Label
            const labelTxt = this.add.text(labelX, y, s.label, {
                fontFamily: 'Arial', fontSize: '22px', color: '#aaaaaa',
                stroke: '#000000', strokeThickness: 3
            }).setOrigin(0, 0.5);

            // Track background
            const trackGfx = this.add.graphics();
            trackGfx.fillStyle(0x444444, 1);
            trackGfx.fillRoundedRect(trackX, y - 8, trackW, 16, 4);

            // Filled portion
            const fillGfx = this.add.graphics();

            // Value text (right of track)
            const valTxt = this.add.text(trackX + trackW + 16, y, '' + s.get(), {
                fontFamily: 'Arial', fontSize: '22px', color: '#ffffff',
                stroke: '#000000', strokeThickness: 3
            }).setOrigin(0, 0.5);

            // Arrow indicator (selection)
            const arrow = this.add.text(labelX - 30, y, '\u25B6', {
                fontFamily: 'Arial', fontSize: '20px', color: '#ffcc00',
                stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5).setVisible(false);

            this.rows.push({ labelTxt, trackGfx, fillGfx, valTxt, arrow, y, trackX, trackW });
        }

        // Back button
        const backY = startY + this.sliders.length * rowH + 10;
        this.backText = this.add.text(w / 2, backY, '[ BACK TO MENU ]', {
            fontFamily: 'Arial', fontSize: '28px', color: '#aaaaaa',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);

        this.backArrow = this.add.text(w / 2 - 150, backY, '\u25B6', {
            fontFamily: 'Arial', fontSize: '20px', color: '#ffcc00',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setVisible(false);

        this.updateAllSliderVisuals();
        this.updateSelection();

        // Per-pad debounce state (padIndex -> { prevUp, prevDown, prevA, holdDir, holdTimer, holdAccum })
        this._padState = new Map();
        // Shared hold-to-repeat config
        this._holdDelay = 350; // ms before repeat starts
        this._holdRate = 80;  // ms between repeats
    }

    _getPadDebounce(padIndex) {
        if (!this._padState.has(padIndex)) {
            // Initialize as true to prevent carry-over
            this._padState.set(padIndex, {
                prevUp: true,
                prevDown: true,
                prevA: true,
                holdDir: 0,
                holdTimer: 0,
                holdAccum: 0
            });
        }
        return this._padState.get(padIndex);
    }

    updateAllSliderVisuals() {
        for (let i = 0; i < this.sliders.length; i++) {
            this.updateSliderVisual(i);
        }
    }

    updateSliderVisual(i) {
        const s = this.sliders[i];
        const r = this.rows[i];
        const val = s.get();
        const frac = (val - s.min) / (s.max - s.min);

        r.fillGfx.clear();
        const fillW = Math.max(4, frac * r.trackW);
        const sel = i === this.selectedIndex;
        r.fillGfx.fillStyle(sel ? 0xffcc00 : 0x3399ff, 1);
        r.fillGfx.fillRoundedRect(r.trackX, r.y - 8, fillW, 16, 4);

        r.valTxt.setText('' + val);
    }

    updateSelection() {
        for (let i = 0; i < this.rows.length; i++) {
            const sel = i === this.selectedIndex;
            this.rows[i].arrow.setVisible(sel);
            this.rows[i].labelTxt.setColor(sel ? '#ffffff' : '#aaaaaa');
            this.updateSliderVisual(i);
        }
        // Back button
        const onBack = this.selectedIndex === this.sliders.length;
        this.backArrow.setVisible(onBack);
        this.backText.setColor(onBack ? '#ffffff' : '#aaaaaa');
    }

    adjustValue(sliderIndex, direction) {
        const s = this.sliders[sliderIndex];
        let val = s.get() + direction * s.step;
        val = Phaser.Math.Clamp(val, s.min, s.max);
        // Round to step to avoid floating point drift
        val = Math.round(val / s.step) * s.step;
        s.set(val);
        this.updateSliderVisual(sliderIndex);
        saveSettings();
    }

    update(time, delta) {
        const pads = inputManager.getAllConnectedPads();
        if (pads.length === 0) return;

        for (const pad of pads) {
            const padIndex = pad.index;
            const state = this._getPadDebounce(padIndex);

            // Left-stick / D-pad
            const ly = pad.axes.length > 1 ? pad.axes[1].getValue() : 0;
            const lx = pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
            const dUp = pad.buttons[12] ? pad.buttons[12].pressed : false;
            const dDown = pad.buttons[13] ? pad.buttons[13].pressed : false;
            const dLeft = pad.buttons[14] ? pad.buttons[14].pressed : false;
            const dRight = pad.buttons[15] ? pad.buttons[15].pressed : false;

            const up = ly < -0.5 || dUp;
            const down = ly > 0.5 || dDown;
            const left = lx < -0.5 || dLeft;
            const right = lx > 0.5 || dRight;

            // Vertical navigation (edge-triggered)
            if (up && !state.prevUp) {
                this.selectedIndex = Math.max(0, this.selectedIndex - 1);
                this.updateSelection();
            }
            if (down && !state.prevDown) {
                this.selectedIndex = Math.min(this.totalRows - 1, this.selectedIndex + 1);
                this.updateSelection();
            }
            state.prevUp = up;
            state.prevDown = down;

            // Horizontal slider adjustment with hold-repeat
            if (this.selectedIndex < this.sliders.length) {
                const dir = right ? 1 : left ? -1 : 0;

                if (dir !== 0) {
                    if (dir !== state.holdDir) {
                        // Direction changed – immediate adjust + reset hold
                        this.adjustValue(this.selectedIndex, dir);
                        state.holdDir = dir;
                        state.holdTimer = 0;
                        state.holdAccum = 0;
                    } else {
                        state.holdTimer += delta;
                        if (state.holdTimer >= this._holdDelay) {
                            state.holdAccum += delta;
                            if (state.holdAccum >= this._holdRate) {
                                state.holdAccum -= this._holdRate;
                                this.adjustValue(this.selectedIndex, dir);
                            }
                        }
                    }
                } else {
                    state.holdDir = 0;
                    state.holdTimer = 0;
                    state.holdAccum = 0;
                }
            } else {
                state.holdDir = 0;
                state.holdTimer = 0;
                state.holdAccum = 0;
            }

            // A button – only acts on Back row
            const aBtn = pad.buttons[0] ? pad.buttons[0].pressed : false;
            if (aBtn && !state.prevA) {
                if (this.selectedIndex === this.sliders.length) {
                    this.scene.start('MenuScene');
                    return; // Scene transitioning, exit immediately
                }
            }
            state.prevA = aBtn;
        }
    }
}


// ============================================================
// Phaser Game Config
// ============================================================
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#1a1a2e',
    parent: document.body,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    input: {
        gamepad: true
    },
    scene: [MenuScene, TeamLobbyScene, ArenaScene, WinnerScene, SettingsScene]
};

const game = new Phaser.Game(config);
