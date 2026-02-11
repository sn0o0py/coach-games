// ============================================================
// useGyroFire Hook - Gyro-based Hit-to-Fire for Arena Mode
// ============================================================

import { useEffect } from 'react';

interface UseGyroFireProps {
    onButtonPress: (buttonIndex: number, pressed: boolean) => void;
}

export function useGyroFire({ onButtonPress }: UseGyroFireProps) {
    useEffect(() => {
        const THRESHOLD = 10.5;
        const COOLDOWN = 50;
        const FIRE_DURATION = 50;

        let gyroFireTimeout: number | null = null;
        let lastFireTime = 0;
        let fireActiveTouch: number | null = null;

        const handleDeviceMotion = (e: DeviceMotionEvent) => {
            const acc = e.accelerationIncludingGravity;
            if (!acc) return;

            const mag = Math.sqrt(acc.x! * acc.x! + acc.y! * acc.y! + acc.z! * acc.z!);
            if (mag < THRESHOLD) return;

            const now = Date.now();
            if (now - lastFireTime < COOLDOWN) return;
            if (gyroFireTimeout !== null) return;

            lastFireTime = now;
            onButtonPress(7, true);

            gyroFireTimeout = window.setTimeout(() => {
                gyroFireTimeout = null;
                if (fireActiveTouch === null) {
                    onButtonPress(7, false);
                }
            }, FIRE_DURATION);
        };

        window.addEventListener('devicemotion', handleDeviceMotion);
        return () => {
            window.removeEventListener('devicemotion', handleDeviceMotion);
            if (gyroFireTimeout !== null) {
                clearTimeout(gyroFireTimeout);
            }
        };
    }, [onButtonPress]);
}

