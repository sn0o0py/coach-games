// ============================================================
// Stress Test – Simulates multiple controller connections
// ============================================================

import { MSG, WS_PATH } from '../shared/constants.js';

const bots = [];
let running = false;
let sendIntervalId = null;
let dashboardIntervalId = null;
let startTime = 0;
let totalSent = 0;
let lastCountTime = 0;
let lastCountTotal = 0;
let currentRate = 0;

// DOM refs
const botCountInput = document.getElementById('bot-count');
const sendRateInput = document.getElementById('send-rate');
const fireToggle = document.getElementById('fire-toggle');
const startBtn = document.getElementById('start-btn');
const botGrid = document.getElementById('bot-grid');
const statConnections = document.getElementById('stat-connections');
const statTotal = document.getElementById('stat-total');
const statRate = document.getElementById('stat-rate');
const statUptime = document.getElementById('stat-uptime');

// ---- Bot class ----

class Bot {
    constructor(index) {
        this.index = index;
        this.ws = null;
        this.playerId = null;
        this.connected = false;
        this.sentCount = 0;
        this.axes = [0, 0, 0, 0];
        this.fire = false;

        // Sine-wave params per axis: random frequency and phase
        this.freq = [];
        this.phase = [];
        for (let i = 0; i < 4; i++) {
            this.freq.push(0.3 + Math.random() * 1.2);   // 0.3–1.5 Hz
            this.phase.push(Math.random() * Math.PI * 2);
        }

        this.createCard();
    }

    createCard() {
        this.card = document.createElement('div');
        this.card.className = 'bot-card';
        this.card.innerHTML =
            '<div class="bot-header"><span class="dot"></span>Bot ' + this.index +
            ' <span class="bot-id"></span></div>' +
            '<div class="bot-axes"></div>' +
            '<div class="bot-fire"></div>' +
            '<div class="bot-sent"></div>';
        botGrid.appendChild(this.card);

        this.dotEl = this.card.querySelector('.dot');
        this.idEl = this.card.querySelector('.bot-id');
        this.axesEl = this.card.querySelector('.bot-axes');
        this.fireEl = this.card.querySelector('.bot-fire');
        this.sentEl = this.card.querySelector('.bot-sent');
    }

    connect() {
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.ws = new WebSocket(protocol + '//' + location.host + WS_PATH.CONTROLLER);

        this.ws.onopen = () => {
            this.connected = true;
        };

        this.ws.onmessage = (e) => {
            try {
                const msg = JSON.parse(e.data);
                if (msg.type === MSG.ID) {
                    this.playerId = msg.id;
                }
                // Ignore RTC offers and other messages
            } catch (err) {}
        };

        this.ws.onclose = () => {
            this.connected = false;
            this.playerId = null;
        };

        this.ws.onerror = () => {};
    }

    updateAxes(time) {
        for (let i = 0; i < 4; i++) {
            this.axes[i] = Math.sin(time * this.freq[i] * Math.PI * 2 + this.phase[i]);
        }
        // Random fire toggle ~10% of frames when enabled
        this.fire = fireToggle.checked && Math.random() < 0.1;
    }

    send() {
        if (!this.ws || this.ws.readyState !== 1) return;

        const buttons = new Array(17).fill(false);
        buttons[7] = this.fire;

        this.ws.send(JSON.stringify({
            axes: [
                Math.round(this.axes[0] * 1000) / 1000,
                Math.round(this.axes[1] * 1000) / 1000,
                Math.round(this.axes[2] * 1000) / 1000,
                Math.round(this.axes[3] * 1000) / 1000
            ],
            buttons: buttons
        }));

        this.sentCount++;
        totalSent++;
    }

    updateCard() {
        this.dotEl.className = 'dot' + (this.connected ? ' connected' : '');
        this.idEl.textContent = this.playerId !== null ? '#' + this.playerId : '';
        this.axesEl.textContent =
            'LX:' + this.axes[0].toFixed(2).padStart(6) +
            ' LY:' + this.axes[1].toFixed(2).padStart(6) + '\n' +
            'RX:' + this.axes[2].toFixed(2).padStart(6) +
            ' RY:' + this.axes[3].toFixed(2).padStart(6);
        this.fireEl.textContent = this.fire ? 'FIRE!' : '';
        this.sentEl.textContent = 'sent: ' + this.sentCount;
    }

    disconnect() {
        if (this.ws) {
            this.ws.onclose = null; // prevent reconnect-like behavior
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
        this.playerId = null;
    }

    removeCard() {
        if (this.card && this.card.parentNode) {
            this.card.parentNode.removeChild(this.card);
        }
    }
}

// ---- Start / Stop ----

function start() {
    const count = parseInt(botCountInput.value) || 10;
    const hz = parseInt(sendRateInput.value) || 60;

    totalSent = 0;
    lastCountTime = performance.now();
    lastCountTotal = 0;
    currentRate = 0;
    startTime = Date.now();

    // Create and connect bots
    for (let i = 0; i < count; i++) {
        const bot = new Bot(i);
        bot.connect();
        bots.push(bot);
    }

    // Send loop using setInterval (not rAF — works in background tabs)
    const intervalMs = Math.round(1000 / hz);
    sendIntervalId = setInterval(() => {
        const time = (Date.now() - startTime) / 1000; // seconds since start
        for (const bot of bots) {
            bot.updateAxes(time);
            bot.send();
        }
    }, intervalMs);

    // Dashboard refresh every 500ms
    dashboardIntervalId = setInterval(updateDashboard, 500);

    running = true;
    startBtn.textContent = 'STOP';
    startBtn.classList.add('running');
    botCountInput.disabled = true;
    sendRateInput.disabled = true;
}

function stop() {
    if (sendIntervalId) {
        clearInterval(sendIntervalId);
        sendIntervalId = null;
    }
    if (dashboardIntervalId) {
        clearInterval(dashboardIntervalId);
        dashboardIntervalId = null;
    }

    for (const bot of bots) {
        bot.disconnect();
        bot.removeCard();
    }
    bots.length = 0;

    running = false;
    startBtn.textContent = 'START';
    startBtn.classList.remove('running');
    botCountInput.disabled = false;
    sendRateInput.disabled = false;

    // Reset stats display
    statConnections.textContent = '0';
    statTotal.textContent = '0';
    statRate.textContent = '0';
    statUptime.textContent = '0s';
}

function updateDashboard() {
    let connectedCount = 0;
    for (const bot of bots) {
        bot.updateCard();
        if (bot.connected) connectedCount++;
    }

    // Calculate msg/s
    const now = performance.now();
    const elapsed = (now - lastCountTime) / 1000;
    if (elapsed > 0) {
        currentRate = Math.round((totalSent - lastCountTotal) / elapsed);
        lastCountTime = now;
        lastCountTotal = totalSent;
    }

    const uptime = Math.round((Date.now() - startTime) / 1000);

    statConnections.textContent = connectedCount + '/' + bots.length;
    statTotal.textContent = totalSent.toLocaleString();
    statRate.textContent = currentRate;
    statUptime.textContent = uptime + 's';
}

// ---- Event listeners ----

startBtn.addEventListener('click', () => {
    if (running) {
        stop();
    } else {
        start();
    }
});
