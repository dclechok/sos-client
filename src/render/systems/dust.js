// src/render/systems/dust.js
import { mulberry32 } from "../core/rng";
import { TUNABLES } from "../core/tunables";

export function createDustSystem() {
  const WORLD = TUNABLES.WORLD;
  const r = mulberry32(333);

  const dust = [];
  for (let i = 0; i < TUNABLES.DUST.COUNT; i++) {
    const x = r() * WORLD;
    const y = r() * WORLD;

    const pick = r();
    const col =
      pick < 0.5
        ? "rgba(180,220,255,1)"
        : pick < 0.8
        ? "rgba(210,190,255,1)"
        : "rgba(170,255,240,1)";

    const s = r() < 0.85 ? 1 : 2;
    const spd = 0.15 + r() * 0.35;
    const ph = r() * Math.PI * 2;

    dust.push({ x, y, s, col, spd, ph });
  }

  let dustT = 0;

  function draw(ctx, { dt, w, h, camX, camY }) {
    dustT += dt;

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = TUNABLES.DUST.ALPHA;

    const ox = ((camX * TUNABLES.SCALES.DUST) % WORLD + WORLD) % WORLD;
    const oy = ((camY * TUNABLES.SCALES.DUST) % WORLD + WORLD) % WORLD;

    for (const p of dust) {
      const jx = Math.cos(dustT * p.spd + p.ph) * TUNABLES.DUST.JITTER_PX;
      const jy = Math.sin(dustT * p.spd + p.ph) * TUNABLES.DUST.JITTER_PX;

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

  return { draw };
}
