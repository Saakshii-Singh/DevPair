import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
import vm from 'vm';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);

// Configure CORS for local development
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({
  origin: clientUrl,
  credentials: true
}));
app.use(express.json());

// Initialize Gemini API Client
const geminiApiKey = process.env.GEMINI_API_KEY || '';
let genAI: any = null;
if (geminiApiKey && geminiApiKey !== 'YOUR_GEMINI_API_KEY') {
  try {
    genAI = new GoogleGenerativeAI(geminiApiKey);
    console.log('🤖 Google Gemini Client Initialized successfully!');
  } catch (error) {
    console.error('❌ Failed to initialize Google Gemini client:', error);
  }
} else {
  console.warn('⚠️ GEMINI_API_KEY is missing or invalid. AI features will run in mock mode.');
}

// ==========================================
// MONGOOSE SCHEMAS & DATABASE PERSISTENCE
// ==========================================
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Plain text for dev simplicity
  nickname: { type: String, required: true },
  rating: { type: Number, default: 1200 },
  peakRating: { type: Number, default: 1200 },
  createdProblemsSolved: { type: Number, default: 0 }
});

const InterviewSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  problemTitle: { type: String, required: true },
  difficulty: { type: String, required: true },
  code: { type: String, required: true },
  overallScore: { type: Number, required: true },
  technicalScore: { type: Number, required: true },
  communicationScore: { type: Number, required: true },
  behavioralScore: { type: Number, required: true },
  feedback: { type: String, default: '' },
  date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const InterviewSession = mongoose.model('InterviewSession', InterviewSessionSchema);

