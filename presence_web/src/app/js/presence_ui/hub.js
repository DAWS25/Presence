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
    const timeWindowSlider = document.getElementById('timeWindow');
    const timeWindowLabel = document.getElementById('timeWindowLabel');

    if (!placeId) {
        placeIdEl.textContent = '(no place)';
        return;
    }
    placeIdEl.textContent = placeId;
    placeIdEl.href = `place.html?place=${encodeURIComponent(placeId)}`;

    let knownCount = 0;
    let presenceVersion = 0;

    function getMinutes() {
        return parseInt(timeWindowSlider.value, 10) || 60;
    }

    function formatMinutes(m) {
        if (m < 60) return `${m} min`;
        const h = Math.floor(m / 60);
        const r = m % 60;
        if (r === 0) return h === 1 ? '1 hour' : `${h} hours`;
        return `${h}h ${r}m`;
    }

    timeWindowSlider.addEventListener('input', () => {
        timeWindowLabel.textContent = formatMinutes(getMinutes());
        presenceVersion = 0; // force refresh
        fetchPresence();
    });

    async function fetchPresence() {
        try {
            const minutes = getMinutes();
            const res = await fetch(`/fn/place/${encodeURIComponent(placeId)}/presence?minutes=${minutes}`);
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
            const res = await fetch(`/fn/place/${encodeURIComponent(placeId)}/events?limit=100`);
            if (!res.ok) {
                window.handleError(`Failed to fetch events: ${res.status}`);
                return;
            }
            const data = await res.json();
            const events = data.events || [];
            if (events.length === knownCount) return;
            knownCount = events.length;
            renderMetrics(events);
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
            for (const person of (ev.people || [])) {
                const name = person.name && person.name !== 'unknown' ? person.name : 'Person';
                presenceTypes.add('person:' + name);
            }
            for (const pet of (ev.pets || [])) {
                presenceTypes.add('pet:' + (pet.species || pet.name || 'pet'));
            }
        }
        metricPresences.textContent = presenceTypes.size;
    }

    function renderPresence(presence) {
        if (presence.length === 0) {
            presenceBody.innerHTML = '<tr><td colspan="4" class="empty-state">No presence detected yet</td></tr>';
            return;
        }
        presenceBody.innerHTML = presence.map(entry => {
            return `
            <tr>
                <td>${escapeHtml(entry.label)}</td>
                <td>${formatTime(entry.last_seen)}</td>
                <td>${formatTime(entry.first_seen)}</td>
                <td>${entry.event_count}</td>
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
            const payload = ev.payload || {};
            const type = ev.event_type || 'unknown';
            const snapshot = payload.snapshot || null;

            // Image on top
            const imgHtml = snapshot
                ? `<img src="${snapshot}" alt="snapshot" />`
                : `<div class="card-no-img">${type === 'faceDetected' ? '👤' : type === 'animalDetected' ? '🐾' : '📸'}</div>`;

            // Build fields from the event (excluding snapshot/image)
            const fields = [];
            fields.push(cardField('type', type));
            fields.push(cardField('time', formatTime(ev.created_at)));

            // People
            const people = ev.people || [];
            if (people.length > 0) {
                const names = people.map(p => p.name || 'unknown').join(', ');
                fields.push(cardField('people', `${people.length} (${names})`));
            }

            // Pets
            const pets = ev.pets || [];
            if (pets.length > 0) {
                const names = pets.map(p => p.species || p.name || 'pet').join(', ');
                fields.push(cardField('pets', `${pets.length} (${names})`));
            }

            // Payload fields (skip snapshot & redundant keys)
            const skipKeys = new Set(['snapshot', 'event_type', 'faceCount', 'animalCount', 'people', 'pets']);
            if (payload.faceCount != null) fields.push(cardField('faces', String(payload.faceCount)));
            if (payload.animalCount != null) fields.push(cardField('animals', String(payload.animalCount)));
            for (const [k, v] of Object.entries(payload)) {
                if (skipKeys.has(k)) continue;
                if (v === null || v === undefined || v === '') continue;
                const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
                if (val.length > 200) continue;
                fields.push(cardField(k, val));
            }

            return `<div class="hub-event-card">
                ${imgHtml}
                <div class="card-body">${fields.join('')}</div>
            </div>`;
        }).join('');
    }

    function cardField(key, value) {
        return `<div class="card-field"><span class="card-field-key">${escapeHtml(key)}:</span><span class="card-field-val">${escapeHtml(value)}</span></div>`;
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
