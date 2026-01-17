/**
 * ImmigrationSystem - Manages people boats and immigrant crowds
 * People arrive from source islands, land far from civilization, and move toward it
 */

/**
 * ImmigrationSystem - Manages people boats and immigrant crowds
 * People arrive from source islands, land far from civilization, and move toward it
 */

export class ImmigrationSystem {
    constructor(game) {
        this.game = game;
        this.peopleBoats = [];      // Boats carrying immigrants
        this.crowds = [];           // Landed immigrant groups
        this.maxPeopleBoats = 5;
        this.maxCrowds = 50;  // Increased to prevent people not appearing after boat landing

        // Per-island spawn tracking
        // Each source island spawns a boat every ~12 months independently
        this.islandSpawnTimers = {};  // { islandName: ticksUntilNextSpawn }
        this.baseSpawnInterval = 7;   // Base interval: 7 months
        this.spawnVariance = 4;       // ±4 months randomness (range: 3-11 months)

        // Immigration tweets for the king
        this.immigrationTweets = [
            "🚨 BOATS coming from the islands! They're not sending their best!",
            "👀 More people trying to sneak onto MY beautiful island!",
            "🛥️ The boats are coming! Where are my walls?!",
            "😤 These people think they can just WALK onto my island!",
            "🏃 They're running through the forests! SAD!",
            "🌲 They think they can HIDE in the trees? I see EVERYTHING!",
            "⚠️ INVASION! People landing on the beaches!",
            "🤬 Build more WALLS! Keep them OUT!",
            "👁️ My people tell me crowds are moving toward the city!",
            "🚫 NO ENTRY without permission from YOUR KING!",
            "📢 The fake news won't tell you about the BOATS!",
            "💪 We need STRONGER borders! This is MY island!",
            "🏝️ They come from those loser islands on the sides!",
            "😱 A crowd was spotted near the palace! UNACCEPTABLE!"
        ];
    }

    /**
     * Initialize spawn timers for each source island
     * Called after map generation when source islands are available
     */
    initializeSpawnTimers() {
        const map = this.game.tileMap;
        if (!map || !map.sourceIslands) return;

        for (const island of map.sourceIslands) {
            if (!this.islandSpawnTimers[island.name]) {
                // Stagger initial spawns: first boat within 1-6 months
                this.islandSpawnTimers[island.name] = Math.floor(Math.random() * 6) + 1;
                // console.log(`[IMMIGRATION] Initialized spawn timer for ${island.name}: ${this.islandSpawnTimers[island.name]} months until first boat`);
            }
        }
    }

    update() {
        // Initialize spawn timers if not done yet
        if (Object.keys(this.islandSpawnTimers).length === 0) {
            this.initializeSpawnTimers();
        }

        // Debug: log status periodically
        if (this.game.month === 1) {
                // console.log(`[IMMIGRATION] Year ${this.game.year} - Boats: ${this.peopleBoats.length}, Crowds: ${this.crowds.length}, Timers:`, this.islandSpawnTimers);
        }

        // Check each source island for spawning
        const map = this.game.tileMap;
        if (map && map.sourceIslands) {
            for (const island of map.sourceIslands) {
                this.updateIslandSpawn(island);
            }
        }

        // Clean up removed entities
        this.peopleBoats = this.peopleBoats.filter(b => !b.remove);
        this.crowds = this.crowds.filter(c => !c.remove);
    }

    /**
     * Update spawn timer for a specific source island
     */
    updateIslandSpawn(island) {
        // Initialize timer if missing
        if (this.islandSpawnTimers[island.name] === undefined) {
            this.islandSpawnTimers[island.name] = this.getRandomSpawnInterval();
        }

        // Decrement timer
        this.islandSpawnTimers[island.name]--;

        // Check if it's time to spawn
        if (this.islandSpawnTimers[island.name] <= 0) {
                // console.log(`[IMMIGRATION] Spawn timer reached 0 for ${island.name}, attempting spawn...`);
            const success = this.trySpawnPeopleBoatFromIsland(island);

            // Reset timer regardless of success (to prevent spam attempts)
            this.islandSpawnTimers[island.name] = this.getRandomSpawnInterval();
                // console.log(`[IMMIGRATION] Next boat from ${island.name} in ${this.islandSpawnTimers[island.name]} months`);
        }
    }

    /**
     * Get a randomized spawn interval (base ± variance)
     */
    getRandomSpawnInterval() {
        const variance = Math.floor(Math.random() * (this.spawnVariance * 2 + 1)) - this.spawnVariance;
        return Math.max(3, this.baseSpawnInterval + variance);  // Minimum 3 months
    }

    /**
     * Animate boats and crowds - called from animation loop at 60fps
     */
    animate() {
        // Update all people boats (movement)
        this.updatePeopleBoats();

        // Update all crowds (movement)
        this.updateCrowds();
    }

    /**
     * Try to spawn a boat from a specific source island
     */
    trySpawnPeopleBoatFromIsland(sourceIsland) {
        if (this.peopleBoats.length >= this.maxPeopleBoats) {
                // console.log(`[IMMIGRATION] Max boats reached (${this.maxPeopleBoats}), skipping spawn`);
            return false;
        }


        // DEBUG: Log source island data
        console.log(`[DEBUG] Source island: ${sourceIsland.name}, centerX=${sourceIsland.centerX}, centerY=${sourceIsland.centerY}`);

        // Find a water tile near the source island to spawn the boat
        const spawnPoint = this.findWaterNearIsland(sourceIsland);
        console.log(`[DEBUG] Spawn point found:`, spawnPoint);
        if (!spawnPoint) {
                // console.log(`[IMMIGRATION] Could not find water spawn point for ${sourceIsland.name}`);
            return false;
        }

        // Find landing spot far from civilization on main island
        const landingSpot = this.findRemoteLandingSpot(sourceIsland.name);
        if (!landingSpot) {
                // console.log(`[IMMIGRATION] Could not find remote landing spot for ${sourceIsland.name}`);
            return false;
        }

        // Create people boat
        const peopleCount = Math.floor(Math.random() * 91) + 10;  // 10-100 people

        // Calculate distance-based speed so boat takes exactly travelMonths to arrive
        const travelMonths = this.boatTravelMonths || 2;  // Default 2 months
        const tickInterval = this.game.tickInterval || 25000;  // ms per month
        const travelTimeMs = travelMonths * tickInterval;  // Total travel time in ms
        const framesPerSecond = 60;
        const totalFrames = (travelTimeMs / 1000) * framesPerSecond;

        const dx = landingSpot.x - spawnPoint.x;
        const dy = landingSpot.y - spawnPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const calculatedSpeed = distance / totalFrames;
        const halvedSpeed = calculatedSpeed * 0.5;  // Halve speed for slower boats

                // console.log(`[IMMIGRATION] Boat from ${sourceIsland.name}: ${distance.toFixed(1)} tiles, ${travelMonths} months, speed=${halvedSpeed.toFixed(4)}`);

        const boat = new PeopleBoat(
            this.game,
            spawnPoint.x,
            spawnPoint.y,
            landingSpot,
            peopleCount,
            sourceIsland,  // Pass full island object for return coordinates
            halvedSpeed
        );

        this.peopleBoats.push(boat);
                // console.log(`[IMMIGRATION] ✅ Boat spawned from ${sourceIsland.name} with ${peopleCount} people`);
                // console.log(`[IMMIGRATION] Spawn: (${spawnPoint.x}, ${spawnPoint.y}) -> Landing: (${landingSpot.x}, ${landingSpot.y})`);

        // King tweet about boats
        if (Math.random() < 0.5) {
            this.triggerKingTweet();
        }

        return true;
    }

