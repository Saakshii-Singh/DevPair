import { useState, useEffect, useRef } from 'react';
import { Terminal, Sparkles, Play, Award, Send, CheckCircle, XCircle, Lock, Menu } from 'lucide-react';
import Editor from '@monaco-editor/react';
import type { Problem, Scorecard } from '../types';
const SOCKET_URL = 'http://localhost:5000';

export default function PracticePage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentProbIdx, setCurrentProbIdx] = useState<number>(0);
  const [messages, setMessages] = useState<Array<{ role: 'interviewer' | 'candidate'; content: string }>>([]);
  const [userInput, setUserInput] = useState('');
  const [code, setCode] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [activeWorkspace, setActiveWorkspace] = useState<'avatar' | 'code'>('avatar');
  const [aiLoading, setAiLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [userRating, setUserRating] = useState<number>(() => {
    return Number(localStorage.getItem('vantage_rating')) || 1200;
  });

  const [lcSlug, setLcSlug] = useState('');
  const [fetchingLc, setFetchingLc] = useState(false);
  const [lcError, setLcError] = useState('');

  const [compiling, setCompiling] = useState(false);
  const [compilerResult, setCompilerResult] = useState<any>(null);
  const [showConsole, setShowConsole] = useState(false);

  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [loadingScorecard, setLoadingScorecard] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  // Timer logic based on recording state
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

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
    setSeconds(0);
    setIsRecording(false);
    setMessages([
      { role: 'interviewer', content: `We've switched over to the "${problems[idx].title}" problem. Take a look at the instructions, type your solution, and explain how you plan to implement this.` }
    ]);
    setSidebarOpen(false);
  };

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

        setProblems(prev => {
          if (prev.some(p => p.id === newProb.id)) return prev;
          return [...prev, newProb];
        });

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

  const handleFinishInterview = async () => {
    setLoadingScorecard(true);
    const userSession = JSON.parse(localStorage.getItem('vantage_user') || '{}');
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

        if (userSession.id) {
          const syncRes = await fetch(`${SOCKET_URL}/api/user/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: userSession.id,
              problemTitle: problem.title,
              difficulty: problem.difficulty,
              code: code,
              overallScore: data.data.overallScore,
              technicalScore: data.data.technicalScore,
              communicationScore: data.data.communicationScore,
              behavioralScore: data.data.behavioralScore,
              feedback: data.data.feedback
            })
          });
          const syncData = await syncRes.json();
          if (syncData.success) {
            setUserRating(syncData.newRating);
            localStorage.setItem('vantage_rating', syncData.newRating.toString());
          }
        }
      }
    } catch (err) {
      console.error("Scorecard generation error:", err);
    } finally {
      setLoadingScorecard(false);
    }
  };

  const handleVoiceInput = () => {
    if (isRecording) {
      setIsRecording(false);
    } else {
      setIsRecording(true);
      setSeconds(0);
      setUserInput("I am implementing an optimal algorithm with two pointer markers to avoid quadratic calculations...");
      setTimeout(() => setIsRecording(false), 2500);
    }
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

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
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded hover:bg-surface transition-colors"
            title="Toggle Question Bank Drawer"
          >
            <Menu className="size-5 text-zinc-400" />
          </button>
          <span className="text-foreground font-semibold tracking-tight text-xs md:text-sm">AI Assessment Center</span>
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-hairline rounded-full px-3 py-0.5 text-[10px] text-zinc-400 font-mono">
            <Award className="size-3.5 text-accent" /> {userRating} Elo
          </div>
        </div>

        <div className="flex items-center gap-1 bg-surface border border-hairline rounded-full p-1 text-xs">
          <button 
            onClick={() => setActiveWorkspace('avatar')}
            className={`px-4 py-1.5 rounded-full font-medium transition-colors ${
              activeWorkspace === 'avatar' ? 'bg-foreground text-background' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            AI Recruiter
          </button>
          <button 
            onClick={() => setActiveWorkspace('code')}
            className={`px-4 py-1.5 rounded-full font-medium transition-colors ${
              activeWorkspace === 'code' ? 'bg-foreground text-background' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Coding Sandbox
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
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden h-[calc(100vh-120px)] relative">
          
          {/* Collapsible Left Sidebar for problems & fetcher */}
          {sidebarOpen && (
            <div className="absolute inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
          )}
          <aside className={`absolute lg:relative top-0 bottom-0 left-0 w-80 lg:w-auto lg:col-span-3 bg-zinc-950 border-r border-hairline p-6 flex flex-col space-y-5 overflow-y-auto transition-transform z-40 lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
            <form onSubmit={handleFetchLeetCode} className="space-y-1.5 border-b border-hairline pb-4 flex-shrink-0">
              <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Fetch LeetCode Problem</label>
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
              <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Question Bank</label>
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
                        {isLocked && <Lock className="size-3 text-accent shrink-0" />}
                        {p.title}
                      </span>
                      <span className="text-[8px] uppercase px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-hairline">
                        {p.difficulty}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Middle Workspace: Recruiter Avatar or Monaco Editor */}
          <main className="col-span-1 lg:col-span-6 bg-background flex flex-col min-h-0 relative p-6">
            <div className="flex justify-between items-start mb-6 flex-shrink-0">
              <div>
                <span className="text-[10px] uppercase tracking-[0.25em] text-accent mb-2 block font-semibold">
                  {problem?.difficulty} • Coding assessment
                </span>
                <h2 className="font-serif text-2xl md:text-3xl text-foreground leading-tight max-w-xl">
                  "{problem?.title}"
                </h2>
              </div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-500 font-semibold font-mono">
                <span className={`size-1.5 rounded-full ${isRecording ? "bg-red-500 animate-pulse" : "bg-zinc-700"}`} />
                {isRecording ? "Recording" : "Idle"} • {mm}:{ss}
              </div>
            </div>

            <div className="flex-1 bg-gradient-to-br from-surface/10 to-background border border-hairline rounded-2xl relative overflow-hidden flex flex-col min-h-0">
              {activeWorkspace === 'avatar' ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-950/20 relative">
                  <div className="relative mb-6">
                    <div className={`size-32 rounded-full bg-gradient-to-br from-accent/30 to-accent/5 ring-1 ring-accent/30 grid place-items-center ${
                      aiLoading || isRecording ? "animate-pulse" : ""
                    }`}>
                      <div className="size-20 rounded-full bg-gradient-to-br from-accent to-orange-700 grid place-items-center font-serif text-3xl text-zinc-950 font-bold shadow-lg shadow-accent/20">
                        V
                      </div>
                    </div>
                    {(aiLoading || isRecording) && (
                      <div className="absolute -inset-3 rounded-full border border-accent/25 animate-ping" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-serif text-xl text-zinc-200">Vantage Recruiting Agent</h4>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                      {aiLoading ? "Agent is processing response..." : isRecording ? "Listening to response..." : "Ready when you are"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col h-full min-h-0 bg-zinc-950">
                  <div className="px-4 py-2 border-b border-hairline bg-zinc-900/40 flex justify-between items-center flex-shrink-0">
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

                  {showConsole && (
                    <div className="border-t border-hairline bg-zinc-955 max-h-48 overflow-y-auto flex flex-col flex-shrink-0 animate-fade-in">
                      <div className="px-4 py-1.5 border-b border-hairline bg-zinc-900 flex justify-between items-center text-[10px] text-zinc-400">
                        <span>Sandbox execution console</span>
                        <button onClick={() => setShowConsole(false)} className="hover:text-foreground text-zinc-500">✕ Close</button>
                      </div>
                      <div className="p-4 font-mono text-xs space-y-2">
                        {compiling ? (
                          <p className="text-zinc-500 animate-pulse">Running test suites...</p>
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
                          </>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom workspace control actions */}
              <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between gap-4">
                <div className="bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-[10px] font-bold text-zinc-350">
                  Question {currentProbIdx + 1} of {problems.length}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleVoiceInput}
                    className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                      isRecording ? 'bg-rose-950 border border-rose-800 text-rose-400 animate-pulse' : 'bg-accent text-zinc-950 hover:brightness-110 shadow-lg shadow-accent/10'
                    }`}
                  >
                    {isRecording ? "Stop Dictation" : "Record Answer"}
                  </button>
                  <button 
                    onClick={() => handleProblemChange((currentProbIdx + 1) % problems.length)}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-surface text-foreground border border-hairline hover:bg-surface-2 transition"
                  >
                    Next Question →
                  </button>
                </div>
              </div>
            </div>

            {problem && (
              <div className="mt-4 p-4 border border-hairline/30 bg-surface/5 rounded-xl text-pretty max-h-36 overflow-y-auto">
                <span className="text-[8px] uppercase tracking-widest text-accent font-bold">Problem details</span>
                <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{problem.description}</p>
              </div>
            )}
          </main>

          {/* Right Panel: dialogue Feed & coaching suggestions */}
          <aside className="col-span-1 lg:col-span-3 border-l border-hairline flex flex-col min-h-0 bg-zinc-950/20">
            <div className="p-4 border-b border-hairline flex-shrink-0">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-3">Live Interview Dialogue</span>
              
              {/* Chat timeline logs */}
              <div className="space-y-3 h-[200px] overflow-y-auto pr-1">
                {messages.map((m, idx) => (
                  <div key={idx} className={`flex flex-col max-w-[90%] ${m.role === 'candidate' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                    <span className="text-[8px] text-zinc-505 font-bold uppercase tracking-widest mb-0.5">{m.role}</span>
                    <div className={`p-2.5 rounded-xl border text-xs leading-relaxed ${
                      m.role === 'candidate' 
                        ? 'bg-accent/10 border-accent/20 text-accent rounded-br-none' 
                        : 'bg-surface/30 border-hairline text-zinc-300 rounded-bl-none'
                    }`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="mr-auto max-w-[90%] items-start flex flex-col">
                    <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mb-0.5">interviewer</span>
                    <div className="p-2.5 rounded-xl text-xs bg-surface/30 border border-hairline text-zinc-500 rounded-bl-none animate-pulse">
                      typing response...
                    </div>
                  </div>
                )}
              </div>

              {/* Chat typing input block */}
              <div className="mt-3 flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Type code strategy response..."
                  className="flex-1 bg-zinc-950 border border-hairline rounded-full px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent transition"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendResponse()}
                />
                <button 
                  onClick={handleSendResponse}
                  className="p-2 bg-accent hover:brightness-110 text-accent-foreground rounded-full transition flex-shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* AI Coaching Progress Indicators */}
            <div className="p-4 border-b border-hairline flex-shrink-0 space-y-3">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">AI Coaching Metrics</span>
              
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-zinc-400 font-medium">Clarity & Accuracy</span>
                  <span className="font-mono text-zinc-350">{messages.length > 2 ? 82 : 0}%</span>
                </div>
                <div className="h-1 bg-hairline rounded-full overflow-hidden">
                  <div className="h-full bg-accent transition-all duration-700" style={{ width: `${messages.length > 2 ? 82 : 0}%` }}></div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-zinc-400 font-medium">Confidence & Pace</span>
                  <span className="font-mono text-zinc-350">{messages.length > 2 ? 88 : 0}%</span>
                </div>
                <div className="h-1 bg-hairline rounded-full overflow-hidden">
                  <div className="h-full bg-accent transition-all duration-700" style={{ width: `${messages.length > 2 ? 88 : 0}%` }}></div>
                </div>
              </div>
            </div>

            {/* Coaching suggestions checklists */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">AI suggestions feed</span>
              <ul className="space-y-3 text-xs text-zinc-400 leading-relaxed">
                <li className="flex gap-2">
                  <span className="size-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                  <span>State structural designs clearly in one sentence.</span>
                </li>
                <li className="flex gap-2">
                  <span className="size-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                  <span>Highlight the Big O complexity when drafting solutions.</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      ) : (
        /* PREMIUM SCORECARD VIEW */
        <div className="max-w-4xl mx-auto px-6 py-12 space-y-8 overflow-y-auto h-[calc(100vh-120px)] animate-fade-in">
          <div className="bg-surface/20 border border-hairline rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-hairline bg-surface/50 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400">
                <Award className="size-4 text-accent" /> Evaluation scorecard report
              </div>
              <h2 className="font-serif text-3xl md:text-4xl text-foreground">Interview Performance</h2>
              <p className="text-xs text-zinc-400 max-w-md leading-relaxed">
                Objective grading computed from your code execution benchmarks, technical design decisions, and chat transcripts.
              </p>
            </div>

            {/* Glowing Circular score gauge */}
            <div className="relative size-32 shrink-0 flex items-center justify-center">
              <svg className="size-full -rotate-90">
                <circle cx="64" cy="64" r="56" className="stroke-zinc-850 fill-none stroke-[6px]" />
                <circle 
                  cx="64" 
                  cy="64" 
                  r="56" 
                  className="stroke-accent fill-none stroke-[6px] transition-all duration-1000" 
                  strokeDasharray={351}
                  strokeDashoffset={351 - (351 * scorecard.overallScore) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-bold text-foreground font-mono">{scorecard.overallScore}</span>
                <span className="text-[7px] uppercase tracking-wider text-zinc-500 font-bold">Overall Score</span>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-surface/20 border border-hairline rounded-2xl p-6 space-y-6">
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
                  <span className="text-zinc-300 font-medium">Behavioral & Composure</span>
                  <span className="font-mono text-accent">{scorecard.behavioralScore}%</span>
                </div>
                <div className="h-2 bg-zinc-900 border border-hairline/50 rounded-full overflow-hidden">
                  <div className="h-full bg-accent transition-all duration-700" style={{ width: `${scorecard.behavioralScore}%` }}></div>
                </div>
              </div>
            </div>

            <div className="bg-surface/20 border border-hairline rounded-2xl p-6 space-y-3">
              <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Summary Critique</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {scorecard.feedback}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-surface/20 border border-hairline rounded-2xl p-6 space-y-4">
              <h4 className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle className="size-3.5" /> Strengths
              </h4>
              <ul className="space-y-2.5">
                {scorecard.strengths.map((str, idx) => (
                  <li key={idx} className="flex gap-2 text-xs text-zinc-400 leading-relaxed">
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
              <ul className="space-y-2.5">
                {scorecard.improvements.map((imp, idx) => (
                  <li key={idx} className="flex gap-2 text-xs text-zinc-400 leading-relaxed">
                    <span className="size-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {scorecard.optimizedCode && (
            <div className="bg-zinc-950 border border-hairline rounded-2xl overflow-hidden">
              <div className="px-6 py-3 border-b border-hairline bg-zinc-900/60 flex justify-between items-center">
                <span className="text-[10px] text-zinc-405 font-semibold">Recommended Optimized Solution</span>
                <span className="text-[8px] uppercase tracking-wider bg-accent/10 border border-accent/25 px-2 py-0.5 rounded text-accent font-bold">javascript</span>
              </div>
              <div className="p-6 font-mono text-xs overflow-x-auto text-zinc-350 leading-relaxed">
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