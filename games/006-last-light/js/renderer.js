/**
 * Last Light — renderer.js
 * Canvas scene rendering: sea, reef ring, beam cone, ships, fog, storm, dawn.
 * Reads engine state; never mutates rules. World units → pixels via S.
 * Namespace: window.LastLight.Renderer
 */
window.LastLight = window.LastLight || {};

(function (NS) {
  'use strict';

  var C = NS.Config;
  var TAU = Math.PI * 2;

  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function mix(a, b, t) { return a + (b - a) * t; }

  function hexRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    return [parseInt(hex.substr(0, 2), 16), parseInt(hex.substr(2, 2), 16), parseInt(hex.substr(4, 2), 16)];
  }
  function rgba(hex, a) {
    var c = hexRgb(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }
  function mixHex(h1, h2, t) {
    t = clamp01(t);
    var a = hexRgb(h1), b = hexRgb(h2);
    return 'rgb(' +
      Math.round(mix(a[0], b[0], t)) + ',' +
      Math.round(mix(a[1], b[1], t)) + ',' +
      Math.round(mix(a[2], b[2], t)) + ')';
  }

  function Renderer(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = 0;
    this.height = 0;
    this.t = 0;
    this.flags = { reduceFlash: false, showBeamHint: true };
    this.shake = 0;
    this.foam = [];
    this.rings = [];
    this.motes = [];
    this.clouds = [];
    this.rain = [];
    this.glints = [];
    this.rocks = [];
    this.seaGrad = null;
    this.buildStatic();
  }

  Renderer.prototype.buildStatic = function () {
    var i, j;
    this.motes = [];
    for (i = 0; i < 42; i++) {
      this.motes.push({
        frac: Math.random(),
        off: Math.random() * 2 - 1,
        v: 0.05 + Math.random() * 0.1,
        tw: Math.random() * TAU,
      });
    }
    this.clouds = [];
    for (i = 0; i < 8; i++) {
      this.clouds.push({
        x: Math.random() * 1.8 - 0.4,
        y: Math.random() * 1.8 - 0.4,
        r: 0.34 + Math.random() * 0.3,
        vx: (Math.random() - 0.5) * 0.016,
        vy: (Math.random() - 0.5) * 0.012,
      });
    }
    this.rain = [];
    for (i = 0; i < 90; i++) {
      this.rain.push({ x: Math.random(), y: Math.random(), l: 14 + Math.random() * 22, s: 0.5 + Math.random() * 0.6 });
    }
    this.glints = [];
    for (i = 0; i < 70; i++) {
      var a = Math.random() * TAU;
      var r = 0.1 + Math.sqrt(Math.random()) * 0.95;
      this.glints.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, ph: Math.random() * TAU, sp: 0.4 + Math.random() * 0.8 });
    }
    this.rocks = [];
    var slots = 46;
    for (i = 0; i < slots; i++) {
      var ang = (i / slots) * TAU;
      var da = Math.abs(Math.atan2(Math.sin(ang), Math.cos(ang)));
      if (da < C.GAP_HALF + 0.06) continue; // leave the harbor mouth clear
      var verts = [];
      var n = 5 + ((Math.random() * 3) | 0);
      for (j = 0; j < n; j++) {
        verts.push({ a: (j / n) * TAU + Math.random() * 0.4, r: 0.55 + Math.random() * 0.5 });
      }
      this.rocks.push({
        ang: ang + (Math.random() - 0.5) * 0.02,
        rad: C.REEF_R + (Math.random() - 0.5) * 0.035,
        size: 0.016 + Math.random() * 0.016,
        verts: verts,
      });
    }
  };

  Renderer.prototype.resize = function (w, h) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = w;
    this.height = h;
    var g = this.ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, Math.max(w, h) * 0.62);
    g.addColorStop(0, '#0a1428');
    g.addColorStop(1, '#050a16');
    this.seaGrad = g;
  };

  // --- Particles ---

  Renderer.prototype.spawnFoam = function (ux, uy, n, color) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * TAU;
      var sp = 0.12 + Math.random() * 0.3;
      this.foam.push({
        x: ux, y: uy,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 1,
        decay: 0.9 + Math.random() * 0.9,
        r: 0.004 + Math.random() * 0.007,
        col: color || '#e8f0f8',
      });
    }
  };

  Renderer.prototype.spawnRing = function (ux, uy) {
    this.rings.push({ x: ux, y: uy, r: 0.01, life: 1 });
  };

  Renderer.prototype.update = function (dt) {
    var i;
    this.t += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);

    for (i = this.foam.length - 1; i >= 0; i--) {
      var p = this.foam[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - dt * 1.6;
      p.vy *= 1 - dt * 1.6;
      p.life -= dt / p.decay;
      if (p.life <= 0) this.foam.splice(i, 1);
    }
    for (i = this.rings.length - 1; i >= 0; i--) {
      var rg = this.rings[i];
      rg.r += dt * 0.09;
      rg.life -= dt / 0.9;
      if (rg.life <= 0) this.rings.splice(i, 1);
    }
    for (i = 0; i < this.clouds.length; i++) {
      var cl = this.clouds[i];
      cl.x += cl.vx * dt;
      cl.y += cl.vy * dt;
      if (cl.x < -0.6) cl.x = 2.2; else if (cl.x > 2.2) cl.x = -0.6;
      if (cl.y < -0.6) cl.y = 2.2; else if (cl.y > 2.2) cl.y = -0.6;
    }
    for (i = 0; i < this.motes.length; i++) {
      var m = this.motes[i];
      m.frac += m.v * dt;
      if (m.frac > 1) {
        m.frac = 0.05 + Math.random() * 0.1;
        m.off = Math.random() * 2 - 1;
      }
      m.tw += dt * 2.2;
    }
  };

  // --- Frame ---

  Renderer.prototype.draw = function (engine) {
    var ctx = this.ctx;
    var w = this.width, h = this.height;
    if (!w || !h) return;
    var cx = w / 2, cy = h / 2;
    var S = Math.min(w, h) * 0.46;
    var t = this.t;
    var dawn = engine.state === 'dawn' ? clamp01(engine.dawnT / 3) : 0;

    ctx.fillStyle = this.seaGrad || '#081226';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    if (this.shake > 0 && !this.flags.reduceFlash) {
      var sm = this.shake * 9;
      ctx.translate((Math.random() - 0.5) * sm, (Math.random() - 0.5) * sm);
    }

    // Sea glints
    var i;
    for (i = 0; i < this.glints.length; i++) {
      var gl = this.glints[i];
      var ga = 0.04 + 0.05 * Math.sin(t * gl.sp + gl.ph);
      ctx.fillStyle = 'rgba(143,163,189,' + ga.toFixed(3) + ')';
      ctx.fillRect(cx + gl.x * S - 1, cy + gl.y * S - 1, 2, 2);
    }

    // Faint rings spreading from the light
    for (i = 0; i < 3; i++) {
      var rr = (t * 0.045 + i / 3) % 1;
      ctx.strokeStyle = 'rgba(143,163,189,' + (0.06 * (1 - rr)).toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, rr * S * 1.05, 0, TAU);
      ctx.stroke();
    }

    // Visibility model: fog hides the far rim; lightning and dawn reveal it.
    var flashN = engine.flash > 0 ? clamp01(engine.flash / C.LIGHTNING_DUR) : 0;
    var fog = clamp01(engine.fog) * (1 - dawn * 0.9) * (1 - flashN * 0.96);

    this.drawReef(ctx, cx, cy, S, fog, t);
    this.drawFangs(ctx, cx, cy, S, fog, t, engine);
    this.drawShips(ctx, cx, cy, S, fog, t, engine);
    this.drawBeam(ctx, cx, cy, S, t, engine);
    this.drawIsland(ctx, cx, cy, S, t, engine);

    // Bell ripples
    for (i = 0; i < this.rings.length; i++) {
      var ring = this.rings[i];
      ctx.strokeStyle = 'rgba(232,240,248,' + (0.5 * ring.life).toFixed(3) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx + ring.x * S, cy + ring.y * S, ring.r * S, 0, TAU);
      ctx.stroke();
    }
    // Foam
    for (i = 0; i < this.foam.length; i++) {
      var fp = this.foam[i];
      ctx.fillStyle = rgba(fp.col, 0.75 * fp.life);
      ctx.beginPath();
      ctx.arc(cx + fp.x * S, cy + fp.y * S, Math.max(0.5, fp.r * S * fp.life), 0, TAU);
      ctx.fill();
    }

    this.drawFog(ctx, cx, cy, S, fog);
    this.drawStorm(ctx, engine, flashN);

    ctx.restore();

    if (dawn > 0) {
      ctx.fillStyle = 'rgba(186,204,224,' + (0.30 * dawn).toFixed(3) + ')';
      ctx.fillRect(0, 0, w, h);
    }
  };

  // --- Scene pieces ---

  Renderer.prototype.drawReef = function (ctx, cx, cy, S, fog, t) {
    var i, j;
    // Fairness rule: the ring stays traceable even in thick fog
    ctx.strokeStyle = 'rgba(232,240,248,' + (0.10 + 0.05 * Math.sin(t * 1.7)).toFixed(3) + ')';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 7]);
    ctx.beginPath();
    ctx.arc(cx, cy, C.REEF_R * S, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

    var rockAlpha = clamp01(1 - fog * 1.15);
    if (rockAlpha > 0.01) {
      ctx.lineWidth = 1;
      for (i = 0; i < this.rocks.length; i++) {
        var rk = this.rocks[i];
        var rx = cx + Math.cos(rk.ang) * rk.rad * S;
        var ry = cy + Math.sin(rk.ang) * rk.rad * S;
        var rs = rk.size * S;
        ctx.fillStyle = rgba('#1b2030', 0.35 + 0.65 * rockAlpha);
        ctx.strokeStyle = rgba('#e8f0f8', 0.05 + 0.14 * rockAlpha);
        ctx.beginPath();
        for (j = 0; j < rk.verts.length; j++) {
          var vt = rk.verts[j];
          var px = rx + Math.cos(vt.a) * rs * vt.r;
          var py = ry + Math.sin(vt.a) * rs * vt.r;
          if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // Pier lights framing the gap (green north / red south)
    this.pierLight(ctx, cx, cy, S, C.GAP_HALF, C.PIER_GREEN, t);
    this.pierLight(ctx, cx, cy, S, -C.GAP_HALF, C.PIER_RED, t);
  };

  Renderer.prototype.pierLight = function (ctx, cx, cy, S, ang, col, t) {
    var u = S / 300;
    var px = cx + Math.cos(ang) * C.REEF_R * S;
    var py = cy + Math.sin(ang) * C.REEF_R * S;
    var pulse = 0.75 + 0.25 * Math.sin(t * 2.4 + ang * 5);
    var gr = ctx.createRadialGradient(px, py, 0, px, py, 16 * u);
    gr.addColorStop(0, rgba(col, 0.85 * pulse));
    gr.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(px, py, 16 * u, 0, TAU);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(px, py, 2.6 * u, 0, TAU);
    ctx.fill();
  };

  Renderer.prototype.drawFangs = function (ctx, cx, cy, S, fog, t, engine) {
    var u = S / 300;
    for (var i = 0; i < engine.fangs.length; i++) {
      var f = engine.fangs[i];
      if (!f.on) continue;
      var fx = cx + f.x * S;
      var fy = cy + f.y * S;
      var fr = f.r * S;
      var alpha = clamp01(1 - fog * 0.9);
      var lobes = [[-0.35, 0, 0.75], [0.4, 0.2, 0.6], [0, -0.3, 0.55]];
      for (var l = 0; l < lobes.length; l++) {
        ctx.fillStyle = rgba('#1b2030', 0.4 + 0.6 * alpha);
        ctx.strokeStyle = rgba('#e8f0f8', 0.10 + 0.08 * alpha);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(fx + lobes[l][0] * fr, fy + lobes[l][1] * fr, fr * lobes[l][2], 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      // Slow foam ring
      var cyc = (t * 0.35 + f.ph) % 1;
      ctx.strokeStyle = 'rgba(232,240,248,' + (0.22 * (1 - cyc) * (0.4 + 0.6 * alpha)).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(fx, fy, fr * (1.1 + cyc * 1.4), 0, TAU);
      ctx.stroke();
    }
  };

  Renderer.prototype.hullPath = function (ctx, hull, u) {
    ctx.beginPath();
    if (hull === 'cog') {
      ctx.moveTo(9 * u, 0);
      ctx.quadraticCurveTo(2 * u, 7 * u, -7 * u, 5 * u);
      ctx.quadraticCurveTo(-10 * u, 0, -7 * u, -5 * u);
      ctx.quadraticCurveTo(2 * u, -7 * u, 9 * u, 0);
    } else if (hull === 'sloop') {
      ctx.moveTo(8 * u, 0);
      ctx.lineTo(-6 * u, 3.4 * u);
      ctx.lineTo(-8 * u, 0);
      ctx.lineTo(-6 * u, -3.4 * u);
      ctx.closePath();
    } else if (hull === 'barge') {
      ctx.moveTo(13 * u, -6 * u);
      ctx.lineTo(13 * u, 6 * u);
      ctx.lineTo(-11 * u, 8 * u);
      ctx.lineTo(-13 * u, 0);
      ctx.lineTo(-11 * u, -8 * u);
      ctx.closePath();
    } else { // ghost
      ctx.moveTo(10 * u, 0);
      ctx.lineTo(2 * u, 5 * u);
      ctx.lineTo(-8 * u, 4 * u);
      ctx.lineTo(-10 * u, 0);
      ctx.lineTo(-8 * u, -4 * u);
      ctx.lineTo(2 * u, -5 * u);
      ctx.closePath();
    }
  };

  Renderer.prototype.drawShips = function (ctx, cx, cy, S, fog, t, engine) {
    var u = S / 300;
    for (var i = 0; i < engine.ships.length; i++) {
      var s = engine.ships[i];
      var def = C.SHIPS[s.type];
      var d = Math.sqrt(s.x * s.x + s.y * s.y);
      var vis = clamp01(1 - clamp01((fog - 0.3) * 1.5) * clamp01((d - 0.5) / 0.4));
      var px = cx + s.x * S;
      var py = cy + s.y * S;

      // Wake trail
      if (s.trail.length > 1) {
        ctx.lineWidth = Math.max(1, 1.6 * u);
        for (var ti = 1; ti < s.trail.length; ti++) {
          var p0 = s.trail[ti - 1], p1 = s.trail[ti];
          if (p0.life <= 0 || p1.life <= 0) continue;
          ctx.strokeStyle = rgba(def.hue, Math.min(0.5, 0.16 * p1.life * (s.lit ? 1.6 : 1)));
          ctx.beginPath();
          ctx.moveTo(cx + p0.x * S, cy + p0.y * S);
          ctx.lineTo(cx + p1.x * S, cy + p1.y * S);
          ctx.stroke();
        }
      }

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(s.heading);
      ctx.globalAlpha = vis;

      if (def.hull === 'ghost') {
        var ag = ctx.createRadialGradient(0, 0, 0, 0, 0, 26 * u);
        ag.addColorStop(0, 'rgba(159,180,196,' + (0.16 + 0.06 * Math.sin(t * 1.3)).toFixed(3) + ')');
        ag.addColorStop(1, 'rgba(159,180,196,0)');
        ctx.fillStyle = ag;
        ctx.beginPath();
        ctx.arc(0, 0, 26 * u, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(159,180,196,0.5)';
        this.hullPath(ctx, def.hull, u);
        ctx.fill();
        ctx.strokeStyle = 'rgba(220,232,244,0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        var hullCol = s.lit ? '#7a6636' : (s.woke ? mixHex('#33415e', '#6b5a3a', 0.5) : '#33415e');
        ctx.fillStyle = hullCol;
        this.hullPath(ctx, def.hull, u);
        ctx.fill();
        ctx.strokeStyle = s.lit ? rgba('#e8a838', 0.85) : 'rgba(143,163,189,0.55)';
        ctx.lineWidth = Math.max(1, 1.2 * u);
        ctx.stroke();
        if (def.hull === 'barge') {
          ctx.fillStyle = rgba('#ff8c42', 0.5 + 0.3 * Math.sin(t * 3 + s.id));
          ctx.fillRect(-4 * u, -3 * u, 8 * u, 6 * u);
        }
      }
      ctx.restore();

      // Lantern dot — always readable, even unlit in fog
      var la = Math.max(vis, 0.55);
      var lx = px - Math.cos(s.heading) * def.r * S * 0.4;
      var ly = py - Math.sin(s.heading) * def.r * S * 0.4;
      var lcol = def.hull === 'ghost' ? '#bcd2e8' : '#ffd88f';
      var lr = (s.lit ? 3.4 : 2.2) * u;
      var lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, lr * 3);
      lg.addColorStop(0, rgba(lcol, la));
      lg.addColorStop(1, rgba(lcol, 0));
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.arc(lx, ly, lr * 3, 0, TAU);
      ctx.fill();
      ctx.fillStyle = rgba(lcol, Math.min(1, la + 0.2));
      ctx.beginPath();
      ctx.arc(lx, ly, lr * 0.8, 0, TAU);
      ctx.fill();

      // Barge wake-up progress
      if (def.hull === 'barge' && !s.woke && s.litT > 0) {
        ctx.strokeStyle = rgba('#e8a838', 0.8);
        ctx.lineWidth = 2 * u;
        ctx.beginPath();
        ctx.arc(px, py, def.r * S + 6 * u, -Math.PI / 2, -Math.PI / 2 + TAU * clamp01(s.litT / def.wakeNeed));
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    }
  };

  Renderer.prototype.drawBeam = function (ctx, cx, cy, S, t, engine) {
    if (engine.state !== 'night' && engine.state !== 'dawn') return;
    var half = engine.beamHalf();
    var reach = C.BEAM_REACH * S;
    var boost = engine.focus ? 1.35 : 1;
    var breathe = 1 + 0.05 * Math.sin(t * 2.1);
    var u = S / 300;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(engine.aim);
    ctx.globalCompositeOperation = 'lighter';
    var layers = [
      { w: 1.0, a: 0.075 * boost },
      { w: 0.72, a: 0.11 * boost },
      { w: 0.45, a: 0.16 * boost },
    ];
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i];
      var hw = half * L.w * breathe;
      var g = ctx.createRadialGradient(0, 0, S * 0.02, 0, 0, reach);
      g.addColorStop(0, 'rgba(232,168,56,' + (L.a * 1.5).toFixed(3) + ')');
      g.addColorStop(0.55, 'rgba(232,168,56,' + L.a.toFixed(3) + ')');
      g.addColorStop(1, 'rgba(232,168,56,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, reach, -hw, hw);
      ctx.closePath();
      ctx.fill();
    }
    // Dust motes drifting in the cone
    for (var mi = 0; mi < this.motes.length; mi++) {
      var m = this.motes[mi];
      var ma = m.off * half * 0.92;
      var mr = m.frac * reach;
      var twk = 0.35 + 0.35 * Math.sin(m.tw);
      ctx.fillStyle = 'rgba(255,222,150,' + (twk * 0.5).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(Math.cos(ma) * mr, Math.sin(ma) * mr, 1.1, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // Lamp core glow
    var cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 22 * u * boost);
    cg.addColorStop(0, 'rgba(255,214,130,' + (0.5 * boost).toFixed(3) + ')');
    cg.addColorStop(1, 'rgba(255,214,130,0)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(cx, cy, 22 * u * boost, 0, TAU);
    ctx.fill();
  };

  Renderer.prototype.drawIsland = function (ctx, cx, cy, S, t, engine) {
    var u = S / 300;
    var R = C.ISLAND_R * S;
    ctx.fillStyle = '#161c2c';
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(232,240,248,0.18)';
    ctx.lineWidth = 1.4 * u;
    ctx.stroke();
    var sr = R * (1.12 + 0.06 * Math.sin(t * 1.8));
    ctx.strokeStyle = 'rgba(232,240,248,' + (0.14 - 0.04 * Math.sin(t * 1.8)).toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(cx, cy, sr, 0, TAU);
    ctx.stroke();
    // Tower wall
    ctx.fillStyle = '#dde6ee';
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.52, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#8fa0b4';
    ctx.lineWidth = 1 * u;
    ctx.stroke();
    // Lamp room
    var lampR = R * 0.26 * (1 + 0.08 * Math.sin(t * 3.2));
    ctx.fillStyle = '#ffd88f';
    ctx.beginPath();
    ctx.arc(cx, cy, lampR, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff3d0';
    ctx.beginPath();
    ctx.arc(cx, cy, lampR * 0.5, 0, TAU);
    ctx.fill();
    // Lens tick riding the aim angle
    var lx = cx + Math.cos(engine.aim) * R * 0.42;
    var ly = cy + Math.sin(engine.aim) * R * 0.42;
    ctx.fillStyle = '#fffbe8';
    ctx.beginPath();
    ctx.arc(lx, ly, 1.8 * u, 0, TAU);
    ctx.fill();
  };

  Renderer.prototype.drawFog = function (ctx, cx, cy, S, fog) {
    if (fog <= 0.01) return;
    for (var i = 0; i < this.clouds.length; i++) {
      var cl = this.clouds[i];
      var px = cx + cl.x * S;
      var py = cy + cl.y * S;
      var g = ctx.createRadialGradient(px, py, 0, px, py, cl.r * S);
      g.addColorStop(0, 'rgba(143,163,189,' + (0.20 * fog).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(143,163,189,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, cl.r * S, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(143,163,189,' + (0.13 * fog).toFixed(3) + ')';
    ctx.fillRect(0, 0, this.width, this.height);
  };

  Renderer.prototype.drawStorm = function (ctx, engine, flashN) {
    var st = engine.storm;
    var w = this.width, h = this.height;
    if (st.phase === 'active' || st.phase === 'warn') {
      ctx.fillStyle = st.phase === 'active' ? 'rgba(3,7,18,0.30)' : 'rgba(3,7,18,0.16)';
      ctx.fillRect(0, 0, w, h);
      if (st.phase === 'active' && st.power > 0) {
        var wl = Math.sqrt(st.dx * st.dx + st.dy * st.dy) || 1;
        var dx = st.dx / wl, dy = st.dy / wl;
        var tt = this.t;
        ctx.strokeStyle = 'rgba(159,180,208,0.20)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (var i = 0; i < this.rain.length; i++) {
          var rp = this.rain[i];
          var ox = ((rp.x + dx * tt * rp.s) % 1 + 1) % 1;
          var oy = ((rp.y + dy * tt * rp.s) % 1 + 1) % 1;
          var px = ox * w, py = oy * h;
          ctx.moveTo(px, py);
          ctx.lineTo(px - dx * rp.l, py - dy * rp.l);
        }
        ctx.stroke();
      }
    }
    if (flashN > 0) {
      var a = flashN * (this.flags.reduceFlash ? 0.22 : 0.78);
      ctx.fillStyle = 'rgba(228,238,250,' + a.toFixed(3) + ')';
      ctx.fillRect(0, 0, w, h);
    }
  };

  NS.Renderer = Renderer;
})(window.LastLight);
