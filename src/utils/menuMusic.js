// HiValley — tiny menu music / SFX helper.
//
// Uses the WebAudio API directly so we don't need to ship any audio files.
// Exposes:
//   - startMenuMusic()   : looping cozy chord pad
//   - stopMenuMusic()
//   - playClick()
//   - playHover()
//   - playConfirm()
//
// Music is muted by default until the user clicks the page (autoplay
// policies). A small UI hint is shown when muted.

let ctx = null;
let masterGain = null;
let musicNodes = null;
let muted = true;

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.18;
  masterGain.connect(ctx.destination);
  return ctx;
}

export function unlockAudio() {
  ensureCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  muted = false;
}

export function setMuted(v) {
  muted = !!v;
  if (masterGain) masterGain.gain.value = muted ? 0 : 0.18;
}

// Soft pentatonic chord pad. Each "voice" is a slowly-modulated sawtooth
// routed through a low-pass filter, giving a warm Stardew-ish hum.
function buildPad() {
  const c = ensureCtx();
  if (!c) return null;

  const root = 110; // A2
  // Chord: I - vi - IV - V (Am - F - C - G), major pentatonic-friendly voicing
  const progression = [
    [root, root * 1.25, root * 1.5, root * 2.0],     // Am-ish
    [root * (5 / 6), root * (25 / 18), root * (3 / 2), root * (5 / 3)], // F
    [root * (3 / 4), root, root * (5 / 4), root * (3 / 2)],              // C
    [root * (4 / 5), root, root * (6 / 5), root * (8 / 5)],              // G
  ];

  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  filter.Q.value = 0.4;
  filter.connect(masterGain);

  const voices = [];
  for (let i = 0; i < 4; i++) {
    const o = c.createOscillator();
    o.type = i === 0 ? 'triangle' : 'sine';
    o.frequency.value = progression[0][i];
    const g = c.createGain();
    g.gain.value = 0.0;
    o.connect(g);
    g.connect(filter);
    o.start();
    voices.push({ o, g });
  }

  // Slow chord rotation
  let step = 0;
  const interval = setInterval(() => {
    if (!c || c.state !== 'running') return;
    step = (step + 1) % progression.length;
    const chord = progression[step];
    for (let i = 0; i < voices.length; i++) {
      const v = voices[i];
      const now = c.currentTime;
      v.o.frequency.cancelScheduledValues(now);
      v.o.frequency.linearRampToValueAtTime(chord[i], now + 1.2);
    }
  }, 4800);

  // Slow gain swell on each voice for "breathing"
  for (let i = 0; i < voices.length; i++) {
    const v = voices[i];
    v.g.gain.value = 0.07;
    const now = c.currentTime;
    v.g.gain.linearRampToValueAtTime(0.05, now + 6 + i);
    v.g.gain.linearRampToValueAtTime(0.09, now + 12 + i);
  }

  // LFO on filter cutoff for movement
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.08;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 220;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start();

  return {
    voices,
    filter,
    interval,
    stop() {
      clearInterval(interval);
      try {
        lfo.stop();
      } catch (_) {}
      for (const v of voices) {
        try {
          v.o.stop();
        } catch (_) {}
      }
    },
  };
}

export function startMenuMusic() {
  if (musicNodes) return;
  const c = ensureCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  musicNodes = buildPad();
}

export function stopMenuMusic() {
  if (!musicNodes) return;
  musicNodes.stop();
  musicNodes = null;
}

function tone(freq, dur, type = 'square', vol = 0.2) {
  const c = ensureCtx();
  if (!c || muted) return;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = c.createGain();
  g.gain.value = 0;
  o.connect(g);
  g.connect(masterGain);
  const now = c.currentTime;
  g.gain.linearRampToValueAtTime(vol, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, now + dur);
  o.start(now);
  o.stop(now + dur + 0.05);
}

export function playClick() {
  tone(420, 0.06, 'square', 0.16);
  setTimeout(() => tone(280, 0.05, 'square', 0.1), 30);
}

export function playHover() {
  tone(880, 0.04, 'sine', 0.08);
}

export function playConfirm() {
  tone(523, 0.08, 'triangle', 0.16);
  setTimeout(() => tone(659, 0.08, 'triangle', 0.16), 60);
  setTimeout(() => tone(784, 0.12, 'triangle', 0.18), 130);
}

export function playCancel() {
  tone(440, 0.08, 'sawtooth', 0.1);
  setTimeout(() => tone(220, 0.12, 'sawtooth', 0.1), 60);
}