// Game.js - Main game controller for Island Kingdom
import { EventEmitter } from './EventEmitter.js';
import { TileMap } from '../map/TileMap.js';
import { IslandGenerator } from '../map/IslandGenerator.js';
import { GameCanvas } from '../ui/GameCanvas.js';
import { Toolbar } from '../ui/Toolbar.js';
import { ToolManager } from '../buildings/ToolManager.js';
import { BUILDINGS } from '../buildings/Buildings.js';
import { TariffSystem } from '../economy/TariffSystem.js';
import { TariffUI } from '../ui/TariffUI.js';
import { DevelopmentManager } from '../simulation/Development.js';
import { ResidentialAllotmentManager } from '../simulation/ResidentialAllotment.js';
import { CommercialAllotmentManager } from '../simulation/CommercialAllotment.js';
import { IndustrialAllotmentManager } from '../simulation/IndustrialAllotment.js';
import { InfrastructureManager } from '../systems/InfrastructureManager.js';
import { AnimationSystem } from '../systems/AnimationSystem.js';
import { ImmigrationSystem } from '../systems/ImmigrationSystem.js';
import { DebugPanel } from '../ui/DebugPanel.js';
import { AdminSettings } from '../ui/AdminSettings.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { StartMenu } from '../ui/StartMenu.js';

export class Game {
    constructor() {
        this.events = new EventEmitter();

        // Game state
        this.treasury = 10000;
        this.frameCount = 0;
        this.population = 0;
        this.maxPopulation = 0;
        this.visitors = 0;  // Immigrants who landed but haven't integrated
        this.month = 1;
        this.year = 1;
        this.kingMood = 50;  // 0-100 numeric for development system
        this.kingMoodText = 'happy';  // happy, neutral, angry, furious
        this.kingEgo = 50;  // 0-100
        this.paused = false;

        // Economy
        this.taxRate = 10;  // percent
        this.tariffRate = 25;  // percent on imports
        this.monthlyIncome = 0;
        this.monthlyExpenses = 0;

        // Map
        this.tileMap = null;
        this.mapWidth = 128;
        this.mapHeight = 128;

        // Components
        this.canvas = null;
        this.toolbar = null;
        this.toolManager = null;

        // Tariff system
        this.tariffSystem = null;
        this.tariffUI = null;

        // Development system
        this.developmentManager = null;

        // Residential allotment system (3x3 zones)
        this.residentialManager = null;
        this.commercialManager = null;
        this.industrialManager = null;
        this.infrastructureManager = null;
        this.animationSystem = null;
        this.immigrationSystem = null;

        // Timing
        this.lastUpdate = 0;
        this.tickInterval = 4000;  // 4 seconds per game tick (50% slower)
        this.lastTick = 0;

        // King's tweets
        this.tweetQueue = [];
        this.currentTweet = null;
        this.tweetElement = null;
    }

    async init() {
        console.log('🏝️ Initializing Island Kingdom...');

        // Generate island
        const generator = new IslandGenerator(this.mapWidth, this.mapHeight);
        this.tileMap = generator.generate();

        // Initialize tool manager (before canvas and toolbar)
        this.toolManager = new ToolManager(this);

        // Initialize development system (before canvas for rendering)
        this.developmentManager = new DevelopmentManager(this);

        // Initialize residential allotment system (before canvas for rendering)
        this.residentialManager = new ResidentialAllotmentManager(this);
        this.commercialManager = new CommercialAllotmentManager(this);
        this.industrialManager = new IndustrialAllotmentManager(this);
        this.infrastructureManager = new InfrastructureManager(this);
        this.animationSystem = new AnimationSystem(this);
        this.immigrationSystem = new ImmigrationSystem(this);
        console.log("[INIT] ImmigrationSystem created:", !!this.immigrationSystem);

        // Initialize canvas (after managers so it can access them for rendering)
        this.canvas = new GameCanvas(this, 'game-canvas');

        // Initialize toolbar
        this.toolbar = new Toolbar(this);

        // Resize canvas now that toolbar exists
        this.canvas.resize();
        this.canvas.centerMap();

        // Initialize tariff system
        this.tariffSystem = new TariffSystem(this);
        this.tariffUI = new TariffUI(this);
        this.debugPanel = new DebugPanel(this);
        this.adminSettings = new AdminSettings(this);
        this.saveSystem = new SaveSystem(this);

        // Add tariff button to toolbar
        this.addTariffButton();

        // Create tweet display
        this.createTweetDisplay();

        // Setup event listeners
        this.setupEvents();

        // Update UI
        this.updateUI();

        // Initial king tweet
        this.kingTweet("Welcome to MY kingdom! It's going to be TREMENDOUS! 👑🏝️");

        console.log('✅ Game initialized!');

        // Start game loop
        this.showStartMenu();
    }


