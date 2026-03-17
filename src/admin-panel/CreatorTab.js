import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useClientToWorld } from "./useClientToWorld";
import { useHoverPickObject } from "./useHoverPickObject";
import { warmTightBoundsForObjects } from "./tightBounds";

const DELETE_EVENT = "world:deleteObject";
const API = process.env.REACT_APP_API_BASE_URL || "";

function dist2(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function randInCircle(r) {
  const t = Math.random() * Math.PI * 2;
  const u = Math.random();
  const rr = Math.sqrt(u) * r;
  return { dx: Math.cos(t) * rr, dy: Math.sin(t) * rr };
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export default function CreatorTab({
  socket,
  canvasRef,
  camSmoothRef,
  zoom,
  closeNonce,
  worldObjects = [],
  objectDefs = {},
}) {
  const [tool, setTool] = useState("stamp"); // stamp | spray | erase
  const [mouseClient, setMouseClient] = useState({ x: 0, y: 0 });

  const [objects, setObjects] = useState([]);
  const [objectsLoading, setObjectsLoading] = useState(false);
  const [objectsError, setObjectsError] = useState("");

  const [filter, setFilter] = useState("");
  const [selectedSingleId, setSelectedSingleId] = useState("");
  const [selectedMultiIds, setSelectedMultiIds] = useState([]);

  const [hoveredObj, setHoveredObj] = useState(null);
  const [hoveredClient, setHoveredClient] = useState(null);
  const [hoveredBoxPx, setHoveredBoxPx] = useState({ w: 0, h: 0 });

  const [radius, setRadius] = useState(56);
  const [density, setDensity] = useState(8);
  const [spacing, setSpacing] = useState(22);

  const isPointerDownRef = useRef(false);
  const lastWorldPtRef = useRef(null);
  const lastBrushAtRef = useRef(0);

  const clientToWorld = useClientToWorld({ canvasRef, camSmoothRef, zoom });

  const pickObjectAtClient = useHoverPickObject({
    canvasRef,
    camSmoothRef,
    zoom,
    worldObjects,
    objectDefs,
  });

  const cancelAll = useCallback(() => {
    isPointerDownRef.current = false;
    lastWorldPtRef.current = null;
    setHoveredObj(null);
    setHoveredClient(null);
    setHoveredBoxPx({ w: 0, h: 0 });
  }, []);

  useEffect(() => {
    cancelAll();
  }, [closeNonce, cancelAll]);

  const fetchObjects = useCallback(async () => {
    setObjectsLoading(true);
    setObjectsError("");
    try {
      const res = await fetch(`${API}/api/defs/objects`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to load objects (${res.status})`);

      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.objects;
      if (!Array.isArray(list)) throw new Error("Bad objects payload");

      setObjects(list);

      const firstId = String(
        list[0]?.id ?? list[0]?.key ?? list[0]?.name ?? ""
      );

      if (!selectedSingleId && firstId) setSelectedSingleId(firstId);
      if (!selectedMultiIds.length && firstId) setSelectedMultiIds([firstId]);
    } catch (e) {
      setObjectsError(e?.message || "Failed to load objects");
      setObjects([]);
    } finally {
      setObjectsLoading(false);
    }
  }, [selectedSingleId, selectedMultiIds.length]);

  useEffect(() => {
    fetchObjects();
  }, [fetchObjects]);

  const objectsSorted = useMemo(() => {
    const list = [...(objects || [])];
    list.sort((a, b) => {
      const al = String(a?.label ?? a?.name ?? a?.id ?? a?.key ?? "").toLowerCase();
      const bl = String(b?.label ?? b?.name ?? b?.id ?? b?.key ?? "").toLowerCase();
      return al.localeCompare(bl);
    });
    return list;
  }, [objects]);

  const filteredObjects = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return objectsSorted;
    return objectsSorted.filter((o) => {
      const id = String(o?.id ?? o?.key ?? o?.name ?? "").toLowerCase();
      const label = String(o?.label ?? o?.name ?? "").toLowerCase();
      return id.includes(q) || label.includes(q);
    });
  }, [objectsSorted, filter]);

  const selectedSingleObject = useMemo(() => {
    return (
      objectsSorted.find(
        (o) => String(o.id ?? o.key ?? o.name) === String(selectedSingleId)
      ) || null
    );
  }, [objectsSorted, selectedSingleId]);

  useEffect(() => {
    if (tool === "erase") {
      warmTightBoundsForObjects(worldObjects, objectDefs);
    }
  }, [tool, worldObjects, objectDefs]);

  useEffect(() => {
    const canvas = canvasRef?.current;
    if (!canvas) return;

    canvas.style.cursor =
      tool === "erase" ? "cell" : tool === "spray" ? "crosshair" : "crosshair";

    const onMove = async (e) => {
      setMouseClient({ x: e.clientX, y: e.clientY });

      const pt = clientToWorld(e.clientX, e.clientY);
      if (pt) lastWorldPtRef.current = { x: pt.x, y: pt.y };

      if (tool === "erase") {
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
      }
    };

    window.addEventListener("mousemove", onMove);

    return () => {
      window.removeEventListener("mousemove", onMove);
      canvas.style.cursor = "";
    };
  }, [tool, canvasRef, clientToWorld, pickObjectAtClient]);

  const trySpawnAt = useCallback(
    (x, y, defId) => {
      const minD2 = Math.max(4, Number(spacing || 0)) ** 2;

      for (const o of worldObjects) {
        const ox = Number(o?.x);
        const oy = Number(o?.y);
        if (!Number.isFinite(ox) || !Number.isFinite(oy)) continue;
        if (dist2({ x, y }, { x: ox, y: oy }) < minD2) return false;
      }

      if (!defId) return false;

      socket?.emit("world:spawnObject", {
        defId: String(defId),
        x: Math.round(x),
        y: Math.round(y),
        state: {},
      });

      return true;
    },
    [socket, spacing, worldObjects]
  );

  useEffect(() => {
    const canvas = canvasRef?.current;
    if (!canvas) return;

    const onMouseDown = (e) => {
      if (e.button !== 0) return;

      const pt = clientToWorld(e.clientX, e.clientY);
      if (!pt) return;

      if (tool === "stamp") {
        trySpawnAt(pt.x, pt.y, selectedSingleId);
        return;
      }

      if (tool === "erase") {
        const id = hoveredObj?._id ? String(hoveredObj._id) : "";
        if (!id) return;
        socket?.emit(DELETE_EVENT, { id });
        return;
      }

      if (tool === "spray") {
        isPointerDownRef.current = true;
        lastWorldPtRef.current = { x: pt.x, y: pt.y };
      }
    };

    const onMouseUp = () => {
      isPointerDownRef.current = false;
    };

    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      isPointerDownRef.current = false;
    };
  }, [canvasRef, clientToWorld, hoveredObj, selectedSingleId, socket, tool, trySpawnAt]);

  useEffect(() => {
    if (tool !== "spray") return;

    let raf = 0;
    lastBrushAtRef.current = 0;

    const loop = (ts) => {
      raf = requestAnimationFrame(loop);

      if (!isPointerDownRef.current) return;

      const intervalMs = 1000 / clamp(Number(density || 0), 1, 30);
      if (ts - lastBrushAtRef.current < intervalMs) return;
      lastBrushAtRef.current = ts;

      const base = lastWorldPtRef.current;
      if (!base) return;

      const ids = (selectedMultiIds || []).filter(Boolean);
      if (!ids.length) return;

      const r = clamp(Number(radius || 0), 6, 240);
      const burstCount = clamp(Math.round(density / 3 + r / 60), 2, 12);
      let placed = 0;
      const attempts = burstCount * 4;

      for (let i = 0; i < attempts && placed < burstCount; i++) {
        const off = randInCircle(r);
        const defId = ids[(Math.random() * ids.length) | 0];
        if (trySpawnAt(base.x + off.dx, base.y + off.dy, defId)) {
          placed++;
        }
      }
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [tool, density, radius, selectedMultiIds, trySpawnAt]);

  const previewRingPx = useMemo(() => {
    return Math.round(clamp(Number(radius || 0), 6, 240) * 2 * Number(zoom || 1));
  }, [radius, zoom]);

  const deleteHasTarget = !!(tool === "erase" && hoveredObj?._id && hoveredClient);
  const multiCount = (selectedMultiIds || []).length;

  const toggleMultiSelect = (id) => {
    setSelectedMultiIds((prev) => {
      const set = new Set(prev || []);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return Array.from(set);
    });
  };

  return (
    <>
      <div
        className={`admin-preview ${tool ? `admin-preview--${tool}` : ""}`}
        style={{
          left: deleteHasTarget ? hoveredClient.x : mouseClient.x,
          top: deleteHasTarget ? hoveredClient.y : mouseClient.y,
          display: tool ? "block" : "none",
        }}
      >
        {tool === "erase" ? (
          deleteHasTarget ? (
            <div
              className="admin-preview__box admin-preview__box--delete"
              style={{
                width: Math.max(10, Math.round(hoveredBoxPx.w || 0)),
                height: Math.max(10, Math.round(hoveredBoxPx.h || 0)),
              }}
            />
          ) : (
            <div className="admin-preview__ring" />
          )
        ) : tool === "spray" ? (
          <div
            className="admin-preview__ring"
            style={{
              width: Math.max(16, previewRingPx),
              height: Math.max(16, previewRingPx),
              borderColor: "rgba(140,110,210,0.78)",
              background: "rgba(140,110,210,0.08)",
            }}
          />
        ) : (
          <div className="admin-preview__box" />
        )}
      </div>

      <div className="admin-panel__section">
        <div className="admin-panel__section-label">Placement</div>

        <div className="admin-panel__row admin-panel__row--tight">
          <button
            className={`admin-btn${tool === "stamp" ? " admin-btn--active" : ""}`}
            type="button"
            onClick={() => setTool("stamp")}
          >
            Stamp
          </button>

          <button
            className={`admin-btn${tool === "spray" ? " admin-btn--active" : ""}`}
            type="button"
            onClick={() => setTool("spray")}
          >
            Spray
          </button>

          <button
            className={`admin-btn admin-btn--danger${tool === "erase" ? " admin-btn--active" : ""}`}
            type="button"
            onClick={() => setTool("erase")}
          >
            Erase
          </button>
        </div>

        <p className="admin-panel__hint">
          Stamp = place one selected object.
          <br />
          Spray = paint random from selected list.
          <br />
          Erase = hover one object and click delete.
        </p>
      </div>

      <div className="admin-panel__section">
        <div className="admin-panel__section-label">Objects</div>

        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter objects..."
          className="admin-input admin-input--compact"
        />

        <div className="admin-panel__hint" style={{ marginTop: 4 }}>
          Click = set Stamp object.
          <br />
          Ctrl/Cmd+Click = add/remove from Spray list.
        </div>

        <div className="admin-object-list">
          {objectsLoading && <div className="admin-object-list__empty">Loading…</div>}
          {!!objectsError && <div className="admin-object-list__empty">⚠ {objectsError}</div>}

          {!objectsLoading &&
            !objectsError &&
            filteredObjects.map((o) => {
              const id = String(o.id ?? o.key ?? o.name);
              const label = String(o.label ?? o.name ?? o.id ?? o.key ?? id);
              const isSingle = String(selectedSingleId) === id;
              const isMulti = selectedMultiIds.includes(id);

              return (
                <button
                  key={id}
                  type="button"
                  className={[
                    "admin-object-item",
                    isSingle ? "is-single" : "",
                    isMulti ? "is-multi" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={(e) => {
                    setSelectedSingleId(id);
                    if (e.ctrlKey || e.metaKey) {
                      toggleMultiSelect(id);
                    }
                  }}
                  title={id}
                >
                  <span className="admin-object-item__main">{label}</span>
                  <span className="admin-object-item__meta">
                    {isSingle ? "STAMP" : ""}
                    {isSingle && isMulti ? " • " : ""}
                    {isMulti ? "SPRAY" : ""}
                  </span>
                </button>
              );
            })}

          {!objectsLoading && !objectsError && !filteredObjects.length && (
            <div className="admin-object-list__empty">No objects found.</div>
          )}
        </div>
      </div>

      {tool === "stamp" && (
        <div className="admin-panel__section">
          <div className="admin-panel__section-label">Stamp</div>
          <div className="admin-panel__hint">
            Selected: <b>{selectedSingleObject?.label ?? selectedSingleId ?? "none"}</b>
          </div>
        </div>
      )}

      {tool === "spray" && (
        <div className="admin-panel__section">
          <div className="admin-panel__section-label">Spray Settings</div>

          <div className="admin-panel__row admin-panel__row--tight">
            <label className="admin-field">
              <span>Radius</span>
              <input
                type="number"
                value={radius}
                min={6}
                max={240}
                onChange={(e) => setRadius(clamp(Number(e.target.value || 0), 6, 240))}
                className="admin-input admin-input--compact"
              />
            </label>

            <label className="admin-field">
              <span>Density</span>
              <input
                type="number"
                value={density}
                min={1}
                max={30}
                onChange={(e) => setDensity(clamp(Number(e.target.value || 0), 1, 30))}
                className="admin-input admin-input--compact"
              />
            </label>

            <label className="admin-field">
              <span>Spacing</span>
              <input
                type="number"
                value={spacing}
                min={4}
                max={128}
                onChange={(e) => setSpacing(clamp(Number(e.target.value || 0), 4, 128))}
                className="admin-input admin-input--compact"
              />
            </label>
          </div>

          <div className="admin-panel__hint">
            Spray pool: <b>{multiCount}</b>
          </div>
        </div>
      )}

      {tool === "erase" && (
        <div className="admin-panel__section">
          <div className="admin-panel__section-label">Erase</div>
          <div className="admin-panel__hint">
            Target:{" "}
            <b>{hoveredObj?._id ? String(hoveredObj?.defId ?? hoveredObj?._id) : "none"}</b>
          </div>
        </div>
      )}
    </>
  );
}