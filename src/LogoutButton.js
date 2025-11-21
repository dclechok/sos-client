import "./styles/LogoutButton.css";
import buttonClickSound from './sounds/button_click2.wav';

function LogoutButton({ setAccount, setCharacter }) {

  const clickSound = new Audio(buttonClickSound);

  function handleLogout() {
    localStorage.removeItem("pd_token");
    clickSound.currentTime = 0;
    clickSound.play();
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
