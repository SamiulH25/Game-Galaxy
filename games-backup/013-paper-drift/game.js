/**
 * Paper Drift — main loop, physics integration, collisions, and procedural world.
 */

import {
  Boat,
  WorldSpawner,
  circleRectOverlap,
  INK
} from "./entities.js";
import { Renderer } from "./renderer.js";

const STATE = { MENU: "menu", PLAYING: "playing", GAMEOVER: "gameover" };

const BASE_SCROLL = 118;
const MAX_H_SPEED = 280;
const GRACE_PERIOD = 0.5;
const LIVES_START = 3;

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ui = ui;
    this.renderer = new Renderer(canvas);
    this.state = STATE.MENU;
    this.boat = new Boat();
    this.spawner = new WorldSpawner(800);
    this.obstacles = [];
    this.inkZones = [];
    this.sunZones = [];
    this.waterfalls = [];
    this.cameraY = 0;
    this.score = 0;
    this.distance = 0;
    this.lives = LIVES_START;
    this.invuln = 0;
    this.difficulty = 0;
    this.time = 0;
    this.inkDragMul = 1;
    this.slippery = false;
    this.lastInkHit = new Set();
    this.raf = 0;
    this.lastTs = 0;
    this.pointerDown = false;
    this.highScore = 0;

    this._bindInput();
    this._resize();
    this._loadHighScore();
    window.addEventListener("resize", () => this._resize());
  }

  start() {
    this.state = STATE.PLAYING;
    this._resetRun();
    this.ui.showHUD();
    this.ui.hideOverlay();
  }

  _resetRun() {
    const w = this.renderer.w;
    this.boat.reset(w / 2, 120);
    this.boat.targetX = w / 2;
    this.obstacles = [];
    this.inkZones = [];
    this.sunZones = [];
    this.waterfalls = [];
    this.cameraY = 0;
    this.score = 0;
    this.distance = 0;
    this.lives = LIVES_START;
    this.invuln = 0;
    this.difficulty = 0;
    this.inkDragMul = 1;
    this.slippery = false;
    this.lastInkHit = new Set();
    this.spawner.reset(w);
    this._seedWorld();
    this._syncUI();
  }

  _seedWorld() {
    const chunk = this.spawner.spawnChunk(this.boat.y, this.difficulty);
    this.obstacles.push(...chunk.obstacles);
    this.inkZones.push(...chunk.inkZones);
    this.sunZones.push(...chunk.sunZones);
    this.waterfalls.push(...chunk.waterfalls);
  }

  _loadHighScore() {
    try {
      const raw = localStorage.getItem('paper-drift-high');
      if (raw) this.highScore = parseInt(raw, 10) || 0;
    } catch(_) {}
    if (window.gameBridge) {
      window.gameBridge.load().then(d => {
        if (d && d.highScore && d.highScore > this.highScore) {
          this.highScore = d.highScore;
          try { localStorage.setItem('paper-drift-high', String(this.highScore)); } catch(_) {}
        }
      }).catch(() => {});
    }
  }

  _saveHighScore() {
    if (this.score <= this.highScore) return;
    this.highScore = this.score;
    try { localStorage.setItem('paper-drift-high', String(this.highScore)); } catch(_) {}
    if (window.gameBridge) {
      window.gameBridge.save({ highScore: this.highScore }).catch(() => {});
    }
  }

  _bindInput() {
    const targetFromEvent = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      this.boat.targetX = clientX - rect.left;
    };

    this.canvas.addEventListener("mousemove", targetFromEvent);
    this.canvas.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        targetFromEvent(e);
      },
      { passive: false }
    );

    const toggleFold = (e) => {
      if (this.state !== STATE.PLAYING) return;
      if (e.target.closest("#overlay")) return;
      e.preventDefault();
      if (this.pointerDown) return;
      this.pointerDown = true;
      this._checkWaterfallEdge();
      this.boat.toggleFold();
    };

    this.canvas.addEventListener("mousedown", toggleFold);
    this.canvas.addEventListener("touchstart", toggleFold, { passive: false });

    const release = () => {
      this.pointerDown = false;
    };
    window.addEventListener("mouseup", release);
    window.addEventListener("touchend", release);

    this.ui.onStart(() => this.start());
    this.ui.onRestart(() => this.start());
  }

  _checkWaterfallEdge() {
    if (this.boat.folded) return;
    for (const wf of this.waterfalls) {
      if (Math.abs(this.boat.y - wf.y) < 28) {
        this.boat.waterfallEdge = true;
        return;
      }
    }
  }

  _resize() {
    const parent = this.canvas.parentElement;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.resize(w, h, dpr);
    this.spawner.riverWidth = w;
    if (this.state === STATE.PLAYING) {
      this.boat.x = Math.min(this.boat.x, w - 24);
      this.boat.targetX = this.boat.x;
    }
  }

  _loop(ts) {
    this.raf = requestAnimationFrame((t) => this._loop(t));
    const dt = Math.min(0.033, (ts - this.lastTs) / 1000 || 0.016);
    this.lastTs = ts;

    if (this.state === STATE.PLAYING) {
      this._update(dt);
    }
    this.renderer.update(dt);
    this.renderer.drawWorld({
      cameraY: this.cameraY,
      boat: this.boat,
      obstacles: this.obstacles,
      inkZones: this.inkZones,
      sunZones: this.sunZones,
      waterfalls: this.waterfalls,
      time: this.time,
      invuln: this.invuln
    });
  }

  _update(dt) {
    this.time += dt;
    const riverW = this.renderer.w;
    const boat = this.boat;
    const dims = boat.dims();

    boat.update(dt, riverW);

    if (this.invuln > 0) this.invuln -= dt;

    let scroll = BASE_SCROLL * dims.speedMul;
    let drag = dims.drag;

    if (boat.sogginess > 80) {
      scroll *= 0.5;
      drag = Math.min(drag + 0.03, 0.98);
    }

    drag *= this.inkDragMul;

    let gravity = boat.gliding > 0 ? 0.5 : 1;

    boat.y += scroll * dt;
    this.distance += scroll * dt;
    this.score = Math.floor(this.distance / 10);
    this.difficulty = this.distance / 800;
    this.cameraY = boat.y - this.renderer.h * 0.35;

    const steer = 8.5;
    const dx = boat.targetX - boat.x;
    boat.vx += dx * steer * dt;
    boat.vx = clamp(boat.vx, -MAX_H_SPEED, MAX_H_SPEED);
    if (!this.slippery) {
      boat.vx *= Math.pow(drag, dt * 60);
    } else {
      boat.vx *= Math.pow(INK.yellow.friction, dt * 60);
    }
    boat.x += boat.vx * dt;
    boat.x = clamp(boat.x, 30, riverW - 30);

    boat.vy *= Math.pow(0.92, dt * 60);
    boat.vy += 40 * gravity * dt;
    boat.y += boat.vy * dt;

    boat.sogginess = Math.min(100, boat.sogginess + 0.5 * dt * 60);

    this.inkDragMul = lerp(this.inkDragMul, 1, dt * 3);
    this.slippery = false;
    this.lastInkHit.clear();

    this._handleZones(dt);
    this._handleCollisions();

    const lists = {
      obstacles: this.obstacles,
      inkZones: this.inkZones,
      sunZones: this.sunZones,
      waterfalls: this.waterfalls
    };
    const chunk = this.spawner.spawnChunk(boat.y, this.difficulty);
    this.obstacles.push(...chunk.obstacles);
    this.inkZones.push(...chunk.inkZones);
    this.sunZones.push(...chunk.sunZones);
    this.waterfalls.push(...chunk.waterfalls);
    this.spawner.prune(boat.y, lists);

    this._syncUI();
  }

  _handleZones(dt) {
    const boat = this.boat;
    const b = boat.bounds();
    const cx = boat.x;
    const cy = boat.y;

    for (const z of this.sunZones) {
      if (z.contains(cx, cy)) {
        boat.sogginess = Math.max(0, boat.sogginess - 2 * dt * 60);
        boat.dryFlash = Math.min(1, boat.dryFlash + dt * 2.5);
      }
    }

    for (const z of this.inkZones) {
      if (!z.active) continue;
      const key = `${z.x}|${z.y}|${z.type}`;
      if (!z.contains(cx, cy, b.width, b.height)) continue;

      const def = INK[z.type];
      if (z.type === "blue") {
        this.inkDragMul = Math.max(this.inkDragMul, def.dragMul);
        if (!this.lastInkHit.has(key)) {
          this.renderer.addInkSplat(cx, cy, def.color);
          this.lastInkHit.add(key);
        }
      } else if (z.type === "red") {
        boat.vy = -Math.abs(boat.vy) * def.bounce;
        this.renderer.screenShake(0.1, 2);
        this.renderer.addInkSplat(cx, cy, def.color, 55);
        z.active = false;
      } else if (z.type === "yellow") {
        this.slippery = true;
        if (!this.lastInkHit.has(key)) {
          this.renderer.addInkSplat(cx, cy, def.color, 50);
          this.lastInkHit.add(key);
        }
      }
    }
  }

  _handleCollisions() {
    if (this.invuln > 0) return;
    const boat = this.boat;
    const b = boat.bounds();

    for (const o of this.obstacles) {
      if (o.hit) continue;
      if (circleRectOverlap(o.x, o.y, o.radius, b)) {
        o.hit = true;
        this._hurt();
        break;
      }
    }
  }

  _hurt() {
    this.lives -= 1;
    this.invuln = GRACE_PERIOD;
    this.boat.crumple();
    this.boat.vx *= 0.3;

    if (this.lives <= 0) {
      this.state = STATE.GAMEOVER;
      this._saveHighScore();
      this.ui.showGameOver(this.score, this.highScore);
    }
  }

  _syncUI() {
    this.ui.setScore(this.score);
    this.ui.setLives(this.lives);
    this.ui.setSogginess(this.boat.sogginess);
  }
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function boot() {
  const canvas = document.getElementById("game-canvas");
  const ui = createUI();
  const game = new Game(canvas, ui);
  ui.showMenu(game.highScore);
  game._loop(performance.now());
  return game;
}

