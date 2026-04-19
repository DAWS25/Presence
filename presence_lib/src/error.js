/* ========================================
    ERROR HANDLING
    Centralized error handler
    ======================================== */

function handleError(message, error) {
    console.error(message, error);
}

window.handleError = handleError;
