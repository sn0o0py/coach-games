// ============================================================
// SequenceButton Component - Colored Button for Sequence Game
// ============================================================

import { useRef, useEffect, useState } from 'react';
import './SequenceButton.css';

interface SequenceButtonProps {
    buttonIndex: number;
    color: 'green' | 'blue' | 'yellow' | 'red';
    label: string;
    disabled: boolean;
    onPress: (pressed: boolean) => void;
}

export function SequenceButton({ buttonIndex, color, label, disabled, onPress }: SequenceButtonProps) {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [isPressed, setIsPressed] = useState(false);

    useEffect(() => {
        const button = buttonRef.current;
        if (!button) return;

        const press = () => {
            if (isPressed || disabled) return;
            setIsPressed(true);
            onPress(true);
            button.classList.add('pressed');
        };

        const release = () => {
            if (!isPressed) return;
            setIsPressed(false);
            onPress(false);
            button.classList.remove('pressed');
        };

        const handleTouchStart = (e: TouchEvent) => {
            e.preventDefault();
            if (disabled) return;
            press();
        };

        const handleTouchEnd = (e: TouchEvent) => {
            e.preventDefault();
            release();
        };

        button.addEventListener('touchstart', handleTouchStart, { passive: false });
        button.addEventListener('touchend', handleTouchEnd, { passive: false });
        button.addEventListener('touchcancel', handleTouchEnd, { passive: false });

        // Mouse fallback
        const handleMouseDown = (e: MouseEvent) => {
            e.preventDefault();
            press();
        };

        const handleMouseUp = () => {
            release();
        };

        const handleMouseLeave = () => {
            release();
        };

        button.addEventListener('mousedown', handleMouseDown);
        button.addEventListener('mouseup', handleMouseUp);
        button.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            button.removeEventListener('touchstart', handleTouchStart);
            button.removeEventListener('touchend', handleTouchEnd);
            button.removeEventListener('touchcancel', handleTouchEnd);
            button.removeEventListener('mousedown', handleMouseDown);
            button.removeEventListener('mouseup', handleMouseUp);
            button.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [buttonIndex, onPress, disabled, isPressed]);

    return (
        <button
            ref={buttonRef}
            className={`color-btn color-btn-${color} ${disabled ? 'disabled' : ''}`}
            disabled={disabled}
        >
            {label}
        </button>
    );
}

