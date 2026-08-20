import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // Ignore clipboard write failures
    }
  };

  if (!content) {
    return <p className="text-slate-400 dark:text-slate-500 text-xs italic">No content to display.</p>;
  }

  // Safe inline formatting without catastrophic regex backtracking
  const renderFormattedText = (text: string, keyPrefix: string): React.ReactNode => {
    if (!text) return null;
    
    // Quick escape for simple text
    if (!text.includes('**') && !text.includes('`') && !text.includes('$') && !text.includes('*')) {
      return text;
    }

    // Split text into tokens safely
    const tokens: React.ReactNode[] = [];
    let remaining = text;
    let tokenKey = 0;

    while (remaining.length > 0) {
      // Check for code `...`
      const codeStart = remaining.indexOf('`');
      const boldStart = remaining.indexOf('**');
      const mathStart = remaining.indexOf('$');

      // Find the earliest marker
      const markers = [
        { type: 'code', index: codeStart },
        { type: 'bold', index: boldStart },
        { type: 'math', index: mathStart },
      ].filter(m => m.index !== -1).sort((a, b) => a.index - b.index);

      if (markers.length === 0) {
        tokens.push(<React.Fragment key={`${keyPrefix}-${tokenKey++}`}>{remaining}</React.Fragment>);
        break;
      }

      const firstMarker = markers[0];

      // Push text before marker
      if (firstMarker.index > 0) {
        tokens.push(
          <React.Fragment key={`${keyPrefix}-${tokenKey++}`}>
            {remaining.substring(0, firstMarker.index)}
          </React.Fragment>
        );
        remaining = remaining.substring(firstMarker.index);
      }

      if (firstMarker.type === 'bold') {
        const end = remaining.indexOf('**', 2);
        if (end !== -1) {
          const boldText = remaining.substring(2, end);
          tokens.push(
            <strong key={`${keyPrefix}-${tokenKey++}`} className="font-bold text-slate-900 dark:text-white">
              {boldText}
            </strong>
          );
          remaining = remaining.substring(end + 2);
        } else {
          tokens.push(<React.Fragment key={`${keyPrefix}-${tokenKey++}`}>**</React.Fragment>);
          remaining = remaining.substring(2);
        }
      } else if (firstMarker.type === 'code') {
        const end = remaining.indexOf('`', 1);
        if (end !== -1) {
          const codeText = remaining.substring(1, end);
          tokens.push(
            <code key={`${keyPrefix}-${tokenKey++}`} className="px-1.5 py-0.5 mx-0.5 text-xs bg-slate-100 dark:bg-slate-800 text-purple-700 dark:text-purple-300 rounded-md font-mono border border-slate-200 dark:border-slate-700">
              {codeText}
            </code>
          );
          remaining = remaining.substring(end + 1);
        } else {
          tokens.push(<React.Fragment key={`${keyPrefix}-${tokenKey++}`}>`</React.Fragment>);
          remaining = remaining.substring(1);
        }
      } else if (firstMarker.type === 'math') {
        const end = remaining.indexOf('$', 1);
        if (end !== -1) {
          const mathText = remaining.substring(1, end);
          tokens.push(
            <span key={`${keyPrefix}-${tokenKey++}`} className="font-mono text-purple-900 dark:text-purple-200 bg-purple-50 dark:bg-purple-950/70 px-1.5 py-0.5 rounded text-xs border border-purple-100 dark:border-purple-800/80 inline-block my-0.5">
              {mathText}
            </span>
          );
          remaining = remaining.substring(end + 1);
        } else {
          tokens.push(<React.Fragment key={`${keyPrefix}-${tokenKey++}`}>$</React.Fragment>);
          remaining = remaining.substring(1);
        }
      }
    }

    return tokens;
  };

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLanguage = '';

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    // Code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        const fullCode = codeBuffer.join('\n');
        const blockIdx = idx;
        elements.push(
          <div key={`code-block-${idx}`} className="relative my-3 rounded-xl bg-slate-900 dark:bg-slate-950 text-slate-100 overflow-hidden font-mono text-xs shadow-inner border border-slate-800">
            <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-800/80 dark:bg-slate-900 text-slate-400 border-b border-slate-700/80">
              <span className="text-[11px] uppercase font-bold tracking-wider text-indigo-300">{codeLanguage || 'code'}</span>
              <button
                id={`btn-copy-code-${idx}`}
                type="button"
                onClick={() => copyToClipboard(fullCode, blockIdx)}
                className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                title="Copy code"
              >
                {copiedIndex === blockIdx ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[11px] text-emerald-400 font-bold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 overflow-x-auto leading-relaxed">
              <code>{fullCode}</code>
            </pre>
          </div>
        );
        codeBuffer = [];
        inCodeBlock = false;
        codeLanguage = '';
      } else {
        inCodeBlock = true;
        codeLanguage = line.trim().replace(/^```/, '');
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    const trimmed = line.trim();

    // Blank lines
    if (!trimmed) {
      elements.push(<div key={`blank-${idx}`} className="h-2" />);
      continue;
    }

    // Headings
    if (trimmed.startsWith('#### ')) {
      elements.push(
        <h5 key={`h4-${idx}`} className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-2.5 mb-1">
          {renderFormattedText(trimmed.replace(/^####\s+/, ''), `h4-${idx}`)}
        </h5>
      );
    } else if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${idx}`} className="text-base font-extrabold text-slate-900 dark:text-white mt-3.5 mb-1.5">
          {renderFormattedText(trimmed.replace(/^###\s+/, ''), `h3-${idx}`)}
        </h4>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${idx}`} className="text-lg font-extrabold text-slate-900 dark:text-white mt-4 mb-2 pb-1 border-b border-slate-100 dark:border-slate-800">
          {renderFormattedText(trimmed.replace(/^##\s+/, ''), `h2-${idx}`)}
        </h3>
      );
    } else if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={`h1-${idx}`} className="text-xl font-extrabold text-slate-900 dark:text-white mt-4 mb-2.5">
          {renderFormattedText(trimmed.replace(/^#\s+/, ''), `h1-${idx}`)}
        </h2>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      // Bullet items
      const bulletText = trimmed.replace(/^[-*]\s+/, '');
      elements.push(
        <div key={`bullet-${idx}`} className="flex items-start gap-2 ml-1 my-1 text-slate-700 dark:text-slate-200 leading-relaxed text-sm">
          <span className="text-indigo-600 dark:text-indigo-400 mt-1 font-bold text-xs shrink-0">•</span>
          <span>{renderFormattedText(bulletText, `b-${idx}`)}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      // Numbered items
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        elements.push(
          <div key={`num-${idx}`} className="flex items-start gap-2 ml-1 my-1 text-slate-700 dark:text-slate-200 leading-relaxed text-sm">
            <span className="text-indigo-600 dark:text-indigo-400 font-bold text-xs mt-0.5 shrink-0">{numMatch[1]}.</span>
            <span>{renderFormattedText(numMatch[2], `n-${idx}`)}</span>
          </div>
        );
      }
    } else if (trimmed.startsWith('> ')) {
      // Quotes / callouts
      elements.push(
        <div key={`quote-${idx}`} className="my-2.5 pl-3 py-1.5 border-l-4 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/50 rounded-r-md text-slate-700 dark:text-slate-200 italic text-sm">
          {renderFormattedText(trimmed.replace(/^>\s*/, ''), `q-${idx}`)}
        </div>
      );
    } else {
      // Regular paragraph
      elements.push(
        <p key={`p-${idx}`} className="my-1.5 text-slate-700 dark:text-slate-200 leading-relaxed text-sm">
          {renderFormattedText(line, `p-${idx}`)}
        </p>
      );
    }
  }

  // Flush open code block if any
  if (inCodeBlock && codeBuffer.length > 0) {
    elements.push(
      <pre key="code-block-trailing" className="p-3 bg-slate-900 dark:bg-slate-950 text-slate-100 rounded-xl text-xs font-mono my-2 overflow-x-auto border border-slate-800">
        <code>{codeBuffer.join('\n')}</code>
      </pre>
    );
  }

  return <div className={`space-y-0.5 ${className}`}>{elements}</div>;
};
