// Toolbar UI Component
import { BUILDINGS, getBuildingsByCategory, BUILDING_CATEGORIES } from '../buildings/Buildings.js';

export class Toolbar {
    constructor(game) {
        this.game = game;
        this.element = null;
        this.categoryButtons = {};
        this.toolButtons = {};
        this.activeCategory = null;
        this.infoPanel = null;

        this.createToolbar();
        this.setupEventListeners();

    }

    createToolbar() {
        // Main toolbar container
        this.element = document.createElement('div');
        this.element.id = 'toolbar';
        this.element.innerHTML = `
            <div class="toolbar-categories">
                <button class="cat-btn" data-category="zones" title="Zones">🏘️</button>
                <button class="cat-btn" data-category="infrastructure" title="Infrastructure">🛤️</button>
                <button class="cat-btn" data-category="power" title="Power">⚡</button>
                <button class="cat-btn" data-category="energy" title="Oil & Energy">🛢️</button>
                <button class="cat-btn" data-category="special" title="Monuments">👑</button>
                <button class="cat-btn" data-category="services" title="Services">🏥</button>
                <button class="cat-btn" data-category="demolish" title="Demolish">🚜</button>
            </div>
            <div class="toolbar-tools" id="toolbar-tools"></div>
            <div class="toolbar-info" id="toolbar-info">
                <span class="info-name">Select a tool</span>
                <span class="info-cost"></span>
            </div>
        `;

        document.body.appendChild(this.element);

        // Add styles
        this.addStyles();

        // Store references
        this.toolsContainer = document.getElementById('toolbar-tools');
        this.infoPanel = document.getElementById('toolbar-info');
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #toolbar {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.85));
                padding: 8px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                z-index: 1000;
                border-top: 2px solid #FFD700;
                box-shadow: 0 -4px 20px rgba(0,0,0,0.5);
            }

            .toolbar-categories {
                display: flex;
                justify-content: center;
                gap: 8px;
                flex-wrap: wrap;
            }

            .cat-btn {
                width: 50px;
                height: 50px;
                border: 2px solid #555;
                border-radius: 10px;
                background: #333;
                font-size: 24px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .cat-btn:hover {
                background: #444;
                transform: scale(1.1);
            }

            .cat-btn.active {
                border-color: #FFD700;
                background: #554400;
                box-shadow: 0 0 10px rgba(255,215,0,0.5);
            }

            .toolbar-tools {
                display: flex;
                justify-content: center;
                gap: 6px;
                flex-wrap: wrap;
                min-height: 50px;
                padding: 4px;
            }

            .tool-btn {
                width: 60px;
                height: 60px;
                border: 2px solid #555;
                border-radius: 8px;
                background: #2a2a2a;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s;
                padding: 4px;
            }

            .tool-btn:hover {
                background: #3a3a3a;
                transform: scale(1.05);
            }

            .tool-btn.active {
                border-color: #4CAF50;
                background: #1a3a1a;
                box-shadow: 0 0 10px rgba(76,175,80,0.5);
            }

            .tool-btn.cannot-afford {
                opacity: 0.5;
                border-color: #F44336;
            }

            .tool-btn .icon {
                font-size: 24px;
            }

            .tool-btn .secondary-icon {
                font-size: 12px;
                position: absolute;
                bottom: 2px;
                right: 2px;
            }

            .tool-btn .cost {
                font-size: 10px;
                color: #FFD700;
                margin-top: 2px;
            }

            .toolbar-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 4px 12px;
                background: rgba(255,255,255,0.1);
                border-radius: 4px;
                font-size: 12px;
            }

            .info-name {
                color: #fff;
                font-weight: bold;
            }

            .info-cost {
                color: #FFD700;
            }

            .info-desc {
                color: #aaa;
                font-style: italic;
                font-size: 11px;
            }

            /* Mobile adjustments */
            @media (max-width: 600px) {
                .cat-btn {
                    width: 40px;
                    height: 40px;
                    font-size: 18px;
                }

                .tool-btn {
                    width: 52px;
                    height: 52px;
                }

                .tool-btn .icon {
                    font-size: 20px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    setupEventListeners() {
        // Category buttons
        this.element.querySelectorAll('.cat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.currentTarget.dataset.category;
                this.selectCategory(category);
            });
        });

        // Listen for tool selection events
        this.game.events.on('toolSelected', (data) => {
            this.updateInfo(data.building);
        });

        this.game.events.on('toolDeselected', () => {
            this.clearSelection();
        });

        // Update affordability when treasury changes
        this.game.events.on('treasuryChanged', () => {
            this.updateAffordability();
        });
    }

    selectCategory(category) {
        // Update active category button
        this.element.querySelectorAll('.cat-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });

        // Toggle category - if same category clicked, close it
        if (this.activeCategory === category) {
            this.activeCategory = null;
            this.toolsContainer.innerHTML = '';
            this.game.toolManager.selectTool(null);
            return;
        }

        this.activeCategory = category;
        this.showToolsForCategory(category);
    }

    showToolsForCategory(category) {
        this.toolsContainer.innerHTML = '';


        const buildings = getBuildingsByCategory(category);

        buildings.forEach(building => {
            const btn = document.createElement('button');
            btn.className = 'tool-btn';
            btn.dataset.tool = building.id;

            const canAfford = this.game.treasury >= building.cost;
            if (!canAfford) {
                btn.classList.add('cannot-afford');
            }

            // Show secondary icon if available (for power plants, oil buildings)
            const secondaryIcon = building.secondaryIcon ? 
                `<span class="secondary-icon">${building.secondaryIcon}</span>` : '';

            btn.innerHTML = `
                <span class="icon">${building.icon}</span>
                ${secondaryIcon}
                <span class="cost">$${building.cost}</span>
            `;

            btn.addEventListener('click', () => {
                this.selectTool(building.id);
            });

            // Touch feedback
            btn.addEventListener('touchstart', () => {
                btn.style.transform = 'scale(0.95)';
            });
            btn.addEventListener('touchend', () => {
                btn.style.transform = '';
            });

            this.toolButtons[building.id] = btn;
            this.toolsContainer.appendChild(btn);
        });
    }

    selectTool(toolId) {
        // Update button states
        Object.values(this.toolButtons).forEach(btn => {
            btn.classList.remove('active');
        });

        const selectedTool = this.game.toolManager.selectTool(toolId);

        if (selectedTool && this.toolButtons[toolId]) {
            this.toolButtons[toolId].classList.add('active');
        }
    }

    updateInfo(building) {
        if (!building) {
            this.infoPanel.innerHTML = `
                <span class="info-name">Select a tool</span>
                <span class="info-cost"></span>
            `;
            return;
        }

        this.infoPanel.innerHTML = `
            <span class="info-name">${building.icon} ${building.name}</span>
            <span class="info-desc">${building.description}</span>
            <span class="info-cost">$${building.cost}</span>
        `;
    }

    clearSelection() {
        Object.values(this.toolButtons).forEach(btn => {
            btn.classList.remove('active');
        });
        this.updateInfo(null);
    }

    updateAffordability() {
        Object.entries(this.toolButtons).forEach(([toolId, btn]) => {
            const building = BUILDINGS[toolId];
            if (building) {
                const canAfford = this.game.treasury >= building.cost;
                btn.classList.toggle('cannot-afford', !canAfford);
            }
        });
    }

    // Get toolbar height for canvas adjustment
    getHeight() {
        return this.element ? this.element.offsetHeight : 120;
    }
}
