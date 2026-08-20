import React, { useState } from 'react';
import { 
  X, 
  User, 
  Mail, 
  GraduationCap, 
  Clock, 
  BookOpen, 
  Sparkles, 
  Check,
  Sun,
  Moon,
  Laptop,
  Palette
} from 'lucide-react';
import { UserProfile, Subject } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onSaveUser: (updated: UserProfile) => void;
}

const AVAILABLE_SUBJECTS: Subject[] = [
  'Computer Science',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'History',
  'Literature',
  'General',
];

const AVATAR_OPTIONS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80'
];

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, user, onSaveUser }) => {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [gradeLevel, setGradeLevel] = useState(user?.gradeLevel || 'Undergraduate (Year 1-2)');
  const [targetDailyMinutes, setTargetDailyMinutes] = useState(user?.targetDailyMinutes || 60);
  const [avatar, setAvatar] = useState(user?.avatar || AVATAR_OPTIONS[0]);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(user?.theme || 'light');
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>(
    user?.selectedSubjects?.length ? user.selectedSubjects : ['Computer Science', 'Mathematics', 'Physics']
  );

  // Sync internal state when user prop updates
  React.useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setGradeLevel(user.gradeLevel || 'Undergraduate (Year 1-2)');
      setTargetDailyMinutes(user.targetDailyMinutes || 60);
      setAvatar(user.avatar || AVATAR_OPTIONS[0]);
      setTheme(user.theme || 'light');
      if (user.selectedSubjects?.length) {
        setSelectedSubjects(user.selectedSubjects);
      }
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const toggleSubject = (sub: Subject) => {
    if (selectedSubjects.includes(sub)) {
      if (selectedSubjects.length > 1) {
        setSelectedSubjects(selectedSubjects.filter(s => s !== sub));
      }
    } else {
      setSelectedSubjects([...selectedSubjects, sub]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveUser({
      ...user,
      name,
      email,
      gradeLevel,
      targetDailyMinutes: Number(targetDailyMinutes) || 60,
      avatar,
      theme,
      selectedSubjects,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 dark:bg-black/75 backdrop-blur-xs transition-colors duration-200">
      <div 
        id="modal-auth-profile"
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] transition-colors"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400">
              <User className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">Student Profile & Settings</h3>
              <p className="text-[11px] text-slate-400">Personalize your study identity and application theme</p>
            </div>
          </div>
          <button
            id="btn-auth-close"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5">
          {/* Avatar Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Choose Avatar
            </label>
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              {AVATAR_OPTIONS.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  id={`btn-avatar-${idx}`}
                  onClick={() => setAvatar(imgUrl)}
                  className={`relative w-12 h-12 rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                    avatar === imgUrl 
                      ? 'border-indigo-600 dark:border-indigo-400 ring-4 ring-indigo-100 dark:ring-indigo-950/60 scale-105 shadow-sm' 
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={imgUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  {avatar === imgUrl && (
                    <div className="absolute inset-0 bg-indigo-600/35 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Appearance / Theme Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Appearance (Theme)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                id="btn-theme-modal-light"
                onClick={() => setTheme('light')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  theme === 'light'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-600 dark:border-indigo-500 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Light</span>
              </button>

              <button
                type="button"
                id="btn-theme-modal-dark"
                onClick={() => setTheme('dark')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  theme === 'dark'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-600 dark:border-indigo-500 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>Dark</span>
              </button>

              <button
                type="button"
                id="btn-theme-modal-system"
                onClick={() => setTheme('system')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  theme === 'system'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-600 dark:border-indigo-500 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Laptop className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>System</span>
              </button>
            </div>
          </div>

          {/* Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  id="input-profile-name"
                  type="text"
                  required
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  id="input-profile-email"
                  type="email"
                  required
                  placeholder="e.g. student@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Grade Level & Daily Study Target */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Academic Level</label>
              <div className="relative">
                <GraduationCap className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                <select
                  id="select-profile-grade"
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="High School (Grades 9-12)">High School (Grades 9-12)</option>
                  <option value="Undergraduate (Year 1-2)">Undergraduate (Year 1-2)</option>
                  <option value="Undergraduate (Year 3-4)">Undergraduate (Year 3-4)</option>
                  <option value="Graduate / Master's">Graduate / Master's</option>
                  <option value="PhD / Researcher">PhD / Researcher</option>
                  <option value="Self-Directed Learner">Self-Directed Learner</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Daily Study Target</label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                <select
                  id="select-profile-target-minutes"
                  value={targetDailyMinutes}
                  onChange={(e) => setTargetDailyMinutes(Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value={30}>30 mins / day (Casual)</option>
                  <option value={60}>60 mins / day (Standard)</option>
                  <option value={90}>90 mins / day (Focused)</option>
                  <option value={120}>120 mins / day (Intensive)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Subjects Focus */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Your Focus Subjects
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SUBJECTS.map((sub) => {
                const isSelected = selectedSubjects.includes(sub);
                return (
                  <button
                    key={sub}
                    type="button"
                    id={`btn-subject-${sub.replace(/\s+/g, '-').toLowerCase()}`}
                    onClick={() => toggleSubject(sub)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                    {sub}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              id="btn-auth-cancel"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="btn-auth-save"
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
