// ============================================================
// ActionButton Component - Fire/Ready/Select Buttons
// ============================================================

import { useRef, useEffect, useState } from 'react';
import './ActionButton.css';

interface ActionButtonProps {
    buttonIndex: number;
    label: string;
    variant: 'fire' | 'ready' | 'select';
    onPress: (pressed: boolean) => void;
    active?: boolean;
}

export function ActionButton({ buttonIndex, label, variant, onPress, active = false }: ActionButtonProps) {
    const buttonRef = useRef<HTMLDivElement>(null);
    const activeTouchRef = useRef<number | null>(null);
    const [isPressed, setIsPressed] = useState(false);

    useEffect(() => {
        const button = buttonRef.current;
        if (!button) return;

        const press = () => {
            if (isPressed) return;
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
            if (activeTouchRef.current !== null) return;
            activeTouchRef.current = e.changedTouches[0].identifier;
            press();
        };

        const handleTouchEnd = (e: TouchEvent) => {
            for (const touch of e.changedTouches) {
                if (touch.identifier === activeTouchRef.current) {
                    activeTouchRef.current = null;
                    release();
                }
            }
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

        button.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            button.removeEventListener('touchstart', handleTouchStart);
            button.removeEventListener('touchend', handleTouchEnd);
            button.removeEventListener('touchcancel', handleTouchEnd);
            button.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [buttonIndex, onPress, isPressed]);

    useEffect(() => {
        const button = buttonRef.current;
        if (!button) return;
        if (active) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    }, [active]);

    return (
        <div
            ref={buttonRef}
            className={`action-btn action-btn-${variant}`}
        >
            {label}
        </div>
    );
}

