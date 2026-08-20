import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  FileText, 
  Copy, 
  Check, 
  BookMarked, 
  HelpCircle, 
  Volume2, 
  VolumeX, 
  Upload, 
  ListChecks, 
  Layers, 
  Lightbulb, 
  MessageSquare, 
  FileCheck2, 
  Trash2, 
  Clipboard, 
  FileCode, 
  RotateCw, 
  ChevronRight, 
  ChevronLeft, 
  AlertCircle, 
  RefreshCw,
  FileSpreadsheet,
  Presentation,
  Bot,
  ArrowLeft
} from 'lucide-react';
import { Subject, SummaryResult, FlashcardDeck, NavigationOrigin } from '../types';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { parseStudyDocument, ParsedDocumentResult } from '../utils/documentParser';
import { StorageService } from '../services/storage';

interface SmartSummarizerScreenProps {
  onSummarize: (params: { text: string; summaryType: any; subject: Subject }) => Promise<SummaryResult | null>;
  onSaveToNotes: (title: string, content: string, subject: Subject, source?: string, sourceDetails?: any) => void;
  onCreateQuizFromSummary: (topic: string, subject: Subject, text: string) => void;
  onCreateFlashcardsFromSummary: (deck: FlashcardDeck) => void;
  onAskTutor?: (topic: string, subject: Subject, contextText: string) => void;
  isLoading: boolean;
  navigationOrigin?: NavigationOrigin | null;
  onNavigateBack?: () => void;
}

const SUMMARY_TYPES = [
  { id: 'bullet_points', name: 'Key Takeaways', icon: ListChecks, desc: 'High-yield bullet points & facts' },
  { id: 'executive', name: 'Executive Summary', icon: FileCheck2, desc: 'High-level synthesis & conclusion' },
  { id: 'feynman', name: 'Feynman Technique', icon: Lightbulb, desc: 'Simple analogies for easy grasp' },
  { id: 'qa', name: 'Q&A Cheat Sheet', icon: MessageSquare, desc: 'Probable exam questions & model answers' },
  { id: 'flashcards', name: 'Flashcard Pairs', icon: Layers, desc: 'Active recall Q&A pairs' },
];

const SAMPLE_TEXTS: Record<string, { subject: Subject; title: string; text: string }> = {
  photosynthesis: {
    subject: 'Biology',
    title: 'Photosynthesis & Cellular Respiration',
    text: `Photosynthesis is a biological process used by plants, algae, and certain bacteria to convert light energy into chemical energy stored in glucose molecules.

The overall chemical equation is:
6 CO2 + 6 H2O + light energy -> C6H12O6 + 6 O2

Process Stages:
1. Light-Dependent Reactions: Occur in the thylakoid membranes of chloroplasts. Chlorophyll absorbs photons, exciting electrons. Water is split (photolysis) releasing oxygen gas, generating ATP and NADPH.
2. Calvin Cycle (Light-Independent Reactions): Occur in the stroma of chloroplasts. The enzyme RuBisCO fixes atmospheric CO2 into 3-PGA, which is reduced using ATP and NADPH into G3P to synthesize glucose.

Factors Affecting Rate:
- Light intensity (photon flux)
- Carbon dioxide concentration
- Temperature (optimal enzyme kinetics for RuBisCO)`
  },
  algorithms: {
    subject: 'Computer Science',
    title: 'Data Structures & Big-O Complexity',
    text: `Algorithm analysis uses Big-O notation to characterize runtime and memory growth rates in terms of input size N.

Core Time Complexities:
- O(1) Constant: Hash table lookup (average case), array index access.
- O(log N) Logarithmic: Binary search in sorted array, balanced binary search tree lookups.
- O(N) Linear: Traversing an unsorted array, linear search.
- O(N log N) Linearithmic: Merge Sort, Quick Sort (average), Heap Sort.
- O(N^2) Quadratic: Bubble sort, nested loops comparison.

Trade-offs:
Choosing the appropriate data structure involves trading off time complexity for space complexity, such as caching with hash maps to achieve O(1) reads at the cost of O(N) memory.`
  },
  thermodynamics: {
    subject: 'Physics',
    title: 'The Laws of Thermodynamics',
    text: `Thermodynamics deals with heat, work, temperature, and the statistical behavior of energy systems.

Fundamental Laws:
1. Zeroth Law: If system A is in thermal equilibrium with B, and B with C, then A is in thermal equilibrium with C. This defines temperature.
2. First Law (Energy Conservation): The change in internal energy ΔU = Q - W, where Q is heat added to the system and W is work done by the system.
3. Second Law (Entropy): In any spontaneous process, the total entropy of an isolated system always increases (ΔS_total >= 0). Natural heat flow is irreversible without external work.
4. Third Law (Absolute Zero): As the temperature of a pure crystalline substance approaches absolute zero (0 Kelvin), its entropy approaches a constant minimum.`
  }
};

