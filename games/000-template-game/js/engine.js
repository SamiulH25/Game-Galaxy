/**
 * Pure game logic — no DOM or canvas access.
 */
window.GalaxyTemplate = window.GalaxyTemplate || {};

(function(NS) {
  var C = NS.Config;

  NS.GameStates = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    WIN: 'win',
    GAME_OVER: 'game_over'
  };

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function circleHit(ax, ay, ar, bx, by, br) {
    var dx = ax - bx;
    var dy = ay - by;
    var r = ar + br;
    return dx * dx + dy * dy <= r * r;
  }

  function GameEngine() {
    this.reset();
  }

  GameEngine.prototype.reset = function() {
    var w = this.width;
    var h = this.height;
    this.state = NS.GameStates.MENU;
    this.score = 0;
    this.lives = C.START_LIVES;
    this.elapsed = 0;
    this.spawnTimer = 0;
    this.hazardTimer = 0;
    this.difficulty = 1;
    this.shake = 0;
    this.player = { x: 0.5, y: 0.88, w: 0.07, h: 0.05 };
    this.orbs = [];
    this.hazards = [];
    this.bullets = [];
    this.fireCooldown = 0;
    this.width = w > 1 ? w : 1;
    this.height = h > 1 ? h : 1;
  };

  GameEngine.prototype.setSize = function(w, h) {
    this.width = Math.max(1, w);
    this.height = Math.max(1, h);
  };

  GameEngine.prototype.start = function() {
    this.reset();
    this.state = NS.GameStates.PLAYING;
  };

  GameEngine.prototype.pause = function() {
    if (this.state === NS.GameStates.PLAYING) {
      this.state = NS.GameStates.PAUSED;
    }
  };

  GameEngine.prototype.resume = function() {
    if (this.state === NS.GameStates.PAUSED) {
      this.state = NS.GameStates.PLAYING;
    }
  };

  GameEngine.prototype.movePlayer = function(dir, dt) {
    if (this.state !== NS.GameStates.PLAYING) return;
    var step = (dt > 0 ? dt : 0.016);
    var p = this.player;
    p.x += dir * C.PLAYER_SPEED * step;
    var half = p.w * 0.5;
    p.x = Math.max(half, Math.min(1 - half, p.x));
  };

  GameEngine.prototype.setPlayerX = function(normX) {
    if (this.state !== NS.GameStates.PLAYING) return;
    var p = this.player;
    var half = p.w * 0.5;
    p.x = Math.max(half, Math.min(1 - half, normX));
  };

  GameEngine.prototype.tryShoot = function() {
    if (this.state !== NS.GameStates.PLAYING) return false;
    if (this.fireCooldown > 0) return false;
    var p = this.player;
    this.fireCooldown = C.FIRE_COOLDOWN;
    this.bullets.push({
      x: p.x,
      y: p.y - p.h * 0.55,
      r: 0.009,
      vy: -C.BULLET_SPEED
    });
    return true;
  };

  GameEngine.prototype.destroyHazard = function(index) {
    this.hazards.splice(index, 1);
    this.score += C.HAZARD_DESTROY_VALUE;
    if (this.score >= C.WIN_SCORE) {
      this.state = NS.GameStates.WIN;
    }
  };

  GameEngine.prototype.spawnOrb = function() {
    this.orbs.push({
      x: rand(0.08, 0.92),
      y: -0.05,
      r: 0.022,
      vy: rand(0.22, 0.34) * this.difficulty,
      pulse: Math.random() * Math.PI * 2
    });
  };

  GameEngine.prototype.spawnHazard = function() {
    this.hazards.push({
      x: rand(0.08, 0.92),
      y: -0.06,
      r: rand(0.024, 0.034),
      vy: rand(0.28, 0.42) * this.difficulty,
      spin: rand(-3, 3)
    });
  };

  GameEngine.prototype.collectOrb = function(index) {
    this.orbs.splice(index, 1);
    this.score += C.ORB_VALUE;
    if (this.score >= C.WIN_SCORE) {
      this.state = NS.GameStates.WIN;
    }
  };

  GameEngine.prototype.hitHazard = function(index) {
    this.hazards.splice(index, 1);
    this.lives -= 1;
    this.shake = 12;
    if (this.lives <= 0) {
      this.state = NS.GameStates.GAME_OVER;
    }
  };

  GameEngine.prototype.update = function(dt) {
    if (this.state !== NS.GameStates.PLAYING) {
      if (this.shake > 0) this.shake -= dt * 60;
      return;
    }

    this.elapsed += dt;
    this.difficulty = 1 + this.elapsed * C.DIFFICULTY_RAMP;
    if (this.shake > 0) this.shake -= dt * 60;
    if (this.fireCooldown > 0) this.fireCooldown = Math.max(0, this.fireCooldown - dt);

    this.spawnTimer += dt;
    this.hazardTimer += dt;
    if (this.spawnTimer >= C.ORB_SPAWN_INTERVAL / this.difficulty) {
      this.spawnTimer = 0;
      this.spawnOrb();
    }
    if (this.hazardTimer >= C.HAZARD_SPAWN_INTERVAL / this.difficulty) {
      this.hazardTimer = 0;
      this.spawnHazard();
    }

    var i;
    for (i = this.orbs.length - 1; i >= 0; i--) {
      var orb = this.orbs[i];
      orb.y += orb.vy * dt;
      orb.pulse += dt * 5;
      if (orb.y > 1.08) {
        this.orbs.splice(i, 1);
        continue;
      }
      if (circleHit(orb.x, orb.y, orb.r, this.player.x, this.player.y, this.player.w * 0.45)) {
        this.collectOrb(i);
      }
    }

    for (i = this.hazards.length - 1; i >= 0; i--) {
      var hazard = this.hazards[i];
      hazard.y += hazard.vy * dt;
      hazard.spin += dt * 2;
      if (hazard.y > 1.1) {
        this.hazards.splice(i, 1);
        continue;
      }
      if (circleHit(hazard.x, hazard.y, hazard.r, this.player.x, this.player.y, this.player.w * 0.4)) {
        this.hitHazard(i);
      }
    }

    var b;
    for (b = this.bullets.length - 1; b >= 0; b--) {
      var bullet = this.bullets[b];
      bullet.y += bullet.vy * dt;
      if (bullet.y < -0.06) {
        this.bullets.splice(b, 1);
        continue;
      }
      for (i = this.hazards.length - 1; i >= 0; i--) {
        hazard = this.hazards[i];
        if (circleHit(bullet.x, bullet.y, bullet.r, hazard.x, hazard.y, hazard.r)) {
          this.bullets.splice(b, 1);
          this.destroyHazard(i);
          break;
        }
      }
    }
  };

  NS.GameEngine = GameEngine;
})(window.GalaxyTemplate);
