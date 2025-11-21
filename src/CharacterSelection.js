import { useEffect, useState } from "react";
import { fetchCharacterList } from './utils/characterApi'
import './styles/CharacterSelection.css';

function CharacterSelection({ account, setCharacter }) {

  const [characters, setCharacters] = useState(null);

  useEffect(() => {
    async function loadChars() {
      const chars = await fetchCharacterList(account, account.token);
      setCharacters(chars);
    }
    loadChars();
  }, [account]);

  if (characters === null) {
    return <div className="char-wrapper">Loading vessels...</div>;
  }

  return (
    <div className="char-wrapper">
      
      <div className="char-title">Select Your Vessel</div>

      <div className="char-cont">
        <div className="chars">
            {characters.length === 0 && (
            <div>No vessels found. Create one?</div>
          )}
    
          <div>{characters[0] ? characters[0].charName : ""}</div>
          <div>{characters[1] ? characters[1].charName : "t"}</div>
          <div>{characters[2] ? characters[2].charName : "d"}</div>
          <div>{characters[3] ? characters[3].charName : "e"}</div>
          <div>{characters[4] ? characters[4].charName : "f"}</div>
          <div>{characters[5] ? characters[5].charName : "e"}</div>
        </div>
      </div>

    </div>
  );
}

export default CharacterSelection;
