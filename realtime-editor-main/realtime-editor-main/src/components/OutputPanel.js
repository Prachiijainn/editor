import React, { useState, useEffect } from 'react';
import './OutputPanel.css';

const OutputPanel = ({ 
    isVisible, 
    output, 
    isExecuting, 
    onClear, 
    onStop,
    onToggle,
    language 
}) => {
    const [inputValue, setInputValue] = useState('');
    const [showInput, setShowInput] = useState(false);

    useEffect(() => {
        // Auto-scroll to bottom when new output is added
        const outputElement = document.getElementById('output-content');
        if (outputElement) {
            outputElement.scrollTop = outputElement.scrollHeight;
        }
    }, [output]);

    const handleInputSubmit = (e) => {
        e.preventDefault();
        if (inputValue.trim()) {
            // Handle input submission
            setInputValue('');
            setShowInput(false);
        }
    };

    const formatOutput = (output) => {
        if (!output) return '';
        
        return output.split('\n').map((line, index) => {
            if (line.startsWith('Error:') || line.startsWith('Syntax error')) {
                return <div key={index} className="output-error">{line}</div>;
            } else if (line.trim()) {
                return <div key={index} className="output-line">{line}</div>;
            } else {
                return <div key={index} className="output-empty">&nbsp;</div>;
            }
        });
    };

    if (!isVisible) return null;

    return (
        <div className="output-panel">
            <div className="output-header">
                <div className="output-title">
                    <span className="output-icon">▶</span>
                    Output
                    {language && <span className="language-badge">{language.toUpperCase()}</span>}
                </div>
                <div className="output-controls">
                    {isExecuting && (
                        <button 
                            className="output-control-btn stop"
                            onClick={onStop}
                            title="Stop Execution"
                        >
                            ⏹
                        </button>
                    )}
                    <button 
                        className="output-control-btn clear"
                        onClick={onClear}
                        title="Clear Output"
                    >
                        🗑
                    </button>
                    <button 
                        className="output-control-btn minimize"
                        onClick={onToggle}
                        title="Minimize Output"
                    >
                        −
                    </button>
                </div>
            </div>
            
            <div className="output-content-wrapper">
                <div id="output-content" className="output-content">
                    {isExecuting && (
                        <div className="execution-status">
                            <span className="spinner">⏳</span>
                            Executing {language} code...
                        </div>
                    )}
                    
                    {output && (
                        <div className="output-results">
                            {output.stdout && (
                                <div className="stdout-section">
                                    <div className="section-header">stdout:</div>
                                    <div className="section-content">
                                        {formatOutput(output.stdout)}
                                    </div>
                                </div>
                            )}
                            
                            {output.stderr && (
                                <div className="stderr-section">
                                    <div className="section-header">stderr:</div>
                                    <div className="section-content">
                                        {formatOutput(output.stderr)}
                                    </div>
                                </div>
                            )}
                            
                            <div className="exit-status">
                                Exit code: <span className={output.exitCode === 0 ? 'success' : 'error'}>
                                    {output.exitCode}
                                </span>
                            </div>
                        </div>
                    )}
                    
                    {!output && !isExecuting && (
                        <div className="no-output">
                            No output yet. Run your code to see results here.
                        </div>
                    )}
                </div>
                
                {showInput && (
                    <div className="input-section">
                        <form onSubmit={handleInputSubmit}>
                            <div className="input-prompt">stdin:</div>
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Enter input..."
                                className="input-field"
                                autoFocus
                            />
                            <button type="submit" className="input-submit">↵</button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OutputPanel; 