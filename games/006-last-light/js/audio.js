/**
 * Last Light — audio.js
 * Procedural Web Audio — no asset files. Night-sea soundscape.
 * Namespace: window.LastLight.Audio
 */
window.LastLight = window.LastLight || {};

(function (NS) {
  'use strict';

  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  function AudioBus() {
    this.ctx = null;
    this.master = null;
    this.ready = false;
    this.ambientOn = false;
    this._surfBase = 0.10;
    this.shimmerGain = null;
    this.foghornT = 14;
    this.ghostT = 1.0;
  }

  AudioBus.prototype.ensure = function () {
    if (this.ready) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    var ctx = this.ctx = new AC();
    this.master = ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(ctx.destination);
    this.buildSurf();
    this.buildShimmer();
    this.ready = true;
    return true;
  };

  AudioBus.prototype.resume = function () {
    if (!this.ensure()) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (!this.ambientOn) {
      this.ambientOn = true;
    }
  };

  AudioBus.prototype.makeNoiseBuffer = function (seconds, brown) {
    var ctx = this.ctx;
    var n = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    var buf = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = buf.getChannelData(0);
    var last = 0;
    for (var i = 0; i < n; i++) {
      var w = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      } else {
        d[i] = w;
      }
    }
    return buf;
  };

  // --- Ambient bed ---

  AudioBus.prototype.buildSurf = function () {
    var ctx = this.ctx;
    var src = ctx.createBufferSource();
    src.buffer = this.makeNoiseBuffer(3, true);
    src.loop = true;
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    lp.Q.value = 0.4;
    this.surfGain = ctx.createGain();
    this.surfGain.gain.value = this._surfBase;
    var lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    var lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.05;
    lfo.connect(lfoGain);
    lfoGain.connect(this.surfGain.gain);
    src.connect(lp);
    lp.connect(this.surfGain);
    this.surfGain.connect(this.master);
    src.start();
    lfo.start();
  };

  AudioBus.prototype.buildShimmer = function () {
    var ctx = this.ctx;
    var o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = 1240;
    var vib = ctx.createOscillator();
    vib.frequency.value = 5.2;
    var vibG = ctx.createGain();
    vibG.gain.value = 9;
    vib.connect(vibG);
    vibG.connect(o.frequency);
    this.shimmerGain = ctx.createGain();
    this.shimmerGain.gain.value = 0;
    o.connect(this.shimmerGain);
    this.shimmerGain.connect(this.master);
    o.start();
    vib.start();
  };

  AudioBus.prototype.setAmbientLevel = function (level) {
    if (!this.ready) return;
    this.surfGain.gain.setTargetAtTime(this._surfBase * level, this.ctx.currentTime, 0.4);
  };

  AudioBus.prototype.setShimmer = function (v) {
    if (!this.ready) return;
    this.shimmerGain.gain.setTargetAtTime(clamp01(v) * 0.05, this.ctx.currentTime, 0.09);
  };

  // --- Helpers ---

  AudioBus.prototype.env = function (when, peak, dur) {
    var g = this.ctx.createGain();
    var now = this.ctx.currentTime + (when || 0);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    return g;
  };

  AudioBus.prototype.blip = function (freq, dur, type, gain, when, slide) {
    if (!this.ready) return;
    var ctx = this.ctx;
    var whenS = when || 0;
    var o = ctx.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, ctx.currentTime + whenS);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, ctx.currentTime + whenS + dur);
    var g = this.env(whenS, gain || 0.2, dur);
    o.connect(g);
    g.connect(this.master);
    o.start(ctx.currentTime + whenS);
    o.stop(ctx.currentTime + whenS + dur + 0.06);
  };

  AudioBus.prototype.noise = function (dur, gain, filterFreq, type, when) {
    if (!this.ready) return;
    var ctx = this.ctx;
    var whenS = when || 0;
    var src = ctx.createBufferSource();
    src.buffer = this.makeNoiseBuffer(Math.max(0.25, dur), false);
    var f = ctx.createBiquadFilter();
    f.type = type || 'lowpass';
    f.frequency.value = filterFreq || 800;
    f.Q.value = 0.7;
    var g = this.env(whenS, gain || 0.2, dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(ctx.currentTime + whenS);
    src.stop(ctx.currentTime + whenS + dur + 0.06);
  };

  // --- Event sounds ---

  var WAKE_FREQ = { cog: 520, sloop: 740, barge: 320 };

  AudioBus.prototype.wakeBlip = function (type) {
    var f = WAKE_FREQ[type] || 520;
    this.blip(f, 0.14, 'sine', 0.16);
    this.blip(f * 1.5, 0.1, 'sine', 0.07, 0.05);
  };

  AudioBus.prototype.dock = function () {
    if (!this.ready) return;
    var ctx = this.ctx;
    var t = ctx.currentTime;
    var car = ctx.createOscillator();
    car.frequency.value = 659;
    var mod = ctx.createOscillator();
    mod.frequency.value = 1318;
    var modG = ctx.createGain();
    modG.gain.setValueAtTime(320, t);
    modG.gain.exponentialRampToValueAtTime(1, t + 1.1);
    mod.connect(modG);
    modG.connect(car.frequency);
    var g = this.env(0, 0.30, 1.2);
    car.connect(g);
    g.connect(this.master);
    car.start(t);
    mod.start(t);
    car.stop(t + 1.3);
    mod.stop(t + 1.3);
    this.noise(0.5, 0.10, 2600, 'highpass', 0.02); // foam hiss
  };

  AudioBus.prototype.wreck = function () {
    this.blip(130, 0.7, 'sine', 0.40, 0, 42);
    this.blip(90, 0.5, 'triangle', 0.18, 0.05, 50);
    this.noise(0.6, 0.28, 700, 'lowpass', 0.02);
  };

  AudioBus.prototype.lanternOut = function () {
    this.noise(0.8, 0.10, 1800, 'highpass', 0.1);
    this.blip(220, 0.5, 'sawtooth', 0.05, 0.1, 70);
  };

  AudioBus.prototype.stormWarn = function () {
    if (!this.ready) return;
    var ctx = this.ctx;
    var t = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = this.makeNoiseBuffer(1.6, false);
    src.loop = true;
    var f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.4;
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(1400, t + 1.5);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 1.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + 1.9);
    this.blip(46, 1.6, 'sine', 0.22);
  };

  AudioBus.prototype.lightning = function () {
    this.noise(0.18, 0.50, 2400, 'highpass');
    this.noise(0.5, 0.22, 900, 'lowpass', 0.03);
    this.blip(70, 0.5, 'sine', 0.25, 0.02, 38);
  };

  AudioBus.prototype.milestone = function () {
    this.blip(392, 0.16, 'sawtooth', 0.16);
    this.blip(587, 0.28, 'sawtooth', 0.18, 0.12);
  };

  AudioBus.prototype.ghostNote = function () {
    var notes = [659, 622, 523, 587];
    var f = notes[(Math.random() * notes.length) | 0];
    this.blip(f, 0.9, 'triangle', 0.05);
    this.blip(f * 1.006, 0.9, 'triangle', 0.04);
  };

  AudioBus.prototype.dawn = function () {
    var self = this;
    [220, 277, 330, 440].forEach(function (f, i) {
      self.blip(f, 2.6, 'sine', 0.10, i * 0.18);
    });
  };

  AudioBus.prototype.achievement = function () {
    var self = this;
    [523, 659, 784, 1046].forEach(function (f, i) {
      self.blip(f, 0.18, 'sine', 0.14, i * 0.07);
    });
  };

  AudioBus.prototype.pbFlare = function () {
    this.dawn();
    this.achievement();
  };

  AudioBus.prototype.click = function () {
    this.blip(500, 0.05, 'square', 0.08);
  };

  AudioBus.prototype.foghorn = function () {
    if (!this.ready) return;
    var ctx = this.ctx;
    var self = this;
    var t = ctx.currentTime;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.11, t + 0.7);
    g.gain.setValueAtTime(0.11, t + 1.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    var f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 240;
    [65, 66.5].forEach(function (fr) {
      var o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = fr;
      o.connect(f);
      o.start(t);
      o.stop(t + 2.7);
    });
    f.connect(g);
    g.connect(self.master);
  };

  AudioBus.prototype.update = function (dt, ghostHere) {
    if (!this.ready) return;
    this.foghornT -= dt;
    if (this.foghornT <= 0) {
      this.foghorn();
      this.foghornT = 18 + Math.random() * 8;
    }
    if (ghostHere) {
      this.ghostT -= dt;
      if (this.ghostT <= 0) {
        this.ghostNote();
        this.ghostT = 1.8 + Math.random() * 1.4;
      } else {
        this.ghostT = 1.0;
      }
    }
  };

  NS.Audio = new AudioBus();
})(window.LastLight);
