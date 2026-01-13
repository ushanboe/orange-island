/**
 * Boat - Trading ships that arrive at ports
 */
export class Boat {
    constructor(game, startX, startY, targetPort) {
        this.game = game;
        this.x = startX;
        this.y = startY;
        this.targetPort = targetPort;
        this.speed = 0.02; // tiles per frame
        this.state = 'arriving'; // arriving, docked, leaving
        this.dockedTime = 0;
        this.maxDockedTime = 300; // frames to stay docked

        // Cargo - what the boat is carrying
        this.cargo = this.generateCargo();
        this.cargoValue = this.calculateCargoValue();

        // Visual
        this.frame = 0;
        this.direction = 'left'; // left, right, up, down
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

        if (dist < 1) {
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
        // Move towards edge of map
        this.x -= this.speed * 2;

        // Remove when off screen
        if (this.x < -2) {
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
        const screenX = (this.x * tileSize) - offsetX;
        const screenY = (this.y * tileSize) - offsetY;

        // Don't render if off screen
        if (screenX < -tileSize * 2 || screenX > ctx.canvas.width + tileSize ||
            screenY < -tileSize * 2 || screenY > ctx.canvas.height + tileSize) {
            return;
        }

        // Draw boat
        ctx.save();
        ctx.translate(screenX + tileSize / 2, screenY + tileSize / 2);

        // Bobbing animation
        const bob = Math.sin(this.frame * 0.05) * 2;
        ctx.translate(0, bob);

        // Boat body
        ctx.fillStyle = '#8B4513'; // Brown hull
        ctx.beginPath();
        ctx.moveTo(-tileSize * 0.6, 0);
        ctx.lineTo(-tileSize * 0.4, tileSize * 0.3);
        ctx.lineTo(tileSize * 0.4, tileSize * 0.3);
        ctx.lineTo(tileSize * 0.6, 0);
        ctx.lineTo(tileSize * 0.4, -tileSize * 0.1);
        ctx.lineTo(-tileSize * 0.4, -tileSize * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#5D3A1A';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Sail
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(0, -tileSize * 0.1);
        ctx.lineTo(0, -tileSize * 0.7);
        ctx.lineTo(tileSize * 0.3, -tileSize * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#CCCCCC';
        ctx.stroke();

        // Mast
        ctx.strokeStyle = '#5D3A1A';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -tileSize * 0.1);
        ctx.lineTo(0, -tileSize * 0.75);
        ctx.stroke();

        // Flag on top (country of origin - random color)
        if (!this.flagColor) {
            const colors = ['#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#FF00FF', '#00FFFF'];
            this.flagColor = colors[Math.floor(Math.random() * colors.length)];
        }
        ctx.fillStyle = this.flagColor;
        ctx.fillRect(-2, -tileSize * 0.75, 10, 6);

        ctx.restore();

        // Draw cargo indicator when docked
        if (this.state === 'docked') {
            ctx.font = '16px Arial';
            ctx.fillText(this.cargo[0]?.icon || '📦', screenX + tileSize * 0.7, screenY);
        }
    }
}
