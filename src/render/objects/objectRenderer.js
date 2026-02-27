// src/render/systems/objects/objectRenderer.js

const IMG_CACHE = new Map(); // src -> { img, ok, err, warned }

function getImgRecord(src) {
  if (!src) return null;

  if (IMG_CACHE.has(src)) return IMG_CACHE.get(src);

  const img = new Image();

  const rec = {
    img,
    ok: false,
    err: false,
    warned: false,
  };

  img.onload = () => {
    rec.ok = true;
    rec.err = false;
  };

  img.onerror = () => {
    rec.ok = false;
    rec.err = true;
  };

  img.src = src;

  IMG_CACHE.set(src, rec);
  return rec;
}

function isDrawable(img) {
  return !!img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
}

function hexToRGBA(hex, a) {
  const s = String(hex || "").replace("#", "").trim();
  if (s.length !== 6) return `rgba(255,122,61,${a})`;
  const r = parseInt(s.slice(0, 2), 16);
  const g = parseInt(s.slice(2, 4), 16);
  const b = parseInt(s.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// deterministic tiny randomness (stable per object)
function stableRand01(key) {
  const s = String(key ?? "");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function getTimeSeconds(frame) {
  const t = frame?.t ?? frame?.time ?? performance.now();
  return t > 10_000 ? t / 1000 : t;
}

// determine if object should get aura/hover
function isInteractive(def, obj) {
  if (def && typeof def.interactive === "boolean") return def.interactive;
  if (def && typeof def.pickupable === "boolean") return def.pickupable;
  if (def && typeof def.usable === "boolean") return def.usable;

  if (obj && (obj.pickupable || obj.usable || obj.interactive)) return true;

  return false;
}

/**
 * Pick sprite source for an object.
 */
function pickSpriteSrc(def, obj, t) {
  const frames = def?.frames;

  if (Array.isArray(frames) && frames.length) {
    const fps = Math.max(1, Number(def?.fps || 8));
    const key = obj?._id || `${obj?.defId}:${obj?.x},${obj?.y}`;
    const phase = stableRand01(key);
    const len = frames.length;
    const idx = Math.floor(t * fps + phase * len) % len;
    return frames[(idx + len) % len];
  }

  return def?.sprite || obj?.sprite || "";
}

export function renderWorldObjects(
  ctx,
  frame,
  { objects = [], objectDefs = {} } = {}
) {
  if (!objects.length) return;

  const z = Math.max(1, Math.floor(Number(frame?.zoom) || 1));
  const camX = Number(frame?.camX || 0);
  const camY = Number(frame?.camY || 0);
  const cx = (frame?.w || ctx.canvas.width) / 2;
  const cy = (frame?.h || ctx.canvas.height) / 2;

  const t = getTimeSeconds(frame);

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  for (const obj of objects) {
    if (!obj) continue;

    const defId = String(obj.defId || "");
    const def = objectDefs?.[defId] || null;

    const spriteSrc = pickSpriteSrc(def, obj, t);
    if (!spriteSrc) continue;

    const rec = getImgRecord(spriteSrc);
    if (!rec) continue;

    if (rec.err) {
      if (!rec.warned) {
        rec.warned = true;
        console.warn("[renderWorldObjects] BROKEN spriteSrc:", spriteSrc);
      }
      continue;
    }

    const img = rec.img;
    if (!isDrawable(img)) continue;

    const wx = Number(obj.x || 0);
    const wy = Number(obj.y || 0);

    const sx = cx + (wx - camX) * z;
    const sy = cy + (wy - camY) * z;

    const baseSize = Number(def?.sizePx ?? obj?.sizePx ?? 16);
    const dw = baseSize * z;
    const dh = baseSize * z;

    const dx = Math.round(sx - dw / 2);
    const dy = Math.round(sy - dh / 2);

    // ─────────────────────────────
    // LIGHT (torches, campfires only)
    // ─────────────────────────────
    const light = def?.light;
    if (light?.radius) {
      const baseR = Number(light.radius) * z;
      const baseCol = String(light.color || "#ff7a3d");

      const key = obj?._id || `${defId}:${wx},${wy}`;
      const seed = stableRand01(key);
      const phase = seed * Math.PI * 2;

      const w1 = Math.sin(t * 9.5 + phase);
      const w2 = Math.sin(t * 13.7 + phase * 1.7);
      const flick = w1 * 0.6 + w2 * 0.4;

      const radiusMul = 1 + flick * 0.06;
      const intensityMul = 1 + flick * 0.18;

      const r = baseR * radiusMul;

      const a0 = clamp01(0.26 * intensityMul);
      const a1 = clamp01(0.14 * intensityMul);
      const a2 = clamp01(0.06 * intensityMul);

      const outerCol = "#ff3b2f";

      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
      grad.addColorStop(0.0, hexToRGBA(baseCol, a0));
      grad.addColorStop(0.18, hexToRGBA(baseCol, a1));
      grad.addColorStop(0.45, hexToRGBA(baseCol, a2));
      grad.addColorStop(0.72, hexToRGBA(outerCol, 0.028 * intensityMul));
      grad.addColorStop(1.0, hexToRGBA(outerCol, 0.0));

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ─────────────────────────────
    // MAIN SPRITE (no default glow)
    // ─────────────────────────────
    ctx.save();

    const interactive = isInteractive(def, obj);

    if (interactive) {
      ctx.shadowColor = "rgba(165,130,255,0.30)";
      ctx.shadowBlur = 10 * z;
    }

    ctx.drawImage(img, dx, dy, dw, dh);

    if (interactive) {
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.32;
      const o = Math.max(1, Math.round(1 * z));
      ctx.drawImage(img, dx - o, dy, dw, dh);
      ctx.drawImage(img, dx + o, dy, dw, dh);
      ctx.drawImage(img, dx, dy - o, dw, dh);
      ctx.drawImage(img, dx, dy + o, dw, dh);

      ctx.globalAlpha = 1;
      ctx.drawImage(img, dx, dy, dw, dh);
    }

    ctx.restore();
  }

  ctx.restore();
}