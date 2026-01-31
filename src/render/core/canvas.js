// src/render/core/canvas.js

export function resizeCanvasToParent(canvas, ctx, dprCap = 2) {
  const p = canvas.parentElement;
  if (!p) return null;

  const rect = p.getBoundingClientRect();
  const cssW = Math.max(1, rect.width | 0);
  const cssH = Math.max(1, rect.height | 0);

  const dpr = Math.min(dprCap, window.devicePixelRatio || 1);

  const bufW = Math.max(1, (cssW * dpr) | 0);
  const bufH = Math.max(1, (cssH * dpr) | 0);

  if (canvas.width !== bufW) canvas.width = bufW;
  if (canvas.height !== bufH) canvas.height = bufH;

  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;

  return { w: cssW, h: cssH, dpr };
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
