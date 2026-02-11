// ============================================================
// ArenaMode Component - Two Sticks + Fire Button
// ============================================================

import { VirtualStick } from '../VirtualStick';
import { ActionButton } from '../ActionButton';
import { useGyroFire } from '../../hooks/useGyroFire';

interface ArenaModeProps {
    onAxisUpdate: (axisX: number, axisY: number, valueX: number, valueY: number) => void;
    onButtonPress: (buttonIndex: number, pressed: boolean) => void;
}

export function ArenaMode({ onAxisUpdate, onButtonPress }: ArenaModeProps) {
    // Enable gyro-based hit-to-fire
    useGyroFire({ onButtonPress });

    const handleLeftStick = (x: number, y: number) => {
        onAxisUpdate(0, 1, x, y);
    };

    const handleRightStick = (x: number, y: number) => {
        onAxisUpdate(2, 3, x, y);
    };

    return (
        <div id="mode-arena" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div id="sticks">
                <VirtualStick
                    axisX={0}
                    axisY={1}
                    label="MOVE"
                    onUpdate={handleLeftStick}
                />
                <VirtualStick
                    axisX={2}
                    axisY={3}
                    label="AIM"
                    onUpdate={handleRightStick}
                />
            </div>
            <div id="fire-wrapper" style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', width: '100%', padding: '0 10px' }}>
                <ActionButton
                    buttonIndex={7}
                    label="FIRE"
                    variant="fire"
                    onPress={(pressed) => onButtonPress(7, pressed)}
                />
            </div>
        </div>
    );
}

