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
  { id: "brown_dark", name: "Dark Brown", value: "#3b271b" },
  { id: "brown", name: "Brown", value: "#5a3b2b" },
  { id: "hazel", name: "Hazel", value: "#7a6a3a" },
  { id: "green", name: "Green", value: "#4d6b45" },
  { id: "gray", name: "Gray", value: "#6f737a" },
  { id: "blue_gray", name: "Blue Gray", value: "#6a8094" },
  { id: "blue", name: "Blue", value: "#4f73a8" },
  { id: "amber", name: "Amber", value: "#9a6c26" },
];

export function getSkinToneById(id) {
  return SKIN_TONES.find((s) => s.id === id) || SKIN_TONES[2];
}