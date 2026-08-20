export type ScreenType = 
  | 'dashboard'
  | 'tutor'
  | 'quiz'
  | 'summarizer'
  | 'planner'
  | 'notes'
  | 'library'
  | 'profile';

export type Subject = 
  | 'Computer Science'
  | 'Mathematics'
  | 'Physics'
  | 'Chemistry'
  | 'Biology'
  | 'History'
  | 'Literature'
  | 'Economics'
  | 'Psychology'
  | 'Medicine'
  | 'Philosophy'
  | 'Engineering'
  | 'General';

export type TutorPersona = 
  | 'socratic'
  | 'exam_coach'
  | 'simplifier'
  | 'code_math';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  gradeLevel: string;
  targetDailyMinutes: number;
  streakDays: number;
  lastActiveDate: string;
  xp: number;
  level: number;
  selectedSubjects: Subject[];
  soundEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  onboarded?: boolean;
}

export interface TutorAttachment {
  type: 'image' | 'file';
  name: string;
  url?: string;
  data?: string; // base64 string
  mimeType?: string;
  size?: number;
  extractedText?: string;
}

export interface TutorMessage {
  id: string;
  sender: 'user' | 'tutor';
  text: string;
  timestamp: string;
  subject?: Subject;
  persona?: TutorPersona;
  suggestions?: string[];
  attachment?: TutorAttachment;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  userSelectedAnswer?: number;
  isFlagged?: boolean;
}

export interface Quiz {
  id: string;
  title: string;
  subject: Subject;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questions: QuizQuestion[];
  createdAt: string;
  lastScore?: number;
  totalQuestions: number;
  timeLimitMinutes?: number;
  completedAt?: string;
}

export type NoteSource = 'ai_tutor' | 'smart_summarizer' | 'manual' | 'quiz_review';

export interface Note {
  id: string;
  title: string;
  content: string;
  subject: Subject;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isPinned?: boolean;
  source?: NoteSource | string;
  sourceDetails?: {
    userPrompt?: string; // original user question/prompt from AI Tutor
    persona?: TutorPersona;
    originalDocumentName?: string; // file name or document title from Smart Summarizer
    summaryType?: string;
    originalSourceSnippet?: string;
  };
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  explanation?: string;
  subject: Subject;
  deckId?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  lastReviewed?: string;
  repetitions: number;
  intervalDays: number;
  reviewed?: boolean;
}

export interface FlashcardDeck {
  id: string;
  title: string;
  subject: Subject;
  description: string;
  cards: Flashcard[];
  createdAt: string;
  updatedAt?: string;
  lastStudied?: string;
  source?: 'smart_summarizer' | 'ai_tutor' | 'note_extracted' | 'manual' | string;
  currentCardIndex?: number;
  reviewedCardIds?: string[];
}

export interface StudyTask {
  id: string;
  title: string;
  subject: Subject;
  date: string; // YYYY-MM-DD
  time?: string;
  durationMinutes: number;
  isCompleted: boolean;
  priority: 'low' | 'medium' | 'high';
  aiSuggested?: boolean;
  notes?: string;
  createdAt?: string;
}

export interface SummaryResult {
  id?: string;
  title: string;
  originalText?: string;
  summaryType?: 'bullet_points' | 'executive' | 'flashcards' | 'feynman' | 'qa' | string;
  summaryContent: string;
  keyTakeaways: string[];
  flashcards?: Array<{ front: string; back: string }>;
  subject?: Subject;
  createdAt?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconName: string;
  category: 'streak' | 'quiz' | 'notes' | 'tutor' | 'planner';
  unlockedAt?: string;
  progress: number;
  maxProgress: number;
  xpReward: number;
}

export interface StudySessionLog {
  id: string;
  date: string;
  durationMinutes: number;
  type: 'pomodoro' | 'quiz' | 'tutor' | 'flashcards' | 'notes';
  subject: Subject;
  xpEarned: number;
}

export interface NavigationOrigin {
  screen: ScreenType;
  label: string; // e.g. "Back to Summary", "Back to AI Tutor", "Back to Note", "Back to Library"
  substate?: {
    noteId?: string;
    deckId?: string;
    topic?: string;
    subject?: Subject;
    [key: string]: any;
  };
}

export interface SummarizerState {
  inputText: string;
  subject: Subject;
  summaryType: string;
  result: SummaryResult | null;
  parsedDocInfo: {
    filename: string;
    fileType: 'pdf' | 'docx' | 'pptx' | 'txt' | 'md';
    pageCount?: number;
    slideCount?: number;
    wordCount: number;
    extractedText: string;
  } | null;
  activeOutputTab: 'summary' | 'takeaways' | 'flashcards';
  cardIndex: number;
}

export interface TutorSessionState {
  selectedSubject: Subject;
  selectedPersona: TutorPersona;
  attachedNoteId: string | null;
  draftInput: string;
}
