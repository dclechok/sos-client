// usePlayerInput.js
import { useEffect, useRef } from "react";

export function usePlayerInput({
  enabled,
  sendRateHz = 20,
  screenToWorld,
  onMoveTo,

  // NEW:
  getMyPos, // () => ({x,y})
  onFacingChange, // (dir: "left" | "right") => void
}) {
  const rightDownRef = useRef(false);
  const mouseRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const facingRef = useRef("right");

  const setFacingFromWorldX = (worldX) => {
    if (!getMyPos) return;
    const me = getMyPos();
    if (!me || !Number.isFinite(me.x)) return;

    const dir = worldX < me.x ? "left" : "right";
    if (dir !== facingRef.current) {
      facingRef.current = dir;
      onFacingChange?.(dir);
    }
  };

  useEffect(() => {
    if (!enabled) return;

    const onMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const onContextMenu = (e) => e.preventDefault();

    const onMouseDown = (e) => {
      if (e.button !== 2) return; // right click
      e.preventDefault();
      rightDownRef.current = true;

      const { x, y } = screenToWorld(e.clientX, e.clientY);

      // NEW: update facing based on click
      setFacingFromWorldX(Number(x));

      onMoveTo({ x: Number(x), y: Number(y) });
    };

    const onMouseUp = (e) => {
      if (e.button !== 2) return;
      rightDownRef.current = false;
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
  }, [enabled, screenToWorld, onMoveTo, getMyPos, onFacingChange]);

  useEffect(() => {
    if (!enabled) return;

    const intervalMs = Math.max(10, Math.floor(1000 / sendRateHz));

    const tick = () => {
      if (!rightDownRef.current) return;

      const { x, y } = screenToWorld(mouseRef.current.x, mouseRef.current.y);

      // optional: continuously face toward cursor while holding
      setFacingFromWorldX(Number(x));

      onMoveTo({ x: Number(x), y: Number(y) });
    };

    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [enabled, sendRateHz, screenToWorld, onMoveTo, getMyPos, onFacingChange]);

  return { rightDownRef, mouseRef };
}
