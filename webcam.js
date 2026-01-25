/**
 * Webcam Face Detection Module
 * Uses MediaPipe Face Detection to track user presence
 */

class PresenceDetector {
    constructor(options = {}) {
        // Configuration
        this.config = {
            detectionInterval: 500,        // Check presence every 500ms
            awayThreshold: 5000,           // Consider away after 5 seconds without face
            returnThreshold: 1000,         // Consider returned after 1 second with face
            autoPauseEnabled: true,        // Auto-pause focus timer when away
            showPreview: true,             // Show webcam preview
            minDetectionConfidence: 0.5,   // Minimum confidence for face detection
            ...options
        };

        // State
        this.state = {
            isPresent: false,
            lastSeenTime: null,
            awayStartTime: null,
            totalAwayTime: 0,
            cameraActive: false,
            initialized: false,
            faceDetector: null,
            camera: null
        };

        // DOM Elements
        this.elements = {
            video: null,
            canvas: null,
            presenceIndicator: document.getElementById('presenceIndicator'),
            presenceIcon: document.getElementById('presenceIcon'),
            presenceStatus: document.getElementById('presenceStatus'),
            presenceDetail: document.getElementById('presenceDetail')
        };

        // Callbacks
        this.onPresenceChange = options.onPresenceChange || (() => { });
        this.onAway = options.onAway || (() => { });
        this.onReturn = options.onReturn || (() => { });

        // Bind methods
        this.onResults = this.onResults.bind(this);
    }

    async init() {
        try {
            this.createVideoElements();
            await this.initFaceDetection();
            await this.startCamera();
            this.state.initialized = true;
            this.updateUI('initializing');
            console.log('✅ Presence detector initialized');
        } catch (error) {
            console.error('❌ Failed to initialize presence detector:', error);
            this.updateUI('error', error.message);
            throw error;
        }
    }

