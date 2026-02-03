// src/hooks/useWorldBoot.js
import { useCallback, useEffect, useMemo, useState } from "react";

export function useWorldBoot(stepList) {
  const steps = useMemo(() => stepList || [], [stepList]);

  const [active, setActive] = useState(false);

  const makeInitialState = useCallback(() => {
    const map = {};
    for (const k of steps) map[k] = { status: "idle", note: "" };
    return map;
  }, [steps]);

  const [state, setState] = useState(() => {
    const map = {};
    for (const k of steps) map[k] = { status: "idle", note: "" };
    return map;
  });

  // Keep state in sync if the step list changes
  useEffect(() => {
    setState((prev) => {
      const next = {};
      for (const k of steps) {
        next[k] = prev?.[k] || { status: "idle", note: "" };
      }
      return next;
    });
  }, [steps]);

  // ✅ Do not silently drop unknown keys; create them.
  const setStep = useCallback((key, patch) => {
    if (!key) return;
    setState((prev) => {
      const cur = prev?.[key] || { status: "idle", note: "" };
      return { ...(prev || {}), [key]: { ...cur, ...patch } };
    });
  }, []);

  const api = useMemo(() => {
    return {
      start: (key, note = "") => setStep(key, { status: "working", note }),
      done: (key, note = "") => setStep(key, { status: "done", note }),
      error: (key, note = "") => setStep(key, { status: "error", note }),

      reset: () => setState(makeInitialState),

      begin: () => setActive(true),

      // Optional: clear state when ending so next boot is clean
      end: () => {
        setActive(false);
        setState(makeInitialState);
      },
    };
  }, [setStep, makeInitialState]);

  const ready = useMemo(() => {
    if (!active) return false;
    return steps.every((k) => state?.[k]?.status === "done");
  }, [active, steps, state]);

  const hasError = useMemo(() => {
    return steps.some((k) => state?.[k]?.status === "error");
  }, [steps, state]);

  return { active, ready, hasError, steps, state, api };
}
