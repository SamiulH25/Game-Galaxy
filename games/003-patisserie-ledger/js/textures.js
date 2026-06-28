/**
 * Procedural Phaser textures — SVG overlays fail in WebGL (green missing-texture boxes).
 */
window.PatisserieLedger = window.PatisserieLedger || {};

(function(NS) {
  var COL = NS.Config.COLORS;

  function generateTextures(scene) {
    var g = scene.make.graphics({ add: false, x: 0, y: 0 });

    function done(key) {
      g.generateTexture(key, 64, 64);
      g.clear();
    }

    // --- Special pastries ---
    g.fillStyle(0xffffff, 1);
    g.fillCircle(32, 32, 26);
    g.lineStyle(4, COL.copper, 1);
    g.strokeCircle(32, 32, 26);
    g.lineStyle(3, COL.copper, 0.8);
    g.lineBetween(10, 32, 54, 32);
    done('tile_special_line');

    g.fillStyle(COL.copper, 1);
    g.fillCircle(32, 32, 24);
    g.lineStyle(2, 0x8b5a2b, 1);
    g.strokeCircle(32, 32, 24);
    done('tile_special_bomb');

    g.fillStyle(0xe8dcc8, 1);
    g.fillCircle(32, 32, 24);
    g.lineStyle(3, 0xc9a227, 1);
    g.strokeCircle(32, 32, 24);
    g.fillStyle(0xc9a227, 0.5);
    g.fillCircle(32, 32, 8);
    done('tile_special_color');

    // --- Flour dust (corner puff — pastry stays visible) ---
    g.fillStyle(0xf0e8d8, 0.9);
    g.fillCircle(18, 18, 14);
    g.fillStyle(0xc8b8a0, 0.55);
    for (var i = 0; i < 6; i++) {
      g.fillCircle(10 + (i * 4) % 18, 12 + (i * 3) % 14, 2 + (i % 2));
    }
    g.lineStyle(1, 0xa89880, 0.6);
    g.strokeCircle(18, 18, 14);
    done('overlay_flour');

    // --- Caramel glaze ---
    g.fillStyle(0xc47a4a, 0.45);
    g.fillRoundedRect(8, 8, 48, 48, 6);
    g.lineStyle(2, 0xa06030, 0.7);
    g.strokeRoundedRect(8, 8, 48, 48, 6);
    g.fillStyle(0xffcc88, 0.25);
    g.fillEllipse(32, 24, 28, 12);
    done('overlay_glaze');

    // --- Jam spread ---
    g.fillStyle(0x8b2030, 0.5);
    g.fillRoundedRect(10, 10, 44, 44, 8);
    g.fillStyle(0xb83048, 0.35);
    g.fillCircle(24, 28, 8);
    g.fillCircle(40, 36, 6);
    done('overlay_jam');

    // --- Wax paper wrap (small corner tag) ---
    g.fillStyle(0xfffef5, 0.85);
    g.fillTriangle(8, 8, 36, 8, 8, 36);
    g.lineStyle(1, 0xc4b8a8, 0.9);
    g.lineBetween(8, 8, 36, 8);
    g.lineBetween(8, 8, 8, 36);
    g.lineBetween(14, 14, 30, 22);
    done('overlay_wrap');

    // --- Chain lock ---
    g.fillStyle(0x000000, 0.2);
    g.fillCircle(32, 36, 17);
    g.fillStyle(COL.copper, 1);
    g.fillRoundedRect(23, 31, 18, 13, 3);
    g.lineStyle(3, 0x8b5a2b, 1);
    g.beginPath();
    g.arc(32, 27, 8, Math.PI, 0, false);
    g.strokePath();
    done('overlay_chain');

    // --- Copper jar (blocks cell) ---
    g.fillStyle(0x3d3228, 1);
    g.fillRoundedRect(4, 4, 56, 56, 10);
    g.fillStyle(0x6b5344, 1);
    g.fillRoundedRect(10, 14, 44, 40, 6);
    g.fillStyle(0x8b6914, 0.6);
    g.fillRoundedRect(12, 16, 40, 8, 2);
    g.lineStyle(2, COL.copper, 0.9);
    g.strokeRoundedRect(10, 14, 44, 40, 6);
    done('overlay_jar');

    // --- Cherry drop badge (small) ---
    g.fillStyle(0x000000, 0);
    g.fillRect(0, 0, 64, 64);
    g.fillStyle(0x8b2030, 1);
    g.fillCircle(32, 38, 10);
    g.fillStyle(0xb83048, 0.8);
    g.fillCircle(30, 36, 4);
    g.fillStyle(0x4a3018, 1);
    g.lineBetween(32, 28, 32, 32);
    done('overlay_cherry');

    // --- Crumb particle ---
    g.fillStyle(0xe8dcc8, 0.95);
    g.fillCircle(4, 4, 3);
    done('particle_crumb');

    g.destroy();
  }

  NS.generateTextures = generateTextures;
})(window.PatisserieLedger);
