// ============================================================
// SequenceMenuScene – Sequence Challenge Game Menu
// ============================================================

import { SCENE } from '../../../../shared/constants.js';
import { generateAllTextures } from '../../textures.js';
import { BaseMenuScene } from '../../scenes/BaseMenuScene.js';
import { inputManager } from '../../InputManager.js';

class SequenceMenuScene extends BaseMenuScene {
    constructor() {
        super({ key: SCENE.SEQUENCE_MENU });
    }

    preload() {
        generateAllTextures(this);
    }

    getTitle() {
        return 'SEQUENCE CHALLENGE';
    }

    getSubtitle() {
        return 'Memorize and repeat the pattern!';
    }

    getTitleY() {
        return this.scale.height * 0.25;
    }

    getOptions() {
        return [
            { label: 'Sequence', desc: 'Start the challenge' },
            { label: 'Settings', desc: 'Adjust game variables' }
        ];
    }

    getBackScene() {
        return SCENE.GAME_SELECTION;
    }

    onConfirm(index) {
        if (index === 1) {
            // Settings – no controller requirement
            this.scene.start(SCENE.SEQUENCE_SETTINGS);
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

        this.scene.start(SCENE.SEQUENCE, { padIndices });
    }
}

export { SequenceMenuScene };

