/**
 * Focus Ratio - Productivity Tracker
 * A brutally honest productivity mirror
 */

class ProductivityTracker {
    constructor() {
        // State
        this.state = {
            realTimeStart: null,
            focusTimeAccumulated: 0,
            focusTimeStart: null,
            isFocusing: false,
            focusSessions: 0,
            longestStreak: 0,
            currentStreakStart: null
        };

        // DOM Elements
        this.elements = {
            realTimeDisplay: document.getElementById('realTimeDisplay'),
            focusTimeDisplay: document.getElementById('focusTimeDisplay'),
            productivityPercent: document.getElementById('productivityPercent'),
            progressRing: document.getElementById('progressRing'),
            startPauseBtn: document.getElementById('startPauseBtn'),
            resetBtn: document.getElementById('resetBtn'),
            btnIcon: document.getElementById('btnIcon'),
            btnText: document.getElementById('btnText'),
            focusStatus: document.getElementById('focusStatus'),
            sessionStart: document.getElementById('sessionStart'),
            focusSessions: document.getElementById('focusSessions'),
            avgSession: document.getElementById('avgSession'),
            longestStreak: document.getElementById('longestStreak'),
            statusBadge: document.getElementById('statusBadge')
        };

        // Constants
        this.STORAGE_KEY = 'focusRatioState';
        this.CIRCUMFERENCE = 2 * Math.PI * 85; // Circle radius from SVG

        // Initialize
        this.init();
    }

    init() {
        this.loadState();
        this.bindEvents();
        this.startTimers();
        this.updateUI();
    }

    // ==================== State Management ====================

