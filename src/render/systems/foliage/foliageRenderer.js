// src/render/systems/foliage/foliageRenderer.js
import { TILE, TERRAIN_ID } from "../../../world/worldConstants";

/* deterministic tile hash */
function hash2i(x, y, seed = 777) {
  let h = seed ^ (x * 374761393) ^ (y * 668265263);
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h ^ (h >>> 16)) >>> 0;
}

function u01(u) {
  return (u >>> 0) / 4294967295;
}

function toScreenPx(worldX, worldY, worldLeft, worldTop, zoom) {
  return {
    x: Math.round((worldX - worldLeft) * zoom),
    y: Math.round((worldY - worldTop) * zoom),
  };
}

// deterministic spawn decision helper
function wantsSpawn(tileX, tileY, seed, chance) {
  return u01(hash2i(tileX, tileY, seed + 9000)) < chance;
}

// pick a point inside/around the tile (in world px)
// radiusPx can exceed TILE/2 to “break the grid” by letting some tufts drift near edges.
function radialOffset(tileX, tileY, seed, salt, radiusPx) {
  const a = u01(hash2i(tileX, tileY, seed + salt)) * Math.PI * 2;
  // bias toward small offsets but still allow bigger ones
  const r = Math.pow(u01(hash2i(tileX, tileY, seed + salt + 1)), 0.6) * radiusPx;
  return { dx: Math.cos(a) * r, dy: Math.sin(a) * r * 0.65 }; // less vertical spread looks nicer
}

/* registry */
export function makeDefaultFoliageRegistry(assets) {
  const { tuft1, tuft2 } = assets;

  return [
    {
      id: "grass_tufts",
      allowedTerrain: new Set([TERRAIN_ID.GRASS]),

      // base chance a tile has any tufts
      chance: 0.15, // try 0.10..0.20

      // chance to add a 2nd tuft on the same tile (stack/combos)
      extraChance: 0.33, // try 0.20..0.50

      // how far a tuft can drift from the tile's “anchor” (world px)
      scatterPx: 7.0, // bigger = less grid (try 5..9)

      variants: [{ img: tuft1 }, { img: tuft2 }],

      // size (world px) before zoom
      baseW: TILE,
      baseH: TILE,

      // IMPORTANT: not hard-center — we’ll choose per-instance anchor inside the tile
      // (we still draw with bottom-center anchoring, but placement point varies)
      anchorX: 0.5,
      anchorY: 1.0,

      sway: {
        enabled: true,
        rotAmp: 0.020, // calmer bend
        skewAmp: 0.015,
        speedJitter: 0.25,
      },
    },
  ];
}

