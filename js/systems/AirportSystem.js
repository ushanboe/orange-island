// AirportSystem.js - Manages airports, planes, and tourists
// Tourists arrive by plane, visit 5 monuments, then depart

export class Plane {
    constructor(airport, tourists) {
        this.airport = airport;  // {x, y} of airport origin
        this.tourists = tourists;  // Number of tourists (50-100)
        this.state = 'approaching';  // approaching, landing, grounded, boarding, takeoff, departing

        // Start position - off screen, will fly toward airport
        // Approach from random direction
        const angle = Math.random() * Math.PI * 2;
        const distance = 60;  // Start 60 tiles away
        this.x = airport.x + Math.cos(angle) * distance;
        this.y = airport.y + Math.sin(angle) * distance;

        // Target is the airport runway (center of 4x4)
        this.targetX = airport.x + 2;
        this.targetY = airport.y + 2;

        // Animation
        this.progress = 0;  // 0-1 for current state
        this.scale = 0.3;   // Starts small (far away)
        this.rotation = Math.atan2(this.targetY - this.y, this.targetX - this.x);

        // Linked tourist crowd (set when tourists disembark)
        this.linkedCrowd = null;
        this.waitingForCrowd = false;
    }

    update(deltaTime, system) {
        const speed = 0.000625;  // Progress per frame (50% slower)

        switch (this.state) {
            case 'approaching':
                this.progress += speed;
                // Move toward airport
                const dx = this.targetX - this.x;
                const dy = this.targetY - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 0.5) {
                    this.x += (dx / dist) * 0.5;
                    this.y += (dy / dist) * 0.5;
                    this.scale = 0.3 + (1 - dist / 60) * 0.7;  // Grow as approaching
                    this.rotation = Math.atan2(dy, dx);
                }

                if (dist <= 2) {
                    this.state = 'landing';
                    this.progress = 0;
                }
                break;

            case 'landing':
                this.progress += 0.05;  // Fixed speed (~20 frames = 0.3 sec)
                this.scale = 1.0;
                this.x = this.targetX;
                this.y = this.targetY;

                if (this.progress >= 1) {
                    this.state = 'grounded';
                    this.progress = 0;
                    // Spawn tourist crowd
                    system.spawnTouristCrowd(this);
                }
                break;

            case 'grounded':
                // Brief pause then takeoff immediately (don't wait for tourists to return)
                this.progress += 0.05;  // Fixed fast transition (~20 frames = 0.3 sec)
                if (this.progress >= 1) {
                    this.state = 'takeoff';
                    this.progress = 0;
                }
                break;

            case 'waiting':
                // Wait for linked crowd to return
                // This state is exited when crowd returns (see crowdReturned method)
                break;

            case 'boarding':
                // Tourists boarding
                this.progress += 0.05;  // Fixed speed (~0.3 sec)
                if (this.progress >= 1) {
                    this.state = 'takeoff';
                    this.progress = 0;
                }
                break;

            case 'takeoff':
                this.progress += 0.02;  // Fixed speed (~50 frames = 0.8 sec)
                // Pick departure direction (opposite of arrival roughly)
                if (this.progress < 0.1 && !this.departureAngle) {
                    this.departureAngle = Math.random() * Math.PI * 2;
                }

                if (this.progress >= 1) {
                    this.state = 'departing';
                    this.progress = 0;
                }
                break;

            case 'departing':
                this.progress += 0.01;  // Fixed speed (~150 frames = 2.5 sec to fly away)
                // Fly away
                const depDx = Math.cos(this.departureAngle);
                const depDy = Math.sin(this.departureAngle);
                this.x += depDx * 0.8;
                this.y += depDy * 0.8;
                this.scale = Math.max(0.1, 1 - this.progress);
                this.rotation = this.departureAngle;

                if (this.progress >= 1.5) {
                    return true;  // Remove plane
                }
                break;
        }

        return false;  // Keep plane
    }

    crowdReturned() {
        // Called when the linked tourist crowd returns to airport
        this.state = 'boarding';
        this.progress = 0;
        this.waitingForCrowd = false;
    }
}

