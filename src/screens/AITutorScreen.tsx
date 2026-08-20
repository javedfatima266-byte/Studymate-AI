import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Paperclip, 
  Trash2, 
  BookMarked, 
  HelpCircle, 
  User, 
  Brain,
  GraduationCap,
  Lightbulb,
  Code2,
  Check,
  ChevronDown,
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  FileText,
  X,
  Loader2,
  AlertCircle,
  Maximize2
} from 'lucide-react';
import { Subject, TutorPersona, TutorMessage, Note, NavigationOrigin, TutorAttachment } from '../types';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { StorageService } from '../services/storage';
import { CameraCaptureModal } from '../components/CameraCaptureModal';
import { MicrophonePermissionModal } from '../components/MicrophonePermissionModal';
import { PermissionService } from '../services/permissionService';

interface AITutorScreenProps {
  messages: TutorMessage[];
  onSendMessage: (text: string, subject: Subject, persona: TutorPersona, contextText?: string, attachment?: TutorAttachment) => Promise<void>;
  onClearChat: () => void;
  onSaveToNotes: (title: string, content: string, subject: Subject, source?: string, sourceDetails?: any) => void;
  onGenerateQuizFromChat: (topic: string, subject: Subject, contextText: string) => void;
  availableNotes: Note[];
  isLoading: boolean;
  navigationOrigin?: NavigationOrigin | null;
  onNavigateBack?: () => void;
}

const PERSONAS: { id: TutorPersona; name: string; icon: React.ElementType; desc: string }[] = [
  { id: 'socratic', name: 'Socratic Mentor', icon: Brain, desc: 'Guides you with questions & hints' },
  { id: 'exam_coach', name: 'Exam Coach', icon: GraduationCap, desc: 'High-yield test tips & memory hacks' },
  { id: 'simplifier', name: 'Feynman Simplifier', icon: Lightbulb, desc: 'Simple analogies & clear language' },
  { id: 'code_math', name: 'STEM & Code Solver', icon: Code2, desc: 'Step-by-step formulas & syntax' },
];

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

