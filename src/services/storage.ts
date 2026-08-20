import { 
  UserProfile, 
  Note, 
  Quiz, 
  FlashcardDeck, 
  StudyTask, 
  Achievement, 
  StudySessionLog, 
  SummaryResult, 
  TutorMessage, 
  SummarizerState, 
  TutorSessionState, 
  NavigationOrigin 
} from '../types';
import { AuthService } from './authService';

let activeUserId: string | null = null;
let activeUserProfile: UserProfile | null = null;
let syncTimeout: any = null;

const BASE_KEYS = {
  USER: 'user',
  NOTES: 'notes',
  QUIZZES: 'quizzes',
  FLASHCARDS: 'flashcards',
  TASKS: 'tasks',
  ACHIEVEMENTS: 'achievements',
  SUMMARIES: 'summaries',
  SESSIONS: 'sessions',
  TUTOR_CHAT: 'tutor_chat',
  SUMMARIZER_STATE: 'summarizer_state',
  TUTOR_SESSION_STATE: 'tutor_session_state',
  NAVIGATION_ORIGIN: 'nav_origin',
};

function getStorageKey(baseKey: string): string {
  if (activeUserId) {
    return `studymate_${activeUserId}_${baseKey}`;
  }
  return `studymate_guest_${baseKey}`;
}

export class StorageService {
  /**
   * Set the active authenticated user and optionally hydrate initial data from server
   */
  static setActiveUser(user: UserProfile | null, initialData?: any) {
    if (!user) {
      activeUserId = null;
      activeUserProfile = null;
      return;
    }

    activeUserId = user.id;
    activeUserProfile = user;
    this.saveUser(user, false);

    if (initialData) {
      if (Array.isArray(initialData.notes)) {
        this.saveNotes(initialData.notes, false);
      }
      if (Array.isArray(initialData.quizzes)) {
        this.saveQuizzes(initialData.quizzes, false);
      }
      if (Array.isArray(initialData.flashcardDecks)) {
        this.saveFlashcardDecks(initialData.flashcardDecks, false);
      }
      if (Array.isArray(initialData.tasks)) {
        this.saveTasks(initialData.tasks, false);
      }
      if (Array.isArray(initialData.achievements)) {
        this.saveAchievements(initialData.achievements, false);
      }
      if (Array.isArray(initialData.tutorMessages)) {
        this.saveTutorHistory(initialData.tutorMessages, false);
      }
      if (initialData.summarizerState) {
        this.saveSummarizerState(initialData.summarizerState, false);
      }
      if (initialData.tutorSessionState) {
        this.saveTutorSessionState(initialData.tutorSessionState, false);
      }
    }
  }

  static getActiveUserId(): string | null {
    return activeUserId;
  }

  /**
   * Background debounced synchronization with server
   */
  static queueServerSync() {
    if (!activeUserId || typeof window === 'undefined') return;

    if (syncTimeout) {
      clearTimeout(syncTimeout);
    }

    syncTimeout = setTimeout(async () => {
      syncTimeout = null;
      try {
        const payload = {
          profile: this.getUser(),
          notes: this.getNotes(),
          quizzes: this.getQuizzes(),
          flashcardDecks: this.getFlashcardDecks(),
          tasks: this.getTasks(),
          achievements: this.getAchievements(),
          tutorMessages: this.getTutorHistory(),
          summarizerState: this.getSummarizerState(),
          tutorSessionState: this.getTutorSessionState(),
        };
        await AuthService.syncUserData(payload);
      } catch (err) {
        console.warn('[StorageService] Background sync warning:', err);
      }
    }, 400);
  }

