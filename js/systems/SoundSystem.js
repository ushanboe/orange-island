// SoundSystem.js - Web Audio API based sound system for Island Kingdom
// Supports generated placeholder sounds and user-uploaded custom audio

class SoundSystem {
    constructor(game) {
        this.game = game;
        this.audioContext = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.ambientGain = null;

        // Volume settings (0-1)
        this.volumes = {
            master: 1.0,
            music: 1.0,
            sfx: 0.9,
            ambient: 0.5
        };

        // Mute states
        this.muted = {
            master: false,
            music: false,
            sfx: false,
            ambient: false
        };

        // Sound buffers cache
        this.sounds = {};

        // Currently playing sounds
        this.activeSounds = [];
        this.currentMusic = null;
        this.ambientSources = [];

        // User custom sounds (can be loaded from files)
        this.customSounds = {};

        // Sound definitions with generated fallbacks
        this.soundDefinitions = {
            // UI Sounds
            'ui-click': { type: 'generated', frequency: 800, duration: 0.05, wave: 'sine' },
            'ui-build': { type: 'generated', frequency: 400, duration: 0.15, wave: 'square', sweep: 600 },
            'ui-error': { type: 'generated', frequency: 200, duration: 0.3, wave: 'sawtooth' },
            'ui-coin': { type: 'generated', frequency: 1200, duration: 0.1, wave: 'sine', sweep: 1600 },
            'ui-select': { type: 'generated', frequency: 600, duration: 0.08, wave: 'sine' },

            // Event Sounds
            'event-boat-arrive': { type: 'generated', frequency: 300, duration: 0.5, wave: 'sine', sweep: 200 },
            'event-boat-depart': { type: 'generated', frequency: 400, duration: 0.4, wave: 'sine', sweep: 250 },
            'event-crowd-spawn': { type: 'generated', frequency: 500, duration: 0.2, wave: 'triangle' },
            'event-crowd-cheer': { type: 'generated', frequency: 800, duration: 0.3, wave: 'sine', modulation: true },
            'event-monument-visit': { type: 'generated', frequency: 700, duration: 0.25, wave: 'sine', sweep: 900 },
            'event-police-alert': { type: 'generated', frequency: 600, duration: 0.6, wave: 'square', modulation: true },
            'event-police-catch': { type: 'generated', frequency: 300, duration: 0.3, wave: 'sawtooth' },
            'event-build-complete': { type: 'generated', frequency: 500, duration: 0.4, wave: 'sine', sweep: 800 },
            'event-income': { type: 'generated', frequency: 1000, duration: 0.15, wave: 'sine', sweep: 1400 },

            // Ambient Sounds (longer, loopable)
            'ambient-ocean': { type: 'generated', frequency: 100, duration: 2.0, wave: 'sine', noise: true },
            'ambient-wind': { type: 'generated', frequency: 150, duration: 2.0, wave: 'sine', noise: true },
            'ambient-birds': { type: 'generated', frequency: 2000, duration: 0.5, wave: 'sine', chirp: true },

            // Music (generated ambient music)
            'music-peaceful': { type: 'file', src: 'assets/sounds/music/RetroFuture_Clean.mp3' },
            'music-busy': { type: 'generated-music', tempo: 90, key: 'G', mood: 'busy' }
        };

        this.initialized = false;
    }