    showStartMenu() {
        const savedGames = this.saveSystem.getSavedGames();
        const startMenu = new StartMenu(this);
        
        startMenu.onNewGame = () => {
            console.log('[GAME] Starting new game...');
            this.start();
        };
        
        startMenu.onLoadGame = (slot) => {
            console.log('[GAME] Loading game from slot', slot);
            if (this.saveSystem.loadGame(slot)) {
                this.start();
            } else {
                this.kingTweet("Failed to load! Starting new game... 😢");
                this.start();
            }
        };
        
        startMenu.show(savedGames);
    }

    setupEvents() {
        // Building events
        this.events.on('buildingPlaced', (data) => {
            // Track zone development
            const buildingType = data.building?.id || data.building;

            // Residential uses the new 3x3 allotment system
            if (buildingType === 'residential') {
                // Allotment is created by ToolManager, just log it
                console.log('Residential allotment placed at', data.tileX, data.tileY);
            } else if (buildingType === 'commercial' || buildingType === 'industrial') {
                // Commercial and industrial still use old development system
                this.developmentManager.initZone(data.tileX, data.tileY, buildingType);
            }
            this.updateUI();
            this.events.emit('treasuryChanged', this.treasury);
        });

        this.events.on('buildingDemolished', (data) => {
            // Remove zone tracking
            this.developmentManager.removeZone(data.tileX, data.tileY);
            this.updateUI();
            this.events.emit('treasuryChanged', this.treasury);
        });

        this.events.on('placementFailed', (data) => {
            this.showNotification(data.reason, 'error');
        });
    }

    createTweetDisplay() {
        this.tweetElement = document.createElement('div');
        this.tweetElement.id = 'king-tweet';
        this.tweetElement.innerHTML = `
            <div class="tweet-header">
                <span class="tweet-icon">👑</span>
                <span class="tweet-name">The Mad King</span>
                <span class="tweet-handle">@MadKingOfficial</span>
            </div>
            <div class="tweet-content"></div>
        `;
        document.body.appendChild(this.tweetElement);

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #king-tweet {
                position: fixed;
                top: 60px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 2px solid #FFD700;
                border-radius: 12px;
                padding: 12px 16px;
                max-width: 350px;
                min-width: 280px;
                box-shadow: 0 4px 20px rgba(255,215,0,0.3);
                z-index: 900;
                opacity: 0;
                transition: opacity 0.3s, transform 0.3s;
                pointer-events: none;
            }

            #king-tweet.visible {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }

