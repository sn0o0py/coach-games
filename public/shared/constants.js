// ============================================================
// Shared Constants – Used by both game and controller
// ============================================================

// Message types exchanged over WebSocket
const MSG = {
    ID:              'id',
    SCENE:           'scene',
    RTC_OFFER:       'rtc-offer',
    RTC_ANSWER:      'rtc-answer',
    RTC_CANDIDATE:   'rtc-candidate',
    WS_CONNECTED:    'ws_connected',
    WS_DISCONNECTED: 'ws_disconnected',
    WS_STATE:        'ws_state',
};

// Scene names
const SCENE = {
    ARENA:      'ArenaScene',
    MENU:       'MenuScene',
    TEAM_LOBBY: 'TeamLobbyScene',
    WINNER:     'WinnerScene',
    SETTINGS:   'SettingsScene',
};

// WebSocket endpoint paths
const WS_PATH = {
    CONTROLLER: '/ws/controller',
    GAME:       '/ws/game',
};

// 20 distinct colours for WebSocket players (indices 100-119)
const WS_PLAYER_COLORS = [
    0x00cccc, // teal
    0xff00ff, // magenta
    0x00ff88, // spring green
    0xff6688, // coral pink
    0x88aaff, // periwinkle
    0xffaa00, // amber
    0xaa44ff, // violet
    0x44ff44, // bright green
    0xff4488, // hot pink
    0x00aaff, // sky blue
    0xffdd44, // gold
    0x44ffcc, // aquamarine
    0xff8844, // tangerine
    0xaa88ff, // lavender
    0x88ff44, // chartreuse
    0xcc4444, // scarlet
    0x44aaff, // cornflower
    0xcc44ff, // orchid
    0xff88cc, // pink
    0x44ffaa  // mint
];

// Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MSG, SCENE, WS_PATH, WS_PLAYER_COLORS };
}
