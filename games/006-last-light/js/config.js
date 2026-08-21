/**
 * Last Light — config.js
 * All tunable constants: world geometry, beam, ships, fog/storm bands, scoring.
 * No DOM, no canvas — pure data.
 */
window.LastLight = window.LastLight || {};

window.LastLight.Config = {
  SAVE_KEY: 'lastlight_save',
  SAVE_VERSION: 1,

  // --- World geometry (unit circle; origin = lighthouse rock; angle 0 = due east) ---
  WORLD_R: 1.0,          // playfield radius; beyond +LOST_MARGIN = gone to open sea
  LOST_MARGIN: 0.06,
  REEF_R: 0.74,          // reef ring radius
  REEF_BAND: 0.045,      // reef collision half-width
  GAP_HALF: 0.13,        // harbor gap half-angle (rad) at due east
  ISLAND_R: 0.075,       // lighthouse rock radius
  FANG_RMIN: 0.30,       // inner-rocks annulus
  FANG_RMAX: 0.55,
  FANG_MAX: 5,
  FANG_CLEARANCE: 0.12,  // min distance from live ships when activating a fang mid-night

  // --- Beam ---
  BEAM_HALF: 0.21,       // cone half-angle (rad)
  BEAM_FOCUS_MULT: 0.45, // focused cone width multiplier
  BEAM_REACH: 1.06,      // beam length (world units)
  WAKE_NORMAL: 2.0,      // wake memory after leaving the beam (s)
  WAKE_FOCUSED: 4.0,     // wake memory while focused (s)

  // --- Night ---
  LANTERNS: 3,
  KEY_TURN: 2.4,         // keyboard aim rotation speed (rad/s)
  TOUCH_AIM_SENS: 0.005, // rad per px of drag

  // --- Storm surge ---
  STORM_GAP_MIN: 55,     // seconds between surges
  STORM_GAP_MAX: 75,
  STORM_WARN: 4,
  STORM_DUR: 12,
  LIGHTNING_DUR: 0.4,
  LIGHTNINGS_PER_STORM: 2,

  // --- Fog ---
  FOG_PERIOD: 34,        // seconds per thick-thin cycle

  // --- Scoring ---
  COMBO_STEP: 0.1,
  COMBO_CAP: 3.0,
  STORM_BONUS: 50,
  GHOST_GRACE: 150,
  MILESTONES: [5, 8],
  LEGEND_SCORE: 5000,

  // --- Spawning ---
  SPAWN_R_MIN: 0.94,
  SPAWN_R_MAX: 1.0,
  SPAWN_JITTER: 0.15,    // spawn interval jitter (fraction)
  GHOST_FROM_MIN: 180,   // ghost ships watch from 3:00 onward
  GHOST_GAP_MIN: 40,
  GHOST_GAP_MAX: 70,

  SHIPS: {
    cog:   { name: 'Cog',             hull: 'cog',   drift: 0.030, speed: 0.062, turn: 1.7,  r: 0.016, wakeNeed: 0,   points: 100, hue: '#b8c4d6' },
    sloop: { name: 'Messenger Sloop', hull: 'sloop', drift: 0.034, speed: 0.092, turn: 2.7,  r: 0.012, wakeNeed: 0,   points: 180, hue: '#8fd0c8' },
    barge: { name: 'Ember Barge',     hull: 'barge', drift: 0.024, speed: 0.046, turn: 0.85, r: 0.026, wakeNeed: 2.5, points: 400, hue: '#e0803c' },
    ghost: { name: 'Ghost Ship',      hull: 'ghost', drift: 0.075, speed: 0.075, turn: 1.2,  r: 0.020, wakeNeed: 0,   points: 0,   hue: '#9fb4c4' },
  },

  // Minute-banded escalation. `types` is a weighted spawn bag; fangs activate safely mid-night.
  BANDS: [
    { untilMin: 2,        spawnEvery: 7.0, fogBase: 0.14, fogAmp: 0.10, fangs: 3, driftMult: 1.00, windPower: 0.030, types: ['cog', 'cog', 'cog'] },
    { untilMin: 4,        spawnEvery: 5.5, fogBase: 0.22, fogAmp: 0.36, fangs: 4, driftMult: 1.00, windPower: 0.038, types: ['cog', 'cog', 'sloop'] },
    { untilMin: 6,        spawnEvery: 4.5, fogBase: 0.30, fogAmp: 0.46, fangs: 5, driftMult: 1.08, windPower: 0.046, types: ['cog', 'sloop', 'sloop', 'barge'] },
    { untilMin: Infinity, spawnEvery: 3.5, fogBase: 0.44, fogAmp: 0.40, fangs: 5, driftMult: 1.22, windPower: 0.056, types: ['cog', 'sloop', 'sloop', 'barge', 'barge'] },
  ],

  // --- Palette anchors (renderer mirrors these) ---
  ACCENT: '#e8a838',
  PIER_GREEN: '#57c785',
  PIER_RED: '#e06a5a',
};
