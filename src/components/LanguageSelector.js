import React, { useState, useRef, useEffect } from 'react';
import './LanguageSelector.css';

const LanguageSelector = ({ 
    selectedLanguage, 
    onLanguageChange, 
    supportedLanguages,
    isVisible = true 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLanguageSelect = (language) => {
        onLanguageChange(language);
        setIsOpen(false);
    };

    const getLanguageIcon = (language) => {
        const icons = {
            javascript: '⚡',
            python: '🐍',
            cpp: '⚙️',
            c: '🔧'
        };
        return icons[language] || '📄';
    };

    const getLanguageColor = (language) => {
        const colors = {
            javascript: '#f7df1e',
            python: '#3776ab',
            cpp: '#00599c',
            c: '#a8b9cc'
        };
        return colors[language] || '#888';
    };

    if (!isVisible) return null;

    return (
        <div className="language-selector" ref={dropdownRef}>
            <button 
                className="language-selector-btn"
                onClick={() => setIsOpen(!isOpen)}
                title="Select Programming Language"
            >
                <span 
                    className="language-icon"
                    style={{ color: getLanguageColor(selectedLanguage) }}
                >
                    {getLanguageIcon(selectedLanguage)}
                </span>
                <span className="language-name">
                    {supportedLanguages.find(lang => lang.key === selectedLanguage)?.name || 'Select Language'}
                </span>
                <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
            </button>
            
            {isOpen && (
                <div className="language-dropdown">
                    {supportedLanguages.map((language) => (
                        <button
                            key={language.key}
                            className={`language-option ${selectedLanguage === language.key ? 'selected' : ''}`}
                            onClick={() => handleLanguageSelect(language.key)}
                        >
                            <span 
                                className="language-icon"
                                style={{ color: getLanguageColor(language.key) }}
                            >
                                {getLanguageIcon(language.key)}
                            </span>
                            <span className="language-name">{language.name}</span>
                            {selectedLanguage === language.key && (
                                <span className="selected-indicator">✓</span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LanguageSelector; 