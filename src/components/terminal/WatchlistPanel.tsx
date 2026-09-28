import React, { useState } from 'react';
import { MarketSymbol, SymbolCategory } from '../../types/market';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';
import { colors } from '../../theme';

interface WatchlistPanelProps {
  symbols: MarketSymbol[];
  activeSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  priceFlashMap?: Record<string, 'up' | 'down'>;
}

export const WatchlistPanel: React.FC<WatchlistPanelProps> = ({
  symbols,
  activeSymbol,
  onSelectSymbol,
  priceFlashMap = {},
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SymbolCategory>('all');

  const filteredSymbols = symbols.filter((s) => {
    const matchesSearch =
      s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col h-full bg-[#121A2B] border-l border-[#243049] select-none text-xs">
      {/* Search Header */}
      <div className="p-2.5 border-b border-[#243049] bg-[#0E1728]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute top-2.5 right-2.5 text-[#7B8DA8]" />
          <input
            type="text"
            placeholder="بحث عن رمز (EUR, XAU, BTC)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0B1220] border border-[#243049] rounded-md py-1.5 pr-8 pl-2.5 text-xs text-[#E8EEF9] placeholder-[#7B8DA8] focus:outline-none focus:border-[#2DD4BF]"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1 mt-2 overflow-x-auto no-scrollbar pb-0.5">
          {(['all', 'forex', 'metals', 'indices', 'crypto'] as SymbolCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#2DD4BF] text-[#042F2E] font-bold shadow-xs'
                  : 'bg-[#162033] text-[#A3B4D0] hover:text-[#E8EEF9]'
              }`}
            >
              {cat === 'all'
                ? 'الكل'
                : cat === 'forex'
                ? 'فوركس'
                : cat === 'metals'
                ? 'معادن'
                : cat === 'indices'
                ? 'مؤشرات'
                : 'رقمية'}
            </button>
          ))}
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-12 px-3 py-1.5 text-[10px] font-semibold text-[#7B8DA8] bg-[#0B1220]/60 border-b border-[#243049]">
        <span className="col-span-5 text-right">الرمز / السبريد</span>
        <span className="col-span-4 text-center">طلب (Bid)</span>
        <span className="col-span-3 text-left">التغير %</span>
      </div>

      {/* Symbol Rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1C2740]/60">
        {filteredSymbols.map((item) => {
          const isSelected = item.symbol === activeSymbol;
          const flash = priceFlashMap[item.symbol];
          const isPositive = item.change24h >= 0;

          return (
            <div
              key={item.symbol}
              onClick={() => onSelectSymbol(item.symbol)}
              className={`grid grid-cols-12 items-center px-3 py-2 cursor-pointer transition-colors ${
                isSelected ? 'bg-[#1E293B] border-r-2 border-r-[#2DD4BF]' : 'hover:bg-[#162033]/70'
              } ${flash === 'up' ? 'flash-up' : flash === 'down' ? 'flash-down' : ''}`}
            >
              {/* Symbol & Spread */}
              <div className="col-span-5 flex flex-col">
                <span className="font-bold text-[#E8EEF9] tracking-tight">{item.symbol}</span>
                <span className="text-[10px] text-[#7B8DA8]">
                  فارق: <strong className="text-[#A3B4D0] font-mono">{item.spread}</strong>
                </span>
              </div>

              {/* Price / Bid */}
              <div className="col-span-4 text-center font-mono font-medium text-[#E8EEF9]">
                {item.bid.toFixed(item.precision)}
              </div>

              {/* 24h Change */}
              <div className="col-span-3 flex items-center justify-end gap-1 font-mono">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 ${
                    isPositive ? 'bg-emerald-500/15 text-[#22C55E]' : 'bg-red-500/15 text-[#EF4444]'
                  }`}
                >
                  {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                  {isPositive ? '+' : ''}{item.change24h.toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })}

        {filteredSymbols.length === 0 && (
          <div className="p-8 text-center text-[#7B8DA8] text-xs">
            لا توجد أزواج مطابقة للبحث
          </div>
        )}
      </div>
    </div>
  );
};
