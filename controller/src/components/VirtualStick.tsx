// ============================================================
// VirtualStick Component - Touch-based Joystick
// ============================================================

import { useRef, useState, useEffect } from 'react';
import './VirtualStick.css';

interface VirtualStickProps {
    axisX: number;
    axisY: number;
    label: string;
    onUpdate: (x: number, y: number) => void;
}

export function VirtualStick({ label, onUpdate }: VirtualStickProps) {
    const knobRef = useRef<HTMLDivElement>(null);
    const baseRef = useRef<HTMLDivElement>(null);
    const activeTouchRef = useRef<number | null>(null);
    const [knobPosition, setKnobPosition] = useState({ left: 45, top: 45 });
    const [isActive, setIsActive] = useState(false);

    const baseSize = (): DOMRect => {
        if (!baseRef.current) {
            return new DOMRect(0, 0, 150, 150);
        }
        return baseRef.current.getBoundingClientRect();
    };

    const updateKnob = (cx: number, cy: number, rect: DOMRect) => {
        if (!knobRef.current) return;

        const radius = rect.width / 2;
        const knobRadius = knobRef.current.offsetWidth / 2;
        const maxDist = radius - knobRadius * 0.3;

        let dist = Math.sqrt(cx * cx + cy * cy);
        if (dist > maxDist) {
            cx = (cx / dist) * maxDist;
            cy = (cy / dist) * maxDist;
            dist = maxDist;
        }

        const x = radius - knobRadius + cx;
        const y = radius - knobRadius + cy;

        setKnobPosition({ left: x, top: y });

        const normalizedX = parseFloat((cx / maxDist).toFixed(3));
        const normalizedY = parseFloat((cy / maxDist).toFixed(3));
        onUpdate(normalizedX, normalizedY);
    };

    const resetKnob = () => {
        if (!knobRef.current) return;
        const rect = baseSize();
        const radius = rect.width / 2;
        const knobRadius = knobRef.current.offsetWidth / 2;
        setKnobPosition({ left: radius - knobRadius, top: radius - knobRadius });
        onUpdate(0, 0);
    };

    useEffect(() => {
        resetKnob();
    }, []);

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (activeTouchRef.current !== null) return;
        const touch = e.changedTouches[0];
        activeTouchRef.current = touch.identifier;
        const rect = baseSize();
        const cx = touch.clientX - rect.left - rect.width / 2;
        const cy = touch.clientY - rect.top - rect.height / 2;
        updateKnob(cx, cy, rect);
        setIsActive(true);
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        e.preventDefault();
        const touches = Array.from(e.changedTouches);
        for (const touch of touches) {
            if (touch.identifier === activeTouchRef.current) {
                const rect = baseSize();
                const cx = touch.clientX - rect.left - rect.width / 2;
                const cy = touch.clientY - rect.top - rect.height / 2;
                updateKnob(cx, cy, rect);
            }
        }
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
        const touches = Array.from(e.changedTouches);
        for (const touch of touches) {
            if (touch.identifier === activeTouchRef.current) {
                activeTouchRef.current = null;
                resetKnob();
                setIsActive(false);
            }
        }
    };

    const handleTouchCancel = (e: React.TouchEvent<HTMLDivElement>) => {
        const touches = Array.from(e.changedTouches);
        for (const touch of touches) {
            if (touch.identifier === activeTouchRef.current) {
                activeTouchRef.current = null;
                resetKnob();
                setIsActive(false);
            }
        }
    };

    return (
        <div
            className="stick-container"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
        >
            <div className="stick-base" ref={baseRef}></div>
            <div
                className="stick-knob"
                ref={knobRef}
                style={{
                    left: `${knobPosition.left}px`,
                    top: `${knobPosition.top}px`,
                    background: isActive ? 'rgba(100,180,255,0.85)' : 'rgba(100,160,255,0.6)',
                }}
            ></div>
            <div className="stick-label">{label}</div>
        </div>
    );
}

