import React, { useState, useMemo } from 'react';
import { MarketSymbol } from '../../types/market';
import { Search, Plus, Trash2, GripVertical, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';

interface WatchlistPanelProps {
  symbols: MarketSymbol[];
  activeSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  priceFlashMap?: Record<string, 'up' | 'down'>;
}

interface NamedWatchlist {
  id: string;
  name: string;
  symbols: string[];
}

export function getPipSize(symbol: string): number {
  const s = symbol.toUpperCase();
  if (s.includes('JPY')) return 0.01;
  if (s === 'XAUUSD' || s === 'GOLD') return 0.1;
  if (s === 'XAGUSD' || s === 'SILVER') return 0.01;
  if (s.includes('OIL')) return 0.01;
  if (
    s.includes('SPX') ||
    s.includes('NAS') ||
    s.includes('US30') ||
    s.includes('GER') ||
    s.includes('DXY') ||
    s.includes('INDEX')
  ) {
    return 1.0;
  }
  return 0.0001; // standard FX
}

export function formatSpread(item: MarketSymbol): string {
  const pipSize = getPipSize(item.symbol);
  if (item.ask !== undefined && item.bid !== undefined && item.ask > item.bid) {
    const pips = (item.ask - item.bid) / pipSize;
    if (pips > 0 && pips < 500) {
      return `${pips.toFixed(1)}p`;
    }
  }
  if (item.spread !== undefined && item.spread > 0 && item.spread < 100) {
    return `${item.spread.toFixed(1)}p`;
  }
  return '0.8p';
}

export const WatchlistPanel: React.FC<WatchlistPanelProps> = ({
  symbols,
  activeSymbol,
  onSelectSymbol,
  priceFlashMap = {},
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Default watchlist lists (Part 6.2)
  const [watchlists, setWatchlists] = useState<NamedWatchlist[]>(() => {
    try {
      const raw = localStorage.getItem('matrix.watchlists');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    return [
      {
        id: 'main',
        name: 'الرئيسية (Main)',
        symbols: [
          'EURUSD',
          'GBPUSD',
          'USDJPY',
          'USDCAD',
          'XAUUSD',
          'XAGUSD',
          'USOIL',
          'SPX500',
          'NAS100',
          'DXY',
        ],
      },
      {
        id: 'forex',
        name: 'العملات (Forex)',
        symbols: ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCAD', 'USDCHF', 'AUDUSD', 'NZDUSD', 'EURJPY', 'GBPJPY'],
      },
      {
        id: 'commodities',
        name: 'السلع والمعادن',
        symbols: ['XAUUSD', 'XAGUSD', 'USOIL', 'UKOIL'],
      },
    ];
  });

  const [activeListId, setActiveListId] = useState<string>('main');
  const [draggedSymbol, setDraggedSymbol] = useState<string | null>(null);

  const currentList = watchlists.find((w) => w.id === activeListId) || watchlists[0];

  const handleSaveWatchlists = (next: NamedWatchlist[]) => {
    setWatchlists(next);
    try {
      localStorage.setItem('matrix.watchlists', JSON.stringify(next));
    } catch {}
  };

  const handleCreateNewList = () => {
    const name = prompt('أدخل اسم قائمة المراقبة الجديدة:');
    if (!name?.trim()) return;

    const newList: NamedWatchlist = {
      id: `list-${Date.now()}`,
      name: name.trim(),
      symbols: ['EURUSD', 'XAUUSD'],
    };

    const next = [...watchlists, newList];
    handleSaveWatchlists(next);
    setActiveListId(newList.id);
  };

  const handleDeleteCurrentList = () => {
    if (watchlists.length <= 1) {
      alert('لا يمكن حذف القائمة الرئيسية الوحيدة.');
      return;
    }
    const next = watchlists.filter((w) => w.id !== currentList.id);
    handleSaveWatchlists(next);
    setActiveListId(next[0].id);
  };

  const handleRemoveSymbolFromList = (sym: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextSymbols = currentList.symbols.filter((s) => s !== sym);
    const next = watchlists.map((w) => (w.id === currentList.id ? { ...w, symbols: nextSymbols } : w));
    handleSaveWatchlists(next);
  };

  // Drag and drop reordering
  const handleDragStart = (sym: string) => {
    setDraggedSymbol(sym);
  };

  const handleDragOver = (e: React.DragEvent, targetSym: string) => {
    e.preventDefault();
    if (!draggedSymbol || draggedSymbol === targetSym) return;

    const list = [...currentList.symbols];
    const fromIdx = list.indexOf(draggedSymbol);
    const toIdx = list.indexOf(targetSym);
    if (fromIdx === -1 || toIdx === -1) return;

    list.splice(fromIdx, 1);
    list.splice(toIdx, 0, draggedSymbol);

    const next = watchlists.map((w) => (w.id === currentList.id ? { ...w, symbols: list } : w));
    setWatchlists(next);
  };

  const handleDragEnd = () => {
    setDraggedSymbol(null);
    try {
      localStorage.setItem('matrix.watchlists', JSON.stringify(watchlists));
    } catch {}
  };

  // Map symbols in list to full MarketSymbol objects
  const listSymbols = useMemo(() => {
    return currentList.symbols
      .map((symCode) => symbols.find((s) => s.symbol === symCode))
      .filter((s): s is MarketSymbol => Boolean(s));
  }, [currentList.symbols, symbols]);

  const filteredSymbols = useMemo(() => {
    if (!searchTerm.trim()) return listSymbols;
    const q = searchTerm.toLowerCase().trim();
    return listSymbols.filter(
      (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
  }, [listSymbols, searchTerm]);

  // Mini sparkline SVG generator (Part 6.2)
  const renderSparkline = (item: MarketSymbol) => {
    const isUp = item.change24h >= 0;
    const stroke = isUp ? '#22C55E' : '#EF4444';

    // Approximate 6-point normalized sparkline curve based on high/low/close
    const min = item.low24h || item.price * 0.995;
    const max = item.high24h || item.price * 1.005;
    const range = max - min || 1;

    const p0 = ((item.price - item.changePips * item.pipScale - min) / range) * 16;
    const p1 = Math.max(2, Math.min(18, isUp ? p0 - 2 : p0 + 2));
    const p2 = Math.max(2, Math.min(18, isUp ? p1 + 5 : p1 - 5));
    const p3 = Math.max(2, Math.min(18, ((item.price - min) / range) * 16));

    const y0 = 18 - p0;
    const y1 = 18 - p1;
    const y2 = 18 - p2;
    const y3 = 18 - p3;

    return (
      <svg className="w-10 h-5 shrink-0 overflow-visible" viewBox="0 0 40 20">
        <path
          d={`M 0 ${y0} C 12 ${y1}, 24 ${y2}, 38 ${y3}`}
          fill="none"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#0B1220] border-l border-[#1E283D] select-none text-xs w-full">
      {/* Top Header: Watchlist Switcher Dropdown */}
      <div className="p-2 border-b border-[#1E283D] bg-[#0A101D] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <select
              value={activeListId}
              onChange={(e) => setActiveListId(e.target.value)}
              className="bg-[#121A2B] text-[#E8EEF9] font-bold text-xs px-2 py-1 rounded border border-[#243049] cursor-pointer outline-none font-sans"
            >
              {watchlists.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleCreateNewList}
              title="إضافة قائمة مراقبة جديدة"
              className="p-1 rounded bg-[#162033] hover:bg-[#1E293B] text-[#2DD4BF] border border-[#243049]"
            >
              <Plus className="w-3 h-3" />
            </button>
            {watchlists.length > 1 && (
              <button
                onClick={handleDeleteCurrentList}
                title="حذف هذه القائمة"
                className="p-1 rounded bg-[#162033] hover:bg-[#1E293B] text-[#7B8DA8] hover:text-rose-400 border border-[#243049]"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
          <span className="text-[10px] text-[#7B8DA8] font-mono">{filteredSymbols.length} رمز</span>
        </div>

        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            placeholder="تصفية الرموز..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#08111E] border border-[#243049] rounded px-2 py-1 text-xs text-[#E8EEF9] placeholder-[#7B8DA8] focus:outline-hidden focus:border-[#2DD4BF]"
          />
        </div>
      </div>

      {/* Column Headers (6.2: last, change, change%, spread, sparkline) */}
      <div className="grid grid-cols-[minmax(115px,1fr)_56px_52px_42px] px-2 py-1 text-[10px] text-[#64748B] font-semibold border-b border-[#1E283D] bg-[#08111E]">
        <span className="text-right">الرمز / خط</span>
        <span className="text-left font-mono">السعر</span>
        <span className="text-left font-mono">التغير</span>
        <span className="text-left font-mono">الفارق</span>
      </div>

      {/* Symbol List with sparkline and drag reorder */}
      <div className="flex-1 overflow-y-auto px-1 py-0.5 space-y-0.5">
        {filteredSymbols.map((item) => {
          const isSelected = item.symbol === activeSymbol;
          const flash = priceFlashMap[item.symbol];
          const isUp = item.change24h >= 0;

          return (
            <div
              key={item.symbol}
              draggable
              onDragStart={() => handleDragStart(item.symbol)}
              onDragOver={(e) => handleDragOver(e, item.symbol)}
              onDragEnd={handleDragEnd}
              onClick={() => onSelectSymbol(item.symbol)}
              className={`group grid grid-cols-[minmax(115px,1fr)_56px_52px_42px] items-center px-1.5 py-1.5 rounded cursor-pointer transition-all ${
                isSelected
                  ? 'bg-[#131F33] border border-[#2DD4BF]/80 shadow-[0_0_8px_rgba(45,212,191,0.12)]'
                  : 'hover:bg-[#121A2B]/70 border border-transparent'
              } ${flash === 'up' ? 'bg-[#22C55E]/15' : flash === 'down' ? 'bg-[#EF4444]/15' : ''}`}
            >
              {/* Symbol Name & Mini Sparkline */}
              <div className="flex items-center gap-1.5 min-w-0 pr-0.5 overflow-hidden">
                <GripVertical className="w-3 h-3 text-[#334155] opacity-0 group-hover:opacity-100 shrink-0 cursor-grab" />
                <div className="flex flex-col min-w-0 shrink">
                  <span
                    dir="ltr"
                    className={`font-mono font-bold text-xs tracking-tight whitespace-nowrap shrink-0 text-right ${
                      isSelected ? 'text-[#2DD4BF]' : 'text-[#E8EEF9]'
                    }`}
                  >
                    {item.symbol}
                  </span>
                  <span
                    className="text-[9px] text-[#7B8DA8] truncate max-w-[85px] text-right block"
                    title={item.name}
                  >
                    {item.name}
                  </span>
                </div>
                <div className="mr-auto shrink-0 pl-1">{renderSparkline(item)}</div>
              </div>

              {/* Price */}
              <div className="text-left font-mono text-[11px] font-medium text-[#E8EEF9]">
                {item.price.toFixed(item.precision)}
              </div>

              {/* Change % */}
              <div className={`text-left font-mono text-[10px] font-semibold ${isUp ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                {isUp ? '+' : ''}
                {item.change24h}%
              </div>

              {/* Spread */}
              <div className="text-left font-mono text-[10px] text-[#7B8DA8] flex items-center justify-between">
                <span>{formatSpread(item)}</span>
                <button
                  onClick={(e) => handleRemoveSymbolFromList(item.symbol, e)}
                  title="إزالة من القائمة"
                  className="opacity-0 group-hover:opacity-100 text-[#64748B] hover:text-rose-400 p-0.5"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