window.__gameSaveData = () => {
  try { return { highScore: parseInt(localStorage.getItem('paper-drift-high'), 10) || 0 }; } catch(_) { return { highScore: 0 }; }
};
window.__gameLoadData = (d) => {
  if (d && d.highScore) {
    try { localStorage.setItem('paper-drift-high', String(d.highScore)); } catch(_) {}
  }
};

function createUI() {
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const overlayBtn = document.getElementById("overlay-btn");
  const hud = document.getElementById("hud");
  const scoreEl = document.getElementById("score");
  const livesEl = document.getElementById("lives");
  const soggyFill = document.getElementById("soggy-fill");
  const soggyLabel = document.getElementById("soggy-label");

  let startCb = () => {};
  let restartCb = () => {};

  overlayBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (overlay.dataset.mode === "gameover") restartCb();
    else startCb();
  });

  return {
    onStart(fn) {
      startCb = fn;
    },
    onRestart(fn) {
      restartCb = fn;
    },
    showMenu(highScore) {
      hud.classList.remove("is-visible");
      overlay.classList.add("is-open");
      overlay.dataset.mode = "menu";
      overlayTitle.textContent = "Paper Drift";
      overlayText.textContent = highScore > 0
        ? `Fold your boat to slip through tight currents. Best: ${highScore} leagues.`
        : "Fold your boat to slip through tight currents. Avoid rocks, ride the ink, dry out in the sun. Click or tap to fold.";
      overlayBtn.textContent = "Cast off";
    },
    showHUD() {
      hud.classList.add("is-visible");
    },
    hideOverlay() {
      overlay.classList.remove("is-open");
    },
    showGameOver(score, highScore) {
      overlay.classList.add("is-open");
      overlay.dataset.mode = "gameover";
      overlayTitle.textContent = "Boat lost";
      const best = Math.max(score, highScore || 0);
      overlayText.textContent = score >= best
        ? `You drifted ${score} leagues downriver — a new record!`
        : `You drifted ${score} leagues downriver. Best: ${best} leagues.`;
      overlayBtn.textContent = "Try again";
    },
    setScore(n) {
      scoreEl.textContent = String(n);
    },
    setLives(n) {
      livesEl.textContent = "♥".repeat(n) + "♡".repeat(Math.max(0, LIVES_START - n));
    },
    setSogginess(v) {
      soggyFill.style.width = `${v}%`;
      soggyLabel.textContent = `Sogginess ${Math.round(v)}%`;
      soggyFill.classList.toggle("soggy--warn", v > 50 && v <= 80);
      soggyFill.classList.toggle("soggy--danger", v > 80);
    }
  };
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => boot());
} else {
  boot();
}
