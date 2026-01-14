/**
 * DebugPanel - Toggleable diagnostic information display
 */
export class DebugPanel {
    constructor(game) {
        this.game = game;
        this.visible = false;
        this.panel = null;
        this.updateInterval = null;
        this.createPanel();
        this.setupKeyListener();
    }

    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'debug-panel';
        this.panel.innerHTML = `
            <div class="debug-header">
                <span>🔧 DEBUG INFO</span>
                <button id="debug-close">✕</button>
            </div>
            <div class="debug-content" id="debug-content">
                Loading...
            </div>
        `;
        this.panel.style.cssText = `
            position: fixed;
            top: 60px;
            right: 10px;
            width: 320px;
            max-height: 80vh;
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #00ff00;
            border-radius: 8px;
            font-family: monospace;
            font-size: 11px;
            color: #00ff00;
            z-index: 9999;
            display: none;
            overflow: hidden;
        `;
        document.body.appendChild(this.panel);

        // Style the header
        const header = this.panel.querySelector('.debug-header');
        header.style.cssText = `
            background: #003300;
            padding: 8px 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: bold;
            border-bottom: 1px solid #00ff00;
        `;

        // Style close button
        const closeBtn = this.panel.querySelector('#debug-close');
        closeBtn.style.cssText = `
            background: none;
            border: 1px solid #00ff00;
            color: #00ff00;
            cursor: pointer;
            padding: 2px 8px;
            border-radius: 4px;
        `;
        closeBtn.addEventListener('click', () => this.hide());

