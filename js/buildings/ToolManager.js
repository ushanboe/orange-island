
// ToolManager - Handles tool selection and building placement
import { BUILDINGS, getBuilding, canAfford, canBuildOn, BUILDING_CATEGORIES } from './Buildings.js';
import { TERRAIN } from '../map/TileMap.js';

export class ToolManager {
    constructor(game) {
        this.game = game;
        this.selectedTool = null;
        this.isPlacing = false;
        this.dragBuilding = false;  // For drag-to-build (roads, walls)
        this.lastPlacedTile = null;

        // Tools that can be dragged to place multiple
        this.dragTools = ['road', 'wall', 'bulldozer', 'powerLine'];
    }

    // Select a tool
    selectTool(toolId) {
        if (toolId === this.selectedTool) {
            // Deselect if clicking same tool
            this.selectedTool = null;
            this.game.events.emit('toolDeselected');
        } else {
            this.selectedTool = toolId;
            const building = getBuilding(toolId);
            this.game.events.emit('toolSelected', { toolId, building });
        }
        return this.selectedTool;
    }

    // Get currently selected tool
    getSelectedTool() {
        return this.selectedTool ? getBuilding(this.selectedTool) : null;
    }

    // Find nearest empty tile adjacent to target (for power line connections)
    findNearestEmptyAdjacent(tileX, tileY) {
        const tileMap = this.game.tileMap;
        const directions = [
            {dx: 0, dy: -1}, {dx: 0, dy: 1},
            {dx: -1, dy: 0}, {dx: 1, dy: 0}
        ];

        for (const {dx, dy} of directions) {
            const nx = tileX + dx;
            const ny = tileY + dy;
            if (tileMap.isInBounds(nx, ny)) {
                const tile = tileMap.getTile(nx, ny);
                const tileType = tileMap.getTileType(tile.terrain);
                // Check if empty and buildable
                if (!tile.building && (tileType === 'grass' || tileType === 'dirt' || tileType === 'sand')) {
                    return {x: nx, y: ny};
                }
            }
        }
        return null;
    }

    // Check if placement is valid at tile position
    canPlaceAt(tileX, tileY) {
        if (!this.selectedTool) return { valid: false, reason: 'No tool selected' };

        const building = getBuilding(this.selectedTool);
        if (!building) return { valid: false, reason: 'Invalid building' };

        const tileMap = this.game.tileMap;

        // Check bounds
        if (!tileMap.isInBounds(tileX, tileY)) {
            return { valid: false, reason: 'Out of bounds' };
        }

        // Get tile info
        const tile = tileMap.getTile(tileX, tileY);
        const tileType = tileMap.getTileType(tile.terrain);

        // For residential allotments, skip single-tile terrain check
        const isAllotmentBuilding = building.isAllotment && building.size > 1;

        // Check if can build on this terrain (skip for residential allotments)
        if (!isAllotmentBuilding && !canBuildOn(this.selectedTool, tileType)) {
            return { valid: false, reason: `Cannot build on ${tileType}` };
        }

        // Check if tile already has a building (unless bulldozing or multi-tile building)
        // For power lines trying to connect to buildings, suggest adjacent placement
        if (tile.building && this.selectedTool !== 'bulldozer' && building.size === 1) {
            // Special case: power lines can be redirected to adjacent empty tile
            if (this.selectedTool === 'powerLine') {
                return { valid: false, reason: 'Tile occupied - place adjacent to connect', redirectable: true };
            }
            return { valid: false, reason: 'Tile already occupied' };
        }

        // Bulldozer needs something to demolish (building or forest)
        if (this.selectedTool === 'bulldozer') {
            const isForest = tile.terrain === TERRAIN.FOREST;
            if (!tile.building && !isForest) {
                return { valid: false, reason: 'Nothing to demolish' };
            }
        }

        // Check if can afford
        if (!canAfford(this.selectedTool, this.game.treasury)) {
            return { valid: false, reason: 'Not enough funds!' };
        }

        // Check water requirement for ports
        if (building.mustBeNearWater) {
            const nearWater = this.isNearWater(tileX, tileY);
            if (!nearWater) {
                return { valid: false, reason: 'Must be near water' };
            }
        }

        // For larger buildings, check all tiles
        if (building.size > 1) {
            // console.log(`[ToolManager] Multi-tile building check:`, {
//                 id: building.id,
//                 size: building.size,
//                 isAllotment: building.isAllotment
//             });

            // Special validation for allotments
            if (building.isAllotment && building.size > 1) {
                let canPlace = false;

                if (building.id === 'residential' && this.game.residentialManager) {
                    canPlace = this.game.residentialManager.canPlaceAllotment(tileX, tileY);
                } else if (building.id === 'commercial' && this.game.commercialManager) {
                    canPlace = this.game.commercialManager.canPlaceAllotment(tileX, tileY);
                } else if (building.id === 'industrial' && this.game.industrialManager) {
                    canPlace = this.game.industrialManager.canPlaceAllotment(tileX, tileY);
                }

                if (!canPlace) {
                    return { valid: false, reason: 'Cannot place 3x3 allotment here' };
                }
            } else {
                // Standard multi-tile building check
                for (let dy = 0; dy < building.size; dy++) {
                    for (let dx = 0; dx < building.size; dx++) {
                        const checkX = tileX + dx;
                        const checkY = tileY + dy;
                        if (!tileMap.isInBounds(checkX, checkY)) {
                            return { valid: false, reason: 'Building too large for location' };
                        }
                        const checkTile = tileMap.getTile(checkX, checkY);
                        if (checkTile.building) {
                            return { valid: false, reason: 'Area not clear' };
                        }
                    }
                }
            }
        }

        return { valid: true, reason: 'OK', cost: building.cost };
    }

