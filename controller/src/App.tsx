// ============================================================
// App Component - Main Controller Application
// ============================================================

import { useEffect, useCallback } from 'react';
import { useConnection } from './hooks/useConnection';
import { useControllerState } from './hooks/useControllerState';
import { useSceneState } from './hooks/useSceneState';
import { Header } from './components/Header';
import { FullscreenPrompt } from './components/FullscreenPrompt';
import { ControllerLayout } from './components/ControllerLayout';
import './App.css';

function App() {
    const { updateAxis, updateButton, resetState, getState } = useControllerState();
    const {
        sceneState,
        handleSceneChange,
        handleBroadcastState,
        handlePlayerMessage,
        updateStatus,
        updatePlayerId,
        updatePlayerColor,
    } = useSceneState();

    const { connectionState, sendState, playerColor } = useConnection(
        handleSceneChange,
        handleBroadcastState,
        handlePlayerMessage
    );

    // Update scene state when connection state changes
    useEffect(() => {
        updateStatus(connectionState.status);
        updatePlayerId(connectionState.playerId);
        updatePlayerColor(playerColor);
    }, [connectionState.status, connectionState.playerId, playerColor, updateStatus, updatePlayerId, updatePlayerColor]);

    // Send state loop at ~60fps
    useEffect(() => {
        let animationFrameId: number;
        const sendLoop = () => {
            const state = getState();
            sendState(state);
            animationFrameId = requestAnimationFrame(sendLoop);
        };
        animationFrameId = requestAnimationFrame(sendLoop);
        return () => cancelAnimationFrame(animationFrameId);
    }, [sendState, getState]);

    // Reset state when mode changes
    useEffect(() => {
        resetState();
    }, [sceneState.currentMode, resetState]);

    const handleAxisUpdate = useCallback((axisX: number, axisY: number, valueX: number, valueY: number) => {
        updateAxis(axisX, valueX);
        updateAxis(axisY, valueY);
    }, [updateAxis]);

    const handleButtonPress = useCallback((buttonIndex: number, pressed: boolean) => {
        updateButton(buttonIndex, pressed);
    }, [updateButton]);

    return (
        <>
            <FullscreenPrompt />
            <Header
                playerColor={sceneState.playerColor}
                status={sceneState.status}
                sceneLabel={sceneState.sceneLabel}
                showMenuButton={sceneState.showMenuButton}
                onButtonPress={handleButtonPress}
            />
            <div id="controls">
                <ControllerLayout
                    sceneState={sceneState}
                    onAxisUpdate={handleAxisUpdate}
                    onButtonPress={handleButtonPress}
                />
            </div>
        </>
    );
}

export default App;