export class TouristCrowd {
    constructor(airport, count, plane) {
        this.airport = airport;  // Home airport {x, y}
        this.count = count;      // Number of tourists
        this.plane = plane;      // Linked plane

        // Start at airport
        this.x = airport.x + 2;
        this.y = airport.y + 2;

        // State
        this.state = 'visiting';  // visiting, returning
        this.monumentsVisited = 0;
        this.targetMonument = null;
        this.visitedMonuments = new Set();  // Track which monuments visited

        // Movement
        this.path = [];
        this.pathIndex = 0;
        this.moveProgress = 0;
        this.speed = 0.02;  // Tiles per frame (slowed to 25%)

        // Stuck detection
        this.stuckCounter = 0;
        this.lastX = this.x;
        this.lastY = this.y;

        // Visual
        this.color = '#FFD700';  // Gold color for tourists
    }

    update(deltaTime, system) {
        // Stuck detection
        if (Math.abs(this.x - this.lastX) < 0.01 && Math.abs(this.y - this.lastY) < 0.01) {
            this.stuckCounter++;
        } else {
            this.stuckCounter = 0;
        }
        this.lastX = this.x;
        this.lastY = this.y;

        // If stuck too long, try to find new path or skip monument
        if (this.stuckCounter > 120) {
            console.log('[TOURIST] Crowd stuck, finding new target');
            this.stuckCounter = 0;
            this.path = [];
            if (this.state === 'visiting') {
                // Skip current monument, find another
                if (this.targetMonument) {
                    this.visitedMonuments.add(`${this.targetMonument.x},${this.targetMonument.y}`);
                }
                this.targetMonument = null;
            }
        }

        switch (this.state) {
            case 'visiting':
                if (!this.targetMonument) {
                    // Find next monument to visit
                    this.targetMonument = system.findNearestMonument(this);
                    if (this.targetMonument) {
                        this.path = system.findPath(this, this.targetMonument);
                        this.pathIndex = 0;
                    } else {
                        // No more monuments or visited 5, return to airport
                        this.state = 'returning';
                        this.path = system.findPath(this, { x: this.airport.x + 2, y: this.airport.y + 2 });
                        this.pathIndex = 0;
                    }
                }

                // Move along path
                if (this.path.length > 0 && this.pathIndex < this.path.length) {
                    this.moveAlongPath(system);
                }

                // Check if reached monument
                if (this.targetMonument) {
                    const dx = this.x - this.targetMonument.x;
                    const dy = this.y - this.targetMonument.y;
                    if (Math.sqrt(dx * dx + dy * dy) < 2) {
                        // Arrived at monument!
                        this.monumentsVisited++;
                        this.visitedMonuments.add(`${this.targetMonument.x},${this.targetMonument.y}`);
                        console.log(`[TOURIST] Visited monument ${this.monumentsVisited}/5`);
                        this.targetMonument = null;
                        this.path = [];

                        if (this.monumentsVisited >= 5) {
                            this.state = 'returning';
                        }
                    }
                }
                break;

            case 'returning':
                if (this.path.length === 0) {
                    this.path = system.findPath(this, { x: this.airport.x + 2, y: this.airport.y + 2 });
                    this.pathIndex = 0;
                }

                // Move along path
                if (this.path.length > 0 && this.pathIndex < this.path.length) {
                    this.moveAlongPath(system);
                }

                // Check if reached airport
                const adx = this.x - (this.airport.x + 2);
                const ady = this.y - (this.airport.y + 2);
                if (Math.sqrt(adx * adx + ady * ady) < 2) {
                    // Arrived back at airport!
                    console.log('[TOURIST] Crowd returned to airport, departing');
                    // Track departures
                    system.totalTouristsDeparted += this.count;
                    console.log('[AIRPORT] ' + this.count + ' tourists departed!');
                    return true;  // Remove crowd
                }
                break;
        }

        return false;  // Keep crowd
    }

    moveAlongPath(system) {
        if (this.pathIndex >= this.path.length) return;

        const target = this.path[this.pathIndex];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.1) {
            this.pathIndex++;
        } else {
            // Check if next position is walkable
            const nextX = this.x + (dx / dist) * this.speed;
            const nextY = this.y + (dy / dist) * this.speed;

            if (system.isTileWalkable(Math.floor(nextX), Math.floor(nextY))) {
                this.x = nextX;
                this.y = nextY;
            } else {
                // Blocked, recalculate path
                this.path = [];
                this.stuckCounter += 10;
            }
        }
    }
}

