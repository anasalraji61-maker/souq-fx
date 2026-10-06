import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MarketSymbol, SymbolCategory } from '../../types/market';
import { searchSymbols, SymbolSearchResult } from '../../api/market';
import { Search, X, TrendingUp, TrendingDown, DollarSign, Shield, Activity, Flame, Loader2 } from 'lucide-react';
import { tl, fmt } from '../../i18n/locales';

interface SymbolSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbols: MarketSymbol[];
  onSelectSymbol: (symbol: string) => void;
  currentSymbol: string;
}

export const SymbolSearchModal: React.FC<SymbolSearchModalProps> = ({
  isOpen,
  onClose,
  symbols,
  onSelectSymbol,
  currentSymbol,
}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SymbolCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [remoteResults, setRemoteResults] = useState<SymbolSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setRemoteResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // 1.6 300ms debounced backend search with local fallback
  useEffect(() => {
    if (!query.trim()) {
      setRemoteResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchSymbols(query, 25);
        setRemoteResults(res);
      } catch {
        setRemoteResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Local fallback filtered list
  const localFiltered = useMemo(() => {
    return symbols.filter((s) => {
      if (category !== 'all' && s.category !== category) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase().trim();
      return (
        s.symbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      );
    });
  }, [symbols, category, query]);

  // Combine or prioritize results
  const displayedItems = useMemo(() => {
    if (remoteResults.length > 0) {
      return remoteResults
        .filter((r) => category === 'all' || r.category === category)
        .map((r) => {
          const localMatch = symbols.find((s) => s.symbol.toUpperCase() === r.symbol.toUpperCase());
          return {
            symbol: r.symbol,
            name: r.name || localMatch?.name || r.symbol,
            category: r.category || localMatch?.category || 'forex',
            price: localMatch?.price,
            precision: localMatch?.precision || 4,
            change24h: localMatch?.change24h || 0,
            spread: localMatch?.spread,
          };
        });
    }

    return localFiltered.map((s) => ({
      symbol: s.symbol,
      name: s.name,
      category: s.category,
      price: s.price,
      precision: s.precision,
      change24h: s.change24h,
      spread: s.spread,
    }));
  }, [remoteResults, localFiltered, category, symbols]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [displayedItems.length]);

  // Keyboard navigation (ArrowUp, ArrowDown, Enter, Esc)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(displayedItems.length - 1, prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (displayedItems[selectedIndex]) {
        onSelectSymbol(displayedItems[selectedIndex].symbol);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'forex':
        return '#2DD4BF';
      case 'metals':
        return '#F59E0B';
      case 'energy':
        return '#EF4444';
      case 'indices':
        return '#38BDF8';
      default:
        return '#64748B';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs select-none">
      <div
        className="w-[500px] max-w-[95vw] bg-[#0E1626] border border-[#243049] rounded-xl shadow-2xl overflow-hidden flex flex-col text-xs max-h-[80vh]"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Header */}
        <div className="p-3 border-b border-[#1E283D] bg-[#0B1322] flex items-center gap-2.5">
          {isSearching ? (
            <Loader2 className="w-4 h-4 text-[#2DD4BF] animate-spin shrink-0" />
          ) : (
            <Search className="w-4 h-4 text-[#2DD4BF] shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tl().tm_101}
            className="w-full bg-transparent text-sm text-[#E8EEF9] placeholder-[#64748B] focus:outline-none"
          />
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-[#1C2740] text-[10px] text-[#7B8DA8] font-mono">
              ESC
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded text-[#7B8DA8] hover:text-white hover:bg-[#1C2740] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Pills (0% crypto) */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[#1E283D] bg-[#0A101D] overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'all', label: tl().tm_52 },
              { id: 'forex', label: tl().tm_102 },
              { id: 'metals', label: tl().tm_103 },
              { id: 'energy', label: tl().tm_104 },
              { id: 'indices', label: tl().tm_105 },
            ] as { id: SymbolCategory; label: string }[]
          ).map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                category === c.id
                  ? 'bg-[#2DD4BF] text-[#042F2E]'
                  : 'bg-[#121A2B] text-[#7B8DA8] hover:text-[#E8EEF9] hover:bg-[#1A263D]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Symbol List */}
        <div className="p-2 overflow-y-auto space-y-1 max-h-[420px]">
          {displayedItems.length === 0 ? (
            <div className="text-center py-12 text-[#64748B]">
              {tl().tm_106}
            </div>
          ) : (
            displayedItems.map((s, idx) => {
              const isSelected = selectedIndex === idx;
              const isCurrent = currentSymbol === s.symbol;
              const isUp = (s.change24h || 0) >= 0;

              return (
                <div
                  key={s.symbol}
                  onClick={() => {
                    onSelectSymbol(s.symbol);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#1C2E4A] border border-[#2DD4BF]/40 text-white'
                      : isCurrent
                      ? 'bg-[#141E30] border border-[#2DD4BF]/20 text-[#E8EEF9]'
                      : 'hover:bg-[#141E30] border border-transparent text-[#CBD5E1]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(s.category) }} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs font-mono text-[#E8EEF9]">{s.symbol}</span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#2DD4BF]/20 text-[#2DD4BF] font-bold">
                            {tl().tm_107}
                          </span>
                        )}
                        <span className="text-[10px] text-[#64748B] uppercase">{s.category}</span>
                      </div>
                      <div className="text-[11px] text-[#7B8DA8]">{s.name}</div>
                    </div>
                  </div>

                  {s.price !== undefined ? (
                    <div className="text-left font-mono">
                      <div className="font-bold text-xs text-[#E8EEF9]">{s.price.toFixed(s.precision)}</div>
                      <div className={`text-[10px] font-semibold flex items-center justify-end gap-0.5 ${isUp ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                        {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                        {isUp ? '+' : ''}{s.change24h.toFixed(2)}%{s.spread ? ` (${s.spread} pip)` : ''}
                      </div>
                    </div>
                  ) : (
                    <div className="text-left font-mono text-[11px] text-[#64748B]">
                      {tl().tm_108}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts info */}
        <div className="p-2.5 border-t border-[#1E283D] bg-[#0A101D] flex items-center justify-between text-[11px] text-[#64748B]">
          <span>{tl().tm_109}</span>
          <span className="text-[#38BDF8] font-semibold">{tl().tm_110}</span>
        </div>
      </div>
    </div>
  );
};
