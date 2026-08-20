import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Sparkles, 
  Bot, 
  HelpCircle, 
  FileText, 
  Calendar, 
  BookOpen, 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  Clock, 
  Trophy, 
  BookMarked,
  Volume2,
  Square,
  RefreshCw
} from 'lucide-react';
import { ScreenType, UserProfile, StudyTask, Note, Quiz } from '../types';
import { STUDY_TIPS } from '../data/initialData';

interface DashboardScreenProps {
  user: UserProfile;
  tasks: StudyTask[];
  notes: Note[];
  quizzes: Quiz[];
  onNavigate: (screen: ScreenType) => void;
  onToggleTask: (taskId: string) => void;
  onOpenPomodoro: (subject?: any) => void;
  onSelectQuiz: (quiz: Quiz) => void;
  onSelectNote: (note: Note) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  user,
  tasks,
  notes,
  quizzes,
  onNavigate,
  onToggleTask,
  onOpenPomodoro,
  onSelectQuiz,
  onSelectNote,
}) => {
  const [tipIndex, setTipIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const currentTip = STUDY_TIPS[tipIndex % STUDY_TIPS.length];

  const todayTasks = tasks.filter(t => t.date === new Date().toISOString().split('T')[0] || !t.isCompleted).slice(0, 4);
  const completedTasksCount = tasks.filter(t => t.isCompleted).length;
  const firstName = user.name?.trim() ? user.name.trim().split(' ')[0] : 'Student';

  // Cleanup speech synthesis on component unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleNextTip = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setTipIndex(prev => (prev + 1) % STUDY_TIPS.length);
  };

  const handleToggleSpeakTip = () => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const textToRead = `${currentTip.tip}. As ${currentTip.author} said, ${currentTip.quote}`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-12 transition-colors w-full min-w-0">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-indigo-950 via-indigo-900 to-violet-950 text-white p-4 sm:p-6 lg:p-8 shadow-xl border border-indigo-900/50">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] sm:text-xs font-semibold text-indigo-200 mb-2.5 sm:mb-3 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>AI-Powered Learning Assistant Ready</span>
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white mb-1.5 sm:mb-2">
            Welcome back, {firstName}! 👋
          </h2>
          <p className="text-indigo-200 text-xs sm:text-sm lg:text-base leading-relaxed mb-4 sm:mb-6">
            You're on a <strong className="text-white font-bold">{user.streakDays}-day study streak</strong>. You have {todayTasks.filter(t => !t.isCompleted).length} priority tasks scheduled for today.
          </p>

          <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2.5 sm:gap-3">
            <button
              id="btn-dash-start-tutor"
              onClick={() => onNavigate('tutor')}
              className="px-4 sm:px-5 py-2.5 bg-white hover:bg-indigo-50 text-indigo-950 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Bot className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Ask AI Tutor</span>
            </button>
            <button
              id="btn-dash-start-focus"
              onClick={() => onOpenPomodoro()}
              className="px-4 sm:px-5 py-2.5 bg-indigo-600/70 hover:bg-indigo-600 text-white font-bold rounded-xl text-xs sm:text-sm border border-indigo-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Clock className="w-4 h-4 text-indigo-300 shrink-0" />
              <span>Start Focus Session</span>
            </button>
          </div>
        </div>

        {/* Ambient Glow / Art Accent */}
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-indigo-500/20 to-transparent pointer-events-none" />
      </div>

      {/* 4 Metric Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-2.5 sm:gap-3.5 transition-colors">
          <div className="p-2 sm:p-3 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/50 shrink-0">
            <Flame className="w-5 h-5 sm:w-6 sm:h-6 fill-orange-500 text-orange-500" />
          </div>
          <div className="min-w-0">
            <div className="text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-100 truncate">{user.streakDays} Days</div>
            <div className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">Current Streak</div>
          </div>
        </div>

        <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-2.5 sm:gap-3.5 transition-colors">
          <div className="p-2 sm:p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 shrink-0">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-100 truncate">{quizzes.length} Quizzes</div>
            <div className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">Avg. Score 84%</div>
          </div>
        </div>

        <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-2.5 sm:gap-3.5 transition-colors">
          <div className="p-2 sm:p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 shrink-0">
            <BookMarked className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-100 truncate">{notes.length} Notes</div>
            <div className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">Saved Study Sets</div>
          </div>
        </div>

        <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-2.5 sm:gap-3.5 transition-colors">
          <div className="p-2 sm:p-3 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/50 shrink-0">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-100 truncate">{completedTasksCount} Done</div>
            <div className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">Tasks Completed</div>
          </div>
        </div>
      </div>

      {/* AI Daily Insight & Study Tip */}
      <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50 dark:from-amber-950/30 dark:via-[#0f172a] dark:to-[#1e293b]/40 border border-amber-200/70 dark:border-amber-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 shadow-xs transition-colors">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 shadow-xs mt-0.5">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                AI Study Tip of the Day
              </span>
            </div>
            <p className="text-slate-800 dark:text-slate-100 font-semibold text-xs sm:text-sm mt-0.5">
              "{currentTip.tip}"
            </p>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">
              — {currentTip.quote} <span className="font-semibold text-slate-600 dark:text-slate-300">({currentTip.author})</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            id="btn-speak-tip"
            onClick={handleToggleSpeakTip}
            className={`p-2 rounded-xl border shadow-xs transition-all cursor-pointer flex items-center justify-center ${
              isSpeaking
                ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 dark:border-amber-500 ring-2 ring-amber-400/40 animate-pulse'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border-amber-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
            }`}
            title={isSpeaking ? 'Stop reading' : 'Read aloud'}
            aria-label={isSpeaking ? 'Stop reading' : 'Read aloud'}
          >
            {isSpeaking ? (
              <Square className="w-4 h-4 fill-current" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <button
            id="btn-refresh-tip"
            onClick={handleNextTip}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-amber-200 dark:border-slate-700 shadow-xs text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Next Tip</span>
          </button>
        </div>
      </div>

      {/* Quick Launch Action Hub */}
      <div>
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 mb-2.5 sm:mb-3 flex items-center gap-2">
          <span>Quick Actions</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
          <button
            id="btn-card-tutor"
            onClick={() => onNavigate('tutor')}
            className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-md transition-all text-left group cursor-pointer"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2.5 sm:mb-3 group-hover:scale-110 transition-transform">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
              AI Tutor
            </h4>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">Solve STEM formulas & concepts</p>
          </button>

          <button
            id="btn-card-quiz"
            onClick={() => onNavigate('quiz')}
            className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 hover:shadow-md transition-all text-left group cursor-pointer"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5 sm:mb-3 group-hover:scale-110 transition-transform">
              <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
              Quiz Generator
            </h4>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">Test knowledge & earn XP</p>
          </button>

          <button
            id="btn-card-summarizer"
            onClick={() => onNavigate('summarizer')}
            className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 hover:border-purple-500/50 dark:hover:border-purple-500/50 hover:shadow-md transition-all text-left group cursor-pointer"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2.5 sm:mb-3 group-hover:scale-110 transition-transform">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
              Smart Summarizer
            </h4>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">Key takeaways from docs</p>
          </button>

          <button
            id="btn-card-notes"
            onClick={() => onNavigate('notes')}
            className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:shadow-md transition-all text-left group cursor-pointer"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2.5 sm:mb-3 group-hover:scale-110 transition-transform">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
              Notes & Cards
            </h4>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">Markdown notes & flashcards</p>
          </button>
        </div>
      </div>

      {/* Main 2-Column Section: Today's Tasks + Recent Study Sets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left 2 Cols: Today's Schedule & Tasks */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-4 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Today's Study Plan</span>
            </h3>
            <button
              id="btn-view-full-planner"
              onClick={() => onNavigate('planner')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              <span>View Planner</span> <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white dark:bg-[#0f172a] rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 sm:p-4 space-y-2 sm:space-y-2.5 shadow-xs transition-colors">
            {todayTasks.length === 0 ? (
              <div className="py-6 sm:py-8 text-center text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
                No tasks scheduled for today. Great job or create a new plan!
              </div>
            ) : (
              todayTasks.map((task) => (
                <div
                  key={task.id}
                  id={`dash-task-${task.id}`}
                  className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all gap-2.5 ${
                    task.isCompleted
                      ? 'bg-slate-50/80 dark:bg-slate-850/60 border-slate-200/70 dark:border-slate-800'
                      : 'bg-white dark:bg-slate-850 border-slate-200/90 dark:border-slate-750 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <button
                      id={`btn-toggle-task-${task.id}`}
                      onClick={() => onToggleTask(task.id)}
                      className="text-slate-400 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer shrink-0 p-0.5"
                    >
                      {task.isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className={`text-xs sm:text-sm font-bold truncate ${
                          task.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'
                        }`}>
                          {task.title}
                        </span>
                        {task.aiSuggested && (
                          <span className="px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 shrink-0">
                            AI Plan
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400 truncate">{task.subject}</span>
                        <span>•</span>
                        <span className="font-medium text-slate-600 dark:text-slate-300 shrink-0">{task.durationMinutes} mins</span>
                      </div>
                    </div>
                  </div>

                  <button
                    id={`btn-start-task-timer-${task.id}`}
                    onClick={() => onOpenPomodoro(task.subject)}
                    className="px-2.5 sm:px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/80 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200/80 dark:border-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 shadow-xs"
                  >
                    Focus
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col: Recent Quizzes & Notes */}
        <div className="space-y-3 sm:space-y-4 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Recent Materials</span>
            </h3>
            <button
              id="btn-view-library"
              onClick={() => onNavigate('library')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Library</span> <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            {quizzes.slice(0, 2).map((quiz) => (
              <div
                key={quiz.id}
                id={`recent-quiz-${quiz.id}`}
                onClick={() => {
                  onSelectQuiz(quiz);
                  onNavigate('quiz');
                }}
                className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-xs transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-1">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold truncate">{quiz.subject}</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] shrink-0">
                    {quiz.difficulty}
                  </span>
                </div>
                <h5 className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                  {quiz.title}
                </h5>
                <div className="flex items-center justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>{quiz.questions.length} Questions</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {quiz.lastScore !== undefined ? `Last: ${quiz.lastScore}%` : 'Not taken'}
                  </span>
                </div>
              </div>
            ))}

            {notes.slice(0, 2).map((note) => (
              <div
                key={note.id}
                id={`recent-note-${note.id}`}
                onClick={() => {
                  onSelectNote(note);
                  onNavigate('notes');
                }}
                className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-xs transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-1">
                  <span className="text-purple-600 dark:text-purple-400 font-bold truncate">{note.subject}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">Note</span>
                </div>
                <h5 className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                  {note.title}
                </h5>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {note.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