        // Style content
        const content = this.panel.querySelector('.debug-content');
        content.style.cssText = `
            padding: 12px;
            overflow-y: auto;
            max-height: calc(80vh - 50px);
        `;
    }

    setupKeyListener() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'd' || e.key === 'D') {
                // Don't trigger if typing in an input
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                this.toggle();
            }
        });
    }

    toggle() {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
    }

    show() {
        this.visible = true;
        this.panel.style.display = 'block';
        this.update();
        // Update every 500ms
        this.updateInterval = setInterval(() => this.update(), 500);
        console.log('🔧 Debug panel opened');
    }

    hide() {
        this.visible = false;
        this.panel.style.display = 'none';
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        console.log('🔧 Debug panel closed');
    }

    update() {
        if (!this.visible) return;

        const game = this.game;
        const content = this.panel.querySelector('#debug-content');
        
        // Gather debug info
        const info = this.gatherDebugInfo();
        
        content.innerHTML = info;
    }

    gatherDebugInfo() {
        const g = this.game;
        let html = '';

        // Game State
        html += `<div style="margin-bottom:10px;border-bottom:1px solid #006600;padding-bottom:8px;">`;
        html += `<b style="color:#ffff00;">📊 GAME STATE</b><br>`;
        html += `Running: ${g.running ? '✅ YES' : '❌ NO'}<br>`;
        html += `Paused: ${g.paused ? '⏸️ YES' : '▶️ NO'}<br>`;
        html += `Frame: ${g.frameCount || 0}<br>`;
        html += `Game Time: Year ${g.year}, Month ${g.month}<br>`;
        html += `Treasury: $${g.treasury}<br>`;
        html += `Population: ${g.population}<br>`;
        html += `Visitors: ${g.visitors || 0} (welfare: $${(g.visitors || 0) * 5}/mo)<br>`;
        html += `King Mood: ${g.kingMood}<br>`;
        html += `</div>`;

        // Map Info
        html += `<div style="margin-bottom:10px;border-bottom:1px solid #006600;padding-bottom:8px;">`;
        html += `<b style="color:#ffff00;">🗺️ MAP INFO</b><br>`;
        if (g.map) {
            html += `Size: ${g.map.width}x${g.map.height}<br>`;
            const buildingCount = this.countBuildings();
            html += `Buildings: ${JSON.stringify(buildingCount)}<br>`;
        } else {
            html += `Map: ❌ NOT LOADED<br>`;
        }
        html += `</div>`;

        // Tariff System
        html += `<div style="margin-bottom:10px;border-bottom:1px solid #006600;padding-bottom:8px;">`;
        html += `<b style="color:#ffff00;">🚢 TARIFF SYSTEM</b><br>`;
        if (g.tariffSystem) {
            const ts = g.tariffSystem;
            html += `Initialized: ✅ YES<br>`;
            html += `Boats Active: ${ts.boats ? ts.boats.length : 0}<br>`;
            html += `Spawn Timer: ${ts.boatSpawnTimer || 0}<br>`;
            html += `Spawn Rate: ${ts.calculateBoatSpawnRate ? ts.calculateBoatSpawnRate() : 'N/A'}<br>`;
            html += `Ports Found: ${ts.countPorts ? ts.countPorts() : 'N/A'}<br>`;
            html += `Avg Tariff: ${ts.getAverageTariff ? ts.getAverageTariff().toFixed(1) : 'N/A'}%<br>`;
            html += `Trade Relations: ${ts.tradeRelations || 0}<br>`;
            html += `Boats Processed: ${ts.stats?.boatsProcessed || 0}<br>`;
            html += `Boats Turned Away: ${ts.stats?.boatsTurnedAway || 0}<br>`;
        } else {
            html += `Initialized: ❌ NO<br>`;
        }
        html += `</div>`;

        // Development System
        html += `<div style="margin-bottom:10px;border-bottom:1px solid #006600;padding-bottom:8px;">`;
        html += `<b style="color:#ffff00;">🏗️ DEVELOPMENT</b><br>`;
        if (g.developmentManager) {
            const dm = g.developmentManager;
            html += `Initialized: ✅ YES<br>`;
            html += `Zones Tracked: ${dm.development ? dm.development.size : 0}<br>`;
            if (dm.development && dm.development.size > 0) {
                let levels = {0:0, 1:0, 2:0, 3:0, 4:0};
                dm.development.forEach(dev => {
                    levels[dev.level] = (levels[dev.level] || 0) + 1;
                });
                html += `By Level: ${JSON.stringify(levels)}<br>`;
            }
        } else {
            html += `Initialized: ❌ NO<br>`;
        }
        html += `</div>`;

        // Residential Allotments
        html += `<div style="margin-bottom:10px;border-bottom:1px solid #006600;padding-bottom:8px;">`;
        html += `<b style="color:#ffff00;">🏘️ RESIDENTIAL</b><br>`;
        if (g.residentialManager) {
            const rm = g.residentialManager;
            html += `Initialized: ✅ YES<br>`;
            html += `Allotments: ${rm.allotments ? rm.allotments.size : 0}<br>`;
            html += `Total Pop: ${rm.getTotalPopulation ? rm.getTotalPopulation() : 0}<br>`;
            if (rm.allotments && rm.allotments.size > 0) {
                let phases = {1:0, 2:0, 3:0, 4:0, 5:0};
                rm.allotments.forEach(a => {
                    phases[a.phase] = (phases[a.phase] || 0) + 1;
                });
                html += `By Phase: ${JSON.stringify(phases)}<br>`;
            }
        } else {
            html += `Initialized: ❌ NO<br>`;
        }
        html += `</div>`;

        // Canvas/Rendering
        html += `<div style="margin-bottom:10px;border-bottom:1px solid #006600;padding-bottom:8px;">`;
        html += `<b style="color:#ffff00;">🎨 RENDERING</b><br>`;
        if (g.canvas) {
            html += `Canvas: ✅ YES<br>`;
            html += `Tile Size: ${g.canvas.tileSize}<br>`;
            html += `Offset: (${g.canvas.offsetX?.toFixed(0)}, ${g.canvas.offsetY?.toFixed(0)})<br>`;
        } else {
            html += `Canvas: ❌ NO<br>`;
        }
        html += `</div>`;

        // Recent Events
        html += `<div style="margin-bottom:10px;">`;
        html += `<b style="color:#ffff00;">📝 CONSOLE</b><br>`;
        html += `<span style="color:#888;">Press D to toggle this panel</span><br>`;
        html += `</div>`;

        return html;
    }

    countBuildings() {
        const counts = {};
        const map = this.game.map;
        if (!map) return counts;

        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const tile = map.getTile(x, y);
                if (tile && tile.building) {
                    counts[tile.building] = (counts[tile.building] || 0) + 1;
                }
            }
        }
        return counts;
    }
}
