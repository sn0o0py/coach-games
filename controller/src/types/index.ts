// ============================================================
// TypeScript Types
// ============================================================

import type { Mode, Status } from '../constants';
import type { SCENE } from '../constants';

// Base scene properties shared by all scenes
interface BaseSceneState {
    playerId: number | null;
    status: Status;
    playerColor: string | null;
}

// Individual scene types
export interface PausedSceneState extends BaseSceneState {
    type: 'paused';
    currentMode: Mode;
    sceneLabel: 'Paused';
    showMenuButton: true;
}

export interface ArenaSceneState extends BaseSceneState {
    type: typeof SCENE.ARENA;
    currentMode: Mode;
    sceneLabel: 'In Game';
    showMenuButton: true;
}

export interface GameSelectionSceneState extends BaseSceneState {
    type: typeof SCENE.GAME_SELECTION;
    currentMode: Mode;
    sceneLabel: 'Game Selection';
    showMenuButton: false;
}

export interface TankMenuSceneState extends BaseSceneState {
    type: typeof SCENE.TANK_MENU;
    currentMode: Mode;
    sceneLabel: 'Tank Menu';
    showMenuButton: false;
}

export interface WinnerSceneState extends BaseSceneState {
    type: typeof SCENE.WINNER;
    currentMode: Mode;
    sceneLabel: 'Results';
    showMenuButton: false;
}

export interface SettingsSceneState extends BaseSceneState {
    type: typeof SCENE.SETTINGS;
    currentMode: Mode;
    sceneLabel: 'Settings';
    showMenuButton: false;
}

export interface TeamLobbySceneState extends BaseSceneState {
    type: typeof SCENE.TEAM_LOBBY;
    currentMode: Mode;
    sceneLabel: 'Team Selection';
    showMenuButton: false;
}

export interface MazeMenuSceneState extends BaseSceneState {
    type: typeof SCENE.MAZE_MENU;
    currentMode: Mode;
    sceneLabel: 'Maze Menu';
    showMenuButton: false;
}

export interface MazeSceneState extends BaseSceneState {
    type: typeof SCENE.MAZE;
    currentMode: Mode;
    sceneLabel: 'Maze Race';
    showMenuButton: true;
}

export interface MazeWinnerSceneState extends BaseSceneState {
    type: typeof SCENE.MAZE_WINNER;
    currentMode: Mode;
    sceneLabel: 'Maze Results';
    showMenuButton: false;
}

export interface MazeSettingsSceneState extends BaseSceneState {
    type: typeof SCENE.MAZE_SETTINGS;
    currentMode: Mode;
    sceneLabel: 'Maze Settings';
    showMenuButton: false;
}

export interface SequenceMenuSceneState extends BaseSceneState {
    type: typeof SCENE.SEQUENCE_MENU;
    currentMode: Mode;
    sceneLabel: 'Sequence Menu';
    showMenuButton: false;
}

export interface SequenceSceneState extends BaseSceneState {
    type: typeof SCENE.SEQUENCE;
    currentMode: Mode;
    sceneLabel: 'Sequence Challenge';
    showMenuButton: true;
    sequenceState: 'countdown' | 'memorizing' | 'input';
    isEliminated: boolean;
}

export interface SequenceWinnerSceneState extends BaseSceneState {
    type: typeof SCENE.SEQUENCE_WINNER;
    currentMode: Mode;
    sceneLabel: 'Sequence Results';
    showMenuButton: false;
}

export interface SequenceSettingsSceneState extends BaseSceneState {
    type: typeof SCENE.SEQUENCE_SETTINGS;
    currentMode: Mode;
    sceneLabel: 'Sequence Settings';
    showMenuButton: false;
}

export interface GoaliesMenuSceneState extends BaseSceneState {
    type: typeof SCENE.GOALIES_MENU;
    currentMode: Mode;
    sceneLabel: 'Goalies Menu';
    showMenuButton: false;
}

export interface GoaliesSceneState extends BaseSceneState {
    type: typeof SCENE.GOALIES;
    currentMode: Mode;
    sceneLabel: 'Goalies';
    showMenuButton: true;
}

export interface GoaliesWinnerSceneState extends BaseSceneState {
    type: typeof SCENE.GOALIES_WINNER;
    currentMode: Mode;
    sceneLabel: 'Goalies Results';
    showMenuButton: false;
}

export interface GoaliesSettingsSceneState extends BaseSceneState {
    type: typeof SCENE.GOALIES_SETTINGS;
    currentMode: Mode;
    sceneLabel: 'Goalies Settings';
    showMenuButton: false;
}

export interface UnknownSceneState extends BaseSceneState {
    type: 'unknown';
    currentMode: Mode;
    sceneLabel: '';
    showMenuButton: false;
}

// Discriminated union of all scene types
export type SceneState =
    | PausedSceneState
    | ArenaSceneState
    | GameSelectionSceneState
    | TankMenuSceneState
    | WinnerSceneState
    | SettingsSceneState
    | TeamLobbySceneState
    | MazeMenuSceneState
    | MazeSceneState
    | MazeWinnerSceneState
    | MazeSettingsSceneState
    | SequenceMenuSceneState
    | SequenceSceneState
    | SequenceWinnerSceneState
    | SequenceSettingsSceneState
    | GoaliesMenuSceneState
    | GoaliesSceneState
    | GoaliesWinnerSceneState
    | GoaliesSettingsSceneState
    | UnknownSceneState;

export interface ControllerState {
    axes: [number, number, number, number];  // lx, ly, rx, ry
    buttons: boolean[];  // 17 buttons
}

export interface ConnectionState {
    ws: WebSocket | null;
    rtcPc: RTCPeerConnection | null;
    rtcDc: RTCDataChannel | null;
    rtcReady: boolean;
    playerId: number | null;
    status: Status;
}

