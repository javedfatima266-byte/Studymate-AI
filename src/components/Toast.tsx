import React, { useEffect } from 'react';
import { Sparkles, Trophy, CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'xp' | 'achievement' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  description?: string;
  xpAmount?: number;
}

interface ToastProps {
  toasts: ToastMessage[];
  onClose?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onClose, onDismiss }) => {
  const handleDismiss = (id: string) => {
    if (onClose) onClose(id);
    if (onDismiss) onDismiss(id);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={handleDismiss} />
      ))}
    </div>
  );
};

export const ToastContainer = Toast;

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const getIcon = () => {
    switch (toast.type) {
      case 'xp':
        return <Sparkles className="w-5 h-5 text-amber-500 shrink-0 animate-bounce" />;
      case 'achievement':
        return <Trophy className="w-5 h-5 text-yellow-500 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />;
      case 'info':
        return <Info className="w-5 h-5 text-indigo-500 dark:text-indigo-400 shrink-0" />;
      default:
        return <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'xp':
        return 'border-amber-200 dark:border-amber-800 bg-amber-50/95 dark:bg-amber-950/90 text-amber-950 dark:text-amber-100';
      case 'achievement':
        return 'border-yellow-300 dark:border-yellow-800 bg-yellow-50/95 dark:bg-yellow-950/90 text-yellow-950 dark:text-yellow-100';
      case 'error':
        return 'border-rose-200 dark:border-rose-800 bg-rose-50/95 dark:bg-rose-950/90 text-rose-950 dark:text-rose-100';
      case 'info':
        return 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/95 dark:bg-indigo-950/90 text-indigo-950 dark:text-indigo-100';
      default:
        return 'border-emerald-200 dark:border-emerald-800 bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100';
    }
  };

  const bodyText = toast.message || toast.description;

  return (
    <div
      id={`toast-${toast.id}`}
      className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-300 transform translate-y-0 ${getBorderColor()}`}
    >
      {getIcon()}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <h5 className="font-bold text-sm leading-tight">{toast.title}</h5>
          {toast.xpAmount && (
            <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white shrink-0">
              +{toast.xpAmount} XP
            </span>
          )}
        </div>
        {bodyText && (
          <p className="text-xs opacity-90 mt-0.5 leading-snug">{bodyText}</p>
        )}
      </div>
      <button
        id={`toast-close-${toast.id}`}
        onClick={() => onDismiss(toast.id)}
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
