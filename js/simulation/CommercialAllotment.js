// js/simulation/CommercialAllotment.js
import { TERRAIN } from '../map/TileMap.js';
// Commercial development system with 3x3 allotments
// Phases: Empty -> Small shops -> Strip mall -> Shopping center -> Mall complex

export const COMMERCIAL_PHASES = {
    EMPTY: 0,           // Just zoned, empty 3x3 lot
    SHOPS_1: 1,         // 1-3 small shops
    SHOPS_2: 2,         // 4-6 small shops
    SHOPS_FULL: 3,      // All 9 small shops
    STRIP_MALL_1: 4,    // 1-3 strip mall sections
    STRIP_MALL_2: 5,    // 4-6 strip mall sections
    SHOPPING_CENTER: 6, // Full shopping center
    MALL_COMPLEX: 7     // Mega mall with parking
};

// Jobs per phase
export const PHASE_JOBS = {
    0: 0,
    1: 6,      // 1-3 shops @ 2 each
    2: 12,     // 4-6 shops @ 2 each
    3: 18,     // 9 shops @ 2 each
    4: 30,     // 3 strip mall @ 10 each
    5: 60,     // 6 strip mall @ 10 each
    6: 100,    // Shopping center
    7: 200     // Mall complex
};

// Tax income per phase
export const PHASE_TAX_INCOME = {
    0: 0,
    1: 10,
    2: 20,
    3: 30,
    4: 50,
    5: 100,
    6: 200,
    7: 500
};

// Building icons for rendering
export const COMMERCIAL_ICONS = {
    empty: '🏗️',
    shop: '🏪',
    shopAlt: '🛒',
    stripMall: '🏬',
    shoppingCenter: '🛍️',
    mall: '🏢',
    parking: '🅿️',
    construction: '👷'
};

export class CommercialAllotmentManager {
    constructor(game) {
        this.game = game;
        this.map = game.tileMap;
        this.allotments = new Map();
        this.baseGrowthRate = 4;
    }

