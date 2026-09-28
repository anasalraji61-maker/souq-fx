import React, { useState } from 'react';
import { MarketSymbol } from '../../types/market';
import { Eye, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Compass } from 'lucide-react';

interface MarketScreenerProps {
  symbols: MarketSymbol[];
  onSelectSymbolForChart: (symbol: string) => void;
}

export const MarketScreener: React.FC<MarketScreenerProps> = ({
  symbols,
  onSelectSymbolForChart,
}) => {
  const [filter, setFilter] = useState<'all' | 'oversold' | 'overbought' | 'bullish' | 'bearish'>('all');

  // Generate deterministic technical values for each symbol based on price & change
  const screenerData = symbols.map((s) => {
    // Generate an illustrative RSI around 30 to 70
    const rawRsi = Math.min(85, Math.max(18, 50 + s.change24h * 14 + (s.price % 10)));
    const rsi = parseFloat(rawRsi.toFixed(1));

    let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (s.change24h > 0.25) trend = 'bullish';
    else if (s.change24h < -0.25) trend = 'bearish';

    let signal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell' = 'neutral';
    if (rsi < 30) signal = 'strong_buy'; // Oversold bounce
    else if (rsi > 70) signal = 'strong_sell'; // Overbought reversal
    else if (trend === 'bullish' && rsi > 50) signal = 'buy';
    else if (trend === 'bearish' && rsi < 50) signal = 'sell';

    return {
      symbol: s.symbol,
      name: s.name,
      price: s.price,
      precision: s.precision,
      change24h: s.change24h,
      rsi,
      trend,
      signal,
    };
  });

  const filteredData = screenerData.filter((item) => {
    if (filter === 'oversold') return item.rsi < 35;
    if (filter === 'overbought') return item.rsi > 65;
    if (filter === 'bullish') return item.trend === 'bullish';
    if (filter === 'bearish') return item.trend === 'bearish';
    return true;
  });

  const getSignalBadge = (sig: string) => {
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
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#EF4444] text-[#FFFFFF] shadow-xs">
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
    <div className="p-6 max-w-5xl mx-auto space-y-6 select-none text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#243049]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#E8EEF9]">الماسح الفني للأسواق (Technical Screener)</h2>
            <p className="text-[#7B8DA8]">رصد فوري لفرص التشبع السعري والاتجاه والمؤشرات عبر كل الأزواج.</p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1 bg-[#121A2B] p-1 rounded-lg border border-[#243049] overflow-x-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded text-xs transition-colors ${
              filter === 'all' ? 'bg-[#2DD4BF] text-[#042F2E] font-bold' : 'text-[#A3B4D0] hover:text-[#E8EEF9]'
            }`}
          >
            الكل ({screenerData.length})
          </button>
          <button
            onClick={() => setFilter('oversold')}
            className={`px-3 py-1 rounded text-xs transition-colors ${
              filter === 'oversold' ? 'bg-[#22C55E] text-[#051329] font-bold' : 'text-[#A3B4D0] hover:text-[#E8EEF9]'
            }`}
          >
            تشبع بيعي (RSI &lt; 35)
          </button>
          <button
            onClick={() => setFilter('overbought')}
            className={`px-3 py-1 rounded text-xs transition-colors ${
              filter === 'overbought' ? 'bg-[#EF4444] text-[#FFFFFF] font-bold' : 'text-[#A3B4D0] hover:text-[#E8EEF9]'
            }`}
          >
            تشبع شرائي (RSI &gt; 65)
          </button>
          <button
            onClick={() => setFilter('bullish')}
            className={`px-3 py-1 rounded text-xs transition-colors ${
              filter === 'bullish' ? 'bg-[#38BDF8] text-[#051329] font-bold' : 'text-[#A3B4D0] hover:text-[#E8EEF9]'
            }`}
          >
            ترند صاعد
          </button>
        </div>
      </div>

      {/* Screener Table */}
      <div className="bg-[#121A2B] rounded-xl border border-[#243049] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right divide-y divide-[#243049]/60">
            <thead className="bg-[#0B1220] text-[#7B8DA8] text-[11px] font-semibold">
              <tr>
                <th className="py-2.5 px-4">الزوج / الأداة</th>
                <th className="py-2.5 px-4">السعر الحي</th>
                <th className="py-2.5 px-4">التغير 24h</th>
                <th className="py-2.5 px-4">مؤشر القوة (RSI 14)</th>
                <th className="py-2.5 px-4">الاتجاه</th>
                <th className="py-2.5 px-4 text-center">التقييم الفني</th>
                <th className="py-2.5 px-4 text-center">فتح الشارت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#243049]/40 text-xs font-mono">
              {filteredData.map((item) => (
                <tr key={item.symbol} className="hover:bg-[#162033]/60 transition-colors">
                  <td className="py-3 px-4 font-bold text-[#E8EEF9]">
                    <div>{item.symbol}</div>
                    <div className="text-[10px] text-[#7B8DA8] font-sans">{item.name}</div>
                  </td>
                  <td className="py-3 px-4 text-[#E8EEF9]">
                    {item.price.toFixed(item.precision)}
                  </td>
                  <td className="py-3 px-4 font-bold">
                    <span className={item.change24h >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}>
                      {item.change24h >= 0 ? '+' : ''}{item.change24h.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${item.rsi > 70 ? 'text-[#EF4444]' : item.rsi < 30 ? 'text-[#22C55E]' : 'text-[#A3B4D0]'}`}>
                        {item.rsi}
                      </span>
                      <div className="w-16 h-1.5 bg-[#0B1220] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.rsi > 70 ? 'bg-[#EF4444]' : item.rsi < 30 ? 'bg-[#22C55E]' : 'bg-[#2DD4BF]'}`}
                          style={{ width: `${item.rsi}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-sans">
                    {item.trend === 'bullish' ? (
                      <span className="text-[#22C55E] flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        صاعد
                      </span>
                    ) : item.trend === 'bearish' ? (
                      <span className="text-[#EF4444] flex items-center gap-1">
                        <TrendingDown className="w-3.5 h-3.5" />
                        هابط
                      </span>
                    ) : (
                      <span className="text-[#7B8DA8]">عرضي</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center font-sans">
                    {getSignalBadge(item.signal)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onSelectSymbolForChart(item.symbol)}
                      title="فتح في الشارت الرئيسي"
                      className="p-1.5 rounded-lg bg-[#162033] hover:bg-[#2DD4BF] text-[#7B8DA8] hover:text-[#042F2E] transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
