class CodeExecutor {
    constructor(socketRef) {
        this.socketRef = socketRef;
        this.supportedLanguages = {
            javascript: {
                name: 'JavaScript',
                extension: '.js',
                runtime: 'node',
                defaultCode: 'console.log("Hello, World!");'
            },
            python: {
                name: 'Python',
                extension: '.py',
                runtime: 'python',
                defaultCode: 'print("Hello, World!")'
            },
            cpp: {
                name: 'C++',
                extension: '.cpp',
                runtime: 'g++',
                defaultCode: `#include <iostream>
#include <string>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}`
            },
            c: {
                name: 'C',
                extension: '.c',
                runtime: 'gcc',
                defaultCode: `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}`
            }
        };
        
        this.currentProcess = null;
        this.isExecuting = false;
        this.outputCallbacks = new Map();
        this.errorCallbacks = new Map();
        this.endCallbacks = new Map();
    }

    // Get supported languages
    getSupportedLanguages() {
        return Object.keys(this.supportedLanguages).map(key => ({
            key,
            ...this.supportedLanguages[key]
        }));
    }

    // Get default code for a language
    getDefaultCode(language) {
        return this.supportedLanguages[language]?.defaultCode || '';
    }

    // Execute code with real-time output
    async executeCode(code, language, roomId, callbacks = {}) {
        if (this.isExecuting) {
            throw new Error('Another execution is already in progress');
        }

        this.isExecuting = true;
        const executionId = `${roomId}-${Date.now()}`;

        try {
            // Set up callbacks for this execution
            if (callbacks.onOutput) {
                this.outputCallbacks.set(executionId, callbacks.onOutput);
            }
            if (callbacks.onError) {
                this.errorCallbacks.set(executionId, callbacks.onError);
            }
            if (callbacks.onEnd) {
                this.endCallbacks.set(executionId, callbacks.onEnd);
            }

            // Emit execution start
            if (this.socketRef?.current) {
                this.socketRef.current.emit('execute-code', {
                    roomId,
                    code,
                    language
                });
            }

            // Set up socket listeners for real-time output
            if (this.socketRef?.current) {
                const socket = this.socketRef.current;

                // Listen for execution start
                socket.on('execution-start', (data) => {
                    if (data.roomId === roomId) {
                        if (callbacks.onStart) {
                            callbacks.onStart(data);
                        }
                    }
                });

                // Listen for real-time output
                socket.on('execution-output', (data) => {
                    if (data.roomId === roomId) {
                        const callback = this.outputCallbacks.get(executionId);
                        if (callback) {
                            callback(data.output);
                        }
                    }
                });

                // Listen for errors
                socket.on('execution-error', (data) => {
                    if (data.roomId === roomId) {
                        const callback = this.errorCallbacks.get(executionId);
                        if (callback) {
                            callback(data.error);
                        }
                    }
                });

                // Listen for execution end
                socket.on('execution-end', (data) => {
                    if (data.roomId === roomId) {
                        const callback = this.endCallbacks.get(executionId);
                        if (callback) {
                            callback(data.exitCode);
                        }
                        
                        // Clean up callbacks
                        this.outputCallbacks.delete(executionId);
                        this.errorCallbacks.delete(executionId);
                        this.endCallbacks.delete(executionId);
                        
                        this.isExecuting = false;
                    }
                });
            }

            return executionId;
        } catch (error) {
            this.isExecuting = false;
            throw error;
        }
    }

    // Stop current execution
    stopExecution(roomId) {
        if (this.socketRef?.current) {
            this.socketRef.current.emit('execution-stop', { roomId });
        }
        this.isExecuting = false;
    }

    // Check if currently executing
    isCurrentlyExecuting() {
        return this.isExecuting;
    }

    // Write file to workspace
    async writeFile(roomId, filename, content) {
        return new Promise((resolve, reject) => {
            if (!this.socketRef?.current) {
                reject(new Error('Socket not connected'));
                return;
            }

            this.socketRef.current.emit('file-write', {
                roomId,
                filename,
                content
            });

            this.socketRef.current.once('file-write', (data) => {
                if (data.success) {
                    resolve(data);
                } else {
                    reject(new Error(data.error));
                }
            });
        });
    }

    // Read file from workspace
    async readFile(roomId, filename) {
        return new Promise((resolve, reject) => {
            if (!this.socketRef?.current) {
                reject(new Error('Socket not connected'));
                return;
            }

            this.socketRef.current.emit('file-read', {
                roomId,
                filename
            });

            this.socketRef.current.once('file-read', (data) => {
                if (data.success) {
                    resolve(data.content);
                } else {
                    reject(new Error(data.error));
                }
            });
        });
    }

    // List files in workspace
    async listFiles(roomId) {
        return new Promise((resolve, reject) => {
            if (!this.socketRef?.current) {
                reject(new Error('Socket not connected'));
                return;
            }

            this.socketRef.current.emit('file-list', { roomId });

            this.socketRef.current.once('file-list', (data) => {
                if (data.success) {
                    resolve(data.files);
                } else {
                    reject(new Error(data.error));
                }
            });
        });
    }

    // Clean up resources
    cleanup() {
        this.outputCallbacks.clear();
        this.errorCallbacks.clear();
        this.endCallbacks.clear();
        this.isExecuting = false;
    }
}

export default CodeExecutor; 