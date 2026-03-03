// src/admin-panel/useDraggablePanel.js
import { useCallback, useEffect, useRef, useState } from "react";

export default function useDraggablePanel({
  initial = { x: 80, y: 80 },
  handleSelector = ".admin-panel__header",
  storageKey = "admin_panel_pos_v1",
} = {}) {
  const [pos, setPos] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return initial;
      const parsed = JSON.parse(raw);
      if (!Number.isFinite(parsed?.x) || !Number.isFinite(parsed?.y)) return initial;
      return parsed;
    } catch {
      return initial;
    }
  });

  const draggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });

  // persist
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(pos));
    } catch {}
  }, [pos, storageKey]);

  const onMouseDown = useCallback(
    (e) => {
      const handle = e.target?.closest?.(handleSelector);
      if (!handle) return;

      // don’t start drag on buttons/inputs inside header
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "button" || tag === "input") return;

      draggingRef.current = true;
      offsetRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };

      const onMove = (ev) => {
        if (!draggingRef.current) return;

        // clamp to viewport so it can’t get lost off-screen
        const w = 320; // match your panel width (or slightly bigger)
        const h = 120; // minimal safe height; real height can be bigger
        const maxX = Math.max(10, window.innerWidth - w - 10);
        const maxY = Math.max(10, window.innerHeight - h - 10);

        const nx = ev.clientX - offsetRef.current.x;
        const ny = ev.clientY - offsetRef.current.y;

        setPos({
          x: Math.min(maxX, Math.max(10, nx)),
          y: Math.min(maxY, Math.max(10, ny)),
        });
      };

      const onUp = () => {
        draggingRef.current = false;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [handleSelector, pos.x, pos.y]
  );

  // ✅ ALWAYS return a non-null object
  return { pos, setPos, onMouseDown };
}