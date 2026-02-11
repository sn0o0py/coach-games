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

export function initSticks() {
    // Arena sticks
    setupStick('stick-left', 'knob-left', 0, 1);
    setupStick('stick-right', 'knob-right', 2, 3);

    // Lobby stick (only left-stick / movement, same axes 0,1)
    setupStick('stick-left-lobby', 'knob-left-lobby', 0, 1);

    // Menu stick (navigate, same axes 0,1)
    setupStick('stick-left-menu', 'knob-left-menu', 0, 1);
}
