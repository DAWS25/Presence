"""SQLModel table definitions."""

from datetime import datetime, timezone
from typing import Any, Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON, func, DateTime


class Event(SQLModel, table=True):
    __tablename__ = "events"

    id: Optional[int] = Field(default=None, primary_key=True)
    place_id: str = Field(index=True)
    event_type: str = Field(index=True)
    payload: Any = Field(sa_column=Column(JSON))
    created_at: datetime = Field(sa_column=Column(DateTime(timezone=True), server_default=func.now()))
