// src/render/systems/terrain/useTerrainAtlas.js
import { useEffect, useMemo, useState } from "react";
import { TILE, TERRAIN_ID } from "../../../world/worldConstants";

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = reject;
  });
}

/**
 * Terrain atlas rules:
 * - tiles are EXACTLY TILE x TILE (16x16)
 * - there is a GAP (empty pixels) between tiles
 * - there is a MARGIN from the top/left before the first tile
 *
 * Each tile "slot" starts every (TILE + GAP) pixels.
 */
export function useTerrainAtlas({
  atlasSrc = "/art/terrain/terrain.png",

  // ✅ UPDATED: your sheet is now 5 tiles across (grass x5 on row 0)
  atlasCols = 5,

  // ✅ keep these if your file still has 2px spacing + 2px margin
  gap = 2,
  margin = 2,

  // ✅ UPDATED layout (assuming):
  // row 0: grass x5 => indices 0..4
  // row 1: water x3 => indices 5..7  (water at row 1 col 0..2)
  grassTiles = [0, 1, 2, 3, 4],
  waterTiles = [5, 6, 7],
} = {}) {
  const [img, setImg] = useState(null);

  useEffect(() => {
    let alive = true;
    loadImage(atlasSrc)
      .then((i) => alive && setImg(i))
      .catch((e) => console.error("Failed to load terrain atlas", e));
    return () => {
      alive = false;
    };
  }, [atlasSrc]);

  const SLOT = TILE + gap;

  const tileIndexToSrc = useMemo(() => {
    return (tileIndex) => {
      const col = tileIndex % atlasCols;
      const row = Math.floor(tileIndex / atlasCols);

      const sx = margin + col * SLOT;
      const sy = margin + row * SLOT;

      return { sx, sy };
    };
  }, [atlasCols, SLOT, margin]);

  const terrainToVariants = useMemo(
    () => ({
      [TERRAIN_ID.GRASS]: grassTiles,
      [TERRAIN_ID.DEEP_OCEAN]: waterTiles,
    }),
    [grassTiles, waterTiles]
  );

  return useMemo(
    () => ({
      img,
      atlasCols,
      tileIndexToSrc,
      terrainToVariants,
    }),
    [img, atlasCols, tileIndexToSrc, terrainToVariants]
  );
}
