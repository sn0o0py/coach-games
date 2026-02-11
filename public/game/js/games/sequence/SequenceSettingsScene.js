// ============================================================
// SequenceSettingsScene – Sequence Challenge Settings
// ============================================================

import { SCENE } from '../../../../shared/constants.js';
import { BaseSettingsScene } from '../../scenes/BaseSettingsScene.js';
import { settings, saveSequenceSettings } from '../../settings.js';

class SequenceSettingsScene extends BaseSettingsScene {
    constructor() {
        super({ key: SCENE.SEQUENCE_SETTINGS });
    }

    getSliders() {
        return [
            { label: 'Display Time (ms)',    min: 1000, max: 20000, step: 500,  get: () => settings.SEQUENCE_DISPLAY_TIME,    set: v => { settings.SEQUENCE_DISPLAY_TIME = v; } },
            { label: 'Input Time (ms)',      min: 1000, max: 30000, step: 500,  get: () => settings.SEQUENCE_INPUT_TIME,      set: v => { settings.SEQUENCE_INPUT_TIME = v; } },
            { label: 'Initial Length',       min: 1,    max: 10,   step: 1,    get: () => settings.SEQUENCE_INITIAL_LENGTH, set: v => { settings.SEQUENCE_INITIAL_LENGTH = v; } },
            { label: 'Countdown Time (ms)',   min: 0,    max: 5000, step: 500,  get: () => settings.SEQUENCE_COUNTDOWN_TIME, set: v => { settings.SEQUENCE_COUNTDOWN_TIME = v; } },
        ];
    }

    getTitle() {
        return 'SEQUENCE SETTINGS';
    }

    getBackScene() {
        return SCENE.SEQUENCE_MENU;
    }

    onSave() {
        saveSequenceSettings();
    }
}

export { SequenceSettingsScene };

