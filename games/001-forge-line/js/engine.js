/**
 * Forge Line — pure game rules (no DOM).
 * Waves are PvZ-style: prep → spawn wave → clear all enemies → next wave.
 */
(function(NS) {
  var C = NS;

  function emptyGrid() {
    var g = [];
    for (var r = 0; r < C.ROWS; r++) {
      g[r] = [];
      for (var col = 0; col < C.COLS; col++) g[r][col] = null;
    }
    return g;
  }

  function GameEngine() {
    this.reset();
  }

  GameEngine.prototype.reset = function() {
    this.state = 'idle';
    this.levelId = 1;
    this.level = null;
    this.grid = emptyGrid();
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.steam = C.START_STEAM;
    this.baseHp = C.BASE_HP;
    this.maxBaseHp = C.BASE_HP;
    this.damageTaken = 0;
    this.blastDoors = [true, true, true, true, true];
    this.waveIndex = 0;
    this.wavePhase = 'prep';
    this.phaseTimer = 0;
    this.waveSpawnElapsed = 0;
    this.spawnQueue = [];
    this.wavesDone = false;
    this.waveHuge = false;
    this.waveBannerPending = null;
    this.selectedDefender = 'ore_collector';
    this.shovelMode = false;
    this.cooldowns = {};
    this.passiveTimer = 0;
    this.endlessWave = 0;
    this.endlessEscalation = 0;
    this.score = 0;
    this.killCount = 0;
    this.gregBark = '';
    this.gregTimer = 0;
    this.floatTexts = [];
    this.incomeEvents = [];
    this.flashCells = [];
    this.shake = 0;
    this.timeScale = 1;
    this.pendingEncounter = null;
    this.resumeState = 'playing';
  };

  GameEngine.prototype.cycleTimeScale = function() {
    if (this.timeScale === 1) this.timeScale = 2;
    else if (this.timeScale === 2) this.timeScale = 3;
    else this.timeScale = 1;
    return this.timeScale;
  };

  GameEngine.prototype.loadLevel = function(levelId) {
    var lvl = C.getLevel(levelId);
    if (!lvl) return false;
    var scale = this.timeScale || 1;
    this.reset();
    this.timeScale = scale;
    this.levelId = levelId;
    this.level = lvl;
    this.steam = lvl.startSteam || C.START_STEAM;
    this.state = 'playing';
    this.waveIndex = 0;
    this.wavesDone = false;
    if (this.isEndless()) {
      this.beginEndlessPrep();
    } else {
      this.beginPrepPhase(0);
    }
    return true;
  };

  GameEngine.prototype.beginPrepPhase = function(idx) {
    if (!this.level || idx >= this.level.waves.length) {
      this.wavesDone = true;
      return;
    }
    this.waveIndex = idx;
    this.wavePhase = 'prep';
    this.spawnQueue = [];
    var w = this.level.waves[idx];
    this.phaseTimer = w.prep != null ? w.prep : C.DEFAULT_WAVE_PREP;
    this.waveHuge = !!w.huge;
    if (w.announce) {
      this.gregBark = w.announce;
      this.gregTimer = 4.5;
    } else if (w.huge) {
      this.gregBark = 'Huge golem wave incoming! Fortify the line!';
      this.gregTimer = 4;
    } else if (idx > 0) {
      this.gregBark = 'Wave ' + (idx + 1) + ' approaching. Plant up.';
      this.gregTimer = 2.5;
    }
  };

  GameEngine.prototype.beginEndlessPrep = function() {
    this.wavePhase = 'prep';
    this.spawnQueue = [];
    this.phaseTimer = 10;
    this.waveHuge = this.endlessWave > 0 && this.endlessWave % 5 === 4;
    if (this.endlessWave > 0) {
      this.gregBark = 'Wave ' + (this.endlessWave + 1) + ' on the clock. Keep planting.';
      this.gregTimer = 2.5;
    }
  };

  GameEngine.prototype.beginActiveWave = function() {
    this.wavePhase = 'active';
    this.waveSpawnElapsed = 0;
    this.spawnQueue = [];
    var w = this.level.waves[this.waveIndex];
    for (var i = 0; i < w.spawns.length; i++) {
      var s = w.spawns[i];
      this.spawnQueue.push({
        at: s.delay || 0,
        type: s.type,
        row: s.row,
        fired: false
      });
    }
    var label = this.isEndless()
      ? 'WAVE ' + this.endlessWave
      : 'WAVE ' + (this.waveIndex + 1);
    if (this.waveHuge) label = 'HUGE ' + label;
    this.waveBannerPending = label;
  };

  GameEngine.prototype.isEndless = function() {
    return this.level && this.level.flag === 'endless';
  };

  GameEngine.prototype.consumeWaveBanner = function() {
    var t = this.waveBannerPending;
    this.waveBannerPending = null;
    return t;
  };

  GameEngine.prototype.selectDefender = function(id) {
    if (!C.DEFENDERS[id]) return;
    var def = C.DEFENDERS[id];
    if (def.unlockLevel > this.levelId) return;
    this.selectedDefender = id;
    this.shovelMode = false;
  };

  GameEngine.prototype.toggleShovel = function() {
    this.shovelMode = !this.shovelMode;
    if (this.shovelMode) this.selectedDefender = null;
  };

  GameEngine.prototype.canAfford = function(id) {
    var def = C.DEFENDERS[id];
    return def && this.steam >= def.cost && !this.onCooldown(id);
  };

  GameEngine.prototype.onCooldown = function(id) {
    return (this.cooldowns[id] || 0) > 0;
  };

  GameEngine.prototype.tryPlace = function(col, row) {
    if (this.state !== 'playing') return { ok: false };
    if (col < 0 || col >= C.COLS || row < 0 || row >= C.ROWS) return { ok: false };

    if (this.shovelMode) {
      return this.tryShovel(col, row);
    }

    var id = this.selectedDefender;
    if (!id) return { ok: false };
    var def = C.DEFENDERS[id];
    if (!def || def.unlockLevel > this.levelId) return { ok: false, reason: 'locked' };
    if (this.grid[row][col]) return { ok: false, reason: 'occupied' };
    if (this.steam < def.cost) return { ok: false, reason: 'steam' };
    if (this.onCooldown(id)) return { ok: false, reason: 'cooldown' };

    this.steam -= def.cost;
    this.cooldowns[id] = def.cooldown;
    this.grid[row][col] = {
      id: id,
      hp: def.hp,
      maxHp: def.hp,
      timer: def.kind === 'producer'
        ? C.COLLECTOR_INTERVAL - (C.COLLECTOR_FIRST_PAYOUT || 6)
        : 0,
      armed: def.kind === 'trap'
    };
    this.flashCells.push({ col: col, row: row, t: 0.35 });
    return { ok: true, placed: id };
  };

  GameEngine.prototype.tryShovel = function(col, row) {
    var cell = this.grid[row][col];
    if (!cell) return { ok: false };
    var def = C.DEFENDERS[cell.id];
    var refund = def ? Math.floor(def.cost * 0.4) : 0;
    this.steam += refund;
    this.grid[row][col] = null;
    return { ok: true, shovel: true, refund: refund };
  };

  GameEngine.prototype.triggerBlastDoor = function(row) {
    if (!this.blastDoors[row]) return false;
    this.blastDoors[row] = false;
    this.enemies = this.enemies.filter(function(e) {
      return e.row !== row;
    });
    this.shake = 0.4;
    for (var i = 0; i < 24; i++) {
      this.particles.push({
        x: 0.2,
        y: row + Math.random(),
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 0.5 + Math.random() * 0.4,
        kind: 'blast',
        maxLife: 0.9
      });
    }
    return true;
  };

  GameEngine.prototype.spawnEnemy = function(type, row) {
    var tmpl = C.ENEMIES[type];
    if (!tmpl) return;
    this.enemies.push({
      type: type,
      row: row,
      x: C.COLS + 0.5,
      hp: tmpl.hp,
      maxHp: tmpl.hp,
      armor: tmpl.armor || 0,
      speed: tmpl.speed,
      damage: tmpl.damage,
      reward: tmpl.reward,
      slowed: 0,
      underground: tmpl.underground && true,
      surfaced: !tmpl.underground,
      jumped: false,
      eatTimer: 0,
      eating: false,
      bark: tmpl.bark
    });
    if (tmpl.boss) {
      this.gregBark = tmpl.bark;
      this.gregTimer = 3.5;
    }
    if (this.knownEnemies && !this.knownEnemies[type] && tmpl.encounterGreg) {
      this.knownEnemies[type] = true;
      this.queueEncounter(type);
    }
  };

  GameEngine.prototype.queueEncounter = function(type) {
    if (this.pendingEncounter) return;
    var tmpl = C.ENEMIES[type];
    if (!tmpl || !tmpl.encounterGreg) return;
    this.pendingEncounter = { kind: 'enemy', id: type };
  };

  GameEngine.prototype.resumeFromUnlock = function() {
    this.pendingEncounter = null;
    this.state = this.resumeState || 'playing';
    this.resumeState = 'playing';
  };

  GameEngine.prototype.pushFloatText = function(col, row, text, kind) {
    this.floatTexts.push({
      col: col,
      row: row,
      text: text,
      life: 1.1,
      maxLife: 1.1,
      kind: kind || 'steam'
    });
  };

  GameEngine.prototype.addSteam = function(n, source) {
    this.steam = Math.min(9999, this.steam + n);
    if (source === 'collector') this.incomeEvents.push('collector');
    else if (source === 'kill') this.incomeEvents.push('kill');
  };

  GameEngine.prototype.consumeIncomeEvents = function() {
    var ev = this.incomeEvents.slice();
    this.incomeEvents = [];
    return ev;
  };

  GameEngine.prototype.countCollectors = function() {
    var n = 0;
    for (var r = 0; r < C.ROWS; r++) {
      for (var c = 0; c < C.COLS; c++) {
        if (this.grid[r][c] && this.grid[r][c].id === 'ore_collector') n++;
      }
    }
    return n;
  };

  GameEngine.prototype.getIncomeInfo = function() {
    var collectors = this.countCollectors();
    var collectorRate = collectors * (C.COLLECTOR_AMOUNT / C.COLLECTOR_INTERVAL);
    return {
      passive: C.PASSIVE_STEAM,
      collectorRate: collectorRate,
      collectors: collectors,
      total: C.PASSIVE_STEAM + collectorRate
    };
  };

  GameEngine.prototype.damageEnemy = function(enemy, dmg, sourceRow, sourceCol) {
    if (enemy.underground && !enemy.surfaced) return false;
    var actual = dmg;
    if (enemy.armor > 0) {
      var absorbed = Math.min(enemy.armor, actual);
      enemy.armor -= absorbed;
      actual -= absorbed;
    }
    if (actual <= 0) return false;
    enemy.hp -= actual;
    if (enemy.hp <= 0) {
      this.killEnemy(enemy, sourceRow, sourceCol);
      return true;
    }
    return false;
  };

  GameEngine.prototype.killEnemy = function(enemy, sourceRow, sourceCol) {
    this.score += enemy.reward * 10;
    this.pushFloatText(enemy.x, enemy.row + 0.3, '+' + enemy.reward, 'kill');
    this.killCount++;
    this.addSteam(enemy.reward, 'kill');
    this.enemies.splice(this.enemies.indexOf(enemy), 1);

    if (sourceRow != null && sourceCol != null) {
      var cell = this.grid[sourceRow][sourceCol];
      if (cell) {
        var def = C.DEFENDERS[cell.id];
        if (def && def.steamOnKill) this.addSteam(def.steamOnKill, 'kill');
      }
      var bloom = this.findDefenderInRange(sourceRow, sourceCol, 2.5, 'foundry_bloom');
      if (bloom) this.addSteam(C.DEFENDERS.foundry_bloom.steamOnKill || 15, 'kill');
    }

    for (var i = 0; i < 8; i++) {
      this.particles.push({
        x: enemy.x,
        y: enemy.row + Math.random() * 0.6,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        life: 0.4 + Math.random() * 0.3,
        kind: 'scrap',
        maxLife: 0.7
      });
    }
  };

  GameEngine.prototype.findDefenderInRange = function(row, col, range, idFilter) {
    for (var r = 0; r < C.ROWS; r++) {
      for (var c = 0; c < C.COLS; c++) {
        var cell = this.grid[r][c];
        if (!cell) continue;
        if (idFilter && cell.id !== idFilter) continue;
        var dist = Math.abs(r - row) + Math.abs(c - col);
        if (dist <= range) return { row: r, col: c, cell: cell };
      }
    }
    return null;
  };

  GameEngine.prototype.nearestEnemyInRow = function(row, col, range) {
    var best = null;
    var bestX = 999;
    for (var i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (e.row !== row) continue;
      if (e.underground && !e.surfaced) continue;
      if (e.x < col) continue;
      if (e.x - col > range) continue;
      if (e.x < bestX) {
        bestX = e.x;
        best = e;
      }
    }
    return best;
  };

  GameEngine.prototype.enemiesInSplash = function(row, x, radius) {
    var hits = [];
    for (var i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (e.row !== row && Math.abs(e.row - row) > 1) continue;
      if (Math.abs(e.x - x) <= radius) hits.push(e);
    }
    return hits;
  };

  GameEngine.prototype.fireProjectile = function(row, col, def, target) {
    this.projectiles.push({
      row: row,
      x: col + 0.5,
      speed: 5.5,
      damage: def.damage,
      sourceRow: row,
      sourceCol: col,
      splash: def.splash || 0,
      chain: def.chain || 0
    });
  };

  GameEngine.prototype.updateDefenders = function(dt) {
    for (var r = 0; r < C.ROWS; r++) {
      for (var c = 0; c < C.COLS; c++) {
        var cell = this.grid[r][c];
        if (!cell) continue;
        var def = C.DEFENDERS[cell.id];
        if (!def) continue;
        cell.timer += dt;

        if (def.kind === 'producer' && def.id === 'ore_collector') {
          if (cell.timer >= C.COLLECTOR_INTERVAL) {
            cell.timer = 0;
            this.addSteam(C.COLLECTOR_AMOUNT, 'collector');
            this.pushFloatText(c + 0.5, r + 0.5, '+' + C.COLLECTOR_AMOUNT, 'collector');
            for (var p = 0; p < 6; p++) {
              this.particles.push({
                x: c + 0.5 + (Math.random() - 0.5) * 0.3,
                y: r + 0.5,
                vx: (Math.random() - 0.5) * 0.4,
                vy: -0.6 - Math.random() * 0.5,
                life: 0.5 + Math.random() * 0.4,
                kind: 'steam',
                maxLife: 0.9
              });
            }
          }
        }

        if (def.kind === 'shooter') {
          if (cell.timer >= def.rate) {
            var target = this.nearestEnemyInRow(r, c, def.range);
            if (target) {
              cell.timer = 0;
              this.fireProjectile(r, c, def, target);
            }
          }
        }

        if (def.kind === 'support') {
          if (cell.timer >= def.rate) {
            var touched = false;
            for (var i = 0; i < this.enemies.length; i++) {
              var e = this.enemies[i];
              if (Math.abs(e.row - r) > 1) continue;
              if (Math.abs(e.x - c) > def.range) continue;
              if (def.id === 'magnet_coil' && e.armor > 0) {
                e.armor = Math.max(0, e.armor - 35);
                touched = true;
              }
              if (def.slow) {
                e.slowed = Math.max(e.slowed, def.slowDur);
                touched = true;
              }
            }
            if (touched) cell.timer = 0;
          }
        }
      }
    }
  };

  GameEngine.prototype.updateProjectiles = function(dt) {
    for (var i = this.projectiles.length - 1; i >= 0; i--) {
      var p = this.projectiles[i];
      p.x += p.speed * dt;
      var hit = null;
      for (var j = 0; j < this.enemies.length; j++) {
        var e = this.enemies[j];
        if (e.underground && !e.surfaced) continue;
        if (Math.abs(e.row - p.row) > 0.45) continue;
        if (Math.abs(e.x - p.x) < 0.35) {
          hit = e;
          break;
        }
      }
      if (hit) {
        if (p.splash > 0) {
          var splashHits = this.enemiesInSplash(p.row, p.x, p.splash);
          for (var s = 0; s < splashHits.length; s++) {
            this.damageEnemy(splashHits[s], p.damage, p.sourceRow, p.sourceCol);
          }
        } else if (p.chain > 0) {
          this.damageEnemy(hit, p.damage, p.sourceRow, p.sourceCol);
          var chained = 0;
          for (var k = 0; k < this.enemies.length && chained < p.chain; k++) {
            var o = this.enemies[k];
            if (o === hit) continue;
            if (Math.abs(o.row - hit.row) <= 1 && Math.abs(o.x - hit.x) < 2.5) {
              this.damageEnemy(o, p.damage * 0.65, p.sourceRow, p.sourceCol);
              chained++;
            }
          }
        } else {
          this.damageEnemy(hit, p.damage, p.sourceRow, p.sourceCol);
        }
        this.projectiles.splice(i, 1);
      } else if (p.x > C.COLS + 1) {
        this.projectiles.splice(i, 1);
      }
    }
  };

  GameEngine.prototype.updateEnemies = function(dt) {
    for (var i = this.enemies.length - 1; i >= 0; i--) {
      var e = this.enemies[i];
      var tmpl = C.ENEMIES[e.type];

      if (e.underground && !e.surfaced && e.x <= (tmpl.surfaceAt || 4.5)) {
        e.surfaced = true;
        e.underground = false;
      }

      var col = Math.floor(e.x);
      var cell = col >= 0 && col < C.COLS ? this.grid[e.row][col] : null;

      if (cell && !e.eating) {
        var def = C.DEFENDERS[cell.id];
        if (def && def.kind === 'trap' && cell.armed) {
          this.damageEnemy(e, def.damage, e.row, col);
          cell.armed = false;
          this.grid[e.row][col] = null;
          continue;
        }
        if (tmpl.jumps && !e.jumped && def && def.kind === 'wall') {
          e.jumped = true;
          e.x = col - 1.15;
          e.eating = false;
          continue;
        }
        if (def && (def.kind === 'wall' || def.kind === 'producer' || def.kind === 'shooter' || def.kind === 'support')) {
          e.eating = true;
          e.eatTimer = 0;
        }
      }

      if (e.eating && cell) {
        e.eatTimer += dt;
        if (e.eatTimer >= 0.45) {
          e.eatTimer = 0;
          cell.hp -= 28 * (tmpl.boss ? 1.8 : 1);
          if (cell.hp <= 0) {
            this.grid[e.row][col] = null;
            e.eating = false;
          }
        }
        continue;
      }

      var spd = e.speed;
      if (e.slowed > 0) {
        e.slowed -= dt;
        spd *= 0.42;
      }
      e.x -= spd * dt;

      if (e.x <= C.REACTOR_COL) {
        if (this.blastDoors[e.row]) {
          this.triggerBlastDoor(e.row);
          this.enemies.splice(i, 1);
          continue;
        }
        this.baseHp -= e.damage;
        this.damageTaken += e.damage;
        this.shake = 0.5;
        this.enemies.splice(i, 1);
        if (this.baseHp <= 0) this.state = 'lost';
      }
    }
  };

  GameEngine.prototype.processActiveSpawns = function(dt) {
    this.waveSpawnElapsed += dt;
    for (var i = 0; i < this.spawnQueue.length; i++) {
      var s = this.spawnQueue[i];
      if (!s.fired && this.waveSpawnElapsed >= s.at) {
        this.spawnEnemy(s.type, s.row);
        s.fired = true;
      }
    }
    this.spawnQueue = this.spawnQueue.filter(function(s) { return !s.fired; });
    if (this.spawnQueue.length === 0) {
      this.wavePhase = 'clearing';
    }
  };

  GameEngine.prototype.processWaves = function(dt) {
    if (this.wavesDone) return;

    if (this.isEndless()) {
      if (this.wavePhase === 'prep') {
        this.phaseTimer -= dt;
        if (this.phaseTimer <= 0) {
          this.spawnEndlessWave();
          this.wavePhase = 'active';
          this.waveSpawnElapsed = 0;
          var label = 'WAVE ' + this.endlessWave;
          if (this.endlessWave % 5 === 0) label = 'HUGE ' + label;
          this.waveBannerPending = label;
        }
        return;
      }
      if (this.wavePhase === 'active') {
        this.processActiveSpawns(dt);
        return;
      }
      if (this.wavePhase === 'clearing' && this.enemies.length === 0) {
        this.beginEndlessPrep();
      }
      return;
    }

    if (this.wavePhase === 'prep') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        this.beginActiveWave();
      }
      return;
    }

    if (this.wavePhase === 'active') {
      this.processActiveSpawns(dt);
      return;
    }

    if (this.wavePhase === 'clearing' && this.enemies.length === 0) {
      var next = this.waveIndex + 1;
      if (this.level && next < this.level.waves.length) {
        this.beginPrepPhase(next);
      } else {
        this.wavesDone = true;
      }
    }
  };

  GameEngine.prototype.spawnEndlessWave = function() {
    this.endlessWave++;
    this.endlessEscalation = Math.min(8, Math.floor(this.endlessWave / 3));
    var types = ['scrap_walker', 'riveted_brute', 'shield_hauler', 'conveyor_hijacker', 'rust_elite', 'amalgam_swarm'];
    var count = 3 + this.endlessWave + this.endlessEscalation;
    this.spawnQueue = [];
    for (var i = 0; i < count; i++) {
      var t = types[Math.min(types.length - 1, Math.floor(Math.random() * (2 + this.endlessEscalation)))];
      this.spawnQueue.push({
        at: 1 + i * (2.2 - Math.min(1, this.endlessEscalation * 0.1)),
        type: t,
        row: i % 5,
        fired: false
      });
    }
    if (this.endlessWave % 5 === 0) {
      this.spawnQueue.push({
        at: 1 + count * 2,
        type: 'clunker_captain',
        row: 2,
        fired: false
      });
      this.gregBark = 'Boss wave! Clunker Captain on the belt!';
      this.gregTimer = 3.5;
    }
  };

  GameEngine.prototype.checkWin = function() {
    if (this.state !== 'playing') return;
    if (this.isEndless()) return;
    if (this.wavesDone && this.wavePhase === 'clearing' && this.enemies.length === 0) {
      this.state = 'won';
    }
  };

  GameEngine.prototype.update = function(dt) {
    if (this.state !== 'playing') return;

    this.passiveTimer += dt;
    if (this.passiveTimer >= 1) {
      this.passiveTimer -= 1;
      this.addSteam(C.PASSIVE_STEAM);
    }

    for (var k in this.cooldowns) {
      if (this.cooldowns[k] > 0) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
    }

    if (this.gregTimer > 0) this.gregTimer -= dt;

    this.processWaves(dt);
    this.updateDefenders(dt);
    this.updateProjectiles(dt);
    this.updateEnemies(dt);
    this.checkWin();

    for (var i = this.particles.length - 1; i >= 0; i--) {
      var pt = this.particles[i];
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }

    for (var f = this.flashCells.length - 1; f >= 0; f--) {
      this.flashCells[f].t -= dt;
      if (this.flashCells[f].t <= 0) this.flashCells.splice(f, 1);
    }

    for (var t = this.floatTexts.length - 1; t >= 0; t--) {
      this.floatTexts[t].life -= dt;
      this.floatTexts[t].row -= dt * 0.35;
      if (this.floatTexts[t].life <= 0) this.floatTexts.splice(t, 1);
    }

    if (this.shake > 0) this.shake -= dt;
  };

  GameEngine.prototype.getWaveDisplay = function() {
    if (!this.level) return '—';
    if (this.isEndless()) {
      if (this.wavePhase === 'prep') return 'NEXT ' + Math.max(1, Math.ceil(this.phaseTimer)) + 's';
      if (this.wavePhase === 'clearing') return 'W' + this.endlessWave + ' · ' + this.enemies.length + ' left';
      return 'WAVE ' + this.endlessWave;
    }
    var total = this.level.waves.length;
    var n = this.waveIndex + 1;
    if (this.wavePhase === 'prep') {
      return 'READY ' + Math.max(1, Math.ceil(this.phaseTimer)) + 's';
    }
    if (this.wavePhase === 'clearing') {
      return 'WAVE ' + n + '/' + total + ' · ' + this.enemies.length;
    }
    return 'WAVE ' + n + '/' + total;
  };

  NS.GameEngine = GameEngine;
  NS.GameStates = { idle: 'idle', playing: 'playing', won: 'won', lost: 'lost', paused: 'paused' };
})(window.ForgeLine = window.ForgeLine || {});
