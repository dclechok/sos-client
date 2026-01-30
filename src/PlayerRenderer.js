// PlayerRenderer.js
import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Multiplayer PlayerRenderer (server-authoritative)
 *
 * - Local ship is always drawn at screen center
 * - Rotation comes from server snapshot (players[myId].angle)
 * - Right mouse:
 *   - Press: send move-to destination once
 *   - Hold: continuously updates destination while held (drag-to-move)
 * - No constant "face mouse" updates
 * - Hover ships: show name + faint glow (including your own ship)
 * - Name label always upright (label is not inside rotated element)
 *
 * Server expects:
 * - socket.emit("player:moveTo", { x, y })  // world coords
 *
 * Optional manual thrust (if you keep it server-side):
 * - socket.emit("player:input", { thrust: true/false })
 *
 * FIX INCLUDED:
 * - Uses the actual canvas element rect for center (NOT window center)
 * - Converts CSS pixels -> canvas pixels via scaleX/scaleY
 * - This fixes "vertical movement feels slower" when canvas is DPR-scaled / resized.
 */

export default function PlayerRenderer({
  socket,
  myId,
  players,

  // Controls how often we update move target while holding right click
  sendRateHz = 20,

  mySpriteSrc = "/art/items/sprites/pod.png",
  otherSpriteSrc = "/art/items/sprites/pod.png",

  spriteW = 32,
  spriteH = 32,

  // If your sprite faces UP by default, set to -90
  spriteFacingOffsetDeg = 0,

  renderOthers = true,
  playerNames = {},

  // ✅ NEW (REQUIRED for correct mouse mapping when canvas is DPR-scaled):
  // Pass the SAME canvasRef you use in MainViewport/useViewportRenderer.
  canvasRef,
}) {
  const [hoverId, setHoverId] = useState(null);

  // Holding right mouse updates destination continuously
  const rightDownRef = useRef(false);

  // Track latest mouse position for drag-to-move
  const mouseRef = useRef({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });

  const me = myId && players ? players[myId] : null;

  // Keep latest me in a ref so listeners/interval always use fresh state
  const meRef = useRef(null);
  useEffect(() => {
    meRef.current = me;
  }, [me]);

  const rotationToCssDeg = (angleRad) =>
    (Number(angleRad || 0) * 180) / Math.PI + spriteFacingOffsetDeg;

  // ------------------------------
  // Canvas metrics (center + CSS->canvas scaling)
  // ------------------------------
  const getCanvasMetrics = useCallback(() => {
    const canvas = canvasRef?.current;

    // Fallback: window-based (works only if canvas == full screen and no DPR tricks)
    if (!canvas) {
      return {
        cx: window.innerWidth / 2,
        cy: window.innerHeight / 2,
        scaleX: 1,
        scaleY: 1,
      };
    }

    const r = canvas.getBoundingClientRect();

    // scaleX/scaleY convert CSS pixels -> canvas pixels
    // (handles DPR scaling, DPR caps, and any CSS stretching)
    const scaleX = r.width ? canvas.width / r.width : 1;
    const scaleY = r.height ? canvas.height / r.height : 1;

    return {
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      scaleX,
      scaleY,
    };
  }, [canvasRef]);

  // Convert world pos -> screen pos (CSS pixels) relative to me (me is centered)
  const worldToScreen = useCallback(
    (p) => {
      const { cx, cy, scaleX, scaleY } = getCanvasMetrics();

      const m = meRef.current;
      if (!m) return { x: cx, y: cy };

      const dxWorld = Number(p.x || 0) - Number(m.x || 0);
      const dyWorld = Number(p.y || 0) - Number(m.y || 0);

      // In your renderer, world units are effectively "canvas pixels"
      // Convert to CSS pixels by dividing by scale.
      return {
        x: cx + dxWorld / scaleX,
        y: cy + dyWorld / scaleY,
      };
    },
    [getCanvasMetrics]
  );

  // Stable screen->world (CSS pixels -> canvas pixels -> world)
  const screenToWorld = useCallback(
    (clientX, clientY) => {
      const { cx, cy, scaleX, scaleY } = getCanvasMetrics();

      const m = meRef.current;
      if (!m) return { x: 0, y: 0 };

      // Convert CSS delta to canvas-pixel delta
      const dxCanvasPx = (clientX - cx) * scaleX;
      const dyCanvasPx = (clientY - cy) * scaleY;

      return {
        x: Number(m.x || 0) + dxCanvasPx,
        y: Number(m.y || 0) + dyCanvasPx,
      };
    },
    [getCanvasMetrics]
  );

  // Prefers server snapshot "p.name", but keeps playerNames as a fallback.
  const getDisplayName = (id, p) => {
    const fromSnapshot = p?.name;
    if (fromSnapshot && String(fromSnapshot).trim()) return String(fromSnapshot);

    const fromMap = playerNames?.[id];
    if (fromMap && String(fromMap).trim()) return String(fromMap);

    return `Pilot ${String(id).slice(0, 4)}`;
  };

  const IMG_RENDERING = "auto"; // "pixelated" for strict pixel-art, "auto" for smoother
  const SMOOTHING = "auto";

  const displayX = me ? Math.round(me.x) : 0;
  const displayY = me ? Math.round(me.y) : 0;

  const nameLabelStyle = {
    position: "absolute",
    left: "50%",
    top: -10,
    transform: "translate(-50%, -100%)",
    padding: "2px 6px",
    fontSize: 12,
    lineHeight: "12px",
    borderRadius: 6,
    background: "rgba(0,0,0,0.55)",
    border: "1px solid rgba(160,220,255,0.25)",
    color: "rgba(235,245,255,0.95)",
    whiteSpace: "nowrap",
    textShadow: "0 1px 2px rgba(0,0,0,0.75)",
    pointerEvents: "none",
  };

  // Mouse listeners:
  // - prevent context menu
  // - track mouse position
  // - track right button state
  // - on right press, send one immediate moveTo
  useEffect(() => {
    if (!socket) return;

    const onMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const onContextMenu = (e) => e.preventDefault();

    const onMouseDown = (e) => {
      if (e.button !== 2) return; // right click only
      e.preventDefault();

      rightDownRef.current = true;

      // Fire immediately on press
      const m = meRef.current;
      if (!m) return;

      const { x, y } = screenToWorld(e.clientX, e.clientY);
      socket.emit("player:moveTo", { x: Number(x), y: Number(y) });
    };

    const onMouseUp = (e) => {
      if (e.button !== 2) return;
      rightDownRef.current = false;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [socket, screenToWorld]);

  // While holding right click, continuously update move target to current mouse position
  useEffect(() => {
    if (!socket) return;

    const intervalMs = Math.max(10, Math.floor(1000 / sendRateHz));

    const tick = () => {
      if (!rightDownRef.current) return;

      const m = meRef.current;
      if (!m) return;

      const { x, y } = screenToWorld(mouseRef.current.x, mouseRef.current.y);
      socket.emit("player:moveTo", { x: Number(x), y: Number(y) });
    };

    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [socket, sendRateHz, screenToWorld]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      {/* OTHER PLAYERS */}
      {renderOthers &&
        players &&
        myId &&
        Object.entries(players).map(([id, p]) => {
          if (!p || id === myId) return null;

          const { x, y } = worldToScreen(p);
          const hovered = hoverId === id;

          return (
            <div
              key={id}
              onMouseEnter={() => setHoverId(id)}
              onMouseLeave={() => setHoverId((cur) => (cur === id ? null : cur))}
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: spriteW,
                height: spriteH,
                transform: "translate(-50%, -50%)",
                transformOrigin: "50% 50%",
                pointerEvents: "auto",
                filter: hovered
                  ? "drop-shadow(0 0 6px rgba(140, 200, 255, 0.35))"
                  : "none",
              }}
            >
              {hovered && (
                <div style={nameLabelStyle}>{getDisplayName(id, p)}</div>
              )}

              <div
                style={{
                  width: "100%",
                  height: "100%",
                  transform: `rotate(${rotationToCssDeg(p.angle)}deg)`,
                  transformOrigin: "50% 50%",
                  willChange: "transform",
                }}
              >
                <img
                  src={otherSpriteSrc}
                  alt="Other ship"
                  draggable={false}
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "block",
                    imageRendering: IMG_RENDERING,
                    userSelect: "none",
                    WebkitFontSmoothing: SMOOTHING,
                  }}
                />
              </div>
            </div>
          );
        })}

      {/* LOCAL PLAYER (ALWAYS CENTERED) */}
      <div
        onMouseEnter={() => setHoverId(myId)}
        onMouseLeave={() => setHoverId((cur) => (cur === myId ? null : cur))}
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: spriteW,
          height: spriteH,
          transform: "translate(-50%, -50%)",
          transformOrigin: "50% 50%",
          pointerEvents: "auto",
          filter:
            hoverId === myId
              ? "drop-shadow(0 0 6px rgba(140, 200, 255, 0.35))"
              : "none",
        }}
      >
        {me && hoverId === myId && (
          <div style={nameLabelStyle}>{getDisplayName(myId, me)}</div>
        )}

        <div
          style={{
            width: "100%",
            height: "100%",
            transform: `rotate(${rotationToCssDeg(me?.angle)}deg)`,
            transformOrigin: "50% 50%",
            willChange: "transform",
          }}
        >
          <img
            src={mySpriteSrc}
            alt="My ship"
            draggable={false}
            onError={(e) => {
              console.error("Sprite failed to load:", mySpriteSrc);
              e.currentTarget.style.outline = "2px solid red";
            }}
            style={{
              width: "100%",
              height: "100%",
              display: "block",
              imageRendering: IMG_RENDERING,
              userSelect: "none",
              WebkitFontSmoothing: SMOOTHING,
            }}
          />
        </div>
      </div>

      {/* DEBUG */}
      {me && (
        <div
          style={{
            position: "fixed",
            right: 12,
            bottom: 10,
            fontSize: 11,
            fontFamily: "monospace",
            color: "rgba(200,220,255,0.6)",
            background: "rgba(0,0,0,0.35)",
            padding: "4px 6px",
            borderRadius: 4,
            pointerEvents: "none",
            zIndex: 10000,
            textAlign: "right",
          }}
        >
          x: {displayX}
          <br />
          y: {displayY}
        </div>
      )}
    </div>
  );
}
