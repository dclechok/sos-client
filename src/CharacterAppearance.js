import {
  useEffect,
  useState,
} from "react";

import { SKIN_TONES } from "./utils/palletes";

import {
  createColorFromHsl,
  hexToHsl,
} from "./characterColorUtils";

const HAIR_STYLE_COUNT = 8;
const BEARD_STYLE_COUNT = 1;

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

const BEARD_STYLES = [
  {
    id: "none",
    label: "None",
    beardIndex: null,
  },

  ...Array.from(
    { length: BEARD_STYLE_COUNT },
    (_, index) => ({
      id: `beard-${index}`,
      label: `Style ${index + 1}`,
      beardIndex: index,
    })
  ),
];

function ColorSlider({
  label,
  value,
  min,
  max,
  leftLabel,
  rightLabel,
  onChange,
}) {
  return (
    <div className="cc-slider-field">
      <div className="cc-slider-header">
        <span>{label}</span>

        <span className="cc-slider-value">
          {value}
        </span>
      </div>

      <input
        className="cc-slider"
        type="range"
        min={min}
        max={max}
        step="1"
        value={value}
        onChange={(event) =>
          onChange(
            Number(event.target.value)
          )
        }
      />

      <div className="cc-slider-labels">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}

function ColorControls({
  color,
  settings,
  onChange,
}) {
  return (
    <div className="cc-color-controls">
      <div
        className="cc-color-result"
        style={{
          "--selected-color": color,
        }}
      >
        <span className="cc-color-result-dot" />

        <code>{color}</code>
      </div>

      <ColorSlider
        label="Hue"
        value={settings.hue}
        min={0}
        max={360}
        leftLabel="0°"
        rightLabel="360°"
        onChange={(hue) =>
          onChange({ hue })
        }
      />

      <ColorSlider
        label="Saturation"
        value={settings.saturation}
        min={0}
        max={100}
        leftLabel="Gray"
        rightLabel="Vivid"
        onChange={(saturation) =>
          onChange({ saturation })
        }
      />

      <ColorSlider
        label="Brightness"
        value={settings.lightness}
        min={0}
        max={100}
        leftLabel="Black"
        rightLabel="White"
        onChange={(lightness) =>
          onChange({ lightness })
        }
      />
    </div>
  );
}

export function getHairStyleById(styleId) {
  return (
    HAIR_STYLES.find(
      (style) =>
        style.id === styleId
    ) || HAIR_STYLES[0]
  );
}

export function getBeardStyleById(styleId) {
  return (
    BEARD_STYLES.find(
      (style) =>
        style.id === styleId
    ) || BEARD_STYLES[0]
  );
}

export default function CharacterAppearance({
  skinToneId,
  setSkinToneId,

  eyeColor,
  setEyeColor,

  hairStyle,
  setHairStyle,

  hairColor,
  setHairColor,

  beardStyle,
  setBeardStyle,

  beardColor,
  setBeardColor,
}) {
  const [eyeSettings, setEyeSettings] =
    useState(() =>
      hexToHsl(
        eyeColor || "#3b271b"
      )
    );

  const [hairSettings, setHairSettings] =
    useState(() =>
      hexToHsl(
        hairColor || "#2b1d16"
      )
    );

  const [
    beardSettings,
    setBeardSettings,
  ] = useState(() =>
    hexToHsl(
      beardColor || "#2b1d16"
    )
  );

  const [matchHair, setMatchHair] =
    useState(true);

  const hasBeard =
    getBeardStyleById(
      beardStyle
    ).beardIndex !== null;

  const updateEyeSettings = (patch) => {
    setEyeSettings((current) => ({
      ...current,
      ...patch,
    }));
  };

  const updateHairSettings = (patch) => {
    setHairSettings((current) => ({
      ...current,
      ...patch,
    }));
  };

  const updateBeardSettings = (patch) => {
    setBeardSettings((current) => ({
      ...current,
      ...patch,
    }));
  };

  useEffect(() => {
    setEyeColor(
      createColorFromHsl(
        eyeSettings
      )
    );
  }, [
    eyeSettings,
    setEyeColor,
  ]);

  useEffect(() => {
    setHairColor(
      createColorFromHsl(
        hairSettings
      )
    );
  }, [
    hairSettings,
    setHairColor,
  ]);

  useEffect(() => {
    if (matchHair) {
      setBeardColor(hairColor);
      return;
    }

    setBeardColor(
      createColorFromHsl(
        beardSettings
      )
    );
  }, [
    beardSettings,
    hairColor,
    matchHair,
    setBeardColor,
  ]);

  return (
    <>
      <div className="cc-label">
        Skin Tone
      </div>

      <div
        className="cc-swatch-strip"
        role="group"
        aria-label="Skin tone"
      >
        {SKIN_TONES.map((tone) => {
          const active =
            tone.id === skinToneId;

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
                "--swatch": tone.base,
              }}
              onClick={() =>
                setSkinToneId(
                  tone.id
                )
              }
              title={tone.name}
              aria-label={tone.name}
              aria-pressed={active}
            />
          );
        })}
      </div>

      <div className="cc-divider" />

      <div className="cc-label">
        Eye Color
      </div>

      <ColorControls
        color={eyeColor}
        settings={eyeSettings}
        onChange={
          updateEyeSettings
        }
      />

      <div className="cc-divider" />

      <label
        className="cc-label"
        htmlFor="hair-style"
      >
        Hair Style
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

      <ColorControls
        color={hairColor}
        settings={hairSettings}
        onChange={
          updateHairSettings
        }
      />

      <div className="cc-divider" />

      <label
        className="cc-label"
        htmlFor="beard-style"
      >
        Beard Style
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
        {BEARD_STYLES.map(
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

      {hasBeard && (
        <>
          <label className="cc-checkbox-row">
            <input
              type="checkbox"
              checked={matchHair}
              onChange={(event) =>
                setMatchHair(
                  event.target.checked
                )
              }
            />

            <span>
              Match hair color
            </span>
          </label>

          {!matchHair && (
            <>
              <div className="cc-label cc-label-spaced">
                Beard Color
              </div>

              <ColorControls
                color={beardColor}
                settings={
                  beardSettings
                }
                onChange={
                  updateBeardSettings
                }
              />
            </>
          )}

          {matchHair && (
            <div
              className="cc-color-result"
              style={{
                "--selected-color":
                  beardColor,
              }}
            >
              <span className="cc-color-result-dot" />

              <code>{beardColor}</code>
            </div>
          )}
        </>
      )}

      <div className="cc-divider" />
    </>
  );
}