// ============================================================
// useSceneState Hook - Scene and Mode State Management
// ============================================================

import { useState, useCallback } from 'react';
import { MODE, SCENE, STATUS } from '../constants';
import type { SceneState, SequenceSceneState, UnknownSceneState } from '../types';

const createBaseState = (): Pick<SceneState, 'playerId' | 'status' | 'playerColor'> => ({
    playerId: null,
    status: STATUS.CONNECTING,
    playerColor: null,
});

export function useSceneState() {
    const [sceneState, setSceneState] = useState<SceneState>({
        type: 'unknown',
        currentMode: MODE.MENU,
        sceneLabel: '',
        showMenuButton: false,
        ...createBaseState(),
    } as UnknownSceneState);

    const handleSceneChange = useCallback((sceneName: string) => {
        setSceneState(prev => {
            const base = createBaseState();
            base.playerId = prev.playerId;
            base.status = prev.status;
            base.playerColor = prev.playerColor;

            let newState: SceneState;

            if (sceneName === 'paused') {
                newState = {
                    type: 'paused',
                    currentMode: MODE.MENU,
                    sceneLabel: 'Paused',
                    showMenuButton: true,
                    ...base,
                };
            } else if (sceneName === SCENE.ARENA) {
                newState = {
                    type: SCENE.ARENA,
                    currentMode: MODE.ARENA,
                    sceneLabel: 'In Game',
                    showMenuButton: true,
                    ...base,
                };
            } else if (sceneName === SCENE.GAME_SELECTION) {
                newState = {
                    type: SCENE.GAME_SELECTION,
                    currentMode: MODE.MENU,
                    sceneLabel: 'Game Selection',
                    showMenuButton: false,
                    ...base,
                };
            } else if (sceneName === SCENE.TANK_MENU) {
                newState = {
                    type: SCENE.TANK_MENU,
                    currentMode: MODE.MENU,
                    sceneLabel: 'Tank Menu',
                    showMenuButton: false,
                    ...base,
                };
            } else if (sceneName === SCENE.WINNER) {
                newState = {
                    type: SCENE.WINNER,
                    currentMode: MODE.MENU,
                    sceneLabel: 'Results',
                    showMenuButton: false,
                    ...base,
                };
            } else if (sceneName === SCENE.SETTINGS) {
                newState = {
                    type: SCENE.SETTINGS,
                    currentMode: MODE.MENU,
                    sceneLabel: 'Settings',
                    showMenuButton: false,
                    ...base,
                };
            } else if (sceneName === SCENE.TEAM_LOBBY) {
                newState = {
                    type: SCENE.TEAM_LOBBY,
                    currentMode: MODE.LOBBY,
                    sceneLabel: 'Team Selection',
                    showMenuButton: false,
                    ...base,
                };
            } else if (sceneName === SCENE.MAZE_MENU) {
                newState = {
                    type: SCENE.MAZE_MENU,
                    currentMode: MODE.MENU,
                    sceneLabel: 'Maze Menu',
                    showMenuButton: false,
                    ...base,
                };
            } else if (sceneName === SCENE.MAZE) {
                newState = {
                    type: SCENE.MAZE,
                    currentMode: MODE.MAZE,
                    sceneLabel: 'Maze Race',
                    showMenuButton: true,
                    ...base,
                };
            } else if (sceneName === SCENE.MAZE_WINNER) {
                newState = {
                    type: SCENE.MAZE_WINNER,
                    currentMode: MODE.MENU,
                    sceneLabel: 'Maze Results',
                    showMenuButton: false,
                    ...base,
                };
            } else if (sceneName === SCENE.MAZE_SETTINGS) {
                newState = {
                    type: SCENE.MAZE_SETTINGS,
                    currentMode: MODE.MENU,
                    sceneLabel: 'Maze Settings',
                    showMenuButton: false,
                    ...base,
                };
            } else if (sceneName === SCENE.SEQUENCE_MENU) {
                newState = {
                    type: SCENE.SEQUENCE_MENU,
                    currentMode: MODE.MENU,
                    sceneLabel: 'Sequence Menu',
                    showMenuButton: false,
                    ...base,
                };
            } else if (sceneName === SCENE.SEQUENCE) {
                // Preserve eliminated state if coming from sequence mode
                const wasSequence = prev.type === SCENE.SEQUENCE;
                newState = {
                    type: SCENE.SEQUENCE,
                    currentMode: MODE.SEQUENCE,
                    sceneLabel: 'Sequence Challenge',
                    showMenuButton: true,
                    sequenceState: 'countdown',
                    isEliminated: wasSequence ? (prev as SequenceSceneState).isEliminated : false,
                    ...base,
                };
            } else if (sceneName === SCENE.SEQUENCE_WINNER) {
                newState = {
                    type: SCENE.SEQUENCE_WINNER,
                    currentMode: MODE.MENU,
                    sceneLabel: 'Sequence Results',
                    showMenuButton: false,
                    ...base,
                };
            } else if (sceneName === SCENE.SEQUENCE_SETTINGS) {
                newState = {
                    type: SCENE.SEQUENCE_SETTINGS,
                    currentMode: MODE.MENU,
                    sceneLabel: 'Sequence Settings',
                    showMenuButton: false,
                    ...base,
                };
            } else {
                newState = {
                    type: 'unknown',
                    currentMode: MODE.MENU,
                    sceneLabel: '',
                    showMenuButton: false,
                    ...base,
                };
            }

            return newState;
        });
    }, []);

    const handleBroadcastState = useCallback((state: string) => {
        setSceneState(prev => {
            if (prev.type !== SCENE.SEQUENCE) return prev;

            return {
                ...prev,
                sequenceState: state as 'countdown' | 'memorizing' | 'input',
            };
        });
    }, []);

    const handlePlayerMessage = useCallback((message: string) => {
        setSceneState(prev => {
            if (prev.type !== SCENE.SEQUENCE) return prev;

            if (message === 'eliminated') {
                return { ...prev, isEliminated: true };
            } else if (message === 'active') {
                return { ...prev, isEliminated: false };
            }
            return prev;
        });
    }, []);

    const updateStatus = useCallback((status: typeof STATUS[keyof typeof STATUS]) => {
        setSceneState(prev => ({ ...prev, status }));
    }, []);

    const updatePlayerId = useCallback((playerId: number | null) => {
        setSceneState(prev => ({ ...prev, playerId }));
    }, []);

    const updatePlayerColor = useCallback((color: string | null) => {
        setSceneState(prev => ({ ...prev, playerColor: color }));
    }, []);

    return {
        sceneState,
        handleSceneChange,
        handleBroadcastState,
        handlePlayerMessage,
        updateStatus,
        updatePlayerId,
        updatePlayerColor,
    };
}

