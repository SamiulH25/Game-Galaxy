/**
 * Last Light — main.js
 * Loop, input (mouse/touch/keys), HUD, overlays, bridge, screen flow.
 */
(function () {
  'use strict';

  var NS = window.LastLight;
  var C = NS.Config;

  var canvas = document.getElementById('game-canvas');
  var overlay = document.getElementById('overlay');
  var overlayBody = document.getElementById('overlay-body');
  var hudScore = document.getElementById('hud-score');
  var hudBest = document.getElementById('hud-best');
  var hudCombo = document.getElementById('hud-combo');
  var lanternBox = document.getElementById('hud-lanterns');
  var stormBanner = document.getElementById('storm-banner');
  var stormText = document.getElementById('storm-text');
  var hintBar = document.getElementById('hint-bar');
  var btnPause = document.getElementById('btn-pause');
  var btnFocus = document.getElementById('btn-focus');

  var engine = new NS.Engine();
  var renderer = new NS.Renderer(canvas);
  var audio = NS.Audio;
  NS.eng = engine; // debug/testing handle

  var keys = {};
  var spaceHeld = false;
  var mouseFocus = false;
  var btnFocusHeld = false;
  var touchDragging = false;
  var lastPX = 0, lastPY = 0;

  var lastTime = 0;
  var lastScoreShown = -1;
  var lastLanterns = -1;
  var lastCombo = -1;
  var hintTimer = null;
  var saveTimer = null;
  var submittedThisNight = false;

  // --- Bridge ---

  function persistSave() {
    if (!window.gameBridge) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveTimer = null;
      window.gameBridge.save(engine.serializeMeta());
    }, 800);
  }

  function loadSave() {
    if (!window.gameBridge) return;
    window.gameBridge.load().then(function (data) {
      engine.applyMeta(data);
      if (engine.state === 'idle') showTitle();
    });
  }

  function unlockAch(id) {
    if (engine.meta.unlocked.indexOf(id) !== -1) return;
    engine.meta.unlocked.push(id);
    if (window.gameBridge) window.gameBridge.unlockAchievement(id);
    audio.achievement();
  }

  function submitScore() {
    if (submittedThisNight) return;
    submittedThisNight = true;
    if (!window.gameBridge || !(engine.score > 0)) return;
    window.gameBridge.submitScore({
      score: engine.score,
      docks: engine.docks,
      wrecks: engine.wrecks,
      bestCombo: engine.bestCombo,
    });
  }

  // --- HUD ---

  function updateHud() {
    if (engine.score !== lastScoreShown) {
      hudScore.textContent = String(Math.round(engine.score));
      lastScoreShown = engine.score;
    }
    var best = Math.max(engine.meta.bestScore, engine.score);
    if (hudBest) hudBest.textContent = 'BEST ' + best;

    if (engine.lanterns !== lastLanterns) {
      var lamps = lanternBox ? lanternBox.children : [];
      for (var i = 0; i < lamps.length; i++) {
        lamps[i].classList.toggle('out', i >= engine.lanterns);
      }
      lastLanterns = engine.lanterns;
    }

    if (engine.combo !== lastCombo) {
      if (hudCombo) {
        if (engine.combo >= 2 && engine.state === 'night') {
          hudCombo.textContent = 'COMBO ×' + engine.combo;
          hudCombo.classList.remove('hidden');
          hudCombo.classList.remove('pop');
          void hudCombo.offsetWidth; // restart pop animation
          hudCombo.classList.add('pop');
        } else {
          hudCombo.classList.add('hidden');
        }
      }
      lastCombo = engine.combo;
    }
  }

  function setOverlay(html) {
    overlayBody.innerHTML = html;
    overlay.classList.remove('hidden');
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
  }

  function updateButtons() {
    var night = engine.state === 'night' && !engine.paused;
    document.body.classList.toggle('playing', night);
  }

  function ledgerHtml() {
    var log = engine.meta.log;
    if (!log.length) return '<p class="ledger-empty">The log is blank — no nights kept yet.</p>';
    var rows = '';
    for (var i = 0; i < log.length; i++) {
      var e = log[i];
      rows += '<div class="ledger-row">' +
        '<span class="led-date">' + e.date + '</span>' +
        '<span class="led-docks">' + e.docks + ' docks</span>' +
        '<span class="led-wrecks">' + e.wrecks + ' wrecks</span>' +
        '<span class="led-combo">×' + e.bestCombo + '</span>' +
        '<span class="led-score">' + e.score + '</span>' +
        '</div>';
    }
    return '<div class="ledger">' +
      '<div class="ledger-head">' +
      '<span>NIGHT</span><span>DOCKS</span><span>WRECKS</span><span>COMBO</span><span>SCORE</span>' +
      '</div>' + rows + '</div>';
  }

  // --- Screens ---

  function showTitle() {
    engine.reset();
    updateHud();
    updateButtons();
    var s = engine.meta.settings;
    setOverlay(
      '<p class="subtitle">THE KEEPER OF SALTMERE REACH</p>' +
      '<h1 class="game-title">LAST LIGHT</h1>' +
      '<p class="lede">Ships drift blind toward the reef. Your beam is the only compass they trust — keep three lanterns burning until dawn.</p>' +
      '<p class="stat-line">Personal best <span class="accent">' + engine.meta.bestScore + '</span></p>' +
      ledgerHtml() +
      '<div class="settings-row">' +
      '<label class="check"><input type="checkbox" id="set-flash"' + (s.reduceFlash ? ' checked' : '') + '> Reduce flashes</label>' +
      '<label class="check"><input type="checkbox" id="set-hint"' + (s.showBeamHint ? ' checked' : '') + '> Beam hints</label>' +
      '</div>' +
      '<div class="overlay-actions">' +
      '<button type="button" class="overlay-btn" id="btn-start">BEGIN THE NIGHT</button>' +
      '<button type="button" class="overlay-btn overlay-btn-ghost" id="btn-how">HOW TO PLAY</button>' +
      '</div>'
    );
    document.getElementById('btn-start').addEventListener('click', startNight);
    document.getElementById('btn-how').addEventListener('click', showHowTo);
    document.getElementById('set-flash').addEventListener('change', function (e) {
      engine.meta.settings.reduceFlash = e.target.checked;
      persistSave();
      audio.click();
    });
    document.getElementById('set-hint').addEventListener('change', function (e) {
      engine.meta.settings.showBeamHint = e.target.checked;
      persistSave();
      audio.click();
    });
  }

  function showHowTo() {
    setOverlay(
      '<h2 class="result-title">HOW TO KEEP THE LIGHT</h2>' +
      '<div class="howto">' +
      '<p><span class="accent">The beam.</span> Move the mouse (or drag) to aim; hold left button, SPACE, or the FOCUS button to focus — a narrow cone that makes obedience last twice as long.</p>' +
      '<p><span class="accent">The rule.</span> A ship inside your beam wakes and turns toward wherever you point. Sweep across it, then rotate ahead and hold the light on the <span class="accent">eastern gap</span> until it commits.</p>' +
      '<p><span class="accent">The rocks.</span> The reef ring has one gap — due east. The Fangs and the island wreck ships too. Three wrecks and the night is over.</p>' +
      '<p><span class="accent">The ships.</span> Cogs (100) come first. Messenger Sloops (180) are fast from minute 2. Ember Barges (400) need 2.5s of light before they wake.</p>' +
      '<p><span class="accent moon">The Ghost Ship.</span> It passes reefs harmlessly and leaves. <span class="accent">Never light it</span> — woken, it drives itself onto your island. Let it pass for +150.</p>' +
      '<p><span class="accent">The storm.</span> Every minute or so the wind shoves the lanes. Watch for lightning: for a blink, every rock and hull is visible.</p>' +
      '</div>' +
      '<div class="overlay-actions">' +
      '<button type="button" class="overlay-btn" id="btn-begin">BEGIN THE NIGHT</button>' +
      '<button type="button" class="overlay-btn overlay-btn-ghost" id="btn-back">BACK</button>' +
      '</div>'
    );
    document.getElementById('btn-begin').addEventListener('click', startNight);
    document.getElementById('btn-back').addEventListener('click', function () { audio.click(); showTitle(); });
  }

  function startNight() {
    engine.startNight();
    submittedThisNight = false;
    lastScoreShown = -1;
    lastLanterns = -1;
    lastCombo = -1;
    audio.resume();
    audio.click();
    hideOverlay();
    updateHud();
    updateButtons();
    if (engine.meta.settings.showBeamHint) {
      hintBar.classList.remove('hidden');
      if (hintTimer) clearTimeout(hintTimer);
      hintTimer = setTimeout(hideHint, 12000);
    }
  }

  function hideHint() {
    hintBar.classList.add('hidden');
    if (hintTimer) { clearTimeout(hintTimer); hintTimer = null; }
  }

  function showDawn(result, newPB) {
    updateButtons();
    var flare = newPB
      ? '<p class="pb-flare">NEW PERSONAL BEST</p>'
      : '<p class="stat-line small">Best remains <span class="accent">' + engine.meta.bestScore + '</span></p>';
    setOverlay(
      '<p class="subtitle">DAWN REPORT</p>' +
      '<h2 class="result-title dawn">THE NIGHT ENDS</h2>' +
      '<div class="dawn-card">' +
      '<p class="dawn-score">' + result.score + '</p>' +
      flare +
      '<p class="stat-line">' + result.docks + ' docks · ' + result.wrecks + ' wrecks · combo ×' + result.bestCombo + ' · ' + result.storms + ' storms ridden out</p>' +
      '</div>' +
      ledgerHtml() +
      '<div class="overlay-actions">' +
      '<button type="button" class="overlay-btn" id="btn-again">KEEP ANOTHER NIGHT</button>' +
      '<button type="button" class="overlay-btn overlay-btn-ghost" id="btn-menu">TITLE</button>' +
      '</div>'
    );
    document.getElementById('btn-again').addEventListener('click', startNight);
    document.getElementById('btn-menu').addEventListener('click', function () { audio.click(); showTitle(); });
  }

  function showPause() {
    setOverlay(
      '<p class="lede">Paused — the sea waits.</p>' +
      '<div class="overlay-actions">' +
      '<button type="button" class="overlay-btn" id="btn-resume">RESUME</button>' +
      '<button type="button" class="overlay-btn overlay-btn-ghost" id="btn-quit">ABANDON NIGHT</button>' +
      '</div>'
    );
    document.getElementById('btn-resume').addEventListener('click', resumeGame);
    document.getElementById('btn-quit').addEventListener('click', function () {
      engine.paused = false;
      audio.click();
      showTitle();
    });
  }

  function pauseGame() {
    if (engine.state !== 'night' || engine.paused) return;
    engine.paused = true;
    engine.setFocus(false);
    updateButtons();
    showPause();
  }

  function resumeGame() {
    engine.paused = false;
    audio.click();
    hideOverlay();
    updateButtons();
  }

  // --- Achievements ---

  function checkDockAchievements() {
    if (engine.lifetimeDocks() >= 1) unlockAch('first_dock');
    if (engine.docks >= 10) unlockAch('ten_docks');
    if (engine.sloopDocks >= 5) unlockAch('sloop_five');
    if (engine.bargeDocks >= 1) unlockAch('barge_in');
    if (engine.combo >= 8) unlockAch('combo_8');
    if (engine.wrecks === 0 && engine.docks >= 15) unlockAch('clean_fifteen');
    if (engine.lifetimeDocks() >= 25) unlockAch('saved_25');
  }

  function finishNight() {
    var newPB = engine.recordNight();
    persistSave();
    submitScore();
    if (engine.score >= C.LEGEND_SCORE) unlockAch('legend_keeper');
    audio.dawn();
    if (newPB) audio.pbFlare();
    hideHint();
    showDawn(engine.result, newPB);
  }

  // --- Events ---

  function handleEvents(events) {
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      switch (ev.type) {
        case 'night_start':
          break;
        case 'wake':
          audio.wakeBlip(ev.data.type);
          break;
        case 'dock':
          audio.dock();
          renderer.spawnFoam(ev.data.x, ev.data.y, 16, '#e8f0f8');
          renderer.spawnRing(ev.data.x, ev.data.y);
          checkDockAchievements();
          if (engine.meta.settings.showBeamHint) hideHint();
          break;
        case 'milestone':
          audio.milestone();
          break;
        case 'wreck':
          audio.wreck();
          audio.lanternOut();
          renderer.spawnFoam(ev.data.x, ev.data.y, 22, '#9fb0c0');
          renderer.spawnRing(ev.data.x, ev.data.y);
          if (!engine.meta.settings.reduceFlash) renderer.shake = 0.4;
          break;
        case 'storm_warn':
          stormText.textContent = 'STORM SURGE INCOMING';
          stormBanner.classList.remove('hidden', 'active');
          stormBanner.classList.add('warn');
          audio.stormWarn();
          break;
        case 'storm_start':
          stormText.textContent = 'STORM SURGE';
          stormBanner.classList.remove('warn');
          stormBanner.classList.add('active');
          break;
        case 'lightning':
          audio.lightning();
          break;
        case 'storm_end':
          stormBanner.classList.add('hidden');
          if (ev.data.clean) unlockAch('storm_eye');
          break;
        case 'ghost_pass_clean':
          unlockAch('ghost_pass');
          break;
        case 'night_end':
          stormBanner.classList.add('hidden');
          finishNight();
          break;
      }
    }
  }

  // --- Input ---

  function focusHeld() {
    return spaceHeld || mouseFocus || btnFocusHeld;
  }

  function syncFocus() {
    engine.setFocus(focusHeld() && engine.state === 'night' && !engine.paused);
  }

  function aimFromPointer(e) {
    var rect = canvas.getBoundingClientRect();
    var mx = e.clientX - rect.left - rect.width / 2;
    var my = e.clientY - rect.top - rect.height / 2;
    if (mx * mx + my * my > 100) engine.setAim(Math.atan2(my, mx));
  }

  function onPointerDown(e) {
    audio.resume();
    if (engine.state !== 'night' || engine.paused) return;
    if (e.pointerType === 'touch') {
      touchDragging = true;
      lastPX = e.clientX;
      lastPY = e.clientY;
    } else if (e.button === 0) {
      mouseFocus = true;
      syncFocus();
    }
  }

  function onPointerMove(e) {
    if (engine.state !== 'night' || engine.paused) return;
    if (e.pointerType === 'touch') {
      if (!touchDragging) return;
      engine.rotateAim((e.clientX - lastPX) * C.TOUCH_AIM_SENS);
      lastPX = e.clientX;
      lastPY = e.clientY;
    } else {
      aimFromPointer(e);
    }
  }

  function onPointerUp(e) {
    if (e.pointerType === 'touch') {
      touchDragging = false;
    } else {
      mouseFocus = false;
    }
    syncFocus();
  }

  function onKeyDown(e) {
    if (e.code === 'Space' || e.code.indexOf('Arrow') === 0) e.preventDefault();
    keys[e.code] = true;
    if (e.repeat) return;
    if (e.code === 'Space') {
      audio.resume();
      spaceHeld = true;
      syncFocus();
    }
    if (e.code === 'KeyP' && engine.state === 'night') {
      if (engine.paused) resumeGame(); else pauseGame();
    }
    if (e.code === 'Enter') {
      audio.resume();
      if (engine.state === 'idle' || engine.state === 'dawn') startNight();
      else if (engine.paused) resumeGame();
    }
  }

  function onKeyUp(e) {
    keys[e.code] = false;
    if (e.code === 'Space') {
      spaceHeld = false;
      syncFocus();
    }
  }

  function bindTouch() {
    btnFocus.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      audio.resume();
      btnFocusHeld = true;
      syncFocus();
    });
    btnFocus.addEventListener('pointerup', function () { btnFocusHeld = false; syncFocus(); });
    btnFocus.addEventListener('pointercancel', function () { btnFocusHeld = false; syncFocus(); });
    btnFocus.addEventListener('pointerleave', function () { btnFocusHeld = false; syncFocus(); });

    btnPause.addEventListener('click', function () {
      audio.click();
      pauseGame();
    });
  }

  // --- Loop ---

  function ghostPresent() {
    for (var i = 0; i < engine.ships.length; i++) {
      if (engine.ships[i].type === 'ghost') return true;
    }
    return false;
  }

  function litCount() {
    var n = 0;
    for (var i = 0; i < engine.ships.length; i++) {
      if (engine.ships[i].lit) n++;
    }
    return n;
  }

  function loop(now) {
    var dt = Math.min(0.05, (now - lastTime) / 1000 || 0);
    lastTime = now;

    if (keys.ArrowLeft) engine.rotateAim(-C.KEY_TURN * dt);
    if (keys.ArrowRight) engine.rotateAim(C.KEY_TURN * dt);

    if (!engine.paused) engine.update(dt);
    handleEvents(engine.takeEvents());
    updateHud();

    var playing = engine.state === 'night' && !engine.paused;
    audio.setShimmer(playing ? Math.min(1, litCount() * 0.5) : 0);
    audio.setAmbientLevel(engine.paused ? 0.4 : (engine.state === 'night' ? 1 : 0.55));
    audio.update(dt, ghostPresent());

    renderer.flags = engine.meta.settings;
    renderer.update(dt);
    renderer.draw(engine);
    requestAnimationFrame(loop);
  }

  // --- Init ---

  function resize() {
    renderer.resize(window.innerWidth, window.innerHeight);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('blur', pauseGame);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pauseGame();
  });
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  resize();
  bindTouch();
  loadSave();
  showTitle();
  requestAnimationFrame(loop);
})();
