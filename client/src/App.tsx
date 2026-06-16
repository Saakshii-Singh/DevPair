import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Terminal, Users, User, Brain, Code, Sparkles, Mic, Play, PhoneOff, Video, Award, Clock, PlayCircle } from 'lucide-react';
import Editor from '@monaco-editor/react';

const SOCKET_URL = 'http://localhost:5000';

const candidateImg = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1280";
const sarahImg = "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=256";

const CANDIDATES = [
  { id: '1', name: 'Devon Watson', role: 'Staff frontend engineer', score: 94, date: 'Today', match: 'Tier 1' },
  { id: '2', name: 'Elena Rostova', role: 'Backend API Architect', score: 88, date: 'Yesterday', match: 'Tier 1' },
  { id: '3', name: 'Koji Tanaka', role: 'Full-stack Engineer', score: 78, date: '3 days ago', match: 'Tier 2' },
];

// ==========================================
// 1. VANTAGE LANDING PAGE COMPONENTS
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
                    className="bg-accent text-accent-foreground px-6 py-3 rounded-full text-sm font-semibold flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-accent/20"
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
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Write answers in our collaborative Monaco code environment. Compile code dynamically and verify syntax with secure compiler systems.
                  </p>
                </div>
              </div>

              <div className="col-span-12 md:col-span-4 bg-surface/20 p-8 rounded-2xl border border-hairline">
                <h3 className="text-lg font-semibold text-foreground mb-2">Unified scorecard</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Normalized metrics across all interview types for objective hiring decisions.
                </p>
              </div>

              <div className="col-span-12 md:col-span-4 bg-surface/20 p-8 rounded-2xl border border-hairline">
                <h3 className="text-lg font-semibold text-foreground mb-2">P2P Matching</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Connect instantly to online candidates over WebSockets to carry out mock interviews and collaborative coding.
                </p>
              </div>

              <div className="col-span-12 md:col-span-4 bg-surface/20 p-8 rounded-2xl border border-hairline">
                <h3 className="text-lg font-semibold text-foreground mb-2">Bias guardrails</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Structured rubrics and IO-psychology audits keep evaluations fair and defensible.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="py-24 border-t border-hairline">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-12 gap-12">
              <div className="col-span-12 lg:col-span-4">
                <div className="lg:sticky lg:top-32 space-y-4">
                  <div className="text-xs uppercase tracking-[0.25em] text-accent font-semibold">Workflow</div>
                  <h2 className="font-serif-display text-4xl md:text-5xl text-foreground">Precision from day one.</h2>
                  <p className="text-zinc-400 text-sm leading-relaxed max-w-[34ch]">
                    We've built a workflow that respects the time of both the hiring manager and the candidate.
                  </p>
                </div>
              </div>
              <div className="col-span-12 lg:col-span-8 space-y-16">
                {[
                  { n: "01", t: "Define requirements", d: "Upload a job description or select from our library of 5,005+ validated skill benchmarks. The AI builds a custom interview script." },
                  { n: "02", t: "Deploy simulations", d: "Candidates interact with the realistic AI interviewer. You receive a structured scorecard with video highlights and scoring." },
                  { n: "03", t: "Verify with peers", d: "Open the collaborative P2P arena to mock-interview peers in real-time, verifying live communication and coding accuracy." }
                ].map((s) => (
                  <div key={s.n} className="flex gap-8 border-t border-hairline pt-8">
                    <span className="font-serif-display italic text-4xl text-accent/70 shrink-0">{s.n}</span>
                    <div>
                      <h4 className="text-xl font-serif-display text-zinc-200 mb-2">{s.t}</h4>
                      <p className="text-xs text-zinc-450 leading-relaxed max-w-[52ch]">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 border-t border-hairline">
          <div className="max-w-7xl mx-auto px-6">
            <div className="bg-surface/20 border border-hairline p-12 md:p-20 rounded-[32px] text-center space-y-8">
              <div className="font-serif-display text-3xl md:text-5xl text-foreground leading-snug max-w-3xl mx-auto text-balance">
                "Vantage transformed our engineering hiring process. We reduced time-to-hire by <span className="italic text-accent">60%</span> without sacrificing quality."
              </div>
              <div className="flex flex-col items-center">
                <img
                  src={sarahImg}
                  alt="Sarah Chen, VP of Engineering at CloudCore"
                  className="size-14 rounded-full object-cover mb-3 ring-4 ring-background border border-hairline"
                />
                <div className="text-zinc-200 text-sm font-semibold">Sarah Chen</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">VP of Engineering • CloudCore</div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// ==========================================
// 2. VANTAGE PRACTICE WORKSPACE COCKPIT
// ==========================================
function PracticePage() {
  const [qIdx, setQIdx] = useState(0);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [code, setCode] = useState('function twoSum(nums, target) {\n  // Write your code here\n  \n}');
  const [activeWorkspace, setActiveWorkspace] = useState<'avatar' | 'code'>('avatar');
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const questions = [
    { q: "Tell me about a time you owned a project end-to-end. What was the outcome?", topic: "Behavioral • Ownership" },
    { q: "Design a rate limiter for a public API. Walk me through your approach.", topic: "System Design" },
    { q: "Implement a function to find indices of two numbers that add up to a target.", topic: "LeetCode #1 • Two Sum" }
  ];

  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recording]);

  const handleToggleRecord = () => {
    if (!recording) {
      setTranscript([]);
      setSeconds(0);
      setRecording(true);
      
      const mockLines = [
        "So, I think the first thing I'd do is clarify the scope...",
        "We'd want to support a token-bucket strategy for burst traffic.",
        "Then I'd consider Redis for the shared counter across instances."
      ];
      mockLines.forEach((line, i) => {
        setTimeout(() => setTranscript((prev) => [...prev, line]), (i + 1) * 2000);
      });
    } else {
      setRecording(false);
    }
  };

  const nextQuestion = () => {
    setQIdx((i) => (i + 1) % questions.length);
    setTranscript([]);
    setSeconds(0);
    setRecording(false);
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-hairline px-6 h-16 flex items-center justify-between bg-surface/10">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-foreground font-semibold tracking-tight">
            Vantage
          </Link>
          <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 hidden md:inline">
            Session • Software Engineer
          </span>
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

        <Link to="/" className="text-xs text-zinc-500 hover:text-foreground transition-colors">
          Exit ✕
        </Link>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-px bg-hairline">
        <main className="lg:col-span-8 bg-background p-6 lg:p-10 flex flex-col min-h-0">
          <div className="flex items-start justify-between mb-6 flex-shrink-0">
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-accent mb-2">
                {questions[qIdx].topic}
              </div>
              <h1 className="font-serif-display text-2xl md:text-4xl text-foreground leading-tight max-w-2xl">
                "{questions[qIdx].q}"
              </h1>
            </div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-500 font-semibold font-mono">
              <span className={`size-1.5 rounded-full ${recording ? "bg-red-500 animate-pulse" : "bg-zinc-700"}`} />
              {recording ? "Recording" : "Idle"} • {mm}:{ss}
            </div>
          </div>

          <div className="flex-1 min-h-[380px] bg-gradient-to-br from-surface to-background border border-hairline rounded-2xl relative overflow-hidden flex flex-col">
            {activeWorkspace === 'avatar' ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                <div className="relative mb-6">
                  <div className={`size-32 rounded-full bg-gradient-to-br from-accent/30 to-accent/5 ring-1 ring-accent/30 grid place-items-center ${
                    recording ? "animate-pulse" : ""
                  }`}>
                    <div className="size-20 rounded-full bg-gradient-to-br from-accent to-orange-700 grid place-items-center font-serif-display text-3xl text-zinc-950 font-bold">
                      V
                    </div>
                  </div>
                  {recording && (
                    <div className="absolute -inset-3 rounded-full border border-accent/25 animate-ping" />
                  )}
                </div>
                <div>
                  <h3 className="font-serif-display text-2xl text-foreground">Vantage AI</h3>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1.5">
                    {recording ? "Listening to your answer..." : "Ready when you are"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col h-full min-h-0 bg-zinc-950">
                <div className="px-4 py-2 border-b border-hairline bg-zinc-900/40 flex justify-between items-center">
                  <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1.5">
                    <Terminal className="size-3.5" /> solution.ts (TypeScript)
                  </span>
                  <button className="px-3 py-1 bg-white/5 hover:bg-white/10 text-foreground border border-hairline text-[10px] font-semibold rounded-full transition">
                    Run Compiler
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
              </div>
            )}

            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between gap-4">
              <div className="bg-black/60 backdrop-blur-md px-3.5 py-2 rounded-full border border-white/10 text-[10px] font-bold text-zinc-350">
                Question {qIdx + 1} of {questions.length}
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleToggleRecord}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold transition bg-accent text-zinc-950 hover:brightness-110 shadow-lg shadow-accent/10"
                >
                  {recording ? (
                    <>
                      <span className="size-2 rounded-sm bg-zinc-950" /> Stop recording
                    </>
                  ) : (
                    <>
                      <span className="size-2 rounded-full bg-zinc-950 animate-pulse" /> Record answer
                    </>
                  )}
                </button>
                <button 
                  onClick={nextQuestion}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold transition bg-surface text-foreground border border-hairline hover:bg-surface-2"
                >
                  Next question →
                </button>
              </div>
            </div>
          </div>
        </main>

        <aside className="lg:col-span-4 bg-background flex flex-col min-h-0 border-l border-hairline">
          <div className="p-6 border-b border-hairline flex-shrink-0">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-3">
              Live transcript
            </div>
            <div className="space-y-2 min-h-[120px] max-h-[180px] overflow-y-auto pr-1">
              {transcript.length === 0 ? (
                <p className="text-xs text-zinc-500 italic leading-relaxed">
                  {recording
                    ? "Listening for audio levels..."
                    : "Press record to begin answering. Your speech will be transcribed in real-time."}
                </p>
              ) : (
                transcript.map((l, i) => (
                  <p key={i} className="text-xs text-zinc-350 leading-relaxed text-pretty">
                    {l}
                  </p>
                ))
              )}
            </div>
          </div>

          <div className="p-6 border-b border-hairline flex-shrink-0 space-y-4">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">
              AI Coaching Metrics
            </div>
            
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-zinc-400 font-medium">Clarity & Accuracy</span>
                <span className="font-mono text-zinc-350">{transcript.length ? 82 : 0}%</span>
              </div>
              <div className="h-1 bg-hairline rounded-full overflow-hidden">
                <div className="h-full bg-accent transition-all duration-700" style={{ width: `${transcript.length ? 82 : 0}%` }}></div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-zinc-400 font-medium">Confidence & Pace</span>
                <span className="font-mono text-zinc-350">{transcript.length ? 88 : 0}%</span>
              </div>
              <div className="h-1 bg-hairline rounded-full overflow-hidden">
                <div className="h-full bg-accent transition-all duration-700" style={{ width: `${transcript.length ? 88 : 0}%` }}></div>
              </div>
            </div>
          </div>

          <div className="p-6 flex-1 overflow-y-auto space-y-3">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">
              AI Feedback suggestions
            </div>
            <ul className="space-y-3.5 text-xs text-zinc-400 leading-relaxed">
              <li className="flex gap-2">
                <span className="size-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                <span>Try opening with your direct architectural choice in one sentence.</span>
              </li>
              <li className="flex gap-2">
                <span className="size-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                <span>Quantify project outcomes — metrics make answers memorable.</span>
              </li>
              <li className="flex gap-2">
                <span className="size-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                <span>Monitor for minor speech filler words ("um", "like").</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ==========================================
// 3. VANTAGE P2P MATCHING LOBBY (Lobby & WebRTC Panel)
// ==========================================
function P2PLobby() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userId, setUserId] = useState(`User_${Math.floor(Math.random() * 9000 + 1000)}`);
  const [matchStatus, setMatchStatus] = useState<'idle' | 'searching' | 'matched'>('idle');
  const [lobbyMessage, setLobbyMessage] = useState('Offline');
  const [matchedRoom, setMatchedRoom] = useState<string | null>(null);
  const [role, setRole] = useState<'candidate' | 'interviewer' | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);

  const [isInCall, setIsInCall] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  
  // 1. Declare the Ref to hold the active room ID
  const matchedRoomRef = useRef<string | null>(null);

  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // 2. Keep the Ref synchronized with the state on every matchedRoom update
  useEffect(() => {
    matchedRoomRef.current = matchedRoom;
  }, [matchedRoom]);

  useEffect(() => {
    const s = io(SOCKET_URL);
    setSocket(s);

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
      setLobbyMessage(`Room established: ${data.roomId}`);
    });

    // 3. Listen for incoming WebRTC signal data
    s.on('webrtc_signal', async (signal: any) => {
      try {
        if (!peerConnectionRef.current) return;

        if (signal.sdp) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          
          if (signal.sdp.type === 'offer') {
            const answer = await peerConnectionRef.current.createAnswer();
            await peerConnectionRef.current.setLocalDescription(answer);
            
            // Fix: Emit signaling answer using the Ref value to avoid stale closures (roomId: null)
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

  const startSearching = () => {
    if (socket) {
      socket.emit('join_matchmaking', { userId });
    }
  };

  const cancelSearch = () => {
    if (socket) {
      socket.emit('leave_matchmaking');
    }
  };

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
      console.error("Error launching cameras:", err);
      setIsInCall(false);
    }
  };

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
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {!isInCall ? (
        <div className="max-w-xl mx-auto bg-surface/30 p-10 rounded-2xl border border-hairline space-y-8 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl pointer-events-none"></div>

          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-2 text-accent">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="font-serif-display text-3xl tracking-tight">Vantage Peer Arena</h2>
            <p className="text-zinc-400 text-xs leading-relaxed max-w-sm mx-auto">
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
                <p className="text-zinc-450 text-xs">
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
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-hairline pb-4">
            <h3 className="text-lg font-serif-display flex items-center gap-2">
              <span className="size-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Live Mock Session ({role?.toUpperCase()})
            </h3>
            <button 
              onClick={stopCall}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 border border-rose-900/30 text-xs font-bold rounded-full transition"
            >
              <PhoneOff className="w-3.5 h-3.5" /> End Interview
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Candidate stream panel */}
            <div className="relative rounded-2xl overflow-hidden aspect-video border border-hairline bg-surface/30">
              <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover animate-fade-in"
              />
              <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-md text-[10px] font-bold text-zinc-400 border border-hairline">
                Partner Stream ({peerId})
              </div>
            </div>

            {/* Self preview stream panel */}
            <div className="relative rounded-2xl overflow-hidden aspect-video border border-hairline bg-surface/30">
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover animate-fade-in"
              />
              <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-md text-[10px] font-bold text-zinc-400 border border-hairline">
                Self Preview ({userId})
              </div>
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