    createAllotment(x, y) {
        console.log(`[CommercialAllotment] createAllotment called at (${x}, ${y})`);

        if (!this.canPlaceAllotment(x, y)) {
            console.log(`[CommercialAllotment] ❌ createAllotment: canPlaceAllotment returned false`);
            return false;
        }
        console.log(`[CommercialAllotment] ✅ createAllotment: canPlaceAllotment passed`);

        const key = `${x},${y}`;

        const allotment = {
            x: x,
            y: y,
            phase: COMMERCIAL_PHASES.EMPTY,
            progress: 0,
            shopsBuilt: 0,
            stripMallBuilt: 0,
            hasShoppingCenter: false,
            hasMall: false,
            jobs: 0,
            taxIncome: 0,
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
                        type: 'commercial_allotment',
                        allotmentKey: key,
                        cellX: dx,
                        cellY: dy,
                        mainTile: (dx === 0 && dy === 0)
                    };
                }
            }
        }

        console.log(`[CommercialAllotment] ✅ createAllotment: Allotment created successfully at (${x}, ${y})`);
        return true;
    }

    canPlaceAllotment(x, y) {
        console.log(`[CommercialAllotment] Checking placement at (${x}, ${y})`);
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
        if (tile?.building?.type === 'commercial_allotment') {
            return this.allotments.get(tile.building.allotmentKey);
        }
        return null;
    }

    update() {
        let totalJobs = 0;
        let totalTaxIncome = 0;

        for (const [key, allotment] of this.allotments) {
            this.updateAllotment(allotment);
            totalJobs += allotment.jobs;
            totalTaxIncome += allotment.taxIncome;
        }

        return { totalJobs, totalTaxIncome };
    }

    updateAllotment(allotment) {
        const growthRate = this.calculateGrowthRate(allotment);
        allotment.progress += growthRate;

        if (allotment.progress >= 100) {
            this.advancePhase(allotment);
            allotment.progress = 0;
        }

        allotment.jobs = PHASE_JOBS[allotment.phase] || 0;
        allotment.taxIncome = PHASE_TAX_INCOME[allotment.phase] || 0;
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
            if (allotment.phase === COMMERCIAL_PHASES.EMPTY) {
                return 0.1; // Very slow - just shows activity
            }
            return 0; // No growth without infrastructure
        }
        
        let rate = this.baseGrowthRate;

        // Bonus for having both connections
        rate += 5;

        // Commercial grows faster with more population
        const pop = this.game.population || 0;
        rate += Math.min(pop / 100, 5);

        if (allotment.phase >= COMMERCIAL_PHASES.STRIP_MALL_1) {
            rate *= 0.6;
        }
        if (allotment.phase >= COMMERCIAL_PHASES.MALL_COMPLEX) {
            rate *= 0.4;
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
            case COMMERCIAL_PHASES.EMPTY:
                this.buildNextShop(allotment);
                allotment.phase = COMMERCIAL_PHASES.SHOPS_1;
                break;

            case COMMERCIAL_PHASES.SHOPS_1:
                this.buildNextShop(allotment);
                if (allotment.shopsBuilt >= 3) {
                    this.buildNextShop(allotment);
                    allotment.phase = COMMERCIAL_PHASES.SHOPS_2;
                }
                break;

            case COMMERCIAL_PHASES.SHOPS_2:
                this.buildNextShop(allotment);
                if (allotment.shopsBuilt >= 6) {
                    this.buildNextShop(allotment);
                    allotment.phase = COMMERCIAL_PHASES.SHOPS_FULL;
                }
                break;

            case COMMERCIAL_PHASES.SHOPS_FULL:
                if (allotment.shopsBuilt >= 9) {
                    this.convertToStripMall(allotment);
                    allotment.phase = COMMERCIAL_PHASES.STRIP_MALL_1;
                } else {
                    this.buildNextShop(allotment);
                }
                break;

            case COMMERCIAL_PHASES.STRIP_MALL_1:
                this.convertToStripMall(allotment);
                if (allotment.stripMallBuilt >= 3) {
                    allotment.phase = COMMERCIAL_PHASES.STRIP_MALL_2;
                }
                break;

            case COMMERCIAL_PHASES.STRIP_MALL_2:
                this.convertToStripMall(allotment);
                if (allotment.stripMallBuilt >= 6) {
                    allotment.phase = COMMERCIAL_PHASES.SHOPPING_CENTER;
                    this.buildShoppingCenter(allotment);
                }
                break;

            case COMMERCIAL_PHASES.SHOPPING_CENTER:
                allotment.phase = COMMERCIAL_PHASES.MALL_COMPLEX;
                this.buildMallComplex(allotment);
                break;
        }

        this.announceProgress(allotment);
    }

    buildNextShop(allotment) {
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                if (!allotment.cells[row][col]) {
                    allotment.cells[row][col] = {
                        type: 'shop',
                        variant: Math.floor(Math.random() * 3)
                    };
                    allotment.shopsBuilt++;
                    return;
                }
            }
        }
    }

    convertToStripMall(allotment) {
        const conversionOrder = [
            [0, 0], [0, 1], [0, 2],
            [1, 0], [1, 1], [1, 2],
            [2, 0], [2, 1], [2, 2]
        ];

        for (const [row, col] of conversionOrder) {
            const cell = allotment.cells[row][col];
            if (cell && cell.type === 'shop') {
                allotment.cells[row][col] = {
                    type: 'stripMall',
                    variant: Math.floor(Math.random() * 2)
                };
                allotment.stripMallBuilt++;
                allotment.shopsBuilt--;
                return;
            }
        }
    }

    buildShoppingCenter(allotment) {
        allotment.cells = [
            [{ type: 'shoppingCenter', section: 'nw' }, { type: 'shoppingCenter', section: 'n' }, { type: 'shoppingCenter', section: 'ne' }],
            [{ type: 'shoppingCenter', section: 'w' }, { type: 'shoppingCenter', section: 'center' }, { type: 'shoppingCenter', section: 'e' }],
            [{ type: 'shoppingCenter', section: 'sw' }, { type: 'shoppingCenter', section: 's' }, { type: 'shoppingCenter', section: 'se' }]
        ];
        allotment.hasShoppingCenter = true;
        allotment.shopsBuilt = 0;
        allotment.stripMallBuilt = 0;
    }

    buildMallComplex(allotment) {
        allotment.cells = [
            [{ type: 'mall', section: 'main' }, { type: 'mall', section: 'main' }, { type: 'mall', section: 'main' }],
            [{ type: 'mall', section: 'main' }, { type: 'mall', section: 'atrium' }, { type: 'mall', section: 'main' }],
            [{ type: 'parking' }, { type: 'parking' }, { type: 'parking' }]
        ];
        allotment.hasMall = true;
    }

    announceProgress(allotment) {
        if (!this.game.showKingTweet) return;
        if (Math.random() > 0.3) return;

        const comments = {
            [COMMERCIAL_PHASES.SHOPS_1]: [
                "Shops opening! The economy is BOOMING! 🏪",
                "Small businesses! The backbone of the kingdom! 💪",
                "Commerce is flowing! Beautiful! 💰"
            ],
            [COMMERCIAL_PHASES.SHOPS_FULL]: [
                "9 shops! A thriving marketplace! 🛒",
                "So much commerce! The tariffs are rolling in! 💵",
                "TREMENDOUS business growth! 📈"
            ],
            [COMMERCIAL_PHASES.STRIP_MALL_1]: [
                "Strip malls! Very American! Very good! 🏬",
                "Bigger stores = more taxes! WINNING! 🎉",
                "The retail revolution begins! 🛍️"
            ],
            [COMMERCIAL_PHASES.SHOPPING_CENTER]: [
                "A SHOPPING CENTER! So classy! 🛍️",
                "One-stop shopping! Efficiency! 📊",
                "The people love to shop! And I love their taxes! 💰"
            ],
            [COMMERCIAL_PHASES.MALL_COMPLEX]: [
                "A MEGA MALL! The biggest! The best! 🏢",
                "200 jobs! I created those jobs! 👔",
                "This mall is TREMENDOUS! Believe me! 🌟",
                "Parking included! Very thoughtful! 🅿️"
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

    getTotalTaxIncome() {
        let total = 0;
        for (const allotment of this.allotments.values()) {
            total += allotment.taxIncome;
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
}
