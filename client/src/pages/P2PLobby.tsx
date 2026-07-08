import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Users, User, Code, PhoneOff, Video, Mic, MessageSquare, Send, BookOpen, Search } from 'lucide-react';
import Editor from '@monaco-editor/react';
import type { Problem } from '../types';

const SOCKET_URL = 'http://localhost:5000';

export default function P2PLobby() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userId, setUserId] = useState(`User_${Math.floor(Math.random() * 9000 + 1000)}`);
  const [matchStatus, setMatchStatus] = useState<'idle' | 'searching' | 'matched'>('idle');
  const [lobbyMessage, setLobbyMessage] = useState('Offline');
  const [matchedRoom, setMatchedRoom] = useState<string | null>(null);
  const [role, setRole] = useState<'candidate' | 'interviewer' | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);

  const [isInCall, setIsInCall] = useState(false);
  const [streamEnabled, setStreamEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [code, setCode] = useState('// Waiting for match sync...');
  const [peerMessages, setPeerMessages] = useState<Array<{ sender: string; text: string }>>([]);
  const [peerInput, setPeerInput] = useState('');

  const [activeRightTab, setActiveRightTab] = useState<'chat' | 'notes'>('chat');
  const [notepadText, setNotepadText] = useState('');

  const [consoleOpen, setConsoleOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runResults, setRunResults] = useState<any>(null);

  const [problems, setProblems] = useState<Problem[]>([]);
  const [activeProblem, setActiveProblem] = useState<Problem | null>(null);
  const [lcSlug, setLcSlug] = useState('');
  const [fetchingLc, setFetchingLc] = useState(false);
  const [lcError, setLcError] = useState('');

  const roleRef = useRef<'candidate' | 'interviewer' | null>(null);

  const [userRating] = useState<number>(() => {
    return Number(localStorage.getItem('vantage_rating')) || 1200;
  });

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  // Load standard problems database
  useEffect(() => {
    fetch(`${SOCKET_URL}/api/questions`)
      .then(res => res.json())
      .then((data: Problem[]) => {
        setProblems(data);
        if (data.length > 0) {
          setActiveProblem(data[0]);
        }
      })
      .catch(err => console.error("Error loading questions database:", err));
  }, []);

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

    s.on('code_sync', (data: { code: string }) => {
      setCode(data.code);
    });

    s.on('notepad_sync', (data: { text: string }) => {
      setNotepadText(data.text);
    });

    s.on('execution_sync', (data: { results: any }) => {
      setRunResults(data.results);
      setConsoleOpen(true);
    });

    s.on('problem_sync', (data: { problem: Problem }) => {
      setActiveProblem(data.problem);
      setCode(roleRef.current === 'candidate'
        ? data.problem.starterTemplate
        : '// Candidate is drafting code...'
      );
      setRunResults(null);
      setConsoleOpen(false);
    });

    s.on('peer_message', (data: { sender: string; text: string }) => {
      setPeerMessages(prev => [...prev, data]);
    });

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

  const handleEditorChange = (newVal: string) => {
    setCode(newVal);
    if (socket && matchedRoom && role === 'candidate') {
      socket.emit('code_sync', { roomId: matchedRoom, code: newVal });
    }
  };

  const handleNotepadChange = (newText: string) => {
    setNotepadText(newText);
    if (socket && matchedRoom) {
      socket.emit('notepad_sync', { roomId: matchedRoom, text: newText });
    }
  };

  const handleRunCode = async () => {
    if (!socket || !matchedRoom) return;
    setIsRunning(true);
    setConsoleOpen(true);
    setRunResults(null);

    try {
      const response = await fetch(`${SOCKET_URL}/api/run-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          problemId: activeProblem?.id || 'two-sum',
          problemDescription: activeProblem?.description || ''
        })
      });

      const data = await response.json();
      setRunResults(data);

      socket.emit('execution_sync', {
        roomId: matchedRoom,
        results: data
      });
    } catch (err: any) {
      console.error("Execution failure:", err);
      const errorData = { success: false, error: err.message || 'Execution error.' };
      setRunResults(errorData);
      socket.emit('execution_sync', {
        roomId: matchedRoom,
        results: errorData
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSelectProblem = (problemId: string) => {
    const target = problems.find(p => p.id === problemId);
    if (target && socket && matchedRoom) {
      socket.emit('select_problem', {
        roomId: matchedRoom,
        problem: target
      });
      setActiveProblem(target);
      setCode('// Candidate is drafting code...');
      setRunResults(null);
      setConsoleOpen(false);
    }
  };

  const handleFetchLeetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lcSlug.trim() || fetchingLc || !socket || !matchedRoom) return;

    setFetchingLc(true);
    setLcError('');

    try {
      const response = await fetch(`${SOCKET_URL}/api/leetcode/fetch-problem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: lcSlug.trim().toLowerCase() })
      });

      const data = await response.json();
      if (data.success && data.problem) {
        const customProblem: Problem = {
          id: data.problem.id,
          title: data.problem.title,
          difficulty: data.problem.difficulty,
          description: data.problem.description,
          starterTemplate: data.problem.starterTemplate
        };

        setProblems(prev => {
          if (prev.some(p => p.id === customProblem.id)) return prev;
          return [...prev, customProblem];
        });

        socket.emit('select_problem', {
          roomId: matchedRoom,
          problem: customProblem
        });

        setActiveProblem(customProblem);
        setCode('// Candidate is drafting code...');
        setRunResults(null);
        setConsoleOpen(false);
        setLcSlug('');
      } else {
        setLcError(data.error || 'LeetCode slug not found.');
      }
    } catch (err) {
      setLcError('Network lookup error.');
    } finally {
      setFetchingLc(false);
    }
  };

  const startSearching = () => {
    if (socket) {
      socket.emit('join_matchmaking', { userId, rating: userRating });
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
      console.error("Webcam media failure:", err);
      setIsInCall(false);
    }
  };

  const sendPeerMessage = () => {
    if (!peerInput.trim() || !socket || !matchedRoom) return;
    const msg = { sender: userId, text: peerInput.trim() };
    setPeerMessages(prev => [...prev, msg]);
    socket.emit('peer_message', { roomId: matchedRoom, message: msg });
    setPeerInput('');
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setStreamEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
      }
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
    setPeerMessages([]);
    setNotepadText('');
    setRunResults(null);
    setConsoleOpen(false);
    setIsRunning(false);
    if (problems.length > 0) {
      setActiveProblem(problems[0]);
    }
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
        /* P2P Live Call Room interface */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] overflow-hidden">
          
          <div className="lg:col-span-4 flex flex-col space-y-4 min-h-0 overflow-y-auto pr-1">
            <div className="bg-surface/20 border border-hairline rounded-2xl p-4 flex justify-between items-center">
              <h3 className="text-xs font-bold flex items-center gap-1.5 text-zinc-300">
                <span className="size-2 bg-emerald-500 rounded-full animate-pulse"></span>
                Room: {matchedRoom}
              </h3>
              <button 
                onClick={stopCall}
                className="flex items-center gap-1 px-3.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 border border-rose-900/30 text-[10px] font-bold rounded-full transition"
              >
                <PhoneOff className="w-3 h-3" /> Leave Arena
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative rounded-2xl overflow-hidden aspect-video border border-hairline bg-zinc-950 shadow-inner">
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] text-zinc-400 border border-hairline">
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
                <Mic className="size-3.5" /> {micEnabled ? 'Mute Mic' : 'Unmute Mic'}
              </button>
            </div>

            <div className="bg-surface/20 border border-hairline rounded-2xl p-5 space-y-3 flex-1 overflow-y-auto">
              {role === 'interviewer' ? (
                <>
                  <h4 className="text-[10px] uppercase tracking-wider text-accent font-bold mb-2 flex items-center gap-1.5">
                    <BookOpen className="size-3.5" /> Select Coding Task
                  </h4>
                  
                  {/* Select Dropdown */}
                  <div className="space-y-3 mb-4">
                    <select
                      value={activeProblem?.id || ''}
                      onChange={(e) => handleSelectProblem(e.target.value)}
                      className="w-full bg-zinc-950 border border-hairline focus:border-accent focus:outline-none rounded-xl px-3 py-2 text-xs transition text-foreground"
                    >
                      {problems.map(p => (
                        <option key={p.id} value={p.id}>{p.title} ({p.difficulty})</option>
                      ))}
                    </select>

                    {/* Custom LeetCode Fetcher */}
                    <form onSubmit={handleFetchLeetCode} className="space-y-1.5">
                      <label className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider block">Fetch LeetCode Problem</label>
                      <div className="flex gap-1.5">
                        <div className="relative flex-1">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-550" />
                          <input
                            type="text"
                            placeholder="e.g. fizz-buzz"
                            className="w-full bg-zinc-950 border border-hairline focus:border-accent focus:outline-none rounded-xl pl-8 pr-2 py-1.5 text-xs transition text-foreground"
                            value={lcSlug}
                            onChange={(e) => setLcSlug(e.target.value)}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={fetchingLc || !lcSlug.trim()}
                          className="px-3 py-1.5 bg-accent disabled:opacity-50 text-accent-foreground text-xs font-bold rounded-xl transition hover:brightness-110"
                        >
                          {fetchingLc ? '...' : 'Load'}
                        </button>
                      </div>
                      {lcError && <p className="text-[9px] text-rose-500 mt-1">{lcError}</p>}
                    </form>
                  </div>

                  {activeProblem && (
                    <div className="bg-zinc-900/40 p-3 rounded-xl border border-hairline space-y-2 mb-4 max-h-40 overflow-y-auto">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-zinc-200">{activeProblem.title}</span>
                        <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          activeProblem.difficulty === 'Easy' ? 'bg-emerald-950/40 text-emerald-455 border border-emerald-900/30' :
                          activeProblem.difficulty === 'Medium' ? 'bg-amber-950/40 text-amber-455 border border-amber-900/30' :
                          'bg-rose-950/40 text-rose-455 border border-rose-900/30'
                        }`}>
                          {activeProblem.difficulty}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-450 leading-relaxed whitespace-pre-wrap">{activeProblem.description}</p>
                    </div>
                  )}

                  <h4 className="text-[10px] uppercase tracking-wider text-accent font-bold mb-2">Interviewer Guidelines</h4>
                  <ul className="space-y-2.5 text-[11px] text-zinc-400 leading-relaxed">
                    <li className="flex gap-2"><span className="size-1.5 rounded-full bg-accent mt-1 shrink-0" />Observe code design and suggest edge cases if they struggle.</li>
                    <li className="flex gap-2"><span className="size-1.5 rounded-full bg-accent mt-1 shrink-0" />Check memory optimizations (such as dynamic programming lookup buffers).</li>
                    <li className="flex gap-2"><span className="size-1.5 rounded-full bg-accent mt-1 shrink-0" />Observe speech pacing and clarity of answers.</li>
                  </ul>
                </>
              ) : (
                <>
                  <h4 className="text-[10px] uppercase tracking-wider text-accent font-bold mb-2">Coding Task Instructions</h4>
                  {activeProblem ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <p className="text-[11px] text-zinc-200 font-bold leading-relaxed">{activeProblem.title}</p>
                        <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          activeProblem.difficulty === 'Easy' ? 'bg-emerald-950/40 text-emerald-455 border border-emerald-900/30' :
                          activeProblem.difficulty === 'Medium' ? 'bg-amber-950/40 text-amber-455 border border-amber-900/30' :
                          'bg-rose-950/40 text-rose-455 border border-rose-900/30'
                        }`}>
                          {activeProblem.difficulty}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-450 leading-relaxed whitespace-pre-wrap">
                        {activeProblem.description}
                      </p>
                      <span className="text-[8px] text-zinc-500 font-mono italic block pt-1 border-t border-hairline/35">
                        Your code editor is synchronized in real-time.
                      </span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-500">Waiting for interviewer to present a coding task...</p>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col bg-zinc-950 rounded-2xl border border-hairline overflow-hidden min-h-0 relative">
            <div className="px-4 py-2 border-b border-hairline bg-zinc-900/40 flex justify-between items-center flex-shrink-0">
              <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1.5">
                <Code className="size-3.5" /> editor.js (Real-time Synced)
              </span>
              <div className="flex items-center gap-2">
                {role === 'candidate' && (
                  <button
                    onClick={handleRunCode}
                    disabled={isRunning}
                    className="px-3 py-1 bg-accent hover:brightness-110 disabled:opacity-50 text-accent-foreground text-[10px] font-bold rounded-full transition flex items-center gap-1"
                  >
                    {isRunning ? 'Running...' : 'Run Code'}
                  </button>
                )}
                <span className="text-[9px] uppercase tracking-widest text-zinc-55 border border-zinc-800 px-2 py-0.5 rounded">
                  {role === 'candidate' ? 'Write Code Mode' : 'Read Only Monitor'}
                </span>
              </div>
            </div>
            <div className="flex-1 min-h-0 relative">
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

              {/* Collaborative Test Console Output Overlay */}
              {consoleOpen && (
                <div className="absolute bottom-0 left-0 right-0 h-48 bg-zinc-950 border-t border-hairline z-10 flex flex-col overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-hairline bg-zinc-900/60 flex justify-between items-center flex-shrink-0">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <span>⚙️</span> Execution Output
                    </span>
                    <button 
                      onClick={() => setConsoleOpen(false)}
                      className="text-zinc-500 hover:text-zinc-300 text-[10px] font-bold"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex-grow overflow-y-auto p-4 font-mono text-[10px] space-y-2 leading-relaxed text-zinc-300">
                    {isRunning ? (
                      <p className="text-zinc-555 animate-pulse">Compiling and running test cases...</p>
                    ) : runResults ? (
                      <div>
                        <p className="mb-2 font-bold">
                          Status:{' '}
                          <span className={runResults.success && runResults.passed ? 'text-emerald-500' : 'text-rose-500'}>
                            {runResults.success && runResults.passed ? 'Accepted (Pass)' : 'Failed'}
                          </span>
                        </p>

                        {runResults.error && (
                          <p className="text-rose-400 bg-rose-95/20 p-2 rounded border border-rose-900/30">
                            Error: {runResults.error}
                          </p>
                        )}

                        {runResults.logs && runResults.logs.length > 0 && (
                          <div className="mb-3">
                            <p className="text-zinc-500 font-bold">Console Logs:</p>
                            <pre className="text-zinc-400 bg-zinc-900/80 p-2 rounded border border-hairline mt-1 whitespace-pre-wrap">{runResults.logs.join('\n')}</pre>
                          </div>
                        )}

                        {runResults.testResults && (
                          <div className="space-y-2">
                            <p className="text-zinc-500 font-bold">Test Cases:</p>
                            {runResults.testResults.map((t: any, idx: number) => (
                              <div key={idx} className={`p-2 rounded border ${t.passed ? 'bg-emerald-950/10 border-emerald-900/30 text-emerald-400' : 'bg-rose-950/10 border-rose-900/30 text-rose-400'}`}>
                                <div className="font-bold flex items-center gap-1">
                                  <span>{t.passed ? '✓' : '✗'}</span> Case {idx + 1}
                                </div>
                                <div className="text-[9px] text-zinc-450 mt-1 pl-3 space-y-0.5">
                                  <div>Input: <code className="text-zinc-300">{JSON.stringify(t.input)}</code></div>
                                  <div>Expected: <code className="text-zinc-300">{JSON.stringify(t.expected)}</code></div>
                                  <div>Actual: <code className={t.passed ? 'text-emerald-400' : 'text-rose-400'}>{JSON.stringify(t.actual)}</code></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-zinc-500">Run code to see outputs.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-3 flex flex-col bg-surface/10 border border-hairline rounded-2xl overflow-hidden min-h-0">
            <div className="px-4 py-2 border-b border-hairline bg-zinc-900/40 flex justify-around items-center flex-shrink-0 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              <button 
                onClick={() => setActiveRightTab('chat')}
                className={`pb-1.5 pt-1.5 border-b-2 transition-colors flex items-center gap-1 ${activeRightTab === 'chat' ? 'border-accent text-accent' : 'border-transparent text-zinc-450 hover:text-zinc-200'}`}
              >
                <MessageSquare className="size-3 text-current" />
                Lobby Chat
              </button>
              <button 
                onClick={() => setActiveRightTab('notes')}
                className={`pb-1.5 pt-1.5 border-b-2 transition-colors flex items-center gap-1 ${activeRightTab === 'notes' ? 'border-accent text-accent' : 'border-transparent text-zinc-450 hover:text-zinc-200'}`}
              >
                <span>✏️</span>
                Shared Notes
              </button>
            </div>

            {activeRightTab === 'chat' ? (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                  {peerMessages.map((m, idx) => (
                    <div key={idx} className={`flex flex-col text-[11px] leading-relaxed max-w-[85%] ${m.sender === userId ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                      <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mb-0.5">{m.sender === userId ? 'You' : m.sender}</span>
                      <div className={`p-2.5 rounded-xl border ${
                        m.sender === userId 
                          ? 'bg-accent/10 border-accent/20 text-accent rounded-br-none' 
                          : 'bg-zinc-855/50 border-hairline text-zinc-300 rounded-bl-none'
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
              </>
            ) : (
              <div className="flex-grow flex flex-col p-4 h-full min-h-0">
                <textarea
                  value={notepadText}
                  onChange={(e) => handleNotepadChange(e.target.value)}
                  placeholder="Shared scratchpad for notes, pseudo-code, hints..."
                  className="w-full flex-1 bg-zinc-950/40 border border-hairline rounded-xl p-3 text-xs focus:outline-none focus:border-accent transition text-zinc-300 resize-none font-sans leading-relaxed"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}