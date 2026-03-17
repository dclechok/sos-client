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

function makeAppearanceKey(appearance = {}) {
  const merged = { ...getDefaultAppearance(), ...(appearance || {}) };
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
  const merged = { ...getDefaultAppearance(), ...(appearance || {}) };
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

  record.promise = composeSpriteSheet({
    skinTone: getSkinToneById(merged.skinToneId),
    eyeColor: merged.eyeColor,
  })
    .then((canvas) => {
      record.status = "ready";
      record.canvas = canvas;
      return canvas;
    })
    .catch((err) => {
      record.status = "error";
      record.error = err;
      return null;
    });

  runtimeSheetCache.set(key, record);
  return record;
}