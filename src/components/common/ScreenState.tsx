import React from 'react';
import { AlertTriangle, RotateCcw, Inbox } from 'lucide-react';
import { LangId, DICTS } from '../../i18n/locales';

function getActiveDict(langProp?: LangId) {
  let lang = langProp;
  if (!lang && typeof window !== 'undefined') {
    lang = (localStorage.getItem('matrix_lang') as LangId) || 'ar';
  }
  return DICTS[lang || 'ar'] || DICTS.ar;
}

export const LoadingSkeleton: React.FC<{ rows?: number; className?: string }> = ({
  rows = 4,
  className = '',
}) => {
  return (
    <div className={`p-4 space-y-3 w-full animate-pulse ${className}`}>
      <div className="h-6 bg-[#162238] rounded-md w-1/3 mb-4" />
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="h-10 bg-[#121A2B] rounded-lg w-full" />
      ))}
    </div>
  );
};

export const EmptyState: React.FC<{
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  currentLang?: LangId;
}> = ({
  title,
  message,
  icon,
  action,
  className = '',
  currentLang,
}) => {
  const dict = getActiveDict(currentLang);
  const displayTitle = title || dict.emptyStateTitle;
  const displayMessage = message || dict.emptyPosts;

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center select-none ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-[#121A2B] border border-[#243049] flex items-center justify-center text-[#7B8DA8] mb-3 shadow-inner">
        {icon || <Inbox className="w-6 h-6 text-[#64748B]" />}
      </div>
      <h4 className="text-sm font-bold text-[#E8EEF9] mb-1">{displayTitle}</h4>
      <p className="text-xs text-[#7B8DA8] max-w-sm leading-relaxed mb-4">{displayMessage}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

export const ErrorState: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
  currentLang?: LangId;
}> = ({
  title,
  message,
  onRetry,
  className = '',
  currentLang,
}) => {
  const dict = getActiveDict(currentLang);
  const displayTitle = title || dict.errorTitle;
  const displayMessage = message || dict.errorSubtitle;

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center select-none ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3 shadow-inner">
        <AlertTriangle className="w-6 h-6 text-rose-400" />
      </div>
      <h4 className="text-sm font-bold text-[#E8EEF9] mb-1">{displayTitle}</h4>
      <p className="text-xs text-[#7B8DA8] max-w-sm leading-relaxed mb-4">{displayMessage}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1C2E4A] hover:bg-[#253D63] text-[#2DD4BF] text-xs font-bold transition-all shadow-sm active:scale-95 min-h-[44px] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{dict.retryButton}</span>
        </button>
      )}
    </div>
  );
};
