/**
 * Patisserie Ledger — constants, tile names, chapters.
 */
window.PatisserieLedger = window.PatisserieLedger || {};

(function(NS) {
  var TILE_KEYS = ['strawberry', 'lemon', 'chocolate', 'blueberry', 'vanilla', 'raspberry'];
  var TILE_LABELS = ['Strawberry', 'Lemon', 'Chocolate', 'Blueberry', 'Vanilla', 'Raspberry'];

  var CHAPTERS = [
    { id: 1, name: 'Front Counter', subtitle: 'Morning prep & simple orders', unlockStars: 0 },
    { id: 2, name: 'Morning Oven', subtitle: 'Glaze, flour, and rising heat', unlockStars: 24 },
    { id: 3, name: 'Rush Service', subtitle: 'Timed tickets and spreading jam', unlockStars: 54 },
    { id: 4, name: "Master's Table", subtitle: 'The full pastry repertoire', unlockStars: 90 }
  ];

  NS.Config = {
    GAME_WIDTH: 480,
    GAME_HEIGHT: 720,
    GRID_ROWS: 8,
    GRID_COLS: 8,
    TILE_SIZE: 56,
    TILE_GAP: 4,
    TILE_COUNT: 6,
    TILE_KEYS: TILE_KEYS,
    TILE_LABELS: TILE_LABELS,
    CHAPTERS: CHAPTERS,
    LEVELS_PER_CHAPTER: 15,
    TOTAL_LEVELS: 60,
    INGREDIENT_DROP_CHANCE: 0.14,
    JAM_SPREAD_INTERVAL: 3,
    STAR_TWO_RATIO: 0.25,
    STAR_THREE_RATIO: 0.5,
    SCORE_PER_TILE: 60,
    SCORE_COMBO_BONUS: 40,
    BOOSTER_TYPES: ['whisk', 'rolling', 'sugar', 'moves', 'mitt', 'proof', 'glaze', 'master'],

    COLORS: {
      bg: 0x2a2218,
      bgWarm: 0x352c24,
      board: 0x3d342c,
      cell: 0x524840,
      cellLit: 0x625850,
      copper: 0xb87333,
      cream: 0xe8dcc8,
      ink: 0x1a1510,
      path: 0x6b5344,
      pathLit: 0x9a7b5a
    },

    ANIM: {
      swapMs: 140,
      clearMs: 220,
      fallMs: 280,
      fallStagger: 28,
      spawnMs: 260,
      easeSwap: 'Quad.easeInOut',
      easeFall: 'Bounce.easeOut',
      easeClear: 'Back.easeIn'
    }
  };

  NS.GameStates = {
    MENU: 'menu',
    MAP: 'map',
    PLAYING: 'playing',
    PAUSED: 'paused',
    WIN: 'win',
    LOSE: 'lose',
    PANTRY: 'pantry'
  };
})(window.PatisserieLedger);
