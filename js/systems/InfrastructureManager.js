// InfrastructureManager.js - Manages road and power connectivity

export class InfrastructureManager {
    constructor(game) {
        this.game = game;
        this.roadNetworks = [];  // Array of connected road networks
        this.powerGrids = [];    // Array of connected power grids
        this.updateInterval = 30; // Update every 30 ticks
        this.tickCounter = 0;

        // Cache for quick lookups
        this.buildingConnections = new Map(); // buildingKey -> { hasRoad, hasPower }
        this.powerTiles = new Set(); // Set of "x,y" strings for tiles with power access
    }

    update() {
        this.tickCounter++;
        if (this.tickCounter >= this.updateInterval) {
            this.tickCounter = 0;
            this.recalculateNetworks();
        }
    }

    // Force immediate recalculation
    recalculateNetworks() {
        this.calculateRoadNetworks();
        this.calculatePowerGrids();
        this.updateBuildingConnections();
    }

    // ==================== ROAD NETWORK ====================

    calculateRoadNetworks() {
        const tileMap = this.game.tileMap;
        if (!tileMap) return;

        const visited = new Set();
        this.roadNetworks = [];

        for (let y = 0; y < tileMap.height; y++) {
            for (let x = 0; x < tileMap.width; x++) {
                const tile = tileMap.getTile(x, y);
                if (tile?.building?.type === 'road' && !visited.has(`${x},${y}`)) {
                    const network = this.floodFillRoads(x, y, visited);
                    if (network.roads.length > 0) {
                        this.roadNetworks.push(network);
                    }
                }
            }
        }
    }

    floodFillRoads(startX, startY, visited) {
        const tileMap = this.game.tileMap;
        const network = {
            roads: [],
            connectedBuildings: new Set(),
            hasPort: false,
            hasCommercial: false,
            hasIndustrial: false,
            hasResidential: false,
            hasPowerSource: false
        };

        const queue = [{x: startX, y: startY}];
        const directions = [{dx: 0, dy: -1}, {dx: 0, dy: 1}, {dx: -1, dy: 0}, {dx: 1, dy: 0}];

        while (queue.length > 0) {
            const {x, y} = queue.shift();
            const key = `${x},${y}`;

            if (visited.has(key)) continue;
            visited.add(key);

            const tile = tileMap.getTile(x, y);
            if (tile?.building?.type !== 'road') continue;

            network.roads.push({x, y});

            for (const {dx, dy} of directions) {
                const nx = x + dx;
                const ny = y + dy;
                const neighborTile = tileMap.getTile(nx, ny);

                if (!neighborTile) continue;

                if (neighborTile.building) {
                    const buildingType = neighborTile.building.type;

                    if (buildingType === 'road') {
                        if (!visited.has(`${nx},${ny}`)) {
                            queue.push({x: nx, y: ny});
                        }
                    } else {
                        // Use origin for multi-tile buildings
                        const buildingKey = neighborTile.building.originX !== undefined
                            ? `${neighborTile.building.originX},${neighborTile.building.originY}`
                            : `${nx},${ny}`;

                        network.connectedBuildings.add(buildingKey);

                        if (buildingType === 'port') network.hasPort = true;
                        if (buildingType === 'commercial_allotment') network.hasCommercial = true;
                        if (buildingType === 'industrial_allotment') network.hasIndustrial = true;
                        if (buildingType === 'residential_allotment') network.hasResidential = true;
                        if (this.isPowerSource(buildingType)) network.hasPowerSource = true;
                    }
                }
            }
        }

        return network;
    }

    // ==================== POWER GRID ====================

