from fastapi.responses import PlainTextResponse

from . import fn_router as router


@router.get("/__whoami")
def get_whoami():
    """Return identity health status."""
    return PlainTextResponse(content="WHOAMI", media_type="text/plain; charset=utf-8")
