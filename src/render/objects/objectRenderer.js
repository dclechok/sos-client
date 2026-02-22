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
  // complete can be true even when broken; naturalWidth/Height catches that
  return !!img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
}

function hexToRGBA(hex, a) {
  const s = String(hex || "").replace("#", "").trim();
  if (s.length !== 6) return `rgba(255,122,61,${a})`; // warmer default
  const r = parseInt(s.slice(0, 2), 16);
  const g = parseInt(s.slice(2, 4), 16);
  const b = parseInt(s.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// --- deterministic per-object tiny randomness (no jitter between frames)
function stableRand01(key) {
  const s = String(key ?? "");
  let h = 2166136261; // FNV-ish
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // 0..1
  return ((h >>> 0) % 10000) / 10000;
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

// Smooth-ish flicker: blend a couple sine waves with per-object phase.
// frame.t should be time in seconds OR ms; we handle both.
function getTimeSeconds(frame) {
  const t = frame?.t ?? frame?.time ?? performance.now();
  // if it's huge, assume ms
  return t > 10_000 ? t / 1000 : t;
}

export function renderWorldObjects(ctx, frame, { objects = [], objectDefs = {} } = {}) {
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

    const spriteSrc = def?.sprite || obj?.sprite;
    if (!spriteSrc) {
      console.log("[renderWorldObjects] NO spriteSrc for obj:", {
        _id: obj?._id,
        defId: obj?.defId,
        objSprite: obj?.sprite,
        defSprite: def?.sprite,
      });
      continue;
    }

    const rec = getImgRecord(spriteSrc);
    if (!rec) continue;

    // If it errored, log once and skip forever
    if (rec.err) {
      if (!rec.warned) {
        rec.warned = true;
        console.warn("[renderWorldObjects] BROKEN spriteSrc:", spriteSrc, {
          _id: obj?._id,
          defId: obj?.defId,
          objSprite: obj?.sprite,
          defSprite: def?.sprite,
        });
      }
      continue;
    }

    const img = rec.img;
    if (!isDrawable(img)) continue;

    const wx = Number(obj.x || 0);
    const wy = Number(obj.y || 0);

    // world -> screen
    const sx = cx + (wx - camX) * z;
    const sy = cy + (wy - camY) * z;

    const baseSize = Number(def?.sizePx || obj?.sizePx || 32);
    const dw = baseSize * z;
    const dh = baseSize * z;

    const dx = Math.round(sx - dw / 2);
    const dy = Math.round(sy - dh / 2);

    // LIGHT glow behind sprite
    const light = def?.light;
    if (light?.radius) {
      const baseR = Number(light.radius) * z;

      // Better campfire default: warmer, less lemon-yellow
      const baseCol = String(light.color || "#ff7a3d"); // ember orange

      // per-object stable variation + phase
      const key = obj?._id || `${defId}:${wx},${wy}`;
      const seed = stableRand01(key);
      const phase = seed * Math.PI * 2;

      // Flicker:
      // - radius wobble ~ +/- 6%
      // - intensity wobble ~ +/- 18%
      // Keep it subtle; too much looks like a strobe.
      const w1 = Math.sin(t * 9.5 + phase);
      const w2 = Math.sin(t * 13.7 + phase * 1.7);
      const flick = (w1 * 0.6 + w2 * 0.4); // -1..1-ish

      const radiusMul = 1 + flick * 0.06;
      const intensityMul = 1 + flick * 0.18;

      const r = baseR * radiusMul;

      // Softer edges: concentrate light near center, fade sooner, then long tail
      const a0 = clamp01(0.26 * intensityMul); // hot core
      const a1 = clamp01(0.14 * intensityMul); // mid glow
      const a2 = clamp01(0.06 * intensityMul); // outer warmth

      // Add a subtle red-ish outer ring to avoid "perfect yellow disk"
      const outerCol = "#ff3b2f"; // deep ember red (very low alpha)

      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
      grad.addColorStop(0.00, hexToRGBA(baseCol, a0));
      grad.addColorStop(0.18, hexToRGBA(baseCol, a1));
      grad.addColorStop(0.45, hexToRGBA(baseCol, a2));

      // smoother falloff / edge fade
      grad.addColorStop(0.72, hexToRGBA(outerCol, 0.028 * intensityMul));
      grad.addColorStop(1.00, hexToRGBA(outerCol, 0.0));

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // halo + outline + main (your existing style)
    ctx.save();

    ctx.shadowColor = "rgba(165,130,255,0.30)";
    ctx.shadowBlur = 10 * z;
    ctx.drawImage(img, dx, dy, dw, dh);

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.32;
    const o = Math.max(1, Math.round(1 * z));
    ctx.drawImage(img, dx - o, dy, dw, dh);
    ctx.drawImage(img, dx + o, dy, dw, dh);
    ctx.drawImage(img, dx, dy - o, dw, dh);
    ctx.drawImage(img, dx, dy + o, dw, dh);

    ctx.globalAlpha = 1;
    ctx.drawImage(img, dx, dy, dw, dh);

    ctx.restore();
  }

  ctx.restore();
}