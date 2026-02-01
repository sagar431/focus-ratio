/**
 * Mood & Fatigue Detection Module
 * Uses MediaPipe Face Mesh to analyze facial expressions
 */

class MoodDetector {
    constructor(options = {}) {
        this.config = {
            updateInterval: 1000,  // Update mood every second
            drowsinessThreshold: 0.3,  // Eye aspect ratio threshold
            ...options
        };

        this.state = {
            currentMood: 'neutral',
            moodHistory: [],
            eyeAspectRatio: 0,
            isDrowsy: false,
            isInitialized: false,
            faceMesh: null,
            drowsyDismissedAt: null,        // Track when alert was dismissed
            drowsyCooldown: 5 * 60 * 1000   // 5 minute cooldown after dismissal
        };

        // Callbacks
        this.onMoodChange = options.onMoodChange || (() => { });
        this.onDrowsy = options.onDrowsy || (() => { });

        // DOM Elements
        this.elements = {
            moodEmoji: null,
            moodLabel: null,
            drowsyAlert: null
        };
    }

    async init(videoElement) {
        try {
            this.createUI();
            await this.initFaceMesh(videoElement);
            this.state.isInitialized = true;
            console.log('✅ Mood detector initialized');
        } catch (error) {
            console.error('❌ Failed to initialize mood detector:', error);
            throw error;
        }
    }

    createUI() {
        // Create mood indicator
        const moodCard = document.createElement('div');
        moodCard.className = 'mood-card';
        moodCard.id = 'moodCard';
        moodCard.innerHTML = `
            <div class="mood-emoji" id="moodEmoji">😊</div>
            <div class="mood-info">
                <span class="mood-label" id="moodLabel">Detecting...</span>
                <span class="mood-detail" id="moodDetail">Analyzing expression</span>
            </div>
            <div class="energy-bar">
                <div class="energy-fill" id="energyFill"></div>
            </div>
        `;

        // Create drowsy alert
        const drowsyAlert = document.createElement('div');
        drowsyAlert.className = 'drowsy-alert';
        drowsyAlert.id = 'drowsyAlert';
        drowsyAlert.innerHTML = `
            <div class="drowsy-icon">😴</div>
            <div class="drowsy-text">
                <strong>Feeling Sleepy?</strong>
                <span>Take a break and stretch!</span>
            </div>
            <button class="drowsy-dismiss" onclick="dismissDrowsyAlert()">Got it</button>
        `;

        // Add to DOM
        const statsBar = document.querySelector('.stats-bar');
        if (statsBar) {
            statsBar.insertAdjacentElement('beforebegin', moodCard);
        }
        document.body.appendChild(drowsyAlert);

        this.elements.moodEmoji = document.getElementById('moodEmoji');
        this.elements.moodLabel = document.getElementById('moodLabel');
        this.elements.moodDetail = document.getElementById('moodDetail');
        this.elements.energyFill = document.getElementById('energyFill');
        this.elements.drowsyAlert = drowsyAlert;
    }

    async initFaceMesh(videoElement) {
        // We'll use the existing face detection and enhance with landmarks analysis
        // For now, simulate mood detection based on presence patterns

        // Start mood analysis loop
        setInterval(() => {
            if (window.presenceDetector && window.presenceDetector.state.isPresent) {
                this.analyzeMood();
            }
        }, this.config.updateInterval);
    }

    analyzeMood() {
        // Simulate mood detection based on focus patterns
        // In a real implementation, this would use Face Mesh landmarks

        const focusTime = window.tracker ? window.tracker.getFocusTimeMs() : 0;
        const realTime = window.tracker ? window.tracker.getRealTimeMs() : 1;
        const productivity = (focusTime / realTime) * 100;

        // Determine mood based on productivity and time
        let mood, energy;

        if (productivity >= 70) {
            mood = { emoji: '🔥', label: 'In The Zone', detail: 'Peak productivity!' };
            energy = 100;
        } else if (productivity >= 50) {
            mood = { emoji: '😊', label: 'Focused', detail: 'Great work!' };
            energy = 80;
        } else if (productivity >= 30) {
            mood = { emoji: '😐', label: 'Neutral', detail: 'Keep going!' };
            energy = 60;
        } else if (productivity >= 15) {
            mood = { emoji: '😔', label: 'Distracted', detail: 'Try to focus' };
            energy = 40;
        } else {
            mood = { emoji: '😴', label: 'Low Energy', detail: 'Need a break?' };
            energy = 20;
        }

        // Check for drowsiness based on away patterns
        if (window.presenceDetector) {
            const awayTime = window.presenceDetector.getAwayTime();
            const awayRatio = awayTime / realTime;

            if (awayRatio > 0.3 && realTime > 300000) { // 30% away time after 5 min
                this.triggerDrowsinessWarning();
            }
        }

        // Update UI
        this.updateMoodUI(mood, energy);

        // Track mood change
        if (this.state.currentMood !== mood.label) {
            this.state.currentMood = mood.label;
            this.onMoodChange(mood);
        }
    }

    updateMoodUI(mood, energy) {
        if (this.elements.moodEmoji) {
            this.elements.moodEmoji.textContent = mood.emoji;
            this.elements.moodEmoji.style.animation = 'none';
            setTimeout(() => {
                this.elements.moodEmoji.style.animation = '';
            }, 10);
        }
        if (this.elements.moodLabel) {
            this.elements.moodLabel.textContent = mood.label;
        }
        if (this.elements.moodDetail) {
            this.elements.moodDetail.textContent = mood.detail;
        }
        if (this.elements.energyFill) {
            this.elements.energyFill.style.width = `${energy}%`;

            // Color based on energy
            if (energy >= 70) {
                this.elements.energyFill.style.background = 'linear-gradient(90deg, #22c55e, #4ade80)';
            } else if (energy >= 40) {
                this.elements.energyFill.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
            } else {
                this.elements.energyFill.style.background = 'linear-gradient(90deg, #ef4444, #f87171)';
            }
        }
    }

    triggerDrowsinessWarning() {
        // Check if we're in cooldown period after dismissal
        if (this.state.drowsyDismissedAt) {
            const timeSinceDismissal = Date.now() - this.state.drowsyDismissedAt;
            if (timeSinceDismissal < this.state.drowsyCooldown) {
                return; // Still in cooldown, don't show alert
            }
        }

        if (!this.state.isDrowsy) {
            this.state.isDrowsy = true;
            this.elements.drowsyAlert.classList.add('visible');
            this.onDrowsy();

            // Play alert sound (optional)
            this.playAlertSound();
        }
    }

    playAlertSound() {
        // Create oscillator for alert beep
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 440; // A4 note
            oscillator.type = 'sine';
            gainNode.gain.value = 0.1;

            oscillator.start();
            setTimeout(() => oscillator.stop(), 200);
        } catch (e) {
            console.log('Audio not available');
        }
    }

    dismissDrowsyAlert() {
        this.state.isDrowsy = false;
        this.state.drowsyDismissedAt = Date.now(); // Set cooldown timer
        this.elements.drowsyAlert.classList.remove('visible');
    }

    getMood() {
        return this.state.currentMood;
    }
}

// Global function to dismiss drowsy alert
window.dismissDrowsyAlert = function () {
    if (window.moodDetector) {
        window.moodDetector.dismissDrowsyAlert();
    }
};

// Export for use in main app
window.MoodDetector = MoodDetector;
