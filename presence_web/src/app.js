/* ========================================
   PRESENCE DETECTION APP
   Detecção de Presença usando face-api.js
   ======================================== */

class PresenceApp {
    constructor() {
        // DOM Elements
        this.videoEl = document.getElementById('video');
        this.canvasEl = document.getElementById('canvas');
        this.faceCountEl = document.getElementById('faceCount');
        this.fpsEl = document.getElementById('fps');
        this.statusEl = document.getElementById('status');
        this.presenceBodyEl = document.getElementById('presenceBody');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
        
        // Settings
        this.minConfidenceEl = document.getElementById('minConfidence');
        this.confidenceValueEl = document.getElementById('confidenceValue');
        this.detectionIntervalEl = document.getElementById('detectionInterval');
        this.enableLoggingEl = document.getElementById('enableLogging');

        // State
        this.isRunning = false;
        this.stream = null;
        this.detectionInterval = 500;
        this.minConfidence = 0.8;
        this.lastDetectionTime = 0;
        this.frameCount = 0;
        this.lastFpsTime = 0;
        this.detectionHistory = [];
        this.currentFaceCount = 0;

        // Canvas context
        this.ctx = this.canvasEl.getContext('2d');

        // Initialize
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        console.log('🚀 Inicializando Presence App...');
        
        try {
            // Load face-api models
            await this.loadModels();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load history from localStorage
            this.loadHistory();
            
            // Auto-start camera
            await this.startCamera();
            
            console.log('✅ Presence App inicializado com sucesso');
        } catch (error) {
            console.error('❌ Erro ao inicializar:', error);
            this.updateStatus('Erro ao carregar modelos', 'danger');
        }
    }

    /**
     * Load face-api models
     */
    async loadModels() {
        try {
            // Verificar se faceapi está disponível
            if (typeof faceapi === 'undefined') {
                throw new Error('face-api.js não foi carregado. Verifique a conexão com CDN.');
            }

            // URL dos modelos - usando repositório oficial do face-api.js no GitHub
            const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
            
            console.log('📦 Carregando modelos face-api...');
            this.updateStatus('Carregando modelos...', 'warning');
            
            // Load models usando os nomes corretos
            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
            console.log('✅ TinyFaceDetector carregado');
            
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
            console.log('✅ FaceLandmark68Net carregado');
            
            await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
            console.log('✅ FaceRecognitionNet carregado');
            
            await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
            console.log('✅ FaceExpressionNet carregado');
            
            await faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL);
            console.log('✅ AgeGenderNet carregado');
            
            console.log('✅ Todos os modelos carregados com sucesso');
        } catch (error) {
            console.error('❌ Erro ao carregar modelos:', error);
            this.updateStatus('Erro ao carregar modelos', 'danger');
            throw error;
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Settings
        this.minConfidenceEl.addEventListener('input', (e) => {
            this.minConfidence = e.target.value / 100;
            this.confidenceValueEl.textContent = `${e.target.value}%`;
            this.logInfo(`Confiança mínima alterada para: ${e.target.value}%`);
        });

        this.detectionIntervalEl.addEventListener('input', (e) => {
            this.detectionInterval = parseInt(e.target.value);
            this.logInfo(`Intervalo de detecção alterado para: ${e.target.value}ms`);
        });

        // History
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
    }

    /**
     * Start camera and detection
     */
    async startCamera() {
        try {
            console.log('📷 Iniciando câmera...');
            this.updateStatus('Acessando câmera...', 'warning');

            // Request camera access
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            });

            // Set video source
            this.videoEl.srcObject = this.stream;

            // Wait for video to be ready
            await new Promise((resolve) => {
                this.videoEl.onloadedmetadata = () => resolve();
            });

            // Setup canvas
            this.canvasEl.width = this.videoEl.videoWidth;
            this.canvasEl.height = this.videoEl.videoHeight;

            // Update UI
            this.isRunning = true;
            this.updateStatus('Câmera ativa', 'success');
            this.logInfo('✅ Câmera iniciada com sucesso');

