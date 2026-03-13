import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import useDraggablePanel from "./useDraggablePanel";
import "../styles/AdminPanel.css";
import GeneralTab from "./GeneralTab";
import CreatorTab from "./CreatorTab";

export default function AdminPanel(props) {
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("creator");
  const [closeNonce, setCloseNonce] = useState(0);

  const { pos, onMouseDown } = useDraggablePanel({
    initial: { x: 48, y: 48 },
    handleSelector: ".admin-panel__header",
    storageKey: "admin_panel_pos_v2",
  });

  const tabs = useMemo(
    () => [
      { id: "creator", label: "Editor" },
      { id: "general", label: "General" },
    ],
    []
  );

  const closeAll = useCallback(() => {
    setVisible(false);
    setCloseNonce((n) => n + 1);
  }, []);

  const closeAllRef = useRef(closeAll);
  useEffect(() => {
    closeAllRef.current = closeAll;
  }, [closeAll]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      const isTyping =
        tag === "input" || tag === "textarea" || e.target?.isContentEditable;

      if (isTyping) return;

      if (e.key === "`") {
        e.preventDefault();
        setVisible((v) => {
          const next = !v;
          if (!next) setCloseNonce((n) => n + 1);
          return next;
        });
        return;
      }

      if (e.key === "Escape" && visible) {
        e.preventDefault();
        closeAllRef.current();
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="admin-panel admin-panel--compact"
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={onMouseDown}
    >
      <div className="admin-panel__header" title="Drag to move">
        <span className="admin-panel__title">World Editor</span>
        <button className="admin-panel__close" onClick={closeAll} type="button">
          ✕
        </button>
      </div>

      <div className="admin-tabs admin-tabs--compact">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`admin-tab${activeTab === t.id ? " is-active" : ""}`}
            onClick={() => {
              setActiveTab(t.id);
              setCloseNonce((n) => n + 1);
            }}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="admin-panel__body admin-panel__body--compact">
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