export class AirportSystem {
    constructor(game) {
        this.game = game;
        this.planes = [];
        this.touristCrowds = [];
        this.airports = [];  // List of active airports {x, y, active}

        // Timing
        this.frameCount = 0;
        this.spawnInterval = 300; // ~5 seconds between spawns  // Frames between plane spawns (roughly 1 per second at 60fps)
        this.lastSpawn = 0;

        // Tourist tracking
        this.totalTouristsArrived = 0;
        this.totalTouristsDeparted = 0;
        this.totalTouristIncome = 0;

        console.log('[AIRPORT] System initialized');
    }

    update() {
        // CRITICAL DEBUG - log EVERY frame
        // Debug logging disabled for performance

        // Log every call to verify update is running
        if (!this._updateLogged) {
            console.log('[AIRPORT] First update() call - system is running!');
            this._updateLogged = true;
        }

        this.frameCount++;

        // Debug: log every 60 frames
        if (this.frameCount % 60 === 0) {
            console.log(`[AIRPORT] Update frame ${this.frameCount}, lastSpawn=${this.lastSpawn}, interval=${this.spawnInterval}, diff=${this.frameCount - this.lastSpawn}`);
        }

        // Update airport list and status
        this.updateAirports();

        // Spawn planes at active airports
        const diff = this.frameCount - this.lastSpawn;
        const shouldSpawn = diff >= this.spawnInterval;
        // Spawn imminent logging disabled
        if (this.frameCount % 120 === 0) {
            console.log(`[AIRPORT] Spawn check: frame=${this.frameCount}, lastSpawn=${this.lastSpawn}, interval=${this.spawnInterval}, shouldSpawn=${shouldSpawn}`);
        }
        if (shouldSpawn) {
            this.trySpawnPlane();
            // Randomize next spawn interval (60-90 frames)
            this.spawnInterval = 300 + Math.floor(Math.random() * 300); // 5-10 seconds between spawns
            this.lastSpawn = this.frameCount;
        }

        // Update planes
        this.planes = this.planes.filter(plane => !plane.update(1, this));

        // Update tourist crowds
        this.touristCrowds = this.touristCrowds.filter(crowd => !crowd.update(1, this));
    }

    updateAirports() {
        const tileMap = this.game.tileMap;
        if (!tileMap) return;

        this.airports = [];

        // Find all airports
        for (let y = 0; y < tileMap.height; y++) {
            for (let x = 0; x < tileMap.width; x++) {
                const tile = tileMap.getTile(x, y);
                if (tile?.building?.type === 'airport' && 
                    tile.building.originX === x && 
                    tile.building.originY === y) {

                    const active = this.isAirportActive(x, y);
                    this.airports.push({ x, y, active });
                }
            }
        }
    }

    isAirportActive(x, y) {
        const infra = this.game.infrastructureManager;
        if (!infra) return false;

        // Check power connection
        const hasPower = infra.hasPower(x, y);

        // Check road connection
        const hasRoad = infra.hasRoadAccess(x, y);

        // Check fire station within range
        const hasFireStation = this.hasFireStationInRange(x, y, 15);

        console.log(`[AIRPORT] (${x},${y}) power=${hasPower} road=${hasRoad} fire=${hasFireStation}`);

        return hasPower && hasRoad && hasFireStation;
    }

