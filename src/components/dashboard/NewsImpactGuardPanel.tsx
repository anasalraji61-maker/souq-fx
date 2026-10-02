import React, { useState, useEffect } from 'react';
import { newsImpactAPI, NewsImpactResponse, VolatilityPreAlert } from '../../api/newsImpact';

interface NewsImpactGuardPanelProps {
  symbol?: string;
}

export const NewsImpactGuardPanel: React.FC<NewsImpactGuardPanelProps> = ({
  symbol = 'EURUSD'
}) => {
  const [data, setData] = useState<NewsImpactResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [windowMins, setWindowMins] = useState<number>(120);

  useEffect(() => {
    let mounted = true;
    const fetchNews = async () => {
      setLoading(true);
      try {
        const res = await newsImpactAPI.getUpcoming(windowMins);
        if (mounted) setData(res);
      } catch (err) {
        console.error('Error fetching news impact:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchNews();
    const interval = setInterval(fetchNews, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [windowMins]);

  const getAdvisoryBadge = (adv: string) => {
    switch (adv) {
      case 'FREEZE_ORDERS':
        return <span className="px-2.5 py-1 rounded text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">تجميد الأوامر المعلقة فوراً (Freeze Orders)</span>;
      case 'WIDEN_SL':
        return <span className="px-2.5 py-1 rounded text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">توسيع وقف الخسارة (Widen SL)</span>;
      case 'MONITOR':
        return <span className="px-2.5 py-1 rounded text-xs font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">مراقبة التقلب (Monitor)</span>;
      default:
        return <span className="px-2.5 py-1 rounded text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">ظروف طبيعية (Normal)</span>;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl text-slate-100 flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 font-bold text-lg">
            🚨
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide">
                محرك التنبيه المسبق لأثر الأخبار ووضع حماية التقلب (News Impact & Volatility Guard)
              </h2>
              <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-mono">
                Task 24
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              مراقبة العد التنازلي للأحداث الاقتصادية الكبرى، تحذيرات الانزلاق واتساع السبريد، وتجميد الأوامر الآلية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700">
            <span>النافذة الزمنية:</span>
            <select
              value={windowMins}
              onChange={(e) => setWindowMins(parseInt(e.target.value))}
              className="bg-slate-900 text-xs text-slate-200 border border-slate-600 rounded px-1.5 py-0.5 focus:outline-none"
            >
              <option value={60}>خلال 60 دقيقة</option>
              <option value={120}>خلال ساعتين (120m)</option>
              <option value={240}>خلال 4 ساعات (240m)</option>
            </select>
          </label>
        </div>
      </div>

      {loading && !data && (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">جاري مسح المفكرة الاقتصادية وحساب أثر التقلبات القادمة...</p>
        </div>
      )}

      {data && (
        <>
          {/* Volatility Guard Status Banner */}
          <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 transition ${
            data.active_guard_mode
              ? 'bg-red-500/15 border-red-500/40 text-red-200'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{data.active_guard_mode ? '🛡️' : '✅'}</span>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider">
                  حالة نظام الحماية (Volatility Guard Status)
                </div>
                <div className="text-sm font-semibold mt-0.5">
                  {data.active_guard_mode
                    ? 'وضع الحماية نشط: حدث عالي التأثير يقترب خلال أقل من 30 دقيقة!'
                    : 'ظروف التداول مستقرة: لا توجد أحداث شديدة التقلب في النطاق الزمني القريب.'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-400">أعلى درجة مخاطرة: </span>
                <span className={`font-bold ${data.max_risk_score >= 80 ? 'text-red-400' : 'text-slate-300'}`}>
                  {data.max_risk_score} / 100
                </span>
              </div>
              <div>
                <span className="text-slate-400">تنبيهات نشطة: </span>
                <span className="font-bold text-sky-400">{data.total_alerts} أحداث</span>
              </div>
            </div>
          </div>

          {/* Alerts Feed */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              الأحداث الاقتصادية المرتقبة والعد التنازلي
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.alerts.map((alt) => (
                <div
                  key={alt.id}
                  className="bg-slate-950/80 rounded-xl border border-slate-800 p-4 flex flex-col gap-3 hover:border-slate-700 transition"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-sky-400 border border-slate-700">
                          {alt.currency}
                        </span>
                        <span className="text-xs font-bold text-slate-200">
                          {alt.event_title}
                        </span>
                      </div>
                    </div>

                    <div className="text-right font-mono text-xs">
                      <span className="text-amber-400 font-bold">باقي {alt.minutes_remaining} دقيقة</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-xs">
                      <span className="text-slate-400">التوصية: </span>
                      {getAdvisoryBadge(alt.advisory)}
                    </div>

                    <div className="font-mono text-xs text-slate-400">
                      مؤشر الخطر: <span className="text-red-400 font-bold">{alt.risk_score}%</span>
                    </div>
                  </div>

                  {/* Affected Pairs */}
                  <div className="pt-1">
                    <span className="text-[11px] text-slate-500 block mb-1">الأزواج المعرضة لاتساع السبريد والانزلاق:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {alt.affected_pairs.map((p, pIdx) => (
                        <span
                          key={pIdx}
                          className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium border ${
                            p === symbol
                              ? 'bg-red-500/20 text-red-300 border-red-500/40 font-bold'
                              : 'bg-slate-900 text-slate-400 border-slate-800'
                          }`}
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {data.alerts.length === 0 && (
                <div className="col-span-2 py-8 text-center text-xs text-slate-500">
                  لا توجد أحداث اقتصادية في النافذة المحددة.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NewsImpactGuardPanel;
