import { Random } from '../utils/Random.js';
import { TileMap, TERRAIN } from './TileMap.js';

/**
 * IslandGenerator - Creates procedural island terrain
 * Generates: Main island (center) + 2 source islands (far left/right edges, random Y)
 */
export class IslandGenerator {
    constructor(widthOrTileMap, heightOrRandom, random) {
        if (typeof widthOrTileMap === 'number') {
            this.map = new TileMap(widthOrTileMap, heightOrRandom);
            this.random = random || new Random();
        } else {
            this.map = widthOrTileMap;
            this.random = heightOrRandom || new Random();
        }
    }

    generate() {
        // console.log('Generating islands...');

        // Step 1: Create height map
        const heightMap = this.generateHeightMap();

        // Step 2: Apply main island mask (center)
        this.applyMainIslandMask(heightMap);

        // Step 3: Add source islands (far left and right edges, random Y)
        this.addSourceIslands(heightMap);

        // Step 4: Convert height to tiles
        this.heightToTiles(heightMap);

        // Step 5: Add beaches
        this.addBeaches();

        // Step 5.5: Smooth coastlines to remove single-tile protrusions
        this.smoothCoastlines();

        // Step 6: Add forests
        this.addForests();

        // Step 7: Place the palace
        this.placePalace();

        // Step 8: Mark source islands for boat spawning
        this.markSourceIslands();

        // console.log('Island generation complete!');
        return this.map;
    }

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

