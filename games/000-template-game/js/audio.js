/**
 * Lightweight procedural audio — no asset files required.
 */
window.GalaxyTemplate = window.GalaxyTemplate || {};

(function(NS) {
  function AudioBus() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.35;
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
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  };

  AudioBus.prototype.beep = function(freq, duration, type, gain) {
    if (!this.enabled) return;
    var ctx = this.ensure();
    if (!ctx) return;

    var osc = ctx.createOscillator();
    var amp = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    var g = (gain == null ? this.volume : gain) * 0.15;
    amp.gain.setValueAtTime(g, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  AudioBus.prototype.collect = function() {
    this.beep(880, 0.08, 'sine', 0.25);
    this.beep(1320, 0.06, 'triangle', 0.15);
  };

  AudioBus.prototype.hit = function() {
    this.beep(120, 0.2, 'sawtooth', 0.3);
  };

  AudioBus.prototype.win = function() {
    this.beep(523, 0.12, 'square', 0.2);
    this.beep(659, 0.12, 'square', 0.2);
    this.beep(784, 0.2, 'square', 0.25);
  };

  AudioBus.prototype.start = function() {
    this.beep(440, 0.1, 'triangle', 0.2);
  };

  AudioBus.prototype.shoot = function() {
    this.beep(620, 0.05, 'square', 0.18);
    this.beep(980, 0.04, 'sine', 0.12);
  };

  AudioBus.prototype.destroy = function() {
    this.beep(220, 0.08, 'sawtooth', 0.2);
  };

  NS.Audio = new AudioBus();
})(window.GalaxyTemplate);
