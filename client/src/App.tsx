import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Terminal, Users, User, Brain, Code, Sparkles, Mic, Play, PhoneOff, Video, Award, Send, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import Editor from '@monaco-editor/react';

const SOCKET_URL = 'http://localhost:5000';
const sarahImg = "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=256";

// Interface Definitions
interface Problem {
  id: string;
  title: string;
  difficulty: string;
  description: string;
  starterTemplate: string;
}

interface Scorecard {
  technicalScore: number;
  communicationScore: number;
  behavioralScore: number;
  overallScore: number;
  strengths: string[];
  improvements: string[];
  feedback: string;
  optimizedCode: string;
}

// ==========================================
// 1. VANTAGE LANDING PAGE
// ==========================================
function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="pt-16">
        <section className="px-6 py-20">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-12 gap-8 items-end">
              <div className="col-span-12 lg:col-span-8">
                <div className="inline-flex items-center gap-2 mb-8 px-3 py-1 rounded-full border border-hairline bg-surface/50 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400">
                  <span className="size-1.5 rounded-full bg-accent animate-pulse" />
                  Now with Adaptive AI Feedback v4
                </div>
                <h1 className="font-serif-display text-6xl md:text-8xl lg:text-9xl text-foreground leading-[0.95] text-balance mb-10">
                  The new standard for <span className="italic text-accent">talent</span> assessment.
                </h1>
                <p className="max-w-[52ch] text-lg text-zinc-400 text-pretty mb-12">
                  Evaluate candidates through high-fidelity AI simulations or connect with expert human interviewers on a single, integrated platform.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link
                    to="/practice"
                    className="bg-accent text-accent-foreground px-6 py-3 rounded-full text-sm font-semibold flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-accent/20 animate-fade-in"
                  >
                    <svg className="size-4 shrink-0" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M3 2v12l10-6-10-6z" />
                    </svg>
                    Practice with AI
                  </Link>
                  <Link
                    to="/p2p-lobby"
                    className="bg-surface text-foreground px-6 py-3 rounded-full text-sm font-medium border border-hairline flex items-center gap-2 hover:bg-surface-2 transition-colors"
                  >
                    Schedule with Peer
                  </Link>
                </div>
              </div>
              <div className="hidden lg:block lg:col-span-4">
                <div className="border-l border-hairline pl-8 pb-4">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-6">
                    Trusted by innovators
                  </div>
                  <div className="space-y-5">
                    {["Starlight Systems", "Linear Dynamic", "Veridian Global", "Northwind Labs"].map(
                      (name) => (
                        <div key={name} className="text-2xl font-serif-display italic text-zinc-300">
                          {name}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-24 border-t border-hairline">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 md:col-span-7 bg-surface/20 p-10 md:p-12 rounded-2xl border border-hairline flex flex-col justify-between">
                <div className="size-9 bg-accent/10 rounded-lg flex items-center justify-center mb-6">
                  <Brain className="size-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-serif-display text-3xl text-foreground mb-3">Adaptive AI interviewer</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed max-w-[44ch]">
                    Our proprietary model analyzes responses in real-time and generates follow-up questions that probe for true expertise — never a fixed script.
                  </p>
                </div>
              </div>

              <div className="col-span-12 md:col-span-5 bg-surface/20 p-10 md:p-12 rounded-2xl border border-hairline flex flex-col justify-end">
                <div className="size-9 bg-accent/10 rounded-lg flex items-center justify-center mb-6">
                  <Code className="size-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-serif-display text-3xl text-foreground mb-3">LeetCode Integration</h3>
                  <p className="text-zinc-405 text-sm leading-relaxed">
                    Write answers in our collaborative Monaco code environment. Compile code dynamically and verify syntax with secure compiler systems.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// ==========================================
// 2. VANTAGE AI PRACTICE COCKPIT & SCORECARD
// ==========================================
function PracticePage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentProbIdx, setCurrentProbIdx] = useState<number>(0);
  const [messages, setMessages] = useState<Array<{ role: 'interviewer' | 'candidate'; content: string }>>([]);
  const [userInput, setUserInput] = useState('');
  const [code, setCode] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState<'avatar' | 'code'>('avatar');
  const [aiLoading, setAiLoading] = useState(false);
  
  // Elo Rating Tracker (default 1200)
  const [userRating, setUserRating] = useState<number>(() => {
    return Number(localStorage.getItem('vantage_rating')) || 1200;
  });

  // LeetCode fetching state
  const [lcSlug, setLcSlug] = useState('');
  const [fetchingLc, setFetchingLc] = useState(false);
  const [lcError, setLcError] = useState('');

  // Code compilation variables
  const [compiling, setCompiling] = useState(false);
  const [compilerResult, setCompilerResult] = useState<any>(null);
  const [showConsole, setShowConsole] = useState(false);

  // Scorecard variables
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [loadingScorecard, setLoadingScorecard] = useState(false);

  const problem = problems[currentProbIdx];

  // Fetch problems on mount
  useEffect(() => {
    fetch(`${SOCKET_URL}/api/questions`)
      .then(res => res.json())
      .then((data: Problem[]) => {
        setProblems(data);
        if (data.length > 0) {
          setCode(data[0].starterTemplate);
          setMessages([
            { role: 'interviewer', content: `Hello! I'm Vantage AI Recruiter. I've loaded the coding problem: "${data[0].title}". Take a moment to read the details on your screen, design your solution in the code editor, and let me know when you're ready or walk me through your initial thoughts.` }
          ]);
        }
      })
      .catch(err => console.error("Error loading problems:", err));
  }, []);

  // Update editor template when question changes with Elo Rating Gatechecks
  const handleProblemChange = (idx: number) => {
    const targetProb = problems[idx];
    if (targetProb.difficulty === 'Medium' && userRating < 1400) {
      alert('🔒 Access Denied: You need a rating of 1400+ to unlock Medium LeetCode problems.');
      return;
    }
    if (targetProb.difficulty === 'Hard' && userRating < 1800) {
      alert('🔒 Access Denied: You need a rating of 1800+ to unlock Hard LeetCode problems.');
      return;
    }

    setCurrentProbIdx(idx);
    setCode(problems[idx].starterTemplate);
    setCompilerResult(null);
    setScorecard(null);
    setMessages([
      { role: 'interviewer', content: `We've switched over to the "${problems[idx].title}" problem. Take a look at the instructions, type your solution, and explain how you plan to implement this.` }
    ]);
  };

  // Fetch a custom LeetCode slug
  const handleFetchLeetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lcSlug.trim() || fetchingLc) return;

    setFetchingLc(true);
    setLcError('');
    try {
      const response = await fetch(`${SOCKET_URL}/api/leetcode/fetch-problem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: lcSlug.trim().toLowerCase() })
      });
      const data = await response.json();
      if (data.success) {
        const newProb = data.problem;

        // Verify Elo checks
        if (newProb.difficulty === 'Medium' && userRating < 1400) {
          setLcError('🔒 Locked: Medium problems require 1400+ Elo.');
          setFetchingLc(false);
          return;
        }
        if (newProb.difficulty === 'Hard' && userRating < 1800) {
          setLcError('🔒 Locked: Hard problems require 1800+ Elo.');
          setFetchingLc(false);
          return;
        }

        // Add to problem list and load it
        setProblems(prev => {
          if (prev.some(p => p.id === newProb.id)) return prev;
          return [...prev, newProb];
        });

        // Set timeout to select new problem
        setTimeout(() => {
          setProblems(currentList => {
            const index = currentList.findIndex(p => p.id === newProb.id);
            if (index !== -1) handleProblemChange(index);
            return currentList;
          });
        }, 100);

        setLcSlug('');
      } else {
        setLcError(data.error || 'LeetCode problem slug not found.');
      }
    } catch (err) {
      setLcError('Network fetch failure.');
    } finally {
      setFetchingLc(false);
    }
  };

  // Run Code Sandbox Trigger
  const handleRunCode = async () => {
    if (!problem) return;
    setCompiling(true);
    setShowConsole(true);
    try {
      const response = await fetch(`${SOCKET_URL}/api/run-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, problemId: problem.id, problemDescription: problem.description })
      });
      const data = await response.json();
      setCompilerResult(data);
    } catch (error) {
      console.error(error);
      setCompilerResult({ success: false, error: 'Compiler execution timed out.' });
    } finally {
      setCompiling(false);
    }
  };

  // Send Conversational Response to AI
  const handleSendResponse = async () => {
    if (!userInput.trim() || aiLoading) return;
    
    const candidateMsg = userInput.trim();
    const updatedMessages = [...messages, { role: 'candidate' as const, content: candidateMsg }];
    setMessages(updatedMessages);
    setUserInput('');
    setAiLoading(true);

    try {
      const response = await fetch(`${SOCKET_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemDescription: problem?.description,
          messages: updatedMessages,
          currentCode: code,
          userInput: candidateMsg,
          action: 'chat'
        })
      });
      const data = await response.json();
      if (data.success) {
        setMessages(prev => [...prev, { role: 'interviewer', content: data.message }]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setAiLoading(false);
    }
  };

  // Generate Scorecard (End Interview) and adjust Elo rating score
  const handleFinishInterview = async () => {
    setLoadingScorecard(true);
    try {
      const response = await fetch(`${SOCKET_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemDescription: problem?.description,
          messages: messages,
          currentCode: code,
          action: 'evaluate'
        })
      });
      const data = await response.json();
      if (data.success) {
        setScorecard(data.data);

        // Adjust Elo rating score
        const stats = data.data as Scorecard;
        if (stats.overallScore > 75) {
          const gain = Math.round((stats.overallScore - 75) * 0.8);
          const nextVal = userRating + gain;
          setUserRating(nextVal);
          localStorage.setItem('vantage_rating', nextVal.toString());
        } else if (stats.overallScore < 60) {
          const loss = Math.round((60 - stats.overallScore) * 0.8);
          const nextVal = Math.max(800, userRating - loss);
          setUserRating(nextVal);
          localStorage.setItem('vantage_rating', nextVal.toString());
        }
      }
    } catch (err) {
      console.error("Scorecard generation error:", err);
    } finally {
      setLoadingScorecard(false);
    }
  };

  // Simple Speech recognition simulation
  const handleVoiceInput = () => {
    if (isRecording) {
      setIsRecording(false);
    } else {
      setIsRecording(true);
      setUserInput("I am implementing an optimal algorithm with two pointer markers to avoid quadratic calculations...");
      setTimeout(() => {
        setIsRecording(false);
      }, 2500);
    }
  };

  if (loadingScorecard) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-4 px-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-hairline"></div>
          <div className="absolute inset-0 rounded-full border-2 border-accent border-t-transparent animate-spin"></div>
        </div>
        <h3 className="font-serif-display text-2xl text-foreground animate-pulse">Vantage AI is compiling your scorecard...</h3>
        <p className="text-zinc-500 text-xs tracking-wide">Analyzing code logic, computational complexity, and speech answers.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pt-16">
      {/* Header bar */}
      <header className="border-b border-hairline px-6 h-14 flex items-center justify-between bg-surface/10 flex-shrink-0">
        <div className="flex items-center gap-6">
          <span className="text-foreground font-semibold tracking-tight">AI Assessment Center</span>
          <div className="flex items-center gap-2 bg-zinc-900 border border-hairline rounded-full px-3 py-1 text-[11px] text-zinc-400 font-mono">
            <Award className="size-3.5 text-accent" /> Rating: <strong>{userRating} Elo</strong>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-surface border border-hairline rounded-full p-1 text-[11px] font-medium">
          <button 
            onClick={() => setActiveWorkspace('avatar')}
            className={`px-3 py-1 rounded-full transition-colors ${
              activeWorkspace === 'avatar' ? 'bg-foreground text-background' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            AI Recruiter
          </button>
          <button 
            onClick={() => setActiveWorkspace('code')}
            className={`px-3 py-1 rounded-full transition-colors ${
              activeWorkspace === 'code' ? 'bg-foreground text-background' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Code Sandbox
          </button>
        </div>
        <button
          onClick={handleFinishInterview}
          className="bg-accent hover:brightness-110 text-accent-foreground text-xs font-semibold px-4 py-1.5 rounded-full transition"
        >
          Finish & Score
        </button>
      </header>

      {/* Main practice page container */}
      {!scorecard ? (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden h-[calc(100vh-120px)]">
          {/* Left Panel: Coding Instructions & Problem Selection */}
          <aside className="lg:col-span-3 border-r border-hairline p-6 flex flex-col space-y-5 overflow-y-auto bg-zinc-950/20">
            {/* Custom LeetCode Fetcher Form */}
            <form onSubmit={handleFetchLeetCode} className="space-y-1.5 border-b border-hairline pb-4 flex-shrink-0">
              <label className="text-[10px] text-zinc-505 font-bold uppercase tracking-wider block">Fetch LeetCode Problem</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. lru-cache"
                  className="flex-1 bg-zinc-950 border border-hairline rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
                  value={lcSlug}
                  onChange={(e) => setLcSlug(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={fetchingLc}
                  className="bg-accent hover:brightness-110 text-accent-foreground text-xs font-bold px-3 py-1.5 rounded-xl transition"
                >
                  {fetchingLc ? '...' : 'Fetch'}
                </button>
              </div>
              {lcError && <p className="text-[10px] text-rose-400 font-semibold">{lcError}</p>}
            </form>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Question Bank</label>
              <div className="space-y-1.5">
                {problems.map((p, idx) => {
                  const isLocked = (p.difficulty === 'Medium' && userRating < 1400) || (p.difficulty === 'Hard' && userRating < 1800);
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleProblemChange(idx)}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex justify-between items-center ${
                        idx === currentProbIdx 
                          ? 'bg-accent/10 border-accent text-accent' 
                          : 'bg-surface/20 border-hairline text-zinc-400 hover:bg-surface-2'
                      } ${isLocked ? 'opacity-50' : ''}`}
                    >
                      <span className="flex items-center gap-1.5">
                        {isLocked && <span>🔒</span>}
                        {p.title}
                      </span>
                      <span className="text-[8px] uppercase px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-hairline">
                        {p.difficulty}
                      </span>
                    </button>
                  );
                })}
              </div>

              {problem && (
                <div className="space-y-3 pt-3 border-t border-hairline/30">
                  <span className="text-[9px] font-bold text-accent uppercase tracking-widest bg-accent/10 px-2.5 py-0.5 rounded border border-accent/20">
                    Instructions
                  </span>
                  <h3 className="font-serif-display text-xl text-zinc-200">{problem.title}</h3>
                  <p className="text-xs text-zinc-450 leading-relaxed max-w-[40ch] text-pretty">
                    {problem.description}
                  </p>
                </div>
              )}
            </div>
          </aside>

          {/* Middle Workspace: Monaco Editor or Avatar feed */}
          <main className="lg:col-span-6 bg-background flex flex-col min-h-0 relative">
            {activeWorkspace === 'avatar' ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-950/20 relative">
                <div className="relative mb-6">
                  <div className={`size-32 rounded-full bg-gradient-to-br from-accent/30 to-accent/5 ring-1 ring-accent/30 grid place-items-center ${
                    aiLoading ? "animate-pulse" : ""
                  }`}>
                    <div className="size-20 rounded-full bg-gradient-to-br from-accent to-orange-700 grid place-items-center font-serif-display text-3xl text-zinc-950 font-bold shadow-lg shadow-accent/20">
                      V
                    </div>
                  </div>
                  {aiLoading && (
                    <div className="absolute -inset-3 rounded-full border border-accent/25 animate-ping" />
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="font-serif-display text-xl text-zinc-250">Vantage Recruiting Agent</h4>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                    {aiLoading ? "Agent is processing response..." : "Listening to interview guidelines"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col h-full min-h-0 bg-zinc-950">
                <div className="px-4 py-2 border-b border-hairline bg-zinc-900/40 flex justify-between items-center">
                  <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1.5">
                    <Terminal className="size-3.5" /> solution.js
                  </span>
                  <button 
                    onClick={handleRunCode}
                    className="px-3.5 py-1 bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-900/30 text-[10px] font-bold rounded-full transition flex items-center gap-1"
                  >
                    <Play className="size-2.5 fill-current" /> Compile Code
                  </button>
                </div>
                <div className="flex-1 min-h-0">
                  <Editor
                    height="100%"
                    defaultLanguage="javascript"
                    theme="vs-dark"
                    value={code}
                    onChange={(v) => setCode(v || '')}
                    options={{ fontSize: 13, minimap: { enabled: false }, automaticLayout: true }}
                  />
                </div>

                {/* Sliding console outputs drawer */}
                {showConsole && (
                  <div className="border-t border-hairline bg-zinc-950 max-h-48 overflow-y-auto flex flex-col flex-shrink-0 animate-fade-in">
                    <div className="px-4 py-1.5 border-b border-hairline bg-zinc-900 flex justify-between items-center text-[10px] text-zinc-400">
                      <span>Sandbox execution console</span>
                      <button onClick={() => setShowConsole(false)} className="hover:text-foreground text-zinc-505">✕ Close</button>
                    </div>
                    <div className="p-4 font-mono text-xs space-y-2">
                      {compiling ? (
                        <p className="text-zinc-505 animate-pulse">Running test suites...</p>
                      ) : compilerResult ? (
                        <>
                          <div className="flex items-center gap-2">
                            {compilerResult.passed ? (
                              <span className="text-emerald-400 flex items-center gap-1"><CheckCircle className="size-4" /> ALL TESTS PASSED</span>
                            ) : (
                              <span className="text-rose-400 flex items-center gap-1"><XCircle className="size-4" /> TEST RUN FAILED</span>
                            )}
                          </div>
                          {compilerResult.logs && compilerResult.logs.length > 0 && (
                            <div className="bg-zinc-900 p-2 rounded border border-hairline">
                              <p className="text-zinc-500 font-bold mb-1 text-[10px] uppercase">Standard Output (Stdout):</p>
                              {compilerResult.logs.map((log: string, i: number) => (
                                <p key={i} className="text-zinc-350">{log}</p>
                              ))}
                            </div>
                          )}
                          {compilerResult.testResults && (
                            <div className="space-y-1.5">
                              {compilerResult.testResults.map((t: any, i: number) => (
                                <div key={i} className="flex justify-between items-center text-[11px] p-1 border-b border-hairline/30">
                                  <span className="text-zinc-400">Case {i+1} (Input: {JSON.stringify(t.input)})</span>
                                  <span className={t.passed ? 'text-emerald-500' : 'text-rose-500'}>
                                    {t.passed ? 'PASS' : `FAIL (Got ${JSON.stringify(t.actual)}, expected ${JSON.stringify(t.expected)})`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          {compilerResult.error && (
                            <p className="text-rose-400 font-bold">Error: {compilerResult.error}</p>
                          )}
                        </>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>

          {/* Right Panel: Chat dialogue Feed */}
          <aside className="lg:col-span-3 border-l border-hairline flex flex-col min-h-0 bg-zinc-950/20">
            <div className="px-6 py-4 border-b border-hairline bg-zinc-900/40 flex-shrink-0">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Dialogue Feed</span>
            </div>

            {/* Chat list */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((m, idx) => (
                <div key={idx} className={`flex flex-col max-w-[85%] ${m.role === 'candidate' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">{m.role}</span>
                  <div className={`p-3.5 rounded-2xl text-xs leading-relaxed border ${
                    m.role === 'candidate' 
                      ? 'bg-accent/10 border-accent/20 text-accent rounded-br-none' 
                      : 'bg-surface/30 border-hairline text-zinc-300 rounded-bl-none'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="mr-auto max-w-[85%] items-start flex flex-col">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">interviewer</span>
                  <div className="p-3.5 rounded-2xl text-xs bg-surface/30 border border-hairline text-zinc-550 rounded-bl-none animate-pulse">
                    typing response...
                  </div>
                </div>
              )}
            </div>

            {/* Response Input panel */}
            <div className="p-4 border-t border-hairline bg-zinc-900/40 flex items-center gap-2 flex-shrink-0">
              <button 
                onClick={handleVoiceInput}
                className={`p-3 rounded-full border transition flex-shrink-0 ${
                  isRecording 
                    ? 'bg-rose-950 border-rose-800 text-rose-400 animate-pulse' 
                    : 'bg-zinc-800 border-hairline text-zinc-350 hover:bg-zinc-750'
                }`}
                title="Dictate with Mic"
              >
                <Mic className="w-3.5 h-3.5" />
              </button>
              <input
                type="text"
                placeholder="Submit your answer, request clarification..."
                className="flex-1 bg-zinc-950 border border-hairline rounded-full px-4 py-2 text-xs focus:outline-none focus:border-accent transition text-foreground"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendResponse()}
              />
              <button 
                onClick={handleSendResponse}
                className="p-2.5 bg-accent hover:brightness-110 text-accent-foreground rounded-full transition flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </aside>
        </div>
      ) : (
        /* ==========================================
           PREMIUM AI SCORECARD DASHBOARD VIEW
           ========================================== */
        <div className="max-w-5xl mx-auto px-6 py-12 space-y-8 animate-fade-in">
          {/* Header block with Overall Score */}
          <div className="bg-surface/20 border border-hairline rounded-3xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-hairline bg-surface/50 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-405">
                <Award className="size-4 text-accent" /> Evaluation scorecard report
              </div>
              <h2 className="font-serif-display text-4xl md:text-5xl text-foreground">Interview Performance</h2>
              <p className="text-xs text-zinc-400 max-w-[50ch] leading-relaxed">
                Objective grading computed from your code execution benchmarks, technical design decisions, and chat transcripts.
              </p>
            </div>

            {/* Glowing circular SVG score gauge */}
            <div className="relative size-36 shrink-0 flex items-center justify-center">
              <svg className="size-full -rotate-90">
                <circle cx="72" cy="72" r="64" className="stroke-zinc-850 fill-none stroke-[8px]" />
                <circle 
                  cx="72" 
                  cy="72" 
                  r="64" 
                  className="stroke-accent fill-none stroke-[8px] transition-all duration-1000" 
                  strokeDasharray={402}
                  strokeDashoffset={402 - (402 * scorecard.overallScore) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-extrabold tracking-tight text-foreground font-mono">{scorecard.overallScore}</span>
                <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold">Overall Score</span>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-12 gap-6">
            {/* Sub-scores metrics checklist */}
            <div className="md:col-span-5 bg-surface/20 border border-hairline rounded-2xl p-6 space-y-6">
              <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Core competency metrics</h4>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-300 font-medium">Technical Accuracy</span>
                  <span className="font-mono text-accent">{scorecard.technicalScore}%</span>
                </div>
                <div className="h-2 bg-zinc-900 border border-hairline/50 rounded-full overflow-hidden">
                  <div className="h-full bg-accent transition-all duration-700" style={{ width: `${scorecard.technicalScore}%` }}></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-300 font-medium">Communication skills</span>
                  <span className="font-mono text-accent">{scorecard.communicationScore}%</span>
                </div>
                <div className="h-2 bg-zinc-900 border border-hairline/50 rounded-full overflow-hidden">
                  <div className="h-full bg-accent transition-all duration-700" style={{ width: `${scorecard.communicationScore}%` }}></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-300 font-medium">Behavioral & Presentation</span>
                  <span className="font-mono text-accent">{scorecard.behavioralScore}%</span>
                </div>
                <div className="h-2 bg-zinc-900 border border-hairline/50 rounded-full overflow-hidden">
                  <div className="h-full bg-accent transition-all duration-700" style={{ width: `${scorecard.behavioralScore}%` }}></div>
                </div>
              </div>
            </div>

            {/* Critique paragraphs */}
            <div className="md:col-span-7 bg-surface/20 border border-hairline rounded-2xl p-6 flex flex-col justify-between">
              <div className="space-y-3">
                <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Summary Review</h4>
                <p className="text-xs text-zinc-400 leading-relaxed text-pretty">
                  {scorecard.feedback}
                </p>
              </div>
            </div>
          </div>

          {/* Strengths and Improvements lists */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-surface/20 border border-hairline rounded-2xl p-6 space-y-4">
              <h4 className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle className="size-3.5" /> Strengths
              </h4>
              <ul className="space-y-3">
                {scorecard.strengths.map((str, idx) => (
                  <li key={idx} className="flex gap-2.5 text-xs text-zinc-400 leading-relaxed">
                    <span className="size-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-surface/20 border border-hairline rounded-2xl p-6 space-y-4">
              <h4 className="text-[10px] uppercase tracking-widest text-accent font-bold flex items-center gap-1.5">
                <Sparkles className="size-3.5" /> Areas of improvement
              </h4>
              <ul className="space-y-3">
                {scorecard.improvements.map((imp, idx) => (
                  <li key={idx} className="flex gap-2.5 text-xs text-zinc-400 leading-relaxed">
                    <span className="size-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Optimized Code solution recommended panel */}
          {scorecard.optimizedCode && (
            <div className="bg-zinc-950 border border-hairline rounded-2xl overflow-hidden">
              <div className="px-6 py-3 border-b border-hairline bg-zinc-900/60 flex justify-between items-center">
                <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1.5">
                  <Code className="size-3.5 text-accent" /> Recommended Optimized Code Solution
                </span>
                <span className="text-[9px] uppercase tracking-wider bg-accent/10 border border-accent/25 px-2.5 py-0.5 rounded text-accent font-bold">
                  javascript
                </span>
              </div>
              <div className="p-6 font-mono text-xs overflow-x-auto text-zinc-300 bg-zinc-950 leading-relaxed">
                <pre>{scorecard.optimizedCode}</pre>
              </div>
            </div>
          )}

          <div className="flex justify-center pt-4">
            <button 
              onClick={() => {
                setScorecard(null);
                setMessages([]);
                if (problems.length > 0) {
                  setCode(problems[0].starterTemplate);
                  setMessages([
                    { role: 'interviewer', content: `Let's practice again! Let's load the "${problems[0].title}" challenge. Whenever you are ready, explain your strategy.` }
                  ]);
                }
              }}
              className="px-6 py-2.5 bg-accent hover:brightness-110 text-accent-foreground text-xs font-bold rounded-full transition shadow-lg shadow-accent/15"
            >
              Start Another Simulation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 3. P2P MATCHING LOBBY & LIVE ROOM (WebRTC)
// ==========================================
function P2PLobby() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userId, setUserId] = useState(`User_${Math.floor(Math.random() * 9000 + 1000)}`);
  const [matchStatus, setMatchStatus] = useState<'idle' | 'searching' | 'matched'>('idle');
  const [lobbyMessage, setLobbyMessage] = useState('Offline');
  const [matchedRoom, setMatchedRoom] = useState<string | null>(null);
  const [role, setRole] = useState<'candidate' | 'interviewer' | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);

  // Live P2P workspace call states
  const [isInCall, setIsInCall] = useState(false);
  const [streamEnabled, setStreamEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [code, setCode] = useState('// Waiting for match sync...');
  const [peerMessages, setPeerMessages] = useState<Array<{ sender: string; text: string }>>([]);
  const [peerInput, setPeerInput] = useState('');

  // Elo rating tracking inside peer arena
  const [userRating] = useState<number>(() => {
    return Number(localStorage.getItem('vantage_rating')) || 1200;
  });

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const matchedRoomRef = useRef<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    matchedRoomRef.current = matchedRoom;
  }, [matchedRoom]);

  // Connect socket connection on mount
  useEffect(() => {
    const s = io(SOCKET_URL);
    setSocket(s);
    socketRef.current = s;

    s.on('connect', () => {
      setLobbyMessage('Connected to Vantage Matchmaker.');
    });

    s.on('match_status', (data: { status: 'searching' | 'idle'; message: string }) => {
      setMatchStatus(data.status);
      setLobbyMessage(data.message);
    });

    s.on('match_found', (data: { roomId: string; role: 'candidate' | 'interviewer'; peerId: string }) => {
      setMatchStatus('matched');
      setMatchedRoom(data.roomId);
      setRole(data.role);
      setPeerId(data.peerId);
      setCode(data.role === 'candidate' 
        ? 'function twoSum(nums, target) {\n  // Type code here...\n}' 
        : '// Candidate is drafting code...'
      );
      setLobbyMessage(`Room established: ${data.roomId}`);
    });

    // Real-time peer code sync channel
    s.on('code_sync', (data: { code: string }) => {
      setCode(data.code);
    });

    // Real-time peer text message channel
    s.on('peer_message', (data: { sender: string; text: string }) => {
      setPeerMessages(prev => [...prev, data]);
    });

    // WebRTC signaling receiver
    s.on('webrtc_signal', async (signal: any) => {
      try {
        if (!peerConnectionRef.current) return;

        if (signal.sdp) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          
          if (signal.sdp.type === 'offer') {
            const answer = await peerConnectionRef.current.createAnswer();
            await peerConnectionRef.current.setLocalDescription(answer);
            s.emit('webrtc_signal', { 
              roomId: matchedRoomRef.current, 
              signal: { sdp: answer } 
            });
          }
        } else if (signal.ice) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(signal.ice));
        }
      } catch (err) {
        console.error("Signaling error:", err);
      }
    });

    return () => {
      s.disconnect();
      stopCall();
    };
  }, []);

  // Sync editor changes
  const handleEditorChange = (newVal: string) => {
    setCode(newVal);
    if (socket && matchedRoom && role === 'candidate') {
      socket.emit('code_sync', { roomId: matchedRoom, code: newVal });
    }
  };

  // Start peer matchmaking
  const startSearching = () => {
    if (socket) {
      socket.emit('join_matchmaking', { userId, rating: userRating });
    }
  };

  // Cancel peer matchmaking
  const cancelSearch = () => {
    if (socket) {
      socket.emit('leave_matchmaking');
    }
  };

  // Establish WebRTC connection streams
  const enterInterviewRoom = async () => {
    setIsInCall(true);
    try {
      const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = localStream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }

      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;

      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socket && matchedRoomRef.current) {
          socket.emit('webrtc_signal', {
            roomId: matchedRoomRef.current,
            signal: { ice: event.candidate }
          });
        }
      };

      if (role === 'interviewer') {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket?.emit('webrtc_signal', {
          roomId: matchedRoomRef.current,
          signal: { sdp: offer }
        });
      }
    } catch (err) {
      console.error("Webcam media failure:", err);
      setIsInCall(false);
    }
  };

  // Send message to peer
  const sendPeerMessage = () => {
    if (!peerInput.trim() || !socket || !matchedRoom) return;
    const msg = { sender: userId, text: peerInput.trim() };
    setPeerMessages(prev => [...prev, msg]);
    socket.emit('peer_message', { roomId: matchedRoom, message: msg });
    setPeerInput('');
  };

  // Toggle local webcam video track
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setStreamEnabled(videoTrack.enabled);
      }
    }
  };

  // Toggle local mic audio track
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
      }
    }
  };

  // End active WebRTC call session
  const stopCall = () => {
    setIsInCall(false);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setMatchStatus('idle');
    setPeerMessages([]);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 min-h-screen pt-24">
      {!isInCall ? (
        <div className="max-w-xl mx-auto bg-surface/30 p-10 rounded-2xl border border-hairline space-y-8 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl pointer-events-none"></div>

          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-2 text-accent">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="font-serif-display text-3xl tracking-tight">Vantage Peer Arena</h2>
            <p className="text-zinc-405 text-xs leading-relaxed max-w-sm mx-auto">
              Queue up to practice live mock technical interviews with other active developers.
            </p>
          </div>

          {matchStatus === 'idle' && (
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Candidate Nickname</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    className="w-full bg-background border border-hairline focus:border-accent focus:outline-none rounded-xl pl-10 pr-4 py-2.5 text-xs transition text-foreground"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                  />
                </div>
              </div>
              <button
                onClick={startSearching}
                className="w-full py-3 bg-accent text-accent-foreground text-xs font-bold rounded-full transition hover:brightness-110 shadow-lg shadow-accent/10"
              >
                Find Partner Match
              </button>
            </div>
          )}

          {matchStatus === 'searching' && (
            <div className="text-center py-6 space-y-6">
              <div className="relative w-12 h-12 mx-auto">
                <div className="absolute inset-0 rounded-full border-2 border-hairline"></div>
                <div className="absolute inset-0 rounded-full border-2 border-accent border-t-transparent animate-spin"></div>
              </div>
              <div className="space-y-1">
                <p className="text-zinc-200 text-sm font-medium">Looking for a match...</p>
                <p className="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase">{lobbyMessage}</p>
              </div>
              <button
                onClick={cancelSearch}
                className="px-5 py-2 bg-surface hover:bg-surface-2 text-zinc-300 text-xs font-semibold rounded-full transition border border-hairline"
              >
                Cancel Search
              </button>
            </div>
          )}

          {matchStatus === 'matched' && (
            <div className="p-6 rounded-2xl bg-surface/40 border border-accent/20 text-center space-y-6">
              <div className="inline-flex px-3 py-1 rounded-full bg-accent/10 text-accent border border-accent/20 text-xs font-semibold">
                Match Established!
              </div>
              <div className="space-y-2">
                <p className="text-zinc-455 text-xs">
                  Connected Room: <span className="font-mono text-zinc-300 bg-background px-1.5 py-0.5 rounded border border-hairline">{matchedRoom}</span>
                </p>
                <p className="text-base font-bold text-zinc-200">
                  Matched Partner: <span className="text-accent">{peerId}</span>
                </p>
                <p className="text-xs text-zinc-500">
                  Role: You will act as the <span className="text-accent font-bold uppercase">{role}</span>
                </p>
              </div>

              <div className="flex gap-3 justify-center pt-2">
                <button 
                  onClick={enterInterviewRoom}
                  className="px-5 py-2.5 bg-accent text-accent-foreground text-xs font-bold rounded-full transition hover:brightness-110 shadow-lg shadow-accent/15"
                >
                  Enter Interview Room
                </button>
                <button 
                  onClick={() => setMatchStatus('idle')}
                  className="px-5 py-2.5 bg-surface hover:bg-surface-2 text-zinc-300 text-xs font-semibold rounded-full transition border border-hairline"
                >
                  Leave Room
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* P2P Live Call Room interface */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] overflow-hidden">
          
          {/* Left video feeds & guide panels */}
          <div className="lg:col-span-4 flex flex-col space-y-4 min-h-0 overflow-y-auto pr-1">
            <div className="bg-surface/20 border border-hairline rounded-2xl p-4 flex justify-between items-center">
              <h3 className="text-xs font-bold flex items-center gap-1.5 text-zinc-300">
                <span className="size-2 bg-emerald-500 rounded-full animate-pulse"></span>
                Room: {matchedRoom}
              </h3>
              <button 
                onClick={stopCall}
                className="flex items-center gap-1 px-3.5 py-1.5 bg-rose-955/40 hover:bg-rose-900/40 text-rose-400 border border-rose-900/30 text-[10px] font-bold rounded-full transition"
              >
                <PhoneOff className="w-3 h-3" /> Leave Arena
              </button>
            </div>

            {/* Video Streams */}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative rounded-2xl overflow-hidden aspect-video border border-hairline bg-zinc-950 shadow-inner">
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] text-zinc-405 border border-hairline">
                  {peerId} (Peer)
                </div>
              </div>
              <div className="relative rounded-2xl overflow-hidden aspect-video border border-hairline bg-zinc-950 shadow-inner">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] text-zinc-400 border border-hairline">
                  You ({userId})
                </div>
              </div>
            </div>

            {/* Stream toggle controllers */}
            <div className="flex gap-2">
              <button 
                onClick={toggleVideo}
                className={`flex-1 py-2 rounded-full border text-[10px] font-bold transition flex justify-center items-center gap-1.5 ${
                  streamEnabled ? 'bg-zinc-900 border-hairline text-zinc-350 hover:bg-zinc-800' : 'bg-rose-950/40 border-rose-900/30 text-rose-400'
                }`}
              >
                <Video className="size-3.5" /> {streamEnabled ? 'Mute Webcam' : 'Unmute Webcam'}
              </button>
              <button 
                onClick={toggleMute}
                className={`flex-1 py-2 rounded-full border text-[10px] font-bold transition flex justify-center items-center gap-1.5 ${
                  micEnabled ? 'bg-zinc-900 border-hairline text-zinc-350 hover:bg-zinc-800' : 'bg-rose-955/40 border-rose-900/30 text-rose-400'
                }`}
              >
                <Mic className="size-3.5" /> {micEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
              </button>
            </div>

            {/* Guidelines / Interview Instructions */}
            <div className="bg-surface/20 border border-hairline rounded-2xl p-5 space-y-3 flex-1 overflow-y-auto">
              {role === 'interviewer' ? (
                <>
                  <h4 className="text-[10px] uppercase tracking-wider text-accent font-bold">Interviewer Guidelines</h4>
                  <ul className="space-y-3.5 text-[11px] text-zinc-400 leading-relaxed">
                    <li className="flex gap-2"><span className="size-1.5 rounded-full bg-accent mt-1 shrink-0" />Observe code design and suggest edge cases if they struggle.</li>
                    <li className="flex gap-2"><span className="size-1.5 rounded-full bg-accent mt-1 shrink-0" />Check memory optimizations (such as dynamic programming lookup buffers).</li>
                    <li className="flex gap-2"><span className="size-1.5 rounded-full bg-accent mt-1 shrink-0" />Observe speech pacing and clarity of answers.</li>
                  </ul>
                </>
              ) : (
                <>
                  <h4 className="text-[10px] uppercase tracking-wider text-accent font-bold">Coding Task Instructions</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed font-bold">Two Sum Challenge</p>
                  <p className="text-[11px] text-zinc-450 leading-relaxed">
                    Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. Implement this inside the Monaco Editor. Your code is synchronized in real-time.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Right Monaco Editor panel */}
          <div className="lg:col-span-5 flex flex-col bg-zinc-955 rounded-2xl border border-hairline overflow-hidden min-h-0">
            <div className="px-4 py-2 border-b border-hairline bg-zinc-900/40 flex justify-between items-center flex-shrink-0">
              <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1.5">
                <Code className="size-3.5" /> editor.js (Real-time Synced)
              </span>
              <span className="text-[9px] uppercase tracking-widest text-zinc-550 border border-zinc-800 px-2 py-0.5 rounded">
                {role === 'candidate' ? 'Write Code Mode' : 'Read Only Monitor'}
              </span>
            </div>
            <div className="flex-1 min-h-0">
              <Editor
                height="100%"
                defaultLanguage="javascript"
                theme="vs-dark"
                value={code}
                onChange={(v) => handleEditorChange(v || '')}
                options={{ 
                  fontSize: 13, 
                  minimap: { enabled: false }, 
                  automaticLayout: true,
                  readOnly: role !== 'candidate' 
                }}
              />
            </div>
          </div>

          {/* Peer chat sidebar panel */}
          <div className="lg:col-span-3 flex flex-col bg-surface/10 border border-hairline rounded-2xl overflow-hidden min-h-0">
            <div className="px-4 py-2.5 border-b border-hairline bg-zinc-900/40 flex items-center gap-1.5 flex-shrink-0">
              <MessageSquare className="size-3.5 text-accent" />
              <span className="text-[10px] text-zinc-405 font-bold uppercase tracking-wider">Lobby Chat</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {peerMessages.map((m, idx) => (
                <div key={idx} className={`flex flex-col text-[11px] leading-relaxed max-w-[85%] ${m.sender === userId ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                  <span className="text-[8px] text-zinc-550 font-bold uppercase tracking-widest mb-0.5">{m.sender === userId ? 'You' : m.sender}</span>
                  <div className={`p-2.5 rounded-xl border ${
                    m.sender === userId 
                      ? 'bg-accent/10 border-accent/20 text-accent rounded-br-none' 
                      : 'bg-zinc-850/50 border-hairline text-zinc-300 rounded-bl-none'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-hairline bg-zinc-900/30 flex items-center gap-1.5 flex-shrink-0">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 bg-zinc-950 border border-hairline rounded-full px-3 py-1.5 text-[11px] focus:outline-none focus:border-accent transition text-foreground"
                value={peerInput}
                onChange={(e) => setPeerInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendPeerMessage()}
              />
              <button 
                onClick={sendPeerMessage}
                className="p-2 bg-accent hover:brightness-110 text-accent-foreground rounded-full transition flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 4. MAIN ROUTER WRAPPER
// ==========================================
export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        {/* Navigation Bar */}
        <nav className="fixed top-0 w-full z-50 border-b border-hairline bg-background/85 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link to="/" className="text-foreground font-semibold tracking-tight text-lg">
              Vantage
            </Link>
            
            <div className="hidden md:flex items-center gap-8 text-xs font-bold text-zinc-450 uppercase tracking-widest">
              <Link to="/practice" className="hover:text-foreground transition-colors">
                AI practice
              </Link>
              <Link to="/p2p-lobby" className="hover:text-foreground transition-colors">
                Peer Arena
              </Link>
            </div>
            
            <div className="flex items-center gap-3">
              <Link
                to="/practice"
                className="bg-foreground text-background text-xs font-bold px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
              >
                Start Practice
              </Link>
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/p2p-lobby" element={<P2PLobby />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="py-16 border-t border-hairline mt-12 bg-surface/10">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
            <div>© 2026 Vantage Assessment Inc.</div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-foreground">Privacy</a>
              <a href="#" className="hover:text-foreground">Terms</a>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}