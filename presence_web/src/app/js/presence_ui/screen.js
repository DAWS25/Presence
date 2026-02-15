/* ========================================
    SCREEN MANAGER
    Manages main screen / detail screen transitions
    ======================================== */

class ScreenManager {
    /**
     * Manages the transition between main screen and detail screen.
     */
    constructor() {
        this.mainScreen = document.getElementById('mainScreen');
        this.detailScreen = document.getElementById('detailScreen');
        this.detailContent = document.getElementById('detailContent');
        this.detailCloseBtn = document.getElementById('detailCloseBtn');
        
        if (this.detailCloseBtn) {
            this.detailCloseBtn.addEventListener('click', () => this.showMainScreen());
        }

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.showMainScreen();
            }
        });
    }

    /**
     * Show the main screen with camera view and events panel
     */
    showMainScreen() {
        if (this.mainScreen) {
            this.mainScreen.classList.remove('is-hidden');
        }
        if (this.detailScreen) {
            this.detailScreen.classList.add('is-hidden');
        }
    }

    /**
     * Show the detail screen with event information
     */
    showDetailScreen() {
        if (this.mainScreen) {
            this.mainScreen.classList.add('is-hidden');
        }
        if (this.detailScreen) {
            this.detailScreen.classList.remove('is-hidden');
        }
    }

    /**
     * Set the detail content HTML
     */
    setDetailContent(html) {
        if (this.detailContent) {
            this.detailContent.innerHTML = html;
        }
    }

    /**
     * Clear the detail content
     */
    clearDetailContent() {
        if (this.detailContent) {
            this.detailContent.innerHTML = '';
        }
    }
}

// Global instance
if (!window.screenManager) {
    window.screenManager = new ScreenManager();
}
