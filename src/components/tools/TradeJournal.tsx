import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MarketSymbol } from '../../types/market';
import {
  JournalEntry,
  TradeEmotion,
  EMOTION_LABELS,
  fetchJournalEntries,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
} from '../../api/journal';
import { OfflineBadge } from '../common/OfflineBadge';
import { LoadingSkeleton, EmptyState, ErrorState } from '../common/ScreenState';
import { LangId, DICTS, formatDateTime, t } from '../../i18n/locales';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Filter,
  TrendingUp,
  TrendingDown,
  Calendar,
  ExternalLink,
  X,
  Search,
  RotateCcw,
  CheckCircle2,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  PieChart,
  BarChart2,
  Activity,
  Tag,
  Smile,
  Shield,
  Layers,
} from 'lucide-react';

interface ExtendedJournalEntry extends JournalEntry {
  stop_loss?: number;
}

interface TradeJournalProps {
  symbols: MarketSymbol[];
  currentLang?: LangId;
}

type SortField = 'date' | 'symbol' | 'direction' | 'entry_price' | 'exit_price' | 'lots' | 'pnl';
type SortOrder = 'asc' | 'desc';

const ITEMS_PER_PAGE = 25;

export const TradeJournal: React.FC<TradeJournalProps> = ({
  symbols,
  currentLang = 'ar',
}) => {
  const dict = DICTS[currentLang] || DICTS.ar;

  const [entries, setEntries] = useState<ExtendedJournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // 2.1 Filters
  const [filterSymbol, setFilterSymbol] = useState<string>('all');
  const [filterDirection, setFilterDirection] = useState<'all' | 'buy' | 'sell'>('all');
  const [filterResult, setFilterResult] = useState<'all' | 'win' | 'loss' | 'breakeven'>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 2.1 Sorting
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // 2.1 Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  // Form fields
  const [formSymbol, setFormSymbol] = useState(symbols[0]?.symbol || 'EURUSD');
  const [formDirection, setFormDirection] = useState<'buy' | 'sell'>('buy');
  const [formEntry, setFormEntry] = useState('');
  const [formExit, setFormExit] = useState('');
  const [formStopLoss, setFormStopLoss] = useState('');
  const [formLots, setFormLots] = useState('0.1');
  const [formPnl, setFormPnl] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formEmotion, setFormEmotion] = useState<TradeEmotion>('disciplined');
  const [formNotes, setFormNotes] = useState('');
  const [formScreenshotUrl, setFormScreenshotUrl] = useState('');
  const [formError, setFormError] = useState('');

  // Delete confirmation modal
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Active chart view tab
  const [activeChartTab, setActiveChartTab] = useState<'equity' | 'symbol' | 'weekday' | 'session'>('equity');

  // Load Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const res = await fetchJournalEntries();
      setEntries(res.entries as ExtendedJournalEntry[]);
      setIsOffline(res.isOffline);
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Sort Toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // 2.1 Filtering & Sorting
  const filteredAndSortedEntries = useMemo(() => {
    const filtered = entries.filter((item) => {
      if (filterSymbol !== 'all' && item.symbol !== filterSymbol) return false;
      if (filterDirection !== 'all' && item.direction !== filterDirection) return false;
      if (filterResult === 'win' && item.pnl <= 0) return false;
      if (filterResult === 'loss' && item.pnl >= 0) return false;
      if (filterResult === 'breakeven' && item.pnl !== 0) return false;
      if (filterDateFrom && item.date < filterDateFrom) return false;
      if (filterDateTo && item.date > filterDateTo) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inNotes = item.notes?.toLowerCase().includes(q);
        const inSym = item.symbol.toLowerCase().includes(q);
        const inTags = item.tags.some((t) => t.toLowerCase().includes(q));
        if (!inNotes && !inSym && !inTags) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === 'symbol') {
        comparison = a.symbol.localeCompare(b.symbol);
      } else if (sortField === 'direction') {
        comparison = a.direction.localeCompare(b.direction);
      } else if (sortField === 'entry_price') {
        comparison = a.entry_price - b.entry_price;
      } else if (sortField === 'exit_price') {
        comparison = a.exit_price - b.exit_price;
      } else if (sortField === 'lots') {
        comparison = a.lots - b.lots;
      } else if (sortField === 'pnl') {
        comparison = a.pnl - b.pnl;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [entries, filterSymbol, filterDirection, filterResult, filterDateFrom, filterDateTo, searchQuery, sortField, sortOrder]);

  // 2.1 Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedEntries.length / ITEMS_PER_PAGE));
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedEntries.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAndSortedEntries, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // 2.2 Statistics computed from the journal rows only:
  // total trades, win rate, profit factor, average win, average loss, expectancy, best trade, worst trade,
  // max consecutive wins and losses, average R (only when stop-loss exists).
  // Show "—" when there is not enough data, never a fake number.
  const computedStats = useMemo(() => {
    const total = entries.length;
    if (total === 0) {
      return {
        totalTrades: 0,
        winRate: '—',
        profitFactor: '—',
        averageWin: '—',
        averageLoss: '—',
        expectancy: '—',
        bestTrade: '—',
        worstTrade: '—',
        maxConsecWins: '—',
        maxConsecLosses: '—',
        averageR: '—',
        netPnl: 0,
      };
    }

    const wins = entries.filter((e) => e.pnl > 0);
    const losses = entries.filter((e) => e.pnl < 0);
    const netPnl = entries.reduce((acc, e) => acc + e.pnl, 0);

    const winRateVal = (wins.length / total) * 100;
    const winRate = `${winRateVal.toFixed(1)}%`;

    const grossProfit = wins.reduce((acc, e) => acc + e.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((acc, e) => acc + e.pnl, 0));

    let profitFactor = '—';
    if (grossLoss > 0) {
      profitFactor = (grossProfit / grossLoss).toFixed(2);
    } else if (grossProfit > 0) {
      profitFactor = '∞';
    }

    const averageWin = wins.length > 0 ? `$${(grossProfit / wins.length).toFixed(2)}` : '—';
    const averageLoss = losses.length > 0 ? `-$${(grossLoss / losses.length).toFixed(2)}` : '—';

    // Expectancy = (Win% * AvgWin) - (Loss% * AvgLoss)
    let expectancy = '—';
    const avgWinNum = wins.length > 0 ? grossProfit / wins.length : 0;
    const avgLossNum = losses.length > 0 ? grossLoss / losses.length : 0;
    const expVal = (winRateVal / 100) * avgWinNum - ((100 - winRateVal) / 100) * avgLossNum;
    expectancy = `$${expVal.toFixed(2)}`;

    // Best & Worst trade
    const allPnl = entries.map((e) => e.pnl);
    const bestNum = Math.max(...allPnl);
    const worstNum = Math.min(...allPnl);
    const bestTrade = bestNum > 0 ? `+$${bestNum.toFixed(2)}` : `$${bestNum.toFixed(2)}`;
    const worstTrade = worstNum < 0 ? `-$${Math.abs(worstNum).toFixed(2)}` : `$${worstNum.toFixed(2)}`;

    // Max consecutive wins & losses (sorted chronologically)
    const chronological = [...entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let maxWins = 0;
    let curWins = 0;
    let maxLoss = 0;
    let curLoss = 0;

    chronological.forEach((e) => {
      if (e.pnl > 0) {
        curWins++;
        curLoss = 0;
        if (curWins > maxWins) maxWins = curWins;
      } else if (e.pnl < 0) {
        curLoss++;
        curWins = 0;
        if (curLoss > maxLoss) maxLoss = curLoss;
      } else {
        curWins = 0;
        curLoss = 0;
      }
    });

    const maxConsecWins = maxWins.toString();
    const maxConsecLosses = maxLoss.toString();

    // Average R (only when stop-loss data exists)
    const tradesWithSl = entries.filter(
      (e) => typeof e.stop_loss === 'number' && e.stop_loss > 0 && e.stop_loss !== e.entry_price
    );

    let averageR = '—';
    if (tradesWithSl.length > 0) {
      let sumR = 0;
      tradesWithSl.forEach((e) => {
        const riskPerUnit = Math.abs(e.entry_price - (e.stop_loss as number));
        const totalRisk = riskPerUnit * e.lots * 100000; // approximate nominal risk
        if (totalRisk > 0) {
          sumR += e.pnl / totalRisk;
        }
      });
      averageR = `${(sumR / tradesWithSl.length).toFixed(2)}R`;
    }

    return {
      totalTrades: total,
      winRate,
      profitFactor,
      averageWin,
      averageLoss,
      expectancy,
      bestTrade,
      worstTrade,
      maxConsecWins,
      maxConsecLosses,
      averageR,
      netPnl,
    };
  }, [entries]);

  // 2.4 Export CSV with UTF-8 BOM (\uFEFF)
  const handleExportCsv = () => {
    if (entries.length === 0) return;
    const bom = '\uFEFF';
    const headers = [
      dict.date,
      dict.symbol,
      dict.type,
      dict.entry,
      dict.exit,
      dict.lots,
      dict.pnl,
      dict.notes,
    ];

    const rows = entries.map((e) => [
      `"${e.date}"`,
      `"${e.symbol}"`,
      `"${e.direction.toUpperCase()}"`,
      e.entry_price,
      e.exit_price,
      e.lots,
      e.pnl,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `matrix-trade-journal-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2.4 Print Report
  const handlePrint = () => {
    window.print();
  };

  // Form Open Create
  const handleOpenCreate = () => {
    setEditingEntryId(null);
    setFormSymbol(symbols[0]?.symbol || 'EURUSD');
    setFormDirection('buy');
    setFormEntry('');
    setFormExit('');
    setFormStopLoss('');
    setFormLots('0.1');
    setFormPnl('');
    setFormTags('');
    setFormEmotion('disciplined');
    setFormNotes('');
    setFormScreenshotUrl('');
    setFormError('');
    setIsFormOpen(true);
  };

  // Form Open Edit
  const handleOpenEdit = (entry: ExtendedJournalEntry) => {
    setEditingEntryId(entry.id);
    setFormSymbol(entry.symbol);
    setFormDirection(entry.direction);
    setFormEntry(entry.entry_price.toString());
    setFormExit(entry.exit_price.toString());
    setFormStopLoss(entry.stop_loss ? entry.stop_loss.toString() : '');
    setFormLots(entry.lots.toString());
    setFormPnl(entry.pnl.toString());
    setFormTags(entry.tags.join(', '));
    setFormEmotion(entry.emotion || 'disciplined');
    setFormNotes(entry.notes || '');
    setFormScreenshotUrl(entry.screenshot_url || '');
    setFormError('');
    setIsFormOpen(true);
  };

  // Submit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const entryNum = parseFloat(formEntry);
    const exitNum = parseFloat(formExit);
    const lotsNum = parseFloat(formLots);
    const pnlNum = parseFloat(formPnl);
    const slNum = formStopLoss.trim() ? parseFloat(formStopLoss) : undefined;

    if (isNaN(entryNum) || isNaN(exitNum) || isNaN(lotsNum) || isNaN(pnlNum)) {
      setFormError(
        currentLang === 'en-US'
          ? 'Please ensure all numeric inputs are valid.'
          : currentLang === 'ku'
          ? 'تکایە دڵنیابە لە دروستی هەموو خانە ژمارەییەکان.'
          : 'يرجى التأكد من إدخال جميع الحقول الرقمية بشكل صحيح.'
      );
      return;
    }

    const tagList = formTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      if (editingEntryId) {
        await updateJournalEntry(editingEntryId, {
          symbol: formSymbol,
          direction: formDirection,
          entry_price: entryNum,
          exit_price: exitNum,
          lots: lotsNum,
          pnl: pnlNum,
          tags: tagList,
          emotion: formEmotion,
          notes: formNotes,
          screenshot_url: formScreenshotUrl,
          ...(slNum ? { stop_loss: slNum } : {}),
        } as any);
      } else {
        await createJournalEntry({
          date: new Date().toISOString(),
          symbol: formSymbol,
          direction: formDirection,
          entry_price: entryNum,
          exit_price: exitNum,
          lots: lotsNum,
          pnl: pnlNum,
          tags: tagList,
          emotion: formEmotion,
          notes: formNotes,
          screenshot_url: formScreenshotUrl,
          ...(slNum ? { stop_loss: slNum } : {}),
        } as any);
      }

      setIsFormOpen(false);
      loadData();
    } catch {
      setFormError(
        currentLang === 'en-US'
          ? 'Failed to save trade record. Please try again.'
          : currentLang === 'ku'
          ? 'پاشەکەوتکردن سەرکەوتوو نەبوو. دووبارە هەوڵبدەرەوە.'
          : 'فشل حفظ البيانات. يرجى المحاولة ثانية.'
      );
    }
  };

  // Delete Action
  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteJournalEntry(deletingId);
      setDeletingId(null);
      loadData();
    } catch {}
  };

  // Reset Filters
  const handleResetFilters = () => {
    setFilterSymbol('all');
    setFilterDirection('all');
    setFilterResult('all');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Distinct symbols for filter
  const distinctSymbols = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => set.add(e.symbol));
    return Array.from(set);
  }, [entries]);

  // 2.3 Charts Calculation (Pure SVG)
  // 1. Equity Curve
  const equityPoints = useMemo(() => {
    const sorted = [...entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    let current = 0;
    const points: { x: number; y: number; pnl: number; date: string }[] = [{ x: 0, y: 0, pnl: 0, date: 'Start' }];
    sorted.forEach((e, idx) => {
      current += e.pnl;
      points.push({ x: idx + 1, y: current, pnl: e.pnl, date: e.date });
    });
    return points;
  }, [entries]);

  // 2. P/L by Symbol
  const pnlBySymbol = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach((e) => {
      map.set(e.symbol, (map.get(e.symbol) || 0) + e.pnl);
    });
    return Array.from(map.entries()).map(([sym, pnl]) => ({ sym, pnl }));
  }, [entries]);

  // 3. P/L by Weekday
  const pnlByWeekday = useMemo(() => {
    const dayLabels = [
      dict.weekdaySun,
      dict.weekdayMon,
      dict.weekdayTue,
      dict.weekdayWed,
      dict.weekdayThu,
      dict.weekdayFri,
      dict.weekdaySat,
    ];
    const dayPnl = [0, 0, 0, 0, 0, 0, 0];
    entries.forEach((e) => {
      const d = new Date(e.date);
      const day = d.getDay();
      dayPnl[day] += e.pnl;
    });
    return dayLabels.map((label, idx) => ({ label, pnl: dayPnl[idx] })).filter((_, idx) => idx >= 1 && idx <= 5);
  }, [entries, dict]);

  // 4. P/L by Session (Asia / London / New York UTC)
  const pnlBySession = useMemo(() => {
    let asia = 0;
    let london = 0;
    let ny = 0;

    entries.forEach((e) => {
      const utcHour = new Date(e.date).getUTCHours();
      if (utcHour >= 0 && utcHour < 8) {
        asia += e.pnl;
      } else if (utcHour >= 8 && utcHour < 14) {
        london += e.pnl;
      } else {
        ny += e.pnl;
      }
    });

    return [
      { label: dict.sessionAsia, pnl: asia },
      { label: dict.sessionLondon, pnl: london },
      { label: dict.sessionNewYork, pnl: ny },
    ];
  }, [entries, dict]);

  // Loading State
  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <LoadingSkeleton rows={8} />
      </div>
    );
  }

  // Error State
  if (isError) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <ErrorState onRetry={loadData} />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6 select-none text-xs text-[#E8EEF9]">
      {/* Print-only CSS style */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          header, nav, button, .no-print { display: none !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #ccc !important; padding: 6px !important; color: black !important; }
        }
      `}</style>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0E1626] border border-[#1E2E4A] p-4 sm:p-5 rounded-2xl shadow-lg no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white">{dict.toolTradeJournal}</h2>
              {isOffline && <OfflineBadge />}
            </div>
            <p className="text-xs text-[#94A3B8] mt-0.5">{dict.toolsSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <button
            onClick={handleExportCsv}
            disabled={entries.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#14233C] hover:bg-[#1C3256] text-[#2DD4BF] border border-[#2DD4BF]/30 font-bold transition-all disabled:opacity-50 cursor-pointer min-h-[44px] focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden"
          >
            <Download className="w-4 h-4" />
            <span>{dict.exportCsv}</span>
          </button>
          <button
            onClick={handlePrint}
            disabled={entries.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#14233C] hover:bg-[#1C3256] text-[#CBD5E1] border border-[#243452] font-semibold transition-all disabled:opacity-50 cursor-pointer min-h-[44px] focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden"
          >
            <Printer className="w-4 h-4" />
            <span>{dict.printReport}</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2DD4BF] hover:bg-[#14B8A6] text-[#042F2E] font-black transition-all shadow-md cursor-pointer min-h-[44px] focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden"
          >
            <Plus className="w-4 h-4" />
            <span>{dict.newTrade}</span>
          </button>
        </div>
      </div>

      {/* 2.2 Statistics Cards Grid (computed from journal rows only - no fake numbers) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Trades */}
        <div className="bg-[#0B1220] border border-[#1E283D] p-3.5 rounded-xl flex flex-col justify-between space-y-1">
          <span className="text-[11px] text-[#7B8DA8] block">{dict.statsTotalTrades}</span>
          <span className="text-xl font-black text-white font-mono">{computedStats.totalTrades}</span>
        </div>

        {/* Win Rate */}
        <div className="bg-[#0B1220] border border-[#1E283D] p-3.5 rounded-xl flex flex-col justify-between space-y-1">
          <span className="text-[11px] text-[#7B8DA8] block">{dict.statsWinRate}</span>
          <span className="text-xl font-black text-emerald-400 font-mono">{computedStats.winRate}</span>
        </div>

        {/* Profit Factor */}
        <div className="bg-[#0B1220] border border-[#1E283D] p-3.5 rounded-xl flex flex-col justify-between space-y-1">
          <span className="text-[11px] text-[#7B8DA8] block">{dict.statsProfitFactor}</span>
          <span className="text-xl font-black text-[#2DD4BF] font-mono">{computedStats.profitFactor}</span>
        </div>

        {/* Net Profit */}
        <div className="bg-[#0B1220] border border-[#1E283D] p-3.5 rounded-xl flex flex-col justify-between space-y-1">
          <span className="text-[11px] text-[#7B8DA8] block">{dict.netProfit}</span>
          <span
            className={`text-xl font-black font-mono ${
              computedStats.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            ${computedStats.netPnl.toFixed(2)}
          </span>
        </div>

        {/* Avg Win & Avg Loss */}
        <div className="bg-[#0B1220] border border-[#1E283D] p-3.5 rounded-xl flex flex-col justify-between space-y-1">
          <span className="text-[11px] text-[#7B8DA8] block">{dict.statsAvgWin} / {dict.statsAvgLoss}</span>
          <div className="text-xs font-mono font-bold flex items-center justify-between gap-1">
            <span className="text-emerald-400">{computedStats.averageWin}</span>
            <span className="text-rose-400">{computedStats.averageLoss}</span>
          </div>
        </div>

        {/* Expectancy */}
        <div className="bg-[#0B1220] border border-[#1E283D] p-3.5 rounded-xl flex flex-col justify-between space-y-1">
          <span className="text-[11px] text-[#7B8DA8] block">{dict.statsExpectancy}</span>
          <span className="text-xl font-black text-sky-400 font-mono">{computedStats.expectancy}</span>
        </div>

        {/* Best & Worst */}
        <div className="bg-[#0B1220] border border-[#1E283D] p-3.5 rounded-xl flex flex-col justify-between space-y-1">
          <span className="text-[11px] text-[#7B8DA8] block">{dict.statsBestTrade} / {dict.statsWorstTrade}</span>
          <div className="text-xs font-mono font-bold flex items-center justify-between gap-1">
            <span className="text-emerald-400">{computedStats.bestTrade}</span>
            <span className="text-rose-400">{computedStats.worstTrade}</span>
          </div>
        </div>

        {/* Max Consec Wins / Losses */}
        <div className="bg-[#0B1220] border border-[#1E283D] p-3.5 rounded-xl flex flex-col justify-between space-y-1">
          <span className="text-[11px] text-[#7B8DA8] block">{dict.statsMaxConsecWins} / {dict.statsMaxConsecLosses}</span>
          <div className="text-xs font-mono font-bold flex items-center justify-between gap-1">
            <span className="text-emerald-400">{computedStats.maxConsecWins}W</span>
            <span className="text-rose-400">{computedStats.maxConsecLosses}L</span>
          </div>
        </div>

        {/* Average R */}
        <div className="bg-[#0B1220] border border-[#1E283D] p-3.5 rounded-xl flex flex-col justify-between space-y-1">
          <span className="text-[11px] text-[#7B8DA8] block">{dict.statsAvgR}</span>
          <span className="text-xl font-black text-amber-400 font-mono">{computedStats.averageR}</span>
        </div>
      </div>

      {/* 2.3 SVG Visual Performance Charts */}
      {entries.length > 0 && (
        <div className="bg-[#0B1220] border border-[#1E283D] rounded-2xl p-4 sm:p-5 space-y-4 no-print">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E283D] pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#2DD4BF]" />
              <h3 className="font-bold text-sm text-white">الرسوم البيانية التراكمية لتحليل الأداء</h3>
            </div>
            <div className="flex items-center gap-1 bg-[#101827] p-1 rounded-xl border border-[#1E2E4A] overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveChartTab('equity')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer min-h-[32px] ${
                  activeChartTab === 'equity'
                    ? 'bg-[#2DD4BF] text-[#042F2E] font-bold'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                {dict.chartEquityCurve}
              </button>
              <button
                onClick={() => setActiveChartTab('symbol')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer min-h-[32px] ${
                  activeChartTab === 'symbol'
                    ? 'bg-[#2DD4BF] text-[#042F2E] font-bold'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                {dict.chartPnlBySymbol}
              </button>
              <button
                onClick={() => setActiveChartTab('weekday')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer min-h-[32px] ${
                  activeChartTab === 'weekday'
                    ? 'bg-[#2DD4BF] text-[#042F2E] font-bold'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                {dict.chartPnlByWeekday}
              </button>
              <button
                onClick={() => setActiveChartTab('session')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer min-h-[32px] ${
                  activeChartTab === 'session'
                    ? 'bg-[#2DD4BF] text-[#042F2E] font-bold'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                {dict.chartPnlBySession}
              </button>
            </div>
          </div>

          {/* Tab 1: Equity Curve SVG */}
          {activeChartTab === 'equity' && (
            <div className="h-56 sm:h-64 w-full relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 800 240" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="equityGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#2DD4BF" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Horizontal reference zero grid */}
                <line x1="0" y1="120" x2="800" y2="120" stroke="#1E2E4A" strokeWidth="1" strokeDasharray="4 4" />
                {(() => {
                  const values = equityPoints.map((p) => p.y);
                  const min = Math.min(0, ...values);
                  const max = Math.max(10, ...values);
                  const range = max - min || 1;

                  const coords = equityPoints.map((p, i) => {
                    const x = (i / Math.max(1, equityPoints.length - 1)) * 800;
                    const y = 220 - ((p.y - min) / range) * 200;
                    return `${x},${y}`;
                  });

                  const linePath = `M ${coords.join(' L ')}`;
                  const areaPath = `M 0,220 L ${coords.join(' L ')} L 800,220 Z`;

                  return (
                    <>
                      <path d={areaPath} fill="url(#equityGrad)" />
                      <path d={linePath} fill="none" stroke="#2DD4BF" strokeWidth="3" strokeLinecap="round" />
                    </>
                  );
                })()}
              </svg>
            </div>
          )}

          {/* Tab 2: P/L by Symbol Bar Chart */}
          {activeChartTab === 'symbol' && (
            <div className="space-y-2 py-2">
              {pnlBySymbol.map((item, idx) => {
                const maxAbs = Math.max(1, ...pnlBySymbol.map((p) => Math.abs(p.pnl)));
                const pct = Math.min(100, (Math.abs(item.pnl) / maxAbs) * 100);
                const isPositive = item.pnl >= 0;
                return (
                  <div key={idx} className="flex items-center gap-3 text-xs">
                    <span className="w-20 font-bold font-mono text-white shrink-0">{item.sym}</span>
                    <div className="flex-1 bg-[#101827] h-5 rounded-lg overflow-hidden flex items-center px-1">
                      <div
                        className={`h-3 rounded-md transition-all ${
                          isPositive ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span
                      className={`w-24 text-left font-mono font-bold shrink-0 ${
                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isPositive ? `+$${item.pnl.toFixed(2)}` : `-$${Math.abs(item.pnl).toFixed(2)}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 3: P/L by Weekday Bar Chart */}
          {activeChartTab === 'weekday' && (
            <div className="space-y-2 py-2">
              {pnlByWeekday.map((item, idx) => {
                const maxAbs = Math.max(1, ...pnlByWeekday.map((p) => Math.abs(p.pnl)));
                const pct = Math.min(100, (Math.abs(item.pnl) / maxAbs) * 100);
                const isPositive = item.pnl >= 0;
                return (
                  <div key={idx} className="flex items-center gap-3 text-xs">
                    <span className="w-24 font-bold text-white shrink-0">{item.label}</span>
                    <div className="flex-1 bg-[#101827] h-5 rounded-lg overflow-hidden flex items-center px-1">
                      <div
                        className={`h-3 rounded-md transition-all ${
                          isPositive ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span
                      className={`w-24 text-left font-mono font-bold shrink-0 ${
                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isPositive ? `+$${item.pnl.toFixed(2)}` : `-$${Math.abs(item.pnl).toFixed(2)}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 4: P/L by Session Bar Chart */}
          {activeChartTab === 'session' && (
            <div className="space-y-2 py-2">
              {pnlBySession.map((item, idx) => {
                const maxAbs = Math.max(1, ...pnlBySession.map((p) => Math.abs(p.pnl)));
                const pct = Math.min(100, (Math.abs(item.pnl) / maxAbs) * 100);
                const isPositive = item.pnl >= 0;
                return (
                  <div key={idx} className="flex items-center gap-3 text-xs">
                    <span className="w-36 font-bold text-white shrink-0">{item.label}</span>
                    <div className="flex-1 bg-[#101827] h-5 rounded-lg overflow-hidden flex items-center px-1">
                      <div
                        className={`h-3 rounded-md transition-all ${
                          isPositive ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span
                      className={`w-24 text-left font-mono font-bold shrink-0 ${
                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isPositive ? `+$${item.pnl.toFixed(2)}` : `-$${Math.abs(item.pnl).toFixed(2)}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2.1 Filters Ribbon */}
      <div className="bg-[#0B1220] border border-[#1E283D] p-3.5 sm:p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Symbol Filter */}
          <select
            value={filterSymbol}
            onChange={(e) => {
              setFilterSymbol(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-[#121A2B] border border-[#243452] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#2DD4BF] min-h-[44px]"
          >
            <option value="all">{dict.allSymbols} ({dict.symbol})</option>
            {distinctSymbols.map((sym) => (
              <option key={sym} value={sym}>
                {sym}
              </option>
            ))}
          </select>

          {/* Direction Filter */}
          <select
            value={filterDirection}
            onChange={(e) => {
              setFilterDirection(e.target.value as any);
              setCurrentPage(1);
            }}
            className="bg-[#121A2B] border border-[#243452] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#2DD4BF] min-h-[44px]"
          >
            <option value="all">{dict.directionAll}</option>
            <option value="buy">{dict.buy}</option>
            <option value="sell">{dict.sell}</option>
          </select>

          {/* Result Filter */}
          <select
            value={filterResult}
            onChange={(e) => {
              setFilterResult(e.target.value as any);
              setCurrentPage(1);
            }}
            className="bg-[#121A2B] border border-[#243452] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#2DD4BF] min-h-[44px]"
          >
            <option value="all">{dict.resultAll}</option>
            <option value="win">{dict.resultWin}</option>
            <option value="loss">{dict.resultLoss}</option>
            <option value="breakeven">{dict.resultBreakeven}</option>
          </select>

          {/* Date Range */}
          <div className="flex items-center gap-1.5 bg-[#121A2B] border border-[#243452] rounded-xl px-2.5 py-1 min-h-[44px]">
            <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => {
                setFilterDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              title={dict.filterDateFrom}
              className="bg-transparent text-white text-xs focus:outline-hidden"
            />
            <span className="text-[#64748B]">-</span>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => {
                setFilterDateTo(e.target.value);
                setCurrentPage(1);
              }}
              title={dict.filterDateTo}
              className="bg-transparent text-white text-xs focus:outline-hidden"
            />
          </div>

          {/* Search Query */}
          <div className="relative flex-1 min-w-[150px]">
            <Search className="w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 right-3 text-[#64748B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={dict.searchPlaceholder}
              className="w-full bg-[#121A2B] border border-[#243452] rounded-xl pr-8 pl-3 py-2 text-xs text-white placeholder-[#64748B] focus:outline-hidden focus:border-[#2DD4BF] min-h-[44px]"
            />
          </div>
        </div>

        <button
          onClick={handleResetFilters}
          className="p-2.5 rounded-xl text-[#94A3B8] hover:text-white bg-[#121A2B] border border-[#243452] hover:bg-[#1E2E4A] cursor-pointer min-h-[44px] flex items-center justify-center shrink-0"
          title="إعادة ضبط الفلاتر"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* 2.1 Empty State if no entries */}
      {entries.length === 0 ? (
        <EmptyState
          title={dict.noTrades}
          message={dict.noTradesDesc}
          action={
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2.5 rounded-xl bg-[#2DD4BF] hover:bg-[#14B8A6] text-[#042F2E] font-black text-xs cursor-pointer shadow-md transition-all min-h-[44px]"
            >
              {dict.newTrade}
            </button>
          }
        />
      ) : filteredAndSortedEntries.length === 0 ? (
        <div className="bg-[#0B1220] border border-[#1E283D] rounded-2xl p-12 text-center space-y-3">
          <Filter className="w-8 h-8 mx-auto text-[#64748B]" />
          <h4 className="font-bold text-sm text-white">لا توجد صفقات تطابق معايير الفلترة</h4>
          <p className="text-xs text-[#94A3B8]">جرب تغيير فلاتر الزوج أو الاتجاه أو مسح البحث.</p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 rounded-xl bg-[#16233B] hover:bg-[#1E2E4A] text-[#2DD4BF] font-bold text-xs cursor-pointer transition-colors"
          >
            إعادة ضبط الفلاتر
          </button>
        </div>
      ) : (
        <>
          {/* 2.1 Table View (Desktop & Tablet) */}
          <div className="hidden md:block rounded-2xl bg-[#0B1220] border border-[#1E283D] overflow-hidden shadow-xl">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-[#0A101D] border-b border-[#1E283D] text-[#7B8DA8]">
                  <th
                    onClick={() => handleSort('date')}
                    className="py-3 px-4 font-bold cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{dict.date}</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('symbol')}
                    className="py-3 px-4 font-bold cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{dict.symbol}</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('direction')}
                    className="py-3 px-4 font-bold cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{dict.type}</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('entry_price')}
                    className="py-3 px-4 font-bold cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{dict.entry}</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('exit_price')}
                    className="py-3 px-4 font-bold cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{dict.exit}</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('lots')}
                    className="py-3 px-4 font-bold cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{dict.lots}</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('pnl')}
                    className="py-3 px-4 font-bold cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{dict.pnl}</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-center no-print">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#162238]">
                {paginatedEntries.map((item) => {
                  const isWin = item.pnl > 0;
                  const isLoss = item.pnl < 0;
                  return (
                    <tr key={item.id} className="hover:bg-[#0E1728] transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[#CBD5E1]">
                        {formatDateTime(item.date, currentLang, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white font-mono">{item.symbol}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded font-black text-[10px] uppercase font-mono ${
                            item.direction === 'buy'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {item.direction}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#CBD5E1]">{item.entry_price}</td>
                      <td className="py-3.5 px-4 font-mono text-[#CBD5E1]">{item.exit_price}</td>
                      <td className="py-3.5 px-4 font-mono text-white">{item.lots}</td>
                      <td className="py-3.5 px-4 font-mono font-black">
                        <span className={isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-400'}>
                          {isWin ? `+$${item.pnl.toFixed(2)}` : `$${item.pnl.toFixed(2)}`}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#2DD4BF] hover:bg-[#16233B] transition-colors cursor-pointer"
                            title="تعديل"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingId(item.id)}
                            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-rose-400 hover:bg-[#16233B] transition-colors cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 2.1 Mobile Card View (Phone < 768px strictly) */}
          <div className="md:hidden space-y-3">
            {paginatedEntries.map((item) => {
              const isWin = item.pnl > 0;
              const isLoss = item.pnl < 0;
              return (
                <div
                  key={item.id}
                  className="bg-[#0B1220] border border-[#1E283D] rounded-xl p-4 space-y-3 shadow-md"
                >
                  <div className="flex items-center justify-between border-b border-[#1E283D] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-white font-mono">{item.symbol}</span>
                      <span
                        className={`px-2 py-0.5 rounded font-black text-[10px] uppercase font-mono ${
                          item.direction === 'buy'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {item.direction}
                      </span>
                    </div>
                    <span
                      className={`text-base font-black font-mono ${
                        isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-400'
                      }`}
                    >
                      {isWin ? `+$${item.pnl.toFixed(2)}` : `$${item.pnl.toFixed(2)}`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[#64748B] text-[10px] block">{dict.entry}:</span>
                      <span className="font-mono text-white font-bold">{item.entry_price}</span>
                    </div>
                    <div>
                      <span className="text-[#64748B] text-[10px] block">{dict.exit}:</span>
                      <span className="font-mono text-white font-bold">{item.exit_price}</span>
                    </div>
                    <div>
                      <span className="text-[#64748B] text-[10px] block">{dict.lots}:</span>
                      <span className="font-mono text-white">{item.lots}</span>
                    </div>
                    <div>
                      <span className="text-[#64748B] text-[10px] block">{dict.date}:</span>
                      <span className="font-mono text-[#94A3B8] text-[11px]">
                        {formatDateTime(item.date, currentLang, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {item.notes && (
                    <div className="text-[11px] text-[#94A3B8] bg-[#0E1728] p-2 rounded-lg border border-[#16233B]">
                      {item.notes}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#1E283D] no-print">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="px-3 py-1.5 rounded-lg bg-[#14233C] text-[#2DD4BF] text-xs font-bold cursor-pointer"
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => setDeletingId(item.id)}
                      className="px-3 py-1.5 rounded-lg bg-rose-950/40 text-rose-400 text-xs font-bold cursor-pointer"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2.1 Pagination Footer (25 items per page) */}
          <div className="flex items-center justify-between border-t border-[#1E283D] pt-4 text-xs no-print">
            <span className="text-[#94A3B8]">
              {dict.pageOf
                .replace('{current}', currentPage.toString())
                .replace('{total}', totalPages.toString())} ({filteredAndSortedEntries.length} صفقة)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-[#121A2B] border border-[#243452] text-white disabled:opacity-40 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-[#121A2B] border border-[#243452] text-white disabled:opacity-40 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Trade Create/Edit Modal */}
      {isFormOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#0E1626] border border-[#2DD4BF]/40 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#1E2E4A] pb-3">
              <h3 className="text-base font-bold text-white">
                {editingEntryId ? dict.editTrade : dict.newTrade}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 text-[#7B8DA8] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#94A3B8] mb-1">{dict.symbol}</label>
                  <select
                    value={formSymbol}
                    onChange={(e) => setFormSymbol(e.target.value)}
                    className="w-full bg-[#121A2B] border border-[#243452] rounded-xl px-3 py-2.5 text-xs text-white min-h-[44px]"
                  >
                    {symbols.map((s) => (
                      <option key={s.symbol} value={s.symbol}>
                        {s.symbol}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#94A3B8] mb-1">{dict.type}</label>
                  <div className="grid grid-cols-2 gap-1 bg-[#121A2B] p-1 rounded-xl border border-[#243452]">
                    <button
                      type="button"
                      onClick={() => setFormDirection('buy')}
                      className={`py-2 rounded-lg font-bold text-xs cursor-pointer min-h-[36px] ${
                        formDirection === 'buy'
                          ? 'bg-emerald-600 text-white'
                          : 'text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      {dict.buy}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormDirection('sell')}
                      className={`py-2 rounded-lg font-bold text-xs cursor-pointer min-h-[36px] ${
                        formDirection === 'sell'
                          ? 'bg-rose-600 text-white'
                          : 'text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      {dict.sell}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#94A3B8] mb-1">{dict.entry}</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formEntry}
                    onChange={(e) => setFormEntry(e.target.value)}
                    placeholder="1.0850"
                    className="w-full bg-[#121A2B] border border-[#243452] rounded-xl px-3 py-2 text-xs text-white font-mono min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#94A3B8] mb-1">{dict.exit}</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formExit}
                    onChange={(e) => setFormExit(e.target.value)}
                    placeholder="1.0890"
                    className="w-full bg-[#121A2B] border border-[#243452] rounded-xl px-3 py-2 text-xs text-white font-mono min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#94A3B8] mb-1">وقف الخسارة (SL)</label>
                  <input
                    type="number"
                    step="any"
                    value={formStopLoss}
                    onChange={(e) => setFormStopLoss(e.target.value)}
                    placeholder="1.0820"
                    className="w-full bg-[#121A2B] border border-[#243452] rounded-xl px-3 py-2 text-xs text-white font-mono min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#94A3B8] mb-1">{dict.lots}</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formLots}
                    onChange={(e) => setFormLots(e.target.value)}
                    placeholder="0.10"
                    className="w-full bg-[#121A2B] border border-[#243452] rounded-xl px-3 py-2 text-xs text-white font-mono min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#94A3B8] mb-1">{dict.pnl}</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formPnl}
                    onChange={(e) => setFormPnl(e.target.value)}
                    placeholder="+40.00"
                    className="w-full bg-[#121A2B] border border-[#243452] rounded-xl px-3 py-2 text-xs text-white font-mono min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#94A3B8] mb-1">{dict.notes}</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="سبب الدخول، إدارة الصفقة، الملاحظات النفسية..."
                  className="w-full bg-[#121A2B] border border-[#243452] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#2DD4BF]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E2E4A]">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#16233B] hover:bg-[#1E2E4A] text-[#94A3B8] hover:text-white font-bold cursor-pointer min-h-[44px]"
                >
                  {dict.cancelAction}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#2DD4BF] hover:bg-[#14B8A6] text-[#042F2E] font-black cursor-pointer shadow-md min-h-[44px]"
                >
                  {editingEntryId ? dict.saveChanges : dict.addTrade}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-[#0E1626] border border-rose-500/40 rounded-2xl p-5 max-w-sm w-full space-y-4">
            <h4 className="font-bold text-sm text-white">تأكيد حذف الصفقة</h4>
            <p className="text-xs text-[#94A3B8] leading-relaxed">{dict.confirmDeleteTrade}</p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-xl bg-[#16233B] text-[#94A3B8] hover:text-white text-xs font-bold cursor-pointer min-h-[44px]"
              >
                {dict.cancelAction}
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer min-h-[44px]"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeJournal;
