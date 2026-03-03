import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useClientToWorld } from "./useClientToWorld";
import { useHoverPickObject } from "./useHoverPickObject";
import { warmTightBoundsForObjects } from "./tightBounds";

const DELETE_EVENT = "world:deleteObject";
const API = process.env.REACT_APP_API_BASE_URL || "";

// ---------- helpers ----------
function dist2(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function randInCircle(r) {
  // uniform area distribution
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
  const [activeTool, setActiveTool] = useState(""); // "", "create", "delete", "brush"

  // shared cursor preview location
  const [mouseClient, setMouseClient] = useState({ x: 0, y: 0 });

  // create menu state
  const [objectMenuOpen, setObjectMenuOpen] = useState(false);
  const [objects, setObjects] = useState([]);
  const [objectsLoading, setObjectsLoading] = useState(false);
  const [objectsError, setObjectsError] = useState("");
  const [selectedObjectId, setSelectedObjectId] = useState("");

  // delete hover state
  const [hoveredObj, setHoveredObj] = useState(null);
  const [hoveredClient, setHoveredClient] = useState(null);
  const [hoveredBoxPx, setHoveredBoxPx] = useState({ w: 0, h: 0 });

  // ---------- BRUSH STATE ----------
  const [brushMode, setBrushMode] = useState("paint"); // paint | erase
  const [brushRadius, setBrushRadius] = useState(64); // world px
  const [brushDensity, setBrushDensity] = useState(8); // ops per sec
  const [brushSpacing, setBrushSpacing] = useState(22); // min world px between placements
  const [brushPreset, setBrushPreset] = useState("nature"); // nature | trees | bushes | custom
  const [brushInclude, setBrushInclude] = useState([]); // defIds to pick from

  const isBrushingRef = useRef(false);
  const lastBrushAtRef = useRef(0);
  const lastWorldPtRef = useRef(null);

  const clientToWorld = useClientToWorld({ canvasRef, camSmoothRef, zoom });

  const pickObjectAtClient = useHoverPickObject({
    canvasRef,
    camSmoothRef,
    zoom,
    worldObjects,
    objectDefs,
  });

  const cancelAll = useCallback(() => {
    setActiveTool("");
    setObjectMenuOpen(false);

    setHoveredObj(null);
    setHoveredClient(null);
    setHoveredBoxPx({ w: 0, h: 0 });

    isBrushingRef.current = false;
    lastWorldPtRef.current = null;
  }, []);

  useEffect(() => {
    cancelAll();
  }, [closeNonce, cancelAll]);

  // fetch defs list (templates)
  const fetchObjects = useCallback(async () => {
    setObjectsError("");
    setObjectsLoading(true);
    try {
      const res = await fetch(`${API}/api/defs/objects`, { credentials: "include" });
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
      setObjectsError(e?.message || "Failed to load objects");
      setObjects([]);
    } finally {
      setObjectsLoading(false);
    }
  }, [selectedObjectId]);

  const objectsSorted = useMemo(() => {
    const labelOf = (o) =>
      String(o?.label ?? o?.name ?? o?.id ?? o?.key ?? "").toLowerCase();
    return [...(objects || [])].sort((a, b) => labelOf(a).localeCompare(labelOf(b)));
  }, [objects]);

  const selectedObject = useMemo(() => {
    const id = String(selectedObjectId || "");
    return objects.find((o) => String(o.id ?? o.key ?? o.name) === id) || null;
  }, [objects, selectedObjectId]);

  // ---------- BRUSH OPTIONS (derive eligible ids) ----------
  const eligibleBrushDefs = useMemo(() => {
    // Prefer the fetched defs list (objects). Fallback to objectDefs map keys.
    const idsFromList = (objects || [])
      .map((o) => String(o?.id ?? o?.key ?? o?.name ?? ""))
      .filter(Boolean);

    const ids = idsFromList.length ? idsFromList : Object.keys(objectDefs || {});
    const uniq = Array.from(new Set(ids));

    // "nature-ish" heuristic: id contains tree/bush/rock/plant OR name contains them
    const byId = new Set(uniq);

    const out = uniq
      .map((id) => {
        const def = objectDefs?.[id] || objects.find((o) => String(o.id ?? o.key ?? o.name) === id);
        const name = String(def?.name ?? def?.label ?? "");
        return { id, name };
      })
      .filter((x) => byId.has(x.id));

    return out;
  }, [objects, objectDefs]);

  const presetIds = useMemo(() => {
    const all = eligibleBrushDefs.map((d) => d.id);

    const trees = all.filter((id) => id.startsWith("tree_") || id.includes("tree"));
    const bushes = all.filter((id) => id.startsWith("bush_") || id.includes("bush"));

    // "nature" = trees + bushes for now (you can expand to rocks/flowers later)
    const nature = Array.from(new Set([...trees, ...bushes]));

    return { all, nature, trees, bushes };
  }, [eligibleBrushDefs]);

  // When preset changes, auto-fill include list (unless custom)
  useEffect(() => {
    if (brushPreset === "custom") return;

    const next =
      brushPreset === "trees"
        ? presetIds.trees
        : brushPreset === "bushes"
        ? presetIds.bushes
        : brushPreset === "nature"
        ? presetIds.nature
        : presetIds.all;

    setBrushInclude(next.slice(0, 24)); // keep list sane; you can remove this cap
  }, [brushPreset, presetIds]);

  // Prewarm bounds when arming delete
  useEffect(() => {
    if (activeTool !== "delete") return;
    warmTightBoundsForObjects(worldObjects, objectDefs);
  }, [activeTool, worldObjects, objectDefs]);

  // Mouse move tracking + hover pick + brush tracking
  useEffect(() => {
    const canvas = canvasRef?.current;
    if (!canvas) return;

    const active = !!activeTool;
    canvas.style.cursor = active
      ? activeTool === "delete"
        ? "cell"
        : activeTool === "brush"
        ? "crosshair"
        : "crosshair"
      : "";

    if (!active) return;

    const onMove = async (e) => {
      setMouseClient({ x: e.clientX, y: e.clientY });

      // cache world point for brush loop
      if (activeTool === "brush") {
        const pt = clientToWorld(e.clientX, e.clientY);
        if (pt) lastWorldPtRef.current = { x: pt.x, y: pt.y };
      }

      if (activeTool === "delete") {
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
  }, [activeTool, canvasRef, pickObjectAtClient, clientToWorld]);

  // One click handler routed by tool (create/delete)
  useEffect(() => {
    if (!activeTool) return;
    const canvas = canvasRef?.current;
    if (!canvas) return;

    const onClick = (e) => {
      const pt = clientToWorld(e.clientX, e.clientY);
      if (!pt) return;

      if (activeTool === "create") {
        const defId = String(selectedObjectId || "");
        if (!defId) return;

        socket?.emit("world:spawnObject", {
          defId,
          x: Math.round(pt.x),
          y: Math.round(pt.y),
          state: {},
        });
        setActiveTool("");
        return;
      }

      if (activeTool === "delete") {
        const id = hoveredObj?._id ? String(hoveredObj._id) : "";
        if (!id) return;
        socket?.emit(DELETE_EVENT, { id });
        setActiveTool("");
        return;
      }

      // brush uses mouse-down loop, not click
    };

    const t = setTimeout(() => canvas.addEventListener("click", onClick), 50);
    return () => {
      clearTimeout(t);
      canvas.removeEventListener("click", onClick);
    };
  }, [activeTool, canvasRef, clientToWorld, socket, selectedObjectId, hoveredObj]);

  // ---------- BRUSH LOOP ----------
  const trySpawnAt = useCallback(
    (x, y) => {
      const include = Array.isArray(brushInclude) ? brushInclude.filter(Boolean) : [];
      if (!include.length) return false;

      // spacing check vs existing objects (cheap O(n))
      const spacing = Math.max(4, Number(brushSpacing || 0));
      const minD2 = spacing * spacing;

      for (const o of worldObjects) {
        const ox = Number(o?.x);
        const oy = Number(o?.y);
        if (!Number.isFinite(ox) || !Number.isFinite(oy)) continue;
        if (dist2({ x, y }, { x: ox, y: oy }) < minD2) return false;
      }

      const defId = include[(Math.random() * include.length) | 0];
      socket?.emit("world:spawnObject", {
        defId,
        x: Math.round(x),
        y: Math.round(y),
        state: {},
      });

      return true;
    },
    [brushInclude, brushSpacing, socket, worldObjects]
  );

  const tryEraseAt = useCallback(
    (x, y) => {
      const r = Number(brushRadius || 0);
      const r2 = r * r;

      // delete up to N nearest objects per tick (keeps spam sane)
      const maxDeletes = 2;

      const hits = [];
      for (const o of worldObjects) {
        if (!o?._id) continue;
        const ox = Number(o?.x);
        const oy = Number(o?.y);
        if (!Number.isFinite(ox) || !Number.isFinite(oy)) continue;

        const d2 = dist2({ x, y }, { x: ox, y: oy });
        if (d2 <= r2) hits.push({ id: String(o._id), d2 });
      }

      hits.sort((a, b) => a.d2 - b.d2);
      for (let i = 0; i < Math.min(maxDeletes, hits.length); i++) {
        socket?.emit(DELETE_EVENT, { id: hits[i].id });
      }
    },
    [brushRadius, socket, worldObjects]
  );

  useEffect(() => {
    if (activeTool !== "brush") return;

    const canvas = canvasRef?.current;
    if (!canvas) return;

    isBrushingRef.current = false;
    lastBrushAtRef.current = 0;

    const onDown = (e) => {
      if (e.button !== 0) return; // left click only
      const pt = clientToWorld(e.clientX, e.clientY);
      if (pt) lastWorldPtRef.current = { x: pt.x, y: pt.y };
      isBrushingRef.current = true;
    };

    const onUp = () => {
      isBrushingRef.current = false;
    };

    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);

    let raf = 0;

    const loop = (ts) => {
      raf = requestAnimationFrame(loop);

      if (!isBrushingRef.current) return;

      const rate = clamp(Number(brushDensity || 0), 1, 30);
      const intervalMs = 1000 / rate;

      if (ts - (lastBrushAtRef.current || 0) < intervalMs) return;
      lastBrushAtRef.current = ts;

      const base = lastWorldPtRef.current;
      if (!base) return;

      const r = clamp(Number(brushRadius || 0), 6, 240);

      if (brushMode === "erase") {
        // erase uses center point (like a spray-delete)
        tryEraseAt(base.x, base.y);
        return;
      }

      // ✅ BURST: place multiple per tick
      // Aim: more trees when holding, but still respects spacing
      // Burst scales mildly with density and radius (feels “paint-y”)
      const burstCount = clamp(
        Math.round((rate / 3) + (r / 60)), // tweakable formula
        2,
        12
      );

      let placed = 0;
      const maxPlacedThisTick = burstCount; // could cap lower if you want

      // Try more attempts than placements, because spacing rejects some
      const attempts = burstCount * 4;

      for (let i = 0; i < attempts && placed < maxPlacedThisTick; i++) {
        const off = randInCircle(r);
        const x = base.x + off.dx;
        const y = base.y + off.dy;

        if (trySpawnAt(x, y)) {
          placed++;
        }
      }
    };

    raf = requestAnimationFrame(loop);

    return () => {
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      cancelAnimationFrame(raf);
      isBrushingRef.current = false;
    };
  }, [
    activeTool,
    canvasRef,
    clientToWorld,
    brushDensity,
    brushRadius,
    brushMode,
    trySpawnAt,
    tryEraseAt,
  ]);

  const deleteHasTarget = !!(activeTool === "delete" && hoveredObj?._id && hoveredClient);

  // Brush preview ring size (screen px)
  const brushRingPx = useMemo(() => {
    const r = clamp(Number(brushRadius || 0), 6, 240);
    return Math.round(r * 2 * Number(zoom || 1));
  }, [brushRadius, zoom]);

  const brushHasInclude = (brushInclude || []).filter(Boolean).length > 0;

  return (
    <>
      {/* Shared preview overlay */}
      {!!activeTool && (
        <div
          className={`admin-preview ${activeTool ? `admin-preview--${activeTool}` : ""}`}
          style={{
            left: deleteHasTarget ? hoveredClient.x : mouseClient.x,
            top: deleteHasTarget ? hoveredClient.y : mouseClient.y,
          }}
        >
          {activeTool === "create" && <div className="admin-preview__box" />}

          {activeTool === "delete" &&
            (deleteHasTarget ? (
              <div
                className="admin-preview__box admin-preview__box--delete"
                style={{
                  width: Math.max(10, Math.round(hoveredBoxPx.w || 0)),
                  height: Math.max(10, Math.round(hoveredBoxPx.h || 0)),
                }}
              />
            ) : (
              <div className="admin-preview__ring" />
            ))}

          {activeTool === "brush" && (
            <div
              className="admin-preview__ring"
              title="Brush radius"
              style={{
                width: Math.max(16, brushRingPx),
                height: Math.max(16, brushRingPx),
                borderColor:
                  brushMode === "erase"
                    ? "rgba(255,120,120,0.78)"
                    : "rgba(140,110,210,0.78)",
                background:
                  brushMode === "erase"
                    ? "rgba(255,120,120,0.08)"
                    : "rgba(140,110,210,0.08)",
              }}
            />
          )}
        </div>
      )}

      <div className="admin-panel__section">
        <div className="admin-panel__section-label">Objects</div>

        <div className="admin-panel__row">
          <button
            className={`admin-btn${
              activeTool === "delete" ? " admin-btn--active" : ""
            } admin-btn--danger`}
            onClick={() => {
              setObjectMenuOpen(false);
              setActiveTool((t) => (t === "delete" ? "" : "delete"));
            }}
            title="Hover an object and click to delete it"
            type="button"
          >
            {activeTool === "delete" ? "Target…" : "Delete"}
          </button>

          <button
            className={`admin-btn${activeTool === "brush" ? " admin-btn--active" : ""}`}
            onClick={async () => {
              // ensure we have defs loaded so brush list isn't empty
              if (!objects.length && !objectsLoading) await fetchObjects();
              setObjectMenuOpen(false);
              setActiveTool((t) => (t === "brush" ? "" : "brush"));
            }}
            type="button"
            title="Hold mouse down to paint/erase objects"
          >
            {activeTool === "brush" ? "Brush…" : "Brush"}
          </button>
        </div>

        {activeTool === "delete" && (
          <p className="admin-panel__hint">
            Hover an object to highlight it, then click to delete. <kbd>Esc</kbd> cancels.
            <br />
            Target:{" "}
            <b>{hoveredObj?._id ? String(hoveredObj?.defId ?? hoveredObj?._id) : "none"}</b>
          </p>
        )}

        {/* ---------- BRUSH UI ---------- */}
        {activeTool === "brush" && (
          <>
            <p className="admin-panel__hint" style={{ marginTop: 6 }}>
              Hold mouse to {brushMode === "erase" ? "erase" : "paint"}.{" "}
              <kbd>Esc</kbd> cancels.
              {!brushHasInclude && (
                <>
                  <br />
                  <b style={{ color: "rgba(255,160,160,0.95)" }}>
                    No brush objects selected.
                  </b>
                </>
              )}
            </p>

            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button
                className={`admin-btn${brushMode === "paint" ? " admin-btn--active" : ""}`}
                type="button"
                onClick={() => setBrushMode("paint")}
              >
                Paint
              </button>
              <button
                className={`admin-btn admin-btn--danger${
                  brushMode === "erase" ? " admin-btn--active" : ""
                }`}
                type="button"
                onClick={() => setBrushMode("erase")}
              >
                Erase
              </button>
            </div>

            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <label style={{ flex: 1 }}>
                <div style={{ opacity: 0.75, marginBottom: 4 }}>Preset</div>
                <select
                  value={brushPreset}
                  onChange={(e) => setBrushPreset(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    borderRadius: 4,
                    border: "1px solid rgba(210,220,255,0.16)",
                    background: "rgba(255,255,255,0.03)",
                    color: "rgba(240,244,255,0.86)",
                    fontFamily: "Cinzel, serif",
                    fontSize: 10,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  <option value="nature">Nature (trees+bushes)</option>
                  <option value="trees">Trees only</option>
                  <option value="bushes">Bushes only</option>
                  <option value="custom">Custom</option>
                </select>
              </label>

              <label style={{ width: 118 }}>
                <div style={{ opacity: 0.75, marginBottom: 4 }}>Radius</div>
                <input
                  type="number"
                  value={brushRadius}
                  onChange={(e) => setBrushRadius(clamp(Number(e.target.value || 0), 6, 240))}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    borderRadius: 4,
                    border: "1px solid rgba(210,220,255,0.16)",
                    background: "rgba(255,255,255,0.03)",
                    color: "rgba(240,244,255,0.86)",
                  }}
                />
              </label>
            </div>

            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <label style={{ flex: 1 }}>
                <div style={{ opacity: 0.75, marginBottom: 4 }}>
                  Density <span style={{ opacity: 0.65 }}>(ops/sec)</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={brushDensity}
                  onChange={(e) => setBrushDensity(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
                <div style={{ opacity: 0.75, marginTop: 2 }}>{brushDensity}</div>
              </label>

              <label style={{ flex: 1 }}>
                <div style={{ opacity: 0.75, marginBottom: 4 }}>
                  Spacing <span style={{ opacity: 0.65 }}>(min px)</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={64}
                  step={1}
                  value={brushSpacing}
                  onChange={(e) => setBrushSpacing(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
                <div style={{ opacity: 0.75, marginTop: 2 }}>{brushSpacing}</div>
              </label>
            </div>

            <div style={{ marginTop: 8 }}>
              <div style={{ opacity: 0.75, marginBottom: 6 }}>
                Included objects ({(brushInclude || []).filter(Boolean).length})
              </div>

              <div
                style={{
                  maxHeight: 160,
                  overflow: "auto",
                  border: "1px solid rgba(210,220,255,0.14)",
                  borderRadius: 6,
                  padding: 6,
                  background: "rgba(0,0,0,0.16)",
                }}
              >
                {eligibleBrushDefs.map(({ id, name }) => {
                  const checked = (brushInclude || []).includes(id);
                  const label = name ? `${id} — ${name}` : id;
                  return (
                    <label
                      key={id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "4px 6px",
                        borderRadius: 4,
                        cursor: "pointer",
                        opacity: checked ? 1 : 0.82,
                      }}
                      onClick={() => setBrushPreset("custom")}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setBrushPreset("custom");
                          const on = e.target.checked;
                          setBrushInclude((prev) => {
                            const set = new Set(prev || []);
                            if (on) set.add(id);
                            else set.delete(id);
                            return Array.from(set);
                          });
                        }}
                      />
                      <span style={{ userSelect: "none" }}>{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Create menu */}
        <div className="admin-panel__menu" style={{ marginTop: 10 }}>
          <button
            className={`admin-btn${objectMenuOpen ? " admin-btn--active" : ""}`}
            onClick={async () => {
              setActiveTool("");
              const next = !objectMenuOpen;
              setObjectMenuOpen(next);
              if (next && !objects.length && !objectsLoading) await fetchObjects();
            }}
            type="button"
          >
            {objectsLoading
              ? "Loading…"
              : selectedObject
              ? `Create: ${selectedObject.label ?? selectedObject.name ?? selectedObjectId}`
              : "Create Object"}
          </button>

          {objectMenuOpen && (
            <div className="admin-menu">
              {objectsError && <div className="admin-menu__error">⚠ {objectsError}</div>}

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
                          setActiveTool("create");
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
                >
                  ↻ Refresh
                </button>
              </div>
            </div>
          )}
        </div>

        {activeTool === "create" && (
          <p className="admin-panel__hint" style={{ marginTop: 8 }}>
            Placing: <b>{selectedObject?.label ?? selectedObject?.name ?? selectedObjectId}</b>
            <br />
            Click the world to spawn it. <kbd>Esc</kbd> cancels.
          </p>
        )}
      </div>
    </>
  );
}