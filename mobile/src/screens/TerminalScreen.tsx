import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
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
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radii, buttons } from '../theme';
import { api, type ChartSeries } from '../api';
import { MOCK_BASES, mockBase } from '../chart/mockBases';
import { mockSeries } from '../mock';
import { ChartFrame } from '../components/ChartFrame';
import { ProviderUnavailableNotice, seriesHasNoRealData } from '../components/ProviderUnavailableNotice';
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
import { useDailyRefs } from '../chart/dailyRefStore';
import { dailyChange, formatPct, freshTickRefPrice, isVerifiedTickKind, pctDirection } from '../chart/dailyChange';
import { DEFAULT_LAYOUT } from '../chart/layoutStore';
import { formatPrice } from '../chart/math';
import { quoteSpreadPips } from '../positionSize';
import {
  armedText,
  createChartAlert,
  seriesRefPrice,
  type ChartAlertOrigin,
} from '../chart/alertFromChart';
import { playSoftClick } from '../audio/playSoftClick';
import { notify } from '../chart/confirmDestructive';
import { createSeriesCache, seriesCacheKey } from '../chart/seriesCache';
import { MatrixChart, type SyncTimeWindow } from '../chart/MatrixChart';
import { headerChangePct, livePriceForChart } from '../chart/liveSeries';
import { provenanceLabel, tickStatusLabel, normalizeProvenance, isSyntheticProvenance } from '../chart/dataSource';
import { marketStatusLabel } from '../chart/marketHours';
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
import { useI18n } from '../i18n/I18nContext';
import { localizedChartKinds } from '../chart/typeLabels';
import { NewsRiskBanner } from '../components/NewsRiskBanner';

const PREFS_KEY = 'matrix.frameTimeframes.v1';
const SYMBOLS_KEY = 'matrix.frameSymbols.v1';
const LAYOUT_COUNT_KEY = 'matrix.home.layoutCount.v1';
const LAYOUT_SHAPE_KEY = 'matrix.home.layoutShape.v1';
const TIME_SYNC_KEY = 'matrix.home.timeSync.v1';
const DXY_TF_KEY = 'matrix.home.dxyTf.v1';
const DXY_SYMBOL_KEY = 'matrix.home.dxySymbol.v1';
const SHADOW_SECONDARY_KEY = 'matrix.home.shadowSlots.v2';
const SHADOW_ENABLED_KEY = 'matrix.home.shadowEnabled.v1';
const SHADOW_SLOT_TAGS = ['s', 'm', 'b'] as const;
type ShadowSlots = [Timeframe, Timeframe, Timeframe];
type ShadowEnabled = [boolean, boolean, boolean];
const DEFAULT_SHADOW_SLOTS: ShadowSlots = ['5m', '30m', '1H'];
const DEFAULT_SHADOW_ENABLED: ShadowEnabled = [true, true, true];


/** رموز لا يقدّمها المزوّد أبداً (backend-r19، `27fa8ba`) — الخادم يرسل لها `candles: []` بـ`not_offered_by_provider`. */
const NOT_OFFERED_SYMBOLS = new Set(['DXY']);

/**
 * إطار بلا خادم بعد: بذرة موسومة «تجريبي» — إلا رمزاً لا يقدّمه المزوّد (launch119): بذرة DXY حول 104.25 كانت
 * تُرسم بلا خادم مع أن الخادم نفسه لا يملك له شمعة. الآن السلسلة الفارغة نفسها التي يرسلها الخادم ⇒ الإشعار.
 */
function offlineFrame(symbol: string, tf: Timeframe, bars = 120): ChartSeries {
  const seed = mockSeries(symbol, mockBase(symbol), tf, bars);
  if (!NOT_OFFERED_SYMBOLS.has(symbol.trim().toUpperCase())) return seed;
  return {
    ...seed,
    candles: [],
    data_source: { ...seed.data_source, unavailable_reason: 'not_offered_by_provider' } as ChartSeries['data_source'],
  };
}

/**
 * ذاكرة جلسة لشموع (رمز، فريم) كالرباعي (`seriesCache`، 5 دقائق): تبديل فريم/رمز كان يُبقي شموع الفريم السابق
 * معروضة **تحت اسم الفريم الجديد** حتى يصل الجلب (15m موسومة 1H)، والرجوع لفريم فُتح قبل ثوانٍ = جولة انتظار كاملة.
 * الآن آخر سلسلة حقيقية لنفس (الرمز، الفريم) تُعرض فوراً والجلب يستبدلها؛ وفشل الجلب يُبقيها بدل شموع وهمية.
 * الإطارات والشارت الرئيسي والبطل تتشارك الذاكرة: فتح رمز/فريم ظاهر بإطار آخر فوري. لا تُخزَّن السلاسل التجريبية ولا «غير المتاحة».
 */
const terminalSeriesCache = createSeriesCache<ChartSeries>();
const cachedSeries = (sym: string, tf: Timeframe): ChartSeries | null =>
  terminalSeriesCache.get(seriesCacheKey(sym, tf));
async function fetchSeries(sym: string, tf: Timeframe): Promise<ChartSeries> {
  const s = await api.chart(sym, tf);
  if (!isSyntheticProvenance(s.data_source)) terminalSeriesCache.put(seriesCacheKey(sym, tf), s);
  return s;
}

