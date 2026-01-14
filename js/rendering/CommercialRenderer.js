// js/rendering/CommercialRenderer.js
// Custom rendering for commercial allotments

import { COMMERCIAL_PHASES, COMMERCIAL_ICONS } from '../simulation/CommercialAllotment.js';

export class CommercialRenderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
    }

    renderCell(x, y, tileSize, cellData, cameraX, cameraY) {
        if (!cellData) return;

        const screenX = x * tileSize + cameraX;
        const screenY = y * tileSize + cameraY;

        const { cell, phase, progress, allotment } = cellData;

        // Draw ground first
        this.drawGround(screenX, screenY, tileSize, phase);

        // Draw building based on cell type
        if (cell) {
            switch (cell.type) {
                case 'shop':
                    this.drawShop(screenX, screenY, tileSize, cell.variant);
                    break;
                case 'stripMall':
                    this.drawStripMall(screenX, screenY, tileSize, cell.variant);
                    break;
                case 'shoppingCenter':
                    this.drawShoppingCenter(screenX, screenY, tileSize, cell.section);
                    break;
                case 'mall':
                    this.drawMall(screenX, screenY, tileSize, cell.section);
                    break;
                case 'parking':
                    this.drawParking(screenX, screenY, tileSize);
                    break;
                default:
                    this.drawEmptyLot(screenX, screenY, tileSize, progress);
            }
        } else {
            this.drawEmptyLot(screenX, screenY, tileSize, progress);
        }
    }

    drawGround(screenX, screenY, tileSize, phase) {
        const ctx = this.ctx;
        
        // Blue-tinted ground for commercial
        if (phase >= COMMERCIAL_PHASES.MALL_COMPLEX) {
            ctx.fillStyle = '#1565C0'; // Dark blue for mall
        } else if (phase >= COMMERCIAL_PHASES.SHOPPING_CENTER) {
            ctx.fillStyle = '#1976D2'; // Medium blue
        } else if (phase >= COMMERCIAL_PHASES.STRIP_MALL_1) {
            ctx.fillStyle = '#2196F3'; // Blue
        } else {
            ctx.fillStyle = '#64B5F6'; // Light blue
        }
        
        ctx.fillRect(screenX, screenY, tileSize, tileSize);
    }

    drawShop(screenX, screenY, tileSize, variant) {
        const ctx = this.ctx;
        const padding = Math.max(2, tileSize * 0.1);
        
        // Shop building
        const colors = ['#E3F2FD', '#BBDEFB', '#90CAF9'];
        ctx.fillStyle = colors[variant % colors.length];
        ctx.fillRect(screenX + padding, screenY + padding, tileSize - padding * 2, tileSize - padding * 2);
        
        // Storefront
        ctx.fillStyle = '#1976D2';
        ctx.fillRect(screenX + padding, screenY + tileSize * 0.6, tileSize - padding * 2, tileSize * 0.3);
        
        // Door
        ctx.fillStyle = '#0D47A1';
        ctx.fillRect(screenX + tileSize * 0.4, screenY + tileSize * 0.65, tileSize * 0.2, tileSize * 0.25);
        
        // Icon
        if (tileSize >= 20) {
            ctx.font = `${Math.floor(tileSize * 0.4)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const icons = ['🏪', '🛒', '🛍️'];
            ctx.fillText(icons[variant % icons.length], screenX + tileSize / 2, screenY + tileSize * 0.35);
        }
    }

    drawStripMall(screenX, screenY, tileSize, variant) {
        const ctx = this.ctx;
        const padding = Math.max(1, tileSize * 0.05);
        
        // Larger building
        ctx.fillStyle = '#BBDEFB';
        ctx.fillRect(screenX + padding, screenY + padding, tileSize - padding * 2, tileSize - padding * 2);
        
        // Awning
        ctx.fillStyle = '#1565C0';
        ctx.fillRect(screenX + padding, screenY + tileSize * 0.15, tileSize - padding * 2, tileSize * 0.15);
        
        // Windows
        ctx.fillStyle = '#E3F2FD';
        for (let i = 0; i < 2; i++) {
            ctx.fillRect(screenX + tileSize * (0.2 + i * 0.4), screenY + tileSize * 0.4, tileSize * 0.2, tileSize * 0.2);
        }
        
        // Entrance
        ctx.fillStyle = '#0D47A1';
        ctx.fillRect(screenX + tileSize * 0.35, screenY + tileSize * 0.7, tileSize * 0.3, tileSize * 0.25);
        
        if (tileSize >= 20) {
            ctx.font = `${Math.floor(tileSize * 0.35)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🏬', screenX + tileSize / 2, screenY + tileSize * 0.5);
        }
    }

    drawShoppingCenter(screenX, screenY, tileSize, section) {
        const ctx = this.ctx;
        
        // Main building
        ctx.fillStyle = '#90CAF9';
        ctx.fillRect(screenX + 1, screenY + 1, tileSize - 2, tileSize - 2);
        
        // Section-specific details
        if (section === 'center') {
            // Central atrium
            ctx.fillStyle = '#E3F2FD';
            ctx.fillRect(screenX + tileSize * 0.2, screenY + tileSize * 0.2, tileSize * 0.6, tileSize * 0.6);
            
            if (tileSize >= 20) {
                ctx.font = `${Math.floor(tileSize * 0.5)}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🛍️', screenX + tileSize / 2, screenY + tileSize / 2);
            }
        } else {
            // Store sections
            ctx.fillStyle = '#1976D2';
            ctx.fillRect(screenX + tileSize * 0.1, screenY + tileSize * 0.7, tileSize * 0.8, tileSize * 0.2);
        }
    }

    drawMall(screenX, screenY, tileSize, section) {
        const ctx = this.ctx;
        
        if (section === 'atrium') {
            // Glass atrium
            ctx.fillStyle = '#E1F5FE';
            ctx.fillRect(screenX + 1, screenY + 1, tileSize - 2, tileSize - 2);
            
            // Glass dome effect
            ctx.strokeStyle = '#0288D1';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(screenX + tileSize / 2, screenY + tileSize / 2, tileSize * 0.35, 0, Math.PI * 2);
            ctx.stroke();
            
            if (tileSize >= 20) {
                ctx.font = `${Math.floor(tileSize * 0.4)}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🏢', screenX + tileSize / 2, screenY + tileSize / 2);
            }
        } else {
            // Main mall building
            ctx.fillStyle = '#64B5F6';
            ctx.fillRect(screenX + 1, screenY + 1, tileSize - 2, tileSize - 2);
            
            // Windows
            ctx.fillStyle = '#E3F2FD';
            for (let row = 0; row < 2; row++) {
                for (let col = 0; col < 2; col++) {
                    ctx.fillRect(
                        screenX + tileSize * (0.15 + col * 0.4),
                        screenY + tileSize * (0.15 + row * 0.4),
                        tileSize * 0.25,
                        tileSize * 0.25
                    );
                }
            }
        }
    }

    drawParking(screenX, screenY, tileSize) {
        const ctx = this.ctx;
        
        // Asphalt
        ctx.fillStyle = '#37474F';
        ctx.fillRect(screenX, screenY, tileSize, tileSize);
        
        // Parking lines
        ctx.strokeStyle = '#ECEFF1';
        ctx.lineWidth = 1;
        for (let i = 1; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(screenX + tileSize * i / 3, screenY + 2);
            ctx.lineTo(screenX + tileSize * i / 3, screenY + tileSize - 2);
            ctx.stroke();
        }
        
        if (tileSize >= 16) {
            ctx.font = `${Math.floor(tileSize * 0.4)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🅿️', screenX + tileSize / 2, screenY + tileSize / 2);
        }
    }

    drawEmptyLot(screenX, screenY, tileSize, progress) {
        const ctx = this.ctx;
        
        // Construction site
        ctx.fillStyle = '#90CAF9';
        ctx.fillRect(screenX + 1, screenY + 1, tileSize - 2, tileSize - 2);
        
        // Construction pattern
        ctx.strokeStyle = '#1976D2';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(screenX + 3, screenY + 3, tileSize - 6, tileSize - 6);
        ctx.setLineDash([]);
        
        if (tileSize >= 16) {
            ctx.font = `${Math.floor(tileSize * 0.5)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🏗️', screenX + tileSize / 2, screenY + tileSize / 2);
        }
    }

    drawAllotmentBoundary(x, y, tileSize, cameraX, cameraY, phase) {
        const ctx = this.ctx;
        const screenX = x * tileSize + cameraX;
        const screenY = y * tileSize + cameraY;
        const totalSize = tileSize * 3;

        let borderColor = '#2196F3'; // Blue for shops
        if (phase >= COMMERCIAL_PHASES.STRIP_MALL_1) {
            borderColor = '#1976D2'; // Darker blue
        }
        if (phase >= COMMERCIAL_PHASES.MALL_COMPLEX) {
            borderColor = '#0D47A1'; // Dark blue
        }

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(screenX, screenY, totalSize, totalSize);
        ctx.setLineDash([]);
    }

    drawAllotmentProgress(x, y, tileSize, cameraX, cameraY, progress, phase) {
        const ctx = this.ctx;
        const screenX = x * tileSize + cameraX;
        const screenY = y * tileSize + cameraY;
        const totalSize = tileSize * 3;

        const barHeight = 4;
        const barY = screenY + totalSize - barHeight - 2;

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(screenX + 2, barY, totalSize - 4, barHeight);

        // Progress
        ctx.fillStyle = '#2196F3';
        ctx.fillRect(screenX + 2, barY, (totalSize - 4) * (progress / 100), barHeight);
    }
}
