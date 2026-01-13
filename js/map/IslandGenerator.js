import { Random } from '../utils/Random.js';
import { TileMap, TERRAIN } from './TileMap.js';

/**
 * IslandGenerator - Creates procedural island terrain
 */
export class IslandGenerator {
    constructor(widthOrTileMap, heightOrRandom, random) {
        // Support both: (width, height, random) and (tileMap, random)
        if (typeof widthOrTileMap === 'number') {
            // Called with (width, height, random)
            this.map = new TileMap(widthOrTileMap, heightOrRandom);
            this.random = random || new Random();
        } else {
            // Called with (tileMap, random)
            this.map = widthOrTileMap;
            this.random = heightOrRandom || new Random();
        }
    }

    // Main generation method
    generate() {
        console.log('Generating island...');
        
        // Step 1: Create height map using simplex-like noise
        const heightMap = this.generateHeightMap();
        
        // Step 2: Apply island mask (circular falloff)
        this.applyIslandMask(heightMap);
        
        // Step 3: Convert height to tiles
        this.heightToTiles(heightMap);
        
        // Step 4: Add beaches along coastlines
        this.addBeaches();
        
        // Step 5: Add forests
        this.addForests();
        
        // Step 6: Place the palace (center of island)
        this.placePalace();
        
        console.log('Island generation complete!');
        return this.map;
    }

    // Generate height map using value noise
    generateHeightMap() {
        const width = this.map.width;
        const height = this.map.height;
        const heightMap = new Float32Array(width * height);
        
        // Multiple octaves of noise for natural look
        const octaves = 4;
        const persistence = 0.5;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let value = 0;
                let amplitude = 1;
                let frequency = 0.02;
                let maxValue = 0;
                
                for (let o = 0; o < octaves; o++) {
                    value += this.noise2D(x * frequency, y * frequency) * amplitude;
                    maxValue += amplitude;
                    amplitude *= persistence;
                    frequency *= 2;
                }
                
                heightMap[y * width + x] = value / maxValue;
            }
        }
        
        return heightMap;
    }

    // Simple value noise (seeded)
    noise2D(x, y) {
        const xi = Math.floor(x);
        const yi = Math.floor(y);
        const xf = x - xi;
        const yf = y - yi;
        
        // Smooth interpolation
        const u = xf * xf * (3 - 2 * xf);
        const v = yf * yf * (3 - 2 * yf);
        
        // Hash corners
        const aa = this.hash(xi, yi);
        const ab = this.hash(xi, yi + 1);
        const ba = this.hash(xi + 1, yi);
        const bb = this.hash(xi + 1, yi + 1);
        
        // Bilinear interpolation
        const x1 = aa + u * (ba - aa);
        const x2 = ab + u * (bb - ab);
        
        return x1 + v * (x2 - x1);
    }

    // Hash function for noise
    hash(x, y) {
        let h = this.random.seed + x * 374761393 + y * 668265263;
        h = (h ^ (h >> 13)) * 1274126177;
        return ((h ^ (h >> 16)) & 0xFFFFFF) / 0xFFFFFF;
    }

    // Apply circular island mask
    applyIslandMask(heightMap) {
        const width = this.map.width;
        const height = this.map.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.min(width, height) * 0.42;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Distance from center (normalized)
                const dx = (x - centerX) / maxRadius;
                const dy = (y - centerY) / maxRadius;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                // Falloff function (smooth edge)
                let falloff;
                if (dist < 0.7) {
                    falloff = 1;
                } else if (dist < 1.0) {
                    falloff = 1 - ((dist - 0.7) / 0.3);
                    falloff = falloff * falloff * (3 - 2 * falloff); // Smoothstep
                } else {
                    falloff = 0;
                }
                
                // Add some noise to the coastline
                const coastNoise = this.noise2D(x * 0.1, y * 0.1) * 0.15;
                falloff = Math.max(0, Math.min(1, falloff + coastNoise - 0.1));
                
                heightMap[y * width + x] *= falloff;
            }
        }
    }

    // Convert height values to tile types
    heightToTiles(heightMap) {
        const width = this.map.width;
        const height = this.map.height;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const h = heightMap[y * width + x];
                let tile;
                
                if (h < 0.15) {
                    tile = TERRAIN.DEEP_WATER;
                } else if (h < 0.25) {
                    tile = TERRAIN.WATER;
                } else if (h < 0.32) {
                    tile = TERRAIN.SAND;
                } else if (h < 0.7) {
                    tile = TERRAIN.GRASS;
                } else if (h < 0.85) {
                    tile = TERRAIN.ROCK;
                } else {
                    tile = TERRAIN.MOUNTAIN;
                }
                
                this.map.setTile(x, y, tile);
            }
        }
    }

    // Add beaches along coastlines
    addBeaches() {
        const width = this.map.width;
        const height = this.map.height;
        const changes = [];
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const tile = this.map.getTerrainAt(x, y);
                
                // If grass and next to water, maybe make it sand
                if (tile === TERRAIN.GRASS && this.map.isCoastal(x, y)) {
                    if (this.random.bool(0.7)) {
                        changes.push([x, y, TERRAIN.SAND]);
                    }
                }
            }
        }
        
        // Apply changes
        changes.forEach(([x, y, tile]) => this.map.setTile(x, y, tile));
    }

    // Add forests to grass areas
    addForests() {
        const width = this.map.width;
        const height = this.map.height;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (this.map.getTerrainAt(x, y) === TERRAIN.GRASS) {
                    // Use noise for forest clusters
                    const forestNoise = this.noise2D(x * 0.08, y * 0.08);
                    if (forestNoise > 0.55 && this.random.bool(0.6)) {
                        this.map.setTile(x, y, TERRAIN.FOREST);
                    }
                }
            }
        }
    }

    // Place the palace near center of island
    placePalace() {
        const centerX = Math.floor(this.map.width / 2);
        const centerY = Math.floor(this.map.height / 2);
        
        // Find suitable spot near center
        for (let r = 0; r < 20; r++) {
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    const x = centerX + dx;
                    const y = centerY + dy;
                    
                    if (this.map.getTerrainAt(x, y) === TERRAIN.GRASS) {
                        // Clear 3x3 area for palace
                        for (let py = -1; py <= 1; py++) {
                            for (let px = -1; px <= 1; px++) {
                                this.map.setTile(x + px, y + py, TERRAIN.GRASS);
                            }
                        }
                        this.map.setTile(x, y, TERRAIN.PALACE);
                        console.log(`Palace placed at ${x}, ${y}`);
                        return;
                    }
                }
            }
        }
    }
}

window.IslandGenerator = IslandGenerator;
