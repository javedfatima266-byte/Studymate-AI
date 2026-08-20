import React, { useState } from 'react';
import { 
  Library, 
  Search, 
  HelpCircle, 
  Layers, 
  BookOpen, 
  Download, 
  Trash2, 
  ChevronRight, 
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  Bot,
  FileText,
  Calendar,
  Layers3
} from 'lucide-react';
import { Subject, Quiz, FlashcardDeck, Note, ScreenType } from '../types';

interface LibraryScreenProps {
  quizzes: Quiz[];
  decks: FlashcardDeck[];
  notes: Note[];
  onSelectQuiz: (quiz: Quiz) => void;
  onSelectDeck: (deck: FlashcardDeck) => void;
  onSelectNote: (note: Note) => void;
  onDeleteNote?: (noteId: string) => void;
  onDeleteDeck?: (deckId: string) => void;
  onDeleteQuiz?: (quizId: string) => void;
  onNavigate: (screen: ScreenType) => void;
  onExportAllData: () => void;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({
  quizzes,
  decks,
  notes,
  onSelectQuiz,
  onSelectDeck,
  onSelectNote,
  onDeleteNote,
  onDeleteDeck,
  onDeleteQuiz,
  onNavigate,
  onExportAllData,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'quizzes' | 'decks' | 'notes'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredQuizzes = quizzes.filter(q => {
    const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      q.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSub = subjectFilter === 'all' || q.subject === subjectFilter;
    return matchesSearch && matchesSub;
  });

  const filteredDecks = decks.filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      d.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSub = subjectFilter === 'all' || d.subject === subjectFilter;
    const matchesSource = sourceFilter === 'all' ||
      (sourceFilter === 'ai_tutor' && d.source === 'ai_tutor') ||
      (sourceFilter === 'smart_summarizer' && d.source === 'smart_summarizer') ||
      (sourceFilter === 'manual' && (!d.source || d.source === 'manual' || d.source === 'note_extracted'));
    return matchesSearch && matchesSub && matchesSource;
  });

