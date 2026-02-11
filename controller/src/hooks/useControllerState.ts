// ============================================================
// useControllerState Hook - Controller State Management
// ============================================================

import { useRef, useCallback } from 'react';
import type { ControllerState } from '../types';

export function useControllerState() {
    const stateRef = useRef<ControllerState>({
        axes: [0, 0, 0, 0],
        buttons: new Array(17).fill(false),
    });

    const updateAxis = useCallback((axisIndex: number, value: number) => {
        if (axisIndex >= 0 && axisIndex < 4) {
            stateRef.current.axes[axisIndex] = value;
        }
    }, []);

    const updateButton = useCallback((buttonIndex: number, pressed: boolean) => {
        if (buttonIndex >= 0 && buttonIndex < stateRef.current.buttons.length) {
            stateRef.current.buttons[buttonIndex] = pressed;
        }
    }, []);

    const resetState = useCallback(() => {
        stateRef.current.axes = [0, 0, 0, 0];
        stateRef.current.buttons.fill(false);
    }, []);

    const getState = useCallback((): ControllerState => {
        return { ...stateRef.current };
    }, []);

    return {
        stateRef,
        updateAxis,
        updateButton,
        resetState,
        getState,
    };
}

