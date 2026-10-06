import React, { useState } from 'react';
import { Position, positionsAPI } from '../../api/positions';
import { tl, fmt } from '../../i18n/locales';

interface PositionDetailModalProps {
  position: Position;
  currentPrice: number;
  onClose: () => void;
  onPositionUpdated: () => void;
}

export const PositionDetailModal: React.FC<PositionDetailModalProps> = ({
  position,
  currentPrice,
  onClose,
  onPositionUpdated,
}) => {
  const [closePrice, setClosePrice] = useState<string>(currentPrice.toString());
  const [closeReason, setCloseReason] = useState<string>('manual');
  const [addQty, setAddQty] = useState<number>(10);
  const [addPrice, setAddPrice] = useState<string>(currentPrice.toString());
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'pyramid' | 'close'>('details');

  const unrealizedPnl = positionsAPI.calculateUnrealizedPnl(
    position.side,
    position.qty,
    position.avgEntryPrice,
    currentPrice
  );
  const unrealizedPct = positionsAPI.calculateUnrealizedPnlPct(
    position.side,
    position.qty,
    position.avgEntryPrice,
    currentPrice
  );
  const isProfit = unrealizedPnl >= 0;

  const handleClosePosition = async () => {
    const priceNum = parseFloat(closePrice);
    if (isNaN(priceNum) || priceNum <= 0) return;

    setLoading(true);
    try {
      await positionsAPI.closePosition(position.id, priceNum, closeReason);
      onPositionUpdated();
      onClose();
    } catch (err) {
      console.error('Failed to close position', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToPosition = async () => {
    const priceNum = parseFloat(addPrice);
    if (isNaN(priceNum) || priceNum <= 0 || addQty <= 0) return;

    setLoading(true);
    try {
      await positionsAPI.addToPosition(position.id, addQty, priceNum);
      onPositionUpdated();
      onClose();
    } catch (err) {
      console.error('Failed to add to position', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span
              className={`rounded px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                position.side === 'long'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {position.side}
            </span>
            <h3 className="text-xl font-bold tracking-tight text-white">{position.symbol}</h3>
            <span className="text-xs text-slate-400 font-mono">#{position.id.slice(-8)}</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-800 mt-4 text-sm font-medium">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-3 px-4 border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tl().tm2_400}
          </button>
          <button
            onClick={() => setActiveTab('pyramid')}
            className={`pb-3 px-4 border-b-2 transition-colors ${
              activeTab === 'pyramid'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tl().mx_pyramid}
          </button>
          <button
            onClick={() => setActiveTab('close')}
            className={`pb-3 px-4 border-b-2 transition-colors ${
              activeTab === 'close'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tl().tm2_401}
          </button>
        </div>

        {/* Tab contents */}
        <div className="py-5">
          {activeTab === 'details' && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
                  <span className="text-xs text-slate-400">{tl().tm2_402}</span>
                  <div className="text-base font-semibold text-slate-200 font-mono mt-0.5">
                    {position.avgEntryPrice.toFixed(4)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
                  <span className="text-xs text-slate-400">{tl().tm2_403}</span>
                  <div className="text-base font-semibold text-cyan-400 font-mono mt-0.5">
                    {currentPrice.toFixed(4)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
                  <span className="text-xs text-slate-400">{tl().tm2_404}</span>
                  <div className="text-base font-semibold text-slate-200 font-mono mt-0.5">
                    {position.qty} {tl().mx_contracts}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
                  <span className="text-xs text-slate-400">{tl().tm2_405}</span>
                  <div className="text-xs text-slate-300 font-mono mt-1">
                    {new Date(position.openTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* Unrealized P&L Banner */}
              <div
                className={`rounded-xl border p-4 text-center ${
                  isProfit
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : 'border-rose-500/30 bg-rose-500/10'
                }`}
              >
                <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">
                  {tl().mx_floatPl}
                </div>
                <div
                  className={`text-2xl font-black font-mono ${
                    isProfit ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isProfit ? '+' : ''}${unrealizedPnl.toFixed(2)} ({isProfit ? '+' : ''}
                  {unrealizedPct.toFixed(2)}%)
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pyramid' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                {tl().mx_pyramidHelp}
              </p>
              <div className="space-y-3 text-sm">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">{tl().tm2_406}</label>
                  <input
                    type="number"
                    min="1"
                    value={addQty}
                    onChange={(e) => setAddQty(parseInt(e.target.value) || 1)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 font-mono text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">{tl().tm2_407}</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={addPrice}
                    onChange={(e) => setAddPrice(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 font-mono text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleAddToPosition}
                  disabled={loading}
                  className="w-full mt-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 transition-colors disabled:opacity-50"
                >
                  {loading ? tl().tm2_409 : fmt(tl().tm2_408, { n: addQty })}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'close' && (
            <div className="space-y-4">
              <div className="space-y-3 text-sm">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">{tl().tm2_410}</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={closePrice}
                    onChange={(e) => setClosePrice(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 font-mono text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">{tl().tm2_411}</label>
                  <select
                    value={closeReason}
                    onChange={(e) => setCloseReason(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="manual">{tl().tm2_412}</option>
                    <option value="take_profit">{tl().tm2_413}</option>
                    <option value="stop_loss">{tl().tm2_414}</option>
                    <option value="liquidation">{tl().tm2_415}</option>
                  </select>
                </div>
                <button
                  onClick={handleClosePosition}
                  disabled={loading}
                  className="w-full mt-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 transition-colors disabled:opacity-50"
                >
                  {loading ? tl().tm2_325 : tl().tm2_416}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
