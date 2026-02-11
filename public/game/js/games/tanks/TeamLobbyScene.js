// ============================================================
// TeamLobbyScene – Team Selection for Team Deathmatch
// ============================================================

import { SCENE } from '../../../../shared/constants.js';
import { inputManager } from '../../InputManager.js';
import { settings } from '../../settings.js';
import { getPlayerColor, getPlayerName, hexStr } from '../../utils.js';
import { TEAM_COLORS } from '../../constants.js';

class TeamLobbyScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENE.TEAM_LOBBY });
    }

    init(data) {
        this.initialPadIndices = data.padIndices || [];
        this.nextMode = data.nextMode || 'tdm';
    }

    create() {
        inputManager.setPhaserGamepad(this.input.gamepad);
        inputManager.broadcastScene(SCENE.TEAM_LOBBY);
        const w = this.scale.width;
        const h = this.scale.height;
        const cx = w / 2;

        // Background halves
        const bg = this.add.graphics();
        bg.fillStyle(TEAM_COLORS.A, 0.12);
        bg.fillRect(0, 0, cx, h);
        bg.fillStyle(TEAM_COLORS.B, 0.12);
        bg.fillRect(cx, 0, cx, h);
        bg.lineStyle(3, 0xffffff, 0.35);
        bg.lineBetween(cx, 0, cx, h);

        // Team labels
        this.add.text(w * 0.25, 50, 'TEAM A', {
            fontFamily: 'Arial', fontSize: '44px', color: hexStr(TEAM_COLORS.A),
            stroke: '#000000', strokeThickness: 5, fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(w * 0.75, 50, 'TEAM B', {
            fontFamily: 'Arial', fontSize: '44px', color: hexStr(TEAM_COLORS.B),
            stroke: '#000000', strokeThickness: 5, fontStyle: 'bold'
        }).setOrigin(0.5);

        // Instructions
        this.add.text(cx, h - 45, 'Move to a side and press A to ready up', {
            fontFamily: 'Arial', fontSize: '22px', color: '#cccccc',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);

        this.players = [];
        this._prevA = {};
        this.countdownTimer = null;
        this.countdownText = null;
        this.countdownValue = 3;
        this.transitioning = false;

        // Create entries for connected pads
        for (const idx of this.initialPadIndices) {
            this.addPlayer(idx);
        }
    }

    addPlayer(padIndex) {
        if (this.players.find(p => p.padIndex === padIndex)) return;

        const w = this.scale.width;
        const h = this.scale.height;
        const startY = h * 0.3 + this.players.length * 80;

        const sprite = this.add.sprite(w / 2, startY, 'tank_body_' + padIndex).setDepth(10);

        const nameText = this.add.text(0, 0, getPlayerName(padIndex), {
            fontFamily: 'Arial', fontSize: '18px', color: hexStr(getPlayerColor(padIndex)),
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(10);

        const readyText = this.add.text(0, 0, '', {
            fontFamily: 'Arial', fontSize: '16px', color: '#66ff66',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(10);

        this.players.push({ padIndex, sprite, nameText, readyText, ready: false, team: null });
        // Start A-button debounce as "pressed" to avoid carry-over
        this._prevA[padIndex] = true;
    }

    update() {
        if (this.transitioning) return;

        const w = this.scale.width;
        const cx = w / 2;

        // Remove disconnected players
        this.players = this.players.filter(p => {
            const pad = inputManager.getPad(p.padIndex);
            if (!pad || !pad.connected) {
                p.sprite.destroy();
                p.nameText.destroy();
                p.readyText.destroy();
                return false;
            }
            return true;
        });

        // Detect newly connected pads (gamepad 0-3 + WS 100+)
        for (let i = 0; i < 4; i++) {
            const pad = inputManager.getPad(i);
            if (pad && pad.connected && !this.players.find(p => p.padIndex === i)) {
                this.addPlayer(i);
            }
        }
        for (const wsIdx of inputManager.getAllWsPadIndices()) {
            if (!this.players.find(p => p.padIndex === wsIdx)) {
                this.addPlayer(wsIdx);
            }
        }

        let allReady = this.players.length >= 2;
        let teamACount = 0;
        let teamBCount = 0;

        for (const p of this.players) {
            const pad = inputManager.getPad(p.padIndex);
            if (!pad) continue;

            // Movement with left stick
            let lx = pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
            let ly = pad.axes.length > 1 ? pad.axes[1].getValue() : 0;
            if (Math.abs(lx) < settings.DEADZONE) lx = 0;
            if (Math.abs(ly) < settings.DEADZONE) ly = 0;

            p.sprite.x = Phaser.Math.Clamp(p.sprite.x + lx * 6, 50, w - 50);
            p.sprite.y = Phaser.Math.Clamp(p.sprite.y + ly * 4, 100, this.scale.height - 100);

            // Team determined by which half they're on
            const prevTeam = p.team;
            p.team = p.sprite.x < cx ? 'A' : 'B';

            // Swap sprite texture & name color to team color when side changes
            if (p.team !== prevTeam) {
                p.sprite.setTexture('tank_body_team_' + p.team + '_' + p.padIndex);
                p.nameText.setColor(hexStr(TEAM_COLORS[p.team]));
            }

            // A button toggles ready
            const aBtn = pad.buttons[0] ? pad.buttons[0].pressed : false;
            const prevA = this._prevA[p.padIndex] || false;
            if (aBtn && !prevA) {
                p.ready = !p.ready;
            }
            this._prevA[p.padIndex] = aBtn;

            // Update labels
            p.nameText.setPosition(p.sprite.x, p.sprite.y + 28);
            p.readyText.setPosition(p.sprite.x, p.sprite.y + 46);
            p.readyText.setText(p.ready ? 'READY' : '');

            if (!p.ready) allReady = false;
            if (p.team === 'A') teamACount++;
            if (p.team === 'B') teamBCount++;
        }

        // Start or cancel countdown
        const canStart = allReady && this.players.length >= 2 && teamACount >= 1 && teamBCount >= 1;

        if (canStart && !this.countdownTimer) {
            this.startCountdown();
        } else if (!canStart && this.countdownTimer) {
            this.cancelCountdown();
        }
    }

    startCountdown() {
        this.countdownValue = 3;
        this.countdownText = this.add.text(
            this.scale.width / 2, this.scale.height * 0.5, '3',
            { fontFamily: 'Arial', fontSize: '80px', color: '#ffffff', stroke: '#000000', strokeThickness: 8 }
        ).setOrigin(0.5).setDepth(100);

        this.countdownTimer = this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.countdownValue--;
                if (this.countdownValue <= 0) {
                    this.countdownText.setText('GO!');
                    this.transitioning = true;
                    this.time.delayedCall(500, () => this.launchGame());
                } else {
                    this.countdownText.setText('' + this.countdownValue);
                }
            },
            repeat: 2
        });
    }

    cancelCountdown() {
        if (this.countdownTimer) { this.countdownTimer.remove(); this.countdownTimer = null; }
        if (this.countdownText) { this.countdownText.destroy(); this.countdownText = null; }
    }

    launchGame() {
        const teams = {};
        const padIndices = [];
        for (const p of this.players) {
            teams[p.padIndex] = p.team;
            padIndices.push(p.padIndex);
        }
        this.scene.start(SCENE.ARENA, { mode: this.nextMode, padIndices, teams });
    }
}

export { TeamLobbyScene };
