import React, { useState } from 'react';
import { ECONOMIC_EVENTS } from '../../data/calendarData';
import { Calendar, AlertTriangle, Filter, Clock } from 'lucide-react';

export const EconomicCalendar: React.FC = () => {
  const [impactFilter, setImpactFilter] = useState<'all' | 'high' | 'medium'>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');

  const filteredEvents = ECONOMIC_EVENTS.filter((ev) => {
    const matchesImpact = impactFilter === 'all' || ev.impact === impactFilter;
    const matchesCurrency = currencyFilter === 'all' || ev.currency === currencyFilter;
    return matchesImpact && matchesCurrency;
  });

  const getImpactBadge = (impact: 'high' | 'medium' | 'low') => {
    switch (impact) {
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-[#FB7185] border border-rose-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FB7185] animate-pulse" />
            تأثير قوي
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-[#F59E0B] border border-amber-500/30">
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
    <div className="p-6 max-w-5xl mx-auto space-y-6 select-none text-xs">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#243049]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#E8EEF9]">التقويم الاقتصادي الحي (Economic Calendar)</h2>
            <p className="text-[#7B8DA8]">مفكرة الأخبار والبيانات المؤثرة على حركة السيولة وأزواج العملات.</p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2">
          {/* Impact Filter */}
          <div className="flex items-center bg-[#121A2B] p-0.5 rounded-lg border border-[#243049]">
            <button
              onClick={() => setImpactFilter('all')}
              className={`px-2.5 py-1 rounded text-[11px] ${
                impactFilter === 'all' ? 'bg-[#2DD4BF] text-[#042F2E] font-bold' : 'text-[#A3B4D0]'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setImpactFilter('high')}
              className={`px-2.5 py-1 rounded text-[11px] ${
                impactFilter === 'high' ? 'bg-rose-500 text-white font-bold' : 'text-[#A3B4D0]'
              }`}
            >
              أخبار قوية
            </button>
          </div>

          {/* Currency Filter */}
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            className="bg-[#121A2B] border border-[#243049] rounded-lg px-2.5 py-1 text-[#E8EEF9] focus:outline-none"
          >
            <option value="all">كل العملات</option>
            <option value="USD">USD (الدولار)</option>
            <option value="EUR">EUR (اليورو)</option>
            <option value="GBP">GBP (الباوند)</option>
            <option value="JPY">JPY (الين)</option>
            <option value="AUD">AUD (الأسترالي)</option>
          </select>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-[#121A2B] rounded-xl border border-[#243049] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right divide-y divide-[#243049]/60">
            <thead className="bg-[#0B1220] text-[#7B8DA8] text-[11px] font-semibold">
              <tr>
                <th className="py-2.5 px-4">الوقت واليوم</th>
                <th className="py-2.5 px-4">العملة</th>
                <th className="py-2.5 px-4">التأثير</th>
                <th className="py-2.5 px-4">الحدث الاقتصادي</th>
                <th className="py-2.5 px-4 text-center">الفعلي</th>
                <th className="py-2.5 px-4 text-center">التقديري</th>
                <th className="py-2.5 px-4 text-center">السابق</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#243049]/40 text-xs">
              {filteredEvents.map((ev) => (
                <tr key={ev.id} className="hover:bg-[#162033]/60 transition-colors">
                  <td className="py-3 px-4 font-mono text-[#A3B4D0]">
                    <div className="font-semibold text-[#E8EEF9]">{ev.time}</div>
                    <div className="text-[10px] text-[#7B8DA8]">{ev.date}</div>
                  </td>
                  <td className="py-3 px-4 font-bold text-[#38BDF8]">
                    {ev.currency}
                  </td>
                  <td className="py-3 px-4">
                    {getImpactBadge(ev.impact)}
                  </td>
                  <td className="py-3 px-4 font-medium text-[#E8EEF9]">
                    {ev.event}
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold">
                    {ev.actual ? (
                      <span className="text-[#22C55E] bg-emerald-500/10 px-2 py-0.5 rounded">
                        {ev.actual}
                      </span>
                    ) : (
                      <span className="text-[#7B8DA8] italic">قيد الانتظار</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-[#A3B4D0]">
                    {ev.forecast}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-[#7B8DA8]">
                    {ev.previous}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
