import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { WebglAddon } from 'xterm-addon-webgl';
import 'xterm/css/xterm.css';
import './Terminal.css';

const TerminalComponent = ({ socketRef, roomId, isVisible, onToggle }) => {
    const terminalRef = useRef(null);
    const terminalElementRef = useRef(null);
    const fitAddonRef = useRef(null);
    const [terminal, setTerminal] = useState(null);
    const [commandHistory, setCommandHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [currentCommand, setCurrentCommand] = useState('');
    const [isResizing, setIsResizing] = useState(false);
    const [terminalHeight, setTerminalHeight] = useState(300);
    const [isConnected, setIsConnected] = useState(false);

    // Initialize terminal
    useEffect(() => {
        if (!terminalElementRef.current || !socketRef?.current) return;

        const term = new Terminal({
            cursorBlink: true,
            theme: {
                background: '#1e1e1e',
                foreground: '#f8f8f2',
                cursor: '#f8f8f2',
                selection: '#44475a',
                black: '#000000',
                red: '#ff5555',
                green: '#50fa7b',
                yellow: '#f1fa8c',
                blue: '#bd93f9',
                magenta: '#ff79c6',
                cyan: '#8be9fd',
                white: '#bfbfbf',
                brightBlack: '#4d4d4d',
                brightRed: '#ff6e67',
                brightGreen: '#5af78e',
                brightYellow: '#f4f99d',
                brightBlue: '#caa9fa',
                brightMagenta: '#ff92d0',
                brightCyan: '#9aedfe',
                brightWhite: '#e6e6e6',
            },
            fontFamily: 'Consolas, "Courier New", monospace',
            fontSize: 14,
            lineHeight: 1.2,
            scrollback: 1000,
            cols: 80,
            rows: 20,
        });

        const fitAddon = new FitAddon();
        const webLinksAddon = new WebLinksAddon();
        
        term.loadAddon(fitAddon);
        term.loadAddon(webLinksAddon);

        try {
            const webglAddon = new WebglAddon();
            term.loadAddon(webglAddon);
        } catch (e) {
            console.warn('WebGL addon could not be loaded', e);
        }

        term.open(terminalElementRef.current);
        fitAddon.fit();

        setTerminal(term);
        fitAddonRef.current = fitAddon;

        // Welcome message
        term.writeln('\x1b[1;36mWelcome to the Real-Time Terminal!\x1b[0m');
        term.writeln('\x1b[1;33mConnected to server terminal session.\x1b[0m');
        term.writeln('\x1b[1;32mType your commands and press Enter to execute.\x1b[0m');
        term.writeln('\x1b[1;33mUse Ctrl+C to interrupt running processes.\x1b[0m');
        term.writeln('');

        // Handle terminal input
        term.onData(handleTerminalInput);

        // Listen for terminal output from socket (real-time)
        if (socketRef && socketRef.current) {
            socketRef.current.on('terminal-output', (data) => {
                // Only show output for the current room
                if (data.roomId === roomId) {
                    term.write(data.output);
                }
            });

            socketRef.current.on('terminal-exit', (data) => {
                if (data.roomId === roomId) {
                    term.writeln(`\r\n\x1b[1;31mTerminal session ended (exit code: ${data.exitCode})\x1b[0m`);
                    setIsConnected(false);
                }
            });

            // Handle terminal resize
            socketRef.current.on('terminal-resize', (data) => {
                if (data.roomId === roomId && fitAddonRef.current) {
                    fitAddonRef.current.fit();
                }
            });
        }

        // Handle terminal resize
        const handleResize = () => {
            if (fitAddonRef.current) {
                fitAddonRef.current.fit();
                // Notify server of resize
                if (socketRef?.current) {
                    const dimensions = fitAddonRef.current.proposeDimensions();
                    socketRef.current.emit('terminal-resize', {
                        roomId,
                        cols: dimensions.cols,
                        rows: dimensions.rows
                    });
                }
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            term.dispose();
            // Remove socket listeners
            if (socketRef && socketRef.current) {
                socketRef.current.off('terminal-output');
                socketRef.current.off('terminal-exit');
                socketRef.current.off('terminal-resize');
            }
        };
    }, [socketRef, roomId]);

    // Handle terminal input
    const handleTerminalInput = useCallback((data) => {
        if (!terminal) return;

        const code = data.charCodeAt(0);
        
        // Handle special keys
        if (code === 13) { // Enter
            const line = terminal.buffer.active.getLine(terminal.buffer.active.baseY + terminal.buffer.active.cursorY);
            const command = line.translateToString().trim();

            if (command) {
                // Emit command to backend via socket for real-time execution
                if (socketRef && socketRef.current) {
                    socketRef.current.emit('terminal-command', {
                        command,
                        roomId
                    });
                }
                
                setCommandHistory(prev => [...prev, command]);
                setHistoryIndex(-1);
                setCurrentCommand('');
                setIsConnected(true);
            }
            terminal.write('\r\n');
        } else if (code === 8) { // Backspace
            if (terminal.buffer.active.cursorX > 0) {
                terminal.write('\b \b');
            }
        } else if (code === 12) { // Ctrl+L (clear screen)
            terminal.clear();
            terminal.write('\x1b[1;36mTerminal cleared\x1b[0m\r\n');
        } else if (code === 3) { // Ctrl+C
            terminal.write('^C\r\n');
            terminal.write('\x1b[1;33mProcess interrupted\x1b[0m\r\n');
        } else if (code === 26) { // Ctrl+Z
            terminal.write('^Z\r\n');
            terminal.write('\x1b[1;33mProcess suspended\x1b[0m\r\n');
        } else if (code === 27) { // Escape sequence
            const nextChar = data.charCodeAt(1);
            if (nextChar === 91) { // [
                const thirdChar = data.charCodeAt(2);
                if (thirdChar === 65) { // Up arrow
                    navigateHistory('up');
                    return;
                } else if (thirdChar === 66) { // Down arrow
                    navigateHistory('down');
                    return;
                }
            }
        } else {
            // Regular character input
            terminal.write(data);
        }
    }, [terminal, commandHistory, historyIndex]);

    // Navigate command history
    const navigateHistory = useCallback((direction) => {
        if (commandHistory.length === 0) return;

        let newIndex = historyIndex;
        if (direction === 'up') {
            newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
        } else {
            newIndex = Math.max(historyIndex - 1, -1);
        }

        setHistoryIndex(newIndex);
        
        // Clear current line and show history command
        const currentLine = terminal.buffer.active.getLine(terminal.buffer.active.baseY + terminal.buffer.active.cursorY);
        const currentText = currentLine.translateToString();
        
        // Move cursor to beginning of line
        terminal.write('\r');
        // Clear the line
        terminal.write('\x1b[K');
        
        if (newIndex >= 0) {
            const historyCommand = commandHistory[commandHistory.length - 1 - newIndex];
            terminal.write(historyCommand);
            setCurrentCommand(historyCommand);
        } else {
            setCurrentCommand('');
        }
    }, [commandHistory, historyIndex, terminal]);

    // Handle terminal resize
    const handleMouseDown = (e) => {
        if (e.target.className === 'terminal-resize-handle') {
            setIsResizing(true);
            e.preventDefault();
        }
    };

    const handleMouseMove = (e) => {
        if (isResizing) {
            const newHeight = Math.max(200, Math.min(600, window.innerHeight - e.clientY));
            setTerminalHeight(newHeight);
        }
    };

    const handleMouseUp = () => {
        setIsResizing(false);
    };

    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isResizing]);

    if (!isVisible) return null;

    return (
        <div className="terminal-container" style={{ height: `${terminalHeight}px` }}>
            <div className="terminal-header">
                <div className="terminal-title">
                    <span className="terminal-icon">⚡</span>
                    Terminal
                    {isConnected && <span className="connection-status connected">●</span>}
                </div>
                <div className="terminal-controls">
                    <button 
                        className="terminal-control-btn minimize"
                        onClick={() => onToggle()}
                        title="Minimize Terminal"
                    >
                        −
                    </button>
                </div>
            </div>
            <div 
                ref={terminalElementRef} 
                className="terminal-content"
                onMouseDown={handleMouseDown}
            />
            <div className="terminal-resize-handle" />
        </div>
    );
};

export default TerminalComponent; 