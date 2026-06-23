/**
 * Crystal Nexus — Renderer
 * Canvas 2D rendering: board, pieces, particles, starfield, effects, UI
 */
window.CrystalNexus = window.CrystalNexus || {};

(function(NS) {

var canvas, ctx;
var W, H; // canvas logical dimensions

/* Scale calculation */
var scale = 1;
var boardOffsetX = 0;
var boardOffsetY = 0;
var boardPixelW, boardPixelH;

/* Starfield */
var stars = [];
var nebulaParticles = [];

/* Particle system */
var particles = [];
var textPopups = [];

/* Screen shake */
var shakeX = 0, shakeY = 0, shakeIntensity = 0;

/* Flash overlay */
var flashAlpha = 0;
var flashColor = '#ffffff';

/* HUD element references */
var hud = {
  score: document.getElementById('hud-score'),
  level: document.getElementById('hud-level'),
  lines: document.getElementById('hud-lines')
};

/* Glow cache (rendered once) */
var glowCanvas = null;

/* ─── Initialization ─── */
NS.Renderer = {};

NS.Renderer.init = function(c) {
  canvas = c;
  ctx = canvas.getContext('2d');
  initStars();
  initGlowCache();
  resize();
};

function resize() {
  var parent = canvas.parentElement;
  W = parent.clientWidth;
  H = parent.clientHeight;
  canvas.width = W;
  canvas.height = H;

  // Calculate scaling: board should fit with side panels
  boardPixelW = NS.COLS * NS.CELL_SIZE;
  boardPixelH = NS.VISIBLE_ROWS * NS.CELL_SIZE;

  var maxBoardW = W * 0.4;
  var maxBoardH = H * 0.85;
  var scaleX = maxBoardW / boardPixelW;
  var scaleY = maxBoardH / boardPixelH;
  scale = Math.min(scaleX, scaleY, 1.5);

  boardPixelW = NS.COLS * NS.CELL_SIZE * scale;
  boardPixelH = NS.VISIBLE_ROWS * NS.CELL_SIZE * scale;

  boardOffsetX = (W - boardPixelW) / 2;
  boardOffsetY = (H - boardPixelH) / 2;
}

/* ─── Starfield ─── */
function initStars() {
  stars = [];
  for (var i = 0; i < 200; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 2 + 0.5,
      brightness: Math.random() * 0.8 + 0.2,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      twinkleOffset: Math.random() * Math.PI * 2
    });
  }
  nebulaParticles = [];
  for (var i = 0; i < 60; i++) {
    nebulaParticles.push({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 120 + 40,
      hue: Math.random() * 60 + 260, // purple-blue range
      alpha: Math.random() * 0.03 + 0.01,
      driftX: (Math.random() - 0.5) * 0.0003,
      driftY: (Math.random() - 0.5) * 0.0003
    });
  }
}

function initGlowCache() {
  glowCanvas = document.createElement('canvas');
  glowCanvas.width = 64;
  glowCanvas.height = 64;
  var gc = glowCanvas.getContext('2d');
  var grad = gc.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,0.5)');
  grad.addColorStop(0.2, 'rgba(255,255,255,0.2)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.05)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  gc.fillStyle = grad;
  gc.fillRect(0, 0, 64, 64);
}

/* ─── Particles ─── */
function spawnParticles(x, y, color, count, spread, life) {
  for (var i = 0; i < count; i++) {
    var angle = Math.random() * Math.PI * 2;
    var speed = Math.random() * spread + spread * 0.2;
    particles.push({
      x: x, y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: life || 60,
      maxLife: life || 60,
      size: Math.random() * 4 + 1,
      color: color,
      decay: Math.random() * 0.02 + 0.01
    });
  }
}

function spawnLineClearParticles(row, color) {
  var y = boardOffsetY + (row - NS.HIDDEN_ROWS) * NS.CELL_SIZE * scale + NS.CELL_SIZE * scale / 2;
  for (var c = 0; c < NS.COLS; c++) {
    var x = boardOffsetX + c * NS.CELL_SIZE * scale + NS.CELL_SIZE * scale / 2;
    spawnParticles(x, y, color, 3, 3, 40);
  }
}

function spawnChainParticles(cells, element) {
  for (var i = 0; i < cells.length; i++) {
    var r = cells[i].r - NS.HIDDEN_ROWS;
    var y = boardOffsetY + r * NS.CELL_SIZE * scale + NS.CELL_SIZE * scale / 2;
    var x = boardOffsetX + cells[i].c * NS.CELL_SIZE * scale + NS.CELL_SIZE * scale / 2;
    spawnParticles(x, y, element.color, 6, 5, 50);
  }
}

