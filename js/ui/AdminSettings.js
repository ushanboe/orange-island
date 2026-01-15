// js/ui/AdminSettings.js
// Admin settings popup for adjusting game timing and spawn rates

export class AdminSettings {
    constructor(game) {
        this.game = game;
        this.visible = false;
        this.panel = null;
        
        // Default settings (can be overridden)
        this.settings = {
            // Game timeline: 80 seconds per tick = 16 minutes per year
            tickInterval: 25000,  // milliseconds per game tick (1 month)
            
            // Cargo boats
            cargoBoatSpawnInterval: 60,  // animation frames between spawn checks
            cargoBoatSpawnChance: 0.1,   // 10% chance per check
            cargoBoatSpeed: 0.015,       // tiles per frame
            
            // People boats (immigration)
            peopleBoatSpawnInterval: 18, // game ticks between spawn attempts
            peopleBoatSpawnChance: 0.8,  // 80% chance per attempt
            peopleBoatSpeed: 1.0,        // tiles per update
            crowdSpeed: 0.4,             // crowd movement speed
        };
        
        this.createPanel();
        this.setupKeyboardShortcut();
    }
    
    createPanel() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.id = 'admin-overlay';
        this.overlay.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            z-index: 10000;
            justify-content: center;
            align-items: center;
        `;
        
        // Create panel
        this.panel = document.createElement('div');
        this.panel.id = 'admin-panel';
        this.panel.style.cssText = `
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border: 2px solid #ffd700;
            border-radius: 15px;
            padding: 25px;
            min-width: 400px;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            color: #fff;
            font-family: Arial, sans-serif;
            box-shadow: 0 0 30px rgba(255,215,0,0.3);
        `;
        
        this.updatePanelContent();
        
        this.overlay.appendChild(this.panel);
        document.body.appendChild(this.overlay);
        
        // Close on overlay click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.hide();
        });
    }
    
    updatePanelContent() {
        const s = this.settings;
        const tickSeconds = s.tickInterval / 1000;
        const yearMinutes = (tickSeconds * 12) / 60;
        
        this.panel.innerHTML = `
            <h2 style="margin: 0 0 20px 0; color: #ffd700; text-align: center;">
                ⚙️ Admin Settings
            </h2>
            <p style="color: #888; font-size: 12px; text-align: center; margin-bottom: 20px;">
                Press F2 to toggle this panel
            </p>
            
            <div style="margin-bottom: 25px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 10px;">
                <h3 style="margin: 0 0 15px 0; color: #4ecdc4;">⏱️ Game Timeline</h3>
                <label style="display: block; margin-bottom: 10px;">
                    <span style="display: inline-block; width: 180px;">Seconds per month:</span>
                    <input type="number" id="admin-tickInterval" value="${tickSeconds}" 
                           min="1" max="300" step="1"
                           style="width: 80px; padding: 5px; border-radius: 5px; border: 1px solid #444; background: #2a2a4a; color: #fff;">
                </label>
                <p style="color: #888; font-size: 12px; margin: 5px 0;">
                    Current: 1 year = ${yearMinutes.toFixed(1)} minutes
                </p>
            </div>
            
            <div style="margin-bottom: 25px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 10px;">
                <h3 style="margin: 0 0 15px 0; color: #4ecdc4;">🚢 Cargo Boats</h3>
                <label style="display: block; margin-bottom: 10px;">
                    <span style="display: inline-block; width: 180px;">Spawn check interval:</span>
                    <input type="number" id="admin-cargoSpawnInterval" value="${s.cargoBoatSpawnInterval}" 
                           min="10" max="300" step="10"
                           style="width: 80px; padding: 5px; border-radius: 5px; border: 1px solid #444; background: #2a2a4a; color: #fff;">
                    <span style="color: #888; font-size: 11px;"> frames</span>
                </label>
                <label style="display: block; margin-bottom: 10px;">
                    <span style="display: inline-block; width: 180px;">Spawn chance:</span>
                    <input type="number" id="admin-cargoSpawnChance" value="${(s.cargoBoatSpawnChance * 100).toFixed(0)}" 
                           min="1" max="100" step="5"
                           style="width: 80px; padding: 5px; border-radius: 5px; border: 1px solid #444; background: #2a2a4a; color: #fff;">
                    <span style="color: #888; font-size: 11px;"> %</span>
                </label>
                <label style="display: block; margin-bottom: 10px;">
                    <span style="display: inline-block; width: 180px;">Boat speed:</span>
                    <input type="number" id="admin-cargoSpeed" value="${s.cargoBoatSpeed}" 
                           min="0.005" max="0.1" step="0.005"
                           style="width: 80px; padding: 5px; border-radius: 5px; border: 1px solid #444; background: #2a2a4a; color: #fff;">
                    <span style="color: #888; font-size: 11px;"> tiles/frame</span>
                </label>
            </div>
            
