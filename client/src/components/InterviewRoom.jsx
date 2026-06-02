import React, { useState, useEffect } from 'react';
import QuestionPanel from './QuestionPanel';
import CodeEditorPanel from './CodeEditorPanel';
import VideoPanel from './VideoPanel';
import ChatPanel from './ChatPanel';
import { LogOut, Users } from 'lucide-react';

function InterviewRoom({ socket, roomData, onLeave, username }) {
  const [question, setQuestion] = useState(roomData.question);
  const [initialCode, setInitialCode] = useState(roomData.initialCode);
  const [initialLanguage, setInitialLanguage] = useState(roomData.initialLanguage);

  // Console execution states
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runResults, setRunResults] = useState(null);

  useEffect(() => {
    if (!socket) return;

    // Listen for question change sync
    socket.on('question-change', (data) => {
      setQuestion(data.question);
      setInitialCode(data.code);
      setRunResults(null); // Clear previous runs
    });

    return () => {
      socket.off('question-change');
    };
  }, [socket]);

  const handleQuestionChange = (newQuestionId) => {
    if (socket && roomData.roomId) {
      socket.emit('question-change', {
        roomId: roomData.roomId,
        questionId: newQuestionId
      });
    }
  };

  // Safe client-side code runner for JavaScript
  const executeCode = (userCode, handlerName, testCases) => {
    try {
      // Setup the function constructor sandbox
      // Inject the code string, and return the function referenced by handlerName
      const buildFunction = new Function(`
        ${userCode}
        if (typeof ${handlerName} === 'undefined') {
          throw new Error("Function '${handlerName}' is not defined. Ensure your code contains this function name.");
        }
        return ${handlerName};
      `);

      const userFn = buildFunction();

      // Run each test case
      const results = testCases.map(tc => {
        // Deep clone inputs to avoid side effects
        const inputArgs = JSON.parse(JSON.stringify(tc.input));
        
        // Execute the function
        const actual = userFn(...inputArgs);
        
        // Match outputs (stringify is sufficient for arrays/primitives comparison)
        const expected = tc.expectedOutput;
        const passed = JSON.stringify(actual) === JSON.stringify(expected);

        return {
          input: tc.inputStr,
          expected,
          actual,
          passed
        };
      });

      const allPassed = results.every(r => r.passed);
      const passedCount = results.filter(r => r.passed).length;

      return {
        results,
        allPassed,
        passedCount,
        totalCount: testCases.length,
        error: null
      };

    } catch (err) {
      return {
        results: [],
        allPassed: false,
        passedCount: 0,
        totalCount: testCases.length,
        error: err.message || err.toString()
      };
    }
  };

  const handleRunCode = (code, language) => {
    if (language !== 'javascript') return;

    setConsoleOpen(true);
    setIsRunning(true);
    setRunResults(null);

    // Simulate small compiler loading lag for premium UI feedback feel
    setTimeout(() => {
      const outcome = executeCode(code, question.handlerName, question.testCases);
      setRunResults(outcome);
      setIsRunning(false);
    }, 800);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Platform Header */}
      <header className="room-header">
        <div className="room-header-title">
          <span style={{ color: 'var(--primary)' }}>⚡</span> DevPair Room
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="room-header-status">
            <span className="status-dot"></span>
            <span>Live Session</span>
          </div>

          <button onClick={onLeave} className="btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LogOut size={12} />
            <span>End Session</span>
          </button>
        </div>
      </header>

      {/* Primary Workspace Grid */}
      <div className="room-layout" style={{ flexGrow: 1, minHeight: 0 }}>
        {/* Left Side: Question description & logs console */}
        <div className="panel-container">
          <QuestionPanel 
            question={question}
            onQuestionChange={handleQuestionChange}
            consoleOpen={consoleOpen}
            setConsoleOpen={setConsoleOpen}
            runResults={runResults}
            isRunning={isRunning}
          />
        </div>

        {/* Middle: Real-time Monaco Text Editor */}
        <div className="panel-container">
          <CodeEditorPanel 
            socket={socket}
            roomId={roomData.roomId}
            question={question}
            initialCode={initialCode}
            initialLanguage={initialLanguage}
            onRunCode={handleRunCode}
          />
        </div>

        {/* Right Side: Stack of 1v1 streams and chat rooms */}
        <div className="sidebar-right">
          <VideoPanel 
            socket={socket}
            roomId={roomData.roomId}
            role={roomData.role}
            peer={roomData.peer}
            username={username}
          />
          <ChatPanel 
            socket={socket}
            roomId={roomData.roomId}
            username={username}
          />
        </div>
      </div>
    </div>
  );
}

export default InterviewRoom;
