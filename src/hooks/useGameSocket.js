// useGameSocket.js (OPEN WORLD MMO — robust + production-safe)
// - Uses a SINGLE shared socket instance (imported from ./socket)
// - Never "misses" identify() due to timing (queues it until connected)
// - Handles reconnects by re-identifying automatically
// - Listens to: world:init, player:self, world:snapshot
// - Keeps backwards compat: send(), useSocketEvent()
// - Keeps sendInput() helper
//
// NOTE: loadScene() removed (open world)

import { useEffect, useRef, useState, useCallback } from "react";
import socket from "./socket";

export function useGameSocket() {
  const [isReady, setIsReady] = useState(socket.connected);

  const [worldSeed, setWorldSeed] = useState(null);
  const [myId, setMyId] = useState(null);

  // players map: { [socketId]: { x, y, angle } }
  const [players, setPlayers] = useState({});

  // Keep latest players in a ref (optional convenience)
  const playersRef = useRef(players);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // Track the last characterId we should be identified as (survives reconnect)
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
      // Don't spam; still useful warning
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

      // Re-identify on every (re)connect if we have a characterId queued
      const characterId = pendingIdentifyRef.current;
      if (characterId) {
        socket.emit("identify", { characterId });
      }
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
    socket.on("sceneError", handler); // server may still emit this for auth/identify issues
    return () => socket.off("sceneError", handler);
  }, []);

  /* ------------------------------------------------------
     OPEN WORLD API
  ------------------------------------------------------ */

  // ✅ Identify is now robust:
  // - can be called before connect
  // - will auto-fire on connect/reconnect
  const identify = useCallback((characterId) => {
    if (!characterId) return;

    // store for reconnect / late connect
    pendingIdentifyRef.current = characterId;

    if (socket.connected) {
      socket.emit("identify", { characterId });
    }
  }, []);

  // Input helper (safe)
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
    socket,
    isReady,
    worldSeed,

    myId,
    players,
    me,

    // backwards compat
    send,
    useSocketEvent,

    // open-world actions
    identify,
    sendInput,

    // optional: expose ref for advanced systems
    playersRef,
  };
}
