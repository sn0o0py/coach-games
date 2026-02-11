// ============================================================
// Settings (mutable – editable via SettingsScene)
// ============================================================

export const settings = {
    TANK_SPEED: 220,
    BULLET_SPEED: 500,
    RELOAD_TIME: 50,             // ms
    RESPAWN_DELAY: 3000,         // ms
    INVINCIBILITY_TIME: 2000,    // ms
    DEADZONE: 0,
    WALL_COUNT: 13,
    WALL_MIN: 60,
    WALL_MAX: 180,
    FFA_KILL_TARGET: 10,
    TDM_KILL_TARGET: 15,
    ZONE_CAPTURE_TIME: 10000,    // ms to capture a zone
    ZONE_RESPAWN_DELAY: 3000,    // ms before next zone spawns
    ZONE_CAPTURE_TARGET: 10,     // captures needed to win
    ZONE_SIZE: 120,              // zone diameter in pixels
    MAZE_SIZE: 1000,             // maze width/height in pixels (square)
    MAZE_PLAYER_SPEED: 200,      // player movement speed in maze
    SEQUENCE_DISPLAY_TIME: 10000, // time to show sequence (ms)
    SEQUENCE_INPUT_TIME: 10000,  // time limit for players to input sequence (ms)
    SEQUENCE_INITIAL_LENGTH: 4,   // starting sequence length
    SEQUENCE_COUNTDOWN_TIME: 3000, // countdown duration before showing sequence (ms)
    SEQUENCE_COLORS: [0x00ff00, 0xff0000, 0x0088ff, 0xffff00] // Green, Red, Blue, Yellow (A, B, X, Y)
};

// Re-export for convenient destructuring
export const {
    TANK_SPEED,
    BULLET_SPEED,
    RELOAD_TIME,
    RESPAWN_DELAY,
    INVINCIBILITY_TIME,
    DEADZONE,
    WALL_COUNT,
    WALL_MIN,
    WALL_MAX,
    FFA_KILL_TARGET,
    TDM_KILL_TARGET,
    ZONE_CAPTURE_TIME,
    ZONE_RESPAWN_DELAY,
    ZONE_CAPTURE_TARGET,
    ZONE_SIZE,
    MAZE_SIZE,
    MAZE_PLAYER_SPEED,
    SEQUENCE_DISPLAY_TIME,
    SEQUENCE_INPUT_TIME,
    SEQUENCE_INITIAL_LENGTH,
    SEQUENCE_COUNTDOWN_TIME,
    SEQUENCE_COLORS
} = settings;

// ----- Settings persistence (localStorage) -----
export function saveSettings() {
    const data = {
        TANK_SPEED: settings.TANK_SPEED,
        BULLET_SPEED: settings.BULLET_SPEED,
        RELOAD_TIME: settings.RELOAD_TIME,
        RESPAWN_DELAY: settings.RESPAWN_DELAY,
        INVINCIBILITY_TIME: settings.INVINCIBILITY_TIME,
        WALL_COUNT: settings.WALL_COUNT,
        WALL_MIN: settings.WALL_MIN,
        WALL_MAX: settings.WALL_MAX,
        FFA_KILL_TARGET: settings.FFA_KILL_TARGET,
        TDM_KILL_TARGET: settings.TDM_KILL_TARGET,
        ZONE_CAPTURE_TIME: settings.ZONE_CAPTURE_TIME,
        ZONE_RESPAWN_DELAY: settings.ZONE_RESPAWN_DELAY,
        ZONE_CAPTURE_TARGET: settings.ZONE_CAPTURE_TARGET,
        ZONE_SIZE: settings.ZONE_SIZE
    };
    localStorage.setItem('tankArenaSettings', JSON.stringify(data));
}

export function saveMazeSettings() {
    const data = {
        MAZE_SIZE: settings.MAZE_SIZE,
        MAZE_PLAYER_SPEED: settings.MAZE_PLAYER_SPEED
    };
    localStorage.setItem('mazeSettings', JSON.stringify(data));
}

