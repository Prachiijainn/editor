const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const os = require('os');

// Initialize express app
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('build'));

// Serve static files
app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Store active terminals and processes
const userSocketMap = {};
const activeTerminals = new Map();
const activeProcesses = new Map();
const workspacePaths = new Map();

// Create workspace directory
const workspaceDir = path.join(os.tmpdir(), 'realtime-editor-workspaces');
fs.ensureDirSync(workspaceDir);

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

// Simple terminal simulation (without node-pty for testing)
function initializeTerminal(roomId, socketId) {
    try {
        const workspacePath = path.join(workspaceDir, roomId);
        fs.ensureDirSync(workspacePath);
        workspacePaths.set(roomId, workspacePath);

        // Simulate terminal with a simple echo
        const terminal = {
            write: (data) => {
                io.to(roomId).emit('terminal-output', {
                    roomId,
                    output: data,
                    socketId
                });
            },
            resize: (cols, rows) => {
                console.log(`Terminal resized to ${cols}x${rows}`);
            },
            kill: () => {
                console.log('Terminal killed');
            }
        };

        activeTerminals.set(roomId, terminal);
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
                args = [filename, '-o', 'script', '&&', './script'];
                break;
            case 'c':
                filename = 'script.c';
                command = 'gcc';
                args = [filename, '-o', 'script', '&&', './script'];
                break;
            default:
                throw new Error(`Unsupported language: ${language}`);
        }

        // Write code to file
        const filePath = path.join(workspacePath, filename);
        await fs.writeFile(filePath, code);

        // Simulate execution for testing
        const processId = `${roomId}-${Date.now()}`;
        
        io.to(roomId).emit('execution-start', {
            roomId,
            language,
            socketId
        });

        // Simulate output
        setTimeout(() => {
            io.to(roomId).emit('execution-output', {
                roomId,
                output: `Executing ${language} code...\n`,
                socketId
            });
        }, 100);

        setTimeout(() => {
            io.to(roomId).emit('execution-output', {
                roomId,
                output: `Hello from ${language}!\n`,
                socketId
            });
        }, 500);

        setTimeout(() => {
            io.to(roomId).emit('execution-end', {
                roomId,
                exitCode: 0,
                socketId
            });
        }, 1000);

        return processId;
    } catch (error) {
        console.error('Code execution error:', error);
        io.to(roomId).emit('execution-error', {
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

    socket.on('join', ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);
        
        const clients = getAllConnectedClients(roomId);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit('joined', {
                clients,
                username,
                socketId: socket.id,
            });
        });
    });

    socket.on('code-change', ({ roomId, code }) => {
        socket.in(roomId).emit('code-change', { code });
    });

    socket.on('sync-code', ({ socketId, code }) => {
        io.to(socketId).emit('code-change', { code });
    });

    // Terminal command handling
    socket.on('terminal-command', async ({ roomId, command }) => {
        try {
            let terminal = activeTerminals.get(roomId);
            
            if (!terminal) {
                terminal = initializeTerminal(roomId, socket.id);
            }
            
            // Simulate command execution
            terminal.write(`$ ${command}\n`);
            
            if (command === 'ls') {
                terminal.write('file1.txt\nfile2.txt\nscript.js\n');
            } else if (command === 'pwd') {
                terminal.write('/workspace\n');
            } else if (command.startsWith('echo ')) {
                terminal.write(command.substring(5) + '\n');
            } else {
                terminal.write(`Command executed: ${command}\n`);
            }
        } catch (error) {
            console.error('Terminal command error:', error);
            socket.emit('terminal-output', {
                roomId,
                output: `Error: ${error.message}\r\n`,
                socketId: socket.id
            });
        }
    });

    // Terminal resize handling
    socket.on('terminal-resize', ({ roomId, cols, rows }) => {
        const terminal = activeTerminals.get(roomId);
        if (terminal) {
            terminal.resize(cols, rows);
        }
    });

    // Code execution handling
    socket.on('execute-code', async ({ roomId, code, language }) => {
        try {
            const processId = await executeCode(code, language, roomId, socket.id);
            socket.processId = processId;
        } catch (error) {
            console.error('Code execution error:', error);
            socket.emit('execution-error', {
                roomId,
                error: error.message,
                socketId: socket.id
            });
        }
    });

    // Stop execution
    socket.on('execution-stop', ({ roomId }) => {
        console.log('Execution stopped for room:', roomId);
    });

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit('disconnected', {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });
        delete userSocketMap[socket.id];
        socket.leave();
    });
});

const PORT = process.env.PORT || 3333;
server.listen(PORT, () => console.log(`Test server listening on port ${PORT}`)); 