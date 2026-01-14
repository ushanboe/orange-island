import { Boat } from './Boat.js';

/**
 * TariffSystem - Manages import tariffs and trade
 */
export class TariffSystem {
    constructor(game) {
        this.game = game;

        // Tariff rates by cargo type (0-100%)
        this.tariffRates = {
            goods: 10,
            materials: 5,
            food: 0,
            luxury: 25,
            tech: 15,
            oil: 10,
            steel: 20,
            cars: 25,
        };

        // Global tariff modifier (king can set blanket tariffs)
        this.globalTariffModifier = 0;

        // Trade statistics
        this.stats = {
            totalTariffRevenue: 0,
            totalTradeValue: 0,
            boatsProcessed: 0,
            boatsTurnedAway: 0,
            monthlyRevenue: 0,
            monthlyTrade: 0,
        };

        // Trade relationships (affected by tariffs)
        this.tradeRelations = 100; // 0-100, high tariffs reduce this

        // Boat spawn settings
        this.baseBoatFrequency = 300; // frames between boats
        this.boatSpawnTimer = 0;

        // Active boats
        this.boats = [];

        // Trade messages for king
        this.recentTradeEvents = [];
    }

    update() {
        // Spawn new boats
        this.boatSpawnTimer++;
        const spawnRate = this.calculateBoatSpawnRate();

        if (this.boatSpawnTimer >= spawnRate) {
            this.boatSpawnTimer = 0;
            this.trySpawnBoat();
        }

        // Update existing boats
        for (let i = this.boats.length - 1; i >= 0; i--) {
            this.boats[i].update();
            if (this.boats[i].remove) {
                this.boats.splice(i, 1);
            }
        }
    }

    calculateBoatSpawnRate() {
        // Higher tariffs = fewer boats want to come
        const avgTariff = this.getAverageTariff();
        const tariffPenalty = avgTariff * 5; // Each 1% tariff adds 5 frames

        // Better trade relations = more boats
        const relationBonus = (100 - this.tradeRelations) * 3;

        // More ports = more boats
        const portCount = this.countPorts();
        const portBonus = Math.max(1, portCount) * 0.5;

        return Math.max(200, (this.baseBoatFrequency + tariffPenalty + relationBonus) / portBonus);
    }

    getAverageTariff() {
        const rates = Object.values(this.tariffRates);
        const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
        return avg + this.globalTariffModifier;
    }

