/**
 * Neon Siege — Game logic (Geometry Wars-inspired twin-stick arena)
 */
window.NeonGame = (function() {
  var WORLD_W = 1600;
  var WORLD_H = 1000;
  var PLAYER_SPEED = 320;
  var PLAYER_SIZE = 14;
  var FIRE_RATE = 0.06;
  var BULLET_SPEED = 700;
  var BULLET_LIFE = 1.2;
  var LUMEN_LIFE = 3.0;
  var MULT_CAP = 150;

  var STATES = { MENU: 0, PLAYING: 1, PAUSED: 2, GAME_OVER: 3 };

  function rand(a, b) { return a + Math.random() * (b - a); }
  function dist(ax, ay, bx, by) { var dx = bx-ax, dy = by-ay; return Math.sqrt(dx*dx+dy*dy); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function wrapAngle(a) { while (a > Math.PI) a -= Math.PI*2; while (a < -Math.PI) a += Math.PI*2; return a; }

  function NeonGame(renderer) {
    this.renderer = renderer;
    this.state = STATES.MENU;
    this.worldW = WORLD_W;
    this.worldH = WORLD_H;

    this.player = { x: WORLD_W/2, y: WORLD_H/2, angle: 0, invuln: 0 };
    this.bullets = [];
    this.enemies = [];
    this.lumens = [];
    this.particles = [];

    this.score = 0;
    this.multiplier = 1;
    this.lives = 3;
    this.bombs = 3;
    this.time = 0;
    this.fireTimer = 0;
    this.spawnTimer = 0;
    this.difficulty = 1;
    this.spreadFire = false;
    this.spreadAlt = false;
    this.flash = 0;
    this.flashColor = [1, 0.8, 0.4];

    this.stats = { kills: 0, bombKills: 0, lumens: 0 };
    this.achievements = { first_blood: false, multiplier_10: false, bomb_master: false, survivor: false, centurion: false };

    this.keys = {};
    this.mouse = { x: WORLD_W/2, y: WORLD_H/2, down: false };
    this.camera = { x: 0, y: 0 };
  }

  NeonGame.prototype.reset = function(keepStats) {
    var stats = keepStats ? this.stats : { kills: 0, bombKills: 0, lumens: 0 };
    var ach = keepStats ? this.achievements : { first_blood: false, multiplier_10: false, bomb_master: false, survivor: false, centurion: false };

    this.player = { x: WORLD_W/2, y: WORLD_H/2, angle: 0, invuln: 2 };
    this.bullets = [];
    this.enemies = [];
    this.lumens = [];
    this.particles = [];
    this.score = 0;
    this.multiplier = 1;
    this.lives = 3;
    this.bombs = 3;
    this.time = 0;
    this.fireTimer = 0;
    this.spawnTimer = 1;
    this.difficulty = 1;
    this.spreadFire = false;
    this.flash = 0;
    this.stats = stats;
    this.achievements = ach;
    this.state = STATES.PLAYING;
  };

  NeonGame.prototype.start = function() { this.reset(false); };

  NeonGame.prototype._bounce = function(e, margin) {
    margin = margin || 0;
    if (e.x < margin) { e.x = margin; e.vx = Math.abs(e.vx); }
    if (e.x > WORLD_W - margin) { e.x = WORLD_W - margin; e.vx = -Math.abs(e.vx); }
    if (e.y < margin) { e.y = margin; e.vy = Math.abs(e.vy); }
    if (e.y > WORLD_H - margin) { e.y = WORLD_H - margin; e.vy = -Math.abs(e.vy); }
  };

  NeonGame.prototype._spawnEnemy = function(type, x, y) {
    var e = {
      type: type, x: x, y: y, vx: 0, vy: 0, hp: 1, angle: 0,
      segments: null, chargeTimer: 0, charging: false
    };
    switch (type) {
      case 'wanderer':
        e.vx = rand(-80, 80); e.vy = rand(-80, 80);
        e.hp = 1; e.color = [0.6, 0.2, 0.9]; e.points = 25; e.lumens = randi(1, 3);
        e.size = 10; break;
      case 'grunt':
        e.hp = 1; e.color = [1, 0.3, 0.2]; e.points = 50; e.lumens = randi(1, 3);
        e.size = 11; break;
      case 'spinner':
        e.hp = 1; e.orbitAngle = rand(0, Math.PI*2); e.orbitDist = rand(120, 280);
        e.orbitSpeed = rand(1.5, 2.5) * (Math.random() < 0.5 ? 1 : -1);
        e.color = [0.3, 0.9, 0.5]; e.points = 100; e.lumens = randi(2, 4);
        e.size = 9; break;
      case 'snake':
        e.hp = 1; e.segments = [];
        var len = randi(5, 9);
        for (var i = 0; i < len; i++) {
          e.segments.push({ x: x - i * 16, y: y });
        }
        e.color = [0.2, 0.8, 1]; e.points = 150; e.lumens = randi(3, 5);
        e.size = 12; break;
      case 'charger':
        e.hp = 1; e.chargeTimer = rand(1, 2.5); e.charging = false;
        e.color = [1, 0.5, 0.1]; e.colorBack = [0.2, 0.5, 1];
        e.points = 150; e.lumens = randi(3, 5); e.size = 14; break;
    }
    this.enemies.push(e);
  };

  function randi(a, b) { return Math.floor(rand(a, b + 1)); }

  NeonGame.prototype._spawnWave = function() {
    var p = this.player;
    var roll = Math.random();
    var edge = randi(0, 3);
    var x, y, margin = 30;
    if (edge === 0) { x = rand(margin, WORLD_W-margin); y = margin; }
    else if (edge === 1) { x = WORLD_W-margin; y = rand(margin, WORLD_H-margin); }
    else if (edge === 2) { x = rand(margin, WORLD_W-margin); y = WORLD_H-margin; }
    else { x = margin; y = rand(margin, WORLD_H-margin); }

    if (this.difficulty < 2) {
      this._spawnEnemy('wanderer', x, y);
      if (Math.random() < 0.3) this._spawnEnemy('wanderer', x + rand(-40,40), y + rand(-40,40));
    } else if (this.difficulty < 4) {
      this._spawnEnemy(Math.random() < 0.6 ? 'grunt' : 'wanderer', x, y);
      if (Math.random() < 0.25) this._spawnEnemy('spinner', p.x + rand(-200,200), p.y + rand(-200,200));
    } else if (this.difficulty < 7) {
      var types = ['grunt', 'spinner', 'snake'];
      this._spawnEnemy(types[randi(0, types.length-1)], x, y);
      if (Math.random() < 0.35) this._spawnEnemy('grunt', x + rand(-60,60), y + rand(-60,60));
    } else {
      var late = ['grunt', 'spinner', 'snake', 'charger'];
      this._spawnEnemy(late[randi(0, late.length-1)], x, y);
      if (Math.random() < 0.5) {
        var cx = p.x + Math.cos(rand(0, Math.PI*2)) * rand(150, 250);
        var cy = p.y + Math.sin(rand(0, Math.PI*2)) * rand(150, 250);
        for (var i = 0; i < randi(4, 8); i++) {
          var a = (i / 8) * Math.PI * 2;
          this._spawnEnemy('wanderer', cx + Math.cos(a)*40, cy + Math.sin(a)*40);
        }
      }
    }
  };

  NeonGame.prototype._fireBullet = function(angle, speed) {
    speed = speed || BULLET_SPEED;
    var p = this.player;
    this.bullets.push({
      x: p.x + Math.cos(angle) * (PLAYER_SIZE + 4),
      y: p.y + Math.sin(angle) * (PLAYER_SIZE + 4),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: BULLET_LIFE
    });
  };

  NeonGame.prototype._shoot = function() {
    var p = this.player;
    var baseAngle = Math.atan2(this.mouse.y - p.y, this.mouse.x - p.x);
    if (this.spreadFire) {
      if (this.spreadAlt) {
        for (var i = -2; i <= 2; i++) this._fireBullet(baseAngle + i * 0.18);
      } else {
        this._fireBullet(baseAngle);
        this._fireBullet(baseAngle + 0.35);
        this._fireBullet(baseAngle - 0.35);
        this._fireBullet(baseAngle + Math.PI);
      }
      this.spreadAlt = !this.spreadAlt;
    } else {
      this._fireBullet(baseAngle - 0.08);
      this._fireBullet(baseAngle + 0.08);
    }
  };

  NeonGame.prototype._spawnLumens = function(x, y, count) {
    for (var i = 0; i < count; i++) {
      var a = rand(0, Math.PI * 2);
      this.lumens.push({
        x: x, y: y,
        vx: Math.cos(a) * rand(40, 120),
        vy: Math.sin(a) * rand(40, 120),
        life: LUMEN_LIFE
      });
    }
  };

  NeonGame.prototype._burst = function(x, y, r, g, b, count) {
    for (var i = 0; i < count; i++) {
      var a = rand(0, Math.PI * 2);
      var spd = rand(60, 200);
      this.particles.push({
        x: x, y: y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: rand(0.2, 0.6), maxLife: 0.6,
        r: r, g: g, b: b, a: 1
      });
    }
  };

  NeonGame.prototype._killEnemy = function(e, byBomb) {
    var idx = this.enemies.indexOf(e);
    if (idx < 0) return;
    this.enemies.splice(idx, 1);
    this.score += e.points * this.multiplier;
    this._spawnLumens(e.x, e.y, e.lumens || 1);
    this._burst(e.x, e.y, e.color[0], e.color[1], e.color[2], 12);
    this.stats.kills++;
    if (byBomb) this.stats.bombKills++;
    if (!this.achievements.first_blood) this.achievements.first_blood = true;
    if (this.score >= 100000) this.achievements.centurion = true;
    if (this.score >= 10000 && !this.spreadFire) this.spreadFire = true;
    if (this.score >= 75000 && this.lives < 5) this.lives++;
    if (this.score >= 100000 && this.bombs < 5) this.bombs++;
  };

  NeonGame.prototype._novaBomb = function() {
    if (this.bombs <= 0 || this.state !== STATES.PLAYING) return;
    this.bombs--;
    this.flash = 1;
    this.flashColor = [0.4, 1, 0.9];
    var copy = this.enemies.slice();
    for (var i = 0; i < copy.length; i++) this._killEnemy(copy[i], true);
    this._burst(this.player.x, this.player.y, 0.3, 1, 0.8, 40);
    if (this.stats.bombKills >= 50) this.achievements.bomb_master = true;
  };

  NeonGame.prototype._hurtPlayer = function() {
    if (this.player.invuln > 0) return;
    this.lives--;
    this.multiplier = 1;
    this.player.invuln = 2.5;
    this._burst(this.player.x, this.player.y, 1, 0.2, 0.2, 20);
    if (this.lives <= 0) {
      this.state = STATES.GAME_OVER;
    }
  };

  NeonGame.prototype._circleHit = function(ax, ay, ar, bx, by, br) {
    var d = dist(ax, ay, bx, by);
    return d < ar + br;
  };

  NeonGame.prototype.update = function(dt) {
    if (this.state !== STATES.PLAYING) return;

    this.time += dt;
    this.difficulty = 1 + this.time / 30;
    if (this.time >= 180) this.achievements.survivor = true;
    if (this.multiplier >= 10) this.achievements.multiplier_10 = true;

    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3);
    if (this.player.invuln > 0) this.player.invuln -= dt;

    // Player movement
    var p = this.player;
    var mx = 0, my = 0;
    if (this.keys['w'] || this.keys['ArrowUp']) my -= 1;
    if (this.keys['s'] || this.keys['ArrowDown']) my += 1;
    if (this.keys['a'] || this.keys['ArrowLeft']) mx -= 1;
    if (this.keys['d'] || this.keys['ArrowRight']) mx += 1;
    if (mx !== 0 || my !== 0) {
      var len = Math.sqrt(mx*mx + my*my);
      p.x += (mx/len) * PLAYER_SPEED * dt;
      p.y += (my/len) * PLAYER_SPEED * dt;
    }
    p.x = clamp(p.x, PLAYER_SIZE, WORLD_W - PLAYER_SIZE);
    p.y = clamp(p.y, PLAYER_SIZE, WORLD_H - PLAYER_SIZE);
    p.angle = Math.atan2(this.mouse.y - p.y, this.mouse.x - p.x);

    // Camera follow
    var rw = this.renderer.w, rh = this.renderer.h;
    this.camera.x = clamp(p.x - rw/2, 0, Math.max(0, WORLD_W - rw));
    this.camera.y = clamp(p.y - rh/2, 0, Math.max(0, WORLD_H - rh));

    // Shooting
    this.fireTimer -= dt;
    if ((this.mouse.down || this.keys[' ']) && this.fireTimer <= 0) {
      this._shoot();
      this.fireTimer = FIRE_RATE;
    }

    // Spawning
    this.spawnTimer -= dt;
    var interval = Math.max(0.4, 2.0 - this.difficulty * 0.15);
    if (this.spawnTimer <= 0) {
      this._spawnWave();
      this.spawnTimer = interval;
    }

    // Bullets
    for (var bi = this.bullets.length - 1; bi >= 0; bi--) {
      var b = this.bullets[bi];
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > WORLD_W+20 || b.y < -20 || b.y > WORLD_H+20) {
        this.bullets.splice(bi, 1);
      }
    }

    // Enemies
    for (var ei = 0; ei < this.enemies.length; ei++) {
      var e = this.enemies[ei];
      if (e.type === 'wanderer') {
        e.x += e.vx * dt; e.y += e.vy * dt;
        if (Math.random() < 0.02) { e.vx += rand(-30,30); e.vy += rand(-30,30); }
        var spd = Math.sqrt(e.vx*e.vx + e.vy*e.vy);
        if (spd > 120) { e.vx *= 120/spd; e.vy *= 120/spd; }
        this._bounce(e, e.size);
      } else if (e.type === 'grunt') {
        var ga = Math.atan2(p.y - e.y, p.x - e.x);
        e.vx = Math.cos(ga) * 100; e.vy = Math.sin(ga) * 100;
        e.x += e.vx * dt; e.y += e.vy * dt;
      } else if (e.type === 'spinner') {
        e.orbitAngle += e.orbitSpeed * dt;
        e.x = p.x + Math.cos(e.orbitAngle) * e.orbitDist;
        e.y = p.y + Math.sin(e.orbitAngle) * e.orbitDist;
      } else if (e.type === 'snake') {
        var head = e.segments[0];
        var sa = Math.atan2(p.y - head.y, p.x - head.x);
        head.x += Math.cos(sa) * 90 * dt;
        head.y += Math.sin(sa) * 90 * dt;
        for (var si = 1; si < e.segments.length; si++) {
          var prev = e.segments[si-1], cur = e.segments[si];
          var da = Math.atan2(prev.y - cur.y, prev.x - cur.x);
          cur.x = prev.x - Math.cos(da) * 14;
          cur.y = prev.y - Math.sin(da) * 14;
        }
        e.x = head.x; e.y = head.y;
      } else if (e.type === 'charger') {
        e.chargeTimer -= dt;
        if (!e.charging && e.chargeTimer <= 0) {
          e.charging = true;
          e.chargeTimer = 0.6;
          var ca = Math.atan2(p.y - e.y, p.x - e.x);
          e.vx = Math.cos(ca) * 450; e.vy = Math.sin(ca) * 450;
          e.angle = ca;
        } else if (e.charging) {
          e.x += e.vx * dt; e.y += e.vy * dt;
          if (e.chargeTimer <= 0) {
            e.charging = false;
            e.chargeTimer = rand(1.5, 3);
            e.vx = e.vy = 0;
          }
        }
        this._bounce(e, e.size);
      }

      // Bullet collisions
      for (var bj = this.bullets.length - 1; bj >= 0; bj--) {
        var bull = this.bullets[bj];
        var hit = false;
        if (e.type === 'snake') {
          if (this._circleHit(bull.x, bull.y, 3, e.segments[0].x, e.segments[0].y, e.size * 0.7)) hit = true;
        } else if (e.type === 'charger') {
          var fromFront = Math.abs(wrapAngle(Math.atan2(bull.y - e.y, bull.x - e.x) - e.angle)) < Math.PI/2;
          if (!fromFront && this._circleHit(bull.x, bull.y, 3, e.x, e.y, e.size * 0.6)) hit = true;
        } else {
          if (this._circleHit(bull.x, bull.y, 3, e.x, e.y, e.size)) hit = true;
        }
        if (hit) {
          this.bullets.splice(bj, 1);
          this._killEnemy(e);
          ei--;
          break;
        }
      }

      // Player collision
      if (ei >= 0 && this.player.invuln <= 0) {
        var phit = false;
        if (e.type === 'snake') {
          for (var sk = 0; sk < e.segments.length; sk++) {
            if (this._circleHit(p.x, p.y, PLAYER_SIZE, e.segments[sk].x, e.segments[sk].y, 8)) { phit = true; break; }
          }
        } else {
          phit = this._circleHit(p.x, p.y, PLAYER_SIZE, e.x, e.y, e.size);
        }
        if (phit) this._hurtPlayer();
      }
    }

    // Lumens
    for (var li = this.lumens.length - 1; li >= 0; li--) {
      var l = this.lumens[li];
      l.x += l.vx * dt; l.y += l.vy * dt;
      l.vx *= 0.95; l.vy *= 0.95;
      l.life -= dt;
      if (l.life <= 0) { this.lumens.splice(li, 1); continue; }
      if (this._circleHit(p.x, p.y, PLAYER_SIZE + 8, l.x, l.y, 6)) {
        this.multiplier = Math.min(MULT_CAP, this.multiplier + 1);
        this.stats.lumens++;
        this._burst(l.x, l.y, 0.2, 1, 0.5, 6);
        this.lumens.splice(li, 1);
      }
    }

    // Particles
    for (var pi = this.particles.length - 1; pi >= 0; pi--) {
      var pt = this.particles[pi];
      pt.life -= dt;
      if (pt.life <= 0) this.particles.splice(pi, 1);
    }
  };

  NeonGame.prototype._wx = function(x) { return x - this.camera.x; }
  NeonGame.prototype._wy = function(y) { return y - this.camera.y; }

  NeonGame.prototype.draw = function() {
    var r = this.renderer;
    r.clearBatches();
    r.time = this.time;
    r.flash = this.flash;
    r.flashColor = this.flashColor;

    var cam = this.camera;
    var wx = this._wx.bind(this);
    var wy = this._wy.bind(this);

    // Arena border glow
    var bw = this.worldW, bh = this.worldH;
    r.drawLine(wx(0), wy(0), wx(bw), wy(0), 0, 0.6, 0.5, 0.4);
    r.drawLine(wx(bw), wy(0), wx(bw), wy(bh), 0, 0.6, 0.5, 0.4);
    r.drawLine(wx(bw), wy(bh), wx(0), wy(bh), 0, 0.6, 0.5, 0.4);
    r.drawLine(wx(0), wy(bh), wx(0), wy(0), 0, 0.6, 0.5, 0.4);

    // Lumens
    for (var i = 0; i < this.lumens.length; i++) {
      var l = this.lumens[i];
      var pulse = 0.7 + 0.3 * Math.sin(this.time * 8 + i);
      r.drawCircle(wx(l.x), wy(l.y), 5 * pulse, 0.1, 1, 0.4, 0.9);
    }

    // Bullets
    for (var b = 0; b < this.bullets.length; b++) {
      var bull = this.bullets[b];
      r.drawCircle(wx(bull.x), wy(bull.y), 4, 1, 1, 0.4, 1);
    }

    // Enemies
    for (var e = 0; e < this.enemies.length; e++) {
      var en = this.enemies[e];
      if (en.type === 'snake') {
        for (var s = en.segments.length - 1; s >= 0; s--) {
          var seg = en.segments[s];
          var alpha = s === 0 ? 1 : 0.5;
          r.drawCircle(wx(seg.x), wy(seg.y), s === 0 ? en.size : 7, en.color[0], en.color[1], en.color[2], alpha);
        }
      } else if (en.type === 'charger') {
        r.drawTriangle(wx(en.x), wy(en.y), en.size, en.angle, en.color[0], en.color[1], en.color[2], 1);
      } else if (en.type === 'wanderer') {
        var spin = this.time * 4;
        r.drawTriangle(wx(en.x), wy(en.y), en.size, spin, en.color[0], en.color[1], en.color[2], 0.85);
      } else {
        r.drawCircle(wx(en.x), wy(en.y), en.size, en.color[0], en.color[1], en.color[2], 0.9);
      }
    }

    // Player
    var p = this.player;
    var inv = p.invuln > 0 && Math.floor(this.time * 12) % 2 === 0;
    if (!inv) {
      r.drawTriangle(wx(p.x), wy(p.y), PLAYER_SIZE + 2, p.angle + Math.PI/2, 0, 1, 0.85, 1);
      r.drawTriangle(wx(p.x), wy(p.y), PLAYER_SIZE, p.angle + Math.PI/2, 0.5, 1, 0.95, 0.8);
    }

    // Particles
    for (var pt = 0; pt < this.particles.length; pt++) {
      var par = this.particles[pt];
      r.drawParticle(wx(par.x), wy(par.y), par.vx, par.vy, par.maxLife - par.life, par.maxLife, par.r, par.g, par.b, par.a);
    }

    r.render();
  };

  NeonGame.prototype.getHud = function() {
    var mins = Math.floor(this.time / 60);
    var secs = Math.floor(this.time % 60);
    return {
      score: this.score,
      multiplier: this.multiplier,
      lives: this.lives,
      bombs: this.bombs,
      time: mins + ':' + (secs < 10 ? '0' : '') + secs
    };
  };

  NeonGame.STATES = STATES;
  return NeonGame;
})();
