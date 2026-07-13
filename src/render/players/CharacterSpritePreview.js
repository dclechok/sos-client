import { useEffect, useRef } from "react";

import spriteUrl from "../../art/Sprite-0001.png";
import hairSpriteUrl from "../../art/Sprite-0001-hair.png";

const FRAME_SIZE = 32;

/*
 * The body remains 32px tall.
 * The preview gets 10 extra pixels above the body so tall
 * hairstyles are not clipped.
 */
const HAIR_OVERFLOW_TOP = 10;

const PREVIEW_WIDTH = FRAME_SIZE;
const PREVIEW_HEIGHT =
  FRAME_SIZE + HAIR_OVERFLOW_TOP;

const SOURCE_COLORS = {
  outlineAndEyebrow: "#1a1a1a",
  eyes: "#323232",
  lips: "#4a4a4a",
  darkShadow: "#3d3d3d",
  lightShadow: "#626262",
  baseSkin: "#9e9e9e",
};

const HAIR_SOURCE_COLORS = {
  baseHair: "#f2f2f2",
  darkHighlight: "#a5a5a5",
  lightHighlight: "#c6c6c6",
};

function hexToRgb(hex) {
  const clean = String(hex)
    .replace("#", "")
    .trim();

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
        Math.max(
          0,
          Math.min(255, Math.round(value))
        )
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

function lightenHex(hex, amount) {
  const { r, g, b } = hexToRgb(hex);

  return rgbToHex(
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount
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

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve(image);
    };

    image.onerror = () => {
      reject(
        new Error(
          `Could not load sprite: ${src}`
        )
      );
    };

    image.src = src;
  });
}

function normalizeIndex(index, total) {
  if (total <= 0) {
    return 0;
  }

  const numericIndex =
    Number(index) || 0;

  return (
    (numericIndex % total + total) %
    total
  );
}

function recolorBody(
  context,
  skinTone,
  eyeColor
) {
  const imageData =
    context.getImageData(
      0,
      HAIR_OVERFLOW_TOP,
      FRAME_SIZE,
      FRAME_SIZE
    );

  const pixels = imageData.data;

  const baseSkin =
    skinTone?.base ||
    skinTone?.value ||
    "#d8ab87";

  const lightShadow =
    skinTone?.light ||
    darkenHex(baseSkin, 0.12);

  const darkShadow =
    skinTone?.dark ||
    darkenHex(baseSkin, 0.25);

  const outlineAndEyebrow =
    skinTone?.outline ||
    darkenHex(darkShadow, 0.65);

  const lips =
    skinTone?.lips ||
    skinTone?.lip ||
    darkenHex(baseSkin, 0.18);

  for (
    let index = 0;
    index < pixels.length;
    index += 4
  ) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const alpha = pixels[index + 3];

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
      setPixel(
        pixels,
        index,
        outlineAndEyebrow
      );

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
      setPixel(
        pixels,
        index,
        eyeColor
      );

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
      setPixel(
        pixels,
        index,
        lips
      );

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
      setPixel(
        pixels,
        index,
        darkShadow
      );

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
      setPixel(
        pixels,
        index,
        lightShadow
      );

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
      setPixel(
        pixels,
        index,
        baseSkin
      );
    }
  }

  context.putImageData(
    imageData,
    0,
    HAIR_OVERFLOW_TOP
  );
}

function createHairFrame({
  hairImage,
  hairIndex,
  frameIndex,
  hairColor,
}) {
  const hairCanvas =
    document.createElement("canvas");

  hairCanvas.width = FRAME_SIZE;
  hairCanvas.height = FRAME_SIZE;

  const hairContext =
    hairCanvas.getContext("2d", {
      willReadFrequently: true,
    });

  if (!hairContext) {
    return null;
  }

  hairContext.imageSmoothingEnabled =
    false;

  /*
   * X axis:
   * animation or facing frames
   *
   * Y axis:
   * different hairstyles
   */
  const totalFrames = Math.max(
    1,
    Math.floor(
      hairImage.naturalWidth /
        FRAME_SIZE
    )
  );

  const totalHairStyles = Math.max(
    1,
    Math.floor(
      hairImage.naturalHeight /
        FRAME_SIZE
    )
  );

  const selectedFrameIndex =
    normalizeIndex(
      frameIndex,
      totalFrames
    );

  const selectedHairIndex =
    normalizeIndex(
      hairIndex,
      totalHairStyles
    );

  const sourceX =
    selectedFrameIndex * FRAME_SIZE;

  const sourceY =
    selectedHairIndex * FRAME_SIZE;

  hairContext.drawImage(
    hairImage,

    // Source position
    sourceX,
    sourceY,

    // Source size
    FRAME_SIZE,
    FRAME_SIZE,

    // Destination position
    0,
    0,

    // Destination size
    FRAME_SIZE,
    FRAME_SIZE
  );

  const imageData =
    hairContext.getImageData(
      0,
      0,
      FRAME_SIZE,
      FRAME_SIZE
    );

  const pixels = imageData.data;

  const finalBaseHair =
    hairColor;

  const finalDarkHighlight =
    darkenHex(hairColor, 0.35);

  const finalLightHighlight =
    lightenHex(hairColor, 0.22);

  for (
    let index = 0;
    index < pixels.length;
    index += 4
  ) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const alpha = pixels[index + 3];

    if (alpha === 0) {
      continue;
    }

    if (
      colorsMatch(
        red,
        green,
        blue,
        HAIR_SOURCE_COLORS.baseHair
      )
    ) {
      setPixel(
        pixels,
        index,
        finalBaseHair
      );

      continue;
    }

    if (
      colorsMatch(
        red,
        green,
        blue,
        HAIR_SOURCE_COLORS.darkHighlight
      )
    ) {
      setPixel(
        pixels,
        index,
        finalDarkHighlight
      );

      continue;
    }

    if (
      colorsMatch(
        red,
        green,
        blue,
        HAIR_SOURCE_COLORS.lightHighlight
      )
    ) {
      setPixel(
        pixels,
        index,
        finalLightHighlight
      );
    }
  }

  hairContext.putImageData(
    imageData,
    0,
    0
  );

  return hairCanvas;
}

