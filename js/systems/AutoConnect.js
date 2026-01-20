// AutoConnect.js - Two-click infrastructure pathfinding and placement
// Click 1: Select start point (existing infrastructure)
// Click 2: Select end point (destination) - auto-draws path between them

export class AutoConnect {
    constructor(game) {
        this.game = game;
        this.enabled = false; // Auto-connect mode disabled by default
        this.supportedTools = ['road', 'powerLine', 'wall'];

        // Two-click state
        this.startPoint = null; // First click - start of path
        this.waitingForEnd = false; // True after first click, waiting for second
    }

    // Check if auto-connect should handle this tool
    supportsAutoConnect(toolId) {
        return this.enabled && this.supportedTools.includes(toolId);
    }

    // Reset the two-click state
    resetState() {
        this.startPoint = null;
        this.waitingForEnd = false;
        console.log('[AutoConnect] State reset');
    }

    // Get current state for UI feedback
    getState() {
        return {
            enabled: this.enabled,
            startPoint: this.startPoint,
            waitingForEnd: this.waitingForEnd
        };
    }

    // Check if tile has infrastructure of given type
    hasInfrastructure(x, y, infraType) {
        const tileMap = this.game.tileMap;
        if (!tileMap) return false;
        const tile = tileMap.getTile(x, y);
        return tile?.building?.type === infraType;
    }

    // Find path from start to end avoiding obstacles
    findPath(startX, startY, endX, endY, infraType) {
        const tileMap = this.game.tileMap;
        if (!tileMap) return [];

        console.log(`[AutoConnect] Finding path from (${startX},${startY}) to (${endX},${endY})`);

        // A* pathfinding
        const openSet = [{ x: startX, y: startY, g: 0, h: 0, f: 0, parent: null }];
        const closedSet = new Set();
        const directions = [
            { dx: 0, dy: -1 }, // up
            { dx: 0, dy: 1 },  // down
            { dx: -1, dy: 0 }, // left
            { dx: 1, dy: 0 }   // right
        ];

        const heuristic = (x, y) => Math.abs(x - endX) + Math.abs(y - endY);

        let iterations = 0;
        const maxIterations = 10000;

        while (openSet.length > 0 && iterations < maxIterations) {
            iterations++;

            // Find node with lowest f score
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift();
            const currentKey = `${current.x},${current.y}`;

            // Reached destination?
            if (current.x === endX && current.y === endY) {
                // Reconstruct path
                const path = [];
                let node = current;
                while (node) {
                    path.unshift({ x: node.x, y: node.y });
                    node = node.parent;
                }
                console.log(`[AutoConnect] Path found with ${path.length} tiles`);
                return path;
            }

            closedSet.add(currentKey);

            // Explore neighbors
            for (const dir of directions) {
                const nx = current.x + dir.dx;
                const ny = current.y + dir.dy;
                const nkey = `${nx},${ny}`;

                if (closedSet.has(nkey)) continue;
                if (!this.canPlaceInfra(nx, ny, infraType)) continue;

                const g = current.g + 1;
                const h = heuristic(nx, ny);
                const f = g + h;

                // Check if already in open set with better score
                const existing = openSet.find(n => n.x === nx && n.y === ny);
                if (existing) {
                    if (g < existing.g) {
                        existing.g = g;
                        existing.f = f;
                        existing.parent = current;
                    }
                } else {
                    openSet.push({ x: nx, y: ny, g, h, f, parent: current });
                }
            }
        }

        // No path found
        console.log('[AutoConnect] No path found after', iterations, 'iterations');
        return [];
    }

    // Check if infrastructure can be placed at this tile
    canPlaceInfra(x, y, infraType) {
        const tileMap = this.game.tileMap;
        if (!tileMap) return false;

        const tile = tileMap.getTile(x, y);
        if (!tile) return false;

        // Can't place on water
        const TERRAIN = window.TERRAIN || { WATER: 0, SHALLOW: 1 };
        if (tile.terrain === TERRAIN.WATER) return false;

        // Can place on existing same-type infrastructure (it's already there)
        if (tile.building?.type === infraType) return true;

        // Can't place on other buildings (except roads can go under power lines)
        if (tile.building) {
            if (infraType === 'powerLine' && tile.building.type === 'road') return true;
            if (infraType === 'road' && tile.building.type === 'powerLine') return true;
            return false;
        }

        // Check terrain compatibility
        const validTerrains = [2, 3, 4, 5, 6]; // SAND, GRASS, FOREST, HILL, MOUNTAIN
        if (!validTerrains.includes(tile.terrain)) return false;

        return true;
    }

