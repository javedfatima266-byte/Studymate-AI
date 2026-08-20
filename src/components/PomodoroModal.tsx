import React from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  X, 
  Sparkles, 
  CheckCircle2, 
  Minimize2
} from 'lucide-react';
import { Subject } from '../types';

interface PomodoroModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionComplete: (durationMinutes: number, subject: Subject) => void;
  mode: 'pomodoro' | 'shortBreak' | 'longBreak';
  onSetMode: (mode: 'pomodoro' | 'shortBreak' | 'longBreak') => void;
  timeLeft: number;
  totalDuration: number;
  isRunning: boolean;
  onTogglePlay: () => void;
  onResetTimer: () => void;
  onAdjustTime: (deltaSeconds: number) => void;
  selectedSubject: Subject;
  onSelectSubject: (subject: Subject) => void;
  taskTitle?: string;
}

export const PomodoroModal: React.FC<PomodoroModalProps> = ({
  isOpen,
  onClose,
  onSessionComplete,
  mode,
  onSetMode,
  timeLeft,
  totalDuration,
  isRunning,
  onTogglePlay,
  onResetTimer,
  onAdjustTime,
  selectedSubject,
  onSelectSubject,
  taskTitle,
}) => {
  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progressPercent = totalDuration > 0 ? ((totalDuration - timeLeft) / totalDuration) * 100 : 0;

  const handleFinish = () => {
    const duration = mode === 'pomodoro' ? 25 : mode === 'shortBreak' ? 5 : 15;
    onSessionComplete(duration, selectedSubject);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        id="modal-pomodoro"
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[95vh] overflow-y-auto transition-colors"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base leading-tight">Focus & Deep Work Station</h3>
              <p className="text-[11px] text-slate-400 font-medium">Pomodoro timer for focused study intervals</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              id="btn-pomodoro-minimize"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Minimize to Floating HUD"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              id="btn-pomodoro-close"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col items-center">
          {/* Mode Selector */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl gap-1 mb-5 w-full max-w-sm justify-center">
            <button
              id="btn-mode-pomodoro"
              onClick={() => onSetMode('pomodoro')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'pomodoro'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Pomodoro (25m)
            </button>
            <button
              id="btn-mode-short-break"
              onClick={() => onSetMode('shortBreak')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'shortBreak'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Short (5m)
            </button>
            <button
              id="btn-mode-long-break"
              onClick={() => onSetMode('longBreak')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'longBreak'
                  ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Long (15m)
            </button>
          </div>

          {/* Subject & Task Indicator */}
          {mode === 'pomodoro' && (
            <div className="w-full max-w-sm mb-4 space-y-2">
              {taskTitle && (
                <div className="p-2.5 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60 text-center">
                  <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider block">Assigned Task</span>
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 block truncate">{taskTitle}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase pl-2 shrink-0">
                  Subject:
                </label>
                <select
                  id="select-pomodoro-subject"
                  value={selectedSubject}
                  onChange={(e) => onSelectSubject(e.target.value as Subject)}
                  className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 font-bold focus:outline-hidden"
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
            </div>
          )}

          {/* Circular Countdown Display with Quick Time Adjust Buttons */}
          <div className="relative w-52 h-52 flex items-center justify-center my-2 select-none">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="44"
                className="stroke-slate-100 dark:stroke-slate-800"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="44"
                className={`${
                  mode === 'pomodoro'
                    ? 'stroke-indigo-600 dark:stroke-indigo-400'
                    : mode === 'shortBreak'
                    ? 'stroke-emerald-500 dark:stroke-emerald-400'
                    : 'stroke-blue-500 dark:stroke-blue-400'
                } transition-all duration-500`}
                strokeWidth="6"
                strokeDasharray="276.46"
                strokeDashoffset={276.46 - (276.46 * progressPercent) / 100}
                strokeLinecap="round"
                fill="none"
              />
            </svg>

            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight font-mono">
                {formattedTime}
              </span>
              <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                {isRunning ? 'Focus In Progress' : 'Ready to Start'}
              </span>

              {/* Adjust minutes buttons (+5m / -5m) */}
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => onAdjustTime(-300)}
                  disabled={timeLeft <= 300}
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold disabled:opacity-30 cursor-pointer"
                  title="Subtract 5 minutes"
                >
                  -5m
                </button>
                <button
                  onClick={() => onAdjustTime(300)}
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold cursor-pointer"
                  title="Add 5 minutes"
                >
                  +5m
                </button>
              </div>
            </div>
          </div>

          {/* Primary Action Controls */}
          <div className="flex items-center gap-4 mt-4">
            <button
              id="btn-pomodoro-reset"
              onClick={onResetTimer}
              className="p-3 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              title="Reset Timer"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              id="btn-pomodoro-toggle-start"
              onClick={onTogglePlay}
              className={`px-8 py-3.5 rounded-2xl font-black text-sm text-white shadow-lg flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${
                isRunning
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                  : mode === 'pomodoro'
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5 fill-current" />
                  <span>Pause Timer</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>Start Session</span>
                </>
              )}
            </button>

            <button
              id="btn-pomodoro-quick-finish"
              onClick={handleFinish}
              className="p-3 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-full transition-colors cursor-pointer"
              title="Finish Early & Claim XP"
            >
              <CheckCircle2 className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Closing this modal keeps your timer active in the bottom HUD!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
