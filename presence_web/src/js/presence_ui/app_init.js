/**
 * Initialize app UI components when DOM is ready
 */
function initApp() {
    // Extract and display place ID from URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const place = urlParams.get('place');
    const plidEl = document.getElementById('sharePlid');
    const qrLinkEl = document.getElementById('shareQrLink');
    if (plidEl && place) {
        const placeUrl = `/fn/place/${place}`;
        plidEl.textContent = place;
        plidEl.href = placeUrl;
        if (qrLinkEl) {
            qrLinkEl.href = placeUrl;
        }
    }

    const qrEl = document.getElementById('shareQr');
    if (qrEl && place && window.QRCode) {
        const placeUrl = window.location.origin + `/fn/place/${place}`;
        try {
            // Clear existing content
            qrEl.innerHTML = '';
            // Create QR code
            new QRCode(qrEl, {
                text: placeUrl,
                width: 112,
                height: 112,
                colorDark: "#000000",
                colorLight: "#32302f",
                correctLevel: QRCode.CorrectLevel.H
            });
        } catch (error) {
            console.error('Failed to generate QR code:', error);
        }
    } else if (!window.QRCode) {
        console.error('QRCode library not loaded');
    }
}

// Run initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
