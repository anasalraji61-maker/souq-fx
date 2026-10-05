import React, { useState, useEffect, useCallback } from 'react';
import { getEconomicCalendar, EconomicCalendarEvent, getMarketNews, NewsItem } from '../../api/toolsApi';
import { newsImpactAPI, VolatilityPreAlert } from '../../api/newsImpact';
import { Calendar, AlertTriangle, RefreshCw, Globe, ShieldAlert, Newspaper, ExternalLink } from 'lucide-react';
import { OfflineBadge } from '../common/OfflineBadge';

export const EconomicCalendar: React.FC = () => {
  const [impactFilter, setImpactFilter] = useState<'all' | 'high' | 'medium'>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'calendar' | 'news'>('calendar');

  const [events, setEvents] = useState<EconomicCalendarEvent[]>([]);
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [upcomingImpactAlerts, setUpcomingImpactAlerts] = useState<VolatilityPreAlert[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Calendar
      const calRes = await getEconomicCalendar(currencyFilter, impactFilter);
      setEvents(calRes.events);

      // 2. Upcoming high impact banner from /api/news-impact/upcoming
      try {
        const impactRes = await newsImpactAPI.getUpcoming(180);
        if (impactRes && Array.isArray(impactRes.alerts)) {
          setUpcomingImpactAlerts(impactRes.alerts);
        }
      } catch {
        // Continue
      }

      // 3. News from /api/news
      const newsRes = await getMarketNews();
      setNewsList(newsRes.news);

      if (calRes.isOffline || newsRes.isOffline) {
        setIsOffline(true);
      } else {
        setIsOffline(false);
      }
    } catch {
      setIsOffline(true);
    } finally {
      setIsLoading(false);
    }
  }, [currencyFilter, impactFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredEvents = events.filter((ev) => {
    const matchesImpact = impactFilter === 'all' || ev.impact === impactFilter;
    const matchesCurrency = currencyFilter === 'all' || ev.currency === currencyFilter;
    return matchesImpact && matchesCurrency;
  });

  const getImpactBadge = (impact: 'high' | 'medium' | 'low') => {
    switch (impact) {
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            تأثير قوي
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            تأثير متوسط
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-500/15 text-[#7B8DA8]">
            منخفض
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 select-none text-xs">
      {/* 2.2 Upcoming High Impact Volatility Banner */}
      {upcomingImpactAlerts.length > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/60 to-[#121A2B] border border-rose-500/40 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
              <ShieldAlert className="w-4 h-4 animate-bounce" />
              <span>تحذير تقلبات وأخبار عالية التأثير قادمة</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 font-mono">
              وضع الحماية نشط
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
            {upcomingImpactAlerts.slice(0, 4).map((al) => (
              <div
                key={al.id}
                className="flex items-center justify-between p-2 rounded-lg bg-[#0B1220]/70 border border-[#243049]"
              >
                <div>
                  <div className="font-bold text-white text-xs">{al.event_title}</div>
                  <div className="text-[10px] text-[#A3B4D0]">
                    العملة: <strong className="text-amber-400">{al.currency}</strong> • الأزواج المتأثرة:{' '}
                    {al.affected_pairs.slice(0, 3).join(', ')}
                  </div>
                </div>
                <div className="text-left font-mono shrink-0 pr-2">
                  <span className="text-rose-400 font-bold text-xs">{al.minutes_remaining} دقيقة</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#243049]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#E8EEF9]">
                التقويم الاقتصادي والأخبار المباشرة
              </h2>
              {isOffline && <OfflineBadge forceShow />}
            </div>
            <p className="text-[#7B8DA8]">
              متابعة البيانات الاقتصادية الكبرى، مؤشرات التضخم والفائدة، وتدفق الأخبار العالمية.
            </p>
          </div>
        </div>

        {/* View Switcher: Calendar vs News */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#121A2B] p-1 rounded-xl border border-[#243049]">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-[#2DD4BF] text-[#042F2E]'
                  : 'text-[#A3B4D0] hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>التقويم الاقتصادي</span>
            </button>
            <button
              onClick={() => setActiveTab('news')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'news'
                  ? 'bg-[#2DD4BF] text-[#042F2E]'
                  : 'text-[#A3B4D0] hover:text-white'
              }`}
            >
              <Newspaper className="w-3.5 h-3.5" />
              <span>أخبار السوق ({newsList.length})</span>
            </button>
          </div>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 rounded-xl bg-[#141E30] hover:bg-[#1E2B44] text-[#A3B4D0] hover:text-white transition-colors border border-[#243049] cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {activeTab === 'calendar' ? (
        <>
          {/* Calendar Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#121A2B] rounded-xl border border-[#243049]">
            <div className="flex items-center gap-2">
              <span className="text-[#7B8DA8] text-[11px]">مستوى التأثير:</span>
              <div className="flex items-center bg-[#0B1220] p-0.5 rounded-lg border border-[#243049]">
                <button
                  onClick={() => setImpactFilter('all')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    impactFilter === 'all' ? 'bg-[#2DD4BF] text-[#042F2E]' : 'text-[#A3B4D0]'
                  }`}
                >
                  الكل
                </button>
                <button
                  onClick={() => setImpactFilter('high')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    impactFilter === 'high' ? 'bg-rose-500 text-white' : 'text-[#A3B4D0]'
                  }`}
                >
                  أخبار قوية
                </button>
                <button
                  onClick={() => setImpactFilter('medium')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    impactFilter === 'medium' ? 'bg-amber-500 text-[#042F2E]' : 'text-[#A3B4D0]'
                  }`}
                >
                  متوسطة
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[#7B8DA8] text-[11px]">العملة:</span>
              <select
                value={currencyFilter}
                onChange={(e) => setCurrencyFilter(e.target.value)}
                className="bg-[#0B1220] border border-[#243049] rounded-lg px-3 py-1.5 text-xs text-[#E8EEF9] font-mono focus:outline-hidden"
              >
                <option value="all">كل العملات الرئيسية</option>
                <option value="USD">USD (الدولار الأمريكي)</option>
                <option value="EUR">EUR (اليورو الأوروبي)</option>
                <option value="GBP">GBP (الجنيه الإسترليني)</option>
                <option value="JPY">JPY (الين الياباني)</option>
                <option value="AUD">AUD (الدولار الأسترالي)</option>
                <option value="CAD">CAD (الدولار الكندي)</option>
              </select>
            </div>
          </div>

          {/* Calendar Events Table */}
          <div className="bg-[#121A2B] rounded-xl border border-[#243049] overflow-hidden shadow-lg">
            {isLoading ? (
              <div className="p-12 text-center text-[#7B8DA8] space-y-3 font-mono">
                <div className="w-8 h-8 rounded-full border-2 border-[#2DD4BF] border-t-transparent animate-spin mx-auto" />
                <p>جاري مزامنة بيانات المفكرة الاقتصادية...</p>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="p-12 text-center text-[#7B8DA8] space-y-2">
                <p className="font-semibold text-[#E8EEF9]">لا توجد أحداث اقتصادية مسجلة لهذه الفلاتر</p>
                <p className="text-xs">اختر &quot;كل العملات&quot; أو فلاتر تأثير أوسع.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Desktop Table View */}
                <table className="hidden md:table w-full text-right divide-y divide-[#243049]/60">
                  <thead className="bg-[#0B1220] text-[#7B8DA8] text-[11px] font-semibold">
                    <tr>
                      <th className="py-3 px-4">الوقت والتاريخ</th>
                      <th className="py-3 px-4">العملة</th>
                      <th className="py-3 px-4">مستوى التأثير</th>
                      <th className="py-3 px-4">الحدث الاقتصادي</th>
                      <th className="py-3 px-4 text-center">الفعلي (Actual)</th>
                      <th className="py-3 px-4 text-center">المتوقع (Forecast)</th>
                      <th className="py-3 px-4 text-center">السابق (Previous)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#243049]/40 text-xs font-mono">
                    {filteredEvents.map((ev) => (
                      <tr key={ev.id} className="hover:bg-[#162238] transition-colors">
                        <td className="py-3.5 px-4 font-bold text-[#A3B4D0] whitespace-nowrap">
                          {ev.time}
                        </td>
                        <td className="py-3.5 px-4 font-bold">
                          <span className="px-2 py-0.5 rounded bg-[#0B1220] border border-[#243049] text-white">
                            {ev.currency}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-sans">{getImpactBadge(ev.impact)}</td>
                        <td className="py-3.5 px-4 font-sans font-bold text-[#E8EEF9]">
                          {ev.title}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-[#2DD4BF]">
                          {ev.actual || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center text-[#A3B4D0]">
                          {ev.forecast || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center text-[#64748B]">
                          {ev.previous || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile Card View (Part 1.6: no horizontal scroll) */}
                <div className="md:hidden space-y-2.5 p-3">
                  {filteredEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-xl bg-[#0E1626] border border-[#1E2E4A] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#0B1220] border border-[#243049] text-white font-mono font-bold text-xs">
                            {ev.currency}
                          </span>
                          <span className="text-[11px] text-[#A3B4D0] font-mono">{ev.time}</span>
                        </div>
                        <div>{getImpactBadge(ev.impact)}</div>
                      </div>

                      <div className="font-bold text-white text-xs leading-snug">{ev.title}</div>

                      <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono bg-[#070D18] p-2 rounded-lg border border-[#16233B]">
                        <div>
                          <span className="text-[#64748B] block text-[9px]">الفعلي</span>
                          <span className="font-bold text-[#2DD4BF]">{ev.actual || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[#64748B] block text-[9px]">المتوقع</span>
                          <span className="text-[#A3B4D0]">{ev.forecast || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[#64748B] block text-[9px]">السابق</span>
                          <span className="text-[#64748B]">{ev.previous || '—'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* 2.3 News Panel from /api/news */
        <div className="space-y-3">
          {isLoading ? (
            <div className="p-12 text-center text-[#7B8DA8] space-y-3 font-mono">
              <div className="w-8 h-8 rounded-full border-2 border-[#2DD4BF] border-t-transparent animate-spin mx-auto" />
              <p>جاري تحميل أخبار الأسواق العالمية...</p>
            </div>
          ) : newsList.length === 0 ? (
            <div className="p-12 text-center text-[#7B8DA8] bg-[#121A2B] rounded-xl border border-[#243049]">
              لا توجد أخبار حديثة حالياً من المصدر.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {newsList.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-4 rounded-xl bg-[#121A2B] border border-[#243049] hover:border-[#2DD4BF]/40 transition-all space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-[#7B8DA8]">
                      <span className="font-semibold text-[#2DD4BF]">{item.source}</span>
                      <span className="font-mono">{item.time}</span>
                    </div>
                    <h3 className="font-bold text-sm text-[#E8EEF9] leading-snug hover:text-[#2DD4BF] transition-colors">
                      {item.title}
                    </h3>
                    {item.summary && (
                      <p className="text-xs text-[#94A3B8] leading-relaxed line-clamp-2">
                        {item.summary}
                      </p>
                    )}
                  </div>

                  {item.symbols && item.symbols.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-2 border-t border-[#1C2A44]">
                      <span className="text-[10px] text-[#64748B]">الرموز المرتبطة:</span>
                      {item.symbols.map((sym) => (
                        <span
                          key={sym}
                          className="px-1.5 py-0.5 rounded bg-[#0B1220] border border-[#243049] font-mono text-[10px] text-[#A3B4D0]"
                        >
                          {sym}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