    createVideoElements() {
        // Create hidden video element for camera feed
        this.elements.video = document.createElement('video');
        this.elements.video.id = 'webcamVideo';
        this.elements.video.autoplay = true;
        this.elements.video.playsInline = true;
        this.elements.video.muted = true;

        // Create canvas for processing
        this.elements.canvas = document.createElement('canvas');
        this.elements.canvas.id = 'webcamCanvas';

        // Create webcam container
        const container = document.createElement('div');
        container.className = 'webcam-container';
        container.id = 'webcamContainer';

        // Create preview wrapper
        const previewWrapper = document.createElement('div');
        previewWrapper.className = 'webcam-preview';
        previewWrapper.appendChild(this.elements.video);

        // Create face overlay
        const faceOverlay = document.createElement('div');
        faceOverlay.className = 'face-overlay';
        faceOverlay.id = 'faceOverlay';
        previewWrapper.appendChild(faceOverlay);

        // Create toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'webcam-toggle';
        toggleBtn.id = 'webcamToggle';
        toggleBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
            </svg>
        `;
        toggleBtn.title = 'Toggle webcam preview';
        toggleBtn.addEventListener('click', () => this.togglePreview());

        container.appendChild(previewWrapper);
        container.appendChild(toggleBtn);

        // Add to DOM after header
        const header = document.querySelector('.header');
        header.insertAdjacentElement('afterend', container);
    }

    async initFaceDetection() {
        return new Promise((resolve, reject) => {
            try {
                // Initialize MediaPipe Face Detection
                this.state.faceDetector = new FaceDetection({
                    locateFile: (file) => {
                        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
                    }
                });

                this.state.faceDetector.setOptions({
                    model: 'short',
                    minDetectionConfidence: this.config.minDetectionConfidence
                });

                this.state.faceDetector.onResults(this.onResults);

                // Wait for model to load
                this.state.faceDetector.initialize().then(() => {
                    console.log('✅ Face detection model loaded');
                    resolve();
                }).catch(reject);
            } catch (error) {
                reject(error);
            }
        });
    }

    async startCamera() {
        return new Promise((resolve, reject) => {
            try {
                this.state.camera = new Camera(this.elements.video, {
                    onFrame: async () => {
                        if (this.state.faceDetector) {
                            await this.state.faceDetector.send({ image: this.elements.video });
                        }
                    },
                    width: 320,
                    height: 240
                });

                this.state.camera.start()
                    .then(() => {
                        this.state.cameraActive = true;
                        console.log('✅ Camera started');
                        resolve();
                    })
                    .catch((error) => {
                        // Provide helpful error messages
                        let errorMessage = 'Camera access failed';

                        if (error.name === 'NotReadableError') {
                            errorMessage = 'Camera in use by another app. Close other tabs/apps using camera.';
                        } else if (error.name === 'NotAllowedError') {
                            errorMessage = 'Camera permission denied. Click the camera icon in address bar to allow.';
                        } else if (error.name === 'NotFoundError') {
                            errorMessage = 'No camera found. Connect a webcam.';
                        } else if (error.name === 'OverconstrainedError') {
                            errorMessage = 'Camera resolution not supported.';
                        }

                        console.error('Camera error:', error.name, error.message);
                        this.updateUI('error', errorMessage);

                        // Show a toast notification
                        if (window.showToast) {
                            window.showToast('📷 ' + errorMessage, 'warning');
                        }

                        reject(new Error(errorMessage));
                    });
            } catch (error) {
                reject(error);
            }
        });
    }

    onResults(results) {
        const faceDetected = results.detections && results.detections.length > 0;
        const now = Date.now();

        // Update face overlay
        const faceOverlay = document.getElementById('faceOverlay');
        if (faceOverlay) {
            faceOverlay.classList.toggle('detected', faceDetected);
        }

        if (faceDetected) {
            this.state.lastSeenTime = now;

            // Check if returning from away
            if (!this.state.isPresent) {
                // Require consistent detection for returnThreshold
                if (!this.returnCheckStart) {
                    this.returnCheckStart = now;
                } else if (now - this.returnCheckStart >= this.config.returnThreshold) {
                    this.handleReturn();
                    this.returnCheckStart = null;
                }
            } else {
                this.updateUI('present');
            }
        } else {
            this.returnCheckStart = null;

            // Check if going away
            if (this.state.isPresent && this.state.lastSeenTime) {
                const timeSinceLastSeen = now - this.state.lastSeenTime;

                if (timeSinceLastSeen >= this.config.awayThreshold) {
                    this.handleAway();
                } else {
                    // Show countdown to away
                    const remaining = Math.ceil((this.config.awayThreshold - timeSinceLastSeen) / 1000);
                    this.updateUI('warning', `Face not detected (${remaining}s)`);
                }
            } else if (!this.state.isPresent) {
                this.updateUI('away');
            }
        }
    }

    handleAway() {
        if (this.state.isPresent) {
            this.state.isPresent = false;
            this.state.awayStartTime = Date.now();

            this.updateUI('away');
            this.onPresenceChange(false);
            this.onAway();

            console.log('👋 User went away');
        }
    }

    handleReturn() {
        if (!this.state.isPresent) {
            this.state.isPresent = true;

            // Calculate away time
            if (this.state.awayStartTime) {
                const awayDuration = Date.now() - this.state.awayStartTime;
                this.state.totalAwayTime += awayDuration;
                this.state.awayStartTime = null;
            }

            this.updateUI('present');
            this.onPresenceChange(true);
            this.onReturn();

            console.log('👋 User returned');
        }
    }

    updateUI(status, detail = null) {
        const indicator = this.elements.presenceIndicator;
        const statusEl = this.elements.presenceStatus;
        const detailEl = this.elements.presenceDetail;
        const iconEl = this.elements.presenceIcon;

        if (!indicator) return;

        // Remove all status classes
        indicator.classList.remove('present', 'away', 'warning', 'error', 'initializing');

        switch (status) {
            case 'present':
                indicator.classList.add('present');
                statusEl.textContent = 'At Desk';
                detailEl.textContent = 'Face detected';
                break;

            case 'away':
                indicator.classList.add('away');
                statusEl.textContent = 'Away';
                detailEl.textContent = detail || 'Not at desk';
                break;

            case 'warning':
                indicator.classList.add('warning');
                statusEl.textContent = 'Looking...';
                detailEl.textContent = detail || 'Detecting...';
                break;

            case 'initializing':
                indicator.classList.add('initializing');
                statusEl.textContent = 'Starting...';
                detailEl.textContent = 'Loading camera';
                break;

            case 'error':
                indicator.classList.add('error');
                statusEl.textContent = 'Camera Error';
                detailEl.textContent = detail || 'Check permissions';
                break;
        }
    }

    togglePreview() {
        const container = document.getElementById('webcamContainer');
        if (container) {
            container.classList.toggle('preview-visible');
        }
    }

    showPreview() {
        const container = document.getElementById('webcamContainer');
        if (container) {
            container.classList.add('preview-visible');
        }
    }

    hidePreview() {
        const container = document.getElementById('webcamContainer');
        if (container) {
            container.classList.remove('preview-visible');
        }
    }

    getAwayTime() {
        let total = this.state.totalAwayTime;
        if (this.state.awayStartTime) {
            total += Date.now() - this.state.awayStartTime;
        }
        return total;
    }

    isPresent() {
        return this.state.isPresent;
    }

    destroy() {
        if (this.state.camera) {
            this.state.camera.stop();
        }
        if (this.state.faceDetector) {
            this.state.faceDetector.close();
        }
        const container = document.getElementById('webcamContainer');
        if (container) {
            container.remove();
        }
    }
}

// Export for use in main app
window.PresenceDetector = PresenceDetector;
