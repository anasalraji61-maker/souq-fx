import React, { useState, useEffect } from 'react';
import { PriceAlertItem, MarketSymbol } from '../../types/market';
import { Bell, BellRing, Plus, Trash2, CheckCircle2, Volume2 } from 'lucide-react';

interface PriceAlertsProps {
  symbols: MarketSymbol[];
  activeSymbol: string;
}

export const PriceAlerts: React.FC<PriceAlertsProps> = ({ symbols, activeSymbol }) => {
  const [alerts, setAlerts] = useState<PriceAlertItem[]>(() => {
    const saved = localStorage.getItem('matrix_price_alerts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return [
      {
        id: 'alt-1',
        symbol: 'EURUSD',
        targetPrice: 1.0900,
        condition: 'above',
        note: 'اختراق المقاومة اليومية 1.0900',
        active: true,
        triggered: false,
      },
      {
        id: 'alt-2',
        symbol: 'XAUUSD',
        targetPrice: 2750.0,
        condition: 'above',
        note: 'قمة تاريخية جديدة للذهب',
        active: true,
        triggered: false,
      },
      {
        id: 'alt-3',
        symbol: 'USDJPY',
        targetPrice: 151.50,
        condition: 'below',
        note: 'كسر مستوى الدعم النفسي',
        active: false,
        triggered: true,
        triggeredAt: 'اليوم 10:14 GMT',
      },
    ];
  });

  useEffect(() => {
    localStorage.setItem('matrix_price_alerts', JSON.stringify(alerts));
  }, [alerts]);

  const [formSymbol, setFormSymbol] = useState(activeSymbol);
  const [formPrice, setFormPrice] = useState('');
  const [formCondition, setFormCondition] = useState<'above' | 'below'>('above');
  const [formNote, setFormNote] = useState('');
  const [testBanner, setTestBanner] = useState<string | null>(null);

  const selectedSymObj = symbols.find((s) => s.symbol === formSymbol) || symbols[0];

  const handleAddAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(formPrice);
    if (!price || isNaN(price)) return;

    const newAlert: PriceAlertItem = {
      id: `alt-${Date.now()}`,
      symbol: formSymbol,
      targetPrice: price,
      condition: formCondition,
      note: formNote || `تنبيه عند وصول السعر إلى ${price}`,
      active: true,
      triggered: false,
    };

    setAlerts([newAlert, ...alerts]);
    setFormPrice('');
    setFormNote('');
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(alerts.filter((a) => a.id !== id));
  };

  const handleTriggerTest = () => {
    setTestBanner(`🔔 تنبيه فوري: ${selectedSymObj.symbol} وصل إلى السعر المستهدف ${selectedSymObj.price}!`);
    setTimeout(() => {
      setTestBanner(null);
    }, 4500);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 select-none text-xs">
      {/* Test Banner */}
      {testBanner && (
        <div className="p-3.5 rounded-xl bg-[#2DD4BF] text-[#042F2E] font-bold flex items-center justify-between shadow-lg animate-bounce">
          <div className="flex items-center gap-2">
            <BellRing className="w-5 h-5" />
            <span>{testBanner}</span>
          </div>
          <button onClick={() => setTestBanner(null)} className="text-sm underline">
            إغلاق
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#243049]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#E8EEF9]">تنبيهات الأسعار (Price Alerts)</h2>
            <p className="text-[#7B8DA8]">عيّن تنبيهات فورية عند وصول الأسعار إلى مستويات الدعم والمقاومة المستهدفة.</p>
          </div>
        </div>

        <button
          onClick={handleTriggerTest}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#162033] hover:bg-[#1E293B] border border-[#243049] text-[#A3B4D0] hover:text-[#E8EEF9] transition-colors"
        >
          <Volume2 className="w-4 h-4 text-[#2DD4BF]" />
          <span>اختبار صوت التنبيه</span>
        </button>
      </div>

      {/* Create Alert Box */}
      <form onSubmit={handleAddAlert} className="p-5 bg-[#121A2B] rounded-xl border border-[#243049] space-y-4">
        <h3 className="font-bold text-sm text-[#E8EEF9]">إنشاء تنبيه سعر جديد</h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[#A3B4D0] mb-1 font-medium">الزوج</label>
            <select
              value={formSymbol}
              onChange={(e) => {
                setFormSymbol(e.target.value);
                const sym = symbols.find((s) => s.symbol === e.target.value);
                if (sym) setFormPrice(sym.price.toString());
              }}
              className="w-full bg-[#0B1220] border border-[#243049] rounded-lg p-2 text-[#E8EEF9] font-mono"
            >
              {symbols.map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.symbol} (حالياً: {s.price})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#A3B4D0] mb-1 font-medium">الشرط</label>
            <select
              value={formCondition}
              onChange={(e) => setFormCondition(e.target.value as 'above' | 'below')}
              className="w-full bg-[#0B1220] border border-[#243049] rounded-lg p-2 text-[#E8EEF9]"
            >
              <option value="above">يخترق لأعلى من السعر (Above)</option>
              <option value="below">يكسر لأسفل من السعر (Below)</option>
            </select>
          </div>

          <div>
            <label className="block text-[#A3B4D0] mb-1 font-medium">السعر المستهدف</label>
            <input
              type="number"
              step="any"
              required
              placeholder={selectedSymObj.price.toString()}
              value={formPrice}
              onChange={(e) => setFormPrice(e.target.value)}
              className="w-full bg-[#0B1220] border border-[#243049] rounded-lg p-2 text-[#E8EEF9] font-mono"
            />
          </div>

          <div>
            <label className="block text-[#A3B4D0] mb-1 font-medium">ملاحظة التنبيه</label>
            <input
              type="text"
              placeholder="مثال: كسر ترند هابط..."
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              className="w-full bg-[#0B1220] border border-[#243049] rounded-lg p-2 text-[#E8EEF9]"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#2DD4BF] hover:bg-[#26bba8] text-[#042F2E] font-bold"
          >
            <Plus className="w-4 h-4" />
            <span>تفعيل التنبيه</span>
          </button>
        </div>
      </form>

      {/* Alerts List */}
      <div className="bg-[#121A2B] rounded-xl border border-[#243049] overflow-hidden">
        <div className="p-4 border-b border-[#243049]">
          <h3 className="font-bold text-sm text-[#E8EEF9]">قائمة التنبيهات المجدولة ({alerts.length})</h3>
        </div>

        <div className="divide-y divide-[#243049]/50">
          {alerts.map((alt) => (
            <div key={alt.id} className="p-4 flex items-center justify-between hover:bg-[#162033]/50 transition-colors">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    alt.triggered ? 'bg-[#7B8DA8]/20 text-[#7B8DA8]' : 'bg-[#2DD4BF]/20 text-[#2DD4BF]'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#E8EEF9] text-sm">{alt.symbol}</span>
                    <span className="font-mono text-[#A3B4D0]">
                      {alt.condition === 'above' ? '≥' : '≤'} {alt.targetPrice}
                    </span>
                    {alt.triggered ? (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-500/20 text-[#7B8DA8] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        نُفّذ
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-[#22C55E]">
                        يراقب السعر
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#7B8DA8] mt-0.5">{alt.note}</div>
                </div>
              </div>

              <button
                onClick={() => handleDeleteAlert(alt.id)}
                className="p-1.5 rounded text-[#7B8DA8] hover:text-[#EF4444] hover:bg-[#1C2740] transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {alerts.length === 0 && (
            <div className="p-8 text-center text-[#7B8DA8]">
              لا توجد تنبيهات أسعار نشطة حالياً.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
