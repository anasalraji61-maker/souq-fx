import React, { useState, useMemo, useEffect, useRef } from 'react';
import { onCloudSyncApplied } from '../../api/cloudSync';
import { MarketSymbol } from '../../types/market';
import { getQuote, MarketQuote, getMarketStatus, MarketStatus } from '../../api/market';
import { Search, Plus, Trash2, GripVertical, ChevronDown, TrendingUp, TrendingDown, Clock, X } from 'lucide-react';

interface WatchlistPanelProps {
  symbols: MarketSymbol[];
  activeSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  priceFlashMap?: Record<string, 'up' | 'down'>;
  isMobileMode?: boolean;
  onCloseMobile?: () => void;
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

export function formatSpread(item: MarketSymbol, realBid?: number | null, realAsk?: number | null): string {
  // Only a real bid/ask from the provider gives a real spread. The free data plan returns no bid/ask,
  // so we show "—" instead of an invented number (simulated item.bid/ask are never used).
  void item;
  const pipSize = getPipSize(item.symbol);
  if (typeof realAsk === 'number' && typeof realBid === 'number' && realAsk > realBid) {
    const pips = (realAsk - realBid) / pipSize;
    if (pips > 0 && pips < 500) {
      return `${pips.toFixed(1)}p`;
    }
  }
  return '—';
}

export const WatchlistPanel: React.FC<WatchlistPanelProps> = ({
  symbols,
  activeSymbol,
  onSelectSymbol,
  priceFlashMap = {},
  isMobileMode = false,
  onCloseMobile,
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

  // 1.4 Real Quotes State & Staggered Polling (max 4 req/sec = 250ms per symbol)
  const [realQuotes, setRealQuotes] = useState<Record<string, MarketQuote>>({});
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);
  const queueIndexRef = useRef(0);

  // Fetch market status on mount and every 30s
  useEffect(() => {
    getMarketStatus().then(setMarketStatus);
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      getMarketStatus().then(setMarketStatus);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const currentList = watchlists.find((w) => w.id === activeListId) || watchlists[0];

  // Staggered quote polling loop: one symbol every 5 s (backend caches quotes; the data provider allows only 8 req/min)
  useEffect(() => {
    const symbolsToPoll = currentList.symbols;
    if (symbolsToPoll.length === 0) return;

    const interval = setInterval(async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }

      const sym = symbolsToPoll[queueIndexRef.current % symbolsToPoll.length];
      queueIndexRef.current++;

      try {
        const quote = await getQuote(sym);
        if (quote.price !== null) {
          setRealQuotes((prev) => ({ ...prev, [sym]: quote }));
        }
      } catch {
        // Silently continue
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [currentList.symbols]);

  // Watchlists changed on another device (account sync) → re-read them
  useEffect(
    () =>
      onCloudSyncApplied((docs) => {
        if (!docs.includes('watchlists')) return;
        try {
          const raw = localStorage.getItem('matrix.watchlists');
          const parsed = raw ? JSON.parse(raw) : null;
          if (Array.isArray(parsed) && parsed.length > 0) setWatchlists(parsed);
        } catch {
          // keep current lists
        }
      }),
    []
  );

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
      <div className="p-2.5 sm:p-2 border-b border-[#1E283D] bg-[#0A101D] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <select
              value={activeListId}
              onChange={(e) => setActiveListId(e.target.value)}
              className="bg-[#121A2B] text-[#E8EEF9] font-bold text-xs px-2.5 py-1.5 rounded-lg border border-[#243049] cursor-pointer outline-none font-sans max-w-[170px] truncate"
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
              className="p-1.5 rounded-lg bg-[#162033] hover:bg-[#1E293B] text-[#2DD4BF] border border-[#243049] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            {watchlists.length > 1 && (
              <button
                onClick={handleDeleteCurrentList}
                title="حذف هذه القائمة"
                className="p-1.5 rounded-lg bg-[#162033] hover:bg-[#1E293B] text-[#7B8DA8] hover:text-rose-400 border border-[#243049] cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-[#7B8DA8] font-mono">{filteredSymbols.length} رمز</span>
            {isMobileMode && onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg bg-[#162033] text-[#A3B4D0] hover:text-white cursor-pointer"
                title="إغلاق القائمة"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            placeholder="بحث وتصفية الرموز..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#08111E] border border-[#243049] rounded-lg px-3 py-2 text-xs text-[#E8EEF9] placeholder-[#7B8DA8] focus:outline-hidden focus:border-[#2DD4BF]"
          />
        </div>
      </div>

      {/* Desktop Column Headers (> 1100px): strictly aligned with the 5 items in the compact row */}
      <div className="hidden min-[1101px]:grid grid-cols-[minmax(84px,1fr)_34px_60px_52px_36px] gap-1.5 px-2.5 py-1.5 text-[10px] text-[#64748B] font-semibold border-b border-[#1E283D] bg-[#08111E]">
        <span className="text-right">الرمز / الاسم</span>
        <span className="text-center">خط</span>
        <span className="text-left font-mono">السعر</span>
        <span className="text-left font-mono">التغير</span>
        <span className="text-left font-mono">الفارق</span>
      </div>

      {/* Symbol List with sparkline and drag reorder */}
      <div className="flex-1 overflow-y-auto px-1 py-0.5 space-y-1 pb-20 md:pb-2">
        {filteredSymbols.map((item) => {
          const isSelected = item.symbol === activeSymbol;
          const flash = priceFlashMap[item.symbol];
          // Real data only: until a provider quote arrives the row shows "…" (never the simulated price).
          const quote = realQuotes[item.symbol];
          const hasReal = Boolean(quote && quote.price !== null && !quote.isDemo);
          const displayPrice: number | null = hasReal ? (quote!.price as number) : null;
          const realChange: number | null =
            hasReal && typeof quote!.changePct === 'number' ? Number(quote!.changePct.toFixed(2)) : null;
          const isUp = (realChange ?? 0) >= 0;
          const displaySpread = formatSpread(item, quote?.bid, quote?.ask);
          const isClosed = quote?.marketOpen === false || (marketStatus && !marketStatus.isOpen);

          return (
            <React.Fragment key={item.symbol}>
              {/* Desktop compact one-line row (> 1100px): code + sub-name | sparkline | price | change% | spread on ONE row, ~48px tall */}
              <div
                draggable
                onDragStart={() => handleDragStart(item.symbol)}
                onDragOver={(e) => handleDragOver(e, item.symbol)}
                onDragEnd={handleDragEnd}
                onClick={() => onSelectSymbol(item.symbol)}
                className={`hidden min-[1101px]:grid grid-cols-[minmax(84px,1fr)_34px_60px_52px_36px] gap-1.5 items-center px-2.5 h-12 min-h-[48px] max-h-[48px] rounded-lg cursor-pointer transition-all active:scale-[0.99] select-none group ${
                  isClosed ? 'opacity-55 saturate-50' : ''
                } ${
                  isSelected
                    ? 'bg-[#131F33] border border-[#2DD4BF]/80 shadow-[0_0_8px_rgba(45,212,191,0.12)]'
                    : 'hover:bg-[#121A2B]/70 border border-transparent active:bg-[#162033]'
                } ${flash === 'up' ? 'bg-[#22C55E]/15' : flash === 'down' ? 'bg-[#EF4444]/15' : ''}`}
                title={isClosed ? 'السوق مغلق حالياً' : undefined}
              >
                {/* 1. Code + Sub-name */}
                <div className="flex items-center gap-1.5 min-w-0 pr-0.5">
                  <GripVertical className="w-3 h-3 text-[#334155] opacity-0 group-hover:opacity-100 shrink-0 cursor-grab" />
                  <div className="flex flex-col min-w-0 justify-center">
                    <div className="flex items-center gap-1">
                      <span
                        dir="ltr"
                        className={`font-mono font-bold text-xs tracking-tight whitespace-nowrap text-right shrink-0 min-w-[56px] pl-0.5 ${
                          isSelected ? 'text-[#2DD4BF]' : 'text-[#E8EEF9]'
                        }`}
                      >
                        {item.symbol}
                      </span>
                      {isClosed && (
                        <span className="text-[8px] px-1 rounded bg-[#1E293B] text-[#94A3B8] font-sans">
                          مغلق
                        </span>
                      )}
                    </div>
                    <span
                      className="text-[10px] text-[#7B8DA8] truncate max-w-[110px] text-right block leading-tight"
                      title={item.name}
                    >
                      {item.name}
                    </span>
                  </div>
                </div>

                {/* 2. Sparkline */}
                <div className="flex items-center justify-center shrink-0">
                  {renderSparkline(item)}
                </div>

                {/* 3. Price */}
                <div className="text-left font-mono text-xs font-semibold text-[#E8EEF9] whitespace-nowrap">
                  {displayPrice !== null ? displayPrice.toFixed(item.precision) : '…'}
                </div>

                {/* 4. Change % */}
                <div className={`text-left font-mono text-[11px] font-bold whitespace-nowrap ${isUp ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                  {realChange === null ? '—' : `${isUp ? '+' : ''}${realChange}%`}
                </div>

                {/* 5. Spread */}
                <div className="text-left font-mono text-[10px] text-[#7B8DA8] flex items-center justify-between whitespace-nowrap">
                  <span>{displaySpread}</span>
                  <button
                    onClick={(e) => handleRemoveSymbolFromList(item.symbol, e)}
                    title="إزالة من القائمة"
                    className="opacity-0 group-hover:opacity-100 text-[#64748B] hover:text-rose-400 p-0.5 ml-0.5 transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Tablet & Phone Card Layout (< 1101px): Touch-friendly cards showing code, price, sub-name, change%, and spread */}
              <div
                onClick={() => onSelectSymbol(item.symbol)}
                className={`min-[1101px]:hidden p-2.5 rounded-lg border cursor-pointer transition-all active:scale-[0.99] select-none flex flex-col gap-1.5 ${
                  isClosed ? 'opacity-60 saturate-50' : ''
                } ${
                  isSelected
                    ? 'bg-[#131F33] border-[#2DD4BF]/80 shadow-[0_0_8px_rgba(45,212,191,0.15)]'
                    : 'bg-[#0E1726]/80 hover:bg-[#121A2B] border-[#1C2638] active:bg-[#162033]'
                } ${flash === 'up' ? 'bg-[#22C55E]/15' : flash === 'down' ? 'bg-[#EF4444]/15' : ''}`}
              >
                {/* Top Row: Symbol + Status + Price */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      dir="ltr"
                      className={`font-mono font-bold text-sm tracking-tight ${
                        isSelected ? 'text-[#2DD4BF]' : 'text-[#E8EEF9]'
                      }`}
                    >
                      {item.symbol}
                    </span>
                    {isClosed && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1E293B] text-[#94A3B8] font-sans">
                        مغلق
                      </span>
                    )}
                  </div>
                  <div className="text-left font-mono text-sm font-bold text-[#E8EEF9] whitespace-nowrap">
                    {displayPrice !== null ? displayPrice.toFixed(item.precision) : '…'}
                  </div>
                </div>

                {/* Bottom Row: Sub-name + Change% + Spread */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-[11px] text-[#7B8DA8] truncate max-w-[170px]" title={item.name}>
                    {item.name}
                  </span>
                  <div className="flex items-center gap-2 font-mono whitespace-nowrap">
                    <span
                      className={`font-bold text-xs ${
                        isUp ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {realChange === null ? '—' : `${isUp ? '+' : ''}${realChange}%`}
                    </span>
                    <span className="text-[10px] text-[#64748B] bg-[#08111E] px-1.5 py-0.5 rounded border border-[#1E283D]">
                      {displaySpread}
                    </span>
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
