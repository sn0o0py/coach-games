// ============================================================
// Fullscreen Prompt and Toggle
// ============================================================

export function initFullscreen() {
    // ---- Fullscreen prompt ----
    const overlay = document.getElementById('fullscreen-prompt');
    overlay.addEventListener('click', () => {
        const el = document.documentElement;
        const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
        if (rfs) {
            rfs.call(el).catch(() => {});
        }
        if (typeof DeviceMotionEvent !== 'undefined' &&
            typeof DeviceMotionEvent.requestPermission === 'function') {
            DeviceMotionEvent.requestPermission().catch(() => {});
        }
        overlay.style.display = 'none';
    });
    // Also hide if already in fullscreen (e.g. PWA / standalone mode)
    if (window.matchMedia('(display-mode: fullscreen)').matches ||
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone) {
        overlay.style.display = 'none';
    }

    // ---- Fullscreen toggle button ----
    const btn = document.getElementById('fs-toggle');

    function updateIcon() {
        const isFs = !!document.fullscreenElement || !!document.webkitFullscreenElement;
        btn.textContent = isFs ? '✕' : '⛶';
        btn.title = isFs ? 'Exit fullscreen' : 'Enter fullscreen';
    }

    btn.addEventListener('click', () => {
        const isFs = !!document.fullscreenElement || !!document.webkitFullscreenElement;
        if (isFs) {
            (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        } else {
            const el = document.documentElement;
            (el.requestFullscreen || el.webkitRequestFullscreen).call(el).catch(() => {});
        }
    });

    document.addEventListener('fullscreenchange', updateIcon);
    document.addEventListener('webkitfullscreenchange', updateIcon);
    updateIcon();
}