    findWaterNearIsland(island) {
        const map = this.game.tileMap;
        if (!map) return null;

        // Search for DEEP water tiles away from the island
        // Prefer tiles on the side facing the main island
        const mainIslandX = map.width / 2;
        const searchDirection = island.centerX < mainIslandX ? 1 : -1;

        // Collect valid spawn points - must be in DEEP water with clear path
        const validSpawnPoints = [];

        // Start further from island (radius 12+) to avoid shallow water traps
        for (let radius = 12; radius < 25; radius++) {
            for (let dy = -8; dy <= 8; dy++) {
                const x = Math.floor(island.centerX + (radius * searchDirection));
                const y = Math.floor(island.centerY + dy);

                if (x >= 0 && x < map.width && y >= 0 && y < map.height) {
                    const terrain = map.getTerrainAt(x, y);
                    // Only spawn in DEEP water (terrain 0) to avoid shallow traps
                    if (terrain === 0) {
                        // Verify path toward main island is clear
                        let pathClear = true;
                        for (let check = 1; check <= 5; check++) {
                            const checkX = x + (check * searchDirection);
                            if (checkX >= 0 && checkX < map.width) {
                                const checkTerrain = map.getTerrainAt(checkX, y);
                                if (checkTerrain !== 0 && checkTerrain !== 1) {
                                    pathClear = false;
                                    break;
                                }
                            }
                        }
                        if (pathClear) {
                            validSpawnPoints.push({ x, y });
                        }
                    }
                }
            }
        }

        // Pick a random spawn point from valid options
        if (validSpawnPoints.length > 0) {
            const randomIndex = Math.floor(Math.random() * validSpawnPoints.length);
            return validSpawnPoints[randomIndex];
        }

        // Fallback: spawn in open ocean toward main island
        const fallbackX = island.centerX + (20 * searchDirection);
        const fallbackY = island.centerY + Math.floor(Math.random() * 10 - 5);
        return { x: fallbackX, y: fallbackY };
    }


    /**
     * Find a water tile adjacent to a beach tile for boat landing
     * Boats need to navigate to WATER, not land!
     */
    findWaterAdjacentToBeach(beachTile) {
        const map = this.game.tileMap;
        if (!map) return beachTile;  // Fallback to beach if no map
        
        const offsets = [
            [0, 1],   // Below
            [0, -1],  // Above  
            [1, 0],   // Right
            [-1, 0],  // Left
            [1, 1],   // Below-right
            [-1, 1],  // Below-left
            [1, -1],  // Above-right
            [-1, -1]  // Above-left
        ];
        
        for (const [ox, oy] of offsets) {
            const waterX = beachTile.x + ox;
            const waterY = beachTile.y + oy;
            
            if (waterX < 0 || waterY < 0 || waterX >= map.width || waterY >= map.height) {
                continue;
            }
            
            const terrain = map.getTerrainAt(waterX, waterY);
            // DEEP_WATER=0, SHALLOW_WATER=1 - both are navigable
            if (terrain === 0 || terrain === 1) {
                // Return water tile coordinates (centered)
                return { 
                    x: waterX + 0.5, 
                    y: waterY + 0.5,
                    beachX: beachTile.x,  // Remember original beach for crowd spawning
                    beachY: beachTile.y
                };
            }
        }
        
        // No adjacent water found - return beach as fallback
        return beachTile;
    }

