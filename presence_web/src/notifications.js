/* ========================================
   NOTIFICATION SYSTEM
   Sistema de notificações com timeout
   ======================================== */

class NotificationManager {
    constructor(statusElementId = 'statusMessage') {
        this.statusEl = document.getElementById(statusElementId);
        this.currentTimeout = null;
        this.faceDetectionCount = 0;
        
        // Registrar listener para eventos de detecção
        if (window.eventManager) {
            window.eventManager.on('faceDetected', (data) => this.showFaceDetectedMessage(data));
        }
    }

    /**
     * Mostrar mensagem de face detectada
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
     * Mostrar mensagem genérica
     * @param {string} text - Texto da mensagem
     * @param {string} type - Tipo: 'success', 'info', 'warning', 'danger'
     * @param {number} duration - Duração em ms (padrão: 4200ms = 4.20s)
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
     * Limpar mensagem imediatamente
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
     * Obter total de detecções
     */
    getDetectionCount() {
        return this.faceDetectionCount;
    }
}

// Instância global
window.notificationManager = new NotificationManager();
