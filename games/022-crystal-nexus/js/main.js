/**
 * Crystal Nexus — Main Game Loop & Input
 * Orchestrates engine, renderer, audio, bridge, and game state
 */
window.CrystalNexus = window.CrystalNexus || {};

(function(NS) {

/* ─── Game objects (local references, synced to NS for renderer) ─── */
var board, randomizer, activePiece, heldType, nextQueue;
var score, state, riftShard, prismSurge;
var chainHighlights = [];
var canHold = true;
var lockDelayTimer = 0;
var lockDelayMax = 30;
var lockResets = 0;
var lockResetMax = 15;
var areTimer = 0;
var areDelay = 10;
var gravityCounter = 0;
var totalLinesCleared = 0;
var riftLineCounter = 0;
var gameOverAnimTimer = 0;
var pendingLoadData = null;

var canvas;

/* ─── Sync game objects to NS (for renderer access) ─── */
function syncNS() {
  NS.board = board;
  NS.activePiece = activePiece;
  NS.prismSurge = prismSurge;
  NS.riftShard = riftShard;
  NS.nextQueue = nextQueue || [];
  NS.heldType = heldType;
  NS.chainHighlights = chainHighlights;
  NS.score = score;
}

/* Settings */
NS.settings = {
  ghost: true,
  das: 8,
  arr: 1,
  volume: 0.5
};

/* ─── Input system ─── */
var keys = {};
var dasTimer = {};
var arrTimer = {};
var dasActive = {};
var dasActions = ['moveLeft', 'moveRight', 'softDrop'];

function handleKeyDown(e) {
  var key = e.key;
  if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight' ||
      key === ' ' || key === 'z' || key === 'Z' || key === 'c' || key === 'C' || key === 'Shift') {
    e.preventDefault();
  }
  if (keys[key]) return;
  keys[key] = true;

  if (state === NS.GameStates.MENU) {
    if (key === ' ' || key === 'Enter') { startGame(); syncNS(); return; }
  }
  if (state === NS.GameStates.GAME_OVER) {
    if (key === ' ' || key === 'Enter') { showMenu(); syncNS(); return; }
  }
  if (state === NS.GameStates.PAUSED) {
    if (key === 'Escape' || key === 'p' || key === 'P') { resumeGame(); syncNS(); return; }
    return;
  }
  if (state !== NS.GameStates.PLAYING) return;

  switch (key) {
    case 'ArrowLeft':  tryMove(-1, 0); startDAS('moveLeft'); break;
    case 'ArrowRight': tryMove(1, 0);  startDAS('moveRight'); break;
    case 'ArrowDown':  trySoftDrop(); startDAS('softDrop'); break;
    case 'ArrowUp':    tryRotate(1); break;
    case 'z': case 'Z': tryRotate(-1); break;
    case 'x': case 'X': tryRotate(180); break;
    case 'Shift':      tryRotate(180); break;
    case ' ':
      if (prismSurge && prismSurge.meter >= prismSurge.maxMeter && !prismSurge.active) {
        activatePrismSurge();
      } else {
        tryHardDrop();
      }
      break;
    case 'c': case 'C': tryHold(); break;
    case 'Escape': case 'p': case 'P': pauseGame(); break;
  }
  syncNS();
}

function handleKeyUp(e) {
  var key = e.key;
  keys[key] = false;
  if (key === 'ArrowLeft') { resetDAS('moveLeft'); }
  if (key === 'ArrowRight') { resetDAS('moveRight'); }
  if (key === 'ArrowDown') { resetDAS('softDrop'); }
}

function startDAS(action) {
  dasTimer[action] = 0;
  arrTimer[action] = 0;
  dasActive[action] = false;
}

function resetDAS(action) {
  dasTimer[action] = 0;
  arrTimer[action] = 0;
  dasActive[action] = false;
}

function updateDAS() {
  if (state !== NS.GameStates.PLAYING) return;
  if (!activePiece) return;
  var arr = Math.max(0, NS.settings.arr);
  var das = Math.max(0, NS.settings.das);

  dasActions.forEach(function(action) {
    var keyMap = { moveLeft: 'ArrowLeft', moveRight: 'ArrowRight', softDrop: 'ArrowDown' };
    if (!keys[keyMap[action]]) return;
    if (action === 'softDrop' && prismSurge && prismSurge.active) return;

    dasTimer[action] = (dasTimer[action] || 0) + 1;
    if (!dasActive[action]) {
      if (dasTimer[action] >= das) {
        dasActive[action] = true;
        arrTimer[action] = 0;
        if (action === 'moveLeft') tryMove(-1, 0);
        else if (action === 'moveRight') tryMove(1, 0);
        else if (action === 'softDrop') trySoftDrop();
      }
    } else {
      arrTimer[action] = (arrTimer[action] || 0) + 1;
      if (arrTimer[action] >= arr) {
        arrTimer[action] = 0;
        if (action === 'moveLeft') tryMove(-1, 0);
        else if (action === 'moveRight') tryMove(1, 0);
        else if (action === 'softDrop') trySoftDrop();
      }
    }
  });
}

/* ─── Movement / Rotation ─── */
function tryMove(dx, dy) {
  if (!activePiece || areTimer > 0) return false;
  if (prismSurge && prismSurge.active) {
    activePiece.x += dx;
    activePiece.y += dy;
    lockDelayTimer = 0;
    return true;
  }
  if (!board.checkCollision(activePiece, dx, dy)) {
    activePiece.x += dx;
    activePiece.y += dy;
    if (dy === 0) {
      var onGround = board.checkCollision(activePiece, 0, 1);
      if (!onGround && lockResets < lockResetMax) {
        lockDelayTimer = 0;
        lockResets++;
      }
    }
    return true;
  }
  return false;
}

function tryRotate(dir) {
  if (!activePiece || areTimer > 0) return false;
  if (prismSurge && prismSurge.active) {
    if (dir === 1) activePiece.rotateCW();
    else if (dir === -1) activePiece.rotateCCW();
    else { activePiece.rotateCW(); activePiece.rotateCW(); }
    return true;
  }

  var fromRot = activePiece.rotation;
  var testPiece = activePiece.clone();
  if (dir === 1) testPiece.rotateCW();
  else if (dir === -1) testPiece.rotateCCW();
  else { testPiece.rotateCW(); testPiece.rotateCW(); }

  var toRot = testPiece.rotation;
  var kicks = NS.getKick(activePiece.type, fromRot, toRot);

  for (var i = 0; i < kicks.length; i++) {
    var dx = kicks[i][0], dy = kicks[i][1];
    if (!board.checkCollision(testPiece, dx, dy)) {
      activePiece.rotation = testPiece.rotation;
      activePiece.shape = testPiece.shape.map(function(r) { return r.slice(); });
      activePiece.x += dx;
      activePiece.y += dy;
      var onGround = board.checkCollision(activePiece, 0, 1);
      if (!onGround && lockResets < lockResetMax) {
        lockDelayTimer = 0;
        lockResets++;
      }
      NS.Audio.rotate();
      return true;
    }
  }
  return false;
}

function trySoftDrop() {
  if (!activePiece || areTimer > 0) return false;
  if (prismSurge && prismSurge.active) {
    // In surge mode, DOWN locks the piece at current position
    lockPiece();
    return true;
  }
  if (board.checkCollision(activePiece, 0, 1)) return false;
  activePiece.y++;
  score.score += 1;
  lockDelayTimer = 0;
  NS.Audio.softDrop();
  return true;
}

function tryHardDrop() {
  if (!activePiece || areTimer > 0) return;
  if (prismSurge && prismSurge.active) return;
  var cells = 0;
  while (!board.checkCollision(activePiece, 0, 1)) {
    activePiece.y++;
    cells++;
  }
  score.score += cells * 2;
  NS.Audio.hardDrop();
  lockPiece();
}

function tryHold() {
  if (!activePiece || !canHold || areTimer > 0) return;
  if (prismSurge && prismSurge.active) return;
  var currentType = activePiece.type;
  if (heldType) {
    var swapType = heldType;
    heldType = currentType;
    spawnPiece(swapType);
  } else {
    heldType = currentType;
    spawnNext();
  }
  canHold = false;
  NS.Audio.hold();
}

/* ─── Prism Surge ─── */
function activatePrismSurge() {
  if (!prismSurge.activate()) return;
  NS.Audio.prismActivate();
  NS.Renderer.flash('#ff44ff', 0.3);
  syncNS();
}

/* ─── Line clearing + Element chains + Rift ─── */
function processClears() {
  var clearedRows = board.clearLines();
  var totalCleared = clearedRows.length;
  if (totalCleared === 0) {
    score.getLineScore(0, false, false);
    syncNS();
    return 0;
  }

  var isTSpin = false;
  var elementChains = board.getElementChains(clearedRows);
  var chainTotal = 0;
  chainHighlights = elementChains;

  NS.Renderer.flash('#ffffff', 0.15);
  NS.Renderer.shake(totalCleared * 1.5);

  var lineColors = ['#ff44aa', '#44ddff', '#aa44ff', '#44ff66'];
  for (var i = 0; i < clearedRows.length; i++) {
    NS.Renderer.spawnLineClear(clearedRows[i], lineColors[i % 4]);
  }

  // Remove chain cells first (they drop and may create more clears)
  for (var i = 0; i < elementChains.length; i++) {
    board.removeChainCells(elementChains[i].positions);
  }
  // Then remove full rows
  board.removeLines(clearedRows);

  // NOW check for perfect clear (board is empty after removal)
  var isPerfect = board.isEmpty();
  var result = score.getLineScore(totalCleared, isTSpin, isPerfect);

  if (prismSurge && prismSurge.active) {
    var prismBonus = score.addPrismScore(result.total);
    result.total += prismBonus;
  }

  if (elementChains.length > 0) {
    for (var i = 0; i < elementChains.length; i++) {
      var chainLen = elementChains[i].positions.length;
      var chainScore = score.addElementChainScore(chainLen);
      chainTotal += chainScore;
      NS.Renderer.spawnChain(elementChains[i].positions, elementChains[i].element);
    }
    NS.Audio.elementChain(elementChains.length);
    NS.Renderer.flash('#ffaa44', 0.2);
  }

  // Cascade check
  var cascadeCount = 0;
  while (cascadeCount < 5) {
    var cascadeRows = board.clearLines();
    if (cascadeRows.length === 0) break;
    cascadeCount++;
    totalCleared += cascadeRows.length;

    var cascadeChains = board.getElementChains(cascadeRows);
    for (var i = 0; i < cascadeChains.length; i++) {
      board.removeChainCells(cascadeChains[i].positions);
    }
    board.removeLines(cascadeRows);
    isPerfect = isPerfect || board.isEmpty();

    var cascadeResult = score.getLineScore(cascadeRows.length, false, false);
    if (prismSurge && prismSurge.active) {
      score.addPrismScore(cascadeResult.total);
    }
    for (var i = 0; i < cascadeChains.length; i++) {
      var ccLen = cascadeChains[i].positions.length;
      score.addElementChainScore(ccLen);
      NS.Renderer.spawnChain(cascadeChains[i].positions, cascadeChains[i].element);
    }
    NS.Renderer.shake(3);
    NS.Renderer.flash('#ffaa44', 0.1);
  }

  totalLinesCleared += totalCleared;
  riftLineCounter += totalCleared;

  if (riftLineCounter >= NS.RIFT_INTERVAL && riftShard && !riftShard.active) {
    riftShard.spawn(board, 0);
    riftLineCounter = 0;
    NS.Renderer.flash('#ff44ff', 0.4);
  }

  if (prismSurge && !prismSurge.active) {
    var charge = totalCleared * 8 + (elementChains.length > 0 ? 15 : 0) + (cascadeCount * 5);
    if (totalCleared === 4) charge += 20;
    prismSurge.addCharge(charge);
  }

  if (score.combo > 1) NS.Audio.combo(score.combo);
  if (isPerfect) NS.Audio.perfectClear();

  if (result && result.levelUp) {
    NS.Audio.levelUp();
    NS.Renderer.flash('#44ddff', 0.3);
    NS.Renderer.addPopup(canvas.width / 2, canvas.height / 2 - 40, 'LEVEL ' + score.level + '!', '#44ddff', 24);
  }

  if (totalCleared >= 1) NS.Audio.lineClear(totalCleared);

  var layout = NS.Renderer.getLayout();
  var popX = layout.boardX + layout.boardW / 2;
  var popY = layout.boardY + layout.boardH / 2 - 20;
  if (chainTotal > 0) {
    NS.Renderer.addPopup(popX, popY, 'CHAIN x' + elementChains.length + '!', '#ffaa44', 18);
  }
  if (isPerfect) {
    NS.Renderer.addPopup(popX, popY + 24, 'PERFECT!', '#ffdd44', 22);
  }
  if (totalCleared === 4 || cascadeCount > 0) {
    NS.Renderer.addPopup(popX, popY + 24, 'TETRIS!', '#ff44ff', 20);
  }

  setTimeout(function() { chainHighlights = []; syncNS(); }, 300);
  syncNS();
  return totalCleared;
}

/* ─── Piece locking ─── */
function lockPiece() {
  if (!activePiece) return;
  board.lockPiece(activePiece);
  NS.Audio.lock();

  if (riftShard && riftShard.active) {
    var effect = riftShard.cover(board);
    if (effect !== null && effect !== -1) {
      var cellsCleared = riftShard.triggerEffect(board, effect);
      if (cellsCleared > 0 && score) score.addRiftScore(cellsCleared);
      NS.Audio.riftTrigger();
      NS.Renderer.flash('#ff44ff', 0.5);
      NS.Renderer.shake(8);
      var layout = NS.Renderer.getLayout();
      NS.Renderer.addPopup(
        layout.boardX + layout.boardW / 2,
        layout.boardY + layout.boardH / 2,
        ['SHATTER!','ECHO!','PULSE!'][effect],
        '#ff44ff', 20
      );
    }
  }

  processClears();
  activePiece = null;
  canHold = true;
  lockDelayTimer = 0;
  lockResets = 0;
  areTimer = areDelay;
  syncNS();

  if (checkGameOver()) return;
  spawnNext();
  syncNS();
}

function checkGameOver() {
  for (var c = 0; c < NS.COLS; c++) {
    if (board.grid[0] && board.grid[0][c] !== null) { gameOver(); return true; }
    if (board.grid[1] && board.grid[1][c] !== null) { gameOver(); return true; }
  }
  return false;
}

/* ─── Piece spawning ─── */
function spawnPiece(type) {
  activePiece = new NS.Piece(type);
  activePiece.x = Math.floor((NS.COLS - activePiece.shape[0].length) / 2);
  activePiece.y = 0;
  if (board.checkCollision(activePiece, 0, 0)) {
    gameOver();
    return false;
  }
  syncNS();
  return true;
}

function spawnNext() {
  var type = randomizer.next();
  nextQueue = randomizer.peek(5);
  if (!spawnPiece(type)) return false;
  syncNS();
  return true;
}

/* ─── Gravity ─── */
function updateGravity() {
  if (!activePiece || areTimer > 0) return;
  if (prismSurge && prismSurge.active) return;

  gravityCounter++;
  var speed = score.getSpeed();
  if (speed <= 0) speed = 1;

  if (gravityCounter >= speed) {
    gravityCounter = 0;
    if (!board.checkCollision(activePiece, 0, 1)) {
      activePiece.y++;
    } else {
      lockDelayTimer++;
      if (lockDelayTimer >= lockDelayMax) {
        lockPiece();
      }
    }
  }
}

function updateLockDelay() {
  if (!activePiece || areTimer > 0) return;
  if (prismSurge && prismSurge.active) return; // no auto-lock in surge mode
  if (board.checkCollision(activePiece, 0, 1)) {
    lockDelayTimer++;
    if (lockDelayTimer >= lockDelayMax) {
      lockPiece();
    }
  } else {
    lockDelayTimer = 0;
  }
}

function updateARE() {
  if (areTimer > 0) areTimer--;
}

function updatePrismSurge() {
  if (!prismSurge) return;
  var wasActive = prismSurge.active;
  prismSurge.update();
  if (wasActive && !prismSurge.active) {
    NS.Audio.prismDeactivate();
    NS.Renderer.flash('#ffffff', 0.2);
  }
  syncNS();
}

/* ─── Game state ─── */
function startGame() {
  board = new NS.Board();
  randomizer = new NS.BagRandomizer();
  score = new NS.ScoreManager();
  riftShard = new NS.RiftShard();
  prismSurge = new NS.PrismSurge();
  state = NS.GameStates.PLAYING;
  activePiece = null;
  heldType = null;
  canHold = true;
  lockDelayTimer = 0;
  lockResets = 0;
  gravityCounter = 0;
  areTimer = 0;
  totalLinesCleared = 0;
  riftLineCounter = 0;
  gameOverAnimTimer = 0;
  chainHighlights = [];
  nextQueue = [];

  // Apply any pending loaded save data
  if (pendingLoadData && pendingLoadData.highScores) {
    score.highScores = pendingLoadData.highScores;
    pendingLoadData = null;
  }

  NS.Renderer.hideOverlay();
  NS.Audio.startAmbient();
  syncNS();
  spawnNext();
  syncNS();
}

function gameOver() {
  state = NS.GameStates.GAME_OVER;
  gameOverAnimTimer = 0;
  NS.Audio.gameOver();
  NS.Audio.stopAmbient();
  syncNS();

  if (window.gameBridge && score) {
    window.gameBridge.submitScore({
      score: score.score,
      level: score.level,
      lines: score.lines
    }).catch(function() {});
    window.gameBridge.save({
      highScores: score.highScores,
      lastScore: score.score,
      lastLevel: score.level,
      lastLines: score.lines
    }).catch(function() {});

    // Unlock achievements
    if (score.lines >= 1) window.gameBridge.unlockAchievement('first_clear').catch(function() {});
    if (totalLinesCleared >= 100) window.gameBridge.unlockAchievement('centurion').catch(function() {});
    if (riftShard && riftShard.triggerCount >= 10) window.gameBridge.unlockAchievement('rift_master').catch(function() {});
  }

  setTimeout(function() { showGameOver(); }, 800);
}

function showGameOver() {
  var html =
    '<div style="margin: 16px 0;">' +
    '<p style="font-size:36px;font-weight:900;color:#ff4466;font-family:Orbitron,monospace;">GAME OVER</p>' +
    '<div style="display:flex;justify-content:center;gap:32px;margin:16px 0;">' +
    '<div><div style="font-size:10px;color:rgba(136,68,255,0.6);letter-spacing:2px;">SCORE</div>' +
    '<div style="font-size:28px;font-weight:900;color:#fff;">' + (score ? score.score.toLocaleString() : '0') + '</div></div>' +
    '<div><div style="font-size:10px;color:rgba(136,68,255,0.6);letter-spacing:2px;">LEVEL</div>' +
    '<div style="font-size:28px;font-weight:900;color:#fff;">' + (score ? score.level : '0') + '</div></div>' +
    '<div><div style="font-size:10px;color:rgba(136,68,255,0.6);letter-spacing:2px;">LINES</div>' +
    '<div style="font-size:28px;font-weight:900;color:#fff;">' + (score ? score.lines : '0') + '</div></div>' +
    '</div></div>' +
    '<p style="color:rgba(255,255,255,0.4);font-size:12px;">Press <span class="key">Space</span> or <span class="key">Enter</span> to play again</p>' +
    '<br><div class="mechanics-legend">' +
    '<span class="mech-tag mech-pyre">&#x25CF; Pyre</span>' +
    '<span class="mech-tag mech-frost">&#x25CF; Frost</span>' +
    '<span class="mech-tag mech-storm">&#x25CF; Storm</span>' +
    '<span class="mech-tag mech-terra">&#x25CF; Terra</span></div>';
  document.getElementById('overlay-body').innerHTML = html;
  NS.Renderer.showOverlay('');
}

function pauseGame() {
  if (state !== NS.GameStates.PLAYING) return;
  state = NS.GameStates.PAUSED;
  var html =
    '<p style="font-size:24px;font-weight:700;color:#aa88ff;font-family:Orbitron,monospace;">PAUSED</p>' +
    '<p style="margin-top:12px;color:rgba(255,255,255,0.4);font-size:12px;">Press <span class="key">Esc</span> or <span class="key">P</span> to resume</p>';
  document.getElementById('overlay-body').innerHTML = html;
  NS.Renderer.showOverlay('');
}

function resumeGame() {
  state = NS.GameStates.PLAYING;
  NS.Renderer.hideOverlay();
  syncNS();
}

function showMenu() {
  state = NS.GameStates.MENU;
  NS.Audio.stopAmbient();
  var html =
    '<p style="color:rgba(255,255,255,0.7);font-size:14px;margin-bottom:8px;">TETRIS EVOLVED WITH UNIQUE MECHANICS</p>' +
    '<div class="mechanics-legend">' +
    '<span class="mech-tag mech-pyre">&#x25CF; Element Resonance</span>' +
    '<span class="mech-tag mech-frost">&#x25CF; Prism Surge</span>' +
    '<span class="mech-tag mech-storm">&#x25CF; Rift Shards</span></div>' +
    '<div style="margin:16px auto;max-width:360px;text-align:left;font-size:13px;line-height:1.8;">' +
    '<p><span style="color:#ff6644;">&#x25C9;</span> <b style="color:#ff6644;">Pyre</b> — horizontal chain</p>' +
    '<p><span style="color:#44ddff;">&#x25C9;</span> <b style="color:#44ddff;">Frost</b> — vertical chain</p>' +
    '<p><span style="color:#aa66ff;">&#x25C9;</span> <b style="color:#aa66ff;">Storm</b> — cross chain</p>' +
    '<p><span style="color:#44ff66;">&#x25C9;</span> <b style="color:#44ff66;">Terra</b> — diagonal chain</p>' +
    '<p style="margin-top:8px;">&#x2726; <b>Prism Surge</b> — fill meter, press Space</p>' +
    '<p>&#x2726; <b>Rift Shards</b> — cover for massive clears</p></div>' +
    '<div style="margin:12px 0;font-size:12px;color:rgba(255,255,255,0.3);">' +
    '<span class="key">&#x2190;&#x2192;</span> Move &nbsp; <span class="key">&#x2191;</span> Rotate &nbsp; <span class="key">Z</span> CCW &nbsp; ' +
    '<span class="key">&#x2193;</span> Soft &nbsp; <span class="key">Space</span> Drop/Surge &nbsp; <span class="key">C</span> Hold</div>' +
    '<button class="overlay-btn" id="start-btn">START GAME</button>';
  document.getElementById('overlay-body').innerHTML = html;
  NS.Renderer.showOverlay('');

  document.getElementById('start-btn').addEventListener('click', function() {
    startGame();
    syncNS();
  });
}

/* ─── Bridge integration ─── */
function setupBridge() {
  if (!window.gameBridge) return;
  window.__gameSaveData = function() {
    return {
      highScores: score ? score.highScores : [],
      lastScore: score ? score.score : 0,
      lastLevel: score ? score.level : 1,
      lastLines: score ? score.lines : 0
    };
  };
  window.__gameLoadData = function(data) {
    if (data && data.highScores) {
      pendingLoadData = data;
    }
  };
}

/* ─── Touch controls ─── */
function setupTouchControls() {
  var buttons = document.querySelectorAll('.touch-btn');
  buttons.forEach(function(btn) {
    var action = btn.getAttribute('data-action');
    var interval = null;

    function doAction() {
      if (state === NS.GameStates.MENU) {
        if (action === 'hardDrop') { startGame(); syncNS(); }
        return;
      }
      if (state === NS.GameStates.GAME_OVER) {
        if (action === 'hardDrop') { showMenu(); syncNS(); }
        return;
      }
      if (state !== NS.GameStates.PLAYING) return;

      switch (action) {
        case 'moveLeft':  tryMove(-1, 0); break;
        case 'moveRight': tryMove(1, 0); break;
        case 'rotateCW':  tryRotate(1); break;
        case 'softDrop':  trySoftDrop(); break;
        case 'hardDrop':
          if (prismSurge && prismSurge.meter >= prismSurge.maxMeter && !prismSurge.active) {
            activatePrismSurge();
          } else {
            tryHardDrop();
          }
          break;
        case 'hold':      tryHold(); break;
        case 'prismSurge':
          if (prismSurge && prismSurge.meter >= prismSurge.maxMeter && !prismSurge.active) {
            activatePrismSurge();
          }
          break;
      }
      syncNS();
    }

    btn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      doAction();
      interval = setInterval(doAction, 80);
    });
    btn.addEventListener('touchend', function(e) {
      e.preventDefault();
      if (interval) clearInterval(interval);
      interval = null;
    });
    btn.addEventListener('touchcancel', function() {
      if (interval) clearInterval(interval);
      interval = null;
    });
    btn.addEventListener('mousedown', function(e) {
      e.preventDefault();
      doAction();
    });
  });
}

