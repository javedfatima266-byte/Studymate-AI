import React, { useState } from 'react';
import { 
  GraduationCap, 
  Bot, 
  HelpCircle, 
  Sparkles, 
  BookOpen, 
  Clock, 
  ArrowRight, 
  Lock, 
  Mail, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Sun, 
  Moon, 
  Laptop,
  Flame,
  ShieldCheck,
  Zap,
  Check
} from 'lucide-react';
import { UserProfile, Subject } from '../types';
import { AuthService } from '../services/authService';

interface AuthScreenProps {
  onAuthSuccess: (user: UserProfile, data?: any) => void;
  currentTheme: 'light' | 'dark' | 'system';
  onToggleTheme: () => void;
}

type AuthMode = 'login' | 'signup' | 'forgot';

const GRADE_LEVELS = [
  'Undergraduate (Year 1-2)',
  'Undergraduate (Year 3-4)',
  'High School (AP/IB/Honors)',
  'Graduate / Postgrad',
  'Medical / Law / Professional',
  'Self-Directed / Lifelong Learner'
];

const AVAILABLE_SUBJECTS: Subject[] = [
  'Computer Science',
  'Mathematics',
  'Physics',
  'Biology',
  'Chemistry',
  'Economics',
  'Literature',
  'Psychology',
  'History',
  'Medicine',
  'Philosophy',
  'Engineering'
];

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthSuccess,
  currentTheme,
  onToggleTheme,
}) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('Undergraduate (Year 1-2)');
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([
    'Computer Science',
    'Mathematics',
    'Physics',
    'Biology'
  ]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const toggleSubject = (sub: Subject) => {
    if (selectedSubjects.includes(sub)) {
      if (selectedSubjects.length > 1) {
        setSelectedSubjects(selectedSubjects.filter(s => s !== sub));
      }
    } else {
      setSelectedSubjects([...selectedSubjects, sub]);
    }
  };

  const handleTabChange = (newMode: AuthMode) => {
    setMode(newMode);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (mode === 'signup') {
      if (!name.trim()) {
        setErrorMessage('Please enter your full name.');
        return;
      }
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setErrorMessage('Please enter a valid email address.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please re-enter your password.');
        return;
      }

      setIsLoading(true);
      const res = await AuthService.signup({
        name: name.trim(),
        email: email.trim(),
        password,
        gradeLevel,
        selectedSubjects,
      });
      setIsLoading(false);

      if (res.success && res.user) {
        onAuthSuccess(res.user, res.data);
      } else {
        setErrorMessage(res.error || 'Failed to create account. Please try again.');
      }
    } else if (mode === 'login') {
      if (!email.trim() || !password) {
        setErrorMessage('Please provide both your email address and password.');
        return;
      }

      setIsLoading(true);
      const res = await AuthService.login({
        email: email.trim(),
        password,
      });
      setIsLoading(false);

      if (res.success && res.user) {
        onAuthSuccess(res.user, res.data);
      } else {
        setErrorMessage(res.error || 'Invalid email or password.');
      }
    } else if (mode === 'forgot') {
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setErrorMessage('Please enter a valid registered email address.');
        return;
      }
      if (!password || password.length < 6) {
        setErrorMessage('Please enter a new password (at least 6 characters long).');
        return;
      }
      if (confirmPassword && password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please re-enter your password.');
        return;
      }

      setIsLoading(true);
      const res = await AuthService.forgotPassword(email.trim(), password);
      setIsLoading(false);

      if (res.success) {
        setSuccessMessage(res.message || 'Password reset successfully!');
        // Transition to login with prefilled email
        setTimeout(() => {
          setMode('login');
          setPassword('');
          setConfirmPassword('');
          setSuccessMessage('Password reset successful! Please log in with your new password.');
        }, 1200);
      } else {
        setErrorMessage(res.error || res.message || 'Could not reset password. Please check your email.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between transition-colors duration-200">
      {/* Top Navigation Bar */}
      <header className="w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-slate-900 dark:text-white text-lg tracking-tight">
                  StudyMate
                </span>
                <span className="text-[11px] font-extrabold px-1.5 py-0.5 rounded-md bg-indigo-600/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                Intelligent Study Suite & Socratic AI Tutor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Switcher Button */}
            <button
              id="btn-auth-theme-toggle"
              onClick={onToggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
              title={`Switch Theme (Current: ${currentTheme})`}
              aria-label="Toggle visual theme"
            >
              {currentTheme === 'dark' ? (
                <Moon className="w-4 h-4 text-indigo-400" />
              ) : currentTheme === 'light' ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Laptop className="w-4 h-4 text-slate-500" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex items-center justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 w-full max-w-5xl items-center">
          
          {/* Left / Center: Authentication Form Card */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6 transition-all">
              
              {/* Tab Navigation */}
              <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200/60 dark:border-slate-700/60">
                <button
                  id="tab-auth-login"
                  type="button"
                  onClick={() => handleTabChange('login')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                    mode === 'login'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Log In
                </button>
                <button
                  id="tab-auth-signup"
                  type="button"
                  onClick={() => handleTabChange('signup')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                    mode === 'signup'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Header Title & Subtext */}
              <div className="space-y-1">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {mode === 'login' && 'Welcome Back'}
                  {mode === 'signup' && 'Start Your Study Journey'}
                  {mode === 'forgot' && 'Reset Your Password'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                  {mode === 'login' && 'Log in to access your personal notes, quizzes, tutor conversations, and streak.'}
                  {mode === 'signup' && 'Create your personal StudyMate AI account with isolated study storage.'}
                  {mode === 'forgot' && 'Enter your email and set a new password to regain access.'}
                </p>
              </div>

              {/* Alert Messages */}
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Auth Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Full Name Field (Sign Up Only) */}
                {mode === 'signup' && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="input-signup-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Maya Lin"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Email Address Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="input-auth-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student@university.edu"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      {mode === 'forgot' ? 'New Password' : 'Password'}
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => handleTabChange('forgot')}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="input-auth-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === 'forgot' ? 'Enter new password (min 6 chars)' : '••••••••'}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field (Sign Up & Forgot Password) */}
                {(mode === 'signup' || mode === 'forgot') && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      {mode === 'forgot' ? 'Confirm New Password' : 'Confirm Password'}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="input-signup-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 cursor-pointer"
                        title={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Grade Level & Subjects (Sign Up Only) */}
                {mode === 'signup' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Academic Level
                      </label>
                      <select
                        id="select-signup-grade"
                        value={gradeLevel}
                        onChange={(e) => setGradeLevel(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      >
                        {GRADE_LEVELS.map(lvl => (
                          <option key={lvl} value={lvl}>{lvl}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Select Your Focus Subjects
                      </label>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1">
                        {AVAILABLE_SUBJECTS.map((sub) => {
                          const isSelected = selectedSubjects.includes(sub);
                          return (
                            <button
                              key={sub}
                              type="button"
                              onClick={() => toggleSubject(sub)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                isSelected
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                              {sub}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* Submit Action Button */}
                <button
                  id="btn-auth-submit"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-extrabold rounded-xl text-sm shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 mt-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>
                        {mode === 'login' && 'Log In to StudyMate'}
                        {mode === 'signup' && 'Create Free Account'}
                        {mode === 'forgot' && 'Reset Password'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Mode switch helper link */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                {mode === 'forgot' ? (
                  <button
                    type="button"
                    onClick={() => handleTabChange('login')}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    ← Back to Log In
                  </button>
                ) : mode === 'login' ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => handleTabChange('signup')}
                      className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Sign up for free
                    </button>
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => handleTabChange('login')}
                      className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Log in here
                    </button>
                  </p>
                )}
              </div>

            </div>
          </div>

          {/* Right Column: Feature Highlights & Showcase (Desktop / Tablet) */}
          <div className="lg:col-span-6 space-y-6 hidden lg:block">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs border border-indigo-200 dark:border-indigo-800">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Isolated User Data & Encrypted Sessions</span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                Your Personal AI Academic Co-Pilot
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                StudyMate AI combines adaptive Socratic tutoring, document synthesis, and active recall practice into one streamlined workspace.
              </p>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">Socratic AI Tutor</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                  Step-by-step guidance, math equations, and deep concept breakdowns.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">Instant Practice Quizzes</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                  Generate timed multiple-choice assessments from any topic or note.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">Smart Summarizer</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                  Synthesize PDFs, slides, and lectures into structured study notes.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">Pomodoro & Streaks</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                  Gamified focus blocks, daily study targets, XP, and streak rewards.
                </p>
              </div>
            </div>

            {/* Privacy note */}
            <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>All student data is securely partitioned. Each account receives isolated notebook storage.</span>
            </div>

          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/60 dark:border-slate-800/60 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4">
          StudyMate AI • Modern Intelligent Learning Platform
        </div>
      </footer>
    </div>
  );
};
