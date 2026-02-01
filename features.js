/**
 * Creative Features Module
 * Daily goals, achievements, motivational quotes, ambient sounds, break reminders
 */

// ==================== DAILY GOALS ====================
class DailyGoals {
    constructor() {
        this.goals = {
            focusTime: 4 * 60 * 60 * 1000,  // 4 hours default
            pomodoros: 8,
            productivity: 60
        };
        this.progress = {
            focusTime: 0,
            pomodoros: 0,
            productivity: 0
        };
        this.init();
    }

    init() {
        this.loadGoals();
        this.createUI();
        this.startTracking();
    }

    createUI() {
        const goalsSection = document.createElement('section');
        goalsSection.className = 'goals-section';
        goalsSection.id = 'goalsSection';
        goalsSection.innerHTML = `
            <div class="goals-card">
                <div class="goals-header">
                    <h3><span class="goal-icon">🎯</span> Daily Goals</h3>
                    <button class="goals-edit-btn" id="editGoalsBtn" title="Edit Goals">⚙️</button>
                </div>
                <div class="goals-grid">
                    <div class="goal-item">
                        <div class="goal-progress-ring">
                            <svg viewBox="0 0 80 80">
                                <circle class="goal-ring-bg" cx="40" cy="40" r="35"/>
                                <circle class="goal-ring-fill focus-goal" id="focusGoalRing" cx="40" cy="40" r="35"/>
                            </svg>
                            <span class="goal-percent" id="focusGoalPercent">0%</span>
                        </div>
                        <span class="goal-label">Focus Time</span>
                        <span class="goal-value" id="focusGoalValue">0h / 4h</span>
                    </div>
                    <div class="goal-item">
                        <div class="goal-progress-ring">
                            <svg viewBox="0 0 80 80">
                                <circle class="goal-ring-bg" cx="40" cy="40" r="35"/>
                                <circle class="goal-ring-fill pomo-goal" id="pomoGoalRing" cx="40" cy="40" r="35"/>
                            </svg>
                            <span class="goal-percent" id="pomoGoalPercent">0%</span>
                        </div>
                        <span class="goal-label">Pomodoros</span>
                        <span class="goal-value" id="pomoGoalValue">0 / 8</span>
                    </div>
                    <div class="goal-item">
                        <div class="goal-progress-ring">
                            <svg viewBox="0 0 80 80">
                                <circle class="goal-ring-bg" cx="40" cy="40" r="35"/>
                                <circle class="goal-ring-fill prod-goal" id="prodGoalRing" cx="40" cy="40" r="35"/>
                            </svg>
                            <span class="goal-percent" id="prodGoalPercent">0%</span>
                        </div>
                        <span class="goal-label">Productivity</span>
                        <span class="goal-value" id="prodGoalValue">0% / 60%</span>
                    </div>
                </div>
            </div>
        `;

        // Insert after pomodoro section
        const pomodoroSection = document.getElementById('pomodoroSection');
        if (pomodoroSection) {
            pomodoroSection.insertAdjacentElement('afterend', goalsSection);
        } else {
            const statsBar = document.querySelector('.stats-bar');
            if (statsBar) {
                statsBar.insertAdjacentElement('beforebegin', goalsSection);
            }
        }

        // Calculate ring circumferences
        this.ringCircumference = 2 * Math.PI * 35;
        document.querySelectorAll('.goal-ring-fill').forEach(ring => {
            ring.style.strokeDasharray = this.ringCircumference;
            ring.style.strokeDashoffset = this.ringCircumference;
        });

        // Bind edit button
        document.getElementById('editGoalsBtn').addEventListener('click', () => this.showEditModal());
    }

    startTracking() {
        setInterval(() => this.updateProgress(), 1000);
    }

    updateProgress() {
        // Get current stats
        if (window.tracker) {
            this.progress.focusTime = window.tracker.getFocusTimeMs();
            this.progress.productivity = window.tracker.getRealTimeMs() > 0
                ? (window.tracker.getFocusTimeMs() / window.tracker.getRealTimeMs()) * 100
                : 0;
        }
        if (window.pomodoroTimer) {
            this.progress.pomodoros = window.pomodoroTimer.state.totalPomodorosToday;
        }

        this.updateUI();
    }

