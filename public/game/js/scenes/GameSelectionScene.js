// ============================================================
// GameSelectionScene – Top-Level Game Selection
// ============================================================

import { SCENE } from '../../../shared/constants.js';
import { generateAllTextures } from '../textures.js';
import { inputManager } from '../InputManager.js';
import { loadControllerQR } from '../qrCode.js';

class GameSelectionScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENE.GAME_SELECTION });
    }

    preload() {
        generateAllTextures(this);
    }

    create() {
        inputManager.setPhaserGamepad(this.input.gamepad);
        inputManager.broadcastScene(SCENE.GAME_SELECTION);

        const w = this.scale.width;
        const h = this.scale.height;

        // Title
        this.add.text(w / 2, h * 0.25, 'SELECT GAME', {
            fontFamily: 'Arial', fontSize: '72px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 8, fontStyle: 'bold'
        }).setOrigin(0.5);

        // Game options
        this.games = [
            { label: 'Tanks', desc: 'Tank arena battles' },
            { label: 'Maze', desc: 'Race to the exit' },
            { label: 'Sequence Challenge', desc: 'Memorize and repeat the pattern' },
            { label: 'Goalies', desc: 'Defend your goal from the ball' }
        ];
        this.selectedIndex = 0;
        this.gameTexts = [];
        this.descTexts = [];

        for (let i = 0; i < this.games.length; i++) {
            const y = h * 0.45 + i * 120;
            const txt = this.add.text(w / 2, y, this.games[i].label, {
                fontFamily: 'Arial', fontSize: '48px', color: '#aaaaaa',
                stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5);
            this.gameTexts.push(txt);

            const desc = this.add.text(w / 2, y + 48, this.games[i].desc, {
                fontFamily: 'Arial', fontSize: '20px', color: '#777777',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5);
            this.descTexts.push(desc);
        }

        // Selector arrow
        this.arrow = this.add.text(0, 0, '\u25B6', {
            fontFamily: 'Arial', fontSize: '36px', color: '#ffcc00',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);

        // Connect message
        this.connectMsg = this.add.text(w / 2, h * 0.85, 'Connect a controller to start', {
            fontFamily: 'Arial', fontSize: '22px', color: '#666666'
        }).setOrigin(0.5);

        this.updateSelection();

        // Per-pad debounce state (padIndex -> { prevUp, prevDown, prevA })
        this._padState = new Map();

        // QR code for controller URL
        loadControllerQR(this);
    }

    _getPadDebounce(padIndex) {
        if (!this._padState.has(padIndex)) {
            // Initialize as true to prevent carry-over
            this._padState.set(padIndex, { prevUp: true, prevDown: true, prevA: true });
        }
        return this._padState.get(padIndex);
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
                this.selectedIndex = Math.min(this.games.length - 1, this.selectedIndex + 1);
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
        for (let i = 0; i < this.gameTexts.length; i++) {
            const sel = i === this.selectedIndex;
            this.gameTexts[i].setColor(sel ? '#ffffff' : '#aaaaaa');
            this.gameTexts[i].setFontSize(sel ? '52px' : '48px');
            this.descTexts[i].setColor(sel ? '#bbbbbb' : '#777777');
        }
        const t = this.gameTexts[this.selectedIndex];
        this.arrow.setPosition(t.x - t.width / 2 - 32, t.y);
    }

    confirmSelection() {
        if (this.selectedIndex === 0) {
            // Tanks
            this.scene.start(SCENE.TANK_MENU);
        } else if (this.selectedIndex === 1) {
            // Maze
            this.scene.start(SCENE.MAZE_MENU);
        } else if (this.selectedIndex === 2) {
            // Sequence Challenge
            this.scene.start(SCENE.SEQUENCE_MENU);
        } else if (this.selectedIndex === 3) {
            // Goalies
            this.scene.start(SCENE.GOALIES_MENU);
        }
    }
}

export { GameSelectionScene };

