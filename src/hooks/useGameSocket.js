import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

export function useGameSocket(onMessage) {
  const socketRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  const [isReady, setIsReady] = useState(false);

  // Determine WebSocket URL
  const WS_URL =
    process.env.REACT_APP_WS_URL ||
    (window.location.hostname === "localhost"
      ? "ws://localhost:5000"
      : "wss://mud-project-server-2.onrender.com");

  // Keep callback fresh
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    console.log("🔌 Connecting to WebSocket:", WS_URL);

    const socket = io(WS_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      timeout: 5000,
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🔗 Socket connected to:", WS_URL);
      setIsReady(true);
    });

    socket.on("disconnect", (reason) => {
      console.warn("⚠️ Socket disconnected:", reason);
      setIsReady(false);
    });

    socket.on("mapData", (msg) => {
      onMessageRef.current(msg);
    });

    socket.on("connect_error", (err) => {
      console.warn("❌ Connection error:", err.message);
    });

    return () => {
      console.log("🔌 Cleaning up socket...");
      socket.disconnect();
    };
  }, [WS_URL]);

  const send = useCallback((eventName, data) => {
    if (!socketRef.current || !socketRef.current.connected) {
      console.warn("❌ Attempted to send but socket not connected");
      return;
    }
    socketRef.current.emit(eventName, data);
  }, []);

  return { send, isReady };
}
