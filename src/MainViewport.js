import "./styles/MainViewport.css";
import { useViewportRenderer } from "./render/viewport/useViewportRenderer";
import { useRef, useCallback } from "react";

import { useTerrainAtlas } from "./render/systems/terrain/useTerrainAtlas";
import { renderTerrain } from "./render/systems/terrain/terrainRenderer";

export default function MainViewport({
  world, // ✅ world comes from App now
  cameraX = 0,
  cameraY = 0,
  canvasRef,
  zoom = 2,
}) {
  const localCanvasRef = useRef(null);
  const refToUse = canvasRef || localCanvasRef;

  const camTargetRef = useRef({ x: cameraX, y: cameraY });
  const EPS = 0.25;

  if (Math.abs(cameraX - camTargetRef.current.x) >= EPS) {
    camTargetRef.current.x = cameraX;
  }
  if (Math.abs(cameraY - camTargetRef.current.y) >= EPS) {
    camTargetRef.current.y = cameraY;
  }

  const camSmoothRef = useRef({ x: cameraX, y: cameraY });

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
