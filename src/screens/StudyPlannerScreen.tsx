import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Sparkles, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Trash2, 
  Sliders, 
  Flame, 
  ChevronLeft, 
  ChevronRight,
  X,
  Play
} from 'lucide-react';
import { Subject, StudyTask, UserProfile } from '../types';

interface StudyPlannerScreenProps {
  tasks: StudyTask[];
  onAddTask: (task: StudyTask) => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onGeneratePlan: (params: { examDate: string; subjects: Subject[]; hoursPerDay: number; goals: string }) => Promise<void>;
  onOpenPomodoro: (subject?: Subject, taskTitle?: string) => void;
  user: UserProfile;
  isLoading: boolean;
}

const SUBJECTS: Subject[] = [
  'Computer Science',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'History',
  'Literature',
  'General',
];

export const StudyPlannerScreen: React.FC<StudyPlannerScreenProps> = ({
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onGeneratePlan,
  onOpenPomodoro,
  user,
  isLoading,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAIPlanModal, setShowAIPlanModal] = useState(false);

  // New Manual Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSubject, setNewTaskSubject] = useState<Subject>('Computer Science');
  const [newTaskDuration, setNewTaskDuration] = useState(30);
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTaskNotes, setNewTaskNotes] = useState('');

  // AI Plan Generator Form State
  const [examDate, setExamDate] = useState(
    new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0]
  );
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>(user.selectedSubjects);
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [studyGoals, setStudyGoals] = useState('Ace upcoming midterms and master difficult algorithms');

  const filteredTasks = tasks.filter(t => t.date === selectedDate);
  const completedCount = filteredTasks.filter(t => t.isCompleted).length;
  const totalMinutesToday = filteredTasks.reduce((acc, t) => acc + t.durationMinutes, 0);

  // Generate 7-day strip
  const getDaysStrip = () => {
    const days = [];
    const today = new Date();
    for (let i = -2; i <= 4; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        dateStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        isToday: i === 0,
      });
    }
    return days;
  };

  const daysStrip = getDaysStrip();

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: StudyTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      subject: newTaskSubject,
      date: selectedDate,
      durationMinutes: Number(newTaskDuration) || 30,
      isCompleted: false,
      priority: newTaskPriority,
      notes: newTaskNotes.trim() || undefined,
      aiSuggested: false,
    };

    onAddTask(newTask);
    setNewTaskTitle('');
    setNewTaskNotes('');
    setShowAddModal(false);
  };

  const handleAIScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onGeneratePlan({
      examDate,
      subjects: selectedSubjects,
      hoursPerDay,
      goals: studyGoals,
    });
    setShowAIPlanModal(false);
  };

  const toggleSubjectSelect = (sub: Subject) => {
    if (selectedSubjects.includes(sub)) {
      if (selectedSubjects.length > 1) {
        setSelectedSubjects(selectedSubjects.filter(s => s !== sub));
      }
    } else {
      setSelectedSubjects([...selectedSubjects, sub]);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 sm:space-y-8 pb-12 transition-colors duration-200">
      {/* Header Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-indigo-900/30">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-blue-200 mb-2">
            <CalendarIcon className="w-3.5 h-3.5 text-blue-300" />
            <span>Smart Schedule & Pomodoro Engine</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold">Study Planner & Focus Tracker</h2>
          <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-xl">
            Keep on track with adaptive study schedules, daily checklists, and focused Pomodoro intervals.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto flex-col sm:flex-row">
          <button
            id="btn-open-ai-planner"
            onClick={() => setShowAIPlanModal(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <span>AI Study Plan</span>
          </button>

          <button
            id="btn-add-task-modal"
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 border border-slate-200 dark:border-slate-700"
          >
            <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Date Strip Navigator */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 sm:p-4 shadow-xs transition-colors">
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 overflow-x-auto pb-1">
          {daysStrip.map(day => {
            const isSelected = selectedDate === day.dateStr;
            return (
              <button
                key={day.dateStr}
                id={`date-strip-${day.dateStr}`}
                onClick={() => setSelectedDate(day.dateStr)}
                className={`flex-1 min-w-[62px] sm:min-w-[70px] py-2.5 sm:py-3 px-1.5 sm:px-2 rounded-xl text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md font-bold scale-105'
                    : 'bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700'
                }`}
              >
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                  isSelected ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-400'
                }`}>
                  {day.dayName}
                </span>
                <span className="text-base sm:text-lg font-black block mt-0.5">{day.dayNum}</span>
                {day.isToday && (
                  <span className={`inline-block w-1.5 h-1.5 rounded-full mt-1 ${
                    isSelected ? 'bg-amber-300' : 'bg-indigo-600 dark:bg-indigo-400'
                  }`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Task List & Summary Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left 2 Cols: Task Checklist */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                Tasks for {selectedDate === new Date().toISOString().split('T')[0] ? 'Today' : selectedDate}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {completedCount} of {filteredTasks.length} tasks completed • {totalMinutesToday} mins planned
              </p>
            </div>

            <button
              id="btn-add-task-quick"
              onClick={() => setShowAddModal(true)}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Task
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 sm:p-4 space-y-3 shadow-xs transition-colors">
            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
                <CalendarIcon className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-semibold">No study tasks planned for this day.</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Click &quot;Add Task&quot; or use &quot;Generate AI Study Plan&quot;.</p>
              </div>
            ) : (
              filteredTasks.map(task => {
                const isCompleted = task.isCompleted;
                let priorityBadge = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
                if (task.priority === 'high') priorityBadge = 'bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800';
                if (task.priority === 'medium') priorityBadge = 'bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800';

                return (
                  <div
                    key={task.id}
                    id={`task-item-${task.id}`}
                    className={`flex items-start justify-between p-3.5 sm:p-4 rounded-xl border transition-all ${
                      isCompleted
                        ? 'bg-slate-50/80 dark:bg-slate-850/60 border-slate-200/70 dark:border-slate-800'
                        : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-750 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <button
                        id={`btn-task-toggle-${task.id}`}
                        onClick={() => onToggleTask(task.id)}
                        className="mt-0.5 text-slate-400 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer shrink-0"
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950/80" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className={`text-xs sm:text-sm font-bold ${
                            isCompleted ? 'line-through text-slate-400 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'
                          }`}>
                            {task.title}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${priorityBadge}`}>
                            {task.priority}
                          </span>
                          {task.aiSuggested && (
                            <span className="px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              AI Suggested
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 font-medium">
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold">{task.subject}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" /> {task.durationMinutes} mins
                          </span>
                        </div>

                        {task.notes && (
                          <p className="text-xs text-slate-700 dark:text-slate-200 italic bg-slate-50 dark:bg-slate-850 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-750 mt-1 leading-relaxed">
                            💡 {task.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2 sm:ml-3">
                      <button
                        id={`btn-start-focus-${task.id}`}
                        onClick={() => onOpenPomodoro(task.subject, task.title)}
                        className="px-2.5 sm:px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-200 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-indigo-200 dark:border-indigo-800 shadow-xs"
                        title="Start Pomodoro for this task"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span className="hidden xs:inline">Focus</span>
                      </button>

                      <button
                        id={`btn-delete-task-${task.id}`}
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1.5 text-slate-400 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                        title="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 1 Col: Pomodoro Card & Study Summary */}
        <div className="space-y-6">
          {/* Quick Pomodoro Widget */}
          <div className="bg-gradient-to-br from-indigo-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md space-y-4 border border-indigo-900/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Focus Session
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                +50 XP
              </span>
            </div>

            <div>
              <h4 className="text-base sm:text-lg font-bold">25-Minute Focus Block</h4>
              <p className="text-xs text-indigo-200 mt-0.5">
                Block distractions and lock in with structured Pomodoro cycles.
              </p>
            </div>

            <button
              id="btn-planner-launch-pomodoro"
              onClick={() => onOpenPomodoro()}
              className="w-full py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-xs sm:text-sm"
            >
              <Play className="w-4 h-4 fill-current" />
              Launch Focus Mode
            </button>
          </div>

          {/* Daily Goal & Streak Progress */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4 transition-colors">
            <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              Study Consistency
            </h4>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span>Daily Study Goal</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">{totalMinutesToday} / {user.targetDailyMinutes} mins</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (totalMinutesToday / user.targetDailyMinutes) * 100)}%` }}
                />
              </div>
            </div>

            <div className="p-3 bg-orange-50/70 dark:bg-orange-950/40 rounded-xl border border-orange-100 dark:border-orange-900/60 text-xs text-orange-950 dark:text-orange-200 flex items-center gap-2.5 font-medium">
              <Flame className="w-5 h-5 text-orange-500 shrink-0" />
              <span>You have completed study sessions <strong>{user.streakDays} days in a row</strong>!</span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Add Manual Task */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 dark:bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">Add Study Task</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Read Chapter 4 on Dynamic Programming"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Subject</label>
                <select
                  value={newTaskSubject}
                  onChange={(e) => setNewTaskSubject(e.target.value as Subject)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                >
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Duration (mins)</label>
                <select
                  value={newTaskDuration}
                  onChange={(e) => setNewTaskDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value={15}>15 mins</option>
                  <option value={25}>25 mins (Pomodoro)</option>
                  <option value={45}>45 mins</option>
                  <option value={60}>60 mins</option>
                  <option value={90}>90 mins</option>
                </select>
              </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewTaskPriority(p)}
                      className={`py-2 text-xs font-bold rounded-xl border capitalize transition-all cursor-pointer ${
                        newTaskPriority === p
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes / Instructions (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Focus on problem 5 & 8"
                  value={newTaskNotes}
                  onChange={(e) => setNewTaskNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: AI Study Plan Generator */}
      {showAIPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 dark:bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">Generate AI Study Plan</h3>
              </div>
              <button
                onClick={() => setShowAIPlanModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAIScheduleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Exam or Deadline Date</label>
                <input
                  type="date"
                  required
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Daily Study Budget</label>
                <select
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                >
                  <option value={1}>1 hour / day</option>
                  <option value={2}>2 hours / day (Recommended)</option>
                  <option value={3}>3 hours / day</option>
                  <option value={4}>4 hours / day (Intensive Prep)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Included Subjects</label>
                <div className="flex flex-wrap gap-1.5">
                  {SUBJECTS.map(s => {
                    const isSelected = selectedSubjects.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSubjectSelect(s)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Specific Goals & Weak Topics</label>
                <textarea
                  rows={3}
                  value={studyGoals}
                  onChange={(e) => setStudyGoals(e.target.value)}
                  placeholder="e.g. Need more practice on integration by parts, dynamic programming, and biology cellular respiration"
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAIPlanModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  {isLoading ? 'Generating Schedule...' : 'Build Custom Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
