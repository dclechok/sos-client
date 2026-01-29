// src/render/systems/nebula/nebulaSystem.js
import { mulberry32 } from "../../core/rng";
import { TUNABLES } from "../../core/tunables";
import { makeSeamlessNebulaTile } from "./nebulaTile";
import { getNebulaMask } from "./nebulaMaskCache";

export function createNebulaSystem(worldSeed) {
  const WORLD = TUNABLES.WORLD;
  const N = TUNABLES.NEBULA;

  const gasTileA = makeSeamlessNebulaTile({ size: 1024, seed: (worldSeed ^ 0x0a11ce) >>> 0 });
  const gasTileB = makeSeamlessNebulaTile({ size: 1024, seed: (worldSeed ^ 0x0badc0de) >>> 0 });

  const nebulaRand = mulberry32((worldSeed ^ 0x77777777) >>> 0);
  let nebulae = [];

  const randRange = (a, b) => a + (b - a) * nebulaRand();

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

    const jx = cloud.bakeJx;
    const jy = cloud.bakeJy;

    cctx.globalCompositeOperation = "source-over";
    cctx.globalAlpha = 1;
    cctx.drawImage(cloud.tile, jx, jy, size, size);

    const layout = cloud.puffLayout;
    for (let i = 0; i < layout.length; i++) {
      const p = layout[i];
      const w2 = size * p.sx;
      const h2 = size * p.sy;
      cctx.globalAlpha = p.a;
      cctx.drawImage(cloud.tile, jx + p.ox, jy + p.oy, w2, h2);
    }

    cctx.globalCompositeOperation = "destination-in";
    cctx.globalAlpha = 1;
    const mask = getNebulaMask(size, cloud.maskSeed, cloud.puffCount, cloud.holeCount);
    cctx.drawImage(mask, 0, 0);

    cctx.globalCompositeOperation = "source-over";
    cctx.globalAlpha = 1;
    cctx.filter = `blur(${N.BUF_BLUR_PX}px)`;
    cctx.drawImage(cloud.buf, 0, 0);
    cctx.filter = "none";

    cctx.globalCompositeOperation = "source-atop";
    cctx.globalAlpha = N.CONTRAST_WASH;
    cctx.fillStyle = "black";
    cctx.fillRect(0, 0, size, size);

    cctx.globalAlpha = 1;
    cctx.globalCompositeOperation = "source-over";

    cloud.baked = true;
  }

  function reset({ w, h }) {
    nebulae = [];

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
        wx: randRange(0, WORLD),
        wy: randRange(0, WORLD),

        r,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        a: randRange(N.ALPHA_MIN, N.ALPHA_MAX),

        tile: nebulaRand() < 0.5 ? gasTileA : gasTileB,

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
      });
    }

    for (const n of nebulae) rebuildNebulaTextureOnce(n);
  }

  function drawCloud(ctx, cloud, t, screenX, screenY) {
    const r = cloud.r;
    const size = Math.ceil(r * 2);

    if (!cloud.baked) rebuildNebulaTextureOnce(cloud);

    const breath = 1 + Math.sin(t * cloud.breathe + cloud.phase) * 0.1;
    const jx = Math.sin(t * cloud.jitterSpeed + cloud.phase) * cloud.jitterAmp;
    const jy = Math.cos(t * (cloud.jitterSpeed * 0.93) + cloud.phase) * cloud.jitterAmp;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = cloud.a * breath;

    if (N.DRAW_BLUR_PX > 0) ctx.filter = `blur(${N.DRAW_BLUR_PX}px)`;
    ctx.drawImage(cloud.buf, screenX - r + jx, screenY - r + jy, size, size);
    ctx.filter = "none";

    ctx.restore();
  }

  function updateAndDraw(ctx, { dt, t, w, h, camX, camY }) {
    const ox = ((camX * TUNABLES.SCALES.NEBULA) % WORLD + WORLD) % WORLD;
    const oy = ((camY * TUNABLES.SCALES.NEBULA) % WORLD + WORLD) % WORLD;

    for (const n of nebulae) {
      n.wx = (n.wx + n.vx * dt + WORLD) % WORLD;
      n.wy = (n.wy + n.vy * dt + WORLD) % WORLD;

      let x = n.wx - ox;
      let y = n.wy - oy;

      x = ((x % WORLD) + WORLD) % WORLD;
      y = ((y % WORLD) + WORLD) % WORLD;

      const sx = (x / WORLD) * w;
      const sy = (y / WORLD) * h;

      drawCloud(ctx, n, t, sx, sy);
    }
  }

  return {
    reset,
    updateAndDraw,
    hasNebulae: () => nebulae.length > 0,
  };
}
