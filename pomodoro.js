/**
 * Pomodoro Timer Module
 * 25 minute work sessions with 5 minute breaks
 */

class PomodoroTimer {
    constructor(options = {}) {
        this.config = {
            workDuration: 25 * 60 * 1000,    // 25 minutes in ms
            shortBreak: 5 * 60 * 1000,       // 5 minutes
            longBreak: 15 * 60 * 1000,       // 15 minutes
            longBreakInterval: 4,             // Long break after 4 pomodoros
            autoStartBreaks: true,
            autoStartWork: false,
            ...options
        };

        this.state = {
            isRunning: false,
            isPaused: false,
            currentPhase: 'work',  // 'work', 'shortBreak', 'longBreak'
            timeRemaining: this.config.workDuration,
            completedPomodoros: 0,
            totalPomodorosToday: 0,
            startTime: null,
            pausedTime: null
        };

        this.elements = {};
        this.timerInterval = null;

        // Callbacks
        this.onPhaseComplete = options.onPhaseComplete || (() => {});
        this.onTick = options.onTick || (() => {});
        this.onPomodoroComplete = options.onPomodoroComplete || (() => {});
    }

    init() {
        this.createUI();
        this.loadState();
        this.bindEvents();
        this.updateDisplay();
        console.log('Pomodoro timer initialized');
    }

    createUI() {
        const pomodoroSection = document.createElement('section');
        pomodoroSection.className = 'pomodoro-section';
        pomodoroSection.id = 'pomodoroSection';
        pomodoroSection.innerHTML = `
            <div class="pomodoro-card">
                <div class="pomodoro-header">
                    <div class="pomodoro-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 6v6l4 2"/>
                        </svg>
                    </div>
                    <div class="pomodoro-title">
                        <h3>Pomodoro Timer</h3>
                        <span class="pomodoro-phase" id="pomodoroPhase">Work Session</span>
                    </div>
                    <div class="pomodoro-count">
                        <span class="tomato-icon">🍅</span>
                        <span id="pomodoroCount">0</span>
                    </div>
                </div>

                <div class="pomodoro-timer">
                    <div class="pomodoro-ring">
                        <svg viewBox="0 0 120 120" class="pomodoro-progress">
                            <circle class="pomodoro-ring-bg" cx="60" cy="60" r="52"/>
                            <circle class="pomodoro-ring-fill" id="pomodoroRing" cx="60" cy="60" r="52"/>
                        </svg>
                        <div class="pomodoro-time" id="pomodoroTime">25:00</div>
                    </div>
                </div>

                <div class="pomodoro-controls">
                    <button class="pomodoro-btn primary" id="pomodoroStartBtn">
                        <span class="btn-icon" id="pomodoroIcon">▶</span>
                        <span id="pomodoroBtnText">Start</span>
                    </button>
                    <button class="pomodoro-btn secondary" id="pomodoroResetBtn">
                        <span class="btn-icon">↺</span>
                        Reset
                    </button>
                    <button class="pomodoro-btn secondary" id="pomodoroSkipBtn">
                        <span class="btn-icon">⏭</span>
                        Skip
                    </button>
                </div>

                <div class="pomodoro-phases">
                    <button class="phase-btn active" data-phase="work" id="phaseWork">
                        <span>Work</span>
                        <small>25 min</small>
                    </button>
                    <button class="phase-btn" data-phase="shortBreak" id="phaseShort">
                        <span>Short Break</span>
                        <small>5 min</small>
                    </button>
                    <button class="phase-btn" data-phase="longBreak" id="phaseLong">
                        <span>Long Break</span>
                        <small>15 min</small>
                    </button>
                </div>

                <div class="pomodoro-stats">
                    <div class="pomo-stat">
                        <span class="pomo-stat-value" id="todayPomodoros">0</span>
                        <span class="pomo-stat-label">Today</span>
                    </div>
                    <div class="pomo-stat">
                        <span class="pomo-stat-value" id="totalFocusTime">0h 0m</span>
                        <span class="pomo-stat-label">Focus Time</span>
                    </div>
                    <div class="pomo-stat">
                        <span class="pomo-stat-value" id="currentStreak">0</span>
                        <span class="pomo-stat-label">Streak</span>
                    </div>
                </div>
            </div>
        `;

        // Insert after the timers grid
        const timersGrid = document.querySelector('.timers-grid');
        if (timersGrid) {
            timersGrid.insertAdjacentElement('afterend', pomodoroSection);
        }

        // Store element references
        this.elements = {
            phase: document.getElementById('pomodoroPhase'),
            time: document.getElementById('pomodoroTime'),
            ring: document.getElementById('pomodoroRing'),
            count: document.getElementById('pomodoroCount'),
            startBtn: document.getElementById('pomodoroStartBtn'),
            resetBtn: document.getElementById('pomodoroResetBtn'),
            skipBtn: document.getElementById('pomodoroSkipBtn'),
            icon: document.getElementById('pomodoroIcon'),
            btnText: document.getElementById('pomodoroBtnText'),
            phaseWork: document.getElementById('phaseWork'),
            phaseShort: document.getElementById('phaseShort'),
            phaseLong: document.getElementById('phaseLong'),
            todayPomodoros: document.getElementById('todayPomodoros'),
            totalFocusTime: document.getElementById('totalFocusTime'),
            currentStreak: document.getElementById('currentStreak')
        };

        // Calculate ring circumference
        this.ringCircumference = 2 * Math.PI * 52;
        this.elements.ring.style.strokeDasharray = this.ringCircumference;
    }

