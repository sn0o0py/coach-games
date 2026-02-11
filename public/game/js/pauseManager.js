// ============================================================
// Pause Manager – Common Pause Functionality
// ============================================================

import { inputManager } from './InputManager.js';

/**
 * Initialize pause functionality for a game scene
 * @param {Phaser.Scene} scene - The scene instance
 * @param {Object} options - Configuration options
 * @param {Function} options.stopEntities - Function to stop all entities (tanks, players, etc.)
 * @param {string} options.returnScene - Scene key to return to when exiting
 * @param {string} options.currentScene - Scene key for resume broadcast
 */
export function initPauseManager(scene, options) {
    const { stopEntities, returnScene, currentScene } = options;

    // Pause state
    scene.isPaused = false;
    scene._prevStart = true;  // start as true to avoid triggering on scene entry
    scene._prevA = true;
    scene.pauseOverlay = null;

    // Cleanup on shutdown
    scene.events.on('shutdown', () => {
        if (scene.pauseOverlay) {
            scene.pauseOverlay.forEach(obj => obj.destroy());
            scene.pauseOverlay = null;
        }
    });

    scene.pauseGame = function() {
        this.isPaused = true;
        this.physics.world.pause();

        // Stop all entities
        if (stopEntities) {
            stopEntities.call(this);
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
    };

    scene.resumeGame = function() {
        this.isPaused = false;
        this.physics.world.resume();
        this.tweens.resumeAll();
        this.time.paused = false;

        if (this.pauseOverlay) {
            this.pauseOverlay.forEach(obj => obj.destroy());
            this.pauseOverlay = null;
        }

        if (currentScene) {
            inputManager.broadcastScene(currentScene);
        }
    };

    /**
     * Handle pause input - call this from the scene's update method
     * @returns {boolean} - Returns true if paused (should skip rest of update)
     */
    scene.handlePauseInput = function() {
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

                if (returnScene) {
                    this.scene.start(returnScene);
                }
            }
            this._prevA = aPressed;
            return true; // Paused - skip rest of update
        }

        return false; // Not paused - continue update
    };
}

