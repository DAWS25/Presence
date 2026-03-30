/* ========================================
   GOOGLE ONE TAP
   Initialises Google Identity Services One Tap prompt.
   ======================================== */

function googleSignInInit() {
    'use strict';

    /**
     * Fetch the Google Client ID from the config endpoint.
     */
    async function fetchClientId() {
        const res = await fetch('/fn/config/GOOGLE_CLIENT_ID');
        if (!res.ok) {
            throw new Error(`Config request failed (${res.status})`);
        }
        const data = await res.json();
        return data.value;
    }

    /**
     * Send the Google credential to the edge auth endpoint.
     */
    async function handleCredential(response) {
        console.log('Google One Tap credential received');
        try {
            const res = await fetch('/edge/auth/google/callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: response.credential }),
            });
            const data = await res.json();
            console.log('Server response:', data);

            if (res.ok && window.presenceHistory) {
                const name = data.name || data.email || 'User';
                window.presenceHistory.addWelcomeMessage(
                    'Authentication',
                    `✓ Signed in as ${name}`,
                    '🔓'
                );
            } else if (!res.ok && window.presenceHistory) {
                window.presenceHistory.addWelcomeMessage(
                    'Authentication',
                    `✗ Sign-in failed (${res.status})`,
                    '🔒'
                );
            }
        } catch (err) {
            console.error('Sign-in error:', err);
            if (window.presenceHistory) {
                window.presenceHistory.addWelcomeMessage(
                    'Authentication',
                    `✗ Sign-in error: ${err.message}`,
                    '🔒'
                );
            }
        }
    }

    /**
     * Initialise Google Identity Services One Tap prompt.
     */
    async function init() {
        let GOOGLE_CLIENT_ID;
        try {
            GOOGLE_CLIENT_ID = await fetchClientId();
        } catch (err) {
            console.error('Failed to fetch Google Client ID:', err);
            if (window.presenceHistory) {
                window.presenceHistory.addWelcomeMessage(
                    'Authentication',
                    `✗ Config error: ${err.message}`,
                    '🔒'
                );
            }
            return;
        }

        if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.startsWith('$')) {
            console.warn('Google Client ID not configured — sign-in disabled');
            return;
        }
        if (typeof google === 'undefined' || !google.accounts) {
            console.warn('Google Identity Services library not loaded');
            return;
        }

        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredential,
            auto_select: true,
            cancel_on_tap_outside: false,
            itp_support: true,
            use_fedcm_for_prompt: false,
        });

        // Display the One Tap prompt
        google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed()) {
                const reason = notification.getNotDisplayedReason();
                console.log('One Tap not displayed:', reason);
                // User already has an active session — show auth event
                if (window.presenceHistory) {
                    const t = (key) => window.i18n ? window.i18n.t(key) : key;
                    window.presenceHistory.addWelcomeMessage(
                        t('auth.session.title'),
                        t('auth.session.message'),
                        '🔓'
                    );
                }
            } else if (notification.isSkippedMoment()) {
                const reason = notification.getSkippedReason();
                console.log('One Tap skipped:', reason);
                if (window.presenceHistory) {
                    const t = (key) => window.i18n ? window.i18n.t(key) : key;
                    window.presenceHistory.addWelcomeMessage(
                        t('auth.session.title'),
                        t('auth.session.message'),
                        '🔓'
                    );
                }
            } else if (notification.isDismissedMoment()) {
                console.log('One Tap dismissed:', notification.getDismissedReason());
            }
        });
    }

    /**
     * Wait until the welcome message has been added, then initialise.
     */
    function initWhenReady() {
        if (window.presenceHistory && window.presenceHistory.events.length > 0) {
            init();
        } else {
            setTimeout(initWhenReady, 50);
        }
    }

    window.addEventListener('load', initWhenReady);
}

googleSignInInit();
