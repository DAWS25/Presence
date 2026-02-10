from fastapi.responses import JSONResponse
<<<<<<< HEAD
=======
import os

from . import fn_router as router


@router.get("/__hc")
def get_healthcheck():
    """Return simple health check with version info."""
    return JSONResponse(
        content={
            "health_status": "OK",
            "version": os.getenv("APP_VERSION", "unknown"),
            "commit": os.getenv("GIT_COMMIT", "unknown"),
        },
        media_type="application/json"
    )
version": os.getenv("APP_VERSION", "unknown"),
            "commit": os.getenv("GIT_COMMIT", "unknown"),
        },
        media_type="application/json"
    )
>>>>>>> main
