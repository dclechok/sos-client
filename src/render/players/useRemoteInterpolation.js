import { useEffect, useMemo, useRef, useState, useCallback } from "react";

/**
 * Remote smoothing (production style):
 * - History buffer per player
 * - Interpolate at (now - interpDelayMs)
 * - If renderTime newer than newest sample:
 *     short CLAMPED extrapolation using estimated velocity
 *
 * Exposes:
 * - remoteIds: list of remote player IDs
 * - getRenderState(id): latest smoothed pose {x,y,a}
 *
 * NOTE:
 * We keep a tiny RAF "frame tick" state so React re-renders and the DOM
 * receives updated transforms, while the heavy data stays in refs.
 */
export function useRemoteInterpolation({ players, myId, interpDelayMs = 120 }) {
  const historyRef = useRef(new Map()); // id -> [{t,x,y,a},...]
  const renderRef = useRef({}); // id -> {x,y,a}

  // Tiny state just to trigger component re-render each RAF
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
          a: Number(p.angle || 0),
        });
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

  const lerpAngle = (a, b, t) => {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  };

  // RAF interpolation/extrapolation loop
  useEffect(() => {
    let raf = 0;

    const MAX_EXTRAP_MS = 140; // keep small to avoid rubberband

    const tick = () => {
      const now = Date.now();
      const renderTime = now - interpDelayMs;

      const out = {};
      const hist = historyRef.current;

      for (const [id, buf] of hist.entries()) {
        if (!buf || buf.length === 0) continue;

        // Find bracketing samples
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
          // renderTime older than oldest => use oldest
          const s = buf[0];
          out[id] = { x: s.x, y: s.y, a: s.a };
          continue;
        }

        if (s1) {
          // Interpolate
          const dt = s1.t - s0.t;
          const alpha =
            dt > 0 ? Math.min(1, Math.max(0, (renderTime - s0.t) / dt)) : 0;

          out[id] = {
            x: lerp(s0.x, s1.x, alpha),
            y: lerp(s0.y, s1.y, alpha),
            a: lerpAngle(s0.a, s1.a, alpha),
          };
          continue;
        }

        // No s1 => renderTime newer than newest sample
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
              a: newest.a, // keep last angle (looks better than extrapolating)
            };
            continue;
          }
        }

        // fallback: hold last
        out[id] = { x: newest.x, y: newest.y, a: newest.a };
      }

      // Store latest smoothed poses in ref
      renderRef.current = out;

      // Trigger a cheap re-render so PlayerRenderer reads fresh ref
      setFrame((f) => (f + 1) & 1023);

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [interpDelayMs]);

  // ✅ stable getter
  const getRenderState = useCallback((id) => renderRef.current?.[id], []);

  return { remoteIds, getRenderState };
}
