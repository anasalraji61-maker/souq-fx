import React, { useState, useEffect } from 'react';
import { sentimentAPI, SentimentResponse } from '../../api/sentiment';

interface SentimentDepthPanelProps {
  symbol?: string;
}

export const SentimentDepthPanel: React.FC<SentimentDepthPanelProps> = ({
  symbol = 'EURUSD'
}) => {
  const [data, setData] = useState<SentimentResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [depthLevels, setDepthLevels] = useState<number>(8);

  useEffect(() => {
    let mounted = true;
    const loadSentiment = async () => {
      setLoading(true);
      try {
        const res = await sentimentAPI.analyze(symbol, depthLevels);
        if (mounted) setData(res);
      } catch (err) {
        console.error('Error fetching sentiment:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadSentiment();
    const interval = setInterval(loadSentiment, 12000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [symbol, depthLevels]);

  const getContrarianBadge = (bias: string) => {
    switch (bias) {
      case 'STRONG_BUY':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">شراء عكسي قوي (Contrarian Strong Buy)</span>;
      case 'BUY':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">شراء عكسي (Contrarian Buy)</span>;
      case 'STRONG_SELL':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">بيع عكسي قوي (Contrarian Strong Sell)</span>;
      case 'SELL':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-300 border border-red-500/30">بيع عكسي (Contrarian Sell)</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">توازن معنويات (Neutral)</span>;
    }
  };

  const getMoodBadge = (mood: string) => {
    switch (mood) {
      case 'EXTREME_GREED':
        return <span className="text-red-400 font-bold">طمع شديد (Extreme Greed) 🔥</span>;
      case 'GREED':
        return <span className="text-amber-400 font-bold">طمع شرائي (Greed)</span>;
      case 'EXTREME_FEAR':
        return <span className="text-emerald-400 font-bold">خوف شديد (Extreme Fear) ❄️</span>;
      case 'FEAR':
        return <span className="text-sky-400 font-bold">خوف بيعي (Fear)</span>;
      default:
        return <span className="text-slate-400 font-bold">معنويات متوازنة (Balanced)</span>;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl text-slate-100 flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 font-bold text-lg">
            👥
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide">
                محرك معنويات المتداولين وعمق دفتر الأوامر (Sentiment & Order Book Depth)
              </h2>
              <span className="text-xs px-2 py-0.5 rounded bg-pink-500/20 text-pink-400 border border-pink-500/30 font-mono">
                Task 23
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              تجميع نسب الشراء والبيع للمتداولين الأفراد (Retail Long/Short)، إشارات التداول العكسي، وعمق السيولة L2
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {data && getContrarianBadge(data.contrarian_bias)}
          <span className="text-xs px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-mono">
            {symbol}
          </span>
        </div>
      </div>

      {loading && !data && (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">جاري تجميع بيانات دفاتر الأوامر ومعنويات الأسواق...</p>
        </div>
      )}

      {data && (
        <>
          {/* Sentiment Bar and Contrarian Analysis */}
          <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400 uppercase tracking-wider">
                معنويات صغار المتداولين (Retail Client Positioning)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">حالة السوق:</span>
                {getMoodBadge(data.retail_mood)}
              </div>
            </div>

            {/* Split Bar */}
            <div className="relative w-full h-8 bg-slate-800 rounded-lg overflow-hidden flex border border-slate-700">
              <div
                style={{ width: `${data.long_percentage}%` }}
                className="h-full bg-emerald-600/80 flex items-center justify-center text-xs font-bold text-white font-mono transition-all duration-500"
              >
                شراء {data.long_percentage}%
              </div>
              <div
                style={{ width: `${data.short_percentage}%` }}
                className="h-full bg-red-600/80 flex items-center justify-center text-xs font-bold text-white font-mono transition-all duration-500"
              >
                بيع {data.short_percentage}%
              </div>
            </div>

            <div className="flex justify-between text-xs font-mono text-slate-400">
              <span className="text-emerald-400">مراكز الشراء (Longs)</span>
              <span className="text-amber-400 font-bold">مؤشر الانحراف: {data.sentiment_index > 0 ? `+${data.sentiment_index}` : data.sentiment_index}</span>
              <span className="text-red-400">مراكز البيع (Shorts)</span>
            </div>
          </div>

          {/* Depth Ladder: Level 2 Order Book */}
          <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                  عمق دفتر الأوامر المعلقة (L2 Order Book Ladder)
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">
                  نسبة الطلب/العرض: <span className="text-sky-400 font-bold">{data.bid_ask_depth_ratio}</span>
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-emerald-400">إجمالي الطلبات (Bids): {data.total_bid_depth}</span>
                <span className="text-red-400">إجمالي العروض (Asks): {data.total_ask_depth}</span>
              </div>
            </div>

            {/* Ladder Rows */}
            <div className="space-y-1.5 font-mono text-xs max-h-64 overflow-y-auto pr-1">
              <div className="grid grid-cols-4 text-slate-500 text-[11px] pb-1 border-b border-slate-800/80 font-semibold">
                <span>حجم الطلب (Bid Vol)</span>
                <span className="text-center">السعر (Price)</span>
                <span className="text-center">حجم العرض (Ask Vol)</span>
                <span className="text-right">الخلل (Imbalance)</span>
              </div>

              {data.order_book.map((lvl, idx) => {
                const maxVol = Math.max(...data.order_book.map(o => Math.max(o.bid_volume, o.ask_volume)));
                const bidPct = (lvl.bid_volume / maxVol) * 100;
                const askPct = (lvl.ask_volume / maxVol) * 100;

                return (
                  <div
                    key={idx}
                    className="grid grid-cols-4 items-center p-1.5 rounded hover:bg-slate-900 transition border border-transparent hover:border-slate-800"
                  >
                    {/* Bid Bar */}
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 bg-emerald-500/30 rounded-sm" style={{ width: `${bidPct}%` }} />
                      <span className="text-emerald-400 font-bold text-[11px]">{lvl.bid_volume}</span>
                    </div>

                    {/* Price */}
                    <div className="text-center font-bold text-slate-200">
                      {lvl.price.toFixed(4)}
                    </div>

                    {/* Ask Bar */}
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-red-400 font-bold text-[11px]">{lvl.ask_volume}</span>
                      <div className="h-3 bg-red-500/30 rounded-sm" style={{ width: `${askPct}%` }} />
                    </div>

                    {/* Imbalance */}
                    <div className={`text-right font-bold text-[11px] ${
                      lvl.imbalance_pct > 0 ? 'text-emerald-400' : lvl.imbalance_pct < 0 ? 'text-red-400' : 'text-slate-400'
                    }`}>
                      {lvl.imbalance_pct > 0 ? `+${lvl.imbalance_pct}%` : `${lvl.imbalance_pct}%`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SentimentDepthPanel;
