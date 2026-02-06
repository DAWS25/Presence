from fastapi.responses import RedirectResponse

from . import fn_router as router


@router.get("/index")
def read_index():
    """Index endpoint."""
    return RedirectResponse(url="/app.html")
