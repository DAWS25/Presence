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

        if (animals.length > 0 && window.eventManager) {
            const ts = Date.now();
            if (ts - this.lastEventTs >= this.cooldownMs) {
                const snapshot = this.getSnapshot ? this.getSnapshot() : null;
                window.eventManager.emit('animalDetected', {
                    animalCount: animals.length,
                    animals: animals.map(a => ({
                        class: a.class,
                        score: a.score,
                        bbox: a.bbox
                    })),
                    timestamp: new Date().toISOString(),
                    snapshot
                });
                this.lastEventTs = ts;
            }
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
}

window.animalDetector = new AnimalDetector();
