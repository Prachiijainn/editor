const ACTIONS = {
    JOIN: 'join',
    JOINED: 'joined',
    DISCONNECTED: 'disconnected',
    CODE_CHANGE: 'code-change',
    SYNC_CODE: 'sync-code',
    LEAVE: 'leave',
    // Terminal actions
    TERMINAL_COMMAND: 'terminal-command',
    TERMINAL_OUTPUT: 'terminal-output',
    TERMINAL_RESIZE: 'terminal-resize',
    TERMINAL_EXIT: 'terminal-exit',
    // Code execution actions
    EXECUTE_CODE: 'execute-code',
    EXECUTION_START: 'execution-start',
    EXECUTION_OUTPUT: 'execution-output',
    EXECUTION_ERROR: 'execution-error',
    EXECUTION_END: 'execution-end',
    EXECUTION_STOP: 'execution-stop',
    // File operations
    FILE_READ: 'file-read',
    FILE_WRITE: 'file-write',
    FILE_DELETE: 'file-delete',
    FILE_LIST: 'file-list'
};

module.exports = ACTIONS;