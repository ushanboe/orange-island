/**
 * TariffUI - User interface for managing tariffs
 */
export class TariffUI {
    constructor(game) {
        this.game = game;
        this.visible = false;
        this.panel = null;
        this.createPanel();
    }

    createPanel() {
        // Create tariff panel
        this.panel = document.createElement('div');
        this.panel.id = 'tariff-panel';
        this.panel.className = 'game-panel tariff-panel';
        this.panel.innerHTML = `
            <div class="panel-header">
                <h2>🚢 TARIFF CONTROL CENTER</h2>
                <button class="close-btn" id="close-tariff">✕</button>
            </div>
            <div class="panel-content">
                <div class="global-tariff">
                    <label>🌍 GLOBAL TARIFF MODIFIER</label>
                    <div class="tariff-slider-row">
                        <input type="range" id="global-tariff-slider" min="-20" max="50" value="0">
                        <span id="global-tariff-value">0%</span>
                    </div>
                    <p class="tariff-hint">Applies to ALL imports on top of individual rates</p>
                </div>

                <div class="tariff-divider"></div>

                <h3>📦 Individual Tariff Rates</h3>
                <div id="tariff-list" class="tariff-list"></div>

                <div class="tariff-divider"></div>

                <div class="trade-stats">
                    <h3>📊 Trade Statistics</h3>
                    <div id="trade-stats-content"></div>
                </div>

                <div class="tariff-actions">
                    <button id="tariff-max-all" class="tariff-btn danger">🔥 MAX ALL TARIFFS</button>
                    <button id="tariff-zero-all" class="tariff-btn success">🕊️ FREE TRADE</button>
                </div>
            </div>
        `;
        this.panel.style.display = 'none';
        document.body.appendChild(this.panel);

        // Event listeners
        document.getElementById('close-tariff').addEventListener('click', () => this.hide());
        document.getElementById('global-tariff-slider').addEventListener('input', (e) => this.onGlobalTariffChange(e));
        document.getElementById('tariff-max-all').addEventListener('click', () => this.maxAllTariffs());
        document.getElementById('tariff-zero-all').addEventListener('click', () => this.zeroAllTariffs());

        // Build tariff list
        this.buildTariffList();
    }

    buildTariffList() {
        const container = document.getElementById('tariff-list');
        if (!container) return;

        const cargoTypes = [
            { type: 'goods', name: 'Consumer Goods', icon: '📦' },
            { type: 'materials', name: 'Building Materials', icon: '🧱' },
            { type: 'food', name: 'Food & Agriculture', icon: '🌾' },
            { type: 'luxury', name: 'Luxury Items', icon: '💎' },
            { type: 'tech', name: 'Technology', icon: '💻' },
            { type: 'oil', name: 'Oil & Energy', icon: '🛢️' },
            { type: 'steel', name: 'Steel & Metals', icon: '⚙️' },
            { type: 'cars', name: 'Automobiles', icon: '🚗' },
        ];

        container.innerHTML = cargoTypes.map(cargo => `
            <div class="tariff-item">
                <span class="cargo-icon">${cargo.icon}</span>
                <span class="cargo-name">${cargo.name}</span>
                <input type="range" 
                       class="tariff-slider" 
                       data-type="${cargo.type}" 
                       min="0" max="100" 
                       value="${this.game.tariffSystem?.tariffRates[cargo.type] || 10}">
                <span class="tariff-value" id="tariff-${cargo.type}-value">
                    ${this.game.tariffSystem?.tariffRates[cargo.type] || 10}%
                </span>
            </div>
        `).join('');

        // Add event listeners to sliders
        container.querySelectorAll('.tariff-slider').forEach(slider => {
            slider.addEventListener('input', (e) => this.onTariffChange(e));
        });
    }

    onTariffChange(e) {
        const type = e.target.dataset.type;
        const value = parseInt(e.target.value);

        if (this.game.tariffSystem) {
            this.game.tariffSystem.setTariffRate(type, value);
        }

        // Update display
        const valueSpan = document.getElementById(`tariff-${type}-value`);
        if (valueSpan) {
            valueSpan.textContent = `${value}%`;
            valueSpan.className = 'tariff-value ' + this.getTariffClass(value);
        }
    }

