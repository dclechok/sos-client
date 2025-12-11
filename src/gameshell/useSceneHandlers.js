// useSceneHandlers.js
import { useEffect, useRef } from "react";
import { printScene } from "./printScene";

export function useSceneHandlers(sceneData, character, isReady, send, typeLine, addLine, bootComplete, setBootComplete, firstScenePrinted, setFirstScenePrinted, setPlayerLoc) {
    const lastCoords = useRef({ x: null, y: null });

    // ---- Boot sequence ----
    useEffect(() => {
        if (!character || !isReady || bootComplete) return;

        const boot = async () => {
            await typeLine("Initializing Reverie Terminal Interface...");
            await typeLine("Establishing uplink...");
            await typeLine(`Authenticated as: ${character.name}`);
            await typeLine("Fetching region data...");

            send("loadScene", character.currentLoc);
        };

        boot();
    }, [character, isReady, bootComplete]);

    // ---- First scene print ----
    useEffect(() => {
        if (!sceneData || firstScenePrinted || !sceneData.currentLoc) return;

        (async () => {
            await printScene(sceneData, typeLine);
            lastCoords.current = sceneData.currentLoc;
            setBootComplete(true);
            setFirstScenePrinted(true);
        })();
    }, [sceneData, firstScenePrinted]);

    // ---- Movement ----
    useEffect(() => {
        if (!sceneData || !bootComplete || !sceneData.currentLoc) return;

        const { x, y } = sceneData.currentLoc;

        if (x !== lastCoords.current.x || y !== lastCoords.current.y) {
            lastCoords.current = { x, y };
            printScene(sceneData, typeLine);
        }
    }, [sceneData, bootComplete]);
}
