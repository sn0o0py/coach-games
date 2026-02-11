// ============================================================
// MazeSettingsScene – Maze Game Settings
// ============================================================

import { SCENE } from '../../../../shared/constants.js';
import { BaseSettingsScene } from '../../scenes/BaseSettingsScene.js';
import { settings, saveMazeSettings } from '../../settings.js';

class MazeSettingsScene extends BaseSettingsScene {
    constructor() {
        super({ key: SCENE.MAZE_SETTINGS });
    }

    getSliders() {
        return [
            { label: 'Maze Size',         min: 400,  max: 2000,  step: 50,  get: () => settings.MAZE_SIZE,         set: v => { settings.MAZE_SIZE = v; } },
            { label: 'Player Speed',      min: 50,   max: 500,   step: 10,  get: () => settings.MAZE_PLAYER_SPEED,  set: v => { settings.MAZE_PLAYER_SPEED = v; } },
        ];
    }

    getTitle() {
        return 'MAZE SETTINGS';
    }

    getBackScene() {
        return SCENE.MAZE_MENU;
    }

    onSave() {
        saveMazeSettings();
    }
}

export { MazeSettingsScene };

