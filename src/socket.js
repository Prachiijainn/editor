import { io } from 'socket.io-client';

export const initSocket = async () => {
    const options = {
        'force new connection': true,
        reconnection: true,
        reconnectionAttempts: 'Infinity',
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 30000,
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true,
    };

    // Use environment variable or default to current host for production/development
    const backendUrl = process.env.REACT_APP_BACKEND_URL || (process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:3333');
    return io(backendUrl, options);
};