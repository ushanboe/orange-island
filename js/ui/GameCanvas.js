/**
 * GameCanvas - Handles rendering and user input
 */
class GameCanvas {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Tile size in pixels
        this.tileSize = 16;
        
        // Camera position (top-left corner in world coords)
        this.cameraX = 0;
        this.cameraY = 0;
        
        // Zoom level
        this.zoom = 2;
        this.minZoom = 0.5;
        this.maxZoom = 4;
        
        // Input state
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        // Touch state
        this.touches = [];
        this.lastPinchDist = 0;
        
        // Reference to tile map
        this.tileMap = null;
        
        // Setup
        this.resize();
        this.setupEventListeners();
    }

    // Set the tile map to render
    setTileMap(tileMap) {
        this.tileMap = tileMap;
        // Center camera on map
        this.centerCamera();
    }

    // Center camera on the map
    centerCamera() {
        if (!this.tileMap) return;
        
        const worldWidth = this.tileMap.width * this.tileSize;
        const worldHeight = this.tileMap.height * this.tileSize;
        const screenWidth = this.canvas.width / this.zoom;
        const screenHeight = this.canvas.height / this.zoom;
        
        this.cameraX = (worldWidth - screenWidth) / 2;
        this.cameraY = (worldHeight - screenHeight) / 2;
    }

    // Resize canvas to fill container
    resize() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    }

    // Setup input event listeners
    setupEventListeners() {
        // Resize handler
        window.addEventListener('resize', () => this.resize());
        
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));
        
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));
        
        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    // Mouse down
    onMouseDown(e) {
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.canvas.style.cursor = 'grabbing';
    }

    // Mouse move
    onMouseMove(e) {
        if (!this.isDragging) return;
        
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        
        this.cameraX -= dx / this.zoom;
        this.cameraY -= dy / this.zoom;
        
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        
        this.clampCamera();
    }

    // Mouse up
    onMouseUp(e) {
        this.isDragging = false;
        this.canvas.style.cursor = 'grab';
    }

    // Mouse wheel (zoom)
    onWheel(e) {
        e.preventDefault();
        
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * zoomFactor));
        
        // Zoom toward mouse position
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // World position under mouse before zoom
        const worldX = this.cameraX + mouseX / this.zoom;
        const worldY = this.cameraY + mouseY / this.zoom;
        
        this.zoom = newZoom;
        
        // Adjust camera to keep world position under mouse
        this.cameraX = worldX - mouseX / this.zoom;
        this.cameraY = worldY - mouseY / this.zoom;
        
        this.clampCamera();
    }

    // Touch start
    onTouchStart(e) {
        e.preventDefault();
        this.touches = Array.from(e.touches);
        
        if (this.touches.length === 1) {
            this.isDragging = true;
            this.lastMouseX = this.touches[0].clientX;
            this.lastMouseY = this.touches[0].clientY;
        } else if (this.touches.length === 2) {
            this.lastPinchDist = this.getPinchDistance();
        }
    }

    // Touch move
    onTouchMove(e) {
        e.preventDefault();
        this.touches = Array.from(e.touches);
        
        if (this.touches.length === 1 && this.isDragging) {
            // Pan
            const dx = this.touches[0].clientX - this.lastMouseX;
            const dy = this.touches[0].clientY - this.lastMouseY;
            
            this.cameraX -= dx / this.zoom;
            this.cameraY -= dy / this.zoom;
            
            this.lastMouseX = this.touches[0].clientX;
            this.lastMouseY = this.touches[0].clientY;
            
            this.clampCamera();
        } else if (this.touches.length === 2) {
            // Pinch zoom
            const dist = this.getPinchDistance();
            const scale = dist / this.lastPinchDist;
            
            const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * scale));
            
            // Zoom toward pinch center
            const centerX = (this.touches[0].clientX + this.touches[1].clientX) / 2;
            const centerY = (this.touches[0].clientY + this.touches[1].clientY) / 2;
            
            const rect = this.canvas.getBoundingClientRect();
            const worldX = this.cameraX + (centerX - rect.left) / this.zoom;
            const worldY = this.cameraY + (centerY - rect.top) / this.zoom;
            
            this.zoom = newZoom;
            
            this.cameraX = worldX - (centerX - rect.left) / this.zoom;
            this.cameraY = worldY - (centerY - rect.top) / this.zoom;
            
            this.lastPinchDist = dist;
            this.clampCamera();
        }
    }

    // Touch end
    onTouchEnd(e) {
        this.touches = Array.from(e.touches);
        if (this.touches.length === 0) {
            this.isDragging = false;
        }
    }

    // Get distance between two touch points
    getPinchDistance() {
        if (this.touches.length < 2) return 0;
        const dx = this.touches[0].clientX - this.touches[1].clientX;
        const dy = this.touches[0].clientY - this.touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Clamp camera to map bounds
    clampCamera() {
        if (!this.tileMap) return;
        
        const worldWidth = this.tileMap.width * this.tileSize;
        const worldHeight = this.tileMap.height * this.tileSize;
        const screenWidth = this.canvas.width / this.zoom;
        const screenHeight = this.canvas.height / this.zoom;
        
        // Allow some padding
        const padding = 50;
        
        this.cameraX = Math.max(-padding, Math.min(worldWidth - screenWidth + padding, this.cameraX));
        this.cameraY = Math.max(-padding, Math.min(worldHeight - screenHeight + padding, this.cameraY));
    }

    // Convert screen coords to tile coords
    screenToTile(screenX, screenY) {
        const rect = this.canvas.getBoundingClientRect();
        const worldX = this.cameraX + (screenX - rect.left) / this.zoom;
        const worldY = this.cameraY + (screenY - rect.top) / this.zoom;
        
        return {
            x: Math.floor(worldX / this.tileSize),
            y: Math.floor(worldY / this.tileSize)
        };
    }

    // Main render method
    render() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Clear canvas
        ctx.fillStyle = '#001a33';
        ctx.fillRect(0, 0, width, height);
        
        if (!this.tileMap) return;
        
        // Calculate visible tile range
        const startX = Math.floor(this.cameraX / this.tileSize);
        const startY = Math.floor(this.cameraY / this.tileSize);
        const endX = Math.ceil((this.cameraX + width / this.zoom) / this.tileSize);
        const endY = Math.ceil((this.cameraY + height / this.zoom) / this.tileSize);
        
        // Apply camera transform
        ctx.save();
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.cameraX, -this.cameraY);
        
        // Render tiles
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                if (!this.tileMap.inBounds(x, y)) continue;
                
                const tile = this.tileMap.getTile(x, y);
                const color = this.tileMap.getTileColor(x, y);
                
                const px = x * this.tileSize;
                const py = y * this.tileSize;
                
                // Draw tile
                ctx.fillStyle = color;
                ctx.fillRect(px, py, this.tileSize, this.tileSize);
                
                // Draw special markers
                if (tile === TILES.PALACE) {
                    ctx.fillStyle = '#fff';
                    ctx.font = `${this.tileSize * 0.8}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('👑', px + this.tileSize/2, py + this.tileSize/2);
                }
            }
        }
        
        // Draw grid lines at high zoom
        if (this.zoom >= 2) {
            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            ctx.lineWidth = 0.5;
            
            for (let y = startY; y <= endY; y++) {
                ctx.beginPath();
                ctx.moveTo(startX * this.tileSize, y * this.tileSize);
                ctx.lineTo(endX * this.tileSize, y * this.tileSize);
                ctx.stroke();
            }
            
            for (let x = startX; x <= endX; x++) {
                ctx.beginPath();
                ctx.moveTo(x * this.tileSize, startY * this.tileSize);
                ctx.lineTo(x * this.tileSize, endY * this.tileSize);
                ctx.stroke();
            }
        }
        
        ctx.restore();
    }
}

window.GameCanvas = GameCanvas;
