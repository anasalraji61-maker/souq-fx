import React, { useMemo, useState } from 'react';
import { Compass, Play, Loader2, ArrowUpDown, ArrowUp, ArrowDown, LineChart, AlertTriangle, Info } from 'lucide-react';
import { MarketSymbol } from '../../types/market';
import { runScreener, ScreenerHit, ScreenerFilterId, SCREENER_FILTER_IDS, SCREENER_UNIVERSE, ScreenerRunResult } from '../../api/toolsApi';
import { LangId, gx, fmt, getIntlLocale, GxDict } from '../../i18n/locales';
import { EmptyState, ErrorState } from '../common/ScreenState';

interface MarketScreenerProps {
  symbols: MarketSymbol[];
  onSelectSymbolForChart: (sym: string) => void;
  currentLang?: LangId;
}

type Cat = keyof typeof SCREENER_UNIVERSE;
type SortKey = 'symbol' | 'last' | 'change_pct' | 'rsi' | 'matched';
const TIMEFRAMES = ['15m', '1H', '4H', 'D'] as const;
const STORE_KEY = 'matrix.tools.screener.v2';

function filterLabel(x: GxDict, f: string): string {
  const m: Record<string, string> = {
    rsi_oversold: x.t_fRsiOversold,
    rsi_overbought: x.t_fRsiOverbought,
    ma_cross_up: x.t_fMaUp,
    ma_cross_down: x.t_fMaDown,
    macd_cross_up: x.t_fMacdUp,
    bullish: x.t_fBullish,
    bearish: x.t_fBearish,
  };
  return m[f] || f;
}

function loadSaved(): { cats: Cat[]; filters: ScreenerFilterId[]; tf: string } {
  try {
    const v = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (v && Array.isArray(v.cats) && Array.isArray(v.filters)) {
      return {
        cats: v.cats.filter((c: string) => c in SCREENER_UNIVERSE),
        filters: v.filters.filter((f: string) => (SCREENER_FILTER_IDS as readonly string[]).includes(f)),
        tf: TIMEFRAMES.includes(v.tf) ? v.tf : '1H',
      };
    }
  } catch {
    // ignore
  }
  return { cats: ['forex', 'metals'], filters: ['rsi_oversold', 'rsi_overbought'], tf: '1H' };
}

function priceText(v: number | null, sym: string): string {
  if (v === null) return '—';
  const d = sym.endsWith('JPY') ? 3 : sym === 'XAUUSD' || sym.endsWith('OIL') ? 2 : sym === 'XAGUSD' ? 3 : 5;
  return v.toFixed(d);
}

