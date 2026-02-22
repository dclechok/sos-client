import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TILE } from "../../../world/worldConstants";

const API = process.env.REACT_APP_API_BASE_URL || "";
const MAP_SRC = `${API}/world/map.png`;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function useWorldMapRenderer({ world, me }) {
  const imgRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.src = MAP_SRC;

    img.onload = () => {
      if (!alive) return;
      imgRef.current = img;
      setReady(true);
    };

    img.onerror = () => {
      if (!alive) return;
      console.error("Failed to load map image:", MAP_SRC);
      setReady(false);
    };

    return () => {
      alive = false;
    };
  }, []);

  // renderMapFrame(ctx, w, h, opts?)
  const renderMapFrame = useCallback(
    (ctx, w, h, opts = {}) => {
      const meta = world?.meta;

      const zoom = Number.isFinite(opts.zoom) ? opts.zoom : 1;
      const pan = opts.pan && Number.isFinite(opts.pan.x) && Number.isFinite(opts.pan.y)
        ? opts.pan
        : { x: 0, y: 0 };

      // bg
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(0, 0, w, h);

      if (!meta) {
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.font = "14px system-ui";
        ctx.fillText("Loading world…", 12, 22);
        return;
      }

      const img = imgRef.current;
      if (!ready || !img) {
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.font = "14px system-ui";
        ctx.fillText("Loading map…", 12, 22);
        return;
      }

      // Fit image into available rect (base scale)
      const baseScale = Math.min(w / img.width, h / img.height);
      const scale = baseScale * zoom;

      const drawW = Math.floor(img.width * scale);
      const drawH = Math.floor(img.height * scale);

      // center it, THEN apply pan (pan is in screen/CSS pixels)
      let ox = Math.floor((w - drawW) / 2) + pan.x;
      let oy = Math.floor((h - drawH) / 2) + pan.y;

      // OPTIONAL: clamp pan so you can't fling map completely away.
      // This keeps at least a small portion onscreen.
      const margin = 80; // allow some overscroll
      const minOx = w - drawW - margin;
      const maxOx = margin;
      const minOy = h - drawH - margin;
      const maxOy = margin;

      // Only clamp if the map is larger than the view in that dimension.
      if (drawW > w) ox = clamp(ox, minOx, maxOx);
      else ox = Math.floor((w - drawW) / 2); // if it fits, keep centered horizontally

      if (drawH > h) oy = clamp(oy, minOy, maxOy);
      else oy = Math.floor((h - drawH) / 2); // if it fits, keep centered vertically

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, ox, oy, drawW, drawH);

      // subtle border
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.strokeRect(ox + 0.5, oy + 0.5, drawW - 1, drawH - 1);

      // player dot (smaller)
      if (me && Number.isFinite(me.x) && Number.isFinite(me.y)) {
        const tileX = Math.floor(me.x / TILE);
        const tileY = Math.floor(me.y / TILE);

        const nx = (tileX + 0.5) / meta.width_tiles;
        const ny = (tileY + 0.5) / meta.height_tiles;

        const px = ox + nx * drawW;
        const py = oy + ny * drawH;

        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "rgba(255,255,255,0.55)";
        ctx.beginPath();
        ctx.arc(px, py, 5.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    },
    [world?.meta, me, ready]
  );

  return useMemo(() => ({ renderMapFrame }), [renderMapFrame]);
}
