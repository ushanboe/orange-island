/**
 * Boat - Trading ships that arrive at ports
 */
export class Boat {
    constructor(game, startX, startY, targetPort) {
        this.game = game;
        this.x = startX;
        this.y = startY;
        this.targetPort = targetPort;
        this.speed = 0.08; // tiles per frame - INCREASED for visibility
        this.state = 'arriving'; // arriving, docked, leaving
        this.dockedTime = 0;
        this.maxDockedTime = 180; // frames to stay docked (3 seconds at 60fps)

        // Cargo - what the boat is carrying
        this.cargo = this.generateCargo();
        this.cargoValue = this.calculateCargoValue();

        // Visual
        this.frame = 0;
        this.direction = 'left'; // left, right, up, down
        this.spawnDirection = null; // Will be set based on spawn position
        this.flagColor = null;

        // Navigation - for avoiding islands
        this.avoidanceAngle = 0;
        this.avoidanceFrames = 0;
    }

    generateCargo() {
        const cargoTypes = [
            { type: 'goods', name: 'Consumer Goods', baseValue: 500, icon: '📦' },
            { type: 'materials', name: 'Building Materials', baseValue: 300, icon: '🧱' },
            { type: 'food', name: 'Food & Agriculture', baseValue: 200, icon: '🌾' },
            { type: 'luxury', name: 'Luxury Items', baseValue: 1000, icon: '💎' },
            { type: 'tech', name: 'Technology', baseValue: 800, icon: '💻' },
            { type: 'oil', name: 'Oil & Energy', baseValue: 600, icon: '🛢️' },
            { type: 'steel', name: 'Steel & Metals', baseValue: 400, icon: '⚙️' },
            { type: 'cars', name: 'Automobiles', baseValue: 900, icon: '🚗' },
        ];

        // Pick 1-3 random cargo types
        const numTypes = Math.floor(Math.random() * 3) + 1;
        const cargo = [];
        const shuffled = [...cargoTypes].sort(() => Math.random() - 0.5);

        for (let i = 0; i < numTypes; i++) {
            const item = shuffled[i];
            cargo.push({
                ...item,
                quantity: Math.floor(Math.random() * 50) + 10,
            });
        }

        return cargo;
    }

    calculateCargoValue() {
        return this.cargo.reduce((sum, item) => {
            return sum + (item.baseValue * item.quantity / 10);
        }, 0);
    }

    update() {
        if (this.state === 'arriving') {
            this.moveTowardsTarget();
        } else if (this.state === 'docked') {
            this.dockedTime++;
            if (this.dockedTime >= this.maxDockedTime) {
                this.state = 'leaving';
            }
        } else if (this.state === 'leaving') {
            this.moveAway();
        }

        this.frame++;
    }

    /**
     * Check if a position is water (safe to navigate)
     */
    isWater(x, y) {
        const map = this.game.tileMap || this.game.map;
        if (!map) return true;

        const tileX = Math.floor(x);
        const tileY = Math.floor(y);

        // Out of bounds is considered water (ocean)
        if (tileX < 0 || tileY < 0 || tileX >= map.width || tileY >= map.height) {
            return true;
        }

        const terrain = map.getTerrainAt(tileX, tileY);
        // WATER=0, DEEP_WATER=1 are safe
        return terrain === 0 || terrain === 1;
    }

