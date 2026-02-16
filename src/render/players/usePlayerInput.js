import { useCallback, useEffect, useRef } from "react";

export function usePlayerInput({
  enabled,
  sendRateHz = 20,
  screenToWorld,
  onMoveTo,

  getMyPos,
  onFacingChange,

  // NEW: optional stop callback
  onStopMove, // () => void
}) {
  const rightDownRef = useRef(false);
  const mouseRef = useRef({ x: 0, y: 0 });
  const facingRef = useRef("right");

  // last world target we actually sent (deadzone)
  const lastSentWorldRef = useRef({ x: null, y: null });

  const setFacingFromWorldX = useCallback(
    (worldX) => {
      if (!getMyPos) return;
      const me = getMyPos();
      if (!me || !Number.isFinite(me.x)) return;

      const dir = worldX < me.x ? "left" : "right";
      if (dir !== facingRef.current) {
        facingRef.current = dir;
        onFacingChange?.(dir);
      }
    },
    [getMyPos, onFacingChange]
  );

  useEffect(() => {
    if (!enabled) return;

    const onMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const onContextMenu = (e) => e.preventDefault();

    const onMouseDown = (e) => {
      if (e.button !== 2) return; // RMB
      e.preventDefault();
      rightDownRef.current = true;

      // send immediately on press
      const { x, y } = screenToWorld(e.clientX, e.clientY);
      setFacingFromWorldX(Number(x));
      lastSentWorldRef.current = { x, y };
      onMoveTo({ x: Number(x), y: Number(y) });
    };

    const onMouseUp = (e) => {
      if (e.button !== 2) return;
      rightDownRef.current = false;
      lastSentWorldRef.current = { x: null, y: null };

      // ✅ tell server to stop (prevents “coast”)
      onStopMove?.();
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
  }, [enabled, screenToWorld, onMoveTo, onStopMove, setFacingFromWorldX]);

  useEffect(() => {
    if (!enabled) return;

    const intervalMs = Math.max(10, Math.floor(1000 / sendRateHz));

    // ✅ tune: how much the target must change (world units) before we re-send
    const DEADZONE_WORLD = 0.35;

    const tick = () => {
      if (!rightDownRef.current) return;

      const { x, y } = screenToWorld(mouseRef.current.x, mouseRef.current.y);

      const lx = lastSentWorldRef.current.x;
      const ly = lastSentWorldRef.current.y;

      if (lx != null && ly != null) {
        const dx = x - lx;
        const dy = y - ly;
        if (dx * dx + dy * dy < DEADZONE_WORLD * DEADZONE_WORLD) return;
      }

      lastSentWorldRef.current = { x, y };

      setFacingFromWorldX(Number(x));
      onMoveTo({ x: Number(x), y: Number(y) });
    };

    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [enabled, sendRateHz, screenToWorld, onMoveTo, setFacingFromWorldX]);

  return { rightDownRef, mouseRef };
}
