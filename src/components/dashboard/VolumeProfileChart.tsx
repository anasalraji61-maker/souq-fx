import React, { useEffect, useState, useMemo } from 'react';
import {
  fetchVolumeProfileAnalysis,
  VolumeProfileResponse,
} from '../../api/volumeProfile';

interface VolumeProfileChartProps {
  initialSymbol?: string;
  initialTimeframe?: string;
}

export const VolumeProfileChart: React.FC<VolumeProfileChartProps> = ({
  initialSymbol = 'EURUSD',
  initialTimeframe = '1h',
}) => {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [timeframe, setTimeframe] = useState(initialTimeframe);
  const [binsCount] = useState<number>(28);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VolumeProfileResponse | null>(null);

  const symbolsList = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'XAUUSD'];
  const timeframesList = ['5m', '15m', '1h', '4h', '1d'];

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchVolumeProfileAnalysis(symbol, timeframe, binsCount);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل بيانات بروفايل السيولة الحجمية');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [symbol, timeframe, binsCount]);

  // Calculations for horizontal volume bars
  const maxBinVolume = useMemo(() => {
    if (!data || !data.bins.length) return 1;
    return Math.max(...data.bins.map((b) => b.volume), 1);
  }, [data]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6 text-slate-100 shadow-2xl space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              بروفايل السيولة الحجمية وتدفق الأوامر (Volume Profile & Order Flow)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            رصد نقطة التحكم POC ومنطقة القيمة 70% (VAH / VAL) والخلل اللحظي بين أوامر الشراء والبيع (Delta)
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Symbol */}
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold"
          >
            {symbolsList.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Timeframe */}
          <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            {timeframesList.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  timeframe === tf
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            title="تحديث لحظي"
          >
            🔄
          </button>
        </div>
      </div>

      {loading && (
        <div className="h-64 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400">جاري مسح دفاتر الأوامر وحساب منطقة القيمة...</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300">
          ⚠️ {error}
        </div>
      )}

      {!loading && data && (
        <>
          {/* Metric KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* POC Card */}
            <div className="bg-slate-800/60 border border-amber-500/30 rounded-lg p-3 relative overflow-hidden">
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                نقطة التحكم (POC)
              </div>
              <div className="text-lg md:text-xl font-mono font-extrabold text-amber-300 mt-1">
                {data.poc_price.toFixed(4)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                فرق السعر: {data.price_to_poc_distance_pct > 0 ? '+' : ''}
                {data.price_to_poc_distance_pct}%
              </div>
              <div className="absolute top-1 right-2 text-2xl opacity-10">🎯</div>
            </div>

            {/* Value Area Card */}
            <div className="bg-slate-800/60 border border-cyan-500/30 rounded-lg p-3 relative overflow-hidden">
              <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                منطقة القيمة 70% (VAH - VAL)
              </div>
              <div className="text-sm font-mono font-bold text-white mt-1">
                <span className="text-cyan-300">{data.vah_price.toFixed(4)}</span>
                <span className="text-slate-500 mx-1">→</span>
                <span className="text-cyan-300">{data.val_price.toFixed(4)}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                السعر الحالي: <span className="font-mono text-white">{data.current_price.toFixed(4)}</span>
              </div>
              <div className="absolute top-1 right-2 text-2xl opacity-10">📐</div>
            </div>

            {/* Order Flow Net Delta */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  تدفق الأوامر (Delta)
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30">
                  تقدير
                </span>
              </div>
              <div
                className={`text-lg md:text-xl font-mono font-extrabold mt-1 ${
                  data.order_flow_summary.net_delta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {data.order_flow_summary.net_delta >= 0 ? '+' : ''}
                {data.order_flow_summary.net_delta.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 flex justify-between">
                <span>CVD: {data.order_flow_summary.cvd.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500">حجم الشموع (تقدير)</span>
              </div>
              <div className="absolute top-1 right-2 text-2xl opacity-10">🌊</div>
            </div>

            {/* Buy / Sell Dominance */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 relative overflow-hidden">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                ميزان القوى الشرائية / البيعية
              </div>
              <div className="text-sm font-bold text-slate-200 mt-1 flex justify-between items-center">
                <span className="text-emerald-400">{data.order_flow_summary.buy_ratio_pct}% شراء</span>
                <span className="text-rose-400">
                  {(100 - data.order_flow_summary.buy_ratio_pct).toFixed(1)}% بيع
                </span>
              </div>
              {/* Ratio bar */}
              <div className="w-full bg-rose-950/60 h-1.5 rounded-full mt-2 overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${data.order_flow_summary.buy_ratio_pct}%` }}
                />
              </div>
              <div className="absolute top-1 right-2 text-2xl opacity-10">⚖️</div>
            </div>
          </div>

          {/* Volume Profile Histogram & Depth Chart */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4">
            <div className="flex justify-between items-center text-xs text-slate-400 mb-3 border-b border-slate-800 pb-2">
              <span className="font-semibold text-slate-300">
                📊 توزيع السيولة الحجمية على مستويات الأسعار (Horizontal Volume Profile)
              </span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-amber-400 rounded-sm" /> POC
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-cyan-500/40 border border-cyan-400 rounded-sm" /> Value Area (70%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" /> Buy Vol
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-sm" /> Sell Vol
                </span>
              </div>
            </div>

            {/* Bins List (Reversed so highest price is at top) */}
            <div className="space-y-1 font-mono text-xs max-h-[380px] overflow-y-auto pr-1">
              {[...data.bins].reverse().map((bin) => {
                const totalPct = (bin.volume / maxBinVolume) * 100;
                const buyPct = (bin.buy_volume / Math.max(1, bin.volume)) * totalPct;
                const sellPct = totalPct - buyPct;

                const isCurrentPriceNear = Math.abs(bin.price_level - data.current_price) < (data.vah_price - data.val_price) / binsCount;

                return (
                  <div
                    key={bin.bin_index}
                    className={`group flex items-center gap-2 py-0.5 px-2 rounded transition-colors ${
                      bin.is_poc
                        ? 'bg-amber-500/20 border-r-4 border-amber-400'
                        : bin.in_value_area
                        ? 'bg-cyan-950/20 border-r-2 border-cyan-600/40'
                        : 'hover:bg-slate-900/60'
                    }`}
                  >
                    {/* Price Label */}
                    <div className="w-16 text-right font-medium text-slate-300 flex items-center justify-end gap-1">
                      {isCurrentPriceNear && <span className="text-[10px] text-emerald-400 animate-ping">●</span>}
                      <span>{bin.price_level.toFixed(4)}</span>
                    </div>

                    {/* Horizontal Volume Bar */}
                    <div className="flex-1 h-3.5 bg-slate-900/90 rounded flex overflow-hidden relative">
                      {/* Buy Volume Slice */}
                      <div
                        className="bg-emerald-500/80 transition-all duration-300"
                        style={{ width: `${buyPct}%` }}
                      />
                      {/* Sell Volume Slice */}
                      <div
                        className="bg-rose-500/80 transition-all duration-300"
                        style={{ width: `${sellPct}%` }}
                      />

                      {/* POC Gold Accent */}
                      {bin.is_poc && (
                        <div
                          className="absolute inset-y-0 left-0 border-r-2 border-amber-300 bg-amber-400/30"
                          style={{ width: `${totalPct}%` }}
                        />
                      )}
                    </div>

                    {/* Indicators Badge */}
                    <div className="w-24 text-left flex items-center gap-1 text-[10px]">
                      {bin.is_poc && (
                        <span className="bg-amber-500 text-slate-950 px-1 py-0.2 rounded font-extrabold text-[9px]">
                          POC
                        </span>
                      )}
                      {bin.is_hvn && !bin.is_poc && (
                        <span className="bg-purple-900/80 text-purple-300 border border-purple-700/60 px-1 rounded text-[9px]">
                          HVN
                        </span>
                      )}
                      {bin.is_lvn && (
                        <span className="bg-slate-800 text-slate-400 px-1 rounded text-[9px]">
                          LVN
                        </span>
                      )}
                      <span className="text-slate-400 text-[10px] ml-auto">
                        {bin.volume.toFixed(0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Trading Signals & Order Flow Alerts */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <span>⚡ إشارات وتنبيهات تدفق الأوامر ومناطق السيولة</span>
              <span className="text-xs font-normal text-slate-400">
                ({data.trading_signals.length} إشارة نشطة)
              </span>
            </h3>

            {data.trading_signals.length === 0 ? (
              <div className="p-3 bg-slate-800/40 rounded-lg text-xs text-slate-400 text-center">
                السعر يتداول حالياً ضمن نطاق التوازن الطبيعي حول منطقة القيمة دون وجود اختلال حجمي شاذ.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.trading_signals.map((sig, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border flex flex-col justify-between space-y-2 ${
                      sig.direction === 'BUY'
                        ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200'
                        : 'bg-rose-950/30 border-rose-800/50 text-rose-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            sig.direction === 'BUY' ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                        />
                        {sig.direction === 'BUY' ? 'فرصة شرائية (BUY)' : 'فرصة بيعية (SELL)'}
                      </span>
                      <span className="text-[10px] bg-slate-900/80 px-2 py-0.5 rounded font-mono">
                        القوة {sig.strength}%
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{sig.message}</p>

                    {(sig.target_price || sig.stop_loss) && (
                      <div className="flex items-center gap-3 pt-1 border-t border-slate-800/60 font-mono text-[11px]">
                        {sig.target_price && (
                          <span className="text-emerald-400">
                            الهدف (TP): {sig.target_price.toFixed(4)}
                          </span>
                        )}
                        {sig.stop_loss && (
                          <span className="text-rose-400">
                            وقف الخسارة (SL): {sig.stop_loss.toFixed(4)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default VolumeProfileChart;