    findRemoteLandingSpot(sourceIslandName) {
        const map = this.game.tileMap;
        if (!map) return null;

        // Find all beach/sand tiles on the main island
        const beachTiles = [];
        const centerX = map.width / 2;
        const centerY = map.height / 2;

        // Determine which side of the island to prefer based on source
        const preferLeftSide = sourceIslandName === 'left';

        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const terrain = map.getTerrainAt(x, y);
                // TERRAIN.SAND = 2, check if coastal
                if (terrain === 2 && map.isCoastal(x, y)) {
                    // Check if this is on the main island (roughly center area)
                    const distFromCenter = Math.sqrt(
                        Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
                    );

                    // Main island beaches are within ~50 tiles of center
                    if (distFromCenter < 50 && distFromCenter > 15) {
                        // Check if beach is on the coast FACING the source island
                        // For boats from 'left', we want beaches with water to the WEST (left)
                        // For boats from 'right', we want beaches with water to the EAST (right)
                        let isOnPreferredCoast = false;

                        // Check adjacent tiles for water to determine which coast this beach is on
                        const hasWaterWest = x > 0 && (map.getTerrainAt(x - 1, y) === 0 || map.getTerrainAt(x - 1, y) === 1);
                        const hasWaterEast = x < map.width - 1 && (map.getTerrainAt(x + 1, y) === 0 || map.getTerrainAt(x + 1, y) === 1);

                        if (preferLeftSide && hasWaterWest) {
                            // Boat from left, beach has water to the west - good!
                            isOnPreferredCoast = true;
                        } else if (!preferLeftSide && hasWaterEast) {
                            // Boat from right, beach has water to the east - good!
                            isOnPreferredCoast = true;
                        }

                        const isOnPreferredSide = isOnPreferredCoast;

                        // ALSO check that beach is not at extreme top or bottom
                        // Prefer beaches in the middle 60% of Y range (20% to 80%)
                        const yRatio = y / map.height;
                        const isInMiddleY = yRatio > 0.25 && yRatio < 0.75;

                        // Calculate distance from civilization (buildings)
                        const distFromCiv = this.getDistanceFromCivilization(x, y);

                        beachTiles.push({
                            x, y,
                            distFromCiv,
                            isOnPreferredSide,
                            isInMiddleY,
                            // Best beaches are on correct side AND in middle Y
                            priority: (isOnPreferredSide ? 2 : 0) + (isInMiddleY ? 1 : 0)
                        });
                    }
                }
            }
        }

        if (beachTiles.length === 0) return null;

        // Filter to only beaches on the preferred coast (priority >= 2 means correct coast)
        const preferredBeaches = beachTiles.filter(b => b.isOnPreferredSide);

        // If we have beaches on preferred coast, pick randomly from ALL of them
        if (preferredBeaches.length > 0) {
            const randomIndex = Math.floor(Math.random() * preferredBeaches.length);
            // Return WATER tile adjacent to beach, not the beach itself!
            return this.findWaterAdjacentToBeach(preferredBeaches[randomIndex]);
        }

        // Fallback: pick randomly from any beach in middle Y range
        const middleBeaches = beachTiles.filter(b => b.isInMiddleY);
        if (middleBeaches.length > 0) {
            const randomIndex = Math.floor(Math.random() * middleBeaches.length);
            // Return WATER tile adjacent to beach, not the beach itself!
            return this.findWaterAdjacentToBeach(middleBeaches[randomIndex]);
        }

        // Last resort: pick randomly from all beaches
        const randomIndex = Math.floor(Math.random() * beachTiles.length);
        // Return WATER tile adjacent to beach, not the beach itself!
        return this.findWaterAdjacentToBeach(beachTiles[randomIndex]);
    }

    getDistanceFromCivilization(x, y) {
        const map = this.game.tileMap;
        if (!map) return Infinity;

        let minDist = Infinity;

        // Check distance to any building
        for (let ty = 0; ty < map.height; ty++) {
            for (let tx = 0; tx < map.width; tx++) {
                const tile = map.getTile(tx, ty);
                if (tile?.building) {
                    const dist = Math.sqrt(Math.pow(tx - x, 2) + Math.pow(ty - y, 2));
                    minDist = Math.min(minDist, dist);
                }
            }
        }

        // Also check distance to palace
        for (let ty = 0; ty < map.height; ty++) {
            for (let tx = 0; tx < map.width; tx++) {
                const terrain = map.getTerrainAt(tx, ty);
                if (terrain === 9) {  // TERRAIN.PALACE
                    const dist = Math.sqrt(Math.pow(tx - x, 2) + Math.pow(ty - y, 2));
                    minDist = Math.min(minDist, dist);
                }
            }
        }

        return minDist;
    }

    updatePeopleBoats() {
        for (const boat of this.peopleBoats) {
            boat.update();

            // Check if boat has landed
            if (boat.state === 'landed' && !boat.crowdSpawned) {
                this.spawnCrowdFromBoat(boat);
                boat.crowdSpawned = true;
                boat.state = 'leaving';

                // King tweet about landing
                if (Math.random() < 0.6) {
                    this.triggerKingTweet();
                }
            }
        }
    }

    spawnCrowdFromBoat(boat) {
        if (this.crowds.length >= this.maxCrowds) {
            console.warn(`[IMMIGRATION] Cannot spawn crowd - maxCrowds limit (${this.maxCrowds}) reached!`);
            // Still add to visitors even if we can't show the crowd visually
            this.game.visitors = (this.game.visitors || 0) + boat.peopleCount;
            return;
        }

        // Find nearest beach/land tile to spawn crowd on (boat is in water)
        const map = this.game.tileMap;
        let landX = boat.x;
        let landY = boat.y;

        // Search TOWARD MAIN ISLAND CENTER for a beach or grass tile
        // This prevents finding beaches on source islands
        // Terrain values: DEEP_WATER=0, SHALLOW_WATER=1, SAND/BEACH=2, GRASS=3
        const maxRadius = 8;
        let foundLand = false;

        if (map) {
            const mapCenterX = map.width / 2;
            const mapCenterY = map.height / 2;

            // Calculate direction toward main island center
            const dirToCenter = {
                x: mapCenterX - boat.x,
                y: mapCenterY - boat.y
            };
            const dirLen = Math.sqrt(dirToCenter.x * dirToCenter.x + dirToCenter.y * dirToCenter.y);
            if (dirLen > 0) {
                dirToCenter.x /= dirLen;
                dirToCenter.y /= dirLen;
            }

            // Search in direction toward main island first, then expand
            // Priority: tiles in the direction of main island center
            const candidates = [];

            for (let radius = 1; radius <= maxRadius; radius++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        // Check perimeter tiles (where at least one of dx,dy equals radius)
                        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;

                        const checkX = Math.floor(boat.x) + dx;
                        const checkY = Math.floor(boat.y) + dy;

                        if (checkX >= 0 && checkX < map.width && checkY >= 0 && checkY < map.height) {
                            const terrain = map.getTerrainAt(checkX, checkY);
                            // SAND=2 (beach), GRASS=3
                            if (terrain === 2 || terrain === 3) {
                                // Calculate how much this tile is in the direction of main island
                                const dotProduct = dx * dirToCenter.x + dy * dirToCenter.y;
                                candidates.push({
                                    x: checkX + 0.5,
                                    y: checkY + 0.5,
                                    score: dotProduct,  // Higher = more toward main island
                                    radius: radius
                                });
                            }
                        }
                    }
                }

                // If we found candidates at this radius, pick the best one
                if (candidates.length > 0) {
                    // Sort by score (highest first = most toward main island)
                    candidates.sort((a, b) => b.score - a.score);
                    landX = candidates[0].x;
                    landY = candidates[0].y;
                    foundLand = true;
                    break;
                }
            }
        }

        console.log(`[IMMIGRATION] Spawning crowd at (${landX}, ${landY}) with ${boat.peopleCount} people. Boat at (${boat.x.toFixed(1)}, ${boat.y.toFixed(1)}), foundLand=${foundLand}, terrain=${map ? map.getTerrainAt(Math.floor(landX), Math.floor(landY)) : 'no map'}`);
        const crowd = new Crowd(
            this.game,
            landX,
            landY,
            boat.peopleCount
        );

        this.crowds.push(crowd);

        // Add to visitors count when people offload from boat
        this.game.visitors = (this.game.visitors || 0) + boat.peopleCount;
        console.log(`[IMMIGRATION] Crowd of ${boat.peopleCount} landed on beach at (${Math.floor(landX)}, ${Math.floor(landY)}). Total visitors: ${this.game.visitors}`);
    }

    updateCrowds() {
        for (const crowd of this.crowds) {
            crowd.update();

            // Check for crowd splitting
            if (crowd.shouldSplit()) {
                const newCrowd = crowd.split();
                if (newCrowd && this.crowds.length < this.maxCrowds) {
                    this.crowds.push(newCrowd);
                }
            }

            // Check if crowd reached civilization
            if (crowd.reachedCivilization) {
                // Population is now handled by police system processing
                // Visitors who reach civilization without being captured just leave
                // this.game.population = (this.game.population || 0) + crowd.count;
                // console.log(`[IMMIGRATION] ${crowd.count} immigrants integrated into population! Total: ${this.game.population}`);
                crowd.remove = true;

                // King tweet about immigrants arriving
                if (Math.random() < 0.4) {
                    this.triggerKingTweet();
                }
            }
        }
    }

    triggerKingTweet() {
        const tweet = this.immigrationTweets[Math.floor(Math.random() * this.immigrationTweets.length)];
        if (this.game.showKingTweet) {
            this.game.showKingTweet(tweet);
        }
    }

    render(ctx, offsetX, offsetY, tileSize) {
        // Render all people boats
        for (const boat of this.peopleBoats) {
            boat.render(ctx, offsetX, offsetY, tileSize);
        }

        // Render all crowds
        for (const crowd of this.crowds) {
            crowd.render(ctx, offsetX, offsetY, tileSize);
        }
    }

    /**
     * Get serializable state for saving
     */
    getSerializableState() {
        return {
            islandSpawnTimers: { ...this.islandSpawnTimers }
        };
    }

    /**
     * Restore state from save data
     */
    restoreState(state) {
        if (state && state.islandSpawnTimers) {
            this.islandSpawnTimers = { ...state.islandSpawnTimers };
                // console.log('[IMMIGRATION] Restored spawn timers:', this.islandSpawnTimers);
        }
    }
}


