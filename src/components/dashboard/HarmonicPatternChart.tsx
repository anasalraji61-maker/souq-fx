import React, { useState, useEffect } from 'react';
import { harmonicAPI, HarmonicPattern, HarmonicDetectionResponse } from '../../api/harmonic';

interface HarmonicPatternChartProps {
  symbol?: string;
  timeframe?: string;
  onSelectPattern?: (pattern: HarmonicPattern) => void;
}

export const HarmonicPatternChart: React.FC<HarmonicPatternChartProps> = ({
  symbol = 'EURUSD',
  timeframe = '1h',
  onSelectPattern
}) => {
  const [data, setData] = useState<HarmonicDetectionResponse | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<HarmonicPattern | null>(null);
  const [tolerance, setTolerance] = useState<number>(0.08);
  const [loading, setLoading] = useState<boolean>(true);
  const [, setHistory] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    const fetchPatterns = async () => {
      setLoading(true);
      try {
        const res = await harmonicAPI.detectPatterns(symbol, timeframe, tolerance);
        if (mounted) {
          setData(res);
          if (res.patterns && res.patterns.length > 0) {
            setSelectedPattern(res.patterns[0]);
            if (onSelectPattern) onSelectPattern(res.patterns[0]);
          } else {
            setSelectedPattern(null);
          }
        }
        const hist = await harmonicAPI.getPatternHistory(symbol, timeframe);
        if (mounted) setHistory(hist);
      } catch (err) {
        console.error('Error fetching harmonic patterns:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchPatterns();
    const interval = setInterval(fetchPatterns, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [symbol, timeframe, tolerance]);

  const p = selectedPattern;

  // Coordinate mapping for SVG visualization
  const getSvgCoordinates = (pattern: HarmonicPattern) => {
    const pts = [
      pattern.points.X,
      pattern.points.A,
      pattern.points.B,
      pattern.points.C,
      pattern.points.D
    ];
    const prices = pts.map(pt => pt.price);
    const minP = Math.min(...prices, pattern.stop_loss, pattern.tp3);
    const maxP = Math.max(...prices, pattern.stop_loss, pattern.tp3);
    const range = maxP - minP || 0.001;

    // SVG canvas size: 700x340
    const padX = 70;
    const padY = 50;
    const width = 700;
    const height = 340;
    const plotW = width - (padX * 2);
    const plotH = height - (padY * 2);

    const getY = (val: number) => height - padY - ((val - minP) / range) * plotH;
    const xCoords = [padX, padX + plotW * 0.25, padX + plotW * 0.5, padX + plotW * 0.75, padX + plotW];

    return {
      X: { x: xCoords[0], y: getY(pts[0].price), price: pts[0].price },
      A: { x: xCoords[1], y: getY(pts[1].price), price: pts[1].price },
      B: { x: xCoords[2], y: getY(pts[2].price), price: pts[2].price },
      C: { x: xCoords[3], y: getY(pts[3].price), price: pts[3].price },
      D: { x: xCoords[4], y: getY(pts[4].price), price: pts[4].price },
      przMinY: getY(pattern.prz_min),
      przMaxY: getY(pattern.prz_max),
      slY: getY(pattern.stop_loss),
      tp1Y: getY(pattern.tp1),
      tp2Y: getY(pattern.tp2),
      tp3Y: getY(pattern.tp3),
      width,
      height
    };
  };

  const coords = p ? getSvgCoordinates(p) : null;
  const isBullish = p?.direction === 'BULLISH';
  const colorPrimary = isBullish ? '#10b981' : '#ef4444';
  const colorBg = isBullish ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl text-slate-100 flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-lg">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide">
                محرك التعرف على نماذج الهارمونيك (Harmonic Pattern Engine)
              </h2>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                Task 18
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              اكتشاف تلقائي لنسب الفيبوناتشي (XA, AB, BC, CD) ومناطق الانعكاس المحتملة PRZ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700">
            <span>نسبة التسامح (Tolerance):</span>
            <select
              value={tolerance}
              onChange={(e) => setTolerance(parseFloat(e.target.value))}
              className="bg-slate-900 text-xs text-slate-200 border border-slate-600 rounded px-1.5 py-0.5 focus:outline-none"
            >
              <option value={0.05}>±5% (Strict)</option>
              <option value={0.08}>±8% (Optimal)</option>
              <option value={0.12}>±12% (Flexible)</option>
            </select>
          </label>

          <span className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-mono">
            {symbol} • {timeframe}
          </span>
        </div>
      </div>

      {loading && !data && (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">جاري المسح الرياضي لنماذج الهارمونيك...</p>
        </div>
      )}

      {/* Main Content */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Visual Harmonic Chart */}
          <div className="lg:col-span-3 bg-slate-950/80 rounded-xl border border-slate-800/80 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-semibold text-slate-200">
                  {p ? `${p.pattern_type} (${p.direction})` : 'لا توجد نماذج نشطة في هذا الفريم'}
                </span>
                {p && (
                  <span className={`text-xs px-2 py-0.5 rounded font-mono font-medium ${
                    isBullish ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    الثقة: {p.confidence_score}%
                  </span>
                )}
              </div>

              {p && (
                <div className="text-xs text-slate-400 font-mono">
                  PRZ: <span className="text-amber-400 font-bold">{p.prz_min.toFixed(4)} - {p.prz_max.toFixed(4)}</span>
                </div>
              )}
            </div>

            {/* SVG Visualizer */}
            {p && coords ? (
              <div className="relative w-full overflow-x-auto">
                <svg viewBox={`0 0 ${coords.width} ${coords.height}`} className="w-full h-72 select-none">
                  {/* Grid Lines */}
                  <line x1="40" y1="60" x2="660" y2="60" stroke="#334155" strokeDasharray="3 3" strokeOpacity="0.4" />
                  <line x1="40" y1="170" x2="660" y2="170" stroke="#334155" strokeDasharray="3 3" strokeOpacity="0.4" />
                  <line x1="40" y1="280" x2="660" y2="280" stroke="#334155" strokeDasharray="3 3" strokeOpacity="0.4" />

                  {/* PRZ Zone Shading */}
                  <rect
                    x={coords.D.x - 35}
                    y={Math.min(coords.przMinY, coords.przMaxY)}
                    width="70"
                    height={Math.max(8, Math.abs(coords.przMaxY - coords.przMinY))}
                    fill="#f59e0b"
                    fillOpacity="0.22"
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                    rx="4"
                  />
                  <text x={coords.D.x} y={Math.min(coords.przMinY, coords.przMaxY) - 8} fill="#fbbf24" fontSize="11" textAnchor="middle" fontWeight="bold">
                    منطقة الانعكاس PRZ
                  </text>

                  {/* SL and TP Horizontal Target Lines */}
                  <line x1="40" y1={coords.slY} x2="660" y2={coords.slY} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5 3" />
                  <text x="655" y={coords.slY - 4} fill="#ef4444" fontSize="10" textAnchor="end" fontWeight="bold">
                    SL: {p.stop_loss.toFixed(4)}
                  </text>

                  <line x1="40" y1={coords.tp1Y} x2="660" y2={coords.tp1Y} stroke="#10b981" strokeWidth="1" strokeDasharray="4 2" />
                  <text x="655" y={coords.tp1Y - 4} fill="#10b981" fontSize="10" textAnchor="end">
                    TP1 (38.2%): {p.tp1.toFixed(4)}
                  </text>

                  <line x1="40" y1={coords.tp2Y} x2="660" y2={coords.tp2Y} stroke="#10b981" strokeWidth="1" strokeDasharray="4 2" />
                  <text x="655" y={coords.tp2Y - 4} fill="#10b981" fontSize="10" textAnchor="end">
                    TP2 (61.8%): {p.tp2.toFixed(4)}
                  </text>

                  <line x1="40" y1={coords.tp3Y} x2="660" y2={coords.tp3Y} stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 2" />
                  <text x="655" y={coords.tp3Y - 4} fill="#10b981" fontSize="10" textAnchor="end" fontWeight="bold">
                    TP3 (100%): {p.tp3.toFixed(4)}
                  </text>

                  {/* Harmonic Wings Filled Polygons */}
                  {/* Wing 1: X - A - B */}
                  <polygon
                    points={`${coords.X.x},${coords.X.y} ${coords.A.x},${coords.A.y} ${coords.B.x},${coords.B.y}`}
                    fill={colorBg}
                    stroke={colorPrimary}
                    strokeWidth="2"
                  />
                  {/* Wing 2: B - C - D */}
                  <polygon
                    points={`${coords.B.x},${coords.B.y} ${coords.C.x},${coords.C.y} ${coords.D.x},${coords.D.y}`}
                    fill={colorBg}
                    stroke={colorPrimary}
                    strokeWidth="2"
                  />

                  {/* Inner Dashed Harmony Lines: X to B, and A to C */}
                  <line x1={coords.X.x} y1={coords.X.y} x2={coords.B.x} y2={coords.B.y} stroke="#64748b" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1={coords.A.x} y1={coords.A.y} x2={coords.C.x} y2={coords.C.y} stroke="#64748b" strokeWidth="1" strokeDasharray="3 3" />

                  {/* Ratio Labels on Legs */}
                  <text x={(coords.X.x + coords.B.x) / 2} y={(coords.X.y + coords.B.y) / 2 - 8} fill="#38bdf8" fontSize="11" textAnchor="middle" fontWeight="bold">
                    XB: {p.ratios.XB}
                  </text>
                  <text x={(coords.B.x + coords.D.x) / 2} y={(coords.B.y + coords.D.y) / 2 + 14} fill="#a855f7" fontSize="11" textAnchor="middle" fontWeight="bold">
                    BD: {p.ratios.BD}
                  </text>
                  <text x={(coords.X.x + coords.D.x) / 2} y={coords.D.y > coords.X.y ? coords.D.y + 16 : coords.D.y - 10} fill="#f59e0b" fontSize="11" textAnchor="middle" fontWeight="bold">
                    XD: {p.ratios.XD}
                  </text>

                  {/* Pivot Point Markers: X, A, B, C, D */}
                  {[
                    { label: 'X', pt: coords.X, col: '#38bdf8' },
                    { label: 'A', pt: coords.A, col: '#38bdf8' },
                    { label: 'B', pt: coords.B, col: '#a855f7' },
                    { label: 'C', pt: coords.C, col: '#a855f7' },
                    { label: 'D (PRZ)', pt: coords.D, col: '#f59e0b' }
                  ].map((node, idx) => (
                    <g key={idx}>
                      <circle cx={node.pt.x} cy={node.pt.y} r="6" fill={node.col} stroke="#0f172a" strokeWidth="2" />
                      <text
                        x={node.pt.x}
                        y={node.pt.y + (node.pt.y < 120 ? -12 : 20)}
                        fill="#f8fafc"
                        fontSize="12"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {node.label}
                      </text>
                      <text
                        x={node.pt.x}
                        y={node.pt.y + (node.pt.y < 120 ? -26 : 34)}
                        fill="#94a3b8"
                        fontSize="10"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {node.pt.price.toFixed(4)}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center text-slate-500 text-sm">
                لم يتم رصد نموذج مكتمل حالياً، جرب توسيع نسبة التسامح أو فحص فريم آخر.
              </div>
            )}
          </div>

          {/* Side Panel: Ratio Verification & Trade Targets */}
          <div className="flex flex-col gap-4">
            {/* Pattern Card */}
            {p ? (
              <div className="bg-slate-950/80 rounded-xl border border-slate-800/80 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    نسب الفيبوناتشي المحققة
                  </h3>
                  <span className="text-xs text-emerald-400 font-mono">
                    مطابقة {p.confidence_score}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                    <div className="text-slate-400">XB Retracement:</div>
                    <div className="font-mono font-bold text-sky-400 mt-0.5">
                      {p.ratios.XB} <span className="text-slate-500 text-[10px]">({p.ideal_ratios.XB})</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                    <div className="text-slate-400">AC Retracement:</div>
                    <div className="font-mono font-bold text-purple-400 mt-0.5">
                      {p.ratios.AC} <span className="text-slate-500 text-[10px]">({p.ideal_ratios.AC})</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                    <div className="text-slate-400">BD Extension:</div>
                    <div className="font-mono font-bold text-indigo-400 mt-0.5">
                      {p.ratios.BD} <span className="text-slate-500 text-[10px]">({p.ideal_ratios.BD})</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                    <div className="text-slate-400">XD Overall:</div>
                    <div className="font-mono font-bold text-amber-400 mt-0.5">
                      {p.ratios.XD} <span className="text-slate-500 text-[10px]">({p.ideal_ratios.XD})</span>
                    </div>
                  </div>
                </div>

                {/* Trade Execution Signal Card */}
                <div className="mt-2 bg-slate-900/90 rounded-lg p-3 border border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-300">خطة التداول الموصى بها:</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      isBullish ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {isBullish ? 'شراء (BUY @ PRZ)' : 'بيع (SELL @ PRZ)'}
                    </span>
                  </div>

                  <div className="text-xs space-y-1.5 font-mono text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">دخول PRZ:</span>
                      <span className="text-amber-400 font-bold">{p.points.D.price.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">وقف الخسارة SL:</span>
                      <span className="text-red-400 font-bold">{p.stop_loss.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">الهدف الأول TP1:</span>
                      <span className="text-emerald-400">{p.tp1.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">الهدف الثاني TP2:</span>
                      <span className="text-emerald-400">{p.tp2.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">الهدف الثالث TP3:</span>
                      <span className="text-emerald-400 font-bold">{p.tp3.toFixed(4)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Pattern History / Switcher */}
            <div className="bg-slate-950/80 rounded-xl border border-slate-800/80 p-3 flex flex-col gap-2 flex-1">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                النماذج المكتشفة ({data.patterns.length})
              </h3>

              <div className="flex flex-col gap-1.5 overflow-y-auto max-h-48">
                {data.patterns.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedPattern(item);
                      if (onSelectPattern) onSelectPattern(item);
                    }}
                    className={`p-2 rounded-lg text-left text-xs transition border flex items-center justify-between ${
                      selectedPattern === item
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-900 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div>
                      <span className="font-bold">{item.pattern_type}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5 font-mono">({item.direction})</span>
                    </div>
                    <span className="font-mono text-xs text-amber-400 font-medium">
                      {item.confidence_score}%
                    </span>
                  </button>
                ))}
                {data.patterns.length === 0 && (
                  <div className="text-xs text-slate-500 py-4 text-center">
                    لا توجد نماذج محفوظة
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HarmonicPatternChart;
