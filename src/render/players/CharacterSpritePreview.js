import { useEffect, useRef } from "react";
import { composeSpriteSheet } from "./composeSpriteSheet";

const FRAME_SIZE = 32;

// row 0 col 0 = idle down
export default function CharacterSpritePreview({
  skinTone,
  eyeColor,
  scale = 4,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let disposed = false;

    async function draw() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
      const drawSize = FRAME_SIZE * scale;

      canvas.width = drawSize * dpr;
      canvas.height = drawSize * dpr;
      canvas.style.width = `${drawSize}px`;
      canvas.style.height = `${drawSize}px`;

      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) return;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;

      // Scale the whole canvas to DPR, then draw in CSS-pixel space
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;

      const sheet = await composeSpriteSheet({ skinTone, eyeColor });
      if (disposed) return;

      ctx.drawImage(
        sheet,
        0,
        0,
        FRAME_SIZE,
        FRAME_SIZE,
        0,
        0,
        drawSize,
        drawSize
      );
    }

    draw();

    return () => {
      disposed = true;
    };
  }, [skinTone, eyeColor, scale]);

  return <canvas ref={canvasRef} className="cc-sprite-canvas" />;
}