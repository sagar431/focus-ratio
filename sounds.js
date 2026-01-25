/**
 * Sound Effects Module
 * Provides audio feedback for productivity events
 */

class SoundEffects {
    constructor(options = {}) {
        this.config = {
            enabled: true,
            volume: 0.3,
            ...options
        };

        this.audioContext = null;
        this.sounds = {};

        this.init();
    }

    init() {
        // Create audio context on first user interaction
        document.addEventListener('click', () => {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
        }, { once: true });
    }

    ensureContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // Play a success/start sound (ascending notes)
    playStart() {
        if (!this.config.enabled) return;
        this.ensureContext();

        const now = this.audioContext.currentTime;

        // Play ascending arpeggio
        this.playNote(523.25, now, 0.1);      // C5
        this.playNote(659.25, now + 0.1, 0.1); // E5
        this.playNote(783.99, now + 0.2, 0.15); // G5
    }

    // Play a pause/stop sound (descending notes)
    playPause() {
        if (!this.config.enabled) return;
        this.ensureContext();

        const now = this.audioContext.currentTime;

        // Play descending notes
        this.playNote(659.25, now, 0.1);      // E5
        this.playNote(523.25, now + 0.1, 0.15); // C5
    }

    // Play alert/warning sound
    playAlert() {
        if (!this.config.enabled) return;
        this.ensureContext();

        const now = this.audioContext.currentTime;

        // Play attention-grabbing pattern
        this.playNote(880, now, 0.1);         // A5
        this.playNote(880, now + 0.15, 0.1);  // A5
        this.playNote(1046.5, now + 0.3, 0.2); // C6
    }

    // Play achievement/milestone sound
    playAchievement() {
        if (!this.config.enabled) return;
        this.ensureContext();

        const now = this.audioContext.currentTime;

        // Play triumphant arpeggio
        this.playNote(523.25, now, 0.1);      // C5
        this.playNote(659.25, now + 0.1, 0.1); // E5
        this.playNote(783.99, now + 0.2, 0.1); // G5
        this.playNote(1046.5, now + 0.3, 0.3); // C6
    }

    // Play a soft tick sound
    playTick() {
        if (!this.config.enabled) return;
        this.ensureContext();

        const now = this.audioContext.currentTime;
        this.playNote(1000, now, 0.02, 0.1);
    }

    // Play welcome back sound
    playWelcome() {
        if (!this.config.enabled) return;
        this.ensureContext();

        const now = this.audioContext.currentTime;

        // Friendly ascending two-note
        this.playNote(392, now, 0.1);        // G4
        this.playNote(523.25, now + 0.12, 0.15); // C5
    }

    // Play away/leaving sound
    playAway() {
        if (!this.config.enabled) return;
        this.ensureContext();

        const now = this.audioContext.currentTime;

        // Sad descending two-note
        this.playNote(523.25, now, 0.1);      // C5
        this.playNote(392, now + 0.12, 0.15); // G4
    }

    // Core note player
    playNote(frequency, startTime, duration, volume = null) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        const vol = volume !== null ? volume : this.config.volume;
        gainNode.gain.setValueAtTime(vol, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    }

    // Toggle sounds on/off
    toggle() {
        this.config.enabled = !this.config.enabled;
        return this.config.enabled;
    }

    setVolume(volume) {
        this.config.volume = Math.max(0, Math.min(1, volume));
    }

    isEnabled() {
        return this.config.enabled;
    }
}

// Export for use in main app
window.SoundEffects = SoundEffects;
