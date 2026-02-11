// ============================================================
// Controller Entry Point
// ============================================================

import { initFullscreen } from './fullscreen.js';
import { initConnection } from './connection.js';
import { initSticks } from './sticks.js';
import { initButtons } from './buttons.js';

// Initialize all modules
initFullscreen();
initConnection();
initSticks();
initButtons();
