import React, { useState, useEffect, lazy, Suspense } from 'react';
import { LangId, DICTS, tl, fmt, setActiveLang } from './i18n/locales';
import { MarketSymbol, Candle, Timeframe, ChartType, IndicatorSettings, PriceAlertItem } from './types/market';
import { INITIAL_SYMBOLS } from './data/symbols';
import { generateCandles, updateLastCandleWithTick } from './data/candleGenerator';
import { Header, AppTab } from './components/common/Header';
import { TerminalScreen } from './components/terminal/TerminalScreen';
import { OnboardingOverlay } from './components/common/OnboardingOverlay';
import { PriceAlertNotificationBanner } from './components/common/PriceAlertNotificationBanner';
import { PriceAlertsModal } from './components/common/PriceAlertsModal';
import { GeminiChatDrawer } from './components/chat/GeminiChatDrawer';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { BottomTabBar } from './components/common/BottomTabBar';
import { WatchlistPanel } from './components/terminal/WatchlistPanel';
import { playAlertChime } from './utils/sound';
import { addAppNotification } from './components/common/NotificationsCenterModal';

// Code-splitting lazy loading for subpages to reduce initial bundle for mobile performance
const ToolsScreen = lazy(() => import('./components/tools/ToolsScreen').then(m => ({ default: m.ToolsScreen })));
const AcademyScreen = lazy(() => import('./components/academy/AcademyScreen').then(m => ({ default: m.AcademyScreen })));
const AccountScreen = lazy(() => import('./components/account/AccountScreen').then(m => ({ default: m.AccountScreen })));
const CommunityScreen = lazy(() => import('./components/community/CommunityScreen').then(m => ({ default: m.CommunityScreen })));
const SubscriptionPlansScreen = lazy(() => import('./components/pricing/SubscriptionPlansScreen').then(m => ({ default: m.SubscriptionPlansScreen })));

const ScreenFallback = () => {
  const dict = DICTS['ar'];
  return (
    <div className="h-full w-full flex items-center justify-center bg-[#050B14]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#2DD4BF] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-400 font-mono">{dict.loadingContent}</span>
      </div>
    </div>
  );
};

