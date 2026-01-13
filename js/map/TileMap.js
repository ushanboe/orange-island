/**
 * TileMap - Manages the game world grid
 */

// Tile types
const TILES = {
    WATER_DEEP: 0,
    WATER_SHALLOW: 1,
    SAND: 2,
    GRASS: 3,
    FOREST: 4,
    ROCK: 5,
    MOUNTAIN: 6,
    
    // Zones (buildable)
    RESIDENTIAL: 10,
    COMMERCIAL: 11,
    INDUSTRIAL: 12,
    
    // Infrastructure
    ROAD: 20,
    HARBOR: 21,
    WALL: 22,
    GATE: 23,
    
    // Special buildings
    PALACE: 30,
    MONUMENT_SMALL: 31,
    MONUMENT_LARGE: 32,
    STATUE: 33,
    GOLF_COURSE: 34,
    
    // Services
    POLICE: 40,
    FIRE: 41,
    HOSPITAL: 42,
    SCHOOL: 43,
    
    // Power
    POWER_PLANT: 50,
    POWER_LINE: 51,
};

// Tile colors for rendering
const TILE_COLORS = {
    [TILES.WATER_DEEP]: '#0055aa',
    [TILES.WATER_SHALLOW]: '#0077cc',
    [TILES.SAND]: '#f4d03f',
    [TILES.GRASS]: '#27ae60',
    [TILES.FOREST]: '#1e8449',
    [TILES.ROCK]: '#7f8c8d',
    [TILES.MOUNTAIN]: '#5d6d7e',
    
    [TILES.RESIDENTIAL]: '#3498db',
    [TILES.COMMERCIAL]: '#9b59b6',
    [TILES.INDUSTRIAL]: '#f39c12',
    
    [TILES.ROAD]: '#34495e',
    [TILES.HARBOR]: '#8b4513',
    [TILES.WALL]: '#c0392b',
    [TILES.GATE]: '#e74c3c',
    
    [TILES.PALACE]: '#ffd700',
    [TILES.MONUMENT_SMALL]: '#f1c40f',
    [TILES.MONUMENT_LARGE]: '#d4ac0d',
    [TILES.STATUE]: '#b7950b',
    [TILES.GOLF_COURSE]: '#2ecc71',
    
    [TILES.POLICE]: '#2980b9',
    [TILES.FIRE]: '#e74c3c',
    [TILES.HOSPITAL]: '#ecf0f1',
    [TILES.SCHOOL]: '#8e44ad',
    
    [TILES.POWER_PLANT]: '#f39c12',
    [TILES.POWER_LINE]: '#95a5a6',
};

class TileMap {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        
        // Main tile data
        this.tiles = new Uint8Array(width * height);
        
        // Zone density (0-4 for development level)
        this.density = new Uint8Array(width * height);
        
        // Power grid (0 = no power, 1 = powered)
        this.power = new Uint8Array(width * height);
        
        // Land value (0-255)
        this.landValue = new Uint8Array(width * height);
        
        // Pollution level (0-255)
        this.pollution = new Uint8Array(width * height);
        
        // Crime level (0-255)
        this.crime = new Uint8Array(width * height);
        
        // Initialize all as deep water
        this.tiles.fill(TILES.WATER_DEEP);
    }

    // Get index from coordinates
    index(x, y) {
        return y * this.width + x;
    }

    // Check if coordinates are valid
    inBounds(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    // Get tile at position
    getTile(x, y) {
        if (!this.inBounds(x, y)) return TILES.WATER_DEEP;
        return this.tiles[this.index(x, y)];
    }

    // Set tile at position
    setTile(x, y, tile) {
        if (!this.inBounds(x, y)) return false;
        this.tiles[this.index(x, y)] = tile;
        return true;
    }

    // Get density at position
    getDensity(x, y) {
        if (!this.inBounds(x, y)) return 0;
        return this.density[this.index(x, y)];
    }

    // Set density at position
    setDensity(x, y, value) {
        if (!this.inBounds(x, y)) return;
        this.density[this.index(x, y)] = Math.max(0, Math.min(4, value));
    }

    // Check if tile is water
    isWater(x, y) {
        const tile = this.getTile(x, y);
        return tile === TILES.WATER_DEEP || tile === TILES.WATER_SHALLOW;
    }

    // Check if tile is land (buildable terrain)
    isLand(x, y) {
        const tile = this.getTile(x, y);
        return tile >= TILES.SAND && tile <= TILES.ROCK;
    }

    // Check if tile is buildable
    isBuildable(x, y) {
        const tile = this.getTile(x, y);
        return tile === TILES.GRASS || tile === TILES.SAND;
    }

    // Check if tile is coastal (land next to water)
    isCoastal(x, y) {
        if (!this.isLand(x, y)) return false;
        
        const neighbors = [
            [x-1, y], [x+1, y], [x, y-1], [x, y+1]
        ];
        
        return neighbors.some(([nx, ny]) => this.isWater(nx, ny));
    }

    // Get all neighbors of a tile
    getNeighbors(x, y, includeDiagonal = false) {
        const neighbors = [
            [x-1, y], [x+1, y], [x, y-1], [x, y+1]
        ];
        
        if (includeDiagonal) {
            neighbors.push(
                [x-1, y-1], [x+1, y-1], [x-1, y+1], [x+1, y+1]
            );
        }
        
        return neighbors.filter(([nx, ny]) => this.inBounds(nx, ny));
    }

    // Count neighbors of a specific type
    countNeighbors(x, y, tileType, includeDiagonal = false) {
        return this.getNeighbors(x, y, includeDiagonal)
            .filter(([nx, ny]) => this.getTile(nx, ny) === tileType)
            .length;
    }

    // Get color for a tile
    getTileColor(x, y) {
        const tile = this.getTile(x, y);
        return TILE_COLORS[tile] || '#ff00ff'; // Magenta for unknown
    }
}

// Export to global scope
window.TILES = TILES;
window.TILE_COLORS = TILE_COLORS;
window.TileMap = TileMap;
