import { useEffect, useRef } from "react";

import spriteUrl from "../../art/Sprite-0001.png";
import hairSpriteUrl from "../../art/Sprite-0001-hair.png";
import beardSpriteUrl from "../../art/Sprite-0001-beard.png";

const FRAME_SIZE = 32;

/*
 * The body remains 32px tall.
 * The preview gets 10 extra pixels above the body so tall
 * hair and beard overlays use the same coordinate system.
 */
const OVERFLOW_TOP = 10;

const PREVIEW_WIDTH = FRAME_SIZE;
const PREVIEW_HEIGHT =
  FRAME_SIZE + OVERFLOW_TOP;

const SOURCE_COLORS = {
  outlineAndEyebrow: "#1a1a1a",
  eyes: "#323232",
  lips: "#4a4a4a",
  darkShadow: "#3d3d3d",
  lightShadow: "#626262",
  baseSkin: "#9e9e9e",
};

/*
 * The beard sprite is expected to use these same source
 * colors as the hair sprite.
 */
const OVERLAY_SOURCE_COLORS = {
  base: "#f2f2f2",
  dark: "#a5a5a5",
  light: "#c6c6c6",
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
          Math.min(
            255,
            Math.round(value)
          )
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
      OVERFLOW_TOP,
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
    OVERFLOW_TOP
  );
}

/*
 * Used for both hair and beard sheets.
 *
 * X axis = facing/animation frames
 * Y axis = different styles
 */
function createRecoloredOverlayFrame({
  image,
  styleIndex,
  frameIndex,
  color,
}) {
  const overlayCanvas =
    document.createElement("canvas");

  overlayCanvas.width = FRAME_SIZE;
  overlayCanvas.height = FRAME_SIZE;

  const overlayContext =
    overlayCanvas.getContext("2d", {
      willReadFrequently: true,
    });

  if (!overlayContext) {
    return null;
  }

  overlayContext.imageSmoothingEnabled =
    false;

  const totalFrames = Math.max(
    1,
    Math.floor(
      image.naturalWidth /
        FRAME_SIZE
    )
  );

  const totalStyles = Math.max(
    1,
    Math.floor(
      image.naturalHeight /
        FRAME_SIZE
    )
  );

  const selectedFrameIndex =
    normalizeIndex(
      frameIndex,
      totalFrames
    );

  const selectedStyleIndex =
    normalizeIndex(
      styleIndex,
      totalStyles
    );

  const sourceX =
    selectedFrameIndex * FRAME_SIZE;

  const sourceY =
    selectedStyleIndex * FRAME_SIZE;

  overlayContext.drawImage(
    image,
    sourceX,
    sourceY,
    FRAME_SIZE,
    FRAME_SIZE,
    0,
    0,
    FRAME_SIZE,
    FRAME_SIZE
  );

  const imageData =
    overlayContext.getImageData(
      0,
      0,
      FRAME_SIZE,
      FRAME_SIZE
    );

  const pixels = imageData.data;

  const finalBase = color;

  const finalDark =
    darkenHex(color, 0.35);

  const finalLight =
    lightenHex(color, 0.22);

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
        OVERLAY_SOURCE_COLORS.base
      )
    ) {
      setPixel(
        pixels,
        index,
        finalBase
      );

      continue;
    }

    if (
      colorsMatch(
        red,
        green,
        blue,
        OVERLAY_SOURCE_COLORS.dark
      )
    ) {
      setPixel(
        pixels,
        index,
        finalDark
      );

      continue;
    }

    if (
      colorsMatch(
        red,
        green,
        blue,
        OVERLAY_SOURCE_COLORS.light
      )
    ) {
      setPixel(
        pixels,
        index,
        finalLight
      );
    }
  }

  overlayContext.putImageData(
    imageData,
    0,
    0
  );

  return overlayCanvas;
}

export default function CharacterSpritePreview({
  skinTone,
  eyeColor = "#3b271b",

  hairColor = "#6b4022",
  hairIndex = 0,
  showHair = true,
  hairOffsetX = 0,
  hairOffsetY = -10,

  beardColor = "#6b4022",
  beardIndex = 0,
  showBeard = false,
  beardOffsetX = 0,
  beardOffsetY = -9,

  frameIndex = 0,
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
          beardImage,
        ] = await Promise.all([
          loadImage(spriteUrl),
          loadImage(hairSpriteUrl),
          loadImage(beardSpriteUrl),
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

        context.drawImage(
          bodyImage,
          bodySourceX,
          0,
          FRAME_SIZE,
          FRAME_SIZE,
          0,
          OVERFLOW_TOP,
          FRAME_SIZE,
          FRAME_SIZE
        );

        recolorBody(
          context,
          skinTone,
          eyeColor
        );

        /*
         * Beard is drawn before hair.
         * This lets hair overlap the beard when necessary.
         */
        if (showBeard) {
          const beardCanvas =
            createRecoloredOverlayFrame({
              image: beardImage,
              styleIndex: beardIndex,
              frameIndex,
              color: beardColor,
            });

          if (
            beardCanvas &&
            !cancelled
          ) {
            context.drawImage(
              beardCanvas,
              beardOffsetX,
              OVERFLOW_TOP +
                beardOffsetY
            );
          }
        }

        if (showHair) {
          const hairCanvas =
            createRecoloredOverlayFrame({
              image: hairImage,
              styleIndex: hairIndex,
              frameIndex,
              color: hairColor,
            });

          if (
            hairCanvas &&
            !cancelled
          ) {
            context.drawImage(
              hairCanvas,
              hairOffsetX,
              OVERFLOW_TOP +
                hairOffsetY
            );
          }
        }
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
    showHair,
    hairOffsetX,
    hairOffsetY,

    beardColor,
    beardIndex,
    showBeard,
    beardOffsetX,
    beardOffsetY,

    frameIndex,
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