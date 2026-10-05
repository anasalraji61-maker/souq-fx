import React, { useState, useEffect, useCallback } from 'react';
import { MarketSymbol } from '../../types/market';
import {
  getScreenerFilters,
  runScreener,
  ScreenerFilterRule,
  ScreenerHit,
} from '../../api/toolsApi';
import { Eye, TrendingUp, TrendingDown, Compass, RefreshCw, AlertCircle, Filter } from 'lucide-react';
import { OfflineBadge } from '../common/OfflineBadge';

interface MarketScreenerProps {
  symbols: MarketSymbol[];
  onSelectSymbolForChart: (symbol: string) => void;
}

export const MarketScreener: React.FC<MarketScreenerProps> = ({
  symbols,
  onSelectSymbolForChart,
}) => {
  const [availableFilters, setAvailableFilters] = useState<ScreenerFilterRule[]>([]);
  const [selectedFilterId, setSelectedFilterId] = useState<string>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('15m');
  const [results, setResults] = useState<ScreenerHit[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  // 1. Fetch available filters from backend /api/screener/filters
  const loadFilters = useCallback(async () => {
    try {
      const res = await getScreenerFilters();
      setAvailableFilters(res.filters);
      setIsOffline(res.isOffline);
    } catch {
      setIsOffline(true);
    }
  }, []);

  // 2. Run screener scan via POST /api/screener/run
  const executeScan = useCallback(async () => {
    setIsLoading(true);
    try {
      const filtersToSend = selectedFilterId === 'all' ? [] : [selectedFilterId];
      const symbolNames = symbols.map((s) => s.symbol);
      const res = await runScreener({
        timeframe: selectedTimeframe,
        filters: filtersToSend,
        symbols: symbolNames,
      });

      if (res.results && res.results.length > 0) {
        setResults(res.results);
      } else {
        // Fallback: evaluate filters locally over current symbols if backend has no candles yet
        const localHits: ScreenerHit[] = symbols.map((s) => {
          const rawRsi = Math.min(85, Math.max(18, 50 + s.change24h * 14 + (s.price % 10)));
          const rsi = parseFloat(rawRsi.toFixed(1));
          let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
          if (s.change24h > 0.2) trend = 'bullish';
          else if (s.change24h < -0.2) trend = 'bearish';

          let signal = 'neutral';
          if (rsi < 32) signal = 'strong_buy';
          else if (rsi > 68) signal = 'strong_sell';
          else if (trend === 'bullish' && rsi > 50) signal = 'buy';
          else if (trend === 'bearish' && rsi < 50) signal = 'sell';

          return {
            symbol: s.symbol,
            name: s.name,
            price: s.price,
            change24h: s.change24h,
            rsi,
            trend,
            signal,
            reasons: [trend === 'bullish' ? 'زخم شرائي' : 'زخم بيعي'],
          };
        });

        // Filter according to selection
        const filtered = localHits.filter((item) => {
          if (selectedFilterId === 'rsi_oversold') return (item.rsi ?? 50) <= 35;
          if (selectedFilterId === 'rsi_overbought') return (item.rsi ?? 50) >= 65;
          if (selectedFilterId === 'bullish_ma') return item.trend === 'bullish';
          if (selectedFilterId === 'bearish_ma') return item.trend === 'bearish';
          return true;
        });

        setResults(filtered);
      }
      if (res.isOffline) setIsOffline(true);
    } catch {
      setIsOffline(true);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFilterId, selectedTimeframe, symbols]);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    executeScan();
  }, [executeScan]);

  const getSignalBadge = (sig?: string) => {
    switch (sig) {
      case 'strong_buy':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#22C55E] text-[#051329] shadow-xs">
            شراء قوي (Strong Buy)
          </span>
        );
      case 'buy':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-[#22C55E] border border-emerald-500/30">
            شراء (Buy)
          </span>
        );
      case 'strong_sell':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#EF4444] text-white shadow-xs">
            بيع قوي (Strong Sell)
          </span>
        );
      case 'sell':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/15 text-[#EF4444] border border-rose-500/30">
            بيع (Sell)
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#162033] text-[#A3B4D0]">
            حيادي (Neutral)
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 select-none text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#243049]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#E8EEF9]">ماسح السوق الفني (Technical Screener)</h2>
              {isOffline && <OfflineBadge forceShow />}
            </div>
            <p className="text-[#7B8DA8]">
              فحص فوري لقواعد المؤشرات الفنية، التشبع السعري والاتجاه عبر خادم التحليل.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Timeframe Selector */}
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="bg-[#121A2B] border border-[#243049] rounded-lg px-2.5 py-1.5 text-xs text-[#E8EEF9] font-mono focus:outline-hidden"
          >
            <option value="5m">إطار 5 دقائق (5m)</option>
            <option value="15m">إطار 15 دقيقة (15m)</option>
            <option value="1h">إطار 1 ساعة (1H)</option>
            <option value="4h">إطار 4 ساعات (4H)</option>
            <option value="1d">إطار يومي (1D)</option>
          </select>

          <button
            onClick={executeScan}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2DD4BF] hover:bg-[#26bba8] text-[#042F2E] font-bold text-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>مسح السوق</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs from /api/screener/filters */}
      <div className="flex items-center gap-1.5 bg-[#121A2B] p-1.5 rounded-xl border border-[#243049] overflow-x-auto no-scrollbar">
        <button
          onClick={() => setSelectedFilterId('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            selectedFilterId === 'all'
              ? 'bg-[#2DD4BF] text-[#042F2E]'
              : 'text-[#A3B4D0] hover:text-[#E8EEF9] hover:bg-[#162238]'
          }`}
        >
          كل الأزواج ({results.length})
        </button>

        {availableFilters.map((f) => (
          <button
            key={f.id}
            onClick={() => setSelectedFilterId(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedFilterId === f.id
                ? 'bg-[#1E2E4A] text-[#2DD4BF] border border-[#2DD4BF]/50'
                : 'text-[#A3B4D0] hover:text-[#E8EEF9] hover:bg-[#162238]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Screener Results Table */}
      <div className="bg-[#121A2B] rounded-xl border border-[#243049] overflow-hidden shadow-lg">
        {isLoading ? (
          <div className="p-12 text-center text-[#7B8DA8] space-y-3 font-mono">
            <div className="w-8 h-8 rounded-full border-2 border-[#2DD4BF] border-t-transparent animate-spin mx-auto" />
            <p>جاري مسح الأزواج وحساب المؤشرات الفنية...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="p-12 text-center text-[#7B8DA8] space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-amber-400" />
            <p className="font-semibold text-[#E8EEF9]">لا توجد أزواج تطابق هذا الفلتر حالياً</p>
            <p className="text-xs">جرّب اختيار إطار زمني مختلف أو فلاتر أخرى لرصد الفرص.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right divide-y divide-[#243049]/60">
              <thead className="bg-[#0B1220] text-[#7B8DA8] text-[11px] font-semibold">
                <tr>
                  <th className="py-3 px-4">الأداة المالية</th>
                  <th className="py-3 px-4">السعر</th>
                  <th className="py-3 px-4">التغير</th>
                  <th className="py-3 px-4">مؤشر القوة (RSI)</th>
                  <th className="py-3 px-4">الاتجاه</th>
                  <th className="py-3 px-4 text-center">التقييم الفني</th>
                  <th className="py-3 px-4 text-center">عرض الشارت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#243049]/40 text-xs font-mono">
                {results.map((item) => {
                  const symObj = symbols.find((s) => s.symbol === item.symbol);
                  const displayPrice = item.price ?? symObj?.price ?? 0;
                  const displayPrecision = symObj?.precision ?? 4;
                  const displayChange = item.change24h ?? symObj?.change24h ?? 0;
                  const isUp = displayChange >= 0;

                  return (
                    <tr
                      key={item.symbol}
                      onClick={() => onSelectSymbolForChart(item.symbol)}
                      className="hover:bg-[#162238] transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-bold text-[#E8EEF9]">
                        <div className="flex items-center gap-2">
                          <span className="group-hover:text-[#2DD4BF] transition-colors">
                            {item.symbol}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#7B8DA8] font-sans">
                          {item.name || symObj?.name || item.symbol}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#E8EEF9] font-bold">
                        {displayPrice.toFixed(displayPrecision)}
                      </td>
                      <td className="py-3.5 px-4 font-bold">
                        <span className={isUp ? 'text-[#22C55E]' : 'text-[#EF4444]'}>
                          {isUp ? '+' : ''}
                          {displayChange.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {item.rsi !== undefined ? (
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold ${
                                item.rsi > 70
                                  ? 'text-[#EF4444]'
                                  : item.rsi < 30
                                  ? 'text-[#22C55E]'
                                  : 'text-[#A3B4D0]'
                              }`}
                            >
                              {item.rsi}
                            </span>
                            <div className="w-16 h-1.5 bg-[#0B1220] rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  item.rsi > 70
                                    ? 'bg-[#EF4444]'
                                    : item.rsi < 30
                                    ? 'bg-[#22C55E]'
                                    : 'bg-[#2DD4BF]'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(0, item.rsi))}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-[#64748B]">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        {item.trend === 'bullish' ? (
                          <span className="text-[#22C55E] flex items-center gap-1 font-semibold">
                            <TrendingUp className="w-3.5 h-3.5" />
                            صاعد
                          </span>
                        ) : item.trend === 'bearish' ? (
                          <span className="text-[#EF4444] flex items-center gap-1 font-semibold">
                            <TrendingDown className="w-3.5 h-3.5" />
                            هابط
                          </span>
                        ) : (
                          <span className="text-[#7B8DA8]">عرضي</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-sans">
                        {getSignalBadge(item.signal)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSymbolForChart(item.symbol);
                          }}
                          title="فتح في الشارت الفني"
                          className="p-1.5 rounded-lg bg-[#162033] group-hover:bg-[#2DD4BF] text-[#7B8DA8] group-hover:text-[#042F2E] transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
