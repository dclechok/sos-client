import "./styles/NavBar.css";
import LogoutButton from "./LogoutButton";

function NavBar({ onMapClick, setAccount, setCharacter }) {
  return (
    <div className="nav-bar">
      <div className="nav-center">
        <button className="nav-item">Home</button>
        <button className="nav-item">Stats</button>
        <button className="nav-item" onClick={onMapClick}>Map</button>
        <button className="nav-item">Inventory</button>
        <button className="nav-item">Leaderboards</button>
        <button className="nav-item">Community</button>
        <button className="nav-item">Settings</button>
      </div>

      {/* same working logout logic, now placed on the nav */}
      <LogoutButton setAccount={setAccount} setCharacter={setCharacter} />
    </div>
  );
}

export default NavBar;
