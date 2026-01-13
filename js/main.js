/**
 * Main entry point for Island Kingdom
 */

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🏝️ Island Kingdom - Starting...');
    
    try {
        // Create and initialize game
        const game = new Game();
        await game.init();
        
        // Start game loop
        game.start();
        
        // Expose game globally for debugging
        window.game = game;
        
        console.log('🎮 Game is running!');
        
    } catch (error) {
        console.error('Failed to start game:', error);
        document.getElementById('loading-status').textContent = 'Error: ' + error.message;
    }
});

// Register service worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registered:', reg.scope))
            .catch(err => console.log('Service Worker registration failed:', err));
    });
}
