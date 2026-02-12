// ============================================================
// ControllerLayout Component - Renders Appropriate Mode
// ============================================================

import { ArenaMode } from './modes/ArenaMode';
import { LobbyMode } from './modes/LobbyMode';
import { MenuMode } from './modes/MenuMode';
import { MazeMode } from './modes/MazeMode';
import { SequenceMode } from './modes/SequenceMode';
import { GoaliesMode } from './modes/GoaliesMode';
import { MODE, SCENE } from '../constants';
import type { SceneState, SequenceSceneState } from '../types';

interface ControllerLayoutProps {
    sceneState: SceneState;
    onAxisUpdate: (axisX: number, axisY: number, valueX: number, valueY: number) => void;
    onButtonPress: (buttonIndex: number, pressed: boolean) => void;
}

function isSequenceScene(state: SceneState): state is SequenceSceneState {
    return state.type === SCENE.SEQUENCE;
}

export function ControllerLayout({
    sceneState,
    onAxisUpdate,
    onButtonPress,
}: ControllerLayoutProps) {
    switch (sceneState.currentMode) {
        case MODE.ARENA:
            return <ArenaMode onAxisUpdate={onAxisUpdate} onButtonPress={onButtonPress} />;
        case MODE.LOBBY:
            return <LobbyMode onAxisUpdate={onAxisUpdate} onButtonPress={onButtonPress} />;
        case MODE.MENU:
            return <MenuMode onAxisUpdate={onAxisUpdate} onButtonPress={onButtonPress} />;
        case MODE.MAZE:
            return <MazeMode onAxisUpdate={onAxisUpdate} />;
        case MODE.SEQUENCE:
            if (isSequenceScene(sceneState)) {
                return (
                    <SequenceMode
                        onButtonPress={onButtonPress}
                        sequenceState={sceneState.sequenceState}
                        isEliminated={sceneState.isEliminated}
                    />
                );
            }
            return null;
        case MODE.GOALIES:
            return <GoaliesMode onAxisUpdate={onAxisUpdate} />;
        default:
            return <ArenaMode onAxisUpdate={onAxisUpdate} onButtonPress={onButtonPress} />;
    }
}

