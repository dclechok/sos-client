// src/render/systems/meteors.js
import { mulberry32 } from "../core/rng";
import { TUNABLES } from "../core/tunables";

export function createMeteorSystem(worldSeed) {
  const r = mulberry32((worldSeed ^ 0x5eed1234) >>> 0);
  const meteors = [];

  const rand01 = () => r();
  const randBetween = (a, b) => a + (b - a) * rand01();

  // Noticeable-but-tasteful tints
  function pickMeteorColor() {
    const roll = rand01();
    if (roll < 0.30) return [190, 220, 255]; // icy blue
    if (roll < 0.55) return [170, 235, 255]; // cyan
    if (roll < 0.78) return [215, 190, 255]; // violet
    return [255, 210, 160]; // warm amber
  }

  function spawnFromRandomEdge(w, h, pad) {
    const edge = (rand01() * 4) | 0;

    let x, y;
    if (edge === 0) {
      x = randBetween(-pad, w + pad);
      y = -pad;
    } else if (edge === 1) {
      x = w + pad;
      y = randBetween(-pad, h + pad);
    } else if (edge === 2) {
      x = randBetween(-pad, w + pad);
      y = h + pad;
    } else {
      x = -pad;
      y = randBetween(-pad, h + pad);
    }

    // Aim point inside screen (bias toward center a bit)
    const tx = randBetween(w * 0.15, w * 0.85);
    const ty = randBetween(h * 0.15, h * 0.85);

    let dx = tx - x;
    let dy = ty - y;

    const mag = Math.hypot(dx, dy) || 1;
    dx /= mag;
    dy /= mag;

    // Small angular jitter
    const jitter = (rand01() - 0.5) * 0.45; // +/- ~13 degrees
    const c = Math.cos(jitter);
    const s = Math.sin(jitter);

    const vx = dx * c - dy * s;
    const vy = dx * s + dy * c;

    return { x, y, vx, vy };
  }

  function spawnInsideViewport(w, h, pad) {
    // Start anywhere on-screen (with tiny pad so it can start slightly off too)
    const x = randBetween(-pad, w + pad);
    const y = randBetween(-pad, h + pad);

    // Random direction, but avoid tiny vectors
    const ang = randBetween(0, Math.PI * 2);
    let vx = Math.cos(ang);
    let vy = Math.sin(ang);

    // Keep directions from being too “flat” sometimes (optional—feels nicer)
    // Normalize (cos/sin already normalized), just return.
    return { x, y, vx, vy };
  }

  function maybeSpawn(dt, w, h) {
    const M = TUNABLES.METEORS;
    if (!M.ENABLED) return;
    if (meteors.length >= M.MAX_ACTIVE) return;
    if (rand01() >= M.RATE_PER_SEC * dt) return;

    const pad = 90;
    const speed = randBetween(M.SPEED_MIN, M.SPEED_MAX);
    const len = randBetween(M.LEN_MIN, M.LEN_MAX);
    const life = M.LIFETIME * randBetween(0.85, 1.25);

    // 0..1 : chance meteor starts inside viewport instead of entering from edge
    // If you want to tune it globally, add this to TUNABLES.METEORS:
    // IN_VIEWPORT_SPAWN_CHANCE: 0.45
    const insideChance =
      Number.isFinite(M.IN_VIEWPORT_SPAWN_CHANCE) ? M.IN_VIEWPORT_SPAWN_CHANCE : 0.45;

    const spawn =
      rand01() < insideChance
        ? spawnInsideViewport(w, h, 20)
        : spawnFromRandomEdge(w, h, pad);

    const [rC, gC, bC] = pickMeteorColor();

    meteors.push({
      x: spawn.x,
      y: spawn.y,
      vx: spawn.vx,
      vy: spawn.vy,
      speed,
      len,
      age: 0,
      life,
      color: { r: rC, g: gC, b: bC },
    });
  }

  function draw(ctx, dt) {
    const M = TUNABLES.METEORS;
    if (!M.ENABLED || meteors.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = 1;

    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.age += dt;

      if (m.age >= m.life) {
        meteors.splice(i, 1);
        continue;
      }

      m.x += m.vx * m.speed * dt;
      m.y += m.vy * m.speed * dt;

      const tt = m.age / m.life;
      const fade = tt < 0.15 ? tt / 0.15 : tt > 0.75 ? (1 - tt) / 0.25 : 1;
      const a = M.ALPHA * fade;

      const x2 = m.x - m.vx * m.len;
      const y2 = m.y - m.vy * m.len;

      const { r, g, b } = m.color;

      const grad = ctx.createLinearGradient(m.x, m.y, x2, y2);
      grad.addColorStop(0, `rgba(${r},${g},${b},${a})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Hotter head spark
      ctx.globalAlpha = a * 0.9;
      ctx.fillStyle = `rgb(${Math.min(255, r + 25)},${Math.min(255, g + 25)},${Math.min(255, b + 25)})`;
      ctx.fillRect(m.x, m.y, 1, 1);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  return { maybeSpawn, draw };
}
