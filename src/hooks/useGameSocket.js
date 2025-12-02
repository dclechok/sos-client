import { useEffect, useRef, useState, useCallback } from "react";
import socket from "./socket";

export function useGameSocket() {
  const [isReady, setIsReady] = useState(socket.connected);

  // Track connection state
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

  // SAFE SEND
  const send = useCallback((event, data) => {
    if (!socket.connected) {
      console.warn("❌ Tried sending but socket is not connected");
      return;
    }
    socket.emit(event, data);
  }, []);

  // LISTENER HOOK
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
