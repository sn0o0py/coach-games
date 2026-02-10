// ============================================================
// Action Buttons (Fire, Ready, Select)
// ============================================================

// ---- Fire Button (RT = buttons[7]) ----
(function() {
    const btn = document.getElementById('fire-btn');
    let activeTouch = null;

    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (activeTouch !== null) return;
        activeTouch = e.changedTouches[0].identifier;
        state.buttons[7] = true;
        btn.classList.add('pressed');
    }, { passive: false });

    const endFire = (e) => {
        for (const touch of e.changedTouches) {
            if (touch.identifier === activeTouch) {
                activeTouch = null;
                state.buttons[7] = false;
                btn.classList.remove('pressed');
            }
        }
    };

    btn.addEventListener('touchend', endFire);
    btn.addEventListener('touchcancel', endFire);

    // Mouse fallback for desktop testing
    btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        state.buttons[7] = true;
        btn.classList.add('pressed');
    });
    window.addEventListener('mouseup', () => {
        if (state.buttons[7]) {
            state.buttons[7] = false;
            btn.classList.remove('pressed');
        }
    });
})();

// ---- Ready Button (A = buttons[0], press-and-release to toggle) ----
(function() {
    const btn = document.getElementById('ready-btn');
    let activeTouch = null;

    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (activeTouch !== null) return;
        activeTouch = e.changedTouches[0].identifier;
        state.buttons[0] = true;
        btn.classList.add('pressed');
    }, { passive: false });

    const endReady = (e) => {
        for (const touch of e.changedTouches) {
            if (touch.identifier === activeTouch) {
                activeTouch = null;
                state.buttons[0] = false;
                btn.classList.remove('pressed');
            }
        }
    };

    btn.addEventListener('touchend', endReady);
    btn.addEventListener('touchcancel', endReady);

    // Mouse fallback for desktop testing
    btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        state.buttons[0] = true;
        btn.classList.add('pressed');
    });
    window.addEventListener('mouseup', () => {
        if (currentMode === 'lobby' && state.buttons[0]) {
            state.buttons[0] = false;
            btn.classList.remove('pressed');
        }
    });
})();

// ---- Select Button (menu mode, A = buttons[0]) ----
(function() {
    const btn = document.getElementById('select-btn');
    let activeTouch = null;

    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (activeTouch !== null) return;
        activeTouch = e.changedTouches[0].identifier;
        state.buttons[0] = true;
        btn.classList.add('pressed');
    }, { passive: false });

    const endSelect = (e) => {
        for (const touch of e.changedTouches) {
            if (touch.identifier === activeTouch) {
                activeTouch = null;
                state.buttons[0] = false;
                btn.classList.remove('pressed');
            }
        }
    };

    btn.addEventListener('touchend', endSelect);
    btn.addEventListener('touchcancel', endSelect);

    // Mouse fallback for desktop testing
    btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        state.buttons[0] = true;
        btn.classList.add('pressed');
    });
    window.addEventListener('mouseup', () => {
        if (currentMode === 'menu' && state.buttons[0]) {
            state.buttons[0] = false;
            const b = document.getElementById('select-btn');
            if (b) b.classList.remove('pressed');
        }
    });
})();
