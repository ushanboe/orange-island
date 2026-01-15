// AdminSettings.js - Admin panel for game settings (F2 to toggle)
export class AdminSettings {
    constructor(game) {
        this.game = game;
        this.panel = null;
        this.visible = false;
        this.createPanel();
        this.setupKeyboardShortcut();
        this.loadSettings();
    }

    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'admin-settings';
        this.panel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #ffd700;
            border-radius: 10px;
            padding: 20px;
            color: white;
            font-family: Arial, sans-serif;
            z-index: 10000;
            display: none;
            min-width: 300px;
        `;

        this.panel.innerHTML = `
            <h2 style="margin: 0 0 15px 0; color: #ffd700; text-align: center;">⚙️ Admin Settings</h2>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Game Speed (seconds per month):</label>
                <input type="number" id="admin-tick-interval" value="25" min="1" max="120" 
                    style="width: 100%; padding: 5px; border-radius: 4px; border: 1px solid #666;">
            </div>

            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Immigration Spawn Interval (ticks):</label>
                <input type="number" id="admin-spawn-interval" value="18" min="1" max="100"
                    style="width: 100%; padding: 5px; border-radius: 4px; border: 1px solid #666;">
            </div>

            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Immigration Spawn Chance (0-1):</label>
                <input type="number" id="admin-spawn-chance" value="0.8" min="0" max="1" step="0.1"
                    style="width: 100%; padding: 5px; border-radius: 4px; border: 1px solid #666;">
            </div>

            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Boat Speed:</label>
                <input type="number" id="admin-boat-speed" value="1.0" min="0.1" max="5" step="0.1"
                    style="width: 100%; padding: 5px; border-radius: 4px; border: 1px solid #666;">
            </div>

            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Crowd Speed:</label>
                <input type="number" id="admin-crowd-speed" value="0.4" min="0.1" max="2" step="0.1"
                    style="width: 100%; padding: 5px; border-radius: 4px; border: 1px solid #666;">
            </div>

            <div style="display: flex; gap: 10px;">
                <button id="admin-apply" style="flex: 1; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">Apply</button>
                <button id="admin-close" style="flex: 1; padding: 10px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer;">Close</button>
            </div>
            
            <p style="margin-top: 10px; font-size: 12px; color: #888; text-align: center;">Press F2 to toggle this panel</p>
        `;

        document.body.appendChild(this.panel);

        // Event listeners
        document.getElementById('admin-apply').addEventListener('click', () => this.applySettings());
        document.getElementById('admin-close').addEventListener('click', () => this.hide());
    }

    setupKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F2') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    toggle() {
        this.visible ? this.hide() : this.show();
    }

    show() {
        this.visible = true;
        this.panel.style.display = 'block';
        this.updateInputsFromGame();
    }

    hide() {
        this.visible = false;
        this.panel.style.display = 'none';
    }

    updateInputsFromGame() {
        document.getElementById('admin-tick-interval').value = this.game.tickInterval / 1000;
        if (this.game.immigrationSystem) {
            document.getElementById('admin-spawn-interval').value = this.game.immigrationSystem.spawnInterval;
            document.getElementById('admin-spawn-chance').value = this.game.immigrationSystem.spawnChance || 0.8;
            document.getElementById('admin-boat-speed').value = this.game.immigrationSystem.boatSpeed || 1.0;
            document.getElementById('admin-crowd-speed').value = this.game.immigrationSystem.crowdSpeed || 0.4;
        }
    }

    applySettings() {
        const tickInterval = parseFloat(document.getElementById('admin-tick-interval').value) * 1000;
        const spawnInterval = parseInt(document.getElementById('admin-spawn-interval').value);
        const spawnChance = parseFloat(document.getElementById('admin-spawn-chance').value);
        const boatSpeed = parseFloat(document.getElementById('admin-boat-speed').value);
        const crowdSpeed = parseFloat(document.getElementById('admin-crowd-speed').value);

        // Apply to game
        this.game.tickInterval = tickInterval;
        
        if (this.game.immigrationSystem) {
            this.game.immigrationSystem.spawnInterval = spawnInterval;
            this.game.immigrationSystem.spawnChance = spawnChance;
            this.game.immigrationSystem.boatSpeed = boatSpeed;
            this.game.immigrationSystem.crowdSpeed = crowdSpeed;
        }

        // Save to localStorage
        this.saveSettings();
        
        console.log('[AdminSettings] Applied:', { tickInterval, spawnInterval, spawnChance, boatSpeed, crowdSpeed });
        this.hide();
    }

    saveSettings() {
        const settings = {
            tickInterval: this.game.tickInterval,
            spawnInterval: parseInt(document.getElementById('admin-spawn-interval').value),
            spawnChance: parseFloat(document.getElementById('admin-spawn-chance').value),
            boatSpeed: parseFloat(document.getElementById('admin-boat-speed').value),
            crowdSpeed: parseFloat(document.getElementById('admin-crowd-speed').value)
        };
        localStorage.setItem('islandKingdomAdminSettings', JSON.stringify(settings));
    }

    loadSettings() {
        const saved = localStorage.getItem('islandKingdomAdminSettings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                this.game.tickInterval = settings.tickInterval || 25000;
                if (this.game.immigrationSystem) {
                    this.game.immigrationSystem.spawnInterval = settings.spawnInterval || 18;
                    this.game.immigrationSystem.spawnChance = settings.spawnChance || 0.8;
                    this.game.immigrationSystem.boatSpeed = settings.boatSpeed || 1.0;
                    this.game.immigrationSystem.crowdSpeed = settings.crowdSpeed || 0.4;
                }
                console.log('[AdminSettings] Loaded saved settings');
            } catch (e) {
                console.warn('[AdminSettings] Failed to load settings:', e);
            }
        }
    }
}
