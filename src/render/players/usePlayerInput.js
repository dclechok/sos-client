import { useCallback, useEffect, useRef } from "react";

/**
 * Hold-to-move (RMB by default) that *continuously* updates the server target
 * to whatever is currently under your cursor while the button is held.
 *
 * Key differences vs your version:
 * - Uses pointer capture on the target element (canvas) so moves keep flowing even off-canvas.
 * - Uses a requestAnimationFrame loop + sendRateHz throttle (instead of setInterval).
 * - Keeps latest callbacks in refs to avoid stale closures.
 *
 * Usage:
 *   const { bindTarget } = usePlayerInput({ ..., targetRef: canvasRef });
 *   // OR if you can't pass targetRef, it will fall back to window events.
 */
export function usePlayerInput({
  enabled,
  sendRateHz = 20,
  screenToWorld,
  onMoveTo,

  getMyPos,
  onFacingChange,

  // options
  button = 2, // 2 = RMB
  deadzoneWorld = 0.35,

  // strongly recommended: your canvasRef (or container ref)
  targetRef = null,
}) {
  const isDownRef = useRef(false);
  const pointerIdRef = useRef(null);

  // last known cursor in screen px
  const mouseRef = useRef({ x: 0, y: 0 });

  // last target we actually sent to server
  const lastSentWorldRef = useRef({ x: null, y: null });

  const facingRef = useRef("right");

  // keep latest functions in refs (prevents stale closures)
  const screenToWorldRef = useRef(screenToWorld);
  const onMoveToRef = useRef(onMoveTo);
  const getMyPosRef = useRef(getMyPos);
  const onFacingChangeRef = useRef(onFacingChange);

  useEffect(() => {
    screenToWorldRef.current = screenToWorld;
    onMoveToRef.current = onMoveTo;
    getMyPosRef.current = getMyPos;
    onFacingChangeRef.current = onFacingChange;
  }, [screenToWorld, onMoveTo, getMyPos, onFacingChange]);

  const BUTTON_MASK = button === 0 ? 1 : button === 1 ? 4 : 2; // left=1, middle=4, right=2

  const setFacingFromWorldX = useCallback((worldX) => {
    const getMyPosFn = getMyPosRef.current;
    if (!getMyPosFn) return;

    const me = getMyPosFn();
    if (!me || !Number.isFinite(me.x)) return;

    const dir = worldX < me.x ? "left" : "right";
    if (dir !== facingRef.current) {
      facingRef.current = dir;
      onFacingChangeRef.current?.(dir);
    }
  }, []);

  // pointer listeners
  useEffect(() => {
    if (!enabled) return;

    const targetEl = targetRef?.current ?? window;

    const onContextMenu = (e) => {
      // prevents RMB menu interrupting drag/hold
      e.preventDefault();
    };

    const onPointerDown = (e) => {
      if (e.button !== button) return;

      e.preventDefault();
      isDownRef.current = true;
      pointerIdRef.current = e.pointerId ?? null;

      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;

      // capture pointer so we continue to get move/up even if we leave the element
      if (targetEl !== window && targetEl?.setPointerCapture && e.pointerId != null) {
        try {
          targetEl.setPointerCapture(e.pointerId);
        } catch {
          // ignore (some elements/browsers may throw)
        }
      }

      // send immediately
      const { x, y } = screenToWorldRef.current(e.clientX, e.clientY);
      const wx = Number(x);
      const wy = Number(y);

      lastSentWorldRef.current = { x: wx, y: wy };
      setFacingFromWorldX(wx);
      onMoveToRef.current?.({ x: wx, y: wy });
    };

    const onPointerMove = (e) => {
      // update cursor location continuously (even if we don't send every move)
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;

      // If our configured button is no longer held, release.
      if (isDownRef.current && (e.buttons & BUTTON_MASK) === 0) {
        isDownRef.current = false;
        pointerIdRef.current = null;
      }
    };

    const endHold = (e) => {
      // only end if our button isn't held anymore
      if ((e.buttons & BUTTON_MASK) === 0) {
        isDownRef.current = false;
        pointerIdRef.current = null;
      }
    };

    // attach
    window.addEventListener("contextmenu", onContextMenu, { passive: false });

    // If a targetRef is provided, prefer element-level events; otherwise fall back to window.
    targetEl.addEventListener?.("pointerdown", onPointerDown, { passive: false });
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", endHold, { passive: false });
    window.addEventListener("pointercancel", endHold, { passive: false });
    window.addEventListener("blur", endHold);

    return () => {
      window.removeEventListener("contextmenu", onContextMenu);

      targetEl.removeEventListener?.("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endHold);
      window.removeEventListener("pointercancel", endHold);
      window.removeEventListener("blur", endHold);
    };
  }, [enabled, button, BUTTON_MASK, setFacingFromWorldX, targetRef]);

  // ✅ rAF loop that recomputes world under cursor every frame, throttled by sendRateHz + deadzone
  useEffect(() => {
    if (!enabled) return;

    const minDt = 1000 / Math.max(1, sendRateHz);
    const dz2 = deadzoneWorld * deadzoneWorld;

    let rafId = 0;
    let lastSentAt = 0;

    const frame = (now) => {
      rafId = requestAnimationFrame(frame);

      if (!isDownRef.current) return;

      // throttle by sendRateHz
      if (now - lastSentAt < minDt) return;

      const { x, y } = screenToWorldRef.current(mouseRef.current.x, mouseRef.current.y);
      const wx = Number(x);
      const wy = Number(y);

      const lx = lastSentWorldRef.current.x;
      const ly = lastSentWorldRef.current.y;

      if (lx != null && ly != null) {
        const dx = wx - lx;
        const dy = wy - ly;
        if (dx * dx + dy * dy < dz2) return; // deadzone
      }

      lastSentAt = now;
      lastSentWorldRef.current = { x: wx, y: wy };
      setFacingFromWorldX(wx);
      onMoveToRef.current?.({ x: wx, y: wy });
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [enabled, sendRateHz, deadzoneWorld, setFacingFromWorldX]);

  return {
    isDownRef,
    mouseRef,
  };
}
