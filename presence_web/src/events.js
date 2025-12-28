/* ========================================
    EVENT MANAGEMENT
    Custom event system
    ======================================== */

class EventManager {
    /**
     * Manages listeners and per-event cooldowns.
     */
    constructor() {
        this.listeners = {};
        this.cooldowns = { faceDetected: 13000 }; // ms por evento
        this.lastEmitTs = {};
    }

    /**
     * Registrar um listener para um evento
     */
    /**
     * Register a listener for the event.
     */
    on(eventName, callback) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(callback);
    }

    /**
     * Remover um listener
     */
    /**
     * Remove a specific listener from the event.
     */
    off(eventName, callback) {
        if (!this.listeners[eventName]) return;
        this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
    }

    /**
     * Emitir um evento
     */
    /**
     * Emit the event respecting cooldown and call listeners.
     */
    emit(eventName, data) {
        if (!this.listeners[eventName]) return;
        const cd = this.cooldowns[eventName];
        if (cd) {
            const now = Date.now();
            const last = this.lastEmitTs[eventName] || 0;
            if (now - last < cd) {
                return; // dentro do cooldown, ignora
            }
            this.lastEmitTs[eventName] = now;
        }
        console.log(`🔔 Evento emitido: ${eventName}`, data);
        this.listeners[eventName].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`❌ Erro ao executar listener de ${eventName}:`, error);
            }
        });
    }
}

// Instância global
window.eventManager = new EventManager();
