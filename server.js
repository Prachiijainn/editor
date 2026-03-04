const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const os = require('os');
const ACTIONS = require('./src/Actions');
require('dotenv').config();
const helmet = require('helmet');

// Initialize express app
app.use(helmet()); // Basic security headers
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ["GET", "POST"]
}));
app.use(bodyParser.json());
app.use(express.static('build'));

// Serve static files
app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"]
    },
    pingInterval: 30000, // Stay alive through proxies
    pingTimeout: 120000
});

// Store active terminals and processes
const userSocketMap = {};
const activeTerminals = new Map();
const activeProcesses = new Map();
const workspacePaths = new Map();

// Create workspace directory
const workspaceDir = path.join(os.tmpdir(), 'realtime-editor-workspaces');
fs.ensureDirSync(workspaceDir);

const PROCESS_TIMEOUT = 30000; // 30 seconds timeout for execution

function getAllConnectedClients(roomId) {
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            };
        }
    );
}

// Initialize terminal for a room
async function initializeTerminal(roomId, socketId) {
    try {
        const pty = require('node-pty');
        const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

        const workspacePath = path.join(workspaceDir, roomId);
        fs.ensureDirSync(workspacePath);
        workspacePaths.set(roomId, workspacePath);

        const terminal = pty.spawn(shell, [], {
            name: 'xterm-color',
            cols: 80,
            rows: 24,
            cwd: workspacePath,
            env: process.env
        });

        activeTerminals.set(roomId, terminal);

        // Handle terminal data
        terminal.onData((data) => {
            io.to(roomId).emit(ACTIONS.TERMINAL_OUTPUT, {
                roomId,
                output: data,
                socketId
            });
        });

        // Handle terminal exit
        terminal.onExit(({ exitCode, signal }) => {
            io.to(roomId).emit(ACTIONS.TERMINAL_EXIT, {
                roomId,
                exitCode,
                signal,
                socketId
            });
            activeTerminals.delete(roomId);
        });

        return terminal;
    } catch (error) {
        console.error('Failed to initialize terminal:', error);
        throw error;
    }
}

