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
        const trackX = w / 2 - 50;
        const trackW = 280;
        const labelX = w / 2 - 300;

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