    /**
     * Check if path ahead is clear for several tiles
     */
    isPathClear(fromX, fromY, dirX, dirY, distance = 3) {
        for (let i = 1; i <= distance; i++) {
            const checkX = fromX + dirX * i;
            const checkY = fromY + dirY * i;
            if (!this.isWater(checkX, checkY)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Find a clear direction to navigate around obstacles
     */
    findClearDirection(targetDirX, targetDirY) {
        // Try angles from -90 to +90 degrees from target direction
        const angles = [0, 30, -30, 60, -60, 90, -90, 120, -120, 150, -150, 180];
        const baseAngle = Math.atan2(targetDirY, targetDirX);

        for (const offsetDeg of angles) {
            const angle = baseAngle + (offsetDeg * Math.PI / 180);
            const dirX = Math.cos(angle);
            const dirY = Math.sin(angle);

            if (this.isPathClear(this.x, this.y, dirX, dirY, 4)) {
                return { dirX, dirY, angle: offsetDeg };
            }
        }

        // No clear path found, return original direction
        return { dirX: targetDirX, dirY: targetDirY, angle: 0 };
    }

    moveTowardsTarget() {
        if (!this.targetPort) {
            this.state = 'leaving';
            return;
        }

        const dx = this.targetPort.x - this.x;
        const dy = this.targetPort.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.5) {
            this.state = 'docked';
            this.x = this.targetPort.x;
            this.y = this.targetPort.y;
            this.onDocked();
            return;
        }

        // Normalize direction to target
        const targetDirX = dx / dist;
        const targetDirY = dy / dist;

        // Check if direct path is clear
        let moveDirX = targetDirX;
        let moveDirY = targetDirY;

        // If we're in avoidance mode, continue for a bit
        if (this.avoidanceFrames > 0) {
            this.avoidanceFrames--;
            const angle = this.avoidanceAngle;
            moveDirX = Math.cos(angle);
            moveDirY = Math.sin(angle);

            // Check if we can now head towards target
            if (this.avoidanceFrames % 10 === 0 && this.isPathClear(this.x, this.y, targetDirX, targetDirY, 5)) {
                this.avoidanceFrames = 0;
            }
        } else {
            // Check if path ahead is blocked
            if (!this.isPathClear(this.x, this.y, targetDirX, targetDirY, 3)) {
                const clearDir = this.findClearDirection(targetDirX, targetDirY);
                moveDirX = clearDir.dirX;
                moveDirY = clearDir.dirY;

                // Set avoidance mode for smoother navigation
                if (clearDir.angle !== 0) {
                    this.avoidanceAngle = Math.atan2(moveDirY, moveDirX);
                    this.avoidanceFrames = 30; // Continue this direction for 30 frames
                }
            }
        }

        // Move in the chosen direction
        const nextX = this.x + moveDirX * this.speed;
        const nextY = this.y + moveDirY * this.speed;

        // Final safety check - don't move into land
        if (this.isWater(nextX, nextY)) {
            this.x = nextX;
            this.y = nextY;
        } else {
            // Emergency: try to find any water tile nearby
            const emergencyAngles = [90, -90, 180, 45, -45, 135, -135];
            const baseAngle = Math.atan2(moveDirY, moveDirX);
            for (const offset of emergencyAngles) {
                const angle = baseAngle + (offset * Math.PI / 180);
                const emergX = this.x + Math.cos(angle) * this.speed;
                const emergY = this.y + Math.sin(angle) * this.speed;
                if (this.isWater(emergX, emergY)) {
                    this.x = emergX;
                    this.y = emergY;
                    this.avoidanceAngle = angle;
                    this.avoidanceFrames = 60;
                    break;
                }
            }
        }

        // Update direction for sprite
        if (Math.abs(moveDirX) > Math.abs(moveDirY)) {
            this.direction = moveDirX > 0 ? 'right' : 'left';
        } else {
            this.direction = moveDirY > 0 ? 'down' : 'up';
        }
    }

    moveAway() {
        // Move back towards the edge we came from, avoiding islands
        const speed = this.speed * 1.5;
        const mapWidth = this.game.map?.width || this.game.tileMap?.width || 64;
        const mapHeight = this.game.map?.height || this.game.tileMap?.height || 64;

        let targetX, targetY;

        switch(this.spawnDirection) {
            case 'right':
                targetX = mapWidth + 5;
                targetY = this.y;
                break;
            case 'top':
                targetX = this.x;
                targetY = -5;
                break;
            case 'bottom':
                targetX = this.x;
                targetY = mapHeight + 5;
                break;
            case 'left':
            default:
                targetX = -5;
                targetY = this.y;
                break;
        }

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 1) {
            this.remove = true;
            return;
        }

        const targetDirX = dx / dist;
        const targetDirY = dy / dist;

        // Use same navigation logic as arriving
        let moveDirX = targetDirX;
        let moveDirY = targetDirY;

        if (!this.isPathClear(this.x, this.y, targetDirX, targetDirY, 3)) {
            const clearDir = this.findClearDirection(targetDirX, targetDirY);
            moveDirX = clearDir.dirX;
            moveDirY = clearDir.dirY;
        }

        const nextX = this.x + moveDirX * speed;
        const nextY = this.y + moveDirY * speed;

        if (this.isWater(nextX, nextY)) {
            this.x = nextX;
            this.y = nextY;
        }

        // Check if reached edge
        if (this.x < -3 || this.x > mapWidth + 3 || this.y < -3 || this.y > mapHeight + 3) {
            this.remove = true;
        }
    }

    onDocked() {
        // Calculate tariff and trade
        const tariffSystem = this.game.tariffSystem;
        if (tariffSystem) {
            tariffSystem.processBoat(this);
        }
    }

    render(ctx, offsetX, offsetY, tileSize) {
        const screenX = (this.x * tileSize) + offsetX;
        const screenY = (this.y * tileSize) + offsetY;

        // Don't render if off screen
        if (screenX < -tileSize * 2 || screenX > ctx.canvas.width + tileSize * 2 ||
            screenY < -tileSize * 2 || screenY > ctx.canvas.height + tileSize * 2) {
            return;
        }

        // Draw boat
        ctx.save();
        ctx.translate(screenX + tileSize / 2, screenY + tileSize / 2);

        // Bobbing animation
        const bob = Math.sin(this.frame * 0.1) * 3;
        ctx.translate(0, bob);

        // Scale boat to be more visible
        const scale = 1.2;
        ctx.scale(scale, scale);

        // Boat hull (brown)
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.moveTo(-tileSize * 0.5, 0);
        ctx.lineTo(-tileSize * 0.35, tileSize * 0.25);
        ctx.lineTo(tileSize * 0.35, tileSize * 0.25);
        ctx.lineTo(tileSize * 0.5, 0);
        ctx.lineTo(tileSize * 0.35, -tileSize * 0.1);
        ctx.lineTo(-tileSize * 0.35, -tileSize * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#5D3A1A';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Deck
        ctx.fillStyle = '#A0522D';
        ctx.fillRect(-tileSize * 0.3, -tileSize * 0.1, tileSize * 0.6, tileSize * 0.15);

        // Mast
        ctx.strokeStyle = '#4A3728';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, -tileSize * 0.1);
        ctx.lineTo(0, -tileSize * 0.7);
        ctx.stroke();

        // Sail (white with slight curve)
        ctx.fillStyle = '#FFFEF0';
        ctx.beginPath();
        ctx.moveTo(0, -tileSize * 0.65);
        ctx.quadraticCurveTo(tileSize * 0.35, -tileSize * 0.4, tileSize * 0.25, -tileSize * 0.15);
        ctx.lineTo(0, -tileSize * 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#DDDDDD';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Flag on top
        if (!this.flagColor) {
            const colors = ['#FF4444', '#4444FF', '#44AA44', '#FFAA00', '#FF44FF', '#44FFFF', '#FF8800'];
            this.flagColor = colors[Math.floor(Math.random() * colors.length)];
        }
        ctx.fillStyle = this.flagColor;
        ctx.fillRect(2, -tileSize * 0.72, 12, 8);

        ctx.restore();

        // Draw cargo icon when docked or arriving close
        if (this.state === 'docked' || (this.state === 'arriving' && this.getDistanceToPort() < 5)) {
            ctx.font = 'bold 20px Arial';
            ctx.fillText(this.cargo[0]?.icon || '📦', screenX + tileSize * 0.8, screenY - 5);
        }

        // Draw state indicator for debugging
        if (this.state === 'docked') {
            ctx.fillStyle = '#00FF00';
            ctx.beginPath();
            ctx.arc(screenX + tileSize/2, screenY - tileSize * 0.5, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    getDistanceToPort() {
        if (!this.targetPort) return Infinity;
        const dx = this.targetPort.x - this.x;
        const dy = this.targetPort.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}
