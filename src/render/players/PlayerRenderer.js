// src/render/players/PlayerRenderer.js
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { usePlayerInput } from "./usePlayerInput";
import { useRemoteInterpolation } from "./useRemoteInterpolation";
import { getSpriteByClassId } from "./characterClasses";
import { getRoleColor } from "../../utils/roles";
import "../../styles/PlayerRenderer.css";

export default function PlayerRenderer({
  socket,
  myId,
  players,

  sendRateHz = 20,

  // keep props for backward-compat, but we won't use them as the primary source now
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
  // { [key]: { text, t, expiresAt, role } }
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

  // Normalize role so OWNER/Admin/etc still map to roles.js keys
  const normalizeRole = useCallback((role) => {
    const raw =
      role && typeof role === "object"
        ? role.name ?? role.role ?? role.type ?? ""
        : role;

    const key = String(raw || "player").trim().toLowerCase();
    return key || "player";
  }, []);

  // -----------------------------------
  // CHAT BUBBLES
  // -----------------------------------
  useEffect(() => {
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
      const role = d.role ?? null;
      if (!message) return;

      const key =
        senderIdRaw != null && String(senderIdRaw).trim()
          ? String(senderIdRaw)
          : user;

      if (!key) return;

      const ttl = ttlFor(message);

      setBubbles((prev) => ({
        ...prev,
        [key]: { text: message, t, expiresAt: t + ttl, role },
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

  const getBubbleForPlayer = useCallback(
    (id, p) => {
      if (id == null) return null;

      const byId = bubbles?.[String(id)];
      const byName = bubbles?.[getDisplayName(id, p)];
      const b = byId || byName;
      if (!b) return null;

      const now = Date.now();
      const remaining = Math.max(0, b.expiresAt - now);

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
  // Sprite resolution (class -> sprite)
  // -----------------------------------
  const getSpriteForPlayer = useCallback((p, fallbackSrc) => {
    const cls = p?.class;
    return cls ? getSpriteByClassId(cls, fallbackSrc) : fallbackSrc;
  }, []);

  const myResolvedSprite = useMemo(() => {
    return getSpriteForPlayer(me, mySpriteSrc);
  }, [getSpriteForPlayer, me, mySpriteSrc]);

  // -----------------------------------
  // Dynamic helpers
  // -----------------------------------
  const roleToColor = useCallback(
    (role) => {
      const rc = getRoleColor(normalizeRole(role));
      return rc?.primary || "#e9e6f2";
    },
    [normalizeRole]
  );

  const displayX = me ? Math.round(me.x) : 0;
  const displayY = me ? Math.round(me.y) : 0;

  return (
    <div className="pr-root">
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
          const otherResolvedSprite = getSpriteForPlayer(p, otherSpriteSrc);

          const bub = getBubbleForPlayer(id, p);
          const name = getDisplayName(id, p);

          return (
            <div
              key={id}
              className={`pr-player ${hovered ? "is-hover" : ""}`}
              onMouseEnter={() => setHoverId(id)}
              onMouseLeave={() => setHoverId((cur) => (cur === id ? null : cur))}
              style={{
                width: drawW,
                height: drawH,
                transform: `translate3d(${tx}px, ${ty}px, 0)`,
              }}
            >
              {bub && (
                <div
                  className="pr-bubble"
                  style={{
                    "--bubbleA": bub.alpha,
                  }}
                >
                  {bub.text}
                  <div className="pr-bubbleTail" />
                </div>
              )}

              {/* ✅ NAME (hover) */}
              {hovered && (
                <div
                  className="pr-name"
                  style={{
                    "--nameColor": roleToColor(p?.role),
                  }}
                >
                  {name}
                </div>
              )}

              <div
                className={`pr-spriteWrap ${
                  otherFacing === "left" ? "is-left" : ""
                }`}
              >
                <img
                  className="pr-sprite"
                  src={otherResolvedSprite}
                  alt="Other player"
                  draggable={false}
                />
              </div>
            </div>
          );
        })}

      {/* LOCAL PLAYER */}
      <div
        className={`pr-local ${hoverId === myId ? "is-hover" : ""}`}
        onMouseEnter={() => setHoverId(myId)}
        onMouseLeave={() => setHoverId((cur) => (cur === myId ? null : cur))}
        style={{
          width: drawW,
          height: drawH,
        }}
      >
        {me &&
          (() => {
            const bub = getBubbleForPlayer(myId, me);
            if (!bub) return null;
            return (
              <div className="pr-bubble" style={{ "--bubbleA": bub.alpha }}>
                {bub.text}
                <div className="pr-bubbleTail" />
              </div>
            );
          })()}

        {/* ✅ NAME (hover) */}
        {me && hoverId === myId && (
          <div
            className="pr-name"
            style={{
              "--nameColor": roleToColor(me?.role),
            }}
          >
            {getDisplayName(myId, me)}
          </div>
        )}

        <div className={`pr-spriteWrap ${myFacing === "left" ? "is-left" : ""}`}>
          <img
            className="pr-sprite"
            src={myResolvedSprite}
            alt="My player"
            draggable={false}
          />
        </div>
      </div>

      {/* DEBUG */}
      {me && (
        <div className="pr-debug">
          x: {displayX}
          <br />
          y: {displayY}
          <br />
          zoom: {z}x
          <br />
          face: {myFacing}
          <br />
          class: {String(me?.class || "—")}
          <br />
          role: {String(me?.role || "player")}
        </div>
      )}
    </div>
  );
}