/**
 * Paper Drift — canvas renderer.
 * Watercolor river, ink composite blending, papercraft boat, and UI-adjacent effects.
 */

import { INK, INK_STROKE } from "./entities.js";

const PAPER = "#E8E4D9";
const RIVER_TOP = "#A8C8D8";
const RIVER_BOTTOM = "#7A9EB0";
const BOAT_FILL = "#FDFBF7";
const INK_LINE = "#1A1A1A";

export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.inkSplats = [];
    this.shakeT = 0;
    this.shakeMag = 0;
    this.noisePattern = this._buildNoisePattern();
    this.bandPhase = 0;
  }

  resize(w, h, dpr) {
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w;
    this.h = h;
  }

  screenShake(duration = 0.1, magnitude = 2) {
    this.shakeT = duration;
    this.shakeMag = magnitude;
  }

  /**
   * Watercolor ink splat — uses multiply to stain the river paper.
   * globalCompositeOperation 'multiply' darkens underlying washes like real pigment.
   */
  addInkSplat(x, y, color, radius = 70) {
    this.inkSplats.push({
      x,
      y,
      color,
      radius,
      life: 2,
      maxLife: 2
    });
  }

  update(dt) {
    this.bandPhase += dt * 28;
    if (this.shakeT > 0) this.shakeT = Math.max(0, this.shakeT - dt);
    this.inkSplats = this.inkSplats.filter((s) => {
      s.life -= dt;
      return s.life > 0;
    });
  }

  /** Main world draw pass. */
  drawWorld(state) {
    const ctx = this.ctx;
    const { cameraY, boat, obstacles, inkZones, sunZones, waterfalls } = state;

    ctx.save();
    this._applyShake();

    this._drawPaperBase();
    this._drawRiverBands(cameraY);
    this._drawInkSplats(cameraY);
    this._drawSunZones(sunZones, cameraY, state.time);
    this._drawInkZones(inkZones, cameraY, state.time);
    this._drawWaterfalls(waterfalls, cameraY);
    this._drawObstacleTelegraphs(obstacles, cameraY);
    this._drawObstacles(obstacles, cameraY);
    this._drawBoat(boat, cameraY, state.time, state.invuln);

    ctx.restore();
  }

  _applyShake() {
    if (this.shakeT <= 0) return;
    const m = this.shakeMag * (this.shakeT / 0.1);
    const ox = (Math.random() - 0.5) * m * 2;
    const oy = (Math.random() - 0.5) * m * 2;
    this.ctx.translate(ox, oy);
  }

  _drawPaperBase() {
    const ctx = this.ctx;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, this.w, this.h);

    if (this.noisePattern) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = this.noisePattern;
      ctx.fillRect(0, 0, this.w, this.h);
      ctx.globalAlpha = 1;
    }
  }

  /**
   * Layered semi-transparent river bands scrolling with the camera.
   */
  _drawRiverBands(cameraY) {
    const ctx = this.ctx;
    const bandH = 42;
    const start = Math.floor((cameraY - 80) / bandH) * bandH;

    for (let y = start; y < cameraY + this.h + bandH; y += bandH) {
      const screenY = y - cameraY;
      const t = ((y + this.bandPhase) % (bandH * 6)) / (bandH * 6);
      const color = lerpColor(RIVER_TOP, RIVER_BOTTOM, t);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.42 + (y % 3) * 0.04;
      ctx.fillRect(24, screenY, this.w - 48, bandH - 4);
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = "rgba(26,26,26,0.12)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.lineTo(24, this.h);
    ctx.moveTo(this.w - 24, 0);
    ctx.lineTo(this.w - 24, this.h);
    ctx.stroke();
  }

  _drawInkSplats(cameraY) {
    const ctx = this.ctx;
    for (const s of this.inkSplats) {
      const alpha = (s.life / s.maxLife) * 0.8;
      const screenY = s.y - cameraY;
      const r = s.radius * (1 + (1 - s.life / s.maxLife) * 0.35);

      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      const g = ctx.createRadialGradient(s.x, screenY, 0, s.x, screenY, r);
      g.addColorStop(0, hexA(s.color, alpha));
      g.addColorStop(0.55, hexA(s.color, alpha * 0.55));
      g.addColorStop(1, hexA(s.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, screenY, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  _drawSunZones(zones, cameraY, time) {
    const ctx = this.ctx;
    for (const z of zones) {
      const sy = z.y - cameraY;
      if (sy < -120 || sy > this.h + 120) continue;

      const g = ctx.createRadialGradient(z.x, sy, 0, z.x, sy, z.radius);
      g.addColorStop(0, "rgba(252,232,131,0.3)");
      g.addColorStop(0.7, "rgba(252,232,131,0.12)");
      g.addColorStop(1, "rgba(252,232,131,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(z.x, sy, z.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.55)";
      for (const m of z.motes) {
        const mx = z.x + m.ox;
        const my = sy + m.oy + Math.sin(time * 1.4 + m.phase) * 6;
        ctx.beginPath();
        ctx.arc(mx, my, m.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  _drawInkZones(zones, cameraY, time) {
    const ctx = this.ctx;
    for (const z of zones) {
      if (!z.active) continue;
      const sy = z.y - cameraY;
      if (sy < -100 || sy > this.h + 100) continue;

      const def = INK[z.type];
      const pulse = 1 + Math.sin(time * 2 + z.pulse) * 0.04;

      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      const g = ctx.createRadialGradient(z.x, sy, 0, z.x, sy, z.radius * pulse);
      g.addColorStop(0, hexA(def.color, 0.45));
      g.addColorStop(0.65, hexA(def.color, 0.22));
      g.addColorStop(1, hexA(def.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(z.x, sy, z.radius * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = INK_STROKE;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(z.x, sy, z.radius * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  }

  _drawWaterfalls(edges, cameraY) {
    const ctx = this.ctx;
    for (const wf of edges) {
      const sy = wf.y - cameraY;
      if (sy < -40 || sy > this.h + 40) continue;
      ctx.strokeStyle = INK_LINE;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([10, 6]);
      ctx.beginPath();
      ctx.moveTo(24, sy);
      ctx.lineTo(this.w - 24, sy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(168,200,216,0.25)";
      ctx.fillRect(24, sy, this.w - 48, 18);
    }
  }

  /** Dashed telegraph outline 200px upstream of each rock. */
  _drawObstacleTelegraphs(obstacles, cameraY) {
    const ctx = this.ctx;
    ctx.strokeStyle = INK_LINE;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 7]);
    ctx.globalAlpha = 0.28;

    for (const o of obstacles) {
      const sy = o.y - cameraY;
      const teleY = o.y - 200 - cameraY;
      if (teleY > this.h + 50 || sy < -50) continue;
      ctx.beginPath();
      ctx.ellipse(o.x, teleY, o.radius * 0.95, o.radius * 0.7, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  _drawObstacles(obstacles, cameraY) {
    const ctx = this.ctx;
    for (const o of obstacles) {
      const sy = o.y - cameraY;
      if (sy < -60 || sy > this.h + 60) continue;

      ctx.fillStyle = "#D4CFC4";
      ctx.strokeStyle = INK_LINE;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(o.x, sy, o.radius, o.radius * 0.82, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "rgba(26,26,26,0.2)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(o.x - o.radius * 0.3, sy - o.radius * 0.2);
      ctx.lineTo(o.x + o.radius * 0.35, sy + o.radius * 0.15);
      ctx.stroke();
    }
  }

  /**
   * Papercraft boat — ink outline, fold vertex pinch, drop shadow, soggy tint, crumple.
   */
  _drawBoat(boat, cameraY, time, invuln = 0) {
    const ctx = this.ctx;
    const sy = boat.y - cameraY;
    const foldVisual = boat.foldTarget > 0.5 ? easeOut(boat.foldAnim) : 1 - easeOut(boat.foldAnim);
    const pts = boat.hullPoints(foldVisual);

    const soggyT = boat.sogginess / 100;
    const dryT = boat.dryFlash;
    const fill = lerpColor(
      lerpColor(BOAT_FILL, "#E8EEF5", soggyT * 0.35),
      BOAT_FILL,
      dryT
    );

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.15)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;

    if (boat.crumpling > 0) {
      const cr = boat.crumpling / 0.45;
      ctx.translate(boat.x, sy);
      ctx.scale(1 - cr * 0.12, 1 - cr * 0.18);
      ctx.rotate((Math.random() - 0.5) * cr * 0.25);
      ctx.translate(-boat.x, -sy);
    }

    if (invuln > 0) {
      ctx.globalAlpha = 0.55 + Math.sin(time * 28) * 0.25;
    }

    ctx.fillStyle = fill;
    ctx.strokeStyle = INK_LINE;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y - cameraY);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y - cameraY);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.stroke();

    ctx.strokeStyle = INK_LINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y - cameraY);
    ctx.lineTo(boat.x, sy);
    ctx.lineTo(pts[2].x, pts[2].y - cameraY);
    ctx.stroke();

    if (boat.gliding > 0) {
      ctx.strokeStyle = "rgba(26,26,26,0.25)";
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(boat.x - 20, sy + 12);
      ctx.quadraticCurveTo(boat.x, sy - 18 - boat.gliding * 8, boat.x + 20, sy + 12);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  _buildNoisePattern() {
    const size = 128;
    const off = document.createElement("canvas");
    off.width = size;
    off.height = size;
    const c = off.getContext("2d");
    const img = c.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 200 + Math.random() * 40;
      img.data[i] = v;
      img.data[i + 1] = v - 4;
      img.data[i + 2] = v - 8;
      img.data[i + 3] = 18;
    }
    c.putImageData(img, 0, 0);
    return this.ctx.createPattern(off, "repeat");
  }
}

function hexA(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function lerpColor(a, b, t) {
  const pa = parseHex(a);
  const pb = parseHex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function parseHex(hex) {
  if (hex.startsWith("rgb")) {
    const m = hex.match(/\d+/g);
    return m ? [+m[0], +m[1], +m[2]] : [0, 0, 0];
  }
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16)
  ];
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}
