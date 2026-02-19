import { TILE, TERRAIN_ID } from "../../../world/worldConstants";

function hash2i(x, y, seed = 777) {
  let h = seed ^ (x * 374761393) ^ (y * 668265263);
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h ^ (h >>> 16)) >>> 0;
}

function drawTile(ctx, img, sx, sy, dx, dy, size, rotation) {
  if (!rotation) {
    ctx.drawImage(img, sx, sy, TILE, TILE, dx, dy, size, size);
    return;
  }
  ctx.save();
  ctx.translate(dx + size / 2, dy + size / 2);
  ctx.rotate(rotation);
  ctx.drawImage(img, sx, sy, TILE, TILE, -size / 2, -size / 2, size, size);
  ctx.restore();
}

export function renderTerrain(ctx, frame, deps) {
  const { w, h, camX, camY, zoom } = frame;
  const { meta, getTileId, preloadAroundWorldTile } = deps.world;
  const atlas = deps.atlas;

  if (!meta || !atlas?.img) return;

  ctx.imageSmoothingEnabled = false;

  const viewWorldW = w / zoom;
  const viewWorldH = h / zoom;

  const worldLeft = camX - viewWorldW / 2;
  const worldTop  = camY - viewWorldH / 2;

  const firstTileX = Math.floor(worldLeft / TILE) - 1;
  const firstTileY = Math.floor(worldTop  / TILE) - 1;

  const tilesWide = Math.ceil(viewWorldW / TILE) + 3;
  const tilesHigh = Math.ceil(viewWorldH / TILE) + 3;

  const camTileX = Math.floor(camX / TILE);
  const camTileY = Math.floor(camY / TILE);
  preloadAroundWorldTile?.(camTileX, camTileY);

  const size = TILE * zoom;
  const variantsById = atlas.terrainToVariants || {};

  const straight    = Array.isArray(atlas.shoreTiles)            ? atlas.shoreTiles            : [];
  const depth       = Array.isArray(atlas.shoreDepthTiles)       ? atlas.shoreDepthTiles       : []; // ✅
  const outerCorner = Array.isArray(atlas.shoreOuterCornerTiles) ? atlas.shoreOuterCornerTiles : [];
  const innerCorner = Array.isArray(atlas.shoreInnerCornerTiles) ? atlas.shoreInnerCornerTiles : [];

  const OCEAN = TERRAIN_ID.DEEP_OCEAN;
  const GRASS = TERRAIN_ID.GRASS;

  for (let ty = 0; ty < tilesHigh; ty++) {
    const tileY = firstTileY + ty;

    for (let tx = 0; tx < tilesWide; tx++) {
      const tileX = firstTileX + tx;
      const id    = getTileId(tileX, tileY);

      const dx = Math.round((tileX * TILE - worldLeft) * zoom);
      const dy = Math.round((tileY * TILE - worldTop)  * zoom);

      if (id === TERRAIN_ID.UNKNOWN) {
        ctx.fillStyle = "#000";
        ctx.fillRect(dx, dy, size, size);
        continue;
      }

      // ── GRASS ─────────────────────────────────────────────────────────────
      if (id === GRASS) {
        const variants = variantsById[id];
        if (!variants || variants.length === 0) {
          ctx.fillStyle = "#f0f";
          ctx.fillRect(dx, dy, size, size);
          continue;
        }
        const r = hash2i(tileX, tileY, 777);
        const pick = variants[r % variants.length];
        const { sx, sy } = atlas.tileIndexToSrc(pick);
        drawTile(ctx, atlas.img, sx, sy, dx, dy, size, 0);
        continue;
      }

      // ── WATER ─────────────────────────────────────────────────────────────
      if (id === OCEAN) {
        const nId  = getTileId(tileX,     tileY - 1);
        const eId  = getTileId(tileX + 1, tileY    );
        const sId  = getTileId(tileX,     tileY + 1);
        const wId  = getTileId(tileX - 1, tileY    );
        const neId = getTileId(tileX + 1, tileY - 1);
        const seId = getTileId(tileX + 1, tileY + 1);
        const swId = getTileId(tileX - 1, tileY + 1);
        const nwId = getTileId(tileX - 1, tileY - 1);

        const allLoaded =
          nId  !== TERRAIN_ID.UNKNOWN && eId  !== TERRAIN_ID.UNKNOWN &&
          sId  !== TERRAIN_ID.UNKNOWN && wId  !== TERRAIN_ID.UNKNOWN &&
          neId !== TERRAIN_ID.UNKNOWN && seId !== TERRAIN_ID.UNKNOWN &&
          swId !== TERRAIN_ID.UNKNOWN && nwId !== TERRAIN_ID.UNKNOWN;

        const waterVariants = variantsById[id];
        if (waterVariants && waterVariants.length > 0) {
          const r = hash2i(tileX, tileY, 777);
          const pick = waterVariants[r % waterVariants.length];
          const { sx, sy } = atlas.tileIndexToSrc(pick);
          drawTile(ctx, atlas.img, sx, sy, dx, dy, size, 0);
        }

        if (!allLoaded) continue;

        const nGrass  = nId  === GRASS;
        const eGrass  = eId  === GRASS;
        const sGrass  = sId  === GRASS;
        const wGrass  = wId  === GRASS;
        const neGrass = neId === GRASS;
        const seGrass = seId === GRASS;
        const swGrass = swId === GRASS;
        const nwGrass = nwId === GRASS;

        const cardinalGrass     = nGrass || eGrass || sGrass || wGrass;
        const diagonalOnlyGrass = !cardinalGrass && (neGrass || seGrass || swGrass || nwGrass);

        if (cardinalGrass) {
          const grassCount = (nGrass?1:0) + (eGrass?1:0) + (sGrass?1:0) + (wGrass?1:0);

          if (grassCount >= 2 && innerCorner.length >= 4) {
            let pick = undefined;
            if      (nGrass && wGrass) { pick = innerCorner[2]; }
            else if (nGrass && eGrass) { pick = innerCorner[3]; }
            else if (sGrass && eGrass) { pick = innerCorner[0]; }
            else if (sGrass && wGrass) { pick = innerCorner[1]; }

            if (pick !== undefined) {
              const { sx, sy } = atlas.tileIndexToSrc(pick);
              drawTile(ctx, atlas.img, sx, sy, dx, dy, size, 0);
              continue;
            }
          }

          if (straight.length > 0) {
            const r = hash2i(tileX, tileY, 777);

            // ✅ only change: grass to north = would have been 180° rotation
            // use depth pool instead, no rotation, cliff face already correct
            if (nGrass && !sGrass) {
              const pool = depth.length > 0 ? depth : straight;
              const pick = pool[r % pool.length];
              const { sx, sy } = atlas.tileIndexToSrc(pick);
              drawTile(ctx, atlas.img, sx, sy, dx, dy, size, 0);
              continue;
            }

            // all other directions unchanged
            const pick = straight[r % straight.length];
            let rotation = 0;
            if      (sGrass && !nGrass) rotation = 0;
            else if (wGrass && !eGrass) rotation = Math.PI / 2;
            else if (eGrass && !wGrass) rotation = -Math.PI / 2;
            else if (sGrass && nGrass)  rotation = 0;
            else if (eGrass && wGrass)  rotation = -Math.PI / 2;

            const { sx, sy } = atlas.tileIndexToSrc(pick);
            drawTile(ctx, atlas.img, sx, sy, dx, dy, size, rotation);
            continue;
          }
        }

        if (diagonalOnlyGrass && outerCorner.length >= 4) {
          let pick = undefined;
          if      (seGrass) pick = outerCorner[0];
          else if (swGrass) pick = outerCorner[1];
          else if (neGrass) pick = outerCorner[2];
          else if (nwGrass) pick = outerCorner[3];

          if (pick !== undefined) {
            const { sx, sy } = atlas.tileIndexToSrc(pick);
            drawTile(ctx, atlas.img, sx, sy, dx, dy, size, 0);
          }
          continue;
        }

        continue;
      }

      // ── FALLBACK ──────────────────────────────────────────────────────────
      ctx.fillStyle = "#f0f";
      ctx.fillRect(dx, dy, size, size);
    }
  }
}