const Th: React.FC<{ k: SortKey; label: string; end?: boolean; sort: { key: SortKey; dir: 1 | -1 }; sortBy: (k: SortKey) => void }> = ({ k, label, end, sort, sortBy }) => (
  <th scope="col" className={`px-3 py-2 font-semibold ${end ? 'text-end' : 'text-start'}`} aria-sort={sort.key === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
    <button onClick={() => sortBy(k)} className={`inline-flex items-center gap-1 cursor-pointer hover:text-white ${sort.key === k ? 'text-[#2DD4BF]' : ''}`} data-testid={`sort-${k}`}>
      {label}
      {sort.key === k ? sort.dir === 1 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" /> : <ArrowUpDown className="w-3 h-3 opacity-50" />}
    </button>
  </th>
);


export const MarketScreener: React.FC<MarketScreenerProps> = ({ onSelectSymbolForChart, currentLang = 'ar' }) => {
  const x = gx(currentLang);
  const saved = useMemo(loadSaved, []);
  const [cats, setCats] = useState<Cat[]>(saved.cats.length ? saved.cats : ['forex']);
  const [filters, setFilters] = useState<ScreenerFilterId[]>(saved.filters.length ? saved.filters : ['rsi_oversold']);
  const [tf, setTf] = useState<string>(saved.tf);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<ScreenerRunResult | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'change_pct', dir: -1 });

  const universe = cats.flatMap((c) => SCREENER_UNIVERSE[c]);
  const canRun = universe.length > 0 && filters.length > 0 && !busy;

  const persist = (c: Cat[], f: ScreenerFilterId[], t: string) => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ cats: c, filters: f, tf: t }));
    } catch {
      // ignore
    }
  };

  const run = async () => {
    if (!canRun) return;
    setBusy(true);
    persist(cats, filters, tf);
    const r = await runScreener({ timeframe: tf, filters, symbols: universe });
    setRes(r);
    setBusy(false);
  };

  const rows = useMemo(() => {
    if (!res) return [];
    const val = (h: ScreenerHit): number | string | null => {
      if (sort.key === 'symbol') return h.symbol;
      if (sort.key === 'matched') return h.filters_matched.length;
      if (sort.key === 'change_pct') return h.change_pct;
      return h[sort.key];
    };
    return [...res.results].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      if (va === null && vb === null) return 0;
      if (va === null) return 1; // missing values always last
      if (vb === null) return -1;
      if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb) * sort.dir;
      return ((va as number) - (vb as number)) * sort.dir;
    });
  }, [res, sort]);

  const sortBy = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === 'symbol' ? 1 : -1 }));

  const chip = (active: boolean) =>
    `shrink-0 min-h-[36px] px-3 rounded-full text-[12px] font-semibold border cursor-pointer ${
      active ? 'bg-[#2DD4BF] text-[#042F2E] border-transparent' : 'border-[#24344E] text-[#A3B4D0] hover:text-white'
    }`;
  const timeFmt = new Intl.DateTimeFormat(getIntlLocale(currentLang), { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short', numberingSystem: 'latn' });

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4" data-testid="screener">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-[#2DD4BF]/10 text-[#2DD4BF]">
          <Compass className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[#E8EEF9]">{x.t_scrTitle}</h2>
          <p className="text-[12px] text-[#7B8DA8]">{x.t_scrSub}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-[#121A2B] border border-[#243049] p-3 space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar" role="group" aria-label={x.t_markets}>
          <span className="text-[11px] text-[#64748B] shrink-0 w-20">{x.t_markets}</span>
          {(Object.keys(SCREENER_UNIVERSE) as Cat[]).map((c) => (
            <button
              key={c}
              aria-pressed={cats.includes(c)}
              onClick={() => setCats((l) => (l.includes(c) ? l.filter((i) => i !== c) : [...l, c]))}
              className={chip(cats.includes(c))}
              data-testid={`cat-${c}`}
            >
              {c === 'forex' ? x.t_catForex : c === 'metals' ? x.t_catMetals : x.t_catEnergy} · {SCREENER_UNIVERSE[c].length}
            </button>
          ))}
          <span className="shrink-0 min-h-[36px] px-3 rounded-full text-[12px] border border-dashed border-[#24344E] text-[#64748B] flex items-center" title={x.t_catIndicesNA}>
            {x.t_catIndices} — {x.t_unavailable}
          </span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar" role="group" aria-label={x.t_conditions}>
          <span className="text-[11px] text-[#64748B] shrink-0 w-20">{x.t_conditions}</span>
          {SCREENER_FILTER_IDS.map((f) => (
            <button
              key={f}
              aria-pressed={filters.includes(f)}
              onClick={() => setFilters((l) => (l.includes(f) ? l.filter((i) => i !== f) : [...l, f]))}
              className={chip(filters.includes(f))}
              data-testid={`flt-${f}`}
            >
              {filterLabel(x, f)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-[#64748B] shrink-0 w-20">{x.t_timeframe}</span>
          {TIMEFRAMES.map((t) => (
            <button key={t} aria-pressed={tf === t} onClick={() => setTf(t)} className={`${chip(tf === t)} font-mono`}>
              {t}
            </button>
          ))}
          <button
            onClick={() => void run()}
            disabled={!canRun}
            className="ms-auto min-h-[42px] px-5 rounded-xl bg-[#2DD4BF] text-[#042F2E] text-[13px] font-bold flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            data-testid="run-screener"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {busy ? x.t_scanning : fmt(x.t_scanN, { n: universe.length })}
          </button>
        </div>
        <p className="text-[11px] text-[#64748B] flex gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {filters.length === 0 ? x.t_pickCondition : x.t_scrNote}
        </p>
      </div>

      {!res ? (
        <EmptyState currentLang={currentLang} icon={<Compass className="w-6 h-6 text-[#2DD4BF]" />} title={x.t_scrIdleTitle} message={x.t_scrIdleText} />
      ) : !res.ok ? (
        <ErrorState currentLang={currentLang} title={x.t_scrErrTitle} message={res.isOffline ? x.g_networkError : x.g_serverError} onRetry={() => void run()} />
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#A3B4D0]" data-testid="scr-summary">
            <span>{fmt(x.t_scrSummary, { hits: res.results.length, scanned: res.scanned, total: res.total })}</span>
            {res.failed.length > 0 && (
              <span className="text-amber-300 flex items-center gap-1" title={res.failed.join(', ')}>
                <AlertTriangle className="w-3.5 h-3.5" /> {fmt(x.t_scrFailed, { n: res.failed.length })}
              </span>
            )}
            {res.provider_configured === false && <span className="text-amber-300">{x.t_noProvider}</span>}
          </div>
          {rows.length === 0 ? (
            <EmptyState currentLang={currentLang} title={x.t_scrNoHitsTitle} message={x.t_scrNoHitsText} />
          ) : (
            <div className="rounded-2xl border border-[#243049] bg-[#0E1626] overflow-x-auto">
              <table className="w-full min-w-[640px] text-[13px]" data-testid="scr-table">
                <thead className="text-[11px] text-[#7B8DA8] border-b border-[#1E283D]">
                  <tr>
                    <Th sort={sort} sortBy={sortBy} k="symbol" label={x.t_colSymbol} />
                    <Th sort={sort} sortBy={sortBy} k="last" label={x.t_colLast} end />
                    <Th sort={sort} sortBy={sortBy} k="change_pct" label={x.t_colChange} end />
                    <Th sort={sort} sortBy={sortBy} k="rsi" label="RSI 14" end />
                    <Th sort={sort} sortBy={sortBy} k="matched" label={x.t_colMatched} />
                    <th scope="col" className="px-3 py-2 text-start font-semibold">
                      {x.t_colDataTime}
                    </th>
                    <th scope="col" className="px-3 py-2">
                      <span className="sr-only">{x.t_openChart}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((h) => (
                    <tr key={h.symbol} className="border-b border-[#1E283D]/60 last:border-b-0 hover:bg-[#13213A]/50" data-testid="scr-row">
                      <td className="px-3 py-2.5 font-mono font-bold text-white" dir="ltr">
                        {h.symbol}
                      </td>
                      <td className="px-3 py-2.5 text-end font-mono text-[#CBD5E1]" dir="ltr">
                        {priceText(h.last, h.symbol)}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-end font-mono ${
                          h.change_pct === null ? 'text-[#64748B]' : h.change_pct > 0 ? 'text-emerald-300' : h.change_pct < 0 ? 'text-rose-300' : 'text-[#CBD5E1]'
                        }`}
                        dir="ltr"
                      >
                        {h.change_pct === null ? '—' : `${h.change_pct > 0 ? '+' : ''}${h.change_pct.toFixed(2)}%`}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-end font-mono ${
                          h.rsi === null ? 'text-[#64748B]' : h.rsi <= 30 ? 'text-emerald-300' : h.rsi >= 70 ? 'text-rose-300' : 'text-[#CBD5E1]'
                        }`}
                        dir="ltr"
                      >
                        {h.rsi === null ? '—' : h.rsi.toFixed(1)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {h.filters_matched.length === 0
                            ? '—'
                            : h.filters_matched.map((f) => (
                                <span key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-[#1C2740] text-[#A3B4D0]">
                                  {filterLabel(x, f)}
                                </span>
                              ))}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-[#7B8DA8]" dir="ltr">
                        {h.price_as_of ? timeFmt.format(new Date(h.price_as_of * 1000)) : '—'}
                        {h.data_kind === 'cache' && <span className="ms-1 text-amber-300">({x.t_cached})</span>}
                      </td>
                      <td className="px-3 py-2.5 text-end">
                        <button
                          onClick={() => onSelectSymbolForChart(h.symbol)}
                          className="min-h-[34px] px-2.5 rounded-lg bg-[#1C2740] text-[#2DD4BF] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer hover:bg-[#233554]"
                        >
                          <LineChart className="w-3.5 h-3.5" /> {x.t_openChart}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[11px] text-[#64748B]">{x.t_scrEdu}</p>
        </div>
      )}
    </div>
  );
};
