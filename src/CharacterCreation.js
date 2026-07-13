import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import "./styles/CharacterCreation.css";

import { createCharacter } from "./api/characterApi";
import { CHARACTER_CLASSES } from "./render/players/characterClasses";
import CharacterSpritePreview from "./render/players/characterSpritePreview";

import {
  EYE_COLORS,
  SKIN_TONES,
  getSkinToneById,
} from "./utils/palletes";

/*
 * Change this to the number of hairstyles contained in
 * Sprite-0001-hair.png.
 *
 * Each hairstyle must occupy one horizontal 32x32 block:
 *
 * Style 1 | Style 2 | Style 3 | Style 4
 */
const HAIR_STYLE_COUNT = 8;

const HAIR_STYLES = [
  {
    id: "none",
    label: "None",
    hairIndex: null,
  },
  ...Array.from(
    { length: HAIR_STYLE_COUNT },
    (_, index) => ({
      id: `hair-${index}`,
      label: `Style ${index + 1}`,
      hairIndex: index,
    })
  ),
];

const HAIR_COLORS = [
  "#161616",
  "#241c18",
  "#2b1d16",
  "#3a2a20",
  "#4a3326",
  "#5a4331",
  "#6a503a",
  "#8a6847",
  "#a37a52",
  "#b88b5e",
  "#c9b37e",
  "#d4d4d4",
];

const DEFAULT_STATS = {
  strength: 5,
  dexterity: 5,
  vitality: 5,
  perception: 5,
  intelligence: 5,
  luck: 5,
};

const STAT_LABELS = {
  strength: "Strength",
  dexterity: "Dexterity",
  vitality: "Vitality",
  perception: "Perception",
  intelligence: "Intelligence",
  luck: "Luck",
};

function SwatchPicker({
  options,
  value,
  onChange,
  label,
  className = "",
}) {
  return (
    <div
      className={`cc-swatch-strip ${className}`.trim()}
      role="group"
      aria-label={label}
    >
      {options.map((option) => {
        const isString = typeof option === "string";

        const color = isString
          ? option
          : option.value;

        const id = isString
          ? option
          : option.id;

        const optionLabel = isString
          ? option
          : option.name ||
            option.label ||
            option.id;

        const active = color === value;

        return (
          <button
            key={id}
            type="button"
            className={`cc-swatch-dot ${
              active ? "is-active" : ""
            }`}
            style={{
              "--swatch": color,
            }}
            onClick={() => onChange(color)}
            title={optionLabel}
            aria-label={optionLabel}
            aria-pressed={active}
          />
        );
      })}
    </div>
  );
}

function getHairStyleById(styleId) {
  return (
    HAIR_STYLES.find(
      (style) => style.id === styleId
    ) || HAIR_STYLES[0]
  );
}

