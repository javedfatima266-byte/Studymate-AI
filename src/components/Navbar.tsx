import React from 'react';
import { 
  Flame, 
  Sparkles, 
  Clock, 
  Menu, 
  ChevronRight,
  GraduationCap,
  Sun,
  Moon,
  Laptop,
  User as UserIcon
} from 'lucide-react';
import { ScreenType, UserProfile } from '../types';

interface NavbarProps {
  currentScreen: ScreenType;
  user: UserProfile;
  onOpenPomodoro: () => void;
  onOpenProfileModal: () => void;
  onToggleMobileSidebar: () => void;
  onNavigate: (screen: ScreenType) => void;
  onOpenCommandPalette?: () => void;
  onUpdateTheme?: (theme: 'light' | 'dark' | 'system') => void;
}

const SCREEN_TITLES: Record<ScreenType, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Welcome back, let\'s crush your study goals!' },
  tutor: { title: 'AI Study Tutor', subtitle: '24/7 intelligent STEM & humanities coaching' },
  quiz: { title: 'Quiz Generator', subtitle: 'Test your retention with instant AI-powered quizzes' },
  summarizer: { title: 'Smart Summarizer', subtitle: 'Transform lectures & documents into key insights' },
  planner: { title: 'Study Planner', subtitle: 'Personalized schedule & Pomodoro focus tracking' },
  notes: { title: 'Notes & Flashcards', subtitle: 'Smart markdown notes with spaced repetition flashcards' },
  library: { title: 'Resource Library', subtitle: 'All your quizzes, decks, and summaries in one place' },
  profile: { title: 'Profile & Settings', subtitle: 'Level up your study stats, badges, and appearance' },
};