export const AITutorScreen: React.FC<AITutorScreenProps> = ({
  messages,
  onSendMessage,
  onClearChat,
  onSaveToNotes,
  onGenerateQuizFromChat,
  availableNotes,
  isLoading,
  navigationOrigin,
  onNavigateBack,
}) => {
  const savedTutorState = StorageService.getTutorSessionState();

  const [inputText, setInputText] = useState(savedTutorState.draftInput || '');
  const [selectedSubject, setSelectedSubject] = useState<Subject>(savedTutorState.selectedSubject || 'Computer Science');
  const [selectedPersona, setSelectedPersona] = useState<TutorPersona>(savedTutorState.selectedPersona || 'socratic');
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [attachedNoteId, setAttachedNoteId] = useState<string | null>(savedTutorState.attachedNoteId || null);
  const [savedNoteMsgId, setSavedNoteMsgId] = useState<string | null>(null);
  
  // Attachment menu and pending attachment states
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<TutorAttachment & { isParsing?: boolean } | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  
  // Camera and Microphone permission modals state
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isMicModalOpen, setIsMicModalOpen] = useState(false);
  const [micModalError, setMicModalError] = useState<string | null>(null);

  // Hidden File input references for attachments
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const inputTextAreaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state to storage
  useEffect(() => {
    StorageService.saveTutorSessionState({
      selectedSubject,
      selectedPersona,
      attachedNoteId,
      draftInput: inputText,
    });
  }, [selectedSubject, selectedPersona, attachedNoteId, inputText]);

  // Click outside to close attachment menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    if (showAttachMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAttachMenu]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Voice speech-to-text setup
  const toggleListening = () => {
    setSpeechError(null);
    setMicModalError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or type your question.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore error on stopping
        }
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
        setMicModalError(null);
        setIsMicModalOpen(false);
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPiece;
          } else {
            interimTranscript += transcriptPiece;
          }
        }

        const recognized = (finalTranscript || interimTranscript).trim();
        if (recognized) {
          setInputText(prev => {
            if (!prev) return recognized;
            // Avoid duplicate words if interim
            if (prev.endsWith(recognized)) return prev;
            return `${prev} ${recognized}`;
          });
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[SpeechRecognition] error:', event.error);
        if (event.error === 'not-allowed') {
          const errMsg = 'Microphone permission was denied. Please allow microphone access in your browser settings to use voice input.';
          setSpeechError(errMsg);
          setMicModalError(errMsg);
          setIsMicModalOpen(true);
        } else if (event.error === 'no-speech') {
          // Benign timeout when student pauses
        } else {
          setSpeechError(`Speech recognition notice: ${event.error || 'Network or audio error'}.`);
          setTimeout(() => setSpeechError(null), 5000);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to initialize SpeechRecognition:', err);
      setIsListening(false);
      const errMsg = 'Could not start voice recognition. Please verify microphone permissions.';
      setSpeechError(errMsg);
      setMicModalError(errMsg);
      setIsMicModalOpen(true);
    }
  };

  // Text-to-speech
  const handleSpeakText = (msgId: string, text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#`_$\->]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Attachment File Handlers
  const handleImageSelected = (file: File) => {
    if (!file) return;
    setShowAttachMenu(false);

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      setPendingAttachment({
        type: 'image',
        name: file.name || 'study_photo.jpg',
        url: base64Data,
        data: base64Data,
        mimeType: file.type || 'image/jpeg',
        size: file.size,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDocumentSelected = async (file: File) => {
    if (!file) return;
    setShowAttachMenu(false);

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    
    // Create initial pending attachment with parsing state
    setPendingAttachment({
      type: 'file',
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      isParsing: true,
    });

    if (ext === 'txt' || ext === 'md' || ext === 'text') {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        setPendingAttachment({
          type: 'file',
          name: file.name,
          mimeType: file.type || 'text/plain',
          size: file.size,
          extractedText: text,
          isParsing: false,
        });
      };
      reader.onerror = () => {
        setPendingAttachment(prev => prev ? { ...prev, isParsing: false } : null);
      };
      reader.readAsText(file);
    } else {
      // PDF or DOCX - parse via server API
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Full = reader.result as string;
        const base64Data = base64Full.includes(',') ? base64Full.split(',')[1] : base64Full;

        try {
          const res = await fetch('/api/parse-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              fileType: ext,
              base64Data,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            setPendingAttachment({
              type: 'file',
              name: file.name,
              mimeType: file.type || 'application/pdf',
              size: file.size,
              extractedText: data.text || '',
              isParsing: false,
            });
          } else {
            // Keep attachment metadata even if parsing returned a warning
            setPendingAttachment({
              type: 'file',
              name: file.name,
              mimeType: file.type || 'application/octet-stream',
              size: file.size,
              isParsing: false,
            });
          }
        } catch {
          setPendingAttachment(prev => prev ? { ...prev, isParsing: false } : null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = (overrideText?: string) => {
    const textToSend = overrideText || inputText;
    const hasAttachment = Boolean(pendingAttachment);
    
    if ((!textToSend.trim() && !hasAttachment) || isLoading) return;

    let contextContent = '';
    if (attachedNoteId) {
      const note = availableNotes.find(n => n.id === attachedNoteId);
      if (note) {
        contextContent = `[Attached Note Context - Title: ${note.title}]\n${note.content}`;
      }
    }

    const currentAttach = pendingAttachment ? { ...pendingAttachment } : undefined;
    if (currentAttach) {
      delete (currentAttach as any).isParsing;
    }

    onSendMessage(
      textToSend.trim(), 
      selectedSubject, 
      selectedPersona, 
      contextContent || undefined,
      currentAttach
    );

    if (!overrideText) {
      setInputText('');
    }
    setPendingAttachment(null);
  };

  const handleSaveMessageAsNote = (msg: TutorMessage) => {
    const msgIndex = messages.findIndex(m => m.id === msg.id);
    let userQuestion = '';
    if (msgIndex >= 0) {
      for (let i = msgIndex - 1; i >= 0; i--) {
        if (messages[i].sender === 'user') {
          userQuestion = messages[i].text;
          break;
        }
      }
    }

    let derivedTopic = '';
    if (userQuestion) {
      const cleanQ = userQuestion
        .replace(/^(can you |could you |please |hey |hi |study ?mate,? )/i, '')
        .replace(/^(what is the difference between|difference between|compare)\s+/i, '')
        .replace(/^(what is|what are|explain|describe|tell me about|how does|how do|why is|why are|how to understand|help me with|quiz me on)\s+/i, '')
        .replace(/(\?|!|\.|:)+$/g, '')
        .trim();
      if (cleanQ.length >= 2 && cleanQ.length <= 50) {
        derivedTopic = cleanQ.replace(/\b\w/g, char => char.toUpperCase());
      }
    }

    if (!derivedTopic) {
      const headingMatch = msg.text.match(/^#{1,3}\s+(.+)$/m);
      if (headingMatch && headingMatch[1]) {
        derivedTopic = headingMatch[1]
          .replace(/[:\-].*$/, '')
          .replace(/^(Comprehensive Comparison|Deep Dive|Understanding|Introduction to|Guide to|Mastering)\s+/i, '')
          .trim();
      }
    }

    const noteSubject = msg.subject || selectedSubject;
    const title = derivedTopic ? `${derivedTopic} (AI Tutor)` : `AI Tutor: ${noteSubject} Notes`;

    onSaveToNotes(title, msg.text, noteSubject, 'ai_tutor', {
      userPrompt: userQuestion || undefined,
      persona: msg.persona || selectedPersona,
      topic: derivedTopic || noteSubject,
    });
    setSavedNoteMsgId(msg.id);
    setTimeout(() => setSavedNoteMsgId(null), 3000);
  };

  const handleGenerateQuizFromMessage = (msg: TutorMessage) => {
    const msgIndex = messages.findIndex(m => m.id === msg.id);
    let userQuestion = '';
    if (msgIndex >= 0) {
      for (let i = msgIndex - 1; i >= 0; i--) {
        if (messages[i].sender === 'user') {
          userQuestion = messages[i].text;
          break;
        }
      }
    }

    let derivedTopic = '';
    if (userQuestion) {
      const cleanQ = userQuestion
        .replace(/^(can you |could you |please |hey |hi |study ?mate,? )/i, '')
        .replace(/^(what is the difference between|difference between|compare)\s+/i, '')
        .replace(/^(what is|what are|explain|describe|tell me about|how does|how do|why is|why are|how to understand|help me with|quiz me on)\s+/i, '')
        .replace(/(\?|!|\.|:)+$/g, '')
        .trim();

      if (cleanQ.length >= 2 && cleanQ.length <= 50) {
        derivedTopic = cleanQ.replace(/\b\w/g, char => char.toUpperCase());
      }
    }

    if (!derivedTopic) {
      const headingMatch = msg.text.match(/^#{1,3}\s+(.+)$/m);
      if (headingMatch && headingMatch[1]) {
        derivedTopic = headingMatch[1]
          .replace(/[:\-].*$/, '')
          .replace(/^(Comprehensive Comparison|Deep Dive|Understanding|Introduction to|Guide to|Mastering)\s+/i, '')
          .trim();
      }
    }

    if (!derivedTopic) {
      derivedTopic = `${selectedSubject} Core Concepts`;
    }

    onGenerateQuizFromChat(derivedTopic, selectedSubject, msg.text);
  };

  const attachedNote = availableNotes.find(n => n.id === attachedNoteId);

  return (
    <div className="flex flex-col h-[calc(100dvh-7.5rem)] sm:h-[calc(100vh-8.5rem)] max-w-5xl mx-auto bg-white dark:bg-[#0f172a] rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-colors w-full min-w-0">
      
      {/* Hidden File Inputs for Attachment Menu */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleImageSelected(e.target.files[0]);
          }
          e.target.value = '';
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp, image/gif"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleImageSelected(e.target.files[0]);
          }
          e.target.value = '';
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf, .docx, .txt, .md, text/plain, application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleDocumentSelected(e.target.files[0]);
          }
          e.target.value = '';
        }}
      />

      {/* Global Navigation Origin Return Banner */}
      {navigationOrigin && onNavigateBack && (
        <div className="px-3 sm:px-4 py-2 bg-indigo-50 dark:bg-indigo-950/60 border-b border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between text-xs font-semibold text-indigo-900 dark:text-indigo-200 shrink-0 gap-2">
          <div className="flex items-center gap-2 truncate">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="truncate text-[11px] sm:text-xs">
              {navigationOrigin.substate?.topic ? `Context: ${navigationOrigin.substate.topic}` : 'Active Study Session Context'}
            </span>
          </div>
          <button
            id="btn-tutor-back-to-origin"
            type="button"
            onClick={onNavigateBack}
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-100 bg-white dark:bg-slate-800 hover:bg-indigo-100/60 dark:hover:bg-slate-700 px-2.5 sm:px-3 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="truncate max-w-[120px] sm:max-w-none">{navigationOrigin.label}</span>
          </button>
        </div>
      )}

      {/* Top Configuration Toolbar */}
      <div className="px-3 sm:px-6 py-2.5 sm:py-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2 sm:gap-3 shrink-0">
        {/* Left: Persona Selector */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 max-w-full">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:inline">Persona:</span>
          {PERSONAS.map(p => {
            const Icon = p.icon;
            const isSelected = selectedPersona === p.id;
            return (
              <button
                key={p.id}
                id={`btn-persona-${p.id}`}
                onClick={() => setSelectedPersona(p.id)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title={p.desc}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{p.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Subject Dropdown & Clear Chat */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <select
            id="select-tutor-subject"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value as Subject)}
            className="px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 max-w-[140px] sm:max-w-none truncate"
          >
            {SUBJECTS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <button
            id="btn-clear-chat"
            onClick={onClearChat}
            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
            title="Clear conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Chat Message Feed */}
      <div className="flex-1 p-3 sm:p-6 overflow-y-auto space-y-3.5 sm:space-y-4 bg-slate-50/50 dark:bg-[#090d16]">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              id={`tutor-msg-${msg.id}`}
              className={`flex items-start gap-2.5 sm:gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar Icon */}
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                isUser ? 'bg-slate-900 dark:bg-indigo-600 text-white' : 'bg-indigo-600 dark:bg-indigo-500 text-white'
              }`}>
                {isUser ? <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </div>

              {/* Message Bubble Container */}
              <div className={`max-w-[90%] sm:max-w-[75%] rounded-2xl p-3 sm:p-4 shadow-xs ${
                isUser
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white rounded-tr-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800 rounded-tl-xs'
              }`}>
                
                {/* User Attachment Display */}
                {isUser && msg.attachment && (
                  <div className="mb-2.5">
                    {msg.attachment.type === 'image' && msg.attachment.url ? (
                      <div className="relative group rounded-xl overflow-hidden border border-white/20 max-w-xs cursor-pointer" onClick={() => setPreviewImageUrl(msg.attachment?.url || null)}>
                        <img 
                          src={msg.attachment.url} 
                          alt={msg.attachment.name || 'Attached image'} 
                          className="w-full h-auto max-h-48 object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>View Full</span>
                        </div>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 dark:bg-black/20 rounded-xl border border-white/15 text-xs text-white">
                        <FileText className="w-4 h-4 shrink-0 text-indigo-200" />
                        <span className="font-semibold truncate max-w-[180px]">{msg.attachment.name}</span>
                        {msg.attachment.size && (
                          <span className="text-[10px] opacity-75">
                            ({(msg.attachment.size / 1024).toFixed(0)} KB)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {isUser ? (
                  <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium">{msg.text}</p>
                ) : (
                  <>
                    <MarkdownRenderer content={msg.text} />

                    {/* Action Bar for AI Responses */}
                    <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 sm:mt-4 sm:pt-3 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                      <div className="flex items-center gap-1">
                        <button
                          id={`btn-tts-${msg.id}`}
                          onClick={() => handleSpeakText(msg.id, msg.text)}
                          className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                            speakingMsgId === msg.id
                              ? 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          title="Read aloud"
                        >
                          {speakingMsgId === msg.id ? (
                            <>
                              <VolumeX className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                              <span className="text-[11px]">Stop</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Listen</span>
                            </>
                          )}
                        </button>

                        <button
                          id={`btn-save-note-${msg.id}`}
                          onClick={() => handleSaveMessageAsNote(msg)}
                          className="p-1.5 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
                          title="Save as Study Note"
                        >
                          {savedNoteMsgId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">Saved!</span>
                            </>
                          ) : (
                            <>
                              <BookMarked className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Save Note</span>
                            </>
                          )}
                        </button>
                      </div>

                      <button
                        id={`btn-quiz-from-${msg.id}`}
                        onClick={() => handleGenerateQuizFromMessage(msg)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer border border-indigo-200/60 dark:border-indigo-800/60"
                      >
                        <HelpCircle className="w-3 h-3" />
                        <span>Quiz Me On This</span>
                      </button>
                    </div>

                    {/* AI Follow-up Suggestion Chips */}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                          Follow-up Questions:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.suggestions.map((sug, sIdx) => (
                            <button
                              key={sIdx}
                              id={`btn-sug-${msg.id}-${sIdx}`}
                              onClick={() => handleSend(sug)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/70 hover:text-indigo-700 dark:hover:text-indigo-300 text-slate-700 dark:text-slate-200 text-xs transition-colors text-left cursor-pointer border border-slate-200/60 dark:border-slate-700"
                            >
                              💬 {sug}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Spinner / Skeleton */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl rounded-tl-xs p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.4s]" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-2">StudyMate AI is thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice Recognition Live Notice / Status Banner */}
      {isListening && (
        <div className="px-3 sm:px-4 py-2 bg-rose-50 dark:bg-rose-950/70 border-t border-rose-200 dark:border-rose-900/60 flex items-center justify-between text-xs text-rose-900 dark:text-rose-200">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
            </span>
            <span className="font-bold">Listening to your voice...</span>
            <span className="text-rose-600 dark:text-rose-400 hidden sm:inline">(Speak now; speech is converting to text live)</span>
          </div>
          <button
            type="button"
            onClick={toggleListening}
            className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-bold text-[11px] hover:bg-rose-700 transition-colors cursor-pointer"
          >
            Done Speaking
          </button>
        </div>
      )}

      {/* Speech Error Banner */}
      {speechError && (
        <div className="px-3 sm:px-4 py-2 bg-amber-50 dark:bg-amber-950/70 border-t border-amber-200 dark:border-amber-900/60 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>{speechError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSpeechError(null)}
            className="text-amber-700 dark:text-amber-300 hover:text-amber-900 font-bold ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Attached Saved Note Context Pill */}
      {attachedNote && (
        <div className="px-3 sm:px-4 py-2 bg-indigo-50 dark:bg-indigo-950/60 border-t border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-semibold truncate">
            <BookMarked className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="truncate">Attached Note: <strong>{attachedNote.title}</strong></span>
          </div>
          <button
            onClick={() => setAttachedNoteId(null)}
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-950 dark:hover:text-indigo-200 font-bold ml-2 cursor-pointer shrink-0"
          >
            Remove
          </button>
        </div>
      )}

      {/* Pending Attachment Preview Card (Image or File before sending) */}
      {pendingAttachment && (
        <div className="px-3 sm:px-4 py-2.5 bg-slate-100 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 truncate min-w-0">
            {pendingAttachment.type === 'image' ? (
              pendingAttachment.url ? (
                <img 
                  src={pendingAttachment.url} 
                  alt="Attachment preview" 
                  className="w-10 h-10 object-cover rounded-lg border border-slate-300 dark:border-slate-600 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center shrink-0">
                  <ImageIcon className="w-5 h-5" />
                </div>
              )
            ) : (
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            )}

            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-[200px] sm:max-w-md">
                  {pendingAttachment.name}
                </span>
                {pendingAttachment.isParsing && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Extracting...</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {pendingAttachment.type === 'image' ? 'Image attachment ready' : 'Study file attached'}
                {pendingAttachment.size ? ` • ${(pendingAttachment.size / 1024).toFixed(0)} KB` : ''}
              </p>
            </div>
          </div>

          <button
            id="btn-remove-pending-attachment"
            type="button"
            onClick={() => setPendingAttachment(null)}
            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-2.5 sm:p-4 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 relative">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end gap-1.5 sm:gap-2"
        >
          {/* Attachment Menu Trigger & Dropdown */}
          <div className="relative" ref={attachMenuRef}>
            <button
              id="btn-attach-menu"
              type="button"
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className={`p-2 sm:p-2.5 rounded-xl border transition-colors cursor-pointer ${
                pendingAttachment || attachedNoteId
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title="Attach photo, study document, or note"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Mobile-Safe Attachment Dropdown Menu */}
            {showAttachMenu && (
              <div 
                id="menu-tutor-attachments"
                className="absolute bottom-12 left-0 w-60 sm:w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-30 space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-150"
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 px-2 py-1">
                  Attach Content
                </div>

                {/* 1. Camera Option */}
                <button
                  id="btn-attach-camera"
                  type="button"
                  onClick={() => {
                    setShowAttachMenu(false);
                    setIsCameraModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold">Camera</div>
                    <div className="text-[10px] text-slate-400">Snap a textbook or diagram</div>
                  </div>
                </button>

                {/* 2. Gallery / Photos Option */}
                <button
                  id="btn-attach-gallery"
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold">Gallery / Photos</div>
                    <div className="text-[10px] text-slate-400">Upload screenshot or image</div>
                  </div>
                </button>

                {/* 3. Files Option */}
                <button
                  id="btn-attach-files"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold">Files</div>
                    <div className="text-[10px] text-slate-400">PDF, DOCX, TXT notes</div>
                  </div>
                </button>

                {/* 4. Saved Study Notes Sub-section */}
                {availableNotes.length > 0 && (
                  <>
                    <div className="border-t border-slate-100 dark:border-slate-700 my-1 pt-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 px-2 py-0.5">
                        Saved Study Notes
                      </div>
                      <div className="max-h-28 overflow-y-auto space-y-0.5">
                        {availableNotes.map(n => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              setAttachedNoteId(n.id);
                              setShowAttachMenu(false);
                            }}
                            className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-700 dark:hover:text-indigo-300 truncate block cursor-pointer"
                          >
                            📝 {n.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Voice Input Mic Button */}
          <button
            id="btn-voice-mic"
            type="button"
            onClick={toggleListening}
            className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer relative ${
              isListening
                ? 'bg-rose-500 text-white border-rose-500 animate-pulse shadow-md shadow-rose-500/30 ring-2 ring-rose-300 dark:ring-rose-900'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title={isListening ? 'Stop recording voice' : 'Speak to AI Tutor (Speech-to-Text)'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Input Text Field */}
          <textarea
            id="input-tutor-message"
            ref={inputTextAreaRef}
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              pendingAttachment 
                ? `Ask a question about this ${pendingAttachment.type === 'image' ? 'image' : 'file'}...`
                : `Ask a question in ${selectedSubject}...`
            }
            className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-xs sm:text-sm resize-none focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 max-h-32 placeholder:text-slate-400 font-medium"
          />

          {/* Submit Button */}
          <button
            id="btn-tutor-send"
            type="submit"
            disabled={(!inputText.trim() && !pendingAttachment) || isLoading}
            className="p-2 sm:p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl shadow-md transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Camera Capture Modal (Explicit, on-demand Camera access) */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={(imageDataUrl, fileName) => {
          setPendingAttachment({
            type: 'image',
            name: fileName || `study_camera_${Date.now()}.jpg`,
            url: imageDataUrl,
            data: imageDataUrl,
            mimeType: 'image/jpeg',
            size: Math.round((imageDataUrl.length * 3) / 4),
          });
        }}
        onFallbackToFileUpload={() => {
          galleryInputRef.current?.click();
        }}
      />

      {/* Microphone Permission Modal (Explicit on-demand Mic guidance) */}
      <MicrophonePermissionModal
        isOpen={isMicModalOpen}
        onClose={() => setIsMicModalOpen(false)}
        onRetry={() => {
          setIsMicModalOpen(false);
          toggleListening();
        }}
        onFallbackToTyping={() => {
          setIsMicModalOpen(false);
          inputTextAreaRef.current?.focus();
        }}
        errorMessage={micModalError}
      />

      {/* Full Image Preview Modal */}
      {previewImageUrl && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={previewImageUrl} 
              alt="Full Preview" 
              className="max-w-full max-h-[80vh] object-contain rounded-lg mx-auto" 
            />
          </div>
        </div>
      )}

    </div>
  );
};
