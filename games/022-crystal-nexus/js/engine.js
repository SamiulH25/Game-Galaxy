/**
 * Crystal Nexus — Core Game Engine
 * Board, Piece, Randomizer, SRS, Element Resonance, Prism Surge, Rift Shards
 */
window.CrystalNexus = window.CrystalNexus || {};

(function(NS) {

/* ─── Constants ─── */
NS.COLS = 10;
NS.ROWS = 20;
NS.VISIBLE_ROWS = 20;
NS.HIDDEN_ROWS = 4;
NS.TOTAL_ROWS = 24; // 4 hidden above visible
NS.CELL_SIZE = 30; // base — will be scaled

/* Element definitions */
NS.ELEMENTS = {
  PYRE:    { id: 'pyre',    name: 'Pyre',    color: '#ff4422', glow: '#ff6644', chainDir: 'h' },
  FROST:   { id: 'frost',   name: 'Frost',   color: '#44ddff', glow: '#66eeff', chainDir: 'v' },
  STORM:   { id: 'storm',   name: 'Storm',   color: '#aa44ff', glow: '#cc66ff', chainDir: 'c' },
  TERRA:   { id: 'terra',   name: 'Terra',   color: '#44ff66', glow: '#66ff88', chainDir: 'd' }
};
var E = NS.ELEMENTS;

/* Piece-element mapping: each tetromino type is fixed to an element */
NS.PIECE_ELEMENTS = {
  I: E.STORM, O: E.TERRA, T: E.PYRE,
  S: E.FROST, Z: E.STORM,
  J: E.TERRA, L: E.PYRE
};

/* Tetromino shapes (4x4 bounding box) */
NS.SHAPES = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1],[0,0,0]],
  S: [[0,1,1],[1,1,0],[0,0,0]],
  Z: [[1,1,0],[0,1,1],[0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]],
  L: [[0,0,1],[1,1,1],[0,0,0]]
};

NS.PIECE_TYPES = ['I','O','T','S','Z','J','L'];