            #king-tweet.hidden {
                opacity: 0;
                transform: translateX(-50%) translateY(-20px);
            }

            .tweet-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
            }

            .tweet-icon {
                font-size: 24px;
            }

            .tweet-name {
                font-weight: bold;
                color: #FFD700;
            }

            .tweet-handle {
                color: #888;
                font-size: 12px;
            }

            .tweet-content {
                color: #fff;
                font-size: 14px;
                line-height: 1.4;
            }

            .notification {
                position: fixed;
                bottom: 180px;
                left: 50%;
                transform: translateX(-50%);
                padding: 10px 20px;
                border-radius: 8px;
                font-size: 14px;
                z-index: 1001;
                animation: notifyFade 2s forwards;
            }

            .notification.error {
                background: rgba(244, 67, 54, 0.9);
                color: white;
            }

            .notification.success {
                background: rgba(76, 175, 80, 0.9);
                color: white;
            }

            @keyframes notifyFade {
                0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
                10% { opacity: 1; transform: translateX(-50%) translateY(0); }
                80% { opacity: 1; }
                100% { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    kingTweet(message) {
        this.tweetQueue.push(message);
        if (!this.currentTweet) {
            this.showNextTweet();
        }
    }

    showNextTweet() {
        if (this.tweetQueue.length === 0) {
            this.currentTweet = null;
            this.tweetElement.classList.remove('visible');
            this.tweetElement.classList.add('hidden');
            return;
        }

        this.currentTweet = this.tweetQueue.shift();
        const content = this.tweetElement.querySelector('.tweet-content');
        content.textContent = this.currentTweet;

        this.tweetElement.classList.remove('hidden');
        this.tweetElement.classList.add('visible');

        // Hide after delay
        setTimeout(() => {
            this.showNextTweet();
        }, 4000);
    }

    showNotification(message, type = 'info') {
        const notif = document.createElement('div');
        notif.className = `notification ${type}`;
        notif.textContent = message;
        document.body.appendChild(notif);

        setTimeout(() => {
            notif.remove();
        }, 2000);
    }

    start() {
        this.running = true;
        this.lastUpdate = performance.now();
        this.lastTick = this.lastUpdate;
        this.gameLoop();
    }

    gameLoop() {
        const now = performance.now();
        const delta = now - this.lastUpdate;
        this.lastUpdate = now;
        this.frameCount++;

        // Game tick (simulation)
        if (!this.paused && now - this.lastTick >= this.tickInterval) {
            this.tick();
            this.lastTick = now;
        }

        // Update tariff system (boats, etc.)
        if (this.tariffSystem) {
            this.tariffSystem.update();
        }

        // Animate immigration boats and crowds at 60fps
        if (this.immigrationSystem) {
            this.immigrationSystem.animate();
        }

        // Render
        this.canvas.render();

        // Render boats on top
        if (this.tariffSystem && this.canvas) {
            const ctx = this.canvas.ctx;
            this.tariffSystem.render(ctx, this.canvas.offsetX, this.canvas.offsetY, this.canvas.tileSize);
        }

        // Render immigration (people boats and crowds)
        if (this.immigrationSystem && this.canvas) {
            const ctx = this.canvas.ctx;
            this.immigrationSystem.render(ctx, this.canvas.offsetX, this.canvas.offsetY, this.canvas.tileSize);
        }

        // Render development animations
        if (this.developmentManager && this.canvas) {
            this.renderDevelopmentAnimations();
        }

        requestAnimationFrame(() => this.gameLoop());
    }

    renderDevelopmentAnimations() {
        const ctx = this.canvas.ctx;
        const animations = this.developmentManager.getAnimations();
        const now = Date.now();

        for (const anim of animations) {
            const progress = (now - anim.startTime) / anim.duration;
            if (progress >= 1) continue;

            const screenX = anim.x * this.canvas.tileSize + this.canvas.offsetX;
            const screenY = anim.y * this.canvas.tileSize + this.canvas.offsetY;
            const size = this.canvas.tileSize;

            ctx.save();

            if (anim.type === 'construction') {
                // Construction sparkle effect
                ctx.globalAlpha = 1 - progress;
                ctx.fillStyle = '#FFD700';
                for (let i = 0; i < 5; i++) {
                    const angle = (progress * Math.PI * 4) + (i * Math.PI * 2 / 5);
                    const dist = progress * size * 0.5;
                    const px = screenX + size/2 + Math.cos(angle) * dist;
                    const py = screenY + size/2 + Math.sin(angle) * dist;
                    ctx.beginPath();
                    ctx.arc(px, py, 3 * (1 - progress), 0, Math.PI * 2);
                    ctx.fill();
                }
                // Construction icon
                ctx.font = `${size * 0.6}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🏗️', screenX + size/2, screenY + size/2 - progress * 20);
            } else if (anim.type === 'levelup') {
                // Level up effect - rising stars
                ctx.globalAlpha = 1 - progress;
                ctx.font = `${size * 0.4}px Arial`;
                ctx.textAlign = 'center';
                ctx.fillText('⬆️✨', screenX + size/2, screenY + size/2 - progress * 30);
            } else if (anim.type === 'decline') {
                // Decline effect - falling
                ctx.globalAlpha = 1 - progress;
                ctx.font = `${size * 0.4}px Arial`;
                ctx.textAlign = 'center';
                ctx.fillText('📉', screenX + size/2, screenY + size/2 + progress * 20);
            }

            ctx.restore();
        }
    }

    tick() {
        // Debug tick
        if (this.month === 1 && this.year % 2 === 0) console.log("[TICK] Year", this.year);
        // Advance time
        this.month++;
        if (this.month > 12) {
            this.month = 1;
            this.year++;
            this.yearlyUpdate();
        }

        // Update development system
        if (this.developmentManager) {
            const devStats = this.developmentManager.update();
            // Use development-based population for commercial/industrial
            let totalPop = devStats.totalPopulation;

            // Add residential allotment population
            if (this.residentialManager) {
                const resStats = this.residentialManager.update();
                if (resStats && resStats.totalPopulation) {
                    totalPop += resStats.totalPopulation;
                }
            }
            
            if (this.commercialManager) {
                const comStats = this.commercialManager.update();
                // Commercial provides jobs, not population
            }
            
            if (this.industrialManager) {
                const indStats = this.industrialManager.update();
                // Industrial provides jobs, not population
            }
            
            // Update infrastructure connectivity
            if (this.infrastructureManager) {
                this.infrastructureManager.update();
            }
            
            // Update animations (vehicles, boats, etc.)
            if (this.animationSystem) {
                this.animationSystem.update();
            }

            this.population = totalPop;
        }

        // Update immigration system (people boats and crowds) - OUTSIDE developmentManager block
        console.log("[DEBUG] About to check immigrationSystem:", !!this.immigrationSystem);
        if (this.immigrationSystem) {
            this.immigrationSystem.update();
        }

        // Simulate
        this.simulatePopulation();
        this.simulateEconomy();
        this.updateKingMood();

        // Update UI
        this.updateUI();
    }

    simulatePopulation() {
        // Count residential zones
        const residentialCount = this.tileMap.countBuildings('residential');
        this.maxPopulation = residentialCount * 25;  // Max based on fully developed zones

        // If no development manager, use simple growth
        if (!this.developmentManager || this.developmentManager.development.size === 0) {
            if (this.population < this.maxPopulation) {
                const wallCoverage = this.tileMap.getWallCoverage?.() || 0;
                const immigrationRate = 1 - (wallCoverage * 0.8);
                const growth = Math.ceil(Math.random() * 3 * immigrationRate);
                this.population = Math.min(this.maxPopulation, this.population + growth);
            }
        }

        // Random king comments about population
        if (Math.random() < 0.05) {
            if (this.population > 100) {
                this.kingTweet("Look at all these people! They LOVE me! 👥❤️");
            } else if (this.population < 20 && residentialCount > 0) {
                this.kingTweet("We need more people! Where is everyone?! 😤");
            }
        }
    }

    simulateEconomy() {
        // Calculate income
        const commercialCount = this.tileMap.countBuildings('commercial');
        const industrialCount = this.tileMap.countBuildings('industrial');
        const portCount = this.tileMap.countBuildings('port');

        // Tax income from population
        const taxIncome = Math.floor(this.population * (this.taxRate / 100) * 2);

        // Commercial income (based on development level)
        let commercialIncome = commercialCount * 5;
        if (this.developmentManager) {
            for (const dev of this.developmentManager.development.values()) {
                if (dev.type === 'commercial') {
                    commercialIncome += dev.level * 3;
                }
            }
        }

        // Industrial income
        let industrialIncome = industrialCount * 3;
        if (this.developmentManager) {
            for (const dev of this.developmentManager.development.values()) {
                if (dev.type === 'industrial') {
                    industrialIncome += dev.level * 4;
                }
            }
        }

        // Tariff income from ports
        const baseTariffIncome = portCount * 10;
        const tariffSystemRevenue = this.tariffSystem ? Math.floor(this.tariffSystem.stats.monthlyRevenue / 12) : 0;
        const tariffIncome = baseTariffIncome + tariffSystemRevenue;

        // Monument income (tourism)
        const statueCount = this.tileMap.countBuildings('statue');
        const towerCount = this.tileMap.countBuildings('tower');
        const tourismIncome = (statueCount * 5) + (towerCount * 50);

        this.monthlyIncome = taxIncome + commercialIncome + industrialIncome + tariffIncome + tourismIncome;

        // Calculate expenses
        const roadCount = this.tileMap.countBuildings('road');
        const golfCount = this.tileMap.countBuildings('golfCourse');

        const roadMaintenance = roadCount * 1;
        const golfMaintenance = golfCount * 20;
        const generalExpenses = Math.floor(this.population * 0.5);
        const visitorWelfare = this.visitors * 5;  // $5 per visitor per month

        this.monthlyExpenses = roadMaintenance + golfMaintenance + generalExpenses + visitorWelfare;

        // Apply to treasury
        const netIncome = this.monthlyIncome - this.monthlyExpenses;
        this.treasury += netIncome;

        // Emit treasury change
        this.events.emit('treasuryChanged', this.treasury);

        // King comments on money
        if (Math.random() < 0.03) {
            if (netIncome > 100) {
                this.kingTweet("Money money money! We're getting RICH! 💰💰💰");
            } else if (netIncome < -50) {
                this.kingTweet("We're losing money! This is a DISASTER! 😱");
            }
            if (this.tariffRate > 20 && portCount > 0) {
                this.kingTweet(`TARIFFS at ${this.tariffRate}%! Those boats will PAY! 🚢💵`);
            }
        }
    }

    updateKingMood() {
        // King mood based on ego and treasury
        let moodScore = 50;

        // Ego contribution
        moodScore += (this.kingEgo - 50) * 0.5;

        // Treasury contribution
        if (this.treasury > 20000) moodScore += 20;
        else if (this.treasury > 10000) moodScore += 10;
        else if (this.treasury < 1000) moodScore -= 30;
        else if (this.treasury < 5000) moodScore -= 15;

        // Population contribution
        if (this.population > 200) moodScore += 15;
        else if (this.population < 50) moodScore -= 10;

        // Store numeric mood for development system
        this.kingMood = Math.max(0, Math.min(100, moodScore));

        // Determine mood text
        if (moodScore >= 70) this.kingMoodText = 'happy';
        else if (moodScore >= 40) this.kingMoodText = 'neutral';
        else if (moodScore >= 20) this.kingMoodText = 'angry';
        else this.kingMoodText = 'furious';
    }

    yearlyUpdate() {
        // Annual events
        this.kingTweet(`Year ${this.year}! Another TREMENDOUS year for the kingdom! 🎉`);

        // Decay king ego slightly
        this.kingEgo = Math.max(0, this.kingEgo - 5);

        // Random events
        if (Math.random() < 0.2) {
            this.randomEvent();
        }
    }

    randomEvent() {
        const events = [
            { msg: "A trade ship arrived with HUGE tariffs! +$500 💰", effect: () => this.treasury += 500 },
            { msg: "Tourists came to see my beautiful statues! +$300 📸", effect: () => this.treasury += 300 },
            { msg: "Storm damaged some roads! -$200 🌧️", effect: () => this.treasury -= 200 },
            { msg: "The people threw a parade for ME! Ego +10 🎊", effect: () => this.kingEgo = Math.min(100, this.kingEgo + 10) },
            { msg: "New businesses are BOOMING! Commercial growth! 📈", effect: () => {} },
            { msg: "Factories working overtime! Industrial POWER! 🏭", effect: () => {} },
        ];

        const event = events[Math.floor(Math.random() * events.length)];
        event.effect();
        this.kingTweet(event.msg);
    }

    updateUI() {
        // Update header stats
        document.getElementById('treasury').textContent = `$${this.treasury.toLocaleString()}`;
        // Debug visitors
        if (this.month % 5 === 0) {
            console.log(`[UI DEBUG] Population: ${this.population}, Visitors: ${this.visitors}, Display: ${this.population + (this.visitors ? ' (+' + this.visitors + ' visitors)' : '')}`);
        }
        document.getElementById('population').textContent = this.population + (this.visitors ? ` (+${this.visitors} visitors)` : '');
        document.getElementById('date').textContent = `Year ${this.year}, Month ${this.month}`;

        // Update king mood emoji
        const moodEmojis = {
            happy: '😊',
            neutral: '😐',
            angry: '😠',
            furious: '🤬'
        };
        document.getElementById('king-mood').textContent = moodEmojis[this.kingMoodText] || '👑';
    }

    // Save game
    save() {
        const saveData = {
            treasury: this.treasury,
            population: this.population,
            month: this.month,
            year: this.year,
            kingEgo: this.kingEgo,
            taxRate: this.taxRate,
            tariffRate: this.tariffRate,
            tileMap: this.tileMap.serialize(),
            development: this.developmentManager?.serialize() || {}
        };
        localStorage.setItem('islandKingdom_save', JSON.stringify(saveData));
        this.kingTweet("Game SAVED! The best save ever! 💾");
    }

    // Load game
    load() {
        const saveStr = localStorage.getItem('islandKingdom_save');
        if (!saveStr) {
            this.kingTweet("No save found! Sad! 😢");
            return false;
        }

        try {
            const saveData = JSON.parse(saveStr);
            this.treasury = saveData.treasury;
            this.population = saveData.population;
            this.month = saveData.month;
            this.year = saveData.year;
            this.kingEgo = saveData.kingEgo;
            this.taxRate = saveData.taxRate;
            this.tariffRate = saveData.tariffRate;
            this.tileMap = TileMap.deserialize(saveData.tileMap);
            if (saveData.development) {
                this.developmentManager.deserialize(saveData.development);
            }
            this.updateUI();
            this.kingTweet("Game LOADED! We're BACK! 🎮");
            return true;
        } catch (e) {
            console.error('Load failed:', e);
            return false;
        }
    }

    // Alias for tariff system compatibility
    showKingTweet(message) {
        this.kingTweet(message);
    }

    // Add tariff button to toolbar
    addTariffButton() {
        const toolbar = document.querySelector('#toolbar');
        if (!toolbar) return;

        // Create tariff button
        const tariffBtn = document.createElement('button');
        tariffBtn.className = 'toolbar-btn tariff-btn-toolbar';
        tariffBtn.innerHTML = '🚢<br><small>Tariffs</small>';
        tariffBtn.title = 'Manage Tariffs (T)';
        tariffBtn.addEventListener('click', () => this.tariffUI.toggle());

        // Insert before the last buttons
        const categoryBtns = toolbar.querySelector('.toolbar-categories');
        if (categoryBtns) {
            categoryBtns.appendChild(tariffBtn);
        } else {
            toolbar.appendChild(tariffBtn);
        }

        // Add keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if (e.key === 't' || e.key === 'T') {
                if (!e.ctrlKey && !e.metaKey) {
                    this.tariffUI.toggle();
                }
            }
        });
    }

    // Get map reference for tariff system
    get map() {
        return this.tileMap;
    }

    // Debug helper - call from console: game.debugTile(x, y)
    debugTile(x, y) {
        const tile = this.tileMap.getTile(x, y);
        if (!tile) {
            console.log(`Tile (${x}, ${y}) is out of bounds`);
            return null;
        }
        const terrainName = this.tileMap.getTileType(tile.terrain);
        console.log(`=== Tile (${x}, ${y}) ===`);
        console.log(`Terrain: ${terrainName} (code: ${tile.terrain})`);
        console.log(`Building:`, tile.building);
        console.log(`Full tile data:`, tile);
        return tile;
    }

    // Debug helper - check 3x3 area for residential placement
    debugArea(x, y) {
        console.log(`=== Checking 3x3 area starting at (${x}, ${y}) ===`);
        for (let dy = 0; dy < 3; dy++) {
            for (let dx = 0; dx < 3; dx++) {
                const checkX = x + dx;
                const checkY = y + dy;
                const tile = this.tileMap.getTile(checkX, checkY);
                if (!tile) {
                    console.log(`  (${checkX}, ${checkY}): OUT OF BOUNDS`);
                } else {
                    const terrainName = this.tileMap.getTileType(tile.terrain);
                    const hasBuilding = tile.building ? `YES - ${JSON.stringify(tile.building)}` : 'NO';
                    console.log(`  (${checkX}, ${checkY}): terrain=${terrainName}, building=${hasBuilding}`);
                }
            }
        }
    }
}
