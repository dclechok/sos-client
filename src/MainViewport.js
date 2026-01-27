// MainViewport.js
import { useEffect, useRef } from "react";
import "./styles/MainViewport.css";

/**
 * LAYERS (back -> front)
 * 1) Far stars (slow parallax + twinkle)
 * 2) Space dust / micro-debris (unique: tiny tinted specks, very faint, independent drift)
 * 3) Nebula clouds (DISCRETE pockets, not full-screen; slow drift; black space between)
 *    - OUTER: radial falloff (overall "cloud boundary" stays soft)
 *    - INNER: irregular lumpy mask + punched holes (random black voids inside)
 *    - INNER: multiple “puffs” of the tile stamped at offsets/scales (varied interior density)
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

    // 5 octaves: good look, cheaper
    for (let i = 0; i < 5; i++) {
      const ang = 0.35 * i;
      const cu = Math.cos(ang);
      const su = Math.sin(ang);

      const uu = (u * freq) * cu - (v * freq) * su;
      const vv = (u * freq) * su + (v * freq) * cu;

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
        1.0 -
        Math.abs(2.0 * fbm((u + 0.11) % 1, (v + 0.53) % 1) - 1.0);
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

      // texture alpha (kept moderate)
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
    const n = (rd() - 0.5) * 10; // -5..5
    dd[i] = Math.max(0, Math.min(255, dd[i] + n));
    dd[i + 1] = Math.max(0, Math.min(255, dd[i + 1] + n));
    dd[i + 2] = Math.max(0, Math.min(255, dd[i + 2] + n));
  }
  ctx.putImageData(img2, 0, 0);

  return tile;
}

export default function MainViewport() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });

    // -----------------------------
    // Tunables (keep yours — these are close)
    // -----------------------------
    const WORLD = 7000;

    const FAR_SCALE = 0.045;
    const NEAR_SCALE = 0.11;

    const DUST_ALPHA = 0.1;

    // Nebula: discrete pockets
    const NEBULA_COUNT = 8; // 6..12
    const NEBULA_ALPHA_MIN = 0.018;
    const NEBULA_ALPHA_MAX = 0.16;


    const NEBULA_SIZE_MIN = 380;
    const NEBULA_SIZE_MAX = 1200;

    // Drift (px/sec)
    const NEBULA_SPEED_MIN = 2.2;
    const NEBULA_SPEED_MAX = 4.2;

    // Optional tiny camera coupling (set 0 to fully independent)
    const NEBULA_CAM_COUPLE = 0.0;

    // --- NEW: interior breakup controls (these create black voids + varied pockets) ---
    const NEBULA_PUFFS_MIN = 5; // fewer = more voids
    const NEBULA_PUFFS_MAX = 12;
    const NEBULA_HOLES_MIN = 3; // more holes = more black gaps inside
    const NEBULA_HOLES_MAX = 10;

    // -----------------------------
    // Canvas sizing
    // -----------------------------
    let raf = 0;
    let w = 0,
      h = 0,
      dpr = 1;

    // Camera (swap with real player later)
    let camX = 0;
    let camY = 0;

    // -----------------------------
    // Offscreen cloud buffer (feather + mask)
    // -----------------------------
    const cloudBuf = document.createElement("canvas");
    const cloudBufCtx = cloudBuf.getContext("2d");
    let cloudBufSize = 0;

    function ensureCloudBuf(sizePx) {
      const s = Math.max(64, Math.ceil(sizePx));
      if (s === cloudBufSize) return;
      cloudBufSize = s;
      cloudBuf.width = s;
      cloudBuf.height = s;
      cloudBufCtx.imageSmoothingEnabled = true;
    }

    // -----------------------------
    // Nebula mask cache (HUGE perf win)
    // -----------------------------
    const maskCache = new Map(); // key => canvas

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

      // 1) Build interior "lumpy" alpha from many soft blobs (NOT a circle)
      mctx.clearRect(0, 0, size, size);
      mctx.globalCompositeOperation = "source-over";
      mctx.filter = `blur(${Math.max(3, size * 0.012)}px)`;

      // Big lumpy core field: blobs distributed within the overall radius
      const blobCount = puffs * 3 + Math.floor(r() * 8);
      for (let i = 0; i < blobCount; i++) {
        const ang = r() * Math.PI * 2;
        const rad = (r() ** 0.55) * (size * 0.33);
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

      // 2) Punch holes (black voids inside the cloud)
      mctx.globalCompositeOperation = "destination-out";
      mctx.filter = `blur(${Math.max(2, size * 0.010)}px)`;

      for (let i = 0; i < holes; i++) {
        const ang = r() * Math.PI * 2;
        const rad = (r() ** 0.6) * (size * 0.34);
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

      // 3) Apply the OUTER radial boundary (you said the radiant is fine overall)
      // This keeps the cloud's silhouette soft, but interior stays broken up.
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

    // -----------------------------
    // Stars
    // -----------------------------
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

    // -----------------------------
    // Dust
    // -----------------------------
    const dustRand = mulberry32(333);
    const dust = [];
    const DUST_COUNT = 900;

    for (let i = 0; i < DUST_COUNT; i++) {
      const u = dustRand();
      const v = dustRand();

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

      dust.push({ u, v, s, col, spd, ph });
    }

    let dustT = 0;
    function drawDust(dt) {
      dustT += dt;

      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = DUST_ALPHA;

      for (const p of dust) {
        const du = (p.u + Math.cos(dustT * p.spd + p.ph) * 0.002) % 1;
        const dv = (p.v + Math.sin(dustT * p.spd + p.ph) * 0.002) % 1;

        ctx.fillStyle = p.col;
        ctx.fillRect(du * w, dv * h, p.s, p.s);
      }

      ctx.restore();
    }

    // -----------------------------
    // Nebula clouds (offscreen masked)
    // -----------------------------
    const gasTileA = makeSeamlessNebulaTile({ size: 1024, seed: 999 });
    const gasTileB = makeSeamlessNebulaTile({ size: 1024, seed: 1337 });

    const nebulaRand = mulberry32(777);
    let nebulae = [];

    function randRange(a, b) {
      return a + (b - a) * nebulaRand();
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

        // interior breakup per-cloud
        const puffCount =
          (NEBULA_PUFFS_MIN +
            Math.floor(nebulaRand() * (NEBULA_PUFFS_MAX - NEBULA_PUFFS_MIN + 1))) |
          0;
        const holeCount =
          (NEBULA_HOLES_MIN +
            Math.floor(nebulaRand() * (NEBULA_HOLES_MAX - NEBULA_HOLES_MIN + 1))) |
          0;

        // stable-ish seed per cloud
        const maskSeed = (777 ^ (i * 2654435761)) >>> 0;

        nebulae.push({
          x: randRange(0, w),
          y: randRange(0, h),
          r,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          a: randRange(NEBULA_ALPHA_MIN, NEBULA_ALPHA_MAX),
          tile: nebulaRand() < 0.5 ? gasTileA : gasTileB,
          phase: randRange(0, Math.PI * 2),
          breathe: randRange(0.02, 0.05),
          driftJitter: randRange(8, 22),
          maskSeed,
          puffCount,
          holeCount,
        });
      }
    }

    function drawNebulaCloud(cloud, t) {
      const { x, y, r, tile } = cloud;

      const size = Math.ceil(r * 2);
      ensureCloudBuf(size);

      cloudBufCtx.setTransform(1, 0, 0, 1, 0, 0);
      cloudBufCtx.clearRect(0, 0, cloudBufSize, cloudBufSize);

      // subtle movement so it doesn't feel like a static stamp
      const jx = Math.sin(t * 0.04 + cloud.phase) * cloud.driftJitter;
      const jy = Math.cos(t * 0.03 + cloud.phase) * cloud.driftJitter;

      // --- NEW: stamp multiple “puffs” of the tile into the buffer ---
      // This creates random interior density + different sized pockets,
      // then the irregular mask punches black voids through it.
      const rr = mulberry32(cloud.maskSeed ^ 0x9e3779b9);

      cloudBufCtx.globalCompositeOperation = "source-over";
      cloudBufCtx.globalAlpha = 1;

      // base puff (full size)
      cloudBufCtx.drawImage(tile, jx, jy, size, size);

      // extra puffs (smaller + offset + slightly rotated by scaling tricks)
      const puffs = cloud.puffCount;
      for (let i = 0; i < puffs; i++) {
        const sx = 0.55 + rr() * 0.55; // 0.55..1.10
        const sy = 0.55 + rr() * 0.55;
        const w2 = size * sx;
        const h2 = size * sy;

        const ox = (rr() - 0.5) * size * 0.55;
        const oy = (rr() - 0.5) * size * 0.55;

        // slightly lower alpha on extra puffs so black gaps survive
        cloudBufCtx.globalAlpha = 0.55 + rr() * 0.35;

        cloudBufCtx.drawImage(
          tile,
          jx + ox,
          jy + oy,
          w2,
          h2
        );
      }

      // --- NEW: apply irregular interior mask WITH holes (black space inside) ---
      cloudBufCtx.globalCompositeOperation = "destination-in";
      cloudBufCtx.globalAlpha = 1;

      const mask = getNebulaMask(
        size,
        cloud.maskSeed,
        cloud.puffCount,
        cloud.holeCount
      );
      cloudBufCtx.drawImage(mask, 0, 0);

      // 3) draw buffer onto main canvas (keep your look; you can swap to "screen" to push it back)
      const breath = 1 + Math.sin(t * cloud.breathe + cloud.phase) * 0.10;

      ctx.save();
      ctx.globalCompositeOperation = "lighter"; // keep your vibe
      ctx.globalAlpha = cloud.a * breath;

      // tiny blur helps "distance" and hides mask edges (cheap enough)
      ctx.filter = "blur(0.5px)";
      ctx.drawImage(cloudBuf, x - r, y - r, size, size);

      ctx.restore();
    }

    function drawNebulae(dt, t) {
      for (const n of nebulae) {
        // drift, optional tiny camera coupling
        n.x += n.vx * dt - camX * NEBULA_CAM_COUPLE * dt;
        n.y += n.vy * dt - camY * NEBULA_CAM_COUPLE * dt;

        // wrap with padding
        const pad = n.r + 40;
        if (n.x < -pad) n.x = w + pad;
        if (n.y < -pad) n.y = h + pad;
        if (n.x > w + pad) n.x = -pad;
        if (n.y > h + pad) n.y = -pad;

        drawNebulaCloud(n, t);
      }
    }

    // -----------------------------
    // Resize
    // -----------------------------
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

      resetNebulae();
    }

    // -----------------------------
    // Loop
    // -----------------------------
    let lastMs = 0;

    function frame(nowMs) {
      const t = nowMs * 0.001;
      const dt = lastMs ? (nowMs - lastMs) * 0.001 : 0;
      lastMs = nowMs;

      // clear
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);

      drawStars(farStars, FAR_SCALE, t);
      drawDust(dt);
      drawNebulae(dt, t);
      drawStars(nearStars, NEAR_SCALE, t);

      raf = requestAnimationFrame(frame);
    }

    function onMouseMove(e) {
      camX = (e.clientX - w / 2) * 4;
      camY = (e.clientY - h / 2) * 4;
    }

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouseMove);

    resize();
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <div className="main-viewport">
      <canvas ref={canvasRef} />
    </div>
  );
}
