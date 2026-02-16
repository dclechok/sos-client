import "./styles/NavBar.css";

function NavBar({ onMapClick }) {
  return (
    <div className="nav-bar">
      <button className="nav-item">Home</button>
      <button className="nav-item">Stats</button>

      <button className="nav-item" onClick={onMapClick}>
        Map
      </button>

      <button className="nav-item">Inventory</button>
      <button className="nav-item">Leaderboards</button>
      <button className="nav-item">Community</button>
      <button className="nav-item">Settings</button>
    </div>
  );
}

export default NavBar;
