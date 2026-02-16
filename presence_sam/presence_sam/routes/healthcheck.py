from fastapi.responses import JSONResponse
import json
import os

from . import fn_router as router
from ..database import check_connection


@router.get("/__hc")
def get_healthcheck():
    """Return health check with version info and database status."""
    db_status = check_connection()
    overall = "OK" if db_status == "OK" else "DEGRADED"
    status_code = 200 if overall == "OK" else 500

    content = {
        "auth_client_id": "SET" if os.getenv("GOOGLE_CLIENT_ID") else "MISSING",
        "commit": os.getenv("GIT_COMMIT", "unknown"),
        "database": db_status,
        "health_status": overall,
        "version": os.getenv("APP_VERSION", "unknown"),
    }

    return JSONResponse(
        status_code=status_code,
        content=json.loads(json.dumps(content, sort_keys=True)),
        media_type="application/json"
    )