  // --- USER PROFILE ---
  static getUser(): UserProfile {
    if (activeUserProfile) return activeUserProfile;

    try {
      const key = getStorageKey(BASE_KEYS.USER);
      const data = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      if (data) {
        const parsed = JSON.parse(data);
        activeUserProfile = parsed;
        return parsed;
      }
    } catch (e) {
      console.error('[StorageService] Failed to load user', e);
    }

    const defaultProfile: UserProfile = {
      id: activeUserId || 'guest',
      name: '',
      email: '',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      gradeLevel: 'Undergraduate (Year 1-2)',
      targetDailyMinutes: 60,
      streakDays: 1,
      lastActiveDate: new Date().toISOString().split('T')[0],
      xp: 0,
      level: 1,
      selectedSubjects: ['Computer Science', 'Mathematics', 'Physics', 'Biology'],
      soundEnabled: true,
      theme: 'light',
      onboarded: true,
    };
    return defaultProfile;
  }

  static saveUser(user: UserProfile, shouldSync = true): UserProfile {
    activeUserProfile = user;
    try {
      const key = getStorageKey(BASE_KEYS.USER);
      localStorage.setItem(key, JSON.stringify(user));
    } catch (e) {
      console.error('[StorageService] Failed to save user profile', e);
    }

    if (shouldSync) {
      this.queueServerSync();
    }
    return user;
  }

  static updateTheme(theme: 'light' | 'dark' | 'system'): UserProfile {
    const user = this.getUser();
    user.theme = theme;
    return this.saveUser(user);
  }

  static addXP(amount: number): UserProfile {
    const user = this.getUser();
    user.xp = (user.xp || 0) + amount;
    user.level = Math.floor(user.xp / 400) + 1;
    return this.saveUser(user);
  }

  // --- NOTES ---
  static getNotes(): Note[] {
    try {
      const key = getStorageKey(BASE_KEYS.NOTES);
      const data = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('[StorageService] Failed to load notes', e);
    }
    return [];
  }

  static saveNotes(notes: Note[], shouldSync = true): Note[] {
    try {
      const key = getStorageKey(BASE_KEYS.NOTES);
      localStorage.setItem(key, JSON.stringify(notes));
    } catch (e) {
      console.error('[StorageService] Failed to save notes', e);
    }

    if (shouldSync) {
      this.queueServerSync();
    }
    return notes;
  }

  static saveNote(note: Note): Note[] {
    const notes = this.getNotes();
    const index = notes.findIndex(n => n.id === note.id);
    const updatedNote: Note = {
      ...note,
      updatedAt: new Date().toISOString(),
    };
    if (index >= 0) {
      notes[index] = updatedNote;
    } else {
      notes.unshift(updatedNote);
    }
    return this.saveNotes(notes);
  }

  static deleteNote(id: string): Note[] {
    const notes = this.getNotes().filter(n => n.id !== id);
    return this.saveNotes(notes);
  }

  // --- QUIZZES ---
  static getQuizzes(): Quiz[] {
    try {
      const key = getStorageKey(BASE_KEYS.QUIZZES);
      const data = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('[StorageService] Failed to load quizzes', e);
    }
    return [];
  }

  static saveQuizzes(quizzes: Quiz[], shouldSync = true): Quiz[] {
    try {
      const key = getStorageKey(BASE_KEYS.QUIZZES);
      localStorage.setItem(key, JSON.stringify(quizzes));
    } catch (e) {
      console.error('[StorageService] Failed to save quizzes', e);
    }

    if (shouldSync) {
      this.queueServerSync();
    }
    return quizzes;
  }

  static saveQuiz(quiz: Quiz): Quiz[] {
    const quizzes = this.getQuizzes();
    const index = quizzes.findIndex(q => q.id === quiz.id);
    if (index >= 0) {
      quizzes[index] = quiz;
    } else {
      quizzes.unshift(quiz);
    }
    return this.saveQuizzes(quizzes);
  }

  static deleteQuiz(id: string): Quiz[] {
    const quizzes = this.getQuizzes().filter(q => q.id !== id);
    return this.saveQuizzes(quizzes);
  }

  static recordQuizScore(quizId: string, score: number): Quiz[] {
    const quizzes = this.getQuizzes();
    const quiz = quizzes.find(q => q.id === quizId);
    if (quiz) {
      quiz.lastScore = score;
      quiz.completedAt = new Date().toISOString();
      return this.saveQuizzes(quizzes);
    }
    return quizzes;
  }

