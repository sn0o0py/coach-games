// ============================================================
// Maze Generator – Recursive Backtracking Algorithm
// ============================================================

/**
 * Generates a perfect maze using recursive backtracking.
 * @param {number} width - Number of cells wide
 * @param {number} height - Number of cells tall
 * @returns {Object} Maze data with cells array and dimensions
 */
export function generateMaze(width, height) {
    // Initialize all cells with all walls
    const cells = [];
    for (let y = 0; y < height; y++) {
        cells[y] = [];
        for (let x = 0; x < width; x++) {
            cells[y][x] = {
                north: true,
                south: true,
                east: true,
                west: true,
                visited: false
            };
        }
    }

    // Start from top-left corner
    const stack = [{ x: 0, y: 0 }];
    cells[0][0].visited = true;

    // Directions: [dx, dy, wallToRemove, oppositeWall]
    const directions = [
        [0, -1, 'north', 'south'],  // Up
        [1, 0, 'east', 'west'],    // Right
        [0, 1, 'south', 'north'],  // Down
        [-1, 0, 'west', 'east']    // Left
    ];

    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const { x, y } = current;

        // Find unvisited neighbors
        const neighbors = [];
        for (const [dx, dy, wall, oppositeWall] of directions) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height && !cells[ny][nx].visited) {
                neighbors.push({ x: nx, y: ny, wall, oppositeWall });
            }
        }

        if (neighbors.length > 0) {
            // Choose random unvisited neighbor
            const next = neighbors[Math.floor(Math.random() * neighbors.length)];

            // Remove walls between current and next
            cells[y][x][next.wall] = false;
            cells[next.y][next.x][next.oppositeWall] = false;

            // Mark next as visited and push to stack
            cells[next.y][next.x].visited = true;
            stack.push({ x: next.x, y: next.y });
        } else {
            // Backtrack
            stack.pop();
        }
    }

    // Remove visited flags (no longer needed)
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            delete cells[y][x].visited;
        }
    }

    return {
        cells,
        width,
        height
    };
}

/**
 * Get the exit position (opposite corner from start)
 * @param {Object} maze - Maze data from generateMaze
 * @returns {Object} {x, y} in cell coordinates
 */
export function getExitPosition(maze) {
    return {
        x: maze.width - 1,
        y: maze.height - 1
    };
}

/**
 * Get the start position (top-left corner)
 * @param {Object} maze - Maze data from generateMaze
 * @returns {Object} {x, y} in cell coordinates
 */
export function getStartPosition(maze) {
    return {
        x: 0,
        y: 0
    };
}

