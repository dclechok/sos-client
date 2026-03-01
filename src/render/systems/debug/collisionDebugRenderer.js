// src/render/systems/debug/collisionDebugRenderer.js
//
// Drop-in debug overlay: draws collision shapes for all world objects.
// Call renderCollisionDebug(ctx, frame, { objects, objectDefs }) at the END
// of your render() callback — it draws on top of everything.
//
// Toggle with:  window.__collisionDebug = true / false
// Or press ` (backtick) to toggle at runtime (see hookCollisionDebugToggle).

const COLORS = {
  circle: "rgba(255, 80,  80,  0.85)", // red
  rect:   "rgba(80,  180, 255, 0.85)", // blue
  aabb:   "rgba(255, 220, 50,  0.85)", // yellow  (fallback AABB)
  player: "rgba(0,   255, 150, 0.9)",  // green   (player radius)
};

const FILL = {
  circle: "rgba(255, 80,  80,  0.08)",
  rect:   "rgba(80,  180, 255, 0.08)",
  aabb:   "rgba(255, 220, 50,  0.08)",
};

const LABEL_STYLE = "10px monospace";

function worldToScreen(wx, wy, frame) {
  const { camX, camY, zoom: z, w, h } = frame;
  return {
    sx: w / 2 + (wx - camX) * z,
    sy: h / 2 + (wy - camY) * z,
  };
}

/**
 * Main debug render call.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} frame        - from useViewportRenderer: { camX, camY, zoom, w, h }
 * @param {Object} opts
 * @param {Array}  opts.objects           - worldObjects array (each has x, y, defId)
 * @param {Object} opts.objectDefs        - keyed by defId
 * @param {Object} [opts.playerPos]       - { x, y } sprite center (optional)
 * @param {number} [opts.playerRadius=5]  - matches server PLAYER_RADIUS
 * @param {number} [opts.playerFootOffsetY=6] - matches server FOOT_OFFSET_Y
 */
export function renderCollisionDebug(ctx, frame, {
  objects = [],
  objectDefs = {},
  playerPos = null,
  playerRadius = 5,
  playerFootOffsetY = 6,
} = {}) {
  if (!window.__collisionDebug) return;

  const { zoom: z } = frame;
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.font = LABEL_STYLE;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const obj of objects) {
    const def = objectDefs[obj.defId];
    if (!def) continue;

    const ox = Number(obj.x);
    const oy = Number(obj.y);
    const col = def.collision;

    if (!def.blocksMovement && !col) continue;

    if (!col) {
      const half = (def.sizePx ?? 16) * 0.5;
      drawRect(ctx, frame, ox, oy, half * 2, half * 2, 0, 0, "aabb", obj.defId);
      continue;
    }

    if (col.shape === "circle") {
      drawCircle(ctx, frame, ox, oy, col.radius ?? 0, col.offset?.x ?? 0, col.offset?.y ?? 0, "circle", obj.defId);
      continue;
    }

    if (col.shape === "rect") {
      drawRect(ctx, frame, ox, oy, col.w ?? def.sizePx ?? 16, col.h ?? def.sizePx ?? 16, col.offset?.x ?? 0, col.offset?.y ?? 0, "rect", obj.defId);
      continue;
    }
  }

  // Draw player hitbox offset down to feet — matches server FOOT_OFFSET_Y
  if (playerPos) {
    const footX = playerPos.x;
    const footY = playerPos.y + playerFootOffsetY;
    const { sx, sy } = worldToScreen(footX, footY, frame);
    const r = playerRadius * z;

    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.player;
    ctx.fillStyle = "rgba(0, 255, 150, 0.15)";
    ctx.fill();
    ctx.stroke();

    // crosshair dot
    ctx.beginPath();
    ctx.arc(sx, sy, 2, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.player;
    ctx.fill();
  }

  ctx.restore();
}

function drawCircle(ctx, frame, ox, oy, radius, offX, offY, colorKey, label) {
  const { zoom: z } = frame;
  const cx = ox + offX;
  const cy = oy + offY;
  const { sx, sy } = worldToScreen(cx, cy, frame);
  const r = radius * z;

  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fillStyle = FILL[colorKey];
  ctx.fill();
  ctx.strokeStyle = COLORS[colorKey];
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(sx, sy, 2, 0, Math.PI * 2);
  ctx.fillStyle = COLORS[colorKey];
  ctx.fill();

  ctx.fillStyle = COLORS[colorKey];
  ctx.fillText(`${label} r=${radius}`, sx, sy - r - 8);

  if (offX !== 0 || offY !== 0) {
    const { sx: osx, sy: osy } = worldToScreen(ox, oy, frame);
    ctx.beginPath();
    ctx.setLineDash([3, 3]);
    ctx.moveTo(osx, osy);
    ctx.lineTo(sx, sy);
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(osx, osy, 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fill();
  }
}

function drawRect(ctx, frame, ox, oy, w, h, offX, offY, colorKey, label) {
  const { zoom: z } = frame;
  const cx = ox + offX;
  const cy = oy + offY;
  const { sx, sy } = worldToScreen(cx, cy, frame);
  const hw = (w * z) / 2;
  const hh = (h * z) / 2;

  ctx.fillStyle = FILL[colorKey];
  ctx.fillRect(sx - hw, sy - hh, hw * 2, hh * 2);
  ctx.strokeStyle = COLORS[colorKey];
  ctx.strokeRect(sx - hw, sy - hh, hw * 2, hh * 2);

  ctx.fillStyle = COLORS[colorKey];
  ctx.fillText(`${label} ${Math.round(w)}×${Math.round(h)}`, sx, sy);
}

export function hookCollisionDebugToggle() {
  const handler = (e) => {
    if (e.key === "`") {
      window.__collisionDebug = !window.__collisionDebug;
      console.log(`[collision debug] ${window.__collisionDebug ? "ON ✅" : "OFF"}`);
    }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}