/* ─── SRS Wall Kick Data ─── */
var KICK_JLSTZ = [
  /* 0->R */ [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  /* R->2 */ [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  /* 2->L */ [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  /* L->0 */ [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]]
];
var KICK_I = [
  /* 0->R */ [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  /* R->2 */ [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  /* 2->L */ [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  /* L->0 */ [[0,0],[1,0],[-2,0],[1,-2],[-2,1]]
];
// R* is reverse of *->R
// L* is reverse of *->L
var KICK_REV = {
  '0->R': 'R->0', 'R->2': '2->L', '2->L': 'L->2', 'L->0': '0->R',
  'R->0': '0->R', '2->R': 'R->2', 'L->2': '2->L', '0->L': 'L->0'
};

function getKick(type, fromRot, toRot) {
  var key = fromRot + '->' + toRot;
  var table;
  if (type === 'I') table = KICK_I; else table = KICK_JLSTZ;
  var idx = {'0->R':0,'R->2':1,'2->L':2,'L->0':3,'0->L':3,'R->0':0,'2->R':1,'L->2':2}[key];
  if (idx === undefined) return [[0,0]];
  var kicks = table[idx];
  // For counter-clockwise, reverse the offsets
  var isCCW = (key === '0->L' || key === 'R->0' || key === '2->R' || key === 'L->2');
  // Actually we need to look at it differently:
  // If going 0->L that's same as going L->0 reverse
  // Let me just handle the 4 standard CW rotations:
  // 0->R, R->2, 2->L, L->0 are the "forward" kicks
  // The reverse rotations use the reversed table
  if (key === '0->L' || key === 'L->2' || key === '2->R' || key === 'R->0') {
    // Reverse kicks: take from the opposite transition and negate
    var revKey = key.split('->').reverse().join('->');
    var revIdx = {'0->R':0,'R->2':1,'2->L':2,'L->0':3}[revKey];
    if (revIdx === undefined) return [[0,0]];
    var revKicks = table[revIdx];
    return revKicks.map(function(k) { return [-k[0], -k[1]]; });
  }
  return kicks;
}

/* ─── BagRandomizer (7-bag) ─── */
function BagRandomizer() {
  this.bag = [];
  this.history = [];
}
BagRandomizer.prototype.next = function() {
  if (this.bag.length === 0) {
    this.bag = NS.PIECE_TYPES.slice();
    // Shuffle
    for (var i = this.bag.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = this.bag[i]; this.bag[i] = this.bag[j]; this.bag[j] = tmp;
    }
  }
  var type = this.bag.pop();
  this.history.push(type);
  if (this.history.length > 8) this.history.shift();
  return type;
};
BagRandomizer.prototype.peek = function(n) {
  // Peek at next n pieces without consuming
  while (this.bag.length < n) {
    var newPieces = NS.PIECE_TYPES.slice();
    for (var i = newPieces.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = newPieces[i]; newPieces[i] = newPieces[j]; newPieces[j] = tmp;
    }
    this.bag = this.bag.concat(newPieces);
  }
  return this.bag.slice(this.bag.length - n).reverse();
};
BagRandomizer.prototype.reset = function() {
  this.bag = [];
  this.history = [];
};

/* ─── Piece class ─── */
function Piece(type) {
  this.type = type;
  this.element = NS.PIECE_ELEMENTS[type];
  this.rotation = 0; // 0,1,2,3 (0=R, 1=2, 2=L, 3=U in SRS)
  this.shape = NS.SHAPES[type].map(function(r) { return r.slice(); });
  // Spawn position (center horizontally at top)
  this.x = Math.floor((NS.COLS - this.shape[0].length) / 2);
  this.y = 0;
}
Piece.prototype.getCells = function() {
  var cells = [];
  for (var r = 0; r < this.shape.length; r++) {
    for (var c = 0; c < this.shape[r].length; c++) {
      if (this.shape[r][c]) cells.push({ x: this.x + c, y: this.y + r });
    }
  }
  return cells;
};
Piece.prototype.clone = function() {
  var p = new Piece(this.type);
  p.x = this.x; p.y = this.y;
  p.rotation = this.rotation;
  p.shape = this.shape.map(function(r) { return r.slice(); });
  p.element = this.element;
  return p;
};
Piece.prototype.rotateCW = function() {
  // Rotate matrix 90° CW
  var n = this.shape.length;
  var out = [];
  for (var r = 0; r < n; r++) {
    out[r] = [];
    for (var c = 0; c < n; c++) {
      out[r][c] = this.shape[n - 1 - c][r];
    }
  }
  this.shape = out;
  this.rotation = (this.rotation + 1) % 4;
};
Piece.prototype.rotateCCW = function() {
  var n = this.shape.length;
  var out = [];
  for (var r = 0; r < n; r++) {
    out[r] = [];
    for (var c = 0; c < n; c++) {
      out[r][c] = this.shape[c][n - 1 - r];
    }
  }
  this.shape = out;
  this.rotation = (this.rotation + 3) % 4;
};

/* ─── Board ─── */
function Board() {
  this.grid = [];
  for (var r = 0; r < NS.TOTAL_ROWS; r++) {
    this.grid[r] = [];
    for (var c = 0; c < NS.COLS; c++) {
      this.grid[r][c] = null;
    }
  }
}
Board.prototype.get = function(r, c) {
  if (r < 0 || r >= NS.TOTAL_ROWS || c < 0 || c >= NS.COLS) return null;
  return this.grid[r][c];
};
Board.prototype.set = function(r, c, val) {
  if (r >= 0 && r < NS.TOTAL_ROWS && c >= 0 && c < NS.COLS) {
    this.grid[r][c] = val;
  }
};
Board.prototype.isOccupied = function(r, c) {
  if (c < 0 || c >= NS.COLS) return true; // wall
  if (r >= NS.TOTAL_ROWS) return true; // floor
  if (r < 0) return false; // above board is free
  return this.grid[r][c] !== null;
};
Board.prototype.checkCollision = function(piece, dx, dy) {
  var cells = piece.getCells();
  for (var i = 0; i < cells.length; i++) {
    var nx = cells[i].x + (dx || 0);
    var ny = cells[i].y + (dy || 0);
    if (nx < 0 || nx >= NS.COLS) return true;
    if (ny >= NS.TOTAL_ROWS) return true;
    if (ny >= 0 && this.grid[ny][nx] !== null) return true;
  }
  return false;
};
Board.prototype.checkCollisionRot = function(piece, newShape) {
  // Check collision with a given shape (for rotation tests)
  var n = newShape.length;
  for (var r = 0; r < n; r++) {
    for (var c = 0; c < n; c++) {
      if (newShape[r][c]) {
        var nx = piece.x + c;
        var ny = piece.y + r;
        if (nx < 0 || nx >= NS.COLS) return true;
        if (ny >= NS.TOTAL_ROWS) return true;
        if (ny >= 0 && this.grid[ny][nx] !== null) return true;
      }
    }
  }
  return false;
};
Board.prototype.lockPiece = function(piece) {
  var cells = piece.getCells();
  for (var i = 0; i < cells.length; i++) {
    var r = cells[i].y, c = cells[i].x;
    if (r >= 0 && r < NS.TOTAL_ROWS) {
      this.grid[r][c] = {
        type: piece.type,
        element: piece.element,
        locked: true
      };
    }
  }
};
Board.prototype.getGhostY = function(piece) {
  var ghost = piece.clone();
  while (!this.checkCollision(ghost, 0, 1)) {
    ghost.y++;
  }
  return ghost.y;
};
Board.prototype.clearLines = function() {
  var fullRows = [];
  for (var r = 0; r < NS.TOTAL_ROWS; r++) {
    var full = true;
    for (var c = 0; c < NS.COLS; c++) {
      if (this.grid[r][c] === null) { full = false; break; }
    }
    if (full) fullRows.push(r);
  }
  return fullRows;
};
Board.prototype.removeLines = function(rows) {
  // Remove these rows (sorted ascending)
  rows.sort(function(a,b) { return a - b; });
  for (var i = rows.length - 1; i >= 0; i--) {
    this.grid.splice(rows[i], 1);
  }
  // Add empty rows at top
  for (var i = 0; i < rows.length; i++) {
    var emptyRow = [];
    for (var c = 0; c < NS.COLS; c++) emptyRow[c] = null;
    this.grid.unshift(emptyRow);
  }
  return rows.length;
};
Board.prototype.addGarbage = function(lines) {
  // Remove lines from top, add garbage at bottom
  for (var i = 0; i < lines.length; i++) {
    this.grid.splice(0, 1);
    var row = [];
    for (var c = 0; c < NS.COLS; c++) {
      row[c] = lines[i][c] || null;
    }
    this.grid.push(row);
  }
};
Board.prototype.reset = function() {
  for (var r = 0; r < NS.TOTAL_ROWS; r++) {
    for (var c = 0; c < NS.COLS; c++) {
      this.grid[r][c] = null;
    }
  }
};
Board.prototype.isEmpty = function() {
  for (var r = 0; r < NS.TOTAL_ROWS; r++) {
    for (var c = 0; c < NS.COLS; c++) {
      if (this.grid[r][c] !== null) return false;
    }
  }
  return true;
};

/* ─── Element Resonance System ─── */
Board.prototype.getElementChains = function(clearedRows) {
  // Find element chains: for each cleared row, check adjacent cells
  // that have the same element as neighboring non-cleared cells
  var chains = []; // {positions: [{r,c}], element: element}
  var checked = {};
  var rowSet = {};
  for (var i = 0; i < clearedRows.length; i++) rowSet[clearedRows[i]] = true;

  for (var i = 0; i < clearedRows.length; i++) {
    var row = clearedRows[i];
    for (var c = 0; c < NS.COLS; c++) {
      // Check all 4 directions from the cleared cell
      var dirs = [[0,-1],[0,1],[-1,0],[1,0]];
      for (var d = 0; d < dirs.length; d++) {
        var nr = row + dirs[d][0];
        var nc = c + dirs[d][1];
        if (nr < 0 || nr >= NS.TOTAL_ROWS || nc < 0 || nc >= NS.COLS) continue;
        if (rowSet[nr]) continue; // also cleared
        var cell = this.grid[nr][nc];
        if (!cell || !cell.element) continue;
        var key = nr + ',' + nc;
        if (checked[key]) continue;

        // Found a cell adjacent to a cleared row — check its element's chain direction
        var elem = cell.element;
        var chainDir = elem.chainDir;
        var chainCells = [{ r: nr, c: nc }];
        checked[key] = true;

        // Propagate in element-specific pattern
        Board.prototype._propagateChain.call(this, chainCells, checked, elem, chainDir, rowSet);

        if (chainCells.length > 1) {
          chains.push({ positions: chainCells, element: elem });
        }
      }
    }
  }
  return chains;
};

Board.prototype._propagateChain = function(chainCells, checked, element, dir, rowSet) {
  var dirOffsets;
  switch (dir) {
    case 'h': dirOffsets = [[0,-1],[0,1]]; break;      // horizontal
    case 'v': dirOffsets = [[-1,0],[1,0]]; break;       // vertical
    case 'c': dirOffsets = [[0,-1],[0,1],[-1,0],[1,0]]; break; // cross
    case 'd': dirOffsets = [[-1,-1],[-1,1],[1,-1],[1,1]]; break; // diagonal
    default: return;
  }

  // BFS from all current chain cells
  var queue = [];
  for (var i = 0; i < chainCells.length; i++) queue.push(chainCells[i]);

  while (queue.length > 0) {
    var cur = queue.shift();
    for (var d = 0; d < dirOffsets.length; d++) {
      var nr = cur.r + dirOffsets[d][0];
      var nc = cur.c + dirOffsets[d][1];
      if (nr < 0 || nr >= NS.TOTAL_ROWS || nc < 0 || nc >= NS.COLS) continue;
      if (rowSet[nr]) continue;
      var key = nr + ',' + nc;
      if (checked[key]) continue;
      var cell = this.grid[nr][nc];
      if (!cell || cell.element !== element) continue;
      checked[key] = true;
      chainCells.push({ r: nr, c: nc });
      queue.push({ r: nr, c: nc });
    }
  }
};

Board.prototype.removeChainCells = function(chainCells) {
  var removed = 0;
  for (var i = 0; i < chainCells.length; i++) {
    var r = chainCells[i].r, c = chainCells[i].c;
    if (this.grid[r][c] !== null) {
      this.grid[r][c] = null;
      removed++;
    }
  }
  // Now drop blocks above cleared chain cells
  // For each column, shift non-null blocks down
  for (var c = 0; c < NS.COLS; c++) {
    var writeRow = NS.TOTAL_ROWS - 1;
    for (var r = NS.TOTAL_ROWS - 1; r >= 0; r--) {
      if (this.grid[r][c] !== null) {
        this.grid[writeRow][c] = this.grid[r][c];
        if (writeRow !== r) this.grid[r][c] = null;
        writeRow--;
      }
    }
    for (var r = writeRow; r >= 0; r--) this.grid[r][c] = null;
  }
  return removed;
};

/* ─── Rift Shard System ─── */
NS.RIFT_INTERVAL = 60; // lines between rift shards

function RiftShard() {
  this.active = false;
  this.row = -1;
  this.col = -1;
  this.age = 0;
  this.triggerCount = 0;
}
RiftShard.prototype.spawn = function(board, topRow) {
  // Find a random non-empty column near the top of the stack
  var col = Math.floor(Math.random() * NS.COLS);
  var row = topRow + 1;
  // Find the top of this column
  for (var r = 0; r < NS.TOTAL_ROWS; r++) {
    if (board.grid[r][col] !== null) {
      row = r;
      break;
    }
  }
  if (row <= 0) row = 0;
  this.row = row;
  this.col = col;
  this.active = true;
  this.age = 0;
};
RiftShard.prototype.cover = function(board) {
  // Check if shard has been covered by a piece
  if (!this.active) return null;
  if (board.grid[this.row][this.col] !== null) {
    // Covered! Trigger effect
    var effect = Math.floor(Math.random() * 3);
    this.active = false;
    this.triggerCount++;
    return effect; // 0=Shatter, 1=Echo, 2=Pulse
  }
  this.age++;
  // If shard ages too much, it sinks
  if (this.age > 300) { // ~5 seconds
    this.row++;
    this.age = 0;
    if (this.row >= NS.TOTAL_ROWS) {
      this.active = false;
      return -1; // expired
    }
  }
  return null; // still waiting
};
RiftShard.prototype.triggerEffect = function(board, effect) {
  var r = this.row, c = this.col;
  var cleared = [];
  switch (effect) {
    case 0: // Shatter — clear 5x5 area
      for (var dr = -2; dr <= 2; dr++) {
        for (var dc = -2; dc <= 2; dc++) {
          var nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < NS.TOTAL_ROWS && nc >= 0 && nc < NS.COLS) {
            if (board.grid[nr][nc] !== null) {
              board.grid[nr][nc] = null;
              cleared.push({ r: nr, c: nc });
            }
          }
        }
      }
      break;
    case 1: // Echo — destroy all pieces of matching element
      var elem = null;
      if (board.grid[r][c]) elem = board.grid[r][c].element;
      for (var row = 0; row < NS.TOTAL_ROWS; row++) {
        for (var col = 0; col < NS.COLS; col++) {
          if (board.grid[row][col] && board.grid[row][col].element === elem) {
            board.grid[row][col] = null;
            cleared.push({ r: row, c: col });
          }
        }
      }
      break;
    case 2: // Pulse — clear intersecting row + column
      for (var dc = 0; dc < NS.COLS; dc++) {
        if (board.grid[r][dc] !== null) {
          board.grid[r][dc] = null;
          cleared.push({ r: r, c: dc });
        }
      }
      for (var dr = 0; dr < NS.TOTAL_ROWS; dr++) {
        if (board.grid[dr][c] !== null) {
          board.grid[dr][c] = null;
          cleared.push({ r: dr, c: c });
        }
      }
      break;
  }
  // Apply gravity for cleared cells
  for (var col = 0; col < NS.COLS; col++) {
    var writeRow = NS.TOTAL_ROWS - 1;
    for (var row = NS.TOTAL_ROWS - 1; row >= 0; row--) {
      if (board.grid[row][col] !== null) {
        board.grid[writeRow][col] = board.grid[row][col];
        if (writeRow !== row) board.grid[row][col] = null;
        writeRow--;
      }
    }
    for (var row = writeRow; row >= 0; row--) board.grid[row][col] = null;
  }
  return cleared.length;
};

/* ─── Prism Surge System ─── */
function PrismSurge() {
  this.meter = 0;
  this.maxMeter = 100;
  this.active = false;
  this.timer = 0;
  this.duration = 600; // 10 seconds at 60fps
  this.multiplier = 3;
}
PrismSurge.prototype.addCharge = function(amount) {
  if (this.active) return;
  this.meter = Math.min(this.maxMeter, this.meter + amount);
};
PrismSurge.prototype.activate = function() {
  if (this.meter < this.maxMeter || this.active) return false;
  this.active = true;
  this.timer = this.duration;
  return true;
};
PrismSurge.prototype.deactivate = function() {
  this.active = false;
  this.meter = 0;
  this.timer = 0;
};
PrismSurge.prototype.getMeterFraction = function() {
  return this.meter / this.maxMeter;
};
PrismSurge.prototype.getTimerFraction = function() {
  if (!this.active) return 0;
  return this.timer / this.duration;
};
PrismSurge.prototype.update = function() {
  if (!this.active) return false;
  this.timer--;
  if (this.timer <= 0) {
    this.deactivate();
    return false;
  }
  return true; // still active
};

/* ─── Score / Level Manager ─── */
function ScoreManager() {
  this.score = 0;
  this.lines = 0;
  this.level = 1;
  this.combo = -1;
  this.backToBack = false;
  this.lastClearWasTetris = false;
  this.highScores = [];
}
ScoreManager.prototype.getDropScore = function(cells, isHard) {
  return isHard ? cells * 2 : 0;
};
ScoreManager.prototype.getLineScore = function(linesCleared, isTSpin, isPerfect) {
  if (linesCleared === 0) return 0;
  var base = 0;
  if (isTSpin) {
    base = [0, 800, 1200, 1600, 2000][linesCleared] || 2000;
  } else {
    base = [0, 100, 300, 500, 800][linesCleared] || 800;
  }
  var multi = this.level;
  // Back-to-back bonus
  var b2b = false;
  if (linesCleared === 4 || isTSpin) {
    if (this.backToBack) { base = Math.floor(base * 1.5); b2b = true; }
    this.backToBack = true;
    this.lastClearWasTetris = (linesCleared === 4);
  } else {
    this.backToBack = false;
    this.lastClearWasTetris = false;
  }
  // Perfect clear
  if (isPerfect) base = Math.floor(base * 2);
  // Combo
  var comboScore = 0;
  if (linesCleared > 0) {
    this.combo++;
    if (this.combo > 0) comboScore = 50 * this.combo * this.level;
  } else {
    this.combo = -1;
  }
  var total = base * multi + comboScore;
  this.score += total;
  this.lines += linesCleared;
  // Level up every 10 lines
  var newLevel = Math.floor(this.lines / 10) + 1;
  var levelUp = newLevel > this.level;
  this.level = newLevel;
  return { total: total, b2b: b2b, combo: this.combo, levelUp: levelUp };
};
ScoreManager.prototype.addElementChainScore = function(chainLength) {
  var bonus = chainLength * 50 * this.level;
  this.score += bonus;
  return bonus;
};
ScoreManager.prototype.addRiftScore = function(cellsCleared) {
  var bonus = cellsCleared * 25 * this.level;
  this.score += bonus;
  return bonus;
};
ScoreManager.prototype.addPrismScore = function(baseScore) {
  var bonus = baseScore * (NS.prismSurge.multiplier - 1);
  this.score += bonus;
  return bonus;
};
ScoreManager.prototype.getSpeed = function() {
  // Gravity speed in frames per cell (at 60fps)
  // Level 1 = 1s/drop, ramping up through 20 levels
  var speeds = [
    60, 55, 50, 45, 40, 36, 32, 28, 24, 20,
    17, 14, 11, 9, 7, 5, 4, 3, 2, 1
  ];
  var idx = Math.min(this.level - 1, speeds.length - 1);
  return speeds[idx];
};

/* ─── Game State Machine ─── */
NS.GameStates = {
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'gameover'
};

function GameState() {
  this.state = NS.GameStates.MENU;
}
GameState.prototype.set = function(s) { this.state = s; };
GameState.prototype.is = function(s) { return this.state === s; };

/* ─── Expose kick function ─── */
var getKick = getKick;
NS.getKick = getKick;

/* ─── Expose Constructors ─── */
NS.BagRandomizer = BagRandomizer;
NS.Piece = Piece;
NS.Board = Board;
NS.RiftShard = RiftShard;
NS.PrismSurge = PrismSurge;
NS.ScoreManager = ScoreManager;
NS.GameState = GameState;

})(window.CrystalNexus);
