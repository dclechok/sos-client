// useTerminal.js
import { useState, useRef, useEffect } from "react";

export function useTerminal() {
    const [terminalLines, setTerminalLines] = useState([]);
    const textRef = useRef(null);
    const inputRef = useRef(null);

    const addLine = (html) => {
        const ts = `<span class="ts">[${new Date().toLocaleTimeString()}]</span> `;
        setTerminalLines(prev => [...prev, ts + html]);
    };

const typeLine = (text, speed = 10) =>
    new Promise((resolve) => {

        // Always force text into a usable string
        text = text ?? "";
        text = String(text);

        const ts = `<span class="ts">[${new Date().toLocaleTimeString()}]</span> `;
        let buffer = ts;
        let i = 0;

        // Start the new line
        setTerminalLines(prev => [...prev, ts]);

        const id = setInterval(() => {
            const char = text[i];

            // If no more characters, finish cleanly
            if (char === undefined) {
                clearInterval(id);
                resolve();
                return;
            }

            buffer += char;

            setTerminalLines(prev => {
                const arr = [...prev];
                arr[arr.length - 1] = buffer;
                return arr;
            });

            i++;
        }, speed);
    });


    // Auto-scroll
    useEffect(() => {
        textRef.current?.scrollTo(0, textRef.current.scrollHeight);
    }, [terminalLines]);

    return { terminalLines, addLine, typeLine, textRef, inputRef };
}
