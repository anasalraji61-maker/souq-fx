import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MarketSymbol } from '../../types/market';
import {
  JournalEntry,
  JournalStats,
  TradeEmotion,
  EMOTION_LABELS,
  fetchJournalEntries,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  fetchJournalStats,
  computeStatsLocally,
} from '../../api/journal';
import { OfflineBadge } from '../common/OfflineBadge';
import { LoadingSkeleton, EmptyState, ErrorState } from '../common/ScreenState';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Filter,
  TrendingUp,
  TrendingDown,
  Tag,
  Smile,
  Calendar,
  Image,
  ExternalLink,
  X,
  Search,
  RotateCcw,
  CheckCircle2,
  Award,
} from 'lucide-react';

interface TradeJournalProps {
  symbols: MarketSymbol[];
}

export const TradeJournal: React.FC<TradeJournalProps> = ({ symbols }) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [stats, setStats] = useState<JournalStats | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Filters (3.1: filters by symbol / tag / date range)
  const [filterSymbol, setFilterSymbol] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal / Form state (3.2: add/edit form with notes, tags, emotion, screenshot URL)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  // Form fields
  const [formSymbol, setFormSymbol] = useState(symbols[0]?.symbol || 'EURUSD');
  const [formDirection, setFormDirection] = useState<'buy' | 'sell'>('buy');
  const [formEntry, setFormEntry] = useState('');
  const [formExit, setFormExit] = useState('');
  const [formLots, setFormLots] = useState('0.1');
  const [formPnl, setFormPnl] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formEmotion, setFormEmotion] = useState<TradeEmotion>('disciplined');
  const [formNotes, setFormNotes] = useState('');
  const [formScreenshotUrl, setFormScreenshotUrl] = useState('');
  const [formError, setFormError] = useState('');

  // Selected screenshot preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Load Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const [entriesRes, statsRes] = await Promise.all([
        fetchJournalEntries(),
        fetchJournalStats(),
      ]);

      setEntries(entriesRes.entries);
      setStats(statsRes.stats);
      setIsOffline(entriesRes.isOffline || statsRes.isOffline);
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Extract all distinct tags for filtering
  const allDistinctTags = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => e.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [entries]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter((item) => {
      if (filterSymbol !== 'all' && item.symbol !== filterSymbol) return false;
      if (filterTag !== 'all' && !item.tags.includes(filterTag)) return false;
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
  }, [entries, filterSymbol, filterTag, filterDateFrom, filterDateTo, searchQuery]);

  // Reset filters
  const handleResetFilters = () => {
    setFilterSymbol('all');
    setFilterTag('all');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearchQuery('');
  };

  // Open Form for creating
  const handleOpenCreate = () => {
    setEditingEntryId(null);
    setFormSymbol(symbols[0]?.symbol || 'EURUSD');
    setFormDirection('buy');
    setFormEntry('');
    setFormExit('');
    setFormLots('0.1');
    setFormPnl('');
    setFormTags('');
    setFormEmotion('disciplined');
    setFormNotes('');
    setFormScreenshotUrl('');
    setFormError('');
    setIsFormOpen(true);
  };

  // Open Form for editing
  const handleOpenEdit = (entry: JournalEntry) => {
    setEditingEntryId(entry.id);
    setFormSymbol(entry.symbol);
    setFormDirection(entry.direction);
    setFormEntry(entry.entry_price.toString());
    setFormExit(entry.exit_price.toString());
    setFormLots(entry.lots.toString());
    setFormPnl(entry.pnl.toString());
    setFormTags(entry.tags.join(', '));
    setFormEmotion(entry.emotion);
    setFormNotes(entry.notes || '');
    setFormScreenshotUrl(entry.screenshot_url || '');
    setFormError('');
    setIsFormOpen(true);
  };

  // Save Trade (Create or Edit with validation, 3.2)
  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const entryPrice = parseFloat(formEntry);
    const exitPrice = parseFloat(formExit);
    const lots = parseFloat(formLots);

    if (isNaN(entryPrice) || entryPrice <= 0) {
      setFormError('يرجى إدخال سعر دخول صحيح أكبر من صفر');
      return;
    }
    if (isNaN(exitPrice) || exitPrice <= 0) {
      setFormError('يرجى إدخال سعر خروج صحيح أكبر من صفر');
      return;
    }
    if (isNaN(lots) || lots <= 0) {
      setFormError('يرجى إدخال حجم لوت صحيح أكبر من صفر');
      return;
    }

    let pnl = parseFloat(formPnl);
    if (isNaN(pnl)) {
      // Automatic estimation based on tick difference
      const diff = formDirection === 'buy' ? exitPrice - entryPrice : entryPrice - exitPrice;
      const multiplier = formSymbol.includes('JPY') ? 1000 : formSymbol.includes('XAU') ? 100 : 100000;
      pnl = parseFloat((diff * lots * multiplier).toFixed(2));
    }

    const tagsArray = formTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      date: new Date().toISOString().split('T')[0],
      symbol: formSymbol,
      direction: formDirection,
      entry_price: entryPrice,
      exit_price: exitPrice,
      lots,
      pnl,
      tags: tagsArray.length > 0 ? tagsArray : ['Manual'],
      emotion: formEmotion,
      notes: formNotes.trim() || undefined,
      screenshot_url: formScreenshotUrl.trim() || undefined,
    };

    if (editingEntryId) {
      const res = await updateJournalEntry(editingEntryId, payload);
      if (res.ok) {
        const updatedEntries = entries.map((e) =>
          e.id === editingEntryId ? { ...e, ...payload } : e
        );
        setEntries(updatedEntries);
        setStats(computeStatsLocally(updatedEntries));
        setIsFormOpen(false);
      } else {
        setFormError('تعذر تحديث الصفقة، يرجى المحاولة ثانية');
      }
    } else {
      const res = await createJournalEntry(payload);
      if (res.ok && res.entry) {
        const nextEntries = [res.entry, ...entries];
        setEntries(nextEntries);
        setStats(computeStatsLocally(nextEntries));
        setIsFormOpen(false);
      } else {
        setFormError('تعذر حفظ الصفقة، يرجى المحاولة ثانية');
      }
    }
  };

  // Delete trade
  const handleDeleteEntry = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('هل أنت متأكد من حذف هذه الصفقة من الدفتر؟')) return;

    await deleteJournalEntry(id);
    const remaining = entries.filter((e) => e.id !== id);
    setEntries(remaining);
    setStats(computeStatsLocally(remaining));
  };

  const currentStats = stats || computeStatsLocally(entries);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 select-none text-xs">
      {/* Title & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#243049]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20 shadow-xs">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[#E8EEF9]">دفتر صفقات المتداول (Trade Journal)</h1>
              {isOffline && <OfflineBadge forceShow />}
            </div>
            <p className="text-[#7B8DA8]">
              سجل صفقاتك بدقة، راقب حالتك النفسية، واكتشف الوسوم الأكثر ربحية لحسابك.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#2DD4BF] hover:bg-[#26bba8] text-[#042F2E] font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>صفقة جديدة</span>
        </button>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : isError ? (
        <ErrorState onRetry={loadData} />
      ) : entries.length === 0 ? (
        <div className="p-6 max-w-2xl mx-auto">
          <EmptyState
            icon={<BookOpen className="w-10 h-10 text-[#2DD4BF]" />}
            title="لا توجد صفقات مسجلة في دفتر الصفقات"
            message="دفتر الصفقات فارغ حالياً. ابدأ بتسجيل أول صفقة مغلقة لتتبع وتوثيق أداء تداولاتك الحقيقي وحساب نسب الربح والنجاح بدقة دون أي أرقام وهمية أو افتراضية."
            action={
              <button
                onClick={handleOpenCreate}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#2DD4BF] hover:bg-[#26bba8] text-[#042F2E] font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>تسجيل أول صفقة مغلقة</span>
              </button>
            }
          />
        </div>
      ) : (
        <>
          {/* Main KPI Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 bg-[#121A2B] rounded-xl border border-[#243049] space-y-1">
          <span className="text-[#7B8DA8] text-[11px] font-semibold">إجمالي الصفقات</span>
          <div className="text-2xl font-bold font-mono text-[#E8EEF9]">{currentStats.total_trades}</div>
          <span className="text-[10px] text-[#64748B]">
            {currentStats.winning_trades} رابحة • {currentStats.losing_trades} خاسرة
          </span>
        </div>

        <div className="p-4 bg-[#121A2B] rounded-xl border border-[#243049] space-y-1">
          <span className="text-[#7B8DA8] text-[11px] font-semibold">نسبة النجاح (Win Rate)</span>
          <div
            className={`text-2xl font-bold font-mono ${
              currentStats.win_rate >= 50 ? 'text-[#22C55E]' : 'text-[#EF4444]'
            }`}
          >
            {currentStats.win_rate}%
          </div>
          <span className="text-[10px] text-[#64748B]">معدل صفقات الهدف</span>
        </div>

        <div className="p-4 bg-[#121A2B] rounded-xl border border-[#243049] space-y-1">
          <span className="text-[#7B8DA8] text-[11px] font-semibold">صافي الأرباح (Net P&L)</span>
          <div
            className={`text-2xl font-bold font-mono ${
              currentStats.total_pnl >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
            }`}
          >
            {currentStats.total_pnl >= 0 ? '+' : ''}${currentStats.total_pnl.toFixed(2)}
          </div>
          <span className="text-[10px] text-[#64748B]">العائد الإجمالي المحقق</span>
        </div>

        <div className="p-4 bg-[#121A2B] rounded-xl border border-[#243049] space-y-1">
          <span className="text-[#7B8DA8] text-[11px] font-semibold">معامل الربحية (Profit Factor)</span>
          <div className="text-2xl font-bold font-mono text-[#38BDF8]">
            {currentStats.profit_factor}
          </div>
          <span className="text-[10px] text-[#64748B]">إجمالي الربح ÷ إجمالي الخسارة</span>
        </div>
      </div>

      {/* 3.3 Stats Cards by Tag (count, win rate, total P&L) */}
      {currentStats.by_tag.length > 0 && (
        <div className="p-4 bg-[#0F1829] rounded-xl border border-[#243049] space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#E8EEF9]">
            <Tag className="w-4 h-4 text-[#2DD4BF]" />
            <span>إحصائيات الأداء حسب الوسم واستراتيجية الدخول (Stats by Tag)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
            {currentStats.by_tag.map((t) => {
              const isProfit = t.total_pnl >= 0;
              return (
                <div
                  key={t.tag}
                  onClick={() => setFilterTag(filterTag === t.tag ? 'all' : t.tag)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    filterTag === t.tag
                      ? 'bg-[#1C2E4A] border-[#2DD4BF] shadow-xs'
                      : 'bg-[#131F33] border-[#243049] hover:border-[#38BDF8]/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-white">#{t.tag}</span>
                    <span className="text-[10px] text-[#7B8DA8] font-mono">{t.count} صفقات</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className={t.win_rate >= 50 ? 'text-[#22C55E]' : 'text-[#EF4444]'}>
                      {t.win_rate}% فوز
                    </span>
                    <span className={isProfit ? 'text-[#22C55E] font-bold' : 'text-[#EF4444] font-bold'}>
                      {isProfit ? '+' : ''}${t.total_pnl}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3.1 Filters Bar: symbol / tag / date range / search */}
      <div className="p-3.5 bg-[#121A2B] rounded-xl border border-[#243049] flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-[#7B8DA8]">
          <Filter className="w-3.5 h-3.5 text-[#2DD4BF]" />
          <span>تصفية:</span>
        </div>

        {/* Symbol Filter */}
        <select
          value={filterSymbol}
          onChange={(e) => setFilterSymbol(e.target.value)}
          className="bg-[#0B1220] border border-[#243049] rounded-lg px-2.5 py-1.5 text-[#E8EEF9] focus:outline-none"
        >
          <option value="all">كافة الأزواج</option>
          {symbols.map((s) => (
            <option key={s.symbol} value={s.symbol}>
              {s.symbol}
            </option>
          ))}
        </select>

        {/* Tag Filter */}
        <select
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          className="bg-[#0B1220] border border-[#243049] rounded-lg px-2.5 py-1.5 text-[#E8EEF9] focus:outline-none"
        >
          <option value="all">كافة الوسوم</option>
          {allDistinctTags.map((t) => (
            <option key={t} value={t}>
              #{t}
            </option>
          ))}
        </select>

        {/* Date From */}
        <div className="flex items-center gap-1 bg-[#0B1220] border border-[#243049] rounded-lg px-2 py-1">
          <span className="text-[10px] text-[#7B8DA8]">من:</span>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="bg-transparent text-[#E8EEF9] text-[11px] focus:outline-none"
          />
        </div>

        {/* Date To */}
        <div className="flex items-center gap-1 bg-[#0B1220] border border-[#243049] rounded-lg px-2 py-1">
          <span className="text-[10px] text-[#7B8DA8]">إلى:</span>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="bg-transparent text-[#E8EEF9] text-[11px] focus:outline-none"
          />
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[140px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالملاحظات أو الوسوم..."
            className="w-full bg-[#0B1220] border border-[#243049] rounded-lg pr-7 pl-2.5 py-1.5 text-xs text-[#E8EEF9] placeholder-[#64748B] focus:outline-none"
          />
          <Search className="w-3.5 h-3.5 text-[#64748B] absolute right-2 top-2.5" />
        </div>

        {(filterSymbol !== 'all' ||
          filterTag !== 'all' ||
          filterDateFrom ||
          filterDateTo ||
          searchQuery) && (
          <button
            onClick={handleResetFilters}
            className="px-2.5 py-1.5 rounded-lg bg-[#1C2740] hover:bg-[#253554] text-[#A3B4D0] hover:text-white flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>إلغاء التصفية</span>
          </button>
        )}
      </div>

      {/* 3.1 & 5.2 Responsive Table / Card Container */}
      {filteredEntries.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-8 h-8 text-[#2DD4BF]" />}
          title="لم يتم العثور على صفقات تطابق شروط التصفية"
          message="جرب إلغاء بعض عوامل التصفية أو اضغط على «صفقة جديدة» لبدء تدوين صفقاتك."
          action={
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 rounded-lg bg-[#2DD4BF] text-[#042F2E] font-bold text-xs"
            >
              تسجيل صفقة جديدة
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Mobile Cards View (< 768px, Requirement 5.2) */}
          <div className="md:hidden space-y-3">
            {filteredEntries.map((t) => {
              const isWin = t.pnl >= 0;
              const emo = EMOTION_LABELS[t.emotion];

              return (
                <div
                  key={t.id}
                  className="p-4 bg-[#121A2B] rounded-xl border border-[#243049] space-y-3 shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm font-mono text-white">{t.symbol}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          t.direction === 'buy'
                            ? 'bg-emerald-500/15 text-[#22C55E]'
                            : 'bg-red-500/15 text-[#EF4444]'
                        }`}
                      >
                        {t.direction}
                      </span>
                    </div>

                    <span
                      className={`text-sm font-bold font-mono ${
                        isWin ? 'text-[#22C55E]' : 'text-[#EF4444]'
                      }`}
                    >
                      {isWin ? '+' : ''}${t.pnl.toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-[#A3B4D0] font-mono bg-[#0B1220] p-2 rounded-lg">
                    <div>
                      الدخول: <strong className="text-white">{t.entry_price}</strong>
                    </div>
                    <div>
                      الخروج: <strong className="text-white">{t.exit_price}</strong>
                    </div>
                    <div>
                      اللوت: <strong className="text-white">{t.lots}</strong>
                    </div>
                    <div>
                      التاريخ: <strong>{t.date}</strong>
                    </div>
                  </div>

                  {/* Emotion & Tags */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] border ${emo.color}`}>
                      {emo.label}
                    </span>
                    {t.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 rounded bg-[#16233B] text-[#38BDF8] text-[10px]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {t.notes && <p className="text-xs text-[#CBD5E1] leading-relaxed">{t.notes}</p>}

                  <div className="flex items-center justify-between pt-2 border-t border-[#1E283D]">
                    {t.screenshot_url ? (
                      <button
                        onClick={() => setPreviewImage(t.screenshot_url!)}
                        className="flex items-center gap-1 text-[#2DD4BF] text-[11px] hover:underline"
                      >
                        <Image className="w-3.5 h-3.5" />
                        <span>عرض الشارت</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-[#64748B]">بدون لقطة شاشة</span>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(t)}
                        className="p-1.5 rounded bg-[#1C2740] text-[#A3B4D0] hover:text-white"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteEntry(t.id, e)}
                        className="p-1.5 rounded bg-[#1C2740] text-[#A3B4D0] hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (>= 768px, Requirement 3.1) */}
          <div className="hidden md:block bg-[#121A2B] rounded-xl border border-[#243049] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-right divide-y divide-[#243049]/60">
                <thead className="bg-[#0B1220] text-[#7B8DA8] text-[11px] font-semibold">
                  <tr>
                    <th className="py-3 px-4">التاريخ</th>
                    <th className="py-3 px-4">الرمز</th>
                    <th className="py-3 px-4">الاتجاه</th>
                    <th className="py-3 px-4">الدخول / الخروج</th>
                    <th className="py-3 px-4">اللوت</th>
                    <th className="py-3 px-4">الربح / الخسارة</th>
                    <th className="py-3 px-4">الحالة النفسية</th>
                    <th className="py-3 px-4">الوسوم والملاحظات</th>
                    <th className="py-3 px-4 text-center">الشارت</th>
                    <th className="py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#243049]/40 text-xs font-mono">
                  {filteredEntries.map((t) => {
                    const isWin = t.pnl >= 0;
                    const emo = EMOTION_LABELS[t.emotion];

                    return (
                      <tr key={t.id} className="hover:bg-[#162033]/60 transition-colors">
                        <td className="py-3 px-4 text-[#A3B4D0] whitespace-nowrap">{t.date}</td>
                        <td className="py-3 px-4 font-bold text-[#E8EEF9]">{t.symbol}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              t.direction === 'buy'
                                ? 'bg-emerald-500/15 text-[#22C55E]'
                                : 'bg-red-500/15 text-[#EF4444]'
                            }`}
                          >
                            {t.direction}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#A3B4D0] whitespace-nowrap">
                          {t.entry_price} → {t.exit_price}
                        </td>
                        <td className="py-3 px-4 text-[#E8EEF9]">{t.lots}</td>
                        <td className="py-3 px-4 font-bold whitespace-nowrap">
                          <span className={isWin ? 'text-[#22C55E]' : 'text-[#EF4444]'}>
                            {isWin ? '+' : ''}${t.pnl.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] border whitespace-nowrap ${emo.color}`}
                          >
                            {emo.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans text-[#A3B4D0] max-w-xs">
                          <div className="flex flex-wrap gap-1 mb-1">
                            {t.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.2 rounded bg-[#16233B] text-[#38BDF8] text-[9px]"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                          {t.notes && (
                            <div className="text-[11px] text-[#7B8DA8] truncate" title={t.notes}>
                              {t.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {t.screenshot_url ? (
                            <button
                              onClick={() => setPreviewImage(t.screenshot_url!)}
                              title="عرض لقطة الشاشة"
                              className="p-1 rounded bg-[#1C2740] hover:bg-[#2DD4BF]/20 text-[#2DD4BF] transition-colors"
                            >
                              <Image className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[#475569]">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(t)}
                              title="تعديل الصفقة"
                              className="p-1 rounded text-[#7B8DA8] hover:text-[#2DD4BF] transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteEntry(t.id, e)}
                              title="حذف من الدفتر"
                              className="p-1 rounded text-[#7B8DA8] hover:text-[#EF4444] transition-colors"
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
          </div>
        </div>
      )}
        </>
      )}

      {/* 3.2 Add / Edit Modal Dialog */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none">
          <div className="w-full max-w-xl bg-[#0E1626] border border-[#2DD4BF]/40 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E283D]">
              <h3 className="font-bold text-sm text-[#E8EEF9]">
                {editingEntryId ? 'تعديل بيانات الصفقة' : 'تسجيل صفقة جديدة بالدفتر'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded text-[#7B8DA8] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveEntry} className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Symbol */}
                <div>
                  <label className="block text-[#A3B4D0] mb-1">الزوج</label>
                  <select
                    value={formSymbol}
                    onChange={(e) => setFormSymbol(e.target.value)}
                    className="w-full bg-[#0B1220] border border-[#243049] rounded-lg p-2 text-[#E8EEF9]"
                  >
                    {symbols.map((s) => (
                      <option key={s.symbol} value={s.symbol}>
                        {s.symbol}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Direction */}
                <div>
                  <label className="block text-[#A3B4D0] mb-1">الاتجاه</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormDirection('buy')}
                      className={`flex-1 py-2 rounded-lg font-bold text-xs cursor-pointer ${
                        formDirection === 'buy'
                          ? 'bg-[#22C55E] text-[#051329]'
                          : 'bg-[#0B1220] text-[#A3B4D0]'
                      }`}
                    >
                      شراء BUY
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormDirection('sell')}
                      className={`flex-1 py-2 rounded-lg font-bold text-xs cursor-pointer ${
                        formDirection === 'sell'
                          ? 'bg-[#EF4444] text-[#FFFFFF]'
                          : 'bg-[#0B1220] text-[#A3B4D0]'
                      }`}
                    >
                      بيع SELL
                    </button>
                  </div>
                </div>

                {/* Lots */}
                <div>
                  <label className="block text-[#A3B4D0] mb-1">حجم اللوت</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formLots}
                    onChange={(e) => setFormLots(e.target.value)}
                    className="w-full bg-[#0B1220] border border-[#243049] rounded-lg p-2 text-[#E8EEF9] font-mono"
                  />
                </div>

                {/* Entry Price */}
                <div>
                  <label className="block text-[#A3B4D0] mb-1">سعر الدخول</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formEntry}
                    onChange={(e) => setFormEntry(e.target.value)}
                    placeholder="1.08500"
                    className="w-full bg-[#0B1220] border border-[#243049] rounded-lg p-2 text-[#E8EEF9] font-mono"
                  />
                </div>

                {/* Exit Price */}
                <div>
                  <label className="block text-[#A3B4D0] mb-1">سعر الخروج</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formExit}
                    onChange={(e) => setFormExit(e.target.value)}
                    placeholder="1.08900"
                    className="w-full bg-[#0B1220] border border-[#243049] rounded-lg p-2 text-[#E8EEF9] font-mono"
                  />
                </div>

                {/* P&L */}
                <div>
                  <label className="block text-[#A3B4D0] mb-1">الربح / الخسارة ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={formPnl}
                    onChange={(e) => setFormPnl(e.target.value)}
                    placeholder="فارغ = حساب آلي"
                    className="w-full bg-[#0B1220] border border-[#243049] rounded-lg p-2 text-[#E8EEF9] font-mono"
                  />
                </div>
              </div>

              {/* Emotion Selector (3.2) */}
              <div>
                <label className="block text-[#A3B4D0] mb-1">الحالة النفسية والمشاعر أثناء الصفقة</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.keys(EMOTION_LABELS) as TradeEmotion[]).map((emoKey) => {
                    const emo = EMOTION_LABELS[emoKey];
                    const active = formEmotion === emoKey;
                    return (
                      <button
                        key={emoKey}
                        type="button"
                        onClick={() => setFormEmotion(emoKey)}
                        className={`p-2 rounded-lg border text-right transition-all flex items-center justify-between text-xs cursor-pointer ${
                          active
                            ? `${emo.color} font-bold shadow-xs`
                            : 'bg-[#0B1220] border-[#243049] text-[#7B8DA8] hover:text-[#E8EEF9]'
                        }`}
                      >
                        <span>{emo.label}</span>
                        {active && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tags Input (3.2: comma separated) */}
              <div>
                <label className="block text-[#A3B4D0] mb-1">الوسوم (مفصولة بفواصل، مثل: SMC, Breakout, Trend)</label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="SMC, London, FVG, Reversal..."
                  className="w-full bg-[#0B1220] border border-[#243049] rounded-lg p-2 text-[#E8EEF9]"
                />
              </div>

              {/* Screenshot URL (3.2) */}
              <div>
                <label className="block text-[#A3B4D0] mb-1">رابط لقطة الشاشة (Screenshot URL - اختياري)</label>
                <input
                  type="url"
                  value={formScreenshotUrl}
                  onChange={(e) => setFormScreenshotUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-[#0B1220] border border-[#243049] rounded-lg p-2 text-[#E8EEF9] font-mono text-[11px]"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[#A3B4D0] mb-1">الملاحظات والدروس المستفادة</label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="سجل أسباب الدخول، إدارة وقف الخسارة، والانفعالات النفسية..."
                  className="w-full bg-[#0B1220] border border-[#243049] rounded-lg p-2 text-[#E8EEF9] text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#1E283D]">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#141E30] hover:bg-[#1E2B44] text-[#A3B4D0] cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#2DD4BF] hover:bg-[#26bba8] text-[#042F2E] font-bold shadow-md cursor-pointer"
                >
                  {editingEntryId ? 'تحديث الصفقة' : 'حفظ بالدفتر'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Screenshot Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 select-none cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[85vh] bg-[#0E1626] rounded-xl overflow-hidden border border-[#243049]" onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} alt="شارت الصفقة" className="w-full h-auto object-contain max-h-[80vh]" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 left-3 p-1.5 rounded-lg bg-black/70 text-white hover:bg-black cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
