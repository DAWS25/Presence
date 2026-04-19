/* ========================================
    PRESENCE DETECTION APP - MINIMAL
    Camera + wireframes only
    ======================================== */

class PresenceApp {
    /**
     * Controls camera, detection, and presence event emission.
     */
    constructor() {
        this.videoEl = document.getElementById('video');
        this.canvasEl = document.getElementById('canvas');
        this.statusEl = document.getElementById('statusMessage');
        this.faceCountEl = document.getElementById('faceCount');
        this.versionStatusEl = document.getElementById('versionStatus');
        this.versionLabelEl = document.getElementById('versionLabel');
        this.captureCanvas = document.createElement('canvas');
        this.lastLogTs = 0;
        this.lastDetectTs = 0;
        this.lastSnapshotTs = 0;
        this.snapshotIntervalMs = 15000;
        this.detectionIntervalMs = 300; // throttle detection loop

        // Motion detection state
        this.motionCanvas = document.createElement('canvas');
        this.motionWidth = 160;
        this.motionHeight = 120;
        this.motionCanvas.width = this.motionWidth;
        this.motionCanvas.height = this.motionHeight;
        this.prevGray = null;
        this.motionThreshold = 45;    // per-pixel diff threshold
        this.motionMinPixels = 0.06;  // fraction of pixels that must change
        this.motionCheckMs = 500;     // check motion every 500ms
        this.lastMotionCheckTs = 0;

        // Burst mode state — activated on motion
        this.burstMode = false;
        this.burstStartTs = 0;
        this.burstDurationMs = 30000;   // 30 seconds of burst
        this.burstIntervalMs = 3000;    // snapshot every 3s during burst
        this.lastBurstSnapshotTs = 0;
        
        this.isRunning = false;
        this.stream = null;
        this.facingMode = 'environment'; // prefer back camera on mobile

        // Camera selector in settings
        this.cameraSelect = document.getElementById('cameraSelect');
        if (this.cameraSelect) {
            this.cameraSelect.value = this.facingMode;
            this.cameraSelect.addEventListener('change', () => {
                this.facingMode = this.cameraSelect.value;
                this.restartCamera();
            });
        }
        
        this.init();
    }

    /**
     * Initialize dependencies, models, and version in UI.
     */
    async init() {
        console.log('🚀 Inicializando...');
        
        // Wait for translations to be loaded
        if (window.i18n && window.i18n.ready) {
            await window.i18n.ready;
        }
        
        // Show welcome message as soon as possible
        if (window.presenceHistory && window.i18n) {
            const urlParams = new URLSearchParams(window.location.search);
            const place = urlParams.get('place');
            if (place) console.log(`[presence] place: /${place}`);
            const message = window.i18n.t('init.welcome.message');
            window.presenceHistory.addWelcomeMessage(
                window.i18n.t('init.welcome.title'),
                message,
                '<img src="https://eadn-wc05-13372774.nxedge.io/wp-content/uploads/elementor/thumbs/cropped-favicon-qqqiifr4pj19hw4w6aohtppa90f2avsb3lijncelcg.png" alt="LINUXtips" style="width:1.4em;height:1.4em;vertical-align:middle">'
            );
        }
        
        try {
            if (typeof faceapi === 'undefined') {
                throw new Error('face-api.js não carregado');
            }

            if (typeof window.eventManager === 'undefined') {
                throw new Error('EventManager não carregado');
            }

            const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1/model';
            console.log('📦 Carregando modelos...');
            
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
            ]);
            console.log('✅ Modelos carregados (detector + landmarks + recognition)');
            console.log(`   face-api params: inputSize=224, scoreThreshold=0.5, detectionInterval=${this.detectionIntervalMs}ms, snapshotInterval=${this.snapshotIntervalMs}ms`);
            console.log(`   motion params: threshold=${this.motionThreshold}, minPixels=${this.motionMinPixels}, checkInterval=${this.motionCheckMs}ms, burstInterval=${this.burstIntervalMs}ms, burstDuration=${this.burstDurationMs / 1000}s`);
            
            // Load COCO-SSD for animal detection
            if (window.animalDetector) {
                window.animalDetector.getSnapshot = () => this.getSnapshot();
                await window.animalDetector.load();
            }

            // Show welcome message when face-api is loaded
            if (window.presenceHistory && window.i18n) {
                window.presenceHistory.addWelcomeMessage(
                    window.i18n.t('init.faceapi.title'),
                    window.i18n.t('init.faceapi.message'),
                    '🧑'
                );
            }
            