    calculatePowerGrids() {
        const tileMap = this.game.tileMap;
        if (!tileMap) return;

        const visited = new Set();
        this.powerGrids = [];
        this.powerTiles.clear();

        // Find all power conductors and build grids
        for (let y = 0; y < tileMap.height; y++) {
            for (let x = 0; x < tileMap.width; x++) {
                const tile = tileMap.getTile(x, y);
                if (tile?.building && this.isPowerConductor(tile.building.type) && !visited.has(`${x},${y}`)) {
                    const grid = this.floodFillPower(x, y, visited);
                    if (grid.powerSources.length > 0) {
                        this.powerGrids.push(grid);
                        // Mark all tiles adjacent to this grid as having power access
                        this.markPoweredTiles(grid);
                    }
                }
            }
        }
    }

    floodFillPower(startX, startY, visited) {
        const tileMap = this.game.tileMap;
        const grid = {
            powerSources: [],
            powerLines: [],
            allTiles: [], // All tiles that are part of this power grid
            totalPower: 0,
            poweredBuildings: new Set()
        };

        const queue = [{x: startX, y: startY}];
        const directions = [{dx: 0, dy: -1}, {dx: 0, dy: 1}, {dx: -1, dy: 0}, {dx: 1, dy: 0}];

        while (queue.length > 0) {
            const {x, y} = queue.shift();
            const key = `${x},${y}`;

            if (visited.has(key)) continue;
            visited.add(key);

            const tile = tileMap.getTile(x, y);
            if (!tile?.building) continue;

            const buildingType = tile.building.type;

            if (!this.isPowerConductor(buildingType)) continue;

            grid.allTiles.push({x, y});

            if (this.isPowerSource(buildingType)) {
                grid.powerSources.push({x, y, type: buildingType});
                grid.totalPower += this.getPowerOutput(buildingType);
            }

            if (buildingType === 'powerLine') {
                grid.powerLines.push({x, y});
            }

            // Check adjacent tiles for more power conductors
            for (const {dx, dy} of directions) {
                const nx = x + dx;
                const ny = y + dy;
                if (!visited.has(`${nx},${ny}`)) {
                    const neighborTile = tileMap.getTile(nx, ny);
                    if (neighborTile?.building && this.isPowerConductor(neighborTile.building.type)) {
                        queue.push({x: nx, y: ny});
                    }
                }
            }
        }

        return grid;
    }

    // Mark all tiles adjacent to power grid as having power access
    markPoweredTiles(grid) {
        const tileMap = this.game.tileMap;
        const directions = [{dx: 0, dy: -1}, {dx: 0, dy: 1}, {dx: -1, dy: 0}, {dx: 1, dy: 0}];

        // For each tile in the power grid, check all adjacent tiles
        for (const {x, y} of grid.allTiles) {
            for (const {dx, dy} of directions) {
                const nx = x + dx;
                const ny = y + dy;
                const neighborTile = tileMap.getTile(nx, ny);

                if (!neighborTile?.building) continue;
                if (this.isPowerConductor(neighborTile.building.type)) continue; // Skip power infrastructure
                if (neighborTile.building.type === 'road') continue; // Skip roads

                // This tile has power access
                this.powerTiles.add(`${nx},${ny}`);

                // Add the building (using origin for multi-tile)
                const buildingKey = neighborTile.building.originX !== undefined
                    ? `${neighborTile.building.originX},${neighborTile.building.originY}`
                    : `${nx},${ny}`;
                grid.poweredBuildings.add(buildingKey);
            }
        }
    }

    isPowerSource(buildingType) {
        return ['coalPlant', 'nuclearPlant', 'solarFarm', 'windTurbine', 'oilDerrick'].includes(buildingType);
    }

    isPowerConductor(buildingType) {
        return buildingType === 'powerLine' || this.isPowerSource(buildingType);
    }

    getPowerOutput(buildingType) {
        const powerOutputs = {
            coalPlant: 100,
            nuclearPlant: 500,
            solarFarm: 30,
            windTurbine: 20,
            oilDerrick: 50
        };
        return powerOutputs[buildingType] || 0;
    }

    // ==================== CONNECTION QUERIES ====================

