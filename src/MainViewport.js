// src/render/viewport/MainViewport.jsx
import { useRef } from "react";
import "./styles/MainViewport.css";
import { useViewportRenderer } from "./render/viewport/useViewportRenderer";

export default function MainViewport({ worldSeed, cameraX = 0, cameraY = 0 }) {
  const canvasRef = useRef(null);

  const camTargetRef = useRef({ x: cameraX, y: cameraY });
  camTargetRef.current.x = cameraX;
  camTargetRef.current.y = cameraY;

  const camSmoothRef = useRef({ x: cameraX, y: cameraY });

  useViewportRenderer({ canvasRef, worldSeed, camTargetRef, camSmoothRef });

  return (
    <div className="main-viewport">
      <canvas ref={canvasRef} />
    </div>
  );
}
