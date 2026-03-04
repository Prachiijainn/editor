import React, { useEffect, useRef, useState, useCallback } from 'react';
import ACTIONS from '../Actions';
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
    const [isResizing, setIsResizing] = useState(false);
    const [terminalHeight, setTerminalHeight] = useState(300);
    const [isConnected, setIsConnected] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Initialize terminal
    useEffect(() => {
        if (!terminalElementRef.current || !socketRef?.current) return;

        const term = new Terminal({
            cursorBlink: true,
            cursorStyle: 'block',
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
            allowTransparency: true,
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
        term.writeln('\x1b[1;35mUse ↑/↓ arrows to navigate command history.\x1b[0m');
        term.writeln('');

        // Handle terminal input
        term.onData((data) => {
            if (socketRef && socketRef.current) {
                socketRef.current.emit(ACTIONS.TERMINAL_DATA, {
                    roomId,
                    data
                });
                setIsProcessing(true);
            }
        });

        // Listen for terminal output from socket (real-time)
        if (socketRef && socketRef.current) {
            socketRef.current.on(ACTIONS.TERMINAL_OUTPUT, (data) => {
                // Only show output for the current room
                if (data.roomId === roomId) {
                    term.write(data.output);
                    setIsProcessing(false);
                    setIsConnected(true);
                }
            });

            socketRef.current.on(ACTIONS.TERMINAL_EXIT, (data) => {
                if (data.roomId === roomId) {
                    term.writeln(`\r\n\x1b[1;31mTerminal session ended (exit code: ${data.exitCode})\x1b[0m`);
                    setIsConnected(false);
                    setIsProcessing(false);
                }
            });

            // Handle terminal resize
            socketRef.current.on(ACTIONS.TERMINAL_RESIZE, (data) => {
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
                    socketRef.current.emit(ACTIONS.TERMINAL_RESIZE, {
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
                const socket = socketRef.current;
                socket.off(ACTIONS.TERMINAL_OUTPUT);
                socket.off(ACTIONS.TERMINAL_EXIT);
                socket.off(ACTIONS.TERMINAL_RESIZE);
            }
        };
    }, [socketRef, roomId]);

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
    }, [isResizing, handleMouseMove]);

    if (!isVisible) return null;

    return (
        <div className="terminal-container" style={{ height: `${terminalHeight}px` }}>
            <div className="terminal-header">
                <div className="terminal-title">
                    <span className="terminal-icon">⚡</span>
                    Terminal
                    {isConnected && <span className="connection-status connected">●</span>}
                    {isProcessing && <span className="processing-indicator">⟳</span>}
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