// js/simulation/IndustrialAllotment.js
import { TERRAIN } from '../map/TileMap.js';
// Industrial development system with 3x3 allotments
// Phases: Empty -> Workshops -> Factories -> Heavy industry -> Industrial complex

export const INDUSTRIAL_PHASES = {
    EMPTY: 0,           // Just zoned, empty 3x3 lot
    WORKSHOPS_1: 1,     // 1-3 small workshops
    WORKSHOPS_2: 2,     // 4-6 workshops
    WORKSHOPS_FULL: 3,  // All 9 workshops
    FACTORIES_1: 4,     // 1-3 factories (replacing workshops)
    FACTORIES_2: 5,     // 4-6 factories
    HEAVY_INDUSTRY: 6,  // Heavy industrial facility
    INDUSTRIAL_COMPLEX: 7 // Full industrial complex with smokestacks
};

// Jobs per phase
export const PHASE_JOBS = {
    0: 0,
    1: 9,      // 1-3 workshops @ 3 each
    2: 18,     // 4-6 workshops @ 3 each
    3: 27,     // 9 workshops @ 3 each
    4: 45,     // 3 factories @ 15 each
    5: 90,     // 6 factories @ 15 each
    6: 150,    // Heavy industry
    7: 300     // Industrial complex
};

// Production per phase
export const PHASE_PRODUCTION = {
    0: 0,
    1: 5,
    2: 10,
    3: 15,
    4: 30,
    5: 60,
    6: 120,
    7: 250
};

// Pollution per phase
export const PHASE_POLLUTION = {
    0: 0,
    1: 2,
    2: 4,
    3: 6,
    4: 12,
    5: 24,
    6: 40,
    7: 80
};

// Building icons for rendering
export const INDUSTRIAL_ICONS = {
    empty: '🏗️',
    workshop: '🔧',
    workshopAlt: '⚙️',
    factory: '🏭',
    heavyIndustry: '⚗️',
    smokestack: '🏭',
    warehouse: '📦',
    construction: '👷'
};

export class IndustrialAllotmentManager {
    constructor(game) {
        this.game = game;
        this.map = game.tileMap;
        this.allotments = new Map();
        this.baseGrowthRate = 3;
    }

    createAllotment(x, y) {
        console.log(`[IndustrialAllotment] createAllotment called at (${x}, ${y})`);

        if (!this.canPlaceAllotment(x, y)) {
            console.log(`[IndustrialAllotment] ❌ createAllotment: canPlaceAllotment returned false`);
            return false;
        }
        console.log(`[IndustrialAllotment] ✅ createAllotment: canPlaceAllotment passed`);

        const key = `${x},${y}`;

        const allotment = {
            x: x,
            y: y,
            phase: INDUSTRIAL_PHASES.EMPTY,
            progress: 0,
            workshopsBuilt: 0,
            factoriesBuilt: 0,
            hasHeavyIndustry: false,
            hasComplex: false,
            jobs: 0,
            production: 0,
            pollution: 0,
            cells: [
                [null, null, null],
                [null, null, null],
                [null, null, null]
            ],
            createdAt: Date.now()
        };

        this.allotments.set(key, allotment);

        for (let dy = 0; dy < 3; dy++) {
            for (let dx = 0; dx < 3; dx++) {
                const tile = this.map.getTile(x + dx, y + dy);
                if (tile) {
                    tile.building = {
                        type: 'industrial_allotment',
                        allotmentKey: key,
                        cellX: dx,
                        cellY: dy,
                        mainTile: (dx === 0 && dy === 0),
                        originX: x,
                        originY: y
                    };
                }
            }
        }

        console.log(`[IndustrialAllotment] ✅ createAllotment: Allotment created successfully at (${x}, ${y})`);
        return true;
    }

    canPlaceAllotment(x, y) {
        console.log(`[IndustrialAllotment] Checking placement at (${x}, ${y})`);
        for (let dy = 0; dy < 3; dy++) {
            for (let dx = 0; dx < 3; dx++) {
                const checkX = x + dx;
                const checkY = y + dy;
                const tile = this.map.getTile(checkX, checkY);

                if (!tile) {
                    console.log(`  ❌ Tile at (${checkX}, ${checkY}) is null/undefined`);
                    return false;
                }
                if (tile.building) {
                    console.log(`  ❌ Tile at (${checkX}, ${checkY}) has building:`, tile.building);
                    return false;
                }

                const terrain = tile.terrain;
                if (terrain === TERRAIN.WATER || terrain === TERRAIN.DEEP_WATER ||
                    terrain === TERRAIN.MOUNTAIN || terrain === TERRAIN.ROCK) {
                    console.log(`  ❌ Tile at (${checkX}, ${checkY}) has unbuildable terrain: ${terrain}`);
                    return false;
                }
                console.log(`  ✓ Tile at (${checkX}, ${checkY}) OK (terrain: ${terrain})`);
            }
        }
        console.log(`  ✅ All 9 tiles valid for placement`);
        return true;
    }

