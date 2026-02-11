// ============================================================
// SequenceButton Component - Colored Button for Sequence Game
// ============================================================

import { useState } from 'react';
import './SequenceButton.css';

interface SequenceButtonProps {
    buttonIndex: number;
    color: 'green' | 'blue' | 'yellow' | 'red';
    label: string;
    disabled: boolean;
    onPress: (pressed: boolean) => void;
}

export function SequenceButton({ color, label, disabled, onPress }: SequenceButtonProps) {
    const [isPressed, setIsPressed] = useState(false);

    const handlePress = () => {
        if (isPressed || disabled) return;
        setIsPressed(true);
        onPress(true);
    };

    const handleRelease = () => {
        if (!isPressed) return;
        setIsPressed(false);
        onPress(false);
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (disabled) return;
        handlePress();
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
        e.preventDefault();
        handleRelease();
    };

    const handleTouchCancel = (e: React.TouchEvent<HTMLButtonElement>) => {
        e.preventDefault();
        handleRelease();
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (disabled) return;
        handlePress();
    };

    const handleMouseUp = () => {
        handleRelease();
    };

    const handleMouseLeave = () => {
        handleRelease();
    };

    return (
        <button
            className={`color-btn color-btn-${color} ${disabled ? 'disabled' : ''} ${isPressed ? 'pressed' : ''}`}
            disabled={disabled}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
        >
            {label}
        </button>
    );
}

