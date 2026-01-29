export function resizeCanvasToParent(canvas, ctx, dprCap) {
  const p = canvas.parentElement;
  if (!p) return null;

  const w = p.clientWidth;
  const h = p.clientHeight;

  const dpr = Math.min(dprCap, window.devicePixelRatio || 1);

  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;

  return { w, h, dpr };
}
