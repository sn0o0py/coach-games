// ============================================================
// Action Buttons (Fire, Ready, Select)
// ============================================================

import { state, MODE, currentMode } from './connection.js';

// Shared state for fire button
let fireActiveTouch = null;

export function initButtons() {
    // ---- Fire Button (RT = buttons[7]) ----
    const fireBtn = document.getElementById('fire-btn');

    fireBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (fireActiveTouch !== null) return;
        fireActiveTouch = e.changedTouches[0].identifier;
        state.buttons[7] = true;
        fireBtn.classList.add('pressed');
    }, { passive: false });

    const endFire = (e) => {
        for (const touch of e.changedTouches) {
            if (touch.identifier === fireActiveTouch) {
                fireActiveTouch = null;
                state.buttons[7] = false;
                fireBtn.classList.remove('pressed');
            }
        }
    };

    fireBtn.addEventListener('touchend', endFire);
    fireBtn.addEventListener('touchcancel', endFire);

    // Mouse fallback for desktop testing
    fireBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        state.buttons[7] = true;
        fireBtn.classList.add('pressed');
    });
    window.addEventListener('mouseup', () => {
        if (state.buttons[7]) {
            state.buttons[7] = false;
            fireBtn.classList.remove('pressed');
        }
    });

    // ---- Ready Button (A = buttons[0], press-and-release to toggle) ----
    const readyBtn = document.getElementById('ready-btn');
    let readyActiveTouch = null;

    readyBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (readyActiveTouch !== null) return;
        readyActiveTouch = e.changedTouches[0].identifier;
        state.buttons[0] = true;
        readyBtn.classList.add('pressed');
    }, { passive: false });

    const endReady = (e) => {
        for (const touch of e.changedTouches) {
            if (touch.identifier === readyActiveTouch) {
                readyActiveTouch = null;
                state.buttons[0] = false;
                readyBtn.classList.remove('pressed');
            }
        }
    };

    readyBtn.addEventListener('touchend', endReady);
    readyBtn.addEventListener('touchcancel', endReady);

    // Mouse fallback for desktop testing
    readyBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        state.buttons[0] = true;
        readyBtn.classList.add('pressed');
    });
    window.addEventListener('mouseup', () => {
        if (currentMode === 'lobby' && state.buttons[0]) {
            state.buttons[0] = false;
            readyBtn.classList.remove('pressed');
        }
    });

    // ---- Select Button (menu mode, A = buttons[0]) ----
    const selectBtn = document.getElementById('select-btn');
    let selectActiveTouch = null;

    selectBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (selectActiveTouch !== null) return;
        selectActiveTouch = e.changedTouches[0].identifier;
        state.buttons[0] = true;
        selectBtn.classList.add('pressed');
    }, { passive: false });

    const endSelect = (e) => {
        for (const touch of e.changedTouches) {
            if (touch.identifier === selectActiveTouch) {
                selectActiveTouch = null;
                state.buttons[0] = false;
                selectBtn.classList.remove('pressed');
            }
        }
    };

    selectBtn.addEventListener('touchend', endSelect);
    selectBtn.addEventListener('touchcancel', endSelect);

    // Mouse fallback for desktop testing
    selectBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        state.buttons[0] = true;
        selectBtn.classList.add('pressed');
    });
    window.addEventListener('mouseup', () => {
        if (currentMode === 'menu' && state.buttons[0]) {
            state.buttons[0] = false;
            selectBtn.classList.remove('pressed');
        }
    });

    // ---- Menu Button (Start = buttons[9]) ----
    const menuBtn = document.getElementById('menu-btn');
    let menuActiveTouch = null;

    menuBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (menuActiveTouch !== null) return;
        menuActiveTouch = e.changedTouches[0].identifier;
        state.buttons[9] = true;
        menuBtn.style.background = 'rgba(255,255,255,0.2)';
    }, { passive: false });

    const endMenu = (e) => {
        for (const touch of e.changedTouches) {
            if (touch.identifier === menuActiveTouch) {
                menuActiveTouch = null;
                state.buttons[9] = false;
                menuBtn.style.background = '';
            }
        }
    };

    menuBtn.addEventListener('touchend', endMenu);
    menuBtn.addEventListener('touchcancel', endMenu);

    // Mouse fallback for desktop testing
    menuBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        state.buttons[9] = true;
        menuBtn.style.background = 'rgba(255,255,255,0.2)';
    });
    window.addEventListener('mouseup', () => {
        if (state.buttons[9]) {
            state.buttons[9] = false;
            menuBtn.style.background = '';
        }
    });

    // ---- Gyro Hit-to-Fire (arena mode only) ----
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
        fireBtn.classList.add('pressed');

        gyroFireTimeout = setTimeout(() => {
            gyroFireTimeout = null;
            if (fireActiveTouch === null) {
                state.buttons[7] = false;
                fireBtn.classList.remove('pressed');
            }
        }, FIRE_DURATION);
    });
}
