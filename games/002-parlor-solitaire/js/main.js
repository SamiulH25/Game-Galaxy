/**
 * Parlor Klondike — input, screens, bridge, game loop.
 */
(function() {
  var NS = window.ParlorSolitaire;
  var C = NS;

  var board = document.getElementById('board');
  var overlay = document.getElementById('overlay');
  var overlayBody = document.getElementById('overlay-body');
  var toolbar = document.getElementById('toolbar');
  var hintToast = document.getElementById('hint-toast');

  var hudScore = document.getElementById('hud-score');
  var hudMoves = document.getElementById('hud-moves');
  var hudTime = document.getElementById('hud-time');
  var hudMode = document.getElementById('hud-mode');

  var btnUndo = document.getElementById('btn-undo');
  var btnHint = document.getElementById('btn-hint');
  var btnAuto = document.getElementById('btn-auto');
  var btnNew = document.getElementById('btn-new');
  var btnPause = document.getElementById('btn-pause');

  var engine = new NS.GameEngine();
  var renderer = new NS.Renderer(board);
  var audio = NS.Audio;

  var lastTime = 0;
  var hintTimer = null;
  var lastTap = { zone: '', index: -1, time: 0 };
  var saveData = {
    wins: { classic: 0, classic3: 0, vegas: 0, daily: 0 },
    bestScore: {},
    bestTime: {},
    daily: { key: '', streak: 0, completed: false },
    totalGames: 0
  };

  function refresh() {
    renderer.markDirty();
    updateHud();
  }

  function setOverlay(html) {
    overlayBody.innerHTML = html;
    overlay.classList.remove('hidden');
    board.classList.add('hidden');
    toolbar.classList.add('hidden');
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
    board.classList.remove('hidden');
    toolbar.classList.remove('hidden');
    refresh();
  }

  function updateHud() {
    hudScore.textContent = String(engine.score);
    hudMoves.textContent = String(engine.moves);
    hudTime.textContent = C.formatTime(engine.elapsed);
    hudMode.textContent = engine.mode ? engine.mode.label : '—';
    btnUndo.disabled = !engine.canUndo();
  }

  function persistSave() {
    if (!window.gameBridge) return;
    window.gameBridge.save(saveData);
  }

  function loadSave() {
    if (!window.gameBridge) return Promise.resolve();
    return window.gameBridge.load().then(function(data) {
      if (!data) return;
      if (data.wins) saveData.wins = data.wins;
      if (data.bestScore) saveData.bestScore = data.bestScore;
      if (data.bestTime) saveData.bestTime = data.bestTime;
      if (data.daily) saveData.daily = data.daily;
      if (data.totalGames != null) saveData.totalGames = data.totalGames;
    });
  }

  function totalWins() {
    var n = 0;
    for (var k in saveData.wins) n += saveData.wins[k] || 0;
    return n;
  }

  function showMainMenu() {
    engine.state = 'menu';
    setOverlay(
      '<p class="lede">Klondike on proper green baize. Build foundations ace through king, tableau down in alternating color.</p>' +
      '<p class="stat-line">Wins: <span class="accent">' + totalWins() + '</span>' +
      (saveData.daily.streak ? ' · Daily streak: <span class="accent">' + saveData.daily.streak + '</span>' : '') + '</p>' +
      '<button type="button" class="overlay-btn" id="btn-classic">Classic · draw one</button>' +
      '<button type="button" class="overlay-btn" id="btn-classic3">Classic · draw three</button>' +
      '<button type="button" class="overlay-btn" id="btn-vegas">Vegas table</button>' +
      '<button type="button" class="overlay-btn accent" id="btn-daily">Today\'s deal</button>' +
      '<button type="button" class="overlay-btn secondary" id="btn-how">Rules</button>' +
      '<p class="hint">Tap a card, then tap where it goes. Double-tap to auto-play.</p>'
    );
    document.getElementById('btn-classic').addEventListener('click', function() { startGame('classic'); });
    document.getElementById('btn-classic3').addEventListener('click', function() { startGame('classic3'); });
    document.getElementById('btn-vegas').addEventListener('click', function() { startGame('vegas'); });
    document.getElementById('btn-daily').addEventListener('click', function() { startGame('daily'); });
    document.getElementById('btn-how').addEventListener('click', showHowToPlay);
  }

  function showHowToPlay() {
    audio.ui();
    setOverlay(
      '<p class="lede"><strong>Foundations</strong> — same suit, ace to king.</p>' +
      '<p class="lede"><strong>Tableau</strong> — descending rank, alternating red and black. Only kings on empty columns.</p>' +
      '<p class="lede"><strong>Stock</strong> — tap to draw. When empty, tap again to recycle the waste (three times max in Vegas).</p>' +
      '<p class="lede"><strong>Tools</strong> — Undo, hints (−15 points), collect sends safe cards home.</p>' +
      '<button type="button" class="overlay-btn" id="btn-back">Back</button>'
    );
    document.getElementById('btn-back').addEventListener('click', function() {
      audio.ui();
      showMainMenu();
    });
  }

  function startGame(modeId) {
    audio.unlock();
    audio.ui();
    var seed = modeId === 'daily' ? C.dailySeed() : undefined;
    engine.newGame(modeId, seed);
    saveData.totalGames++;
    engine._hintFlash = null;
    hideOverlay();
    refresh();
  }

  function onWin() {
    audio.win();
    var modeId = engine.mode.id;
    saveData.wins[modeId] = (saveData.wins[modeId] || 0) + 1;

    var prevBest = saveData.bestScore[modeId] || 0;
    if (engine.score > prevBest) saveData.bestScore[modeId] = engine.score;
    var prevTime = saveData.bestTime[modeId];
    if (!prevTime || engine.elapsed < prevTime) saveData.bestTime[modeId] = engine.elapsed;

    if (modeId === 'daily') {
      var key = C.dailyKey();
      if (saveData.daily.key !== key) {
        var yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        var yKey = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');
        saveData.daily.streak = saveData.daily.key === yKey ? (saveData.daily.streak || 0) + 1 : 1;
        saveData.daily.key = key;
        saveData.daily.completed = true;
      }
    }

    persistSave();

    if (window.gameBridge) {
      window.gameBridge.submitScore({ score: engine.score, mode: modeId, time: engine.elapsed, moves: engine.moves });
      window.gameBridge.unlockAchievement('first_win');
      if (modeId === 'daily') window.gameBridge.unlockAchievement('daily_deal');
      if (modeId === 'vegas' && engine.score > 0) window.gameBridge.unlockAchievement('vegas_win');
      if (engine.noUndoWin) window.gameBridge.unlockAchievement('no_undo_win');
      if (engine.elapsed < 240) window.gameBridge.unlockAchievement('fast_win');
    }

    setOverlay(
      '<p class="lede win">Table cleared.</p>' +
      '<p class="stat-line">Score <span class="accent">' + engine.score + '</span> · ' +
      C.formatTime(engine.elapsed) + ' · ' + engine.moves + ' moves</p>' +
      '<button type="button" class="overlay-btn" id="btn-again">Play again</button>' +
      '<button type="button" class="overlay-btn secondary" id="btn-menu">Main menu</button>'
    );
    document.getElementById('btn-again').addEventListener('click', function() {
      audio.ui();
      startGame(modeId);
    });
    document.getElementById('btn-menu').addEventListener('click', function() {
      audio.ui();
      showMainMenu();
    });
  }

  function showHintToast(text) {
    hintToast.textContent = text;
    hintToast.classList.remove('hidden');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(function() {
      hintToast.classList.add('hidden');
      engine._hintFlash = null;
      renderer.markDirty();
    }, 2200);
  }

  function doHint() {
    if (engine.state !== 'playing') return;
    var hint = engine.applyHint();
    if (!hint) {
      showHintToast('No move found — try the stock.');
      audio.lose();
      return;
    }
    audio.hint();
    engine._hintFlash = hint;
    showHintToast(hint.text);
    refresh();
  }

  function doUndo() {
    if (!engine.canUndo()) return;
    if (engine.undo()) {
      audio.undo();
      refresh();
    }
  }

  function doAuto() {
    if (engine.state !== 'playing') return;
    var n = engine.autoCollect();
    if (n > 0) audio.foundation();
    else audio.ui();
    refresh();
    if (engine.state === 'won') onWin();
  }

  function handleCardTap(zone, index) {
    if (engine.state !== 'playing') return;
    var destFoundation = zone.indexOf('foundation-') === 0;
    var result = engine.select(zone, index);
    if (!result) return;

    if (result.action === 'stock') audio.flip();
    else if (result.action === 'move') {
      audio.place();
      if (destFoundation) audio.foundation();
    } else if (result.action === 'select') audio.ui();

    refresh();
    if (engine.state === 'won') onWin();
  }

  function bindBoardEvents() {
    board.addEventListener('click', function(e) {
      audio.unlock();
      var card = e.target.closest('.card');
      var pile = e.target.closest('.pile');
      if (!pile) return;

      var zone = pile.dataset.zone;
      if (card) {
        var index = parseInt(card.dataset.index, 10);
        var now = Date.now();
        if (lastTap.zone === zone && lastTap.index === index && now - lastTap.time < 400) {
          if (engine.doubleTap(zone, index)) {
            audio.place();
            refresh();
            if (engine.state === 'won') onWin();
          }
          lastTap.time = 0;
          return;
        }
        lastTap = { zone: zone, index: index, time: now };
        handleCardTap(zone, index);
        return;
      }

      if (zone === 'stock') {
        handleCardTap(zone, null);
        return;
      }

      if (zone.indexOf('tableau-') === 0 || zone.indexOf('foundation-') === 0) {
        handleCardTap(zone, null);
      }
    });
  }

  function loop(time) {
    requestAnimationFrame(loop);
    var dt = Math.min(0.05, (time - lastTime) / 1000);
    lastTime = time;

    if (engine.state === 'playing') {
      engine.tick(dt);
      if (Math.floor(engine.elapsed) !== Math.floor(engine.elapsed - dt)) updateHud();
    }
    renderer.render(engine);
  }

  btnUndo.addEventListener('click', function() { audio.unlock(); doUndo(); });
  btnHint.addEventListener('click', function() { audio.unlock(); doHint(); });
  btnAuto.addEventListener('click', function() { audio.unlock(); doAuto(); });
  btnNew.addEventListener('click', function() {
    audio.unlock();
    audio.ui();
    if (engine.mode && engine.mode.daily) startGame('daily');
    else if (engine.mode) startGame(engine.mode.id);
    else showMainMenu();
  });
  btnPause.addEventListener('click', function() {
    if (engine.state !== 'playing') return;
    audio.ui();
    engine.state = 'paused';
    engine.timerOn = false;
    setOverlay(
      '<p class="lede">Cards down. Take a moment.</p>' +
      '<button type="button" class="overlay-btn" id="btn-resume">Resume</button>' +
      '<button type="button" class="overlay-btn secondary" id="btn-quit">Main menu</button>'
    );
    document.getElementById('btn-resume').addEventListener('click', function() {
      audio.ui();
      engine.state = 'playing';
      engine.timerOn = true;
      hideOverlay();
    });
    document.getElementById('btn-quit').addEventListener('click', function() {
      audio.ui();
      showMainMenu();
    });
  });

  document.addEventListener('keydown', function(e) {
    if (engine.state !== 'playing' && engine.state !== 'paused') return;
    if (e.code === 'KeyU') { e.preventDefault(); doUndo(); }
    if (e.code === 'KeyH') { e.preventDefault(); doHint(); }
    if (e.code === 'KeyN') { e.preventDefault(); btnNew.click(); }
    if (e.code === 'Escape' && engine.state === 'paused') {
      var resume = document.getElementById('btn-resume');
      if (resume) resume.click();
    }
  });

  bindBoardEvents();
  loadSave().then(function() {
    showMainMenu();
    requestAnimationFrame(loop);
  });
})();
