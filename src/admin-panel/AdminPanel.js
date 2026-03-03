// src/admin-panel/AdminPanel.js
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import useDraggablePanel from "./useDraggablePanel";
import "../styles/AdminPanel.css"; // <-- change to "../styles/AdminPanel.css" if that's where it lives
import GeneralTab from "./GeneralTab";
import CreatorTab from "./CreatorTab";

export default function AdminPanel(props) {
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  // broadcast “close/cancel tools” to tabs
  const [closeNonce, setCloseNonce] = useState(0);

  // ✅ draggable panel position (persists)
  const { pos, onMouseDown } = useDraggablePanel({
    initial: { x: 80, y: 80 },
    handleSelector: ".admin-panel__header",
    storageKey: "admin_panel_pos_v1",
  });

  const tabs = useMemo(
    () => [
      { id: "general", label: "General" },
      { id: "creator", label: "Creator" },
    ],
    []
  );

  const closeAll = useCallback(() => {
    setVisible(false);
    setCloseNonce((n) => n + 1);
  }, []);

  // keep latest closeAll in a ref so key handler never goes stale
  const closeAllRef = useRef(closeAll);
  useEffect(() => {
    closeAllRef.current = closeAll;
  }, [closeAll]);

  // ✅ Backtick + Esc in shell
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      const isTyping =
        tag === "input" || tag === "textarea" || e.target?.isContentEditable;

      // Don’t toggle while typing
      if (isTyping) return;

      if (e.key === "`") {
        e.preventDefault();
        setVisible((v) => {
          const next = !v;
          if (!next) setCloseNonce((n) => n + 1); // closing cancels tools
          return next;
        });
        return;
      }

      if (e.key === "Escape") {
        if (visible) {
          e.preventDefault();
          closeAllRef.current();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="admin-panel"
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={onMouseDown}
    >
      <div className="admin-panel__header" title="Drag to move">
        <span className="admin-panel__title">Admin</span>
        <button className="admin-panel__close" onClick={closeAll} type="button">
          ✕
        </button>
      </div>

      <div className="admin-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`admin-tab${activeTab === t.id ? " is-active" : ""}`}
            onClick={() => {
              setActiveTab(t.id);
              setCloseNonce((n) => n + 1); // switching tabs cancels any active targeting tool
            }}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="admin-panel__body">
        {activeTab === "general" && (
          <GeneralTab {...props} closeNonce={closeNonce} />
        )}
        {activeTab === "creator" && (
          <CreatorTab {...props} closeNonce={closeNonce} />
        )}
      </div>
    </div>
  );
}