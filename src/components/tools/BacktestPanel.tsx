import React, { useMemo, useState } from 'react';
import { FlaskConical, Play, Loader2, AlertTriangle, Info, TrendingUp, TrendingDown } from 'lucide-react';
import { MarketSymbol } from '../../types/market';
import { runBacktest, BacktestResult, BacktestStrategy, SCREENER_UNIVERSE } from '../../api/toolsApi';
import { LangId, gx, fmt, getIntlLocale, GxDict } from '../../i18n/locales';
import { ErrorState, EmptyState } from '../common/ScreenState';

interface BacktestPanelProps {
  symbols: MarketSymbol[];
  currentLang?: LangId;
}

const STRATEGIES: BacktestStrategy[] = ['ma_cross', 'rsi_reversal', 'macd_cross', 'bb_bounce'];
const TIMEFRAMES = ['15m', '30m', '1H', '4H', 'D'];
const ALL_SYMBOLS = [...SCREENER_UNIVERSE.forex, ...SCREENER_UNIVERSE.metals, ...SCREENER_UNIVERSE.energy];

function stratText(x: GxDict, s: BacktestStrategy): { name: string; desc: string } {
  switch (s) {
    case 'ma_cross':
      return { name: x.t_stMa, desc: x.t_stMaDesc };
    case 'rsi_reversal':
      return { name: x.t_stRsi, desc: x.t_stRsiDesc };
    case 'macd_cross':
      return { name: x.t_stMacd, desc: x.t_stMacdDesc };
    default:
      return { name: x.t_stBb, desc: x.t_stBbDesc };
  }
}

function priceFmt(v: number, sym: string): string {
  if (!Number.isFinite(v)) return '—';
  const d = sym.endsWith('JPY') ? 3 : sym === 'XAUUSD' || sym.endsWith('OIL') ? 2 : sym === 'XAGUSD' ? 3 : 5;
  return v.toFixed(d);
}

function pct(v: number | null, sign = false): string {
  if (v === null || !Number.isFinite(v)) return '—';
  return `${sign && v > 0 ? '+' : ''}${v.toFixed(2)}%`;
}

/** Equity curve as an SVG polyline, with the 100 start line. */
export const EquityCurve: React.FC<{ points: number[]; label: string }> = ({ points, label }) => {
  const W = 640;
  const H = 200;
  const pad = 8;
  if (points.length < 2) return null;
  const min = Math.min(100, ...points);
  const max = Math.max(100, ...points);
  const span = max - min || 1;
  const xAt = (i: number) => pad + (i / (points.length - 1)) * (W - 2 * pad);
  const yAt = (v: number) => pad + (1 - (v - min) / span) * (H - 2 * pad);
  const line = points.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(' ');
  const area = `${xAt(0)},${H - pad} ${line} ${xAt(points.length - 1)},${H - pad}`;
  const up = points[points.length - 1] >= 100;
  const color = up ? '#34D399' : '#FB7185';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-48" role="img" aria-label={label} preserveAspectRatio="none" data-testid="equity-svg" style={{ direction: 'ltr' }}>
      <defs>
        <linearGradient id="eqfill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={pad} x2={W - pad} y1={yAt(100)} y2={yAt(100)} stroke="#475569" strokeDasharray="4 4" strokeWidth="1" />
      <polygon points={area} fill="url(#eqfill)" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <text x={W - pad} y={yAt(100) - 4} textAnchor="end" fontSize="11" fill="#94A3B8">
        100
      </text>
    </svg>
  );
};

