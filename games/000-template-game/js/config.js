/**
 * Tunable game constants — edit these when building your real game.
 */
window.GalaxyTemplate = window.GalaxyTemplate || {};

window.GalaxyTemplate.Config = {
  WIN_SCORE: 300,
  START_LIVES: 3,
  /** Normalized horizontal speed (0–1 playfield units per second). */
  PLAYER_SPEED: 0.82,
  ORB_VALUE: 25,
  HAZARD_DESTROY_VALUE: 15,
  ORB_SPAWN_INTERVAL: 0.9,
  HAZARD_SPAWN_INTERVAL: 1.4,
  DIFFICULTY_RAMP: 0.02,
  /** Upward bullet speed in normalized units per second. */
  BULLET_SPEED: 1.35,
  /** Seconds between shots. */
  FIRE_COOLDOWN: 0.22,
  ACCENT: '#44dd88',
  ACCENT_GLOW: 'rgba(68, 221, 136, 0.55)'
};
