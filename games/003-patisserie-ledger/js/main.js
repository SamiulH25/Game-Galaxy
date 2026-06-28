/**
 * Boot, save bridge, overlays, Phaser host, screen flow.
 */
(function() {
  var NS = window.PatisserieLedger;
  var C = NS.Config;
  var STATES = NS.GameStates;

  var overlay = document.getElementById('overlay');
  var overlayBody = document.getElementById('overlay-body');
  var hudTop = document.getElementById('hud-top');
  var toolbar = document.getElementById('toolbar');
  var hudMoves = document.getElementById('hud-moves');
  var hudTimer = document.getElementById('hud-timer');
  var hudObjectives = document.getElementById('hud-objectives');

  var phaserGame = null;
  var state = STATES.MENU;
  var activeLevelId = null;
  var equippedBoosters = [];

  var defaultSave = function() {
    return {
      levelStars: {},
      totalStars: 0,
      highestChapter: 1,
      pantry: null,
      boosters: null,
      craftedIds: [],
      tutorialDone: false
    };
  };

  NS.App = {
    save: defaultSave(),
    crafting: NS.Crafting.fromData(null),
    state: STATES.MENU,

    onBootComplete: function() {},

    persist: function() {
      if (!window.gameBridge) return;
      var data = {
        levelStars: NS.App.save.levelStars,
        totalStars: NS.App.save.totalStars,
        highestChapter: NS.App.save.highestChapter,
        crafting: NS.App.crafting.serialize(),
        craftedIds: NS.App.save.craftedIds || [],
        tutorialDone: NS.App.save.tutorialDone || false
      };
      window.gameBridge.save(data);
    },

    load: function(cb) {
      if (!window.gameBridge) {
        NS.App.crafting = NS.Crafting.fromData(null);
        if (cb) cb();
        return;
      }
      window.gameBridge.load().then(function(data) {
        if (data) {
          NS.App.save.levelStars = data.levelStars || {};
          NS.App.save.totalStars = data.totalStars || 0;
          NS.App.save.highestChapter = data.highestChapter || 1;
          NS.App.save.craftedIds = data.craftedIds || [];
          NS.App.crafting = NS.Crafting.fromData(data.crafting);
          NS.App.save.tutorialDone = !!data.tutorialDone;
        }
        if (cb) cb();
      });
    },

    startLevel: function(levelId, skipBriefing) {
      if (!skipBriefing) {
        NS.App.showLevelBriefing(levelId);
        return;
      }
      NS.Audio.resume();
      NS.Audio.ui();
      activeLevelId = levelId;
      equippedBoosters = [];
      hideOverlay();
      hudTop.classList.add('hidden');
      toolbar.classList.add('hidden');
      state = STATES.PLAYING;
      phaserGame.scene.start('GameScene', { levelId: levelId, boosters: equippedBoosters });
    },

    showLevelBriefing: function(levelId) {
      var levelDef = NS.getLevel(levelId);
      setOverlay(NS.Guide.levelBriefingHtml(levelDef));
      document.getElementById('btn-begin-shift').addEventListener('click', function() {
        hideOverlay();
        NS.App.startLevel(levelId, true);
      });
      document.getElementById('btn-brief-back').addEventListener('click', function() {
        hideOverlay();
        NS.App.goToMap();
      });
    },

    showHowToPlay: function(onClose) {
      setOverlay(NS.Guide.howToPlayHtml());
      document.getElementById('btn-guide-close').addEventListener('click', function() {
        hideOverlay();
        if (onClose) onClose();
      });
    },

    showTutorial: function(stepIndex) {
      var idx = stepIndex || 0;
      setOverlay(NS.Guide.tutorialStepHtml(idx));
      var next = document.getElementById('btn-tutorial-next');
      var skip = document.getElementById('btn-tutorial-skip');
      var done = document.getElementById('btn-tutorial-done');
      if (next) {
        next.addEventListener('click', function() {
          NS.App.showTutorial(idx + 1);
        });
      }
      if (skip) {
        skip.addEventListener('click', function() {
          NS.App.save.tutorialDone = true;
          NS.App.persist();
          hideOverlay();
          NS.App.goToMap();
        });
      }
      if (done) {
        done.addEventListener('click', function() {
          NS.App.save.tutorialDone = true;
          NS.App.persist();
          hideOverlay();
          NS.App.goToMap();
        });
      }
    },

    goToMap: function() {
      state = STATES.MAP;
      hudTop.classList.add('hidden');
      toolbar.classList.add('hidden');
      var mapScene = phaserGame.scene.getScene('MapScene');
      if (mapScene && mapScene.cameras) {
        mapScene.cameras.main.fadeOut(200, 0, 0, 0);
      }
      phaserGame.scene.start('MapScene');
    },

    triggerPause: function() {
      if (state !== STATES.PLAYING) return;
      setOverlay(
        '<p class="lede">Paused</p>' +
        '<button type="button" class="overlay-btn" id="btn-resume">Resume</button>' +
        '<button type="button" class="overlay-btn overlay-btn-ghost" id="btn-howto-pause">How to play</button>' +
        '<button type="button" class="overlay-btn overlay-btn-ghost" id="btn-quit-pause">Map</button>'
      );
      document.getElementById('btn-resume').addEventListener('click', hideOverlay);
      document.getElementById('btn-howto-pause').addEventListener('click', function() {
        NS.App.showHowToPlay();
      });
      document.getElementById('btn-quit-pause').addEventListener('click', function() {
        hideOverlay();
        NS.App.goToMap();
      });
    },

    showBoosterPicker: function() {
      var ids = ['whisk', 'rolling', 'sugar', 'mitt', 'proof'];
      var owned = [];
      for (var i = 0; i < ids.length; i++) {
        if (NS.App.crafting.boosters[ids[i]] > 0) owned.push(ids[i]);
      }
      if (owned.length === 0) {
        setOverlay('<p class="lede">No boosters in stock.</p><p class="hint">Gather ingredients during shifts, then craft at the map Pantry.</p>' +
          '<button type="button" class="overlay-btn" id="btn-booster-ok">OK</button>');
        document.getElementById('btn-booster-ok').addEventListener('click', hideOverlay);
        return;
      }
      var html = '<p class="lede">Use a crafted booster</p><ul style="list-style:none;padding:0;">';
      for (var j = 0; j < owned.length; j++) {
        html += '<li style="margin:8px 0;"><button type="button" class="overlay-btn booster-use" data-bid="' + owned[j] + '">' + owned[j] + '</button></li>';
      }
      html += '</ul><button type="button" class="overlay-btn overlay-btn-ghost" id="btn-booster-cancel">Cancel</button>';
      setOverlay(html);
      var btns = document.querySelectorAll('.booster-use');
      for (var k = 0; k < btns.length; k++) {
        btns[k].addEventListener('click', function() {
          var type = this.getAttribute('data-bid');
          if (NS.App.crafting.useBooster(type)) {
            var scene = phaserGame.scene.getScene('GameScene');
            if (scene && scene.useBooster) scene.useBooster(type);
            NS.App.persist();
          }
          hideOverlay();
        });
      }
      document.getElementById('btn-booster-cancel').addEventListener('click', hideOverlay);
    },

    showPantry: function() {
      NS.Audio.ui();
      var html = '<p class="lede">Pantry &amp; Crafting</p>';
      var p = NS.App.crafting.pantry;
      var ing = NS.INGREDIENTS;
      html += '<p class="stat-line">Ingredients: ';
      for (var i = 0; i < ing.length; i++) {
        html += ing[i] + ' <span class="accent">' + (p[ing[i]] || 0) + '</span> ';
      }
      html += '</p><p class="stat-line">Boosters owned:</p><ul style="text-align:left;font-size:12px;margin:8px 24px;">';
      for (var r = 0; r < NS.RECIPES.length; r++) {
        var rec = NS.RECIPES[r];
        var count = NS.App.crafting.boosters[rec.id] || 0;
        var can = NS.App.crafting.canCraft(rec.id);
        html += '<li><strong>' + rec.name + '</strong> ×' + count;
        if (can) html += ' — <button type="button" class="overlay-btn craft-btn" data-recipe="' + rec.id + '" style="padding:4px 10px;font-size:10px;margin:0;">Craft</button>';
        html += '<br><span style="font-size:11px;color:#6b5d4f;">' + rec.desc + '</span></li>';
      }
      html += '</ul>';
      html += '<button type="button" class="overlay-btn" id="btn-pantry-close">Back to Map</button>';
      setOverlay(html);
      bindCraftButtons();
      document.getElementById('btn-pantry-close').addEventListener('click', function() {
        hideOverlay();
      });
    },

    onGameStart: function(engine) {
      var scene = phaserGame && phaserGame.scene.getScene('GameScene');
      if (scene && scene.updateHud) scene.updateHud(engine);
    },

    onEngineUpdate: function(engine) {
      var scene = phaserGame && phaserGame.scene.getScene('GameScene');
      if (scene && scene.updateHud) scene.updateHud(engine);
    },

    onLevelWin: function(engine) {
      var stars = engine.getStars();
      var lid = activeLevelId;
      var prev = (NS.App.save.levelStars[lid] || 0);
      if (stars > prev) {
        NS.App.save.totalStars += (stars - prev);
        NS.App.save.levelStars[lid] = stars;
      }
      var lvl = NS.getLevel(lid);
      if (lvl.chapter > NS.App.save.highestChapter) {
        NS.App.save.highestChapter = lvl.chapter;
      }
      NS.App.persist();

      if (window.gameBridge) {
        if (lid === '1-1') window.gameBridge.unlockAchievement('first_service');
        if (lid === '1-15') window.gameBridge.unlockAchievement('chapter1');
        if (lid === '4-15') window.gameBridge.unlockAchievement('chapter4');
        var threeCount = 0;
        var keys = Object.keys(NS.App.save.levelStars);
        for (var i = 0; i < keys.length; i++) {
          if (NS.App.save.levelStars[keys[i]] === 3) threeCount++;
        }
        if (threeCount >= 10) window.gameBridge.unlockAchievement('three_star_10');
        window.gameBridge.submitScore({ score: engine.score, level: lid, stars: stars });
      }

      var html = '<p class="lede win">Shift complete — ' + stars + ' star' + (stars > 1 ? 's' : '') + '</p>';
      html += '<p class="stat-line">Score <span class="accent">' + engine.score + '</span></p>';
      html += '<p class="hint">1\u2605 clear \u00B7 2\u2605 25%+ moves/time left \u00B7 3\u2605 50%+ left</p>';
      html += '<button type="button" class="overlay-btn" id="btn-next">Continue</button>';
      html += '<button type="button" class="overlay-btn overlay-btn-ghost" id="btn-map-win">Map</button>';
      setOverlay(html);
      hudTop.classList.add('hidden');
      toolbar.classList.add('hidden');
      document.getElementById('btn-next').addEventListener('click', function() {
        hideOverlay();
        NS.App.goToMap();
      });
      document.getElementById('btn-map-win').addEventListener('click', function() {
        hideOverlay();
        NS.App.goToMap();
      });
    },

    onLevelLose: function(engine) {
      var html = '<p class="lede lose">Order incomplete</p>';
      html += '<p class="stat-line">Score <span class="accent">' + engine.score + '</span></p>';
      html += '<button type="button" class="overlay-btn" id="btn-retry">Try Again</button>';
      html += '<button type="button" class="overlay-btn overlay-btn-ghost" id="btn-map-lose">Map</button>';
      setOverlay(html);
      hudTop.classList.add('hidden');
      toolbar.classList.add('hidden');
      document.getElementById('btn-retry').addEventListener('click', function() {
        hideOverlay();
        NS.App.startLevel(activeLevelId, true);
      });
      document.getElementById('btn-map-lose').addEventListener('click', function() {
        hideOverlay();
        NS.App.goToMap();
      });
    }
  };

  function setOverlay(html) {
    overlayBody.innerHTML = html;
    overlay.classList.remove('hidden');
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
  }

  function updateHud(engine) {
    if (engine.useTimer) {
      hudMoves.textContent = '—';
      var t = Math.max(0, Math.ceil(engine.timeLeft));
      hudTimer.textContent = Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
    } else {
      hudTimer.textContent = '—';
      hudMoves.textContent = String(Math.max(0, engine.movesLeft));
    }
    hudObjectives.textContent = engine.getObjectiveText();
  }

  function bindCraftButtons() {
    var buttons = document.querySelectorAll('.craft-btn');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function() {
        var id = this.getAttribute('data-recipe');
        if (NS.App.crafting.craft(id)) {
          NS.Audio.craft();
          if (NS.App.save.craftedIds.indexOf(id) < 0) {
            NS.App.save.craftedIds.push(id);
            if (NS.App.save.craftedIds.length >= NS.RECIPES.length && window.gameBridge) {
              window.gameBridge.unlockAchievement('craft_master');
            }
          }
          NS.App.persist();
          NS.App.showPantry();
        }
      });
    }
  }

  function showMainMenu() {
    var s = NS.App.save;
    setOverlay(
      '<p class="lede">Match pastries across four bakery districts. Clear shift tickets, break through flour and glaze, craft boosters, and earn stars on the district path.</p>' +
      '<div class="guide-section"><h3>Quick start</h3>' +
      '<p>① Open the map and pick a sector · ② Read your shift ticket · ③ Swap neighbours to match 3+ · ④ Finish all goals before moves or time run out</p></div>' +
      '<p class="stat-line"><span class="accent">' + s.totalStars + '</span> stars · ' +
      C.TOTAL_LEVELS + ' sectors · 4 districts</p>' +
      '<button type="button" class="overlay-btn" id="btn-open-map">Open district map</button>' +
      '<button type="button" class="overlay-btn overlay-btn-ghost" id="btn-howto-menu">How to play</button>' +
      (s.tutorialDone ? '' : '<button type="button" class="overlay-btn overlay-btn-ghost" id="btn-tutorial-menu">Full guide</button>')
    );
    document.getElementById('btn-open-map').addEventListener('click', function() {
      NS.Audio.ui();
      hideOverlay();
      NS.App.goToMap();
    });
    document.getElementById('btn-howto-menu').addEventListener('click', function() {
      NS.App.showHowToPlay();
    });
    var tutBtn = document.getElementById('btn-tutorial-menu');
    if (tutBtn) {
      tutBtn.addEventListener('click', function() {
        NS.App.showTutorial(0);
      });
    }
  }

  function initPhaser() {
    phaserGame = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'phaser-host',
      width: C.GAME_WIDTH,
      height: C.GAME_HEIGHT,
      backgroundColor: '#2a2218',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: C.GAME_WIDTH,
        height: C.GAME_HEIGHT
      },
      scene: [NS.Scenes.BootScene, NS.Scenes.MapScene, NS.Scenes.GameScene]
    });
    NS.App.phaser = phaserGame;
  }

  document.getElementById('btn-pause').addEventListener('click', function() {
    NS.App.triggerPause();
  });

  document.getElementById('btn-booster').addEventListener('click', function() {
    var ids = ['whisk', 'rolling', 'sugar', 'mitt', 'proof'];
    var owned = [];
    for (var i = 0; i < ids.length; i++) {
      if (NS.App.crafting.boosters[ids[i]] > 0) owned.push(ids[i]);
    }
    if (owned.length === 0) {
      setOverlay('<p class="lede">No boosters in stock. Visit the Pantry on the map.</p>' +
        '<button type="button" class="overlay-btn" id="btn-booster-ok">OK</button>');
      document.getElementById('btn-booster-ok').addEventListener('click', hideOverlay);
      return;
    }
    var html = '<p class="lede">Use a booster</p><ul style="list-style:none;">';
    for (var j = 0; j < owned.length; j++) {
      var bid = owned[j];
      html += '<li><button type="button" class="overlay-btn booster-use" data-bid="' + bid + '">' + bid + '</button></li>';
    }
    html += '</ul><button type="button" class="overlay-btn overlay-btn-ghost" id="btn-booster-cancel">Cancel</button>';
    setOverlay(html);
    var btns = document.querySelectorAll('.booster-use');
    for (var k = 0; k < btns.length; k++) {
      btns[k].addEventListener('click', function() {
        var type = this.getAttribute('data-bid');
        if (NS.App.crafting.useBooster(type)) {
          var scene = phaserGame.scene.getScene('GameScene');
          if (scene && scene.useBooster) scene.useBooster(type);
          NS.App.persist();
        }
        hideOverlay();
      });
    }
    document.getElementById('btn-booster-cancel').addEventListener('click', hideOverlay);
  });

  document.getElementById('btn-quit').addEventListener('click', function() {
    NS.App.goToMap();
  });

  window.addEventListener('keydown', function(e) {
    if (e.code === 'KeyP' && state === STATES.PLAYING && overlay.classList.contains('hidden')) {
      document.getElementById('btn-pause').click();
    }
  });

  var touchDir = 0;
  function bindTouch() {
    var buttons = document.querySelectorAll('.touch-btn');
    for (var i = 0; i < buttons.length; i++) {
      (function(btn) {
        var dir = btn.getAttribute('data-dir');
        if (!dir) return;
        var moveDir = parseInt(dir, 10);
        function down(e) { e.preventDefault(); touchDir = moveDir; }
        function up() { if (touchDir === moveDir) touchDir = 0; }
        btn.addEventListener('touchstart', down, { passive: false });
        btn.addEventListener('touchend', up);
        btn.addEventListener('mousedown', down);
        btn.addEventListener('mouseup', up);
      })(buttons[i]);
    }
  }

  NS.App.load(function() {
    initPhaser();
    if (!NS.App.save.tutorialDone) {
      NS.App.showTutorial(0);
    } else {
      showMainMenu();
    }
  });
})();
