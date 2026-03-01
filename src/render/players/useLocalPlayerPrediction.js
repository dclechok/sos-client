// src/render/players/useLocalPlayerPrediction.js
//
// NO CLIENT-SIDE PREDICTION.
//
// The server is the only authority on where the player is.
// We just interpolate smoothly toward the last known server position.
// This completely eliminates rubberband because there is nothing to correct.
//
// The player feels slightly behind input (~50ms at 20Hz) but hits walls
// cleanly with zero bounce — exactly like classic top-down games (Runescape,
// old Zelda, etc).
//
// If you want to raise the tick rate to reduce that latency, increase
// sendRateHz and the server tick rate together.

import { useEffect, useRef, useCallback } from "react";

// How fast the rendered position chases the server position, in world units/sec.
// Higher = snappier, lower = smoother/floatier.
// At MAX_SPEED=45 and typical 50ms lag, set this to ~120 so it catches up fast.
const INTERP_SPEED = 120;

// Snap immediately if server position jumps more than this (teleport / respawn).
const SNAP_THRESHOLD = 80;

export function useLocalPlayerPrediction({
  myId,
  players,
  camTargetRef,
  predictedLocalPosRef,
  // onWallBlocked not needed anymore — no prediction to block
}) {
  // The smoothed position we render at (lerps toward serverPos).
  const renderPosRef = useRef(null);
  // Latest authoritative position from server.
  const serverPosRef = useRef(null);

  const writeOut = useCallback((x, y) => {
    if (camTargetRef)         camTargetRef.current         = { x, y };
    if (predictedLocalPosRef) predictedLocalPosRef.current = { x, y };
  }, [camTargetRef, predictedLocalPosRef]);

  // Ingest server snapshots — just store the authoritative position.
  useEffect(() => {
    if (!myId || !players) return;
    const sp = players[myId];
    if (!sp) return;

    const sx = Number(sp.x || 0);
    const sy = Number(sp.y || 0);

    if (!renderPosRef.current) {
      // First snapshot — start right at server position.
      renderPosRef.current = { x: sx, y: sy };
      serverPosRef.current = { x: sx, y: sy };
      writeOut(sx, sy);
      return;
    }

    serverPosRef.current = { x: sx, y: sy };

    // If server jumped far (teleport / respawn) snap instantly.
    const dist = Math.hypot(sx - renderPosRef.current.x, sy - renderPosRef.current.y);
    if (dist > SNAP_THRESHOLD) {
      renderPosRef.current = { x: sx, y: sy };
      writeOut(sx, sy);
    }
  }, [players, myId, writeOut]);

  // setMoveTarget is called by the input system.
  // We still emit the socket event (done in PlayerRenderer.onMoveTo) but
  // we don't use it for local prediction — server pos drives everything.
  const setMoveTarget = useCallback((_tx, _ty) => {
    // no-op for local rendering
  }, []);

  // Per-frame smooth chase toward server position.
  const stepPrediction = useCallback((dt) => {
    const rp = renderPosRef.current;
    const sp = serverPosRef.current;
    if (!rp || !sp) return null;

    const dx   = sp.x - rp.x;
    const dy   = sp.y - rp.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 0.05) {
      const step = Math.min(INTERP_SPEED * dt, dist);
      rp.x += (dx / dist) * step;
      rp.y += (dy / dist) * step;
    } else {
      rp.x = sp.x;
      rp.y = sp.y;
    }

    writeOut(rp.x, rp.y);
    return { x: rp.x, y: rp.y };
  }, [writeOut]);

  const getPredictedPos = useCallback(() => {
    return renderPosRef.current ? { x: renderPosRef.current.x, y: renderPosRef.current.y } : null;
  }, []);

  return { setMoveTarget, stepPrediction, getPredictedPos, predRef: renderPosRef };
}