/**
 * PeopleBoat - Boat carrying immigrants from source islands
 */
export class PeopleBoat {
    constructor(game, startX, startY, targetLanding, peopleCount, sourceIsland, speed = 0.5) {
        this.game = game;
        this.x = startX;
        this.y = startY;
        this.startX = startX;  // Remember spawn position
        this.startY = startY;
        this.targetLanding = targetLanding;
        this.peopleCount = peopleCount;

        // Handle sourceIsland as object or string for backwards compatibility
        if (typeof sourceIsland === 'object') {
            this.sourceIslandName = sourceIsland.name;
            this.sourceIslandCenterX = sourceIsland.centerX;
            this.sourceIslandCenterY = sourceIsland.centerY;
        } else {
            this.sourceIslandName = sourceIsland;
            // Fallback to spawn position if no center provided
            this.sourceIslandCenterX = startX;
            this.sourceIslandCenterY = startY;
        }

        this.speed = speed;  // Calculated based on distance for consistent travel time
        this.state = 'arriving';  // arriving, landed, leaving
        this.crowdSpawned = false;
        this.frame = 0;
        this.remove = false;

        // Navigation - for avoiding islands
        this.avoidanceAngle = 0;
        this.avoidanceFrames = 0;
        
        // Stuck recovery - for boats that can't reach landing
        this.retryAttempts = 0;
    }

    update() {
        this.frame++;

        if (this.state === 'arriving') {
            this.moveTowardsTarget();
        } else if (this.state === 'leaving') {
            this.moveBackToSource();
        }
    }

    /**
     * Check if a position is water (safe to navigate)
     */
    isWater(x, y) {
        const map = this.game.tileMap || this.game.map;
        if (!map) return true;

        const tileX = Math.floor(x);
        const tileY = Math.floor(y);

        // Out of bounds is considered water (ocean)
        if (tileX < 0 || tileY < 0 || tileX >= map.width || tileY >= map.height) {
            return true;
        }

        const terrain = map.getTerrainAt(tileX, tileY);
        // WATER=0, DEEP_WATER=1 are safe
        return terrain === 0 || terrain === 1;
    }

