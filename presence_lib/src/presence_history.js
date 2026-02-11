/* ========================================
    PRESENCE HISTORY
    In-memory detections (FIFO 333)
    ======================================== */

class PresenceHistory {
    /**
     * Builds in-memory history (up to maxSize people) and registers faceDetected listener.
     */
    constructor(maxSize = 333) {
        this.maxSize = maxSize; // max pessoas
        this.people = new Map(); // key -> person
        this.events = []; // eventos recentes
        this.maxEvents = 50;
        this.seq = 0;
        this.tableBody = document.getElementById('presenceBody');
        this.cardsEl = document.getElementById('presenceCards');
        this.selectedEvent = null;

        if (window.eventManager && !window.__presenceHistoryListenerAdded) {
            window.eventManager.on('faceDetected', (data) => this.processDetections(data));
            window.__presenceHistoryListenerAdded = true;
        } else if (!window.eventManager) {
            console.warn('EventManager não encontrado para PresenceHistory');
        }
    }

    /**
     * Process a detection event, assigning each bounding box to a person.
     */
    processDetections(data) {
        const { boxes = [], snapshot = null, timestamp = new Date().toISOString() } = data || {};
        this.events.unshift({
            timestamp,
            snapshot,
            faceCount: typeof data?.faceCount === 'number' ? data.faceCount : boxes.length,
        });
        if (this.events.length > this.maxEvents) {
            this.events.length = this.maxEvents;
        }
        boxes.forEach((box) => this.upsertPerson(box, snapshot, timestamp));
        this.render();
    }

    /**
     * Update matched person or create a new one; maintains FIFO of people.
     */
    upsertPerson(box, snapshot, timestamp) {
        const matchKey = this.findMatch(box);
        if (matchKey !== null) {
            const person = this.people.get(matchKey);
            person.count += 1;
            person.lastTimestamp = timestamp;
            person.lastSnapshot = snapshot || person.lastSnapshot;
            person.box = box;
            this.people.set(matchKey, person);
            return;
        }

        const id = ++this.seq;
        const person = {
            id,
            count: 1,
            firstTimestamp: timestamp,
            lastTimestamp: timestamp,
            lastSnapshot: snapshot,
            box,
        };

        this.people.set(id, person);

        // FIFO por pessoa, mantém tamanho máximo
        if (this.people.size > this.maxSize) {
            const oldestKey = this.people.keys().next().value;
            this.people.delete(oldestKey);
        }
    }

    // Simple heuristic: match by bounding-box IoU
    /**
     * Find person whose box IoU exceeds threshold; return key or null.
     */
    findMatch(box) {
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
    addWelcomeMessage(title, message) {
        const msgEvent = {
            timestamp: new Date().toISOString(),
            snapshot: null,
            faceCount: 0,
            isWelcome: true,
            title,
            message
        };
        this.events.unshift(msgEvent);
        if (this.events.length > this.maxEvents) {
            this.events.length = this.maxEvents;
        }
        this.renderCards();
    }

    renderCards() {
        if (!this.cardsEl) return;

        // If an event is selected, show detail view
        if (this.selectedEvent !== null) {
            this.renderEventDetail(this.selectedEvent);
            return;
        }

        if (this.events.length === 0) {
            this.cardsEl.innerHTML = '<div class="events-empty">Sem deteccoes</div>';
            return;
        }

        // Show only latest 3 events
        const latestEvents = this.events.slice(0, 3);
        const cardsHtml = latestEvents.map((eventItem) => {
            const timeStr = new Date(eventItem.timestamp).toLocaleTimeString();
            
            // Render welcome messages differently
            if (eventItem.isWelcome) {
                return `
                    <div class="event-card event-card-welcome">
                        <div class="event-header">
                            <div class="event-title">${eventItem.title}</div>
                            <div class="event-time">${timeStr}</div>
                        </div>
                        <div class="event-info">
                            <div class="event-meta">${eventItem.message}</div>
                        </div>
                    </div>
                `;
            }
            
            const imgHtml = eventItem.snapshot
                ? `<img src="${eventItem.snapshot}" alt="Face" />`
                : '<div class="events-empty">Sem imagem</div>';

            const detectionTitle = window.i18n ? window.i18n.t('events.detection.title') : 'Deteccao';
            const personName = eventItem.personName || (window.i18n ? window.i18n.t('events.detection.unknown') : 'Unknown presence');
            const eventIndex = this.events.indexOf(eventItem);

            return `
                <div class="event-card">
                    ${imgHtml}
                    <div class="event-info">
                        <div class="event-header">
                            <div class="event-title event-title-clickable" data-event-index="${eventIndex}">${detectionTitle}</div>
                            <div class="event-time">${timeStr}</div>
                        </div>
                        <div class="event-person">${personName}</div>
                        <div class="event-meta">Faces: ${eventItem.faceCount}</div>
                    </div>
                </div>
            `;
        }).join('');

        this.cardsEl.innerHTML = cardsHtml;

        // Attach click handlers to detection titles
        this.cardsEl.querySelectorAll('.event-title-clickable').forEach((el) => {
            el.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.eventIndex, 10);
                if (!isNaN(index) && this.events[index]) {
                    this.selectedEvent = index;
                    this.renderCards();
                }
            });
        });
    }

    /**
     * Render detail view for a selected event
     */
    renderEventDetail(index) {
        if (!this.cardsEl) return;
        const eventItem = this.events[index];
        if (!eventItem) {
            this.selectedEvent = null;
            this.renderCards();
            return;
        }

        const t = (key) => window.i18n ? window.i18n.t(key) : key;
        const timeStr = new Date(eventItem.timestamp).toLocaleTimeString();
        const dateStr = new Date(eventItem.timestamp).toLocaleDateString();
        const personName = eventItem.personName || t('events.detection.unknown');

        const imgHtml = eventItem.snapshot
            ? `<img class="event-detail-img" src="${eventItem.snapshot}" alt="Face" />`
            : '';

        this.cardsEl.innerHTML = `
            <div class="event-detail">
                <div class="event-detail-header">
                    <div class="event-title">${t('events.detail.title')}</div>
                    <button class="event-detail-close" aria-label="${t('events.detail.close')}">&times;</button>
                </div>
                ${imgHtml}
                <div class="event-detail-info">
                    <div class="event-detail-row">
                        <span class="event-detail-label">${t('events.detail.person')}</span>
                        <span class="event-person">${personName}</span>
                    </div>
                    <div class="event-detail-row">
                        <span class="event-detail-label">${t('events.detail.faces')}</span>
                        <span>${eventItem.faceCount}</span>
                    </div>
                    <div class="event-detail-row">
                        <span class="event-detail-label">${t('events.detail.time')}</span>
                        <span>${timeStr}</span>
                    </div>
                    <div class="event-detail-row">
                        <span class="event-detail-label">${t('events.detail.date')}</span>
                        <span>${dateStr}</span>
                    </div>
                </div>
            </div>
        `;

        this.cardsEl.querySelector('.event-detail-close').addEventListener('click', () => {
            this.selectedEvent = null;
            this.renderCards();
        });
    }
}

// Instância global
if (!window.presenceHistory) {
    window.presenceHistory = new PresenceHistory();
}
