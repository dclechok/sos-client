import { useState, useRef } from "react";
import { useGameSocket } from "./hooks/useGameSocket";
import "./styles/ChatMenu.css";

function ChatMenu({ character }) {
    const { send, useSocketEvent } = useGameSocket(); // <-- use shared socket
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const bottomRef = useRef(null);

    // Listen for full history
    useSocketEvent("chatHistory", (history) => {
        setMessages(history);
        scroll();
    });

    // Listen for new messages
    useSocketEvent("newMessage", (msg) => {
        setMessages((prev) => [...prev, msg]);
        scroll();
    });

    const scroll = () =>
        setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 30);

    const sendMessage = () => {
        if (!input.trim()) return;

        send("sendMessage", {
            user: character.charName,
            message: input
        });

        setInput("");
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
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
            </div>
        </div>
    );
}

export default ChatMenu;
