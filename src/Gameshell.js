// Gameshell.js
import "./styles/Gameshell.css";
import { useState, useEffect, useRef } from "react";
import { useGameSocket } from "./hooks/useGameSocket";

function Gameshell({ character, setPlayerLoc }) {
    const [sceneData, setSceneData] = useState(null);
    const [terminalLines, setTerminalLines] = useState([]);
    const [bootComplete, setBootComplete] = useState(false);
    const [firstScenePrinted, setFirstScenePrinted] = useState(false);
    const [command, setCommand] = useState("");

    const textRef = useRef(null);
    const inputRef = useRef(null);
    const lastCoords = useRef({ x: null, y: null });


    /* ---------------------------------------------------------
       RESET TERMINAL WHEN USER CHANGES CHARACTER
    --------------------------------------------------------- */
    useEffect(() => {
        if (!character) return;

        setBootComplete(false);
        setFirstScenePrinted(false);
        setTerminalLines([]);

        sessionStorage.removeItem("reverie_terminal_log");
        sessionStorage.removeItem("reverie_boot_done");
    }, [character?._id]);
    console.log(sceneData, sceneData)
    /* ---------------------------------------------------------
       SOCKET LISTENER
    --------------------------------------------------------- */
    const { send, isReady, socket } = useGameSocket((msg) => {
        setSceneData(msg);

        const nx = msg?.currentLoc?.x ?? msg?.x;
        const ny = msg?.currentLoc?.y ?? msg?.y;

        if (nx !== undefined && ny !== undefined) {
            setPlayerLoc({ x: nx, y: ny });
        }
    });

    /* ---------------------------------------------------------
       ADD LINE (instant print, not typewriter)
    --------------------------------------------------------- */
    const addLine = (html) => {
        const ts = `<span class="ts">[${new Date().toLocaleTimeString()}]</span> `;
        setTerminalLines((prev) => [...prev, ts + html]);
    };

    /* ---------------------------------------------------------
       TYPEWRITER EFFECT (used for scene + boot)
    --------------------------------------------------------- */
    const typeLine = (text, speed = 10) =>
        new Promise((resolve) => {
            const timestamp = `<span class="ts">[${new Date().toLocaleTimeString()}]</span> `;
            let buffer = timestamp;
            let i = 0;

            // create empty line we mutate into
            setTerminalLines((prev) => [...prev, timestamp]);

            const interval = setInterval(() => {
                buffer += text[i];
                setTerminalLines((prev) => {
                    const clone = [...prev];
                    clone[clone.length - 1] = buffer;
                    return clone;
                });

                i++;
                if (i >= text.length) {
                    clearInterval(interval);
                    resolve();
                }
            }, speed);
        });

    /* ---------------------------------------------------------
       PRINT SCENE (always typewriter)
    --------------------------------------------------------- */
    const printScene = async (scene) => {
        await typeLine(`Region: ${scene.region || "Unknown Sector"}`);
        await typeLine(`Node: [ <span class="coords">${scene.currentLoc.x},${scene.currentLoc.y}</span> ]`);
        await typeLine("Loading environmental data...");
        await typeLine("&nbsp;");
        await typeLine(
            `<span class="entrance-desc">${scene.entranceDesc || "No description."}</span>`
        );

        if (scene.exits) {
            await typeLine("&nbsp;");
            await typeLine("Available exits:");
            const EXIT_ORDER = ["N", "S", "E", "W"];
            const exits = EXIT_ORDER
                .filter((dir) => scene.exits[dir]) 
                .map((dir) => `<span class="exit-tag">[${dir.toUpperCase()}]</span>`)
                .join(" ");

            await typeLine("&nbsp;&nbsp;" + exits);
        }
    };

    /* ---------------------------------------------------------
       CREATURE & TERMINAL MESSAGES (instant print)
    --------------------------------------------------------- */
    useEffect(() => {
        if (!isReady) return;

        const push = (txt) => addLine(txt);

        socket.on("terminal_message", push);
        socket.on("creature_spawned", (c) => c?.entranceDesc && push(c.entranceDesc));
        socket.on("creature_respawned", (c) => c?.entranceDesc && push(c.entranceDesc));

        return () => {
            socket.off("terminal_message", push);
            socket.off("creature_spawned");
            socket.off("creature_respawned");
        };
    }, [isReady]);

    /* ---------------------------------------------------------
       BOOT SEQUENCE — TYPEWRITER REVEAL
    --------------------------------------------------------- */
    useEffect(() => {
        if (!character || !isReady || bootComplete) return;

        const boot = async () => {
            await typeLine("Initializing Reverie Terminal Interface...");
            await typeLine("Establishing uplink...");
            await typeLine(`Authenticated as: ${character.name}`);
            await typeLine("Fetching region data...");

            send("loadScene", {
                x: character.currentLoc.x,
                y: character.currentLoc.y,
            });
        };

        boot();
    }, [character, isReady, send, bootComplete]);

    /* ---------------------------------------------------------
       FIRST SCENE ON LOGIN — TYPEWRITER
    --------------------------------------------------------- */
    useEffect(() => {
        if (!sceneData) return;
        if (firstScenePrinted) return;
        if (!sceneData.currentLoc) return;

        const { x, y } = sceneData.currentLoc || {};
        if (x == null || y == null) return;


        const print = async () => {
            await printScene(sceneData);
            lastCoords.current = { x: sceneData.currentLoc.x, y: sceneData.currentLoc.y };
            setBootComplete(true);
            setFirstScenePrinted(true);
            sessionStorage.setItem("reverie_boot_done", "1");
        };

        print();
    }, [sceneData, firstScenePrinted]);

    /* ---------------------------------------------------------
       MOVEMENT — ONLY PRINT WHEN COORDS CHANGE
    --------------------------------------------------------- */
    useEffect(() => {
        if (!sceneData) return;
        if (!bootComplete) return;

        // error packets
        if (sceneData.error) {
            addLine(`<span class="error">${sceneData.error}</span>`);
            return;
        }

        // message packets
        if (sceneData.message) {
            addLine(sceneData.message);
            // DO NOT RETURN — movement packets also have messages now
        }

        // must have a valid location object
        if (!sceneData.currentLoc) return;

        const { x, y } = sceneData.currentLoc;

        // only fire when moving
        if (x !== lastCoords.current.x || y !== lastCoords.current.y) {
            lastCoords.current = { x, y };
            printScene(sceneData); // typewriter scene print
        }
    }, [sceneData, bootComplete]);

    /* ---------------------------------------------------------
       COMMAND INPUT
    --------------------------------------------------------- */
    const handleKeyDown = (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();

        addLine(`<span class="cmd">${command}</span>`);
        send("command", command);
        setCommand("");
    };

    /* ---------------------------------------------------------
       AUTO SCROLL + AUTO FOCUS
    --------------------------------------------------------- */
    useEffect(() => {
        textRef.current?.scrollTo(0, textRef.current.scrollHeight);
    }, [terminalLines]);

    useEffect(() => {
        inputRef.current?.focus();
    }, [terminalLines, sceneData]);

    /* ---------------------------------------------------------
       RENDER TERMINAL UI
    --------------------------------------------------------- */
    return (
        <div className="scene-info-cont">
            <div className="scene-info-scroll">
                <div className="scene-info">
                    <div className="terminal-frame crt-scanlines crt-flicker boot-glow">
                        <div className="terminal-text" ref={textRef}>
                            {terminalLines.map((line, i) => (
                                <div
                                    key={i}
                                    className="terminal-line"
                                    dangerouslySetInnerHTML={{ __html: line }}
                                ></div>
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
                                        autoFocus
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
