export interface Problem {
  id: string;
  title: string;
  difficulty: string;
  description: string;
  starterTemplate: string;
}

export interface Scorecard {
  technicalScore: number;
  communicationScore: number;
  behavioralScore: number;
  overallScore: number;
  strengths: string[];
  improvements: string[];
  feedback: string;
  optimizedCode: string;
}

export interface UserSession {
  id: string;
  email: string;
  nickname: string;
  rating: number;
}

export interface HistoryItem {
  _id: string;
  problemTitle: string;
  difficulty: string;
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  behavioralScore: number;
  feedback: string;
  date: string;
}