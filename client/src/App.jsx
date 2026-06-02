import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import LandingPage from './components/LandingPage';
import InterviewRoom from './components/InterviewRoom';
import { AlertCircle } from 'lucide-react';

const BACKEND_URL = 'http://localhost:5000';

function App() {
  const [username, setUsername] = useState('');
  const [appState, setAppState] = useState('LANDING'); // 'LANDING', 'MATCHING', 'ROOM'
  const [queueStatus, setQueueStatus] = useState({ position: 0, totalInQueue: 0 });
  const [roomData, setRoomData] = useState({
    roomId: '',
    peer: null,
    users: [],
    role: '',
    question: null,
    initialCode: '',
    initialLanguage: 'javascript'
  });
  const [errorMsg, setErrorMsg] = useState('');

  const socketRef = useRef(null);

  useEffect(() => {
    // Clean up socket connection on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const connectSocket = () => {
    if (socketRef.current) return socketRef.current;

    const socket = io(BACKEND_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to signaling server:', socket.id);
    });

    socket.on('queue-status', (status) => {
      setQueueStatus(status);
    });

    socket.on('match-found', (data) => {
      setRoomData({
        roomId: data.roomId,
        peer: data.peer,
        users: data.users,
        role: data.role,
        question: data.question,
        initialCode: data.code,
        initialLanguage: data.language
      });
      setAppState('ROOM');
      setErrorMsg('');
    });

    socket.on('peer-left', (data) => {
      setErrorMsg(data.message || 'Your interview partner disconnected.');
      // Return to landing after a brief delay or immediately
      setAppState('LANDING');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    });

    socket.on('connect_error', () => {
      setErrorMsg('Failed to connect to the matchmaking server. Is it running?');
      setAppState('LANDING');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    });

    return socket;
  };

  const handleStartMatching = (name) => {
    setUsername(name);
    setErrorMsg('');
    setAppState('MATCHING');
    
    const socket = connectSocket();
    socket.emit('join-queue', { username: name });
  };

  const handleCancelMatching = () => {
    if (socketRef.current) {
      socketRef.current.emit('leave-queue');
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setAppState('LANDING');
  };

  const handleLeaveRoom = () => {
    if (socketRef.current && roomData.roomId) {
      socketRef.current.emit('leave-room', { roomId: roomData.roomId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setAppState('LANDING');
    setRoomData({
      roomId: '',
      peer: null,
      users: [],
      role: '',
      question: null,
      initialCode: '',
      initialLanguage: 'javascript'
    });
  };

  return (
    <div className="app-container">
      {errorMsg && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 20px',
          background: 'rgba(239, 68, 68, 0.95)',
          borderRadius: '8px',
          boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
          fontSize: '0.9rem',
          backdropFilter: 'blur(10px)',
          animation: 'pulse 2s infinite'
        }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
          <button 
            onClick={() => setErrorMsg('')} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'white', 
              marginLeft: '15px', 
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {appState === 'ROOM' ? (
        <InterviewRoom 
          socket={socketRef.current}
          roomData={roomData}
          onLeave={handleLeaveRoom}
          username={username}
        />
      ) : (
        <LandingPage 
          appState={appState}
          queueStatus={queueStatus}
          onStartMatching={handleStartMatching}
          onCancelMatching={handleCancelMatching}
        />
      )}
    </div>
  );
}

export default App;
