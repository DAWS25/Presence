from fastapi import Path, Depends, Request
from fastapi.responses import JSONResponse
from sqlmodel import Session, text
import logging
import json

from . import fn_router as router
from ..database import get_session

logger = logging.getLogger(__name__)


@router.put("/place/{place_id}/events")
async def events_put(place_id: str, request: Request, session: Session = Depends(get_session)):
    body = await request.json()
    event_type = body.pop("event_type", "unknown")
    session.exec(
        text("INSERT INTO events (place_id, event_type, payload) VALUES (:place_id, :event_type, :payload)"),
        params={"place_id": place_id, "event_type": event_type, "payload": json.dumps(body)},
    )
    session.commit()
    status_code = 200
    body = {"status": "ok", "place_id": place_id}
    response = JSONResponse(
        status_code=status_code,
        content=json.loads(json.dumps(body, sort_keys=True)),
        media_type="application/json"
    )
    return response


@router.get("/place/{place_id}/events")
def events_get(place_id: str, session: Session = Depends(get_session)):
    results = session.exec(
        text("SELECT event_type, payload, created_at FROM events WHERE place_id = :place_id ORDER BY created_at ASC"),
        params={"place_id": place_id},
    ).all()
    events = [{"event_type": row[0], "payload": json.loads(row[1]) if isinstance(row[1], str) else row[1], "created_at": row[2].isoformat()} for row in results]
    return {"place_id": place_id, "events": events}
