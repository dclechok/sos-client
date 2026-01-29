// MainViewport.js (SMOOTH — no splotchy nebula, no “new blobs” popping while moving)
//
// What changed vs your file:
// 1) Nebula textures are baked ONCE (per cloud) instead of rebuilt 8–12x/sec.
//    This removes the “splotchy / choppy / new nebula spawning” look when the camera moves.
// 2) Nebula “life” is kept via: (a) breathing alpha, (b) world drift, (c) a tiny smooth draw-time jitter
//    that does NOT require rebaking buffers.
// 3) dt is clamped to avoid big jumps if a frame stalls (prevents chunky drift steps).
//
// Everything else (stars, dust, masks, tiles, look) stays essentially the same.

import { useEffect, useRef } from "react";
import "./styles/MainViewport.css";

/**
 * LAYERS (back -> front)
 * 1) Far stars (slow parallax + twinkle + VERY subtle global pulse)
 * 2) Space dust / micro-debris (unique: tiny tinted specks, very faint, independent drift)
 * 3) Nebula clouds (DISCRETE pockets, not full-screen; slow drift; black space between)
 * 4) Near stars (faster parallax + a few glow stars + twinkle)
 */

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp01(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
function smoothstep(t) {
  return t * t * (3 - 2 * t);
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Seamless value-noise fBm nebula tile (wraps perfectly)
function makeSeamlessNebulaTile({ size = 1024, seed = 1337 }) {
  const r = mulberry32(seed);

  const tile = document.createElement("canvas");
  tile.width = size;
  tile.height = size;

  const ctx = tile.getContext("2d", { willReadFrequently: true });

  const G = 64;
  const grid = new Float32Array(G * G);
  for (let i = 0; i < grid.length; i++) grid[i] = r();

  const idx = (x, y) => {
    x = ((x % G) + G) % G;
    y = ((y % G) + G) % G;
    return y * G + x;
  };

  function valueNoise(u, v) {
    const x = u * G;
    const y = v * G;

    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = x0 + 1;
    const y1 = y0 + 1;

    const tx = smoothstep(x - x0);
    const ty = smoothstep(y - y0);

    const a = grid[idx(x0, y0)];
    const b = grid[idx(x1, y0)];
    const c = grid[idx(x0, y1)];
    const d = grid[idx(x1, y1)];

    const ab = lerp(a, b, tx);
    const cd = lerp(c, d, tx);
    return lerp(ab, cd, ty);
  }

  function fbm(u, v) {
    let sum = 0;
    let amp = 0.55;
    let freq = 1.0;

    for (let i = 0; i < 5; i++) {
      const ang = 0.35 * i;
      const cu = Math.cos(ang);
      const su = Math.sin(ang);

      const uu = u * freq * cu - v * freq * su;
      const vv = u * freq * su + v * freq * cu;

      const nu = uu - Math.floor(uu);
      const nv = vv - Math.floor(vv);

      sum += valueNoise(nu, nv) * amp;
      freq *= 2.0;
      amp *= 0.55;
    }
    return sum;
  }

  const img = ctx.createImageData(size, size);
  const d = img.data;

  const palettes = [
    { r: [50, 90], g: [120, 170], b: [200, 255] }, // blue
    { r: [130, 210], g: [60, 120], b: [200, 255] }, // purple
    { r: [40, 90], g: [170, 240], b: [160, 220] }, // teal
  ];

  const p = palettes[Math.floor(r() * palettes.length)];
  const p2 = palettes[Math.floor(r() * palettes.length)];

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;

      const n1 = fbm(u, v);
      const n2 = fbm((u + 0.37) % 1, (v + 0.21) % 1);

      let n = lerp(n1, n2, 0.45);
      n = Math.pow(clamp01(n), 1.8);

      const ridge =
        1.0 - Math.abs(2.0 * fbm((u + 0.11) % 1, (v + 0.53) % 1) - 1.0);
      const wisps = Math.pow(clamp01(ridge), 2.2);

      const density = clamp01(n * 0.85 + wisps * 0.55);

      const t = clamp01(n2);
      const R =
        lerp(p.r[0], p.r[1], density) * (1 - t) +
        lerp(p2.r[0], p2.r[1], density) * t;
      const Gc =
        lerp(p.g[0], p.g[1], density) * (1 - t) +
        lerp(p2.g[0], p2.g[1], density) * t;
      const B =
        lerp(p.b[0], p.b[1], density) * (1 - t) +
        lerp(p2.b[0], p2.b[1], density) * t;

      const A = Math.pow(density, 1.2) * 255;

      const i = (y * size + x) * 4;
      d[i] = R | 0;
      d[i + 1] = Gc | 0;
      d[i + 2] = B | 0;
      d[i + 3] = A | 0;
    }
  }

  ctx.putImageData(img, 0, 0);

  // subtle dither
  const img2 = ctx.getImageData(0, 0, size, size);
  const dd = img2.data;
  const rd = mulberry32(seed ^ 0xc0ffee);
  for (let i = 0; i < dd.length; i += 4) {
    const n = (rd() - 0.5) * 10;
    dd[i] = Math.max(0, Math.min(255, dd[i] + n));
    dd[i + 1] = Math.max(0, Math.min(255, dd[i + 1] + n));
    dd[i + 2] = Math.max(0, Math.min(255, dd[i + 2] + n));
  }
  ctx.putImageData(img2, 0, 0);

  return tile;
}

