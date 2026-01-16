/**
 * SaveSystem - Handles saving and loading game state to/from localStorage
 * Supports multiple save slots
 */

export class SaveSystem {
    constructor(game) {
        this.game = game;
        this.saveKeyPrefix = 'island-kingdom-save';
        this.maxSlots = 5;

        // Migrate old single-save format to new multi-slot format
        this.migrateOldSave();
    }

    /**
     * Get save key for a specific slot
     */
    getSaveKey(slot) {
        return `${this.saveKeyPrefix}-${slot}`;
    }

    /**
     * Get list of all saved games with metadata
     */
    getSavedGames() {
        const saves = [];
        for (let i = 1; i <= this.maxSlots; i++) {
            const key = this.getSaveKey(i);
            const data = localStorage.getItem(key);
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    saves.push({
                        slot: i,
                        name: parsed.saveName || `Save ${i}`,
                        timestamp: parsed.timestamp,
                        population: parsed.population || 0,
                        treasury: parsed.treasury || 0,
                        year: parsed.year || 1,
                        month: parsed.month || 1
                    });
                } catch (e) {
                    console.error(`[SAVE] Error parsing save slot ${i}:`, e);
                }
            }
        }
        return saves;
    }

    /**
     * Check if any saved game exists
     */
    hasSavedGame() {
        return this.getSavedGames().length > 0;
    }

    /**
     * Get next available slot number
     */
    getNextAvailableSlot() {
        const saves = this.getSavedGames();
        const usedSlots = new Set(saves.map(s => s.slot));
        for (let i = 1; i <= this.maxSlots; i++) {
            if (!usedSlots.has(i)) return i;
        }
        // All slots full, return slot 1 (will overwrite)
        return 1;
    }

    /**
     * Save the current game state to a specific slot
     */
    saveGame(slot = null, saveName = null) {
        try {
            if (slot === null) {
                slot = this.getNextAvailableSlot();
            }
            
            const saveData = this.serializeGameState();
            saveData.saveName = saveName || `Save ${slot}`;
            
            const key = this.getSaveKey(slot);
            localStorage.setItem(key, JSON.stringify(saveData));
            // console.log(`[SAVE] Game saved to slot ${slot} successfully`);
            return { success: true, slot, name: saveData.saveName };
        } catch (error) {
            console.error('[SAVE] Failed to save game:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Load game state from a specific slot
     */
    loadGame(slot = 1) {
        try {
            const key = this.getSaveKey(slot);
            const saveDataStr = localStorage.getItem(key);
            if (!saveDataStr) {
                // console.log(`[SAVE] No saved game found in slot ${slot}`);
                return false;
            }

            const saveData = JSON.parse(saveDataStr);
            this.deserializeGameState(saveData);
            // console.log(`[SAVE] Game loaded from slot ${slot} successfully`);
            return true;
        } catch (error) {
            console.error('[SAVE] Failed to load game:', error);
            return false;
        }
    }

    /**
     * Delete a saved game from a specific slot
     */
    deleteSave(slot) {
        const key = this.getSaveKey(slot);
        localStorage.removeItem(key);
        // console.log(`[SAVE] Save slot ${slot} deleted`);
    }

    /**
     * Migrate old single-save format to new multi-slot format
     */
    migrateOldSave() {
        const oldKey = 'island-kingdom-save';
        const oldData = localStorage.getItem(oldKey);
        if (oldData && !localStorage.getItem(this.getSaveKey(1))) {
            // Migrate old save to slot 1
            localStorage.setItem(this.getSaveKey(1), oldData);
            localStorage.removeItem(oldKey);
            // console.log('[SAVE] Migrated old save to slot 1');
        }
    }

    /**
     * Serialize the current game state into a saveable object
     */
    serializeGameState() {
        const game = this.game;
        const tileMap = game.tileMap;

        // Serialize tile map data
        const tiles = [];
        for (let y = 0; y < tileMap.height; y++) {
            for (let x = 0; x < tileMap.width; x++) {
                const tile = tileMap.getTile(x, y);
                // Only save tiles that have buildings or non-default state
                if (tile.building) {
                    tiles.push({
                        x,
                        y,
                        terrain: tile.terrain,
                        building: tile.building
                    });
                }
            }
        }

        // Serialize residential allotments
        const residentialAllotments = [];
        if (game.residentialManager && game.residentialManager.allotments) {
            for (const [key, allotment] of game.residentialManager.allotments) {
                const cellsData = [];
                for (let row = 0; row < 3; row++) {
                    for (let col = 0; col < 3; col++) {
                        const cell = allotment.cells[row][col];
                        cellsData.push({
                            localX: col,
                            localY: row,
                            devLevel: cell ? cell.devLevel || 0 : 0,
                            progress: cell ? cell.progress || 0 : 0,
                            population: cell ? cell.population || 0 : 0,
                            hasRoadAccess: cell ? cell.hasRoadAccess || false : false,
                            hasPower: cell ? cell.hasPower || false : false
                        });
                    }
                }
                residentialAllotments.push({
                    x: allotment.x,
                    y: allotment.y,
                    cells: cellsData,
                    totalPopulation: allotment.population || 0
                });
            }
        }

        // Serialize commercial allotments
        const commercialAllotments = [];
        if (game.commercialManager && game.commercialManager.allotments) {
            for (const [key, allotment] of game.commercialManager.allotments) {
                const cellsData = [];
                for (let row = 0; row < 3; row++) {
                    for (let col = 0; col < 3; col++) {
                        const cell = allotment.cells[row][col];
                        cellsData.push({
                            localX: col,
                            localY: row,
                            devLevel: cell ? cell.devLevel || 0 : 0,
                            progress: cell ? cell.progress || 0 : 0,
                            hasRoadAccess: cell ? cell.hasRoadAccess || false : false,
                            hasPower: cell ? cell.hasPower || false : false
                        });
                    }
                }
                commercialAllotments.push({
                    x: allotment.x,
                    y: allotment.y,
                    cells: cellsData
                });
            }
        }

        // Serialize industrial allotments
        const industrialAllotments = [];
        if (game.industrialManager && game.industrialManager.allotments) {
            for (const [key, allotment] of game.industrialManager.allotments) {
                const cellsData = [];
                for (let row = 0; row < 3; row++) {
                    for (let col = 0; col < 3; col++) {
                        const cell = allotment.cells[row][col];
                        cellsData.push({
                            localX: col,
                            localY: row,
                            devLevel: cell ? cell.devLevel || 0 : 0,
                            progress: cell ? cell.progress || 0 : 0,
                            hasRoadAccess: cell ? cell.hasRoadAccess || false : false,
                            hasPower: cell ? cell.hasPower || false : false
                        });
                    }
                }
                industrialAllotments.push({
                    x: allotment.x,
                    y: allotment.y,
                    cells: cellsData
                });
            }
        }

        // Serialize immigration data (boats and crowds)
        const immigrationData = this.serializeImmigration();

        return {
            version: 2,  // Bumped version for new format
            timestamp: Date.now(),
            
            // Game stats
            treasury: game.treasury,
            population: game.population,
            maxPopulation: game.maxPopulation,
            visitors: game.visitors,
            processedImmigrants: game.processedImmigrants || 0,
            month: game.month,
            year: game.year,
            kingMood: game.kingMood,
            kingMoodText: game.kingMoodText,
            kingEgo: game.kingEgo,
            
            // Economy
            taxRate: game.taxRate,
            tariffRate: game.tariffRate,
            monthlyIncome: game.monthlyIncome,
            monthlyExpenses: game.monthlyExpenses,
            
            // Map data
            mapWidth: tileMap.width,
            mapHeight: tileMap.height,
            mapSeed: tileMap.seed,
            terrainData: this.serializeTerrainData(tileMap),
            tiles: tiles,
            
            // Allotments
            residentialAllotments,
            commercialAllotments,
            industrialAllotments,
            
            // Immigration (boats and crowds)
            immigration: immigrationData,
            
            // Game tick counter
            tickCount: game.tickCount || 0,
            
            // Source islands data
            sourceIslands: tileMap.sourceIslands || []
        };
    }

    /**
     * Serialize immigration system data (boats and crowds)
     */
    serializeImmigration() {
        const immigration = this.game.immigrationSystem;
        if (!immigration) return null;

        // Serialize people boats
        const peopleBoats = immigration.peopleBoats.map(boat => ({
            x: boat.x,
            y: boat.y,
            targetLanding: boat.targetLanding,
            peopleCount: boat.peopleCount,
            sourceIsland: boat.sourceIsland,
            speed: boat.speed,
            state: boat.state,
            crowdSpawned: boat.crowdSpawned,
            frame: boat.frame,
            // Navigation state
            avoidanceAngle: boat.avoidanceAngle || 0,
            avoidanceFrames: boat.avoidanceFrames || 0,
            lastPos: boat.lastPos || { x: boat.x, y: boat.y },
            stuckFrames: boat.stuckFrames || 0,
            startX: boat.startX || boat.x,
            startY: boat.startY || boat.y
        }));

        // Serialize crowds
        const crowds = immigration.crowds.map(crowd => ({
            x: crowd.x,
            y: crowd.y,
            count: crowd.count,
            speed: crowd.speed,
            frame: crowd.frame,
            inForest: crowd.inForest,
            targetX: crowd.targetX,
            targetY: crowd.targetY,
            targetMode: crowd.targetMode,
            splitCooldown: crowd.splitCooldown,
            // Survival and citizenship progress
            survivalMonths: crowd.survivalMonths || 0,
            lastTickCount: crowd.lastTickCount || 0,
            spawnTick: crowd.spawnTick || 0
        }));

        return {
            peopleBoats,
            crowds,
            spawnTimer: immigration.spawnTimer,
            islandSpawnTimers: immigration.islandSpawnTimers || {}
        };
    }

    /**
     * Serialize terrain data (compressed)
     */
    serializeTerrainData(tileMap) {
        // Store terrain as a flat array of terrain values
        const terrainData = [];
        for (let y = 0; y < tileMap.height; y++) {
            for (let x = 0; x < tileMap.width; x++) {
                terrainData.push(tileMap.getTerrainAt(x, y));
            }
        }
        return terrainData;
    }

    /**
     * Deserialize saved data back into game state
     */
    deserializeGameState(saveData) {
        const game = this.game;

        // Restore game stats
        game.treasury = saveData.treasury;
        game.population = saveData.population;
        game.maxPopulation = saveData.maxPopulation;
        game.visitors = saveData.visitors || 0;
        game.processedImmigrants = saveData.processedImmigrants || 0;
        game.month = saveData.month;
        game.year = saveData.year;
        game.kingMood = saveData.kingMood;
        game.kingMoodText = saveData.kingMoodText;
        game.kingEgo = saveData.kingEgo;
        
        // Restore economy
        game.taxRate = saveData.taxRate;
        game.tariffRate = saveData.tariffRate;
        game.monthlyIncome = saveData.monthlyIncome;
        game.monthlyExpenses = saveData.monthlyExpenses;

        // Restore game tick counter
        game.tickCount = saveData.tickCount || 0;

        // Restore source islands data
        if (saveData.sourceIslands && game.tileMap) {
            game.tileMap.sourceIslands = saveData.sourceIslands;
        }

        // Restore terrain data
        if (saveData.terrainData && game.tileMap) {
            this.deserializeTerrainData(game.tileMap, saveData.terrainData, saveData.mapWidth);
        }

        // Restore buildings
        if (saveData.tiles && game.tileMap) {
            for (const tileData of saveData.tiles) {
                const tile = game.tileMap.getTile(tileData.x, tileData.y);
                if (tile) {
                    tile.building = tileData.building;
                }
            }
        }

        // Restore residential allotments
        if (saveData.residentialAllotments && game.residentialManager) {
            game.residentialManager.allotments.clear();
            for (const allotmentData of saveData.residentialAllotments) {
                const allotment = game.residentialManager.createAllotmentFromSave(
                    allotmentData.x,
                    allotmentData.y,
                    allotmentData.cells,
                    allotmentData.totalPopulation
                );
            }
        }

        // Restore commercial allotments
        if (saveData.commercialAllotments && game.commercialManager) {
            game.commercialManager.allotments.clear();
            for (const allotmentData of saveData.commercialAllotments) {
                game.commercialManager.createAllotmentFromSave(
                    allotmentData.x,
                    allotmentData.y,
                    allotmentData.cells
                );
            }
        }

        // Restore industrial allotments
        if (saveData.industrialAllotments && game.industrialManager) {
            game.industrialManager.allotments.clear();
            for (const allotmentData of saveData.industrialAllotments) {
                game.industrialManager.createAllotmentFromSave(
                    allotmentData.x,
                    allotmentData.y,
                    allotmentData.cells
                );
            }
        }

        // Restore immigration data (boats and crowds)
        if (saveData.immigration) {
            this.deserializeImmigration(saveData.immigration);
        }

        // Recalculate infrastructure networks
        if (game.infrastructureManager) {
            game.infrastructureManager.recalculateNetworks();
        }

        // Update UI
        game.updateUI();
    }

    /**
     * Deserialize immigration system data (boats and crowds)
     */
    deserializeImmigration(immigrationData) {
        const immigration = this.game.immigrationSystem;
        if (!immigration || !immigrationData) return;

        // Import PeopleBoat and Crowd classes
        // They should be available on window from ImmigrationSystem.js
        const PeopleBoat = window.PeopleBoat;
        const Crowd = window.Crowd;

        // Clear existing boats and crowds
        immigration.peopleBoats = [];
        immigration.crowds = [];

        // Restore spawn timer (legacy)
        immigration.spawnTimer = immigrationData.spawnTimer || 0;

        // Restore per-island spawn timers
        if (immigrationData.islandSpawnTimers) {
            immigration.islandSpawnTimers = { ...immigrationData.islandSpawnTimers };
            // console.log('[SAVE] Restored island spawn timers:', immigration.islandSpawnTimers);
        }

        // Restore people boats
        if (immigrationData.peopleBoats && PeopleBoat) {
            for (const boatData of immigrationData.peopleBoats) {
                const boat = new PeopleBoat(
                    this.game,
                    boatData.x,
                    boatData.y,
                    boatData.targetLanding,
                    boatData.peopleCount,
                    boatData.sourceIsland
                );
                // Restore additional state
                boat.speed = boatData.speed;
                boat.state = boatData.state;
                boat.crowdSpawned = boatData.crowdSpawned;
                boat.frame = boatData.frame;
                // Restore navigation state
                boat.avoidanceAngle = boatData.avoidanceAngle || 0;
                boat.avoidanceFrames = boatData.avoidanceFrames || 0;
                boat.lastPos = boatData.lastPos || { x: boat.x, y: boat.y };
                boat.stuckFrames = boatData.stuckFrames || 0;
                boat.startX = boatData.startX || boat.x;
                boat.startY = boatData.startY || boat.y;
                immigration.peopleBoats.push(boat);
            }
            // console.log(`[SAVE] Restored ${immigration.peopleBoats.length} boats`);
        }

        // Restore crowds
        if (immigrationData.crowds && Crowd) {
            for (const crowdData of immigrationData.crowds) {
                const crowd = new Crowd(
                    this.game,
                    crowdData.x,
                    crowdData.y,
                    crowdData.count
                );
                // Restore additional state
                crowd.speed = crowdData.speed;
                crowd.frame = crowdData.frame;
                crowd.inForest = crowdData.inForest;
                crowd.targetX = crowdData.targetX;
                crowd.targetY = crowdData.targetY;
                crowd.targetMode = crowdData.targetMode || 'nearest';
                crowd.splitCooldown = crowdData.splitCooldown || 0;
                // Restore survival and citizenship progress
                crowd.survivalMonths = crowdData.survivalMonths || 0;
                crowd.lastTickCount = crowdData.lastTickCount || 0;
                crowd.spawnTick = crowdData.spawnTick || 0;
                immigration.crowds.push(crowd);
            }
            // console.log(`[SAVE] Restored ${immigration.crowds.length} crowds`);
        }
    }

    /**
     * Deserialize terrain data back into tilemap
     */
    deserializeTerrainData(tileMap, terrainData, width) {
        for (let i = 0; i < terrainData.length; i++) {
            const x = i % width;
            const y = Math.floor(i / width);
            const tile = tileMap.getTile(x, y);
            if (tile) {
                tile.terrain = terrainData[i];
            }
        }
    }
}

window.SaveSystem = SaveSystem;
