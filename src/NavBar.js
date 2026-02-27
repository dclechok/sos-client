import "./styles/NavBar.css";
import LogoutButton from "./LogoutButton";

function NavBar({ onMapClick, onCharacterClick, setAccount, setCharacter }) {
  return (
    <div className="nav-bar">
      <div className="nav-center">
        <button className="nav-item">Home</button>
        <button className="nav-item" onClick={onCharacterClick}>
          Character (C)
        </button>

        <button className="nav-item" onClick={onMapClick}>
          Map (M)
        </button>

        <button className="nav-item">Leaderboards</button>
        <button className="nav-item">Community</button>
        <button className="nav-item">Settings</button>
      </div>

      <LogoutButton setAccount={setAccount} setCharacter={setCharacter} />
    </div>
  );
}

export default NavBar;