// js/rendering/ServiceBuildingRenderer.js
// Custom rendering for service buildings (Police, Fire, Hospital, School)
// Buildings are 3x3 tiles but the main structure is 2x2 with surrounding decorations

export class ServiceBuildingRenderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
    }

    // Main render function for a service building
    renderBuilding(x, y, tileSize, buildingType, cameraX, cameraY, isMainTile = true, isActive = false) {
        if (!isMainTile) return; // Only render from main tile

        const screenX = x * tileSize + cameraX;
        const screenY = y * tileSize + cameraY;
        const totalSize = tileSize * 3; // 3x3 total area
        const buildingSize = tileSize * 2; // 2x2 main building

        switch (buildingType) {
            case 'policeStation':
                this.drawPoliceStation(screenX, screenY, tileSize, buildingSize, totalSize);
                break;
            case 'fireStation':
                this.drawFireStation(screenX, screenY, tileSize, buildingSize, totalSize);
                break;
            case 'hospital':
                this.drawHospital(screenX, screenY, tileSize, buildingSize, totalSize);
                break;
            case 'school':
                this.drawSchool(screenX, screenY, tileSize, buildingSize, totalSize);
                break;
        }

        // Draw status LED indicator in top-right corner of building
        this.drawStatusLED(screenX + buildingSize - tileSize * 0.3, screenY + tileSize * 0.15, tileSize, isActive);
    }

    // Draw a status LED indicator (green = active with power+road, red = inactive)
    drawStatusLED(x, y, tileSize, isActive) {
        const ctx = this.ctx;
        const ledSize = Math.max(4, tileSize * 0.15);

        // Outer glow
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, ledSize * 2);
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
        ctx.arc(x, y, ledSize * 2, 0, Math.PI * 2);
        ctx.fill();

        // LED body (dark housing)
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(x, y, ledSize * 1.2, 0, Math.PI * 2);
        ctx.fill();

        // LED light
        ctx.fillStyle = isActive ? '#00FF00' : '#FF0000';
        ctx.beginPath();
        ctx.arc(x, y, ledSize, 0, Math.PI * 2);
        ctx.fill();

        // Highlight reflection
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(x - ledSize * 0.3, y - ledSize * 0.3, ledSize * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw parking lot area
    drawParkingLot(x, y, width, height, vertical = true) {
        const ctx = this.ctx;

        // Asphalt
        ctx.fillStyle = '#37474F';
        ctx.fillRect(x, y, width, height);

        // Parking lines
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;

        if (vertical) {
            const spaces = Math.floor(width / (height * 0.4));
            for (let i = 1; i < spaces; i++) {
                const lineX = x + (width / spaces) * i;
                ctx.beginPath();
                ctx.moveTo(lineX, y + 2);
                ctx.lineTo(lineX, y + height - 2);
                ctx.stroke();
            }
        } else {
            const spaces = Math.floor(height / (width * 0.4));
            for (let i = 1; i < spaces; i++) {
                const lineY = y + (height / spaces) * i;
                ctx.beginPath();
                ctx.moveTo(x + 2, lineY);
                ctx.lineTo(x + width - 2, lineY);
                ctx.stroke();
            }
        }
    }

    // Draw garden/grass area with trees
    drawGarden(x, y, width, height, trees = 2) {
        const ctx = this.ctx;

        // Grass
        ctx.fillStyle = '#66BB6A';
        ctx.fillRect(x, y, width, height);

        // Trees
        const treeSize = Math.min(width, height) * 0.3;
        for (let i = 0; i < trees; i++) {
            const treeX = x + width * (0.25 + i * 0.5);
            const treeY = y + height * 0.5;

            // Tree trunk
            ctx.fillStyle = '#5D4037';
            ctx.fillRect(treeX - treeSize * 0.1, treeY, treeSize * 0.2, treeSize * 0.4);

            // Tree foliage
            ctx.fillStyle = '#2E7D32';
            ctx.beginPath();
            ctx.arc(treeX, treeY - treeSize * 0.1, treeSize * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Draw Police Station - Blue building with badge (2x2 building + parking)
    drawPoliceStation(x, y, tileSize, buildingSize, totalSize) {
        const ctx = this.ctx;

        // Layout: Building in top-left 2x2, parking on right and bottom
        const buildingX = x;
        const buildingY = y;

        // Draw parking lot on right side (1 tile wide, 3 tiles tall)
        this.drawParkingLot(x + buildingSize, y, tileSize, totalSize, false);

        // Draw parking lot on bottom (2 tiles wide, 1 tile tall)
        this.drawParkingLot(x, y + buildingSize, buildingSize, tileSize, true);

        // Main building background
        ctx.fillStyle = '#1565C0';
        ctx.fillRect(buildingX, buildingY, buildingSize, buildingSize);

        // Roof
        ctx.fillStyle = '#0D47A1';
        ctx.fillRect(buildingX, buildingY, buildingSize, buildingSize * 0.15);

        // Windows (2 rows, 3 columns)
        ctx.fillStyle = '#BBDEFB';
        const windowSize = buildingSize * 0.12;
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 3; col++) {
                ctx.fillRect(
                    buildingX + buildingSize * 0.15 + col * (windowSize + buildingSize * 0.12),
                    buildingY + buildingSize * 0.25 + row * (windowSize + buildingSize * 0.15),
                    windowSize, windowSize
                );
            }
        }

        // Door
        ctx.fillStyle = '#263238';
        ctx.fillRect(buildingX + buildingSize * 0.4, buildingY + buildingSize * 0.65,
                     buildingSize * 0.2, buildingSize * 0.35);

        // Police badge/star
        this.drawStar(buildingX + buildingSize * 0.5, buildingY + buildingSize * 0.45,
                      buildingSize * 0.1, '#FFD700');

        // "POLICE" text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${Math.max(8, buildingSize * 0.1)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('POLICE', buildingX + buildingSize * 0.5, buildingY + buildingSize * 0.12);

        // Police cars in parking (emojis)
        ctx.font = `${Math.max(10, tileSize * 0.6)}px Arial`;
        ctx.fillText('🚔', x + buildingSize + tileSize * 0.5, y + tileSize * 0.6);
        ctx.fillText('🚔', x + buildingSize + tileSize * 0.5, y + tileSize * 1.6);
    }

    // Draw Fire Station - Red building with garage doors (2x2 building + driveway)
    drawFireStation(x, y, tileSize, buildingSize, totalSize) {
        const ctx = this.ctx;

        // Layout: Building in top-left 2x2, driveway on right and bottom
        const buildingX = x;
        const buildingY = y;

        // Draw driveway on right side
        ctx.fillStyle = '#424242';
        ctx.fillRect(x + buildingSize, y, tileSize, totalSize);

        // Draw driveway on bottom
        ctx.fillStyle = '#424242';
        ctx.fillRect(x, y + buildingSize, buildingSize, tileSize);

        // Driveway markings
        ctx.strokeStyle = '#FFC107';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x + buildingSize + tileSize * 0.5, y);
        ctx.lineTo(x + buildingSize + tileSize * 0.5, y + totalSize);
        ctx.stroke();
        ctx.setLineDash([]);

        // Main building
        ctx.fillStyle = '#D32F2F';
        ctx.fillRect(buildingX, buildingY, buildingSize, buildingSize);

        // Roof
        ctx.fillStyle = '#B71C1C';
        ctx.fillRect(buildingX, buildingY, buildingSize, buildingSize * 0.12);

        // Garage doors (2 doors)
        ctx.fillStyle = '#FFFFFF';
        const doorWidth = buildingSize * 0.35;
        const doorHeight = buildingSize * 0.5;

        ctx.fillRect(buildingX + buildingSize * 0.08, buildingY + buildingSize * 0.35,
                     doorWidth, doorHeight);
        ctx.fillRect(buildingX + buildingSize * 0.57, buildingY + buildingSize * 0.35,
                     doorWidth, doorHeight);

        // Garage door lines
        ctx.strokeStyle = '#BDBDBD';
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
            const lineY = buildingY + buildingSize * 0.35 + (doorHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(buildingX + buildingSize * 0.08, lineY);
            ctx.lineTo(buildingX + buildingSize * 0.08 + doorWidth, lineY);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(buildingX + buildingSize * 0.57, lineY);
            ctx.lineTo(buildingX + buildingSize * 0.57 + doorWidth, lineY);
            ctx.stroke();
        }

        // Fire tower
        ctx.fillStyle = '#C62828';
        ctx.fillRect(buildingX + buildingSize * 0.85, buildingY - buildingSize * 0.15,
                     buildingSize * 0.12, buildingSize * 0.27);

        // "FIRE DEPT" text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${Math.max(7, buildingSize * 0.09)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('FIRE DEPT', buildingX + buildingSize * 0.5, buildingY + buildingSize * 0.2);

        // Fire trucks in driveway
        ctx.font = `${Math.max(10, tileSize * 0.6)}px Arial`;
        ctx.fillText('🚒', x + buildingSize + tileSize * 0.5, y + tileSize * 1.5);
        ctx.fillText('🚒', x + tileSize * 0.5, y + buildingSize + tileSize * 0.6);
    }

    // Draw Hospital - White building with red cross (2x2 building + parking + garden)
    drawHospital(x, y, tileSize, buildingSize, totalSize) {
        const ctx = this.ctx;

        // Layout: Building in top-left 2x2, parking on right, garden on bottom
        const buildingX = x;
        const buildingY = y;

        // Draw parking lot on right side
        this.drawParkingLot(x + buildingSize, y, tileSize, buildingSize, false);

        // Draw garden on bottom
        this.drawGarden(x, y + buildingSize, totalSize, tileSize, 3);

        // Main building - white
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(buildingX, buildingY, buildingSize, buildingSize);

        // Building outline
        ctx.strokeStyle = '#B0BEC5';
        ctx.lineWidth = 2;
        ctx.strokeRect(buildingX, buildingY, buildingSize, buildingSize);

        // Roof
        ctx.fillStyle = '#ECEFF1';
        ctx.fillRect(buildingX, buildingY, buildingSize, buildingSize * 0.1);

        // Windows (2 rows, 4 columns)
        ctx.fillStyle = '#81D4FA';
        const windowSize = buildingSize * 0.1;
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 4; col++) {
                ctx.fillRect(
                    buildingX + buildingSize * 0.1 + col * (windowSize + buildingSize * 0.1),
                    buildingY + buildingSize * 0.2 + row * (windowSize + buildingSize * 0.15),
                    windowSize, windowSize * 1.2
                );
            }
        }

        // Emergency entrance
        ctx.fillStyle = '#F44336';
        ctx.fillRect(buildingX + buildingSize * 0.35, buildingY + buildingSize * 0.65,
                     buildingSize * 0.3, buildingSize * 0.35);

        // Red Cross symbol
        this.drawRedCross(buildingX + buildingSize * 0.5, buildingY + buildingSize * 0.45,
                          buildingSize * 0.18);

        // "HOSPITAL" text
        ctx.fillStyle = '#D32F2F';
        ctx.font = `bold ${Math.max(6, buildingSize * 0.08)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('HOSPITAL', buildingX + buildingSize * 0.5, buildingY + buildingSize * 0.08);

        // Helipad on roof
        ctx.strokeStyle = '#FFC107';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(buildingX + buildingSize * 0.8, buildingY + buildingSize * 0.15,
                buildingSize * 0.08, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#FFC107';
        ctx.font = `bold ${Math.max(6, buildingSize * 0.06)}px Arial`;
        ctx.fillText('H', buildingX + buildingSize * 0.8, buildingY + buildingSize * 0.17);

        // Ambulances in parking
        ctx.font = `${Math.max(10, tileSize * 0.6)}px Arial`;
        ctx.fillText('🚑', x + buildingSize + tileSize * 0.5, y + tileSize * 0.6);
        ctx.fillText('🚑', x + buildingSize + tileSize * 0.5, y + tileSize * 1.5);
    }

    // Draw School - Yellow building (2x2 building + playground)
    drawSchool(x, y, tileSize, buildingSize, totalSize) {
        const ctx = this.ctx;

        // Layout: Building in top-left 2x2, playground on right and bottom
        const buildingX = x;
        const buildingY = y;

        // Draw playground on right side
        ctx.fillStyle = '#A5D6A7'; // Light green
        ctx.fillRect(x + buildingSize, y, tileSize, totalSize);

        // Playground equipment area
        ctx.fillStyle = '#FFCC80';
        ctx.fillRect(x + buildingSize + tileSize * 0.1, y + tileSize * 0.5,
                     tileSize * 0.8, tileSize * 0.8);

        // Draw sports field on bottom
        ctx.fillStyle = '#81C784';
        ctx.fillRect(x, y + buildingSize, buildingSize, tileSize);

        // Field lines
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + buildingSize * 0.1, y + buildingSize + tileSize * 0.1,
                       buildingSize * 0.8, tileSize * 0.8);
        ctx.beginPath();
        ctx.moveTo(x + buildingSize * 0.5, y + buildingSize + tileSize * 0.1);
        ctx.lineTo(x + buildingSize * 0.5, y + buildingSize + tileSize * 0.9);
        ctx.stroke();

        // Main building - yellow
        ctx.fillStyle = '#FDD835';
        ctx.fillRect(buildingX, buildingY, buildingSize, buildingSize);

        // Building outline
        ctx.strokeStyle = '#F9A825';
        ctx.lineWidth = 2;
        ctx.strokeRect(buildingX, buildingY, buildingSize, buildingSize);

        // Roof
        ctx.fillStyle = '#795548';
        ctx.fillRect(buildingX, buildingY, buildingSize, buildingSize * 0.1);

        // Windows (classroom style)
        ctx.fillStyle = '#81D4FA';
        const windowW = buildingSize * 0.15;
        const windowH = buildingSize * 0.18;
        for (let col = 0; col < 3; col++) {
            ctx.fillRect(
                buildingX + buildingSize * 0.12 + col * (windowW + buildingSize * 0.1),
                buildingY + buildingSize * 0.25,
                windowW, windowH
            );
        }

        // Main entrance door
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(buildingX + buildingSize * 0.4, buildingY + buildingSize * 0.6,
                     buildingSize * 0.2, buildingSize * 0.4);

        // Flag pole
        ctx.strokeStyle = '#9E9E9E';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(buildingX + buildingSize * 0.15, buildingY);
        ctx.lineTo(buildingX + buildingSize * 0.15, buildingY - buildingSize * 0.2);
        ctx.stroke();

        // Flag
        ctx.fillStyle = '#F44336';
        ctx.fillRect(buildingX + buildingSize * 0.15, buildingY - buildingSize * 0.2,
                     buildingSize * 0.15, buildingSize * 0.1);

        // "SCHOOL" text
        ctx.fillStyle = '#5D4037';
        ctx.font = `bold ${Math.max(7, buildingSize * 0.1)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('SCHOOL', buildingX + buildingSize * 0.5, buildingY + buildingSize * 0.18);

        // Clock
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(buildingX + buildingSize * 0.5, buildingY + buildingSize * 0.45,
                buildingSize * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();

        // School bus emoji
        ctx.font = `${Math.max(10, tileSize * 0.6)}px Arial`;
        ctx.fillText('🚌', x + buildingSize + tileSize * 0.5, y + tileSize * 2.5);
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
