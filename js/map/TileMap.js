// TileMap - Manages the game world grid with terrain and buildings

export const TERRAIN = {
    DEEP_WATER: 0,
    WATER: 1,
    SAND: 2,
    BEACH: 3,
    GRASS: 4,
    DIRT: 5,
    FOREST: 6,
    ROCK: 7,
    MOUNTAIN: 8,
    PALACE: 9,
    WALL: 10
};

export const TERRAIN_COLORS = {
    [TERRAIN.DEEP_WATER]: '#1a5276',
    [TERRAIN.WATER]: '#2980b9',
    [TERRAIN.SAND]: '#f4d03f',
    [TERRAIN.BEACH]: '#f9e79f',
    [TERRAIN.GRASS]: '#27ae60',
    [TERRAIN.DIRT]: '#8b7355',
    [TERRAIN.FOREST]: '#1e8449',
    [TERRAIN.ROCK]: '#7f8c8d',
    [TERRAIN.MOUNTAIN]: '#5d6d7e',
    [TERRAIN.PALACE]: '#ffd700',
    [TERRAIN.WALL]: '#8B4513'
};

export const TERRAIN_NAMES = {
    [TERRAIN.DEEP_WATER]: 'deepwater',
    [TERRAIN.WATER]: 'water',
    [TERRAIN.SAND]: 'sand',
    [TERRAIN.BEACH]: 'beach',
    [TERRAIN.GRASS]: 'grass',
    [TERRAIN.DIRT]: 'dirt',
    [TERRAIN.FOREST]: 'forest',
    [TERRAIN.ROCK]: 'rock',
    [TERRAIN.MOUNTAIN]: 'mountain',
    [TERRAIN.PALACE]: 'palace',
    [TERRAIN.WALL]: 'wall'
};

export class TileMap {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.tiles = [];

