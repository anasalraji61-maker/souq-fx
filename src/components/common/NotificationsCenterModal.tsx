import React, { useState, useEffect } from 'react';
import { Bell, ShieldAlert, Check, Trash2, X, AlertTriangle, Info, Clock } from 'lucide-react';

export interface AppNotification {
  id: string;
  type: 'price_alert' | 'news_impact' | 'system';
  title: string;
  message: string;
  time: string;
  read: boolean;
  symbol?: string;
  level?: 'danger' | 'warning' | 'info';
}

interface NotificationsCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol?: (symbol: string) => void;
}

export const NotificationsCenterModal: React.FC<NotificationsCenterModalProps> = ({
  isOpen,
  onClose,
  onSelectSymbol,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const raw = localStorage.getItem('matrix.notifications');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}

    return [
      {
        id: 'notif-1',
        type: 'system',
        title: 'منصة MATRIX PRO جاهزة',
        message: 'تم تفعيل الاتصال بخادم التحليل الفني والبيانات الحية بنجاح.',
        time: 'منذ قليل',
        read: false,
        level: 'info',
      },
      {
        id: 'notif-2',
        type: 'news_impact',
        title: 'تحذير تقلبات: مؤشر التضخم الأمريكي CPI',
        message: 'حدث عالي التأثير مجدول. يرجى توخي الحذر وإدارة المخاطر على أزواج الدولار.',
        time: 'اليوم 12:30 UTC',
        read: false,
        level: 'warning',
        symbol: 'USD',
      },
      {
        id: 'notif-3',
        type: 'price_alert',
        title: 'تنبيه سعري: الذهب XAUUSD',
        message: 'وصل سعر الذهب إلى المقاومة التاريخية 2750.00$.',
        time: 'اليوم 10:15 UTC',
        read: true,
        level: 'danger',
        symbol: 'XAUUSD',
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('matrix.notifications', JSON.stringify(notifications));
    } catch {}
  }, [notifications]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none text-xs">
      <div className="w-full max-w-lg bg-[#0E1626] border border-[#2DD4BF]/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-[#121A2B] border-b border-[#243049] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#2DD4BF]/10 text-[#2DD4BF]">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[#E8EEF9]">مركز الإشعارات والتنبيهات</h3>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono text-[10px] font-bold">
                    {unreadCount} جديد
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#7B8DA8]">
                سجل تنبيهات الأسعار، تحذيرات الأخبار، والرسائل النظامية.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-[#7B8DA8] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-4 py-2 bg-[#0B1220] border-b border-[#1E283D] flex items-center justify-between text-[11px]">
          <span className="text-[#64748B]">إجمالي: {notifications.length} إشعار</span>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[#2DD4BF] hover:underline flex items-center gap-1 cursor-pointer font-semibold"
              >
                <Check className="w-3.5 h-3.5" />
                <span>تحديد الكل كمقروء</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="text-[#EF4444] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح السجل</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="p-3 overflow-y-auto space-y-2 flex-1">
          {notifications.length === 0 ? (
            <div className="p-12 text-center text-[#7B8DA8] space-y-2">
              <Bell className="w-8 h-8 mx-auto text-[#243049]" />
              <p className="font-semibold text-[#E8EEF9]">لا توجد إشعارات حالياً</p>
              <p className="text-xs">ستظهر هنا التنبيهات السعرية وتحذيرات تقلبات الأخبار فور حدوثها.</p>
            </div>
          ) : (
            notifications.map((item) => {
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    markAsRead(item.id);
                    if (item.symbol && onSelectSymbol) {
                      onSelectSymbol(item.symbol);
                      onClose();
                    }
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                    !item.read
                      ? 'bg-[#152338] border-[#2DD4BF]/30 shadow-xs'
                      : 'bg-[#101827] border-[#1E283D] hover:bg-[#131F33]'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 shrink-0">
                      {item.type === 'price_alert' && (
                        <div className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      )}
                      {item.type === 'news_impact' && (
                        <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
                          <ShieldAlert className="w-4 h-4" />
                        </div>
                      )}
                      {item.type === 'system' && (
                        <div className="p-1.5 rounded-lg bg-[#2DD4BF]/15 text-[#2DD4BF]">
                          <Info className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#E8EEF9] text-xs">{item.title}</span>
                        {!item.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF] animate-pulse" />
                        )}
                      </div>
                      <p className="text-xs text-[#A3B4D0] leading-relaxed">{item.message}</p>
                      <div className="flex items-center gap-2 text-[10px] text-[#64748B] pt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{item.time}</span>
                        {item.symbol && (
                          <span className="px-1.5 py-0.2 rounded bg-[#0B1220] border border-[#243049] text-[#2DD4BF] font-mono font-bold">
                            {item.symbol}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => deleteNotification(item.id, e)}
                    title="حذف هذا الإشعار"
                    className="p-1 text-[#64748B] hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
