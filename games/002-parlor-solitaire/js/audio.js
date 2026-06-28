/**
 * Parlor Klondike — procedural Web Audio.
 */
(function(NS) {
  var ctx = null;

  function ensure() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, freqEnd) {
    var ac = ensure();
    if (!ac) return;
    var t0 = ac.currentTime;
    var osc = ac.createOscillator();
    var gain = ac.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd) osc.frequency.linearRampToValueAtTime(freqEnd, t0 + dur);
    gain.gain.setValueAtTime(vol || 0.04, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  NS.Audio = {
    unlock: function() { ensure(); },
    ui: function() { tone(520, 0.05, 'sine', 0.03, 680); },
    flip: function() { tone(280, 0.06, 'triangle', 0.035, 220); },
    place: function() { tone(440, 0.07, 'sine', 0.04, 520); },
    foundation: function() { tone(660, 0.1, 'sine', 0.045, 880); },
    hint: function() { tone(380, 0.08, 'sine', 0.03, 500); },
    undo: function() { tone(220, 0.08, 'triangle', 0.03, 180); },
    win: function() {
      tone(523, 0.12, 'sine', 0.05);
      setTimeout(function() { tone(659, 0.12, 'sine', 0.05); }, 100);
      setTimeout(function() { tone(784, 0.2, 'sine', 0.06); }, 200);
    },
    lose: function() { tone(180, 0.25, 'sawtooth', 0.03, 120); }
  };
})(window.ParlorSolitaire = window.ParlorSolitaire || {});
