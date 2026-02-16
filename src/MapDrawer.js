import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import "./styles/MapDrawer.css";

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export default function MapDrawer({ open, onClose, renderMapFrame }) {
  const canvasRef = useRef(null);

  // Zoom limits (only “certain percentage”)
  const ZOOM_MIN = 0.8;
  const ZOOM_MAX = 1.4;
  const ZOOM_STEP = 0.1;

  const [zoom, setZoom] = useState(1);

  // Reset zoom when opening (optional; remove if you want it remembered)
  useEffect(() => {
    if (open) setZoom(1);
  }, [open]);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
      if (e.key === "+" || e.key === "=") setZoom((z) => clamp(z + ZOOM_STEP, ZOOM_MIN, ZOOM_MAX));
      if (e.key === "-" || e.key === "_") setZoom((z) => clamp(z - ZOOM_STEP, ZOOM_MIN, ZOOM_MAX));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const zoomIn = useCallback(() => {
    setZoom((z) => clamp(z + ZOOM_STEP, ZOOM_MIN, ZOOM_MAX));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => clamp(z - ZOOM_STEP, ZOOM_MIN, ZOOM_MAX));
  }, []);

  const zoomReset = useCallback(() => setZoom(1), []);

  // wheel zoom on the canvas
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    function onWheel(e) {
      e.preventDefault();
      const dir = Math.sign(e.deltaY);
      setZoom((z) => clamp(z + (dir > 0 ? -ZOOM_STEP : ZOOM_STEP), ZOOM_MIN, ZOOM_MAX));
    }

    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [open]);

  // draw loop
  useEffect(() => {
    if (!open) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    let raf = 0;

    const draw = () => {
      const ctx = canvas.getContext("2d");
      const rect = canvas.getBoundingClientRect();

      const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      if (renderMapFrame) renderMapFrame(ctx, w, h, { zoom });

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [open, renderMapFrame, zoom]);

  const zoomLabel = useMemo(() => `${Math.round(zoom * 100)}%`, [zoom]);

  return (
    <>
      <div
        className={`mapModalBackdrop ${open ? "open" : ""}`}
        onMouseDown={onClose}
        aria-hidden={!open}
      />

      <div
        className={`mapModal ${open ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="mapModalHeader">
          <div className="mapModalTitle">World Map</div>

          <div className="mapModalControls">
            <button className="mapBtn" onClick={zoomOut} title="Zoom out">
              –
            </button>
            <div className="mapZoomLabel">{zoomLabel}</div>
            <button className="mapBtn" onClick={zoomIn} title="Zoom in">
              +
            </button>
            <button className="mapBtn subtle" onClick={zoomReset} title="Reset zoom">
              Reset
            </button>

            <button className="mapBtn close" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="mapModalBody">
          <canvas ref={canvasRef} className="mapCanvas" />
        </div>

        <div className="mapHint">Scroll to zoom • {Math.round(ZOOM_MIN * 100)}–{Math.round(ZOOM_MAX * 100)}%</div>
      </div>
    </>
  );
}
