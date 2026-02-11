(function () {
    const translations = {
        "pt-BR": {
            "app.title": "Presence - DAWS25",
            "nav.camera": "Camera",
            "nav.presenca": "Presenca",
            "nav.config": "Configuracoes",
            "hud.title": "Presence",
            "hud.status.ready": "✓ Pronto",
            "hud.metrics.faces": "Faces",
            "hud.metrics.version": "Versao",
            "hud.metrics.build": "Build",
            "events.title": "Eventos",
            "events.empty": "Sem deteccoes",
            "share.title": "Compartilhar",
            "share.empty": "Sem opcoes",
            "table.person": "Pessoa",
            "table.events": "Eventos",
            "table.last": "Ultimo",
            "table.image": "Imagem",
            "config.title": "Configuracoes da App",
            "config.minConfidence": "Confianca minima",
            "config.interval": "Intervalo de deteccao (ms)",
            "config.enableLogging": "Ativar logging",
            "about.title": "Sobre",
            "about.version": "Versao:",
            "about.status": "Status:",
            "init.welcome.title": "Bem-vindo",
            "init.welcome.message": "Inicializando aplicacao...",
            "init.faceapi.title": "Face-API Carregado",
            "init.faceapi.message": "Deteccao de rostos pronta"
        },
        "en-US": {
            "app.title": "Presence - DAWS25",
            "nav.camera": "Camera",
            "nav.presenca": "Presence",
            "nav.config": "Settings",
            "hud.title": "Presence",
            "hud.status.ready": "✓ Ready",
            "hud.metrics.faces": "Faces",
            "hud.metrics.version": "Version",
            "hud.metrics.build": "Build",
            "events.title": "Events",
            "events.empty": "No detections",
            "share.title": "Share",
            "share.empty": "No options",
            "table.person": "Person",
            "table.events": "Events",
            "table.last": "Last",
            "table.image": "Image",
            "config.title": "App Settings",
            "config.minConfidence": "Minimum confidence",
            "config.interval": "Detection interval (ms)",
            "config.enableLogging": "Enable logging",
            "about.title": "About",
            "about.version": "Version:",
            "about.status": "Status:",
            "init.welcome.title": "Welcome",
            "init.welcome.message": "Initializing application...",
            "init.faceapi.title": "Face-API Loaded",
            "init.faceapi.message": "Face detection ready"
        }
    };

    const fallbackLocale = "pt-BR";

    function resolveLocale() {
        const params = new URLSearchParams(window.location.search);
        const fromQuery = params.get("lang");
        const raw = (fromQuery || navigator.language || "").toLowerCase();
        if (raw.startsWith("en")) return "en-US";
        if (raw.startsWith("pt")) return "pt-BR";
        return fallbackLocale;
    }

    function applyTranslations(locale) {
        const dict = translations[locale] || translations[fallbackLocale];
        document.documentElement.lang = locale;

        document.querySelectorAll("[data-i18n]").forEach((el) => {
            const key = el.getAttribute("data-i18n");
            if (key && dict[key]) {
                el.textContent = dict[key];
            }
        });
    }

    // Expose translation function for use in JavaScript code
    window.i18n = {
        t: function(key) {
            const locale = resolveLocale();
            const dict = translations[locale] || translations[fallbackLocale];
            return dict[key] || key;
        },
        locale: resolveLocale
    };

    applyTranslations(resolveLocale());
})();
