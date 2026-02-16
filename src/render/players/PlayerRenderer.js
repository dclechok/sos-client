import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { usePlayerInput } from "./usePlayerInput";
import { useRemoteInterpolation } from "./useRemoteInterpolation";

export default function PlayerRenderer({
  socket,
  myId,
  players,

  sendRateHz = 20,

  mySpriteSrc = "/art/items/sprites/AdeptNecromancer.gif",
  otherSpriteSrc = "/art/items/sprites/NovicePyromancer.gif",

  spriteW = 16,
  spriteH = 16,

  //match world zoom (keep integer)
  zoom = 2,

  renderOthers = true,
  playerNames = {},

  canvasRef,
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

  // world -> screen (CSS px)
  const worldToScreen = useCallback(
    (p) => {
      const { cx, cy, scale } = getCanvasMetrics();
      const m = meRef.current;
      if (!m) return { x: cx, y: cy };

      const dxWorld = Number(p.x || 0) - Number(m.x || 0);
      const dyWorld = Number(p.y || 0) - Number(m.y || 0);

      // ✅ zoom makes world units appear larger in CSS px
      return { x: cx + (dxWorld * z) / scale, y: cy + (dyWorld * z) / scale };
    },
    [getCanvasMetrics, z]
  );

  // screen (CSS px) -> world
  const screenToWorld = useCallback(
    (clientX, clientY) => {
      const { cx, cy, scale } = getCanvasMetrics();
      const m = meRef.current;
      if (!m) return { x: 0, y: 0 };

      // ✅ invert zoom
      const dxWorld = ((clientX - cx) * scale) / z;
      const dyWorld = ((clientY - cy) * scale) / z;

      return {
        x: Number(m.x || 0) + dxWorld,
        y: Number(m.y || 0) + dyWorld,
      };
    },
    [getCanvasMetrics, z]
  );

  const getDisplayName = (id, p) => {
    const fromSnapshot = p?.name;
    if (fromSnapshot && String(fromSnapshot).trim()) return String(fromSnapshot);

    const fromMap = playerNames?.[id];
    if (fromMap && String(fromMap).trim()) return String(fromMap);

    return `Player ${String(id).slice(0, 4)}`;
  };

  // -----------------------------------
  // INPUT HOOK
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
    getMyPos: () => meRef.current || { x: 0, y: 0 },
    onFacingChange: (dir) => setMyFacing(dir),
    onStopMove: () => socket?.emit("player:stop"), // ✅ add this
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
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      {/* OTHER PLAYERS */}
      {players &&
        myId &&
        visibleRemoteIds.map((id) => {
          const p = players[id];
          if (!p) return null;

          const r =
            getRenderState(id) || {
              x: Number(p.x || 0),
              y: Number(p.y || 0),
            };

          const { x, y } = worldToScreen(r);
          const hovered = hoverId === id;

          // ✅ snap to whole CSS pixels (prevents shimmer)
          const tx = Math.round(x - drawW / 2);
          const ty = Math.round(y - drawH / 2);

          const otherFacing = p?.facing === "left" ? "left" : "right";

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

      {/* LOCAL PLAYER */}
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
