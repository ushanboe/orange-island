/**
 * StartMenu - Startup menu UI for New Game / Load Game with save slot selection
 */

export class StartMenu {
    constructor(game) {
        this.game = game;
        this.element = null;
        this.onNewGame = null;
        this.onLoadGame = null;  // Changed from onContinue
    }

    /**
     * Create and show the start menu
     */
    show(savedGames = []) {
        // Create menu container
        this.element = document.createElement('div');
        this.element.id = 'start-menu';
        
        const hasSaves = savedGames.length > 0;
        
        this.element.innerHTML = `
            <div class="start-menu-overlay">
                <div class="start-menu-content">
                    <h1 class="start-menu-title">🏝️ Island Kingdom</h1>
                    <p class="start-menu-subtitle">A Satirical City Builder</p>
                    <div class="start-menu-buttons">
                        <button id="btn-new-game" class="start-menu-btn start-menu-btn-new">
                            🆕 New Game
                        </button>
                        ${hasSaves ? `
                        <button id="btn-load-game" class="start-menu-btn start-menu-btn-load">
                            📂 Load Game
                        </button>
                        ` : ''}
                    </div>
                    <p class="start-menu-version">v84</p>
                </div>
                
                <!-- Save slot selection modal (hidden by default) -->
                <div id="save-slot-modal" class="save-slot-modal hidden">
                    <div class="save-slot-content">
                        <h2>📂 Select Save Slot</h2>
                        <div id="save-slot-list" class="save-slot-list">
                            <!-- Populated dynamically -->
                        </div>
                        <button id="btn-cancel-load" class="start-menu-btn start-menu-btn-cancel">
                            ❌ Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add styles
        this.addStyles();

        // Add to document
        document.body.appendChild(this.element);

        // Setup event listeners
        document.getElementById('btn-new-game').addEventListener('click', () => {
            this.hide();
            if (this.onNewGame) this.onNewGame();
        });

        if (hasSaves) {
            document.getElementById('btn-load-game').addEventListener('click', () => {
                this.showSaveSlotSelection(savedGames);
            });
            
            document.getElementById('btn-cancel-load').addEventListener('click', () => {
                this.hideSaveSlotSelection();
            });
        }
    }

    /**
     * Show the save slot selection modal
     */
    showSaveSlotSelection(savedGames) {
        const modal = document.getElementById('save-slot-modal');
        const list = document.getElementById('save-slot-list');
        
        // Populate save slots
        list.innerHTML = savedGames.map(save => {
            const date = new Date(save.timestamp);
            const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            return `
                <div class="save-slot-item" data-slot="${save.slot}">
                    <div class="save-slot-info">
                        <div class="save-slot-name">${save.name}</div>
                        <div class="save-slot-details">
                            👥 ${save.population.toLocaleString()} | 💰 $${save.treasury.toLocaleString()}
                        </div>
                        <div class="save-slot-date">Year ${save.year}, Month ${save.month} • ${dateStr}</div>
                    </div>
                    <div class="save-slot-actions">
                        <button class="save-slot-load" data-slot="${save.slot}">▶️ Load</button>
                        <button class="save-slot-delete" data-slot="${save.slot}">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add click handlers for load buttons
        list.querySelectorAll('.save-slot-load').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const slot = parseInt(e.target.dataset.slot);
                this.hide();
                if (this.onLoadGame) this.onLoadGame(slot);
            });
        });
        
        // Add click handlers for delete buttons
        list.querySelectorAll('.save-slot-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const slot = parseInt(e.target.dataset.slot);
                if (confirm(`Delete Save ${slot}?`)) {
                    this.game.saveSystem.deleteSave(slot);
                    // Refresh the list
                    const updatedSaves = this.game.saveSystem.getSavedGames();
                    if (updatedSaves.length === 0) {
                        this.hideSaveSlotSelection();
                        // Remove load button
                        const loadBtn = document.getElementById('btn-load-game');
                        if (loadBtn) loadBtn.remove();
                    } else {
                        this.showSaveSlotSelection(updatedSaves);
                    }
                }
            });
        });
        
        modal.classList.remove('hidden');
    }

    /**
     * Hide the save slot selection modal
     */
    hideSaveSlotSelection() {
        const modal = document.getElementById('save-slot-modal');
        if (modal) modal.classList.add('hidden');
    }

    /**
     * Hide and remove the start menu
     */
    hide() {
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }

    /**
     * Add CSS styles for the start menu
     */
    addStyles() {
        // Check if styles already exist
        if (document.getElementById('start-menu-styles')) return;

        const style = document.createElement('style');
        style.id = 'start-menu-styles';
        style.textContent = `
            .start-menu-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #01579b 100%);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }

            .start-menu-content {
                text-align: center;
                padding: 40px 60px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 20px;
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }

            .start-menu-title {
                font-size: 48px;
                color: #fff;
                margin: 0 0 10px 0;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
            }

            .start-menu-subtitle {
                font-size: 18px;
                color: rgba(255, 255, 255, 0.8);
                margin: 0 0 40px 0;
                font-style: italic;
            }

            .start-menu-buttons {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }

            .start-menu-btn {
                padding: 15px 40px;
                font-size: 20px;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.3s ease;
                font-weight: bold;
                min-width: 200px;
            }

            .start-menu-btn-new {
                background: linear-gradient(135deg, #4CAF50, #45a049);
                color: white;
                box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
            }

            .start-menu-btn-new:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(76, 175, 80, 0.6);
            }

            .start-menu-btn-load {
                background: linear-gradient(135deg, #2196F3, #1976D2);
                color: white;
                box-shadow: 0 4px 15px rgba(33, 150, 243, 0.4);
            }

            .start-menu-btn-load:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(33, 150, 243, 0.6);
            }
            
            .start-menu-btn-cancel {
                background: linear-gradient(135deg, #757575, #616161);
                color: white;
                box-shadow: 0 4px 15px rgba(117, 117, 117, 0.4);
                margin-top: 15px;
            }

            .start-menu-btn-cancel:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(117, 117, 117, 0.6);
            }

            .start-menu-btn:active {
                transform: translateY(0);
            }

            .start-menu-version {
                margin-top: 30px;
                color: rgba(255, 255, 255, 0.5);
                font-size: 14px;
            }
            
            /* Save slot modal styles */
            .save-slot-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10001;
            }
            
            .save-slot-modal.hidden {
                display: none;
            }
            
            .save-slot-content {
                background: rgba(30, 30, 50, 0.95);
                border-radius: 15px;
                padding: 30px;
                min-width: 400px;
                max-width: 500px;
                max-height: 80vh;
                overflow-y: auto;
                border: 1px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            }
            
            .save-slot-content h2 {
                color: #fff;
                margin: 0 0 20px 0;
                text-align: center;
            }
            
            .save-slot-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .save-slot-item {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                padding: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: background 0.2s;
            }
            
            .save-slot-item:hover {
                background: rgba(255, 255, 255, 0.15);
            }
            
            .save-slot-info {
                flex: 1;
            }
            
            .save-slot-name {
                color: #fff;
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 5px;
            }
            
            .save-slot-details {
                color: rgba(255, 255, 255, 0.8);
                font-size: 14px;
                margin-bottom: 3px;
            }
            
            .save-slot-date {
                color: rgba(255, 255, 255, 0.5);
                font-size: 12px;
            }
            
            .save-slot-actions {
                display: flex;
                gap: 8px;
            }
            
            .save-slot-load {
                background: #4CAF50;
                color: white;
                border: none;
                border-radius: 5px;
                padding: 8px 15px;
                cursor: pointer;
                font-size: 14px;
                transition: background 0.2s;
            }
            
            .save-slot-load:hover {
                background: #45a049;
            }
            
            .save-slot-delete {
                background: #f44336;
                color: white;
                border: none;
                border-radius: 5px;
                padding: 8px 10px;
                cursor: pointer;
                font-size: 14px;
                transition: background 0.2s;
            }
            
            .save-slot-delete:hover {
                background: #d32f2f;
            }

            @media (max-width: 600px) {
                .start-menu-content {
                    padding: 30px 40px;
                    margin: 20px;
                }

                .start-menu-title {
                    font-size: 32px;
                }

                .start-menu-btn {
                    padding: 12px 30px;
                    font-size: 18px;
                }
                
                .save-slot-content {
                    min-width: auto;
                    margin: 20px;
                    padding: 20px;
                }
                
                .save-slot-item {
                    flex-direction: column;
                    gap: 10px;
                }
                
                .save-slot-actions {
                    width: 100%;
                    justify-content: flex-end;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

window.StartMenu = StartMenu;