            // Start detection loop
            this.detectFaces();
        } catch (error) {
            console.error('❌ Erro ao acessar câmera:', error);
            this.updateStatus('Erro ao acessar câmera', 'danger');
            this.logInfo(`❌ Erro: ${error.message}`);
        }
    }

    /**
     * Stop camera
     */
    stopCamera() {
        console.log('🛑 Parando câmera...');

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        this.isRunning = false;
        this.videoEl.srcObject = null;

        // Update UI
        this.updateStatus('Câmera inativa', 'warning');
        this.faceCountEl.textContent = '0';
        this.logInfo('🛑 Câmera parada');

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
    }

    /**
     * Detect faces in video
     */
    async detectFaces() {
        if (!this.isRunning) return;

        try {
            const now = Date.now();

            // Perform detection at specified interval
            if (now - this.lastDetectionTime >= this.detectionInterval) {
                const detections = await faceapi
                    .detectAllFaces(this.videoEl, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks()
                    .withFaceExpressions()
                    .withAgeAndGender();

                // Filter by confidence
                const filteredDetections = detections.filter(
                    d => d.detection.score >= this.minConfidence
                );

                // Update face count
                this.currentFaceCount = filteredDetections.length;
                this.faceCountEl.textContent = filteredDetections.length;

                // Update UI
                this.updateFaceInfo(filteredDetections);
                this.drawDetections(filteredDetections);

                // Record detection
                if (filteredDetections.length > 0) {
                    this.recordPresence(filteredDetections.length);
                }

                this.lastDetectionTime = now;
            }

            // Calculate FPS
            this.frameCount++;
            if (now - this.lastFpsTime >= 1000) {
                this.fpsEl.textContent = this.frameCount;
                this.frameCount = 0;
                this.lastFpsTime = now;
            }
        } catch (error) {
            console.error('Erro na detecção:', error);
        }

        // Continue detection loop
        requestAnimationFrame(() => this.detectFaces());
    }

    /**
     * Update face information display
     */
    updateFaceInfo(detections) {
        // Removed - not needed in minimalist design
    }

    /**
     * Get top expression from detections
     */
    getTopExpression(expressions) {
        const entries = Object.entries(expressions);
        const topEntry = entries.reduce((prev, current) =>
            prev[1] > current[1] ? prev : current
        );

        const emotionMap = {
            'neutral': 'Neutro',
            'happy': 'Feliz',
            'sad': 'Triste',
            'angry': 'Raiva',
            'fearful': 'Assustado',
            'disgusted': 'Desgostado',
            'surprised': 'Surpreso'
        };

        return {
            emotion: emotionMap[topEntry[0]] || topEntry[0],
            confidence: (topEntry[1] * 100).toFixed(0)
        };
    }

    /**
     * Draw face detections on canvas
     */
    drawDetections(detections) {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);

        // Draw detections
        detections.forEach((detection) => {
            const box = detection.detection.box;

            // Draw bounding box
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(box.x, box.y, box.width, box.height);

            // Draw confidence
            const confidence = (detection.detection.score * 100).toFixed(1);
            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.fillText(`${confidence}%`, box.x, box.y - 10);

            // Draw landmarks
            if (detection.landmarks) {
                this.ctx.fillStyle = '#ff0000';
                detection.landmarks._positions.forEach((point) => {
                    this.ctx.fillRect(point.x - 2, point.y - 2, 4, 4);
                });
            }
        });
    }

    /**
     * Record presence event
     */
    recordPresence(faceCount) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('pt-BR');
        const dateStr = now.toLocaleDateString('pt-BR');

        // Avoid duplicate entries (same second)
        const lastEntry = this.detectionHistory[0];
        if (lastEntry && lastEntry.time === timeStr && lastEntry.faceCount === faceCount) {
            return;
        }

        const event = {
            id: Date.now(),
            datetime: `${dateStr} ${timeStr}`,
            time: timeStr,
            date: dateStr,
            event: faceCount > 0 ? 'Presença Detectada' : 'Nenhuma Presença',
            faceCount: faceCount
        };

        this.detectionHistory.unshift(event);

        // Keep only last 100 entries
        if (this.detectionHistory.length > 100) {
            this.detectionHistory.pop();
        }

        // Update table
        this.updatePresenceTable();

        // Save to localStorage
        this.saveHistory();
    }

    /**
     * Update presence table
     */
    updatePresenceTable() {
        if (this.detectionHistory.length === 0) {
            this.presenceBodyEl.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Nenhum evento registrado</td></tr>';
            return;
        }

        let html = '';
        this.detectionHistory.forEach((event) => {
            const eventClass = event.faceCount > 0 ? 'text-success' : 'text-warning';
            html += `
                <tr>
                    <td>${event.datetime}</td>
                    <td><span class="${eventClass}">● ${event.event}</span></td>
                    <td>${event.faceCount}</td>
                </tr>
            `;
        });

        this.presenceBodyEl.innerHTML = html;
    }

    /**
     * Clear detection history
     */
    clearHistory() {
        if (confirm('Tem certeza que deseja limpar o histórico?')) {
            this.detectionHistory = [];
            this.updatePresenceTable();
            this.saveHistory();
            this.logInfo('🗑️ Histórico limpo');
        }
    }

    /**
     * Save history to localStorage
     */
    saveHistory() {
        try {
            localStorage.setItem('presenceHistory', JSON.stringify(this.detectionHistory));
        } catch (error) {
            console.error('Erro ao salvar histórico:', error);
        }
    }

    /**
     * Load history from localStorage
     */
    loadHistory() {
        try {
            const stored = localStorage.getItem('presenceHistory');
            if (stored) {
                this.detectionHistory = JSON.parse(stored);
                this.updatePresenceTable();
                console.log(`📚 ${this.detectionHistory.length} eventos carregados do histórico`);
            }
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
        }
    }

    /**
     * Update status display
     */
    updateStatus(text, type = 'info') {
        this.statusEl.textContent = text;
        this.statusEl.className = `stat-value text-${type}`;
    }

    /**
     * Log information
     */
    logInfo(message) {
        if (this.enableLoggingEl.checked) {
            console.log(message);
        }
    }
}

// ========================================
// Initialize app when DOM is ready
// ========================================

// Não inicializar aqui - deixar para o HTML fazer isso
// O HTML vai aguardar faceapi estar disponível primeiro
