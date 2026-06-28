/**
 * Phaser scenes — Boot, scrollable World Map, animated Game.
 */
window.PatisserieLedger = window.PatisserieLedger || {};

(function(NS) {
  var C = NS.Config;
  var COL = C.COLORS;
  var AN = C.ANIM;
  var TILE_KEYS = C.TILE_KEYS;

  function tileTexture(special, tile) {
    if (special === 'row' || special === 'col') return 'tile_special_line';
    if (special === 'bomb') return 'tile_special_bomb';
    if (special === 'color') return 'tile_special_color';
    return 'tile_' + TILE_KEYS[tile];
  }

  function hexStr(n) {
    return '#' + n.toString(16).padStart(6, '0');
  }

  function overlayTex(type) {
    if (type === 'flour') return 'overlay_flour';
    if (type === 'jam') return 'overlay_jam';
    return 'overlay_glaze';
  }

  var BootScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function BootScene() {
      Phaser.Scene.call(this, { key: 'BootScene' });
    },
    preload: function() {
      var base = 'assets/tiles/';
      var i;
      for (i = 0; i < TILE_KEYS.length; i++) {
        this.load.image('tile_' + TILE_KEYS[i], base + TILE_KEYS[i] + '.svg');
      }
    },
    create: function() {
      NS.generateTextures(this);

      if (NS.App && NS.App.onBootComplete) NS.App.onBootComplete();
      this.scene.start('MapScene');
    }
  });

  var MapScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function MapScene() {
      Phaser.Scene.call(this, { key: 'MapScene' });
    },
    create: function() {
      var self = this;
      var layout = NS.MapLayout;
      var mapH = layout.height;
      var w = C.GAME_WIDTH;

      this.cameras.main.setBackgroundColor(hexStr(COL.bg));
      this.cameras.main.setBounds(0, 0, w, mapH);
      this.cameras.main.scrollY = 0;

      var world = this.add.container(0, 0);

      var bg = this.add.graphics();
      bg.fillGradientStyle(0x2a2218, 0x2a2218, 0x352c24, 0x352c24, 1);
      bg.fillRect(0, 0, w, mapH);
      for (var plank = 0; plank < Math.ceil(mapH / 48); plank++) {
        bg.lineStyle(1, 0x3d3228, 0.35);
        bg.lineBetween(0, plank * 48, w, plank * 48);
      }
      world.add(bg);

      var nodes = layout.nodes;
      var pathG = this.add.graphics();
      pathG.lineStyle(10, COL.path, 0.45);
      pathG.beginPath();
      pathG.moveTo(nodes[0].x, nodes[0].y);
      for (var i = 1; i < nodes.length; i++) {
        var mx = (nodes[i - 1].x + nodes[i].x) / 2;
        pathG.lineTo(mx, nodes[i - 1].y);
        pathG.lineTo(mx, nodes[i].y);
        pathG.lineTo(nodes[i].x, nodes[i].y);
      }
      pathG.strokePath();
      pathG.lineStyle(4, COL.pathLit, 0.55);
      pathG.beginPath();
      pathG.moveTo(nodes[0].x, nodes[0].y);
      for (var j = 1; j < nodes.length; j++) {
        var mx2 = (nodes[j - 1].x + nodes[j].x) / 2;
        pathG.lineTo(mx2, nodes[j - 1].y);
        pathG.lineTo(mx2, nodes[j].y);
        pathG.lineTo(nodes[j].x, nodes[j].y);
      }
      pathG.strokePath();
      world.add(pathG);

      var save = NS.App.save;
      var totalStars = save.totalStars || 0;

      for (var lm = 0; lm < layout.landmarks.length; lm++) {
        var land = layout.landmarks[lm];
        var chapter = C.CHAPTERS[lm];
        var unlocked = totalStars >= chapter.unlockStars || lm === 0;
        var banner = this.add.container(w / 2, land.y);
        var plate = this.add.rectangle(0, 0, w - 48, 52, unlocked ? 0x4a3c30 : 0x3a3028, 0.92)
          .setStrokeStyle(2, unlocked ? COL.copper : 0x5c4c40);
        var title = this.add.text(0, -6, chapter.name, {
          fontFamily: 'Libre Baskerville, Georgia, serif',
          fontSize: '17px',
          color: unlocked ? '#e8dcc8' : '#8a7a6a'
        }).setOrigin(0.5);
        var sub = this.add.text(0, 14, chapter.subtitle, {
          fontFamily: 'IM Fell English, Georgia, serif',
          fontSize: '11px',
          fontStyle: 'italic',
          color: '#a8947a'
        }).setOrigin(0.5);
        banner.add([plate, title, sub]);
        world.add(banner);
      }

      this.levelNodes = [];
      for (var n = 0; n < nodes.length; n++) {
        var node = nodes[n];
        var chIdx = node.chapter - 1;
        var chUnlocked = totalStars >= C.CHAPTERS[chIdx].unlockStars || chIdx === 0;
        var stars = (save.levelStars && save.levelStars[node.id]) || 0;
        var playable = chUnlocked;
        if (node.level > 1) {
          var prevInCh = node.chapter + '-' + (node.level - 1);
          playable = playable && ((save.levelStars[prevInCh] || 0) > 0);
        } else if (chIdx > 0) {
          playable = playable && ((save.levelStars[(node.chapter - 1) + '-15'] || 0) > 0);
        }

        var container = this.add.container(node.x, node.y);
        var radius = 22;
        var fill = playable ? 0x5c4a3a : (chUnlocked ? 0x4a4038 : 0x3a3228);
        var circle = this.add.circle(0, 0, radius, fill, 1).setStrokeStyle(3, playable ? COL.copper : 0x6b5a4a);
        var icon = this.add.image(0, -2, 'tile_' + TILE_KEYS[n % 6]).setDisplaySize(28, 28);
        if (!playable) icon.setAlpha(0.45);
        var num = this.add.text(0, radius + 10, String(node.level), {
          fontFamily: 'Source Sans 3, sans-serif',
          fontSize: '12px',
          fontWeight: '600',
          color: playable ? '#e8dcc8' : '#7a6a5a'
        }).setOrigin(0.5);
        var starTxt = this.add.text(0, radius + 24, stars > 0 ? '★'.repeat(stars) : '·', {
          fontSize: '10px',
          color: stars > 0 ? '#d4a84a' : '#5a4a3a'
        }).setOrigin(0.5);
        container.add([circle, icon, num, starTxt]);
        container.setSize(radius * 2, radius * 2);
        container.levelId = node.id;
        container.playable = playable;

        if (playable) {
          circle.setInteractive({ useHandCursor: true });
          circle.on('pointerover', function() {
            this.setScale(1.08);
            container.setScale(1.06);
          });
          circle.on('pointerout', function() {
            this.setScale(1);
            container.setScale(1);
          });
          circle.on('pointerup', function() {
            NS.Audio.ui();
            self.tweens.add({
              targets: container,
              scaleX: 0.92, scaleY: 0.92,
              duration: 80, yoyo: true,
              onComplete: function() { NS.App.startLevel(container.levelId); }
            });
          });
        }
        world.add(container);
        this.levelNodes.push(container);

        container.setAlpha(0);
        container.y += 20;
        this.tweens.add({
          targets: container,
          alpha: 1, y: node.y,
          duration: 350,
          delay: n * 18,
          ease: 'Quad.easeOut'
        });
      }

      var pantryY = mapH - 56;
      var pantry = this.add.container(w / 2 - 70, pantryY);
      var pBg = this.add.rectangle(0, 0, 200, 40, COL.copper, 1).setInteractive({ useHandCursor: true });
      var pTxt = this.add.text(0, 0, 'Pantry & Craft', {
        fontFamily: 'Source Sans 3, sans-serif',
        fontSize: '14px',
        fontWeight: '600',
        color: '#faf6f0'
      }).setOrigin(0.5);
      pantry.add([pBg, pTxt]);
      pBg.on('pointerup', function() { NS.App.showPantry(); });
      world.add(pantry);

      var helpBtn = this.add.container(w / 2 + 70, pantryY);
      var hBg = this.add.rectangle(0, 0, 120, 40, 0x4a3c30, 1).setStrokeStyle(1, COL.copper, 0.5).setInteractive({ useHandCursor: true });
      var hTxt = this.add.text(0, 0, 'How to play', {
        fontFamily: 'Source Sans 3, sans-serif',
        fontSize: '13px',
        color: '#e8dcc8'
      }).setOrigin(0.5);
      helpBtn.add([hBg, hTxt]);
      hBg.on('pointerup', function() { NS.App.showHowToPlay(); });
      world.add(helpBtn);

      this.add.text(w / 2, 28, 'Patisserie Ledger', {
        fontFamily: 'Libre Baskerville, Georgia, serif',
        fontSize: '20px',
        color: '#e8dcc8'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

      this.add.text(w / 2, 52, totalStars + ' \u2605 earned \u00B7 scroll or drag the path', {
        fontFamily: 'Source Sans 3, sans-serif',
        fontSize: '12px',
        color: '#a8947a'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

      this.input.on('wheel', function(pointer, ox, oy, deltaY) {
        self.cameras.main.scrollY = Phaser.Math.Clamp(self.cameras.main.scrollY + deltaY * 0.4, 0, mapH - C.GAME_HEIGHT);
      });

      var dragStart = null;
      this.input.on('pointerdown', function(p) {
        if (p.y < 70) return;
        dragStart = { y: p.y, scroll: self.cameras.main.scrollY };
      });
      this.input.on('pointermove', function(p) {
        if (!dragStart || !p.isDown) return;
        self.cameras.main.scrollY = Phaser.Math.Clamp(dragStart.scroll + (dragStart.y - p.y), 0, mapH - C.GAME_HEIGHT);
      });
      this.input.on('pointerup', function() { dragStart = null; });

      this.cameras.main.fadeIn(400, 0, 0, 0);
    }
  });

  var GameScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function GameScene() {
      Phaser.Scene.call(this, { key: 'GameScene' });
    },
    init: function(data) {
      this.levelId = data.levelId;
      this.levelDef = NS.getLevel(data.levelId);
      this.engine = new NS.MatchEngine(this.levelDef);
      this.pendingBoosters = data.boosters || [];
      this.cellSprites = [];
      this.overlaySprites = [];
      this.dropBadges = [];
      this.cellBgs = [];
      this.selectRing = null;
      this.selected = null;
      this.busy = false;
      this.dragStart = null;
      this.boardOriginX = 0;
      this.boardOriginY = 182;
      this.cellSize = C.TILE_SIZE;
      this.particles = null;
    },
    create: function() {
      var self = this;
      this.cameras.main.setBackgroundColor(hexStr(COL.bg));
      this.cameras.main.fadeIn(300, 0, 0, 0);

      var w = C.GAME_WIDTH;
      var boardW = this.levelDef.cols * (this.cellSize + C.TILE_GAP);
      this.boardOriginX = (w - boardW) / 2;

      var boardH = this.levelDef.rows * (this.cellSize + C.TILE_GAP);
      var frame = this.add.rectangle(w / 2, this.boardOriginY + boardH / 2 - 8, boardW + 28, boardH + 20, COL.board, 1)
        .setStrokeStyle(3, COL.copper, 0.6);
      frame.setDepth(0);

      this.createGameHud(w);
      this.createPhaserToolbar(w);

      this.selectRing = this.add.circle(0, 0, this.cellSize * 0.52, COL.copper, 0)
        .setStrokeStyle(3, COL.copper, 0.9).setVisible(false).setDepth(20);
      this.tweens.add({
        targets: this.selectRing,
        scaleX: 1.08, scaleY: 1.08,
        duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });

      this.particles = this.add.particles(0, 0, 'particle_crumb', {
        speed: { min: 40, max: 120 },
        scale: { start: 1.2, end: 0 },
        lifespan: 380,
        quantity: 6,
        emitting: false
      }).setDepth(30);

      this.applyPendingBoosters();
      this.buildBoard();
      this.syncSprites(false);

      this.input.on('pointerdown', function(pointer) {
        if (self.busy || self.engine.state !== 'idle') return;
        var cell = self.pointerToCell(pointer.x, pointer.y);
        if (!cell) return;
        NS.Audio.resume();
        self.dragStart = { r: cell.r, c: cell.c, x: pointer.x, y: pointer.y };
        if (self.engine.cellPlayable(cell.r, cell.c)) {
          self.setSelection(cell.r, cell.c);
        }
        self.dismissCoach();
      });

      this.input.on('pointerup', function(pointer) {
        if (!self.dragStart || self.busy) return;
        var start = self.dragStart;
        self.dragStart = null;
        var cell = self.pointerToCell(pointer.x, pointer.y);
        if (!cell) {
          self.clearSelection();
          return;
        }
        if (cell.r === start.r && cell.c === start.c) return;
        if (self.engine.areAdjacent(start.r, start.c, cell.r, cell.c)) {
          self.attemptSwap(start.r, start.c, cell.r, cell.c);
        } else {
          self.clearSelection();
        }
      });

      this.boardEntrance();
      if (NS.App.onGameStart) NS.App.onGameStart(this.engine);
      this.updateHud(this.engine);
      if (this.levelId === '1-1' && !NS.App.save.levelStars['1-1']) {
        this.showCoachTip('Tap a pastry, then tap a neighbour to swap.\nMatch 3 or more in a row to score.');
      }
    },
    showCoachTip: function(msg) {
      var self = this;
      var w = C.GAME_WIDTH;
      var tip = this.add.container(w / 2, 168);
      var bg = this.add.rectangle(0, 0, w - 40, 52, 0x1a1510, 0.92).setStrokeStyle(1, COL.copper, 0.55);
      var txt = this.add.text(0, 0, msg, {
        fontFamily: 'Source Sans 3, sans-serif',
        fontSize: '12px',
        color: '#e8dcc8',
        align: 'center',
        wordWrap: { width: w - 64 }
      }).setOrigin(0.5);
      tip.add([bg, txt]).setDepth(120);
      this.coachTip = tip;
      this.time.delayedCall(8000, function() {
        if (self.coachTip) {
          self.tweens.add({ targets: self.coachTip, alpha: 0, duration: 400, onComplete: function() {
            if (self.coachTip) self.coachTip.destroy();
            self.coachTip = null;
          }});
        }
      });
    },
    dismissCoach: function() {
      if (this.coachTip) {
        this.coachTip.destroy();
        this.coachTip = null;
      }
    },
    createPhaserToolbar: function(w) {
      var self = this;
      var y = C.GAME_HEIGHT - 26;
      var labels = [
        { x: w / 2 - 148, text: 'Pause', fn: function() { NS.App.triggerPause(); } },
        { x: w / 2 - 50, text: 'Booster', fn: function() { NS.App.showBoosterPicker(); } },
        { x: w / 2 + 48, text: 'Help', fn: function() { NS.App.showHowToPlay(); } },
        { x: w / 2 + 146, text: 'Map', fn: function() { NS.App.goToMap(); } }
      ];
      for (var i = 0; i < labels.length; i++) {
        (function(item) {
          var bg = self.add.rectangle(item.x, y, 88, 32, COL.copper, 1)
            .setStrokeStyle(1, 0x8b5a2b, 0.8)
            .setInteractive({ useHandCursor: true }).setDepth(200);
          self.add.text(item.x, y, item.text, {
            fontFamily: 'Source Sans 3, sans-serif',
            fontSize: '12px',
            fontWeight: '600',
            color: '#faf6f0'
          }).setOrigin(0.5).setDepth(201);
          bg.on('pointerover', function() { bg.setFillStyle(0xc88644); });
          bg.on('pointerout', function() { bg.setFillStyle(COL.copper); });
          bg.on('pointerup', function() { NS.Audio.ui(); item.fn(); });
        })(labels[i]);
      }
    },
    createGameHud: function(w) {
      var ch = C.CHAPTERS[this.levelDef.chapter - 1];
      this.add.rectangle(w / 2, 62, w - 16, 112, 0x1a1510, 0.94)
        .setStrokeStyle(1, COL.copper, 0.5).setDepth(90);

      this.add.text(20, 10, 'SECTOR', {
        fontFamily: 'Source Sans 3, sans-serif', fontSize: '8px', color: '#8a7a6a', letterSpacing: 1
      }).setDepth(91);
      this.levelSectorText = this.add.text(20, 20, this.levelDef.id, {
        fontFamily: 'Source Sans 3, sans-serif', fontSize: '17px', color: '#d4a84a', fontStyle: 'bold'
      }).setDepth(91);

      this.levelNameText = this.add.text(w / 2, 12, this.levelDef.name, {
        fontFamily: 'Libre Baskerville, Georgia, serif', fontSize: '15px', color: '#e8dcc8'
      }).setOrigin(0.5, 0).setDepth(91);
      this.districtText = this.add.text(w / 2, 32, ch.name, {
        fontFamily: 'IM Fell English, Georgia, serif', fontSize: '11px', fontStyle: 'italic', color: '#a8947a'
      }).setOrigin(0.5, 0).setDepth(91);

      var labelStyle = { fontFamily: 'Source Sans 3, sans-serif', fontSize: '8px', color: '#8a7a6a' };
      var valueStyle = { fontFamily: 'Source Sans 3, sans-serif', fontSize: '14px', color: '#e8dcc8', fontStyle: 'bold' };

      this.add.rectangle(72, 52, 64, 36, 0x2a2218, 0.9).setStrokeStyle(1, 0x5c4c40, 0.6).setDepth(90);
      this.add.rectangle(w / 2, 52, 64, 36, 0x2a2218, 0.9).setStrokeStyle(1, 0x5c4c40, 0.6).setDepth(90);
      this.add.rectangle(w - 72, 52, 64, 36, 0x2a2218, 0.9).setStrokeStyle(1, 0x5c4c40, 0.6).setDepth(90);

      this.add.text(72, 40, 'MOVES', labelStyle).setOrigin(0.5, 0).setDepth(91);
      this.hudMovesText = this.add.text(72, 54, '—', valueStyle).setOrigin(0.5, 0).setDepth(91);
      this.add.text(w / 2, 40, 'TIMER', labelStyle).setOrigin(0.5, 0).setDepth(91);
      this.hudTimerText = this.add.text(w / 2, 54, '—', valueStyle).setOrigin(0.5, 0).setDepth(91);
      this.add.text(w - 72, 40, 'SCORE', labelStyle).setOrigin(0.5, 0).setDepth(91);
      this.hudScoreText = this.add.text(w - 72, 54, '0', valueStyle).setOrigin(0.5, 0).setDepth(91);

      this.add.text(20, 78, 'SHIFT TICKET', {
        fontFamily: 'Source Sans 3, sans-serif', fontSize: '8px', color: '#8a7a6a', letterSpacing: 1
      }).setDepth(91);

      this.objectiveTexts = [];
      for (var i = 0; i < 3; i++) {
        this.objectiveTexts[i] = this.add.text(20, 92 + i * 15, '', {
          fontFamily: 'Source Sans 3, sans-serif', fontSize: '11px', color: '#d4c4b0'
        }).setDepth(91).setVisible(false);
      }
    },
    updateHud: function(engine) {
      if (!engine || !this.hudMovesText) return;
      if (engine.useTimer) {
        this.hudMovesText.setText('—');
        var t = Math.max(0, Math.ceil(engine.timeLeft));
        this.hudTimerText.setText(Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'));
      } else {
        this.hudTimerText.setText('—');
        this.hudMovesText.setText(String(Math.max(0, engine.movesLeft)));
      }
      if (this.hudScoreText) this.hudScoreText.setText(String(engine.score));

      var rows = engine.getObjectiveRows ? engine.getObjectiveRows() : [];
      for (var i = 0; i < 3; i++) {
        if (!this.objectiveTexts[i]) continue;
        if (i < rows.length) {
          var row = rows[i];
          var mark = row.done ? '\u2713' : '\u25C7';
          this.objectiveTexts[i].setText(mark + ' ' + row.label + '   ' + row.detail);
          this.objectiveTexts[i].setColor(row.done ? '#98b888' : '#d4c4b0');
          this.objectiveTexts[i].setVisible(true);
        } else {
          this.objectiveTexts[i].setVisible(false);
        }
      }
    },
    boardEntrance: function() {
      var self = this;
      for (var r = 0; r < this.levelDef.rows; r++) {
        for (var c = 0; c < this.levelDef.cols; c++) {
          var sprite = this.cellSprites[r][c];
          if (!sprite || !sprite.visible) continue;
          sprite.setAlpha(0);
          sprite.y -= 30;
          this.tweens.add({
            targets: sprite,
            alpha: 1, y: self.cellY(r),
            duration: 300,
            delay: (r + c) * 22,
            ease: 'Back.easeOut'
          });
        }
      }
    },
    applyPendingBoosters: function() {
      for (var i = 0; i < this.pendingBoosters.length; i++) {
        var b = this.pendingBoosters[i];
        if (b === 'moves' || b === 'glaze' || b === 'master') this.engine.applyBooster(b);
      }
    },
    buildBoard: function() {
      var rows = this.levelDef.rows;
      var cols = this.levelDef.cols;
      for (var r = 0; r < rows; r++) {
        this.cellSprites[r] = [];
        this.overlaySprites[r] = [];
        this.dropBadges[r] = [];
        this.cellBgs[r] = [];
        for (var c = 0; c < cols; c++) {
          var x = this.cellX(c);
          var y = this.cellY(r);
          var bg = this.add.rectangle(x, y, this.cellSize, this.cellSize, COL.cell, 0.9)
            .setStrokeStyle(1, COL.cellLit, 0.35).setDepth(1);
          var sprite = this.add.image(x, y, 'tile_strawberry')
            .setDisplaySize(this.cellSize - 10, this.cellSize - 10).setDepth(10).setVisible(false);
          var overlay = this.add.image(x, y, 'overlay_flour')
            .setDisplaySize(this.cellSize - 4, this.cellSize - 4).setDepth(15).setVisible(false);
          var badge = this.add.image(x + 14, y + 14, 'overlay_cherry')
            .setDisplaySize(16, 16).setDepth(18).setVisible(false);
          sprite.gridR = r;
          sprite.gridC = c;
          this.cellSprites[r][c] = sprite;
          this.overlaySprites[r][c] = overlay;
          this.dropBadges[r][c] = badge;
          this.cellBgs[r][c] = bg;
        }
      }
    },
    cellX: function(c) {
      return this.boardOriginX + c * (this.cellSize + C.TILE_GAP) + this.cellSize / 2;
    },
    cellY: function(r) {
      return this.boardOriginY + r * (this.cellSize + C.TILE_GAP) + this.cellSize / 2;
    },
    pointerToCell: function(px, py) {
      for (var r = 0; r < this.levelDef.rows; r++) {
        for (var c = 0; c < this.levelDef.cols; c++) {
          if (Math.abs(px - this.cellX(c)) < this.cellSize / 2 && Math.abs(py - this.cellY(r)) < this.cellSize / 2) {
            return { r: r, c: c };
          }
        }
      }
      return null;
    },
    setSelection: function(r, c) {
      this.selected = { r: r, c: c };
      this.selectRing.setVisible(true);
      this.selectRing.setPosition(this.cellX(c), this.cellY(r));
      var sprite = this.cellSprites[r][c];
      if (sprite) this.tweens.add({ targets: sprite, scaleX: 1.1, scaleY: 1.1, duration: 100, yoyo: true });
    },
    clearSelection: function() {
      this.selected = null;
      this.selectRing.setVisible(false);
    },
    attemptSwap: function(r1, c1, r2, c2) {
      var self = this;
      this.busy = true;
      this.clearSelection();
      var s1 = this.cellSprites[r1][c1];
      var s2 = this.cellSprites[r2][c2];
      var x1 = this.cellX(c1), y1 = this.cellY(r1);
      var x2 = this.cellX(c2), y2 = this.cellY(r2);

      this.tweens.add({
        targets: s1, x: x2, y: y2, duration: AN.swapMs, ease: AN.easeSwap
      });
      this.tweens.add({
        targets: s2, x: x1, y: y1, duration: AN.swapMs, ease: AN.easeSwap,
        onComplete: function() {
          var ok = self.engine.trySwap(r1, c1, r2, c2);
          if (!ok) {
            NS.Audio.invalid();
            self.syncSprites(false);
            self.busy = false;
            return;
          }
          NS.Audio.swap();
          self.syncSprites(false);
          self.runStepChain();
        }
      });
    },
    runStepChain: function() {
      var self = this;
      var step = this.engine.nextStep();
      if (step.done) {
        self.finishTurn();
        return;
      }
      if (step.phase === 'pause') {
        this.time.delayedCall(60, function() { self.runStepChain(); });
        return;
      }
      if (step.phase === 'clear') {
        NS.Audio.match();
        if (step.combo > 1) NS.Audio.combo(step.combo);
        if (NS.App.crafting && step.cells) NS.App.crafting.randomDrop(step.cells.length);
        var pending = step.cells.length;
        if (pending === 0) {
          self.time.delayedCall(80, function() { self.runStepChain(); });
          return;
        }
        for (var i = 0; i < step.cells.length; i++) {
          (function(cell) {
            var sprite = self.cellSprites[cell.r][cell.c];
            var ox = self.cellX(cell.c);
            var oy = self.cellY(cell.r);
            if (sprite && sprite.visible) {
              self.particles.emitParticleAt(ox, oy, 5);
              self.tweens.add({
                targets: sprite,
                scaleX: 0, scaleY: 0, alpha: 0,
                angle: Phaser.Math.Between(-40, 40),
                duration: AN.clearMs,
                ease: AN.easeClear,
                onComplete: function() {
                  sprite.setScale(1).setAlpha(1).setAngle(0);
                  pending--;
                  if (pending <= 0) self.time.delayedCall(50, function() { self.runStepChain(); });
                }
              });
            } else {
              pending--;
            }
          })(step.cells[i]);
        }
        if (NS.App.onEngineUpdate) NS.App.onEngineUpdate(this.engine);
        if (this.updateHud) this.updateHud(this.engine);
        return;
      }
      if (step.phase === 'fall') {
        var moves = step.moves || [];
        var spawns = step.spawns || [];
        var animCount = moves.length + spawns.length;
        if (animCount === 0) {
          self.syncSprites(false);
          self.runStepChain();
          return;
        }
        var done = 0;
        function stepDone() {
          done++;
          if (done >= animCount) {
            self.syncSprites(false);
            self.time.delayedCall(40, function() { self.runStepChain(); });
          }
        }
        for (var m = 0; m < moves.length; m++) {
          (function(mv) {
            var sprite = self.cellSprites[mv.fromR][mv.fromC];
            if (!sprite) { stepDone(); return; }
            var dest = self.cellSprites[mv.toR][mv.toC];
            if (dest && dest !== sprite) dest.setVisible(false);
            sprite.setVisible(true).setScale(1).setAlpha(1);
            self.tweens.add({
              targets: sprite,
              x: self.cellX(mv.toC),
              y: self.cellY(mv.toR),
              duration: AN.fallMs + mv.toR * AN.fallStagger,
              ease: AN.easeFall,
              onComplete: stepDone
            });
          })(moves[m]);
        }
        for (var s = 0; s < spawns.length; s++) {
          (function(sp) {
            var sprite = self.cellSprites[sp.r][sp.c];
            if (!sprite) { stepDone(); return; }
            sprite.setTexture(tileTexture(null, sp.tile));
            sprite.setVisible(true);
            sprite.x = self.cellX(sp.c);
            sprite.y = self.cellY(sp.r) - 80;
            sprite.setAlpha(0.85);
            self.tweens.add({
              targets: sprite,
              y: self.cellY(sp.r), alpha: 1,
              duration: AN.spawnMs,
              ease: 'Quad.easeOut',
              onComplete: stepDone
            });
          })(spawns[s]);
        }
        if (NS.App.onEngineUpdate) NS.App.onEngineUpdate(this.engine);
        if (this.updateHud) this.updateHud(this.engine);
      }
    },
    finishTurn: function() {
      var self = this;
      this.syncSprites(false);
      this.busy = false;
      if (this.engine.state === 'won') {
        NS.Audio.win();
        this.cameras.main.flash(200, 200, 180, 120);
        if (NS.App.onLevelWin) NS.App.onLevelWin(this.engine);
      } else if (this.engine.state === 'lost') {
        NS.Audio.lose();
        if (NS.App.onLevelLose) NS.App.onLevelLose(this.engine);
      }
    },
    syncSprites: function() {
      var snap = this.engine.snapshot();
      var g = snap.grid;
      var sz = this.cellSize;
      for (var r = 0; r < this.levelDef.rows; r++) {
        for (var c = 0; c < this.levelDef.cols; c++) {
          var cell = g[r][c];
          var sprite = this.cellSprites[r][c];
          var overlay = this.overlaySprites[r][c];
          var badge = this.dropBadges[r][c];
          if (!sprite) continue;

          var cx = this.cellX(c);
          var cy = this.cellY(r);
          sprite.clearTint().setScale(1).setAlpha(1).setAngle(0);
          sprite.setPosition(cx, cy);
          sprite.gridR = r;
          sprite.gridC = c;
          if (overlay) {
            overlay.setPosition(cx, cy).setVisible(false).setAlpha(1).setScale(1);
          }
          if (badge) {
            badge.setPosition(cx + 14, cy + 14).setVisible(false);
          }

          if (cell.jar) {
            sprite.setVisible(false);
            overlay.setTexture('overlay_jar')
              .setDisplaySize(sz - 6, sz - 6)
              .setPosition(cx, cy)
              .setVisible(true);
          } else if (cell.tile !== null) {
            sprite.setTexture(tileTexture(cell.special, cell.tile)).setVisible(true);
            if (cell.wrapped) {
              overlay.setTexture('overlay_wrap')
                .setDisplaySize(sz * 0.42, sz * 0.42)
                .setPosition(cx + sz * 0.18, cy - sz * 0.18)
                .setVisible(true).setAlpha(0.92);
            } else if (cell.locked) {
              overlay.setTexture('overlay_chain')
                .setDisplaySize(sz * 0.48, sz * 0.48)
                .setPosition(cx, cy)
                .setVisible(true);
            } else if (cell.overlay) {
              var oType = cell.overlay.type;
              var corner = oType === 'flour' || oType === 'glaze' || oType === 'jam';
              overlay.setTexture(overlayTex(oType))
                .setDisplaySize(sz * (corner ? 0.38 : 0.45), sz * (corner ? 0.38 : 0.45))
                .setPosition(corner ? cx - sz * 0.22 : cx, corner ? cy - sz * 0.22 : cy)
                .setVisible(true)
                .setAlpha(oType === 'flour' ? 0.85 : 0.9);
            }
            if (cell.drop && badge) {
              badge.setVisible(true);
            }
          } else {
            sprite.setVisible(false);
            if (cell.overlay && overlay) {
              overlay.setTexture(overlayTex(cell.overlay.type))
                .setDisplaySize(sz * 0.38, sz * 0.38)
                .setPosition(cx - sz * 0.22, cy - sz * 0.22)
                .setVisible(true);
            }
          }
        }
      }
    },
    update: function(time, delta) {
      if (this.engine.useTimer && this.engine.state === 'idle' && !this.busy) {
        this.engine.tickTimer(delta / 1000);
        if (NS.App.onEngineUpdate) NS.App.onEngineUpdate(this.engine);
        if (this.updateHud) this.updateHud(this.engine);
        if (this.engine.state === 'lost') {
          NS.Audio.lose();
          if (NS.App.onLevelLose) NS.App.onLevelLose(this.engine);
        }
      }
    },
    useBooster: function(type) {
      if (this.busy) return false;
      this.busy = true;
      this.engine.applyBooster(type);
      if (this.engine.state === 'resolving') {
        this.runStepChain();
      } else {
        this.busy = false;
      }
      return true;
    }
  });

  NS.Scenes = {
    BootScene: BootScene,
    MapScene: MapScene,
    GameScene: GameScene
  };
})(window.PatisserieLedger);
