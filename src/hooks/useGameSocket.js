// useGameSocket.js (OPEN WORLD MMO — robust + production-safe)

import { useEffect, useRef, useState, useCallback } from "react";
import socket from "./socket";

export function useGameSocket() {
  const [isReady, setIsReady] = useState(socket.connected);

  const [worldSeed, setWorldSeed] = useState(null);
  const [myId, setMyId] = useState(null);

  const [players, setPlayers] = useState({});

  const playersRef = useRef(players);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  const pendingIdentifyRef = useRef(null);

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
     Core connection lifecycle (handles reconnect re-identify)
  ------------------------------------------------------ */
  useEffect(() => {
    const onConnect = () => {
      setIsReady(true);
      const characterId = pendingIdentifyRef.current;
      if (characterId) socket.emit("identify", { characterId });
    };

    const onDisconnect = () => setIsReady(false);

    const onConnectError = (e) => {
      console.log("⚠️ connect_error:", e?.message || e);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
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
     Server errors (helpful during deployment)
  ------------------------------------------------------ */
  useEffect(() => {
    const handler = (e) => console.log("⚠️ server error:", e);
    socket.on("sceneError", handler);
    return () => socket.off("sceneError", handler);
  }, []);

  /* ------------------------------------------------------
     OPEN WORLD API
  ------------------------------------------------------ */
  const identify = useCallback((characterId) => {
    if (!characterId) return;
    pendingIdentifyRef.current = characterId;
    if (socket.connected) socket.emit("identify", { characterId });
  }, []);

  // ✅ Movement change #1:
  // sendInput is now ONLY manual thrust (no mouse targetAngle).
  const sendInput = useCallback((thrust) => {
    if (!socket.connected) return;
    socket.emit("player:input", { thrust: !!thrust });
  }, []);

  // ✅ Movement change #2:
  // Right-click sets a destination ONCE; server handles smooth turning + persistent thrust.
  const moveTo = useCallback((x, y) => {
    if (!socket.connected) return;
    const tx = Number(x);
    const ty = Number(y);
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) return;

    socket.emit("player:moveTo", { x: tx, y: ty });
  }, []);

  // Optional: cancel autopilot (if you add this on server)
  const cancelMove = useCallback(() => {
    if (!socket.connected) return;
    socket.emit("player:moveCancel");
  }, []);

  const me = myId ? players?.[myId] : null;

  return {
    socket,
    isReady,
    worldSeed,

    myId,
    players,
    me,

    send,
    useSocketEvent,

    identify,

    // ✅ updated movement API
    sendInput,   // thrust only
    moveTo,      // right-click destination
    cancelMove,  // optional

    playersRef,
  };
}
