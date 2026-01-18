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
import { PoliceSystem } from '../systems/PoliceSystem.js';
import { SoundSystem } from '../systems/SoundSystem.js';
import { AirportSystem } from '../systems/AirportSystem.js?v=222';
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
        this.tourists = 0;  // Current tourists on the island
        this.processedImmigrants = 0;  // Immigrants processed by police into residents

        console.log('[GAME] Initial state - Treasury:', this.treasury, 'Visitors:', this.visitors);
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
        this.tickInterval = 25000;  // 25 seconds per game tick (1 month)
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

        // Initialize police enforcement system
        this.policeSystem = new PoliceSystem(this);

        // Initialize airport system
        this.airportSystem = new AirportSystem(this);

        // Initialize sound system
        this.soundSystem = new SoundSystem(this);
        // console.log("[INIT] ImmigrationSystem created:", !!this.immigrationSystem);

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

        // Setup autosave every 60 seconds
        this.autosaveInterval = setInterval(() => {
            if (this.saveSystem && !this.paused) {
                // console.log('[AUTOSAVE] Saving game...');
                const result = this.saveSystem.saveGame(null, 'Autosave');
                if (result.success) {
                    // console.log(`[AUTOSAVE] Saved to slot ${result.slot}`);
                }
            }
        }, 60000);  // 60 seconds

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
            // console.log('[GAME] Starting new game...');
            this.start();
        };
        
        startMenu.onLoadGame = (slot) => {
            // console.log('[GAME] Loading game from slot', slot);
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
                // console.log('Residential allotment placed at', data.tileX, data.tileY);
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
                left: 10px;
                transform: none;
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
                transform: translateY(0);
            }

            #king-tweet.hidden {
                opacity: 0;
                transform: translateY(-20px);
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

        // Initialize and start sound system (requires user interaction first)
        if (this.soundSystem) {
            this.soundSystem.init().then(() => {
                this.soundSystem.loadSettings();
                this.soundSystem.playMusic('music-peaceful');
                this.soundSystem.startAmbient();
                console.log('[SOUND] Sound system started');
            });
        }

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

        // Animate police officers
        if (this.policeSystem) {
            this.policeSystem.animate();
        }

        // Update airport system (planes and tourists) at 60fps
        if (this.airportSystem) {
            this.airportSystem.update();
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

        // Render police officers and patrol indicators
        if (this.policeSystem && this.canvas) {
            const ctx = this.canvas.ctx;
            this.policeSystem.render(ctx, this.canvas.offsetX, this.canvas.offsetY, this.canvas.tileSize);
        }

        // Render airport system (planes and tourist crowds)
        if (this.airportSystem && this.canvas) {
            const ctx = this.canvas.ctx;
            this.airportSystem.render(ctx, this.canvas.offsetX, this.canvas.offsetY, this.canvas.tileSize);
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
        // Increment tick counter for time-based mechanics
        this.tickCount = (this.tickCount || 0) + 1;
        // if (this.month === 1 && this.year % 2 === 0) console.log("[TICK] Year", this.year);
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

            // Residential development provides base population
            // Police processing adds immigrants on top of this
            this.residentialCapacity = totalPop;

            // Population = residential capacity + processed immigrants
            // Residential capacity: people from developed housing phases
            // Processed immigrants: visitors captured and processed by police
            this.population = totalPop + (this.processedImmigrants || 0);
        }

        // Update immigration system (people boats and crowds) - OUTSIDE developmentManager block
        // console.log("[DEBUG] About to check immigrationSystem:", !!this.immigrationSystem);
        if (this.immigrationSystem) {
            this.immigrationSystem.update();
        }

        // Update police enforcement
        if (this.policeSystem) {
            this.policeSystem.update();
        }

        // Update airport system (independent of police system)
        if (this.airportSystem) {
            this.airportSystem.update();
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

        // Population comes from two sources:
        // 1. Residential development (housing phases provide base population)
        // 2. Police processing (immigrants become residents, added directly to this.population)
        //
        // Residential capacity is calculated each tick and represents developed housing.
        // We sync population to residential capacity as a baseline.
        // Police processing adds to population incrementally in PoliceSystem.update().
        //
        // To avoid double-counting, we track the residential base separately.
        if (this.residentialCapacity !== undefined) {
            // Set population to residential capacity as the base
            // Police-processed immigrants are added on top in PoliceSystem
            // But we need to preserve police additions, so only set if capacity > current
            // Actually, residential capacity IS the population from housing development
            // Police adds processed visitors on top of this
            // So we should NOT overwrite here - let police handle additions
            // Just update maxPopulation for reference
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
        const visitorWelfare = Math.floor(this.visitors * 0.5);  // $0.50 per visitor per month

        this.monthlyExpenses = roadMaintenance + golfMaintenance + generalExpenses + visitorWelfare;

        // Apply to treasury
        const netIncome = this.monthlyIncome - this.monthlyExpenses;
        this.treasury += netIncome;

        // Play income sound if positive income
        if (netIncome > 0 && this.soundSystem) {
            this.soundSystem.onIncome();
        }

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
        // Display treasury with clear negative formatting
        const treasuryEl = document.getElementById('treasury');
        if (this.treasury < 0) {
            treasuryEl.textContent = `-$${Math.abs(this.treasury).toLocaleString()}`;
            treasuryEl.style.color = '#FF4444';  // Red for negative
        } else {
            treasuryEl.textContent = `$${this.treasury.toLocaleString()}`;
            treasuryEl.style.color = '';  // Default color
        }

        document.getElementById('population').textContent = this.population + (this.visitors ? ` (+${this.visitors} visitors)` : '');
        // Update arrivals and departures from airport system
        if (this.airportSystem) {
            const stats = this.airportSystem.getStatus();
            document.getElementById('arrivals').textContent = 'Arrivals: ' + (stats.totalArrived || 0);
            document.getElementById('departures').textContent = 'Departures: ' + (stats.totalDeparted || 0);
        } else {
            document.getElementById('arrivals').textContent = 'Arrivals: 0';
            document.getElementById('departures').textContent = 'Departures: 0';
        }
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

    // Save game using SaveSystem with multiple slots
    save(slot = null) {
        // console.log('[SAVE] Save requested, slot:', slot);
        if (this.saveSystem) {
            try {
                const result = this.saveSystem.saveGame(slot);
                // console.log('[SAVE] Result:', result);
                if (result.success) {
                    this.kingTweet(`Game SAVED to slot ${result.slot}! The best save ever! 💾`);
                } else {
                    console.error('[SAVE] Save failed:', result.error);
                    this.kingTweet("Save FAILED! Sad! 😢");
                }
                return result;
            } catch (e) {
                console.error('[SAVE] Exception during save:', e);
                this.kingTweet("Save FAILED! Error! 😢");
                return { success: false, error: e.message };
            }
        }
        console.error('[SAVE] No save system available');
        return { success: false, error: 'No save system' };
    }

    // Load game - shows slot selection dialog
    load(slot = null) {
        if (!this.saveSystem) {
            this.kingTweet("No save system! Sad! 😢");
            return false;
        }

        const savedGames = this.saveSystem.getSavedGames();
        if (savedGames.length === 0) {
            this.kingTweet("No saves found! Sad! 😢");
            return false;
        }

        // If slot specified, load directly
        if (slot !== null) {
            const result = this.saveSystem.loadGame(slot);
            if (result) {
                this.kingTweet("Game LOADED! We're BACK! 🎮");
            } else {
                this.kingTweet("Load FAILED! Sad! 😢");
            }
            return result;
        }

        // Otherwise show slot selection dialog
        this.showLoadDialog(savedGames);
        return true;
    }

    // Show load dialog for slot selection
    showLoadDialog(savedGames) {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.id = 'load-dialog-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.7); display: flex; justify-content: center;
            align-items: center; z-index: 10000;
        `;

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: rgba(30,30,50,0.95); border-radius: 15px; padding: 30px;
            min-width: 400px; max-height: 80vh; overflow-y: auto;
            border: 1px solid rgba(255,255,255,0.2); color: white;
        `;

        dialog.innerHTML = `
            <h2 style="margin: 0 0 20px 0; text-align: center;">📂 Load Game</h2>
            <div id="load-slot-list" style="display: flex; flex-direction: column; gap: 10px;"></div>
            <button id="load-cancel" style="
                margin-top: 15px; padding: 10px 20px; background: #757575;
                color: white; border: none; border-radius: 5px; cursor: pointer;
                width: 100%; font-size: 16px;
            ">❌ Cancel</button>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Populate slots
        const list = dialog.querySelector('#load-slot-list');
        savedGames.forEach(save => {
            const date = new Date(save.timestamp);
            const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            const item = document.createElement('div');
            item.style.cssText = `
                background: rgba(255,255,255,0.1); border-radius: 10px; padding: 15px;
                display: flex; justify-content: space-between; align-items: center; cursor: pointer;
            `;
            item.innerHTML = `
                <div>
                    <div style="font-weight: bold;">${save.name}</div>
                    <div style="font-size: 14px; opacity: 0.8;">👥 ${save.population} | 💰 $${save.treasury}</div>
                    <div style="font-size: 12px; opacity: 0.5;">Year ${save.year}, Month ${save.month} • ${dateStr}</div>
                </div>
                <button class="load-btn" data-slot="${save.slot}" style="
                    background: #4CAF50; color: white; border: none; border-radius: 5px;
                    padding: 8px 15px; cursor: pointer;
                ">▶️ Load</button>
            `;
            list.appendChild(item);
        });

        // Event handlers
        list.querySelectorAll('.load-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const slot = parseInt(e.target.dataset.slot);
                overlay.remove();
                this.load(slot);
            });
        });

        dialog.querySelector('#load-cancel').addEventListener('click', () => {
            overlay.remove();
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
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

        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+S to save
            if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
                e.preventDefault(); // Prevent browser save dialog
                // console.log('[KEYBOARD] Ctrl+S pressed - saving game');
                this.save();
                return;
            }

            // Ctrl+L to load
            if ((e.ctrlKey || e.metaKey) && (e.key === 'l' || e.key === 'L')) {
                e.preventDefault(); // Prevent browser address bar focus
                // console.log('[KEYBOARD] Ctrl+L pressed - loading game');
                this.showLoadDialog();
                return;
            }

            // T for tariff UI
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
            // console.log(`Tile (${x}, ${y}) is out of bounds`);
            return null;
        }
        const terrainName = this.tileMap.getTileType(tile.terrain);
        // console.log(`=== Tile (${x}, ${y}) ===`);
        // console.log(`Terrain: ${terrainName} (code: ${tile.terrain})`);
        // console.log(`Building:`, tile.building);
        // console.log(`Full tile data:`, tile);
        return tile;
    }

    // Debug helper - check 3x3 area for residential placement
    debugArea(x, y) {
        // console.log(`=== Checking 3x3 area starting at (${x}, ${y}) ===`);
        for (let dy = 0; dy < 3; dy++) {
            for (let dx = 0; dx < 3; dx++) {
                const checkX = x + dx;
                const checkY = y + dy;
                const tile = this.tileMap.getTile(checkX, checkY);
                if (!tile) {
                    // console.log(`  (${checkX}, ${checkY}): OUT OF BOUNDS`);
                } else {
                    const terrainName = this.tileMap.getTileType(tile.terrain);
                    const hasBuilding = tile.building ? `YES - ${JSON.stringify(tile.building)}` : 'NO';
                    // console.log(`  (${checkX}, ${checkY}): terrain=${terrainName}, building=${hasBuilding}`);
                }
            }
        }
    }
}