  // --- FLASHCARDS ---
  static getFlashcardDecks(): FlashcardDeck[] {
    try {
      const key = getStorageKey(BASE_KEYS.FLASHCARDS);
      const data = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('[StorageService] Failed to load flashcards', e);
    }
    return [];
  }

  static saveFlashcardDecks(decks: FlashcardDeck[], shouldSync = true): FlashcardDeck[] {
    try {
      const key = getStorageKey(BASE_KEYS.FLASHCARDS);
      localStorage.setItem(key, JSON.stringify(decks));
    } catch (e) {
      console.error('[StorageService] Failed to save flashcards', e);
    }

    if (shouldSync) {
      this.queueServerSync();
    }
    return decks;
  }

  static saveFlashcardDeck(deck: FlashcardDeck): FlashcardDeck[] {
    const decks = this.getFlashcardDecks();
    const index = decks.findIndex(d => d.id === deck.id);
    const updatedDeck: FlashcardDeck = {
      ...deck,
      updatedAt: new Date().toISOString(),
    };
    if (index >= 0) {
      decks[index] = updatedDeck;
    } else {
      decks.unshift(updatedDeck);
    }
    return this.saveFlashcardDecks(decks);
  }

  static deleteFlashcardDeck(id: string): FlashcardDeck[] {
    const decks = this.getFlashcardDecks().filter(d => d.id !== id);
    return this.saveFlashcardDecks(decks);
  }

  static updateFlashcardDeckProgress(deckId: string, cardIndex: number, reviewedCardId?: string): FlashcardDeck[] {
    const decks = this.getFlashcardDecks();
    const deck = decks.find(d => d.id === deckId);
    if (deck) {
      deck.currentCardIndex = cardIndex;
      deck.lastStudied = new Date().toISOString();
      if (reviewedCardId) {
        const set = new Set(deck.reviewedCardIds || []);
        set.add(reviewedCardId);
        deck.reviewedCardIds = Array.from(set);
      }
      return this.saveFlashcardDecks(decks);
    }
    return decks;
  }

  // --- STUDY TASKS ---
  static getTasks(): StudyTask[] {
    try {
      const key = getStorageKey(BASE_KEYS.TASKS);
      const data = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('[StorageService] Failed to load tasks', e);
    }
    return [];
  }

  static saveTasks(tasks: StudyTask[], shouldSync = true): StudyTask[] {
    try {
      const key = getStorageKey(BASE_KEYS.TASKS);
      localStorage.setItem(key, JSON.stringify(tasks));
    } catch (e) {
      console.error('[StorageService] Failed to save tasks', e);
    }

    if (shouldSync) {
      this.queueServerSync();
    }
    return tasks;
  }

  static saveTask(task: StudyTask): StudyTask[] {
    const tasks = [...this.getTasks()];
    const taskWithTimestamp: StudyTask = {
      ...task,
      createdAt: task.createdAt || new Date().toISOString(),
    };
    const index = tasks.findIndex(t => t.id === taskWithTimestamp.id);
    if (index >= 0) {
      tasks[index] = taskWithTimestamp;
    } else {
      tasks.unshift(taskWithTimestamp);
    }
    return this.saveTasks(tasks);
  }

  static toggleTaskCompletion(taskId: string): StudyTask[] {
    const tasks = this.getTasks().map(t => {
      if (t.id === taskId) {
        return { ...t, isCompleted: !t.isCompleted };
      }
      return t;
    });
    return this.saveTasks(tasks);
  }

  static deleteTask(id: string): StudyTask[] {
    const tasks = this.getTasks().filter(t => t.id !== id);
    return this.saveTasks(tasks);
  }

