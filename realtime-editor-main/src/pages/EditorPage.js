import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import ACTIONS from '../Actions';
import Client from '../components/Client';
import Editor from '../components/Editor';
import TerminalComponent from '../components/Terminal';
import OutputPanel from '../components/OutputPanel';
import { initSocket } from '../socket';
import {
    useLocation,
    useNavigate,
    Navigate,
    useParams,
} from 'react-router-dom';

const EditorPage = () => {
    const socketRef = useRef(null);
    const codeRef = useRef(null);
    const location = useLocation();
    const { roomId } = useParams();
    const reactNavigator = useNavigate();
    const [clients, setClients] = useState([]);
    const [isTerminalVisible, setIsTerminalVisible] = useState(false);
    const [isOutputVisible, setIsOutputVisible] = useState(false);
    const [output, setOutput] = useState(null);
    const [isExecuting, setIsExecuting] = useState(false);

    useEffect(() => {
        const init = async () => {
            socketRef.current = await initSocket();
            socketRef.current.on('connect_error', (err) => handleErrors(err));
            socketRef.current.on('connect_failed', (err) => handleErrors(err));

            function handleErrors(e) {
                console.log('socket error', e);
                toast.error('Socket connection failed, try again later.');
                reactNavigator('/');
            }

            socketRef.current.emit(ACTIONS.JOIN, {
                roomId,
                username: location.state?.username,
            });

            // Listening for joined event
            socketRef.current.on(
                ACTIONS.JOINED,
                ({ clients, username, socketId }) => {
                    if (username !== location.state?.username) {
                        toast.success(`${username} joined the room.`);
                        console.log(`${username} joined`);
                    }
                    setClients(clients);
                    socketRef.current.emit(ACTIONS.SYNC_CODE, {
                        code: codeRef.current,
                        socketId,
                    });
                }
            );

            // Listening for disconnected
            socketRef.current.on(
                ACTIONS.DISCONNECTED,
                ({ socketId, username }) => {
                    toast.success(`${username} left the room.`);
                    setClients((prev) => {
                        return prev.filter(
                            (client) => client.socketId !== socketId
                        );
                    });
                }
            );
        };
        init();
        return () => {
            socketRef.current.disconnect();
            socketRef.current.off(ACTIONS.JOINED);
            socketRef.current.off(ACTIONS.DISCONNECTED);
        };
    }, []);

    async function copyRoomId() {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID has been copied to your clipboard');
        } catch (err) {
            toast.error('Could not copy the Room ID');
            console.error(err);
        }
    }

    function leaveRoom() {
        reactNavigator('/');
    }

    const toggleTerminal = () => {
        setIsTerminalVisible(!isTerminalVisible);
        if (isOutputVisible) {
            setIsOutputVisible(false);
        }
    };

    const toggleOutput = () => {
        setIsOutputVisible(!isOutputVisible);
        if (isTerminalVisible) {
            setIsTerminalVisible(false);
        }
    };

    const handleOutputChange = (newOutput) => {
        setOutput(newOutput);
        if (newOutput) {
            setIsOutputVisible(true);
        }
    };

    const handleClearOutput = () => {
        setOutput(null);
    };

    const handleStopExecution = () => {
        setIsExecuting(false);
        // Additional stop logic can be added here
    };

    if (!location.state) {
        return <Navigate to="/" />;
    }

    return (
        <div className="mainWrap">
            <div className="aside">
                <div className="asideInner">
                    <div className="logo">
                        <img
                            className="logoImage"
                            src="/NadeX.png"
                            alt="logo"
                        />
                    </div>
                    <h3>Connected</h3>
                    <div className="clientsList">
                        {clients.map((client) => (
                            <Client
                                key={client.socketId}
                                username={client.username}
                            />
                        ))}
                    </div>
                </div>
                <button className="btncopyBtn" onClick={copyRoomId}>
                    Copy ROOM ID
                </button>
                <button className="btn leaveBtn" onClick={leaveRoom}>
                    Leave
                </button>
            </div>
            <div className="editorWrap">
                <Editor
                    socketRef={socketRef}
                    roomId={roomId}
                    onCodeChange={(code) => {
                        codeRef.current = code;
                    }}
                    onOutputChange={handleOutputChange}
                    isOutputVisible={isOutputVisible}
                />
            </div>
            
            {/* Output Panel */}
            <OutputPanel
                isVisible={isOutputVisible}
                output={output}
                isExecuting={isExecuting}
                onClear={handleClearOutput}
                onStop={handleStopExecution}
                onToggle={toggleOutput}
                language={output?.language}
            />
            
            {/* Output Toggle Button */}
            <button 
                className="output-toggle-btn"
                onClick={toggleOutput}
                title="Toggle Output Panel"
            >
                {isOutputVisible ? '−' : '▶'}
            </button>
            
            {/* Terminal Toggle Button */}
            <button 
                className="terminal-toggle-btn"
                onClick={toggleTerminal}
                title="Toggle Terminal"
            >
                {isTerminalVisible ? '−' : '⚡'}
            </button>
            
            {/* Terminal Component */}
            <TerminalComponent
                socketRef={socketRef}
                roomId={roomId}
                isVisible={isTerminalVisible}
                onToggle={toggleTerminal}
            />
        </div>
    );
};

export default EditorPage;