import { composeSpriteSheet } from "./composeSpriteSheet";
import { getSkinToneById } from "../../utils/palletes";

const runtimeSheetCache = new Map();

export function getDefaultAppearance() {
  return {
    skinToneId: "light_neutral_1",
    eyeColor: "#3b271b",
    hairStyle: "none",
    hairColor: "#2b1d16",
    beardStyle: "none",
    beardColor: "#2b1d16",
  };
}

function normalizeAppearance(appearance = {}) {
  const merged = { ...getDefaultAppearance(), ...(appearance || {}) };

  return {
    skinToneId: String(merged.skinToneId || "light_neutral_1"),
    eyeColor: String(merged.eyeColor || "#3b271b"),
    hairStyle: String(merged.hairStyle || "none"),
    hairColor: String(merged.hairColor || "#2b1d16"),
    beardStyle: String(merged.beardStyle || "none"),
    beardColor: String(merged.beardColor || "#2b1d16"),
  };
}

function makeAppearanceKey(appearance = {}) {
  const merged = normalizeAppearance(appearance);

  return JSON.stringify({
    skinToneId: merged.skinToneId,
    eyeColor: merged.eyeColor,
    hairStyle: merged.hairStyle,
    hairColor: merged.hairColor,
    beardStyle: merged.beardStyle,
    beardColor: merged.beardColor,
  });
}

export function getPlayerSheetRecord(appearance = {}) {
  const merged = normalizeAppearance(appearance);
  const key = makeAppearanceKey(merged);

  if (runtimeSheetCache.has(key)) {
    return runtimeSheetCache.get(key);
  }

  const record = {
    key,
    status: "pending",
    canvas: null,
    error: null,
    promise: null,
  };

  const skinTone =
    getSkinToneById(merged.skinToneId) ||
    getSkinToneById("light_neutral_1") || {
      id: "light_neutral_1",
      base: "#ddb59a",
      ear: "#c99f85",
      dark: "#9e715a",
      light: "#efc7ad",
    };

  record.promise = composeSpriteSheet({
    skinTone,
    eyeColor: merged.eyeColor,
  })
    .then((canvas) => {
      record.status = "ready";
      record.canvas = canvas;
      record.error = null;
      return canvas;
    })
    .catch((err) => {
      record.status = "error";
      record.canvas = null;
      record.error = err;
      console.error("[playerSheetRuntime] composeSpriteSheet failed:", err);
      return null;
    });

  runtimeSheetCache.set(key, record);
  return record;
}

export function clearPlayerSheetRuntimeCache() {
  runtimeSheetCache.clear();
}