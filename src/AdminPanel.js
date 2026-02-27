// AdminPanel.js
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import "./styles/AdminPanel.css";

const API = process.env.REACT_APP_API_BASE_URL || "";

/**
 * AdminPanel — Create / Teleport / Delete (hover-exact)
 *
 * ✅ Delete is ID-based now:
 *   client emits: "world:deleteObject" { id }
 *   server broadcasts: "obj:delete" { id } (your useWorldObjects removes it)
 *
 * ✅ Delete preview snaps to the hovered object's screen position and outlines its sprite box.
 *
 * Required props for hover-delete:
 *   worldObjects: array of world objects (from useWorldObjects().objects)
 *   objectDefs: map defId -> def (sizePx is used for correct box size)
 */
const DELETE_EVENT = "world:deleteObject";

export default function AdminPanel({
  socket,
  canvasRef,
  camSmoothRef,
  zoom,
  me,

  // ✅ NEW (for hover-exact delete preview + id lookup)
  worldObjects = [],
  objectDefs = {},
}) {
  const [visible, setVisible] = useState(false);

  // modes
  const [teleportMode, setTeleportMode] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);

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

  // Preview (create/delete targeting)
  const [mouseClient, setMouseClient] = useState({ x: 0, y: 0 });

  // ✅ Hover-exact object under cursor (for delete)
  const [hoveredObj, setHoveredObj] = useState(null); // full obj doc
  const [hoveredClient, setHoveredClient] = useState(null); // {x,y} in client coords
  const [hoveredBoxPx, setHoveredBoxPx] = useState({ w: 0, h: 0 }); // DOM px

  const cancelWorldClickModes = useCallback(() => {
    setTeleportMode(false);
    setCreateMode(false);
    setDeleteMode(false);
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

  // ── Fetch objects list (defs/templates) ────────────────────────────────
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

  // ── Utilities: screen->world based on YOUR working math ───────────────
  const clientToWorld = useCallback(
    (clientX, clientY) => {
      const canvas = canvasRef?.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dx = clientX - rect.left - cx;
      const dy = clientY - rect.top - cy;

      const worldX = camSmoothRef.current.x + dx / zoom;
      const worldY = camSmoothRef.current.y + dy / zoom;

      return { x: worldX, y: worldY, rect };
    },
    [canvasRef, camSmoothRef, zoom]
  );

  // ── Hover pick: find object under cursor (bounding box hit-test) ──────
  const pickObjectAtClient = useCallback(
    (clientX, clientY) => {
      const canvas = canvasRef?.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const mx = clientX - rect.left;
      const my = clientY - rect.top;

      const cx = rect.width / 2;
      const cy = rect.height / 2;

      const camX = Number(camSmoothRef?.current?.x || 0);
      const camY = Number(camSmoothRef?.current?.y || 0);
      const z = Number(zoom || 1);

      // if you have draw-order, iterate back-to-front
      for (let i = (worldObjects?.length || 0) - 1; i >= 0; i--) {
        const obj = worldObjects[i];
        if (!obj?._id) continue;

        const defId = String(obj.defId || "");
        const def = objectDefs?.[defId] || null;

        const wx = Number(obj.x || 0);
        const wy = Number(obj.y || 0);

        const sx = cx + (wx - camX) * z; // canvas-space px
        const sy = cy + (wy - camY) * z;

        const baseSize = Number(def?.sizePx ?? obj?.sizePx ?? 16);
        const dw = baseSize * z;
        const dh = baseSize * z;

        const left = sx - dw / 2;
        const top = sy - dh / 2;

        if (mx >= left && mx <= left + dw && my >= top && my <= top + dh) {
          // return object + overlay coords in *client* space
          return {
            obj,
            clientCenter: { x: rect.left + sx, y: rect.top + sy },
            boxPx: { w: dw, h: dh },
          };
        }
      }

      return null;
    },
    [canvasRef, camSmoothRef, zoom, worldObjects, objectDefs]
  );

  // ── Cursor + preview tracking (while targeting) ───────────────────────
  useEffect(() => {
    const canvas = canvasRef?.current;
    if (!canvas) return;

    const active = teleportMode || createMode || deleteMode;

    // cursor changes (simple, reliable)
    canvas.style.cursor = active ? (deleteMode ? "cell" : "crosshair") : "";

    if (!active) {
      setHoveredObj(null);
      setHoveredClient(null);
      setHoveredBoxPx({ w: 0, h: 0 });
      return;
    }

    const onMove = (e) => {
      setMouseClient({ x: e.clientX, y: e.clientY });

      if (deleteMode) {
        const hit = pickObjectAtClient(e.clientX, e.clientY);
        if (hit?.obj) {
          setHoveredObj(hit.obj);
          setHoveredClient(hit.clientCenter);
          setHoveredBoxPx(hit.boxPx);
        } else {
          setHoveredObj(null);
          setHoveredClient(null);
          setHoveredBoxPx({ w: 0, h: 0 });
        }
      } else {
        setHoveredObj(null);
        setHoveredClient(null);
        setHoveredBoxPx({ w: 0, h: 0 });
      }
    };

    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      canvas.style.cursor = "";
    };
  }, [teleportMode, createMode, deleteMode, canvasRef, pickObjectAtClient]);

  // ── Click-to-teleport ─────────────────────────────────────────────────
  useEffect(() => {
    if (!teleportMode) return;
    const canvas = canvasRef?.current;
    if (!canvas) return;

    const handleClick = (e) => {
      const pt = clientToWorld(e.clientX, e.clientY);
      if (!pt) return;

      socket?.emit("teleport", { x: Math.round(pt.x), y: Math.round(pt.y) });
      setTeleportMode(false);
    };

    const t = setTimeout(() => canvas.addEventListener("click", handleClick), 50);
    return () => {
      clearTimeout(t);
      canvas.removeEventListener("click", handleClick);
    };
  }, [teleportMode, canvasRef, clientToWorld, socket]);

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

      const pt = clientToWorld(e.clientX, e.clientY);
      if (!pt) return;

      socket?.emit("world:spawnObject", {
        defId,
        x: Math.round(pt.x),
        y: Math.round(pt.y),
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
  }, [createMode, canvasRef, clientToWorld, socket, selectedObjectId]);

  // ── Click-to-delete-object (ID-based hover-exact) ─────────────────────
  useEffect(() => {
    if (!deleteMode) return;
    const canvas = canvasRef?.current;
    if (!canvas) return;

    const handleClick = () => {
      const id = hoveredObj?._id ? String(hoveredObj._id) : "";
      if (!id) return; // must be hovering a valid object
      socket?.emit(DELETE_EVENT, { id });

      // one delete then disarm
      setDeleteMode(false);
    };

    const t = setTimeout(() => canvas.addEventListener("click", handleClick), 50);
    return () => {
      clearTimeout(t);
      canvas.removeEventListener("click", handleClick);
    };
  }, [deleteMode, canvasRef, socket, hoveredObj]);

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

  const targetingMode = teleportMode
    ? "teleport"
    : deleteMode
    ? "delete"
    : createMode
    ? "create"
    : "";

  const deleteHasTarget = !!(deleteMode && hoveredObj?._id && hoveredClient);

  return (
    <>
      {/* Preview overlay while targeting (DOM overlay, no canvas changes) */}
      {(teleportMode || createMode || deleteMode) && (
        <div
          className={`admin-preview ${
            targetingMode ? `admin-preview--${targetingMode}` : ""
          }`}
          style={{
            left: deleteHasTarget ? hoveredClient.x : mouseClient.x,
            top: deleteHasTarget ? hoveredClient.y : mouseClient.y,
          }}
        >
          {createMode && (
            <div className="admin-preview__box" title="Placement preview" />
          )}

          {deleteMode &&
            (deleteHasTarget ? (
              <div
                className="admin-preview__box admin-preview__box--delete"
                title="Delete target"
                style={{
                  width: Math.max(10, Math.round(hoveredBoxPx.w || 0)),
                  height: Math.max(10, Math.round(hoveredBoxPx.h || 0)),
                }}
              />
            ) : (
              <div
                className="admin-preview__ring"
                title="Hover an object to target delete"
              />
            ))}
        </div>
      )}

      <div
        className={`admin-panel${
          teleportMode || createMode || deleteMode
            ? " admin-panel--worldclick-mode"
            : ""
        }`}
        style={{ left: pos.x, top: pos.y }}
        onMouseDown={onMouseDown}
      >
        <div className="admin-panel__header">
          <span className="admin-panel__title">Admin</span>
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
            {me ? `${Math.round(Number(me.x))}, ${Math.round(Number(me.y))}` : "—"}
          </div>

          <div className="admin-panel__section">
            <div className="admin-panel__section-label">Movement</div>

            <div className="admin-panel__row">
              <button
                className={`admin-btn${teleportMode ? " admin-btn--active" : ""}`}
                onClick={() => {
                  setCreateMode(false);
                  setDeleteMode(false);
                  setObjectMenuOpen(false);
                  setTeleportMode((t) => !t);
                }}
              >
                {teleportMode ? "Target…" : "Teleport"}
              </button>

              <button
                className={`admin-btn admin-btn--danger${
                  deleteMode ? " admin-btn--active" : ""
                }`}
                onClick={() => {
                  setTeleportMode(false);
                  setCreateMode(false);
                  setObjectMenuOpen(false);
                  setDeleteMode((d) => !d);
                }}
                title="Hover an object and click to delete it"
              >
                {deleteMode ? "Target…" : "Delete"}
              </button>
            </div>

            {(teleportMode || deleteMode) && (
              <p className="admin-panel__hint">
                {teleportMode ? (
                  <>
                    Click the world to teleport. <kbd>Esc</kbd> cancels.
                  </>
                ) : (
                  <>
                    Hover an object to highlight it, then click to delete.{" "}
                    <kbd>Esc</kbd> cancels.
                    {hoveredObj?._id ? (
                      <>
                        <br />
                        Target:{" "}
                        <b>
                          {String(
                            hoveredObj?.label ??
                              hoveredObj?.name ??
                              hoveredObj?.defId ??
                              hoveredObj?._id
                          )}
                        </b>
                      </>
                    ) : (
                      <>
                        <br />
                        Target: <b>none</b>
                      </>
                    )}
                  </>
                )}
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
                  setDeleteMode(false);
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
                  ? `Create: ${
                      selectedObject.label ?? selectedObject.name ?? selectedObjectId
                    }`
                  : "Create Object"}
              </button>

              {objectMenuOpen && (
                <div className="admin-menu">
                  {objectsError && (
                    <div className="admin-menu__error">⚠ {objectsError}</div>
                  )}

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
                              setDeleteMode(false);
                              setCreateMode(true); // instantly armed
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
                Placing:{" "}
                <b>
                  {selectedObject?.label ?? selectedObject?.name ?? selectedObjectId}
                </b>
                <br />
                Click the world to spawn it. <kbd>Esc</kbd> cancels.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}