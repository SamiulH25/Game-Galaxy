/**
 * Parlor Klondike — DOM card renderer (dirty updates only).
 */
(function(NS) {
  var C = NS;

  function Renderer(boardEl) {
    this.board = boardEl;
    this.dirty = true;
    this.lastHintKey = '';
  }

  Renderer.prototype.markDirty = function() {
    this.dirty = true;
  };

  Renderer.prototype.cardEl = function(c, zone, index, selected) {
    var el = document.createElement('div');
    el.className = 'card' + (c.u ? ' face-up ' + C.cardColor(c.s) : ' face-down');
    if (selected) el.classList.add('selected');
    el.dataset.zone = zone;
    el.dataset.index = String(index);
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', c.u ? C.RANKS[c.r - 1] + ' of ' + C.SUITS[c.s].name : 'Face-down card');

    if (c.u) {
      var rank = document.createElement('span');
      rank.className = 'card-rank';
      rank.textContent = C.RANKS[c.r - 1];
      var suit = document.createElement('span');
      suit.className = 'card-suit';
      suit.textContent = C.SUITS[c.s].symbol;
      var center = document.createElement('span');
      center.className = 'card-center';
      center.textContent = C.SUITS[c.s].symbol;
      el.appendChild(rank);
      el.appendChild(suit);
      el.appendChild(center);
    } else {
      var back = document.createElement('div');
      back.className = 'card-back';
      el.appendChild(back);
    }
    return el;
  };

  Renderer.prototype.renderBoard = function(engine) {
    if (!this.board || engine.state === 'menu') return;

    var zones = this.board.querySelectorAll('.pile');
    for (var z = 0; z < zones.length; z++) {
      var zoneEl = zones[z];
      var zone = zoneEl.dataset.zone;
      zoneEl.innerHTML = '';
      var pile = engine.pileRef(zone);
      if (!pile) continue;

      if (zone === 'stock') {
        if (pile.length) {
          var stockCard = this.cardEl(pile[pile.length - 1], zone, pile.length - 1, false);
          stockCard.classList.add('stock-top');
          var badge = document.createElement('span');
          badge.className = 'stock-count';
          badge.textContent = String(pile.length);
          zoneEl.appendChild(badge);
          zoneEl.appendChild(stockCard);
        } else {
          var empty = document.createElement('div');
          empty.className = 'pile-empty';
          empty.textContent = engine.waste.length && engine.cycles < engine.mode.maxCycles ? '↻' : '';
          zoneEl.appendChild(empty);
        }
        continue;
      }

      if (zone === 'waste') {
        var start = Math.max(0, pile.length - 3);
        for (var w = start; w < pile.length; w++) {
          var wc = this.cardEl(pile[w], zone, w, engine.selected && engine.selected.zone === zone && engine.selected.index === w);
          wc.style.left = ((w - start) * 18) + 'px';
          zoneEl.appendChild(wc);
        }
        if (!pile.length) {
          var we = document.createElement('div');
          we.className = 'pile-empty';
          zoneEl.appendChild(we);
        }
        continue;
      }

      if (zone.indexOf('foundation-') === 0) {
        if (!pile.length) {
          var suitId = parseInt(zone.split('-')[1], 10);
          var slot = document.createElement('div');
          slot.className = 'foundation-slot ' + C.cardColor(suitId);
          slot.textContent = C.SUITS[suitId].symbol;
          zoneEl.appendChild(slot);
        } else {
          var fc = pile[pile.length - 1];
          zoneEl.appendChild(this.cardEl(fc, zone, pile.length - 1, false));
        }
        continue;
      }

      if (zone.indexOf('tableau-') === 0) {
        for (var t = 0; t < pile.length; t++) {
          var isSel = engine.selected && engine.selected.zone === zone &&
            engine.selected.index <= t && t >= engine.selected.index;
          var tc = this.cardEl(pile[t], zone, t, isSel);
          tc.style.top = 'calc(' + t + ' * var(--stack-gap))';
          zoneEl.appendChild(tc);
        }
        if (!pile.length) {
          var te = document.createElement('div');
          te.className = 'pile-empty';
          zoneEl.appendChild(te);
        }
      }
    }
  };

  Renderer.prototype.highlightHint = function(hint) {
    var key = hint ? hint.from + '>' + hint.to + ':' + hint.text : '';
    if (key === this.lastHintKey && !this.dirty) return;
    this.lastHintKey = key;

    var old = this.board.querySelectorAll('.hint-flash, .hint-zone-flash');
    for (var i = 0; i < old.length; i++) {
      old[i].classList.remove('hint-flash', 'hint-zone-flash');
    }
    if (!hint) return;
    if (hint.from === 'stock') {
      var stock = this.board.querySelector('[data-zone="stock"]');
      if (stock) stock.classList.add('hint-flash');
      return;
    }
    var fromPile = this.board.querySelector('[data-zone="' + hint.from + '"]');
    if (fromPile) {
      var last = fromPile.querySelector('.card:last-child');
      if (last) last.classList.add('hint-flash');
    }
    var toZone = this.board.querySelector('[data-zone="' + hint.to + '"]');
    if (toZone) toZone.classList.add('hint-zone-flash');
  };

  Renderer.prototype.render = function(engine) {
    if (!this.board || engine.state === 'menu') return;

    if (this.dirty) {
      this.renderBoard(engine);
      this.dirty = false;
    }
    this.highlightHint(engine._hintFlash);
  };

  NS.Renderer = Renderer;
})(window.ParlorSolitaire = window.ParlorSolitaire || {});
