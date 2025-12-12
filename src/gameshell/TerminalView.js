// TerminalView.js
export function TerminalView({ terminalLines, command, setCommand, handleKeyDown, textRef, inputRef, bootComplete }) {
    return (
        <div className="terminal-frame crt-scanlines crt-flicker boot-glow">
            <div className="terminal-text" ref={textRef} onClick={() => inputRef.current?.focus()}>
                {terminalLines.map((line, i) => (
                    <div key={i} className="terminal-line"
                        dangerouslySetInnerHTML={{ __html: line }} />
                ))}

                {bootComplete && (
                    <div className="terminal-input-line" onClick={() => inputRef.current?.focus()}>
                        <span className="terminal-typed">{command}</span>
                        <span className="terminal-cursor">█</span>
                        <input
                            ref={inputRef}
                            className="terminal-hidden-input"
                            value={command}
                            onChange={e => setCommand(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
