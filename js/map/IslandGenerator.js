import { Random } from '../utils/Random.js';
import { TileMap, TERRAIN } from './TileMap.js';

/**
 * IslandGenerator - Creates procedural island terrain
 * Now generates: Main island (center) + 2 source islands (left/right edges)
 */
export class IslandGenerator {
    constructor(widthOrTileMap, heightOrRandom, random) {
        // Support both: (width, height, random) and (tileMap, random)
        if (typeof widthOrTileMap === 'number') {
            this.map = new TileMap(widthOrTileMap, heightOrRandom);
            this.random = random || new Random();
        } else {
            this.map = widthOrTileMap;
            this.random = heightOrRandom || new Random();
        }
    }

    // Main generation method
    generate() {
        console.log('Generating islands...');

        // Step 1: Create height map using simplex-like noise
        const heightMap = this.generateHeightMap();

        // Step 2: Apply main island mask (center)
        this.applyMainIslandMask(heightMap);

        // Step 3: Add source islands (left and right)
        this.addSourceIslands(heightMap);

        // Step 4: Convert height to tiles
        this.heightToTiles(heightMap);

        // Step 5: Add beaches along coastlines
        this.addBeaches();

        // Step 6: Add forests
        this.addForests();

        // Step 7: Place the palace (center of main island)
        this.placePalace();

        // Step 8: Mark source islands for boat spawning
        this.markSourceIslands();

        console.log('Island generation complete!');
        return this.map;
    }

    // Generate height map using value noise
    generateHeightMap() {
        const width = this.map.width;
        const height = this.map.height;
        const heightMap = new Float32Array(width * height);

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

        const u = xf * xf * (3 - 2 * xf);
        const v = yf * yf * (3 - 2 * yf);

        const aa = this.hash(xi, yi);
        const ab = this.hash(xi, yi + 1);
        const ba = this.hash(xi + 1, yi);
        const bb = this.hash(xi + 1, yi + 1);

        const x1 = aa + u * (ba - aa);
        const x2 = ab + u * (bb - ab);

        return x1 + v * (x2 - x1);
    }

    hash(x, y) {
        let h = this.random.seed + x * 374761393 + y * 668265263;
        h = (h ^ (h >> 13)) * 1274126177;
        return ((h ^ (h >> 16)) & 0xFFFFFF) / 0xFFFFFF;
    }

    // Apply main island mask (center of map)
    applyMainIslandMask(heightMap) {
        const width = this.map.width;
        const height = this.map.height;
        const centerX = width / 2;
        const centerY = height / 2;
        // Main island takes up about 60% of the map width
        const maxRadius = Math.min(width, height) * 0.35;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dx = (x - centerX) / maxRadius;
                const dy = (y - centerY) / maxRadius;
                const dist = Math.sqrt(dx * dx + dy * dy);

                let falloff;
                if (dist < 0.7) {
                    falloff = 1;
                } else if (dist < 1.0) {
                    falloff = 1 - ((dist - 0.7) / 0.3);
                    falloff = falloff * falloff * (3 - 2 * falloff);
                } else {
                    falloff = 0;
                }

                const coastNoise = this.noise2D(x * 0.1, y * 0.1) * 0.15;
                falloff = Math.max(0, Math.min(1, falloff + coastNoise - 0.1));

                heightMap[y * width + x] *= falloff;
            }
        }
    }

    // Add source islands on left and right edges
    addSourceIslands(heightMap) {
        const width = this.map.width;
        const height = this.map.height;

        // Left source island - positioned at left edge, middle height
        const leftIsland = {
            centerX: 12,  // Near left edge
            centerY: height / 2,
            radiusX: 10,
            radiusY: 15,
            name: 'left'
        };

        // Right source island - positioned at right edge, middle height
        const rightIsland = {
            centerX: width - 12,  // Near right edge
            centerY: height / 2,
            radiusX: 10,
            radiusY: 15,
            name: 'right'
        };

        // Store island info for later use
        this.sourceIslands = [leftIsland, rightIsland];

        // Add each source island to the height map
        [leftIsland, rightIsland].forEach(island => {
            this.addIslandToHeightMap(heightMap, island);
        });
    }

    addIslandToHeightMap(heightMap, island) {
        const width = this.map.width;
        const height = this.map.height;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Elliptical distance
                const dx = (x - island.centerX) / island.radiusX;
                const dy = (y - island.centerY) / island.radiusY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 1.2) {
                    let islandHeight;
                    if (dist < 0.6) {
                        islandHeight = 0.5;  // Solid land
                    } else if (dist < 1.0) {
                        // Gradual falloff
                        islandHeight = 0.5 * (1 - (dist - 0.6) / 0.4);
                    } else {
                        islandHeight = 0.3 * (1 - (dist - 1.0) / 0.2);  // Beach
                    }

                    // Add noise for natural coastline
                    const noise = this.noise2D(x * 0.15, y * 0.15) * 0.1;
                    islandHeight = Math.max(0, islandHeight + noise);

                    // Combine with existing height (take max)
                    const idx = y * width + x;
                    heightMap[idx] = Math.max(heightMap[idx], islandHeight);
                }
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

                if (tile === TERRAIN.GRASS && this.map.isCoastal(x, y)) {
                    if (this.random.bool(0.7)) {
                        changes.push([x, y, TERRAIN.SAND]);
                    }
                }
            }
        }

        changes.forEach(([x, y, tile]) => this.map.setTile(x, y, tile));
    }

    // Add forests to grass areas
    addForests() {
        const width = this.map.width;
        const height = this.map.height;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (this.map.getTerrainAt(x, y) === TERRAIN.GRASS) {
                    const forestNoise = this.noise2D(x * 0.08, y * 0.08);
                    if (forestNoise > 0.55 && this.random.bool(0.6)) {
                        this.map.setTile(x, y, TERRAIN.FOREST);
                    }
                }
            }
        }
    }

    // Place the palace near center of main island
    placePalace() {
        const centerX = Math.floor(this.map.width / 2);
        const centerY = Math.floor(this.map.height / 2);

        for (let r = 0; r < 20; r++) {
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    const x = centerX + dx;
                    const y = centerY + dy;

                    if (this.map.getTerrainAt(x, y) === TERRAIN.GRASS) {
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

    // Mark source islands in the map metadata for boat spawning
    markSourceIslands() {
        if (!this.sourceIslands) return;

        // Store source island data in the map for later use
        this.map.sourceIslands = this.sourceIslands.map(island => {
            // Find beach tiles on this island for boat spawning
            const beachTiles = [];
            const width = this.map.width;
            const height = this.map.height;

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const dx = (x - island.centerX) / island.radiusX;
                    const dy = (y - island.centerY) / island.radiusY;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    // Check if this is a beach tile on this island
                    if (dist < 1.3) {
                        const terrain = this.map.getTerrainAt(x, y);
                        if (terrain === TERRAIN.SAND || terrain === TERRAIN.GRASS) {
                            // Check if adjacent to water (coastal)
                            if (this.map.isCoastal(x, y)) {
                                beachTiles.push({ x, y });
                            }
                        }
                    }
                }
            }

            console.log(`Source island "${island.name}" has ${beachTiles.length} beach tiles`);

            return {
                name: island.name,
                centerX: island.centerX,
                centerY: island.centerY,
                beachTiles: beachTiles
            };
        });

        console.log('Source islands marked:', this.map.sourceIslands.length);
    }
}

window.IslandGenerator = IslandGenerator;