export default function CharacterCreation({
  account,
  onCreated,
  onCancel,
}) {
  const [charName, setCharName] =
    useState("");

  const [classId, setClassId] = useState(
    CHARACTER_CLASSES[0]?.id || ""
  );

  const [skinToneId, setSkinToneId] =
    useState(
      SKIN_TONES[2]?.id ||
        SKIN_TONES[0]?.id ||
        ""
    );

  const [eyeColor, setEyeColor] =
    useState(
      EYE_COLORS[0]?.value || "#3b271b"
    );

  const [hairStyle, setHairStyle] =
    useState("none");

  const [hairColor, setHairColor] =
    useState("#2b1d16");

  const [beardStyle, setBeardStyle] =
    useState("none");

  const [beardColor, setBeardColor] =
    useState("#2b1d16");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (
      !classId &&
      CHARACTER_CLASSES[0]?.id
    ) {
      setClassId(
        CHARACTER_CLASSES[0].id
      );
    }
  }, [classId]);

  const selectedClass = useMemo(() => {
    return (
      CHARACTER_CLASSES.find(
        (characterClass) =>
          characterClass.id === classId
      ) || CHARACTER_CLASSES[0]
    );
  }, [classId]);

  const selectedStats =
    selectedClass?.stats ||
    DEFAULT_STATS;

  const selectedSkinTone = useMemo(() => {
    return (
      getSkinToneById(skinToneId) ||
      SKIN_TONES[0]
    );
  }, [skinToneId]);

  const selectedHairStyle =
    useMemo(() => {
      return getHairStyleById(
        hairStyle
      );
    }, [hairStyle]);

  const sanitizedName = useMemo(() => {
    return String(charName || "")
      .replace(
        /[^a-zA-Z0-9 _'-]/g,
        ""
      )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 16);
  }, [charName]);

  const canSubmit = Boolean(
    account?.id &&
      account?.token &&
      sanitizedName.length >= 3 &&
      classId &&
      !busy
  );

  const submit = useCallback(
    async () => {
      if (!canSubmit) {
        return;
      }

      setErr("");
      setBusy(true);

      try {
        const created =
          await createCharacter(
            account,
            account.token,
            {
              charName:
                sanitizedName,

              classId,

              appearance: {
                skinToneId,
                eyeColor,

                hairStyle:
                  selectedHairStyle.id,

                hairIndex:
                  selectedHairStyle.hairIndex,

                hairColor,

                beardStyle,
                beardColor,
              },
            }
          );

        onCreated?.(
          created?.character ||
            created
        );
      } catch (error) {
        setErr(
          String(
            error?.message ||
              "Failed to create character."
          )
        );
      } finally {
        setBusy(false);
      }
    },
    [
      account,
      beardColor,
      beardStyle,
      canSubmit,
      classId,
      eyeColor,
      hairColor,
      onCreated,
      sanitizedName,
      selectedHairStyle,
      skinToneId,
    ]
  );

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Enter") {
        event.preventDefault();
        submit();
        return;
      }

      if (event.key === "Escape") {
        onCancel?.();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [onCancel, submit]);

  return (
    <div
      className="cc-overlay"
      onMouseDown={(event) =>
        event.stopPropagation()
      }
    >
      <div
        className="cc-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="character-creation-title"
      >
        <header className="cc-header">
          <div
            id="character-creation-title"
            className="cc-title"
          >
            Create Your Vessel
          </div>

          <div className="cc-sub">
            Shape your form. Choose
            your path. Enter the world.
          </div>
        </header>

        <div className="cc-body">
          <aside className="cc-preview">
            <div className="cc-portrait">
              <CharacterSpritePreview
                skinTone={
                  selectedSkinTone
                }
                eyeColor={eyeColor}
                hairColor={hairColor}
                hairIndex={
                  selectedHairStyle
                    .hairIndex ?? 0
                }
                showHair={
                  selectedHairStyle
                    .hairIndex !== null
                }
                scale={4}
              />
            </div>

            <div className="cc-preview-meta">
              <div className="cc-preview-name">
                {sanitizedName ||
                  "Unnamed Vessel"}
              </div>

              <div className="cc-preview-class">
                {selectedClass?.label ||
                  "Unknown Class"}
              </div>

              <div className="cc-preview-role">
                {selectedClass?.role
                  ? `Role: ${selectedClass.role}`
                  : ""}
              </div>
            </div>

            {selectedClass?.description && (
              <div className="cc-preview-desc">
                {
                  selectedClass.description
                }
              </div>
            )}

            <div className="cc-stats-panel">
              <div className="cc-stats-title">
                Starting Attributes
              </div>

              <div className="cc-stats-grid">
                {Object.entries(
                  STAT_LABELS
                ).map(
                  ([
                    statKey,
                    statLabel,
                  ]) => (
                    <div
                      key={statKey}
                      className="cc-stat-row"
                    >
                      <span className="cc-stat-label">
                        {statLabel}
                      </span>

                      <span className="cc-stat-value">
                        {selectedStats[
                          statKey
                        ] ??
                          DEFAULT_STATS[
                            statKey
                          ]}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </aside>

          <section className="cc-form">
            <label
              className="cc-label"
              htmlFor="character-name"
            >
              Name
            </label>

            <input
              id="character-name"
              className="cc-input"
              value={charName}
              onChange={(event) =>
                setCharName(
                  event.target.value
                )
              }
              placeholder="e.g. Mourne, Selvek, Ithara..."
              maxLength={32}
              autoFocus
            />

            <div className="cc-hint">
              3–16 characters. Letters,
              numbers, spaces, apostrophe,
              and hyphen.
            </div>

            <div className="cc-divider" />

            <div className="cc-label">
              Skin Tone
            </div>

            <div
              className="cc-swatch-strip"
              role="group"
              aria-label="Skin tone"
            >
              {SKIN_TONES.map(
                (tone) => {
                  const active =
                    tone.id ===
                    skinToneId;

                  return (
                    <button
                      key={tone.id}
                      type="button"
                      className={`cc-swatch-dot ${
                        active
                          ? "is-active"
                          : ""
                      }`}
                      style={{
                        "--swatch":
                          tone.base,
                      }}
                      onClick={() =>
                        setSkinToneId(
                          tone.id
                        )
                      }
                      title={tone.name}
                      aria-label={
                        tone.name
                      }
                      aria-pressed={
                        active
                      }
                    />
                  );
                }
              )}
            </div>

            <div className="cc-divider" />

            <div className="cc-label">
              Eye Color
            </div>

            <SwatchPicker
              options={EYE_COLORS}
              value={eyeColor}
              onChange={setEyeColor}
              label="Eye color"
            />

            <div className="cc-divider" />

            <label
              className="cc-label"
              htmlFor="hair-style"
            >
              Hair
            </label>

            <select
              id="hair-style"
              className="cc-input cc-select"
              value={hairStyle}
              onChange={(event) =>
                setHairStyle(
                  event.target.value
                )
              }
            >
              {HAIR_STYLES.map(
                (style) => (
                  <option
                    key={style.id}
                    value={style.id}
                  >
                    {style.label}
                  </option>
                )
              )}
            </select>

            <div className="cc-label cc-label-spaced">
              Hair Color
            </div>

            <SwatchPicker
              options={HAIR_COLORS}
              value={hairColor}
              onChange={setHairColor}
              label="Hair color"
            />

            <label
              className="cc-label cc-label-spaced"
              htmlFor="beard-style"
            >
              Beard
            </label>

            <select
              id="beard-style"
              className="cc-input cc-select"
              value={beardStyle}
              onChange={(event) =>
                setBeardStyle(
                  event.target.value
                )
              }
            >
              <option value="none">
                None
              </option>
            </select>

            <div className="cc-label cc-label-spaced">
              Beard Color
            </div>

            <SwatchPicker
              options={HAIR_COLORS}
              value={beardColor}
              onChange={setBeardColor}
              label="Beard color"
            />

            <div className="cc-divider" />

            <div className="cc-label">
              Class
            </div>

            <div className="cc-class-grid">
              {CHARACTER_CLASSES.map(
                (characterClass) => {
                  const active =
                    characterClass.id ===
                    classId;

                  return (
                    <button
                      key={
                        characterClass.id
                      }
                      type="button"
                      className={`cc-class ${
                        active
                          ? "is-active"
                          : ""
                      }`}
                      onClick={() =>
                        setClassId(
                          characterClass.id
                        )
                      }
                      aria-pressed={
                        active
                      }
                    >
                      <div className="cc-class-top">
                        <div className="cc-class-name">
                          {
                            characterClass.label
                          }
                        </div>

                        <div className="cc-class-role">
                          {
                            characterClass.role
                          }
                        </div>
                      </div>

                      <div className="cc-class-desc">
                        {
                          characterClass.description
                        }
                      </div>
                    </button>
                  );
                }
              )}
            </div>

            {err && (
              <div
                className="cc-error"
                role="alert"
              >
                {err}
              </div>
            )}
          </section>
        </div>

        <footer className="cc-footer">
          <button
            type="button"
            className="cc-btn cc-btn-ghost"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>

          <button
            type="button"
            className="cc-btn cc-btn-primary"
            onClick={submit}
            disabled={!canSubmit}
            title={
              !canSubmit
                ? "Enter a name and pick a class"
                : "Create character"
            }
          >
            {busy
              ? "Binding..."
              : "Create Character"}
          </button>
        </footer>
      </div>
    </div>
  );
}