    bindEvents() {
        this.elements.startBtn.addEventListener('click', () => this.toggleTimer());
        this.elements.resetBtn.addEventListener('click', () => this.reset());
        this.elements.skipBtn.addEventListener('click', () => this.skip());

        // Phase buttons
        document.querySelectorAll('.phase-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const phase = e.currentTarget.dataset.phase;
                this.setPhase(phase);
            });
        });
    }

    toggleTimer() {
        if (this.state.isRunning) {
            this.pause();
        } else {
            this.start();
        }
    }

    start() {
        if (this.state.isRunning) return;

        this.state.isRunning = true;
        this.state.isPaused = false;
        this.state.startTime = Date.now();

        // Start focus timer too if in work phase
        if (this.state.currentPhase === 'work' && window.tracker && !window.tracker.state.isFocusing) {
            window.tracker.startFocus();
        }

        this.timerInterval = setInterval(() => this.tick(), 100);
        this.updateButtonState();

        // Play start sound
        if (window.sounds) {
            window.sounds.playStart();
        }
    }

    pause() {
        if (!this.state.isRunning) return;

        this.state.isRunning = false;
        this.state.isPaused = true;
        this.state.pausedTime = this.state.timeRemaining;

        clearInterval(this.timerInterval);
        this.timerInterval = null;

        this.updateButtonState();

        // Play pause sound
        if (window.sounds) {
            window.sounds.playPause();
        }
    }

    reset() {
        this.pause();
        const duration = this.getDurationForPhase(this.state.currentPhase);
        this.state.timeRemaining = duration;
        this.state.startTime = null;
        this.state.pausedTime = null;
        this.updateDisplay();
    }

    skip() {
        this.completePhase();
    }

    tick() {
        if (!this.state.isRunning) return;

        const elapsed = Date.now() - this.state.startTime;
        const startDuration = this.state.pausedTime || this.getDurationForPhase(this.state.currentPhase);
        this.state.timeRemaining = Math.max(0, startDuration - elapsed);

        this.updateDisplay();
        this.onTick(this.state);

        if (this.state.timeRemaining <= 0) {
            this.completePhase();
        }
    }

    completePhase() {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.state.isRunning = false;

        const completedPhase = this.state.currentPhase;

        // Play completion sound
        this.playCompletionSound();

        if (completedPhase === 'work') {
            this.state.completedPomodoros++;
            this.state.totalPomodorosToday++;
            this.saveState();

            this.onPomodoroComplete(this.state.completedPomodoros);

            // Show achievement toast
            showToast(`🍅 Pomodoro #${this.state.completedPomodoros} complete! Time for a break.`, 'success');

            // Determine next break type
            if (this.state.completedPomodoros % this.config.longBreakInterval === 0) {
                this.setPhase('longBreak');
            } else {
                this.setPhase('shortBreak');
            }

            if (this.config.autoStartBreaks) {
                setTimeout(() => this.start(), 1000);
            }
        } else {
            // Break completed
            showToast('Break time over! Ready to focus? 🎯', 'info');
            this.setPhase('work');

            if (this.config.autoStartWork) {
                setTimeout(() => this.start(), 1000);
            }
        }

        this.updateStats();
        this.onPhaseComplete(completedPhase);
    }

    setPhase(phase) {
        this.pause();
        this.state.currentPhase = phase;
        this.state.timeRemaining = this.getDurationForPhase(phase);
        this.state.startTime = null;
        this.state.pausedTime = null;

        // Update phase buttons
        document.querySelectorAll('.phase-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.phase === phase);
        });

        // Update phase label
        const phaseLabels = {
            work: 'Work Session',
            shortBreak: 'Short Break',
            longBreak: 'Long Break'
        };
        this.elements.phase.textContent = phaseLabels[phase];

        // Update card styling
        const card = document.querySelector('.pomodoro-card');
        card.classList.remove('work', 'break');
        card.classList.add(phase === 'work' ? 'work' : 'break');

        this.updateDisplay();
    }

    getDurationForPhase(phase) {
        switch (phase) {
            case 'work': return this.config.workDuration;
            case 'shortBreak': return this.config.shortBreak;
            case 'longBreak': return this.config.longBreak;
            default: return this.config.workDuration;
        }
    }

    updateDisplay() {
        // Update time display
        const minutes = Math.floor(this.state.timeRemaining / 60000);
        const seconds = Math.floor((this.state.timeRemaining % 60000) / 1000);
        this.elements.time.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        // Update progress ring
        const duration = this.getDurationForPhase(this.state.currentPhase);
        const progress = this.state.timeRemaining / duration;
        const offset = this.ringCircumference * (1 - progress);
        this.elements.ring.style.strokeDashoffset = offset;

        // Update pomodoro count
        this.elements.count.textContent = this.state.completedPomodoros;
    }

    updateButtonState() {
        if (this.state.isRunning) {
            this.elements.icon.textContent = '⏸';
            this.elements.btnText.textContent = 'Pause';
            this.elements.startBtn.classList.add('running');
        } else {
            this.elements.icon.textContent = '▶';
            this.elements.btnText.textContent = 'Start';
            this.elements.startBtn.classList.remove('running');
        }
    }

    updateStats() {
        this.elements.todayPomodoros.textContent = this.state.totalPomodorosToday;

        const totalMinutes = this.state.totalPomodorosToday * 25;
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        this.elements.totalFocusTime.textContent = `${hours}h ${mins}m`;

        this.elements.currentStreak.textContent = this.state.completedPomodoros;
    }

    playCompletionSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const notes = this.state.currentPhase === 'work'
                ? [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6 - triumphant
                : [783.99, 659.25, 523.25];          // G5, E5, C5 - gentle descending

            notes.forEach((freq, i) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.value = freq;
                oscillator.type = 'sine';
                gainNode.gain.value = 0.2;

                const startTime = audioContext.currentTime + (i * 0.15);
                oscillator.start(startTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
                oscillator.stop(startTime + 0.35);
            });
        } catch (e) {
            console.log('Audio not available');
        }
    }

    saveState() {
        const stateToSave = {
            totalPomodorosToday: this.state.totalPomodorosToday,
            completedPomodoros: this.state.completedPomodoros,
            date: new Date().toDateString()
        };
        localStorage.setItem('pomodoroState', JSON.stringify(stateToSave));
    }

    loadState() {
        const saved = localStorage.getItem('pomodoroState');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const today = new Date().toDateString();

                if (parsed.date === today) {
                    this.state.totalPomodorosToday = parsed.totalPomodorosToday || 0;
                    this.state.completedPomodoros = parsed.completedPomodoros || 0;
                }
            } catch (e) {
                console.error('Error loading pomodoro state:', e);
            }
        }
        this.updateStats();
    }
}

// Export for use in main app
window.PomodoroTimer = PomodoroTimer;
