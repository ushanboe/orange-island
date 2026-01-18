// GameCanvas - Handles rendering and input for the game
import { TERRAIN_COLORS } from '../map/TileMap.js';
import { ResidentialRenderer } from '../rendering/ResidentialRenderer.js';
import { CommercialRenderer } from '../rendering/CommercialRenderer.js';
import { IndustrialRenderer } from '../rendering/IndustrialRenderer.js';
import { BUILDINGS } from '../buildings/Buildings.js';
import { ServiceBuildingRenderer } from '../rendering/ServiceBuildingRenderer.js';
import { ZONE_VISUALS, DEV_LEVELS } from '../simulation/Development.js';


// Road auto-tiling helper - determines road connections
function getRoadConnections(tileMap, x, y) {
    const connections = {
        north: false,
        south: false,
        east: false,
        west: false
    };

    const checkRoad = (tx, ty) => {
        if (!tileMap.isInBounds(tx, ty)) return false;
        const tile = tileMap.getTile(tx, ty);
        return tile && tile.building && tile.building.type === 'road';
    };

    connections.north = checkRoad(x, y - 1);
    connections.south = checkRoad(x, y + 1);
    connections.east = checkRoad(x + 1, y);
    connections.west = checkRoad(x - 1, y);

    return connections;
}

// Get power line connections
function getPowerLineConnections(tileMap, x, y) {
    const connections = {
        north: false,
        south: false,
        east: false,
        west: false
    };

    const checkPower = (tx, ty) => {
        if (!tileMap.isInBounds(tx, ty)) return false;
        const tile = tileMap.getTile(tx, ty);
        if (!tile || !tile.building) return false;
        // Connect to power lines and power plants
        const type = tile.building.type;
        return type === 'powerLine' || type === 'coalPlant' || type === 'nuclearPlant';
    };

    connections.north = checkPower(x, y - 1);
    connections.south = checkPower(x, y + 1);
    connections.east = checkPower(x + 1, y);
    connections.west = checkPower(x - 1, y);

    return connections;
}

// Draw road with proper connections
function drawRoadTile(ctx, x, y, size, connections) {
    const roadColor = '#505050';
    const lineColor = '#FFD700';
    const edgeColor = '#303030';

    ctx.fillStyle = roadColor;
    ctx.fillRect(x, y, size, size);

    ctx.fillStyle = edgeColor;
    const edgeWidth = Math.max(1, size * 0.1);

    if (!connections.north) ctx.fillRect(x, y, size, edgeWidth);
    if (!connections.south) ctx.fillRect(x, y + size - edgeWidth, size, edgeWidth);
    if (!connections.west) ctx.fillRect(x, y, edgeWidth, size);
    if (!connections.east) ctx.fillRect(x + size - edgeWidth, y, edgeWidth, size);

    ctx.fillStyle = lineColor;
    const lineWidth = Math.max(1, size * 0.08);
    const centerX = x + size / 2 - lineWidth / 2;
    const centerY = y + size / 2 - lineWidth / 2;

    const connCount = [connections.north, connections.south,
                       connections.east, connections.west].filter(c => c).length;

    if (connCount === 0) {
        ctx.fillRect(centerX, centerY, lineWidth, lineWidth);
    } else if (connCount === 1) {
        if (connections.north) ctx.fillRect(centerX, y, lineWidth, size/2);
        else if (connections.south) ctx.fillRect(centerX, centerY, lineWidth, size/2 + lineWidth/2);
        else if (connections.east) ctx.fillRect(centerX, centerY, size/2 + lineWidth/2, lineWidth);
        else if (connections.west) ctx.fillRect(x, centerY, size/2, lineWidth);
    } else if (connCount === 2) {
        if (connections.north && connections.south) {
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(centerX, y + size * 0.1 + i * size * 0.3, lineWidth, size * 0.15);
            }
        } else if (connections.east && connections.west) {
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(x + size * 0.1 + i * size * 0.3, centerY, size * 0.15, lineWidth);
            }
        } else {
            if (connections.north) ctx.fillRect(centerX, y, lineWidth, size/2 + lineWidth/2);
            if (connections.south) ctx.fillRect(centerX, centerY, lineWidth, size/2 + lineWidth/2);
            if (connections.east) ctx.fillRect(centerX, centerY, size/2 + lineWidth/2, lineWidth);
            if (connections.west) ctx.fillRect(x, centerY, size/2 + lineWidth/2, lineWidth);
        }
    } else {
        if (connections.north || connections.south) {
            ctx.fillRect(centerX, y, lineWidth, size);
        }
        if (connections.east || connections.west) {
            ctx.fillRect(x, centerY, size, lineWidth);
        }
    }
}

export class GameCanvas {
    constructor(game) {
        this.game = game;
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Initialize residential renderer
        this.residentialRenderer = new ResidentialRenderer(this.canvas, this.ctx);
        this.commercialRenderer = new CommercialRenderer(this.canvas, this.ctx);
        this.industrialRenderer = new IndustrialRenderer(this.canvas, this.ctx);
        this.serviceBuildingRenderer = new ServiceBuildingRenderer(this.canvas, this.ctx);

        this.tileSize = 32;
        this.minTileSize = 8;
        this.maxTileSize = 50;
        this.offsetX = 0;
        this.offsetY = 0;

        this.isDragging = false;
        this.isPanning = false;
        this.lastPointerX = 0;
        this.lastPointerY = 0;
        this.pointerStartX = 0;
        this.pointerStartY = 0;

        this.touches = {};
        this.lastPinchDist = 0;

        this.hoverTileX = -1;
        this.hoverTileY = -1;

        // Animation time
        this.animTime = 0;

        // Vehicles on roads
        this.vehicles = [];
        this.maxVehicles = 30;

        // Smoke particles
        this.smokeParticles = [];

        this.resize();
        this.setupEventListeners();
        this.centerMap();
    }

    resize() {
        const header = document.getElementById('game-header');
        const headerHeight = header ? header.offsetHeight : 50;
        const toolbar = document.getElementById('toolbar');
        const toolbarHeight = toolbar ? toolbar.offsetHeight : 0;

        this.canvas.width = window.innerWidth;
        this.canvas.height = Math.max(100, window.innerHeight - headerHeight - toolbarHeight);
        this.canvas.style.top = headerHeight + 'px';
    }

    centerMap() {
        if (!this.game.tileMap) return;
        const mapWidth = this.game.tileMap.width * this.tileSize;
        const mapHeight = this.game.tileMap.height * this.tileSize;
        this.offsetX = (this.canvas.width - mapWidth) / 2;
        this.offsetY = (this.canvas.height - mapHeight) / 2;
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.resize());

        this.canvas.addEventListener('mousedown', (e) => this.onPointerDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onPointerMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onPointerUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.onPointerUp(e));
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));

        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));
        this.canvas.addEventListener('touchcancel', (e) => this.onTouchEnd(e));

        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    screenToTile(screenX, screenY) {
        const tileX = Math.floor((screenX - this.offsetX) / this.tileSize);
        const tileY = Math.floor((screenY - this.offsetY) / this.tileSize);
        return { tileX, tileY };
    }

    tileToScreen(tileX, tileY) {
        return {
            x: tileX * this.tileSize + this.offsetX,
            y: tileY * this.tileSize + this.offsetY
        };
    }

    onPointerDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.pointerStartX = x;
        this.pointerStartY = y;
        this.lastPointerX = x;
        this.lastPointerY = y;

        const { tileX, tileY } = this.screenToTile(x, y);
        
        // console.log('[GameCanvas] onPointerDown:', { 
