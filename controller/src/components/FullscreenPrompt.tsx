// ============================================================
// FullscreenPrompt Component
// ============================================================

import { useState, useEffect } from 'react';
import './FullscreenPrompt.css';

export function FullscreenPrompt() {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Hide if already in fullscreen (PWA/standalone mode)
        const checkFullscreen = () => {
            const doc = document as any;
            const isFs = !!document.fullscreenElement || 
                       !!doc.webkitFullscreenElement ||
                       window.matchMedia('(display-mode: fullscreen)').matches ||
                       window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as any).standalone;
            if (isFs) {
                setIsVisible(false);
            }
        };

        checkFullscreen();
        document.addEventListener('fullscreenchange', checkFullscreen);
        document.addEventListener('webkitfullscreenchange', checkFullscreen);

        return () => {
            document.removeEventListener('fullscreenchange', checkFullscreen);
            document.removeEventListener('webkitfullscreenchange', checkFullscreen);
        };
    }, []);

    const handleClick = () => {
        const el = document.documentElement;
        const rfs = (el as any).requestFullscreen || 
                   (el as any).webkitRequestFullscreen || 
                   (el as any).msRequestFullscreen;
        if (rfs) {
            rfs.call(el).catch(() => {});
        }
        
        // Request device motion permission on iOS
        if (typeof DeviceMotionEvent !== 'undefined' &&
            typeof (DeviceMotionEvent as any).requestPermission === 'function') {
            (DeviceMotionEvent as any).requestPermission().catch(() => {});
        }
        
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div id="fullscreen-prompt" onClick={handleClick}>
            <div className="icon">⛶</div>
            <div className="prompt-text">TAP TO GO FULLSCREEN</div>
            <div className="prompt-sub">For the best experience</div>
        </div>
    );
}

