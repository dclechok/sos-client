import "./../styles/Gameshell.css";
import { useState } from "react";
import { useGameSocket } from "./../hooks/useGameSocket";
import { useTerminal } from "./useTerminal";
import { useCreatureEvents } from "./useCreatureEvents";
import { useSceneHandlers } from "./useSceneHandlers";
import { TerminalView } from "./TerminalView";

function Gameshell({ character, sceneData, setSceneData, setPlayerLoc }) {
    const [creatures, setCreatures] = useState([]);
    const [bootComplete, setBootComplete] = useState(false);
    const [firstScenePrinted, setFirstScenePrinted] = useState(false);
    const [command, setCommand] = useState("");

    const { terminalLines, addLine, typeLine, textRef, inputRef } = useTerminal();

    const { send, isReady, socket } = useGameSocket((msg) => {
        setSceneData(msg);
        const { x, y } = msg.currentLoc || {};
        if (x !== undefined && y !== undefined) setPlayerLoc({ x, y });
    });

    useCreatureEvents(socket, isReady, setCreatures, setSceneData, addLine);

    useSceneHandlers(
        sceneData,
        character,
        isReady,
        send,
        typeLine,
        addLine,
        bootComplete,
        setBootComplete,
        firstScenePrinted,
        setFirstScenePrinted,
        setPlayerLoc
    );

    const handleKeyDown = (e) => {
        if (e.key !== "Enter") return;
        addLine(`<span class="cmd">${command}</span>`);
        send("command", command);
        setCommand("");
    };

    return (
        <div className="scene-info-cont">
            <div className="scene-info-scroll">
                <div className="scene-info">
                    <TerminalView
                        terminalLines={terminalLines}
                        command={command}
                        setCommand={setCommand}
                        handleKeyDown={handleKeyDown}
                        textRef={textRef}
                        inputRef={inputRef}
                        bootComplete={bootComplete}
                    />
                </div>
            </div>
        </div>
    );
}

export default Gameshell;
