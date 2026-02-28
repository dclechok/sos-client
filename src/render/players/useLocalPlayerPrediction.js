// src/render/players/useLocalPlayerPrediction.js

import { useEffect, useRef, useCallback } from "react";

const MAX_SPEED      = 45;
const SLOW_RADIUS    = 30;
const STOP_EPS       = 0.75;

// How far server can be from prediction before we treat it as a hard correction.
// Must be larger than normal lag drift but smaller than a wall rejection.
//
// At MAX_SPEED=45 and 30Hz server, one tick = 1.5 units of movement.
// At ~100ms latency that's ~3 ticks = ~4.5 units of natural drift.
// A wall rejection snaps the server position to the blocked side — typically
// 5-15 units away from where we predicted we'd be.
// So 10 is safely above normal drift but catches real wall blocks.
const SNAP_THRESHOLD = 10;

// When server disagrees with us while moving, we detect it as a wall hit
// if the server hasn't moved closer to our target in the last snapshot.
// We cancel the move target so we stop fighting the wall.
const WALL_CORRECTION_EPS = 3.5; // server must be at least this far from pred to count as blocked

export function useLocalPlayerPrediction({
  myId,
  players,
  camTargetRef,
  predictedLocalPosRef,
}) {
  const predRef     = useRef(null);
  const prevServerRef = useRef(null); // last server pos, to detect if server is stuck (wall)

  // ─── Reconcile with server snapshot ───────────────────────────────────────
  useEffect(() => {
    if (!myId || !players) return;
    const serverP = players[myId];
    if (!serverP) return;

    const sx = Number(serverP.x || 0);
    const sy = Number(serverP.y || 0);

    if (!predRef.current) {
      predRef.current   = { x: sx, y: sy, targetX: sx, targetY: sy, moving: false };
      prevServerRef.current = { x: sx, y: sy };
      if (camTargetRef)         camTargetRef.current         = { x: sx, y: sy };
      if (predictedLocalPosRef) predictedLocalPosRef.current = { x: sx, y: sy };
      return;
    }

    const pred = predRef.current;
    const prev = prevServerRef.current;

    const dx   = sx - pred.x;
    const dy   = sy - pred.y;
    const dist = Math.hypot(dx, dy);

    if (dist > SNAP_THRESHOLD) {
      // Large gap — hard server correction (teleport, anti-cheat, large wall snap)
      pred.x       = sx;
      pred.y       = sy;
      pred.targetX = sx;
      pred.targetY = sy;
      pred.moving  = false;
    } else if (pred.moving && dist > WALL_CORRECTION_EPS) {
      // We're moving but server is meaningfully behind our prediction.
      // Check if the server itself is stuck (wall blocked) vs just lagging.
      // If server position hasn't changed much from last snapshot, it's a wall.
      const serverMovedDist = prev
        ? Math.hypot(sx - prev.x, sy - prev.y)
        : Infinity;

      if (serverMovedDist < 0.5) {
        // Server is stuck — wall is blocking us. Cancel move target and snap to server.
        pred.x       = sx;
        pred.y       = sy;
        pred.targetX = sx;
        pred.targetY = sy;
        pred.moving  = false;
      }
      // else: server is moving (just lagging) — keep trusting prediction
    } else if (!pred.moving && dist > 0.1) {
      // Standing still — gently correct any drift
      pred.x += dx * 0.2;
      pred.y += dy * 0.2;
    }

    prevServerRef.current = { x: sx, y: sy };
  }, [players, myId, camTargetRef, predictedLocalPosRef]);

  // ─── Set move target (called immediately on click) ────────────────────────
  const setMoveTarget = useCallback((tx, ty) => {
    if (!predRef.current) return;
    predRef.current.targetX = tx;
    predRef.current.targetY = ty;
    predRef.current.moving  = true;
  }, []);

  // ─── Per-frame step — called from PlayerRenderer's RAF loop ──────────────
  const stepPrediction = useCallback(
    (dt) => {
      const pred = predRef.current;
      if (!pred) return null;

      if (pred.moving) {
        const dx   = pred.targetX - pred.x;
        const dy   = pred.targetY - pred.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= STOP_EPS) {
          pred.x      = pred.targetX;
          pred.y      = pred.targetY;
          pred.moving = false;
        } else {
          const slowFactor = Math.min(1, dist / SLOW_RADIUS);
          const speed      = MAX_SPEED * slowFactor;
          const step       = speed * dt;

          if (step >= dist) {
            pred.x      = pred.targetX;
            pred.y      = pred.targetY;
            pred.moving = false;
          } else {
            pred.x += (dx / dist) * step;
            pred.y += (dy / dist) * step;
          }
        }
      }

      if (camTargetRef)         camTargetRef.current         = { x: pred.x, y: pred.y };
      if (predictedLocalPosRef) predictedLocalPosRef.current = { x: pred.x, y: pred.y };

      return { x: pred.x, y: pred.y };
    },
    [camTargetRef, predictedLocalPosRef]
  );

  const getPredictedPos = useCallback(() => {
    return predRef.current ? { x: predRef.current.x, y: predRef.current.y } : null;
  }, []);

  return { setMoveTarget, stepPrediction, getPredictedPos, predRef };
}