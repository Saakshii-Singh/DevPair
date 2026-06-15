import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Terminal, Users, User, Brain, Code, Sparkles, Mic, Play, PhoneOff } from 'lucide-react';
import Editor from '@monaco-editor/react';

// The URL of our Express backend WebSocket server instance
const SOCKET_URL = 'http://localhost:5000';

// ==========================================
// 1. LANDING COMPONENT
// Renders the marketing page with glowing background filters and feature description cards.
// ==========================================
function LandingPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-16 relative overflow-hidden">
      {/* Background radial gradient glow representing a premium visual design */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="text-center space-y-6 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-indigo-300 font-medium tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          WebRTC & LLM Mock Interview Platform
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
          Master Technical Interviews <br/>
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-500 bg-clip-text text-transparent">Powered by AI & Peers</span>
        </h1>
        <p className="max-w-2xl mx-auto text-zinc-400 text-lg md:text-xl font-normal leading-relaxed">
          Simulate rigorous corporate coding and behavioral interviews. Get graded on syntax, efficiency, and speech patterns, or pair up with global candidates for live peer mocks.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <Link
            to="/ai-interview"
            className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl transition duration-300 shadow-lg shadow-indigo-600/20 glow-btn"
          >
            Start AI Interview
          </Link>
          <Link
            to="/p2p-lobby"
            className="px-8 py-3.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border border-zinc-850 hover:border-zinc-750 font-semibold rounded-xl transition duration-300"
          >
            P2P Matchmaking Lobby
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 pt-24 relative z-10">
        <div className="glass-panel glass-panel-hover p-8 rounded-2xl space-y-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
            <Brain className="w-6 h-6 text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold text-zinc-100">Adaptive AI Recruiter</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            AI dynamically asks behavioral and technical queries based on resume profiles and monitors transcripts for structured capability scorecards.
          </p>
        </div>

        <div className="glass-panel glass-panel-hover p-8 rounded-2xl space-y-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
            <Code className="w-6 h-6 text-purple-400" />
          </div>
          <h3 className="text-xl font-bold text-zinc-100">LeetCode Sandbox</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Complete active challenges inside a Monaco code workspace. Submit answers to secure compiler sandboxes to execute custom test cases.
          </p>
        </div>

        <div className="glass-panel glass-panel-hover p-8 rounded-2xl space-y-4">
          <div className="w-12 h-12 rounded-xl bg-zinc-800/50 flex items-center justify-center border border-zinc-700/50">
            <Users className="w-6 h-6 text-zinc-300" />
          </div>
          <h3 className="text-xl font-bold text-zinc-100">Peer-to-Peer Matchmaking</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Queue to pair up with online candidates. Take turns acting as interviewer and candidate with collaborative code synchronization and WebRTC calls.
          </p>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. AI INTERVIEW WORKSPACE COMPONENT
// Handles the Monaco Editor view and simulated AI chatbot dialogue interface.
// ==========================================
function AIInterviewWorkspace() {
  // Chat transcripts between Candidate and AI Recruiter
  const [messages, setMessages] = useState<Array<{ role: 'interviewer' | 'candidate'; content: string }>>([
    { role: 'interviewer', content: "Hello! Welcome to your technical mock interview. Can you implement a function to find indices of two numbers that add up to a target?" }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [code, setCode] = useState('function twoSum(nums, target) {\n  // Write your code here\n  \n}');

  // Handler to post candidate's text reply and trigger AI response
  const handleSend = () => {
    if (!userInput.trim()) return;
    setMessages(prev => [...prev, { role: 'candidate', content: userInput }]);
    setUserInput('');

    // Simulate network delay of AI Recruiter thinking
    setTimeout(() => {
      setMessages(prev => [
        ...prev, 
        { role: 'interviewer', content: "Good start. Can you explain the time complexity of your approach, and how you would handle duplicates?" }
      ]);
    }, 1500);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 grid md:grid-cols-2 gap-6 h-[calc(100vh-120px)]">
      {/* LEFT PORTION: LeetCode challenge card & Monaco Code Editor */}
      <div className="flex flex-col h-full space-y-4">
        <div className="glass-panel p-6 rounded-2xl space-y-3 flex-shrink-0">
          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25 text-xs font-semibold">LeetCode #1</span>
          <h2 className="text-2xl font-bold">Two Sum</h2>
          <p className="text-zinc-400 text-sm">
            Given an array of integers <code className="text-indigo-300 bg-zinc-900 px-1 py-0.5 rounded text-xs">nums</code> and an integer <code className="text-indigo-300 bg-zinc-900 px-1 py-0.5 rounded text-xs">target</code>, return indices of the two numbers such that they add up to target.
          </p>
        </div>

        {/* Monaco Editor Container */}
        <div className="flex-1 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 flex flex-col min-h-0">
          <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center flex-shrink-0">
            <span className="text-xs text-zinc-400 font-semibold flex items-center gap-1">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              solution.js (JavaScript)
            </span>
            <button className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded transition">
              <Play className="w-3 h-3 fill-current" /> Run Code
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              theme="vs-dark"
              value={code}
              onChange={(v) => setCode(v || '')}
              options={{ fontSize: 13, minimap: { enabled: false } }}
            />
          </div>
        </div>
      </div>

      {/* RIGHT PORTION: Recruiter visual panels & chat dialogues */}
      <div className="glass-panel rounded-2xl flex flex-col h-full overflow-hidden">
        {/* Recruiter Header showing name and speaking waves */}
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-sm">AI Technical Recruiter</h4>
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active Session
              </p>
            </div>
          </div>
          
          {/* Animated soundwaves reflecting the recruiter speaking states */}
          <div className="flex items-center gap-0.5 h-5">
            <div className="wave-bar w-0.5 h-full bg-indigo-500 rounded-full" style={{ animationDelay: '0.1s' }}></div>
            <div className="wave-bar w-0.5 h-full bg-indigo-400 rounded-full" style={{ animationDelay: '0.3s' }}></div>
            <div className="wave-bar w-0.5 h-full bg-purple-500 rounded-full" style={{ animationDelay: '0.5s' }}></div>
            <div className="wave-bar w-0.5 h-full bg-indigo-500 rounded-full" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>

        {/* Message Logs */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
          {messages.map((m, idx) => (
            <div 
              key={idx} 
              className={`flex flex-col max-w-[80%] ${m.role === 'candidate' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
            >
              <span className="text-[10px] text-zinc-500 font-semibold mb-1 uppercase tracking-wider">
                {m.role}
              </span>
              <div 
                className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  m.role === 'candidate' 
                    ? 'bg-indigo-600 text-white rounded-br-none' 
                    : 'bg-zinc-800/80 text-zinc-200 border border-zinc-700/50 rounded-bl-none'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
        </div>

        {/* Speech input controls */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/40 flex-shrink-0 flex items-center gap-2">
          <button 
            onClick={() => setIsRecording(!isRecording)}
            className={`p-3 rounded-xl border transition flex-shrink-0 ${
              isRecording 
                ? 'bg-rose-600 border-rose-500 text-white animate-pulse' 
                : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750'
            }`}
            title="Toggle Mic (Speech-to-Text)"
          >
            <Mic className="w-4 h-4" />
          </button>
          
          <input
            type="text"
            placeholder="Type your answer, or start speaking..."
            className="flex-1 bg-zinc-955 border border-zinc-850 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition placeholder:text-zinc-600"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />

          <button 
            onClick={handleSend}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex-shrink-0"
          >
            Send Response
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. P2P LOBBY & WEBRTC CALL COMPONENT
// Manages real-time queue states via Socket.io and coordinates 
// the browser audio/video WebRTC negotiation flow.
// ==========================================
function P2PLobby() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userId, setUserId] = useState(`User_${Math.floor(Math.random() * 9000 + 1000)}`);
  const [matchStatus, setMatchStatus] = useState<'idle' | 'searching' | 'matched'>('idle');
  const [lobbyMessage, setLobbyMessage] = useState('Offline');
  const [matchedRoom, setMatchedRoom] = useState<string | null>(null);
  const [role, setRole] = useState<'candidate' | 'interviewer' | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);

  // WebRTC States and References
  const [isInCall, setIsInCall] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Configuration for ICE Servers (STUN servers tell browsers their public IP addresses)
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    // Connect to WebSocket server on mount
    const s = io(SOCKET_URL);
    setSocket(s);

    s.on('connect', () => {
      setLobbyMessage('Connected to lobby. Ready.');
    });

    s.on('match_status', (data: { status: 'searching' | 'idle'; message: string }) => {
      setMatchStatus(data.status);
      setLobbyMessage(data.message);
    });

    // Callback event when the backend server pairs two candidates
    s.on('match_found', (data: { roomId: string; role: 'candidate' | 'interviewer'; peerId: string }) => {
      setMatchStatus('matched');
      setMatchedRoom(data.roomId);
      setRole(data.role);
      setPeerId(data.peerId);
      setLobbyMessage(`Matched! Paired with ${data.peerId}`);
    });

    // Handle inbound signaling data from our matched peer
    s.on('webrtc_signal', async (signal: any) => {
      try {
        if (!peerConnectionRef.current) return;

        if (signal.sdp) {
          // Set remote SDP description (either Offer or Answer configuration)
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          
          // If we received an Offer, we must generate an Answer
          if (signal.sdp.type === 'offer') {
            const answer = await peerConnectionRef.current.createAnswer();
            await peerConnectionRef.current.setLocalDescription(answer);
            // Send our SDP answer back to the peer
            s.emit('webrtc_signal', { roomId: matchedRoom, signal: { sdp: answer } });
          }
        } else if (signal.ice) {
          // Feed incoming ICE candidate parameters to our connection controller
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(signal.ice));
        }
      } catch (err) {
        console.error("Error processing incoming WebRTC signal:", err);
      }
    });

    return () => {
      // Clean up connection on unmount
      s.disconnect();
      stopCall();
    };
  }, [matchedRoom]);

  // Starts the matchmaking search
  const startSearching = () => {
    if (socket) {
      socket.emit('join_matchmaking', { userId });
    }
  };

  // Cancels active search
  const cancelSearch = () => {
    if (socket) {
      socket.emit('leave_matchmaking');
    }
  };

  // Initializing WebRTC local camera tracks & handshaking
  const enterInterviewRoom = async () => {
    setIsInCall(true);
    try {
      // 1. Capture local audio and video
      const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = localStream;

      // Assign local stream to local video tag for self-monitoring
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }

      // 2. Initialize RTCPeerConnection
      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;

      // 3. Attach our local media tracks to the peer connection
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      // 4. Handle incoming remote audio/video tracks from our partner
      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // 5. Detect and route local ICE candidates to our partner via our socket room
      pc.onicecandidate = (event) => {
        if (event.candidate && socket && matchedRoom) {
          socket.emit('webrtc_signal', {
            roomId: matchedRoom,
            signal: { ice: event.candidate }
          });
        }
      };

      // 6. If acting as the Interviewer, initiate the handshake by generating a SDP Offer
      if (role === 'interviewer') {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket?.emit('webrtc_signal', {
          roomId: matchedRoom,
          signal: { sdp: offer }
        });
      }
    } catch (err) {
      console.error("Failed to capture local media devices:", err);
      setIsInCall(false);
    }
  };

  // Terminates active WebRTC streams and closes handles
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
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* LOBBY INTERFACE: Displayed when not inside an active call session */}
      {!isInCall ? (
        <div className="max-w-2xl mx-auto glass-panel p-8 rounded-3xl space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center mx-auto mb-2">
              <Users className="w-8 h-8 text-indigo-400" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight">P2P Peer Matchmaking</h2>
            <p className="text-zinc-400 text-sm">
              Queue up to mock-interview another active developer online.
            </p>
          </div>

          {matchStatus === 'idle' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Candidate Nickname</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    className="w-full bg-zinc-950 border border-zinc-850 focus:border-indigo-500 focus:outline-none rounded-xl pl-10 pr-4 py-2.5 text-sm transition"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                  />
                </div>
              </div>
              <button
                onClick={startSearching}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition glow-btn"
              >
                Find Partner Match
              </button>
            </div>
          )}

          {matchStatus === 'searching' && (
            <div className="text-center py-6 space-y-6">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-zinc-800"></div>
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
              </div>
              <div className="space-y-1">
                <p className="text-zinc-200 font-medium">Looking for a matchup...</p>
                <p className="text-xs text-zinc-500">{lobbyMessage}</p>
              </div>
              <button
                onClick={cancelSearch}
                className="px-6 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-semibold rounded-lg transition border border-zinc-700/50"
              >
                Cancel Search
              </button>
            </div>
          )}

          {matchStatus === 'matched' && (
            <div className="p-6 rounded-2xl bg-zinc-950 border border-indigo-500/30 text-center space-y-6">
              <div className="inline-flex px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                Match Established!
              </div>
              <div className="space-y-2">
                <p className="text-zinc-400 text-sm">
                  Connected Room: <span className="font-mono text-zinc-300 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 text-xs">{matchedRoom}</span>
                </p>
                <p className="text-lg font-bold">
                  You matched with <span className="text-indigo-400">{peerId}</span>
                </p>
                <p className="text-xs text-zinc-500">
                  Role Assignment: You will act as the <span className="text-purple-400 font-semibold uppercase">{role}</span>
                </p>
              </div>

              <div className="flex gap-3 justify-center pt-2">
                <button 
                  onClick={enterInterviewRoom}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition"
                >
                  Enter Interview Room
                </button>
                <button 
                  onClick={() => setMatchStatus('idle')}
                  className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-semibold rounded-xl text-xs transition border border-zinc-700/50"
                >
                  Leave Room
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        // ACTIVE INTERVIEW PANEL: Shows local and remote video components once handshaking succeeds
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold">Live Mock Session ({role?.toUpperCase()})</h3>
            <button 
              onClick={stopCall}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-rose-600/15"
            >
              <PhoneOff className="w-3.5 h-3.5" /> End Interview
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Candidate stream panel */}
            <div className="relative rounded-2xl overflow-hidden aspect-video border border-zinc-850 bg-zinc-950">
              <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 bg-zinc-900/80 backdrop-blur-sm px-3 py-1 rounded text-xs border border-zinc-800">
                Partner Stream ({peerId})
              </div>
            </div>

            {/* Self preview stream panel */}
            <div className="relative rounded-2xl overflow-hidden aspect-video border border-zinc-850 bg-zinc-950">
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted // Mute self to prevent microphone audio loopback feedback
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 bg-zinc-900/80 backdrop-blur-sm px-3 py-1 rounded text-xs border border-zinc-800">
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
// Defines navigation paths and sets the sticky header layouts.
// ==========================================
export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-zinc-950 bg-grid flex flex-col">
        <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center transition group-hover:rotate-6">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-zinc-100 to-zinc-300 bg-clip-text text-transparent">
                Interv<span className="text-indigo-400">AI</span>
              </span>
            </Link>

            <nav className="flex items-center gap-6">
              <Link to="/ai-interview" className="text-sm font-medium text-zinc-400 hover:text-zinc-200 transition">
                AI Interview
              </Link>
              <Link to="/p2p-lobby" className="text-sm font-medium text-zinc-400 hover:text-zinc-200 transition">
                P2P Matchmaking
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1 py-6">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/ai-interview" element={<AIInterviewWorkspace />} />
            <Route path="/p2p-lobby" element={<P2PLobby />} />
          </Routes>
        </main>

        <footer className="border-t border-zinc-900 bg-zinc-950/60 py-6 mt-12 flex-shrink-0 text-center text-xs text-zinc-600">
          <p>© {new Date().getFullYear()} IntervAI. Designed with high-performance styling. 🤖</p>
        </footer>
      </div>
    </Router>
  );
}