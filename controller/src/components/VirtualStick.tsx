// ============================================================
// VirtualStick Component - Touch-based Joystick
// ============================================================

import { useRef, useEffect } from 'react';
import './VirtualStick.css';

interface VirtualStickProps {
    axisX: number;
    axisY: number;
    label: string;
    onUpdate: (x: number, y: number) => void;
}

export function VirtualStick({ label, onUpdate }: VirtualStickProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const knobRef = useRef<HTMLDivElement>(null);
    const activeTouchRef = useRef<number | null>(null);

    const baseSize = (): DOMRect => {
        if (!containerRef.current) {
            return new DOMRect(0, 0, 150, 150);
        }
        const base = containerRef.current.querySelector('.stick-base') as HTMLElement;
        return base.getBoundingClientRect();
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

        knobRef.current.style.left = `${x}px`;
        knobRef.current.style.top = `${y}px`;

        const normalizedX = parseFloat((cx / maxDist).toFixed(3));
        const normalizedY = parseFloat((cy / maxDist).toFixed(3));
        onUpdate(normalizedX, normalizedY);
    };

    const resetKnob = () => {
        if (!knobRef.current || !containerRef.current) return;
        const rect = baseSize();
        const radius = rect.width / 2;
        const knobRadius = knobRef.current.offsetWidth / 2;
        knobRef.current.style.left = `${radius - knobRadius}px`;
        knobRef.current.style.top = `${radius - knobRadius}px`;
        onUpdate(0, 0);
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleTouchStart = (e: TouchEvent) => {
            e.preventDefault();
            if (activeTouchRef.current !== null) return;
            const touch = e.changedTouches[0];
            activeTouchRef.current = touch.identifier;
            const rect = baseSize();
            const cx = touch.clientX - rect.left - rect.width / 2;
            const cy = touch.clientY - rect.top - rect.height / 2;
            updateKnob(cx, cy, rect);
            if (knobRef.current) {
                knobRef.current.style.background = 'rgba(100,180,255,0.85)';
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            e.preventDefault();
            for (const touch of e.changedTouches) {
                if (touch.identifier === activeTouchRef.current) {
                    const rect = baseSize();
                    const cx = touch.clientX - rect.left - rect.width / 2;
                    const cy = touch.clientY - rect.top - rect.height / 2;
                    updateKnob(cx, cy, rect);
                }
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            for (const touch of e.changedTouches) {
                if (touch.identifier === activeTouchRef.current) {
                    activeTouchRef.current = null;
                    resetKnob();
                    if (knobRef.current) {
                        knobRef.current.style.background = 'rgba(100,160,255,0.6)';
                    }
                }
            }
        };

        container.addEventListener('touchstart', handleTouchStart, { passive: false });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd, { passive: false });
        container.addEventListener('touchcancel', handleTouchEnd, { passive: false });

        resetKnob();

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
            container.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [onUpdate]);

    return (
        <div className="stick-container" ref={containerRef}>
            <div className="stick-base"></div>
            <div className="stick-knob" ref={knobRef}></div>
            <div className="stick-label">{label}</div>
        </div>
    );
}

