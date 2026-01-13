// js/simulation/Development.js
// Zone development system - buildings grow and change visually over time

// Development levels for zones
export const DEV_LEVELS = {
    EMPTY: 0,      // Just zoned, no building yet
    SMALL: 1,      // Small building (house, small shop, small factory)
    MEDIUM: 2,     // Medium building
    LARGE: 3,      // Large building
    DENSE: 4       // Maximum development
};

// Visual representations for each zone type at each level
export const ZONE_VISUALS = {
    residential: {
        0: { symbol: '🏗️', color: '#90EE90', label: 'Empty Lot' },
        1: { symbol: '🏠', color: '#98FB98', label: 'Small House' },
        2: { symbol: '🏘️', color: '#7CCD7C', label: 'Houses' },
        3: { symbol: '🏢', color: '#66CDAA', label: 'Apartment' },
        4: { symbol: '🏙️', color: '#5F9EA0', label: 'High-Rise' }
    },
    commercial: {
        0: { symbol: '🏗️', color: '#FFE4B5', label: 'Empty Lot' },
        1: { symbol: '🏪', color: '#FFDAB9', label: 'Small Shop' },
        2: { symbol: '🏬', color: '#FFB347', label: 'Store' },
        3: { symbol: '🏦', color: '#FFA500', label: 'Office' },
        4: { symbol: '🏛️', color: '#FF8C00', label: 'Tower' }
    },
    industrial: {
        0: { symbol: '🏗️', color: '#D3D3D3', label: 'Empty Lot' },
        1: { symbol: '🏭', color: '#C0C0C0', label: 'Workshop' },
        2: { symbol: '🏭', color: '#A9A9A9', label: 'Factory' },
        3: { symbol: '⚙️', color: '#808080', label: 'Plant' },
        4: { symbol: '🔧', color: '#696969', label: 'Complex' }
    }
};

export class DevelopmentManager {
    constructor(game) {
        this.game = game;
        this.map = game.map;

        // Track development level for each tile
        // Key: "x,y", Value: { level: 0-4, progress: 0-100 }
        this.development = new Map();

        // Development speed factors
        this.baseGrowthRate = 8;  // Base progress per month
        this.decayRate = 2;       // Progress lost when conditions bad

        // Animation state
        this.animations = [];  // Active construction animations
    }

    // Initialize development tracking for a newly placed zone
    initZone(x, y, buildingType) {
        const key = `${x},${y}`;
        this.development.set(key, {
            type: buildingType,
            level: DEV_LEVELS.EMPTY,
            progress: 0,
            population: 0,
            jobs: 0,
            lastUpdate: Date.now()
        });

        // Start construction animation
        this.addAnimation(x, y, 'construction');
    }

    // Get development info for a tile
    getDevelopment(x, y) {
        return this.development.get(`${x},${y}`);
    }

    // Get visual info for rendering
    getVisual(x, y) {
        const dev = this.getDevelopment(x, y);
        if (!dev) return null;

        const visuals = ZONE_VISUALS[dev.type];
        if (!visuals) return null;

        return visuals[dev.level] || visuals[0];
    }

    // Add animation effect
    addAnimation(x, y, type) {
        this.animations.push({
            x, y, type,
            startTime: Date.now(),
            duration: type === 'construction' ? 2000 : 1000
        });
    }

    // Update all zones - called each game tick
    update() {
        const stats = {
            totalPopulation: 0,
            totalJobs: 0,
            developed: 0,
            growing: 0,
            declining: 0
        };

        for (const [key, dev] of this.development) {
            const [x, y] = key.split(',').map(Number);
            const growth = this.calculateGrowth(x, y, dev);

            // Apply growth/decay
            dev.progress += growth;

            if (growth > 0) stats.growing++;
            else if (growth < 0) stats.declining++;

            // Level up check
            if (dev.progress >= 100 && dev.level < DEV_LEVELS.DENSE) {
                dev.level++;
                dev.progress = 0;
                this.onLevelUp(x, y, dev);
            }

            // Level down check (abandonment)
            if (dev.progress <= -50 && dev.level > DEV_LEVELS.EMPTY) {
                dev.level--;
                dev.progress = 50;
                this.onLevelDown(x, y, dev);
            }

            // Clamp progress
            dev.progress = Math.max(-50, Math.min(100, dev.progress));

            // Calculate population/jobs based on level
            this.updateZoneOutput(dev);

            if (dev.level > 0) stats.developed++;
            stats.totalPopulation += dev.population;
            stats.totalJobs += dev.jobs;
        }

        // Clean up finished animations
        const now = Date.now();
        this.animations = this.animations.filter(a => now - a.startTime < a.duration);

        return stats;
    }

