(function () {
    const fallbackLocale = "pt-BR";
    let dict = {};

    function resolveLocale() {
        const params = new URLSearchParams(window.location.search);
        const fromQuery = params.get("lang");
        const raw = (fromQuery || navigator.language || "").toLowerCase();
        if (raw.startsWith("en")) return "en-US";
        if (raw.startsWith("pt")) return "pt-BR";
        return fallbackLocale;
    }

    function applyTranslations() {
        document.querySelectorAll("[data-i18n]").forEach((el) => {
            const key = el.getAttribute("data-i18n");
            if (key && dict[key]) {
                el.textContent = dict[key];
            }
        });
    }

    // Resolve the base path for locale files relative to i18n.js location
    function resolveBasePath() {
        const scripts = document.querySelectorAll('script[src*="i18n.js"]');
        if (scripts.length > 0) {
            const src = scripts[scripts.length - 1].getAttribute("src");
            return src.substring(0, src.lastIndexOf("/") + 1);
        }
        return "js/presence_lib/";
    }

    const locale = resolveLocale();
    const basePath = resolveBasePath();

    // Load translations from resource file
    const readyPromise = fetch(basePath + "locales/" + locale + ".json")
        .then((res) => {
            if (!res.ok) throw new Error("Failed to load locale: " + locale);
            return res.json();
        })
        .catch((err) => {
            console.warn("⚠️ i18n: could not load " + locale + ", trying fallback", err);
            return fetch(basePath + "locales/" + fallbackLocale + ".json").then((r) => r.json());
        })
        .then((data) => {
            dict = data;
            document.documentElement.lang = locale;
            applyTranslations();
        })
        .catch((err) => {
            console.error("❌ i18n: failed to load translations", err);
        });

    // Expose translation API (t() returns key as fallback until loaded)
    window.i18n = {
        t: function (key) {
            return dict[key] || key;
        },
        locale: resolveLocale,
        ready: readyPromise
    };
})();
