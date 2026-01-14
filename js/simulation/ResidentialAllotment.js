// js/simulation/ResidentialAllotment.js
import { TERRAIN } from '../map/TileMap.js';
// Advanced residential development system with 3x3 allotments
// Phases: Empty -> Houses fill in -> Apartments replace houses -> High-rises

export const RESIDENTIAL_PHASES = {
    EMPTY: 0,           // Just zoned, empty 3x3 lot
    HOUSES_1: 1,        // 1-3 houses
    HOUSES_2: 2,        // 4-6 houses  
    HOUSES_FULL: 3,     // All 9 houses built
    APARTMENTS_1: 4,    // 1-3 apartment blocks (replacing houses)
    APARTMENTS_2: 5,    // 4-6 apartment blocks
    APARTMENTS_RING: 6, // 8 apartments around edge, center empty (courtyard)
    HIGHRISE: 7         // 2 high-rise towers
};

// Population per phase
export const PHASE_POPULATION = {
    0: 0,
    1: 6,      // 1-3 houses @ 2 each
    2: 12,     // 4-6 houses @ 2 each
    3: 18,     // 9 houses @ 2 each
    4: 36,     // 3 apartments @ 12 each
    5: 72,     // 6 apartments @ 12 each
    6: 96,     // 8 apartments @ 12 each
    7: 200     // 2 high-rises @ 100 each
};

// Building icons for rendering
export const RESIDENTIAL_ICONS = {
    empty: '🏗️',
    house: '🏠',
    houseAlt: '🏡',
    apartment: '🏢',
    apartmentAlt: '🏬',
    highrise: '🏙️',
    courtyard: '🌳',
    construction: '👷'
};

export class ResidentialAllotmentManager {
    constructor(game) {
        this.game = game;
        this.map = game.tileMap;

        // Track all residential allotments
        // Key: "x,y" (top-left corner), Value: allotment data
        this.allotments = new Map();

        // Development speed
        this.baseGrowthRate = 5;
        this.houseGrowthRate = 8;
        this.apartmentGrowthRate = 4;
        this.highriseGrowthRate = 2;
    }

