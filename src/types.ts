/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type QuestionType = 'subjective' | 'mcq_single' | 'mcq_multi';

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  questionText: string;
  difficulty: 'mixed' | 'easy' | 'medium' | 'hard';
  subject: string;
  suggestedDuration?: number; // in seconds
}

export interface SubjectiveQuestion extends BaseQuestion {
  type: 'subjective';
  modelAnswer: string;
  keywords: string[];
}

export interface MCQOption {
  id: string;
  text: string;
}

export interface MCQSingleQuestion extends BaseQuestion {
  type: 'mcq_single';
  options: MCQOption[];
  correctOptionId: string;
  explanation: string;
}

export interface MCQMultiQuestion extends BaseQuestion {
  type: 'mcq_multi';
  options: MCQOption[];
  correctOptionIds: string[];
  explanation: string;
}

export type InterviewQuestion = SubjectiveQuestion | MCQSingleQuestion | MCQMultiQuestion;

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  targetRole: string;
  preferredMode: 'voice' | 'text';
  preferredVoice: string; // Voice name or 'default'
  preferredTheme: 'light' | 'dark' | 'system';
  streakDays: number;
  lastActiveDate?: string;
  createdAt: string;
  authProvider?: string;
}

export interface QuestionFeedback {
  technicalAccuracy: number | null; // 0-100 or null if Not Evaluated / Insufficient Data
  communication: number | null; // 0-100 or null if Not Evaluated / Insufficient Data
  clarity: number | null; // 0-100 or null if Not Evaluated / Insufficient Data
  completeness: number | null; // 0-100 or null if Not Evaluated
  confidence: number | null; // 0-100 or null if Not Evaluated
  overallScore: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  improvementSuggestions: string;
  expectedVsActualDiff?: string;
}

export interface AnswerSubmission {
  questionId: string;
  userAnswer: string; // spoken text or selected option text/IDs
  selectedOptionIds?: string[]; // for MCQ
  timeTakenSeconds: number;
  transcriptionEdited?: boolean;
  feedback?: QuestionFeedback;
}

export interface OverallFeedback {
  averageScore: number;
  technicalAccuracy: number | null;
  communication: number | null;
  clarity: number | null;
  completeness: number | null;
  confidence: number | null;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  actionableSuggestions: string[];
  recommendedResources?: string[];
}

export interface InterviewSession {
  id: string;
  userId: string;
  role: string;
  subject: string;
  difficulty: 'mixed' | 'easy' | 'medium' | 'hard';
  format?: 'mixed' | 'subjective' | 'mcq' | 'application';
  questionCount: number;
  mode: 'voice' | 'text';
  timeMode: 'no_limit' | 'timed';
  totalDurationSeconds?: number;
  questions: InterviewQuestion[];
  answers: Record<string, AnswerSubmission>; // questionId -> AnswerSubmission
  status: 'pending' | 'in_progress' | 'completed' | 'abandoned';
  createdAt: string;
  completedAt?: string;
  overallFeedback?: OverallFeedback;
}

export interface DashboardStats {
  totalInterviews: number;
  completedInterviews: number;
  streakDays: number;
  averageScore: number;
  strongestSubject: string;
  weakestSubject: string;
  subjectScores: { subject: string; score: number }[];
  weeklyStreaks: { day: string; completed: boolean }[];
  recommendations: string[];
}
