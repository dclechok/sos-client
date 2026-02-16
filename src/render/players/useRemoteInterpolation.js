import { useEffect, useMemo, useRef, useState, useCallback } from "react";

/**
 * Remote smoothing (no rotation):
 * - History buffer per player
 * - Interpolate at (now - interpDelayMs)
 * - Optional short extrapolation using estimated velocity
 *
 * Exposes:
 * - remoteIds
 * - getRenderState(id): {x, y, facing}
 */
export function useRemoteInterpolation({ players, myId, interpDelayMs = 120 }) {
  const historyRef = useRef(new Map()); // id -> [{t,x,y,facing},...]
  const renderRef = useRef({}); // id -> {x,y,facing}

  const [, setFrame] = useState(0);

  const remoteIds = useMemo(() => {
    if (!players || !myId) return [];
    return Object.keys(players).filter((id) => id !== myId && players[id]);
  }, [players, myId]);

  const getSnapshotTimeMs = (p) => {
    const t =
      (Number.isFinite(p?.ts) && p.ts) ||
      (Number.isFinite(p?.t) && p.t) ||
      (Number.isFinite(p?.serverTime) && p.serverTime);
    return Number.isFinite(t) ? Number(t) : Date.now();
  };

  // Append incoming snapshots to history
  useEffect(() => {
    if (!players || !myId) return;

    const now = Date.now();
    const hist = historyRef.current;

    for (const id of remoteIds) {
      const p = players[id];
      if (!p) continue;

      const buf = hist.get(id) || [];
      const t = getSnapshotTimeMs(p);

      // Only push if newer than last sample
      if (!buf.length || t > buf[buf.length - 1].t) {
        buf.push({
          t,
          x: Number(p.x || 0),
          y: Number(p.y || 0),
          // keep as last-known discrete value
          facing: p?.facing === "left" ? "left" : "right",
        });
      } else if (buf.length) {
        // If position sample isn't newer, still allow facing to update
        const last = buf[buf.length - 1];
        const f = p?.facing === "left" ? "left" : "right";
        if (f !== last.facing) last.facing = f;
      }

      // Keep ~2s of history
      const cutoff = now - 2000;
      while (buf.length && buf[0].t < cutoff) buf.shift();

      hist.set(id, buf);
    }

    // Cleanup disconnected
    for (const id of hist.keys()) {
      if (!players[id] || id === myId) hist.delete(id);
    }
  }, [players, myId, remoteIds]);

  const lerp = (a, b, t) => a + (b - a) * t;

  // RAF interpolation/extrapolation loop
  useEffect(() => {
    let raf = 0;
    const MAX_EXTRAP_MS = 0;

    const tick = () => {
      const now = Date.now();
      const renderTime = now - interpDelayMs;

      const out = {};
      const hist = historyRef.current;

      for (const [id, buf] of hist.entries()) {
        if (!buf || buf.length === 0) continue;

        let s0 = null;
        let s1 = null;

        for (let i = buf.length - 1; i >= 0; i--) {
          if (buf[i].t <= renderTime) {
            s0 = buf[i];
            s1 = buf[i + 1] || null;
            break;
          }
        }

        if (!s0) {
          const s = buf[0];
          out[id] = { x: s.x, y: s.y, facing: s.facing || "right" };
          continue;
        }

        if (s1) {
          const dt = s1.t - s0.t;
          const alpha =
            dt > 0 ? Math.min(1, Math.max(0, (renderTime - s0.t) / dt)) : 0;

          out[id] = {
            x: lerp(s0.x, s1.x, alpha),
            y: lerp(s0.y, s1.y, alpha),
            // discrete: choose the nearer/next sample's facing
            facing: alpha < 0.5 ? (s0.facing || "right") : (s1.facing || "right"),
          };
          continue;
        }

        // Extrapolate position (hold facing)
        const newest = buf[buf.length - 1];

        if (buf.length >= 2) {
          const prev = buf[buf.length - 2];
          const dtMs = newest.t - prev.t;

          if (dtMs > 0) {
            const vx = (newest.x - prev.x) / (dtMs / 1000);
            const vy = (newest.y - prev.y) / (dtMs / 1000);

            const extraMs = Math.min(
              MAX_EXTRAP_MS,
              Math.max(0, renderTime - newest.t)
            );

            const extraS = extraMs / 1000;

            out[id] = {
              x: newest.x + vx * extraS,
              y: newest.y + vy * extraS,
              facing: newest.facing || "right",
            };
            continue;
          }
        }

        out[id] = { x: newest.x, y: newest.y, facing: newest.facing || "right" };
      }

      renderRef.current = out;
      setFrame((f) => (f + 1) & 1023);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [interpDelayMs]);

  const getRenderState = useCallback((id) => renderRef.current?.[id], []);

  return { remoteIds, getRenderState };
}
