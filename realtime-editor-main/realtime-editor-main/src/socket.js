import { io } from 'socket.io-client';

export const initSocket = async () => {
    const options = {
        'force new connection': true,
        reconnectionAttempt: 'Infinity',
        timeout: 10000,
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true,
    };
    
    // Use the same host and port as the server
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://realtime-editor-2b16.onrender.com';
    return io(backendUrl, options);
};