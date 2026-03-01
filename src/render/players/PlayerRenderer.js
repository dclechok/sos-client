// src/render/players/PlayerRenderer.js

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { usePlayerInput }           from "./usePlayerInput";
import { useRemoteInterpolation }   from "./useRemoteInterpolation";
import { useLocalPlayerPrediction } from "./useLocalPlayerPrediction";
import { getRoleColor }             from "../../utils/roles";
import "../../styles/PlayerRenderer.css";

export default function PlayerRenderer({
  socket,
  myId,
  players,
  character,
  accountRole,
  sendRateHz    = 20,
  zoom          = 2,
  renderOthers  = true,
  playerNames   = {},
  canvasRef,
  camSmoothRef,
  camTargetRef,
  predictedLocalPosRef,
  spriteW = 16,
  spriteH = 16,
}) {
  const [hoverId, setHoverId]   = useState(null);
  const [myFacing, setMyFacing] = useState("right");
  const [bubbles, setBubbles]   = useState({});

  const me    = myId && players ? players[myId] : null;
  const meRef = useRef(null);
  useEffect(() => { meRef.current = me; }, [me]);

  const z     = Math.max(1, Math.floor(Number(zoom) || 1));
  const drawW = spriteW * z;
  const drawH = spriteH * z;

  // ── Canvas / world transforms ──────────────────────────────────────────────
  const getCanvasMetrics = useCallback(() => {
    const canvas = canvasRef?.current;
    if (!canvas) return { cx: window.innerWidth / 2, cy: window.innerHeight / 2, scale: 1 };
    const r = canvas.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, scale: r.width ? canvas.width / r.width : 1 };
  }, [canvasRef]);

  const getRenderCam = useCallback(() => {
    const cam = camSmoothRef?.current;
    const fb  = meRef.current || { x: 0, y: 0 };
    const cx  = Number.isFinite(cam?.x) ? Number(cam.x) : Number(fb.x || 0);
    const cy  = Number.isFinite(cam?.y) ? Number(cam.y) : Number(fb.y || 0);
    return z > 1 ? { x: Math.round(cx * z) / z, y: Math.round(cy * z) / z } : { x: cx, y: cy };
  }, [camSmoothRef, z]);

  const snapWorld = useCallback((v) => {
    const n = Number(v || 0);
    return !Number.isFinite(n) ? 0 : z > 1 ? Math.round(n * z) / z : Math.round(n);
  }, [z]);

  const worldToScreen = useCallback((p) => {
    const { cx, cy, scale } = getCanvasMetrics();
    const cam = getRenderCam();
    return {
      x: cx + ((Number(p.x || 0) - cam.x) * z) / scale,
      y: cy + ((Number(p.y || 0) - cam.y) * z) / scale,
    };
  }, [getCanvasMetrics, getRenderCam, z]);

  const screenToWorld = useCallback((clientX, clientY) => {
    const { cx, cy, scale } = getCanvasMetrics();
    const cam = getRenderCam();
    return { x: cam.x + ((clientX - cx) * scale) / z, y: cam.y + ((clientY - cy) * scale) / z };
  }, [getCanvasMetrics, getRenderCam, z]);

  // ── Display helpers ────────────────────────────────────────────────────────
  const getDisplayName = useCallback((id, p) => {
    const s = p?.name; if (s && String(s).trim()) return String(s);
    const m = playerNames?.[id]; if (m && String(m).trim()) return String(m);
    if (id === myId && character?.charName) return String(character.charName);
    return `Player ${String(id).slice(0, 4)}`;
  }, [playerNames, myId, character]);

  const normalizeRole = useCallback((role) => {
    const raw = role && typeof role === "object"
      ? role.name ?? role.role ?? role.type ?? role.title ?? role.key ?? role.rank ?? role.level ?? "" : role;
    return String(raw || "player").trim().toLowerCase() || "player";
  }, []);

  // ── Chat bubbles ───────────────────────────────────────────────────────────
  useEffect(() => {
    const ttlFor = (t) => Math.max(3000, Math.min(18000, 2000 + String(t || "").length * 80));
    const onBubble = (e) => {
      const d = e?.detail || {};
      const msg = String(d.message || "").trim(); if (!msg) return;
      const key = String(d.senderId ?? d.user ?? "").trim(); if (!key) return;
      setBubbles((prev) => ({ ...prev, [key]: { text: msg, expiresAt: Date.now() + ttlFor(msg), role: d.role ?? null } }));
    };
    window.addEventListener("chat:bubble", onBubble);
    return () => window.removeEventListener("chat:bubble", onBubble);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setBubbles((prev) => {
        let changed = false; const next = { ...prev };
        for (const k of Object.keys(next)) { if (now >= next[k].expiresAt) { delete next[k]; changed = true; } }
        return changed ? next : prev;
      });
    }, 250);
    return () => clearInterval(id);
  }, []);

  const getBubble = useCallback((id, p) => {
    const b = bubbles?.[String(id)] || bubbles?.[getDisplayName(id, p)];
    if (!b) return null;
    const rem = Math.max(0, b.expiresAt - Date.now());
    return { ...b, alpha: rem < 1100 ? rem / 1100 : 1 };
  }, [bubbles, getDisplayName]);

  // ── Input ──────────────────────────────────────────────────────────────────
  const inputEnabled     = Boolean(socket);
  const onMoveToRef      = useRef(null);
  const getMyPosRef      = useRef(null);
  const onMoveToDelegate = useCallback((pos) => onMoveToRef.current?.(pos), []);
  const getMyPosDelegate = useCallback(() => getMyPosRef.current?.(), []);

  usePlayerInput({
    enabled:        inputEnabled,
    sendRateHz,
    screenToWorld,
    onMoveTo:       onMoveToDelegate,
    getMyPos:       getMyPosDelegate,
    onFacingChange: (dir) => setMyFacing(dir),
    button:         2,
    deadzoneWorld:  0.5,
    targetRef:      canvasRef,
  });

  // ── Server-interpolated position ───────────────────────────────────────────
  const { setMoveTarget, stepPrediction, getPredictedPos } = useLocalPlayerPrediction({
    myId, players, camTargetRef, predictedLocalPosRef,
  });

  const onMoveTo = useCallback(({ x, y }) => {
    setMoveTarget(x, y);
    if (socket) socket.emit("player:moveTo", { x: Number(x), y: Number(y) });
  }, [socket, setMoveTarget]);

  const getMyPos = useCallback(
    () => getPredictedPos() || meRef.current || getRenderCam(),
    [getPredictedPos, getRenderCam]
  );

  useEffect(() => { onMoveToRef.current = onMoveTo; }, [onMoveTo]);
  useEffect(() => { getMyPosRef.current = getMyPos; }, [getMyPos]);

  useEffect(() => {
    let raf = 0, lastMs = performance.now();
    const tick = (nowMs) => {
      stepPrediction(Math.min((nowMs - lastMs) / 1000, 0.05));
      lastMs = nowMs;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stepPrediction]);

  // ── Remote interpolation ───────────────────────────────────────────────────
  const { remoteIds, getRenderState } = useRemoteInterpolation({ players, myId, interpDelayMs: 120 });
  const visibleRemoteIds = useMemo(() => renderOthers ? remoteIds : [], [renderOthers, remoteIds]);

  const roleToColor = useCallback((role) => {
    const rc = getRoleColor(normalizeRole(role));
    return rc?.primary || "#e9e6f2";
  }, [normalizeRole]);

  const myRole   = me?.accountRole ?? accountRole ?? "player";
  const pred     = getPredictedPos();
  const displayX = pred ? Math.round(pred.x) : me ? Math.round(me.x) : 0;
  const displayY = pred ? Math.round(pred.y) : me ? Math.round(me.y) : 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="pr-root">
      {players && myId && visibleRemoteIds.map((id) => {
        const p = players[id]; if (!p) return null;
        const r0 = getRenderState(id) || { x: Number(p.x || 0), y: Number(p.y || 0), facing: p?.facing === "left" ? "left" : "right" };
        const r  = { ...r0, x: snapWorld(r0.x), y: snapWorld(r0.y) };
        const { x, y } = worldToScreen(r);
        const hovered = hoverId === id;
        const bub  = getBubble(id, p);
        const name = getDisplayName(id, p);
        return (
          <div key={id} className={`pr-player ${hovered ? "is-hover" : ""}`}
            onMouseEnter={() => setHoverId(id)}
            onMouseLeave={() => setHoverId((c) => c === id ? null : c)}
            style={{ width: drawW, height: drawH, transform: `translate3d(${Math.round(x - drawW / 2)}px, ${Math.round(y - drawH / 2)}px, 0)` }}
          >
            {bub && <div className="pr-bubble" style={{ "--bubbleA": bub.alpha }}>{bub.text}<div className="pr-bubbleTail" /></div>}
            {hovered && <div className="pr-name" style={{ "--nameColor": roleToColor(p?.accountRole ?? "player") }}>{name}</div>}
          </div>
        );
      })}

      <div className={`pr-local ${hoverId === myId ? "is-hover" : ""}`}
        onMouseEnter={() => setHoverId(myId)}
        onMouseLeave={() => setHoverId((c) => c === myId ? null : c)}
        style={{ width: drawW, height: drawH }}
      >
        {me && (() => { const bub = getBubble(myId, me); return bub ? <div className="pr-bubble" style={{ "--bubbleA": bub.alpha }}>{bub.text}<div className="pr-bubbleTail" /></div> : null; })()}
        {me && hoverId === myId && <div className="pr-name" style={{ "--nameColor": roleToColor(myRole) }}>{getDisplayName(myId, me)}</div>}
      </div>

      {me && (
        <div className="pr-debug">
          x: {displayX}<br />y: {displayY}<br />zoom: {z}x<br />
          face: {myFacing}<br />class: {String(me?.class || "—")}<br />role: {String(myRole)}
        </div>
      )}
    </div>
  );
}