    onGlobalTariffChange(e) {
        const value = parseInt(e.target.value);

        if (this.game.tariffSystem) {
            this.game.tariffSystem.setGlobalTariff(value);
        }

        const valueSpan = document.getElementById('global-tariff-value');
        if (valueSpan) {
            valueSpan.textContent = `${value >= 0 ? '+' : ''}${value}%`;
            valueSpan.className = this.getTariffClass(value + 20); // Offset for display
        }
    }

    getTariffClass(value) {
        if (value <= 10) return 'tariff-low';
        if (value <= 25) return 'tariff-medium';
        if (value <= 50) return 'tariff-high';
        return 'tariff-extreme';
    }

    maxAllTariffs() {
        if (!this.game.tariffSystem) return;

        // Set all to maximum
        Object.keys(this.game.tariffSystem.tariffRates).forEach(type => {
            this.game.tariffSystem.setTariffRate(type, 100);
        });
        this.game.tariffSystem.setGlobalTariff(50);

        // Update UI
        this.updateAllSliders();

        // King reaction
        this.game.showKingTweet("MAXIMUM TARIFFS ON EVERYONE! They'll learn to respect us!");
    }

    zeroAllTariffs() {
        if (!this.game.tariffSystem) return;

        // Set all to zero
        Object.keys(this.game.tariffSystem.tariffRates).forEach(type => {
            this.game.tariffSystem.setTariffRate(type, 0);
        });
        this.game.tariffSystem.setGlobalTariff(0);

        // Update UI
        this.updateAllSliders();

        // King reaction
        this.game.showKingTweet("Free trade? BORING! But fine, let's try it...");
    }

    updateAllSliders() {
        if (!this.game.tariffSystem) return;

        // Update individual sliders
        document.querySelectorAll('.tariff-slider').forEach(slider => {
            const type = slider.dataset.type;
            const value = this.game.tariffSystem.tariffRates[type] || 0;
            slider.value = value;

            const valueSpan = document.getElementById(`tariff-${type}-value`);
            if (valueSpan) {
                valueSpan.textContent = `${value}%`;
                valueSpan.className = 'tariff-value ' + this.getTariffClass(value);
            }
        });

        // Update global slider
        const globalSlider = document.getElementById('global-tariff-slider');
        const globalValue = document.getElementById('global-tariff-value');
        if (globalSlider && globalValue) {
            const value = this.game.tariffSystem.globalTariffModifier;
            globalSlider.value = value;
            globalValue.textContent = `${value >= 0 ? '+' : ''}${value}%`;
        }
    }

    updateStats() {
        const container = document.getElementById('trade-stats-content');
        if (!container || !this.game.tariffSystem) return;

        const stats = this.game.tariffSystem.stats;
        const relations = this.game.tariffSystem.tradeRelations;
        const avgTariff = this.game.tariffSystem.getAverageTariff();

        container.innerHTML = `
            <div class="stat-row">
                <span>📈 Total Tariff Revenue:</span>
                <span class="stat-value">$${Math.floor(stats.totalTariffRevenue).toLocaleString()}</span>
            </div>
            <div class="stat-row">
                <span>🚢 Boats Processed:</span>
                <span class="stat-value">${stats.boatsProcessed}</span>
            </div>
            <div class="stat-row">
                <span>🚫 Boats Turned Away:</span>
                <span class="stat-value">${stats.boatsTurnedAway}</span>
            </div>
            <div class="stat-row">
                <span>🤝 Trade Relations:</span>
                <span class="stat-value ${relations < 50 ? 'text-danger' : relations < 75 ? 'text-warning' : 'text-success'}">
                    ${Math.floor(relations)}%
                </span>
            </div>
            <div class="stat-row">
                <span>📊 Average Tariff Rate:</span>
                <span class="stat-value">${Math.floor(avgTariff)}%</span>
            </div>
            <div class="stat-row">
                <span>💰 This Month Revenue:</span>
                <span class="stat-value">$${Math.floor(stats.monthlyRevenue).toLocaleString()}</span>
            </div>
        `;
    }

    show() {
        this.visible = true;
        this.panel.style.display = 'block';
        this.updateAllSliders();
        this.updateStats();
    }

    hide() {
        this.visible = false;
        this.panel.style.display = 'none';
    }

    toggle() {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
    }
}