export function loadMazeSettings() {
    try {
        const raw = localStorage.getItem('mazeSettings');
        if (!raw) return;
        const d = JSON.parse(raw);
        if (d.MAZE_SIZE !== undefined) settings.MAZE_SIZE = d.MAZE_SIZE;
        if (d.MAZE_PLAYER_SPEED !== undefined) settings.MAZE_PLAYER_SPEED = d.MAZE_PLAYER_SPEED;
    } catch (e) { /* ignore corrupt data */ }
}

export function saveSequenceSettings() {
    const data = {
        SEQUENCE_DISPLAY_TIME: settings.SEQUENCE_DISPLAY_TIME,
        SEQUENCE_INPUT_TIME: settings.SEQUENCE_INPUT_TIME,
        SEQUENCE_INITIAL_LENGTH: settings.SEQUENCE_INITIAL_LENGTH,
        SEQUENCE_COUNTDOWN_TIME: settings.SEQUENCE_COUNTDOWN_TIME
    };
    localStorage.setItem('sequenceSettings', JSON.stringify(data));
}

export function loadSequenceSettings() {
    try {
        const raw = localStorage.getItem('sequenceSettings');
        if (!raw) return;
        const d = JSON.parse(raw);
        if (d.SEQUENCE_DISPLAY_TIME !== undefined) settings.SEQUENCE_DISPLAY_TIME = d.SEQUENCE_DISPLAY_TIME;
        if (d.SEQUENCE_INPUT_TIME !== undefined) settings.SEQUENCE_INPUT_TIME = d.SEQUENCE_INPUT_TIME;
        if (d.SEQUENCE_INITIAL_LENGTH !== undefined) settings.SEQUENCE_INITIAL_LENGTH = d.SEQUENCE_INITIAL_LENGTH;
        if (d.SEQUENCE_COUNTDOWN_TIME !== undefined) settings.SEQUENCE_COUNTDOWN_TIME = d.SEQUENCE_COUNTDOWN_TIME;
    } catch (e) { /* ignore corrupt data */ }
}

export function loadSettings() {
    try {
        const raw = localStorage.getItem('tankArenaSettings');
        if (!raw) return;
        const d = JSON.parse(raw);
        if (d.TANK_SPEED !== undefined) settings.TANK_SPEED = d.TANK_SPEED;
        if (d.BULLET_SPEED !== undefined) settings.BULLET_SPEED = d.BULLET_SPEED;
        if (d.RELOAD_TIME !== undefined) settings.RELOAD_TIME = d.RELOAD_TIME;
        if (d.RESPAWN_DELAY !== undefined) settings.RESPAWN_DELAY = d.RESPAWN_DELAY;
        if (d.INVINCIBILITY_TIME !== undefined) settings.INVINCIBILITY_TIME = d.INVINCIBILITY_TIME;
        if (d.WALL_COUNT !== undefined) settings.WALL_COUNT = d.WALL_COUNT;
        if (d.WALL_MIN !== undefined) settings.WALL_MIN = d.WALL_MIN;
        if (d.WALL_MAX !== undefined) settings.WALL_MAX = d.WALL_MAX;
        if (d.FFA_KILL_TARGET !== undefined) settings.FFA_KILL_TARGET = d.FFA_KILL_TARGET;
        if (d.TDM_KILL_TARGET !== undefined) settings.TDM_KILL_TARGET = d.TDM_KILL_TARGET;
        if (d.ZONE_CAPTURE_TIME !== undefined) settings.ZONE_CAPTURE_TIME = d.ZONE_CAPTURE_TIME;
        if (d.ZONE_RESPAWN_DELAY !== undefined) settings.ZONE_RESPAWN_DELAY = d.ZONE_RESPAWN_DELAY;
        if (d.ZONE_CAPTURE_TARGET !== undefined) settings.ZONE_CAPTURE_TARGET = d.ZONE_CAPTURE_TARGET;
        if (d.ZONE_SIZE !== undefined) settings.ZONE_SIZE = d.ZONE_SIZE;
    } catch (e) { /* ignore corrupt data */ }
}
loadSettings();
loadMazeSettings();
loadSequenceSettings();
