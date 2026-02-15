/**
 * Initialize app UI components when DOM is ready
 */
function initApp() {
    const urlParams = new URLSearchParams(window.location.search);

    if (document.body) {
        document.body.classList.add('hud-only');
    }

    // Extract and display place ID from URL query parameter
    const place = urlParams.get('place');
    const plidEl = document.getElementById('sharePlid');
    if (plidEl && place) {
        const placeUrl = `/fn/place/${place}`;
        plidEl.textContent = place;
        plidEl.href = placeUrl;
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
                colorDark: "#fff2da",
                colorLight: "#32302f",
                correctLevel: QRCode.CorrectLevel.H
            });
        } catch (error) {
            console.error('Failed to generate QR code:', error);
        }
    } else if (!window.QRCode) {
        console.error('QRCode library not loaded');
    }

    // Initialize events scroll buttons — scroll the container natively
    const scrollLeftBtn = document.getElementById('scrollLeftBtn');
    const scrollRightBtn = document.getElementById('scrollRightBtn');
    const eventsList = document.getElementById('presenceCards');

    if (scrollLeftBtn && scrollRightBtn && eventsList) {
        const scrollAmount = 200; // px per click
        scrollLeftBtn.addEventListener('click', () => {
            eventsList.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        });
        scrollRightBtn.addEventListener('click', () => {
            eventsList.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        });
    }
}

// Run initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
