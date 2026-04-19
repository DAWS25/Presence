"""SQLModel table definitions."""

from datetime import datetime, timezone
from typing import Any, List, Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON, func, DateTime, ForeignKey, UniqueConstraint


class Event(SQLModel, table=True):
    __tablename__ = "events"

    id: Optional[int] = Field(default=None, primary_key=True)
    place_id: str = Field(index=True)
    event_type: str = Field(index=True)
    people: Any = Field(default=[], sa_column=Column(JSON, nullable=True))
    pets: Any = Field(default=[], sa_column=Column(JSON, nullable=True))
    payload: Any = Field(sa_column=Column(JSON))
    created_at: datetime = Field(sa_column=Column(DateTime(timezone=True), server_default=func.now()))


class Individual(SQLModel, table=True):
    __tablename__ = "individuals"
    __table_args__ = (UniqueConstraint("name", "individual_type"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    individual_type: str = Field(index=True)  # "person" or "pet"


class EventIndividual(SQLModel, table=True):
    __tablename__ = "event_individuals"

    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(sa_column=Column(ForeignKey("events.id"), nullable=False, index=True))
    individual_id: int = Field(sa_column=Column(ForeignKey("individuals.id"), nullable=False, index=True))
