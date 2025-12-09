// Gameshell.js
import "./styles/Gameshell.css";
import { useState, useEffect, useRef } from "react";
import { useGameSocket } from "./hooks/useGameSocket";

function Gameshell({ character, setPlayerLoc }) {
  const [sceneData, setSceneData] = useState(null);
  const [terminalLines, setTerminalLines] = useState([]);
  const [bootComplete, setBootComplete] = useState(
    sessionStorage.getItem("reverie_boot_done") === "1"
  );

  const [sceneRevealed, setSceneRevealed] = useState(false);
  const [command, setCommand] = useState("");

  const textRef = useRef(null);
  const inputRef = useRef(null);

  const { send, isReady } = useGameSocket((msg) => {
    setSceneData(msg);
  });

  /* ------------------------------------------------------
     LOAD terminal history on mount
  ------------------------------------------------------ */
  useEffect(() => {
    const saved = sessionStorage.getItem("reverie_terminal_log");

    if (saved) {
      const parsed = JSON.parse(saved);
      setTerminalLines(parsed);

      // If the terminal already has content, treat boot as complete
      if (parsed.length > 0) {
        setBootComplete(true);
        setSceneRevealed(true);
        sessionStorage.setItem("reverie_boot_done", "1");
      }
    }
  }, []);

  /* ------------------------------------------------------
     SAVE terminal history on every update
  ------------------------------------------------------ */
  useEffect(() => {
    sessionStorage.setItem("reverie_terminal_log", JSON.stringify(terminalLines));
  }, [terminalLines]);

  /* ------------------------------------------------------
     Auto-scroll
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
     Add terminal line
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
     Boot sequence (only if no saved history)
  ------------------------------------------------------ */
  useEffect(() => {
    if (!character || !isReady || bootComplete) return;

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

  }, [character, isReady, send, bootComplete]);

  useEffect(() => {
    if (!sceneData) return;

    if (sceneData.x !== undefined && sceneData.y !== undefined) {
      setPlayerLoc({ x: sceneData.x, y: sceneData.y });
    }
  }, [sceneData]);

  /* ------------------------------------------------------
     Handle Enter submission
  ------------------------------------------------------ */
  const handleKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const timestamp = `[${new Date().toLocaleTimeString()}] `;

    // Echo command
    setTerminalLines((prev) => [...prev, timestamp + command]);

    send("command", command);   // send raw input to backend

    setCommand("");
  };

  /* ------------------------------------------------------
     Scene reveal (only first login)
  ------------------------------------------------------ */
  useEffect(() => {
    if (!sceneData || sceneRevealed) return;

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

      setSceneRevealed(true);
      setBootComplete(true);
    };

    revealScene();
  }, [sceneData, sceneRevealed]);

  /* ------------------------------------------------------
     Auto-focus
  ------------------------------------------------------ */
  useEffect(() => {
    if (bootComplete && inputRef.current) {
      inputRef.current.focus();
    }
  }, [bootComplete]);

  console.log(sceneData, "test");

  /* ------------------------------------------------------
   Print backend command results to terminal
------------------------------------------------------ */
useEffect(() => {
  if (!sceneData) return;

  const timestamp = `[${new Date().toLocaleTimeString()}] `;

  // If backend returned an error like "You can't go that way"
  if (sceneData.error) {
    setTerminalLines((prev) => [...prev, timestamp + sceneData.error]);
    return;
  }

  // If backend returned a message (like movement)
  if (sceneData.message) {
    setTerminalLines((prev) => [...prev, timestamp + sceneData.message]);
  }

}, [sceneData]);

  /* ------------------------------------------------------
     Render
  ------------------------------------------------------ */
  return (
    <div className="scene-info-cont">
      <div className="scene-info-scroll">
        <div className="scene-info">
          <div className="terminal-frame crt-scanlines crt-flicker boot-glow">

            <div className="terminal-text" ref={textRef}>
              {terminalLines.map((line, i) => (
                <div key={i} className="terminal-line">{line}</div>
              ))}

              {bootComplete && (
                <div
                  className="terminal-input-line"
                  onClick={() => inputRef.current?.focus()}
                >
                  <span className="terminal-typed">{command}</span>
                  <span className="terminal-cursor">█</span>

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
