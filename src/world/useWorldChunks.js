// src/world/useWorldChunks.js
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { TERRAIN_ID } from "./worldConstants";

// ✅ IMPORTANT (Vercel client + Render server):
// Point world fetches at your backend base URL in production.
// Set this in Vercel env vars:
//   REACT_APP_API_BASE_URL=https://sos-server-e1g3.onrender.com
const API = process.env.REACT_APP_API_BASE_URL || "";
console.log("API:", process.env.REACT_APP_API_BASE_URL);
export function useWorldChunks({
  metaUrl = `${API}/world/meta.json`,
  chunkBaseUrl = `${API}/world/chunks`,
  preloadRadiusChunks = 2,
} = {}) {
  const [meta, setMeta] = useState(null);

  const cacheRef = useRef(new Map());
  const inflightRef = useRef(new Set()); 
  const [chunkVersion, setChunkVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch(metaUrl)
      .then((r) => r.json())
      .then((j) => alive && setMeta(j))
      .catch((e) => console.error("Failed to load meta.json", e));
    return () => {
      alive = false;
    };
  }, [metaUrl]);

  const keyOf = useCallback((cx, cy) => `${cx},${cy}`, []);

  const fetchChunk = useCallback(
    async (cx, cy) => {
      if (!meta) return;
      if (cx < 0 || cy < 0 || cx >= meta.chunks_x || cy >= meta.chunks_y) return;

      const key = keyOf(cx, cy);
      if (cacheRef.current.has(key) || inflightRef.current.has(key)) return;

      inflightRef.current.add(key);
      try {
        const res = await fetch(`${chunkBaseUrl}/${cx}_${cy}.bin`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        cacheRef.current.set(key, new Uint8Array(buf));
        setChunkVersion((v) => v + 1);
      } catch (e) {
        console.error("Failed to fetch chunk", cx, cy, e);
      } finally {
        inflightRef.current.delete(key);
      }
    },
    [meta, chunkBaseUrl, keyOf]
  );

  const getChunk = useCallback(
    (cx, cy) => {
      const key = keyOf(cx, cy);
      return cacheRef.current.get(key) || null;
    },
    [keyOf]
  );

  const preloadAroundWorldTile = useCallback(
    (tileX, tileY) => {
      if (!meta) return;
      const cs = meta.chunk_size;

      const centerCx = Math.floor(tileX / cs);
      const centerCy = Math.floor(tileY / cs);

      const r = preloadRadiusChunks;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          fetchChunk(centerCx + dx, centerCy + dy);
        }
      }
    },
    [meta, preloadRadiusChunks, fetchChunk]
  );

  const getTileId = useCallback(
    (tileX, tileY) => {
      // ✅ if meta not ready, treat as UNKNOWN (debug black), not ocean
      if (!meta) return TERRAIN_ID.UNKNOWN;

      // out of bounds = ocean edge
      if (
        tileX < 0 ||
        tileY < 0 ||
        tileX >= meta.width_tiles ||
        tileY >= meta.height_tiles
      ) {
        return TERRAIN_ID.DEEP_OCEAN;
      }

      const cs = meta.chunk_size;
      const cx = Math.floor(tileX / cs);
      const cy = Math.floor(tileY / cs);

      const chunk = getChunk(cx, cy);

      // ✅ if chunk not loaded, return UNKNOWN (black), NOT ocean
      if (!chunk) return TERRAIN_ID.UNKNOWN;

      const lx = tileX - cx * cs;
      const ly = tileY - cy * cs;
      return chunk[ly * cs + lx] ?? TERRAIN_ID.UNKNOWN;
    },
    [meta, getChunk]
  );

  return useMemo(
    () => ({
      meta,
      preloadAroundWorldTile,
      getTileId,
      fetchChunk,
      getChunk,
      chunkVersion,
    }),
    [meta, preloadAroundWorldTile, getTileId, fetchChunk, getChunk, chunkVersion]
  );
}