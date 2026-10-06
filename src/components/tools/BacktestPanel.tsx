import React, { useState } from 'react';
import { MarketSymbol, Timeframe } from '../../types/market';
import { runBacktest, BacktestResult } from '../../api/toolsApi';
import { LineChart, Award, TrendingDown, Percent, RotateCcw, Play, AlertCircle, ShieldAlert } from 'lucide-react';
import { OfflineBadge } from '../common/OfflineBadge';

interface BacktestPanelProps {
  symbols: MarketSymbol[];
}

export const BacktestPanel: React.FC<BacktestPanelProps> = ({ symbols }) => {
  const [symbol, setSymbol] = useState('EURUSD');
  const [strategy, setStrategy] = useState<'sma_cross' | 'rsi_reversal' | 'breakout'>('sma_cross');
  const [timeframe, setTimeframe] = useState<string>('1h');
  const [fastPeriod, setFastPeriod] = useState<number>(9);
  const [slowPeriod, setSlowPeriod] = useState<number>(21);
  const [rsiLow, setRsiLow] = useState<number>(30);
  const [rsiHigh, setRsiHigh] = useState<number>(70);

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  const handleRun = async () => {
    setIsRunning(true);
    try {
      const res = await runBacktest({
        symbol,
        timeframe,
        strategy,
        fast: fastPeriod,
        slow: slowPeriod,
        rsi_low: rsiLow,
        rsi_high: rsiHigh,
      });

      setResult(res);
      setIsOffline(!!res.isOffline);
    } catch {
      setIsOffline(true);
    } finally {
      setIsRunning(false);
    }
  };

  // Prepare points for equity curve SVG
  const equityPoints: number[] = React.useMemo(() => {
    if (!result || !result.equity_curve || result.equity_curve.length === 0) return [];
    if (typeof result.equity_curve[0] === 'number') {
      return result.equity_curve as number[];
    }
    return (result.equity_curve as { equity: number }[]).map((p) => p.equity);
  }, [result]);

  const minEquity = equityPoints.length > 0 ? Math.min(...equityPoints) : 10000;
  const maxEquity = equityPoints.length > 0 ? Math.max(...equityPoints) : 10000;
  const range = maxEquity - minEquity || 1;
  const svgWidth = 600;
  const svgHeight = 160;

  const pointsStr = equityPoints
    .map((val, idx) => {
      const x = (idx / (equityPoints.length - 1 || 1)) * svgWidth;
      const y = svgHeight - ((val - minEquity) / range) * (svgHeight - 30) - 15;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 select-none text-xs">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#243049]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20">
            <LineChart className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#E8EEF9]">
                محاكي واختبار الاستراتيجيات الفنية
              </h2>
              {isOffline && <OfflineBadge forceShow />}
            </div>
            <p className="text-[#7B8DA8]">
              اختبر نماذج التداول على الشموع المغلقة مع حساب السبريد ونسب المخاطرة بدقة.
            </p>
          </div>
        </div>

        {/* 2.4 Disclaimer label */}
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs min-h-[44px]">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>نتائج تاريخية لا تضمن المستقبل (محاكاة تعليمية)</span>
        </div>
      </div>

      {/* Configuration Form */}
      <div className="p-5 bg-[#121A2B] rounded-xl border border-[#243049] space-y-4 shadow-lg">
        <h3 className="font-bold text-sm text-[#E8EEF9]">إعدادات الاستراتيجية والفحص التاريخي</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Symbol */}
          <div>
            <label className="block text-[#A3B4D0] mb-1 font-medium">الرمز المالي</label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full bg-[#0B1220] border border-[#243049] rounded-xl px-3 py-2.5 text-[#E8EEF9] font-mono focus:outline-hidden min-h-[44px] cursor-pointer"
            >
              {symbols.map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.symbol} - {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Timeframe */}
          <div>
            <label className="block text-[#A3B4D0] mb-1 font-medium">الفاصل الزمني</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full bg-[#0B1220] border border-[#243049] rounded-xl px-3 py-2.5 text-[#E8EEF9] font-mono focus:outline-hidden min-h-[44px] cursor-pointer"
            >
              <option value="5m">5 دقائق (5m)</option>
              <option value="15m">15 دقيقة (15m)</option>
              <option value="30m">30 دقيقة (30m)</option>
              <option value="1H">ساعة واحدة (1H)</option>
              <option value="4H">4 ساعات (4H)</option>
              <option value="D">يومي (1D)</option>
            </select>
          </div>

          {/* Strategy */}
          <div>
            <label className="block text-[#A3B4D0] mb-1 font-medium">الاستراتيجية الفنية</label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as any)}
              className="w-full bg-[#0B1220] border border-[#243049] rounded-xl px-3 py-2.5 text-[#E8EEF9] focus:outline-hidden font-semibold min-h-[44px] cursor-pointer"
            >
              <option value="sma_cross">تقاطع المتوسطات المتحركة</option>
              <option value="rsi_reversal">ارتداد مؤشر القوة النسبية</option>
              <option value="breakout">كسر مستويات الدعم والمقاومة</option>
            </select>
          </div>

          {/* Run Button */}
          <div className="flex items-end">
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#2DD4BF] hover:bg-[#26bba8] text-[#042F2E] font-bold text-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-md min-h-[44px]"
            >
              <Play className={`w-4 h-4 fill-current ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'جاري الاختبار...' : 'تشغيل الاختبار التاريخي'}</span>
            </button>
          </div>
        </div>

        {/* Dynamic Params */}
        {strategy === 'sma_cross' && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#1E283D]">
            <div>
              <label className="block text-[#A3B4D0] mb-1">فترة المتوسط السريع (Fast MA)</label>
              <input
                type="number"
                value={fastPeriod}
                onChange={(e) => setFastPeriod(parseInt(e.target.value, 10) || 9)}
                className="w-full bg-[#0B1220] border border-[#243049] rounded-lg p-2 text-[#E8EEF9] font-mono"
              />
            </div>
            <div>
              <label className="block text-[#A3B4D0] mb-1">فترة المتوسط البطيء (Slow MA)</label>
              <input
                type="number"
                value={slowPeriod}
                onChange={(e) => setSlowPeriod(parseInt(e.target.value, 10) || 21)}
                className="w-full bg-[#0B1220] border border-[#243049] rounded-lg p-2 text-[#E8EEF9] font-mono"
              />
            </div>
          </div>
        )}

        {strategy === 'rsi_reversal' && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#1E283D]">
            <div>
              <label className="block text-[#A3B4D0] mb-1">حد التشبع البيعي (RSI Low)</label>
              <input
                type="number"
                value={rsiLow}
                onChange={(e) => setRsiLow(parseInt(e.target.value, 10) || 30)}
                className="w-full bg-[#0B1220] border border-[#243049] rounded-lg p-2 text-[#E8EEF9] font-mono"
              />
            </div>
            <div>
              <label className="block text-[#A3B4D0] mb-1">حد التشبع الشرائي (RSI High)</label>
              <input
                type="number"
                value={rsiHigh}
                onChange={(e) => setRsiHigh(parseInt(e.target.value, 10) || 70)}
                className="w-full bg-[#0B1220] border border-[#243049] rounded-lg p-2 text-[#E8EEF9] font-mono"
              />
            </div>
          </div>
        )}
      </div>

      {/* Results View */}
      {result ? (
        <div className="space-y-6">
          {/* KPI Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-4 bg-[#121A2B] rounded-xl border border-[#243049] space-y-1">
              <span className="text-[#7B8DA8] text-[11px] font-semibold">إجمالي الصفقات</span>
              <div className="text-2xl font-bold font-mono text-[#E8EEF9]">
                {result.stats.total_trades}
              </div>
              <span className="text-[10px] text-[#64748B]">
                {result.stats.winning_trades} رابحة • {result.stats.losing_trades} خاسرة
              </span>
            </div>

            <div className="p-4 bg-[#121A2B] rounded-xl border border-[#243049] space-y-1">
              <span className="text-[#7B8DA8] text-[11px] font-semibold">نسبة النجاح بالصفقات</span>
              <div
                className={`text-2xl font-bold font-mono ${
                  result.stats.win_rate >= 50 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                }`}
              >
                {result.stats.win_rate.toFixed(1)}%
              </div>
              <span className="text-[10px] text-[#64748B]">معدل تحقيق الأهداف</span>
            </div>

            <div className="p-4 bg-[#121A2B] rounded-xl border border-[#243049] space-y-1">
              <span className="text-[#7B8DA8] text-[11px] font-semibold">معامل الربحية</span>
              <div className="text-2xl font-bold font-mono text-[#2DD4BF]">
                {result.stats.profit_factor.toFixed(2)}
              </div>
              <span className="text-[10px] text-[#64748B]">إجمالي الأرباح / إجمالي الخسائر</span>
            </div>

            <div className="p-4 bg-[#121A2B] rounded-xl border border-[#243049] space-y-1">
              <span className="text-[#7B8DA8] text-[11px] font-semibold">أقصى تراجع للمحفظة</span>
              <div className="text-2xl font-bold font-mono text-[#EF4444]">
                {result.stats.max_drawdown_pct.toFixed(1)}%
              </div>
              <span className="text-[10px] text-[#64748B]">أكبر انخفاض من القمة</span>
            </div>
          </div>

          {/* Equity Curve Chart */}
          {equityPoints.length > 1 && (
            <div className="p-5 bg-[#121A2B] rounded-xl border border-[#243049] space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-[#E8EEF9]">
                <span>منحنى نمو رأس المال الافتراضي (محاكاة)</span>
                <span className="font-mono text-[#2DD4BF]">
                  ${equityPoints[equityPoints.length - 1].toLocaleString()}
                </span>
              </div>

              <div className="w-full bg-[#0B1220] rounded-lg p-2 border border-[#1E283D] overflow-hidden">
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-40">
                  <polyline
                    fill="none"
                    stroke="#2DD4BF"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={pointsStr}
                  />
                </svg>
              </div>
            </div>
          )}

          {/* Trades Table */}
          {result.trades.length > 0 && (
            <div className="bg-[#121A2B] rounded-xl border border-[#243049] overflow-hidden">
              <div className="p-3 bg-[#0B1220] border-b border-[#243049] font-bold text-xs text-[#E8EEF9]">
                سجل صفقات الاختبار ({result.trades.length} صفقة)
              </div>
              <div className="overflow-x-auto max-h-80">
                {/* Desktop Table View */}
                <table className="hidden md:table w-full text-right divide-y divide-[#243049]/60 font-mono text-xs">
                  <thead className="bg-[#080E1A] text-[#7B8DA8] text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">النوع</th>
                      <th className="py-2.5 px-3">سعر الدخول</th>
                      <th className="py-2.5 px-3">سعر الخروج</th>
                      <th className="py-2.5 px-3">الربح (نقاط)</th>
                      <th className="py-2.5 px-3 text-center">النتيجة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#243049]/40">
                    {result.trades.map((t, i) => (
                      <tr key={i} className="hover:bg-[#162238] transition-colors">
                        <td className="py-2 px-3 font-bold">
                          <span
                            className={t.type === 'BUY' ? 'text-[#22C55E]' : 'text-[#EF4444]'}
                          >
                            {t.type}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[#E8EEF9]">{t.entry_price}</td>
                        <td className="py-2 px-3 text-[#E8EEF9]">{t.exit_price}</td>
                        <td className="py-2 px-3 font-bold">
                          <span className={t.pnl_pips >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}>
                            {t.pnl_pips >= 0 ? '+' : ''}
                            {t.pnl_pips}p
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-bold">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              t.result === 'WIN'
                                ? 'bg-[#22C55E]/15 text-[#22C55E]'
                                : 'bg-[#EF4444]/15 text-[#EF4444]'
                            }`}
                          >
                            {t.result === 'WIN' ? 'رابحة' : 'خاسرة'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile Card View (Part 1.6: no horizontal scroll) */}
                <div className="md:hidden space-y-2 p-2">
                  {result.trades.map((t, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-[#080E1A] border border-[#1E2E4A] flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                            t.type === 'BUY'
                              ? 'bg-emerald-500/15 text-[#22C55E]'
                              : 'bg-rose-500/15 text-[#EF4444]'
                          }`}
                        >
                          {t.type}
                        </span>
                        <span className="text-[#A3B4D0] text-[11px]">
                          {t.entry_price} → {t.exit_price}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold ${
                            t.pnl_pips >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                          }`}
                        >
                          {t.pnl_pips >= 0 ? '+' : ''}{t.pnl_pips}p
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            t.result === 'WIN'
                              ? 'bg-[#22C55E]/20 text-[#22C55E]'
                              : 'bg-[#EF4444]/20 text-[#EF4444]'
                          }`}
                        >
                          {t.result === 'WIN' ? 'ربح' : 'خسارة'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-12 text-center text-[#7B8DA8] bg-[#121A2B] rounded-xl border border-[#243049] space-y-2">
          <Play className="w-8 h-8 mx-auto text-[#2DD4BF]" />
          <p className="font-semibold text-[#E8EEF9]">جاهز لبدء المحاكاة التاريخية</p>
          <p className="text-xs">اضغط على زر &quot;تشغيل الاختبار التاريخي&quot; لعرض النتائج ومنحنى الأداء.</p>
        </div>
      )}
    </div>
  );
};
