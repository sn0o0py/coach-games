// ============================================================
// BaseMenuScene – Base Class for Menu Scenes
// ============================================================

import { generateAllTextures } from '../textures.js';
import { inputManager } from '../InputManager.js';
import { loadControllerQR } from '../qrCode.js';

class BaseMenuScene extends Phaser.Scene {
    constructor(config) {
        super(config);
    }

    create() {
        inputManager.setPhaserGamepad(this.input.gamepad);
        inputManager.broadcastScene(this.scene.key);

        const w = this.scale.width;
        const h = this.scale.height;

        // Get title and subtitle from subclass
        const titleText = this.getTitle();
        const subtitleText = this.getSubtitle();
        const titleY = this.getTitleY();

        // Title
        this.add.text(w / 2, titleY, titleText, {
            fontFamily: 'Arial', fontSize: '72px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 8, fontStyle: 'bold'
        }).setOrigin(0.5);

        // Subtitle (if provided)
        if (subtitleText) {
            const subtitleY = titleY + 60;
            this.add.text(w / 2, subtitleY, subtitleText, {
                fontFamily: 'Arial', fontSize: '24px', color: '#aaaaaa',
                stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5);
        }

        // Get options from subclass and add Back button
        const gameOptions = this.getOptions();
        const backOption = { label: 'Back', desc: 'Return to game selection' };
        this.options = [...gameOptions, backOption];
        this.selectedIndex = 0;
        this.optionTexts = [];
        this.descTexts = [];

        // Calculate starting Y position for options
        const optionsStartY = subtitleText ? h * 0.48 : h * 0.45;

        for (let i = 0; i < this.options.length; i++) {
            const y = optionsStartY + i * 100;
            const txt = this.add.text(w / 2, y, this.options[i].label, {
                fontFamily: 'Arial', fontSize: '36px', color: '#aaaaaa',
                stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5);
            this.optionTexts.push(txt);

            const desc = this.add.text(w / 2, y + 36, this.options[i].desc, {
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

        // Create decorations (optional, can be overridden)
        if (this.createDecorations) {
            this.createDecorations();
        }

        this.updateSelection();

        // Per-pad debounce state (padIndex -> { prevUp, prevDown, prevA })
        this._padState = new Map();

        // QR code for controller URL
        loadControllerQR(this);
    }

    // Abstract methods - must be overridden by subclasses
    getTitle() {
        throw new Error('getTitle() must be implemented by subclass');
    }

    getSubtitle() {
        // Optional - can return null or empty string
        return null;
    }

    getTitleY() {
        // Default title Y position, can be overridden by subclasses
        return this.scale.height * 0.18;
    }

    getOptions() {
        throw new Error('getOptions() must be implemented by subclass');
    }

    getBackScene() {
        throw new Error('getBackScene() must be implemented by subclass');
    }

    onConfirm(index) {
        throw new Error('onConfirm(index) must be implemented by subclass');
    }

    _getPadDebounce(padIndex) {
        if (!this._padState.has(padIndex)) {
            // Initialize as true to prevent carry-over
            this._padState.set(padIndex, { prevUp: true, prevDown: true, prevA: true });
        }
        return this._padState.get(padIndex);
    }

    updateSelection() {
        for (let i = 0; i < this.optionTexts.length; i++) {
            const sel = i === this.selectedIndex;
            this.optionTexts[i].setColor(sel ? '#ffffff' : '#aaaaaa');
            this.optionTexts[i].setFontSize(sel ? '40px' : '36px');
            this.descTexts[i].setColor(sel ? '#bbbbbb' : '#777777');
        }
        const t = this.optionTexts[this.selectedIndex];
        this.arrow.setPosition(t.x - t.width / 2 - 28, t.y);
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
                this.selectedIndex = Math.min(this.options.length - 1, this.selectedIndex + 1);
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

    confirmSelection() {
        const isBackButton = this.selectedIndex === this.options.length - 1;
        
        if (isBackButton) {
            // Back button - return to game selection
            this.scene.start(this.getBackScene());
            return;
        }

        // Call subclass handler for game-specific options
        this.onConfirm(this.selectedIndex);
    }
}

export { BaseMenuScene };

