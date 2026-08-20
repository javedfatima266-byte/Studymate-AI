import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  HelpCircle, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  ArrowRight, 
  ArrowLeft, 
  Flag, 
  BookOpen, 
  Trophy,
  Sliders,
  Check,
  ChevronRight
} from 'lucide-react';
import { Subject, Quiz, QuizQuestion, Note, NavigationOrigin } from '../types';

interface QuizGeneratorScreenProps {
  quizzes: Quiz[];
  activeQuiz: Quiz | null;
  pendingConfig?: {
    topic: string;
    subject: Subject;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    count: number;
    sourceText?: string;
    autoStart?: boolean;
  } | null;
  onClearPendingConfig?: () => void;
  onGenerateQuiz: (params: { topic: string; subject: Subject; difficulty: 'Easy' | 'Medium' | 'Hard'; count: number; sourceText?: string }) => Promise<Quiz | null>;
  onFinishQuiz: (quiz: Quiz, score: number) => void;
  availableNotes: Note[];
  isLoading: boolean;
  navigationOrigin?: NavigationOrigin | null;
  onNavigateBack?: () => void;
}

export const QuizGeneratorScreen: React.FC<QuizGeneratorScreenProps> = ({
  quizzes,
  activeQuiz: initialActiveQuiz,
  pendingConfig,
  onClearPendingConfig,
  onGenerateQuiz,
  onFinishQuiz,
  availableNotes,
  isLoading,
  navigationOrigin,
  onNavigateBack,
}) => {
  const [viewState, setViewState] = useState<'create' | 'taking' | 'results'>(
    initialActiveQuiz ? 'taking' : 'create'
  );
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(initialActiveQuiz);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [autoGenTopic, setAutoGenTopic] = useState('');
  
  // Generator Form State
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState<Subject>('Computer Science');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Easy');
  const [questionCount, setQuestionCount] = useState(3);
  const [selectedNoteId, setSelectedNoteId] = useState<string>('');
  const [customText, setCustomText] = useState('');

  // Quiz Taking State
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300);
  const [showInstantExplanation, setShowInstantExplanation] = useState(false);

  // Sync if initialActiveQuiz changes
  useEffect(() => {
    if (initialActiveQuiz) {
      setCurrentQuiz(initialActiveQuiz);
      setViewState('taking');
      setCurrentQIndex(0);
      setUserAnswers({});
      setFlaggedQuestions({});
      setSecondsRemaining((initialActiveQuiz.timeLimitMinutes || 5) * 60);
    }
  }, [initialActiveQuiz]);

  // Handle Handoff from Tutor / Note / Summary (Auto-generate and auto-start)
  useEffect(() => {
    if (pendingConfig && pendingConfig.autoStart) {
      const runHandoffQuiz = async () => {
        setIsAutoGenerating(true);
        setAutoGenTopic(pendingConfig.topic);
        setTopic(pendingConfig.topic);
        setSubject(pendingConfig.subject);
        setDifficulty(pendingConfig.difficulty || 'Easy');
        setQuestionCount(pendingConfig.count || 3);
        if (pendingConfig.sourceText) {
          setCustomText(pendingConfig.sourceText);
        }

        try {
          const generatedQuiz = await onGenerateQuiz({
            topic: pendingConfig.topic,
            subject: pendingConfig.subject,
            difficulty: pendingConfig.difficulty || 'Easy',
            count: pendingConfig.count || 3,
            sourceText: pendingConfig.sourceText,
          });

          if (generatedQuiz) {
            setCurrentQuiz(generatedQuiz);
            setViewState('taking');
            setCurrentQIndex(0);
            setUserAnswers({});
            setFlaggedQuestions({});
            setSecondsRemaining((generatedQuiz.timeLimitMinutes || 5) * 60);
          } else {
            setViewState('create');
          }
        } catch {
          setViewState('create');
        } finally {
          setIsAutoGenerating(false);
          onClearPendingConfig?.();
        }
      };

      runHandoffQuiz();
    }
  }, [pendingConfig]);

  // Timer countdown while taking quiz
  useEffect(() => {
    if (viewState !== 'taking' || !currentQuiz) return;

    if (secondsRemaining <= 0) {
      handleSubmitQuiz();
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [viewState, secondsRemaining, currentQuiz]);

  const handleStartGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    let sourceContent = customText;
    if (selectedNoteId) {
      const note = availableNotes.find(n => n.id === selectedNoteId);
      if (note) {
        sourceContent = `[Source Note: ${note.title}]\n${note.content}`;
      }
    }

    const generated = await onGenerateQuiz({
      topic: topic.trim(),
      subject,
      difficulty,
      count: questionCount,
      sourceText: sourceContent || undefined,
    });

    if (generated) {
      setCurrentQuiz(generated);
      setViewState('taking');
      setCurrentQIndex(0);
      setUserAnswers({});
      setFlaggedQuestions({});
      setSecondsRemaining((generated.timeLimitMinutes || 5) * 60);
    }
  };

  const handleSelectPreMadeQuiz = (quiz: Quiz) => {
    setCurrentQuiz(quiz);
    setViewState('taking');
    setCurrentQIndex(0);
    setUserAnswers({});
    setFlaggedQuestions({});
    setSecondsRemaining((quiz.timeLimitMinutes || 5) * 60);
  };

  const handleAnswerSelect = (optionIndex: number) => {
    setUserAnswers(prev => ({
      ...prev,
      [currentQIndex]: optionIndex
    }));
  };

  const toggleFlagQuestion = (idx: number) => {
    setFlaggedQuestions(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleSubmitQuiz = () => {
    if (!currentQuiz) return;
    
    let correctCount = 0;
    currentQuiz.questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctAnswer) {
        correctCount += 1;
      }
    });

    const scorePercent = Math.round((correctCount / currentQuiz.questions.length) * 100);
    
    if (scorePercent >= 70) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        console.error(e);
      }
    }

    onFinishQuiz(currentQuiz, scorePercent);
    setViewState('results');
  };

  const calculateScore = () => {
    if (!currentQuiz) return { correct: 0, total: 0, percentage: 0 };
    let correct = 0;
    currentQuiz.questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctAnswer) {
        correct += 1;
      }
    });
    return {
      correct,
      total: currentQuiz.questions.length,
      percentage: Math.round((correct / currentQuiz.questions.length) * 100)
    };
  };

  const scoreData = calculateScore();

  // ----------------------------------------------------
  // VIEW 0: AUTO-GENERATING HANDOFF STATE
  // ----------------------------------------------------
  if (isAutoGenerating) {
    return (
      <div className="max-w-xl mx-auto my-8 sm:my-16 p-5 sm:p-8 bg-white dark:bg-[#0f172a] rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-lg text-center space-y-6 transition-colors w-full min-w-0">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 shadow-xs">
          <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 text-xs font-bold mb-3 border border-emerald-200 dark:border-emerald-800">
            AI Tutor Handoff Active
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            Generating Quiz on {autoGenTopic || topic || 'Your Topic'}...
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-sm mx-auto">
            Formulating concrete multiple-choice questions tailored to your session. Launching Question 1 automatically...
          </p>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
          <div className="bg-emerald-500 h-full w-2/3 animate-pulse rounded-full" />
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // VIEW 1: QUIZ GENERATION & SELECTION
  // ----------------------------------------------------
  if (viewState === 'create') {
    return (
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 pb-12 transition-colors w-full min-w-0">
        {/* Navigation Return Button */}
        {navigationOrigin && onNavigateBack && (
          <div className="flex items-center justify-between">
            <button
              id="btn-quiz-create-back-to-origin"
              type="button"
              onClick={onNavigateBack}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-[#1e293b] hover:bg-slate-50 dark:hover:bg-slate-700 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{navigationOrigin.label}</span>
            </button>
          </div>
        )}

        {/* Header Hero */}
        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-900 text-white shadow-lg border border-emerald-900/50">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-emerald-200 mb-2 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            <span>AI Automated Assessment Engine</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">Interactive Quiz Generator</h2>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-xl">
            Generate custom multiple-choice quizzes on any academic topic, or convert your lecture notes directly into high-yield practice questions.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Left 2 Cols: Generation Form */}
          <div className="lg:col-span-2 bg-white dark:bg-[#0f172a] rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 shadow-sm transition-colors">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Configure AI Quiz
            </h3>

            <form onSubmit={handleStartGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Subject & Field
                </label>
                <select
                  id="select-quiz-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value as Subject)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="Computer Science">💻 Computer Science</option>
                  <option value="Mathematics">📐 Mathematics</option>
                  <option value="Physics">⚛️ Physics</option>
                  <option value="Chemistry">🧪 Chemistry</option>
                  <option value="Biology">🧬 Biology</option>
                  <option value="History">🏛️ History</option>
                  <option value="Literature">📚 Literature</option>
                  <option value="General">🎯 General Study</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Quiz Topic or Focus Area
                </label>
                <input
                  id="input-quiz-topic"
                  type="text"
                  required
                  placeholder="e.g. Graph Algorithms, Photosynthesis, Organic Reactions..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Difficulty Level
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['Easy', 'Medium', 'Hard'] as const).map(d => (
                      <button
                        key={d}
                        type="button"
                        id={`btn-diff-${d.toLowerCase()}`}
                        onClick={() => setDifficulty(d)}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          difficulty === d
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-[#1e293b] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Question Count
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[3, 5, 10].map(c => (
                      <button
                        key={c}
                        type="button"
                        id={`btn-count-${c}`}
                        onClick={() => setQuestionCount(c)}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          questionCount === c
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-[#1e293b] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {c} Qs
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Source Note Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>Generate from Saved Note (Optional)</span>
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                </label>
                <select
                  id="select-quiz-source-note"
                  value={selectedNoteId}
                  onChange={(e) => setSelectedNoteId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">-- No note selected (Generate purely from topic) --</option>
                  {availableNotes.map(n => (
                    <option key={n.id} value={n.id}>{n.title} ({n.subject})</option>
                  ))}
                </select>
              </div>

              {/* Generate Button */}
              <div className="pt-2">
                <button
                  id="btn-generate-quiz-submit"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95 text-xs sm:text-sm"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  {isLoading ? 'Generating Questions with Gemini AI...' : 'Generate Practice Quiz (+100 XP)'}
                </button>
              </div>
            </form>
          </div>

          {/* Right 1 Col: Saved & Pre-made Quizzes */}
          <div className="space-y-4">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Available Practice Quizzes
            </h3>

            <div className="space-y-3">
              {quizzes.map((q) => (
                <div
                  key={q.id}
                  id={`quiz-card-${q.id}`}
                  onClick={() => handleSelectPreMadeQuiz(q)}
                  className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-1">
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">{q.subject}</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                      {q.difficulty}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {q.title}
                  </h4>
                  <div className="flex items-center justify-between mt-3 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span>{q.questions.length} Questions</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      Start Quiz <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // VIEW 2: ACTIVE QUIZ TAKING INTERFACE
  // ----------------------------------------------------
  if (viewState === 'taking' && currentQuiz) {
    const q = currentQuiz.questions[currentQIndex];
    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = secondsRemaining % 60;
    const isLastQuestion = currentQIndex === currentQuiz.questions.length - 1;
    const answeredCount = Object.keys(userAnswers).length;
    const isSelected = userAnswers[currentQIndex] !== undefined;

    return (
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6 pb-12 transition-colors w-full min-w-0">
        {/* Navigation Return Button if taking quiz from a source activity */}
        {navigationOrigin && onNavigateBack && (
          <div className="flex items-center justify-between">
            <button
              id="btn-quiz-taking-back-to-origin"
              type="button"
              onClick={() => {
                if (answeredCount > 0 && !confirm(`Leave quiz and ${navigationOrigin.label}? Your quiz state will be saved.`)) {
                  return;
                }
                onNavigateBack();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-[#1e293b] hover:bg-slate-50 dark:hover:bg-slate-700 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{navigationOrigin.label}</span>
            </button>
          </div>
        )}

        {/* Top Quiz Header */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3 sm:gap-4 transition-colors">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {currentQuiz.subject} • {currentQuiz.difficulty}
            </span>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 truncate">
              {currentQuiz.title}
            </h2>
          </div>

          {/* Countdown Timer */}
          <div className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border text-xs font-mono font-bold shrink-0 ${
            secondsRemaining < 60
              ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/60 animate-pulse'
              : 'bg-slate-50 dark:bg-[#1e293b] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
          }`}>
            <Clock className="w-3.5 h-3.5" />
            <span>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
          </div>
        </div>

        {/* Question Selector Tabs */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 max-w-full">
          <div className="flex items-center gap-1.5">
            {currentQuiz.questions.map((_, idx) => {
              const isAnswered = userAnswers[idx] !== undefined;
              const isCurrent = idx === currentQIndex;
              const isFlagged = flaggedQuestions[idx];

              return (
                <button
                  key={idx}
                  id={`tab-question-${idx + 1}`}
                  onClick={() => setCurrentQIndex(idx)}
                  className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    isCurrent
                      ? 'bg-emerald-600 text-white shadow-xs scale-105'
                      : isAnswered
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-white dark:bg-[#1e293b] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {idx + 1}
                  {isFlagged && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border border-white dark:border-slate-900" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
            <span>{answeredCount}/{currentQuiz.questions.length}</span>
          </div>
        </div>

        {/* Main Question Card */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-6 transition-colors">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Question {currentQIndex + 1} of {currentQuiz.questions.length}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                {q.question}
              </h3>
            </div>

            <button
              id={`btn-flag-question-${currentQIndex}`}
              onClick={() => toggleFlagQuestion(currentQIndex)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                flaggedQuestions[currentQIndex]
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                  : 'bg-slate-50 dark:bg-[#1e293b] text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="Flag question for review"
            >
              <Flag className="w-4 h-4 fill-current" />
            </button>
          </div>

          {/* Options Grid */}
          <div className="space-y-2.5">
            {q.options.map((opt, optIdx) => {
              const isOptionSelected = userAnswers[currentQIndex] === optIdx;
              return (
                <button
                  key={optIdx}
                  id={`btn-option-${optIdx}`}
                  onClick={() => handleAnswerSelect(optIdx)}
                  className={`w-full text-left p-3 sm:p-4 rounded-xl border-2 transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isOptionSelected
                      ? 'border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/60 text-slate-900 dark:text-emerald-100 font-semibold shadow-xs ring-1 ring-emerald-400/30'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e293b]/60 hover:bg-slate-50 dark:hover:bg-[#1e293b] text-slate-800 dark:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-colors shrink-0 ${
                      isOptionSelected
                        ? 'bg-emerald-600 border-emerald-600 text-white font-black'
                        : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}>
                      {String.fromCharCode(65 + optIdx)}
                    </div>
                    <span className="text-xs sm:text-sm font-medium leading-snug">{opt}</span>
                  </div>

                  {isOptionSelected && (
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Instant Explanation (Optional toggle) */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              id="btn-toggle-instant-explanation"
              onClick={() => setShowInstantExplanation(!showInstantExplanation)}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 cursor-pointer"
            >
              {showInstantExplanation ? 'Hide Explanation' : '💡 View Explanation / Hint'}
            </button>
          </div>

          {showInstantExplanation && (
            <div className="p-3.5 sm:p-4 bg-indigo-50/80 dark:bg-indigo-950/50 rounded-xl border border-indigo-200 dark:border-indigo-900/60 text-xs text-slate-800 dark:text-slate-100 leading-relaxed">
              <strong className="text-indigo-950 dark:text-indigo-200 block mb-1 font-bold text-xs sm:text-sm">Concept Breakdown:</strong>
              {q.explanation}
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              id="btn-quiz-prev"
              disabled={currentQIndex === 0}
              onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
              className="px-3.5 sm:px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-30 rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Previous
            </button>

            {isLastQuestion ? (
              <button
                id="btn-quiz-submit"
                onClick={handleSubmitQuiz}
                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                Submit Quiz <CheckCircle2 className="w-4 h-4" />
              </button>
            ) : (
              <button
                id="btn-quiz-next"
                onClick={() => setCurrentQIndex(prev => Math.min(currentQuiz.questions.length - 1, prev + 1))}
                className="px-4 sm:px-5 py-2 sm:py-2.5 bg-slate-900 dark:bg-[#1e293b] hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // VIEW 3: RESULTS & SCORE BREAKDOWN
  // ----------------------------------------------------
  if (viewState === 'results' && currentQuiz) {
    const passed = scoreData.percentage >= 70;

    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-12 transition-colors w-full min-w-0">
        {/* Navigation Return Button in Results View */}
        {navigationOrigin && onNavigateBack && (
          <div className="flex items-center justify-between">
            <button
              id="btn-results-top-back-to-origin"
              type="button"
              onClick={onNavigateBack}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-[#1e293b] hover:bg-slate-50 dark:hover:bg-slate-700 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{navigationOrigin.label}</span>
            </button>
          </div>
        )}

        {/* Results Header Card */}
        <div className={`p-5 sm:p-8 rounded-2xl sm:rounded-3xl text-center shadow-lg border transition-colors ${
          passed 
            ? 'bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950/40 dark:to-[#0f172a] border-emerald-200 dark:border-emerald-800' 
            : 'bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/40 dark:to-[#0f172a] border-amber-200 dark:border-amber-800'
        }`}>
          <div className="inline-flex p-3 rounded-2xl bg-white dark:bg-[#1e293b] shadow-md mb-4 border border-slate-100 dark:border-slate-700">
            <Trophy className={`w-7 h-7 sm:w-8 sm:h-8 ${passed ? 'text-emerald-500' : 'text-amber-500'}`} />
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 mb-1">
            {passed ? 'Outstanding Work! 🎉' : 'Good Effort! Keep Practicing 💪'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
            {passed
              ? `You scored ${scoreData.percentage}% on ${currentQuiz.title}. You earned +100 XP!`
              : `You scored ${scoreData.percentage}%. Review the detailed explanations below to strengthen your grasp.`}
          </p>

          {/* Score Metric Ring / Pill */}
          <div className="flex items-center justify-around gap-2 sm:gap-6 px-4 sm:px-6 py-3 bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs max-w-sm mx-auto">
            <div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">{scoreData.percentage}%</div>
              <div className="text-[10px] sm:text-[11px] font-semibold text-slate-400">Total Score</div>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
            <div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">{scoreData.correct}/{scoreData.total}</div>
              <div className="text-[10px] sm:text-[11px] font-semibold text-slate-400">Correct Answers</div>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
            <div>
              <div className="text-xl sm:text-2xl font-black text-amber-500">+100</div>
              <div className="text-[10px] sm:text-[11px] font-semibold text-slate-400">XP Gained</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 mt-6">
            {navigationOrigin && onNavigateBack && (
              <button
                id="btn-results-back-to-origin"
                type="button"
                onClick={onNavigateBack}
                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-slate-900 dark:bg-[#1e293b] hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
                <span>{navigationOrigin.label}</span>
              </button>
            )}

            <button
              id="btn-results-retry"
              onClick={() => {
                setUserAnswers({});
                setFlaggedQuestions({});
                setSecondsRemaining((currentQuiz.questions.length * 90));
                setViewState('taking');
                setCurrentQIndex(0);
              }}
              className="px-4 sm:px-5 py-2 sm:py-2.5 bg-white dark:bg-[#1e293b] hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold rounded-xl text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry Quiz
            </button>

            <button
              id="btn-results-new-quiz"
              onClick={() => setViewState('create')}
              className="px-4 sm:px-6 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Create Another Quiz
            </button>
          </div>
        </div>

        {/* Detailed Question by Question Review */}
        <div className="space-y-4">
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
            Question Review & Model Explanations
          </h3>

          {currentQuiz.questions.map((question, idx) => {
            const userChoice = userAnswers[idx];
            const isCorrect = userChoice === question.correctAnswer;

            return (
              <div
                key={idx}
                id={`review-q-${idx}`}
                className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0f172a] border-2 shadow-xs space-y-3 transition-colors ${
                  isCorrect 
                    ? 'border-emerald-200 dark:border-emerald-800/80' 
                    : 'border-red-200 dark:border-red-800/80'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 shrink-0" />
                    )}
                    <span className="text-xs font-bold text-slate-400">
                      Question {idx + 1}
                    </span>
                  </div>
                  <span className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    isCorrect 
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300' 
                      : 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300'
                  }`}>
                    {isCorrect ? 'Correct' : 'Missed'}
                  </span>
                </div>

                <p className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                  {question.question}
                </p>

                {/* Options Review */}
                <div className="space-y-1.5">
                  {question.options.map((opt, optIdx) => {
                    const isUserPick = userChoice === optIdx;
                    const isRightAnswer = question.correctAnswer === optIdx;

                    let badgeStyle = 'border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-[#1e293b] text-slate-700 dark:text-slate-200';
                    if (isRightAnswer) {
                      badgeStyle = 'border-emerald-400 dark:border-emerald-700 bg-emerald-50/90 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-100 font-semibold ring-1 ring-emerald-500/20';
                    } else if (isUserPick && !isRightAnswer) {
                      badgeStyle = 'border-red-300 dark:border-red-800 bg-red-50/90 dark:bg-red-950/70 text-red-950 dark:text-red-200 line-through';
                    }

                    return (
                      <div
                        key={optIdx}
                        className={`p-2.5 sm:p-3 rounded-xl border text-xs sm:text-sm flex items-center justify-between gap-2 ${badgeStyle}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold shrink-0">{String.fromCharCode(65 + optIdx)}.</span>
                          <span className="leading-snug">{opt}</span>
                        </div>
                        {isRightAnswer && (
                          <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-200/70 dark:bg-emerald-900/70 px-2 py-0.5 rounded-md shrink-0">
                            Correct Answer
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Detailed Explanation */}
                <div className="p-3 sm:p-3.5 bg-slate-100/70 dark:bg-[#1e293b] rounded-xl text-xs text-slate-700 dark:text-slate-200 leading-relaxed border border-slate-200/80 dark:border-slate-700">
                  <strong className="text-slate-900 dark:text-slate-100 font-bold block mb-1">Explanation:</strong>
                  {question.explanation}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};
