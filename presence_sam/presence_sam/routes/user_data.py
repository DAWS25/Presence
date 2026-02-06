from . import fn_router as router


@router.get("/user/data")
def get_userdata():
    """Return simple user data health status."""
    return {"health_status": "USERDATA"}