/* ─── Game loop ─── */
var lastTime = 0;
var accumulator = 0;
var fixedDt = 1000 / 60;

function gameLoop(time) {
  var dt = time - lastTime;
  lastTime = time;

  accumulator += dt;
  while (accumulator >= fixedDt) {
    update(fixedDt);
    accumulator -= fixedDt;
  }

  if (canvas) {
    NS.Renderer.render(time / 1000, state);
  }

  requestAnimationFrame(gameLoop);
}

function update(dt) {
  switch (state) {
    case NS.GameStates.PLAYING:
      updateARE();
      updateDAS();
      updatePrismSurge();
      if (areTimer <= 0 && activePiece) {
        updateGravity();
        updateLockDelay();
      }
      break;
    case NS.GameStates.GAME_OVER:
      gameOverAnimTimer++;
      break;
  }
  syncNS();
}

/* ─── Initialization ─── */
NS.init = function() {
  canvas = document.getElementById('game-canvas');
  NS.Renderer.init(canvas);

  NS.Audio.init();
  state = NS.GameStates.MENU;

  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  setupTouchControls();
  setupBridge();

  if (window.gameBridge) {
    window.gameBridge.load().then(function(data) {
      if (data) pendingLoadData = data;
    }).catch(function() {});
  }

  showMenu();
  syncNS();

  lastTime = performance.now();
  requestAnimationFrame(gameLoop);

  window.addEventListener('resize', function() {
    NS.Renderer.resize();
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', NS.init);
} else {
  NS.init();
}

})(window.CrystalNexus);
