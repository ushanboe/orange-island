// InfrastructureManager.js - Manages road and power connectivity

export class InfrastructureManager {
    constructor(game) {
        this.game = game;
        this.roadNetworks = [];  // Array of connected road networks
        this.powerGrids = [];    // Array of connected power grids
        this.updateInterval = 30; // Update every 30 ticks (0.5 seconds at 60fps)
        this.tickCounter = 0;

        // Cache for quick lookups
        this.buildingConnections = new Map(); // buildingKey -> { hasRoad, hasPower, connectedTo: [] }
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
        console.log('[INFRA] Networks recalculated:', this.getStatus());
    }

    // ==================== ROAD NETWORK ====================

    calculateRoadNetworks() {
        const tileMap = this.game.tileMap;
        if (!tileMap) return;

        const visited = new Set();
        this.roadNetworks = [];

        // Find all road tiles and group them into networks
        for (let y = 0; y < tileMap.height; y++) {
            for (let x = 0; x < tileMap.width; x++) {
                const tile = tileMap.getTile(x, y);
                if (tile?.building?.type === 'road' && !visited.has(`${x},${y}`)) {
                    // Start a new network from this road
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

        while (queue.length > 0) {
            const {x, y} = queue.shift();
            const key = `${x},${y}`;

            if (visited.has(key)) continue;
            visited.add(key);

            const tile = tileMap.getTile(x, y);
            if (tile?.building?.type !== 'road') continue;

            network.roads.push({x, y});

            // Check adjacent tiles for roads and buildings
            const directions = [
                {dx: 0, dy: -1}, {dx: 0, dy: 1},
                {dx: -1, dy: 0}, {dx: 1, dy: 0}
            ];

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
                        // Track connected buildings using origin coordinates for multi-tile buildings
                        const buildingKey = neighborTile.building.originX !== undefined
                            ? `${neighborTile.building.originX},${neighborTile.building.originY}`
                            : `${nx},${ny}`;

                        network.connectedBuildings.add(buildingKey);

                        // Track building types
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

        // Find all power sources and power lines
        for (let y = 0; y < tileMap.height; y++) {
            for (let x = 0; x < tileMap.width; x++) {
                const tile = tileMap.getTile(x, y);
                if (tile?.building && this.isPowerConductor(tile.building.type) && !visited.has(`${x},${y}`)) {
                    const grid = this.floodFillPower(x, y, visited);
                    if (grid.powerSources.length > 0 || grid.powerLines.length > 0) {
                        this.powerGrids.push(grid);
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
            totalPower: 0,
            poweredBuildings: new Set()
        };

        const queue = [{x: startX, y: startY}];

        while (queue.length > 0) {
            const {x, y} = queue.shift();
            const key = `${x},${y}`;

            if (visited.has(key)) continue;
            visited.add(key);

            const tile = tileMap.getTile(x, y);
            if (!tile?.building) continue;

            const buildingType = tile.building.type;

            if (this.isPowerSource(buildingType)) {
                grid.powerSources.push({x, y, type: buildingType});
                grid.totalPower += this.getPowerOutput(buildingType);
            }

            if (buildingType === 'powerLine') {
                grid.powerLines.push({x, y});
            }

            // Check adjacent tiles
            const directions = [
                {dx: 0, dy: -1}, {dx: 0, dy: 1},
                {dx: -1, dy: 0}, {dx: 1, dy: 0}
            ];

            for (const {dx, dy} of directions) {
                const nx = x + dx;
                const ny = y + dy;
                const neighborTile = tileMap.getTile(nx, ny);

                if (!neighborTile?.building) continue;

                const neighborType = neighborTile.building.type;

                if (this.isPowerConductor(neighborType)) {
                    if (!visited.has(`${nx},${ny}`)) {
                        queue.push({x: nx, y: ny});
                    }
                } else if (neighborType !== 'road') {
                    // Building adjacent to power line/source gets power
                    // Use origin coordinates for multi-tile buildings
                    const buildingKey = neighborTile.building.originX !== undefined
                        ? `${neighborTile.building.originX},${neighborTile.building.originY}`
                        : `${nx},${ny}`;
                    grid.poweredBuildings.add(buildingKey);
                    console.log(`[INFRA] Power connected to building at ${buildingKey} (type: ${neighborType})`);
                }
            }
        }

        return grid;
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

        // Process road networks
        for (const network of this.roadNetworks) {
            for (const buildingKey of network.connectedBuildings) {
                if (!this.buildingConnections.has(buildingKey)) {
                    this.buildingConnections.set(buildingKey, {
                        hasRoad: false,
                        hasPower: false,
                        roadNetwork: null,
                        powerGrid: null
                    });
                }
                const conn = this.buildingConnections.get(buildingKey);
                conn.hasRoad = true;
                conn.roadNetwork = network;
            }
        }

        // Process power grids
        for (const grid of this.powerGrids) {
            if (grid.totalPower <= 0) continue; // No power sources

            for (const buildingKey of grid.poweredBuildings) {
                if (!this.buildingConnections.has(buildingKey)) {
                    this.buildingConnections.set(buildingKey, {
                        hasRoad: false,
                        hasPower: false,
                        roadNetwork: null,
                        powerGrid: null
                    });
                }
                const conn = this.buildingConnections.get(buildingKey);
                conn.hasPower = true;
                conn.powerGrid = grid;
            }
        }

        // Debug: log all building connections
        if (this.buildingConnections.size > 0) {
            console.log('[INFRA] Building connections updated:', this.buildingConnections.size, 'buildings tracked');
            for (const [key, conn] of this.buildingConnections) {
                console.log(`[INFRA]   ${key}: road=${conn.hasRoad}, power=${conn.hasPower}`);
            }
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

    // Check if a building has both road and power
    isFullyConnected(x, y) {
        const key = `${x},${y}`;
        const conn = this.buildingConnections.get(key);
        return conn?.hasRoad && conn?.hasPower;
    }

    // Check if port can spawn boats (connected to commercial AND industrial with power)
    canPortOperateBoats(portX, portY) {
        const key = `${portX},${portY}`;
        const conn = this.buildingConnections.get(key);

        console.log('[INFRA] === canPortOperateBoats check ===');
        console.log('[INFRA] Port location:', portX, portY);
        console.log('[INFRA] Port connection data:', conn);

        if (!conn?.hasRoad) {
            console.log('[INFRA] ❌ Port has no road connection');
            return false;
        }

        const network = conn.roadNetwork;
        if (!network) {
            console.log('[INFRA] ❌ Port has no road network');
            return false;
        }

        console.log('[INFRA] Port road network has', network.connectedBuildings?.size || 0, 'connected buildings');

        // Port needs road connection to both commercial and industrial
        // AND those need to have power
        let hasConnectedCommercialWithPower = false;
        let hasConnectedIndustrialWithPower = false;

        for (const buildingKey of network.connectedBuildings) {
            const buildingConn = this.buildingConnections.get(buildingKey);

            // Check what type of building this is
            const [bx, by] = buildingKey.split(',').map(Number);
            const tile = this.game.tileMap?.getTile(bx, by);
            const buildingType = tile?.building?.type;

            console.log(`[INFRA] Checking building at ${buildingKey}: type=${buildingType}, hasPower=${buildingConn?.hasPower}`);

            if (!buildingConn?.hasPower) {
                console.log(`[INFRA]   - No power, skipping`);
                continue;
            }

            if (buildingType === 'commercial_allotment') {
                hasConnectedCommercialWithPower = true;
                console.log('[INFRA] ✅ Found COMMERCIAL with power!');
            }
            if (buildingType === 'industrial_allotment') {
                hasConnectedIndustrialWithPower = true;
                console.log('[INFRA] ✅ Found INDUSTRIAL with power!');
            }
        }

        const canOperate = hasConnectedCommercialWithPower && hasConnectedIndustrialWithPower;
        console.log('[INFRA] === Result:', canOperate ? '✅ BOATS CAN OPERATE' : '❌ BOATS CANNOT OPERATE', '===');
        console.log('[INFRA]   Commercial with power:', hasConnectedCommercialWithPower);
        console.log('[INFRA]   Industrial with power:', hasConnectedIndustrialWithPower);
        return canOperate;
    }

    // Get infrastructure status for debug display
    getStatus() {
        return {
            roadNetworks: this.roadNetworks.length,
            powerGrids: this.powerGrids.length,
            totalPower: this.powerGrids.reduce((sum, g) => sum + g.totalPower, 0),
            connectedBuildings: this.buildingConnections.size
        };
    }
}
