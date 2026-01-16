/**
 * PoliceOfficer.js
 * Animated police officer that walks from station to build walls
 */

export class PoliceOfficer {
    constructor(startX, startY, targetX, targetY, stationKey) {
        this.x = startX;
        this.y = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.stationKey = stationKey;

        // Animation state
        this.state = 'walking';  // 'walking', 'building', 'returning', 'done'
        this.progress = 0;  // 0 to 1 for animation progress
        this.speed = 0.02;  // Movement speed per frame

        // Visual properties
        this.size = 8;  // Officer size in pixels
        this.carryingBrick = true;
        this.buildProgress = 0;  // 0 to 1 for building animation

        // Path
        this.path = this.calculatePath(startX, startY, targetX, targetY);
        this.pathIndex = 0;

        // Animation frame
        this.frame = 0;
        this.frameCounter = 0;
    }

    /**
     * Calculate simple path from start to target
     * Uses direct line with slight randomization for natural movement
     */
    calculatePath(startX, startY, targetX, targetY) {
        const path = [];
        const steps = 20;  // Number of waypoints

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = startX + (targetX - startX) * t;
            const y = startY + (targetY - startY) * t;

            // Add slight randomization for natural movement
            const offsetX = (Math.random() - 0.5) * 0.3;
            const offsetY = (Math.random() - 0.5) * 0.3;

            path.push({ x: x + offsetX, y: y + offsetY });
        }

        return path;
    }

    /**
     * Update officer animation - called each frame
     */
    update() {
        this.frameCounter++;

        if (this.state === 'walking') {
            // Move along path
            if (this.pathIndex < this.path.length - 1) {
                const current = this.path[this.pathIndex];
                const next = this.path[this.pathIndex + 1];

                this.progress += this.speed;

                if (this.progress >= 1) {
                    this.progress = 0;
                    this.pathIndex++;
                }

                // Interpolate position
                this.x = current.x + (next.x - current.x) * this.progress;
                this.y = current.y + (next.y - current.y) * this.progress;

                // Walking animation (bob up and down)
                this.frame = Math.floor(this.frameCounter / 5) % 4;
            } else {
                // Reached destination, start building
                this.state = 'building';
                this.buildProgress = 0;
            }
        } else if (this.state === 'building') {
            // Building animation
            this.buildProgress += 0.01;

            // Hammer animation (move up and down)
            this.frame = Math.floor(this.frameCounter / 3) % 2;

            if (this.buildProgress >= 1) {
                // Building complete
                this.state = 'done';
                this.carryingBrick = false;
            }
        }

        return this.state !== 'done';
    }

    /**
     * Render officer on canvas
     */
    render(ctx, tileSize, offsetX, offsetY) {
        const screenX = this.x * tileSize + offsetX;
        const screenY = this.y * tileSize + offsetY;

        ctx.save();

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(screenX, screenY + this.size, this.size * 0.6, this.size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Walking bob animation
        let bobOffset = 0;
        if (this.state === 'walking') {
            bobOffset = Math.sin(this.frameCounter * 0.2) * 2;
        }

        // Draw officer body (blue uniform)
        ctx.fillStyle = '#1E3A8A';  // Dark blue
        ctx.beginPath();
        ctx.arc(screenX, screenY - this.size / 2 + bobOffset, this.size / 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw officer head (skin tone)
        ctx.fillStyle = '#F5C99B';
        ctx.beginPath();
        ctx.arc(screenX, screenY - this.size + bobOffset, this.size / 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw police hat
        ctx.fillStyle = '#1E3A8A';
        ctx.fillRect(screenX - this.size / 3, screenY - this.size - 2 + bobOffset, this.size * 0.66, 3);

        // Draw brick if carrying
        if (this.carryingBrick) {
            ctx.fillStyle = '#A0522D';  // Brick color
            ctx.fillRect(screenX - 3, screenY - this.size / 2 - 4 + bobOffset, 6, 4);

            // Brick texture
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(screenX - 3, screenY - this.size / 2 - 4 + bobOffset, 6, 4);
        }

        // Building animation - hammer
        if (this.state === 'building') {
            const hammerY = this.frame === 0 ? -15 : -10;
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(screenX + 4, screenY + hammerY, 2, 8);
            ctx.fillStyle = '#666';
            ctx.fillRect(screenX + 2, screenY + hammerY, 6, 3);

            // Building progress indicator
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(screenX - 10, screenY - 20, 20, 3);
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(screenX - 10, screenY - 20, 20 * this.buildProgress, 3);
        }

        ctx.restore();
    }
}