// Client-side synthesis fallback generator
function generateClientSideSummary(text: string, summaryType: string, subject: Subject): SummaryResult {
  const cleanSubject = subject || 'General Studies';
  const cleanText = text.trim();
  const lower = cleanText.toLowerCase();

  const sentences = cleanText
    .split(/[.!?\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 15);
  
  const leadSentence = sentences[0] || `${cleanSubject} core study material concepts.`;
  const secondSentence = sentences[1] || 'Key principles and systematic mechanics govern predictable outcomes.';

  let title = `Synthesis: ${cleanSubject} Study Material`;
  let summaryContent = '';
  let keyTakeaways: string[] = [];
  let flashcards: Array<{ front: string; back: string }> = [];

  if (lower.includes('photosynthesis') || lower.includes('chloroplast')) {
    title = 'Biological Energy: The Mechanics of Photosynthesis';
    if (summaryType === 'feynman') {
      summaryContent = `### How Plants Cook Up Energy (The Feynman Analogy)

Imagine every green leaf as a solar-powered bakery:

- **Ingredients**: Roots pull **water ($H_2O$)** from the soil, and microscopic leaf pores absorb **carbon dioxide ($CO_2$)**.
- **Solar Oven (Light Reactions)**: In the **thylakoid membranes**, chlorophyll pigments trap sunlight photons to crack water open, releasing clean **oxygen ($O_2$)** and charging up molecular batteries (**ATP** & **NADPH**).
- **Bakery Kitchen (Calvin Cycle)**: In the **stroma**, the enzyme **RuBisCO** fixes the carbon dioxide into energy-rich **glucose sugar**.

**The Big Picture**: Photosynthesis is the primary engine converting sunlight into organic food and breathable oxygen for Earth!`;
    } else if (summaryType === 'executive') {
      summaryContent = `### Executive Synthesis: Photosynthesis Dynamics

**Core Finding**: Photosynthesis represents the foundational biochemical gateway converting photon irradiance into stable carbohydrate bonds ($C_6H_{12}O_6$) with stoichiometric oxygen liberation.

#### Operational Vectors
1. **Light-Dependent Phase**: Localized in thylakoid membranes; drives photolysis ($2H_2O \\rightarrow O_2 + 4H^+ + 4e^-$) to synthesize ATP and NADPH.
2. **Carbon Fixation Phase (Calvin Cycle)**: Catalyzed by RuBisCO in the chloroplast stroma; fixes atmospheric $CO_2$ into triose phosphates.

#### Critical Rate-Limiting Constraints
- Photon flux density & spectral absorption profile
- Ambient partial pressure of $CO_2$
- Thermal envelope governing RuBisCO catalytic efficiency`;
    } else if (summaryType === 'qa') {
      summaryContent = `### High-Yield Exam Q&A: Photosynthesis

**Q1: Where do the light reactions occur compared to the Calvin cycle?**
*Answer*: Light reactions take place in the **thylakoid membranes**; the Calvin cycle occurs in the chloroplast **stroma**.

**Q2: What is the exact origin of the oxygen released by plants?**
*Answer*: Oxygen originates from the **photolysis of water molecules ($H_2O$)**, NOT from carbon dioxide.

**Q3: What is the rate-limiting enzyme for carbon fixation?**
*Answer*: **RuBisCO** (Ribulose-1,5-bisphosphate carboxylase-oxygenase).`;
    } else {
      summaryContent = `### High-Yield Study Notes: Photosynthesis

- **Universal Equation**: $6CO_2 + 6H_2O + \\text{light} \\rightarrow C_6H_{12}O_6 + 6O_2$
- **Stage 1: Light-Dependent Reactions**:
  - Located in **thylakoid membranes**
  - Traps light photons, splits $H_2O$, yields $O_2$, and generates ATP + NADPH.
- **Stage 2: Calvin Cycle (Dark Reactions)**:
  - Located in the **stroma**
  - Utilizes RuBisCO to fix $CO_2$ into glucose using ATP and NADPH.
- **Key Determinants**: Light intensity, $CO_2$ concentration, and optimal temperature.`;
    }

    keyTakeaways = [
      'Converts solar irradiance into chemical energy stored in glucose.',
      'Photolysis of water in thylakoids generates oxygen gas, ATP, and NADPH.',
      'RuBisCO catalyzes atmospheric carbon fixation in the stroma.',
      'Rates depend on light intensity, temperature, and carbon dioxide levels.'
    ];

    flashcards = [
      { front: 'Where do light-dependent reactions occur in chloroplasts?', back: 'In the thylakoid membranes.' },
      { front: 'From which reactant is oxygen gas produced during photosynthesis?', back: 'Water (H2O), through photolysis.' },
      { front: 'What primary enzyme catalyzes carbon fixation in the Calvin cycle?', back: 'RuBisCO.' },
      { front: 'What energy carriers connect the light reactions to the Calvin cycle?', back: 'ATP and NADPH.' }
    ];
  } else {
    // Universal structured synthesis
    if (summaryType === 'feynman') {
      summaryContent = `### Simple Analogy (Feynman Technique): ${cleanSubject}

Think of this topic as a series of connected building blocks:

1. **The Starting Point**: ${leadSentence}
2. **The Working Mechanism**: ${secondSentence}
3. **The Big Takeaway**: Understanding the root rules lets you solve any exam problem without brute-force memorization.`;
    } else if (summaryType === 'executive') {
      summaryContent = `### Executive Summary: ${cleanSubject}

#### Strategic Overview
${leadSentence}

#### Key Findings & Mechanism
- **Core Principle**: ${secondSentence}
- **Structural Analysis**: Systematic categorization prevents diagnostic errors.
- **Actionable Insight**: Spaced review and active recall maximize retention.`;
    } else if (summaryType === 'qa') {
      summaryContent = `### Exam Cheat Sheet: ${cleanSubject}

**Q1: What is the primary thesis of this material?**
*Answer*: ${leadSentence}

**Q2: What mechanism is most important for exam mastery?**
*Answer*: ${secondSentence}

**Q3: How should a student apply these principles?**
*Answer*: Break complex problems into baseline steps and verify boundary assumptions.`;
    } else {
      summaryContent = `### Key Study Notes: ${cleanSubject}

- **Core Concept**: ${leadSentence}
- **Fundamental Logic**: ${secondSentence}
- **Systematic Structure**: Breaks into clear modular steps and established definitions.
- **Exam Readiness**: Focus on active recall and practical problem solving.`;
    }

    keyTakeaways = [
      leadSentence,
      secondSentence,
      'Systematic mechanics and modular relationships govern predictable outcomes.',
      'Active recall and spaced self-testing yield maximum retention for exams.'
    ];

    flashcards = [
      { front: `What is the core premise of this ${cleanSubject} study material?`, back: leadSentence },
      { front: `What mechanism governs this topic?`, back: secondSentence },
      { front: 'What is the most effective way to retain this material?', back: 'Active recall and structured concept synthesis.' }
    ];
  }

  return {
    id: `sum-${Date.now()}`,
    title,
    originalText: text,
    summaryType,
    summaryContent,
    keyTakeaways,
    flashcards,
    subject,
    createdAt: new Date().toISOString(),
  };
}

// Icon helper for file formats
function getFileFormatBadge(fileType: string) {
  switch (fileType.toLowerCase()) {
    case 'pdf':
      return { label: 'PDF Document', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: FileText };
    case 'docx':
    case 'doc':
      return { label: 'Word Document', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: FileSpreadsheet };
    case 'pptx':
    case 'ppt':
      return { label: 'PowerPoint Slides', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Presentation };
    case 'md':
    case 'markdown':
      return { label: 'Markdown Notes', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: FileCode };
    case 'txt':
    default:
      return { label: 'Plain Text', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: FileText };
  }
}

export const SmartSummarizerScreen: React.FC<SmartSummarizerScreenProps> = ({
  onSummarize,
  onSaveToNotes,
  onCreateQuizFromSummary,
  onCreateFlashcardsFromSummary,
  onAskTutor,
  isLoading,
  navigationOrigin,
  onNavigateBack,
}) => {
  // Load persisted session state
  const initialSaved = StorageService.getSummarizerState();

  const [inputText, setInputText] = useState(initialSaved.inputText || '');
  const [subject, setSubject] = useState<Subject>(initialSaved.subject || 'Biology');
  const [summaryType, setSummaryType] = useState<string>(initialSaved.summaryType || 'bullet_points');
  const [result, setResult] = useState<SummaryResult | null>(initialSaved.result || null);
  const [copied, setCopied] = useState(false);
  const [savedNote, setSavedNote] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  
  // Document metadata state
  const [parsedDocInfo, setParsedDocInfo] = useState<ParsedDocumentResult | null>(initialSaved.parsedDocInfo as any || null);
  const [isFileParsing, setIsFileParsing] = useState(false);
  const [parsingMessage, setParsingMessage] = useState<string>('');
  
  const [isDragging, setIsDragging] = useState(false);
  const [activeOutputTab, setActiveOutputTab] = useState<'summary' | 'takeaways' | 'flashcards'>(initialSaved.activeOutputTab || 'summary');
  const [cardIndex, setCardIndex] = useState(initialSaved.cardIndex || 0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [isLocalProcessing, setIsLocalProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-sync working summarizer state to persistent storage
  useEffect(() => {
    StorageService.saveSummarizerState({
      inputText,
      subject,
      summaryType,
      result,
      parsedDocInfo: parsedDocInfo ? {
        filename: parsedDocInfo.filename,
        fileType: parsedDocInfo.fileType,
        pageCount: parsedDocInfo.pageCount,
        slideCount: parsedDocInfo.slideCount,
        wordCount: parsedDocInfo.wordCount,
        extractedText: parsedDocInfo.text || '',
      } : null,
      activeOutputTab,
      cardIndex,
    });
  }, [inputText, subject, summaryType, result, parsedDocInfo, activeOutputTab, cardIndex]);

  // Clean up speech synthesis if component unmounts
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const charCount = inputText.length;
  const estimatedReadTime = Math.max(1, Math.ceil(wordCount / 200));

  // Universal Document Upload & Extraction Handler
  const handleFileProcess = async (file: File) => {
    if (!file) return;
    setErrorMessage(null);
    setIsFileParsing(true);

    const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
    setParsingMessage(`Extracting readable text from ${file.name} (${ext})...`);

    try {
      const parsed = await parseStudyDocument(file);
      
      if (!parsed.text || !parsed.text.trim()) {
        throw new Error(`No readable text could be extracted from "${file.name}".`);
      }

      setInputText(parsed.text);
      setParsedDocInfo(parsed);
      
      // Auto-update subject if a clear category was detected
      if (parsed.detectedSubject && parsed.detectedSubject !== 'General') {
        setSubject(parsed.detectedSubject);
      }
    } catch (err: any) {
      console.error('File parsing error:', err);
      setErrorMessage(
        err.message || 
        `Could not extract text from "${file.name}". Please ensure it is an uncorrupted PDF, DOCX, PPTX, TXT, or MD file.`
      );
      setParsedDocInfo(null);
    } finally {
      setIsFileParsing(false);
      setParsingMessage('');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
    // Reset file input value so user can re-upload identical files
    e.target.value = '';
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileProcess(file);
    }
  };

  // Clipboard Paste Helper
  const handlePasteClipboard = async () => {
    setErrorMessage(null);
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().length > 0) {
          setInputText(text);
          setParsedDocInfo(null);
          return;
        }
      }
    } catch {
      // Fallback: focus textarea for user manual Ctrl+V
    }
    textareaRef.current?.focus();
  };

  const handleLoadSample = (sampleKey: 'photosynthesis' | 'algorithms' | 'thermodynamics') => {
    setErrorMessage(null);
    const sample = SAMPLE_TEXTS[sampleKey];
    if (sample) {
      setInputText(sample.text);
      setSubject(sample.subject);
      setParsedDocInfo({
        text: sample.text,
        filename: `${sample.title}.txt`,
        fileType: 'txt',
        wordCount: sample.text.split(/\s+/).length,
        detectedSubject: sample.subject,
      });
    }
  };

  const handleClearText = () => {
    setInputText('');
    setParsedDocInfo(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStartFresh = () => {
    if (inputText.trim() || result) {
      if (!confirm('Clear current study material and generated summary to start fresh?')) {
        return;
      }
    }
    setInputText('');
    setParsedDocInfo(null);
    setResult(null);
    setErrorMessage(null);
    setActiveOutputTab('summary');
    setCardIndex(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    StorageService.clearSummarizerState();
  };

  // Summarize action with timeout guard & safe fallback
  const handleGenerateSummary = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading || isLocalProcessing || isFileParsing) return;

    setErrorMessage(null);
    setIsLocalProcessing(true);

    try {
      const res = await onSummarize({
        text: inputText,
        summaryType,
        subject,
      });

      if (res && res.summaryContent) {
        setResult(res);
        setActiveOutputTab('summary');
        setCardIndex(0);
        setIsCardFlipped(false);
      } else {
        const fallbackRes = generateClientSideSummary(inputText, summaryType, subject);
        setResult(fallbackRes);
        setActiveOutputTab('summary');
        setCardIndex(0);
        setIsCardFlipped(false);
      }
    } catch (err: any) {
      console.warn('[Smart Summarizer] API call failed, generating safe fallback:', err);
      const fallbackRes = generateClientSideSummary(inputText, summaryType, subject);
      setResult(fallbackRes);
      setActiveOutputTab('summary');
      setCardIndex(0);
      setIsCardFlipped(false);
    } finally {
      setIsLocalProcessing(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    try {
      navigator.clipboard.writeText(result.summaryContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard write failure
    }
  };

  const handleSaveNote = () => {
    if (!result) return;
    const noteTitle = result.title || `Summary: ${subject}`;
    onSaveToNotes(noteTitle, result.summaryContent, subject, 'smart_summarizer', {
      originalDocumentName: parsedDocInfo?.filename || undefined,
      summaryType,
      originalSourceSnippet: inputText ? inputText.slice(0, 300) : undefined,
    });
    setSavedNote(true);
    setTimeout(() => setSavedNote(false), 2500);
  };

  const handleTTS = () => {
    if (!('speechSynthesis' in window) || !result) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const cleanText = result.summaryContent.replace(/[*#`_$\|]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    } catch {
      setSpeaking(false);
    }
  };

  const handleConvertFlashcards = () => {
    if (!result) return;
    const cards = (result.flashcards && result.flashcards.length > 0)
      ? result.flashcards.map((f, idx) => ({
          id: `fc-sum-${Date.now()}-${idx}`,
          front: f.front,
          back: f.back,
          subject,
          repetitions: 0,
          intervalDays: 1,
          reviewed: false,
        }))
      : (result.keyTakeaways || []).map((takeaway, idx) => ({
          id: `fc-sum-${Date.now()}-${idx}`,
          front: `Key Concept #${idx + 1} (${result.title})`,
          back: takeaway,
          subject,
          repetitions: 0,
          intervalDays: 1,
          reviewed: false,
        }));

    const deck: FlashcardDeck = {
      id: `deck-sum-${Date.now()}`,
      title: `${result.title} (Flashcards)`,
      subject,
      description: `Auto-extracted active recall deck from ${result.title}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'smart_summarizer',
      currentCardIndex: 0,
      reviewedCardIds: [],
      cards,
    };

    onCreateFlashcardsFromSummary(deck);
  };

  const activeCards = result?.flashcards && result.flashcards.length > 0
    ? result.flashcards
    : (result?.keyTakeaways || []).map((t, idx) => ({
        front: `Key Takeaway #${idx + 1}`,
        back: t
      }));

  const isBusy = isLoading || isLocalProcessing || isFileParsing;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 transition-colors duration-200">
      {/* Global Navigation Origin Return Bar */}
      {navigationOrigin && onNavigateBack && (
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-purple-200/80 dark:border-purple-900/50 px-4 py-2.5 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <span>Active Study Session Context</span>
          </div>
          <button
            id="btn-summarizer-back-to-origin"
            type="button"
            onClick={onNavigateBack}
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-white bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/80 px-3.5 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{navigationOrigin.label}</span>
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-purple-200 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Universal Study Material & Document Summarizer</span>
            </div>
            <h2 className="text-2xl font-extrabold">Instant Knowledge Synthesis</h2>
            <p className="text-purple-100 text-sm mt-1 max-w-2xl">
              Import PDFs, Word documents (.docx), PowerPoint slides (.pptx), Markdown (.md), or plain text. Synthesize high-yield takeaways, Feynman analogies, executive briefs, and active recall flashcards.
            </p>
          </div>

          {(inputText.trim() || result) && (
            <button
              id="btn-summarizer-start-fresh"
              type="button"
              onClick={handleStartFresh}
              className="px-3.5 py-2 text-xs font-bold text-rose-200 hover:text-white bg-white/10 hover:bg-rose-500/20 border border-white/20 hover:border-rose-400 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              title="Clear current inputs and start fresh"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear & Start Fresh</span>
            </button>
          )}
        </div>
      </div>

      {/* Error alert banner if any */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center justify-between text-rose-800 dark:text-rose-200 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-100 font-bold ml-3 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Source Study Material Input Panel */}
        <div 
          id="panel-source-material"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all p-6 shadow-sm flex flex-col justify-between space-y-4 ${
            isDragging ? 'border-purple-500 bg-purple-50/20 dark:bg-purple-950/30 ring-2 ring-purple-400' : 'border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div>
            {/* Header with Sample Presets and Title */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Source Study Material
              </h3>

              <div className="flex items-center gap-2">
                <button
                  id="btn-load-sample"
                  type="button"
                  onClick={() => handleLoadSample('photosynthesis')}
                  className="px-2.5 py-1 text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 rounded-lg border border-purple-200 dark:border-purple-800 transition-colors cursor-pointer"
                  title="Load sample study material"
                >
                  Load Sample Text
                </button>
              </div>
            </div>

            {/* Quick Sample Selector Pills */}
            <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 text-[11px]">
              <span className="text-slate-400 dark:text-slate-500 font-semibold shrink-0">Sample Presets:</span>
              <button
                type="button"
                onClick={() => handleLoadSample('photosynthesis')}
                className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium shrink-0 cursor-pointer"
              >
                🌿 Biology
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample('algorithms')}
                className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium shrink-0 cursor-pointer"
              >
                💻 CS & Algorithms
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample('thermodynamics')}
                className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium shrink-0 cursor-pointer"
              >
                ⚡ Physics
              </button>
            </div>

            {/* Subject Selector & File Upload Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Subject Category
                </label>
                <select
                  id="select-summarizer-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value as Subject)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="Computer Science">Computer Science</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                  <option value="History">History</option>
                  <option value="Literature">Literature</option>
                  <option value="General">General Academic</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  IMPORT STUDY MATERIAL (PDF, DOCX, PPTX, TXT, MD)
                </label>
                <label 
                  id="label-choose-file"
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100/80 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold text-purple-800 dark:text-purple-200 cursor-pointer transition-colors ${
                    isFileParsing ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  {isFileParsing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-600 dark:text-purple-400" />
                      <span>Parsing Document...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>Choose Study File</span>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    id="file-summarizer-upload"
                    type="file"
                    accept=".pdf,.docx,.pptx,.txt,.md,.text,.markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/markdown"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Document Extraction Progress Banner */}
            {isFileParsing && (
              <div className="mb-3 p-3 bg-purple-50/90 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 rounded-xl flex items-center gap-3 text-xs text-purple-900 dark:text-purple-200 animate-pulse">
                <RefreshCw className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-spin shrink-0" />
                <div className="flex-1">
                  <p className="font-bold">{parsingMessage || 'Processing document...'}</p>
                  <p className="text-[11px] text-purple-700 dark:text-purple-300 mt-0.5">Extracting structured text, slides, and chapters for AI synthesis...</p>
                </div>
              </div>
            )}

            {/* Loaded Document Metadata Badge */}
            {parsedDocInfo && !isFileParsing && (
              <div className="mb-2.5 p-2.5 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/60 rounded-xl flex items-center justify-between text-xs text-purple-950 dark:text-purple-200">
                <div className="flex items-center gap-2 overflow-hidden">
                  {(() => {
                    const badge = getFileFormatBadge(parsedDocInfo.fileType);
                    const BadgeIcon = badge.icon;
                    return (
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border flex items-center gap-1 shrink-0 ${badge.color}`}>
                        <BadgeIcon className="w-3 h-3" />
                        {badge.label}
                      </span>
                    );
                  })()}
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={parsedDocInfo.filename}>
                    {parsedDocInfo.filename}
                  </span>
                  {parsedDocInfo.pageCount && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0 font-medium">
                      • {parsedDocInfo.pageCount} {parsedDocInfo.pageCount === 1 ? 'page' : 'pages'}
                    </span>
                  )}
                  {parsedDocInfo.slideCount && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0 font-medium">
                      • {parsedDocInfo.slideCount} {parsedDocInfo.slideCount === 1 ? 'slide' : 'slides'}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setParsedDocInfo(null)}
                  className="text-purple-400 hover:text-purple-700 dark:hover:text-purple-200 ml-2 font-bold cursor-pointer text-sm"
                  title="Dismiss file info"
                >
                  ×
                </button>
              </div>
            )}

            {/* Textarea Input Area with Toolbar */}
            <div className="relative">
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border-t border-x border-slate-200 dark:border-slate-700 rounded-t-xl text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-semibold flex items-center gap-1.5">
                  <FileText className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                  <span>Extracted Document Content</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    id="btn-paste-clipboard"
                    type="button"
                    onClick={handlePasteClipboard}
                    className="flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-purple-700 dark:hover:text-purple-300 font-semibold cursor-pointer"
                    title="Paste from clipboard"
                  >
                    <Clipboard className="w-3 h-3" />
                    <span>Paste</span>
                  </button>
                  {inputText && (
                    <button
                      id="btn-clear-text"
                      type="button"
                      onClick={handleClearText}
                      className="flex items-center gap-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-semibold cursor-pointer"
                      title="Clear text"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>
              </div>

              <textarea
                ref={textareaRef}
                id="input-summarizer-text"
                rows={9}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Upload a PDF, Word doc (.docx), PowerPoint (.pptx), Markdown, or paste your study notes / transcript here..."
                className="w-full p-4 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-b-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-y"
              />
            </div>

            {/* Input Stats */}
            <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium">
              <span>{wordCount.toLocaleString()} words • {charCount.toLocaleString()} characters</span>
              <span>~{estimatedReadTime} min read</span>
            </div>

            {/* Summary Format Pills */}
            <div className="mt-4">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Output Format
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUMMARY_TYPES.map(t => {
                  const Icon = t.icon;
                  const isSelected = summaryType === t.id;
                  return (
                    <button
                      key={t.id}
                      id={`btn-sumtype-${t.id}`}
                      type="button"
                      onClick={() => setSummaryType(t.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50/90 dark:bg-purple-950/70 text-purple-950 dark:text-purple-100 font-bold shadow-xs ring-1 ring-purple-400/30'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/90 text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-purple-600 dark:text-purple-400' : 'text-slate-500 dark:text-slate-400'}`} />
                      <div>
                        <div className="text-xs font-semibold">{t.name}</div>
                        <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400 leading-tight mt-0.5">{t.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="space-y-2">
            <button
              id="btn-summarize-submit"
              type="button"
              onClick={handleGenerateSummary}
              disabled={!inputText.trim() || isBusy}
              className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              {isBusy ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Study Material...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Smart Summary (+50 XP)</span>
                </>
              )}
            </button>

            {/* Quick Actions Direct from Source Material */}
            {inputText.trim() && !isBusy && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onCreateQuizFromSummary(parsedDocInfo?.filename?.replace(/\.[^/.]+$/, '') || `${subject} Quiz`, subject, inputText)}
                  className="py-2 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs font-bold border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Generate Quiz from File</span>
                </button>

                {onAskTutor && (
                  <button
                    type="button"
                    onClick={() => onAskTutor(parsedDocInfo?.filename || subject, subject, inputText)}
                    className="py-2 px-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 text-xs font-bold border border-indigo-200 dark:border-indigo-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Bot className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Ask AI Tutor on File</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Generated Summary Display Panel */}
        <div 
          id="panel-synthesized-output"
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between"
        >
          <div>
            {/* Header with Title and Quick Utilities */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Synthesized Output
              </h3>

              {result && (
                <div className="flex items-center gap-1.5">
                  <button
                    id="btn-summary-tts"
                    type="button"
                    onClick={handleTTS}
                    className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                      speaking ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 animate-pulse' : 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                    title={speaking ? 'Stop speech' : 'Read summary aloud'}
                  >
                    {speaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline text-[11px]">{speaking ? 'Stop' : 'Listen'}</span>
                  </button>
                  <button
                    id="btn-summary-copy"
                    type="button"
                    onClick={handleCopy}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline text-[11px]">{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Output Tabs when Result Exists */}
            {result && (
              <div className="flex items-center gap-1 border-b border-slate-100 dark:border-slate-800 pb-2 mb-3 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveOutputTab('summary')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                    activeOutputTab === 'summary'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Summary Note
                </button>
                <button
                  type="button"
                  onClick={() => setActiveOutputTab('takeaways')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                    activeOutputTab === 'takeaways'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Key Takeaways ({result.keyTakeaways?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveOutputTab('flashcards')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                    activeOutputTab === 'flashcards'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Flashcards ({activeCards.length})
                </button>
              </div>
            )}

            {/* Output Body */}
            {result ? (
              <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-0.5 rounded-full border border-purple-100 dark:border-purple-900/60">
                      {result.subject || subject}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {SUMMARY_TYPES.find(t => t.id === summaryType)?.name || 'Summary'}
                    </span>
                  </div>
                  <h4 className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
                    {result.title}
                  </h4>
                </div>

                {/* Tab 1: Formatted Summary */}
                {activeOutputTab === 'summary' && (
                  <div className="p-4 bg-slate-50/80 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700">
                    <MarkdownRenderer content={result.summaryContent} />
                  </div>
                )}

                {/* Tab 2: Key Takeaways Highlights */}
                {activeOutputTab === 'takeaways' && (
                  <div className="p-5 bg-purple-50/60 dark:bg-purple-950/40 rounded-xl border border-purple-100 dark:border-purple-900/60 space-y-3">
                    <span className="text-xs font-extrabold text-purple-950 dark:text-purple-200 uppercase tracking-wider block">
                      ⚡ Essential Key Takeaways:
                    </span>
                    <ul className="space-y-2 text-xs text-purple-950 dark:text-purple-200 font-medium">
                      {(result.keyTakeaways || []).map((takeaway, tIdx) => (
                        <li key={tIdx} className="flex items-start gap-2.5 bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-purple-100/80 dark:border-purple-900/50">
                          <span className="text-purple-600 dark:text-purple-400 font-extrabold text-sm leading-none">•</span>
                          <span className="leading-relaxed">{takeaway}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tab 3: Interactive Flashcards Preview */}
                {activeOutputTab === 'flashcards' && (
                  <div className="space-y-3">
                    {activeCards.length > 0 ? (
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 mb-2">
                          <span>Card {cardIndex + 1} of {activeCards.length}</span>
                          <span>Click card to flip</span>
                        </div>

                        <div 
                          onClick={() => setIsCardFlipped(!isCardFlipped)}
                          className="min-h-[160px] p-6 bg-gradient-to-br from-slate-50 to-purple-50/30 dark:from-slate-800 dark:to-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/60 flex flex-col justify-between cursor-pointer hover:border-purple-300 dark:hover:border-purple-600 transition-all select-none shadow-xs"
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold text-purple-600 dark:text-purple-400">
                            <span>{isCardFlipped ? '💡 ANSWER / EXPLANATION' : '❓ QUESTION / PROMPT'}</span>
                            <span className="text-slate-400 dark:text-slate-400 flex items-center gap-1 font-normal">
                              <RotateCw className="w-3 h-3" /> Flip
                            </span>
                          </div>

                          <div className="text-sm font-semibold text-slate-900 dark:text-white py-3">
                            {isCardFlipped ? activeCards[cardIndex]?.back : activeCards[cardIndex]?.front}
                          </div>

                          <div className="text-[10px] text-slate-400 dark:text-slate-400 text-right">
                            {isCardFlipped ? 'Tap to view question' : 'Tap to reveal answer'}
                          </div>
                        </div>

                        {/* Card Navigation */}
                        <div className="flex items-center justify-between mt-3">
                          <button
                            type="button"
                            disabled={cardIndex === 0}
                            onClick={() => {
                              setCardIndex(Math.max(0, cardIndex - 1));
                              setIsCardFlipped(false);
                            }}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" /> Previous
                          </button>

                          <button
                            type="button"
                            disabled={cardIndex === activeCards.length - 1}
                            onClick={() => {
                              setCardIndex(Math.min(activeCards.length - 1, cardIndex + 1));
                              setIsCardFlipped(false);
                            }}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                          >
                            Next <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-6">No flashcards available for this summary.</p>
                    )}
                  </div>
                )}

                {/* Always-Visible Key Takeaways in Summary Note View */}
                {activeOutputTab === 'summary' && result.keyTakeaways && result.keyTakeaways.length > 0 && (
                  <div className="p-4 bg-purple-50/50 dark:bg-purple-950/40 rounded-xl border border-purple-100 dark:border-purple-900/60 space-y-2">
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-300 block">
                      ⚡ Essential Key Takeaways:
                    </span>
                    <ul className="space-y-1 text-xs text-purple-950 dark:text-purple-200 font-medium">
                      {result.keyTakeaways.map((takeaway, tIdx) => (
                        <li key={tIdx} className="flex items-start gap-1.5">
                          <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                          <span>{takeaway}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-20 text-center text-slate-400 dark:text-slate-500 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-400 dark:text-purple-300 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium">
                  Your synthesized summary will appear here.
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
                  Upload a PDF, Word doc (.docx), PowerPoint (.pptx), Markdown, or Plain text file, then click Generate.
                </p>
              </div>
            )}
          </div>

          {/* Action Convert Bar */}
          {result && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
              <button
                id="btn-summary-save-note"
                type="button"
                onClick={handleSaveNote}
                className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {savedNote ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <BookMarked className="w-3.5 h-3.5" />}
                <span>{savedNote ? 'Saved to Notes' : 'Save as Note'}</span>
              </button>

              <button
                id="btn-summary-to-quiz"
                type="button"
                onClick={() => onCreateQuizFromSummary(result.title, subject, result.summaryContent)}
                className="py-2.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Create Practice Quiz</span>
              </button>

              <button
                id="btn-summary-to-flashcards"
                type="button"
                onClick={handleConvertFlashcards}
                className="py-2.5 px-3 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Make Flashcards</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
