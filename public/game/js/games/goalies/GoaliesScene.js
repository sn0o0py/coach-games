// ============================================================
// GoaliesScene – Main Goalies Gameplay
// ============================================================

import { SCENE } from '../../../../shared/constants.js';
import { inputManager } from '../../InputManager.js';
import { settings } from '../../settings.js';
import { getPlayerColor, getPlayerName, hexStr } from '../../utils.js';
import { initPauseManager } from '../../pauseManager.js';
import { darken } from '../../utils.js';

// ============================================================
// Texture Generation
// ============================================================

// Generate all textures once (shared across scenes via texture manager)
export function generateAllTextures(scene) {
    const g = scene.make.graphics({ add: false });

    // Goalies game textures
    // Paddles for each player
    for (let i = 0; i < 4; i++) {
        const color = getPlayerColor(i);
        g.clear();
        g.fillStyle(color, 1);
        g.fillRoundedRect(0, 0, 80, 20, 4);
        g.fillStyle(darken(color, 0.3), 1);
        g.fillRect(0, 0, 80, 4);
        g.generateTexture('paddle_' + i, 80, 20);
    }
    for (let i = 0; i < 20; i++) {
        const color = getPlayerColor(100 + i);
        g.clear();
        g.fillStyle(color, 1);
        g.fillRoundedRect(0, 0, 80, 20, 4);
        g.fillStyle(darken(color, 0.3), 1);
        g.fillRect(0, 0, 80, 4);
        g.generateTexture('paddle_' + (100 + i), 80, 20);
    }

    // Ball
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(12, 12, 12);
    g.lineStyle(2, 0x000000, 1);
    g.strokeCircle(12, 12, 12);
    g.generateTexture('ball', 24, 24);

    g.destroy();
}


class GoaliesScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENE.GOALIES });
    }

    init(data) {
        this.padIndices = data.padIndices || [];
    }

    preload() {
        generateAllTextures(this);
    }

    create() {
        inputManager.setPhaserGamepad(this.input.gamepad);
        inputManager.broadcastScene(SCENE.GOALIES);

        const w = this.scale.width;
        const h = this.scale.height;

        // Ensure we have at least 3 players
        if (this.padIndices.length < 3) {
            this.scene.start(SCENE.GOALIES_MENU);
            return;
        }

        // Limit to 8 players max
        if (this.padIndices.length > 8) {
            this.padIndices = this.padIndices.slice(0, 8);
        }

        this.numPlayers = this.padIndices.length;
        this.scores = {};
        this.paddles = [];
        this.goals = [];
        this.gameOver = false;
        this.roundActive = false;
        this.countdownActive = false;
        this.countdownTime = 0;

        // Initialize scores
        for (const idx of this.padIndices) {
            this.scores[idx] = 0;
        }

        // Create arena polygon
        this.createArena();

        // Create paddles
        for (let i = 0; i < this.padIndices.length; i++) {
            this.createPaddle(this.padIndices[i], i);
        }

        // Create ball
        this.createBall();

        // Create HUD
        this.createHUD();

        // Handle disconnects
        this.input.gamepad.on('disconnected', (pad) => this.onPadDisconnected(pad));
        this._wsDisconnectCb = (pad) => this.onPadDisconnected(pad);
        inputManager.onDisconnect(this._wsDisconnectCb);

        // Cleanup on shutdown
        if (this.events) {
            this.events.on('shutdown', () => {
                if (this._wsDisconnectCb) inputManager.offDisconnect(this._wsDisconnectCb);
            });
        }

        // Initialize pause manager
        initPauseManager(this, {
            stopEntities: () => {
                if (this.ball && this.ball.body) {
                    this.ball.body.setVelocity(0, 0);
                }
            },
            returnScene: SCENE.GOALIES_MENU,
            currentScene: SCENE.GOALIES
        });

        // Start first round
        this.startRound();
    }

    createArena() {
        const w = this.scale.width;
        const h = this.scale.height;
        const centerX = w / 2;
        const centerY = h / 2;

        // Calculate polygon radius (leave margin for goals)
        const margin = 100;
        const radius = Math.min(w, h) / 2 - margin;

        // Calculate polygon vertices
        const vertices = [];
        const angleStep = (2 * Math.PI) / this.numPlayers;

        for (let i = 0; i < this.numPlayers; i++) {
            const angle = i * angleStep - Math.PI / 2; // Start at top
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            vertices.push({ x, y });
        }

        // Create arena walls (polygon edges)
        this.walls = this.physics.add.staticGroup();
        this.arenaGraphics = this.add.graphics();
        this.arenaGraphics.lineStyle(4, 0xffffff, 1);

        for (let i = 0; i < vertices.length; i++) {
            const v1 = vertices[i];
            const v2 = vertices[(i + 1) % vertices.length];

            // Draw wall line
            this.arenaGraphics.moveTo(v1.x, v1.y);
            this.arenaGraphics.lineTo(v2.x, v2.y);

            // // Create physics wall (but leave gap for goal)
            // const goalWidth = 120;
            const goalWidth = Math.sqrt(
                Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2)
            );

            // Store goal position (center of gap)
            const goalX = (v1.x + v2.x) / 2;
            const goalY = (v1.y + v2.y) / 2;
            const goalAngle = Math.atan2(v2.y - v1.y, v2.x - v1.x);
            this.goals.push({
                x: goalX,
                y: goalY,
                angle: goalAngle,
                playerIndex: this.padIndices[i],
                width: goalWidth
            });
        }
    }

    createPaddle(playerIndex, sideIndex) {
        const goal = this.goals[sideIndex];
        const paddleWidth = settings.GOALIES_PADDLE_WIDTH;
        const paddleHeight = 20;

        // Create paddle sprite
        const paddle = this.physics.add.sprite(goal.x, goal.y, 'paddle_' + playerIndex);
        paddle.setDisplaySize(paddleWidth, paddleHeight);
        paddle.setOrigin(0.5, 0.5);
        paddle.setRotation(goal.angle); // Rotate paddle to match wall angle
        paddle.playerIndex = playerIndex;
        paddle.sideIndex = sideIndex;
        paddle.goal = goal;

        // Calculate goal line bounds (along the wall direction)
        const goalHalf = goal.width / 2;
        const wallDx = Math.cos(goal.angle);
        const wallDy = Math.sin(goal.angle);

        // Calculate bounds along the wall line
        paddle.startX = goal.x - wallDx * goalHalf;
        paddle.startY = goal.y - wallDy * goalHalf;
        paddle.endX = goal.x + wallDx * goalHalf;
        paddle.endY = goal.y + wallDy * goalHalf;

        // Set collision
        paddle.body.setImmovable(true);
        paddle.body.setSize(paddleWidth, paddleHeight);

        this.paddles.push(paddle);

        // Visual goal line graphics
        const goalGfx = this.add.graphics();
        const playerColor = getPlayerColor(playerIndex);
        
        // Draw goal line background (semi-transparent rectangle)
        const goalLineThickness = 10;
        const perpDx = -Math.sin(goal.angle);
        const perpDy = Math.cos(goal.angle);
        
        // Calculate corners of goal line rectangle
        const corner1X = paddle.startX - perpDx * goalLineThickness / 2;
        const corner1Y = paddle.startY - perpDy * goalLineThickness / 2;
        const corner2X = paddle.startX + perpDx * goalLineThickness / 2;
        const corner2Y = paddle.startY + perpDy * goalLineThickness / 2;
        const corner3X = paddle.endX + perpDx * goalLineThickness / 2;
        const corner3Y = paddle.endY + perpDy * goalLineThickness / 2;
        const corner4X = paddle.endX - perpDx * goalLineThickness / 2;
        const corner4Y = paddle.endY - perpDy * goalLineThickness / 2;
        
        // Fill with semi-transparent player color
        goalGfx.fillStyle(playerColor, 0.2);
        goalGfx.fillPoints([
            { x: corner1X, y: corner1Y },
            { x: corner2X, y: corner2Y },
            { x: corner3X, y: corner3Y },
            { x: corner4X, y: corner4Y }
        ], true);
        
        // Draw goal line border
        goalGfx.lineStyle(3, playerColor, 0.8);
        goalGfx.moveTo(paddle.startX, paddle.startY);
        goalGfx.lineTo(paddle.endX, paddle.endY);
        
        // Draw perpendicular lines at ends to show goal boundaries
        goalGfx.lineStyle(2, playerColor, 0.6);
        const endLineLength = 20;
        goalGfx.moveTo(paddle.startX - perpDx * endLineLength, paddle.startY - perpDy * endLineLength);
        goalGfx.lineTo(paddle.startX + perpDx * endLineLength, paddle.startY + perpDy * endLineLength);
        goalGfx.moveTo(paddle.endX - perpDx * endLineLength, paddle.endY - perpDy * endLineLength);
        goalGfx.lineTo(paddle.endX + perpDx * endLineLength, paddle.endY + perpDy * endLineLength);
        
        paddle.goalGfx = goalGfx;
    }

    createBall() {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        this.ball = this.physics.add.sprite(centerX, centerY, 'ball');
        this.ball.setDisplaySize(24, 24);
        this.ball.body.setCircle(12);
        this.ball.body.setBounce(1, 1);
        this.ball.body.setCollideWorldBounds(false);

        // Collision with walls
        this.physics.add.collider(this.ball, this.walls);

        // Paddle collisions are handled manually in update() via checkBallPaddleCollisions()
        // because arcade physics doesn't support rotated bodies
    }

    /**
     * Manual ball-vs-paddle collision for rotated paddles.
     * - Transforms ball into the paddle's local coordinate space
     * - Checks overlap against the paddle rectangle
     * - Reflects velocity across the paddle normal
     * - Adjusts bounce angle based on where the ball hit along the paddle
     * - Pushes ball out so it doesn't re-trigger next frame
     */
    checkBallPaddleCollisions() {
        const ball = this.ball;
        const ballRadius = 12;
        const ballVx = ball.body.velocity.x;
        const ballVy = ball.body.velocity.y;
        const ballSpeed = Math.sqrt(ballVx * ballVx + ballVy * ballVy);
        if (ballSpeed === 0) return; // ball not moving

        for (const paddle of this.paddles) {
            const paddleAngle = paddle.goal.angle;
            const paddleWidth = settings.GOALIES_PADDLE_WIDTH;
            const paddleHeight = 20;
            const halfW = paddleWidth / 2;
            const halfH = paddleHeight / 2;

            // Vector from paddle center to ball
            const dx = ball.x - paddle.x;
            const dy = ball.y - paddle.y;

            // Rotate into paddle-local coordinates (undo paddle rotation)
            const cosA = Math.cos(-paddleAngle);
            const sinA = Math.sin(-paddleAngle);
            const localX = dx * cosA - dy * sinA;
            const localY = dx * sinA + dy * cosA;

            // Closest point on paddle rectangle to ball center (in local space)
            const clampX = Phaser.Math.Clamp(localX, -halfW, halfW);
            const clampY = Phaser.Math.Clamp(localY, -halfH, halfH);

            const distX = localX - clampX;
            const distY = localY - clampY;
            const distSq = distX * distX + distY * distY;

            if (distSq > ballRadius * ballRadius) continue; // no collision

            // --- Collision detected! ---

            // Paddle's outward normal points from the wall toward the arena center.
            // The wall tangent direction is (cos(paddleAngle), sin(paddleAngle)).
            // The perpendicular (inward toward center) is determined by checking
            // which side the arena center is on.
            const centerX = this.scale.width / 2;
            const centerY = this.scale.height / 2;
            const toCenterX = centerX - paddle.x;
            const toCenterY = centerY - paddle.y;

            // Two candidate normals: ±90° from wall direction
            let normalAngle = paddleAngle + Math.PI / 2;
            let nx = Math.cos(normalAngle);
            let ny = Math.sin(normalAngle);

            // Pick the normal that points toward the center
            if (toCenterX * nx + toCenterY * ny < 0) {
                normalAngle += Math.PI;
                nx = -nx;
                ny = -ny;
            }

            // Determine where the ball hit along the paddle (-1 = left edge, +1 = right edge)
            const hitRatio = Phaser.Math.Clamp(localX / halfW, -1, 1);

            // Calculate bounce angle based on hit position
            // -70° to +70° from the paddle normal (70 degrees = ~1.22 radians)
            const maxAngle = 70 * Math.PI / 180; // 70 degrees in radians
            const bounceAngleOffset = (-hitRatio) * maxAngle;
            
            // The bounce angle is the normal angle plus the offset
            const bounceAngle = normalAngle + bounceAngleOffset;

            // Apply speedup ratio to current ball speed, but keep at least the minimum speed
            const minSpeed = settings.GOALIES_BALL_SPEED * 0.8;
            const outSpeed = Math.max(ballSpeed * settings.GOALIES_BALL_SPEEDUP_RATIO, minSpeed);
            ball.body.setVelocity(
                Math.cos(bounceAngle) * outSpeed,
                Math.sin(bounceAngle) * outSpeed
            );

            // Push ball out of paddle from its current position along the normal
            // so it doesn't re-trigger collision next frame
            const penetration = ballRadius - Math.sqrt(Math.max(distSq, 0.01));
            const pushDist = penetration + 10; // extra margin to clear the paddle
            ball.setPosition(
                ball.x + nx * pushDist,
                ball.y + ny * pushDist
            );

            // Only handle one paddle collision per frame
            break;
        }
    }

    createHUD() {
        const w = this.scale.width;
        const y = 20;
        let x = 20;

        this.hudEntries = {};
        for (const idx of this.padIndices) {
            const color = getPlayerColor(idx);
            const gfx = this.add.graphics();
            gfx.fillStyle(color, 1);
            gfx.fillCircle(x, y, 10);

            const txt = this.add.text(x + 20, y, getPlayerName(idx) + ': 0', {
                fontFamily: 'Arial', fontSize: '18px', color: '#ffffff',
                stroke: '#000000', strokeThickness: 3
            });

            this.hudEntries[idx] = { gfx, txt };
            x += 150;
        }

        // Countdown text
        this.countdownText = this.add.text(w / 2, this.scale.height / 2, '', {
            fontFamily: 'Arial', fontSize: '72px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 8, fontStyle: 'bold'
        }).setOrigin(0.5).setVisible(false);

        // Goal message
        this.goalText = this.add.text(w / 2, this.scale.height / 2 - 50, '', {
            fontFamily: 'Arial', fontSize: '48px', color: '#ff0000',
            stroke: '#000000', strokeThickness: 6, fontStyle: 'bold'
        }).setOrigin(0.5).setVisible(false);
    }

    updateHUD() {
        for (const idx of this.padIndices) {
            const entry = this.hudEntries[idx];
            if (entry) {
                entry.txt.setText(getPlayerName(idx) + ': ' + (this.scores[idx] || 0));
            }
        }
    }

    startRound() {
        this.roundActive = false;
        this.countdownActive = true;
        this.countdownTime = settings.GOALIES_ROUND_COUNTDOWN;

        // Reset ball to center
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        this.ball.setPosition(centerX, centerY);
        this.ball.body.setVelocity(0, 0);

        // Reset paddles to middle of goals
        for (const paddle of this.paddles) {
            paddle.setPosition(paddle.goal.x, paddle.goal.y);
        }

        this.goalText.setVisible(false);
    }

    update(time, delta) {
        if (this.gameOver) return;

        // Handle countdown
        if (this.countdownActive) {
            // Check for winner even during countdown
            for (const idx of this.padIndices) {
                if (this.scores[idx] >= settings.GOALIES_WIN_TARGET) {
                    this.endGame(idx);
                    return;
                }
            }

            this.countdownTime -= delta;
            const seconds = Math.ceil(this.countdownTime / 1000);

            if (seconds > 0) {
                this.countdownText.setText(seconds);
                this.countdownText.setVisible(true);
            } else {
                this.countdownText.setVisible(false);
                this.countdownActive = false;
                
                // Check for winner one more time before starting round
                for (const idx of this.padIndices) {
                    if (this.scores[idx] >= settings.GOALIES_WIN_TARGET) {
                        this.endGame(idx);
                        return;
                    }
                }

                this.roundActive = true;

                // Launch ball in random direction
                const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
                const speed = settings.GOALIES_BALL_SPEED;
                this.ball.body.setVelocity(
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed
                );
            }
            return;
        }

        if (!this.roundActive) return;

        // Handle paddle movement
        for (const paddle of this.paddles) {
            const pad = inputManager.getPad(paddle.playerIndex);
            if (!pad || !pad.connected) continue;

            // Get left stick X axis (axis 0)
            const axisX = pad.axes.length > 0 ? pad.axes[0].getValue() : 0;

            // Move paddle along the wall (goal line direction)
            const wallDx = Math.cos(paddle.goal.angle);
            const wallDy = Math.sin(paddle.goal.angle);
            
            let speed = settings.GOALIES_PADDLE_SPEED;
            if (wallDx < 0) {
                speed = -speed;
            }

            // Calculate new position along the wall line
            const newX = paddle.x + axisX * speed * (delta / 1000) * wallDx;
            const newY = paddle.y + axisX * speed * (delta / 1000) * wallDy;

            // Constrain to goal line bounds
            // Project current position onto wall line to get parameter t (0 to 1)
            const toPaddleX = newX - paddle.startX;
            const toPaddleY = newY - paddle.startY;
            const wallLength = Math.sqrt(
                Math.pow(paddle.endX - paddle.startX, 2) + 
                Math.pow(paddle.endY - paddle.startY, 2)
            );
            let t = (toPaddleX * wallDx + toPaddleY * wallDy) / wallLength;
            t = Phaser.Math.Clamp(t, 0, 1);

            // Calculate constrained position along wall
            const clampedX = paddle.startX + t * (paddle.endX - paddle.startX);
            const clampedY = paddle.startY + t * (paddle.endY - paddle.startY);

            paddle.setPosition(clampedX, clampedY);
        }

        // Check ball-paddle collisions manually (rotated bodies)
        this.checkBallPaddleCollisions();

        // Check for goals - ball must be past the goal line
        for (let i = 0; i < this.goals.length; i++) {
            const goal = this.goals[i];
            const ballX = this.ball.x;
            const ballY = this.ball.y;

            // Calculate distance from ball to goal center line
            const goalDx = Math.cos(goal.angle);
            const goalDy = Math.sin(goal.angle);
            const perpDx = -goalDy;
            const perpDy = goalDx;

            // Vector from goal center to ball
            const toBallX = ballX - goal.x;
            const toBallY = ballY - goal.y;

            // Project onto perpendicular (distance from goal line)
            const perpDist = Math.abs(toBallX * perpDx + toBallY * perpDy);

            // Project onto goal line (position along goal)
            const alongDist = toBallX * goalDx + toBallY * goalDy;

            // Check if ball is past goal line (within goal width) and close enough
            if (perpDist < 15 && Math.abs(alongDist) < goal.width / 2) {
                // Goal scored!
                this.onGoal(goal.playerIndex);
                return;
            }
        }

        // Check for winner
        for (const idx of this.padIndices) {
            if (this.scores[idx] >= settings.GOALIES_WIN_TARGET) {
                this.endGame(idx);
                return;
            }
        }
    }

    onGoal(scoredOnPlayerIndex) {
        this.roundActive = false;

        // All other players get a point
        for (const idx of this.padIndices) {
            if (idx !== scoredOnPlayerIndex) {
                this.scores[idx] = (this.scores[idx] || 0) + 1;
            }
        }

        this.updateHUD();

        // Check for winner immediately after updating scores
        for (const idx of this.padIndices) {
            if (this.scores[idx] >= settings.GOALIES_WIN_TARGET) {
                this.endGame(idx);
                return; // Don't start a new round if someone won
            }
        }

        // Show goal message
        this.goalText.setText('GOAL!');
        this.goalText.setVisible(true);

        // Start new round after delay
        this.time.delayedCall(1000, () => {
            // Check again before starting new round (in case winner was reached during delay)
            if (!this.gameOver) {
                this.startRound();
            }
        });
    }

    endGame(winnerIndex) {
        this.gameOver = true;
        this.roundActive = false;

        // Stop ball
        if (this.ball && this.ball.body) {
            this.ball.body.setVelocity(0, 0);
        }

        // Transition to winner scene
        this.time.delayedCall(1000, () => {
            this.scene.start(SCENE.GOALIES_WINNER, {
                winnerIndex,
                scores: this.scores,
                padIndices: this.padIndices
            });
        });
    }

    onPadDisconnected(pad) {
        const idx = pad.index;
        const paddleIndex = this.paddles.findIndex(p => p.playerIndex === idx);
        if (paddleIndex !== -1) {
            const paddle = this.paddles[paddleIndex];
            paddle.destroy();
            if (paddle.goalGfx) paddle.goalGfx.destroy();
            this.paddles.splice(paddleIndex, 1);
        }

        const goalIndex = this.goals.findIndex(g => g.playerIndex === idx);
        if (goalIndex !== -1) {
            this.goals.splice(goalIndex, 1);
        }

        const padIndex = this.padIndices.indexOf(idx);
        if (padIndex !== -1) {
            this.padIndices.splice(padIndex, 1);
        }

        delete this.scores[idx];
        if (this.hudEntries[idx]) {
            this.hudEntries[idx].gfx.destroy();
            this.hudEntries[idx].txt.destroy();
            delete this.hudEntries[idx];
        }

        // If less than 3 players, end game
        if (this.padIndices.length < 3) {
            // Find winner from remaining players
            let maxScore = -1;
            let winner = null;
            for (const idx of this.padIndices) {
                if (this.scores[idx] > maxScore) {
                    maxScore = this.scores[idx];
                    winner = idx;
                }
            }
            if (winner !== null) {
                this.endGame(winner);
            } else {
                this.scene.start(SCENE.GOALIES_MENU);
            }
        }
    }
}

export { GoaliesScene };

