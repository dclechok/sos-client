// src/render/systems/nebula/nebulaSystem.js
import { mulberry32 } from "../../core/rng";
import { TUNABLES } from "../../core/tunables";
import { makeSeamlessNebulaTile } from "./nebulaTile";
import { getNebulaMask } from "./nebulaMaskCache";

export function createNebulaSystem(worldSeed) {
  const WORLD = TUNABLES.WORLD;
  const N = TUNABLES.NEBULA;

  // More subtle palette variety (still deterministic by seed)
  const TILE_COUNT = 8;
  const gasTiles = Array.from({ length: TILE_COUNT }, (_, i) =>
    makeSeamlessNebulaTile({
      size: 1024,
      seed: (worldSeed ^ (0x0a11ce + i * 0x9e3779b9)) >>> 0,
    })
  );

  const nebulaRand = mulberry32((worldSeed ^ 0x77777777) >>> 0);
  const randRange = (a, b) => a + (b - a) * nebulaRand();

  let nebulae = [];
  let didInit = false;

  // Track viewport only for optional rebakes
  let lastW = 0;
  let lastH = 0;

  // --- Wrapping helpers ---
  const wrap01 = (v) => ((v % WORLD) + WORLD) % WORLD; // [0..WORLD)
  const wrapDelta = (d) => {
    // shortest wrapped delta in [-WORLD/2 .. WORLD/2]
    d = ((d + WORLD * 0.5) % WORLD + WORLD) % WORLD; // [0..WORLD)
    return d - WORLD * 0.5;
  };

  function buildPuffLayout(maskSeed, puffCount, size) {
    const rr = mulberry32(maskSeed ^ 0x9e3779b9);
    const layout = [];
    for (let i = 0; i < puffCount; i++) {
      const sx = 0.55 + rr() * 0.55;
      const sy = 0.55 + rr() * 0.55;
      const ox = (rr() - 0.5) * size * 0.55;
      const oy = (rr() - 0.5) * size * 0.55;
      const a = 0.55 + rr() * 0.35;
      layout.push({ sx, sy, ox, oy, a });
    }
    return layout;
  }

  function ensureCloudCanvas(cloud, size) {
    if (cloud.buf && cloud.bufSize === size) return;

    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;

    const cctx = c.getContext("2d");
    cctx.imageSmoothingEnabled = true;

    cloud.buf = c;
    cloud.bufCtx = cctx;
    cloud.bufSize = size;
    cloud.puffLayout = buildPuffLayout(cloud.maskSeed, cloud.puffCount, size);
    cloud.baked = false;
  }

  // Create/cache a repeating pattern per cloud (per tile)
  function ensurePattern(cctx, cloud) {
    if (!cloud._pattern || cloud._patternSrc !== cloud.tile) {
      cloud._pattern = cctx.createPattern(cloud.tile, "repeat");
      cloud._patternSrc = cloud.tile;
    }
  }

  // Fill rect with repeating pattern in a way that honors offsets
  function fillWithPattern(cctx, cloud, x, y, w, h) {
    ensurePattern(cctx, cloud);
    cctx.save();
    cctx.translate(x, y);
    cctx.fillStyle = cloud._pattern;
    cctx.fillRect(-x, -y, w, h);
    cctx.restore();
  }

  function rebuildNebulaTextureOnce(cloud) {
    const r = cloud.r;
    const size = Math.ceil(r * 2);

    ensureCloudCanvas(cloud, size);

    const cctx = cloud.bufCtx;
    cctx.setTransform(1, 0, 0, 1, 0, 0);
    cctx.clearRect(0, 0, size, size);

  // Snap pattern origin to whole pixels to prevent repeat seam sampling
  const jx = (cloud.bakeJx + 0.5) | 0;
  const jy = (cloud.bakeJy + 0.5) | 0;


    // -------------------------------------------------------
    // Base tile + puffs (REPEATING PATTERN — fixes seams/lines)
    // -------------------------------------------------------
    cctx.globalCompositeOperation = "source-over";
    cctx.globalAlpha = 1;

    // Base fill
    fillWithPattern(cctx, cloud, jx, jy, size, size);

    // Puff layers (scaled pattern patches)
    const layout = cloud.puffLayout;
    for (let i = 0; i < layout.length; i++) {
      const p = layout[i];

      cctx.save();
      cctx.globalAlpha = p.a;

      // Draw a scaled “patch” using the same repeating pattern
      // We scale the canvas, then fill with the pattern in that scaled space.
      const px = ((jx + p.ox) + 0.5) | 0;
      const py = ((jy + p.oy) + 0.5) | 0;

      cctx.translate(px, py);
      cctx.scale(p.sx, p.sy);

      ensurePattern(cctx, cloud);
      cctx.fillStyle = cloud._pattern;

      // Fill enough area to cover buffer after scaling
      cctx.fillRect(-px / p.sx, -py / p.sy, size / p.sx, size / p.sy);

      cctx.restore();
    }

    // -------------------
    // Mask (same as before)
    // -------------------
    cctx.globalCompositeOperation = "destination-in";
    cctx.globalAlpha = 1;
    const mask = getNebulaMask(size, cloud.maskSeed, cloud.puffCount, cloud.holeCount);
    cctx.drawImage(mask, 0, 0);

  // -------------------------
  // Buffer soften (beauty step)
  // -------------------------
  cctx.globalCompositeOperation = "source-over";
  cctx.globalAlpha = 1;

  if (N.BUF_BLUR_PX > 0) {
    // IMPORTANT: don't draw canvas onto itself with a filter (can create seams)
    const tmp = document.createElement("canvas");
    tmp.width = size;
    tmp.height = size;
    const tctx = tmp.getContext("2d");

    tctx.imageSmoothingEnabled = true;
    tctx.filter = `blur(${N.BUF_BLUR_PX}px)`;
    tctx.drawImage(cloud.buf, 0, 0);
    tctx.filter = "none";

    cctx.setTransform(1, 0, 0, 1, 0, 0);
    cctx.clearRect(0, 0, size, size);
    cctx.drawImage(tmp, 0, 0);
  }


    // -----------------------------
    // Micro-contrast wash (original)
    // -----------------------------
    cctx.globalCompositeOperation = "source-atop";
    cctx.globalAlpha = N.CONTRAST_WASH;
    cctx.fillStyle = "black";
    cctx.fillRect(0, 0, size, size);

    cctx.globalAlpha = 1;
    cctx.globalCompositeOperation = "source-over";

    cloud.baked = true;
  }

  // ---- Spawn nebula world ONCE at game launch ----
  function init({ w = 1920, h = 1080 } = {}) {
    if (didInit) return;
    didInit = true;

    lastW = w | 0;
    lastH = h | 0;

    // Keep your original sizing behavior (screen-feel), but do it ONCE.
    const sMin = Math.max(260, Math.min(N.SIZE_MIN, Math.min(w, h) * 0.55));
    const sMax = Math.max(sMin + 160, Math.min(N.SIZE_MAX, Math.max(w, h) * 1.2));

    for (let i = 0; i < N.COUNT; i++) {
      const r = randRange(sMin, sMax);
      const ang = randRange(0, Math.PI * 2);
      const spd = randRange(N.SPEED_MIN, N.SPEED_MAX);

      const puffCount =
        (N.PUFFS_MIN + Math.floor(nebulaRand() * (N.PUFFS_MAX - N.PUFFS_MIN + 1))) | 0;

      const holeCount =
        (N.HOLES_MIN + Math.floor(nebulaRand() * (N.HOLES_MAX - N.HOLES_MIN + 1))) | 0;

      const maskSeed = (worldSeed ^ (i * 2654435761)) >>> 0;

      const bakeRand = mulberry32(maskSeed ^ 0x1234abcd);
      const bakeJx = (bakeRand() - 0.5) * 18;
      const bakeJy = (bakeRand() - 0.5) * 18;

      const phase = randRange(0, Math.PI * 2);

      nebulae.push({
        // World-space position (exists always)
        wx: randRange(0, WORLD),
        wy: randRange(0, WORLD),

        r,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        a: randRange(N.ALPHA_MIN, N.ALPHA_MAX),

        tile: gasTiles[(nebulaRand() * gasTiles.length) | 0],

        phase,
        breathe: randRange(0.02, 0.05),
        jitterSpeed: randRange(0.12, 0.28),
        jitterAmp: randRange(N.DRAW_JITTER_PX * 0.5, N.DRAW_JITTER_PX),

        maskSeed,
        puffCount,
        holeCount,

        buf: null,
        bufCtx: null,
        bufSize: 0,
        puffLayout: null,
        baked: false,

        bakeJx,
        bakeJy,

        // pattern cache
        _pattern: null,
        _patternSrc: null,

        // edge fade cache
        _edgeFade: 1,
      });
    }
  }

  // ---- Bake EVERYTHING offscreen ONCE (prevents visible pop-in/chunking) ----
  function prewarm() {
    if (!didInit) init({});
    for (const n of nebulae) {
      if (!n.baked) rebuildNebulaTextureOnce(n);
    }
  }

  // ---- Resize: DO NOT respawn. Optional rebake only for crispness. ----
  function resize({ w, h }) {
    if (!didInit) init({ w, h });

    const W = w | 0;
    const H = h | 0;
    if (W === lastW && H === lastH) return;

    lastW = W;
    lastH = H;

    // Optional: rebake to match new size fidelity (doesn't change placement/colors/motion)
    for (const n of nebulae) {
      n.baked = false;
      rebuildNebulaTextureOnce(n);
    }
  }

  function drawCloud(ctx, cloud, t, screenX, screenY) {
    const r = cloud.r;
    const size = Math.ceil(r * 2);

    if (!cloud.baked) rebuildNebulaTextureOnce(cloud);

    const breath = 1 + Math.sin(t * cloud.breathe + cloud.phase) * 0.1;

    // Jitter (keep same motion, just snap the final placement)
    const jx = Math.sin(t * cloud.jitterSpeed + cloud.phase) * cloud.jitterAmp;
    const jy = Math.cos(t * (cloud.jitterSpeed * 0.93) + cloud.phase) * cloud.jitterAmp;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = cloud.a * breath * (cloud._edgeFade ?? 1);

    if (N.DRAW_BLUR_PX > 0) ctx.filter = `blur(${N.DRAW_BLUR_PX}px)`;

    // ✅ SNAP final draw position to whole pixels (prevents repeat seam sampling artifacts)
    const dx = ((screenX - r + jx) + 0.5) | 0;
    const dy = ((screenY - r + jy) + 0.5) | 0;

    ctx.drawImage(cloud.buf, dx, dy, size, size);

    ctx.filter = "none";
    ctx.restore();
  }


  // ---- Camera-relative rendering + offscreen padding + edge fade ----
  function updateAndDraw(ctx, { dt, t, w, h, camX, camY }) {
    if (!didInit) init({ w, h });

    // World parallax offset
    const ox = wrap01(camX * TUNABLES.SCALES.NEBULA);
    const oy = wrap01(camY * TUNABLES.SCALES.NEBULA);

    // Draw slightly offscreen so nothing appears/disappears at the edge
    const PAD = Math.max(w, h) * (N.DRAW_PAD_FRAC ?? 0.40);
    const FADE = Math.max(120, PAD * 0.35);

    for (const n of nebulae) {
      // Drift in world space
      n.wx = wrap01(n.wx + n.vx * dt);
      n.wy = wrap01(n.wy + n.vy * dt);

      // Camera-relative nearest wrapped delta
      const dx = wrapDelta(n.wx - ox);
      const dy = wrapDelta(n.wy - oy);

      // Project to screen centered on viewport
      const sx = w * 0.5 + (dx / WORLD) * w;
      const sy = h * 0.5 + (dy / WORLD) * h;

      // Cull only when far outside view + padding
      const r = n.r;
      if (sx < -PAD - r || sx > w + PAD + r || sy < -PAD - r || sy > h + PAD + r) continue;

      // Smooth fade near the outer margin (prevents popping at edges)
      const edgeDist = Math.min(
        sx + PAD,
        sy + PAD,
        (w + PAD) - sx,
        (h + PAD) - sy
      );
      n._edgeFade = Math.max(0, Math.min(1, edgeDist / FADE));

      drawCloud(ctx, n, t, sx, sy);
    }
  }

  // ------------------------------
  // Counting helpers (simple)
  // ------------------------------

  function getTotalCount() {
    return nebulae.length;
  }

  function countInBox({ xMin, xMax, yMin, yMax }) {
    if (!didInit) init({});

    const xmin = wrap01(xMin);
    const xmax = wrap01(xMax);
    const ymin = wrap01(yMin);
    const ymax = wrap01(yMax);

    const inRangeWrapped = (v, a, b) => {
      if (a <= b) return v >= a && v <= b;
      return v >= a || v <= b;
    };

    let c = 0;
    for (const n of nebulae) {
      if (inRangeWrapped(n.wx, xmin, xmax) && inRangeWrapped(n.wy, ymin, ymax)) c++;
    }
    return c;
  }

  function countWithin({ x = 0, y = 0, range = 10000 }) {
    return countInBox({
      xMin: x - range,
      xMax: x + range,
      yMin: y - range,
      yMax: y + range,
    });
  }

  return {
    // lifecycle
    init,
    prewarm,
    resize,

    // render
    updateAndDraw,

    // info/debug
    getTotalCount,
    countInBox,
    countWithin,

    hasNebulae: () => nebulae.length > 0,
  };
}
