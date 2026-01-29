// src/render/systems/nebula/nebulaTile.js
import { mulberry32 } from "../../core/rng";
import { clamp01, lerp, smoothstep } from "../../core/math";

export function makeSeamlessNebulaTile({ size = 1024, seed = 1337 }) {
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
    { r: [50, 90], g: [120, 170], b: [200, 255] },
    { r: [130, 210], g: [60, 120], b: [200, 255] },
    { r: [40, 90], g: [170, 240], b: [160, 220] },
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

      const ridge = 1.0 - Math.abs(2.0 * fbm((u + 0.11) % 1, (v + 0.53) % 1) - 1.0);
      const wisps = Math.pow(clamp01(ridge), 2.2);

      const density = clamp01(n * 0.85 + wisps * 0.55);

      const tt = clamp01(n2);
      const R = lerp(p.r[0], p.r[1], density) * (1 - tt) + lerp(p2.r[0], p2.r[1], density) * tt;
      const Gc = lerp(p.g[0], p.g[1], density) * (1 - tt) + lerp(p2.g[0], p2.g[1], density) * tt;
      const B = lerp(p.b[0], p.b[1], density) * (1 - tt) + lerp(p2.b[0], p2.b[1], density) * tt;

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