export function TerminalScreen() {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const SHADOW_SLOT_LABELS = useMemo(
    () =>
      [t.termShadowSizeSmall, t.termShadowSizeMedium, t.termShadowSizeBig].map(
        (w, i) => `${w} ${SHADOW_SLOT_TAGS[i]}`
      ) as [string, string, string],
    [t]
  );
  const { width, height } = useWindowDimensions();
  const phone = width < 700;
  const narrowWatch = width < 1100;
  const desktopChartHeight = Math.max(320, Math.min(720, height - 330));

  const [dxy, setDxy] = useState<ChartSeries>(() => offlineFrame('DXY', '15m'));
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
  // الشموع موسومة بـ(الرمز|الفريم) الذي جُلبت له: ردٌّ متأخر لرمز سابق (↺/السحب بلا حارس، تبديل بلا ذاكرة) كان يُعرض
  // تحت الرمز الجديد حتى الجلب التالي (90ث) — شموع EURUSD وسعرها ونسبتها تحت USDJPY. الآن ما لا يطابق = لا شموع.
  const [chart, setChart] = useState<{ key: string; s: ChartSeries } | null>(null);
  const chartKey = `${symbol}|${tf}`;
  const chartKeyRef = useRef(chartKey);
  chartKeyRef.current = chartKey;
  const series = chart && chart.key === chartKey ? chart.s : null;
  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline] = useState(false);
  const [quote, setQuote] = useState<{ bid: number | null; ask: number | null } | null>(null);

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
  // حارس سباق شبكة إضافي (نفس فئة `loadChart::isStale` أدناه): ضغطتان متتاليتان سريعتان على نفس
  // عنصر تحكم إطار/رمز رئيسي أثناء رحلة شبكة واحدة قد تُطبِّقان النتيجتين بترتيب معكوس — عدّاد
  // توليد لكل هدف كتابة (نفس نمط `shadowLoadGen` أعلاه) يضمن تطبيق الرد الأحدث فقط. **لا يغطّي**
  // تعارضاً مع تحديث `loadTerminal` الدوري الكامل (نطاق أوسع، فئة خطر مختلفة، خارج هذا الإصلاح عمداً
  // — راجع HANDOFF.md).
  const frameLoadGen = useRef<[number, number, number]>([0, 0, 0]);
  const dxyLoadGen = useRef(0);
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
  /**
   * تركيز الشاشة — شاشات التبويبات السفلية **تبقى مُركَّبة** بعد الانتقال عنها، فما تحمله من
   * مؤقّتات يعمل بقيّة الجلسة خلف الشاشة. يُقرأ بـ`addListener('focus'/'blur')` كما بشاشة الأدوات
   * حرفياً. القيمة الابتدائية `true`: الشاشة تُركَّب وهي المعروضة، وحدث `focus` قد يكون مضى قبل
   * تسجيل المستمع.
   *
   * يُمرَّر لقائمة المتابعة (دورة قراءة `/api/alerts`) **ولمقبس التيكات** (`useMultiLiveTicks` أدناه): كان يبقى مفتوحاً
   * خلف الشاشة بقيّة الجلسة (بطارية وبيانات وإعادة رسمٍ لشاشة مخفيّة مع كل تيك). بالعودة يُعاد الاتصال؛ التيكات السابقة
   * تبقى معروضة بعمرها (`source.as_of`) حتى أول رسالة. صفّ التنسيق «tools ⇐ chart» (09-23) — موضع الاستدعاء هنا بملفّي.
   */
  const navigation = useNavigation();
  const [screenFocused, setScreenFocused] = useState(true);
  useEffect(() => {
    const nav = navigation as unknown as {
      addListener: (e: 'focus' | 'blur', cb: () => void) => () => void;
      isFocused?: () => boolean;
    };
    if (typeof nav.isFocused === 'function') setScreenFocused(nav.isFocused());
    const offFocus = nav.addListener('focus', () => setScreenFocused(true));
    const offBlur = nav.addListener('blur', () => setScreenFocused(false));
    return () => {
      offFocus();
      offBlur();
    };
  }, [navigation]);
  const liveTicks = useMultiLiveTicks(watchSymbols, screenFocused);

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
      // كل مفتاح وحده: كانت القراءات بـ`try` واحد، فقيمةٌ تالفة واحدة (JSON مقطوع لترتيب الإطارات) تُسقط كل ما بعدها
      // — إطار الدولار، رمز البطل، خانات الظلّ، سرعة السحب — بصمت عند كل إقلاع
      const get = async (key: string): Promise<string | null> => {
        try {
          return await AsyncStorage.getItem(key);
        } catch {
          return null;
        }
      };
      const json = (raw: string | null): unknown => {
        if (!raw) return null;
        try {
          return JSON.parse(raw) as unknown;
        } catch {
          return null;
        }
      };
      try {
        const parsedTfs = json(await get(PREFS_KEY));
        if (Array.isArray(parsedTfs) && parsedTfs.length === 3 && parsedTfs.every(isTimeframe)) {
          setFrameTfs(parsedTfs as Timeframe[]);
        }
        const syms = json(await get(SYMBOLS_KEY));
        // رموز نصّية غير فارغة فقط: `[null, …]` كان يُمرَّر إلى `api.chart` كما هو
        if (Array.isArray(syms) && syms.length === 3 && syms.every((x) => typeof x === 'string' && x.trim() !== '')) {
          setFrameSymbols([syms[0], syms[1], syms[2]]);
        }
        const parsedLayout = Number(await get(LAYOUT_COUNT_KEY));
        if ([1, 2, 3, 4].includes(parsedLayout)) {
          setLayoutCount(parsedLayout as FrameLayoutCount);
        }
        const shapeRaw = await get(LAYOUT_SHAPE_KEY);
        if (shapeRaw === 'square' || shapeRaw === 'rect' || shapeRaw === 'shadow') {
          setLayoutShape(shapeRaw);
          if (shapeRaw === 'shadow') setLayoutCount(1);
        }
        const syncRaw = await get(TIME_SYNC_KEY);
        if (syncRaw === '1' || syncRaw === 'true') {
          setTimeSyncEnabled(true);
        }
        const order = json(await get('matrix.home.frames.order.v1'));
        if (Array.isArray(order) && order.every((x) => typeof x === 'string')) {
          setFrameOrder(order as string[]);
        }
        const dxyTfRaw = await get(DXY_TF_KEY);
        if (dxyTfRaw && isTimeframe(dxyTfRaw)) {
          setDxyTf(dxyTfRaw);
        }
        const heroRaw = await get(DXY_SYMBOL_KEY);
        if (heroRaw && heroRaw.trim()) {
          setHeroSymbol(heroRaw.toUpperCase());
        }
        const shadow = json(await get(SHADOW_SECONDARY_KEY));
        if (Array.isArray(shadow) && shadow.length >= 3 && shadow.every(isTimeframe)) {
          setShadowSlots([shadow[0], shadow[1], shadow[2]]);
        }
        const enabled = json(await get(SHADOW_ENABLED_KEY));
        if (Array.isArray(enabled) && enabled.length >= 3 && enabled.every((x) => typeof x === 'boolean')) {
          setShadowEnabled([Boolean(enabled[0]), Boolean(enabled[1]), Boolean(enabled[2])]);
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
      const gen = ++frameLoadGen.current[index];
      const hit = cachedSeries(nextSym, frameTfs[index]);
      if (hit) {
        setFrames((prev) => {
          const copy = [...prev];
          copy[index] = hit;
          return copy;
        });
      }
      try {
        const s = await fetchSeries(nextSym, frameTfs[index]);
        if (gen !== frameLoadGen.current[index]) return;
        setFrames((prev) => {
          const copy = [...prev];
          copy[index] = s;
          return copy;
        });
        setOnline(true);
      } catch {
        if (gen !== frameLoadGen.current[index]) return;
        setFrames((prev) => {
          const copy = [...prev];
          copy[index] = cachedSeries(nextSym, frameTfs[index]) ?? offlineFrame(nextSym, frameTfs[index]);
          return copy;
        });
        setOnline(false);
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
      const gen = ++dxyLoadGen.current;
      const hit = cachedSeries(nextSym, dxyTf);
      if (hit) setDxy(hit);
      try {
        const s = await fetchSeries(nextSym, dxyTf);
        if (gen !== dxyLoadGen.current) return;
        setDxy(s);
        setOnline(true);
      } catch {
        if (gen !== dxyLoadGen.current) return;
        setDxy(cachedSeries(nextSym, dxyTf) ?? offlineFrame(nextSym, dxyTf));
        setOnline(false);
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
      // نفس عدّادات الأجيال التي يستخدمها تبديل رمز فريم/الشارت الرئيسي: التحديث الدوري (كل 90 ثانية) كان
      // بلا حارس، فإن بدأ قبل تبديل EURUSD → USDJPY ووصل بعده أعاد شموع EURUSD للفريم تحت اسم USDJPY.
      // كل نتيجة تُكتب فقط إن لم يبدأ بعدها تحميل أحدث لنفس الخانة.
      const heroGen = ++dxyLoadGen.current;
      const frameGens = frameLoadGen.current.map((_, i) => ++frameLoadGen.current[i]);
      const apply = (hero: ChartSeries, frs: ChartSeries[]) => {
        if (heroGen === dxyLoadGen.current) setDxy(hero);
        setFrames((prev) => prev.map((old, i) => (frameGens[i] === frameLoadGen.current[i] ? frs[i] : old)));
      };
      try {
        const [heroSeries, a, b, c] = await Promise.all([
          fetchSeries(heroSymbol, dxyTimeframe),
          fetchSeries(frameSymbols[0], tfs[0]),
          fetchSeries(frameSymbols[1], tfs[1]),
          fetchSeries(frameSymbols[2], tfs[2]),
        ]);
        apply(heroSeries, [a, b, c]);
        setOnline(true);
      } catch {
        apply(
          cachedSeries(heroSymbol, dxyTimeframe) ?? offlineFrame(heroSymbol, dxyTimeframe),
          frameSymbols.map((s, i) => cachedSeries(s, tfs[i]) ?? offlineFrame(s, tfs[i]))
        );
        setOnline(false);
      }
    },
    [frameSymbols, heroSymbol]
  );

  const loadChart = useCallback(
    async (sym: string, timeframe: Timeframe, isStale?: () => boolean) => {
      const key = `${sym}|${timeframe}`;
      const stale = () => isStale?.() === true || chartKeyRef.current !== key;
      try {
        const s = await fetchSeries(sym, timeframe);
        if (stale()) return;
        setChart({ key, s });
        setOnline(true);
      } catch {
        if (stale()) return;
        setChart({ key, s: cachedSeries(sym, timeframe) ?? offlineFrame(sym, timeframe, 180) });
        setOnline(false);
      }
    },
    []
  );

  // الاستطلاعات الدورية الأربعة هنا (الإطارات، الشارت، Bid/Ask، الظلّ) تقف ما دامت الشاشة خلف تبويبٍ آخر (`screenFocused`):
  // الشاشة تبقى مُركَّبة، فكانت تجلب كل 90 ث بقيّة الجلسة لشارت لا يُرى — من حدّ المزوّد نفسه الذي إن نفد (429) أعاد
  // الخادم أسعاراً مخزّنة قديمة لحاسبة اللوت والتنبيهات. بالعودة يُعاد تشغيل كل تأثير فيجلب فوراً.
  useEffect(() => {
    if (!prefsReady || focus || !screenFocused) return;
    void loadTerminal(frameTfs, dxyTf);
    const id = setInterval(() => void loadTerminal(frameTfs, dxyTf), 90_000);
    return () => clearInterval(id);
  }, [prefsReady, frameTfs, dxyTf, loadTerminal, focus, screenFocused]);

  // حارس سباق شبكة: تجاهل ردّ متأخر لرمز/فريم زمني سابق (نفس نمط `alive` المستخدَم بلوحة الاقتباس
  // أدناه وبـ`FocusChartModal`/`QuadChartModal`) — تبديل سريع بين رموز المراقبة كان يترك آخر رد وصل
  // (لا آخر رمز مختار فعلياً) هو ما يُعرَض، بصرف النظر عن ترتيب وصول الشبكة الفعلي.
  useEffect(() => {
    let alive = true;
    const hit = cachedSeries(symbol, tf);
    if (hit) setChart({ key: `${symbol}|${tf}`, s: hit });
    if (!screenFocused) return;
    void loadChart(symbol, tf, () => !alive);
    const id = setInterval(() => void loadChart(symbol, tf, () => !alive), 90_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [symbol, tf, loadChart, screenFocused]);

  // سبريد Bid/Ask للرمز الحالي — بند 2 من قائمة الإطلاق (أولوية طارئة، docs/ROADMAP.md)
  // السطر يُعرض بشريط سطح المكتب لشارت واحد فقط (`desktopQuoteBar`) — على الهاتف وبالتخطيطات المتعدّدة والظلّ
  // وتحت نافذة التركيز كان الاستطلاع يجري كل 90 ث بلا عرض، يستهلك حدّ المزوّد نفسه الذي إن نفد (429) أعاد
  // الخادم أسعاراً مخزّنة قديمة لحاسبة اللوت وللتنبيهات.
  const showsSpread = screenFocused && !phone && layoutCount === 1 && layoutShape !== 'shadow' && !focus;
  useEffect(() => {
    let alive = true;
    // لا نُبقي Bid/Ask الرمز السابق تحت اسم الرمز الجديد حتى يصل الرد
    setQuote(null);
    if (!showsSpread) return;
    const loadQuote = () => {
      api
        .marketQuote(symbol)
        .then((q) => {
          if (alive) setQuote({ bid: q.bid ?? null, ask: q.ask ?? null });
        })
        .catch(() => {
          if (alive) setQuote(null);
        });
    };
    void loadQuote();
    const id = setInterval(loadQuote, 90_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [symbol, showsSpread]);

  useEffect(() => {
    if (!prefsReady || layoutShape !== 'shadow' || !screenFocused) {
      return;
    }
    const gen = ++shadowLoadGen.current;
    const emptySlot = (secTf: Timeframe): ChartSeries => ({
      ...mockSeries(symbol, mockBase(symbol), secTf, 2),
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
            return cacheHit ?? mockSeries(symbol, mockBase(symbol), secTf, need);
          } catch {
            return cacheHit ?? mockSeries(symbol, mockBase(symbol), secTf, need);
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
    screenFocused,
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
    const hit = cachedSeries(sym, nextTf);
    // بلا كاش: تبقى الشموع القديمة بوسمها الحقيقي حتى يصل الجلب — وسمها بالفريم الجديد يُنهي تعتيم
    // ChartFrame فوراً ويدمج التيكات بشمعة من الفريم القديم.
    if (hit) {
      setFrames((prev) => {
        const copy = [...prev];
        copy[index] = hit;
        return copy;
      });
    }
    const gen = ++frameLoadGen.current[index];
    try {
      const s = await fetchSeries(sym, nextTf);
      if (gen !== frameLoadGen.current[index]) return;
      setFrames((prev) => {
        const copy = [...prev];
        copy[index] = s;
        return copy;
      });
      setOnline(true);
    } catch {
      if (gen !== frameLoadGen.current[index]) return;
      setFrames((prev) => {
        const copy = [...prev];
        copy[index] = cachedSeries(sym, nextTf) ?? offlineFrame(sym, nextTf);
        return copy;
      });
      setOnline(false);
    }
  };

  const changeDxyTf = async (nextTf: Timeframe) => {
    if (dxyTf === nextTf) return;
    await persistDxyTf(nextTf);
    const hit = cachedSeries(heroSymbol, nextTf);
    if (hit) setDxy(hit);
    const gen = ++dxyLoadGen.current;
    try {
      const s = await fetchSeries(heroSymbol, nextTf);
      if (gen !== dxyLoadGen.current) return;
      setDxy(s);
      setOnline(true);
    } catch {
      if (gen !== dxyLoadGen.current) return;
      setDxy(cachedSeries(heroSymbol, nextTf) ?? offlineFrame(heroSymbol, nextTf));
      setOnline(false);
    }
  };

  /** طلب فتح شارت من تبويب آخر (نتيجة الماسح): { openSymbol, openTf, nonce } — يُفتح شارت التركيز
   * ثم تُمسح المعاملات كي لا يُعاد فتحه عند العودة للشاشة. */
  const route = useRoute();


  const openReq = route.params as
    | { openSymbol?: string; openTf?: string; nonce?: number }
    | undefined;
  useEffect(() => {
    const sym = openReq?.openSymbol;
    if (!sym) return;
    const reqTf = openReq?.openTf && isTimeframe(openReq.openTf) ? openReq.openTf : tf;
    openFocus(sym, reqTf);
    navigation.setParams({ openSymbol: undefined, openTf: undefined, nonce: undefined } as never);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openReq?.nonce]);

  /** تطبيق تخطيط محفوظ من تبويب الأدوات: { layoutSymbols, layoutTfs, layoutNonce } — كان التخطيط يُكتب
   * للتخزين فقط والشاشة (مركّبة مسبقاً) لا تقرؤه إلا عند التركيب، فلا يتغيّر شيء حتى إعادة التشغيل. */
  const layoutReq = route.params as
    | { layoutSymbols?: string[]; layoutTfs?: string[]; layoutNonce?: number }
    | undefined;
  useEffect(() => {
    const syms = layoutReq?.layoutSymbols;
    const tfs = layoutReq?.layoutTfs;
    if (!layoutReq?.layoutNonce) return;
    if (Array.isArray(syms) && syms.length === 3 && syms.every((x) => typeof x === 'string' && x)) {
      setFrameSymbols([syms[0], syms[1], syms[2]]);
    }
    if (Array.isArray(tfs) && tfs.length === 3 && tfs.every(isTimeframe)) {
      setFrameTfs([...tfs]);
    }
    navigation.setParams({
      layoutSymbols: undefined,
      layoutTfs: undefined,
      layoutNonce: undefined,
    } as never);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutReq?.layoutNonce]);

  const pickSymbol = (sym: string, timeframe?: Timeframe) => {
    setSymbol(sym);
    if (timeframe) setTf(timeframe);
  };

  /**
   * تيك البثّ التجريبي (المزوّد متوقّف فيبثّ الـWebSocket أسعاراً عشوائية) فوق سلسلة حقيقية/مخزَّنة كان يُعرض سعراً
   * برأس الشاشة العريضة ويُمرَّر `lastPrice` — ونسبة اليوم تُحسب منه مقابل إغلاق أمس الحقيقي. شريط الهاتف ومرجع
   * التنبيه يستثنيانه أصلاً. يُقبل فقط حين السلسلة نفسها تجريبية (الإطار موسوم «تجريبي» فالحركة متّسقة معه).
   */
  const headTick = (() => {
    const tk = liveTicks[symbol];
    if (!tk) return null;
    // غير مؤكَّد (`unknown` من خادمٍ أقدم) يُقبل كذلك حين السلسلة نفسها غير مؤكَّدة (الرأس موسوم بمصدرها)
    return isVerifiedTickKind(tk.source.kind) || !isVerifiedTickKind(normalizeProvenance(series?.data_source).kind)
      ? tk
      : null;
  })();
  const price = headTick?.price ?? series?.last ?? 0;

  /** تأكيد «مُسلَّح» بعد إنشاء تنبيه من الشارت — يختفي بعد 4 ثوانٍ. */
  const [armedMsg, setArmedMsg] = useState<string | null>(null);
  const armedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (armedTimerRef.current) clearTimeout(armedTimerRef.current);
    },
    []
  );
  /**
   * تنبيه بنقرتين من الشارت الرئيسي (زر التقاطع أو خط/منطقة مرسومة) — كان متاحاً بشارت التركيز وحده،
   * فمن الشاشة الرئيسية كان لا بدّ من فتح لوحة التنبيهات وكتابة السعر يدوياً. المنطق مشترك
   * (`chart/alertFromChart.ts`): الاتجاه من سعر مرجعي حقيقي للرمز نفسه، وبلا مرجع لا يُنشأ تنبيه.
   */
  const alertFromChart = useCallback(
    async (alertPrice: number, origin?: ChartAlertOrigin) => {
      try {
        const res = await createChartAlert({
          symbol,
          price: alertPrice,
          // تيكٌ متجمّد/تجريبي لا يقرّر «فوق/تحت» — آخر إغلاق حقيقي للسلسلة، أو اقتباس حيّ داخل createChartAlert
          refPrice: freshTickRefPrice(liveTicks[symbol]) ?? seriesRefPrice(series, symbol),
          note: origin === 'crosshair' ? t.focusAlertFromChartNote : t.focusAlertFromDrawingNote,
        });
        playSoftClick();
        setArmedMsg(`${t.alertsArmedPrefix}: ${armedText(symbol, res.condition, formatPrice(alertPrice, symbol))}`);
        if (armedTimerRef.current) clearTimeout(armedTimerRef.current);
        armedTimerRef.current = setTimeout(() => setArmedMsg(null), 4000);
      } catch {
        notify(t.focusAlertCreateFailedTitle, t.focusAlertCreateFailedBody);
      }
    },
    [symbol, series, liveTicks, t]
  );
  const tickPrices = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [sym, tick] of Object.entries(liveTicks)) {
      out[sym] = tick.price;
    }
    return out;
  }, [liveTicks]);
  // رموز تيكها ليس سعر مزوّد مؤكَّداً — البثّ التجريبي (fallback عشوائي) و`unknown` (خادمٌ أقدم بلا مصدر، ui4):
  // لا تلوين اتجاه ولا نسبة تغيّر ولا مسافة تنبيه، ويُوسم «تجريبي» بدل أن يبدو سعراً حيّاً.
  const demoTickSymbols = useMemo(
    () =>
      Object.entries(liveTicks)
        .filter(([, tick]) => !isVerifiedTickKind(tick.source.kind))
        .map(([sym]) => sym),
    [liveTicks]
  );
  const phoneStripSymbols = useMemo(
    () => phoneWatchSymbols ?? WATCHLIST.map((w) => w.symbol),
    [phoneWatchSymbols]
  );
  const stripDailyRefs = useDailyRefs(phone ? phoneStripSymbols : []);
  // رأس الشاشة العريضة: تغيّر اليوم كما بـ`ChartFrame`/قائمة المتابعة لا `series.change_pct` (من أول شمعة محمّلة).
  const headDailyRefs = useDailyRefs(phone ? [] : [symbol]);
  // إبقاء الزوج النشط ظاهراً بشريط الهاتف حين يتبدّل من مكان آخر (عجلة الأزواج/البحث/التنبيه).
  const phoneStripRef = useRef<ScrollView | null>(null);
  const phoneStripX = useRef<Record<string, number>>({});
  useEffect(() => {
    if (!phone) return;
    const x = phoneStripX.current[symbol];
    if (x == null) return;
    phoneStripRef.current?.scrollTo({ x: Math.max(0, x - 48), animated: true });
  }, [phone, symbol]);
  /**
   * ui16b/backend-r19: رمز لا يقدّمه المزوّد (DXY) يصل بسلسلة بذرة حول 104.25 — كان الشارت الرئيسي يرسمها وسعرها برأس
   * الشاشة العريضة كأنها سوق. الآن الإشعار مكان الشارت، والسعر والسبريد «—» كـ`ChartFrame`/`FocusChartModal`.
   * و`series` null = الجلب لم يصل بعد (chart-r47 c): مؤشّر تحميل لا شموع بذرة، ولا وسم مصدر لها.
   */
  const heroNoRealData = series != null && seriesHasNoRealData(series.data_source);
  // chart-r47: الدوّار وحده لا يقول ماذا يُحمَّل — النصّ ظاهر وهو نفسه الـlabel.
  const firstLoadText = t.chartFirstLoad.replace('{symbol}', symbol).replace('{tf}', tf);
  const heroTick = liveTicks[symbol] ?? null;
  const heroNowMs = useTickFreshnessClock(heroTick?.source.as_of ?? null);
  const heroNowSec = heroNowMs / 1000;
  const dsKindLabels = {
    provider: t.dsKindProvider,
    demo: t.dsKindDemo,
    cache: t.dsKindCache,
    unknown: t.dsKindUnknown,
    unavailable: t.dsKindUnavailable,
  };
  const dsTickLabels = { live: t.dsTickLive, demoTick: t.dsTickDemo, lastPrice: t.dsLastPriceWord };
  const heroStatusBits = [
    online ? t.termServerOnline : t.termServerOffline,
    // backend-r1/ui16b: DXY لا يقدّمه المزوّد أصلاً — «تجريبي» العامة توحي بعطلٍ مؤقت. الشارت نفسه صار الإشعار
    // (`chartNotOfferedTitle/Body`)، فالوسم القصير يكفي؛ و`originUnavailableProvider` («الرسم مولَّد للعرض») لم تعد صادقة.
    // ولا وسم تيك: «تيك تجريبي» بجانب «غير متاح» يوحي بسعرٍ ما.
    !series
      ? null
      : heroNoRealData
        ? t.dsKindUnavailable
        : provenanceLabel(normalizeProvenance(series.data_source), dsKindLabels),
    heroTick && !heroNoRealData
      ? tickStatusLabel(heroTick.source, heroTick.source.as_of, heroNowSec, dsTickLabels) ??
        t.termLastPriceWord
      : null,
    marketStatusLabel(symbol, { open: t.dsMarketOpen, closed: t.dsMarketClosed }),
  ].filter(Boolean);

  const topActions = [
    {
      id: 'ind',
      mark: '∑',
      tip: t.termIndicatorsWord,
      run: () => setEdgePanel(edgePanel === 'indicators' ? null : 'indicators'),
    },
    {
      id: 'al',
      mark: '⚡',
      tip: t.termAlertWord,
      run: () => setEdgePanel(edgePanel === 'alerts' ? null : 'alerts'),
    },
    { id: 'rp', mark: '↺', tip: t.refreshBtn, run: () => void onRefresh() },
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
    { id: 'set', mark: '⚙', tip: t.termKindWord, run: () => setShowKinds((v) => !v) },
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
            <TimeframeBar value={tf} onChange={setTf} arabic={rtl} />
          </View>
        ) : null}

        {!phone ? (
          <View style={styles.layoutSwitcher}>
            <View style={styles.layoutSwitcherTag}>
              <Text style={styles.layoutSwitcherTagTop}>{t.termFrameWord}</Text>
              <Text style={styles.layoutSwitcherTagBottom}>{t.termSquareWord}</Text>
            </View>
            {([1, 2, 3, 4] as FrameLayoutCount[]).map((count) => {
              const active = layoutCount === count && layoutShape === 'square';
              return (
                <Pressable
                  accessibilityRole="button"
                  key={`sq-${count}`}
                  style={({ pressed }) => [
                    styles.layoutSwitchBtn,
                    active && styles.layoutSwitchBtnOn,
                    pressed && {
                      opacity: buttons.pressedOpacity,
                      transform: [{ scale: buttons.pressedScale }],
                    },
                  ]}
                  onPress={() => void changeLayout(count, 'square')}
                  accessibilityLabel={`${t.termLayoutSquareA11yPrefix} ${count}`}
                  accessibilityState={{ selected: active }}
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
              <Text style={styles.layoutSwitcherTagTop}>{t.termFrameWord}</Text>
              <Text style={styles.layoutSwitcherTagBottom}>{t.termRectWord}</Text>
            </View>
            {([2, 3, 4] as FrameLayoutCount[]).map((count) => {
              const active = layoutCount === count && layoutShape === 'rect';
              return (
                <Pressable
                  accessibilityRole="button"
                  key={`rect-${count}`}
                  style={({ pressed }) => [
                    styles.layoutSwitchBtn,
                    active && styles.layoutSwitchBtnOn,
                    pressed && {
                      opacity: buttons.pressedOpacity,
                      transform: [{ scale: buttons.pressedScale }],
                    },
                  ]}
                  onPress={() => void changeLayout(count, 'rect')}
                  accessibilityLabel={`${t.termLayoutRectA11yPrefix} ${count}`}
                  accessibilityState={{ selected: active }}
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
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.layoutSwitcherTag,
                layoutShape === 'shadow' && styles.layoutSwitchBtnOn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => void changeLayout(1, 'shadow')}
              accessibilityLabel={t.termShadowFrameA11y}
              accessibilityState={{ selected: layoutShape === 'shadow' }}
            >
              <Text style={styles.layoutSwitcherTagTop}>{t.termFrameWord}</Text>
              <Text
                style={[
                  styles.layoutSwitcherTagBottom,
                  layoutShape === 'shadow' && styles.layoutSwitchNumOn,
                ]}
              >
                {t.termShadowWord}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {!phone && multiCharts ? (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.timeSyncBtn,
              timeSyncActive && styles.timeSyncBtnOn,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={() => void toggleTimeSync()}
            accessibilityLabel={t.termTimeSyncLabel}
            accessibilityState={{ checked: timeSyncActive }}
          >
            <Text style={[styles.timeSyncText, timeSyncActive && styles.timeSyncTextOn]}>
              {t.termTimeSyncLabel}
            </Text>
          </Pressable>
        ) : null}
        {!phone && layoutShape === 'shadow' ? (
          <Text style={styles.timeSyncHint}>{t.termTimeSyncUnavailable}</Text>
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
            <Pressable
              accessibilityRole="button"
              key={a.id}
              style={({ pressed }) => [
                styles.topBtn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={a.run}
              accessibilityLabel={`${t.termToolA11yPrefix}: ${a.tip}`}
            >
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
          {localizedChartKinds(t).map((k) => (
            <Pressable
              accessibilityRole="button"
              key={k.id}
              style={({ pressed }) => [
                styles.kindChip,
                kind === k.id && styles.kindChipOn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => {
                setKind(k.id);
                setShowKinds(false);
              }}
              accessibilityLabel={`${t.termChartKindA11yPrefix}: ${k.label}`}
              accessibilityState={{ selected: kind === k.id }}
            >
              <Text style={[styles.kindText, kind === k.id && styles.kindTextOn]}>{k.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {phone ? (
        <ScrollView
          ref={phoneStripRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.phoneWatchRow}
          style={styles.phoneWatch}
        >
          {phoneStripSymbols.map((sym) => {
            // تغيّر اليوم بنظرة: فقط مع تيك مزوّد مؤكَّد (لا البثّ التجريبي ولا `unknown`) ومرجع إغلاق أمس.
            const tick = liveTicks[sym];
            const chg =
              tick && isVerifiedTickKind(tick.source.kind) ? dailyChange(tick.price, stripDailyRefs[sym]) : null;
            const pctText = chg ? formatPct(chg.pct) : null;
            return (
              <Pressable
                accessibilityRole="button"
                key={sym}
                style={({ pressed }) => [
                  styles.pill,
                  styles.pillRow,
                  symbol === sym && styles.pillOn,
                  pressed && {
                    opacity: buttons.pressedOpacity,
                    transform: [{ scale: buttons.pressedScale }],
                  },
                ]}
                onPress={() => pickSymbol(sym)}
                onLayout={(e) => {
                  phoneStripX.current[sym] = e.nativeEvent.layout.x;
                }}
                accessibilityLabel={`${t.termSymbolA11yPrefix}: ${sym}${pctText ? ` ${pctText}` : ''}`}
                accessibilityState={{ selected: symbol === sym }}
              >
                <Text style={[styles.pillText, symbol === sym && styles.pillTextOn]}>
                  {sym}
                </Text>
                {chg && pctText ? (
                  <Text
                    style={[
                      styles.pillChg,
                      chg.dir === 'up' && styles.pillChgUp,
                      chg.dir === 'down' && styles.pillChgDown,
                    ]}
                  >
                    {chg.dir === 'up' ? '▲' : chg.dir === 'down' ? '▼' : ''}
                    {pctText}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.pill,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={() => setPhoneWatchOpen(true)}
            accessibilityLabel={t.termManageWatchlistLabel}
          >
            <Text style={styles.pillText}>{t.termManageWord}</Text>
          </Pressable>
        </ScrollView>
      ) : null}

      <NewsRiskBanner symbol={symbol} />

      <View style={styles.workspace}>
        {!phone ? (
          <LeftDrawRail
            activeLens={lens}
            activeTool={tool}
            onLens={setLens}
            onTool={(nextTool) => {
              setTool(nextTool);
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
                  <Text style={styles.desktopMarket}>
                    {t.termShadowFrameA11y} · {t.termPrimaryWord} {tf}
                  </Text>
                </View>
              </View>
              <View style={styles.shadowHintBox}>
                <Text style={[styles.shadowHintText, { textAlign: align }]}>
                  {t.termShadowHintText}
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
                <Text style={styles.shadowTfLabel}>{t.termPrimaryWord}</Text>
                {TIMEFRAMES.map((range) => (
                  <Pressable
                    accessibilityRole="button"
                    key={`p-${range}`}
                    style={({ pressed }) => [
                      styles.rangeBtn,
                      tf === range && styles.rangeBtnOn,
                      pressed && {
                        opacity: buttons.pressedOpacity,
                        transform: [{ scale: buttons.pressedScale }],
                      },
                    ]}
                    onPress={() => setTf(range)}
                    accessibilityLabel={`${t.termPrimaryTimeframeA11yPrefix}: ${range}`}
                    accessibilityState={{ selected: tf === range }}
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
                      accessibilityLabel={`${label} ${enabled ? t.enabledWord : t.disabledWord}`}
                      style={({ pressed }) => [
                        styles.shadowToggle,
                        enabled && styles.shadowToggleOn,
                        pressed && {
                          opacity: buttons.pressedOpacity,
                          transform: [{ scale: buttons.pressedScale }],
                        },
                      ]}
                    >
                      <Text
                        style={[styles.shadowToggleText, enabled && styles.shadowToggleTextOn]}
                      >
                        {enabled ? t.termOnWord : t.termOffWord}
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
                          accessibilityRole="button"
                          key={`${label}-${range}`}
                          style={({ pressed }) => [
                            styles.rangeBtn,
                            on && enabled && styles.shadowSecOn,
                            locked && styles.shadowSecLocked,
                            pressed && {
                              opacity: buttons.pressedOpacity,
                              transform: [{ scale: buttons.pressedScale }],
                            },
                          ]}
                          disabled={locked}
                          accessibilityState={{ disabled: locked }}
                          accessibilityLabel={`${label} ${t.termTimeframeWord} ${range}`}
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

            {armedMsg ? (
              <Text style={styles.chartArmed} accessibilityLiveRegion="polite">
                ✓ {armedMsg}
              </Text>
            ) : null}
            <View style={styles.desktopChart}>
              {heroNoRealData ? (
                <ProviderUnavailableNotice symbol={symbol} height={desktopChartHeight} showSwitchHint />
              ) : !series ? (
                <View
                  style={[styles.heroLoading, { height: desktopChartHeight }]}
                  accessible
                  accessibilityRole="progressbar"
                  accessibilityLabel={firstLoadText}
                  accessibilityState={{ busy: true }}
                >
                  <ActivityIndicator color={colors.accent} />
                  <Text style={styles.heroLoadingText} numberOfLines={2}>
                    {firstLoadText}
                  </Text>
                </View>
              ) : (
                <MatrixChart
                  onCreateAlert={alertFromChart}
                  key={`shadow-overlay-${symbol}-${tf}`}
                  onToolChange={setTool}
                  series={series}
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
                    series,
                    liveTicks[symbol] ?? null,
                    {
                      tickAsOf: liveTicks[symbol]?.source.as_of ?? null,
                      timeframe: series.timeframe,
                    }
                  )}
                  liveTickSource={liveTicks[symbol]?.source ?? null}
                  initialTool={tool}
                  initialLens={lens}
                  initialKind={kind}
                  initialIndicators={indicators}
                />
              )}
            </View>

            <View style={styles.rangeBar}>
              <Text style={styles.shadowFooterNote}>
                {[
                  `${t.termPrimaryWord} ${tf}`,
                  ...SHADOW_SLOT_TAGS.flatMap((tag, i) =>
                    shadowEnabled[i] ? [`${tag} ${shadowSlots[i]}`] : []
                  ),
                ].join(' · ')}
              </Text>
              <View style={styles.rangeSpacer} />
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.fullscreenBtn,
                  pressed && {
                    opacity: buttons.pressedOpacity,
                    transform: [{ scale: buttons.pressedScale }],
                  },
                ]}
                onPress={() => openFocus(symbol, tf)}
                accessibilityLabel={t.termOpenFullscreenA11y}
              >
                <Text style={styles.fullscreenText}>{t.termFullscreenLabel}</Text>
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
                  <Text style={styles.desktopMarket}>
                    {t.termFxMarketWord} · {tf}
                  </Text>
                </View>
              </View>
              <View style={styles.desktopOhlc}>
                <Text style={styles.desktopOhlcLabel}>{t.priceWord}</Text>
                <Text style={styles.desktopOhlcValue}>{price > 0 && !heroNoRealData ? formatPrice(price, symbol) : '—'}</Text>
                {(() => {
                  // كان `(change_pct ?? 0) >= 0` يطبع «+0.00%» أخضر لسالب الصفر ولأي حركة دون 0.005%،
                  // و«+0.00%» أخضر كذلك **بلا بيانات أصلاً** (السلسلة لم تصل)، ويطبع نسبة السلسلة
                  // التجريبية (`mockSeries` بعد فشل الشبكة) كأنها تغيّر السوق. الآن `formatPct`
                  // المعتمدة، واللون من الرقم المطبوع، و«—» حين لا نسبة حقيقية.
                  // و`change_pct` نفسها من أول شمعة محمّلة (≈6 أشهر على D، شهر على 4H) ومجمّدة عند الجلب
                  // بجانب سعر حيّ: EURUSD 4H صاعد أسبوعاً وهابط اليوم كان «+3.33%» أخضر هنا و«−0.09%» بالإطار.
                  // الآن تغيّر اليوم من السعر المطبوع نفسه (`headerChangePct`).
                  const pct =
                    series && !isSyntheticProvenance(series.data_source)
                      ? headerChangePct(series, headTick?.price ?? null, headDailyRefs[symbol.toUpperCase()])
                      : null;
                  const dir = pctDirection(pct);
                  return (
                    <Text
                      style={[
                        styles.desktopChange,
                        {
                          color: dir === 'up' ? colors.bull : dir === 'down' ? colors.bear : colors.textDim,
                        },
                      ]}
                    >
                      {pct != null ? formatPct(pct) : '—'}
                    </Text>
                  );
                })()}
                {!heroNoRealData && quote && quote.bid != null && quote.ask != null ? (
                  <Text style={styles.desktopSpread}>
                    {t.termSpreadWord}{' '}
                    {(() => {
                      // بالـpip كلوح العمق (`DomLitePanel`) — الفرق الخام «0.00009» لا يقارَن بسبريد الوسيط
                      const sp = quoteSpreadPips(symbol, quote.bid, quote.ask);
                      return sp != null ? `${sp.toFixed(1)} pip` : formatPrice(quote.ask - quote.bid, symbol);
                    })()}{' '}
                    · {t.termBidLabel}{' '}
                    {formatPrice(quote.bid, symbol)} · {t.termAskLabel} {formatPrice(quote.ask, symbol)}
                  </Text>
                ) : null}
              </View>
              <View style={styles.desktopStatus}>
                <View style={[styles.statusDot, online && styles.statusDotOnline]} />
                <Text style={styles.statusText}>{heroStatusBits.join(' · ')}</Text>
              </View>
            </View>

            {armedMsg ? (
              <Text style={styles.chartArmed} accessibilityLiveRegion="polite">
                ✓ {armedMsg}
              </Text>
            ) : null}
            <View style={styles.desktopChart}>
              {heroNoRealData ? (
                <ProviderUnavailableNotice symbol={symbol} height={desktopChartHeight} showSwitchHint />
              ) : !series ? (
                <View
                  style={[styles.heroLoading, { height: desktopChartHeight }]}
                  accessible
                  accessibilityRole="progressbar"
                  accessibilityLabel={firstLoadText}
                  accessibilityState={{ busy: true }}
                >
                  <ActivityIndicator color={colors.accent} />
                  <Text style={styles.heroLoadingText} numberOfLines={2}>
                    {firstLoadText}
                  </Text>
                </View>
              ) : (
                <MatrixChart
                  onCreateAlert={alertFromChart}
                  // chart-r47: الأداة/النوع/العدسة/المؤشرات تُطبَّق بتأثيرات `MatrixChart` — بالمفتاح كانت تعيد بناءه فيضيع التكبير
                  // والتراجع ويقفز لآخر 80 شمعة. و`onToolChange` يُطفئ «ترند» بالشريط الأيسر حين ينتهي الرسم داخل الشارت.
                  key={`${symbol}-${tf}`}
                  onToolChange={setTool}
                  series={series}
                  height={desktopChartHeight}
                  interactive
                  compactUi
                  persistDrawings
                  panSpeed={panSpeed}
                  accent={symbol === 'DXY' ? colors.dxy : colors.accent}
                  livePrice={livePriceForChart(
                    series,
                    liveTicks[symbol] ?? null,
                    {
                      tickAsOf: liveTicks[symbol]?.source.as_of ?? null,
                      timeframe: series.timeframe,
                    }
                  )}
                  liveTickSource={liveTicks[symbol]?.source ?? null}
                  initialTool={tool}
                  initialLens={lens}
                  initialKind={kind}
                  initialIndicators={indicators}
                />
              )}
            </View>

            <View style={styles.rangeBar}>
              {TIMEFRAMES.map((range) => (
                <Pressable
                  accessibilityRole="button"
                  key={range}
                  style={({ pressed }) => [
                    styles.rangeBtn,
                    tf === range && styles.rangeBtnOn,
                    pressed && {
                      opacity: buttons.pressedOpacity,
                      transform: [{ scale: buttons.pressedScale }],
                    },
                  ]}
                  onPress={() => setTf(range)}
                  accessibilityLabel={`${t.termTimeframeA11yPrefix}: ${range}`}
                  accessibilityState={{ selected: tf === range }}
                >
                  <Text style={styles.rangeText}>{range}</Text>
                </Pressable>
              ))}
              <View style={styles.rangeSpacer} />
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.fullscreenBtn,
                  pressed && {
                    opacity: buttons.pressedOpacity,
                    transform: [{ scale: buttons.pressedScale }],
                  },
                ]}
                onPress={() => openFocus(symbol, tf)}
                accessibilityLabel={t.termOpenFullscreenA11y}
              >
                <Text style={styles.fullscreenText}>{t.termFullscreenLabel}</Text>
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
                        onTimeframeChange={(nextTf) => void changeDxyTf(nextTf)}
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
                      onTimeframeChange={(nextTf) => void changeFrameTf(i, nextTf)}
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
            <Text style={[styles.section, { textAlign: align }]}>
              {phone ? 4 : layoutCount} {t.termSquareFramesHintSuffix}
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
                        onTimeframeChange={(nextTf) => void changeDxyTf(nextTf)}
                        onSymbolChange={(s) => void changeHeroSymbol(s)}
                        phone={phone}
                        panControls
                        fill={phone}
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
                      fill={phone}
                      panSpeed={panSpeed}
                      liveTick={liveTicks[f.symbol] ?? null}
                      onTimeframeChange={(nextTf) => void changeFrameTf(i, nextTf)}
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
            <Text style={styles.hintMove}>{t.termHintMoveText}</Text>
          </ScrollView>
        )}

        {!phone ? (
          <>
            <WatchlistPanel
              activeSymbol={symbol}
              ticks={tickPrices}
              bases={MOCK_BASES}
              demoTicks={demoTickSymbols}
              onPick={(s) => pickSymbol(s)}
              compact={narrowWatch}
              active={screenFocused}
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
        activeTool={tool}
        onTool={(nextTool) => {
          setTool(nextTool);
          if (phone) {
            // لا توجد لوحة رسم جانبية على الهاتف؛ افتح الشارت بملء الشاشة جاهزاً لهذه الأداة
            setDockTab(null);
            openFocus(symbol, tf, { tool: nextTool });
          }
        }}
        activeLens={lens}
        onLens={setLens}
      />

      <MatrixSidePanel
        panel={edgePanel}
        onClose={() => setEdgePanel(null)}
        symbol={symbol}
        timeframe={tf}
        activeIndicators={indicators}
        activeKind={kind}
        onPickDraw={(nextTool) => {
          setTool(nextTool);
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
          <View style={[styles.phoneWatchModalBar, !rtl && styles.phoneWatchModalBarLtr]}>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.phoneWatchClose,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => setPhoneWatchOpen(false)}
              hitSlop={8}
              accessibilityLabel={t.termCloseWatchlistA11y}
            >
              <Text style={styles.phoneWatchCloseText}>{t.closeWord}</Text>
            </Pressable>
            <Text style={styles.phoneWatchModalTitle}>{t.termManageWatchlistLabel}</Text>
          </View>
          <WatchlistPanel
            activeSymbol={symbol}
            ticks={tickPrices}
            bases={MOCK_BASES}
            demoTicks={demoTickSymbols}
            onPick={(next) => {
              pickSymbol(next);
              setPhoneWatchOpen(false);
            }}
            fullWidth
            active={screenFocused}
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
  topBarPhone: { flexWrap: 'wrap', paddingVertical: spacing.xs },
  tfScroll: { flexGrow: 0, flexShrink: 1, maxWidth: 520, minWidth: 200 },
  layoutSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.controlBg,
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
  topDock: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: 2 },
  topBtn: {
    width: 42,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPanel,
  },
  topMark: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
  topTip: { color: colors.textDim, fontSize: 7, fontWeight: '700' },
  kindRow: { gap: 6, padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },  kindChip: {
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
    backgroundColor: colors.chartWorkspaceBg,
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
  desktopQuoteIdentity: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, zIndex: 70 },
  desktopAssetDot: { width: 9, height: 9, borderRadius: 5 },
  desktopMarket: { color: colors.textDim, fontSize: 9, marginTop: 1 },
  desktopOhlc: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  desktopOhlcLabel: { color: colors.textDim, fontSize: 9, fontWeight: '700' },
  desktopOhlcValue: { color: colors.text, fontSize: 13, fontWeight: '800' },
  desktopChange: { fontSize: 11, fontWeight: '900' },
  desktopSpread: { color: colors.textDim, fontSize: 9, fontWeight: '700' },
  desktopStatus: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.warn },
  statusDotOnline: { backgroundColor: colors.bull },
  statusText: { color: colors.textDim, fontSize: 9, fontWeight: '700' },
  desktopChart: { flex: 1, paddingHorizontal: 7, paddingTop: 6 },
  heroLoading: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  heroLoadingText: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: spacing.md },
  chartArmed: {
    color: colors.bull,
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 9,
    paddingTop: 4,
  },
  shadowHintBox: { flex: 1, minWidth: 0, paddingHorizontal: spacing.sm },
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
    backgroundColor: colors.controlBg,
  },
  shadowTfBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
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
    backgroundColor: colors.chartWorkspaceBg,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.borderSoft,
  },
  scrollContent: { padding: spacing.sm, gap: spacing.sm, paddingBottom: spacing.sm },
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
    marginTop: spacing.xs,
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
  phoneWatchRow: { gap: 6, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  phoneWatchModal: { flex: 1, backgroundColor: colors.bg },
  phoneWatchModalBar: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  phoneWatchModalBarLtr: { flexDirection: 'row' },
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
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pillChg: { color: colors.textDim, fontWeight: '800', fontSize: 10 },
  pillChgUp: { color: colors.bull },
  pillChgDown: { color: colors.bear },
});
