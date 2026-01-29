// src/render/systems/nebula/nebulaMaskCache.js
import { mulberry32 } from "../../core/rng";

const maskCache = new Map();

export function getNebulaMask(size, seed, puffs, holes) {
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

  mctx.globalCompositeOperation = "destination-in";
  mctx.filter = "none";

  const outer = mctx.createRadialGradient(cx, cy, size * 0.08, cx, cy, size * 0.56);
  outer.addColorStop(0.0, "rgba(255,255,255,1)");
  outer.addColorStop(0.62, "rgba(255,255,255,0.85)");
  outer.addColorStop(1.0, "rgba(255,255,255,0)");
  mctx.fillStyle = outer;
  mctx.fillRect(0, 0, size, size);

  maskCache.set(key, m);
  return m;
}
