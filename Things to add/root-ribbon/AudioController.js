class AudioController {
  constructor() {
  this.ctx = null;
  this.initialized = false;
  this.sfxVolume = 0.7;
  this.ambientVolume = 0.4;
  this.sfxEnabled = true;
  this.ambientEnabled = true;

  this._master = null;
  this._sfxGain = null;
  this._ambientGain = null;

  this._ambientOsc = null;
  this._ambientFilter = null;
  this._ambientLfo = null;
  this._ambientLfoGain = null;
  this._ambientPadGain = null;
  this._ambientRunning = false;

  this._victoryActive = false;
  this._ambientPausedGain = null;

  this.SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
  this._flowStep = 0;
  }

  async init() {
  if (this.initialized) return;
  this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (this.ctx.state === 'suspended') await this.ctx.resume();

  this._master = this.ctx.createGain();
  this._master.gain.value = 1;
  this._master.connect(this.ctx.destination);

  this._sfxGain = this.ctx.createGain();
  this._sfxGain.gain.value = this.sfxEnabled ? this.sfxVolume : 0;
  this._sfxGain.connect(this._master);

  this._ambientGain = this.ctx.createGain();
  this._ambientGain.gain.value = this.ambientEnabled ? this.ambientVolume : 0;
  this._ambientGain.connect(this._master);

  this.initialized = true;
  }

  async _ensureReady() {
  if (!this.initialized) await this.init();
  if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  _now() {
  return this.ctx.currentTime;
  }

  _ramp(param, value, time) {
  param.setValueAtTime(param.value, this._now());
  param.linearRampToValueAtTime(value, this._now() + time);
  }

  _expRamp(param, value, time) {
  const now = this._now();
  const current = Math.max(param.value, 0.0001);
  param.setValueAtTime(current, now);
  param.exponentialRampToValueAtTime(Math.max(value, 0.0001), now + time);
  }

  setSfxVolume(v) {
  this.sfxVolume = Math.max(0, Math.min(1, v));
  if (this._sfxGain) {
  this._ramp(this._sfxGain.gain, this.sfxEnabled ? this.sfxVolume : 0, 0.05);
  }
  }

  setAmbientVolume(v) {
  this.ambientVolume = Math.max(0, Math.min(1, v));
  if (this._ambientGain) {
  this._ramp(this._ambientGain.gain, this.ambientEnabled ? this.ambientVolume : 0, 0.3);
  }
  }

  setSfxEnabled(enabled) {
  this.sfxEnabled = !!enabled;
  if (this._sfxGain) {
  this._ramp(this._sfxGain.gain, this.sfxEnabled ? this.sfxVolume : 0, 0.05);
  }
  }

  setAmbientEnabled(enabled) {
  this.ambientEnabled = !!enabled;
  if (this._ambientGain) {
  this._ramp(this._ambientGain.gain, this.ambientEnabled ? this.ambientVolume : 0, 0.3);
  }
  }

  startAmbient() {
  this._ensureReady().then(() => {
  if (this._ambientRunning || !this.ambientEnabled) return;
  this._ambientRunning = true;

  const ctx = this.ctx;
  const now = this._now();

  this._ambientPadGain = ctx.createGain();
  this._ambientPadGain.gain.value = 0;
  this._ambientPadGain.connect(this._ambientGain);

  this._ambientFilter = ctx.createBiquadFilter();
  this._ambientFilter.type = 'lowpass';
  this._ambientFilter.frequency.value = 420;
  this._ambientFilter.Q.value = 0.7;
  this._ambientFilter.connect(this._ambientPadGain);

  this._ambientOsc = ctx.createOscillator();
  this._ambientOsc.type = 'triangle';
  this._ambientOsc.frequency.value = 130.81;
  this._ambientOsc.connect(this._ambientFilter);

  this._ambientLfoGain = ctx.createGain();
  this._ambientLfoGain.gain.value = 0.12;
  this._ambientLfoGain.connect(this._ambientPadGain.gain);

  this._ambientLfo = ctx.createOscillator();
  this._ambientLfo.type = 'sine';
  this._ambientLfo.frequency.value = 0.08;
  this._ambientLfo.connect(this._ambientLfoGain);

  const baseGain = 0.18;
  this._ambientPadGain.gain.setValueAtTime(0.0001, now);
  this._ambientPadGain.gain.exponentialRampToValueAtTime(baseGain, now + 2.5);

  this._ambientOsc.start(now);
  this._ambientLfo.start(now);
  });
  }

  stopAmbient() {
  if (!this._ambientRunning || !this.ctx) return;
  const now = this._now();
  const fade = 1.8;

  if (this._ambientPadGain) {
  this._ambientPadGain.gain.setValueAtTime(Math.max(this._ambientPadGain.gain.value, 0.0001), now);
  this._ambientPadGain.gain.exponentialRampToValueAtTime(0.0001, now + fade);
  }

  const osc = this._ambientOsc;
  const lfo = this._ambientLfo;
  const padGain = this._ambientPadGain;

  setTimeout(() => {
  try { osc && osc.stop(); } catch (_) {}
  try { lfo && lfo.stop(); } catch (_) {}
  osc && osc.disconnect();
  lfo && lfo.disconnect();
  this._ambientFilter && this._ambientFilter.disconnect();
  padGain && padGain.disconnect();
  this._ambientLfoGain && this._ambientLfoGain.disconnect();
  this._ambientOsc = null;
  this._ambientLfo = null;
  this._ambientFilter = null;
  this._ambientPadGain = null;
  this._ambientLfoGain = null;
  this._ambientRunning = false;
  }, fade * 1000 + 50);
  }

  _pluck(freq, duration, volume, dest, type = 'triangle', detune = 0) {
  if (!this.sfxEnabled || !this.ctx) return;
  const ctx = this.ctx;
  const now = this._now();
  const g = ctx.createGain();
  g.connect(dest || this._sfxGain);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(volume, now + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  osc.connect(g);
  osc.start(now);
  osc.stop(now + duration + 0.05);
  }

  _harpPluck(freq, volume) {
  if (!this.sfxEnabled || !this.ctx) return;
  const ctx = this.ctx;
  const now = this._now();
  const dur = 0.55;

  const g = ctx.createGain();
  g.connect(this._sfxGain);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(volume, now + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2800, now);
  filter.frequency.exponentialRampToValueAtTime(600, now + dur);
  filter.Q.value = 1.2;
  filter.connect(g);

  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  osc.connect(filter);
  osc.start(now);
  osc.stop(now + dur + 0.05);

  const harm = ctx.createOscillator();
  harm.type = 'sine';
  harm.frequency.value = freq * 2;
  const hg = ctx.createGain();
  hg.gain.setValueAtTime(0.0001, now);
  hg.gain.exponentialRampToValueAtTime(volume * 0.25, now + 0.006);
  hg.gain.exponentialRampToValueAtTime(0.0001, now + dur * 0.6);
  harm.connect(hg);
  hg.connect(this._sfxGain);
  harm.start(now);
  harm.stop(now + dur);
  }

  playMenu() {
  this._ensureReady().then(() => {
  const notes = [this.SCALE[4], this.SCALE[2], this.SCALE[0]];
  const vol = 0.22 * this.sfxVolume;
  notes.forEach((f, i) => {
  setTimeout(() => this._harpPluck(f, vol), i * 72);
  });
  });
  }

  playPlace() {
  this._ensureReady().then(() => {
  const f = this.SCALE[1] + (Math.random() - 0.5) * 4;
  this._pluck(f, 0.14, 0.12 * this.sfxVolume, this._sfxGain, 'sine', (Math.random() - 0.5) * 8);
  });
  }

  playFlow(step) {
  this._ensureReady().then(() => {
  const idx = Math.min(Math.max(step ?? this._flowStep, 0), this.SCALE.length - 1);
  this._flowStep = idx + 1;
  const f = this.SCALE[idx];
  const vol = 0.16 * this.sfxVolume;
  const now = this._now();
  const ctx = this.ctx;

  const g = ctx.createGain();
  g.connect(this._sfxGain);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(vol, now + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(400, now);
  filter.frequency.exponentialRampToValueAtTime(1800, now + 0.35);
  filter.connect(g);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(f * 0.5, now);
  osc.frequency.exponentialRampToValueAtTime(f, now + 0.32);
  osc.connect(filter);
  osc.start(now);
  osc.stop(now + 0.5);
  });
  }

  playBloom() {
  this._ensureReady().then(() => {
  const pattern = [0, 2, 4, 5, 4, 2];
  const vol = 0.14 * this.sfxVolume;
  const spacing = 0.09;
  pattern.forEach((si, i) => {
  const t = i * spacing;
  setTimeout(() => this._pluck(this.SCALE[si], 0.35, vol, this._sfxGain, 'triangle'), t * 1000);
  });
  });
  }

  _pauseAmbientBriefly(duration) {
  if (!this._ambientPadGain || !this._ambientRunning) return;
  const now = this._now();
  const g = this._ambientPadGain.gain;
  const current = Math.max(g.value, 0.0001);
  g.setValueAtTime(current, now);
  g.exponentialRampToValueAtTime(0.0001, now + 0.6);
  g.exponentialRampToValueAtTime(current, now + 0.6 + duration);
  }

  playVictory(callback) {
  this._ensureReady().then(() => {
  if (this._victoryActive) return;
  this._victoryActive = true;

  const totalDuration = 8;
  this._pauseAmbientBriefly(totalDuration);

  const bars = 4;
  const beatsPerBar = 4;
  const bpm = 72;
  const beat = 60 / bpm;
  const barDuration = beatsPerBar * beat;
  const melodyPatterns = [
  [0, 2, 4, 2, 0, 2, 4, 5],
  [4, 2, 0, 2, 4, 5, 4, 2],
  [0, 4, 2, 4, 5, 4, 2, 0],
  [2, 4, 5, 4, 2, 0, 2, 0],
  ];

  const ctx = this.ctx;
  const now = this._now();
  const lullabyGain = ctx.createGain();
  lullabyGain.gain.value = 0;
  lullabyGain.connect(this._sfxGain);
  lullabyGain.gain.setValueAtTime(0.0001, now);
  lullabyGain.gain.exponentialRampToValueAtTime(0.85, now + 0.4);
  lullabyGain.gain.setValueAtTime(0.85, now + totalDuration - 1.2);
  lullabyGain.gain.exponentialRampToValueAtTime(0.0001, now + totalDuration);

  const scheduled = [];

  for (let bar = 0; bar < bars; bar++) {
  const pattern = melodyPatterns[bar % melodyPatterns.length];
  const barStart = now + 0.5 + bar * barDuration;
  const noteLen = (barDuration / pattern.length) * 0.92;

  pattern.forEach((si, ni) => {
  const noteTime = barStart + ni * (barDuration / pattern.length);
  const freq = this.SCALE[si];
  const vol = 0.18 * this.sfxVolume;

  const g = ctx.createGain();
  g.connect(lullabyGain);
  g.gain.setValueAtTime(0.0001, noteTime);
  g.gain.exponentialRampToValueAtTime(vol, noteTime + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, noteTime + noteLen);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1400;
  filter.Q.value = 0.5;
  filter.connect(g);

  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  osc.connect(filter);
  osc.start(noteTime);
  osc.stop(noteTime + noteLen + 0.05);
  scheduled.push(osc);
  });

  const bassSi = pattern[0];
  const bassTime = barStart;
  const bassDur = barDuration * 0.95;
  const bg = ctx.createGain();
  bg.connect(lullabyGain);
  bg.gain.setValueAtTime(0.0001, bassTime);
  bg.gain.exponentialRampToValueAtTime(0.08 * this.sfxVolume, bassTime + 0.08);
  bg.gain.exponentialRampToValueAtTime(0.0001, bassTime + bassDur);

  const bass = ctx.createOscillator();
  bass.type = 'sine';
  bass.frequency.value = this.SCALE[bassSi] * 0.5;
  bass.connect(bg);
  bass.start(bassTime);
  bass.stop(bassTime + bassDur + 0.05);
  scheduled.push(bass);
  }

  setTimeout(() => {
  this._victoryActive = false;
  if (typeof callback === 'function') callback();
  }, totalDuration * 1000 + 100);
  });
  }
}
