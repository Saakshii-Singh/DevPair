import React, { useState, useEffect } from 'react';
import QuestionPanel from './QuestionPanel';
import CodeEditorPanel from './CodeEditorPanel';
import VideoPanel from './VideoPanel';
import ChatPanel from './ChatPanel';
import ScorecardModal from './ScorecardModal';
import { LogOut, Clock, ShieldAlert } from 'lucide-react';

function InterviewRoom({ socket, roomData, onLeave, username }) {
  const [question, setQuestion] = useState(roomData.question);
  const [initialCode, setInitialCode] = useState(roomData.initialCode);
  const [initialLanguage, setInitialLanguage] = useState(roomData.initialLanguage);

  // Console execution states
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runResults, setRunResults] = useState(null);

  // Custom Input States
  const [customInput, setCustomInput] = useState('');
  const [useCustomInput, setUseCustomInput] = useState(false);

  // Timer States
  const [timer, setTimer] = useState(2700); // 45 minutes in seconds

  // Scorecard States
  const [showScorecard, setShowScorecard] = useState(false);
  const [scorecardData, setScorecardData] = useState(null);

  // Initialize custom input when question changes
  useEffect(() => {
    if (question && question.testCases && question.testCases[0]) {
      setCustomInput(question.testCases[0].inputStr || JSON.stringify(question.testCases[0].input));
    }
  }, [question]);

  // Countdown timer interval
  useEffect(() => {
    // Stop timer if scorecard is shown
    if (showScorecard) return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // If timer runs out, automatically show evaluation scorecard
          setShowScorecard(true);
          if (socket && roomData.role === 'Interviewer') {
            socket.emit('session-ended', { roomId: roomData.roomId });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showScorecard, socket, roomData.roomId, roomData.role]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Listen for question change sync
    socket.on('question-change', (data) => {
      setQuestion(data.question);
      setInitialCode(data.code);
      setRunResults(null); // Clear previous runs
    });

    // Listen for timer extension sync
    socket.on('add-time', ({ minutes }) => {
      setTimer((prev) => prev + minutes * 60);
    });

    // Listen for interviewer ending the session
    socket.on('session-ended', () => {
      setShowScorecard(true);
    });

    // Listen for submitted evaluation report
    socket.on('feedback-submitted', ({ scorecard }) => {
      setScorecardData(scorecard);
      setShowScorecard(true);
    });

    return () => {
      socket.off('question-change');
      socket.off('add-time');
      socket.off('session-ended');
      socket.off('feedback-submitted');
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

  const handleAddTime = (minutes) => {
    if (socket && roomData.roomId) {
      socket.emit('add-time', { roomId: roomData.roomId, minutes });
    }
  };

  const handleEndSessionClick = () => {
    if (roomData.role === 'Interviewer') {
      if (window.confirm("Are you sure you want to end the session? This will open the candidate scorecard evaluation.")) {
        setShowScorecard(true);
        if (socket && roomData.roomId) {
          socket.emit('session-ended', { roomId: roomData.roomId });
        }
      }
    } else {
      if (window.confirm("Are you sure you want to leave the room? You will miss the interviewer's scorecard rating review.")) {
        onLeave();
      }
    }
  };

  const handleScorecardSubmit = (scorecard) => {
    if (socket && roomData.roomId) {
      socket.emit('submit-feedback', { roomId: roomData.roomId, scorecard });
    }
  };

  // Safe client-side code runner for JavaScript
  const executeCode = (userCode, handlerName, testCases) => {
    try {
      // Setup the function constructor sandbox
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
        
        // Match outputs (stringify is sufficient for comparison)
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
      if (useCustomInput) {
        try {
          let parsedArgs;
          try {
            parsedArgs = JSON.parse(customInput);
            if (!Array.isArray(parsedArgs)) {
              throw new Error("Custom parameters must be formatted as a JSON array of arguments.");
            }
          } catch (e) {
            setRunResults({
              error: `Invalid Arguments Format: ${e.message}\nEnsure it is a valid JSON array, e.g. [[2,7,11,15], 9] or ["()"]`,
              isCustom: true
            });
            setIsRunning(false);
            return;
          }

          const buildFunction = new Function(`
            ${code}
            if (typeof ${question.handlerName} === 'undefined') {
              throw new Error("Function '${question.handlerName}' is not defined.");
            }
            return ${question.handlerName};
          `);

          const userFn = buildFunction();
          const t0 = performance.now();
          const result = userFn(...parsedArgs);
          const t1 = performance.now();

          setRunResults({
            result,
            duration: (t1 - t0).toFixed(2),
            error: null,
            isCustom: true,
            inputStr: customInput
          });
        } catch (err) {
          setRunResults({
            error: err.message || err.toString(),
            isCustom: true,
            inputStr: customInput
          });
        } finally {
          setIsRunning(false);
        }
      } else {
        const outcome = executeCode(code, question.handlerName, question.testCases);
        setRunResults({ ...outcome, isCustom: false });
        setIsRunning(false);
      }
    }, 800);
  };

  // Format timer
  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getTimerColorClass = () => {
    if (timer <= 60) return 'timer-critical';
    if (timer <= 300) return 'timer-warning';
    return 'timer-normal';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Platform Header */}
      <header className="room-header">
        <div className="room-header-title">
          <span style={{ color: 'var(--primary)' }}>⚡</span> DevPair Room
        </div>

        {/* Sync Countdown Timer */}
        <div className={`room-timer-container ${getTimerColorClass()}`}>
          <Clock size={16} />
          <span className="timer-text">{formatTimer(timer)}</span>
          
          {roomData.role === 'Interviewer' && (
            <div className="timer-extension-btns">
              <button onClick={() => handleAddTime(5)} title="Add 5 Minutes">+5m</button>
              <button onClick={() => handleAddTime(10)} title="Add 10 Minutes">+10m</button>
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="room-header-status">
            <span className="status-dot"></span>
            <span>Live Session</span>
          </div>

          <button onClick={handleEndSessionClick} className="btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
            customInput={customInput}
            setCustomInput={setCustomInput}
            setUseCustomInput={setUseCustomInput}
          />
        </div>

        {/* Middle: Real-time Monaco Text Editor & Whiteboard Canvas */}
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

      {/* Post-Interview Evaluation Scorecard Modal Overlay */}
      {showScorecard && (
        <ScorecardModal 
          role={roomData.role}
          peer={roomData.peer}
          username={username}
          onSubmit={handleScorecardSubmit}
          scorecardData={scorecardData}
          onBackToLobby={onLeave}
        />
      )}
    </div>
  );
}

export default InterviewRoom;
