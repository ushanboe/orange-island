// Main entry point for Island Kingdom
import { Game } from './core/Game.js';
import { StartMenu } from './ui/StartMenu.js';
import { SaveSystem } from './systems/SaveSystem.js';

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🏝️ Island Kingdom - The Mad King');
    console.log('Loading...');

    // Create game instance (but don't initialize yet)
    const game = new Game();
    
    // Expose game globally for debugging
    window.game = game;
    
    // Create save system early to check for saved games
    const saveSystem = new SaveSystem(game);
    
    // Migrate old single-save format to new multi-slot format
    saveSystem.migrateOldSave();
    
    // Get list of saved games
    const savedGames = saveSystem.getSavedGames();
    
    // Create and show start menu
    const startMenu = new StartMenu(game);
    
    // Assign save system to game early so StartMenu can use it
    game.saveSystem = saveSystem;
    
    startMenu.onNewGame = async () => {
        console.log('Starting new game...');
        // Initialize and start the game
        await game.init();
        setupKeyboardShortcuts(game);
        console.log('✅ New game started!');
    };
    
    startMenu.onLoadGame = async (slot) => {
        console.log(`Loading saved game from slot ${slot}...`);
        // Initialize the game first (creates the map and systems)
        await game.init();
        // Then load the saved state on top
        game.saveSystem.loadGame(slot);
        game.kingTweet("Game LOADED! We're BACK! 🎮");
        setupKeyboardShortcuts(game);
        console.log('✅ Game loaded!');
    };
    
    // Show the start menu with list of saved games
    startMenu.show(savedGames);
});

// Setup keyboard shortcuts
function setupKeyboardShortcuts(game) {
    document.addEventListener('keydown', (e) => {
        // S - Save (with slot selection)
        if ((e.key === 's' || e.key === 'S') && e.ctrlKey) {
            e.preventDefault();
            showSaveDialog(game);
        }
        // L - Load (with slot selection)
        if ((e.key === 'l' || e.key === 'L') && e.ctrlKey) {
            e.preventDefault();
            showLoadDialog(game);
        }
        // P - Pause
        if (e.key === 'p') {
            game.paused = !game.paused;
            game.kingTweet(game.paused ? "PAUSED! Time to think! ⏸️" : "Let's GO! ▶️");
        }
        // Escape - Deselect tool or close dialogs
        if (e.key === 'Escape') {
            // Close any open save/load dialogs
            const dialog = document.getElementById('save-load-dialog');
            if (dialog) {
                dialog.remove();
                return;
            }
            if (game.toolManager) {
                game.toolManager.selectTool(null);
            }
        }
        // Number keys for quick tool selection
        if (e.key >= '1' && e.key <= '4') {
            const categories = ['zones', 'infrastructure', 'special', 'demolish'];
            const catIndex = parseInt(e.key) - 1;
            if (game.toolbar) {
                game.toolbar.selectCategory(categories[catIndex]);
            }
        }
    });

    console.log('Controls:');
    console.log('  - Click/Tap: Place building');
    console.log('  - Drag: Pan map (or place roads/walls)');
    console.log('  - Scroll/Pinch: Zoom');
    console.log('  - P: Pause');
    console.log('  - Ctrl+S: Save');
    console.log('  - Ctrl+L: Load');
    console.log('  - 1-4: Quick category select');
    console.log('  - Esc: Deselect tool');
}

// Show save dialog with slot selection
function showSaveDialog(game) {
    // Remove existing dialog if any
    const existing = document.getElementById('save-load-dialog');
    if (existing) existing.remove();
    
    const savedGames = game.saveSystem.getSavedGames();
    
    const dialog = document.createElement('div');
    dialog.id = 'save-load-dialog';
    dialog.innerHTML = `
        <div class="sld-overlay">
            <div class="sld-content">
                <h2>💾 Save Game</h2>
                <div class="sld-slots">
                    ${[1,2,3,4,5].map(slot => {
                        const save = savedGames.find(s => s.slot === slot);
                        if (save) {
                            const date = new Date(save.timestamp);
                            return `
                                <div class="sld-slot" data-slot="${slot}">
                                    <div class="sld-slot-info">
                                        <strong>${save.name}</strong>
                                        <span>👥 ${save.population} | 💰 $${save.treasury.toLocaleString()}</span>
                                        <small>Year ${save.year}, Month ${save.month}</small>
                                    </div>
                                    <button class="sld-save-btn" data-slot="${slot}">💾 Overwrite</button>
                                </div>
                            `;
                        } else {
                            return `
                                <div class="sld-slot sld-slot-empty" data-slot="${slot}">
                                    <div class="sld-slot-info">
                                        <strong>Empty Slot ${slot}</strong>
                                    </div>
                                    <button class="sld-save-btn" data-slot="${slot}">💾 Save Here</button>
                                </div>
                            `;
                        }
                    }).join('')}
                </div>
                <button class="sld-cancel">❌ Cancel</button>
            </div>
        </div>
    `;
    
    addDialogStyles();
    document.body.appendChild(dialog);
    
    // Event handlers
    dialog.querySelectorAll('.sld-save-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const slot = parseInt(btn.dataset.slot);
            const result = game.saveSystem.saveGame(slot, `Save ${slot}`);
            if (result.success) {
                game.kingTweet(`Game SAVED to slot ${slot}! The best save ever! 💾`);
            }
            dialog.remove();
        });
    });
    
    dialog.querySelector('.sld-cancel').addEventListener('click', () => {
        dialog.remove();
    });
    
    dialog.querySelector('.sld-overlay').addEventListener('click', (e) => {
        if (e.target.classList.contains('sld-overlay')) {
            dialog.remove();
        }
    });
}

