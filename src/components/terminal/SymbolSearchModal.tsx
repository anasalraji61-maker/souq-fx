import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MarketSymbol, SymbolCategory } from '../../types/market';
import { Search, X, TrendingUp, TrendingDown, DollarSign, Shield, Activity, Flame } from 'lucide-react';

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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredSymbols = useMemo(() => {
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

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, category]);

  // Keyboard navigation (ArrowUp, ArrowDown, Enter, Esc)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(filteredSymbols.length - 1, prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredSymbols[selectedIndex]) {
        onSelectSymbol(filteredSymbols[selectedIndex].symbol);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs select-none">
      <div
        className="w-[500px] max-w-[95vw] bg-[#0E1626] border border-[#243049] rounded-xl shadow-2xl overflow-hidden flex flex-col text-xs max-h-[80vh]"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Header */}
        <div className="p-3 border-b border-[#1E283D] bg-[#0B1322] flex items-center gap-2.5">
          <Search className="w-4 h-4 text-[#2DD4BF] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن أزواج العملات، المعادن، المؤشرات أو النفط (Ctrl+K)..."
            className="w-full bg-transparent text-sm text-[#E8EEF9] placeholder-[#64748B] focus:outline-none"
          />
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-[#1C2740] text-[10px] text-[#7B8DA8] font-mono">
              ESC
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded text-[#7B8DA8] hover:text-white hover:bg-[#1C2740] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Group Filter Tabs */}
        <div className="px-3 py-2 border-b border-[#1E283D] bg-[#0A101D] flex items-center gap-1.5 overflow-x-auto">
          {(
            [
              { id: 'all', label: 'الكل All', icon: Activity },
              { id: 'forex', label: 'العملات Forex', icon: DollarSign },
              { id: 'metals', label: 'المعادن Metals', icon: Shield },
              { id: 'indices', label: 'المؤشرات Indices', icon: TrendingUp },
              { id: 'energy', label: 'الطاقة Energy', icon: Flame },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = category === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setCategory(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-colors shrink-0 ${
                  active
                    ? 'bg-[#1C2E4A] text-[#2DD4BF] font-bold border border-[#2DD4BF]/40'
                    : 'text-[#7B8DA8] hover:text-[#E8EEF9] hover:bg-[#141E30]'
                }`}
              >
                <Icon className="w-3 h-3" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Symbol List */}
        <div className="p-2 overflow-y-auto space-y-1 max-h-[420px]">
          {filteredSymbols.length === 0 ? (
            <div className="text-center py-12 text-[#64748B]">
              لم يتم العثور على أزواج تطابق بحثك.
            </div>
          ) : (
            filteredSymbols.map((s, idx) => {
              const isSelected = selectedIndex === idx;
              const isCurrent = currentSymbol === s.symbol;
              const isUp = s.change24h >= 0;

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
                            النشط
                          </span>
                        )}
                        <span className="text-[10px] text-[#64748B] uppercase">{s.category}</span>
                      </div>
                      <div className="text-[11px] text-[#7B8DA8]">{s.name}</div>
                    </div>
                  </div>

                  <div className="text-left font-mono">
                    <div className="font-bold text-xs text-[#E8EEF9]">{s.price.toFixed(s.precision)}</div>
                    <div className={`text-[10px] font-semibold flex items-center justify-end gap-0.5 ${isUp ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                      {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                      {isUp ? '+' : ''}{s.change24h.toFixed(2)}% ({s.spread} pip)
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts info */}
        <div className="p-2.5 border-t border-[#1E283D] bg-[#0A101D] flex items-center justify-between text-[11px] text-[#64748B]">
          <span>استخدم الأسهم ↑ ↓ للتنقل و Enter للاختيار</span>
          <span className="font-sans text-[#2DD4BF]">فوركس • معادن • طاقة • مؤشرات</span>
        </div>
      </div>
    </div>
  );
};

function getCategoryColor(cat: string): string {
  switch (cat) {
    case 'forex': return '#38BDF8';
    case 'metals': return '#F59E0B';
    case 'indices': return '#A78BFA';
    case 'energy': return '#EC4899';
    default: return '#2DD4BF';
  }
}
