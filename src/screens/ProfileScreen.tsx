import React from 'react';
import { 
  Trophy, 
  Flame, 
  Clock, 
  Sparkles, 
  Lock, 
  CheckCircle2, 
  Edit3, 
  Award, 
  GraduationCap, 
  Brain,
  Sun,
  Moon,
  Laptop,
  Check,
  Palette,
  LogOut,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { UserProfile, Achievement } from '../types';

interface ProfileScreenProps {
  user: UserProfile;
  achievements: Achievement[];
  onOpenEditProfile: () => void;
  onUpdateTheme?: (theme: 'light' | 'dark' | 'system') => void;
  onLogout?: () => void;
}

const getBadgeIcon = (iconName: string) => {
  switch (iconName) {
    case 'Flame': return <Flame className="w-6 h-6 text-orange-500 fill-orange-500" />;
    case 'Trophy': return <Trophy className="w-6 h-6 text-amber-500" />;
    case 'Brain': return <Brain className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />;
    case 'Clock': return <Clock className="w-6 h-6 text-blue-500" />;
    case 'Sparkles': return <Sparkles className="w-6 h-6 text-amber-500" />;
    case 'GraduationCap':
    default:
      return <GraduationCap className="w-6 h-6 text-purple-500" />;
  }
};

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  achievements,
  onOpenEditProfile,
  onUpdateTheme,
  onLogout,
}) => {
  const xpInCurrentLevel = (user.xp || 0) % 400;
  const levelProgress = (xpInCurrentLevel / 400) * 100;
  const unlockedCount = achievements.filter(a => Boolean(a.unlockedAt)).length;
  const currentTheme = user.theme || 'light';

  const THEME_OPTIONS: Array<{
    id: 'light' | 'dark' | 'system';
    title: string;
    description: string;
    icon: React.ElementType;
    previewBg: string;
  }> = [
    {
      id: 'light',
      title: 'Light Mode',
      description: 'Crisp, high-contrast light surfaces for bright study environments',
      icon: Sun,
      previewBg: 'from-amber-100/50 to-orange-50/50 text-amber-600',
    },
    {
      id: 'dark',
      title: 'Dark Mode',
      description: 'Eye-friendly deep obsidian surfaces for night and deep focus sessions',
      icon: Moon,
      previewBg: 'from-indigo-950/60 to-slate-900 text-indigo-400',
    },
    {
      id: 'system',
      title: 'System Default',
      description: 'Automatically synchronizes with your device preference',
      icon: Laptop,
      previewBg: 'from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 text-slate-600 dark:text-slate-300',
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 sm:space-y-8 pb-12 transition-colors duration-200">
      {/* Profile Top Hero Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-8 shadow-xs relative overflow-hidden transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 sm:gap-6 relative z-10">
          <div className="flex items-center gap-3.5 sm:gap-5">
            <div className="relative shrink-0">
              <img
                src={user.avatar}
                alt={user.name || 'Student Avatar'}
                className="w-14 h-14 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-indigo-600 dark:border-indigo-500 shadow-md"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-2 -right-2 bg-indigo-600 dark:bg-indigo-500 text-white text-[10px] sm:text-xs font-black px-1.5 sm:px-2.5 py-0.5 rounded-full border-2 border-white dark:border-slate-900 shadow-xs">
                Lv. {user.level}
              </div>
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-100 truncate">
                  {user.name?.trim() || 'Student'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-extrabold border border-indigo-100 dark:border-indigo-900/60">
                  {user.gradeLevel}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                {user.email?.trim() || 'student@university.edu'}
              </p>
              <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-600 dark:text-slate-400 font-semibold pt-1 flex-wrap">
                <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-bold">
                  <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                  {user.streakDays}-Day Streak
                </span>
                <span>•</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                  {user.xp} Total XP
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            <button
              id="btn-edit-profile-trigger"
              onClick={onOpenEditProfile}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 border border-slate-200/60 dark:border-slate-700"
            >
              <Edit3 className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <span>Edit Profile & Goal</span>
            </button>

            {onLogout && (
              <button
                id="btn-profile-logout"
                onClick={onLogout}
                className="px-4 py-2.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 border border-rose-200 dark:border-rose-900/60"
                title="Log out of StudyMate AI"
              >
                <LogOut className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Log Out</span>
              </button>
            )}
          </div>
        </div>

        {/* XP Level Bar */}
        <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5 text-indigo-950 dark:text-indigo-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Level {user.level} Progress
            </span>
            <span className="text-slate-500 dark:text-slate-400">{xpInCurrentLevel} / 400 XP to Level {user.level + 1}</span>
          </div>
          <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 rounded-full transition-all duration-500"
              style={{ width: `${levelProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* APPEARANCE / THEME SELECTOR SECTION */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-7 shadow-xs space-y-4 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                Appearance & Theme
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customize your visual interface. Changes are saved automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Theme Segmented Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-1">
          {THEME_OPTIONS.map((themeOpt) => {
            const Icon = themeOpt.icon;
            const isSelected = currentTheme === themeOpt.id;
            return (
              <button
                key={themeOpt.id}
                type="button"
                id={`theme-option-${themeOpt.id}`}
                onClick={() => onUpdateTheme && onUpdateTheme(themeOpt.id)}
                className={`group relative p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100/70 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${themeOpt.previewBg} flex items-center justify-center border border-slate-200/50 dark:border-slate-700/50`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Radio Check Indicator */}
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      isSelected 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' 
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      {themeOpt.title}
                      {isSelected && (
                        <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded-md bg-indigo-600 text-white">
                          Active
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {themeOpt.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4 Lifetime Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3 sm:gap-4 transition-colors">
          <div className="p-2.5 sm:p-3 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 shrink-0">
            <Flame className="w-5 h-5 sm:w-6 sm:h-6 fill-orange-500" />
          </div>
          <div className="min-w-0">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 truncate">{user.streakDays} Days</div>
            <div className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">Active Streak</div>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3 sm:gap-4 transition-colors">
          <div className="p-2.5 sm:p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shrink-0">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 truncate">{user.targetDailyMinutes}m</div>
            <div className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">Daily Target</div>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3 sm:gap-4 transition-colors">
          <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 truncate">{unlockedCount} / {achievements.length}</div>
            <div className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">Badges Unlocked</div>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3 sm:gap-4 transition-colors">
          <div className="p-2.5 sm:p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 shrink-0">
            <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 truncate">{user.selectedSubjects.length}</div>
            <div className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">Active Subjects</div>
          </div>
        </div>
      </div>

      {/* Badges and Achievements Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Achievements & Badges
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Complete study tasks, pass quizzes, and maintain streaks to unlock rewards.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {achievements.map((badge) => {
            const isUnlocked = Boolean(badge.unlockedAt);
            const progressPct = Math.min(100, ((badge.progress || 0) / (badge.maxProgress || 1)) * 100);

            return (
              <div
                key={badge.id}
                id={`badge-card-${badge.id}`}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isUnlocked
                    ? 'bg-white dark:bg-slate-900 border-amber-200/80 dark:border-amber-900/50 shadow-xs ring-1 ring-amber-400/20'
                    : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center">
                      {getBadgeIcon(badge.iconName)}
                    </div>
                    {isUnlocked ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px] border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Unlocked
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[10px] flex items-center gap-1 border border-slate-300/60 dark:border-slate-700">
                        <Lock className="w-3 h-3" /> Locked
                      </span>
                    )}
                  </div>

                  <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">{badge.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{badge.description}</p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <span>Progress</span>
                    <span>{badge.progress || 0} / {badge.maxProgress || 1}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        isUnlocked ? 'bg-amber-500' : 'bg-slate-400 dark:bg-slate-600'
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">+{badge.xpReward} XP</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Enrolled Subjects List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-3 transition-colors">
        <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">Enrolled Academic Subjects</h4>
        <div className="flex flex-wrap gap-2">
          {(user.selectedSubjects || []).map(sub => (
            <span
              key={sub}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-100 dark:border-indigo-900/60 flex items-center gap-1.5"
            >
              <GraduationCap className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              {sub}
            </span>
          ))}
        </div>
      </div>

      {/* Account Security & Session Management */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-7 shadow-xs space-y-4 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">Account & Active Session</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Manage your authenticated student account credentials and session security</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Signed In As:</span>
              <span className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/60">
                {user.email || 'student@university.edu'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              All notes, quizzes, flashcards, and tutor chat history are saved securely to your personal account.
            </p>
          </div>

          {onLogout && (
            <button
              id="btn-account-section-logout"
              onClick={onLogout}
              className="w-full sm:w-auto px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer shrink-0 active:scale-98"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out of StudyMate</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
