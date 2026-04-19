/* ========================================
    PRESENCE HISTORY
    In-memory detections (FIFO 333 people)
    Events: unlimited storage, display latest 10
    ======================================== */

class PresenceHistory {
    /**
     * Builds in-memory history (up to maxSize people) and registers faceDetected listener.
     */
    constructor(maxSize = 333) {
        this.maxSize = maxSize; // max pessoas
        this.people = new Map(); // key -> person
        this.events = []; // all events kept in memory for face recognition
        this.displayCount = 10; // max visible events in panel
        this.seq = 0;
        this.tableBody = document.getElementById('presenceBody');
        this.cardsEl = document.getElementById('presenceCards');
        this.detailContent = document.getElementById('detailContent');
        this.detailCloseBtn = document.getElementById('detailCloseBtn');
        this.selectedEvent = null;

        if (this.detailCloseBtn) {
            this.detailCloseBtn.addEventListener('click', () => this.closeDetail());
        }

        if (window.eventManager && !window.__presenceHistoryListenerAdded) {
            window.eventManager.on('faceDetected', (data) => this.processDetections(data));
            window.eventManager.on('animalDetected', (data) => this.processAnimalDetections(data));
            window.eventManager.on('snapshotTaken', (data) => this.processSnapshot(data));
            window.__presenceHistoryListenerAdded = true;
        } else if (!window.eventManager) {
            console.warn('EventManager não encontrado para PresenceHistory');
        }

        this.loadHistory();
    }

    /**
     * Fetch past events from server and seed in-memory people/pets maps for recognition.
     * Does not add events to the visible UI list.
     */
    async loadHistory() {
        const placeId = new URLSearchParams(window.location.search).get('place');
        if (!placeId) return;

        try {
            const res = await fetch(`/fn/place/${encodeURIComponent(placeId)}/events?limit=1000`);
            if (!res.ok) {
                console.warn(`[history] Failed to load history: ${res.status}`);
                return;
            }
            const data = await res.json();
            const events = data.events || [];
            let peopleLoaded = 0;
            let petsLoaded = 0;

            for (const ev of events) {
                const timestamp = ev.created_at || new Date().toISOString();

                // Seed people (face descriptors) for recognition
                if (ev.people && ev.people.length > 0) {
                    for (const person of ev.people) {
                        const box = person.box || {};
                        if (person.descriptor) box.descriptor = person.descriptor;
                        const key = this.upsertPerson(box, null, timestamp, person.subject_id || null);
                        const existing = this.people.get(key);
                        if (person.name && person.name !== 'unknown' && existing) {
                            existing.personName = person.name;
                        }
                        peopleLoaded++;
                    }
                }

                // Seed pets (color/shape) for recognition
                if (ev.pets && ev.pets.length > 0) {
                    for (const pet of ev.pets) {
                        const box = pet.bbox
                            ? { x: pet.bbox[0], y: pet.bbox[1], width: pet.bbox[2], height: pet.bbox[3] }
                            : {};
                        box.species = pet.species || pet.name || 'pet';
                        box.color = pet.color || null;
                        box.aspectRatio = pet.aspectRatio || null;
                        this.upsertPet(box, null, timestamp);
                        petsLoaded++;
                    }
                }
            }

            console.log(`[history] Loaded ${events.length} events → ${peopleLoaded} people, ${petsLoaded} pets → ${this.people.size} subjects in memory`);
        } catch (err) {
            console.warn('[history] Failed to load history:', err);
        }
    }

    /**
     * Process a detection event, assigning each bounding box to a person.
     */
    processDetections(data) {
        const { people = [], snapshot = null, timestamp = new Date().toISOString() } = data || {};

        // Convert people to box format for matching and resolve person names
        const matchedNames = people.map((person) => {
            const box = person.box || {};
            if (person.descriptor) box.descriptor = person.descriptor;
            const personKey = this.upsertPerson(box, snapshot, timestamp);
            const existing = this.people.get(personKey);
            // If the incoming person has a known name, store it
            if (person.name && person.name !== 'unknown' && existing) {
                existing.personName = person.name;
            }
            return existing && existing.personName ? existing.personName : null;
        });

        // Use first matched name for the event card
        const knownName = matchedNames.find((n) => n !== null) || null;

        this.events.unshift({
            timestamp,
            snapshot,
            event_id: data?.event_id || null,
            faceCount: typeof data?.faceCount === 'number' ? data.faceCount : people.length,
            personName: knownName,
            detectedPeople: people.map((p, i) => ({
                name: matchedNames[i] || p.name || 'unknown',
                type: 'person',
            })),
            detectedPets: [],
        });
        this.render();

        // If any person was recognized, update the server so the event stores the resolved name
        if (knownName && data?.event_id) {
            this._saveEventToServer(this.events[0]);
        }
    }