    // Check if tile is near water
    isNearWater(tileX, tileY) {
        const tileMap = this.game.tileMap;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const checkX = tileX + dx;
                const checkY = tileY + dy;
                if (tileMap.isInBounds(checkX, checkY)) {
                    const tile = tileMap.getTile(checkX, checkY);
                    const type = tileMap.getTileType(tile.terrain);
                    if (type === 'water' || type === 'deepwater') {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // Place building at tile position
    placeAt(tileX, tileY) {
        // console.log(`[ToolManager] placeAt called at (${tileX}, ${tileY})`);
        let check = this.canPlaceAt(tileX, tileY);

        // Special handling for power lines - try to find adjacent spot if clicking on building
        if (!check.valid && check.redirectable && this.selectedTool === 'powerLine') {
            const adjacent = this.findNearestEmptyAdjacent(tileX, tileY);
            if (adjacent) {
                // console.log(`[ToolManager] Redirecting power line to adjacent tile (${adjacent.x}, ${adjacent.y})`);
                tileX = adjacent.x;
                tileY = adjacent.y;
                check = this.canPlaceAt(tileX, tileY);
            }
        }

        if (!check.valid) {
            this.game.events.emit('placementFailed', { reason: check.reason, tileX, tileY });
            return false;
        }

        const building = getBuilding(this.selectedTool);
        const tileMap = this.game.tileMap;

        // Handle bulldozer
        if (this.selectedTool === 'bulldozer') {
            const tile = tileMap.getTile(tileX, tileY);
            const oldBuilding = tile.building;
            const wasForest = tile.terrain === TERRAIN.FOREST;

            // Clear building if present
            if (oldBuilding) {
                tileMap.setBuilding(tileX, tileY, null);
            }

            // Clear forest and replace with grass
            if (wasForest) {
                tile.terrain = TERRAIN.GRASS;
            }

            this.game.treasury -= building.cost;

            if (oldBuilding) {
                this.game.events.emit('buildingDemolished', {
                    tileX, tileY,
                    building: oldBuilding,
                    cost: building.cost
                });
                this.game.kingTweet(`Demolished! Sad! But sometimes you gotta tear it down to build it better! 🚜`);
            } else if (wasForest) {
                this.game.events.emit('forestCleared', {
                    tileX, tileY,
                    cost: building.cost
                });
                this.game.kingTweet(`Cleared that forest! Making room for GREATNESS! 🌲➡️🏗️`);
            }
            return true;
        }

        // Place the building
        if (building.isAllotment && building.size > 1) {
            let success = false;
            let allotmentType = '';

            if (building.id === 'residential' && this.game.residentialManager) {
                success = this.game.residentialManager.createAllotment(tileX, tileY);
                allotmentType = 'residential';
            } else if (building.id === 'commercial' && this.game.commercialManager) {
                success = this.game.commercialManager.createAllotment(tileX, tileY);
                allotmentType = 'commercial';
            } else if (building.id === 'industrial' && this.game.industrialManager) {
                success = this.game.industrialManager.createAllotment(tileX, tileY);
                allotmentType = 'industrial';
            }

            if (!success) {
                this.game.events.emit('placementFailed', { reason: `Cannot place ${allotmentType} allotment here`, tileX, tileY });
                return false;
            }
        } else {
            // Standard building placement
            for (let dy = 0; dy < building.size; dy++) {
                for (let dx = 0; dx < building.size; dx++) {
                    const placeX = tileX + dx;
                    const placeY = tileY + dy;
                    tileMap.setBuilding(placeX, placeY, {
                        type: building.id,
                        mainTile: dx === 0 && dy === 0,
                        originX: tileX,
                        originY: tileY
                    });
                }
            }
        }

        // Deduct cost
        this.game.treasury -= building.cost;

        // Apply effects
        this.applyBuildingEffects(building);

        // Force infrastructure recalculation when placing power-related or service buildings
        const needsInfraRecalc = ['powerLine', 'road', 'airport', 'policeStation', 'fireStation', 'hospital', 'school', 'port'];
        if (needsInfraRecalc.includes(building.id) || building.category === 'power') {
            if (this.game.infrastructureManager) {
                this.game.infrastructureManager.recalculateNetworks();
            }
        }

        // Emit event
        this.game.events.emit('buildingPlaced', {
//            tileX, tileY,
            building,
            cost: building.cost
        });

        // Play build sound
        if (this.game.soundSystem) {
            this.game.soundSystem.onUIBuild();
        }

        // King comments on special buildings
        this.kingCommentOnBuilding(building);

        this.lastPlacedTile = { x: tileX, y: tileY };
        return true;
    }

    // Apply building effects to game state
    applyBuildingEffects(building) {
        const effects = building.effects;

        if (effects.kingEgo) {
            this.game.kingEgo = Math.min(100, this.game.kingEgo + effects.kingEgo);
        }
        if (effects.maxPopulation) {
            this.game.maxPopulation += effects.maxPopulation;
        }
    }

    // King makes comments about buildings
    kingCommentOnBuilding(building) {
        const comments = {
            residential: [
                "A whole NEIGHBORHOOD! 3x3 of pure greatness! 🏘️",
                "Housing development! Watch it GROW! 🏠➡️🏢➡️🏙️",
                "From houses to HIGH-RISES! That's how we do it! 💪"
            ],
            commercial: [
                "Shops! Great deals! Tremendous commerce! 🏪",
                "Buy stuff! Sell stuff! Make money! 💰"
            ],
            industrial: [
                "Factories! Jobs! Making the kingdom great! 🏭",
                "Industry! We're bringing back industry! 💪"
            ],
            road: null,
            wall: [
                "THE WALL! It's going to be HUGE! 🧱",
                "Keep them OUT! Build that wall! 🚧",
                "Nobody builds walls better than me! 🏗️"
            ],
            port: [
                "A port! Time to collect those TARIFFS! ⚓💰",
                "Ships will come, and they will PAY! 🚢"
            ],
            statue: [
                "A statue of ME! So handsome! So golden! 🗽✨",
                "Everyone will see my tremendous beauty! 👑"
            ],
            tower: [
                "TOWER! The most luxurious tower EVER! 🏰",
                "It's YUGE! The biggest! Everyone's jealous! 🌟"
            ],
            golfCourse: [
                "Golf! Finally somewhere to relax! ⛳",
                "The best golf course in any kingdom! 🏌️"
            ],
            powerLine: null  // No comment for power lines
        };

        const buildingComments = comments[building.id];
        if (buildingComments && buildingComments.length > 0) {
            const comment = buildingComments[Math.floor(Math.random() * buildingComments.length)];
            this.game.kingTweet(comment);
        }
    }

    // Handle pointer down (start placement)
    onPointerDown(tileX, tileY) {
        // console.log('[ToolManager] onPointerDown called:', { tileX, tileY, selectedTool: this.selectedTool });
        // DEBUG: Show auto-connect state
        console.log("[ToolManager] Click - AutoConnect enabled:", this.game.autoConnect?.enabled, "Tool:", this.selectedTool);
        if (!this.selectedTool) {
            // console.log('[ToolManager] No tool selected, returning early');
            return;
        }

        this.isPlacing = true;
        this.pointerDownTime = Date.now();
        this.pointerDownTile = { x: tileX, y: tileY };

        // Check if this is a drag tool
        if (this.dragTools.includes(this.selectedTool)) {
            this.dragBuilding = true;

            // Check for auto-connect mode (two-click workflow)
            if (this.game.autoConnect &&
                this.game.autoConnect.supportsAutoConnect(this.selectedTool) &&
                this.selectedTool !== 'bulldozer') {

                // Use two-click handleClick method
                const result = this.game.autoConnect.handleClick(tileX, tileY, this.selectedTool);

                if (result.handled) {
                    console.log('[ToolManager] AutoConnect handled click:', result.result?.action);

                    // Show feedback message to user
                    if (result.result?.message) {
                        console.log('[AutoConnect]', result.result.message);
                    }

                    // If path is ready, place all tiles
                    if (result.result?.action === 'pathReady' && result.result.path) {
                        const path = result.result.path;
                        const building = getBuilding(this.selectedTool);
                        const totalCost = path.length * building.cost;

                        // Check if can afford entire path
                        if (this.game.treasury >= totalCost) {
                            console.log(`[AutoConnect] Placing ${path.length} tiles of ${this.selectedTool}`);

                            // Place all tiles in path
                            let placedCount = 0;
                            for (const tile of path) {
                                // Temporarily disable auto-connect to place single tiles
                                const wasEnabled = this.game.autoConnect.enabled;
                                this.game.autoConnect.enabled = false;

                                if (this.placeAt(tile.x, tile.y)) {
                                    placedCount++;
                                }

                                this.game.autoConnect.enabled = wasEnabled;
                            }

                            if (placedCount > 0) {
                                this.game.kingTweet(`Auto-connected ${placedCount} tiles! Tremendous efficiency! 🔌`);
                            }
                        } else {
                            // Can't afford full path, show message
                            this.game.events.emit('placementFailed', {
                                reason: `Need $${totalCost.toLocaleString()} for auto-connect path`,
                                tileX, tileY
                            });
                        }
                    }

                    // Don't continue with normal placement when auto-connect handles it
                    this.isPlacing = false;
                    this.dragBuilding = false;
                    return;
                }
            }

        }
        // Normal single-tile placement
        this.placeAt(tileX, tileY);
    }

    // Handle pointer move

    // Handle pointer move (drag placement)
    onPointerMove(tileX, tileY) {
        // console.log('[ToolManager] onPointerMove:', { 
//            tileX, tileY, 
//             isPlacing: this.isPlacing, 
//             dragBuilding: this.dragBuilding,
//             selectedTool: this.selectedTool,
//             lastPlacedTile: this.lastPlacedTile
//         });
// 
        if (!this.isPlacing || !this.dragBuilding) {
            // console.log('[ToolManager] Drag placement blocked - isPlacing:', this.isPlacing, 'dragBuilding:', this.dragBuilding);
            return;
        }
        if (!this.selectedTool) {
            // console.log('[ToolManager] No tool selected during drag');
            return;
        }

        // Don't place on same tile twice
        if (this.lastPlacedTile &&
            this.lastPlacedTile.x === tileX &&
            this.lastPlacedTile.y === tileY) {
            // console.log('[ToolManager] Same tile, skipping');
            return;
        }

        // console.log('[ToolManager] Drag placing at:', tileX, tileY);
        this.placeAt(tileX, tileY);
    }

    // Handle pointer up (end placement)
    onPointerUp() {
        this.isPlacing = false;
        this.dragBuilding = false;
        this.lastPlacedTile = null;
    }
}
