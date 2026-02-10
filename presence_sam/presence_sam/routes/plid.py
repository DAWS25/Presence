from fastapi.responses import RedirectResponse
from . import fn_router as router

@router.get("/place/{id}")
def get(id: str = None):
    return RedirectResponse(url=f"/app.html?place={id}")
