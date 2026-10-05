import React, { useState, useEffect } from 'react';
import { subscribeBackendStatus } from '../../api/client';
import { WifiOff } from 'lucide-react';

interface OfflineBadgeProps {
  className?: string;
  forceShow?: boolean;
}

export const OfflineBadge: React.FC<OfflineBadgeProps> = ({ className = '', forceShow = false }) => {
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

  return (
    <div
      title="يتم العمل بالوضع المحلي التلقائي لعدم توفر اتصال مباشر بالخادم الخلفي"
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 text-[10px] font-medium shadow-xs select-none animate-in fade-in ${className}`}
    >
      <WifiOff className="w-3 h-3 text-amber-400" />
      <span>الوضع المحلي (Offline)</span>
    </div>
  );
};
