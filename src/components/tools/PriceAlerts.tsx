import React, { useState, useEffect } from 'react';
import { PriceAlertItem, MarketSymbol } from '../../types/market';
import { Bell, BellRing, Plus, Trash2, CheckCircle2, Volume2 } from 'lucide-react';
import { tl, fmt } from '../../i18n/locales';

interface PriceAlertsProps {
  symbols: MarketSymbol[];
  activeSymbol: string;
  alerts?: PriceAlertItem[];
  onAddAlert?: (newAlert: Omit<PriceAlertItem, 'id' | 'triggered' | 'active'>) => void;
  onDeleteAlert?: (id: string) => void;
  onToggleAlert?: (id: string) => void;
}

export const PriceAlerts: React.FC<PriceAlertsProps> = ({
  symbols,
  activeSymbol,
  alerts: propAlerts,
  onAddAlert: propOnAddAlert,
  onDeleteAlert: propOnDeleteAlert,
  onToggleAlert: propOnToggleAlert,
}) => {
  const [localAlerts, setLocalAlerts] = useState<PriceAlertItem[]>(() => {
    const saved = localStorage.getItem('matrix_price_alerts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return [];
  });

  const alerts = propAlerts || localAlerts;

  useEffect(() => {
    if (!propAlerts) {
      localStorage.setItem('matrix_price_alerts', JSON.stringify(localAlerts));
    }
  }, [localAlerts, propAlerts]);

  const [formSymbol, setFormSymbol] = useState(activeSymbol);
  const [formPrice, setFormPrice] = useState('');
  const [formCondition, setFormCondition] = useState<'above' | 'below'>('above');
  const [formNote, setFormNote] = useState('');
  const [testBanner, setTestBanner] = useState<string | null>(null);
  const [limitNotice, setLimitNotice] = useState<string | null>(null);

  const selectedSymObj = symbols.find((s) => s.symbol === formSymbol) || symbols[0];

  const handleAddAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(formPrice);
    if (!price || isNaN(price)) return;

    if (alerts.length >= 50) {
      setLimitNotice(tl().tm2_291);
      setTimeout(() => setLimitNotice(null), 5000);
      return;
    }
    setLimitNotice(null);

    if (propOnAddAlert) {
      propOnAddAlert({
        symbol: formSymbol,
        targetPrice: price,
        condition: formCondition,
        note: formNote || fmt(tl().tm2_292, { price: price }),
      });
    } else {
      const newAlert: PriceAlertItem = {
        id: `alt-${Date.now()}`,
        symbol: formSymbol,
        targetPrice: price,
        condition: formCondition,
        note: formNote || fmt(tl().tm2_292, { price: price }),
        active: true,
        triggered: false,
      };
      setLocalAlerts([newAlert, ...localAlerts]);
    }

    setFormPrice('');
    setFormNote('');
  };

  const handleDeleteAlert = (id: string) => {
    if (propOnDeleteAlert) {
      propOnDeleteAlert(id);
    } else {
      setLocalAlerts(localAlerts.filter((a) => a.id !== id));
    }
  };

  const handleTriggerTest = () => {
    setTestBanner(fmt(tl().tm2_293, { sym: selectedSymObj.symbol, price: selectedSymObj.price }));
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
            {tl().tm2_232}
          </button>
        </div>
      )}

      {/* Limit Notice Banner */}
      {limitNotice && (
        <div className="p-3.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 font-bold flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            <span>{limitNotice}</span>
          </div>
          <button onClick={() => setLimitNotice(null)} className="text-xs text-amber-400 hover:text-white">
            {tl().tm2_232}
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
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#E8EEF9]">{tl().tm2_294}</h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${alerts.length >= 50 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-[#162033] text-[#7B8DA8] border border-[#243049]'}`}>
                {alerts.length} / 50 {tl().mx_alertCount}
              </span>
            </div>
            <p className="text-[#7B8DA8]">{tl().tm2_295}</p>
          </div>
        </div>

        <button
          onClick={handleTriggerTest}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#162033] hover:bg-[#1E293B] border border-[#243049] text-[#A3B4D0] hover:text-[#E8EEF9] transition-colors"
        >
          <Volume2 className="w-4 h-4 text-[#2DD4BF]" />
          <span>{tl().tm2_296}</span>
        </button>
      </div>

      {/* Create Alert Box */}
      <form onSubmit={handleAddAlert} className="p-5 bg-[#121A2B] rounded-xl border border-[#243049] space-y-4">
        <h3 className="font-bold text-sm text-[#E8EEF9]">{tl().tm2_297}</h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[#A3B4D0] mb-1 font-medium">{tl().tm2_298}</label>
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
                  {s.symbol} ({tl().mx_nowPrice} {s.price})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#A3B4D0] mb-1 font-medium">{tl().tm2_299}</label>
            <select
              value={formCondition}
              onChange={(e) => setFormCondition(e.target.value as 'above' | 'below')}
              className="w-full bg-[#0B1220] border border-[#243049] rounded-lg p-2 text-[#E8EEF9]"
            >
              <option value="above">{tl().tm2_300}</option>
              <option value="below">{tl().tm2_301}</option>
            </select>
          </div>

          <div>
            <label className="block text-[#A3B4D0] mb-1 font-medium">{tl().tm2_302}</label>
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
            <label className="block text-[#A3B4D0] mb-1 font-medium">{tl().tm2_303}</label>
            <input
              type="text"
              placeholder={tl().tm2_304}
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
            <span>{tl().tm2_305}</span>
          </button>
        </div>
      </form>

      {/* Alerts List */}
      <div className="bg-[#121A2B] rounded-xl border border-[#243049] overflow-hidden">
        <div className="p-4 border-b border-[#243049]">
          <h3 className="font-bold text-sm text-[#E8EEF9]">{tl().mx_schedAlerts} ({alerts.length})</h3>
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
                        {tl().tm2_306}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-[#22C55E]">
                        {tl().tm2_307}
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
              {tl().tm2_308}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
