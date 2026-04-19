from fastapi.responses import RedirectResponse
from fastapi import Depends
from sqlmodel import Session, text
from datetime import datetime, timezone, timedelta

from . import fn_router as router
from ..database import get_session

@router.get("/place/{id}")
def get(id: str = None):
    return RedirectResponse(url=f"/app/hub.html?place={id}")

@router.get("/place/{id}/presence")
def place_get_presence(id: str = None, minutes: int = 60, session: Session = Depends(get_session)):
    minutes = max(1, min(minutes, 1440))
    since = datetime.now(timezone.utc) - timedelta(minutes=minutes)
    results = session.exec(
        text("""
            SELECT i.id, i.individual_type, i.name,
                   COUNT(DISTINCT e.id) AS event_count,
                   MIN(e.created_at) AS first_seen,
                   MAX(e.created_at) AS last_seen
            FROM events e
            LEFT JOIN event_individuals ei ON ei.event_id = e.id
            LEFT JOIN individuals i ON i.id = ei.individual_id
            WHERE e.place_id = :place_id AND e.created_at >= :since
            GROUP BY i.id, i.individual_type, i.name
            ORDER BY MAX(e.created_at) DESC
        """),
        params={"place_id": id, "since": since},
    ).all()

    identified = []
    unidentified = None

    for row in results:
        individual_id, ind_type, name, event_count, first_seen, last_seen = row
        if individual_id is None:
            # Events with no linked individual
            if unidentified is None:
                unidentified = {
                    "type": "unidentified",
                    "label": "Unidentified",
                    "event_count": event_count,
                    "first_seen": first_seen.isoformat(),
                    "last_seen": last_seen.isoformat(),
                }
            else:
                unidentified["event_count"] += event_count
                if first_seen.isoformat() < unidentified["first_seen"]:
                    unidentified["first_seen"] = first_seen.isoformat()
                if last_seen.isoformat() > unidentified["last_seen"]:
                    unidentified["last_seen"] = last_seen.isoformat()
            continue
        entry = {
            "individual_id": individual_id,
            "type": ind_type,
            "label": name.capitalize() if ind_type == 'pet' else name,
            "event_count": event_count,
            "first_seen": first_seen.isoformat(),
            "last_seen": last_seen.isoformat(),
        }
        if ind_type == 'person' and name == 'unknown':
            entry["type"] = "unidentified"
            entry["label"] = "Unidentified"
            unidentified = entry
        else:
            identified.append(entry)

    presence = identified
    if unidentified:
        presence.append(unidentified)

    return {"place_id": id, "minutes": minutes, "since": since.isoformat(), "presence": presence}