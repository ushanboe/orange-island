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
        this.maxCrowds = 20;
        this.spawnTimer = 0;
        this.spawnInterval = 300;   // Ticks between spawn attempts

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

    update() {
        // Spawn new people boats periodically
        this.spawnTimer++;
        if (this.spawnTimer >= this.spawnInterval) {
    update() {
        // Spawn new people boats periodically
        this.spawnTimer++;
        
        // Debug: log every 300 ticks
        if (this.spawnTimer % 300 === 0) {
            const map = this.game.tileMap;
            console.log(`[IMMIGRATION] Timer tick ${this.spawnTimer}, sourceIslands: ${map?.sourceIslands?.length || 'none'}, boats: ${this.peopleBoats.length}`);
        }
        
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.trySpawnPeopleBoat();
        }

        // Update all people boats
        this.updatePeopleBoats();

        // Update all crowds
        this.updateCrowds();

        // Clean up removed entities
        this.peopleBoats = this.peopleBoats.filter(b => !b.remove);
        this.crowds = this.crowds.filter(c => !c.remove);
    }

    trySpawnPeopleBoat() {
        console.log('[IMMIGRATION] Attempting to spawn people boat...');
        
        if (this.peopleBoats.length >= this.maxPeopleBoats) {
            console.log('[IMMIGRATION] Max boats reached:', this.peopleBoats.length);
            return;
        }

        const map = this.game.tileMap;
        console.log('[IMMIGRATION] Map exists:', !!map, 'sourceIslands:', map?.sourceIslands);
        
        if (!map || !map.sourceIslands || map.sourceIslands.length === 0) {
            console.log('[IMMIGRATION] No source islands available - map.sourceIslands is:', map?.sourceIslands);
            return;
        }
        const sourceIsland = map.sourceIslands[Math.floor(Math.random() * map.sourceIslands.length)];

        // Find a water tile near the source island to spawn the boat
        const spawnPoint = this.findWaterNearIsland(sourceIsland);
        if (!spawnPoint) {
            console.log('[IMMIGRATION] Could not find water spawn point');
            return;
        }

        // Find landing spot far from civilization on main island
        const landingSpot = this.findRemoteLandingSpot();
        if (!landingSpot) {
            console.log('[IMMIGRATION] Could not find remote landing spot');
            return;
        }

        // Create people boat
        const peopleCount = Math.floor(Math.random() * 91) + 10;  // 10-100 people
        const boat = new PeopleBoat(
            this.game,
            spawnPoint.x,
            spawnPoint.y,
            landingSpot,
            peopleCount,
            sourceIsland.name
        );

        this.peopleBoats.push(boat);
        console.log(`[IMMIGRATION] People boat spawned from ${sourceIsland.name} with ${peopleCount} people`);

        // King tweet about boats
        if (Math.random() < 0.5) {
            this.triggerKingTweet();
        }
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
                const x = island.centerX + (radius * searchDirection);
                const y = island.centerY + dy;

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

    findRemoteLandingSpot() {
        const map = this.game.tileMap;
        if (!map) return null;

        // Find all beach/sand tiles on the main island
        const beachTiles = [];
        const centerX = map.width / 2;
        const centerY = map.height / 2;

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
                        // Calculate distance from civilization (buildings)
                        const distFromCiv = this.getDistanceFromCivilization(x, y);
                        beachTiles.push({ x, y, distFromCiv });
                    }
                }
            }
        }

        if (beachTiles.length === 0) return null;

        // Sort by distance from civilization (furthest first)
        beachTiles.sort((a, b) => b.distFromCiv - a.distFromCiv);

        // Pick from the top 20% most remote beaches
        const topRemote = beachTiles.slice(0, Math.max(1, Math.floor(beachTiles.length * 0.2)));
        return topRemote[Math.floor(Math.random() * topRemote.length)];
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
        if (this.crowds.length >= this.maxCrowds) return;

        const crowd = new Crowd(
            this.game,
            boat.x,
            boat.y,
            boat.peopleCount
        );

        this.crowds.push(crowd);
        console.log(`[IMMIGRATION] Crowd of ${boat.peopleCount} landed at (${Math.floor(boat.x)}, ${Math.floor(boat.y)})`);
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
                // Add to population
                this.game.population = (this.game.population || 0) + crowd.count;
                console.log(`[IMMIGRATION] ${crowd.count} immigrants joined the population!`);
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
}


