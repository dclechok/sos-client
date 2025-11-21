import "./styles/LogoutButton.css";
import buttonClickSound from './sounds/button_click2.wav';
import { useState } from 'react';

function LogoutButton({ setAccount, setCharacter }) {

  const clickSound = new Audio(buttonClickSound);
  const [warningMsg, setWarningMsg] = useState(false);

  function handleLogout() {
    localStorage.removeItem("pd_token");
    localStorage.removeItem("pd_account");
    localStorage.removeItem("pd_character");

    clickSound.currentTime = 0;
    clickSound.play().catch(() => {});

    setAccount(null);
    setCharacter(null);
  }

  function handleLogoutCheck() {
    setWarningMsg(true);
  }

  function handleCancel() {
    setWarningMsg(false);
  }

  return (
    <div className="logout-wrapper">

      {/* LOGOUT BUTTON */}
      <button className="logout-btn" onClick={handleLogoutCheck}>
        LOG OUT
      </button>

      {/* CONFIRMATION BOX */}
      {warningMsg && (
        <div className="validate-logout">
          <div>Are you sure you wish to logout here?</div>

          <div className="logout-choice-buttons">
            <button className="logout-yes" onClick={handleLogout}>Yes</button>
            <button className="logout-no" onClick={handleCancel}>No</button>
          </div>
        </div>
      )}

    </div>
  );
}

export default LogoutButton;
