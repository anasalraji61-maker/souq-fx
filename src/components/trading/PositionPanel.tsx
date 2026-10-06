import React, { useState, useEffect, useCallback } from 'react';
import { positionsAPI, Position, AccountStats } from '../../api/positions';
import { PositionDetailModal } from './PositionDetailModal';
import { tl } from '../../i18n/locales';

interface PositionPanelProps {
  currentPrices?: Record<string, number>;
  onPositionClose?: (positionId: string) => void;
  className?: string;
}

export const PositionPanel: React.FC<PositionPanelProps> = ({
  currentPrices = {},
  onPositionClose,
  className = '',
}) => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [quickCloseModal, setQuickCloseModal] = useState<Position | null>(null);
  const [quickClosePrice, setQuickClosePrice] = useState<string>('');

  const loadPositionsAndStats = useCallback(async () => {
    try {
      const [posList, accStats] = await Promise.all([
        positionsAPI.getOpenPositions(),
        positionsAPI.getAccountStats(currentPrices),
      ]);
      setPositions(posList);
      setStats(accStats);
    } catch (err) {
      console.error('Error fetching positions/stats:', err);
    }
  }, [currentPrices]);

  useEffect(() => {
    loadPositionsAndStats();
    const interval = setInterval(loadPositionsAndStats, 4000); // 4-second refresh
    return () => clearInterval(interval);
  }, [loadPositionsAndStats]);

  const handleOpenQuickClose = (pos: Position) => {
    const cur = currentPrices[pos.symbol] || pos.avgEntryPrice;
    setQuickClosePrice(cur.toString());
    setQuickCloseModal(pos);
  };

  const handleConfirmQuickClose = async () => {
    if (!quickCloseModal || !quickClosePrice) return;
    const priceNum = parseFloat(quickClosePrice);
    if (isNaN(priceNum) || priceNum <= 0) return;

    setLoading(true);
    try {
      await positionsAPI.closePosition(quickCloseModal.id, priceNum, 'manual');
      if (onPositionClose) onPositionClose(quickCloseModal.id);
      setQuickCloseModal(null);
      setQuickClosePrice('');
      await loadPositionsAndStats();
    } catch (err) {
      console.error('Failed to close position:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalOpenPnl = positions.reduce((acc, pos) => {
    const cur = currentPrices[pos.symbol] || pos.avgEntryPrice;
    return acc + positionsAPI.calculateUnrealizedPnl(pos.side, pos.qty, pos.avgEntryPrice, cur);
  }, 0);

  return (
    <div className={`flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg ${className}`}>
      {/* Top Header & Stats Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 px-4 py-3 bg-slate-950/60">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 font-bold text-xs border border-cyan-500/20">
            📊
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              {tl().mx_openPos} ({positions.length})
            </h3>
            <span className="text-[11px] text-slate-400">Position Management & Live P&L</span>
          </div>
        </div>

        {/* Live Metrics */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 flex items-center gap-2">
            <span className="text-slate-400">{tl().tm2_309}</span>
            <span
              className={`font-bold ${
                totalOpenPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {totalOpenPnl >= 0 ? '+' : ''}${totalOpenPnl.toFixed(2)}
            </span>
          </div>

          {stats && (
            <div className="hidden sm:flex items-center gap-3 text-slate-400">
              <div>
                {tl().mx_winRate}{' '}
                <span className="text-cyan-400 font-bold">{stats.winRatePct}%</span>
              </div>
              <div className="h-3 w-px bg-slate-700" />
              <div>
                {tl().mx_profitFactor}{' '}
                <span className="text-amber-400 font-bold">{stats.profitFactor}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Positions Table */}
      <div className="overflow-x-auto min-h-[140px]">
        {positions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-500 text-xs gap-2">
            <span className="text-2xl">⚡</span>
            <span>{tl().tm2_310}</span>
            <span className="text-[10px] text-slate-600">{tl().tm2_311}</span>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <table className="hidden md:table w-full text-right text-xs">
              <thead className="bg-slate-950/40 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">{tl().tm2_287}</th>
                  <th className="py-2.5 px-3">{tl().tm2_312}</th>
                  <th className="py-2.5 px-3">{tl().tm2_313}</th>
                  <th className="py-2.5 px-3">{tl().tm2_314}</th>
                  <th className="py-2.5 px-3">{tl().tm2_315}</th>
                  <th className="py-2.5 px-3">{tl().tm2_316}</th>
                  <th className="py-2.5 px-3">{tl().tm2_317}</th>
                  <th className="py-2.5 px-3 text-center">{tl().tm2_318}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {positions.map((pos) => {
                  const cur = currentPrices[pos.symbol] || pos.avgEntryPrice;
                  const pnl = positionsAPI.calculateUnrealizedPnl(
                    pos.side,
                    pos.qty,
                    pos.avgEntryPrice,
                    cur
                  );
                  const pnlPct = positionsAPI.calculateUnrealizedPnlPct(
                    pos.side,
                    pos.qty,
                    pos.avgEntryPrice,
                    cur
                  );
                  const isProfit = pnl >= 0;

                  return (
                    <tr
                      key={pos.id}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => setSelectedPosition(pos)}
                    >
                      <td className="py-2.5 px-3 font-sans font-bold text-white flex items-center gap-1.5">
                        <span>{pos.symbol}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            pos.side === 'long'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {pos.side}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">{pos.qty}</td>
                      <td className="py-2.5 px-3 text-slate-300">{pos.avgEntryPrice.toFixed(4)}</td>
                      <td className="py-2.5 px-3 text-cyan-400 font-semibold">{cur.toFixed(4)}</td>
                      <td
                        className={`py-2.5 px-3 font-bold ${
                          isProfit ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isProfit ? '+' : ''}${pnl.toFixed(2)}
                      </td>
                      <td
                        className={`py-2.5 px-3 font-bold ${
                          isProfit ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isProfit ? '+' : ''}
                        {pnlPct.toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedPosition(pos)}
                            className="rounded bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 text-[11px] font-sans transition-colors"
                            title={tl().tm2_319}
                          >
                            {tl().tm2_320}
                          </button>
                          <button
                            onClick={() => handleOpenQuickClose(pos)}
                            className="rounded bg-rose-600/80 hover:bg-rose-500 text-white font-bold px-2.5 py-1 text-[11px] font-sans transition-colors shadow-sm"
                            title={tl().tm2_321}
                          >
                            {tl().tm2_232}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile Card View (Part 1.6: no horizontal scroll) */}
            <div className="md:hidden space-y-2 p-2">
              {positions.map((pos) => {
                const cur = currentPrices[pos.symbol] || pos.avgEntryPrice;
                const pnl = positionsAPI.calculateUnrealizedPnl(
                  pos.side,
                  pos.qty,
                  pos.avgEntryPrice,
                  cur
                );
                const pnlPct = positionsAPI.calculateUnrealizedPnlPct(
                  pos.side,
                  pos.qty,
                  pos.avgEntryPrice,
                  cur
                );
                const isProfit = pnl >= 0;

                return (
                  <div
                    key={pos.id}
                    onClick={() => setSelectedPosition(pos)}
                    className="p-3 rounded-xl bg-[#0F1829] border border-slate-800 space-y-2.5 shadow-sm active:border-cyan-500/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{pos.symbol}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            pos.side === 'long'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {pos.side}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">({pos.qty} {tl().mx_contracts})</span>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-mono font-bold text-xs ${
                            isProfit ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isProfit ? '+' : ''}${pnl.toFixed(2)} ({isProfit ? '+' : ''}{pnlPct.toFixed(2)}%)
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
                      <div>
                        <span className="text-slate-500 block text-[10px]">{tl().tm2_314}</span>
                        <span className="text-slate-200">{pos.avgEntryPrice.toFixed(4)}</span>
                      </div>
                      <div className="text-left">
                        <span className="text-slate-500 block text-[10px]">{tl().tm2_315}</span>
                        <span className="text-cyan-400 font-semibold">{cur.toFixed(4)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedPosition(pos)}
                        className="flex-1 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold text-center"
                      >
                        {tl().tm2_322}
                      </button>
                      <button
                        onClick={() => handleOpenQuickClose(pos)}
                        className="py-1.5 px-4 rounded-lg bg-rose-600/80 text-white font-bold text-xs shadow-xs"
                      >
                        {tl().tm2_232}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Quick Close Modal */}
      {quickCloseModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
          onClick={() => setQuickCloseModal(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-base font-bold text-white mb-2">
              {tl().mx_closePos} {quickCloseModal.symbol} ({quickCloseModal.side.toUpperCase()})
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              {tl().tm2_323}
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs text-slate-400 block mb-1">{tl().tm2_324}</label>
                <input
                  type="number"
                  step="0.0001"
                  value={quickClosePrice}
                  onChange={(e) => setQuickClosePrice(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleConfirmQuickClose}
                disabled={loading || !quickClosePrice}
                className="flex-1 rounded-lg bg-rose-600 hover:bg-rose-500 py-2 text-xs font-bold text-white transition-colors disabled:opacity-50"
              >
                {loading ? tl().tm2_325 : tl().tm2_326}
              </button>
              <button
                onClick={() => setQuickCloseModal(null)}
                className="rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs text-slate-300 transition-colors"
              >
                {tl().tm2_327}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Detail Modal */}
      {selectedPosition && (
        <PositionDetailModal
          position={selectedPosition}
          currentPrice={
            currentPrices[selectedPosition.symbol] || selectedPosition.avgEntryPrice
          }
          onClose={() => setSelectedPosition(null)}
          onPositionUpdated={loadPositionsAndStats}
        />
      )}
    </div>
  );
};
