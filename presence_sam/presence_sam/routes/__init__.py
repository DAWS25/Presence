"""Route package for presence_sam.
Each module below defines a FastAPI APIRouter named `router` which
is included by the main application.
"""

from fastapi import APIRouter

# Shared router for /fn-prefixed routes
fn_router = APIRouter(prefix="/fn")

__all__ = [
    "fn_router",
    "user_data",
    "whoami",
    "healthcheck",
    "version",
    "root",
]
