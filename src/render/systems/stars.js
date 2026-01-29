// src/render/systems/stars.js
import { mulberry32 } from "../core/rng";
import { TUNABLES } from "../core/tunables";

function makeGlowSprite() {
  const s = document.createElement("canvas");
  const size = 32;
  s.width = size;
  s.height = size;
  const g = s.getContext("2d");

  const cx = size / 2;
  const cy = size / 2;

  const grad = g.createRadialGradient(cx, cy, 1, cx, cy, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,0.80)");
  grad.addColorStop(0.35, "rgba(245,245,255,0.28)");
  grad.addColorStop(1, "rgba(245,245,255,0)");

  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return s;
}

function clamp(n, lo, hi) {
  return n < lo ? lo : n > hi ? hi : n;
}

function getStarsTunables() {
  const S = TUNABLES.STARS || {};

  // Safe defaults if you forgot any fields
  return {
    SLOW_AMP_MIN: Number.isFinite(S.SLOW_AMP_MIN) ? S.SLOW_AMP_MIN : 0.03,
    SLOW_AMP_MAX: Number.isFinite(S.SLOW_AMP_MAX) ? S.SLOW_AMP_MAX : 0.09,
    SLOW_SPEED_MIN: Number.isFinite(S.SLOW_SPEED_MIN) ? S.SLOW_SPEED_MIN : 0.03,
    SLOW_SPEED_MAX: Number.isFinite(S.SLOW_SPEED_MAX) ? S.SLOW_SPEED_MAX : 0.09,

    FLUTTER_AMP_MIN: Number.isFinite(S.FLUTTER_AMP_MIN) ? S.FLUTTER_AMP_MIN : 0.01,
    FLUTTER_AMP_MAX: Number.isFinite(S.FLUTTER_AMP_MAX) ? S.FLUTTER_AMP_MAX : 0.02,
    FLUTTER_SPEED_MIN: Number.isFinite(S.FLUTTER_SPEED_MIN) ? S.FLUTTER_SPEED_MIN : 1.4,
    FLUTTER_SPEED_MAX: Number.isFinite(S.FLUTTER_SPEED_MAX) ? S.FLUTTER_SPEED_MAX : 3.6,

    HALO_ALPHA_NORMAL: Number.isFinite(S.HALO_ALPHA_NORMAL) ? S.HALO_ALPHA_NORMAL : 0.18,
    HALO_ALPHA_GLOW: Number.isFinite(S.HALO_ALPHA_GLOW) ? S.HALO_ALPHA_GLOW : 0.55,
  };
}

