import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { usePlayerInput } from "./usePlayerInput";
import { useRemoteInterpolation } from "./useRemoteInterpolation";

export default function PlayerRenderer({
  socket,
  myId,
  players,

  sendRateHz = 20,

  mySpriteSrc = "/art/items/sprites/pod.png",
  otherSpriteSrc = "/art/items/sprites/pod.png",

  spriteW = 32,
  spriteH = 32,

  spriteFacingOffsetDeg = 0,

  renderOthers = true,
  playerNames = {},

  canvasRef,

  worldBoot,
  bootApi,
}) {
  const [hoverId, setHoverId] = useState(null);

  const me = myId && players ? players[myId] : null;

  // Keep latest me in a ref so listeners use fresh state
  const meRef = useRef(null);
  useEffect(() => {
    meRef.current = me;
  }, [me]);

  const rotationToCssDeg = (angleRad) =>
    (Number(angleRad || 0) * 180) / Math.PI + spriteFacingOffsetDeg;

  // ------------------------------
  // Canvas metrics (center + UNIFORM CSS->canvas/world scaling)
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

    // ✅ Uniform scale (your fix)
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

      return { x: cx + dxWorld / scale, y: cy + dyWorld / scale };
    },
    [getCanvasMetrics]
  );

  // screen (CSS px) -> world
  const screenToWorld = useCallback(
    (clientX, clientY) => {
      const { cx, cy, scale } = getCanvasMetrics();
      const m = meRef.current;
      if (!m) return { x: 0, y: 0 };

      const dxWorld = (clientX - cx) * scale;
      const dyWorld = (clientY - cy) * scale;

      return {
        x: Number(m.x || 0) + dxWorld,
        y: Number(m.y || 0) + dyWorld,
      };
    },
    [getCanvasMetrics]
  );

  const getDisplayName = (id, p) => {
    const fromSnapshot = p?.name;
    if (fromSnapshot && String(fromSnapshot).trim()) return String(fromSnapshot);

    const fromMap = playerNames?.[id];
    if (fromMap && String(fromMap).trim()) return String(fromMap);

    return `Pilot ${String(id).slice(0, 4)}`;
  };

  // -----------------------------------
  // WORLD BOOT HOOKS
  // -----------------------------------
  const markedSnapshotRef = useRef(false);
  const markedReadyRef = useRef(false);
  const lastBootActiveRef = useRef(false);

  useEffect(() => {
    const active = Boolean(worldBoot?.active);
    const wasActive = lastBootActiveRef.current;

    if (!wasActive && active) {
      markedSnapshotRef.current = false;
      markedReadyRef.current = false;
    }
    if (!active) {
      markedSnapshotRef.current = false;
      markedReadyRef.current = false;
    }

    lastBootActiveRef.current = active;
  }, [worldBoot?.active]);

  useEffect(() => {
    if (!worldBoot?.active) return;
    if (!bootApi) return;
    if (!me) return;

    if (!markedSnapshotRef.current) {
      markedSnapshotRef.current = true;
      bootApi.done("snapshot", "Player state received");
    }
  }, [me, worldBoot?.active, bootApi]);

  const onMySpriteLoad = useCallback(() => {
    if (!worldBoot?.active) return;
    if (!bootApi) return;
    if (markedReadyRef.current) return;

    markedReadyRef.current = true;
    bootApi.done("ready", "Ship visuals ready");
  }, [worldBoot?.active, bootApi]);

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
  });

  // -----------------------------------
  // REMOTE INTERPOLATION HOOK (✅ buttery ref-based)
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
  // Render styles
  // -----------------------------------
  const IMG_RENDERING = "auto";
  const SMOOTHING = "auto";

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

  const displayX = me ? Math.round(me.x) : 0;
  const displayY = me ? Math.round(me.y) : 0;

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
              a: Number(p.angle || 0),
            };

          const { x, y } = worldToScreen(r);
          const hovered = hoverId === id;

          // ✅ no rounding = smoother (subpixel transforms)
          const tx = x - spriteW / 2;
          const ty = y - spriteH / 2;

          return (
            <div
              key={id}
              onMouseEnter={() => setHoverId(id)}
              onMouseLeave={() => setHoverId((cur) => (cur === id ? null : cur))}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: spriteW,
                height: spriteH,
                transform: `translate3d(${tx}px, ${ty}px, 0)`,
                transformOrigin: "0 0",
                pointerEvents: "auto",
                willChange: "transform",
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
                  transform: `rotate(${rotationToCssDeg(r.a)}deg)`,
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

      {/* LOCAL PLAYER */}
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
            onLoad={onMySpriteLoad}
            onError={(e) => {
              console.error("Sprite failed to load:", mySpriteSrc);
              if (worldBoot?.active && bootApi) {
                bootApi.error("ready", `Sprite failed: ${mySpriteSrc}`);
              }
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
