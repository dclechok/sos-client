// useCreatureEvents.js
import { useEffect } from "react";

export function useCreatureEvents(socket, isReady, setCreatures, setSceneData, addLine) {
    useEffect(() => {
        if (!isReady) return;

        const onSpawn = (c) => {
            if (c?.entranceDesc) addLine(c.entranceDesc);

            setCreatures(prev =>
                prev.some(p => p.instanceId === c.instanceId)
                    ? prev
                    : [...prev, c]
            );

            setSceneData(prev => ({
                ...prev,
                creatures: [...(prev?.creatures || []), c]
            }));
        };

        const onRespawn = (c) => {
            if (c?.entranceDesc) addLine(c.entranceDesc);

            setCreatures(prev =>
                prev.map(p => p.instanceId === c.instanceId ? c : p)
            );

            setSceneData(prev => ({
                ...prev,
                creatures: (prev?.creatures || []).map(p =>
                    p.instanceId === c.instanceId ? c : p
                )
            }));
        };

        socket.on("creature_spawned", onSpawn);
        socket.on("creature_respawned", onRespawn);

        return () => {
            socket.off("creature_spawned", onSpawn);
            socket.off("creature_respawned", onRespawn);
        };
    }, [isReady]);
}
