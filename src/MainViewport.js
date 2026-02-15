// src/render/viewport/MainViewport.jsx
import "./styles/MainViewport.css";
import { useViewportRenderer } from "./render/viewport/useViewportRenderer";
import { useRef } from "react";

export default function MainViewport({
  worldSeed, // (unused for now, but keeping your prop)
  cameraX = 0,
  cameraY = 0,
  canvasRef,

  //consistent pixel-art zoom (2/3/4...)
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

  useViewportRenderer({
    canvasRef: refToUse,
    camTargetRef,
    camSmoothRef,
    zoom,

    pixelArt: true,

    clearColor: "#000",

    // render: (ctx, frame) => { ... }  // plug in tilemap/entities later
  });

  return (
    <div className="main-viewport">
      <canvas ref={refToUse} />
    </div>
  );
}
