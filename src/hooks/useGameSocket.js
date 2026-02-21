// hooks/useGameSocket.js (OPEN WORLD MMO — robust + production-safe)

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
     ✅ includes role + name from server identify response
  ------------------------------------------------------ */
  useEffect(() => {
    const handler = (payload) => {
      if (!payload?.id) return;

      setMyId(payload.id);

      if (payload.ship) {
        setPlayers((prev) => ({
          ...prev,
          [payload.id]: {
            ...(prev[payload.id] || {}),
            x: Number(payload.ship.x ?? 0),
            y: Number(payload.ship.y ?? 0),
            vx: Number(payload.ship.vx ?? 0),
            vy: Number(payload.ship.vy ?? 0),
            angle: Number(payload.ship.angle ?? 0),
            // ✅ persist name + role from identify response
            name: payload.ship.name ?? prev[payload.id]?.name ?? null,
            role: payload.ship.role ?? payload.role ?? prev[payload.id]?.role ?? "player",
            class: payload.ship.class ?? prev[payload.id]?.class ?? null,
          },
        }));
      }
    };

    socket.on("player:self", handler);
    return () => socket.off("player:self", handler);
  }, []);

  /* ------------------------------------------------------
     world:snapshot -> players
     ✅ Merges positional data but PRESERVES role/name/class
        that were set by player:self or identify so they
        are never wiped by a snapshot that omits them.
  ------------------------------------------------------ */
  useEffect(() => {
    const handler = (snap) => {
      if (!snap?.players || typeof snap.players !== "object") return;

      const t = Number.isFinite(snap?.t) ? Number(snap.t) : Date.now();

      setPlayers((prev) => {
        const next = {};

        for (const [id, p] of Object.entries(snap.players)) {
          if (!p) continue;

          const existing = prev[id] || {};

          next[id] = {
            // ✅ positional fields always overwritten by snapshot
            x: Number(p.x ?? 0),
            y: Number(p.y ?? 0),
            vx: Number(p.vx ?? 0),
            vy: Number(p.vy ?? 0),
            angle: Number(p.angle ?? 0),
            facing: p.facing ?? existing.facing ?? "right",
            t,

            // ✅ identity fields: prefer snapshot value, fall back to
            //    whatever we already know about this player so role/name
            //    survive snapshots that don't carry them
            name:  p.name  ?? existing.name  ?? null,
            class: p.class ?? existing.class ?? null,
            role:  p.role  ?? existing.role  ?? "player",
          };
        }

        return next;
      });
    };

    socket.on("world:snapshot", handler);
    return () => socket.off("world:snapshot", handler);
  }, []);

  /* ------------------------------------------------------
     Server errors
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

  const sendInput = useCallback((thrust) => {
    if (!socket.connected) return;
    socket.emit("player:input", { thrust: !!thrust });
  }, []);

  const moveTo = useCallback((x, y) => {
    if (!socket.connected) return;
    const tx = Number(x);
    const ty = Number(y);
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) return;
    socket.emit("player:moveTo", { x: tx, y: ty });
  }, []);

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

    sendInput,
    moveTo,
    cancelMove,

    playersRef,
  };
}