import { useCallback } from "react";

export function useClientToWorld({ canvasRef, camSmoothRef, zoom }) {
  return useCallback(
    (clientX, clientY) => {
      const canvas = canvasRef?.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;

      const dx = clientX - rect.left - cx;
      const dy = clientY - rect.top - cy;

      const camX = Number(camSmoothRef?.current?.x || 0);
      const camY = Number(camSmoothRef?.current?.y || 0);
      const z = Number(zoom || 1);

      return { x: camX + dx / z, y: camY + dy / z, rect };
    },
    [canvasRef, camSmoothRef, zoom]
  );
}