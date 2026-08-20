import React from 'react';
import { 
  LayoutDashboard, 
  Bot, 
  HelpCircle, 
  Sparkles, 
  Calendar, 
  BookOpen, 
  Library, 
  Trophy, 
  GraduationCap, 
  Clock, 
  X,
  Target,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { ScreenType, UserProfile } from '../types';

interface SidebarProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  user: UserProfile;
  onOpenPomodoro: () => void;
  onOpenCommandPalette?: () => void;
  onLogout?: () => void;
}

interface NavItem {
  id: ScreenType;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tutor', label: 'AI Tutor', icon: Bot, badge: 'Live' },
  { id: 'quiz', label: 'Quiz Generator', icon: HelpCircle },
  { id: 'summarizer', label: 'Smart Summarizer', icon: Sparkles },
  { id: 'planner', label: 'Study Planner', icon: Calendar },
  { id: 'notes', label: 'Notes & Flashcards', icon: BookOpen },
  { id: 'library', label: 'Resource Library', icon: Library },
  { id: 'profile', label: 'Profile & Badges', icon: Trophy },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
  user,
  onOpenPomodoro,
  onOpenCommandPalette,
  onLogout,
}) => {
  const handleNavClick = (screen: ScreenType) => {
    onNavigate(screen);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800">
          <div 
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-white text-base tracking-tight flex items-center gap-1">
                StudyMate <span className="text-indigo-400 font-extrabold text-xs px-1.5 py-0.5 bg-indigo-500/20 rounded-md border border-indigo-500/30">AI</span>
              </span>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide">Intelligent Study Suite</p>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Study Modules
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Focus Mode & Daily Target Card */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 mb-3">
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-indigo-400" />
                Daily Goal
              </span>
              <span className="text-indigo-300 font-bold">40 / {user.targetDailyMinutes}m</span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (40 / user.targetDailyMinutes) * 100)}%` }}
              />
            </div>
          </div>

          <button
            id="btn-sidebar-quick-pomodoro"
            onClick={() => {
              onOpenPomodoro();
              onCloseMobile();
            }}
            className="w-full py-2.5 px-4 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Clock className="w-4 h-4 text-indigo-400" />
            Start 25m Focus Block
          </button>

          {/* User Account & Logout Footer */}
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <div 
              onClick={() => handleNavClick('profile')}
              className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name || 'User'}
                  className="w-7 h-7 rounded-full object-cover border border-indigo-500/50 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-200 truncate leading-tight">
                  {user.name?.trim() || 'Student'}
                </p>
                <p className="text-[10px] text-slate-400 truncate leading-tight">
                  {user.email || 'Active Account'}
                </p>
              </div>
            </div>

            {onLogout && (
              <button
                id="btn-sidebar-logout"
                onClick={onLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
                title="Log Out of StudyMate AI"
                aria-label="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
