import { useEffect, useMemo, useRef, useState, useCallback } from "react";

/**
 * Remote smoothing (pixel-friendly):
 * - History buffer per player
 * - Interpolate at (now - interpDelayMs)
 * - NO extrapolation by default (prevents idle drift/jiggle)
 * - Uses LOCAL receipt time (Date.now()) to avoid server/client clock mismatch
 *
 * Exposes:
 * - remoteIds
 * - getRenderState(id): {x, y, facing}
 */
export function useRemoteInterpolation({
  players,
  myId,
  interpDelayMs = 120,

  // tunables
  bufferMs = 2000,
  velEps = 0.02,        // clamp tiny velocity noise
  enableExtrap = false, // keep false for maximum stability
  maxExtrapMs = 60,
}) {
  const historyRef = useRef(new Map()); // id -> [{t,x,y,vx,vy,facing},...]
  const renderRef = useRef({}); // id -> {x,y,facing}
  const [, setFrame] = useState(0);

  const remoteIds = useMemo(() => {
    if (!players || !myId) return [];
    return Object.keys(players).filter((id) => id !== myId && players[id]);
  }, [players, myId]);

  const lerp = (a, b, t) => a + (b - a) * t;

  useEffect(() => {
    if (!players || !myId) return;

    const now = Date.now();
    const hist = historyRef.current;

    for (const id of remoteIds) {
      const p = players[id];
      if (!p) continue;

      const buf = hist.get(id) || [];

      // ✅ Use receipt time (local clock) — avoids ts mismatch jitter
      const t = now;

      const facing = p?.facing === "left" ? "left" : "right";

      const x = Number(p.x || 0);
      const y = Number(p.y || 0);

      // Clamp tiny vel noise
      let vx = Number(p.vx || 0);
      let vy = Number(p.vy || 0);
      if (Math.abs(vx) < velEps) vx = 0;
      if (Math.abs(vy) < velEps) vy = 0;

      buf.push({ t, x, y, vx, vy, facing });

      // keep buffer
      const cutoff = now - bufferMs;
      while (buf.length && buf[0].t < cutoff) buf.shift();

      hist.set(id, buf);
    }

    // cleanup removed players
    for (const id of hist.keys()) {
      if (!players[id] || id === myId) hist.delete(id);
    }
  }, [players, myId, remoteIds, bufferMs, velEps]);

  useEffect(() => {
    let raf = 0;

    const tick = () => {
      const now = Date.now();
      const renderTime = now - interpDelayMs;

      const out = {};
      const hist = historyRef.current;

      for (const [id, buf] of hist.entries()) {
        if (!buf || buf.length === 0) continue;

        // Find s0 <= renderTime <= s1
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
            facing:
              alpha < 0.5 ? (s0.facing || "right") : (s1.facing || "right"),
          };
          continue;
        }

        // No newer sample
        const newest = buf[buf.length - 1];

        // ✅ Default: hold last known (most stable when YOU move)
        if (!enableExtrap) {
          out[id] = {
            x: newest.x,
            y: newest.y,
            facing: newest.facing || "right",
          };
          continue;
        }

        // Optional extrapolation
        const speed2 = newest.vx * newest.vx + newest.vy * newest.vy;
        if (speed2 === 0) {
          out[id] = {
            x: newest.x,
            y: newest.y,
            facing: newest.facing || "right",
          };
          continue;
        }

        const extraMs = Math.min(maxExtrapMs, Math.max(0, renderTime - newest.t));
        const extraS = extraMs / 1000;

        out[id] = {
          x: newest.x + newest.vx * extraS,
          y: newest.y + newest.vy * extraS,
          facing: newest.facing || "right",
        };
      }

      renderRef.current = out;
      setFrame((f) => (f + 1) & 1023);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [interpDelayMs, enableExtrap, maxExtrapMs]);

  const getRenderState = useCallback((id) => renderRef.current?.[id], []);

  return { remoteIds, getRenderState };
}
