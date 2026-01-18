// WeatherSystem.js - Handles weather, clouds, storms, and flooding

export class WeatherSystem {
    constructor(game) {
        this.game = game;

        // Weather states: 'sunny', 'cloudy', 'rainy', 'stormy'
        this.currentWeather = 'sunny';
        this.weatherDuration = 0;  // Frames remaining in current weather
        this.transitionProgress = 0;  // For smooth transitions

        // Clouds
        this.clouds = [];
        this.maxClouds = 8;
        this.cloudSpawnTimer = 0;

        // Rain particles
        this.raindrops = [];
        this.maxRaindrops = 200;

        // Storm effects
        this.stormActive = false;
        this.lightningTimer = 0;
        this.lightningFlash = 0;  // Flash intensity 0-1
        this.thunderQueue = [];  // Delayed thunder sounds

        // Storm scheduling (every ~2 game months)
        this.daysSinceLastStorm = 0;
        this.stormInterval = 60;  // Days between storms (2 months)
        this.stormChance = 0.3;  // 30% chance per day after interval

        // Flooding
        this.floodedTiles = new Map();  // tile key -> flood level
        this.floodBuildupRate = 0.001;  // How fast flooding builds

        // Weather probabilities (when not storming)
        this.weatherWeights = {
            sunny: 50,
            cloudy: 35,
            rainy: 15
        };

        // Initialize with some clouds
        this.initializeClouds();
    }

    initializeClouds() {
        // Spawn initial clouds scattered across the map
        for (let i = 0; i < 4; i++) {
            this.spawnCloud(true);  // true = random position
        }
    }

    spawnCloud(randomPosition = false) {
        if (this.clouds.length >= this.maxClouds) return;

        const mapWidth = this.game.tileMap.width * 32;
        const mapHeight = this.game.tileMap.height * 32;

        const cloud = {
            x: randomPosition ? Math.random() * mapWidth : -200,
            y: Math.random() * mapHeight * 0.7,  // Upper 70% of map
            width: 150 + Math.random() * 100,
            height: 60 + Math.random() * 40,
            speed: 0.3 + Math.random() * 0.4,  // Pixels per frame
            opacity: 0.4 + Math.random() * 0.3,
            type: this.currentWeather === 'stormy' ? 'storm' : 'normal',
            // Cloud shape (multiple circles)
            puffs: this.generateCloudPuffs()
        };

        this.clouds.push(cloud);
    }

    generateCloudPuffs() {
        const puffs = [];
        const numPuffs = 4 + Math.floor(Math.random() * 4);

        for (let i = 0; i < numPuffs; i++) {
            puffs.push({
                offsetX: (i - numPuffs/2) * 25 + Math.random() * 20,
                offsetY: Math.random() * 20 - 10,
                radius: 25 + Math.random() * 20
            });
        }
        return puffs;
    }

    update() {
        this.updateWeatherState();
        this.updateClouds();
        this.updateRain();
        this.updateStorm();
        this.updateFlooding();
        this.checkStormSchedule();
    }

    updateWeatherState() {
        this.weatherDuration--;

        if (this.weatherDuration <= 0 && !this.stormActive) {
            this.changeWeather();
        }
    }

    changeWeather() {
        // Random weather based on weights
        const total = Object.values(this.weatherWeights).reduce((a, b) => a + b, 0);
        let random = Math.random() * total;

        for (const [weather, weight] of Object.entries(this.weatherWeights)) {
            random -= weight;
            if (random <= 0) {
                this.currentWeather = weather;
                break;
            }
        }

        // Duration: 30-90 seconds at 60fps
        this.weatherDuration = (30 + Math.random() * 60) * 60;

        // Adjust cloud count based on weather
        if (this.currentWeather === 'sunny') {
            this.maxClouds = 4;
        } else if (this.currentWeather === 'cloudy') {
            this.maxClouds = 8;
        } else if (this.currentWeather === 'rainy') {
            this.maxClouds = 10;
        }
    }

    updateClouds() {
        // Move clouds
        for (let i = this.clouds.length - 1; i >= 0; i--) {
            const cloud = this.clouds[i];
            cloud.x += cloud.speed;

            // Remove clouds that have drifted off screen
            const mapWidth = this.game.tileMap.width * 32;
            if (cloud.x > mapWidth + 200) {
                this.clouds.splice(i, 1);
            }
        }

        // Spawn new clouds
        this.cloudSpawnTimer++;
        const spawnInterval = this.currentWeather === 'sunny' ? 300 : 150;

        if (this.cloudSpawnTimer >= spawnInterval) {
            this.cloudSpawnTimer = 0;
            this.spawnCloud();
        }
    }

