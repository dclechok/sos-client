// useGameSocket.js
import { useEffect, useRef, useState, useCallback } from "react";
import socket from "./socket";

/**
 * Space Multiplayer Socket Hook (BACKWARDS COMPAT)
 *
 * Keeps old API:
 * - send(event, data)
 * - useSocketEvent(eventName, callback)
 *
 * Adds new API:
 * - identify(characterId)
 * - loadScene()
 * - sendInput(thrust, targetAngle)
 *
 * Listens:
 * - world:init        { worldSeed }
 * - player:self       { id, ship }
 * - world:snapshot    { players, t }
 * - sceneData         { ... } (optional)
 */
export function useGameSocket({ onSceneData } = {}) {
  const [isReady, setIsReady] = useState(socket.connected);

  const [worldSeed, setWorldSeed] = useState(null);
  const [myId, setMyId] = useState(null);

  // players map: { [socketId]: { x, y, angle } }
  const [players, setPlayers] = useState({});

  // Keep latest players in a ref (handy for callbacks without re-subscribing)
  const playersRef = useRef(players);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  /* ------------------------------------------------------
     BACKWARDS COMPAT: useSocketEvent(eventName, callback)
  ------------------------------------------------------ */
  const useSocketEvent = (eventName, callback) => {
    const cbRef = useRef(callback);

    useEffect(() => {
      cbRef.current = callback;
    }, [callback]);

    useEffect(() => {
      if (!eventName) return;

      const handler = (data) => cbRef.current?.(data);
      socket.on(eventName, handler);
      return () => socket.off(eventName, handler);
    }, [eventName]);
  };

  /* ------------------------------------------------------
     BACKWARDS COMPAT: send(event, data)
  ------------------------------------------------------ */
  const send = useCallback((event, data) => {
    if (!socket.connected) {
      console.warn("❌ Tried sending but socket is not connected:", event);
      return;
    }
    socket.emit(event, data);
  }, []);

  /* ------------------------------------------------------
     Connection state
  ------------------------------------------------------ */
  useEffect(() => {
    const onConnect = () => setIsReady(true);
    const onDisconnect = () => setIsReady(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  /* ------------------------------------------------------
     world:init -> seed
  ------------------------------------------------------ */
  useEffect(() => {
    const handler = (payload) => {
      if (!payload || !Number.isFinite(payload.worldSeed)) return;
      setWorldSeed(payload.worldSeed);
    };

    socket.on("world:init", handler);
    return () => socket.off("world:init", handler);
  }, []);

  /* ------------------------------------------------------
     player:self -> my socket id + optional initial ship
  ------------------------------------------------------ */
  useEffect(() => {
    const handler = (payload) => {
      if (!payload?.id) return;

      setMyId(payload.id);

      if (payload.ship) {
        setPlayers((prev) => ({
          ...prev,
          [payload.id]: {
            x: Number(payload.ship.x ?? 0),
            y: Number(payload.ship.y ?? 0),
            angle: Number(payload.ship.angle ?? 0),
          },
        }));
      }
    };

    socket.on("player:self", handler);
    return () => socket.off("player:self", handler);
  }, []);

  /* ------------------------------------------------------
     world:snapshot -> players
  ------------------------------------------------------ */
  useEffect(() => {
    const handler = (snap) => {
      if (!snap?.players || typeof snap.players !== "object") return;
      setPlayers(snap.players);
    };

    socket.on("world:snapshot", handler);
    return () => socket.off("world:snapshot", handler);
  }, []);

  /* ------------------------------------------------------
     sceneData -> UI (optional)
  ------------------------------------------------------ */
  useEffect(() => {
    if (!onSceneData) return;

    const handler = (data) => onSceneData(data);
    socket.on("sceneData", handler);

    return () => socket.off("sceneData", handler);
  }, [onSceneData]);

  /* ------------------------------------------------------
     New explicit API (safe + clear)
  ------------------------------------------------------ */
  const identify = useCallback((characterId) => {
    if (!socket.connected) return;
    if (!characterId) return;
    socket.emit("identify", { characterId });
  }, []);

  const loadScene = useCallback(() => {
    if (!socket.connected) return;
    socket.emit("loadScene", {}); // server uses DB currentLoc
  }, []);

  const sendInput = useCallback((thrust, targetAngle) => {
    if (!socket.connected) return;
    socket.emit("player:input", {
      thrust: !!thrust,
      targetAngle: Number.isFinite(targetAngle) ? targetAngle : 0,
    });
  }, []);

  // derived
  const me = myId ? players?.[myId] : null;

  return {
    // core
    socket,
    isReady,
    worldSeed,

    // realtime
    myId,
    players,
    me,

    // backwards compat (so you don't break existing UI)
    send,
    useSocketEvent,

    // new explicit actions
    identify,
    loadScene,
    sendInput,
  };
}
