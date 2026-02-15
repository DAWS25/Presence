/* ========================================
   GOOGLE ONE TAP
   Initialises Google Identity Services One Tap prompt.
   ======================================== */

(function () {
    'use strict';

    const GOOGLE_CLIENT_ID =
        document.querySelector('meta[name="google-client-id"]')?.content || '';

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
        } catch (err) {
            console.error('Sign-in error:', err);
        }
    }

    /**
     * Initialise Google Identity Services One Tap prompt.
     */
    function init() {
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
        });

        // Display the One Tap prompt
        google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed()) {
                console.log('One Tap not displayed:', notification.getNotDisplayedReason());
            } else if (notification.isSkippedMoment()) {
                console.log('One Tap skipped:', notification.getSkippedReason());
            } else if (notification.isDismissedMoment()) {
                console.log('One Tap dismissed:', notification.getDismissedReason());
            }
        });
    }

    window.addEventListener('load', init);
})();
