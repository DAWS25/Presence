/* ========================================
    NOTIFICATION SYSTEM
    Timeout-based notifications
    ======================================== */

class NotificationManager {
     /**
      * Manages temporary messages in the status bar.
      */
    constructor(statusElementId = 'statusMessage') {
        this.statusEl = document.getElementById(statusElementId);
        this.currentTimeout = null;
        this.faceDetectionCount = 0;
        
        // Register listener for detection events
        if (window.eventManager && !window.__notificationFaceListenerAdded) {
            window.eventManager.on('faceDetected', (data) => this.showFaceDetectedMessage(data));
            window.__notificationFaceListenerAdded = true;
        }
    }

    /**
     * Show face-detected message
     */
    showFaceDetectedMessage(data) {
        const { faceCount, timestamp } = data;
        this.faceDetectionCount++;
        
        const message = faceCount > 1 
            ? `👥 ${faceCount} faces detectadas!`
            : `👤 Face detectada!`;
        
        this.showMessage(message, 'success');
        console.log(`📊 Total de detecções: ${this.faceDetectionCount}`);
    }

    /**
     * Show generic message with timeout and animation.
     * @param {string} text - Message text
     * @param {string} type - One of 'success', 'info', 'warning', 'danger'
     * @param {number} duration - Duration in ms (default: 4200ms)
     */
    showMessage(text, type = 'info', duration = 4200) {
        if (!this.statusEl) {
            console.warn('❌ Elemento de status não encontrado');
            return;
        }

        // Limpar timeout anterior
        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
        }

        // Atualizar conteúdo e classe
        this.statusEl.textContent = text;
        this.statusEl.className = `status-value text-${type} fade-in`;

        // Auto-limpar após duração
        this.currentTimeout = setTimeout(() => {
            this.statusEl.classList.add('fade-out');
            setTimeout(() => {
                this.statusEl.textContent = '✓ Pronto';
                this.statusEl.className = 'status-value text-muted';
                this.statusEl.classList.remove('fade-out');
            }, 300);
        }, duration);
    }

    /**
        * Clear message immediately
     */
    clear() {
        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
        }
        if (this.statusEl) {
            this.statusEl.textContent = '✓ Pronto';
            this.statusEl.className = 'status-value text-muted';
        }
    }

    /**
     * Get total detections count
     */
    getDetectionCount() {
        return this.faceDetectionCount;
    }
}

// Instância global
if (!window.notificationManager) {
    window.notificationManager = new NotificationManager();
}
