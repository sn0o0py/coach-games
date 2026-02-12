import { useState, useEffect, useCallback } from 'react';
import './GoaliesMode.css';

interface GoaliesModeProps {
    onAxisUpdate: (axisX: number, axisY: number, valueX: number, valueY: number) => void;
}

export function GoaliesMode({ onAxisUpdate }: GoaliesModeProps) {
    const [leftPressed, setLeftPressed] = useState(false);
    const [rightPressed, setRightPressed] = useState(false);

    const handleLeftPress = useCallback((pressed: boolean) => {
        setLeftPressed(pressed);
        if (pressed) {
            setRightPressed(false);
        }
    }, []);

    const handleRightPress = useCallback((pressed: boolean) => {
        setRightPressed(pressed);
        if (pressed) {
            setLeftPressed(false);
        }
    }, []);

    // Update axis value whenever button states change
    useEffect(() => {
        const valueX = leftPressed ? -1 : rightPressed ? 1 : 0;
        onAxisUpdate(0, 1, valueX, 0);
    }, [leftPressed, rightPressed, onAxisUpdate]);

    const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
        e.preventDefault();
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
        e.preventDefault();
    };

    return (
        <div id="mode-goalies" className="goalies-mode">
            <div className="goalies-buttons">
                <button
                    className={`goalies-button goalies-button-left ${leftPressed ? 'pressed' : ''}`}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        handleLeftPress(true);
                    }}
                    onMouseUp={() => handleLeftPress(false)}
                    onMouseLeave={() => handleLeftPress(false)}
                    onTouchStart={(e) => {
                        handleTouchStart(e);
                        handleLeftPress(true);
                    }}
                    onTouchEnd={(e) => {
                        handleTouchEnd(e);
                        handleLeftPress(false);
                    }}
                    onTouchCancel={(e) => {
                        handleTouchEnd(e);
                        handleLeftPress(false);
                    }}
                >
                    ←
                </button>
                <button
                    className={`goalies-button goalies-button-right ${rightPressed ? 'pressed' : ''}`}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        handleRightPress(true);
                    }}
                    onMouseUp={() => handleRightPress(false)}
                    onMouseLeave={() => handleRightPress(false)}
                    onTouchStart={(e) => {
                        handleTouchStart(e);
                        handleRightPress(true);
                    }}
                    onTouchEnd={(e) => {
                        handleTouchEnd(e);
                        handleRightPress(false);
                    }}
                    onTouchCancel={(e) => {
                        handleTouchEnd(e);
                        handleRightPress(false);
                    }}
                >
                    →
                </button>
            </div>
        </div>
    );
}
