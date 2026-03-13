// src/render/systems/sprites/sortedSpriteRenderer.js
// Unified sprite renderer: world objects + players in ONE depth-sorted pass.
//
// Includes:
// - local predicted player rendering
// - object / player depth sorting
// - optional object lighting
// - optional occluder fading when the LOCAL player goes behind tall objects
//
// Object def usage:
//   occludesPlayer: true

const IMG_CACHE = new Map();
const SMOOTH_POS = new Map();

const SMOOTH_FOLLOW_REMOTE = 30;
const SMOOTH_FOLLOW_OBJECTS = 28;
const DEFAULT_OCCLUDE_ALPHA = 0.35;

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

  const depthOffsetY = Number(def?.depthOffsetY || 0);
  const spriteBottomY = Number(obj?.y || 0) + baseSize * (1 - anchorY);
  const depthYWorld = spriteBottomY + depthOffsetY;

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

function makePlayerDrawable(id, p, spriteSrc, spriteW, spriteH, { isLocal, predictedPos }) {
  if (!spriteSrc) return null;

  const wx = isLocal && predictedPos
    ? Number(predictedPos.x)
    : Number(p?.x || 0);

  const wyCenter = isLocal && predictedPos
    ? Number(predictedPos.y)
    : Number(p?.y || 0);

  const halfH = Number(spriteH || 16) * 0.5;
  const feetY = wyCenter + halfH;

  const facing = p?.facing === "left" ? "left" : "right";

  return {
    kind: "player",
    id: String(id),
    wx,
    wy: feetY,
    depthYWorld: feetY,
    spriteSrc,
    baseW: Number(spriteW || 16),
    baseH: Number(spriteH || 16),
    anchorX: 0.5,
    anchorY: 1.0,
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

function getLocalPlayerBody(playersById, myId, predictedLocalPos, playerSpriteW, playerSpriteH) {
  if (myId == null) return null;

  const p = playersById?.[myId];
  if (!p && !predictedLocalPos) return null;

  const cx = predictedLocalPos
    ? Number(predictedLocalPos.x)
    : Number(p?.x || 0);

  const centerY = predictedLocalPos
    ? Number(predictedLocalPos.y)
    : Number(p?.y || 0);

  const feetY = centerY + Number(playerSpriteH || 16) * 0.5;

  const bodyW = Math.max(6, Number(playerSpriteW || 16) * 0.6);
  const bodyH = Number(playerSpriteH || 16);

  return {
    left: cx - bodyW * 0.5,
    right: cx + bodyW * 0.5,
    top: feetY - bodyH,
    bottom: feetY,
    centerX: cx,
    feetY,
  };
}

function getObjectWorldRect(d) {
  const baseW = Number(d?.baseW || 16);
  const baseH = Number(d?.baseH || 16);
  const anchorX = Number(d?.anchorX ?? 0.5);
  const anchorY = Number(d?.anchorY ?? 0.5);

  const left = Number(d.wx || 0) - baseW * anchorX;
  const top = Number(d.wy || 0) - baseH * anchorY;

  return {
    left,
    top,
    right: left + baseW,
    bottom: top + baseH,
  };
}

function getOcclusionZone(d) {
  const rect = getObjectWorldRect(d);
  const baseW = Number(d?.baseW || 16);
  const baseH = Number(d?.baseH || 16);

  // Much smaller zone than the whole sprite.
  // This keeps the tree from fading while you're merely near it.
  const halfWidth = Math.max(10, Math.min(18, baseW * 0.18));
  const topInset = Math.round(baseH * 0.12);
  const bottomInset = 2;

  const bottom = Math.min(rect.bottom, d.depthYWorld - bottomInset);
  const top = Math.min(bottom, rect.top + topInset);

  return {
    left: Number(d.wx || 0) - halfWidth,
    right: Number(d.wx || 0) + halfWidth,
    top,
    bottom,
  };
}

function rectsOverlap(a, b) {
  return (
    a.left < b.right &&
    a.right > b.left &&
    a.top < b.bottom &&
    a.bottom > b.top
  );
}

function shouldObjectFadeForPlayer(d, playerBody) {
  if (!d || d.kind !== "object" || !playerBody) return false;

  const def = d.def || {};
  if (!def.occludesPlayer) return false;

  const zone = getOcclusionZone(d);

  // Must actually be behind the object's depth line
  if (playerBody.feetY >= d.depthYWorld) return false;

  return rectsOverlap(playerBody, zone);
}

function getObjectAlpha(d, playerBody) {
  return shouldObjectFadeForPlayer(d, playerBody) ? DEFAULT_OCCLUDE_ALPHA : 1;
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

    predictedLocalPos = null,

    getPlayerSpriteSrc = null,
    playerSpriteW = 16,
    playerSpriteH = 16,
  } = {}
) {
  const t = getTimeSeconds(frame);
  const dt = Number(frame?.dt || 0.016);

  const drawables = [];

  for (const obj of objects || []) {
    if (!obj) continue;
    const defId = String(obj.defId || "");
    const def = objectDefs?.[defId] || null;
    const d = makeObjectDrawable(obj, def, t);
    if (d) drawables.push(d);
  }

  if (playersById && typeof getPlayerSpriteSrc === "function") {
    const ids = Array.isArray(playerIds) ? playerIds : Object.keys(playersById || {});
    for (const id of ids) {
      const p = playersById?.[id];
      if (!p) continue;
      const src = String(getPlayerSpriteSrc(id, p) || "");
      const isLocal = myId != null && String(id) === String(myId);
      const d = makePlayerDrawable(id, p, src, playerSpriteW, playerSpriteH, {
        isLocal,
        predictedPos: isLocal ? predictedLocalPos : null,
      });
      if (d) drawables.push(d);
    }
  }

  if (!drawables.length) return;

  const localPlayerBody = getLocalPlayerBody(
    playersById,
    myId,
    predictedLocalPos,
    playerSpriteW,
    playerSpriteH
  );

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

    let sp = { x: d.wx, y: d.wy };
    if (d.kind === "object") {
      sp = smoothWorldPos(d.id, d.wx, d.wy, dt, SMOOTH_FOLLOW_OBJECTS);
    } else if (!d.isLocal) {
      sp = smoothWorldPos(d.id, d.wx, d.wy, dt, SMOOTH_FOLLOW_REMOTE);
    }

    const { sx, sy, z } = worldToScreen(frame, sp.x, sp.y);

    const dw = d.baseW * z;
    const dh = d.baseH * z;

    const dx = Math.round(sx - dw * d.anchorX);
    const dy = Math.round(sy - dh * d.anchorY);

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
      const objectAlpha = getObjectAlpha(d, localPlayerBody);

      ctx.globalAlpha = objectAlpha;

      if (interactive) {
        ctx.shadowColor = "rgba(165,130,255,0.30)";
        ctx.shadowBlur = 10 * z;
      }

      ctx.drawImage(img, dx, dy, dw, dh);

      if (interactive) {
        const baseAlpha = ctx.globalAlpha;
        ctx.shadowBlur = 0;
        ctx.globalAlpha = baseAlpha * 0.32;
        const o = Math.max(1, Math.round(1 * z));
        ctx.drawImage(img, dx - o, dy, dw, dh);
        ctx.drawImage(img, dx + o, dy, dw, dh);
        ctx.drawImage(img, dx, dy - o, dw, dh);
        ctx.drawImage(img, dx, dy + o, dw, dh);
        ctx.globalAlpha = baseAlpha;
        ctx.drawImage(img, dx, dy, dw, dh);
      }
    } else {
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