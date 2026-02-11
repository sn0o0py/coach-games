// ============================================================
// Virtual Sticks
// ============================================================

import { state } from './connection.js';

function setupStick(containerId, knobId, axisX, axisY) {
    const container = document.getElementById(containerId);
    const knob = document.getElementById(knobId);
    let activeTouch = null;

    const baseSize = () => container.querySelector('.stick-base').getBoundingClientRect();

    function updateKnob(cx, cy, rect) {
        const radius = rect.width / 2;
        const knobRadius = knob.offsetWidth / 2;
        const maxDist = radius - knobRadius * 0.3;

        let dist = Math.sqrt(cx * cx + cy * cy);
        if (dist > maxDist) {
            cx = (cx / dist) * maxDist;
            cy = (cy / dist) * maxDist;
            dist = maxDist;
        }

        knob.style.left = (radius - knobRadius + cx) + 'px';
        knob.style.top = (radius - knobRadius + cy) + 'px';

        state.axes[axisX] = parseFloat((cx / maxDist).toFixed(3));
        state.axes[axisY] = parseFloat((cy / maxDist).toFixed(3));
    }

    function resetKnob() {
        const rect = baseSize();
        const radius = rect.width / 2;
        const knobRadius = knob.offsetWidth / 2;
        knob.style.left = (radius - knobRadius) + 'px';
        knob.style.top = (radius - knobRadius) + 'px';
        state.axes[axisX] = 0;
        state.axes[axisY] = 0;
    }

    container.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (activeTouch !== null) return;
        const touch = e.changedTouches[0];
        activeTouch = touch.identifier;
        const rect = baseSize();
        const cx = touch.clientX - rect.left - rect.width / 2;
        const cy = touch.clientY - rect.top - rect.height / 2;
        updateKnob(cx, cy, rect);
        knob.style.background = 'rgba(100,180,255,0.85)';
    }, { passive: false });

    container.addEventListener('touchmove', (e) => {
        e.preventDefault();
        for (const touch of e.changedTouches) {
            if (touch.identifier === activeTouch) {
                const rect = baseSize();
                const cx = touch.clientX - rect.left - rect.width / 2;
                const cy = touch.clientY - rect.top - rect.height / 2;
                updateKnob(cx, cy, rect);
            }
        }
    }, { passive: false });

    const endTouch = (e) => {
        for (const touch of e.changedTouches) {
            if (touch.identifier === activeTouch) {
                activeTouch = null;
                resetKnob();
                knob.style.background = 'rgba(100,160,255,0.6)';
            }
        }
    };

    container.addEventListener('touchend', endTouch);
    container.addEventListener('touchcancel', endTouch);

    resetKnob();
}

function setupSequenceButton(buttonId, buttonIndex) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;

    let isPressed = false;

    const press = () => {
        if (isPressed) return;
        isPressed = true;
        state.buttons[buttonIndex] = true;
        btn.classList.add('pressed');
    };

    const release = () => {
        if (!isPressed) return;
        isPressed = false;
        state.buttons[buttonIndex] = false;
        btn.classList.remove('pressed');
    };

    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        press();
    }, { passive: false });

    btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        release();
    }, { passive: false });

    btn.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        release();
    }, { passive: false });

    // Also support mouse clicks for testing
    btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        press();
    });

    btn.addEventListener('mouseup', (e) => {
        e.preventDefault();
        release();
    });

    btn.addEventListener('mouseleave', (e) => {
        e.preventDefault();
        release();
    });
}

export function initSticks() {
    // Arena sticks
    setupStick('stick-left', 'knob-left', 0, 1);
    setupStick('stick-right', 'knob-right', 2, 3);

    // Lobby stick (only left-stick / movement, same axes 0,1)
    setupStick('stick-left-lobby', 'knob-left-lobby', 0, 1);

    // Menu stick (navigate, same axes 0,1)
    setupStick('stick-left-menu', 'knob-left-menu', 0, 1);

    // Maze stick (single stick in center, left-stick movement, axes 0,1)
    setupStick('stick-maze', 'knob-maze', 0, 1);

    // Sequence buttons: A=Green(0), B=Red(1), X=Blue(2), Y=Yellow(3)
    setupSequenceButton('btn-green', 0);   // A button
    setupSequenceButton('btn-red', 1);     // B button
    setupSequenceButton('btn-blue', 2);    // X button
    setupSequenceButton('btn-yellow', 3);  // Y button
}
