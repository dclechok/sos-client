import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { usePlayerInput } from "./usePlayerInput";
import { useRemoteInterpolation } from "./useRemoteInterpolation";

/**
 * PlayerRenderer (DOM overlay)
 * ✅ Uses the SAME snapped camera as the canvas renderer via camSmoothRef.
 * ✅ Snaps REMOTE render positions to the same 1/zoom world grid to prevent 1px idle jiggle.
 */
export default function PlayerRenderer({
  socket,
  myId,
  players,

  sendRateHz = 20,

  mySpriteSrc = "/art/items/sprites/AdeptNecromancer.gif",
  otherSpriteSrc = "/art/items/sprites/NovicePyromancer.gif",

  spriteW = 16,
  spriteH = 16,

  zoom = 2,

  renderOthers = true,
  playerNames = {},

  canvasRef,

  // ✅ pass from App (same ref MainViewport/useViewportRenderer uses)
  camSmoothRef,
}) {
  const [hoverId, setHoverId] = useState(null);
  const [myFacing, setMyFacing] = useState("right");

  const me = myId && players ? players[myId] : null;

  // Keep latest me in a ref so listeners use fresh state
  const meRef = useRef(null);
  useEffect(() => {
    meRef.current = me;
  }, [me]);

  // safe integer zoom
  const z = Math.max(1, Math.floor(Number(zoom) || 1));

  // final DOM sprite size in CSS pixels
  const drawW = spriteW * z;
  const drawH = spriteH * z;

  // ------------------------------
  // Canvas metrics (center + UNIFORM CSS->canvas scaling)
  // ------------------------------
  const getCanvasMetrics = useCallback(() => {
    const canvas = canvasRef?.current;

    if (!canvas) {
      return {
        cx: window.innerWidth / 2,
        cy: window.innerHeight / 2,
        scale: 1,
      };
    }

    const r = canvas.getBoundingClientRect();

    const scaleX = r.width ? canvas.width / r.width : 1;
    const scaleY = r.height ? canvas.height / r.height : 1;

    // ✅ uniform scale: CSS px -> canvas px factor
    const scale = scaleX;

    return {
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      scale,
      scaleX,
      scaleY,
    };
  }, [canvasRef]);

  // ------------------------------
  // ✅ Shared camera (snapped to match canvas pixel-art snap)
  // ------------------------------
  const getRenderCam = useCallback(() => {
    const cam = camSmoothRef?.current;
    const fallback = meRef.current || { x: 0, y: 0 };

    const cx = Number.isFinite(cam?.x) ? Number(cam.x) : Number(fallback.x || 0);
    const cy = Number.isFinite(cam?.y) ? Number(cam.y) : Number(fallback.y || 0);

    // MUST match useViewportRenderer snap (1/z world units)
    if (z > 1) {
      return {
        x: Math.round(cx * z) / z,
        y: Math.round(cy * z) / z,
      };
    }

    return { x: cx, y: cy };
  }, [camSmoothRef, z]);

  // ✅ Snap world-space values to the same 1/z grid to prevent 1px idle jiggle
  const snapWorld = useCallback(
    (v) => {
      const n = Number(v || 0);
      if (!Number.isFinite(n)) return 0;
      return z > 1 ? Math.round(n * z) / z : Math.round(n);
    },
    [z]
  );

  // world -> screen (CSS px)
  const worldToScreen = useCallback(
    (p) => {
      const { cx, cy, scale } = getCanvasMetrics();
      const cam = getRenderCam();

      const dxWorld = Number(p.x || 0) - cam.x;
      const dyWorld = Number(p.y || 0) - cam.y;

      return { x: cx + (dxWorld * z) / scale, y: cy + (dyWorld * z) / scale };
    },
    [getCanvasMetrics, getRenderCam, z]
  );

  // screen (CSS px) -> world
  const screenToWorld = useCallback(
    (clientX, clientY) => {
      const { cx, cy, scale } = getCanvasMetrics();
      const cam = getRenderCam();

      const dxWorld = ((clientX - cx) * scale) / z;
      const dyWorld = ((clientY - cy) * scale) / z;

      return {
        x: cam.x + dxWorld,
        y: cam.y + dyWorld,
      };
    },
    [getCanvasMetrics, getRenderCam, z]
  );

  const getDisplayName = (id, p) => {
    const fromSnapshot = p?.name;
    if (fromSnapshot && String(fromSnapshot).trim()) return String(fromSnapshot);

    const fromMap = playerNames?.[id];
    if (fromMap && String(fromMap).trim()) return String(fromMap);

    return `Player ${String(id).slice(0, 4)}`;
  };

  // -----------------------------------
  // INPUT HOOK (ARPG drag-to-move)
  // -----------------------------------
  const inputEnabled = Boolean(socket);

  const onMoveTo = useCallback(
    ({ x, y }) => {
      if (!socket) return;
      socket.emit("player:moveTo", { x: Number(x), y: Number(y) });
    },
    [socket]
  );

  usePlayerInput({
    enabled: inputEnabled,
    sendRateHz,
    screenToWorld,
    onMoveTo,

    getMyPos: () => getRenderCam(),
    onFacingChange: (dir) => setMyFacing(dir),

    button: 2,
    deadzoneWorld: 0.5,

    // If your usePlayerInput supports it, this improves hold-drag consistency:
    // targetRef: canvasRef,
  });

  // -----------------------------------
  // REMOTE INTERPOLATION HOOK
  // -----------------------------------
  const { remoteIds, getRenderState } = useRemoteInterpolation({
    players,
    myId,
    interpDelayMs: 120,
  });

  const visibleRemoteIds = useMemo(() => {
    if (!renderOthers) return [];
    return remoteIds;
  }, [renderOthers, remoteIds]);

  // -----------------------------------
  // Styles
  // -----------------------------------
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
    border: "1px solid rgba(200,160,80,0.35)",
    color: "rgba(245,235,215,0.95)",
    whiteSpace: "nowrap",
    textShadow: "0 1px 2px rgba(0,0,0,0.75)",
    pointerEvents: "none",
  };

  const displayX = me ? Math.round(me.x) : 0;
  const displayY = me ? Math.round(me.y) : 0;

  const flipStyle = (dir) => ({
    width: "100%",
    height: "100%",
    transform: dir === "left" ? "scaleX(-1)" : "scaleX(1)",
    transformOrigin: "50% 50%",
    willChange: "transform",
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10,
        pointerEvents: "none",
      }}
    >
      {/* OTHER PLAYERS */}
      {players &&
        myId &&
        visibleRemoteIds.map((id) => {
          const p = players[id];
          if (!p) return null;

          const r0 =
            getRenderState(id) || {
              x: Number(p.x || 0),
              y: Number(p.y || 0),
              facing: p?.facing === "left" ? "left" : "right",
            };

          // ✅ snap remote render position to 1/z world grid (prevents idle 1px jiggle)
          const r = {
            ...r0,
            x: snapWorld(r0.x),
            y: snapWorld(r0.y),
          };

          const { x, y } = worldToScreen(r);
          const hovered = hoverId === id;

          // snap to pixels for DOM transform
          const tx = Math.round(x - drawW / 2);
          const ty = Math.round(y - drawH / 2);

          const otherFacing = r?.facing === "left" ? "left" : "right";

          return (
            <div
              key={id}
              onMouseEnter={() => setHoverId(id)}
              onMouseLeave={() => setHoverId((cur) => (cur === id ? null : cur))}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: drawW,
                height: drawH,
                transform: `translate3d(${tx}px, ${ty}px, 0)`,
                transformOrigin: "0 0",
                pointerEvents: "auto",
                willChange: "transform",
                filter: hovered
                  ? "drop-shadow(0 0 10px rgba(200, 160, 80, 0.22))"
                  : "none",
              }}
            >
              {hovered && (
                <div style={nameLabelStyle}>{getDisplayName(id, p)}</div>
              )}

              <div style={flipStyle(otherFacing)}>
                <img
                  src={otherSpriteSrc}
                  alt="Other player"
                  draggable={false}
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "block",
                    imageRendering: "pixelated",
                    userSelect: "none",
                  }}
                />
              </div>
            </div>
          );
        })}

      {/* LOCAL PLAYER (centered) */}
      <div
        onMouseEnter={() => setHoverId(myId)}
        onMouseLeave={() => setHoverId((cur) => (cur === myId ? null : cur))}
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: drawW,
          height: drawH,
          transform: "translate(-50%, -50%)",
          transformOrigin: "50% 50%",
          pointerEvents: "auto",
          filter:
            hoverId === myId
              ? "drop-shadow(0 0 10px rgba(200, 160, 80, 0.22))"
              : "none",
        }}
      >
        {me && hoverId === myId && (
          <div style={nameLabelStyle}>{getDisplayName(myId, me)}</div>
        )}

        <div style={flipStyle(myFacing)}>
          <img
            src={mySpriteSrc}
            alt="My player"
            draggable={false}
            onError={(e) => {
              console.error("Sprite failed to load:", mySpriteSrc);
              e.currentTarget.style.outline = "2px solid red";
            }}
            style={{
              width: "100%",
              height: "100%",
              display: "block",
              imageRendering: "pixelated",
              userSelect: "none",
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
            color: "rgba(200,160,80,0.75)",
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
          <br />
          zoom: {z}x
          <br />
          face: {myFacing}
        </div>
      )}
    </div>
  );
}