// Show load dialog with slot selection
function showLoadDialog(game) {
    // Remove existing dialog if any
    const existing = document.getElementById('save-load-dialog');
    if (existing) existing.remove();
    
    const savedGames = game.saveSystem.getSavedGames();
    
    if (savedGames.length === 0) {
        game.kingTweet("No saves found! Nothing to load! 😢");
        return;
    }
    
    const dialog = document.createElement('div');
    dialog.id = 'save-load-dialog';
    dialog.innerHTML = `
        <div class="sld-overlay">
            <div class="sld-content">
                <h2>📂 Load Game</h2>
                <div class="sld-slots">
                    ${savedGames.map(save => {
                        const date = new Date(save.timestamp);
                        return `
                            <div class="sld-slot" data-slot="${save.slot}">
                                <div class="sld-slot-info">
                                    <strong>${save.name}</strong>
                                    <span>👥 ${save.population} | 💰 $${save.treasury.toLocaleString()}</span>
                                    <small>Year ${save.year}, Month ${save.month} • ${date.toLocaleDateString()}</small>
                                </div>
                                <div class="sld-slot-actions">
                                    <button class="sld-load-btn" data-slot="${save.slot}">▶️ Load</button>
                                    <button class="sld-delete-btn" data-slot="${save.slot}">🗑️</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <button class="sld-cancel">❌ Cancel</button>
            </div>
        </div>
    `;
    
    addDialogStyles();
    document.body.appendChild(dialog);
    
    // Event handlers
    dialog.querySelectorAll('.sld-load-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const slot = parseInt(btn.dataset.slot);
            if (game.saveSystem.loadGame(slot)) {
                game.kingTweet("Game LOADED! We're BACK! 🎮");
            }
            dialog.remove();
        });
    });
    
    dialog.querySelectorAll('.sld-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const slot = parseInt(btn.dataset.slot);
            if (confirm(`Delete Save ${slot}?`)) {
                game.saveSystem.deleteSave(slot);
                // Refresh dialog
                dialog.remove();
                showLoadDialog(game);
            }
        });
    });
    
    dialog.querySelector('.sld-cancel').addEventListener('click', () => {
        dialog.remove();
    });
    
    dialog.querySelector('.sld-overlay').addEventListener('click', (e) => {
        if (e.target.classList.contains('sld-overlay')) {
            dialog.remove();
        }
    });
}

// Add dialog styles (only once)
function addDialogStyles() {
    if (document.getElementById('sld-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'sld-styles';
    style.textContent = `
        .sld-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        .sld-content {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border: 2px solid #FFD700;
            border-radius: 15px;
            padding: 25px;
            min-width: 350px;
            max-width: 450px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        }
        
        .sld-content h2 {
            color: #FFD700;
            margin: 0 0 20px 0;
            text-align: center;
        }
        
        .sld-slots {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-bottom: 20px;
        }
        
        .sld-slot {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: background 0.2s;
        }
        
        .sld-slot:hover {
            background: rgba(255, 255, 255, 0.15);
        }
        
        .sld-slot-empty {
            opacity: 0.7;
        }
        
        .sld-slot-info {
            display: flex;
            flex-direction: column;
            gap: 3px;
        }
        
        .sld-slot-info strong {
            color: #fff;
            font-size: 16px;
        }
        
        .sld-slot-info span {
            color: rgba(255, 255, 255, 0.8);
            font-size: 13px;
        }
        
        .sld-slot-info small {
            color: rgba(255, 255, 255, 0.5);
            font-size: 11px;
        }
        
        .sld-slot-actions {
            display: flex;
            gap: 8px;
        }
        
        .sld-save-btn, .sld-load-btn {
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 5px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 13px;
            transition: background 0.2s;
        }
        
        .sld-save-btn:hover, .sld-load-btn:hover {
            background: #45a049;
        }
        
        .sld-delete-btn {
            background: #f44336;
            color: white;
            border: none;
            border-radius: 5px;
            padding: 8px 10px;
            cursor: pointer;
            font-size: 13px;
            transition: background 0.2s;
        }
        
        .sld-delete-btn:hover {
            background: #d32f2f;
        }
        
        .sld-cancel {
            width: 100%;
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 8px;
            padding: 10px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s;
        }
        
        .sld-cancel:hover {
            background: rgba(255, 255, 255, 0.2);
        }
    `;
    document.head.appendChild(style);
}
