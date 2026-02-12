// ============================================================
// SequenceScene – Sequence Challenge Game
// ============================================================

import { SCENE } from '../../../../shared/constants.js';
import { generateAllTextures } from '../../textures.js';
import { inputManager } from '../../InputManager.js';
import { settings } from '../../settings.js';
import { getPlayerColor, getPlayerName, hexStr } from '../../utils.js';
import { initPauseManager } from '../../pauseManager.js';

const GAME_STATE = {
    COUNTDOWN: 'countdown',
    DISPLAYING: 'displaying',
    INPUT: 'input',
    ROUND_END: 'round_end',
    GAME_END: 'game_end'
};

class SequenceScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENE.SEQUENCE });
    }

    init(data) {
        this.padIndices = data.padIndices || [];
    }

    preload() {
        generateAllTextures(this);
    }

    create() {
        inputManager.setPhaserGamepad(this.input.gamepad);
        inputManager.broadcastScene(SCENE.SEQUENCE);
        inputManager.broadcastState('countdown'); // Initial state

        const w = this.scale.width;
        const h = this.scale.height;

        // Initialize players
        this.players = [];
        for (const idx of this.padIndices) {
            const pad = inputManager.getPad(idx);
            if (pad && pad.connected) {
                this.players.push({
                    padIndex: idx,
                    inputSequence: [],
                    eliminated: false,
                    completed: false,
                    joinedMidGame: false
                });
            }
        }
        // Initialize previous round survivors with all initial players
        this.previousRoundSurvivors = this.players.map(p => p.padIndex);

        // Game state
        this.gameState = GAME_STATE.COUNTDOWN;
        this.currentRound = 1;
        this.currentSequence = [];
        this.countdownValue = 3;
        this.displayTimer = 0;
        this.inputTimer = 0;
        this.countdownTimer = 0;
        this.previousRoundSurvivors = []; // Track survivors from previous round

        // Button mapping: A=Green(0), B=Red(1), X=Blue(2), Y=Yellow(3)
        this.buttonToColor = [0, 1, 2, 3]; // A, B, X, Y map to color indices

        // UI elements
        this.sequenceSquares = [];
        this.countdownText = null;
        this.timerText = null;
        this.roundText = null;
        this.activePlayersPanel = null;
        this.activePlayersTexts = [];

        // Create UI
        this.createUI();

        // Start countdown
        this.startCountdown();

        // Handle late joiners
        this._wsConnectCb = (pad) => this.onWsPadConnected(pad);
        inputManager.onConnect(this._wsConnectCb);

        // Cleanup on shutdown
        if (this.events) {
            this.events.on('shutdown', () => {
                if (this._wsConnectCb) inputManager.offConnect(this._wsConnectCb);
            });
        }

        // Initialize pause manager
        initPauseManager(this, {
            stopEntities: function() {
                // No entities to stop in sequence game
            },
            returnScene: SCENE.SEQUENCE_MENU,
            currentScene: SCENE.SEQUENCE
        });
    }

    createUI() {
        const w = this.scale.width;
        const h = this.scale.height;

        // Round text (top center)
        this.roundText = this.add.text(w / 2, 40, '', {
            fontFamily: 'Arial', fontSize: '32px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 4, fontStyle: 'bold'
        }).setOrigin(0.5);

        // Countdown text (center)
        this.countdownText = this.add.text(w / 2, h / 2, '', {
            fontFamily: 'Arial', fontSize: '120px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 8, fontStyle: 'bold'
        }).setOrigin(0.5).setVisible(false);

        // Timer text (center, below sequence)
        this.timerText = this.add.text(w / 2, h / 2 + 200, '', {
            fontFamily: 'Arial', fontSize: '64px', color: '#00ff00',
            stroke: '#000000', strokeThickness: 6, fontStyle: 'bold'
        }).setOrigin(0.5).setVisible(false);

        // Memorization timer text (center, above sequence)
        this.memorizationTimerText = this.add.text(w / 2, h / 2 - 200, '', {
            fontFamily: 'Arial', fontSize: '48px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 4, fontStyle: 'bold'
        }).setOrigin(0.5).setVisible(false);

        // Active players panel (top-left)
        this.activePlayersPanel = this.add.container(20, 80);
        this.updateActivePlayersDisplay();
    }

    updateActivePlayersDisplay() {
        // Clear existing texts and graphics
        for (const txt of this.activePlayersTexts) {
            txt.destroy();
        }
        this.activePlayersTexts = [];
        
        // Clear all children from the panel (circles and texts)
        this.activePlayersPanel.removeAll(true);

        // Get all players except late joiners
        const displayPlayers = this.players.filter(p => !p.joinedMidGame);

        // Create player list
        displayPlayers.forEach((player, index) => {
            const y = index * 50;
            const color = getPlayerColor(player.padIndex);
            const name = getPlayerName(player.padIndex);
            const isEliminated = player.eliminated;

            // Color circle - darker/reddish if eliminated
            const circle = this.add.graphics();
            if (isEliminated) {
                // Use red tint for eliminated players
                circle.fillStyle(0xff0000, 0.6); // Red with transparency
            } else {
                circle.fillStyle(color, 1);
            }
            circle.fillCircle(15, y + 15, 12);
            circle.lineStyle(2, 0x000000, 1);
            circle.strokeCircle(15, y + 15, 12);
            this.activePlayersPanel.add(circle);

            // Name text - red if eliminated
            const nameText = this.add.text(35, y, name, {
                fontFamily: 'Arial', fontSize: '24px', 
                color: isEliminated ? '#ff0000' : '#ffffff',
                stroke: '#000000', strokeThickness: 2
            });
            this.activePlayersPanel.add(nameText);
            this.activePlayersTexts.push(nameText);
        });
    }

    startCountdown() {
        this.gameState = GAME_STATE.COUNTDOWN;
        this.countdownValue = Math.ceil(settings.SEQUENCE_COUNTDOWN_TIME / 1000);
        this.countdownTimer = settings.SEQUENCE_COUNTDOWN_TIME;
        this.countdownText.setVisible(true);
        this.countdownText.setText(this.countdownValue.toString());
        
        // Notify controller - countdown phase (buttons enabled but not active yet)
        inputManager.broadcastState('countdown');
    }

    generateSequence(length) {
        const sequence = [];
        for (let i = 0; i < length; i++) {
            sequence.push(Math.floor(Math.random() * 4)); // 0-3 for 4 colors
        }
        return sequence;
    }

    displaySequence() {
        this.gameState = GAME_STATE.DISPLAYING;
        const length = settings.SEQUENCE_INITIAL_LENGTH + (this.currentRound - 1);
        this.currentSequence = this.generateSequence(length);
        this.displayTimer = settings.SEQUENCE_DISPLAY_TIME;

        // Clear existing squares
        for (const sq of this.sequenceSquares) {
            sq.destroy();
        }
        this.sequenceSquares = [];

        // Create squares
        const w = this.scale.width;
        const h = this.scale.height;
        const squareSize = 80;
        const spacing = 20;
        const totalWidth = length * squareSize + (length - 1) * spacing;
        const startX = (w - totalWidth) / 2;
        const y = h / 2 - 100;

        for (let i = 0; i < length; i++) {
            const x = startX + i * (squareSize + spacing);
            const colorIndex = this.currentSequence[i];
            const color = settings.SEQUENCE_COLORS[colorIndex];

            const square = this.add.graphics();
            square.fillStyle(color, 1);
            square.fillRect(0, 0, squareSize, squareSize);
            square.lineStyle(4, 0x000000, 1);
            square.strokeRect(0, 0, squareSize, squareSize);
            square.setPosition(x, y);
            this.sequenceSquares.push(square);
        }

        this.countdownText.setVisible(false);
        this.timerText.setVisible(false);
        // Show memorization timer
        this.memorizationTimerText.setVisible(true);
        this.updateMemorizationTimer();
        
        // Notify controller to show memorization state
        inputManager.broadcastState('memorizing');
    }

    startInputPhase() {
        this.gameState = GAME_STATE.INPUT;
        this.inputTimer = settings.SEQUENCE_INPUT_TIME;

        // Clear sequence squares
        for (const sq of this.sequenceSquares) {
            sq.destroy();
        }
        this.sequenceSquares = [];

        // Reset player input
        for (const player of this.players) {
            if (!player.eliminated && !player.joinedMidGame) {
                player.inputSequence = [];
                player.completed = false;
            }
        }

        // Hide memorization timer, show input timer
        this.memorizationTimerText.setVisible(false);
        this.timerText.setVisible(true);
        this.updateTimerDisplay();
        
        // Notify controller to enable buttons (input phase)
        inputManager.broadcastState('input');
    }

    updateMemorizationTimer() {
        const seconds = Math.ceil(this.displayTimer / 1000);
        this.memorizationTimerText.setText(seconds.toString());
    }

    updateTimerDisplay() {
        const seconds = Math.ceil(this.inputTimer / 1000);
        this.timerText.setText(seconds.toString());

        // Color changes as time runs low
        if (seconds <= 3) {
            this.timerText.setColor('#ff0000'); // Red
        } else if (seconds <= 5) {
            this.timerText.setColor('#ffff00'); // Yellow
        } else {
            this.timerText.setColor('#00ff00'); // Green
        }
    }

    processInput(player, buttonIndex) {
        if (player.eliminated || player.joinedMidGame || player.completed) return;

        const colorIndex = this.buttonToColor[buttonIndex];
        const expectedIndex = player.inputSequence.length;
        
        if (expectedIndex >= this.currentSequence.length) {
            // Already completed
            return;
        }

        const expectedColor = this.currentSequence[expectedIndex];
        
        if (colorIndex === expectedColor) {
            // Correct input
            player.inputSequence.push(colorIndex);
            
            // Check if sequence is complete
            if (player.inputSequence.length === this.currentSequence.length) {
                player.completed = true;
            }
        } else {
            // Wrong input - eliminate
            player.eliminated = true;
            this.updateActivePlayersDisplay();
            // Notify the eliminated player immediately
            inputManager.sendPlayerMessage(player.padIndex, 'eliminated');
        }
    }

    endInputPhase() {
        // Eliminate players who didn't complete in time
        for (const player of this.players) {
            if (!player.eliminated && !player.joinedMidGame && !player.completed) {
                player.eliminated = true;
                // Notify the eliminated player immediately
                inputManager.sendPlayerMessage(player.padIndex, 'eliminated');
            }
        }
        this.updateActivePlayersDisplay();

        // Check game end conditions
        const activePlayers = this.players.filter(p => !p.eliminated && !p.joinedMidGame);
        
        // Track survivors for this round
        const currentSurvivors = activePlayers.map(p => p.padIndex);
        
        if (activePlayers.length <= 1) {
            this.gameState = GAME_STATE.GAME_END;
            // If all eliminated, use previous round survivors; otherwise use current survivors
            const winners = activePlayers.length === 0 && this.previousRoundSurvivors.length > 0
                ? this.previousRoundSurvivors
                : currentSurvivors;
            this.endGame(winners);
        } else {
            // Save current survivors for next round
            this.previousRoundSurvivors = currentSurvivors;
            this.gameState = GAME_STATE.ROUND_END;
            // Brief pause before next round
            this.time.delayedCall(2000, () => {
                this.nextRound();
            });
        }
    }

    nextRound() {
        this.currentRound++;
        this.startCountdown();
    }

    endGame(winnerIndices) {
        // Transition to winner scene
        this.scene.start(SCENE.SEQUENCE_WINNER, { 
            winnerIndices: winnerIndices,
            padIndices: this.padIndices 
        });
    }

    onWsPadConnected(pad) {
        // Check if this pad is already in players
        const existing = this.players.find(p => p.padIndex === pad.index);
        if (existing) return;

        // Late joiner - mark as eliminated
        this.players.push({
            padIndex: pad.index,
            inputSequence: [],
            eliminated: true,
            completed: false,
            joinedMidGame: true
        });
        this.updateActivePlayersDisplay();
    }

    update(time, delta) {
        if (this.isPaused) {
            this.handlePauseInput(time, delta);
            return;
        }

        // Update round text
        this.roundText.setText(`Round ${this.currentRound}`);

        // State-specific updates
        if (this.gameState === GAME_STATE.COUNTDOWN) {
            this.countdownTimer -= delta;
            const newValue = Math.ceil(this.countdownTimer / 1000);
            if (newValue !== this.countdownValue && newValue > 0) {
                this.countdownValue = newValue;
                this.countdownText.setText(this.countdownValue.toString());
            } else if (this.countdownTimer <= 0) {
                this.countdownText.setText('GO!');
                this.time.delayedCall(500, () => {
                    this.displaySequence();
                });
            }
        } else if (this.gameState === GAME_STATE.DISPLAYING) {
            this.displayTimer -= delta;
            this.updateMemorizationTimer();
            if (this.displayTimer <= 0) {
                this.startInputPhase();
            }
        } else if (this.gameState === GAME_STATE.INPUT) {
            this.inputTimer -= delta;
            this.updateTimerDisplay();
            
            if (this.inputTimer <= 0) {
                this.endInputPhase();
            }

            // Process input from all players
            for (const player of this.players) {
                if (player.eliminated || player.joinedMidGame || player.completed) continue;

                const pad = inputManager.getPad(player.padIndex);
                if (!pad || !pad.connected) continue;

                // Check buttons: A(0), B(1), X(2), Y(3)
                for (let btnIdx = 0; btnIdx < 4; btnIdx++) {
                    const btn = pad.buttons[btnIdx];
                    if (btn && btn.pressed) {
                        // Use debouncing - only process on press, not hold
                        if (!player._buttonStates) player._buttonStates = [false, false, false, false];
                        if (btn.pressed && !player._buttonStates[btnIdx]) {
                            player._buttonStates[btnIdx] = true;
                            this.processInput(player, btnIdx);
                        }
                    } else {
                        if (player._buttonStates) player._buttonStates[btnIdx] = false;
                    }
                }
            }
        }
    }
}

export { SequenceScene };

