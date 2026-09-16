import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  LayoutChangeEvent,
  PanResponder,
  Alert,
  Platform,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { buttons, colors, radii, spacing } from '../theme';
import type { ChartSeries } from '../api';
import {
  loadDrawings,
  saveDrawings,
  clearDrawings,
  subscribeDrawingsSaveError,
} from './drawingStore';
import { compareOverlayPrices } from './compare';
import { withLivePrice } from './liveSeries';
import { computeVolumeProfile, pocPrice, computeTpo } from './volumeProfile';
import { evalPineLite, INDICATOR_LIBRARY } from './pineLite';
import { renko, measureStats, snapPrice } from './renko';
import { kagi } from './kagi';
import { pointFigure } from './pointFigure';
import { rangeBars } from './range';
import { computeCvd, computeFootprint } from './orderflow';
import { loadTemplates, saveTemplate, getTemplatesSaveError, DEFAULT_TEMPLATE } from './chartTemplateStore';
import {
  CHART_KINDS,
  DRAW_TOOLS,
  INDICATORS,
  LENSES,
  type ChartKind,
  type ChartPoint,
  type DrawTool,
  type Drawing,
  type IndicatorId,
  type LensMode,
  withVolume,
} from './types';
import {
  FIB_LEVELS,
  computeAccelerationBands,
  computeAcceleratorOsc,
  computeAccumDist,
  computeAdx,
  computeAdxr,
  computeAlligator,
  computeAlma,
  computeApo,
  computeAroonOsc,
  computeAroonUpDown,
  computeAtr,
  computeAtrPercent,
  computeAveragePrice,
  computeAwesomeOsc,
  computeBearPower,
  computeBollingerBandwidth,
  computeBop,
  computeBullPower,
  computeBwMfi,
  computeCamarillaPivots,
  computeCci,
  computeCfo,
  computeChaikinOsc,
  computeChaikinVolatility,
  computeChandeKrollStop,
  computeChandelierExit,
  computeChoppiness,
  computeCmf,
  computeCmo,
  computeCog,
  computeConnorsRsi,
  computeCoppock,
  computeCutlerRsi,
  computeDemarker,
  computeDemarkPivots,
  computeDisparityIndex,
  computeDma,
  computeDmi,
  computeDonchian,
  computeDonchianWidth,
  computeDpo,
  computeEfficiencyRatio,
  computeElderImpulse,
  computeEnvelopes,
  computeEom,
  computeEwmaVolatility,
  computeFibPivotPoints,
  computeFisherTransform,
  computeForceIndex,
  computeFractalChaosBands,
  computeFractalChaosOsc,
  computeFractals,
  computeFrama,
  computeGannHiLo,
  computeGapo,
  computeGarmanKlassVolatility,
  computeGator,
  computeGmma,
  computeGmmaOscillator,
  computeHistoricalVolatility,
  computeIchimoku,
  computeInverseFisherRsi,
  computeKama,
  computeKeltner,
  computeKeltnerWidth,
  computeKlinger,
  computeKst,
  computeLinRegChannel,
  computeLinRegR2,
  computeLinRegSlope,
  computeLsma,
  computeMacd,
  computeMassIndex,
  computeMcGinleyDynamic,
  computeMedianPrice,
  computeMfi,
  computeMomentum,
  computeNetVolume,
  computeNvi,
  computeObv,
  computeOverlays,
  computeParkinsonVolatility,
  computePercentB,
  computePfe,
  computePgo,
  computePivotPoints,
  computePivotsHighLow,
  computePmo,
  computePpo,
  computePsar,
  computePvi,
  computePvo,
  computeQstick,
  computeRainbowOscillator,
  computeRavi,
  computeRelativeVolatilityIndex,
  computeRmi,
  computeRoc,
  computeRogersSatchellVolatility,
  computeRsi,
  computeRvi,
  computeRwi,
  computeSmi,
  computeSmiErgodicOscillator,
  computeSmma,
  computeSqueeze,
  computeStandardError,
  computeStarcBands,
  computeStc,
  computeStdDev,
  computeStdErrorBands,
  computeStoch,
  computeStochRsi,
  computeSuperTrend,
  computeT3,
  computeTrendIntensityIndex,
  computeTrima,
  computeTrix,
  computeTrueRange,
  computeTsf,
  computeTsi,
  computeTtf,
  computeTwap,
  computeTwiggsMoneyFlow,
  computeTypicalPrice,
  computeUlcerIndex,
  computeUltimateOsc,
  computeVhf,
  computeVidya,
  computeVolatilityRatio,
  computeVolumeOscillator,
  computeVolumeRoc,
  computeVortex,
  computeVpci,
  computeVpt,
  computeVwMacd,
  computeVwap,
  computeVwapBands,
  computeVwma,
  computeVzo,
  computeWaveTrend,
  computeWeightedClose,
  computeWilliamsAd,
  computeWilliamsR,
  computeWoodieCci,
  computeWoodiePivots,
  computeYangZhangVolatility,
  computeZigZag,
  computeZlema,
  formatPrice,
  heikinAshi,
} from './math';
import {
  DEFAULT_PAN_SPEED,
  loadPanSpeed,
  panSpeedMultiplier,
  type PanSpeedPercent,
} from './panSpeed';
import { mapShadowCandles } from './shadowOverlay';

export type SyncTimeWindow = {
  /** unix seconds */
  start: number;
  /** unix seconds */
  end: number;
  /** إزاحة أفقية جزئية كنسبة من عرض الشارت */
  xPanNorm?: number;
  /** تكبير محور السعر */
  priceScale?: number;
  /** إزاحة محور السعر */
  pricePan?: number;
};

/** تحكم خارجي بالسحب (لفريم الظل الموحد) */
export type ChartPanHandle = {
  beginDrag: () => void;
  dragBy: (dx: number, dy: number) => void;
  endDrag: () => void;
  zoomAroundCenter: (factor: number) => void;
  zoomPrice: (factor: number) => void;
};

type Props = {
  series: ChartSeries;
  compareSeries?: ChartSeries | null;
  /** سلاسل ثانوية تظهر كشموع ظل باهتة (1–3) */
  shadowSeries?: ChartSeries[];
  /** اختصارات الطبقات: s صغير · m وسط · b كبير — بنفس ترتيب shadowSeries */
  shadowTags?: string[];
  height?: number;
  interactive?: boolean;
  /** تحريك الشموع والمحاور بدون أدوات الرسم الكاملة */
  panControls?: boolean;
  accent?: string;
  persistDrawings?: boolean;
  livePrice?: number | null;
  /** provenance of livePrice — required for honest merge into candles */
  liveTickSource?: import('../api').DataProvenance | null;
  onCreateAlert?: (price: number) => void;
  initialTool?: DrawTool;
  initialLens?: LensMode;
  initialKind?: ChartKind;
  initialIndicators?: IndicatorId[];
  compactUi?: boolean;
  /** بدون شريط القراءة — للفريمات التي تملأ الارتفاع بالكامل */
  dense?: boolean;
  /** شموع باهتة (لفريمات الظل) */
  mutedCandles?: boolean;
  /** بدون شبكة */
  hideGrid?: boolean;
  /** بدون تسميات محور السعر */
  hidePriceLabels?: boolean;
  /** بدون تواريخ محور الزمن */
  hideTimeLabels?: boolean;
  /** توافق قديم */
  hideGridAndDates?: boolean;
  /** نافذة زمن مشتركة لمزامنة عدة شارتات */
  syncWindow?: SyncTimeWindow | null;
  onSyncWindow?: (next: SyncTimeWindow) => void;
  /** يتبع النافذة فقط بدون سحب مستقل (ظل تابع) */
  syncFollow?: boolean;
  /** نسبة سرعة السحب 1–100 */
  panSpeed?: PanSpeedPercent;
  /** مزامنة زمن فقط (بدون priceScale/pricePan) عند النشر */
  syncTimeOnly?: boolean;
};

type PointerEventLike = {
  nativeEvent?: {
    clientX?: number;
    clientY?: number;
    pageX?: number;
    pageY?: number;
    pointerId?: number;
  };
  currentTarget?: {
    setPointerCapture?: (pointerId: number) => void;
    releasePointerCapture?: (pointerId: number) => void;
  };
  preventDefault?: () => void;
  stopPropagation?: () => void;
};

const LENS_PRESETS: Record<LensMode, IndicatorId[]> = {
  clean: [],
  structure: ['sma20', 'sma50', 'ema21'],
  momentum: ['rsi', 'macd'],
  liquidity: ['volume', 'bb', 'cvd'],
};

const COMPACT_TOOL_ICONS: Record<DrawTool, string> = {
  none: '⌖',
  select: '↖',
  trend: '╱',
  ray: '↗',
  hline: '━',
  vline: '┃',
  rect: '□',
  fib: 'Φ',
  zone: '▤',
  note: 'T',
  measure: '↔',
};

const PRICE_AXIS_WIDTH = 68;
const TIME_AXIS_HEIGHT = 48;
const AR_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

function candleTimeSec(t: number): number {
  return t > 1e12 ? t / 1000 : t;
}

function windowFromPlot(
  plot: { time: number }[],
  extras?: Pick<SyncTimeWindow, 'xPanNorm' | 'priceScale' | 'pricePan'>
): SyncTimeWindow | null {
  if (plot.length < 1) return null;
  const a = candleTimeSec(plot[0]!.time);
  const b = candleTimeSec(plot[plot.length - 1]!.time);
  return {
    start: Math.min(a, b),
    end: Math.max(a, b),
    xPanNorm: extras?.xPanNorm ?? 0,
    priceScale: extras?.priceScale ?? 1,
    pricePan: extras?.pricePan ?? 0,
  };
}

function applyTimeWindowToSeries(
  plot: { time: number }[],
  win: SyncTimeWindow
): { start: number; count: number; offset: number } {
  const n = plot.length;
  if (n < 2) return { start: 0, count: n, offset: 0 };
  let i0 = 0;
  while (i0 < n - 1 && candleTimeSec(plot[i0]!.time) < win.start) i0 += 1;
  let i1 = n - 1;
  while (i1 > i0 && candleTimeSec(plot[i1]!.time) > win.end) i1 -= 1;
  // إن ضاقت النتيجة جداً وسّع حول المركز الزمني
  if (i1 - i0 < 1) {
    const mid = (win.start + win.end) / 2;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(candleTimeSec(plot[i]!.time) - mid);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    i0 = Math.max(0, best - 20);
    i1 = Math.min(n - 1, best + 20);
  }
  const count = Math.max(2, i1 - i0 + 1);
  const end = i0 + count;
  const offset = Math.max(0, n - end);
  return { start: i0, count, offset };
}

function formatAxisTime(unixTime: number, spanSeconds: number): string {
  const milliseconds = unixTime > 1e12 ? unixTime : unixTime * 1000;
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime())) return '';
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const day = date.getDate();
  const mon = AR_MONTHS[date.getMonth()];
  if (spanSeconds <= 2 * 86400) {
    return `${hh}:${mm}\n${day} ${mon}`;
  }
  if (spanSeconds <= 120 * 86400) {
    return `${day} ${mon}`;
  }
  return `${mon} ${date.getFullYear()}`;
}

function pointerXY(event: PointerEventLike): { x: number; y: number; pointerId: number } {
  const native = event.nativeEvent ?? {};
  return {
    x: native.clientX ?? native.pageX ?? 0,
    y: native.clientY ?? native.pageY ?? 0,
    pointerId: native.pointerId ?? 0,
  };
}

function resolveWebNode(ref: React.RefObject<View | null>): HTMLElement | null {
  if (Platform.OS !== 'web') return null;
  const node = ref.current as unknown as
    | (HTMLElement & { getNode?: () => HTMLElement })
    | null;
  if (!node) return null;
  if (typeof node.addEventListener === 'function') return node;
  const nested = node.getNode?.();
  return nested && typeof nested.addEventListener === 'function' ? nested : null;
}

const webAxisLockStyle =
  Platform.OS === 'web'
    ? ({
        // Keep wheel/touch gestures on the axis — do not let the page ScrollView take them.
        touchAction: 'none',
        overscrollBehavior: 'contain',
        userSelect: 'none',
      } as const as object)
    : null;

