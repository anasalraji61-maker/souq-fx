import React, { useState, useEffect } from 'react';
import { fibonacciAPI, FibonacciResponse } from '../../api/fibonacci';

interface FibonacciZonesChartProps {
  symbol?: string;
  timeframe?: string;
}

export const FibonacciZonesChart: React.FC<FibonacciZonesChartProps> = ({
  symbol = 'EURUSD',
  timeframe = '1h'
}) => {
  const [data, setData] = useState<FibonacciResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lookback, setLookback] = useState<number>(60);

  useEffect(() => {
    let mounted = true;
    const loadFib = async () => {
      setLoading(true);
      try {
        const res = await fibonacciAPI.analyze(symbol, timeframe, lookback);
        if (mounted) setData(res);
      } catch (err) {
        console.error('Error fetching fibonacci zones:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadFib();
    const interval = setInterval(loadFib, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [symbol, timeframe, lookback]);

  const getSignalBadge = (sig: string) => {
    switch (sig) {
      case 'BOUNCE_EXPECTED':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">ارتداد متوقع من الجيب الذهبي (Golden Pocket Bounce)</span>;
      case 'REJECTION_EXPECTED':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">رفض هبوطي متوقع من الجيب الذهبي (Rejection)</span>;
      case 'KEY_LEVEL_TEST':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-400 border border-sky-500/40">اختبار مستوى رئيسي (Key Level Test)</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">حركة طبيعية (Neutral)</span>;
    }
  };

  // SVG dimensions
  const svgWidth = 650;
  const svgHeight = 320;
  const padX = 70;
  const padY = 30;

  const minPrice = data ? Math.min(data.swing_low, data.current_price, ...data.extension_levels.map(e => e.price)) : 1.0;
  const maxPrice = data ? Math.max(data.swing_high, data.current_price, ...data.extension_levels.map(e => e.price)) : 1.1;
  const priceRange = maxPrice - minPrice || 0.01;

  const getY = (price: number) => {
    return svgHeight - padY - ((price - minPrice) / priceRange) * (svgHeight - padY * 2);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl text-slate-100 flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-lg">
            🌀
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide">
                محرك مناطق الفيبوناتشي التلقائي والجيب الذهبي (Auto-Fibonacci & Golden Pocket)
              </h2>
              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono">
                Task 21
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              رسم لحظي لتصحيحات وتمديدات الفيبوناتشي مع إبراز الجيب الذهبي (0.618 - 0.650) بدقة متناهية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {data && getSignalBadge(data.reaction_signal)}

          <label className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700">
            <span>نافذة القمم:</span>
            <select
              value={lookback}
              onChange={(e) => setLookback(parseInt(e.target.value))}
              className="bg-slate-900 text-xs text-slate-200 border border-slate-600 rounded px-1.5 py-0.5 focus:outline-none"
            >
              <option value={40}>40 شمعة</option>
              <option value={60}>60 شمعة</option>
              <option value={100}>100 شمعة</option>
            </select>
          </label>

          <span className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-mono">
            {symbol} • {timeframe}
          </span>
        </div>
      </div>

      {loading && !data && (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">جاري حساب القمم والقيعان ونسب الفيبوناتشي...</p>
        </div>
      )}

      {data && (
        <>
          {/* Golden Pocket Confluence Alert Card */}
          <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 transition ${
            data.is_in_golden_pocket
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
              : 'bg-slate-950/80 border-slate-800 text-slate-300'
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{data.is_in_golden_pocket ? '🎯' : '✨'}</span>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  منطقة الجيب الذهبي (Golden Pocket 0.618 - 0.650)
                </div>
                <div className="text-sm font-semibold mt-0.5">
                  النطاق السعري الحرج: <span className="font-mono text-amber-300">{data.golden_pocket_min.toFixed(4)} ➔ {data.golden_pocket_max.toFixed(4)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-400">السعر الحالي: </span>
                <span className="font-bold text-sky-400">{data.current_price.toFixed(4)}</span>
              </div>
              <div>
                <span className="text-slate-400">أقرب مستوى: </span>
                <span className="font-bold text-amber-400">{data.nearest_level.label} ({data.nearest_level.price.toFixed(4)})</span>
              </div>
            </div>
          </div>

          {/* SVG Visualizer & Table Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Visual Chart */}
            <div className="lg:col-span-2 bg-slate-950/90 rounded-xl border border-slate-800 p-3 flex flex-col justify-center">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-72 select-none">
                {/* Golden Pocket Shaded Band */}
                <rect
                  x={padX}
                  y={Math.min(getY(data.golden_pocket_min), getY(data.golden_pocket_max))}
                  width={svgWidth - padX - 20}
                  height={Math.max(10, Math.abs(getY(data.golden_pocket_max) - getY(data.golden_pocket_min)))}
                  fill="#f59e0b"
                  fillOpacity="0.25"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                  rx="3"
                />

                {/* Retracement Levels Lines */}
                {data.retracement_levels.map((lvl, idx) => {
                  const y = getY(lvl.price);
                  const isGP = lvl.is_golden_pocket;
                  return (
                    <g key={idx}>
                      <line
                        x1={padX}
                        y1={y}
                        x2={svgWidth - 20}
                        y2={y}
                        stroke={isGP ? '#f59e0b' : lvl.ratio === 0.5 ? '#38bdf8' : '#64748b'}
                        strokeWidth={isGP ? 1.5 : 1}
                        strokeDasharray={lvl.ratio === 0.0 || lvl.ratio === 1.0 ? '' : '4 2'}
                      />
                      <text
                        x={padX - 8}
                        y={y + 4}
                        fill={isGP ? '#fbbf24' : '#94a3b8'}
                        fontSize="10"
                        fontFamily="monospace"
                        textAnchor="end"
                        fontWeight={isGP ? 'bold' : 'normal'}
                      >
                        {lvl.ratio.toFixed(3)}
                      </text>
                      <text
                        x={svgWidth - 25}
                        y={y - 4}
                        fill={isGP ? '#fbbf24' : '#94a3b8'}
                        fontSize="10"
                        fontFamily="monospace"
                        textAnchor="end"
                      >
                        {lvl.price.toFixed(4)}
                      </text>
                    </g>
                  );
                })}

                {/* Current Price Line */}
                <line
                  x1={padX}
                  y1={getY(data.current_price)}
                  x2={svgWidth - 20}
                  y2={getY(data.current_price)}
                  stroke="#38bdf8"
                  strokeWidth="2"
                />
                <circle cx={svgWidth - 20} cy={getY(data.current_price)} r="4" fill="#38bdf8" />
                <text
                  x={svgWidth - 25}
                  y={getY(data.current_price) - 6}
                  fill="#38bdf8"
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="end"
                >
                  السعر: {data.current_price.toFixed(4)}
                </text>
              </svg>
            </div>

            {/* Levels List */}
            <div className="bg-slate-950/90 rounded-xl border border-slate-800 p-4 flex flex-col gap-2.5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                جدول مستويات الفيبوناتشي
              </h3>

              <div className="space-y-1.5 overflow-y-auto max-h-64 pr-1">
                {data.retracement_levels.map((lvl, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg text-xs font-mono flex items-center justify-between border ${
                      lvl.is_golden_pocket
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span>{lvl.label}</span>
                    <div className="flex items-center gap-2">
                      <span>{lvl.price.toFixed(4)}</span>
                      <span className="text-[10px] text-slate-500">({lvl.distance_pct}%)</span>
                    </div>
                  </div>
                ))}

                {data.extension_levels.map((ext, idx) => (
                  <div
                    key={`ext-${idx}`}
                    className="p-2 rounded-lg text-xs font-mono flex items-center justify-between bg-slate-900/50 border border-slate-800/60 text-slate-400"
                  >
                    <span>{ext.label}</span>
                    <div className="flex items-center gap-2">
                      <span>{ext.price.toFixed(4)}</span>
                      <span className="text-[10px] text-slate-500">({ext.distance_pct}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FibonacciZonesChart;
