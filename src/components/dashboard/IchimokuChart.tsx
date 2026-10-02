import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ichimokuAPI, IchimokuAnalysisData, IchimokuBacktestData } from '../../api/ichimoku';

interface IchimokuChartProps {
  currentSymbol?: string;
  onSymbolSelect?: (symbol: string) => void;
  className?: string;
}

export const IchimokuChart: React.FC<IchimokuChartProps> = ({
  currentSymbol = 'EURUSD',
  onSymbolSelect,
  className = '',
}) => {
  const [symbol, setSymbol] = useState(currentSymbol);
  const [timeframe, setTimeframe] = useState('1h');
  const [data, setData] = useState<IchimokuAnalysisData | null>(null);
  const [backtest, setBacktest] = useState<IchimokuBacktestData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSymbol(currentSymbol);
  }, [currentSymbol]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resData, resBt] = await Promise.all([
        ichimokuAPI.analyze(symbol, timeframe),
        ichimokuAPI.getBacktest(symbol, timeframe),
      ]);
      if (resData) setData(resData);
      if (resBt) setBacktest(resBt);
    } catch (err) {
      console.error('Failed to load Ichimoku:', err);
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Generate SVG path coordinates for the mini-chart
  const chartSvg = useMemo(() => {
    if (!data || !data.chart_series) return null;
    const { closes, tenkan, kijun, senkou_a, senkou_b } = data.chart_series;
    const n = closes.length;
    if (n < 5) return null;

    // Determine min and max price across all valid series
    const allVals: number[] = [...closes];
    [tenkan, kijun, senkou_a, senkou_b].forEach((series) => {
      series.forEach((v) => {
        if (v !== null && v !== undefined) allVals.push(v);
      });
    });

    const minP = Math.min(...allVals);
    const maxP = Math.max(...allVals);
    const range = maxP - minP || 0.001;

    const width = 600;
    const height = 180;
    const padY = 15;

    const getX = (idx: number) => (idx / (n - 1)) * (width - 20) + 10;
    const getY = (price: number) =>
      height - padY - ((price - minP) / range) * (height - padY * 2);

    // Build line paths
    const makePath = (series: (number | null)[]) => {
      let p = '';
      series.forEach((val, i) => {
        if (val === null || val === undefined) return;
        const x = getX(i);
        const y = getY(val);
        p += p === '' ? `M ${x} ${y}` : ` L ${x} ${y}`;
      });
      return p;
    };

    // Build Cloud Polygon (Area between Senkou A and Senkou B)
    let cloudPoly = '';
    const validCloudIndices: number[] = [];
    for (let i = 0; i < n; i++) {
      if (senkou_a[i] !== null && senkou_b[i] !== null) {
        validCloudIndices.push(i);
      }
    }

    if (validCloudIndices.length > 1) {
      // Forward path along Senkou A
      validCloudIndices.forEach((i, idx) => {
        const x = getX(i);
        const y = getY(senkou_a[i]!);
        cloudPoly += idx === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
      });
      // Backward path along Senkou B
      for (let j = validCloudIndices.length - 1; j >= 0; j--) {
        const i = validCloudIndices[j];
        const x = getX(i);
        const y = getY(senkou_b[i]!);
        cloudPoly += ` L ${x} ${y}`;
      }
      cloudPoly += ' Z';
    }

    return {
      width,
      height,
      cloudPoly,
      pathCloses: makePath(closes),
      pathTenkan: makePath(tenkan),
      pathKijun: makePath(kijun),
      pathSenkouA: makePath(senkou_a),
      pathSenkouB: makePath(senkou_b),
    };
  }, [data]);

  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/95 p-5 shadow-2xl text-slate-100 ${className}`}>
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 text-lg font-bold shadow-inner">
            ☁️
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
              سحابة إيشيموكو كينكو هيو (Ichimoku Cloud Engine)
              <span className="text-[10px] bg-purple-500/15 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-mono font-normal">
                Task 16
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              تحليل خطوط التوازن الخمسة وسحابة الكومو مع كشف اختراقات وتقاطعات TK Cross وتأكيد Chikou
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'USOIL'].map((s) => (
            <button
              key={s}
              onClick={() => {
                setSymbol(s);
                onSymbolSelect?.(s);
              }}
              className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-lg transition-colors border ${
                symbol === s
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              {s}
            </button>
          ))}

          <div className="h-4 w-px bg-slate-700 mx-1" />

          {['15m', '1h', '4h', 'daily'].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-1 text-xs font-mono rounded-lg transition-colors border ${
                timeframe === tf
                  ? 'bg-slate-700 text-slate-100 border-slate-600 font-bold'
                  : 'bg-slate-800/40 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {tf}
            </button>
          ))}

          <button
            onClick={() => loadData()}
            disabled={loading}
            className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
          >
            {loading ? '...' : '⟳'}
          </button>
        </div>
      </div>

      {data && (
        <>
          {/* Main 4 Signals & Trend Badges */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 mb-5">
            {/* 1. Overall Trend */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 flex flex-col justify-between">
              <span className="text-[11px] text-slate-400">الاتجاه العام (Overall Trend)</span>
              <div className="my-1.5 flex items-center justify-between">
                <span
                  className={`text-lg font-black ${
                    data.signals.overall_trend === 'BULLISH'
                      ? 'text-emerald-400'
                      : data.signals.overall_trend === 'BEARISH'
                      ? 'text-rose-400'
                      : 'text-slate-300'
                  }`}
                >
                  {data.signals.overall_trend === 'BULLISH'
                    ? '▲ صاعد قوي'
                    : data.signals.overall_trend === 'BEARISH'
                    ? '▼ هابط قوي'
                    : '◆ متذبذب عرضي'}
                </span>
                <span className="text-xs font-mono font-bold text-slate-300">
                  {data.signals.strength}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    data.signals.overall_trend === 'BULLISH'
                      ? 'bg-emerald-400'
                      : data.signals.overall_trend === 'BEARISH'
                      ? 'bg-rose-400'
                      : 'bg-slate-500'
                  }`}
                  style={{ width: `${data.signals.strength}%` }}
                />
              </div>
            </div>

            {/* 2. Cloud State (Price vs Kumo) */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 flex flex-col justify-between">
              <span className="text-[11px] text-slate-400">موقع السعر من السحابة</span>
              <div className="my-1.5">
                <span
                  className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${
                    data.values.cloud_state === 'ABOVE_CLOUD'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : data.values.cloud_state === 'BELOW_CLOUD'
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {data.values.cloud_state === 'ABOVE_CLOUD'
                    ? 'فوق السحابة (شراء)'
                    : data.values.cloud_state === 'BELOW_CLOUD'
                    ? 'تحت السحابة (بيع)'
                    : 'داخل السحابة (منطقة حياد)'}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                سماكة السحابة: {data.values.cloud_thickness.toFixed(5)}
              </span>
            </div>

            {/* 3. TK Cross Status */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 flex flex-col justify-between">
              <span className="text-[11px] text-slate-400">تقاطع تينكان / كيجون (TK Cross)</span>
              <div className="my-1.5">
                <span
                  className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold font-mono ${
                    data.signals.tk_cross.includes('BULLISH')
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : data.signals.tk_cross.includes('BEARISH')
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {data.signals.tk_cross}
                </span>
              </div>
              <span className="text-[10px] text-slate-500">
                وضع التينكان: {data.signals.tk_state === 'BULLISH' ? 'أعلى من الكيجون' : 'أسفل من الكيجون'}
              </span>
            </div>

            {/* 4. Chikou Confirmation */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 flex flex-col justify-between">
              <span className="text-[11px] text-slate-400">تأكيد شيكو سبان (Chikou Lag)</span>
              <div className="my-1.5 flex items-center justify-between">
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded border ${
                    data.signals.chikou_confirmation === 'BULLISH'
                      ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                      : data.signals.chikou_confirmation === 'BEARISH'
                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {data.signals.chikou_confirmation === 'BULLISH'
                    ? 'تأكيد صاعد (فوق السعر)'
                    : data.signals.chikou_confirmation === 'BEARISH'
                    ? 'تأكيد هابط (تحت السعر)'
                    : 'محايد'}
                </span>
                {data.signals.cloud_twist && (
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded">
                    Kumo Twist
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500">
                لون السحابة: {data.values.cloud_color === 'GREEN' ? 'خضراء (صاعدة)' : 'حمراء (هابطة)'}
              </span>
            </div>
          </div>

          {/* Mini Vector Cloud Chart */}
          {chartSvg && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-4 mb-5">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2 border-b border-slate-800/60 pb-2">
                <span className="font-semibold text-slate-200">
                  رسم سحابة الكومو والخطوط الحسابية الخمسة
                </span>
                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-cyan-400 inline-block" /> تينكان (9)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" /> كيجون (26)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" /> سبان A
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-rose-400 inline-block" /> سبان B
                  </span>
                </div>
              </div>

              <div className="w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${chartSvg.width} ${chartSvg.height}`}
                  className="w-full h-44 select-none"
                >
                  {/* Shaded Kumo Cloud Polygon */}
                  {chartSvg.cloudPoly && (
                    <path
                      d={chartSvg.cloudPoly}
                      fill={data.values.cloud_color === 'GREEN' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(244, 63, 94, 0.18)'}
                      stroke={data.values.cloud_color === 'GREEN' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}
                      strokeWidth="1"
                    />
                  )}

                  {/* Senkou Span A */}
                  <path
                    d={chartSvg.pathSenkouA}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="1.2"
                    strokeDasharray="2,2"
                  />

                  {/* Senkou Span B */}
                  <path
                    d={chartSvg.pathSenkouB}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="1.2"
                    strokeDasharray="2,2"
                  />

                  {/* Kijun-sen */}
                  <path
                    d={chartSvg.pathKijun}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1.8"
                  />

                  {/* Tenkan-sen */}
                  <path
                    d={chartSvg.pathTenkan}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="1.8"
                  />

                  {/* Close Price Line */}
                  <path
                    d={chartSvg.pathCloses}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>
          )}

          {/* Support & Resistance Levels + Backtest Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dynamic S/R */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                مستويات الدعم والمقاومة الديناميكية (Dynamic S/R)
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">مستوى تينكان (دعم لحظي):</span>
                  <span className="font-bold text-cyan-400 text-sm">
                    {data.support_resistance.tenkan_level.toFixed(5)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">مستوى كيجون (دعم رئيسي):</span>
                  <span className="font-bold text-amber-400 text-sm">
                    {data.support_resistance.kijun_level.toFixed(5)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">سقف السحابة (مقاومة الكومو):</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {data.support_resistance.cloud_top_level.toFixed(5)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">قاع السحابة (دعم الكومو):</span>
                  <span className="font-bold text-rose-400 text-sm">
                    {data.support_resistance.cloud_bottom_level.toFixed(5)}
                  </span>
                </div>
              </div>
            </div>

            {/* Backtest Strategy Metrics */}
            {backtest && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    أداء إستراتيجية إيشيموكو (Backtest)
                  </h4>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
                    {backtest.total_trades} صفقة
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center font-mono mb-2">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">نسبة الفوز</span>
                    <span className="text-base font-bold text-emerald-400">
                      {backtest.win_rate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">معامل الربح PF</span>
                    <span className="text-base font-bold text-cyan-400">
                      {backtest.profit_factor}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">أقصى تراجع</span>
                    <span className="text-base font-bold text-rose-400">
                      {backtest.max_drawdown}%
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  إستراتيجية تتبع الاتجاه مع فلترة الصفقات عبر سحابة الكومو وتقاطعات TK Cross
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
