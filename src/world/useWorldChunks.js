import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { TERRAIN_ID } from "./worldConstants";

export function useWorldChunks({
  metaUrl = "/world/meta.json",
  chunkBaseUrl = "/world/chunks",
  preloadRadiusChunks = 2,
} = {}) {
  const [meta, setMeta] = useState(null);

  const cacheRef = useRef(new Map()); // "cx,cy" => Uint8Array
  const inflightRef = useRef(new Set()); // "cx,cy"

  // increments whenever a chunk finishes loading
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

        // notify listeners (minimap, etc.) WITHOUT changing world object identity
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
      if (!meta) return TERRAIN_ID.DEEP_OCEAN;

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
      if (!chunk) return TERRAIN_ID.DEEP_OCEAN;

      const lx = tileX - cx * cs;
      const ly = tileY - cy * cs;
      return chunk[ly * cs + lx] ?? TERRAIN_ID.DEEP_OCEAN;
    },
    [meta, getChunk]
  );

  // ✅ IMPORTANT: world object should NOT depend on chunkVersion
  const world = useMemo(
    () => ({
      meta,
      preloadAroundWorldTile,
      getTileId,
      fetchChunk,
      getChunk,
    }),
    [meta, preloadAroundWorldTile, getTileId, fetchChunk, getChunk]
  );

  // Return both: a stable world object + a changing version number
  return useMemo(
    () => ({
      ...world,
      worldChunkVersion: chunkVersion, // renamed to discourage using it as a dep for world identity
    }),
    [world, chunkVersion]
  );
}
