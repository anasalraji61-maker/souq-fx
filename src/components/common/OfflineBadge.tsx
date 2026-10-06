import React, { useState, useEffect } from 'react';
import { subscribeBackendStatus } from '../../api/client';
import { WifiOff } from 'lucide-react';
import { LangId } from '../../i18n/locales';

interface OfflineBadgeProps {
  className?: string;
  forceShow?: boolean;
  currentLang?: LangId;
}

export const OfflineBadge: React.FC<OfflineBadgeProps> = ({ className = '', forceShow = false, currentLang = 'ar' }) => {
  const [isOffline, setIsOffline] = useState(() => {
    if (forceShow) return true;
    return typeof navigator !== 'undefined' ? !navigator.onLine : false;
  });

  useEffect(() => {
    if (forceShow) return;

    const handleWindowOffline = () => setIsOffline(true);
    const handleWindowOnline = () => setIsOffline(false);
    const handleCustomOffline = () => setIsOffline(true);

    window.addEventListener('offline', handleWindowOffline);
    window.addEventListener('online', handleWindowOnline);
    window.addEventListener('matrix:offline', handleCustomOffline);

    const unsubBackend = subscribeBackendStatus((offline) => setIsOffline(offline));

    return () => {
      window.removeEventListener('offline', handleWindowOffline);
      window.removeEventListener('online', handleWindowOnline);
      window.removeEventListener('matrix:offline', handleCustomOffline);
      unsubBackend();
    };
  }, [forceShow]);

  if (!isOffline && !forceShow) return null;

  const tooltip =
    currentLang === 'en-US'
      ? 'Operating in local offline mode due to disconnected backend server'
      : currentLang === 'ku'
      ? 'کارکردن لە دۆخی ناوخۆیی (ئۆفلاین) بەهۆی نەبوونی پەیوەندی بە سێرڤەر'
      : 'يتم العمل بالوضع المحلي التلقائي لعدم توفر اتصال مباشر بالخادم الخلفي';

  const label =
    currentLang === 'en-US' ? 'Offline Mode' : currentLang === 'ku' ? 'دۆخی ئۆفلاین' : 'الوضع المحلي (Offline)';

  return (
    <div
      title={tooltip}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 text-[10px] font-medium shadow-xs select-none animate-in fade-in ${className}`}
    >
      <WifiOff className="w-3 h-3 text-amber-400" />
      <span>{label}</span>
    </div>
  );
};