    updateUI() {
        // Focus time
        const focusPercent = Math.min(100, (this.progress.focusTime / this.goals.focusTime) * 100);
        this.updateRing('focusGoalRing', focusPercent);
        document.getElementById('focusGoalPercent').textContent = `${Math.round(focusPercent)}%`;
        const focusHours = (this.progress.focusTime / (60 * 60 * 1000)).toFixed(1);
        const goalHours = this.goals.focusTime / (60 * 60 * 1000);
        document.getElementById('focusGoalValue').textContent = `${focusHours}h / ${goalHours}h`;

        // Pomodoros
        const pomoPercent = Math.min(100, (this.progress.pomodoros / this.goals.pomodoros) * 100);
        this.updateRing('pomoGoalRing', pomoPercent);
        document.getElementById('pomoGoalPercent').textContent = `${Math.round(pomoPercent)}%`;
        document.getElementById('pomoGoalValue').textContent = `${this.progress.pomodoros} / ${this.goals.pomodoros}`;

        // Productivity
        const prodPercent = Math.min(100, (this.progress.productivity / this.goals.productivity) * 100);
        this.updateRing('prodGoalRing', prodPercent);
        document.getElementById('prodGoalPercent').textContent = `${Math.round(prodPercent)}%`;
        document.getElementById('prodGoalValue').textContent = `${Math.round(this.progress.productivity)}% / ${this.goals.productivity}%`;

        // Check for goal completions
        this.checkAchievements();
    }

    updateRing(ringId, percent) {
        const ring = document.getElementById(ringId);
        if (ring) {
            const offset = this.ringCircumference * (1 - percent / 100);
            ring.style.strokeDashoffset = offset;
        }
    }

    checkAchievements() {
        if (window.achievements) {
            if (this.progress.focusTime >= this.goals.focusTime) {
                window.achievements.unlock('focus_master');
            }
            if (this.progress.pomodoros >= this.goals.pomodoros) {
                window.achievements.unlock('pomodoro_champion');
            }
            if (this.progress.productivity >= this.goals.productivity) {
                window.achievements.unlock('productivity_guru');
            }
        }
    }

