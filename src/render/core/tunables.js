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
    COUNT: 8,
    ALPHA_MIN: 0.018,
    ALPHA_MAX: 0.16,

    SIZE_MIN: 308,
    SIZE_MAX: 1200,

    SPEED_MIN: 10,
    SPEED_MAX: 28.2,

    PUFFS_MIN: 5,
    PUFFS_MAX: 12,

    HOLES_MIN: 3,
    HOLES_MAX: 10,

    BUF_BLUR_PX: 1.35,
    CONTRAST_WASH: 0.055,

    DRAW_BLUR_PX: 0,
    DRAW_JITTER_PX: 6.0,
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