// Execute code with real-time output
async function executeCode(code, language, roomId, socketId) {
    try {
        const workspacePath = workspacePaths.get(roomId) || path.join(workspaceDir, roomId);
        fs.ensureDirSync(workspacePath);

        let filename, command, args;

        switch (language) {
            case 'javascript':
                filename = 'script.js';
                command = 'node';
                args = [filename];
                break;
            case 'python':
                filename = 'script.py';
                command = 'python';
                args = [filename];
                break;
            case 'cpp':
                filename = 'script.cpp';
                command = 'g++';
                args = [filename, '-o', 'script', '-std=c++11'];
                break;
            case 'c':
                filename = 'script.c';
                command = 'gcc';
                args = [filename, '-o', 'script'];
                break;
            default:
                throw new Error(`Unsupported language: ${language}`);
        }

        // Write code to file
        const filePath = path.join(workspacePath, filename);
        await fs.writeFile(filePath, code);

        // Create process
        const { spawn } = require('child_process');
        const processId = `${roomId}-${Date.now()}`;

        let process;
        if (language === 'cpp') {
            // For C++, compile first, then run
            const compileProcess = spawn('g++', [filename, '-o', 'script', '-std=c++11'], { cwd: workspacePath });
            const compileTimeout = setTimeout(() => compileProcess.kill('SIGTERM'), PROCESS_TIMEOUT);

            compileProcess.stderr.on('data', (data) => {
                const output = data.toString();
                io.to(roomId).emit(ACTIONS.EXECUTION_ERROR, {
                    roomId,
                    error: output,
                    socketId
                });
                io.to(roomId).emit(ACTIONS.TERMINAL_OUTPUT, {
                    roomId,
                    output: `\x1b[1;31m${output}\x1b[0m`,
                    socketId
                });
            });

            compileProcess.on('close', (code) => {
                clearTimeout(compileTimeout);
                if (code === 0) {
                    // Compilation successful, run the executable
                    const runProcess = spawn('./script', [], { cwd: workspacePath });
                    activeProcesses.set(processId, runProcess);
                    const runTimeout = setTimeout(() => runProcess.kill('SIGTERM'), PROCESS_TIMEOUT);

                    runProcess.stdout.on('data', (data) => {
                        const output = data.toString();
                        io.to(roomId).emit(ACTIONS.EXECUTION_OUTPUT, {
                            roomId,
                            output: output,
                            socketId
                        });
                        io.to(roomId).emit(ACTIONS.TERMINAL_OUTPUT, {
                            roomId,
                            output: output,
                            socketId
                        });
                    });

                    runProcess.stderr.on('data', (data) => {
                        const output = data.toString();
                        io.to(roomId).emit(ACTIONS.EXECUTION_ERROR, {
                            roomId,
                            error: output,
                            socketId
                        });
                        io.to(roomId).emit(ACTIONS.TERMINAL_OUTPUT, {
                            roomId,
                            output: `\x1b[1;31m${output}\x1b[0m`,
                            socketId
                        });
                    });

                    runProcess.on('close', (exitCode) => {
                        clearTimeout(runTimeout);
                        io.to(roomId).emit(ACTIONS.EXECUTION_END, {
                            roomId,
                            exitCode,
                            socketId
                        });
                        io.to(roomId).emit(ACTIONS.TERMINAL_OUTPUT, {
                            roomId,
                            output: `\r\n\x1b[1;32mProcess finished with exit code ${exitCode}\x1b[0m\r\n`,
                            socketId
                        });
                        activeProcesses.delete(processId);
                    });
                } else {
                    io.to(roomId).emit(ACTIONS.EXECUTION_END, {
                        roomId,
                        exitCode: code,
                        socketId
                    });
                }
            });
        } else if (language === 'c') {
            // For C, compile first, then run
            const compileProcess = spawn('gcc', [filename, '-o', 'script'], { cwd: workspacePath });
            const compileTimeout = setTimeout(() => compileProcess.kill('SIGTERM'), PROCESS_TIMEOUT);

            compileProcess.stderr.on('data', (data) => {
                const output = data.toString();
                io.to(roomId).emit(ACTIONS.EXECUTION_ERROR, {
                    roomId,
                    error: output,
                    socketId
                });
                io.to(roomId).emit(ACTIONS.TERMINAL_OUTPUT, {
                    roomId,
                    output: `\x1b[1;31m${output}\x1b[0m`,
                    socketId
                });
            });

            compileProcess.on('close', (code) => {
                clearTimeout(compileTimeout);
                if (code === 0) {
                    // Compilation successful, run the executable
                    const runProcess = spawn('./script', [], { cwd: workspacePath });
                    activeProcesses.set(processId, runProcess);
                    const runTimeout = setTimeout(() => runProcess.kill('SIGTERM'), PROCESS_TIMEOUT);

                    runProcess.stdout.on('data', (data) => {
                        const output = data.toString();
                        io.to(roomId).emit(ACTIONS.EXECUTION_OUTPUT, {
                            roomId,
                            output: output,
                            socketId
                        });
                        io.to(roomId).emit(ACTIONS.TERMINAL_OUTPUT, {
                            roomId,
                            output: output,
                            socketId
                        });
                    });

                    runProcess.stderr.on('data', (data) => {
                        const output = data.toString();
                        io.to(roomId).emit(ACTIONS.EXECUTION_ERROR, {
                            roomId,
                            error: output,
                            socketId
                        });
                        io.to(roomId).emit(ACTIONS.TERMINAL_OUTPUT, {
                            roomId,
                            output: `\x1b[1;31m${output}\x1b[0m`,
                            socketId
                        });
                    });

                    runProcess.on('close', (exitCode) => {
                        clearTimeout(runTimeout);
                        io.to(roomId).emit(ACTIONS.EXECUTION_END, {
                            roomId,
                            exitCode,
                            socketId
                        });
                        io.to(roomId).emit(ACTIONS.TERMINAL_OUTPUT, {
                            roomId,
                            output: `\r\n\x1b[1;32mProcess finished with exit code ${exitCode}\x1b[0m\r\n`,
                            socketId
                        });
                        activeProcesses.delete(processId);
                    });
                } else {
                    io.to(roomId).emit(ACTIONS.EXECUTION_END, {
                        roomId,
                        exitCode: code,
                        socketId
                    });
                }
            });
        } else {
            // For interpreted languages
            process = spawn(command, args, { cwd: workspacePath });
            activeProcesses.set(processId, process);

            const processTimeout = setTimeout(() => {
                process.kill('SIGTERM');
            }, PROCESS_TIMEOUT);

            process.stdout.on('data', (data) => {
                const output = data.toString();
                io.to(roomId).emit(ACTIONS.EXECUTION_OUTPUT, {
                    roomId,
                    output: output,
                    socketId
                });
                io.to(roomId).emit(ACTIONS.TERMINAL_OUTPUT, {
                    roomId,
                    output: output,
                    socketId
                });
            });

            process.stderr.on('data', (data) => {
                const output = data.toString();
                io.to(roomId).emit(ACTIONS.EXECUTION_ERROR, {
                    roomId,
                    error: output,
                    socketId
                });
                io.to(roomId).emit(ACTIONS.TERMINAL_OUTPUT, {
                    roomId,
                    output: `\x1b[1;31m${output}\x1b[0m`,
                    socketId
                });
            });

            process.on('close', (exitCode) => {
                clearTimeout(processTimeout);
                io.to(roomId).emit(ACTIONS.EXECUTION_END, {
                    roomId,
                    exitCode,
                    socketId
                });
                io.to(roomId).emit(ACTIONS.TERMINAL_OUTPUT, {
                    roomId,
                    output: `\r\n\x1b[1;32mProcess finished with exit code ${exitCode}\x1b[0m\r\n`,
                    socketId
                });
                activeProcesses.delete(processId);
            });
        }

        return processId;
    } catch (error) {
        console.error('Code execution error:', error);
        io.to(roomId).emit(ACTIONS.EXECUTION_ERROR, {
            roomId,
            error: error.message,
            socketId
        });
        throw error;
    }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);

        const clients = getAllConnectedClients(roomId);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            });
        });
    });

    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    // Terminal raw data handling (Raw PTY streaming)
    socket.on(ACTIONS.TERMINAL_DATA, async ({ roomId, data }) => {
        try {
            let terminal = activeTerminals.get(roomId);
            if (!terminal) {
                terminal = await initializeTerminal(roomId, socket.id);
            }
            terminal.write(data);
        } catch (error) {
            console.error('Terminal data error:', error);
        }
    });

    // Terminal command handling (for manual command execution if needed)
    socket.on(ACTIONS.TERMINAL_COMMAND, async ({ roomId, command }) => {
        try {
            let terminal = activeTerminals.get(roomId);
            if (!terminal) {
                terminal = await initializeTerminal(roomId, socket.id);
            }
            terminal.write(command + '\n');
        } catch (error) {
            console.error('Terminal command error:', error);
            socket.emit(ACTIONS.TERMINAL_OUTPUT, {
                roomId,
                output: `Error: ${error.message}\r\n`,
                socketId: socket.id
            });
        }
    });

    // Terminal resize handling
    socket.on(ACTIONS.TERMINAL_RESIZE, ({ roomId, cols, rows }) => {
        const terminal = activeTerminals.get(roomId);
        if (terminal) {
            terminal.resize(cols, rows);
        }
    });

    // Code execution handling
    socket.on(ACTIONS.EXECUTE_CODE, async ({ roomId, code, language }) => {
        try {
            io.to(roomId).emit(ACTIONS.TERMINAL_OUTPUT, {
                roomId,
                output: `\x1b[1;36m> Running code in ${language}...\x1b[0m\r\n`,
                socketId: socket.id
            });

            const processId = await executeCode(code, language, roomId, socket.id);

            // Store process ID for potential stopping
            socket.processId = processId;
        } catch (error) {
            console.error('Code execution error:', error);
            socket.emit(ACTIONS.EXECUTION_ERROR, {
                roomId,
                error: error.message,
                socketId: socket.id
            });
        }
    });

    // Stop execution
    socket.on(ACTIONS.EXECUTION_STOP, ({ roomId }) => {
        const processId = socket.processId;
        if (processId && activeProcesses.has(processId)) {
            const process = activeProcesses.get(processId);
            process.kill('SIGTERM');
            activeProcesses.delete(processId);
        }
    });

    // File operations
    socket.on(ACTIONS.FILE_WRITE, async ({ roomId, filename, content }) => {
        try {
            const workspacePath = workspacePaths.get(roomId) || path.join(workspaceDir, roomId);
            const filePath = path.join(workspacePath, filename);
            await fs.writeFile(filePath, content);

            socket.emit(ACTIONS.FILE_WRITE, {
                roomId,
                filename,
                success: true
            });
        } catch (error) {
            socket.emit(ACTIONS.FILE_WRITE, {
                roomId,
                filename,
                success: false,
                error: error.message
            });
        }
    });

    socket.on(ACTIONS.FILE_READ, async ({ roomId, filename }) => {
        try {
            const workspacePath = workspacePaths.get(roomId) || path.join(workspaceDir, roomId);
            const filePath = path.join(workspacePath, filename);
            const content = await fs.readFile(filePath, 'utf8');

            socket.emit(ACTIONS.FILE_READ, {
                roomId,
                filename,
                content,
                success: true
            });
        } catch (error) {
            socket.emit(ACTIONS.FILE_READ, {
                roomId,
                filename,
                success: false,
                error: error.message
            });
        }
    });

    socket.on(ACTIONS.FILE_LIST, async ({ roomId }) => {
        try {
            const workspacePath = workspacePaths.get(roomId) || path.join(workspaceDir, roomId);
            const files = await fs.readdir(workspacePath);

            socket.emit(ACTIONS.FILE_LIST, {
                roomId,
                files,
                success: true
            });
        } catch (error) {
            socket.emit(ACTIONS.FILE_LIST, {
                roomId,
                success: false,
                error: error.message
            });
        }
    });

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });

            // Cleanup PTY if room is empty (except for the current socket which is leaving)
            // Adding a grace period to allow for page refreshes
            setTimeout(() => {
                const remainingClients = io.sockets.adapter.rooms.get(roomId);
                if (!remainingClients || remainingClients.size === 0) {
                    const terminal = activeTerminals.get(roomId);
                    if (terminal) {
                        terminal.kill();
                        activeTerminals.delete(roomId);
                        console.log(`PTY cleanup: Room ${roomId} is empty after grace period.`);
                    }
                }
            }, 10000); // 10 seconds grace period
        });
        delete userSocketMap[socket.id];
        socket.leave();
    });
});

// Cleanup on server shutdown
process.on('SIGINT', () => {
    console.log('Shutting down server...');

    // Kill all active processes
    activeProcesses.forEach((process) => {
        process.kill('SIGTERM');
    });

    // Kill all active terminals
    activeTerminals.forEach((terminal) => {
        terminal.kill();
    });

    process.exit(0);
});

const PORT = process.env.PORT || 3333;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));