/**
 * Phone Detector Module
 * Detects mobile phone usage via webcam and triggers a siren alarm
 * Uses TensorFlow.js COCO-SSD object detection
 */

class PhoneDetector {
    constructor(options = {}) {
        this.config = {
            detectionInterval: 1000,    // Check every second
            confidenceThreshold: 0.5,   // 50% confidence needed
            warningCooldown: 10000,     // 10 seconds between warnings
            enabled: true,
            ...options
        };

        this.state = {
            isInitialized: false,
            isDetecting: false,
            phoneDetected: false,
            lastWarningTime: 0,
            model: null,
            videoElement: null,
            detectionCount: 0
        };

        // Callbacks
        this.onPhoneDetected = options.onPhoneDetected || (() => { });

        // Audio context for siren
        this.audioContext = null;
        this.sirenInterval = null;
    }

    async init(videoElement) {
        this.state.videoElement = videoElement;

        try {
            // Load COCO-SSD model
            console.log('📱 Loading phone detection model...');

            // We'll load TensorFlow.js and COCO-SSD dynamically
            await this.loadScripts();

            this.state.model = await cocoSsd.load();
            console.log('✅ Phone detection model loaded');

            this.createWarningUI();
            this.startDetection();

            this.state.isInitialized = true;
            return true;
        } catch (error) {
            console.error('❌ Failed to load phone detection:', error);
            return false;
        }
    }

    async loadScripts() {
        // Check if already loaded
        if (window.cocoSsd) return;

        // Load TensorFlow.js
        if (!window.tf) {
            await this.loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.18.0/dist/tf.min.js');
        }

        // Load COCO-SSD
        await this.loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.2/dist/coco-ssd.min.js');
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    createWarningUI() {
        // Create full-screen warning overlay
        const overlay = document.createElement('div');
        overlay.className = 'phone-warning-overlay';
        overlay.id = 'phoneWarningOverlay';
        overlay.innerHTML = `
            <div class="phone-warning-content">
                <div class="warning-siren">🚨</div>
                <div class="warning-icon">📵</div>
                <div class="warning-siren">🚨</div>
            </div>
            <h1 class="warning-title">⚠️ POLICY VIOLATION ⚠️</h1>
            <p class="warning-message">MOBILE PHONE DETECTED!</p>
            <p class="warning-submessage">You are violating the working policy!</p>
            <p class="warning-instruction">PUT YOUR PHONE AWAY TO DISMISS</p>
            <div class="warning-timer" id="warningTimer">Auto-dismiss in <span id="countdownTimer">10</span>s</div>
            <button class="warning-dismiss" onclick="window.phoneDetector.dismissWarning()">I'll Put It Away</button>
        `;

        document.body.appendChild(overlay);
        this.warningOverlay = overlay;
    }

    startDetection() {
        if (this.state.isDetecting) return;

        this.state.isDetecting = true;
        this.detectionLoop();
    }

    async detectionLoop() {
        if (!this.config.enabled || !this.state.isDetecting) return;

        try {
            const video = this.state.videoElement;

            if (video && video.readyState >= 2 && this.state.model) {
                const predictions = await this.state.model.detect(video);

                // Check for phone/cell phone detection
                const phoneDetection = predictions.find(p =>
                    (p.class === 'cell phone' || p.class === 'remote') &&
                    p.score >= this.config.confidenceThreshold
                );

                if (phoneDetection) {
                    this.handlePhoneDetected(phoneDetection);
                }
            }
        } catch (error) {
            console.error('Detection error:', error);
        }

        // Schedule next detection
        setTimeout(() => this.detectionLoop(), this.config.detectionInterval);
    }

    handlePhoneDetected(detection) {
        const now = Date.now();

        // Check cooldown
        if (now - this.state.lastWarningTime < this.config.warningCooldown) {
            return;
        }

        this.state.phoneDetected = true;
        this.state.lastWarningTime = now;
        this.state.detectionCount++;

        console.log('📱🚨 PHONE DETECTED!', detection);

        // Show warning
        this.showWarning();

        // Play siren
        this.playSiren();

        // Callback
        this.onPhoneDetected(detection);

        // Capture evidence photo
        if (window.photoCapture) {
            window.photoCapture.capturePhoto('phone_violation');
        }
    }

    showWarning() {
        this.warningOverlay.classList.add('visible');

        // Start countdown
        let countdown = 10;
        const timerEl = document.getElementById('countdownTimer');

        this.countdownInterval = setInterval(() => {
            countdown--;
            timerEl.textContent = countdown;

            if (countdown <= 0) {
                this.dismissWarning();
            }
        }, 1000);
    }

    dismissWarning() {
        this.warningOverlay.classList.remove('visible');
        this.stopSiren();

        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        // Reset timer text
        setTimeout(() => {
            document.getElementById('countdownTimer').textContent = '10';
        }, 500);
    }

    playSiren() {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            // Resume if suspended
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            let high = true;

            this.sirenInterval = setInterval(() => {
                this.playTone(high ? 800 : 600, 0.3);
                high = !high;
            }, 300);

            // Stop after 5 seconds
            setTimeout(() => this.stopSiren(), 5000);

        } catch (e) {
            console.log('Audio not available');
        }
    }

    playTone(frequency, volume) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sawtooth';
        gainNode.gain.value = volume;

        oscillator.start();

        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.25);
        oscillator.stop(this.audioContext.currentTime + 0.25);
    }

    stopSiren() {
        if (this.sirenInterval) {
            clearInterval(this.sirenInterval);
            this.sirenInterval = null;
        }
    }

    toggle() {
        this.config.enabled = !this.config.enabled;
        return this.config.enabled;
    }

    getViolationCount() {
        return this.state.detectionCount;
    }
}

// Export for use
window.PhoneDetector = PhoneDetector;
