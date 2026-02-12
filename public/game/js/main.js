// ============================================================
// Phaser Game Config and Instantiation
// ============================================================

import { GameSelectionScene } from './scenes/GameSelectionScene.js';
import { TankMenuScene } from './games/tanks/TankMenuScene.js';
import { TeamLobbyScene } from './games/tanks/TeamLobbyScene.js';
import { ArenaScene } from './games/tanks/ArenaScene.js';
import { WinnerScene } from './games/tanks/WinnerScene.js';
import { TankSettingsScene } from './games/tanks/TankSettingsScene.js';
import { MazeMenuScene } from './games/maze/MazeMenuScene.js';
import { MazeScene } from './games/maze/MazeScene.js';
import { MazeWinnerScene } from './games/maze/MazeWinnerScene.js';
import { MazeSettingsScene } from './games/maze/MazeSettingsScene.js';
import { SequenceMenuScene } from './games/sequence/SequenceMenuScene.js';
import { SequenceScene } from './games/sequence/SequenceScene.js';
import { SequenceWinnerScene } from './games/sequence/SequenceWinnerScene.js';
import { SequenceSettingsScene } from './games/sequence/SequenceSettingsScene.js';
import { GoaliesMenuScene } from './games/goalies/GoaliesMenuScene.js';
import { GoaliesScene } from './games/goalies/GoaliesScene.js';
import { GoaliesWinnerScene } from './games/goalies/GoaliesWinnerScene.js';
import { GoaliesSettingsScene } from './games/goalies/GoaliesSettingsScene.js';

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
    scene: [GameSelectionScene, TankMenuScene, TeamLobbyScene, ArenaScene, WinnerScene, TankSettingsScene, MazeMenuScene, MazeScene, MazeWinnerScene, MazeSettingsScene, SequenceMenuScene, SequenceScene, SequenceWinnerScene, SequenceSettingsScene, GoaliesMenuScene, GoaliesScene, GoaliesWinnerScene, GoaliesSettingsScene]
};

const game = new Phaser.Game(config);
