/**
 * Parlor Klondike — Klondike rules, undo, hints, daily seed.
 */
(function(NS) {
  var C = NS;

  function card(suit, rank, faceUp) {
    return { s: suit, r: rank, u: !!faceUp };
  }

  function cloneCard(c) {
    return { s: c.s, r: c.r, u: c.u };
  }

  function clonePile(p) {
    var out = [];
    for (var i = 0; i < p.length; i++) out.push(cloneCard(p[i]));
    return out;
  }

  function cloneState(s) {
    return {
      stock: clonePile(s.stock),
      waste: clonePile(s.waste),
      foundations: s.foundations.map(clonePile),
      tableau: s.tableau.map(clonePile),
      score: s.score,
      moves: s.moves,
      cycles: s.cycles,
      undosUsed: s.undosUsed,
      hintsUsed: s.hintsUsed,
      elapsed: s.elapsed
    };
  }

  function mulberry32(a) {
    return function() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffleDeck(deck, seed) {
    var rng = typeof seed === 'number' ? mulberry32(seed) : Math.random;
    for (var i = deck.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = deck[i];
      deck[i] = deck[j];
      deck[j] = tmp;
    }
    return deck;
  }

  function buildDeck() {
    var deck = [];
    for (var s = 0; s < 4; s++) {
      for (var r = 1; r <= 13; r++) deck.push(card(s, r, false));
    }
    return deck;
  }

  function GameEngine() {
    this.reset();
  }

  GameEngine.prototype.reset = function() {
    this.mode = C.MODES.classic;
    this.state = 'menu';
    this.stock = [];
    this.waste = [];
    this.foundations = [[], [], [], []];
    this.tableau = [[], [], [], [], [], [], []];
    this.score = 0;
    this.moves = 0;
    this.cycles = 0;
    this.elapsed = 0;
    this.undosUsed = 0;
    this.hintsUsed = 0;
    this.undoStack = [];
    this.selected = null;
    this.won = false;
    this.lost = false;
    this.noUndoWin = true;
    this.timerOn = false;
  };

  GameEngine.prototype.newGame = function(modeId, seed) {
    var mode = C.MODES[modeId] || C.MODES.classic;
    this.mode = mode;
    this.state = 'playing';
    this.won = false;
    this.lost = false;
    this.moves = 0;
    this.cycles = 0;
    this.elapsed = 0;
    this.undosUsed = 0;
    this.hintsUsed = 0;
    this.undoStack = [];
    this.selected = null;
    this.noUndoWin = true;
    this.timerOn = true;

    var deck = shuffleDeck(buildDeck(), seed != null ? seed : undefined);
    this.stock = [];
    this.waste = [];
    this.foundations = [[], [], [], []];
    this.tableau = [[], [], [], [], [], [], []];

    for (var col = 0; col < 7; col++) {
      for (var row = 0; row <= col; row++) {
        var c = deck.pop();
        c.u = row === col;
        this.tableau[col].push(c);
      }
    }
    this.stock = deck;

    if (mode.vegas) this.score = -C.SCORE.vegasStart;
    else this.score = 0;
  };

  GameEngine.prototype.snapshot = function() {
    return cloneState(this);
  };

  GameEngine.prototype.restore = function(snap) {
    this.stock = snap.stock;
    this.waste = snap.waste;
    this.foundations = snap.foundations;
    this.tableau = snap.tableau;
    this.score = snap.score;
    this.moves = snap.moves;
    this.cycles = snap.cycles;
    this.undosUsed = snap.undosUsed;
    this.hintsUsed = snap.hintsUsed;
    this.elapsed = snap.elapsed;
    this.selected = null;
  };

  GameEngine.prototype.pushUndo = function() {
    if (this.undoStack.length > 120) this.undoStack.shift();
    this.undoStack.push(this.snapshot());
  };

  GameEngine.prototype.canUndo = function() {
    return this.state === 'playing' && this.undoStack.length > 0;
  };

  GameEngine.prototype.undo = function() {
    if (!this.canUndo()) return false;
    var snap = this.undoStack.pop();
    this.restore(snap);
    this.undosUsed++;
    this.noUndoWin = false;
    if (!this.mode.vegas) this.score = Math.max(0, this.score - C.SCORE.undoPenalty);
    this.won = false;
    this.lost = false;
    return true;
  };

  GameEngine.prototype.pileRef = function(zone) {
    if (zone === 'stock') return this.stock;
    if (zone === 'waste') return this.waste;
    if (zone.indexOf('foundation-') === 0) return this.foundations[parseInt(zone.split('-')[1], 10)];
    if (zone.indexOf('tableau-') === 0) return this.tableau[parseInt(zone.split('-')[1], 10)];
    return null;
  };

  GameEngine.prototype.canPlaceTableau = function(c, pile) {
    if (!c || !c.u) return false;
    if (!pile.length) return c.r === 13;
    var top = pile[pile.length - 1];
    if (!top.u) return false;
    return C.isRed(c.s) !== C.isRed(top.s) && c.r === top.r - 1;
  };

  GameEngine.prototype.canPlaceFoundation = function(c, pile) {
    if (!c || !c.u) return false;
    if (!pile.length) return c.r === 1;
    var top = pile[pile.length - 1];
    return c.s === top.s && c.r === top.r + 1;
  };

  GameEngine.prototype.validSequence = function(pile, startIdx) {
    if (startIdx < 0 || startIdx >= pile.length) return false;
    if (!pile[startIdx].u) return false;
    for (var i = startIdx; i < pile.length - 1; i++) {
      var a = pile[i];
      var b = pile[i + 1];
      if (!b.u) return false;
      if (C.isRed(a.s) === C.isRed(b.s)) return false;
      if (a.r !== b.r + 1) return false;
    }
    return true;
  };

  GameEngine.prototype.flipTopTableau = function(col) {
    var pile = this.tableau[col];
    if (!pile.length) return false;
    var top = pile[pile.length - 1];
    if (top.u) return false;
    top.u = true;
    if (!this.mode.vegas) this.score += C.SCORE.flipTableau;
    return true;
  };

  GameEngine.prototype.moveCards = function(fromZone, fromIdx, toZone) {
    var from = this.pileRef(fromZone);
    var to = this.pileRef(toZone);
    if (!from || !to || fromZone === toZone) return false;
    if (fromIdx < 0 || fromIdx >= from.length) return false;

    var moving = from.slice(fromIdx);
    if (!moving.length || !moving[0].u) return false;

    if (fromZone.indexOf('tableau-') === 0) {
      if (!this.validSequence(from, fromIdx)) return false;
    } else if (fromIdx !== from.length - 1) {
      return false;
    }

    var target = moving[0];
    if (toZone.indexOf('foundation-') === 0) {
      if (moving.length !== 1 || !this.canPlaceFoundation(target, to)) return false;
    } else if (toZone.indexOf('tableau-') === 0) {
      if (!this.canPlaceTableau(target, to)) return false;
    } else {
      return false;
    }

    this.pushUndo();
    var cards = from.splice(fromIdx, moving.length);
    for (var i = 0; i < cards.length; i++) to.push(cards[i]);
    this.moves++;

    if (fromZone.indexOf('tableau-') === 0) {
      var col = parseInt(fromZone.split('-')[1], 10);
      this.flipTopTableau(col);
    }

    if (toZone.indexOf('foundation-') === 0 && !this.mode.vegas) {
      this.score += C.SCORE.toFoundation;
    } else if (toZone.indexOf('tableau-') === 0 && fromZone === 'waste' && !this.mode.vegas) {
      this.score += C.SCORE.toTableau;
    }

    this.selected = null;
    this.checkWin();
    return true;
  };

  GameEngine.prototype.tapStock = function() {
    if (this.state !== 'playing') return false;
    this.pushUndo();

    if (this.stock.length) {
      var draw = Math.min(this.mode.draw, this.stock.length);
      for (var i = 0; i < draw; i++) {
        var c = this.stock.pop();
        c.u = true;
        this.waste.push(c);
      }
      this.moves++;
      this.selected = null;
      return true;
    }

    if (this.waste.length && this.cycles < this.mode.maxCycles) {
      while (this.waste.length) {
        var w = this.waste.pop();
        w.u = false;
        this.stock.push(w);
      }
      this.cycles++;
      this.moves++;
      this.selected = null;
      return true;
    }

    this.undoStack.pop();
    return false;
  };

  GameEngine.prototype.select = function(zone, index) {
    if (this.state !== 'playing') return;
    var pile = this.pileRef(zone);
    if (!pile) return;

    if (zone === 'stock') {
      this.tapStock();
      return { action: 'stock' };
    }

    if (zone === 'waste' && index !== pile.length - 1) return null;

    if (!pile.length) {
      if (this.selected) {
        var placed = this.moveCards(this.selected.zone, this.selected.index, zone);
        return { action: placed ? 'move' : 'invalid' };
      }
      return null;
    }

    if (index == null || index < 0) index = pile.length - 1;
    if (!pile[index].u) return null;

    if (!this.selected) {
      if (zone.indexOf('tableau-') === 0 && !this.validSequence(pile, index)) return null;
      if (zone !== 'waste' && zone.indexOf('tableau-') !== 0 && zone.indexOf('foundation-') !== 0) return null;
      if (zone.indexOf('foundation-') === 0) return null;
      this.selected = { zone: zone, index: index };
      return { action: 'select' };
    }

    if (this.selected.zone === zone && this.selected.index === index) {
      this.selected = null;
      return { action: 'deselect' };
    }

    if (this.selected.zone === zone && zone.indexOf('tableau-') === 0 && index !== this.selected.index) {
      if (this.validSequence(pile, index)) {
        this.selected = { zone: zone, index: index };
        return { action: 'select' };
      }
    }

    var ok = this.moveCards(this.selected.zone, this.selected.index, zone);
    return { action: ok ? 'move' : 'invalid' };
  };

  GameEngine.prototype.doubleTap = function(zone, index) {
    if (this.state !== 'playing') return false;
    var pile = this.pileRef(zone);
    if (!pile || !pile.length) return false;
    if (index == null) index = pile.length - 1;
    var c = pile[index];
    if (!c.u) return false;

    for (var f = 0; f < 4; f++) {
      if (this.canPlaceFoundation(c, this.foundations[f])) {
        return this.moveCards(zone, index, 'foundation-' + f);
      }
    }

    for (var t = 0; t < 7; t++) {
      var tz = 'tableau-' + t;
      if (tz === zone) continue;
      if (this.canPlaceTableau(c, this.tableau[t])) {
        return this.moveCards(zone, index, tz);
      }
    }
    return false;
  };

  GameEngine.prototype.autoCollect = function() {
    if (this.state !== 'playing') return 0;
    var moved = 0;
    var again = true;
    while (again) {
      again = false;
      var sources = ['waste'];
      for (var t = 0; t < 7; t++) sources.push('tableau-' + t);
      for (var s = 0; s < sources.length; s++) {
        var pile = this.pileRef(sources[s]);
        if (!pile.length || !pile[pile.length - 1].u) continue;
        var idx = pile.length - 1;
        for (var f = 0; f < 4; f++) {
          if (this.canPlaceFoundation(pile[idx], this.foundations[f])) {
            if (this.moveCards(sources[s], idx, 'foundation-' + f)) {
              moved++;
              again = true;
              break;
            }
          }
        }
        if (again) break;
      }
    }
    return moved;
  };

  GameEngine.prototype.findHint = function() {
    if (this.state !== 'playing') return null;

    function tryFoundations(srcZone, pile) {
      if (!pile.length || !pile[pile.length - 1].u) return null;
      var idx = pile.length - 1;
      for (var f = 0; f < 4; f++) {
        if (GameEngine.prototype.canPlaceFoundation.call(this, pile[idx], this.foundations[f])) {
          return { from: srcZone, to: 'foundation-' + f, text: 'Move ' + C.RANKS[pile[idx].r - 1] + ' to foundation' };
        }
      }
      return null;
    }

    var h = tryFoundations.call(this, 'waste', this.waste);
    if (h) return h;

    for (var t = 0; t < 7; t++) {
      h = tryFoundations.call(this, 'tableau-' + t, this.tableau[t]);
      if (h) return h;
    }

    if (this.waste.length) {
      var w = this.waste[this.waste.length - 1];
      for (var t2 = 0; t2 < 7; t2++) {
        if (this.canPlaceTableau(w, this.tableau[t2])) {
          return { from: 'waste', to: 'tableau-' + t2, text: 'Place waste card on tableau' };
        }
      }
    }

    for (var col = 0; col < 7; col++) {
      var pile = this.tableau[col];
      for (var i = 0; i < pile.length; i++) {
        if (!pile[i].u || !this.validSequence(pile, i)) continue;
        for (var t3 = 0; t3 < 7; t3++) {
          if (t3 === col) continue;
          if (this.canPlaceTableau(pile[i], this.tableau[t3])) {
            return { from: 'tableau-' + col, to: 'tableau-' + t3, text: 'Move stack to another column' };
          }
        }
      }
    }

    if (this.stock.length || (this.waste.length && this.cycles < this.mode.maxCycles)) {
      return { from: 'stock', to: 'stock', text: 'Draw from the stock pile' };
    }

    return null;
  };

  GameEngine.prototype.applyHint = function() {
    var hint = this.findHint();
    if (!hint) return null;
    this.hintsUsed++;
    if (!this.mode.vegas) this.score = Math.max(0, this.score - C.SCORE.hintPenalty);
    return hint;
  };

  GameEngine.prototype.checkWin = function() {
    var total = 0;
    for (var f = 0; f < 4; f++) total += this.foundations[f].length;
    if (total === 52) {
      this.won = true;
      this.state = 'won';
      this.timerOn = false;
      if (this.mode.vegas) {
        this.score += Math.max(0, Math.floor((600 - this.elapsed) * 0.5));
      } else {
        this.score += Math.max(0, Math.floor((300 - this.elapsed) * C.SCORE.timeBonusPerSec));
      }
    }
  };

  GameEngine.prototype.hasMoves = function() {
    if (this.findHint()) return true;
    return false;
  };

  GameEngine.prototype.tick = function(dt) {
    if (this.timerOn && this.state === 'playing') this.elapsed += dt;
  };

  NS.GameEngine = GameEngine;
})(window.ParlorSolitaire = window.ParlorSolitaire || {});
