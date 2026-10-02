import React, { useState } from 'react';
import { MarketSymbol, PriceAlertItem } from '../../types/market';
import { Bell, Plus, Trash2, X, CheckCircle2, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface PriceAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbols: MarketSymbol[];
  activeSymbol: string;
  alerts: PriceAlertItem[];
  onAddAlert: (newAlert: Omit<PriceAlertItem, 'id' | 'triggered' | 'active'>) => void;
  onDeleteAlert: (id: string) => void;
  onToggleAlert: (id: string) => void;
  onSelectSymbolForChart: (symbol: string) => void;
}

export const PriceAlertsModal: React.FC<PriceAlertsModalProps> = ({
  isOpen,
  onClose,
  symbols,
  activeSymbol,
  alerts,
  onAddAlert,
  onDeleteAlert,
  onToggleAlert,
  onSelectSymbolForChart,
}) => {
  const [formSymbol, setFormSymbol] = useState(activeSymbol);
  const [formPrice, setFormPrice] = useState('');
  const [formCondition, setFormCondition] = useState<'above' | 'below'>('above');
  const [formNote, setFormNote] = useState('');

  if (!isOpen) return null;

  const currentSymObj = symbols.find((s) => s.symbol === formSymbol) || symbols[0];
  const [modalLimitNotice, setModalLimitNotice] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(formPrice);
    if (!price || isNaN(price)) return;

    if (alerts.length >= 50) {
      setModalLimitNotice('تم الوصول للحد الأقصى (50 تنبيهاً لكل جهاز). يُرجى حذف بعض التنبيهات لإضافة تنبيه جديد.');
      setTimeout(() => setModalLimitNotice(null), 5000);
      return;
    }
    setModalLimitNotice(null);

    onAddAlert({
      symbol: formSymbol,
      targetPrice: price,
      condition: formCondition,
      note: formNote || `تنبيه عند وصول السعر إلى ${price}`,
    });

    setFormPrice('');
    setFormNote('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
      <div className="w-full max-w-xl bg-[#0D1829] border border-[#243049] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-xs">
        {/* Modal Header */}
        <div className="p-4 bg-[#121A2B] border-b border-[#243049] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#2DD4BF]/15 text-[#2DD4BF] border border-[#2DD4BF]/30">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#E8EEF9]">إدارة تنبيهات الأسعار الفورية (Price Alerts)</h2>
              <p className="text-[11px] text-[#7B8DA8]">عيّن عتبات سعرية مستهدفة وسيصلك إشعار فوري عند وصول السعر إليها.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7B8DA8] hover:text-[#E8EEF9] hover:bg-[#162033]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {modalLimitNotice && (
            <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between">
              <span>{modalLimitNotice}</span>
              <button onClick={() => setModalLimitNotice(null)} className="text-amber-400 underline text-[11px]">
                إغلاق
              </button>
            </div>
          )}

          {/* New Alert Form */}
          <form onSubmit={handleSubmit} className="p-3.5 rounded-xl bg-[#121A2B] border border-[#243049] space-y-3">
            <div className="font-bold text-[#E8EEF9] flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-[#2DD4BF]" />
              <span>إضافة تنبيه سعر جديد</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[#A3B4D0] mb-1">الزوج أو الأداة</label>
                <select
                  value={formSymbol}
                  onChange={(e) => {
                    setFormSymbol(e.target.value);
                    const s = symbols.find((item) => item.symbol === e.target.value);
                    if (s) setFormPrice(s.price.toString());
                  }}
                  className="w-full bg-[#0B1220] border border-[#243049] rounded-lg p-1.5 text-[#E8EEF9] font-mono text-xs"
                >
                  {symbols.map((s) => (
                    <option key={s.symbol} value={s.symbol}>
                      {s.symbol} ({s.price})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#A3B4D0] mb-1">الشرط</label>
                <select
                  value={formCondition}
                  onChange={(e) => setFormCondition(e.target.value as 'above' | 'below')}
                  className="w-full bg-[#0B1220] border border-[#243049] rounded-lg p-1.5 text-[#E8EEF9] text-xs"
                >
                  <option value="above">≥ يخترق لأعلى (Above)</option>
                  <option value="below">≤ يكسر لأسفل (Below)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#A3B4D0] mb-1">السعر المستهدف</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder={currentSymObj.price.toString()}
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  className="w-full bg-[#0B1220] border border-[#243049] rounded-lg p-1.5 text-[#E8EEF9] font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="ملاحظة التنبيه (مثال: اختراق مقاومة 1.0920)..."
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                className="flex-1 bg-[#0B1220] border border-[#243049] rounded-lg p-1.5 text-[#E8EEF9] text-xs"
              />
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#2DD4BF] hover:bg-[#26bba8] text-[#042F2E] font-bold text-xs shrink-0 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>تفعيل</span>
              </button>
            </div>
          </form>

          {/* Active Alerts List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[#A3B4D0] px-1 font-medium">
              <span>التنبيهات المجدولة ({alerts.length})</span>
              <span className="text-[10px] text-[#7B8DA8]">يراقب تحركات السوق الحية تلقائياً</span>
            </div>

            {alerts.length === 0 ? (
              <div className="p-8 text-center bg-[#121A2B]/40 rounded-xl border border-[#243049] text-[#7B8DA8]">
                لا توجد تنبيهات أسعار نشطة حالياً. قم بإنشاء أول تنبيه أعلاه!
              </div>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {alerts.map((alt) => {
                  const symObj = symbols.find((s) => s.symbol === alt.symbol);
                  const isAbove = alt.condition === 'above';

                  return (
                    <div
                      key={alt.id}
                      className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                        alt.triggered
                          ? 'bg-[#121A2B]/40 border-[#243049] opacity-75'
                          : alt.active
                          ? 'bg-[#121A2B] border-[#2DD4BF]/30'
                          : 'bg-[#121A2B]/30 border-[#243049] opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => onToggleAlert(alt.id)}
                          title={alt.active ? 'تعطيل التنبيه مؤقتاً' : 'تفعيل التنبيه'}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                            alt.triggered
                              ? 'bg-slate-500/20 text-[#7B8DA8]'
                              : alt.active
                              ? 'bg-[#2DD4BF]/20 text-[#2DD4BF]'
                              : 'bg-zinc-800 text-zinc-500'
                          }`}
                        >
                          <Bell className="w-3.5 h-3.5" />
                        </button>

                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              onClick={() => {
                                onSelectSymbolForChart(alt.symbol);
                                onClose();
                              }}
                              className="font-extrabold text-[#E8EEF9] font-mono cursor-pointer hover:text-[#2DD4BF] underline decoration-dotted"
                            >
                              {alt.symbol}
                            </span>
                            <span className="font-mono text-[#A3B4D0] flex items-center gap-0.5">
                              {isAbove ? (
                                <ArrowUpRight className="w-3.5 h-3.5 text-[#22C55E]" />
                              ) : (
                                <ArrowDownRight className="w-3.5 h-3.5 text-[#EF4444]" />
                              )}
                              {isAbove ? '≥' : '≤'} {alt.targetPrice}
                            </span>
                            {alt.triggered ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#22C55E]/15 text-[#22C55E] flex items-center gap-0.5 font-bold">
                                <CheckCircle2 className="w-3 h-3" />
                                {alt.triggeredAt || 'تم التنفيذ'}
                              </span>
                            ) : alt.active ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#2DD4BF]/15 text-[#2DD4BF]">
                                جاري المراقبة (سعر الزوج: {symObj?.price})
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-zinc-800 text-zinc-400">
                                معطل
                              </span>
                            )}
                          </div>
                          {alt.note && <p className="text-[11px] text-[#7B8DA8] mt-0.5">{alt.note}</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            onSelectSymbolForChart(alt.symbol);
                            onClose();
                          }}
                          className="px-2 py-1 rounded bg-[#162033] hover:bg-[#1E293B] text-[#A3B4D0] hover:text-[#E8EEF9] text-[10px]"
                        >
                          شارت
                        </button>
                        <button
                          onClick={() => onDeleteAlert(alt.id)}
                          className="p-1 rounded text-[#7B8DA8] hover:text-[#EF4444]"
                          title="حذف التنبيه"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#121A2B] border-t border-[#243049] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#162033] hover:bg-[#1E293B] text-[#E8EEF9] font-medium"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