  const filteredNotes = notes.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
      n.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.sourceDetails?.userPrompt && n.sourceDetails.userPrompt.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSub = subjectFilter === 'all' || n.subject === subjectFilter;
    const matchesSource = sourceFilter === 'all' ||
      (sourceFilter === 'ai_tutor' && n.source === 'ai_tutor') ||
      (sourceFilter === 'smart_summarizer' && n.source === 'smart_summarizer') ||
      (sourceFilter === 'manual' && (!n.source || n.source === 'manual'));
    return matchesSearch && matchesSub && matchesSource;
  });

  const totalItems = quizzes.length + decks.length + notes.length;

  const getSourceBadge = (source?: string) => {
    if (source === 'ai_tutor') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
          <Bot className="w-3 h-3 text-purple-600 dark:text-purple-400" />
          AI Tutor
        </span>
      );
    }
    if (source === 'smart_summarizer') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          Smart Summary
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        <FileText className="w-3 h-3 text-slate-500 dark:text-slate-400" />
        Manual Note
      </span>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 sm:space-y-8 pb-12 transition-colors duration-200">
      {/* Header Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-950 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-indigo-900/30">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-indigo-200 mb-2">
            <Library className="w-3.5 h-3.5 text-indigo-400" />
            <span>StudyMate Knowledge Repository</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold">Resource Library</h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
            Access, review, and organize all your saved notes from AI Tutor and Smart Summarizer, practice quizzes, and active recall flashcard decks in one central hub.
          </p>
        </div>

        <button
          id="btn-export-library"
          onClick={onExportAllData}
          className="w-full sm:w-auto px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs border border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 active:scale-95"
        >
          <Download className="w-4 h-4 text-indigo-300" />
          <span>Export Backup (JSON)</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs space-y-3 transition-colors">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search across notes, quizzes, decks, prompts, or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Subject Filter */}
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="w-full sm:w-44 px-3.5 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200"
          >
            <option value="all">All Subjects</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Physics">Physics</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Biology">Biology</option>
            <option value="History">History</option>
            <option value="Literature">Literature</option>
            <option value="General">General</option>
          </select>

          {/* Origin Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full sm:w-44 px-3.5 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200"
          >
            <option value="all">All Sources</option>
            <option value="ai_tutor">From AI Tutor</option>
            <option value="smart_summarizer">From Summarizer</option>
            <option value="manual">Manual / Extracted</option>
          </select>
        </div>

        {/* Content Type Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-slate-900 dark:bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Materials ({totalItems})
          </button>
          <button
            onClick={() => setActiveFilter('notes')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'notes'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Study Notes ({filteredNotes.length})
          </button>
          <button
            onClick={() => setActiveFilter('decks')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'decks'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Flashcard Decks ({filteredDecks.length})
          </button>
          <button
            onClick={() => setActiveFilter('quizzes')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'quizzes'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Quizzes ({filteredQuizzes.length})
          </button>
        </div>
      </div>

      {/* Grid of Materials */}
      <div className="space-y-8">
        {/* Section 1: Notes & Summaries */}
        {(activeFilter === 'all' || activeFilter === 'notes') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Study Notes & Summaries ({filteredNotes.length})
              </h3>
              <button
                onClick={() => onNavigate('notes')}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
              >
                + New Note
              </button>
            </div>

            {filteredNotes.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                No study notes match your filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredNotes.map(note => (
                  <div
                    key={note.id}
                    id={`lib-note-${note.id}`}
                    onClick={() => {
                      onSelectNote(note);
                    }}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group relative"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                          {note.subject}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {getSourceBadge(note.source)}
                          {onDeleteNote && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete note "${note.title}"?`)) {
                                  onDeleteNote(note.id);
                                }
                              }}
                              className="p-1 text-slate-300 dark:text-slate-600 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
                              title="Delete Note"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                        {note.title}
                      </h4>
                      {note.sourceDetails?.userPrompt && (
                        <p className="text-[11px] text-purple-700/90 dark:text-purple-300/90 italic line-clamp-1 mt-1">
                          Q: &quot;{note.sourceDetails.userPrompt}&quot;
                        </p>
                      )}
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">
                        {note.content.replace(/[#*`_$\|]/g, '')}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400 dark:text-slate-500">
                        {new Date(note.createdAt || note.updatedAt).toLocaleDateString()}
                      </span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
                        Open Note <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Section 2: Flashcards */}
        {(activeFilter === 'all' || activeFilter === 'decks') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Flashcard Decks ({filteredDecks.length})
              </h3>
              <button
                onClick={() => onNavigate('notes')}
                className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300"
              >
                + Manage Decks
              </button>
            </div>

            {filteredDecks.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                No flashcard decks match your filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDecks.map(deck => {
                  const reviewedCount = (deck.reviewedCardIds || []).length;
                  return (
                    <div
                      key={deck.id}
                      id={`lib-deck-${deck.id}`}
                      onClick={() => {
                        onSelectDeck(deck);
                      }}
                      className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400">
                            {deck.subject}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {deck.source === 'smart_summarizer' && (
                              <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded">Summary</span>
                            )}
                            {deck.source === 'note_extracted' && (
                              <span className="text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded">Note Extracted</span>
                            )}
                            {onDeleteDeck && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Delete deck "${deck.title}"?`)) {
                                    onDeleteDeck(deck.id);
                                  }
                                }}
                                className="p-1 text-slate-300 dark:text-slate-600 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
                                title="Delete Deck"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-2">
                          {deck.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {deck.description || `${deck.cards.length} active recall cards`}
                        </p>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">
                          {deck.cards.length} Cards {reviewedCount > 0 && `• ${reviewedCount} reviewed`}
                        </span>
                        <span className="text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1">
                          Study Deck <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Section 3: Quizzes */}
        {(activeFilter === 'all' || activeFilter === 'quizzes') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Practice Quizzes ({filteredQuizzes.length})
              </h3>
              <button
                onClick={() => onNavigate('quiz')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300"
              >
                + New Quiz
              </button>
            </div>

            {filteredQuizzes.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                No practice quizzes match your filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredQuizzes.map(quiz => (
                  <div
                    key={quiz.id}
                    id={`lib-quiz-${quiz.id}`}
                    onClick={() => {
                      onSelectQuiz(quiz);
                    }}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400 dark:text-slate-500 mb-1.5">
                        <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">{quiz.subject}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px]">
                            {quiz.difficulty}
                          </span>
                          {onDeleteQuiz && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete quiz "${quiz.title}"?`)) {
                                  onDeleteQuiz(quiz.id);
                                }
                              }}
                              className="p-1 text-slate-300 dark:text-slate-600 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
                              title="Delete Quiz"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                        {quiz.title}
                      </h4>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">{quiz.questions.length} Questions</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        {quiz.lastScore !== undefined ? `Score: ${quiz.lastScore}%` : 'Take Quiz'}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
