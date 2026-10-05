import React, { useState, useEffect } from 'react';
import { MarketSymbol } from '../../types/market';
import { getQuote } from '../../api/market';
import { Calculator, ShieldCheck, DollarSign, Percent, RefreshCw } from 'lucide-react';
import { OfflineBadge } from '../common/OfflineBadge';

interface PositionSizeCalculatorProps {
  symbols: MarketSymbol[];
  activeSymbol: string;
}

/**
 * 2.5 Pip size rules:
 * 0.0001 FX, 0.01 JPY, 0.1 XAUUSD, 0.01 XAGUSD, 0.01 oil, 1 indices
 */
export function getSymbolPipRule(symbolStr: string): { pipSize: number; pipValuePerStandardLot: (price: number) => number } {
  const s = symbolStr.toUpperCase();

  if (s.includes('JPY')) {
    return {
      pipSize: 0.01,
      pipValuePerStandardLot: (price: number) => (price > 0 ? 1000 / price : 6.67),
    };
  }
  if (s === 'XAUUSD' || s === 'GOLD') {
    return {
      pipSize: 0.1,
      pipValuePerStandardLot: () => 10.0, // 100 oz standard lot, 0.1 move = $10
    };
  }
  if (s === 'XAGUSD' || s === 'SILVER') {
    return {
      pipSize: 0.01,
      pipValuePerStandardLot: () => 50.0, // 5000 oz silver lot, $0.01 = $50
    };
  }
  if (s.includes('OIL') || s.includes('BRENT')) {
    return {
      pipSize: 0.01,
      pipValuePerStandardLot: () => 10.0, // 1000 barrels, 0.01 move = $10
    };
  }
  if (
    s.includes('SPX') ||
    s.includes('NAS') ||
    s.includes('US30') ||
    s.includes('GER') ||
    s.includes('DAX') ||
    s.includes('DXY')
  ) {
    return {
      pipSize: 1.0,
      pipValuePerStandardLot: () => 1.0, // indices: 1 point = $1 (mini/CFD)
    };
  }

  // Standard FX (EURUSD, GBPUSD, etc.)
  return {
    pipSize: 0.0001,
    pipValuePerStandardLot: () => 10.0, // 100,000 units, 0.0001 = $10
  };
}

