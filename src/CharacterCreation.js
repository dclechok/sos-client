import { useEffect, useMemo, useState, useCallback } from "react";
import "./styles/CharacterCreation.css";
import { CHARACTER_CLASSES } from "./render/players/characterClasses";
import { createCharacter } from "./api/characterApi";
import CharacterSpritePreview from "./render/players/CharacterSpritePreview";
import {
  SKIN_TONES,
  EYE_COLORS,
  getSkinToneById,
} from "./utils/palletes";

export default function CharacterCreation({ account, onCreated, onCancel }) {
  const [charName, setCharName] = useState("");
  const [classId, setClassId] = useState(CHARACTER_CLASSES[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [skinToneId, setSkinToneId] = useState(
    SKIN_TONES[2]?.id || "light_neutral_1"
  );
  const [eyeColor, setEyeColor] = useState(
    EYE_COLORS[0]?.value || "#3b271b"
  );

  const [hairStyle, setHairStyle] = useState("none");
  const [hairColor, setHairColor] = useState("#2b1d16");
  const [beardStyle, setBeardStyle] = useState("none");
  const [beardColor, setBeardColor] = useState("#2b1d16");

  useEffect(() => {
    if (!classId && CHARACTER_CLASSES[0]?.id) {
      setClassId(CHARACTER_CLASSES[0].id);
    }
  }, [classId]);

  const selectedClass = useMemo(() => {
    return CHARACTER_CLASSES.find((c) => c.id === classId) || CHARACTER_CLASSES[0];
  }, [classId]);

  const selectedStats = useMemo(() => {
    return selectedClass?.stats ?? {
      strength: 5,
      dexterity: 5,
      vitality: 5,
      perception: 5,
      intelligence: 5,
      luck: 5,
    };
  }, [selectedClass]);

  const selectedSkinTone = useMemo(() => {
    return getSkinToneById(skinToneId);
  }, [skinToneId]);

  const sanitizedName = useMemo(() => {
    return String(charName || "")
      .replace(/[^a-zA-Z0-9 _'-]/g, "")
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

  const submit = useCallback(async () => {
    setErr("");
    if (!canSubmit) return;

    try {
      setBusy(true);

      const created = await createCharacter(account, account.token, {
        charName: sanitizedName,
        classId,
        appearance: {
          skinToneId,
          eyeColor,
          hairStyle,
          hairColor,
          beardStyle,
          beardColor,
        },
      });

      onCreated?.(created);
    } catch (e) {
      setErr(String(e?.message || "Failed to create character"));
    } finally {
      setBusy(false);
    }
  }, [
    account,
    beardColor,
    beardStyle,
    canSubmit,
    classId,
    eyeColor,
    hairColor,
    hairStyle,
    onCreated,
    sanitizedName,
    skinToneId,
  ]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
      }
      if (e.key === "Escape") {
        onCancel?.();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submit, onCancel]);

  return (
    <div className="cc-overlay" onMouseDown={(e) => e.stopPropagation()}>
      <div className="cc-card">
        <div className="cc-header">
          <div className="cc-title">Create Your Vessel</div>
          <div className="cc-sub">
            Shape a body, choose a path, and bind your first form.
          </div>
        </div>

        <div className="cc-body">
          <div className="cc-preview">
            <div className="cc-portrait">
              <CharacterSpritePreview
                skinTone={selectedSkinTone}
                eyeColor={eyeColor}
                scale={4}
              />
            </div>

            <div className="cc-preview-meta">
              <div className="cc-preview-name">
                {sanitizedName || "Unnamed Vessel"}
              </div>
              <div className="cc-preview-class">
                {selectedClass?.label || "Unknown Class"}
              </div>
              <div className="cc-preview-role">
                {selectedClass?.role ? `Role: ${selectedClass.role}` : ""}
              </div>
            </div>

            {selectedClass?.description && (
              <div className="cc-preview-desc">{selectedClass.description}</div>
            )}

            <div className="cc-stats-panel">
              <div className="cc-stats-title">Starting Attributes</div>
              <div className="cc-stats-grid">
                <div className="cc-stat-row">
                  <span className="cc-stat-label">Strength</span>
                  <span className="cc-stat-value">{selectedStats.strength}</span>
                </div>
                <div className="cc-stat-row">
                  <span className="cc-stat-label">Dexterity</span>
                  <span className="cc-stat-value">{selectedStats.dexterity}</span>
                </div>
                <div className="cc-stat-row">
                  <span className="cc-stat-label">Vitality</span>
                  <span className="cc-stat-value">{selectedStats.vitality}</span>
                </div>
                <div className="cc-stat-row">
                  <span className="cc-stat-label">Perception</span>
                  <span className="cc-stat-value">{selectedStats.perception}</span>
                </div>
                <div className="cc-stat-row">
                  <span className="cc-stat-label">Intelligence</span>
                  <span className="cc-stat-value">{selectedStats.intelligence}</span>
                </div>
                <div className="cc-stat-row">
                  <span className="cc-stat-label">Luck</span>
                  <span className="cc-stat-value">{selectedStats.luck}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="cc-form">
            <label className="cc-label">Name</label>
            <input
              className="cc-input"
              value={charName}
              onChange={(e) => setCharName(e.target.value)}
              placeholder="e.g. Mourne, Selvek, Ithara..."
              maxLength={32}
              autoFocus
            />
            <div className="cc-hint">
              3–16 chars. Letters, numbers, spaces, apostrophe, hyphen.
            </div>

            <div className="cc-divider" />

            <label className="cc-label">Skin Tone</label>
            <div className="cc-swatch-grid">
              {SKIN_TONES.map((tone) => (
                <button
                  key={tone.id}
                  type="button"
                  className={"cc-swatch-btn " + (tone.id === skinToneId ? "is-active" : "")}
                  onClick={() => setSkinToneId(tone.id)}
                  title={tone.name}
                >
                  <span className="cc-swatch" style={{ background: tone.base }} />
                  <span className="cc-swatch-name">{tone.name}</span>
                </button>
              ))}
            </div>

            <div className="cc-divider" />

            <label className="cc-label">Eye Color</label>
            <div className="cc-swatch-grid">
              {EYE_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={"cc-swatch-btn " + (c.value === eyeColor ? "is-active" : "")}
                  onClick={() => setEyeColor(c.value)}
                  title={c.name}
                >
                  <span className="cc-swatch" style={{ background: c.value }} />
                  <span className="cc-swatch-name">{c.name}</span>
                </button>
              ))}
            </div>

            <div className="cc-divider" />

            <label className="cc-label">Hair</label>
            <select
              className="cc-input"
              value={hairStyle}
              onChange={(e) => setHairStyle(e.target.value)}
            >
              <option value="none">None</option>
            </select>

            <label className="cc-label cc-label-spaced">Hair Color</label>
            <input
              className="cc-color-input"
              type="color"
              value={hairColor}
              onChange={(e) => setHairColor(e.target.value)}
            />

            <label className="cc-label cc-label-spaced">Beard</label>
            <select
              className="cc-input"
              value={beardStyle}
              onChange={(e) => setBeardStyle(e.target.value)}
            >
              <option value="none">None</option>
            </select>

            <label className="cc-label cc-label-spaced">Beard Color</label>
            <input
              className="cc-color-input"
              type="color"
              value={beardColor}
              onChange={(e) => setBeardColor(e.target.value)}
            />

            <div className="cc-divider" />

            <label className="cc-label">Class</label>
            <div className="cc-class-grid">
              {CHARACTER_CLASSES.map((c) => {
                const active = c.id === classId;

                return (
                  <button
                    key={c.id}
                    type="button"
                    className={"cc-class " + (active ? "is-active" : "")}
                    onClick={() => setClassId(c.id)}
                  >
                    <div className="cc-class-top">
                      <div className="cc-class-name">{c.label}</div>
                      <div className="cc-class-role">{c.role}</div>
                    </div>
                    <div className="cc-class-desc">{c.description}</div>
                  </button>
                );
              })}
            </div>

            {err && <div className="cc-error">{err}</div>}
          </div>
        </div>

        <div className="cc-footer">
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
            title={!canSubmit ? "Enter a name and pick a class" : "Create"}
          >
            {busy ? "Binding..." : "Create Character"}
          </button>
        </div>
      </div>
    </div>
  );
}
