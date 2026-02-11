// ============================================================
// Phaser Game Config and Instantiation
// ============================================================

import { MenuScene } from './scenes/MenuScene.js';
import { TeamLobbyScene } from './scenes/TeamLobbyScene.js';
import { ArenaScene } from './scenes/ArenaScene.js';
import { WinnerScene } from './scenes/WinnerScene.js';
import { SettingsScene } from './scenes/SettingsScene.js';

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#1a1a2e',
    parent: document.body,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false,
            fps: 120
        }
    },
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    input: {
        gamepad: true
    },
    scene: [MenuScene, TeamLobbyScene, ArenaScene, WinnerScene, SettingsScene]
};

const game = new Phaser.Game(config);
