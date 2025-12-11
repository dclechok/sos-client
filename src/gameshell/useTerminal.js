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
            const ts = `<span class="ts">[${new Date().toLocaleTimeString()}]</span> `;
            let buffer = ts;
            let i = 0;

            setTerminalLines(prev => [...prev, ts]);

            const id = setInterval(() => {
                buffer += text[i];
                setTerminalLines(prev => {
                    const arr = [...prev];
                    arr[arr.length - 1] = buffer;
                    return arr;
                });

                if (++i >= text.length) {
                    clearInterval(id);
                    resolve();
                }
            }, speed);
        });

    // Auto-scroll
    useEffect(() => {
        textRef.current?.scrollTo(0, textRef.current.scrollHeight);
    }, [terminalLines]);

    return { terminalLines, addLine, typeLine, textRef, inputRef };
}