    loadState() {
        const saved = localStorage.getItem(this.STORAGE_KEY);

        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const savedDate = new Date(parsed.realTimeStart).toDateString();
                const today = new Date().toDateString();

                // Only restore if it's the same day
                if (savedDate === today) {
                    this.state = {
                        ...this.state,
                        realTimeStart: new Date(parsed.realTimeStart),
                        focusTimeAccumulated: parsed.focusTimeAccumulated || 0,
                        isFocusing: false, // Always start paused after refresh
                        focusSessions: parsed.focusSessions || 0,
                        longestStreak: parsed.longestStreak || 0
                    };
                } else {
                    // New day, fresh start
                    this.resetForNewDay();
                }
            } catch (e) {
                console.error('Error loading state:', e);
                this.resetForNewDay();
            }
        } else {
            this.resetForNewDay();
        }
    }

    saveState() {
        const stateToSave = {
            realTimeStart: this.state.realTimeStart.toISOString(),
            focusTimeAccumulated: this.state.focusTimeAccumulated,
            focusSessions: this.state.focusSessions,
            longestStreak: this.state.longestStreak
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stateToSave));
    }

    resetForNewDay() {
        this.state.realTimeStart = new Date();
        this.state.focusTimeAccumulated = 0;
        this.state.focusTimeStart = null;
        this.state.isFocusing = false;
        this.state.focusSessions = 0;
        this.state.longestStreak = 0;
        this.saveState();
    }

    // ==================== Timer Logic ====================

    startTimers() {
        // Update every 100ms for smooth display
        setInterval(() => this.tick(), 100);
    }

    tick() {
        this.updateTimerDisplays();
        this.updateProductivity();

        // Check for hour warrior achievement (1 hour continuous focus)
        if (this.state.isFocusing && window.achievements) {
            const currentStreak = this.getCurrentStreakMs();
            if (currentStreak >= 60 * 60 * 1000) { // 1 hour
                window.achievements.unlock('hour_warrior');
            }
        }

        // Check for perfect day achievement
        const productivity = this.getRealTimeMs() > 0
            ? (this.getFocusTimeMs() / this.getRealTimeMs()) * 100
            : 0;
        if (productivity >= 99 && this.getRealTimeMs() > 30 * 60 * 1000) { // 99%+ after 30 mins
            if (window.achievements) {
                window.achievements.unlock('perfect_day');
            }
        }
    }

    getRealTimeMs() {
        return Date.now() - this.state.realTimeStart.getTime();
    }

    getFocusTimeMs() {
        let total = this.state.focusTimeAccumulated;
        if (this.state.isFocusing && this.state.focusTimeStart) {
            total += Date.now() - this.state.focusTimeStart.getTime();
        }
        return total;
    }

    getCurrentStreakMs() {
        if (!this.state.isFocusing || !this.state.currentStreakStart) return 0;
        return Date.now() - this.state.currentStreakStart.getTime();
    }

    // ==================== UI Updates ====================

    updateTimerDisplays() {
        const realTime = this.getRealTimeMs();
        const focusTime = this.getFocusTimeMs();

        this.elements.realTimeDisplay.textContent = this.formatTime(realTime);
        this.elements.focusTimeDisplay.textContent = this.formatTime(focusTime);
        this.elements.sessionStart.textContent = this.formatStartTime(this.state.realTimeStart);
    }

    updateProductivity() {
        const realTime = this.getRealTimeMs();
        const focusTime = this.getFocusTimeMs();

        // Prevent division by zero and ensure focus never exceeds real
        const cappedFocusTime = Math.min(focusTime, realTime);
        const productivity = realTime > 0 ? (cappedFocusTime / realTime) * 100 : 0;

        // Update percentage display
        this.elements.productivityPercent.textContent = productivity.toFixed(2);

        // Update progress ring
        const offset = this.CIRCUMFERENCE - (productivity / 100) * this.CIRCUMFERENCE;
        this.elements.progressRing.style.strokeDashoffset = offset;

        // Update ring color based on productivity
        this.updateRingColor(productivity);
    }

    updateRingColor(productivity) {
        const ring = this.elements.progressRing;
        if (productivity >= 70) {
            ring.style.stroke = '#22c55e'; // Green
        } else if (productivity >= 40) {
            ring.style.stroke = '#f59e0b'; // Amber
        } else if (productivity >= 20) {
            ring.style.stroke = '#f97316'; // Orange
        } else {
            ring.style.stroke = '#ef4444'; // Red
        }
    }

    updateUI() {
        this.updateTimerDisplays();
        this.updateProductivity();
        this.updateStats();
        this.updateButtonState();
        this.updateFocusStatus();
    }

    updateButtonState() {
        if (this.state.isFocusing) {
            this.elements.btnIcon.textContent = '⏸';
            this.elements.btnText.textContent = 'Pause';
            this.elements.startPauseBtn.classList.add('active');
        } else {
            this.elements.btnIcon.textContent = '▶';
            this.elements.btnText.textContent = 'Start Focus';
            this.elements.startPauseBtn.classList.remove('active');
        }
    }

    updateFocusStatus() {
        const status = this.elements.focusStatus;
        if (this.state.isFocusing) {
            status.textContent = 'Focusing';
            status.classList.add('active');
        } else {
            status.textContent = 'Paused';
            status.classList.remove('active');
        }
    }

    updateStats() {
        // Focus sessions
        this.elements.focusSessions.textContent = this.state.focusSessions;

        // Average session
        const avgMs = this.state.focusSessions > 0
            ? this.state.focusTimeAccumulated / this.state.focusSessions
            : 0;
        this.elements.avgSession.textContent = this.formatShortTime(avgMs);

        // Longest streak
        this.elements.longestStreak.textContent = this.formatShortTime(this.state.longestStreak);
    }

    // ==================== Actions ====================

    toggleFocus() {
        if (this.state.isFocusing) {
            this.pauseFocus();
        } else {
            this.startFocus();
        }
    }

    startFocus() {
        this.state.isFocusing = true;
        this.state.focusTimeStart = new Date();
        this.state.currentStreakStart = new Date();
        this.state.focusSessions++;
        this.updateButtonState();
        this.updateFocusStatus();
        this.updateStats();
        this.saveState();

        // Play sound effect
        if (window.sounds) {
            window.sounds.playStart();
        }

        // Unlock first focus achievement
        if (window.achievements) {
            window.achievements.unlock('first_focus');
        }

        // Add visual feedback
        this.elements.focusTimeDisplay.style.animation = 'none';
        setTimeout(() => {
            this.elements.focusTimeDisplay.style.animation = '';
        }, 10);
    }

    pauseFocus() {
        if (this.state.focusTimeStart) {
            const elapsed = Date.now() - this.state.focusTimeStart.getTime();
            this.state.focusTimeAccumulated += elapsed;

            // Check for longest streak
            const currentStreak = this.getCurrentStreakMs();
            if (currentStreak > this.state.longestStreak) {
                this.state.longestStreak = currentStreak;
            }
        }

        this.state.isFocusing = false;
        this.state.focusTimeStart = null;
        this.state.currentStreakStart = null;
        this.updateButtonState();
        this.updateFocusStatus();
        this.updateStats();
        this.saveState();

        // Play sound effect
        if (window.sounds) {
            window.sounds.playPause();
        }

        // Save to database
        this.saveToDatabase();
    }

    resetFocus() {
        // Confirm reset
        if (this.state.focusTimeAccumulated > 0 || this.state.isFocusing) {
            const confirmed = confirm('Reset focus time? This cannot be undone.');
            if (!confirmed) return;
        }

        this.state.focusTimeAccumulated = 0;
        this.state.focusTimeStart = null;
        this.state.isFocusing = false;
        this.state.focusSessions = 0;
        this.state.longestStreak = 0;
        this.state.currentStreakStart = null;

        this.updateUI();
        this.saveState();
    }

    // ==================== Event Binding ====================

    bindEvents() {
        this.elements.startPauseBtn.addEventListener('click', () => this.toggleFocus());
        this.elements.resetBtn.addEventListener('click', () => this.resetFocus());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.target.matches('button')) {
                e.preventDefault();
                this.toggleFocus();
            }
            if (e.code === 'KeyR' && e.ctrlKey) {
                e.preventDefault();
                this.resetFocus();
            }
        });

        // Visibility change - pause when tab is hidden (optional behavior)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.state.isFocusing) {
                // Optionally pause when tab is hidden
                // this.pauseFocus();
            }
        });

        // Before unload - save state
        window.addEventListener('beforeunload', () => {
            if (this.state.isFocusing) {
                // Save current progress before closing
                const elapsed = Date.now() - this.state.focusTimeStart.getTime();
                this.state.focusTimeAccumulated += elapsed;
                this.saveState();
            }
            // Save to database on close
            this.saveToDatabase();
        });

        // Auto-save to database every 5 minutes
        setInterval(() => {
            this.saveToDatabase();
        }, 5 * 60 * 1000);
    }

    // ==================== Database ====================

    async saveToDatabase() {
        if (!window.productivityDB) return;

        try {
            const stats = {
                focusTime: this.getFocusTimeMs(),
                realTime: this.getRealTimeMs(),
                productivity: this.getRealTimeMs() > 0
                    ? (this.getFocusTimeMs() / this.getRealTimeMs()) * 100
                    : 0,
                sessions: this.state.focusSessions,
                longestStreak: this.state.longestStreak,
                awayTime: window.presenceDetector
                    ? window.presenceDetector.getAwayTime()
                    : 0
            };

            await window.productivityDB.saveDailyStats(stats);
            console.log('💾 Stats saved to database');
        } catch (error) {
            console.error('Failed to save stats:', error);
        }
    }

    // ==================== Formatting ====================

    formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return [hours, minutes, seconds]
            .map(v => v.toString().padStart(2, '0'))
            .join(':');
    }

    formatShortTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
    }

    formatStartTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }
}

