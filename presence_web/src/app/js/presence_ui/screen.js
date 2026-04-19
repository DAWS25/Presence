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
        this.settingsScreen = document.getElementById('settingsScreen');
        this.settingsCloseBtn = document.getElementById('settingsCloseBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.cooldownSlider = document.getElementById('cooldownSlider');
        this.cooldownValue = document.getElementById('cooldownValue');
        
        if (this.detailCloseBtn) {
            this.detailCloseBtn.addEventListener('click', () => this.showMainScreen());
        }

        if (this.settingsBtn) {
            this.settingsBtn.addEventListener('click', () => this.showSettingsScreen());
        }

        if (this.settingsCloseBtn) {
            this.settingsCloseBtn.addEventListener('click', () => this.showMainScreen());
        }

        if (this.cooldownSlider) {
            this.cooldownSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                if (this.cooldownValue) this.cooldownValue.textContent = val + 's';
                if (window.presenceApp) {
                    window.presenceApp.snapshotIntervalMs = val * 1000;
                }
            });
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
        if (this.settingsScreen) {
            this.settingsScreen.classList.add('is-hidden');
        }
    }

    /**
     * Show the settings screen
     */
    showSettingsScreen() {
        if (this.mainScreen) {
            this.mainScreen.classList.add('is-hidden');
        }
        if (this.detailScreen) {
            this.detailScreen.classList.add('is-hidden');
        }
        if (this.settingsScreen) {
            this.settingsScreen.classList.remove('is-hidden');
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
