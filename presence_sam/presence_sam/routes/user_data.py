from fastapi.responses import JSONResponse

from . import fn_router as router


@router.get("/user/data")
def get_userdata():
    """Return simple user data health status."""
    return JSONResponse(content={"health_status": "USERDATA"}, media_type="application/json")
