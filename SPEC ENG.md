DIOWKRAD SF2 CHIP-TUNE ENGINE — Specification (v1.2.5 Finale)


Project Overview

This is the final build of an audio engine designed for sound synthesis, combining three generation modes: emulation of the RP 2A03 (NES) chip with custom wavetables, SoundFont2 (SF2) playback featuring dynamic parsing of RIFF structures, and MIDI GM × 128 synthesis based on built-in harmonic recipes.
The engine was developed entirely from scratch without external libraries. It features built-in clipping protection, independent sustain/timeout chain systems, and Web MIDI API support. It is highly optimized for Android devices, including an anti-stuck mechanism for keys.

Architecture and Source Code Structure

The project follows a monolithic architecture divided into 13 logical modules (files). To ensure proper compilation, merging, or sequential file inclusion, you must strictly follow the numeric index in their filenames:
1. 01_state.js — Core global state, sample cache, AudioContext initialization, and a multi-stage filtering chain (DC blocker, clipper, limiter).
2. 02_chip_engine_2a03.js — NES 2A03 chip emulation engine, generating duty cycle buffers (Duty 50/25/12.5%), LFSR pseudo-noise, N-waves, and managing chip voices.
3. 03_sf2_parser.js — A resilient SoundFont2 parser supporting RIFF/RIFX structures, preset zones, and parameter generators (EG, attenuation, loops).
4. 04_sf2_playback.js — Polyphony controller and SoundFont sample playback engine with pitch calculation in cents and AHDS envelopes.
5. 05_sustain.js — Rhythmic sustain matrix (1/8, 1/4, 1/2 beats) and a safety timeout "ceiling" for note duration (1 whole note relative to the current BPM).
6. 06_sensitivity.js — "Touch" module (velocity sensitivity curves: Soft, Hard, Fixed) and global noteOn/noteOff triggers.
7. 07_piano_roll.js — Internal component for real-time musical staff visualization and rendering.
8. 08_keyboard_mouse.js — Renders two virtual keyboards (C1..C8) with independent pointer mechanics, scroll strips (tape-thumb), and a roll lock (rollLock) mechanism.
9. 09_keyboard_pc.js — PC keyboard controller. Supports 2-row ("zigzag") and 1-row chromatic layouts, along with octave shift controls.
10. 10_midi_keyboard.js — Web MIDI API integration, hot-plugging for physical MIDI controllers, sustain pedal (CC64) support, and Pitch Bend processing.
11. 11_midi_gm128.js — A General MIDI synthesizer with 128 instruments based on additive harmonic synthesis and filtering.
12. 12_start.js — Entry point. Automatically launches UI rendering, builds selectors, and polls module readiness.
13. 13_touch_fps.js — Touchscreen optimization micro-module (dynamic removal of CSS :hover rules) and a cyclic FPS counter driven by requestAnimationFrame.
Important: The 01–13 index order represents a strict dependency topology. Reordering or excluding modules will inevitably result in ReferenceError exceptions in the global scope.

Global Collections and State Map

All voice allocation logic and key tracking rely on a single source of truth defined in 01_state.js, 09_keyboard_pc.js, and 10_midi_keyboard.js:
• state — System configuration object (current mode, active voice, and sampleCache).
• activeChip — A Map storing active chip oscillators.
• activeSF2 — A Map storing active SoundFont samples (polyphony limit: VOICE_MAX = 32).
• activeMidi — A Map storing active GM instruments.
• heldKeys — A Map tracking keys pressed on the PC keyboard (key code -> MIDI note number).
• noteOwner — A Map tracking note ownership to prevent release conflicts (note -> key code / @ext for mouse or external MIDI).

Technical Description: Logic and Interface


1. Sound Core and Effects Logic

• Clipping and Click Protection: Implemented in 01_state.js. Upon initializing the context, a chain of nodes is created: a DC blocker (BiquadFilter high-pass at 20 Hz to cut off DC offset), a static soft clipper (a 2048-point WaveShaper node using a hyperbolic tangent Math.tanh function), and a soft limiter (DynamicsCompressor with a -3 dB threshold and a soft knee).
• Rhythmic Sustain and Anti-Stuck System: Sustain modes (1/8, 1/4, 1/2) calculate the note hold time from the moment it is triggered (performance.now()) to the strict boundary of the musical beat based on the current BPM. When a key is released, the sound enters its decay phase exactly aligned with the beat grid. A ceilingKill safety feature automatically terminates any note sounding longer than one whole note, preventing hanging voices during interrupted MIDI events.
• Dynamic Pitch Bend: The pitch bend processing module recalculates frequencies in real time. It updates the playbackRate.value property for SoundFont samples, uses a custom tracking method for chip generators, and dynamically updates the frequency.setValueAtTime parameter for each oscillator within the active harmonics array for MIDI GM instruments.

