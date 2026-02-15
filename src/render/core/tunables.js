// Central tunables for background rendering.
// This is intentionally verbose so you can tweak "feel" without hunting through code.

export const TUNABLES = {
  // Virtual wrap space (stars/dust/nebula positions wrap within this range)
  WORLD: 7000,

  // Parallax scales (higher = moves more relative to camera)
  SCALES: {
    FAR: 0.616,
    DUST: 0.953,
    NEBULA: 0.374,
    NEAR: 2.949,
  },

  // Camera smoothing (higher = tighter follow)
  CAMERA_FOLLOW: 18,

  // Cap DPR for perf
  DPR_CAP: 1.25,

  // Dust
  DUST: {
    COUNT: 750,
    ALPHA: 0.1,
    JITTER_PX: 6,
  },

  // Nebula pockets
NEBULA: {
  CELL_SIZE: 2400,
  PAD: 3400,            // slightly more = fewer edge “reveals”
  CULL_EXTRA: 1400,     // more hysteresis = less popping / hard boundaries

  BLOBS_MIN: 3,         // a bit denser
  BLOBS_MAX: 7,

  // Keep these as your "sprite resolution" sizes (good already)
  SPRITE_MIN: 650,
  SPRITE_MAX: 1900,

  // Make them LOOK bigger without heavier sprite cache
  SIZE_MULT: 2.35,      // try 1.25–1.55

  TILE_SIZE: 1024,
  TILE_COUNT: 6,        // more variety helps avoid repeating patterns

  MASK_PUFFS: 6,        // more puffs = less circular blobs
  MASK_HOLES: 1,

  ALPHA_BASE: 0.52,     // slightly down from 0.45 to avoid “solid stamps”
  ALPHA_RANGE: 0.34,

  FADE_IN: 0.85,
  FADE_OUT: 0.80,

  COMPOSITE: "screen",  // keep

  // This is your line/banding killer:
  POST_MASK_BLUR_PX: 3.0,   // try 2.8–3.4

  // Visibility / density:
  ALPHA_MULT: 1.20,     // try 1.15–1.35

  DRIFT_MULT: 0.04,

  // Break circle motif:
  STRETCH_MIN: 0.70,
  STRETCH_MAX: 2.05,
},


  STARS: {
    SLOW_AMP_MIN: 0.04,
    SLOW_AMP_MAX: 0.20,
    SLOW_SPEED_MIN: 0.05,
    SLOW_SPEED_MAX: 0.75,

    FLUTTER_AMP_MIN: 0.01,
    FLUTTER_AMP_MAX: 0.19,
    FLUTTER_SPEED_MIN: 1.0,
    FLUTTER_SPEED_MAX: 3.0,

    // give every star a tiny halo so the pulse is visible
    HALO_ALPHA_NORMAL: 0.22,
    HALO_ALPHA_GLOW: 0.65,
    // Brightness multiplier for the FAR star layer only
    FAR_LAYER_BRIGHTNESS: 1.25,

  },


  // Meteors (screen-space shooting stars)
  METEORS: {
  ENABLED: true,

  // Spawn VERY frequently so RNG can't hide them
  RATE_PER_SEC: 0.0045,      // 1-2 within 1-2 minutes, or none for 5-6 minutes

  // Allow several on screen
  MAX_ACTIVE: 8,

  // Long streaks so they’re unmistakable
  LEN_MIN: 60,
  LEN_MAX: 140,

  // Slower = easier to see
  SPEED_MIN: 180,
  SPEED_MAX: 320,

  // Stay alive longer
  LIFETIME: 1.8,

  // BRIGHT
  ALPHA: 0.25,
  },
};
