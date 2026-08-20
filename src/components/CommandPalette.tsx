import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Bot, 
  HelpCircle, 
  Sparkles, 
  Calendar, 
  BookOpen, 
  Library, 
  Trophy, 
  Clock, 
  Layers, 
  CheckCircle2, 
  ArrowRight, 
  FileText,
  X,
  Command
} from 'lucide-react';
import { ScreenType, Note, Quiz, FlashcardDeck, StudyTask } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: ScreenType) => void;
  onOpenPomodoro: (subject?: any) => void;
  notes: Note[];
  quizzes: Quiz[];
  decks: FlashcardDeck[];
  tasks: StudyTask[];
  onSelectNote: (note: Note) => void;
  onSelectQuiz: (quiz: Quiz) => void;
  onSelectDeck: (deck: FlashcardDeck) => void;
  onCreateNewNote?: () => void;
}

interface CommandItem {
  id: string;
  category: 'Navigation' | 'Actions' | 'Notes' | 'Quizzes' | 'Flashcards';
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenPomodoro,
  notes,
  quizzes,
  decks,
  tasks,
  onSelectNote,
  onSelectQuiz,
  onSelectDeck,
  onCreateNewNote,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const items: CommandItem[] = [
    // Quick Actions
    {
      id: 'act-focus',
      category: 'Actions',
      title: 'Start 25m Focus Session',
      subtitle: 'Launch Pomodoro timer & block distractions',
      icon: Clock,
      action: () => {
        onOpenPomodoro();
        onClose();
      },
    },
    {
      id: 'act-new-note',
      category: 'Actions',
      title: 'Create New Study Note',
      subtitle: 'Open Markdown editor',
      icon: BookOpen,
      action: () => {
        onNavigate('notes');
        onCreateNewNote?.();
        onClose();
      },
    },
    {
      id: 'act-ask-tutor',
      category: 'Actions',
      title: 'Ask AI Tutor a Question',
      subtitle: 'Get instant explanations & formula breakdown',
      icon: Bot,
      action: () => {
        onNavigate('tutor');
        onClose();
      },
    },

    // Navigation Items
    {
      id: 'nav-dashboard',
      category: 'Navigation',
      title: 'Go to Dashboard',
      subtitle: 'Overview & today’s streak',
      icon: Command,
      action: () => {
        onNavigate('dashboard');
        onClose();
      },
    },
    {
      id: 'nav-tutor',
      category: 'Navigation',
      title: 'Go to AI Study Tutor',
      subtitle: 'Interactive learning & problem solving',
      icon: Bot,
      action: () => {
        onNavigate('tutor');
        onClose();
      },
    },
    {
      id: 'nav-quiz',
      category: 'Navigation',
      title: 'Go to Quiz Generator',
      subtitle: 'Test your retention & earn XP',
      icon: HelpCircle,
      action: () => {
        onNavigate('quiz');
        onClose();
      },
    },
    {
      id: 'nav-summarizer',
      category: 'Navigation',
      title: 'Go to Smart Summarizer',
      subtitle: 'Distill documents, lectures & notes',
      icon: Sparkles,
      action: () => {
        onNavigate('summarizer');
        onClose();
      },
    },
    {
      id: 'nav-planner',
      category: 'Navigation',
      title: 'Go to Study Planner',
      subtitle: 'Schedule study blocks & exams',
      icon: Calendar,
      action: () => {
        onNavigate('planner');
        onClose();
      },
    },
    {
      id: 'nav-notes',
      category: 'Navigation',
      title: 'Go to Notes & Flashcards',
      subtitle: 'Review concepts & decks',
      icon: BookOpen,
      action: () => {
        onNavigate('notes');
        onClose();
      },
    },
    {
      id: 'nav-library',
      category: 'Navigation',
      title: 'Go to Resource Library',
      subtitle: 'All saved materials & exports',
      icon: Library,
      action: () => {
        onNavigate('library');
        onClose();
      },
    },
    {
      id: 'nav-profile',
      category: 'Navigation',
      title: 'Go to Profile & Badges',
      subtitle: 'Achievements, XP & stats',
      icon: Trophy,
      action: () => {
        onNavigate('profile');
        onClose();
      },
    },

    // Notes Matches
    ...notes.map((n) => ({
      id: `note-${n.id}`,
      category: 'Notes' as const,
      title: n.title,
      subtitle: `${n.subject} • ${n.source === 'ai_tutor' ? 'AI Tutor' : n.source === 'smart_summarizer' ? 'Summary' : 'Note'}`,
      icon: FileText,
      action: () => {
        onSelectNote(n);
        onNavigate('notes');
        onClose();
      },
    })),

    // Flashcard Decks
    ...decks.map((d) => ({
      id: `deck-${d.id}`,
      category: 'Flashcards' as const,
      title: d.title,
      subtitle: `${d.subject} • ${d.cards.length} cards`,
      icon: Layers,
      action: () => {
        onSelectDeck(d);
        onNavigate('notes');
        onClose();
      },
    })),

    // Quizzes
    ...quizzes.map((q) => ({
      id: `quiz-${q.id}`,
      category: 'Quizzes' as const,
      title: q.title,
      subtitle: `${q.subject} • ${q.questions.length} questions (${q.difficulty})`,
      icon: HelpCircle,
      action: () => {
        onSelectQuiz(q);
        onNavigate('quiz');
        onClose();
      },
    })),
  ];

  const filtered = items.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < filtered.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
      <div 
        id="modal-command-palette"
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150 transition-colors"
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 gap-3">
          <Search className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, search notes, decks, quizzes..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No matching commands or study materials found for &quot;{query}&quot;.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  id={`cmd-item-${item.id}`}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div className={`text-[11px] truncate ${
                          isSelected ? 'text-indigo-100' : 'text-slate-400 dark:text-slate-400'
                        }`}>
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      {item.category}
                    </span>
                    <ArrowRight className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-300 dark:text-slate-600'}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] text-slate-600 dark:text-slate-300 shadow-2xs">↑↓</kbd> Navigate</span>
            <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] text-slate-600 dark:text-slate-300 shadow-2xs">↵</kbd> Select</span>
            <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] text-slate-600 dark:text-slate-300 shadow-2xs">esc</kbd> Close</span>
          </div>
          <span className="font-semibold text-indigo-600 dark:text-indigo-400">StudyMate Spotlight</span>
        </div>
      </div>
    </div>
  );
};