    // Handle click - implements two-click workflow
    // Returns: { handled: boolean, result: object }
    handleClick(tileX, tileY, infraType) {
        console.log(`[AutoConnect] handleClick at (${tileX},${tileY}) for ${infraType}`);
        console.log(`[AutoConnect] State: waitingForEnd=${this.waitingForEnd}, startPoint=${JSON.stringify(this.startPoint)}`);

        if (!this.enabled) {
            console.log('[AutoConnect] Not enabled, skipping');
            return { handled: false };
        }

        if (!this.supportedTools.includes(infraType)) {
            console.log('[AutoConnect] Tool not supported:', infraType);
            return { handled: false };
        }

        // FIRST CLICK - Select start point
        if (!this.waitingForEnd) {
            // Check if clicked tile has existing infrastructure of this type
            if (this.hasInfrastructure(tileX, tileY, infraType)) {
                // Valid start point - existing infrastructure
                this.startPoint = { x: tileX, y: tileY };
                this.waitingForEnd = true;
                console.log(`[AutoConnect] START selected at (${tileX},${tileY}) - click END point next`);

                // Notify user
                if (this.game.events) {
                    this.game.events.emit('autoConnectStart', { x: tileX, y: tileY, infraType });
                }

                return {
                    handled: true,
                    result: {
                        action: 'startSelected',
                        startPoint: this.startPoint,
                        message: `Start point selected at (${tileX},${tileY}). Click destination to auto-connect.`
                    }
                };
            } else {
                // Clicked on empty tile or different building - not valid start
                console.log('[AutoConnect] First click must be on existing ' + infraType);
                return {
                    handled: true,
                    result: {
                        action: 'invalidStart',
                        message: `Click on existing ${infraType} to start auto-connect`
                    }
                };
            }
        }

        // SECOND CLICK - Select end point and draw path
        if (this.waitingForEnd && this.startPoint) {
            const startX = this.startPoint.x;
            const startY = this.startPoint.y;

            // Check if clicking same tile as start
            if (tileX === startX && tileY === startY) {
                console.log('[AutoConnect] Clicked same tile, cancelling');
                this.resetState();
                return {
                    handled: true,
                    result: {
                        action: 'cancelled',
                        message: 'Auto-connect cancelled'
                    }
                };
            }

            // Check if end point is valid for placement
            if (!this.canPlaceInfra(tileX, tileY, infraType)) {
                console.log('[AutoConnect] Invalid end point');
                return {
                    handled: true,
                    result: {
                        action: 'invalidEnd',
                        message: 'Cannot place ' + infraType + ' at this location'
                    }
                };
            }

            // Find path from start to end
            const path = this.findPath(startX, startY, tileX, tileY, infraType);

            if (path.length === 0) {
                console.log('[AutoConnect] No path found');
                this.resetState();
                return {
                    handled: true,
                    result: {
                        action: 'noPath',
                        message: 'No valid path found between points'
                    }
                };
            }

            // Remove start tile from path (it already has infrastructure)
            const newTiles = path.filter(p => !(p.x === startX && p.y === startY));

            if (newTiles.length === 0) {
                console.log('[AutoConnect] Already connected');
                this.resetState();
                return {
                    handled: true,
                    result: {
                        action: 'alreadyConnected',
                        message: 'Points are already connected'
                    }
                };
            }

            console.log(`[AutoConnect] Path ready with ${newTiles.length} new tiles to place`);

            // Reset state before returning
            this.resetState();

            return {
                handled: true,
                result: {
                    action: 'pathReady',
                    path: newTiles,
                    startPoint: { x: startX, y: startY },
                    endPoint: { x: tileX, y: tileY },
                    message: `Ready to place ${newTiles.length} tiles`
                }
            };
        }

        return { handled: false };
    }

    // Calculate cost for the path
    calculateCost(path, infraType) {
        const { getBuilding } = window.BuildingsModule || {};
        if (!getBuilding) return path.length * 10; // Default cost

        const building = getBuilding(infraType);
        return path.length * (building?.cost || 10);
    }

    // Toggle auto-connect mode
    toggle() {
        this.enabled = !this.enabled;
        if (!this.enabled) {
            this.resetState(); // Clear any pending state when disabling
        }
        console.log('[AutoConnect] Mode:', this.enabled ? 'ENABLED' : 'DISABLED');
        return this.enabled;
    }

    // Render visual feedback (called from game render loop)
    render(ctx, camera) {
        if (!this.enabled || !this.startPoint || !this.waitingForEnd) return;

        const tileSize = 20; // Adjust based on your tile size
        const screenX = (this.startPoint.x * tileSize - camera.x) * camera.zoom;
        const screenY = (this.startPoint.y * tileSize - camera.y) * camera.zoom;
        const size = tileSize * camera.zoom;

        // Draw pulsing highlight on start point
        const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
        ctx.strokeStyle = `rgba(0, 255, 0, ${pulse})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(screenX, screenY, size, size);

        // Draw "START" label
        ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('START', screenX + size/2, screenY - 5);
    }
}
