import "./styles/LogoutButton.css";

function LogoutButton({ setAccount }) {

  function handleLogout() {
    localStorage.removeItem("pd_token");
    setAccount(null);  // forces return to Login screen
  }

  return (
    <button className="logout-btn" onClick={handleLogout}>
      LOG OUT
    </button>
  );
}

export default LogoutButton;
