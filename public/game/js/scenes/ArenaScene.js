// ============================================================
// ArenaScene – Main Gameplay
// ============================================================

class ArenaScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENE.ARENA });
    }

    init(data) {
        this.mode = data.mode || 'ffa';
        this.teams = data.teams || {};
        this.padIndices = data.padIndices || [];
    }

    preload() {
        generateAllTextures(this);
    }

    create() {
        inputManager.setPhaserGamepad(this.input.gamepad);
        inputManager.broadcastScene(SCENE.ARENA);
        // Reset state
        this.tanks = [];
        this.scores = {};           // { playerIndex: score }
        this.hudEntries = {};       // { playerIndex: { swatch, text } }
        this.wallRects = [];
        this.gameOver = false;
        this.zone = null;

        // Zone capture scores (separate from kill scores)
        if (this.mode === 'zone') {
            this.zoneScores = { A: 0, B: 0 };
        }

        this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);

        // Groups
        this.walls = this.physics.add.staticGroup();
        this.bullets = this.physics.add.group({ defaultKey: 'bullet_0' });

        // Random walls (new layout every game)
        this.createWalls();

        // HUD (static labels)
        this.createHUD();

        // Spawn tanks for all pads passed from the previous scene
        for (const idx of this.padIndices) {
            const pad = inputManager.getPad(idx);
            if (pad && pad.connected) {
                this.scores[idx] = 0;
                this.spawnTank(idx, pad);
            }
        }
        this.rebuildPlayerHUD();
        this.updateHUD();

        // Spawn first zone in zone capture mode
        if (this.mode === 'zone') {
            this.spawnZone();
        }

        // Pause state
        this.isPaused = false;
        this._prevStart = true;  // start as true to avoid triggering on scene entry
        this._prevA = true;
        this.pauseOverlay = null;

        // Handle mid-game disconnects (physical + WebSocket)
        this.input.gamepad.on('disconnected', (pad) => this.onPadDisconnected(pad));
        this._wsDisconnectCb = (pad) => this.onPadDisconnected(pad);
        inputManager.onDisconnect(this._wsDisconnectCb);

        // Handle mid-game WS connects
        this._wsConnectCb = (pad) => this.onWsPadConnected(pad);
        inputManager.onConnect(this._wsConnectCb);

        // Resize handler
        this.scale.on('resize', (gs) => this.onResize(gs));

        // Clean up WS callbacks when scene shuts down
        this.events.on('shutdown', () => {
            if (this._wsConnectCb) inputManager.offConnect(this._wsConnectCb);
            if (this._wsDisconnectCb) inputManager.offDisconnect(this._wsDisconnectCb);
            if (this.pauseOverlay) {
                this.pauseOverlay.forEach(obj => obj.destroy());
                this.pauseOverlay = null;
            }
        });
    }

    // --------------------------------------------------------
    // Wall generation (random each game)
    // --------------------------------------------------------
    createWalls() {
        this.wallRects = [];
        const w = this.scale.width;
        const h = this.scale.height;
        const margin = 80;

        for (let i = 0; i < WALL_COUNT; i++) {
            const ww = Phaser.Math.Between(WALL_MIN, WALL_MAX);
            const wh = Phaser.Math.Between(WALL_MIN / 2, WALL_MAX / 2);
            const wx = Phaser.Math.Between(margin, w - margin - ww);
            const wy = Phaser.Math.Between(margin + 50, h - margin - wh);

            let overlap = false;
            for (const r of this.wallRects) {
                if (Phaser.Geom.Rectangle.Overlaps(
                    new Phaser.Geom.Rectangle(wx - 10, wy - 10, ww + 20, wh + 20), r)) {
                    overlap = true;
                    break;
                }
            }
            if (overlap) continue;

            this.wallRects.push(new Phaser.Geom.Rectangle(wx, wy, ww, wh));
            const wallSprite = this.add.tileSprite(wx + ww / 2, wy + wh / 2, ww, wh, 'wall_tile');
            this.physics.add.existing(wallSprite, true);
            wallSprite.body.setSize(ww, wh);
            this.walls.add(wallSprite);
        }
    }

    // --------------------------------------------------------
    // HUD – different layouts for FFA vs TDM
    // --------------------------------------------------------
    createHUD() {
        const w = this.scale.width;
        let modeLabel, targetText;
        if (this.mode === 'ffa') {
            modeLabel = 'FREE FOR ALL';
            targetText = 'First to ' + FFA_KILL_TARGET + ' kills';
        } else if (this.mode === 'tdm') {
            modeLabel = 'TEAM DEATHMATCH';
            targetText = 'First to ' + TDM_KILL_TARGET + ' kills';
        } else {
            modeLabel = 'ZONE CAPTURE';
            targetText = 'First to ' + ZONE_CAPTURE_TARGET + ' captures';
        }

        // Mode title + target at top centre
        this.modeText = this.add.text(w / 2, 8, modeLabel + '  \u2014  ' + targetText, {
            fontFamily: 'Arial', fontSize: '20px', color: '#cccccc',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5, 0).setDepth(200);

        // Team score labels (TDM and Zone)
        if (this.mode === 'tdm' || this.mode === 'zone') {
            const labelA = this.mode === 'zone' ? 'Team A: 0 caps' : 'Team A: 0';
            const labelB = this.mode === 'zone' ? 'Team B: 0 caps' : 'Team B: 0';
            this.teamAText = this.add.text(w * 0.12, 8, labelA, {
                fontFamily: 'Arial', fontSize: '22px', color: hexStr(TEAM_COLORS.A),
                stroke: '#000000', strokeThickness: 3, fontStyle: 'bold'
            }).setOrigin(0.5, 0).setDepth(200);

            this.teamBText = this.add.text(w * 0.88, 8, labelB, {
                fontFamily: 'Arial', fontSize: '22px', color: hexStr(TEAM_COLORS.B),
                stroke: '#000000', strokeThickness: 3, fontStyle: 'bold'
            }).setOrigin(0.5, 0).setDepth(200);
        }

        // Per-player HUD entries are built dynamically
        this.hudEntries = {};
    }

    /** Rebuild per-player HUD swatches + texts for all current padIndices. */
    rebuildPlayerHUD() {
        // Destroy existing entries
        for (const idx in this.hudEntries) {
            const e = this.hudEntries[idx];
            if (e.swatch) e.swatch.destroy();
            if (e.text) e.text.destroy();
        }
        this.hudEntries = {};

        const y = 34;
        let col = 0;
        for (const idx of this.padIndices) {
            const x = 20 + col * 160;
            const swatchColor = getPlayerColor(idx);
            const sw = this.add.graphics().setDepth(200);
            sw.fillStyle(swatchColor, 1);
            sw.fillRoundedRect(x, y, 20, 20, 4);

            const txt = this.add.text(x + 26, y, getPlayerName(idx) + ': 0', {
                fontFamily: 'Arial', fontSize: '18px', color: '#ffffff',
                stroke: '#000000', strokeThickness: 3
            }).setDepth(200);

            this.hudEntries[idx] = { swatch: sw, text: txt };
            col++;
        }
    }

    updateHUD() {
        // Per-player
        for (const idx of this.padIndices) {
            const entry = this.hudEntries[idx];
            if (!entry) continue;
            const score = this.scores[idx] || 0;
            let label = getPlayerName(idx) + ': ' + score;
            if ((this.mode === 'tdm' || this.mode === 'zone') && this.teams[idx]) {
                label += '  (T' + this.teams[idx] + ')';
            }
            entry.text.setText(label);
        }
        // Team scores
        if (this.mode === 'tdm') {
            const ts = this.getTeamScores();
            if (this.teamAText) this.teamAText.setText('Team A: ' + ts.A);
            if (this.teamBText) this.teamBText.setText('Team B: ' + ts.B);
        }
        if (this.mode === 'zone') {
            const zs = this.zoneScores;
            if (this.teamAText) this.teamAText.setText('Team A: ' + zs.A + ' caps');
            if (this.teamBText) this.teamBText.setText('Team B: ' + zs.B + ' caps');
        }
    }

    getTeamScores() {
        const ts = { A: 0, B: 0 };
        for (const idx of this.padIndices) {
            if (this.teams[idx]) ts[this.teams[idx]] += (this.scores[idx] || 0);
        }
        return ts;
    }

    // --------------------------------------------------------
    // Gamepad / WS disconnect (mid-game)
    // --------------------------------------------------------
    onPadDisconnected(pad) {
        const idx = pad.index;
        const tank = this.tanks.find(t => t && t.playerIndex === idx);
        if (tank) this.destroyTank(tank, false);
        // Remove from padIndices
        const pi = this.padIndices.indexOf(idx);
        if (pi !== -1) this.padIndices.splice(pi, 1);
        delete this.scores[idx];
        delete this.teams[idx];
        this.rebuildPlayerHUD();
        this.updateHUD();
    }

    // --------------------------------------------------------
    // WS controller connected mid-game
    // --------------------------------------------------------
    onWsPadConnected(pad) {
        if (this.gameOver) return;
        const idx = pad.index; // 100+
        if (this.padIndices.includes(idx)) return; // already in game

        // Auto-assign team in team modes
        if (this.mode === 'tdm' || this.mode === 'zone') {
            let countA = 0, countB = 0;
            for (const pi of this.padIndices) {
                if (this.teams[pi] === 'A') countA++;
                if (this.teams[pi] === 'B') countB++;
            }
            this.teams[idx] = countA <= countB ? 'A' : 'B';
        }

        this.padIndices.push(idx);
        this.scores[idx] = 0;
        this.spawnTank(idx, pad);
        this.rebuildPlayerHUD();
        this.updateHUD();
    }

    // --------------------------------------------------------
    // Tank spawn
    // --------------------------------------------------------
    spawnTank(playerIndex, pad) {
        const pos = this.findSpawnPosition();
        const team = this.teams[playerIndex] || null;
        const isTeamMode = (this.mode === 'tdm' || this.mode === 'zone') && team;

        const bodyKey = isTeamMode ? 'tank_body_team_' + team + '_' + playerIndex : 'tank_body_' + playerIndex;
        const turretKey = isTeamMode ? 'tank_turret_team_' + team : 'tank_turret_' + playerIndex;

        const body = this.physics.add.sprite(pos.x, pos.y, bodyKey);
        body.setDepth(10);
        body.setCollideWorldBounds(true);
        body.body.setSize(44, 32);

        const turret = this.add.sprite(pos.x, pos.y, turretKey);
        turret.setDepth(11);
        turret.setOrigin(0.2, 0.5);

        const reloadGfx = this.add.graphics().setDepth(12);

        const tank = {
            playerIndex,
            pad,
            body,
            turret,
            reloadGfx,
            alive: true,
            lastFireTime: -RELOAD_TIME,
            turretAngle: 0,
            invincible: false,
            invincibleUntil: 0,
            ghostSprite: null,
            team: this.teams[playerIndex] || null
        };

        this.tanks.push(tank);

        this.physics.add.collider(body, this.walls);
        for (const other of this.tanks) {
            if (other && other !== tank && other.alive) {
                this.physics.add.collider(body, other.body);
            }
        }

        this.setInvincible(tank);
    }

    // --------------------------------------------------------
    // Find clear spawn position
    // --------------------------------------------------------
    findSpawnPosition() {
        const w = this.scale.width;
        const h = this.scale.height;
        const margin = 60;

        for (let attempts = 0; attempts < 100; attempts++) {
            const x = Phaser.Math.Between(margin, w - margin);
            const y = Phaser.Math.Between(margin + 50, h - margin);
            const testRect = new Phaser.Geom.Rectangle(x - 30, y - 24, 60, 48);

            let clear = true;
            for (const wr of this.wallRects) {
                if (Phaser.Geom.Rectangle.Overlaps(testRect, wr)) { clear = false; break; }
            }
            if (clear) {
                for (const t of this.tanks) {
                    if (t && t.alive) {
                        if (Phaser.Math.Distance.Between(x, y, t.body.x, t.body.y) < 100) {
                            clear = false; break;
                        }
                    }
                }
            }
            if (clear) return { x, y };
        }
        return { x: w / 2, y: h / 2 };
    }

    // --------------------------------------------------------
    // Invincibility
    // --------------------------------------------------------
    setInvincible(tank) {
        tank.invincible = true;
        tank.invincibleUntil = this.time.now + INVINCIBILITY_TIME;

        if (tank._blinkTween) tank._blinkTween.remove();
        tank._blinkTween = this.tweens.add({
            targets: [tank.body, tank.turret],
            alpha: { from: 1, to: 0.25 },
            duration: 150,
            yoyo: true,
            repeat: Math.ceil(INVINCIBILITY_TIME / 300),
            onComplete: () => {
                if (tank.body && tank.body.active) {
                    tank.body.setAlpha(1);
                    tank.turret.setAlpha(1);
                }
            }
        });
    }

    // --------------------------------------------------------
    // Shooting – team-aware collision
    // --------------------------------------------------------
    fireBullet(tank) {
        if (this.gameOver) return;
        const now = this.time.now;
        if (now - tank.lastFireTime < RELOAD_TIME) return;
        tank.lastFireTime = now;

        const angle = tank.turretAngle;
        const bx = tank.body.x + Math.cos(angle) * 30;
        const by = tank.body.y + Math.sin(angle) * 30;

        const isTeamMode = (this.mode === 'tdm' || this.mode === 'zone') && tank.team;
        const bulletKey = isTeamMode ? 'bullet_team_' + tank.team : 'bullet_' + tank.playerIndex;
        const bullet = this.physics.add.sprite(bx, by, bulletKey);
        bullet.setDepth(9);
        bullet.ownerIndex = tank.playerIndex;
        this.bullets.add(bullet);

        bullet.body.setCircle(4);
        this.physics.velocityFromRotation(angle, BULLET_SPEED, bullet.body.velocity);

        // Bullet <-> wall
        this.physics.add.collider(bullet, this.walls, (b) => b.destroy());

        // Bullet <-> tanks (team-aware)
        for (const other of this.tanks) {
            if (!other || !other.alive) continue;

            let canHit;
            if (this.mode === 'ffa') {
                canHit = other.playerIndex !== tank.playerIndex;
            } else {
                // TDM / Zone – only hit different team
                canHit = this.teams[other.playerIndex] !== this.teams[tank.playerIndex];
            }

            if (canHit) {
                this.physics.add.overlap(bullet, other.body, (b) => {
                    this.onBulletHitTank(b, other);
                });
            }
        }

        this.time.delayedCall(5000, () => {
            if (bullet && bullet.active) bullet.destroy();
        });
    }

    // --------------------------------------------------------
    // Bullet hit
    // --------------------------------------------------------
    onBulletHitTank(bullet, tank) {
        if (!tank.alive || tank.invincible || this.gameOver) {
            if (bullet && bullet.active) bullet.destroy();
            return;
        }

        const attackerIndex = bullet.ownerIndex;
        if (this.scores[attackerIndex] === undefined) this.scores[attackerIndex] = 0;
        this.scores[attackerIndex]++;
        this.updateHUD();

        if (bullet && bullet.active) bullet.destroy();

        this.playExplosion(tank.body.x, tank.body.y);
        this.killTank(tank);

        // Check win condition after every kill
        this.checkWinCondition();
    }

    // --------------------------------------------------------
    // Win condition check
    // --------------------------------------------------------
    checkWinCondition() {
        if (this.gameOver) return;

        if (this.mode === 'ffa') {
            for (const idx of this.padIndices) {
                if ((this.scores[idx] || 0) >= FFA_KILL_TARGET) {
                    this.triggerWin({ winnerIndex: idx });
                    return;
                }
            }
        } else if (this.mode === 'tdm') {
            const ts = this.getTeamScores();
            if (ts.A >= TDM_KILL_TARGET) {
                this.triggerWin({ winningTeam: 'A', teamScores: { ...ts } });
                return;
            }
            if (ts.B >= TDM_KILL_TARGET) {
                this.triggerWin({ winningTeam: 'B', teamScores: { ...ts } });
                return;
            }
        } else if (this.mode === 'zone') {
            const zs = this.zoneScores;
            if (zs.A >= ZONE_CAPTURE_TARGET) {
                this.triggerWin({ winningTeam: 'A', teamScores: { ...zs } });
                return;
            }
            if (zs.B >= ZONE_CAPTURE_TARGET) {
                this.triggerWin({ winningTeam: 'B', teamScores: { ...zs } });
                return;
            }
        }
    }

    triggerWin(winData) {
        this.gameOver = true;

        // Freeze all tanks
        for (const tank of this.tanks) {
            if (tank && tank.alive) {
                tank.body.body.setVelocity(0, 0);
            }
        }

        // "GAME OVER" overlay
        const w = this.scale.width;
        const h = this.scale.height;
        this.add.text(w / 2, h / 2, 'GAME OVER', {
            fontFamily: 'Arial', fontSize: '64px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 8, fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(300);

        // Transition to WinnerScene after a brief pause
        this.time.delayedCall(1500, () => {
            this.scene.start(SCENE.WINNER, {
                mode: this.mode,
                scores: { ...this.scores },
                teams: { ...this.teams },
                padIndices: [...this.padIndices],
                ...winData
            });
        });
    }

    // --------------------------------------------------------
    // Explosion effect
    // --------------------------------------------------------
    playExplosion(x, y) {
        const particles = this.add.particles(x, y, 'particle_orange', {
            speed: { min: 80, max: 250 },
            scale: { start: 1.2, end: 0 },
            lifespan: 500,
            quantity: 20,
            blendMode: 'ADD',
            emitting: false
        });
        particles.setDepth(50);
        particles.explode(20);
        this.time.delayedCall(600, () => particles.destroy());
    }

    // --------------------------------------------------------
    // Kill / Respawn
    // --------------------------------------------------------
    killTank(tank) {
        tank.alive = false;
        tank.body.setVisible(false);
        tank.body.body.enable = false;
        tank.turret.setVisible(false);
        tank.reloadGfx.setVisible(false);

        if (tank._blinkTween) {
            tank._blinkTween.remove();
            tank._blinkTween = null;
        }

        // // Don't schedule respawn if game is over
        if (this.gameOver) return;

        const spawnPos = this.findSpawnPosition();

        // Ghost preview in last 1 second of respawn delay
        this.time.delayedCall(RESPAWN_DELAY - 1000, () => {
            if (!this.tanks.includes(tank) || this.gameOver) return;
            const isTeamMode = (this.mode === 'tdm' || this.mode === 'zone') && tank.team;
            const ghostKey = isTeamMode ? 'tank_body_team_' + tank.team + '_' + tank.playerIndex : 'tank_body_' + tank.playerIndex;
            const ghost = this.add.sprite(spawnPos.x, spawnPos.y, ghostKey);
            ghost.setAlpha(0.3).setDepth(5);
            tank.ghostSprite = ghost;

            this.tweens.add({
                targets: ghost,
                alpha: { from: 0.15, to: 0.45 },
                duration: 200,
                yoyo: true,
                repeat: 4
            });
        }, [], this);

        this.time.delayedCall(RESPAWN_DELAY, () => {
            if (!this.tanks.includes(tank) || this.gameOver) return;

            if (tank.ghostSprite) {
                tank.ghostSprite.destroy();
                tank.ghostSprite = null;
            }

            tank.alive = true;
            tank.body.setPosition(spawnPos.x, spawnPos.y);
            tank.body.setVisible(true);
            tank.body.body.enable = true;
            tank.body.body.setVelocity(0, 0);
            tank.turret.setVisible(true);
            tank.reloadGfx.setVisible(true);
            tank.body.setAlpha(1);
            tank.turret.setAlpha(1);

            this.physics.add.collider(tank.body, this.walls);
            for (const other of this.tanks) {
                if (other && other !== tank && other.alive) {
                    this.physics.add.collider(tank.body, other.body);
                }
            }
            this.setInvincible(tank);
        }, [], this);
    }

    destroyTank(tank, explode = true) {
        if (explode && tank.alive) {
            this.playExplosion(tank.body.x, tank.body.y);
        }
        tank.alive = false;
        if (tank._blinkTween) tank._blinkTween.remove();
        tank.body.destroy();
        tank.turret.destroy();
        tank.reloadGfx.destroy();
        if (tank.ghostSprite) tank.ghostSprite.destroy();

        const idx = this.tanks.indexOf(tank);
        if (idx !== -1) this.tanks.splice(idx, 1);
    }

    // --------------------------------------------------------
    // Pause / Unpause
    // --------------------------------------------------------
    pauseGame() {
        this.isPaused = true;
        this.physics.world.pause();

        // Stop all tank velocities
        for (const tank of this.tanks) {
            if (tank && tank.alive) {
                tank.body.body.setVelocity(0, 0);
            }
        }

        this.tweens.pauseAll();
        this.time.paused = true;

        // Create overlay
        const w = this.scale.width;
        const h = this.scale.height;
        this.pauseOverlay = [];

        const bg = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.7).setDepth(400);
        this.pauseOverlay.push(bg);

        const title = this.add.text(w / 2, h / 2 - 60, 'PAUSED', {
            fontFamily: 'Arial', fontSize: '56px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 6, fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(401);
        this.pauseOverlay.push(title);

        const exitText = this.add.text(w / 2, h / 2 + 20, 'EXIT TO MENU', {
            fontFamily: 'Arial', fontSize: '28px', color: '#ffcc00',
            stroke: '#000000', strokeThickness: 4, fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(401);
        this.pauseOverlay.push(exitText);

        const hint = this.add.text(w / 2, h / 2 + 70, 'Press A to select  /  Start to resume', {
            fontFamily: 'Arial', fontSize: '16px', color: '#888888',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(401);
        this.pauseOverlay.push(hint);

        inputManager.broadcastScene('paused');
    }

    resumeGame() {
        this.isPaused = false;
        this.physics.world.resume();
        this.tweens.resumeAll();
        this.time.paused = false;

        if (this.pauseOverlay) {
            this.pauseOverlay.forEach(obj => obj.destroy());
            this.pauseOverlay = null;
        }

        inputManager.broadcastScene(SCENE.ARENA);
    }

    // --------------------------------------------------------
    // Update loop
    // --------------------------------------------------------
    update(time, delta) {
        // --- Start button (buttons[9]) pause toggle ---
        let startPressed = false;
        let aPressed = false;
        const allPads = inputManager.getAllConnectedPads();
        for (const pad of allPads) {
            if (pad.buttons[9] && pad.buttons[9].pressed) startPressed = true;
            if (pad.buttons[0] && pad.buttons[0].pressed) aPressed = true;
        }

        // Rising edge detection for Start
        if (startPressed && !this._prevStart && !this.gameOver) {
            if (this.isPaused) {
                this.resumeGame();
            } else {
                this.pauseGame();
            }
        }
        this._prevStart = startPressed;

        // While paused: check A button for "Exit to Menu"
        if (this.isPaused) {
            if (aPressed && !this._prevA) {
                this.physics.world.resume();
                this.tweens.resumeAll();
                this.time.paused = false;

                this.scene.start(SCENE.MENU);
            }
            this._prevA = aPressed;
            return;
        }

        if (this.gameOver) return;

        for (const tank of this.tanks) {
            if (!tank || !tank.alive) continue;
            this.updateTankInput(tank, time);
            this.updateReloadIndicator(tank, time);
            this.updateInvincibility(tank, time);
        }

        // Zone capture update
        if (this.mode === 'zone') {
            this.updateZone(delta);
        }

        // Destroy out-of-bounds bullets
        for (const bullet of this.bullets.getChildren()) {
            if (!bullet || !bullet.active) continue;
            if (bullet.x < -20 || bullet.x > this.scale.width + 20 ||
                bullet.y < -20 || bullet.y > this.scale.height + 20) {
                bullet.destroy();
            }
        }
    }

    // --------------------------------------------------------
    // Per-tank input
    // --------------------------------------------------------
    updateTankInput(tank, time) {
        const pad = tank.pad;
        if (!pad || !pad.connected) return;

        // Left stick: movement
        let lx = pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
        let ly = pad.axes.length > 1 ? pad.axes[1].getValue() : 0;
        if (Math.abs(lx) < DEADZONE) lx = 0;
        if (Math.abs(ly) < DEADZONE) ly = 0;

        const magnitude = Math.min(1, Math.sqrt(lx * lx + ly * ly));
        if (magnitude > DEADZONE) {
            const moveAngle = Math.atan2(ly, lx);
            const speed = TANK_SPEED * magnitude;
            tank.body.body.setVelocity(
                Math.cos(moveAngle) * speed,
                Math.sin(moveAngle) * speed
            );
            tank.body.rotation = Phaser.Math.Angle.RotateTo(
                tank.body.rotation, moveAngle, 0.15
            );
        } else {
            tank.body.body.setVelocity(0, 0);
        }

        // Right stick: turret aim
        let rx = pad.axes.length > 2 ? pad.axes[2].getValue() : 0;
        let ry = pad.axes.length > 3 ? pad.axes[3].getValue() : 0;
        if (Math.abs(rx) < DEADZONE) rx = 0;
        if (Math.abs(ry) < DEADZONE) ry = 0;

        if (Math.sqrt(rx * rx + ry * ry) > DEADZONE) {
            tank.turretAngle = Math.atan2(ry, rx);
        }

        tank.turret.setPosition(tank.body.x, tank.body.y);
        tank.turret.setRotation(tank.turretAngle);

        // RT / R2: fire
        const rt = pad.buttons[7];
        if (rt && rt.pressed) {
            this.fireBullet(tank);
        }
    }

    // --------------------------------------------------------
    // Reload indicator
    // --------------------------------------------------------
    updateReloadIndicator(tank, time) {
        const gfx = tank.reloadGfx;
        gfx.clear();

        const elapsed = time - tank.lastFireTime;
        if (elapsed >= RELOAD_TIME) return;

        const progress = Phaser.Math.Clamp(elapsed / RELOAD_TIME, 0, 1);
        const startAngle = Phaser.Math.DegToRad(-90);
        const endAngle = Phaser.Math.DegToRad(-90 + 360 * progress);
        const x = tank.body.x;
        const y = tank.body.y;

        gfx.lineStyle(3, 0x333333, 0.5);
        gfx.beginPath();
        gfx.arc(x, y, 28, 0, Math.PI * 2);
        gfx.strokePath();

        const isTeamMode = (this.mode === 'tdm' || this.mode === 'zone') && tank.team;
        const reloadColor = isTeamMode ? TEAM_COLORS[tank.team] : getPlayerColor(tank.playerIndex);
        gfx.lineStyle(3, reloadColor, 0.9);
        gfx.beginPath();
        gfx.arc(x, y, 28, startAngle, endAngle, false);
        gfx.strokePath();
    }

    // --------------------------------------------------------
    // Invincibility check
    // --------------------------------------------------------
    updateInvincibility(tank, time) {
        if (tank.invincible && time >= tank.invincibleUntil) {
            tank.invincible = false;
            tank.body.setAlpha(1);
            tank.turret.setAlpha(1);
        }
    }

    // --------------------------------------------------------
    // Zone Capture – spawn, update, destroy
    // --------------------------------------------------------
    findZonePosition() {
        const w = this.scale.width;
        const h = this.scale.height;
        const margin = 80;
        const radius = ZONE_SIZE / 2;

        for (let attempts = 0; attempts < 200; attempts++) {
            const x = Phaser.Math.Between(margin + radius, w - margin - radius);
            const y = Phaser.Math.Between(margin + 50 + radius, h - margin - radius);

            // Check overlap with walls (circle vs rectangle)
            let clear = true;
            for (const wr of this.wallRects) {
                // Expand wall rect by zone radius for circle-rect overlap test
                const expanded = new Phaser.Geom.Rectangle(
                    wr.x - radius, wr.y - radius,
                    wr.width + ZONE_SIZE, wr.height + ZONE_SIZE
                );
                if (expanded.contains(x, y)) {
                    clear = false;
                    break;
                }
            }
            if (clear) return { x, y };
        }
        return { x: w / 2, y: h / 2 };
    }

    spawnZone() {
        if (this.gameOver) return;
        const pos = this.findZonePosition();
        const radius = ZONE_SIZE / 2;

        const gfx = this.add.graphics().setDepth(2);
        const timerText = this.add.text(pos.x, pos.y, Math.ceil(ZONE_CAPTURE_TIME / 1000) + '', {
            fontFamily: 'Arial', fontSize: '32px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 5, fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(3);

        this.zone = {
            gfx,
            x: pos.x,
            y: pos.y,
            radius,
            capturingTeam: null,
            progress: ZONE_CAPTURE_TIME,
            timerText
        };

        this.drawZone(0xaaaaaa, 0.2);
    }

    drawZone(fillColor, fillAlpha) {
        const z = this.zone;
        if (!z) return;
        z.gfx.clear();
        // Filled circle
        z.gfx.fillStyle(fillColor, fillAlpha);
        z.gfx.fillCircle(z.x, z.y, z.radius);
        // Outline
        z.gfx.lineStyle(3, fillColor, 0.8);
        z.gfx.strokeCircle(z.x, z.y, z.radius);
    }

    updateZone(delta) {
        const z = this.zone;
        if (!z) return;

        // Determine which teams have alive tanks inside the zone
        const teamsInZone = { A: 0, B: 0 };
        for (const tank of this.tanks) {
            if (!tank || !tank.alive) continue;
            const dist = Phaser.Math.Distance.Between(tank.body.x, tank.body.y, z.x, z.y);
            if (dist < z.radius) {
                const team = this.teams[tank.playerIndex];
                if (team) teamsInZone[team]++;
            }
        }

        const aIn = teamsInZone.A > 0;
        const bIn = teamsInZone.B > 0;

        if (aIn && bIn) {
            // Contested – pause, show neutral flicker
            this.drawZone(0xffffff, 0.15);
            z.timerText.setColor('#ff4444');
        } else if (aIn || bIn) {
            const activeTeam = aIn ? 'A' : 'B';
            const teamColor = TEAM_COLORS[activeTeam];

            if (z.capturingTeam !== activeTeam) {
                // Different team took over – reset progress
                z.capturingTeam = activeTeam;
                z.progress = ZONE_CAPTURE_TIME;
            }

            // Count down
            z.progress -= delta;
            this.drawZone(teamColor, 0.25);
            z.timerText.setColor(hexStr(teamColor));

            if (z.progress <= 0) {
                // Zone captured!
                this.zoneScores[activeTeam]++;
                this.updateHUD();
                this.destroyZone();
                this.checkWinCondition();

                // Schedule next zone if game not over
                if (!this.gameOver) {
                    this.time.delayedCall(ZONE_RESPAWN_DELAY, () => {
                        if (!this.gameOver) this.spawnZone();
                    });
                }
                return;
            }
        } else {
            // No one – keep current state but neutral look
            const color = z.capturingTeam ? TEAM_COLORS[z.capturingTeam] : 0xaaaaaa;
            this.drawZone(color, 0.15);
            if (z.capturingTeam) {
                z.timerText.setColor(hexStr(color));
            } else {
                z.timerText.setColor('#ffffff');
            }
        }

        // Update countdown text
        z.timerText.setText(Math.ceil(z.progress / 1000) + '');
    }

    destroyZone() {
        if (this.zone) {
            this.zone.gfx.destroy();
            this.zone.timerText.destroy();
            this.zone = null;
        }
    }

    // --------------------------------------------------------
    // Resize handler
    // --------------------------------------------------------
    onResize(gameSize) {
        this.physics.world.setBounds(0, 0, gameSize.width, gameSize.height);
    }

}