    updateRain() {
        if (this.currentWeather !== 'rainy' && !this.stormActive) {
            // Clear rain when not raining
            this.raindrops = [];
            return;
        }

        const intensity = this.stormActive ? 1.0 : 0.5;
        const targetDrops = Math.floor(this.maxRaindrops * intensity);

        // Spawn raindrops
        while (this.raindrops.length < targetDrops) {
            this.spawnRaindrop();
        }

        // Update raindrops
        for (let i = this.raindrops.length - 1; i >= 0; i--) {
            const drop = this.raindrops[i];
            drop.x += drop.windSpeed;
            drop.y += drop.fallSpeed;

            // Remove drops that hit the ground
            const mapHeight = this.game.tileMap.height * 32;
            if (drop.y > mapHeight) {
                this.raindrops.splice(i, 1);
            }
        }
    }

    spawnRaindrop() {
        const mapWidth = this.game.tileMap.width * 32;

        this.raindrops.push({
            x: Math.random() * (mapWidth + 100) - 50,
            y: -10,
            length: 10 + Math.random() * 15,
            fallSpeed: 8 + Math.random() * 4,
            windSpeed: this.stormActive ? 2 + Math.random() * 2 : 0.5,
            opacity: 0.3 + Math.random() * 0.3
        });
    }

    updateStorm() {
        if (!this.stormActive) return;

        // Lightning timing
        this.lightningTimer--;

        if (this.lightningTimer <= 0) {
            this.triggerLightning();
            // Next lightning in 2-8 seconds
            this.lightningTimer = (2 + Math.random() * 6) * 60;
        }

        // Fade lightning flash
        if (this.lightningFlash > 0) {
            this.lightningFlash -= 0.05;
        }

        // Process thunder queue (delayed sounds)
        for (let i = this.thunderQueue.length - 1; i >= 0; i--) {
            this.thunderQueue[i].delay--;
            if (this.thunderQueue[i].delay <= 0) {
                this.playThunder(this.thunderQueue[i].volume);
                this.thunderQueue.splice(i, 1);
            }
        }
    }

    triggerLightning() {
        // Flash effect
        this.lightningFlash = 1.0;

        // Queue thunder with delay (sound travels slower than light)
        const delay = 20 + Math.random() * 40;  // 0.3-1 second delay
        const volume = 0.5 + Math.random() * 0.5;
        this.thunderQueue.push({ delay, volume });

        // Random chance to strike a building (visual effect only for now)
        if (Math.random() < 0.1) {
            this.lightningStrike();
        }
    }

    lightningStrike() {
        // Could damage buildings or cause fires in future
        // For now just visual
        console.log('⚡ Lightning strike!');
    }

    playThunder(volume) {
        // Play thunder sound if sound system available
        if (this.game.soundSystem) {
            this.game.soundSystem.play?.('thunder', { volume });
        }
    }

    checkStormSchedule() {
        // Check once per game day
        if (this.game.tickCount % (25 * 60) !== 0) return;  // 25 sec = 1 day

        this.daysSinceLastStorm++;

        if (this.daysSinceLastStorm >= this.stormInterval) {
            if (Math.random() < this.stormChance) {
                this.startStorm();
            }
        }
    }

    startStorm() {
        console.log('🌩️ Storm starting!');
        this.stormActive = true;
        this.currentWeather = 'stormy';
        this.daysSinceLastStorm = 0;
        this.lightningTimer = 60;  // First lightning in 1 second

        // Make clouds dark and stormy
        this.maxClouds = 12;
        for (const cloud of this.clouds) {
            cloud.type = 'storm';
            cloud.opacity = 0.7;
        }

        // Storm duration: 1-3 minutes
        this.weatherDuration = (60 + Math.random() * 120) * 60;

        // Tweet about the storm
        if (this.game.tweetSystem) {
            this.game.tweetSystem.addTweet(
                '🌩️ Storm Warning!',
                'A powerful storm is approaching the island! Seek shelter!',
                'weather'
            );
        }
    }

    endStorm() {
        console.log('🌤️ Storm ending');
        this.stormActive = false;
        this.lightningFlash = 0;
        this.thunderQueue = [];

        // Return clouds to normal
        for (const cloud of this.clouds) {
            cloud.type = 'normal';
            cloud.opacity = 0.4 + Math.random() * 0.3;
        }

        this.changeWeather();
    }

    updateFlooding() {
        if (this.currentWeather !== 'rainy' && !this.stormActive) {
            // Drain floods when not raining
            for (const [key, level] of this.floodedTiles) {
                const newLevel = level - 0.002;
                if (newLevel <= 0) {
                    this.floodedTiles.delete(key);
                } else {
                    this.floodedTiles.set(key, newLevel);
                }
            }
            return;
        }

        // Build up flooding on low tiles near water
        const rate = this.stormActive ? this.floodBuildupRate * 3 : this.floodBuildupRate;

        // Check tiles adjacent to water
        for (let y = 0; y < this.game.tileMap.height; y++) {
            for (let x = 0; x < this.game.tileMap.width; x++) {
                const tile = this.game.tileMap.getTile(x, y);
                if (tile === 'grass' && this.isNearWater(x, y)) {
                    const key = `${x},${y}`;
                    const currentLevel = this.floodedTiles.get(key) || 0;
                    const newLevel = Math.min(1, currentLevel + rate);
                    if (newLevel > 0.1) {
                        this.floodedTiles.set(key, newLevel);
                    }
                }
            }
        }
    }