    hasFireStationInRange(airportX, airportY, range) {
        const tileMap = this.game.tileMap;
        if (!tileMap) return false;

        // Search for fire stations within range
        for (let dy = -range; dy <= range; dy++) {
            for (let dx = -range; dx <= range; dx++) {
                const x = airportX + dx;
                const y = airportY + dy;

                if (x < 0 || y < 0 || x >= tileMap.width || y >= tileMap.height) continue;

                const tile = tileMap.getTile(x, y);
                if (tile?.building?.type === 'fireStation') {
                    // Check actual distance
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist <= range) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    trySpawnPlane() {
        console.log('[AIRPORT-DEBUG] >>> trySpawnPlane() CALLED <<<');
        console.log(`[AIRPORT] trySpawnPlane called, airports count: ${this.airports.length}`);

        // Get active airports
        const activeAirports = this.airports.filter(a => a.active);
        console.log(`[AIRPORT] Active airports: ${activeAirports.length}`);
        if (activeAirports.length === 0) {
            console.log('[AIRPORT] No active airports found, cannot spawn plane');
            return;
        }

        // Pick random active airport
        const airport = activeAirports[Math.floor(Math.random() * activeAirports.length)];

        // Check if airport already has a grounded/waiting plane
        const hasGroundedPlane = this.planes.some(p => 
            p.airport.x === airport.x && 
            p.airport.y === airport.y && 
            ['grounded', 'waiting', 'boarding'].includes(p.state)
        );

        if (hasGroundedPlane) return;  // Only one plane at a time per airport

        // Spawn plane with random tourists (50-100)
        const tourists = 50 + Math.floor(Math.random() * 51);
        const plane = new Plane(airport, tourists);
        this.planes.push(plane);

        console.log(`[AIRPORT] Plane spawned with ${tourists} tourists heading to (${airport.x},${airport.y})`);
    }

    spawnTouristCrowd(plane) {
        // Create tourist crowd from plane
        const crowd = new TouristCrowd(plane.airport, plane.tourists, plane);
        plane.linkedCrowd = crowd;
        this.touristCrowds.push(crowd);

        // Add income
        const income = plane.tourists * 250;
        this.game.treasury += income;
        this.totalTouristIncome += income;
        this.totalTouristsArrived += plane.tourists;

        // Update tourist count
        this.game.tourists = (this.game.tourists || 0) + plane.tourists;

        console.log(`[AIRPORT] ${plane.tourists} tourists arrived! +$${income}`);

        // Play sound if available
        if (this.game.soundSystem) {
            this.game.soundSystem?.play('planeArrival');
        }
    }

    // Called when tourist crowd departs
    touristsDeparted(count) {
        this.game.tourists = Math.max(0, (this.game.tourists || 0) - count);
        console.log(`[AIRPORT] ${count} tourists departed`);
    }

    findNearestMonument(crowd) {
        const tileMap = this.game.tileMap;
        if (!tileMap) return null;

        // Already visited 5 monuments
        if (crowd.monumentsVisited >= 5) return null;

        const monuments = [];
        const monumentTypes = ['statue', 'tower', 'golfCourse'];  // Monument building types

        // Find all monuments
        for (let y = 0; y < tileMap.height; y++) {
            for (let x = 0; x < tileMap.width; x++) {
                const tile = tileMap.getTile(x, y);
                if (tile?.building && monumentTypes.includes(tile.building.type)) {
                    const key = `${x},${y}`;
                    if (!crowd.visitedMonuments.has(key)) {
                        const dx = x - crowd.x;
                        const dy = y - crowd.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        monuments.push({ x, y, dist, type: tile.building.type });
                    }
                }
            }
        }

        if (monuments.length === 0) return null;

        // Sort by distance and pick nearest
        monuments.sort((a, b) => a.dist - b.dist);
        return monuments[0];
    }

    findPath(entity, target) {
        // Simple pathfinding - try to use roads, avoid walls
        const path = [];
        const tileMap = this.game.tileMap;
        if (!tileMap) return path;

        // A* pathfinding
        const startX = Math.floor(entity.x);
        const startY = Math.floor(entity.y);
        const endX = Math.floor(target.x);
        const endY = Math.floor(target.y);

        // Simple BFS for now
        const visited = new Set();
        const queue = [{ x: startX, y: startY, path: [] }];
        const directions = [
            { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
            { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
            { dx: -1, dy: -1 }, { dx: 1, dy: -1 },
            { dx: -1, dy: 1 }, { dx: 1, dy: 1 }
        ];

        let iterations = 0;
        const maxIterations = 5000;

        while (queue.length > 0 && iterations < maxIterations) {
            iterations++;
            const current = queue.shift();
            const key = `${current.x},${current.y}`;

            if (visited.has(key)) continue;
            visited.add(key);

            // Reached target?
            if (Math.abs(current.x - endX) <= 1 && Math.abs(current.y - endY) <= 1) {
                return [...current.path, { x: endX, y: endY }];
            }

            // Explore neighbors
            for (const dir of directions) {
                const nx = current.x + dir.dx;
                const ny = current.y + dir.dy;
                const nkey = `${nx},${ny}`;

                if (visited.has(nkey)) continue;
                if (!this.isTileWalkable(nx, ny)) continue;

                // Prioritize roads
                const tile = tileMap.getTile(nx, ny);
                const isRoad = tile?.building?.type === 'road';

                const newPath = [...current.path, { x: nx, y: ny }];

                if (isRoad) {
                    // Roads get priority - add to front
                    queue.unshift({ x: nx, y: ny, path: newPath });
                } else {
                    queue.push({ x: nx, y: ny, path: newPath });
                }
            }
        }

        // No path found, return direct path
        return [{ x: endX, y: endY }];
    }

    isTileWalkable(x, y) {
        const tileMap = this.game.tileMap;
        if (!tileMap) return false;

        const tile = tileMap.getTile(x, y);
        if (!tile) return false;

        // Check terrain - water and walls are not walkable
        const TERRAIN = window.TERRAIN || { WATER: 0, SHALLOW: 1, WALL: 10 };
        if (tile.terrain === TERRAIN.WATER || tile.terrain === TERRAIN.WALL) {
            return false;
        }

        // Check for wall buildings (police-built walls)
        if (tile.building && tile.building.type === 'wall') {
            return false;
        }

        // Check terrain type 10 (manually placed brick walls)
        if (tile.terrain === 10) {
            return false;
        }

        return true;
    }

    // Get current tourist count
    getTouristCount() {
        return this.game.tourists || 0;
    }

    // Get status for debug panel
    getStatus() {
        return {
            airports: this.airports.length,
            activeAirports: this.airports.filter(a => a.active).length,
            planes: this.planes.length,
            touristCrowds: this.touristCrowds.length,
            currentTourists: this.getTouristCount(),
            totalArrived: this.totalTouristsArrived,
            totalDeparted: this.totalTouristsDeparted,
            totalIncome: this.totalTouristIncome
        };
    }


    render(ctx, offsetX, offsetY, tileSize) {
        // Debug: log plane count occasionally
        if (this.frameCount % 120 === 0 && (this.planes.length > 0 || this.touristCrowds.length > 0)) {
            console.log(`[AIRPORT RENDER] Planes: ${this.planes.length}, Crowds: ${this.touristCrowds.length}`);
        }

        // Render planes
        for (const plane of this.planes) {
            this.renderPlane(ctx, plane, offsetX, offsetY, tileSize);
        }

        // Render tourist crowds
        for (const crowd of this.touristCrowds) {
            this.renderTouristCrowd(ctx, crowd, offsetX, offsetY, tileSize);
        }

        // Render airport status indicators
        for (const airport of this.airports) {
            this.renderAirportStatus(ctx, airport, offsetX, offsetY, tileSize);
        }
    }

    renderPlane(ctx, plane, offsetX, offsetY, tileSize) {
        const screenX = plane.x * tileSize + offsetX;
        const screenY = plane.y * tileSize + offsetY;

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(plane.rotation);
        ctx.scale(plane.scale, plane.scale);

        // Draw plane shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(3, 3, tileSize * 0.8, tileSize * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw plane body
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(0, 0, tileSize * 0.8, tileSize * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw wings
        ctx.fillStyle = '#E0E0E0';
        ctx.fillRect(-tileSize * 0.3, -tileSize * 0.6, tileSize * 0.15, tileSize * 1.2);

        // Draw tail
        ctx.fillStyle = '#E0E0E0';
        ctx.beginPath();
        ctx.moveTo(-tileSize * 0.7, 0);
        ctx.lineTo(-tileSize * 0.9, -tileSize * 0.3);
        ctx.lineTo(-tileSize * 0.9, tileSize * 0.3);
        ctx.closePath();
        ctx.fill();

        // Draw cockpit
        ctx.fillStyle = '#64B5F6';
        ctx.beginPath();
        ctx.ellipse(tileSize * 0.5, 0, tileSize * 0.2, tileSize * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw plane icon for small scales
        if (plane.scale < 0.5) {
            ctx.restore();
            ctx.save();
            ctx.translate(screenX, screenY);
            const fontSize = Math.max(16, tileSize * 0.8 * plane.scale);
            ctx.font = `${fontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('✈️', 0, 0);
        }

        ctx.restore();

        // Draw tourist count badge when grounded
        if (['grounded', 'waiting', 'boarding'].includes(plane.state)) {
            const badgeX = screenX + tileSize * 0.5;
            const badgeY = screenY - tileSize * 0.5;

            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(badgeX, badgeY, tileSize * 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#000';
            ctx.font = `${Math.max(10, tileSize * 0.25)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(plane.tourists, badgeX, badgeY);
        }
    }

    renderTouristCrowd(ctx, crowd, offsetX, offsetY, tileSize) {
        const screenX = crowd.x * tileSize + offsetX;
        const screenY = crowd.y * tileSize + offsetY;

        // Draw crowd shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(screenX + 2, screenY + 2, tileSize * 0.4, tileSize * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw crowd as group of people (gold/yellow for tourists)
        const crowdSize = Math.min(5, Math.ceil(crowd.count / 20));
        for (let i = 0; i < crowdSize; i++) {
            const angle = (i / crowdSize) * Math.PI * 2;
            const radius = tileSize * 0.15;
            const px = screenX + Math.cos(angle) * radius;
            const py = screenY + Math.sin(angle) * radius * 0.5;

            // Person body
            ctx.fillStyle = '#FFD700';  // Gold for tourists
            ctx.beginPath();
            ctx.arc(px, py, tileSize * 0.12, 0, Math.PI * 2);
            ctx.fill();

            // Person head
            ctx.fillStyle = '#FFECB3';
            ctx.beginPath();
            ctx.arc(px, py - tileSize * 0.1, tileSize * 0.06, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw count badge
        const badgeX = screenX + tileSize * 0.4;
        const badgeY = screenY - tileSize * 0.4;

        ctx.fillStyle = '#FF9800';
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, tileSize * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#000';
        ctx.font = `bold ${Math.max(8, tileSize * 0.2)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(crowd.count, badgeX, badgeY);

        // Draw monuments visited indicator
        const visitedX = screenX - tileSize * 0.4;
        const visitedY = screenY - tileSize * 0.4;

        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        ctx.arc(visitedX, visitedY, tileSize * 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFF';
        ctx.font = `bold ${Math.max(8, tileSize * 0.18)}px Arial`;
        ctx.fillText(`${crowd.monumentsVisited}/5`, visitedX, visitedY);
    }

    renderAirportStatus(ctx, airport, offsetX, offsetY, tileSize) {
        // Draw status indicator on airport
        const centerX = (airport.x + 2) * tileSize + offsetX;
        const centerY = (airport.y + 2) * tileSize + offsetY;

        if (!airport.active) {
            // Draw inactive indicator (red X or warning)
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.fillRect(
                airport.x * tileSize + offsetX,
                airport.y * tileSize + offsetY,
                4 * tileSize,
                4 * tileSize
            );

            // Draw warning icon
            ctx.font = `${tileSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⚠️', centerX, centerY);

            // Draw requirements text
            ctx.fillStyle = '#FFF';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.font = `bold ${Math.max(10, tileSize * 0.3)}px Arial`;
            const text = 'Need: Power + Road + Fire Station';
            ctx.strokeText(text, centerX, centerY + tileSize * 1.5);
            ctx.fillText(text, centerX, centerY + tileSize * 1.5);
        } else {
            // Draw active indicator (green glow)
            ctx.strokeStyle = 'rgba(76, 175, 80, 0.5)';
            ctx.lineWidth = 3;
            ctx.strokeRect(
                airport.x * tileSize + offsetX + 2,
                airport.y * tileSize + offsetY + 2,
                4 * tileSize - 4,
                4 * tileSize - 4
            );
        }
    }
}
