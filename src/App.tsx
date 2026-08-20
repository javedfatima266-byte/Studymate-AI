import React, { useState, useCallback, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  ScreenType, 
  UserProfile, 
  StudyTask, 
  Note, 
  Quiz, 
  FlashcardDeck, 
  TutorMessage, 
  Subject, 
  TutorPersona, 
  Achievement, 
  SummaryResult,
  NavigationOrigin,
  TutorAttachment
} from './types';
import { StorageService } from './services/storage';
import { AuthService } from './services/authService';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Toast, ToastMessage } from './components/Toast';
import { PomodoroModal } from './components/PomodoroModal';
import { CommandPalette } from './components/CommandPalette';
import { AuthModal } from './components/AuthModal';
import { OnboardingModal } from './components/OnboardingModal';

// Screens
import { AuthScreen } from './screens/AuthScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { AITutorScreen } from './screens/AITutorScreen';
import { QuizGeneratorScreen } from './screens/QuizGeneratorScreen';
import { SmartSummarizerScreen } from './screens/SmartSummarizerScreen';
import { StudyPlannerScreen } from './screens/StudyPlannerScreen';
import { NotesScreen } from './screens/NotesScreen';
import { LibraryScreen } from './screens/LibraryScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { GraduationCap } from 'lucide-react';

