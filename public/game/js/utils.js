// ============================================================
// Utility Functions
// ============================================================

import { PLAYER_COLORS, PLAYER_NAMES } from './constants.js';
import { WS_PLAYER_COLORS } from '../../shared/constants.js';

export function getPlayerColor(index) {
    if (index < 100) return PLAYER_COLORS[index] || 0xffffff;
    return WS_PLAYER_COLORS[(index - 100) % WS_PLAYER_COLORS.length];
}

export function getPlayerName(index) {
    if (index < 100) return PLAYER_NAMES[index] || ('P' + index);
    return 'WS' + (index - 100);
}

export function darken(color, factor) {
    const r = ((color >> 16) & 0xff) * factor;
    const g = ((color >> 8) & 0xff) * factor;
    const b = (color & 0xff) * factor;
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
}

export function hexStr(color) {
    return '#' + color.toString(16).padStart(6, '0');
}
