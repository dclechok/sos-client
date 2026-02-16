import "./styles/LogoutButton.css";
import buttonClickSound from "./sounds/button_click2.wav";
import { useEffect, useMemo, useState } from "react";

function LogoutButton({ setAccount, setCharacter }) {
  const [warningMsg, setWarningMsg] = useState(false);

  // ✅ create the Audio object ONCE (prevents lag / “browser breaking”)
  const clickSound = useMemo(() => new Audio(buttonClickSound), []);

  useEffect(() => {
    if (!warningMsg) return;

    function handleKey(e) {
      if (e.key === "Escape") {
        setWarningMsg(false);
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [warningMsg]);

  function handleLogout() {
    localStorage.removeItem("pd_token");
    localStorage.removeItem("pd_account");
    localStorage.removeItem("pd_character");

    try {
      clickSound.currentTime = 0;
      clickSound.volume = 0.5;
      clickSound.play().catch(() => {});
    } catch {}

    setAccount(null);
    setCharacter(null);
    setWarningMsg(false);
  }

  function handleLogoutCheck() {
    setWarningMsg(true);
  }

  function handleCancel() {
    setWarningMsg(false);
  }

  return (
    <>
      {/* LOGOUT BUTTON (styled/positioned by your CSS) */}
      <button className="logout-btn" onClick={handleLogoutCheck}>
        LOG OUT
      </button>

      {/* CONFIRMATION BOX */}
      {warningMsg && (
        <div className="validate-logout-cont" onMouseDown={handleCancel}>
          <div className="validate-logout" onMouseDown={(e) => e.stopPropagation()}>
            <div>Are you sure you wish to logout here?</div>

            <div className="logout-choice-buttons">
              <button className="logout-yes" onClick={handleLogout}>Yes</button>
              <button className="logout-no" onClick={handleCancel}>No</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default LogoutButton;
