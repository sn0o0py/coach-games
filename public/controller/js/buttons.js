// ============================================================
// Action Buttons (Fire, Ready, Select)
// ============================================================

// ---- Fire Button (RT = buttons[7]) ----
let fireActiveTouch = null;

(function() {
    const btn = document.getElementById('fire-btn');

    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (fireActiveTouch !== null) return;
        fireActiveTouch = e.changedTouches[0].identifier;
        state.buttons[7] = true;
        btn.classList.add('pressed');
    }, { passive: false });

    const endFire = (e) => {
        for (const touch of e.changedTouches) {
            if (touch.identifier === fireActiveTouch) {
                fireActiveTouch = null;
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

// ---- Menu Button (Start = buttons[9]) ----
(function() {
    const btn = document.getElementById('menu-btn');
    let activeTouch = null;

    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (activeTouch !== null) return;
        activeTouch = e.changedTouches[0].identifier;
        state.buttons[9] = true;
        btn.style.background = 'rgba(255,255,255,0.2)';
    }, { passive: false });

    const endMenu = (e) => {
        for (const touch of e.changedTouches) {
            if (touch.identifier === activeTouch) {
                activeTouch = null;
                state.buttons[9] = false;
                btn.style.background = '';
            }
        }
    };

    btn.addEventListener('touchend', endMenu);
    btn.addEventListener('touchcancel', endMenu);

    // Mouse fallback for desktop testing
    btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        state.buttons[9] = true;
        btn.style.background = 'rgba(255,255,255,0.2)';
    });
    window.addEventListener('mouseup', () => {
        if (state.buttons[9]) {
            state.buttons[9] = false;
            const b = document.getElementById('menu-btn');
            if (b) b.style.background = '';
        }
    });
})();

// ---- Gyro Hit-to-Fire (arena mode only) ----
(function() {
    const THRESHOLD = 10.5;
    const COOLDOWN = 50;
    const FIRE_DURATION = 50;

    let gyroFireTimeout = null;
    let lastFireTime = 0;

    window.addEventListener('devicemotion', (e) => {
        if (currentMode !== MODE.ARENA) return;

        const acc = e.accelerationIncludingGravity;
        if (!acc) return;

        const mag = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
        if (mag < THRESHOLD) return;

        const now = Date.now();
        if (now - lastFireTime < COOLDOWN) return;
        if (gyroFireTimeout !== null) return;

        lastFireTime = now;
        state.buttons[7] = true;
        const btn = document.getElementById('fire-btn');
        btn.classList.add('pressed');

        gyroFireTimeout = setTimeout(() => {
            gyroFireTimeout = null;
            if (fireActiveTouch === null) {
                state.buttons[7] = false;
                btn.classList.remove('pressed');
            }
        }, FIRE_DURATION);
    });
})();
