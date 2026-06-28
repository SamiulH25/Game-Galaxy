/**
 * Procedural patisserie audio — warm, non-synthy tones.
 */
window.PatisserieLedger = window.PatisserieLedger || {};

(function(NS) {
  function AudioBus() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.32;
  }

  AudioBus.prototype.ensure = function() {
    if (this.ctx) return this.ctx;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this.enabled = false;
    }
    return this.ctx;
  };

  AudioBus.prototype.resume = function() {
    var ctx = this.ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  };

  AudioBus.prototype.tone = function(freq, dur, type, gain) {
    if (!this.enabled) return;
    var ctx = this.ensure();
    if (!ctx) return;
    var osc = ctx.createOscillator();
    var amp = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    var g = (gain == null ? this.volume : gain) * 0.12;
    amp.gain.setValueAtTime(g, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  };

  AudioBus.prototype.match = function() {
    this.tone(392, 0.06, 'triangle', 0.22);
    this.tone(494, 0.05, 'sine', 0.15);
  };

  AudioBus.prototype.combo = function(n) {
    this.tone(330 + n * 40, 0.08, 'triangle', 0.2);
  };

  AudioBus.prototype.swap = function() {
    this.tone(280, 0.04, 'sine', 0.12);
  };

  AudioBus.prototype.invalid = function() {
    this.tone(180, 0.1, 'sawtooth', 0.15);
  };

  AudioBus.prototype.win = function() {
    var notes = [392, 494, 587, 659];
    for (var i = 0; i < notes.length; i++) {
      (function(f, idx) {
        setTimeout(function() { NS.Audio.tone(f, 0.12, 'triangle', 0.2); }, idx * 100);
      })(notes[i], i);
    }
  };

  AudioBus.prototype.lose = function() {
    this.tone(220, 0.2, 'triangle', 0.2);
    this.tone(165, 0.25, 'sine', 0.15);
  };

  AudioBus.prototype.ui = function() {
    this.tone(440, 0.05, 'sine', 0.14);
  };

  AudioBus.prototype.craft = function() {
    this.tone(523, 0.07, 'triangle', 0.18);
    this.tone(659, 0.09, 'sine', 0.16);
  };

  NS.Audio = new AudioBus();
})(window.PatisserieLedger);
