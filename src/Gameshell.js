// Gameshell.js
import "./styles/Gameshell.css";
import { useState, useEffect, useRef } from "react";
import { useGameSocket } from "./hooks/useGameSocket";
import chatArrow from "./img/chatarrow.png";

function Gameshell({ character }) {
  const [sceneData, setSceneData] = useState(null);
  const [terminalLines, setTerminalLines] = useState([]);
  const [bootComplete, setBootComplete] = useState(false);

  const textRef = useRef(null);

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
        setTerminalLines((prev) => [...prev, line]);
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
      await addLine("The wind shifts across the Slagline, carrying with it the metallic tang of ozone and the distant clatter of decaying machinery. Ahead, the terrain drops into a basin of abandoned industrial ruins—collapsed gantries, twisted conveyors, and shattered concrete silos half-swallowed by creeping black moss. Broken drones lie scattered like the bones of mechanical carrion, their lenses cracked and dim, long since scavenged for anything of value. The sky overhead flickers with the dying pulse of the city’s grid, faint neon reflections rippling across a blanket of smoke thick enough to taste. Somewhere beneath the rubble, a coolant line hisses a slow, rhythmic exhale, like the last breath of a forgotten giant. Every step echoes across the hollow expanse, stirring clouds of toxic dust that shimmer faintly under the moonlight. A rusted warning sign, barely legible, hangs by a single bolt: “BIOHAZARD CONTAINMENT—AUTHORIZED ENTRY ONLY.” The rest of the text has been eaten away by corrosion, leaving only deep claw-like gouges across the metal. Far in the distance, just beyond the reach of the fog, the silhouette of a mag-rail tower flickers with intermittent life, its guiding beacon snapping on and off as if struggling to remember its purpose. The air hums with static, and for a moment you swear you hear a whispered transmission—half a syllable, maybe less—before it fades into the oppressive cold. Nothing moves, yet the entire place feels haunted by the weight of old machinery waiting to wake again.")
      await addLine("The wind shifts across the Slagline, carrying with it the metallic tang of ozone and the distant clatter of decaying machinery. Ahead, the terrain drops into a basin of abandoned industrial ruins—collapsed gantries, twisted conveyors, and shattered concrete silos half-swallowed by creeping black moss. Broken drones lie scattered like the bones of mechanical carrion, their lenses cracked and dim, long since scavenged for anything of value. The sky overhead flickers with the dying pulse of the city’s grid, faint neon reflections rippling across a blanket of smoke thick enough to taste. Somewhere beneath the rubble, a coolant line hisses a slow, rhythmic exhale, like the last breath of a forgotten giant. Every step echoes across the hollow expanse, stirring clouds of toxic dust that shimmer faintly under the moonlight. A rusted warning sign, barely legible, hangs by a single bolt: “BIOHAZARD CONTAINMENT—AUTHORIZED ENTRY ONLY.” The rest of the text has been eaten away by corrosion, leaving only deep claw-like gouges across the metal. Far in the distance, just beyond the reach of the fog, the silhouette of a mag-rail tower flickers with intermittent life, its guiding beacon snapping on and off as if struggling to remember its purpose. The air hums with static, and for a moment you swear you hear a whispered transmission—half a syllable, maybe less—before it fades into the oppressive cold. Nothing moves, yet the entire place feels haunted by the weight of old machinery waiting to wake again.")
      await addLine("The wind shifts across the Slagline, carrying with it the metallic tang of ozone and the distant clatter of decaying machinery. Ahead, the terrain drops into a basin of abandoned industrial ruins—collapsed gantries, twisted conveyors, and shattered concrete silos half-swallowed by creeping black moss. Broken drones lie scattered like the bones of mechanical carrion, their lenses cracked and dim, long since scavenged for anything of value. The sky overhead flickers with the dying pulse of the city’s grid, faint neon reflections rippling across a blanket of smoke thick enough to taste. Somewhere beneath the rubble, a coolant line hisses a slow, rhythmic exhale, like the last breath of a forgotten giant. Every step echoes across the hollow expanse, stirring clouds of toxic dust that shimmer faintly under the moonlight. A rusted warning sign, barely legible, hangs by a single bolt: “BIOHAZARD CONTAINMENT—AUTHORIZED ENTRY ONLY.” The rest of the text has been eaten away by corrosion, leaving only deep claw-like gouges across the metal. Far in the distance, just beyond the reach of the fog, the silhouette of a mag-rail tower flickers with intermittent life, its guiding beacon snapping on and off as if struggling to remember its purpose. The air hums with static, and for a moment you swear you hear a whispered transmission—half a syllable, maybe less—before it fades into the oppressive cold. Nothing moves, yet the entire place feels haunted by the weight of old machinery waiting to wake again.")

      setBootComplete(true);
    };

    revealScene();
  }, [sceneData, bootComplete]);

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

              {bootComplete && <div className="terminal-cursor">█</div>}
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
