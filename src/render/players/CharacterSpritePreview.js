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
    let dead = false;

    async function draw() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;

      const framePx = FRAME_SIZE * scale;
      canvas.width = framePx;
      canvas.height = framePx;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const sheet = await composeSpriteSheet({ skinTone, eyeColor });
      if (dead) return;

      ctx.drawImage(
        sheet,
        0,
        0,
        FRAME_SIZE,
        FRAME_SIZE,
        0,
        0,
        framePx,
        framePx
      );
    }

    draw();
    return () => {
      dead = true;
    };
  }, [skinTone, eyeColor, scale]);

  return <canvas ref={canvasRef} className="cc-sprite-canvas" />;
}