/**
 * PeopleBoat - Boat carrying immigrants from source islands
 */
export class PeopleBoat {
    constructor(game, startX, startY, targetLanding, peopleCount, sourceIsland) {
        this.game = game;
        this.x = startX;
        this.y = startY;
        this.targetLanding = targetLanding;
        this.peopleCount = peopleCount;
        this.sourceIsland = sourceIsland;
        this.speed = 0.05;  // Slower than cargo boats
        this.state = 'arriving';  // arriving, landed, leaving
        this.crowdSpawned = false;
        this.frame = 0;
        this.remove = false;
    }

    update() {
        this.frame++;

        if (this.state === 'arriving') {
            this.moveTowardsTarget();
        } else if (this.state === 'leaving') {
            this.moveAway();
        }
    }

    moveTowardsTarget() {
        if (!this.targetLanding) {
            this.state = 'leaving';
            return;
        }

        const dx = this.targetLanding.x - this.x;
        const dy = this.targetLanding.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 1.5) {
            this.state = 'landed';
            return;
        }

        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
    }

    moveAway() {
        // Move back toward source island
        const map = this.game.tileMap;
        const targetX = this.sourceIsland === 'left' ? -5 : (map?.width || 128) + 5;

        const dx = targetX - this.x;
        const dy = 0;
        const dist = Math.abs(dx);

        if (dist < 1) {
            this.remove = true;
            return;
        }

        this.x += Math.sign(dx) * this.speed * 1.5;
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
        ctx.translate(screenX + tileSize / 2, screenY + tileSize / 2);

        // Bobbing animation
        const bob = Math.sin(this.frame * 0.08) * 2;
        ctx.translate(0, bob);

        // Draw boat (different color from cargo boats - darker/wooden)
        const scale = 1.0;
        ctx.scale(scale, scale);

        // Boat hull (darker wood)
        ctx.fillStyle = '#5D4037';
        ctx.beginPath();
        ctx.moveTo(-tileSize * 0.4, 0);
        ctx.lineTo(-tileSize * 0.3, tileSize * 0.2);
        ctx.lineTo(tileSize * 0.3, tileSize * 0.2);
        ctx.lineTo(tileSize * 0.4, 0);
        ctx.lineTo(tileSize * 0.3, -tileSize * 0.08);
        ctx.lineTo(-tileSize * 0.3, -tileSize * 0.08);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#3E2723';
        ctx.lineWidth = 2;
        ctx.stroke();

        // People silhouettes on deck
        ctx.fillStyle = '#212121';
        const peopleRows = Math.min(3, Math.ceil(this.peopleCount / 30));
        for (let row = 0; row < peopleRows; row++) {
            for (let i = 0; i < 4; i++) {
                const px = -tileSize * 0.2 + (i * tileSize * 0.12);
                const py = -tileSize * 0.15 - (row * tileSize * 0.08);
                ctx.beginPath();
                ctx.arc(px, py, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();

        // Draw people count marker
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
        this.speed = 0.02;  // Very slow movement
        this.frame = 0;
        this.remove = false;
        this.reachedCivilization = false;
        this.inForest = false;
        this.targetX = null;
        this.targetY = null;
        this.pathUpdateTimer = 0;
        this.pathUpdateInterval = 60;  // Update path every 60 frames
        this.splitCooldown = 0;
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

        // Find nearest building or palace (civilization)
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

    moveTowardTarget() {
        if (this.targetX === null || this.targetY === null) return;

        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.5) return;

        // Check if next tile is passable
        const map = this.game.tileMap;
