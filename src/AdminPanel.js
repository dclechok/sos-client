// AdminPanel.jsx
import { useState, useRef, useEffect, useCallback } from "react";
import "./styles/AdminPanel.css";

/**
 * AdminPanel
 *
 * Props:
 *   socket        — game socket (to emit teleport)
 *   canvasRef     — ref to the game canvas (for click-to-teleport coords)
 *   camSmoothRef  — ref to { x, y } smooth camera position (world units)
 *   zoom          — current zoom level
 *   me            — current player object { x, y, ... }
 */
export default function AdminPanel({ socket, canvasRef, camSmoothRef, zoom, me }) {
  const [visible, setVisible] = useState(false);
  const [teleportMode, setTeleportMode] = useState(false);

  // Dragging
  const dragOffset = useRef(null);
  const [pos, setPos] = useState({ x: 80, y: 80 });

  // ── Toggle with backtick ──────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      // Only block backtick if user is actively typing in an *enabled* input
      const el = document.activeElement;
      const tag = el?.tagName;
      if ((tag === "INPUT" || tag === "TEXTAREA") && !el?.disabled) return;

      if (e.key === "`") {
        setVisible((v) => {
          if (v) setTeleportMode(false);
          return !v;
        });
      }
      if (e.key === "Escape") {
        setTeleportMode(false);
        setVisible(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Click-to-teleport ─────────────────────────────────────────────────
  useEffect(() => {
    if (!teleportMode) return;
    const canvas = canvasRef?.current;
    if (!canvas) return;

    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dx = e.clientX - rect.left - cx;
      const dy = e.clientY - rect.top - cy;

      const worldX = camSmoothRef.current.x + dx / zoom;
      const worldY = camSmoothRef.current.y + dy / zoom;

      const payload = { x: Math.round(worldX), y: Math.round(worldY) };
      socket?.emit("teleport", payload);

      setTeleportMode(false);
    };

    // Small timeout so the button click that activated teleport mode
    // doesn't immediately fire the canvas listener
    const t = setTimeout(() => {
      canvas.addEventListener("click", handleClick);
    }, 50);

    return () => {
      clearTimeout(t);
      canvas.removeEventListener("click", handleClick);
    };
  }, [teleportMode, canvasRef, camSmoothRef, zoom, socket]);

  // ── Drag ──────────────────────────────────────────────────────────────
  const onMouseDown = useCallback(
    (e) => {
      if (e.target.closest(".admin-panel__body")) return;
      dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
      const onMove = (ev) =>
        setPos({ x: ev.clientX - dragOffset.current.x, y: ev.clientY - dragOffset.current.y });
      const onUp = () => {
        dragOffset.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [pos]
  );

  if (!visible) return null;

  return (
    <div
      className={`admin-panel${teleportMode ? " admin-panel--teleport-mode" : ""}`}
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={onMouseDown}
    >
      {/* ── Header ── */}
      <div className="admin-panel__header">
        <span className="admin-panel__title">⚙ Admin Panel</span>
        <button
          className="admin-panel__close"
          onClick={() => {
            setVisible(false);
            setTeleportMode(false);
          }}
        >
          ✕
        </button>
      </div>

      {/* ── Body ── */}
      <div className="admin-panel__body">
        {/* Live coords */}
        <div className="admin-panel__coords">
          📍{" "}
          {me ? `${Math.round(Number(me.x))}, ${Math.round(Number(me.y))}` : "—"}
        </div>

        {/* Movement section */}
        <div className="admin-panel__section">
          <div className="admin-panel__section-label">Movement</div>

          <button
            className={`admin-btn${teleportMode ? " admin-btn--active" : ""}`}
            onClick={() => setTeleportMode((t) => !t)}
          >
            {teleportMode ? "Click on world…" : "Teleport"}
          </button>

          {teleportMode && (
            <p className="admin-panel__hint">
              Click anywhere in the game world to teleport there.
              <br />
              Press <kbd>Esc</kbd> or the button again to cancel.
            </p>
          )}
        </div>

        {/* World Objects section — placeholder */}
        <div className="admin-panel__section">
          <div className="admin-panel__section-label">World Objects</div>
          <p className="admin-panel__hint">Coming soon…</p>
        </div>
      </div>
    </div>
  );
}
