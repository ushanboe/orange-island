// js/rendering/IndustrialRenderer.js
// Custom rendering for industrial allotments

import { INDUSTRIAL_PHASES, INDUSTRIAL_ICONS } from '../simulation/IndustrialAllotment.js';

export class IndustrialRenderer {
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
                case 'workshop':
                    this.drawWorkshop(screenX, screenY, tileSize, cell.variant);
                    break;
                case 'factory':
                    this.drawFactory(screenX, screenY, tileSize, cell.variant);
                    break;
                case 'heavyIndustry':
                    this.drawHeavyIndustry(screenX, screenY, tileSize, cell.section);
                    break;
                case 'smokestack':
                    this.drawSmokestack(screenX, screenY, tileSize, cell.tall);
                    break;
                case 'complex':
                    this.drawComplex(screenX, screenY, tileSize, cell.section);
                    break;
                case 'warehouse':
                    this.drawWarehouse(screenX, screenY, tileSize);
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
        
        // Orange/brown tinted ground for industrial
        if (phase >= INDUSTRIAL_PHASES.INDUSTRIAL_COMPLEX) {
            ctx.fillStyle = '#BF360C'; // Dark orange
        } else if (phase >= INDUSTRIAL_PHASES.HEAVY_INDUSTRY) {
            ctx.fillStyle = '#E65100'; // Deep orange
        } else if (phase >= INDUSTRIAL_PHASES.FACTORIES_1) {
            ctx.fillStyle = '#FF9800'; // Orange
        } else {
            ctx.fillStyle = '#FFB74D'; // Light orange
        }
        
