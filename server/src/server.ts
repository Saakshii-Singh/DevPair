import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { GoogleGenAI } from '@google/generative-ai';

// 1. CONFIGURATION & ENVIRONMENT SETUP
// Load config keys (.env variables like PORT, MONGO_URI, and API keys) into memory
dotenv.config();

const app = express();

// Create an HTTP server instance using Node's native HTTP library.
// We pass our Express application instance (app) to handle REST requests,
// and we will attach Socket.io to this same server instance to share the network port.
const httpServer = createServer(app);

// Enable Cross-Origin Resource Sharing (CORS) so that our React client (running on port 5173)
// is authorized to send HTTP and socket requests to this server (running on port 5000).
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({
  origin: clientUrl,
  credentials: true
}));

// Express middleware to parse incoming JSON payloads in request bodies (req.body)
app.use(express.json());

// 2. GOOGLE GEMINI AI SETUP
const geminiApiKey = process.env.GEMINI_API_KEY || '';
let genAI: any = null;

if (geminiApiKey && geminiApiKey !== 'YOUR_GEMINI_API_KEY') {
  // Initialize the Generative AI library using the api key from our .env config
  genAI = new GoogleGenAI({ apiKey: geminiApiKey });
  console.log('🤖 Google Gemini Client Initialized successfully!');
} else {
  // If no key is found, the system continues in mock mode for development safety
  console.warn('⚠️ GEMINI_API_KEY is missing or invalid. AI features will run in mock demonstration mode.');
}

// 3. WEBSOCKET (SOCKET.IO) CONNECTION & SIGNALING INSTANCE
// Instantiate the WebSocket server. We map it to our httpServer and allow CORS credentials.
const io = new Server(httpServer, {
  cors: {
    origin: clientUrl,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Define a TypeScript structure for online users waiting in the matching queue
interface QueueUser {
  socketId: string; // The active socket connection ID (needed to emit target events)
  userId: string;   // The candidate's custom display nickname
  rating: number;   // Elo rating (used to pair users of similar skill level)
}

const activeQueue: QueueUser[] = [];

io.on('connection', (socket: Socket) => {
  console.log(`🔌 Client connected to WebSocket server. Socket ID: ${socket.id}`);

  socket.on('join_matchmaking', (data: { userId: string; rating?: number }) => {
    const userNode: QueueUser = {
      socketId: socket.id,
      userId: data.userId,
      rating: data.rating || 1200
    };

    if (!activeQueue.some(u => u.userId === userNode.userId)) {
      activeQueue.push(userNode);
      socket.emit('match_status', { status: 'searching', message: 'Scanning for active peers...' });
      console.log(`👤 User [${data.userId}] joined matchmaking queue. Queue size: ${activeQueue.length}`);
    }

    // Trigger the matchmaking compiler loop to check if we can pair users up
    tryTriggerMatch();
  });

  // EVENT B: CLIENT CANCELS MATCHMAKING
  socket.on('leave_matchmaking', () => {
    removeFromQueue(socket.id);
    socket.emit('match_status', { status: 'idle', message: 'Left matchmaking queue.' });
  });

  // EVENT C: WEBRTC SIGNALING RELAY
  // This is the core WebRTC signaling channel. Sockets act as mail carriers.
  // One peer sends their network (ICE candidates) or stream configs (SDP offer/answer).
  // The server receives it and broadcasts it to the other peer inside the matching room.
  socket.on('webrtc_signal', (data: { roomId: string; signal: any }) => {
    // socket.to(roomId) broadcasts the event to everyone in the room except the sender
    socket.to(data.roomId).emit('webrtc_signal', data.signal);
  });

  // EVENT D: CODE TYPING SYNCHRONIZATION
  // When a candidate types code in their editor, they emit a 'code_sync' event.
  // We relay the raw editor text to the interviewer in the same room.
  socket.on('code_sync', (data: { roomId: string; code: string }) => {
    socket.to(data.roomId).emit('code_sync', { code: data.code });
  });

  // EVENT E: CLIENT DISCONNECTED
  // Automatically clean up users if they close the tab or lose connection
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
    removeFromQueue(socket.id);
  });
});

// Helper to remove user nodes from the queue array on leave/disconnect
const removeFromQueue = (socketId: string) => {
  const index = activeQueue.findIndex(u => u.socketId === socketId);
  if (index !== -1) {
    const user = activeQueue.splice(index, 1)[0];
    console.log(`👤 User [${user.userId}] removed from queue. Queue size: ${activeQueue.length}`);
  }
};

// 4. THE FIFO MATCHMAKING ENGINE
// Iterates over the queue array and pairs users up in groups of two
const tryTriggerMatch = () => {
  // While we have at least 2 users waiting, pull them out and form a match
  while (activeQueue.length >= 2) {
    const peer1 = activeQueue.shift()!; // Shift removes and returns the first element
    const peer2 = activeQueue.shift()!;

    // Create a unique room identifier based on the two nicknames
    const roomId = `room_${peer1.userId}_${peer2.userId}`;

    // Look up the active socket connections for both users
    const s1 = io.sockets.sockets.get(peer1.socketId);
    const s2 = io.sockets.sockets.get(peer2.socketId);

    // If both sockets are still active, join them to the room and assign interview roles
    if (s1 && s2) {
      s1.join(roomId);
      s2.join(roomId);

      // Notify peer 1 that they are matched and will act as the interviewer
      s1.emit('match_found', {
        roomId,
        role: 'interviewer',
        peerId: peer2.userId
      });

      // Notify peer 2 that they are matched and will act as the candidate (code submitter)
      s2.emit('match_found', {
        roomId,
        role: 'candidate',
        peerId: peer1.userId
      });

      console.log(`🤝 Match established! Room ${roomId} created for [${peer1.userId}] & [${peer2.userId}]`);
    } else {
      // If one of the sockets dropped before the match was finalized, push the active socket back into the queue
      if (s1) activeQueue.push(peer1);
      if (s2) activeQueue.push(peer2);
    }
  }
};

// 5. REST API ROUTING
// Health check route used by load balancers and diagnostics
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Endpoint to fetch Mock LeetCode problems
app.get('/api/questions', (req: Request, res: Response) => {
  const sampleProblems = [
    {
      id: 'two-sum',
      title: 'Two Sum',
      difficulty: 'Easy',
      description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
      starterTemplate: 'function twoSum(nums, target) {\n  // Write your code here\n  \n}'
    }
  ];
  res.json(sampleProblems);
});

// 6. SERVER & DATABASE BOOTSTRAP
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai-interviews';

// Attempt to connect to local MongoDB server using Mongoose
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('💾 Connected to MongoDB successfully.');
    // Start HTTP & Socket server
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failure:', err);
    // Boot server anyway so that development can run in mock-state without local MongoDB running
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT} (Database disconnected)`);
    });
  });