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
    people = body.pop("people", [])
    pets = body.pop("pets", [])

    # Insert the event and get its id
    result = session.exec(
        text("INSERT INTO events (place_id, event_type, people, pets, payload) VALUES (:place_id, :event_type, :people, :pets, :payload) RETURNING id"),
        params={"place_id": place_id, "event_type": event_type, "people": json.dumps(people), "pets": json.dumps(pets), "payload": json.dumps(body)},
    )
    event_id = result.first()[0]

    # Upsert people into subjects and link to event
    for person in people:
        name = person.get('name') or 'unknown'
        row = session.exec(
            text("INSERT INTO subjects (name, subject_type) VALUES (:name, 'person') ON CONFLICT DO NOTHING RETURNING id"),
            params={"name": name},
        ).first()
        if row:
            subject_id = row[0]
        else:
            subject_id = session.exec(
                text("SELECT id FROM subjects WHERE name = :name AND subject_type = 'person'"),
                params={"name": name},
            ).first()[0]
        session.exec(
            text("INSERT INTO event_subjects (event_id, subject_id) VALUES (:event_id, :subject_id)"),
            params={"event_id": event_id, "subject_id": subject_id},
        )

    # Upsert pets into subjects and link to event
    for pet in pets:
        name = pet.get('species') or pet.get('name') or 'pet'
        row = session.exec(
            text("INSERT INTO subjects (name, subject_type) VALUES (:name, 'pet') ON CONFLICT DO NOTHING RETURNING id"),
            params={"name": name},
        ).first()
        if row:
            subject_id = row[0]
        else:
            subject_id = session.exec(
                text("SELECT id FROM subjects WHERE name = :name AND subject_type = 'pet'"),
                params={"name": name},
            ).first()[0]
        session.exec(
            text("INSERT INTO event_subjects (event_id, subject_id) VALUES (:event_id, :subject_id)"),
            params={"event_id": event_id, "subject_id": subject_id},
        )

    session.commit()
    status_code = 200
    body = {"status": "ok", "place_id": place_id, "event_id": event_id}
    response = JSONResponse(
        status_code=status_code,
        content=json.loads(json.dumps(body, sort_keys=True)),
        media_type="application/json"
    )
    return response


@router.post("/place/{place_id}/events")
async def events_update(place_id: str, request: Request, session: Session = Depends(get_session)):
    body = await request.json()
    event_id = body.get("event_id")
    if not event_id:
        return JSONResponse(status_code=400, content={"error": "event_id is required"})

    people = body.get("people", [])
    pets = body.get("pets", [])

    # Verify event belongs to this place
    row = session.exec(
        text("SELECT id FROM events WHERE id = :event_id AND place_id = :place_id"),
        params={"event_id": event_id, "place_id": place_id},
    ).first()
    if not row:
        return JSONResponse(status_code=404, content={"error": "event not found"})

    # Update people and pets JSON on the event
    session.exec(
        text("UPDATE events SET people = :people, pets = :pets WHERE id = :event_id"),
        params={"event_id": event_id, "people": json.dumps(people), "pets": json.dumps(pets)},
    )

    # Remove old subject links and re-create
    session.exec(
        text("DELETE FROM event_subjects WHERE event_id = :event_id"),
        params={"event_id": event_id},
    )

    for person in people:
        name = person.get('name') or 'unknown'
        r = session.exec(
            text("INSERT INTO subjects (name, subject_type) VALUES (:name, 'person') ON CONFLICT DO NOTHING RETURNING id"),
            params={"name": name},
        ).first()
        subject_id = r[0] if r else session.exec(
            text("SELECT id FROM subjects WHERE name = :name AND subject_type = 'person'"),
            params={"name": name},
        ).first()[0]
        session.exec(
            text("INSERT INTO event_subjects (event_id, subject_id) VALUES (:event_id, :subject_id)"),
            params={"event_id": event_id, "subject_id": subject_id},
        )

    for pet in pets:
        name = pet.get('species') or pet.get('name') or 'pet'
        r = session.exec(
            text("INSERT INTO subjects (name, subject_type) VALUES (:name, 'pet') ON CONFLICT DO NOTHING RETURNING id"),
            params={"name": name},
        ).first()
        subject_id = r[0] if r else session.exec(
            text("SELECT id FROM subjects WHERE name = :name AND subject_type = 'pet'"),
            params={"name": name},
        ).first()[0]
        session.exec(
            text("INSERT INTO event_subjects (event_id, subject_id) VALUES (:event_id, :subject_id)"),
            params={"event_id": event_id, "subject_id": subject_id},
        )

    session.commit()
    return JSONResponse(status_code=200, content={"status": "ok", "event_id": event_id})


@router.get("/place/{place_id}/events")
def events_get(place_id: str, limit: int = 100, minutes: int = None, session: Session = Depends(get_session)):
    if minutes == 0:
        return {"place_id": place_id, "events": []}
    if minutes:
        results = session.exec(
            text("SELECT event_type, people, pets, payload, created_at FROM events WHERE place_id = :place_id AND created_at >= NOW() - INTERVAL '1 minute' * :minutes ORDER BY created_at DESC LIMIT :limit"),
            params={"place_id": place_id, "limit": limit, "minutes": minutes},
        ).all()
    else:
        results = session.exec(
            text("SELECT event_type, people, pets, payload, created_at FROM events WHERE place_id = :place_id ORDER BY created_at DESC LIMIT :limit"),
            params={"place_id": place_id, "limit": limit},
        ).all()
    events = [{
        "event_type": row[0],
        "people": json.loads(row[1]) if isinstance(row[1], str) else (row[1] or []),
        "pets": json.loads(row[2]) if isinstance(row[2], str) else (row[2] or []),
        "payload": json.loads(row[3]) if isinstance(row[3], str) else row[3],
        "created_at": row[4].isoformat()
    } for row in results]
    # Return in chronological order (oldest first)
    events.reverse()
    return {"place_id": place_id, "events": events}