  // --- ACHIEVEMENTS ---
  static getAchievements(): Achievement[] {
    try {
      const key = getStorageKey(BASE_KEYS.ACHIEVEMENTS);
      const data = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('[StorageService] Failed to load achievements', e);
    }

    // Default starter achievements
    return [
      {
        id: 'ach-1',
        title: 'First Step to Mastery',
        description: 'Create your first study note or save an AI summary.',
        iconName: 'GraduationCap',
        category: 'notes',
        progress: 0,
        maxProgress: 1,
        xpReward: 100,
      },
      {
        id: 'ach-2',
        title: 'Consistent Scholar',
        description: 'Maintain a 3-day active study streak.',
        iconName: 'Flame',
        category: 'streak',
        progress: 1,
        maxProgress: 3,
        xpReward: 250,
      },
      {
        id: 'ach-3',
        title: 'Quiz Prodigy',
        description: 'Score 80% or higher on 3 quizzes.',
        iconName: 'Trophy',
        category: 'quiz',
        progress: 0,
        maxProgress: 3,
        xpReward: 300,
      },
      {
        id: 'ach-4',
        title: 'Socratic Thinker',
        description: 'Exchange 20+ messages with the AI Tutor.',
        iconName: 'Brain',
        category: 'tutor',
        progress: 0,
        maxProgress: 20,
        xpReward: 200,
      },
      {
        id: 'ach-5',
        title: 'Deep Focus Master',
        description: 'Complete 5 Pomodoro focus sessions.',
        iconName: 'Clock',
        category: 'planner',
        progress: 0,
        maxProgress: 5,
        xpReward: 350,
      },
      {
        id: 'ach-6',
        title: 'Knowledge Synthesizer',
        description: 'Generate 5 smart summaries or flashcard decks.',
        iconName: 'Sparkles',
        category: 'notes',
        progress: 0,
        maxProgress: 5,
        xpReward: 250,
      },
    ];
  }

  static saveAchievements(achievements: Achievement[], shouldSync = true): Achievement[] {
    try {
      const key = getStorageKey(BASE_KEYS.ACHIEVEMENTS);
      localStorage.setItem(key, JSON.stringify(achievements));
    } catch (e) {
      console.error('[StorageService] Failed to save achievements', e);
    }

    if (shouldSync) {
      this.queueServerSync();
    }
    return achievements;
  }

  static updateAchievementProgress(id: string, delta: number = 1): Achievement[] {
    const achievements = this.getAchievements();
    const ach = achievements.find(a => a.id === id);
    if (ach) {
      ach.progress = Math.min(ach.maxProgress, ach.progress + delta);
      if (ach.progress >= ach.maxProgress && !ach.unlockedAt) {
        ach.unlockedAt = new Date().toISOString();
        this.addXP(ach.xpReward);
      }
      return this.saveAchievements(achievements);
    }
    return achievements;
  }

