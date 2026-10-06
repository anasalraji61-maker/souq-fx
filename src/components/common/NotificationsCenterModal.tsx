import React, { useState, useEffect, useRef } from 'react';
import { Bell, ShieldAlert, Check, Trash2, X, AlertTriangle, Info, Clock, AlertCircle } from 'lucide-react';
import { LangId, DICTS, formatDateTime, t, getActiveLang } from '../../i18n/locales';

export interface AppNotification {
  id: string;
  type: 'price_alert' | 'news_impact' | 'system';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  symbol?: string;
  level?: 'danger' | 'warning' | 'info';
}

const STORAGE_KEY = 'matrix.notifications.v1';
const MAX_NOTIFICATIONS = 200;

export function getStoredNotifications(lang: LangId = getActiveLang()): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.slice(0, MAX_NOTIFICATIONS);
    }
  } catch {}

  const dict = DICTS[lang] || DICTS.ar;
  const now = Date.now();
  const defaultItems: AppNotification[] = [
    {
      id: 'notif-1',
      type: 'system',
      title: dict.notifSystemReadyTitle,
      message: dict.notifSystemReadyMsg,
      timestamp: now - 1000 * 60 * 15, // 15 mins ago
      read: false,
      level: 'info',
    },
  ];

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultItems));
  } catch {}

  return defaultItems;
}

export function saveStoredNotifications(items: AppNotification[]) {
  try {
    const limited = items.slice(0, MAX_NOTIFICATIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
    window.dispatchEvent(new CustomEvent('matrix_notifications_updated'));
  } catch {}
}

export function addAppNotification(item: Omit<AppNotification, 'id' | 'read' | 'timestamp'>) {
  const current = getStoredNotifications();
  const newItem: AppNotification = {
    ...item,
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
    read: false,
  };
  saveStoredNotifications([newItem, ...current]);
}

interface NotificationsCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol?: (symbol: string) => void;
  currentLang?: LangId;
}