export default function App() {
  // Navigation & Language
  const [currentTab, setCurrentTab] = useState<AppTab>('home');
  const [currentLang, setCurrentLang] = useState<LangId>(() => {
    return (localStorage.getItem('matrix_lang') as LangId) || 'ar';
  });
  // Components outside the prop chain read the language through tl(); set it before children render.
  setActiveLang(currentLang);

  // Keep HTML document and body dir in sync with language (ar/ku = rtl, en = ltr)
  useEffect(() => {
    localStorage.setItem('matrix_lang', currentLang);
    const isRtl = currentLang === 'ar' || currentLang === 'ku';
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang === 'ar' ? 'ar' : currentLang === 'ku' ? 'ku' : 'en';
    if (typeof document !== 'undefined' && document.body) {
      document.body.dir = isRtl ? 'rtl' : 'ltr';
    }
  }, [currentLang]);

  // Market Symbols State
  const [symbols, setSymbols] = useState<MarketSymbol[]>(INITIAL_SYMBOLS);
  const [activeSymbol, setActiveSymbol] = useState<string>('EURUSD');
  const [timeframe, setTimeframe] = useState<Timeframe>('15m');
  const [chartType, setChartType] = useState<ChartType>('candles');
  const [priceFlashMap, setPriceFlashMap] = useState<Record<string, 'up' | 'down'>>({});

  // Mobile-first & PWA states (MEGA BATCH D)
  // Request to open a specific tool (e.g. the journal from the bottom bar); `at` lets the same request repeat.
  const [toolsRequest, setToolsRequest] = useState<{
    tool: 'calculator' | 'journal' | 'calendar' | 'screener' | 'alerts' | 'backtest' | 'risk' | 'analytics';
    at: number;
  } | null>(null);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredInstallPrompt) return;
    try {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredInstallPrompt(null);
      }
    } catch {
      // Ignored
    }
  };

  // Preferences
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  // Price Alerts State
  const [alerts, setAlerts] = useState<PriceAlertItem[]>(() => {
    const saved = localStorage.getItem('matrix_price_alerts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    // No demo alerts: the user creates their own.
    return [];
  });

  useEffect(() => {
    localStorage.setItem('matrix_price_alerts', JSON.stringify(alerts));
  }, [alerts]);

  // Alert Modals and Notifications
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [activeNotificationAlert, setActiveNotificationAlert] = useState<{
    alert: PriceAlertItem;
    currentPrice: number;
  } | null>(null);

  // Gemini AI Chatbot Drawer
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);

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

  // Mobile viewport detection for unmounting non-active tab elements on phones
  const [isPhone, setIsPhone] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));

  useEffect(() => {
    const handleResize = () => setIsPhone(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Generate initial candles
  useEffect(() => {
    const sym = symbols.find((s) => s.symbol === activeSymbol) || symbols[0];
    const initialCandles = generateCandles(sym.price, timeframe, 150);
    setCandles(initialCandles);
  }, [activeSymbol, timeframe]);

  // Live market price simulation ticks (4.1: pause when tab hidden)
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }
      setSymbols((prevSymbols) => {
        let hasTriggered = false;
        const flashes: Record<string, 'up' | 'down'> = {};

        const updated = prevSymbols.map((sym) => {
          const delta = (Math.random() - 0.495) * (sym.price * 0.0003);
          const newPrice = +(sym.price + delta).toFixed(sym.precision);
          const direction = delta >= 0 ? 'up' : 'down';
          flashes[sym.symbol] = direction;

          const pipScale = sym.pipScale || (sym.symbol.includes('JPY') ? 0.01 : sym.symbol.includes('XAU') ? 0.1 : 0.0001);
          const spreadPips = sym.spread > 0 && sym.spread < 100 ? sym.spread : 1.0;
          const halfSpread = (spreadPips * pipScale) / 2;
          const newBid = +(newPrice - halfSpread).toFixed(sym.precision);
          const newAsk = +(newPrice + halfSpread).toFixed(sym.precision);

          return {
            ...sym,
            price: newPrice,
            bid: newBid,
            ask: newAsk,
            change24h: +(sym.change24h + (delta / sym.price) * 100).toFixed(2),
          };
        });

        setPriceFlashMap(flashes);

        // Check alerts
        setAlerts((prevAlerts) => {
          const nextAlerts = prevAlerts.map((alert) => {
            if (!alert.active || alert.triggered) return alert;
            const sym = updated.find((s) => s.symbol === alert.symbol);
            if (!sym) return alert;

            const isTriggered =
              (alert.condition === 'above' && sym.price >= alert.targetPrice) ||
              (alert.condition === 'below' && sym.price <= alert.targetPrice);

            if (isTriggered) {
              hasTriggered = true;
              const triggeredAlert = { ...alert, triggered: true };
              setActiveNotificationAlert({
                alert: triggeredAlert,
                currentPrice: sym.price,
              });

              addAppNotification({
                type: 'price_alert',
                title: `${alert.symbol} (${alert.condition === 'above' ? '▲' : '▼'})`,
                message: alert.note || fmt(tl().mx2_priceHit, { sym: sym.symbol, price: alert.targetPrice }),
                symbol: alert.symbol,
                level: 'danger',
              });

              if (soundEnabled) {
                playAlertChime();
              }

              return triggeredAlert;
            }

            return alert;
          });

          return hasTriggered ? nextAlerts : prevAlerts;
        });

        setTimeout(() => {
          setPriceFlashMap({});
        }, 700);

        return updated;
      });
    }, 1400);

    return () => clearInterval(interval);
  }, [soundEnabled]);

  // Update active candle with latest tick
  useEffect(() => {
    const currentSym = symbols.find((s) => s.symbol === activeSymbol);
    if (!currentSym || candles.length === 0) return;

    setCandles((prevCandles) => {
      return updateLastCandleWithTick(prevCandles, currentSym.price, timeframe);
    });
  }, [symbols, activeSymbol, timeframe]);

  // Alert actions
  const handleAddAlert = (newAlert: Omit<PriceAlertItem, 'id' | 'triggered' | 'active'>) => {
    const item: PriceAlertItem = {
      ...newAlert,
      id: `alt-${Date.now()}`,
      active: true,
      triggered: false,
    };
    setAlerts((prev) => [item, ...prev]);
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleToggleAlert = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, active: !a.active, triggered: false } : a))
    );
  };

  const activeAlertsCount = alerts.filter((a) => a.active && !a.triggered).length;
  const activeSymbolObj = symbols.find((s) => s.symbol === activeSymbol) || symbols[0];

  // Market session hours
  const nowUtcHour = new Date().getUTCHours();
  const isTokyoOpen = nowUtcHour >= 0 && nowUtcHour < 9;
  const isLondonOpen = nowUtcHour >= 8 && nowUtcHour < 16;
  const isNewYorkOpen = nowUtcHour >= 13 && nowUtcHour < 21;

  return (
    <div
      dir={currentLang === 'ar' || currentLang === 'ku' ? 'rtl' : 'ltr'}
      className="flex flex-col h-screen w-screen overflow-hidden bg-[#070D18] text-[#E8EEF9]"
    >
      {/* Visual Price Alert Banner */}
      {activeNotificationAlert && (
        <PriceAlertNotificationBanner
          alert={activeNotificationAlert.alert}
          currentPrice={activeNotificationAlert.currentPrice}
          onDismiss={() => setActiveNotificationAlert(null)}
          onNavigateToChart={(sym) => {
            setActiveSymbol(sym);
            setCurrentTab('home');
          }}
        />
      )}

      {/* Unified Top Header Bar */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        currentLang={currentLang}
        onLanguageChange={setCurrentLang}
        symbols={symbols}
        activeSymbol={activeSymbol}
        onSelectSymbol={setActiveSymbol}
        activeAlertsCount={activeAlertsCount}
        onOpenAlerts={() => setIsAlertsModalOpen(true)}
        onOpenAiChat={() => setIsAiChatOpen(true)}
      />

      {/* Main View Area with Global Error Boundary (Part 5.3 & FIX D1) */}
      <main className="flex-1 overflow-hidden relative pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        <ErrorBoundary>
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
              onTabChange={setCurrentTab}
              currentTab={currentTab}
            />
          )}

          {/* 2. Watchlist Tab: Full-screen view taking 100% width and height above bottom tab bar */}
          {currentTab === 'watchlist' && (
            <>
              {/* Phone: 100% width and height full-screen watchlist */}
              <div className="md:hidden w-full h-full flex flex-col bg-[#0B1220]">
                <WatchlistPanel
                  symbols={symbols}
                  activeSymbol={activeSymbol}
                  onSelectSymbol={(sym) => {
                    setActiveSymbol(sym);
                    setCurrentTab('home');
                  }}
                  priceFlashMap={priceFlashMap}
                  isMobileMode={true}
                />
              </div>

              {/* Desktop Fallback: Standard TerminalScreen with integrated watchlist (unmounted on phones) */}
              {!isPhone && (
                <div className="hidden md:block w-full h-full">
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
                    onTabChange={setCurrentTab}
                    currentTab={currentTab}
                  />
                </div>
              )}
            </>
          )}

          <Suspense fallback={<ScreenFallback />}>
            {currentTab === 'community' && <CommunityScreen currentLang={currentLang} onNavigate={setCurrentTab} />}

            {currentTab === 'academy' && <AcademyScreen currentLang={currentLang} />}

            {currentTab === 'pricing' && <SubscriptionPlansScreen />}

            {currentTab === 'tools' && (
              <ToolsScreen
                symbols={symbols}
                activeSymbol={activeSymbol}
                onSelectSymbolForChart={(sym) => {
                  setActiveSymbol(sym);
                  setCurrentTab('home');
                }}
                alerts={alerts}
                onAddAlert={handleAddAlert}
                onDeleteAlert={handleDeleteAlert}
                onToggleAlert={handleToggleAlert}
                openRequest={toolsRequest}
                currentLang={currentLang}
              />
            )}

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
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Price Alerts Modal */}
      <PriceAlertsModal
        isOpen={isAlertsModalOpen}
        onClose={() => setIsAlertsModalOpen(false)}
        symbols={symbols}
        activeSymbol={activeSymbol}
        alerts={alerts}
        onAddAlert={handleAddAlert}
        onDeleteAlert={handleDeleteAlert}
        onToggleAlert={handleToggleAlert}
        onSelectSymbolForChart={(sym) => {
          setActiveSymbol(sym);
          setCurrentTab('home');
        }}
        currentLang={currentLang}
      />

      {/* Gemini AI Multi-turn Chat Drawer */}
      <GeminiChatDrawer
        isOpen={isAiChatOpen}
        onClose={() => setIsAiChatOpen(false)}
        activeSymbol={activeSymbolObj}
      />

      {/* Clean TradingView-grade Status Bar (hidden on phone to save space for BottomTabBar) */}
      <footer className="hidden md:flex h-6 bg-[#08101E] border-t border-[#1C283E] px-4 items-center justify-between text-[11px] font-mono text-[#64748B] select-none z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[#2DD4BF] font-semibold text-[10px]">MATRIX CLOUD: ACTIVE</span>
          </div>

          <div className="w-[1px] h-3 bg-[#1C283E]" />

          {/* Sessions status */}
          <div className="hidden sm:flex items-center gap-3 text-[10px]">
            <span className={isTokyoOpen ? 'text-emerald-400 font-medium' : 'text-[#475569]'}>
              {DICTS[currentLang]?.sessionTokyo || 'Tokyo'} {isTokyoOpen ? '● ' + (DICTS[currentLang]?.statusOpen || 'Open') : '○ ' + (DICTS[currentLang]?.statusClosed || 'Closed')}
            </span>
            <span className={isLondonOpen ? 'text-emerald-400 font-medium' : 'text-[#475569]'}>
              {DICTS[currentLang]?.sessionLondon || 'London'} {isLondonOpen ? '● ' + (DICTS[currentLang]?.statusOpen || 'Open') : '○ ' + (DICTS[currentLang]?.statusClosed || 'Closed')}
            </span>
            <span className={isNewYorkOpen ? 'text-emerald-400 font-medium' : 'text-[#475569]'}>
              {DICTS[currentLang]?.sessionNewYork || 'New York'} {isNewYorkOpen ? '● ' + (DICTS[currentLang]?.statusOpen || 'Open') : '○ ' + (DICTS[currentLang]?.statusClosed || 'Closed')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[#94A3B8]">
            {DICTS[currentLang]?.symbolLabel || 'Symbol'}: <strong className="text-white">{activeSymbol}</strong> ({timeframe})
          </span>
          <span className="text-[10px] text-amber-500/80 hidden md:inline">
            {DICTS[currentLang]?.educationalServiceNotice || 'Educational technical analysis service • Not investment advice'}
          </span>
        </div>
      </footer>

      {/* 1.1 Bottom Tab Bar on Phones (< 768px) */}
      <BottomTabBar
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
        }}
        onOpenJournal={() => {
          setToolsRequest({ tool: 'journal', at: Date.now() });
          setCurrentTab('tools');
        }}
        onOpenNotifications={() => setIsAlertsModalOpen(true)}
        activeAlertsCount={activeAlertsCount}
        deferredPrompt={deferredInstallPrompt}
        onInstallApp={handleInstallApp}
        currentLang={currentLang}
      />

      {/* Onboarding Tour (shown only once per device and never on top of modals) */}
      <OnboardingOverlay
        isOpen={showOnboarding && !isAlertsModalOpen && !isAiChatOpen && !activeNotificationAlert}
        onClose={handleCloseOnboarding}
        currentLang={currentLang}
      />
    </div>
  );
}
