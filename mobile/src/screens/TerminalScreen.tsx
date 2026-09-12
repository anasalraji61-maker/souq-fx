import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  StatusBar,
  Pressable,
  RefreshControl,
  Platform,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radii } from '../theme';
import { api, type ChartSeries } from '../api';
import { mockSeries } from '../mock';
import { ChartFrame } from '../components/ChartFrame';
import {
  FrameSizedGrid,
  type FrameLayoutCount,
  type FrameLayoutShape,
} from '../components/FrameSizedGrid';
import { FocusChartModal } from '../components/FocusChartModal';
import { WatchlistPanel } from '../components/WatchlistPanel';
import { MatrixBottomDock, type DockTabId } from '../components/MatrixBottomDock';
import { QuadChartModal } from '../components/QuadChartModal';
import {
  LeftDrawRail,
  RightPanelRail,
  type MatrixLensId,
} from '../components/MatrixEdgeRails';
import { MatrixSidePanel, type EdgePanelId } from '../components/MatrixSidePanel';
import { TimeframeBar } from '../components/TimeframeBar';
import { useMultiLiveTicks } from '../hooks/useMultiLiveTicks';
import { WATCHLIST } from '../chart/watchlist';
import { ensureWatchlistLoaded, subscribeWatchlist } from '../chart/watchlistStore';
import { DEFAULT_LAYOUT } from '../chart/layoutStore';
import { formatPrice } from '../chart/math';
import { MatrixChart, type SyncTimeWindow } from '../chart/MatrixChart';
import { livePriceForChart } from '../chart/liveSeries';
import { provenanceLabel, tickStatusLabel, normalizeProvenance } from '../chart/dataSource';
import { useTickFreshnessClock } from '../hooks/useTickFreshnessClock';
import {
  DEFAULT_PAN_SPEED,
  clampPanSpeed,
  loadPanSpeed,
  savePanSpeed,
  type PanSpeedPercent,
} from '../chart/panSpeed';
import { PanSpeedSlider, CruiseSpeedMark } from '../components/PanSpeedSlider';
import { SymbolPairMenu } from '../components/SymbolPairMenu';
import {
  CHART_KINDS,
  type ChartKind,
  type DrawTool,
  type IndicatorId,
} from '../chart/types';
import {
  DEFAULT_FRAME_TIMEFRAMES,
  TIMEFRAMES,
  isTimeframe,
  shadowBarsNeeded,
  type Timeframe,
} from '../timeframes';

const PREFS_KEY = 'matrix.frameTimeframes.v1';
const SYMBOLS_KEY = 'matrix.frameSymbols.v1';
const LAYOUT_COUNT_KEY = 'matrix.home.layoutCount.v1';
const LAYOUT_SHAPE_KEY = 'matrix.home.layoutShape.v1';
const TIME_SYNC_KEY = 'matrix.home.timeSync.v1';
const DXY_TF_KEY = 'matrix.home.dxyTf.v1';
const DXY_SYMBOL_KEY = 'matrix.home.dxySymbol.v1';
const SHADOW_SECONDARY_KEY = 'matrix.home.shadowSlots.v2';
const SHADOW_ENABLED_KEY = 'matrix.home.shadowEnabled.v1';
const SHADOW_SLOT_LABELS = ['صغير s', 'وسط m', 'كبير b'] as const;
const SHADOW_SLOT_TAGS = ['s', 'm', 'b'] as const;
type ShadowSlots = [Timeframe, Timeframe, Timeframe];
type ShadowEnabled = [boolean, boolean, boolean];
const DEFAULT_SHADOW_SLOTS: ShadowSlots = ['5m', '30m', '1H'];
const DEFAULT_SHADOW_ENABLED: ShadowEnabled = [true, true, true];

const BASES: Record<string, number> = {
  DXY: 104.25,
  EURUSD: 1.0854,
  GBPUSD: 1.2732,
  USDJPY: 157.42,
  AUDUSD: 0.662,
  USDCAD: 1.364,
  NZDUSD: 0.601,
  USDCHF: 0.884,
  EURJPY: 162.15,
  GBPJPY: 200.4,
  EURGBP: 0.852,
  AUDJPY: 104.2,
  EURAUD: 1.64,
  EURCHF: 0.96,
  CADJPY: 115.3,
  XAUUSD: 2348.6,
  XAGUSD: 28.4,
  USOIL: 78.35,
  UKOIL: 82.1,
  BTCUSD: 67420,
  ETHUSD: 3450,
};

function offlineFrame(symbol: string, tf: Timeframe): ChartSeries {
  return mockSeries(symbol, BASES[symbol] ?? 1, tf, 120);
}