    /**
     * Check if path ahead is clear for several tiles
     */
    isPathClear(fromX, fromY, dirX, dirY, distance = 3) {
        for (let i = 1; i <= distance; i++) {
            const checkX = fromX + dirX * i;
            const checkY = fromY + dirY * i;
            if (!this.isWater(checkX, checkY)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Find a clear direction to navigate around obstacles
     */
    findClearDirection(targetDirX, targetDirY) {
        // Try angles from -90 to +90 degrees from target direction
        const angles = [0, 30, -30, 60, -60, 90, -90, 120, -120, 150, -150, 180];
        const baseAngle = Math.atan2(targetDirY, targetDirX);

        for (const offsetDeg of angles) {
            const angle = baseAngle + (offsetDeg * Math.PI / 180);
            const dirX = Math.cos(angle);
            const dirY = Math.sin(angle);

            if (this.isPathClear(this.x, this.y, dirX, dirY, 4)) {
                return { dirX, dirY, angle: offsetDeg };
            }
        }

        // No clear path found, return original direction
        return { dirX: targetDirX, dirY: targetDirY, angle: 0 };
    }

    moveTowardsTarget() {
        if (!this.targetLanding) {
            this.state = 'leaving';
            return;
        }

        const map = this.game.tileMap;
        const dx = this.targetLanding.x - this.x;
        const dy = this.targetLanding.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Calculate distance traveled from spawn point
        const traveledX = this.x - this.startX;
        const traveledY = this.y - this.startY;
        const distanceTraveled = Math.sqrt(traveledX * traveledX + traveledY * traveledY);

        // Calculate total journey distance
        const totalJourneyX = this.targetLanding.x - this.startX;
        const totalJourneyY = this.targetLanding.y - this.startY;
        const totalJourneyDist = Math.sqrt(totalJourneyX * totalJourneyX + totalJourneyY * totalJourneyY);

        // CRITICAL: Only allow landing checks if boat has traveled at least 60% of journey
        // This prevents boats from landing on source island beaches
        const minTravelPercent = 0.6;
        const hasMinTravel = distanceTraveled >= (totalJourneyDist * minTravelPercent);

        // Also check if boat is near main island center (within 45 tiles)
        const mapCenterX = map ? map.width / 2 : 64;
        const mapCenterY = map ? map.height / 2 : 64;
        const distFromCenter = Math.sqrt(Math.pow(this.x - mapCenterX, 2) + Math.pow(this.y - mapCenterY, 2));
        const isNearMainIsland = distFromCenter < 45;

        // LANDING CHECK 1: Close to target landing spot (within 3 tiles)
        // Only if minimum travel achieved
        if (hasMinTravel && dist < 3) {
            this.state = 'landed';
            return;
        }

        // LANDING CHECK 2: Boat is on land tile (only if near main island)
        if (hasMinTravel && isNearMainIsland && map) {
            const currentTerrain = map.getTerrainAt(Math.floor(this.x), Math.floor(this.y));
            if (currentTerrain !== undefined && currentTerrain !== 0 && currentTerrain !== 1) {
                this.state = 'landed';
                return;
            }
        }

        // LANDING CHECK 2.5: Boat is in SHALLOW WATER (terrain 1) near main island
        // This fixes boats getting stuck when there are multiple shallow water tiles before beach
        if (hasMinTravel && isNearMainIsland && map) {
            const currentTerrain = map.getTerrainAt(Math.floor(this.x), Math.floor(this.y));
            if (currentTerrain === 1) {  // SHALLOW_WATER = 1
                this.state = 'landed';
                return;
            }
        }

        // LANDING CHECK 3: Adjacent to beach (only if near main island AND min travel)
        if (hasMinTravel && isNearMainIsland && map) {
            const checkOffsets = [[1,0], [-1,0], [0,1], [0,-1], [1,1], [-1,1], [1,-1], [-1,-1]];
            for (const [ox, oy] of checkOffsets) {
                const checkX = Math.floor(this.x) + ox;
                const checkY = Math.floor(this.y) + oy;
                const adjTerrain = map.getTerrainAt(checkX, checkY);
                // SAND=2 is beach - if adjacent to beach, we've reached shore
                if (adjTerrain === 2) {
                    this.state = 'landed';
                    return;
                }
            }
        }

        // LANDING CHECK 4: Stuck detection with retry and retreat logic
        if (!this.lastPos) {
            this.lastPos = { x: this.x, y: this.y };
            this.stuckFrames = 0;
        } else {
            const movedDist = Math.sqrt(Math.pow(this.x - this.lastPos.x, 2) + Math.pow(this.y - this.lastPos.y, 2));
            if (movedDist < 0.5) {
                this.stuckFrames = (this.stuckFrames || 0) + 1;
                
                // After ~5 seconds stuck (150 frames), try recovery
                if (this.stuckFrames > 150) {
                    this.retryAttempts = (this.retryAttempts || 0) + 1;
                    this.stuckFrames = 0;
                    
                    // After 5 retry attempts, retreat and find new coastline
                    if (this.retryAttempts >= 5) {
                        console.log('[BOATS] People boat giving up on current target after 5 failed attempts');
                        
                        // Find a DIFFERENT coastline target (at least 15 tiles away from current target)
                        const immigrationSystem = this.game.systems?.find(s => s.constructor.name === 'ImmigrationSystem');
                        if (immigrationSystem) {
                            const currentTargetX = this.targetLanding?.x || 0;
                            const currentTargetY = this.targetLanding?.y || 0;
                            
                            // Try up to 10 times to find a different spot
                            let foundDifferent = false;
                            for (let attempt = 0; attempt < 10; attempt++) {
                                const newTarget = immigrationSystem.findRemoteLandingSpot(this.sourceIslandName);
                                if (newTarget) {
                                    const distFromOld = Math.sqrt(
                                        Math.pow(newTarget.x - currentTargetX, 2) + 
                                        Math.pow(newTarget.y - currentTargetY, 2)
                                    );
                                    // Must be at least 15 tiles away from old target
                                    if (distFromOld > 15) {
                                        this.targetLanding = newTarget;
                                        foundDifferent = true;
                                        console.log('[BOATS] People boat found new landing target', distFromOld.toFixed(1), 'tiles away');
                                        break;
                                    }
                                }
                            }
                            
                            // If couldn't find different spot, just give up and leave
                            if (!foundDifferent) {
                                console.log('[BOATS] People boat could not find different coastline - leaving');
                                this.state = 'leaving';
                                return;
                            }
                        } else {
                            // No immigration system found - leave
                            this.state = 'leaving';
                            return;
                        }
                        
                        this.retryAttempts = 0;  // Reset for new attempt
                        return;
                    }
                    
                    // Small random nudge to try to unstick
                    this.x += (Math.random() - 0.5) * 2;
                    this.y += (Math.random() - 0.5) * 2;
                    return;
                }
                
                // Legacy: force landing if stuck very long AND conditions met
                if (this.stuckFrames > 300 && hasMinTravel && isNearMainIsland) {
                    this.state = 'landed';
                    return;
                }
            } else {
                this.stuckFrames = 0;
            }
            // Update lastPos every 60 frames
            if (this.frame % 60 === 0) {
                this.lastPos = { x: this.x, y: this.y };
            }
        }

        // Normalize direction to target
        const targetDirX = dx / dist;
        const targetDirY = dy / dist;

        // Check if direct path is clear
        let moveDirX = targetDirX;
        let moveDirY = targetDirY;

        // If we're in avoidance mode, continue for a bit
        if (this.avoidanceFrames > 0) {
            this.avoidanceFrames--;
            const angle = this.avoidanceAngle;
            moveDirX = Math.cos(angle);
            moveDirY = Math.sin(angle);

            // Check if we can now head towards target
            if (this.avoidanceFrames % 10 === 0 && this.isPathClear(this.x, this.y, targetDirX, targetDirY, 5)) {
                this.avoidanceFrames = 0;
            }
        } else {
            // Check if path ahead is blocked
            // For boats returning to source, always use avoidance when needed
            if (!this.isPathClear(this.x, this.y, targetDirX, targetDirY, 3)) {
                    const clearDir = this.findClearDirection(targetDirX, targetDirY);
                    moveDirX = clearDir.dirX;
                    moveDirY = clearDir.dirY;

                    // Set avoidance mode for smoother navigation
                    if (clearDir.angle !== 0) {
                        this.avoidanceAngle = Math.atan2(moveDirY, moveDirX);
                        this.avoidanceFrames = 30;
                    }
                }
            // When readyToLand && closeToTarget, boat goes straight toward beach and will hit shore
        }

        // Move in the chosen direction
        const nextX = this.x + moveDirX * this.speed;
        const nextY = this.y + moveDirY * this.speed;

        // Final safety check - don't move into land
        if (this.isWater(nextX, nextY)) {
            this.x = nextX;
            this.y = nextY;
        } else {
            // Can't move forward - we've hit shore!
            // Only trigger landing if we've traveled enough AND near main island
            if (hasMinTravel && isNearMainIsland) {
                this.state = 'landed';
            } else {
                // Not near main island yet - try to navigate around
                const clearDir = this.findClearDirection(-dx/dist, -dy/dist);  // Try opposite direction
                if (clearDir.angle !== 0) {
                    this.avoidanceAngle = Math.atan2(clearDir.dirY, clearDir.dirX);
                    this.avoidanceFrames = 60;
                }
            }
        }
    }

    /**
     * Move back to source island instead of just disappearing
     */
    moveBackToSource() {
        // Target is the source island center (not spawn position)
        const targetX = this.sourceIslandCenterX;
        const targetY = this.sourceIslandCenterY;

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Use faster speed for return trip
        const returnSpeed = this.speed * 2;

        // Remove boat when it gets close to source island (within 12 tiles)
        // Don't try to reach the center which is on land!
        if (dist < 12) {
            this.remove = true;
            return;
        }
        
        // Also remove if boat hits land (reached island shore)
        const currentTerrain = this.game.tileMap?.getTerrainAt(Math.floor(this.x), Math.floor(this.y));
        if (currentTerrain !== undefined && currentTerrain !== 0 && currentTerrain !== 1) {
            this.remove = true;
            return;
        }

        // Normalize direction to target
        const targetDirX = dx / dist;
        const targetDirY = dy / dist;

        // Check if direct path is clear
        let moveDirX = targetDirX;
        let moveDirY = targetDirY;

        // If we're in avoidance mode, continue for a bit
        if (this.avoidanceFrames > 0) {
            this.avoidanceFrames--;
            const angle = this.avoidanceAngle;
            moveDirX = Math.cos(angle);
            moveDirY = Math.sin(angle);

            // Check if we can now head towards target
            if (this.avoidanceFrames % 10 === 0 && this.isPathClear(this.x, this.y, targetDirX, targetDirY, 5)) {
                this.avoidanceFrames = 0;
            }
        } else {
            // Check if path ahead is blocked
            // For boats returning to source, always use avoidance when needed
            if (!this.isPathClear(this.x, this.y, targetDirX, targetDirY, 3)) {
                    const clearDir = this.findClearDirection(targetDirX, targetDirY);
                    moveDirX = clearDir.dirX;
                    moveDirY = clearDir.dirY;

                    // Set avoidance mode for smoother navigation
                    if (clearDir.angle !== 0) {
                        this.avoidanceAngle = Math.atan2(moveDirY, moveDirX);
                        this.avoidanceFrames = 30;
                    }
                }
            // When readyToLand && closeToTarget, boat goes straight toward beach and will hit shore
        }

        // Move in the chosen direction
        const nextX = this.x + moveDirX * returnSpeed;
        const nextY = this.y + moveDirY * returnSpeed;

        // Final safety check - don't move into land
        if (this.isWater(nextX, nextY)) {
            this.x = nextX;
            this.y = nextY;
        } else {
            // Emergency: try to find any water tile nearby
            const emergencyAngles = [90, -90, 180, 45, -45, 135, -135];
            const baseAngle = Math.atan2(moveDirY, moveDirX);
            for (const offset of emergencyAngles) {
                const angle = baseAngle + (offset * Math.PI / 180);
                const emergX = this.x + Math.cos(angle) * returnSpeed;
                const emergY = this.y + Math.sin(angle) * returnSpeed;
                if (this.isWater(emergX, emergY)) {
                    this.x = emergX;
                    this.y = emergY;
                    this.avoidanceAngle = angle;
                    this.avoidanceFrames = 60;
                    break;
                }
            }
        }

        // Safety: if boat gets stuck or goes too far, remove it
        const map = this.game.tileMap || this.game.map;
        const mapWidth = map?.width || 128;
        const mapHeight = map?.height || 128;
        if (this.x < -5 || this.x > mapWidth + 5 || this.y < -5 || this.y > mapHeight + 5) {
                // console.log(`[IMMIGRATION] Boat exited map bounds, removing`);
            this.remove = true;
        }
    }

    render(ctx, offsetX, offsetY, tileSize) {
        const screenX = (this.x * tileSize) + offsetX;
        const screenY = (this.y * tileSize) + offsetY;

        // Don't render if off screen
        if (screenX < -tileSize * 3 || screenX > ctx.canvas.width + tileSize * 3 ||
            screenY < -tileSize * 3 || screenY > ctx.canvas.height + tileSize * 3) {
            return;
        }

        ctx.save();

        // Bobbing animation
        const bob = Math.sin(this.frame * 0.08) * 2;

        // Draw boat as emoji - simple and guaranteed to show
        ctx.font = '32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⛵', screenX + tileSize/2, screenY + tileSize/2 + bob);

        ctx.restore();

        // Draw people count marker only when arriving (has people on board)
        if (this.state === 'arriving') {
            ctx.save();
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';

            // Background pill
            const text = this.peopleCount.toString();
            const textWidth = ctx.measureText(text).width;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.beginPath();
            ctx.roundRect(screenX + tileSize/2 - textWidth/2 - 6, screenY - 20, textWidth + 12, 18, 9);
            ctx.fill();

            // People icon and count
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText('👥 ' + text, screenX + tileSize/2, screenY - 6);

            ctx.restore();
        }

        // Draw "returning" indicator when leaving
        if (this.state === 'leaving') {
            ctx.save();
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillText('↩️', screenX + tileSize/2, screenY - 10);
            ctx.restore();
        }
    }
}



/**
 * Crowd - Group of immigrants moving toward civilization
 */
export class Crowd {
    constructor(game, x, y, count) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.count = count;
        this.speed = 0.015;  // Walking speed for 60fps animation
        this.frame = 0;
        this.remove = false;
        this.reachedCivilization = false;
        this.inForest = false;
        this.targetX = null;
        this.targetY = null;
        this.pathUpdateTimer = 0;
        this.pathUpdateInterval = 60;  // Update path every 60 frames
        this.splitCooldown = 0;

        // New: Survival timer for citizenship
        this.spawnTick = game.tickCount || 0;  // Track when spawned
        this.survivalMonths = 0;  // Months survived
        this.maxSurvivalMonths = 3;  // Become citizens after 3 months
        this.lastTickCount = game.tickCount || 0;

        // New: Behavior state
        this.state = 'roaming';  // 'roaming', 'attracted', 'avoiding'

        // Stuck detection
        this.lastPosX = x;
        this.lastPosY = y;
        this.stuckFrames = 0;
    }

    update() {
        this.frame++;
        this.splitCooldown = Math.max(0, this.splitCooldown - 1);

        // Track survival time (game ticks = months)
        const currentTick = this.game.tickCount || 0;
        if (currentTick > this.lastTickCount) {
            this.survivalMonths += (currentTick - this.lastTickCount);
            this.lastTickCount = currentTick;
        }

        // Check if survived 3 months - become citizens!
        if (this.survivalMonths >= this.maxSurvivalMonths && !this.reachedCivilization) {
            this.reachedCivilization = true;
            this.game.population += this.count;
            this.remove = true;
            return;
        }

        // Update path periodically
        this.pathUpdateTimer++;
        if (this.pathUpdateTimer >= this.pathUpdateInterval || this.targetX === null) {
            this.pathUpdateTimer = 0;
            this.updateTarget();
        }

        // Move toward target
        this.moveTowardTarget();

        // Check if in forest
        this.checkForestStatus();

        // Check if reached monument/palace
        this.checkMonumentReached();
    }

    // Check if a building is a monument (attracts crowds)
    isMonument(buildingId) {
        return buildingId === 'statue' || buildingId === 'tower' || buildingId === 'golfCourse';
    }

    // Check if a building should be avoided
    shouldAvoid(buildingId) {
        // Avoid all buildings EXCEPT monuments
        return buildingId && !this.isMonument(buildingId);
    }

    updateTarget() {
        const map = this.game.tileMap;
        if (!map) return;

        const ATTRACTION_RANGE = 15;
        const AVOIDANCE_RANGE = 5;

        let nearestMonumentDist = Infinity;
        let nearestMonumentX = null;
        let nearestMonumentY = null;

        let nearestAvoidDist = Infinity;
        let avoidX = null;
        let avoidY = null;

        // Scan for monuments and buildings to avoid
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const tile = map.getTile(x, y);
                const terrain = map.getTerrainAt(x, y);
                const dist = Math.sqrt(Math.pow(x - this.x, 2) + Math.pow(y - this.y, 2));

                // Check for Palace (terrain 9) - ATTRACT
                if (terrain === 9 && dist < ATTRACTION_RANGE && dist < nearestMonumentDist) {
                    nearestMonumentDist = dist;
                    nearestMonumentX = x;
                    nearestMonumentY = y;
                }

                // Check for buildings
                if (tile?.building) {
                    const buildingId = tile.building.id || tile.building.type;

                    // Monument - ATTRACT
                    if (this.isMonument(buildingId) && dist < ATTRACTION_RANGE && dist < nearestMonumentDist) {
                        nearestMonumentDist = dist;
                        nearestMonumentX = x;
                        nearestMonumentY = y;
                    }
                    // Other building - AVOID
                    else if (this.shouldAvoid(buildingId) && dist < AVOIDANCE_RANGE && dist < nearestAvoidDist) {
                        nearestAvoidDist = dist;
                        avoidX = x;
                        avoidY = y;
                    }
                }
            }
        }

