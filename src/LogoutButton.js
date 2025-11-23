import "./styles/LogoutButton.css";
import buttonClickSound from './sounds/button_click2.wav';
import { useState, useEffect } from 'react';

function LogoutButton({ setAccount, setCharacter }) {

  const clickSound = new Audio(buttonClickSound);
  const [warningMsg, setWarningMsg] = useState(false);


    useEffect(() => {
    if (!warningMsg) return;

    function handleKey(e) {
      if (e.key === "Escape") {
        handleCancel();
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [warningMsg]);

  function handleLogout() {
    localStorage.removeItem("pd_token");
    localStorage.removeItem("pd_account");
    localStorage.removeItem("pd_character");

    clickSound.currentTime = 0;
    clickSound.volume = 0.5;
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
      {warningMsg && (<div className="validate-logout-cont">
        <div className="validate-logout">
          <div>Are you sure you wish to logout here?</div>

          <div className="logout-choice-buttons">
            <button className="logout-yes" onClick={handleLogout}>Yes</button>
            <button className="logout-no" onClick={handleCancel}>No</button>
          </div>
        </div>
        </div>
      )}

    </div>
  );
}

export default LogoutButton;
