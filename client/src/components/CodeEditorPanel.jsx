import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Code, Play, Edit3 } from 'lucide-react';
import WhiteboardPanel from './WhiteboardPanel';

function CodeEditorPanel({ 
  socket, 
  roomId, 
  question, 
  initialCode, 
  initialLanguage, 
  onRunCode 
}) {
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState(initialLanguage);
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' or 'whiteboard'
  const editorRef = useRef(null);

  // Sync state if question or initials change
  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  useEffect(() => {
    setLanguage(initialLanguage);
  }, [initialLanguage]);

  // Socket listener for code sync
  useEffect(() => {
    if (!socket) return;

    socket.on('code-change', (data) => {
      if (data.code !== code) {
        setCode(data.code);
      }
    });

    socket.on('language-change', (data) => {
      setLanguage(data.language);
      setCode(data.code);
    });

    return () => {
      socket.off('code-change');
      socket.off('language-change');
    };
  }, [socket, code]);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  const handleEditorChange = (value) => {
    if (value === undefined) return;
    setCode(value);

    // Emit change to the signaling server
    if (socket && roomId) {
      socket.emit('code-change', { roomId, code: value });
    }
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    
    // Retrieve starter code for the selected language
    const starterTemplate = question.starterCode[newLang] || '';
    setCode(starterTemplate);

    if (socket && roomId) {
      socket.emit('language-change', { 
        roomId, 
        language: newLang, 
        code: starterTemplate 
      });
    }
  };

  const handleRunClick = () => {
    onRunCode(code, language);
  };

  // Convert editor languages to monaco friendly names
  const getMonacoLang = (lang) => {
    if (lang === 'cpp') return 'cpp';
    if (lang === 'python') return 'python';
    return 'javascript';
  };

  return (
    <div className="panel-container glass-panel" style={{ height: '100%' }}>
      <div className="panel-header" style={{ padding: '0 1rem', height: '48px', minHeight: '48px' }}>
        {/* Toggle tabs on the left */}
        <div style={{ display: 'flex', height: '100%', alignItems: 'center' }}>
          <button
            onClick={() => setActiveTab('editor')}
            className={`room-tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Code size={14} />
            <span>Code Editor</span>
          </button>
          <button
            onClick={() => setActiveTab('whiteboard')}
            className={`room-tab-btn ${activeTab === 'whiteboard' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Edit3 size={14} />
            <span>Whiteboard</span>
          </button>
        </div>
        
        {/* Actions on the right, only for Editor */}
        {activeTab === 'editor' && (
          <div className="editor-header-actions">
            <select 
              value={language} 
              onChange={handleLanguageChange}
              className="select-lang"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="cpp">C++</option>
            </select>
          </div>
        )}
      </div>

      <div className="panel-body" style={{ padding: 0, overflow: 'hidden', height: 'calc(100% - 48px)' }}>
        {activeTab === 'editor' ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="editor-wrapper" style={{ flexGrow: 1 }}>
              <Editor
                height="100%"
                language={getMonacoLang(language)}
                theme="vs-dark"
                value={code}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontFamily: 'var(--font-mono)',
                  lineHeight: 22,
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  padding: { top: 12, bottom: 12 },
                  cursorBlinking: 'smooth',
                  cursorSmoothCaretAnimation: 'on',
                  smoothScrolling: true,
                }}
              />
            </div>
            <div className="editor-footer">
              {language !== 'javascript' && (
                <div style={{
                  marginRight: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)'
                }}>
                  ⚠️ Run Code is only available for JavaScript
                </div>
              )}
              <button 
                className="btn-run" 
                onClick={handleRunClick}
                disabled={language !== 'javascript'}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  opacity: language === 'javascript' ? 1 : 0.5,
                  cursor: language === 'javascript' ? 'pointer' : 'not-allowed'
                }}
              >
                <Play size={14} fill="white" />
                <span>Run Code</span>
              </button>
            </div>
          </div>
        ) : (
          <WhiteboardPanel socket={socket} roomId={roomId} />
        )}
      </div>
    </div>
  );
}

export default CodeEditorPanel;
