import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, ChevronDown, AlertTriangle, Info, RotateCcw } from 'lucide-react';
import { MarketSymbol } from '../../types/market';
import { LangId, gx, fmt } from '../../i18n/locales';
import {
  CALC_SYMBOLS,
  conversionPair,
  pipValueMode,
  pipValuePerLot,
  positionSize,
  priceToPips,
  specFor,
} from './positionSize';

interface PositionSizeCalculatorProps {
  symbols: MarketSymbol[];
  activeSymbol: string;
  currentLang?: LangId;
}

const STORE_KEY = 'matrix.tools.possize.v2';

interface Saved {
  balance: string;
  riskPct: string;
  mode: 'pips' | 'price';
}

function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const v = JSON.parse(raw);
      return {
        balance: typeof v.balance === 'string' ? v.balance : '1000',
        riskPct: typeof v.riskPct === 'string' ? v.riskPct : '1',
        mode: v.mode === 'price' ? 'price' : 'pips',
      };
    }
  } catch {
    // ignore
  }
  return { balance: '1000', riskPct: '1', mode: 'pips' };
}

function parse(v: string): number | null {
  const s = v.replace(/,/g, '.').replace(/\s/g, '');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function money(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function priceDigits(sym: string): number {
  if (sym.endsWith('JPY')) return 3;
  if (sym === 'XAUUSD') return 2;
  if (sym === 'XAGUSD') return 3;
  return 5;
}

const Field: React.FC<{ id: string; label: string; hint?: string; err?: string; children: React.ReactNode }> = ({
  id,
  label,
  hint,
  err,
  children,
}) => (
  <div className="space-y-1">
    <label htmlFor={id} className="block text-[12px] text-[#A3B4D0] font-semibold">
      {label}
    </label>
    {children}
    {err ? (
      <p className="text-[11px] text-rose-300" role="alert" data-testid={`err-${id}`}>
        {err}
      </p>
    ) : hint ? (
      <p className="text-[11px] text-[#64748B]">{hint}</p>
    ) : null}
  </div>
);


export const PositionSizeCalculator: React.FC<PositionSizeCalculatorProps> = ({ symbols, activeSymbol, currentLang = 'ar' }) => {
  const x = gx(currentLang);
  const saved = useMemo(loadSaved, []);
  const [symbol, setSymbol] = useState(() => (specFor(activeSymbol) ? activeSymbol : 'EURUSD'));
  const [balance, setBalance] = useState(saved.balance);
  const [riskPct, setRiskPct] = useState(saved.riskPct);
  const [mode, setMode] = useState<'pips' | 'price'>(saved.mode);
  const [stopPips, setStopPips] = useState('20');
  const [tpPips, setTpPips] = useState('');
  const [entry, setEntry] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [tpPrice, setTpPrice] = useState('');
  const [pairPrice, setPairPrice] = useState('');
  const [convPrice, setConvPrice] = useState('');
  const [contract, setContract] = useState('');
  const [showHow, setShowHow] = useState(false);

  const spec = specFor(symbol) || CALC_SYMBOLS[0];
  const pvMode = pipValueMode(spec);
  const conv = conversionPair(spec.quote);
  const livePrice = (s: string) => {
    const m = symbols.find((q) => q.symbol === s);
    return m && m.price > 0 ? m.price : null;
  };

  // Prefill prices from the app's latest quotes when the symbol changes (always editable).
  useEffect(() => {
    const p = livePrice(symbol);
    const d = priceDigits(symbol);
    setPairPrice(p ? p.toFixed(d) : '');
    setEntry(p ? p.toFixed(d) : '');
    setStopPrice('');
    setTpPrice('');
    setContract('');
    const c = livePrice(conv.pair);
    setConvPrice(c ? c.toFixed(priceDigits(conv.pair)) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ balance, riskPct, mode }));
    } catch {
      // storage blocked
    }
  }, [balance, riskPct, mode]);

  // ---------------------------------------------------------------------------------------------
  // Validation (Arabic-first messages per field)
  const errors: Record<string, string> = {};
  const warnings: string[] = [];
  const bal = parse(balance);
  const rp = parse(riskPct);
  if (bal === null) errors.balance = x.t_errRequired;
  else if (Number.isNaN(bal) || bal <= 0) errors.balance = x.t_errPositive;
  else if (bal > 1e9) errors.balance = x.t_errTooBig;
  if (rp === null) errors.risk = x.t_errRequired;
  else if (Number.isNaN(rp) || rp <= 0) errors.risk = x.t_errPositive;
  else if (rp > 100) errors.risk = x.t_errRiskMax;
  else if (rp > 3) warnings.push(fmt(x.t_warnHighRisk, { n: rp }));

  let stop: number | null = null;
  let tp: number | null = null;
  let direction: 'buy' | 'sell' | null = null;
  if (mode === 'pips') {
    const s = parse(stopPips);
    if (s === null) errors.stop = x.t_errRequired;
    else if (Number.isNaN(s) || s <= 0) errors.stop = x.t_errPositive;
    else stop = s;
    const t = parse(tpPips);
    if (t !== null) {
      if (Number.isNaN(t) || t <= 0) errors.tp = x.t_errPositive;
      else tp = t;
    }
  } else {
    const e = parse(entry);
    const s = parse(stopPrice);
    const t = parse(tpPrice);
    if (e === null) errors.entry = x.t_errRequired;
    else if (Number.isNaN(e) || e <= 0) errors.entry = x.t_errPositive;
    if (s === null) errors.stopPrice = x.t_errRequired;
    else if (Number.isNaN(s) || s <= 0) errors.stopPrice = x.t_errPositive;
    if (!errors.entry && !errors.stopPrice && e !== null && s !== null) {
      if (s === e) errors.stopPrice = x.t_errStopEqEntry;
      else {
        direction = s < e ? 'buy' : 'sell';
        stop = priceToPips(spec, e, s);
        if (Math.abs(e - s) / e > 0.5) errors.stopPrice = x.t_errStopFar;
      }
    }
    if (t !== null && !errors.entry && e !== null) {
      if (Number.isNaN(t) || t <= 0) errors.tpPrice = x.t_errPositive;
      else if (direction === 'buy' && t <= e) errors.tpPrice = x.t_errTpBuy;
      else if (direction === 'sell' && t >= e) errors.tpPrice = x.t_errTpSell;
      else if (direction) tp = priceToPips(spec, e, t);
    }
  }

  let price: number | null = null;
  let conversion: number | null = null;
  if (pvMode === 'base_usd') {
    const src = mode === 'price' ? entry : pairPrice;
    const p = parse(src);
    if (p === null || Number.isNaN(p) || p <= 0) errors.pairPrice = x.t_errPairPrice;
    else price = p;
  }
  if (pvMode === 'cross') {
    const c = parse(convPrice);
    if (c === null || Number.isNaN(c) || c <= 0) errors.conv = fmt(x.t_errConv, { pair: conv.pair });
    else conversion = c;
  }
  let contractVal: number | null = null;
  if (contract.trim() !== '') {
    const cv = parse(contract);
    if (cv === null || Number.isNaN(cv) || cv <= 0) errors.contract = x.t_errPositive;
    else contractVal = cv;
  }

  const pipValue = pipValuePerLot(spec, { price, conversion, contract: contractVal });
  const ready = Object.keys(errors).length === 0 && pipValue !== null && stop !== null && bal !== null && rp !== null;
  const result = ready
    ? positionSize({ balance: bal as number, riskPct: rp as number, stopPips: stop as number, pipValue: pipValue as number, tpPips: tp })
    : null;
  if (result && result.lots === 0) warnings.push(fmt(x.t_warnBelowMin, { lots: result.rawLots.toFixed(4) }));
  if (result && result.rr !== null && result.rr < 1) warnings.push(x.t_warnLowRR);

  // ---------------------------------------------------------------------------------------------
  const inputCls = (bad?: string) =>
    `w-full min-h-[44px] rounded-xl bg-[#0B1220] border px-3 text-sm text-[#E8EEF9] font-mono outline-none focus:border-[#2DD4BF] ${
      bad ? 'border-rose-500/70' : 'border-[#24344E]'
    }`;
  const contractDefault = spec.contract.toLocaleString('en-US');
  const pipSizeText = spec.pipSize.toString();

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto" data-testid="calc">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-xl bg-[#2DD4BF]/10 text-[#2DD4BF]">
          <Calculator className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[#E8EEF9]">{x.t_calcTitle}</h2>
          <p className="text-[12px] text-[#7B8DA8]">{x.t_calcSub}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-4">
        {/* Inputs */}
        <div className="rounded-2xl bg-[#121A2B] border border-[#243049] p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field id="symbol" label={x.t_symbol}>
              <select id="symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} className={inputCls()} dir="ltr">
                <optgroup label={x.t_groupForex}>
                  {CALC_SYMBOLS.filter((s) => s.kind === 'forex').map((s) => (
                    <option key={s.symbol} value={s.symbol}>
                      {s.symbol}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={x.t_groupMetals}>
                  {CALC_SYMBOLS.filter((s) => s.kind === 'metal').map((s) => (
                    <option key={s.symbol} value={s.symbol}>
                      {s.symbol}
                    </option>
                  ))}
                </optgroup>
              </select>
            </Field>
            <Field id="currency" label={x.t_accountCurrency} hint={x.t_accountCurrencyHint}>
              <input id="currency" value="USD" readOnly className={`${inputCls()} opacity-70`} dir="ltr" />
            </Field>
            <Field id="balance" label={x.t_balance} err={errors.balance}>
              <input id="balance" inputMode="decimal" value={balance} onChange={(e) => setBalance(e.target.value)} className={inputCls(errors.balance)} dir="ltr" />
            </Field>
            <Field id="risk" label={x.t_riskPct} err={errors.risk} hint={x.t_riskHint}>
              <div className="flex gap-1.5">
                <input id="risk" inputMode="decimal" value={riskPct} onChange={(e) => setRiskPct(e.target.value)} className={inputCls(errors.risk)} dir="ltr" />
                {['0.5', '1', '2'].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setRiskPct(v)}
                    className={`shrink-0 px-2.5 rounded-xl text-[12px] font-mono border cursor-pointer ${
                      riskPct === v ? 'bg-[#2DD4BF]/15 border-[#2DD4BF]/60 text-[#2DD4BF]' : 'border-[#24344E] text-[#94A3B8]'
                    }`}
                  >
                    {v}%
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <div>
            <div className="text-[12px] text-[#A3B4D0] font-semibold mb-1.5">{x.t_stopBy}</div>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#0B1220] border border-[#24344E]" role="radiogroup">
              {(['pips', 'price'] as const).map((m) => (
                <button
                  key={m}
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => setMode(m)}
                  className={`min-h-[38px] rounded-lg text-xs font-bold cursor-pointer ${
                    mode === m ? 'bg-[#2DD4BF] text-[#042F2E]' : 'text-[#94A3B8]'
                  }`}
                  data-testid={`mode-${m}`}
                >
                  {m === 'pips' ? x.t_byPips : x.t_byPrice}
                </button>
              ))}
            </div>
          </div>

          {mode === 'pips' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field id="stop" label={x.t_stopPips} err={errors.stop} hint={spec.kind === 'metal' ? fmt(x.t_metalPipHint, { pip: pipSizeText }) : undefined}>
                <input id="stop" inputMode="decimal" value={stopPips} onChange={(e) => setStopPips(e.target.value)} className={inputCls(errors.stop)} dir="ltr" />
              </Field>
              <Field id="tp" label={x.t_tpPipsOpt} err={errors.tp}>
                <input id="tp" inputMode="decimal" value={tpPips} onChange={(e) => setTpPips(e.target.value)} className={inputCls(errors.tp)} dir="ltr" />
              </Field>
              {pvMode === 'base_usd' && (
                <Field id="pairPrice" label={fmt(x.t_pairPrice, { pair: symbol })} err={errors.pairPrice} hint={x.t_priceHint}>
                  <input id="pairPrice" inputMode="decimal" value={pairPrice} onChange={(e) => setPairPrice(e.target.value)} className={inputCls(errors.pairPrice)} dir="ltr" />
                </Field>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field id="entry" label={x.t_entryPrice} err={errors.entry} hint={x.t_priceHint}>
                <input id="entry" inputMode="decimal" value={entry} onChange={(e) => setEntry(e.target.value)} className={inputCls(errors.entry)} dir="ltr" />
              </Field>
              <Field id="stopPrice" label={x.t_stopPrice} err={errors.stopPrice}>
                <input id="stopPrice" inputMode="decimal" value={stopPrice} onChange={(e) => setStopPrice(e.target.value)} className={inputCls(errors.stopPrice)} dir="ltr" />
              </Field>
              <Field id="tpPrice" label={x.t_tpPriceOpt} err={errors.tpPrice}>
                <input id="tpPrice" inputMode="decimal" value={tpPrice} onChange={(e) => setTpPrice(e.target.value)} className={inputCls(errors.tpPrice)} dir="ltr" />
              </Field>
            </div>
          )}

          {pvMode === 'cross' && (
            <Field id="conv" label={fmt(x.t_convPrice, { pair: conv.pair })} err={errors.conv} hint={fmt(x.t_convHint, { q: spec.quote })}>
              <input id="conv" inputMode="decimal" value={convPrice} onChange={(e) => setConvPrice(e.target.value)} className={inputCls(errors.conv)} dir="ltr" />
            </Field>
          )}

          <details className="rounded-xl bg-[#0B1220] border border-[#1E283D] px-3 py-2">
            <summary className="text-[12px] text-[#A3B4D0] cursor-pointer min-h-[32px] flex items-center">{x.t_advanced}</summary>
            <div className="pt-2">
              <Field id="contract" label={x.t_contract} err={errors.contract} hint={fmt(x.t_contractHint, { n: contractDefault, pip: pipSizeText })}>
                <input id="contract" inputMode="decimal" placeholder={contractDefault} value={contract} onChange={(e) => setContract(e.target.value)} className={inputCls(errors.contract)} dir="ltr" />
              </Field>
            </div>
          </details>
        </div>

        {/* Results */}
        <div className="space-y-3">
          <div className="rounded-2xl bg-gradient-to-br from-[#0F2A2A] to-[#121A2B] border border-[#2DD4BF]/40 p-4" aria-live="polite" data-testid="calc-result">
            <div className="text-[12px] text-[#A3B4D0]">{x.t_resultLots}</div>
            <div className="text-4xl font-black font-mono text-[#2DD4BF] mt-1" dir="ltr" data-testid="lots">
              {result ? result.lots.toFixed(2) : '—'}
            </div>
            {result && (
              <div className="text-[11px] text-[#7B8DA8] mt-1" dir="ltr">
                = {(result.lots * 10).toFixed(1)} mini · {(result.lots * 100).toFixed(0)} micro
              </div>
            )}
            <dl className="grid grid-cols-2 gap-2 mt-4 text-[12px]">
              <div className="rounded-xl bg-[#0B1220]/70 border border-[#1E283D] p-2.5">
                <dt className="text-[#7B8DA8]">{x.t_riskAmount}</dt>
                <dd className="font-mono font-bold text-rose-300" dir="ltr" data-testid="risk-amount">
                  {result ? money(result.riskAmount) : '—'}
                </dd>
              </div>
              <div className="rounded-xl bg-[#0B1220]/70 border border-[#1E283D] p-2.5">
                <dt className="text-[#7B8DA8]">{x.t_pipValue}</dt>
                <dd className="font-mono font-bold text-[#E8EEF9]" dir="ltr" data-testid="pip-value">
                  {pipValue !== null ? money(pipValue) : '—'}
                </dd>
              </div>
              <div className="rounded-xl bg-[#0B1220]/70 border border-[#1E283D] p-2.5">
                <dt className="text-[#7B8DA8]">{x.t_actualRisk}</dt>
                <dd className="font-mono font-bold text-[#E8EEF9]" dir="ltr">
                  {result ? `${money(result.actualRisk)} (${result.actualRiskPct.toFixed(2)}%)` : '—'}
                </dd>
              </div>
              <div className="rounded-xl bg-[#0B1220]/70 border border-[#1E283D] p-2.5">
                <dt className="text-[#7B8DA8]">{x.t_stopDistance}</dt>
                <dd className="font-mono font-bold text-[#E8EEF9]" dir="ltr">
                  {stop !== null ? `${stop.toFixed(1)} pips` : '—'}
                </dd>
              </div>
              <div className="rounded-xl bg-[#0B1220]/70 border border-[#1E283D] p-2.5 col-span-2">
                <dt className="text-[#7B8DA8]">{x.t_rr}</dt>
                <dd className="font-mono font-bold text-[#E8EEF9]" dir="ltr" data-testid="rr">
                  {result && result.rr !== null
                    ? `1 : ${result.rr.toFixed(2)}  ·  +${money(result.rewardAmount || 0)}`
                    : x.t_rrNeedTp}
                </dd>
              </div>
            </dl>
            {direction && (
              <p className="text-[11px] text-[#94A3B8] mt-2">{direction === 'buy' ? x.t_dirBuyDetected : x.t_dirSellDetected}</p>
            )}
          </div>

          {warnings.map((w) => (
            <div key={w} className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-[12px] text-amber-200 flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}

          <div className="rounded-2xl bg-[#121A2B] border border-[#243049]">
            <button
              onClick={() => setShowHow((v) => !v)}
              aria-expanded={showHow}
              className="w-full flex items-center justify-between px-4 min-h-[48px] text-[13px] font-bold text-[#E8EEF9] cursor-pointer"
              data-testid="how-toggle"
            >
              <span className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#2DD4BF]" /> {x.t_howTitle}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showHow ? 'rotate-180' : ''}`} />
            </button>
            {showHow && (
              <div className="px-4 pb-4 space-y-2 text-[12px] text-[#A3B4D0] leading-relaxed" data-testid="how-body">
                <p>1. {x.t_how1}</p>
                <p className="font-mono text-[11px] bg-[#0B1220] rounded-lg p-2 text-[#CBD5E1]" dir="ltr">
                  risk = {bal && bal > 0 ? bal : 'balance'} × {rp && rp > 0 ? rp : 'risk%'} ÷ 100 = {result ? money(result.riskAmount) : '—'}
                </p>
                <p>2. {pvMode === 'quote_usd' ? x.t_how2Quote : pvMode === 'base_usd' ? x.t_how2Base : fmt(x.t_how2Cross, { pair: conv.pair })}</p>
                <p className="font-mono text-[11px] bg-[#0B1220] rounded-lg p-2 text-[#CBD5E1]" dir="ltr">
                  pip value = {pipSizeText} × {(contractVal ?? spec.contract).toLocaleString('en-US')}
                  {pvMode === 'base_usd' ? ` ÷ ${price ?? 'price'}` : pvMode === 'cross' ? ` ${conv.invert ? '÷' : '×'} ${conversion ?? conv.pair}` : ''} ={' '}
                  {pipValue !== null ? money(pipValue) : '—'}
                </p>
                <p>3. {x.t_how3}</p>
                <p className="font-mono text-[11px] bg-[#0B1220] rounded-lg p-2 text-[#CBD5E1]" dir="ltr">
                  lots = {result ? money(result.riskAmount) : 'risk'} ÷ ({stop !== null ? stop.toFixed(1) : 'stop'} × {pipValue !== null ? money(pipValue) : 'pip value'}) ={' '}
                  {result ? result.rawLots.toFixed(4) : '—'} → {result ? result.lots.toFixed(2) : '—'}
                </p>
                <p className="text-[11px] text-[#64748B]">{x.t_howNote}</p>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setStopPips('20');
              setTpPips('');
              setStopPrice('');
              setTpPrice('');
              setContract('');
            }}
            className="text-[12px] text-[#7B8DA8] hover:text-white flex items-center gap-1.5 cursor-pointer min-h-[36px]"
          >
            <RotateCcw className="w-3.5 h-3.5" /> {x.t_reset}
          </button>
          <p className="text-[11px] text-[#64748B]">{x.t_eduNote}</p>
        </div>
      </div>
    </div>
  );
};