export const PositionSizeCalculator: React.FC<PositionSizeCalculatorProps> = ({
  symbols,
  activeSymbol,
}) => {
  const [selectedSymbolStr, setSelectedSymbolStr] = useState(activeSymbol);
  const [balance, setBalance] = useState('10000');
  const [riskPct, setRiskPct] = useState('1');
  const [stopLossPips, setStopLossPips] = useState('25');
  const [leverage, setLeverage] = useState('100');
  const [realPrice, setRealPrice] = useState<number | null>(null);
  const [isDemoPrice, setIsDemoPrice] = useState<boolean>(false);
  const [isLoadingPrice, setIsLoadingPrice] = useState<boolean>(false);

  const selectedSymbol = symbols.find((s) => s.symbol === selectedSymbolStr) || symbols[0];

  // 2.5 Fetch quote from getQuote for real current price
  useEffect(() => {
    let isCancelled = false;
    const fetchCurrentQuote = async () => {
      setIsLoadingPrice(true);
      try {
        const q = await getQuote(selectedSymbolStr);
        if (!isCancelled) {
          if (q.price !== null) {
            setRealPrice(q.price);
            setIsDemoPrice(q.isDemo);
          } else {
            setRealPrice(selectedSymbol?.price ?? 1.085);
            setIsDemoPrice(true);
          }
        }
      } catch {
        if (!isCancelled) {
          setRealPrice(selectedSymbol?.price ?? 1.085);
          setIsDemoPrice(true);
        }
      } finally {
        if (!isCancelled) setIsLoadingPrice(false);
      }
    };

    fetchCurrentQuote();
    return () => {
      isCancelled = true;
    };
  }, [selectedSymbolStr, selectedSymbol]);

  // Mathematical Calculation
  const currentEffectivePrice = realPrice ?? selectedSymbol?.price ?? 1.085;
  const parsedBalance = parseFloat(balance) || 0;
  const parsedRiskPct = parseFloat(riskPct) || 0;
  const parsedPips = parseFloat(stopLossPips) || 1;
  const parsedLeverage = parseFloat(leverage) || 100;

  const cashRisk = (parsedBalance * parsedRiskPct) / 100;

  // 2.5 Apply pip rules
  const pipRule = getSymbolPipRule(selectedSymbolStr);
  const standardLotPipValue = pipRule.pipValuePerStandardLot(currentEffectivePrice);

  // Recommended Lot = CashRisk / (StopLossPips * PipValuePerStandardLot)
  const calculatedLot =
    parsedPips > 0 && standardLotPipValue > 0
      ? cashRisk / (parsedPips * standardLotPipValue)
      : 0;

  const contractSize =
    selectedSymbolStr === 'XAUUSD'
      ? 100
      : selectedSymbolStr === 'XAGUSD'
      ? 5000
      : selectedSymbolStr.includes('OIL')
      ? 1000
      : 100000;

  const notionalValue = calculatedLot * contractSize * currentEffectivePrice;
  const requiredMargin = parsedLeverage > 0 ? notionalValue / parsedLeverage : 0;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 select-none text-xs">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#243049]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#E8EEF9]">
                حاسبة حجم اللوت وإدارة المخاطر (Position Sizer)
              </h2>
              {isDemoPrice && (
                <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                  بيانات تجريبية
                </span>
              )}
            </div>
            <p className="text-[#7B8DA8]">
              احسب حجم العقد الآمن بدقة بالغة وفق أسعار السوق الحقيقية وقواعد النقاط الصارمة.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#162033] border border-[#243049] text-xs">
          <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
          <span className="text-[#A3B4D0]">حماية من نداء الهامش (Margin Call Guard)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Input Form */}
        <div className="p-5 bg-[#121A2B] rounded-xl border border-[#243049] space-y-4 shadow-lg">
          <h3 className="font-bold text-sm text-[#E8EEF9] mb-3">بيانات الحساب والصفقة</h3>

          {/* Symbol Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[#A3B4D0] font-medium">الزوج أو الأداة المالية</label>
              <span className="font-mono text-[11px] text-[#2DD4BF]">
                {isLoadingPrice ? (
                  'جاري تحديث السعر...'
                ) : (
                  <>السعر الحي: {currentEffectivePrice.toFixed(selectedSymbol.precision)}</>
                )}
              </span>
            </div>
            <select
              value={selectedSymbolStr}
              onChange={(e) => setSelectedSymbolStr(e.target.value)}
              className="w-full bg-[#0B1220] border border-[#243049] rounded-lg px-3 py-2 text-[#E8EEF9] font-mono focus:outline-hidden"
            >
              {symbols.map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.name} ({s.symbol})
                </option>
              ))}
            </select>
          </div>

          {/* Account Balance */}
          <div>
            <label className="block text-[#A3B4D0] mb-1 font-medium">رأس مال الحساب ($ USD)</label>
            <div className="relative">
              <DollarSign className="w-4 h-4 absolute top-2.5 right-2.5 text-[#7B8DA8]" />
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="w-full bg-[#0B1220] border border-[#243049] rounded-lg py-2 pr-9 pl-3 text-[#E8EEF9] font-mono focus:outline-hidden"
              />
            </div>
          </div>

          {/* Risk Percentage */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[#A3B4D0] font-medium">نسبة المخاطرة لكل صفقة (%)</label>
              <span className="font-mono font-bold text-[#2DD4BF]">{riskPct}%</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.25"
                max="5"
                step="0.25"
                value={riskPct}
                onChange={(e) => setRiskPct(e.target.value)}
                className="flex-1 accent-[#2DD4BF] cursor-pointer"
              />
              <div className="flex gap-1">
                {['0.5', '1', '2', '3'].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setRiskPct(pct)}
                    className={`px-2 py-1 rounded text-[11px] font-mono cursor-pointer ${
                      riskPct === pct
                        ? 'bg-[#2DD4BF] text-[#042F2E] font-bold'
                        : 'bg-[#162033] text-[#A3B4D0]'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stop Loss Pips */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[#A3B4D0] font-medium">مسافة وقف الخسارة (Stop Loss)</label>
              <span className="text-[10px] text-[#64748B] font-mono">
                حجم النقطة: {pipRule.pipSize}
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                value={stopLossPips}
                onChange={(e) => setStopLossPips(e.target.value)}
                className="w-full bg-[#0B1220] border border-[#243049] rounded-lg py-2 px-3 text-[#E8EEF9] font-mono focus:outline-hidden"
                placeholder="25"
              />
              <span className="absolute left-3 top-2 text-[#7B8DA8] font-semibold">نقطة (Pips)</span>
            </div>
          </div>

          {/* Leverage */}
          <div>
            <label className="block text-[#A3B4D0] mb-1 font-medium">الرافعة المالية للحساب</label>
            <select
              value={leverage}
              onChange={(e) => setLeverage(e.target.value)}
              className="w-full bg-[#0B1220] border border-[#243049] rounded-lg px-3 py-2 text-[#E8EEF9] font-mono focus:outline-hidden"
            >
              <option value="30">1:30 (منخفضة - آمنة)</option>
              <option value="50">1:50</option>
              <option value="100">1:100 (قياسية)</option>
              <option value="200">1:200</option>
              <option value="500">1:500 (مرتفعة)</option>
            </select>
          </div>
        </div>

        {/* Right: Results Display */}
        <div className="p-5 bg-[#121A2B] rounded-xl border border-[#243049] space-y-4 flex flex-col justify-between shadow-lg">
          <div>
            <h3 className="font-bold text-sm text-[#E8EEF9] mb-4">نتائج الحساب والتوصية</h3>

            {/* Recommended Lot Size Highlight */}
            <div className="p-5 bg-gradient-to-br from-[#162740] to-[#0E1626] rounded-xl border border-[#2DD4BF]/40 text-center space-y-1 shadow-inner">
              <span className="text-[#A3B4D0] text-xs font-semibold">حجم العقد الموصى به (Lot Size)</span>
              <div className="text-4xl font-extrabold font-mono text-[#2DD4BF] tracking-tight">
                {calculatedLot.toFixed(2)} <span className="text-sm font-sans">لوت</span>
              </div>
              <span className="text-[11px] text-[#64748B]">
                ما يعادل {(calculatedLot * 10).toFixed(1)} ميني لوت أو {(calculatedLot * 100).toFixed(0)} مايكرو لوت
              </span>
            </div>

            {/* Calculation Breakdown */}
            <div className="mt-5 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0B1220] border border-[#1E283D]">
                <span className="text-[#A3B4D0] font-sans">المخاطرة النقدية بالدولار:</span>
                <span className="font-bold text-rose-400">${cashRisk.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0B1220] border border-[#1E283D]">
                <span className="text-[#A3B4D0] font-sans">قيمة النقطة لعقد كامل:</span>
                <span className="font-bold text-[#E8EEF9]">${standardLotPipValue.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0B1220] border border-[#1E283D]">
                <span className="text-[#A3B4D0] font-sans">الهامش المحجوز المطلوب (Margin):</span>
                <span className="font-bold text-[#E8EEF9]">${requiredMargin.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0B1220] border border-[#1E283D]">
                <span className="text-[#A3B4D0] font-sans">القيمة الاسمية للعقد (Notional):</span>
                <span className="font-bold text-[#64748B]">${notionalValue.toFixed(0)}</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-[#0B1220] rounded-lg border border-[#1E283D] text-[11px] text-[#7B8DA8] space-y-1">
            <div className="font-bold text-[#E8EEF9] font-sans">نصيحة إدارة رأس المال:</div>
            <p className="font-sans leading-relaxed">
              الالتزام بنسبة مخاطرة لا تتجاوز 1% إلى 2% في الصفقة الواحدة يحمي محفظتك من تراجعات السوق المفاجئة.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
