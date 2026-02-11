// ============================================================
// Header Component
// ============================================================

import { useCallback } from 'react';
import { STATUS } from '../constants';
import type { Status } from '../constants';
import { useFullscreen } from '../hooks/useFullscreen';

interface HeaderProps {
    playerColor: string | null;
    status: Status;
    sceneLabel: string;
    showMenuButton: boolean;
    onButtonPress: (buttonIndex: number, pressed: boolean) => void;
}

export function Header({
    playerColor,
    status,
    sceneLabel,
    showMenuButton,
    onButtonPress,
}: HeaderProps) {
    const { isFullscreen, toggleFullscreen } = useFullscreen();

    const handleMenuClick = useCallback(() => {
        onButtonPress(9, true);
        setTimeout(() => onButtonPress(9, false), 100);
    }, [onButtonPress]);
    const getStatusText = () => {
        if (status === STATUS.CONNECTED_RTC) {
            return 'Connected (RTC)';
        } else if (status === STATUS.CONNECTED) {
            return 'Connected';
        } else if (status === STATUS.DISCONNECTED) {
            return 'Reconnecting...';
        } else {
            return 'Connecting...';
        }
    };

    const getStatusDotClass = () => {
        if (status === STATUS.CONNECTED || status === STATUS.CONNECTED_RTC) {
            return 'dot connected';
        } else if (status === STATUS.CONNECTING) {
            return 'dot connecting';
        } else {
            return 'dot';
        }
    };

    return (
        <div id="header">
            <h1>
                CONTROLLER{' '}
                {playerColor && (
                    <span
                        id="player-color"
                        style={{
                            display: 'inline-block',
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            marginRight: '8px',
                            verticalAlign: 'middle',
                            border: '2px solid rgba(255,255,255,0.3)',
                            backgroundColor: playerColor,
                        }}
                    ></span>
                )}
            </h1>
            <div id="status">
                <span className={getStatusDotClass()}></span> {getStatusText()}
            </div>
            <div id="scene-label">{sceneLabel}</div>
            {showMenuButton && (
                <div
                    id="menu-btn"
                    onClick={handleMenuClick}
                    title="Menu"
                    style={{
                        position: 'absolute',
                        top: '10px',
                        right: '54px',
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#aaa',
                        fontSize: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 100,
                        transition: 'background 0.15s',
                    }}
                >
                    ☰
                </div>
            )}
            <div
                id="fs-toggle"
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                style={{
                    position: 'absolute',
                    top: '10px',
                    right: '12px',
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#aaa',
                    fontSize: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 100,
                    transition: 'background 0.15s',
                }}
            >
                {isFullscreen ? '✕' : '⛶'}
            </div>
        </div>
    );
}

