// ============================================================
// TankMenuScene – Tank Game Mode Selection
// ============================================================

import { SCENE } from '../../../../shared/constants.js';
import { generateAllTextures } from '../../textures.js';
import { BaseMenuScene } from '../../scenes/BaseMenuScene.js';
import { FFA_KILL_TARGET, TDM_KILL_TARGET, ZONE_CAPTURE_TARGET } from '../../settings.js';
import { inputManager } from '../../InputManager.js';

class TankMenuScene extends BaseMenuScene {
    constructor() {
        super({ key: SCENE.TANK_MENU });
    }

    preload() {
        generateAllTextures(this);
    }

    getTitle() {
        return 'TANK ARENA';
    }

    getSubtitle() {
        return 'Select Game Mode';
    }

    getTitleY() {
        return this.scale.height * 0.18;
    }

    getOptions() {
        return [
            { label: 'Free For All', desc: 'First to ' + FFA_KILL_TARGET + ' kills wins' },
            { label: 'Team Deathmatch', desc: 'First team to ' + TDM_KILL_TARGET + ' kills wins' },
            { label: 'Zone Capture', desc: 'First team to ' + ZONE_CAPTURE_TARGET + ' captures wins' },
            { label: 'Settings', desc: 'Adjust game variables' }
        ];
    }

    getBackScene() {
        return SCENE.GAME_SELECTION;
    }

    createDecorations() {
        const w = this.scale.width;
        const h = this.scale.height;
        // Decorative tank sprites at bottom
        for (let i = 0; i < 4; i++) {
            this.add.sprite(w * 0.2 + i * w * 0.2, h * 0.93, 'tank_body_' + i)
                .setAlpha(0.25).setScale(1.2);
        }
    }

    onConfirm(index) {
        if (index === 3) {
            // Settings – no controller requirement
            this.scene.start(SCENE.SETTINGS);
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

        if (index === 0) {
            // Free For All – go straight to arena
            this.scene.start(SCENE.ARENA, { mode: 'ffa', padIndices, teams: {} });
        } else if (index === 1) {
            // Team Deathmatch – go to team lobby
            this.scene.start(SCENE.TEAM_LOBBY, { padIndices, nextMode: 'tdm' });
        } else if (index === 2) {
            // Zone Capture – go to team lobby
            this.scene.start(SCENE.TEAM_LOBBY, { padIndices, nextMode: 'zone' });
        }
    }
}

export { TankMenuScene };
