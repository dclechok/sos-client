// src/render/viewport/MainViewport.jsx
import "./styles/MainViewport.css";
import { useViewportRenderer } from "./render/viewport/useViewportRenderer";
import { useRef } from "react";

export default function MainViewport({
  worldSeed,
  cameraX = 0,
  cameraY = 0,
  canvasRef,
  worldBoot,
  bootApi,
}) {
  const localCanvasRef = useRef(null);
  const refToUse = canvasRef || localCanvasRef;

  const camTargetRef = useRef({ x: cameraX, y: cameraY });
  camTargetRef.current.x = cameraX;
  camTargetRef.current.y = cameraY;

  const camSmoothRef = useRef({ x: cameraX, y: cameraY });

  useViewportRenderer({
    canvasRef: refToUse,
    worldSeed,
    camTargetRef,
    camSmoothRef,

    // ✅ new
    worldBoot,
    bootApi,
  });

  return (
    <div className="main-viewport">
      <canvas ref={refToUse} />
    </div>
  );
}
