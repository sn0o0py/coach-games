// ============================================================
// SequenceWinnerScene – Sequence Challenge Victory Screen
// ============================================================

import { SCENE } from '../../../../shared/constants.js';
import { inputManager } from '../../InputManager.js';
import { getPlayerColor, getPlayerName, hexStr } from '../../utils.js';

class SequenceWinnerScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENE.SEQUENCE_WINNER });
    }

    init(data) {
        this.winnerIndices = data.winnerIndices || [];
        this.padIndices = data.padIndices || [];
    }

    create() {
        inputManager.setPhaserGamepad(this.input.gamepad);
        inputManager.broadcastScene(SCENE.SEQUENCE_WINNER);

        const w = this.scale.width;
        const h = this.scale.height;

        // Filter out late joiners (shouldn't happen, but safety check)
        const actualWinners = this.winnerIndices.filter(idx => {
            // Late joiners would have joinedMidGame flag, but we don't have that here
            // So just use all provided winners
            return true;
        });

        const isMultiple = actualWinners.length > 1;

        // Winner announcement
        const titleText = isMultiple ? 'WINNERS!' : 'WINNER!';
        this.add.text(w / 2, h * 0.20, titleText, {
            fontFamily: 'Arial', fontSize: '72px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 8, fontStyle: 'bold'
        }).setOrigin(0.5);

        // Display winners
        const startY = h * 0.35;
        const spacing = 80;

        actualWinners.forEach((winnerIdx, index) => {
            const y = startY + index * spacing;
            const color = getPlayerColor(winnerIdx);
            const name = getPlayerName(winnerIdx);
            const colorStr = hexStr(color);

            // Winner name
            this.add.text(w / 2, y, name, {
                fontFamily: 'Arial', fontSize: '48px', color: colorStr,
                stroke: '#000000', strokeThickness: 6, fontStyle: 'bold'
            }).setOrigin(0.5);

            // Winner circle visual
            const winnerGfx = this.add.graphics();
            winnerGfx.fillStyle(color, 1);
            winnerGfx.fillCircle(w / 2, y + 40, 25);
            winnerGfx.lineStyle(4, 0x000000, 1);
            winnerGfx.strokeCircle(w / 2, y + 40, 25);
        });

        // Return info
        this.add.text(w / 2, h * 0.85, 'Returning to sequence menu in 5 seconds...  (press A to skip)', {
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
        this.scene.start(SCENE.SEQUENCE_MENU);
    }
}

export { SequenceWinnerScene };