        // Initialize empty map
        for (let y = 0; y < height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < width; x++) {
                this.tiles[y][x] = {
                    terrain: TERRAIN.WATER,
                    building: null,
                    population: 0,
                    jobs: 0,
                    pollution: 0,
                    landValue: 0,
                    powered: false,
                    connected: false  // Connected to road network
                };
            }
        }
    }

    // Check if coordinates are in bounds
    isInBounds(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    // Get tile at position (returns full tile object)
    getTile(x, y) {
        if (!this.isInBounds(x, y)) return null;
        return this.tiles[y][x];
    }

    // Get terrain value at position (for IslandGenerator compatibility)
    getTerrainAt(x, y) {
        if (!this.isInBounds(x, y)) return null;
        // Extra safety check
        if (!this.tiles || !this.tiles[y] || !this.tiles[y][x]) {
            console.warn(`[TileMap] Invalid tile access at (${x}, ${y})`);
            return null;
        }
        return this.tiles[y][x].terrain;
    }

    // Set tile terrain (alias for setTerrain for IslandGenerator compatibility)
    setTile(x, y, terrain) {
        if (!this.isInBounds(x, y)) return;
        this.tiles[y][x].terrain = terrain;
    }

    // Check if tile is coastal (adjacent to water)
    isCoastal(x, y) {
        if (!this.isInBounds(x, y)) return false;
        const tile = this.tiles[y][x];
        // Must be land tile
        if (tile.terrain === TERRAIN.WATER || tile.terrain === TERRAIN.DEEP_WATER) {
            return false;
        }
        // Check if any neighbor is water
        const dirs = [[-1,0], [1,0], [0,-1], [0,1]];
        for (const [dx, dy] of dirs) {
            const nx = x + dx;
            const ny = y + dy;
            if (this.isInBounds(nx, ny)) {
                const neighbor = this.tiles[ny][nx];
                if (neighbor.terrain === TERRAIN.WATER || neighbor.terrain === TERRAIN.DEEP_WATER) {
                    return true;
                }
            }
        }
        return false;
    }

    // Set terrain at position
    setTerrain(x, y, terrain) {
        if (!this.isInBounds(x, y)) return;
        this.tiles[y][x].terrain = terrain;
        if (terrain === 10) {  // WALL
            console.log(`[TILEMAP] WALL placed at (${x}, ${y}), terrain value: ${terrain}`);
        }
    }

    // Get terrain type name
    getTileType(terrainValue) {
        return TERRAIN_NAMES[terrainValue] || 'unknown';
    }

    // Get terrain color
    getTerrainColor(terrain) {
        return TERRAIN_COLORS[terrain] || '#000000';
    }

    // Set building at position
    setBuilding(x, y, building) {
        if (!this.isInBounds(x, y)) return;
        this.tiles[y][x].building = building;
    }

    // Get building at position
    getBuilding(x, y) {
        if (!this.isInBounds(x, y)) return null;
        return this.tiles[y][x].building;
    }

    // Check if tile has a building
    hasBuilding(x, y) {
        const tile = this.getTile(x, y);
        return tile && tile.building !== null;
    }

    // Check if tile is buildable (land, not water)
    isBuildable(x, y) {
        const tile = this.getTile(x, y);
        if (!tile) return false;
        // Can't build on deep water or regular water
        return tile.terrain !== TERRAIN.DEEP_WATER && 
               tile.terrain !== TERRAIN.WATER;
    }

    // Count buildings of a specific type
    countBuildings(buildingType) {
        let count = 0;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const building = this.tiles[y][x].building;
                if (building && building.type === buildingType) {
                    // Only count main tiles for multi-tile buildings
                    if (building.mainTile !== false) {
                        count++;
                    }
                }
            }
        }
        return count;
    }

    // Get all buildings of a type
    getBuildingsOfType(buildingType) {
        const buildings = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const building = this.tiles[y][x].building;
                if (building && building.type === buildingType && building.mainTile !== false) {
                    buildings.push({ x, y, building });
                }
            }
        }
        return buildings;
    }

    // Get all tiles with buildings
    getAllBuildings() {
        const buildings = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const building = this.tiles[y][x].building;
                if (building && building.mainTile !== false) {
                    buildings.push({ x, y, building });
                }
            }
        }
        return buildings;
    }

    // Calculate total wall coverage (for immigration effects)
    getWallCoverage() {
        const wallCount = this.countBuildings('wall');
        // Estimate perimeter based on map size
        const estimatedPerimeter = (this.width + this.height) * 2;
        return Math.min(1, wallCount / estimatedPerimeter);
    }

    // Find coastal tiles (for port placement)
    getCoastalTiles() {
        const coastal = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.tiles[y][x];
                if (tile.terrain === TERRAIN.BEACH || tile.terrain === TERRAIN.SAND) {
                    // Check if adjacent to water
                    const neighbors = this.getNeighbors(x, y);
                    const nearWater = neighbors.some(n =>
                        n.terrain === TERRAIN.WATER || n.terrain === TERRAIN.DEEP_WATER
                    );
                    if (nearWater) {
                        coastal.push({ x, y, tile });
                    }
                }
            }
        }
        return coastal;
    }

    // Find perimeter tiles for wall building (grass/forest adjacent to water)
    findPerimeterTiles() {
        const perimeter = [];

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.tiles[y][x];

                // Must be grass or forest (buildable land)
                if (tile.terrain !== TERRAIN.GRASS && tile.terrain !== TERRAIN.FOREST) {
                    continue;
                }

                // Must not already be a wall
                if (tile.terrain === TERRAIN.WALL) {
                    continue;
                }

                // Check if adjacent to water (perimeter condition)
                const neighbors = this.getNeighbors(x, y);
                const hasWater = neighbors.some(n =>
                    n.terrain === TERRAIN.WATER || n.terrain === TERRAIN.DEEP_WATER
                );

                if (hasWater) {
                    perimeter.push({ x, y, tile });
                }
            }
        }

        return perimeter;
    }
    // Get neighboring tiles
    getNeighbors(x, y) {
        const neighbors = [];
        const dirs = [[-1,0], [1,0], [0,-1], [0,1]];
        for (const [dx, dy] of dirs) {
            const tile = this.getTile(x + dx, y + dy);
            if (tile) {
                neighbors.push(tile);
            }
        }
        return neighbors;
    }

    // Serialize map for saving
    serialize() {
        return {
            width: this.width,
            height: this.height,
            tiles: this.tiles
        };
    }

    // Load map from saved data
    static deserialize(data) {
        const map = new TileMap(data.width, data.height);
        map.tiles = data.tiles;
        return map;
    }
}
