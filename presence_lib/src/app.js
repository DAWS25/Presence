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
        this.lastEventTs = 0;
        this.lastLogTs = 0;
        this.lastDetectTs = 0;
        this.detectionIntervalMs = 300; // throttle detection loop
        
        this.isRunning = false;
        this.stream = null;
        
        this.init();
    }

    /**
     * Initialize dependencies, models, and version in UI.
     */
    async init() {
        console.log('🚀 Inicializando...');
        
        try {
            if (typeof faceapi === 'undefined') {
                throw new Error('face-api.js não carregado');
            }

            if (typeof window.eventManager === 'undefined') {
                throw new Error('EventManager não carregado');
            }

            const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
            console.log('📦 Carregando modelos...');
            
            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
            console.log('✅ TinyFaceDetector carregado');
            
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
        this.stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
        });

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
        
        this.detectLoop();
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
            );
            
            if (perfNow - this.lastLogTs > 1000) {
                console.log('✅ Detecções:', detections.length);
                this.lastLogTs = perfNow;
            }
            this.faceCountEl.textContent = detections.length;
            
            // Emit event when faces detected (13s cooldown)
            const now = Date.now();
            const cooldownMs = 13000;
            if (detections.length > 0 && window.eventManager && (now - this.lastEventTs >= cooldownMs)) {
                const snapshot = this.getSnapshot();
                const boxes = detections.map(det => {
                    const box = det.box || (det.detection && det.detection.box);
                    return {
                        x: box ? box.x : null,
                        y: box ? box.y : null,
                        width: box ? box.width : null,
                        height: box ? box.height : null,
                        score: typeof det.score === 'number' ? det.score : (det.detection && det.detection.score) || null
                    };
                });

                window.eventManager.emit('faceDetected', {
                    faceCount: detections.length,
                    timestamp: new Date().toISOString(),
                    snapshot,
                    boxes
                });

                this.lastEventTs = now;
            }
            
            this.draw(detections);
            
        } catch (error) {
            console.error('❌ Erro detectLoop:', error);
        }

        requestAnimationFrame(() => this.detectLoop());
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