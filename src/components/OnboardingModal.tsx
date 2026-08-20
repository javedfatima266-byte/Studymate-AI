import React, { useState } from 'react';
import { 
  Sparkles, 
  User, 
  Mail, 
  GraduationCap, 
  Clock, 
  BookOpen, 
  Check, 
  ArrowRight, 
  Award,
  Zap,
  Sun,
  Moon,
  Laptop
} from 'lucide-react';
import { UserProfile, Subject } from '../types';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (user: UserProfile) => void;
  currentUser: UserProfile;
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

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onComplete,
  currentUser,
}) => {
  const [name, setName] = useState(currentUser.name || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [gradeLevel, setGradeLevel] = useState(currentUser.gradeLevel || 'Undergraduate (Year 1-2)');
  const [targetDailyMinutes, setTargetDailyMinutes] = useState(currentUser.targetDailyMinutes || 60);
  const [avatar, setAvatar] = useState(currentUser.avatar || AVATAR_OPTIONS[0]);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(currentUser.theme || 'light');
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>(
    currentUser.selectedSubjects && currentUser.selectedSubjects.length > 0
      ? currentUser.selectedSubjects
      : ['Computer Science', 'Mathematics', 'Physics']
  );
  const [step, setStep] = useState<1 | 2>(1);

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

  const handleFinish = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalName = name.trim() || 'Student';
    const finalEmail = email.trim() || 'student@university.edu';
    
    const updatedUser: UserProfile = {
      ...currentUser,
      name: finalName,
      email: finalEmail,
      gradeLevel,
      targetDailyMinutes: Number(targetDailyMinutes) || 60,
      avatar,
      theme,
      selectedSubjects,
      xp: (currentUser.xp || 0) + 100, // Starter XP reward
      streakDays: currentUser.streakDays || 1,
      onboarded: true,
    };

    onComplete(updatedUser);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div 
        id="modal-onboarding"
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden my-6 transition-all animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Top Header Banner */}
        <div className="relative bg-gradient-to-r from-indigo-950 via-indigo-900 to-violet-950 text-white p-6 sm:p-8 overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl" />
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-indigo-200 border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Welcome to StudyMate AI</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Personalize Your Study Space
            </h2>
            <p className="text-indigo-200 text-xs sm:text-sm leading-relaxed">
              Set up your profile, learning level, and focus subjects so your AI Tutor can tailor every explanation and quiz to you.
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4 pt-2">
            <div 
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                step === 1 ? 'bg-indigo-400' : 'bg-emerald-400'
              }`} 
            />
            <div 
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                step === 2 ? 'bg-indigo-400' : 'bg-white/20'
              }`} 
            />
          </div>
        </div>

        {/* Step 1: Personal Details & Avatar */}
        {step === 1 && (
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                1. Select Your Avatar
              </label>
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {AVATAR_OPTIONS.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    id={`btn-onboarding-avatar-${idx}`}
                    onClick={() => setAvatar(imgUrl)}
                    className={`relative w-12 h-12 rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                      avatar === imgUrl 
                        ? 'border-indigo-600 dark:border-indigo-400 ring-4 ring-indigo-100 dark:ring-indigo-950/60 scale-110 shadow-md' 
                        : 'border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={imgUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    {avatar === imgUrl && (
                      <div className="absolute inset-0 bg-indigo-600/35 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white drop-shadow-xs" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Your Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    id="input-onboarding-name"
                    type="text"
                    required
                    placeholder="Enter your name (e.g. Maya Lin, Alex, Liam)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address <span className="text-slate-400 font-normal">(Optional for study sync)</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    id="input-onboarding-email"
                    type="email"
                    placeholder="e.g. student@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400 font-medium"
                  />
                </div>
              </div>

              {/* Theme Preference in Onboarding */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Theme Preference
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      theme === 'light'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-600 text-indigo-900 dark:text-indigo-200'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span>Light</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-600 text-indigo-900 dark:text-indigo-200'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Dark</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('system')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      theme === 'system'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-600 text-indigo-900 dark:text-indigo-200'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5 text-slate-400" />
                    <span>System</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-400">Step 1 of 2</span>
              <button
                id="btn-onboarding-next"
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Academic Level, Target & Subjects */}
        {step === 2 && (
          <form onSubmit={handleFinish} className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Academic Level
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                  <select
                    id="select-onboarding-grade"
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Daily Study Goal
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                  <select
                    id="select-onboarding-target"
                    value={targetDailyMinutes}
                    onChange={(e) => setTargetDailyMinutes(Number(e.target.value))}
                    className="w-full pl-10 pr-3 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value={30}>30 mins / day (Casual)</option>
                    <option value={60}>60 mins / day (Standard)</option>
                    <option value={90}>90 mins / day (Focused)</option>
                    <option value={120}>120 mins / day (Intensive)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Subjects Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Select Your Study Subjects
                </span>
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold lowercase">
                  ({selectedSubjects.length} selected)
                </span>
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {AVAILABLE_SUBJECTS.map((sub) => {
                  const isSelected = selectedSubjects.includes(sub);
                  return (
                    <button
                      key={sub}
                      type="button"
                      id={`btn-onboarding-sub-${sub.replace(/\s+/g, '-').toLowerCase()}`}
                      onClick={() => toggleSubject(sub)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs scale-102'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-750'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                      {sub}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Welcome Bonus Callout */}
            <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
                <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-amber-900 dark:text-amber-200">Welcome Starter Reward</p>
                <p className="text-amber-700 dark:text-amber-300 font-medium">
                  Completing setup immediately awards <strong>+100 XP</strong> & your first Day-1 streak badge!
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                id="btn-onboarding-complete"
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Launch My Study Space</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
