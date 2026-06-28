/**
 * Forge Line — baked bitmap sprite atlas (procedural pixel art).
 * 16×16 logical pixels × 6 scale → 96×96 frames; crisp nearest-neighbor in-game.
 */
(function(NS) {
  var FRAME = 96;
  var PX = 6;
  var GRID = 16;

  var PAL = {
    iron: '#5c5650',
    ironDk: '#3d3935',
    ironLt: '#8a847c',
    rust: '#6b4428',
    rustDk: '#4a3020',
    rustLt: '#9a6840',
    ember: '#c45c2a',
    emberHi: '#e07840',
    emberDk: '#8b3a1f',
    emberCore: '#f0a060',
    chalk: '#e8e4dc',
    verd: '#4a6b5c',
    verdLt: '#7aa896',
    hazard: '#c9a227',
    hazardHi: '#e8c868',
    hazardDk: '#8a7020',
    ore: '#c9a227',
    oreHi: '#f0d878',
    oreDk: '#8a7020',
    black: '#1a1714',
    shadow: '#2a2622',
    glow: '#7ec8ff'
  };

  var atlas = {
    defenders: null,
    enemies: null,
    defenderFrames: {},
    enemyFrames: {}
  };

  function px(ctx, x, y, c) {
    if (!c) return;
    ctx.fillStyle = c;
    ctx.fillRect(x * PX, y * PX, PX, PX);
  }

  function rectPx(ctx, x, y, w, h, c) {
    ctx.fillStyle = c;
    ctx.fillRect(x * PX, y * PX, w * PX, h * PX);
  }

  function drawFrameToSheet(sheetCtx, drawFn, col, row, frameIdx) {
    var oc = document.createElement('canvas');
    oc.width = FRAME;
    oc.height = FRAME;
    var octx = oc.getContext('2d');
    octx.imageSmoothingEnabled = false;
    drawFn(octx, frameIdx);
    sheetCtx.imageSmoothingEnabled = false;
    sheetCtx.drawImage(oc, col * FRAME, row * FRAME);
  }

  // ─── Defender pixel painters (frameIdx 0–3 = idle bob / anim) ───────────────

  function outlineRect(ctx, x, y, w, h, c) {
    for (var ox = 0; ox < w; ox++) {
      px(ctx, x + ox, y, c);
      px(ctx, x + ox, y + h - 1, c);
    }
    for (var oy = 1; oy < h - 1; oy++) {
      px(ctx, x, y + oy, c);
      px(ctx, x + w - 1, y + oy, c);
    }
  }

  var DEFENDER_DRAW = {
    ore_collector: function(ctx, f) {
      var bob = f % 2;
      rectPx(ctx, 3, 9 + bob, 10, 4, PAL.ironDk);
      rectPx(ctx, 4, 5 + bob, 8, 4, PAL.iron);
      rectPx(ctx, 5, 2 + bob, 6, 3, PAL.rustDk);
      rectPx(ctx, 6, 1 + bob, 4, 1, PAL.ironLt);
      px(ctx, 5, 12 + bob, PAL.oreDk);
      px(ctx, 6, 12 + bob, PAL.ore);
      px(ctx, 7, 12 + bob, PAL.oreHi);
      px(ctx, 8, 12 + bob, PAL.ore);
      px(ctx, 9, 12 + bob, PAL.oreDk);
      px(ctx, 7, 11 + bob, PAL.oreHi);
      px(ctx, 8, 11 + bob, PAL.hazardHi);
      for (var i = 0; i < 3; i++) {
        px(ctx, 7 + (i % 2), 0 + bob - Math.floor(f / 2) - i, PAL.chalk);
      }
      outlineRect(ctx, 4, 5 + bob, 8, 4, PAL.black);
      rectPx(ctx, 2, 10 + bob, 1, 2, PAL.ironLt);
      rectPx(ctx, 13, 10 + bob, 1, 2, PAL.ironLt);
    },
    rivet_cannon: function(ctx, f) {
      rectPx(ctx, 2, 9, 10, 4, PAL.ironDk);
      rectPx(ctx, 4, 7, 8, 3, PAL.iron);
      rectPx(ctx, 9, 6, 5 + (f % 2), 3, PAL.ironLt);
      rectPx(ctx, 13, 7, 2, 2, PAL.ember);
      px(ctx, 14 + (f % 2), 7, PAL.emberHi);
      px(ctx, 5, 8, PAL.black);
      px(ctx, 10, 7, PAL.rustDk);
      rectPx(ctx, 3, 12, 5, 2, PAL.rustDk);
      rectPx(ctx, 9, 12, 4, 2, PAL.rustDk);
      outlineRect(ctx, 4, 7, 8, 3, PAL.black);
    },
    plate_barrier: function(ctx, f) {
      rectPx(ctx, 4, 2, 8, 12, PAL.iron);
      rectPx(ctx, 5, 2, 6, 1, PAL.ironLt);
      rectPx(ctx, 4, 6, 8, 1, PAL.ironDk);
      rectPx(ctx, 4, 10, 8, 1, PAL.ironDk);
      for (var r = 0; r < 6; r++) {
        px(ctx, 5 + (r % 3) * 2, 4 + Math.floor(r / 3) * 4, PAL.ironLt);
        px(ctx, 6 + (r % 3) * 2, 4 + Math.floor(r / 3) * 4, PAL.rustDk);
      }
      px(ctx, 4 + (f % 2), 1, PAL.hazard);
      px(ctx, 11 - (f % 2), 1, PAL.hazard);
      outlineRect(ctx, 4, 2, 8, 12, PAL.black);
    },
    steam_kettle: function(ctx, f) {
      rectPx(ctx, 3, 9, 10, 4, PAL.rust);
      rectPx(ctx, 5, 6, 6, 3, PAL.ironDk);
      rectPx(ctx, 6, 4, 4, 2, PAL.iron);
      px(ctx, 7, 3, PAL.ironLt);
      for (var s = 0; s < 3; s++) {
        px(ctx, 6 + (s % 2), 2 - s - Math.floor(f / 2), PAL.chalk);
        px(ctx, 8, 1 - s, 'rgba(232,224,216,' + (0.7 - s * 0.15) + ')');
      }
      px(ctx, 4, 10, PAL.emberDk);
      px(ctx, 11, 10, PAL.emberDk);
      outlineRect(ctx, 3, 6, 10, 7, PAL.black);
    },
    magnet_coil: function(ctx, f) {
      rectPx(ctx, 5, 11, 6, 2, PAL.ironDk);
      rectPx(ctx, 4, 6, 8, 2, PAL.rust);
      rectPx(ctx, 5, 8, 6, 2, PAL.rustLt);
      rectPx(ctx, 6, 4, 4, 2, PAL.iron);
      if (f % 2) {
        px(ctx, 2, 7, PAL.glow);
        px(ctx, 13, 7, PAL.glow);
        px(ctx, 3, 8, PAL.emberHi);
        px(ctx, 12, 8, PAL.emberHi);
      }
      outlineRect(ctx, 4, 4, 8, 6, PAL.black);
    },
    drill_pod: function(ctx, f) {
      rectPx(ctx, 6, 2, 4, 5, PAL.ironLt);
      rectPx(ctx, 7, 1, 2, 1, PAL.emberHi);
      rectPx(ctx, 4, 7, 8, 6, PAL.ironDk);
      rectPx(ctx, 5, 8, 6, 4, PAL.iron);
      px(ctx, 8, 13 - (f % 2), PAL.ember);
      px(ctx, 7, 12, PAL.emberHi);
      px(ctx, 9, 12, PAL.emberHi);
      outlineRect(ctx, 4, 7, 8, 6, PAL.black);
    },
    conveyor_drone: function(ctx, f) {
      rectPx(ctx, 3, 9, 10, 3, PAL.iron);
      rectPx(ctx, 2, 6, 12, 3, PAL.ironDk);
      px(ctx, 1 + (f % 4), 7, PAL.emberHi);
      px(ctx, 13 - (f % 4), 7, PAL.emberHi);
      rectPx(ctx, 5, 12, 6, 2, PAL.rustDk);
      px(ctx, 7, 7, PAL.emberCore);
      px(ctx, 8, 7, PAL.emberCore);
      outlineRect(ctx, 2, 6, 12, 3, PAL.black);
    },
    tesla_pylon: function(ctx, f) {
      rectPx(ctx, 6, 4, 4, 10, PAL.ironDk);
      rectPx(ctx, 5, 10, 6, 3, PAL.iron);
      px(ctx, 7, 3, PAL.emberHi);
      px(ctx, 8, 3, PAL.emberHi);
      px(ctx, 8, 2, PAL.chalk);
      if (f % 2) {
        px(ctx, 2, 6, PAL.ember);
        px(ctx, 13, 7, PAL.ember);
        px(ctx, 4, 9, PAL.emberHi);
        px(ctx, 11, 5, PAL.emberHi);
        px(ctx, 8, 1, PAL.chalk);
      }
      outlineRect(ctx, 5, 4, 6, 9, PAL.black);
    },
    foundry_bloom: function(ctx, f) {
      rectPx(ctx, 5, 10, 6, 3, PAL.ironDk);
      for (var p = 0; p < 6; p++) {
        var dx = Math.round(Math.cos((p / 6) * Math.PI * 2 + f * 0.5) * 3);
        var dy = Math.round(Math.sin((p / 6) * Math.PI * 2 + f * 0.5) * 2);
        px(ctx, 8 + dx, 7 + dy, PAL.ember);
        if (p % 2) px(ctx, 8 + dx, 6 + dy, PAL.emberHi);
      }
      rectPx(ctx, 6, 6, 4, 4, PAL.emberCore);
      px(ctx, 7, 7, PAL.chalk);
      px(ctx, 8, 7, PAL.chalk);
    },
    coolant_sprayer: function(ctx, f) {
      rectPx(ctx, 4, 8, 8, 5, PAL.verd);
      rectPx(ctx, 6, 5, 6, 3, PAL.verdLt);
      rectPx(ctx, 7, 4, 4, 1, PAL.ironDk);
      if (f % 2) {
        px(ctx, 12, 6, PAL.verdLt);
        px(ctx, 13, 5, PAL.chalk);
        px(ctx, 14, 4, PAL.chalk);
        px(ctx, 11, 7, PAL.chalk);
      }
      outlineRect(ctx, 4, 5, 8, 8, PAL.black);
    },
    scrap_recycler: function(ctx, f) {
      rectPx(ctx, 3, 6, 10, 7, PAL.iron);
      rectPx(ctx, 4, 5, 8, 1, PAL.ironLt);
      rectPx(ctx, 5, 7, 6, 5, PAL.ironDk);
      px(ctx, 7, 8, PAL.ore);
      px(ctx, 8, 8, PAL.oreHi);
      px(ctx, 7, 9, PAL.oreDk);
      px(ctx, 8, 9, PAL.ore);
      if (f % 2) {
        px(ctx, 8, 6, PAL.emberHi);
        px(ctx, 8, 11, PAL.emberHi);
      }
      outlineRect(ctx, 3, 6, 10, 7, PAL.black);
    }
  };

  var DEFENDER_IDS = [
    'ore_collector', 'rivet_cannon', 'plate_barrier', 'steam_kettle',
    'magnet_coil', 'drill_pod', 'conveyor_drone', 'tesla_pylon',
    'foundry_bloom', 'coolant_sprayer', 'scrap_recycler'
  ];

  // ─── Enemy pixel painters ───────────────────────────────────────────────────

  var ENEMY_DRAW = {
    scrap_walker: function(ctx, f, variant) {
      var leg = f % 2;
      rectPx(ctx, 4, 4, 8, 9, PAL.rust);
      rectPx(ctx, 5, 3, 6, 2, PAL.rustDk);
      px(ctx, 5, 6, PAL.emberCore);
      px(ctx, 10, 6, PAL.emberCore);
      px(ctx, 6, 5, PAL.black);
      px(ctx, 9, 5, PAL.black);
      px(ctx, 4 + leg, 13, PAL.ironDk);
      px(ctx, 9 - leg, 13, PAL.ironDk);
      px(ctx, 7, 7, PAL.emberDk);
      outlineRect(ctx, 4, 4, 8, 9, PAL.black);
    },
    riveted_brute: function(ctx, f) {
      rectPx(ctx, 3, 3, 10, 11, PAL.rustDk);
      rectPx(ctx, 4, 2, 8, 2, PAL.ironDk);
      for (var i = 0; i < 4; i++) {
        px(ctx, 5 + (i % 2) * 4, 5 + Math.floor(i / 2) * 4, PAL.ironLt);
        px(ctx, 6 + (i % 2) * 4, 5 + Math.floor(i / 2) * 4, PAL.hazardDk);
      }
      px(ctx, 6, 7, PAL.emberCore);
      px(ctx, 9, 7, PAL.emberCore);
      px(ctx, 7, 6, PAL.black);
      outlineRect(ctx, 3, 3, 10, 11, PAL.black);
    },
    shield_hauler: function(ctx, f) {
      rectPx(ctx, 7, 5, 4, 8, PAL.iron);
      rectPx(ctx, 4, 6, 3, 6, PAL.rust);
      px(ctx, 5, 7, PAL.emberCore);
      px(ctx, 8, 7, PAL.emberCore);
      px(ctx, 3, 8, PAL.ironLt);
      px(ctx, 5, 6, PAL.black);
      px(ctx, 8, 6, PAL.black);
      outlineRect(ctx, 4, 5, 7, 8, PAL.black);
    },
    spring_jumper: function(ctx, f) {
      var squash = f % 2 ? 0 : 1;
      rectPx(ctx, 5, 7 + squash, 6, 5 - squash, PAL.rust);
      for (var c = 0; c < 3; c++) {
        px(ctx, 6 + c, 12 - squash - c, PAL.ironLt);
      }
      px(ctx, 6, 6, PAL.emberCore);
      px(ctx, 9, 6, PAL.emberCore);
      px(ctx, 7, 7 + squash, PAL.emberDk);
      outlineRect(ctx, 5, 6 + squash, 6, 6 - squash, PAL.black);
    },
    lane_digger: function(ctx, f) {
      rectPx(ctx, 5, 6, 6, 7, PAL.rustDk);
      rectPx(ctx, 7, 3, 2, 4, PAL.iron);
      px(ctx, 7, 2 - (f % 2), PAL.emberHi);
      px(ctx, 6, 8, PAL.emberCore);
      px(ctx, 9, 8, PAL.emberCore);
      px(ctx, 7, 7, PAL.hazard);
      outlineRect(ctx, 5, 6, 6, 7, PAL.black);
    },
    rust_elite: function(ctx, f) {
      rectPx(ctx, 4, 5, 8, 8, PAL.rustDk);
      px(ctx, 4, 5, PAL.ember);
      px(ctx, 11, 5, PAL.ember);
      px(ctx, 6, 7, PAL.emberCore);
      px(ctx, 9, 7, PAL.emberCore);
      px(ctx, 8, 4 + (f % 2), PAL.hazard);
      outlineRect(ctx, 4, 5, 8, 8, PAL.black);
    },
    conveyor_hijacker: function(ctx, f) {
      rectPx(ctx, 5, 7, 6, 5, PAL.rust);
      px(ctx, 4 + (f % 3), 6, PAL.emberHi);
      px(ctx, 6, 7, PAL.emberCore);
      px(ctx, 9, 7, PAL.emberCore);
      rectPx(ctx, 4, 10, 8, 1, PAL.ironDk);
      outlineRect(ctx, 5, 7, 6, 5, PAL.black);
    },
    amalgam_swarm: function(ctx, f) {
      rectPx(ctx, 6, 7, 4, 4, PAL.rust);
      px(ctx, 7, 8, PAL.emberCore);
      px(ctx, 6 + (f % 2), 10, PAL.rustDk);
      px(ctx, 8 + (f % 2), 10, PAL.rustDk);
      px(ctx, 5, 8, PAL.rustDk);
      outlineRect(ctx, 6, 7, 4, 4, PAL.black);
    },
    clunker_captain: function(ctx, f) {
      rectPx(ctx, 2, 2, 12, 12, PAL.rustDk);
      rectPx(ctx, 3, 1, 10, 2, PAL.ironDk);
      rectPx(ctx, 1, 5, 2, 6, PAL.iron);
      rectPx(ctx, 13, 5, 2, 6, PAL.iron);
      rectPx(ctx, 4, 4, 8, 3, PAL.rust);
      px(ctx, 5, 6, PAL.emberCore);
      px(ctx, 8, 6, PAL.emberCore);
      px(ctx, 6, 5, PAL.emberHi);
      px(ctx, 9, 5, PAL.emberHi);
      px(ctx, 7, 9, PAL.hazard);
      px(ctx, 8, 9, PAL.hazardHi);
      if (f % 2) {
        px(ctx, 7, 0, PAL.emberHi);
        px(ctx, 8, 0, PAL.emberHi);
      }
      outlineRect(ctx, 2, 2, 12, 12, PAL.black);
    },
    smelter_king: function(ctx, f) {
      rectPx(ctx, 1, 1, 14, 13, PAL.emberDk);
      rectPx(ctx, 2, 0, 12, 2, PAL.ironDk);
      rectPx(ctx, 3, 3, 10, 8, PAL.rustDk);
      px(ctx, 5, 6, PAL.emberCore);
      px(ctx, 10, 6, PAL.emberCore);
      px(ctx, 6, 5, PAL.emberHi);
      px(ctx, 9, 5, PAL.emberHi);
      px(ctx, 7, 4, PAL.chalk);
      for (var i = 0; i < 5; i++) {
        px(ctx, 3 + i * 2, 11 + (f + i) % 2, PAL.ember);
      }
      rectPx(ctx, 5, 12, 6, 2, PAL.ironDk);
      outlineRect(ctx, 1, 1, 14, 13, PAL.black);
    }
  };

  var ENEMY_IDS = Object.keys(ENEMY_DRAW);
  var FRAMES_PER = 4;

  function buildDefenderAtlas() {
    var cols = FRAMES_PER;
    var rows = DEFENDER_IDS.length;
    var canvas = document.createElement('canvas');
    canvas.width = cols * FRAME;
    canvas.height = rows * FRAME;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    for (var r = 0; r < DEFENDER_IDS.length; r++) {
      var id = DEFENDER_IDS[r];
      var draw = DEFENDER_DRAW[id];
      atlas.defenderFrames[id] = { row: r, idle: [] };
      for (var f = 0; f < FRAMES_PER; f++) {
        drawFrameToSheet(ctx, draw, f, r, f);
        atlas.defenderFrames[id].idle.push(f);
      }
    }
    atlas.defenders = canvas;
  }

  function buildEnemyAtlas() {
    var cols = FRAMES_PER;
    var rows = ENEMY_IDS.length;
    var canvas = document.createElement('canvas');
    canvas.width = cols * FRAME;
    canvas.height = rows * FRAME;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    for (var r = 0; r < ENEMY_IDS.length; r++) {
      var id = ENEMY_IDS[r];
      var draw = ENEMY_DRAW[id];
      atlas.enemyFrames[id] = { row: r, walk: [] };
      for (var f = 0; f < FRAMES_PER; f++) {
        drawFrameToSheet(ctx, function(c, fi) { draw(c, fi, {}); }, f, r, f);
        atlas.enemyFrames[id].walk.push(f);
      }
    }
    atlas.enemies = canvas;
  }

  function frameIndex(time, fps, count) {
    return Math.floor(time * 0.001 * fps) % count;
  }

  NS.SpriteAtlas = {
    ready: false,

    init: function() {
      if (this.ready) return;
      buildDefenderAtlas();
      buildEnemyAtlas();
      this.ready = true;
    },

    /** Draw defender sprite centered at cx,cy with given half-size scale. */
    drawDefender: function(ctx, id, cx, cy, size, time) {
      if (!this.ready || !atlas.defenders) return false;
      var meta = atlas.defenderFrames[id] || atlas.defenderFrames.ore_collector;
      var fi = meta.idle[frameIndex(time, 6, meta.idle.length)];
      var scale = (size * 2) / FRAME;
      var sx = fi * FRAME;
      var sy = meta.row * FRAME;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        atlas.defenders,
        sx, sy, FRAME, FRAME,
        cx - size, cy - size, size * 2, size * 2
      );
      ctx.restore();
      return true;
    },

    /** Draw enemy sprite; tmpl from C.ENEMIES, e from engine.enemies item. */
    drawEnemy: function(ctx, enemy, tmpl, cx, cy, size, time) {
      if (!this.ready || !atlas.enemies) return false;
      var type = enemy.type;
      if (!atlas.enemyFrames[type]) type = 'scrap_walker';
      var meta = atlas.enemyFrames[type];
      var fi = meta.walk[frameIndex(time, 8 + (tmpl.speed || 0.2) * 12, meta.walk.length)];
      var sx = fi * FRAME;
      var sy = meta.row * FRAME;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        atlas.enemies,
        sx, sy, FRAME, FRAME,
        cx - size, cy - size, size * 2, size * 2
      );
      ctx.restore();
      return true;
    },

    /** Returns a <canvas> for seed tray (scaled down from atlas). */
    createTrayIcon: function(id) {
      this.init();
      var TRAY = 72;
      var c = document.createElement('canvas');
      c.width = TRAY;
      c.height = TRAY;
      c.className = 'seed-sprite';
      var ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      var meta = atlas.defenderFrames[id] || atlas.defenderFrames.ore_collector;
      var sx = 0;
      var sy = meta.row * FRAME;
      ctx.drawImage(atlas.defenders, sx, sy, FRAME, FRAME, 0, 0, TRAY, TRAY);
      return c;
    },

    createEnemyIcon: function(type) {
      this.init();
      var TRAY = 72;
      var c = document.createElement('canvas');
      c.width = TRAY;
      c.height = TRAY;
      var ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      var meta = atlas.enemyFrames[type] || atlas.enemyFrames.scrap_walker;
      var sx = 0;
      var sy = meta.row * FRAME;
      ctx.drawImage(atlas.enemies, sx, sy, FRAME, FRAME, 0, 0, TRAY, TRAY);
      return c;
    },

    defenderIds: DEFENDER_IDS
  };
})(window.ForgeLine = window.ForgeLine || {});