    getAllotmentAt(x, y) {
        const tile = this.map.getTile(x, y);
        if (tile?.building?.type === 'industrial_allotment') {
            return this.allotments.get(tile.building.allotmentKey);
        }
        return null;
    }

    update() {
        let totalJobs = 0;
        let totalProduction = 0;
        let totalPollution = 0;

        for (const [key, allotment] of this.allotments) {
            this.updateAllotment(allotment);
            totalJobs += allotment.jobs;
            totalProduction += allotment.production;
            totalPollution += allotment.pollution;
        }

        return { totalJobs, totalProduction, totalPollution };
    }

    updateAllotment(allotment) {
        const growthRate = this.calculateGrowthRate(allotment);
        allotment.progress += growthRate;

        if (allotment.progress >= 100) {
            this.advancePhase(allotment);
            allotment.progress = 0;
        }

        allotment.jobs = PHASE_JOBS[allotment.phase] || 0;
        allotment.production = PHASE_PRODUCTION[allotment.phase] || 0;
        allotment.pollution = PHASE_POLLUTION[allotment.phase] || 0;
    }

    calculateGrowthRate(allotment) {
        // Check infrastructure requirements using InfrastructureManager
        const infraManager = this.game.infrastructureManager;
        const hasRoad = infraManager ? infraManager.hasRoadAccess(allotment.x, allotment.y) : this.hasRoadAccess(allotment);
        const hasPower = infraManager ? infraManager.hasPower(allotment.x, allotment.y) : false;
        
        // Store connection status on allotment for rendering
        allotment.hasRoad = hasRoad;
        allotment.hasPower = hasPower;
        
        // REQUIREMENT: Must have BOTH road AND power to develop
        if (!hasRoad || !hasPower) {
            if (allotment.phase === INDUSTRIAL_PHASES.EMPTY) {
                return 0.1; // Very slow - just shows activity
            }
            return 0; // No growth without infrastructure
        }
        
        let rate = this.baseGrowthRate;

        // Bonus for having both connections
        rate += 5;

        // Industrial grows faster with more commercial activity
        const commercialJobs = this.game.commercialManager?.getTotalJobs() || 0;
        rate += Math.min(commercialJobs / 50, 3);

        if (allotment.phase >= INDUSTRIAL_PHASES.FACTORIES_1) {
            rate *= 0.7;
        }
        if (allotment.phase >= INDUSTRIAL_PHASES.INDUSTRIAL_COMPLEX) {
            rate *= 0.5;
        }

        rate += (Math.random() - 0.5) * 2;
        return Math.max(0, rate);
    }

    hasRoadAccess(allotment) {
        const { x, y } = allotment;
        for (let i = 0; i < 3; i++) {
            if (this.isRoad(x + i, y - 1)) return true;
            if (this.isRoad(x + i, y + 3)) return true;
            if (this.isRoad(x - 1, y + i)) return true;
            if (this.isRoad(x + 3, y + i)) return true;
        }
        return false;
    }

    isRoad(x, y) {
        const tile = this.map.getTile(x, y);
        return tile?.building?.type === 'road';
    }

    advancePhase(allotment) {
        const phase = allotment.phase;

        switch (phase) {
            case INDUSTRIAL_PHASES.EMPTY:
                this.buildNextWorkshop(allotment);
                allotment.phase = INDUSTRIAL_PHASES.WORKSHOPS_1;
                break;

            case INDUSTRIAL_PHASES.WORKSHOPS_1:
                this.buildNextWorkshop(allotment);
                if (allotment.workshopsBuilt >= 3) {
                    this.buildNextWorkshop(allotment);
                    allotment.phase = INDUSTRIAL_PHASES.WORKSHOPS_2;
                }
                break;

            case INDUSTRIAL_PHASES.WORKSHOPS_2:
                this.buildNextWorkshop(allotment);
                if (allotment.workshopsBuilt >= 6) {
                    this.buildNextWorkshop(allotment);
                    allotment.phase = INDUSTRIAL_PHASES.WORKSHOPS_FULL;
                }
                break;

            case INDUSTRIAL_PHASES.WORKSHOPS_FULL:
                if (allotment.workshopsBuilt >= 9) {
                    this.convertToFactory(allotment);
                    allotment.phase = INDUSTRIAL_PHASES.FACTORIES_1;
                } else {
                    this.buildNextWorkshop(allotment);
                }
                break;

            case INDUSTRIAL_PHASES.FACTORIES_1:
                this.convertToFactory(allotment);
                if (allotment.factoriesBuilt >= 3) {
                    allotment.phase = INDUSTRIAL_PHASES.FACTORIES_2;
                }
                break;

            case INDUSTRIAL_PHASES.FACTORIES_2:
                this.convertToFactory(allotment);
                if (allotment.factoriesBuilt >= 6) {
                    allotment.phase = INDUSTRIAL_PHASES.HEAVY_INDUSTRY;
                    this.buildHeavyIndustry(allotment);
                }
                break;

            case INDUSTRIAL_PHASES.HEAVY_INDUSTRY:
                allotment.phase = INDUSTRIAL_PHASES.INDUSTRIAL_COMPLEX;
                this.buildIndustrialComplex(allotment);
                break;
        }

        this.announceProgress(allotment);
    }

