// ============================================================
// TankSettingsScene – Tank Game Settings
// ============================================================

import { SCENE } from '../../../../shared/constants.js';
import { BaseSettingsScene } from '../../scenes/BaseSettingsScene.js';
import { settings, saveSettings } from '../../settings.js';

class TankSettingsScene extends BaseSettingsScene {
    constructor() {
        super({ key: SCENE.SETTINGS });
    }

    getSliders() {
        return [
            { label: 'Tank Speed',         min: 50,   max: 500,   step: 10,  get: () => settings.TANK_SPEED,         set: v => { settings.TANK_SPEED = v; } },
            { label: 'Bullet Speed',       min: 100,  max: 1000,  step: 25,  get: () => settings.BULLET_SPEED,       set: v => { settings.BULLET_SPEED = v; } },
            { label: 'Reload Time (ms)',   min: 0,    max: 3000,  step: 50,  get: () => settings.RELOAD_TIME,        set: v => { settings.RELOAD_TIME = v; } },
            { label: 'Respawn Delay (ms)', min: 500,  max: 10000, step: 250, get: () => settings.RESPAWN_DELAY,      set: v => { settings.RESPAWN_DELAY = v; } },
            { label: 'Invincibility (ms)', min: 0,    max: 5000,  step: 250, get: () => settings.INVINCIBILITY_TIME, set: v => { settings.INVINCIBILITY_TIME = v; } },
            { label: 'Wall Count',         min: 0,    max: 30,    step: 1,   get: () => settings.WALL_COUNT,         set: v => { settings.WALL_COUNT = v; } },
            { label: 'FFA Kill Target',    min: 1,    max: 50,    step: 1,   get: () => settings.FFA_KILL_TARGET,    set: v => { settings.FFA_KILL_TARGET = v; } },
            { label: 'TDM Kill Target',    min: 1,    max: 50,    step: 1,   get: () => settings.TDM_KILL_TARGET,    set: v => { settings.TDM_KILL_TARGET = v; } },
            { label: 'Zone Cap Time (ms)', min: 2000, max: 30000, step: 1000,get: () => settings.ZONE_CAPTURE_TIME,  set: v => { settings.ZONE_CAPTURE_TIME = v; } },
            { label: 'Zone Respawn (ms)',  min: 0,    max: 10000, step: 500, get: () => settings.ZONE_RESPAWN_DELAY, set: v => { settings.ZONE_RESPAWN_DELAY = v; } },
            { label: 'Zone Cap Target',   min: 1,    max: 30,    step: 1,   get: () => settings.ZONE_CAPTURE_TARGET,set: v => { settings.ZONE_CAPTURE_TARGET = v; } },
            { label: 'Zone Size',         min: 60,   max: 300,   step: 10,  get: () => settings.ZONE_SIZE,          set: v => { settings.ZONE_SIZE = v; } },
        ];
    }

    getTitle() {
        return 'TANK SETTINGS';
    }

    getBackScene() {
        return SCENE.TANK_MENU;
    }

    onSave() {
        saveSettings();
    }
}

export { TankSettingsScene };