export function renderFoliage(ctx, frame, deps) {
  const { w, h, camX, camY, zoom } = frame;
  const { getTileId, preloadAroundWorldTile } = deps.world;

  const foliage = deps.foliage;
  if (!foliage) return;

  const seed = Number.isFinite(foliage.seed) ? foliage.seed : 1337;
  const registry =
    foliage.registry || makeDefaultFoliageRegistry(foliage.assets || {});

  const now = performance.now() * 0.001;

  const viewWorldW = w / zoom;
  const viewWorldH = h / zoom;

  const worldLeft = camX - viewWorldW / 2;
  const worldTop = camY - viewWorldH / 2;

  const firstTileX = Math.floor(worldLeft / TILE) - 1;
  const firstTileY = Math.floor(worldTop / TILE) - 1;

  const tilesWide = Math.ceil(viewWorldW / TILE) + 3;
  const tilesHigh = Math.ceil(viewWorldH / TILE) + 3;

  const camTileX = Math.floor(camX / TILE);
  const camTileY = Math.floor(camY / TILE);
  preloadAroundWorldTile?.(camTileX, camTileY);

  const prevSmooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;

  // one rule for now
  const rule = registry[0];
  if (!rule) return;

  const usable = (rule.variants || []).filter((v) => v?.img);
  if (usable.length === 0) return;

  // shared global wind (smooth)
  const wind =
    Math.sin(now * 0.35) * 0.65 + Math.sin(now * 0.12 + 1.7) * 0.35;

  for (let ty = 0; ty < tilesHigh; ty++) {
    const tileY = firstTileY + ty;

    for (let tx = 0; tx < tilesWide; tx++) {
      const tileX = firstTileX + tx;

      const terrainId = getTileId(tileX, tileY);
      if (terrainId !== TERRAIN_ID.GRASS) continue;

      // tile spawns anything?
      if (!wantsSpawn(tileX, tileY, seed, rule.chance)) continue;

      // how many tufts on this tile (1 or 2)
      const addExtra =
        u01(hash2i(tileX, tileY, seed + 9100)) < (rule.extraChance ?? 0);
      const count = addExtra ? 2 : 1;

      for (let k = 0; k < count; k++) {
        // per-instance salt so 2nd tuft doesn’t mirror 1st
        const salt = 20000 + k * 1000;

        // choose variant
        const variantIndex =
          (hash2i(tileX + k * 17, tileY - k * 23, seed + 123456) >>> 0) %
          usable.length;
        const img = usable[variantIndex].img;

        // random flipX
        const flipX =
          (hash2i(tileX + k * 31, tileY + k * 29, seed + 55555) & 1) === 1;

        // scatter: pick a point within/around the tile, not centered
        const scatter = rule.scatterPx ?? 6;
        const off = radialOffset(tileX, tileY, seed, salt, scatter);

        // also vary within-tile “anchor” so it breaks lines further
        const ax =
          0.25 + 0.50 * u01(hash2i(tileX, tileY, seed + salt + 77)); // 0.25..0.75
        const ay =
          0.70 + 0.30 * u01(hash2i(tileX, tileY, seed + salt + 88)); // 0.70..1.00

        const worldX = tileX * TILE + TILE * ax + off.dx;
        const worldY = tileY * TILE + TILE * ay + off.dy;

        const p = toScreenPx(worldX, worldY, worldLeft, worldTop, zoom);

        // sway: global wind + slight flutter per tuft
        const phase =
          u01(hash2i(tileX + k * 101, tileY + k * 103, seed + 7777)) *
          Math.PI *
          2;
        const response =
          0.85 +
          0.35 *
            u01(hash2i(tileX + k * 107, tileY + k * 109, seed + 8888));

        const flutter =
          Math.sin(
            now * (1.6 + (rule.sway?.speedJitter ?? 0.25) * response) + phase
          ) * 0.12;

        const s = wind + flutter;

        const rot = s * (rule.sway?.rotAmp ?? 0.02) * response;
        const skewX = s * (rule.sway?.skewAmp ?? 0) * response;

        const drawW = (rule.baseW ?? TILE) * zoom;
        const drawH = (rule.baseH ?? TILE) * zoom;

        // bottom-center pivot offsets
        const ox = Math.round(drawW * 0.5);
        const oy = Math.round(drawH * 1.0);

        // keep bottom planted (split draw)
        const rootedPx = Math.round(drawH * 0.58);

        // 1) rooted bottom (no bend)
        ctx.save();
        ctx.translate(p.x, p.y);

        if (flipX) ctx.scale(-1, 1);

        ctx.beginPath();
        ctx.rect(-ox, -rootedPx, drawW, rootedPx);
        ctx.clip();

        ctx.drawImage(img, -ox, -oy, drawW, drawH);
        ctx.restore();

        // 2) bending top
        ctx.save();
        ctx.translate(p.x, p.y);

        if (flipX) ctx.scale(-1, 1);

        ctx.rotate(rot);
        if (skewX) ctx.transform(1, 0, skewX, 1, 0, 0);

        ctx.beginPath();
        ctx.rect(-ox, -drawH, drawW, drawH - rootedPx);
        ctx.clip();

        ctx.drawImage(img, -ox, -oy, drawW, drawH);
        ctx.restore();
      }
    }
  }

  ctx.imageSmoothingEnabled = prevSmooth;
}
