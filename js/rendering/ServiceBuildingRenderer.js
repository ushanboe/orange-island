// js/rendering/ServiceBuildingRenderer.js
// Custom rendering for service buildings (Police, Fire, Hospital, School)

export class ServiceBuildingRenderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
    }

    // Main render function for a service building
    renderBuilding(x, y, tileSize, buildingType, cameraX, cameraY, isMainTile = true) {
        if (!isMainTile) return; // Only render from main tile

        const screenX = x * tileSize + cameraX;
        const screenY = y * tileSize + cameraY;
        const size = tileSize * 3; // 3x3 building

        // DEBUG: Log rendering details once per second
        if (!this._lastDebugTime || Date.now() - this._lastDebugTime > 1000) {
            console.log(`[RENDERER] Drawing ${buildingType}: tile(${x},${y}) -> screen(${screenX},${screenY}), size=${size}px`);
            this._lastDebugTime = Date.now();
        }

        switch (buildingType) {
            case 'policeStation':
                this.drawPoliceStation(screenX, screenY, size);
                break;
            case 'fireStation':
                this.drawFireStation(screenX, screenY, size);
                break;
            case 'hospital':
                this.drawHospital(screenX, screenY, size);
                break;
            case 'school':
                this.drawSchool(screenX, screenY, size);
                break;
        }
    }

    // Draw Police Station - Blue building with badge
    drawPoliceStation(x, y, size) {
        const ctx = this.ctx;
        const padding = size * 0.05;
        const buildingX = x + padding;
        const buildingY = y + padding;
        const buildingW = size - padding * 2;
        const buildingH = size - padding * 2;

        // Foundation/parking lot
        ctx.fillStyle = '#37474F';
        ctx.fillRect(x, y, size, size);

        // Parking lines
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(x + size * 0.1, y + size * (0.7 + i * 0.07));
            ctx.lineTo(x + size * 0.4, y + size * (0.7 + i * 0.07));
            ctx.stroke();
        }

        // Main building
        ctx.fillStyle = '#1565C0'; // Police blue
        ctx.fillRect(buildingX + buildingW * 0.1, buildingY + buildingH * 0.1, 
                     buildingW * 0.8, buildingH * 0.6);

        // Roof
        ctx.fillStyle = '#0D47A1';
        ctx.fillRect(buildingX + buildingW * 0.05, buildingY + buildingH * 0.05, 
                     buildingW * 0.9, buildingH * 0.1);

        // Windows
        ctx.fillStyle = '#BBDEFB';
        const windowSize = buildingW * 0.12;
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 4; col++) {
                ctx.fillRect(
                    buildingX + buildingW * 0.18 + col * (windowSize + buildingW * 0.08),
                    buildingY + buildingH * 0.2 + row * (windowSize + buildingH * 0.1),
                    windowSize, windowSize
                );
            }
        }

        // Door
        ctx.fillStyle = '#263238';
        ctx.fillRect(buildingX + buildingW * 0.4, buildingY + buildingH * 0.5, 
                     buildingW * 0.2, buildingH * 0.2);

        // Police badge/star
        this.drawStar(buildingX + buildingW * 0.5, buildingY + buildingH * 0.35, 
                      buildingW * 0.08, '#FFD700');

        // "POLICE" text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${Math.max(8, size * 0.08)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('POLICE', buildingX + buildingW * 0.5, buildingY + buildingH * 0.15);
    }

    // Draw Fire Station - Red building with garage doors
    drawFireStation(x, y, size) {
        const ctx = this.ctx;
        const padding = size * 0.05;
        const buildingX = x + padding;
        const buildingY = y + padding;
        const buildingW = size - padding * 2;
        const buildingH = size - padding * 2;

        // Foundation/driveway
        ctx.fillStyle = '#424242';
        ctx.fillRect(x, y, size, size);

        // Main building
        ctx.fillStyle = '#D32F2F'; // Fire red
        ctx.fillRect(buildingX + buildingW * 0.05, buildingY + buildingH * 0.1, 
                     buildingW * 0.9, buildingH * 0.65);

        // Roof
        ctx.fillStyle = '#B71C1C';
        ctx.fillRect(buildingX, buildingY + buildingH * 0.05, 
                     buildingW, buildingH * 0.1);

        // Garage doors (2 large doors)
        ctx.fillStyle = '#FFFFFF';
        const doorWidth = buildingW * 0.35;
        const doorHeight = buildingH * 0.45;

        // Left garage door
        ctx.fillRect(buildingX + buildingW * 0.1, buildingY + buildingH * 0.3, 
                     doorWidth, doorHeight);
        // Right garage door
        ctx.fillRect(buildingX + buildingW * 0.55, buildingY + buildingH * 0.3, 
                     doorWidth, doorHeight);

        // Garage door lines
        ctx.strokeStyle = '#BDBDBD';
        ctx.lineWidth = 1;
        for (let i = 1; i < 5; i++) {
            const lineY = buildingY + buildingH * 0.3 + (doorHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(buildingX + buildingW * 0.1, lineY);
            ctx.lineTo(buildingX + buildingW * 0.1 + doorWidth, lineY);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(buildingX + buildingW * 0.55, lineY);
            ctx.lineTo(buildingX + buildingW * 0.55 + doorWidth, lineY);
            ctx.stroke();
        }

        // Fire tower/hose tower
        ctx.fillStyle = '#C62828';
        ctx.fillRect(buildingX + buildingW * 0.8, buildingY - buildingH * 0.1, 
                     buildingW * 0.15, buildingH * 0.25);

        // "FIRE DEPT" text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${Math.max(7, size * 0.07)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('FIRE DEPT', buildingX + buildingW * 0.5, buildingY + buildingH * 0.2);

        // Fire symbol (simple flame)
        ctx.fillStyle = '#FF9800';
        ctx.beginPath();
        ctx.arc(buildingX + buildingW * 0.5, buildingY + buildingH * 0.85, 
                buildingW * 0.06, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw Hospital - White building with red cross
    drawHospital(x, y, size) {
        const ctx = this.ctx;
        const padding = size * 0.05;
        const buildingX = x + padding;
        const buildingY = y + padding;
        const buildingW = size - padding * 2;
        const buildingH = size - padding * 2;

        // Foundation/parking
        ctx.fillStyle = '#ECEFF1';
        ctx.fillRect(x, y, size, size);

        // Parking lines
        ctx.strokeStyle = '#90A4AE';
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(x + size * 0.6, y + size * (0.75 + i * 0.06));
            ctx.lineTo(x + size * 0.95, y + size * (0.75 + i * 0.06));
            ctx.stroke();
        }

        // Main building - white
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(buildingX + buildingW * 0.05, buildingY + buildingH * 0.15, 
                     buildingW * 0.9, buildingH * 0.6);

        // Building outline
        ctx.strokeStyle = '#B0BEC5';
        ctx.lineWidth = 2;
        ctx.strokeRect(buildingX + buildingW * 0.05, buildingY + buildingH * 0.15, 
                       buildingW * 0.9, buildingH * 0.6);

        // Roof
        ctx.fillStyle = '#ECEFF1';
        ctx.fillRect(buildingX, buildingY + buildingH * 0.1, 
                     buildingW, buildingH * 0.08);

        // Windows (many small ones)
        ctx.fillStyle = '#81D4FA';
        const windowSize = buildingW * 0.08;
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 6; col++) {
                ctx.fillRect(
                    buildingX + buildingW * 0.12 + col * (windowSize + buildingW * 0.05),
                    buildingY + buildingH * 0.25 + row * (windowSize + buildingH * 0.12),
                    windowSize, windowSize * 1.2
                );
            }
        }

        // Emergency entrance
        ctx.fillStyle = '#F44336';
        ctx.fillRect(buildingX + buildingW * 0.35, buildingY + buildingH * 0.55, 
                     buildingW * 0.3, buildingH * 0.2);

        // Entrance canopy
        ctx.fillStyle = '#E53935';
        ctx.fillRect(buildingX + buildingW * 0.3, buildingY + buildingH * 0.52, 
                     buildingW * 0.4, buildingH * 0.05);

        // Red Cross symbol
        this.drawRedCross(buildingX + buildingW * 0.5, buildingY + buildingH * 0.35, 
                          buildingW * 0.15);

        // "HOSPITAL" text
        ctx.fillStyle = '#D32F2F';
        ctx.font = `bold ${Math.max(7, size * 0.07)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('HOSPITAL', buildingX + buildingW * 0.5, buildingY + buildingH * 0.08);

        // Helipad (on roof area)
        ctx.strokeStyle = '#FFC107';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(buildingX + buildingW * 0.8, buildingY + buildingH * 0.25, 
                buildingW * 0.08, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#FFC107';
        ctx.font = `bold ${Math.max(6, size * 0.05)}px Arial`;
        ctx.fillText('H', buildingX + buildingW * 0.8, buildingY + buildingH * 0.27);
    }

    // Draw School - Yellow/tan building
    drawSchool(x, y, size) {
        const ctx = this.ctx;
        const padding = size * 0.05;
        const buildingX = x + padding;
        const buildingY = y + padding;
        const buildingW = size - padding * 2;
        const buildingH = size - padding * 2;

        // Playground/yard
        ctx.fillStyle = '#A5D6A7'; // Light green grass
        ctx.fillRect(x, y, size, size);

        // Playground area
        ctx.fillStyle = '#FFCC80';
        ctx.fillRect(x + size * 0.6, y + size * 0.7, size * 0.35, size * 0.25);

        // Main building - tan/yellow
        ctx.fillStyle = '#FDD835'; // School yellow
        ctx.fillRect(buildingX + buildingW * 0.05, buildingY + buildingH * 0.15, 
                     buildingW * 0.9, buildingH * 0.55);

        // Building outline
        ctx.strokeStyle = '#F9A825';
        ctx.lineWidth = 2;
        ctx.strokeRect(buildingX + buildingW * 0.05, buildingY + buildingH * 0.15, 
                       buildingW * 0.9, buildingH * 0.55);

        // Roof
        ctx.fillStyle = '#795548'; // Brown roof
        ctx.fillRect(buildingX, buildingY + buildingH * 0.1, 
                     buildingW, buildingH * 0.08);

        // Windows (classroom style - larger)
        ctx.fillStyle = '#81D4FA';
        const windowW = buildingW * 0.12;
        const windowH = buildingH * 0.15;
        for (let col = 0; col < 5; col++) {
            ctx.fillRect(
                buildingX + buildingW * 0.12 + col * (windowW + buildingW * 0.05),
                buildingY + buildingH * 0.25,
                windowW, windowH
            );
        }

        // Main entrance door
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(buildingX + buildingW * 0.4, buildingY + buildingH * 0.5, 
                     buildingW * 0.2, buildingH * 0.2);

        // Door frame
        ctx.strokeStyle = '#3E2723';
        ctx.lineWidth = 2;
        ctx.strokeRect(buildingX + buildingW * 0.4, buildingY + buildingH * 0.5, 
                       buildingW * 0.2, buildingH * 0.2);

        // Flag pole
        ctx.strokeStyle = '#9E9E9E';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(buildingX + buildingW * 0.15, buildingY + buildingH * 0.15);
        ctx.lineTo(buildingX + buildingW * 0.15, buildingY - buildingH * 0.1);
        ctx.stroke();

        // Flag
        ctx.fillStyle = '#F44336';
        ctx.fillRect(buildingX + buildingW * 0.15, buildingY - buildingH * 0.1, 
                     buildingW * 0.12, buildingH * 0.08);

        // "SCHOOL" text
        ctx.fillStyle = '#5D4037';
        ctx.font = `bold ${Math.max(8, size * 0.08)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('SCHOOL', buildingX + buildingW * 0.5, buildingY + buildingH * 0.08);

        // Clock on building
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(buildingX + buildingW * 0.5, buildingY + buildingH * 0.35, 
                buildingW * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Clock hands
        ctx.beginPath();
        ctx.moveTo(buildingX + buildingW * 0.5, buildingY + buildingH * 0.35);
        ctx.lineTo(buildingX + buildingW * 0.5, buildingY + buildingH * 0.32);
        ctx.moveTo(buildingX + buildingW * 0.5, buildingY + buildingH * 0.35);
        ctx.lineTo(buildingX + buildingW * 0.53, buildingY + buildingH * 0.35);
        ctx.stroke();
    }

    // Helper: Draw a star shape (for police badge)
    drawStar(cx, cy, radius, color) {
        const ctx = this.ctx;
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const x = cx + radius * Math.cos(angle);
            const y = cy + radius * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
    }

    // Helper: Draw red cross symbol
    drawRedCross(cx, cy, size) {
        const ctx = this.ctx;
        ctx.fillStyle = '#D32F2F';

        // Vertical bar
        ctx.fillRect(cx - size * 0.15, cy - size * 0.5, size * 0.3, size);
        // Horizontal bar
        ctx.fillRect(cx - size * 0.5, cy - size * 0.15, size, size * 0.3);
    }
}
