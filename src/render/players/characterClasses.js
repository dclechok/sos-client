/**
 * characterClasses.js
 *
 * Single source of truth for all playable character classes.
 * The `id` field is what gets stored in the database under the character's `class` field.
 * The `sprite` field is the path to the GIF used in PlayerRenderer.
 *
 * To add a new class: add an entry here. Everything else pulls from this file.
 */

export const CHARACTER_CLASSES = [
  {
    id: "adept_necromancer",
    label: "Adept Necromancer",
    sprite: "/art/items/sprites/AdeptNecromancer.gif",
    description: "Commands the dead and bends dark magic to their will.",
    role: "Caster",
  },
  {
    id: "corrupted_treant",
    label: "Corrupted Treant",
    sprite: "/art/items/sprites/CorruptedTreant.gif",
    description: "An ancient forest guardian twisted by shadow rot.",
    role: "Tank",
  },
  {
    id: "deft_sorceress",
    label: "Deft Sorceress",
    sprite: "/art/items/sprites/DeftSorceress.gif",
    description: "Swift and precise, weaving spells with lethal grace.",
    role: "Caster",
  },
  {
    id: "novice_pyromancer",
    label: "Novice Pyromancer",
    sprite: "/art/items/sprites/NovicePyromancer.gif",
    description: "Still learning to control the fire that burns within.",
    role: "Caster",
  },
  {
    id: "vile_witch",
    label: "Vile Witch",
    sprite: "/art/items/sprites/VileWitch.gif",
    description: "A practitioner of forbidden curses and hex-craft.",
    role: "Support",
  },
];

/**
 * Map legacy DB values (old class names) -> new ids.
 * This keeps EXISTING characters working without a DB migration.
 */
const LEGACY_CLASS_MAP = {
  // Old DB values -> new ids (edit these to match your actual legacy classes)
  Nullmancer: "adept_necromancer",
  Scavenger: "novice_pyromancer",
};

/**
 * Normalize any stored class value to a modern class id.
 * - If it's a legacy name, map it.
 * - Otherwise return as-is.
 */
export function normalizeClassId(classId) {
  const raw = String(classId || "").trim();
  if (!raw) return "";
  return LEGACY_CLASS_MAP[raw] || raw;
}

/**
 * Look up a class definition by its id string (as stored in DB),
 * supporting legacy values via normalizeClassId().
 *
 * Usage:
 *   const cls = getClassById(character.class);
 *   <img src={cls?.sprite} />
 */
export function getClassById(classId) {
  const norm = normalizeClassId(classId);
  return CHARACTER_CLASSES.find((c) => c.id === norm);
}

/**
 * Get just the sprite path for a given class id (or legacy class string).
 * Falls back to a default sprite if the class isn't recognized.
 */
export function getSpriteByClassId(
  classId,
  fallback = "/art/items/sprites/NovicePyromancer.gif"
) {
  return getClassById(classId)?.sprite ?? fallback;
}