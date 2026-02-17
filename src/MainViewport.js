// src/MainViewport.jsx
import "./styles/MainViewport.css";
import { useViewportRenderer } from "./render/viewport/useViewportRenderer";
import { useRef, useCallback, useMemo } from "react";

import { useTerrainAtlas } from "./render/systems/terrain/useTerrainAtlas";
import { renderTerrain } from "./render/systems/terrain/terrainRenderer";

// ✅ NEW: foliage
import { useFoliageAssets } from "./render/systems/foliage/useFoliageAssets";
import {
  renderFoliage,
  makeDefaultFoliageRegistry,
} from "./render/systems/foliage/foliageRenderer";

export default function MainViewport({
  world,
  canvasRef,
  zoom = 2,

  // ✅ provided by App
  camTargetRef,
  camSmoothRef,
}) {
  const localCanvasRef = useRef(null);
  const refToUse = canvasRef || localCanvasRef;

  const atlas = useTerrainAtlas({
    atlasSrc: "/art/terrain/terrain.png",
    atlasCols: 3,
    gap: 2,
    margin: 2,
    grassTiles: [0, 1, 2],
    waterTiles: [3, 4, 5],
  });

  // ✅ load tuft images (adjust paths to your actual files)
  const foliageAssets = useFoliageAssets({
    tuft1Src: "/art/foliage/grasstuft1.png",
    tuft2Src: "/art/foliage/grasstuft2.png",
  });

  // ✅ optional: keep registry stable (so it doesn't reallocate every render)
  const foliageRegistry = useMemo(
    () => makeDefaultFoliageRegistry(foliageAssets),
    [foliageAssets]
  );

  const render = useCallback(
    (ctx, frame) => {
      // 1) ground
      renderTerrain(ctx, frame, { world, atlas });

      // 2) foliage pass (tufts only on grass, subtle per-tile sway)
      renderFoliage(ctx, frame, {
        world,
        foliage: {
          assets: foliageAssets,
          registry: foliageRegistry,
          seed: 4242, // ✅ use a stable value (or your WORLD_SEED)
        },
      });

      // 3) (later) player / entities / UI passes...
    },
    [world, atlas, foliageAssets, foliageRegistry]
  );

  useViewportRenderer({
    canvasRef: refToUse,
    camTargetRef,
    camSmoothRef,
    zoom,
    pixelArt: true,
    clearColor: "#000",
    render,
  });

  return (
    <div className="main-viewport">
      <canvas ref={refToUse} />
    </div>
  );
}