            await this.startCamera();
            console.log('✅ Câmera iniciada');

            // Atualiza versões na UI
            if (typeof VERSION !== 'undefined') {
                if (this.versionStatusEl) this.versionStatusEl.textContent = VERSION;
                if (this.versionLabelEl) this.versionLabelEl.textContent = VERSION;
            }
            
        } catch (error) {
            console.error('❌ Erro:', error);
            this.updateStatus('Erro: ' + error.message, 'danger');
        }
    }

    /**
     * Request camera, size canvases, and start detection loop.
     */
    async startCamera() {
        // Try preferred facing mode, fall back to any camera
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: this.facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
            });
        } catch (e) {
            console.warn(`⚠️ Could not open ${this.facingMode} camera, falling back`, e.message);
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
            });
        }

        this.videoEl.srcObject = this.stream;
        
        await new Promise((resolve) => {
            this.videoEl.onloadedmetadata = () => resolve();
        });

        await this.videoEl.play();

        // Ajusta canvas de captura para snapshots
        this.updateCaptureSize();
        
        this.canvasEl.width = this.videoEl.videoWidth;
        this.canvasEl.height = this.videoEl.videoHeight;
        
        this.isRunning = true;
        this.updateStatus('Câmera ativa', 'success');
        console.log(`📷 Camera started: facingMode=${this.facingMode}`);
        
        this.detectLoop();
    }

    /**
     * Stop current camera and restart with new settings.
     */
    async restartCamera() {
        this.isRunning = false;
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }
        this.prevGray = null; // reset motion detection baseline
        await this.startCamera();
    }

    /**
     * Main detection loop with throttling and event cooldown.
     */
    async detectLoop() {
        if (!this.isRunning) return;

        try {
            const perfNow = performance.now();
            if (perfNow - this.lastDetectTs < this.detectionIntervalMs) {
                requestAnimationFrame(() => this.detectLoop());
                return;
            }
            this.lastDetectTs = perfNow;

            const detections = await faceapi.detectAllFaces(
                this.videoEl,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
            ).withFaceLandmarks().withFaceDescriptors();
            
            if (perfNow - this.lastLogTs > 1000) {
                if (detections.length > 0) {
                    console.log(`👤 People detected: ${detections.length}`);
                }
                // Animal detection log
                if (window.animalDetector && window.animalDetector.isReady && window.animalDetector.lastAnimals.length > 0) {
                    const names = window.animalDetector.lastAnimals.map(a => a.class).join(', ');
                    console.log(`🐾 Pets detected: ${window.animalDetector.lastAnimals.length} (${names})`);
                }
                this.lastLogTs = perfNow;
            }
            this.faceCountEl.textContent = detections.length;
            
            this.draw(detections);

            // Animal detection (COCO-SSD)
            if (window.animalDetector && window.animalDetector.isReady) {
                try {
                    const animals = await window.animalDetector.detect();
                    window.animalDetector.draw(animals);
                } catch (animalErr) {
                    console.warn('🐾 Animal detection error:', animalErr.message);
                }
            }

            // --- Motion detection ---
            const motionNow = Date.now();
            if (motionNow - this.lastMotionCheckTs >= this.motionCheckMs) {
                this.lastMotionCheckTs = motionNow;
                const motionDetected = this.detectMotion();
                if (motionDetected && !this.burstMode) {
                    this.burstMode = true;
                    this.burstStartTs = motionNow;
                    this.lastBurstSnapshotTs = 0;
                    console.log('🔴 Motion detected — burst mode ON');
                }
            }

            // --- Snapshot emission ---
            const snapNow = Date.now();
            let shouldSnap = false;

            if (this.burstMode) {
                // During burst: snapshot every burstIntervalMs
                if (snapNow - this.lastBurstSnapshotTs >= this.burstIntervalMs) {
                    shouldSnap = true;
                    this.lastBurstSnapshotTs = snapNow;
                }
                // End burst after burstDurationMs
                if (snapNow - this.burstStartTs >= this.burstDurationMs) {
                    this.burstMode = false;
                    console.log('⚪ Burst mode OFF — back to normal');
                }
            } else {
                // Normal mode: periodic snapshot every snapshotIntervalMs
                if (snapNow - this.lastSnapshotTs >= this.snapshotIntervalMs) {
                    shouldSnap = true;
                }
            }

            if (window.eventManager && shouldSnap) {
                this.lastSnapshotTs = snapNow;
                this.emitSnapshot(detections);
            }
            
        } catch (error) {
            console.error('❌ Erro detectLoop:', error);
        }

        requestAnimationFrame(() => this.detectLoop());
    }

    /**
     * Build people/pets arrays from current detections and emit snapshotTaken.
     */
    emitSnapshot(detections) {
        const snapshot = this.getSnapshot();
        const timestamp = new Date().toISOString();
        const faceCount = detections.length;
        const animalCount = window.animalDetector ? window.animalDetector.lastAnimals.length : 0;

        const people = faceCount > 0 ? detections.map(det => {
            const descriptor = det.descriptor ? Array.from(det.descriptor) : null;
            let name = 'unknown';
            let subjectId = null;
            if (descriptor && window.presenceHistory) {
                const key = window.presenceHistory.findMatchByDescriptor({ descriptor });
                if (key !== null) {
                    const person = window.presenceHistory.people.get(key);
                    if (person) {
                        subjectId = person.subjectId;
                        if (person.personName) name = person.personName;
                    }
                }
            }
            return {
                subject_id: subjectId,
                name,
                score: det.detection.score || null,
                box: det.detection.box ? {
                    x: det.detection.box.x,
                    y: det.detection.box.y,
                    width: det.detection.box.width,
                    height: det.detection.box.height
                } : null,
                descriptor
            };
        }) : [];

        const pets = (animalCount > 0 && window.animalDetector)
            ? window.animalDetector.lastAnimals.map(a => {
                const [x, y, w, h] = a.bbox;
                const color = window.animalDetector.extractAvgColor(x, y, w, h);
                return {
                    subject_id: crypto.randomUUID(),
                    name: a.class,
                    species: a.class,
                    score: a.score,
                    bbox: a.bbox,
                    aspectRatio: h > 0 ? w / h : 1,
                    color
                };
            }) : [];

        window.eventManager.emit('snapshotTaken', {
            faceCount,
            animalCount,
            people,
            pets,
            timestamp,
            snapshot,
            motion: this.burstMode
        });
    }

    /**
     * Compare current frame with previous to detect motion.
     * Returns true if significant pixel change is found.
     */
    detectMotion() {
        if (!this.videoEl.videoWidth) return false;
        const ctx = this.motionCanvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(this.videoEl, 0, 0, this.motionWidth, this.motionHeight);
        const frame = ctx.getImageData(0, 0, this.motionWidth, this.motionHeight);
        const data = frame.data;
        const len = this.motionWidth * this.motionHeight;

        // Convert to grayscale
        const gray = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            const off = i * 4;
            gray[i] = (data[off] * 77 + data[off + 1] * 150 + data[off + 2] * 29) >> 8;
        }

        if (!this.prevGray) {
            this.prevGray = gray;
            return false;
        }

        // Count pixels with significant change
        let changed = 0;
        for (let i = 0; i < len; i++) {
            if (Math.abs(gray[i] - this.prevGray[i]) > this.motionThreshold) {
                changed++;
            }
        }
        this.prevGray = gray;

        return (changed / len) >= this.motionMinPixels;
    }

    /**
     * Draw wireframes on overlay canvas.
     */
    draw(detections) {
        const canvas = this.canvasEl;
        const displaySize = { width: this.videoEl.videoWidth, height: this.videoEl.videoHeight };
        
        faceapi.matchDimensions(canvas, displaySize);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (detections.length === 0) return;
        
        const resized = faceapi.resizeResults(detections, displaySize);
        faceapi.draw.drawDetections(canvas, resized, { withScore: false });
    }

    /**
     * Resize helper canvas for proportional snapshots.
     */
    updateCaptureSize() {
        const targetWidth = 320;
        const ratio = this.videoEl.videoHeight / this.videoEl.videoWidth || 1;
        this.captureCanvas.width = targetWidth;
        this.captureCanvas.height = Math.round(targetWidth * ratio);
    }

    /**
     * Capture a reduced video frame for history display.
     */
    getSnapshot() {
        try {
            if (!this.videoEl.videoWidth || !this.videoEl.videoHeight) return null;
            this.updateCaptureSize();
            const ctx = this.captureCanvas.getContext('2d');
            ctx.drawImage(this.videoEl, 0, 0, this.captureCanvas.width, this.captureCanvas.height);
            return this.captureCanvas.toDataURL('image/jpeg', 0.7);
        } catch (error) {
            console.warn('Não foi possível capturar snapshot:', error);
            return null;
        }
    }

    /**
     * Update status text and color in the bar.
     */
    updateStatus(text, type = 'info') {
        this.statusEl.textContent = text;
        this.statusEl.className = `status-value text-${type}`;
    }
}