export const MatrixChart = forwardRef<ChartPanHandle, Props>(function MatrixChart(
  {
  series,
  compareSeries = null,
  shadowSeries = [],
  shadowTags = [],
  height = 280,
  interactive = true,
  panControls,
  accent = colors.accent,
  persistDrawings = true,
  livePrice = null,
  liveTickSource = null,
  onCreateAlert,
  initialTool,
  initialLens,
  initialKind,
  initialIndicators,
  compactUi = false,
  dense = false,
  mutedCandles = false,
  hideGridAndDates = false,
  hideGrid = hideGridAndDates,
  hidePriceLabels = hideGridAndDates,
  hideTimeLabels = hideGridAndDates,
  syncWindow = null,
  onSyncWindow,
  syncFollow = false,
  panSpeed: panSpeedProp,
  syncTimeOnly = false,
}: Props,
  ref
) {
  const canPan = syncFollow ? false : (panControls ?? interactive);
  const candleBull = mutedCandles ? 'rgba(34,197,94,0.34)' : colors.bull;
  const candleBear = mutedCandles ? 'rgba(244,63,94,0.34)' : colors.bear;
  const timeAxisH = hideTimeLabels ? 0 : TIME_AXIS_HEIGHT;
  const syncKeyRef = useRef('');
  /** جلسة نشر نشطة: يُصفَّر المفتاح فقط عند الانتقال من غير ناشر → ناشر */
  const publisherArmedRef = useRef(false);
  const onSyncWindowRef = useRef(onSyncWindow);
  onSyncWindowRef.current = onSyncWindow;
  const syncTimeOnlyRef = useRef(syncTimeOnly);
  syncTimeOnlyRef.current = syncTimeOnly;
  const plotRef = useRef<View>(null);
  const priceAxisRef = useRef<View>(null);
  const timeAxisRef = useRef<View>(null);
  const [storedPanSpeed, setStoredPanSpeed] = useState<PanSpeedPercent>(DEFAULT_PAN_SPEED);
  const panSpeed = panSpeedProp ?? storedPanSpeed;
  const panSpeedMulRef = useRef(panSpeedMultiplier(panSpeed));
  panSpeedMulRef.current = panSpeedMultiplier(panSpeed);
  const [pineFormula, setPineFormula] = useState('');
  const [pineOn, setPineOn] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [kind, setKind] = useState<ChartKind>(initialKind ?? 'candles');
  const [lens, setLens] = useState<LensMode>(initialLens ?? 'clean');
  const [extraInd, setExtraInd] = useState<IndicatorId[]>(initialIndicators ?? []);
  const [tool, setTool] = useState<DrawTool>(initialTool ?? 'none');
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [pending, setPending] = useState<ChartPoint | null>(null);
  const [dragEnd, setDragEnd] = useState<ChartPoint | null>(null);
  const [cross, setCross] = useState<{ index: number; x: number; y: number } | null>(null);
  const [windowCount, setWindowCount] = useState(80);
  const [offset, setOffset] = useState(0);
  const [priceScale, setPriceScale] = useState(1);
  const [pricePan, setPricePan] = useState(0);
  const [xPan, setXPan] = useState(0);
  const [replayOn, setReplayOn] = useState(false);
  const [replayStep, setReplayStep] = useState(15);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [logScale, setLogScale] = useState(false);
  const [magnet, setMagnet] = useState(true);
  const [measureReadout, setMeasureReadout] = useState<string | null>(null);
  const [drawingsSaveError, setDrawingsSaveError] = useState<string | null>(null);
  const [chartW, setChartW] = useState(320);
  const panStartOffset = useRef(0);
  const offsetRef = useRef(0);
  const panStartPoint = useRef({ x: 0, y: 0 });
  const panMoved = useRef(false);
  const chartPressRef = useRef<(x: number, y: number) => void>(() => {});
  const priceScaleRef = useRef(1);
  const priceScaleStart = useRef(1);
  const windowCountRef = useRef(80);
  const timeWindowStart = useRef(80);
  const pricePanRef = useRef(0);
  const xPanRef = useRef(0);
  const panStartPrice = useRef(0);
  const panStartX = useRef(0);
  const webChartPointer = useRef({ active: false, x: 0, y: 0, pointerId: 0 });
  const webPricePointer = useRef({ active: false, y: 0, pointerId: 0 });
  const webTimePointer = useRef({ active: false, x: 0, pointerId: 0 });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rangeRef = useRef({ min: 0, max: 1, span: 1 });
  const chartPlotWRef = useRef(320);
  const chartPlotHRef = useRef(200);
  const sourceRef = useRef({
    plot: [] as { close: number; open: number; high: number; low: number }[],
    start: 0,
    windowLen: 80,
    all: [] as unknown[],
  });

  const indicators = useMemo(() => {
    const set = new Set([...LENS_PRESETS[lens], ...extraInd]);
    return [...set];
  }, [lens, extraInd]);

  const liveSeries = useMemo(
    () =>
      withLivePrice(series, livePrice, liveTickSource, {
        tickAsOf: liveTickSource?.as_of ?? null,
        timeframe: series.timeframe,
      }),
    [series, livePrice, liveTickSource]
  );

  useEffect(() => {
    setOffset(0);
    setWindowCount(80);
    setPriceScale(1);
    setPricePan(0);
    setXPan(0);
    syncKeyRef.current = '';
  }, [series.symbol, series.timeframe]);

  useEffect(() => {
    if (panSpeedProp != null) return;
    let alive = true;
    void loadPanSpeed().then((level) => {
      if (alive) setStoredPanSpeed(level);
    });
    return () => {
      alive = false;
    };
  }, [panSpeedProp]);

  const source = useMemo(() => {
    const all = withVolume(liveSeries.candles);
    let plot =
      kind === 'heikin'
        ? heikinAshi(all)
        : kind === 'renko'
          ? renko(all)
          : kind === 'kagi'
            ? kagi(all)
            : kind === 'pnf'
              ? pointFigure(all)
              : kind === 'range'
                ? rangeBars(all)
                : all;

    // الظل التابع: اقطع مباشرة حسب نافذة زمن القائد
    if (syncFollow && syncWindow && syncWindow.end > syncWindow.start && plot.length >= 2) {
      const applied = applyTimeWindowToSeries(plot, syncWindow);
      const end = plot.length - applied.offset;
      const start = Math.max(0, end - applied.count);
      const windowPlot = plot.slice(start, end);
      return {
        plot: windowPlot.length ? windowPlot : plot.slice(-Math.min(40, plot.length)),
        start,
        all: plot,
        windowLen: Math.max(1, windowPlot.length),
      };
    }

    const end = plot.length - offset;
    const start = Math.max(0, end - windowCount);
    const windowPlot = plot.slice(start, end);
    const windowLen = windowPlot.length;
    const visiblePlot = replayOn
      ? windowPlot.slice(0, Math.max(1, Math.min(replayStep, windowLen)))
      : windowPlot;
    return { plot: visiblePlot, start, all: plot, windowLen };
  }, [
    liveSeries.candles,
    kind,
    windowCount,
    offset,
    replayOn,
    replayStep,
    syncFollow,
    syncWindow?.start,
    syncWindow?.end,
  ]);

  const publishSyncWindow = useCallback(() => {
    if (syncFollow) return;
    const emit = onSyncWindowRef.current;
    if (!emit) return;
    const all = sourceRef.current.all as { time: number }[];
    if (!all.length) return;
    const winLen = Math.max(1, windowCountRef.current);
    const off = offsetRef.current;
    const end = all.length - off;
    const startIdx = Math.max(0, end - winLen);
    const slice = all.slice(startIdx, end);
    if (!slice.length) return;
    const plotW = Math.max(1, chartPlotWRef.current);
    const timeOnly = syncTimeOnlyRef.current;
    const win = windowFromPlot(
      slice,
      timeOnly
        ? { xPanNorm: xPanRef.current / plotW }
        : {
            xPanNorm: xPanRef.current / plotW,
            priceScale: priceScaleRef.current,
            pricePan: pricePanRef.current,
          }
    );
    if (!win || !(win.end > win.start)) return;
    if (timeOnly) {
      delete win.priceScale;
      delete win.pricePan;
    }
    const key = `${win.start}:${win.end}:${(win.xPanNorm ?? 0).toFixed(4)}:${
      timeOnly ? 't' : `${(win.priceScale ?? 1).toFixed(4)}:${(win.pricePan ?? 0).toFixed(4)}`
    }`;
    if (key === syncKeyRef.current) return;
    syncKeyRef.current = key;
    emit(win);
  }, [syncFollow]);

  const syncRafRef = useRef<number | null>(null);
  const schedulePublishSync = useCallback(
    (immediate = false) => {
      if (syncFollow) return;
      if (syncRafRef.current != null) {
        if (!immediate) return;
        cancelAnimationFrame(syncRafRef.current);
        syncRafRef.current = null;
      }
      if (immediate) {
        publishSyncWindow();
        return;
      }
      syncRafRef.current = requestAnimationFrame(() => {
        syncRafRef.current = null;
        publishSyncWindow();
      });
    },
    [syncFollow, publishSyncWindow]
  );

  // نشر أولي عند بدء جلسة الناشر (OFF→ON أو انتقال قيادة) — لا تعتمد على هوية callback
  const hasSyncPublisher = Boolean(onSyncWindow);
  useEffect(() => {
    const canPublish = !syncFollow && hasSyncPublisher;
    if (!canPublish) {
      publisherArmedRef.current = false;
      return;
    }
    if (!source.plot.length) return;
    const sessionStart = !publisherArmedRef.current;
    publisherArmedRef.current = true;
    if (sessionStart) {
      syncKeyRef.current = '';
    }
    const t = setTimeout(() => publishSyncWindow(), 0);
    return () => clearTimeout(t);
  }, [
    syncFollow,
    hasSyncPublisher,
    series.symbol,
    series.timeframe,
    source.windowLen,
    publishSyncWindow,
  ]);

  // عند المتابعة: حاذِ الحالة المحلية مع النافذة الزمنية لإيقاف سلس بلا قفزة كبيرة
  useEffect(() => {
    if (!syncFollow || !syncWindow || !(syncWindow.end > syncWindow.start)) return;
    const all = withVolume(liveSeries.candles);
    if (all.length < 2) return;
    const applied = applyTimeWindowToSeries(all, syncWindow);
    setWindowCount(applied.count);
    setOffset(applied.offset);
  }, [syncFollow, syncWindow?.start, syncWindow?.end, liveSeries.candles]);

  useEffect(
    () => () => {
      if (syncRafRef.current != null) cancelAnimationFrame(syncRafRef.current);
    },
    []
  );

  const volProfile = useMemo(
    () => (indicators.includes('volumeProfile') ? computeVolumeProfile(source.plot, 20) : null),
    [source.plot, indicators]
  );
  const poc = useMemo(() => (volProfile ? pocPrice(volProfile) : null), [volProfile]);
  const pivots = useMemo(
    () => (indicators.includes('pivots') ? computePivotPoints(source.plot, 20) : null),
    [source.plot, indicators]
  );
  const fibPivots = useMemo(
    () => (indicators.includes('fibPivots') ? computeFibPivotPoints(source.plot, 20) : null),
    [source.plot, indicators]
  );
  const camarilla = useMemo(
    () => (indicators.includes('camarilla') ? computeCamarillaPivots(source.plot, 20) : null),
    [source.plot, indicators]
  );
  const woodiePivots = useMemo(
    () => (indicators.includes('woodiePivots') ? computeWoodiePivots(source.plot, 20) : null),
    [source.plot, indicators]
  );
  const demarkPivots = useMemo(
    () => (indicators.includes('demarkPivots') ? computeDemarkPivots(source.plot, 20) : null),
    [source.plot, indicators]
  );
  const tpo = useMemo(
    () => (indicators.includes('tpo') ? computeTpo(source.plot, 18) : null),
    [source.plot, indicators]
  );
  const footprint = useMemo(
    () => (indicators.includes('footprint') ? computeFootprint(source.plot) : null),
    [source.plot, indicators]
  );
  const cvd = useMemo(
    () => (indicators.includes('cvd') ? computeCvd(source.plot) : null),
    [source.plot, indicators]
  );
  const pineLine = useMemo(
    () => (pineOn && pineFormula.trim() ? evalPineLite(pineFormula, source.plot) : []),
    [pineOn, pineFormula, source.plot]
  );

  useEffect(() => {
    if (initialTool) setTool(initialTool);
  }, [initialTool, series.symbol]);

  useEffect(() => {
    if (initialLens) setLens(initialLens);
  }, [initialLens]);

  useEffect(() => {
    if (initialKind) setKind(initialKind);
  }, [initialKind]);

  useEffect(() => {
    if (initialIndicators) setExtraInd(initialIndicators);
  }, [initialIndicators]);

  useEffect(() => {
    if (!replayPlaying || !replayOn) return;
    const id = setInterval(() => {
      setReplayStep((s) => {
        const max = sourceRef.current.windowLen;
        if (s >= max) {
          setReplayPlaying(false);
          return max;
        }
        return s + 1;
      });
    }, 450);
    return () => clearInterval(id);
  }, [replayPlaying, replayOn]);

  useEffect(() => {
    if (!interactive) {
      setPineOn(false);
      setPineFormula('');
      setLens(initialLens ?? 'clean');
      setExtraInd(initialIndicators ?? []);
      return;
    }
    loadTemplates().then((t) => {
      const tpl = t[0] ?? DEFAULT_TEMPLATE;
      setKind(tpl.kind);
      if (!initialLens) setLens(tpl.lens ?? 'clean');
      if (!initialIndicators?.length) setExtraInd(tpl.indicators ?? []);
      // Pine اختياري — لا نفعّله تلقائياً من القالب
      setPineFormula(tpl.pineFormula || '');
      setPineOn(false);
      setLogScale(tpl.logScale);
      setMagnet(tpl.magnet);
    });
  }, [series.symbol, interactive, initialLens, initialIndicators]);

  useEffect(() => {
    if (!persistDrawings || !interactive) return;
    let alive = true;
    loadDrawings(series.symbol, series.timeframe).then((d) => {
      if (alive) setDrawings(d);
    });
    return () => {
      alive = false;
    };
  }, [series.symbol, series.timeframe, persistDrawings, interactive]);

  useEffect(() => {
    if (!persistDrawings || !interactive) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveDrawings(series.symbol, series.timeframe, drawings);
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [drawings, series.symbol, series.timeframe, persistDrawings, interactive]);

  useEffect(() => {
    const unsub = subscribeDrawingsSaveError(setDrawingsSaveError);
    return () => {
      unsub();
    };
  }, []);

  const comparePrices = useMemo(() => {
    if (!compareSeries?.candles?.length) return null;
    return compareOverlayPrices(source.plot, compareSeries.candles.slice(-source.plot.length));
  }, [compareSeries, source.plot]);

  const shadowLayers = useMemo(() => {
    if (!shadowSeries.length || !source.plot.length) return [];
    const defaultTags = ['s', 'm', 'b'];
    return shadowSeries
      .slice(0, 3)
      .map((sec, layer) => ({
        layer,
        tag: (shadowTags[layer] || defaultTags[layer] || `${layer + 1}`).toLowerCase(),
        timeframe: sec.timeframe,
        candles:
          (sec.candles?.length ?? 0) > 0
            ? mapShadowCandles(source.plot, sec.candles, layer)
            : [],
      }))
      .filter((x) => x.candles.length > 0);
  }, [shadowSeries, shadowTags, source.plot]);

  const closes = source.plot.map((c) => c.close);
  const overlays = useMemo(() => computeOverlays(closes), [closes]);
  const rsi = useMemo(
    () => (indicators.includes('rsi') ? computeRsi(closes) : null),
    [closes, indicators]
  );
  const macd = useMemo(
    () => (indicators.includes('macd') ? computeMacd(closes) : null),
    [closes, indicators]
  );
  const stoch = useMemo(
    () => (indicators.includes('stoch') ? computeStoch(source.plot) : null),
    [source.plot, indicators]
  );
  const atr = useMemo(
    () => (indicators.includes('atr') ? computeAtr(source.plot) : null),
    [source.plot, indicators]
  );
  const willr = useMemo(
    () => (indicators.includes('willr') ? computeWilliamsR(source.plot) : null),
    [source.plot, indicators]
  );
  const cci = useMemo(
    () => (indicators.includes('cci') ? computeCci(source.plot) : null),
    [source.plot, indicators]
  );
  const roc = useMemo(
    () => (indicators.includes('roc') ? computeRoc(closes) : null),
    [closes, indicators]
  );
  const vwap = useMemo(
    () => (indicators.includes('vwap') ? computeVwap(source.plot) : null),
    [source.plot, indicators]
  );
  const vwapBands = useMemo(
    () => (indicators.includes('vwapBands') ? computeVwapBands(source.plot) : null),
    [source.plot, indicators]
  );
  const twap = useMemo(
    () => (indicators.includes('twap') ? computeTwap(source.plot) : null),
    [source.plot, indicators]
  );
  const obv = useMemo(
    () => (indicators.includes('obv') ? computeObv(source.plot) : null),
    [source.plot, indicators]
  );
  const mfi = useMemo(
    () => (indicators.includes('mfi') ? computeMfi(source.plot) : null),
    [source.plot, indicators]
  );
  const adx = useMemo(
    () => (indicators.includes('adx') ? computeAdx(source.plot) : null),
    [source.plot, indicators]
  );
  const psar = useMemo(
    () => (indicators.includes('psar') ? computePsar(source.plot) : null),
    [source.plot, indicators]
  );
  const gannHiLo = useMemo(
    () => (indicators.includes('gannHiLo') ? computeGannHiLo(source.plot) : null),
    [source.plot, indicators]
  );
  const stddev = useMemo(
    () => (indicators.includes('stddev') ? computeStdDev(closes) : null),
    [closes, indicators]
  );
  const aroon = useMemo(
    () => (indicators.includes('aroon') ? computeAroonOsc(source.plot) : null),
    [source.plot, indicators]
  );
  const cmf = useMemo(
    () => (indicators.includes('cmf') ? computeCmf(source.plot) : null),
    [source.plot, indicators]
  );
  const supertrend = useMemo(
    () => (indicators.includes('supertrend') ? computeSuperTrend(source.plot) : null),
    [source.plot, indicators]
  );
  const keltner = useMemo(
    () => (indicators.includes('keltner') ? computeKeltner(source.plot) : null),
    [source.plot, indicators]
  );
  const envelopes = useMemo(
    () => (indicators.includes('envelopes') ? computeEnvelopes(closes) : null),
    [closes, indicators]
  );
  const donchian = useMemo(
    () => (indicators.includes('donchian') ? computeDonchian(source.plot) : null),
    [source.plot, indicators]
  );
  const ultimateOsc = useMemo(
    () => (indicators.includes('ultimateOsc') ? computeUltimateOsc(source.plot) : null),
    [source.plot, indicators]
  );
  const cmo = useMemo(
    () => (indicators.includes('cmo') ? computeCmo(closes) : null),
    [closes, indicators]
  );
  const trix = useMemo(
    () => (indicators.includes('trix') ? computeTrix(closes) : null),
    [closes, indicators]
  );
  const force = useMemo(
    () => (indicators.includes('force') ? computeForceIndex(source.plot) : null),
    [source.plot, indicators]
  );
  const chaikinOsc = useMemo(
    () => (indicators.includes('chaikinOsc') ? computeChaikinOsc(source.plot) : null),
    [source.plot, indicators]
  );
  const dpo = useMemo(
    () => (indicators.includes('dpo') ? computeDpo(closes) : null),
    [closes, indicators]
  );
  const ao = useMemo(
    () => (indicators.includes('ao') ? computeAwesomeOsc(source.plot) : null),
    [source.plot, indicators]
  );
  const ac = useMemo(
    () => (indicators.includes('ac') ? computeAcceleratorOsc(source.plot) : null),
    [source.plot, indicators]
  );
  const bop = useMemo(
    () => (indicators.includes('bop') ? computeBop(source.plot) : null),
    [source.plot, indicators]
  );
  const bullPower = useMemo(
    () => (indicators.includes('bullPower') ? computeBullPower(source.plot) : null),
    [source.plot, indicators]
  );
  const bearPower = useMemo(
    () => (indicators.includes('bearPower') ? computeBearPower(source.plot) : null),
    [source.plot, indicators]
  );
  const tsi = useMemo(
    () => (indicators.includes('tsi') ? computeTsi(closes) : null),
    [closes, indicators]
  );
  const coppock = useMemo(
    () => (indicators.includes('coppock') ? computeCoppock(closes) : null),
    [closes, indicators]
  );
  const eom = useMemo(
    () => (indicators.includes('eom') ? computeEom(source.plot) : null),
    [source.plot, indicators]
  );
  const nvi = useMemo(
    () => (indicators.includes('nvi') ? computeNvi(source.plot) : null),
    [source.plot, indicators]
  );
  const massIndex = useMemo(
    () => (indicators.includes('massIndex') ? computeMassIndex(source.plot) : null),
    [source.plot, indicators]
  );
  const ppo = useMemo(
    () => (indicators.includes('ppo') ? computePpo(closes) : null),
    [closes, indicators]
  );
  const chaikinVol = useMemo(
    () => (indicators.includes('chaikinVol') ? computeChaikinVolatility(source.plot) : null),
    [source.plot, indicators]
  );
  const qstick = useMemo(
    () => (indicators.includes('qstick') ? computeQstick(source.plot) : null),
    [source.plot, indicators]
  );
  const chop = useMemo(
    () => (indicators.includes('chop') ? computeChoppiness(source.plot) : null),
    [source.plot, indicators]
  );
  const bwmfi = useMemo(
    () => (indicators.includes('bwmfi') ? computeBwMfi(source.plot) : null),
    [source.plot, indicators]
  );
  const pvo = useMemo(
    () => (indicators.includes('pvo') ? computePvo(source.plot) : null),
    [source.plot, indicators]
  );
  const apo = useMemo(
    () => (indicators.includes('apo') ? computeApo(closes) : null),
    [closes, indicators]
  );
  const vo = useMemo(
    () => (indicators.includes('vo') ? computeVolumeOscillator(source.plot) : null),
    [source.plot, indicators]
  );
  const vpt = useMemo(
    () => (indicators.includes('vpt') ? computeVpt(source.plot) : null),
    [source.plot, indicators]
  );
  const hv = useMemo(
    () => (indicators.includes('hv') ? computeHistoricalVolatility(closes) : null),
    [closes, indicators]
  );
  const stochRsi = useMemo(
    () => (indicators.includes('stochRsi') ? computeStochRsi(closes) : null),
    [closes, indicators]
  );
  const rvi = useMemo(
    () => (indicators.includes('rvi') ? computeRvi(source.plot) : null),
    [source.plot, indicators]
  );
  const linRegSlope = useMemo(
    () => (indicators.includes('linRegSlope') ? computeLinRegSlope(closes) : null),
    [closes, indicators]
  );
  const linRegR2 = useMemo(
    () => (indicators.includes('linRegR2') ? computeLinRegR2(closes) : null),
    [closes, indicators]
  );
  const percentB = useMemo(
    () => (indicators.includes('percentB') ? computePercentB(closes) : null),
    [closes, indicators]
  );
  const bbw = useMemo(
    () => (indicators.includes('bbw') ? computeBollingerBandwidth(closes) : null),
    [closes, indicators]
  );
  const medianPrice = useMemo(
    () => (indicators.includes('medianPrice') ? computeMedianPrice(source.plot) : null),
    [source.plot, indicators]
  );
  const typicalPrice = useMemo(
    () => (indicators.includes('typicalPrice') ? computeTypicalPrice(source.plot) : null),
    [source.plot, indicators]
  );
  const weightedClose = useMemo(
    () => (indicators.includes('weightedClose') ? computeWeightedClose(source.plot) : null),
    [source.plot, indicators]
  );
  const mcginley = useMemo(
    () => (indicators.includes('mcginley') ? computeMcGinleyDynamic(closes) : null),
    [closes, indicators]
  );
  const lsma = useMemo(
    () => (indicators.includes('lsma') ? computeLsma(closes) : null),
    [closes, indicators]
  );
  const tsf = useMemo(
    () => (indicators.includes('tsf') ? computeTsf(closes) : null),
    [closes, indicators]
  );
  const linRegChannel = useMemo(
    () => (indicators.includes('linRegChannel') ? computeLinRegChannel(closes) : null),
    [closes, indicators]
  );
  const momentum = useMemo(
    () => (indicators.includes('momentum') ? computeMomentum(closes) : null),
    [closes, indicators]
  );
  const vhf = useMemo(
    () => (indicators.includes('vhf') ? computeVhf(closes) : null),
    [closes, indicators]
  );
  const pvi = useMemo(
    () => (indicators.includes('pvi') ? computePvi(source.plot) : null),
    [source.plot, indicators]
  );
  const ravi = useMemo(
    () => (indicators.includes('ravi') ? computeRavi(closes) : null),
    [closes, indicators]
  );
  const ulcer = useMemo(
    () => (indicators.includes('ulcer') ? computeUlcerIndex(closes) : null),
    [closes, indicators]
  );
  const fisher = useMemo(
    () => (indicators.includes('fisher') ? computeFisherTransform(source.plot) : null),
    [source.plot, indicators]
  );
  const kst = useMemo(
    () => (indicators.includes('kst') ? computeKst(closes) : null),
    [closes, indicators]
  );
  const vortex = useMemo(
    () => (indicators.includes('vortex') ? computeVortex(source.plot) : null),
    [source.plot, indicators]
  );
  const klinger = useMemo(
    () => (indicators.includes('klinger') ? computeKlinger(source.plot) : null),
    [source.plot, indicators]
  );
  const ichimoku = useMemo(
    () => (indicators.includes('ichimoku') ? computeIchimoku(source.plot) : null),
    [source.plot, indicators]
  );
  const alligator = useMemo(
    () => (indicators.includes('alligator') ? computeAlligator(source.plot) : null),
    [source.plot, indicators]
  );
  const gator = useMemo(() => {
    if (!indicators.includes('gator')) return null;
    const alli = alligator ?? computeAlligator(source.plot);
    return computeGator(alli.jaw, alli.teeth, alli.lips);
  }, [source.plot, indicators, alligator]);
  const vwma = useMemo(
    () => (indicators.includes('vwma') ? computeVwma(source.plot) : null),
    [source.plot, indicators]
  );
  const alma = useMemo(
    () => (indicators.includes('alma') ? computeAlma(closes) : null),
    [closes, indicators]
  );
  const chandeKroll = useMemo(
    () => (indicators.includes('chandeKroll') ? computeChandeKrollStop(source.plot) : null),
    [source.plot, indicators]
  );
  const smi = useMemo(
    () => (indicators.includes('smi') ? computeSmi(source.plot) : null),
    [source.plot, indicators]
  );
  const smiErgodic = useMemo(
    () =>
      indicators.includes('smiErgodic') ? computeSmiErgodicOscillator(source.plot) : null,
    [source.plot, indicators]
  );
  const dmi = useMemo(
    () => (indicators.includes('dmi') ? computeDmi(source.plot) : null),
    [source.plot, indicators]
  );
  const chandelierExit = useMemo(
    () => (indicators.includes('chandelierExit') ? computeChandelierExit(source.plot) : null),
    [source.plot, indicators]
  );
  const gmma = useMemo(
    () => (indicators.includes('gmma') ? computeGmma(closes) : null),
    [closes, indicators]
  );
  const rwi = useMemo(
    () => (indicators.includes('rwi') ? computeRwi(source.plot) : null),
    [source.plot, indicators]
  );
  const aroonUpDown = useMemo(
    () => (indicators.includes('aroonUpDown') ? computeAroonUpDown(source.plot) : null),
    [source.plot, indicators]
  );
  const zigzag = useMemo(
    () => (indicators.includes('zigzag') ? computeZigZag(closes) : null),
    [closes, indicators]
  );
  const adl = useMemo(
    () => (indicators.includes('adl') ? computeAccumDist(source.plot) : null),
    [source.plot, indicators]
  );
  const fractals = useMemo(
    () => (indicators.includes('fractals') ? computeFractals(source.plot) : null),
    [source.plot, indicators]
  );
  const fractalChaosOsc = useMemo(
    () => (indicators.includes('fractalChaosOsc') ? computeFractalChaosOsc(source.plot) : null),
    [source.plot, indicators]
  );
  const fractalChaosBands = useMemo(
    () => (indicators.includes('fractalChaosBands') ? computeFractalChaosBands(source.plot) : null),
    [source.plot, indicators]
  );
  const elderImpulse = useMemo(
    () => (indicators.includes('elderImpulse') ? computeElderImpulse(source.plot) : null),
    [source.plot, indicators]
  );
  const t3 = useMemo(
    () => (indicators.includes('t3') ? computeT3(closes) : null),
    [closes, indicators]
  );
  const rvix = useMemo(
    () => (indicators.includes('rvix') ? computeRelativeVolatilityIndex(closes) : null),
    [closes, indicators]
  );
  const smma20 = useMemo(
    () => (indicators.includes('smma20') ? computeSmma(closes) : null),
    [closes, indicators]
  );
  const kama = useMemo(
    () => (indicators.includes('kama') ? computeKama(closes) : null),
    [closes, indicators]
  );
  const frama = useMemo(
    () => (indicators.includes('frama') ? computeFrama(source.plot) : null),
    [source.plot, indicators]
  );
  const parkinsonVol = useMemo(
    () => (indicators.includes('parkinsonVol') ? computeParkinsonVolatility(source.plot) : null),
    [source.plot, indicators]
  );
  const garmanKlassVol = useMemo(
    () => (indicators.includes('garmanKlassVol') ? computeGarmanKlassVolatility(source.plot) : null),
    [source.plot, indicators]
  );
  const rogersSatchellVol = useMemo(
    () =>
      indicators.includes('rogersSatchellVol') ? computeRogersSatchellVolatility(source.plot) : null,
    [source.plot, indicators]
  );
  const yangZhangVol = useMemo(
    () =>
      indicators.includes('yangZhangVol') ? computeYangZhangVolatility(source.plot) : null,
    [source.plot, indicators]
  );
  const stc = useMemo(
    () => (indicators.includes('stc') ? computeStc(closes) : null),
    [closes, indicators]
  );
  const zlema = useMemo(
    () => (indicators.includes('zlema') ? computeZlema(closes) : null),
    [closes, indicators]
  );
  const cog = useMemo(
    () => (indicators.includes('cog') ? computeCog(source.plot) : null),
    [source.plot, indicators]
  );
  const squeeze = useMemo(
    () => (indicators.includes('squeeze') ? computeSqueeze(source.plot) : null),
    [source.plot, indicators]
  );
  const netVolume = useMemo(
    () => (indicators.includes('netVolume') ? computeNetVolume(source.plot) : null),
    [source.plot, indicators]
  );
  const pivotsHL = useMemo(
    () => (indicators.includes('pivotsHL') ? computePivotsHighLow(source.plot) : null),
    [source.plot, indicators]
  );
  const woodieCci = useMemo(
    () => (indicators.includes('woodieCci') ? computeWoodieCci(source.plot) : null),
    [source.plot, indicators]
  );
  const stdErrorBands = useMemo(
    () => (indicators.includes('stdErrorBands') ? computeStdErrorBands(closes) : null),
    [closes, indicators]
  );
  const donchianWidth = useMemo(
    () => (indicators.includes('donchianWidth') ? computeDonchianWidth(source.plot) : null),
    [source.plot, indicators]
  );
  const connorsRsi = useMemo(
    () => (indicators.includes('connorsRsi') ? computeConnorsRsi(closes) : null),
    [closes, indicators]
  );
  const keltnerWidth = useMemo(
    () => (indicators.includes('keltnerWidth') ? computeKeltnerWidth(source.plot) : null),
    [source.plot, indicators]
  );
  const cfo = useMemo(
    () => (indicators.includes('cfo') ? computeCfo(closes) : null),
    [closes, indicators]
  );
  const vwMacd = useMemo(
    () => (indicators.includes('vwMacd') ? computeVwMacd(source.plot) : null),
    [source.plot, indicators]
  );
  const disparityIndex = useMemo(
    () => (indicators.includes('disparityIndex') ? computeDisparityIndex(closes) : null),
    [closes, indicators]
  );
  const tii = useMemo(
    () => (indicators.includes('tii') ? computeTrendIntensityIndex(closes) : null),
    [closes, indicators]
  );
  const demarker = useMemo(
    () => (indicators.includes('demarker') ? computeDemarker(source.plot) : null),
    [source.plot, indicators]
  );
  const rmi = useMemo(
    () => (indicators.includes('rmi') ? computeRmi(closes) : null),
    [closes, indicators]
  );
  const pgo = useMemo(
    () => (indicators.includes('pgo') ? computePgo(source.plot) : null),
    [source.plot, indicators]
  );
  const twiggsMoneyFlow = useMemo(
    () => (indicators.includes('twiggsMoneyFlow') ? computeTwiggsMoneyFlow(source.plot) : null),
    [source.plot, indicators]
  );
  const vzo = useMemo(
    () => (indicators.includes('vzo') ? computeVzo(source.plot) : null),
    [source.plot, indicators]
  );
  const avgPrice = useMemo(
    () => (indicators.includes('avgPrice') ? computeAveragePrice(source.plot) : null),
    [source.plot, indicators]
  );
  const atrp = useMemo(
    () => (indicators.includes('atrp') ? computeAtrPercent(source.plot) : null),
    [source.plot, indicators]
  );
  const vidya = useMemo(
    () => (indicators.includes('vidya') ? computeVidya(closes) : null),
    [closes, indicators]
  );
  const gmmaOsc = useMemo(() => {
    if (!indicators.includes('gmmaOsc')) return null;
    const g = gmma ?? computeGmma(closes);
    return computeGmmaOscillator(g.shortLines, g.longLines);
  }, [closes, indicators, gmma]);
  const iftRsi = useMemo(
    () => (indicators.includes('iftRsi') ? computeInverseFisherRsi(closes) : null),
    [closes, indicators]
  );
  const waveTrend = useMemo(
    () => (indicators.includes('waveTrend') ? computeWaveTrend(source.plot) : null),
    [source.plot, indicators]
  );
  const accelBands = useMemo(
    () => (indicators.includes('accelBands') ? computeAccelerationBands(source.plot) : null),
    [source.plot, indicators]
  );
  const cutlerRsi = useMemo(
    () => (indicators.includes('cutlerRsi') ? computeCutlerRsi(closes) : null),
    [closes, indicators]
  );
  const starcBands = useMemo(
    () => (indicators.includes('starcBands') ? computeStarcBands(source.plot) : null),
    [source.plot, indicators]
  );
  const pmo = useMemo(
    () => (indicators.includes('pmo') ? computePmo(closes) : null),
    [closes, indicators]
  );
  const trueRange = useMemo(
    () => (indicators.includes('trueRange') ? computeTrueRange(source.plot) : null),
    [source.plot, indicators]
  );
  const stdError = useMemo(
    () => (indicators.includes('stdError') ? computeStandardError(closes) : null),
    [closes, indicators]
  );
  const ewmaVol = useMemo(
    () => (indicators.includes('ewmaVol') ? computeEwmaVolatility(closes) : null),
    [closes, indicators]
  );
  const volRoc = useMemo(
    () => (indicators.includes('volRoc') ? computeVolumeRoc(source.plot) : null),
    [source.plot, indicators]
  );
  const adxr = useMemo(
    () => (indicators.includes('adxr') ? computeAdxr(source.plot) : null),
    [source.plot, indicators]
  );
  const volatilityRatio = useMemo(
    () => (indicators.includes('volatilityRatio') ? computeVolatilityRatio(source.plot) : null),
    [source.plot, indicators]
  );
  const williamsAd = useMemo(
    () => (indicators.includes('williamsAd') ? computeWilliamsAd(source.plot) : null),
    [source.plot, indicators]
  );
  const gapo = useMemo(
    () => (indicators.includes('gapo') ? computeGapo(source.plot) : null),
    [source.plot, indicators]
  );
  const pfe = useMemo(
    () => (indicators.includes('pfe') ? computePfe(closes) : null),
    [closes, indicators]
  );
  const dma = useMemo(
    () => (indicators.includes('dma') ? computeDma(closes) : null),
    [closes, indicators]
  );
  const rainbowOsc = useMemo(
    () => (indicators.includes('rainbowOsc') ? computeRainbowOscillator(closes) : null),
    [closes, indicators]
  );
  const trima = useMemo(
    () => (indicators.includes('trima') ? computeTrima(closes) : null),
    [closes, indicators]
  );
  const efficiencyRatio = useMemo(
    () => (indicators.includes('efficiencyRatio') ? computeEfficiencyRatio(closes) : null),
    [closes, indicators]
  );
  const vpci = useMemo(
    () => (indicators.includes('vpci') ? computeVpci(source.plot) : null),
    [source.plot, indicators]
  );
  const ttf = useMemo(
    () => (indicators.includes('ttf') ? computeTtf(source.plot) : null),
    [source.plot, indicators]
  );

  const paneCount =
    (indicators.includes('volume') ? 1 : 0) +
    (indicators.includes('rsi') ? 1 : 0) +
    (indicators.includes('macd') ? 1 : 0) +
    (indicators.includes('stoch') ? 1 : 0) +
    (indicators.includes('atr') ? 1 : 0) +
    (indicators.includes('willr') ? 1 : 0) +
    (indicators.includes('cci') ? 1 : 0) +
    (indicators.includes('roc') ? 1 : 0) +
    (indicators.includes('obv') ? 1 : 0) +
    (indicators.includes('mfi') ? 1 : 0) +
    (indicators.includes('adx') ? 1 : 0) +
    (indicators.includes('stddev') ? 1 : 0) +
    (indicators.includes('aroon') ? 1 : 0) +
    (indicators.includes('cmf') ? 1 : 0) +
    (indicators.includes('ultimateOsc') ? 1 : 0) +
    (indicators.includes('cmo') ? 1 : 0) +
    (indicators.includes('trix') ? 1 : 0) +
    (indicators.includes('force') ? 1 : 0) +
    (indicators.includes('chaikinOsc') ? 1 : 0) +
    (indicators.includes('dpo') ? 1 : 0) +
    (indicators.includes('ao') ? 1 : 0) +
    (indicators.includes('ac') ? 1 : 0) +
    (indicators.includes('bop') ? 1 : 0) +
    (indicators.includes('bullPower') ? 1 : 0) +
    (indicators.includes('bearPower') ? 1 : 0) +
    (indicators.includes('tsi') ? 1 : 0) +
    (indicators.includes('coppock') ? 1 : 0) +
    (indicators.includes('eom') ? 1 : 0) +
    (indicators.includes('nvi') ? 1 : 0) +
    (indicators.includes('massIndex') ? 1 : 0) +
    (indicators.includes('ppo') ? 1 : 0) +
    (indicators.includes('chaikinVol') ? 1 : 0) +
    (indicators.includes('qstick') ? 1 : 0) +
    (indicators.includes('chop') ? 1 : 0) +
    (indicators.includes('bwmfi') ? 1 : 0) +
    (indicators.includes('pvo') ? 1 : 0) +
    (indicators.includes('apo') ? 1 : 0) +
    (indicators.includes('vo') ? 1 : 0) +
    (indicators.includes('vpt') ? 1 : 0) +
    (indicators.includes('hv') ? 1 : 0) +
    (indicators.includes('stochRsi') ? 1 : 0) +
    (indicators.includes('rvi') ? 1 : 0) +
    (indicators.includes('linRegSlope') ? 1 : 0) +
    (indicators.includes('linRegR2') ? 1 : 0) +
    (indicators.includes('percentB') ? 1 : 0) +
    (indicators.includes('bbw') ? 1 : 0) +
    (indicators.includes('momentum') ? 1 : 0) +
    (indicators.includes('vhf') ? 1 : 0) +
    (indicators.includes('pvi') ? 1 : 0) +
    (indicators.includes('ravi') ? 1 : 0) +
    (indicators.includes('ulcer') ? 1 : 0) +
    (indicators.includes('fisher') ? 1 : 0) +
    (indicators.includes('kst') ? 1 : 0) +
    (indicators.includes('vortex') ? 1 : 0) +
    (indicators.includes('klinger') ? 1 : 0) +
    (indicators.includes('gator') ? 1 : 0) +
    (indicators.includes('smi') ? 1 : 0) +
    (indicators.includes('dmi') ? 1 : 0) +
    (indicators.includes('rwi') ? 1 : 0) +
    (indicators.includes('aroonUpDown') ? 1 : 0) +
    (indicators.includes('adl') ? 1 : 0) +
    (indicators.includes('rvix') ? 1 : 0) +
    (indicators.includes('stc') ? 1 : 0) +
    (indicators.includes('cog') ? 1 : 0) +
    (indicators.includes('squeeze') ? 1 : 0) +
    (indicators.includes('netVolume') ? 1 : 0) +
    (indicators.includes('woodieCci') ? 1 : 0) +
    (indicators.includes('donchianWidth') ? 1 : 0) +
    (indicators.includes('connorsRsi') ? 1 : 0) +
    (indicators.includes('keltnerWidth') ? 1 : 0) +
    (indicators.includes('cfo') ? 1 : 0) +
    (indicators.includes('vwMacd') ? 1 : 0) +
    (indicators.includes('disparityIndex') ? 1 : 0) +
    (indicators.includes('tii') ? 1 : 0) +
    (indicators.includes('demarker') ? 1 : 0) +
    (indicators.includes('rmi') ? 1 : 0) +
    (indicators.includes('pgo') ? 1 : 0) +
    (indicators.includes('twiggsMoneyFlow') ? 1 : 0) +
    (indicators.includes('vzo') ? 1 : 0) +
    (indicators.includes('atrp') ? 1 : 0) +
    (indicators.includes('gmmaOsc') ? 1 : 0) +
    (indicators.includes('iftRsi') ? 1 : 0) +
    (indicators.includes('waveTrend') ? 1 : 0) +
    (indicators.includes('cutlerRsi') ? 1 : 0) +
    (indicators.includes('cvd') ? 1 : 0) +
    (indicators.includes('parkinsonVol') ? 1 : 0) +
    (indicators.includes('garmanKlassVol') ? 1 : 0) +
    (indicators.includes('rogersSatchellVol') ? 1 : 0) +
    (indicators.includes('yangZhangVol') ? 1 : 0) +
    (indicators.includes('smiErgodic') ? 1 : 0) +
    (indicators.includes('pmo') ? 1 : 0) +
    (indicators.includes('trueRange') ? 1 : 0) +
    (indicators.includes('stdError') ? 1 : 0) +
    (indicators.includes('ewmaVol') ? 1 : 0) +
    (indicators.includes('volRoc') ? 1 : 0) +
    (indicators.includes('adxr') ? 1 : 0) +
    (indicators.includes('volatilityRatio') ? 1 : 0) +
    (indicators.includes('williamsAd') ? 1 : 0) +
    (indicators.includes('fractalChaosOsc') ? 1 : 0) +
    (indicators.includes('gapo') ? 1 : 0) +
    (indicators.includes('pfe') ? 1 : 0) +
    (indicators.includes('rainbowOsc') ? 1 : 0) +
    (indicators.includes('efficiencyRatio') ? 1 : 0) +
    (indicators.includes('vpci') ? 1 : 0) +
    (indicators.includes('ttf') ? 1 : 0);

  const mainH = Math.max(140, height - paneCount * 52 - (interactive ? 8 : 0));
  const paneH = 48;

  const range = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    const push = (v: number | null | undefined) => {
      if (v == null || Number.isNaN(v)) return;
      const p = logScale ? Math.log(Math.max(v, 1e-12)) : v;
      min = Math.min(min, p);
      max = Math.max(max, p);
    };
    for (const c of source.plot) {
      push(c.low);
      push(c.high);
    }
    if (indicators.includes('sma20')) overlays.sma20.forEach(push);
    if (indicators.includes('sma50')) overlays.sma50.forEach(push);
    if (indicators.includes('ema21')) overlays.ema21.forEach(push);
    if (indicators.includes('wma20')) overlays.wma20.forEach(push);
    if (indicators.includes('dema20')) overlays.dema20.forEach(push);
    if (indicators.includes('tema20')) overlays.tema20.forEach(push);
    if (indicators.includes('hma20')) overlays.hma20.forEach(push);
    if (indicators.includes('vwap') && vwap) vwap.forEach(push);
    if (indicators.includes('twap') && twap) twap.forEach(push);
    if (indicators.includes('psar') && psar) psar.forEach(push);
    if (indicators.includes('gannHiLo') && gannHiLo) gannHiLo.forEach(push);
    if (indicators.includes('medianPrice') && medianPrice) medianPrice.forEach(push);
    if (indicators.includes('typicalPrice') && typicalPrice) typicalPrice.forEach(push);
    if (indicators.includes('weightedClose') && weightedClose) weightedClose.forEach(push);
    if (indicators.includes('mcginley') && mcginley) mcginley.forEach(push);
    if (indicators.includes('lsma') && lsma) lsma.forEach(push);
    if (indicators.includes('tsf') && tsf) tsf.forEach(push);
    if (indicators.includes('vwma') && vwma) vwma.forEach(push);
    if (indicators.includes('alma') && alma) alma.forEach(push);
    if (indicators.includes('t3') && t3) t3.forEach(push);
    if (indicators.includes('smma20') && smma20) smma20.forEach(push);
    if (indicators.includes('kama') && kama) kama.forEach(push);
    if (indicators.includes('frama') && frama) frama.forEach(push);
    if (indicators.includes('zlema') && zlema) zlema.forEach(push);
    if (indicators.includes('avgPrice') && avgPrice) avgPrice.forEach(push);
    if (indicators.includes('dma') && dma) dma.forEach(push);
    if (indicators.includes('trima') && trima) trima.forEach(push);
    if (indicators.includes('vidya') && vidya) vidya.forEach(push);
    if (indicators.includes('supertrend') && supertrend) supertrend.value.forEach(push);
    if (indicators.includes('bb')) {
      overlays.bbUpper.forEach(push);
      overlays.bbLower.forEach(push);
    }
    if (indicators.includes('keltner') && keltner) {
      keltner.upper.forEach(push);
      keltner.lower.forEach(push);
    }
    if (indicators.includes('starcBands') && starcBands) {
      starcBands.upper.forEach(push);
      starcBands.lower.forEach(push);
    }
    if (indicators.includes('vwapBands') && vwapBands) {
      vwapBands.upper.forEach(push);
      vwapBands.lower.forEach(push);
    }
    if (indicators.includes('linRegChannel') && linRegChannel) {
      linRegChannel.upper.forEach(push);
      linRegChannel.lower.forEach(push);
    }
    if (indicators.includes('stdErrorBands') && stdErrorBands) {
      stdErrorBands.upper.forEach(push);
      stdErrorBands.lower.forEach(push);
    }
    if (indicators.includes('envelopes') && envelopes) {
      envelopes.upper.forEach(push);
      envelopes.lower.forEach(push);
    }
    if (indicators.includes('accelBands') && accelBands) {
      accelBands.upper.forEach(push);
      accelBands.lower.forEach(push);
    }
    if (indicators.includes('donchian') && donchian) {
      donchian.upper.forEach(push);
      donchian.lower.forEach(push);
    }
    if (indicators.includes('ichimoku') && ichimoku) {
      ichimoku.tenkan.forEach(push);
      ichimoku.kijun.forEach(push);
      ichimoku.spanA.forEach(push);
      ichimoku.spanB.forEach(push);
      ichimoku.chikou.forEach(push);
    }
    if (indicators.includes('alligator') && alligator) {
      alligator.jaw.forEach(push);
      alligator.teeth.forEach(push);
      alligator.lips.forEach(push);
    }
    if (indicators.includes('chandeKroll') && chandeKroll) {
      chandeKroll.shortStop.forEach(push);
      chandeKroll.longStop.forEach(push);
    }
    if (indicators.includes('chandelierExit') && chandelierExit) {
      chandelierExit.shortStop.forEach(push);
      chandelierExit.longStop.forEach(push);
    }
    if (indicators.includes('fractalChaosBands') && fractalChaosBands) {
      fractalChaosBands.upper.forEach(push);
      fractalChaosBands.lower.forEach(push);
    }
    if (indicators.includes('gmma') && gmma) {
      gmma.shortLines.forEach((line) => line.forEach(push));
      gmma.longLines.forEach((line) => line.forEach(push));
    }
    if (comparePrices) comparePrices.forEach(push);
    // أبقِ الظلال ضمن المدى حتى لا تُقصّ عند التقريب (overflow hidden)
    for (const layer of shadowLayers) {
      for (const c of layer.candles) {
        push(c.low);
        push(c.high);
      }
    }
    if (poc != null) push(poc);
    if (tpo?.poc != null) push(tpo.poc);
    if (tpo?.vah != null) push(tpo.vah);
    if (tpo?.val != null) push(tpo.val);
    pineLine.forEach(push);
    const viewScale =
      syncFollow && syncWindow?.priceScale != null ? syncWindow.priceScale : priceScale;
    const viewPan =
      syncFollow && syncWindow?.pricePan != null ? syncWindow.pricePan : pricePan;
    const span = max - min || 1;
    const paddedSpan = span * 1.12;
    const center = (max + min) / 2 + viewPan * paddedSpan;
    const scaledSpan = paddedSpan * viewScale;
    return {
      min: center - scaledSpan / 2,
      max: center + scaledSpan / 2,
      span: scaledSpan,
    };
  }, [
    source.plot,
    overlays,
    indicators,
    comparePrices,
    shadowLayers,
    poc,
    pineLine,
    logScale,
    tpo,
    vwap,
    vwapBands,
    twap,
    psar,
    medianPrice,
    typicalPrice,
    weightedClose,
    mcginley,
    lsma,
    linRegChannel,
    vwma,
    alma,
    t3,
    kama,
    frama,
    zlema,
    avgPrice,
    dma,
    trima,
    vidya,
    supertrend,
    keltner,
    starcBands,
    stdErrorBands,
    envelopes,
    accelBands,
    donchian,
    ichimoku,
    alligator,
    chandeKroll,
    chandelierExit,
    fractalChaosBands,
    gannHiLo,
    gmma,
    priceScale,
    pricePan,
    syncFollow,
    syncWindow?.priceScale,
    syncWindow?.pricePan,
  ]);

  rangeRef.current = range;
  sourceRef.current = source;

  const chartPlotW = Math.max(80, chartW - PRICE_AXIS_WIDTH);
  const chartPlotH = Math.max(100, mainH - timeAxisH);
  chartPlotWRef.current = chartPlotW;
  chartPlotHRef.current = chartPlotH;
  const viewXPan =
    syncFollow && syncWindow?.xPanNorm != null
      ? syncWindow.xPanNorm * chartPlotW
      : xPan;
  const toScale = (price: number) => (logScale ? Math.log(Math.max(price, 1e-12)) : price);
  const fromScale = (scaled: number) => (logScale ? Math.exp(scaled) : scaled);

  const yOf = (price: number) => ((range.max - toScale(price)) / range.span) * chartPlotH;
  const xOf = (i: number) =>
    ((i + 0.5) / Math.max(1, source.plot.length)) * chartPlotW + viewXPan;
  const colW = Math.min(
    48,
    Math.max(2, chartPlotW / Math.max(1, source.plot.length) - 1)
  );

  /** مسارات عمودية: أساسي فوق · ثم الظلال من الأكبر → الأصغر */
  const shadowStack = useMemo(() => {
    if (!shadowLayers.length) return null;
    const rank = (tag: string) => {
      const t = tag.toLowerCase();
      if (t === 'b' || t.includes('كبير')) return 3;
      if (t === 'm' || t.includes('وسط')) return 2;
      if (t === 's' || t.includes('صغير')) return 1;
      return 0;
    };
    const sorted = [...shadowLayers].sort((a, b) => {
      const dr = rank(b.tag) - rank(a.tag);
      if (dr !== 0) return dr;
      return b.layer - a.layer;
    });
    const n = sorted.length;
    const gap = 3;
    const usable = Math.max(80, chartPlotH - gap * n);
    const primaryH = Math.max(56, usable * (n >= 3 ? 0.4 : n === 2 ? 0.46 : 0.52));
    const shadowTotalH = usable - primaryH;
    const eachH = shadowTotalH / n;

    const laneRange = (lows: number[], highs: number[]) => {
      let lo = Infinity;
      let hi = -Infinity;
      for (let i = 0; i < lows.length; i++) {
        const a = toScale(lows[i]!);
        const b = toScale(highs[i]!);
        lo = Math.min(lo, a, b);
        hi = Math.max(hi, a, b);
      }
      if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) {
        return { min: range.min, max: range.max, span: range.span };
      }
      const pad = (hi - lo) * 0.1 || range.span * 0.02;
      const min = lo - pad;
      const max = hi + pad;
      return { min, max, span: max - min || 1 };
    };

    const primaryLane = {
      id: 'primary',
      label: 'أساسي',
      top: 0,
      height: primaryH,
      ...laneRange(
        source.plot.map((c) => c.low),
        source.plot.map((c) => c.high)
      ),
    };

    let cursor = primaryH + gap;
    const shadowLanes = sorted.map((layer) => {
      const r = laneRange(
        layer.candles.map((c) => c.low),
        layer.candles.map((c) => c.high)
      );
      const lane = {
        id: `sh-${layer.tag}-${layer.layer}`,
        label: layer.tag,
        top: cursor,
        height: Math.max(36, eachH - gap),
        layer,
        ...r,
      };
      cursor += eachH;
      return lane;
    });

    return { primaryLane, shadowLanes };
  }, [shadowLayers, chartPlotH, source.plot, range.min, range.max, range.span, logScale]);

  const hasShadows = !!shadowStack;
  const primaryColW = colW;
  const yPrimary = (price: number) => {
    if (!shadowStack) return yOf(price);
    const lane = shadowStack.primaryLane;
    return lane.top + ((lane.max - toScale(price)) / lane.span) * lane.height;
  };
  const yShadowLane = (
    price: number,
    lane: { top: number; height: number; min: number; max: number; span: number }
  ) => lane.top + ((lane.max - toScale(price)) / lane.span) * lane.height;

  const onLayout = (e: LayoutChangeEvent) => {
    setChartW(Math.max(120, e.nativeEvent.layout.width));
  };

  const hitIndex = useCallback((x: number) => {
    const len = sourceRef.current.plot.length || 1;
    const w = chartPlotW || 1;
    const pan = syncFollow && syncWindow?.xPanNorm != null
      ? syncWindow.xPanNorm * w
      : xPanRef.current;
    const i = Math.floor(((x - pan) / w) * len);
    return Math.max(0, Math.min(len - 1, i));
  }, [chartPlotW, syncFollow, syncWindow?.xPanNorm]);

  const priceAtY = useCallback(
    (y: number) => {
      const r = rangeRef.current;
      const scaled = r.max - (y / chartPlotH) * r.span;
      return fromScale(scaled);
    },
    [chartPlotH, logScale]
  );

  const pointFromXY = useCallback(
    (x: number, y: number): ChartPoint => {
      let price = priceAtY(y);
      const local = hitIndex(x);
      const candle = sourceRef.current.plot[local];
      if (magnet && candle) price = snapPrice(price, candle);
      return { index: sourceRef.current.start + local, price };
    },
    [hitIndex, priceAtY, magnet]
  );

  const finalizeDrawing = useCallback(
    (a: ChartPoint, b?: ChartPoint) => {
      const t = tool;
      if (t === 'none') return;
      if (t === 'measure' && b) {
        const stats = measureStats(a, b);
        setMeasureReadout(
          `${stats.bars} شموع · ${stats.diff >= 0 ? '+' : ''}${formatPrice(stats.diff)} (${stats.pct.toFixed(2)}%)`
        );
        setPending(null);
        setDragEnd(null);
        setTool('none');
        return;
      }
      if (t === 'hline' || t === 'vline' || t === 'note') {
        setDrawings((d) => [
          ...d,
          {
            id: `d${Date.now()}`,
            tool: t,
            a,
            text: t === 'note' ? 'ملاحظة' : undefined,
            color: accent,
          },
        ]);
      } else if (b) {
        setDrawings((d) => [
          ...d,
          { id: `d${Date.now()}`, tool: t, a, b, color: accent },
        ]);
      }
      setPending(null);
      setDragEnd(null);
      setTool('none');
    },
    [tool, accent]
  );

  const moveDrawing = useCallback((id: string, point: ChartPoint, end: 'a' | 'b') => {
    setDrawings((list) =>
      list.map((d) => {
        if (d.id !== id) return d;
        if (end === 'a') return { ...d, a: point };
        return d.b ? { ...d, b: point } : { ...d, b: point };
      })
    );
  }, []);

  const hitDrawing = useCallback(
    (x: number, y: number) => {
      const price = priceAtY(y);
      const idx = hitIndex(x) + source.start;
      let best: { id: string; dist: number } | null = null;
      for (const d of drawings) {
        if (d.tool === 'hline') {
          const dist = Math.abs(d.a.price - price);
          if (dist < range.span * 0.012 && (!best || dist < best.dist)) best = { id: d.id, dist };
        } else if (d.tool === 'vline') {
          const dist = Math.abs(d.a.index - idx);
          if (dist <= 1 && (!best || dist < best.dist)) best = { id: d.id, dist: dist };
        } else if (d.b) {
          const d1 = Math.hypot(x - xOf(d.a.index - source.start), y - yOf(d.a.price));
          const d2 = Math.hypot(x - xOf(d.b.index - source.start), y - yOf(d.b.price));
          const dist = Math.min(d1, d2);
          if (dist < 18 && (!best || dist < best.dist)) best = { id: d.id, dist };
        }
      }
      return best?.id ?? null;
    },
    [drawings, hitIndex, priceAtY, source.start, range.span, xOf, yOf]
  );

  const exportChart = async () => {
    if (!plotRef.current) return;
    try {
      const uri = await captureRef(plotRef, { format: 'png', quality: 0.95 });
      if (Platform.OS === 'web') {
        Alert.alert('MATRIX', 'تم حفظ لقطة الشارت');
        return;
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'MATRIX Chart' });
      }
    } catch {
      Alert.alert('MATRIX', 'تعذر تصدير الشارت');
    }
  };

  const onChartPress = (x: number, y: number) => {
    const index = hitIndex(x);
    const candle = source.plot[index];
    if (!candle) return;
    setCross({ index, x: xOf(index), y: yOf(candle.close) });
    if (!interactive) return;

    if (tool === 'select') {
      setSelectedId(hitDrawing(x, y));
      return;
    }

    if (tool === 'none') {
      setSelectedId(null);
      return;
    }
    const point = pointFromXY(x, y);
    if (tool === 'hline' || tool === 'vline' || tool === 'note') {
      finalizeDrawing(point);
      return;
    }
    if (!pending) {
      setPending(point);
      return;
    }
    finalizeDrawing(pending, point);
  };
  chartPressRef.current = onChartPress;
  offsetRef.current = offset;
  priceScaleRef.current = priceScale;
  windowCountRef.current = windowCount;
  pricePanRef.current = pricePan;
  xPanRef.current = xPan;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => interactive && tool !== 'none' && tool !== 'select',
        onMoveShouldSetPanResponder: () => interactive && tool !== 'none' && tool !== 'select',
        onPanResponderGrant: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const p = pointFromXY(locationX, locationY);
          if (tool === 'hline' || tool === 'vline' || tool === 'note') return;
          setPending(p);
          setDragEnd(p);
        },
        onPanResponderMove: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          setDragEnd(pointFromXY(locationX, locationY));
        },
        onPanResponderRelease: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const end = pointFromXY(locationX, locationY);
          if (tool === 'hline' || tool === 'vline' || tool === 'note') {
            onChartPress(locationX, locationY);
            return;
          }
          if (pending) finalizeDrawing(pending, end);
        },
      }),
    [interactive, tool, pending, pointFromXY, finalizeDrawing]
  );

  const selectPan = useMemo(() => {
    let dragging: 'a' | 'b' | null = null;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => interactive && tool === 'select' && !!selectedId,
      onMoveShouldSetPanResponder: () => interactive && tool === 'select' && !!selectedId,
      onPanResponderGrant: (evt) => {
        if (!selectedId) return;
        const { locationX, locationY } = evt.nativeEvent;
        dragging = 'a';
        const d = drawings.find((x) => x.id === selectedId);
        if (d?.b) {
          const da = Math.hypot(locationX - xOf(d.a.index - source.start), locationY - yOf(d.a.price));
          const db = Math.hypot(locationX - xOf(d.b.index - source.start), locationY - yOf(d.b.price));
          dragging = db < da ? 'b' : 'a';
        }
      },
      onPanResponderMove: (evt) => {
        if (!selectedId || !dragging) return;
        const p = pointFromXY(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
        moveDrawing(selectedId, p, dragging);
      },
      onPanResponderRelease: () => {
        dragging = null;
      },
    });
  }, [interactive, tool, selectedId, drawings, moveDrawing, pointFromXY, source.start, xOf, yOf]);

  const applyChartDrag = useCallback(
    (dx: number, dy: number) => {
      const mul = panSpeedMulRef.current;
      const sdx = dx * mul;
      const sdy = dy * mul;
      const barWidth = chartPlotW / Math.max(2, windowCountRef.current);
      const requestedBars = Math.round(sdx / Math.max(2, barWidth));
      const maxOffset = Math.max(
        0,
        source.all.length - Math.min(2, windowCountRef.current)
      );
      const nextOffset = Math.max(
        0,
        Math.min(maxOffset, panStartOffset.current + requestedBars)
      );
      const appliedBars = nextOffset - panStartOffset.current;
      const nextXPan = panStartX.current + sdx - appliedBars * barWidth;
      const nextPricePan =
        panStartPrice.current +
        (sdy / Math.max(1, chartPlotH)) * priceScaleRef.current;
      offsetRef.current = nextOffset;
      xPanRef.current = nextXPan;
      pricePanRef.current = nextPricePan;
      setOffset(nextOffset);
      setXPan(nextXPan);
      setPricePan(nextPricePan);
      schedulePublishSync(false);
    },
    [chartPlotH, chartPlotW, source.all.length, schedulePublishSync]
  );

  const beginDrag = useCallback(() => {
    panStartOffset.current = offsetRef.current;
    panStartX.current = xPanRef.current;
    panStartPrice.current = pricePanRef.current;
    panMoved.current = false;
    setCross(null);
  }, []);

  const endDrag = useCallback(() => {
    schedulePublishSync(true);
  }, [schedulePublishSync]);

  const zoomAroundCenter = useCallback(
    (factor: number) => {
      const current = windowCountRef.current;
      const next = Math.max(2, Math.min(1000, Math.round(current * factor)));
      if (next === current) return;
      const allLen = sourceRef.current.all.length;
      const off = offsetRef.current;
      const oldEnd = allLen - off;
      const oldStart = Math.max(0, oldEnd - current);
      const center = (oldStart + oldEnd) / 2;
      let newEnd = Math.round(center + next / 2);
      newEnd = Math.min(allLen, Math.max(next, newEnd));
      const nextOffset = Math.max(0, allLen - newEnd);
      windowCountRef.current = next;
      offsetRef.current = nextOffset;
      setWindowCount(next);
      setOffset(nextOffset);
      schedulePublishSync(false);
    },
    [schedulePublishSync]
  );

  const zoomPrice = useCallback(
    (factor: number) => {
      const next = Math.max(0.01, Math.min(200, priceScaleRef.current * factor));
      priceScaleRef.current = next;
      setPriceScale(next);
      schedulePublishSync(false);
    },
    [schedulePublishSync]
  );

  useImperativeHandle(
    ref,
    () => ({
      beginDrag,
      dragBy: applyChartDrag,
      endDrag,
      zoomAroundCenter,
      zoomPrice,
    }),
    [beginDrag, applyChartDrag, endDrag, zoomAroundCenter, zoomPrice]
  );

  const chartPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (evt) =>
          canPan &&
          tool === 'none' &&
          !replayOn &&
          evt.nativeEvent.locationX < chartPlotW &&
          evt.nativeEvent.locationY < chartPlotH,
        onStartShouldSetPanResponderCapture: (evt) =>
          canPan &&
          tool === 'none' &&
          !replayOn &&
          evt.nativeEvent.locationX < chartPlotW &&
          evt.nativeEvent.locationY < chartPlotH,
        onMoveShouldSetPanResponder: (evt, g) =>
          canPan &&
          tool === 'none' &&
          !replayOn &&
          evt.nativeEvent.locationX < chartPlotW &&
          evt.nativeEvent.locationY < chartPlotH &&
          Math.abs(g.dx) > 12,
        onMoveShouldSetPanResponderCapture: (evt, g) =>
          canPan &&
          tool === 'none' &&
          !replayOn &&
          evt.nativeEvent.locationX < chartPlotW &&
          evt.nativeEvent.locationY < chartPlotH &&
          (Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4),
        onPanResponderGrant: () => {
          beginDrag();
        },
        onPanResponderMove: (_, g) => {
          if (Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4) panMoved.current = true;
          applyChartDrag(g.dx, g.dy);
        },
        onPanResponderRelease: () => {
          if (!panMoved.current) {
            chartPressRef.current(panStartPoint.current.x, panStartPoint.current.y);
          }
          endDrag();
        },
        onPanResponderTerminate: () => {
          panMoved.current = false;
          endDrag();
        },
      }),
    [
      canPan,
      tool,
      replayOn,
      chartPlotW,
      chartPlotH,
      applyChartDrag,
      beginDrag,
      endDrag,
    ]
  );

  const priceAxisPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => canPan,
        onStartShouldSetPanResponderCapture: () => canPan,
        onMoveShouldSetPanResponder: () => canPan,
        onMoveShouldSetPanResponderCapture: () => canPan,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          beginDrag();
        },
        onPanResponderMove: (_, gesture) => {
          applyChartDrag(0, gesture.dy);
        },
        onPanResponderRelease: () => endDrag(),
        onPanResponderTerminate: () => endDrag(),
      }),
    [canPan, beginDrag, endDrag, applyChartDrag]
  );

  const timeAxisPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => canPan,
        onStartShouldSetPanResponderCapture: () => canPan,
        onMoveShouldSetPanResponder: () => canPan,
        onMoveShouldSetPanResponderCapture: () => canPan,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          beginDrag();
        },
        onPanResponderMove: (_, gesture) => {
          applyChartDrag(gesture.dx, 0);
        },
        onPanResponderRelease: () => endDrag(),
        onPanResponderTerminate: () => endDrag(),
      }),
    [canPan, beginDrag, endDrag, applyChartDrag]
  );

  // React Native Web forwards these browser pointer events to the host element.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webChartHandlers: any =
    Platform.OS === 'web'
      ? ({
          onPointerDown: (event: PointerEventLike) => {
            event.preventDefault?.();
            const point = pointerXY(event);
            webChartPointer.current = {
              active: true,
              x: point.x,
              y: point.y,
              pointerId: point.pointerId,
            };
            event.currentTarget?.setPointerCapture?.(point.pointerId);
            beginDrag();
            panStartPoint.current = { x: point.x, y: point.y };
          },
          onPointerMove: (event: PointerEventLike) => {
            if (!webChartPointer.current.active) return;
            event.preventDefault?.();
            const point = pointerXY(event);
            applyChartDrag(
              point.x - webChartPointer.current.x,
              point.y - webChartPointer.current.y
            );
          },
          onPointerUp: (event: PointerEventLike) => {
            const point = pointerXY(event);
            webChartPointer.current.active = false;
            event.currentTarget?.releasePointerCapture?.(point.pointerId);
            endDrag();
          },
          onPointerCancel: () => {
            webChartPointer.current.active = false;
            endDrag();
          },
        } as const)
      : {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const priceWheelHandlers: any =
    Platform.OS === 'web'
      ? ({
          onPointerDown: (event: PointerEventLike) => {
            event.preventDefault?.();
            event.stopPropagation?.();
            const point = pointerXY(event);
            webPricePointer.current = {
              active: true,
              y: point.y,
              pointerId: point.pointerId,
            };
            beginDrag();
            event.currentTarget?.setPointerCapture?.(point.pointerId);
          },
          onPointerMove: (event: PointerEventLike) => {
            if (!webPricePointer.current.active) return;
            event.preventDefault?.();
            event.stopPropagation?.();
            const point = pointerXY(event);
            applyChartDrag(0, point.y - webPricePointer.current.y);
          },
          onPointerUp: (event: PointerEventLike) => {
            const point = pointerXY(event);
            webPricePointer.current.active = false;
            event.currentTarget?.releasePointerCapture?.(point.pointerId);
            endDrag();
          },
          onPointerCancel: () => {
            webPricePointer.current.active = false;
            endDrag();
          },
        } as const)
      : {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timeWheelHandlers: any =
    Platform.OS === 'web'
      ? ({
          onPointerDown: (event: PointerEventLike) => {
            event.preventDefault?.();
            event.stopPropagation?.();
            const point = pointerXY(event);
            webTimePointer.current = {
              active: true,
              x: point.x,
              pointerId: point.pointerId,
            };
            beginDrag();
            event.currentTarget?.setPointerCapture?.(point.pointerId);
          },
          onPointerMove: (event: PointerEventLike) => {
            if (!webTimePointer.current.active) return;
            event.preventDefault?.();
            event.stopPropagation?.();
            const point = pointerXY(event);
            applyChartDrag(point.x - webTimePointer.current.x, 0);
          },
          onPointerUp: (event: PointerEventLike) => {
            const point = pointerXY(event);
            webTimePointer.current.active = false;
            event.currentTarget?.releasePointerCapture?.(point.pointerId);
            endDrag();
          },
          onPointerCancel: () => {
            webTimePointer.current.active = false;
            endDrag();
          },
        } as const)
      : {};

  // RN Web's synthetic onWheel is often passive, so page scroll still wins.
  // Capture wheel on document (non-passive): axes + zoom من منتصف منطقة الشارت.
  useEffect(() => {
    if (Platform.OS !== 'web' || !canPan) return;
    if (typeof document === 'undefined') return;

    const onWheel = (event: WheelEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      const priceEl = resolveWebNode(priceAxisRef);
      const timeEl = resolveWebNode(timeAxisRef);
      const plotEl = resolveWebNode(plotRef);
      const overPrice = !!(priceEl && priceEl.contains(target));
      const overTime = !!(timeEl && timeEl.contains(target));
      const overPlot = !!(plotEl && plotEl.contains(target));
      if (!overPrice && !overTime && !overPlot) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();

      const delta = event.deltaY * panSpeedMulRef.current;
      const factor = Math.exp(delta * 0.006);
      if (overPrice) {
        zoomPrice(factor);
        return;
      }
      if (overTime) {
        setWindowCount((current) =>
          Math.max(2, Math.min(1000, Math.round(current * factor)))
        );
        schedulePublishSync(false);
        return;
      }
      zoomAroundCenter(factor);
    };

    document.addEventListener('wheel', onWheel, { passive: false, capture: true });
    return () => {
      document.removeEventListener('wheel', onWheel, true);
    };
  }, [canPan, chartW, schedulePublishSync, zoomAroundCenter, zoomPrice]);

  const toggleInd = (id: IndicatorId) => {
    setExtraInd((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const persistTemplate = () => {
    void saveTemplate({
      id: 'default',
      name: 'افتراضي',
      kind,
      lens,
      indicators: extraInd,
      pineFormula,
      logScale,
      magnet,
    }).then(() => {
      const err = getTemplatesSaveError();
      Alert.alert('MATRIX', err ?? 'تم حفظ قالب الشارت');
    });
  };

  const crossCandle = cross ? source.plot[cross.index] : null;

  const visibleDrawings = drawings
    .map((d) => {
      const aLocal = d.a.index - source.start;
      const bLocal = d.b ? d.b.index - source.start : aLocal;
      return { d, aLocal, bLocal };
    })
    .filter(({ aLocal, bLocal }) => aLocal >= -2 || bLocal >= -2);

  const priceTicks = Array.from({ length: 7 }, (_, index) => {
    const ratio = index / 6;
    return {
      ratio,
      price: fromScale(range.max - ratio * range.span),
    };
  });
  const firstVisibleTime = source.plot[0]?.time ?? 0;
  const lastVisibleTime = source.plot[source.plot.length - 1]?.time ?? firstVisibleTime;
  const visibleTimeSpan = Math.abs(lastVisibleTime - firstVisibleTime);
  const timeLabelW = chartPlotW < 200 ? 56 : chartPlotW < 280 ? 72 : 88;
  const timeTickRatios =
    chartPlotW < 200 ? [0, 0.5, 1] : chartPlotW < 320 ? [0, 0.5, 1] : [0, 1 / 3, 2 / 3, 1];
  const timeTickIndexes = Array.from(
    new Set(
      timeTickRatios.map((ratio) =>
        Math.max(0, Math.round((source.plot.length - 1) * ratio))
      )
    )
  );
  const currentPrice = livePrice ?? source.plot[source.plot.length - 1]?.close ?? series.last;
  const currentPriceY = yOf(currentPrice);

  return (
    <View style={[styles.root, dense && styles.rootDense]}>
      {interactive && compactUi ? (
        <View style={styles.compactToolbar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.compactToolsRow}
          >
            {DRAW_TOOLS.map((t) => (
              <Pressable
                accessibilityRole="button"
                key={t.id}
                style={({ pressed }) => [
                  styles.compactTool,
                  tool === t.id && styles.compactToolOn,
                  pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                ]}
                onPress={() => {
                  setTool(t.id);
                  setPending(null);
                }}
              >
                <Text style={[styles.compactToolIcon, tool === t.id && styles.compactToolTextOn]}>
                  {COMPACT_TOOL_ICONS[t.id]}
                </Text>
                <Text style={[styles.compactToolLabel, tool === t.id && styles.compactToolTextOn]}>
                  {t.label}
                </Text>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.compactTool,
                pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
              ]}
              onPress={() => {
                Alert.alert('مسح كل الرسومات؟', 'سيتم حذف كل عناصر الرسم بهذا الرمز/الإطار الزمني', [
                  { text: 'إلغاء', style: 'cancel' },
                  {
                    text: 'مسح',
                    style: 'destructive',
                    onPress: () => {
                      setDrawings([]);
                      setPending(null);
                      void clearDrawings(series.symbol, series.timeframe);
                    },
                  },
                ]);
              }}
            >
              <Text style={styles.compactToolIcon}>⌫</Text>
              <Text style={styles.compactToolLabel}>مسح</Text>
            </Pressable>
          </ScrollView>
        </View>
      ) : interactive ? (
        <View style={styles.toolbar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {CHART_KINDS.map((k) => (
              <Pressable
                accessibilityRole="button"
                key={k.id}
                style={({ pressed }) => [
                  styles.chip,
                  kind === k.id && styles.chipOn,
                  pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                ]}
                onPress={() => setKind(k.id)}
              >
                <Text style={[styles.chipText, kind === k.id && styles.chipTextOn]}>{k.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {LENSES.map((l) => (
              <Pressable
                accessibilityRole="button"
                key={l.id}
                style={({ pressed }) => [
                  styles.lens,
                  lens === l.id && { borderColor: accent },
                  pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                ]}
                onPress={() => setLens(l.id)}
              >
                <Text style={styles.lensTitle}>{l.label}</Text>
                <Text style={styles.lensHint}>{l.hint}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {drawingsSaveError ? (
        <Text style={styles.drawingsSaveError}>{drawingsSaveError}</Text>
      ) : null}

      {!dense ? (
      <View style={styles.readout}>
        {measureReadout ? (
          <Text style={styles.readoutText}>{measureReadout}</Text>
        ) : crossCandle ? (
          <Text style={styles.readoutText}>
            O {formatPrice(crossCandle.open)} H {formatPrice(crossCandle.high)} L{' '}
            {formatPrice(crossCandle.low)} C {formatPrice(crossCandle.close)}
            {compareSeries ? ` · ${compareSeries.symbol} ${formatPrice(compareSeries.last)}` : ''}
          </Text>
        ) : (
          <Text style={styles.readoutMuted}>
            {replayOn
              ? `Bar Replay · ${source.plot.length}/${source.windowLen}`
              : tool !== 'none'
                ? 'اسحب لرسم · يُحفظ تلقائياً'
                : 'اسحب الشموع للتنقل · واسحب محوري السعر والزمن للتكبير'}
          </Text>
        )}
        {interactive && !compactUi ? (
          <View style={styles.zoomRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="تصغير"
              style={({ pressed }) => [
                styles.zoomBtn,
                pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
              ]}
              onPress={() =>
                setWindowCount((n) => Math.min(1000, n + Math.max(1, Math.round(n * 0.25))))
              }
            >
              <Text style={styles.zoomText}>−</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="تكبير"
              style={({ pressed }) => [
                styles.zoomBtn,
                pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
              ]}
              onPress={() =>
                setWindowCount((n) => Math.max(2, n - Math.max(1, Math.round(n * 0.25))))
              }
            >
              <Text style={styles.zoomText}>+</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="تحريك للخلف"
              style={({ pressed }) => [
                styles.zoomBtn,
                pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
              ]}
              onPress={() => setOffset((o) => Math.min(series.candles.length - 10, o + 15))}
            >
              <Text style={styles.zoomText}>‹</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="تحريك للأمام"
              style={({ pressed }) => [
                styles.zoomBtn,
                pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
              ]}
              onPress={() => setOffset((o) => Math.max(0, o - 15))}
            >
              <Text style={styles.zoomText}>›</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="وضع الإعادة"
              style={({ pressed }) => [
                styles.zoomBtn,
                replayOn && styles.replayOn,
                pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
              ]}
              onPress={() => {
                setReplayOn((on) => {
                  const next = !on;
                  if (next) {
                    setReplayStep(12);
                    setReplayPlaying(false);
                  } else {
                    setReplayPlaying(false);
                  }
                  return next;
                });
              }}
            >
              <Text style={[styles.zoomText, replayOn && styles.replayTextOn]}>⏪</Text>
            </Pressable>
            {replayOn ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="خطوة إعادة للخلف"
                  style={({ pressed }) => [
                    styles.zoomBtn,
                    pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                  ]}
                  onPress={() => setReplayStep((s) => Math.max(1, s - 1))}
                >
                  <Text style={styles.zoomText}>-1</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={replayPlaying ? 'إيقاف الإعادة' : 'تشغيل الإعادة'}
                  style={({ pressed }) => [
                    styles.zoomBtn,
                    replayPlaying && styles.replayOn,
                    pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                  ]}
                  onPress={() => setReplayPlaying((p) => !p)}
                >
                  <Text style={[styles.zoomText, replayPlaying && styles.replayTextOn]}>
                    {replayPlaying ? '⏸' : '▶'}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="خطوة إعادة للأمام"
                  style={({ pressed }) => [
                    styles.zoomBtn,
                    pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                  ]}
                  onPress={() =>
                    setReplayStep((s) => Math.min(source.windowLen, s + 1))
                  }
                >
                  <Text style={styles.zoomText}>+1</Text>
                </Pressable>
              </>
            ) : null}
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.zoomBtn,
                logScale && styles.replayOn,
                pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
              ]}
              onPress={() => setLogScale((v) => !v)}
            >
              <Text style={[styles.zoomText, logScale && styles.replayTextOn]}>Log</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="الالتصاق بالشبكة"
              style={({ pressed }) => [
                styles.zoomBtn,
                magnet && styles.replayOn,
                pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
              ]}
              onPress={() => setMagnet((v) => !v)}
            >
              <Text style={[styles.zoomText, magnet && styles.replayTextOn]}>🧲</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      ) : null}

      <View
        ref={plotRef}
        collapsable={false}
        style={[
          styles.plot,
          { height: mainH },
          hideGrid && styles.plotBare,
          canPan ? webAxisLockStyle : null,
        ]}
        onLayout={onLayout}
        {...(interactive && tool !== 'none' && tool !== 'select' ? panResponder.panHandlers : {})}
        {...(interactive && tool === 'select' ? selectPan.panHandlers : {})}
      >
        {!canPan || tool === 'select' ? (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={(e) =>
              onChartPress(e.nativeEvent.locationX, e.nativeEvent.locationY)
            }
          />
        ) : null}
        {/* grid */}
        {!hideGrid
          ? [0.25, 0.5, 0.75].map((p) => (
              <View
                key={p}
                style={[styles.gridLine, { top: chartPlotH * p, right: PRICE_AXIS_WIDTH }]}
              />
            ))
          : null}

        {/* area / line / baseline */}
        {(kind === 'line' || kind === 'area' || kind === 'baseline') &&
          source.plot.map((c, i) => {
            if (i === 0) return null;
            const x1 = xOf(i - 1);
            const y1 = yOf(source.plot[i - 1].close);
            const x2 = xOf(i);
            const y2 = yOf(c.close);
            const len = Math.hypot(x2 - x1, y2 - y1);
            const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
            const segColor =
              kind === 'baseline'
                ? c.close >= source.plot[0].close
                  ? candleBull
                  : candleBear
                : accent;
            return (
              <View
                key={`ln${i}`}
                style={{
                  position: 'absolute',
                  left: x1,
                  top: y1,
                  width: len,
                  height: kind === 'area' || kind === 'baseline' ? 2.5 : 1.6,
                  backgroundColor: segColor,
                  opacity: 0.9,
                  transform: [{ rotate: `${angle}deg` }],
                  transformOrigin: 'left center',
                }}
              />
            );
          })}

        {/* خط أساس (Baseline): مرجع أفقي عند إغلاق أول شمعة ظاهرة بالنافذة */}
        {kind === 'baseline' && source.plot.length > 0 ? (
          <View
            pointerEvents="none"
            style={[
              styles.gridLine,
              {
                top: yOf(source.plot[0].close),
                right: PRICE_AXIS_WIDTH,
                borderTopColor: 'rgba(255,255,255,0.18)',
              },
            ]}
          />
        ) : null}

        {/* مسارات عمودية: أساسي فوق · ظلال من الأكبر للأصغر */}
        {shadowStack
          ? shadowStack.shadowLanes.map((lane, laneIdx) => {
              const layer = lane.layer;
              const opac = [0.42, 0.34, 0.28][laneIdx] ?? 0.28;
              const candleNodes = layer.candles.map((c, i) => {
                const bull = c.close >= c.open;
                const color = bull ? candleBull : candleBear;
                const colWShadow = Math.max(
                  1.5,
                  Math.min(primaryColW * 0.72, c.widthRatio * chartPlotW)
                );
                const cx = c.xRatio * chartPlotW + viewXPan;
                const left = cx - colWShadow / 2;
                const wickTop = yShadowLane(c.high, lane);
                const wickBot = yShadowLane(c.low, lane);
                const midPrice = (c.open + c.close) / 2;
                let bodyTop = yShadowLane(Math.max(c.open, c.close), lane);
                let bodyBot = yShadowLane(Math.min(c.open, c.close), lane);
                const minBody = Math.max(2, colWShadow * 0.2);
                if (bodyBot - bodyTop < minBody) {
                  const midY = yShadowLane(midPrice, lane);
                  bodyTop = midY - minBody / 2;
                  bodyBot = midY + minBody / 2;
                }
                const wickH = Math.max(minBody + 2, wickBot - wickTop);
                const wickY = Math.min(wickTop, bodyTop - 1);
                const bodyH = Math.max(minBody, bodyBot - bodyTop);
                return (
                  <View
                    key={`sh${layer.layer}-${c.time}-${i}`}
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      left,
                      top: 0,
                      width: colWShadow,
                      height: chartPlotH,
                      opacity: opac,
                      zIndex: 2,
                    }}
                  >
                    <View
                      style={{
                        position: 'absolute',
                        left: colWShadow / 2 - 0.5,
                        top: wickY,
                        width: 1,
                        height: wickH,
                        backgroundColor: color,
                      }}
                    />
                    <View
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: bodyTop,
                        width: colWShadow,
                        height: bodyH,
                        backgroundColor: color,
                        borderRadius: 1,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: 'rgba(255,255,255,0.16)',
                      }}
                    />
                  </View>
                );
              });

              return (
                <React.Fragment key={`shadow-lane-${lane.id}`}>
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      right: PRICE_AXIS_WIDTH + 6,
                      top: lane.top + 4,
                      zIndex: 7,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                      backgroundColor: 'rgba(7,16,24,0.78)',
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: 'rgba(148,163,184,0.4)',
                    }}
                  >
                    <Text
                      style={{
                        color: 'rgba(226,232,240,0.92)',
                        fontSize: 10,
                        fontWeight: '800',
                        fontFamily: 'monospace',
                        textTransform: 'lowercase',
                      }}
                    >
                      {lane.label}
                    </Text>
                  </View>
                  {candleNodes}
                </React.Fragment>
              );
            })
          : null}

        {shadowStack ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 6,
              top: 4,
              zIndex: 7,
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              backgroundColor: 'rgba(7,16,24,0.78)',
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: 'rgba(45,212,191,0.45)',
            }}
          >
            <Text style={{ color: colors.accent, fontSize: 10, fontWeight: '800' }}>أساسي</Text>
          </View>
        ) : null}

        {/* candles / bars / hollow / heikin */}
        {(kind === 'candles' ||
          kind === 'hollow' ||
          kind === 'heikin' ||
          kind === 'bars' ||
          kind === 'renko' ||
          kind === 'kagi' ||
          kind === 'pnf' ||
          kind === 'range') &&
          source.plot.map((c, i) => {
            const bull = c.close >= c.open;
            const color = bull ? candleBull : candleBear;
            const yP = hasShadows ? yPrimary : yOf;
            const top = yP(c.high);
            const bodyTop = yP(Math.max(c.open, c.close));
            const bodyBot = yP(Math.min(c.open, c.close));
            const wickH = Math.max(2, yP(c.low) - yP(c.high));
            const bodyH = Math.max(2, bodyBot - bodyTop);
            const left = xOf(i) - primaryColW / 2;
            if (kind === 'kagi') {
              const x1 = i === 0 ? xOf(0) : xOf(i - 1);
              const y1 = i === 0 ? yP(c.open) : yP(source.plot[i - 1].close);
              const x2 = xOf(i);
              const y2 = yP(c.close);
              const len = Math.hypot(x2 - x1, y2 - y1);
              const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
              return (
                <View
                  key={i}
                  style={{
                    position: 'absolute',
                    left: x1,
                    top: y1,
                    width: len,
                    height: bull ? 3.5 : 1.5,
                    backgroundColor: color,
                    opacity: 0.95,
                    transform: [{ rotate: `${angle}deg` }],
                    transformOrigin: 'left center',
                  }}
                />
              );
            }
            if (kind === 'pnf') {
              return (
                <Text
                  key={i}
                  style={{
                    position: 'absolute',
                    left: left,
                    top: bodyTop - 4,
                    width: Math.max(10, primaryColW),
                    color,
                    fontSize: Math.min(14, Math.max(8, primaryColW)),
                    fontWeight: '900',
                    textAlign: 'center',
                  }}
                >
                  {bull ? 'X' : 'O'}
                </Text>
              );
            }
            if (kind === 'bars') {
              return (
                <View key={i} style={{ position: 'absolute', left, top: 0, width: primaryColW, height: mainH }}>
                  <View
                    style={{
                      position: 'absolute',
                      left: primaryColW / 2,
                      top,
                      width: 1.5,
                      height: wickH,
                      backgroundColor: color,
                    }}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: yP(c.open),
                      width: primaryColW / 2,
                      height: 2,
                      backgroundColor: color,
                    }}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      left: primaryColW / 2,
                      top: yP(c.close),
                      width: primaryColW / 2,
                      height: 2,
                      backgroundColor: color,
                    }}
                  />
                </View>
              );
            }
            return (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left,
                  top: 0,
                  width: primaryColW,
                  height: mainH,
                  zIndex: 4,
                }}
              >
                <View
                  style={{
                    position: 'absolute',
                    left: primaryColW / 2 - 0.5,
                    top,
                    width: 1,
                    height: wickH,
                    backgroundColor: color,
                    opacity: 0.9,
                  }}
                />
                <View
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: bodyTop,
                    width: Math.max(2, primaryColW - 1),
                    height: bodyH,
                    backgroundColor: kind === 'hollow' && bull ? 'transparent' : color,
                    borderWidth: kind === 'hollow' ? 1.5 : 0,
                    borderColor: color,
                    borderRadius: 1,
                  }}
                />
              </View>
            );
          })}

        {/* compare symbol overlay */}
        {comparePrices &&
          comparePrices.map((p, i) => {
            if (i === 0) return null;
            const x1 = xOf(i - 1);
            const y1 = yOf(comparePrices[i - 1]);
            const x2 = xOf(i);
            const y2 = yOf(p);
            const len = Math.hypot(x2 - x1, y2 - y1);
            const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
            return (
              <View
                key={`cmp${i}`}
                style={{
                  position: 'absolute',
                  left: x1,
                  top: y1,
                  width: len,
                  height: 2,
                  backgroundColor: colors.infoAccent,
                  opacity: 0.85,
                  transform: [{ rotate: `${angle}deg` }],
                  transformOrigin: 'left center',
                }}
              />
            );
          })}

        {/* overlay lines as dots */}
        {indicators.includes('sma20') &&
          overlays.sma20.map((v, i) =>
            v == null ? null : (
              <View
                key={`s20${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#FBBF24' }]}
              />
            )
          )}
        {indicators.includes('sma50') &&
          overlays.sma50.map((v, i) =>
            v == null ? null : (
              <View
                key={`s50${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: colors.infoAccent }]}
              />
            )
          )}
        {indicators.includes('ema21') &&
          overlays.ema21.map((v, i) =>
            v == null ? null : (
              <View
                key={`e21${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: accent }]}
              />
            )
          )}
        {indicators.includes('wma20') &&
          overlays.wma20.map((v, i) =>
            v == null ? null : (
              <View
                key={`w20${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#F472B6' }]}
              />
            )
          )}
        {indicators.includes('dema20') &&
          overlays.dema20.map((v, i) =>
            v == null ? null : (
              <View
                key={`d20${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#34D399' }]}
              />
            )
          )}
        {indicators.includes('tema20') &&
          overlays.tema20.map((v, i) =>
            v == null ? null : (
              <View
                key={`t20${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#FB923C' }]}
              />
            )
          )}
        {indicators.includes('hma20') &&
          overlays.hma20.map((v, i) =>
            v == null ? null : (
              <View
                key={`h20${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#818CF8' }]}
              />
            )
          )}
        {indicators.includes('vwap') &&
          vwap &&
          vwap.map((v, i) =>
            v == null ? null : (
              <View
                key={`vw${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: colors.white }]}
              />
            )
          )}
        {indicators.includes('vwapBands') &&
          vwapBands &&
          vwapBands.upper.map((v, i) => {
            const lo = vwapBands.lower[i];
            if (v == null || lo == null) return null;
            return (
              <View
                key={`vwb${i}`}
                style={{
                  position: 'absolute',
                  left: xOf(i) - 1,
                  top: yOf(v),
                  width: 2,
                  height: Math.max(2, yOf(lo) - yOf(v)),
                  backgroundColor: 'rgba(250,204,21,0.14)',
                }}
              />
            );
          })}
        {indicators.includes('twap') &&
          twap &&
          twap.map((v, i) =>
            v == null ? null : (
              <View
                key={`tw${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#BAE6FD' }]}
              />
            )
          )}
        {indicators.includes('psar') &&
          psar &&
          psar.map((v, i) =>
            v == null ? null : (
              <View
                key={`ps${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#A3E635' }]}
              />
            )
          )}
        {indicators.includes('gannHiLo') &&
          gannHiLo &&
          gannHiLo.map((v, i) =>
            v == null ? null : (
              <View
                key={`ghl${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#FCD34D' }]}
              />
            )
          )}
        {indicators.includes('fractals') &&
          fractals &&
          fractals.top.map((v, i) =>
            v == null ? null : (
              <View
                key={`frt${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 9, backgroundColor: colors.bear }]}
              />
            )
          )}
        {indicators.includes('fractals') &&
          fractals &&
          fractals.bottom.map((v, i) =>
            v == null ? null : (
              <View
                key={`frb${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) + 6, backgroundColor: colors.bull }]}
              />
            )
          )}
        {indicators.includes('elderImpulse') &&
          elderImpulse &&
          elderImpulse.map((v, i) =>
            v == null ? null : (
              <View
                key={`eim${i}`}
                style={[
                  styles.dot,
                  {
                    left: xOf(i) - 1.5,
                    top: yOf(source.plot[i].low) + 6,
                    backgroundColor: v === 'green' ? colors.bull : v === 'red' ? colors.bear : colors.dxy,
                  },
                ]}
              />
            )
          )}
        {indicators.includes('pivotsHL') &&
          pivotsHL &&
          pivotsHL.top.map((v, i) =>
            v == null ? null : (
              <View
                key={`phlt${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 9, backgroundColor: '#FB7185' }]}
              />
            )
          )}
        {indicators.includes('pivotsHL') &&
          pivotsHL &&
          pivotsHL.bottom.map((v, i) =>
            v == null ? null : (
              <View
                key={`phlb${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) + 6, backgroundColor: '#4ADE80' }]}
              />
            )
          )}
        {indicators.includes('medianPrice') &&
          medianPrice &&
          medianPrice.map((v, i) => (
            <View
              key={`mp${i}`}
              style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#94A3B8' }]}
            />
          ))}
        {indicators.includes('typicalPrice') &&
          typicalPrice &&
          typicalPrice.map((v, i) => (
            <View
              key={`tp${i}`}
              style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#FDE68A' }]}
            />
          ))}
        {indicators.includes('weightedClose') &&
          weightedClose &&
          weightedClose.map((v, i) => (
            <View
              key={`wc${i}`}
              style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#FCA5A5' }]}
            />
          ))}
        {indicators.includes('avgPrice') &&
          avgPrice &&
          avgPrice.map((v, i) => (
            <View
              key={`avgp${i}`}
              style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#C4B5FD' }]}
            />
          ))}
        {indicators.includes('dma') &&
          dma &&
          dma.map((v, i) =>
            v == null ? null : (
              <View
                key={`dma${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#C7D2FE' }]}
              />
            )
          )}
        {indicators.includes('trima') &&
          trima &&
          trima.map((v, i) =>
            v == null ? null : (
              <View
                key={`trima${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#D9F99D' }]}
              />
            )
          )}
        {indicators.includes('mcginley') &&
          mcginley &&
          mcginley.map((v, i) =>
            v == null ? null : (
              <View
                key={`mg${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#5EEAD4' }]}
              />
            )
          )}
        {indicators.includes('lsma') &&
          lsma &&
          lsma.map((v, i) =>
            v == null ? null : (
              <View
                key={`lsma${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#22D3EE' }]}
              />
            )
          )}
        {indicators.includes('tsf') &&
          tsf &&
          tsf.map((v, i) =>
            v == null ? null : (
              <View
                key={`tsf${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#38BDF8' }]}
              />
            )
          )}
        {indicators.includes('vwma') &&
          vwma &&
          vwma.map((v, i) =>
            v == null ? null : (
              <View
                key={`vwma${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#FACC15' }]}
              />
            )
          )}
        {indicators.includes('alma') &&
          alma &&
          alma.map((v, i) =>
            v == null ? null : (
              <View
                key={`alma${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#E879F9' }]}
              />
            )
          )}
        {indicators.includes('t3') &&
          t3 &&
          t3.map((v, i) =>
            v == null ? null : (
              <View
                key={`t3${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#0EA5E9' }]}
              />
            )
          )}
        {indicators.includes('vidya') &&
          vidya &&
          vidya.map((v, i) =>
            v == null ? null : (
              <View
                key={`vidya${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#FDA4AF' }]}
              />
            )
          )}
        {indicators.includes('smma20') &&
          smma20 &&
          smma20.map((v, i) =>
            v == null ? null : (
              <View
                key={`smma20_${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#F97316' }]}
              />
            )
          )}
        {indicators.includes('kama') &&
          kama &&
          kama.map((v, i) =>
            v == null ? null : (
              <View
                key={`kama${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#A78BFA' }]}
              />
            )
          )}
        {indicators.includes('frama') &&
          frama &&
          frama.map((v, i) =>
            v == null ? null : (
              <View
                key={`frama${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#7DD3FC' }]}
              />
            )
          )}
        {indicators.includes('zlema') &&
          zlema &&
          zlema.map((v, i) =>
            v == null ? null : (
              <View
                key={`zl${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#FDBA74' }]}
              />
            )
          )}
        {indicators.includes('gmma') &&
          gmma &&
          gmma.shortLines.map((line, li) =>
            line.map((v, i) =>
              v == null ? null : (
                <View
                  key={`gmmaS${li}_${i}`}
                  style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#6EE7B7' }]}
                />
              )
            )
          )}
        {indicators.includes('gmma') &&
          gmma &&
          gmma.longLines.map((line, li) =>
            line.map((v, i) =>
              v == null ? null : (
                <View
                  key={`gmmaL${li}_${i}`}
                  style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#93C5FD' }]}
                />
              )
            )
          )}
        {indicators.includes('zigzag') && zigzag
          ? (() => {
              const pts: { i: number; v: number }[] = [];
              zigzag.forEach((v, i) => {
                if (v != null) pts.push({ i, v });
              });
              return pts.slice(1).map((p, idx) => {
                const prev = pts[idx];
                const x1 = xOf(prev.i);
                const y1 = yOf(prev.v);
                const x2 = xOf(p.i);
                const y2 = yOf(p.v);
                const len = Math.hypot(x2 - x1, y2 - y1);
                const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
                return (
                  <View
                    key={`zz${idx}`}
                    style={{
                      position: 'absolute',
                      left: x1,
                      top: y1,
                      width: len,
                      height: 1.5,
                      backgroundColor: colors.infoAccent,
                      opacity: 0.9,
                      transform: [{ rotate: `${angle}deg` }],
                      transformOrigin: 'left center',
                    }}
                  />
                );
              });
            })()
          : null}
        {indicators.includes('supertrend') &&
          supertrend &&
          supertrend.value.map((v, i) =>
            v == null ? null : (
              <View
                key={`st${i}`}
                style={[
                  styles.dot,
                  {
                    left: xOf(i) - 1.5,
                    top: yOf(v) - 1.5,
                    backgroundColor: supertrend.up[i] ? colors.bull : colors.bear,
                  },
                ]}
              />
            )
          )}
        {indicators.includes('bb') &&
          overlays.bbUpper.map((v, i) => {
            const lo = overlays.bbLower[i];
            if (v == null || lo == null) return null;
            return (
              <View
                key={`bb${i}`}
                style={{
                  position: 'absolute',
                  left: xOf(i) - 1,
                  top: yOf(v),
                  width: 2,
                  height: Math.max(2, yOf(lo) - yOf(v)),
                  backgroundColor: 'rgba(56,189,248,0.18)',
                }}
              />
            );
          })}
        {indicators.includes('keltner') &&
          keltner &&
          keltner.upper.map((v, i) => {
            const lo = keltner.lower[i];
            if (v == null || lo == null) return null;
            return (
              <View
                key={`kc${i}`}
                style={{
                  position: 'absolute',
                  left: xOf(i) - 1,
                  top: yOf(v),
                  width: 2,
                  height: Math.max(2, yOf(lo) - yOf(v)),
                  backgroundColor: 'rgba(167,139,250,0.18)',
                }}
              />
            );
          })}
        {indicators.includes('starcBands') &&
          starcBands &&
          starcBands.upper.map((v, i) => {
            const lo = starcBands.lower[i];
            if (v == null || lo == null) return null;
            return (
              <View
                key={`starc${i}`}
                style={{
                  position: 'absolute',
                  left: xOf(i) - 1,
                  top: yOf(v),
                  width: 2,
                  height: Math.max(2, yOf(lo) - yOf(v)),
                  backgroundColor: 'rgba(249,168,212,0.14)',
                }}
              />
            );
          })}
        {indicators.includes('linRegChannel') &&
          linRegChannel &&
          linRegChannel.upper.map((v, i) => {
            const lo = linRegChannel.lower[i];
            if (v == null || lo == null) return null;
            return (
              <View
                key={`lrc${i}`}
                style={{
                  position: 'absolute',
                  left: xOf(i) - 1,
                  top: yOf(v),
                  width: 2,
                  height: Math.max(2, yOf(lo) - yOf(v)),
                  backgroundColor: 'rgba(125,211,252,0.14)',
                }}
              />
            );
          })}
        {indicators.includes('stdErrorBands') &&
          stdErrorBands &&
          stdErrorBands.upper.map((v, i) => {
            const lo = stdErrorBands.lower[i];
            if (v == null || lo == null) return null;
            return (
              <View
                key={`seb${i}`}
                style={{
                  position: 'absolute',
                  left: xOf(i) - 1,
                  top: yOf(v),
                  width: 2,
                  height: Math.max(2, yOf(lo) - yOf(v)),
                  backgroundColor: 'rgba(190,242,100,0.14)',
                }}
              />
            );
          })}
        {indicators.includes('envelopes') &&
          envelopes &&
          envelopes.upper.map((v, i) => {
            const lo = envelopes.lower[i];
            if (v == null || lo == null) return null;
            return (
              <View
                key={`env${i}`}
                style={{
                  position: 'absolute',
                  left: xOf(i) - 1,
                  top: yOf(v),
                  width: 2,
                  height: Math.max(2, yOf(lo) - yOf(v)),
                  backgroundColor: 'rgba(245,158,11,0.14)',
                }}
              />
            );
          })}
        {indicators.includes('accelBands') &&
          accelBands &&
          accelBands.upper.map((v, i) => {
            const lo = accelBands.lower[i];
            if (v == null || lo == null) return null;
            return (
              <View
                key={`acb${i}`}
                style={{
                  position: 'absolute',
                  left: xOf(i) - 1,
                  top: yOf(v),
                  width: 2,
                  height: Math.max(2, yOf(lo) - yOf(v)),
                  backgroundColor: 'rgba(94,234,212,0.14)',
                }}
              />
            );
          })}
        {indicators.includes('donchian') &&
          donchian &&
          donchian.upper.map((v, i) => {
            const lo = donchian.lower[i];
            if (v == null || lo == null) return null;
            return (
              <View
                key={`dc${i}`}
                style={{
                  position: 'absolute',
                  left: xOf(i) - 1,
                  top: yOf(v),
                  width: 2,
                  height: Math.max(2, yOf(lo) - yOf(v)),
                  backgroundColor: 'rgba(163,180,208,0.14)',
                }}
              />
            );
          })}
        {indicators.includes('fractalChaosBands') &&
          fractalChaosBands &&
          fractalChaosBands.upper.map((v, i) => {
            const lo = fractalChaosBands.lower[i];
            if (v == null || lo == null) return null;
            return (
              <View
                key={`fcb${i}`}
                style={{
                  position: 'absolute',
                  left: xOf(i) - 1,
                  top: yOf(v),
                  width: 2,
                  height: Math.max(2, yOf(lo) - yOf(v)),
                  backgroundColor: 'rgba(167,139,250,0.14)',
                }}
              />
            );
          })}
        {indicators.includes('chandeKroll') &&
          chandeKroll &&
          chandeKroll.shortStop.map((v, i) => {
            const lo = chandeKroll.longStop[i];
            if (v == null || lo == null) return null;
            return (
              <View
                key={`ck${i}`}
                style={{
                  position: 'absolute',
                  left: xOf(i) - 1,
                  top: yOf(v),
                  width: 2,
                  height: Math.max(2, yOf(lo) - yOf(v)),
                  backgroundColor: 'rgba(45,212,191,0.16)',
                }}
              />
            );
          })}
        {indicators.includes('chandelierExit') &&
          chandelierExit &&
          chandelierExit.longStop.map((lv, i) => {
            const sv = chandelierExit.shortStop[i];
            if (lv == null || sv == null) return null;
            const top = sv >= lv ? sv : lv;
            const bottom = sv >= lv ? lv : sv;
            return (
              <View
                key={`ce${i}`}
                style={{
                  position: 'absolute',
                  left: xOf(i) - 1,
                  top: yOf(top),
                  width: 2,
                  height: Math.max(2, yOf(bottom) - yOf(top)),
                  backgroundColor: 'rgba(253,186,116,0.16)',
                }}
              />
            );
          })}
        {indicators.includes('ichimoku') &&
          ichimoku &&
          ichimoku.spanA.map((a, i) => {
            const b = ichimoku.spanB[i];
            if (a == null || b == null) return null;
            const top = a >= b ? a : b;
            const bottom = a >= b ? b : a;
            return (
              <View
                key={`ichc${i}`}
                style={{
                  position: 'absolute',
                  left: xOf(i) - 1,
                  top: yOf(top),
                  width: 2,
                  height: Math.max(2, yOf(bottom) - yOf(top)),
                  backgroundColor: a >= b ? 'rgba(34,197,94,0.14)' : 'rgba(244,63,94,0.14)',
                }}
              />
            );
          })}
        {indicators.includes('ichimoku') &&
          ichimoku &&
          ichimoku.tenkan.map((v, i) =>
            v == null ? null : (
              <View
                key={`icht${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: colors.dxy }]}
              />
            )
          )}
        {indicators.includes('ichimoku') &&
          ichimoku &&
          ichimoku.kijun.map((v, i) =>
            v == null ? null : (
              <View
                key={`ichk${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: colors.highImpact }]}
              />
            )
          )}
        {indicators.includes('ichimoku') &&
          ichimoku &&
          ichimoku.chikou.map((v, i) =>
            v == null ? null : (
              <View
                key={`ichc2-${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#C084FC' }]}
              />
            )
          )}
        {indicators.includes('alligator') &&
          alligator &&
          alligator.jaw.map((v, i) =>
            v == null ? null : (
              <View
                key={`agj${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#3B82F6' }]}
              />
            )
          )}
        {indicators.includes('alligator') &&
          alligator &&
          alligator.teeth.map((v, i) =>
            v == null ? null : (
              <View
                key={`agt${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#EF4444' }]}
              />
            )
          )}
        {indicators.includes('alligator') &&
          alligator &&
          alligator.lips.map((v, i) =>
            v == null ? null : (
              <View
                key={`agl${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#84CC16' }]}
              />
            )
          )}

        {/* Pine-lite overlay */}
        {pineLine.map((v, i) => {
          if (i === 0 || v == null || pineLine[i - 1] == null) return null;
          const x1 = xOf(i - 1);
          const y1 = yOf(pineLine[i - 1]!);
          const x2 = xOf(i);
          const y2 = yOf(v);
          const len = Math.hypot(x2 - x1, y2 - y1);
          const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
          return (
            <View
              key={`pine${i}`}
              style={{
                position: 'absolute',
                left: x1,
                top: y1,
                width: len,
                height: 1.5,
                backgroundColor: colors.dxy,
                opacity: 0.9,
                transform: [{ rotate: `${angle}deg` }],
                transformOrigin: 'left center',
              }}
            />
          );
        })}

        {poc != null ? (
          <View style={[styles.hLine, { top: yOf(poc), borderColor: colors.warn, opacity: 0.75 }]}>
            <Text style={styles.fibLabel}>POC</Text>
          </View>
        ) : null}

        {pivots
          ? (
              [
                ['R3', pivots.r3, colors.bear],
                ['R2', pivots.r2, colors.bear],
                ['R1', pivots.r1, colors.bear],
                ['PP', pivots.pp, colors.accent],
                ['S1', pivots.s1, colors.bull],
                ['S2', pivots.s2, colors.bull],
                ['S3', pivots.s3, colors.bull],
              ] as const
            ).map(([label, price, color]) => (
              <View
                key={`pv${label}`}
                style={[styles.hLine, { top: yOf(price), borderColor: color, opacity: 0.75 }]}
              >
                <Text style={styles.fibLabel}>{label}</Text>
              </View>
            ))
          : null}

        {fibPivots
          ? (
              [
                ['FR3', fibPivots.r3],
                ['FR2', fibPivots.r2],
                ['FR1', fibPivots.r1],
                ['FPP', fibPivots.pp],
                ['FS1', fibPivots.s1],
                ['FS2', fibPivots.s2],
                ['FS3', fibPivots.s3],
              ] as const
            ).map(([label, price]) => (
              <View
                key={`fpv${label}`}
                style={[
                  styles.hLine,
                  { top: yOf(price), borderColor: colors.infoAccent, opacity: 0.6 },
                ]}
              >
                <Text style={styles.fibLabel}>{label}</Text>
              </View>
            ))
          : null}

        {camarilla
          ? (
              [
                ['CR4', camarilla.r4],
                ['CR3', camarilla.r3],
                ['CR2', camarilla.r2],
                ['CR1', camarilla.r1],
                ['CS1', camarilla.s1],
                ['CS2', camarilla.s2],
                ['CS3', camarilla.s3],
                ['CS4', camarilla.s4],
              ] as const
            ).map(([label, price]) => (
              <View
                key={`cam${label}`}
                style={[
                  styles.hLine,
                  { top: yOf(price), borderColor: colors.warn, opacity: 0.55 },
                ]}
              >
                <Text style={styles.fibLabel}>{label}</Text>
              </View>
            ))
          : null}

        {woodiePivots
          ? (
              [
                ['WR3', woodiePivots.r3],
                ['WR2', woodiePivots.r2],
                ['WR1', woodiePivots.r1],
                ['WPP', woodiePivots.pp],
                ['WS1', woodiePivots.s1],
                ['WS2', woodiePivots.s2],
                ['WS3', woodiePivots.s3],
              ] as const
            ).map(([label, price]) => (
              <View
                key={`wpv${label}`}
                style={[styles.hLine, { top: yOf(price), borderColor: '#C4B5FD', opacity: 0.6 }]}
              >
                <Text style={styles.fibLabel}>{label}</Text>
              </View>
            ))
          : null}

        {demarkPivots
          ? (
              [
                ['DR1', demarkPivots.r1],
                ['DS1', demarkPivots.s1],
              ] as const
            ).map(([label, price]) => (
              <View
                key={`dpv${label}`}
                style={[styles.hLine, { top: yOf(price), borderColor: '#FDA4AF', opacity: 0.6 }]}
              >
                <Text style={styles.fibLabel}>{label}</Text>
              </View>
            ))
          : null}

        {volProfile
          ? (() => {
              const maxV = Math.max(...volProfile.map((r) => r.volume), 1);
              return volProfile.map((row, i) => (
                <View
                  key={`vp${i}`}
                  style={{
                    position: 'absolute',
                    right: 2,
                    top: yOf(row.price),
                    width: (row.volume / maxV) * Math.max(24, chartW * 0.16),
                    height: 2,
                    backgroundColor: 'rgba(56,189,248,0.45)',
                  }}
                />
              ));
            })()
          : null}

        {tpo
          ? (() => {
              const maxC = Math.max(...tpo.rows.map((r) => r.count), 1);
              return (
                <>
                  {tpo.rows.map((row, i) =>
                    row.count ? (
                      <View
                        key={`tpo${i}`}
                        style={{
                          position: 'absolute',
                          left: 2,
                          top: yOf(row.price) - 1,
                          width: (row.count / maxC) * Math.max(20, chartW * 0.14),
                          height: 3,
                          backgroundColor: 'rgba(167,139,250,0.55)',
                        }}
                      />
                    ) : null
                  )}
                  {tpo.poc != null ? (
                    <View style={[styles.hLine, { top: yOf(tpo.poc), borderColor: colors.infoAccent }]}>
                      <Text style={styles.fibLabel}>TPO</Text>
                    </View>
                  ) : null}
                  {tpo.vah != null ? (
                    <View style={[styles.hLine, { top: yOf(tpo.vah), borderColor: 'rgba(167,139,250,0.4)' }]} />
                  ) : null}
                  {tpo.val != null ? (
                    <View style={[styles.hLine, { top: yOf(tpo.val), borderColor: 'rgba(167,139,250,0.4)' }]} />
                  ) : null}
                </>
              );
            })()
          : null}

        {footprint
          ? footprint.map((fp, i) => {
              if (Math.abs(fp.imbalance) < 0.25) return null;
              return (
                <Text
                  key={`fp${i}`}
                  style={{
                    position: 'absolute',
                    left: xOf(i) - 6,
                    top: yOf(source.plot[i].high) - 12,
                    color: fp.delta >= 0 ? colors.bull : colors.bear,
                    fontSize: 8,
                    fontWeight: '800',
                  }}
                >
                  {fp.delta >= 0 ? '+' : ''}
                  {Math.round(fp.delta / 100)}
                </Text>
              );
            })
          : null}

        {/* drawings */}
        {visibleDrawings.map(({ d, aLocal, bLocal }) => {
          const sel = d.id === selectedId;
          if (d.tool === 'hline') {
            return (
              <View
                key={d.id}
                style={[
                  styles.hLine,
                  {
                    top: yOf(d.a.price),
                    borderColor: d.color,
                    borderWidth: sel ? 2.5 : 1,
                  },
                ]}
              />
            );
          }
          if (d.tool === 'vline' && aLocal >= 0 && aLocal < source.plot.length) {
            return (
              <View
                key={d.id}
                style={[styles.vLine, { left: xOf(aLocal), borderColor: d.color }]}
              />
            );
          }
          if (d.tool === 'note' && aLocal >= 0 && aLocal < source.plot.length) {
            return (
              <Text
                key={d.id}
                style={[styles.note, { left: xOf(aLocal), top: yOf(d.a.price), color: d.color }]}
              >
                {d.text || '•'}
              </Text>
            );
          }
          if ((d.tool === 'trend' || d.tool === 'ray') && d.b) {
            const x1 = xOf(Math.max(0, Math.min(source.plot.length - 1, aLocal)));
            const y1 = yOf(d.a.price);
            const x2 = xOf(Math.max(0, Math.min(source.plot.length - 1, bLocal)));
            const y2 = yOf(d.b.price);
            const len = Math.hypot(x2 - x1, y2 - y1) * (d.tool === 'ray' ? 1.6 : 1);
            const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
            return (
              <View
                key={d.id}
                style={{
                  position: 'absolute',
                  left: x1,
                  top: y1,
                  width: len,
                  height: 2,
                  backgroundColor: d.color,
                  transform: [{ rotate: `${angle}deg` }],
                  transformOrigin: 'left center',
                }}
              />
            );
          }
          if ((d.tool === 'rect' || d.tool === 'zone') && d.b) {
            const left = xOf(Math.min(aLocal, bLocal));
            const right = xOf(Math.max(aLocal, bLocal));
            const top = yOf(Math.max(d.a.price, d.b.price));
            const bot = yOf(Math.min(d.a.price, d.b.price));
            return (
              <View
                key={d.id}
                style={{
                  position: 'absolute',
                  left,
                  top,
                  width: Math.max(4, right - left),
                  height: Math.max(4, bot - top),
                  backgroundColor:
                    d.tool === 'zone' ? 'rgba(45,212,191,0.12)' : 'rgba(251,191,36,0.1)',
                  borderWidth: 1,
                  borderColor: d.color,
                }}
              />
            );
          }
          if (d.tool === 'fib' && d.b) {
            const hi = Math.max(d.a.price, d.b.price);
            const lo = Math.min(d.a.price, d.b.price);
            const span = hi - lo || 1;
            return (
              <View key={d.id}>
                {FIB_LEVELS.map((lv) => {
                  const price = hi - span * lv;
                  return (
                    <View key={lv} style={[styles.hLine, { top: yOf(price), borderColor: d.color }]}>
                      <Text style={styles.fibLabel}>{lv.toFixed(3)}</Text>
                    </View>
                  );
                })}
              </View>
            );
          }
          return null;
        })}

        {pending && dragEnd && tool !== 'none' && tool !== 'select' && tool !== 'hline' && tool !== 'vline' && tool !== 'note' ? (
          (() => {
            const x1 = xOf(pending.index - source.start);
            const y1 = yOf(pending.price);
            const x2 = xOf(dragEnd.index - source.start);
            const y2 = yOf(dragEnd.price);
            const len = Math.hypot(x2 - x1, y2 - y1);
            const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
            return (
              <View
                style={{
                  position: 'absolute',
                  left: x1,
                  top: y1,
                  width: len,
                  height: 2,
                  backgroundColor: colors.warn,
                  opacity: 0.7,
                  transform: [{ rotate: `${angle}deg` }],
                  transformOrigin: 'left center',
                }}
              />
            );
          })()
        ) : null}

        {pending ? (
          <View
            style={[
              styles.pending,
              { left: xOf(pending.index - source.start), top: yOf(pending.price) },
            ]}
          />
        ) : null}

        {cross ? (
          <>
            <View style={[styles.crossV, { left: cross.x, bottom: timeAxisH }]} />
            <View
              style={[styles.crossH, { top: cross.y, right: PRICE_AXIS_WIDTH }]}
            />
          </>
        ) : null}

        {canPan && tool === 'none' && !replayOn ? (
          <View
            style={[
              styles.chartGestureSurface,
              {
                width: hidePriceLabels ? chartW : chartPlotW,
                height: chartPlotH,
              },
              Platform.OS === 'web' &&
                ({
                  cursor: 'grab',
                  touchAction: 'none',
                  userSelect: 'none',
                } as never),
            ]}
            {...(Platform.OS === 'web' ? webChartHandlers : chartPan.panHandlers)}
          />
        ) : null}

        {!hidePriceLabels ? (
          <View
            pointerEvents="none"
            style={[
              styles.currentPriceLine,
              { top: currentPriceY, right: PRICE_AXIS_WIDTH },
            ]}
          />
        ) : null}

        <View
          ref={priceAxisRef}
          style={[
            styles.priceAxis,
            hidePriceLabels && styles.priceAxisBare,
            { width: PRICE_AXIS_WIDTH, bottom: timeAxisH },
            canPan ? webAxisLockStyle : null,
            Platform.OS === 'web' && canPan
              ? ({ cursor: 'ns-resize' } as never)
              : null,
          ]}
          {...(canPan ? priceAxisPan.panHandlers : {})}
          {...(canPan && Platform.OS === 'web' ? priceWheelHandlers : {})}
        >
        {priceTicks.map((tick) =>
          hidePriceLabels ? null : (
            <Text
              key={tick.ratio}
              pointerEvents="none"
              style={[
                styles.priceAxisLabel,
                { top: Math.max(0, Math.min(chartPlotH - 16, tick.ratio * chartPlotH - 7)) },
              ]}
            >
              {formatPrice(tick.price)}
            </Text>
          )
        )}
          {!hidePriceLabels ? (
          <View
            pointerEvents="none"
            style={[
              styles.currentPriceTag,
              {
                top: Math.max(0, Math.min(chartPlotH - 20, currentPriceY - 9)),
                backgroundColor: accent,
              },
            ]}
          >
            <Text style={styles.currentPriceText}>{formatPrice(currentPrice)}</Text>
          </View>
          ) : null}
        </View>

        {!hideTimeLabels ? (
          <View
            ref={timeAxisRef}
            style={[
              styles.timeAxis,
              { height: timeAxisH, right: PRICE_AXIS_WIDTH },
              canPan ? webAxisLockStyle : null,
              Platform.OS === 'web' && canPan
                ? ({ cursor: 'ew-resize' } as never)
                : null,
            ]}
            {...(canPan ? timeAxisPan.panHandlers : {})}
            {...(canPan && Platform.OS === 'web' ? timeWheelHandlers : {})}
          >
            {timeTickIndexes.map((index) => {
              const candle = source.plot[index];
              if (!candle) return null;
              return (
                <Text
                  key={`${candle.time}-${index}`}
                  pointerEvents="none"
                  style={[
                    styles.timeAxisLabel,
                    chartPlotW < 280 && styles.timeAxisLabelCompact,
                    {
                      width: timeLabelW,
                      left: Math.max(
                        0,
                        Math.min(chartPlotW - timeLabelW, xOf(index) - timeLabelW / 2)
                      ),
                    },
                  ]}
                >
                  {formatAxisTime(candle.time, visibleTimeSpan)}
                </Text>
              );
            })}
          </View>
        ) : null}

        {canPan && !hideTimeLabels ? (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.axisCorner,
              { width: PRICE_AXIS_WIDTH, height: timeAxisH },
              pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
            ]}
            onPress={() => {
              setPriceScale(1);
              setWindowCount(80);
              setPricePan(0);
              setXPan(0);
              setOffset(0);
            }}
            hitSlop={8}
          >
            <Text style={styles.axisCornerText}>AUTO</Text>
          </Pressable>
        ) : null}
      </View>

      {/* panes */}
      {indicators.includes('volume') ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>VOL</Text>
          <View style={styles.paneInner}>
            {source.plot.map((c, i) => {
              const vols = source.plot.map((x) => x.volume ?? 0);
              const maxV = Math.max(...vols, 1);
              const vol = c.volume ?? 0;
              const h = (vol / maxV) * (paneH - 14);
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: Math.max(2, h),
                    marginTop: paneH - 14 - Math.max(2, h),
                    backgroundColor: c.close >= c.open ? colors.bull : colors.bear,
                    opacity: 0.55,
                    marginHorizontal: 0.5,
                  }}
                />
              );
            })}
          </View>
        </View>
      ) : null}

      {cvd ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>CVD</Text>
          <View style={styles.paneInner}>
            {(() => {
              const minC = Math.min(...cvd);
              const maxC = Math.max(...cvd);
              const span = maxC - minC || 1;
              return cvd.map((v, i) => {
                if (i === 0) return <View key={i} style={{ flex: 1 }} />;
                const yNorm = (v - minC) / span;
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: 3,
                      marginTop: (1 - yNorm) * (paneH - 16),
                      backgroundColor: v >= cvd[i - 1] ? colors.bull : colors.bear,
                      opacity: 0.8,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {obv ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>OBV</Text>
          <View style={styles.paneInner}>
            {(() => {
              const minO = Math.min(...obv);
              const maxO = Math.max(...obv);
              const span = maxO - minO || 1;
              return obv.map((v, i) => {
                if (i === 0) return <View key={i} style={{ flex: 1 }} />;
                const yNorm = (v - minO) / span;
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: 3,
                      marginTop: (1 - yNorm) * (paneH - 16),
                      backgroundColor: v >= obv[i - 1] ? colors.bull : colors.bear,
                      opacity: 0.8,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {nvi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>NVI</Text>
          <View style={styles.paneInner}>
            {(() => {
              const minN = Math.min(...nvi);
              const maxN = Math.max(...nvi);
              const span = maxN - minN || 1;
              return nvi.map((v, i) => {
                if (i === 0) return <View key={i} style={{ flex: 1 }} />;
                const yNorm = (v - minN) / span;
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: 3,
                      marginTop: (1 - yNorm) * (paneH - 16),
                      backgroundColor: v >= nvi[i - 1] ? colors.bull : colors.bear,
                      opacity: 0.8,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {adl ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>A/D</Text>
          <View style={styles.paneInner}>
            {(() => {
              const minA = Math.min(...adl);
              const maxA = Math.max(...adl);
              const span = maxA - minA || 1;
              return adl.map((v, i) => {
                if (i === 0) return <View key={i} style={{ flex: 1 }} />;
                const yNorm = (v - minA) / span;
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: 3,
                      marginTop: (1 - yNorm) * (paneH - 16),
                      backgroundColor: v >= adl[i - 1] ? colors.bull : colors.bear,
                      opacity: 0.8,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {rvix ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>RVI (Vol)</Text>
          <View style={styles.paneInner}>
            {rvix.map((v, i) =>
              v == null ? (
                <View key={i} style={{ flex: 1 }} />
              ) : (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    marginTop: ((100 - v) / 100) * (paneH - 16),
                    backgroundColor: v > 50 ? colors.bull : v < 50 ? colors.bear : accent,
                    borderRadius: 2,
                  }}
                />
              )
            )}
          </View>
        </View>
      ) : null}

      {stc ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>STC</Text>
          <View style={styles.paneInner}>
            {stc.map((v, i) =>
              v == null ? (
                <View key={i} style={{ flex: 1 }} />
              ) : (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    marginTop: ((100 - v) / 100) * (paneH - 16),
                    backgroundColor: v > 75 ? colors.bear : v < 25 ? colors.bull : accent,
                    borderRadius: 2,
                  }}
                />
              )
            )}
          </View>
        </View>
      ) : null}

      {cog ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>COG</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = cog.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxCog = Math.max(...vals, 1e-9);
              return cog.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxCog) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {squeeze ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Squeeze</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = squeeze.momentum
                .filter((x): x is number => x != null)
                .map((v) => Math.abs(v));
              const maxSq = Math.max(...vals, 1e-9);
              return squeeze.momentum.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxSq) * (paneH / 2 - 8));
                const on = squeeze.squeezeOn[i];
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: on ? 0.35 : 0.85,
                      borderWidth: on ? 0 : 1,
                      borderColor: on ? undefined : colors.warn,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {woodieCci ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Woodie CCI</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = woodieCci.cci.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxWc = Math.max(...vals, 1e-9);
              return woodieCci.cci.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxWc) * (paneH / 2 - 8));
                const turbo = woodieCci.turbo[i];
                const turboAbove = turbo != null && turbo > v;
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                      borderWidth: turbo == null ? 0 : 1,
                      borderColor: turbo == null ? undefined : turboAbove ? colors.bull : colors.bear,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {netVolume ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Net Vol</Text>
          <View style={styles.paneInner}>
            {(() => {
              const minNv = Math.min(...netVolume);
              const maxNv = Math.max(...netVolume);
              const span = maxNv - minNv || 1;
              return netVolume.map((v, i) => {
                if (i === 0) return <View key={i} style={{ flex: 1 }} />;
                const yNorm = (v - minNv) / span;
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: 3,
                      marginTop: (1 - yNorm) * (paneH - 16),
                      backgroundColor: v >= netVolume[i - 1] ? colors.bull : colors.bear,
                      opacity: 0.8,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {donchianWidth ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>DC Width</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = donchianWidth.filter((x): x is number => x != null);
              const maxDw = Math.max(...vals, 1e-9);
              return donchianWidth.map((v, i) =>
                v == null ? (
                  <View key={i} style={{ flex: 1 }} />
                ) : (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, (v / maxDw) * (paneH - 16)),
                      marginTop: paneH - 16 - (v / maxDw) * (paneH - 16),
                      backgroundColor: colors.accent,
                      opacity: 0.7,
                    }}
                  />
                )
              );
            })()}
          </View>
        </View>
      ) : null}

      {connorsRsi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Connors RSI</Text>
          <View style={styles.paneInner}>
            {connorsRsi.map((v, i) =>
              v == null ? (
                <View key={i} style={{ flex: 1 }} />
              ) : (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    marginTop: ((100 - v) / 100) * (paneH - 16),
                    backgroundColor: v > 90 ? colors.bear : v < 10 ? colors.bull : accent,
                    borderRadius: 2,
                  }}
                />
              )
            )}
          </View>
        </View>
      ) : null}

      {keltnerWidth ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>KC Width</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = keltnerWidth.filter((x): x is number => x != null);
              const maxKw = Math.max(...vals, 1e-9);
              return keltnerWidth.map((v, i) =>
                v == null ? (
                  <View key={i} style={{ flex: 1 }} />
                ) : (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, (v / maxKw) * (paneH - 16)),
                      marginTop: paneH - 16 - (v / maxKw) * (paneH - 16),
                      backgroundColor: colors.accent,
                      opacity: 0.7,
                    }}
                  />
                )
              );
            })()}
          </View>
        </View>
      ) : null}

      {cfo ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>CFO</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = cfo.filter((x): x is number => x != null).map((x) => Math.abs(x));
              const maxC = Math.max(...vals, 1e-9);
              return cfo.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxC) * (paneH / 2 - 4));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {vwMacd ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>VW-MACD</Text>
          <View style={styles.paneInner}>
            {vwMacd.hist.map((v, i) => {
              if (v == null) return <View key={i} style={{ flex: 1 }} />;
              const h = Math.min(paneH - 16, Math.abs(v) * 8000);
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: Math.max(2, h),
                    marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                    backgroundColor: v >= 0 ? colors.bull : colors.bear,
                    opacity: 0.7,
                  }}
                />
              );
            })}
          </View>
        </View>
      ) : null}

      {disparityIndex ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Disparity</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = disparityIndex.filter((x): x is number => x != null).map((x) => Math.abs(x));
              const maxD = Math.max(...vals, 1e-9);
              return disparityIndex.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxD) * (paneH / 2 - 4));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {tii ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>TII</Text>
          <View style={styles.paneInner}>
            {tii.map((v, i) =>
              v == null ? (
                <View key={i} style={{ flex: 1 }} />
              ) : (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    marginTop: ((100 - v) / 100) * (paneH - 16),
                    backgroundColor: v > 80 ? colors.bull : v < 20 ? colors.bear : accent,
                    borderRadius: 2,
                  }}
                />
              )
            )}
          </View>
        </View>
      ) : null}

      {demarker ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>DeMarker</Text>
          <View style={styles.paneInner}>
            {demarker.map((v, i) =>
              v == null ? (
                <View key={i} style={{ flex: 1 }} />
              ) : (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    marginTop: ((100 - v) / 100) * (paneH - 16),
                    backgroundColor: v > 70 ? colors.bear : v < 30 ? colors.bull : accent,
                    borderRadius: 2,
                  }}
                />
              )
            )}
          </View>
        </View>
      ) : null}

      {rmi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>RMI</Text>
          <View style={styles.paneInner}>
            {rmi.map((v, i) =>
              v == null ? (
                <View key={i} style={{ flex: 1 }} />
              ) : (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    marginTop: ((100 - v) / 100) * (paneH - 16),
                    backgroundColor: v > 70 ? colors.bear : v < 30 ? colors.bull : accent,
                    borderRadius: 2,
                  }}
                />
              )
            )}
          </View>
        </View>
      ) : null}

      {cutlerRsi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Cutler's RSI</Text>
          <View style={styles.paneInner}>
            {cutlerRsi.map((v, i) =>
              v == null ? (
                <View key={i} style={{ flex: 1 }} />
              ) : (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    marginTop: ((100 - v) / 100) * (paneH - 16),
                    backgroundColor: v > 70 ? colors.bear : v < 30 ? colors.bull : accent,
                    borderRadius: 2,
                  }}
                />
              )
            )}
          </View>
        </View>
      ) : null}

      {pgo ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>PGO</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = pgo.filter((x): x is number => x != null).map((x) => Math.abs(x));
              const maxP = Math.max(...vals, 1e-9);
              return pgo.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxP) * (paneH / 2 - 4));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {pfe ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>PFE</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = pfe.filter((x): x is number => x != null).map((x) => Math.abs(x));
              const maxP = Math.max(...vals, 1e-9);
              return pfe.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxP) * (paneH / 2 - 4));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {rainbowOsc ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Rainbow Osc</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = rainbowOsc.filter((x): x is number => x != null);
              const maxR = Math.max(...vals, 1e-9);
              return rainbowOsc.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (v / maxR) * (paneH - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: paneH - 8 - h,
                      backgroundColor: colors.accent,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {efficiencyRatio ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Efficiency Ratio</Text>
          <View style={styles.paneInner}>
            {efficiencyRatio.map((v, i) => {
              if (v == null) return <View key={i} style={{ flex: 1 }} />;
              const h = Math.min(paneH - 16, v * (paneH - 8));
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: Math.max(2, h),
                    marginTop: paneH - 8 - h,
                    backgroundColor: colors.accent,
                    opacity: 0.7,
                  }}
                />
              );
            })}
          </View>
        </View>
      ) : null}

      {vpci ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>VPCI</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = vpci.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxV = Math.max(...vals, 1e-9);
              return vpci.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxV) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {ttf ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>TTF</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = ttf.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxT = Math.max(...vals, 1e-9);
              return ttf.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxT) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {twiggsMoneyFlow ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Twiggs MF</Text>
          <View style={styles.paneInner}>
            {twiggsMoneyFlow.map((v, i) => {
              if (v == null) return <View key={i} style={{ flex: 1 }} />;
              const h = Math.min(paneH - 16, Math.abs(v) * (paneH / 2 - 4));
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: Math.max(2, h),
                    marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                    backgroundColor: v >= 0 ? colors.bull : colors.bear,
                    opacity: 0.7,
                  }}
                />
              );
            })}
          </View>
        </View>
      ) : null}

      {vzo ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>VZO</Text>
          <View style={styles.paneInner}>
            {vzo.map((v, i) => {
              if (v == null) return <View key={i} style={{ flex: 1 }} />;
              const h = Math.min(paneH - 16, (Math.abs(v) / 100) * (paneH / 2 - 4));
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: Math.max(2, h),
                    marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                    backgroundColor: v >= 0 ? colors.bull : colors.bear,
                    opacity: 0.7,
                  }}
                />
              );
            })}
          </View>
        </View>
      ) : null}

      {gmmaOsc ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>GMMA Osc</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = gmmaOsc.filter((x): x is number => x != null).map((x) => Math.abs(x));
              const maxG = Math.max(...vals, 1e-9);
              return gmmaOsc.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxG) * (paneH / 2 - 4));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {iftRsi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>IFT-RSI</Text>
          <View style={styles.paneInner}>
            {(() => {
              // محصورة نظرياً بصرامة داخل (−1,1) — نطاق ثابت معروف مسبقاً بدل تطبيع ديناميكي
              // بالحد الأقصى، بنفس أسلوب Twiggs MF/VZO أعلاه (رياضياً محصورة لا تجريبياً فقط).
              return iftRsi.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, Math.abs(v) * (paneH / 2 - 4));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {waveTrend ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>WaveTrend</Text>
          <View style={styles.paneInner}>
            {(() => {
              const wt1Vals = waveTrend.wt1.filter((x): x is number => x != null);
              const wt2Vals = waveTrend.wt2.filter((x): x is number => x != null);
              const allVals = [...wt1Vals, ...wt2Vals, 0];
              const minV = Math.min(...allVals);
              const maxV = Math.max(...allVals);
              const span = maxV - minV || 1;
              const innerH = paneH - 16;
              return waveTrend.wt1.map((wv, i) => {
                const sv = waveTrend.wt2[i];
                return (
                  <View key={i} style={{ flex: 1, height: innerH, position: 'relative' }}>
                    {wv != null ? (
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          height: 3,
                          top: ((maxV - wv) / span) * innerH,
                          backgroundColor: colors.accent,
                          opacity: 0.85,
                        }}
                      />
                    ) : null}
                    {sv != null ? (
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          height: 3,
                          top: ((maxV - sv) / span) * innerH,
                          backgroundColor: colors.infoAccent,
                          opacity: 0.85,
                        }}
                      />
                    ) : null}
                  </View>
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {massIndex ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Mass Index</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = massIndex.filter((x): x is number => x != null);
              const minM = Math.min(...vals, 0);
              const maxM = Math.max(...vals, 1e-9);
              const span = maxM - minM || 1;
              return massIndex.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const prev = i > 0 ? massIndex[i - 1] : null;
                const yNorm = (v - minM) / span;
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: 3,
                      marginTop: (1 - yNorm) * (paneH - 16),
                      backgroundColor: prev == null || v >= prev ? colors.bull : colors.bear,
                      opacity: 0.8,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {rsi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>RSI</Text>
          <View style={styles.paneInner}>
            {rsi.map((v, i) =>
              v == null ? (
                <View key={i} style={{ flex: 1 }} />
              ) : (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    marginTop: ((100 - v) / 100) * (paneH - 16),
                    backgroundColor: v > 70 ? colors.bear : v < 30 ? colors.bull : accent,
                    borderRadius: 2,
                  }}
                />
              )
            )}
          </View>
        </View>
      ) : null}

      {mfi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>MFI</Text>
          <View style={styles.paneInner}>
            {mfi.map((v, i) =>
              v == null ? (
                <View key={i} style={{ flex: 1 }} />
              ) : (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    marginTop: ((100 - v) / 100) * (paneH - 16),
                    backgroundColor: v > 80 ? colors.bear : v < 20 ? colors.bull : accent,
                    borderRadius: 2,
                  }}
                />
              )
            )}
          </View>
        </View>
      ) : null}

      {adx ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>ADX</Text>
          <View style={styles.paneInner}>
            {adx.map((v, i) =>
              v == null ? (
                <View key={i} style={{ flex: 1 }} />
              ) : (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    marginTop: ((100 - v) / 100) * (paneH - 16),
                    backgroundColor: v >= 25 ? colors.warn : colors.textDim,
                    borderRadius: 2,
                  }}
                />
              )
            )}
          </View>
        </View>
      ) : null}

      {ultimateOsc ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>UO</Text>
          <View style={styles.paneInner}>
            {ultimateOsc.map((v, i) =>
              v == null ? (
                <View key={i} style={{ flex: 1 }} />
              ) : (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    marginTop: ((100 - v) / 100) * (paneH - 16),
                    backgroundColor: v > 70 ? colors.bear : v < 30 ? colors.bull : accent,
                    borderRadius: 2,
                  }}
                />
              )
            )}
          </View>
        </View>
      ) : null}

      {cmo ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>CMO</Text>
          <View style={styles.paneInner}>
            {cmo.map((v, i) =>
              v == null ? (
                <View key={i} style={{ flex: 1 }} />
              ) : (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    marginTop: ((100 - v) / 200) * (paneH - 16),
                    backgroundColor: v > 50 ? colors.bear : v < -50 ? colors.bull : accent,
                    borderRadius: 2,
                  }}
                />
              )
            )}
          </View>
        </View>
      ) : null}

      {trix ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>TRIX</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = trix.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxT = Math.max(...vals, 1e-9);
              return trix.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxT) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {force ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Force</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = force.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxF = Math.max(...vals, 1e-9);
              return force.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxF) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {chaikinOsc ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Chaikin</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = chaikinOsc.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxC = Math.max(...vals, 1e-9);
              return chaikinOsc.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxC) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {dpo ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>DPO</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = dpo.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxD = Math.max(...vals, 1e-9);
              return dpo.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxD) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {ao ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>AO</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = ao.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxA = Math.max(...vals, 1e-9);
              return ao.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxA) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {ac ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>AC</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = ac.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxAc = Math.max(...vals, 1e-9);
              return ac.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxAc) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {fractalChaosOsc ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Fractal Chaos Osc</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = fractalChaosOsc
                .filter((x): x is number => x != null)
                .map((v) => Math.abs(v));
              const maxF = Math.max(...vals, 1e-9);
              return fractalChaosOsc.map((v, i) => {
                if (v == null || v === 0) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxF) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bear : colors.bull,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {bop ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>BOP</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = bop.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxB = Math.max(...vals, 1e-9);
              return bop.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxB) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {bullPower ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Bull Power</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = bullPower.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxBp = Math.max(...vals, 1e-9);
              return bullPower.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxBp) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {bearPower ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Bear Power</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = bearPower.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxBe = Math.max(...vals, 1e-9);
              return bearPower.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxBe) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {tsi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>TSI</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = tsi.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxTsi = Math.max(...vals, 1e-9);
              return tsi.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxTsi) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {coppock ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Coppock</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = coppock.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxCop = Math.max(...vals, 1e-9);
              return coppock.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxCop) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {eom ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>EOM</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = eom.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxEom = Math.max(...vals, 1e-9);
              return eom.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxEom) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {ppo ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>PPO</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = ppo.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxP = Math.max(...vals, 1e-9);
              return ppo.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxP) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {chaikinVol ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Chaikin Vol</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = chaikinVol.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxCv = Math.max(...vals, 1e-9);
              return chaikinVol.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxCv) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {qstick ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Qstick</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = qstick.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxQ = Math.max(...vals, 1e-9);
              return qstick.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxQ) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {chop ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Choppiness</Text>
          <View style={styles.paneInner}>
            {chop.map((v, i) =>
              v == null ? (
                <View key={i} style={{ flex: 1 }} />
              ) : (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    marginTop: ((100 - v) / 100) * (paneH - 16),
                    backgroundColor: v > 61.8 ? colors.textDim : v < 38.2 ? colors.bull : accent,
                    borderRadius: 2,
                  }}
                />
              )
            )}
          </View>
        </View>
      ) : null}

      {bwmfi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>BW MFI</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = bwmfi.filter((x): x is number => x != null);
              const maxB = Math.max(...vals, 1e-9);
              return bwmfi.map((v, i) =>
                v == null ? (
                  <View key={i} style={{ flex: 1 }} />
                ) : (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, (v / maxB) * (paneH - 16)),
                      marginTop: paneH - 16 - (v / maxB) * (paneH - 16),
                      backgroundColor: colors.infoAccent,
                      opacity: 0.7,
                    }}
                  />
                )
              );
            })()}
          </View>
        </View>
      ) : null}

      {pvo ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>PVO</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = pvo.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxPv = Math.max(...vals, 1e-9);
              return pvo.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxPv) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {apo ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>APO</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = apo.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxA = Math.max(...vals, 1e-9);
              return apo.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxA) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {vo ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Volume Osc</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = vo.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxVo = Math.max(...vals, 1e-9);
              return vo.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxVo) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {vpt ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>VPT</Text>
          <View style={styles.paneInner}>
            {(() => {
              const minV = Math.min(...vpt);
              const maxV = Math.max(...vpt);
              const span = maxV - minV || 1;
              return vpt.map((v, i) => {
                if (i === 0) return <View key={i} style={{ flex: 1 }} />;
                const yNorm = (v - minV) / span;
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: 3,
                      marginTop: (1 - yNorm) * (paneH - 16),
                      backgroundColor: v >= vpt[i - 1] ? colors.bull : colors.bear,
                      opacity: 0.8,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {hv ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>HV</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = hv.filter((x): x is number => x != null);
              const maxH = Math.max(...vals, 1e-9);
              return hv.map((v, i) =>
                v == null ? (
                  <View key={i} style={{ flex: 1 }} />
                ) : (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, (v / maxH) * (paneH - 16)),
                      marginTop: paneH - 16 - (v / maxH) * (paneH - 16),
                      backgroundColor: colors.warn,
                      opacity: 0.7,
                    }}
                  />
                )
              );
            })()}
          </View>
        </View>
      ) : null}

      {atrp ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>ATR%</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = atrp.filter((x): x is number => x != null);
              const maxA = Math.max(...vals, 1e-9);
              return atrp.map((v, i) =>
                v == null ? (
                  <View key={i} style={{ flex: 1 }} />
                ) : (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, (v / maxA) * (paneH - 16)),
                      marginTop: paneH - 16 - (v / maxA) * (paneH - 16),
                      backgroundColor: colors.infoAccent,
                      opacity: 0.7,
                    }}
                  />
                )
              );
            })()}
          </View>
        </View>
      ) : null}

      {parkinsonVol ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Parkinson Vol</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = parkinsonVol.filter((x): x is number => x != null);
              const maxV = Math.max(...vals, 1e-9);
              return parkinsonVol.map((v, i) =>
                v == null ? (
                  <View key={i} style={{ flex: 1 }} />
                ) : (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, (v / maxV) * (paneH - 16)),
                      marginTop: paneH - 16 - (v / maxV) * (paneH - 16),
                      backgroundColor: '#F0ABFC',
                      opacity: 0.7,
                    }}
                  />
                )
              );
            })()}
          </View>
        </View>
      ) : null}

      {garmanKlassVol ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>G-K Vol</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = garmanKlassVol.filter((x): x is number => x != null);
              const maxV = Math.max(...vals, 1e-9);
              return garmanKlassVol.map((v, i) =>
                v == null ? (
                  <View key={i} style={{ flex: 1 }} />
                ) : (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, (v / maxV) * (paneH - 16)),
                      marginTop: paneH - 16 - (v / maxV) * (paneH - 16),
                      backgroundColor: '#67E8F9',
                      opacity: 0.7,
                    }}
                  />
                )
              );
            })()}
          </View>
        </View>
      ) : null}

      {rogersSatchellVol ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>R-S Vol</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = rogersSatchellVol.filter((x): x is number => x != null);
              const maxV = Math.max(...vals, 1e-9);
              return rogersSatchellVol.map((v, i) =>
                v == null ? (
                  <View key={i} style={{ flex: 1 }} />
                ) : (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, (v / maxV) * (paneH - 16)),
                      marginTop: paneH - 16 - (v / maxV) * (paneH - 16),
                      backgroundColor: '#FDBA8C',
                      opacity: 0.7,
                    }}
                  />
                )
              );
            })()}
          </View>
        </View>
      ) : null}

      {yangZhangVol ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Y-Z Vol</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = yangZhangVol.filter((x): x is number => x != null);
              const maxV = Math.max(...vals, 1e-9);
              return yangZhangVol.map((v, i) =>
                v == null ? (
                  <View key={i} style={{ flex: 1 }} />
                ) : (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, (v / maxV) * (paneH - 16)),
                      marginTop: paneH - 16 - (v / maxV) * (paneH - 16),
                      backgroundColor: '#FDE047',
                      opacity: 0.7,
                    }}
                  />
                )
              );
            })()}
          </View>
        </View>
      ) : null}

      {stochRsi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>StochRSI</Text>
          <View style={styles.paneInner}>
            {stochRsi.map((v, i) =>
              v == null ? (
                <View key={i} style={{ flex: 1 }} />
              ) : (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    marginTop: ((100 - v) / 100) * (paneH - 16),
                    backgroundColor: v > 80 ? colors.bear : v < 20 ? colors.bull : accent,
                    borderRadius: 2,
                  }}
                />
              )
            )}
          </View>
        </View>
      ) : null}

      {rvi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>RVI</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = rvi.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxR = Math.max(...vals, 1e-9);
              return rvi.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxR) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {linRegSlope ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>LR Slope</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = linRegSlope
                .filter((x): x is number => x != null)
                .map((v) => Math.abs(v));
              const maxL = Math.max(...vals, 1e-9);
              return linRegSlope.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxL) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {linRegR2 ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>LR R²</Text>
          <View style={styles.paneInner}>
            {linRegR2.map((v, i) =>
              v == null ? (
                <View key={i} style={{ flex: 1 }} />
              ) : (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: Math.max(2, v * (paneH - 16)),
                    marginTop: paneH - 16 - v * (paneH - 16),
                    backgroundColor: colors.accent,
                    opacity: 0.7,
                  }}
                />
              )
            )}
          </View>
        </View>
      ) : null}

      {percentB ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>%B</Text>
          <View style={styles.paneInner}>
            {percentB.map((v, i) => {
              if (v == null) return <View key={i} style={{ flex: 1 }} />;
              const pct = v * 100;
              const geomPct = Math.max(0, Math.min(100, pct));
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    marginTop: ((100 - geomPct) / 100) * (paneH - 16),
                    backgroundColor:
                      pct > 100 || pct < 0
                        ? colors.warn
                        : pct > 80
                        ? colors.bear
                        : pct < 20
                        ? colors.bull
                        : accent,
                    borderRadius: 2,
                  }}
                />
              );
            })}
          </View>
        </View>
      ) : null}

      {bbw ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>BBW</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = bbw.filter((x): x is number => x != null);
              const maxBw = Math.max(...vals, 1e-9);
              return bbw.map((v, i) =>
                v == null ? (
                  <View key={i} style={{ flex: 1 }} />
                ) : (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, (v / maxBw) * (paneH - 16)),
                      marginTop: paneH - 16 - (v / maxBw) * (paneH - 16),
                      backgroundColor: colors.accent,
                      opacity: 0.7,
                    }}
                  />
                )
              );
            })()}
          </View>
        </View>
      ) : null}

      {momentum ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Momentum</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = momentum.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxM = Math.max(...vals, 1e-9);
              return momentum.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxM) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {vhf ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>VHF</Text>
          <View style={styles.paneInner}>
            {vhf.map((v, i) => {
              if (v == null) return <View key={i} style={{ flex: 1 }} />;
              const pct = Math.max(0, Math.min(100, v * 100));
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    marginTop: ((100 - pct) / 100) * (paneH - 16),
                    backgroundColor: pct > 61.8 ? colors.bull : pct < 38.2 ? colors.textDim : accent,
                    borderRadius: 2,
                  }}
                />
              );
            })}
          </View>
        </View>
      ) : null}

      {pvi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>PVI</Text>
          <View style={styles.paneInner}>
            {(() => {
              const minP = Math.min(...pvi);
              const maxP = Math.max(...pvi);
              const span = maxP - minP || 1;
              return pvi.map((v, i) => {
                if (i === 0) return <View key={i} style={{ flex: 1 }} />;
                const yNorm = (v - minP) / span;
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: 3,
                      marginTop: (1 - yNorm) * (paneH - 16),
                      backgroundColor: v >= pvi[i - 1] ? colors.bull : colors.bear,
                      opacity: 0.8,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {gapo ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>GAPO</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = gapo.filter((v): v is number => v != null);
              const minP = Math.min(...vals, 0);
              const maxP = Math.max(...vals, 1e-9);
              const span = maxP - minP || 1;
              return gapo.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const prev = i > 0 ? gapo[i - 1] : null;
                const yNorm = (v - minP) / span;
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: 3,
                      marginTop: (1 - yNorm) * (paneH - 16),
                      backgroundColor:
                        prev == null ? accent : v >= prev ? colors.bull : colors.bear,
                      opacity: 0.8,
                      borderRadius: 2,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {ravi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>RAVI</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = ravi.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxR = Math.max(...vals, 1e-9);
              return ravi.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxR) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {ulcer ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Ulcer Index</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = ulcer.filter((x): x is number => x != null);
              const maxU = Math.max(...vals, 1e-9);
              return ulcer.map((v, i) =>
                v == null ? (
                  <View key={i} style={{ flex: 1 }} />
                ) : (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, (v / maxU) * (paneH - 16)),
                      marginTop: paneH - 16 - (v / maxU) * (paneH - 16),
                      backgroundColor: '#F87171',
                      opacity: 0.7,
                    }}
                  />
                )
              );
            })()}
          </View>
        </View>
      ) : null}

      {fisher ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Fisher Transform</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = fisher.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxF = Math.max(...vals, 1e-9);
              return fisher.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxF) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {kst ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>KST</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = kst.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxK = Math.max(...vals, 1e-9);
              return kst.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxK) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {vortex ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Vortex</Text>
          <View style={styles.paneInner}>
            {(() => {
              const plusVals = vortex.plus.filter((x): x is number => x != null);
              const minusVals = vortex.minus.filter((x): x is number => x != null);
              const allVals = [...plusVals, ...minusVals, 0.5, 1.5];
              const minV = Math.min(...allVals);
              const maxV = Math.max(...allVals);
              const span = maxV - minV || 1;
              const innerH = paneH - 16;
              return vortex.plus.map((pv, i) => {
                const mv = vortex.minus[i];
                return (
                  <View key={i} style={{ flex: 1, height: innerH, position: 'relative' }}>
                    {pv != null ? (
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          height: 3,
                          top: ((maxV - pv) / span) * innerH,
                          backgroundColor: colors.bull,
                          opacity: 0.85,
                        }}
                      />
                    ) : null}
                    {mv != null ? (
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          height: 3,
                          top: ((maxV - mv) / span) * innerH,
                          backgroundColor: colors.bear,
                          opacity: 0.85,
                        }}
                      />
                    ) : null}
                  </View>
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {dmi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>DMI</Text>
          <View style={styles.paneInner}>
            {(() => {
              const plusVals = dmi.plusDI.filter((x): x is number => x != null);
              const minusVals = dmi.minusDI.filter((x): x is number => x != null);
              const allVals = [...plusVals, ...minusVals, 0];
              const minV = Math.min(...allVals);
              const maxV = Math.max(...allVals);
              const span = maxV - minV || 1;
              const innerH = paneH - 16;
              return dmi.plusDI.map((pv, i) => {
                const mv = dmi.minusDI[i];
                return (
                  <View key={i} style={{ flex: 1, height: innerH, position: 'relative' }}>
                    {pv != null ? (
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          height: 3,
                          top: ((maxV - pv) / span) * innerH,
                          backgroundColor: colors.bull,
                          opacity: 0.85,
                        }}
                      />
                    ) : null}
                    {mv != null ? (
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          height: 3,
                          top: ((maxV - mv) / span) * innerH,
                          backgroundColor: colors.bear,
                          opacity: 0.85,
                        }}
                      />
                    ) : null}
                  </View>
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {rwi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>RWI</Text>
          <View style={styles.paneInner}>
            {(() => {
              const highVals = rwi.rwiHigh.filter((x): x is number => x != null);
              const lowVals = rwi.rwiLow.filter((x): x is number => x != null);
              const allVals = [...highVals, ...lowVals, 0];
              const minV = Math.min(...allVals);
              const maxV = Math.max(...allVals);
              const span = maxV - minV || 1;
              const innerH = paneH - 16;
              return rwi.rwiHigh.map((hv, i) => {
                const lv = rwi.rwiLow[i];
                return (
                  <View key={i} style={{ flex: 1, height: innerH, position: 'relative' }}>
                    {hv != null ? (
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          height: 3,
                          top: ((maxV - hv) / span) * innerH,
                          backgroundColor: colors.bull,
                          opacity: 0.85,
                        }}
                      />
                    ) : null}
                    {lv != null ? (
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          height: 3,
                          top: ((maxV - lv) / span) * innerH,
                          backgroundColor: colors.bear,
                          opacity: 0.85,
                        }}
                      />
                    ) : null}
                  </View>
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {aroonUpDown ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Aroon Up/Down</Text>
          <View style={styles.paneInner}>
            {(() => {
              const upVals = aroonUpDown.up.filter((x): x is number => x != null);
              const downVals = aroonUpDown.down.filter((x): x is number => x != null);
              const allVals = [...upVals, ...downVals, 0, 100];
              const minV = Math.min(...allVals);
              const maxV = Math.max(...allVals);
              const span = maxV - minV || 1;
              const innerH = paneH - 16;
              return aroonUpDown.up.map((uv, i) => {
                const dv = aroonUpDown.down[i];
                return (
                  <View key={i} style={{ flex: 1, height: innerH, position: 'relative' }}>
                    {uv != null ? (
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          height: 3,
                          top: ((maxV - uv) / span) * innerH,
                          backgroundColor: colors.bull,
                          opacity: 0.85,
                        }}
                      />
                    ) : null}
                    {dv != null ? (
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          height: 3,
                          top: ((maxV - dv) / span) * innerH,
                          backgroundColor: colors.bear,
                          opacity: 0.85,
                        }}
                      />
                    ) : null}
                  </View>
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {klinger ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Klinger</Text>
          <View style={styles.paneInner}>
            {(() => {
              const kvoVals = klinger.kvo.filter((x): x is number => x != null);
              const sigVals = klinger.signal.filter((x): x is number => x != null);
              const allVals = [...kvoVals, ...sigVals, 0];
              const minV = Math.min(...allVals);
              const maxV = Math.max(...allVals);
              const span = maxV - minV || 1;
              const innerH = paneH - 16;
              return klinger.kvo.map((kv, i) => {
                const sv = klinger.signal[i];
                return (
                  <View key={i} style={{ flex: 1, height: innerH, position: 'relative' }}>
                    {kv != null ? (
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          height: 3,
                          top: ((maxV - kv) / span) * innerH,
                          backgroundColor: colors.accent,
                          opacity: 0.85,
                        }}
                      />
                    ) : null}
                    {sv != null ? (
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          height: 3,
                          top: ((maxV - sv) / span) * innerH,
                          backgroundColor: colors.infoAccent,
                          opacity: 0.85,
                        }}
                      />
                    ) : null}
                  </View>
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {smi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>SMI</Text>
          <View style={styles.paneInner}>
            {(() => {
              const smiVals = smi.smi.filter((x): x is number => x != null);
              const sigVals = smi.signal.filter((x): x is number => x != null);
              const allVals = [...smiVals, ...sigVals, 0];
              const minV = Math.min(...allVals);
              const maxV = Math.max(...allVals);
              const span = maxV - minV || 1;
              const innerH = paneH - 16;
              return smi.smi.map((sv, i) => {
                const gv = smi.signal[i];
                return (
                  <View key={i} style={{ flex: 1, height: innerH, position: 'relative' }}>
                    {sv != null ? (
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          height: 3,
                          top: ((maxV - sv) / span) * innerH,
                          backgroundColor: colors.accent,
                          opacity: 0.85,
                        }}
                      />
                    ) : null}
                    {gv != null ? (
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          height: 3,
                          top: ((maxV - gv) / span) * innerH,
                          backgroundColor: colors.infoAccent,
                          opacity: 0.85,
                        }}
                      />
                    ) : null}
                  </View>
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {smiErgodic ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>SMI Ergodic Osc</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = smiErgodic.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxM = Math.max(...vals, 1e-9);
              return smiErgodic.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxM) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {pmo ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>PMO</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = pmo.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxP = Math.max(...vals, 1e-9);
              return pmo.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxP) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {trueRange ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>True Range</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = trueRange.filter((x): x is number => x != null);
              const maxV = Math.max(...vals, 1e-9);
              return trueRange.map((v, i) =>
                v == null ? (
                  <View key={i} style={{ flex: 1 }} />
                ) : (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, (v / maxV) * (paneH - 16)),
                      marginTop: paneH - 16 - (v / maxV) * (paneH - 16),
                      backgroundColor: '#FED7AA',
                      opacity: 0.7,
                    }}
                  />
                )
              );
            })()}
          </View>
        </View>
      ) : null}

      {stdError ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Std Error</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = stdError.filter((x): x is number => x != null);
              const maxV = Math.max(...vals, 1e-9);
              return stdError.map((v, i) =>
                v == null ? (
                  <View key={i} style={{ flex: 1 }} />
                ) : (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, (v / maxV) * (paneH - 16)),
                      marginTop: paneH - 16 - (v / maxV) * (paneH - 16),
                      backgroundColor: '#A5B4FC',
                      opacity: 0.7,
                    }}
                  />
                )
              );
            })()}
          </View>
        </View>
      ) : null}

      {ewmaVol ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>EWMA Vol</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = ewmaVol.filter((x): x is number => x != null);
              const maxV = Math.max(...vals, 1e-9);
              return ewmaVol.map((v, i) =>
                v == null ? (
                  <View key={i} style={{ flex: 1 }} />
                ) : (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, (v / maxV) * (paneH - 16)),
                      marginTop: paneH - 16 - (v / maxV) * (paneH - 16),
                      backgroundColor: '#86EFAC',
                      opacity: 0.7,
                    }}
                  />
                )
              );
            })()}
          </View>
        </View>
      ) : null}

      {volRoc ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Volume ROC</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = volRoc.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxV = Math.max(...vals, 1e-9);
              return volRoc.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxV) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {adxr ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>ADXR</Text>
          <View style={styles.paneInner}>
            {adxr.map((v, i) =>
              v == null ? (
                <View key={i} style={{ flex: 1 }} />
              ) : (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    marginTop: ((100 - v) / 100) * (paneH - 16),
                    backgroundColor: v >= 25 ? colors.warn : colors.textDim,
                    borderRadius: 2,
                  }}
                />
              )
            )}
          </View>
        </View>
      ) : null}

      {volatilityRatio ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Volatility Ratio</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = volatilityRatio.filter((x): x is number => x != null);
              const maxV = Math.max(...vals, 1e-9);
              return volatilityRatio.map((v, i) =>
                v == null ? (
                  <View key={i} style={{ flex: 1 }} />
                ) : (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, (v / maxV) * (paneH - 16)),
                      marginTop: paneH - 16 - (v / maxV) * (paneH - 16),
                      backgroundColor: v >= 1 ? colors.warn : colors.textDim,
                      opacity: 0.7,
                    }}
                  />
                )
              );
            })()}
          </View>
        </View>
      ) : null}

      {williamsAd ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Williams A/D</Text>
          <View style={styles.paneInner}>
            {(() => {
              const minA = Math.min(...williamsAd);
              const maxA = Math.max(...williamsAd);
              const span = maxA - minA || 1;
              return williamsAd.map((v, i) => {
                if (i === 0) return <View key={i} style={{ flex: 1 }} />;
                const yNorm = (v - minA) / span;
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: 3,
                      marginTop: (1 - yNorm) * (paneH - 16),
                      backgroundColor: v >= williamsAd[i - 1] ? colors.bull : colors.bear,
                      opacity: 0.8,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {gator ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Gator</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = [...gator.upper, ...gator.lower].filter(
                (x): x is number => x != null
              );
              const maxG = Math.max(0.00001, ...vals.map((v) => Math.abs(v)));
              return gator.upper.map((uv, i) => {
                const lv = gator.lower[i];
                if (uv == null && lv == null) return <View key={i} style={{ flex: 1 }} />;
                const uh =
                  uv != null
                    ? Math.min(paneH / 2 - 8, (Math.abs(uv) / maxG) * (paneH / 2 - 8))
                    : 0;
                const lh =
                  lv != null
                    ? Math.min(paneH / 2 - 8, (Math.abs(lv) / maxG) * (paneH / 2 - 8))
                    : 0;
                const upGrow = gator.upperGrowing[i];
                const lowGrow = gator.lowerGrowing[i];
                return (
                  <View key={i} style={{ flex: 1, position: 'relative', height: paneH }}>
                    {uv != null ? (
                      <View
                        style={{
                          position: 'absolute',
                          left: 1,
                          right: 1,
                          top: paneH / 2 - uh,
                          height: Math.max(2, uh),
                          backgroundColor: upGrow ? colors.bull : colors.bear,
                          opacity: 0.7,
                        }}
                      />
                    ) : null}
                    {lv != null ? (
                      <View
                        style={{
                          position: 'absolute',
                          left: 1,
                          right: 1,
                          top: paneH / 2,
                          height: Math.max(2, lh),
                          backgroundColor: lowGrow ? colors.bull : colors.bear,
                          opacity: 0.7,
                        }}
                      />
                    ) : null}
                  </View>
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {macd ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>MACD</Text>
          <View style={styles.paneInner}>
            {macd.hist.map((v, i) => {
              if (v == null) return <View key={i} style={{ flex: 1 }} />;
              const h = Math.min(paneH - 16, Math.abs(v) * 8000);
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: Math.max(2, h),
                    marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                    backgroundColor: v >= 0 ? colors.bull : colors.bear,
                    opacity: 0.7,
                  }}
                />
              );
            })}
          </View>
        </View>
      ) : null}

      {stoch ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>STO</Text>
          <View style={styles.paneInner}>
            {stoch.k.map((v, i) =>
              v == null ? (
                <View key={i} style={{ flex: 1 }} />
              ) : (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    marginTop: ((100 - v) / 100) * (paneH - 16),
                    backgroundColor: '#F472B6',
                  }}
                />
              )
            )}
          </View>
        </View>
      ) : null}

      {atr ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>ATR</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = atr.filter((x): x is number => x != null);
              const maxA = Math.max(...vals, 1e-9);
              return atr.map((v, i) =>
                v == null ? (
                  <View key={i} style={{ flex: 1 }} />
                ) : (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, (v / maxA) * (paneH - 16)),
                      marginTop: paneH - 16 - (v / maxA) * (paneH - 16),
                      backgroundColor: colors.warn,
                      opacity: 0.7,
                    }}
                  />
                )
              );
            })()}
          </View>
        </View>
      ) : null}

      {willr ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>%R</Text>
          <View style={styles.paneInner}>
            {willr.map((v, i) =>
              v == null ? (
                <View key={i} style={{ flex: 1 }} />
              ) : (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    marginTop: (-v / 100) * (paneH - 16),
                    backgroundColor: '#60A5FA',
                  }}
                />
              )
            )}
          </View>
        </View>
      ) : null}

      {cci ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>CCI</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = cci.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxC = Math.max(...vals, 1e-9);
              return cci.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxC) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {roc ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>ROC</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = roc.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxR = Math.max(...vals, 1e-9);
              return roc.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxR) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {stddev ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>STDEV</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = stddev.filter((x): x is number => x != null);
              const maxS = Math.max(...vals, 1e-9);
              return stddev.map((v, i) =>
                v == null ? (
                  <View key={i} style={{ flex: 1 }} />
                ) : (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, (v / maxS) * (paneH - 16)),
                      marginTop: paneH - 16 - (v / maxS) * (paneH - 16),
                      backgroundColor: colors.infoAccent,
                      opacity: 0.7,
                    }}
                  />
                )
              );
            })()}
          </View>
        </View>
      ) : null}

      {aroon ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>AROON</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = aroon.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxA = Math.max(...vals, 1e-9);
              return aroon.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxA) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {cmf ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>CMF</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = cmf.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxC = Math.max(...vals, 1e-9);
              return cmf.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = Math.min(paneH - 16, (Math.abs(v) / maxC) * (paneH / 2 - 8));
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                      backgroundColor: v >= 0 ? colors.bull : colors.bear,
                      opacity: 0.7,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {interactive && !compactUi ? (
        <View style={styles.dock}>
          <Text style={styles.dockTitle}>مرسى الأدوات · MATRIX</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {DRAW_TOOLS.map((t) => (
              <Pressable
                accessibilityRole="button"
                key={t.id}
                style={({ pressed }) => [
                  styles.tool,
                  tool === t.id && styles.toolOn,
                  pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                ]}
                onPress={() => {
                  setTool(t.id);
                  setPending(null);
                }}
              >
                <Text style={[styles.toolText, tool === t.id && styles.toolTextOn]}>{t.label}</Text>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.tool,
                pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
              ]}
              onPress={() => {
                Alert.alert('مسح كل الرسومات؟', 'سيتم حذف كل عناصر الرسم بهذا الرمز/الإطار الزمني', [
                  { text: 'إلغاء', style: 'cancel' },
                  {
                    text: 'مسح',
                    style: 'destructive',
                    onPress: () => {
                      setDrawings([]);
                      setPending(null);
                      void clearDrawings(series.symbol, series.timeframe);
                    },
                  },
                ]);
              }}
            >
              <Text style={styles.toolText}>مسح</Text>
            </Pressable>
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {INDICATORS.map((ind) => {
              const on = indicators.includes(ind.id);
              return (
                <Pressable
                  accessibilityRole="button"
                  key={ind.id}
                  style={({ pressed }) => [
                    styles.ind,
                    on && styles.indOn,
                    pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                  ]}
                  onPress={() => toggleInd(ind.id)}
                >
                  <Text style={[styles.indText, on && styles.indTextOn]}>{ind.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.ind,
                !pineOn && styles.indOn,
                pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
              ]}
              onPress={() => setPineOn(false)}
            >
              <Text style={[styles.indText, !pineOn && styles.indTextOn]}>بدون خط Pine</Text>
            </Pressable>
            {INDICATOR_LIBRARY.map((p) => {
              const on = pineOn && pineFormula === p.formula;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={p.id}
                  style={({ pressed }) => [
                    styles.ind,
                    on && styles.indOn,
                    pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                  ]}
                  onPress={() => {
                    if (on) {
                      setPineOn(false);
                      return;
                    }
                    setPineFormula(p.formula);
                    setPineOn(true);
                  }}
                >
                  <Text style={[styles.indText, on && styles.indTextOn]}>{p.name}</Text>
                </Pressable>
              );
            })}
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.tool,
                pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
              ]}
              onPress={() => void exportChart()}
            >
              <Text style={styles.toolText}>تصدير PNG</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.tool,
                pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
              ]}
              onPress={persistTemplate}
            >
              <Text style={styles.toolText}>حفظ قالب</Text>
            </Pressable>
            {selectedId ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.tool,
                    pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                  ]}
                  onPress={() => {
                    Alert.alert('حذف الرسم؟', 'سيُحذف عنصر الرسم المحدَّد من الشارت', [
                      { text: 'إلغاء', style: 'cancel' },
                      {
                        text: 'حذف',
                        style: 'destructive',
                        onPress: () => {
                          setDrawings((list) => list.filter((x) => x.id !== selectedId));
                          setSelectedId(null);
                        },
                      },
                    ]);
                  }}
                >
                  <Text style={styles.toolText}>حذف</Text>
                </Pressable>
                {(() => {
                  const d = drawings.find((x) => x.id === selectedId);
                  if (d?.tool === 'hline' && onCreateAlert) {
                    return (
                      <Pressable
                        accessibilityRole="button"
                        style={({ pressed }) => [
                          styles.tool,
                          styles.toolOn,
                          pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                        ]}
                        onPress={() => onCreateAlert(d.a.price)}
                      >
                        <Text style={styles.toolTextOn}>تنبيه خط</Text>
                      </Pressable>
                    );
                  }
                  if (d?.tool === 'zone' && d.b && onCreateAlert) {
                    const aPrice = d.a.price;
                    const bPrice = d.b.price;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        style={({ pressed }) => [
                          styles.tool,
                          styles.toolOn,
                          pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                        ]}
                        onPress={() => {
                          onCreateAlert(Math.max(aPrice, bPrice));
                          onCreateAlert(Math.min(aPrice, bPrice));
                        }}
                      >
                        <Text style={styles.toolTextOn}>تنبيه منطقة</Text>
                      </Pressable>
                    );
                  }
                  if (d?.tool === 'trend' && d.b && onCreateAlert && d.b.index !== d.a.index) {
                    // تنبيه من خط اتجاه مائل: السعر متغيّر بالزمن على الخط نفسه (بعكس hline/zone
                    // الثابتين)، ونموذج التنبيه الحالي (onCreateAlert) يقبل سعراً ثابتاً واحداً فقط.
                    // تبسيط صادق موثَّق: نحسب سعر الخط عند آخر شمعة حالياً (استقراء خطي من نقطتي
                    // الرسم) ونُنشئ تنبيهاً ثابتاً بهذا المستوى — "لقطة" لحظة الإنشاء، وليس تتبّعاً
                    // مستمراً لمستوى الخط مستقبلاً (ذلك يحتاج منطق خادم/تقييم بكل تحديث، خارج نطاق
                    // نموذج التنبيه الثابت الحالي). مفيد عملياً لمن يريد تنبيهاً عند عودة السعر لمستوى
                    // الخط الحالي، لكنه لا يتحرّك مع الخط لاحقاً — الفرق موضَّح بنص الزر نفسه.
                    const slope = (d.b.price - d.a.price) / (d.b.index - d.a.index);
                    const lastGlobalIndex = source.start + source.plot.length - 1;
                    const currentPrice = d.a.price + slope * (lastGlobalIndex - d.a.index);
                    return (
                      <Pressable
                        accessibilityRole="button"
                        style={({ pressed }) => [
                          styles.tool,
                          styles.toolOn,
                          pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                        ]}
                        onPress={() => onCreateAlert(currentPrice)}
                      >
                        <Text style={styles.toolTextOn}>تنبيه عند مستوى الخط الحالي</Text>
                      </Pressable>
                    );
                  }
                  return null;
                })()}
              </>
            ) : null}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { gap: 6 },
  rootDense: { gap: 0 },
  compactToolbar: {
    backgroundColor: 'rgba(18,26,43,0.96)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  compactToolsRow: { flexDirection: 'row-reverse', padding: 4, gap: 3 },
  compactTool: {
    minWidth: 42,
    height: 43,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  compactToolOn: { backgroundColor: colors.accentSoft },
  compactToolIcon: { color: colors.text, fontSize: 16, fontWeight: '800', lineHeight: 18 },
  compactToolLabel: { color: colors.textDim, fontSize: 8, fontWeight: '700', marginTop: 1 },
  compactToolTextOn: { color: colors.accent },
  toolbar: { gap: 6 },
  row: { flexDirection: 'row-reverse', gap: 6, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  chipText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  chipTextOn: { color: colors.accent },
  lens: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: '#0A1524',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    minWidth: 78,
  },
  lensTitle: { color: colors.text, fontWeight: '800', fontSize: 11, textAlign: 'right' },
  lensHint: { color: colors.textDim, fontSize: 9, textAlign: 'right', marginTop: 2 },
  readout: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  readoutText: { color: colors.text, fontSize: 11, fontFamily: 'monospace', flex: 1, textAlign: 'right' },
  readoutMuted: { color: colors.textDim, fontSize: 11, flex: 1, textAlign: 'right' },
  drawingsSaveError: {
    color: colors.bear,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'right',
  },
  zoomRow: { flexDirection: 'row', gap: 4 },
  zoomBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: { color: colors.text, fontWeight: '800', fontSize: 14 },
  replayOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  replayTextOn: { color: colors.accent },
  plot: {
    backgroundColor: '#071018',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    overflow: 'hidden',
    position: 'relative',
  },
  plotBare: {
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  chartGestureSurface: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 40,
    backgroundColor: 'rgba(0,0,0,0.001)',
  },
  priceAxis: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: '#09131F',
    borderLeftWidth: 1,
    borderLeftColor: colors.borderSoft,
    zIndex: 55,
  },
  priceAxisBare: {
    backgroundColor: 'transparent',
    borderLeftWidth: 0,
    pointerEvents: 'none',
  },
  priceAxisLabel: {
    position: 'absolute',
    left: 4,
    right: 3,
    color: colors.text,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
    textAlign: 'right',
  },
  currentPriceLine: {
    position: 'absolute',
    left: 0,
    borderTopWidth: 1,
    borderTopColor: colors.accent,
    borderStyle: 'dashed',
    opacity: 0.55,
    zIndex: 10,
  },
  currentPriceTag: {
    position: 'absolute',
    left: 2,
    right: 2,
    minHeight: 18,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  currentPriceText: {
    color: '#041514',
    fontSize: 9,
    lineHeight: 14,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  timeAxis: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    backgroundColor: '#09131F',
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    zIndex: 55,
    overflow: 'visible',
  },
  timeAxisLabel: {
    position: 'absolute',
    top: 4,
    width: 88,
    color: colors.text,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  timeAxisLabelCompact: {
    fontSize: 9,
    lineHeight: 12,
    top: 5,
  },
  axisCorner: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    zIndex: 60,
    backgroundColor: '#0D1928',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  axisCornerText: { color: colors.accent, fontSize: 8, fontWeight: '900' },
  dot: { position: 'absolute', width: 3, height: 3, borderRadius: 2 },
  hLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  vLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderLeftWidth: 1,
    borderStyle: 'dashed',
  },
  fibLabel: {
    position: 'absolute',
    right: 4,
    top: -10,
    color: colors.textDim,
    fontSize: 9,
  },
  note: { position: 'absolute', fontSize: 10, fontWeight: '800' },
  pending: {
    position: 'absolute',
    width: 10,
    height: 10,
    marginLeft: -5,
    marginTop: -5,
    borderRadius: 5,
    backgroundColor: colors.warn,
    borderWidth: 2,
    borderColor: '#fff',
  },
  crossV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(232,238,249,0.35)',
  },
  crossH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(232,238,249,0.35)',
  },
  pane: {
    backgroundColor: '#070F18',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    flexDirection: 'row-reverse',
    overflow: 'hidden',
  },
  paneLabel: {
    width: 36,
    color: colors.textDim,
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
    paddingTop: 6,
  },
  paneInner: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 2 },
  dock: {
    marginTop: 4,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 6,
  },
  dockTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'right',
    letterSpacing: 0.6,
  },
  tool: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toolOn: { backgroundColor: colors.warn, borderColor: colors.warn },
  toolText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  toolTextOn: { color: '#111' },
  ind: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: '#0A1524',
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  indOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  indText: { color: colors.textDim, fontSize: 10, fontWeight: '700' },
  indTextOn: { color: colors.accent },
});
