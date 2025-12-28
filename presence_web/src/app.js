/* ========================================
   PRESENCE DETECTION APP - MINIMAL
   Apenas câmera + wireframes
   ======================================== */

class PresenceApp {
    constructor() {
        this.videoEl = document.getElementById('video');
        this.canvasEl = document.getElementById('canvas');
        this.statusEl = document.getElementById('statusMessage');
        this.faceCountEl = document.getElementById('faceCount');
        this.versionStatusEl = document.getElementById('versionStatus');
        this.versionLabelEl = document.getElementById('versionLabel');
        
        this.isRunning = false;
        this.stream = null;
        
        this.init();
    }

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
        
        this.canvasEl.width = this.videoEl.videoWidth;
        this.canvasEl.height = this.videoEl.videoHeight;
        
        this.isRunning = true;
        this.updateStatus('Câmera ativa', 'success');
        
        this.detectLoop();
    }

    async detectLoop() {
        if (!this.isRunning) return;

        try {
            const detections = await faceapi.detectAllFaces(
                this.videoEl,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
            );
            
            console.log('✅ Detecções:', detections.length);
            this.faceCountEl.textContent = detections.length;
            
            // Emitir evento se faces foram detectadas
            if (detections.length > 0 && window.eventManager) {
                window.eventManager.emit('faceDetected', {
                    faceCount: detections.length,
                    timestamp: new Date().toISOString()
                });
            }
            
            this.draw(detections);
            
        } catch (error) {
            console.error('❌ Erro detectLoop:', error);
        }

        requestAnimationFrame(() => this.detectLoop());
    }

    draw(detections) {
        const canvas = this.canvasEl;
        const displaySize = { width: this.videoEl.videoWidth, height: this.videoEl.videoHeight };
        
        faceapi.matchDimensions(canvas, displaySize);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (detections.length === 0) return;
        
        const resized = faceapi.resizeResults(detections, displaySize);
        faceapi.draw.drawDetections(canvas, resized);
    }

    updateStatus(text, type = 'info') {
        this.statusEl.textContent = text;
        this.statusEl.className = `status-value text-${type}`;
    }
}

window.addEventListener('load', () => {
    setTimeout(() => {
        new PresenceApp();
    }, 500);
});