const ParamField: React.FC<{ id: string; label: string; help: string; value: string; onChange: (v: string) => void; err?: string }> = ({
  id,
  label,
  help,
  value,
  onChange,
  err,
}) => (
  <div className="space-y-1">
    <label htmlFor={id} className="block text-[12px] text-[#A3B4D0] font-semibold">
      {label}
    </label>
    <input
      id={id}
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full min-h-[42px] rounded-xl bg-[#0B1220] border px-3 text-sm text-[#E8EEF9] font-mono outline-none focus:border-[#2DD4BF] ${
        err ? 'border-rose-500/70' : 'border-[#24344E]'
      }`}
      dir="ltr"
    />
    {err ? <p className="text-[11px] text-rose-300" role="alert">{err}</p> : <p className="text-[11px] text-[#64748B] leading-relaxed">{help}</p>}
  </div>
);

export const BacktestPanel: React.FC<BacktestPanelProps> = ({ currentLang = 'ar' }) => {
  const x = gx(currentLang);
  const [symbol, setSymbol] = useState('EURUSD');
  const [tf, setTf] = useState('1H');
  const [strategy, setStrategy] = useState<BacktestStrategy>('ma_cross');
  const [fast, setFast] = useState('9');
  const [slow, setSlow] = useState('21');
  const [rsiLow, setRsiLow] = useState('30');
  const [rsiHigh, setRsiHigh] = useState('70');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<BacktestResult | null>(null);

  const errs: Record<string, string> = {};
  const int = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : NaN);
  if (strategy === 'ma_cross') {
    const f = int(fast);
    const s = int(slow);
    if (!(f >= 2 && f <= 150)) errs.fast = fmt(x.t_errRange, { a: 2, b: 150 });
    if (!(s >= 2 && s <= 150)) errs.slow = fmt(x.t_errRange, { a: 2, b: 150 });
    if (!errs.fast && !errs.slow && f >= s) errs.slow = x.t_errSlowGtFast;
  }
  if (strategy === 'rsi_reversal') {
    const lo = int(rsiLow);
    const hi = int(rsiHigh);
    if (!(lo >= 1 && lo <= 99)) errs.rsiLow = fmt(x.t_errRange, { a: 1, b: 99 });
    if (!(hi >= 1 && hi <= 99)) errs.rsiHigh = fmt(x.t_errRange, { a: 1, b: 99 });
    if (!errs.rsiLow && !errs.rsiHigh && lo >= hi) errs.rsiHigh = x.t_errRsiOrder;
  }
  const valid = Object.keys(errs).length === 0;

  const run = async () => {
    if (!valid || busy) return;
    setBusy(true);
    const r = await runBacktest({
      symbol,
      timeframe: tf,
      strategy,
      fast: Number(fast) || 9,
      slow: Number(slow) || 21,
      rsi_low: Number(rsiLow) || 30,
      rsi_high: Number(rsiHigh) || 70,
    });
    setRes(r);
    setBusy(false);
  };

  const locale = getIntlLocale(currentLang);
  const dt = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', numberingSystem: 'latn' }),
    [locale]
  );
  const st = res?.stats ?? null;
  const card = (label: string, value: string, tone = 'text-[#E8EEF9]', hint?: string) => (
    <div className="rounded-xl bg-[#0B1220] border border-[#1E283D] p-3" title={hint}>
      <div className="text-[11px] text-[#7B8DA8]">{label}</div>
      <div className={`font-mono text-lg font-bold ${tone}`} dir="ltr">
        {value}
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4" data-testid="backtest">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-[#2DD4BF]/10 text-[#2DD4BF]">
          <FlaskConical className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[#E8EEF9]">{x.t_btTitle}</h2>
          <p className="text-[12px] text-[#7B8DA8]">{x.t_btSub}</p>
        </div>
      </div>

      <div className="rounded-xl bg-amber-500/10 border border-amber-500/40 p-3 text-[12px] text-amber-100 flex gap-2" data-testid="bt-warning">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-300" />
        <span>
          <strong>{x.t_btWarnTitle}</strong> {x.t_btWarnText}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4">
        {/* Form */}
        <div className="rounded-2xl bg-[#121A2B] border border-[#243049] p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="bt-symbol" className="block text-[12px] text-[#A3B4D0] font-semibold">
                {x.t_symbol}
              </label>
              <select id="bt-symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} className="w-full min-h-[42px] rounded-xl bg-[#0B1220] border border-[#24344E] px-3 text-sm text-[#E8EEF9] font-mono" dir="ltr">
                {ALL_SYMBOLS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="bt-tf" className="block text-[12px] text-[#A3B4D0] font-semibold">
                {x.t_timeframe}
              </label>
              <select id="bt-tf" value={tf} onChange={(e) => setTf(e.target.value)} className="w-full min-h-[42px] rounded-xl bg-[#0B1220] border border-[#24344E] px-3 text-sm text-[#E8EEF9] font-mono" dir="ltr">
                {TIMEFRAMES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-[11px] text-[#64748B] -mt-2">{x.t_btDataHelp}</p>

          <fieldset className="space-y-2">
            <legend className="text-[12px] text-[#A3B4D0] font-semibold mb-1.5">{x.t_strategy}</legend>
            {STRATEGIES.map((s) => {
              const t = stratText(x, s);
              return (
                <label
                  key={s}
                  className={`flex gap-2.5 p-3 rounded-xl border cursor-pointer ${
                    strategy === s ? 'border-[#2DD4BF]/70 bg-[#13283A]' : 'border-[#24344E] bg-[#0B1220] hover:border-[#475569]'
                  }`}
                  data-testid={`st-${s}`}
                >
                  <input type="radio" name="bt-strategy" checked={strategy === s} onChange={() => setStrategy(s)} className="mt-1 accent-[#2DD4BF]" />
                  <span>
                    <span className="block text-[13px] font-bold text-[#E8EEF9]">{t.name}</span>
                    <span className="block text-[11px] text-[#7B8DA8] leading-relaxed">{t.desc}</span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          {strategy === 'ma_cross' && (
            <div className="grid grid-cols-2 gap-3">
              <ParamField id="bt-fast" label={x.t_pFast} help={x.t_pFastHelp} value={fast} onChange={setFast} err={errs.fast} />
              <ParamField id="bt-slow" label={x.t_pSlow} help={x.t_pSlowHelp} value={slow} onChange={setSlow} err={errs.slow} />
            </div>
          )}
          {strategy === 'rsi_reversal' && (
            <div className="grid grid-cols-2 gap-3">
              <ParamField id="bt-rlo" label={x.t_pRsiLow} help={x.t_pRsiLowHelp} value={rsiLow} onChange={setRsiLow} err={errs.rsiLow} />
              <ParamField id="bt-rhi" label={x.t_pRsiHigh} help={x.t_pRsiHighHelp} value={rsiHigh} onChange={setRsiHigh} err={errs.rsiHigh} />
            </div>
          )}
          {(strategy === 'macd_cross' || strategy === 'bb_bounce') && (
            <p className="text-[11px] text-[#64748B] flex gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {strategy === 'macd_cross' ? x.t_pMacdFixed : x.t_pBbFixed}
            </p>
          )}

          <button
            onClick={() => void run()}
            disabled={!valid || busy}
            className="w-full min-h-[46px] rounded-xl bg-[#2DD4BF] text-[#042F2E] text-[13px] font-bold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            data-testid="run-backtest"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {busy ? x.t_btRunning : x.t_btRun}
          </button>
        </div>

        {/* Results */}
        <div className="space-y-3" aria-live="polite">
          {!res ? (
            <EmptyState currentLang={currentLang} icon={<FlaskConical className="w-6 h-6 text-[#2DD4BF]" />} title={x.t_btIdleTitle} message={x.t_btIdleText} />
          ) : res.error && !res.stats && res.data_kind !== 'demo' ? (
            <ErrorState
              currentLang={currentLang}
              title={x.t_btErrTitle}
              message={res.error === 'not enough candles' ? x.t_btNotEnough : res.isOffline ? x.g_networkError : x.g_serverError}
              onRetry={() => void run()}
            />
          ) : res.data_kind === 'demo' ? (
            <ErrorState currentLang={currentLang} title={x.t_btNoDataTitle} message={x.t_btNoDataText} onRetry={() => void run()} />
          ) : !st ? (
            <EmptyState currentLang={currentLang} title={x.t_btErrTitle} message={x.t_btNotEnough} />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="bt-cards">
                {card(x.t_kTrades, String(st.trade_count))}
                {card(x.t_kWinRate, st.win_rate === null ? '—' : `${st.win_rate.toFixed(1)}%`)}
                {card(
                  x.t_kReturn,
                  pct(st.total_return_pct, true),
                  st.total_return_pct === null ? undefined : st.total_return_pct >= 0 ? 'text-emerald-300' : 'text-rose-300'
                )}
                {card(x.t_kMaxDd, st.max_drawdown_pct === null ? '—' : `-${st.max_drawdown_pct.toFixed(2)}%`, 'text-rose-300', x.t_kMaxDdHelp)}
                {card(x.t_kAvgWin, pct(st.avg_win_pct, true), 'text-emerald-300')}
                {card(x.t_kAvgLoss, pct(st.avg_loss_pct), 'text-rose-300')}
                {card(x.t_kFinal, st.final_equity === null ? '—' : st.final_equity.toFixed(2), undefined, x.t_kFinalHelp)}
                {card(x.t_kOpen, pct(st.open_pnl_pct, true))}
              </div>
              <p className="text-[11px] text-[#7B8DA8]">
                {st.costs_included
                  ? fmt(x.t_btCostsIn, { s: st.spread_pips ?? '—' })
                  : x.t_btCostsOut}{' '}
                {st.ruined_at_trade ? fmt(x.t_btRuined, { n: st.ruined_at_trade }) : ''}
              </p>
              <div className="rounded-2xl bg-[#0E1626] border border-[#243049] p-3">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[13px] font-bold text-[#E8EEF9]">{x.t_equityCurve}</h3>
                  <span className="text-[11px] text-[#64748B]">{x.t_equityHelp}</span>
                </div>
                {res.equity_curve.length >= 2 ? (
                  <EquityCurve points={res.equity_curve} label={x.t_equityCurve} />
                ) : (
                  <p className="text-[12px] text-[#7B8DA8] py-6 text-center">{x.t_noTrades}</p>
                )}
              </div>
              <div className="rounded-2xl bg-[#0E1626] border border-[#243049]">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1E283D]">
                  <h3 className="text-[13px] font-bold text-[#E8EEF9]">{x.t_tradesTable}</h3>
                  {res.trades_truncated && <span className="text-[11px] text-[#64748B]">{x.t_last40}</span>}
                </div>
                {res.trades.length === 0 ? (
                  <p className="text-[12px] text-[#7B8DA8] py-6 text-center">{x.t_noTrades}</p>
                ) : (
                  <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                    <table className="w-full min-w-[560px] text-[12px]" data-testid="bt-trades">
                      <thead className="text-[11px] text-[#7B8DA8] sticky top-0 bg-[#0E1626]">
                        <tr>
                          <th className="px-3 py-2 text-start">{x.t_colSide}</th>
                          <th className="px-3 py-2 text-start">{x.t_colEntryTime}</th>
                          <th className="px-3 py-2 text-end">{x.t_colEntry}</th>
                          <th className="px-3 py-2 text-start">{x.t_colExitTime}</th>
                          <th className="px-3 py-2 text-end">{x.t_colExit}</th>
                          <th className="px-3 py-2 text-end">{x.t_colPnl}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...res.trades].reverse().map((t, i) => (
                          <tr key={`${t.entry_time}-${i}`} className="border-t border-[#1E283D]/60">
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center gap-1 ${t.side === 'long' ? 'text-emerald-300' : 'text-rose-300'}`}>
                                {t.side === 'long' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                {t.side === 'long' ? x.c_dirBuy : x.c_dirSell}
                                {t.open && <span className="text-[10px] text-amber-300">({x.t_open})</span>}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-[#A3B4D0]" dir="ltr">
                              {dt.format(new Date(t.entry_time * 1000))}
                            </td>
                            <td className="px-3 py-2 text-end font-mono" dir="ltr">
                              {priceFmt(t.entry, res.symbol)}
                            </td>
                            <td className="px-3 py-2 text-[#A3B4D0]" dir="ltr">
                              {dt.format(new Date(t.exit_time * 1000))}
                            </td>
                            <td className="px-3 py-2 text-end font-mono" dir="ltr">
                              {priceFmt(t.exit, res.symbol)}
                            </td>
                            <td className={`px-3 py-2 text-end font-mono font-bold ${t.pnl_pct > 0 ? 'text-emerald-300' : t.pnl_pct < 0 ? 'text-rose-300' : 'text-[#CBD5E1]'}`} dir="ltr">
                              {pct(t.pnl_pct, true)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
