import React, { useState, useEffect } from 'react';
import { subscribeBackendStatus } from '../../api/client';
import { WifiOff } from 'lucide-react';

interface OfflineBadgeProps {
  className?: string;
  forceShow?: boolean;
}

export const OfflineBadge: React.FC<OfflineBadgeProps> = ({ className = '', forceShow = false }) => {
  const [isOffline, setIsOffline] = useState(forceShow);

  useEffect(() => {
    if (forceShow) return;
    return subscribeBackendStatus((offline) => setIsOffline(offline));
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
