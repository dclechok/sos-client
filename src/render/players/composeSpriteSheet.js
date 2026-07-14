import bodySpriteUrl from "../../art/Sprite-0001.png";
import hairSpriteUrl from "../../art/Sprite-0001-hair.png";
import beardSpriteUrl from "../../art/Sprite-0001-beard.png";

const FRAME_SIZE = 32;

/*
 * The body itself is 32×32.
 *
 * Hair extends 10 pixels above the body's normal frame,
 * so the composed frame is 42 pixels tall.
 */
const OVERFLOW_TOP = 10;

export const COMPOSED_FRAME_WIDTH =
  FRAME_SIZE;

export const COMPOSED_FRAME_HEIGHT =
  FRAME_SIZE + OVERFLOW_TOP;

/*
 * Current overlay layout:
 *
 * X axis:
 *   Column 0 = forward-facing
 *   Additional directions may be added later.
 *
 * Y axis:
 *   Row 0 = style 0
 *   Row 1 = style 1
 *   Row 2 = style 2
 *   etc.
 */
const FORWARD_FRAME_INDEX = 0;

/*
 * Established overlay offsets from the character preview.
 *
 * Body is drawn at y = 10.
 * Hair is drawn at 10 - 10 = 0.
 * Beard is drawn at 10 - 8 = 2.
 */
const HAIR_OFFSET_X = 0;
const HAIR_OFFSET_Y = -10;

const BEARD_OFFSET_X = 0;
const BEARD_OFFSET_Y = -8;

/*
 * Exact grayscale source colors used by Sprite-0001.png.
 */
const BODY_SOURCE_COLORS = {
  outline: "#2a2a2a",
  eyes: "#323232",
  eyebrow: "#2a2a2a",
  lips: "#4a4a4a",
  darkShadow: "#3d3d3d",
  lightShadow: "#626262",
  baseSkin: "#9e9e9e",
};

/*
 * Exact grayscale source colors used by the hair
 * and beard overlay sheets.
 */
const OVERLAY_SOURCE_COLORS = {
  base: "#f2f2f2",
  dark: "#a5a5a5",
  light: "#c6c6c6",
};

const DEFAULT_COLORS = {
  skinBase: "#ddb59a",
  skinDark: "#9e715a",
  skinLight: "#efc7ad",
  outline: "#2a2a2a",
  lips: "#b57971",
  eyes: "#3b271b",
  hair: "#2b1d16",
  beard: "#2b1d16",
};

const imageCache = new Map();
const sheetCache = new Map();

function normalizeHex(
  value,
  fallback = "#000000"
) {
  const normalized = String(
    value || ""
  )
    .trim()
    .toLowerCase();

  return /^#[0-9a-f]{6}$/.test(
    normalized
  )
    ? normalized
    : fallback;
}