    isNearWater(x, y) {
        const neighbors = [
            [x-1, y], [x+1, y], [x, y-1], [x, y+1]
        ];

        for (const [nx, ny] of neighbors) {
            const tile = this.game.tileMap.getTile(nx, ny);
            if (tile === 'water' || tile === 'ocean') {
                return true;
            }
        }
        return false;
    }

    render(ctx) {
        // Render order: floods -> clouds -> rain -> lightning flash
        this.renderFlooding(ctx);
        this.renderClouds(ctx);
        this.renderRain(ctx);
        this.renderLightningFlash(ctx);
    }

    renderClouds(ctx) {
        for (const cloud of this.clouds) {
            ctx.save();

            // Cloud color based on type
            const color = cloud.type === 'storm' 
                ? `rgba(60, 60, 70, ${cloud.opacity})`
                : `rgba(255, 255, 255, ${cloud.opacity})`;

            ctx.fillStyle = color;

            // Draw cloud puffs
            for (const puff of cloud.puffs) {
                ctx.beginPath();
                ctx.arc(
                    cloud.x + puff.offsetX,
                    cloud.y + puff.offsetY,
                    puff.radius,
                    0, Math.PI * 2
                );
                ctx.fill();
            }

            ctx.restore();
        }
    }

    renderRain(ctx) {
        if (this.raindrops.length === 0) return;

        ctx.save();
        ctx.strokeStyle = this.stormActive 
            ? 'rgba(150, 170, 200, 0.6)' 
            : 'rgba(100, 150, 200, 0.4)';
        ctx.lineWidth = 1;

        for (const drop of this.raindrops) {
            ctx.globalAlpha = drop.opacity;
            ctx.beginPath();
            ctx.moveTo(drop.x, drop.y);
            ctx.lineTo(drop.x + drop.windSpeed * 2, drop.y + drop.length);
            ctx.stroke();
        }

        ctx.restore();
    }

    renderFlooding(ctx) {
        if (this.floodedTiles.size === 0) return;

        ctx.save();

        for (const [key, level] of this.floodedTiles) {
            const [x, y] = key.split(',').map(Number);
            const screenX = x * 32;
            const screenY = y * 32;

            // Blue water overlay with wave animation
            const wave = Math.sin(Date.now() / 500 + x + y) * 0.1;
            ctx.fillStyle = `rgba(50, 100, 200, ${(level * 0.4) + wave})`;
            ctx.fillRect(screenX, screenY, 32, 32);
        }

        ctx.restore();
    }

    renderLightningFlash(ctx) {
        if (this.lightningFlash <= 0) return;

        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${this.lightningFlash * 0.7})`;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
    }

    // API for other systems
    getWeather() {
        return this.currentWeather;
    }

    isStormy() {
        return this.stormActive;
    }

    isSunny() {
        return this.currentWeather === 'sunny' && !this.stormActive;
    }

    isRaining() {
        return this.currentWeather === 'rainy' || this.stormActive;
    }

    getCloudCover() {
        // 0 = clear, 1 = fully overcast
        if (this.stormActive) return 1.0;
        if (this.currentWeather === 'sunny') return 0.2;
        if (this.currentWeather === 'cloudy') return 0.6;
        if (this.currentWeather === 'rainy') return 0.8;
        return 0.5;
    }

    getWindSpeed() {
        // 0 = calm, 1 = very windy
        if (this.stormActive) return 0.9 + Math.random() * 0.1;
        if (this.currentWeather === 'rainy') return 0.5 + Math.random() * 0.2;
        if (this.currentWeather === 'cloudy') return 0.3 + Math.random() * 0.2;
        return 0.1 + Math.random() * 0.2;  // Light breeze when sunny
    }

    // Force a storm (for testing)
    forceStorm() {
        this.startStorm();
    }

    // Get status for debug panel
    getStatus() {
        return {
            weather: this.currentWeather,
            stormy: this.stormActive,
            clouds: this.clouds.length,
            raindrops: this.raindrops.length,
            floodedTiles: this.floodedTiles.size,
            daysSinceStorm: this.daysSinceLastStorm,
            cloudCover: this.getCloudCover().toFixed(2),
            windSpeed: this.getWindSpeed().toFixed(2)
        };
    }
}