export default function MainViewport({ worldSeed, cameraX = 0, cameraY = 0 }) {
  const canvasRef = useRef(null);

  // camera refs so the animation loop always uses latest values
  const camRef = useRef({ x: cameraX, y: cameraY });
  camRef.current.x = cameraX;
  camRef.current.y = cameraY;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });

    // Stable world seed
    const WORLD_SEED_KEY = "space_world_seed_v1";
    let WORLD_SEED = Number.isFinite(worldSeed)
      ? worldSeed
      : Number(localStorage.getItem(WORLD_SEED_KEY));

    if (!Number.isFinite(WORLD_SEED)) {
      WORLD_SEED = (Math.random() * 2 ** 32) >>> 0;
      localStorage.setItem(WORLD_SEED_KEY, String(WORLD_SEED));
    }
    if (Number.isFinite(worldSeed)) {
      localStorage.setItem(WORLD_SEED_KEY, String(worldSeed));
    }

    // -----------------------------
    // Tunables
    // -----------------------------
    const WORLD = 7000;

    const FAR_SCALE = 0.616;
    const DUST_SCALE = 0.953;
    const NEBULA_SCALE = 0.374;
    const NEAR_SCALE = 2.949;

    const DUST_ALPHA = 0.1;

    // Nebula pockets
    const NEBULA_COUNT = 8;
    const NEBULA_ALPHA_MIN = 0.018;
    const NEBULA_ALPHA_MAX = 0.16;

    const NEBULA_SIZE_MIN = 380;
    const NEBULA_SIZE_MAX = 1200;

    // Drift (px/sec in “world units”)
    const NEBULA_SPEED_MIN = 10;
    const NEBULA_SPEED_MAX = 18.2;

    const NEBULA_PUFFS_MIN = 5;
    const NEBULA_PUFFS_MAX = 12;
    const NEBULA_HOLES_MIN = 3;
    const NEBULA_HOLES_MAX = 10;

    const NEBULA_BUF_BLUR_PX = 1.15;
    const NEBULA_CONTRAST_WASH = 0.055;
    const NEBULA_DRAW_BLUR_PX = 0.35;

    // Smooth draw-time drift (no rebake needed)
    const NEBULA_DRAW_JITTER_PX = 6.0; // 0..10 (purely visual micro-movement)

    // Far pulse
    const FAR_PULSE_ENABLED = true;
    const FAR_PULSE_AMP = 0.06;
    const FAR_PULSE_SPEED = 0.06;
    const FAR_PULSE_PHASE = 0.0;

    // Canvas sizing
    let raf = 0;
    let w = 0,
      h = 0,
      dpr = 1;

    // Mask cache
    const maskCache = new Map();

    function getNebulaMask(size, seed, puffs, holes) {
      const key = `${size}|${seed}|${puffs}|${holes}`;
      const cached = maskCache.get(key);
      if (cached) return cached;

      const r = mulberry32(seed);

      const m = document.createElement("canvas");
      m.width = size;
      m.height = size;
      const mctx = m.getContext("2d");

      const cx = size * 0.5;
      const cy = size * 0.5;

      // interior lumpy alpha
      mctx.clearRect(0, 0, size, size);
      mctx.globalCompositeOperation = "source-over";
      mctx.filter = `blur(${Math.max(3, size * 0.012)}px)`;

      const blobCount = puffs * 3 + Math.floor(r() * 8);
      for (let i = 0; i < blobCount; i++) {
        const ang = r() * Math.PI * 2;
        const rad = r() ** 0.55 * (size * 0.33);
        const x = cx + Math.cos(ang) * rad;
        const y = cy + Math.sin(ang) * rad;

        const inner = size * (0.010 + r() * 0.035);
        const outer = inner * (2.8 + r() * 3.2);

        const g = mctx.createRadialGradient(x, y, inner, x, y, outer);
        g.addColorStop(0, "rgba(255,255,255,0.95)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        mctx.fillStyle = g;
        mctx.fillRect(x - outer, y - outer, outer * 2, outer * 2);
      }

      // punch holes
      mctx.globalCompositeOperation = "destination-out";
      mctx.filter = `blur(${Math.max(2, size * 0.010)}px)`;

      for (let i = 0; i < holes; i++) {
        const ang = r() * Math.PI * 2;
        const rad = r() ** 0.6 * (size * 0.34);
        const x = cx + Math.cos(ang) * rad;
        const y = cy + Math.sin(ang) * rad;

        const inner = size * (0.012 + r() * 0.040);
        const outer = inner * (2.8 + r() * 3.8);

        const g = mctx.createRadialGradient(x, y, inner, x, y, outer);
        g.addColorStop(0, "rgba(0,0,0,0.9)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        mctx.fillStyle = g;
        mctx.fillRect(x - outer, y - outer, outer * 2, outer * 2);
      }

      // outer boundary
      mctx.globalCompositeOperation = "destination-in";
      mctx.filter = "none";

      const outer = mctx.createRadialGradient(
        cx,
        cy,
        size * 0.08,
        cx,
        cy,
        size * 0.56
      );
      outer.addColorStop(0.0, "rgba(255,255,255,1)");
      outer.addColorStop(0.62, "rgba(255,255,255,0.85)");
      outer.addColorStop(1.0, "rgba(255,255,255,0)");
      mctx.fillStyle = outer;
      mctx.fillRect(0, 0, size, size);

      maskCache.set(key, m);
      return m;
    }

    // Stars (world space)
    function makeStars(seed, count, glowCount) {
      const r = mulberry32(seed);
      const stars = [];

      for (let i = 0; i < count; i++) {
        const x = r() * WORLD;
        const y = r() * WORLD;

        const roll = r();
        const s = roll < 0.72 ? 1 : 2;

        const a = 0.19 + r() * 0.3;
        const tint = 238 + Math.floor(r() * 17);
        const c = `rgb(${tint},${tint},255)`;

        const twSpeed = 0.45 + r() * 0.95;
        const twPhase = r() * Math.PI * 2;
        const twAmp = 0.05 + r() * 0.09;

        stars.push({ x, y, s, a, c, glow: false, twSpeed, twPhase, twAmp });
      }

      for (let i = 0; i < glowCount; i++) {
        const x = r() * WORLD;
        const y = r() * WORLD;

        const a = 0.4 + r() * 0.25;
        const twSpeed = 0.25 + r() * 0.65;
        const twPhase = r() * Math.PI * 2;
        const twAmp = 0.07 + r() * 0.11;

        stars.push({
          x,
          y,
          s: 2,
          a,
          c: "rgb(245,245,255)",
          glow: true,
          twSpeed,
          twPhase,
          twAmp,
        });
      }

      return stars;
    }

    const farStars = makeStars(111, 900, 10);
    const nearStars = makeStars(222, 520, 12);

    function drawStars(stars, scale, t) {
      const camX = camRef.current.x;
      const camY = camRef.current.y;

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
        const alpha = Math.min(1, Math.max(0, st.a * tw));

        ctx.globalAlpha = alpha;

        if (!st.glow) {
          ctx.fillStyle = st.c;
          ctx.fillRect(sx, sy, st.s, st.s);
        } else {
          ctx.save();
          ctx.fillStyle = st.c;
          ctx.shadowColor = st.c;
          ctx.shadowBlur = 6 + (tw - 1) * 10;
          ctx.beginPath();
          ctx.arc(sx, sy, 1.15, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }

    // Dust (world-space so it scrolls)
    const dustRand = mulberry32(333);
    const dust = [];
    const DUST_COUNT = 900;

    for (let i = 0; i < DUST_COUNT; i++) {
      const x = dustRand() * WORLD;
      const y = dustRand() * WORLD;

      const pick = dustRand();
      const col =
        pick < 0.5
          ? "rgba(180,220,255,1)"
          : pick < 0.8
          ? "rgba(210,190,255,1)"
          : "rgba(170,255,240,1)";

      const s = dustRand() < 0.85 ? 1 : 2;
      const spd = 0.15 + dustRand() * 0.35;
      const ph = dustRand() * Math.PI * 2;

      dust.push({ x, y, s, col, spd, ph });
    }

    let dustT = 0;
    function drawDust(dt) {
      const camX = camRef.current.x;
      const camY = camRef.current.y;

      dustT += dt;

      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = DUST_ALPHA;

      const ox = ((camX * DUST_SCALE) % WORLD + WORLD) % WORLD;
      const oy = ((camY * DUST_SCALE) % WORLD + WORLD) % WORLD;

      for (const p of dust) {
        // tiny independent drift
        const jx = Math.cos(dustT * p.spd + p.ph) * 6;
        const jy = Math.sin(dustT * p.spd + p.ph) * 6;

        let x = p.x + jx - ox;
        let y = p.y + jy - oy;

        x = ((x % WORLD) + WORLD) % WORLD;
        y = ((y % WORLD) + WORLD) % WORLD;

        const sx = (x / WORLD) * w;
        const sy = (y / WORLD) * h;

        ctx.fillStyle = p.col;
        ctx.fillRect(sx, sy, p.s, p.s);
      }

      ctx.restore();
    }

    // Nebula tiles (generated once)
    const gasTileA = makeSeamlessNebulaTile({
      size: 1024,
      seed: (WORLD_SEED ^ 0x0a11ce) >>> 0,
    });
    const gasTileB = makeSeamlessNebulaTile({
      size: 1024,
      seed: (WORLD_SEED ^ 0x0badc0de) >>> 0,
    });

    const nebulaRand = mulberry32((WORLD_SEED ^ 0x77777777) >>> 0);
    let nebulae = [];

    function randRange(a, b) {
      return a + (b - a) * nebulaRand();
    }

    // Build puff layout once (stable per cloud)
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
    }

    function rebuildNebulaTextureOnce(cloud) {
      const r = cloud.r;
      const size = Math.ceil(r * 2);
      ensureCloudCanvas(cloud, size);

      const cctx = cloud.bufCtx;
      cctx.setTransform(1, 0, 0, 1, 0, 0);
      cctx.clearRect(0, 0, size, size);

      // IMPORTANT: bake with STATIC offsets so it doesn't "pop" later
      const jx = cloud.bakeJx;
      const jy = cloud.bakeJy;

      cctx.globalCompositeOperation = "source-over";
      cctx.globalAlpha = 1;

      // base tile
      cctx.drawImage(cloud.tile, jx, jy, size, size);

      // puffs (stable layout)
      const layout = cloud.puffLayout;
      for (let i = 0; i < layout.length; i++) {
        const p = layout[i];
        const w2 = size * p.sx;
        const h2 = size * p.sy;
        cctx.globalAlpha = p.a;
        cctx.drawImage(cloud.tile, jx + p.ox, jy + p.oy, w2, h2);
      }

      // mask
      cctx.globalCompositeOperation = "destination-in";
      cctx.globalAlpha = 1;
      const mask = getNebulaMask(size, cloud.maskSeed, cloud.puffCount, cloud.holeCount);
      cctx.drawImage(mask, 0, 0);

      // buffer blur
      cctx.globalCompositeOperation = "source-over";
      cctx.globalAlpha = 1;
      cctx.filter = `blur(${NEBULA_BUF_BLUR_PX}px)`;
      cctx.drawImage(cloud.buf, 0, 0);
      cctx.filter = "none";

      // subtle wash
      cctx.globalCompositeOperation = "source-atop";
      cctx.globalAlpha = NEBULA_CONTRAST_WASH;
      cctx.fillStyle = "black";
      cctx.fillRect(0, 0, size, size);

      cctx.globalAlpha = 1;
      cctx.globalCompositeOperation = "source-over";

      cloud.baked = true;
    }

    function resetNebulae() {
      nebulae = [];

      const sMin = Math.max(
        260,
        Math.min(NEBULA_SIZE_MIN, Math.min(w, h) * 0.55)
      );
      const sMax = Math.max(
        sMin + 160,
        Math.min(NEBULA_SIZE_MAX, Math.max(w, h) * 1.2)
      );

      for (let i = 0; i < NEBULA_COUNT; i++) {
        const r = randRange(sMin, sMax);
        const ang = randRange(0, Math.PI * 2);
        const spd = randRange(NEBULA_SPEED_MIN, NEBULA_SPEED_MAX);

        const puffCount =
          (NEBULA_PUFFS_MIN +
            Math.floor(nebulaRand() * (NEBULA_PUFFS_MAX - NEBULA_PUFFS_MIN + 1))) | 0;

        const holeCount =
          (NEBULA_HOLES_MIN +
            Math.floor(nebulaRand() * (NEBULA_HOLES_MAX - NEBULA_HOLES_MIN + 1))) | 0;

        const maskSeed = (WORLD_SEED ^ (i * 2654435761)) >>> 0;

        // per-cloud stable bake offsets (so pattern never "pops")
        const bakeRand = mulberry32(maskSeed ^ 0x1234abcd);
        const bakeJx = (bakeRand() - 0.5) * 18;
        const bakeJy = (bakeRand() - 0.5) * 18;

        const phase = randRange(0, Math.PI * 2);

        nebulae.push({
          // world pos
          wx: randRange(0, WORLD),
          wy: randRange(0, WORLD),

          r,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          a: randRange(NEBULA_ALPHA_MIN, NEBULA_ALPHA_MAX),

          tile: nebulaRand() < 0.5 ? gasTileA : gasTileB,

          // breathing + micro-jitter (draw-time only)
          phase,
          breathe: randRange(0.02, 0.05),
          jitterSpeed: randRange(0.12, 0.28),
          jitterAmp: randRange(NEBULA_DRAW_JITTER_PX * 0.5, NEBULA_DRAW_JITTER_PX),

          maskSeed,
          puffCount,
          holeCount,

          // baked buffer
          buf: null,
          bufCtx: null,
          bufSize: 0,
          puffLayout: null,
          baked: false,

          bakeJx,
          bakeJy,
        });
      }

      // bake once up-front (no runtime popping)
      for (const n of nebulae) rebuildNebulaTextureOnce(n);
    }

    function drawNebulaCloud(cloud, t, screenX, screenY) {
      const r = cloud.r;
      const size = Math.ceil(r * 2);

      if (!cloud.baked) rebuildNebulaTextureOnce(cloud);

      const breath = 1 + Math.sin(t * cloud.breathe + cloud.phase) * 0.10;

      // tiny smooth draw-time jitter (doesn't change texture content)
      const jx = Math.sin(t * cloud.jitterSpeed + cloud.phase) * cloud.jitterAmp;
      const jy = Math.cos(t * (cloud.jitterSpeed * 0.93) + cloud.phase) * cloud.jitterAmp;

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = cloud.a * breath;

      ctx.filter = `blur(${NEBULA_DRAW_BLUR_PX}px)`;
      ctx.drawImage(cloud.buf, screenX - r + jx, screenY - r + jy, size, size);

      ctx.restore();
    }

    function drawNebulae(dt, t) {
      const camX = camRef.current.x;
      const camY = camRef.current.y;

      const ox = ((camX * NEBULA_SCALE) % WORLD + WORLD) % WORLD;
      const oy = ((camY * NEBULA_SCALE) % WORLD + WORLD) % WORLD;

      for (const n of nebulae) {
        // drift in world space
        n.wx = (n.wx + n.vx * dt + WORLD) % WORLD;
        n.wy = (n.wy + n.vy * dt + WORLD) % WORLD;

        // camera parallax
        let x = n.wx - ox;
        let y = n.wy - oy;

        x = ((x % WORLD) + WORLD) % WORLD;
        y = ((y % WORLD) + WORLD) % WORLD;

        const sx = (x / WORLD) * w;
        const sy = (y / WORLD) * h;

        drawNebulaCloud(n, t, sx, sy);
      }
    }

    // Resize
    function resize() {
      const p = canvas.parentElement;
      if (!p) return;

      w = p.clientWidth;
      h = p.clientHeight;

      dpr = Math.min(1.5, window.devicePixelRatio || 1);

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;

      if (nebulae.length === 0) resetNebulae();
    }

    // Loop
    let lastMs = 0;
    function frame(nowMs) {
      const t = nowMs * 0.001;

      const dtRaw = lastMs ? (nowMs - lastMs) * 0.001 : 0;
      const dt = Math.min(dtRaw, 0.033); // clamp dt to avoid chunky steps
      lastMs = nowMs;

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);

      // Far stars + pulse
      if (FAR_PULSE_ENABLED) {
        const pulse =
          1 +
          Math.sin((t + FAR_PULSE_PHASE) * Math.PI * 2 * FAR_PULSE_SPEED) *
            FAR_PULSE_AMP;
        ctx.save();
        ctx.globalAlpha *= pulse;
        drawStars(farStars, FAR_SCALE, t);
        ctx.restore();
      } else {
        drawStars(farStars, FAR_SCALE, t);
      }

      drawDust(dt);
      drawNebulae(dt, t);
      drawStars(nearStars, NEAR_SCALE, t);

      raf = requestAnimationFrame(frame);
    }

    window.addEventListener("resize", resize);

    resize();
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [worldSeed]);

  return (
    <div className="main-viewport">
      <canvas ref={canvasRef} />
    </div>
  );
}