        // Priority 1: If monument found, move toward it
        if (nearestMonumentX !== null) {
            this.state = 'attracted';
            this.targetX = nearestMonumentX;
            this.targetY = nearestMonumentY;
            return;
        }

        // Priority 2: If building to avoid is nearby, move away from it
        if (avoidX !== null && nearestAvoidDist < AVOIDANCE_RANGE) {
            this.state = 'avoiding';
            // Move in opposite direction from the building
            const awayDx = this.x - avoidX;
            const awayDy = this.y - avoidY;
            const awayDist = Math.sqrt(awayDx * awayDx + awayDy * awayDy);
            if (awayDist > 0) {
                this.targetX = this.x + (awayDx / awayDist) * 10;
                this.targetY = this.y + (awayDy / awayDist) * 10;
                // Clamp to map bounds
                this.targetX = Math.max(5, Math.min(map.width - 5, this.targetX));
                this.targetY = Math.max(5, Math.min(map.height - 5, this.targetY));
            }
            return;
        }

        // Priority 3: Roam randomly
        this.state = 'roaming';
        this.pickWanderTarget();
    }

    pickWanderTarget() {
        const map = this.game.tileMap;
        if (!map) return;

        // Wander in a random direction
        const angle = Math.random() * Math.PI * 2;
        const distance = 10 + Math.random() * 20;
        this.targetX = this.x + Math.cos(angle) * distance;
        this.targetY = this.y + Math.sin(angle) * distance;

        // Clamp to map bounds
        this.targetX = Math.max(5, Math.min(map.width - 5, this.targetX));
        this.targetY = Math.max(5, Math.min(map.height - 5, this.targetY));
    }

    // Helper to check if terrain is walkable
    isWalkable(terrain) {
        // TERRAIN: SAND=2, HILL=3, GRASS=4, DIRT=5, FOREST=6, MOUNTAIN=7, PALACE=9
        return terrain === 2 || terrain === 3 || terrain === 4 || 
               terrain === 5 || terrain === 6 || terrain === 7 || terrain === 9;
    }

    // Helper to check if a tile is walkable (terrain + no wall)
    isTileWalkable(x, y) {
        const map = this.game.tileMap;
        if (!map) return false;
        
        const tileX = Math.floor(x);
        const tileY = Math.floor(y);
        
        // Check terrain first
        const terrain = map.getTerrainAt(tileX, tileY);
        if (!this.isWalkable(terrain)) return false;
        
        // Check for wall building
        const tile = map.getTile(tileX, tileY);
        if (tile && tile.building && tile.building.type === 'wall') {
            return false;  // Wall blocks movement
        }
        
        return true;
    }


    moveTowardTarget() {
        if (this.targetX === null || this.targetY === null) return;

        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.5) {
            this.stuckFrames = 0;
            return;
        }

        const map = this.game.tileMap;
        if (!map) return;

        const nextX = this.x + (dx / dist) * this.speed;
        const nextY = this.y + (dy / dist) * this.speed;

        let moved = false;

        // Try direct path first (checks terrain AND walls)
        if (this.isTileWalkable(nextX, nextY)) {
            this.x = nextX;
            this.y = nextY;
            moved = true;
        } else {
            // Try BOTH perpendicular directions when blocked
            const alt1Dx = dy;
            const alt1Dy = -dx;
            const alt1NextX = this.x + (alt1Dx / dist) * this.speed;
            const alt1NextY = this.y + (alt1Dy / dist) * this.speed;

            const alt2Dx = -dy;
            const alt2Dy = dx;
            const alt2NextX = this.x + (alt2Dx / dist) * this.speed;
            const alt2NextY = this.y + (alt2Dy / dist) * this.speed;

            const dist1 = Math.sqrt(Math.pow(alt1NextX - this.targetX, 2) + Math.pow(alt1NextY - this.targetY, 2));
            const dist2 = Math.sqrt(Math.pow(alt2NextX - this.targetX, 2) + Math.pow(alt2NextY - this.targetY, 2));

            // Check both alternatives using isTileWalkable (terrain + walls)
            const alt1Walkable = this.isTileWalkable(alt1NextX, alt1NextY);
            const alt2Walkable = this.isTileWalkable(alt2NextX, alt2NextY);

            if (alt1Walkable && alt2Walkable) {
                if (dist1 <= dist2) {
                    this.x = alt1NextX;
                    this.y = alt1NextY;
                } else {
                    this.x = alt2NextX;
                    this.y = alt2NextY;
                }
                moved = true;
            } else if (alt1Walkable) {
                this.x = alt1NextX;
                this.y = alt1NextY;
                moved = true;
            } else if (alt2Walkable) {
                this.x = alt2NextX;
                this.y = alt2NextY;
                moved = true;
            }
        }

        // Stuck detection
        if (this.frame % 30 === 0) {
            const movedDist = Math.sqrt(Math.pow(this.x - this.lastPosX, 2) + Math.pow(this.y - this.lastPosY, 2));
            if (movedDist < 0.3) {
                this.stuckFrames = (this.stuckFrames || 0) + 30;
            } else {
                this.stuckFrames = 0;
            }
            this.lastPosX = this.x;
            this.lastPosY = this.y;

            if (this.stuckFrames >= 120) {
                this.pickWanderTarget();
                this.stuckFrames = 0;
            }
        }
    }

    checkForestStatus() {
        const map = this.game.tileMap;
        if (!map) return;

        const terrain = map.getTerrainAt(Math.floor(this.x), Math.floor(this.y));
        this.inForest = (terrain === 6);  // TERRAIN.FOREST = 6
    }

    // Check if reached a monument or palace
    checkMonumentReached() {
        if (this.reachedCivilization) return;

        const map = this.game.tileMap;
        if (!map) return;

        const checkRadius = 2;
        for (let dy = -checkRadius; dy <= checkRadius; dy++) {
            for (let dx = -checkRadius; dx <= checkRadius; dx++) {
                const tx = Math.floor(this.x) + dx;
                const ty = Math.floor(this.y) + dy;

                if (tx < 0 || tx >= map.width || ty < 0 || ty >= map.height) continue;

                const tile = map.getTile(tx, ty);
                const terrain = map.getTerrainAt(tx, ty);

                // Reached Palace (terrain 9)
                if (terrain === 9) {
                    this.reachedCivilization = true;
                    this.game.population += this.count;
                    this.remove = true;
                    return;
                }

                // Reached Monument building
                if (tile?.building) {
                    const buildingId = tile.building.id || tile.building.type;
                    if (this.isMonument(buildingId)) {
                        this.reachedCivilization = true;
                        this.game.population += this.count;
                        this.remove = true;
                        return;
                    }
                }
            }
        }
    }

    shouldSplit() {
        return this.count > 10 &&
               this.splitCooldown === 0 &&
               Math.random() < 0.10;
    }

    split() {
        const splitCount = Math.floor(this.count * (0.2 + Math.random() * 0.3));
        if (splitCount < 5) return null;

        this.count -= splitCount;
        this.splitCooldown = 60;

        const offsetX = (Math.random() - 0.5) * 3;
        const offsetY = (Math.random() - 0.5) * 3;

        const newCrowd = new Crowd(this.game, this.x + offsetX, this.y + offsetY, splitCount);
        // New crowd inherits survival time
        newCrowd.survivalMonths = this.survivalMonths;
        newCrowd.lastTickCount = this.lastTickCount;
        return newCrowd;
    }

    render(ctx, offsetX, offsetY, tileSize) {
        const screenX = (this.x * tileSize) + offsetX;
        const screenY = (this.y * tileSize) + offsetY;

        if (screenX < -tileSize * 2 || screenX > ctx.canvas.width + tileSize * 2 ||
            screenY < -tileSize * 2 || screenY > ctx.canvas.height + tileSize * 2) {
            return;
        }

        ctx.save();

        if (this.inForest) {
            ctx.globalAlpha = 0.4;
        }

        // Draw crowd as group of people emoji
        const emoji = this.count > 20 ? '👥' : '👤';
        const fontSize = Math.min(tileSize * 0.8, 16 + Math.min(this.count / 5, 8));
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, screenX + tileSize/2, screenY + tileSize/2);

        // Draw count badge
        if (this.count > 1) {
            const badgeText = this.count.toString();
            ctx.font = 'bold 10px Arial';
            const textWidth = ctx.measureText(badgeText).width;

            // Badge background
            ctx.fillStyle = this.state === 'attracted' ? '#4CAF50' : 
                           this.state === 'avoiding' ? '#FF9800' : '#2196F3';
            ctx.beginPath();
            ctx.roundRect(screenX + tileSize/2 - textWidth/2 - 4, screenY - tileSize * 0.7, textWidth + 8, 14, 3);
            ctx.fill();

            // Badge text
            ctx.fillStyle = 'white';
            ctx.fillText(badgeText, screenX + tileSize/2, screenY - tileSize * 0.7 + 7);
        }

        // Draw survival indicator (small progress bar)
        if (this.survivalMonths > 0) {
            const progress = Math.min(this.survivalMonths / this.maxSurvivalMonths, 1);
            const barWidth = tileSize * 0.8;
            const barHeight = 3;
            const barX = screenX + tileSize * 0.1;
            const barY = screenY + tileSize + 2;

            // Background
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            // Progress
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(barX, barY, barWidth * progress, barHeight);
        }

        ctx.restore();
    }
}

window.ImmigrationSystem = ImmigrationSystem;
window.PeopleBoat = PeopleBoat;
window.Crowd = Crowd;
