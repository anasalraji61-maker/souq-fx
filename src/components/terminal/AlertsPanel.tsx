import React, { useState } from 'react';
import { PriceAlertItem, AlertCondition, MarketSymbol } from '../../types/market';
import { X, Bell, Plus, Trash2, CheckCircle2, Clock, AlertTriangle, Volume2 } from 'lucide-react';
import { tl, fmt } from '../../i18n/locales';

interface AlertsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: PriceAlertItem[];
  symbols: MarketSymbol[];
  activeSymbol: string;
  onAddAlert: (alert: PriceAlertItem) => void;
  onToggleAlert: (id: string) => void;
  onDeleteAlert: (id: string) => void;
  initialPrice?: number;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  isOpen,
  onClose,
  alerts,
  symbols,
  activeSymbol,
  onAddAlert,
  onToggleAlert,
  onDeleteAlert,
  initialPrice,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [symbol, setSymbol] = useState(activeSymbol || 'EURUSD');
  const [targetPrice, setTargetPrice] = useState<string>(
    initialPrice ? initialPrice.toString() : '1.0850'
  );
  const [condition, setCondition] = useState<AlertCondition>('crosses');
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const currentSymObj = symbols.find((s) => s.symbol === symbol) || symbols[0];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(targetPrice);
    if (isNaN(priceNum) || priceNum <= 0) return;

    const newAlert: PriceAlertItem = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      symbol,
      targetPrice: priceNum,
      condition,
      note: note.trim() || `${symbol} ${getConditionLabel(condition)} ${priceNum}`,
      active: true,
      triggered: false,
      createdAt: new Date().toISOString(),
    };

    onAddAlert(newAlert);
    setIsCreating(false);
    setNote('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none">
      <div className="w-[480px] max-w-[95vw] bg-[#0E1626] border border-[#243049] rounded-xl shadow-2xl overflow-hidden flex flex-col text-xs max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E283D] bg-[#0A101D]">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#F59E0B]" />
            <h3 className="font-bold text-sm text-[#E8EEF9]">{tl().tm_13}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#7B8DA8] hover:text-white hover:bg-[#1C2740] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 max-h-[500px]">
          {!isCreating ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#7B8DA8] uppercase tracking-wider">
                  التنبيهات المجدولة ({alerts.length})
                </span>
                <button
                  onClick={() => {
                    const curPrice = currentSymObj ? currentSymObj.price : 1.085;
                    setTargetPrice(curPrice.toString());
                    setIsCreating(true);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1C2E4A] hover:bg-[#2DD4BF] text-[#2DD4BF] hover:text-[#042F2E] font-bold text-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {tl().tm_14}
                </button>
              </div>

              {alerts.length === 0 ? (
                <div className="text-center py-10 text-[#64748B] bg-[#141E30] rounded-xl border border-[#243049]">
                  {tl().tm_15}
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                        alert.triggered
                          ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                          : alert.active
                          ? 'bg-[#141E30] border-[#243049] hover:border-[#38BDF8]/40'
                          : 'bg-[#0B1220] border-[#1E283D] opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => onToggleAlert(alert.id)}
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                            alert.active
                              ? 'bg-[#2DD4BF] border-[#2DD4BF] text-[#0B1220]'
                              : 'border-[#475569] bg-transparent'
                          }`}
                        >
                          {alert.active && '✓'}
                        </button>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#E8EEF9] font-mono">
                              {alert.symbol}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#1E293B] text-[#38BDF8] font-mono">
                              {getConditionLabel(alert.condition)} {alert.targetPrice.toFixed(4)}
                            </span>
                            {alert.triggered && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-400 font-bold animate-pulse">
                                {tl().tm_16}
                              </span>
                            )}
                          </div>
                          {alert.note && (
                            <div className="text-[11px] text-[#94A3B8] mt-0.5">{alert.note}</div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => onDeleteAlert(alert.id)}
                        className="p-1.5 rounded hover:bg-rose-500/20 text-[#64748B] hover:text-rose-400 transition-colors"
                        title={tl().tm_17}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Creation Form */
            <form onSubmit={handleCreate} className="space-y-3.5 bg-[#141E30] p-4 rounded-xl border border-[#243049]">
              <div className="flex items-center justify-between pb-2 border-b border-[#243049]">
                <span className="font-bold text-sm text-[#E8EEF9]">{tl().tm_18}</span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-[#7B8DA8] hover:text-white"
                >
                  {tl().tm_19}
                </button>
              </div>

              {/* Symbol */}
              <div>
                <label className="block text-[11px] text-[#7B8DA8] mb-1">{tl().tm_20}</label>
                <select
                  value={symbol}
                  onChange={(e) => {
                    setSymbol(e.target.value);
                    const s = symbols.find((item) => item.symbol === e.target.value);
                    if (s) setTargetPrice(s.price.toString());
                  }}
                  className="w-full px-3 py-1.5 bg-[#0B1220] border border-[#243049] rounded-lg text-xs text-[#E8EEF9] font-mono focus:outline-none focus:border-[#2DD4BF]"
                >
                  {symbols.map((s) => (
                    <option key={s.symbol} value={s.symbol}>
                      {s.symbol} ({s.name}) — {s.price.toFixed(s.precision)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Condition */}
              <div>
                <label className="block text-[11px] text-[#7B8DA8] mb-1">{tl().tm_21}</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as AlertCondition)}
                  className="w-full px-3 py-1.5 bg-[#0B1220] border border-[#243049] rounded-lg text-xs text-[#E8EEF9] focus:outline-none focus:border-[#2DD4BF]"
                >
                  <option value="crosses">{tl().tm_22}</option>
                  <option value="crosses_up">{tl().tm_23}</option>
                  <option value="crosses_down">{tl().tm_24}</option>
                  <option value="greater_than">{tl().tm_25}</option>
                  <option value="less_than">{tl().tm_26}</option>
                </select>
              </div>

              {/* Target Price */}
              <div>
                <label className="block text-[11px] text-[#7B8DA8] mb-1">{tl().tm_27}</label>
                <input
                  type="number"
                  step="any"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#0B1220] border border-[#243049] rounded-lg text-xs text-[#2DD4BF] font-mono font-bold focus:outline-none focus:border-[#2DD4BF]"
                  required
                />
              </div>

              {/* Note / Message */}
              <div>
                <label className="block text-[11px] text-[#7B8DA8] mb-1">{tl().tm_28}</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={tl().tm_29}
                  className="w-full px-3 py-1.5 bg-[#0B1220] border border-[#243049] rounded-lg text-xs text-[#E8EEF9] focus:outline-none focus:border-[#2DD4BF]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#1C2740] text-[#7B8DA8] hover:text-white text-xs transition-colors"
                >
                  {tl().tm_19}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#2DD4BF] hover:bg-[#26bba8] text-[#042F2E] font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  <Bell className="w-3.5 h-3.5" />
                  {tl().tm_30}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#1E283D] bg-[#0A101D] flex items-center justify-between text-[#64748B]">
          <span className="flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5 text-[#2DD4BF]" />
            {tl().tm_31}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#1C2E4A] hover:bg-[#243B60] text-[#2DD4BF] font-bold text-xs transition-colors"
          >
            {tl().tm_32}
          </button>
        </div>
      </div>
    </div>
  );
};

function getConditionLabel(cond: AlertCondition): string {
  switch (cond) {
    case 'crosses': return tl().tm_33;
    case 'crosses_up': return tl().tm_34;
    case 'crosses_down': return tl().tm_35;
    case 'greater_than': return tl().tm_36;
    case 'less_than': return tl().tm_37;
    default: return cond;
  }
}
