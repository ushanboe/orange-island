// GameCanvas - Handles rendering and input for the game
import { TERRAIN_COLORS } from '../map/TileMap.js';
import { BUILDINGS } from '../buildings/Buildings.js';
import { ZONE_VISUALS, DEV_LEVELS } from '../simulation/Development.js';

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
}