export function TerminalScreen() {
  const { width, height } = useWindowDimensions();
  const phone = width < 700;
  const narrowWatch = width < 1100;
  const desktopChartHeight = Math.max(320, Math.min(720, height - 330));

  const [dxy, setDxy] = useState<ChartSeries>(() => mockSeries('DXY', 104.25, '15m', 120));
  const [frames, setFrames] = useState<ChartSeries[]>(() =>
    DEFAULT_LAYOUT.frameSymbols.map((s, i) =>
      offlineFrame(s, DEFAULT_FRAME_TIMEFRAMES[i])
    )
  );
  const [frameSymbols, setFrameSymbols] = useState<[string, string, string]>(
    DEFAULT_LAYOUT.frameSymbols
  );
  const [frameTfs, setFrameTfs] = useState<Timeframe[]>([...DEFAULT_FRAME_TIMEFRAMES]);
  const [dxyTf, setDxyTf] = useState<Timeframe>('15m');
  const [heroSymbol, setHeroSymbol] = useState('DXY');
  const [prefsReady, setPrefsReady] = useState(false);

  const [symbol, setSymbol] = useState('EURUSD');
  const [tf, setTf] = useState<Timeframe>('15m');
  const [series, setSeries] = useState<ChartSeries | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline] = useState(false);

  const [lens, setLens] = useState<MatrixLensId>('clean');
  const [tool, setTool] = useState<DrawTool>('none');
  const [kind, setKind] = useState<ChartKind>('candles');
  const [indicators, setIndicators] = useState<IndicatorId[]>([]);
  const [edgePanel, setEdgePanel] = useState<EdgePanelId>(null);
  const [dockTab, setDockTab] = useState<DockTabId>(null);
  const [quadOpen, setQuadOpen] = useState(false);
  const [showKinds, setShowKinds] = useState(false);
  const [phoneWatchOpen, setPhoneWatchOpen] = useState(false);
  const [phoneWatchSymbols, setPhoneWatchSymbols] = useState<string[] | null>(null);
  const [layoutCount, setLayoutCount] = useState<FrameLayoutCount>(1);
  const [layoutShape, setLayoutShape] = useState<FrameLayoutShape>('square');
  const [timeSyncEnabled, setTimeSyncEnabled] = useState(false);
  const [syncLeaderId, setSyncLeaderId] = useState<string>('DXY');
  const [syncWindow, setSyncWindow] = useState<SyncTimeWindow | null>(null);
  const [frameOrder, setFrameOrder] = useState<string[]>(['DXY', 'pair-0', 'pair-1', 'pair-2']);
  const [panSpeed, setPanSpeed] = useState<PanSpeedPercent>(DEFAULT_PAN_SPEED);
  const [shadowSlots, setShadowSlots] = useState<ShadowSlots>([...DEFAULT_SHADOW_SLOTS]);
  const [shadowEnabled, setShadowEnabled] = useState<ShadowEnabled>([
    ...DEFAULT_SHADOW_ENABLED,
  ]);
  const [shadowSeries, setShadowSeries] = useState<ChartSeries[]>([]);
  const shadowSeriesRef = useRef<ChartSeries[]>([]);
  shadowSeriesRef.current = shadowSeries;
  const shadowLoadGen = useRef(0);
  const [focus, setFocus] = useState<{
    symbol: string;
    tf: Timeframe;
    tool?: DrawTool;
    kind?: ChartKind;
    indicators?: IndicatorId[];
  } | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeWatchlist(setPhoneWatchSymbols);
    void ensureWatchlistLoaded().catch(() => undefined);
    return unsubscribe;
  }, []);

  const watchSymbols = useMemo(
    () => ['DXY', ...frameSymbols, ...WATCHLIST.map((w) => w.symbol)],
    [frameSymbols]
  );
  const liveTicks = useMultiLiveTicks(watchSymbols, true);

  const openFocus = (
    sym: string,
    timeframe: Timeframe = tf,
    opts?: { tool?: DrawTool; kind?: ChartKind; indicators?: IndicatorId[] }
  ) => {
    setSymbol(sym);
    setTf(timeframe);
    setFocus({
      symbol: sym,
      tf: timeframe,
      tool: opts?.tool,
      kind: opts?.kind ?? kind,
      indicators: opts?.indicators ?? (indicators.length ? indicators : undefined),
    });
  };

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PREFS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as string[];
          if (Array.isArray(parsed) && parsed.length === 3 && parsed.every(isTimeframe)) {
            setFrameTfs(parsed);
          }
        }
        const symRaw = await AsyncStorage.getItem(SYMBOLS_KEY);
        if (symRaw) {
          const syms = JSON.parse(symRaw) as string[];
          if (Array.isArray(syms) && syms.length === 3) {
            setFrameSymbols([syms[0], syms[1], syms[2]]);
          }
        }
        const layoutRaw = await AsyncStorage.getItem(LAYOUT_COUNT_KEY);
        const parsedLayout = Number(layoutRaw);
        if ([1, 2, 3, 4].includes(parsedLayout)) {
          setLayoutCount(parsedLayout as FrameLayoutCount);
        }
        const shapeRaw = await AsyncStorage.getItem(LAYOUT_SHAPE_KEY);
        if (shapeRaw === 'square' || shapeRaw === 'rect' || shapeRaw === 'shadow') {
          setLayoutShape(shapeRaw);
          if (shapeRaw === 'shadow') setLayoutCount(1);
        }
        const syncRaw = await AsyncStorage.getItem(TIME_SYNC_KEY);
        if (syncRaw === '1' || syncRaw === 'true') {
          setTimeSyncEnabled(true);
        }
        const orderRaw = await AsyncStorage.getItem('matrix.home.frames.order.v1');
        if (orderRaw) {
          const parsed = JSON.parse(orderRaw) as unknown;
          if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
            setFrameOrder(parsed as string[]);
          }
        }
        const dxyTfRaw = await AsyncStorage.getItem(DXY_TF_KEY);
        if (dxyTfRaw && isTimeframe(dxyTfRaw)) {
          setDxyTf(dxyTfRaw);
        }
        const heroRaw = await AsyncStorage.getItem(DXY_SYMBOL_KEY);
        if (heroRaw && typeof heroRaw === 'string') {
          setHeroSymbol(heroRaw.toUpperCase());
        }
        const shadowRaw = await AsyncStorage.getItem(SHADOW_SECONDARY_KEY);
        if (shadowRaw) {
          const parsed = JSON.parse(shadowRaw) as string[];
          if (Array.isArray(parsed) && parsed.length >= 3 && parsed.every(isTimeframe)) {
            setShadowSlots([parsed[0], parsed[1], parsed[2]]);
          }
        }
        const enabledRaw = await AsyncStorage.getItem(SHADOW_ENABLED_KEY);
        if (enabledRaw) {
          const parsed = JSON.parse(enabledRaw) as unknown[];
          if (
            Array.isArray(parsed) &&
            parsed.length >= 3 &&
            parsed.every((x) => typeof x === 'boolean')
          ) {
            setShadowEnabled([Boolean(parsed[0]), Boolean(parsed[1]), Boolean(parsed[2])]);
          }
        }
        const speed = await loadPanSpeed();
        setPanSpeed(clampPanSpeed(speed));
      } catch {
        /* defaults */
      } finally {
        setPrefsReady(true);
      }
    })();
  }, []);

  const persistTfs = useCallback(async (next: Timeframe[]) => {
    setFrameTfs(next);
    try {
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const persistDxyTf = useCallback(async (next: Timeframe) => {
    setDxyTf(next);
    try {
      await AsyncStorage.setItem(DXY_TF_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const persistFrameSymbols = useCallback(async (next: [string, string, string]) => {
    setFrameSymbols(next);
    try {
      await AsyncStorage.setItem(SYMBOLS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const changeFrameSymbol = useCallback(
    async (index: number, nextSym: string) => {
      if (frameSymbols[index] === nextSym) return;
      const next: [string, string, string] = [...frameSymbols];
      next[index] = nextSym;
      await persistFrameSymbols(next);
      pickSymbol(nextSym, frameTfs[index]);
      try {
        const s = await api.chart(nextSym, frameTfs[index]);
        setFrames((prev) => {
          const copy = [...prev];
          copy[index] = s;
          return copy;
        });
        setOnline(true);
      } catch {
        setFrames((prev) => {
          const copy = [...prev];
          copy[index] = offlineFrame(nextSym, frameTfs[index]);
          return copy;
        });
      }
    },
    [frameSymbols, frameTfs, persistFrameSymbols]
  );

  const changeHeroSymbol = useCallback(
    async (nextSym: string) => {
      setHeroSymbol(nextSym);
      pickSymbol(nextSym, dxyTf);
      try {
        await AsyncStorage.setItem(DXY_SYMBOL_KEY, nextSym);
      } catch {
        /* ignore */
      }
      try {
        const s = await api.chart(nextSym, dxyTf);
        setDxy(s);
        setOnline(true);
      } catch {
        setDxy(offlineFrame(nextSym, dxyTf));
      }
    },
    [dxyTf]
  );

  const changeLayout = useCallback(
    async (next: FrameLayoutCount, shape: FrameLayoutShape) => {
      const count: FrameLayoutCount = shape === 'shadow' ? 1 : next;
      const nextShape: FrameLayoutShape =
        shape === 'shadow' ? 'shadow' : count === 1 ? 'square' : shape;
      setLayoutCount(count);
      setLayoutShape(nextShape);
      if (nextShape === 'shadow' || count <= 1) {
        setTimeSyncEnabled(false);
        setSyncWindow(null);
      }
      try {
        await AsyncStorage.setItem(LAYOUT_COUNT_KEY, String(count));
        await AsyncStorage.setItem(LAYOUT_SHAPE_KEY, nextShape);
        if (nextShape === 'shadow' || count <= 1) {
          await AsyncStorage.setItem(TIME_SYNC_KEY, '0');
        }
      } catch {
        /* keep in-memory choice */
      }
    },
    []
  );

  const multiCharts =
    !phone && layoutShape !== 'shadow' && layoutCount > 1;
  const timeSyncActive = timeSyncEnabled && multiCharts;

  const visibleFrameIds = useMemo(() => {
    const known = new Set(['DXY', 'pair-0', 'pair-1', 'pair-2']);
    const ordered = frameOrder.filter((id) => known.has(id));
    for (const id of ['DXY', 'pair-0', 'pair-1', 'pair-2']) {
      if (!ordered.includes(id)) ordered.push(id);
    }
    return ordered.slice(0, Math.max(1, layoutCount));
  }, [frameOrder, layoutCount]);

  useEffect(() => {
    if (!timeSyncActive) return;
    if (!visibleFrameIds.includes(syncLeaderId)) {
      setSyncLeaderId(visibleFrameIds[0] ?? 'DXY');
    }
  }, [timeSyncActive, visibleFrameIds, syncLeaderId]);

  const toggleTimeSync = useCallback(async () => {
    if (!multiCharts) return;
    setTimeSyncEnabled((prev) => {
      const next = !prev;
      if (!next) {
        setSyncWindow(null);
      } else {
        const leader = visibleFrameIds[0] ?? 'DXY';
        setSyncLeaderId(leader);
        setSyncWindow(null);
      }
      void AsyncStorage.setItem(TIME_SYNC_KEY, next ? '1' : '0');
      return next;
    });
  }, [multiCharts, visibleFrameIds]);

  const stripSyncPrice = useCallback((win: SyncTimeWindow): SyncTimeWindow => {
    const next: SyncTimeWindow = {
      start: win.start,
      end: win.end,
      xPanNorm: win.xPanNorm ?? 0,
    };
    return next;
  }, []);

  const timeSyncActiveRef = useRef(timeSyncActive);
  timeSyncActiveRef.current = timeSyncActive;

  const handleSyncFromFrame = useCallback(
    (frameId: string, win: SyncTimeWindow) => {
      if (!timeSyncActiveRef.current) return;
      setSyncLeaderId(frameId);
      setSyncWindow(stripSyncPrice(win));
    },
    [stripSyncPrice]
  );

  /** callbacks ثابتة الهوية — تجنّب حلقة: نشر → render → دالة جديدة → تصفير مفتاح → إعادة نشر */
  const syncPublishByFrame = useMemo(() => {
    const ids = ['DXY', 'pair-0', 'pair-1', 'pair-2'] as const;
    const map: Record<string, (win: SyncTimeWindow) => void> = {};
    for (const id of ids) {
      map[id] = (win) => handleSyncFromFrame(id, win);
    }
    return map;
  }, [handleSyncFromFrame]);

  const syncActivateByFrame = useMemo(() => {
    const ids = ['DXY', 'pair-0', 'pair-1', 'pair-2'] as const;
    const map: Record<string, () => void> = {};
    for (const id of ids) {
      map[id] = () => setSyncLeaderId(id);
    }
    return map;
  }, []);

  const syncPropsFor = useCallback(
    (frameId: string) => {
      if (!timeSyncActive) {
        return {
          syncWindow: null as SyncTimeWindow | null,
          onSyncWindow: undefined as ((w: SyncTimeWindow) => void) | undefined,
          syncFollow: false,
          onSyncActivate: undefined as (() => void) | undefined,
          syncBadge: null as 'leader' | 'follow' | 'partial' | null,
        };
      }
      const isLeader = syncLeaderId === frameId;
      return {
        syncWindow,
        onSyncWindow: isLeader ? syncPublishByFrame[frameId] : undefined,
        syncFollow: !isLeader,
        onSyncActivate: syncActivateByFrame[frameId],
        syncBadge: (isLeader ? 'leader' : 'follow') as 'leader' | 'follow',
      };
    },
    [timeSyncActive, syncLeaderId, syncWindow, syncPublishByFrame, syncActivateByFrame]
  );

  const changePanSpeed = useCallback(async (next: PanSpeedPercent) => {
    const clamped = clampPanSpeed(next);
    setPanSpeed(clamped);
    await savePanSpeed(clamped);
  }, []);

  const persistShadowSlots = useCallback(async (next: ShadowSlots) => {
    setShadowSlots(next);
    try {
      await AsyncStorage.setItem(SHADOW_SECONDARY_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const persistShadowEnabled = useCallback(async (next: ShadowEnabled) => {
    setShadowEnabled(next);
    try {
      await AsyncStorage.setItem(SHADOW_ENABLED_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const setShadowSlot = useCallback(
    (index: 0 | 1 | 2, nextTf: Timeframe) => {
      if (nextTf === tf) return;
      const next: ShadowSlots = [...shadowSlots];
      next[index] = nextTf;
      void persistShadowSlots(next);
    },
    [tf, shadowSlots, persistShadowSlots]
  );

  const toggleShadowSlot = useCallback(
    (index: 0 | 1 | 2) => {
      const next: ShadowEnabled = [...shadowEnabled];
      next[index] = !next[index];
      void persistShadowEnabled(next);
    },
    [shadowEnabled, persistShadowEnabled]
  );

  const loadTerminal = useCallback(
    async (tfs: Timeframe[], dxyTimeframe: Timeframe = '15m') => {
      try {
        const [heroSeries, a, b, c] = await Promise.all([
          api.chart(heroSymbol, dxyTimeframe),
          api.chart(frameSymbols[0], tfs[0]),
          api.chart(frameSymbols[1], tfs[1]),
          api.chart(frameSymbols[2], tfs[2]),
        ]);
        setDxy(heroSeries);
        setFrames([a, b, c]);
        setOnline(true);
      } catch {
        setDxy(offlineFrame(heroSymbol, dxyTimeframe));
        setFrames(frameSymbols.map((s, i) => offlineFrame(s, tfs[i])));
        setOnline(false);
      }
    },
    [frameSymbols, heroSymbol]
  );

  const loadChart = useCallback(async (sym: string, timeframe: Timeframe) => {
    try {
      const s = await api.chart(sym, timeframe);
      setSeries(s);
      setOnline(true);
    } catch {
      setSeries(mockSeries(sym, BASES[sym] ?? 1, timeframe, 180));
      setOnline(false);
    }
  }, []);

  useEffect(() => {
    if (!prefsReady || focus) return;
    void loadTerminal(frameTfs, dxyTf);
    const id = setInterval(() => void loadTerminal(frameTfs, dxyTf), 90_000);
    return () => clearInterval(id);
  }, [prefsReady, frameTfs, dxyTf, loadTerminal, focus]);

  useEffect(() => {
    void loadChart(symbol, tf);
    const id = setInterval(() => void loadChart(symbol, tf), 90_000);
    return () => clearInterval(id);
  }, [symbol, tf, loadChart]);

  useEffect(() => {
    if (!prefsReady || layoutShape !== 'shadow') {
      return;
    }
    const gen = ++shadowLoadGen.current;
    const emptySlot = (secTf: Timeframe): ChartSeries => ({
      ...mockSeries(symbol, BASES[symbol] ?? 1, secTf, 2),
      candles: [],
      timeframe: secTf,
    });

    const loadShadows = async () => {
      const primaryBars = Math.max(80, series?.candles?.length ?? 180);
      const prev = shadowSeriesRef.current;
      const results = await Promise.all(
        shadowSlots.map(async (secTf, i) => {
          if (secTf === tf) return emptySlot(secTf);
          const cached = prev[i];
          const cacheHit =
            cached &&
            cached.timeframe === secTf &&
            cached.symbol === symbol &&
            (cached.candles?.length ?? 0) > 0
              ? cached
              : null;

          // متوقف: لا نمسح الكاش — حتى يعود فوراً عند التشغيل
          if (!shadowEnabled[i]) {
            return cacheHit ?? emptySlot(secTf);
          }

          const need = shadowBarsNeeded(tf, secTf, primaryBars);
          try {
            const loaded = await api.chart(symbol, secTf, need);
            if ((loaded.candles?.length ?? 0) > 0) return loaded;
            return cacheHit ?? mockSeries(symbol, BASES[symbol] ?? 1, secTf, need);
          } catch {
            return cacheHit ?? mockSeries(symbol, BASES[symbol] ?? 1, secTf, need);
          }
        })
      );
      if (gen !== shadowLoadGen.current) return;
      setShadowSeries(results);
    };

    void loadShadows();
    const id = setInterval(() => void loadShadows(), 90_000);
    return () => {
      clearInterval(id);
    };
  }, [
    prefsReady,
    layoutShape,
    symbol,
    tf,
    shadowSlots,
    shadowEnabled,
    series?.candles?.length,
  ]);

  // عند مغادرة وضع الظل فقط نفرّغ الذاكرة
  useEffect(() => {
    if (layoutShape === 'shadow') return;
    shadowLoadGen.current += 1;
    setShadowSeries([]);
  }, [layoutShape]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadTerminal(frameTfs, dxyTf), loadChart(symbol, tf)]);
    setRefreshing(false);
  };

  const changeFrameTf = async (index: number, nextTf: Timeframe) => {
    if (frameTfs[index] === nextTf) return;
    const next = [...frameTfs] as Timeframe[];
    next[index] = nextTf;
    await persistTfs(next);
    const sym = frameSymbols[index];
    setFrames((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], timeframe: nextTf };
      return copy;
    });
    try {
      const s = await api.chart(sym, nextTf);
      setFrames((prev) => {
        const copy = [...prev];
        copy[index] = s;
        return copy;
      });
      setOnline(true);
    } catch {
      setFrames((prev) => {
        const copy = [...prev];
        copy[index] = offlineFrame(sym, nextTf);
        return copy;
      });
    }
  };

  const changeDxyTf = async (nextTf: Timeframe) => {
    if (dxyTf === nextTf) return;
    await persistDxyTf(nextTf);
    setDxy((prev) => ({ ...prev, timeframe: nextTf }));
    try {
      const s = await api.chart(heroSymbol, nextTf);
      setDxy(s);
      setOnline(true);
    } catch {
      setDxy(offlineFrame(heroSymbol, nextTf));
      setOnline(false);
    }
  };

  const pickSymbol = (sym: string, timeframe?: Timeframe) => {
    setSymbol(sym);
    if (timeframe) setTf(timeframe);
  };

  const price = liveTicks[symbol]?.price ?? series?.last ?? 0;
  const dxyPrice = liveTicks.DXY?.price ?? dxy.last;
  const tickPrices = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [sym, tick] of Object.entries(liveTicks)) {
      out[sym] = tick.price;
    }
    return out;
  }, [liveTicks]);
  const heroSeries = series ?? offlineFrame(symbol, tf);
  const heroTick = liveTicks[symbol] ?? null;
  const heroNowMs = useTickFreshnessClock(heroTick?.source.as_of ?? null);
  const heroNowSec = heroNowMs / 1000;
  const heroStatusBits = [
    online ? 'خادم متصل' : 'خادم غير متصل',
    provenanceLabel(normalizeProvenance(heroSeries.data_source)),
    heroTick
      ? tickStatusLabel(heroTick.source, heroTick.source.as_of, heroNowSec) ?? 'آخر سعر'
      : null,
  ].filter(Boolean);

  const topActions = [
    {
      id: 'ind',
      mark: '∑',
      tip: 'مؤشرات',
      run: () => setEdgePanel(edgePanel === 'indicators' ? null : 'indicators'),
    },
    {
      id: 'al',
      mark: '⚡',
      tip: 'تنبيه',
      run: () => setEdgePanel(edgePanel === 'alerts' ? null : 'alerts'),
    },
    { id: 'rp', mark: '↺', tip: 'تحديث', run: () => void onRefresh() },
    ...(phone
      ? [
          {
            id: 'spd',
            mark: 'cruise',
            tip: `${panSpeed}`,
            run: () => {
              const stepped = clampPanSpeed(panSpeed >= 100 ? 10 : panSpeed + 10);
              void changePanSpeed(stepped);
            },
          },
        ]
      : []),
    {
      id: 'q2',
      mark: '▦',
      tip: phone
        ? '2×2'
        : layoutShape === 'rect'
          ? `${layoutCount}▭`
          : `${layoutCount}□`,
      run: () => {
        if (phone) {
          setQuadOpen(true);
          return;
        }
        if (layoutShape === 'square') {
          if (layoutCount < 4) {
            void changeLayout((layoutCount + 1) as FrameLayoutCount, 'square');
          } else {
            void changeLayout(2, 'rect');
          }
        } else if (layoutCount < 4) {
          void changeLayout((layoutCount + 1) as FrameLayoutCount, 'rect');
        } else {
          void changeLayout(1, 'square');
        }
      },
    },
    { id: 'set', mark: '⚙', tip: 'نوع', run: () => setShowKinds((v) => !v) },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.topBar, phone && styles.topBarPhone]}>
        <SymbolPairMenu
          value={symbol}
          onPick={pickSymbol}
          onLongPress={() => openFocus(symbol, tf)}
        />

        {!phone && layoutCount === 1 && layoutShape !== 'shadow' ? (
          <View style={styles.tfScroll}>
            <TimeframeBar value={tf} onChange={setTf} arabic />
          </View>
        ) : null}

        {!phone ? (
          <View style={styles.layoutSwitcher}>
            <View style={styles.layoutSwitcherTag}>
              <Text style={styles.layoutSwitcherTagTop}>فريم</Text>
              <Text style={styles.layoutSwitcherTagBottom}>مربع</Text>
            </View>
            {([1, 2, 3, 4] as FrameLayoutCount[]).map((count) => {
              const active = layoutCount === count && layoutShape === 'square';
              return (
                <Pressable
                  key={`sq-${count}`}
                  style={[styles.layoutSwitchBtn, active && styles.layoutSwitchBtnOn]}
                  onPress={() => void changeLayout(count, 'square')}
                >
                  <View style={styles.layoutSwitchMini}>
                    {Array.from({ length: count }).map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.layoutSwitchCell,
                          active && styles.layoutSwitchCellOn,
                        ]}
                      />
                    ))}
                  </View>
                  <Text
                    style={[
                      styles.layoutSwitchNum,
                      active && styles.layoutSwitchNumOn,
                    ]}
                  >
                    {count}
                  </Text>
                </Pressable>
              );
            })}
            <View style={styles.layoutSwitchSep} />
            <View style={styles.layoutSwitcherTag}>
              <Text style={styles.layoutSwitcherTagTop}>فريم</Text>
              <Text style={styles.layoutSwitcherTagBottom}>مستطيل</Text>
            </View>
            {([2, 3, 4] as FrameLayoutCount[]).map((count) => {
              const active = layoutCount === count && layoutShape === 'rect';
              return (
                <Pressable
                  key={`rect-${count}`}
                  style={[styles.layoutSwitchBtn, active && styles.layoutSwitchBtnOn]}
                  onPress={() => void changeLayout(count, 'rect')}
                >
                  <View
                    style={[
                      styles.layoutSwitchMini,
                      count === 2 && styles.layoutSwitchMiniRow,
                      count === 3 && styles.layoutSwitchMiniRow3,
                      count === 4 && styles.layoutSwitchMiniRow4,
                    ]}
                  >
                    {Array.from({ length: count }).map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.layoutSwitchCellRect,
                          count === 2 && styles.layoutSwitchCellRect2,
                          count === 3 && styles.layoutSwitchCellRect3,
                          count === 4 && styles.layoutSwitchCellRect4,
                          active && styles.layoutSwitchCellOn,
                        ]}
                      />
                    ))}
                  </View>
                  <Text
                    style={[
                      styles.layoutSwitchNum,
                      active && styles.layoutSwitchNumOn,
                    ]}
                  >
                    {count}
                  </Text>
                </Pressable>
              );
            })}
            <View style={styles.layoutSwitchSep} />
            <Pressable
              style={[
                styles.layoutSwitcherTag,
                layoutShape === 'shadow' && styles.layoutSwitchBtnOn,
              ]}
              onPress={() => void changeLayout(1, 'shadow')}
            >
              <Text style={styles.layoutSwitcherTagTop}>فريم</Text>
              <Text
                style={[
                  styles.layoutSwitcherTagBottom,
                  layoutShape === 'shadow' && styles.layoutSwitchNumOn,
                ]}
              >
                الظل
              </Text>
            </Pressable>
          </View>
        ) : null}

        {!phone && multiCharts ? (
          <Pressable
            style={[styles.timeSyncBtn, timeSyncActive && styles.timeSyncBtnOn]}
            onPress={() => void toggleTimeSync()}
            accessibilityLabel="مزامنة الزمن"
          >
            <Text style={[styles.timeSyncText, timeSyncActive && styles.timeSyncTextOn]}>
              مزامنة الزمن
            </Text>
          </Pressable>
        ) : null}
        {!phone && layoutShape === 'shadow' ? (
          <Text style={styles.timeSyncHint}>المزامنة غير متاحة في فريم الظل</Text>
        ) : null}

        {!phone ? (
          <View style={styles.panSpeedSlot}>
            <PanSpeedSlider value={panSpeed} onChange={(v) => void changePanSpeed(v)} />
          </View>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.topDock}
          style={styles.topDockScroll}
        >
          {topActions.map((a) => (
            <Pressable key={a.id} style={styles.topBtn} onPress={a.run}>
              {a.mark === 'cruise' ? (
                <CruiseSpeedMark size={14} active />
              ) : (
                <Text style={styles.topMark}>{a.mark}</Text>
              )}
              <Text style={styles.topTip}>{a.tip}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {showKinds ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kindRow}
        >
          {CHART_KINDS.map((k) => (
            <Pressable
              key={k.id}
              style={[styles.kindChip, kind === k.id && styles.kindChipOn]}
              onPress={() => {
                setKind(k.id);
                setShowKinds(false);
              }}
            >
              <Text style={[styles.kindText, kind === k.id && styles.kindTextOn]}>{k.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {phone ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.phoneWatchRow}
          style={styles.phoneWatch}
        >
          {(phoneWatchSymbols ?? WATCHLIST.map((w) => w.symbol)).map((sym) => (
            <Pressable
              key={sym}
              style={[styles.pill, symbol === sym && styles.pillOn]}
              onPress={() => pickSymbol(sym)}
            >
              <Text style={[styles.pillText, symbol === sym && styles.pillTextOn]}>
                {sym}
              </Text>
            </Pressable>
          ))}
          <Pressable style={styles.pill} onPress={() => setPhoneWatchOpen(true)}>
            <Text style={styles.pillText}>إدارة</Text>
          </Pressable>
        </ScrollView>
      ) : null}

      <View style={styles.workspace}>
        {!phone ? (
          <LeftDrawRail
            activeLens={lens}
            activeTool={tool}
            onLens={setLens}
            onTool={(t) => {
              setTool(t);
            }}
            onQuad={() => setQuadOpen(true)}
          />
        ) : null}

        {!phone && layoutShape === 'shadow' ? (
          <View style={styles.desktopMain}>
            <View style={styles.desktopQuoteBar}>
              <View style={styles.desktopQuoteIdentity}>
                <View
                  style={[
                    styles.desktopAssetDot,
                    { backgroundColor: symbol === 'DXY' ? colors.dxy : colors.accent },
                  ]}
                />
                <View>
                  <SymbolPairMenu
                    large
                    value={symbol}
                    onPick={pickSymbol}
                    onLongPress={() => openFocus(symbol, tf)}
                  />
                  <Text style={styles.desktopMarket}>فريم الظل · أساسي {tf}</Text>
                </View>
              </View>
              <View style={styles.shadowHintBox}>
                <Text style={styles.shadowHintText}>
                  أساسي فوق · الظلال تحته من الأكبر إلى الأصغر
                </Text>
              </View>
              <View style={styles.desktopStatus}>
                <View style={[styles.statusDot, online && styles.statusDotOnline]} />
                <Text style={styles.statusText}>{heroStatusBits.join(' · ')}</Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.shadowTfBar}
              style={styles.shadowTfBarScroll}
            >
              <View style={styles.shadowTfGroup}>
                <Text style={styles.shadowTfLabel}>أساسي</Text>
                {TIMEFRAMES.map((range) => (
                  <Pressable
                    key={`p-${range}`}
                    style={[styles.rangeBtn, tf === range && styles.rangeBtnOn]}
                    onPress={() => setTf(range)}
                  >
                    <Text style={styles.rangeText}>{range}</Text>
                  </Pressable>
                ))}
              </View>
              {SHADOW_SLOT_LABELS.map((label, slotIndex) => {
                const slot = slotIndex as 0 | 1 | 2;
                const selected = shadowSlots[slot];
                const enabled = shadowEnabled[slot];
                return (
                  <View
                    key={label}
                    style={[styles.shadowTfGroup, !enabled && styles.shadowTfGroupOff]}
                  >
                    <Pressable
                      onPress={() => toggleShadowSlot(slot)}
                      hitSlop={8}
                      accessibilityRole="switch"
                      accessibilityState={{ checked: enabled }}
                      accessibilityLabel={`${label} ${enabled ? 'مفعّل' : 'متوقف'}`}
                      style={[styles.shadowToggle, enabled && styles.shadowToggleOn]}
                    >
                      <Text
                        style={[styles.shadowToggleText, enabled && styles.shadowToggleTextOn]}
                      >
                        {enabled ? 'تشغيل' : 'إيقاف'}
                      </Text>
                    </Pressable>
                    <Text style={[styles.shadowTfLabel, !enabled && styles.shadowTfLabelOff]}>
                      {label}
                    </Text>
                    {TIMEFRAMES.map((range) => {
                      const on = selected === range;
                      const locked = range === tf || !enabled;
                      return (
                        <Pressable
                          key={`${label}-${range}`}
                          style={[
                            styles.rangeBtn,
                            on && enabled && styles.shadowSecOn,
                            locked && styles.shadowSecLocked,
                          ]}
                          disabled={locked}
                          onPress={() => setShadowSlot(slot, range)}
                        >
                          <Text
                            style={[
                              styles.rangeText,
                              on && enabled && styles.shadowSecTextOn,
                              locked && styles.shadowSecTextLocked,
                            ]}
                          >
                            {range}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.desktopChart}>
              <MatrixChart
                key={`shadow-overlay-${symbol}-${tf}-${kind}`}
                series={series ?? offlineFrame(symbol, tf)}
                shadowSeries={SHADOW_SLOT_TAGS.flatMap((tag, i) => {
                  if (!shadowEnabled[i] || shadowSlots[i] === tf) return [];
                  const sec = shadowSeries[i];
                  if (!sec || (sec.candles?.length ?? 0) < 1) return [];
                  return [sec];
                })}
                shadowTags={SHADOW_SLOT_TAGS.flatMap((tag, i) => {
                  if (!shadowEnabled[i] || shadowSlots[i] === tf) return [];
                  const sec = shadowSeries[i];
                  if (!sec || (sec.candles?.length ?? 0) < 1) return [];
                  return [tag];
                })}
                height={desktopChartHeight}
                interactive
                compactUi
                persistDrawings
                panSpeed={panSpeed}
                accent={symbol === 'DXY' ? colors.dxy : colors.accent}
                livePrice={livePriceForChart(
                  series ?? offlineFrame(symbol, tf),
                  liveTicks[symbol] ?? null,
                  {
                    tickAsOf: liveTicks[symbol]?.source.as_of ?? null,
                    timeframe: (series ?? offlineFrame(symbol, tf)).timeframe,
                  }
                )}
                liveTickSource={liveTicks[symbol]?.source ?? null}
                initialTool={tool}
                initialLens={lens}
                initialKind={kind}
                initialIndicators={indicators}
              />
            </View>

            <View style={styles.rangeBar}>
              <Text style={styles.shadowFooterNote}>
                {[
                  `أساسي ${tf}`,
                  ...SHADOW_SLOT_TAGS.flatMap((tag, i) =>
                    shadowEnabled[i] ? [`${tag} ${shadowSlots[i]}`] : []
                  ),
                ].join(' · ')}
              </Text>
              <View style={styles.rangeSpacer} />
              <Pressable style={styles.fullscreenBtn} onPress={() => openFocus(symbol, tf)}>
                <Text style={styles.fullscreenText}>ملء الشاشة ⛶</Text>
              </Pressable>
            </View>
          </View>
        ) : !phone && layoutCount === 1 && layoutShape !== 'shadow' ? (
          <View style={styles.desktopMain}>
            <View style={styles.desktopQuoteBar}>
              <View style={styles.desktopQuoteIdentity}>
                <View
                  style={[
                    styles.desktopAssetDot,
                    { backgroundColor: symbol === 'DXY' ? colors.dxy : colors.accent },
                  ]}
                />
                <View>
                  <SymbolPairMenu
                    large
                    value={symbol}
                    onPick={pickSymbol}
                    onLongPress={() => openFocus(symbol, tf)}
                  />
                  <Text style={styles.desktopMarket}>سوق العملات · {tf}</Text>
                </View>
              </View>
              <View style={styles.desktopOhlc}>
                <Text style={styles.desktopOhlcLabel}>السعر</Text>
                <Text style={styles.desktopOhlcValue}>{formatPrice(price)}</Text>
                <Text
                  style={[
                    styles.desktopChange,
                    {
                      color:
                        (series?.change_pct ?? 0) >= 0 ? colors.bull : colors.bear,
                    },
                  ]}
                >
                  {(series?.change_pct ?? 0) >= 0 ? '+' : ''}
                  {(series?.change_pct ?? 0).toFixed(2)}%
                </Text>
              </View>
              <View style={styles.desktopStatus}>
                <View style={[styles.statusDot, online && styles.statusDotOnline]} />
                <Text style={styles.statusText}>{heroStatusBits.join(' · ')}</Text>
              </View>
            </View>

            <View style={styles.desktopChart}>
              <MatrixChart
                key={`${symbol}-${tf}-${tool}-${kind}-${lens}-${indicators.join(',')}`}
                series={series ?? offlineFrame(symbol, tf)}
                height={desktopChartHeight}
                interactive
                compactUi
                persistDrawings
                panSpeed={panSpeed}
                accent={symbol === 'DXY' ? colors.dxy : colors.accent}
                livePrice={livePriceForChart(
                  series ?? offlineFrame(symbol, tf),
                  liveTicks[symbol] ?? null,
                  {
                    tickAsOf: liveTicks[symbol]?.source.as_of ?? null,
                    timeframe: (series ?? offlineFrame(symbol, tf)).timeframe,
                  }
                )}
                liveTickSource={liveTicks[symbol]?.source ?? null}
                initialTool={tool}
                initialLens={lens}
                initialKind={kind}
                initialIndicators={indicators}
              />
            </View>

            <View style={styles.rangeBar}>
              {TIMEFRAMES.map((range) => (
                <Pressable
                  key={range}
                  style={[styles.rangeBtn, tf === range && styles.rangeBtnOn]}
                  onPress={() => setTf(range)}
                >
                  <Text style={styles.rangeText}>{range}</Text>
                </Pressable>
              ))}
              <View style={styles.rangeSpacer} />
              <Pressable style={styles.fullscreenBtn} onPress={() => openFocus(symbol, tf)}>
                <Text style={styles.fullscreenText}>ملء الشاشة ⛶</Text>
              </Pressable>
            </View>
          </View>
        ) : !phone && (layoutShape === 'rect' || (layoutShape === 'square' && layoutCount > 1)) ? (
          <View style={styles.rectWorkspace}>
            <FrameSizedGrid
              storageKey="matrix.home.frames.order.v1"
              layoutCount={layoutCount}
              shape={layoutShape === 'rect' ? 'rect' : 'square'}
              onOrderChange={setFrameOrder}
              items={[
                {
                  id: 'DXY',
                  node: (
                    <View style={styles.dxySlotFill}>
                      <ChartFrame
                        series={dxy}
                        size="large"
                        accent={dxy.symbol === 'DXY' ? colors.dxy : colors.accent}
                        label={dxy.symbol}
                        showTimeframes
                        onTimeframeChange={(t) => void changeDxyTf(t)}
                        onSymbolChange={(s) => void changeHeroSymbol(s)}
                        panControls
                        fill
                        panSpeed={panSpeed}
                        liveTick={liveTicks[dxy.symbol] ?? null}
                        onFocus={() => openFocus(dxy.symbol, dxyTf)}
                        {...syncPropsFor('DXY')}
                      />
                    </View>
                  ),
                },
                ...frames.map((f, i) => ({
                  id: `pair-${i}`,
                  node: (
                    <ChartFrame
                      series={f}
                      size="large"
                      accent={i === 2 ? colors.warn : colors.accent}
                      label={f.symbol}
                      showTimeframes
                      panControls
                      fill
                      panSpeed={panSpeed}
                      liveTick={liveTicks[f.symbol] ?? null}
                      onTimeframeChange={(t) => void changeFrameTf(i, t)}
                      onSymbolChange={(s) => void changeFrameSymbol(i, s)}
                      onFocus={() => {
                        pickSymbol(f.symbol, frameTfs[i]);
                        openFocus(f.symbol, frameTfs[i]);
                      }}
                      {...syncPropsFor(`pair-${i}`)}
                    />
                  ),
                })),
              ]}
            />
          </View>
        ) : (
          <ScrollView
            style={[
              styles.mainScroll,
              Platform.OS === 'web'
                ? ({ overscrollBehavior: 'contain' } as object)
                : null,
            ]}
            contentContainerStyle={[styles.scrollContent, !phone && styles.scrollFill]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.accent}
              />
            }
          >
            <Text style={styles.section}>
              {phone ? 4 : layoutCount} فريمات مربعة · امسك كل مربع لتبديل مكانه · المؤشرات
              اختيارية
            </Text>
            <FrameSizedGrid
              storageKey="matrix.home.frames.order.v1"
              layoutCount={phone ? 4 : layoutCount}
              shape="square"
              items={[
                {
                  id: 'DXY',
                  node: (
                    <View style={styles.dxySlotFill}>
                      <ChartFrame
                        series={dxy}
                        size="large"
                        accent={dxy.symbol === 'DXY' ? colors.dxy : colors.accent}
                        label={dxy.symbol}
                        showTimeframes
                        onTimeframeChange={(t) => void changeDxyTf(t)}
                        onSymbolChange={(s) => void changeHeroSymbol(s)}
                        phone={phone}
                        panControls
                        panSpeed={panSpeed}
                        liveTick={liveTicks[dxy.symbol] ?? null}
                        onFocus={() => openFocus(dxy.symbol, dxyTf)}
                      />
                    </View>
                  ),
                },
                ...frames.map((f, i) => ({
                  id: `pair-${i}`,
                  node: (
                    <ChartFrame
                      series={f}
                      size="large"
                      accent={i === 2 ? colors.warn : colors.accent}
                      label={f.symbol}
                      showTimeframes
                      phone={phone}
                      panControls
                      panSpeed={panSpeed}
                      liveTick={liveTicks[f.symbol] ?? null}
                      onTimeframeChange={(t) => void changeFrameTf(i, t)}
                      onSymbolChange={(s) => void changeFrameSymbol(i, s)}
                      onFocus={() => {
                        pickSymbol(f.symbol, frameTfs[i]);
                        openFocus(f.symbol, frameTfs[i]);
                      }}
                    />
                  ),
                })),
              ]}
            />
            <Text style={styles.hintMove}>
              التوقعات · التنبيهات · الأخبار · المجتمع → Tools · امسك الشريط واسحب لتبديل
              أماكن الفريمات
            </Text>
          </ScrollView>
        )}

        {!phone ? (
          <>
            <WatchlistPanel
              activeSymbol={symbol}
              ticks={tickPrices}
              bases={BASES}
              onPick={(s) => pickSymbol(s)}
              compact={narrowWatch}
            />
            <RightPanelRail
              activePanel={edgePanel}
              onOpenPanel={setEdgePanel}
              layoutCount={layoutCount}
              layoutShape={layoutShape}
              onLayoutPick={(count, shape) => void changeLayout(count, shape)}
            />
          </>
        ) : null}
      </View>

      <MatrixBottomDock
        tab={dockTab}
        onTab={setDockTab}
        symbol={symbol}
        timeframe={tf}
        lastPrice={price}
        candles={series?.candles}
      />

      <MatrixSidePanel
        panel={edgePanel}
        onClose={() => setEdgePanel(null)}
        symbol={symbol}
        timeframe={tf}
        lastPrice={price}
        candles={series?.candles}
        activeIndicators={indicators}
        activeKind={kind}
        onPickDraw={(t) => {
          setTool(t);
          setEdgePanel(null);
        }}
        onToggleIndicator={(id) => {
          setIndicators((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
          );
        }}
        onPickKind={(k) => {
          setKind(k);
          setEdgePanel(null);
        }}
      />

      <FocusChartModal
        visible={!!focus}
        symbol={focus?.symbol ?? symbol}
        timeframe={focus?.tf ?? tf}
        onClose={() => setFocus(null)}
        onSymbolChange={pickSymbol}
        initialTool={focus?.tool}
        initialLens={lens}
        initialKind={focus?.kind}
        initialIndicators={focus?.indicators}
      />

      <QuadChartModal
        visible={quadOpen}
        onClose={() => setQuadOpen(false)}
        symbols={[frameSymbols[0], frameSymbols[1], frameSymbols[2], 'DXY']}
        timeframe={frameTfs[0]}
      />

      <Modal visible={phoneWatchOpen} animationType="slide" onRequestClose={() => setPhoneWatchOpen(false)}>
        <SafeAreaView style={styles.phoneWatchModal}>
          <View style={styles.phoneWatchModalBar}>
            <Pressable style={styles.phoneWatchClose} onPress={() => setPhoneWatchOpen(false)}>
              <Text style={styles.phoneWatchCloseText}>إغلاق</Text>
            </Pressable>
            <Text style={styles.phoneWatchModalTitle}>إدارة قائمة المتابعة</Text>
          </View>
          <WatchlistPanel
            activeSymbol={symbol}
            ticks={tickPrices}
            bases={BASES}
            onPick={(next) => {
              pickSymbol(next);
              setPhoneWatchOpen(false);
            }}
            fullWidth
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    backgroundColor: colors.bgElevated,
    zIndex: 80,
    overflow: 'visible',
  },
  topBarPhone: { flexWrap: 'wrap', paddingVertical: 4 },
  symbolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  symbolText: { color: colors.accent, fontWeight: '900', fontSize: 13 },
  symbolCaret: { color: colors.accent, fontWeight: '800', fontSize: 11, opacity: 0.8 },
  tfScroll: { flexGrow: 0, flexShrink: 1, maxWidth: 520, minWidth: 200 },
  layoutSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#0A1524',
  },
  layoutSwitcherTag: {
    width: 46,
    height: 34,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.bgPanel,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  layoutSwitcherTagTop: {
    color: colors.accent,
    fontSize: 8,
    fontWeight: '900',
    lineHeight: 10,
    textAlign: 'center',
  },
  layoutSwitcherTagBottom: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: '800',
    lineHeight: 10,
    textAlign: 'center',
  },
  timeSyncBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPanel,
  },
  timeSyncBtnOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  timeSyncText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  timeSyncTextOn: {
    color: colors.accent,
  },
  timeSyncHint: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '700',
    maxWidth: 140,
  },
  shadowTagBtn: {
    marginLeft: 1,
  },
  layoutSwitchCellShadow1: {
    width: 12,
    height: 8,
  },
  layoutSwitchBtn: {
    width: 38,
    height: 34,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.bgPanel,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  layoutSwitchBtnOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  layoutSwitchMini: {
    width: 14,
    height: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
    alignContent: 'center',
  },
  layoutSwitchMiniRow: {
    flexWrap: 'nowrap',
    width: 16,
    height: 9,
  },
  layoutSwitchMiniRow3: {
    flexWrap: 'nowrap',
    width: 18,
    height: 9,
  },
  layoutSwitchMiniRow4: {
    flexWrap: 'nowrap',
    width: 20,
    height: 9,
  },
  layoutSwitchCell: {
    width: 6,
    height: 5,
    borderRadius: 1,
    backgroundColor: colors.textDim,
  },
  layoutSwitchCellRect: {
    width: 6,
    height: 4,
    borderRadius: 1,
    backgroundColor: colors.textDim,
  },
  layoutSwitchCellRect2: {
    width: 7,
    height: 8,
  },
  layoutSwitchCellRect3: {
    width: 5,
    height: 8,
  },
  layoutSwitchCellRect4: {
    width: 4,
    height: 8,
  },
  layoutSwitchCellOn: { backgroundColor: colors.accent },
  layoutSwitchNum: { color: colors.textMuted, fontSize: 9, fontWeight: '900' },
  layoutSwitchNumOn: { color: colors.accent },
  layoutSwitchSep: {
    width: 1,
    height: 18,
    backgroundColor: colors.border,
    marginHorizontal: 3,
  },
  panSpeedSlot: {
    flexShrink: 0,
    marginHorizontal: 2,
  },
  topDockScroll: { flexGrow: 1, flexShrink: 1 },
  topDock: { flexDirection: 'row', gap: 4, paddingHorizontal: 2 },
  topBtn: {
    width: 42,
    paddingVertical: 4,
    borderRadius: radii.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPanel,
  },
  topMark: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
  topTip: { color: colors.textDim, fontSize: 7, fontWeight: '700' },
  kindRow: { gap: 6, padding: 8, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },  kindChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPanel,
  },
  kindChipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  kindText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  kindTextOn: { color: colors.accent },
  workspace: { flex: 1, flexDirection: 'row' },
  desktopMain: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#08111E',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.borderSoft,
  },
  desktopQuoteBar: {
    minHeight: 46,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    backgroundColor: colors.bgElevated,
    zIndex: 70,
    overflow: 'visible',
  },
  desktopQuoteIdentity: { flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 70 },
  desktopAssetDot: { width: 9, height: 9, borderRadius: 5 },
  desktopSymbol: { color: colors.text, fontWeight: '900', fontSize: 14 },
  desktopMarket: { color: colors.textDim, fontSize: 9, marginTop: 1 },
  desktopOhlc: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  desktopOhlcLabel: { color: colors.textDim, fontSize: 9, fontWeight: '700' },
  desktopOhlcValue: { color: colors.text, fontSize: 13, fontWeight: '800' },
  desktopChange: { fontSize: 11, fontWeight: '900' },
  desktopStatus: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.warn },
  statusDotOnline: { backgroundColor: colors.bull },
  statusText: { color: colors.textDim, fontSize: 9, fontWeight: '700' },
  desktopChart: { flex: 1, paddingHorizontal: 7, paddingTop: 6 },
  shadowHintBox: { flex: 1, minWidth: 0, paddingHorizontal: 8 },
  shadowHintText: {
    color: colors.textDim,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'right',
  },
  shadowTfBarScroll: {
    maxHeight: 42,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    backgroundColor: '#0A1524',
  },
  shadowTfBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
  },
  shadowTfGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(148,163,184,0.35)',
    borderRadius: 8,
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
  shadowTfGroupOff: {
    opacity: 0.5,
    borderColor: 'rgba(148,163,184,0.18)',
    backgroundColor: 'rgba(15,23,42,0.28)',
  },
  shadowToggle: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(148,163,184,0.4)',
    backgroundColor: 'rgba(148,163,184,0.12)',
    marginLeft: 1,
    marginRight: 2,
  },
  shadowToggleOn: {
    borderColor: 'rgba(56,189,248,0.55)',
    backgroundColor: 'rgba(56,189,248,0.18)',
  },
  shadowToggleText: {
    color: colors.textDim,
    fontSize: 8,
    fontWeight: '900',
  },
  shadowToggleTextOn: {
    color: colors.accent,
  },
  shadowTfLabel: {
    color: colors.accent,
    fontSize: 8,
    fontWeight: '900',
    minWidth: 44,
    textAlign: 'center',
    marginLeft: 2,
    marginRight: 2,
  },
  shadowTfLabelOff: {
    color: colors.textDim,
  },
  shadowSecOn: {
    backgroundColor: 'rgba(148,163,184,0.22)',
    borderRadius: 5,
  },
  shadowSecLocked: { opacity: 0.35 },
  shadowSecTextOn: { color: colors.textMuted },
  shadowSecTextLocked: { color: colors.textDim },
  shadowFooterNote: {
    color: colors.textDim,
    fontSize: 9,
    fontWeight: '700',
  },
  shadowStackScroll: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#071018',
  },
  shadowStackFlat: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
  shadowPaneFlat: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#071018',
  },
  shadowGestureOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 80,
    backgroundColor: 'rgba(0,0,0,0.001)',
  },
  shadowLabelRight: {
    position: 'absolute',
    top: 4,
    right: 8,
    zIndex: 30,
    color: 'rgba(148,163,184,0.75)',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.2,
    textAlign: 'right',
    backgroundColor: 'rgba(7,16,24,0.55)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    overflow: 'hidden',
  },
  shadowStack: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  shadowFrame: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    overflow: 'hidden',
    minWidth: 140,
  },
  shadowFrameHead: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  shadowFrameTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    minWidth: 0,
  },
  shadowFrameDot: { width: 7, height: 7, borderRadius: 4 },
  shadowFrameTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  shadowFrameTitleMuted: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  shadowFrameTf: { color: colors.textDim, fontSize: 11, marginLeft: 4 },
  shadowFrameSym: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 0,
  },
  shadowFrameChart: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  shadowPaneHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  shadowPaneBadge: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '900',
  },
  shadowPaneBadgePrimary: {
    color: '#4ADE80',
  },
  shadowPaneTf: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  shadowPaneSym: {
    marginLeft: 'auto',
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '800',
  },
  shadowDualRow: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingTop: 4,
  },
  shadowDualPane: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.md,
    backgroundColor: '#08111E',
    overflow: 'hidden',
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  shadowPaneFocus: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
  },
  shadowSymRow: { flexDirection: 'row', gap: 3, paddingLeft: 4 },
  shadowSymChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.bgPanel,
  },
  shadowSymChipOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  shadowSymChipText: { color: colors.textDim, fontSize: 8, fontWeight: '800' },
  shadowSymChipTextOn: { color: colors.accent },
  rangeBar: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 7,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    backgroundColor: colors.bgElevated,
  },
  rangeBtn: { paddingHorizontal: 7, paddingVertical: 5, borderRadius: 5 },
  rangeBtnOn: { backgroundColor: colors.accentSoft },
  rangeText: { color: colors.textDim, fontSize: 9, fontWeight: '800' },
  rangeSpacer: { flex: 1 },
  fullscreenBtn: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPanel,
  },
  fullscreenText: { color: colors.textMuted, fontSize: 9, fontWeight: '800' },
  mainScroll: { flex: 1 },
  rectWorkspace: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    padding: spacing.sm,
    backgroundColor: '#08111E',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.borderSoft,
  },
  scrollContent: { padding: spacing.sm, gap: spacing.sm, paddingBottom: 8 },
  scrollFill: { flexGrow: 1 },
  section: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
    marginTop: 2,
  },
  hintMove: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  dxySlotFill: {
    flex: 1,
    height: '100%',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.dxy,
    overflow: 'hidden',
  },
  phoneWatch: { maxHeight: 44, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  phoneWatchRow: { gap: 6, paddingHorizontal: 8, paddingVertical: 6 },
  phoneWatchModal: { flex: 1, backgroundColor: colors.bg },
  phoneWatchModalBar: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  phoneWatchModalTitle: { color: colors.text, fontWeight: '800' },
  phoneWatchClose: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: radii.sm, backgroundColor: colors.accentSoft },
  phoneWatchCloseText: { color: colors.accent, fontWeight: '800', fontSize: 12 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPanel,
  },
  pillOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  pillText: { color: colors.textMuted, fontWeight: '700', fontSize: 11 },
  pillTextOn: { color: colors.accent },
});
