// src/render/systems/terrain/terrainRenderer.js
import { TILE, TERRAIN_ID } from "../../../world/worldConstants";

// tiny deterministic hash (stable “random”)
function hash2i(x, y, seed = 777) {
  let h = seed ^ (x * 374761393) ^ (y * 668265263);
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h ^ (h >>> 16)) >>> 0;
}

function drawTile(ctx, img, sx, sy, dx, dy, size, flipX, flipY) {
  ctx.save();
  ctx.translate(dx + (flipX ? size : 0), dy + (flipY ? size : 0));
  ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  ctx.drawImage(img, sx, sy, TILE, TILE, 0, 0, size, size);
  ctx.restore();
}

// ✅ Underpaint colors so transparent pixels don't show black "grout"
const UNDERPAINT = {
  [TERRAIN_ID.GRASS]: "#176414",
  [TERRAIN_ID.DEEP_OCEAN]: "#0e3a59",
  [TERRAIN_ID.UNKNOWN]: "#000000",
};

export function renderTerrain(ctx, frame, deps) {
  const { w, h, camX, camY, zoom } = frame;
  const { meta, getTileId, preloadAroundWorldTile } = deps.world;
  const atlas = deps.atlas;

  if (!meta || !atlas.img) return;

  // Visible world rect in world-pixels
  const viewWorldW = w / zoom;
  const viewWorldH = h / zoom;

  const worldLeft = camX - viewWorldW / 2;
  const worldTop = camY - viewWorldH / 2;

  const firstTileX = Math.floor(worldLeft / TILE) - 1;
  const firstTileY = Math.floor(worldTop / TILE) - 1;

  const tilesWide = Math.ceil(viewWorldW / TILE) + 3;
  const tilesHigh = Math.ceil(viewWorldH / TILE) + 3;

  // Preload chunks around camera
  const camTileX = Math.floor(camX / TILE);
  const camTileY = Math.floor(camY / TILE);
  preloadAroundWorldTile(camTileX, camTileY);

  const dstSize = TILE * zoom;

  for (let ty = 0; ty < tilesHigh; ty++) {
    const tileY = firstTileY + ty;
    for (let tx = 0; tx < tilesWide; tx++) {
      const tileX = firstTileX + tx;

      const id = getTileId(tileX, tileY);

      const variants = atlas.terrainToVariants[id] || [];
      if (variants.length === 0) continue;

      const r = hash2i(tileX, tileY, 777);
      const variantIndex = variants[r % variants.length];
      const flipX = (r & 1) === 1;
      const flipY = (r & 2) === 2;

      const { sx, sy } = atlas.tileIndexToSrc(variantIndex);

      // destination in screen pixels (integer snapped)
      const dx = Math.floor((tileX * TILE - worldLeft) * zoom);
      const dy = Math.floor((tileY * TILE - worldTop) * zoom);

      // ✅ underpaint first (hides alpha holes on tile edges)
      ctx.fillStyle = UNDERPAINT[id] ?? "#000";
      ctx.fillRect(dx, dy, dstSize, dstSize);

      // then draw tile art
      drawTile(ctx, atlas.img, sx, sy, dx, dy, dstSize, flipX, flipY);
    }
  }
}
