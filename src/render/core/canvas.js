// src/render/core/canvas.js

export function resizeCanvasToParent(canvas, ctx, dprCap = 2) {
  const p = canvas.parentElement;
  if (!p) return null;

  const rect = p.getBoundingClientRect();
  const cssW = Math.max(1, rect.width | 0);
  const cssH = Math.max(1, rect.height | 0);

  // ✅ Canvas buffer = CSS size, no DPR scaling
  // DOM overlay (PlayerRenderer) lives in CSS pixel space,
  // so canvas must also live in CSS pixel space or worldToScreen breaks.
  if (canvas.width !== cssW) canvas.width = cssW;
  if (canvas.height !== cssH) canvas.height = cssH;

  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;

  // ✅ Reset transform — no DPR scale applied
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // ✅ Pixel art mode — no smoothing
  ctx.imageSmoothingEnabled = false;

  return { w: cssW, h: cssH, dpr: 1 };
}

export function clamp01(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
export function smoothstep(t) {
  return t * t * (3 - 2 * t);
}
export function lerp(a, b, t) {
  return a + (b - a) * t;
}