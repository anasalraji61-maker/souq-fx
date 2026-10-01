import React, { useState } from 'react';
import { MarketSymbol } from '../../types/market';
import { Search } from 'lucide-react';

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

  // Default order as in WATCHLIST from Claude code and user's screenshot
  const defaultOrder = [
    'DXY',
    'EURUSD',
    'USDJPY',
    'USDCAD',
    'NZDUSD',
    'USDCHF',
    'EURJPY',
    'GBPJPY',
    'EURGBP',
    'AUDJPY',
    'EURAUD',
    'EURCHF',
    'CADJPY',
    'XAUUSD',
    'XAGUSD',
    'USOIL',
  ];

  const sortedSymbols = [...symbols].sort((a, b) => {
    const idxA = defaultOrder.indexOf(a.symbol);
    const idxB = defaultOrder.indexOf(b.symbol);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.symbol.localeCompare(b.symbol);
  });

  const filteredSymbols = sortedSymbols.filter((s) =>
    s.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#0B1220] border-l border-[#1E283D] select-none text-xs w-full">
      {/* Header matching user's screenshot */}
      <div className="p-2.5 pb-2 border-b border-[#1E283D]">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-[#E8EEF9] text-xs tracking-tight">Watchlist</span>
          <div className="flex items-center gap-1.5">
            <button
              title="Add symbol"
              className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#162033] hover:bg-[#1E293B] text-[#A3B4D0] hover:text-[#E8EEF9] border border-[#243049] transition-colors"
            >
              Add
            </button>
            <button
              title="Reset to default watchlist"
              className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#162033] hover:bg-[#1E293B] text-[#A3B4D0] hover:text-[#E8EEF9] border border-[#243049] transition-colors"
            >
              Default
            </button>
          </div>
        </div>

        {/* Search Input matching screenshot */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search symbol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#08111E] border border-[#243049] rounded px-2.5 py-1 text-xs text-[#E8EEF9] placeholder-[#7B8DA8] focus:outline-hidden focus:border-[#2DD4BF] font-sans"
          />
        </div>
      </div>

      {/* Symbol List matching screenshot */}
      <div className="flex-1 overflow-y-auto px-1.5 py-1 space-y-0.5">
        {filteredSymbols.map((item) => {
          const isSelected = item.symbol === activeSymbol;
          const flash = priceFlashMap[item.symbol];

          return (
            <div
              key={item.symbol}
              onClick={() => onSelectSymbol(item.symbol)}
              className={`flex items-center justify-between px-2.5 py-2 rounded cursor-pointer transition-all ${
                isSelected
                  ? 'bg-[#121A2B] border border-[#2DD4BF]/80 shadow-[0_0_8px_rgba(45,212,191,0.2)]'
                  : 'hover:bg-[#121A2B]/60 border border-transparent'
              } ${flash === 'up' ? 'bg-[#22C55E]/15' : flash === 'down' ? 'bg-[#EF4444]/15' : ''}`}
            >
              {/* Symbol Name & Tag */}
              <div className="flex flex-col">
                <span
                  className={`font-semibold text-xs tracking-tight ${
                    isSelected ? 'text-[#2DD4BF]' : 'text-[#E8EEF9]'
                  }`}
                >
                  {item.symbol}
                </span>
                <span className="text-[10px] text-[#7B8DA8]">Demo</span>
              </div>

              {/* Price in Monospace */}
              <div className="text-right">
                <span className="font-mono text-xs font-medium text-[#E8EEF9]">
                  {item.price.toFixed(item.precision)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