//             tileX, tileY, 
//             hasToolManager: !!this.game.toolManager,
//             selectedTool: this.game.toolManager?.selectedTool 
//         });

        if (this.game.toolManager && this.game.toolManager.selectedTool) {
            this.isDragging = true;
            // console.log('[GameCanvas] Calling toolManager.onPointerDown');
            this.game.toolManager.onPointerDown(tileX, tileY);
        } else {
            this.isPanning = true;
        }
    }

    onPointerMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const { tileX, tileY } = this.screenToTile(x, y);
        this.hoverTileX = tileX;
        this.hoverTileY = tileY;

        if (this.isPanning) {
            const dx = x - this.lastPointerX;
            const dy = y - this.lastPointerY;
            this.offsetX += dx;
            this.offsetY += dy;
        } else if (this.isDragging && this.game.toolManager) {
            this.game.toolManager.onPointerMove(tileX, tileY);
        }

        this.lastPointerX = x;
        this.lastPointerY = y;
    }

    onPointerUp(e) {
        if (this.game.toolManager) {
            this.game.toolManager.onPointerUp();
        }
        this.isDragging = false;
        this.isPanning = false;
    }

    onWheel(e) {
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newTileSize = Math.max(this.minTileSize,
            Math.min(this.maxTileSize, this.tileSize * zoomFactor));

        if (newTileSize !== this.tileSize) {
            const scale = newTileSize / this.tileSize;
            this.offsetX = mouseX - (mouseX - this.offsetX) * scale;
            this.offsetY = mouseY - (mouseY - this.offsetY) * scale;
            this.tileSize = newTileSize;
        }
    }

    onTouchStart(e) {
        e.preventDefault();

        for (const touch of e.changedTouches) {
            this.touches[touch.identifier] = {
                x: touch.clientX,
                y: touch.clientY
            };
        }

        const touchCount = Object.keys(this.touches).length;

        if (touchCount === 1) {
            const touch = e.changedTouches[0];
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            this.pointerStartX = x;
            this.pointerStartY = y;
            this.lastPointerX = x;
            this.lastPointerY = y;

            const { tileX, tileY } = this.screenToTile(x, y);

            if (this.game.toolManager && this.game.toolManager.selectedTool) {
                this.isDragging = true;
                this.game.toolManager.onPointerDown(tileX, tileY);
            } else {
                this.isPanning = true;
            }
        } else if (touchCount === 2) {
            this.isDragging = false;
            this.isPanning = false;
            const touchList = Object.values(this.touches);
            this.lastPinchDist = this.getPinchDistance(touchList[0], touchList[1]);
        }
    }

    onTouchMove(e) {
        e.preventDefault();

        for (const touch of e.changedTouches) {
            if (this.touches[touch.identifier]) {
                this.touches[touch.identifier].x = touch.clientX;
                this.touches[touch.identifier].y = touch.clientY;
            }
        }

        const touchCount = Object.keys(this.touches).length;

        if (touchCount === 1) {
            const touch = e.changedTouches[0];
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            const { tileX, tileY } = this.screenToTile(x, y);
            this.hoverTileX = tileX;
            this.hoverTileY = tileY;

            if (this.isPanning) {
                const dx = x - this.lastPointerX;
                const dy = y - this.lastPointerY;
                this.offsetX += dx;
                this.offsetY += dy;
            } else if (this.isDragging && this.game.toolManager) {
                this.game.toolManager.onPointerMove(tileX, tileY);
            }

            this.lastPointerX = x;
            this.lastPointerY = y;
        } else if (touchCount === 2) {
            const touchList = Object.values(this.touches);
            const pinchDist = this.getPinchDistance(touchList[0], touchList[1]);

            if (this.lastPinchDist > 0) {
                const scale = pinchDist / this.lastPinchDist;
                const centerX = (touchList[0].x + touchList[1].x) / 2;
                const centerY = (touchList[0].y + touchList[1].y) / 2;

                const rect = this.canvas.getBoundingClientRect();
                const cx = centerX - rect.left;
                const cy = centerY - rect.top;

                const newTileSize = Math.max(this.minTileSize,
                    Math.min(this.maxTileSize, this.tileSize * scale));

                if (newTileSize !== this.tileSize) {
                    const s = newTileSize / this.tileSize;
                    this.offsetX = cx - (cx - this.offsetX) * s;
                    this.offsetY = cy - (cy - this.offsetY) * s;
                    this.tileSize = newTileSize;
                }
            }

            this.lastPinchDist = pinchDist;
        }
    }

    onTouchEnd(e) {
        for (const touch of e.changedTouches) {
            delete this.touches[touch.identifier];
        }

        if (Object.keys(this.touches).length === 0) {
            if (this.game.toolManager) this.game.toolManager.onPointerUp();
            this.isDragging = false;
            this.isPanning = false;
            this.lastPinchDist = 0;
        }
    }

    getPinchDistance(t1, t2) {
        const dx = t1.x - t2.x;
        const dy = t1.y - t2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // ==================== ANIMATION UPDATE ====================

    updateAnimations() {
        this.animTime += 16; // ~60fps

        // Update vehicles
        this.updateVehicles();

        // Update smoke
        this.updateSmoke();

        // Update police officers
        if (this.game.policeSystem) {
            this.game.policeSystem.animate();
        }
    }

    // ==================== VEHICLE SYSTEM ====================

    updateVehicles() {
        const pop = this.game.population || 0;
        const desiredVehicles = Math.min(this.maxVehicles, Math.floor(pop / 15) + 1);

        // Spawn vehicles
        if (this.vehicles.length < desiredVehicles && Math.random() < 0.03) {
            this.spawnVehicle();
        }

        // Update existing vehicles
        for (let i = this.vehicles.length - 1; i >= 0; i--) {
            const v = this.vehicles[i];
            v.lifetime++;

            if (v.lifetime > v.maxLifetime) {
                this.vehicles.splice(i, 1);
                continue;
            }

            // Move vehicle
            const dx = [0, 1, 0, -1][v.direction];
            const dy = [-1, 0, 1, 0][v.direction];

            v.x += dx * v.speed;
            v.y += dy * v.speed;

            // At tile center, choose next direction
            const tileX = Math.floor(v.x);
            const tileY = Math.floor(v.y);
            const centerX = tileX + 0.5;
            const centerY = tileY + 0.5;

            if (Math.abs(v.x - centerX) < 0.05 && Math.abs(v.y - centerY) < 0.05) {
                v.x = centerX;
                v.y = centerY;
                this.chooseNextDirection(v, tileX, tileY);
            }

            // Remove if off map
            const map = this.game.tileMap;
            if (map && (v.x < 0 || v.x >= map.width || v.y < 0 || v.y >= map.height)) {
                this.vehicles.splice(i, 1);
            }
        }
    }

    spawnVehicle() {
        const roads = this.findRoads();
        if (roads.length === 0) return;

        const startRoad = roads[Math.floor(Math.random() * roads.length)];

        const types = ['🚗', '🚙', '🚕'];
        if (this.game.population > 50) types.push('🚌');
        if (this.game.tileMap?.countBuildings?.('industrial') > 0) types.push('🚚');

        this.vehicles.push({
            x: startRoad.x + 0.5,
            y: startRoad.y + 0.5,
            icon: types[Math.floor(Math.random() * types.length)],
            direction: Math.floor(Math.random() * 4),
            speed: 0.03 + Math.random() * 0.02,
            lifetime: 0,
            maxLifetime: 400 + Math.random() * 400
        });
    }

    findRoads() {
        const roads = [];
        const map = this.game.tileMap;
        if (!map) return roads;

        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const tile = map.getTile(x, y);
                if (tile?.building?.type === 'road') {
                    roads.push({x, y});
                }
            }
        }
        return roads;
    }

    chooseNextDirection(vehicle, tileX, tileY) {
        const map = this.game.tileMap;
        if (!map) return;

        const connections = [];
        const dirs = [
            {dir: 0, dx: 0, dy: -1},
            {dir: 1, dx: 1, dy: 0},
            {dir: 2, dx: 0, dy: 1},
            {dir: 3, dx: -1, dy: 0}
        ];

        for (const d of dirs) {
            const nx = tileX + d.dx;
            const ny = tileY + d.dy;
            if (map.isInBounds(nx, ny)) {
                const tile = map.getTile(nx, ny);
                if (tile?.building?.type === 'road') {
                    connections.push(d.dir);
                }
            }
        }

        if (connections.length === 0) {
            vehicle.direction = (vehicle.direction + 2) % 4;
        } else {
            const opposite = (vehicle.direction + 2) % 4;
            const options = connections.filter(d => d !== opposite);
            if (options.length > 0) {
                vehicle.direction = options[Math.floor(Math.random() * options.length)];
            } else {
                vehicle.direction = connections[Math.floor(Math.random() * connections.length)];
            }
        }
    }

    // ==================== SMOKE SYSTEM ====================

    updateSmoke() {
        // Spawn smoke from coal plants and refineries
        if (Math.random() < 0.15) {
            const map = this.game.tileMap;
            if (!map) return;

            for (let y = 0; y < map.height; y++) {
                for (let x = 0; x < map.width; x++) {
                    const tile = map.getTile(x, y);
                    if (tile?.building?.type === 'coalPlant' && tile.building.mainTile !== false) {
                        if (Math.random() < 0.4) this.spawnSmoke(x, y);
                    }
                    if (tile?.building?.type === 'oilRefinery' && tile.building.mainTile !== false) {
                        if (Math.random() < 0.3) this.spawnSmoke(x, y);
                    }
                }
            }
        }

        // Update smoke particles
        for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
            const p = this.smokeParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.size += 0.008;
            p.opacity -= 0.012;
            p.life++;

            if (p.life > p.maxLife || p.opacity <= 0) {
                this.smokeParticles.splice(i, 1);
            }
        }

        // Limit particles
        if (this.smokeParticles.length > 100) {
            this.smokeParticles.splice(0, this.smokeParticles.length - 100);
        }
    }

    spawnSmoke(x, y) {
        this.smokeParticles.push({
            x: x + 0.3 + Math.random() * 0.4,
            y: y + 0.2,
            size: 0.15 + Math.random() * 0.1,
            opacity: 0.5 + Math.random() * 0.3,
            vx: (Math.random() - 0.5) * 0.015,
            vy: -0.025 - Math.random() * 0.015,
            life: 0,
            maxLife: 50 + Math.random() * 30
        });
    }

    // ==================== MAIN RENDER ====================

    render() {
        // Update animations
        this.updateAnimations();

        const ctx = this.ctx;
        const tileMap = this.game.tileMap;

        if (!tileMap) return;

        // Clear canvas
        ctx.fillStyle = '#1a5276';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Calculate visible tile range
        const startTileX = Math.max(0, Math.floor(-this.offsetX / this.tileSize));
        const startTileY = Math.max(0, Math.floor(-this.offsetY / this.tileSize));
        const endTileX = Math.min(tileMap.width,
            Math.ceil((this.canvas.width - this.offsetX) / this.tileSize));
        const endTileY = Math.min(tileMap.height,
            Math.ceil((this.canvas.height - this.offsetY) / this.tileSize));

        // Reset debug counter each frame
        this._resLogCount = 0;
        
        // Draw terrain and buildings
        for (let y = startTileY; y < endTileY; y++) {
            for (let x = startTileX; x < endTileX; x++) {
                const tile = tileMap.getTile(x, y);
                if (!tile) continue;

                const screenX = x * this.tileSize + this.offsetX;
                const screenY = y * this.tileSize + this.offsetY;


                // Skip terrain for non-main tiles of multi-tile buildings (service buildings and port) (they're drawn by main tile)
                const serviceTypes = ['policeStation', 'fireStation', 'hospital', 'school', 'port'];
                if (tile.building && serviceTypes.includes(tile.building.type) && tile.building.mainTile === false) {
                    continue; // Skip this tile entirely, main tile renders the full 3x3
                }

                // Draw terrain
                ctx.fillStyle = TERRAIN_COLORS[tile.terrain] || '#000';
                ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);

                // Draw building if present
                if (tile.building) {
                    // Debug: ALWAYS log residential allotment buildings (first 5 per frame)
                    if (tile.building.type === 'residential_allotment') {
                        if (!this._resLogCount) this._resLogCount = 0;
                        if (this._resLogCount < 5) {
                            // console.log(`[RENDER] Found residential_allotment at (${x},${y}), calling drawBuilding...`);
                            this._resLogCount++;
                        }
                    }
                    try {
                        this.drawBuilding(ctx, tile.building, screenX, screenY, x, y);
                    } catch (e) {
                        console.error(`[RENDER] Error in drawBuilding at (${x},${y}):`, e);
                    }
                }
            }
        }

        // Draw vehicles on roads
        this.renderVehicles(ctx);

        // Draw police officers
        this.renderPoliceOfficers(ctx);

        // Draw boats on water
        this.renderBoats(ctx);

        // Draw smoke particles
        this.renderSmoke(ctx);

        // Draw grid lines if zoomed in enough
        if (this.tileSize >= 15) {
            ctx.strokeStyle = 'rgba(0,0,0,0.15)';
            ctx.lineWidth = 1;

            for (let y = startTileY; y <= endTileY; y++) {
                const screenY = y * this.tileSize + this.offsetY;
                ctx.beginPath();
                ctx.moveTo(startTileX * this.tileSize + this.offsetX, screenY);
                ctx.lineTo(endTileX * this.tileSize + this.offsetX, screenY);
                ctx.stroke();
            }

            for (let x = startTileX; x <= endTileX; x++) {
                const screenX = x * this.tileSize + this.offsetX;
                ctx.beginPath();
                ctx.moveTo(screenX, startTileY * this.tileSize + this.offsetY);
                ctx.lineTo(screenX, endTileY * this.tileSize + this.offsetY);
                ctx.stroke();
            }
        }

        // Draw placement preview
        this.drawPlacementPreview(ctx);
    }

    // ==================== RENDER VEHICLES ====================

    renderVehicles(ctx) {
        const fontSize = Math.max(8, this.tileSize * 0.5);
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (const v of this.vehicles) {
            const screenX = v.x * this.tileSize + this.offsetX;
            const screenY = v.y * this.tileSize + this.offsetY;
            ctx.fillText(v.icon, screenX, screenY);
        }
    }

    renderPoliceOfficers(ctx) {
        if (!this.game.policeSystem) return;

        // Delegate rendering to PoliceSystem which handles both:
        // - Wall-building officers (PoliceOfficer class with render())
        // - Patrol officers (plain objects rendered as 👮 emoji)
        this.game.policeSystem.render(ctx, this.offsetX, this.offsetY, this.tileSize);

        // Render airport system (planes and tourist crowds)
        if (this.game.airportSystem) {
            this.game.airportSystem.render(ctx, this.offsetX, this.offsetY, this.tileSize);
        }
    }

    // ==================== RENDER BOATS ====================

    renderBoats(ctx) {
        // Get boats from AnimationSystem
        const animSystem = this.game.animationSystem;
        if (!animSystem || !animSystem.boats) return;

        const fontSize = Math.max(12, this.tileSize * 0.7);
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (const boat of animSystem.boats) {
            const screenX = boat.x * this.tileSize + this.offsetX;
            const screenY = boat.y * this.tileSize + this.offsetY;
            
            // Draw boat shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.beginPath();
            ctx.ellipse(screenX + 2, screenY + 2, this.tileSize * 0.3, this.tileSize * 0.15, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw boat icon
            ctx.fillText(boat.icon, screenX, screenY);
            
            // Draw docked indicator
            if (boat.state === 'docked') {
                ctx.font = `${fontSize * 0.5}px Arial`;
                ctx.fillText('📦', screenX + this.tileSize * 0.3, screenY - this.tileSize * 0.2);
                ctx.font = `${fontSize}px Arial`;
            }
        }
    }

    // ==================== RENDER SMOKE ====================

    renderSmoke(ctx) {
        for (const p of this.smokeParticles) {
            const screenX = p.x * this.tileSize + this.offsetX;
            const screenY = p.y * this.tileSize + this.offsetY;
            const size = p.size * this.tileSize;

            ctx.beginPath();
            ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(80, 80, 80, ${p.opacity})`;
            ctx.fill();
        }
    }

    // ==================== DRAW BUILDING ====================

    drawBuilding(ctx, building, screenX, screenY, tileX, tileY) {
        // Debug: log all building draws for residential
        // Special handling for allotments (3x3 zones)
        if (building.type === 'residential_allotment') {
            this.drawResidentialAllotment(ctx, building, screenX, screenY, tileX, tileY);
            return;
        }
        if (building.type === 'commercial_allotment') {
            this.drawCommercialAllotment(ctx, building, screenX, screenY, tileX, tileY);
            return;
        }
        if (building.type === 'industrial_allotment') {
            this.drawIndustrialAllotment(ctx, building, screenX, screenY, tileX, tileY);
            return;
        }

        // Special handling for service buildings (3x3)
        const serviceBuildings = ['policeStation', 'fireStation', 'hospital', 'school'];
        if (serviceBuildings.includes(building.type)) {
            // Only render from main tile
            if (building.mainTile !== false) {
                // Check if building has power and road access (active status)
                let isActive = false;
                if (this.game && this.game.infrastructureManager) {
                    const hasRoad = this.game.infrastructureManager.hasRoadAccess(tileX, tileY);
                    const hasPower = this.game.infrastructureManager.hasPower(tileX, tileY);
                    isActive = hasRoad && hasPower;
                }
                this.serviceBuildingRenderer.renderBuilding(
                    tileX, tileY, this.tileSize, building.type,
                    this.offsetX, this.offsetY, true, isActive
                );
            }
            // Non-main tiles don't draw anything (renderer handles full 3x3)
            return;
        }

        // Special handling for port (2x2) with LED indicator
        if (building.type === 'port') {
            // Only render from main tile
            if (building.mainTile !== false) {
                this.drawPort(ctx, screenX, screenY, this.tileSize, tileX, tileY);
            }
            return;
        }


        // Special handling for airport (4x4) with status indicator
        if (building.type === 'airport') {
            // Only render from main tile
            if (building.mainTile !== false) {
                this.drawAirport(ctx, screenX, screenY, this.tileSize, tileX, tileY);
            }
            return;
        }


        const buildingDef = BUILDINGS[building.type];
        if (!buildingDef) return;

        // Only draw on main tile for multi-tile buildings
        if (building.mainTile === false) {
            ctx.fillStyle = buildingDef.color;
            ctx.fillRect(screenX + 1, screenY + 1, this.tileSize - 2, this.tileSize - 2);
            return;
        }

        // Special rendering for roads
        if (building.type === 'road') {
            const connections = getRoadConnections(this.game.tileMap, tileX, tileY);
            drawRoadTile(ctx, screenX, screenY, this.tileSize, connections);
            return;
        }

        // Special rendering for power lines
        if (building.type === 'powerLine') {
            const connections = getPowerLineConnections(this.game.tileMap, tileX, tileY);
            this.drawPowerLine(ctx, screenX, screenY, this.tileSize, connections);
            return;
        }

        // Special animated buildings
        if (building.type === 'nuclearPlant') {
            this.drawNuclearPlant(ctx, screenX, screenY, this.tileSize, buildingDef);
            return;
        }

        if (building.type === 'coalPlant') {
            this.drawCoalPlant(ctx, screenX, screenY, this.tileSize, buildingDef);
            return;
        }

        if (building.type === 'oilDerrick') {
            this.drawOilDerrick(ctx, screenX, screenY, this.tileSize, buildingDef);
            return;
        }

        const size = this.tileSize;

        // Check for zone development
        const devManager = this.game.developmentManager;
        const dev = devManager ? devManager.getDevelopment(tileX, tileY) : null;
        const visual = dev ? devManager.getVisual(tileX, tileY) : null;

        let bgColor = buildingDef.color;
        let icon = buildingDef.icon;

        if (visual) {
            bgColor = visual.color;
            icon = visual.symbol;
        }

        // Draw building background
        ctx.fillStyle = bgColor;
        ctx.fillRect(screenX + 1, screenY + 1, size - 2, size - 2);

        // Draw progress bar for developing zones
        if (dev && dev.level < DEV_LEVELS.DENSE && dev.progress > 0) {
            const progressWidth = (size - 4) * (dev.progress / 100);
            ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
            ctx.fillRect(screenX + 2, screenY + size - 5, progressWidth, 3);
        }

        // Draw icon
        if (this.tileSize >= 16) {
            ctx.font = `${Math.floor(size * 0.6)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(icon, screenX + size/2, screenY + size/2);
        }

        // Draw border
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX + 1, screenY + 1, size - 2, size - 2);

        // Draw level indicator
        if (dev && dev.level > 0 && this.tileSize >= 20) {
            ctx.fillStyle = '#FFD700';
            ctx.font = `bold ${Math.floor(size * 0.25)}px Arial`;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            ctx.fillText(`L${dev.level}`, screenX + size - 2, screenY + 2);
        }
    }

    

    // ==================== RESIDENTIAL ALLOTMENT ====================

    drawResidentialAllotment(ctx, building, screenX, screenY, tileX, tileY) {
        // Debug: log when this is called
        // console.log(`[DRAW] drawResidentialAllotment ENTERED at (${tileX},${tileY})`, building);
        
        // Get cell data from the residential manager
        const resManager = this.game.residentialManager;
        if (!resManager) {
            // Fallback: just draw a green square with construction icon
            console.warn('[GameCanvas] No residentialManager available for rendering!');
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(screenX + 1, screenY + 1, this.tileSize - 2, this.tileSize - 2);
            // Draw construction icon as fallback
            if (this.tileSize >= 16) {
                ctx.font = `${Math.floor(this.tileSize * 0.6)}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🏗️', screenX + this.tileSize/2, screenY + this.tileSize/2);
            }
            return;
        }

        const cellData = resManager.getCellRenderData(tileX, tileY);

        if (cellData && this.residentialRenderer) {
            // Use the dedicated renderer
            this.residentialRenderer.renderCell(
                tileX, tileY, 
                this.tileSize, 
                cellData, 
                this.offsetX, 
                this.offsetY
            );

            // Draw allotment boundary on main tile
            if (building.mainTile && cellData.allotment) {
                this.residentialRenderer.drawAllotmentBoundary(
                    cellData.allotment.x, 
                    cellData.allotment.y,
                    this.tileSize,
                    this.offsetX,
                    this.offsetY,
                    cellData.phase
                );

                // Draw progress bar and infrastructure status
                this.residentialRenderer.drawAllotmentProgress(
                    cellData.allotment.x,
                    cellData.allotment.y,
                    this.tileSize,
                    this.offsetX,
                    this.offsetY,
                    cellData.progress,
                    cellData.phase,
                    cellData.allotment  // Pass allotment for infrastructure status
                );
            }
        } else {
            // Fallback rendering
            const size = this.tileSize;

            // Draw based on cell position
            ctx.fillStyle = '#90EE90';  // Light green
            ctx.fillRect(screenX + 1, screenY + 1, size - 2, size - 2);

            // Draw house icon if we have cell data
            if (cellData?.cell?.type === 'house') {
                ctx.fillStyle = '#4CAF50';
                ctx.fillRect(screenX + 2, screenY + 2, size - 4, size - 4);
                if (size >= 16) {
                    ctx.font = `${Math.floor(size * 0.6)}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('🏠', screenX + size/2, screenY + size/2);
                }
            } else if (cellData?.cell?.type === 'apartment') {
                ctx.fillStyle = '#4682B4';
                ctx.fillRect(screenX + 2, screenY + 2, size - 4, size - 4);
                if (size >= 16) {
                    ctx.font = `${Math.floor(size * 0.6)}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('🏢', screenX + size/2, screenY + size/2);
                }
            } else if (cellData?.cell?.type === 'highrise') {
                ctx.fillStyle = '#9370DB';
                ctx.fillRect(screenX + 2, screenY + 2, size - 4, size - 4);
                if (size >= 16) {
                    ctx.font = `${Math.floor(size * 0.6)}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('🏙️', screenX + size/2, screenY + size/2);
                }
            } else {
                // Empty lot
                ctx.fillStyle = '#DEB887';
                ctx.fillRect(screenX + 3, screenY + 3, size - 6, size - 6);
                if (size >= 16) {
                    ctx.font = `${Math.floor(size * 0.5)}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('🏗️', screenX + size/2, screenY + size/2);
                }
            }

            // Border
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 1;
            ctx.strokeRect(screenX + 1, screenY + 1, size - 2, size - 2);
        }
    }

    // ==================== COMMERCIAL ALLOTMENT ====================

    drawCommercialAllotment(ctx, building, screenX, screenY, tileX, tileY) {
        const comManager = this.game.commercialManager;
        if (!comManager) {
            // Fallback: just draw a blue square
            ctx.fillStyle = '#2196F3';
            ctx.fillRect(screenX + 1, screenY + 1, this.tileSize - 2, this.tileSize - 2);
            if (this.tileSize >= 16) {
                ctx.font = `${Math.floor(this.tileSize * 0.6)}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🏗️', screenX + this.tileSize/2, screenY + this.tileSize/2);
            }
            return;
        }

        const cellData = comManager.getCellRenderData(tileX, tileY);

        if (cellData && this.commercialRenderer) {
            this.commercialRenderer.renderCell(
                tileX, tileY,
                this.tileSize,
                cellData,
                this.offsetX,
                this.offsetY
            );

            if (building.mainTile && cellData.allotment) {
                this.commercialRenderer.drawAllotmentBoundary(
                    cellData.allotment.x,
                    cellData.allotment.y,
                    this.tileSize,
                    this.offsetX,
                    this.offsetY,
                    cellData.phase
                );

                this.commercialRenderer.drawAllotmentProgress(
                    cellData.allotment.x,
                    cellData.allotment.y,
                    this.tileSize,
                    this.offsetX,
                    this.offsetY,
                    cellData.progress,
                    cellData.phase,
                    cellData.allotment  // Pass allotment for infrastructure status
                );
            }
        } else {
            // Fallback rendering
            const size = this.tileSize;
            ctx.fillStyle = '#64B5F6';
            ctx.fillRect(screenX + 1, screenY + 1, size - 2, size - 2);
            if (size >= 16) {
                ctx.font = `${Math.floor(size * 0.5)}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🏗️', screenX + size/2, screenY + size/2);
            }
        }
    }

    // ==================== INDUSTRIAL ALLOTMENT ====================

    drawIndustrialAllotment(ctx, building, screenX, screenY, tileX, tileY) {
        const indManager = this.game.industrialManager;
        if (!indManager) {
            // Fallback: just draw an orange square
            ctx.fillStyle = '#FF9800';
            ctx.fillRect(screenX + 1, screenY + 1, this.tileSize - 2, this.tileSize - 2);
            if (this.tileSize >= 16) {
                ctx.font = `${Math.floor(this.tileSize * 0.6)}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🏗️', screenX + this.tileSize/2, screenY + this.tileSize/2);
            }
            return;
        }

        const cellData = indManager.getCellRenderData(tileX, tileY);

        if (cellData && this.industrialRenderer) {
            this.industrialRenderer.renderCell(
                tileX, tileY,
                this.tileSize,
                cellData,
                this.offsetX,
                this.offsetY
            );

            if (building.mainTile && cellData.allotment) {
                this.industrialRenderer.drawAllotmentBoundary(
                    cellData.allotment.x,
                    cellData.allotment.y,
                    this.tileSize,
                    this.offsetX,
                    this.offsetY,
                    cellData.phase
                );

                this.industrialRenderer.drawAllotmentProgress(
                    cellData.allotment.x,
                    cellData.allotment.y,
                    this.tileSize,
                    this.offsetX,
                    this.offsetY,
                    cellData.progress,
                    cellData.phase,
                    cellData.allotment  // Pass allotment for infrastructure status
                );
            }
        } else {
            // Fallback rendering
            const size = this.tileSize;
            ctx.fillStyle = '#FFB74D';
            ctx.fillRect(screenX + 1, screenY + 1, size - 2, size - 2);
            if (size >= 16) {
                ctx.font = `${Math.floor(size * 0.5)}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🏗️', screenX + size/2, screenY + size/2);
            }
        }
    }

    // ==================== ANIMATED BUILDINGS ====================

    drawNuclearPlant(ctx, x, y, size, def) {
        const fullSize = size * 2; // 2x2 building

        // Background - concrete pad
        ctx.fillStyle = '#808080';
        ctx.fillRect(x + 1, y + 1, fullSize - 2, fullSize - 2);

        // Inner area
        ctx.fillStyle = def.color || '#9932CC';
        ctx.fillRect(x + 3, y + 3, fullSize - 6, fullSize - 6);

        // Cooling tower 1 (left) - hyperboloid shape
        ctx.fillStyle = '#E8E8E8';
        ctx.beginPath();
        ctx.moveTo(x + fullSize * 0.1, y + fullSize * 0.75);
        ctx.quadraticCurveTo(x + fullSize * 0.15, y + fullSize * 0.4, x + fullSize * 0.2, y + fullSize * 0.15);
        ctx.lineTo(x + fullSize * 0.4, y + fullSize * 0.15);
        ctx.quadraticCurveTo(x + fullSize * 0.45, y + fullSize * 0.4, x + fullSize * 0.5, y + fullSize * 0.75);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#CCCCCC';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Cooling tower 2 (right)
        ctx.fillStyle = '#E8E8E8';
        ctx.beginPath();
        ctx.moveTo(x + fullSize * 0.5, y + fullSize * 0.75);
        ctx.quadraticCurveTo(x + fullSize * 0.55, y + fullSize * 0.4, x + fullSize * 0.6, y + fullSize * 0.15);
        ctx.lineTo(x + fullSize * 0.8, y + fullSize * 0.15);
        ctx.quadraticCurveTo(x + fullSize * 0.85, y + fullSize * 0.4, x + fullSize * 0.9, y + fullSize * 0.75);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#CCCCCC';
        ctx.stroke();

        // Steam from towers (animated)
        const steamOffset = Math.sin(this.animTime / 200) * 2;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.arc(x + fullSize * 0.3, y + fullSize * 0.1 + steamOffset, fullSize * 0.08, 0, Math.PI * 2);
        ctx.arc(x + fullSize * 0.7, y + fullSize * 0.08 - steamOffset, fullSize * 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Spinning nuclear symbol (always show, scale with size)
        const rotation = (this.animTime / 600) * Math.PI * 2;
        const centerX = x + fullSize * 0.5;
        const centerY = y + fullSize * 0.88;
        const symbolSize = Math.max(10, fullSize * 0.22);

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(rotation);

        // Draw nuclear symbol manually for better visibility
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(0, 0, symbolSize * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Nuclear trefoil
        ctx.fillStyle = '#000000';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            const angle = (i * 2 * Math.PI / 3) - Math.PI / 2;
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, symbolSize * 0.45, angle - 0.4, angle + 0.4);
            ctx.closePath();
            ctx.fill();
        }
        // Center dot
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(0, 0, symbolSize * 0.15, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Border
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, fullSize - 2, fullSize - 2);
    }

    drawCoalPlant(ctx, x, y, size, def) {
        // Background
        ctx.fillStyle = def.color;
        const fullSize = size * 2; // 2x2 building
        ctx.fillRect(x + 1, y + 1, fullSize - 2, fullSize - 2);

        // Building structure
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(x + fullSize * 0.1, y + fullSize * 0.4, fullSize * 0.5, fullSize * 0.5);

        // Smokestacks
        ctx.fillStyle = '#696969';
        const stackW = fullSize * 0.08;
        ctx.fillRect(x + fullSize * 0.2, y + fullSize * 0.15, stackW, fullSize * 0.35);
        ctx.fillRect(x + fullSize * 0.35, y + fullSize * 0.15, stackW, fullSize * 0.35);
        ctx.fillRect(x + fullSize * 0.5, y + fullSize * 0.2, stackW, fullSize * 0.3);

        // Coal pile
        ctx.fillStyle = '#2F2F2F';
        ctx.beginPath();
        ctx.arc(x + fullSize * 0.75, y + fullSize * 0.75, fullSize * 0.15, 0, Math.PI * 2);
        ctx.fill();

        // Icon
        if (size >= 12) {
            ctx.font = `${Math.floor(fullSize * 0.2)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🏭', x + fullSize * 0.75, y + fullSize * 0.4);
        }

        // Border
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1, y + 1, fullSize - 2, fullSize - 2);
    }

    drawOilDerrick(ctx, x, y, size, def) {
        // Background - sandy/dirt
        ctx.fillStyle = '#D2B48C';
        ctx.fillRect(x + 1, y + 1, size - 2, size - 2);

        // Pumping animation - bobbing up and down
        const pumpOffset = Math.sin(this.animTime / 300) * size * 0.1;

        // Derrick base
        ctx.fillStyle = '#4A4A4A';
        ctx.fillRect(x + size * 0.35, y + size * 0.7, size * 0.3, size * 0.25);

        // Derrick tower (A-frame)
        ctx.strokeStyle = '#333';
        ctx.lineWidth = Math.max(1, size * 0.06);
        ctx.beginPath();
        // Left leg
        ctx.moveTo(x + size * 0.25, y + size * 0.7);
        ctx.lineTo(x + size * 0.5, y + size * 0.15);
        // Right leg
        ctx.moveTo(x + size * 0.75, y + size * 0.7);
        ctx.lineTo(x + size * 0.5, y + size * 0.15);
        // Cross beams
        ctx.moveTo(x + size * 0.32, y + size * 0.5);
        ctx.lineTo(x + size * 0.68, y + size * 0.5);
        ctx.moveTo(x + size * 0.38, y + size * 0.35);
        ctx.lineTo(x + size * 0.62, y + size * 0.35);
        ctx.stroke();

        // Pump head (horse head) - animated
        ctx.fillStyle = '#222';
        ctx.save();
        ctx.translate(x + size * 0.5, y + size * 0.2);
        ctx.rotate(pumpOffset * 0.3);
        // Horse head shape
        ctx.fillRect(-size * 0.15, -size * 0.05, size * 0.3, size * 0.08);
        ctx.fillRect(size * 0.1, -size * 0.05, size * 0.08, size * 0.15 + pumpOffset);
        ctx.restore();

        // Walking beam
        ctx.strokeStyle = '#333';
        ctx.lineWidth = Math.max(1, size * 0.04);
        ctx.beginPath();
        ctx.moveTo(x + size * 0.2, y + size * 0.25 + pumpOffset * 0.5);
        ctx.lineTo(x + size * 0.8, y + size * 0.25 - pumpOffset * 0.5);
        ctx.stroke();

        // Oil drop icon
        if (size >= 20) {
            ctx.font = `${Math.floor(size * 0.25)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🛢️', x + size * 0.8, y + size * 0.8);
        }

        // Border
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
    }

    // ==================== POWER LINE (TOP-DOWN VIEW) ====================

    drawPowerLine(ctx, x, y, size, connections) {
        // Ground/grass background
        ctx.fillStyle = '#7CB342';
        ctx.fillRect(x, y, size, size);

        const connCount = [connections.north, connections.south,
                          connections.east, connections.west].filter(c => c).length;

        // Draw wires first (under poles)
        ctx.strokeStyle = '#1A1A1A';
        ctx.lineWidth = Math.max(1, size * 0.04);

        const centerX = x + size / 2;
        const centerY = y + size / 2;
        const wireOffset = size * 0.15;

        // Draw parallel wires for each connection
        if (connections.north) {
            ctx.beginPath();
            ctx.moveTo(centerX - wireOffset, centerY);
            ctx.lineTo(centerX - wireOffset, y);
            ctx.moveTo(centerX + wireOffset, centerY);
            ctx.lineTo(centerX + wireOffset, y);
            ctx.stroke();
        }
        if (connections.south) {
            ctx.beginPath();
            ctx.moveTo(centerX - wireOffset, centerY);
            ctx.lineTo(centerX - wireOffset, y + size);
            ctx.moveTo(centerX + wireOffset, centerY);
            ctx.lineTo(centerX + wireOffset, y + size);
            ctx.stroke();
        }
        if (connections.east) {
            ctx.beginPath();
            ctx.moveTo(centerX, centerY - wireOffset);
            ctx.lineTo(x + size, centerY - wireOffset);
            ctx.moveTo(centerX, centerY + wireOffset);
            ctx.lineTo(x + size, centerY + wireOffset);
            ctx.stroke();
        }
        if (connections.west) {
            ctx.beginPath();
            ctx.moveTo(centerX, centerY - wireOffset);
            ctx.lineTo(x, centerY - wireOffset);
            ctx.moveTo(centerX, centerY + wireOffset);
            ctx.lineTo(x, centerY + wireOffset);
            ctx.stroke();
        }

        // Draw pole (top-down view - circle with cross)
        const poleRadius = size * 0.12;

        // Pole shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.arc(centerX + 2, centerY + 2, poleRadius, 0, Math.PI * 2);
        ctx.fill();

        // Pole top (brown wood)
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.arc(centerX, centerY, poleRadius, 0, Math.PI * 2);
        ctx.fill();

        // Pole center mark
        ctx.fillStyle = '#5D3A1A';
        ctx.beginPath();
        ctx.arc(centerX, centerY, poleRadius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Crossarm (top-down view) - perpendicular to wire direction
        if (connCount >= 1) {
            ctx.fillStyle = '#6B4423';
            // Horizontal wires (east/west) get VERTICAL crossbar
            if (connections.east || connections.west) {
                ctx.fillRect(centerX - size * 0.04, y + size * 0.2, size * 0.08, size * 0.6);
            }
            // Vertical wires (north/south) get HORIZONTAL crossbar
            if (connections.north || connections.south) {
                ctx.fillRect(x + size * 0.2, centerY - size * 0.04, size * 0.6, size * 0.08);
            }
        }

        // Insulators (small dots where wires connect)
        ctx.fillStyle = '#4FC3F7';
        const insSize = size * 0.05;
        if (connections.north || connections.south) {
            ctx.beginPath();
            ctx.arc(centerX - wireOffset, centerY, insSize, 0, Math.PI * 2);
            ctx.arc(centerX + wireOffset, centerY, insSize, 0, Math.PI * 2);
            ctx.fill();
        }
        if (connections.east || connections.west) {
            ctx.beginPath();
            ctx.arc(centerX, centerY - wireOffset, insSize, 0, Math.PI * 2);
            ctx.arc(centerX, centerY + wireOffset, insSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    
    // ==================== PORT WITH LED INDICATOR ====================

    drawPort(ctx, x, y, size, tileX, tileY) {
        const fullSize = size * 2; // 2x2 building

        // Check if port has power and road access
        let hasRoad = false;
        let hasPower = false;
        if (this.game && this.game.infrastructureManager) {
            hasRoad = this.game.infrastructureManager.hasRoadAccess(tileX, tileY);
            hasPower = this.game.infrastructureManager.hasPower(tileX, tileY);
        }
        const isActive = hasRoad && hasPower;

        // Background - dock/pier color
        ctx.fillStyle = '#5D4E37';  // Dark wood
        ctx.fillRect(x + 1, y + 1, fullSize - 2, fullSize - 2);

        // Water area (bottom portion)
        ctx.fillStyle = '#1E90FF';
        ctx.fillRect(x + 2, y + fullSize * 0.6, fullSize - 4, fullSize * 0.38);

        // Animated water ripples
        const rippleOffset = Math.sin(this.animTime / 200) * 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 5, y + fullSize * 0.7 + rippleOffset);
        ctx.quadraticCurveTo(x + fullSize/2, y + fullSize * 0.75 - rippleOffset, x + fullSize - 5, y + fullSize * 0.7 + rippleOffset);
        ctx.stroke();

        // Dock planks
        ctx.fillStyle = '#8B7355';
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(x + 3, y + 3 + i * (fullSize * 0.12), fullSize - 6, fullSize * 0.08);
        }

        // Dock posts
        ctx.fillStyle = '#4A3728';
        ctx.fillRect(x + 4, y + 2, 4, fullSize * 0.5);
        ctx.fillRect(x + fullSize - 8, y + 2, 4, fullSize * 0.5);

        // Crane/loading structure
        ctx.fillStyle = '#696969';
        ctx.fillRect(x + fullSize * 0.35, y + 4, 6, fullSize * 0.4);
        ctx.fillRect(x + fullSize * 0.35 - 8, y + 4, 22, 4);

        // Crane hook
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + fullSize * 0.35 + 10, y + 8);
        ctx.lineTo(x + fullSize * 0.35 + 10, y + fullSize * 0.35);
        ctx.stroke();

        // Anchor icon in center
        ctx.font = `${Math.floor(fullSize * 0.35)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚓', x + fullSize * 0.7, y + fullSize * 0.35);

        // LED Indicator (like service buildings)
        const ledX = x + fullSize - 12;
        const ledY = y + 6;
        const ledRadius = 5;

        // LED glow effect
        if (isActive) {
            // Green glow
            const gradient = ctx.createRadialGradient(ledX, ledY, 0, ledX, ledY, ledRadius * 2);
            gradient.addColorStop(0, 'rgba(0, 255, 0, 0.8)');
            gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(ledX, ledY, ledRadius * 2, 0, Math.PI * 2);
            ctx.fill();

            // LED body - green
            ctx.fillStyle = '#00FF00';
            ctx.beginPath();
            ctx.arc(ledX, ledY, ledRadius, 0, Math.PI * 2);
            ctx.fill();

            // LED highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(ledX - 1, ledY - 1, ledRadius * 0.4, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Red glow (pulsing when inactive)
            const pulse = 0.5 + 0.5 * Math.sin(this.animTime / 300);
            const gradient = ctx.createRadialGradient(ledX, ledY, 0, ledX, ledY, ledRadius * 2);
            gradient.addColorStop(0, `rgba(255, 0, 0, ${0.6 * pulse})`);
            gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(ledX, ledY, ledRadius * 2, 0, Math.PI * 2);
            ctx.fill();

            // LED body - red
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(ledX, ledY, ledRadius, 0, Math.PI * 2);
            ctx.fill();

            // LED highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.beginPath();
            ctx.arc(ledX - 1, ledY - 1, ledRadius * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Status text (small)
        if (fullSize >= 40) {
            ctx.font = 'bold 8px Arial';
            ctx.textAlign = 'left';
            ctx.fillStyle = isActive ? '#00AA00' : '#AA0000';
            ctx.fillText(isActive ? 'OPEN' : 'CLOSED', x + 4, y + fullSize - 4);
        }

        // Border
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, fullSize - 2, fullSize - 2);
    }

    drawAirport(ctx, screenX, screenY, tileSize, tileX, tileY) {
        const totalSize = tileSize * 4;  // 4x4 building

        // Check if airport is active
        let isActive = false;
        if (this.game && this.game.airportSystem) {
            const airport = this.game.airportSystem.airports.find(
                a => a.x === tileX && a.y === tileY
            );
            isActive = airport?.active || false;
        }

        // Draw ground/tarmac
        ctx.fillStyle = '#37474F';  // Dark gray tarmac
        ctx.fillRect(screenX, screenY, totalSize, totalSize);

        // Draw runway (horizontal stripe)
        ctx.fillStyle = '#263238';  // Darker runway
        ctx.fillRect(screenX + tileSize * 0.5, screenY + tileSize * 1.5, totalSize - tileSize, tileSize);

        // Runway markings (white dashed line)
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.setLineDash([tileSize * 0.3, tileSize * 0.2]);
        ctx.beginPath();
        ctx.moveTo(screenX + tileSize * 0.7, screenY + tileSize * 2);
        ctx.lineTo(screenX + totalSize - tileSize * 0.7, screenY + tileSize * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Runway threshold markings
        ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(screenX + tileSize * 0.6, screenY + tileSize * 1.6 + i * tileSize * 0.2, tileSize * 0.15, tileSize * 0.15);
            ctx.fillRect(screenX + totalSize - tileSize * 0.75, screenY + tileSize * 1.6 + i * tileSize * 0.2, tileSize * 0.15, tileSize * 0.15);
        }

        // Draw terminal building (top portion)
        const terminalX = screenX + tileSize * 0.5;
        const terminalY = screenY + tileSize * 0.3;
        const terminalW = totalSize - tileSize;
        const terminalH = tileSize * 1.0;

        // Terminal shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(terminalX + 4, terminalY + 4, terminalW, terminalH);

        // Terminal building
        ctx.fillStyle = '#ECEFF1';  // Light gray building
        ctx.fillRect(terminalX, terminalY, terminalW, terminalH);

        // Terminal roof
        ctx.fillStyle = '#607D8B';
        ctx.fillRect(terminalX, terminalY, terminalW, tileSize * 0.15);

        // Terminal windows
        ctx.fillStyle = '#81D4FA';  // Light blue windows
        const windowCount = 6;
        const windowW = (terminalW - tileSize * 0.4) / windowCount - tileSize * 0.1;
        for (let i = 0; i < windowCount; i++) {
            ctx.fillRect(
                terminalX + tileSize * 0.2 + i * (windowW + tileSize * 0.1),
                terminalY + tileSize * 0.25,
                windowW,
                tileSize * 0.5
            );
        }

        // Control tower
        const towerX = screenX + totalSize - tileSize * 1.2;
        const towerY = screenY + tileSize * 0.1;
        const towerW = tileSize * 0.8;
        const towerH = tileSize * 1.2;

        // Tower shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(towerX + 3, towerY + 3, towerW, towerH);

        // Tower body
        ctx.fillStyle = '#B0BEC5';
        ctx.fillRect(towerX, towerY + tileSize * 0.4, towerW, towerH - tileSize * 0.4);

        // Tower top (control room)
        ctx.fillStyle = '#455A64';
        ctx.fillRect(towerX - tileSize * 0.1, towerY, towerW + tileSize * 0.2, tileSize * 0.5);

        // Tower windows
        ctx.fillStyle = '#4FC3F7';
        ctx.fillRect(towerX, towerY + tileSize * 0.1, towerW, tileSize * 0.3);

        // Draw taxiway lines
        ctx.strokeStyle = '#FFC107';  // Yellow taxiway lines
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(screenX + tileSize * 2, screenY + tileSize * 2.5);
        ctx.lineTo(screenX + tileSize * 2, screenY + totalSize - tileSize * 0.3);
        ctx.stroke();

        // Draw plane parking spots
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        for (let i = 0; i < 2; i++) {
            const spotX = screenX + tileSize * 0.8 + i * tileSize * 2;
            const spotY = screenY + tileSize * 2.8;
            ctx.strokeRect(spotX, spotY, tileSize * 1.2, tileSize * 0.8);
        }

        // Draw status indicator
        const ledX = screenX + totalSize - tileSize * 0.3;
        const ledY = screenY + tileSize * 0.3;
        const ledSize = Math.max(6, tileSize * 0.2);

        // LED glow
        const gradient = ctx.createRadialGradient(ledX, ledY, 0, ledX, ledY, ledSize * 2);
        if (isActive) {
            gradient.addColorStop(0, 'rgba(0, 255, 0, 0.8)');
            gradient.addColorStop(0.5, 'rgba(0, 255, 0, 0.3)');
            gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
        } else {
            gradient.addColorStop(0, 'rgba(255, 0, 0, 0.8)');
            gradient.addColorStop(0.5, 'rgba(255, 0, 0, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        }
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(ledX, ledY, ledSize * 2, 0, Math.PI * 2);
        ctx.fill();

        // LED body
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(ledX, ledY, ledSize * 1.2, 0, Math.PI * 2);
        ctx.fill();

        // LED light
        ctx.fillStyle = isActive ? '#00FF00' : '#FF0000';
        ctx.beginPath();
        ctx.arc(ledX, ledY, ledSize, 0, Math.PI * 2);
        ctx.fill();

        // Draw airport icon
        ctx.font = `${tileSize * 0.8}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✈️', screenX + tileSize * 1, screenY + tileSize * 3.3);

        // Draw border
        ctx.strokeStyle = isActive ? '#4CAF50' : '#F44336';
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX + 1, screenY + 1, totalSize - 2, totalSize - 2);
    }

// ==================== PLACEMENT PREVIEW ====================

    drawPlacementPreview(ctx) {
        if (!this.game.toolManager || !this.game.toolManager.selectedTool) return;
        if (this.hoverTileX < 0 || this.hoverTileY < 0) return;

        const tileMap = this.game.tileMap;
        if (!tileMap.isInBounds(this.hoverTileX, this.hoverTileY)) return;

        const check = this.game.toolManager.canPlaceAt(this.hoverTileX, this.hoverTileY);
        const building = this.game.toolManager.getSelectedTool();

        const screenX = this.hoverTileX * this.tileSize + this.offsetX;
        const screenY = this.hoverTileY * this.tileSize + this.offsetY;
        const size = this.tileSize * (building ? building.size : 1);

        // Pulsing animation for better visibility
        const pulse = 0.7 + 0.3 * Math.sin(this.animTime / 150);

        if (check.valid) {
            // Valid placement - green with pulsing border
            ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
            ctx.fillRect(screenX, screenY, size, size);

            // Thick green border
            ctx.strokeStyle = `rgba(76, 175, 80, ${pulse})`;
            ctx.lineWidth = 4;
            ctx.strokeRect(screenX + 2, screenY + 2, size - 4, size - 4);
        } else {
            // Invalid placement - red with very visible pulsing border
            ctx.fillStyle = 'rgba(244, 67, 54, 0.35)';
            ctx.fillRect(screenX, screenY, size, size);

            // Outer dark border for contrast
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.lineWidth = 6;
            ctx.strokeRect(screenX, screenY, size, size);

            // Inner bright red pulsing border
            ctx.strokeStyle = `rgba(255, 50, 50, ${pulse})`;
            ctx.lineWidth = 4;
            ctx.strokeRect(screenX + 2, screenY + 2, size - 4, size - 4);

            // Corner markers for extra visibility
            ctx.fillStyle = '#FF0000';
            const cornerSize = Math.max(6, size * 0.15);
            // Top-left
            ctx.fillRect(screenX, screenY, cornerSize, 4);
            ctx.fillRect(screenX, screenY, 4, cornerSize);
            // Top-right
            ctx.fillRect(screenX + size - cornerSize, screenY, cornerSize, 4);
            ctx.fillRect(screenX + size - 4, screenY, 4, cornerSize);
            // Bottom-left
            ctx.fillRect(screenX, screenY + size - 4, cornerSize, 4);
            ctx.fillRect(screenX, screenY + size - cornerSize, 4, cornerSize);
            // Bottom-right
            ctx.fillRect(screenX + size - cornerSize, screenY + size - 4, cornerSize, 4);
            ctx.fillRect(screenX + size - 4, screenY + size - cornerSize, 4, cornerSize);
        }

        // Draw building icon
        if (building && this.tileSize >= 16) {
            ctx.font = `${Math.floor(this.tileSize * 0.6)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#fff';
            // Add shadow for better visibility
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            ctx.fillText(building.icon, screenX + this.tileSize/2, screenY + this.tileSize/2);
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }
    }
}