            <div style="margin-bottom: 25px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 10px;">
                <h3 style="margin: 0 0 15px 0; color: #4ecdc4;">⛵ Immigration Boats</h3>
                <label style="display: block; margin-bottom: 10px;">
                    <span style="display: inline-block; width: 180px;">Spawn interval:</span>
                    <input type="number" id="admin-peopleSpawnInterval" value="${s.peopleBoatSpawnInterval}" 
                           min="1" max="100" step="1"
                           style="width: 80px; padding: 5px; border-radius: 5px; border: 1px solid #444; background: #2a2a4a; color: #fff;">
                    <span style="color: #888; font-size: 11px;"> game ticks</span>
                </label>
                <label style="display: block; margin-bottom: 10px;">
                    <span style="display: inline-block; width: 180px;">Spawn chance:</span>
                    <input type="number" id="admin-peopleSpawnChance" value="${(s.peopleBoatSpawnChance * 100).toFixed(0)}" 
                           min="1" max="100" step="5"
                           style="width: 80px; padding: 5px; border-radius: 5px; border: 1px solid #444; background: #2a2a4a; color: #fff;">
                    <span style="color: #888; font-size: 11px;"> %</span>
                </label>
                <label style="display: block; margin-bottom: 10px;">
                    <span style="display: inline-block; width: 180px;">Boat speed:</span>
                    <input type="number" id="admin-peopleBoatSpeed" value="${s.peopleBoatSpeed}" 
                           min="0.1" max="5" step="0.1"
                           style="width: 80px; padding: 5px; border-radius: 5px; border: 1px solid #444; background: #2a2a4a; color: #fff;">
                    <span style="color: #888; font-size: 11px;"> tiles/update</span>
                </label>
                <label style="display: block; margin-bottom: 10px;">
                    <span style="display: inline-block; width: 180px;">Crowd speed:</span>
                    <input type="number" id="admin-crowdSpeed" value="${s.crowdSpeed}" 
                           min="0.1" max="2" step="0.1"
                           style="width: 80px; padding: 5px; border-radius: 5px; border: 1px solid #444; background: #2a2a4a; color: #fff;">
                    <span style="color: #888; font-size: 11px;"> tiles/update</span>
                </label>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="admin-apply" style="
                    padding: 12px 25px;
                    background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
                    border: none;
                    border-radius: 8px;
                    color: #fff;
                    font-weight: bold;
                    cursor: pointer;
                    font-size: 14px;
                ">✅ Apply</button>
                <button id="admin-reset" style="
                    padding: 12px 25px;
                    background: linear-gradient(135deg, #f39c12 0%, #e74c3c 100%);
                    border: none;
                    border-radius: 8px;
                    color: #fff;
                    font-weight: bold;
                    cursor: pointer;
                    font-size: 14px;
                ">🔄 Reset Defaults</button>
                <button id="admin-close" style="
                    padding: 12px 25px;
                    background: linear-gradient(135deg, #666 0%, #444 100%);
                    border: none;
                    border-radius: 8px;
                    color: #fff;
                    font-weight: bold;
                    cursor: pointer;
                    font-size: 14px;
                ">❌ Close</button>
            </div>
        `;
        
        // Add event listeners
        setTimeout(() => {
            document.getElementById('admin-apply')?.addEventListener('click', () => this.applySettings());
            document.getElementById('admin-reset')?.addEventListener('click', () => this.resetDefaults());
            document.getElementById('admin-close')?.addEventListener('click', () => this.hide());
        }, 0);
    }
    
    setupKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F2') {
                e.preventDefault();
                this.toggle();
            }
        });
    }
    
    show() {
        this.visible = true;
        this.overlay.style.display = 'flex';
        this.updatePanelContent();
    }
    
    hide() {
        this.visible = false;
        this.overlay.style.display = 'none';
    }
    
    toggle() {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    applySettings() {
        // Read values from inputs
        const tickSeconds = parseFloat(document.getElementById('admin-tickInterval')?.value) || 80;
        this.settings.tickInterval = tickSeconds * 1000;
        
        this.settings.cargoBoatSpawnInterval = parseInt(document.getElementById('admin-cargoSpawnInterval')?.value) || 60;
        this.settings.cargoBoatSpawnChance = (parseFloat(document.getElementById('admin-cargoSpawnChance')?.value) || 10) / 100;
        this.settings.cargoBoatSpeed = parseFloat(document.getElementById('admin-cargoSpeed')?.value) || 0.015;
        
        this.settings.peopleBoatSpawnInterval = parseInt(document.getElementById('admin-peopleSpawnInterval')?.value) || 18;
        this.settings.peopleBoatSpawnChance = (parseFloat(document.getElementById('admin-peopleSpawnChance')?.value) || 80) / 100;
        this.settings.peopleBoatSpeed = parseFloat(document.getElementById('admin-peopleBoatSpeed')?.value) || 1.0;
        this.settings.crowdSpeed = parseFloat(document.getElementById('admin-crowdSpeed')?.value) || 0.4;
        
        // Apply to game systems
        this.applyToGame();
        
        // Save to localStorage
        this.saveSettings();
        
        // Update panel display
        this.updatePanelContent();
        
        console.log('[ADMIN] Settings applied:', this.settings);
        
        // Show confirmation
        alert('✅ Settings applied!');
    }
    
    applyToGame() {
        const g = this.game;
        const s = this.settings;
        
        // Apply tick interval
        g.tickInterval = s.tickInterval;
        
        // Apply to animation system (cargo boats)
        if (g.animationSystem) {
            g.animationSystem.boatCheckInterval = s.cargoBoatSpawnInterval;
            g.animationSystem.boatSpawnChance = s.cargoBoatSpawnChance;
            g.animationSystem.boatSpeed = s.cargoBoatSpeed;
        }
        
        // Apply to immigration system (people boats)
        if (g.immigrationSystem) {
            g.immigrationSystem.spawnInterval = s.peopleBoatSpawnInterval;
            g.immigrationSystem.spawnChance = s.peopleBoatSpawnChance;
            g.immigrationSystem.boatSpeed = s.peopleBoatSpeed;
            g.immigrationSystem.crowdSpeed = s.crowdSpeed;
        }
    }
    
    resetDefaults() {
        this.settings = {
            tickInterval: 25000,  // 25 seconds per month = 5 min per year
            cargoBoatSpawnInterval: 60,
            cargoBoatSpawnChance: 0.1,
            cargoBoatSpeed: 0.015,
            peopleBoatSpawnInterval: 18,
            peopleBoatSpawnChance: 0.8,
            peopleBoatSpeed: 1.0,
            crowdSpeed: 0.4,
        };
        
        this.applyToGame();
        this.saveSettings();
        this.updatePanelContent();
        
        console.log('[ADMIN] Settings reset to defaults');
        alert('🔄 Settings reset to defaults!');
    }
    
    saveSettings() {
        try {
            localStorage.setItem('islandKingdomAdminSettings', JSON.stringify(this.settings));
        } catch (e) {
            console.warn('[ADMIN] Could not save settings:', e);
        }
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('islandKingdomAdminSettings');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.settings = { ...this.settings, ...parsed };
                this.applyToGame();
                console.log('[ADMIN] Settings loaded from localStorage:', this.settings);
            }
        } catch (e) {
            console.warn('[ADMIN] Could not load settings:', e);
        }
    }
}
