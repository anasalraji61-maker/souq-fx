import React, { useState, useEffect, useRef } from 'react';
import { LangId, DICTS } from './i18n/locales';
import { MarketSymbol, Candle, Timeframe, ChartType, IndicatorSettings } from './types/market';
import { INITIAL_SYMBOLS } from './data/symbols';
import { generateCandles, updateLastCandleWithTick } from './data/candleGenerator';
import { Header } from './components/common/Header';
import { TerminalScreen } from './components/terminal/TerminalScreen';
import { ToolsScreen } from './components/tools/ToolsScreen';
import { AcademyScreen } from './components/academy/AcademyScreen';
import { AccountScreen } from './components/account/AccountScreen';
import { OnboardingOverlay } from './components/common/OnboardingOverlay';

export default function App() {
  // Navigation & Language
  const [currentTab, setCurrentTab] = useState<'home' | 'tools' | 'academy' | 'account'>('home');
  const [currentLang, setCurrentLang] = useState<LangId>(() => {
    return (localStorage.getItem('matrix_lang') as LangId) || 'ar';
  });

  // Keep HTML document dir in sync with language
  useEffect(() => {
    localStorage.setItem('matrix_lang', currentLang);
    const isRtl = currentLang === 'ar' || currentLang === 'ku';
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang === 'ar' ? 'ar' : currentLang === 'ku' ? 'ku' : 'en';
  }, [currentLang]);

  // Market Symbols State
  const [symbols, setSymbols] = useState<MarketSymbol[]>(INITIAL_SYMBOLS);
  const [activeSymbol, setActiveSymbol] = useState<string>('EURUSD');
  const [timeframe, setTimeframe] = useState<Timeframe>('15m');
  const [chartType, setChartType] = useState<ChartType>('candles');
  const [priceFlashMap, setPriceFlashMap] = useState<Record<string, 'up' | 'down'>>({});

  // Preferences
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  // Indicators State
  const [indicators, setIndicators] = useState<IndicatorSettings>({
    showSma20: true,
    showSma50: false,
    showSma200: false,
    showEma: false,
    emaPeriod: 9,
    showBollinger: false,
    bollingerPeriod: 20,
    bollingerStdDev: 2,
    showRsi: true,
    rsiPeriod: 14,
    showMacd: false,
    showStochastic: false,
    showSupertrend: false,
    showVolume: true,
  });

  // Candlestick history for active symbol
  const [candles, setCandles] = useState<Candle[]>([]);

  // Onboarding modal state
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    return !localStorage.getItem('matrix_onboarding_seen');
  });

  const handleCloseOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem('matrix_onboarding_seen', 'true');
  };

  // Generate candles whenever activeSymbol or timeframe changes
  useEffect(() => {
    const symObj = symbols.find((s) => s.symbol === activeSymbol) || symbols[0];
    const generated = generateCandles(symObj.price, timeframe, 160);
    setCandles(generated);
  }, [activeSymbol, timeframe]);

  // Real-time simulated price ticks
  useEffect(() => {
    const interval = setInterval(() => {
      setSymbols((prevSymbols) => {
        const nextFlash: Record<string, 'up' | 'down'> = {};

        const updated = prevSymbols.map((sym) => {
          // 40% probability of tick per interval
          if (Math.random() > 0.4) return sym;

          const isJpyOrGold = sym.price > 100;
          const isIndicesOrCrypto = sym.price > 1000;
          const stepMagnitude = isIndicesOrCrypto ? 2.5 : isJpyOrGold ? 0.04 : 0.00015;
          const delta = (Math.random() - 0.49) * stepMagnitude;
          const newPrice = Math.max(0.0001, parseFloat((sym.price + delta).toFixed(sym.precision)));
          const direction = delta >= 0 ? 'up' : 'down';
          nextFlash[sym.symbol] = direction;

          const spreadHalf = (sym.spread * sym.pipScale) / 2;
          const newBid = parseFloat((newPrice - spreadHalf).toFixed(sym.precision));
          const newAsk = parseFloat((newPrice + spreadHalf).toFixed(sym.precision));

          return {
            ...sym,
            price: newPrice,
            bid: newBid,
            ask: newAsk,
            high24h: Math.max(sym.high24h, newPrice),
            low24h: Math.min(sym.low24h, newPrice),
          };
        });

        setPriceFlashMap(nextFlash);

        // Clear flashes after animation
        setTimeout(() => {
          setPriceFlashMap({});
        }, 700);

        return updated;
      });
    }, 1400);

    return () => clearInterval(interval);
  }, []);

  // Update active candle with latest tick
  useEffect(() => {
    const currentSym = symbols.find((s) => s.symbol === activeSymbol);
    if (!currentSym || candles.length === 0) return;

    setCandles((prevCandles) => {
      return updateLastCandleWithTick(prevCandles, currentSym.price, timeframe);
    });
  }, [symbols, activeSymbol, timeframe]);

  // Determine current active market session
  const nowUtcHour = new Date().getUTCHours();
  const isTokyoOpen = nowUtcHour >= 0 && nowUtcHour < 9;
  const isLondonOpen = nowUtcHour >= 8 && nowUtcHour < 16;
  const isNewYorkOpen = nowUtcHour >= 13 && nowUtcHour < 21;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0B1220] text-[#E8EEF9]">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        currentLang={currentLang}
        onLanguageChange={setCurrentLang}
        symbols={symbols}
        activeSymbol={activeSymbol}
        onSelectSymbol={setActiveSymbol}
      />

      {/* Main View Area */}
      <main className="flex-1 overflow-hidden relative">
        {currentTab === 'home' && (
          <TerminalScreen
            symbols={symbols}
            activeSymbol={activeSymbol}
            onSelectSymbol={setActiveSymbol}
            candles={candles}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            chartType={chartType}
            onChartTypeChange={setChartType}
            indicators={indicators}
            onUpdateIndicators={setIndicators}
            priceFlashMap={priceFlashMap}
            showGrid={showGrid}
          />
        )}

        {currentTab === 'tools' && (
          <ToolsScreen
            symbols={symbols}
            activeSymbol={activeSymbol}
            onSelectSymbolForChart={(sym) => {
              setActiveSymbol(sym);
              setCurrentTab('home');
            }}
          />
        )}

        {currentTab === 'academy' && <AcademyScreen />}

        {currentTab === 'account' && (
          <AccountScreen
            currentLang={currentLang}
            onLanguageChange={setCurrentLang}
            symbols={symbols}
            defaultSymbol={activeSymbol}
            onDefaultSymbolChange={setActiveSymbol}
            defaultTimeframe={timeframe}
            onDefaultTimeframeChange={setTimeframe}
            soundEnabled={soundEnabled}
            onSoundEnabledToggle={() => setSoundEnabled(!soundEnabled)}
            showGrid={showGrid}
            onShowGridToggle={() => setShowGrid(!showGrid)}
            onRestartOnboarding={() => setShowOnboarding(true)}
          />
        )}
      </main>

      {/* Bottom Status Bar */}
      <footer className="h-6 bg-[#0E1728] border-t border-[#243049] px-4 flex items-center justify-between text-[11px] font-mono text-[#7B8DA8] select-none z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            <span className="text-[#2DD4BF] font-semibold">MATRIX FEED: LIVE</span>
          </div>

          <div className="w-[1px] h-3 bg-[#243049]" />

          {/* Market Sessions status */}
          <div className="hidden sm:flex items-center gap-3">
            <span className={isTokyoOpen ? 'text-[#22C55E]' : 'text-[#7B8DA8]'}>
              طوكيو {isTokyoOpen ? '● مفتوح' : '○ مغلق'}
            </span>
            <span className={isLondonOpen ? 'text-[#22C55E]' : 'text-[#7B8DA8]'}>
              لندن {isLondonOpen ? '● مفتوح' : '○ مغلق'}
            </span>
            <span className={isNewYorkOpen ? 'text-[#22C55E]' : 'text-[#7B8DA8]'}>
              نيويورك {isNewYorkOpen ? '● مفتوح' : '○ مغلق'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[#A3B4D0]">
            الرمز النشط: <strong className="text-[#E8EEF9]">{activeSymbol}</strong> ({timeframe})
          </span>
          <span className="text-[10px] text-[#7B8DA8]">
            أداة تحليلية فنية • غير قابلة لتنفيذ الأوامر
          </span>
        </div>
      </footer>

      {/* Welcome Onboarding Tour */}
      <OnboardingOverlay isOpen={showOnboarding} onClose={handleCloseOnboarding} />
    </div>
  );
}
