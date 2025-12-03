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

  /* ------------------------------------------------------
     Auto-scroll when terminal output or input changes
     ------------------------------------------------------ */
  useEffect(() => {
    if (textRef.current) {
      textRef.current.scrollTop = textRef.current.scrollHeight;
    }
  }, [terminalLines, bootComplete, command]);

  /* ------------------------------------------------------
     Typewriter sound
     ------------------------------------------------------ */
  const playTypeSound = () => {
    const audio = new Audio("/sounds/type1.mp3");
    audio.volume = 0.25;
    audio.play().catch(() => {});
  };

  /* ------------------------------------------------------
     Add line with delay (boot sequence style)
     ------------------------------------------------------ */
  const addLine = (line, delay = 300) =>
    new Promise((resolve) => {
      setTimeout(() => {
        const timestamp = `[${new Date().toLocaleTimeString()}] `;
        setTerminalLines((prev) => [...prev, timestamp + line]);
        playTypeSound();
        resolve();
      }, delay);
    });

  /* ------------------------------------------------------
     Boot sequence
     ------------------------------------------------------ */
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

  /* ------------------------------------------------------
     Handle Enter key (submit command)
     ------------------------------------------------------ */
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();

      // Add the command to the terminal output
      setTerminalLines((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ${command}`,
      ]);

      // (Optional) send command to server
      // send("command", { text: command });

      // Clear input
      setCommand("");

      // Auto-scroll
      setTimeout(() => {
        if (textRef.current) {
          textRef.current.scrollTop = textRef.current.scrollHeight;
        }
      }, 10);
    }
  };
  console.log(sceneData)
  /* ------------------------------------------------------
     Reveal scene data (after boot)
     ------------------------------------------------------ */
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

  /* ------------------------------------------------------
     Always keep input focused once boot completes
     ------------------------------------------------------ */
  useEffect(() => {
    if (bootComplete && inputRef.current) {
      inputRef.current.focus();
    }
  }, [bootComplete]);

  /* ------------------------------------------------------
     RENDER
     ------------------------------------------------------ */
  return (
    <div className="scene-info-cont">
      <div className="scene-info-scroll">
        <div className="scene-info">
          <div className="terminal-frame crt-scanlines crt-flicker boot-glow">

            {/* Scrollable output */}
            <div className="terminal-text" ref={textRef}>
              {terminalLines.map((line, i) => (
                <div key={i} className="terminal-line">
                  {line}
                </div>
              ))}

              {/* Input line directly under last line */}
              {bootComplete && (
                <div
                  className="terminal-input-line"
                  onClick={() => inputRef.current?.focus()}
                >
                  <span className="terminal-typed">{command}</span>
                  <span className="terminal-cursor">█</span>

                  {/* Hidden real input */}
                  <input
                    ref={inputRef}
                    className="terminal-hidden-input"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default Gameshell;
