import React, { useState, useEffect } from 'react';
import { smcAPI, SMCAnalysisResponse } from '../../api/smc';

interface SMCDashboardProps {
  symbol?: string;
  timeframe?: string;
}

export const SMCDashboard: React.FC<SMCDashboardProps> = ({
  symbol = 'EURUSD',
  timeframe = '1h'
}) => {
  const [data, setData] = useState<SMCAnalysisResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'all' | 'fvg' | 'ob' | 'sweeps'>('all');

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await smcAPI.analyze(symbol, timeframe);
        if (mounted) setData(res);
      } catch (err) {
        console.error('Error fetching SMC analysis:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();
    const timer = setInterval(loadData, 12000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [symbol, timeframe]);

  const getBiasBadge = (bias: string) => {
    switch (bias) {
      case 'STRONG_BULLISH':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">صعود مؤسسي قوي (Strong Bullish)</span>;
      case 'BULLISH':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">صعودي (Bullish)</span>;
      case 'STRONG_BEARISH':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/40">هبوط مؤسسي قوي (Strong Bearish)</span>;
      case 'BEARISH':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-300 border border-red-500/30">هبوطي (Bearish)</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-700/50 text-slate-300 border border-slate-600">محايد / توازن (Neutral)</span>;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl text-slate-100 flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 font-bold text-lg">
            🏦
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide">
                محرك مفاهيم الأموال الذكية واقتناص السيولة (SMC & Liquidity Sweeps)
              </h2>
              <span className="text-xs px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 font-mono">
                Task 19
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              رصد مناطق FVG، كتل الأوامر المؤسسية OB، كسر الهيكل BOS / CHoCH، واقتناص السيولة (Sweeps)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {data && getBiasBadge(data.market_bias)}
          <span className="text-xs px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-mono">
            {symbol} • {timeframe}
          </span>
        </div>
      </div>

      {loading && !data && (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">جاري مسح كتل الأوامر وفجوات السيولة المؤسسية...</p>
        </div>
      )}

      {data && (
        <>
          {/* Institutional Range: Premium & Discount Zone Visualizer */}
          <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400 uppercase tracking-wider">
                نطاق التداول المؤسسي (Premium / Equilibrium / Discount)
              </span>
              <span className="font-mono text-slate-300">
                السعر الحالي: <span className="text-sky-400 font-bold">{data.current_price.toFixed(4)}</span>
              </span>
            </div>

            {/* Range Bar */}
            <div className="relative w-full h-8 bg-slate-800 rounded-lg overflow-hidden flex items-center border border-slate-700">
              <div className="w-1/2 h-full bg-red-950/40 border-r border-amber-500/60 flex items-center justify-center text-[11px] text-red-300 font-medium">
                منطقة الغلاء (Premium Zone)
              </div>
              <div className="w-1/2 h-full bg-emerald-950/40 flex items-center justify-center text-[11px] text-emerald-300 font-medium">
                منطقة الخصم (Discount Zone)
              </div>
              {/* Equilibrium center marker */}
              <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-amber-400 z-10" />
            </div>

            <div className="flex justify-between text-xs font-mono text-slate-400">
              <span>قمة النطاق: {data.premium_discount.range_high.toFixed(4)}</span>
              <span className="text-amber-400 font-bold">التوازن (EQ 50%): {data.premium_discount.equilibrium.toFixed(4)}</span>
              <span>قاع النطاق: {data.premium_discount.range_low.toFixed(4)}</span>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400">فجوات القيمة العادلة النشطة</span>
              <div className="text-xl font-bold font-mono text-sky-400 mt-1">
                {data.active_fvgs.length} <span className="text-xs font-normal text-slate-500">/ {data.fvgs.length}</span>
              </div>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400">كتل الأوامر المؤسسية OB</span>
              <div className="text-xl font-bold font-mono text-purple-400 mt-1">
                {data.active_order_blocks.length} <span className="text-xs font-normal text-slate-500">نشطة</span>
              </div>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400">كسر الهيكل (BOS / CHoCH)</span>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                {data.structure_breaks.length} <span className="text-xs font-normal text-slate-500">إشارات</span>
              </div>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400">اقتناص السيولة (Sweeps)</span>
              <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                {data.liquidity_sweeps.length} <span className="text-xs font-normal text-slate-500">عملية</span>
              </div>
            </div>
          </div>

          {/* Tab Filter */}
          <div className="flex gap-2 border-b border-slate-800 pb-2">
            {[
              { id: 'all', label: 'كافة مفاهيم SMC' },
              { id: 'fvg', label: `فجوات القيمة FVG (${data.active_fvgs.length})` },
              { id: 'ob', label: `كتل الأوامر OB (${data.active_order_blocks.length})` },
              { id: 'sweeps', label: `اقتناص السيولة (${data.liquidity_sweeps.length})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`text-xs px-3 py-1.5 rounded-lg transition font-medium ${
                  activeTab === tab.id
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Details Feed */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Active FVGs */}
            {(activeTab === 'all' || activeTab === 'fvg') && (
              <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-4 flex flex-col gap-2.5">
                <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wide">
                  فجوات القيمة العادلة غير المغطاة (Active FVGs)
                </h3>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {data.active_fvgs.map((fvg, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          fvg.gap_type === 'BULLISH_FVG' ? 'bg-emerald-400' : 'bg-red-400'
                        }`} />
                        <span className="font-semibold">
                          {fvg.gap_type === 'BULLISH_FVG' ? 'فجوة شرائية (Bullish)' : 'فجوة بيعية (Bearish)'}
                        </span>
                      </div>
                      <div className="font-mono text-slate-300">
                        {fvg.bottom_price.toFixed(4)} - {fvg.top_price.toFixed(4)}
                        <span className="text-sky-400 ml-1.5 font-bold">({fvg.gap_size.toFixed(4)})</span>
                      </div>
                    </div>
                  ))}
                  {data.active_fvgs.length === 0 && (
                    <div className="text-xs text-slate-500 py-3 text-center">
                      كافة فجوات القيمة تمت تغطيتها (All Mitigated)
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Active Order Blocks */}
            {(activeTab === 'all' || activeTab === 'ob') && (
              <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-4 flex flex-col gap-2.5">
                <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wide">
                  كتل الأوامر المؤسسية النشطة (Active Order Blocks)
                </h3>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {data.active_order_blocks.map((ob, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          ob.block_type === 'BULLISH_OB' ? 'bg-emerald-400' : 'bg-red-400'
                        }`} />
                        <span className="font-semibold">
                          {ob.block_type === 'BULLISH_OB' ? 'كتلة شراء OB' : 'كتلة بيع OB'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-slate-300">{ob.bottom_price.toFixed(4)} - {ob.top_price.toFixed(4)}</span>
                        <span className="text-purple-400 font-bold">{ob.strength}%</span>
                      </div>
                    </div>
                  ))}
                  {data.active_order_blocks.length === 0 && (
                    <div className="text-xs text-slate-500 py-3 text-center">
                      لا توجد كتل أوامر نشطة قريبة
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Liquidity Sweeps */}
            {(activeTab === 'all' || activeTab === 'sweeps') && (
              <div className="md:col-span-2 bg-slate-950/80 rounded-xl border border-slate-800 p-4 flex flex-col gap-2.5">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                  عمليات اقتناص السيولة الأخيرة (Liquidity Sweeps / Turtle Soup)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {data.liquidity_sweeps.map((sweep, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col gap-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-300">
                          {sweep.sweep_type === 'BSL_SWEEP' ? 'اقتناص سيولة الشراء (BSL Sweep - فخ ثيران)' : 'اقتناص سيولة البيع (SSL Sweep - فخ دببة)'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {sweep.direction === 'BULLISH_REVERSAL' ? 'انعكاس صاعد' : 'انعكاس هابط'}
                        </span>
                      </div>
                      <div className="flex justify-between font-mono text-slate-400 mt-1">
                        <span>مستوى الكسر: {sweep.swept_level.toFixed(4)}</span>
                        <span>أقصى ذيل: {sweep.wick_extreme.toFixed(4)}</span>
                        <span className="text-emerald-400 font-bold">الهدف: {sweep.target_price.toFixed(4)}</span>
                      </div>
                    </div>
                  ))}
                  {data.liquidity_sweeps.length === 0 && (
                    <div className="text-xs text-slate-500 py-3 text-center col-span-2">
                      لا توجد عمليات اقتناص سيولة في الشموع الحالية
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SMCDashboard;
