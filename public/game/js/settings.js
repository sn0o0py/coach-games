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
    SEQUENCE_COLORS: [0x00ff00, 0xff0000, 0x0088ff, 0xffff00], // Green, Red, Blue, Yellow (A, B, X, Y)
    GOALIES_BALL_SPEED: 400,      // ball speed in pixels/second
    GOALIES_PADDLE_WIDTH: 80,     // paddle width in pixels
    GOALIES_WIN_TARGET: 10,       // points needed to win
    GOALIES_ROUND_COUNTDOWN: 2000, // countdown time between rounds (ms)
    GOALIES_PADDLE_SPEED: 300,      // paddle movement speed in pixels/second
    GOALIES_BALL_SPEEDUP_RATIO: 1.02 // ball speed multiplier per paddle hit
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
    SEQUENCE_COLORS,
    GOALIES_BALL_SPEED,
    GOALIES_PADDLE_WIDTH,
    GOALIES_WIN_TARGET,
    GOALIES_ROUND_COUNTDOWN,
    GOALIES_PADDLE_SPEED,
    GOALIES_BALL_SPEEDUP_RATIO
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

export function saveGoaliesSettings() {
    const data = {
        GOALIES_BALL_SPEED: settings.GOALIES_BALL_SPEED,
        GOALIES_PADDLE_WIDTH: settings.GOALIES_PADDLE_WIDTH,
        GOALIES_WIN_TARGET: settings.GOALIES_WIN_TARGET,
        GOALIES_ROUND_COUNTDOWN: settings.GOALIES_ROUND_COUNTDOWN,
        GOALIES_PADDLE_SPEED: settings.GOALIES_PADDLE_SPEED,
        GOALIES_BALL_SPEEDUP_RATIO: settings.GOALIES_BALL_SPEEDUP_RATIO
    };
    localStorage.setItem('goaliesSettings', JSON.stringify(data));
}

export function loadGoaliesSettings() {
    try {
        const raw = localStorage.getItem('goaliesSettings');
        if (!raw) return;
        const d = JSON.parse(raw);
        if (d.GOALIES_BALL_SPEED !== undefined) settings.GOALIES_BALL_SPEED = d.GOALIES_BALL_SPEED;
        if (d.GOALIES_PADDLE_WIDTH !== undefined) settings.GOALIES_PADDLE_WIDTH = d.GOALIES_PADDLE_WIDTH;
        if (d.GOALIES_WIN_TARGET !== undefined) settings.GOALIES_WIN_TARGET = d.GOALIES_WIN_TARGET;
        if (d.GOALIES_ROUND_COUNTDOWN !== undefined) settings.GOALIES_ROUND_COUNTDOWN = d.GOALIES_ROUND_COUNTDOWN;
        if (d.GOALIES_PADDLE_SPEED !== undefined) settings.GOALIES_PADDLE_SPEED = d.GOALIES_PADDLE_SPEED;
        if (d.GOALIES_BALL_SPEEDUP_RATIO !== undefined) settings.GOALIES_BALL_SPEEDUP_RATIO = d.GOALIES_BALL_SPEEDUP_RATIO;
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
loadGoaliesSettings();
