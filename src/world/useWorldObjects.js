// src/world/useWorldObjects.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const API = process.env.REACT_APP_API_BASE_URL || "";

export function useWorldObjects({
  socket,
  me,
  radius = 2400,
  worldId = "main",
} = {}) {
  const [byId, setById] = useState({}); // _id -> doc

  const meRef = useRef(me);
  useEffect(() => {
    meRef.current = me;
  }, [me]);

  const upsert = useCallback((obj) => {
    if (!obj?._id) return;
    const id = String(obj._id);
    setById((prev) => ({ ...prev, [id]: obj }));
  }, []);

  const remove = useCallback((ids) => {
    const arr = Array.isArray(ids) ? ids : [];
    if (!arr.length) return;
    setById((prev) => {
      const next = { ...prev };
      for (const id of arr) delete next[String(id)];
      return next;
    });
  }, []);

  // realtime updates
  useEffect(() => {
    if (!socket) return;

    const onSpawn = (obj) => upsert(obj);
    const onDespawn = ({ ids } = {}) => remove(ids);

    socket.on("obj:spawn", onSpawn);
    socket.on("obj:despawn", onDespawn);
    return () => {
      socket.off("obj:spawn", onSpawn);
      socket.off("obj:despawn", onDespawn);
    };
  }, [socket, upsert, remove]);

  // initial fetch so existing DB objects show on reload
  const fetchNearby = useCallback(async () => {
    const m = meRef.current;
    if (!m) return;

    const x = Math.round(Number(m.x));
    const y = Math.round(Number(m.y));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    const url = `${API}/api/world/objects/near?worldId=${encodeURIComponent(
      worldId
    )}&x=${x}&y=${y}&r=${Math.round(radius)}`;

    console.log("[useWorldObjects] fetchNearby:", url);

    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Failed to load objects (${res.status}) ${txt}`);
    }

    const data = await res.json();
    const list = data?.objects || [];

    const next = {};
    for (const o of list) {
      if (!o?._id) continue;
      next[String(o._id)] = o;
    }

    setById(next);
  }, [radius, worldId]);

  useEffect(() => {
    if (!me) return;
    fetchNearby().catch((e) => {
      console.warn("[useWorldObjects] fetchNearby failed:", e);
    });
  }, [me, fetchNearby]);

  const objects = useMemo(() => Object.values(byId), [byId]);
  return { objects, fetchNearby };
}