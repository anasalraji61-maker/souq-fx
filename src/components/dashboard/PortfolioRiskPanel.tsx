import React, { useEffect, useState } from 'react';

interface VaRReport {
  portfolio_equity: number;
  total_exposure: number;
  exposure_leverage: number;
  daily_volatility_pct: number;
  var_95_pct: number;
  var_95_amount: number;
  cvar_95_pct: number;
  cvar_95_amount: number;
  var_99_pct: number;
  var_99_amount: number;
  cvar_99_pct: number;
  cvar_99_amount: number;
}

interface StressScenario {
  scenario_id: string;
  name_ar: string;
  name_en: string;
  shock_pct: number;
  estimated_pnl: number;
  projected_equity: number;
  equity_impact_pct: number;
  margin_call_risk: boolean;
  status: 'STABLE' | 'WARNING' | 'DANGER';
}

interface HighCorrelationRisk {
  pair1: string;
  pair2: string;
  correlation: number;
  risk_warning: string;
}

interface PortfolioRiskData {
  portfolio_equity: number;
  positions_count: number;
  unique_pairs_count: number;
  diversification_score: number;
  diversification_status: 'EXCELLENT' | 'MODERATE' | 'CONCENTRATED';
  var_cvar: VaRReport;
  correlation_matrix: Record<string, Record<string, number>>;
  high_correlation_risks: HighCorrelationRisk[];
  stress_test_scenarios: StressScenario[];
}

interface RiskControlsSummary {
  trading_mode: string;
  live_trading_locked: boolean;
  max_trade_size_lots: number;
  daily_loss: {
    realized_loss_usd: number;
    daily_limit_usd: number;
    loss_pct_of_limit: number;
    is_frozen: boolean;
  };
  circuit_breaker: {
    is_active: boolean;
    consecutive_losses: number;
    threshold: number;
    cooldown_remaining_sec: number;
    reason: string;
  };
  margin: {
    equity: number;
    margin_used: number;
    margin_level_pct: number;
    status: 'HEALTHY' | 'WARNING' | 'DANGER';
  };
  overall_status: 'READY' | 'LOCKED';
}

