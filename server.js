const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const questions = require('./questions');

const app = express();
app.use(cors());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeUsers: io.engine.clientsCount });
});

// Endpoint to fetch question database
app.get('/api/questions', (req, res) => {
  res.json(questions);
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// In-memory data store
let queue = []; // Array of { socketId, username }
const activeRooms = new Map(); // RoomId -> { id, users: [{id, name, role}], currentQuestion, code, language, notepad }

// Generate simple ID
function generateRoomId() {
  return `room_${Math.random().toString(36).substring(2, 9)}`;
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // 1. Queue Matchmaking
  socket.on('join-queue', ({ username }) => {
    // Prevent duplicate queuing
    if (queue.some(user => user.socketId === socket.id)) {
      return;
    }

    const name = username || `Developer_${socket.id.substring(0, 4)}`;
    queue.push({ socketId: socket.id, username: name });
    console.log(`User ${name} (${socket.id}) joined queue. Current queue size: ${queue.length}`);

    // Update queue stats for all waiting users
    updateQueueStatus();

    // Check if we can form a match
    tryMatchmaking();
  });

  socket.on('leave-queue', () => {
    queue = queue.filter(user => user.socketId !== socket.id);
    console.log(`User (${socket.id}) left queue. Current queue size: ${queue.length}`);
    updateQueueStatus();
  });

  // 2. Room Event Signaling
  socket.on('code-change', ({ roomId, code }) => {
    const room = activeRooms.get(roomId);
    if (room) {
      room.code = code;
      // Broadcast to other client in room
      socket.to(roomId).emit('code-change', { code });
    }
  });

  socket.on('language-change', ({ roomId, language, code }) => {
    const room = activeRooms.get(roomId);
    if (room) {
      room.language = language;
      room.code = code;
      socket.to(roomId).emit('language-change', { language, code });
    }
  });

  socket.on('notepad-change', ({ roomId, notepadContent }) => {
    const room = activeRooms.get(roomId);
    if (room) {
      room.notepad = notepadContent;
      socket.to(roomId).emit('notepad-change', { notepadContent });
    }
  });

  socket.on('question-change', ({ roomId, questionId }) => {
    const room = activeRooms.get(roomId);
    const question = questions.find(q => q.id === questionId);
    if (room && question) {
      room.currentQuestion = question;
      room.code = question.starterCode[room.language || 'javascript'] || '';
      io.to(roomId).emit('question-change', { question, code: room.code });
    }
  });

  socket.on('chat-message', ({ roomId, sender, message }) => {
    socket.to(roomId).emit('chat-message', { sender, message, timestamp: new Date() });
  });

  // Whiteboard Canvas Synchronization
  socket.on('draw-line', ({ roomId, line }) => {
    const room = activeRooms.get(roomId);
    if (room) {
      if (!room.drawHistory) room.drawHistory = [];
      room.drawHistory.push(line);
      socket.to(roomId).emit('draw-line', { line });
    }
  });

  socket.on('draw-clear', ({ roomId }) => {
    const room = activeRooms.get(roomId);
    if (room) {
      room.drawHistory = [];
      socket.to(roomId).emit('draw-clear');
    }
  });

  socket.on('request-draw-history', ({ roomId }) => {
    const room = activeRooms.get(roomId);
    if (room) {
      socket.emit('draw-history-sync', { drawHistory: room.drawHistory || [] });
    }
  });

  // Interview timer extensions
  socket.on('add-time', ({ roomId, minutes }) => {
    io.to(roomId).emit('add-time', { minutes });
  });

  // Interview scorecard submission
  socket.on('submit-feedback', ({ roomId, scorecard }) => {
    io.to(roomId).emit('feedback-submitted', { scorecard });
  });

  socket.on('session-ended', ({ roomId }) => {
    socket.to(roomId).emit('session-ended');
  });

  // 3. WebRTC Direct Signal Relay
  socket.on('signal', ({ roomId, signalData }) => {
    // Relay signaling data (Offer, Answer, ICE candidates) to other peer in room
    socket.to(roomId).emit('signal', signalData);
  });

  // 4. Leaving room
  socket.on('leave-room', ({ roomId }) => {
    handleLeaveRoom(socket, roomId);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Remove from queue if they were waiting
    queue = queue.filter(user => user.socketId !== socket.id);
    updateQueueStatus();

    // Find and clean up any rooms they were in
    for (const [roomId, room] of activeRooms.entries()) {
      const userInRoom = room.users.some(u => u.id === socket.id);
      if (userInRoom) {
        handleLeaveRoom(socket, roomId);
      }
    }
  });
});

function updateQueueStatus() {
  queue.forEach((user, index) => {
    io.to(user.socketId).emit('queue-status', {
      position: index + 1,
      totalInQueue: queue.length
    });
  });
}

function tryMatchmaking() {
  while (queue.length >= 2) {
    const userA = queue.shift();
    const userB = queue.shift();

    const socketA = io.sockets.sockets.get(userA.socketId);
    const socketB = io.sockets.sockets.get(userB.socketId);

    if (!socketA || !socketB) {
      // Put valid user back in queue if one of them disconnected during matching process
      if (socketA) queue.unshift(userA);
      if (socketB) queue.unshift(userB);
      updateQueueStatus();
      continue;
    }

    const roomId = generateRoomId();
    socketA.join(roomId);
    socketB.join(roomId);

    // Initial question is Two Sum
    const initialQuestion = questions[0];

    const roomDetails = {
      id: roomId,
      users: [
        { id: userA.socketId, name: userA.username, role: 'Interviewer' },
        { id: userB.socketId, name: userB.username, role: 'Candidate' }
      ],
      currentQuestion: initialQuestion,
      code: initialQuestion.starterCode.javascript,
      language: 'javascript',
      notepad: '',
      drawHistory: []
    };

    activeRooms.set(roomId, roomDetails);

    // Notify Peer A
    socketA.emit('match-found', {
      roomId,
      peer: { id: userB.socketId, name: userB.username },
      users: roomDetails.users,
      role: 'Interviewer',
      question: initialQuestion,
      code: roomDetails.code,
      language: roomDetails.language
    });

    // Notify Peer B
    socketB.emit('match-found', {
      roomId,
      peer: { id: userA.socketId, name: userA.username },
      users: roomDetails.users,
      role: 'Candidate',
      question: initialQuestion,
      code: roomDetails.code,
      language: roomDetails.language
    });

    console.log(`Matched Room Created: ${roomId} with ${userA.username} & ${userB.username}`);
  }
  updateQueueStatus();
}

function handleLeaveRoom(socket, roomId) {
  socket.leave(roomId);
  const room = activeRooms.get(roomId);
  if (room) {
    // Notify peer in the room that their partner disconnected
    socket.to(roomId).emit('peer-left', {
      message: 'Your interview partner has left the session.'
    });
    activeRooms.delete(roomId);
    console.log(`Room deleted/cleaned up: ${roomId}`);
  }
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
