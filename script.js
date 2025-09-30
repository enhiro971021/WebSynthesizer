document.addEventListener('DOMContentLoaded', () => {
    const waveformSelect = document.getElementById('waveform');
    const volumeSlider = document.getElementById('volume');
    const filterCutoffSlider = document.getElementById('filterCutoff');
    const filterResSlider = document.getElementById('filterResonance');
    const attackSlider = document.getElementById('attack');
    const decaySlider = document.getElementById('decay');
    const sustainSlider = document.getElementById('sustain');
    const releaseSlider = document.getElementById('release');
    const keyRow = document.querySelector('.key-row');

    if (!keyRow) {
        return;
    }

    const gainNode = new Tone.Gain(Tone.dbToGain(parseFloat(volumeSlider.value))).toDestination();
    const filter = new Tone.Filter(parseFloat(filterCutoffSlider.value), 'lowpass');
    filter.Q.value = parseFloat(filterResSlider.value);

    const synth = new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 8,
        oscillator: { type: waveformSelect.value },
        envelope: {
            attack: parseFloat(attackSlider.value),
            decay: parseFloat(decaySlider.value),
            sustain: parseFloat(sustainSlider.value),
            release: parseFloat(releaseSlider.value)
        }
    });

    synth.connect(filter);
    filter.connect(gainNode);

    let audioReady = false;
    const activeNotes = new Set();
    const pressedKeys = new Set();
    const noteElements = new Map();

    const layout = [
        { note: 'C4', key: 'a', label: 'A', isSharp: false },
        { note: 'C#4', key: 'w', label: 'W', isSharp: true },
        { note: 'D4', key: 's', label: 'S', isSharp: false },
        { note: 'D#4', key: 'e', label: 'E', isSharp: true },
        { note: 'E4', key: 'd', label: 'D', isSharp: false },
        { note: 'F4', key: 'f', label: 'F', isSharp: false },
        { note: 'F#4', key: 't', label: 'T', isSharp: true },
        { note: 'G4', key: 'g', label: 'G', isSharp: false },
        { note: 'G#4', key: 'y', label: 'Y', isSharp: true },
        { note: 'A4', key: 'h', label: 'H', isSharp: false },
        { note: 'A#4', key: 'u', label: 'U', isSharp: true },
        { note: 'B4', key: 'j', label: 'J', isSharp: false }
    ];

    const keyToNote = layout.reduce((map, item) => {
        map.set(item.key, item.note);
        return map;
    }, new Map());

    layout.forEach((config) => {
        const key = document.createElement('button');
        key.type = 'button';
        key.className = `key ${config.isSharp ? 'black' : 'white'}`;
        key.dataset.note = config.note;

        const keyLabel = document.createElement('span');
        keyLabel.className = 'key-label';
        keyLabel.textContent = config.label;
        key.appendChild(keyLabel);

        key.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            key.setPointerCapture(event.pointerId);
            startNote(config.note);
        });

        key.addEventListener('pointerup', () => {
            stopNote(config.note);
        });

        key.addEventListener('pointercancel', () => {
            stopNote(config.note);
        });

        key.addEventListener('lostpointercapture', () => {
            stopNote(config.note);
        });

        keyRow.appendChild(key);
        noteElements.set(config.note, key);
    });

    keyRow.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    });

    async function ensureAudioContext() {
        if (audioReady) {
            return;
        }

        await Tone.start();
        audioReady = true;
    }

    function setKeyActive(note, isActive) {
        const element = noteElements.get(note);
        if (!element) {
            return;
        }

        element.classList.toggle('active', isActive);
    }

    function startNote(note) {
        if (activeNotes.has(note)) {
            return;
        }

        activeNotes.add(note);
        setKeyActive(note, true);

        ensureAudioContext().then(() => {
            synth.triggerAttack(note);
        });
    }

    function stopNote(note) {
        if (!activeNotes.has(note)) {
            return;
        }

        activeNotes.delete(note);
        setKeyActive(note, false);
        synth.triggerRelease(note);
    }

    window.addEventListener('keydown', (event) => {
        const key = event.key.toLowerCase();
        if (!keyToNote.has(key) || event.repeat) {
            return;
        }

        event.preventDefault();
        pressedKeys.add(key);
        startNote(keyToNote.get(key));
    });

    window.addEventListener('keyup', (event) => {
        const key = event.key.toLowerCase();
        if (!pressedKeys.has(key)) {
            return;
        }

        pressedKeys.delete(key);
        stopNote(keyToNote.get(key));
    });

    window.addEventListener('blur', () => {
        pressedKeys.forEach((key) => {
            const note = keyToNote.get(key);
            if (note) {
                stopNote(note);
            }
        });

        pressedKeys.clear();
        activeNotes.clear();
        noteElements.forEach((element) => element.classList.remove('active'));
        synth.releaseAll();
    });

    waveformSelect.addEventListener('change', (event) => {
        synth.set({ oscillator: { type: event.target.value } });
    });

    volumeSlider.addEventListener('input', (event) => {
        const db = parseFloat(event.target.value);
        gainNode.gain.value = Tone.dbToGain(db);
    });

    filterCutoffSlider.addEventListener('input', (event) => {
        const freq = parseFloat(event.target.value);
        filter.frequency.rampTo(freq, 0.05);
    });

    filterResSlider.addEventListener('input', (event) => {
        const resonance = parseFloat(event.target.value);
        filter.Q.rampTo(resonance, 0.05);
    });

    const envelopeSliders = [attackSlider, decaySlider, sustainSlider, releaseSlider];
    envelopeSliders.forEach((slider) => {
        slider.addEventListener('input', () => {
            synth.set({
                envelope: {
                    attack: parseFloat(attackSlider.value),
                    decay: parseFloat(decaySlider.value),
                    sustain: parseFloat(sustainSlider.value),
                    release: parseFloat(releaseSlider.value)
                }
            });
        });
    });
});
