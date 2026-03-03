// useHoverPickObject.js
import { useCallback } from "react";
import { getTightBounds } from "./tightBounds";

export function useHoverPickObject({
  canvasRef,
  camSmoothRef,
  zoom,
  worldObjects,
  objectDefs,
}) {
  return useCallback(
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
        const def = objectDefs?.[obj.defId];

        if (!obj?._id || !def) continue;

        const wx = Number(obj.x || 0);
        const wy = Number(obj.y || 0);

        const sx = cx + (wx - camX) * z;
        const sy = cy + (wy - camY) * z;

        let tight = null;
        if (def?.frames?.[0]) {
          tight = await getTightBounds(obj.defId, def.frames[0]);
        }

        let dw, dh, boxOffX, boxOffY;

        const baseSize = Number(def?.sizePx ?? obj?.sizePx ?? 16);

        if (tight) {
          const imgToScreen = (baseSize * z) / tight.imgW;
          dw = tight.w * imgToScreen;
          dh = tight.h * imgToScreen;
          boxOffX = tight.offX * imgToScreen;
          boxOffY = tight.offY * imgToScreen;
        } else {
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
}