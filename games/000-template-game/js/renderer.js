/**
 * Canvas rendering only — reads engine state, never mutates rules.
 */
window.GalaxyTemplate = window.GalaxyTemplate || {};

(function(NS) {
  var C = NS.Config;

  function Renderer(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stars = [];
    for (var i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        z: 0.2 + Math.random() * 0.8,
        twinkle: Math.random() * Math.PI * 2
      });
    }
  }

  Renderer.prototype.resize = function(w, h) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = w;
    this.height = h;
  };

  Renderer.prototype.draw = function(engine) {
    var ctx = this.ctx;
    var w = this.width;
    var h = this.height;
    var shakeX = 0;
    var shakeY = 0;
    if (engine.shake > 0) {
      shakeX = (Math.random() - 0.5) * engine.shake;
      shakeY = (Math.random() - 0.5) * engine.shake;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    var bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#06060f');
    bg.addColorStop(0.5, '#0a1020');
    bg.addColorStop(1, '#050810');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    var t = performance.now() * 0.001;
    for (var i = 0; i < this.stars.length; i++) {
      var s = this.stars[i];
      var alpha = 0.15 + Math.sin(t * s.z + s.twinkle) * 0.12;
      ctx.fillStyle = 'rgba(220, 230, 255, ' + alpha + ')';
      ctx.fillRect(s.x * w, s.y * h, 1 + s.z, 1 + s.z);
    }

    var accent = C.ACCENT;
    ctx.strokeStyle = 'rgba(68, 221, 136, 0.12)';
    ctx.lineWidth = 1;
    for (var gy = 0; gy < h; gy += 48) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    engine.orbs.forEach(function(orb) {
      var x = orb.x * w;
      var y = orb.y * h;
      var r = orb.r * w * (1 + Math.sin(orb.pulse) * 0.08);
      var glow = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
      glow.addColorStop(0, 'rgba(68, 221, 136, 0.9)');
      glow.addColorStop(0.4, 'rgba(68, 221, 136, 0.35)');
      glow.addColorStop(1, 'rgba(68, 221, 136, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, r * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });

    engine.hazards.forEach(function(hazard) {
      var x = hazard.x * w;
      var y = hazard.y * h;
      var r = hazard.r * w;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(hazard.spin);
      ctx.fillStyle = 'rgba(255, 68, 68, 0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff4455';
      ctx.beginPath();
      for (var p = 0; p < 6; p++) {
        var angle = (Math.PI * 2 * p) / 6;
        var px = Math.cos(angle) * r;
        var py = Math.sin(angle) * r;
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    engine.bullets.forEach(function(bullet) {
      var bx = bullet.x * w;
      var by = bullet.y * h;
      var br = Math.max(2, bullet.r * w);
      var beam = ctx.createLinearGradient(bx, by - br * 4, bx, by + br * 2);
      beam.addColorStop(0, 'rgba(180, 255, 220, 0)');
      beam.addColorStop(0.35, 'rgba(120, 255, 180, 0.95)');
      beam.addColorStop(1, '#ffffff');
      ctx.strokeStyle = beam;
      ctx.lineWidth = br;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx, by + br * 2);
      ctx.lineTo(bx, by - br * 5);
      ctx.stroke();
    });

    var px = engine.player.x * w;
    var py = engine.player.y * h;
    var pw = engine.player.w * w;
    var ph = engine.player.h * h;
    var shipGlow = ctx.createRadialGradient(px, py, 0, px, py, pw * 2);
    shipGlow.addColorStop(0, 'rgba(68, 221, 136, 0.35)');
    shipGlow.addColorStop(1, 'rgba(68, 221, 136, 0)');
    ctx.fillStyle = shipGlow;
    ctx.beginPath();
    ctx.arc(px, py, pw * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(px, py - ph * 0.9);
    ctx.lineTo(px - pw * 0.55, py + ph * 0.55);
    ctx.lineTo(px, py + ph * 0.2);
    ctx.lineTo(px + pw * 0.55, py + ph * 0.55);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(px, py - ph * 0.45);
    ctx.lineTo(px - pw * 0.12, py + ph * 0.1);
    ctx.lineTo(px + pw * 0.12, py + ph * 0.1);
    ctx.closePath();
    ctx.fill();

    if (engine.state === NS.GameStates.PLAYING || engine.state === NS.GameStates.PAUSED) {
      var barW = w * 0.35;
      var barX = (w - barW) * 0.5;
      var barY = h - 18;
      ctx.fillStyle = 'rgba(10, 15, 25, 0.7)';
      ctx.fillRect(barX, barY, barW, 6);
      ctx.fillStyle = accent;
      ctx.fillRect(barX, barY, barW * Math.min(1, engine.score / C.WIN_SCORE), 6);
    }

    ctx.restore();
  };

  NS.Renderer = Renderer;
})(window.GalaxyTemplate);