    updateBuildingConnections() {
        this.buildingConnections.clear();
        const tileMap = this.game.tileMap;

        // First, find all buildings and their origins
        const buildings = new Map(); // originKey -> { type, tiles: [{x,y}] }

        for (let y = 0; y < tileMap.height; y++) {
            for (let x = 0; x < tileMap.width; x++) {
                const tile = tileMap.getTile(x, y);
                if (!tile?.building) continue;
                if (tile.building.type === 'road') continue;
                if (this.isPowerConductor(tile.building.type)) continue;

                const originX = tile.building.originX ?? x;
                const originY = tile.building.originY ?? y;
                const key = `${originX},${originY}`;

                if (!buildings.has(key)) {
                    buildings.set(key, {
                        type: tile.building.type,
                        originX,
                        originY,
                        tiles: []
                    });
                }
                buildings.get(key).tiles.push({x, y});
            }
        }

        // Now check each building for road and power connections
        for (const [key, building] of buildings) {
            const conn = {
                hasRoad: false,
                hasPower: false,
                roadNetwork: null,
                powerGrid: null
            };

            // Check if ANY tile of this building is adjacent to a road
            for (const {x, y} of building.tiles) {
                // Check road connection
                for (const network of this.roadNetworks) {
                    if (network.connectedBuildings.has(key)) {
                        conn.hasRoad = true;
                        conn.roadNetwork = network;
                        break;
                    }
                }

                // Check power connection - if ANY tile has power access
                if (this.powerTiles.has(`${x},${y}`)) {
                    conn.hasPower = true;
                    // Find which grid
                    for (const grid of this.powerGrids) {
                        if (grid.poweredBuildings.has(key)) {
                            conn.powerGrid = grid;
                            break;
                        }
                    }
                }
            }

            this.buildingConnections.set(key, conn);
        }

        // Debug output
        for (const [key, conn] of this.buildingConnections) {
            const [x, y] = key.split(',').map(Number);
            const tile = tileMap.getTile(x, y);
        }
    }

    // Check if a building at (x, y) has road access
    hasRoadAccess(x, y) {
        const key = `${x},${y}`;
        return this.buildingConnections.get(key)?.hasRoad || false;
    }

    // Check if a building at (x, y) has power
    hasPower(x, y) {
        const key = `${x},${y}`;
        return this.buildingConnections.get(key)?.hasPower || false;
    }

    // Check if a specific tile has power access (for rendering)
    tileHasPower(x, y) {
        return this.powerTiles.has(`${x},${y}`);
    }

    // Check if a building has both road and power
    isFullyConnected(x, y) {
        const key = `${x},${y}`;
        const conn = this.buildingConnections.get(key);
        return conn?.hasRoad && conn?.hasPower;
    }

    // Check if port can spawn boats
    canPortOperateBoats(portX, portY) {
        const key = `${portX},${portY}`;
        const conn = this.buildingConnections.get(key);


        if (!conn?.hasRoad) {
            return false;
        }

        const network = conn.roadNetwork;
        if (!network) {
            return false;
        }

        let hasCommercialWithPower = false;
        let hasIndustrialWithPower = false;

        for (const buildingKey of network.connectedBuildings) {
            const buildingConn = this.buildingConnections.get(buildingKey);
            const [bx, by] = buildingKey.split(',').map(Number);
            const tile = this.game.tileMap?.getTile(bx, by);
            const type = tile?.building?.type;


            if (!buildingConn?.hasPower) continue;

            if (type === 'commercial_allotment') {
                hasCommercialWithPower = true;
            }
            if (type === 'industrial_allotment') {
                hasIndustrialWithPower = true;
            }
        }

        const result = hasCommercialWithPower && hasIndustrialWithPower;
        return result;
    }

    getStatus() {
        return {
            roadNetworks: this.roadNetworks.length,
            powerGrids: this.powerGrids.length,
            totalPower: this.powerGrids.reduce((sum, g) => sum + g.totalPower, 0),
            connectedBuildings: this.buildingConnections.size,
            poweredTiles: this.powerTiles.size
        };
    }
}
