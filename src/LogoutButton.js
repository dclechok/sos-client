import "./styles/LogoutButton.css";

function LogoutButton({ setAccount, setCharacter }) {

  function handleLogout() {
    localStorage.removeItem("pd_token");
    setAccount(null);  // forces return to Login screen
    setCharacter(null); //forces character reselection on next login
  }

  return (
    <button className="logout-btn" onClick={handleLogout}>
      LOG OUT
    </button>
  );
}

export default LogoutButton;
