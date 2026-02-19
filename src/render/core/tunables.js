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
};

export const WEATHER_TUNABLES = {

  // ---- Cycle timing ----
  CYCLE_DURATION_MS: 10 * 60 * 1000,   // how long each weather "roll" lasts
  CYCLES_PER_DAY: 6,                    // informational, 6 cycles × 10min = 1hr "day"

  // ---- Per region config ----
  // When you add real regions later, just add a key here.
  // rainChance + snowChance + fogChance should sum to <= 1.0; remainder = clear.
  regions: {
    world: {
      rainChance:    1.0,
      snowChance:    0.0,
      fogChance:     0.0,
      rainIntensity: 0.8,
      snowIntensity: 0.6,
      fogIntensity:  0.7,
    },

    // future regions, uncomment when ready:
    // tundra: {
    //   rainChance:    0.1,
    //   snowChance:    0.7,
    //   fogChance:     0.05,
    //   rainIntensity: 0.4,
    //   snowIntensity: 1.0,
    //   fogIntensity:  0.3,
    // },
    // desert: {
    //   rainChance:    0.05,
    //   snowChance:    0.0,
    //   fogChance:     0.02,
    //   rainIntensity: 0.3,
    //   snowIntensity: 0.0,
    //   fogIntensity:  0.2,
    // },
  },
};