    /**
     * Process an animal detection event, matching pets by IoU + species.
     */
    processAnimalDetections(data) {
        const { pets = [], snapshot = null, timestamp = new Date().toISOString() } = data || {};

        const matchedNames = pets.map((pet) => {
            const box = pet.bbox
                ? { x: pet.bbox[0], y: pet.bbox[1], width: pet.bbox[2], height: pet.bbox[3] }
                : {};
            box.species = pet.species || pet.name || 'pet';
            box.color = pet.color || null;
            box.aspectRatio = pet.aspectRatio || null;
            const personKey = this.upsertPet(box, snapshot, timestamp);
            const existing = this.people.get(personKey);
            if (pet.name && pet.name !== box.species && existing) {
                existing.personName = pet.name;
            }
            return existing && existing.personName ? existing.personName : box.species;
        });

        const names = matchedNames.join(', ');

        this.events.unshift({
            timestamp,
            snapshot,
            event_id: data?.event_id || null,
            faceCount: 0,
            animalCount: pets.length,
            animalNames: names,
            isAnimal: true,
            personName: null,
            detectedPeople: [],
            detectedPets: pets.map((p, i) => ({
                name: matchedNames[i] || p.species || p.name || 'pet',
                species: p.species || p.name || 'pet',
                type: 'pet',
            })),
        });
        this.render();
    }

    /**
     * Process a snapshot event (no detections).
     */
    processSnapshot(data) {
        const { snapshot = null, timestamp = new Date().toISOString() } = data || {};
        this.events.unshift({
            timestamp,
            snapshot,
            event_id: data?.event_id || null,
            faceCount: 0,
            animalCount: 0,
            isSnapshot: true,
            personName: null,
            detectedPeople: [],
            detectedPets: [],
        });
        this.render();
    }

    /**
     * Match a pet by color + shape similarity, or create a new entry. Returns key.
     */
    upsertPet(box, snapshot, timestamp) {
        let matchKey = this.findPetMatchByColorShape(box);

        if (matchKey !== null) {
            const pet = this.people.get(matchKey);
            pet.count += 1;
            pet.lastTimestamp = timestamp;
            pet.lastSnapshot = snapshot || pet.lastSnapshot;
            pet.box = box;
            if (box.color) pet.color = box.color;
            if (box.aspectRatio) pet.aspectRatio = box.aspectRatio;
            this.people.set(matchKey, pet);
            return matchKey;
        }

        const id = ++this.seq;
        const pet = {
            id,
            count: 1,
            firstTimestamp: timestamp,
            lastTimestamp: timestamp,
            lastSnapshot: snapshot,
            box,
            descriptor: null,
            personName: null,
            species: box.species || 'pet',
            isPet: true,
            color: box.color || null,
            aspectRatio: box.aspectRatio || null,
        };

        this.people.set(id, pet);

        if (this.people.size > this.maxSize) {
            const oldestKey = this.people.keys().next().value;
            this.people.delete(oldestKey);
        }
        return id;
    }

    /**
     * Find a pet by color similarity + aspect ratio, same species only. Returns key or null.
     */
    findPetMatchByColorShape(box) {
        if (!box || !box.color) return null;
        const colorThreshold = 60;  // max Euclidean distance in RGB space
        const ratioThreshold = 0.4; // max aspect ratio difference
        let bestKey = null;
        let bestDist = Infinity;

        for (const [key, entry] of this.people.entries()) {
            if (!entry.isPet || !entry.color) continue;
            if (entry.species && box.species && entry.species !== box.species) continue;

            const colorDist = Math.sqrt(
                (box.color[0] - entry.color[0]) ** 2 +
                (box.color[1] - entry.color[1]) ** 2 +
                (box.color[2] - entry.color[2]) ** 2
            );
            if (colorDist > colorThreshold) continue;

            if (box.aspectRatio && entry.aspectRatio) {
                const ratioDiff = Math.abs(box.aspectRatio - entry.aspectRatio);
                if (ratioDiff > ratioThreshold) continue;
            }

            if (colorDist < bestDist) {
                bestDist = colorDist;
                bestKey = key;
            }
        }
        return bestKey;
    }

