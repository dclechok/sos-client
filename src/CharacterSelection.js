import { useEffect, useState } from "react";
import { fetchCharacterList } from "./utils/characterApi";
import LogoutButton from "./LogoutButton";       // ← ADD THIS
import "./styles/CharacterSelection.css";

function CharacterSelection({ account, setAccount, setCharacter }) {

  const [characters, setCharacters] = useState(null);

  // Load characters
  useEffect(() => {
    async function loadChars() {
      const chars = await fetchCharacterList(account, account.token);
      setCharacters(chars);
    }
    loadChars();
  }, [account]);

  // If user leaves this page *without* choosing a character → auto logout
  useEffect(() => {
    return () => {
      if (!account.selectedCharacter) {
        localStorage.removeItem("pd_token");
      }
    };
  }, []);

  if (characters === null) {
    return (
      <div className="char-wrapper">
        <LogoutButton setAccount={setAccount} />
        Loading vessels...
      </div>
    );
  }

  return (
    <div className="char-wrapper">

      {/* 🔥 Always-visible logout button */}
      <LogoutButton setAccount={setAccount} />

      <div className="char-title">Select Your Vessel</div>

      <div className="char-cont">
        <div className="chars">

          {/* No characters */}
          {characters.length === 0 && (
            <div>No vessels found. Create one?</div>
          )}

          {/* Dynamically render characters */}
          {characters.map((c, index) => (
            <div key={index} onClick={() => setCharacter(c)}>
              {c.charName}
            </div>
          ))}

          {/* If fewer than 6, pad the slots (keeps layout stable) */}
          {Array.from({ length: Math.max(0, 6 - characters.length) }).map(
            (_, idx) => (
              <div key={`empty-${idx}`} className="empty-slot">
                —
              </div>
            )
          )}

        </div>
      </div>

    </div>
  );
}

export default CharacterSelection;