    // Initialize audio context (must be called after user interaction)
    async init() {
        if (this.initialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Create gain nodes for volume control
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);

            this.musicGain = this.audioContext.createGain();
            this.musicGain.connect(this.masterGain);

            this.sfxGain = this.audioContext.createGain();
            this.sfxGain.connect(this.masterGain);

            this.ambientGain = this.audioContext.createGain();
            this.ambientGain.connect(this.masterGain);

            // Apply initial volumes
            this.updateVolumes();

            // Pre-generate common sounds
            await this.preloadSounds();

            this.initialized = true;
            console.log('[SOUND] Sound system initialized');

        } catch (e) {
            console.error('[SOUND] Failed to initialize audio:', e);
        }
    }

    // Resume audio context if suspended (browser autoplay policy)
    async resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    // Preload/generate common sounds
    async preloadSounds() {
        const preloadList = [
            'ui-click', 'ui-build', 'ui-coin', 'ui-select',
            'event-boat-arrive', 'event-crowd-spawn', 'event-income'
        ];

        for (const soundId of preloadList) {
            await this.getOrCreateSound(soundId);
        }
        console.log('[SOUND] Preloaded', preloadList.length, 'sounds');
    }

    // Get or create a sound buffer
    async getOrCreateSound(soundId) {
        // Check for user custom sound first
        if (this.customSounds[soundId]) {
            return this.customSounds[soundId];
        }

        // Check cache
        if (this.sounds[soundId]) {
            return this.sounds[soundId];
        }

        // Generate the sound
        const def = this.soundDefinitions[soundId];
        if (!def) {
            console.warn('[SOUND] Unknown sound:', soundId);
            return null;
        }

        let buffer;
        if (def.type === 'file') {
            // Load audio file from URL
            try {
                console.log('[SOUND] Loading audio file:', def.src);
                const response = await fetch(def.src);
                const arrayBuffer = await response.arrayBuffer();
                buffer = await this.audioContext.decodeAudioData(arrayBuffer);
                console.log('[SOUND] Audio file loaded successfully:', soundId);
            } catch (error) {
                console.error('[SOUND] Failed to load audio file:', def.src, error);
                return null;
            }
        } else if (def.type === 'generated') {
            buffer = this.generateSound(def);
        } else if (def.type === 'generated-music') {
            buffer = this.generateMusic(def);
        }

        this.sounds[soundId] = buffer;
        return buffer;
    }

    // Generate a simple sound effect
    generateSound(def) {
        const sampleRate = this.audioContext.sampleRate;
        const duration = def.duration || 0.2;
        const length = sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        const frequency = def.frequency || 440;
        const wave = def.wave || 'sine';
        const sweep = def.sweep || frequency;

        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            const progress = i / length;

            // Frequency sweep
            const currentFreq = frequency + (sweep - frequency) * progress;

            // Generate waveform
            let sample = 0;
            const phase = 2 * Math.PI * currentFreq * t;

            switch (wave) {
                case 'sine':
                    sample = Math.sin(phase);
                    break;
                case 'square':
                    sample = Math.sin(phase) > 0 ? 1 : -1;
                    break;
                case 'sawtooth':
                    sample = 2 * ((currentFreq * t) % 1) - 1;
                    break;
                case 'triangle':
                    sample = Math.abs(4 * ((currentFreq * t) % 1) - 2) - 1;
                    break;
            }

            // Add modulation if specified
            if (def.modulation) {
                sample *= Math.sin(2 * Math.PI * 8 * t);  // 8Hz modulation
            }

            // Add noise if specified
            if (def.noise) {
                sample = sample * 0.3 + (Math.random() * 2 - 1) * 0.7;
            }

            // Chirp effect for birds
            if (def.chirp) {
                const chirpFreq = frequency * (1 + Math.sin(2 * Math.PI * 15 * t) * 0.3);
                sample = Math.sin(2 * Math.PI * chirpFreq * t);
            }

            // Apply envelope (fade in/out)
            const attack = 0.01;
            const release = 0.1;
            let envelope = 1;
            if (t < attack) {
                envelope = t / attack;
            } else if (t > duration - release) {
                envelope = (duration - t) / release;
            }

            data[i] = sample * envelope * 0.5;  // 0.5 to prevent clipping
        }

        return buffer;
    }

    // Generate simple procedural music
    generateMusic(def) {
        const sampleRate = this.audioContext.sampleRate;
        const duration = 30;  // 30 second loop
        const length = sampleRate * duration;
        const buffer = this.audioContext.createBuffer(2, length, sampleRate);  // Stereo
        const leftData = buffer.getChannelData(0);
        const rightData = buffer.getChannelData(1);

        // Musical notes (C major scale) - lower octave for softer sound
        const notes = {
            'C': [130.81, 164.81, 196.00],  // C major chord (C3)
            'G': [196.00, 246.94, 293.66],  // G major chord
            'Am': [110.00, 130.81, 164.81], // A minor chord
            'F': [174.61, 220.00, 261.63]   // F major chord
        };

        const progression = def.mood === 'peaceful'
            ? ['C', 'Am', 'F', 'G']
            : ['C', 'G', 'Am', 'F'];

        const beatsPerMeasure = 4;
        const measuresPerChord = 2;
        const beatDuration = 60 / def.tempo;
        const chordDuration = beatDuration * beatsPerMeasure * measuresPerChord;

        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            const chordIndex = Math.floor(t / chordDuration) % progression.length;
            const chord = notes[progression[chordIndex]];

            let sample = 0;

            // Play chord notes with smooth sine waves (no random detuning)
            for (let n = 0; n < chord.length; n++) {
                const freq = chord[n];
                // Use softer triangle-ish wave instead of pure sine
                sample += Math.sin(2 * Math.PI * freq * t) * 0.12;
            }

            // Add subtle bass (even lower)
            const bassFreq = chord[0] / 2;
            sample += Math.sin(2 * Math.PI * bassFreq * t) * 0.15;

            // Gentle envelope per chord - slower attack/release
            const chordTime = t % chordDuration;
            const attack = Math.min(1, chordTime / 1.0);  // 1 second attack
            const release = Math.min(1, (chordDuration - chordTime) / 1.0);  // 1 second release
            const chordEnvelope = attack * release;

            sample *= chordEnvelope;

            // Soft limiter to prevent clipping
            sample = Math.tanh(sample * 2) * 0.5;

            // Gentle stereo width
            const stereoPhase = Math.sin(t * 0.3) * 0.05;
            leftData[i] = sample * (1 + stereoPhase);
            rightData[i] = sample * (1 - stereoPhase);
        }

        return buffer;
    }

    // Play a sound effect
    async play(soundId, options = {}) {
        if (!this.initialized) await this.init();
        await this.resume();

        const buffer = await this.getOrCreateSound(soundId);
        if (!buffer) return null;

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;

        // Determine which gain node to use
        let gainNode = this.sfxGain;
        if (soundId.startsWith('music-')) {
            gainNode = this.musicGain;
        } else if (soundId.startsWith('ambient-')) {
            gainNode = this.ambientGain;
        }

        // Optional: individual volume adjustment
        if (options.volume !== undefined) {
            const individualGain = this.audioContext.createGain();
            individualGain.gain.value = options.volume;
            source.connect(individualGain);
            individualGain.connect(gainNode);
        } else {
            source.connect(gainNode);
        }

        // Loop option
        source.loop = options.loop || false;

        source.start(0);

        // Track active sounds
        const soundObj = { source, soundId, startTime: this.audioContext.currentTime };
        this.activeSounds.push(soundObj);

        source.onended = () => {
            const idx = this.activeSounds.indexOf(soundObj);
            if (idx >= 0) this.activeSounds.splice(idx, 1);
        };

        return soundObj;
    }

    // Play background music
    async playMusic(musicId = 'music-peaceful') {
        if (this.currentMusic) {
            this.stopMusic();
        }

        this.currentMusic = await this.play(musicId, { loop: true });
        console.log('[SOUND] Playing music:', musicId);
    }

    // Stop background music
    stopMusic() {
        if (this.currentMusic) {
            try {
                this.currentMusic.source.stop();
            } catch (e) {}
            this.currentMusic = null;
        }
    }

    // Start ambient sounds
    async startAmbient() {
        // Ocean waves
        const ocean = await this.play('ambient-ocean', { loop: true, volume: 0.3 });
        if (ocean) this.ambientSources.push(ocean);

        // Wind
        const wind = await this.play('ambient-wind', { loop: true, volume: 0.2 });
        if (wind) this.ambientSources.push(wind);

        console.log('[SOUND] Ambient sounds started');
    }

    // Stop ambient sounds
    stopAmbient() {
        for (const sound of this.ambientSources) {
            try {
                sound.source.stop();
            } catch (e) {}
        }
        this.ambientSources = [];
    }

    // Volume controls
    setVolume(type, value) {
        this.volumes[type] = Math.max(0, Math.min(1, value));
        this.updateVolumes();
        this.saveSettings();
    }

    getVolume(type) {
        return this.volumes[type];
    }

    updateVolumes() {
        if (!this.masterGain) return;

        const masterVol = this.muted.master ? 0 : this.volumes.master;
        this.masterGain.gain.value = masterVol;

        this.musicGain.gain.value = this.muted.music ? 0 : this.volumes.music;
        this.sfxGain.gain.value = this.muted.sfx ? 0 : this.volumes.sfx;
        this.ambientGain.gain.value = this.muted.ambient ? 0 : this.volumes.ambient;
    }

    // Mute controls
    toggleMute(type = 'master') {
        this.muted[type] = !this.muted[type];
        this.updateVolumes();
        this.saveSettings();
        return this.muted[type];
    }

    isMuted(type = 'master') {
        return this.muted[type];
    }

    // Save/load settings to localStorage
    saveSettings() {
        const settings = {
            volumes: this.volumes,
            muted: this.muted
        };
        localStorage.setItem('islandKingdom_soundSettings', JSON.stringify(settings));
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('islandKingdom_soundSettings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.volumes = { ...this.volumes, ...settings.volumes };
                this.muted = { ...this.muted, ...settings.muted };
                this.updateVolumes();
                console.log('[SOUND] Settings loaded');
            }
        } catch (e) {
            console.warn('[SOUND] Could not load settings:', e);
        }
    }

    // Load custom sound from file (for user mods)
    async loadCustomSound(soundId, file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.customSounds[soundId] = audioBuffer;
            console.log('[SOUND] Loaded custom sound:', soundId);
            return true;
        } catch (e) {
            console.error('[SOUND] Failed to load custom sound:', e);
            return false;
        }
    }

    // Load custom sound from URL
    async loadCustomSoundFromURL(soundId, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.customSounds[soundId] = audioBuffer;
            console.log('[SOUND] Loaded custom sound from URL:', soundId);
            return true;
        } catch (e) {
            console.error('[SOUND] Failed to load custom sound from URL:', e);
            return false;
        }
    }

    // Remove custom sound (revert to generated)
    removeCustomSound(soundId) {
        delete this.customSounds[soundId];
    }

    // Get list of all available sounds
    getSoundList() {
        return Object.keys(this.soundDefinitions);
    }

    // Get list of custom sounds
    getCustomSoundList() {
        return Object.keys(this.customSounds);
    }

    // Event triggers - call these from game systems
    onBoatArrive() { this.play('event-boat-arrive'); }
    onBoatDepart() { this.play('event-boat-depart'); }
    onCrowdSpawn() { this.play('event-crowd-spawn'); }
    onCrowdCheer() { this.play('event-crowd-cheer'); }
    onMonumentVisit() { this.play('event-monument-visit'); }
    onPoliceAlert() { this.play('event-police-alert'); }
    onPoliceCatch() { this.play('event-police-catch'); }
    onBuildComplete() { this.play('event-build-complete'); }
    onIncome() { this.play('event-income'); }
    onUIClick() { this.play('ui-click'); }
    onUIBuild() { this.play('ui-build'); }
    onUIError() { this.play('ui-error'); }
    onUICoin() { this.play('ui-coin'); }
    onUISelect() { this.play('ui-select'); }
}

// ES6 Export
export { SoundSystem };