    /**
     * Update matched person or create a new one; maintains FIFO of people.
     * Returns the matched/created person key.
     */
    upsertPerson(box, snapshot, timestamp, subjectId) {
        // Prefer descriptor matching over IoU
        let matchKey = this.findMatchByDescriptor(box);
        if (matchKey === null) {
            matchKey = this.findMatchByIoU(box);
        }

        if (matchKey !== null) {
            const person = this.people.get(matchKey);
            person.count += 1;
            person.lastTimestamp = timestamp;
            person.lastSnapshot = snapshot || person.lastSnapshot;
            person.box = box;
            // Update descriptor if available
            if (box.descriptor) {
                person.descriptor = box.descriptor;
            }
            // Preserve a known subjectId if not yet set
            if (subjectId && !person.subjectId) {
                person.subjectId = subjectId;
            }
            this.people.set(matchKey, person);
            return matchKey;
        }

        const id = ++this.seq;
        const person = {
            id,
            subjectId: subjectId || crypto.randomUUID(),
            count: 1,
            firstTimestamp: timestamp,
            lastTimestamp: timestamp,
            lastSnapshot: snapshot,
            box,
            descriptor: box.descriptor || null,
            personName: null,
        };

        this.people.set(id, person);

        // FIFO por pessoa, mantém tamanho máximo
        if (this.people.size > this.maxSize) {
            const oldestKey = this.people.keys().next().value;
            this.people.delete(oldestKey);
        }
        return id;
    }

    /**
     * Find person by face descriptor (128-dim Euclidean distance). Returns key or null.
     */
    findMatchByDescriptor(box) {
        if (!box || !box.descriptor) return null;
        const threshold = 0.6; // face-api.js recommended threshold
        let bestKey = null;
        let bestDist = Infinity;
        for (const [key, person] of this.people.entries()) {
            if (!person.descriptor) continue;
            const dist = this.euclideanDistance(box.descriptor, person.descriptor);
            if (dist < threshold && dist < bestDist) {
                bestDist = dist;
                bestKey = key;
            }
        }
        return bestKey;
    }