    showEditModal() {
        const modal = document.createElement('div');
        modal.className = 'goals-modal';
        modal.id = 'goalsModal';
        modal.innerHTML = `
            <div class="goals-modal-content">
                <h3>Edit Daily Goals</h3>
                <div class="goal-input-group">
                    <label>Focus Time (hours)</label>
                    <input type="number" id="goalFocusHours" value="${this.goals.focusTime / (60 * 60 * 1000)}" min="1" max="12">
                </div>
                <div class="goal-input-group">
                    <label>Pomodoros</label>
                    <input type="number" id="goalPomodoros" value="${this.goals.pomodoros}" min="1" max="20">
                </div>
                <div class="goal-input-group">
                    <label>Productivity Target (%)</label>
                    <input type="number" id="goalProductivity" value="${this.goals.productivity}" min="10" max="100">
                </div>
                <div class="goals-modal-actions">
                    <button class="btn-cancel" id="cancelGoals">Cancel</button>
                    <button class="btn-save" id="saveGoals">Save</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('visible'), 10);

        document.getElementById('cancelGoals').addEventListener('click', () => this.closeModal());
        document.getElementById('saveGoals').addEventListener('click', () => this.saveGoals());
    }

    closeModal() {
        const modal = document.getElementById('goalsModal');
        if (modal) {
            modal.classList.remove('visible');
            setTimeout(() => modal.remove(), 300);
        }
    }

    saveGoals() {
        this.goals.focusTime = parseFloat(document.getElementById('goalFocusHours').value) * 60 * 60 * 1000;
        this.goals.pomodoros = parseInt(document.getElementById('goalPomodoros').value);
        this.goals.productivity = parseInt(document.getElementById('goalProductivity').value);
        localStorage.setItem('dailyGoals', JSON.stringify(this.goals));
        this.closeModal();
        this.updateUI();
        showToast('Goals updated!', 'success');
    }

    loadGoals() {
        const saved = localStorage.getItem('dailyGoals');
        if (saved) {
            try {
                this.goals = { ...this.goals, ...JSON.parse(saved) };
            } catch (e) {
                console.error('Error loading goals:', e);
            }
        }
    }
}

// ==================== ACHIEVEMENTS ====================
class Achievements {
    constructor() {
        this.badges = {
            first_focus: { name: 'First Focus', icon: '🌟', desc: 'Started your first focus session', unlocked: false },
            hour_warrior: { name: 'Hour Warrior', icon: '⏰', desc: 'Focused for 1 hour straight', unlocked: false },
            focus_master: { name: 'Focus Master', icon: '🏆', desc: 'Reached daily focus goal', unlocked: false },
            pomodoro_champion: { name: 'Pomodoro Champion', icon: '🍅', desc: 'Completed daily pomodoro goal', unlocked: false },
            productivity_guru: { name: 'Productivity Guru', icon: '🧘', desc: 'Reached productivity target', unlocked: false },
            early_bird: { name: 'Early Bird', icon: '🐦', desc: 'Started before 7 AM', unlocked: false },
            night_owl: { name: 'Night Owl', icon: '🦉', desc: 'Worked past 10 PM', unlocked: false },
            streak_3: { name: '3-Day Streak', icon: '🔥', desc: 'Focused 3 days in a row', unlocked: false },
            streak_7: { name: 'Week Warrior', icon: '💪', desc: 'Focused 7 days in a row', unlocked: false },
            perfect_day: { name: 'Perfect Day', icon: '✨', desc: '100% productivity score', unlocked: false }
        };
        this.init();
    }

    init() {
        this.loadAchievements();
        this.createUI();
        this.checkTimeBasedAchievements();
    }

    createUI() {
        const achieveSection = document.createElement('section');
        achieveSection.className = 'achievements-section';
        achieveSection.id = 'achievementsSection';

        const badgesHTML = Object.entries(this.badges).map(([key, badge]) => `
            <div class="badge ${badge.unlocked ? 'unlocked' : 'locked'}" data-badge="${key}" title="${badge.desc}">
                <span class="badge-icon">${badge.unlocked ? badge.icon : '🔒'}</span>
                <span class="badge-name">${badge.name}</span>
            </div>
        `).join('');

        achieveSection.innerHTML = `
            <div class="achievements-card">
                <div class="achievements-header">
                    <h3><span class="achieve-icon">🏅</span> Achievements</h3>
                    <span class="achieve-count" id="achieveCount">0/${Object.keys(this.badges).length}</span>
                </div>
                <div class="badges-grid">${badgesHTML}</div>
            </div>
        `;

        const goalsSection = document.getElementById('goalsSection');
        if (goalsSection) {
            goalsSection.insertAdjacentElement('afterend', achieveSection);
        }

        this.updateCount();
    }

    unlock(badgeKey) {
        if (this.badges[badgeKey] && !this.badges[badgeKey].unlocked) {
            this.badges[badgeKey].unlocked = true;
            this.saveAchievements();
            this.showUnlockNotification(badgeKey);
            this.updateBadgeUI(badgeKey);
            this.updateCount();
        }
    }

    updateBadgeUI(badgeKey) {
        const badgeEl = document.querySelector(`[data-badge="${badgeKey}"]`);
        if (badgeEl) {
            badgeEl.classList.remove('locked');
            badgeEl.classList.add('unlocked', 'just-unlocked');
            badgeEl.querySelector('.badge-icon').textContent = this.badges[badgeKey].icon;
            setTimeout(() => badgeEl.classList.remove('just-unlocked'), 2000);
        }
    }

    updateCount() {
        const count = Object.values(this.badges).filter(b => b.unlocked).length;
        const total = Object.keys(this.badges).length;
        const countEl = document.getElementById('achieveCount');
        if (countEl) countEl.textContent = `${count}/${total}`;
    }

    showUnlockNotification(badgeKey) {
        const badge = this.badges[badgeKey];

        // Create notification
        const notification = document.createElement('div');
        notification.className = 'achievement-unlock';
        notification.innerHTML = `
            <div class="unlock-icon">${badge.icon}</div>
            <div class="unlock-info">
                <span class="unlock-label">Achievement Unlocked!</span>
                <span class="unlock-name">${badge.name}</span>
            </div>
        `;
        document.body.appendChild(notification);

        // Play achievement sound
        this.playUnlockSound();

        // Animate
        setTimeout(() => notification.classList.add('visible'), 10);
        setTimeout(() => {
            notification.classList.remove('visible');
            setTimeout(() => notification.remove(), 500);
        }, 4000);
    }

    playUnlockSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

            notes.forEach((freq, i) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                oscillator.frequency.value = freq;
                oscillator.type = 'triangle';
                gainNode.gain.value = 0.15;
                const startTime = audioContext.currentTime + (i * 0.1);
                oscillator.start(startTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);
                oscillator.stop(startTime + 0.3);
            });
        } catch (e) {}
    }

    checkTimeBasedAchievements() {
        const hour = new Date().getHours();
        if (hour < 7) {
            setTimeout(() => this.unlock('early_bird'), 5000);
        }
        if (hour >= 22) {
            setTimeout(() => this.unlock('night_owl'), 5000);
        }
    }

    saveAchievements() {
        const unlocked = Object.entries(this.badges)
            .filter(([, b]) => b.unlocked)
            .map(([key]) => key);
        localStorage.setItem('achievements', JSON.stringify(unlocked));
    }

    loadAchievements() {
        const saved = localStorage.getItem('achievements');
        if (saved) {
            try {
                const unlocked = JSON.parse(saved);
                unlocked.forEach(key => {
                    if (this.badges[key]) {
                        this.badges[key].unlocked = true;
                    }
                });
            } catch (e) {
                console.error('Error loading achievements:', e);
            }
        }
    }
}

// ==================== MOTIVATIONAL QUOTES ====================
class MotivationalQuotes {
    constructor() {
        this.quotes = [
            { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
            { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
            { text: "It's not always that we need to do more but rather that we need to focus on less.", author: "Nathan W. Morris" },
            { text: "The key is not to prioritize what's on your schedule, but to schedule your priorities.", author: "Stephen Covey" },
            { text: "Concentrate all your thoughts upon the work at hand. The sun's rays do not burn until brought to a focus.", author: "Alexander Graham Bell" },
            { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
            { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
            { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
            { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
            { text: "Deep work is the ability to focus without distraction on a cognitively demanding task.", author: "Cal Newport" },
            { text: "Your work is going to fill a large part of your life. Don't waste it.", author: "Steve Jobs" },
            { text: "Productivity is never an accident. It is always the result of commitment to excellence.", author: "Paul J. Meyer" }
        ];
        this.currentQuote = null;
        this.init();
    }

    init() {
        this.createUI();
        this.showRandomQuote();
        // Change quote every 10 minutes
        setInterval(() => this.showRandomQuote(), 10 * 60 * 1000);
    }

    createUI() {
        const quoteSection = document.createElement('div');
        quoteSection.className = 'quote-section';
        quoteSection.id = 'quoteSection';
        quoteSection.innerHTML = `
            <div class="quote-card">
                <div class="quote-icon">"</div>
                <p class="quote-text" id="quoteText">Loading inspiration...</p>
                <span class="quote-author" id="quoteAuthor"></span>
                <button class="quote-refresh" id="refreshQuote" title="New Quote">↻</button>
            </div>
        `;

        // Insert at the bottom before footer
        const footer = document.querySelector('.footer');
        if (footer) {
            footer.insertAdjacentElement('beforebegin', quoteSection);
        }

        document.getElementById('refreshQuote').addEventListener('click', () => this.showRandomQuote());
    }

    showRandomQuote() {
        const quote = this.quotes[Math.floor(Math.random() * this.quotes.length)];
        this.currentQuote = quote;

        const textEl = document.getElementById('quoteText');
        const authorEl = document.getElementById('quoteAuthor');

        // Fade out
        textEl.style.opacity = '0';
        authorEl.style.opacity = '0';

        setTimeout(() => {
            textEl.textContent = quote.text;
            authorEl.textContent = `- ${quote.author}`;
            textEl.style.opacity = '1';
            authorEl.style.opacity = '1';
        }, 300);
    }
}

// ==================== AMBIENT SOUNDS ====================
class AmbientSounds {
    constructor() {
        this.sounds = {
            rain: { name: 'Rain', icon: '🌧️', freq: 'pink' },
            forest: { name: 'Forest', icon: '🌲', freq: 'brown' },
            ocean: { name: 'Ocean', icon: '🌊', freq: 'white' },
            cafe: { name: 'Cafe', icon: '☕', freq: 'pink' },
            fire: { name: 'Fire', icon: '🔥', freq: 'brown' }
        };
        this.audioContext = null;
        this.currentSound = null;
        this.noiseNode = null;
        this.gainNode = null;
        this.volume = 0.3;
        this.init();
    }

    init() {
        this.createUI();
    }

    createUI() {
        const ambientSection = document.createElement('div');
        ambientSection.className = 'ambient-section';
        ambientSection.id = 'ambientSection';

        const soundBtns = Object.entries(this.sounds).map(([key, sound]) => `
            <button class="ambient-btn" data-sound="${key}" title="${sound.name}">
                <span class="ambient-icon">${sound.icon}</span>
                <span class="ambient-name">${sound.name}</span>
            </button>
        `).join('');

        ambientSection.innerHTML = `
            <div class="ambient-card">
                <div class="ambient-header">
                    <h3><span class="ambient-title-icon">🎵</span> Ambient Sounds</h3>
                    <div class="volume-control">
                        <span class="volume-icon">🔊</span>
                        <input type="range" id="ambientVolume" min="0" max="100" value="30">
                    </div>
                </div>
                <div class="ambient-grid">${soundBtns}</div>
            </div>
        `;

        const achievementsSection = document.getElementById('achievementsSection');
        if (achievementsSection) {
            achievementsSection.insertAdjacentElement('afterend', ambientSection);
        }

        // Bind events
        document.querySelectorAll('.ambient-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const soundKey = e.currentTarget.dataset.sound;
                this.toggleSound(soundKey);
            });
        });

        document.getElementById('ambientVolume').addEventListener('input', (e) => {
            this.setVolume(e.target.value / 100);
        });
    }

    toggleSound(soundKey) {
        if (this.currentSound === soundKey) {
            this.stop();
        } else {
            this.play(soundKey);
        }
    }

    play(soundKey) {
        this.stop();

        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const sound = this.sounds[soundKey];
        this.currentSound = soundKey;

        // Create noise
        this.createNoise(sound.freq);

        // Update UI
        document.querySelectorAll('.ambient-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.sound === soundKey);
        });
    }

    createNoise(type) {
        const bufferSize = 2 * this.audioContext.sampleRate;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        // Generate noise based on type
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;

            if (type === 'white') {
                output[i] = white * 0.25;
            } else if (type === 'pink') {
                // Pink noise approximation
                output[i] = (lastOut + (0.02 * white)) / 1.02;
                lastOut = output[i];
                output[i] *= 3.5;
            } else if (type === 'brown') {
                // Brown noise
                output[i] = (lastOut + (0.02 * white)) / 1.02;
                lastOut = output[i];
                output[i] *= 1.5;
            }
        }

        this.noiseNode = this.audioContext.createBufferSource();
        this.noiseNode.buffer = noiseBuffer;
        this.noiseNode.loop = true;

        // Add filter for more natural sound
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = type === 'brown' ? 200 : type === 'pink' ? 800 : 2000;

        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.value = this.volume;

        this.noiseNode.connect(filter);
        filter.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);

        this.noiseNode.start();
    }

    stop() {
        if (this.noiseNode) {
            this.noiseNode.stop();
            this.noiseNode.disconnect();
            this.noiseNode = null;
        }
        this.currentSound = null;

        document.querySelectorAll('.ambient-btn').forEach(btn => {
            btn.classList.remove('active');
        });
    }

    setVolume(value) {
        this.volume = value;
        if (this.gainNode) {
            this.gainNode.gain.value = value;
        }
    }
}

// ==================== BREAK REMINDERS ====================
class BreakReminder {
    constructor() {
        this.stretches = [
            { name: 'Neck Rolls', icon: '🙆', desc: 'Slowly roll your head in circles, 5 times each direction' },
            { name: 'Shoulder Shrugs', icon: '💪', desc: 'Raise shoulders to ears, hold 5 seconds, release' },
            { name: 'Eye Rest', icon: '👁️', desc: 'Look at something 20 feet away for 20 seconds' },
            { name: 'Wrist Circles', icon: '🤲', desc: 'Rotate your wrists 10 times in each direction' },
            { name: 'Stand & Stretch', icon: '🧍', desc: 'Stand up, reach for the sky, touch your toes' },
            { name: 'Deep Breaths', icon: '🌬️', desc: 'Take 5 deep breaths: 4 seconds in, 4 seconds out' },
            { name: 'Walk Around', icon: '🚶', desc: 'Take a short walk, get some water' },
            { name: 'Back Stretch', icon: '🔙', desc: 'Twist your torso left and right, hold each side' }
        ];
        this.lastReminder = Date.now();
        this.reminderInterval = 45 * 60 * 1000; // 45 minutes
        this.init();
    }

    init() {
        setInterval(() => this.checkReminder(), 60 * 1000);
    }

    checkReminder() {
        const now = Date.now();
        const timeSinceReminder = now - this.lastReminder;

        // Only remind if user is focusing
        if (window.tracker && window.tracker.state.isFocusing && timeSinceReminder >= this.reminderInterval) {
            this.showReminder();
            this.lastReminder = now;
        }
    }

    showReminder() {
        const stretch = this.stretches[Math.floor(Math.random() * this.stretches.length)];

        const reminder = document.createElement('div');
        reminder.className = 'break-reminder';
        reminder.innerHTML = `
            <div class="break-reminder-content">
                <div class="break-icon">${stretch.icon}</div>
                <div class="break-info">
                    <h4>Time for a Quick Break!</h4>
                    <p class="stretch-name">${stretch.name}</p>
                    <p class="stretch-desc">${stretch.desc}</p>
                </div>
                <div class="break-actions">
                    <button class="break-dismiss" id="dismissBreak">Got it!</button>
                    <button class="break-snooze" id="snoozeBreak">Remind in 10 min</button>
                </div>
            </div>
        `;

        document.body.appendChild(reminder);
        setTimeout(() => reminder.classList.add('visible'), 10);

        // Play gentle notification
        this.playReminderSound();

        document.getElementById('dismissBreak').addEventListener('click', () => {
            reminder.classList.remove('visible');
            setTimeout(() => reminder.remove(), 300);
        });

        document.getElementById('snoozeBreak').addEventListener('click', () => {
            this.lastReminder = Date.now() - (this.reminderInterval - 10 * 60 * 1000);
            reminder.classList.remove('visible');
            setTimeout(() => reminder.remove(), 300);
            showToast('Reminder snoozed for 10 minutes', 'info');
        });
    }

    playReminderSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const notes = [392, 523.25]; // G4, C5 - gentle chime

            notes.forEach((freq, i) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                oscillator.frequency.value = freq;
                oscillator.type = 'sine';
                gainNode.gain.value = 0.1;
                const startTime = audioContext.currentTime + (i * 0.3);
                oscillator.start(startTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
                oscillator.stop(startTime + 0.6);
            });
        } catch (e) {}
    }
}

// Export all features
window.DailyGoals = DailyGoals;
window.Achievements = Achievements;
window.MotivationalQuotes = MotivationalQuotes;
window.AmbientSounds = AmbientSounds;
window.BreakReminder = BreakReminder;