export const Navbar: React.FC<NavbarProps> = ({
  currentScreen,
  user,
  onOpenPomodoro,
  onOpenProfileModal,
  onToggleMobileSidebar,
  onNavigate,
  onOpenCommandPalette,
  onUpdateTheme,
}) => {
  const currentInfo = SCREEN_TITLES[currentScreen] || SCREEN_TITLES.dashboard;
  const xpInCurrentLevel = (user.xp || 0) % 400;
  const levelProgress = (xpInCurrentLevel / 400) * 100;
  const currentTheme = user.theme || 'light';

  const handleCycleTheme = () => {
    if (!onUpdateTheme) return;
    const nextTheme: Record<'light' | 'dark' | 'system', 'light' | 'dark' | 'system'> = {
      light: 'dark',
      dark: 'system',
      system: 'light',
    };
    onUpdateTheme(nextTheme[currentTheme]);
  };

  const getThemeIcon = () => {
    switch (currentTheme) {
      case 'dark':
        return <Moon className="w-4 h-4 text-indigo-400 fill-indigo-400/20" />;
      case 'system':
        return <Laptop className="w-4 h-4 text-slate-500 dark:text-slate-400" />;
      case 'light':
      default:
        return <Sun className="w-4 h-4 text-amber-500 fill-amber-500/20" />;
    }
  };

  const getThemeTooltip = () => {
    switch (currentTheme) {
      case 'dark': return 'Theme: Dark (click to switch to System)';
      case 'system': return 'Theme: System Default (click to switch to Light)';
      case 'light':
      default:
        return 'Theme: Light (click to switch to Dark)';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/90 px-2.5 sm:px-4 lg:px-8 py-2 sm:py-3 flex items-center justify-between transition-colors duration-200 shadow-xs">
      {/* Left: Mobile Menu & Current Breadcrumb / Title */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 mr-1.5 sm:mr-2">
        <button
          id="btn-mobile-sidebar-toggle"
          onClick={onToggleMobileSidebar}
          className="lg:hidden w-9 h-9 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer shrink-0 transition-colors active:scale-95"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-400 truncate">
            <button 
              onClick={() => onNavigate('dashboard')} 
              className="hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer flex items-center gap-1 transition-colors"
            >
              <GraduationCap className="w-3 h-3 text-indigo-500" />
              <span>StudyMate AI</span>
            </button>
            <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
            <span className="text-indigo-600 dark:text-indigo-400 font-bold capitalize truncate">{currentScreen}</span>
          </div>
          <h1 className="text-sm sm:text-lg lg:text-xl font-extrabold text-slate-900 dark:text-slate-100 leading-tight truncate">
            {currentInfo.title}
          </h1>
        </div>
      </div>

      {/* Right: Actions, Streak, Theme & Always-Visible Profile Avatar */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 lg:gap-3 shrink-0">
        {/* Quick Theme Switcher Button */}
        {onUpdateTheme && (
          <button
            id="btn-navbar-theme-toggle"
            onClick={handleCycleTheme}
            className="w-8 h-8 sm:w-auto sm:h-auto p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-slate-600 dark:text-slate-300 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 active:scale-95 shrink-0"
            title={getThemeTooltip()}
            aria-label="Toggle light, dark, or system theme"
          >
            {getThemeIcon()}
            <span className="hidden xl:inline text-[11px] font-bold capitalize">
              {currentTheme}
            </span>
          </button>
        )}

        {/* Streak Counter */}
        <div 
          id="badge-streak"
          className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-orange-50 dark:bg-orange-950/50 border border-orange-200/80 dark:border-orange-900/60 rounded-full text-orange-700 dark:text-orange-300 shadow-xs transition-colors shrink-0"
          title={`${user.streakDays} Day Study Streak`}
        >
          <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500 fill-orange-500 animate-pulse shrink-0" />
          <span className="text-[11px] sm:text-xs font-black whitespace-nowrap">
            <span className="sm:hidden">{user.streakDays}d</span>
            <span className="hidden sm:inline">{user.streakDays}d Streak</span>
          </span>
        </div>

        {/* Level & XP Pill (Desktop / Tablet) */}
        <button 
          id="badge-level-xp"
          onClick={() => onNavigate('profile')}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/60 rounded-full hover:bg-indigo-100/80 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer text-left shrink-0"
          title={`Level ${user.level} (${xpInCurrentLevel}/400 XP to next level)`}
        >
          <div className="w-5 h-5 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center text-[10px] font-black shadow-xs shrink-0">
            {user.level}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[11px] font-bold text-indigo-950 dark:text-indigo-200 leading-none">
                {user.xp} XP
              </span>
              <Sparkles className="w-2.5 h-2.5 text-amber-500" />
            </div>
            <div className="w-14 h-1.5 bg-indigo-200/60 dark:bg-indigo-900/60 rounded-full overflow-hidden mt-0.5">
              <div 
                className="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full transition-all duration-500" 
                style={{ width: `${levelProgress}%` }}
              />
            </div>
          </div>
        </button>

        {/* Quick Pomodoro Button */}
        <button
          id="btn-navbar-pomodoro"
          onClick={onOpenPomodoro}
          className="flex items-center justify-center gap-1.5 w-8 h-8 sm:w-auto sm:h-auto p-1.5 sm:px-3 sm:py-1.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
          title="Open Focus Pomodoro Timer"
          aria-label="Open Focus Timer"
        >
          <Clock className="w-3.5 h-3.5 text-indigo-300 dark:text-white shrink-0" />
          <span className="hidden sm:inline whitespace-nowrap">Focus Timer</span>
        </button>

        {/* User Profile Avatar - ALWAYS visible on all screen sizes including mobile */}
        <button
          id="btn-navbar-profile"
          onClick={onOpenProfileModal}
          className="relative flex items-center justify-center p-0.5 rounded-full hover:ring-2 hover:ring-indigo-500/50 transition-all cursor-pointer shrink-0 active:scale-95 ml-0.5"
          title={user.name ? `${user.name} - Profile & Settings` : 'Set Up Profile & Settings'}
          aria-label="Open User Profile & Settings"
        >
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name || 'Student Avatar'}
              className="w-7 h-7 sm:w-9 sm:h-9 rounded-full object-cover border-2 border-indigo-600 dark:border-indigo-400 shadow-xs"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Fallback to placeholder if avatar URL fails
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-xs border-2 border-indigo-600 dark:border-indigo-400 shadow-xs">
              {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
            </div>
          )}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
        </button>
      </div>
    </header>
  );
};
