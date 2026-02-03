import { useEffect, useRef } from "react";

/**
 * Handles right-click drag-to-move input.
 * Owns:
 * - mouse position tracking
 * - right button state
 * - context menu prevent
 * - sendRateHz interval while holding right click
 *
 * You pass:
 * - enabled: boolean
 * - sendRateHz: number
 * - screenToWorld(clientX, clientY) -> {x,y}
 * - onMoveTo({x,y}) -> void (e.g. socket.emit)
 */
export function usePlayerInput({
  enabled,
  sendRateHz = 20,
  screenToWorld,
  onMoveTo,
}) {
  const rightDownRef = useRef(false);
  const mouseRef = useRef({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });

  // Mouse listeners (move + right down/up + context menu)
  useEffect(() => {
    if (!enabled) return;

    const onMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const onContextMenu = (e) => e.preventDefault();

    const onMouseDown = (e) => {
      if (e.button !== 2) return; // right click only
      e.preventDefault();
      rightDownRef.current = true;

      const { x, y } = screenToWorld(e.clientX, e.clientY);
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
  }, [enabled, screenToWorld, onMoveTo]);

  // While holding right click, update destination at sendRateHz
  useEffect(() => {
    if (!enabled) return;

    const intervalMs = Math.max(10, Math.floor(1000 / sendRateHz));

    const tick = () => {
      if (!rightDownRef.current) return;

      const { x, y } = screenToWorld(mouseRef.current.x, mouseRef.current.y);
      onMoveTo({ x: Number(x), y: Number(y) });
    };

    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [enabled, sendRateHz, screenToWorld, onMoveTo]);

  return {
    rightDownRef,
    mouseRef,
  };
}