    /**
     * Compute Euclidean distance between two descriptor arrays.
     */
    euclideanDistance(a, b) {
        if (!a || !b || a.length !== b.length) return Infinity;
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            const d = a[i] - b[i];
            sum += d * d;
        }
        return Math.sqrt(sum);
    }

    /**
     * Fallback: match by bounding-box IoU. Returns key or null.
     */
    findMatchByIoU(box) {
        if (!box) return null;
        const iouThreshold = 0.3;
        let bestKey = null;
        let bestIoU = 0;
        for (const [key, person] of this.people.entries()) {
            const iou = this.computeIoU(box, person.box);
            if (iou > iouThreshold && iou > bestIoU) {
                bestIoU = iou;
                bestKey = key;
            }
        }
        return bestKey;
    }

    /**
     * Compute Intersection over Union (IoU) between two boxes. Returns 0 if data missing.
     */
    computeIoU(a, b) {
        if (!a || !b || [a.x,a.y,a.width,a.height,b.x,b.y,b.width,b.height].some(v => v === null || v === undefined)) return 0;
        const x1 = Math.max(a.x, b.x);
        const y1 = Math.max(a.y, b.y);
        const x2 = Math.min(a.x + a.width, b.x + b.width);
        const y2 = Math.min(a.y + a.height, b.y + b.height);
        const interArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
        const unionArea = a.width * a.height + b.width * b.height - interArea;
        if (unionArea <= 0) return 0;
        return interArea / unionArea;
    }

    /**
     * Render table with one row per person, ordered by latest timestamp.
     */
    render() {
        if (!this.tableBody && !this.cardsEl) return;

        this.renderTable();
        this.renderCards();
    }

    renderTable() {
        if (!this.tableBody) return;
        const entries = Array.from(this.people.values()).sort((a, b) => b.lastTimestamp.localeCompare(a.lastTimestamp));
        if (entries.length === 0) {
            this.tableBody.innerHTML = '<tr><td colspan="4" class="text-muted">Sem detecções</td></tr>';
            return;
        }

        const rowsHtml = entries.map((person) => {
            const lastStr = new Date(person.lastTimestamp).toLocaleString();
            const imgHtml = person.lastSnapshot
                ? `<img class="face-thumb" src="${person.lastSnapshot}" alt="Face" />`
                : '<span class="text-muted">(sem imagem)</span>';

            return `
                <tr>
                    <td>Pessoa #${person.id}</td>
                    <td>${person.count}</td>
                    <td>${lastStr}</td>
                    <td>${imgHtml}</td>
                </tr>
            `;
        }).join('');

        this.tableBody.innerHTML = rowsHtml;
    }

    /**
     * Add a welcome message to the events panel
     */
    addWelcomeMessage(title, message, icon) {
        const msgEvent = {
            timestamp: new Date().toISOString(),
            snapshot: null,
            faceCount: 0,
            isWelcome: true,
            title,
            message,
            icon: icon || 'ℹ️',
        };
        this.events.unshift(msgEvent);
        this.renderCards();
    }

    renderCards() {
        if (!this.cardsEl) return;

        if (this.events.length === 0) {
            this.cardsEl.innerHTML = '';
            return;
        }

        // Show all events (up to displayCount)
        const visibleEvents = this.events.slice(0, this.displayCount);
        const cardsHtml = visibleEvents.map((eventItem) => {
            const timeStr = new Date(eventItem.timestamp).toLocaleTimeString();
            
            // Render welcome messages differently
            if (eventItem.isWelcome) {
                const icon = eventItem.icon || 'ℹ️';
                return `
                    <div class="event-card event-card-welcome">
                        <div class="event-card-icon">${icon}</div>
                        <div class="event-info">
                            <div class="event-header">
                                <div class="event-title">${eventItem.title}</div>
                                <div class="event-time">${timeStr}</div>
                            </div>
                            <div class="event-meta">${eventItem.message}</div>
                        </div>
                    </div>
                `;
            }
            
            const imgHtml = eventItem.snapshot
                ? `<img src="${eventItem.snapshot}" alt="Face" />`
                : '<div class="events-empty">Sem imagem</div>';

            const detectionTitle = window.i18n ? window.i18n.t('events.detection.title') : 'Deteccao';
            const animalTitle = window.i18n ? window.i18n.t('events.detection.animal') : 'Pet Detected';
            const personName = eventItem.personName || (window.i18n ? window.i18n.t('events.detection.unknown') : 'Unknown presence');
            const eventIndex = this.events.indexOf(eventItem);

            if (eventItem.isAnimal) {
                return `
                    <div class="event-card event-card-clickable" data-event-index="${eventIndex}">
                        ${imgHtml}
                        <div class="event-info">
                            <div class="event-header">
                                <div class="event-title">\ud83d\udc3e ${animalTitle}</div>
                                <div class="event-time">${timeStr}</div>
                            </div>
                            <div class="event-person">${eventItem.animalNames}</div>
                            <div class="event-meta">Pets: ${eventItem.animalCount}</div>
                        </div>
                        <span class="event-card-expand">\ud83d\udc46</span>
                    </div>
                `;
            }

            if (eventItem.isSnapshot) {
                return `
                    <div class="event-card" data-event-index="${eventIndex}">
                        ${imgHtml}
                        <div class="event-info">
                            <div class="event-header">
                                <div class="event-title">📸 Snapshot</div>
                                <div class="event-time">${timeStr}</div>
                            </div>
                            <div class="event-meta">No detections</div>
                        </div>
                    </div>
                `;
            }

            return `
                <div class="event-card event-card-clickable" data-event-index="${eventIndex}">
                    ${imgHtml}
                    <div class="event-info">
                        <div class="event-header">
                            <div class="event-title">${detectionTitle}</div>
                            <div class="event-time">${timeStr}</div>
                        </div>
                        <div class="event-person">${personName}</div>
                        <div class="event-meta">Faces: ${eventItem.faceCount}</div>
                    </div>
                    <span class="event-card-expand">👆</span>
                </div>
            `;
        }).join('');

        this.cardsEl.innerHTML = cardsHtml;

        // Attach click handlers to detection cards
        this.cardsEl.querySelectorAll('.event-card-clickable').forEach((el) => {
            el.addEventListener('click', (e) => {
                const index = parseInt(el.dataset.eventIndex, 10);
                if (!isNaN(index) && this.events[index]) {
                    this.showEventDetail(index);
                }
            });
        });
    }

    /**
     * Scroll the events list container left (native scroll).
     */
    scrollLeft() {
        if (this.cardsEl) {
            this.cardsEl.scrollBy({ left: -200, behavior: 'smooth' });
        }
    }

    /**
     * Scroll the events list container right (native scroll).
     */
    scrollRight() {
        if (this.cardsEl) {
            this.cardsEl.scrollBy({ left: 200, behavior: 'smooth' });
        }
    }

    /**
     * Show event detail in fullscreen detail screen
     */
    showEventDetail(index) {
        this.selectedEvent = index;
        this.renderEventDetail(index);
        if (window.screenManager) {
            window.screenManager.showDetailScreen();
        }
    }

    /**
     * Close detail screen and restore main view.
     */
    closeDetail() {
        this.selectedEvent = null;
        if (window.screenManager) {
            window.screenManager.showMainScreen();
            window.screenManager.clearDetailContent();
        } else if (this.detailContent) {
            this.detailContent.innerHTML = '';
        }
        this.renderCards();
    }

    /**
     * Render detail view for a selected event with editable subject rows.
     */
    renderEventDetail(index) {
        const detailContent = this.detailContent || document.getElementById('detailContent');
        if (!detailContent) return;
        
        const eventItem = this.events[index];
        if (!eventItem) {
            this.selectedEvent = null;
            this.renderCards();
            return;
        }

        const t = (key) => window.i18n ? window.i18n.t(key) : key;
        const timeStr = new Date(eventItem.timestamp).toLocaleTimeString();
        const dateStr = new Date(eventItem.timestamp).toLocaleDateString();

        const imgHtml = eventItem.snapshot
            ? `<img class="event-detail-img" src="${eventItem.snapshot}" alt="Face" />`
            : '';

        const peopleRows = (eventItem.detectedPeople || []).map((p, i) => `
            <div class="event-detail-row subject-row" data-type="person" data-index="${i}">
                <span class="event-detail-label">👤</span>
                <input class="event-detail-input subject-name" type="text" value="${this._escapeAttr(p.name)}" placeholder="Name" />
                <button class="subject-remove" title="Remove">✕</button>
            </div>
        `).join('');

        const petRows = (eventItem.detectedPets || []).map((p, i) => `
            <div class="event-detail-row subject-row" data-type="pet" data-index="${i}">
                <span class="event-detail-label">🐾</span>
                <input class="event-detail-input subject-name" type="text" value="${this._escapeAttr(p.name)}" placeholder="Name" />
                <span class="subject-species">${this._escapeAttr(p.species || '')}</span>
                <button class="subject-remove" title="Remove">✕</button>
            </div>
        `).join('');

        const detailHtml = `
            <div class="event-detail">
                <div class="event-detail-header">
                    <div class="event-title">${t('events.detail.title')}</div>
                </div>
                ${imgHtml}
                <div class="event-detail-info">
                    <div class="event-detail-section">
                        <div class="event-detail-section-header">
                            <span>People</span>
                            <button class="subject-add" id="addPerson">+ Add</button>
                        </div>
                        <div id="peopleList">${peopleRows || '<div class="text-muted">None detected</div>'}</div>
                    </div>
                    <div class="event-detail-section">
                        <div class="event-detail-section-header">
                            <span>Pets</span>
                            <button class="subject-add" id="addPet">+ Add</button>
                        </div>
                        <div id="petsList">${petRows || '<div class="text-muted">None detected</div>'}</div>
                    </div>
                    <div class="event-detail-row">
                        <span class="event-detail-label">${t('events.detail.time')}</span>
                        <span>${timeStr} — ${dateStr}</span>
                    </div>
                </div>
                <button class="event-detail-save" id="eventSaveBtn">${t('events.detail.save')}</button>
            </div>
        `;

        if (window.screenManager) {
            window.screenManager.setDetailContent(detailHtml);
        } else {
            detailContent.innerHTML = detailHtml;
        }

        this._attachDetailHandlers(detailContent, eventItem);
    }

    /**
     * Escape a string for use in an HTML attribute value.
     */
    _escapeAttr(str) {
        const el = document.createElement('span');
        el.textContent = str || '';
        return el.innerHTML.replace(/"/g, '&quot;');
    }

    /**
     * Attach event handlers for the detail view (add/remove/save).
     */
    _attachDetailHandlers(container, eventItem) {
        // Add person button
        const addPersonBtn = container.querySelector('#addPerson');
        if (addPersonBtn) {
            addPersonBtn.addEventListener('click', () => {
                eventItem.detectedPeople = eventItem.detectedPeople || [];
                eventItem.detectedPeople.push({ name: '', type: 'person' });
                this.renderEventDetail(this.selectedEvent);
            });
        }

        // Add pet button
        const addPetBtn = container.querySelector('#addPet');
        if (addPetBtn) {
            addPetBtn.addEventListener('click', () => {
                eventItem.detectedPets = eventItem.detectedPets || [];
                eventItem.detectedPets.push({ name: '', species: 'pet', type: 'pet' });
                this.renderEventDetail(this.selectedEvent);
            });
        }

        // Remove buttons
        container.querySelectorAll('.subject-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const row = btn.closest('.subject-row');
                const type = row.dataset.type;
                const idx = parseInt(row.dataset.index, 10);
                if (type === 'person') {
                    eventItem.detectedPeople.splice(idx, 1);
                } else {
                    eventItem.detectedPets.splice(idx, 1);
                }
                this.renderEventDetail(this.selectedEvent);
            });
        });

        // Save button
        const saveBtn = container.querySelector('#eventSaveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                // Read all people names from inputs
                const peopleInputs = container.querySelectorAll('#peopleList .subject-name');
                eventItem.detectedPeople = Array.from(peopleInputs).map(input => ({
                    name: input.value.trim() || 'unknown',
                    type: 'person',
                }));

                // Read all pet names from inputs
                const petInputs = container.querySelectorAll('#petsList .subject-row');
                eventItem.detectedPets = Array.from(petInputs).map(row => {
                    const nameInput = row.querySelector('.subject-name');
                    const speciesEl = row.querySelector('.subject-species');
                    return {
                        name: nameInput ? nameInput.value.trim() || 'pet' : 'pet',
                        species: speciesEl ? speciesEl.textContent.trim() || 'pet' : 'pet',
                        type: 'pet',
                    };
                });

                // Update card display name
                const knownPerson = eventItem.detectedPeople.find(p => p.name && p.name !== 'unknown');
                eventItem.personName = knownPerson ? knownPerson.name : null;
                if (eventItem.isAnimal) {
                    eventItem.animalNames = eventItem.detectedPets.map(p => p.name).join(', ');
                }

                // Update in-memory person records for future recognition
                for (const p of eventItem.detectedPeople) {
                    if (p.name && p.name !== 'unknown') {
                        this.updatePersonName(eventItem, p.name);
                    }
                }

                // Send update to server
                this._saveEventToServer(eventItem);

                this.closeDetail();
            });
        }
    }

    /**
     * Send updated people/pets to the server for an event.
     */
    async _saveEventToServer(eventItem) {
        if (!eventItem.event_id) {
            console.warn('[history] No event_id, cannot save to server');
            return;
        }
        const placeId = new URLSearchParams(window.location.search).get('place');
        if (!placeId) return;

        const body = {
            event_id: eventItem.event_id,
            people: (eventItem.detectedPeople || []).map(p => ({ name: p.name || 'unknown' })),
            pets: (eventItem.detectedPets || []).map(p => ({ name: p.name || 'pet', species: p.species || 'pet' })),
        };

        try {
            const res = await fetch(`/fn/place/${encodeURIComponent(placeId)}/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                console.warn(`[history] Failed to save event: ${res.status}`);
                return;
            }
            console.log(`[history] Event ${eventItem.event_id} updated on server`);
        } catch (err) {
            console.warn('[history] Failed to save event:', err);
        }
    }

    /**
     * Update the person record that best matches this event so future detections inherit the name.
     */
    updatePersonName(eventItem, name) {
        let bestKey = null;
        let bestTimeDiff = Infinity;
        for (const [key, person] of this.people.entries()) {
            if (person.isPet) continue;
            const diff = Math.abs(new Date(person.lastTimestamp) - new Date(eventItem.timestamp));
            if (diff < bestTimeDiff) {
                bestTimeDiff = diff;
                bestKey = key;
            }
        }
        if (bestKey !== null) {
            const person = this.people.get(bestKey);
            person.personName = name;
        }
    }
}

// Instância global
if (!window.presenceHistory) {
    window.presenceHistory = new PresenceHistory();
}
