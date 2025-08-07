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

// Store active processes
const userSocketMap = {};
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
            
            compileProcess.stderr.on('data', (data) => {
                io.to(roomId).emit('execution-error', {
                    roomId,
                    error: data.toString(),
                    socketId
                });
            });

            compileProcess.on('close', (code) => {
                if (code === 0) {
                    // Compilation successful, run the executable
                    const runProcess = spawn('./script', [], { cwd: workspacePath });
                    activeProcesses.set(processId, runProcess);

                    runProcess.stdout.on('data', (data) => {
                        io.to(roomId).emit('execution-output', {
                            roomId,
                            output: data.toString(),
                            socketId
                        });
                    });

                    runProcess.stderr.on('data', (data) => {
                        io.to(roomId).emit('execution-error', {
                            roomId,
                            error: data.toString(),
                            socketId
                        });
                    });

                    runProcess.on('close', (exitCode) => {
                        io.to(roomId).emit('execution-end', {
                            roomId,
                            exitCode,
                            socketId
                        });
                        activeProcesses.delete(processId);
                    });
                } else {
                    io.to(roomId).emit('execution-end', {
                        roomId,
                        exitCode: code,
                        socketId
                    });
                }
            });
        } else if (language === 'c') {
            // For C, compile first, then run
            const compileProcess = spawn('gcc', [filename, '-o', 'script'], { cwd: workspacePath });
            
            compileProcess.stderr.on('data', (data) => {
                io.to(roomId).emit('execution-error', {
                    roomId,
                    error: data.toString(),
                    socketId
                });
            });

            compileProcess.on('close', (code) => {
                if (code === 0) {
                    // Compilation successful, run the executable
                    const runProcess = spawn('./script', [], { cwd: workspacePath });
                    activeProcesses.set(processId, runProcess);

                    runProcess.stdout.on('data', (data) => {
                        io.to(roomId).emit('execution-output', {
                            roomId,
                            output: data.toString(),
                            socketId
                        });
                    });

                    runProcess.stderr.on('data', (data) => {
                        io.to(roomId).emit('execution-error', {
                            roomId,
                            error: data.toString(),
                            socketId
                        });
                    });

                    runProcess.on('close', (exitCode) => {
                        io.to(roomId).emit('execution-end', {
                            roomId,
                            exitCode,
                            socketId
                        });
                        activeProcesses.delete(processId);
                    });
                } else {
                    io.to(roomId).emit('execution-end', {
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

            process.stdout.on('data', (data) => {
                io.to(roomId).emit('execution-output', {
                    roomId,
                    output: data.toString(),
                    socketId
                });
            });

            process.stderr.on('data', (data) => {
                io.to(roomId).emit('execution-error', {
                    roomId,
                    error: data.toString(),
                    socketId
                });
            });

            process.on('close', (exitCode) => {
                io.to(roomId).emit('execution-end', {
                    roomId,
                    exitCode,
                    socketId
                });
                activeProcesses.delete(processId);
            });
        }

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

    // Code execution handling
    socket.on('execute-code', async ({ roomId, code, language }) => {
        try {
            io.to(roomId).emit('execution-start', {
                roomId,
                language,
                socketId: socket.id
            });

            const processId = await executeCode(code, language, roomId, socket.id);
            
            // Store process ID for potential stopping
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
        const processId = socket.processId;
        if (processId && activeProcesses.has(processId)) {
            const process = activeProcesses.get(processId);
            process.kill('SIGTERM');
            activeProcesses.delete(processId);
        }
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
server.listen(PORT, () => console.log(`Simple test server listening on port ${PORT}`)); 