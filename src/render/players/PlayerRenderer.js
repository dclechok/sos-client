import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { usePlayerInput } from "./usePlayerInput";
import { useRemoteInterpolation } from "./useRemoteInterpolation";

/**
 * PlayerRenderer (DOM overlay)
 * ✅ Uses the SAME snapped camera as the canvas renderer via camSmoothRef.
 * ✅ Snaps REMOTE render positions to the same 1/zoom world grid to prevent 1px idle jiggle.
 *
 * ✅ NEW:
 * - Overhead chat bubbles (supports senderId OR fallback to display name)
 * - Bubble duration scales with message length
 * - Bubble text renders left-to-right (fixes 1-letter-per-line stacking)
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

  camSmoothRef,
}) {
  const [hoverId, setHoverId] = useState(null);
  const [myFacing, setMyFacing] = useState("right");

  // bubbles keyed by senderId string OR displayName string:
  // { [key]: { text, t, expiresAt } }
  const [bubbles, setBubbles] = useState({});

  const me = myId && players ? players[myId] : null;

  const meRef = useRef(null);
  useEffect(() => {
    meRef.current = me;
  }, [me]);

  const z = Math.max(1, Math.floor(Number(zoom) || 1));
  const drawW = spriteW * z;
  const drawH = spriteH * z;

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

    return {
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      scale: scaleX,
    };
  }, [canvasRef]);

  const getRenderCam = useCallback(() => {
    const cam = camSmoothRef?.current;
    const fallback = meRef.current || { x: 0, y: 0 };

    const cx = Number.isFinite(cam?.x) ? Number(cam.x) : Number(fallback.x || 0);
    const cy = Number.isFinite(cam?.y) ? Number(cam.y) : Number(fallback.y || 0);

    if (z > 1) {
      return {
        x: Math.round(cx * z) / z,
        y: Math.round(cy * z) / z,
      };
    }
    return { x: cx, y: cy };
  }, [camSmoothRef, z]);

  const snapWorld = useCallback(
    (v) => {
      const n = Number(v || 0);
      if (!Number.isFinite(n)) return 0;
      return z > 1 ? Math.round(n * z) / z : Math.round(n);
    },
    [z]
  );

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

  const screenToWorld = useCallback(
    (clientX, clientY) => {
      const { cx, cy, scale } = getCanvasMetrics();
      const cam = getRenderCam();

      const dxWorld = ((clientX - cx) * scale) / z;
      const dyWorld = ((clientY - cy) * scale) / z;

      return { x: cam.x + dxWorld, y: cam.y + dyWorld };
    },
    [getCanvasMetrics, getRenderCam, z]
  );

  const getDisplayName = useCallback(
    (id, p) => {
      const fromSnapshot = p?.name;
      if (fromSnapshot && String(fromSnapshot).trim()) return String(fromSnapshot);

      const fromMap = playerNames?.[id];
      if (fromMap && String(fromMap).trim()) return String(fromMap);

      return `Player ${String(id).slice(0, 4)}`;
    },
    [playerNames]
  );

  // -----------------------------------
  // CHAT BUBBLES
  // -----------------------------------
  useEffect(() => {
    // ✅ linger tuning (more readable / “old heads” friendly)
    // - base time raised
    // - per-char time raised
    // - max cap raised
    function ttlFor(text) {
      const len = String(text || "").length;
      return Math.max(3000, Math.min(18000, 2000 + len * 80));
    }

    function onBubble(e) {
      const d = e?.detail || {};
      const senderIdRaw = d.senderId;
      const user = String(d.user || "").trim();
      const message = String(d.message || "").trim();
      const t = Number(d.t || Date.now());
      if (!message) return;

      const key =
        senderIdRaw != null && String(senderIdRaw).trim()
          ? String(senderIdRaw)
          : user;

      if (!key) return;

      const ttl = ttlFor(message);

      setBubbles((prev) => ({
        ...prev,
        [key]: { text: message, t, expiresAt: t + ttl },
      }));
    }

    window.addEventListener("chat:bubble", onBubble);
    return () => window.removeEventListener("chat:bubble", onBubble);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setBubbles((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          if (!next[k] || now >= next[k].expiresAt) {
            delete next[k];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 250);

    return () => clearInterval(id);
  }, []);

  // ✅ IMPORTANT FIX:
  // Try bubble by playerId, else fallback to displayName (when senderId missing)
  const getBubbleForPlayer = useCallback(
    (id, p) => {
      if (id == null) return null;

      const byId = bubbles?.[String(id)];
      const byName = bubbles?.[getDisplayName(id, p)];
      const b = byId || byName;
      if (!b) return null;

      const now = Date.now();
      const remaining = Math.max(0, b.expiresAt - now);

      // ✅ slightly longer fade-out to feel less “snappy”
      const fadeMs = 1100;
      const alpha = remaining < fadeMs ? remaining / fadeMs : 1;

      return { ...b, alpha };
    },
    [bubbles, getDisplayName]
  );

  // -----------------------------------
  // INPUT
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
  });

  // -----------------------------------
  // REMOTE INTERPOLATION
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

  // ✅ Gothic RPG bubble styling (subtle, readable, not gold)
  const bubbleStyle = (alpha = 1) => ({
    position: "absolute",
    left: "50%",
    top: -14,
    transform: "translate(-50%, -100%)",

    // ✅ critical: do NOT become the tiny parent width
    display: "inline-block",
    width: "max-content",
    maxWidth: 260,

    padding: "7px 10px",
    borderRadius: 12,

    // ink parchment vibe without being bright
    background: `linear-gradient(180deg,
      rgba(20,16,24,${0.92 * alpha}) 0%,
      rgba(10,8,12,${0.86 * alpha}) 60%,
      rgba(6,5,8,${0.90 * alpha}) 100%)`,

    // iron/stone rim (no gold)
    border: `1px solid rgba(135, 140, 160, ${0.35 * alpha})`,
    boxShadow: `
      0 6px 16px rgba(0,0,0,${0.55 * alpha}),
      inset 0 1px 0 rgba(255,255,255,${0.06 * alpha}),
      inset 0 -1px 0 rgba(0,0,0,${0.35 * alpha})
    `,

    color: `rgba(235, 232, 245, ${0.98 * alpha})`,
    fontSize: 12,
    lineHeight: "14px",
    letterSpacing: "0.15px",

    whiteSpace: "pre-wrap",
    wordBreak: "break-word",

    // tiny arcane glow, still subtle
    textShadow: `
      0 1px 2px rgba(0,0,0,0.85),
      0 0 8px rgba(120, 90, 160, ${0.14 * alpha})
    `,

    pointerEvents: "none",
    filter: `drop-shadow(0 6px 14px rgba(0,0,0,${0.40 * alpha}))`,
    transition: "opacity 220ms linear",
    opacity: alpha,
    zIndex: 50,
  });

  const bubbleTailStyle = (alpha = 1) => ({
    position: "absolute",
    left: "50%",
    bottom: -4,
    width: 9,
    height: 9,
    transform: "translateX(-50%) rotate(45deg)",
    background: `rgba(10, 8, 12, ${0.88 * alpha})`,
    borderRight: `1px solid rgba(135, 140, 160, ${0.26 * alpha})`,
    borderBottom: `1px solid rgba(135, 140, 160, ${0.26 * alpha})`,
    boxShadow: `0 4px 10px rgba(0,0,0,${0.35 * alpha})`,
    pointerEvents: "none",
  });

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

          const r = { ...r0, x: snapWorld(r0.x), y: snapWorld(r0.y) };

          const { x, y } = worldToScreen(r);
          const hovered = hoverId === id;

          const tx = Math.round(x - drawW / 2);
          const ty = Math.round(y - drawH / 2);

          const otherFacing = r?.facing === "left" ? "left" : "right";

          // ✅ bubble by id OR name
          const bub = getBubbleForPlayer(id, p);

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
              {bub && (
                <div style={bubbleStyle(bub.alpha)}>
                  {bub.text}
                  <div style={bubbleTailStyle(bub.alpha)} />
                </div>
              )}

              {hovered && <div style={nameLabelStyle}>{getDisplayName(id, p)}</div>}

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
        {me &&
          (() => {
            const bub = getBubbleForPlayer(myId, me);
            if (!bub) return null;
            return (
              <div style={bubbleStyle(bub.alpha)}>
                {bub.text}
                <div style={bubbleTailStyle(bub.alpha)} />
              </div>
            );
          })()}

        {me && hoverId === myId && (
          <div style={nameLabelStyle}>{getDisplayName(myId, me)}</div>
        )}

        <div style={flipStyle(myFacing)}>
          <img
            src={mySpriteSrc}
            alt="My player"
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