        ctx.fillRect(screenX, screenY, tileSize, tileSize);
    }

    drawWorkshop(screenX, screenY, tileSize, variant) {
        const ctx = this.ctx;
        const padding = Math.max(2, tileSize * 0.1);
        
        // Workshop building
        const colors = ['#FFF3E0', '#FFE0B2', '#FFCC80'];
        ctx.fillStyle = colors[variant % colors.length];
        ctx.fillRect(screenX + padding, screenY + padding, tileSize - padding * 2, tileSize - padding * 2);
        
        // Roof
        ctx.fillStyle = '#795548';
        ctx.fillRect(screenX + padding, screenY + padding, tileSize - padding * 2, tileSize * 0.2);
        
        // Door
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(screenX + tileSize * 0.35, screenY + tileSize * 0.5, tileSize * 0.3, tileSize * 0.4);
        
        // Icon
        if (tileSize >= 20) {
            ctx.font = `${Math.floor(tileSize * 0.35)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const icons = ['🔧', '⚙️', '🔩'];
            ctx.fillText(icons[variant % icons.length], screenX + tileSize / 2, screenY + tileSize * 0.35);
        }
    }

    drawFactory(screenX, screenY, tileSize, variant) {
        const ctx = this.ctx;
        const padding = Math.max(1, tileSize * 0.05);
        
        // Factory building
        ctx.fillStyle = '#FFCC80';
        ctx.fillRect(screenX + padding, screenY + padding, tileSize - padding * 2, tileSize - padding * 2);
        
        // Sawtooth roof
        ctx.fillStyle = '#6D4C41';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(screenX + tileSize * i / 3, screenY + tileSize * 0.25);
            ctx.lineTo(screenX + tileSize * (i + 0.5) / 3, screenY + padding);
            ctx.lineTo(screenX + tileSize * (i + 1) / 3, screenY + tileSize * 0.25);
            ctx.fill();
        }
        
        // Windows
        ctx.fillStyle = '#FFF8E1';
        for (let i = 0; i < 2; i++) {
            ctx.fillRect(screenX + tileSize * (0.15 + i * 0.45), screenY + tileSize * 0.4, tileSize * 0.25, tileSize * 0.2);
        }
        
        // Large door
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(screenX + tileSize * 0.3, screenY + tileSize * 0.65, tileSize * 0.4, tileSize * 0.3);
        
        if (tileSize >= 20) {
            ctx.font = `${Math.floor(tileSize * 0.3)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🏭', screenX + tileSize / 2, screenY + tileSize * 0.5);
        }
    }

    drawHeavyIndustry(screenX, screenY, tileSize, section) {
        const ctx = this.ctx;
        
        // Main building
        ctx.fillStyle = '#FFAB91';
        ctx.fillRect(screenX + 1, screenY + 1, tileSize - 2, tileSize - 2);
        
        // Industrial details
        ctx.fillStyle = '#BF360C';
        ctx.fillRect(screenX + 2, screenY + 2, tileSize - 4, tileSize * 0.15);
        
        // Pipes and machinery
        ctx.fillStyle = '#5D4037';
        if (section === 'center' || section === 'n' || section === 's') {
            ctx.fillRect(screenX + tileSize * 0.1, screenY + tileSize * 0.3, tileSize * 0.15, tileSize * 0.5);
            ctx.fillRect(screenX + tileSize * 0.75, screenY + tileSize * 0.3, tileSize * 0.15, tileSize * 0.5);
        }
        
        if (tileSize >= 16) {
            ctx.font = `${Math.floor(tileSize * 0.35)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⚗️', screenX + tileSize / 2, screenY + tileSize / 2);
        }
    }

    drawSmokestack(screenX, screenY, tileSize, tall) {
        const ctx = this.ctx;
        
        // Base
        ctx.fillStyle = '#795548';
        ctx.fillRect(screenX + tileSize * 0.2, screenY + tileSize * 0.5, tileSize * 0.6, tileSize * 0.5);
        
        // Smokestack
        ctx.fillStyle = '#5D4037';
        const stackWidth = tall ? tileSize * 0.3 : tileSize * 0.25;
        const stackHeight = tall ? tileSize * 0.7 : tileSize * 0.5;
        ctx.fillRect(screenX + (tileSize - stackWidth) / 2, screenY + tileSize * 0.5 - stackHeight, stackWidth, stackHeight);
        
        // Smoke
        ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
        ctx.beginPath();
        ctx.arc(screenX + tileSize / 2, screenY + tileSize * 0.15, tileSize * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(screenX + tileSize * 0.6, screenY + tileSize * 0.08, tileSize * 0.1, 0, Math.PI * 2);
        ctx.fill();
        
        if (tileSize >= 20) {
            ctx.font = `${Math.floor(tileSize * 0.4)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🏭', screenX + tileSize / 2, screenY + tileSize * 0.7);
        }
    }

    drawComplex(screenX, screenY, tileSize, section) {
        const ctx = this.ctx;
        
        if (section === 'factory1' || section === 'factory2') {
            // Factory buildings
            ctx.fillStyle = '#FF8A65';
            ctx.fillRect(screenX + 1, screenY + 1, tileSize - 2, tileSize - 2);
            
            // Roof
            ctx.fillStyle = '#4E342E';
            ctx.fillRect(screenX + 1, screenY + 1, tileSize - 2, tileSize * 0.2);
            
            if (tileSize >= 16) {
                ctx.font = `${Math.floor(tileSize * 0.4)}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🏭', screenX + tileSize / 2, screenY + tileSize / 2);
            }
        } else {
            // Main complex building
            ctx.fillStyle = '#FFAB91';
            ctx.fillRect(screenX + 1, screenY + 1, tileSize - 2, tileSize - 2);
            
            // Windows grid
            ctx.fillStyle = '#FFF3E0';
            for (let row = 0; row < 2; row++) {
                for (let col = 0; col < 2; col++) {
                    ctx.fillRect(
                        screenX + tileSize * (0.15 + col * 0.4),
                        screenY + tileSize * (0.2 + row * 0.35),
                        tileSize * 0.25,
                        tileSize * 0.2
                    );
                }
            }
        }
    }

    drawWarehouse(screenX, screenY, tileSize) {
        const ctx = this.ctx;
        
        // Warehouse building
        ctx.fillStyle = '#8D6E63';
        ctx.fillRect(screenX + 1, screenY + 1, tileSize - 2, tileSize - 2);
        
        // Corrugated roof
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(screenX + 1, screenY + 1, tileSize - 2, tileSize * 0.25);
        
        // Large door
        ctx.fillStyle = '#3E2723';
        ctx.fillRect(screenX + tileSize * 0.2, screenY + tileSize * 0.4, tileSize * 0.6, tileSize * 0.55);
        
        if (tileSize >= 16) {
            ctx.font = `${Math.floor(tileSize * 0.4)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('📦', screenX + tileSize / 2, screenY + tileSize / 2);
        }
    }

    drawEmptyLot(screenX, screenY, tileSize, progress) {
        const ctx = this.ctx;
        
        // Construction site
        ctx.fillStyle = '#FFCC80';
        ctx.fillRect(screenX + 1, screenY + 1, tileSize - 2, tileSize - 2);
        
        // Construction pattern
        ctx.strokeStyle = '#E65100';
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

        let borderColor = '#FF9800'; // Orange for workshops
        if (phase >= INDUSTRIAL_PHASES.FACTORIES_1) {
            borderColor = '#E65100'; // Darker orange
        }
        if (phase >= INDUSTRIAL_PHASES.INDUSTRIAL_COMPLEX) {
            borderColor = '#BF360C'; // Dark orange
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
        ctx.fillStyle = '#FF9800';
        ctx.fillRect(screenX + 2, barY, (totalSize - 4) * (progress / 100), barHeight);
    }
}
