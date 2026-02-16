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
 * Your atlas (confirmed by inspecting terrain.png):
 * - tiles are EXACTLY 16x16
 * - there is a 2px GAP between tiles (empty space)
 * - there is a 2px MARGIN from the top/left before the first tile
 *
 * So each tile "slot" starts every (16 + 2) pixels.
 * No inner padding. Just spacing.
 */
export function useTerrainAtlas({
  atlasSrc = "/art/terrain/terrain.png",

  // Your sheet has 3 tiles per row (grass x3 on row 0, water x3 on row 1)
  atlasCols = 3,

  // ✅ correct for your file
  gap = 2,
  margin = 2,

  // Layout:
  // grass: row 0 col 0..2 => indices 0,1,2
  // water: row 1 col 0..2 => indices 3,4,5
  grassTiles = [0, 1, 2],
  waterTiles = [3, 4, 5],
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