export const PortfolioRiskPanel: React.FC = () => {
  const [riskData, setRiskData] = useState<PortfolioRiskData | null>(null);
  const [controlsData, setControlsData] = useState<RiskControlsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [riskRes, controlsRes] = await Promise.all([
        fetch('/api/risk/portfolio-analysis').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/risk/controls-status').then((r) => (r.ok ? r.json() : null)),
      ]);
      if (riskRes) setRiskData(riskRes);
      if (controlsRes) setControlsData(controlsRes);
    } catch (err: any) {
      setError(err?.message || 'تعذر جلب بيانات تحليل المخاطر');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6 text-slate-100 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              إدارة مخاطر المحفظة وقواطع الدائرة (Portfolio Risk & Controls)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            حساب القيمة المعرضة للخطر (VaR & CVaR 95/99%)، مصفوفة الارتباط، واختبارات الصدمات المفاجئة
          </p>
        </div>

        <div className="flex items-center gap-3">
          {controlsData && (
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                controlsData.live_trading_locked
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                  : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              }`}
            >
              {controlsData.trading_mode === 'LIVE' ? '🟢 وضع حقيقي (LIVE)' : '🛡️ وضع تجريبي آمن (Paper Demo)'}
            </span>
          )}

          <button
            onClick={loadData}
            disabled={loading}
            className="p-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
          >
            🔄
          </button>
        </div>
      </div>

      {loading && (
        <div className="h-48 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400">جاري احتساب محاكاة المخاطر ومصفوفة الارتباط...</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300">
          ⚠️ {error}
        </div>
      )}

      {!loading && (
        <>
          {/* Risk Controls & Circuit Breaker Ribbon */}
          {controlsData && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-800/40 p-3 rounded-lg border border-slate-800">
              {/* Circuit Breaker Status */}
              <div className="flex flex-col">
                <span className="text-[11px] text-slate-400">قاطع الدائرة (Circuit Breaker)</span>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      controlsData.circuit_breaker.is_active ? 'bg-red-500 animate-ping' : 'bg-emerald-400'
                    }`}
                  />
                  <span
                    className={`text-sm font-bold ${
                      controlsData.circuit_breaker.is_active ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {controlsData.circuit_breaker.is_active ? 'مفعل (تجميد الأوامر)' : 'طبيعي ومستقر'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5">
                  خسائر متتالية: {controlsData.circuit_breaker.consecutive_losses} / {controlsData.circuit_breaker.threshold}
                </span>
              </div>

              {/* Daily Loss Limit */}
              <div className="flex flex-col">
                <span className="text-[11px] text-slate-400">سقف الخسارة اليومية</span>
                <div className="text-sm font-mono font-bold text-white mt-1">
                  ${controlsData.daily_loss.realized_loss_usd.toFixed(2)} / ${controlsData.daily_loss.daily_limit_usd.toFixed(2)}
                </div>
                <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div
                    className={`h-full ${
                      controlsData.daily_loss.loss_pct_of_limit >= 80 ? 'bg-red-500' : 'bg-amber-400'
                    }`}
                    style={{ width: `${Math.min(100, controlsData.daily_loss.loss_pct_of_limit)}%` }}
                  />
                </div>
              </div>

              {/* Margin Monitoring */}
              <div className="flex flex-col">
                <span className="text-[11px] text-slate-400">مستوى الهامش (Margin Level)</span>
                <div className="text-sm font-mono font-bold text-white mt-1">
                  <span
                    className={
                      controlsData.margin.status === 'DANGER'
                        ? 'text-red-400 font-extrabold'
                        : controlsData.margin.status === 'WARNING'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }
                  >
                    {controlsData.margin.margin_level_pct}%
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5">
                  الوضع: {controlsData.margin.status === 'HEALTHY' ? 'آمن (فوق 150%)' : 'تحت المراقبة'}
                </span>
              </div>

              {/* Max Size Limit */}
              <div className="flex flex-col">
                <span className="text-[11px] text-slate-400">الحد الأقصى للصفقة الواحدة</span>
                <div className="text-sm font-mono font-bold text-cyan-300 mt-1">
                  {controlsData.max_trade_size_lots.toFixed(2)} لوت قياسي
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5">حماية من الإفراط في المخاطرة</span>
              </div>
            </div>
          )}

          {/* VaR & CVaR KPI Cards */}
          {riskData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* VaR 95% */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  VaR 95% (يومي)
                </span>
                <div className="text-lg md:text-xl font-mono font-extrabold text-amber-400 mt-1">
                  ${riskData.var_cvar.var_95_amount.toFixed(2)}
                </div>
                <span className="text-[11px] text-slate-400">
                  {riskData.var_cvar.var_95_pct}% من المحفظة
                </span>
              </div>

              {/* CVaR 95% */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  CVaR 95% (الخسارة المشروطة)
                </span>
                <div className="text-lg md:text-xl font-mono font-extrabold text-orange-400 mt-1">
                  ${riskData.var_cvar.cvar_95_amount.toFixed(2)}
                </div>
                <span className="text-[11px] text-slate-400">
                  {riskData.var_cvar.cvar_95_pct}% في أسوأ 5%
                </span>
              </div>

              {/* VaR 99% */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  VaR 99% (أقصى صدمة)
                </span>
                <div className="text-lg md:text-xl font-mono font-extrabold text-rose-400 mt-1">
                  ${riskData.var_cvar.var_99_amount.toFixed(2)}
                </div>
                <span className="text-[11px] text-slate-400">
                  {riskData.var_cvar.var_99_pct}% من المحفظة
                </span>
              </div>

              {/* Diversification Score */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  مؤشر تنويع المخاطر
                </span>
                <div className="text-lg md:text-xl font-mono font-extrabold text-cyan-300 mt-1">
                  {riskData.diversification_score} / 100
                </div>
                <span className="text-[11px] text-slate-400">
                  الحالة: {riskData.diversification_status}
                </span>
              </div>
            </div>
          )}

          {/* Stress Testing Scenarios Table */}
          {riskData && riskData.stress_test_scenarios && (
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <span>💥</span> سيناريوهات اختبارات الضغط (Stress Testing Shocks)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-700/60 pb-2">
                      <th className="py-2 px-2">السيناريو</th>
                      <th className="py-2 px-2">الصدمة السعرية</th>
                      <th className="py-2 px-2">الأثر المالي المتوقع (P&L)</th>
                      <th className="py-2 px-2">رأس المال بعد الصدمة</th>
                      <th className="py-2 px-2">خطر نداء الهامش</th>
                      <th className="py-2 px-2">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riskData.stress_test_scenarios.map((sc) => (
                      <tr key={sc.scenario_id} className="border-b border-slate-800/40 hover:bg-slate-800/30">
                        <td className="py-2.5 px-2 font-medium text-white">{sc.name_ar}</td>
                        <td className="py-2.5 px-2 font-mono">
                          {sc.shock_pct > 0 ? `+${sc.shock_pct}%` : `${sc.shock_pct}%`}
                        </td>
                        <td
                          className={`py-2.5 px-2 font-mono font-bold ${
                            sc.estimated_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {sc.estimated_pnl >= 0 ? `+$${sc.estimated_pnl.toFixed(2)}` : `-$${Math.abs(sc.estimated_pnl).toFixed(2)}`}
                        </td>
                        <td className="py-2.5 px-2 font-mono text-slate-200">
                          ${sc.projected_equity.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-2">
                          {sc.margin_call_risk ? (
                            <span className="px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 font-bold">
                              مرتفع جداً ⚠️
                            </span>
                          ) : (
                            <span className="text-slate-400">مستبعد</span>
                          )}
                        </td>
                        <td className="py-2.5 px-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              sc.status === 'STABLE'
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                                : sc.status === 'WARNING'
                                ? 'bg-amber-950/60 text-amber-400 border border-amber-800/50'
                                : 'bg-rose-950/60 text-rose-400 border border-rose-800/50'
                            }`}
                          >
                            {sc.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Educational Disclaimer */}
          <div className="pt-2 border-t border-slate-800 text-center">
            <span className="text-[11px] text-slate-500">
              خدمة تحليل فني تعليمية • ليست نصيحة استثمارية • التداول الحقيقي محمي ومغلق افتراضياً
            </span>
          </div>
        </>
      )}
    </div>
  );
};
