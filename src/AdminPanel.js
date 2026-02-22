// AdminPanel.js
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import "./styles/AdminPanel.css";

const API = process.env.REACT_APP_API_BASE_URL || "";

export default function AdminPanel({ socket, canvasRef, camSmoothRef, zoom, me }) {
  const [visible, setVisible] = useState(false);

  // modes
  const [teleportMode, setTeleportMode] = useState(false);
  const [createMode, setCreateMode] = useState(false);

  // objects list from backend (TEMPLATES/DEFS)
  const [objects, setObjects] = useState([]);
  const [objectsLoading, setObjectsLoading] = useState(false);
  const [objectsError, setObjectsError] = useState("");
  const [selectedObjectId, setSelectedObjectId] = useState("");

  // menu open/close
  const [objectMenuOpen, setObjectMenuOpen] = useState(false);

  // Dragging
  const dragOffset = useRef(null);
  const [pos, setPos] = useState({ x: 80, y: 80 });

  const cancelWorldClickModes = useCallback(() => {
    setTeleportMode(false);
    setCreateMode(false);
  }, []);

  // ── Toggle with backtick ──────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      const el = document.activeElement;
      const tag = el?.tagName;
      if ((tag === "INPUT" || tag === "TEXTAREA") && !el?.disabled) return;

      if (e.key === "`") {
        setVisible((v) => {
          if (v) cancelWorldClickModes();
          return !v;
        });
      }
      if (e.key === "Escape") {
        cancelWorldClickModes();
        setVisible(false);
        setObjectMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancelWorldClickModes]);

  // ── Fetch objects list ────────────────────────────────────────────────
  const fetchObjects = useCallback(async () => {
    setObjectsError("");
    setObjectsLoading(true);

    try {
      const url = `${API}/api/defs/objects`;
      console.log("[AdminPanel] Fetching:", url);

      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to load objects (${res.status})`);

      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.objects;
      if (!Array.isArray(list)) throw new Error("Bad objects payload shape");

      setObjects(list);

      if (!selectedObjectId && list.length) {
        const firstId = String(list[0].id ?? list[0].key ?? list[0].name ?? "");
        setSelectedObjectId(firstId);
      }
    } catch (e) {
      console.log("[AdminPanel] fetchObjects ERROR:", e);
      setObjectsError(e?.message || "Failed to load objects");
      setObjects([]);
    } finally {
      setObjectsLoading(false);
    }
  }, [selectedObjectId]);

  // Close menu if clicking outside panel
  useEffect(() => {
    if (!objectMenuOpen) return;
    const onDown = (e) => {
      const panel = document.querySelector(".admin-panel");
      if (!panel) return;
      if (!panel.contains(e.target)) setObjectMenuOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [objectMenuOpen]);

  // Sort objects alphabetically
  const objectsSorted = useMemo(() => {
    const labelOf = (o) =>
      String(o?.label ?? o?.name ?? o?.id ?? o?.key ?? "").toLowerCase();
    return [...(objects || [])].sort((a, b) => labelOf(a).localeCompare(labelOf(b)));
  }, [objects]);

  const selectedObject = useMemo(() => {
    const id = String(selectedObjectId || "");
    return objects.find((o) => String(o.id ?? o.key ?? o.name) === id) || null;
  }, [objects, selectedObjectId]);

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

      socket?.emit("teleport", { x: Math.round(worldX), y: Math.round(worldY) });
      setTeleportMode(false);
    };

    const t = setTimeout(() => canvas.addEventListener("click", handleClick), 50);
    return () => {
      clearTimeout(t);
      canvas.removeEventListener("click", handleClick);
    };
  }, [teleportMode, canvasRef, camSmoothRef, zoom, socket]);

  // ── Click-to-place-object (armed on selection) ────────────────────────
  useEffect(() => {
    if (!createMode) return;
    const canvas = canvasRef?.current;
    if (!canvas) return;

    const handleClick = (e) => {
      const defId = selectedObjectId ? String(selectedObjectId) : "";
      if (!defId) {
        setCreateMode(false);
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dx = e.clientX - rect.left - cx;
      const dy = e.clientY - rect.top - cy;

      const worldX = camSmoothRef.current.x + dx / zoom;
      const worldY = camSmoothRef.current.y + dy / zoom;

      socket?.emit("world:spawnObject", {
        defId,
        x: Math.round(worldX),
        y: Math.round(worldY),
        state: {},
      });

      // one placement then disarm
      setCreateMode(false);
    };

    const t = setTimeout(() => canvas.addEventListener("click", handleClick), 50);
    return () => {
      clearTimeout(t);
      canvas.removeEventListener("click", handleClick);
    };
  }, [createMode, canvasRef, camSmoothRef, zoom, socket, selectedObjectId]);

  // ── Drag ──────────────────────────────────────────────────────────────
  const onMouseDown = useCallback(
    (e) => {
      if (e.target.closest(".admin-panel__body")) return;
      dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };

      const onMove = (ev) =>
        setPos({
          x: ev.clientX - dragOffset.current.x,
          y: ev.clientY - dragOffset.current.y,
        });

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
      className={`admin-panel${teleportMode || createMode ? " admin-panel--worldclick-mode" : ""}`}
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={onMouseDown}
    >
      <div className="admin-panel__header">
        <span className="admin-panel__title">⚙ Admin Panel</span>
        <button
          className="admin-panel__close"
          onClick={() => {
            setVisible(false);
            cancelWorldClickModes();
            setObjectMenuOpen(false);
          }}
        >
          ✕
        </button>
      </div>

      <div className="admin-panel__body">
        <div className="admin-panel__coords">
          📍 {me ? `${Math.round(Number(me.x))}, ${Math.round(Number(me.y))}` : "—"}
        </div>

        <div className="admin-panel__section">
          <div className="admin-panel__section-label">Movement</div>

          <button
            className={`admin-btn${teleportMode ? " admin-btn--active" : ""}`}
            onClick={() => {
              setCreateMode(false);
              setObjectMenuOpen(false);
              setTeleportMode((t) => !t);
            }}
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

        <div className="admin-panel__section">
          <div className="admin-panel__section-label">World Objects</div>

          <div className="admin-panel__menu">
            <button
              className={`admin-btn${objectMenuOpen ? " admin-btn--active" : ""}`}
              onClick={async () => {
                setTeleportMode(false);
                setCreateMode(false);

                const next = !objectMenuOpen;
                setObjectMenuOpen(next);

                if (next && !objects.length && !objectsLoading) {
                  await fetchObjects();
                }
              }}
            >
              {objectsLoading
                ? "Loading…"
                : selectedObject
                ? `Create Object: ${selectedObject.label ?? selectedObject.name ?? selectedObjectId}`
                : "Create Object"}
            </button>

            {objectMenuOpen && (
              <div className="admin-menu">
                {objectsError && <div className="admin-menu__error">⚠ {objectsError}</div>}

                {!objectsLoading && !objectsSorted.length && !objectsError && (
                  <div className="admin-menu__empty">No objects found</div>
                )}

                {!!objectsSorted.length && (
                  <div className="admin-menu__list">
                    {objectsSorted.map((o) => {
                      const id = String(o.id ?? o.key ?? o.name);
                      const label = String(o.label ?? o.name ?? o.id ?? o.key ?? id);
                      const active = String(selectedObjectId) === id;

                      return (
                        <button
                          key={id}
                          type="button"
                          className={`admin-menu__item${active ? " is-active" : ""}`}
                          onClick={() => {
                            setSelectedObjectId(id);
                            setObjectMenuOpen(false);
                            setTeleportMode(false);
                            setCreateMode(true); // ✅ instantly armed
                          }}
                        >
                          <span className="admin-menu__item-label">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="admin-menu__footer">
                  <button
                    className="admin-menu__refresh"
                    type="button"
                    onClick={fetchObjects}
                    disabled={objectsLoading}
                    title="Refresh objects list"
                  >
                    ↻ Refresh
                  </button>
                </div>
              </div>
            )}
          </div>

          {createMode && (
            <p className="admin-panel__hint">
              Placing: <b>{selectedObject?.label ?? selectedObject?.name ?? selectedObjectId}</b>
              <br />
              Click anywhere in the world to spawn it. Press <kbd>Esc</kbd> to cancel.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}