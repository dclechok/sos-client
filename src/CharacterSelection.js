import { useEffect, useState } from "react";
import { fetchCharacterList } from "./api/characterApi";
import LogoutButton from "./LogoutButton";
import "./styles/CharacterSelection.css";

function CharacterSelection({ account, setAccount, setCharacter }) {

  const [characters, setCharacters] = useState(null);

  // Load characters from server
  useEffect(() => {
    async function loadChars() {
      const chars = await fetchCharacterList(account, account.token);
      setCharacters(chars);
    }
    loadChars();
  }, [account]);

  console.log(characters)
  // When player selects a character save it in localStorage
  const handleSelect = (char) => {
    localStorage.setItem("pd_character", JSON.stringify(char));
    setCharacter(char);
  };

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
      <LogoutButton setAccount={setAccount} setCharacter={setCharacter} />

      <div className="char-title">Select Your Vessel</div>

      <div className="char-cont">
        <div className="chars">

          {/* No characters */}
          {characters.length === 0 && (
            <div>No vessels found. Create one?</div>
          )}

          {/* Character list */}
          {characters.map((c, index) => (
            <div 
              key={index}
              onClick={() => handleSelect(c)}
            >
              {c.charName}
            </div>
          ))}

          {/* Pad layout to always show 6 slots */}
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
