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
            SELECT i.id, i.subject_type, i.name,
                   COUNT(DISTINCT e.id) AS event_count,
                   MIN(e.created_at) AS first_seen,
                   MAX(e.created_at) AS last_seen,
                   (SELECT e2.payload->>'snapshot'
                    FROM events e2
                    JOIN event_subjects ei2 ON ei2.event_id = e2.id
                    WHERE ei2.subject_id = i.id
                      AND e2.place_id = :place_id AND e2.created_at >= :since
                    ORDER BY e2.created_at DESC LIMIT 1
                   ) AS snapshot
            FROM events e
            LEFT JOIN event_subjects ei ON ei.event_id = e.id
            LEFT JOIN subjects i ON i.id = ei.subject_id
            WHERE e.place_id = :place_id AND e.created_at >= :since
            GROUP BY i.id, i.subject_type, i.name
            ORDER BY MAX(e.created_at) DESC
        """),
        params={"place_id": id, "since": since},
    ).all()

    identified = []
    unidentified = None

    for row in results:
        subject_id, sub_type, name, event_count, first_seen, last_seen, snapshot = row
        if subject_id is None:
            # Events with no linked subject
            if unidentified is None:
                unidentified = {
                    "type": "unidentified",
                    "label": "Unidentified",
                    "event_count": event_count,
                    "first_seen": first_seen.isoformat(),
                    "last_seen": last_seen.isoformat(),
                    "snapshot": snapshot,
                }
            else:
                unidentified["event_count"] += event_count
                if first_seen.isoformat() < unidentified["first_seen"]:
                    unidentified["first_seen"] = first_seen.isoformat()
                if last_seen.isoformat() > unidentified["last_seen"]:
                    unidentified["last_seen"] = last_seen.isoformat()
                if snapshot:
                    unidentified["snapshot"] = snapshot
            continue
        entry = {
            "subject_id": subject_id,
            "type": sub_type,
            "label": name.capitalize() if sub_type == 'pet' else name,
            "event_count": event_count,
            "first_seen": first_seen.isoformat(),
            "last_seen": last_seen.isoformat(),
            "snapshot": snapshot,
        }
        if sub_type == 'person' and name == 'unknown':
            entry["type"] = "unidentified"
            entry["label"] = "Unidentified"
            unidentified = entry
        else:
            identified.append(entry)

    presence = identified
    if unidentified:
        presence.append(unidentified)

    return {"place_id": id, "minutes": minutes, "since": since.isoformat(), "presence": presence}