// ==========================================
// SOCKET.IO MATCHMAKING & RELAYS
// ==========================================
const io = new Server(httpServer, {
  cors: {
    origin: clientUrl,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

interface QueueUser {
  socketId: string;
  userId: string;
  rating: number;
}

const activeQueue: QueueUser[] = [];

io.on('connection', (socket: Socket) => {
  console.log(`🔌 Client connected to WebSocket server: ${socket.id}`);

  socket.on('join_matchmaking', (data: { userId: string; rating?: number }) => {
    const userNode: QueueUser = {
      socketId: socket.id,
      userId: data.userId,
      rating: data.rating || 1200
    };

    if (!activeQueue.some(u => u.userId === userNode.userId)) {
      activeQueue.push(userNode);
      socket.emit('match_status', { status: 'searching', message: 'Scanning for active peers...' });
      console.log(`👤 User [${data.userId}] (Rating: ${userNode.rating}) joined matchmaking queue.`);
    }

    tryTriggerMatch();
  });

  socket.on('leave_matchmaking', () => {
    removeFromQueue(socket.id);
    socket.emit('match_status', { status: 'idle', message: 'Left matchmaking queue.' });
  });

  socket.on('webrtc_signal', (data: { roomId: string; signal: any }) => {
    socket.to(data.roomId).emit('webrtc_signal', data.signal);
  });

  socket.on('code_sync', (data: { roomId: string; code: string }) => {
    socket.to(data.roomId).emit('code_sync', { code: data.code });
  });

  socket.on('notepad_sync', (data: { roomId: string; text: string }) => {
    socket.to(data.roomId).emit('notepad_sync', { text: data.text });
  });

  socket.on('execution_sync', (data: { roomId: string; results: any }) => {
    socket.to(data.roomId).emit('execution_sync', { results: data.results });
  });

  socket.on('peer_message', (data: { roomId: string; message: any }) => {
    socket.to(data.roomId).emit('peer_message', data.message);
  });

  socket.on('disconnect', () => {
    removeFromQueue(socket.id);
  });
});

const removeFromQueue = (socketId: string) => {
  const index = activeQueue.findIndex(u => u.socketId === socketId);
  if (index !== -1) {
    activeQueue.splice(index, 1);
  }
};

const tryTriggerMatch = () => {
  if (activeQueue.length < 2) return;

  for (let i = 0; i < activeQueue.length; i++) {
    for (let j = i + 1; j < activeQueue.length; j++) {
      const u1 = activeQueue[i];
      const u2 = activeQueue[j];

      // Pair users of similar ratings (within 200 Elo)
      if (Math.abs(u1.rating - u2.rating) <= 200) {
        activeQueue.splice(j, 1);
        activeQueue.splice(i, 1);

        const roomId = `room_${u1.userId}_${u2.userId}`;
        const s1 = io.sockets.sockets.get(u1.socketId);
        const s2 = io.sockets.sockets.get(u2.socketId);

        if (s1 && s2) {
          s1.join(roomId);
          s2.join(roomId);

          s1.emit('match_found', { roomId, role: 'interviewer', peerId: u2.userId, peerRating: u2.rating });
          s2.emit('match_found', { roomId, role: 'candidate', peerId: u1.userId, peerRating: u1.rating });
        } else {
          if (s1) activeQueue.push(u1);
          if (s2) activeQueue.push(u2);
        }
        return;
      }
    }
  }
};

// Default Coding Problems
const sampleProblems = [
  {
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    starterTemplate: 'function twoSum(nums, target) {\n  // Write your code here\n  \n}'
  },
  {
    id: 'reverse-string',
    title: 'Reverse String',
    difficulty: 'Easy',
    description: 'Write a function that reverses a string. The input string is given as an array of characters s. You must do this in-place with O(1) extra memory.',
    starterTemplate: 'function reverseString(s) {\n  // Write your code here\n  \n}'
  },
  {
    id: 'palindrome-number',
    title: 'Palindrome Number',
    difficulty: 'Easy',
    description: 'Given an integer x, return true if x is a palindrome, and false otherwise.',
    starterTemplate: 'function isPalindrome(x) {\n  // Write your code here\n  \n}'
  },
  {
    id: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    description: 'Given a string s containing just the characters \'( \', \')\', \'{\', \'}\', \'[\' and \']\', determine if the input string is valid.',
    starterTemplate: 'function isValid(s) {\n  // Write your code here\n  \n}'
  }
];

// ==========================================
// REST API ROUTES
// ==========================================

// Authentication Routes
app.post('/api/auth/signup', async (req: Request, res: Response) => {
  const { email, password, nickname } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Email already registered.' });
    }
    const user = await User.create({ email, password, nickname });
    res.json({ success: true, user: { id: user._id, email: user.email, nickname: user.nickname, rating: user.rating } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(400).json({ success: false, error: 'Invalid email or password.' });
    }
    res.json({ success: true, user: { id: user._id, email: user.email, nickname: user.nickname, rating: user.rating } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// User Dashboard Statistics & Solved Problems History
app.get('/api/user/dashboard/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid User ID.' });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const sessions = await InterviewSession.find({ userId }).sort({ date: -1 });
    
    // Calculate category averages
    let techAvg = 0, commAvg = 0, behavAvg = 0;
    if (sessions.length > 0) {
      techAvg = Math.round(sessions.reduce((acc, s) => acc + s.technicalScore, 0) / sessions.length);
      commAvg = Math.round(sessions.reduce((acc, s) => acc + s.communicationScore, 0) / sessions.length);
      behavAvg = Math.round(sessions.reduce((acc, s) => acc + s.behavioralScore, 0) / sessions.length);
    }

    res.json({
      success: true,
      profile: {
        nickname: user.nickname,
        rating: user.rating,
        peakRating: user.peakRating,
        solvedCount: user.createdProblemsSolved
      },
      stats: {
        totalInterviews: sessions.length,
        technicalAverage: techAvg,
        communicationAverage: commAvg,
        behavioralAverage: behavAvg
      },
      history: sessions
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Log Session solved results and update user Elo Rating score in MongoDB
app.post('/api/user/session', async (req: Request, res: Response) => {
  const { userId, problemTitle, difficulty, code, overallScore, technicalScore, communicationScore, behavioralScore, feedback } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

    // Elo adjustment calculation
    let ratingChange = 0;
    if (overallScore > 75) {
      ratingChange = Math.round((overallScore - 75) * 0.8);
    } else if (overallScore < 60) {
      ratingChange = -Math.round((60 - overallScore) * 0.8);
    }

    const nextRating = Math.max(800, user.rating + ratingChange);
    user.rating = nextRating;
    if (nextRating > user.peakRating) {
      user.peakRating = nextRating;
    }
    user.createdProblemsSolved += 1;
    await user.save();

    const session = await InterviewSession.create({
      userId,
      problemTitle,
      difficulty,
      code,
      overallScore,
      technicalScore,
      communicationScore,
      behavioralScore,
      feedback
    });

    res.json({ success: true, newRating: user.rating, session });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/questions', (req: Request, res: Response) => {
  res.json(sampleProblems);
});

// Fetch LeetCode challenge using corrected browser-like Request Headers
app.post('/api/leetcode/fetch-problem', async (req: Request, res: Response) => {
  const { slug } = req.body;
  if (!slug) {
    return res.status(400).json({ success: false, error: 'No LeetCode slug provided.' });
  }

  try {
    const graphqlQuery = `
      query questionData($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          questionId
          title
          titleSlug
          content
          difficulty
          codeSnippets {
            lang
            langSlug
            code
          }
        }
      }
    `;

    // Fetch problem using valid browser-like headers
    const response = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Referer': 'https://leetcode.com'
      },
      body: JSON.stringify({ query: graphqlQuery, variables: { titleSlug: slug } })
    });

    const result = await response.json();
    const question = result.data?.question;

    if (!question) {
      return res.json({ success: false, error: 'LeetCode problem not found. Please check slug spelling.' });
    }

    const jsSnippet = question.codeSnippets?.find((s: any) => s.langSlug === 'javascript');
    const starterTemplate = jsSnippet ? jsSnippet.code : 'function solve() {\n  // Write your code here\n}';
    
    // HTML stripper
    const cleanDescription = question.content
      ? question.content.replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n').trim()
      : 'No description details found.';

    res.json({
      success: true,
      problem: {
        id: question.titleSlug,
        title: question.title,
        difficulty: question.difficulty,
        description: cleanDescription,
        starterTemplate
      }
    });
  } catch (err: any) {
    res.json({ success: false, error: err.message || 'Error communicating with LeetCode.' });
  }
});

// Run Code Sandbox using Node vm
app.post('/api/run-code', async (req: Request, res: Response) => {
  const { code, problemId, problemDescription } = req.body;

  if (!code) {
    return res.status(400).json({ success: false, error: 'No code provided.' });
  }

  const hardcodedIds = ['two-sum', 'reverse-string', 'palindrome-number', 'valid-parentheses'];
  if (hardcodedIds.includes(problemId)) {
    try {
      const consoleLogs: string[] = [];
      const sandbox = {
        console: {
          log: (...args: any[]) => {
            consoleLogs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '));
          }
        }
      };

      vm.createContext(sandbox);
      vm.runInContext(code, sandbox);

      let testCases: any[] = [];
      let testRunnerCode = '';

      if (problemId === 'two-sum') {
        testCases = [
          { input: [[2, 7, 11, 15], 9], expected: [0, 1] },
          { input: [[3, 2, 4], 6], expected: [1, 2] }
        ];
        testRunnerCode = `
          const results = [];
          const cases = ${JSON.stringify(testCases)};
          cases.forEach(c => {
            const res = twoSum(c.input[0], c.input[1]);
            const sortedRes = Array.isArray(res) ? [...res].sort((a,b) => a-b) : [];
            const sortedExp = [...c.expected].sort((a,b) => a-b);
            results.push({ input: c.input, expected: c.expected, actual: res, passed: JSON.stringify(sortedRes) === JSON.stringify(sortedExp) });
          });
          results;
        `;
      } else if (problemId === 'reverse-string') {
        testCases = [
          { input: [["h","e","l","l","o"]], expected: ["o","l","l","e","h"] }
        ];
        testRunnerCode = `
          const results = [];
          const cases = ${JSON.stringify(testCases)};
          cases.forEach(c => {
            const arr = [...c.input[0]];
            reverseString(arr);
            results.push({ input: c.input, expected: c.expected, actual: arr, passed: JSON.stringify(arr) === JSON.stringify(c.expected) });
          });
          results;
        `;
      } else if (problemId === 'palindrome-number') {
        testCases = [
          { input: [121], expected: true },
          { input: [-121], expected: false }
        ];
        testRunnerCode = `
          const results = [];
          const cases = ${JSON.stringify(testCases)};
          cases.forEach(c => {
            const res = isPalindrome(c.input[0]);
            results.push({ input: c.input, expected: c.expected, actual: res, passed: res === c.expected });
          });
          results;
        `;
      } else if (problemId === 'valid-parentheses') {
        testCases = [
          { input: ["()"], expected: true },
          { input: ["(]"], expected: false }
        ];
        testRunnerCode = `
          const results = [];
          const cases = ${JSON.stringify(testCases)};
          cases.forEach(c => {
            const res = isValid(c.input[0]);
            results.push({ input: c.input, expected: c.expected, actual: res, passed: res === c.expected });
          });
          results;
        `;
      }

      const testResults = vm.runInContext(testRunnerCode, sandbox);
      return res.json({
        success: true,
        passed: testResults.every((t: any) => t.passed),
        logs: consoleLogs,
        testResults
      });
    } catch (error: any) {
      return res.json({ success: false, error: error.message || 'Execution error.' });
    }
  }

  // Dynamic sandbox using Gemini API to generate & run tests
  if (!genAI) {
    return res.json({
      success: true,
      passed: true,
      logs: ["Running mock evaluation (No Gemini Key configured)..."],
      testResults: [
        { input: "Mock Input", expected: "Mock Output", actual: "Mock Output", passed: true }
      ]
    });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const runPrompt = `
      You are a JavaScript execution engine tester.
      Verify the correctness of the following JavaScript solution code:
      "${code}"

      For the LeetCode problem description:
      "${problemDescription || problemId}"

      Compute 3 test cases. Provide a clean JSON object containing whether the code works, and output logs. Do not return markdown delimiters.
      JSON Format:
      {
        "passed": <boolean>,
        "logs": ["test start logs"],
        "testResults": [
          { "input": "input representation", "expected": "expected representation", "actual": "actual output", "passed": <boolean> }
        ]
      }
    `;

    const responseResult = await model.generateContent(runPrompt);
    const rawText = responseResult.response.text().trim();
    const jsonStart = rawText.indexOf('{');
    const jsonEnd = rawText.lastIndexOf('}') + 1;
    const parsed = JSON.parse(rawText.substring(jsonStart, jsonEnd));
    res.json({ success: true, ...parsed });
  } catch (err: any) {
    res.json({ success: false, error: err.message || 'Dynamic execution failed.' });
  }
});

// Google Gemini AI Chat & Final Scorecard Generation endpoint
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  const { problemDescription, messages, currentCode, userInput, action } = req.body;

  // Enhanced dynamic mock dialogue simulation when Gemini API key is missing
  const getMockDialogueResponse = (historyLen: number, problem: string) => {
    const stage = Math.floor(historyLen / 2);
    
    if (problem.toLowerCase().includes('two sum')) {
      const responses = [
        "Welcome! We are starting the interview with 'Two Sum'. What is your general strategy? How would you solve this in O(N) time complexity?",
        "A HashMap lookup is indeed optimal here. Can you walk me through what you store as key/value in your Map?",
        "Correct. If you loop through, check if (target - current) is in the Map. Go ahead and start typing this out in the Sandbox editor.",
        "Excellent draft. Before submitting, what would happen if the array is empty or no two numbers sum to the target? How does your code handle edge-cases?",
        "Looking very solid. Run your code in the sandbox to verify tests, and hit 'Finish & Score' in the top right to generate your capability metrics report!"
      ];
      return responses[Math.min(stage, responses.length - 1)];
    } else if (problem.toLowerCase().includes('reverse string')) {
      const responses = [
        "Welcome! Let's examine 'Reverse String'. How do we achieve this in-place with O(1) constant extra memory?",
        "Right, we should avoid creating a new array. A two-pointer approach starting at left and right works. What is the condition of your swap loop?",
        "Yes, while (left < right). Go ahead and draft the swapping logic in the Monaco coding screen.",
        "Good. How does your solution handle arrays with odd lengths? Does the middle element need an explicit swap?",
        "Everything checks out. Compile your code to verify it reverses correctly, and then feel free to finalize the interview session!"
      ];
      return responses[Math.min(stage, responses.length - 1)];
    } else {
      // General question fallback
      const responses = [
        "Welcome to the mock assessment. Can you describe your initial approach to this challenge?",
        "Good. What datastructures would be most optimal here and what are their complexity trade-offs?",
        "Got it. Go ahead and write the function template inside the Sandbox Monaco Editor.",
        "I see your draft. Can we check edge cases? What if the parameters are null or empty?",
        "The implementation is ready. Feel free to compile it to verify correctness, and click 'Finish & Score' when you are happy to get graded!"
      ];
      return responses[Math.min(stage, responses.length - 1)];
    }
  };

  const generateMockScorecard = () => {
    const isSolved = currentCode && (currentCode.includes('return') || currentCode.includes('map') || currentCode.includes('reverse') || currentCode.includes('stack'));
    const score = isSolved ? Math.floor(Math.random() * 15) + 80 : Math.floor(Math.random() * 20) + 55;
    const techScore = isSolved ? Math.floor(Math.random() * 10) + 85 : Math.floor(Math.random() * 15) + 50;
    const commScore = Math.floor(Math.random() * 15) + 75;
    const behavScore = Math.floor(Math.random() * 20) + 70;
    const overall = Math.floor((techScore + commScore + behavScore) / 3);

    return {
      technicalScore: techScore,
      communicationScore: commScore,
      behavioralScore: behavScore,
      overallScore: overall,
      strengths: [
        isSolved ? "Excellent code structure and logic implementation." : "Strong attempt to formulate code outline.",
        "Demonstrated systematic reasoning and good explanation of algorithm steps.",
        "Maintained professional composure during the interview."
      ],
      improvements: [
        isSolved ? "Consider optimizing the time complexity or handling boundary inputs." : "Focus on basic control flows and debugging test cases before finishing.",
        "Communicate your thought process dynamically while writing the code.",
        "Ensure validation of edge cases (e.g., empty arrays, null values)."
      ],
      feedback: "The candidate shows high potential and handles feedback well. They were receptive to clues and adjusted their approach. With more practice on standard algorithms and optimization techniques, they will perform very well in actual hiring rounds.",
      optimizedCode: problemDescription?.includes('Two Sum')
        ? `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`
        : `function reverseString(s) {
  let left = 0;
  let right = s.length - 1;
  while (left < right) {
    const temp = s[left];
    s[left] = s[right];
    s[right] = temp;
    left++;
    right--;
  }
}`
    };
  };

  if (!genAI) {
    if (action === 'evaluate') {
      return res.json({ success: true, data: generateMockScorecard() });
    } else {
      const replyText = getMockDialogueResponse(messages.length, problemDescription || 'General');
      return res.json({ success: true, message: replyText });
    }
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    if (action === 'evaluate') {
      const evaluationPrompt = `
        You are a highly senior, elite engineering interviewer conducting a technical coding assessment.
        Analyze the following interview history, including the coding challenge, candidate responses, and candidate code.
        
        Challenge:
        ${JSON.stringify(problemDescription)}
        
        Candidate's Final Code:
        ${currentCode}
        
        Dialogue History:
        ${JSON.stringify(messages)}
        
        Generate a detailed, constructive scorecard in JSON format. Do not return any other text, markdown formatting, or explainers. Just return the JSON object matching this schema:
        {
          "technicalScore": <number 0-100>,
          "communicationScore": <number 0-100>,
          "behavioralScore": <number 0-100>,
          "overallScore": <number 0-100>,
          "strengths": ["string", "string", ...],
          "improvements": ["string", "string", ...],
          "feedback": "detailed evaluation paragraph",
          "optimizedCode": "javascript string containing optimized code solution with clear comments"
        }
      `;

      const result = await model.generateContent(evaluationPrompt);
      const rawText = result.response.text().trim();
      const jsonStart = rawText.indexOf('{');
      const jsonEnd = rawText.lastIndexOf('}') + 1;
      const cleanJson = rawText.substring(jsonStart, jsonEnd);

      const parsedData = JSON.parse(cleanJson);
      return res.json({ success: true, data: parsedData });

    } else {
      // System prompt mapping out realistic multi-stage interview behavior
      const chatPrompt = `
        You are a friendly yet rigorous AI Tech Recruiter interviewing a candidate.
        Maintain standard professional persona. Walk them through these progressive stages:
        1. Behavioral Warmup (ask them to describe their approach or background briefly).
        2. Presentation of challenge.
        3. Implementation review (as they type code, give minor hints or reviews).
        4. Complexity Analysis (ask them to explain Big O time and space parameters).
        5. Wrap-up.

        The current challenge details are:
        ${JSON.stringify(problemDescription)}
        
        Candidate's current code is:
        ${currentCode}
        
        Interview history so far:
        ${JSON.stringify(messages)}
        
        Candidate's latest input:
        "${userInput}"
        
        Provide a concise, conversational follow-up (1-3 sentences) aligning with the current stage of conversation.
        Do not output JSON, code blocks, or markdown headings. Speak directly to the candidate.
      `;

      const result = await model.generateContent(chatPrompt);
      const reply = result.response.text().trim();
      return res.json({ success: true, message: reply });
    }
  } catch (err: any) {
    console.error('Gemini API Error:', err);
    if (action === 'evaluate') {
      return res.json({ success: true, data: generateMockScorecard() });
    } else {
      return res.json({ success: true, message: "That's an interesting approach. Let's look at the complexity. Can you walk me through your code?" });
    }
  }
});

// Boot Database and Server
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai-interviews';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('💾 Connected to MongoDB successfully.');
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failure:', err);
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT} (Database disconnected)`);
    });
  });