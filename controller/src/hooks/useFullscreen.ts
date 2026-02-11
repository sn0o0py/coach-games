// ============================================================
// useFullscreen Hook - Fullscreen State and Toggle Management
// ============================================================

import { useEffect, useState, useCallback } from 'react';

export function useFullscreen() {
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Fullscreen state tracking
    useEffect(() => {
        const updateFullscreen = () => {
            const doc = document as any;
            const isFs = !!document.fullscreenElement || !!doc.webkitFullscreenElement;
            setIsFullscreen(isFs);
        };
        document.addEventListener('fullscreenchange', updateFullscreen);
        document.addEventListener('webkitfullscreenchange', updateFullscreen);
        updateFullscreen();
        return () => {
            document.removeEventListener('fullscreenchange', updateFullscreen);
            document.removeEventListener('webkitfullscreenchange', updateFullscreen);
        };
    }, []);

    const toggleFullscreen = useCallback(() => {
        const doc = document as any;
        const isFs = !!document.fullscreenElement || !!doc.webkitFullscreenElement;
        if (isFs) {
            (document.exitFullscreen || doc.webkitExitFullscreen).call(document);
        } else {
            const el = document.documentElement;
            (el.requestFullscreen || (el as any).webkitRequestFullscreen).call(el).catch(() => {});
        }
    }, []);

    return {
        isFullscreen,
        toggleFullscreen,
    };
}

