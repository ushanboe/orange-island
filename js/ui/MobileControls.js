// MobileControls.js - Touch-friendly controls for mobile devices

export class MobileControls {
    constructor(game) {
        this.game = game;
        this.isVisible = false;
        this.menuOpen = false;
        
        // Detect mobile device
        this.isMobile = this.detectMobile();
        
        if (this.isMobile) {
            this.createMobileUI();
            this.show();
        }
    }
    
    detectMobile() {
        return (
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
            ('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            window.innerWidth <= 768
        );
    }
    
    createMobileUI() {
        // Create main container
        this.container = document.createElement('div');
        this.container.id = 'mobile-controls';
        this.container.innerHTML = `
            <style>
                #mobile-controls {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    z-index: 10000;
                    font-family: Arial, sans-serif;
                }
                
                #mobile-fab {
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border: none;
                    color: white;
                    font-size: 24px;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                
                #mobile-fab:active {
                    transform: scale(0.95);
                }
                
                #mobile-fab.open {
                    transform: rotate(45deg);
                    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                }
                
                #mobile-menu {
                    position: absolute;
                    bottom: 70px;
                    right: 0;
                    display: none;
                    flex-direction: column;
                    gap: 10px;
                    align-items: flex-end;
                }
                
                #mobile-menu.open {
                    display: flex;
                }
                
                .mobile-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 16px;
                    background: rgba(30, 30, 30, 0.95);
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 25px;
                    color: white;
                    font-size: 14px;
                    cursor: pointer;
                    white-space: nowrap;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    transition: background 0.2s, transform 0.1s;
                }
                
                .mobile-btn:active {
                    transform: scale(0.95);
                    background: rgba(60, 60, 60, 0.95);
                }
                
                .mobile-btn-icon {
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                }
                
                #mobile-cancel-btn {
                    position: fixed;
                    bottom: 20px;
                    left: 20px;
                    padding: 12px 24px;
                    background: linear-gradient(135deg, #f5576c 0%, #f093fb 100%);
                    border: none;
                    border-radius: 25px;
                    color: white;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    display: none;
                    z-index: 10000;
                    transition: transform 0.1s;
                }
                
                #mobile-cancel-btn:active {
                    transform: scale(0.95);
                }
                
                #mobile-cancel-btn.visible {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                /* Zoom controls */
                #mobile-zoom-controls {
                    position: fixed;
                    bottom: 90px;
                    right: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                    z-index: 9999;
                }
                
                .zoom-btn {
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    background: rgba(30, 30, 30, 0.9);
                    border: 1px solid rgba(255,255,255,0.2);
                    color: white;
                    font-size: 24px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .zoom-btn:active {
                    background: rgba(60, 60, 60, 0.9);
                }
                
                /* Navigation hint */
                #mobile-nav-hint {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0,0,0,0.8);
                    color: white;
                    padding: 15px 25px;
                    border-radius: 10px;
                    font-size: 14px;
                    text-align: center;
                    z-index: 10001;
                    display: none;
                    pointer-events: none;
                }
            </style>
            
            <!-- Cancel button (shown when tool selected) -->
            <button id="mobile-cancel-btn">
                <span>✕</span>
                <span>Cancel</span>
            </button>
            
            <!-- Zoom controls -->
            <div id="mobile-zoom-controls">
                <button class="zoom-btn" id="zoom-in-btn">+</button>
                <button class="zoom-btn" id="zoom-out-btn">−</button>
            </div>
            
            <!-- Main FAB menu -->
            <div id="mobile-menu">
                <button class="mobile-btn" data-action="debug">
                    <span class="mobile-btn-icon">🔧</span>
                    <span>Debug (D)</span>
                </button>
                <button class="mobile-btn" data-action="admin">
                    <span class="mobile-btn-icon">⚙️</span>
                    <span>Admin (F2)</span>
                </button>
                <button class="mobile-btn" data-action="music">
                    <span class="mobile-btn-icon">🎵</span>
                    <span>Music (M)</span>
                </button>
                <button class="mobile-btn" data-action="sound">
                    <span class="mobile-btn-icon">🔊</span>
                    <span>Sound</span>
                </button>
                <button class="mobile-btn" data-action="pause">
                    <span class="mobile-btn-icon">⏸️</span>
                    <span>Pause (P)</span>
                </button>
                <button class="mobile-btn" data-action="save">
                    <span class="mobile-btn-icon">💾</span>
                    <span>Save</span>
                </button>
                <button class="mobile-btn" data-action="load">
                    <span class="mobile-btn-icon">📂</span>
                    <span>Load</span>
                </button>
                <button class="mobile-btn" data-action="autoconnect" id="autoconnect-btn">
                    <span class="mobile-btn-icon">🔗</span>
                    <span>Auto-Connect: ON</span>
                </button>
            </div>
            
            <!-- FAB button -->
            <button id="mobile-fab">☰</button>
            
            <!-- Navigation hint -->
            <div id="mobile-nav-hint">
                📱 Tip: Use two fingers to pan and zoom
            </div>
        `;
        
        document.body.appendChild(this.container);
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // FAB toggle
        const fab = document.getElementById('mobile-fab');
        const menu = document.getElementById('mobile-menu');
        
        fab.addEventListener('click', (e) => {
            e.stopPropagation();
            this.menuOpen = !this.menuOpen;
            fab.classList.toggle('open', this.menuOpen);
            menu.classList.toggle('open', this.menuOpen);
            fab.textContent = this.menuOpen ? '+' : '☰';
        });
        
        // Menu buttons
        document.querySelectorAll('.mobile-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                this.handleAction(action);
                this.closeMenu();
            });
        });
        
        // Cancel button
        document.getElementById('mobile-cancel-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.cancelTool();
        });
        
        // Zoom buttons
        document.getElementById('zoom-in-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.zoom(1.2);
        });
        
        document.getElementById('zoom-out-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.zoom(0.8);
        });
        
        // Close menu when clicking elsewhere
        document.addEventListener('click', () => {
            if (this.menuOpen) {
                this.closeMenu();
            }
        });
    }
    
    closeMenu() {
        this.menuOpen = false;
        const fab = document.getElementById('mobile-fab');
        const menu = document.getElementById('mobile-menu');
        fab.classList.remove('open');
        menu.classList.remove('open');
        fab.textContent = '☰';
    }
    
    handleAction(action) {
        switch(action) {
            case 'debug':
                // Simulate D key
                if (this.game.debugPanel) {
                    this.game.debugPanel.toggle();
                }
                break;
                
            case 'admin':
                // Simulate F2 key
                if (this.game.adminSettings) {
                    this.game.adminSettings.toggle();
                }
                break;
                
            case 'music':
                // Toggle music
                if (this.game.soundSystem) {
                    this.game.soundSystem.toggleMusic();
                    this.showHint('Music ' + (this.game.soundSystem.musicEnabled ? 'ON' : 'OFF'));
                }
                break;
                
            case 'sound':
                // Toggle all sound
                if (this.game.soundSystem) {
                    this.game.soundSystem.toggleMute();
                    this.showHint('Sound ' + (this.game.soundSystem.muted ? 'OFF' : 'ON'));
                }
                break;
                
            case 'pause':
                // Toggle pause
                if (this.game.togglePause) {
                    this.game.togglePause();
                    this.showHint(this.game.paused ? 'Paused' : 'Resumed');
                }
                break;
                
            case 'save':
                // Save game
                if (this.game.saveGame) {
                    this.game.saveGame();
                    this.showHint('Game Saved!');
                }
                break;
                
            case 'load':
                // Load game
                if (this.game.loadGame) {
                    this.game.loadGame();
                    this.showHint('Game Loaded!');
                }
                break;

            case 'autoconnect':
                // Toggle auto-connect mode
                if (this.game.autoConnect) {
                    const enabled = this.game.autoConnect.toggle();
                    this.updateAutoConnectButton(enabled);
                    this.showHint('Auto-Connect: ' + (enabled ? 'ON' : 'OFF'));
                }
                break;
        }
    }
    
    cancelTool() {
        if (this.game.toolManager) {
            this.game.toolManager.selectTool(null);
        }
        if (this.game.toolbar) {
            this.game.toolbar.clearSelection();
        }
        this.updateCancelButton();
        this.showHint('Tool Cancelled');
    }
    
    zoom(factor) {
        if (this.game.gameCanvas) {
            const canvas = this.game.gameCanvas;
            const newZoom = Math.max(0.5, Math.min(3, canvas.zoom * factor));
            canvas.zoom = newZoom;
        }
    }
    
    showHint(message) {
        const hint = document.getElementById('mobile-nav-hint');
        if (hint) {
            hint.textContent = message;
            hint.style.display = 'block';
            setTimeout(() => {
                hint.style.display = 'none';
            }, 1500);
        }
    }
    
    updateCancelButton() {
        const cancelBtn = document.getElementById('mobile-cancel-btn');
        if (cancelBtn && this.game.toolManager) {
            const hasToolSelected = this.game.toolManager.selectedTool !== null;
            cancelBtn.classList.toggle('visible', hasToolSelected);
        }
    }
    
    update() {
        // Called each frame to update UI state
        this.updateCancelButton();
    }
    
    updateAutoConnectButton(enabled) {
        const btn = document.getElementById('autoconnect-btn');
        if (btn) {
            const label = btn.querySelector('span:last-child');
            if (label) {
                label.textContent = 'Auto-Connect: ' + (enabled ? 'ON' : 'OFF');
            }
            btn.style.background = enabled 
                ? 'rgba(76, 175, 80, 0.9)' 
                : 'rgba(30, 30, 30, 0.95)';
        }
    }

    show() {
        if (this.container) {
            this.container.style.display = 'block';
            this.isVisible = true;
        }
    }
    
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
            this.isVisible = false;
        }
    }
}
