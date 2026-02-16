import "./styles/MainViewport.css";
import { useViewportRenderer } from "./render/viewport/useViewportRenderer";
import { useRef, useCallback } from "react";

import { useTerrainAtlas } from "./render/systems/terrain/useTerrainAtlas";
import { renderTerrain } from "./render/systems/terrain/terrainRenderer";

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

  const render = useCallback(
    (ctx, frame) => {
      renderTerrain(ctx, frame, { world, atlas });
    },
    [world, atlas]
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
