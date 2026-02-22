// src/world/useObjectDefs.js
import { useEffect, useMemo, useState } from "react";

const API = process.env.REACT_APP_API_BASE_URL || "";

export function useObjectDefs() {
  const [list, setList] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setError("");
        const res = await fetch(`${API}/api/defs/objects`, { credentials: "include" });
        if (!res.ok) throw new Error(`defs load failed (${res.status})`);
        const data = await res.json();
        const arr = Array.isArray(data) ? data : (data?.objects || []);
        if (alive) setList(arr);
      } catch (e) {
        if (alive) setError(e?.message || "failed");
      }
    })();

    return () => { alive = false; };
  }, []);

  const objectDefs = useMemo(() => {
    const map = {};
    for (const d of list) {
      const id = String(d?.id ?? d?.key ?? d?.name ?? "");
      if (!id) continue;
      map[id] = d;
    }
    return map;
  }, [list]);

  return { objectDefs, objectDefsList: list, objectDefsError: error };
}