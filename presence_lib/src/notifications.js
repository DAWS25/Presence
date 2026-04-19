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
            window.eventManager.on('snapshotTaken', (data) => this.showSnapshotMessage(data));
            window.__notificationFaceListenerAdded = true;
        }
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
     * Show snapshot message
     */
    showSnapshotMessage(data) {
        const faceCount = data?.faceCount || 0;
        const pets = data?.pets || [];
        if (faceCount > 0) {
            this.faceDetectionCount++;
            const message = faceCount > 1
                ? `👥 ${faceCount} faces detectadas!`
                : `👤 Face detectada!`;
            this.showMessage(message, 'success');
        } else if (pets.length > 0) {
            const names = pets.map(p => p.name).join(', ');
            const message = pets.length > 1
                ? `🐾 ${pets.length} pets detectados! (${names})`
                : `🐾 Pet detectado! (${names})`;
            this.showMessage(message, 'success');
        } else {
            this.showMessage('📸 Snapshot enviado', 'info', 2000);
        }
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
