// Building Definitions for Island Kingdom
// Each building has: name, cost, size, color, category, effects

export const BUILDING_CATEGORIES = {
    ZONES: 'zones',
    INFRASTRUCTURE: 'infrastructure',
    POWER: 'power',
    ENERGY: 'energy',
    SPECIAL: 'special',
    SERVICES: 'services',
    DEMOLISH: 'demolish'
};

export const BUILDINGS = {
    // === ZONES ===
    residential: {
        id: 'residential',
        name: 'Residential Allotment',
        description: '3x3 housing zone - grows from houses to apartments to high-rises!',
        category: BUILDING_CATEGORIES.ZONES,
        cost: 500,  // Costs more but it's a 3x3 area
        size: 3,    // 3x3 allotment
        color: '#4CAF50',  // Green
        icon: '🏘️',
        isAllotment: true,  // Special flag for allotment handling
        effects: {
            maxPopulation: 200,  // At full development (high-rises)
            happiness: 2
        },
        canBuildOn: ['grass', 'dirt', 'forest']
    },
    commercial: {
        id: 'commercial',
        name: 'Commercial Allotment',
        description: '3x3 commercial zone - grows from shops to strip malls to mega malls!',
        category: BUILDING_CATEGORIES.ZONES,
        cost: 400,
        size: 3,
        color: '#2196F3',  // Blue
        icon: '🏪',
        isAllotment: true,
        effects: {
            maxJobs: 200,
            maxTaxIncome: 500
        },
        canBuildOn: ['grass', 'dirt', 'forest']
    },
    industrial: {
        id: 'industrial',
        name: 'Industrial Allotment',
        description: '3x3 industrial zone - grows from workshops to factories to industrial complexes!',
        category: BUILDING_CATEGORIES.ZONES,
        cost: 600,
        size: 3,
        color: '#FF9800',  // Orange
        icon: '🏭',
        isAllotment: true,
        effects: {
            maxJobs: 300,
            maxProduction: 250,
            maxPollution: 80
        },
        canBuildOn: ['grass', 'dirt', 'forest']
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
        canBuildOn: ['grass', 'dirt', 'sand'],
        isRoad: true  // Flag for auto-tiling
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

    // === POWER ===
    coalPlant: {
        id: 'coalPlant',
        name: 'Coal Power Plant',
        description: 'Beautiful clean coal! The best energy!',
        category: BUILDING_CATEGORIES.POWER,
        cost: 3000,
        size: 2,
        color: '#37474F',  // Dark blue-gray
        icon: '🏭',
        secondaryIcon: '⚡',
        effects: {
            power: 100,
            pollution: 10,
            jobs: 20
        },
        canBuildOn: ['grass', 'dirt', 'forest']
    },
    nuclearPlant: {
        id: 'nuclearPlant',
        name: 'Nuclear Power Plant',
        description: 'Tremendous power! Very safe, believe me!',
        category: BUILDING_CATEGORIES.POWER,
        cost: 10000,
        size: 2,
        color: '#7B1FA2',  // Purple
        icon: '☢️',
        secondaryIcon: '⚡',
        effects: {
            power: 500,
            pollution: 2,
            jobs: 50,
            meltdownRisk: 1
        },
        canBuildOn: ['grass', 'dirt', 'forest']
    },
    powerLine: {
        id: 'powerLine',
        name: 'Power Line',
        description: 'Carries electricity across the kingdom',
        category: BUILDING_CATEGORIES.POWER,
        cost: 5,
        size: 1,
        color: '#FFC107',  // Amber
        icon: '⚡',
        effects: {
            powerTransmission: 1
        },
        canBuildOn: ['grass', 'dirt', 'sand'],
        isPowerLine: true  // Flag for auto-tiling
    },

    // === ENERGY (Oil & Gas) ===
    oilDerrick: {
        id: 'oilDerrick',
        name: 'Oil Derrick',
        description: 'DRILL BABY DRILL! Black gold!',
        category: BUILDING_CATEGORIES.ENERGY,
        cost: 2000,
        size: 2,
        color: '#212121',  // Black
        icon: '🛢️',
        secondaryIcon: '⛽',
        effects: {
            oilProduction: 20,
            pollution: 5,
            jobs: 15,
            income: 30
        },
        canBuildOn: ['grass', 'dirt', 'sand']
    },
    oilRefinery: {
        id: 'oilRefinery',
        name: 'Oil Refinery',
        description: 'Turn that black gold into fuel! MAGA!',
        category: BUILDING_CATEGORIES.ENERGY,
        cost: 5000,
        size: 2,
        color: '#BF360C',  // Deep orange
        icon: '🏭',
        secondaryIcon: '⛽',
        effects: {
            fuelProduction: 50,
            pollution: 15,
            jobs: 40,
            income: 100,
            requiresOil: 20
        },
        canBuildOn: ['grass', 'dirt', 'forest']
    },
    gasStation: {
        id: 'gasStation',
        name: 'Gas Station',
        description: 'Fuel for the people! Low prices!',
        category: BUILDING_CATEGORIES.ENERGY,
        cost: 300,
        size: 1,
        color: '#E53935',  // Red
        icon: '⛽',
        effects: {
            fuelDistribution: 10,
            jobs: 3,
            income: 10
        },
        canBuildOn: ['grass', 'dirt', 'forest'],
        requiresRoadAccess: true
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
        canBuildOn: ['grass', 'dirt', 'forest']
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
        canBuildOn: ['grass', 'dirt', 'forest']
    },
    golfCourse: {
        id: 'golfCourse',
        name: 'Royal Golf Course',
        description: 'Where the king relaxes (very often)',
        category: BUILDING_CATEGORIES.SPECIAL,
        cost: 1500,
        size: 2,
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

    // === SERVICES ===
    policeStation: {
        id: 'policeStation',
        name: 'Police Station',
        description: 'Law and order! Reduces crime!',
        category: BUILDING_CATEGORIES.SERVICES,
        cost: 1500,
        size: 3,
        color: '#1565C0',  // Blue
        icon: '🚔',
        isServiceBuilding: true,
        effects: {
            crime: -20,
            safety: 15,
            jobs: 25
        },
        canBuildOn: ['grass', 'dirt', 'forest']
    },
    fireStation: {
        id: 'fireStation',
        name: 'Fire Station',
        description: 'Brave firefighters ready to serve!',
        category: BUILDING_CATEGORIES.SERVICES,
        cost: 1200,
        size: 3,
        color: '#D32F2F',  // Red
        icon: '🚒',
        isServiceBuilding: true,
        effects: {
            fireRisk: -25,
            safety: 10,
            jobs: 20
        },
        canBuildOn: ['grass', 'dirt', 'forest']
    },
    hospital: {
        id: 'hospital',
        name: 'Hospital',
        description: 'Healthcare for the people!',
        category: BUILDING_CATEGORIES.SERVICES,
        cost: 2500,
        size: 3,
        color: '#FFFFFF',  // White
        icon: '🏥',
        isServiceBuilding: true,
        effects: {
            health: 30,
            happiness: 10,
            jobs: 50
        },
        canBuildOn: ['grass', 'dirt', 'forest']
    },
    school: {
        id: 'school',
        name: 'School',
        description: 'Education for the future!',
        category: BUILDING_CATEGORIES.SERVICES,
        cost: 1000,
        size: 3,
        color: '#FFA000',  // Amber
        icon: '🏫',
        isServiceBuilding: true,
        effects: {
            education: 20,
            happiness: 5,
            jobs: 30
        },
        canBuildOn: ['grass', 'dirt', 'forest']
    },

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

// Check if building is a road (for auto-tiling)
export function isRoadType(buildingId) {
    const building = getBuilding(buildingId);
    return building && building.isRoad === true;
}

// Check if building is a power line (for auto-tiling)
export function isPowerLineType(buildingId) {
    const building = getBuilding(buildingId);
    return building && building.isPowerLine === true;
}
