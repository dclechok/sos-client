// src/render/players/useLocalPlayerPrediction.js

import { useEffect, useRef, useCallback } from "react";

const MAX_SPEED = 45;
const SLOW_RADIUS = 30;
const STOP_EPS = 0.75;
const SNAP_THRESHOLD = 40;
const RECONCILE_K = 0.25;

export function useLocalPlayerPrediction({
  myId,
  players,
  camTargetRef,
  predictedLocalPosRef, // ✅ also write predicted pos here for canvas renderer
}) {
  const predRef = useRef(null);

  // ─── Reconcile with server snapshot ───────────────────────────────────────
  useEffect(() => {
    if (!myId || !players) return;
    const serverP = players[myId];
    if (!serverP) return;

    const sx = Number(serverP.x || 0);
    const sy = Number(serverP.y || 0);

    if (!predRef.current) {
      predRef.current = { x: sx, y: sy, targetX: sx, targetY: sy, moving: false };
      if (camTargetRef) camTargetRef.current = { x: sx, y: sy };
      if (predictedLocalPosRef) predictedLocalPosRef.current = { x: sx, y: sy };
      return;
    }

    const pred = predRef.current;
    const dx = sx - pred.x;
    const dy = sy - pred.y;
    const dist = Math.hypot(dx, dy);

    if (dist > SNAP_THRESHOLD) {
      // Server rejected our position (wall, teleport) → hard snap
      pred.x = sx;
      pred.y = sy;
      pred.targetX = sx;
      pred.targetY = sy;
      pred.moving = false;
    } else if (dist > 0.1) {
      // Small drift → soft blend toward server
      pred.x += dx * RECONCILE_K;
      pred.y += dy * RECONCILE_K;
    }
  }, [players, myId, camTargetRef, predictedLocalPosRef]);

  // ─── Set move target (called immediately on click) ────────────────────────
  const setMoveTarget = useCallback((tx, ty) => {
    if (!predRef.current) return;
    predRef.current.targetX = tx;
    predRef.current.targetY = ty;
    predRef.current.moving = true;
  }, []);

  // ─── Per-frame step — called from PlayerRenderer's RAF loop ──────────────
  const stepPrediction = useCallback(
    (dt) => {
      const pred = predRef.current;
      if (!pred) return null;

      if (pred.moving) {
        const dx = pred.targetX - pred.x;
        const dy = pred.targetY - pred.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= STOP_EPS) {
          pred.x = pred.targetX;
          pred.y = pred.targetY;
          pred.moving = false;
        } else {
          const slowFactor = Math.min(1, dist / SLOW_RADIUS);
          const speed = MAX_SPEED * slowFactor;
          const step = speed * dt;

          if (step >= dist) {
            pred.x = pred.targetX;
            pred.y = pred.targetY;
            pred.moving = false;
          } else {
            pred.x += (dx / dist) * step;
            pred.y += (dy / dist) * step;
          }
        }
      }

      // ✅ Update both refs every frame so camera and canvas stay in sync
      if (camTargetRef) {
        camTargetRef.current = { x: pred.x, y: pred.y };
      }
      if (predictedLocalPosRef) {
        predictedLocalPosRef.current = { x: pred.x, y: pred.y };
      }

      return { x: pred.x, y: pred.y };
    },
    [camTargetRef, predictedLocalPosRef]
  );

  const getPredictedPos = useCallback(() => {
    return predRef.current ? { x: predRef.current.x, y: predRef.current.y } : null;
  }, []);

  return { setMoveTarget, stepPrediction, getPredictedPos, predRef };
}