    applyMainIslandMask(heightMap) {
        const width = this.map.width;
        const height = this.map.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radiusX = Math.min(width, height) * 0.32;  // Base radius
        const radiusY = radiusX;  // Circular base shape

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dx = (x - centerX) / radiusX;
                const dy = (y - centerY) / radiusY;

                // Calculate angle for angular noise
                const angle = Math.atan2(dy, dx);

                // Multi-octave angular noise for irregular coastline
                // First octave - large features (major bays, peninsulas)
                const angularNoise1 = this.noise2D(
                    Math.cos(angle) * 2.0 + centerX * 0.05,
                    Math.sin(angle) * 2.0 + centerY * 0.05
                ) * 0.35;  // 35% variation for major features

                // Second octave - medium features (coves, headlands)
                const angularNoise2 = this.noise2D(
                    Math.cos(angle) * 4.5 + centerX * 0.15,
                    Math.sin(angle) * 4.5 + centerY * 0.15
                ) * 0.15;  // 15% variation

                // Third octave - small features (rocky details)
                const angularNoise3 = this.noise2D(
                    Math.cos(angle) * 9 + centerX * 0.25,
                    Math.sin(angle) * 9 + centerY * 0.25
                ) * 0.08;  // 8% variation

                // Combine all noise layers (up to 58% total variation)
                const totalAngularNoise = angularNoise1 + angularNoise2 + angularNoise3;

                const dist = Math.sqrt(dx * dx + dy * dy) + totalAngularNoise;

                // Apply falloff with irregular edges
                let falloff;
                if (dist < 0.7) {
                    falloff = 1;
                } else if (dist < 1.0) {
                    falloff = 1 - ((dist - 0.7) / 0.3);
                    falloff = falloff * falloff * (3 - 2 * falloff);
                } else {
                    falloff = 0;
                }

                // Add coastal detail noise
                const coastNoise = this.noise2D(x * 0.1, y * 0.1) * 0.15;
                falloff = Math.max(0, Math.min(1, falloff + coastNoise));

                const idx = y * width + x;
                heightMap[idx] *= falloff;
            }
        }
    }


    addSourceIslands(heightMap) {
        const width = this.map.width;
        const height = this.map.height;

        // Random Y positions for each island (keep away from very top/bottom)
        const minY = height * 0.15;
        const maxY = height * 0.85;
        const leftY = minY + this.random.next() * (maxY - minY);
        const rightY = minY + this.random.next() * (maxY - minY);

        // Left source island - at the FAR left edge
        const leftIsland = {
            centerX: 18,  // Increased margin to prevent cutoff with irregular edges
            centerY: leftY,
            radiusX: 8,  // Larger island
            radiusY: 11,
            name: 'left'
        };

        // Right source island - at the FAR right edge
        const rightIsland = {
            centerX: width - 18,  // Increased margin to prevent cutoff with irregular edges
            centerY: rightY,
            radiusX: 8,  // Larger island
            radiusY: 11,
            name: 'right'
        };

        this.sourceIslands = [leftIsland, rightIsland];

        // console.log(`Source islands: Left at (${leftIsland.centerX}, ${Math.floor(leftY)}), Right at (${rightIsland.centerX}, ${Math.floor(rightY)})`);

        [leftIsland, rightIsland].forEach(island => {
            this.addIslandToHeightMap(heightMap, island);
        });
    }

    addIslandToHeightMap(heightMap, island) {
        const width = this.map.width;
        const height = this.map.height;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dx = (x - island.centerX) / island.radiusX;
                const dy = (y - island.centerY) / island.radiusY;

                // Calculate angle for angular noise
                const angle = Math.atan2(dy, dx);

                // Multi-octave angular noise for fractal detail
                // First octave - large features (bays, peninsulas)
                const angularNoise1 = this.noise2D(
                    Math.cos(angle) * 2.5 + island.centerX * 0.1,
                    Math.sin(angle) * 2.5 + island.centerY * 0.1
                ) * 0.35;  // 35% variation

                // Second octave - medium features (coves, headlands)
                const angularNoise2 = this.noise2D(
                    Math.cos(angle) * 5 + island.centerX * 0.2,
                    Math.sin(angle) * 5 + island.centerY * 0.2
                ) * 0.15;  // 15% variation

                // Third octave - small features (rocky outcrops)
                const angularNoise3 = this.noise2D(
                    Math.cos(angle) * 10 + island.centerX * 0.3,
                    Math.sin(angle) * 10 + island.centerY * 0.3
                ) * 0.08;  // 8% variation

                // Asymmetric noise - stronger on edges facing map boundaries
                let boundaryFactor = 1.0;
                if (island.name === 'left') {
                    // Left island - more irregular on left (west) side
                    const westFactor = Math.max(0, -Math.cos(angle)); // 0 to 1, max at angle=PI
                    boundaryFactor = 1.0 + westFactor * 0.3; // Up to 30% more noise on west side
                } else if (island.name === 'right') {
                    // Right island - more irregular on right (east) side
                    const eastFactor = Math.max(0, Math.cos(angle)); // 0 to 1, max at angle=0
                    boundaryFactor = 1.0 + eastFactor * 0.3; // Up to 30% more noise on east side
                }

                // Combine all noise layers with boundary factor
                const totalAngularNoise = (angularNoise1 + angularNoise2 + angularNoise3) * boundaryFactor;

                const dist = Math.sqrt(dx * dx + dy * dy) + totalAngularNoise;

                if (dist < 1.3) {
                    let islandHeight;
                    if (dist < 0.5) {
                        islandHeight = 0.5;
                    } else if (dist < 0.9) {
                        islandHeight = 0.5 * (1 - (dist - 0.5) / 0.4);
                    } else {
                        islandHeight = 0.32 * (1 - (dist - 0.9) / 0.4);
                    }

                    // Primary noise - increased from 0.08 to 0.15
                    const noise1 = this.noise2D(x * 0.2, y * 0.2) * 0.15;
                    // Secondary noise layer for more variation
                    const noise2 = this.noise2D(x * 0.5, y * 0.5) * 0.08;

                    islandHeight = Math.max(0, islandHeight + noise1 + noise2);

                    const idx = y * width + x;
                    heightMap[idx] = Math.max(heightMap[idx], islandHeight);
                }
            }
        }
    }

    /**
     * Smooth coastlines to remove single-tile protrusions that trap boats
     * Runs multiple passes to ensure clean edges
     */
    smoothCoastlines() {
        const width = this.map.width;
        const height = this.map.height;
        const TERRAIN = window.TERRAIN || { WATER: 1, DEEP_WATER: 0, SAND: 2, GRASS: 3 };

        // Run 3 passes for thorough smoothing
        for (let pass = 0; pass < 3; pass++) {
            const changes = [];

            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const current = this.map.getTerrainAt(x, y);

                    // Count neighbors
                    let waterCount = 0;
                    let landCount = 0;

                    // Check 8 neighbors
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const neighbor = this.map.getTerrainAt(x + dx, y + dy);
                            if (neighbor === TERRAIN.WATER || neighbor === TERRAIN.DEEP_WATER) {
                                waterCount++;
                            } else if (neighbor !== null) {
                                landCount++;
                            }
                        }
                    }

                    // Remove isolated land tiles (land surrounded by mostly water)
                    const isLand = current !== TERRAIN.WATER && current !== TERRAIN.DEEP_WATER;
                    if (isLand && waterCount >= 6) {
                        changes.push({ x, y, terrain: TERRAIN.WATER });
                    }

                    // Fill isolated water tiles (water surrounded by mostly land)
                    const isWater = current === TERRAIN.WATER || current === TERRAIN.DEEP_WATER;
                    if (isWater && landCount >= 6) {
                        changes.push({ x, y, terrain: TERRAIN.SAND });
                    }

                    // Remove single-tile protrusions (land with only 1-2 land neighbors)
                    if (isLand && landCount <= 2 && waterCount >= 5) {
                        changes.push({ x, y, terrain: TERRAIN.WATER });
                    }
                }
            }

            // Apply changes
            for (const change of changes) {
                this.map.setTerrain(change.x, change.y, change.terrain);
            }
        }
    }

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
                        // console.log(`Palace placed at ${x}, ${y}`);
                        return;
                    }
                }
            }
        }
    }

    markSourceIslands() {
        if (!this.sourceIslands) return;

        this.map.sourceIslands = this.sourceIslands.map(island => {
            const beachTiles = [];
            const width = this.map.width;
            const height = this.map.height;

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const dx = (x - island.centerX) / (island.radiusX * 1.5);
                    const dy = (y - island.centerY) / (island.radiusY * 1.5);
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 1.5) {
                        const terrain = this.map.getTerrainAt(x, y);
                        if (terrain === TERRAIN.SAND || terrain === TERRAIN.GRASS) {
                            if (this.map.isCoastal(x, y)) {
                                beachTiles.push({ x, y });
                            }
                        }
                    }
                }
            }

            // console.log(`Source island "${island.name}" at (${island.centerX}, ${Math.floor(island.centerY)}) has ${beachTiles.length} beach tiles`);

            return {
                name: island.name,
                centerX: island.centerX,
                centerY: island.centerY,
                beachTiles: beachTiles
            };
        });

        // console.log('Source islands marked:', this.map.sourceIslands.length);
    }
}

window.IslandGenerator = IslandGenerator;
