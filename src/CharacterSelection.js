// src/CharacterSelection.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { fetchCharacterList, deleteCharacter } from "./api/characterApi";
import LogoutButton from "./LogoutButton";
import CharacterCreation from "./CharacterCreation";
import "./styles/CharacterSelection.css";
import { getClassById } from "./render/players/characterClasses";

const MAX_SLOTS = 6;

export default function CharacterSelection({ account, setAccount, setCharacter }) {
  const [characters, setCharacters] = useState(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState("");

  const accountId = account?.id || account?._id;

  const refresh = useCallback(async () => {
    if (!accountId || !account?.token) {
      setCharacters([]);
      return;
    }
    try {
      const chars = await fetchCharacterList(
        { ...account, id: accountId },
        account.token
      );
      setCharacters(Array.isArray(chars) ? chars : []);
    } catch (e) {
      console.error(e);
      setCharacters([]);
      setErr("Failed to load vessels.");
    }
  }, [account, accountId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const slotsUsed = useMemo(
    () => (Array.isArray(characters) ? characters.length : 0),
    [characters]
  );

  const canCreate = slotsUsed < MAX_SLOTS;

  const padded = useMemo(() => {
    const list = Array.isArray(characters) ? [...characters] : [];
    while (list.length < MAX_SLOTS) list.push(null);
    return list.slice(0, MAX_SLOTS);
  }, [characters]);

  const handleSelect = (char) => {
    localStorage.setItem("pd_character", JSON.stringify(char));
    setCharacter(char);
  };

  const handleDelete = async (char) => {
    if (!char) return;
    const id = char._id || char.id;
    if (!id) return;

    const name = char.charName || "this character";
    const ok = window.confirm(`Delete ${name}? This cannot be undone.`);
    if (!ok) return;

    try {
      setErr("");
      setBusyId(String(id));
      await deleteCharacter({ ...account, id: accountId }, account.token, id);

      const stored = localStorage.getItem("pd_character");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const storedId = parsed?._id || parsed?.id;
          if (String(storedId) === String(id)) {
            localStorage.removeItem("pd_character");
            setCharacter(null);
          }
        } catch {}
      }

      await refresh();
    } catch (e) {
      setErr(e?.message || "Failed to delete character.");
    } finally {
      setBusyId(null);
    }
  };

  if (characters === null) {
    return (
      <div className="char-wrapper char-screen">
        <div className="char-title">Select Your Vessel</div>
        <div className="char-loading">Loading vessels...</div>
      </div>
    );
  }

  return (
    <div className="char-wrapper char-screen">
      <div className="char-title">Select Your Vessel</div>

      {err && <div className="char-error">{err}</div>}

      <div className="char-cont">
        <div className="chars">
          {padded.map((c, index) => {
            if (!c) {
              return (
                <div
                  key={`empty-${index}`}
                  className={"char-slot empty-slot" + (canCreate ? " can-create" : "")}
                  onClick={() => canCreate && setCreating(true)}
                  role="button"
                >
                  <div className="slot-mid">◈</div>
                  <div className="slot-bot">
                    {canCreate ? "Create a vessel" : "No slots remaining"}
                  </div>
                </div>
              );
            }

            const id = c._id || c.id || `${index}`;
            const cls = getClassById(c.class);

            return (
              <div key={id} className="char-slot">
                <div className="slot-top">
                  <div className="slot-name">{c.charName}</div>
                  <div className="slot-meta">
                    {cls?.label || c.class || "Unknown"} • lvl {c.exp || 1}
                  </div>
                </div>

                <div className="slot-actions">
                  <button className="slot-btn" onClick={() => handleSelect(c)}>
                    Enter
                  </button>
                  <button
                    className="slot-btn danger"
                    onClick={() => handleDelete(c)}
                    disabled={busyId === String(id)}
                    title="Delete character"
                  >
                    {busyId === String(id) ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Logout sits at the bottom of the stack */}
          <div className="char-logout-wrap">
            <LogoutButton setAccount={setAccount} setCharacter={setCharacter} />
          </div>
        </div>
      </div>

      {creating && (
        <CharacterCreation
          account={{ ...account, id: accountId }}
          onCancel={() => setCreating(false)}
          onCreated={async (createdChar) => {
            setCreating(false);
            await refresh();
            handleSelect(createdChar);
          }}
        />
      )}
    </div>
  );
}
