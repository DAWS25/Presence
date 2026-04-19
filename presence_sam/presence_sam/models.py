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


class Subject(SQLModel, table=True):
    __tablename__ = "subjects"
    __table_args__ = (UniqueConstraint("name", "subject_type"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    subject_type: str = Field(index=True)  # "person" or "pet"


class EventSubject(SQLModel, table=True):
    __tablename__ = "event_subjects"

    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(sa_column=Column(ForeignKey("events.id"), nullable=False, index=True))
    subject_id: int = Field(sa_column=Column(ForeignKey("subjects.id"), nullable=False, index=True))
