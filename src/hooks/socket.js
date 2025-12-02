import { io } from "socket.io-client";

const WS_URL =
  process.env.REACT_APP_WS_URL ||
  (window.location.hostname === "localhost"
    ? "ws://localhost:5000"
    : "wss://mud-project-server-2.onrender.com");

const socket = io(WS_URL, {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: Infinity,
});

export default socket;
