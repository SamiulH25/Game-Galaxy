/**
 * Pure match-3 logic — grid, swaps, cascades, obstacles, objectives.
 */
window.PatisserieLedger = window.PatisserieLedger || {};

(function(NS) {
  var C = NS.Config;
  var TILE_COUNT = C.TILE_COUNT;

  function cloneCell(cell) {
    if (!cell) return null;
    var o = {
      tile: cell.tile,
      special: cell.special,
      locked: !!cell.locked,
      wrapped: !!cell.wrapped,
      drop: !!cell.drop,
      jar: cell.jar ? { hp: cell.jar.hp } : null,
      overlay: cell.overlay ? { type: cell.overlay.type, hp: cell.overlay.hp } : null
    };
    return o;
  }

  function emptyCell() {
    return {
      tile: null,
      special: null,
      locked: false,
      wrapped: false,
      drop: false,
      jar: null,
      overlay: null
    };
  }

  function MatchEngine(levelDef) {
    this.level = levelDef;
    this.rows = levelDef.rows || C.GRID_ROWS;
    this.cols = levelDef.cols || C.GRID_COLS;
    this.grid = [];
    this.movesLeft = levelDef.moves || 0;
    this.timeLeft = levelDef.time || 0;
    this.useTimer = levelDef.time > 0;
    this.score = 0;
    this.combo = 0;
    this.state = 'idle';
    this.jamCounter = 0;
    this.objectives = [];
    this.objectiveProgress = [];
    this.selected = null;
    this.pendingBoosters = [];
    this.events = [];
    this.initGrid();
    this.initObjectives();
  }

  MatchEngine.prototype.initObjectives = function() {
    var self = this;
    this.objectives = (this.level.objectives || []).map(function(obj) {
      return Object.assign({}, obj);
    });
    this.objectiveProgress = this.objectives.map(function(obj) {
      if (obj.type === 'score') return 0;
      if (obj.type === 'collect') return 0;
      if (obj.type === 'clear_overlay') return self.countOverlays(obj.overlay || 'flour');
      if (obj.type === 'drop') return 0;
      if (obj.type === 'fill') return 0;
      if (obj.type === 'order') return 0;
      return 0;
    });
  };

  MatchEngine.prototype.countOverlays = function(type) {
    var n = 0;
    for (var r = 0; r < this.rows; r++) {
      for (var c = 0; c < this.cols; c++) {
        var cell = this.grid[r][c];
        if (cell.overlay && (!type || cell.overlay.type === type)) n++;
      }
    }
    return n;
  };

  MatchEngine.prototype.initGrid = function() {
    this.grid = [];
    for (var r = 0; r < this.rows; r++) {
      var row = [];
      for (var c = 0; c < this.cols; c++) {
        row.push(emptyCell());
      }
      this.grid.push(row);
    }
    var obstacles = this.level.obstacles || [];
    for (var i = 0; i < obstacles.length; i++) {
      var ob = obstacles[i];
      var cell = this.grid[ob.r][ob.c];
      if (!cell) continue;
      if (ob.type === 'jar') {
        if (cell.jar) continue;
        cell.jar = { hp: ob.hp || 2 };
        cell.tile = null;
        cell.overlay = null;
        cell.locked = false;
        cell.wrapped = false;
      } else if (ob.type === 'flour' || ob.type === 'glaze') {
        if (cell.jar || cell.locked || cell.wrapped) continue;
        cell.overlay = { type: ob.type, hp: ob.hp || (ob.type === 'glaze' ? 2 : 1) };
      } else if (ob.type === 'wrap') {
        if (cell.jar || cell.locked) continue;
        cell.wrapped = true;
      } else if (ob.type === 'chain') {
        if (cell.jar) continue;
        cell.locked = true;
        cell.wrapped = false;
      } else if (ob.type === 'drop') {
        cell.drop = true;
      } else if (ob.type === 'jam') {
        if (cell.jar || cell.locked || cell.wrapped) continue;
        cell.overlay = { type: 'jam', hp: 1 };
      }
    }
    for (var r2 = 0; r2 < this.rows; r2++) {
      for (var c2 = 0; c2 < this.cols; c2++) {
        var cell2 = this.grid[r2][c2];
        if (!cell2.jar && cell2.tile === null) {
          cell2.tile = this.randomTile(r2, c2);
        }
      }
    }
    while (this.findMatches().length > 0) {
      this.resolveMatchesWithoutSpecials();
    }
    if (this.level.drops) {
      for (var d = 0; d < this.level.drops.length; d++) {
        var dr = this.level.drops[d];
        this.grid[dr.r][dr.c].drop = true;
        if (this.grid[dr.r][dr.c].tile === null && !this.grid[dr.r][dr.c].jar) {
          this.grid[dr.r][dr.c].tile = this.randomTile(dr.r, dr.c);
        }
      }
    }
  };

  MatchEngine.prototype.randomTile = function(r, c) {
    var tile;
    do {
      tile = Math.floor(Math.random() * TILE_COUNT);
    } while (this.wouldCreateMatch(r, c, tile));
    return tile;
  };

  MatchEngine.prototype.wouldCreateMatch = function(r, c, tile) {
    var g = this.grid;
    var count = 1;
    var cc = c - 1;
    while (cc >= 0 && g[r][cc].tile === tile && !g[r][cc].jar) { count++; cc--; }
    cc = c + 1;
    while (cc < this.cols && g[r][cc].tile === tile && !g[r][cc].jar) { count++; cc++; }
    if (count >= 3) return true;
    count = 1;
    var rr = r - 1;
    while (rr >= 0 && g[rr][c].tile === tile && !g[rr][c].jar) { count++; rr--; }
    rr = r + 1;
    while (rr < this.rows && g[rr][c].tile === tile && !g[rr][c].jar) { count++; rr++; }
    return count >= 3;
  };

  MatchEngine.prototype.cellPlayable = function(r, c) {
    var cell = this.grid[r][c];
    if (!cell || cell.jar) return false;
    if (cell.tile === null) return false;
    if (cell.locked || cell.wrapped) return false;
    return true;
  };

  MatchEngine.prototype.areAdjacent = function(r1, c1, r2, c2) {
    return (Math.abs(r1 - r2) + Math.abs(c1 - c2)) === 1;
  };

  MatchEngine.prototype.trySwap = function(r1, c1, r2, c2) {
    if (this.state !== 'idle') return false;
    if (!this.cellPlayable(r1, c1) || !this.cellPlayable(r2, c2)) return false;
    if (!this.areAdjacent(r1, c1, r2, c2)) return false;

    this.swapCells(r1, c1, r2, c2);
    var matches = this.findMatches();
    if (matches.length === 0) {
      this.swapCells(r1, c1, r2, c2);
      return false;
    }

    if (!this.useTimer) this.movesLeft--;
    this.state = 'resolving';
    this.combo = 0;
    this._phase = 'clear';
    this._pendingMatches = matches;
    this.events.push({ type: 'swap', from: { r: r1, c: c1 }, to: { r: r2, c: c2 } });
    return true;
  };

  /** One animation step: clear, fall+spawn, or finish cascade chain. */
  MatchEngine.prototype.nextStep = function() {
    if (this.state !== 'resolving') return { done: true };

    if (this._phase === 'clear' && this._pendingMatches && this._pendingMatches.length > 0) {
      var matches = this._pendingMatches;
      this._pendingMatches = null;
      this.combo++;
      var specialsToCreate = this.detectSpecialCreations(matches);
      for (var i = 0; i < specialsToCreate.length; i++) {
        var sp = specialsToCreate[i];
        var cell = this.grid[sp.r][sp.c];
        if (!cell.jar && cell.tile !== null) cell.special = sp.special;
      }
      var cleared = this.clearCells(matches);
      this.score += cleared.score;
      this.damageAdjacentObstacles(matches);
      this.updateObjectivesFromClear(cleared);
      this.events.push({
        type: 'clear',
        cells: cleared.cells,
        score: cleared.score,
        combo: this.combo
      });
      this._phase = 'fall';
      return { phase: 'clear', cells: cleared.cells, combo: this.combo, score: cleared.score };
    }

    if (this._phase === 'fall') {
      var moves = this.applyGravityTracked();
      var spawns = this.refillTracked();
      this._phase = 'check';
      return { phase: 'fall', moves: moves, spawns: spawns };
    }

    if (this._phase === 'check') {
      var next = this.findMatches();
      if (next.length > 0) {
        this._pendingMatches = next;
        this._phase = 'clear';
        return { phase: 'pause' };
      }
      this.tickJam();
      this.state = 'idle';
      this._phase = null;
      this.checkEnd();
      return { done: true };
    }

    return { done: true };
  };

  MatchEngine.prototype.startResolution = function(matches) {
    this.state = 'resolving';
    this.combo = 0;
    this._phase = 'clear';
    this._pendingMatches = matches;
  };

  MatchEngine.prototype.applyGravityTracked = function() {
    var moves = [];
    for (var c = 0; c < this.cols; c++) {
      var write = this.rows - 1;
      for (var r = this.rows - 1; r >= 0; r--) {
        var cell = this.grid[r][c];
        if (cell.jar) {
          write = r - 1;
          continue;
        }
        if (cell.tile !== null || cell.drop) {
          if (write !== r) {
            var target = this.grid[write][c];
            moves.push({
              fromR: r, fromC: c, toR: write, toC: c,
              tile: cell.tile,
              special: cell.special,
              locked: cell.locked,
              wrapped: cell.wrapped,
              drop: cell.drop,
              overlay: cell.overlay ? { type: cell.overlay.type, hp: cell.overlay.hp } : null
            });
            target.tile = cell.tile;
            target.special = cell.special;
            target.locked = cell.locked;
            target.wrapped = cell.wrapped;
            target.drop = cell.drop;
            target.overlay = cell.overlay ? { type: cell.overlay.type, hp: cell.overlay.hp } : null;
            cell.tile = null;
            cell.special = null;
            cell.locked = false;
            cell.wrapped = false;
            cell.drop = false;
            cell.overlay = null;
            if (write === this.rows - 1 && target.drop) {
              var di = this.findObjectiveIndex('drop');
              if (di >= 0) this.objectiveProgress[di]++;
            }
          }
          write--;
        }
      }
    }
    return moves;
  };

  MatchEngine.prototype.refillTracked = function() {
    var spawns = [];
    for (var c = 0; c < this.cols; c++) {
      for (var r = 0; r < this.rows; r++) {
        var cell = this.grid[r][c];
        if (cell.jar) continue;
        if (cell.tile === null) {
          var tile = this.randomTile(r, c);
          cell.tile = tile;
          cell.special = null;
          spawns.push({ r: r, c: c, tile: tile });
        }
      }
    }
    return spawns;
  };

  MatchEngine.prototype.swapCells = function(r1, c1, r2, c2) {
    var a = this.grid[r1][c1];
    var b = this.grid[r2][c2];
    var tmpTile = a.tile; a.tile = b.tile; b.tile = tmpTile;
    var tmpSpec = a.special; a.special = b.special; b.special = tmpSpec;
    var tmpDrop = a.drop; a.drop = b.drop; b.drop = tmpDrop;
  };

  MatchEngine.prototype.findMatches = function() {
    var matches = [];
    var g = this.grid;
    var marked = [];
    for (var r = 0; r < this.rows; r++) {
      marked[r] = [];
      for (var c = 0; c < this.cols; c++) marked[r][c] = false;
    }

    function addRun(cells) {
      if (cells.length < 3) return;
      for (var i = 0; i < cells.length; i++) {
        if (!marked[cells[i].r][cells[i].c]) {
          marked[cells[i].r][cells[i].c] = true;
          matches.push(cells[i]);
        }
      }
    }

    for (var r2 = 0; r2 < this.rows; r2++) {
      var run = [];
      for (var c2 = 0; c2 < this.cols; c2++) {
        var cell = g[r2][c2];
        if (cell.jar || cell.tile === null) {
          addRun(run);
          run = [];
          continue;
        }
        if (run.length === 0 || g[run[0].r][run[0].c].tile === cell.tile) {
          run.push({ r: r2, c: c2, tile: cell.tile });
        } else {
          addRun(run);
          run = [{ r: r2, c: c2, tile: cell.tile }];
        }
      }
      addRun(run);
    }

    for (var c3 = 0; c3 < this.cols; c3++) {
      run = [];
      for (var r3 = 0; r3 < this.rows; r3++) {
        var cell2 = g[r3][c3];
        if (cell2.jar || cell2.tile === null) {
          addRun(run);
          run = [];
          continue;
        }
        if (run.length === 0 || g[run[0].r][run[0].c].tile === cell2.tile) {
          run.push({ r: r3, c: c3, tile: cell2.tile });
        } else {
          addRun(run);
          run = [{ r: r3, c: c3, tile: cell2.tile }];
        }
      }
      addRun(run);
    }
    return matches;
  };

  MatchEngine.prototype.resolveMatchesWithoutSpecials = function() {
    var matches = this.findMatches();
    for (var i = 0; i < matches.length; i++) {
      var m = matches[i];
      var cell = this.grid[m.r][m.c];
      cell.tile = this.randomTile(m.r, m.c);
      cell.special = null;
    }
  };

  MatchEngine.prototype.processTurn = function(initialMatches) {
    this.combo = 0;
    this.resolveCascade(initialMatches);
  };

  MatchEngine.prototype.resolveCascade = function(matches) {
    var self = this;
    this.combo++;
    var toClear = matches.slice();
    var specialsToCreate = this.detectSpecialCreations(matches);

    for (var i = 0; i < specialsToCreate.length; i++) {
      var sp = specialsToCreate[i];
      var cell = this.grid[sp.r][sp.c];
      if (!cell.jar && cell.tile !== null) {
        cell.special = sp.special;
      }
    }

    var cleared = this.clearCells(toClear);
    this.score += cleared.score;
    this.damageAdjacentObstacles(toClear);
    this.updateObjectivesFromClear(cleared);

    this.events.push({
      type: 'clear',
      cells: cleared.cells,
      score: cleared.score,
      combo: this.combo,
      ingredients: cleared.ingredients
    });

    this.applyGravity();
    this.refill();

    var next = this.findMatches();
    if (next.length > 0) {
      this.resolveCascade(next);
      return;
    }

    this.tickJam();
    this.state = 'idle';
    this.checkEnd();
  };

  MatchEngine.prototype.detectSpecialCreations = function(matches) {
    var groups = this.groupMatchClusters(matches);
    var result = [];
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      if (g.cells.length >= 5) {
        result.push({ r: g.center.r, c: g.center.c, special: 'color' });
      } else if (g.cells.length === 4) {
        result.push({
          r: g.center.r,
          c: g.center.c,
          special: g.horizontal ? 'row' : 'col'
        });
      } else if (g.cells.length >= 5 || (g.Lshape && g.cells.length >= 5)) {
        result.push({ r: g.center.r, c: g.center.c, special: 'bomb' });
      } else if (g.cells.length >= 5) {
        result.push({ r: g.center.r, c: g.center.c, special: 'bomb' });
      }
    }
    for (var j = 0; j < groups.length; j++) {
      var grp = groups[j];
      if (grp.cells.length >= 5 && grp.Lshape) {
        result.push({ r: grp.center.r, c: grp.center.c, special: 'bomb' });
      }
    }
    return result;
  };

  MatchEngine.prototype.groupMatchClusters = function(matches) {
    var map = {};
    for (var i = 0; i < matches.length; i++) {
      map[matches[i].r + ',' + matches[i].c] = matches[i];
    }
    var visited = {};
    var groups = [];

    function dfs(r, c, cluster) {
      var key = r + ',' + c;
      if (visited[key] || !map[key]) return;
      visited[key] = true;
      cluster.push(map[key]);
      dfs(r - 1, c, cluster);
      dfs(r + 1, c, cluster);
      dfs(r, c - 1, cluster);
      dfs(r, c + 1, cluster);
    }

    for (var k in map) {
      if (visited[k]) continue;
      var parts = k.split(',');
      var cluster = [];
      dfs(parseInt(parts[0], 10), parseInt(parts[1], 10), cluster);
      if (cluster.length < 3) continue;

      var minR = 999, maxR = -1, minC = 999, maxC = -1;
      var tile = cluster[0].tile;
      var horizontal = true;
      var vertical = true;
      for (var j = 0; j < cluster.length; j++) {
        minR = Math.min(minR, cluster[j].r);
        maxR = Math.max(maxR, cluster[j].r);
        minC = Math.min(minC, cluster[j].c);
        maxC = Math.max(maxC, cluster[j].c);
      }
      if (minR !== maxR) horizontal = false;
      if (minC !== maxC) vertical = false;

      groups.push({
        cells: cluster,
        center: cluster[Math.floor(cluster.length / 2)],
        horizontal: horizontal || (!vertical && cluster.length === 4),
        Lshape: !horizontal && !vertical && cluster.length >= 5
      });
    }
    return groups;
  };

  MatchEngine.prototype.clearCells = function(matches) {
    var cleared = { cells: [], score: 0, tiles: {}, ingredients: [] };
    var seen = {};
    for (var i = 0; i < matches.length; i++) {
      var m = matches[i];
      var key = m.r + ',' + m.c;
      if (seen[key]) continue;
      seen[key] = true;
      var cell = this.grid[m.r][m.c];
      if (cell.jar) continue;

      if (cell.special) {
        this.activateSpecial(m.r, m.c, cleared, seen);
        continue;
      }

      if (cell.tile !== null) {
        cleared.tiles[cell.tile] = (cleared.tiles[cell.tile] || 0) + 1;
        cleared.score += C.SCORE_PER_TILE + this.combo * C.SCORE_COMBO_BONUS;
        cleared.cells.push({ r: m.r, c: m.c, tile: cell.tile });
        if (cell.overlay) {
          cell.overlay.hp--;
          if (cell.overlay.hp <= 0) cell.overlay = null;
        }
        cell.tile = null;
        cell.special = null;
        cell.locked = false;
        cell.wrapped = false;
        if (cell.drop) {
          cleared.drops = (cleared.drops || 0) + 1;
          cell.drop = false;
        }
      }
    }
    return cleared;
  };

  MatchEngine.prototype.activateSpecial = function(r, c, cleared, seen) {
    var cell = this.grid[r][c];
    if (!cell || !cell.special) return;
    var spec = cell.special;
    cell.special = null;
    if (cell.tile !== null) {
      cleared.tiles[cell.tile] = (cleared.tiles[cell.tile] || 0) + 1;
      cleared.score += C.SCORE_PER_TILE * 2;
      cleared.cells.push({ r: r, c: c, tile: cell.tile, special: spec });
    }
    cell.tile = null;
    cell.locked = false;
    cell.wrapped = false;

    var rr, cc;
    if (spec === 'row') {
      for (cc = 0; cc < this.cols; cc++) {
        if (cc === c) continue;
        var k = r + ',' + cc;
        if (seen[k]) continue;
        seen[k] = true;
        this.clearSingle(r, cc, cleared);
      }
    } else if (spec === 'col') {
      for (rr = 0; rr < this.rows; rr++) {
        if (rr === r) continue;
        k = rr + ',' + c;
        if (seen[k]) continue;
        seen[k] = true;
        this.clearSingle(rr, c, cleared);
      }
    } else if (spec === 'bomb') {
      for (rr = r - 1; rr <= r + 1; rr++) {
        for (cc = c - 1; cc <= c + 1; cc++) {
          if (rr < 0 || rr >= this.rows || cc < 0 || cc >= this.cols) continue;
          k = rr + ',' + cc;
          if (seen[k]) continue;
          seen[k] = true;
          this.clearSingle(rr, cc, cleared);
        }
      }
    } else if (spec === 'color') {
      var target = cell.tile;
      if (target === null) target = Math.floor(Math.random() * TILE_COUNT);
      for (rr = 0; rr < this.rows; rr++) {
        for (cc = 0; cc < this.cols; cc++) {
          var cl = this.grid[rr][cc];
          if (cl.jar || cl.tile !== target) continue;
          k = rr + ',' + cc;
          if (seen[k]) continue;
          seen[k] = true;
          this.clearSingle(rr, cc, cleared);
        }
      }
    }
  };

  MatchEngine.prototype.clearSingle = function(r, c, cleared) {
    var cell = this.grid[r][c];
    if (!cell || cell.jar) return;
    if (cell.special) {
      var seen = {};
      this.activateSpecial(r, c, cleared, seen);
      return;
    }
    if (cell.tile === null) return;
    cleared.tiles[cell.tile] = (cleared.tiles[cell.tile] || 0) + 1;
    cleared.score += C.SCORE_PER_TILE;
    cleared.cells.push({ r: r, c: c, tile: cell.tile });
    if (cell.overlay) {
      cell.overlay.hp--;
      if (cell.overlay.hp <= 0) cell.overlay = null;
    }
    cell.tile = null;
    cell.locked = false;
    cell.wrapped = false;
    if (cell.drop) {
      cleared.drops = (cleared.drops || 0) + 1;
      cell.drop = false;
    }
  };

  MatchEngine.prototype.damageAdjacentObstacles = function(matches) {
    var adj = {};
    for (var i = 0; i < matches.length; i++) {
      var dirs = [[0,1],[0,-1],[1,0],[-1,0]];
      for (var d = 0; d < dirs.length; d++) {
        var nr = matches[i].r + dirs[d][0];
        var nc = matches[i].c + dirs[d][1];
        if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) continue;
        adj[nr + ',' + nc] = { r: nr, c: nc };
      }
    }
    for (var k in adj) {
      var p = adj[k];
      var cell = this.grid[p.r][p.c];
      if (cell.jar) {
        cell.jar.hp--;
        if (cell.jar.hp <= 0) {
          cell.jar = null;
          cell.tile = this.randomTile(p.r, p.c);
          this.events.push({ type: 'jar_break', r: p.r, c: p.c });
        }
      }
      if (cell.overlay && (cell.overlay.type === 'flour' || cell.overlay.type === 'glaze' || cell.overlay.type === 'jam')) {
        cell.overlay.hp--;
        if (cell.overlay.hp <= 0) cell.overlay = null;
      }
    }
  };

  MatchEngine.prototype.applyGravity = function() {
    for (var c = 0; c < this.cols; c++) {
      var write = this.rows - 1;
      for (var r = this.rows - 1; r >= 0; r--) {
        var cell = this.grid[r][c];
        if (cell.jar) {
          write = r - 1;
          continue;
        }
        if (cell.tile !== null || cell.drop) {
          if (write !== r) {
            var target = this.grid[write][c];
            target.tile = cell.tile;
            target.special = cell.special;
            target.locked = cell.locked;
            target.wrapped = cell.wrapped;
            target.drop = cell.drop;
            target.overlay = cell.overlay ? { type: cell.overlay.type, hp: cell.overlay.hp } : null;
            cell.tile = null;
            cell.special = null;
            cell.locked = false;
            cell.wrapped = false;
            cell.drop = false;
            cell.overlay = null;
            if (write === this.rows - 1 && cell.drop) {
              this.objectiveProgress[this.findObjectiveIndex('drop')] =
                (this.objectiveProgress[this.findObjectiveIndex('drop')] || 0) + 1;
            }
          }
          write--;
        }
      }
    }
  };

  MatchEngine.prototype.findObjectiveIndex = function(type) {
    for (var i = 0; i < this.objectives.length; i++) {
      if (this.objectives[i].type === type) return i;
    }
    return -1;
  };

  MatchEngine.prototype.refill = function() {
    for (var c = 0; c < this.cols; c++) {
      for (var r = 0; r < this.rows; r++) {
        var cell = this.grid[r][c];
        if (cell.jar) continue;
        if (cell.tile === null) {
          cell.tile = this.randomTile(r, c);
          cell.special = null;
        }
      }
    }
  };

  MatchEngine.prototype.updateObjectivesFromClear = function(cleared) {
    for (var i = 0; i < this.objectives.length; i++) {
      var obj = this.objectives[i];
      if (obj.type === 'score') {
        this.objectiveProgress[i] = this.score;
      } else if (obj.type === 'collect' && cleared.tiles[obj.tile] !== undefined) {
        this.objectiveProgress[i] += cleared.tiles[obj.tile] || 0;
      } else if (obj.type === 'clear_overlay') {
        this.objectiveProgress[i] = this.countOverlays(obj.overlay);
      } else if (obj.type === 'drop' && cleared.drops) {
        this.objectiveProgress[i] += cleared.drops;
      } else if (obj.type === 'fill') {
        var add = (cleared.cells.length || 0) * (obj.rate || 8);
        this.objectiveProgress[i] = Math.min(obj.target, (this.objectiveProgress[i] || 0) + add);
      } else if (obj.type === 'order' && cleared.tiles) {
        var done = true;
        var keys = Object.keys(obj.counts);
        for (var k = 0; k < keys.length; k++) {
          var tileKey = keys[k];
          var tileIdx = C.TILE_KEYS.indexOf(tileKey);
          if (tileIdx >= 0) {
            obj._progress = obj._progress || {};
            obj._progress[tileKey] = (obj._progress[tileKey] || 0) + (cleared.tiles[tileIdx] || 0);
          }
        }
      }
    }
  };

  MatchEngine.prototype.tickJam = function() {
    this.jamCounter++;
    if (this.jamCounter < C.JAM_SPREAD_INTERVAL) return;
    this.jamCounter = 0;
    var jams = [];
    for (var r = 0; r < this.rows; r++) {
      for (var c = 0; c < this.cols; c++) {
        if (this.grid[r][c].overlay && this.grid[r][c].overlay.type === 'jam') {
          jams.push({ r: r, c: c });
        }
      }
    }
    if (jams.length === 0) return;
    var src = jams[Math.floor(Math.random() * jams.length)];
    var dirs = [[0,1],[0,-1],[1,0],[-1,0]];
    var candidates = [];
    for (var d = 0; d < dirs.length; d++) {
      var nr = src.r + dirs[d][0];
      var nc = src.c + dirs[d][1];
      if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) continue;
      var cell = this.grid[nr][nc];
      if (!cell.jar && !cell.overlay) candidates.push({ r: nr, c: nc });
    }
    if (candidates.length > 0) {
      var pick = candidates[Math.floor(Math.random() * candidates.length)];
      this.grid[pick.r][pick.c].overlay = { type: 'jam', hp: 1 };
      this.events.push({ type: 'jam_spread', r: pick.r, c: pick.c });
    }
  };

  MatchEngine.prototype.objectivesMet = function() {
    for (var i = 0; i < this.objectives.length; i++) {
      var obj = this.objectives[i];
      var prog = this.objectiveProgress[i];
      if (obj.type === 'score' && this.score < obj.target) return false;
      if (obj.type === 'collect' && prog < obj.target) return false;
      if (obj.type === 'clear_overlay' && prog > 0) return false;
      if (obj.type === 'drop' && prog < obj.target) return false;
      if (obj.type === 'fill' && prog < obj.target) return false;
      if (obj.type === 'order') {
        var keys = Object.keys(obj.counts);
        for (var k = 0; k < keys.length; k++) {
          var tk = keys[k];
          var have = (obj._progress && obj._progress[tk]) || 0;
          if (have < obj.counts[tk]) return false;
        }
      }
    }
    return true;
  };

  MatchEngine.prototype.checkEnd = function() {
    if (this.objectivesMet()) {
      this.state = 'won';
      this.events.push({ type: 'win' });
      return;
    }
    if (!this.useTimer && this.movesLeft <= 0) {
      this.state = 'lost';
      this.events.push({ type: 'lose' });
    }
  };

  MatchEngine.prototype.tickTimer = function(dt) {
    if (!this.useTimer || this.state !== 'idle') return;
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      if (this.objectivesMet()) {
        this.state = 'won';
        this.events.push({ type: 'win' });
      } else {
        this.state = 'lost';
        this.events.push({ type: 'lose' });
      }
    }
  };

  MatchEngine.prototype.getStars = function() {
    if (this.state !== 'won') return 0;
    var remain;
    if (this.useTimer) {
      remain = this.timeLeft / this.level.time;
    } else {
      remain = this.movesLeft / this.level.moves;
    }
    if (remain >= C.STAR_THREE_RATIO) return 3;
    if (remain >= C.STAR_TWO_RATIO) return 2;
    return 1;
  };

  MatchEngine.prototype.applyBooster = function(type) {
    if (type === 'whisk') {
      var row = Math.floor(this.rows / 2);
      var cells = [];
      for (var c = 0; c < this.cols; c++) cells.push({ r: row, c: c });
      this.startResolution(cells);
    } else if (type === 'rolling') {
      var col = Math.floor(this.cols / 2);
      var cells = [];
      for (var r = 0; r < this.rows; r++) cells.push({ r: r, c: col });
      this.startResolution(cells);
    } else if (type === 'sugar') {
      var color = Math.floor(Math.random() * TILE_COUNT);
      cells = [];
      for (var r2 = 0; r2 < this.rows; r2++) {
        for (var c2 = 0; c2 < this.cols; c2++) {
          if (this.grid[r2][c2].tile === color) cells.push({ r: r2, c: c2 });
        }
      }
      this.startResolution(cells);
    } else if (type === 'moves') {
      this.movesLeft += 5;
    } else if (type === 'mitt') {
      for (var r3 = 0; r3 < this.rows; r3++) {
        for (var c3 = 0; c3 < this.cols; c3++) {
          this.grid[r3][c3].locked = false;
        }
      }
    } else if (type === 'proof') {
      for (var r4 = 0; r4 < this.rows; r4++) {
        for (var c4 = 0; c4 < this.cols; c4++) {
          var ov = this.grid[r4][c4].overlay;
          if (ov && ov.type === 'flour') this.grid[r4][c4].overlay = null;
        }
      }
    } else if (type === 'glaze') {
      this.timeLeft += 12;
    } else if (type === 'master') {
      var cr = Math.floor(this.rows / 2);
      var cc2 = Math.floor(this.cols / 2);
      this.grid[cr][cc2].special = 'color';
    }
    return true;
  };

  MatchEngine.prototype.drainEvents = function() {
    var e = this.events.slice();
    this.events = [];
    return e;
  };

  MatchEngine.prototype.getObjectiveRows = function() {
    var rows = [];
    for (var i = 0; i < this.objectives.length; i++) {
      var obj = this.objectives[i];
      var prog = this.objectiveProgress[i];
      var row = { done: false, label: '', detail: '' };
      if (obj.type === 'score') {
        row.label = 'Score';
        row.detail = this.score + ' / ' + obj.target;
        row.done = this.score >= obj.target;
      } else if (obj.type === 'collect') {
        row.label = C.TILE_LABELS[obj.tile];
        row.detail = prog + ' / ' + obj.target;
        row.done = prog >= obj.target;
      } else if (obj.type === 'clear_overlay') {
        row.label = 'Clear ' + (obj.overlay || 'flour');
        row.detail = prog + ' left';
        row.done = prog <= 0;
      } else if (obj.type === 'drop') {
        row.label = 'Drop cherries';
        row.detail = prog + ' / ' + obj.target;
        row.done = prog >= obj.target;
      } else if (obj.type === 'fill') {
        row.label = 'Fill vessel';
        row.detail = Math.floor(prog) + '%';
        row.done = prog >= obj.target;
      } else if (obj.type === 'order') {
        row.label = 'Order';
        var keys = Object.keys(obj.counts || {});
        var parts = [];
        row.done = true;
        for (var k = 0; k < keys.length; k++) {
          var have = (obj._progress && obj._progress[keys[k]]) || 0;
          parts.push(have + '/' + obj.counts[keys[k]] + ' ' + keys[k]);
          if (have < obj.counts[keys[k]]) row.done = false;
        }
        row.detail = parts.join(', ');
      }
      rows.push(row);
    }
    return rows;
  };

  MatchEngine.prototype.getObjectiveText = function() {
    var parts = [];
    for (var i = 0; i < this.objectives.length; i++) {
      var obj = this.objectives[i];
      var prog = this.objectiveProgress[i];
      if (obj.type === 'score') parts.push('Score ' + this.score + '/' + obj.target);
      else if (obj.type === 'collect') parts.push(C.TILE_LABELS[obj.tile] + ' ' + prog + '/' + obj.target);
      else if (obj.type === 'clear_overlay') parts.push('Clear ' + (obj.overlay || 'flour') + ' (' + prog + ' left)');
      else if (obj.type === 'drop') parts.push('Drop cherries ' + prog + '/' + obj.target);
      else if (obj.type === 'fill') parts.push('Fill vessel ' + Math.floor(prog) + '%');
      else if (obj.type === 'order') parts.push('Complete order');
    }
    return parts.join(' · ');
  };

  MatchEngine.prototype.snapshot = function() {
    var g = [];
    for (var r = 0; r < this.rows; r++) {
      g[r] = [];
      for (var c = 0; c < this.cols; c++) {
        g[r][c] = cloneCell(this.grid[r][c]);
      }
    }
    return {
      grid: g,
      score: this.score,
      movesLeft: this.movesLeft,
      timeLeft: this.timeLeft,
      state: this.state,
      objectives: this.objectives,
      objectiveProgress: this.objectiveProgress.slice()
    };
  };

  NS.MatchEngine = MatchEngine;
})(window.PatisserieLedger);
