// src/render/systems/sprites/sortedSpriteRenderer.js
// Unified sprite renderer: world objects + players in ONE depth-sorted pass.
//
// Changes:
// - Accepts `predictedLocalPos` (optional) — use this for local player rendering
//   instead of server snapshot position, so player sprite is glued to predicted pos.
// - Objects: depth anchor is obj.y (with optional depthOffsetY)
// - Players: depth anchor is FEET = center.y + spriteH/2
//   (spriteH is in world units — same scale as world coords)

const IMG_CACHE = new Map();
const SMOOTH_POS = new Map();

const SMOOTH_FOLLOW_REMOTE = 30;
const SMOOTH_FOLLOW_OBJECTS = 28;

function getImgRecord(src) {
  if (!src) return null;
  if (IMG_CACHE.has(src)) return IMG_CACHE.get(src);
  const img = new Image();
  const rec = { img, ok: false, err: false, warned: false };
  img.onload = () => { rec.ok = true; rec.err = false; };
  img.onerror = () => { rec.ok = false; rec.err = true; };
  img.src = src;
  IMG_CACHE.set(src, rec);
  return rec;
}

function isDrawable(img) {
  return !!img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
}

function stableRand01(key) {
  const s = String(key ?? "");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function getTimeSeconds(frame) {
  const t = frame?.t ?? frame?.time ?? performance.now();
  return t > 10_000 ? t / 1000 : t;
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function hexToRGBA(hex, a) {
  const s = String(hex || "").replace("#", "").trim();
  if (s.length !== 6) return `rgba(255,122,61,${a})`;
  const r = parseInt(s.slice(0, 2), 16);
  const g = parseInt(s.slice(2, 4), 16);
  const b = parseInt(s.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function isInteractive(def, obj) {
  if (def && typeof def.interactive === "boolean") return def.interactive;
  if (def && typeof def.pickupable === "boolean") return def.pickupable;
  if (def && typeof def.usable === "boolean") return def.usable;
  if (obj && (obj.pickupable || obj.usable || obj.interactive)) return true;
  return false;
}

function pickObjectSpriteSrc(def, obj, t) {
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

function worldToScreen(frame, wx, wy) {
  const z = Math.max(1, Math.floor(Number(frame?.zoom) || 1));
  const camX = Number(frame?.camX || 0);
  const camY = Number(frame?.camY || 0);
  const cx = (frame?.w || frame?.canvas?.width || 0) / 2;
  const cy = (frame?.h || frame?.canvas?.height || 0) / 2;
  const sx = cx + (Number(wx || 0) - camX) * z;
  const sy = cy + (Number(wy || 0) - camY) * z;
  return { sx, sy, z };
}

function smoothWorldPos(id, wx, wy, dt, follow) {
  const key = String(id || "");
  if (!key) return { x: wx, y: wy };
  const prev = SMOOTH_POS.get(key);
  if (!prev) {
    const v = { x: wx, y: wy };
    SMOOTH_POS.set(key, v);
    return v;
  }
  const k = 1 - Math.exp(-Math.max(1, follow) * Math.max(0, dt || 0.016));
  prev.x += (wx - prev.x) * k;
  prev.y += (wy - prev.y) * k;
  return prev;
}

function drawLight(ctx, t, z, sx, sy, light, key) {
  if (!light?.radius) return;
  const baseR = Number(light.radius) * z;
  const baseCol = String(light.color || "#ff7a3d");
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

function makeObjectDrawable(obj, def, t) {
  const defId = String(obj?.defId || "");
  const spriteSrc = pickObjectSpriteSrc(def, obj, t);
  if (!spriteSrc) return null;

  const baseSize = Number(def?.sizePx ?? obj?.sizePx ?? 16);
  const anchorX = Number.isFinite(def?.anchorX) ? Number(def.anchorX) : 0.5;
  const anchorY = Number.isFinite(def?.anchorY) ? Number(def.anchorY) : 0.5;

  // ✅ Depth = where the object contacts the ground.
  // obj.y IS the anchor point already. If anchorY=1 (bottom), obj.y IS the feet.
  // If anchorY=0.5 (center), feet = obj.y + baseSize * 0.5.
  // Use depthOffsetY for manual tuning (e.g. tree base).
  const depthOffsetY = Number(def?.depthOffsetY || 0);
  
  // Calculate feet from anchor: if anchorY=1, feet=obj.y; if anchorY=0.5, feet=obj.y+half
  const halfH = baseSize * (1 - anchorY); // world units below anchor point
  const depthYWorld = Number(obj?.y || 0) + halfH + depthOffsetY;

  return {
    kind: "object",
    id: String(obj?._id || `${defId}:${obj?.x},${obj?.y}`),
    wx: Number(obj?.x || 0),
    wy: Number(obj?.y || 0),
    depthYWorld,
    spriteSrc,
    baseW: baseSize,
    baseH: baseSize,
    anchorX,
    anchorY,
    def,
    obj,
  };
}

/**
 * Player drawable.
 * 
 * Server sends CENTER position (x, y).
 * We compute feetY = centerY + spriteH/2.
 * spriteH here is in WORLD units (same coordinate space as x,y).
 * 
 * For a 16px sprite at zoom=2: the sprite covers 8 world units tall.
 * So feetY = serverY + 8.
 * 
 * IMPORTANT: if predictedPos is provided (local player), use that instead
 * of the server snapshot so rendering stays glued to prediction.
 */
function makePlayerDrawable(id, p, spriteSrc, spriteW, spriteH, { isLocal, predictedPos }) {
  if (!spriteSrc) return null;

  // ✅ Use predicted position for local, server snapshot for remotes
  const wx = isLocal && predictedPos
    ? Number(predictedPos.x)
    : Number(p?.x || 0);

  const wyCenter = isLocal && predictedPos
    ? Number(predictedPos.y)
    : Number(p?.y || 0);

  // spriteH is the sprite height in WORLD UNITS.
  // Half the sprite is below center → that's where feet are.
  const halfH = Number(spriteH || 16) * 0.5;
  const feetY = wyCenter + halfH;

  const facing = p?.facing === "left" ? "left" : "right";

  return {
    kind: "player",
    id: String(id),
    wx,
    wy: feetY,          // feet position in world space (draw anchor)
    depthYWorld: feetY, // sort by feet
    spriteSrc,
    baseW: Number(spriteW || 16),
    baseH: Number(spriteH || 16),
    anchorX: 0.5,
    anchorY: 1.0,       // draw sprite bottom-anchored at feet
    facing,
    isLocal: Boolean(isLocal),
    p,
  };
}

function drawImageFlippedX(ctx, img, sx, sy, dw, dh, anchorX, anchorY) {
  ctx.translate(Math.round(sx), Math.round(sy));
  ctx.scale(-1, 1);
  const dx = Math.round(-dw * anchorX);
  const dy = Math.round(-dh * anchorY);
  ctx.drawImage(img, dx, dy, dw, dh);
}

export function renderSortedSprites(
  ctx,
  frame,
  {
    objects = [],
    objectDefs = {},

    playersById = null,
    playerIds = null,
    myId = null,

    // ✅ NEW: predicted local player position { x, y }
    // Pass getPredictedPos() result here each frame for glitch-free local rendering
    predictedLocalPos = null,

    getPlayerSpriteSrc = null,
    playerSpriteW = 16,
    playerSpriteH = 16,
  } = {}
) {
  const t = getTimeSeconds(frame);
  const dt = Number(frame?.dt || 0.016);

  const drawables = [];

  // Objects
  for (const obj of objects || []) {
    if (!obj) continue;
    const defId = String(obj.defId || "");
    const def = objectDefs?.[defId] || null;
    const d = makeObjectDrawable(obj, def, t);
    if (d) drawables.push(d);
  }

  // Players
  if (playersById && typeof getPlayerSpriteSrc === "function") {
    const ids = Array.isArray(playerIds) ? playerIds : Object.keys(playersById || {});
    for (const id of ids) {
      const p = playersById?.[id];
      if (!p) continue;
      const src = String(getPlayerSpriteSrc(id, p) || "");
      const isLocal = myId != null && String(id) === String(myId);
      const d = makePlayerDrawable(id, p, src, playerSpriteW, playerSpriteH, {
        isLocal,
        // ✅ only pass predicted pos to local player
        predictedPos: isLocal ? predictedLocalPos : null,
      });
      if (d) drawables.push(d);
    }
  }

  if (!drawables.length) return;

  // Stable sort: depthY then x then id
  drawables.sort((a, b) => {
    const dy = a.depthYWorld - b.depthYWorld;
    if (dy) return dy;
    const dx = a.wx - b.wx;
    if (dx) return dx;
    return String(a.id).localeCompare(String(b.id));
  });

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  for (const d of drawables) {
    const rec = getImgRecord(d.spriteSrc);
    if (!rec) continue;

    if (rec.err) {
      if (!rec.warned) {
        rec.warned = true;
        console.warn("[renderSortedSprites] BROKEN spriteSrc:", d.spriteSrc);
      }
      continue;
    }

    const img = rec.img;
    if (!isDrawable(img)) continue;

    // Smooth only non-local entities
    let sp = { x: d.wx, y: d.wy };
    if (d.kind === "object") {
      sp = smoothWorldPos(d.id, d.wx, d.wy, dt, SMOOTH_FOLLOW_OBJECTS);
    } else if (!d.isLocal) {
      sp = smoothWorldPos(d.id, d.wx, d.wy, dt, SMOOTH_FOLLOW_REMOTE);
    }
    // Local player: d.wx/d.wy already IS the predicted pos — no smoothing needed

    const { sx, sy, z } = worldToScreen(frame, sp.x, sp.y);

    const dw = d.baseW * z;
    const dh = d.baseH * z;

    const dx = Math.round(sx - dw * d.anchorX);
    const dy = Math.round(sy - dh * d.anchorY);

    // Object lights
    if (d.kind === "object") {
      const light = d.def?.light;
      if (light?.radius) {
        const key = d.obj?._id || `${String(d.obj?.defId || "")}:${d.wx},${d.wy}`;
        drawLight(ctx, t, z, sx, sy, light, key);
      }
    }

    ctx.save();

    if (d.kind === "object") {
      const interactive = isInteractive(d.def, d.obj);
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
    } else {
      // player
      if (d.facing === "left") {
        drawImageFlippedX(ctx, img, sx, sy, dw, dh, d.anchorX, d.anchorY);
      } else {
        ctx.drawImage(img, dx, dy, dw, dh);
      }
    }

    ctx.restore();
  }

  ctx.restore();
}