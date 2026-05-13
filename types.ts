// ─── THE BRIDGE — TYPE DEFINITIONS ───────────────────────────────────────────

export type AppMode = 'home' | 'auth' | 'dashboard' | 'session' | 'report';

export type Language = 'en' | 'ar';

export interface User {
  id: string;
  email: string;
  name: string;
  language?: Language;
}

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export type ExerciseType = 'mcq' | 'fill_blank' | 'true_false' | 'open_ended';

export type Subject =
  | 'Mathematics' | 'Physics' | 'History' | 'Biology'
  | 'Computer Science' | 'Literature' | 'Chemistry' | 'Economics'
  | 'Based on PDF';

export interface LearnerProfile {
  name: string;
  subject: Subject | string;
  currentLevel: DifficultyLevel;
  sessionLength: number;
  language: Language;
  totalXP: number;
  sessionsCompleted: number;
  weakAreas: string[];
  strongAreas: string[];
  lastActive: string;
}

export interface Exercise {
  id: string;
  type: ExerciseType;
  question: string;
  options?: string[] | null;
  correctAnswer: string;
  explanation: string;
  topic: string;
  difficulty: DifficultyLevel;
  hints?: string[];
}

export interface ExerciseResult {
  exerciseId: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeTaken: number;
  topic: string;
  difficulty: DifficultyLevel;
}

export interface ProgressReport {
  overallScore: number;
  strengthsSummary: string;
  weaknessesSummary: string;
  recommendedTopics: string[];
  nextDifficulty: DifficultyLevel;
  sessionResults: ExerciseResult[];
  aiCoachMessage: string;
}
