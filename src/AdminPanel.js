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
 * ✅ Tight bounds: uses first frame pixel data to compute actual visible region, ignoring transparency.
 * ✅ Promise-based cache: concurrent mousemove calls share the same load, no duplicate scans.
 *
 * Required props for hover-delete:
 *   worldObjects: array of world objects (from useWorldObjects().objects)
 *   objectDefs: map defId -> def (sizePx + frames used for tight bounds)
 */
const DELETE_EVENT = "world:deleteObject";

// ── Tight bounds cache (module-level, persists across renders) ────────────────
// Stores Promises so concurrent calls before the image loads share the same result.
const tightBoundsCache = {};

function getTightBounds(defId, src) {
  if (tightBoundsCache[defId]) return tightBoundsCache[defId];

  // Store the Promise immediately — all concurrent callers await the same one
  tightBoundsCache[defId] = (async () => {
    try {
      const img = new Image();
      img.src = src;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });

      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height);

      let minX = width, maxX = 0, minY = height, maxY = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const alpha = data[(y * width + x) * 4 + 3];
          if (alpha > 10) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      // Guard: no opaque pixels found (fully transparent image?)
      if (minX > maxX || minY > maxY) {
        return { offX: 0, offY: 0, w: img.width, h: img.height };
      }

      // Offsets are relative to image center (sprites are centered on world pos)
      const cx = img.width / 2;
      const cy = img.height / 2;

      const bounds = {
        offX: (minX + maxX) / 2 - cx,
        offY: (minY + maxY) / 2 - cy,
        w: maxX - minX,
        h: maxY - minY,
      };

      return bounds;
    } catch (e) {
      console.warn("[AdminPanel] getTightBounds failed for", defId, e);
      // Remove from cache so it can be retried later
      delete tightBoundsCache[defId];
      return null;
    }
  })();

  return tightBoundsCache[defId];
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdminPanel({
  socket,
  canvasRef,
  camSmoothRef,
  zoom,
  me,

  // For hover-exact delete preview + id lookup
  worldObjects = [],
  objectDefs = {},
}) {
  const [visible, setVisible] = useState(false);

  // debug
  const [collisionDebug, setCollisionDebug] = useState(false);

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

  // Hover-exact object under cursor (for delete)
  const [hoveredObj, setHoveredObj] = useState(null);
  const [hoveredClient, setHoveredClient] = useState(null);
  const [hoveredBoxPx, setHoveredBoxPx] = useState({ w: 0, h: 0 });

  const cancelWorldClickModes = useCallback(() => {
    setTeleportMode(false);
    setCreateMode(false);
    setDeleteMode(false);
  }, []);

  // ── Sync collision debug checkbox -> global flag ──────────────────────
  useEffect(() => {
    window.__collisionDebug = collisionDebug;
  }, [collisionDebug]);

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

  // ── Fetch objects list (defs/templates) ───────────────────────────────
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

  // ── Utilities: screen->world ──────────────────────────────────────────
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

  // ── Hover pick: find object under cursor using tight bounds ───────────
  const pickObjectAtClient = useCallback(
    async (clientX, clientY) => {
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

      for (let i = (worldObjects?.length || 0) - 1; i >= 0; i--) {
        const obj = worldObjects[i];
        if (!obj?._id) continue;

        const defId = String(obj.defId || "");
        const def = objectDefs?.[defId] || null;

        const wx = Number(obj.x || 0);
        const wy = Number(obj.y || 0);

        // Screen-space center of this object
        const sx = cx + (wx - camX) * z;
        const sy = cy + (wy - camY) * z;

        // Await tight bounds — Promise cache means this is instant after first load
        let tight = null;
        if (def?.frames?.[0]) {
          tight = await getTightBounds(defId, def.frames[0]);
        }

        // Scale tight bounds from image pixels to screen pixels.
        // tight.w/h are in image pixels. The image is rendered at sizePx*z screen px,
        // so imgToScreen = (sizePx * z) / imgWidth
        let dw, dh, boxOffX, boxOffY;
        if (tight) {
          const baseSize = Number(def?.sizePx ?? obj?.sizePx ?? 16);
          // We need to know the source image size — getTightBounds loads it,
          // but we don't store imgWidth/imgHeight. Instead, derive scale from sizePx:
          // the renderer draws the image at baseSize*z regardless of actual image dimensions.
          // So 1 image pixel = (baseSize * z) / imgNaturalWidth screen pixels.
          // Since we don't have imgNaturalWidth here, we store it in bounds.
          const imgToScreen = tight.imgScale ?? (baseSize * z) / (tight.imgW || baseSize);
          dw = tight.w * imgToScreen;
          dh = tight.h * imgToScreen;
          boxOffX = tight.offX * imgToScreen;
          boxOffY = tight.offY * imgToScreen;
        } else {
          const baseSize = Number(def?.sizePx ?? obj?.sizePx ?? 16);
          dw = baseSize * z;
          dh = baseSize * z;
          boxOffX = 0;
          boxOffY = 0;
        }

        const left = sx + boxOffX - dw / 2;
        const top = sy + boxOffY - dh / 2;

        if (mx >= left && mx <= left + dw && my >= top && my <= top + dh) {
          return {
            obj,
            clientCenter: {
              x: rect.left + sx + boxOffX,
              y: rect.top + sy + boxOffY,
            },
            boxPx: { w: dw, h: dh },
          };
        }
      }

      return null;
    },
    [canvasRef, camSmoothRef, zoom, worldObjects, objectDefs]
  );

  // ── Pre-warm tight bounds for all visible objects when delete mode opens ─
  useEffect(() => {
    if (!deleteMode) return;
    for (const obj of worldObjects) {
      const defId = String(obj.defId || "");
      const def = objectDefs?.[defId];
      if (def?.frames?.[0]) {
        getTightBounds(defId, def.frames[0]); // fire and forget — just warms cache
      }
    }
  }, [deleteMode, worldObjects, objectDefs]);

  // ── Cursor + preview tracking (while targeting) ───────────────────────
  useEffect(() => {
    const canvas = canvasRef?.current;
    if (!canvas) return;

    const active = teleportMode || createMode || deleteMode;

    canvas.style.cursor = active ? (deleteMode ? "cell" : "crosshair") : "";

    if (!active) {
      setHoveredObj(null);
      setHoveredClient(null);
      setHoveredBoxPx({ w: 0, h: 0 });
      return;
    }

    const onMove = async (e) => {
      setMouseClient({ x: e.clientX, y: e.clientY });

      if (deleteMode) {
        const hit = await pickObjectAtClient(e.clientX, e.clientY);
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

  // ── Click-to-place-object ─────────────────────────────────────────────
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
      if (!id) return;
      socket?.emit(DELETE_EVENT, { id });
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
      {/* Preview overlay while targeting */}
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
                              setCreateMode(true);
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

          <div className="admin-panel__section">
            <div className="admin-panel__section-label">Debug</div>
            <label className="admin-panel__checkbox-row">
              <input
                type="checkbox"
                checked={collisionDebug}
                onChange={(e) => setCollisionDebug(e.target.checked)}
              />
              Collision boxes
            </label>
          </div>
        </div>
      </div>
    </>
  );
}