  // --- AI TUTOR HISTORY ---
  static getTutorHistory(): TutorMessage[] {
    try {
      const key = getStorageKey(BASE_KEYS.TUTOR_CHAT);
      const data = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('[StorageService] Failed to load tutor chat', e);
    }

    return [
      {
        id: 'msg-init-1',
        sender: 'tutor',
        text: `Hello! I'm your **StudyMate AI Tutor**. I'm here to explain complex concepts, solve STEM equations step-by-step, quiz your retention, or help prep for exams.\n\nWhat subject or topic are we working on today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        persona: 'socratic',
        suggestions: [
          'Explain Time Complexity vs Space Complexity',
          'Help me understand the Citric Acid (Krebs) Cycle',
          'Give me a step-by-step calculus integration problem',
          'Test my knowledge on Physics conservation of momentum'
        ]
      }
    ];
  }

  static saveTutorHistory(messages: TutorMessage[], shouldSync = true): void {
    try {
      const key = getStorageKey(BASE_KEYS.TUTOR_CHAT);
      localStorage.setItem(key, JSON.stringify(messages));
    } catch (e) {
      console.error('[StorageService] Failed to save tutor chat', e);
    }

    if (shouldSync) {
      this.queueServerSync();
    }
  }

  static clearTutorHistory(): void {
    try {
      const key = getStorageKey(BASE_KEYS.TUTOR_CHAT);
      localStorage.removeItem(key);
    } catch (e) {
      console.error(e);
    }
    this.queueServerSync();
  }

  // --- SMART SUMMARIZER STATE ---
  static getSummarizerState(): SummarizerState {
    try {
      const key = getStorageKey(BASE_KEYS.SUMMARIZER_STATE);
      const data = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      if (data) {
        const parsed = JSON.parse(data);
        return {
          inputText: typeof parsed.inputText === 'string' ? parsed.inputText : '',
          subject: parsed.subject || 'Biology',
          summaryType: parsed.summaryType || 'bullet_points',
          result: parsed.result || null,
          parsedDocInfo: parsed.parsedDocInfo || null,
          activeOutputTab: parsed.activeOutputTab || 'summary',
          cardIndex: typeof parsed.cardIndex === 'number' ? parsed.cardIndex : 0,
        };
      }
    } catch (e) {
      console.error('[StorageService] Failed to load summarizer state', e);
    }
    return {
      inputText: '',
      subject: 'Biology',
      summaryType: 'bullet_points',
      result: null,
      parsedDocInfo: null,
      activeOutputTab: 'summary',
      cardIndex: 0,
    };
  }

  static saveSummarizerState(state: SummarizerState, shouldSync = true): void {
    try {
      const key = getStorageKey(BASE_KEYS.SUMMARIZER_STATE);
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.error('[StorageService] Failed to save summarizer state', e);
    }

    if (shouldSync) {
      this.queueServerSync();
    }
  }

  static clearSummarizerState(): void {
    try {
      const key = getStorageKey(BASE_KEYS.SUMMARIZER_STATE);
      localStorage.removeItem(key);
    } catch (e) {
      console.error(e);
    }
    this.queueServerSync();
  }

  static exportAllData(): string {
    const backup = {
      user: this.getUser(),
      notes: this.getNotes(),
      quizzes: this.getQuizzes(),
      flashcards: this.getFlashcardDecks(),
      tasks: this.getTasks(),
      achievements: this.getAchievements(),
      summarizerState: this.getSummarizerState(),
      tutorHistory: this.getTutorHistory(),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(backup, null, 2);
  }

  // --- AI TUTOR SESSION STATE ---
  static getTutorSessionState(): TutorSessionState {
    try {
      const key = getStorageKey(BASE_KEYS.TUTOR_SESSION_STATE);
      const data = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      if (data) {
        const parsed = JSON.parse(data);
        return {
          selectedSubject: parsed.selectedSubject || 'Computer Science',
          selectedPersona: parsed.selectedPersona || 'socratic',
          attachedNoteId: parsed.attachedNoteId || null,
          draftInput: typeof parsed.draftInput === 'string' ? parsed.draftInput : '',
        };
      }
    } catch (e) {
      console.error('[StorageService] Failed to load tutor session state', e);
    }
    return {
      selectedSubject: 'Computer Science',
      selectedPersona: 'socratic',
      attachedNoteId: null,
      draftInput: '',
    };
  }

  static saveTutorSessionState(state: TutorSessionState, shouldSync = true): void {
    try {
      const key = getStorageKey(BASE_KEYS.TUTOR_SESSION_STATE);
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.error('[StorageService] Failed to save tutor session state', e);
    }

    if (shouldSync) {
      this.queueServerSync();
    }
  }

  // --- NAVIGATION ORIGIN ---
  static getNavigationOrigin(): NavigationOrigin | null {
    try {
      const data = typeof window !== 'undefined' ? sessionStorage.getItem(BASE_KEYS.NAVIGATION_ORIGIN) : null;
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('[StorageService] Failed to load navigation origin', e);
    }
    return null;
  }

  static saveNavigationOrigin(origin: NavigationOrigin | null): void {
    try {
      if (origin) {
        sessionStorage.setItem(BASE_KEYS.NAVIGATION_ORIGIN, JSON.stringify(origin));
      } else {
        sessionStorage.removeItem(BASE_KEYS.NAVIGATION_ORIGIN);
      }
    } catch (e) {
      console.error('[StorageService] Failed to save navigation origin', e);
    }
  }
}