2. Rendering and CSS Layout Specifics

• Styling Concept: The interface features a retro aesthetic (8-bit palette, fixed-width monospaced fonts, outset borders). Buttons (button), headers (h1), and screens (.lcd) are textured programmatically via multi-layered pixel gradients (repeating-radial-gradient), simulating the grain of hardware displays and microscopic glares on silicon circuit boards.
• Custom Scroll Logic (Strips): Horizontal navigation across the C1..C8 range combines scrollable containers (.kbd-wrap) and coordinate strips (.kbd-strip). The script calculates the visible area ratio, dynamically sets the width of the .tape-thumb slider, and positions it using style.left. It supports independent scrolling for both keyboards, mouse control via PointerCapture, and horizontal scrolling using the mouse wheel (wheel).
• Mobile Touch Optimization: To eliminate visual bugs on mobile touchscreens, the 13_touch_fps.js module scans all application stylesheets at startup and hardware-deletes all selectors containing the :hover pseudo-class.

DOM Selector Reference Map (UI and Inputs)

To function correctly, the HTML document must include the following selectors:

Global Controls and Indicators

#vol — A slider (input[type="range"]) for master volume control (0–100). In CSS, it has a fixed width of 460px and a custom ::-webkit-slider-thumb.
#log — A container for system logs (event log, restricted to 10 lines via the <hr> tag).
#lcd — The main text display showing the engine status (indicates the selected instrument, bank, or panic state).
#voiceCnt — A dynamic polyphony voice counter (Golos: **0**).
#fpsDisplay — A text field showing the current frames per second (FPS).

Mode and UI Controls

#btnChip — Button to switch to CHIP-TUNE mode.
#btnSf2 — Button to switch to SoundFont mode.
#btnMidi — Button to switch to MIDI GM mode.
#chipVoiceSel — A dropdown list (select) for the 2A03 chip voices.
#midiVoiceSel — A dropdown list for General MIDI voices (automatically grouped using optgroup categories).
#wavePanel .wbtn — A button group for quick chip waveform selection (via dataset.wave).

Sustain and Tempo Tools

#bpm — Tempo slider (ranging from 40 to 300 BPM).
#bpmVal — Text indicator displaying the current BPM value.
#susBtn8, #susBtn4, #susBtn2 — Toggle buttons for rhythmic sustain modes (1/8, 1/4, 1/2 beats).

Velocity Sensitivity ("Touch")

#sensSoft, #sensHard, #sensFixed — Toggle buttons for velocity sensitivity curves.

MIDI Connection and Panic

#midiBtn — Button to initialize the Web MIDI API and request browser permissions (Connect MIDI).
#midiSel — Dropdown list of available physical/virtual MIDI inputs.
#panicBtn — Emergency button to mute all sound channels, clear timers, and reset pedals (panicAll()).

Interactive Keyboard and Scrolling

#keys / #keys2 — Containers for the first and second keyboards. These are dynamically populated with .wk elements (white keys, base size 58x152px) and .bk elements (black keys, size 36x94px, with inline style.left positioning offsets).
#wrap1 / #wrap2 — Parent scroll containers for the keyboards using the .kbd-wrap class to handle horizontal scrolling.
#strip1 / #strip2 — Containers for custom ribbon trackbars (.kbd-strip) to visualize scroll position. Each contains a .tape-thumb element inside.
#rollLock — Toggle button to lock horizontal scrolling (rollLocked). It forces keyboard containers to overflowX = 'hidden' and reduces scroll strip opacity to 0.4.
#octDn / #octUp — Octave shift buttons for the physical PC keyboard (− OCTAVE / + OCTAVE).

Vital Constants and Range Boundaries

PC_MIN = () => 24; — The lowest note available for octave positioning (Note C1).
PC_MAX = () => 78; — The highest note available for octave positioning (Note F#5 / Boundary up to C8).
Key rendering range constants: KB_LO = 24, KB_HI = 108 (Full C1..C8 range).

Styling and Interface Modification Rules

1. Direct Style Manipulation via JS (Critical): The script actively manipulates element presentation via inline styles (style.width, style.left, style.overflowX, style.opacity). When modifying the CSS skeleton, keep in mind that JavaScript will overwrite these properties on #wrap, #strip, .bk, and .tape-thumb elements.
