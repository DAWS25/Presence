from fastapi.responses import JSONResponse
import os

from . import fn_router as router


@router.get("/__version")
def get_version():
    """Return version information."""
    return JSONResponse(
        content={
            "version": os.getenv("APP_VERSION", "unknown"),
            "commit": os.getenv("GIT_COMMIT", "unknown"),
        },
        media_type="application/json"
    )
