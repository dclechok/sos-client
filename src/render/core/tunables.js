// Central tunables for background rendering.
// This is intentionally verbose so you can tweak "feel" without hunting through code.

export const OCEAN_GLISTEN = {
  ENABLED:       true,
  ALPHA_MAX:     0.5,    // peak opacity of each dot
  SPEED:         1.0,    // twinkle speed multiplier
  COVERAGE:      0.4,    // fraction of candidate dots that are active (0-1)
  DOTS_PER_TILE:     3,      // candidate dot positions checked per tile — raise for denser shimmer
  POSITION_INTERVAL: 0.8,   // seconds before dot positions reshuffle — lower = more chaotic
  COLOR:         "49,141,178",
};

export const TUNABLES = {
  // Virtual wrap space (stars/dust/nebula positions wrap within this range)
  WORLD: 7000,

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
      rainChance:    0.5,
      snowChance:    0.2,
      fogChance:     0.1,
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