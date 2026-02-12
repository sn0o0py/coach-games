// ============================================================
// GoaliesSettingsScene – Goalies Game Settings
// ============================================================

import { SCENE } from '../../../../shared/constants.js';
import { BaseSettingsScene } from '../../scenes/BaseSettingsScene.js';
import { settings, saveGoaliesSettings } from '../../settings.js';

class GoaliesSettingsScene extends BaseSettingsScene {
    constructor() {
        super({ key: SCENE.GOALIES_SETTINGS });
    }

    getSliders() {
        return [
            { label: 'Ball Speed',         min: 200,  max: 800,   step: 50,  get: () => settings.GOALIES_BALL_SPEED,         set: v => { settings.GOALIES_BALL_SPEED = v; } },
            { label: 'Paddle Width',       min: 40,   max: 150,   step: 10,  get: () => settings.GOALIES_PADDLE_WIDTH,       set: v => { settings.GOALIES_PADDLE_WIDTH = v; } },
            { label: 'Win Target',         min: 5,    max: 20,    step: 1,   get: () => settings.GOALIES_WIN_TARGET,         set: v => { settings.GOALIES_WIN_TARGET = v; } },
            { label: 'Round Countdown',    min: 1000, max: 5000,  step: 500, get: () => settings.GOALIES_ROUND_COUNTDOWN,    set: v => { settings.GOALIES_ROUND_COUNTDOWN = v; } },
            { label: 'Paddle Speed',       min: 100,  max: 600,   step: 50,  get: () => settings.GOALIES_PADDLE_SPEED,       set: v => { settings.GOALIES_PADDLE_SPEED = v; } },
            { label: 'Ball Speedup Ratio', min: 1.0,  max: 1.1,  step: 0.01, get: () => settings.GOALIES_BALL_SPEEDUP_RATIO, set: v => { settings.GOALIES_BALL_SPEEDUP_RATIO = v; } },
        ];
    }

    getTitle() {
        return 'GOALIES SETTINGS';
    }

    getBackScene() {
        return SCENE.GOALIES_MENU;
    }

    onSave() {
        saveGoaliesSettings();
    }
}

export { GoaliesSettingsScene };

