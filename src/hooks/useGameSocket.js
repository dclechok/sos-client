import { useEffect, useRef, useState, useCallback } from "react";
import socket from "./socket";

export function useGameSocket(onSceneData) {
  const [isReady, setIsReady] = useState(socket.connected);
  const [worldSeed,  setWorldSeed] = useState(null);

  /* ------------------------------------------------------
     Track connection state
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

  //world init listener, getting worldSeed (for background rendering/nebula)
    useEffect(() => {
    const handler = (payload) => {
      if (!payload || !Number.isFinite(payload.worldSeed)) return;
      setWorldSeed(payload.worldSeed);
    };

    socket.on("world:init", handler);
    return () => socket.off("world:init", handler);
  }, []);

  /* ------------------------------------------------------
     Attach sceneData listener (if callback provided)
  ------------------------------------------------------ */
  useEffect(() => {
    if (!onSceneData) return;

    const handler = (data) => onSceneData(data);
    socket.on("sceneData", handler);

    return () => socket.off("sceneData", handler);
  }, [onSceneData]);

  /* ------------------------------------------------------
     SAFE SEND
  ------------------------------------------------------ */
  const send = useCallback((event, data) => {
    if (!socket.connected) {
      console.warn("❌ Tried sending but socket is not connected");
      return;
    }
    socket.emit(event, data);
  }, []);

  /* ------------------------------------------------------
     LISTENER HOOK (unchanged)
  ------------------------------------------------------ */
  const useSocketEvent = (eventName, callback) => {
    const cbRef = useRef(callback);

    useEffect(() => {
      cbRef.current = callback;
    }, [callback]);

    useEffect(() => {
      const handler = (data) => cbRef.current(data);

      socket.on(eventName, handler);
      return () => socket.off(eventName, handler);
    }, [eventName]);
  };

  return { send, useSocketEvent, isReady, socket };
}
