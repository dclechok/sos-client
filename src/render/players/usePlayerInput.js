// src/render/players/usePlayerInput.js
//
// Simple: while right-button is held, convert mouse position to world coords
// and send to server at sendRateHz.  That's it.  No forced targets, no slide
// nudge, no forced mode — all of that was complexity needed by client prediction
// which we no longer use.

import { useCallback, useEffect, useRef } from "react";

export function usePlayerInput({
  enabled,
  sendRateHz    = 20,
  screenToWorld,
  onMoveTo,
  getMyPos,
  onFacingChange,
  button        = 2,
  deadzoneWorld = 0.35,
  targetRef     = null,
}) {
  const isDownRef    = useRef(false);
  const mouseRef     = useRef({ x: 0, y: 0 });
  const lastSentWorldRef = useRef({ x: null, y: null });
  const facingRef    = useRef("right");

  const screenToWorldRef  = useRef(screenToWorld);
  const onMoveToRef       = useRef(onMoveTo);
  const getMyPosRef       = useRef(getMyPos);
  const onFacingChangeRef = useRef(onFacingChange);
  useEffect(() => {
    screenToWorldRef.current  = screenToWorld;
    onMoveToRef.current       = onMoveTo;
    getMyPosRef.current       = getMyPos;
    onFacingChangeRef.current = onFacingChange;
  }, [screenToWorld, onMoveTo, getMyPos, onFacingChange]);

  const BUTTON_MASK = button === 0 ? 1 : button === 1 ? 4 : 2;

  const setFacingFromWorldX = useCallback((worldX) => {
    const me = getMyPosRef.current?.();
    if (!me || !Number.isFinite(me.x)) return;
    const dir = worldX < me.x ? "left" : "right";
    if (dir !== facingRef.current) {
      facingRef.current = dir;
      onFacingChangeRef.current?.(dir);
    }
  }, []);

  const sendTarget = useCallback((wx, wy) => {
    lastSentWorldRef.current = { x: wx, y: wy };
    setFacingFromWorldX(wx);
    onMoveToRef.current?.({ x: wx, y: wy });
  }, [setFacingFromWorldX]);

  // No-op stub so PlayerRenderer doesn't crash if it still calls this.
  const setForcedTarget = useCallback((_pt) => {}, []);

  useEffect(() => {
    if (!enabled) return;
    const targetEl      = targetRef?.current ?? window;
    const onContextMenu = (e) => e.preventDefault();

    const onPointerDown = (e) => {
      if (e.button !== button) return;
      e.preventDefault();
      isDownRef.current  = true;
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      if (targetEl !== window && targetEl?.setPointerCapture && e.pointerId != null) {
        try { targetEl.setPointerCapture(e.pointerId); } catch {}
      }
      const w = screenToWorldRef.current(e.clientX, e.clientY);
      lastSentWorldRef.current = { x: null, y: null };
      sendTarget(Number(w.x), Number(w.y));
    };

    const onPointerMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      if (isDownRef.current && (e.buttons & BUTTON_MASK) === 0) {
        isDownRef.current = false;
      }
    };

    const endHold = (e) => {
      if ((e.buttons & BUTTON_MASK) === 0) isDownRef.current = false;
    };

    window.addEventListener("contextmenu",   onContextMenu, { passive: false });
    targetEl.addEventListener?.("pointerdown", onPointerDown, { passive: false });
    window.addEventListener("pointermove",   onPointerMove,  { passive: false });
    window.addEventListener("pointerup",     endHold,        { passive: false });
    window.addEventListener("pointercancel", endHold,        { passive: false });
    window.addEventListener("blur",          endHold);

    return () => {
      window.removeEventListener("contextmenu",   onContextMenu);
      targetEl.removeEventListener?.("pointerdown", onPointerDown);
      window.removeEventListener("pointermove",   onPointerMove);
      window.removeEventListener("pointerup",     endHold);
      window.removeEventListener("pointercancel", endHold);
      window.removeEventListener("blur",          endHold);
    };
  }, [enabled, button, BUTTON_MASK, sendTarget, targetRef]);

  // RAF send loop.
  useEffect(() => {
    if (!enabled) return;
    const minDt = 1000 / Math.max(1, sendRateHz);
    const dz2   = deadzoneWorld * deadzoneWorld;
    let rafId = 0, lastSentAt = 0;

    const frame = (now) => {
      rafId = requestAnimationFrame(frame);
      if (!isDownRef.current) return;
      if (now - lastSentAt < minDt) return;

      const w  = screenToWorldRef.current(mouseRef.current.x, mouseRef.current.y);
      const wx = Number(w.x); const wy = Number(w.y);

      const lx = lastSentWorldRef.current.x;
      const ly = lastSentWorldRef.current.y;
      if (lx != null && ly != null) {
        const dx = wx - lx; const dy = wy - ly;
        if (dx * dx + dy * dy < dz2) return;
      }

      lastSentAt = now;
      sendTarget(wx, wy);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [enabled, sendRateHz, deadzoneWorld, sendTarget]);

  return { isDownRef, mouseRef, setForcedTarget };
}