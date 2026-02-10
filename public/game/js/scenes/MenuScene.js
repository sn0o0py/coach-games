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

                const url = `http://${info.ip}:${info.port}/controller/`;

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
