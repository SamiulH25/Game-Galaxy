/**
 * Forge Line — input, HUD, campaign UI, bridge, game loop.
 */
(function() {
  var NS = window.ForgeLine;
  var C = NS;

  var canvas = document.getElementById('game-canvas');
  var overlay = document.getElementById('overlay');
  var overlayBody = document.getElementById('overlay-body');
  var campaignMap = document.getElementById('campaign-map');
  var levelNodes = document.getElementById('level-nodes');
  var mapWorldTitle = document.getElementById('map-world-title');
  var seedTray = document.getElementById('seed-tray');
  var toolbar = document.getElementById('toolbar');
  var gregBubble = document.getElementById('greg-bubble');
  var gregText = document.getElementById('greg-text');
  var waveBanner = document.getElementById('wave-banner');
  var waveBannerText = document.getElementById('wave-banner-text');

  var hudOre = document.getElementById('hud-ore');
  var hudIncome = document.getElementById('hud-income');
  var hudReactor = document.getElementById('hud-reactor');
  var hudWave = document.getElementById('hud-wave');
  var hudLevel = document.getElementById('hud-level');
  var btnShovel = document.getElementById('btn-shovel');
  var btnSpeed = document.getElementById('btn-speed');
  var speedLabel = document.getElementById('speed-label');
  var btnPause = document.getElementById('btn-pause');
  var btnMapBack = document.getElementById('btn-map-back');
  var rigInfo = document.getElementById('rig-info');
  var rigInfoIcon = document.getElementById('rig-info-icon');
  var rigInfoName = document.getElementById('rig-info-name');
  var rigInfoDesc = document.getElementById('rig-info-desc');
  var rigInfoStats = document.getElementById('rig-info-stats');
  var unlockBackdrop = document.getElementById('unlock-backdrop');
  var unlockCard = document.getElementById('unlock-card');
  var unlockBadge = document.getElementById('unlock-badge');
  var unlockIcon = document.getElementById('unlock-icon');
  var unlockTitle = document.getElementById('unlock-title');
  var unlockQuote = document.getElementById('unlock-quote');
  var unlockGregText = document.getElementById('unlock-greg-text');
  var btnUnlockDismiss = document.getElementById('unlock-dismiss');

  var engine = new NS.GameEngine();
  var renderer = new NS.Renderer(canvas);
  var audio = NS.Audio;

  var lastTime = 0;
  var saveData = {
    unlockedLevel: 1,
    stars: {},
    endlessBest: 0,
    campaignComplete: false,
    seenRigs: {},
    seenEnemies: {}
  };
  var currentWorld = 1;
  var gregDismissTimer = null;
  var waveBannerTimer = null;
  var lastHudOre = 0;
  var oreFlashTimer = null;
  var rigInfoTimer = null;
  var unlockDismissCb = null;
  var unlockShowing = false;

  function ensureSaveMeta() {
    if (!saveData.seenRigs) saveData.seenRigs = {};
    if (!saveData.seenEnemies) saveData.seenEnemies = {};
  }

  function syncKnownEnemies() {
    ensureSaveMeta();
    engine.knownEnemies = saveData.seenEnemies;
  }

  function hideUnlockCard() {
    unlockShowing = false;
    unlockCard.classList.add('hidden');
    unlockBackdrop.classList.add('hidden');
  }

  function showUnlockEntry(entry, onDone) {
    ensureSaveMeta();
    hideGreg();
    hideRigInfo();
    unlockShowing = true;
    engine.resumeState = engine.state === 'unlock' ? (engine.resumeState || 'playing') : engine.state;
    if (engine.state === 'playing') engine.state = 'unlock';

    unlockIcon.innerHTML = '';
    NS.SpriteAtlas.init();
    var isRig = entry.kind === 'rig';
    unlockBadge.textContent = isRig ? 'NEW RIG UNLOCKED' : (C.ENEMIES[entry.id] && C.ENEMIES[entry.id].boss ? 'BOSS GOLEM' : 'NEW GOLEM TYPE');
    btnUnlockDismiss.textContent = isRig ? 'ADD TO TRAY' : 'ENGAGE';

    if (isRig) {
      var def = C.DEFENDERS[entry.id];
      unlockTitle.textContent = def ? def.name : entry.id;
      unlockGregText.textContent = def && def.unlockGreg ? def.unlockGreg : (def ? def.desc : '');
      unlockQuote.classList.add('hidden');
      unlockIcon.appendChild(NS.SpriteAtlas.createTrayIcon(entry.id));
    } else {
      var en = C.ENEMIES[entry.id];
      unlockTitle.textContent = en ? en.name : entry.id;
      unlockGregText.textContent = en && en.encounterGreg ? en.encounterGreg : '';
      if (en && en.bark) {
        unlockQuote.textContent = '\u201C' + en.bark + '\u201D';
        unlockQuote.classList.remove('hidden');
      } else {
        unlockQuote.classList.add('hidden');
      }
      unlockIcon.appendChild(NS.SpriteAtlas.createEnemyIcon(entry.id));
    }

    unlockBackdrop.classList.remove('hidden');
    unlockCard.classList.remove('hidden');
    audio.ui();
    unlockDismissCb = onDone;
  }

  function markUnlockSeen(entry) {
    ensureSaveMeta();
    if (entry.kind === 'rig') saveData.seenRigs[entry.id] = true;
    if (entry.kind === 'enemy') {
      saveData.seenEnemies[entry.id] = true;
      if (engine.knownEnemies) engine.knownEnemies[entry.id] = true;
    }
  }

  function processUnlockQueue(queue, onDone) {
    if (!queue.length) {
      if (onDone) onDone();
      return;
    }
    var entry = queue.shift();
    showUnlockEntry(entry, function() {
      markUnlockSeen(entry);
      persistSave();
      hideUnlockCard();
      engine.state = 'playing';
      if (entry.kind === 'rig') updateSeedTray();
      processUnlockQueue(queue, onDone);
    });
  }

  function buildRigUnlockQueue(levelId) {
    ensureSaveMeta();
    var q = [];
    var rigs = C.defendersUnlockedAtLevel(levelId);
    for (var i = 0; i < rigs.length; i++) {
      var r = rigs[i];
      if (r.unlockGreg && !saveData.seenRigs[r.id]) q.push({ kind: 'rig', id: r.id });
    }
    return q;
  }

  function handlePendingEncounter() {
    if (!engine.pendingEncounter || unlockShowing) return;
    var enc = engine.pendingEncounter;
    engine.pendingEncounter = null;
    showUnlockEntry(enc, function() {
      markUnlockSeen(enc);
      persistSave();
      hideUnlockCard();
      engine.resumeFromUnlock();
    });
  }

  function hearts(n, max) {
    var s = '';
    for (var i = 0; i < max; i++) s += i < n ? '♥' : '♡';
    return s;
  }

  function setOverlay(html) {
    overlayBody.innerHTML = html;
    overlay.classList.remove('hidden');
    campaignMap.classList.add('hidden');
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
  }

  function showGreg(text, duration) {
    if (!text) return;
    gregText.textContent = text;
    gregBubble.classList.remove('hidden');
    clearTimeout(gregDismissTimer);
    gregDismissTimer = setTimeout(function() {
      gregBubble.classList.add('hidden');
    }, duration || 6000);
  }

  function hideGreg() {
    gregBubble.classList.add('hidden');
    clearTimeout(gregDismissTimer);
  }

  function showWaveBanner(text, isHuge) {
    if (!text) return;
    waveBannerText.textContent = text;
    waveBanner.classList.remove('hidden');
    waveBanner.classList.toggle('wave-banner-huge', !!isHuge);
    clearTimeout(waveBannerTimer);
    waveBannerTimer = setTimeout(function() {
      waveBanner.classList.add('hidden');
      waveBanner.classList.remove('wave-banner-huge');
    }, isHuge ? 2800 : 2200);
    if (isHuge) audio.hugeWave();
    else audio.wave();
  }

  function hideRigInfo() {
    rigInfo.classList.add('hidden');
    clearTimeout(rigInfoTimer);
  }

  function rigStatsLine(def) {
    if (!def) return '';
    if (def.kind === 'producer' && def.income) {
      return '+' + def.income + ' Ore / ' + (def.incomeInterval || C.COLLECTOR_INTERVAL) + 's · ' + def.hp + ' HP';
    }
    if (def.kind === 'shooter') {
      var s = def.damage + ' dmg · every ' + def.rate + 's · range ' + def.range;
      if (def.splash) s += ' · splash';
      if (def.chain) s += ' · chain ×' + def.chain;
      if (def.steamOnKill) s += ' · +' + def.steamOnKill + ' Ore on kill';
      return s + ' · ' + def.hp + ' HP';
    }
    if (def.kind === 'wall') return def.hp + ' HP wall';
    if (def.kind === 'trap') return def.damage + ' trap dmg · ' + def.hp + ' HP';
    if (def.kind === 'support') {
      var t = 'Support · range ' + def.range;
      if (def.slow) t += ' · slows golems';
      if (def.steamOnKill) t += ' · bonus Ore on kill';
      return t + ' · ' + def.hp + ' HP';
    }
    return def.hp ? def.hp + ' HP' : '';
  }

  function showRigInfo(defId) {
    var def = C.DEFENDERS[defId];
    if (!def) return;
    rigInfoName.textContent = def.name;
    rigInfoDesc.textContent = def.desc || '';
    rigInfoStats.textContent = rigStatsLine(def);
    rigInfoIcon.innerHTML = '';
    NS.SpriteAtlas.init();
    rigInfoIcon.appendChild(NS.SpriteAtlas.createTrayIcon(defId));
    rigInfo.classList.remove('hidden');
    clearTimeout(rigInfoTimer);
    rigInfoTimer = setTimeout(hideRigInfo, 5000);
  }

  function hideWaveBanner() {
    waveBanner.classList.add('hidden');
    clearTimeout(waveBannerTimer);
  }

  function persistSave() {
    if (!window.gameBridge) return;
    window.gameBridge.save(saveData);
  }

  function loadSave() {
    if (!window.gameBridge) return Promise.resolve();
    return window.gameBridge.load().then(function(data) {
      if (!data) return;
      saveData.unlockedLevel = data.unlockedLevel || 1;
      saveData.stars = data.stars || {};
      saveData.endlessBest = data.endlessBest || 0;
      saveData.campaignComplete = !!data.campaignComplete;
      saveData.seenRigs = data.seenRigs || {};
      saveData.seenEnemies = data.seenEnemies || {};
    });
  }

  function totalStars() {
    var n = 0;
    for (var k in saveData.stars) n += saveData.stars[k];
    return n;
  }

  function showMainMenu() {
    engine.reset();
    engine.state = 'idle';
    hideGameplayUi();
    setOverlay(
      '<p class="lede">Defend the Core Reactor. Deploy rigs. Survive the scrap golems. Foreman Greg believes in you. (He has to.)</p>' +
      '<p class="stat-line">Shifts cleared: <span class="accent">' + (saveData.unlockedLevel - 1) + '</span> · Stars: <span class="accent">' + totalStars() + '</span>' +
      (saveData.endlessBest ? ' · Endless best: <span class="accent">' + saveData.endlessBest + '</span>' : '') + '</p>' +
      '<button type="button" class="overlay-btn" id="btn-campaign">CAMPAIGN</button>' +
      '<button type="button" class="overlay-btn secondary" id="btn-how">HOW TO PLAY</button>' +
      '<p class="hint">Tap seed tray · Click grid to place · Click placed rigs for info · F for speed</p>'
    );
    document.getElementById('btn-campaign').addEventListener('click', function() {
      audio.ui();
      hideOverlay();
      showWorldSelect();
    });
    document.getElementById('btn-how').addEventListener('click', function() {
      audio.ui();
      setOverlay(
        '<p class="lede"><strong>Ore</strong> is your currency. Spend it to place rigs on the grid.</p>' +
        '<p class="lede"><strong>Ore Collectors</strong> mine the bulk of it (+25 every 12s). Reactor slag only drips +2/s.</p>' +
        '<p class="lede"><strong>Kills</strong> salvage scrap into Ore (+numbers pop up). Click a placed rig to read what it does.</p>' +
        '<p class="lede">Golems march in <strong>waves</strong>. Clear each wave, then plant during the READY countdown.</p>' +
        '<p class="lede"><strong>Blast doors</strong> (gold bars) wipe one lane once each.</p>' +
        '<button type="button" class="overlay-btn" id="btn-back-menu">GOT IT</button>'
      );
      document.getElementById('btn-back-menu').addEventListener('click', showMainMenu);
    });
  }

  function showWorldSelect() {
    var html = '<div class="world-grid">';
    for (var i = 0; i < C.WORLDS.length; i++) {
      var w = C.WORLDS[i];
      var locked = saveData.unlockedLevel < w.levelStart;
      var stars = 0;
      for (var lv = w.levelStart; lv <= w.levelEnd; lv++) stars += saveData.stars[lv] || 0;
      var maxStars = (w.levelEnd - w.levelStart + 1) * 3;
      html += '<div class="world-card' + (locked ? ' world-locked' : '') + '" data-world="' + w.id + '">' +
        '<h3>' + w.name + '</h3>' +
        '<p>' + w.subtitle + '</p>' +
        '<p class="stars">' + (locked ? '🔒 Locked' : '★ ' + stars + ' / ' + maxStars) + '</p></div>';
    }
    html += '</div>';
    html += '<button type="button" class="overlay-btn secondary" id="btn-menu-back">MAIN MENU</button>';
    setOverlay(html);
    var cards = document.querySelectorAll('.world-card:not(.world-locked)');
    for (var c = 0; c < cards.length; c++) {
      cards[c].addEventListener('click', function() {
        audio.ui();
        currentWorld = parseInt(this.getAttribute('data-world'), 10);
        hideOverlay();
        showLevelMap(currentWorld);
      });
    }
    document.getElementById('btn-menu-back').addEventListener('click', function() {
      audio.ui();
      showMainMenu();
    });
  }

  function showLevelMap(worldId) {
    var world = null;
    for (var i = 0; i < C.WORLDS.length; i++) {
      if (C.WORLDS[i].id === worldId) world = C.WORLDS[i];
    }
    if (!world) return;

    mapWorldTitle.textContent = world.name;
    levelNodes.innerHTML = '';

    for (var lv = world.levelStart; lv <= world.levelEnd; lv++) {
      var lvl = C.getLevel(lv);
      if (!lvl) continue;
      var locked = lv > saveData.unlockedLevel;
      var node = document.createElement('button');
      node.type = 'button';
      node.className = 'level-node' + (locked ? ' node-locked' : '') + (lvl.flag === 'endless' ? ' node-endless' : '');
      var stars = saveData.stars[lv] || 0;
      var starStr = stars > 0 ? '★'.repeat(stars) : '—';
      if (lvl.flag === 'endless') {
        node.innerHTML = '<span class="node-num">∞</span><span class="node-stars">ENDLESS</span>';
      } else {
        node.innerHTML = '<span class="node-num">' + lv + '</span><span class="node-stars">' + starStr + '</span>';
      }
      node.title = lvl.name;
      if (!locked) {
        (function(levelId) {
          node.addEventListener('click', function() {
            audio.ui();
            startLevel(levelId);
          });
        })(lv);
      }
      levelNodes.appendChild(node);
    }

    campaignMap.classList.remove('hidden');
  }

  function hideGameplayUi() {
    seedTray.classList.add('hidden');
    toolbar.classList.add('hidden');
    campaignMap.classList.add('hidden');
    hideGreg();
    hideWaveBanner();
    hideRigInfo();
  }

  function showGameplayUi() {
    seedTray.classList.remove('hidden');
    toolbar.classList.remove('hidden');
    campaignMap.classList.add('hidden');
    hideOverlay();
    buildSeedTray();
  }

  function buildSeedTray() {
    seedTray.innerHTML = '';
    var defs = C.unlockedDefenders(engine.levelId);
    for (var i = 0; i < defs.length; i++) {
      var def = defs[i];
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'seed-card';
      card.setAttribute('data-id', def.id);

      var icon = document.createElement('div');
      icon.className = 'seed-icon';
      NS.SpriteAtlas.init();
      icon.appendChild(NS.SpriteAtlas.createTrayIcon(def.id));

      var name = document.createElement('div');
      name.className = 'seed-name';
      name.textContent = def.name;

      var cost = document.createElement('div');
      cost.className = 'seed-cost';
      cost.textContent = def.cost;

      if (def.kind === 'producer' && def.income) {
        var income = document.createElement('div');
        income.className = 'seed-income';
        income.textContent = '+' + def.income + ' Ore / ' + (def.incomeInterval || C.COLLECTOR_INTERVAL) + 's';
        card.appendChild(icon);
        card.appendChild(name);
        card.appendChild(income);
        card.appendChild(cost);
      } else {
        card.appendChild(icon);
        card.appendChild(name);
        card.appendChild(cost);
      }
      card.addEventListener('click', function() {
        audio.ui();
        var id = this.getAttribute('data-id');
        engine.selectDefender(id);
        engine.shovelMode = false;
        btnShovel.classList.remove('active');
        hideRigInfo();
        updateSeedTray();
      });
      seedTray.appendChild(card);
    }
    updateSeedTray();
  }

  function updateSeedTray() {
    var cards = seedTray.querySelectorAll('.seed-card');
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var id = card.getAttribute('data-id');
      card.classList.toggle('selected', id === engine.selectedDefender && !engine.shovelMode);
      card.classList.toggle('seed-cant-afford', !engine.canAfford(id));
      var cd = engine.cooldowns[id] || 0;
      var costEl = card.querySelector('.seed-cost');
      if (cd > 0) {
        costEl.textContent = cd.toFixed(1) + 's';
        costEl.classList.add('seed-cooldown');
      } else {
        costEl.textContent = C.DEFENDERS[id].cost;
        costEl.classList.remove('seed-cooldown');
      }
    }
  }

  function updateSpeedUi() {
    var s = engine.timeScale || 1;
    speedLabel.textContent = s + '×';
    btnSpeed.classList.toggle('active', s > 1);
  }

  function cycleSpeed() {
    if (engine.state !== 'playing') return;
    engine.cycleTimeScale();
    updateSpeedUi();
    audio.ui();
  }

  function updateHud() {
    var ore = Math.floor(engine.steam);
    hudOre.textContent = ore;
    if (ore > lastHudOre) {
      hudOre.parentElement.classList.add('ore-gain');
      clearTimeout(oreFlashTimer);
      oreFlashTimer = setTimeout(function() {
        hudOre.parentElement.classList.remove('ore-gain');
      }, 280);
    }
    lastHudOre = ore;

    var inc = engine.getIncomeInfo();
    var parts = ['+' + inc.passive + '/s slag'];
    if (inc.collectors > 0) {
      parts.push('+' + inc.collectorRate.toFixed(1) + '/s · ' + inc.collectors + ' collector' + (inc.collectors === 1 ? '' : 's'));
    } else {
      parts.push('place collectors!');
    }
    hudIncome.textContent = parts.join(' · ');

    hudReactor.textContent = hearts(engine.baseHp, engine.maxBaseHp);
    hudWave.textContent = engine.getWaveDisplay();
    hudLevel.textContent = engine.isEndless() ? 'OT' : String(engine.levelId);
    hudWave.parentElement.classList.toggle('hud-prep', engine.wavePhase === 'prep');
  }

  function startLevel(levelId) {
    audio.unlock();
    campaignMap.classList.add('hidden');
    hideUnlockCard();
    engine.loadLevel(levelId);
    syncKnownEnemies();
    showGameplayUi();
    updateSeedTray();
    hudLevel.textContent = engine.isEndless() ? 'OT' : String(levelId);
    updateSpeedUi();
    lastHudOre = Math.floor(engine.steam);
    updateHud();
    canvas.focus();

    var rigQueue = buildRigUnlockQueue(levelId);
    processUnlockQueue(rigQueue, function() {
      var lvl = C.getLevel(levelId);
      var intro = 'Foreman Greg: ' + (lvl ? lvl.intro : 'Good luck.');
      if (!engine.isEndless()) {
        intro += ' Build Ore Collectors first — they mine most of your Ore.';
      }
      showGreg(intro, 8000);
    });
  }

  function onLevelWon() {
    audio.win();
    var stars = C.starsForRun(engine.baseHp, engine.maxBaseHp, engine.damageTaken);
    var prev = saveData.stars[engine.levelId] || 0;
    if (stars > prev) saveData.stars[engine.levelId] = stars;

    if (engine.isEndless()) {
      if (engine.endlessWave > saveData.endlessBest) {
        saveData.endlessBest = engine.endlessWave;
        if (engine.endlessWave >= 10 && window.gameBridge) {
          window.gameBridge.unlockAchievement('endless_10');
        }
      }
      persistSave();
      setOverlay(
        '<p class="lede win">Overtime ended — wave ' + engine.endlessWave + '</p>' +
        '<p class="stat-line">Best: <span class="accent">' + saveData.endlessBest + '</span> · Score <span class="accent">' + engine.score + '</span></p>' +
        '<button type="button" class="overlay-btn" id="btn-retry">AGAIN</button>' +
        '<button type="button" class="overlay-btn secondary" id="btn-map">CAMPAIGN</button>'
      );
    } else {
      if (engine.levelId >= saveData.unlockedLevel && engine.levelId < 24) {
        saveData.unlockedLevel = engine.levelId + 1;
      }
      if (engine.levelId === 24) saveData.unlockedLevel = 24;

      var lvl = C.getLevel(engine.levelId);
      if (lvl && lvl.flag === 'world1' && window.gameBridge) {
        window.gameBridge.unlockAchievement('world1_clear');
      }
      if (lvl && lvl.flag === 'world3' && window.gameBridge) {
        window.gameBridge.unlockAchievement('world3_clear');
        saveData.campaignComplete = true;
        window.gameBridge.unlockAchievement('campaign_clear');
      }
      if (engine.levelId === 1 && window.gameBridge) {
        window.gameBridge.unlockAchievement('first_shift');
      }
      if (engine.damageTaken === 0 && window.gameBridge) {
        window.gameBridge.unlockAchievement('no_damage');
      }

      persistSave();
      if (window.gameBridge) {
        window.gameBridge.submitScore({
          score: engine.score,
          level: engine.levelId,
          stars: stars
        });
      }

      var starDisplay = '★'.repeat(stars) + '☆'.repeat(3 - stars);
      setOverlay(
        '<p class="lede win">Shift complete — ' + (lvl ? lvl.name : '') + '</p>' +
        '<p class="stat-line">' + starDisplay + ' · Score <span class="accent">' + engine.score + '</span></p>' +
        '<button type="button" class="overlay-btn" id="btn-next">NEXT SHIFT</button>' +
        '<button type="button" class="overlay-btn secondary" id="btn-map">CAMPAIGN</button>'
      );

      var nextBtn = document.getElementById('btn-next');
      if (engine.levelId >= 23 && engine.levelId !== 24) {
        nextBtn.textContent = 'SCRAPYARD';
      }
      nextBtn.addEventListener('click', function() {
        audio.ui();
        var next = engine.levelId + 1;
        if (C.getLevel(next) && next <= saveData.unlockedLevel) startLevel(next);
        else showWorldSelect();
      });
    }

    hideGameplayUi();
    document.getElementById('btn-retry') && document.getElementById('btn-retry').addEventListener('click', function() {
      startLevel(engine.levelId);
    });
    document.getElementById('btn-map').addEventListener('click', function() {
      audio.ui();
      showWorldSelect();
    });
  }

  function onLevelLost() {
    audio.lose();
    hideGameplayUi();
    setOverlay(
      '<p class="lede">Reactor breach! OSHA has been notified.</p>' +
      '<p class="stat-line">Foreman Greg: &quot;Let\'s pretend that didn\'t happen.&quot;</p>' +
      '<button type="button" class="overlay-btn" id="btn-retry">RETRY SHIFT</button>' +
      '<button type="button" class="overlay-btn secondary" id="btn-map">CAMPAIGN</button>'
    );
    document.getElementById('btn-retry').addEventListener('click', function() {
      startLevel(engine.levelId);
    });
    document.getElementById('btn-map').addEventListener('click', function() {
      showWorldSelect();
    });
  }

  function handleGridClick(clientX, clientY) {
    if (engine.state !== 'playing') return;
    var rect = canvas.getBoundingClientRect();
    var cell = renderer.cellAt(clientX, clientY, rect);
    if (!cell) return;

    var occupied = engine.grid[cell.row][cell.col];
    if (occupied && !engine.shovelMode) {
      showRigInfo(occupied.id);
      audio.ui();
      return;
    }

    var result = engine.tryPlace(cell.col, cell.row);
    if (result.ok) {
      hideRigInfo();
      if (result.shovel) audio.shovel();
      else audio.place();
    } else if (result.reason === 'steam') {
      showGreg('Not enough Ore for that rig.', 2500);
    }
    updateSeedTray();
    updateHud();
  }

  function loop(time) {
    requestAnimationFrame(loop);
    var dt = Math.min(0.05, (time - lastTime) / 1000);
    lastTime = time;

    if (engine.pendingEncounter && !unlockShowing) {
      handlePendingEncounter();
    }

    if (engine.state === 'playing') {
      var prevKills = engine.killCount;
      engine.update(dt * (engine.timeScale || 1));
      if (engine.killCount > prevKills) audio.kill();
      if (engine.gregTimer > 0 && engine.gregBark) {
        showGreg('⚠ ' + engine.gregBark, engine.gregTimer * 1000);
        engine.gregBark = '';
      }
      var banner = engine.consumeWaveBanner();
      if (banner) {
        showWaveBanner(banner, banner.indexOf('HUGE') === 0);
      }
      var incomeEv = engine.consumeIncomeEvents();
      for (var ie = 0; ie < incomeEv.length; ie++) {
        if (incomeEv[ie] === 'collector') audio.ore();
      }
      updateHud();
      updateSeedTray();

      if (engine.state === 'won') onLevelWon();
      else if (engine.state === 'lost') onLevelLost();
    }

    renderer.draw(engine, time);
  }

  canvas.addEventListener('click', function(e) {
    audio.unlock();
    handleGridClick(e.clientX, e.clientY);
  });

  canvas.addEventListener('mousemove', function(e) {
    if (engine.state !== 'playing') return;
    var rect = canvas.getBoundingClientRect();
    engine.hoverCell = renderer.cellAt(e.clientX, e.clientY, rect);
  });

  canvas.addEventListener('mouseleave', function() {
    engine.hoverCell = null;
  });

  canvas.addEventListener('touchstart', function(e) {
    audio.unlock();
    if (!e.touches.length) return;
    e.preventDefault();
    var t = e.touches[0];
    handleGridClick(t.clientX, t.clientY);
  }, { passive: false });

  btnShovel.addEventListener('click', function() {
    audio.ui();
    engine.toggleShovel();
    btnShovel.classList.toggle('active', engine.shovelMode);
    updateSeedTray();
  });

  btnSpeed.addEventListener('click', cycleSpeed);

  btnUnlockDismiss.addEventListener('click', function() {
    audio.ui();
    if (unlockDismissCb) {
      var cb = unlockDismissCb;
      unlockDismissCb = null;
      cb();
    }
  });

  btnPause.addEventListener('click', function() {
    if (engine.state !== 'playing') return;
    audio.ui();
    engine.state = 'paused';
    setOverlay(
      '<p class="lede">Break time. Don\'t tell management.</p>' +
      '<button type="button" class="overlay-btn" id="btn-resume">RESUME</button>' +
      '<button type="button" class="overlay-btn secondary" id="btn-quit">QUIT SHIFT</button>'
    );
    document.getElementById('btn-resume').addEventListener('click', function() {
      audio.ui();
      engine.state = 'playing';
      hideOverlay();
    });
    document.getElementById('btn-quit').addEventListener('click', function() {
      hideGameplayUi();
      showWorldSelect();
    });
  });

  btnMapBack.addEventListener('click', function() {
    audio.ui();
    campaignMap.classList.add('hidden');
    showWorldSelect();
  });

  document.addEventListener('keydown', function(e) {
    if (e.code === 'KeyF' && engine.state === 'playing') {
      e.preventDefault();
      cycleSpeed();
      return;
    }
    if (e.code === 'Space' && engine.state === 'playing') {
      e.preventDefault();
      btnPause.click();
    }
    if (e.code === 'Escape' && engine.state === 'paused') {
      engine.state = 'playing';
      hideOverlay();
    }
    var num = parseInt(e.key, 10);
    if (num >= 1 && num <= 9 && engine.state === 'playing') {
      var defs = C.unlockedDefenders(engine.levelId);
      if (defs[num - 1]) {
        engine.selectDefender(defs[num - 1].id);
        engine.shovelMode = false;
        btnShovel.classList.remove('active');
        updateSeedTray();
      }
    }
  });

  loadSave().then(function() {
    showMainMenu();
    requestAnimationFrame(loop);
  });
})();
