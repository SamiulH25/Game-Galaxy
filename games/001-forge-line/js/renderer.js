/**
 * Forge Line — canvas renderer (ironworks palette, no sci-fi neon).
 */
(function(NS) {
  var C = NS;

  var P = {
    bgTop: '#1a1714',
    bgMid: '#141210',
    bgBot: '#0e0c0a',
    plateA: '#322e2a',
    plateB: '#2a2622',
    plateEdge: '#4a4540',
    rivet: '#1c1917',
    rivetHi: '#6b6560',
    ember: '#c45c2a',
    emberHi: '#e07840',
    emberCore: '#f0a060',
    emberGlow: 'rgba(196, 92, 42, 0.35)',
    emberDeep: '#8b3a1f',
    chalk: '#e8e4dc',
    steam: 'rgba(232, 224, 216, 0.75)',
    iron: '#5c5650',
    ironDark: '#3d3935',
    rust: '#6b4428',
    rustBody: '#5a4030',
    rustDark: '#3a2820',
    verdigris: '#4a6b5c',
    verdigrisMist: 'rgba(122, 168, 150, 0.35)',
    hazard: '#c9a227',
    shadow: 'rgba(0, 0, 0, 0.45)'
  };

  function Renderer(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    NS.SpriteAtlas.init();
    this.w = 0;
    this.h = 0;
    this.grid = { x: 0, y: 0, cellW: 64, cellH: 64, pad: 0 };
    this.dust = [];
    for (var i = 0; i < 40; i++) {
      this.dust.push({
        x: Math.random(),
        y: Math.random(),
        s: Math.random() * 2 + 0.5,
        sp: 0.02 + Math.random() * 0.04
      });
    }
    this.beltPhase = 0;
    this.resize();
    var self = this;
    window.addEventListener('resize', function() { self.resize(); });
  }

  Renderer.prototype.resize = function() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var rect = this.canvas.parentElement.getBoundingClientRect();
    this.w = rect.width;
    this.h = rect.height;
    this.canvas.width = this.w * dpr;
    this.canvas.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.layoutGrid();
  };

  Renderer.prototype.layoutGrid = function() {
    var trayH = 108;
    var hudH = 56;
    var availW = this.w - 24;
    var availH = this.h - hudH - trayH - 20;
    var cellW = Math.floor(Math.min(availW / (C.COLS + 1.2), availH / C.ROWS));
    cellW = Math.max(48, Math.min(cellW, 88));
    var cellH = cellW;
    var gridW = cellW * C.COLS;
    var gridH = cellH * C.ROWS;
    var reactorW = cellW * 0.9;
    this.grid = {
      x: (this.w - gridW - reactorW - 10) / 2 + reactorW + 10,
      y: hudH + (availH - gridH) / 2 + 8,
      cellW: cellW,
      cellH: cellH,
      reactorW: reactorW,
      reactorX: (this.w - gridW - reactorW - 10) / 2,
      pad: 4
    };
  };

  Renderer.prototype.cellAt = function(clientX, clientY, rect) {
    var x = clientX - rect.left;
    var y = clientY - rect.top;
    var g = this.grid;
    var col = Math.floor((x - g.x) / g.cellW);
    var row = Math.floor((y - g.y) / g.cellH);
    if (col < 0 || col >= C.COLS || row < 0 || row >= C.ROWS) return null;
    return { col: col, row: row };
  };

  Renderer.prototype.draw = function(engine, time) {
    var ctx = this.ctx;
    var shake = engine.shake > 0 ? (Math.random() - 0.5) * engine.shake * 8 : 0;
    ctx.save();
    ctx.translate(shake, shake);
    this.drawBackground(ctx, this.w, this.h, time, engine);
    this.drawReactor(ctx, engine, time);
    this.drawGrid(ctx, engine, time);
    this.drawDefenders(ctx, engine, time);
    this.drawEnemies(ctx, engine, time);
    this.drawProjectiles(ctx, engine);
    this.drawParticles(ctx, engine);
    this.drawFloatTexts(ctx, engine);
    this.drawHover(ctx, engine);
    ctx.restore();
  };

  Renderer.prototype.drawBackground = function(ctx, w, h, time, engine) {
    var worldId = (engine && engine.level && engine.level.world) || 1;
    var biome = C.getBiome(worldId);

    var grd = ctx.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, biome.skyTop);
    grd.addColorStop(0.5, biome.skyMid);
    grd.addColorStop(1, biome.skyBot);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    var gx = w * biome.glowX;
    var gy = h * biome.glowY;
    var pulse = 0.85 + Math.sin(time * 0.0012) * 0.15;
    var glow = ctx.createRadialGradient(gx, gy, h * 0.02, gx, gy, h * 0.55 * pulse);
    glow.addColorStop(0, biome.glow);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    this.drawBiomeFeatures(ctx, w, h, time, biome, worldId);

    for (var i = 0; i < this.dust.length; i++) {
      var d = this.dust[i];
      d.y -= d.sp * (biome.feature === 'smoke' ? 0.15 : 0.3);
      if (d.y < 0) d.y = 1;
      ctx.globalAlpha = 0.05 + d.s * 0.06;
      ctx.fillStyle = biome.dust;
      ctx.fillRect(d.x * w, d.y * h, d.s + (biome.feature === 'junk' ? 1.5 : 0), d.s);
      ctx.globalAlpha = 1;
    }

    var vignette = ctx.createRadialGradient(w * 0.5, h * 0.45, h * 0.1, w * 0.5, h * 0.45, h * 0.88);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  };

  Renderer.prototype.drawBiomeFeatures = function(ctx, w, h, time, biome, worldId) {
    var t = time * 0.0004;
    if (biome.feature === 'asteroids') {
      ctx.fillStyle = 'rgba(40, 52, 68, 0.55)';
      for (var a = 0; a < 6; a++) {
        var ax = ((a * 137 + t * 40) % 1.15) * w - w * 0.08;
        var ay = h * (0.08 + (a % 3) * 0.12);
        var ar = 12 + (a % 4) * 8;
        ctx.beginPath();
        ctx.ellipse(ax, ay, ar, ar * 0.55, a * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(90, 138, 176, 0.15)';
      ctx.beginPath();
      ctx.arc(w * 0.82, h * 0.18, h * 0.12, 0, Math.PI * 2);
      ctx.fill();
    } else if (biome.feature === 'smoke') {
      for (var s = 0; s < 5; s++) {
        var sx = w * (0.15 + s * 0.17);
        var sy = h * (0.55 + Math.sin(t * 3 + s) * 0.04);
        var sr = 40 + s * 18;
        var smk = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
        smk.addColorStop(0, 'rgba(80, 40, 24, 0.25)');
        smk.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = smk;
        ctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
      }
      ctx.fillStyle = 'rgba(196, 92, 42, 0.08)';
      ctx.fillRect(0, h * 0.7, w, h * 0.3);
    } else if (biome.feature === 'reactor') {
      ctx.fillStyle = 'rgba(60, 20, 28, 0.35)';
      ctx.fillRect(0, 0, w * 0.28, h);
      var rp = 0.5 + Math.sin(time * 0.002) * 0.2;
      var rc = ctx.createRadialGradient(w * 0.1, h * 0.5, 4, w * 0.1, h * 0.5, h * 0.35);
      rc.addColorStop(0, 'rgba(240, 120, 60, ' + (0.35 * rp) + ')');
      rc.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rc;
      ctx.fillRect(0, 0, w * 0.45, h);
      ctx.strokeStyle = 'rgba(224, 80, 48, 0.12)';
      ctx.lineWidth = 1;
      for (var ln = 0; ln < 8; ln++) {
        ctx.beginPath();
        ctx.moveTo(0, h * (0.1 + ln * 0.11));
        ctx.lineTo(w * 0.35, h * (0.15 + ln * 0.1));
        ctx.stroke();
      }
    } else if (biome.feature === 'junk') {
      ctx.fillStyle = 'rgba(50, 58, 48, 0.4)';
      for (var j = 0; j < 10; j++) {
        var jx = (j * 97 % 100) / 100 * w;
        var jy = h * (0.72 + (j % 4) * 0.06);
        ctx.fillRect(jx, jy, 14 + (j % 3) * 10, 6 + (j % 2) * 4);
      }
      ctx.fillStyle = 'rgba(122, 168, 150, 0.06)';
      ctx.fillRect(0, h * 0.65, w, h * 0.35);
    }
  };

  Renderer.prototype.drawReactor = function(ctx, engine, time) {
    var g = this.grid;
    var rx = g.reactorX;
    var ry = g.y;
    var rw = g.reactorW;
    var rh = g.cellH * C.ROWS;
    var pulse = 0.5 + Math.sin(time * 0.003) * 0.12;

    ctx.fillStyle = P.ironDark;
    roundRect(ctx, rx, ry, rw, rh, 5);
    ctx.fill();
    ctx.strokeStyle = P.plateEdge;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#2a2018';
    for (var slit = 0; slit < 5; slit++) {
      var sy = ry + rh * 0.15 + slit * (rh * 0.14);
      ctx.fillRect(rx + rw * 0.2, sy, rw * 0.6, 3);
    }

    var coreGrd = ctx.createRadialGradient(
      rx + rw * 0.5, ry + rh * 0.55, 2,
      rx + rw * 0.5, ry + rh * 0.55, rw * 0.75
    );
    coreGrd.addColorStop(0, 'rgba(240, 160, 96, ' + (0.55 + pulse * 0.25) + ')');
    coreGrd.addColorStop(0.45, 'rgba(196, 92, 42, ' + (0.25 + pulse * 0.15) + ')');
    coreGrd.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = coreGrd;
    ctx.fillRect(rx, ry, rw, rh);

    ctx.font = '600 9px "Barlow Condensed", sans-serif';
    ctx.fillStyle = 'rgba(232, 228, 220, 0.55)';
    ctx.textAlign = 'center';
    ctx.fillText('CORE', rx + rw / 2, ry + rh * 0.42);
    ctx.fillText('REACTOR', rx + rw / 2, ry + rh * 0.52);

    for (var r = 0; r < C.ROWS; r++) {
      var doorY = g.y + r * g.cellH + g.cellH / 2;
      if (engine.blastDoors[r]) {
        ctx.fillStyle = P.hazard;
        ctx.fillRect(rx + rw - 7, doorY - 11, 7, 22);
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(rx + rw - 5, doorY - 9, 3, 18);
      } else {
        ctx.fillStyle = 'rgba(60, 55, 50, 0.6)';
        ctx.fillRect(rx + rw - 5, doorY - 8, 4, 16);
      }
    }
  };

  Renderer.prototype.drawGrid = function(ctx, engine, time) {
    var g = this.grid;
    this.beltPhase = (this.beltPhase + 0.018 * (engine.timeScale || 1)) % 1;

    for (var row = 0; row < C.ROWS; row++) {
      for (var col = 0; col < C.COLS; col++) {
        var x = g.x + col * g.cellW;
        var y = g.y + row * g.cellH;
        var w = g.cellW - 2;
        var h = g.cellH - 2;

        var plateGrd = ctx.createLinearGradient(x, y, x, y + h);
        plateGrd.addColorStop(0, (row + col) % 2 === 0 ? '#363230' : P.plateA);
        plateGrd.addColorStop(1, P.plateB);
        ctx.fillStyle = plateGrd;
        ctx.fillRect(x + 1, y + 1, w, h);

        ctx.strokeStyle = P.plateEdge;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1.5, y + 1.5, w - 1, h - 1);

        drawRivet(ctx, x + 5, y + 5);
        drawRivet(ctx, x + w - 2, y + 5);
        drawRivet(ctx, x + 5, y + h - 2);
        drawRivet(ctx, x + w - 2, y + h - 2);

        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 4, y + 4, w - 6, h - 6);
        ctx.clip();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 2;
        for (var bx = -1; bx < 5; bx++) {
          var lx = x + ((bx + this.beltPhase) % 4) * (w / 4);
          ctx.beginPath();
          ctx.moveTo(lx, y + 4);
          ctx.lineTo(lx - w / 8, y + h - 4);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    for (var f = 0; f < engine.flashCells.length; f++) {
      var fc = engine.flashCells[f];
      ctx.fillStyle = 'rgba(196, 92, 42, ' + (fc.t * 0.35) + ')';
      ctx.fillRect(g.x + fc.col * g.cellW, g.y + fc.row * g.cellH, g.cellW, g.cellH);
    }
  };

  Renderer.prototype.drawDefenders = function(ctx, engine, time) {
    var g = this.grid;
    for (var row = 0; row < C.ROWS; row++) {
      for (var col = 0; col < C.COLS; col++) {
        var cell = engine.grid[row][col];
        if (!cell) continue;
        var x = g.x + col * g.cellW;
        var y = g.y + row * g.cellH;
        var cx = x + g.cellW / 2;
        var cy = y + g.cellH / 2;
        ctx.fillStyle = P.shadow;
        ctx.beginPath();
        ctx.ellipse(cx, cy + g.cellH * 0.28, g.cellW * 0.28, g.cellH * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        this.drawDefenderIcon(ctx, cell.id, cx, cy, g.cellW * 0.44, time);
        if (cell.id === 'ore_collector') {
          this.drawCollectorProgress(ctx, x, y, g.cellW, g.cellH, cell.timer / C.COLLECTOR_INTERVAL);
        }
        if (cell.hp < cell.maxHp) {
          var pct = cell.hp / cell.maxHp;
          drawHpBar(ctx, x + 8, y + g.cellH - 9, g.cellW - 16, 4, pct);
        }
      }
    }
  };

  Renderer.prototype.drawDefenderIcon = function(ctx, id, cx, cy, r, time) {
    if (NS.SpriteAtlas.drawDefender(ctx, id, cx, cy, r, time)) return;
    ctx.save();
    ctx.fillStyle = P.iron;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  Renderer.prototype.drawEnemies = function(ctx, engine, time) {
    var g = this.grid;
    for (var i = 0; i < engine.enemies.length; i++) {
      var e = engine.enemies[i];
      var tmpl = C.ENEMIES[e.type];
      var x = g.x + e.x * g.cellW;
      var y = g.y + e.row * g.cellH;
      var cx = x;
      var cy = y + g.cellH / 2;
      var scale = tmpl.small ? 0.68 : tmpl.boss ? 1.45 : 1.05;
      var r = g.cellH * 0.32 * scale;

      if (e.underground && !e.surfaced) {
        ctx.fillStyle = 'rgba(58, 40, 32, 0.5)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + r * 0.55, r * 0.75, r * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = P.rust;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
        continue;
      }

      ctx.fillStyle = P.shadow;
      ctx.beginPath();
      ctx.ellipse(cx + r * 0.3, cy + r * 0.85, r * 0.9, r * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();

      var drew = NS.SpriteAtlas.drawEnemy(ctx, e, tmpl, cx + r * 0.45, cy, r * 0.95, time);
      if (!drew) {
        roundRect(ctx, cx - r * 0.15, cy - r * 0.85, r * 1.3, r * 1.7, tmpl.small ? 3 : 5);
        ctx.fillStyle = tmpl.boss ? P.emberDeep : P.rustBody;
        ctx.fill();
      }

      if (e.armor > 0) {
        ctx.strokeStyle = 'rgba(168, 162, 158, 0.65)';
        ctx.lineWidth = 2;
        roundRect(ctx, cx - r * 0.2, cy - r * 0.95, r * 1.4, r * 1.85, 4);
        ctx.stroke();
      }

      drawHpBar(ctx, cx - r * 0.1, cy - r - 10, r * 1.2, 4, e.hp / e.maxHp);

      if (e.slowed > 0) {
        ctx.fillStyle = P.verdigrisMist;
        roundRect(ctx, cx - r * 0.15, cy - r * 0.85, r * 1.3, r * 1.7, 4);
        ctx.fill();
      }
      if (e.eating) {
        ctx.fillStyle = 'rgba(196, 92, 42, 0.28)';
        roundRect(ctx, cx - r * 0.15, cy - r * 0.85, r * 1.3, r * 1.7, 4);
        ctx.fill();
      }
    }
  };

  Renderer.prototype.drawProjectiles = function(ctx, engine) {
    var g = this.grid;
    for (var i = 0; i < engine.projectiles.length; i++) {
      var p = engine.projectiles[i];
      var x = g.x + p.x * g.cellW;
      var y = g.y + p.row * g.cellH + g.cellH / 2;
      ctx.fillStyle = P.emberHi;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = P.emberGlow;
      ctx.beginPath();
      ctx.arc(x - 5, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  Renderer.prototype.drawParticles = function(ctx, engine) {
    var g = this.grid;
    for (var i = 0; i < engine.particles.length; i++) {
      var p = engine.particles[i];
      var alpha = p.life / (p.maxLife || 1);
      var x = g.x + p.x * g.cellW;
      var y = g.y + p.y * g.cellH;
      if (p.kind === 'steam') {
        ctx.fillStyle = 'rgba(232, 224, 216, ' + (alpha * 0.55) + ')';
        ctx.beginPath();
        ctx.ellipse(x, y, 4 * alpha, 5 * alpha, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'blast') {
        ctx.fillStyle = 'rgba(224, 120, 64, ' + alpha + ')';
        ctx.fillRect(x, y, 5, 5);
      } else {
        ctx.fillStyle = 'rgba(107, 68, 40, ' + alpha + ')';
        ctx.fillRect(x, y, 3, 3);
      }
    }
  };

  Renderer.prototype.drawCollectorProgress = function(ctx, x, y, w, h, pct) {
    var cx = x + w / 2;
    var cy = y + h / 2;
    var r = Math.min(w, h) * 0.38;
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(201, 162, 39, 0.95)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, pct));
    ctx.stroke();
    ctx.restore();
  };

  Renderer.prototype.drawFloatTexts = function(ctx, engine) {
    var g = this.grid;
    for (var i = 0; i < engine.floatTexts.length; i++) {
      var ft = engine.floatTexts[i];
      var alpha = ft.life / (ft.maxLife || 1);
      var x = g.x + ft.col * g.cellW;
      var y = g.y + ft.row * g.cellH;
      ctx.save();
      ctx.font = '700 13px "Barlow Condensed", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = ft.kind === 'kill'
        ? 'rgba(255, 200, 120, ' + alpha + ')'
        : 'rgba(232, 200, 100, ' + alpha + ')';
      ctx.strokeStyle = 'rgba(0, 0, 0, ' + (alpha * 0.7) + ')';
      ctx.lineWidth = 3;
      ctx.strokeText(ft.text, x, y);
      ctx.fillText(ft.text, x, y);
      ctx.restore();
    }
  };

  Renderer.prototype.drawHover = function(ctx, engine) {
    if (!engine.hoverCell || engine.state !== 'playing') return;
    var g = this.grid;
    var col = engine.hoverCell.col;
    var row = engine.hoverCell.row;
    var x = g.x + col * g.cellW;
    var y = g.y + row * g.cellH;
    if (engine.shovelMode) {
      ctx.strokeStyle = P.hazard;
    } else if (engine.grid[row][col]) {
      ctx.strokeStyle = 'rgba(196, 92, 42, 0.65)';
    } else {
      ctx.strokeStyle = P.verdigris;
    }
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(x + 3, y + 3, g.cellW - 6, g.cellH - 6);
    ctx.setLineDash([]);
  };

  function drawRivet(ctx, x, y) {
    ctx.fillStyle = P.rivet;
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = P.rivetHi;
    ctx.beginPath();
    ctx.arc(x - 0.5, y - 0.5, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHpBar(ctx, x, y, w, h, pct) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = pct > 0.45 ? P.verdigris : P.ember;
    ctx.fillRect(x, y, w * Math.max(0, Math.min(1, pct)), h);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  NS.Renderer = Renderer;
})(window.ForgeLine = window.ForgeLine || {});
