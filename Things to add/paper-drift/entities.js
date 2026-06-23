/**
 * Paper Drift — entity definitions.
 * Boat, obstacles, ink/sun trigger volumes, and procedural spawners.
 */

export const INK = {
  blue: { color: "#4A6FA5", dragMul: 1.8, label: "thick" },
  red: { color: "#C45C4A", bounce: 1.2, label: "bouncy" },
  yellow: { color: "#E8C547", friction: 0.99, label: "slippery" }
};

export const BOAT = {
  unfolded: { width: 60, height: 80, drag: 0.95, speedMul: 1.0 },
  folded: { width: 30, height: 50, drag: 0.85, speedMul: 1.5 }
};

const INK_STROKE = "#1A1A1A";

/** Paper boat with origami fold states and soggy simulation. */
export class Boat {
  constructor() {
    this.reset(0, 0);
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.folded = false;
    this.foldAnim = 1;
    this.foldTarget = 0;
    this.sogginess = 0;
    this.gliding = 0;
    this.crumpling = 0;
    this.dryFlash = 0;
    this.targetX = x;
    this.waterfallEdge = false;
  }

  toggleFold() {
    this.folded = !this.folded;
    this.foldTarget = this.folded ? 1 : 0;
    this.foldAnim = 0;
    if (!this.folded && this.waterfallEdge) {
      this.gliding = 1.5;
      this.vy -= 2;
    }
    this.waterfallEdge = false;
  }

  /** Interpolated hull dimensions during fold animation (150ms). */
  dims() {
    const t = easeOutCubic(this.foldAnim);
    const from = this.foldTarget > 0.5 ? BOAT.unfolded : BOAT.folded;
    const to = this.foldTarget > 0.5 ? BOAT.folded : BOAT.unfolded;
    return {
      width: lerp(from.width, to.width, t),
      height: lerp(from.height, to.height, t),
      drag: lerp(from.drag, to.drag, t),
      speedMul: lerp(from.speedMul, to.speedMul, t)
    };
  }

  bounds() {
    const { width, height } = this.dims();
    return {
      left: this.x - width / 2,
      right: this.x + width / 2,
      top: this.y - height / 2,
      bottom: this.y + height / 2,
      width,
      height
    };
  }

  /** Four hull vertices for fold polygon animation (converge toward center). */
  hullPoints(foldVisual = 0) {
    const { width, height } = this.dims();
    const cx = this.x;
    const cy = this.y;
    const pinch = foldVisual * 0.55;
    const hw = (width / 2) * (1 - pinch);
    const hh = (height / 2) * (1 - pinch);
    return [
      { x: cx, y: cy - hh },
      { x: cx + hw, y: cy + hh * 0.35 },
      { x: cx, y: cy + hh },
      { x: cx - hw, y: cy + hh * 0.35 }
    ];
  }

  update(dt, riverWidth) {
    if (this.foldAnim < 1) {
      this.foldAnim = Math.min(1, this.foldAnim + dt / 0.15);
    }
    if (this.gliding > 0) this.gliding = Math.max(0, this.gliding - dt);
    if (this.crumpling > 0) this.crumpling = Math.max(0, this.crumpling - dt);
    if (this.dryFlash > 0) this.dryFlash = Math.max(0, this.dryFlash - dt * 0.8);

    const margin = 24;
    this.targetX = clamp(this.targetX, margin, riverWidth - margin);
  }

  crumple() {
    this.crumpling = 0.45;
  }
}

/** Ink-stroked river rock. */
export class Obstacle {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.hit = false;
  }

  bounds() {
    return {
      left: this.x - this.radius,
      right: this.x + this.radius,
      top: this.y - this.radius,
      bottom: this.y + this.radius
    };
  }
}

/** Watercolor ink patch trigger volume. */
export class InkZone {
  constructor(x, y, radius, type) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.type = type;
    this.active = true;
    this.pulse = Math.random() * Math.PI * 2;
  }

  contains(bx, by, bw, bh) {
    const cx = bx;
    const cy = by;
    const dist = Math.hypot(cx - this.x, cy - this.y);
    return dist < this.radius + Math.max(bw, bh) * 0.25;
  }
}

/** Warm drying patch with dust motes. */
export class SunZone {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.motes = Array.from({ length: 8 }, (_, i) => ({
      ox: (Math.random() - 0.5) * radius * 1.2,
      oy: (Math.random() - 0.5) * radius * 0.8,
      phase: Math.random() * Math.PI * 2,
      size: 1.5 + Math.random() * 2.5
    }));
  }

  contains(bx, by) {
    return Math.hypot(bx - this.x, by - this.y) < this.radius;
  }
}

/** Waterfall lip — triggers gliding when unfolding off edge. */
export class WaterfallEdge {
  constructor(y, width) {
    this.y = y;
    this.width = width;
  }
}

/**
 * Procedural spawner — density ramps with distance traveled.
 */
export class WorldSpawner {
  constructor(riverWidth) {
    this.riverWidth = riverWidth;
    this.cursorY = 400;
    this.spacing = 280;
    this.seed = 1;
  }

  reset(riverWidth) {
    this.riverWidth = riverWidth;
    this.cursorY = 400;
    this.spacing = 280;
    this.seed = 1;
  }

  /** @returns {{ obstacles, inkZones, sunZones, waterfalls }} */
  spawnChunk(boatY, difficulty) {
    const out = { obstacles: [], inkZones: [], sunZones: [], waterfalls: [] };
    const horizon = boatY + 1400;
    const gap = Math.max(140, this.spacing - difficulty * 12);

    while (this.cursorY < horizon) {
      this.cursorY += gap * (0.75 + rand(this.seed++) * 0.5);
      const lane = 60 + rand(this.seed++) * (this.riverWidth - 120);
      const roll = rand(this.seed++);

      if (roll < 0.38) {
        out.obstacles.push(new Obstacle(lane, this.cursorY, 22 + rand(this.seed++) * 18));
      } else if (roll < 0.62) {
        const types = ["blue", "red", "yellow"];
        const type = types[Math.floor(rand(this.seed++) * types.length)];
        out.inkZones.push(new InkZone(lane, this.cursorY, 55 + rand(this.seed++) * 35, type));
      } else if (roll < 0.78) {
        out.sunZones.push(new SunZone(lane, this.cursorY, 70 + rand(this.seed++) * 40));
      } else if (roll < 0.86 && difficulty > 2) {
        out.waterfalls.push(new WaterfallEdge(this.cursorY, this.riverWidth));
      }
    }

    return out;
  }

  prune(boatY, lists) {
    const minY = boatY - 600;
    for (const key of Object.keys(lists)) {
      lists[key] = lists[key].filter((e) => e.y > minY);
    }
  }
}

export function circleRectOverlap(cx, cy, cr, rect) {
  const nearX = clamp(cx, rect.left, rect.right);
  const nearY = clamp(cy, rect.top, rect.bottom);
  return Math.hypot(cx - nearX, cy - nearY) < cr;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function rand(seed) {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export { INK_STROKE };
