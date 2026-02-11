// ============================================================
// MazeMode Component - Single Stick
// ============================================================

import { VirtualStick } from '../VirtualStick';

interface MazeModeProps {
    onAxisUpdate: (axisX: number, axisY: number, valueX: number, valueY: number) => void;
}

export function MazeMode({ onAxisUpdate }: MazeModeProps) {
    const handleStick = (x: number, y: number) => {
        onAxisUpdate(0, 1, x, y);
    };

    return (
        <div id="mode-maze" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '0 20px' }}>
                <VirtualStick
                    axisX={0}
                    axisY={1}
                    label="MOVE"
                    onUpdate={handleStick}
                />
            </div>
        </div>
    );
}

