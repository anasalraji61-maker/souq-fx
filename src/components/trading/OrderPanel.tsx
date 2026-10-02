import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Target,
  ArrowRightLeft,
  Percent,
  Calculator,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Info,
} from 'lucide-react';
import {
  OrderType,
  OrderSide,
  Order,
  createOrder,
  fetchOrders,
  cancelOrder,
  calculateLocalRiskReward,
} from '../../api/orders';

interface OrderPanelProps {
  currentSymbol?: string;
  currentPrice?: number;
  onOrderExecuted?: (order: Order) => void;
}

export const OrderPanel: React.FC<OrderPanelProps> = ({
  currentSymbol = 'EUR/USD',
  currentPrice = 1.0855,
  onOrderExecuted,
}) => {
  const [orderType, setOrderType] = useState<OrderType>('limit');
  const [side, setSide] = useState<OrderSide>('buy');
  const [price, setPrice] = useState<number>(currentPrice);
  const [qty, setQty] = useState<number>(1.0);
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [trailingPct, setTrailingPct] = useState<number>(1.0);
  const [isOco, setIsOco] = useState<boolean>(false);
  const [ocoGroupName, setOcoGroupName] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'create' | 'active'>('create');

  // Sync price if market order selected or symbol changed
  useEffect(() => {
    if (orderType === 'market') {
      setPrice(currentPrice);
    }
  }, [orderType, currentPrice]);

  // Load orders list
  const loadOrders = async () => {
    const list = await fetchOrders(undefined, currentSymbol.replace('/', ''));
    setOrders(list);
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, [currentSymbol]);

  // Instant Real-Time Risk-Reward Calculation
  const slNum = parseFloat(stopLoss) || 0;
  const tpNum = parseFloat(takeProfit) || 0;
  const rrData = useMemo(() => {
    if (slNum > 0 && tpNum > 0 && price > 0) {
      return calculateLocalRiskReward(price, slNum, tpNum, side);
    }
    return null;
  }, [price, slNum, tpNum, side]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const cleanSymbol = currentSymbol.replace('/', '');
      const ocoId = isOco && ocoGroupName.trim() ? ocoGroupName.trim() : undefined;

      const created = await createOrder({
        symbol: cleanSymbol,
        side,
        order_type: orderType,
        price,
        qty,
        stop_loss: slNum > 0 ? slNum : null,
        take_profit: tpNum > 0 ? tpNum : null,
        trailing_stop_pct: orderType === 'trailing_stop' ? trailingPct : null,
        is_oco_group: ocoId,
        note: note.trim() || undefined,
      });

      setMessage({
        text: `تم وضع الأمر بنجاح (#${created.id.slice(-6)})!`,
        type: 'success',
      });
      loadOrders();
      if (onOrderExecuted) onOrderExecuted(created);

      // Auto-clear message
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({
        text: err?.message || 'تعذر إرسال الأمر، يرجى مراجعة المعطيات.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    const ok = await cancelOrder(orderId);
    if (ok) {
      loadOrders();
      setMessage({ text: 'تم إلغاء الأمر المعلق بنجاح.', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="bg-[#121722] border border-[#2a2e39] rounded-xl overflow-hidden shadow-2xl flex flex-col text-slate-200">
      {/* Header & Tabs */}
      <div className="bg-[#1a1f2c] px-4 py-3 border-b border-[#2a2e39] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-400" />
          <span className="font-bold text-sm tracking-wide">أوامر التداول المتقدمة (Task 13)</span>
          <span className="text-xs bg-[#242b3d] text-emerald-300 px-2 py-0.5 rounded font-mono">
            {currentSymbol}
          </span>
        </div>
        <div className="flex bg-[#0f131c] rounded-lg p-0.5 border border-[#2a2e39] text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`px-3 py-1 rounded-md transition-all ${
              activeTab === 'create' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            إنشاء أمر
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'active' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>الأوامر المعلقة</span>
            {orders.filter((o) => o.status === 'pending').length > 0 && (
              <span className="bg-amber-500 text-black text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                {orders.filter((o) => o.status === 'pending').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'create' ? (
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Order Side Selector (BUY / SELL) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSide('buy')}
              className={`py-2.5 rounded-lg flex items-center justify-center gap-2 font-bold text-sm transition-all border ${
                side === 'buy'
                  ? 'bg-emerald-600/90 text-white border-emerald-500 shadow-lg shadow-emerald-950/40'
                  : 'bg-[#181e2b] text-slate-400 border-[#2a2e39] hover:bg-[#1f2637]'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>شراء (BUY / LONG)</span>
            </button>
            <button
              type="button"
              onClick={() => setSide('sell')}
              className={`py-2.5 rounded-lg flex items-center justify-center gap-2 font-bold text-sm transition-all border ${
                side === 'sell'
                  ? 'bg-rose-600/90 text-white border-rose-500 shadow-lg shadow-rose-950/40'
                  : 'bg-[#181e2b] text-slate-400 border-[#2a2e39] hover:bg-[#1f2637]'
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              <span>بيع (SELL / SHORT)</span>
            </button>
          </div>

          {/* Order Types */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">نوع الأمر المتقدم:</label>
            <div className="grid grid-cols-4 gap-1.5 bg-[#0e121a] p-1 rounded-lg border border-[#262b38]">
              {(
                [
                  { id: 'market', label: 'سوق', sub: 'Market' },
                  { id: 'limit', label: 'حدّ', sub: 'Limit' },
                  { id: 'stop', label: 'وقف', sub: 'Stop' },
                  { id: 'trailing_stop', label: 'متحرك', sub: 'Trailing' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setOrderType(t.id)}
                  className={`py-1.5 px-2 rounded-md text-center transition-all ${
                    orderType === t.id
                      ? 'bg-blue-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2130]'
                  }`}
                >
                  <div className="text-xs font-bold">{t.label}</div>
                  <div className="text-[9px] opacity-70">{t.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Price & Quantity Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                {orderType === 'market' ? 'سعر السوق الحالي' : 'سعر التنفيذ المستهدف'}
              </label>
              <input
                type="number"
                step="0.00001"
                disabled={orderType === 'market'}
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className={`w-full bg-[#181e2b] border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500 transition-colors ${
                  orderType === 'market' ? 'border-[#2a2e39] opacity-60 cursor-not-allowed' : 'border-[#363d4f]'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">حجم اللوت / الكمية (Lots)</label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={qty}
                  onChange={(e) => setQty(parseFloat(e.target.value) || 0.01)}
                  className="w-full bg-[#181e2b] border border-[#363d4f] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Quick Lot Selectors */}
          <div className="flex gap-1.5">
            {[0.01, 0.05, 0.1, 0.5, 1.0, 2.0].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setQty(val)}
                className={`flex-1 py-1 rounded text-[11px] font-mono border transition-all ${
                  qty === val
                    ? 'bg-blue-600/30 border-blue-500 text-blue-300 font-bold'
                    : 'bg-[#181e2b] border-[#2a2e39] text-slate-400 hover:bg-[#202738]'
                }`}
              >
                {val}
              </button>
            ))}
          </div>

          {/* Stop Loss & Take Profit */}
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[#232938]">
            <div>
              <div className="flex items-center gap-1 text-xs text-rose-400 mb-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>وقف الخسارة (SL)</span>
              </div>
              <input
                type="number"
                step="0.00001"
                placeholder={side === 'buy' ? `< ${price}` : `> ${price}`}
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="w-full bg-[#181e2b] border border-[#3b2b35] focus:border-rose-500 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none"
              />
            </div>
            <div>
              <div className="flex items-center gap-1 text-xs text-emerald-400 mb-1">
                <Target className="w-3.5 h-3.5" />
                <span>جني الأرباح (TP)</span>
              </div>
              <input
                type="number"
                step="0.00001"
                placeholder={side === 'buy' ? `> ${price}` : `< ${price}`}
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                className="w-full bg-[#181e2b] border border-[#253b34] focus:border-emerald-500 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none"
              />
            </div>
          </div>

          {/* Trailing Stop Percentage (if trailing selected) */}
          {orderType === 'trailing_stop' && (
            <div className="bg-[#182133] border border-blue-900/40 p-3 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-300 font-bold flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5" /> نسبة الوقف المتحرك (Trailing %):
                </span>
                <span className="font-mono text-emerald-400 font-bold">{trailingPct}%</span>
              </div>
              <div className="flex gap-2">
                {[0.5, 1.0, 1.5, 2.0, 3.0].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setTrailingPct(pct)}
                    className={`flex-1 py-1 rounded text-xs font-mono border transition-all ${
                      trailingPct === pct
                        ? 'bg-blue-600 text-white font-bold border-blue-400'
                        : 'bg-[#121724] border-[#252f44] text-slate-400 hover:text-white'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* OCO Group Builder (One-Cancels-Other) */}
          <div className="bg-[#151a24] p-2.5 rounded-lg border border-[#232938]">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 font-medium">
                <input
                  type="checkbox"
                  checked={isOco}
                  onChange={(e) => setIsOco(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 w-3.5 h-3.5 bg-[#0f131c] border-[#2a2e39]"
                />
                <span className="flex items-center gap-1">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                  ربط بأمر مضاد (One-Cancels-Other — OCO)
                </span>
              </label>
              <span className="text-[10px] text-slate-500">استراتيجيات الاختراق</span>
            </div>
            {isOco && (
              <div className="mt-2 pt-2 border-t border-[#232938]">
                <input
                  type="text"
                  placeholder="اسم مجموعة OCO (مثال: oco_gold_breakout)"
                  value={ocoGroupName}
                  onChange={(e) => setOcoGroupName(e.target.value)}
                  className="w-full bg-[#10141f] border border-[#2e374d] rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            )}
          </div>

          {/* Visual Risk-Reward Calculator Widget */}
          {rrData && (
            <div
              className={`p-3 rounded-xl border text-xs space-y-2 transition-all ${
                rrData.valid
                  ? 'bg-[#142022] border-emerald-900/60 text-slate-200'
                  : 'bg-[#24171a] border-rose-900/60 text-rose-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold">
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  <span>حاسبة المخاطرة / العائد (R:R Calculator):</span>
                </div>
                {rrData.valid && (
                  <span
                    className={`font-mono font-extrabold px-2 py-0.5 rounded text-xs ${
                      (rrData.ratio || 0) >= 2.0
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : (rrData.ratio || 0) >= 1.0
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    }`}
                  >
                    نسبة {rrData.ratio_str}
                  </span>
                )}
              </div>

              {rrData.valid ? (
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-emerald-950/60">
                  <div>
                    <span className="text-[10px] text-slate-400 block">المخاطرة:</span>
                    <span className="font-mono text-rose-400 font-bold">
                      -{rrData.risk_pct}% ({rrData.risk_distance})
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">العائد المتوقع:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      +{rrData.reward_pct}% ({rrData.reward_distance})
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">نسبة التعادل:</span>
                    <span className="font-mono text-blue-300 font-bold">{rrData.breakeven_winrate}%</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[11px] text-rose-400">
                  <Info className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{rrData.error}</span>
                </div>
              )}
            </div>
          )}

          {/* Feedback Message */}
          {message && (
            <div
              className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-950/80 border border-emerald-700/60 text-emerald-200'
                  : 'bg-rose-950/80 border border-rose-700/60 text-rose-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
              side === 'buy'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50'
            }`}
          >
            {submitting ? (
              <Clock className="w-4 h-4 animate-spin" />
            ) : side === 'buy' ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>
              إرسال أمر {orderType.toUpperCase()} ({side.toUpperCase()}) — {qty} لوت
            </span>
          </button>
        </form>
      ) : (
        /* Active / Pending Orders List */
        <div className="p-4 space-y-3 max-h-[460px] overflow-y-auto">
          {orders.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              لا توجد أوامر مسجلة حالياً لهذا الزوج.
            </div>
          ) : (
            orders.map((ord) => (
              <div
                key={ord.id}
                className="bg-[#181e2b] border border-[#2a2e39] rounded-lg p-3 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono">
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                        ord.side === 'buy' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                      }`}
                    >
                      {ord.side.toUpperCase()}
                    </span>
                    <span className="font-bold text-slate-200">{ord.symbol}</span>
                    <span className="text-slate-400 text-[11px]">({ord.order_type})</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      ord.status === 'filled'
                        ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                        : ord.status === 'cancelled'
                        ? 'bg-slate-800 text-slate-400 border border-slate-700'
                        : 'bg-amber-900/60 text-amber-300 border border-amber-700/50 animate-pulse'
                    }`}
                  >
                    {ord.status === 'pending'
                      ? 'معلّق'
                      : ord.status === 'filled'
                      ? 'منفّذ'
                      : ord.status === 'cancelled'
                      ? 'ملغى'
                      : ord.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 font-mono text-slate-300 pt-1 border-t border-[#242b3d]">
                  <div>
                    <span className="text-[10px] text-slate-500 block">السعر:</span>
                    <span>{ord.price}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">الكمية:</span>
                    <span>{ord.qty}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">الوقف / الهدف:</span>
                    <span className="text-[11px]">
                      {ord.stop_loss_price || '-'} / {ord.take_profit_price || '-'}
                    </span>
                  </div>
                </div>

                {ord.is_oco_group && (
                  <div className="text-[10px] text-amber-400 font-mono bg-amber-950/30 px-2 py-0.5 rounded">
                    مجموعة OCO: {ord.is_oco_group}
                  </div>
                )}

                {ord.status === 'pending' && (
                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleCancelOrder(ord.id)}
                      className="px-2.5 py-1 rounded bg-rose-950/60 text-rose-300 hover:bg-rose-900/80 border border-rose-800/40 text-[10px] font-bold transition-all"
                    >
                      إلغاء الأمر
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
