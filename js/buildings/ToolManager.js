// ToolManager - Handles tool selection and building placement
import { BUILDINGS, getBuilding, canAfford, canBuildOn, BUILDING_CATEGORIES } from './Buildings.js';

export class ToolManager {
    constructor(game) {
        this.game = game;
        this.selectedTool = null;
        this.isPlacing = false;
        this.dragBuilding = false;  // For drag-to-build (roads, walls)
        this.lastPlacedTile = null;

        // Tools that can be dragged to place multiple
        this.dragTools = ['road', 'wall', 'bulldozer'];
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

        // Check if can build on this terrain
        if (!canBuildOn(this.selectedTool, tileType)) {
            return { valid: false, reason: `Cannot build on ${tileType}` };
        }

        // Check if tile already has a building (unless bulldozing)
        if (tile.building && this.selectedTool !== 'bulldozer') {
            return { valid: false, reason: 'Tile already occupied' };
        }

        // Bulldozer needs something to demolish
        if (this.selectedTool === 'bulldozer' && !tile.building) {
            return { valid: false, reason: 'Nothing to demolish' };
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
        const check = this.canPlaceAt(tileX, tileY);
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
            tileMap.setBuilding(tileX, tileY, null);
            this.game.treasury -= building.cost;
            this.game.events.emit('buildingDemolished', { 
                tileX, tileY, 
                building: oldBuilding,
                cost: building.cost 
            });
            this.game.kingTweet(`Demolished! Sad! But sometimes you gotta tear it down to build it better! 🚜`);
            return true;
        }

        // Place the building
        // For larger buildings, mark all tiles
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

        // Deduct cost
        this.game.treasury -= building.cost;

        // Apply effects
        this.applyBuildingEffects(building);

        // Emit event
        this.game.events.emit('buildingPlaced', { 
            tileX, tileY, 
            building,
            cost: building.cost 
        });

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
        // Other effects applied during simulation tick
    }

    // King makes comments about buildings
    kingCommentOnBuilding(building) {
        const comments = {
            residential: [
                "Beautiful homes for beautiful people! 🏠",
                "Housing! The best housing! Everyone says so! 🏘️"
            ],
            commercial: [
                "Shops! Great deals! Tremendous commerce! 🏪",
                "Buy stuff! Sell stuff! Make money! 💰"
            ],
            industrial: [
                "Factories! Jobs! Making the kingdom great! 🏭",
                "Industry! We're bringing back industry! 💪"
            ],
            road: null,  // No comment for roads
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
            ]
        };

        const buildingComments = comments[building.id];
        if (buildingComments && buildingComments.length > 0) {
            const comment = buildingComments[Math.floor(Math.random() * buildingComments.length)];
            this.game.kingTweet(comment);
        }
    }

    // Handle pointer down (start placement)
    onPointerDown(tileX, tileY) {
        if (!this.selectedTool) return;

        this.isPlacing = true;

        // Check if this is a drag tool
        if (this.dragTools.includes(this.selectedTool)) {
            this.dragBuilding = true;
        }

        this.placeAt(tileX, tileY);
    }

    // Handle pointer move (drag placement)
    onPointerMove(tileX, tileY) {
        if (!this.isPlacing || !this.dragBuilding) return;
        if (!this.selectedTool) return;

        // Don't place on same tile twice
        if (this.lastPlacedTile && 
            this.lastPlacedTile.x === tileX && 
            this.lastPlacedTile.y === tileY) {
            return;
        }

        this.placeAt(tileX, tileY);
    }

    // Handle pointer up (end placement)
    onPointerUp() {
        this.isPlacing = false;
        this.dragBuilding = false;
        this.lastPlacedTile = null;
    }
}
