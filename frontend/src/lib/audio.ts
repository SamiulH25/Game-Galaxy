/**
 * Centralized audio system for Game Galaxy.
 * Uses Web Audio API synthesis — no audio files needed.
 * Call `initAudio()` on first user interaction, then `play(name)` anywhere.
 */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let enabled = true;

/** Initialise audio context (must be called from a user gesture). */
export function initAudio() {
  if (ctx) return;
  ctx = new AudioContext();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.35;
  masterGain.connect(ctx.destination);
}

/** Set master volume (0–100). Clamped, converted to 0–1 gain. */
export function setVolume(percent: number) {
  const clamped = Math.max(0, Math.min(100, percent));
  if (masterGain) {
    masterGain.gain.value = (clamped / 100) * 0.5;
  }
}

/** Toggle all sounds on/off. */
export function toggleAudio(on?: boolean) {
  if (on !== undefined) enabled = on;
  else enabled = !enabled;
  return enabled;
}

/** Play a named sound effect. Safe to call before initAudio() — no-ops if uninitialised. */
export function play(name: string) {
  if (!enabled || !ctx || !masterGain) return;

  try {
    switch (name) {
      case 'click':       return click(ctx, masterGain);
      case 'hover':       return hover(ctx, masterGain);
      case 'select':      return select(ctx, masterGain);
      case 'confirm':     return confirm(ctx, masterGain);
      case 'cancel':      return cancel(ctx, masterGain);
      case 'success':     return success(ctx, masterGain);
      case 'error':       return error(ctx, masterGain);
      case 'whoosh':      return whoosh(ctx, masterGain);
      case 'chime':       return chime(ctx, masterGain);
      case 'pop':         return pop(ctx, masterGain);
      case 'pageEnter':   return pageEnter(ctx, masterGain);
      case 'pageLeave':   return pageLeave(ctx, masterGain);
      case 'doorOpen':    return doorOpen(ctx, masterGain);
      case 'doorClose':   return doorClose(ctx, masterGain);
      case 'powerup':     return powerup(ctx, masterGain);
      case 'notification':return notification(ctx, masterGain);
    }
  } catch {
    // Web Audio API can throw in restricted contexts — swallow silently
  }
}

// ─── Sound primitives ───

/** Short soft click. */
function click(c: AudioContext, dest: AudioNode) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.value = 800;
  g.gain.setValueAtTime(0.08, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.04);
  o.connect(g).connect(dest);
  o.start(); o.stop(c.currentTime + 0.05);
}

/** Subtle hover tick. */
function hover(c: AudioContext, dest: AudioNode) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.value = 1200;
  g.gain.setValueAtTime(0.03, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.02);
  o.connect(g).connect(dest);
  o.start(); o.stop(c.currentTime + 0.025);
}

/** Positive selection — two-tone rising. */
function select(c: AudioContext, dest: AudioNode) {
  [600, 900].forEach((f, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.07, c.currentTime + i * 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.06 + 0.08);
    o.connect(g).connect(dest);
    o.start(c.currentTime + i * 0.06);
    o.stop(c.currentTime + i * 0.06 + 0.1);
  });
}

/** Confirmation chime — three bright notes. */
function confirm(c: AudioContext, dest: AudioNode) {
  [523, 659, 784].forEach((f, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.1, c.currentTime + i * 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.1 + 0.2);
    o.connect(g).connect(dest);
    o.start(c.currentTime + i * 0.1);
    o.stop(c.currentTime + i * 0.1 + 0.25);
  });
}

/** Cancel / close — descending two-tone. */
function cancel(c: AudioContext, dest: AudioNode) {
  [500, 350].forEach((f, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.06, c.currentTime + i * 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.08 + 0.1);
    o.connect(g).connect(dest);
    o.start(c.currentTime + i * 0.08);
    o.stop(c.currentTime + i * 0.08 + 0.12);
  });
}

/** Success jingle. */
function success(c: AudioContext, dest: AudioNode) {
  [523, 659, 784, 1047].forEach((f, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.12, c.currentTime + i * 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.08 + 0.25);
    o.connect(g).connect(dest);
    o.start(c.currentTime + i * 0.08);
    o.stop(c.currentTime + i * 0.08 + 0.3);
  });
}

/** Error buzz. */
function error(c: AudioContext, dest: AudioNode) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sawtooth';
  o.frequency.value = 180;
  g.gain.setValueAtTime(0.1, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
  o.connect(g).connect(dest);
  o.start(); o.stop(c.currentTime + 0.3);
}

/** Whoosh — filtered noise sweep. */
function whoosh(c: AudioContext, dest: AudioNode) {
  const bufferSize = ctx!.sampleRate * 0.3;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(200, c.currentTime);
  filter.frequency.exponentialRampToValueAtTime(2000, c.currentTime + 0.25);
  const g = c.createGain();
  g.gain.setValueAtTime(0.08, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
  src.connect(filter).connect(g).connect(dest);
  src.start(); src.stop(c.currentTime + 0.35);
}

/** Gentle chime — for notifications. */
function chime(c: AudioContext, dest: AudioNode) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.value = 880;
  g.gain.setValueAtTime(0.08, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);
  o.connect(g).connect(dest);
  o.start(); o.stop(c.currentTime + 0.45);
}

/** Pop — short bubble. */
function pop(c: AudioContext, dest: AudioNode) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(600, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(1200, c.currentTime + 0.05);
  g.gain.setValueAtTime(0.08, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.06);
  o.connect(g).connect(dest);
  o.start(); o.stop(c.currentTime + 0.07);
}

/** Page enter — soft rising pad. */
function pageEnter(c: AudioContext, dest: AudioNode) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(220, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(330, c.currentTime + 0.3);
  g.gain.setValueAtTime(0.05, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
  o.connect(g).connect(dest);
  o.start(); o.stop(c.currentTime + 0.55);
}

/** Page leave — soft descending. */
function pageLeave(c: AudioContext, dest: AudioNode) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(330, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(200, c.currentTime + 0.25);
  g.gain.setValueAtTime(0.04, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
  o.connect(g).connect(dest);
  o.start(); o.stop(c.currentTime + 0.4);
}

/** Door open — resonant sweep. */
function doorOpen(c: AudioContext, dest: AudioNode) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(300, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(600, c.currentTime + 0.2);
  g.gain.setValueAtTime(0.06, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
  o.connect(g).connect(dest);
  o.start(); o.stop(c.currentTime + 0.35);
}

/** Door close — thud. */
function doorClose(c: AudioContext, dest: AudioNode) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(200, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.12);
  g.gain.setValueAtTime(0.1, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
  o.connect(g).connect(dest);
  o.start(); o.stop(c.currentTime + 0.18);
}

/** Power-up arpeggio. */
function powerup(c: AudioContext, dest: AudioNode) {
  [440, 554, 659, 880].forEach((f, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.08, c.currentTime + i * 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.05 + 0.12);
    o.connect(g).connect(dest);
    o.start(c.currentTime + i * 0.05);
    o.stop(c.currentTime + i * 0.05 + 0.15);
  });
}

/** Notification ping. */
function notification(c: AudioContext, dest: AudioNode) {
  [1000, 1300].forEach((f, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.06, c.currentTime + i * 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.1 + 0.15);
    o.connect(g).connect(dest);
    o.start(c.currentTime + i * 0.1);
    o.stop(c.currentTime + i * 0.1 + 0.18);
  });
}