export function makeStars(seed, count, glowCount, sizeBias = "far") {
  const r = mulberry32(seed);
  const stars = [];
  const WORLD = TUNABLES.WORLD;

  const ST = getStarsTunables();

  // Helper to draw a random in [min, max]
  const rr = (min, max) => min + (max - min) * r();

  for (let i = 0; i < count; i++) {
    const x = r() * WORLD;
    const y = r() * WORLD;

    const roll = r();
    const s =
      sizeBias === "near"
        ? roll < 0.9
          ? 1
          : 2
        : roll < 0.72
        ? 1
        : 2;

    const a = 0.19 + r() * 0.3;
    const tint = 238 + Math.floor(r() * 17);
    const c = `rgb(${tint},${tint},255)`;

    // normal twinkle (kept as-is)
    const twSpeed = 0.45 + r() * 0.95;
    const twPhase = r() * Math.PI * 2;
    const twAmp = 0.05 + r() * 0.09;

    // slow unsynced "breathing" (TUNABLES.STARS)
    const slowSpeed = rr(ST.SLOW_SPEED_MIN, ST.SLOW_SPEED_MAX);
    const slowPhase = r() * Math.PI * 2;
    const slowAmp = rr(ST.SLOW_AMP_MIN, ST.SLOW_AMP_MAX);

    // micro flutter (TUNABLES.STARS)
    const flSpeed = rr(ST.FLUTTER_SPEED_MIN, ST.FLUTTER_SPEED_MAX);
    const flPhase = r() * Math.PI * 2;
    const flAmp = rr(ST.FLUTTER_AMP_MIN, ST.FLUTTER_AMP_MAX);

    stars.push({
      x,
      y,
      s,
      a,
      c,
      glow: false,
      twSpeed,
      twPhase,
      twAmp,
      slowSpeed,
      slowPhase,
      slowAmp,
      flSpeed,
      flPhase,
      flAmp,
    });
  }

  for (let i = 0; i < glowCount; i++) {
    const x = r() * WORLD;
    const y = r() * WORLD;

    const a = 0.36 + r() * 0.22;

    // glow stars twinkle slower (kept as-is)
    const twSpeed = 0.22 + r() * 0.55;
    const twPhase = r() * Math.PI * 2;
    const twAmp = 0.06 + r() * 0.10;

    // glow stars breathe a touch more: bias toward higher end of your ranges
    const slowSpeed = rr(ST.SLOW_SPEED_MIN, ST.SLOW_SPEED_MAX);
    const slowPhase = r() * Math.PI * 2;
    const slowAmp = rr(
      ST.SLOW_AMP_MIN + (ST.SLOW_AMP_MAX - ST.SLOW_AMP_MIN) * 0.35,
      ST.SLOW_AMP_MAX
    );

    const flSpeed = rr(ST.FLUTTER_SPEED_MIN, ST.FLUTTER_SPEED_MAX);
    const flPhase = r() * Math.PI * 2;
    const flAmp = rr(
      ST.FLUTTER_AMP_MIN + (ST.FLUTTER_AMP_MAX - ST.FLUTTER_AMP_MIN) * 0.35,
      ST.FLUTTER_AMP_MAX
    );

    stars.push({
      x,
      y,
      s: 1,
      a,
      c: "rgb(245,245,255)",
      glow: true,
      twSpeed,
      twPhase,
      twAmp,
      slowSpeed,
      slowPhase,
      slowAmp,
      flSpeed,
      flPhase,
      flAmp,
    });
  }

  return stars;
}

export function createStarSystem() {
  const glowSprite = makeGlowSprite();
  const ST = getStarsTunables();

  function drawStars(
    ctx,
    stars,
    { scale, t, camX, camY, w, h, layerAlphaMult = 1, isFarLayer }
  ) {
    const WORLD = TUNABLES.WORLD;

    const ox = ((camX * scale) % WORLD + WORLD) % WORLD;
    const oy = ((camY * scale) % WORLD + WORLD) % WORLD;

    for (const st of stars) {
      let x = st.x - ox;
      let y = st.y - oy;
      if (x < 0) x += WORLD;
      if (y < 0) y += WORLD;

      const sx = (x / WORLD) * w;
      const sy = (y / WORLD) * h;

      const tw = 1 + Math.sin(t * st.twSpeed + st.twPhase) * st.twAmp;
      const slow = 1 + Math.sin(t * st.slowSpeed + st.slowPhase) * st.slowAmp;
      const fl = 1 + Math.sin(t * st.flSpeed + st.flPhase) * st.flAmp;

      // independent pulse factor (never synced unless you reintroduce global multipliers)
      const pulse = tw * slow * fl;

      // base alpha for dot
      const alpha = clamp(st.a * pulse, 0, 1) * layerAlphaMult;

      // --- subtle glow for EVERY star ---
      const haloBase = st.glow ? (isFarLayer ? 9 : 6) : (isFarLayer ? 4 : 3);
      const haloSize = haloBase * (0.92 + (pulse - 1) * 2.0);

      // Use tunables for halo strength
      const haloScale = st.glow ? ST.HALO_ALPHA_GLOW : ST.HALO_ALPHA_NORMAL;
      const haloAlpha = clamp(alpha * haloScale, 0, 1);

      // Halo (additive)
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = haloAlpha;
      ctx.drawImage(
        glowSprite,
        sx - haloSize / 2,
        sy - haloSize / 2,
        haloSize,
        haloSize
      );
      ctx.restore();

      // Core dot
      ctx.globalAlpha = alpha;
      ctx.fillStyle = st.c;
      ctx.fillRect(sx, sy, st.s, st.s);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  return { drawStars };
}
