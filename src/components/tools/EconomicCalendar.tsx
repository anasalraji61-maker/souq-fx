import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, RefreshCw, AlertTriangle, Flame } from 'lucide-react';
import { getEconomicCalendar, EconomicCalendarEvent, CalendarImpact } from '../../api/toolsApi';
import { LangId, gx, fmt, getIntlLocale, GxDict } from '../../i18n/locales';
import { LoadingSkeleton, EmptyState, ErrorState } from '../common/ScreenState';

type Range = 'today' | 'tomorrow' | 'week';
const IMPACTS: ('high' | 'medium' | 'low')[] = ['high', 'medium', 'low'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF', 'CNY'];
const STORE_KEY = 'matrix.tools.calendar.v2';

function utcOffsetLabel(): string {
  const m = -new Date().getTimezoneOffset();
  const sign = m >= 0 ? '+' : '-';
  const a = Math.abs(m);
  const h = Math.floor(a / 60);
  const mm = a % 60;
  return `UTC${sign}${h}${mm ? ':' + String(mm).padStart(2, '0') : ''}`;
}

function startOfDay(d: Date): number {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c.getTime();
}

function impactStyle(i: CalendarImpact): { dot: string; chip: string } {
  switch (i) {
    case 'high':
      return { dot: 'bg-rose-500', chip: 'bg-rose-500/15 text-rose-300 border-rose-500/40' };
    case 'medium':
      return { dot: 'bg-amber-400', chip: 'bg-amber-500/15 text-amber-300 border-amber-500/40' };
    case 'low':
      return { dot: 'bg-yellow-200/70', chip: 'bg-yellow-200/10 text-yellow-100 border-yellow-200/30' };
    default:
      return { dot: 'bg-slate-500', chip: 'bg-slate-500/15 text-slate-300 border-slate-500/30' };
  }
}

function impactLabel(x: GxDict, i: CalendarImpact): string {
  return i === 'high' ? x.t_impHigh : i === 'medium' ? x.t_impMed : i === 'low' ? x.t_impLow : i === 'holiday' ? x.t_impHoliday : x.t_impNone;
}

function countdown(ms: number, x: GxDict): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const hms = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return d > 0 ? fmt(x.t_inDays, { d, t: hms }) : hms;
}

interface Saved {
  impacts: string[];
  currencies: string[];
  range: Range;
}

function loadSaved(): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (v && Array.isArray(v.impacts) && Array.isArray(v.currencies)) {
      return { impacts: v.impacts, currencies: v.currencies, range: ['today', 'tomorrow', 'week'].includes(v.range) ? v.range : 'week' };
    }
  } catch {
    // ignore
  }
  return { impacts: ['high', 'medium'], currencies: [], range: 'week' };
}