    countPorts() {
        const map = this.game.map;
        if (!map) {
            console.warn('TariffSystem: map not available');
            return 0;
        }
        // Use TileMap's countBuildings which handles mainTile correctly
        if (typeof map.countBuildings === 'function') {
            return map.countBuildings('port');
        }
        // Fallback manual count
        let count = 0;
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const tile = map.getTile(x, y);
                if (tile && tile.building && tile.building.type === 'port' && tile.building.mainTile !== false) {
                    count++;
                }
            }
        }
        return count;
    }

    findRandomPort() {
        const ports = [];
        const map = this.game.map;
        if (!map) return null;

        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const tile = map.getTile(x, y);
                if (tile && tile.building && tile.building.type === 'port') {
                    ports.push({ x, y });
                }
            }
        }
        if (ports.length === 0) return null;
        return ports[Math.floor(Math.random() * ports.length)];
    }

    // Find a random OPERATIONAL port (connected to powered commercial + industrial)
    findOperationalPort() {
        const ports = [];
        const map = this.game.map;
        const infraManager = this.game.infrastructureManager;
        
        if (!map) return null;
        if (!infraManager) {
            console.warn('[TARIFF] No infrastructure manager - falling back to any port');
            return this.findRandomPort();
        }

        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const tile = map.getTile(x, y);
                if (tile && tile.building && tile.building.type === 'port' && tile.building.mainTile !== false) {
                    // Get the origin coordinates for multi-tile buildings
                    const portX = tile.building.originX ?? x;
                    const portY = tile.building.originY ?? y;
                    
                    // Check if this port can operate boats
                    if (infraManager.canPortOperateBoats(portX, portY)) {
                        ports.push({ x: portX, y: portY });
                    }
                }
            }
        }
        
        if (ports.length === 0) {
            // Only log occasionally to avoid spam
            if (Math.random() < 0.01) {
                console.log('[TARIFF] No operational ports (need road + powered commercial + powered industrial)');
            }
            return null;
        }
        
        return ports[Math.floor(Math.random() * ports.length)];
    }

    trySpawnBoat() {
        // FIXED: Only spawn boats at operational ports
        const port = this.findOperationalPort();
        if (!port) return; // No operational ports, no boats

        // Check if boat wants to come based on tariffs
        const avgTariff = this.getAverageTariff();
        const comeChance = Math.max(0.1, 1 - (avgTariff / 150));

        if (Math.random() > comeChance) {
            // Boat decided not to come due to high tariffs
            this.stats.boatsTurnedAway++;
            if (avgTariff > 30 && Math.random() < 0.3) {
                this.game.showKingTweet(this.getHighTariffMessage());
            }
            return;
        }

        // Determine which edge to spawn from based on port location
        const mapWidth = this.game.map.width;
        const mapHeight = this.game.map.height;

        // Calculate distances from port to each edge
        const distToLeft = port.x;
        const distToRight = mapWidth - port.x;
        const distToTop = port.y;
        const distToBottom = mapHeight - port.y;

        // Find the nearest edge - boats come from the sea!
        const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);

        let startX, startY;
        const variance = (Math.random() - 0.5) * 4; // Small random offset

        if (minDist === distToLeft) {
            startX = -2;
            startY = port.y + variance;
        } else if (minDist === distToRight) {
            startX = mapWidth + 2;
            startY = port.y + variance;
        } else if (minDist === distToTop) {
            startX = port.x + variance;
            startY = -2;
        } else {
            startX = port.x + variance;
            startY = mapHeight + 2;
        }

        const boat = new Boat(this.game, startX, startY, port);

        // Set spawn direction so boat knows which way to leave
        if (minDist === distToLeft) {
            boat.spawnDirection = 'left';
        } else if (minDist === distToRight) {
            boat.spawnDirection = 'right';
        } else if (minDist === distToTop) {
            boat.spawnDirection = 'top';
        } else {
            boat.spawnDirection = 'bottom';
        }

        this.boats.push(boat);
        console.log('[TARIFF] Boat spawned heading to operational port at', port.x, port.y);
    }
    processBoat(boat) {
        // Calculate tariff for this boat's cargo
        let totalTariff = 0;
        let totalValue = 0;

        for (const item of boat.cargo) {
            const rate = (this.tariffRates[item.type] || 10) + this.globalTariffModifier;
            const value = item.baseValue * item.quantity / 10;
            const tariff = value * (rate / 100);

            totalTariff += tariff;
            totalValue += value;
        }

        // Add to treasury
        this.game.treasury += Math.floor(totalTariff);

        // Update stats
        this.stats.totalTariffRevenue += totalTariff;
        this.stats.totalTradeValue += totalValue;
        this.stats.boatsProcessed++;
        this.stats.monthlyRevenue += totalTariff;
        this.stats.monthlyTrade += totalValue;

        // Affect trade relations based on tariff rate
        const avgRate = totalTariff / totalValue * 100;
        if (avgRate > 20) {
            this.tradeRelations = Math.max(0, this.tradeRelations - 0.5);
        } else if (avgRate < 10) {
            this.tradeRelations = Math.min(100, this.tradeRelations + 0.2);
        }

        // King commentary
        if (Math.random() < 0.2) {
            this.game.showKingTweet(this.getTradeMessage(boat, totalTariff));
        }

        // Log event
        this.recentTradeEvents.push({
            cargo: boat.cargo,
            tariff: totalTariff,
            value: totalValue,
            time: this.game.gameTime
        });

        // Keep only last 10 events
        if (this.recentTradeEvents.length > 10) {
            this.recentTradeEvents.shift();
        }
    }

    getTradeMessage(boat, tariff) {
        const messages = [
            `Just collected $${Math.floor(tariff)} in tariffs. HUGE!`,
            `Another boat paying their fair share. $${Math.floor(tariff)}!`,
            `The ${boat.cargo[0]?.name || 'goods'} are flowing in. We're WINNING!`,
            `$${Math.floor(tariff)} from tariffs. Other countries are paying US now!`,
            `Beautiful boat just docked. Beautiful tariffs. $${Math.floor(tariff)}!`,
            `They said tariffs wouldn't work. WRONG! $${Math.floor(tariff)}!`,
            `Trade is BOOMING. Just made $${Math.floor(tariff)} from one boat!`,
        ];
        return messages[Math.floor(Math.random() * messages.length)];
    }

    getHighTariffMessage() {
        const messages = [
            "A boat just turned around. They couldn't handle our WINNING!",
            "Some boats are too scared to come here. SAD!",
            "They don't want to pay tariffs? FINE! We don't need them!",
            "Another country refusing to trade fairly. We'll see who wins!",
            "Boats turning away means our tariffs are WORKING!",
            "They'll come crawling back. They always do!",
        ];
        return messages[Math.floor(Math.random() * messages.length)];
    }

    setTariffRate(cargoType, rate) {
        if (this.tariffRates.hasOwnProperty(cargoType)) {
            this.tariffRates[cargoType] = Math.max(0, Math.min(100, rate));

            // King reacts to tariff changes
            if (rate > 30) {
                this.game.showKingTweet(`Just set ${cargoType} tariffs to ${rate}%. They'll pay!`);
            }
        }
    }

    setGlobalTariff(modifier) {
        this.globalTariffModifier = Math.max(-20, Math.min(50, modifier));
        if (modifier > 20) {
            this.game.showKingTweet(`MASSIVE tariffs on EVERYONE! ${modifier}% extra on ALL imports!`);
        }
    }

    resetMonthlyStats() {
        this.stats.monthlyRevenue = 0;
        this.stats.monthlyTrade = 0;
    }

    render(ctx, offsetX, offsetY, tileSize) {
        // Render all boats
        for (const boat of this.boats) {
            boat.render(ctx, offsetX, offsetY, tileSize);
        }
    }
}
