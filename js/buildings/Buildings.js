// Building Definitions for Island Kingdom
// Each building has: name, cost, size, color, category, effects

export const BUILDING_CATEGORIES = {
    ZONES: 'zones',
    INFRASTRUCTURE: 'infrastructure',
    SPECIAL: 'special',
    DEMOLISH: 'demolish'
};

export const BUILDINGS = {
    // === ZONES ===
    residential: {
        id: 'residential',
        name: 'Residential Zone',
        description: 'Housing for your loyal subjects',
        category: BUILDING_CATEGORIES.ZONES,
        cost: 100,
        size: 1,
        color: '#4CAF50',  // Green
        icon: '🏠',
        effects: {
            maxPopulation: 10,
            happiness: 1
        },
        canBuildOn: ['grass', 'dirt']
    },
    commercial: {
        id: 'commercial',
        name: 'Commercial Zone',
        description: 'Shops to sell imported goods (with tariffs!)',
        category: BUILDING_CATEGORIES.ZONES,
        cost: 150,
        size: 1,
        color: '#2196F3',  // Blue
        icon: '🏪',
        effects: {
            taxIncome: 5,
            jobs: 5
        },
        canBuildOn: ['grass', 'dirt']
    },
    industrial: {
        id: 'industrial',
        name: 'Industrial Zone',
        description: 'Factories to make the kingdom great again',
        category: BUILDING_CATEGORIES.ZONES,
        cost: 200,
        size: 1,
        color: '#FF9800',  // Orange
        icon: '🏭',
        effects: {
            jobs: 10,
            pollution: 2,
            production: 5
        },
        canBuildOn: ['grass', 'dirt']
    },

    // === INFRASTRUCTURE ===
    road: {
        id: 'road',
        name: 'Road',
        description: 'The best roads, believe me',
        category: BUILDING_CATEGORIES.INFRASTRUCTURE,
        cost: 10,
        size: 1,
        color: '#424242',  // Dark gray
        icon: '🛤️',
        effects: {
            connectivity: 1
        },
        canBuildOn: ['grass', 'dirt', 'sand']
    },
    wall: {
        id: 'wall',
        name: 'Border Wall',
        description: 'Keep the outsiders OUT! (Reduces immigration)',
        category: BUILDING_CATEGORIES.INFRASTRUCTURE,
        cost: 50,
        size: 1,
        color: '#795548',  // Brown
        icon: '🧱',
        effects: {
            immigration: -5,
            kingEgo: 2
        },
        canBuildOn: ['grass', 'dirt', 'sand', 'beach']
    },
    port: {
        id: 'port',
        name: 'Trade Port',
        description: 'Where boats bring goods (and pay TARIFFS!)',
        category: BUILDING_CATEGORIES.INFRASTRUCTURE,
        cost: 500,
        size: 2,
        color: '#00BCD4',  // Cyan
        icon: '⚓',
        effects: {
            tradeCapacity: 10,
            tariffIncome: 10
        },
        canBuildOn: ['beach', 'sand'],
        mustBeNearWater: true
    },

    // === SPECIAL (Monuments) ===
    statue: {
        id: 'statue',
        name: 'Golden Statue of the King',
        description: 'A beautiful, tremendous statue of ME!',
        category: BUILDING_CATEGORIES.SPECIAL,
        cost: 1000,
        size: 2,
        color: '#FFD700',  // Gold
        icon: '🗽',
        effects: {
            kingEgo: 10,
            happiness: -2,
            tourism: 5
        },
        canBuildOn: ['grass', 'dirt']
    },
    tower: {
        id: 'tower',
        name: 'Trump Tower',
        description: 'The most luxurious tower in the kingdom!',
        category: BUILDING_CATEGORIES.SPECIAL,
        cost: 2000,
        size: 3,
        color: '#FFC107',  // Amber
        icon: '🏰',
        effects: {
            kingEgo: 20,
            taxIncome: 50,
            happiness: -5
        },
        canBuildOn: ['grass', 'dirt']
    },
    golfCourse: {
        id: 'golfCourse',
        name: 'Royal Golf Course',
        description: 'Where the king relaxes (very often)',
        category: BUILDING_CATEGORIES.SPECIAL,
        cost: 1500,
        size: 4,
        color: '#8BC34A',  // Light green
        icon: '⛳',
        effects: {
            kingEgo: 15,
            happiness: 3,
            maintenance: -20
        },
        canBuildOn: ['grass']
    },

    // === DEMOLISH ===
    bulldozer: {
        id: 'bulldozer',
        name: 'Bulldozer',
        description: 'Remove buildings (no refunds!)',
        category: BUILDING_CATEGORIES.DEMOLISH,
        cost: 5,
        size: 1,
        color: '#F44336',  // Red
        icon: '🚜',
        effects: {},
        canBuildOn: ['any']
    }
};

// Get building by ID
export function getBuilding(id) {
    return BUILDINGS[id] || null;
}

// Get buildings by category
export function getBuildingsByCategory(category) {
    return Object.values(BUILDINGS).filter(b => b.category === category);
}

// Check if can afford building
export function canAfford(buildingId, treasury) {
    const building = getBuilding(buildingId);
    return building && treasury >= building.cost;
}

// Check if can build on tile
export function canBuildOn(buildingId, tileType) {
    const building = getBuilding(buildingId);
    if (!building) return false;
    if (building.canBuildOn.includes('any')) return true;
    return building.canBuildOn.includes(tileType);
}
