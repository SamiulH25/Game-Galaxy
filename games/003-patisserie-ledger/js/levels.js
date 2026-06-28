/**
 * Sixty campaign levels across four bakery districts.
 */
window.PatisserieLedger = window.PatisserieLedger || {};

(function(NS) {
  var C = NS.Config;
  var TILE_KEYS = C.TILE_KEYS;

  var LEVEL_NAMES = {
    1: ['First Fold', 'Butter Curl', 'Dusting Station', 'Tray Set', 'Simple Tart', 'Morning Roll', 'Sugar Rim', 'Cooling Rack', 'Window Display', 'Apron On', 'Bench Scrape', 'Warm Milk', 'Soft Dough', 'Counter Wipe', 'Open Sign'],
    2: ['Oven Light', 'Proof Box', 'Glaze Brush', 'Caramel Edge', 'Rack Rotation', 'Steam Burst', 'Copper Bowl', 'Yeast Bloom', 'Shelf Stack', 'Paper Liner', 'Timer Tick', 'Batch Two', 'Crust Crack', 'Filling Pipe', 'Golden Top'],
    3: ['Ticket Rail', 'Rush Ticket', 'Line Out', 'Hot Slot', 'Jam Spread', 'Quick Fold', 'Express Glaze', 'Service Bell', 'To-Go Box', 'Last Call', 'Speed Pipe', 'Flash Bake', 'Counter Rush', 'Ticket Stack', 'Closing Wave'],
    4: ['Tasting Spoon', 'Recipe Card', 'Fine Sieve', 'Layer Cut', 'Sugar Torch', 'Chef Table', 'Final Garnish', 'Signature Set', 'Ledger Entry', 'House Blend', 'Velvet Crumb', 'Master Glaze', 'Grand Service', 'Copper Crown', 'Final Service']
  };

  function levelId(chapter, index) {
    return chapter + '-' + (index + 1);
  }

  function scatterObstacles(rows, cols, type, count, hp, occupied) {
    var list = [];
    occupied = occupied || {};
    var tries = 0;
    while (list.length < count && tries < 500) {
      tries++;
      var r = Math.floor(Math.random() * rows);
      var c = Math.floor(Math.random() * cols);
      var key = r + ',' + c;
      if (occupied[key]) continue;
      occupied[key] = true;
      list.push({ r: r, c: c, type: type, hp: hp || 1 });
    }
    return list;
  }

  var OB_PRIORITY = { jar: 5, chain: 4, wrap: 3, glaze: 3, jam: 2, flour: 2, drop: 1 };

  function mergeObstacles() {
    var flat = [];
    for (var a = 0; a < arguments.length; a++) {
      flat = flat.concat(arguments[a]);
    }
    flat.sort(function(x, y) {
      return (OB_PRIORITY[y.type] || 0) - (OB_PRIORITY[x.type] || 0);
    });
    var used = {};
    var out = [];
    for (var i = 0; i < flat.length; i++) {
      var ob = flat[i];
      var k = ob.r + ',' + ob.c;
      if (used[k]) continue;
      used[k] = true;
      out.push(ob);
    }
    return out;
  }

  function ringObstacles(rows, cols, type, hp) {
    var list = [];
    for (var c = 1; c < cols - 1; c++) list.push({ r: 1, c: c, type: type, hp: hp || 1 });
    return list;
  }

  function buildLevel(chapter, index) {
    var num = index + 1;
    var global = (chapter - 1) * C.LEVELS_PER_CHAPTER + num;
    var rows = 8;
    var cols = 8;
    var name = (LEVEL_NAMES[chapter] && LEVEL_NAMES[chapter][index]) || ('Level ' + num);
    var obstacles = [];
    var objectives = [];
    var moves = 28 - Math.floor(global / 12);
    var time = 0;
    var drops = [];

    if (chapter === 1) {
      if (num <= 5) {
        objectives = [{ type: 'score', target: 800 + num * 200 }];
        moves = 30 - num;
      } else if (num <= 10) {
        objectives = [
          { type: 'score', target: 1200 + num * 150 },
          { type: 'collect', tile: num % 6, target: 8 + num % 4 }
        ];
        obstacles = scatterObstacles(rows, cols, 'flour', 4 + num % 3, 1);
      } else {
        objectives = [
          { type: 'clear_overlay', overlay: 'flour' },
          { type: 'score', target: 1500 + num * 100 }
        ];
        obstacles = scatterObstacles(rows, cols, 'flour', 8 + num % 4, 1);
        if (num % 3 === 0) obstacles = obstacles.concat(scatterObstacles(rows, cols, 'chain', 2, 1));
      }
    } else if (chapter === 2) {
      objectives = [{ type: 'score', target: 1800 + num * 120 }];
      obstacles = scatterObstacles(rows, cols, 'flour', 5 + num % 5, 1);
      if (num > 4) obstacles = obstacles.concat(scatterObstacles(rows, cols, 'glaze', 3 + num % 4, 2));
      if (num > 8) obstacles = obstacles.concat(scatterObstacles(rows, cols, 'wrap', 2 + num % 3, 1));
      if (num % 4 === 0) {
        objectives.push({ type: 'collect', tile: num % 6, target: 12 });
      }
      if (num === 15) {
        objectives = [
          { type: 'clear_overlay', overlay: 'flour' },
          { type: 'score', target: 3500 }
        ];
        obstacles = ringObstacles(rows, cols, 'glaze', 2).concat(scatterObstacles(rows, cols, 'flour', 10, 1));
      }
      moves = 26 - Math.floor(num / 4);
    } else if (chapter === 3) {
      time = 75 + (15 - num) * 3;
      moves = 0;
      if (num % 3 === 0) {
        objectives = [
          { type: 'fill', target: 100, rate: 10 },
          { type: 'score', target: 2000 + num * 80 }
        ];
      } else if (num % 3 === 1) {
        objectives = [
          { type: 'drop', target: 3 + num % 4 },
          { type: 'score', target: 1800 + num * 90 }
        ];
        drops = scatterObstacles(3, cols, 'drop', 2 + num % 3, 1).map(function(d) {
          return { r: 1 + num % 3, c: d.c };
        });
      } else {
        var orderTileA = TILE_KEYS[num % 6];
        var orderTileB = TILE_KEYS[(num + 2) % 6];
        objectives = [{
          type: 'order',
          counts: {},
          _progress: {}
        }];
        objectives[0].counts[orderTileA] = 6 + num % 3;
        objectives[0].counts[orderTileB] = 5 + num % 4;
      }
      obstacles = scatterObstacles(rows, cols, 'jam', 2 + num % 3, 1);
      if (num > 6) obstacles = obstacles.concat(scatterObstacles(rows, cols, 'glaze', 4, 2));
      if (num > 10) obstacles = obstacles.concat(scatterObstacles(rows, cols, 'chain', 3, 1));
    } else {
      moves = 22 - Math.floor(num / 5);
      if (num <= 5) {
        objectives = [
          { type: 'score', target: 3000 + num * 200 },
          { type: 'clear_overlay', overlay: 'glaze' }
        ];
        obstacles = scatterObstacles(rows, cols, 'glaze', 8, 2).concat(scatterObstacles(rows, cols, 'jar', 2, 2));
      } else if (num <= 10) {
        objectives = [
          { type: 'order', counts: {}, _progress: {} },
          { type: 'drop', target: 5 }
        ];
        objectives[0].counts[TILE_KEYS[num % 6]] = 10;
        objectives[0].counts[TILE_KEYS[(num + 3) % 6]] = 8;
        obstacles = scatterObstacles(rows, cols, 'jar', 3, 2)
          .concat(scatterObstacles(rows, cols, 'wrap', 4, 1))
          .concat(scatterObstacles(rows, cols, 'chain', 3, 1));
        drops = [{ r: 2, c: 3 }, { r: 2, c: 5 }];
      } else if (num < 15) {
        objectives = [
          { type: 'fill', target: 100, rate: 8 },
          { type: 'clear_overlay', overlay: 'flour' },
          { type: 'score', target: 4000 + num * 150 }
        ];
        obstacles = scatterObstacles(rows, cols, 'flour', 12, 1)
          .concat(scatterObstacles(rows, cols, 'jam', 4, 1))
          .concat(scatterObstacles(rows, cols, 'glaze', 6, 2));
        if (num % 2 === 0) time = 90;
      } else {
        objectives = [
          { type: 'score', target: 6000 },
          { type: 'clear_overlay', overlay: 'flour' },
          { type: 'drop', target: 6 }
        ];
        obstacles = mergeObstacles(
          scatterObstacles(rows, cols, 'flour', 6, 1),
          scatterObstacles(rows, cols, 'chain', 2, 1),
          scatterObstacles(rows, cols, 'jar', 2, 2)
        );
        drops = [{ r: 1, c: 2 }, { r: 1, c: 5 }, { r: 2, c: 3 }];
        moves = 30;
      }
    }

    if (moves < 14) moves = 14;
    if (moves > 0 && moves < 18 && chapter >= 3) moves = 18;

    obstacles = mergeObstacles(obstacles);

    return {
      id: levelId(chapter, index),
      chapter: chapter,
      index: index,
      global: global,
      name: name,
      rows: rows,
      cols: cols,
      moves: moves,
      time: time,
      objectives: objectives,
      obstacles: obstacles,
      drops: drops
    };
  }

  var ALL_LEVELS = [];
  for (var ch = 1; ch <= 4; ch++) {
    for (var i = 0; i < C.LEVELS_PER_CHAPTER; i++) {
      ALL_LEVELS.push(buildLevel(ch, i));
    }
  }

  function getLevel(id) {
    for (var i = 0; i < ALL_LEVELS.length; i++) {
      if (ALL_LEVELS[i].id === id) return ALL_LEVELS[i];
    }
    return ALL_LEVELS[0];
  }

  function getLevelByGlobal(n) {
    return ALL_LEVELS[Math.max(0, Math.min(ALL_LEVELS.length - 1, n - 1))];
  }

  NS.Levels = ALL_LEVELS;
  NS.getLevel = getLevel;
  NS.getLevelByGlobal = getLevelByGlobal;
})(window.PatisserieLedger);