    buildNextWorkshop(allotment) {
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                if (!allotment.cells[row][col]) {
                    allotment.cells[row][col] = {
                        type: 'workshop',
                        variant: Math.floor(Math.random() * 3)
                    };
                    allotment.workshopsBuilt++;
                    return;
                }
            }
        }
    }

    convertToFactory(allotment) {
        const conversionOrder = [
            [0, 0], [0, 1], [0, 2],
            [1, 0], [1, 1], [1, 2],
            [2, 0], [2, 1], [2, 2]
        ];

        for (const [row, col] of conversionOrder) {
            const cell = allotment.cells[row][col];
            if (cell && cell.type === 'workshop') {
                allotment.cells[row][col] = {
                    type: 'factory',
                    variant: Math.floor(Math.random() * 2)
                };
                allotment.factoriesBuilt++;
                allotment.workshopsBuilt--;
                return;
            }
        }
    }

    buildHeavyIndustry(allotment) {
        allotment.cells = [
            [{ type: 'heavyIndustry', section: 'nw' }, { type: 'heavyIndustry', section: 'n' }, { type: 'heavyIndustry', section: 'ne' }],
            [{ type: 'heavyIndustry', section: 'w' }, { type: 'smokestack' }, { type: 'heavyIndustry', section: 'e' }],
            [{ type: 'heavyIndustry', section: 'sw' }, { type: 'heavyIndustry', section: 's' }, { type: 'heavyIndustry', section: 'se' }]
        ];
        allotment.hasHeavyIndustry = true;
        allotment.workshopsBuilt = 0;
        allotment.factoriesBuilt = 0;
    }

    buildIndustrialComplex(allotment) {
        allotment.cells = [
            [{ type: 'complex', section: 'factory1' }, { type: 'smokestack', tall: true }, { type: 'complex', section: 'factory2' }],
            [{ type: 'complex', section: 'main' }, { type: 'complex', section: 'main' }, { type: 'complex', section: 'main' }],
            [{ type: 'warehouse' }, { type: 'warehouse' }, { type: 'warehouse' }]
        ];
        allotment.hasComplex = true;
    }

    announceProgress(allotment) {
        if (!this.game.showKingTweet) return;
        if (Math.random() > 0.3) return;

        const comments = {
            [INDUSTRIAL_PHASES.WORKSHOPS_1]: [
                "Workshops! Making things again! 🔧",
                "Manufacturing is BACK! 💪",
                "The sound of progress! ⚙️"
            ],
            [INDUSTRIAL_PHASES.WORKSHOPS_FULL]: [
                "9 workshops! We're building an empire! 🏗️",
                "So much production! WINNING! 🎉",
                "Made in the Kingdom! The best quality! 🏆"
            ],
            [INDUSTRIAL_PHASES.FACTORIES_1]: [
                "FACTORIES! Real industry! 🏭",
                "Jobs jobs jobs! I created those! 👔",
                "The industrial revolution 2.0! 📈"
            ],
            [INDUSTRIAL_PHASES.HEAVY_INDUSTRY]: [
                "HEAVY INDUSTRY! Now we're talking! ⚗️",
                "Smokestacks! Beautiful smokestacks! 🏭",
                "150 jobs! Nobody creates jobs like me! 💼"
            ],
            [INDUSTRIAL_PHASES.INDUSTRIAL_COMPLEX]: [
                "An INDUSTRIAL COMPLEX! Tremendous! 🏭",
                "300 jobs! The economy is BOOMING! 📊",
                "We're making EVERYTHING now! 🌟",
                "Warehouses full of goods! So much winning! 📦"
            ]
        };

        const phaseComments = comments[allotment.phase];
        if (phaseComments) {
            const comment = phaseComments[Math.floor(Math.random() * phaseComments.length)];
            this.game.showKingTweet(comment);
        }
    }

    removeAllotment(x, y) {
        const allotment = this.getAllotmentAt(x, y);
        if (!allotment) return false;

        const key = `${allotment.x},${allotment.y}`;

        for (let dy = 0; dy < 3; dy++) {
            for (let dx = 0; dx < 3; dx++) {
                const tile = this.map.getTile(allotment.x + dx, allotment.y + dy);
                if (tile) {
                    tile.building = null;
                }
            }
        }

        this.allotments.delete(key);
        return true;
    }

    getTotalJobs() {
        let total = 0;
        for (const allotment of this.allotments.values()) {
            total += allotment.jobs;
        }
        return total;
    }

    getTotalProduction() {
        let total = 0;
        for (const allotment of this.allotments.values()) {
            total += allotment.production;
        }
        return total;
    }

    getTotalPollution() {
        let total = 0;
        for (const allotment of this.allotments.values()) {
            total += allotment.pollution;
        }
        return total;
    }

    getCellRenderData(x, y) {
        const tile = this.map.getTile(x, y);
        if (!tile?.building?.allotmentKey) return null;

        const allotment = this.allotments.get(tile.building.allotmentKey);
        if (!allotment) return null;

        const cellX = tile.building.cellX;
        const cellY = tile.building.cellY;
        const cell = allotment.cells[cellY][cellX];

        return {
            allotment,
            cell,
            cellX,
            cellY,
            phase: allotment.phase,
            progress: allotment.progress
        };
    }

    serialize() {
        const data = {};
        for (const [key, allotment] of this.allotments) {
            data[key] = { ...allotment };
        }
        return data;
    }

    deserialize(data) {
        this.allotments.clear();
        if (data) {
            for (const [key, value] of Object.entries(data)) {
                this.allotments.set(key, value);
            }
        }
    }

    // Create allotment from saved data
    createAllotmentFromSave(x, y, cellsData) {
        const key = `${x},${y}`;
        
        const allotment = {
            x: x,
            y: y,
            phase: 0,
            progress: 0,
            workshopsBuilt: 0,
            factoriesBuilt: 0,
            hasHeavyIndustry: false,
            jobs: 0,
            pollution: 0,
            cells: [
                [null, null, null],
                [null, null, null],
                [null, null, null]
            ],
            createdAt: Date.now()
        };
        
        // Restore cell data
        if (cellsData) {
            for (const cell of cellsData) {
                if (cell.localX >= 0 && cell.localX < 3 && cell.localY >= 0 && cell.localY < 3) {
                    allotment.cells[cell.localY][cell.localX] = {
                        devLevel: cell.devLevel || 0,
                        progress: cell.progress || 0,
                        hasRoadAccess: cell.hasRoadAccess || false,
                        hasPower: cell.hasPower || false
                    };
                }
            }
        }
        
        // Count buildings and determine phase
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const cell = allotment.cells[row][col];
                if (cell && cell.devLevel >= 1) {
                    if (cell.devLevel <= 3) allotment.workshopsBuilt++;
                    else if (cell.devLevel <= 6) allotment.factoriesBuilt++;
                    else allotment.hasHeavyIndustry = true;
                }
            }
        }
        
        // Determine phase
        if (allotment.hasHeavyIndustry) allotment.phase = 7;
        else if (allotment.factoriesBuilt >= 6) allotment.phase = 6;
        else if (allotment.factoriesBuilt >= 3) allotment.phase = 5;
        else if (allotment.factoriesBuilt >= 1) allotment.phase = 4;
        else if (allotment.workshopsBuilt >= 9) allotment.phase = 3;
        else if (allotment.workshopsBuilt >= 4) allotment.phase = 2;
        else if (allotment.workshopsBuilt >= 1) allotment.phase = 1;
        
        this.allotments.set(key, allotment);
        
        // Mark tiles
        for (let dy = 0; dy < 3; dy++) {
            for (let dx = 0; dx < 3; dx++) {
                const tile = this.map.getTile(x + dx, y + dy);
                if (tile) {
                    tile.building = {
                        type: 'industrial_allotment',
                        allotmentKey: key,
                        cellX: dx,
                        cellY: dy,
                        mainTile: (dx === 0 && dy === 0),
                        originX: x,
                        originY: y
                    };
                }
            }
        }
        
        return allotment;
    }

}
