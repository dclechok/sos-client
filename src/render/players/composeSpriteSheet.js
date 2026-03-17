const TEMPLATE_COLORS = {
  BODY: "#999999",
  EAR: "#b7b7b7",
  DARK: "#5e5e5e",
  LIGHT: "#c8c8c8",
  EYES: "#444444",
};

const LAYER_PATHS = {
  body: "/art/spritegen/sprite-template-body.png",
  dark: "/art/spritegen/sprite-template-darkshad.png",
  light: "/art/spritegen/sprite-template-lightshad.png",
  eyes: "/art/spritegen/sprite-template-eyes.png",
};

const imageCache = new Map();
const sheetCache = new Map();

function normalizeHex(hex) {
  return String(hex || "").trim().toLowerCase();
}

function rgbToHex(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0"))
      .join("")
  );
}

function loadImage(src) {
  if (imageCache.has(src)) return imageCache.get(src);

  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });

  imageCache.set(src, promise);
  return promise;
}

function recolorLayer(img, replacements) {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (!a) continue;

    const hex = rgbToHex(data[i], data[i + 1], data[i + 2]);
    const replacement = replacements[normalizeHex(hex)];
    if (!replacement) continue;

    const clean = replacement.replace("#", "");
    data[i] = parseInt(clean.slice(0, 2), 16);
    data[i + 1] = parseInt(clean.slice(2, 4), 16);
    data[i + 2] = parseInt(clean.slice(4, 6), 16);
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export async function composeSpriteSheet({ skinTone, eyeColor }) {
  const key = JSON.stringify({
    skinToneId: skinTone?.id || "",
    base: skinTone?.base,
    ear: skinTone?.ear,
    dark: skinTone?.dark,
    light: skinTone?.light,
    eyeColor,
  });

  if (sheetCache.has(key)) return sheetCache.get(key);

  const promise = (async () => {
    const [bodyImg, darkImg, lightImg, eyesImg] = await Promise.all([
      loadImage(LAYER_PATHS.body),
      loadImage(LAYER_PATHS.dark),
      loadImage(LAYER_PATHS.light),
      loadImage(LAYER_PATHS.eyes),
    ]);

    const width = bodyImg.width;
    const height = bodyImg.height;

    const out = document.createElement("canvas");
    out.width = width;
    out.height = height;

    const ctx = out.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    const recoloredBody = recolorLayer(bodyImg, {
      [TEMPLATE_COLORS.BODY]: skinTone.base,
      [TEMPLATE_COLORS.EAR]: skinTone.ear,
    });

    const recoloredDark = recolorLayer(darkImg, {
      [TEMPLATE_COLORS.DARK]: skinTone.dark,
    });

    const recoloredLight = recolorLayer(lightImg, {
      [TEMPLATE_COLORS.LIGHT]: skinTone.light,
    });

    const recoloredEyes = recolorLayer(eyesImg, {
      [TEMPLATE_COLORS.EYES]: eyeColor,
    });

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(recoloredBody, 0, 0);
    ctx.drawImage(recoloredDark, 0, 0);
    ctx.drawImage(recoloredLight, 0, 0);
    ctx.drawImage(recoloredEyes, 0, 0);

    return out;
  })();

  sheetCache.set(key, promise);
  return promise;
}