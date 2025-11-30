// Gameshell.js
import "./styles/Gameshell.css";
import { useState, useEffect, useRef } from "react";
import { useGameSocket } from "./hooks/useGameSocket";

function Gameshell({ character }) {
  const [sceneData, setSceneData] = useState(null);
  const [terminalLines, setTerminalLines] = useState([]);
  const [bootComplete, setBootComplete] = useState(false);
  const [command, setCommand] = useState("");
  
  const textRef = useRef(null);
  const inputRef = useRef(null);


  const { send, isReady } = useGameSocket((msg) => {
    setSceneData(msg);
  });

  // Auto-scroll to bottom when new text appears
  useEffect(() => {
    if (textRef.current) {
      textRef.current.scrollTop = textRef.current.scrollHeight;
    }
  }, [terminalLines, bootComplete]);

  // typing beep
  const playTypeSound = () => {
    const audio = new Audio("/sounds/type1.mp3");
    audio.volume = 0.25;
    audio.play().catch(() => {});
  };

  // add line w/ delay
  const addLine = (line, delay = 300) => {
    return new Promise((resolve) => {
      setTimeout(() => {
      const timestamp = `[${new Date().toLocaleTimeString()}] `;
      setTerminalLines((prev) => [...prev, timestamp + line]);
        playTypeSound();
        resolve();
      }, delay);
    });
  };

  // Boot sequence
  useEffect(() => {
    if (!character || !isReady) return;

    const runBoot = async () => {
      await addLine("Initializing Reverie Terminal Interface...");
      await addLine("Establishing uplink...");
      await addLine(`Authenticated as: ${character.name}`);
      await addLine("Fetching region data...");

      send("loadScene", {
        x: character.currentLoc.x,
        y: character.currentLoc.y,
      });
    };

    runBoot();
  }, [character, isReady, send]);

  // Reveal scene data
  useEffect(() => {
    if (!sceneData || bootComplete) return;

    const revealScene = async () => {
      await addLine(`Region: ${sceneData.region || "Unknown Sector"}`, 250);
      await addLine(`Node: (${sceneData.x}, ${sceneData.y})`, 200);
      await addLine("Loading environmental data...");
      await addLine(" ");
      await addLine(sceneData.entranceDesc, 350);

      if (sceneData.exits) {
        await addLine(" ");
        await addLine("Available exits:");
        await addLine("   " + Object.keys(sceneData.exits).join(", "));
      }

      setBootComplete(true);
    };

    revealScene();
  }, [sceneData, bootComplete]);

  useEffect(() => {
  if (bootComplete && inputRef.current) {
    inputRef.current.focus();
  }
}, [bootComplete]);

  return (
    <div className="scene-info-cont">
      <div className="scene-info-scroll">
        <div className="scene-info">
          {/* border + CRT effects */}
          <div className="terminal-frame crt-scanlines crt-flicker boot-glow">
            {/* inner scrolling text */}
            <div className="terminal-text" ref={textRef}>
              {terminalLines.map((line, i) => (
                <div key={i} className="terminal-line">
                  {line}
                </div>
              ))}

{bootComplete && (
  <div className="terminal-input-line" onClick={() => inputRef.current.focus()}>
    <span className="terminal-typed">{command}</span>
    <span className="terminal-cursor">█</span>

    {/* Hidden input captures keystrokes */}
    <input
      ref={inputRef}
      className="terminal-hidden-input"
      value={command}
      onChange={(e) => setCommand(e.target.value)}
      autoFocus
    />
  </div>
)}


            </div>
          </div>
        </div>
      </div>

      {/* <div className="input-wrapper">
        <input className="main-text-input" />
        <img className="arrow-icon" src={chatArrow} alt="Send" />
      </div> */}
    </div>
  );
}

export default Gameshell;
