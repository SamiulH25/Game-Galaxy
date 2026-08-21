/**
 * Last Light — engine.js
 * Pure simulation: beam math, ship steering/wake, collisions, fog, storm, scoring.
 * No DOM, no canvas. Units: world circle radius 1.0 centered on the lighthouse.
 * Namespace: window.LastLight.Engine
 */
window.LastLight = window.LastLight || {};

(function (NS) {
  'use strict';

  var C = NS.Config;

  function TAU() { return Math.PI * 2; }
  function wrapPi(a) {
    while (a > Math.PI) a -= TAU();
    while (a < -Math.PI) a += TAU();
    return a;
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function len(x, y) { return Math.sqrt(x * x + y * y); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  var NEXT_ID = 1;

  function bandIndex(timeSec) {
    var m = timeSec / 60;
    for (var i = 0; i < C.BANDS.length; i++) {
      if (m < C.BANDS[i].untilMin) return i;
    }
    return C.BANDS.length - 1;
  }

  function defaultMeta() {
    return {
      version: C.SAVE_VERSION,
      bestScore: 0,
      totals: { nights: 0, docks: 0, wrecks: 0, bestCombo: 0, stormsSurvived: 0 },
      log: [],
      settings: { reduceFlash: false, showBeamHint: true },
      unlocked: [],
    };
  }

  function Engine() {
    this.meta = defaultMeta();
    this.reset();
  }

  Engine.prototype.reset = function () {
    this.state = 'idle';          // idle | night | dawn
    this.paused = false;
    this.time = 0;
    this.band = 0;

    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.lanterns = C.LANTERNS;
    this.docks = 0;
    this.wrecks = 0;
    this.stormsSurvived = 0;
    this.sloopDocks = 0;
    this.bargeDocks = 0;

    this.aim = -Math.PI / 2;      // start aimed north
    this.focus = false;

    this.ships = [];
    this.fangs = [];
    this.pendingFangs = 0;
    this.fangRetryT = 0;

    this.spawnT = 2.2;
    this.ghostT = rand(C.GHOST_GAP_MIN, C.GHOST_GAP_MAX);

    this.storm = {
      phase: 'none',              // none | warn | active
      t: rand(C.STORM_GAP_MIN, C.STORM_GAP_MAX),
      dx: 0, dy: 0, power: 0,
      clean: true, clock: 0, flashes: [],
    };
    this.flash = 0;

    this.fog = 0.15;
    this.fogPhase = rand(0, TAU());

    this.ghostHere = false;

    this.dawnT = 0;
    this.result = null;
    this.events = [];
  };

  // --- Night lifecycle ---

  Engine.prototype.startNight = function () {
    this.reset();
    this.generateFangs(C.BANDS[0].fangs);
    this.state = 'night';
    this.events.push({ type: 'night_start' });
  };

  Engine.prototype.generateFangs = function (count) {
    this.fangs = [];
    var tries = 0;
    while (this.fangs.length < C.FANG_MAX && tries < 400) {
      tries++;
      var a = rand(0, TAU());
      if (Math.abs(wrapPi(a)) < 0.22) continue; // keep the channel approach readable
      var r = rand(C.FANG_RMIN, C.FANG_RMAX);
      var x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (len(x, y) < C.ISLAND_R + 0.12) continue;
      var ok = true;
      for (var i = 0; i < this.fangs.length; i++) {
        if (len(x - this.fangs[i].x, y - this.fangs[i].y) < 0.17) { ok = false; break; }
      }
      if (!ok) continue;
      this.fangs.push({
        x: x, y: y,
        r: rand(0.028, 0.042),
        on: this.fangs.length < count,
        ph: rand(0, TAU()),
      });
    }
    this.pendingFangs = Math.max(0, count - this.enabledFangCount());
  };

  Engine.prototype.enabledFangCount = function () {
    var n = 0;
    for (var i = 0; i < this.fangs.length; i++) if (this.fangs[i].on) n++;
    return n;
  };

  Engine.prototype.endNight = function () {
    this.state = 'dawn';
    this.focus = false;
    this.result = {
      score: this.score,
      docks: this.docks,
      wrecks: this.wrecks,
      bestCombo: this.bestCombo,
      storms: this.stormsSurvived,
      time: this.time,
    };
    this.events.push({ type: 'night_end', data: this.result });
  };

  // --- Input surface ---

  Engine.prototype.beamHalf = function () {
    return C.BEAM_HALF * (this.focus ? C.BEAM_FOCUS_MULT : 1);
  };
  Engine.prototype.setAim = function (a) { this.aim = wrapPi(a); };
  Engine.prototype.rotateAim = function (d) { this.aim = wrapPi(this.aim + d); };
  Engine.prototype.setFocus = function (on) { this.focus = !!on; };
  Engine.prototype.bandDef = function () { return C.BANDS[this.band]; };

  // --- Spawning ---

  Engine.prototype.spawnShip = function () {
    var B = this.bandDef();
    var type = pick(B.types);
    var def = C.SHIPS[type];
    var a = rand(0, TAU());
    var r = rand(C.SPAWN_R_MIN, C.SPAWN_R_MAX);
    this.ships.push({
      id: NEXT_ID++,
      type: type,
      x: Math.cos(a) * r,
      y: Math.sin(a) * r,
      heading: a + Math.PI + rand(-0.25, 0.25),
      spd: def.drift * B.driftMult,
      woke: def.wakeNeed <= 0,
      litT: 0,
      lit: false,
      wasLit: false,
      wakeT: 0,
      lastAim: this.aim,
      wobP: rand(0, TAU()),
      wobF: rand(0.25, 0.55),
      wobA: rand(0.12, 0.26),
      trail: [],
      trailT: 0,
      everLit: false,
      dead: false,
    });
  };

  Engine.prototype.spawnGhost = function () {
    var x = 0, y = 0, heading = 0;
    for (var t = 0; t < 12; t++) {
      var a = rand(0, TAU());
      heading = a + Math.PI + (Math.random() < 0.5 ? 1 : -1) * rand(0.32, 0.6);
      x = Math.cos(a) * 1.02;
      y = Math.sin(a) * 1.02;
      var px = -Math.sin(heading), py = Math.cos(heading);
      if (Math.abs(x * py - y * px) > 0.16) break; // chord clears the island
    }
    this.ships.push({
      id: NEXT_ID++,
      type: 'ghost',
      x: x, y: y,
      heading: heading,
      spd: C.SHIPS.ghost.speed,
      woke: false,
      litT: 0, lit: false, wasLit: false, wakeT: 0, lastAim: this.aim,
      wobP: 0, wobF: 0, wobA: 0,
      trail: [], trailT: 0,
      everLit: false,
      dead: false,
    });
    this.events.push({ type: 'ghost_spawn' });
  };

  // --- Update ---

  Engine.prototype.update = function (dt) {
    if (this.state === 'dawn') {
      this.dawnT += dt;
      this.flash = Math.max(0, this.flash - dt);
      return;
    }
    if (this.state !== 'night') return;

    this.time += dt;

    // Band escalation
    var bi = bandIndex(this.time);
    if (bi !== this.band) {
      this.band = bi;
      this.pendingFangs = Math.max(0, C.BANDS[bi].fangs - this.enabledFangCount());
      this.events.push({ type: 'band', data: { index: bi } });
    }

    // Fog cycle
    var B = this.bandDef();
    this.fogPhase += (TAU() / C.FOG_PERIOD) * dt;
    var fogTarget = clamp(B.fogBase + B.fogAmp * (0.5 + 0.5 * Math.sin(this.fogPhase)), 0, 0.92);
    this.fog += (fogTarget - this.fog) * Math.min(1, dt * 0.7);

    // Storm machine
    var st = this.storm;
    st.t -= dt;
    if (st.phase === 'none' && st.t <= 0) {
      st.phase = 'warn';
      st.t = C.STORM_WARN;
      this.events.push({ type: 'storm_warn' });
    } else if (st.phase === 'warn' && st.t <= 0) {
      var wa = rand(0, TAU());
      st.phase = 'active';
      st.t = C.STORM_DUR;
      st.clock = 0;
      st.dx = Math.cos(wa);
      st.dy = Math.sin(wa);
      st.power = B.windPower * rand(0.85, 1.2);
      st.clean = true;
      st.flashes = [];
      for (var fi = 0; fi < C.LIGHTNINGS_PER_STORM; fi++) {
        st.flashes.push(rand(1.5, C.STORM_DUR - 1));
      }
      this.events.push({ type: 'storm_start' });
    } else if (st.phase === 'active') {
      st.clock += dt;
      for (var fj = st.flashes.length - 1; fj >= 0; fj--) {
        if (st.clock >= st.flashes[fj]) {
          st.flashes.splice(fj, 1);
          this.flash = C.LIGHTNING_DUR;
          this.events.push({ type: 'lightning' });
        }
      }
      if (st.t <= 0) {
        st.phase = 'none';
        st.t = rand(C.STORM_GAP_MIN, C.STORM_GAP_MAX);
        if (st.clean) this.stormsSurvived++;
        this.events.push({ type: 'storm_end', data: { clean: st.clean } });
      }
    }
    this.flash = Math.max(0, this.flash - dt);

    // Safe mid-night fang activation
    if (this.pendingFangs > 0) {
      this.fangRetryT -= dt;
      if (this.fangRetryT <= 0) {
        this.fangRetryT = 1.0;
        for (var i2 = 0; i2 < this.fangs.length && this.pendingFangs > 0; i2++) {
          var f2 = this.fangs[i2];
          if (f2.on) continue;
          var safe = true;
          for (var j = 0; j < this.ships.length; j++) {
            var sp = this.ships[j];
            if (len(sp.x - f2.x, sp.y - f2.y) < C.FANG_CLEARANCE + C.SHIPS[sp.type].r) {
              safe = false;
              break;
            }
          }
          if (safe) { f2.on = true; this.pendingFangs--; }
        }
      }
    }

    // Spawns
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnShip();
      this.spawnT = B.spawnEvery * rand(1 - C.SPAWN_JITTER, 1 + C.SPAWN_JITTER);
    }
    if (this.time >= C.GHOST_FROM_MIN) {
      this.ghostT -= dt;
      if (this.ghostT <= 0) {
        if (!this.ghostHere) {
          this.spawnGhost();
          this.ghostT = rand(C.GHOST_GAP_MIN, C.GHOST_GAP_MAX);
        } else {
          this.ghostT = 4;
        }
      }
    }

    // Ships (backward so removals are safe)
    this.ghostHere = false;
    for (var si = this.ships.length - 1; si >= 0; si--) {
      var s = this.ships[si];
      if (s.dead) continue;
      this.updateShip(s, dt);
      if (s.type === 'ghost' && !s.dead) this.ghostHere = true;
    }
  };

  Engine.prototype.updateShip = function (s, dt) {
    var def = C.SHIPS[s.type];
    var d = len(s.x, s.y);
    var ang = Math.atan2(s.y, s.x);
    var inBeam = d < C.BEAM_REACH && Math.abs(wrapPi(ang - this.aim)) < this.beamHalf();

    s.wasLit = s.lit;
    s.lit = inBeam;

    if (def.hull === 'ghost') {
      this.updateGhost(s, dt, d, ang);
      return;
    }

    // Wake / obedience
    if (inBeam) {
      s.lastAim = this.aim;
      s.wakeT = this.focus ? C.WAKE_FOCUSED : C.WAKE_NORMAL;
      if (!s.woke) {
        s.litT += dt;
        if (s.litT >= def.wakeNeed) {
          s.woke = true;
          this.events.push({ type: 'wake', data: { type: s.type } });
        }
      } else if (!s.wasLit) {
        this.events.push({ type: 'wake', data: { type: s.type } });
      }
      s.everLit = true;
    } else if (s.woke && s.wakeT > 0) {
      s.wakeT -= dt;
    }

    // Steering: lit/waking ships ease toward the beam's aim angle; asleep ships
    // resume a wobbling inward drift.
    var target, strength;
    if (s.woke && (s.lit || s.wakeT > 0)) {
      target = s.lastAim;
      strength = s.lit ? 1 : clamp(s.wakeT / C.WAKE_NORMAL, 0.15, 1);
    } else {
      s.wobP += s.wobF * dt;
      target = Math.atan2(-s.y, -s.x) + Math.sin(s.wobP) * s.wobA;
      strength = 1;
    }
    var turn = def.turn * strength;
    s.heading += clamp(wrapPi(target - s.heading), -turn * dt, turn * dt);

    // Speed with momentum (barge is heaviest)
    var obedient = s.woke && (s.lit || s.wakeT > 0);
    var want = obedient ? def.speed : def.drift * this.bandDef().driftMult;
    var k = s.type === 'barge' ? 0.55 : 1.6;
    s.spd += (want - s.spd) * Math.min(1, dt * k);

    s.x += Math.cos(s.heading) * s.spd * dt;
    s.y += Math.sin(s.heading) * s.spd * dt;
    this.applyWind(s, dt);

    this.pushTrail(s, dt);
    this.collide(s);
  };

  Engine.prototype.updateGhost = function (s, dt, d, ang) {
    var def = C.SHIPS.ghost;
    var inBeam = d < C.BEAM_REACH && Math.abs(wrapPi(ang - this.aim)) < this.beamHalf();
    s.lit = inBeam;

    if (!s.woke) {
      if (inBeam) {
        s.woke = true;
        s.everLit = true;
        this.events.push({ type: 'ghost_wake' });
      }
    }

    if (!s.woke) {
      // Blind straight drift; immune to every rock.
      s.x += Math.cos(s.heading) * s.spd * dt;
      s.y += Math.sin(s.heading) * s.spd * dt;
      this.applyWind(s, dt);
      this.pushTrail(s, dt);
      if (d > C.WORLD_R + C.LOST_MARGIN) {
        var outward = (s.x * Math.cos(s.heading) + s.y * Math.sin(s.heading)) > 0;
        if (outward) {
          this.removeShip(s);
          if (!s.everLit) {
            this.score += C.GHOST_GRACE;
            this.events.push({ type: 'ghost_pass_clean', data: { grace: C.GHOST_GRACE } });
          }
          this.events.push({ type: 'ghost_gone', data: { clean: !s.everLit } });
        }
      }
      return;
    }

    // Awake: it steers for the lighthouse rock and collides with everything.
    var ta = Math.atan2(-s.y, -s.x);
    s.heading += clamp(wrapPi(ta - s.heading), -def.turn * dt, def.turn * dt);
    s.x += Math.cos(s.heading) * s.spd * dt;
    s.y += Math.sin(s.heading) * s.spd * dt;
    this.pushTrail(s, dt);

    if (d > C.WORLD_R + C.LOST_MARGIN) {
      this.removeShip(s);
      this.events.push({ type: 'ghost_gone', data: { clean: false } });
      return;
    }
    if (d < C.ISLAND_R + def.r) { this.wreck(s, 'island'); return; }
    var inGap = Math.abs(wrapPi(ang)) < C.GAP_HALF;
    if (!inGap && Math.abs(d - C.REEF_R) < C.REEF_BAND + def.r) { this.wreck(s, 'reef'); return; }
    for (var i = 0; i < this.fangs.length; i++) {
      var f = this.fangs[i];
      if (f.on && len(s.x - f.x, s.y - f.y) < f.r + def.r) { this.wreck(s, 'fang'); return; }
    }
  };

  Engine.prototype.applyWind = function (s, dt) {
    if (this.storm.phase !== 'active') return;
    s.x += this.storm.dx * this.storm.power * dt;
    s.y += this.storm.dy * this.storm.power * dt;
  };

  Engine.prototype.pushTrail = function (s, dt) {
    s.trailT -= dt;
    if (s.trailT <= 0) {
      s.trail.push({ x: s.x, y: s.y, life: 1 });
      if (s.trail.length > 14) s.trail.shift();
      s.trailT = 0.1;
    }
    for (var i = 0; i < s.trail.length; i++) s.trail[i].life -= dt / 1.1;
  };

  Engine.prototype.collide = function (s) {
    var def = C.SHIPS[s.type];
    var d = len(s.x, s.y);
    var ang = Math.atan2(s.y, s.x);

    if (d > C.WORLD_R + C.LOST_MARGIN) {
      this.removeShip(s);
      this.events.push({ type: 'lost', data: { type: s.type } });
      return;
    }

    var inGap = Math.abs(wrapPi(ang)) < C.GAP_HALF;

    if (d <= C.REEF_R && inGap) { this.dock(s); return; }
    if (!inGap && Math.abs(d - C.REEF_R) < C.REEF_BAND + def.r) { this.wreck(s, 'reef'); return; }
    if (d < C.ISLAND_R + def.r) { this.wreck(s, 'island'); return; }
    for (var i = 0; i < this.fangs.length; i++) {
      var f = this.fangs[i];
      if (f.on && len(s.x - f.x, s.y - f.y) < f.r + def.r) { this.wreck(s, 'fang'); return; }
    }
  };

  Engine.prototype.dock = function (s) {
    var def = C.SHIPS[s.type];
    this.combo++;
    if (this.combo > this.bestCombo) this.bestCombo = this.combo;
    var mult = Math.min(C.COMBO_CAP, 1 + C.COMBO_STEP * (this.combo - 1));
    var pts = Math.round(def.points * mult);
    var storming = this.storm.phase === 'active';
    if (storming) pts += C.STORM_BONUS;
    this.score += pts;
    this.docks++;
    if (s.type === 'sloop') this.sloopDocks++;
    if (s.type === 'barge') this.bargeDocks++;
    if (C.MILESTONES.indexOf(this.combo) !== -1) {
      this.events.push({ type: 'milestone', data: { combo: this.combo } });
    }
    this.removeShip(s);
    this.events.push({
      type: 'dock',
      data: { x: s.x, y: s.y, type: s.type, points: pts, mult: mult, combo: this.combo, storm: storming },
    });
  };

  Engine.prototype.wreck = function (s, cause) {
    this.combo = 0;
    this.wrecks++;
    this.lanterns--;
    if (this.storm.phase === 'active') this.storm.clean = false;
    this.removeShip(s);
    this.events.push({
      type: 'wreck',
      data: { x: s.x, y: s.y, cause: cause, lanterns: Math.max(0, this.lanterns), type: s.type },
    });
    if (this.lanterns <= 0) this.endNight();
  };

  Engine.prototype.removeShip = function (s) {
    s.dead = true;
    var i = this.ships.indexOf(s);
    if (i !== -1) this.ships.splice(i, 1);
  };

  Engine.prototype.takeEvents = function () {
    var e = this.events;
    this.events = [];
    return e;
  };

  // --- Meta / save blob ---

  Engine.prototype.serializeMeta = function () {
    return JSON.parse(JSON.stringify(this.meta));
  };

  Engine.prototype.applyMeta = function (data) {
    if (!data || typeof data !== 'object') {
      this.meta = defaultMeta();
      return;
    }
    var m = defaultMeta();
    if (typeof data.bestScore === 'number' && data.bestScore >= 0) m.bestScore = data.bestScore;
    if (data.totals && typeof data.totals === 'object') {
      var keys = ['nights', 'docks', 'wrecks', 'bestCombo', 'stormsSurvived'];
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (typeof data.totals[k] === 'number' && data.totals[k] >= 0) m.totals[k] = data.totals[k];
      }
    }
    if (Object.prototype.toString.call(data.log) === '[object Array]') {
      for (var j = 0; j < data.log.length && m.log.length < 8; j++) {
        var e = data.log[j];
        if (e && typeof e === 'object' && typeof e.score === 'number') {
          m.log.push({
            date: typeof e.date === 'string' ? e.date : '',
            docks: e.docks | 0,
            wrecks: e.wrecks | 0,
            bestCombo: e.bestCombo | 0,
            score: e.score,
          });
        }
      }
    }
    if (data.settings && typeof data.settings === 'object') {
      m.settings.reduceFlash = data.settings.reduceFlash === true;
      m.settings.showBeamHint = data.settings.showBeamHint !== false;
    }
    if (Object.prototype.toString.call(data.unlocked) === '[object Array]') {
      for (var u = 0; u < data.unlocked.length; u++) {
        if (typeof data.unlocked[u] === 'string') m.unlocked.push(data.unlocked[u]);
      }
    }
    this.meta = m;
  };

  Engine.prototype.recordNight = function () {
    var t = this.meta.totals;
    t.nights++;
    t.docks += this.docks;
    t.wrecks += this.wrecks;
    if (this.bestCombo > t.bestCombo) t.bestCombo = this.bestCombo;
    t.stormsSurvived += this.stormsSurvived;
    var newPB = this.score > this.meta.bestScore;
    if (newPB) this.meta.bestScore = this.score;
    var d = new Date();
    this.meta.log.unshift({
      date: d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()),
      docks: this.docks,
      wrecks: this.wrecks,
      bestCombo: this.bestCombo,
      score: this.score,
    });
    if (this.meta.log.length > 8) this.meta.log.length = 8;
    return newPB;
  };

  Engine.prototype.lifetimeDocks = function () {
    return this.meta.totals.docks + this.docks;
  };

  NS.Engine = Engine;
})(window.LastLight);
