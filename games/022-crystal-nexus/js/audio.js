/**
 * Crystal Nexus — Audio Engine
 * Web Audio API synthesized sounds — no external audio files
 */
window.CrystalNexus = window.CrystalNexus || {};

(function(NS) {

var ctx = null;
var masterGain = null;
var musicGain = null;
var sfxGain = null;
var initialized = false;
var sfxVolume = 0.5;
var musicVolume = 0.3;

/* ─── Initialize Audio Context ─── */
function init() {
  if (initialized) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(ctx.destination);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = sfxVolume;
    sfxGain.connect(masterGain);

    musicGain = ctx.createGain();
    musicGain.gain.value = musicVolume;
    musicGain.connect(masterGain);

    initialized = true;
  } catch(e) {
    console.warn('Audio not available:', e);
  }
}

function ensureResumed() {
  if (ctx && ctx.state === 'suspended') {
    ctx.resume();
  }
}

/* ─── Sound synth helpers ─── */
function playTone(freq, duration, type, volume, ramp) {
  if (!ctx) return;
  ensureResumed();
  var osc = ctx.createOscillator();
  var gain = ctx.createGain();
  osc.type = type || 'square';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume || 0.3, ctx.currentTime);
  if (ramp !== false) {
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  }
  osc.connect(gain);
  gain.connect(sfxGain);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function playNoise(duration, volume, ramp) {
  if (!ctx) return;
  ensureResumed();
  var bufferSize = ctx.sampleRate * duration;
  var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  var data = buffer.getChannelData(0);
  for (var i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  var source = ctx.createBufferSource();
  source.buffer = buffer;
  var gain = ctx.createGain();
  gain.gain.setValueAtTime(volume || 0.2, ctx.currentTime);
  if (ramp !== false) {
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  }
  var filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 2000;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain);
  source.start();
}

/* ─── Sound Effects ─── */
NS.Audio = {};

NS.Audio.init = function() {
  init();
};

NS.Audio.setSfxVolume = function(v) {
  sfxVolume = v;
  if (sfxGain) sfxGain.gain.value = v;
};

NS.Audio.setMusicVolume = function(v) {
  musicVolume = v;
  if (musicGain) musicGain.gain.value = v;
};

NS.Audio.move = function() {
  playTone(200, 0.05, 'square', 0.15);
};

NS.Audio.rotate = function() {
  playTone(350, 0.08, 'square', 0.2);
};

NS.Audio.softDrop = function() {
  playTone(150, 0.06, 'sine', 0.1);
};

NS.Audio.hardDrop = function() {
  playNoise(0.08, 0.25);
  playTone(100, 0.12, 'triangle', 0.2);
};

NS.Audio.lock = function() {
  playTone(180, 0.1, 'triangle', 0.15);
};

NS.Audio.lineClear = function(lines) {
  if (lines === 4) {
    // Tetris — ascending arpeggio
    playTone(523, 0.15, 'square', 0.3);
    setTimeout(function() { playTone(659, 0.15, 'square', 0.3); }, 80);
    setTimeout(function() { playTone(784, 0.2, 'square', 0.3); }, 160);
    setTimeout(function() { playTone(1047, 0.3, 'sine', 0.25); }, 240);
  } else if (lines >= 2) {
    playTone(440, 0.12, 'square', 0.25);
    setTimeout(function() { playTone(660, 0.18, 'square', 0.25); }, 100);
  } else {
    playTone(440, 0.15, 'square', 0.2);
  }
};

NS.Audio.elementChain = function(length) {
  var baseFreq = 600;
  for (var i = 0; i < Math.min(length, 6); i++) {
    setTimeout(function(f) {
      playTone(f, 0.15, 'triangle', 0.2);
    }, i * 60, baseFreq + i * 80);
  }
};

NS.Audio.riftTrigger = function() {
  playNoise(0.3, 0.4);
  playTone(200, 0.4, 'sawtooth', 0.15);
  setTimeout(function() {
    playTone(400, 0.2, 'sine', 0.2);
  }, 150);
};

NS.Audio.prismActivate = function() {
  var notes = [500, 600, 700, 800, 1000, 1200];
  for (var i = 0; i < notes.length; i++) {
    setTimeout(function(f) {
      playTone(f, 0.08, 'sine', 0.25);
    }, i * 50, notes[i]);
  }
};

NS.Audio.prismDeactivate = function() {
  var notes = [1200, 1000, 800, 600, 400];
  for (var i = 0; i < notes.length; i++) {
    setTimeout(function(f) {
      playTone(f, 0.1, 'sine', 0.2);
    }, i * 80, notes[i]);
  }
};

NS.Audio.levelUp = function() {
  playTone(400, 0.1, 'square', 0.3);
  setTimeout(function() { playTone(500, 0.1, 'square', 0.3); }, 100);
  setTimeout(function() { playTone(600, 0.1, 'square', 0.3); }, 200);
  setTimeout(function() { playTone(800, 0.2, 'square', 0.35); }, 300);
};

NS.Audio.gameOver = function() {
  var notes = [500, 450, 400, 350, 300, 200, 150];
  for (var i = 0; i < notes.length; i++) {
    setTimeout(function(f) {
      playTone(f, 0.2, 'sawtooth', 0.15);
    }, i * 120, notes[i]);
  }
};

NS.Audio.hold = function() {
  playTone(300, 0.06, 'triangle', 0.15);
};

NS.Audio.combo = function(count) {
  var freq = 300 + count * 30;
  playTone(Math.min(freq, 800), 0.1, 'sine', 0.15);
};

NS.Audio.perfectClear = function() {
  playTone(600, 0.15, 'sine', 0.3);
  setTimeout(function() { playTone(800, 0.15, 'sine', 0.3); }, 100);
  setTimeout(function() { playTone(1000, 0.15, 'sine', 0.3); }, 200);
  setTimeout(function() { playTone(1200, 0.3, 'sine', 0.35); }, 300);
  setTimeout(function() { playNoise(0.5, 0.3); }, 300);
};

/* ─── Background Ambient (subtle) ─── */
var ambientNodes = null;

NS.Audio.startAmbient = function() {
  stopAmbient();
  if (!ctx) return;
  ensureResumed();

  // Create a soft pad with two detuned oscillators
  ambientNodes = [];
  var baseFreqs = [110, 146.83]; // A2, D3
  for (var i = 0; i < baseFreqs.length; i++) {
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = baseFreqs[i];
    // Gentle detune for warmth
    osc.detune.value = Math.random() * 6 - 3;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 2);
    osc.connect(gain);
    gain.connect(musicGain);
    osc.start();
    ambientNodes.push({ osc: osc, gain: gain });
  }
};

function stopAmbient() {
  if (ambientNodes) {
    for (var i = 0; i < ambientNodes.length; i++) {
      try {
        ambientNodes[i].gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
        setTimeout(function(n) {
          try { n.osc.stop(); } catch(e) {}
        }, 500, ambientNodes[i]);
      } catch(e) {}
    }
    ambientNodes = null;
  }
}

NS.Audio.stopAmbient = stopAmbient;

})(window.CrystalNexus);
