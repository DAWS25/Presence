from fastapi.responses import RedirectResponse
from fastapi import Path
import logging
import uuid

from . import fn_router as router
from .huid import generate_human_id

logger = logging.getLogger(__name__)


@router.get("/index")
def get():
    """
    Redirect to app.html with a place ID.
    If id is empty/None, generate a human-readable ID.
    Otherwise use the provided id.
    Logs the ID and adds it to response header.
    """
    id = generate_human_id()
    logger.info(f"🆔 Generated Place ID: {id}")
    response = RedirectResponse(url=f"/place/{id}")
    response.headers["X-Place-ID"] = id
    return response

