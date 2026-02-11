// ============================================================
// useConnection Hook - WebSocket/WebRTC Connection Management
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { MSG, WS_PATH, WS_PLAYER_COLORS, STATUS } from '../constants';
import type { ConnectionState, ControllerState } from '../types';

const RTC_TIMEOUT = 5000;

export function useConnection(
    onSceneChange: (scene: string) => void,
    onBroadcastState: (state: string) => void,
    onPlayerMessage: (message: string) => void
) {
    const [connectionState, setConnectionState] = useState<ConnectionState>({
        ws: null,
        rtcPc: null,
        rtcDc: null,
        rtcReady: false,
        playerId: null,
        status: STATUS.CONNECTING,
    });

    const connectionStateRef = useRef(connectionState);
    const rtcTimeoutRef = useRef<number | null>(null);

    // Keep ref in sync with state
    useEffect(() => {
        connectionStateRef.current = connectionState;
    }, [connectionState]);

    const cleanupRtc = useCallback(() => {
        if (rtcTimeoutRef.current) {
            clearTimeout(rtcTimeoutRef.current);
            rtcTimeoutRef.current = null;
        }

        setConnectionState(prev => {
            if (prev.rtcDc) {
                try { prev.rtcDc.close(); } catch (e) {}
            }
            if (prev.rtcPc) {
                try { prev.rtcPc.close(); } catch (e) {}
            }

            return {
                ...prev,
                rtcPc: null,
                rtcDc: null,
                rtcReady: false,
                status: prev.status === STATUS.CONNECTED_RTC ? STATUS.CONNECTED : prev.status,
            };
        });
    }, []);

    const handleRtcOffer = useCallback(async (sdp: string, sdpType: string) => {
        cleanupRtc();

        try {
            const rtcPc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            rtcPc.onicecandidate = (e) => {
                setConnectionState(prev => {
                    if (e.candidate && prev.ws && prev.ws.readyState === 1) {
                        prev.ws.send(JSON.stringify({
                            type: MSG.RTC_CANDIDATE,
                            candidate: e.candidate.candidate,
                            mid: e.candidate.sdpMid
                        }));
                    }
                    return prev;
                });
            };

            rtcPc.ondatachannel = (e) => {
                const rtcDc = e.channel;
                rtcDc.onopen = () => {
                    setConnectionState(prev => ({
                        ...prev,
                        rtcDc,
                        rtcReady: true,
                        status: STATUS.CONNECTED_RTC,
                    }));
                };
                rtcDc.onclose = () => {
                    setConnectionState(prev => ({
                        ...prev,
                        rtcDc: null,
                        rtcReady: false,
                        status: STATUS.CONNECTED,
                    }));
                };
                rtcDc.onerror = () => {
                    setConnectionState(prev => ({
                        ...prev,
                        rtcDc: null,
                        rtcReady: false,
                        status: STATUS.CONNECTED,
                    }));
                };
            };

            rtcPc.onconnectionstatechange = () => {
                const s = rtcPc.connectionState;
                if (s === 'failed' || s === 'closed' || s === 'disconnected') {
                    cleanupRtc();
                }
            };

            await rtcPc.setRemoteDescription({ type: (sdpType || 'offer') as RTCSdpType, sdp });
            const answer = await rtcPc.createAnswer();
            await rtcPc.setLocalDescription(answer);

            setConnectionState(prev => {
                if (prev.ws && prev.ws.readyState === 1) {
                    prev.ws.send(JSON.stringify({
                        type: MSG.RTC_ANSWER,
                        sdp: answer.sdp,
                        sdpType: answer.type
                    }));
                }
                return { ...prev, rtcPc };
            });

            rtcTimeoutRef.current = window.setTimeout(() => {
                setConnectionState(prev => {
                    if (!prev.rtcReady) {
                        console.warn('WebRTC timeout, falling back to WebSocket');
                        cleanupRtc();
                    }
                    return prev;
                });
            }, RTC_TIMEOUT);
        } catch (e: any) {
            console.warn('WebRTC offer handling failed:', e.message);
            cleanupRtc();
        }
    }, [cleanupRtc]);

    const connectWS = useCallback(() => {
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${location.host}${WS_PATH.CONTROLLER}`);

        ws.onopen = () => {
            setConnectionState(prev => ({ ...prev, ws, status: STATUS.CONNECTED }));
        };

        ws.onmessage = (e) => {
            try {
                const msg = JSON.parse(e.data);
                if (msg.type === MSG.ID) {
                    setConnectionState(prev => ({
                        ...prev,
                        playerId: msg.id,
                        status: STATUS.CONNECTED,
                    }));
                } else if (msg.type === MSG.SCENE) {
                    onSceneChange(msg.scene);
                } else if (msg.type === MSG.BROADCAST_STATE) {
                    onBroadcastState(msg.state);
                } else if (msg.type === MSG.PLAYER_MESSAGE) {
                    onPlayerMessage(msg.message);
                } else if (msg.type === MSG.RTC_OFFER) {
                    handleRtcOffer(msg.sdp, msg.sdpType);
                } else if (msg.type === MSG.RTC_CANDIDATE) {
                    setConnectionState(prev => {
                        if (prev.rtcPc) {
                            prev.rtcPc.addIceCandidate({ candidate: msg.candidate, sdpMid: msg.mid })
                                .catch(() => {});
                        }
                        return prev;
                    });
                }
            } catch (err) {
                // Ignore parse errors
            }
        };

        ws.onclose = () => {
            cleanupRtc();
            setConnectionState(prev => ({
                ...prev,
                ws: null,
                status: STATUS.DISCONNECTED,
                playerId: null,
            }));
            setTimeout(connectWS, 2000);
        };

        ws.onerror = () => {};

        setConnectionState(prev => ({ ...prev, ws }));
    }, [onSceneChange, onBroadcastState, onPlayerMessage, handleRtcOffer, cleanupRtc]);

    useEffect(() => {
        connectWS();
    }, [connectWS]);

    const sendState = useCallback((state: ControllerState) => {
        const currentState = connectionStateRef.current;
        if (currentState.rtcReady && currentState.rtcDc && currentState.rtcDc.readyState === 'open') {
            currentState.rtcDc.send(JSON.stringify(state));
        } else if (currentState.ws && currentState.ws.readyState === 1) {
            currentState.ws.send(JSON.stringify(state));
        }
    }, []);

    const getPlayerColor = useCallback((): string | null => {
        if (connectionState.playerId === null) return null;
        const colorHex = WS_PLAYER_COLORS[parseInt(String(connectionState.playerId)) % 20];
        const r = (colorHex >> 16) & 0xFF;
        const g = (colorHex >> 8) & 0xFF;
        const b = colorHex & 0xFF;
        return `rgb(${r}, ${g}, ${b})`;
    }, [connectionState.playerId]);

    return {
        connectionState,
        sendState,
        playerColor: getPlayerColor(),
    };
}

