/* ========================================
   EVENT MANAGEMENT
   Sistema de eventos customizados
   ======================================== */

class EventManager {
    constructor() {
        this.listeners = {};
    }

    /**
     * Registrar um listener para um evento
     */
    on(eventName, callback) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(callback);
        console.log(`📍 Listener registrado: ${eventName}`);
    }

    /**
     * Remover um listener
     */
    off(eventName, callback) {
        if (!this.listeners[eventName]) return;
        this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
    }

    /**
     * Emitir um evento
     */
    emit(eventName, data) {
        if (!this.listeners[eventName]) return;
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
