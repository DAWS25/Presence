from . import fn_router as router


@router.get("/__hc")
def get_healthcheck():
    """Return simple health check."""
    return {"health_status": "OK"}
