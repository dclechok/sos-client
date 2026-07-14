import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import "./styles/CharacterCreation.css";

import {
  createCharacter,
} from "./api/characterApi";

import {
  CHARACTER_CLASSES,
} from "./render/players/characterClasses";

import CharacterSpritePreview from "./render/players/characterSpritePreview";

import {
  EYE_COLORS,
  SKIN_TONES,
  getSkinToneById,
} from "./utils/palletes";

import CharacterAppearance, {
  getBeardStyleById,
  getHairStyleById,
} from "./CharacterAppearance";

const HAIR_STYLE_COUNT = 8;
const BEARD_STYLE_COUNT = 1;

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

/*
 * Natural-looking fallback eye colors.
 * Your EYE_COLORS palette is preferred when available.
 */
const NATURAL_EYE_COLORS = [
  "#3b271b",
  "#4a3022",
  "#5a3b28",
  "#6b4a2d",
  "#755538",
  "#4b5142",
  "#52604d",
  "#51636b",
  "#465966",
  "#647176",
  "#6c7355",
  "#70634f",
];

/*
 * Natural-looking hair colors.
 * Avoids neon, highly saturated, and unrealistic colors.
 */
const NATURAL_HAIR_COLORS = [
  "#171312",
  "#211816",
  "#2b1d16",
  "#352319",
  "#422a1c",
  "#503322",
  "#61402a",
  "#704b30",
  "#805938",
  "#936845",
  "#a97852",
  "#b88962",
  "#c59b71",
  "#d0ad82",
  "#8a6f5b",
  "#6b5a50",
  "#554a45",
  "#3e3835",
  "#b7aea4",
  "#d1c8bc",
];

/*
 * Slight variations make randomized beard colors
 * feel related to the hair without always being identical.
 */
const BEARD_COLOR_VARIATIONS = [
  0,
  -12,
  -6,
  8,
  14,
];

function randomItem(items) {
  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return null;
  }

  return items[
    Math.floor(
      Math.random() *
        items.length
    )
  ];
}

function randomInteger(
  minimum,
  maximum
) {
  const min =
    Math.ceil(minimum);

  const max =
    Math.floor(maximum);

  return Math.floor(
    Math.random() *
      (max - min + 1)
  ) + min;
}

function clampColorChannel(value) {
  return Math.max(
    0,
    Math.min(
      255,
      Math.round(value)
    )
  );
}

