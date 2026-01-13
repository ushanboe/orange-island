// GameCanvas - Handles rendering and input for the game
import { TERRAIN_COLORS } from '../map/TileMap.js';
import { BUILDINGS } from '../buildings/Buildings.js';
import { ZONE_VISUALS, DEV_LEVELS } from '../simulation/Development.js';


// Road auto-tiling helper - determines road connections
function getRoadConnections(tileMap, x, y) {
    const connections = {
        north: false,
        south: false,
        east: false,
        west: false
    };

    // Check each adjacent tile for roads
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

// Draw road with proper connections
function drawRoadTile(ctx, x, y, size, connections) {
    const roadColor = '#505050';  // Asphalt gray
    const lineColor = '#FFD700';  // Yellow road markings
    const edgeColor = '#303030';  // Darker edge

    // Fill base road
    ctx.fillStyle = roadColor;
    ctx.fillRect(x, y, size, size);

    // Draw road edges (curbs)
    ctx.fillStyle = edgeColor;
    const edgeWidth = Math.max(1, size * 0.1);

    // Draw edges where there's no connection
    if (!connections.north) {
        ctx.fillRect(x, y, size, edgeWidth);
    }
    if (!connections.south) {
        ctx.fillRect(x, y + size - edgeWidth, size, edgeWidth);
    }
    if (!connections.west) {
        ctx.fillRect(x, y, edgeWidth, size);
    }
    if (!connections.east) {
        ctx.fillRect(x + size - edgeWidth, y, edgeWidth, size);
    }

    // Draw center line markings based on connections
    ctx.fillStyle = lineColor;
    const lineWidth = Math.max(1, size * 0.08);
    const centerX = x + size / 2 - lineWidth / 2;
    const centerY = y + size / 2 - lineWidth / 2;
    const dashLen = size * 0.15;
    const gapLen = size * 0.1;

    // Count connections
    const connCount = [connections.north, connections.south, 
                       connections.east, connections.west].filter(c => c).length;

    if (connCount === 0) {
        // Isolated road - draw small square
        ctx.fillRect(centerX, centerY, lineWidth, lineWidth);
    } else if (connCount === 1) {
        // Dead end - draw line toward connection
        if (connections.north) {
            ctx.fillRect(centerX, y, lineWidth, size/2);
        } else if (connections.south) {
            ctx.fillRect(centerX, centerY, lineWidth, size/2 + lineWidth/2);
        } else if (connections.east) {
            ctx.fillRect(centerX, centerY, size/2 + lineWidth/2, lineWidth);
        } else if (connections.west) {
            ctx.fillRect(x, centerY, size/2, lineWidth);
        }
    } else if (connCount === 2) {
        // Straight or corner
        if (connections.north && connections.south) {
            // Vertical straight
            ctx.fillRect(centerX, y, lineWidth, size);
        } else if (connections.east && connections.west) {
            // Horizontal straight
            ctx.fillRect(x, centerY, size, lineWidth);
        } else {
            // Corner - draw L shape
            if (connections.north) ctx.fillRect(centerX, y, lineWidth, size/2 + lineWidth/2);
            if (connections.south) ctx.fillRect(centerX, centerY, lineWidth, size/2 + lineWidth/2);
            if (connections.east) ctx.fillRect(centerX, centerY, size/2 + lineWidth/2, lineWidth);
            if (connections.west) ctx.fillRect(x, centerY, size/2 + lineWidth/2, lineWidth);
        }
    } else if (connCount === 3) {
        // T-intersection
        if (!connections.north) {
            ctx.fillRect(x, centerY, size, lineWidth);  // Horizontal
            ctx.fillRect(centerX, centerY, lineWidth, size/2 + lineWidth/2);  // Down
        } else if (!connections.south) {
            ctx.fillRect(x, centerY, size, lineWidth);  // Horizontal
            ctx.fillRect(centerX, y, lineWidth, size/2 + lineWidth/2);  // Up
        } else if (!connections.east) {
            ctx.fillRect(centerX, y, lineWidth, size);  // Vertical
            ctx.fillRect(x, centerY, size/2 + lineWidth/2, lineWidth);  // Left
        } else {
            ctx.fillRect(centerX, y, lineWidth, size);  // Vertical
            ctx.fillRect(centerX, centerY, size/2 + lineWidth/2, lineWidth);  // Right
        }
    } else {
        // 4-way intersection - draw cross
        ctx.fillRect(x, centerY, size, lineWidth);  // Horizontal
        ctx.fillRect(centerX, y, lineWidth, size);  // Vertical
    }
}

export class GameCanvas {
    constructor(game, canvasId) {
        this.game = game;
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // View settings
        this.tileSize = 20;
        this.minTileSize = 8;
        this.maxTileSize = 50;
        this.offsetX = 0;
        this.offsetY = 0;

        // Interaction state
        this.isDragging = false;
        this.isPanning = false;
        this.lastPointerX = 0;
        this.lastPointerY = 0;
        this.pointerStartX = 0;
        this.pointerStartY = 0;

        // Touch handling
        this.touches = {};
        this.lastPinchDist = 0;

        // Hover tile for preview
        this.hoverTileX = -1;
        this.hoverTileY = -1;

        // Setup
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

        console.log(`Canvas resized: ${this.canvas.width}x${this.canvas.height}`);
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

        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.onPointerDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onPointerMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onPointerUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.onPointerUp(e));
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));

        // Touch events
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

        if (this.game.toolManager && this.game.toolManager.selectedTool) {
            this.isDragging = true;
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
            this.touches[touch.identifier] = { x: touch.clientX, y: touch.clientY };
        }

        const touchCount = Object.keys(this.touches).length;

        if (touchCount === 1) {
            const touch = e.touches[0];
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
            this.isPanning = false;
            this.isDragging = false;
            if (this.game.toolManager) this.game.toolManager.onPointerUp();

            const touchList = Object.values(this.touches);
            this.lastPinchDist = this.getPinchDistance(touchList[0], touchList[1]);
        }
    }

    onTouchMove(e) {
        e.preventDefault();

        for (const touch of e.changedTouches) {
            if (this.touches[touch.identifier]) {
                this.touches[touch.identifier] = { x: touch.clientX, y: touch.clientY };
            }
        }

        const touchCount = Object.keys(this.touches).length;

        if (touchCount === 1 && e.touches.length === 1) {
            const touch = e.touches[0];
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

    render() {
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

        // Draw terrain and buildings
        for (let y = startTileY; y < endTileY; y++) {
            for (let x = startTileX; x < endTileX; x++) {
                const tile = tileMap.getTile(x, y);
                if (!tile) continue;

                const screenX = x * this.tileSize + this.offsetX;
                const screenY = y * this.tileSize + this.offsetY;

                // Draw terrain
                ctx.fillStyle = TERRAIN_COLORS[tile.terrain] || '#000';
                ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);

                // Draw building if present
                if (tile.building) {
                    this.drawBuilding(ctx, tile.building, screenX, screenY, x, y);
                }
            }
        }

        // Draw grid lines if zoomed in enough
        if (this.tileSize >= 15) {
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
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

    drawBuilding(ctx, building, screenX, screenY, tileX, tileY) {
        const buildingDef = BUILDINGS[building.type];
        if (!buildingDef) return;

        // Only draw on main tile for multi-tile buildings
        if (building.mainTile === false) {
            ctx.fillStyle = buildingDef.color;
            ctx.fillRect(screenX + 1, screenY + 1, this.tileSize - 2, this.tileSize - 2);
            return;
        }

        // Special rendering for roads with auto-tiling
        if (building.type === 'road') {
            const connections = getRoadConnections(this.game.map, tileX, tileY);
            drawRoadTile(ctx, screenX, screenY, this.tileSize, connections);
            return;
        }

        // Special rendering for power lines
        if (building.type === 'powerLine') {
            const connections = getRoadConnections(this.game.map, tileX, tileY);
            this.drawPowerLine(ctx, screenX, screenY, this.tileSize, connections);
            return;
        }

        const size = this.tileSize;

        // Check if this is a zone with development tracking
        const devManager = this.game.developmentManager;
        const dev = devManager ? devManager.getDevelopment(tileX, tileY) : null;
        const visual = dev ? devManager.getVisual(tileX, tileY) : null;

        // Use development visual if available, otherwise use building default
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

        // Draw icon if tile is big enough
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

        // Draw level indicator for developed zones
        if (dev && dev.level > 0 && this.tileSize >= 20) {
            ctx.fillStyle = '#FFD700';
            ctx.font = `bold ${Math.floor(size * 0.25)}px Arial`;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            ctx.fillText(`L${dev.level}`, screenX + size - 2, screenY + 2);
        }
    }

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

        if (check.valid) {
            ctx.fillStyle = 'rgba(76, 175, 80, 0.4)';
            ctx.strokeStyle = '#4CAF50';
        } else {
            ctx.fillStyle = 'rgba(244, 67, 54, 0.4)';
            ctx.strokeStyle = '#F44336';
        }

        ctx.fillRect(screenX, screenY, size, size);
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX, screenY, size, size);

        if (building && this.tileSize >= 16) {
            ctx.font = `${Math.floor(this.tileSize * 0.6)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = '#fff';
            ctx.fillText(building.icon, screenX + this.tileSize/2, screenY + this.tileSize/2);
            ctx.globalAlpha = 1;
        }
    }

    drawPowerLine(ctx, x, y, size, connections) {
        // Draw power line poles and wires
        const poleColor = '#8B4513';  // Brown poles
        const wireColor = '#333333';  // Dark wires

        // Draw base ground
        ctx.fillStyle = '#90A955';  // Grass color
        ctx.fillRect(x, y, size, size);

        // Draw pole in center
        const poleWidth = size * 0.15;
        const poleHeight = size * 0.7;
        ctx.fillStyle = poleColor;
        ctx.fillRect(x + size/2 - poleWidth/2, y + size * 0.15, poleWidth, poleHeight);

        // Draw crossbar
        ctx.fillRect(x + size * 0.2, y + size * 0.2, size * 0.6, size * 0.08);

        // Draw wires to connected tiles
        ctx.strokeStyle = wireColor;
        ctx.lineWidth = Math.max(1, size * 0.05);
        ctx.beginPath();

        const centerX = x + size / 2;
        const centerY = y + size * 0.24;

        if (connections.north) {
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(centerX, y);
        }
        if (connections.south) {
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(centerX, y + size);
        }
        if (connections.east) {
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x + size, centerY);
        }
        if (connections.west) {
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, centerY);
        }

        ctx.stroke();

        // Draw lightning bolt icon if zoomed in enough
        if (size >= 20) {
            ctx.font = `${Math.floor(size * 0.3)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⚡', centerX, y + size * 0.6);
        }
    }
}
