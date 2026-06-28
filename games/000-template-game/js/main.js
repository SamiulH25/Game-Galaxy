/**
 * Input, HUD, overlays, save/load bridge, and game loop.
 */
(function() {
  var NS = window.GalaxyTemplate;
  var STATES = NS.GameStates;
  var C = NS.Config;

  var canvas = document.getElementById('game-canvas');
  var overlay = document.getElementById('overlay');
  var overlayBody = document.getElementById('overlay-body');
  var hudScore = document.getElementById('hud-score');
  var hudLives = document.getElementById('hud-lives');
  var hudGoal = document.getElementById('hud-goal');

  var engine = new NS.GameEngine();
  var renderer = new NS.Renderer(canvas);
  var audio = NS.Audio;

  var keys = {};
  var lastTime = 0;
  var highScore = 0;
  var wins = 0;
  var touchDir = 0;
  var touchFire = false;

  function isLeftDown() {
    return keys.ArrowLeft || keys.KeyA;
  }

  function isRightDown() {
    return keys.ArrowRight || keys.KeyD;
  }

  function focusCanvas() {
    if (canvas && typeof canvas.focus === 'function') {
      canvas.focus({ preventScroll: true });
    }
  }

  function livesText(n) {
    var s = '';
    for (var i = 0; i < C.START_LIVES; i++) {
      s += i < n ? '♥' : '♡';
    }
    return s;
  }

  function setOverlay(html) {
    overlayBody.innerHTML = html;
    overlay.classList.remove('hidden');
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
  }

  function updateHud() {
    hudScore.textContent = String(engine.score);
    hudLives.textContent = livesText(engine.lives);
    hudGoal.textContent = String(C.WIN_SCORE);
  }

  function persistSave() {
    if (!window.gameBridge) return;
    window.gameBridge.save({
      highScore: highScore,
      wins: wins
    });
  }

  function loadSave() {
    if (!window.gameBridge) return;
    window.gameBridge.load().then(function(data) {
      if (!data) return;
      highScore = data.highScore || 0;
      wins = data.wins || 0;
    });
  }

  function showMenu() {
    engine.reset();
    updateHud();
    setOverlay(
      '<p class="lede">Collect green orbs and blast red debris. Reach <strong>' + C.WIN_SCORE + '</strong> points to win.</p>' +
      '<p class="stat-line">High score: <span class="accent">' + highScore + '</span> · Wins: <span class="accent">' + wins + '</span></p>' +
      '<button type="button" class="overlay-btn" id="btn-start">LAUNCH</button>' +
      '<p class="hint">← → move · Space or W fire · Enter start · P pause</p>'
    );
    document.getElementById('btn-start').addEventListener('click', startGame);
  }

  function showPause() {
    setOverlay(
      '<p class="lede">Mission paused</p>' +
      '<button type="button" class="overlay-btn" id="btn-resume">RESUME</button>' +
      '<p class="hint">P or Escape to resume</p>'
    );
    document.getElementById('btn-resume').addEventListener('click', resumeGame);
  }

  function showWin() {
    if (engine.score > highScore) highScore = engine.score;
    wins += 1;
    persistSave();
    audio.win();
    if (window.gameBridge) {
      window.gameBridge.unlockAchievement('template_win');
      window.gameBridge.submitScore({ score: engine.score, wins: wins, won: true });
    }
    setOverlay(
      '<p class="lede win">Salvage complete!</p>' +
      '<p class="stat-line">Score <span class="accent">' + engine.score + '</span></p>' +
      '<button type="button" class="overlay-btn" id="btn-retry">PLAY AGAIN</button>'
    );
    document.getElementById('btn-retry').addEventListener('click', startGame);
  }

  function showGameOver() {
    if (engine.score > highScore) highScore = engine.score;
    persistSave();
    setOverlay(
      '<p class="lede lose">Hull breached</p>' +
      '<p class="stat-line">Score <span class="accent">' + engine.score + '</span> · Best <span class="accent">' + highScore + '</span></p>' +
      '<button type="button" class="overlay-btn" id="btn-retry">RETRY</button>' +
      '<button type="button" class="overlay-btn overlay-btn-ghost" id="btn-menu">MENU</button>'
    );
    document.getElementById('btn-retry').addEventListener('click', startGame);
    document.getElementById('btn-menu').addEventListener('click', showMenu);
  }

  function startGame() {
    audio.resume();
    audio.start();
    engine.setSize(window.innerWidth, window.innerHeight);
    engine.start();
    prevScore = 0;
    prevOrbCount = 0;
    prevLives = C.START_LIVES;
    prevState = STATES.PLAYING;
    lastTime = performance.now();
    hideOverlay();
    updateHud();
    focusCanvas();
  }

  function resumeGame() {
    engine.resume();
    hideOverlay();
  }

  function pauseGame() {
    engine.pause();
    showPause();
  }

  function resize() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    renderer.resize(w, h);
    engine.setSize(w, h);
  }

  function onScore() {
    audio.collect();
    updateHud();
  }

  function onDestroy() {
    audio.destroy();
    updateHud();
  }

  function onHit() {
    audio.hit();
    updateHud();
  }

  function tryFire() {
    if (engine.tryShoot()) {
      audio.shoot();
    }
  }

  var prevScore = 0;
  var prevOrbCount = 0;
  var prevLives = C.START_LIVES;
  var prevState = STATES.MENU;

  function loop(now) {
    var dt = Math.min(0.05, (now - lastTime) / 1000 || 0);
    lastTime = now;

    if (engine.state === STATES.PLAYING) {
      var left = isLeftDown();
      var right = isRightDown();
      if (left && !right) engine.movePlayer(-1, dt);
      else if (right && !left) engine.movePlayer(1, dt);
      else if (touchDir) engine.movePlayer(touchDir, dt);
      if (keys.Space || keys.KeyW || touchFire) tryFire();
    }

    engine.update(dt);

    if (engine.score !== prevScore) {
      if (engine.score > prevScore) {
        if (engine.orbs.length < prevOrbCount) onScore();
        else onDestroy();
      }
      prevScore = engine.score;
    }
    prevOrbCount = engine.orbs.length;
    if (engine.lives !== prevLives) {
      if (engine.lives < prevLives) onHit();
      prevLives = engine.lives;
    }
    if (engine.state !== prevState) {
      if (engine.state === STATES.WIN) showWin();
      else if (engine.state === STATES.GAME_OVER) showGameOver();
      prevState = engine.state;
    }

    renderer.draw(engine);
    requestAnimationFrame(loop);
  }

  function onKeyDown(e) {
    var code = e.code;
    if (code === 'ArrowLeft' || code === 'ArrowRight' || code === 'Space' || code === 'Escape') {
      e.preventDefault();
    }
    keys[code] = true;

    if (engine.state === STATES.MENU && (code === 'Space' || code === 'Enter')) {
      startGame();
      return;
    }
    if (engine.state === STATES.PAUSED && (code === 'Enter' || code === 'Escape' || code === 'KeyP')) {
      resumeGame();
      return;
    }
    if (engine.state === STATES.PLAYING) {
      if (code === 'KeyP' || code === 'Escape') {
        pauseGame();
        return;
      }
      if (code === 'Space' || code === 'KeyW') {
        tryFire();
      }
    }
  }

  function onKeyUp(e) {
    keys[e.code] = false;
  }

  function bindTouch() {
    var buttons = document.querySelectorAll('.touch-btn');
    for (var i = 0; i < buttons.length; i++) {
      (function(btn) {
        var action = btn.getAttribute('data-action');
        var dir = btn.getAttribute('data-dir');
        if (action === 'fire') {
          function fireDown(e) {
            e.preventDefault();
            touchFire = true;
            audio.resume();
            tryFire();
          }
          function fireUp() {
            touchFire = false;
          }
          btn.addEventListener('touchstart', fireDown, { passive: false });
          btn.addEventListener('touchend', fireUp);
          btn.addEventListener('mousedown', fireDown);
          btn.addEventListener('mouseup', fireUp);
          btn.addEventListener('mouseleave', fireUp);
          return;
        }
        if (dir == null) return;
        var moveDir = parseInt(dir, 10);
        function down(e) {
          e.preventDefault();
          touchDir = moveDir;
          audio.resume();
        }
        function up() {
          if (touchDir === moveDir) touchDir = 0;
        }
        btn.addEventListener('touchstart', down, { passive: false });
        btn.addEventListener('touchend', up);
        btn.addEventListener('mousedown', down);
        btn.addEventListener('mouseup', up);
        btn.addEventListener('mouseleave', up);
      })(buttons[i]);
    }

    canvas.addEventListener('pointerdown', function(e) {
      focusCanvas();
      if (engine.state === STATES.PLAYING && e.button === 0) {
        tryFire();
      }
    });

    canvas.addEventListener('touchmove', function(e) {
      if (engine.state !== STATES.PLAYING) return;
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      var x = (e.touches[0].clientX - rect.left) / rect.width;
      engine.setPlayerX(x);
    }, { passive: false });
  }

  window.addEventListener('resize', resize);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  resize();
  bindTouch();
  loadSave();
  showMenu();
  prevState = engine.state;
  requestAnimationFrame(loop);
})();
