import { io } from 'socket.io-client';

export const initSocket = async () => {
    const options = {
        'force new connection': true,
        reconnection: true,
        reconnectionAttempts: 'Infinity',
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true,
    };

    // Use environment variable or default to localhost for development
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3333';
    return io(backendUrl, options);
};