export default function CharacterSpritePreview({
  skinTone,
  eyeColor = "#3b271b",
  hairColor = "#6b4022",

  /*
   * Hairstyle row:
   *
   * 0 = sourceY 0
   * 1 = sourceY 32
   * 2 = sourceY 64
   * 3 = sourceY 96
   */
  hairIndex = 0,

  /*
   * Animation/facing column:
   *
   * 0 = sourceX 0
   * 1 = sourceX 32
   * 2 = sourceX 64
   * 3 = sourceX 96
   */
  frameIndex = 0,

  showHair = true,

  hairOffsetX = 0,

  /*
   * This places the hair ten pixels
   * above the body's 32x32 frame.
   */
  hairOffsetY = -10,

  scale = 4,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const context =
      canvas.getContext("2d", {
        willReadFrequently: true,
      });

    if (!context) {
      return undefined;
    }

    let cancelled = false;

    async function renderCharacter() {
      try {
        const [
          bodyImage,
          hairImage,
        ] = await Promise.all([
          loadImage(spriteUrl),
          loadImage(hairSpriteUrl),
        ]);

        if (cancelled) {
          return;
        }

        canvas.width =
          PREVIEW_WIDTH;

        canvas.height =
          PREVIEW_HEIGHT;

        context.clearRect(
          0,
          0,
          PREVIEW_WIDTH,
          PREVIEW_HEIGHT
        );

        context.imageSmoothingEnabled =
          false;

        const bodyFrameCount =
          Math.max(
            1,
            Math.floor(
              bodyImage.naturalWidth /
                FRAME_SIZE
            )
          );

        const selectedBodyFrame =
          normalizeIndex(
            frameIndex,
            bodyFrameCount
          );

        const bodySourceX =
          selectedBodyFrame *
          FRAME_SIZE;

        /*
         * Body stays 32x32.
         *
         * It is drawn 10 pixels below
         * the top of the preview so hair
         * can extend above it.
         */
        context.drawImage(
          bodyImage,

          // Source position
          bodySourceX,
          0,

          // Source size
          FRAME_SIZE,
          FRAME_SIZE,

          // Destination position
          0,
          HAIR_OVERFLOW_TOP,

          // Destination size
          FRAME_SIZE,
          FRAME_SIZE
        );

        recolorBody(
          context,
          skinTone,
          eyeColor
        );

        if (!showHair) {
          return;
        }

        const hairCanvas =
          createHairFrame({
            hairImage,
            hairIndex,
            frameIndex,
            hairColor,
          });

        if (
          !hairCanvas ||
          cancelled
        ) {
          return;
        }

        context.imageSmoothingEnabled =
          false;

        /*
         * HAIR_OVERFLOW_TOP is 10.
         * hairOffsetY is -10.
         *
         * 10 + -10 = 0
         */
        context.drawImage(
          hairCanvas,
          hairOffsetX,
          HAIR_OVERFLOW_TOP +
            hairOffsetY
        );
      } catch (error) {
        console.error(
          "Could not render character preview:",
          error
        );
      }
    }

    renderCharacter();

    return () => {
      cancelled = true;
    };
  }, [
    skinTone,
    eyeColor,
    hairColor,
    hairIndex,
    frameIndex,
    showHair,
    hairOffsetX,
    hairOffsetY,
  ]);

  const displayedWidth =
    PREVIEW_WIDTH * scale;

  const displayedHeight =
    PREVIEW_HEIGHT * scale;

  return (
    <canvas
      ref={canvasRef}
      aria-label="Character preview"
      style={{
        display: "block",
        width: `${displayedWidth}px`,
        height: `${displayedHeight}px`,
        imageRendering: "pixelated",
        flexShrink: 0,
      }}
    />
  );
}