// ============================================================
// MazeScene – Maze Racing Game
// ============================================================

import { SCENE } from '../../../../shared/constants.js';
import { generateAllTextures } from '../../textures.js';
import { inputManager } from '../../InputManager.js';
import { settings } from '../../settings.js';
import { getPlayerColor, getPlayerName, hexStr } from '../../utils.js';
import { generateMaze, getStartPosition, getExitPosition } from '../../mazeGenerator.js';
import { initPauseManager } from '../../pauseManager.js';

class MazeScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENE.MAZE });
    }

    init(data) {
        this.padIndices = data.padIndices || [];
    }

    preload() {
        generateAllTextures(this);
    }

    create() {
        inputManager.setPhaserGamepad(this.input.gamepad);
        inputManager.broadcastScene(SCENE.MAZE);

        // Maze configuration
        const CELL_SIZE = 50;
        const WALL_THICKNESS = 4;
        const DESIRED_MAZE_SIZE = settings.MAZE_SIZE;
        
        // Get screen dimensions and calculate maximum maze dimensions that fit
        const w = this.scale.width;
        const h = this.scale.height;
        const MARGIN = 40; // Margin from screen edges
        const maxMazeWidth = w - MARGIN * 2;
        const maxMazeHeight = h - MARGIN * 2;
        
        // Shrink width and height independently to fit screen
        const MAZE_WIDTH = Math.min(DESIRED_MAZE_SIZE, maxMazeWidth);
        const MAZE_HEIGHT = Math.min(DESIRED_MAZE_SIZE, maxMazeHeight);
        const MAZE_COLS = Math.floor(MAZE_WIDTH / CELL_SIZE);
        const MAZE_ROWS = Math.floor(MAZE_HEIGHT / CELL_SIZE);

        this.mazeConfig = {
            width: MAZE_WIDTH,
            height: MAZE_HEIGHT,
            cellSize: CELL_SIZE,
            wallThickness: WALL_THICKNESS,
            cols: MAZE_COLS,
            rows: MAZE_ROWS
        };

        // Center maze on screen
        this.mazeOffsetX = (w - MAZE_WIDTH) / 2;
        this.mazeOffsetY = (h - MAZE_HEIGHT) / 2;

        // Generate maze
        const mazeData = generateMaze(MAZE_COLS, MAZE_ROWS);
        this.mazeData = mazeData;

        // Physics world bounds
        this.physics.world.setBounds(
            this.mazeOffsetX,
            this.mazeOffsetY,
            MAZE_WIDTH,
            MAZE_HEIGHT
        );

        // Groups
        this.walls = this.physics.add.staticGroup();
        this.players = [];

        // Generate and render walls
        this.createWalls(mazeData);

        // Get start and exit positions
        const startCell = getStartPosition(mazeData);
        const exitCell = getExitPosition(mazeData);
        this.startX = this.mazeOffsetX + startCell.x * CELL_SIZE + CELL_SIZE / 2;
        this.startY = this.mazeOffsetY + startCell.y * CELL_SIZE + CELL_SIZE / 2;
        this.exitX = this.mazeOffsetX + exitCell.x * CELL_SIZE + CELL_SIZE / 2;
        this.exitY = this.mazeOffsetY + exitCell.y * CELL_SIZE + CELL_SIZE / 2;
        this.exitRadius = CELL_SIZE / 2;

        // Create exit marker
        const exitGfx = this.add.graphics();
        exitGfx.fillStyle(0x00ff00, 0.3);
        exitGfx.fillCircle(this.exitX, this.exitY, this.exitRadius);
        exitGfx.lineStyle(3, 0x00ff00, 0.8);
        exitGfx.strokeCircle(this.exitX, this.exitY, this.exitRadius);
        this.exitMarker = exitGfx;

        // Add exit text
        this.exitText = this.add.text(this.exitX, this.exitY, 'EXIT', {
            fontFamily: 'Arial', fontSize: '16px', color: '#00ff00',
            stroke: '#000000', strokeThickness: 2, fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(100);

        // Spawn all players at start position
        for (const idx of this.padIndices) {
            const pad = inputManager.getPad(idx);
            if (pad && pad.connected) {
                this.spawnPlayer(idx, pad);
            }
        }

        // Game state
        this.gameOver = false;
        this.winnerIndex = null;

        // Handle disconnects
        this.input.gamepad.on('disconnected', (pad) => this.onPadDisconnected(pad));
        this._wsDisconnectCb = (pad) => this.onPadDisconnected(pad);
        inputManager.onDisconnect(this._wsDisconnectCb);

        // Handle connects
        this._wsConnectCb = (pad) => this.onWsPadConnected(pad);
        inputManager.onConnect(this._wsConnectCb);

        // Cleanup on shutdown
        this.events.on('shutdown', () => {
            if (this._wsConnectCb) inputManager.offConnect(this._wsConnectCb);
            if (this._wsDisconnectCb) inputManager.offDisconnect(this._wsDisconnectCb);
        });

        // Initialize pause manager
        initPauseManager(this, {
            stopEntities: function() {
                // Stop all player velocities
                for (const player of this.players) {
                    if (player && player.alive) {
                        player.sprite.body.setVelocity(0, 0);
                    }
                }
            },
            returnScene: SCENE.MAZE_MENU,
            currentScene: SCENE.MAZE
        });
    }

    createWalls(mazeData) {
        const { cellSize, wallThickness } = this.mazeConfig;
        const { cells, width, height } = mazeData;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const cell = cells[y][x];
                const cellX = this.mazeOffsetX + x * cellSize;
                const cellY = this.mazeOffsetY + y * cellSize;

                // Draw walls
                if (cell.north) {
                    const wall = this.add.rectangle(
                        cellX + cellSize / 2,
                        cellY,
                        cellSize,
                        wallThickness,
                        0x888888
                    );
                    this.physics.add.existing(wall, true);
                    wall.body.setSize(cellSize, wallThickness);
                    this.walls.add(wall);
                }

                if (cell.south) {
                    const wall = this.add.rectangle(
                        cellX + cellSize / 2,
                        cellY + cellSize,
                        cellSize,
                        wallThickness,
                        0x888888
                    );
                    this.physics.add.existing(wall, true);
                    wall.body.setSize(cellSize, wallThickness);
                    this.walls.add(wall);
                }

                if (cell.east) {
                    const wall = this.add.rectangle(
                        cellX + cellSize,
                        cellY + cellSize / 2,
                        wallThickness,
                        cellSize,
                        0x888888
                    );
                    this.physics.add.existing(wall, true);
                    wall.body.setSize(wallThickness, cellSize);
                    this.walls.add(wall);
                }

                if (cell.west) {
                    const wall = this.add.rectangle(
                        cellX,
                        cellY + cellSize / 2,
                        wallThickness,
                        cellSize,
                        0x888888
                    );
                    this.physics.add.existing(wall, true);
                    wall.body.setSize(wallThickness, cellSize);
                    this.walls.add(wall);
                }
            }
        }
    }

    spawnPlayer(playerIndex, pad) {
        const playerColor = getPlayerColor(playerIndex);
        const radius = 12;

        // Create player circle sprite with physics
        // First create a simple circle texture
        const gfx = this.add.graphics();
        gfx.fillStyle(playerColor, 1);
        gfx.fillCircle(radius, radius, radius);
        gfx.lineStyle(2, 0x000000, 1);
        gfx.strokeCircle(radius, radius, radius);
        gfx.generateTexture('player_circle_' + playerIndex, radius * 2, radius * 2);
        gfx.destroy();

        // Create physics sprite
        const player = this.physics.add.sprite(this.startX, this.startY, 'player_circle_' + playerIndex);
        player.setCircle(radius);
        player.setDepth(50);
        player.setCollideWorldBounds(true);

        // Create player object
        const playerObj = {
            playerIndex,
            pad,
            sprite: player,
            alive: true
        };

        this.players.push(playerObj);

        // Collision with walls
        this.physics.add.collider(player, this.walls);

        // Player name label
        const nameText = this.add.text(0, 0, getPlayerName(playerIndex), {
            fontFamily: 'Arial', fontSize: '12px', color: hexStr(playerColor),
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(51);
        playerObj.nameText = nameText;
    }

    onPadDisconnected(pad) {
        const idx = pad.index;
        const player = this.players.find(p => p && p.playerIndex === idx);
        if (player) {
            this.destroyPlayer(player);
        }
    }

    onWsPadConnected(pad) {
        if (this.gameOver) return;
        const idx = pad.index;
        if (this.players.find(p => p && p.playerIndex === idx)) return;

        this.spawnPlayer(idx, pad);
    }

    destroyPlayer(player) {
        if (!player) return;
        player.alive = false;
        if (player.sprite) {
            // Remove texture
            if (this.textures.exists('player_circle_' + player.playerIndex)) {
                this.textures.remove('player_circle_' + player.playerIndex);
            }
            player.sprite.destroy();
        }
        if (player.nameText) player.nameText.destroy();

        const idx = this.players.indexOf(player);
        if (idx !== -1) this.players.splice(idx, 1);
    }

    update() {
        // Handle pause input
        if (this.handlePauseInput()) {
            return; // Paused - skip rest of update
        }

        if (this.gameOver) return;

        // Update player movement
        for (const player of this.players) {
            if (!player || !player.alive) continue;
            this.updatePlayerInput(player);
        }

        // Check win condition
        this.checkWinCondition();
    }

    updatePlayerInput(player) {
        const pad = player.pad;
        if (!pad || !pad.connected) return;

        // Left stick: movement
        let lx = pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
        let ly = pad.axes.length > 1 ? pad.axes[1].getValue() : 0;
        if (Math.abs(lx) < settings.DEADZONE) lx = 0;
        if (Math.abs(ly) < settings.DEADZONE) ly = 0;

        const magnitude = Math.min(1, Math.sqrt(lx * lx + ly * ly));
        if (magnitude > settings.DEADZONE) {
            const moveAngle = Math.atan2(ly, lx);
            const speed = settings.MAZE_PLAYER_SPEED * magnitude;
            player.sprite.body.setVelocity(
                Math.cos(moveAngle) * speed,
                Math.sin(moveAngle) * speed
            );
        } else {
            player.sprite.body.setVelocity(0, 0);
        }

        // Update name label position
        if (player.nameText) {
            player.nameText.setPosition(player.sprite.x, player.sprite.y - 20);
        }
    }

    checkWinCondition() {
        if (this.gameOver) return;

        for (const player of this.players) {
            if (!player || !player.alive) continue;

            const dist = Phaser.Math.Distance.Between(
                player.sprite.x,
                player.sprite.y,
                this.exitX,
                this.exitY
            );

            if (dist < this.exitRadius) {
                this.triggerWin(player.playerIndex);
                return;
            }
        }
    }

    triggerWin(winnerIndex) {
        this.gameOver = true;
        this.winnerIndex = winnerIndex;

        // Freeze all players
        for (const player of this.players) {
            if (player && player.alive) {
                player.sprite.body.setVelocity(0, 0);
            }
        }

        // "GAME OVER" overlay
        const w = this.scale.width;
        const h = this.scale.height;
        this.add.text(w / 2, h / 2, 'GAME OVER', {
            fontFamily: 'Arial', fontSize: '64px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 8, fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(300);

        // Transition to MazeWinnerScene after a brief pause
        this.time.delayedCall(1500, () => {
            this.scene.start(SCENE.MAZE_WINNER, {
                winnerIndex,
                padIndices: [...this.padIndices]
            });
        });
    }
}

export { MazeScene };

