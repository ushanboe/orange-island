// Animation System for Island Kingdom
// Handles animated buildings, vehicles, and effects

export class AnimationSystem {
    constructor(game) {
        this.game = game;
        this.time = 0;
        this.vehicles = [];
        this.boats = [];  // Trade boats
        this.smokeParticles = [];
        this.maxVehicles = 50;
        this.maxBoats = 10;
        this.boatCheckInterval = 60;  // Check every 60 ticks
        this.boatCheckCounter = 0;
    }

    update(deltaTime) {
        this.time += deltaTime || 16;

        // Update vehicles
        this.updateVehicles();

        // Update boats
        this.updateBoats();

        // Update smoke particles
        this.updateSmoke();

        // Spawn new vehicles based on population
        this.manageVehicles();
        
        // Manage boats based on port connectivity
        this.manageBoats();
    }

    // ==================== VEHICLE SYSTEM ====================

    manageVehicles() {
        // Calculate desired vehicle count based on population and commerce
        const pop = this.game.population || 0;
        const desiredVehicles = Math.min(this.maxVehicles, Math.floor(pop / 20) + 2);

        // Spawn vehicles if needed
        if (this.vehicles.length < desiredVehicles && Math.random() < 0.02) {
            this.spawnVehicle();
        }
    }

    // ==================== BOAT SYSTEM ====================

    manageBoats() {
        this.boatCheckCounter++;
        if (this.boatCheckCounter < this.boatCheckInterval) return;
        this.boatCheckCounter = 0;

        // Find all operational ports
        const operationalPorts = this.findOperationalPorts();
        
        if (operationalPorts.length === 0) {
            // No operational ports - boats leave
            return;
        }

        // Spawn boats for operational ports
        const desiredBoats = Math.min(this.maxBoats, operationalPorts.length * 2);
        
        if (this.boats.length < desiredBoats && Math.random() < 0.1) {
            this.spawnBoat(operationalPorts);
        }
    }

