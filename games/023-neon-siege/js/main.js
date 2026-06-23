/**
 * Neon Siege — Main loop, input, HUD, and Game Galaxy bridge
 */
(function() {
  var canvas = document.getElementById('game-canvas');
  var overlay = document.getElementById('overlay');
  var overlayBody = document.getElementById('overlay-body');
  var hudScore = document.getElementById('hud-score');
  var hudMult = document.getElementById('hud-mult');
  var hudTime = document.getElementById('hud-time');
  var hudLives = document.getElementById('hud-lives');
  var hudBombs = document.getElementById('hud-bombs');

  var renderer = null;
  var game = null;
  var STATES = null;
  var lastTime = 0;
  var highScore = 0;
  var running = false;

  function ready() {
    return running && renderer && game && STATES;
  }

  function showError(msg) {
    overlayBody.textContent = msg;
    overlay.classList.remove('hidden');
  }

  function init() {
    if (!window.NeonRenderer || !window.NeonGame) {
      showError('Game scripts failed to load. Refresh the page.');
      return;
    }

    STATES = window.NeonGame.STATES;

    try {
      renderer = new window.NeonRenderer(canvas);
      game = new window.NeonGame(renderer);
      running = true;
    } catch (e) {
      console.error(e);
      showError(e.message || 'WebGL2 is required to play Neon Siege.');
      return;
    }

    resize();
    showMenu();
    loadSave();
    requestAnimationFrame(loop);
  }

  function resize() {
    if (!renderer) return;
    var w = window.innerWidth;
    var h = window.innerHeight;
    renderer.resize(w, h);
    if (game) {
      game.mouse.x = game.player.x;
      game.mouse.y = game.player.y;
    }
  }

  function showMenu() {
    if (!game) return;
    game.state = STATES.MENU;
    overlay.classList.remove('hidden');
    overlayBody.innerHTML =
      '<p>Survive the neon grid. Collect Lumens to multiply your score.</p>' +
      '<p class="score-line">HIGH SCORE: ' + highScore.toLocaleString() + '</p>' +
      '<p>Press <strong>Space</strong> or click to start</p>';
  }

  function showGameOver() {
    if (!game) return;
    overlay.classList.remove('hidden');
    if (game.score > highScore) highScore = game.score;
    overlayBody.innerHTML =
      '<p class="score-line">SCORE: ' + game.score.toLocaleString() + '</p>' +
      '<p>Multiplier peaked · Kills: ' + game.stats.kills + '</p>' +
      '<p>Press <strong>Space</strong> to retry</p>';
    submitResults();
  }

  function updateHud() {
    if (!game) return;
    var h = game.getHud();
    hudScore.textContent = h.score.toLocaleString();
    hudMult.textContent = 'x' + h.multiplier;
    hudTime.textContent = h.time;
    hudLives.textContent = '♥'.repeat(Math.max(0, h.lives)) || '—';
    hudBombs.textContent = '●'.repeat(Math.max(0, h.bombs)) || '—';
  }

  function screenToWorld(sx, sy) {
    var rect = canvas.getBoundingClientRect();
    var x = (sx - rect.left) * (renderer.w / rect.width);
    var y = (sy - rect.top) * (renderer.h / rect.height);
    if (game) {
      x += game.camera.x;
      y += game.camera.y;
    }
    return { x: x, y: y };
  }

  function loop(ts) {
    requestAnimationFrame(loop);
    if (!ready()) return;

    var dt = Math.min(0.05, (ts - lastTime) / 1000);
    lastTime = ts;

    if (game.state === STATES.PLAYING) {
      game.update(dt);
      updateHud();
      if (game.state === STATES.GAME_OVER) showGameOver();
    }

    if (game.state === STATES.PLAYING || game.state === STATES.PAUSED || game.state === STATES.GAME_OVER) {
      game.draw();
    } else {
      renderer.time = ts / 1000;
      renderer.flash = 0;
      renderer.clearBatches();
      renderer.render();
    }
  }

  function startGame() {
    if (!ready()) return;
    overlay.classList.add('hidden');
    game.start();
    updateHud();
  }

  function submitResults() {
    if (!window.gameBridge || !game) return;
    window.gameBridge.submitScore({
      score: game.score,
      metadata: { kills: game.stats.kills, time: Math.floor(game.time) }
    }).catch(function() {});
    window.gameBridge.save({
      highScore: highScore,
      lastScore: game.score,
      totalKills: game.stats.kills
    }).catch(function() {});
    var ach = game.achievements;
    if (ach.first_blood) window.gameBridge.unlockAchievement('first_blood').catch(function() {});
    if (ach.multiplier_10) window.gameBridge.unlockAchievement('multiplier_10').catch(function() {});
    if (ach.bomb_master) window.gameBridge.unlockAchievement('bomb_master').catch(function() {});
    if (ach.survivor) window.gameBridge.unlockAchievement('survivor').catch(function() {});
    if (ach.centurion) window.gameBridge.unlockAchievement('centurion').catch(function() {});
  }

  function loadSave() {
    if (!window.gameBridge) return;
    window.gameBridge.load().then(function(data) {
      if (data && data.highScore) highScore = data.highScore;
      if (ready() && game.state === STATES.MENU) showMenu();
    }).catch(function() {});
  }

  window.addEventListener('keydown', function(e) {
    if (!ready()) return;
    game.keys[e.key] = true;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (game.state === STATES.MENU || game.state === STATES.GAME_OVER) startGame();
    }
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (game.state === STATES.PLAYING) {
        game.state = STATES.PAUSED;
        overlay.classList.remove('hidden');
        overlayBody.innerHTML = '<p>PAUSED</p><p>Press P or Esc to resume</p>';
      } else if (game.state === STATES.PAUSED) {
        game.state = STATES.PLAYING;
        overlay.classList.add('hidden');
      }
    }
    if (e.key === 'e' || e.key === 'E') {
      game._novaBomb();
    }
  });

  window.addEventListener('keyup', function(e) {
    if (!ready()) return;
    game.keys[e.key] = false;
  });

  canvas.addEventListener('mousemove', function(e) {
    if (!ready()) return;
    var w = screenToWorld(e.clientX, e.clientY);
    game.mouse.x = w.x;
    game.mouse.y = w.y;
  });

  canvas.addEventListener('mousedown', function(e) {
    if (!ready()) return;
    if (e.button === 0) {
      game.mouse.down = true;
      if (game.state === STATES.MENU || game.state === STATES.GAME_OVER) startGame();
    }
    if (e.button === 2) {
      e.preventDefault();
      game._novaBomb();
    }
  });

  window.addEventListener('mouseup', function(e) {
    if (!ready()) return;
    if (e.button === 0) game.mouse.down = false;
  });

  canvas.addEventListener('contextmenu', function(e) { e.preventDefault(); });

  var touchId = null;
  canvas.addEventListener('touchstart', function(e) {
    if (!ready()) return;
    e.preventDefault();
    if (game.state === STATES.MENU || game.state === STATES.GAME_OVER) { startGame(); return; }
    var t = e.touches[0];
    touchId = t.identifier;
    var w = screenToWorld(t.clientX, t.clientY);
    game.mouse.x = w.x; game.mouse.y = w.y;
    game.mouse.down = true;
  }, { passive: false });

  canvas.addEventListener('touchmove', function(e) {
    if (!ready()) return;
    e.preventDefault();
    for (var i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === touchId) {
        var w = screenToWorld(e.touches[i].clientX, e.touches[i].clientY);
        game.mouse.x = w.x; game.mouse.y = w.y;
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchend', function() {
    if (!ready()) return;
    game.mouse.down = false;
    touchId = null;
  });

  window.addEventListener('resize', resize);

  init();
})();
