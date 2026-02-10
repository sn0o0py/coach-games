// ============================================================
// Settings (mutable – editable via SettingsScene)
// ============================================================

let TANK_SPEED = 220;
let BULLET_SPEED = 500;
let RELOAD_TIME = 50;             // ms
let RESPAWN_DELAY = 3000;         // ms
let INVINCIBILITY_TIME = 2000;    // ms
const DEADZONE = 0;
let WALL_COUNT = 13;
let WALL_MIN = 60;
let WALL_MAX = 180;
let FFA_KILL_TARGET = 10;
let TDM_KILL_TARGET = 15;
let ZONE_CAPTURE_TIME = 10000;    // ms to capture a zone
let ZONE_RESPAWN_DELAY = 3000;    // ms before next zone spawns
let ZONE_CAPTURE_TARGET = 10;     // captures needed to win
let ZONE_SIZE = 120;              // zone diameter in pixels

// ----- Settings persistence (localStorage) -----
function saveSettings() {
    const data = {
        TANK_SPEED, BULLET_SPEED, RELOAD_TIME, RESPAWN_DELAY,
        INVINCIBILITY_TIME, WALL_COUNT, WALL_MIN, WALL_MAX,
        FFA_KILL_TARGET, TDM_KILL_TARGET,
        ZONE_CAPTURE_TIME, ZONE_RESPAWN_DELAY, ZONE_CAPTURE_TARGET, ZONE_SIZE
    };
    localStorage.setItem('tankArenaSettings', JSON.stringify(data));
}

function loadSettings() {
    try {
        const raw = localStorage.getItem('tankArenaSettings');
        if (!raw) return;
        const d = JSON.parse(raw);
        if (d.TANK_SPEED !== undefined) TANK_SPEED = d.TANK_SPEED;
        if (d.BULLET_SPEED !== undefined) BULLET_SPEED = d.BULLET_SPEED;
        if (d.RELOAD_TIME !== undefined) RELOAD_TIME = d.RELOAD_TIME;
        if (d.RESPAWN_DELAY !== undefined) RESPAWN_DELAY = d.RESPAWN_DELAY;
        if (d.INVINCIBILITY_TIME !== undefined) INVINCIBILITY_TIME = d.INVINCIBILITY_TIME;
        if (d.WALL_COUNT !== undefined) WALL_COUNT = d.WALL_COUNT;
        if (d.WALL_MIN !== undefined) WALL_MIN = d.WALL_MIN;
        if (d.WALL_MAX !== undefined) WALL_MAX = d.WALL_MAX;
        if (d.FFA_KILL_TARGET !== undefined) FFA_KILL_TARGET = d.FFA_KILL_TARGET;
        if (d.TDM_KILL_TARGET !== undefined) TDM_KILL_TARGET = d.TDM_KILL_TARGET;
        if (d.ZONE_CAPTURE_TIME !== undefined) ZONE_CAPTURE_TIME = d.ZONE_CAPTURE_TIME;
        if (d.ZONE_RESPAWN_DELAY !== undefined) ZONE_RESPAWN_DELAY = d.ZONE_RESPAWN_DELAY;
        if (d.ZONE_CAPTURE_TARGET !== undefined) ZONE_CAPTURE_TARGET = d.ZONE_CAPTURE_TARGET;
        if (d.ZONE_SIZE !== undefined) ZONE_SIZE = d.ZONE_SIZE;
    } catch (e) { /* ignore corrupt data */ }
}
loadSettings();
