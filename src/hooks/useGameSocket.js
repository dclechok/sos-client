import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

export function useGameSocket(onMessage) {
  const socketRef = useRef(null);
  const onMessageRef = useRef(onMessage); // prevent stale closure
  const [isReady, setIsReady] = useState(false);

  // Keep callback fresh
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    // Create ONLY ONE socket
    const socket = io("http://localhost:5000", {
      transports: ["websocket"],  // force websocket-only
      reconnection: true,         // enable automatic reconnection
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,     // initial delay
      reconnectionDelayMax: 3000, // max backoff
      timeout: 5000,              // connection timeout
      autoConnect: true,
    });

    socketRef.current = socket;

    // When connected
    socket.on("connect", () => {
      console.log("🔗 Socket connected");
      setIsReady(true);
    });

    // When disconnected
    socket.on("disconnect", (reason) => {
      console.warn("⚠️ Socket disconnected:", reason);
      setIsReady(false);
    });

    // Handle messages
    socket.on("mapData", (msg) => {
      onMessageRef.current(msg);
    });

    // Handle connection errors
    socket.on("connect_error", (err) => {
      console.warn("❌ Connection error:", err.message);
    });

    return () => {
      console.log("🔌 Cleaning up socket...");
      socket.disconnect();
    };
  }, []);

  // Stable send() function
  const send = useCallback((eventName, data) => {
    if (!socketRef.current || !socketRef.current.connected) {
      console.warn("❌ Attempted to send but socket not connected");
      return;
    }
    socketRef.current.emit(eventName, data);
  }, []);

  return { send, isReady };
}