// ==================== Toast Notification ====================

function showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.auto-pause-toast');
    if (existingToast) {
        existingToast.remove();
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'auto-pause-toast';
    toast.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('visible');
    });

    // Remove after 4 seconds
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// ==================== Initialize App with Presence Detection ====================

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize the productivity tracker
    window.tracker = new ProductivityTracker();

    // Add away time element reference
    window.tracker.elements.awayTime = document.getElementById('awayTime');

    // Initialize Sound Effects
    if (typeof SoundEffects !== 'undefined') {
        window.sounds = new SoundEffects({ volume: 0.3 });
        console.log('✅ Sound effects initialized');

        // Sound toggle button
        const soundToggle = document.getElementById('soundToggle');
        if (soundToggle) {
            soundToggle.addEventListener('click', () => {
                const enabled = window.sounds.toggle();
                soundToggle.textContent = enabled ? '🔊' : '🔇';
                soundToggle.classList.toggle('muted', !enabled);
            });
        }
    }

    // Initialize Database
    if (typeof ProductivityDatabase !== 'undefined') {
        window.productivityDB = new ProductivityDatabase();
        await window.productivityDB.init();
        console.log('✅ Database initialized');
    }

    // Initialize presence detector if available
    if (typeof PresenceDetector !== 'undefined') {
        try {
            window.presenceDetector = new PresenceDetector({
                awayThreshold: 3000,      // 3 seconds without face = away (faster detection)
                returnThreshold: 1000,    // 1 second with face = returned
                autoPauseEnabled: true,

                onPresenceChange: (isPresent) => {
                    console.log(`Presence changed: ${isPresent ? 'Present' : 'Away'}`);
                },

                onAway: () => {
                    // Auto-pause focus timer when user leaves
                    if (window.tracker.state.isFocusing) {
                        window.tracker.pauseFocus();
                        showToast('⏸️ Focus paused - You left your desk!', 'warning');
                        console.log('🚨 Auto-paused: User went away');
                    }
                },

                onReturn: () => {
                    // Auto-START focus timer when user returns/is detected!
                    if (!window.tracker.state.isFocusing) {
                        window.tracker.startFocus();
                        showToast('🎯 Face detected - Focus started automatically!', 'success');
                        console.log('✅ Auto-started: Face detected');
                    }
                }
            });

            await window.presenceDetector.init();
            console.log('✅ Presence detection initialized');

            // Initialize Photo Capture
            if (typeof PhotoCapture !== 'undefined') {
                window.photoCapture = new PhotoCapture({
                    captureOnAway: true,
                    maxPhotos: 10,
                    onPhotoCapture: (photo) => {
                        console.log('📸 Photo captured at:', photo.timestamp);
                    }
                });

                // Get video element from webcam container
                const videoElement = document.getElementById('webcamVideo');
                if (videoElement) {
                    window.photoCapture.init(videoElement);
                    console.log('✅ Photo capture initialized');

                    // Capture photo when user goes away
                    const originalOnAway = window.presenceDetector.onAway;
                    window.presenceDetector.onAway = () => {
                        // Call original handler
                        if (window.tracker.state.isFocusing) {
                            window.tracker.pauseFocus();
                            showToast('⏸️ Focus paused - You left your desk!', 'warning');
                            console.log('🚨 Auto-paused: User went away');
                        }

                        // Capture photo after a short delay
                        setTimeout(() => {
                            if (window.photoCapture && !window.presenceDetector.state.isPresent) {
                                window.photoCapture.capturePhoto('away');
                            }
                        }, 1000);
                    };
                }
            }

            // Initialize Mood Detector
            if (typeof MoodDetector !== 'undefined') {
                window.moodDetector = new MoodDetector({
                    updateInterval: 2000,
                    onMoodChange: (mood) => {
                        console.log('😊 Mood changed to:', mood.label);
                    },
                    onDrowsy: () => {
                        console.log('😴 Drowsiness detected!');
                        // Auto-pause if drowsy
                        if (window.tracker.state.isFocusing) {
                            window.tracker.pauseFocus();
                        }
                    }
                });

                window.moodDetector.init();
                console.log('✅ Mood detector initialized');
            }

            // Initialize Phone Detector - catches you using your mobile!
            if (typeof PhoneDetector !== 'undefined') {
                const videoElement = document.getElementById('webcamVideo');
                if (videoElement) {
                    window.phoneDetector = new PhoneDetector({
                        detectionInterval: 1500,     // Check every 1.5 seconds
                        confidenceThreshold: 0.4,    // 40% confidence
                        warningCooldown: 15000,      // 15 seconds between warnings
                        onPhoneDetected: (detection) => {
                            console.log('📱🚨 PHONE VIOLATION!', detection);
                            // Pause focus when caught with phone
                            if (window.tracker.state.isFocusing) {
                                window.tracker.pauseFocus();
                            }
                            showToast('📵 VIOLATION: Phone detected! Focus paused.', 'danger');
                        }
                    });

                    // Initialize after a delay to let camera stabilize
                    setTimeout(async () => {
                        await window.phoneDetector.init(videoElement);
                        console.log('✅ Phone detector initialized - No phones allowed! 📵');
                    }, 3000);
                }
            }

            // Update away time in stats
            setInterval(() => {
                if (window.presenceDetector && window.tracker.elements.awayTime) {
                    const awayMs = window.presenceDetector.getAwayTime();
                    window.tracker.elements.awayTime.textContent = window.tracker.formatShortTime(awayMs);
                }
            }, 1000);

            // Initialize Pomodoro Timer
            if (typeof PomodoroTimer !== 'undefined') {
                window.pomodoroTimer = new PomodoroTimer({
                    onPomodoroComplete: (count) => {
                        console.log(`🍅 Pomodoro #${count} completed!`);
                        // Unlock achievement on first pomodoro
                        if (window.achievements) {
                            window.achievements.unlock('first_focus');
                        }
                    }
                });
                window.pomodoroTimer.init();
                console.log('✅ Pomodoro timer initialized');
            }

            // Initialize Daily Goals
            if (typeof DailyGoals !== 'undefined') {
                window.dailyGoals = new DailyGoals();
                console.log('✅ Daily goals initialized');
            }

            // Initialize Achievements
            if (typeof Achievements !== 'undefined') {
                window.achievements = new Achievements();
                console.log('✅ Achievements initialized');
            }

            // Initialize Motivational Quotes
            if (typeof MotivationalQuotes !== 'undefined') {
                window.quotes = new MotivationalQuotes();
                console.log('✅ Motivational quotes initialized');
            }

            // Initialize Ambient Sounds
            if (typeof AmbientSounds !== 'undefined') {
                window.ambientSounds = new AmbientSounds();
                console.log('✅ Ambient sounds initialized');
            }

            // Initialize Break Reminder
            if (typeof BreakReminder !== 'undefined') {
                window.breakReminder = new BreakReminder();
                console.log('✅ Break reminders initialized');
            }

        } catch (error) {
            console.error('❌ Failed to initialize presence detection:', error);

            // Update UI to show error
            const presenceStatus = document.getElementById('presenceStatus');
            const presenceDetail = document.getElementById('presenceDetail');
            const presenceIndicator = document.getElementById('presenceIndicator');

            if (presenceIndicator) {
                presenceIndicator.classList.add('error');
                presenceStatus.textContent = 'Camera Error';
                presenceDetail.textContent = error.message.includes('Permission')
                    ? 'Please allow camera access'
                    : 'Could not start camera';
            }
        }
    } else {
        console.warn('⚠️ PresenceDetector not loaded');
    }
});

// Service Worker Registration (for offline support - optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // navigator.serviceWorker.register('/sw.js')
        //     .then(reg => console.log('SW registered'))
        //     .catch(err => console.log('SW registration failed'));
    });
}

