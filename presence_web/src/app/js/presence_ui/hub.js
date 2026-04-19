/* ========================================
   HUB - Presence & Event Stream
   Fetches events and builds presence table
   ======================================== */

(function () {
    const POLL_INTERVAL = 5000;
    const placeId = new URLSearchParams(window.location.search).get('place');

    const placeIdEl = document.getElementById('placeId');
    const presenceBody = document.getElementById('presenceBody');
    const eventStream = document.getElementById('eventStream');
    const metricTotal = document.getElementById('metricTotal');
    const metricPerMin = document.getElementById('metricPerMin');
    const metricPresences = document.getElementById('metricPresences');

    if (!placeId) {
        placeIdEl.textContent = '(no place)';
        return;
    }
    placeIdEl.textContent = placeId;
    placeIdEl.href = `place.html?place=${encodeURIComponent(placeId)}`;

    let knownCount = 0;
    let presenceVersion = 0;

    async function fetchPresence() {
        try {
            const res = await fetch(`/fn/place/${encodeURIComponent(placeId)}/presence`);
            if (!res.ok) {
                window.handleError(`Failed to fetch presence: ${res.status}`);
                return;
            }
            const data = await res.json();
            const presence = data.presence || [];
            const newVersion = JSON.stringify(presence);
            if (newVersion === presenceVersion) return;
            presenceVersion = newVersion;
            renderPresence(presence);
        } catch (err) {
            window.handleError('Failed to fetch presence:', err);
        }
    }

    async function fetchEvents() {
        try {
            const res = await fetch(`/fn/place/${encodeURIComponent(placeId)}/events`);
            if (!res.ok) {
                window.handleError(`Failed to fetch events: ${res.status}`);
                return;
            }
            const data = await res.json();
            const events = data.events || [];
            if (events.length === knownCount) return;
            knownCount = events.length;
            renderMetrics(events);
            renderPresence(events);
            renderStream(events);
        } catch (err) {
            window.handleError('Failed to fetch events:', err);
        }
    }

    function renderMetrics(events) {
        const total = events.length;
        metricTotal.textContent = total;

        if (total > 0) {
            const first = new Date(events[0].created_at);
            const last = new Date(events[total - 1].created_at);
            const minutes = Math.max((last - first) / 60000, 1);
            metricPerMin.textContent = (total / minutes).toFixed(1);
        } else {
            metricPerMin.textContent = '0';
        }

        const presenceTypes = new Set();
        for (const ev of events) {
            const type = ev.event_type || 'unknown';
            if (type === 'faceDetected') {
                presenceTypes.add('person:' + ((ev.payload || {}).label || 'unknown'));
            } else if (type === 'animalDetected') {
                const animals = (ev.payload || {}).animals || [];
                for (const a of animals) {
                    presenceTypes.add('animal:' + (a.class || 'pet'));
                }
            }
        }
        metricPresences.textContent = presenceTypes.size;
    }

    function renderPresence(presence) {
        if (presence.length === 0) {
            presenceBody.innerHTML = '<tr><td colspan="4" class="empty-state">No presence detected yet</td></tr>';
            return;
        }
        presenceBody.innerHTML = presence.map(p => {
            const isAnimal = p.label !== 'unidentified' && p.label !== 'unknown' && !p.label.startsWith('Person');
            const badge = isAnimal ? 'pet' : 'person';
            const icon = isAnimal ? '🐾 Pet' : '👤 Person';
            return `
            <tr>
                <td><span class="badge-${badge}">${icon}</span></td>
                <td>${escapeHtml(p.label)}</td>
                <td>${p.event_count}</td>
                <td>${formatTime(p.last_seen)}</td>
            </tr>`;
        }).join('');
    }

    function renderStream(events) {
        const sorted = events.slice().reverse();
        if (sorted.length === 0) {
            eventStream.innerHTML = '<div class="empty-state">No events yet</div>';
            return;
        }
        eventStream.innerHTML = sorted.map(ev => {
            const p = ev.payload || {};
            const type = ev.event_type || p.event_type || 'unknown';
            let detail = '';
            if (type === 'faceDetected') {
                detail = `faces: ${p.faceCount || 1}`;
            } else if (type === 'animalDetected') {
                const names = (p.animals || []).map(a => a.class).join(', ');
                detail = names || 'pet detected';
            }
            return `<div class="event-row">
                <span class="event-time">${formatTime(ev.created_at)}</span>
                <span class="event-type">${escapeHtml(type)}</span>
                <span class="event-detail">${escapeHtml(detail)}</span>
            </div>`;
        }).join('');
    }

    function formatTime(iso) {
        try {
            const d = new Date(iso);
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } catch {
            return iso;
        }
    }

    function escapeHtml(str) {
        const el = document.createElement('span');
        el.textContent = str;
        return el.innerHTML;
    }

    fetchPresence();
    fetchEvents();
    setInterval(fetchPresence, POLL_INTERVAL);
    setInterval(fetchEvents, POLL_INTERVAL);
})();
