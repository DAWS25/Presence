/* ========================================
   ANIMAL DETECTION — COCO-SSD
   Uses TensorFlow.js + COCO-SSD to detect
   animals in the camera feed.
   ======================================== */

const ANIMAL_CLASSES = [
    'bird', 'cat', 'dog', 'horse', 'sheep',
    'cow', 'elephant', 'bear', 'zebra', 'giraffe'
];

class AnimalDetector {
    constructor() {
        this.model = null;
        this.isReady = false;
        this.lastDetectTs = 0;
        this.detectionIntervalMs = 500;
        this.lastEventTs = 0;
        this.cooldownMs = 15000;
        this.videoEl = document.getElementById('video');
        this.canvasEl = document.getElementById('canvas');
        this.animalCountEl = document.getElementById('animalCount');
        this.lastAnimals = [];
    }

    async load() {
        if (typeof cocoSsd === 'undefined') {
            console.warn('COCO-SSD library not loaded — animal detection disabled');
            return;
        }
        console.log('🐾 Loading COCO-SSD model...');
        this.model = await cocoSsd.load();
        this.isReady = true;
        console.log('✅ COCO-SSD model loaded');

        if (window.presenceHistory && window.i18n) {
            window.presenceHistory.addWelcomeMessage(
                window.i18n.t('init.cocossd.title') || 'Animal Detection',
                window.i18n.t('init.cocossd.message') || 'COCO-SSD model loaded — detecting animals',
                '🐾'
            );
        }
    }

    async detect() {
        if (!this.isReady || !this.videoEl.videoWidth) return [];

        const now = performance.now();
        if (now - this.lastDetectTs < this.detectionIntervalMs) return this.lastAnimals;
        this.lastDetectTs = now;

        const predictions = await this.model.detect(this.videoEl);
        const animals = predictions.filter(p => ANIMAL_CLASSES.includes(p.class));
        this.lastAnimals = animals;

        if (this.animalCountEl) {
            this.animalCountEl.textContent = animals.length;
        }

        return animals;
    }

    draw(animals) {
        if (!animals.length) return;
        const ctx = this.canvasEl.getContext('2d');
        ctx.strokeStyle = '#a9b665';
        ctx.lineWidth = 2;
        ctx.font = '14px monospace';
        ctx.fillStyle = '#a9b665';

        for (const animal of animals) {
            const [x, y, w, h] = animal.bbox;
            ctx.strokeRect(x, y, w, h);
            const label = `${animal.class} ${Math.round(animal.score * 100)}%`;
            ctx.fillText(label, x, y > 16 ? y - 4 : y + h + 14);
        }
    }

    /**
     * Extract average RGB color from a region of the video frame.
     */
    extractAvgColor(x, y, w, h) {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const sw = Math.max(1, Math.round(w));
            const sh = Math.max(1, Math.round(h));
            canvas.width = sw;
            canvas.height = sh;
            ctx.drawImage(this.videoEl, x, y, w, h, 0, 0, sw, sh);
            const data = ctx.getImageData(0, 0, sw, sh).data;
            let r = 0, g = 0, b = 0, count = 0;
            for (let i = 0; i < data.length; i += 16) { // sample every 4th pixel
                r += data[i];
                g += data[i + 1];
                b += data[i + 2];
                count++;
            }
            if (count === 0) return [128, 128, 128];
            return [Math.round(r / count), Math.round(g / count), Math.round(b / count)];
        } catch {
            return [128, 128, 128];
        }
    }
}

window.animalDetector = new AnimalDetector();
