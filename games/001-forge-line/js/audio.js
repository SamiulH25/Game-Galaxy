/**
 * Forge Line — procedural Web Audio.
 */
(function(NS) {
  var ctx = null;

  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        return null;
      }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, slide) {
    var ac = ensure();
    if (!ac) return;
    var t0 = ac.currentTime;
    var osc = ac.createOscillator();
    var gain = ac.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.linearRampToValueAtTime(slide, t0 + dur);
    gain.gain.setValueAtTime(vol || 0.08, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol) {
    var ac = ensure();
    if (!ac) return;
    var bufferSize = ac.sampleRate * dur;
    var buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    var src = ac.createBufferSource();
    src.buffer = buffer;
    var gain = ac.createGain();
    gain.gain.setValueAtTime(vol || 0.06, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    src.connect(gain);
    gain.connect(ac.destination);
    src.start();
  }

  NS.Audio = {
    unlock: function() { ensure(); },
    place: function() { tone(320, 0.08, 'triangle', 0.07, 480); },
    shovel: function() { tone(180, 0.1, 'sawtooth', 0.06, 120); },
    shoot: function() { tone(520, 0.04, 'square', 0.04, 380); },
    hit: function() { tone(140, 0.06, 'sawtooth', 0.05); },
    kill: function() { tone(220, 0.12, 'triangle', 0.07, 80); noise(0.05, 0.04); },
    steam: function() { tone(640, 0.06, 'sine', 0.03, 880); },
    ore: function() { tone(520, 0.08, 'triangle', 0.06, 720); tone(680, 0.1, 'sine', 0.04, 0); },
    damage: function() { tone(90, 0.25, 'sawtooth', 0.1, 50); noise(0.15, 0.08); },
    blast: function() { noise(0.2, 0.12); tone(80, 0.3, 'sawtooth', 0.08, 40); },
    win: function() {
      tone(440, 0.15, 'triangle', 0.08);
      setTimeout(function() { tone(554, 0.15, 'triangle', 0.08); }, 120);
      setTimeout(function() { tone(659, 0.25, 'triangle', 0.09); }, 240);
    },
    lose: function() {
      tone(200, 0.3, 'sawtooth', 0.08, 80);
      setTimeout(function() { tone(120, 0.4, 'sawtooth', 0.07, 60); }, 200);
    },
    ui: function() { tone(400, 0.05, 'sine', 0.04, 500); },
    wave: function() {
      tone(280, 0.12, 'square', 0.07, 420);
      setTimeout(function() { tone(350, 0.18, 'triangle', 0.08, 520); }, 100);
    },
    hugeWave: function() {
      tone(180, 0.2, 'sawtooth', 0.09, 120);
      setTimeout(function() { tone(260, 0.25, 'square', 0.1, 340); }, 150);
      setTimeout(function() { tone(340, 0.3, 'triangle', 0.09, 480); }, 300);
    }
  };
})(window.ForgeLine = window.ForgeLine || {});
