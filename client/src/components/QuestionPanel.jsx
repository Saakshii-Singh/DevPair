import React, { useState, useEffect } from 'react';
import { BookOpen, Terminal, CheckCircle2, XCircle } from 'lucide-react';

function QuestionPanel({ 
  question, 
  onQuestionChange, 
  consoleOpen, 
  setConsoleOpen, 
  runResults, 
  isRunning,
  customInput,
  setCustomInput,
  setUseCustomInput
}) {
  const [questionsList, setQuestionsList] = useState([]);
  const [consoleTab, setConsoleTab] = useState('suite'); // 'suite' or 'custom'

  // Fetch list of questions on mount
  useEffect(() => {
    fetch('http://localhost:5000/api/questions')
      .then(res => res.json())
      .then(data => setQuestionsList(data))
      .catch(err => console.error('Error fetching questions:', err));
  }, []);

  // Update useCustomInput in parent when tab switches
  useEffect(() => {
    setUseCustomInput(consoleTab === 'custom');
  }, [consoleTab, setUseCustomInput]);

  // Sync console tab with runResults source (if we get custom run, open custom tab, if suite run, open suite tab)
  useEffect(() => {
    if (runResults) {
      if (runResults.isCustom) {
        setConsoleTab('custom');
      } else {
        setConsoleTab('suite');
      }
    }
  }, [runResults]);

  if (!question) return <div className="panel-body">Loading question...</div>;

  return (
    <div className="panel-container glass-panel">
      <div className="panel-header">
        <div className="panel-title">
          <BookOpen size={16} style={{ color: 'var(--primary)' }} />
          <span>Question Description</span>
        </div>
      </div>
      
      <div className="panel-body">
        {/* Sync Dropdown */}
        <select 
          value={question.id} 
          onChange={(e) => onQuestionChange(e.target.value)}
          className="question-select-dropdown"
        >
          {questionsList.map(q => (
            <option key={q.id} value={q.id}>
              {q.title} ({q.difficulty})
            </option>
          ))}
        </select>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>{question.title}</h2>
          <span className={`difficulty-badge ${question.difficulty.toLowerCase()}`}>
            {question.difficulty}
          </span>
        </div>

        {/* Category */}
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Category: <span style={{ color: 'var(--text-secondary)' }}>{question.category}</span>
        </div>

        {/* Description */}
        <div className="question-desc">
          {question.description}
        </div>

        {/* Examples */}
        {question.examples && question.examples.map((ex, index) => (
          <div key={index} className="example-box">
            <div className="example-title">Example {index + 1}:</div>
            <p><span>Input: </span> {ex.input}</p>
            <p><span>Output: </span> {ex.output}</p>
            {ex.explanation && <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}><span>Explanation: </span> {ex.explanation}</p>}
          </div>
        ))}

        {/* Constraints */}
        {question.constraints && (
          <div style={{ marginTop: '1.25rem', marginBottom: '60px' }}> {/* Add spacing at the bottom so console doesn't hide text */}
            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Constraints:</h3>
            <ul className="constraints-list">
              {question.constraints.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Code Run Console Overlay */}
        <div className={`console-panel ${consoleOpen ? 'open' : ''}`} style={{ height: '320px' }}>
          <div className="console-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 'bold' }}>
              <Terminal size={14} style={{ color: 'var(--success)' }} />
              <span>TEST RUN CONSOLE</span>
            </div>
            <button className="console-close" onClick={() => setConsoleOpen(false)}>✕</button>
          </div>

          {/* Console Tab Selectors */}
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--glass-border)' }}>
            <button
              onClick={() => setConsoleTab('suite')}
              className={`console-tab-btn ${consoleTab === 'suite' ? 'active' : ''}`}
            >
              Test Suite
            </button>
            <button
              onClick={() => setConsoleTab('custom')}
              className={`console-tab-btn ${consoleTab === 'custom' ? 'active' : ''}`}
            >
              Custom Input
            </button>
          </div>
          
          <div className="console-body" style={{ flexGrow: 1, overflowY: 'auto' }}>
            {consoleTab === 'suite' ? (
              isRunning ? (
                <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="video-placeholder-icon">⚙️</span>
                  <span>Executing test suite in secure sandbox...</span>
                </div>
              ) : runResults && !runResults.isCustom ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.5rem' }}>
                    <span>
                      Status: <b style={{ color: runResults.allPassed ? 'var(--success)' : 'var(--danger)' }}>
                        {runResults.allPassed ? 'Accepted' : 'Failed'}
                      </b>
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Passed {runResults.passedCount} / {runResults.totalCount} tests
                    </span>
                  </div>

                  {runResults.error ? (
                    <div style={{ color: 'var(--danger)', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <strong>Runtime Error:</strong>
                      <pre style={{ marginTop: '0.25rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
                        {runResults.error}
                      </pre>
                    </div>
                  ) : (
                    runResults.results.map((res, index) => (
                      <div key={index} className={`console-test-row ${res.passed ? 'pass' : 'fail'}`}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className={`console-status ${res.passed ? 'pass' : 'fail'}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {res.passed ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            <span>Case {index + 1}</span>
                          </span>
                        </div>
                        <div style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <div><b>Input: </b><code>{res.input}</code></div>
                          <div><b>Expected: </b><code>{JSON.stringify(res.expected)}</code></div>
                          <div><b>Actual: </b><code style={{ color: res.passed ? 'var(--success)' : 'var(--danger)' }}>{JSON.stringify(res.actual)}</code></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Run your code to compile and validate test cases.
                </div>
              )
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
                <div>
                  <span className="form-label" style={{ fontSize: '0.7rem', marginBottom: '0.25rem', display: 'block' }}>
                    Parameters (JSON array)
                  </span>
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    className="custom-input-textarea"
                    placeholder={`Enter JSON list of arguments, e.g. [[2, 7, 11, 15], 9]`}
                  />
                </div>
                
                <div className="custom-run-result" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.5rem' }}>
                  {isRunning ? (
                    <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="video-placeholder-icon">⚙️</span>
                      <span>Executing custom parameters...</span>
                    </div>
                  ) : runResults && runResults.isCustom ? (
                    <div>
                      {runResults.error ? (
                        <div style={{ color: 'var(--danger)', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                          <strong>Runtime Error:</strong>
                          <pre style={{ marginTop: '0.25rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
                            {runResults.error}
                          </pre>
                        </div>
                      ) : (
                        <div className="console-test-row pass" style={{ borderLeftColor: 'var(--primary)', padding: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                            <span className="console-status pass" style={{ color: 'var(--primary)' }}>Run Success</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Time: {runResults.duration}ms</span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <div><b>Input: </b><code>{runResults.inputStr}</code></div>
                            <div style={{ marginTop: '4px' }}>
                              <b>Output: </b>
                              <code style={{ color: 'var(--text-primary)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                                {JSON.stringify(runResults.result)}
                              </code>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      Enter arguments above and click Run Code in the editor.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuestionPanel;
