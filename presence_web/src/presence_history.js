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
        this.seq = 0;
        this.tableBody = document.getElementById('presenceBody');

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
}

// Instância global
if (!window.presenceHistory) {
    window.presenceHistory = new PresenceHistory();
}
