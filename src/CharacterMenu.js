import { useState, useRef, useCallback, useEffect } from "react";
import { useGameSocket } from "./hooks/useGameSocket";
import { getRoleColor } from "./utils/roleColors";
import "./styles/ChatMenu.css";

const MAX_CHARS = 120;

function ChatMenu({ character, myId }) {
  const { send, useSocketEvent } = useGameSocket(); // shared socket
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [chatActive, setChatActive] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const scroll = useCallback(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 30);
  }, []);

  // Global keybinds:
  // - Enter opens chat (arms input)
  // - Esc closes chat
  useEffect(() => {
    const onKeyDown = (e) => {
      // If user is typing somewhere else (like a form), don't hijack it
      const tag = (e.target?.tagName || "").toLowerCase();
      const isTypingElsewhere =
        tag === "input" || tag === "textarea" || e.target?.isContentEditable;

      // ENTER to open chat when inactive (unless already typing elsewhere)
      if (!chatActive && e.key === "Enter" && !isTypingElsewhere) {
        e.preventDefault();
        setChatActive(true);
        setTimeout(() => inputRef.current?.focus(), 0);
        return;
      }

      // ESC to close chat
      if (chatActive && e.key === "Escape") {
        e.preventDefault();
        setChatActive(false);
        setInput("");
        inputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [chatActive]);

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
          role: msg.role ?? null,
          t: Date.now(),
        },
      })
    );
  });

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    const clipped = text.slice(0, MAX_CHARS);

    // Immediate local bubble (works even if server doesn't echo senderId)
    window.dispatchEvent(
      new CustomEvent("chat:bubble", {
        detail: {
          senderId: myId != null ? String(myId) : null,
          user: String(character?.charName || "Unknown"),
          message: clipped,
          role: character?.role ?? null,
          t: Date.now(),
        },
      })
    );

    // Send to server (chatbox + other clients)
    send("sendMessage", {
      user: character?.charName || "Unknown",
      message: clipped,
      senderId: myId != null ? String(myId) : undefined,
      role: character?.role ?? undefined,
    });

    setInput("");
  }, [input, myId, character, send]);

  const onChange = (e) => {
    const next = e.target.value;
    setInput(next.length > MAX_CHARS ? next.slice(0, MAX_CHARS) : next);
  };

  const onInputKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    // Enter while active:
    // - if text: send
    // - if empty: close chat (nice "old school" behavior)
    if (input.trim()) {
      sendMessage();
    } else {
      setChatActive(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className={`chat-container ${chatActive ? "active" : "inactive"}`}>
      <div className="chat-messages">
        {messages.map((msg, i) => {
          const roleColor = getRoleColor(msg.role ?? null);
          return (
            <div key={i} className="chat-line">
              <span
                className="chat-user"
                style={{ color: roleColor.primary }}
              >
                &nbsp;&nbsp;{msg.user}:
              </span>
              <span className="chat-text">&nbsp;&nbsp;{msg.message}</span>
            </div>
          );
        })}
        <div ref={bottomRef}></div>
      </div>

      <div className="chat-input-wrapper">
        <input
          ref={inputRef}
          className="chat-input"
          value={input}
          placeholder={chatActive ? "Say something..." : "Press Enter to chat"}
          onChange={onChange}
          onKeyDown={onInputKeyDown}
          disabled={!chatActive}
        />
        <div className="chat-counter">
          {input.length}/{MAX_CHARS}
        </div>
      </div>
    </div>
  );
}

export default ChatMenu;
