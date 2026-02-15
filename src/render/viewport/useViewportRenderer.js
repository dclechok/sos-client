// src/render/viewport/useViewportRenderer.js
import { useEffect } from "react";
import { TUNABLES } from "../core/tunables";
import { resizeCanvasToParent } from "../core/canvas";

/**
 * Generic 2D viewport renderer.
 * - Adds consistent integer zoom support (pixel-art friendly)
 * - Calls `render(ctx, frame)` each frame if provided
 */
export function useViewportRenderer({
  canvasRef,
  camTargetRef,
  camSmoothRef,

  // Optional: plug in your fantasy renderer (map/tiles/sprites/UI)
  render, // (ctx, frame) => void

  // Optional: background clear
  clearColor = "#000",

  // ✅ NEW: world zoom (2/3/4...) - keep integer for crisp pixel art
  zoom = 4,

  // ✅ NEW: pixel-art mode (turns off smoothing + snaps camera)
  pixelArt = true,
}) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // alpha:false is still a nice perf win if you always clear
    const ctx = canvas.getContext("2d", { alpha: false });

    let raf = 0;
    let w = 0;
    let h = 0;
    let lastW = 0;
    let lastH = 0;
    let lastMs = 0;

    // force safe integer zoom
    const z = Math.max(1, Math.floor(Number(zoom) || 1));

    function resize() {
      const r = resizeCanvasToParent(canvas, ctx, TUNABLES.DPR_CAP);
      if (!r) return;
      if (r.w === lastW && r.h === lastH) return;

      lastW = r.w;
      lastH = r.h;
      w = r.w;
      h = r.h;
    }

    function updateCamera(dt) {
      const target = camTargetRef?.current;
      const smooth = camSmoothRef?.current;

      if (!target || !smooth) return { camX: 0, camY: 0 };

      if (!Number.isFinite(smooth.x) || !Number.isFinite(smooth.y)) {
        smooth.x = target.x || 0;
        smooth.y = target.y || 0;
      }

      const follow = Number.isFinite(TUNABLES?.CAMERA_FOLLOW)
        ? TUNABLES.CAMERA_FOLLOW
        : 10;

      const k = 1 - Math.exp(-follow * dt);
      smooth.x += ((target.x || 0) - smooth.x) * k;
      smooth.y += ((target.y || 0) - smooth.y) * k;

      // ✅ Pixel-art camera snap:
      // snap to 1/z world units so that after scaling by z we land on whole pixels
      if (pixelArt && z > 1) {
        smooth.x = Math.round(smooth.x * z) / z;
        smooth.y = Math.round(smooth.y * z) / z;
      }

      return { camX: smooth.x, camY: smooth.y };
    }

    function clear() {
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = clearColor;
      ctx.fillRect(0, 0, w, h);
    }

    function drawFrame(nowMs) {
      const t = nowMs * 0.001;
      const dtRaw = lastMs ? (nowMs - lastMs) * 0.001 : 0;
      const dt = Math.min(dtRaw, 0.033);
      lastMs = nowMs;

      resize();
      const { camX, camY } = updateCamera(dt);

      if (pixelArt) ctx.imageSmoothingEnabled = false;

      clear();

      if (typeof render === "function") {
        render(ctx, {
          dt,
          t,
          w,
          h,
          camX,
          camY,
          zoom: z,
          pixelArt,
          canvas,
        });
      }

      raf = requestAnimationFrame(drawFrame);
    }

    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(drawFrame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [canvasRef, camTargetRef, camSmoothRef, render, clearColor, zoom, pixelArt]);
}
