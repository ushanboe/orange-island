// Main entry point for Island Kingdom
import { Game } from './core/Game.js';

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🏝️ Island Kingdom - The Mad King');
    console.log('Loading...');

    // Create and initialize game
    const game = new Game();

    // Expose game globally for debugging
    window.game = game;

    // Initialize
    await game.init();

    // Setup keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // S - Save
        if (e.key === 's' && e.ctrlKey) {
            e.preventDefault();
            game.save();
        }
        // L - Load
        if (e.key === 'l' && e.ctrlKey) {
            e.preventDefault();
            game.load();
        }
        // P - Pause
        if (e.key === 'p') {
            game.paused = !game.paused;
            game.kingTweet(game.paused ? "PAUSED! Time to think! ⏸️" : "Let's GO! ▶️");
        }
        // Escape - Deselect tool
        if (e.key === 'Escape') {
            if (game.toolManager) {
                game.toolManager.selectTool(null);
            }
        }
        // Number keys for quick tool selection
        if (e.key >= '1' && e.key <= '4') {
            const categories = ['zones', 'infrastructure', 'special', 'demolish'];
            const catIndex = parseInt(e.key) - 1;
            if (game.toolbar) {
                game.toolbar.selectCategory(categories[catIndex]);
            }
        }
    });

    console.log('✅ Game ready!');
    console.log('Controls:');
    console.log('  - Click/Tap: Place building');
    console.log('  - Drag: Pan map (or place roads/walls)');
    console.log('  - Scroll/Pinch: Zoom');
    console.log('  - P: Pause');
    console.log('  - Ctrl+S: Save');
    console.log('  - Ctrl+L: Load');
    console.log('  - 1-4: Quick category select');
    console.log('  - Esc: Deselect tool');
});
