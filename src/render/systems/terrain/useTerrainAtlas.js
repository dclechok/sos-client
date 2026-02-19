// src/render/systems/terrain/useTerrainAtlas.js
import { useEffect, useMemo, useState } from "react";
import { TERRAIN_ID } from "../../../world/worldConstants";
import { TERRAIN_ATLAS_LAYOUT } from "./terrainLayout";

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = reject;
  });
}

function rowDescToIndices({ row, startCol, count }, atlasCols) {
  return Array.from({ length: count }, (_, i) => row * atlasCols + startCol + i);
}

export function useTerrainAtlas({ atlasSrc = "/art/terrain/terrain.png" } = {}) {
  const [img, setImg] = useState(null);

  const { cols: atlasCols, tile: TILE_SIZE, gap, margin, rows } =
    TERRAIN_ATLAS_LAYOUT;
  const SLOT = TILE_SIZE + gap;

  useEffect(() => {
    let alive = true;
    loadImage(atlasSrc)
      .then((i) => alive && setImg(i))
      .catch((e) => console.error("Failed to load terrain atlas", e));
    return () => {
      alive = false;
    };
  }, [atlasSrc]);

  // ✅ add missing deps
  const grassTiles = useMemo(
    () => rowDescToIndices(rows.grass, atlasCols),
    [rows.grass, atlasCols]
  );
  const waterTiles = useMemo(
    () => rowDescToIndices(rows.water, atlasCols),
    [rows.water, atlasCols]
  );
  const shoreTiles = useMemo(
    () => rowDescToIndices(rows.shore, atlasCols),
    [rows.shore, atlasCols]
  );
  const shoreOuterCornerTiles = useMemo(
    () => rowDescToIndices(rows.shoreOuterCorner, atlasCols),
    [rows.shoreOuterCorner, atlasCols]
  );
  const shoreInnerCornerTiles = useMemo(
    () => rowDescToIndices(rows.shoreInnerCorner, atlasCols),
    [rows.shoreInnerCorner, atlasCols]
  );

  const tileIndexToSrc = useMemo(
    () => (tileIndex) => {
      const col = tileIndex % atlasCols;
      const row = Math.floor(tileIndex / atlasCols);
      return {
        sx: margin + col * SLOT,
        sy: margin + row * SLOT,
      };
    },
    [atlasCols, margin, SLOT]
  );

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
      tileIndexToSrc,
      terrainToVariants,
      shoreTiles,
      shoreOuterCornerTiles,
      shoreInnerCornerTiles,
    }),
    [
      img,
      tileIndexToSrc,
      terrainToVariants,
      shoreTiles,
      shoreOuterCornerTiles,
      shoreInnerCornerTiles,
    ]
  );
}