import { useEffect, useRef } from "react";
import spriteUrl from "../../art/Sprite-0001.png";

const SOURCE_COLORS = {
  outlineAndEyebrow: "#1a1a1a",
  eyes: "#323232",
  lips: "#4a4a4a",
  darkShadow: "#3d3d3d",
  lightShadow: "#626262",
  baseSkin: "#9e9e9e",
};

function hexToRgb(hex) {
  const clean = String(hex).replace("#", "");

  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map((value) =>
        Math.max(0, Math.min(255, Math.round(value)))
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  );
}

function darkenHex(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const multiplier = 1 - amount;

  return rgbToHex(
    r * multiplier,
    g * multiplier,
    b * multiplier
  );
}

function colorsMatch(r, g, b, hex) {
  const target = hexToRgb(hex);

  return (
    r === target.r &&
    g === target.g &&
    b === target.b
  );
}

function setPixel(data, index, hex) {
  const color = hexToRgb(hex);

  data[index] = color.r;
  data[index + 1] = color.g;
  data[index + 2] = color.b;
}

export default function CharacterSpritePreview({
  skinTone,
  eyeColor = "#3b271b",
  scale = 4,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext("2d", {
      willReadFrequently: true,
    });

    if (!context) {
      return undefined;
    }

    const image = new Image();
    image.src = spriteUrl;

    image.onload = () => {
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = false;
      context.drawImage(image, 0, 0);

      const imageData = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );

      const pixels = imageData.data;

      const baseSkin =
        skinTone?.base ||
        skinTone?.value ||
        "#d8ab87";

      const lightShadow = darkenHex(baseSkin, 0.12);
      const darkShadow = darkenHex(baseSkin, 0.25);

      // Outline and eyebrows share one mask color and one output color.
      // This makes them clearly darker than the darkest skin shadow.
      const outlineAndEyebrow = darkenHex(darkShadow, 0.65);

      // Lips are derived from the base skin so the variable is always defined.
      const lips =
        skinTone?.lips ||
        skinTone?.lip ||
        darkenHex(baseSkin, 0.18);

      for (let i = 0; i < pixels.length; i += 4) {
        const red = pixels[i];
        const green = pixels[i + 1];
        const blue = pixels[i + 2];
        const alpha = pixels[i + 3];

        if (alpha === 0) {
          continue;
        }

        if (
          colorsMatch(
            red,
            green,
            blue,
            SOURCE_COLORS.outlineAndEyebrow
          )
        ) {
          setPixel(pixels, i, outlineAndEyebrow);
          continue;
        }

        if (
          colorsMatch(
            red,
            green,
            blue,
            SOURCE_COLORS.eyes
          )
        ) {
          setPixel(pixels, i, eyeColor);
          continue;
        }

        if (
          colorsMatch(
            red,
            green,
            blue,
            SOURCE_COLORS.lips
          )
        ) {
          setPixel(pixels, i, lips);
          continue;
        }

        if (
          colorsMatch(
            red,
            green,
            blue,
            SOURCE_COLORS.darkShadow
          )
        ) {
          setPixel(pixels, i, darkShadow);
          continue;
        }

        if (
          colorsMatch(
            red,
            green,
            blue,
            SOURCE_COLORS.lightShadow
          )
        ) {
          setPixel(pixels, i, lightShadow);
          continue;
        }

        if (
          colorsMatch(
            red,
            green,
            blue,
            SOURCE_COLORS.baseSkin
          )
        ) {
          setPixel(pixels, i, baseSkin);
        }
      }

      context.putImageData(imageData, 0, 0);
    };

    image.onerror = () => {
      console.error("Could not load character sprite:", spriteUrl);
    };

    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [skinTone, eyeColor]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Character preview"
      style={{
        display: "block",
        imageRendering: "pixelated",
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      }}
    />
  );
}