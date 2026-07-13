export const SKIN_TONES = [
  {
    id: "fair_cool_1",
    name: "Fair Cool",
    base: "#f2d7c9",
    ear: "#f6dfd3",
    dark: "#c7a08d",
    light: "#ffe9df",
  },
  {
    id: "fair_warm_1",
    name: "Fair Warm",
    base: "#efcdb7",
    ear: "#f4d8c5",
    dark: "#c59a7d",
    light: "#ffe4d1",
  },
  {
    id: "light_neutral_1",
    name: "Light Neutral",
    base: "#ddb59a",
    ear: "#e7c1a9",
    dark: "#b18061",
    light: "#f0ccb7",
  },
  {
    id: "light_warm_2",
    name: "Light Warm",
    base: "#cf9f7d",
    ear: "#dbb08f",
    dark: "#9f6d4c",
    light: "#e6bc9c",
  },
  {
    id: "medium_neutral_1",
    name: "Medium Neutral",
    base: "#bb8662",
    ear: "#c99675",
    dark: "#895a3d",
    light: "#d8aa87",
  },
  {
    id: "tan_warm_1",
    name: "Tan Warm",
    base: "#a9724d",
    ear: "#b98361",
    dark: "#74482d",
    light: "#c4906f",
  },
  {
    id: "brown_neutral_1",
    name: "Brown Neutral",
    base: "#8a5a3c",
    ear: "#996b4d",
    dark: "#5f3925",
    light: "#ac7858",
  },
  {
    id: "deep_brown_1",
    name: "Deep Brown",
    base: "#6b422d",
    ear: "#7c523b",
    dark: "#442719",
    light: "#8b6148",
  },
  {
    id: "deep_brown_2",
    name: "Deep Brown 2",
    base: "#523224",
    ear: "#634033",
    dark: "#311b13",
    light: "#734f40",
  },
];

export const EYE_COLORS = [
  // Browns
  {
    id: "brown_near_black",
    name: "Near Black Brown",
    value: "#241915",
  },
  {
    id: "brown_deep",
    name: "Deep Brown",
    value: "#35231c",
  },

  // Hazel and amber
  {
    id: "hazel_dark",
    name: "Dark Hazel",
    value: "#5a4c2b",
  },
  {
    id: "hazel",
    name: "Hazel",
    value: "#6d5d32",
  },
  {
    id: "hazel_golden",
    name: "Golden Hazel",
    value: "#7b6937",
  },
  {
    id: "amber_muted",
    name: "Muted Amber",
    value: "#77512c",
  },

  // Greens
  {
    id: "olive_dark",
    name: "Dark Olive",
    value: "#3f4a31",
  },
  {
    id: "olive",
    name: "Olive",
    value: "#536044",
  },
  {
    id: "green_hazel",
    name: "Green Hazel",
    value: "#59654a",
  },
  {
    id: "green_soft",
    name: "Soft Green",
    value: "#4e6952",
  },
  {
    id: "green_grey",
    name: "Green Grey",
    value: "#586b61",
  },

  // Blues
  {
    id: "blue_deep",
    name: "Deep Blue",
    value: "#354b61",
  },
  {
    id: "blue_grey",
    name: "Blue Grey",
    value: "#526879",
  },
  {
    id: "blue_soft",
    name: "Soft Blue",
    value: "#587389",
  },
  {
    id: "blue_slate",
    name: "Slate Blue",
    value: "#4d6074",
  },
  {
    id: "blue_ice_muted",
    name: "Muted Ice Blue",
    value: "#6f8797",
  },

  // Greys
  {
    id: "grey_dark",
    name: "Dark Grey",
    value: "#4a5054",
  },
  {
    id: "grey_steel",
    name: "Steel Grey",
    value: "#5f6970",
  },
  {
    id: "grey_light",
    name: "Light Grey",
    value: "#788086",
  },

  // Fantasy colors, still muted
  {
    id: "violet_grey",
    name: "Violet Grey",
    value: "#625b78",
  },
  {
    id: "violet_soft",
    name: "Soft Violet",
    value: "#6e5f82",
  },
  {
    id: "plum_muted",
    name: "Muted Plum",
    value: "#60465f",
  },
];

export function getSkinToneById(id) {
  return SKIN_TONES.find((skinTone) => skinTone.id === id) || SKIN_TONES[2];
}