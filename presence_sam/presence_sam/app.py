from mangum import Mangum
from fastapi import FastAPI
import importlib
import pkgutil
<<<<<<< HEAD
=======
import os
import logging
from datetime import datetime
from . import routes

# Setup logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Version information
VERSION = os.getenv("APP_VERSION", datetime.utcnow().strftime("%Y%m%d-%H%M%S"))
COMMIT_SHA = os.getenv("GIT_COMMIT", "unknown")

logger.info(f"🚀 Presence Lambda initializing - Version: {VERSION}, Commit: {COMMIT_SHA}")

app = FastAPI(title="Presence API", version=VERSION)
ion=VERSION)


def include_discovered_routers(application: FastAPI) -> None:
    """Auto-discover routers in the routes package and include them.

    Any module under routes.* that exposes a `router` attribute will be included.
    """
    module_names = sorted(
        module.name
        for module in pkgutil.iter_modules(routes.__path__, routes.__name__ + ".")
    )
    for module_name in module_names:
        module = importlib.import_module(module_name)
        router = getattr(module, "router", None)
        if router is not None:
            application.include_router(router)


include_discovered_routers(app)

handler = Mangum(app)
