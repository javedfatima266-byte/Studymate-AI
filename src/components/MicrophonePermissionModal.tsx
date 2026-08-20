import React, { useState } from 'react';
import { 
  Mic, 
  MicOff, 
  X, 
  RotateCw, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Edit3,
  AlertCircle
} from 'lucide-react';
import { PermissionService } from '../services/permissionService';

interface MicrophonePermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  onFallbackToTyping?: () => void;
  errorMessage?: string | null;
}

export const MicrophonePermissionModal: React.FC<MicrophonePermissionModalProps> = ({
  isOpen,
  onClose,
  onRetry,
  onFallbackToTyping,
  errorMessage,
}) => {
  const [showHelpGuide, setShowHelpGuide] = useState<boolean>(true);

  if (!isOpen) return null;

  const instructions = PermissionService.getPermissionInstructions('microphone');

  return (
    <div 
      id="modal-mic-permission"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div 
        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl sm:rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <MicOff className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Microphone Access Required
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Voice-to-Text Speech Recognition
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {errorMessage ||
              'StudyMate AI needs microphone permission so you can speak your questions directly to the AI Tutor.'}
          </p>

          {/* Browser Allow Instructions Accordion */}
          <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 overflow-hidden text-left">
            <button
              type="button"
              onClick={() => setShowHelpGuide(!showHelpGuide)}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-slate-100/60 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                How to allow Microphone in your browser
              </span>
              {showHelpGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showHelpGuide && (
              <div className="px-3.5 pb-3.5 pt-1 space-y-3 text-[11px] border-t border-slate-200 dark:border-slate-700/60">
                {instructions.map((guide, idx) => (
                  <div key={idx} className="space-y-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {guide.browser}:
                    </span>
                    <ol className="list-decimal list-inside space-y-0.5 text-slate-500 dark:text-slate-400 pl-1">
                      {guide.steps.map((st, sIdx) => (
                        <li key={sIdx}>{st}</li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <button
              id="btn-retry-mic-permission"
              type="button"
              onClick={() => {
                onClose();
                onRetry();
              }}
              className="w-full sm:flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Try Again
            </button>
            {onFallbackToTyping && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onFallbackToTyping();
                }}
                className="w-full sm:flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Type Instead
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
