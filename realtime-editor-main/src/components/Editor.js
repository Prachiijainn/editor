
import React, { useEffect, useRef, useState } from 'react';
import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/python/python';
import 'codemirror/mode/clike/clike';
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';
import ACTIONS from '../Actions';
import LanguageSelector from './LanguageSelector';
import CodeExecutor from '../services/CodeExecutor';
import './Editor.css';

const Editor = ({ socketRef, roomId, onCodeChange, onOutputChange, isOutputVisible }) => {
    const editorRef = useRef(null);
    const [selectedLanguage, setSelectedLanguage] = useState('javascript');
    const [isExecuting, setIsExecuting] = useState(false);
    const [output, setOutput] = useState(null);
    const [realTimeOutput, setRealTimeOutput] = useState('');
    const [executionErrors, setExecutionErrors] = useState('');
    const codeExecutor = useRef(null);

    useEffect(() => {
        // Initialize CodeExecutor with socket reference
        codeExecutor.current = new CodeExecutor(socketRef);

        async function init() {
            editorRef.current = Codemirror.fromTextArea(
                document.getElementById('realtimeEditor'),
                {
                    mode: { name: 'javascript', json: true },
                    theme: 'dracula',
                    autoCloseTags: true,
                    autoCloseBrackets: true,
                    lineNumbers: true,
                }
            );

            editorRef.current.on('change', (instance, changes) => {
                const { origin } = changes;
                const code = instance.getValue();
                onCodeChange(code);
                if (origin !== 'setValue') {
                    socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                        roomId,
                        code,
                    });
                }
            });
        }
        init();

        return () => {
            if (codeExecutor.current) {
                codeExecutor.current.cleanup();
            }
        };
    }, [socketRef]);

    useEffect(() => {
        if (socketRef.current) {
            socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
                if (code !== null) {
                    editorRef.current.setValue(code);
                }
            });
        }

        return () => {
            socketRef.current.off(ACTIONS.CODE_CHANGE);
        };
    }, [socketRef.current]);

    const handleLanguageChange = (language) => {
        setSelectedLanguage(language);
        const defaultCode = codeExecutor.current.getDefaultCode(language);
        if (editorRef.current) {
            editorRef.current.setValue(defaultCode);
        }
        
        // Update editor mode based on language
        let mode;
        switch (language) {
            case 'javascript':
                mode = { name: 'javascript', json: true };
                break;
            case 'python':
                mode = 'python';
                break;
            case 'cpp':
            case 'c':
                mode = 'text/x-c++src';
                break;
            default:
                mode = { name: 'javascript', json: true };
        }
        editorRef.current.setOption('mode', mode);
    };

    const handleRunCode = async () => {
        if (isExecuting) return;

        const code = editorRef.current.getValue();
        if (!code.trim()) {
            setOutput({
                success: false,
                stdout: '',
                stderr: 'No code to execute',
                exitCode: 1
            });
            return;
        }

        setIsExecuting(true);
        setOutput(null);
        setRealTimeOutput('');
        setExecutionErrors('');

        try {
            await codeExecutor.current.executeCode(code, selectedLanguage, roomId, {
                onStart: (data) => {
                    setRealTimeOutput(`Starting execution of ${data.language} code...\n`);
                },
                onOutput: (output) => {
                    setRealTimeOutput(prev => prev + output);
                    setOutput({
                        success: true,
                        stdout: realTimeOutput + output,
                        stderr: executionErrors,
                        exitCode: 0
                    });
                    if (onOutputChange) {
                        onOutputChange({
                            success: true,
                            stdout: realTimeOutput + output,
                            stderr: executionErrors,
                            exitCode: 0,
                            language: selectedLanguage
                        });
                    }
                },
                onError: (error) => {
                    setExecutionErrors(prev => prev + error);
                    setOutput({
                        success: false,
                        stdout: realTimeOutput,
                        stderr: executionErrors + error,
                        exitCode: 1
                    });
                    if (onOutputChange) {
                        onOutputChange({
                            success: false,
                            stdout: realTimeOutput,
                            stderr: executionErrors + error,
                            exitCode: 1,
                            language: selectedLanguage
                        });
                    }
                },
                onEnd: (exitCode) => {
                    setIsExecuting(false);
                    setOutput(prev => ({
                        ...prev,
                        exitCode,
                        success: exitCode === 0
                    }));
                    if (onOutputChange) {
                        onOutputChange({
                            ...output,
                            exitCode,
                            success: exitCode === 0,
                            language: selectedLanguage
                        });
                    }
                }
            });
        } catch (error) {
            setIsExecuting(false);
            setOutput({
                success: false,
                stdout: '',
                stderr: error.message,
                exitCode: 1
            });
            if (onOutputChange) {
                onOutputChange({
                    success: false,
                    stdout: '',
                    stderr: error.message,
                    exitCode: 1,
                    language: selectedLanguage
                });
            }
        }
    };

    const handleStopExecution = () => {
        codeExecutor.current.stopExecution(roomId);
        setIsExecuting(false);
    };

    const handleClearOutput = () => {
        setOutput(null);
        setRealTimeOutput('');
        setExecutionErrors('');
        if (onOutputChange) {
            onOutputChange(null);
        }
    };

    const supportedLanguages = codeExecutor.current?.getSupportedLanguages() || [];

    return (
        <div className="editor-container">
            <div className="editor-toolbar">
                <div className="toolbar-left">
                    <LanguageSelector
                        selectedLanguage={selectedLanguage}
                        onLanguageChange={handleLanguageChange}
                        supportedLanguages={supportedLanguages}
                    />
                </div>
                <div className="toolbar-right">
                    <button
                        className={`run-button ${isExecuting ? 'executing' : ''}`}
                        onClick={handleRunCode}
                        disabled={isExecuting}
                        title={isExecuting ? 'Executing...' : 'Run Code'}
                    >
                        {isExecuting ? (
                            <>
                                <span className="spinner">⏳</span>
                                Running...
                            </>
                        ) : (
                            <>
                                <span className="run-icon">▶</span>
                                Run
                            </>
                        )}
                    </button>
                    {isExecuting && (
                        <button
                            className="stop-button"
                            onClick={handleStopExecution}
                            title="Stop Execution"
                        >
                            ⏹
                        </button>
                    )}
                    <button
                        className="clear-button"
                        onClick={handleClearOutput}
                        title="Clear Output"
                    >
                        🗑
                    </button>
                </div>
            </div>
            <textarea id="realtimeEditor"></textarea>
        </div>
    );
};

export default Editor;
