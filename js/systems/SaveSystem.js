/**
 * SaveSystem - Handles saving and loading game state to/from localStorage
 */

export class SaveSystem {
    constructor(game) {
        this.game = game;
        this.saveKey = 'island-kingdom-save';
    }

    /**
     * Check if a saved game exists
     */
    hasSavedGame() {
        return localStorage.getItem(this.saveKey) !== null;
    }

    /**
     * Save the current game state to localStorage
     */
    saveGame() {
        try {
            const saveData = this.serializeGameState();
            localStorage.setItem(this.saveKey, JSON.stringify(saveData));
            console.log('[SAVE] Game saved successfully');
            return true;
        } catch (error) {
            console.error('[SAVE] Failed to save game:', error);
            return false;
        }
    }

    /**
     * Load game state from localStorage
     */
    loadGame() {
        try {
            const saveDataStr = localStorage.getItem(this.saveKey);
            if (!saveDataStr) {
                console.log('[SAVE] No saved game found');
                return false;
            }

            const saveData = JSON.parse(saveDataStr);
            this.deserializeGameState(saveData);
            console.log('[SAVE] Game loaded successfully');
            return true;
        } catch (error) {
            console.error('[SAVE] Failed to load game:', error);
            return false;
        }
    }

    /**
     * Delete the saved game
     */
    deleteSave() {
        localStorage.removeItem(this.saveKey);
        console.log('[SAVE] Save deleted');
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

        return {
            version: 1,
            timestamp: Date.now(),
            
            // Game stats
            treasury: game.treasury,
            population: game.population,
            maxPopulation: game.maxPopulation,
            visitors: game.visitors,
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
            industrialAllotments
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

        // Recalculate infrastructure networks
        if (game.infrastructureManager) {
            game.infrastructureManager.recalculateNetworks();
        }

        // Update UI
        game.updateUI();
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
