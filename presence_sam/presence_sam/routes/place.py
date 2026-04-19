from fastapi.responses import RedirectResponse
from fastapi import Depends
from sqlmodel import Session, text
from datetime import datetime, timezone, timedelta
import json

from . import fn_router as router
from ..database import get_session

@router.get("/place/{id}")
def get(id: str = None):
    return RedirectResponse(url=f"/app/hub.html?place={id}")

@router.get("/place/{id}/presence")
def place_get_presence(id: str = None, session: Session = Depends(get_session)):
    since = datetime.now(timezone.utc) - timedelta(hours=1)
    results = session.exec(
        text("SELECT event_type, payload, created_at FROM events WHERE place_id = :place_id AND created_at >= :since ORDER BY created_at ASC"),
        params={"place_id": id, "since": since},
    ).all()

    groups = {}
    for row in results:
        event_type = row[0]
        payload = json.loads(row[1]) if isinstance(row[1], str) else row[1]
        created_at = row[2].isoformat()

        if event_type == 'faceDetected':
            label = payload.get('label') or 'unidentified'
        elif event_type == 'animalDetected':
            animals = payload.get('animals') or []
            label = ', '.join(a.get('class', 'pet') for a in animals) or 'pet'
        else:
            label = 'unknown'

        if label not in groups:
            groups[label] = {"label": label, "event_count": 0, "first_seen": created_at, "last_seen": created_at}
        groups[label]["event_count"] += 1
        groups[label]["last_seen"] = created_at

    presence = sorted(groups.values(), key=lambda g: g["last_seen"], reverse=True)
    return {"place_id": id, "since": since.isoformat(), "presence": presence}