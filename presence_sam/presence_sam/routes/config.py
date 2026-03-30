from fastapi.responses import JSONResponse
from . import fn_router as router
import os
import logging


log = logging.getLogger(__name__)

# curl -kv https://localhost:10443/fn/config/GOOGLE_CLIENT_ID
@router.get("/config/{key}")
def get(key: str = None):
    if key.startswith("_"):
        log.warning(f"Unauthorized access attempt for key: {key}")
        return JSONResponse({"error": "Unauthorized"}, status_code=403)
    value = os.getenv(key)
    envs = os.environ
    log.info(f"########## Retrieving configuration for key: {key}")
    for env_key in envs:
        log.info(f"Environment variable: {env_key}={envs[env_key]}")
    if not value:
        log.info(f"Key not found: {key}")
        return JSONResponse({"error": "Not Found"}, status_code=404)
    log.info(f"Retrieved value for key: {key}")
    return {"value": value}
