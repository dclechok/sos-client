import {
  composeSpriteSheet,
} from "./composeSpriteSheet";

import {
  getSkinToneById,
} from "../../utils/palletes";

const runtimeSheetCache =
  new Map();

export function getDefaultAppearance() {
  return {
    skinToneId:
      "light_neutral_1",

    eyeColor:
      "#3b271b",

    hairStyle:
      "none",

    hairIndex:
      null,

    hairColor:
      "#2b1d16",

    beardStyle:
      "none",

    beardIndex:
      null,

    beardColor:
      "#2b1d16",
  };
}

function normalizeNullableIndex(
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

export function normalizeAppearance(
  appearance = {}
) {
  const merged = {
    ...getDefaultAppearance(),
    ...(appearance || {}),
  };

  const hairStyle =
    String(
      merged.hairStyle ||
        "none"
    );

  const beardStyle =
    String(
      merged.beardStyle ||
        "none"
    );

  return {
    skinToneId:
      String(
        merged.skinToneId ||
          "light_neutral_1"
      ),

    eyeColor:
      String(
        merged.eyeColor ||
          "#3b271b"
      ),

    hairStyle,

    hairIndex:
      hairStyle === "none"
        ? null
        : normalizeNullableIndex(
            merged.hairIndex
          ),

    hairColor:
      String(
        merged.hairColor ||
          "#2b1d16"
      ),

    beardStyle,

    beardIndex:
      beardStyle === "none"
        ? null
        : normalizeNullableIndex(
            merged.beardIndex
          ),

    beardColor:
      String(
        merged.beardColor ||
          merged.hairColor ||
          "#2b1d16"
      ),
  };
}

function makeAppearanceKey(
  appearance = {}
) {
  return JSON.stringify(
    normalizeAppearance(
      appearance
    )
  );
}

export function getPlayerSheetRecord(
  appearance = {}
) {
  const merged =
    normalizeAppearance(
      appearance
    );

  const key =
    makeAppearanceKey(
      merged
    );

  if (
    runtimeSheetCache.has(
      key
    )
  ) {
    return runtimeSheetCache.get(
      key
    );
  }

  const record = {
    key,
    status: "pending",
    canvas: null,
    error: null,
    promise: null,
  };

  const skinTone =
    getSkinToneById(
      merged.skinToneId
    ) ||
    getSkinToneById(
      "light_neutral_1"
    ) || {
      id: "light_neutral_1",
      base: "#ddb59a",
      ear: "#c99f85",
      dark: "#9e715a",
      light: "#efc7ad",
    };

  record.promise =
    composeSpriteSheet({
      skinTone,

      eyeColor:
        merged.eyeColor,

      hairStyle:
        merged.hairStyle,

      hairIndex:
        merged.hairIndex,

      hairColor:
        merged.hairColor,

      beardStyle:
        merged.beardStyle,

      beardIndex:
        merged.beardIndex,

      beardColor:
        merged.beardColor,
    })
      .then((canvas) => {
        record.status =
          "ready";

        record.canvas =
          canvas;

        record.error =
          null;

        return canvas;
      })
      .catch((error) => {
        record.status =
          "error";

        record.canvas =
          null;

        record.error =
          error;

        console.error(
          "[playerSheetRuntime] composeSpriteSheet failed:",
          error
        );

        return null;
      });

  runtimeSheetCache.set(
    key,
    record
  );

  return record;
}

export function clearPlayerSheetRuntimeCache() {
  runtimeSheetCache.clear();
}