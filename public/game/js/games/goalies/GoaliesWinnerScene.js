// ============================================================
// GoaliesWinnerScene – Goalies Victory Screen
// ============================================================

import { SCENE } from '../../../../shared/constants.js';
import { inputManager } from '../../InputManager.js';
import { getPlayerColor, getPlayerName, hexStr } from '../../utils.js';

class GoaliesWinnerScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENE.GOALIES_WINNER });
    }

    init(data) {
        this.winnerIndex = data.winnerIndex;
        this.scores = data.scores || {};
        this.padIndices = data.padIndices || [];
    }

    create() {
        inputManager.setPhaserGamepad(this.input.gamepad);
        inputManager.broadcastScene(SCENE.GOALIES_WINNER);

        const w = this.scale.width;
        const h = this.scale.height;
        const color = hexStr(getPlayerColor(this.winnerIndex));

        // Winner announcement
        this.add.text(w / 2, h * 0.15, getPlayerName(this.winnerIndex) + ' WINS!', {
            fontFamily: 'Arial', fontSize: '64px', color: color,
            stroke: '#000000', strokeThickness: 8, fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(w / 2, h * 0.27, 'Goalies', {
            fontFamily: 'Arial', fontSize: '24px', color: '#aaaaaa',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);

        // Scoreboard
        this.add.text(w / 2, h * 0.40, 'SCOREBOARD', {
            fontFamily: 'Arial', fontSize: '28px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);

        // Sort players by score descending
        const sorted = [...this.padIndices].sort((a, b) => (this.scores[b] || 0) - (this.scores[a] || 0));

        for (let i = 0; i < sorted.length; i++) {
            const idx = sorted[i];
            const y = h * 0.48 + i * 32;
            const score = this.scores[idx] || 0;
            const label = getPlayerName(idx) + ':  ' + score + ' points';
            
            // Player color indicator circle
            const playerColor = getPlayerColor(idx);
            const gfx = this.add.graphics();
            gfx.fillStyle(playerColor, 1);
            gfx.fillCircle(w / 2 - 140, y, 12);
            gfx.lineStyle(2, 0x000000, 1);
            gfx.strokeCircle(w / 2 - 140, y, 12);

            this.add.text(w / 2 - 110, y, label, {
                fontFamily: 'Arial', fontSize: '20px', color: hexStr(playerColor),
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
        // Start prevA as true so holding A from game doesn't trigger immediately
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
        this.scene.start(SCENE.GOALIES_MENU);
    }
}

export { GoaliesWinnerScene };

