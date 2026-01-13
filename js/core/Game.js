/**
 * Game - Main game controller
 */
class Game extends EventEmitter {
    constructor() {
        super();
        
        // Game state
        this.state = {
            funds: 10000,
            population: 0,
            month: 1,
            year: 1,
            kingMood: 75,  // 0-100
            tariffRate: 25, // percentage
            paused: false
        };
        
        // Components
        this.canvas = null;
        this.tileMap = null;
        this.random = null;
        
        // Simulation timing
        this.tickRate = 1000; // ms per game tick
        this.lastTick = 0;
        
        // Animation
        this.animationId = null;
        this.isRunning = false;
    }

    // Initialize the game
    async init() {
        console.log('Initializing Island Kingdom...');
        
        this.updateLoadingStatus('Creating world...');
        this.updateLoadingProgress(20);
        
        // Create random generator with seed
        this.random = new Random(Date.now());
        
        // Create tile map (128x128 tiles)
        this.tileMap = new TileMap(128, 128);
        
        this.updateLoadingStatus('Generating island...');
        this.updateLoadingProgress(40);
        
        // Generate island
        const generator = new IslandGenerator(this.tileMap, this.random);
        generator.generate();
        
        this.updateLoadingStatus('Setting up display...');
        this.updateLoadingProgress(70);
        
        // Setup canvas
        this.canvas = new GameCanvas('game-canvas');
        this.canvas.setTileMap(this.tileMap);
        
        this.updateLoadingStatus('Ready!');
        this.updateLoadingProgress(100);
        
        // Hide loading screen after short delay
        await this.delay(500);
        this.hideLoadingScreen();
        
        // Update UI
        this.updateUI();
        
        // Show welcome tweet
        this.showKingTweet("I have the BEST island! Everyone says so. Tremendous island. We're going to make it GREAT! 🏝️👑");
        
        console.log('Game initialized!');
        return this;
    }

    // Start game loop
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastTick = performance.now();
        this.loop();
        
        console.log('Game started!');
    }

    // Main game loop
    loop() {
        if (!this.isRunning) return;
        
        const now = performance.now();
        
        // Game tick (simulation)
        if (!this.state.paused && now - this.lastTick >= this.tickRate) {
            this.tick();
            this.lastTick = now;
        }
        
        // Render
        this.canvas.render();
        
        // Continue loop
        this.animationId = requestAnimationFrame(() => this.loop());
    }

    // Game tick - simulation step
    tick() {
        // Advance time
        this.state.month++;
        if (this.state.month > 12) {
            this.state.month = 1;
            this.state.year++;
            this.yearEnd();
        }
        
        // Simple population growth (placeholder)
        if (this.random.bool(0.3)) {
            this.state.population += this.random.int(1, 5);
        }
        
        // Random king mood changes
        if (this.random.bool(0.1)) {
            const change = this.random.int(-5, 5);
            this.state.kingMood = Math.max(0, Math.min(100, this.state.kingMood + change));
            
            // Random tweets
            if (this.random.bool(0.3)) {
                this.randomKingTweet();
            }
        }
        
        // Update UI
        this.updateUI();
        
        this.emit('tick', this.state);
    }

    // Year end processing
    yearEnd() {
        console.log(`Year ${this.state.year} begins!`);
        this.emit('yearEnd', this.state.year);
    }

    // Update UI elements
    updateUI() {
        document.getElementById('funds').textContent = `💰 $${this.state.funds.toLocaleString()}`;
        document.getElementById('population').textContent = `👥 ${this.state.population.toLocaleString()}`;
        document.getElementById('date').textContent = `Year ${this.state.year}, Month ${this.state.month}`;
        
        // King mood emoji
        let moodEmoji;
        if (this.state.kingMood >= 80) moodEmoji = '😄';
        else if (this.state.kingMood >= 60) moodEmoji = '😊';
        else if (this.state.kingMood >= 40) moodEmoji = '😐';
        else if (this.state.kingMood >= 20) moodEmoji = '😠';
        else moodEmoji = '🤬';
        
        document.getElementById('king-mood').textContent = `👑 ${moodEmoji}`;
    }

    // Show king's tweet
    showKingTweet(message) {
        const popup = document.getElementById('tweet-popup');
        const content = popup.querySelector('.tweet-content');
        
        content.textContent = message;
        popup.classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            popup.classList.add('hidden');
        }, 5000);
    }

    // Random king tweets
    randomKingTweet() {
        const tweets = [
            "Our tariffs are WORKING! The boats are paying BIG LEAGUE! 🚢💰",
            "Just built a BEAUTIFUL wall. Nobody builds walls like me! 🧱",
            "The fake news says our economy is bad. WRONG! It's the best! 📈",
            "Many people are saying this is the greatest island ever. Many people! 🏝️",
            "We need MORE monuments! The people LOVE monuments! 🗽",
            "Low energy immigrants trying to come here. SAD! 😤",
            "Our police are the BEST. Very tough on crime! 👮",
            "Just approved a new golf course. Very classy! ⛳",
            "The king's approval rating is through the ROOF! Everyone loves me! 👑",
            "WITCH HUNT by the opposition! They're jealous of my success! 🧙"
        ];
        
        this.showKingTweet(this.random.pick(tweets));
    }

    // Loading screen helpers
    updateLoadingStatus(status) {
        const el = document.getElementById('loading-status');
        if (el) el.textContent = status;
    }

    updateLoadingProgress(percent) {
        const el = document.querySelector('.loading-progress');
        if (el) el.style.width = `${percent}%`;
    }

    hideLoadingScreen() {
        const el = document.getElementById('loading-screen');
        if (el) el.classList.add('hidden');
    }

    // Utility
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Pause/unpause
    togglePause() {
        this.state.paused = !this.state.paused;
        this.emit('pause', this.state.paused);
    }
}

window.Game = Game;
