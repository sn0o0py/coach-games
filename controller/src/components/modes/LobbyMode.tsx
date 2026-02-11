// ============================================================
// LobbyMode Component - One Stick + Ready Button
// ============================================================

import { VirtualStick } from '../VirtualStick';
import { ActionButton } from '../ActionButton';

interface LobbyModeProps {
    onAxisUpdate: (axisX: number, axisY: number, valueX: number, valueY: number) => void;
    onButtonPress: (buttonIndex: number, pressed: boolean) => void;
}

export function LobbyMode({ onAxisUpdate, onButtonPress }: LobbyModeProps) {
    const handleStick = (x: number, y: number) => {
        onAxisUpdate(0, 1, x, y);
    };

    return (
        <div id="mode-lobby" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div id="sticks-lobby" style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '0 20px' }}>
                <VirtualStick
                    axisX={0}
                    axisY={1}
                    label="MOVE"
                    onUpdate={handleStick}
                />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px' }}>
                <ActionButton
                    buttonIndex={0}
                    label="READY"
                    variant="ready"
                    onPress={(pressed) => onButtonPress(0, pressed)}
                />
            </div>
        </div>
    );
}

