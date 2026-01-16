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
        this.baseSpawnInterval = 12;  // Base interval: 12 months (1 year)
        this.spawnVariance = 2;       // ±2 months randomness

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
        return Math.max(6, this.baseSpawnInterval + variance);  // Minimum 6 months
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

        console.log(`[BOAT_DEBUG] Spawning boat from ${sourceIsland.name} island at center (${sourceIsland.centerX}, ${Math.floor(sourceIsland.centerY)})`);

        // Find a water tile near the source island to spawn the boat
        const spawnPoint = this.findWaterNearIsland(sourceIsland);
        console.log(`[BOAT_DEBUG] Spawn point found: ${spawnPoint ? `(${spawnPoint.x}, ${spawnPoint.y})` : 'NONE'}`);
        if (!spawnPoint) {
                // console.log(`[IMMIGRATION] Could not find water spawn point for ${sourceIsland.name}`);
            return false;
        }

        // Find landing spot far from civilization on main island
        const landingSpot = this.findRemoteLandingSpot(sourceIsland.name);
        console.log(`[BOAT_DEBUG] Landing spot for ${sourceIsland.name}: ${landingSpot ? `(${landingSpot.x}, ${landingSpot.y}) priority=${landingSpot.priority}` : 'NONE'}`);
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

                // console.log(`[IMMIGRATION] Boat from ${sourceIsland.name}: ${distance.toFixed(1)} tiles, ${travelMonths} months, speed=${calculatedSpeed.toFixed(4)}`);

        const boat = new PeopleBoat(
            this.game,
            spawnPoint.x,
            spawnPoint.y,
            landingSpot,
            peopleCount,
            sourceIsland.name,
            calculatedSpeed
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

        // Search for water tiles near the island center
        // Prefer tiles on the side facing the main island
        const mainIslandX = map.width / 2;
        const searchDirection = island.centerX < mainIslandX ? 1 : -1;  // Search toward main island

        for (let radius = 5; radius < 20; radius++) {
            for (let dy = -radius; dy <= radius; dy++) {
                const x = Math.floor(island.centerX + (radius * searchDirection));
                const y = Math.floor(island.centerY + dy);

                if (x >= 0 && x < map.width && y >= 0 && y < map.height) {
                    const terrain = map.getTerrainAt(x, y);
                    // TERRAIN.WATER = 1, TERRAIN.DEEP_WATER = 0
                    if (terrain === 0 || terrain === 1) {
                        return { x, y };
                    }
                }
            }
        }

        return null;
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

        // Sort by priority (highest first), then by distance from civ
        beachTiles.sort((a, b) => {
            if (b.priority !== a.priority) return b.priority - a.priority;
            return b.distFromCiv - a.distFromCiv;
        });

        // Get the best priority level available
        const bestPriority = beachTiles[0].priority;
        const bestBeaches = beachTiles.filter(b => b.priority === bestPriority);

        // Pick randomly from top 30% of best beaches
        const topCount = Math.max(1, Math.floor(bestBeaches.length * 0.3));
        const chosen = bestBeaches[Math.floor(Math.random() * topCount)];

        return chosen;
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
                // console.log(`[IMMIGRATION] Added ${boat.peopleCount} to visitors due to crowd limit. Total visitors: ${this.game.visitors}`);
            return;
        }

        // Spawn crowd on the beach (targetLanding), not in water where boat is
        const landX = boat.targetLanding ? boat.targetLanding.x : boat.x;
        const landY = boat.targetLanding ? boat.targetLanding.y : boat.y;

                // console.log(`[IMMIGRATION] Spawning crowd at (${landX}, ${landY}) with ${boat.peopleCount} people`);
        const crowd = new Crowd(
            this.game,
            landX,
            landY,
            boat.peopleCount
        );

        this.crowds.push(crowd);

        // Add to visitors count when people offload from boat
        this.game.visitors = (this.game.visitors || 0) + boat.peopleCount;
                // console.log(`[IMMIGRATION] Crowd of ${boat.peopleCount} landed on beach at (${Math.floor(landX)}, ${Math.floor(landY)}). Total visitors: ${this.game.visitors}`);
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
        this.startX = startX;  // Remember spawn position for return trip
        this.startY = startY;
        this.targetLanding = targetLanding;
        this.peopleCount = peopleCount;
        this.sourceIsland = sourceIsland;
        this.speed = speed;  // Calculated based on distance for consistent travel time
        this.state = 'arriving';  // arriving, landed, leaving
        this.crowdSpawned = false;
        this.frame = 0;
        this.remove = false;

        // Navigation - for avoiding islands
        this.avoidanceAngle = 0;
        this.avoidanceFrames = 0;
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

        const dx = this.targetLanding.x - this.x;
        const dy = this.targetLanding.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Debug logging (occasional)
        if (this.frame % 300 === 0) {
            // console.log(`[PEOPLE_BOAT] From ${this.sourceIsland}: pos(${this.x.toFixed(1)}, ${this.y.toFixed(1)}) -> target(${this.targetLanding.x}, ${this.targetLanding.y}), dist: ${dist.toFixed(1)}, avoidance: ${this.avoidanceFrames}`);
        }

        // Check if we're about to hit land - stop at water's edge
        const map = this.game.tileMap;
        if (map) {
            const targetDirX = dx / dist;
            const targetDirY = dy / dist;
            const nextX = this.x + targetDirX * this.speed;
            const nextY = this.y + targetDirY * this.speed;
            const nextTerrain = map.getTerrainAt(Math.floor(nextX), Math.floor(nextY));

            // WATER=0, DEEP_WATER=1 - if next tile is NOT water, we've reached shore
            if (nextTerrain !== 0 && nextTerrain !== 1) {
                console.log(`[BOAT_DEBUG] Boat from ${this.sourceIsland} reached shore at (${Math.floor(this.x)}, ${Math.floor(this.y)}), terrain=${nextTerrain}`);
                this.state = 'landed';
                return;
            }
        }

        // Also stop if very close to target
        if (dist < 1.5) {
            this.state = 'landed';
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
        }

        // Move in the chosen direction
        const nextX = this.x + moveDirX * this.speed;
        const nextY = this.y + moveDirY * this.speed;

        // Final safety check - don't move into land
        if (this.isWater(nextX, nextY)) {
            this.x = nextX;
            this.y = nextY;
        }
    }

    /**
     * Move back to source island instead of just disappearing
     */
    moveBackToSource() {
        // Target is the original spawn position (near source island)
        const targetX = this.startX;
        const targetY = this.startY;

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Use faster speed for return trip
        const returnSpeed = this.speed * 2;

        // If we've reached the source island area, remove the boat
        if (dist < 2) {
                // console.log(`[IMMIGRATION] Empty boat returned to ${this.sourceIsland} island`);
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
        this.speed = 0.015;  // Walking speed for 60fps animation (reduced 50%)
        this.frame = 0;
        this.remove = false;
        this.reachedCivilization = false;
        this.inForest = false;
        this.targetX = null;
        this.targetY = null;
        this.pathUpdateTimer = 0;
        this.pathUpdateInterval = 60;  // Update path every 60 frames
        this.splitCooldown = 0;
        this.targetMode = 'nearest';  // 'nearest', 'random', or 'wander' 
    }

    update() {
        this.frame++;
        this.splitCooldown = Math.max(0, this.splitCooldown - 1);

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

        // Check if reached civilization
        this.checkCivilization();
    }

    updateTarget() {
        const map = this.game.tileMap;
        if (!map) return;

        // Different behavior based on target mode
        if (this.targetMode === 'random') {
            this.pickRandomTarget();
            return;
        }
        if (this.targetMode === 'wander') {
            this.pickWanderTarget();
            return;
        }

        // Default: Find nearest building or palace (civilization)
        let nearestDist = Infinity;
        let nearestX = map.width / 2;
        let nearestY = map.height / 2;

        // Check for buildings
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const tile = map.getTile(x, y);
                const terrain = map.getTerrainAt(x, y);

                // Target buildings or palace
                if (tile?.building || terrain === 9) {  // TERRAIN.PALACE = 9
                    const dist = Math.sqrt(Math.pow(x - this.x, 2) + Math.pow(y - this.y, 2));
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestX = x;
                        nearestY = y;
                    }
                }
            }
        }

        this.targetX = nearestX;
        this.targetY = nearestY;
    }

    pickRandomTarget() {
        const map = this.game.tileMap;
        if (!map) return;

        // Collect all buildings and pick a random one
        const buildings = [];
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const tile = map.getTile(x, y);
                const terrain = map.getTerrainAt(x, y);
                if (tile?.building || terrain === 9) {
                    buildings.push({ x, y });
                }
            }
        }

        if (buildings.length > 0) {
            // Pick a random building (not necessarily nearest)
            const target = buildings[Math.floor(Math.random() * buildings.length)];
            this.targetX = target.x;
            this.targetY = target.y;
        } else {
            // No buildings, wander toward center
            this.targetX = map.width / 2 + (Math.random() - 0.5) * 20;
            this.targetY = map.height / 2 + (Math.random() - 0.5) * 20;
        }
        
        // 20% chance to go back to shore instead
        if (Math.random() < 0.2) {
            this.targetMode = 'wander';
            this.pickWanderTarget();
        }
    }

    pickWanderTarget() {
        const map = this.game.tileMap;
        if (!map) return;

        // Wander in a random direction, possibly back toward shore
        const angle = Math.random() * Math.PI * 2;
        const distance = 10 + Math.random() * 20;
        this.targetX = this.x + Math.cos(angle) * distance;
        this.targetY = this.y + Math.sin(angle) * distance;
        
        // Clamp to map bounds
        this.targetX = Math.max(5, Math.min(map.width - 5, this.targetX));
        this.targetY = Math.max(5, Math.min(map.height - 5, this.targetY));
    }

    moveTowardTarget() {
        if (this.targetX === null || this.targetY === null) return;

        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.5) return;

        // Check if next tile is passable
        const map = this.game.tileMap;
        if (!map) return;

        const nextX = this.x + (dx / dist) * this.speed;
        const nextY = this.y + (dy / dist) * this.speed;
        const terrain = map.getTerrainAt(Math.floor(nextX), Math.floor(nextY));

        // Can walk on grass, sand, forest, dirt, hills, mountains
        // TERRAIN: SAND=2, HILL=3, GRASS=4, DIRT=5, FOREST=6, MOUNTAIN=7
        if (terrain === 2 || terrain === 3 || terrain === 4 || terrain === 5 || terrain === 6 || terrain === 7) {
            this.x = nextX;
            this.y = nextY;
        } else {
            // Try to go around obstacle
            const altDx = dy;  // Perpendicular
            const altDy = -dx;
            const altNextX = this.x + (altDx / dist) * this.speed;
            const altNextY = this.y + (altDy / dist) * this.speed;
            const altTerrain = map.getTerrainAt(Math.floor(altNextX), Math.floor(altNextY));

            if (altTerrain === 2 || altTerrain === 3 || altTerrain === 4 || altTerrain === 5 || altTerrain === 6 || altTerrain === 7) {
                this.x = altNextX;
                this.y = altNextY;
            }
        }
    }

    checkForestStatus() {
        const map = this.game.tileMap;
        if (!map) return;

        const terrain = map.getTerrainAt(Math.floor(this.x), Math.floor(this.y));
        this.inForest = (terrain === 6);  // TERRAIN.FOREST = 6
    }

    checkCivilization() {
        // Guard: skip if already reached civilization
        if (this.reachedCivilization) return;

        // Debug: log position periodically
        if (Math.random() < 0.01) {
            // console.log(`[CROWD] Checking civilization at (${Math.floor(this.x)},${Math.floor(this.y)}), count: ${this.count}`);
        }
        const map = this.game.tileMap;
        if (!map) return;

        // Check tiles around current position
        const checkRadius = 2;
        for (let dy = -checkRadius; dy <= checkRadius; dy++) {
            for (let dx = -checkRadius; dx <= checkRadius; dx++) {
                const tx = Math.floor(this.x) + dx;
                const ty = Math.floor(this.y) + dy;

                if (tx < 0 || tx >= map.width || ty < 0 || ty >= map.height) continue;

                const tile = map.getTile(tx, ty);
                const terrain = map.getTerrainAt(tx, ty);

                // Reached civilization if near a building or palace
                if (tile?.building || terrain === 9) {
                    // console.log(`[CROWD] Reached civilization at (${tx},${ty})! Building: ${tile?.building}, Terrain: ${terrain}`);
                    this.reachedCivilization = true;
                    return;
                }
            }
        }
    }

    shouldSplit() {
        // Can split if:
        // - More than 20 people
        // - Random chance
        // - Not on cooldown
        return this.count > 10 && 
               this.splitCooldown === 0 && 
               Math.random() < 0.10;  // 10% chance per frame - more splitting!
    }

    split() {
        // Split off a portion of the crowd
        const splitCount = Math.floor(this.count * (0.2 + Math.random() * 0.3));  // 20-50%
        if (splitCount < 5) return null;

        this.count -= splitCount;
        this.splitCooldown = 60;  // 1 second cooldown

        // New crowd spawns slightly offset
        const offsetX = (Math.random() - 0.5) * 3;
        const offsetY = (Math.random() - 0.5) * 3;

                // console.log(`[IMMIGRATION] Crowd split: ${splitCount} broke off, ${this.count} remain`);

        const newCrowd = new Crowd(this.game, this.x + offsetX, this.y + offsetY, splitCount);
        // Make the new crowd go in a DIFFERENT direction
        newCrowd.targetMode = 'random';  // Will pick a random target instead of nearest
        return newCrowd;
    }

    render(ctx, offsetX, offsetY, tileSize) {
        const screenX = (this.x * tileSize) + offsetX;
        const screenY = (this.y * tileSize) + offsetY;

        // Don't render if off screen
        if (screenX < -tileSize * 2 || screenX > ctx.canvas.width + tileSize * 2 ||
            screenY < -tileSize * 2 || screenY > ctx.canvas.height + tileSize * 2) {
            return;
        }

        ctx.save();

        // If in forest, make translucent (hiding)
        if (this.inForest) {
            ctx.globalAlpha = 0.4;
        }

        // Draw crowd as cluster of dots
        const clusterSize = Math.min(8, Math.ceil(Math.sqrt(this.count)));
        ctx.fillStyle = '#8D6E63';  // Brown/tan color for people

        for (let i = 0; i < clusterSize; i++) {
            for (let j = 0; j < clusterSize; j++) {
                if (i * clusterSize + j >= Math.min(this.count, 64)) break;

                const px = screenX + (i - clusterSize/2) * 4 + Math.sin(this.frame * 0.05 + i) * 1;
                const py = screenY + (j - clusterSize/2) * 4 + Math.cos(this.frame * 0.05 + j) * 1;

                ctx.beginPath();
                ctx.arc(px, py, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();

        // Draw count marker (always visible, even when hiding)
        ctx.save();
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';

        // Background pill
        const text = this.count.toString();
        const textWidth = ctx.measureText(text).width;

        // Different color if hiding in forest
        ctx.fillStyle = this.inForest ? 'rgba(76, 175, 80, 0.8)' : 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.roundRect(screenX - textWidth/2 - 5, screenY - tileSize * 0.7, textWidth + 10, 16, 8);
        ctx.fill();

        // Count text
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(text, screenX, screenY - tileSize * 0.7 + 12);

        // Forest icon if hiding
        if (this.inForest) {
            ctx.font = '10px Arial';
            ctx.fillText('🌲', screenX + textWidth/2 + 8, screenY - tileSize * 0.7 + 11);
        }

        ctx.restore();
    }
}

window.ImmigrationSystem = ImmigrationSystem;
window.PeopleBoat = PeopleBoat;
window.Crowd = Crowd;
