import { useState, useRef, useCallback } from "react";
import { useGameSocket } from "./hooks/useGameSocket";
import "./styles/ChatMenu.css";

const MAX_CHARS = 120;

function ChatMenu({ character, myId }) {
  const { send, useSocketEvent } = useGameSocket(); // shared socket
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  const scroll = useCallback(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 30);
  }, []);

  // Listen for full history
  useSocketEvent("chatHistory", (history) => {
    setMessages(Array.isArray(history) ? history : []);
    scroll();
  });

  // Listen for new messages (from server)
  useSocketEvent("newMessage", (msg) => {
    if (!msg) return;

    setMessages((prev) => [...prev, msg]);
    scroll();

    // Try to read senderId (if server provides it)
    const senderId = msg.senderId ?? msg.playerId ?? msg.id ?? null;

    // Dispatch bubble for overhead rendering
    window.dispatchEvent(
      new CustomEvent("chat:bubble", {
        detail: {
          senderId: senderId != null ? String(senderId) : null,
          user: String(msg.user || ""),
          message: String(msg.message || ""),
          t: Date.now(),
        },
      })
    );
  });

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;

    const clipped = text.slice(0, MAX_CHARS);

    // ✅ IMMEDIATE local bubble (works even if server doesn't echo senderId)
    window.dispatchEvent(
      new CustomEvent("chat:bubble", {
        detail: {
          senderId: myId != null ? String(myId) : null,
          user: String(character?.charName || "Unknown"),
          message: clipped,
          t: Date.now(),
        },
      })
    );

    // Send to server (chatbox + other clients)
    send("sendMessage", {
      user: character?.charName || "Unknown",
      message: clipped,
      senderId: myId != null ? String(myId) : undefined,
    });

    setInput("");
  };

  const onChange = (e) => {
    const next = e.target.value;
    setInput(next.length > MAX_CHARS ? next.slice(0, MAX_CHARS) : next);
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className="chat-line">
            <span className="chat-user">&nbsp;&nbsp;{msg.user}:</span>
            <span className="chat-text">&nbsp;&nbsp;{msg.message}</span>
          </div>
        ))}
        <div ref={bottomRef}></div>
      </div>

      <div className="chat-input-wrapper">
        <input
          className="chat-input"
          value={input}
          placeholder="Type a message..."
          onChange={onChange}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <div
          style={{
            marginTop: 4,
            fontSize: 10,
            opacity: 0.55,
            userSelect: "none",
          }}
        >
          {input.length}/{MAX_CHARS}
        </div>
      </div>
    </div>
  );
}

export default ChatMenu;
