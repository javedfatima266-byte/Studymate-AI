import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Layers, 
  Plus, 
  Search, 
  Pin, 
  Trash2, 
  Sparkles, 
  Edit3, 
  Eye, 
  Check, 
  RotateCw, 
  HelpCircle, 
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  X,
  Bot,
  FileText,
  Copy,
  Calendar,
  Tag,
  Clock,
  CheckCircle2,
  ListFilter
} from 'lucide-react';
import { Subject, Note, FlashcardDeck, Flashcard, NavigationOrigin } from '../types';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { StorageService } from '../services/storage';

interface NotesScreenProps {
  notes: Note[];
  flashcardDecks: FlashcardDeck[];
  selectedNote?: Note | null;
  selectedDeck?: FlashcardDeck | null;
  initialActiveTab?: 'notes' | 'flashcards';
  onSaveNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onSaveFlashcardDeck: (deck: FlashcardDeck) => void;
  onDeleteFlashcardDeck?: (deckId: string) => void;
  onImproveNote: (content: string, action: 'expand' | 'simplify' | 'grammar', subject: Subject) => Promise<string | null>;
  onExtractFlashcardsFromNote: (note: Note) => Promise<void>;
  onCreateQuizFromNote: (note: Note) => void;
  isLoading: boolean;
  navigationOrigin?: NavigationOrigin | null;
  onNavigateBack?: () => void;
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

export const NotesScreen: React.FC<NotesScreenProps> = ({
  notes,
  flashcardDecks,
  selectedNote: initialSelectedNote,
  selectedDeck: initialSelectedDeck,
  initialActiveTab = 'notes',
  onSaveNote,
  onDeleteNote,
  onSaveFlashcardDeck,
  onDeleteFlashcardDeck,
  onImproveNote,
  onExtractFlashcardsFromNote,
  onCreateQuizFromNote,
  isLoading,
  navigationOrigin,
  onNavigateBack,
}) => {
  const [activeTab, setActiveTab] = useState<'notes' | 'flashcards'>(initialActiveTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('all');
  
  // Note editing state
  const [currentNote, setCurrentNote] = useState<Note | null>(
    initialSelectedNote || notes[0] || null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [noteTitle, setNoteTitle] = useState(currentNote?.title || '');
  const [noteContent, setNoteContent] = useState(currentNote?.content || '');
  const [noteSubject, setNoteSubject] = useState<Subject>(currentNote?.subject || 'Computer Science');
  const [noteTags, setNoteTags] = useState(currentNote?.tags.join(', ') || '');
  const [isPinned, setIsPinned] = useState(currentNote?.isPinned || false);
  const [copiedNote, setCopiedNote] = useState(false);

  // Flashcards Study State
  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(
    initialSelectedDeck || flashcardDecks[0] || null
  );
  const [cardIndex, setCardIndex] = useState(activeDeck?.currentCardIndex || 0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');

  // Synchronize when initialSelectedNote or initialSelectedDeck changes externally
  useEffect(() => {
    if (initialSelectedNote) {
      selectNote(initialSelectedNote);
      setActiveTab('notes');
    }
  }, [initialSelectedNote?.id]);

  useEffect(() => {
    if (initialSelectedDeck) {
      setActiveDeck(initialSelectedDeck);
      setCardIndex(initialSelectedDeck.currentCardIndex || 0);
      setIsFlipped(false);
      setActiveTab('flashcards');
    }
  }, [initialSelectedDeck?.id]);

  useEffect(() => {
    if (initialActiveTab) {
      setActiveTab(initialActiveTab);
    }
  }, [initialActiveTab]);

  // Keep active deck in sync with updated decks list
  useEffect(() => {
    if (activeDeck) {
      const refreshed = flashcardDecks.find(d => d.id === activeDeck.id);
      if (refreshed) {
        setActiveDeck(refreshed);
      } else if (flashcardDecks.length > 0) {
        setActiveDeck(flashcardDecks[0]);
        setCardIndex(0);
      } else {
        setActiveDeck(null);
      }
    } else if (flashcardDecks.length > 0) {
      setActiveDeck(flashcardDecks[0]);
    }
  }, [flashcardDecks]);

  // Keep current note in sync with updated notes list
  useEffect(() => {
    if (currentNote) {
      const refreshed = notes.find(n => n.id === currentNote.id);
      if (refreshed && !isEditing) {
        setCurrentNote(refreshed);
      } else if (!refreshed && notes.length > 0) {
        selectNote(notes[0]);
      }
    } else if (notes.length > 0) {
      selectNote(notes[0]);
    }
  }, [notes]);

  const selectNote = (note: Note) => {
    setCurrentNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteSubject(note.subject);
    setNoteTags(note.tags.join(', '));
    setIsPinned(note.isPinned || false);
    setIsEditing(false);
  };

  const handleCreateNewNote = () => {
    const newNote: Note = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: 'Untitled Study Note',
      content: '# New Study Topic\n\nWrite your concepts, definitions, formulas, and code here...',
      subject: 'Computer Science',
      tags: ['Study'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPinned: false,
      source: 'manual',
    };
    onSaveNote(newNote);
    selectNote(newNote);
    setIsEditing(true);
  };

  const handleSaveCurrentNote = () => {
    if (!currentNote) return;
    const tagsArray = noteTags.split(',').map(t => t.trim()).filter(Boolean);
    const updated: Note = {
      ...currentNote,
      title: noteTitle.trim() || 'Untitled Note',
      content: noteContent,
      subject: noteSubject,
      tags: tagsArray,
      isPinned,
      updatedAt: new Date().toISOString(),
    };
    onSaveNote(updated);
    setCurrentNote(updated);
    setIsEditing(false);
  };

  const handleSaveAsNewNote = () => {
    if (!currentNote) return;
    const tagsArray = noteTags.split(',').map(t => t.trim()).filter(Boolean);
    const duplicated: Note = {
      ...currentNote,
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: `${noteTitle.trim()} (Copy)`,
      content: noteContent,
      subject: noteSubject,
      tags: tagsArray,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSaveNote(duplicated);
    selectNote(duplicated);
    setIsEditing(false);
  };

  const handleCopyNoteContent = async () => {
    if (!currentNote) return;
    try {
      await navigator.clipboard.writeText(currentNote.content);
      setCopiedNote(true);
      setTimeout(() => setCopiedNote(false), 2000);
    } catch {
      // ignore clipboard write failure
    }
  };

  const handleAIImprove = async (action: 'expand' | 'simplify' | 'grammar') => {
    if (!noteContent) return;
    const improved = await onImproveNote(noteContent, action, noteSubject);
    if (improved) {
      setNoteContent(improved);
      setIsEditing(true);
    }
  };

  // Flashcard Actions
  const handleRateCard = (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!activeDeck || activeDeck.cards.length === 0) return;
    
    const currentCard = activeDeck.cards[cardIndex];
    const newIndex = (cardIndex + 1) % activeDeck.cards.length;
    
    // Update review status in storage
    StorageService.updateFlashcardDeckProgress(activeDeck.id, newIndex, currentCard?.id);
    
    setIsFlipped(false);
    setCardIndex(newIndex);
  };

  const handleRestartDeck = () => {
    if (!activeDeck) return;
    const updatedDeck: FlashcardDeck = {
      ...activeDeck,
      currentCardIndex: 0,
      reviewedCardIds: [],
    };
    onSaveFlashcardDeck(updatedDeck);
    setActiveDeck(updatedDeck);
    setCardIndex(0);
    setIsFlipped(false);
  };

  const handleAddNewCardToDeck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDeck || !newCardFront.trim() || !newCardBack.trim()) return;

    const newCard: Flashcard = {
      id: `fc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      deckId: activeDeck.id,
      front: newCardFront.trim(),
      back: newCardBack.trim(),
      subject: activeDeck.subject,
      repetitions: 0,
      intervalDays: 1,
      reviewed: false,
    };

    const updatedDeck: FlashcardDeck = {
      ...activeDeck,
      cards: [...activeDeck.cards, newCard],
      updatedAt: new Date().toISOString(),
    };

    onSaveFlashcardDeck(updatedDeck);
    setActiveDeck(updatedDeck);
    setNewCardFront('');
    setNewCardBack('');
    setShowAddCardModal(false);
  };

  const handleDeleteActiveDeck = () => {
    if (!activeDeck) return;
    if (confirm(`Are you sure you want to delete the deck "${activeDeck.title}"?`)) {
      if (onDeleteFlashcardDeck) {
        onDeleteFlashcardDeck(activeDeck.id);
      } else {
        StorageService.deleteFlashcardDeck(activeDeck.id);
      }
      const remaining = flashcardDecks.filter(d => d.id !== activeDeck.id);
      setActiveDeck(remaining[0] || null);
      setCardIndex(0);
    }
  };

  const filteredNotes = notes.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSub = selectedSubjectFilter === 'all' || n.subject === selectedSubjectFilter;
    const matchesSource = selectedSourceFilter === 'all' || 
      (selectedSourceFilter === 'ai_tutor' && n.source === 'ai_tutor') ||
      (selectedSourceFilter === 'smart_summarizer' && n.source === 'smart_summarizer') ||
      (selectedSourceFilter === 'manual' && (!n.source || n.source === 'manual'));
    return matchesSearch && matchesSub && matchesSource;
  });

  const getSourceBadge = (source?: string) => {
    if (source === 'ai_tutor') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
          <Bot className="w-3 h-3 text-purple-600" />
          AI Tutor
        </span>
      );
    }
    if (source === 'smart_summarizer') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Sparkles className="w-3 h-3 text-emerald-600" />
          Smart Summary
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        <FileText className="w-3 h-3 text-slate-500 dark:text-slate-400" />
        Note
      </span>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-5 sm:space-y-6 pb-12 transition-colors duration-200">
      {/* Global Navigation Origin Return Bar */}
      {navigationOrigin && onNavigateBack && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white dark:bg-slate-900 border border-purple-200/80 dark:border-purple-900/60 p-3 sm:px-4 sm:py-2.5 rounded-2xl shadow-xs gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <span>Active Study Session Context</span>
          </div>
          <button
            id="btn-notes-back-to-origin"
            type="button"
            onClick={onNavigateBack}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs font-extrabold text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 px-3.5 py-2 sm:py-1.5 rounded-xl border border-purple-200 dark:border-purple-800 transition-colors cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            <span>{navigationOrigin.label}</span>
          </button>
        </div>
      )}

      {/* Top Header & Tab Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">Notes & Flashcard Decks</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Organize lecture notes, review active recall decks, and enhance with AI study tools.
          </p>
        </div>

        <div className="w-full sm:w-auto grid grid-cols-2 sm:flex sm:items-center gap-1.5 sm:gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
          <button
            id="tab-notes"
            onClick={() => setActiveTab('notes')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'notes'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Notes ({notes.length})</span>
          </button>
          <button
            id="tab-flashcards"
            onClick={() => setActiveTab('flashcards')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'flashcards'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Flashcards ({flashcardDecks.length})</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* TAB 1: STUDY NOTES & MARKDOWN EDITOR */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'notes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Note List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <button
                id="btn-create-note"
                onClick={handleCreateNewNote}
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                New Study Note
              </button>
            </div>

            {/* Search, Subject, and Source Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search notes, tags, or prompts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedSubjectFilter}
                  onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200"
                >
                  <option value="all">All Subjects</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <select
                  value={selectedSourceFilter}
                  onChange={(e) => setSelectedSourceFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200"
                >
                  <option value="all">All Sources</option>
                  <option value="ai_tutor">AI Tutor Notes</option>
                  <option value="smart_summarizer">Smart Summaries</option>
                  <option value="manual">Manual Notes</option>
                </select>
              </div>
            </div>

            {/* Note Cards List */}
            <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
              {filteredNotes.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                  No notes match your filters.
                </div>
              ) : (
                filteredNotes.map(note => {
                  const isSelected = currentNote?.id === note.id;
                  return (
                    <div
                      key={note.id}
                      id={`note-card-${note.id}`}
                      onClick={() => selectNote(note)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold">{note.subject}</span>
                          {getSourceBadge(note.source)}
                        </div>
                        {note.isPinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-500" />}
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs line-clamp-1">
                        {note.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                        {note.content.replace(/[#*`_$\|]/g, '')}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                        <span>{new Date(note.createdAt || note.updatedAt).toLocaleDateString()}</span>
                        <div className="flex items-center gap-1">
                          {note.tags.slice(0, 2).map(t => (
                            <span key={t} className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded">
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right 2 Cols: Editor & Preview */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 shadow-xs flex flex-col justify-between space-y-4 min-h-[500px] sm:min-h-[600px] transition-colors">
            {currentNote ? (
              <div className="space-y-4 flex-1">
                {/* Contextual Source Banner if saved from AI Tutor or Smart Summarizer */}
                {currentNote.source === 'ai_tutor' && (
                  <div className="p-3 bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 rounded-xl text-xs flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2 font-bold text-purple-900 dark:text-purple-200">
                          <span>AI Tutor Explanation</span>
                          {currentNote.sourceDetails?.persona && (
                            <span className="text-[10px] bg-purple-200/60 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 px-1.5 py-0.2 rounded font-normal">
                              Persona: {currentNote.sourceDetails.persona}
                            </span>
                          )}
                        </div>
                        {currentNote.sourceDetails?.userPrompt && (
                          <p className="text-purple-700 dark:text-purple-300 text-[11px] mt-0.5 italic">
                            &quot;{currentNote.sourceDetails.userPrompt}&quot;
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-purple-500 dark:text-purple-400 whitespace-nowrap">
                      Saved {new Date(currentNote.createdAt || currentNote.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {currentNote.source === 'smart_summarizer' && (
                  <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-200">
                          <span>Smart Summarizer Output</span>
                          {currentNote.sourceDetails?.summaryType && (
                            <span className="text-[10px] bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.2 rounded font-normal">
                              Format: {currentNote.sourceDetails.summaryType}
                            </span>
                          )}
                        </div>
                        {currentNote.sourceDetails?.originalDocumentName && (
                          <p className="text-emerald-700 dark:text-emerald-300 text-[11px] mt-0.5">
                            Source Document: <span className="font-semibold">{currentNote.sourceDetails.originalDocumentName}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-500 dark:text-emerald-400 whitespace-nowrap">
                      Saved {new Date(currentNote.createdAt || currentNote.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {/* Note Action Toolbar */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      id="btn-toggle-edit"
                      onClick={() => setIsEditing(!isEditing)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                        isEditing
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {isEditing ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                      <span>{isEditing ? 'Preview' : 'Edit Note'}</span>
                    </button>

                    <button
                      id="btn-pin-note"
                      onClick={() => setIsPinned(!isPinned)}
                      className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                        isPinned 
                          ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' 
                          : 'text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                      title={isPinned ? 'Unpin' : 'Pin Note'}
                    >
                      <Pin className="w-3.5 h-3.5 fill-current" />
                    </button>

                    <button
                      id="btn-copy-note"
                      onClick={handleCopyNoteContent}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs cursor-pointer"
                      title="Copy Note Text"
                    >
                      {copiedNote ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* AI Quick Enhancers & Converters */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      id="btn-ai-expand"
                      onClick={() => handleAIImprove('expand')}
                      disabled={isLoading}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Add in-depth context & formulas"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                      Expand
                    </button>
                    <button
                      id="btn-ai-simplify"
                      onClick={() => handleAIImprove('simplify')}
                      disabled={isLoading}
                      className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Simplify with analogies"
                    >
                      <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                      Simplify
                    </button>
                    <button
                      id="btn-note-to-flashcards"
                      onClick={() => onExtractFlashcardsFromNote(currentNote)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Layers className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span className="hidden sm:inline">Make</span> Flashcards
                    </button>
                    <button
                      id="btn-note-to-quiz"
                      onClick={() => onCreateQuizFromNote(currentNote)}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <HelpCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      <span className="hidden sm:inline">Make</span> Quiz
                    </button>
                  </div>
                </div>

                {/* Editable Title & Metadata */}
                {isEditing ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      placeholder="Note Title..."
                      className="w-full text-xl font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2 bg-transparent focus:outline-hidden"
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase">Subject</label>
                        <select
                          value={noteSubject}
                          onChange={(e) => setNoteSubject(e.target.value as Subject)}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
                        >
                          {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase">Tags (comma separated)</label>
                        <input
                          type="text"
                          value={noteTags}
                          onChange={(e) => setNoteTags(e.target.value)}
                          placeholder="Algorithms, Midterm..."
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-medium placeholder-slate-400"
                        />
                      </div>
                    </div>

                    <textarea
                      rows={14}
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Write your note in Markdown format..."
                      className="w-full p-4 font-mono text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                            {currentNote.subject}
                          </span>
                          {getSourceBadge(currentNote.source)}
                        </div>
                        <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1.5">
                          {currentNote.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap">
                          <span>Created {new Date(currentNote.createdAt || currentNote.updatedAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>Updated {new Date(currentNote.updatedAt).toLocaleDateString()}</span>
                          {currentNote.tags.length > 0 && (
                            <>
                              <span>•</span>
                              <span>{currentNote.tags.join(', ')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-5 bg-slate-50/70 dark:bg-slate-800/50 rounded-xl border border-slate-200/50 dark:border-slate-800 max-h-[460px] overflow-y-auto">
                      <MarkdownRenderer content={currentNote.content} />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-24 text-center text-slate-400">
                Select or create a study note to view and edit.
              </div>
            )}

            {/* Bottom Save, Duplicate & Delete Actions */}
            {currentNote && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <button
                  id="btn-delete-note"
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete "${currentNote.title}"?`)) {
                      onDeleteNote(currentNote.id);
                    }
                  }}
                  className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Note</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    id="btn-duplicate-note"
                    onClick={handleSaveAsNewNote}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Save as New Note</span>
                  </button>

                  {isEditing && (
                    <button
                      id="btn-save-note"
                      onClick={handleSaveCurrentNote}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 2: FLASHCARDS INTERACTIVE STUDY */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'flashcards' && (
        <div className="space-y-6">
          {/* Deck Selector Strip */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {flashcardDecks.map(deck => {
              const isSelected = activeDeck?.id === deck.id;
              const reviewedCount = (deck.reviewedCardIds || []).length;
              return (
                <button
                  key={deck.id}
                  id={`btn-deck-${deck.id}`}
                  onClick={() => {
                    setActiveDeck(deck);
                    setCardIndex(deck.currentCardIndex || 0);
                    setIsFlipped(false);
                  }}
                  className={`p-3.5 rounded-xl border text-left min-w-[240px] max-w-[280px] transition-all cursor-pointer ${
                    isSelected
                      ? 'border-purple-600 dark:border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-0.5">
                    <span>{deck.subject}</span>
                    {deck.source === 'smart_summarizer' && (
                      <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded">Summary</span>
                    )}
                    {deck.source === 'note_extracted' && (
                      <span className="text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded">From Note</span>
                    )}
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">
                    {deck.title}
                  </h4>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                    <span>{deck.cards.length} Cards</span>
                    {reviewedCount > 0 && (
                      <span className="text-purple-700 dark:text-purple-300 font-semibold">{reviewedCount}/{deck.cards.length} Reviewed</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {activeDeck && activeDeck.cards.length > 0 ? (
            <div className="max-w-xl mx-auto space-y-6">
              {/* Deck Info & Actions Header */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-900 dark:text-slate-100 font-extrabold text-sm">{activeDeck.title}</span>
                  <span className="text-purple-600 dark:text-purple-400 font-bold">({cardIndex + 1} / {activeDeck.cards.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    id="btn-restart-deck"
                    onClick={handleRestartDeck}
                    className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer font-semibold"
                    title="Reset progress to card 1"
                  >
                    <RotateCw className="w-3.5 h-3.5" /> Restart
                  </button>
                  <button
                    id="btn-add-card-to-deck"
                    onClick={() => setShowAddCardModal(true)}
                    className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Card
                  </button>
                  <button
                    id="btn-delete-deck"
                    onClick={handleDeleteActiveDeck}
                    className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1 cursor-pointer"
                    title="Delete Deck"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-purple-600 dark:bg-purple-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${((cardIndex + 1) / activeDeck.cards.length) * 100}%` }}
                />
              </div>

              {/* Interactive Flashcard with Flip Animation */}
              <div
                id="interactive-flashcard"
                onClick={() => setIsFlipped(!isFlipped)}
                className={`relative min-h-[300px] w-full rounded-2xl bg-white dark:bg-slate-900 border-2 shadow-md p-6 flex flex-col justify-between cursor-pointer transition-all text-center select-none ${
                  isFlipped 
                    ? 'border-purple-500 bg-purple-50/20 dark:bg-purple-950/30' 
                    : 'border-purple-200 dark:border-purple-900/60 hover:border-purple-400 dark:hover:border-purple-500'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500">
                  <span className="uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    {isFlipped ? 'Answer (Recall Check)' : 'Question (Click to flip)'}
                  </span>
                  <RotateCw className={`w-3.5 h-3.5 transition-transform ${isFlipped ? 'rotate-180 text-purple-600 dark:text-purple-400' : ''}`} />
                </div>

                <div className="my-auto py-6">
                  <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">
                    {isFlipped ? activeDeck.cards[cardIndex]?.back : activeDeck.cards[cardIndex]?.front}
                  </p>
                </div>

                <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  {isFlipped ? 'Rate your recall to advance' : 'Tap card to reveal answer'}
                </div>
              </div>

              {/* Spaced Repetition Rating Buttons */}
              {isFlipped && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                  <button
                    id="btn-rate-again"
                    onClick={() => handleRateCard('again')}
                    className="py-2.5 px-2 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 font-bold text-xs transition-colors cursor-pointer border border-red-200 dark:border-red-800 active:scale-95 text-center"
                  >
                    Again (1d)
                  </button>
                  <button
                    id="btn-rate-hard"
                    onClick={() => handleRateCard('hard')}
                    className="py-2.5 px-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 font-bold text-xs transition-colors cursor-pointer border border-amber-200 dark:border-amber-800 active:scale-95 text-center"
                  >
                    Hard (2d)
                  </button>
                  <button
                    id="btn-rate-good"
                    onClick={() => handleRateCard('good')}
                    className="py-2.5 px-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 font-bold text-xs transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800 active:scale-95 text-center"
                  >
                    Good (4d)
                  </button>
                  <button
                    id="btn-rate-easy"
                    onClick={() => handleRateCard('easy')}
                    className="py-2.5 px-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-bold text-xs transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-800 active:scale-95 text-center"
                  >
                    Easy (7d)
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-20 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
              <Layers className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm">No flashcard decks found</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Generate flashcards from your study notes or create an active recall deck from the Smart Summarizer!
              </p>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Add Card to Deck */}
      {showAddCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">Add Flashcard</h3>
              <button
                onClick={() => setShowAddCardModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewCardToDeck} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Front (Question or Term)</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. What is the difference between RAM and ROM?"
                  value={newCardFront}
                  onChange={(e) => setNewCardFront(e.target.value)}
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Back (Answer or Definition)</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. RAM is volatile read/write memory; ROM is non-volatile read-only memory."
                  value={newCardBack}
                  onChange={(e) => setNewCardBack(e.target.value)}
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCardModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Add Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