    findOperationalPorts() {
        const ports = [];
        const map = this.game.tileMap;
        const infraManager = this.game.infrastructureManager;
        
        if (!map || !infraManager) return ports;

        // Find all port buildings
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const tile = map.getTile(x, y);
                if (tile?.building?.type === 'port' && tile.building.mainTile) {
                    // Check if this port can operate boats
                    const portX = tile.building.originX ?? x;
                    const portY = tile.building.originY ?? y;
                    
                    if (infraManager.canPortOperateBoats(portX, portY)) {
                        ports.push({ x: portX, y: portY });
                    }
                }
            }
        }
        return ports;
    }

    spawnBoat(operationalPorts) {
        if (operationalPorts.length === 0) return;

        // Pick a random operational port
        const port = operationalPorts[Math.floor(Math.random() * operationalPorts.length)];
        
        // Find water tiles near the port to spawn boat
        const waterTile = this.findWaterNearPort(port.x, port.y);
        if (!waterTile) return;

        // Boat types
        const types = ['⛵', '🚢', '🛥️', '⛴️'];
        if (this.game.population > 100) types.push('🚢');

        const boat = {
            x: waterTile.x + 0.5,
            y: waterTile.y + 0.5,
            icon: types[Math.floor(Math.random() * types.length)],
            targetPort: port,
            state: 'arriving',  // arriving, docked, departing
            speed: 0.01 + Math.random() * 0.01,
            lifetime: 0,
            maxLifetime: 800 + Math.random() * 400,
            dockTime: 0,
            maxDockTime: 200 + Math.random() * 100
        };

        this.boats.push(boat);
        
        // Emit event for trade income
        this.game.events?.emit('boatArrived', { port, boat });
    }

    findWaterNearPort(portX, portY) {
        const map = this.game.tileMap;
        if (!map) return null;

        // Search in expanding rings around port
        for (let radius = 2; radius < 10; radius++) {
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
                    
                    const x = portX + dx;
                    const y = portY + dy;
                    const tile = map.getTile(x, y);
                    
                    // Check if it's deep water
                    if (tile && (tile.terrain === 0 || tile.terrain === 'deepwater' || tile.terrain === 'water')) {
                        return { x, y };
                    }
                }
            }
        }
        return null;
    }

    updateBoats() {
        for (let i = this.boats.length - 1; i >= 0; i--) {
            const boat = this.boats[i];
            boat.lifetime++;

            // Remove old boats
            if (boat.lifetime > boat.maxLifetime) {
                this.boats.splice(i, 1);
                continue;
            }

            switch (boat.state) {
                case 'arriving':
                    // Move towards port
                    this.moveBoatTowardsPort(boat);
                    break;
                    
                case 'docked':
                    // Wait at port
                    boat.dockTime++;
                    if (boat.dockTime >= boat.maxDockTime) {
                        boat.state = 'departing';
                        // Generate trade income
                        this.game.treasury = (this.game.treasury || 0) + 50;
                        this.game.events?.emit('tradeCompleted', { boat, income: 50 });
                    }
                    break;
                    
                case 'departing':
                    // Move away from port
                    this.moveBoatAway(boat);
                    // Remove when far enough
                    if (boat.lifetime > boat.maxLifetime * 0.9) {
                        this.boats.splice(i, 1);
                    }
                    break;
            }
        }
    }

    moveBoatTowardsPort(boat) {
        const targetX = boat.targetPort.x + 1;  // Center of 2x2 port
        const targetY = boat.targetPort.y + 1;
        
        const dx = targetX - boat.x;
        const dy = targetY - boat.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 2) {
            boat.state = 'docked';
            return;
        }
        
        boat.x += (dx / dist) * boat.speed;
        boat.y += (dy / dist) * boat.speed;
    }

    moveBoatAway(boat) {
        const targetX = boat.targetPort.x + 1;
        const targetY = boat.targetPort.y + 1;
        
        const dx = boat.x - targetX;
        const dy = boat.y - targetY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 0.1) {
            // Pick a random direction away
            boat.x += (Math.random() - 0.5) * boat.speed;
            boat.y += (Math.random() - 0.5) * boat.speed;
        } else {
            boat.x += (dx / dist) * boat.speed;
            boat.y += (dy / dist) * boat.speed;
        }
    }

    getBoats() {
        return this.boats;
    }

    spawnVehicle() {
        // Find a road to spawn on
        const roads = this.findRoads();
        if (roads.length === 0) return;

        const startRoad = roads[Math.floor(Math.random() * roads.length)];

        // Determine vehicle type based on game state
        const types = ['🚗', '🚙', '🚕'];
        if (this.game.population > 50) types.push('🚌');
        if (this.game.map?.countBuildings?.('industrial') > 0) types.push('🚚');

        const vehicle = {
            x: startRoad.x + 0.5,
            y: startRoad.y + 0.5,
            icon: types[Math.floor(Math.random() * types.length)],
            direction: Math.floor(Math.random() * 4), // 0=N, 1=E, 2=S, 3=W
            speed: 0.02 + Math.random() * 0.02,
            lifetime: 0,
            maxLifetime: 500 + Math.random() * 500
        };

        this.vehicles.push(vehicle);
    }

    findRoads() {
        const roads = [];
        const map = this.game.map;
        if (!map) return roads;

        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const tile = map.getTile(x, y);
                if (tile?.building?.type === 'road') {
                    roads.push({x, y});
                }
            }
        }
        return roads;
    }

    updateVehicles() {
        for (let i = this.vehicles.length - 1; i >= 0; i--) {
            const v = this.vehicles[i];
            v.lifetime++;

            // Remove old vehicles
            if (v.lifetime > v.maxLifetime) {
                this.vehicles.splice(i, 1);
                continue;
            }

            // Move vehicle
            const dx = [0, 1, 0, -1][v.direction];
            const dy = [-1, 0, 1, 0][v.direction];

            v.x += dx * v.speed;
            v.y += dy * v.speed;

            // Check if reached next tile center
            const tileX = Math.floor(v.x);
            const tileY = Math.floor(v.y);
            const centerX = tileX + 0.5;
            const centerY = tileY + 0.5;

            // At tile center, decide next direction
            if (Math.abs(v.x - centerX) < 0.05 && Math.abs(v.y - centerY) < 0.05) {
                v.x = centerX;
                v.y = centerY;
                this.chooseNextDirection(v, tileX, tileY);
            }

            // Remove if off map
            const map = this.game.map;
            if (map && (v.x < 0 || v.x >= map.width || v.y < 0 || v.y >= map.height)) {
                this.vehicles.splice(i, 1);
            }
        }
    }

    chooseNextDirection(vehicle, tileX, tileY) {
        const map = this.game.map;
        if (!map) return;

        // Find connected roads
        const connections = [];
        const dirs = [
            {dir: 0, dx: 0, dy: -1},  // North
            {dir: 1, dx: 1, dy: 0},   // East
            {dir: 2, dx: 0, dy: 1},   // South
            {dir: 3, dx: -1, dy: 0}   // West
        ];

        for (const d of dirs) {
            const nx = tileX + d.dx;
            const ny = tileY + d.dy;
            if (map.isInBounds(nx, ny)) {
                const tile = map.getTile(nx, ny);
                if (tile?.building?.type === 'road') {
                    connections.push(d.dir);
                }
            }
        }

        if (connections.length === 0) {
            // Dead end, turn around
            vehicle.direction = (vehicle.direction + 2) % 4;
        } else if (connections.length === 1) {
            vehicle.direction = connections[0];
        } else {
            // Prefer not to turn around unless necessary
            const opposite = (vehicle.direction + 2) % 4;
            const options = connections.filter(d => d !== opposite);
            if (options.length > 0) {
                vehicle.direction = options[Math.floor(Math.random() * options.length)];
            } else {
                vehicle.direction = connections[Math.floor(Math.random() * connections.length)];
            }
        }
    }

    // ==================== SMOKE SYSTEM ====================

    spawnSmoke(x, y) {
        this.smokeParticles.push({
            x: x + 0.3 + Math.random() * 0.4,
            y: y + 0.2,
            size: 0.1 + Math.random() * 0.1,
            opacity: 0.6 + Math.random() * 0.3,
            vx: (Math.random() - 0.5) * 0.01,
            vy: -0.02 - Math.random() * 0.01,
            life: 0,
            maxLife: 60 + Math.random() * 40
        });
    }

    updateSmoke() {
        // Spawn smoke from coal plants
        if (Math.random() < 0.1) {
            const coalPlants = this.findBuildingsOfType('coalPlant');
            for (const plant of coalPlants) {
                if (Math.random() < 0.3) {
                    this.spawnSmoke(plant.x, plant.y);
                }
            }
        }

        // Update existing smoke
        for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
            const p = this.smokeParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.size += 0.005;
            p.opacity -= 0.01;
            p.life++;

            if (p.life > p.maxLife || p.opacity <= 0) {
                this.smokeParticles.splice(i, 1);
            }
        }
    }

    findBuildingsOfType(type) {
        const buildings = [];
        const map = this.game.map;
        if (!map) return buildings;

        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const tile = map.getTile(x, y);
                if (tile?.building?.type === type && tile.building.mainTile !== false) {
                    buildings.push({x, y, building: tile.building});
                }
            }
        }
        return buildings;
    }

    // ==================== RENDERING ====================

    render(ctx, offsetX, offsetY, tileSize) {
        // Render vehicles
        this.renderVehicles(ctx, offsetX, offsetY, tileSize);

        // Render smoke
        this.renderSmoke(ctx, offsetX, offsetY, tileSize);
    }

    renderVehicles(ctx, offsetX, offsetY, tileSize) {
        const fontSize = Math.max(8, tileSize * 0.5);
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (const v of this.vehicles) {
            const screenX = v.x * tileSize + offsetX;
            const screenY = v.y * tileSize + offsetY;

            // Rotate based on direction
            ctx.save();
            ctx.translate(screenX, screenY);

            // Rotation for direction (vehicles face their movement direction)
            const rotations = [0, Math.PI/2, Math.PI, -Math.PI/2];
            // ctx.rotate(rotations[v.direction]);

            ctx.fillText(v.icon, 0, 0);
            ctx.restore();
        }
    }

    renderSmoke(ctx, offsetX, offsetY, tileSize) {
        for (const p of this.smokeParticles) {
            const screenX = p.x * tileSize + offsetX;
            const screenY = p.y * tileSize + offsetY;
            const size = p.size * tileSize;

            ctx.beginPath();
            ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(100, 100, 100, ${p.opacity})`;
            ctx.fill();
        }
    }

    // ==================== ANIMATED BUILDING ICONS ====================

    getNuclearRotation() {
        // Spinning nuclear symbol
        return (this.time / 1000) * Math.PI * 2;
    }

    getOilPumpOffset() {
        // Oil pump bobbing up and down
        return Math.sin(this.time / 300) * 0.15;
    }

    getCoalSmokeFrame() {
        // Return which smoke frame to show
        return Math.floor(this.time / 200) % 3;
    }
}
