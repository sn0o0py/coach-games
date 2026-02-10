// ============================================================
// WinnerScene – Victory Screen
// ============================================================

class WinnerScene extends Phaser.Scene {
    constructor() {
        super({ key: 'WinnerScene' });
    }

    init(data) {
        this.resultData = data;
    }

    create() {
        inputManager.setPhaserGamepad(this.input.gamepad);
        inputManager.broadcastScene('WinnerScene');
        const d = this.resultData;
        const w = this.scale.width;
        const h = this.scale.height;

        if (d.mode === 'ffa') {
            // --- Free For All winner ---
            const idx = d.winnerIndex;
            const color = hexStr(getPlayerColor(idx));

            this.add.text(w / 2, h * 0.15, getPlayerName(idx) + ' WINS!', {
                fontFamily: 'Arial', fontSize: '64px', color: color,
                stroke: '#000000', strokeThickness: 8, fontStyle: 'bold'
            }).setOrigin(0.5);

            this.add.text(w / 2, h * 0.27, 'Free For All', {
                fontFamily: 'Arial', fontSize: '24px', color: '#aaaaaa',
                stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5);

            this.add.sprite(w / 2, h * 0.38, 'tank_body_' + idx).setScale(2.5);
        } else {
            // --- Team-based winner (TDM or Zone Capture) ---
            const team = d.winningTeam;
            const color = hexStr(TEAM_COLORS[team]);
            const ts = d.teamScores;
            const subTitle = d.mode === 'zone' ? 'Zone Capture' : 'Team Deathmatch';
            const unit = d.mode === 'zone' ? ' caps' : ' kills';

            this.add.text(w / 2, h * 0.12, 'TEAM ' + team + ' WINS!', {
                fontFamily: 'Arial', fontSize: '64px', color: color,
                stroke: '#000000', strokeThickness: 8, fontStyle: 'bold'
            }).setOrigin(0.5);

            this.add.text(w / 2, h * 0.24, subTitle, {
                fontFamily: 'Arial', fontSize: '24px', color: '#aaaaaa',
                stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5);

            // Team totals
            this.add.text(w * 0.35, h * 0.34, 'Team A: ' + ts.A + unit, {
                fontFamily: 'Arial', fontSize: '30px', color: hexStr(TEAM_COLORS.A),
                stroke: '#000000', strokeThickness: 4, fontStyle: 'bold'
            }).setOrigin(0.5);

            this.add.text(w * 0.65, h * 0.34, 'Team B: ' + ts.B + unit, {
                fontFamily: 'Arial', fontSize: '30px', color: hexStr(TEAM_COLORS.B),
                stroke: '#000000', strokeThickness: 4, fontStyle: 'bold'
            }).setOrigin(0.5);
        }

        // --- Scoreboard ---
        this.add.text(w / 2, h * 0.50, 'SCOREBOARD', {
            fontFamily: 'Arial', fontSize: '28px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);

        const scores = d.scores || {};
        const padIndices = d.padIndices || [];

        // Sort players by score descending
        const sorted = [...padIndices].sort((a, b) => (scores[b] || 0) - (scores[a] || 0));

        for (let i = 0; i < sorted.length; i++) {
            const idx = sorted[i];
            const y = h * 0.58 + i * 32;
            let label = getPlayerName(idx) + ':  ' + (scores[idx] || 0) + ' kills';
            if ((d.mode === 'tdm' || d.mode === 'zone') && d.teams[idx]) {
                label += '   (Team ' + d.teams[idx] + ')';
            }
            this.add.sprite(w / 2 - 140, y, 'tank_body_' + idx).setScale(0.8);
            this.add.text(w / 2 - 110, y, label, {
                fontFamily: 'Arial', fontSize: '20px', color: hexStr(getPlayerColor(idx)),
                stroke: '#000000', strokeThickness: 3
            }).setOrigin(0, 0.5);
        }

        // Return info
        this.add.text(w / 2, h * 0.92, 'Returning to menu in 5 seconds...  (press A to skip)', {
            fontFamily: 'Arial', fontSize: '18px', color: '#888888',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);

        // Auto return after 5 seconds
        this.autoTimer = this.time.delayedCall(5000, () => this.returnToMenu());

        this._returned = false;
        // Start prevA as true so holding A from arena doesn't trigger immediately
        this._prevA = true;
    }

    update() {
        if (this._returned) return;

        // Any pad's A button can skip back to menu (gamepad + WS)
        let anyA = false;
        const allIndices = [0, 1, 2, 3, ...inputManager.getAllWsPadIndices()];
        for (const i of allIndices) {
            const pad = inputManager.getPad(i);
            if (pad && pad.connected && pad.buttons[0] && pad.buttons[0].pressed) {
                anyA = true;
                break;
            }
        }
        if (anyA && !this._prevA) {
            this.returnToMenu();
        }
        this._prevA = anyA;
    }

    returnToMenu() {
        if (this._returned) return;
        this._returned = true;
        this.scene.start('MenuScene');
    }
}