export function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => Boolean(AuthService.getToken()));
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // Navigation State
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('dashboard');
  const [navigationOrigin, setNavigationOrigin] = useState<NavigationOrigin | null>(() => StorageService.getNavigationOrigin());
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // App Data State (Hydrated from user-scoped storage)
  const [user, setUser] = useState<UserProfile>(StorageService.getUser());
  const [tasks, setTasks] = useState<StudyTask[]>(StorageService.getTasks());
  const [notes, setNotes] = useState<Note[]>(StorageService.getNotes());
  const [quizzes, setQuizzes] = useState<Quiz[]>(StorageService.getQuizzes());
  const [flashcardDecks, setFlashcardDecks] = useState<FlashcardDeck[]>(StorageService.getFlashcardDecks());
  const [achievements, setAchievements] = useState<Achievement[]>(StorageService.getAchievements());
  const [tutorMessages, setTutorMessages] = useState<TutorMessage[]>(StorageService.getTutorHistory());

  // Deep-link / selection states between screens
  const [activeQuizForTaking, setActiveQuizForTaking] = useState<Quiz | null>(null);
  const [activeNoteForViewing, setActiveNoteForViewing] = useState<Note | null>(null);
  const [activeDeckForStudying, setActiveDeckForStudying] = useState<FlashcardDeck | null>(null);
  const [activeNotesTab, setActiveNotesTab] = useState<'notes' | 'flashcards'>('notes');
  const [pendingQuizConfig, setPendingQuizConfig] = useState<{
    topic: string;
    subject: Subject;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    count: number;
    sourceText?: string;
    autoStart?: boolean;
  } | null>(null);

  // Focus Timer Global State
  const [isPomodoroOpen, setIsPomodoroOpen] = useState(false);
  const [focusMode, setFocusMode] = useState<'pomodoro' | 'shortBreak' | 'longBreak'>('pomodoro');
  const [focusSubject, setFocusSubject] = useState<Subject>('Computer Science');
  const [focusTaskTitle, setFocusTaskTitle] = useState<string | undefined>(undefined);
  const [focusTotalDuration, setFocusTotalDuration] = useState(25 * 60);
  const [focusTimeLeft, setFocusTimeLeft] = useState(25 * 60);
  const [isFocusRunning, setIsFocusRunning] = useState(false);

  // Modals & Command Palette
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(() => !user.onboarded && (!user.name || user.name.trim() === ''));
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Notifications & Loading
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Helper for Toasts
  const showToast = useCallback((type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => {
    const newToast: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random()}`,
      type,
      title,
      message,
    };
    setToasts((prev) => [...prev, newToast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Global Theme Handling
  const handleUpdateTheme = useCallback((newTheme: 'light' | 'dark' | 'system') => {
    const updated = StorageService.updateTheme(newTheme);
    setUser(updated);
    showToast('info', 'Theme Updated', `Switched theme to ${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} mode.`);
  }, [showToast]);

  useEffect(() => {
    const applyTheme = (theme: 'light' | 'dark' | 'system') => {
      const root = document.documentElement;
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
      
      if (isDark) {
        root.classList.add('dark');
        document.body.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        document.body.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    };

    applyTheme(user.theme || 'light');

    if (user.theme === 'system' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme('system');
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [user.theme]);

  // Authenticate user on initial boot
  useEffect(() => {
    let isMounted = true;
    const verifyUserSession = async () => {
      const token = AuthService.getToken();
      if (!token) {
        if (isMounted) {
          setIsAuthenticated(false);
          setIsAuthChecking(false);
        }
        return;
      }

      try {
        const res = await AuthService.getMe();
        if (isMounted) {
          if (res.success && res.user) {
            StorageService.setActiveUser(res.user, res.data);
            setUser(res.user);
            setTasks(StorageService.getTasks());
            setNotes(StorageService.getNotes());
            setQuizzes(StorageService.getQuizzes());
            setFlashcardDecks(StorageService.getFlashcardDecks());
            setAchievements(StorageService.getAchievements());
            setTutorMessages(StorageService.getTutorHistory());
            setIsAuthenticated(true);
          } else {
            // Session expired or invalid
            AuthService.logout();
            StorageService.setActiveUser(null);
            setIsAuthenticated(false);
          }
          setIsAuthChecking(false);
        }
      } catch (err) {
        console.error('Failed to verify user session:', err);
        if (isMounted) {
          setIsAuthenticated(false);
          setIsAuthChecking(false);
        }
      }
    };

    verifyUserSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle successful login or signup
  const handleAuthSuccess = (authUser: UserProfile, authData?: any) => {
    StorageService.setActiveUser(authUser, authData);
    setUser(authUser);
    setTasks(StorageService.getTasks());
    setNotes(StorageService.getNotes());
    setQuizzes(StorageService.getQuizzes());
    setFlashcardDecks(StorageService.getFlashcardDecks());
    setAchievements(StorageService.getAchievements());
    setTutorMessages(StorageService.getTutorHistory());
    setIsAuthenticated(true);
    setCurrentScreen('dashboard');
    showToast('success', `Welcome, ${authUser.name || 'Student'}! 👋`, 'Signed in to your isolated study space.');
  };

  // Handle user logout
  const handleLogout = async () => {
    try {
      await AuthService.logout();
    } catch (e) {
      console.error(e);
    }
    StorageService.setActiveUser(null);
    setIsAuthenticated(false);
    setUser(StorageService.getUser());
    setTasks([]);
    setNotes([]);
    setQuizzes([]);
    setFlashcardDecks([]);
    setAchievements([]);
    setTutorMessages([]);
    setCurrentScreen('dashboard');
    showToast('info', 'Logged Out', 'You have been logged out of StudyMate AI.');
  };

  // Award XP and handle Level Ups
  const awardXP = useCallback((amount: number, reason: string) => {
    setUser((prevUser) => {
      const updatedUser = StorageService.addXP(amount);
      if (updatedUser.level > prevUser.level) {
        showToast('success', `Level Up! 🎉`, `Congratulations! You reached Level ${updatedUser.level}!`);
        try {
          confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.5 },
          });
        } catch (e) {
          console.error(e);
        }
      } else {
        showToast('info', `+${amount} XP Earned`, reason);
      }
      return updatedUser;
    });
  }, [showToast]);

  // Global Pomodoro Timer Interval
  const timerIntervalRef = useRef<any>(null);

  const handlePomodoroComplete = useCallback((minutes: number, subject?: Subject) => {
    awardXP(50, `Completed ${minutes}min Focus Block in ${subject || focusSubject}`);
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {
      // ignore
    }
    const updatedAchievements = StorageService.updateAchievementProgress('ach-pomodoro', 1);
    setAchievements(updatedAchievements);
    setIsFocusRunning(false);
    setFocusTimeLeft(focusTotalDuration);
  }, [awardXP, focusSubject, focusTotalDuration]);

  useEffect(() => {
    if (isFocusRunning) {
      timerIntervalRef.current = setInterval(() => {
        setFocusTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            const dur = focusMode === 'pomodoro' ? 25 : focusMode === 'shortBreak' ? 5 : 15;
            handlePomodoroComplete(dur, focusSubject);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isFocusRunning, focusMode, focusSubject, handlePomodoroComplete]);

  const handleSetFocusMode = (mode: 'pomodoro' | 'shortBreak' | 'longBreak') => {
    setIsFocusRunning(false);
    setFocusMode(mode);
    const duration = mode === 'pomodoro' ? 25 * 60 : mode === 'shortBreak' ? 5 * 60 : 15 * 60;
    setFocusTotalDuration(duration);
    setFocusTimeLeft(duration);
  };

  const handleAdjustFocusTime = (deltaSeconds: number) => {
    setFocusTimeLeft((prev) => Math.max(60, prev + deltaSeconds));
    setFocusTotalDuration((prev) => Math.max(60, prev + deltaSeconds));
  };

  const handleResetFocusTimer = () => {
    setIsFocusRunning(false);
    const duration = focusMode === 'pomodoro' ? 25 * 60 : focusMode === 'shortBreak' ? 5 * 60 : 15 * 60;
    setFocusTimeLeft(duration);
  };

  const handleOpenFocusModal = (subject?: Subject, taskTitle?: string) => {
    if (subject) setFocusSubject(subject);
    if (taskTitle !== undefined) setFocusTaskTitle(taskTitle);
    setIsPomodoroOpen(true);
  };

  // Keyboard shortcut listener for Command Palette (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync Task state
  const handleToggleTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    const updated = StorageService.toggleTaskCompletion(taskId);
    setTasks(updated);

    if (task && !task.isCompleted) {
      awardXP(20, `Completed task: ${task.title}`);
      const updatedAchievements = StorageService.updateAchievementProgress('ach-tasks', 1);
      setAchievements(updatedAchievements);
    }
  };

  const handleAddTask = (task: StudyTask) => {
    const updated = StorageService.saveTask(task);
    setTasks(updated);
    showToast('success', 'Task Scheduled', `"${task.title}" added to your study planner.`);
  };

  const handleDeleteTask = (taskId: string) => {
    const updated = StorageService.deleteTask(taskId);
    setTasks(updated);
    showToast('info', 'Task Removed', 'Task deleted from your schedule.');
  };

  // AI Planner Schedule Generation
  const handleGeneratePlan = async (params: { examDate: string; subjects: Subject[]; hoursPerDay: number; goals: string }) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/planner/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) throw new Error('Failed to generate plan');
      const data = await response.json();
      
      if (data.tasks && Array.isArray(data.tasks)) {
        let currentList = tasks;
        data.tasks.forEach((t: any) => {
          const newTask: StudyTask = {
            id: `task-ai-${Date.now()}-${Math.random()}`,
            title: t.title,
            subject: t.subject as Subject,
            date: t.date || new Date().toISOString().split('T')[0],
            durationMinutes: t.durationMinutes || 30,
            isCompleted: false,
            priority: t.priority || 'medium',
            notes: t.notes,
            aiSuggested: true,
          };
          currentList = StorageService.saveTask(newTask);
        });
        setTasks(currentList);
        awardXP(50, 'Generated AI Study Plan');
        showToast('success', 'Study Plan Created!', `${data.tasks.length} optimized tasks added to your planner.`);
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Generation Error', 'Could not generate schedule. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // AI Tutor Messages
  const handleSendTutorMessage = async (
    text: string, 
    subject: Subject, 
    persona: TutorPersona, 
    contextText?: string,
    attachment?: TutorAttachment
  ) => {
    const userMsg: TutorMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: text || (attachment ? (attachment.type === 'image' ? 'Attached image for analysis' : `Attached file: ${attachment.name}`) : ''),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      subject,
      persona,
      attachment,
    };

    const updatedWithUser = [...tutorMessages, userMsg];
    setTutorMessages(updatedWithUser);
    StorageService.saveTutorHistory(updatedWithUser);
    setIsLoading(true);

    try {
      const response = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          subject,
          persona,
          contextText,
          attachment,
          history: updatedWithUser.slice(-8).map(m => ({
            role: m.sender === 'user' ? 'user' : 'model',
            text: m.text,
          })),
        }),
      });

      if (!response.ok) throw new Error('AI Tutor server error');
      const data = await response.json();

      const aiMsg: TutorMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'tutor',
        text: data.text || data.reply || 'Here is the explanation for your topic.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        subject,
        persona,
        suggestions: data.suggestions || [],
      };

      const finalMessages = [...updatedWithUser, aiMsg];
      setTutorMessages(finalMessages);
      StorageService.saveTutorHistory(finalMessages);
      awardXP(10, 'Asked AI Tutor a question');
    } catch (err: any) {
      console.error(err);
      const errorMsg: TutorMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'tutor',
        text: 'I encountered an issue connecting to the AI brain. Please make sure your query is clear and retry.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        subject,
        persona,
      };
      setTutorMessages([...updatedWithUser, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearTutorChat = () => {
    StorageService.clearTutorHistory();
    setTutorMessages([]);
    showToast('info', 'Chat Cleared', 'AI Tutor chat history reset.');
  };

  // AI Quiz Generation
  const handleGenerateQuiz = async (params: { 
    topic: string; 
    subject: Subject; 
    difficulty: 'Easy' | 'Medium' | 'Hard'; 
    count: number; 
    sourceText?: string 
  }) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) throw new Error('Quiz generation failed');
      const data = await response.json();

      const newQuiz: Quiz = {
        id: `quiz-${Date.now()}`,
        title: `${params.topic} (${params.difficulty})`,
        topic: params.topic,
        subject: params.subject,
        difficulty: params.difficulty,
        totalQuestions: data.questions?.length || params.count,
        timeLimitMinutes: Math.max(3, params.count * 1.5),
        questions: data.questions,
        createdAt: new Date().toISOString(),
      };

      const updated = StorageService.saveQuiz(newQuiz);
      setQuizzes(updated);
      awardXP(30, 'Generated new AI practice quiz');
      showToast('success', 'Quiz Generated!', `Created ${data.questions.length} questions on "${params.topic}".`);
      return newQuiz;
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Quiz Error', 'Could not generate quiz. Please retry.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishQuiz = (quiz: Quiz, score: number) => {
    const updated = StorageService.recordQuizScore(quiz.id, score);
    setQuizzes(updated);
    awardXP(100, `Completed quiz with ${score}% score!`);
    
    // Check Quiz Master achievement
    if (score >= 80) {
      const updatedAchievements = StorageService.updateAchievementProgress('ach-quiz', 1);
      setAchievements(updatedAchievements);
    }
  };

  // Smart Summarizer
  const handleSummarize = async (params: { text: string; summaryType: any; subject: Subject }): Promise<SummaryResult | null> => {
    setIsLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('Summarization error');
      const data = await response.json();

      awardXP(50, 'Synthesized document summary');
      showToast('success', 'Summary Synthesized!', 'Your study notes have been processed.');
      return data;
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn('[handleSummarize] Request error or timeout:', err);
      showToast('info', 'Local Synthesis Active', 'Generated structured summary from your notes.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Notes & Flashcards actions
  const handleSaveNote = (note: Note) => {
    const updated = StorageService.saveNote(note);
    setNotes(updated);
    showToast('success', 'Note Saved', `"${note.title}" saved to your notebook.`);
  };

  const handleDeleteNote = (noteId: string) => {
    const updated = StorageService.deleteNote(noteId);
    setNotes(updated);
    if (activeNoteForViewing?.id === noteId) {
      setActiveNoteForViewing(null);
    }
    showToast('info', 'Note Deleted', 'Note removed from library.');
  };

  const handleSaveFlashcardDeck = (deck: FlashcardDeck) => {
    const updated = StorageService.saveFlashcardDeck(deck);
    setFlashcardDecks(updated);
    showToast('success', 'Deck Updated', `"${deck.title}" saved.`);
  };

  const handleDeleteFlashcardDeck = (deckId: string) => {
    const updated = StorageService.deleteFlashcardDeck(deckId);
    setFlashcardDecks(updated);
    if (activeDeckForStudying?.id === deckId) {
      setActiveDeckForStudying(null);
    }
    showToast('info', 'Deck Deleted', 'Flashcard deck removed from library.');
  };

  const handleDeleteQuiz = (quizId: string) => {
    const updated = StorageService.deleteQuiz(quizId);
    setQuizzes(updated);
    if (activeQuizForTaking?.id === quizId) {
      setActiveQuizForTaking(null);
    }
    showToast('info', 'Quiz Deleted', 'Practice quiz removed from library.');
  };

  const handleImproveNote = async (content: string, action: 'expand' | 'simplify' | 'grammar', subject: Subject) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/notes/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, action, subject }),
      });

      if (!response.ok) throw new Error('Failed to improve note');
      const data = await response.json();
      awardXP(25, `Enhanced note with AI (${action})`);
      showToast('success', 'Note Enhanced!', `Applied AI ${action} improvements.`);
      return data.improvedContent;
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Note AI Error', 'Could not refine note.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleExtractFlashcardsFromNote = async (note: Note) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/flashcards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: note.title,
          subject: note.subject,
          count: 5,
          sourceText: note.content,
        }),
      });

      if (!response.ok) throw new Error('Flashcard extraction failed');
      const data = await response.json();

      const newDeck: FlashcardDeck = {
        id: `deck-ext-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: `${note.title} (Flashcards)`,
        subject: note.subject,
        description: `Active recall cards extracted from ${note.title}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'note_extracted',
        currentCardIndex: 0,
        reviewedCardIds: [],
        cards: data.flashcards.map((f: any, i: number) => ({
          id: `fc-ext-${Date.now()}-${i}`,
          front: f.front,
          back: f.back,
          subject: note.subject,
          repetitions: 0,
          intervalDays: 1,
          reviewed: false,
        })),
      };

      const updatedDecks = StorageService.saveFlashcardDeck(newDeck);
      setFlashcardDecks(updatedDecks);
      setActiveDeckForStudying(newDeck);
      setActiveNotesTab('flashcards');
      awardXP(40, 'Extracted flashcards from note');
      showToast('success', 'Deck Created!', `Generated ${newDeck.cards.length} cards in Flashcards.`);
      setCurrentScreen('notes');
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Flashcard Error', 'Could not extract cards.');
    } finally {
      setIsLoading(false);
    }
  };

  // Cross-screen conversions & navigation with context preservation
  const navigateTo = (screen: ScreenType, origin?: NavigationOrigin | null) => {
    if (origin !== undefined) {
      setNavigationOrigin(origin);
      StorageService.saveNavigationOrigin(origin);
    }
    setCurrentScreen(screen);
  };

  const navigateBack = () => {
    const origin = navigationOrigin || StorageService.getNavigationOrigin();
    if (origin) {
      // Clear pending configurations if any
      setPendingQuizConfig(null);

      // Restore specific substate if returning to note
      if (origin.screen === 'notes' && origin.substate?.noteId) {
        const targetNote = notes.find(n => n.id === origin.substate?.noteId) || null;
        setActiveNoteForViewing(targetNote);
      }

      setNavigationOrigin(null);
      StorageService.saveNavigationOrigin(null);
      setCurrentScreen(origin.screen);
    } else {
      setCurrentScreen('dashboard');
    }
  };

  const handleCreateQuizFromNote = (note: Note) => {
    setActiveQuizForTaking(null);
    setPendingQuizConfig({
      topic: note.title,
      subject: note.subject,
      difficulty: 'Medium',
      count: 5,
      sourceText: note.content,
      autoStart: true,
    });
    navigateTo('quiz', { 
      screen: 'notes', 
      label: `Back to Note: ${note.title}`,
      substate: { noteId: note.id } 
    });
  };

  const handleCreateQuizFromChat = (topic: string, subject: Subject, contextText: string) => {
    setActiveQuizForTaking(null);
    setPendingQuizConfig({
      topic,
      subject,
      difficulty: 'Easy',
      count: 3,
      sourceText: contextText,
      autoStart: true,
    });
    navigateTo('quiz', { 
      screen: 'tutor', 
      label: 'Back to AI Tutor',
      substate: { topic, subject } 
    });
  };

  const handleCreateQuizFromSummary = (topic: string, subject: Subject, text: string) => {
    setActiveQuizForTaking(null);
    setPendingQuizConfig({
      topic,
      subject,
      difficulty: 'Medium',
      count: 5,
      sourceText: text,
      autoStart: true,
    });
    navigateTo('quiz', { 
      screen: 'summarizer', 
      label: 'Back to Summary',
      substate: { topic, subject } 
    });
  };

  const handleCreateFlashcardsFromSummary = (deck: FlashcardDeck) => {
    const updated = StorageService.saveFlashcardDeck(deck);
    setFlashcardDecks(updated);
    setActiveDeckForStudying(deck);
    setActiveNotesTab('flashcards');
    awardXP(40, 'Converted summary into Flashcard deck');
    showToast('success', 'Flashcard Deck Created!', `"${deck.title}" is ready to review.`);
    navigateTo('notes', { 
      screen: 'summarizer', 
      label: 'Back to Summary',
      substate: { topic: deck.title } 
    });
  };

  const handleAskTutorFromSummary = (topic: string, subject: Subject, contextText: string) => {
    navigateTo('tutor', { 
      screen: 'summarizer', 
      label: 'Back to Summary',
      substate: { topic, subject } 
    });
    handleSendTutorMessage(`Help me understand this study material: "${topic}". Please break down the key points.`, subject, 'socratic', contextText);
  };

  const handleSaveToNotesDirect = (
    title: string, 
    content: string, 
    subject: Subject,
    source: string = 'manual',
    sourceDetails?: any
  ) => {
    const newNote: Note = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      content,
      subject,
      tags: [subject, source === 'ai_tutor' ? 'AI Tutor' : source === 'smart_summarizer' ? 'Summary' : 'Study Note'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPinned: false,
      source,
      sourceDetails,
    };
    const updated = StorageService.saveNote(newNote);
    setNotes(updated);
    awardXP(30, 'Saved note to your notebook');
    showToast('success', 'Note Saved!', `"${title}" has been saved to your library.`);
    return newNote;
  };

  const handleExportAllData = () => {
    const fullBackup = StorageService.exportAllData();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(fullBackup);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `studymate_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('success', 'Backup Exported', 'All notes, quizzes, and study history downloaded as JSON.');
  };

  const handleNavigate = (screen: ScreenType) => {
    if (screen === 'quiz') {
      setPendingQuizConfig(null);
      setActiveQuizForTaking(null);
    }
    navigateTo(screen, null);
  };

  // 1. Initial Session Checking Spinner
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/25 animate-pulse">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">StudyMate</span>
              <span className="text-xs font-black px-1.5 py-0.5 rounded-md bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                AI
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Verifying student workspace session...
            </p>
          </div>
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mt-2" />
        </div>
      </div>
    );
  }

  // 2. Unauthenticated: Render Landing & Auth Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <Toast toasts={toasts} onClose={removeToast} />
        <AuthScreen
          onAuthSuccess={handleAuthSuccess}
          currentTheme={user.theme || 'light'}
          onToggleTheme={() => {
            const next = (user.theme || 'light') === 'light' ? 'dark' : 'light';
            handleUpdateTheme(next);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-200">
      {/* Toast Notification Container */}
      <Toast toasts={toasts} onClose={removeToast} />

      {/* Global Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={handleNavigate}
        onOpenPomodoro={handleOpenFocusModal}
        notes={notes}
        quizzes={quizzes}
        decks={flashcardDecks}
        tasks={tasks}
        onSelectNote={(n) => {
          setActiveNoteForViewing(n);
          setActiveNotesTab('notes');
          navigateTo('notes');
        }}
        onSelectQuiz={(q) => {
          setPendingQuizConfig(null);
          setActiveQuizForTaking(q);
          navigateTo('quiz');
        }}
        onSelectDeck={(d) => {
          setActiveDeckForStudying(d);
          setActiveNotesTab('flashcards');
          navigateTo('notes');
        }}
        onCreateNewNote={() => {
          setActiveNoteForViewing(null);
          setActiveNotesTab('notes');
        }}
      />

      {/* Main Left Sidebar */}
      <Sidebar
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        user={user}
        onOpenPomodoro={() => handleOpenFocusModal()}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onLogout={handleLogout}
      />

      {/* Right Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0 pb-16 lg:pb-0">
        {/* Sticky Top Navbar */}
        <Navbar
          currentScreen={currentScreen}
          user={user}
          onOpenPomodoro={() => handleOpenFocusModal()}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onNavigate={handleNavigate}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onUpdateTheme={handleUpdateTheme}
        />

        {/* Screen Content Wrapper */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          {currentScreen === 'dashboard' && (
            <DashboardScreen
              user={user}
              tasks={tasks}
              notes={notes}
              quizzes={quizzes}
              onNavigate={handleNavigate}
              onToggleTask={handleToggleTask}
              onOpenPomodoro={(sub) => handleOpenFocusModal(sub)}
              onSelectQuiz={(q) => {
                setPendingQuizConfig(null);
                setActiveQuizForTaking(q);
                navigateTo('quiz', { screen: 'dashboard', label: 'Back to Dashboard' });
              }}
              onSelectNote={(n) => {
                setActiveNoteForViewing(n);
                navigateTo('notes', { screen: 'dashboard', label: 'Back to Dashboard' });
              }}
            />
          )}

          {currentScreen === 'tutor' && (
            <AITutorScreen
              messages={tutorMessages}
              onSendMessage={handleSendTutorMessage}
              onClearChat={handleClearTutorChat}
              onSaveToNotes={handleSaveToNotesDirect}
              onGenerateQuizFromChat={handleCreateQuizFromChat}
              availableNotes={notes}
              isLoading={isLoading}
              navigationOrigin={navigationOrigin}
              onNavigateBack={navigateBack}
            />
          )}

          {currentScreen === 'quiz' && (
            <QuizGeneratorScreen
              quizzes={quizzes}
              activeQuiz={activeQuizForTaking}
              pendingConfig={pendingQuizConfig}
              onClearPendingConfig={() => setPendingQuizConfig(null)}
              onGenerateQuiz={handleGenerateQuiz}
              onFinishQuiz={handleFinishQuiz}
              availableNotes={notes}
              isLoading={isLoading}
              navigationOrigin={navigationOrigin}
              onNavigateBack={navigateBack}
            />
          )}

          {currentScreen === 'summarizer' && (
            <SmartSummarizerScreen
              onSummarize={handleSummarize}
              onSaveToNotes={handleSaveToNotesDirect}
              onCreateQuizFromSummary={handleCreateQuizFromSummary}
              onCreateFlashcardsFromSummary={handleCreateFlashcardsFromSummary}
              onAskTutor={handleAskTutorFromSummary}
              isLoading={isLoading}
              navigationOrigin={navigationOrigin}
              onNavigateBack={navigateBack}
            />
          )}

          {currentScreen === 'planner' && (
            <StudyPlannerScreen
              tasks={tasks}
              onAddTask={handleAddTask}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
              onGeneratePlan={handleGeneratePlan}
              onOpenPomodoro={(sub, taskTitle) => handleOpenFocusModal(sub, taskTitle)}
              user={user}
              isLoading={isLoading}
            />
          )}

          {currentScreen === 'notes' && (
            <NotesScreen
              notes={notes}
              flashcardDecks={flashcardDecks}
              selectedNote={activeNoteForViewing}
              selectedDeck={activeDeckForStudying}
              initialActiveTab={activeNotesTab}
              onSaveNote={handleSaveNote}
              onDeleteNote={handleDeleteNote}
              onSaveFlashcardDeck={handleSaveFlashcardDeck}
              onDeleteFlashcardDeck={handleDeleteFlashcardDeck}
              onImproveNote={handleImproveNote}
              onExtractFlashcardsFromNote={handleExtractFlashcardsFromNote}
              onCreateQuizFromNote={handleCreateQuizFromNote}
              isLoading={isLoading}
              navigationOrigin={navigationOrigin}
              onNavigateBack={navigateBack}
            />
          )}

          {currentScreen === 'library' && (
            <LibraryScreen
              quizzes={quizzes}
              decks={flashcardDecks}
              notes={notes}
              onSelectQuiz={(q) => {
                setPendingQuizConfig(null);
                setActiveQuizForTaking(q);
                navigateTo('quiz', { screen: 'library', label: 'Back to Library' });
              }}
              onSelectDeck={(d) => {
                setActiveDeckForStudying(d);
                setActiveNotesTab('flashcards');
                navigateTo('notes', { screen: 'library', label: 'Back to Library' });
              }}
              onSelectNote={(n) => {
                setActiveNoteForViewing(n);
                setActiveNotesTab('notes');
                navigateTo('notes', { screen: 'library', label: 'Back to Library' });
              }}
              onDeleteNote={handleDeleteNote}
              onDeleteDeck={handleDeleteFlashcardDeck}
              onDeleteQuiz={handleDeleteQuiz}
              onNavigate={handleNavigate}
              onExportAllData={handleExportAllData}
            />
          )}

          {currentScreen === 'profile' && (
            <ProfileScreen
              user={user}
              achievements={achievements}
              onOpenEditProfile={() => setIsProfileModalOpen(true)}
              onUpdateTheme={handleUpdateTheme}
              onLogout={handleLogout}
            />
          )}
        </main>
      </div>

      {/* Fullscreen Focus / Pomodoro Modal */}
      <PomodoroModal
        isOpen={isPomodoroOpen}
        onClose={() => setIsPomodoroOpen(false)}
        onSessionComplete={handlePomodoroComplete}
        mode={focusMode}
        onSetMode={handleSetFocusMode}
        timeLeft={focusTimeLeft}
        totalDuration={focusTotalDuration}
        isRunning={isFocusRunning}
        onTogglePlay={() => setIsFocusRunning(!isFocusRunning)}
        onResetTimer={handleResetFocusTimer}
        onAdjustTime={handleAdjustFocusTime}
        selectedSubject={focusSubject}
        onSelectSubject={setFocusSubject}
        taskTitle={focusTaskTitle}
      />

      {/* User Profile & Settings Modal */}
      <AuthModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onSaveUser={async (updated) => {
          const res = StorageService.saveUser(updated);
          setUser(res);
          try {
            await AuthService.updateProfile(updated);
          } catch (e) {
            console.error('Failed to sync profile to server:', e);
          }
          showToast('success', 'Profile Updated', 'Your study preferences were saved.');
        }}
      />

      {/* First-Time User Experience Setup Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        currentUser={user}
        onComplete={(updated) => {
          const res = StorageService.saveUser(updated);
          setUser(res);
          setIsOnboardingOpen(false);
          showToast('success', `Welcome, ${res.name}! 🎉`, '+100 Starter XP unlocked. Your AI study space is ready!');
          try {
            confetti({
              particleCount: 120,
              spread: 90,
              origin: { y: 0.5 },
            });
          } catch (e) {
            console.error(e);
          }
        }}
      />
    </div>
  );
}

export default App;
