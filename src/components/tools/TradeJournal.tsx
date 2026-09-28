import React, { useState, useEffect } from 'react';
import { TradeRecord, MarketSymbol } from '../../types/market';
import { BookOpen, Plus, TrendingUp, TrendingDown, Trash2, CheckCircle2, XCircle } from 'lucide-react';

interface TradeJournalProps {
  symbols: MarketSymbol[];
}

export const TradeJournal: React.FC<TradeJournalProps> = ({ symbols }) => {
  const [trades, setTrades] = useState<TradeRecord[]>(() => {
    const saved = localStorage.getItem('matrix_trade_journal');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return [
      {
        id: 'tr-1',
        symbol: 'EURUSD',
        direction: 'buy',
        entryPrice: 1.0820,
        exitPrice: 1.0865,
        lots: 0.5,
        pnl: 225.0,
        date: '2026-09-25',
        status: 'closed',
        strategy: 'ارتداد من دعم + FVG',
        notes: 'دخول مثالي بعد سحب سيولة قاع لندن.',
      },
      {
        id: 'tr-2',
        symbol: 'XAUUSD',
        direction: 'buy',
        entryPrice: 2715.0,
        exitPrice: 2735.0,
        lots: 0.2,
        pnl: 400.0,
        date: '2026-09-26',
        status: 'closed',
        strategy: 'اختراق قمة + ترند صاعد',
        notes: 'الذهب في اتجاه صاعد قوي على فريم 4 ساعات.',
      },
      {
        id: 'tr-3',
        symbol: 'GBPUSD',
        direction: 'sell',
        entryPrice: 1.3050,
        exitPrice: 1.3090,
        lots: 0.4,
        pnl: -160.0,
        date: '2026-09-27',
        status: 'closed',
        strategy: 'كسر كاذب لمقاومة',
        notes: 'ضرب وقف الخسارة نتيجة بيانات مبيعات التجزئة البريطانية.',
      },
    ];
  });

  useEffect(() => {
    localStorage.setItem('matrix_trade_journal', JSON.stringify(trades));
  }, [trades]);

  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [formSymbol, setFormSymbol] = useState(symbols[0]?.symbol || 'EURUSD');
  const [formDirection, setFormDirection] = useState<'buy' | 'sell'>('buy');
  const [formEntry, setFormEntry] = useState('');
  const [formExit, setFormExit] = useState('');
  const [formLots, setFormLots] = useState('0.1');
  const [formPnl, setFormPnl] = useState('');
  const [formStrategy, setFormStrategy] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Performance Calculations
  const totalTrades = trades.length;
  const winningTrades = trades.filter((t) => t.pnl > 0);
  const losingTrades = trades.filter((t) => t.pnl < 0);
  const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
  const netProfit = trades.reduce((acc, t) => acc + t.pnl, 0);

  const grossProfit = winningTrades.reduce((acc, t) => acc + t.pnl, 0);
  const grossLoss = Math.abs(losingTrades.reduce((acc, t) => acc + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;

  const handleSaveTrade = (e: React.FormEvent) => {
    e.preventDefault();
    const entry = parseFloat(formEntry) || 0;
    const exit = parseFloat(formExit) || 0;
    const lots = parseFloat(formLots) || 0.1;
    let pnl = parseFloat(formPnl);

    if (isNaN(pnl)) {
      // rough auto calculation if user didn't write pnl
      const diff = formDirection === 'buy' ? exit - entry : entry - exit;
      pnl = diff * lots * 100000;
    }

    const newRecord: TradeRecord = {
      id: `tr-${Date.now()}`,
      symbol: formSymbol,
      direction: formDirection,
      entryPrice: entry,
      exitPrice: exit,
      lots,
      pnl: parseFloat(pnl.toFixed(2)),
      date: new Date().toISOString().split('T')[0],
      status: 'closed',
      strategy: formStrategy || 'استراتيجية عامة',
      notes: formNotes,
    };

    setTrades([newRecord, ...trades]);
    setIsAdding(false);
    setFormEntry('');
    setFormExit('');
    setFormPnl('');
    setFormNotes('');
    setFormStrategy('');
  };

  const handleDeleteTrade = (id: string) => {
    setTrades(trades.filter((t) => t.id !== id));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 select-none text-xs">
      {/* Title & Actions */}
      <div className="flex items-center justify-between pb-4 border-b border-[#243049]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#E8EEF9]">دفتر صفقات المتداول (Trade Journal)</h2>
            <p className="text-[#7B8DA8]">سجل صفقاتك وراقب نسبة النجاح وعائد المخاطرة لتقييم أدائك بموضوعية.</p>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2DD4BF] hover:bg-[#26bba8] text-[#042F2E] font-bold text-xs shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>صفقة جديدة</span>
        </button>
      </div>

      {/* Analytics KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-[#121A2B] rounded-xl border border-[#243049] space-y-1">
          <span className="text-[#7B8DA8] text-[11px] font-semibold">إجمالي الصفقات</span>
          <div className="text-2xl font-bold font-mono text-[#E8EEF9]">{totalTrades}</div>
        </div>

        <div className="p-4 bg-[#121A2B] rounded-xl border border-[#243049] space-y-1">
          <span className="text-[#7B8DA8] text-[11px] font-semibold">نسبة النجاح (Win Rate)</span>
          <div className={`text-2xl font-bold font-mono ${winRate >= 50 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
            {winRate.toFixed(1)}%
          </div>
        </div>

        <div className="p-4 bg-[#121A2B] rounded-xl border border-[#243049] space-y-1">
          <span className="text-[#7B8DA8] text-[11px] font-semibold">صافي الأرباح (Net P&L)</span>
          <div className={`text-2xl font-bold font-mono ${netProfit >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
            {netProfit >= 0 ? '+' : ''}${netProfit.toFixed(2)}
          </div>
        </div>

        <div className="p-4 bg-[#121A2B] rounded-xl border border-[#243049] space-y-1">
          <span className="text-[#7B8DA8] text-[11px] font-semibold">معامل الربحية (Profit Factor)</span>
          <div className="text-2xl font-bold font-mono text-[#38BDF8]">
            {profitFactor.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Add Trade Form Modal */}
      {isAdding && (
        <form onSubmit={handleSaveTrade} className="p-5 bg-[#162033] rounded-xl border border-[#2DD4BF]/40 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#E8EEF9]">تسجيل صفقة مكتملة بالدفتر</h3>
            <button type="button" onClick={() => setIsAdding(false)} className="text-[#7B8DA8] hover:text-[#E8EEF9]">
              إلغاء
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

            <div>
              <label className="block text-[#A3B4D0] mb-1">الاتجاه</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormDirection('buy')}
                  className={`flex-1 py-2 rounded-lg font-bold ${
                    formDirection === 'buy' ? 'bg-[#22C55E] text-[#051329]' : 'bg-[#0B1220] text-[#A3B4D0]'
                  }`}
                >
                  BUY
                </button>
                <button
                  type="button"
                  onClick={() => setFormDirection('sell')}
                  className={`flex-1 py-2 rounded-lg font-bold ${
                    formDirection === 'sell' ? 'bg-[#EF4444] text-[#FFFFFF]' : 'bg-[#0B1220] text-[#A3B4D0]'
                  }`}
                >
                  SELL
                </button>
              </div>
            </div>

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

            <div>
              <label className="block text-[#A3B4D0] mb-1">حجم اللوت</label>
              <input
                type="number"
                step="0.01"
                value={formLots}
                onChange={(e) => setFormLots(e.target.value)}
                className="w-full bg-[#0B1220] border border-[#243049] rounded-lg p-2 text-[#E8EEF9] font-mono"
              />
            </div>

            <div>
              <label className="block text-[#A3B4D0] mb-1">الربح أو الخسارة ($ USD)</label>
              <input
                type="number"
                step="any"
                value={formPnl}
                onChange={(e) => setFormPnl(e.target.value)}
                placeholder="مثال: 150 أو -50"
                className="w-full bg-[#0B1220] border border-[#243049] rounded-lg p-2 text-[#E8EEF9] font-mono"
              />
            </div>

            <div>
              <label className="block text-[#A3B4D0] mb-1">الاستراتيجية / النموذج</label>
              <input
                type="text"
                value={formStrategy}
                onChange={(e) => setFormStrategy(e.target.value)}
                placeholder="Order Block / ارتداد ترند..."
                className="w-full bg-[#0B1220] border border-[#243049] rounded-lg p-2 text-[#E8EEF9]"
              />
            </div>

            <div>
              <label className="block text-[#A3B4D0] mb-1">ملاحظات إضافية</label>
              <input
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="سبب الإغلاق أو الدرس..."
                className="w-full bg-[#0B1220] border border-[#243049] rounded-lg p-2 text-[#E8EEF9]"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-[#2DD4BF] hover:bg-[#26bba8] text-[#042F2E] font-bold"
            >
              حفظ الصفقة
            </button>
          </div>
        </form>
      )}

      {/* Trades Table */}
      <div className="bg-[#121A2B] rounded-xl border border-[#243049] overflow-hidden">
        <div className="p-4 border-b border-[#243049] flex items-center justify-between">
          <h3 className="font-bold text-sm text-[#E8EEF9]">سجل الصفقات المسجلة ({trades.length})</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right divide-y divide-[#243049]/60">
            <thead className="bg-[#0B1220] text-[#7B8DA8] text-[11px] font-semibold">
              <tr>
                <th className="py-2.5 px-4">التاريخ</th>
                <th className="py-2.5 px-4">الزوج</th>
                <th className="py-2.5 px-4">الاتجاه</th>
                <th className="py-2.5 px-4">الدخول / الخروج</th>
                <th className="py-2.5 px-4">اللوت</th>
                <th className="py-2.5 px-4">الربح / الخسارة</th>
                <th className="py-2.5 px-4">الاستراتيجية والملاحظات</th>
                <th className="py-2.5 px-4 text-center">حذف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#243049]/40 text-xs font-mono">
              {trades.map((t) => {
                const isWin = t.pnl >= 0;
                return (
                  <tr key={t.id} className="hover:bg-[#162033]/60 transition-colors">
                    <td className="py-3 px-4 text-[#A3B4D0]">{t.date}</td>
                    <td className="py-3 px-4 font-bold text-[#E8EEF9]">{t.symbol}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          t.direction === 'buy' ? 'bg-emerald-500/15 text-[#22C55E]' : 'bg-red-500/15 text-[#EF4444]'
                        }`}
                      >
                        {t.direction}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#A3B4D0]">
                      {t.entryPrice} → {t.exitPrice}
                    </td>
                    <td className="py-3 px-4 text-[#E8EEF9]">{t.lots}</td>
                    <td className="py-3 px-4 font-bold">
                      <span className={isWin ? 'text-[#22C55E]' : 'text-[#EF4444]'}>
                        {isWin ? '+' : ''}${t.pnl.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-[#A3B4D0]">
                      <div className="font-medium text-[#E8EEF9]">{t.strategy}</div>
                      {t.notes && <div className="text-[11px] text-[#7B8DA8]">{t.notes}</div>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDeleteTrade(t.id)}
                        className="p-1 rounded text-[#7B8DA8] hover:text-[#EF4444] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {trades.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#7B8DA8] font-sans">
                    لا توجد صفقات مسجلة بعد في الدفتر. اضغط على «صفقة جديدة» للبدء.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
