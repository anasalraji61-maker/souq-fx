import React from 'react';
import { AlertTriangle, RotateCcw, Inbox } from 'lucide-react';

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
}> = ({
  title = 'لا توجد بيانات متاحة حالياً',
  message = 'لم يتم تسجيل أي عناصر بعد.',
  icon,
  action,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center select-none ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-[#121A2B] border border-[#243049] flex items-center justify-center text-[#7B8DA8] mb-3 shadow-inner">
        {icon || <Inbox className="w-6 h-6 text-[#64748B]" />}
      </div>
      <h4 className="text-sm font-bold text-[#E8EEF9] mb-1">{title}</h4>
      <p className="text-xs text-[#7B8DA8] max-w-sm leading-relaxed mb-4">{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

export const ErrorState: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}> = ({
  title = 'حدث خطأ أثناء تحميل البيانات',
  message = 'تعذر الاتصال بالخادم. يرجى التحقق من الاتصال وإعادة المحاولة.',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center select-none ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3 shadow-inner">
        <AlertTriangle className="w-6 h-6 text-rose-400" />
      </div>
      <h4 className="text-sm font-bold text-[#E8EEF9] mb-1">{title}</h4>
      <p className="text-xs text-[#7B8DA8] max-w-sm leading-relaxed mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C2E4A] hover:bg-[#253D63] text-[#2DD4BF] text-xs font-bold transition-all shadow-sm active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>إعادة المحاولة</span>
        </button>
      )}
    </div>
  );
};
