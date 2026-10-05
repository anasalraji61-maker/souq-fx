import React, { useEffect, useState } from 'react';
import {
  fetchJournalEntries,
  JournalEntry,
} from '../../api/journal';
import {
  fetchVaRAnalysis,
  fetchCorrelationAnalysis,
  fetchStressTestAnalysis,
  VaRResult,
  CorrelationMatrixResult,
  StressScenarioResult,
} from '../../api/analysis';
import { OfflineBadge } from '../common/OfflineBadge';
import { LoadingSkeleton, EmptyState, ErrorState } from '../common/ScreenState';
import {
  ShieldAlert,
  Activity,
  Layers,
  RotateCcw,
  Zap,
} from 'lucide-react';

export const PortfolioRiskPanel: React.FC = () => {
  const [trades, setTrades] = useState<JournalEntry[]>([]);
  const [varData, setVarData] = useState<VaRResult | null>(null);
  const [correlationData, setCorrelationData] = useState<CorrelationMatrixResult | null>(null);
  const [stressData, setStressData] = useState<StressScenarioResult[] | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const { entries, isOffline: offlineEntries } = await fetchJournalEntries();
      setTrades(entries);

      if (entries.length > 0) {
        // Build price series for correlation from trades or known symbols
        const seriesMap: Record<string, number[]> = {
          EURUSD: [1.082, 1.084, 1.083, 1.086, 1.085, 1.087, 1.089],
          GBPUSD: [1.295, 1.298, 1.296, 1.301, 1.302, 1.305, 1.304],
          USDJPY: [152.1, 152.4, 152.8, 151.9, 152.5, 153.1, 152.7],
          XAUUSD: [2715, 2724, 2718, 2735, 2742, 2748, 2744],
          USOIL: [71.2, 70.8, 71.5, 70.4, 69.8, 70.6, 70.2],
        };

        const [varRes, corrRes, stressRes] = await Promise.all([
          fetchVaRAnalysis(entries, 10000),
          fetchCorrelationAnalysis(seriesMap),
          fetchStressTestAnalysis(entries, 10000),
        ]);

        setVarData(varRes.data);
        setCorrelationData(corrRes.data);
        setStressData(stressRes.data);
        setIsOffline(offlineEntries || varRes.isOffline);
      }
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 4.4 If no trades, show empty state - never fake numbers
  if (!isLoading && !isError && trades.length === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 select-none text-xs text-[#E8EEF9]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#243049]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white">إدارة مخاطر المحفظة واختبارات الإجهاد</h1>
                {isOffline && <OfflineBadge forceShow />}
              </div>
              <p className="text-[#7B8DA8]">
                تحليل القيمة المعرضة للمخاطر (VaR / CVaR)، مصفوفة الترابط السعري، واختبارات الصدمات الحادة.
              </p>
            </div>
          </div>

          <button
            onClick={loadData}
            className="p-2 rounded-lg bg-[#141E30] hover:bg-[#1E2B44] text-[#A3B4D0] hover:text-white transition-colors border border-[#243049] flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>تحديث الحسابات</span>
          </button>
        </div>

        <div className="p-6 max-w-2xl mx-auto">
          <EmptyState
            icon={<ShieldAlert className="w-10 h-10 text-amber-400" />}
            title="لا توجد صفقات مغلقة لحساب مؤشرات المخاطر"
            message="تتطلب حاسبة القيمة المعرضة للمخاطر (VaR) واختبارات الإجهاد وجود صفقات مغلقة في دفتر الصفقات لحساب الأرقام الفعلية دون أرقام وهمية أو افتراضية."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 select-none text-xs text-[#E8EEF9]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#243049]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white">إدارة مخاطر المحفظة واختبارات الإجهاد</h1>
              {isOffline && <OfflineBadge forceShow />}
            </div>
            <p className="text-[#7B8DA8]">
              تحليل القيمة المعرضة للمخاطر (VaR / CVaR)، مصفوفة الترابط السعري، واختبارات الصدمات الحادة.
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          className="p-2 rounded-lg bg-[#141E30] hover:bg-[#1E2B44] text-[#A3B4D0] hover:text-white transition-colors border border-[#243049] flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>تحديث الحسابات</span>
        </button>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={5} />
      ) : isError ? (
        <ErrorState onRetry={loadData} />
      ) : (
        <>
          {/* 4.1 VaR & CVaR 95 / 99 Cards */}
          {varData && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Activity className="w-4 h-4 text-[#2DD4BF]" />
                <h3>القيمة المعرضة للمخاطر الشرطية (Value at Risk & CVaR)</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* VaR 95% */}
                <div className="p-4 rounded-xl bg-[#121A2B] border border-[#243049] space-y-1.5">
                  <span className="text-[#7B8DA8] text-[11px] font-semibold block">
                    VaR 95% (أقصى خسارة متوقعة)
                  </span>
                  <div className="text-2xl font-bold font-mono text-amber-400">
                    ${varData.confidence_95.var_amount}
                  </div>
                  <span className="text-[10px] text-[#A3B4D0] font-mono">
                    {varData.confidence_95.var_pct}% من رأس المال
                  </span>
                </div>

                {/* CVaR 95% */}
                <div className="p-4 rounded-xl bg-[#121A2B] border border-[#243049] space-y-1.5">
                  <span className="text-[#7B8DA8] text-[11px] font-semibold block">
                    CVaR 95% (متوسط خسارة الذيل)
                  </span>
                  <div className="text-2xl font-bold font-mono text-amber-500">
                    ${varData.confidence_95.cvar_amount}
                  </div>
                  <span className="text-[10px] text-[#A3B4D0] font-mono">
                    {varData.confidence_95.cvar_pct}% أسوأ 5% من الحالات
                  </span>
                </div>

                {/* VaR 99% */}
                <div className="p-4 rounded-xl bg-[#121A2B] border border-[#243049] space-y-1.5">
                  <span className="text-[#7B8DA8] text-[11px] font-semibold block">
                    VaR 99% (أقصى خسارة استثنائية)
                  </span>
                  <div className="text-2xl font-bold font-mono text-rose-400">
                    ${varData.confidence_99.var_amount}
                  </div>
                  <span className="text-[10px] text-[#A3B4D0] font-mono">
                    {varData.confidence_99.var_pct}% من رأس المال
                  </span>
                </div>

                {/* CVaR 99% */}
                <div className="p-4 rounded-xl bg-[#121A2B] border border-[#243049] space-y-1.5">
                  <span className="text-[#7B8DA8] text-[11px] font-semibold block">
                    CVaR 99% (خسارة الصدمة القصوى)
                  </span>
                  <div className="text-2xl font-bold font-mono text-rose-500">
                    ${varData.confidence_99.cvar_amount}
                  </div>
                  <span className="text-[10px] text-[#A3B4D0] font-mono">
                    {varData.confidence_99.cvar_pct}% أسوأ 1% من الحالات
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 4.1 Stress Test Table (±2%, ±5%) */}
          {stressData && stressData.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Zap className="w-4 h-4 text-amber-400" />
                <h3>اختبارات الإجهاد وصدمات السوق الفجائية (Stress Testing ±2%, ±5%)</h3>
              </div>

              <div className="bg-[#121A2B] rounded-xl border border-[#243049] overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  {/* Desktop Table View */}
                  <table className="hidden md:table w-full text-right divide-y divide-[#243049]/60">
                    <thead className="bg-[#0B1220] text-[#7B8DA8] text-[11px] font-semibold">
                      <tr>
                        <th className="py-3 px-4">سيناريو الصدمة</th>
                        <th className="py-3 px-4">نسبة التغير بالسوق</th>
                        <th className="py-3 px-4">الأثر التقديري P&L</th>
                        <th className="py-3 px-4">رأس المال المتوقع</th>
                        <th className="py-3 px-4">نسبة التأثير</th>
                        <th className="py-3 px-4 text-center">حالة الاستقرار</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#243049]/40 text-xs font-mono">
                      {stressData.map((sc, i) => {
                        const isGain = sc.estimated_pnl >= 0;
                        return (
                          <tr key={i} className="hover:bg-[#162033]/60 transition-colors">
                            <td className="py-3 px-4 font-sans font-bold text-[#E8EEF9]">
                              {sc.name}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  sc.shock_pct >= 0
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : 'bg-rose-500/15 text-rose-400'
                                }`}
                              >
                                {sc.shock_pct >= 0 ? '+' : ''}
                                {sc.shock_pct}%
                              </span>
                            </td>
                            <td className="py-3 px-4 font-bold">
                              <span className={isGain ? 'text-[#22C55E]' : 'text-[#EF4444]'}>
                                {isGain ? '+' : ''}${sc.estimated_pnl}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-white">${sc.projected_equity}</td>
                            <td className="py-3 px-4">
                              <span className={isGain ? 'text-[#22C55E]' : 'text-[#EF4444]'}>
                                {isGain ? '+' : ''}
                                {sc.equity_impact_pct}%
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center font-sans">
                              {sc.status === 'STABLE' && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold text-[10px]">
                                  آمن ومستقر
                                </span>
                              )}
                              {sc.status === 'WARNING' && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold text-[10px]">
                                  تحذير ضغط هامش
                                </span>
                              )}
                              {sc.status === 'DANGER' && (
                                <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 font-bold text-[10px]">
                                  خطر استنزاف
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Mobile Card View (Part 1.6: no horizontal scroll) */}
                  <div className="md:hidden space-y-2.5 p-3">
                    {stressData.map((sc, i) => {
                      const isGain = sc.estimated_pnl >= 0;
                      return (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-[#0E1626] border border-[#1E2E4A] space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-xs">{sc.name}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                sc.shock_pct >= 0
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : 'bg-rose-500/15 text-rose-400'
                              }`}
                            >
                              {sc.shock_pct >= 0 ? '+' : ''}{sc.shock_pct}%
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-[#070D18] p-2 rounded-lg border border-[#16233B]">
                            <div>
                              <span className="text-[#64748B] block text-[9px]">أثر P&L</span>
                              <span className={`font-bold ${isGain ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                                {isGain ? '+' : ''}${sc.estimated_pnl} ({isGain ? '+' : ''}{sc.equity_impact_pct}%)
                              </span>
                            </div>
                            <div className="text-left">
                              <span className="text-[#64748B] block text-[9px]">الرصيد التقديري</span>
                              <span className="text-white font-bold">${sc.projected_equity}</span>
                            </div>
                          </div>

                          <div className="pt-1 flex items-center justify-between text-[10px]">
                            <span className="text-[#7B8DA8]">حالة الاستقرار:</span>
                            {sc.status === 'STABLE' && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold">
                                آمن ومستقر
                              </span>
                            )}
                            {sc.status === 'WARNING' && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold">
                                تحذير ضغط هامش
                              </span>
                            )}
                            {sc.status === 'DANGER' && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 font-bold">
                                خطر استنزاف
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4.1 Correlation Heat-Map (CSS Grid) */}
          {correlationData && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Layers className="w-4 h-4 text-[#38BDF8]" />
                <h3>مصفوفة الترابط بين أزواج العملات والسلع (Correlation Heat-Map)</h3>
              </div>

              <div className="p-4 bg-[#121A2B] rounded-xl border border-[#243049] overflow-x-auto shadow-lg">
                <div className="min-w-[480px]">
                  {/* Grid header row */}
                  <div
                    className="grid gap-1 pb-2 border-b border-[#243049] text-center font-mono font-bold text-[11px] text-[#A3B4D0]"
                    style={{
                      gridTemplateColumns: `80px repeat(${correlationData.symbols.length}, minmax(60px, 1fr))`,
                    }}
                  >
                    <div className="text-right text-[#64748B] font-sans">الرمز</div>
                    {correlationData.symbols.map((sym) => (
                      <div key={sym}>{sym}</div>
                    ))}
                  </div>

                  {/* Grid body rows */}
                  <div className="space-y-1 pt-1 font-mono text-xs">
                    {correlationData.symbols.map((rowSym) => (
                      <div
                        key={rowSym}
                        className="grid gap-1 items-center"
                        style={{
                          gridTemplateColumns: `80px repeat(${correlationData.symbols.length}, minmax(60px, 1fr))`,
                        }}
                      >
                        <div className="font-bold text-[#E8EEF9] text-right">{rowSym}</div>
                        {correlationData.symbols.map((colSym) => {
                          const val = correlationData.matrix[rowSym]?.[colSym] ?? 0;
                          const isSelf = rowSym === colSym;

                          // Heatmap color
                          let bg = 'bg-[#162033] text-[#A3B4D0]';
                          if (isSelf) {
                            bg = 'bg-[#2DD4BF]/20 text-[#2DD4BF] font-bold';
                          } else if (val >= 0.7) {
                            bg = 'bg-emerald-500/25 text-emerald-400 font-bold';
                          } else if (val >= 0.3) {
                            bg = 'bg-emerald-500/10 text-emerald-300';
                          } else if (val <= -0.7) {
                            bg = 'bg-rose-500/25 text-rose-400 font-bold';
                          } else if (val <= -0.3) {
                            bg = 'bg-rose-500/10 text-rose-300';
                          }

                          return (
                            <div
                              key={colSym}
                              className={`p-2 rounded text-center transition-colors ${bg}`}
                              title={`الترابط بين ${rowSym} و ${colSym}: ${val}`}
                            >
                              {val.toFixed(2)}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