    // Create a new 3x3 residential allotment
    createAllotment(x, y) {
        console.log(`[ResidentialAllotment] createAllotment called at (${x}, ${y})`);

        // Ensure we're placing at valid position
        if (!this.canPlaceAllotment(x, y)) {
            console.log(`[ResidentialAllotment] ❌ createAllotment: canPlaceAllotment returned false`);
            return false;
        }
        console.log(`[ResidentialAllotment] ✅ createAllotment: canPlaceAllotment passed`);

        const key = `${x},${y}`;

        // Create allotment data
        const allotment = {
            x: x,
            y: y,
            phase: RESIDENTIAL_PHASES.EMPTY,
            progress: 0,
            housesBuilt: 0,      // 0-9 houses
            apartmentsBuilt: 0,  // 0-8 apartments
            hasHighrises: false,
            population: 0,

            // Track which cells have what building
            // 3x3 grid: cells[row][col]
            cells: [
                [null, null, null],
                [null, null, null],
                [null, null, null]
            ],

            createdAt: Date.now()
        };

        this.allotments.set(key, allotment);

        // Mark all 9 tiles as part of this allotment
        for (let dy = 0; dy < 3; dy++) {
            for (let dx = 0; dx < 3; dx++) {
                const tile = this.map.getTile(x + dx, y + dy);
                if (tile) {
                    tile.building = {
                        type: 'residential_allotment',
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

        console.log(`[ResidentialAllotment] ✅ createAllotment: Allotment created successfully at (${x}, ${y})`);
        return true;
    }

    // Check if we can place a 3x3 allotment
    canPlaceAllotment(x, y) {
        console.log(`[ResidentialAllotment] Checking placement at (${x}, ${y})`);
        for (let dy = 0; dy < 3; dy++) {
            for (let dx = 0; dx < 3; dx++) {
                const checkX = x + dx;
                const checkY = y + dy;
                const tile = this.map.getTile(checkX, checkY);

                if (!tile) {
                    console.log(`  ❌ Tile at (${checkX}, ${checkY}) is null/undefined (out of bounds?)`);
                    return false;
                }
                if (tile.building) {
                    console.log(`  ❌ Tile at (${checkX}, ${checkY}) has building:`, tile.building);
                    return false;
                }

                // Check terrain - must be buildable
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

    // Get allotment at any position (finds the parent allotment)
    getAllotmentAt(x, y) {
        const tile = this.map.getTile(x, y);
        if (tile?.building?.type === 'residential_allotment') {
            return this.allotments.get(tile.building.allotmentKey);
        }
        return null;
    }

    // Update all allotments
    update() {
        let totalPopulation = 0;

        for (const [key, allotment] of this.allotments) {
            this.updateAllotment(allotment);
            totalPopulation += allotment.population;
        }

        return { totalPopulation };
    }

    // Update a single allotment
    updateAllotment(allotment) {
        const growthRate = this.calculateGrowthRate(allotment);
        allotment.progress += growthRate;

        // Check for phase transitions
        if (allotment.progress >= 100) {
            this.advancePhase(allotment);
            allotment.progress = 0;
        }

        // Update population
        allotment.population = PHASE_POPULATION[allotment.phase] || 0;
    }

    // Calculate growth rate based on conditions
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
            // No development without infrastructure
            // But allow very slow progress in EMPTY phase (construction prep)
            if (allotment.phase === RESIDENTIAL_PHASES.EMPTY) {
                return 0.1; // Very slow - just shows activity
            }
            return 0; // No growth without infrastructure
        }
        
        let rate = this.baseGrowthRate;

        // Bonus for having both connections
        rate += 5;

        // King mood bonus
        if (this.game.kingMood !== undefined) {
            rate += (this.game.kingMood - 50) / 25;
        }

        // Slower growth at higher phases
        if (allotment.phase >= RESIDENTIAL_PHASES.APARTMENTS_1) {
            rate *= 0.7;
        }
        if (allotment.phase >= RESIDENTIAL_PHASES.HIGHRISE) {
            rate *= 0.5;
        }

        // Random variation
        rate += (Math.random() - 0.5) * 2;

        return Math.max(0, rate);
    }

    // Check if allotment has road access
    hasRoadAccess(allotment) {
        const { x, y } = allotment;

        // Check all edges of the 3x3 for adjacent roads
        for (let i = 0; i < 3; i++) {
            // Top edge
            if (this.isRoad(x + i, y - 1)) return true;
            // Bottom edge
            if (this.isRoad(x + i, y + 3)) return true;
            // Left edge
            if (this.isRoad(x - 1, y + i)) return true;
            // Right edge
            if (this.isRoad(x + 3, y + i)) return true;
        }
        return false;
    }

    isRoad(x, y) {
        const tile = this.map.getTile(x, y);
        return tile?.building?.type === 'road';
    }

    // Advance to next development phase
    advancePhase(allotment) {
        const phase = allotment.phase;

        switch (phase) {
            case RESIDENTIAL_PHASES.EMPTY:
                // Start building houses
                this.buildNextHouse(allotment);
                allotment.phase = RESIDENTIAL_PHASES.HOUSES_1;
                break;

            case RESIDENTIAL_PHASES.HOUSES_1:
                this.buildNextHouse(allotment);
                if (allotment.housesBuilt >= 3) {
                    this.buildNextHouse(allotment); // Build one more
                    allotment.phase = RESIDENTIAL_PHASES.HOUSES_2;
                }
                break;

            case RESIDENTIAL_PHASES.HOUSES_2:
                this.buildNextHouse(allotment);
                if (allotment.housesBuilt >= 6) {
                    this.buildNextHouse(allotment);
                    allotment.phase = RESIDENTIAL_PHASES.HOUSES_FULL;
                }
                break;

            case RESIDENTIAL_PHASES.HOUSES_FULL:
                // All 9 houses built, start converting to apartments
                if (allotment.housesBuilt >= 9) {
                    this.convertToApartment(allotment);
                    allotment.phase = RESIDENTIAL_PHASES.APARTMENTS_1;
                } else {
                    this.buildNextHouse(allotment);
                }
                break;

            case RESIDENTIAL_PHASES.APARTMENTS_1:
                this.convertToApartment(allotment);
                if (allotment.apartmentsBuilt >= 3) {
                    allotment.phase = RESIDENTIAL_PHASES.APARTMENTS_2;
                }
                break;

            case RESIDENTIAL_PHASES.APARTMENTS_2:
                this.convertToApartment(allotment);
                if (allotment.apartmentsBuilt >= 6) {
                    allotment.phase = RESIDENTIAL_PHASES.APARTMENTS_RING;
                }
                break;

            case RESIDENTIAL_PHASES.APARTMENTS_RING:
                // Convert remaining edge houses to apartments, clear center
                this.completeApartmentRing(allotment);
                if (allotment.apartmentsBuilt >= 8) {
                    allotment.phase = RESIDENTIAL_PHASES.HIGHRISE;
                    this.buildHighrises(allotment);
                }
                break;
        }

        // King comment on major milestones
        this.announceProgress(allotment);
    }

    // Build next house in an empty cell
    buildNextHouse(allotment) {
        // Find empty cell
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                if (!allotment.cells[row][col]) {
                    allotment.cells[row][col] = {
                        type: 'house',
                        variant: Math.floor(Math.random() * 3) // Visual variety
                    };
                    allotment.housesBuilt++;
                    return;
                }
            }
        }
    }

    // Convert a house to an apartment (3 adjacent houses become 1 apartment)
    convertToApartment(allotment) {
        // Priority: corners first, then edges
        const conversionOrder = [
            [0, 0], [0, 2], [2, 0], [2, 2],  // Corners
            [0, 1], [1, 0], [1, 2], [2, 1],  // Edges
            [1, 1]                            // Center (last)
        ];

        for (const [row, col] of conversionOrder) {
            const cell = allotment.cells[row][col];
            if (cell && cell.type === 'house') {
                allotment.cells[row][col] = {
                    type: 'apartment',
                    variant: Math.floor(Math.random() * 2)
                };
                allotment.apartmentsBuilt++;
                allotment.housesBuilt--;
                return;
            }
        }
    }

    // Complete the apartment ring (8 apartments around edge, center is courtyard)
    completeApartmentRing(allotment) {
        // Convert all edge cells to apartments
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                if (row === 1 && col === 1) {
                    // Center becomes courtyard
                    allotment.cells[row][col] = { type: 'courtyard' };
                } else {
                    const cell = allotment.cells[row][col];
                    if (!cell || cell.type !== 'apartment') {
                        allotment.cells[row][col] = {
                            type: 'apartment',
                            variant: Math.floor(Math.random() * 2)
                        };
                        if (cell?.type === 'house') {
                            allotment.housesBuilt--;
                        }
                        allotment.apartmentsBuilt++;
                    }
                }
            }
        }
        allotment.apartmentsBuilt = 8; // Ensure count is correct
    }

    // Build high-rise towers (final phase)
    buildHighrises(allotment) {
        // Clear all cells and place 2 towers
        allotment.cells = [
            [{ type: 'highrise', tower: 1 }, { type: 'highrise', tower: 1 }, { type: 'highrise', tower: 1 }],
            [{ type: 'plaza' }, { type: 'plaza' }, { type: 'plaza' }],
            [{ type: 'highrise', tower: 2 }, { type: 'highrise', tower: 2 }, { type: 'highrise', tower: 2 }]
        ];
        allotment.hasHighrises = true;
        allotment.housesBuilt = 0;
        allotment.apartmentsBuilt = 0;
    }

    // Announce development progress
    announceProgress(allotment) {
        if (!this.game.showKingTweet) return;
        if (Math.random() > 0.3) return; // Only sometimes

        const comments = {
            [RESIDENTIAL_PHASES.HOUSES_1]: [
                "Beautiful houses going up! The BEST houses! 🏠",
                "People are moving in! They love me! 👑",
                "Look at these tremendous homes! 🏡"
            ],
            [RESIDENTIAL_PHASES.HOUSES_FULL]: [
                "The neighborhood is FULL! So much winning! 🎉",
                "9 houses! Nobody builds neighborhoods like me! 🏘️",
                "TREMENDOUS growth! The kingdom prospers! 💰"
            ],
            [RESIDENTIAL_PHASES.APARTMENTS_1]: [
                "Apartments! We're going VERTICAL! 🏢",
                "Bigger buildings = more subjects = more taxes! 💵",
                "The skyline is changing! Beautiful! 🌆"
            ],
            [RESIDENTIAL_PHASES.APARTMENTS_RING]: [
                "Look at that courtyard! So classy! 🌳",
                "European style! Very sophisticated! 🏛️",
                "The best urban planning! Believe me! 📐"
            ],
            [RESIDENTIAL_PHASES.HIGHRISE]: [
                "HIGH-RISES! Now THAT'S a skyline! 🏙️",
                "TOWERS! I know towers! The best towers! 🗼",
                "200 people in one block! EFFICIENCY! 📈",
                "We're building UP! To the SKY! ☁️"
            ]
        };

        const phaseComments = comments[allotment.phase];
        if (phaseComments) {
            const comment = phaseComments[Math.floor(Math.random() * phaseComments.length)];
            this.game.showKingTweet(comment);
        }
    }

    // Remove an allotment (demolish)
    removeAllotment(x, y) {
        const allotment = this.getAllotmentAt(x, y);
        if (!allotment) return false;

        const key = `${allotment.x},${allotment.y}`;

        // Clear all 9 tiles
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

    // Get total population from all allotments
    getTotalPopulation() {
        let total = 0;
        for (const allotment of this.allotments.values()) {
            total += allotment.population;
        }
        return total;
    }

    // Get rendering data for a specific cell
    getCellRenderData(x, y) {
        const tile = this.map.getTile(x, y);
        if (!tile?.building?.allotmentKey) {
            // Only log occasionally to avoid spam
            if (Math.random() < 0.001) console.log(`[ResidentialAllotment] getCellRenderData(${x},${y}): no allotmentKey`, tile?.building);
            return null;
        }

        const allotment = this.allotments.get(tile.building.allotmentKey);
        if (!allotment) {
            console.warn(`[ResidentialAllotment] getCellRenderData(${x},${y}): allotment not found for key ${tile.building.allotmentKey}`);
            return null;
        }

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

    // Serialize for save
    serialize() {
        const data = {};
        for (const [key, allotment] of this.allotments) {
            data[key] = {
                ...allotment,
                createdAt: allotment.createdAt
            };
        }
        return data;
    }

    // Deserialize from save
    deserialize(data) {
        this.allotments.clear();
        if (data) {
            for (const [key, value] of Object.entries(data)) {
                this.allotments.set(key, value);
            }
        }
    }
}
