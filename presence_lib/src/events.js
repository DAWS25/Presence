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
        this.cooldowns = {}; // cooldowns managed by emitters directly
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
     * Emit the event respecting cooldown, send to server, and call listeners only on success.
     */
    async emit(eventName, data) {
        const cd = this.cooldowns[eventName];
        if (cd) {
            const now = Date.now();
            const last = this.lastEmitTs[eventName] || 0;
            if (now - last < cd) {
                return; // dentro do cooldown, ignora
            }
            this.lastEmitTs[eventName] = now;
        }

        const placeId = new URLSearchParams(window.location.search).get('place');
        if (!placeId) {
            window.handleError(`No place ID found in URL, cannot send event: ${eventName}`);
            return;
        }

        try {
            const response = await fetch(`/fn/place/${encodeURIComponent(placeId)}/events`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event_type: eventName, ...data }),
            });
            if (!response.ok) {
                window.handleError(`Server rejected event ${eventName}: ${response.status} ${response.statusText}`);
                return;
            }
            const result = await response.json();
            if (result.event_id) {
                data.event_id = result.event_id;
            }
            console.log(`🔔 Evento emitido: ${eventName}`, data);
            const listeners = this.listeners[eventName] || [];
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    window.handleError(`Erro ao executar listener de ${eventName}:`, error);
                }
            });
        } catch (error) {
            window.handleError(`Failed to send event ${eventName} to server:`, error);
        }
    }
}

// Instância global
window.eventManager = new EventManager();
