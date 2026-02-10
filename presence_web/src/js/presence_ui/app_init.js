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
    QRCode.toDataURL(placeUrl, { margin: 1, width: 160 })
        .then((dataUrl) => {
            qrEl.src = dataUrl;
        })
        .catch(() => {
            // Keep sample QR on failure.
        });
}
