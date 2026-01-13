/**
 * Random - Seeded random number generator for reproducible maps
 */
export class Random {
    constructor(seed = Date.now()) {
        this.seed = seed;
        this.current = seed;
    }

    // Simple seeded random using mulberry32
    next() {
        let t = this.current += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    // Random integer between min and max (inclusive)
    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    // Random float between min and max
    nextFloat(min, max) {
        return this.next() * (max - min) + min;
    }

    // Random boolean with optional probability
    nextBool(probability = 0.5) {
        return this.next() < probability;
    }


    // Alias for nextBool
    bool(probability = 0.5) {
        return this.nextBool(probability);
    }

    // Pick random element from array
    pick(array) {
        return array[this.nextInt(0, array.length - 1)];
    }

    // Shuffle array in place
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = this.nextInt(0, i);
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}
