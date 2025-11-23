import "./styles/MainText.css";
import { useState, useEffect } from "react";
import { useGameSocket } from "./hooks/useGameSocket";

import chatArrow from "./img/chatarrow.png";

function Gameshell({ character }) {
  const [sceneData, setSceneData] = useState(null);

  const { send, isReady } = useGameSocket((msg) => {
    setSceneData(msg);
  });

  useEffect(() => {
    if (!character || !isReady) return;

    send("loadScene", {
      x: character.currentLoc.x,
      y: character.currentLoc.y,
    });

  }, [character, isReady, send]);

  return (
    <div className="scene-info-cont">
      <div className="scene-info-scroll">
        <div className="scene-info">

          <div>
            <span className="time-stamp">
              [ {new Date().toLocaleTimeString()} ]
            </span>{" "}
            {sceneData?.longDesc || "Loading scene..."}
          </div>

          {sceneData?.exits && (
            <p className="other-chat">
              <span className="time-stamp">[ exits ]</span>
              {Object.keys(sceneData.exits).join(", ")}
            </p>
          )}

        </div>
      </div>

      <div className="input-wrapper">
        <input className="main-text-input" />
        <img className="arrow-icon" src={chatArrow} alt="Send" />
      </div>
    </div>
  );
}

export default Gameshell;