export const NotificationsCenterModal: React.FC<NotificationsCenterModalProps> = ({
  isOpen,
  onClose,
  onSelectSymbol,
  currentLang = 'ar',
}) => {
  const dict = DICTS[currentLang] || DICTS.ar;
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'price_alert' | 'system'>('all');
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  // Focus trap refs
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNotifications(getStoredNotifications());
      setIsConfirmingClear(false);
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement;

      // Focus first interactive element inside modal
      setTimeout(() => {
        if (modalRef.current) {
          const firstFocusable = modalRef.current.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          firstFocusable?.focus();
        }
      }, 50);
    } else {
      previouslyFocusedElementRef.current?.focus();
    }
  }, [isOpen]);

  // Listen to external updates (e.g. Price Alerts triggered)
  useEffect(() => {
    const handleUpdate = () => {
      setNotifications(getStoredNotifications());
    };
    window.addEventListener('matrix_notifications_updated', handleUpdate);
    return () => window.removeEventListener('matrix_notifications_updated', handleUpdate);
  }, []);

  // Keyboard navigation: Escape closes modal & Tab focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isConfirmingClear) {
          setIsConfirmingClear(false);
        } else {
          onClose();
        }
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isConfirmingClear, onClose]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    saveStoredNotifications(updated);
  };

  const handleClearAllConfirmed = () => {
    setNotifications([]);
    saveStoredNotifications([]);
    setIsConfirmingClear(false);
  };

  const handleMarkAsRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    setNotifications(updated);
    saveStoredNotifications(updated);
  };

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = notifications.filter((n) => n.id !== id);
    setNotifications(updated);
    saveStoredNotifications(updated);
  };

  // Filtered items
  const filteredNotifications = notifications.filter((n) => {
    if (filterType === 'price_alert') return n.type === 'price_alert';
    if (filterType === 'system') return n.type === 'system' || n.type === 'news_impact';
    return true;
  });

  // Grouping by day (3.1: items grouped by day - اليوم / أمس / date)
  // computed per render (a hook here would run after the `!isOpen` early return: React error #310)
  const groupedNotifications = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: { label: string; items: AppNotification[] }[] = [];
    const groupMap = new Map<string, AppNotification[]>();

    filteredNotifications.forEach((item) => {
      const itemDate = new Date(item.timestamp);
      itemDate.setHours(0, 0, 0, 0);

      let groupKey: string;
      if (itemDate.getTime() === today.getTime()) {
        groupKey = dict.notifsDayToday;
      } else if (itemDate.getTime() === yesterday.getTime()) {
        groupKey = dict.notifsDayYesterday;
      } else {
        groupKey = formatDateTime(item.timestamp, currentLang, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, []);
      }
      groupMap.get(groupKey)!.push(item);
    });

    groupMap.forEach((items, label) => {
      groups.push({ label, items });
    });

    return groups;
  })();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notifs-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 select-none text-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#0E1626] border border-[#2DD4BF]/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-[#E8EEF9] relative focus:outline-hidden"
      >
        {/* Header */}
        <div className="p-4 bg-[#121A2B] border-b border-[#243049] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="notifs-title" className="font-bold text-sm text-[#E8EEF9]">
                  {dict.notifsTitle}
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-mono text-[10px] font-bold">
                    {unreadCount} {dict.notifsNewBadge}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#7B8DA8] mt-0.5">{dict.notifsSubtitle}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label={dict.closeModal}
            className="p-2 rounded-xl text-[#7B8DA8] hover:text-white hover:bg-[#1E2E4A] transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3.3 Filter tabs: الكل / تنبيهات الأسعار / النظام */}
        <div className="px-4 py-2 bg-[#09101D] border-b border-[#1E283D] flex items-center justify-between gap-2 text-xs shrink-0 flex-wrap">
          <div className="flex items-center gap-1 bg-[#101827] p-1 rounded-xl border border-[#1E2E4A]">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer min-h-[32px] focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden ${
                filterType === 'all'
                  ? 'bg-[#1E2E4A] text-[#2DD4BF] shadow-xs'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              {dict.notifsFilterAll} ({notifications.length})
            </button>
            <button
              onClick={() => setFilterType('price_alert')}
              className={`px-3 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer min-h-[32px] focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden ${
                filterType === 'price_alert'
                  ? 'bg-[#1E2E4A] text-[#2DD4BF] shadow-xs'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              {dict.notifsFilterAlerts}
            </button>
            <button
              onClick={() => setFilterType('system')}
              className={`px-3 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer min-h-[32px] focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden ${
                filterType === 'system'
                  ? 'bg-[#1E2E4A] text-[#2DD4BF] shadow-xs'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              {dict.notifsFilterSystem}
            </button>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 text-[11px]">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                aria-label={dict.notifsMarkAllRead}
                className="text-[#2DD4BF] hover:underline flex items-center gap-1 cursor-pointer font-bold px-2 py-1.5 rounded-lg hover:bg-[#15243B] transition-colors focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{dict.notifsMarkAllRead}</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={() => setIsConfirmingClear(true)}
                aria-label={dict.notifsClearAll}
                className="text-[#EF4444] hover:underline flex items-center gap-1 cursor-pointer font-semibold px-2 py-1.5 rounded-lg hover:bg-rose-950/40 transition-colors focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-hidden"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{dict.notifsClearAll}</span>
              </button>
            )}
          </div>
        </div>

        {/* Clear All Confirmation Alert */}
        {isConfirmingClear && (
          <div className="p-3.5 bg-rose-950/80 border-b border-rose-500/40 flex items-center justify-between gap-3 text-xs animate-in fade-in">
            <div className="flex items-center gap-2 text-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{dict.notifsClearConfirmMsg}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleClearAllConfirmed}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
              >
                {dict.notifsConfirmYes}
              </button>
              <button
                onClick={() => setIsConfirmingClear(false)}
                className="px-3 py-1.5 rounded-lg bg-[#16233B] hover:bg-[#1E2E4A] text-[#94A3B8] hover:text-white cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden"
              >
                {dict.notifsConfirmCancel}
              </button>
            </div>
          </div>
        )}

        {/* Notifications List (Grouped by Day) */}
        <div className="p-3 overflow-y-auto space-y-4 flex-1">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-[#7B8DA8] space-y-2">
              <Bell className="w-10 h-10 mx-auto text-[#243049]" />
              <p className="font-bold text-sm text-[#E8EEF9]">{dict.notifsEmpty}</p>
              <p className="text-xs max-w-xs mx-auto leading-relaxed">{dict.notifsEmptyDesc}</p>
            </div>
          ) : (
            groupedNotifications.map((group, gIdx) => (
              <div key={gIdx} className="space-y-2">
                {/* Day Header Badge */}
                <div className="sticky top-0 bg-[#0E1626]/95 backdrop-blur-xs py-1 px-2 z-10 flex items-center gap-2">
                  <span className="text-[11px] font-black text-[#2DD4BF] bg-[#162B44] px-2.5 py-0.5 rounded-md border border-[#2DD4BF]/30">
                    {group.label}
                  </span>
                  <div className="h-px flex-1 bg-[#1E283D]" />
                </div>

                {/* Items in this group */}
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        handleMarkAsRead(item.id);
                        if (item.symbol && onSelectSymbol) {
                          onSelectSymbol(item.symbol);
                          onClose();
                        }
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                        !item.read
                          ? 'bg-[#152338] border-[#2DD4BF]/40 shadow-xs ring-1 ring-[#2DD4BF]/20'
                          : 'bg-[#101827] border-[#1E283D] hover:bg-[#131F33]'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 shrink-0">
                          {item.type === 'price_alert' && (
                            <div className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                          )}
                          {item.type === 'news_impact' && (
                            <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              <ShieldAlert className="w-4 h-4" />
                            </div>
                          )}
                          {item.type === 'system' && (
                            <div className="p-1.5 rounded-lg bg-[#2DD4BF]/15 text-[#2DD4BF] border border-[#2DD4BF]/30">
                              <Info className="w-4 h-4" />
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#E8EEF9] text-xs">{item.title}</span>
                            {!item.read && (
                              <span
                                title={dict.notifsNewBadge}
                                className="w-2 h-2 rounded-full bg-[#2DD4BF] animate-pulse"
                              />
                            )}
                          </div>
                          <p className="text-xs text-[#A3B4D0] leading-relaxed">{item.message}</p>
                          <div className="flex items-center gap-2 text-[10px] text-[#64748B] pt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>
                              {formatDateTime(item.timestamp, currentLang, {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {item.symbol && (
                              <span className="px-1.5 py-0.2 rounded bg-[#0B1220] border border-[#243049] text-[#2DD4BF] font-mono font-bold">
                                {item.symbol}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDeleteItem(item.id, e)}
                        aria-label={dict.notifsDeleteThis}
                        className="p-1.5 text-[#64748B] hover:text-rose-400 hover:bg-[#1E2E4A] rounded-lg transition-colors cursor-pointer shrink-0 min-w-[30px] min-h-[30px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-hidden"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsCenterModal;