function addTextPopup(x, y, text, color, size) {
  textPopups.push({
    x: x, y: y,
    text: text,
    color: color || '#ffffff',
    size: size || 16,
    life: 90,
    maxLife: 90,
    vy: -1.5
  });
}

/* ─── Drawing ─── */

function drawBackground(time) {
  // Deep space
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, W, H);

  // Nebula blobs
  for (var i = 0; i < nebulaParticles.length; i++) {
    var n = nebulaParticles[i];
    var px = n.x * W + Math.sin(time * n.driftX) * 50;
    var py = n.y * H + Math.sin(time * n.driftY + 1) * 50;
    var grad = ctx.createRadialGradient(px, py, 0, px, py, n.size);
    grad.addColorStop(0, 'hsla(' + n.hue + ', 60%, 40%, ' + (n.alpha * 0.5) + ')');
    grad.addColorStop(1, 'hsla(' + n.hue + ', 60%, 40%, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(px - n.size, py - n.size, n.size * 2, n.size * 2);
  }

  // Stars
  for (var i = 0; i < stars.length; i++) {
    var s = stars[i];
    var alpha = s.brightness * (0.6 + 0.4 * Math.sin(time * s.twinkleSpeed + s.twinkleOffset));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(s.x * W, s.y * H, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawBoard() {
  var bx = boardOffsetX, by = boardOffsetY;
  var cellW = NS.CELL_SIZE * scale;
  var cellH = NS.CELL_SIZE * scale;

  // Board background
  ctx.fillStyle = 'rgba(8, 8, 20, 0.85)';
  ctx.shadowColor = 'rgba(136,68,255,0.15)';
  ctx.shadowBlur = 20;
  ctx.fillRect(bx - 4, by - 4, boardPixelW + 8, boardPixelH + 8);
  ctx.shadowBlur = 0;

  // Board border
  ctx.strokeStyle = 'rgba(136,68,255,0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(bx - 4, by - 4, boardPixelW + 8, boardPixelH + 8);

  // Grid lines
  ctx.strokeStyle = 'rgba(136,68,255,0.06)';
  ctx.lineWidth = 1;
  for (var r = 0; r <= NS.VISIBLE_ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(bx, by + r * cellH);
    ctx.lineTo(bx + boardPixelW, by + r * cellH);
    ctx.stroke();
  }
  for (var c = 0; c <= NS.COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(bx + c * cellW, by);
    ctx.lineTo(bx + c * cellW, by + boardPixelH);
    ctx.stroke();
  }
}

function drawCell(x, y, element, alpha, glowIntensity) {
  var cellW = NS.CELL_SIZE * scale;
  var cellH = NS.CELL_SIZE * scale;
  alpha = alpha || 1;
  glowIntensity = glowIntensity || 0.3;

  // Glow behind cell
  if (glowIntensity > 0.05) {
    ctx.shadowColor = element.color;
    ctx.shadowBlur = 15 * glowIntensity;
  }

  // Main cell fill with gradient
  var grad = ctx.createLinearGradient(x, y, x + cellW, y + cellH);
  grad.addColorStop(0, element.color);
  grad.addColorStop(0.5, element.glow || element.color);
  grad.addColorStop(1, element.color);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = grad;
  ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);

  // Inner highlight (top-left shine)
  ctx.globalAlpha = alpha * 0.25;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + 2, y + 2, cellW * 0.3, cellH * 0.15);

  // Crystal facet lines
  ctx.globalAlpha = alpha * 0.15;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + cellW * 0.2, y);
  ctx.lineTo(x + cellW * 0.4, y + cellH);
  ctx.moveTo(x + cellW * 0.6, y);
  ctx.lineTo(x + cellW * 0.8, y + cellH);
  ctx.moveTo(x, y + cellH * 0.3);
  ctx.lineTo(x + cellW, y + cellH * 0.4);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function drawPiece(piece, alpha) {
  if (!piece) return;
  var visibleRowOffset = NS.HIDDEN_ROWS;
  var cellW = NS.CELL_SIZE * scale;
  var cellH = NS.CELL_SIZE * scale;
  var shape = piece.shape;
  var element = piece.element;

  for (var r = 0; r < shape.length; r++) {
    for (var c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      var drawR = piece.y + r - visibleRowOffset;
      if (drawR < 0) continue;
      var px = boardOffsetX + (piece.x + c) * cellW;
      var py = boardOffsetY + drawR * cellH;
      var glow = NS.prismSurge && NS.prismSurge.active ? 1.0 : 0.3;
      drawCell(px, py, element, alpha || 1, glow);
    }
  }
}

function drawGhost(piece) {
  if (!piece || !NS.settings || !NS.settings.ghost) return;
  if (NS.prismSurge && NS.prismSurge.active) return; // no ghost in surge mode
  var ghostY = NS.board.getGhostY(piece);
  if (ghostY === piece.y) return;
  var visibleRowOffset = NS.HIDDEN_ROWS;
  var cellW = NS.CELL_SIZE * scale;
  var cellH = NS.CELL_SIZE * scale;
  var shape = piece.shape;
  var element = piece.element;

  for (var r = 0; r < shape.length; r++) {
    for (var c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      var drawR = ghostY + r - visibleRowOffset;
      if (drawR < 0) continue;
      var px = boardOffsetX + (piece.x + c) * cellW;
      var py = boardOffsetY + drawR * cellH;
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = element.color;
      ctx.fillRect(px + 1, py + 1, cellW - 2, cellH - 2);
      ctx.globalAlpha = 1;
    }
  }
}

function drawLockedBoard(highlightChains) {
  var visibleRowOffset = NS.HIDDEN_ROWS;
  var cellW = NS.CELL_SIZE * scale;
  var cellH = NS.CELL_SIZE * scale;
  var highlightSet = {};
  if (highlightChains) {
    for (var i = 0; i < highlightChains.length; i++) {
      for (var j = 0; j < highlightChains[i].positions.length; j++) {
        var p = highlightChains[i].positions[j];
        highlightSet[p.r + ',' + p.c] = { element: highlightChains[i].element };
      }
    }
  }

  for (var r = visibleRowOffset; r < NS.TOTAL_ROWS; r++) {
    for (var c = 0; c < NS.COLS; c++) {
      var cell = NS.board.grid[r][c];
      if (!cell) continue;
      var drawR = r - visibleRowOffset;
      var px = boardOffsetX + c * cellW;
      var py = boardOffsetY + drawR * cellH;
      var hl = highlightSet[r + ',' + c];
      var element = hl ? hl.element : cell.element;
      var glowIntensity = hl ? 0.8 : 0.2;
      drawCell(px, py, element, 1, glowIntensity);
    }
  }
}

function drawRiftShard() {
  if (!NS.riftShard || !NS.riftShard.active) return;
  var s = NS.riftShard;
  var visibleRowOffset = NS.HIDDEN_ROWS;
  var drawR = s.row - visibleRowOffset;
  if (drawR < 0) return;
  var cellW = NS.CELL_SIZE * scale;
  var cellH = NS.CELL_SIZE * scale;
  var px = boardOffsetX + s.col * cellW;
  var py = boardOffsetY + drawR * cellH;

  // Pulsing crystal
  var pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
  ctx.shadowColor = '#ff44ff';
  ctx.shadowBlur = 20 * pulse;
  ctx.globalAlpha = pulse;

  // Diamond shape
  var cx = px + cellW / 2, cy = py + cellH / 2;
  ctx.fillStyle = '#ff44ff';
  ctx.beginPath();
  ctx.moveTo(cx, py + 2);
  ctx.lineTo(px + cellW - 2, cy);
  ctx.lineTo(cx, py + cellH - 2);
  ctx.lineTo(px + 2, cy);
  ctx.closePath();
  ctx.fill();

  // Inner glow
  ctx.fillStyle = 'rgba(255,200,255,0.4)';
  ctx.beginPath();
  ctx.moveTo(cx, py + 6);
  ctx.lineTo(px + cellW - 6, cy);
  ctx.lineTo(cx, py + cellH - 6);
  ctx.lineTo(px + 6, cy);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function drawNextQueue(queue) {
  var sideX = boardOffsetX + boardPixelW + 12;
  var sideY = boardOffsetY + 10;
  var cellW = NS.CELL_SIZE * scale * 0.35;

  ctx.font = '10px Orbitron, monospace';
  ctx.fillStyle = 'rgba(136,68,255,0.6)';
  ctx.textAlign = 'left';
  ctx.fillText('NEXT', sideX, sideY);

  for (var i = 0; i < Math.min(queue.length, 5); i++) {
    var type = queue[i];
    var shape = NS.SHAPES[type];
    var element = NS.PIECE_ELEMENTS[type];
    var pieceY = sideY + 10 + i * cellW * 4;

    for (var r = 0; r < shape.length; r++) {
      for (var c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        var px = sideX + c * cellW;
        var py = pieceY + r * cellW;
        ctx.fillStyle = element.color;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(px + 0.5, py + 0.5, cellW - 1, cellW - 1);
        ctx.globalAlpha = 1;
      }
    }
  }
}

function drawHoldPiece(heldType) {
  if (!heldType) return;
  var sideX = boardOffsetX - 90;
  var sideY = boardOffsetY + 10;
  var cellW = NS.CELL_SIZE * scale * 0.4;
  var shape = NS.SHAPES[heldType];
  var element = NS.PIECE_ELEMENTS[heldType];

  ctx.font = '10px Orbitron, monospace';
  ctx.fillStyle = 'rgba(136,68,255,0.6)';
  ctx.textAlign = 'left';
  ctx.fillText('HOLD', sideX, sideY);

  for (var r = 0; r < shape.length; r++) {
    for (var c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      var px = sideX + c * cellW;
      var py = sideY + 10 + r * cellW;
      ctx.fillStyle = element.color;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(px + 0.5, py + 0.5, cellW - 1, cellW - 1);
      ctx.globalAlpha = 1;
    }
  }
}

function drawPrismMeter() {
  if (!NS.prismSurge) return;
  var meterX = boardOffsetX + boardPixelW + 12;
  var meterY = boardOffsetY + boardPixelH - 120;
  var meterW = 14;
  var meterH = 100;

  // Background
  ctx.fillStyle = 'rgba(8,8,20,0.6)';
  ctx.strokeStyle = 'rgba(136,68,255,0.3)';
  ctx.lineWidth = 1;
  ctx.fillRect(meterX, meterY, meterW, meterH);
  ctx.strokeRect(meterX, meterY, meterW, meterH);

  // Fill
  var frac = NS.prismSurge.getMeterFraction();
  var fillH = meterH * frac;
  if (fillH > 0) {
    var grad = ctx.createLinearGradient(meterX, meterY + meterH, meterX, meterY);
    grad.addColorStop(0, 'rgba(136,68,255,0.3)');
    grad.addColorStop(0.5, 'rgba(255,68,170,0.6)');
    grad.addColorStop(1, 'rgba(68,221,255,0.8)');
    ctx.fillStyle = grad;
    ctx.fillRect(meterX, meterY + meterH - fillH, meterW, fillH);
  }

  // Label
  ctx.save();
  ctx.translate(meterX - 2, meterY - 10);
  ctx.font = '8px Orbitron, monospace';
  ctx.fillStyle = 'rgba(136,68,255,0.5)';
  ctx.textAlign = 'center';
  ctx.fillText('PRISM', 7, 8);
  ctx.restore();
}

function drawPrismSurgeActive() {
  if (!NS.prismSurge || !NS.prismSurge.active) return;
  var frac = NS.prismSurge.getTimerFraction();

  // Border glow
  var pulse = Math.sin(Date.now() * 0.01) * 0.15 + 0.85;
  ctx.shadowColor = '#ff44ff';
  ctx.shadowBlur = 30 * pulse;
  ctx.strokeStyle = 'rgba(255,68,255,' + (0.5 * pulse) + ')';
  ctx.lineWidth = 3;
  ctx.strokeRect(boardOffsetX - 6, boardOffsetY - 6, boardPixelW + 12, boardPixelH + 12);
  ctx.shadowBlur = 0;

  // Timer bar
  var barW = boardPixelW * frac;
  var grad = ctx.createLinearGradient(boardOffsetX, 0, boardOffsetX + boardPixelW, 0);
  grad.addColorStop(0, 'rgba(136,68,255,0.4)');
  grad.addColorStop(0.5, 'rgba(255,68,170,0.6)');
  grad.addColorStop(1, 'rgba(68,221,255,0.4)');
  ctx.fillStyle = grad;
  ctx.fillRect(boardOffsetX, boardOffsetY + boardPixelH + 6, barW, 4);

  // Surge text
  ctx.font = 'bold 14px Orbitron, monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,68,255,' + (0.6 * pulse) + ')';
  ctx.shadowColor = '#ff44ff';
  ctx.shadowBlur = 20;
  ctx.fillText('PRISM SURGE x3', boardOffsetX + boardPixelW / 2, boardOffsetY - 14);
  ctx.shadowBlur = 0;
}

function drawParticles() {
  for (var i = particles.length - 1; i >= 0; i--) {
    var p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05;
    p.life--;
    var alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    var s = p.size * (0.5 + 0.5 * alpha);
    ctx.beginPath();
    ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
    ctx.fill();
    if (p.life <= 0) particles.splice(i, 1);
  }
  ctx.globalAlpha = 1;
}

function drawTextPopups() {
  for (var i = textPopups.length - 1; i >= 0; i--) {
    var p = textPopups[i];
    p.y += p.vy;
    p.life--;
    var alpha = p.life / p.maxLife;
    var scale2 = 1 + (1 - alpha) * 0.3;
    ctx.globalAlpha = alpha;
    ctx.font = 'bold ' + (p.size * scale2) + 'px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 10;
    ctx.fillText(p.text, p.x, p.y);
    ctx.shadowBlur = 0;
    if (p.life <= 0) textPopups.splice(i, 1);
  }
  ctx.globalAlpha = 1;
}

function drawFlash() {
  if (flashAlpha <= 0) return;
  ctx.globalAlpha = flashAlpha;
  ctx.fillStyle = flashColor;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  flashAlpha *= 0.85;
  if (flashAlpha < 0.01) flashAlpha = 0;
}

/* ─── Overlay Screens ─── */
function showOverlay(html) {
  var overlay = document.getElementById('overlay');
  var body = document.getElementById('overlay-body');
  overlay.classList.remove('hidden');
  if (body && html) body.innerHTML = html;
}

function hideOverlay() {
  document.getElementById('overlay').classList.add('hidden');
}

/* ─── Drawing score/level/lines in HUD ─── */
function updateHUD() {
  if (!NS.score) return;
  hud.score.textContent = NS.score.score.toLocaleString();
  hud.level.textContent = NS.score.level;
  hud.lines.textContent = NS.score.lines;
}

/* ─── Effect triggers ─── */
NS.Renderer.flash = function(color, intensity) {
  flashColor = color || '#ffffff';
  flashAlpha = intensity || 0.3;
};
NS.Renderer.shake = function(intensity) {
  shakeIntensity = intensity || 5;
};
NS.Renderer.spawnLineClear = function(row, color) {
  spawnLineClearParticles(row, color);
};
NS.Renderer.spawnChain = function(cells, element) {
  spawnChainParticles(cells, element);
};
NS.Renderer.addPopup = function(x, y, text, color, size) {
  addTextPopup(x, y, text, color, size);
};
NS.Renderer.showOverlay = showOverlay;
NS.Renderer.hideOverlay = hideOverlay;
NS.Renderer.updateHUD = updateHUD;

/* ─── Main render loop ─── */
var frameTime = 0;

NS.Renderer.render = function(time, state) {
  // Update shake
  if (shakeIntensity > 0) {
    shakeX = (Math.random() - 0.5) * shakeIntensity * 2;
    shakeY = (Math.random() - 0.5) * shakeIntensity * 2;
    shakeIntensity *= 0.85;
    if (shakeIntensity < 0.1) { shakeIntensity = 0; shakeX = 0; shakeY = 0; }
  }

  ctx.save();
  ctx.translate(shakeX, shakeY);

  drawBackground(time);

  // Draw side panels (next queue, hold)
  if (state !== 'menu' && state !== 'gameover') {
    drawNextQueue(NS.nextQueue || []);
    drawHoldPiece(NS.heldType);
    drawPrismMeter();
  }

  drawBoard();

  if (state === 'playing' || state === 'paused') {
    drawLockedBoard(NS.chainHighlights || null);
    drawRiftShard();
    drawGhost(NS.activePiece);
    drawPiece(NS.activePiece, 1);
    drawPrismSurgeActive();
  } else if (state === 'gameover') {
    drawLockedBoard();
  }

  drawParticles();
  drawTextPopups();
  drawFlash();

  ctx.restore();
  updateHUD();
};

/* ─── Resize handler ─── */
NS.Renderer.resize = resize;

/* Touch control coordinate helpers */
NS.Renderer.getBoardCoords = function(clientX, clientY) {
  var rect = canvas.getBoundingClientRect();
  var x = (clientX - rect.left) * (canvas.width / rect.width);
  var y = (clientY - rect.top) * (canvas.height / rect.height);
  var cellW = NS.CELL_SIZE * scale;
  var cellH = NS.CELL_SIZE * scale;
  var col = Math.floor((x - boardOffsetX) / cellW);
  var row = Math.floor((y - boardOffsetY) / cellH);
  return { col: col, row: row };
};

/* ─── Orientation ─── */
NS.Renderer.getLayout = function() {
  return {
    boardX: boardOffsetX,
    boardY: boardOffsetY,
    boardW: boardPixelW,
    boardH: boardPixelH,
    cellW: NS.CELL_SIZE * scale,
    cellH: NS.CELL_SIZE * scale
  };
};

})(window.CrystalNexus);
