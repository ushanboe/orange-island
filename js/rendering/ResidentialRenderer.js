// js/rendering/ResidentialRenderer.js
// Custom rendering for residential allotments with detailed building graphics

import { RESIDENTIAL_PHASES, RESIDENTIAL_ICONS } from '../simulation/ResidentialAllotment.js';

export class ResidentialRenderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
    }

    // Main render function for a residential cell
    renderCell(x, y, tileSize, cellData, cameraX, cameraY) {
        // Only check for cellData - cell can be null for empty lots
        if (!cellData) return;
        console.log(`[ResidentialRenderer] renderCell at (${x},${y})`, cellData);

        const screenX = x * tileSize + cameraX;
        const screenY = y * tileSize + cameraY;

        const { cell, phase, progress, allotment } = cellData;

        // Draw base ground
        this.drawGround(screenX, screenY, tileSize, phase);

        // Draw building based on cell type
        switch (cell?.type) {
            case 'house':
                this.drawHouse(screenX, screenY, tileSize, cell.variant);
                break;
            case 'apartment':
                this.drawApartment(screenX, screenY, tileSize, cell.variant);
                break;
            case 'highrise':
                this.drawHighrise(screenX, screenY, tileSize, cell.tower, cellData.cellX, cellData.cellY);
                break;
            case 'courtyard':
                this.drawCourtyard(screenX, screenY, tileSize);
                break;
            case 'plaza':
                this.drawPlaza(screenX, screenY, tileSize);
                break;
            default:
                // Empty lot - show construction zone
                this.drawEmptyLot(screenX, screenY, tileSize, progress);
        }
    }

    // Draw ground/lot base
    drawGround(x, y, size, phase) {
        const ctx = this.ctx;

        // Grass base
        ctx.fillStyle = '#90EE90';
        ctx.fillRect(x, y, size, size);

        // Lot outline
        ctx.strokeStyle = '#228B22';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
    }

    // Draw empty construction lot
    drawEmptyLot(x, y, size, progress) {
        const ctx = this.ctx;

        // Dirt/construction ground
        ctx.fillStyle = '#DEB887';
        ctx.fillRect(x + 2, y + 2, size - 4, size - 4);

        // Construction stakes at corners
        ctx.fillStyle = '#8B4513';
        const stakeSize = Math.max(2, size / 10);
        ctx.fillRect(x + 3, y + 3, stakeSize, stakeSize);
        ctx.fillRect(x + size - 3 - stakeSize, y + 3, stakeSize, stakeSize);
        ctx.fillRect(x + 3, y + size - 3 - stakeSize, stakeSize, stakeSize);
        ctx.fillRect(x + size - 3 - stakeSize, y + size - 3 - stakeSize, stakeSize, stakeSize);

        // Progress indicator
        if (progress > 0) {
            ctx.fillStyle = '#FFD700';
            const barWidth = (size - 8) * (progress / 100);
            ctx.fillRect(x + 4, y + size - 6, barWidth, 3);
        }
    }

    // Draw a house
    drawHouse(x, y, size, variant = 0) {
        const ctx = this.ctx;
        const padding = size * 0.1;
        const houseX = x + padding;
        const houseY = y + padding;
        const houseW = size - padding * 2;
        const houseH = size - padding * 2;

        // House colors based on variant
        const colors = [
            { wall: '#F5DEB3', roof: '#8B0000', door: '#8B4513' },
            { wall: '#FFFAF0', roof: '#2F4F4F', door: '#A0522D' },
            { wall: '#FFF8DC', roof: '#4682B4', door: '#654321' }
        ];
        const color = colors[variant % colors.length];

        // House body
        ctx.fillStyle = color.wall;
        ctx.fillRect(houseX, houseY + houseH * 0.35, houseW, houseH * 0.65);

        // Roof (triangle)
        ctx.fillStyle = color.roof;
        ctx.beginPath();
        ctx.moveTo(houseX - 2, houseY + houseH * 0.35);
        ctx.lineTo(houseX + houseW / 2, houseY);
        ctx.lineTo(houseX + houseW + 2, houseY + houseH * 0.35);
        ctx.closePath();
        ctx.fill();

        // Door
        ctx.fillStyle = color.door;
        const doorW = houseW * 0.2;
        const doorH = houseH * 0.35;
        ctx.fillRect(houseX + houseW / 2 - doorW / 2, houseY + houseH - doorH, doorW, doorH);

        // Windows
        ctx.fillStyle = '#87CEEB';
        const winSize = houseW * 0.15;
        // Left window
        ctx.fillRect(houseX + houseW * 0.2, houseY + houseH * 0.45, winSize, winSize);
        // Right window
        ctx.fillRect(houseX + houseW * 0.65, houseY + houseH * 0.45, winSize, winSize);

        // Window frames
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(houseX + houseW * 0.2, houseY + houseH * 0.45, winSize, winSize);
        ctx.strokeRect(houseX + houseW * 0.65, houseY + houseH * 0.45, winSize, winSize);

        // Chimney (some houses)
        if (variant === 0) {
            ctx.fillStyle = '#696969';
            ctx.fillRect(houseX + houseW * 0.7, houseY + houseH * 0.1, houseW * 0.12, houseH * 0.2);
        }
    }

    // Draw an apartment building
    drawApartment(x, y, size, variant = 0) {
        const ctx = this.ctx;
        const padding = size * 0.05;
        const bldgX = x + padding;
        const bldgY = y + padding;
        const bldgW = size - padding * 2;
        const bldgH = size - padding * 2;

        // Building colors
        const colors = [
            { wall: '#B0C4DE', accent: '#4682B4' },
            { wall: '#D3D3D3', accent: '#808080' }
        ];
        const color = colors[variant % colors.length];

        // Main building
        ctx.fillStyle = color.wall;
        ctx.fillRect(bldgX, bldgY + bldgH * 0.1, bldgW, bldgH * 0.9);

        // Flat roof
        ctx.fillStyle = color.accent;
        ctx.fillRect(bldgX, bldgY + bldgH * 0.1, bldgW, bldgH * 0.08);

        // Windows grid (3x3)
        ctx.fillStyle = '#87CEEB';
        const winW = bldgW * 0.2;
        const winH = bldgH * 0.15;
        const winSpacingX = bldgW * 0.28;
        const winSpacingY = bldgH * 0.22;

        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const winX = bldgX + bldgW * 0.1 + col * winSpacingX;
                const winY = bldgY + bldgH * 0.22 + row * winSpacingY;

                // Some windows lit (yellow), some dark
                if (Math.random() > 0.3) {
                    ctx.fillStyle = '#87CEEB';
                } else {
                    ctx.fillStyle = '#FFE4B5';
                }
                ctx.fillRect(winX, winY, winW, winH);

                // Window frame
                ctx.strokeStyle = color.accent;
                ctx.lineWidth = 1;
                ctx.strokeRect(winX, winY, winW, winH);
            }
        }

        // Entrance
        ctx.fillStyle = '#4682B4';
        ctx.fillRect(bldgX + bldgW * 0.35, bldgY + bldgH * 0.85, bldgW * 0.3, bldgH * 0.15);
    }

    // Draw high-rise tower (spans multiple cells)
    drawHighrise(x, y, size, tower, cellX, cellY) {
        const ctx = this.ctx;

        // Tower 1 is top row, Tower 2 is bottom row
        // Middle row is plaza

        if (tower === 1) {
            // Top tower
            this.drawHighriseTower(x, y, size, cellX, 'top', '#4169E1');
        } else if (tower === 2) {
            // Bottom tower
            this.drawHighriseTower(x, y, size, cellX, 'bottom', '#6A5ACD');
        }
    }

    drawHighriseTower(x, y, size, cellX, position, baseColor) {
        const ctx = this.ctx;

        // Only draw full tower on center cell (cellX === 1)
        // Side cells show tower edge

        const padding = size * 0.05;
        const towerW = size - padding * 2;
        const towerH = size - padding * 2;

        // Glass facade
        const gradient = ctx.createLinearGradient(x, y, x + size, y);
        gradient.addColorStop(0, baseColor);
        gradient.addColorStop(0.5, '#B0C4DE');
        gradient.addColorStop(1, baseColor);

        ctx.fillStyle = gradient;
        ctx.fillRect(x + padding, y + padding, towerW, towerH);

        // Window grid
        ctx.fillStyle = '#87CEEB';
        const winW = towerW * 0.18;
        const winH = towerH * 0.12;

        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 4; col++) {
                const winX = x + padding + towerW * 0.08 + col * (winW + towerW * 0.05);
                const winY = y + padding + towerH * 0.05 + row * (winH + towerH * 0.04);

                // Random lit windows
                ctx.fillStyle = Math.random() > 0.4 ? '#87CEEB' : '#FFE4B5';
                ctx.fillRect(winX, winY, winW, winH);
            }
        }

        // Rooftop details (only on center cell)
        if (cellX === 1) {
            // Antenna
            ctx.strokeStyle = '#696969';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + size / 2, y + padding);
            ctx.lineTo(x + size / 2, y - size * 0.1);
            ctx.stroke();

            // Red light
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(x + size / 2, y - size * 0.1, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Draw courtyard (center of apartment ring)
    drawCourtyard(x, y, size) {
        const ctx = this.ctx;

        // Green grass
        ctx.fillStyle = '#228B22';
        ctx.fillRect(x + 2, y + 2, size - 4, size - 4);

        // Circular garden path
        ctx.strokeStyle = '#D2B48C';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size * 0.35, 0, Math.PI * 2);
        ctx.stroke();

        // Center fountain/tree
        ctx.fillStyle = '#006400';
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size * 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Fountain water
        ctx.fillStyle = '#00CED1';
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size * 0.08, 0, Math.PI * 2);
        ctx.fill();

        // Benches
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(x + size * 0.15, y + size / 2 - 2, size * 0.15, 4);
        ctx.fillRect(x + size * 0.7, y + size / 2 - 2, size * 0.15, 4);
    }

    // Draw plaza (between high-rises)
    drawPlaza(x, y, size) {
        const ctx = this.ctx;

        // Paved ground
        ctx.fillStyle = '#C0C0C0';
        ctx.fillRect(x, y, size, size);

        // Tile pattern
        ctx.strokeStyle = '#A9A9A9';
        ctx.lineWidth = 1;
        const tileCount = 4;
        const tileSize = size / tileCount;

        for (let i = 0; i <= tileCount; i++) {
            ctx.beginPath();
            ctx.moveTo(x + i * tileSize, y);
            ctx.lineTo(x + i * tileSize, y + size);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(x, y + i * tileSize);
            ctx.lineTo(x + size, y + i * tileSize);
            ctx.stroke();
        }

        // Some greenery
        ctx.fillStyle = '#228B22';
        ctx.beginPath();
        ctx.arc(x + size * 0.25, y + size * 0.5, size * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + size * 0.75, y + size * 0.5, size * 0.1, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw allotment boundary (for the whole 3x3)
    drawAllotmentBoundary(x, y, tileSize, cameraX, cameraY, phase) {
        const ctx = this.ctx;
        const screenX = x * tileSize + cameraX;
        const screenY = y * tileSize + cameraY;
        const totalSize = tileSize * 3;

        // Boundary color based on phase
        let borderColor = '#90EE90'; // Green for houses
        if (phase >= RESIDENTIAL_PHASES.APARTMENTS_1) {
            borderColor = '#4682B4'; // Blue for apartments
        }
        if (phase >= RESIDENTIAL_PHASES.HIGHRISE) {
            borderColor = '#9370DB'; // Purple for high-rises
        }

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(screenX, screenY, totalSize, totalSize);
        ctx.setLineDash([]);
    }

    // Draw progress bar for the whole allotment
    drawAllotmentProgress(x, y, tileSize, cameraX, cameraY, progress, phase, allotment) {
        const ctx = this.ctx;
        const screenX = x * tileSize + cameraX;
        const screenY = y * tileSize + cameraY;
        const totalSize = tileSize * 3;

        // Progress bar at bottom of allotment
        const barHeight = 4;
        const barY = screenY + totalSize - barHeight - 2;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(screenX + 4, barY, totalSize - 8, barHeight);

        // Progress fill
        const progressColor = phase >= RESIDENTIAL_PHASES.HIGHRISE ? '#9370DB' :
                             phase >= RESIDENTIAL_PHASES.APARTMENTS_1 ? '#4682B4' : '#32CD32';
        ctx.fillStyle = progressColor;
        ctx.fillRect(screenX + 4, barY, (totalSize - 8) * (progress / 100), barHeight);
        
        // Draw infrastructure status indicators
        if (allotment) {
            this.drawInfrastructureStatus(screenX, screenY, tileSize, allotment);
        }
    }
    
    // Draw infrastructure connection status icons
    drawInfrastructureStatus(screenX, screenY, tileSize, allotment) {
        const ctx = this.ctx;
        const iconSize = Math.max(10, tileSize * 0.4);
        const totalSize = tileSize * 3;
        
        // Position icons at top-right of allotment
        let iconX = screenX + totalSize - iconSize - 4;
        const iconY = screenY + 4;
        
        ctx.font = `${iconSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Power status
        if (allotment.hasPower === false) {
            // No power - show warning
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(iconX - iconSize/2 - 2, iconY - 2, iconSize + 4, iconSize + 4);
            ctx.fillText('⚡', iconX, iconY + iconSize/2);
            ctx.fillStyle = '#FF0000';
            ctx.font = `${iconSize * 0.6}px Arial`;
            ctx.fillText('❌', iconX + iconSize/3, iconY + iconSize/3);
            ctx.font = `${iconSize}px Arial`;
            iconX -= iconSize + 4;
        } else if (allotment.hasPower === true) {
            // Has power - show green
            ctx.fillText('⚡', iconX, iconY + iconSize/2);
            iconX -= iconSize + 4;
        }
        
        // Road status
        if (allotment.hasRoad === false) {
            // No road - show warning
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(iconX - iconSize/2 - 2, iconY - 2, iconSize + 4, iconSize + 4);
            ctx.fillText('🛣️', iconX, iconY + iconSize/2);
            ctx.fillStyle = '#FF0000';
            ctx.font = `${iconSize * 0.6}px Arial`;
            ctx.fillText('❌', iconX + iconSize/3, iconY + iconSize/3);
        } else if (allotment.hasRoad === true) {
            // Has road - show green
            ctx.fillText('🛣️', iconX, iconY + iconSize/2);
        }
    }
}
