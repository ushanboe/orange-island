/**
 * StartMenu - Startup menu UI for New Game / Continue
 */

export class StartMenu {
    constructor(game) {
        this.game = game;
        this.element = null;
        this.onNewGame = null;
        this.onContinue = null;
    }

    /**
     * Create and show the start menu
     */
    show(hasSavedGame) {
        // Create menu container
        this.element = document.createElement('div');
        this.element.id = 'start-menu';
        this.element.innerHTML = `
            <div class="start-menu-overlay">
                <div class="start-menu-content">
                    <h1 class="start-menu-title">🏝️ Island Kingdom</h1>
                    <p class="start-menu-subtitle">A Satirical City Builder</p>
                    <div class="start-menu-buttons">
                        <button id="btn-new-game" class="start-menu-btn start-menu-btn-new">
                            🆕 New Game
                        </button>
                        ${hasSavedGame ? `
                        <button id="btn-continue" class="start-menu-btn start-menu-btn-continue">
                            ▶️ Continue
                        </button>
                        ` : ''}
                    </div>
                    <p class="start-menu-version">v82</p>
                </div>
            </div>
        `;

        // Add styles
        this.addStyles();

        // Add to document
        document.body.appendChild(this.element);

        // Setup event listeners
        document.getElementById('btn-new-game').addEventListener('click', () => {
            this.hide();
            if (this.onNewGame) this.onNewGame();
        });

        if (hasSavedGame) {
            document.getElementById('btn-continue').addEventListener('click', () => {
                this.hide();
                if (this.onContinue) this.onContinue();
            });
        }
    }

    /**
     * Hide and remove the start menu
     */
    hide() {
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }

    /**
     * Add CSS styles for the start menu
     */
    addStyles() {
        // Check if styles already exist
        if (document.getElementById('start-menu-styles')) return;

        const style = document.createElement('style');
        style.id = 'start-menu-styles';
        style.textContent = `
            .start-menu-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #01579b 100%);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }

            .start-menu-content {
                text-align: center;
                padding: 40px 60px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 20px;
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }

            .start-menu-title {
                font-size: 48px;
                color: #fff;
                margin: 0 0 10px 0;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
            }

            .start-menu-subtitle {
                font-size: 18px;
                color: rgba(255, 255, 255, 0.8);
                margin: 0 0 40px 0;
                font-style: italic;
            }

            .start-menu-buttons {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }

            .start-menu-btn {
                padding: 15px 40px;
                font-size: 20px;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.3s ease;
                font-weight: bold;
                min-width: 200px;
            }

            .start-menu-btn-new {
                background: linear-gradient(135deg, #4CAF50, #45a049);
                color: white;
                box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
            }

            .start-menu-btn-new:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(76, 175, 80, 0.6);
            }

            .start-menu-btn-continue {
                background: linear-gradient(135deg, #2196F3, #1976D2);
                color: white;
                box-shadow: 0 4px 15px rgba(33, 150, 243, 0.4);
            }

            .start-menu-btn-continue:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(33, 150, 243, 0.6);
            }

            .start-menu-btn:active {
                transform: translateY(0);
            }

            .start-menu-version {
                margin-top: 30px;
                color: rgba(255, 255, 255, 0.5);
                font-size: 14px;
            }

            @media (max-width: 600px) {
                .start-menu-content {
                    padding: 30px 40px;
                    margin: 20px;
                }

                .start-menu-title {
                    font-size: 32px;
                }

                .start-menu-btn {
                    padding: 12px 30px;
                    font-size: 18px;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

window.StartMenu = StartMenu;