    // Calculate growth rate for a zone
    calculateGrowth(x, y, dev) {
        let growth = this.baseGrowthRate;

        // Factor 1: Road access (zones need roads nearby)
        const hasRoad = this.hasNearbyRoad(x, y);
        if (!hasRoad) growth -= 4;

        // Factor 2: Demand (based on game economy)
        const demand = this.getDemand(dev.type);
        growth += demand * 3;

        // Factor 3: King's mood affects everything
        if (this.game.kingMood !== undefined) {
            const moodBonus = (this.game.kingMood - 50) / 20;
            growth += moodBonus;
        }

        // Factor 4: Nearby development (clustering bonus)
        const neighbors = this.countNearbyDeveloped(x, y);
        growth += neighbors * 0.5;

        // Factor 5: Random variation
        growth += (Math.random() - 0.5) * 3;

        // Factor 6: Tariffs affect commercial/industrial
        if (dev.type === 'commercial' || dev.type === 'industrial') {
            if (this.game.tariffSystem) {
                const avgTariff = this.game.tariffSystem.getAverageTariff?.() || 25;
                if (avgTariff > 50) growth -= (avgTariff - 50) / 20;
            }
        }

        return growth;
    }

    // Check if there's a road within 2 tiles
    hasNearbyRoad(x, y) {
        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -2; dy <= 2; dy++) {
                const tile = this.map.getTile(x + dx, y + dy);
                if (tile && tile.building && tile.building.type === 'road') return true;
            }
        }
        return false;
    }

    // Count developed zones nearby
    countNearbyDeveloped(x, y) {
        let count = 0;
        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -2; dy <= 2; dy++) {
                if (dx === 0 && dy === 0) continue;
                const dev = this.getDevelopment(x + dx, y + dy);
                if (dev && dev.level > 0) count++;
            }
        }
        return count;
    }

    // Get demand for zone type
    getDemand(type) {
        const pop = this.game.population || 0;
        const zones = this.countZonesByType(type);

        switch (type) {
            case 'residential':
                return Math.max(0, 4 - zones * 0.05);
            case 'commercial':
                return Math.max(-1, (pop / 30) - zones * 0.3);
            case 'industrial':
                const commercial = this.countZonesByType('commercial');
                return Math.max(-1, commercial * 0.5 - zones * 0.2);
            default:
                return 0;
        }
    }

    // Count zones of a type
    countZonesByType(type) {
        let count = 0;
        for (const dev of this.development.values()) {
            if (dev.type === type) count++;
        }
        return count;
    }

    // Update population/jobs output
    updateZoneOutput(dev) {
        const levelMultiplier = [0, 2, 5, 12, 25];

        switch (dev.type) {
            case 'residential':
                dev.population = levelMultiplier[dev.level];
                dev.jobs = 0;
                break;
            case 'commercial':
                dev.population = 0;
                dev.jobs = levelMultiplier[dev.level];
                break;
            case 'industrial':
                dev.population = 0;
                dev.jobs = Math.floor(levelMultiplier[dev.level] * 1.5);
                break;
        }
    }

    // Called when a zone levels up
    onLevelUp(x, y, dev) {
        // Add level-up animation
        this.addAnimation(x, y, 'levelup');

        const visual = ZONE_VISUALS[dev.type]?.[dev.level];
        if (visual && dev.level >= 1) {
            const comments = [
                `Look at that beautiful ${visual.label}! I built that! 👑`,
                `${visual.label} going up! The kingdom grows! 🏗️`,
                `More ${visual.label}s = more taxes for ME! 💰`,
                `They said I couldn't build. WRONG! ${visual.symbol}`,
                `TREMENDOUS development! Best ${visual.label} ever! 🎉`,
                `The kingdom is BOOMING under my leadership! 📈`
            ];
            if (Math.random() < 0.25 && this.game.showKingTweet) {
                this.game.showKingTweet(comments[Math.floor(Math.random() * comments.length)]);
            }
        }
    }

    // Called when a zone levels down (abandonment)
    onLevelDown(x, y, dev) {
        this.addAnimation(x, y, 'decline');

        if (Math.random() < 0.4 && this.game.showKingTweet) {
            const comments = [
                "A building abandoned? FAKE NEWS! 📰",
                "That wasn't a good building anyway! 🙄",
                "The PREVIOUS king's fault! Not mine! 😤",
                "We'll build something BETTER there! 🏗️",
                "SAD! But we'll make it great again! 💪"
            ];
            this.game.showKingTweet(comments[Math.floor(Math.random() * comments.length)]);
        }
    }

    // Remove development tracking when building demolished
    removeZone(x, y) {
        this.development.delete(`${x},${y}`);
    }

    // Get total population from all zones
    getTotalPopulation() {
        let total = 0;
        for (const dev of this.development.values()) {
            total += dev.population || 0;
        }
        return total;
    }

    // Get active animations for rendering
    getAnimations() {
        return this.animations;
    }

    // Serialize for save
    serialize() {
        const data = {};
        for (const [key, value] of this.development) {
            data[key] = value;
        }
        return data;
    }

    // Deserialize from save
    deserialize(data) {
        this.development.clear();
        if (data) {
            for (const [key, value] of Object.entries(data)) {
                this.development.set(key, value);
            }
        }
    }
}
