// ============================================================
// MazeWinnerScene – Maze Victory Screen
// ============================================================

import { SCENE } from '../../../../shared/constants.js';
import { inputManager } from '../../InputManager.js';
import { getPlayerColor, getPlayerName, hexStr } from '../../utils.js';

class MazeWinnerScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENE.MAZE_WINNER });
    }

    init(data) {
        this.winnerIndex = data.winnerIndex;
        this.padIndices = data.padIndices || [];
    }

    create() {
        inputManager.setPhaserGamepad(this.input.gamepad);
        inputManager.broadcastScene(SCENE.MAZE_WINNER);

        const w = this.scale.width;
        const h = this.scale.height;
        const color = hexStr(getPlayerColor(this.winnerIndex));

        // Winner announcement
        this.add.text(w / 2, h * 0.25, getPlayerName(this.winnerIndex) + ' WINS!', {
            fontFamily: 'Arial', fontSize: '64px', color: color,
            stroke: '#000000', strokeThickness: 8, fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(w / 2, h * 0.37, 'First to Exit!', {
            fontFamily: 'Arial', fontSize: '32px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 4, fontStyle: 'bold'
        }).setOrigin(0.5);

        // Winner circle visual
        const winnerColor = getPlayerColor(this.winnerIndex);
        const winnerGfx = this.add.graphics();
        winnerGfx.fillStyle(winnerColor, 1);
        winnerGfx.fillCircle(w / 2, h * 0.50, 40);
        winnerGfx.lineStyle(4, 0x000000, 1);
        winnerGfx.strokeCircle(w / 2, h * 0.50, 40);

        // Return info
        this.add.text(w / 2, h * 0.85, 'Returning to maze menu in 5 seconds...  (press A to skip)', {
            fontFamily: 'Arial', fontSize: '18px', color: '#888888',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);

        // Auto return after 5 seconds
        this.autoTimer = this.time.delayedCall(5000, () => this.returnToMenu());

        this._returned = false;
        // Start prevA as true so holding A from maze doesn't trigger immediately
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
        this.scene.start(SCENE.MAZE_MENU);
    }
}

export { MazeWinnerScene };