function hexToRgb(hex) {
  const normalized =
    normalizeHex(hex).slice(1);

  return {
    r: parseInt(
      normalized.slice(0, 2),
      16
    ),

    g: parseInt(
      normalized.slice(2, 4),
      16
    ),

    b: parseInt(
      normalized.slice(4, 6),
      16
    ),
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

function darkenHex(
  hex,
  amount = 0.35
) {
  const { r, g, b } =
    hexToRgb(hex);

  const multiplier =
    1 - amount;

  return rgbToHex(
    r * multiplier,
    g * multiplier,
    b * multiplier
  );
}

function lightenHex(
  hex,
  amount = 0.22
) {
  const { r, g, b } =
    hexToRgb(hex);

  return rgbToHex(
    r +
      (255 - r) *
        amount,

    g +
      (255 - g) *
        amount,

    b +
      (255 - b) *
        amount
  );
}

function normalizeStyleIndex(
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numeric =
    Number(value);

  if (
    !Number.isInteger(
      numeric
    ) ||
    numeric < 0
  ) {
    return null;
  }

  return numeric;
}

function loadImage(src) {
  if (
    imageCache.has(src)
  ) {
    return imageCache.get(
      src
    );
  }

  const promise =
    new Promise(
      (resolve, reject) => {
        const image =
          new Image();

        image.onload = () => {
          resolve(image);
        };

        image.onerror = () => {
          reject(
            new Error(
              `Failed to load sprite image: ${src}`
            )
          );
        };

        image.src = src;
      }
    );

  imageCache.set(
    src,
    promise
  );

  return promise;
}

function createCanvas(
  width,
  height,
  willReadFrequently = false
) {
  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width = width;
  canvas.height = height;

  const context =
    canvas.getContext(
      "2d",
      {
        willReadFrequently,
      }
    );

  if (!context) {
    throw new Error(
      "Could not create canvas context."
    );
  }

  context.imageSmoothingEnabled =
    false;

  return {
    canvas,
    context,
  };
}

function colorsMatch(
  red,
  green,
  blue,
  hex
) {
  const target =
    hexToRgb(hex);

  return (
    red === target.r &&
    green === target.g &&
    blue === target.b
  );
}

function setPixel(
  pixels,
  index,
  hex
) {
  const color =
    hexToRgb(hex);

  pixels[index] =
    color.r;

  pixels[index + 1] =
    color.g;

  pixels[index + 2] =
    color.b;
}

/**
 * Recolors the entire grayscale body sprite sheet.
 */
function recolorBodySheet({
  image,
  skinTone,
  eyeColor,
  isBlinking = false,
}) {
  const {
    canvas,
    context,
  } = createCanvas(
    image.width,
    image.height,
    true
  );

  context.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  context.drawImage(
    image,
    0,
    0
  );

  const imageData =
    context.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );

  const pixels =
    imageData.data;

  const baseSkin =
    normalizeHex(
      skinTone?.base ||
        skinTone?.value,
      DEFAULT_COLORS.skinBase
    );

  const darkShadow =
    normalizeHex(
      skinTone?.dark,
      darkenHex(
        baseSkin,
        0.25
      )
    );

  const lightShadow =
    normalizeHex(
      skinTone?.light,
      lightenHex(
        baseSkin,
        0.18
      )
    );

  const outline =
    normalizeHex(
      skinTone?.outline,
      darkenHex(
        darkShadow,
        0.65
      )
    );

  const lips =
    normalizeHex(
      skinTone?.lips ||
        skinTone?.lip,
      darkenHex(
        baseSkin,
        0.18
      )
    );

  const finalEyeColor =
    normalizeHex(
      eyeColor,
      DEFAULT_COLORS.eyes
    );

  for (
    let index = 0;
    index < pixels.length;
    index += 4
  ) {
    const alpha =
      pixels[index + 3];

    if (alpha === 0) {
      continue;
    }

    const red =
      pixels[index];

    const green =
      pixels[index + 1];

    const blue =
      pixels[index + 2];

    /*
     * Outline and eyebrow use the same
     * grayscale source color.
     */
    if (
      colorsMatch(
        red,
        green,
        blue,
        BODY_SOURCE_COLORS.eyes
      )
    ) {
      setPixel(
        pixels,
        index,
        isBlinking
          ? outline
          : finalEyeColor
      );

      continue;
    }

    if (
      colorsMatch(
        red,
        green,
        blue,
        BODY_SOURCE_COLORS.eyes
      )
    ) {
      setPixel(
        pixels,
        index,
        finalEyeColor
      );

      continue;
    }

    if (
      colorsMatch(
        red,
        green,
        blue,
        BODY_SOURCE_COLORS.lips
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
        BODY_SOURCE_COLORS.darkShadow
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
        BODY_SOURCE_COLORS.lightShadow
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
        BODY_SOURCE_COLORS.baseSkin
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
    0
  );

  return canvas;
}

/**
 * Extracts one 32×32 overlay frame.
 *
 * X axis = facing/frame
 * Y axis = style
 *
 * For now frameIndex is always 0,
 * which selects the forward-facing column.
 */
function extractOverlayFrame({
  image,
  styleIndex,
  frameIndex =
    FORWARD_FRAME_INDEX,
}) {
  const normalizedStyleIndex =
    normalizeStyleIndex(
      styleIndex
    );

  if (
    normalizedStyleIndex ===
    null
  ) {
    return null;
  }

  const totalColumns =
    Math.floor(
      image.width /
        FRAME_SIZE
    );

  const totalRows =
    Math.floor(
      image.height /
        FRAME_SIZE
    );

  if (
    totalColumns < 1 ||
    totalRows < 1
  ) {
    throw new Error(
      `Invalid overlay sheet dimensions: ${image.width}×${image.height}`
    );
  }

  if (
    normalizedStyleIndex >=
    totalRows
  ) {
    console.warn(
      `Overlay style index ${normalizedStyleIndex} is outside the sheet. Maximum is ${totalRows - 1}.`
    );

    return null;
  }

  const safeFrameIndex =
    Math.max(
      0,
      Math.min(
        Number(frameIndex) ||
          0,
        totalColumns - 1
      )
    );

  const sourceX =
    safeFrameIndex *
    FRAME_SIZE;

  const sourceY =
    normalizedStyleIndex *
    FRAME_SIZE;

  const {
    canvas,
    context,
  } = createCanvas(
    FRAME_SIZE,
    FRAME_SIZE,
    true
  );

  context.clearRect(
    0,
    0,
    FRAME_SIZE,
    FRAME_SIZE
  );

  context.drawImage(
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

  return canvas;
}

/**
 * Recolors one extracted hair or beard frame.
 */
function recolorOverlayFrame(
  overlayCanvas,
  selectedColor
) {
  if (!overlayCanvas) {
    return null;
  }

  const {
    canvas,
    context,
  } = createCanvas(
    FRAME_SIZE,
    FRAME_SIZE,
    true
  );

  context.drawImage(
    overlayCanvas,
    0,
    0
  );

  const imageData =
    context.getImageData(
      0,
      0,
      FRAME_SIZE,
      FRAME_SIZE
    );

  const pixels =
    imageData.data;

  const baseColor =
    normalizeHex(
      selectedColor,
      DEFAULT_COLORS.hair
    );

  const darkColor =
    darkenHex(
      baseColor,
      0.35
    );

  const lightColor =
    lightenHex(
      baseColor,
      0.22
    );

  for (
    let index = 0;
    index < pixels.length;
    index += 4
  ) {
    const alpha =
      pixels[index + 3];

    if (alpha === 0) {
      continue;
    }

    const red =
      pixels[index];

    const green =
      pixels[index + 1];

    const blue =
      pixels[index + 2];

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
        baseColor
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
        darkColor
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
        lightColor
      );
    }
  }

  context.putImageData(
    imageData,
    0,
    0
  );

  return canvas;
}

/**
 * Creates the composed forward-facing character frame.
 *
 * Output size:
 * 32×42
 *
 * Layer order:
 * 1. Body
 * 2. Beard
 * 3. Hair
 */
export async function composeSpriteSheet({
  skinTone,

  eyeColor =
    DEFAULT_COLORS.eyes,

  isBlinking = false,

  hairStyle = "none",
  hairIndex = null,
  hairColor =
    DEFAULT_COLORS.hair,

  beardStyle = "none",
  beardIndex = null,
  beardColor =
    DEFAULT_COLORS.beard,
} = {}) {
  const normalizedHairStyle =
    String(
      hairStyle || "none"
    );

  const normalizedBeardStyle =
    String(
      beardStyle || "none"
    );

  const normalizedHairIndex =
    normalizedHairStyle ===
    "none"
      ? null
      : normalizeStyleIndex(
          hairIndex
        );

  const normalizedBeardIndex =
    normalizedBeardStyle ===
    "none"
      ? null
      : normalizeStyleIndex(
          beardIndex
        );

  const appearanceKey = {
    skinToneId:
      String(
        skinTone?.id || ""
      ),
    isBlinking:
      Boolean(
        isBlinking
      ),
    base:
      normalizeHex(
        skinTone?.base,
        DEFAULT_COLORS.skinBase
      ),

    dark:
      normalizeHex(
        skinTone?.dark,
        DEFAULT_COLORS.skinDark
      ),

    light:
      normalizeHex(
        skinTone?.light,
        DEFAULT_COLORS.skinLight
      ),

    outline:
      normalizeHex(
        skinTone?.outline,
        DEFAULT_COLORS.outline
      ),

    lips:
      normalizeHex(
        skinTone?.lips ||
          skinTone?.lip,
        DEFAULT_COLORS.lips
      ),

    eyeColor:
      normalizeHex(
        eyeColor,
        DEFAULT_COLORS.eyes
      ),

    hairStyle:
      normalizedHairStyle,

    hairIndex:
      normalizedHairIndex,

    hairColor:
      normalizeHex(
        hairColor,
        DEFAULT_COLORS.hair
      ),

    beardStyle:
      normalizedBeardStyle,

    beardIndex:
      normalizedBeardIndex,

    beardColor:
      normalizeHex(
        beardColor,
        DEFAULT_COLORS.beard
      ),

    frameIndex:
      FORWARD_FRAME_INDEX,
  };

  const key =
    JSON.stringify(
      appearanceKey
    );

  if (
    sheetCache.has(key)
  ) {
    return sheetCache.get(
      key
    );
  }

  const promise = (async () => {
    const [
      bodyImage,
      hairImage,
      beardImage,
    ] = await Promise.all([
      loadImage(
        bodySpriteUrl
      ),

      loadImage(
        hairSpriteUrl
      ),

      loadImage(
        beardSpriteUrl
      ),
    ]);

    if (
      bodyImage.width <
        FRAME_SIZE ||
      bodyImage.height <
        FRAME_SIZE
    ) {
      throw new Error(
        `Body sprite must contain at least one ${FRAME_SIZE}×${FRAME_SIZE} frame.`
      );
    }
  const recoloredBodySheet =
    recolorBodySheet({
      image:
        bodyImage,

      skinTone,

      eyeColor:
        appearanceKey.eyeColor,

      isBlinking:
        appearanceKey.isBlinking,
    });

    /*
     * For now, use the first 32×32 body frame,
     * which is the forward-facing frame.
     */
    const {
      canvas: bodyFrame,
      context:
        bodyFrameContext,
    } = createCanvas(
      FRAME_SIZE,
      FRAME_SIZE
    );

    bodyFrameContext.drawImage(
      recoloredBodySheet,

      FORWARD_FRAME_INDEX *
        FRAME_SIZE,
      0,
      FRAME_SIZE,
      FRAME_SIZE,

      0,
      0,
      FRAME_SIZE,
      FRAME_SIZE
    );

    let beardFrame = null;

    if (
      normalizedBeardStyle !==
        "none" &&
      normalizedBeardIndex !==
        null
    ) {
      const extractedBeard =
        extractOverlayFrame({
          image:
            beardImage,

          styleIndex:
            normalizedBeardIndex,

          frameIndex:
            FORWARD_FRAME_INDEX,
        });

      beardFrame =
        recolorOverlayFrame(
          extractedBeard,
          appearanceKey.beardColor
        );
    }

    let hairFrame = null;

    if (
      normalizedHairStyle !==
        "none" &&
      normalizedHairIndex !==
        null
    ) {
      const extractedHair =
        extractOverlayFrame({
          image:
            hairImage,

          styleIndex:
            normalizedHairIndex,

          frameIndex:
            FORWARD_FRAME_INDEX,
        });

      hairFrame =
        recolorOverlayFrame(
          extractedHair,
          appearanceKey.hairColor
        );
    }

    const {
      canvas: output,
      context:
        outputContext,
    } = createCanvas(
      COMPOSED_FRAME_WIDTH,
      COMPOSED_FRAME_HEIGHT
    );

    outputContext.clearRect(
      0,
      0,
      COMPOSED_FRAME_WIDTH,
      COMPOSED_FRAME_HEIGHT
    );

    /*
     * Body begins 10 pixels below the top.
     */
    outputContext.drawImage(
      bodyFrame,
      0,
      OVERFLOW_TOP
    );

    /*
     * Beard is drawn before hair.
     */
    if (beardFrame) {
      outputContext.drawImage(
        beardFrame,

        BEARD_OFFSET_X,

        OVERFLOW_TOP +
          BEARD_OFFSET_Y
      );
    }

    if (hairFrame) {
      outputContext.drawImage(
        hairFrame,

        HAIR_OFFSET_X,

        OVERFLOW_TOP +
          HAIR_OFFSET_Y
      );
    }

    return output;
  })();

  sheetCache.set(
    key,
    promise
  );

  /*
   * Do not permanently cache failed image loads.
   */
  promise.catch(() => {
    if (
      sheetCache.get(key) ===
      promise
    ) {
      sheetCache.delete(key);
    }
  });

  return promise;
}

export function clearComposedSpriteSheetCache() {
  sheetCache.clear();
}