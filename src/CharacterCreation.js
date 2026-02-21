// src/CharacterCreation.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import "./styles/CharacterCreation.css";
import { CHARACTER_CLASSES } from "./render/players/characterClasses";
import { createCharacter } from "./api/characterApi";

/**
 * CharacterCreation
 * - Fantasy/gothic parchment UI
 * - Pick name + class
 * - Live sprite preview
 * - Calls POST /api/characters/:accountId via createCharacter()
 *
 * Props:
 *   account (required): { id, token, ... }
 *   onCreated(character): called with newly created character doc
 *   onCancel(): optional close/cancel
 */
export default function CharacterCreation({ account, onCreated, onCancel }) {
  const [charName, setCharName] = useState("");
  const [classId, setClassId] = useState(CHARACTER_CLASSES[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // ensure we always have a valid class selected
  useEffect(() => {
    if (!classId && CHARACTER_CLASSES[0]?.id) setClassId(CHARACTER_CLASSES[0].id);
  }, [classId]);

  const selectedClass = useMemo(() => {
    return CHARACTER_CLASSES.find((c) => c.id === classId) || CHARACTER_CLASSES[0];
  }, [classId]);

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
      });

      // hand back to parent
      onCreated?.(created);
    } catch (e) {
      setErr(String(e?.message || "Failed to create character"));
    } finally {
      setBusy(false);
    }
  }, [account, canSubmit, classId, onCreated, sanitizedName]);

  // Enter to create, Esc to cancel
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Enter") {
        // avoid submitting when in class list and user is scrolling
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
            Choose a name, then bind a class. Your sprite is determined by class.
          </div>
        </div>

        <div className="cc-body">
          {/* Left: preview */}
          <div className="cc-preview">
            <div className="cc-portrait">
              {selectedClass?.sprite ? (
                <img
                  src={selectedClass.sprite}
                  alt={selectedClass.label}
                  draggable={false}
                />
              ) : (
                <div className="cc-portrait-fallback">No sprite</div>
              )}
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
          </div>

          {/* Right: form */}
          <div className="cc-form">
            <label className="cc-label">Name</label>
            <input
              className="cc-input"
              value={charName}
              onChange={(e) => setCharName(e.target.value)}
              placeholder="e.g. Vael, Lira, Lorn..."
              maxLength={32}
              autoFocus
            />
            <div className="cc-hint">
              3–16 chars. Letters, numbers, spaces, apostrophe, hyphen.
            </div>

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