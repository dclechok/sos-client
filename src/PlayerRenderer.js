// PlayerRenderer.js
import { useEffect, useRef, useState } from "react";

/**
 * Multiplayer PlayerRenderer (server-authoritative)
 *
 * - Local ship is ALWAYS drawn at screen center
 * - Rotation comes from server snapshot (players[myId].angle)
 * - Right mouse hold: sends input intent to server
 * - Hover other ships: show name + faint glow
 * - Name label always upright (label is NOT inside rotated element)
 *
 * Required props:
 * - socket
 * - myId
 * - players      // { [id]: { x, y, angle } }
 *
 * Optional props:
 * - playerNames  // { [id]: "Display Name" }
 */
export default function PlayerRenderer({
  socket,
  myId,
  players,

  sendRateHz = 20,

  mySpriteSrc = "/art/items/sprites/pod.png",
  otherSpriteSrc = "/art/items/sprites/pod.png",

  spriteW = 32,
  spriteH = 32,

  // If your sprite faces UP by default, set to -90
  spriteFacingOffsetDeg = 0,

  renderOthers = true,
  playerNames = {},
}) {
  const rightDownRef = useRef(false);
  const mouseRef = useRef({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });

  const [hoverId, setHoverId] = useState(null);

  // mouse listeners
  useEffect(() => {
    const onMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const onContextMenu = (e) => e.preventDefault();

    const onMouseDown = (e) => {
      if (e.button === 2) rightDownRef.current = true;
    };

    const onMouseUp = (e) => {
      if (e.button === 2) rightDownRef.current = false;
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
  }, []);

  // send input intent to server
  useEffect(() => {
    if (!socket) return;

    const intervalMs = Math.max(10, Math.floor(1000 / sendRateHz));

    const tick = () => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = mouseRef.current.x - cx;
      const dy = mouseRef.current.y - cy;

      const targetAngle = Math.atan2(dy, dx);
      const thrust = rightDownRef.current;

      socket.emit("player:input", { thrust, targetAngle });
    };

    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [socket, sendRateHz]);

  const me = myId && players ? players[myId] : null;

  const rotationToCssDeg = (angleRad) =>
    (Number(angleRad || 0) * 180) / Math.PI + spriteFacingOffsetDeg;

  // Convert world pos -> screen pos relative to me (me is centered)
  const worldToScreen = (p) => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;

    if (!me) return { x: cx, y: cy };

    return {
      x: cx + (Number(p.x || 0) - Number(me.x || 0)),
      y: cy + (Number(p.y || 0) - Number(me.y || 0)),
    };
  };

  const getDisplayName = (id) => {
    const n = playerNames?.[id];
    if (n && String(n).trim()) return String(n);
    return `Pilot ${String(id).slice(0, 4)}`;
  };

  // ✅ If your sprite looks "overly pixelated", it's usually because:
  // - you're scaling it up/down to a non-integer size (e.g. 32 -> 37)
  // - imageRendering: pixelated is forced
  //
  // We'll default to crisp-but-not-blocky:
  // - remove pixelated by default (use "auto")
  // - keep smoothing enabled
  //
  // If you later want true pixel-art crispness, set spriteW/spriteH to integer multiples.
  const IMG_RENDERING = "auto"; // "pixelated" for strict pixel-art, "auto" for smoother
  const SMOOTHING = "auto";

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
                transform: "translate(-50%, -50%)", // ✅ translate only (no rotate)
                transformOrigin: "50% 50%",
                pointerEvents: "auto",
                filter: hovered
                  ? "drop-shadow(0 0 6px rgba(140, 200, 255, 0.35))"
                  : "none",
              }}
            >
              {/* ✅ Name label stays upright (parent not rotated) */}
              {hovered && (
                <div
                  style={{
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
                  }}
                >
                  {getDisplayName(id)}
                </div>
              )}

              {/* ✅ Rotate only the ship */}
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
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: spriteW,
          height: spriteH,
          transform: "translate(-50%, -50%)", // ✅ translate only
          transformOrigin: "50% 50%",
        }}
      >
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
              {/* DEBUG: World Coordinates (bottom-right) */}
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
