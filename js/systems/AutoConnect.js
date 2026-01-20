// AutoConnect.js - Automatic infrastructure pathfinding and placement
// Click destination, auto-draws path from nearest existing infrastructure

export class AutoConnect {
    constructor(game) {
        this.game = game;
        this.enabled = true; // Auto-connect mode enabled by default
        this.supportedTools = ['road', 'powerLine', 'wall'];
    }
    
    // Check if auto-connect should handle this tool
    supportsAutoConnect(toolId) {
        return this.enabled && this.supportedTools.includes(toolId);
    }
    
    // Find nearest existing infrastructure of given type
    findNearestInfrastructure(targetX, targetY, infraType) {
        const tileMap = this.game.tileMap;
        if (!tileMap) return null;
        
        let nearest = null;
        let nearestDist = Infinity;
        
        // Search all tiles for existing infrastructure
        for (let y = 0; y < tileMap.height; y++) {
            for (let x = 0; x < tileMap.width; x++) {
                const tile = tileMap.getTile(x, y);
                if (tile?.building?.type === infraType) {
                    const dist = Math.abs(x - targetX) + Math.abs(y - targetY); // Manhattan distance
                    if (dist > 0 && dist < nearestDist) { // dist > 0 to exclude target itself
                        nearestDist = dist;
                        nearest = { x, y };
                    }
                }
            }
        }
        
        return nearest;
    }
    
    // Find path from start to end avoiding obstacles
    findPath(startX, startY, endX, endY, infraType) {
        const tileMap = this.game.tileMap;
        if (!tileMap) return [];
        
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
    
    // Execute auto-connect: find nearest and draw path
    autoConnect(targetX, targetY, infraType) {
        console.log(`[AutoConnect] Auto-connecting ${infraType} to (${targetX}, ${targetY})`);
        
        const tileMap = this.game.tileMap;
        if (!tileMap) return { success: false, reason: 'No tilemap' };
        
        // Check if target tile already has this infrastructure
        const targetTile = tileMap.getTile(targetX, targetY);
        if (targetTile?.building?.type === infraType) {
            return { success: false, reason: 'Already has ' + infraType };
        }
        
        // Find nearest existing infrastructure
        const nearest = this.findNearestInfrastructure(targetX, targetY, infraType);
        
        if (!nearest) {
            // No existing infrastructure - just place at target if valid
            console.log('[AutoConnect] No existing infrastructure, placing single tile');
            if (this.canPlaceInfra(targetX, targetY, infraType)) {
                return { 
                    success: true, 
                    path: [{ x: targetX, y: targetY }],
                    isNewNetwork: true
                };
            }
            return { success: false, reason: 'Cannot place here' };
        }
        
        console.log(`[AutoConnect] Nearest ${infraType} at (${nearest.x}, ${nearest.y})`);
        
        // Find path from nearest to target
        const path = this.findPath(nearest.x, nearest.y, targetX, targetY, infraType);
        
        if (path.length === 0) {
            return { success: false, reason: 'No valid path found' };
        }
        
        // Remove the first tile (it's the existing infrastructure)
        const newTiles = path.slice(1);
        
        if (newTiles.length === 0) {
            return { success: false, reason: 'Already connected' };
        }
        
        console.log(`[AutoConnect] Path found with ${newTiles.length} new tiles`);
        
        return {
            success: true,
            path: newTiles,
            startPoint: nearest,
            isNewNetwork: false
        };
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
        console.log('[AutoConnect] Mode:', this.enabled ? 'ENABLED' : 'DISABLED');
        return this.enabled;
    }
}
