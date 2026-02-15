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
        this.maxEvents = 100;
        this.displayCount = 100; // max visible events
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

        // Match each face and resolve person name from known people
        const matchedNames = boxes.map((box) => {
            const personKey = this.upsertPerson(box, snapshot, timestamp);
            const person = this.people.get(personKey);
            return person && person.personName ? person.personName : null;
        });

        // Use first matched name for the event card
        const knownName = matchedNames.find((n) => n !== null) || null;

        this.events.unshift({
            timestamp,
            snapshot,
            faceCount: typeof data?.faceCount === 'number' ? data.faceCount : boxes.length,
            personName: knownName,
        });
        if (this.events.length > this.maxEvents) {
            this.events.length = this.maxEvents;
        }
        this.render();
    }

    /**
     * Update matched person or create a new one; maintains FIFO of people.
     * Returns the matched/created person key.
     */
    upsertPerson(box, snapshot, timestamp) {
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
            this.people.set(matchKey, person);
            return matchKey;
        }

        const id = ++this.seq;
        const person = {
            id,
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
        if (this.events.length > this.maxEvents) {
            this.events.length = this.maxEvents;
        }
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
            const personName = eventItem.personName || (window.i18n ? window.i18n.t('events.detection.unknown') : 'Unknown presence');
            const eventIndex = this.events.indexOf(eventItem);

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
     * Render detail view for a selected event
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
        const personName = eventItem.personName || t('events.detection.unknown');

        const imgHtml = eventItem.snapshot
            ? `<img class="event-detail-img" src="${eventItem.snapshot}" alt="Face" />`
            : '';

        const detailHtml = `
            <div class="event-detail">
                <div class="event-detail-header">
                    <div class="event-title">${t('events.detail.title')}</div>
                    <button class="event-detail-close" aria-label="${t('events.detail.close')}">&times;</button>
                </div>
                ${imgHtml}
                <div class="event-detail-info">
                    <div class="event-detail-row">
                        <span class="event-detail-label">${t('events.detail.person')}</span>
                        <input class="event-detail-input" id="eventPersonName" type="text" value="${personName}" />
                    </div>
                    <div class="event-detail-row">
                        <span class="event-detail-label">${t('events.detail.faces')}</span>
                        <span>${eventItem.faceCount}</span>
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

        const closeBtn = detailContent.querySelector('.event-detail-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeDetail());
        }

        const saveBtn = detailContent.querySelector('#eventSaveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const input = detailContent.querySelector('#eventPersonName');
                if (input && input.value.trim()) {
                    const name = input.value.trim();
                    eventItem.personName = name;
                    // Also update the person record so future detections inherit the name
                    this.updatePersonName(eventItem, name);
                }
                this.closeDetail();
            });
        }
    }
    /**
     * Update the person record that best matches this event so future detections inherit the name.
     */
    updatePersonName(eventItem, name) {
        // Find the person whose last snapshot matches or closest by timestamp
        let bestKey = null;
        let bestTimeDiff = Infinity;
        for (const [key, person] of this.people.entries()) {
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
