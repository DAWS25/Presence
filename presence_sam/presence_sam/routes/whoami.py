from . import fn_router as router


@router.get("/__whoami")
def get_whoami():
    """Return identity health status."""
    return "WHOAMI"
