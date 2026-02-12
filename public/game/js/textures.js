// ============================================================
// Texture Generation
// ============================================================

import { getPlayerColor, darken } from './utils.js';
import { TEAM_COLORS } from './constants.js';

// Helper: generate body / turret / bullet textures for a single player index
function _genPlayerTextures(g, playerIndex) {
    const color = getPlayerColor(playerIndex);

    // Body
    g.clear();
    g.fillStyle(color, 1);
    g.fillRoundedRect(0, 0, 48, 36, 6);
    g.fillStyle(darken(color, 0.5), 1);
    g.fillRect(2, 0, 44, 5);
    g.fillRect(2, 31, 44, 5);
    g.generateTexture('tank_body_' + playerIndex, 48, 36);

    // Turret
    g.clear();
    g.fillStyle(darken(color, 0.7), 1);
    g.fillRoundedRect(0, 0, 30, 8, 2);
    g.fillStyle(0x333333, 1);
    g.fillRect(26, 1, 4, 6);
    g.generateTexture('tank_turret_' + playerIndex, 30, 8);

    // Bullet
    g.clear();
    g.fillStyle(color, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('bullet_' + playerIndex, 8, 8);

    // Team-coloured body variants (team center, player-coloured wheels)
    for (const team of ['A', 'B']) {
        const tc = TEAM_COLORS[team];
        g.clear();
        g.fillStyle(tc, 1);
        g.fillRoundedRect(0, 0, 48, 36, 6);
        g.fillStyle(color, 1);
        g.fillRect(2, 0, 44, 5);
        g.fillRect(2, 31, 44, 5);
        g.generateTexture('tank_body_team_' + team + '_' + playerIndex, 48, 36);
    }
}

// Generate all textures once (shared across scenes via texture manager)
export function generateAllTextures(scene) {
    if (scene.textures.exists('tank_body_0')) return;

    const g = scene.make.graphics({ add: false });

    // Gamepad players 0-3
    for (let i = 0; i < 4; i++) {
        _genPlayerTextures(g, i);
    }

    // WebSocket players 100-119
    for (let i = 0; i < 20; i++) {
        _genPlayerTextures(g, 100 + i);
    }

    // Wall tile
    g.clear();
    g.fillStyle(0x666666, 1);
    g.fillRect(0, 0, 16, 16);
    g.lineStyle(1, 0x555555, 1);
    g.strokeRect(0, 0, 16, 16);
    g.generateTexture('wall_tile', 16, 16);

    // Team turrets and bullets (shared per team, not per player)
    for (const team of ['A', 'B']) {
        const color = TEAM_COLORS[team];

        g.clear();
        g.fillStyle(darken(color, 0.7), 1);
        g.fillRoundedRect(0, 0, 30, 8, 2);
        g.fillStyle(0x333333, 1);
        g.fillRect(26, 1, 4, 6);
        g.generateTexture('tank_turret_team_' + team, 30, 8);

        g.clear();
        g.fillStyle(color, 1);
        g.fillCircle(4, 4, 4);
        g.generateTexture('bullet_team_' + team, 8, 8);
    }

    // Explosion particle
    g.clear();
    g.fillStyle(0xff8800, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('particle_orange', 8, 8);

    // Goalies game textures
    // Paddles for each player
    for (let i = 0; i < 4; i++) {
        const color = getPlayerColor(i);
        g.clear();
        g.fillStyle(color, 1);
        g.fillRoundedRect(0, 0, 80, 20, 4);
        g.fillStyle(darken(color, 0.3), 1);
        g.fillRect(0, 0, 80, 4);
        g.generateTexture('paddle_' + i, 80, 20);
    }
    for (let i = 0; i < 20; i++) {
        const color = getPlayerColor(100 + i);
        g.clear();
        g.fillStyle(color, 1);
        g.fillRoundedRect(0, 0, 80, 20, 4);
        g.fillStyle(darken(color, 0.3), 1);
        g.fillRect(0, 0, 80, 4);
        g.generateTexture('paddle_' + (100 + i), 80, 20);
    }

    // Ball
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(12, 12, 12);
    g.lineStyle(2, 0x000000, 1);
    g.strokeCircle(12, 12, 12);
    g.generateTexture('ball', 24, 24);

    g.destroy();
}