function adjustHexBrightness(
  hex,
  amount
) {
  const clean =
    String(hex || "")
      .replace("#", "")
      .trim();

  if (
    !/^[0-9a-fA-F]{6}$/.test(
      clean
    )
  ) {
    return "#2b1d16";
  }

  const red =
    parseInt(
      clean.slice(0, 2),
      16
    );

  const green =
    parseInt(
      clean.slice(2, 4),
      16
    );

  const blue =
    parseInt(
      clean.slice(4, 6),
      16
    );

  return (
    "#" +
    [
      clampColorChannel(
        red + amount
      ),
      clampColorChannel(
        green + amount
      ),
      clampColorChannel(
        blue + amount
      ),
    ]
      .map((channel) =>
        channel
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  );
}

function getRandomEyeColor() {
  const paletteColors =
    Array.isArray(EYE_COLORS)
      ? EYE_COLORS
          .map(
            (entry) =>
              entry?.value
          )
          .filter(Boolean)
      : [];

  return (
    randomItem(
      paletteColors.length
        ? paletteColors
        : NATURAL_EYE_COLORS
    ) || "#3b271b"
  );
}

function getRandomHairStyleId() {
  /*
   * Approximately 15% chance of no hair.
   */
  if (Math.random() < 0.15) {
    return "none";
  }

  const index =
    randomInteger(
      0,
      HAIR_STYLE_COUNT - 1
    );

  return `hair-${index}`;
}

function getRandomBeardStyleId() {
  /*
   * Approximately 55% chance of no beard.
   * Increase this number if you want beards
   * to appear less frequently.
   */
  if (Math.random() < 0.55) {
    return "none";
  }

  const index =
    randomInteger(
      0,
      BEARD_STYLE_COUNT - 1
    );

  return `beard-${index}`;
}

export default function CharacterCreation({
  account,
  onCreated,
  onCancel,
}) {
  const [
    charName,
    setCharName,
  ] = useState("");

  const [
    classId,
    setClassId,
  ] = useState(
    CHARACTER_CLASSES[0]?.id ||
      ""
  );

  const [
    skinToneId,
    setSkinToneId,
  ] = useState(
    SKIN_TONES[2]?.id ||
      SKIN_TONES[0]?.id ||
      ""
  );

  const [
    eyeColor,
    setEyeColor,
  ] = useState(
    EYE_COLORS[0]?.value ||
      "#3b271b"
  );

  const [
    hairStyle,
    setHairStyle,
  ] = useState("none");

  const [
    hairColor,
    setHairColor,
  ] = useState("#2b1d16");

  const [
    beardStyle,
    setBeardStyle,
  ] = useState("none");

  const [
    beardColor,
    setBeardColor,
  ] = useState("#2b1d16");

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    err,
    setErr,
  ] = useState("");

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

  const selectedClass =
    useMemo(() => {
      return (
        CHARACTER_CLASSES.find(
          (
            characterClass
          ) =>
            characterClass.id ===
            classId
        ) ||
        CHARACTER_CLASSES[0]
      );
    }, [classId]);

  const selectedStats =
    selectedClass?.stats ||
    DEFAULT_STATS;

  const selectedSkinTone =
    useMemo(() => {
      return (
        getSkinToneById(
          skinToneId
        ) ||
        SKIN_TONES[0]
      );
    }, [skinToneId]);

  const selectedHairStyle =
    useMemo(() => {
      return getHairStyleById(
        hairStyle
      );
    }, [hairStyle]);

  const selectedBeardStyle =
    useMemo(() => {
      return getBeardStyleById(
        beardStyle
      );
    }, [beardStyle]);

  const sanitizedName =
    useMemo(() => {
      return String(
        charName || ""
      )
        .replace(
          /[^a-zA-Z0-9 _'-]/g,
          ""
        )
        .replace(
          /\s+/g,
          " "
        )
        .trim()
        .slice(0, 16);
    }, [charName]);

  const canSubmit =
    Boolean(
      (account?.id ||
        account?._id) &&
        account?.token &&
        sanitizedName.length >=
          3 &&
        classId &&
        !busy
    );

  const randomizeCharacter =
    useCallback(() => {
      if (busy) {
        return;
      }

      setErr("");

      const randomSkinTone =
        randomItem(
          SKIN_TONES
        );

      if (
        randomSkinTone?.id
      ) {
        setSkinToneId(
          randomSkinTone.id
        );
      }

      setEyeColor(
        getRandomEyeColor()
      );

      const nextHairStyle =
        getRandomHairStyleId();

      const nextHairColor =
        randomItem(
          NATURAL_HAIR_COLORS
        ) || "#2b1d16";

      setHairStyle(
        nextHairStyle
      );

      setHairColor(
        nextHairColor
      );

      const nextBeardStyle =
        getRandomBeardStyleId();

      setBeardStyle(
        nextBeardStyle
      );

      if (
        nextBeardStyle ===
        "none"
      ) {
        setBeardColor(
          nextHairColor
        );
      } else {
        /*
         * Most randomized beards match the hair.
         * Some are slightly lighter or darker.
         */
        const brightnessChange =
          randomItem(
            BEARD_COLOR_VARIATIONS
          ) ?? 0;

        setBeardColor(
          adjustHexBrightness(
            nextHairColor,
            brightnessChange
          )
        );
      }

      const randomClass =
        randomItem(
          CHARACTER_CLASSES
        );

      if (
        randomClass?.id
      ) {
        setClassId(
          randomClass.id
        );
      }
    }, [busy]);

  const submit =
    useCallback(
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

                  beardStyle:
                    selectedBeardStyle.id,

                  beardIndex:
                    selectedBeardStyle.beardIndex,

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
        canSubmit,
        classId,
        eyeColor,
        hairColor,
        onCreated,
        sanitizedName,
        selectedBeardStyle,
        selectedHairStyle,
        skinToneId,
      ]
    );

  useEffect(() => {
    function handleKeyDown(
      event
    ) {
      if (
        event.key === "Enter"
      ) {
        event.preventDefault();
        submit();
        return;
      }

      if (
        event.key === "Escape"
      ) {
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
  }, [
    onCancel,
    submit,
  ]);

  return (
    <div
      className="cc-overlay"
      onMouseDown={(
        event
      ) =>
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
          <div className="cc-header-main">
            <div>
              <div
                id="character-creation-title"
                className="cc-title"
              >
                Create Your Vessel
              </div>

              <div className="cc-sub">
                Shape your form. Choose your path. Enter the world.
              </div>
            </div>

            <button
              type="button"
              className="cc-randomize-btn"
              onClick={randomizeCharacter}
              disabled={busy}
              title="Generate a random appearance and class"
            >
              <span className="cc-randomize-icon">↻</span>
              Randomize
            </button>
          </div>
        </header>

        <div className="cc-body">
          <aside className="cc-preview">
            <div className="cc-portrait">
              <CharacterSpritePreview
                skinTone={
                  selectedSkinTone
                }
                eyeColor={
                  eyeColor
                }
                hairColor={
                  hairColor
                }
                hairIndex={
                  selectedHairStyle
                    .hairIndex ?? 0
                }
                showHair={
                  selectedHairStyle
                    .hairIndex !==
                  null
                }
                beardColor={
                  beardColor
                }
                beardIndex={
                  selectedBeardStyle
                    .beardIndex ?? 0
                }
                showBeard={
                  selectedBeardStyle
                    .beardIndex !==
                  null
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
              onChange={(
                event
              ) =>
                setCharName(
                  event.target
                    .value
                )
              }
              placeholder="e.g. Mourne, Selvek, Ithara..."
              maxLength={32}
              autoFocus
            />

            <div className="cc-hint">
              3–16 characters.
              Letters, numbers,
              spaces, apostrophe, and
              hyphen.
            </div>

            <div className="cc-divider" />

            <CharacterAppearance
              skinToneId={
                skinToneId
              }
              setSkinToneId={
                setSkinToneId
              }
              eyeColor={
                eyeColor
              }
              setEyeColor={
                setEyeColor
              }
              hairStyle={
                hairStyle
              }
              setHairStyle={
                setHairStyle
              }
              hairColor={
                hairColor
              }
              setHairColor={
                setHairColor
              }
              beardStyle={
                beardStyle
              }
              setBeardStyle={
                setBeardStyle
              }
              beardColor={
                beardColor
              }
              setBeardColor={
                setBeardColor
              }
            />

            <div className="cc-label">
              Class
            </div>

            <div className="cc-class-grid">
              {CHARACTER_CLASSES.map(
                (
                  characterClass
                ) => {
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

