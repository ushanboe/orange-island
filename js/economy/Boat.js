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
        this.flagColor = null;
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

        // Move towards port
        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;

        // Update direction for sprite
        if (Math.abs(dx) > Math.abs(dy)) {
            this.direction = dx > 0 ? 'right' : 'left';
        } else {
            this.direction = dy > 0 ? 'down' : 'up';
        }
    }

    moveAway() {
        // Move towards left edge of map
        this.x -= this.speed * 1.5;

        // Remove when off screen
        if (this.x < -3) {
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