export const EconomicCalendar: React.FC<{ currentLang?: LangId }> = ({ currentLang = 'ar' }) => {
  const x = gx(currentLang);
  const locale = getIntlLocale(currentLang);
  const saved = useMemo(loadSaved, []);
  const [events, setEvents] = useState<EconomicCalendarEvent[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'unavailable'>('loading');
  const [asOf, setAsOf] = useState<number | null>(null);
  const [stale, setStale] = useState(false);
  const [impacts, setImpacts] = useState<string[]>(saved.impacts);
  const [currencies, setCurrencies] = useState<string[]>(saved.currencies);
  const [range, setRange] = useState<Range>(saved.range);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    setState((s) => (s === 'ready' ? s : 'loading'));
    const r = await getEconomicCalendar();
    if (!r.ok) {
      setState('error');
      return;
    }
    setEvents(r.events);
    setAsOf(r.as_of);
    setStale(r.stale);
    setState(r.status === 'unavailable' && r.events.length === 0 ? 'unavailable' : 'ready');
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 10 * 60 * 1000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ impacts, currencies, range }));
    } catch {
      // ignore
    }
  }, [impacts, currencies, range]);

  const toggle = (list: string[], v: string, set: (l: string[]) => void) =>
    set(list.includes(v) ? list.filter((i) => i !== v) : [...list, v]);

  const today0 = startOfDay(new Date(now));
  const tomorrow0 = today0 + 86400000;
  const after0 = tomorrow0 + 86400000;

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (impacts.length > 0) {
        const imp = e.impact === 'holiday' || e.impact === 'none' ? 'low' : e.impact;
        if (!impacts.includes(imp)) return false;
      }
      if (currencies.length > 0 && !currencies.includes(e.currency) && e.currency !== 'ALL') return false;
      if (range !== 'week') {
        if (e.ts === null) return false;
        const t = e.ts * 1000;
        if (range === 'today' && !(t >= today0 && t < tomorrow0)) return false;
        if (range === 'tomorrow' && !(t >= tomorrow0 && t < after0)) return false;
      }
      return true;
    });
  }, [events, impacts, currencies, range, today0, tomorrow0, after0]);

  // Next high-impact event (respects the currency filter only).
  const nextHigh = useMemo(() => {
    return events
      .filter((e) => e.impact === 'high' && e.ts !== null && !e.time_tbd && e.ts * 1000 > now)
      .filter((e) => currencies.length === 0 || currencies.includes(e.currency) || e.currency === 'ALL')
      .sort((a, b) => (a.ts as number) - (b.ts as number))[0];
  }, [events, now, currencies]);

  const groups = useMemo(() => {
    const out: { key: string; label: string; items: EconomicCalendarEvent[] }[] = [];
    const dayFmt = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', numberingSystem: 'latn' });
    filtered.forEach((e) => {
      let key = 'nodate';
      let label = x.t_noDate;
      if (e.ts !== null) {
        const d = new Date(e.ts * 1000);
        const s0 = startOfDay(d);
        key = String(s0);
        label = s0 === today0 ? `${x.g_today} — ${dayFmt.format(d)}` : s0 === tomorrow0 ? `${x.g_tomorrow} — ${dayFmt.format(d)}` : dayFmt.format(d);
      }
      const g = out.find((o) => o.key === key);
      if (g) g.items.push(e);
      else out.push({ key, label, items: [e] });
    });
    return out;
  }, [filtered, locale, x, today0, tomorrow0]);

  const timeFmt = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', numberingSystem: 'latn' });
  const timeOf = (e: EconomicCalendarEvent) => (e.ts === null ? '—' : e.time_tbd ? x.t_allDay : timeFmt.format(new Date(e.ts * 1000)));

  const chip = (active: boolean) =>
    `shrink-0 min-h-[34px] px-3 rounded-full text-[12px] font-semibold border cursor-pointer transition-colors ${
      active ? 'bg-[#2DD4BF] text-[#042F2E] border-transparent' : 'border-[#24344E] text-[#A3B4D0] hover:text-white'
    }`;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4" data-testid="calendar">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[#2DD4BF]/10 text-[#2DD4BF]">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#E8EEF9]">{x.t_calTitle}</h2>
            <p className="text-[12px] text-[#7B8DA8] flex items-center gap-1" data-testid="tz-label">
              <Clock className="w-3.5 h-3.5" /> {fmt(x.t_tzNote, { tz: utcOffsetLabel() })}
            </p>
          </div>
        </div>
        <div
          className="rounded-2xl border border-rose-500/40 bg-gradient-to-l from-[#2A0F14] to-[#121A2B] px-4 py-2.5 flex items-center gap-3 min-w-0"
          data-testid="next-high"
        >
          <Flame className="w-5 h-5 text-rose-400 shrink-0" />
          {nextHigh ? (
            <div className="min-w-0">
              <div className="text-[11px] text-rose-200/80">{x.t_nextHigh}</div>
              <div className="text-[13px] font-bold text-white truncate max-w-[260px]" dir="ltr">
                {nextHigh.currency ? `${nextHigh.currency} · ` : ''}
                {nextHigh.title}
              </div>
              <div className="font-mono text-lg font-black text-rose-300 tabular-nums" dir="ltr" data-testid="countdown">
                {countdown((nextHigh.ts as number) * 1000 - now, x)}
              </div>
            </div>
          ) : (
            <div className="text-[12px] text-[#A3B4D0]">{state === 'ready' ? x.t_noNextHigh : '—'}</div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-[#121A2B] border border-[#243049] p-3 space-y-2.5">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar" role="group" aria-label={x.t_filterDate}>
          <span className="text-[11px] text-[#64748B] shrink-0 w-16">{x.t_filterDate}</span>
          {(['today', 'tomorrow', 'week'] as Range[]).map((r) => (
            <button key={r} onClick={() => setRange(r)} aria-pressed={range === r} className={chip(range === r)} data-testid={`range-${r}`}>
              {r === 'today' ? x.g_today : r === 'tomorrow' ? x.g_tomorrow : x.t_thisWeek}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar" role="group" aria-label={x.t_filterImpact}>
          <span className="text-[11px] text-[#64748B] shrink-0 w-16">{x.t_filterImpact}</span>
          {IMPACTS.map((i) => (
            <button
              key={i}
              onClick={() => toggle(impacts, i, setImpacts)}
              aria-pressed={impacts.includes(i)}
              className={`${chip(impacts.includes(i))} flex items-center gap-1.5`}
              data-testid={`imp-${i}`}
            >
              <span className={`w-2 h-2 rounded-full ${impactStyle(i).dot}`} />
              {impactLabel(x, i)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar" role="group" aria-label={x.t_filterCurrency}>
          <span className="text-[11px] text-[#64748B] shrink-0 w-16">{x.t_filterCurrency}</span>
          <button onClick={() => setCurrencies([])} aria-pressed={currencies.length === 0} className={chip(currencies.length === 0)}>
            {x.g_all}
          </button>
          {CURRENCIES.map((c) => (
            <button
              key={c}
              onClick={() => toggle(currencies, c, setCurrencies)}
              aria-pressed={currencies.includes(c)}
              className={`${chip(currencies.includes(c))} font-mono`}
              data-testid={`cur-${c}`}
            >
              {c}
            </button>
          ))}
          <button
            onClick={() => void load()}
            aria-label={x.g_refresh}
            className="ms-auto shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[#94A3B8] hover:text-white hover:bg-[#1C2740] cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {stale && asOf && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-[12px] text-amber-200 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {fmt(x.t_calStale, { t: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(asOf * 1000)) })}
        </div>
      )}

      {state === 'loading' ? (
        <LoadingSkeleton rows={6} />
      ) : state === 'error' ? (
        <ErrorState currentLang={currentLang} title={x.t_calErrTitle} message={x.g_networkError} onRetry={() => void load()} />
      ) : state === 'unavailable' ? (
        <ErrorState currentLang={currentLang} title={x.t_calUnavailTitle} message={x.t_calUnavailText} onRetry={() => void load()} />
      ) : filtered.length === 0 ? (
        <EmptyState currentLang={currentLang} title={x.t_calEmptyTitle} message={x.t_calEmptyText} />
      ) : (
        <div className="rounded-2xl border border-[#243049] bg-[#0E1626]" data-testid="cal-list">
          {/* desktop header */}
          <div className="hidden md:grid grid-cols-[90px_70px_110px_minmax(0,1fr)_90px_90px_90px] gap-2 px-4 py-2 text-[11px] text-[#64748B] border-b border-[#1E283D]">
            <span>{x.t_colTime}</span>
            <span>{x.t_colCur}</span>
            <span>{x.t_colImpact}</span>
            <span>{x.t_colEvent}</span>
            <span className="text-end">{x.t_colActual}</span>
            <span className="text-end">{x.t_colForecast}</span>
            <span className="text-end">{x.t_colPrevious}</span>
          </div>
          {groups.map((g) => (
            <section key={g.key} aria-label={g.label}>
              <h3
                className="sticky top-[57px] z-10 px-4 py-2 text-[12px] font-bold text-[#E8EEF9] bg-[#13213A]/95 backdrop-blur border-y border-[#1E283D]"
                data-testid="cal-day"
              >
                {g.label} <span className="text-[#64748B] font-normal">· {g.items.length}</span>
              </h3>
              <ul>
                {g.items.map((e) => {
                  const past = e.ts !== null && !e.time_tbd && e.ts * 1000 < now;
                  const st = impactStyle(e.impact);
                  return (
                    <li
                      key={e.id}
                      className={`border-b border-[#1E283D]/60 last:border-b-0 ${past ? 'opacity-55' : ''}`}
                      data-testid="cal-event"
                    >
                      {/* desktop row */}
                      <div className="hidden md:grid grid-cols-[90px_70px_110px_minmax(0,1fr)_90px_90px_90px] gap-2 px-4 py-2.5 items-center text-[13px]">
                        <span className="font-mono text-[#CBD5E1]" dir="ltr">
                          {timeOf(e)}
                        </span>
                        <span className="font-mono font-bold text-[#E8EEF9]">{e.currency || '—'}</span>
                        <span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border ${st.chip}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {impactLabel(x, e.impact)}
                          </span>
                        </span>
                        <span className="text-[#E8EEF9] truncate" dir="ltr" title={e.title}>
                          {e.title}
                        </span>
                        <span className="text-end font-mono font-bold text-white" dir="ltr">
                          {e.actual ?? '—'}
                        </span>
                        <span className="text-end font-mono text-[#A3B4D0]" dir="ltr">
                          {e.forecast ?? '—'}
                        </span>
                        <span className="text-end font-mono text-[#7B8DA8]" dir="ltr">
                          {e.previous ?? '—'}
                        </span>
                      </div>
                      {/* phone card */}
                      <div className="md:hidden px-3 py-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[13px] text-[#CBD5E1]" dir="ltr">
                              {timeOf(e)}
                            </span>
                            <span className="font-mono text-[12px] font-bold text-white px-1.5 py-0.5 rounded bg-[#1C2740]">
                              {e.currency || '—'}
                            </span>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border ${st.chip}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {impactLabel(x, e.impact)}
                          </span>
                        </div>
                        <div className="text-[13px] text-[#E8EEF9] text-start" dir="ltr">
                          {e.title}
                        </div>
                        <dl className="grid grid-cols-3 gap-1.5 text-center">
                          {(
                            [
                              [x.t_colActual, e.actual, 'text-white font-bold'],
                              [x.t_colForecast, e.forecast, 'text-[#A3B4D0]'],
                              [x.t_colPrevious, e.previous, 'text-[#7B8DA8]'],
                            ] as const
                          ).map(([k, v, tone]) => (
                            <div key={k} className="rounded-lg bg-[#0B1220] border border-[#1E283D] py-1">
                              <dt className="text-[10px] text-[#64748B]">{k}</dt>
                              <dd className={`font-mono text-[12px] ${tone}`} dir="ltr">
                                {v ?? '—'}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
      <p className="text-[11px] text-[#64748B]">{x.t_calSource}</p>
    </div>
  );
};
