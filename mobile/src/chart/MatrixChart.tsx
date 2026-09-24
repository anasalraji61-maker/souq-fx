import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
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
import type { Candle, ChartSeries } from '../api';
import {
  loadDrawings,
  saveDrawings,
  clearDrawings,
  subscribeDrawings,
  subscribeDrawingsSaveError,
  type DrawingsSaveErrorCode,
} from './drawingStore';
import { compareOverlayPrices } from './compare';
import { tickPlausibleForSeries, withLiveExtremes, withLivePrice, type LiveExtremes } from './liveSeries';
import { computeVolumeProfile, pocPrice, computeTpo } from './volumeProfile';
import { evalPineLite, INDICATOR_LIBRARY } from './pineLite';
import { renko, measureStats } from './renko';
import { kagi } from './kagi';
import { pointFigure } from './pointFigure';
import { rangeBars } from './range';
import { computeCvd, computeFootprint } from './orderflow';
import { collapsedBarText, planPanes } from './panes';
import { macdPaneGeom } from './macdPane';
import { candleBodyWidth } from './candleGeometry';
import { pinchSpread, pinchWindow, zoomWindow } from './zoomWindow';
import {
  AXIS_TAP_SLOP,
  isDoubleTap,
  priceAxisDragScale,
  timeAxisDragWindow,
  type AxisTap,
} from './axisDrag';
import { barCloseCountdown } from './barCountdown';
import { BarCountdown } from './BarCountdown';
import { crossPriceAt, indexAtOrBeforeTime, indexOfBarTime, stepCrossBar } from './crossAnchor';
import { indicatorBase, trimIndicator } from './indicatorWindow';
import {
  axisTickCount,
  axisTickRatios,
  axisShowsHours,
  layoutAxisLabels,
  boxesTouch,
  offAxisSide,
} from './axisTicks';
import {
  centeredBarH,
  centeredBarTop,
  centeredPaneInnerH,
  centeredPaneZeroY,
} from './centeredPane';
import { STOCH_LINE_H, stochPaneGeom } from './stochPane';
import {
  planPriceLegendForWidth,
  resolveColorExpr,
} from './priceLegend';
import {
  formatPaneValue,
  paneBoundedDecimals,
  formatPaneValueScaled,
  paneSpreadSeries,
  paneValueAt,
  paneValueState,
  paneValueTrend,
  placeGuides,
} from './paneGuides';
import { DrawingsSaveQueue, drawingsKey, drawingsSignature } from './drawingsPersist';
import {
  clipSegmentToBars,
  dragChangesDrawing,
  drawingEnd,
  rayReach,
  sameDrawingPlace,
  samePoint,
  translateDrawing,
} from './drawEdit';
import {
  isPositionTool,
  positionLabelLeft,
  positionLabels,
  positionLevels,
  positionEndIndex,
  positionOutcome,
  positionOutcomeText,
  positionStop,
  rrFromTarget,
  type PositionSide,
} from './positionTool';
import { anchorDrawings, barTime, stampAtIndex, type TimeBar } from './drawingAnchors';
import { lineNowText, placeSelectionTags, selectionPrices } from './selectionTags';
import { appendedAfter } from './holdView';
import { priceSpan } from './priceSpan';
import { FIB_EXTENSIONS, fibLevelPrice, isFibExtension, planFibLabels, type FibLabelPlan } from './fibLabels';
import {
  candleRangePipsText,
  measureDurationSec,
  measurePipsText,
  measureReadoutText,
} from './measureReadout';
import { inLeftLabelLane, LEFT_LABEL_LANE_W, thinByGap } from './levelLabels';
import { planHiLoLabels } from './hiLoLabels';
import { planDayBreaks } from './dayBreaks';
import { tradingDayStartSec } from './marketHours';
import { planSessionRuns, SESSION_LABEL, type SessionId } from './sessions';
import { formatPct, prevSessionFromDaily, validSessionBar } from './dailyChange';
import { useDailyPrevBar } from './dailyRefStore';
import { candlesThrough, pivotInput, pivotLabelRank, pivotSessionStartIndex, prevDayFromIntraday } from './pivotBase';
import { candleTimeSec, normalizeProvenance, timeframeStepSec } from './dataSource';
import { planLineSegments, planBandStrips, bandStripWidth } from './polyline';
import { loadTemplates, saveTemplate, getTemplatesSaveError, DEFAULT_TEMPLATE } from './chartTemplateStore';
import { useI18n } from '../i18n/I18nContext';
import {
  localizedChartKinds,
  localizedDrawTools,
  localizedIndicators,
  localizedLenses,
  chartExtraLabels,
} from './typeLabels';
import {
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
  computeCpr,
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
  computeLaguerreRsi,
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
  computeTdi,
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
  computeVfi,
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
  symbolPriceDecimals,
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
  /** origin: 'crosshair' = زر 🔔 بسطر القراءة عند سعر الشمعة المحددة؛ غير ذلك = من أداة رسم. */
  onCreateAlert?: (price: number, origin?: 'drawing' | 'crosshair') => void;
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
  /** تقاطع مشترك (التابع): زمن شمعة القائد بالثواني ⇒ خطّ عمودي على الشمعة السارية عنده. */
  syncCrossTime?: number | null;
  /** تقاطع مشترك (القائد): يُنشر زمن شمعة التقاطع بالثواني، و`null` عند مسحه. */
  onCrossTime?: (timeSec: number | null) => void;
  /** إغلاق شمعة الإعادة (`null` خارج الإعادة) — لرأس الإطار كي لا يطبع سعر اليوم فوق شموع الماضي. */
  onReplayPrice?: (price: number | null) => void;
};

/** جذب التقاطع لـO/H/L/C: أقرب من هذا (px) فقط — وإلا يبقى على المستوى الملموس. */
const CROSS_SNAP_PX = 14;

type PointerEventLike = {
  nativeEvent?: {
    clientX?: number;
    clientY?: number;
    pageX?: number;
    pageY?: number;
    pointerId?: number;
    pointerType?: string;
  };
  currentTarget?: {
    setPointerCapture?: (pointerId: number) => void;
    releasePointerCapture?: (pointerId: number) => void;
    getBoundingClientRect?: () => { left: number; top: number };
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
  long: '⇡',
  short: '⇣',
};

const PRICE_AXIS_WIDTH = 68;
/** ألوان الجلسات (مؤشّر «Sessions»): ثابتة المعنى داخله وحده — لا ربح/خسارة ولا تنبيه. */
const SESSION_COLOR: Record<SessionId, string> = {
  tokyo: '#A78BFA',
  london: '#38BDF8',
  ny: '#E8B86D',
};
const PIVOT_IDS = new Set<string>(['pivots', 'fibPivots', 'camarilla', 'woodiePivots', 'demarkPivots', 'cpr', 'pdhl']);
const TIME_AXIS_HEIGHT = 48;
const CROSS_TIME_TAG_W = 104;
/** فجوة دنيا بين علامتي زمن متجاورتين، ومقاس علامة السعر وفجوتها — راجع `axisTicks.ts`. */
const TIME_LABEL_GAP = 6;
const PRICE_LABEL_H = 14;
const PRICE_LABEL_GAP = 4;
/** علوّ وسم السعر (الحيّ ووسم التقاطع)، وفجوة ما يُخفى من العلامات تحته. */
const PRICE_TAG_H = 18;
const TAG_CLEAR_GAP = 2;
/** ارتفاع وسمَي أعلى/أدنى سعر بالنافذة المرئيّة. */
const HILO_LABEL_H = 14;
/** سطر عدّاد إغلاق الشمعة تحت سعر الوسم الحيّ. */
const COUNTDOWN_LINE_H = 11;

/** آخر شارت نُقر على الويب — أسهم لوحة المفاتيح وEsc له وحده لا لكل شارت بالصفحة. */
let webKeyChart: object | null = null;

function candleTimeSec(t: number): number {
  return t > 1e12 ? t / 1000 : t;
}

type DrawingHit = { id: string; dist: number } | null;

/** نصف قطر مقبض الطرف بالبكسل — التقاطاً للتحديد وسحباً للتحريك (قيمة واحدة للاثنين). */
const DRAW_HANDLE_R = 18;

/** سقف لقطات التراجع — يكفي جلسة رسم كاملة ولا يكبر بلا حدّ بذاكرة الهاتف. */
const DRAW_HISTORY_MAX = 25;
/** مستويات فيبو المرسومة: الارتداد ثم أهداف الامتداد بعد نهاية الموجة (`FIB_EXTENSIONS`). */
const FIB_DRAW_LEVELS: readonly number[] = [...FIB_LEVELS, ...FIB_EXTENSIONS];
/** أقلّ تباعد رأسي بين وسمَي مستوى فيبو = علوّ سطر الوسم (`fibLevelLabel`: 13px). */
const FIB_LABEL_GAP = 13;
/** ومثله لوسم سعر الخطّ الأفقي (`levelPriceLabel`). */
const HLINE_LABEL_GAP = 13;

/** مرجع ثابت لـ«لا رسومات» — مصفوفة جديدة كل رسم تُبطل ذاكرة كل ما يعتمد عليها. */
const NO_DRAWINGS: Drawing[] = [];

let drawingSeq = 0;
/** `d${Date.now()}` كان يتصادم عند رسمَين بنفس المللي ثانية (نقرتان سريعتان بخط أفقي). */
function nextDrawingId(): string {
  drawingSeq += 1;
  return `d${Date.now()}_${drawingSeq}`;
}

/** أقرب مسافة بالبكسل بين نقطة وقطعة مستقيمة؛ `tMax > 1` يمدّها شعاعاً بعد الطرف الثاني. */
function segmentDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  tMax: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 <= 1e-6) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(tMax, ((px - x1) * dx + (py - y1) * dy) / len2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/** يُرجع المرشَّح الأقرب — دالة خالصة بدل الإسناد داخل مغلِّف (يربك تضييق أنواع TS). */
function considerHit(id: string, dist: number, max: number, cur: DrawingHit): DrawingHit {
  if (dist > max) return cur;
  if (cur && cur.dist <= dist) return cur;
  return { id, dist };
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

/**
 * Axis tick label. `compact` (narrow plot, ~56–72px per label) swaps long month names
 * (Arabic «سبتمبر», Kurdish «کانوونی یەکەم») for a numeric day/month so a label never
 * wraps to a third line or spills into its neighbour (long spans: «9/2026»).
 */
function formatAxisTime(
  unixTime: number,
  spanSeconds: number,
  months: string[],
  compact = false,
  dayCandles = false,
  withHours = spanSeconds <= 2 * 86400
): string {
  const milliseconds = unixTime > 1e12 ? unixTime : unixTime * 1000;
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime())) return '';
  const p = candleDateParts(date, dayCandles);
  const hh = String(p.hours).padStart(2, '0');
  const mm = String(p.minutes).padStart(2, '0');
  const mon = months[p.month] ?? '';
  const dayMonth = compact ? `${p.day}/${p.month + 1}` : `${p.day} ${mon}`;
  if (withHours && !dayCandles) {
    return `${hh}:${mm}\n${dayMonth}`;
  }
  if (spanSeconds <= 120 * 86400) {
    return dayMonth;
  }
  return compact
    ? `${p.month + 1}/${p.year}`
    : `${mon} ${p.year}`;
}

/**
 * شمعة اليوم/الأسبوع تُفتح عند 00:00 UTC (المزوّد يُرجع تاريخاً بلا ساعة، يُقرأ UTC).
 * بالتوقيت المحلي كانت شمعة 24 سبتمبر تُكتب «23 سبتمبر 20:00» لمتداول بنيويورك —
 * **يومٌ خاطئ** على الشارت اليومي، وساعةٌ لا معنى لها بشمعة يوم كامل. فالتاريخ بـUTC
 * وبلا ساعة لهذه الفريمات؛ فريمات الساعات وما دونها تبقى بالتوقيت المحلي كما هي.
 */
function candleDateParts(date: Date, dayCandles: boolean) {
  return dayCandles
    ? {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth(),
        day: date.getUTCDate(),
        hours: date.getUTCHours(),
        minutes: date.getUTCMinutes(),
      }
    : {
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDate(),
        hours: date.getHours(),
        minutes: date.getMinutes(),
      };
}

/** Full date + time for the crosshair time tag (always explicit, unlike axis ticks). */
function formatCrossTime(
  unixTime: number,
  spanSeconds: number,
  months: string[],
  dayCandles = false
): string {
  const milliseconds = unixTime > 1e12 ? unixTime : unixTime * 1000;
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime())) return '';
  const p = candleDateParts(date, dayCandles);
  const mon = months[p.month] ?? '';
  // شمعة داخل اليوم تحمل ساعتها دائماً: بمدى > 120 يوماً (4H أو 1H بعد تحميل تاريخ طويل) كان
  // الوسم يطبع «12 سبتمبر 2026» لشمعة 4 ساعات — ست شموع بالوسم نفسه ولا يُعرف أيّها تحت الإصبع.
  if (dayCandles) return `${p.day} ${mon} ${p.year}`;
  const hh = String(p.hours).padStart(2, '0');
  const mm = String(p.minutes).padStart(2, '0');
  return `${p.day} ${mon} ${hh}:${mm}`;
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

/**
 * خطوط العتبات داخل لوحة محصورة المدى (RSI 30/70، ستوكاستيك 20/80، ADX 25، ‎%R −20/−80‎).
 * تُرسم أولاً فتبقى خلف شريط المؤشّر، وبنفس `innerH` الذي تستعمله معادلة الشريط بالضبط
 * فتتطابق العتبة مع موضعها على الرسم لا تقاربه. تختفي الخطوط الوسطى ثم الأرقام ثم الخطوط
 * كلّها كلّما قصُرت اللوحة (انظر `placeGuides`).
 */
function PaneGuideLines({ paneId, innerH }: { paneId: string; innerH: number }) {
  const guides = placeGuides(paneId, innerH);
  if (guides.length === 0) return null;
  return (
    <>
      {guides.map((g) => (
        <React.Fragment key={g.v}>
          <View
            pointerEvents="none"
            style={[styles.paneGuideLine, g.kind === 'mid' && styles.paneGuideLineMid, { top: g.top }]}
          />
          {g.label ? (
            // الرقم داخل View لا مباشرةً: `pointerEvents` خاصية View، و`Text` عارٍ قد يبتلع
            // بداية سحب الشارت عند أقصى اليسار.
            <View pointerEvents="none" style={[styles.paneGuideLabelBox, { top: Math.max(0, g.top - 5) }]}>
              <Text style={styles.paneGuideLabel}>{g.label}</Text>
            </View>
          ) : null}
        </React.Fragment>
      ))}
    </>
  );
}

/**
 * رأس اللوحة: الاسم + **قيمة الشمعة الأخيرة**. اللوحات كانت تذكر الاسم وحده، فلا يفرّق
 * المتداول بين RSI عند 62 و68 وكلاهما «بين الخطين». الرقم وحده هو الملوَّن (لا الرسم):
 * أحمر عند تجاوز العتبة العليا وأخضر تحت السفلى — نفس دلالة ألوان الشريط القائمة.
 */
function PaneHead({
  paneId,
  name,
  values,
  at = null,
  highColor = colors.bear,
}: {
  paneId: string;
  name: string;
  values: readonly (number | null)[];
  /** شمعة التقاطع (فهرس داخل نافذة الرسم)، أو null فآخر شمعة. */
  at?: number | null;
  highColor?: string;
}) {
  const v = paneValueAt(values, at);
  // خانات الكسر من **مدى اللوحة** لا ثابتة: ‎%B‎ بين 0 و1 فخانة واحدة تطمس كل قراءاته.
  const txt = formatPaneValue(v, paneBoundedDecimals(paneId));
  const state = paneValueState(paneId, v);
  return (
    <View style={styles.paneHead}>
      <Text style={styles.paneHeadName}>{name}</Text>
      {txt ? (
        <Text
          style={[
            styles.paneHeadValue,
            state === 'high' && { color: highColor },
            state === 'low' && { color: colors.bull },
          ]}
        >
          {txt}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * رأس لوحة **ثنائية الجانب**: الاسم، وتحته قيمة آخر شمعة.
 *
 * بخلاف `PaneHead` لا عتبات هنا — مقياس هذه اللوحات ديناميكي، فلا «تشبّع» يُلوَّن له.
 * الإشارة الوحيدة المعنيّة بلوحة تدور حول الصفر هي **الجانب**، وهي نفس دلالة لون
 * الأعمدة أسفلها (أخضر فوق الصفر، أحمر تحته) فيقرأ المتداول الاثنين كوحدة واحدة.
 *
 * وكان هذا الصفّ يعرض الاسم وحده بالـ47 لوحة: يرى المتداول عموداً أخضر قصيراً ولا
 * يعرف أهو ‎0.0004‎ أم ‎0.4‎ — ولا يقارن قراءة اليوم بقراءة الأمس أصلاً.
 */
function PaneValueHead({
  name,
  values,
  at = null,
  tone = 'sign',
}: {
  name: string;
  values: readonly (number | null | undefined)[];
  /** شمعة التقاطع (فهرس داخل نافذة الرسم)، أو null فآخر شمعة. */
  at?: number | null;
  /**
   * ما يعنيه لون الرقم:
   * - `'sign'` (الافتراض): الجانب — للوحة تدور حول الصفر، وهي نفس دلالة لون أعمدتها.
   * - `'trend'`: صعوداً أم هبوطاً عن الشمعة السابقة — للوحة **موجبة دائماً** (ATR،
   *   BBW، الانحراف المعياري): إشارتها لا تتغيّر أبداً فتلوين الجانب يجعل الرقم أخضر
   *   أبداً ولا يقول شيئاً، بينما ما يقرؤه المتداول من هذه اللوحات هو **التوسّع أم
   *   الانكماش**. نفس منطق رأس Gator.
   * - `'none'`: بلا لون — حيث تحمل الأعمدة دلالةً أخرى (اتجاه الشمعة مثلاً) فيتنافس
   *   لونان على معنيين مختلفين.
   */
  tone?: 'sign' | 'trend' | 'none';
}) {
  const v = paneValueAt(values, at);
  // المقياس من السلسلة كاملةً لا من الشمعة المقروءة — فلا يتبدّل شكل الرقم
  // بتحرّك التقاطع، وهو نفس سبب اشتقاق الصياغة من مقياس اللوحة أصلاً.
  const txt = formatPaneValueScaled(values, v);
  // الاتّجاه محدود بشمعة التقاطع كالقيمة نفسها — فاللون والرقم يصفان شمعة واحدة.
  const trend = tone === 'trend' ? paneValueTrend(values, at) : null;
  return (
    <View style={styles.paneHead}>
      <Text style={styles.paneHeadName}>{name}</Text>
      {txt ? (
        <Text
          style={[
            styles.paneHeadValue,
            txt.length >= 7 && styles.paneHeadValueLong,
            tone === 'sign' && v != null && v > 0 && { color: colors.bull },
            tone === 'sign' && v != null && v < 0 && { color: colors.bear },
            trend === 'up' && { color: colors.bull },
            trend === 'down' && { color: colors.bear },
          ]}
        >
          {txt}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * رأس لوحة **ذات سلسلتين** (Gator وحدها اليوم): الاسم، وتحته **اتّساع الفكّ** —
 * `upper − lower` لآخر شمعة صالحة.
 *
 * كانت اللوحة الوحيدة الباقية بالاسم وحده: سلسلتان لا واحدة، وعمود ‎36px‎ لا يسع رقمين،
 * فبقي المتداول يرى شريطين ولا يعرف أهُما ‎0.0004‎ أم ‎0.4‎ — ولا يقارن اتّساع اليوم
 * باتّساع الأمس. والاتّساع هو ما يقرؤه من التمساح فعلاً: فكّ مفتوح ⇐ اتجاه، ومنطبق ⇐ نوم.
 *
 * الصياغة بنفس `formatPaneValueScaled` المستعملة بالـ47 لوحة — لا شيفرة صياغة جديدة،
 * والمقياس من سلسلة الاتّساع نفسها فتثبت خانات الكسر ولا يتغيّر شكل الرقم مع كل تيك.
 * واللون من **اتّجاه الاتّساع** لا من إشارته: الإشارة موجبة أبداً هنا فتلوينها بالجانب
 * يجعلها خضراء دائماً ولا يقول شيئاً.
 */
function PaneSpreadHead({
  name,
  upper,
  lower,
  at = null,
  tone = 'trend',
}: {
  name: string;
  upper: readonly (number | null)[];
  lower: readonly (number | null)[];
  /** شمعة التقاطع (فهرس داخل نافذة الرسم)، أو null فآخر شمعة. */
  at?: number | null;
  /**
   * ما يعنيه لون الفارق — ويختلف باختلاف اللوحة اختلافاً جوهرياً:
   * - `'trend'` (الافتراض، Gator): السلسلتان بجانبَي الصفر فالفارق موجب أبداً، ولا
   *   إشارة تُلوَّن. المعنى: يتّسع أم ينكمش.
   * - `'sign'` (DMI): السلسلتان موجبتان كلتاهما، **وإشارة الفارق هي الإشارة نفسها** —
   *   ‎+DI‎ فوق ‎−DI‎ يعني كفّة الشراء، وهو ما يُقرأ من DMI أصلاً. تلوينه بالاتّجاه هنا
   *   يخفي انقلاب الكفّة ويُظهر «يضيق/يتّسع» مكانه.
   */
  tone?: 'trend' | 'sign';
}) {
  const spread = useMemo(() => paneSpreadSeries(upper, lower), [upper, lower]);
  const v = paneValueAt(spread, at);
  const txt = formatPaneValueScaled(spread, v);
  const trend = tone === 'trend' ? paneValueTrend(spread, at) : null;
  return (
    <View style={styles.paneHead}>
      <Text style={styles.paneHeadName}>{name}</Text>
      {txt ? (
        <Text
          style={[
            styles.paneHeadValue,
            txt.length >= 7 && styles.paneHeadValueLong,
            trend === 'up' && { color: colors.bull },
            trend === 'down' && { color: colors.bear },
            tone === 'sign' && v != null && v > 0 && { color: colors.bull },
            tone === 'sign' && v != null && v < 0 && { color: colors.bear },
          ]}
        >
          {txt}
        </Text>
      ) : null}
    </View>
  );
}

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
  syncCrossTime,
  onCrossTime,
  onReplayPrice,
}: Props,
  ref
) {
  const { t: tr, lang } = useI18n();
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
  const kindRef = useRef(kind);
  kindRef.current = kind;
  // مفتاح الشمعة التي انتهى عدّادها (رمز|فريم|وقت) — يُقصَّر وسم السعر لسطر واحد حتى شمعة جديدة.
  const [countdownEndedKey, setCountdownEndedKey] = useState<string | null>(null);
  const [lens, setLens] = useState<LensMode>(initialLens ?? 'clean');
  const [extraInd, setExtraInd] = useState<IndicatorId[]>(initialIndicators ?? []);
  const [tool, setTool] = useState<DrawTool>(initialTool ?? 'none');
  const [loadedDrawings, setDrawings] = useState<Drawing[]>([]);
  // **مفتاح الرمز/الفريم الذي تخصّه `loadedDrawings` فعلاً.** تبديل الرمز يغيّر
  // `series.symbol` فوراً بينما `loadDrawings` غير متزامنة، فبين اللحظتين كانت رسومات
  // الرمز السابق تُعرض على الشارت الجديد. القراءة هنا لا بالتأثير: التأثير يقع بعد
  // الرسم، فيبقى إطار كامل تظهر فيه خطوط رمز آخر — وهو أوضح ما يكون عند تبديل
  // **الفريم** (نفس السعر فنفس المقياس، فالخطوط تُرى بمواضع لا تعنيها).
  // بلا حفظ (شارت الرباعية `persistDrawings={false}`) لا تحميل غير متزامن أصلاً،
  // فالحالة هي الحقيقة ولا يصحّ حجبها — وإلا استحال الرسم على تلك الشاشات.
  const drawingsPersisted = persistDrawings && interactive;
  const loadedDrawingsKey = useRef<string | null>(null);
  const drawings =
    !drawingsPersisted ||
    loadedDrawingsKey.current === drawingsKey(series.symbol, series.timeframe)
      ? loadedDrawings
      : NO_DRAWINGS;
  // تراجع الرسم: لم يكن هناك أي تراجع إطلاقاً — خط ترند في غير موضعه كان يُصلَّح إما
  // بتبديل الأداة لـ«تحديد» واصطياد طرفه ثم تأكيد حذف، أو بمسح كل الرسومات. لقطات
  // محدودة العدد (لا حالة مشتقّة) لأن `drawings` بأكملها صغيرة ويحفظها التأثير الموجود.
  const drawingsRef = useRef<Drawing[]>([]);
  const drawHistory = useRef<Drawing[][]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [pending, setPending] = useState<ChartPoint | null>(null);
  const [dragEnd, setDragEnd] = useState<ChartPoint | null>(null);
  // مرساة التقاطع **بزمن الشمعة** لا بفهرسها داخل النافذة — راجع `crossAnchor.ts`:
  // النافذة متحرّكة، فالفهرس وحده يجعل القراءة تتبع الخانة لا الشمعة المختارة.
  // `price` سعر موضع اللمسة (بالمغناطيس إن كان مفعّلاً) — `null` ⇒ لا خطّ أفقي.
  const [cross, setCross] = useState<{ time: number; price: number | null } | null>(null);
  // تقاطع الويب يتبع الفأرة بلا نقر (معاينة)، والنقرة **تثبّته**. المعاينة بلا زرّ 🔔: الزرّ
  // خارج اللوح، فالطريق إليه يمرّ بمستويات أخرى ثم يخرج من اللوح فتُمسح المعاينة — التنبيه
  // يُوضع من تقاطع مثبَّت فقط. `crossPinned` مرآة بـref لأن معالجات المؤشر تُقرأ خارج الرسم.
  const [crossHover, setCrossHover] = useState(false);
  const crossPinned = useRef(false);
  const hoverRaf = useRef<number | null>(null);
  const hoverPoint = useRef({ x: 0, y: 0 });
  const keyToken = useRef({});
  const [windowCount, setWindowCount] = useState(80);
  const [offset, setOffset] = useState(0);
  const [priceScale, setPriceScale] = useState(1);
  const [pricePan, setPricePan] = useState(0);
  const [xPan, setXPan] = useState(0);
  // مقياس السعر ليس تلقائياً: مُطّ المحور، أو سُحب الشارت رأسياً أكثر من عُشر المدى — انحراف الإصبع
  // الرأسي العابر أثناء سحب أفقي لا يُعدّ (وإلا أُبرز AUTO بعد كل سحب تقريباً).
  const priceManual = Math.abs(Math.log(priceScale)) > 0.01 || Math.abs(pricePan) > 0.1;
  // كل سعر بالشارت (المحور، الوسوم، التقاطع، القمم، الرسومات) بمنازل واحدة للأداة: لرمز بلا منازل معروفة
  // تُؤخذ من سعره الجاري لا من كل رقم على حدة (`formatPrice`، `ref`).
  const priceDecimalsRef = series.last;
  const fmtPrice = (v: number) => formatPrice(v, series.symbol, priceDecimalsRef);
  const [replayOn, setReplayOn] = useState(false);
  const [replayStep, setReplayStep] = useState(15);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [logScale, setLogScale] = useState(false);
  const [magnet, setMagnet] = useState(true);
  // طرفا آخر قياس لا نصّه: النصّ المجمَّد كان **لا يُمسح أبداً** — بعد قياس واحد يحلّ محلّ
  // سطر OHLC للتقاطع ويُخفي زرّ 🔔 للأبد، ويبقى pip اليورو مكتوباً فوق شارت الين بعد
  // التبديل. الآن يُمسح بأول نقرة/قياس جديد وبتبديل الرمز/الفريم، ويُحسب نصّه عند الرسم.
  const [measureDone, setMeasureDone] = useState<{ a: ChartPoint; b: ChartPoint } | null>(null);
  useEffect(() => {
    setMeasureDone(null);
  }, [series.symbol, series.timeframe]);
  const [drawingsSaveError, setDrawingsSaveError] = useState<DrawingsSaveErrorCode | null>(null);
  const [chartW, setChartW] = useState(320);
  const panStartOffset = useRef(0);
  const panStartBars = useRef(0);
  const offsetRef = useRef(0);
  const panStartPoint = useRef({ x: 0, y: 0 });
  // قرص بإصبعين: حالة البدء (`pinchWindow` يحسب منها كل إطار). `plotLeft` حافّة اللوح
  // بإحداثيات الصفحة — إحداثيات اللمسات الأخرى `locationX` نسبةً لما لمسته لا للّوح.
  const pinchStart = useRef<{
    spread: number;
    count: number;
    offset: number;
    focus: number;
  } | null>(null);
  const pinchUsed = useRef(false);
  // مؤشّرات الويب المضغوطة الآن (معرّف ⇒ x) — قرص على شاشات اللمس بالمتصفّح.
  const webPointers = useRef(new Map<number, number>());
  const plotPageLeft = useRef(0);
  const panMoved = useRef(false);
  const chartPressRef = useRef<(x: number, y: number) => void>(() => {});
  const crossAtRef = useRef<(x: number, y: number, hover?: boolean) => void>(() => {});
  // ضغطة مطوّلة ثم سحب ⇒ التقاطع يتبع الإصبع بدل تحريك الشارت (scrub).
  const scrubTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrubbing = useRef(false);
  const priceScaleRef = useRef(1);
  const priceScaleStart = useRef(1);
  const windowCountRef = useRef(80);
  const timeWindowStart = useRef(80);
  const pricePanRef = useRef(0);
  const xPanRef = useRef(0);
  const panStartPrice = useRef(0);
  const panStartX = useRef(0);
  const webChartPointer = useRef({ active: false, x: 0, y: 0, pointerId: 0 });
  const webPricePointer = useRef({ active: false, x: 0, y: 0, pointerId: 0 });
  const webTimePointer = useRef({ active: false, x: 0, y: 0, pointerId: 0 });
  // طابور الحفظ المؤجَّل — نسخة واحدة لعمر المكوّن، تحمل مفتاح حمولتها معها
  // (`drawingsPersist.ts` يشرح الخطأين اللذين نشأ عنهما).
  // الرسومات للرمز لا للفريم (`drawingStore.ts`)؛ الفريم بالطابور يبقى لمفتاح الحمولة وحده.
  // `drawingsOwner` يميّز هذا الشارت فلا تُعاد إليه كتابته من `subscribeDrawings`.
  const drawingsOwner = useMemo(() => ({}), []);
  const saveQueue = useMemo(
    () =>
      new DrawingsSaveQueue((symbol, _timeframe, list) => {
        void saveDrawings(symbol, list, drawingsOwner);
      }),
    [drawingsOwner]
  );
  // بصمة آخر ما كُتب/حُمّل (`drawingsSignature`: بلا الفهرس المشتقّ من الزمن) — لا كتابة
  // لما جاء من التخزين توّاً، ولا لإعادة فهرسة بحتة عند كل شمعة جديدة أو تبديل فريم.
  const savedDrawingsSig = useRef<string | null>(null);
  const rangeRef = useRef({ min: 0, max: 1, span: 1 });
  const chartPlotWRef = useRef(320);
  const chartPlotHRef = useRef(200);
  const sourceRef = useRef({
    plot: [] as { close: number; open: number; high: number; low: number }[],
    start: 0,
    windowLen: 80,
    all: [] as unknown[],
  });

  // `selectedInd` = ما اختاره المتداول فعلاً (تُبنى عليه أزرار المؤشرات).
  // `indicators` = ما يُرسم بالفعل: نفسها ناقصَ اللوحات المطويّة لضيق الارتفاع، فيكفي
  // طيُّها هنا ليسقط حسابها (useMemo) ورسمها معاً بلا لمس 108 شرط عرض.
  const selectedInd = useMemo(() => {
    const set = new Set([...LENS_PRESETS[lens], ...extraInd]);
    return [...set];
  }, [lens, extraInd]);

  const availableH = Math.max(0, height - (interactive ? 8 : 0));
  // صفحة اللوحات: الطيّ كان يُخفي الأولوية الأدنى نهائياً فلا سبيل لرؤيتها إلا بإلغاء
  // اختيار مؤشّر آخر. الصفحة مخزّنة مع **مفتاح الاختيار** لا وحدها: تغيُّر مجموعة
  // المؤشرات يعيدها إلى الصفر اشتقاقاً بلا useEffect وبلا دورة رسم زائدة.
  const paneSelKey = useMemo(() => [...selectedInd].sort().join(','), [selectedInd]);
  const [paneNav, setPaneNav] = useState<{ key: string; page: number }>({ key: '', page: 0 });
  const panePage = paneNav.key === paneSelKey ? paneNav.page : 0;
  const panePlan = useMemo(
    () => planPanes({ active: selectedInd, availableH, dense, page: panePage }),
    [selectedInd, availableH, dense, panePage]
  );
  const {
    paneH,
    mainH,
    collapsed: collapsedPanes,
    barH: collapsedBarH,
    page: panePageShown,
    pageCount: panePageCount,
  } = panePlan;
  const nextPanePage = useCallback(
    () => setPaneNav({ key: paneSelKey, page: panePageShown + 1 }),
    [paneSelKey, panePageShown]
  );
  const indicators = useMemo(() => {
    if (!collapsedPanes.length) return selectedInd;
    const off = new Set(collapsedPanes);
    return selectedInd.filter((id) => !off.has(id));
  }, [selectedInd, collapsedPanes]);

  // أعلى/أدنى التيكات منذ فتح الشمعة الحيّة (`withLiveExtremes`): بدونه يقصر الذيل مع كل تيك يرتدّ.
  const liveExtRef = useRef<LiveExtremes | null>(null);
  const liveSeries = useMemo(() => {
    const merged = withLivePrice(series, livePrice, liveTickSource, {
      tickAsOf: liveTickSource?.as_of ?? null,
      timeframe: series.timeframe,
    });
    const r = withLiveExtremes(series, merged, liveExtRef.current);
    liveExtRef.current = r.ext;
    return r.series;
  }, [series, livePrice, liveTickSource]);

  useEffect(() => {
    setOffset(0);
    setWindowCount(80);
    setPriceScale(1);
    setPricePan(0);
    setXPan(0);
    // التقاطع المثبَّت يخصّ الرمز السابق: بالفريم نفسه تُوجد شمعة بزمنه غالباً، فكان يبقى
    // على الزوج الجديد بسعر الزوج القديم (وسم «1.085» فوق محور الين) ما دام الشارت مركَّباً.
    setCross(null);
    crossPinned.current = false;
    syncKeyRef.current = '';
    // الإعادة تخرج مع التبديل: خطوتها فهرس داخل نافذة الفريم السابق، فكانت الخطوة 12 من 80 على 15m
    // (~17 ساعة للخلف) تصير على 1H ~68 ساعة ويوماً آخر، وعلى زوج آخر يستمرّ التشغيل فوق شموع لم يخترها.
    setReplayOn(false);
    setReplayPlaying(false);
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

    // الإزاحة مقصوصة بطول السلسلة الحالية: سحب 120 شمعة للخلف ثم Renko (~40 لبنة) كان يعطي نهاية
    // سالبة فـ`slice` فارغة — شارت فارغ حتى AUTO. الحدّ نفسه الذي تقف عنده `holdView` (آخر 10).
    const end = plot.length - Math.min(offset, Math.max(0, plot.length - 10));
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

  // نافذة مسحوبة للخلف تبقى على شموعها حين تصل شمعة جديدة (`holdView.ts`): الإزاحة تُقاس من
  // الطرف الأيمن، فكانت كل شمعة جديدة تزحف بالنافذة شمعةً تحت إصبع المتداول. بـLayoutEffect كي
  // لا يُرسم إطار زاحف قبل التصحيح. التابع المتزامن نافذته من القائد فلا يُمسّ.
  const heldViewRef = useRef<{ key: string; lastSec: number | null; len: number }>({
    key: '',
    lastSec: null,
    len: 0,
  });
  useLayoutEffect(() => {
    const all = source.all as TimeBar[];
    const key = `${series.symbol}|${series.timeframe}|${kind}`;
    const last = all[all.length - 1];
    const lastSec = last ? barTime(last) : null;
    const prev = heldViewRef.current;
    if (prev.key === key && prev.len === all.length && prev.lastSec === lastSec) return; // تيك بالشمعة نفسها
    heldViewRef.current = { key, lastSec, len: all.length };
    // بالإعادة تُمسك النافذة حتى عند الطرف الأيمن: شمعة جديدة كانت تزحف بها فتصير «شمعة الإعادة» التالية
    // غير المكشوفة — الإعادة تتقدّم وحدها وتكشف المستقبل بلا ضغط +1.
    if (prev.key !== key || syncFollow || (offsetRef.current <= 0 && !replayOn)) return;
    const added = appendedAfter(prev.lastSec, all.map(barTime), prev.len);
    if (added <= 0) return;
    const next = Math.min(Math.max(0, all.length - 10), offsetRef.current + added);
    if (next === offsetRef.current) return;
    offsetRef.current = next;
    setOffset(next);
  }, [source.all, series.symbol, series.timeframe, kind, syncFollow, replayOn]);

  // تقاطع مشترك بالرباعي: كانت قراءة الشمعة نفسها على الأزواج الأربعة (هل كسر اليورو
  // والذهب معاً عند خبر الدولار؟) تعني عيناً تقيس المحاور الزمنية الأربعة. القائد ينشر زمن
  // تقاطعه، والتابع يرسم خطّه العمودي وسطر OHLC لشمعته السارية عندها — بلا خطّ أفقي
  // (`price: null`): سعر القائد لا معنى له على زوج آخر. `crossFromSync` يميّز هذا التقاطع
  // عن تقاطع المتداول نفسه، فيُمسح وحده عند انتهاء التبعية (إطفاء المزامنة/نقل القيادة).
  const crossFromSync = useRef(false);
  const onCrossTimeRef = useRef(onCrossTime);
  onCrossTimeRef.current = onCrossTime;
  // Renko/Kagi/P&F: `cross.time` زمن اللبنة المختلَق — يُنشر زمن شمعتها المصدر (`barTime`)،
  // وإلا وقف تقاطع التوابع عند بداية سلاسلها.
  const crossBar = cross ? source.plot.find((b) => b.time === cross.time) : undefined;
  const crossTimeSec = cross ? candleTimeSec(crossBar ? barTime(crossBar) : cross.time) : null;
  const crossTimeRef = useRef<number | null>(null);
  crossTimeRef.current = cross?.time ?? null;
  const publishesCross = onCrossTime != null;
  useEffect(() => {
    if (!publishesCross) return;
    onCrossTimeRef.current?.(crossFromSync.current ? null : crossTimeSec);
  }, [crossTimeSec, publishesCross]);
  useEffect(() => {
    if (syncCrossTime === undefined) {
      if (crossFromSync.current) {
        crossFromSync.current = false;
        setCross(null);
      }
      return;
    }
    // المقارنة بالزمن الحقيقي (لبنات Renko بزمن شمعتها)، والمفتاح المحفوظ زمن الخانة نفسها.
    // اللبنة الأخيرة (والنافذة عند طرف السلسلة) سارية حتى نهاية الشموع المصدر — وإلا لا خطّ
    // عند تابع Renko والقائد على الشمعة الحيّة حتى تكتمل لبنة.
    const synthetic = kind === 'renko' || kind === 'kagi' || kind === 'pnf' || kind === 'range';
    const lastCandle = liveSeries.candles[liveSeries.candles.length - 1];
    const atSeriesEnd =
      source.plot.length > 0 && source.plot[source.plot.length - 1] === source.all[source.all.length - 1];
    const endSec =
      synthetic && atSeriesEnd && lastCandle
        ? candleTimeSec(lastCandle.time) + timeframeStepSec(series.timeframe)
        : undefined;
    const i = indexAtOrBeforeTime(
      source.plot.map((b) => ({ time: barTime(b) })),
      syncCrossTime,
      candleTimeSec,
      endSec
    );
    const time = i != null ? source.plot[i]!.time : null;
    crossFromSync.current = true;
    setCross((prev) =>
      time == null ? null : prev && prev.time === time && prev.price == null ? prev : { time, price: null }
    );
  }, [syncCrossTime, source.plot, source.all, kind, liveSeries.candles, series.timeframe]);

  // الرسومات تتبع شموعها بالزمن لا بالخانة — راجع `drawingAnchors.ts`. لا يعمل قبل أن
  // تُحمَّل رسومات هذا الرمز/الفريم (`drawings === loadedDrawings`)، ويعيد المصفوفة نفسها
  // حين لا تغيير فلا رسم ولا كتابة بكل تيك.
  useEffect(() => {
    if (drawings !== loadedDrawings) return;
    const synthetic = kind === 'renko' || kind === 'kagi' || kind === 'pnf' || kind === 'range';
    const next = anchorDrawings(
      loadedDrawings,
      source.all as { time: number }[],
      timeframeStepSec(series.timeframe),
      synthetic
    );
    if (next !== loadedDrawings) setDrawings(next);
  }, [drawings, loadedDrawings, source.all, kind, series.timeframe]);

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
  // نقاط الارتكاز من **الجلسة السابقة** لا من آخر 20 شمعة بالفريم المعروض — `pivotBase.ts`.
  // شموع D1 أوّلاً (المخزن المشترك مع قائمة المتابعة)؛ السلسلة التجريبية لا تُقابَل بمستويات
  // حقيقية بعيدة عن أسعارها، فتُحسب من شموعها هي.
  const anyPivot = indicators.some((id) => PIVOT_IDS.has(id));
  const seriesDemo = normalizeProvenance(series.data_source).kind === 'demo';
  const dailyPrevBar = useDailyPrevBar(anyPivot && !seriesDemo ? series.symbol : null);
  // بالإعادة: «الجلسة السابقة» لشمعة الإعادة لا لليوم — كانت PDH/PDL والارتكاز كلّها مستويات اليوم
  // مرسومةً فوق شموع الأسبوع الماضي، أي أهدافاً من المستقبل يرتدّ عندها السعر «بدقّة» في التمرين.
  // شموع D1 من المخزن مستويات اليوم فتُترك، والأساس من شموع السلسلة حتى شمعة الإعادة (ناقصة ⇒ لا خطوط).
  const replayLast = replayOn ? source.plot[source.plot.length - 1] : undefined;
  const replayCutSec = replayLast ? candleTimeSec(barTime(replayLast)) : null;
  const replayClose = replayLast && Number.isFinite(replayLast.close) ? replayLast.close : null;
  const onReplayPriceRef = useRef(onReplayPrice);
  onReplayPriceRef.current = onReplayPrice;
  useEffect(() => {
    onReplayPriceRef.current?.(replayClose);
  }, [replayClose]);
  useEffect(() => () => onReplayPriceRef.current?.(null), []);
  const pivotBars = useMemo(() => {
    if (!anyPivot) return null;
    const fromDaily = seriesDemo || replayCutSec != null ? null : validSessionBar(dailyPrevBar);
    if (fromDaily) return pivotInput(fromDaily);
    const candles = candlesThrough(series.candles ?? [], replayCutSec);
    if (timeframeStepSec(series.timeframe) >= 86400) {
      const secs = candles.map((c) => ({ ...c, time: candleTimeSec(c.time) }));
      return pivotInput(validSessionBar(prevSessionFromDaily(secs, replayCutSec ?? Date.now() / 1000)));
    }
    return pivotInput(validSessionBar(prevDayFromIntraday(candles, series.symbol)));
  }, [anyPivot, seriesDemo, dailyPrevBar, series.candles, series.timeframe, series.symbol, replayCutSec]);
  const pivots = useMemo(
    () => (indicators.includes('pivots') && pivotBars ? computePivotPoints(pivotBars, 1) : null),
    [pivotBars, indicators]
  );
  const fibPivots = useMemo(
    () => (indicators.includes('fibPivots') && pivotBars ? computeFibPivotPoints(pivotBars, 1) : null),
    [pivotBars, indicators]
  );
  const camarilla = useMemo(
    () => (indicators.includes('camarilla') && pivotBars ? computeCamarillaPivots(pivotBars, 1) : null),
    [pivotBars, indicators]
  );
  const woodiePivots = useMemo(
    () => (indicators.includes('woodiePivots') && pivotBars ? computeWoodiePivots(pivotBars, 1) : null),
    [pivotBars, indicators]
  );
  const demarkPivots = useMemo(
    () => (indicators.includes('demarkPivots') && pivotBars ? computeDemarkPivots(pivotBars, 1) : null),
    [pivotBars, indicators]
  );
  const cpr = useMemo(
    () => (indicators.includes('cpr') && pivotBars ? computeCpr(pivotBars, 1) : null),
    [pivotBars, indicators]
  );
  /**
   * خطوط الارتكاز الستّ بقائمة واحدة: كانت تُرسم بوسم اسم وحده («R1») يمين اللوح فوق آخر
   * الشموع، بلا سعر — والمتداول يفتح Pivot ليقرأ الأرقام — وبلا أي تنقية، فتشغيل مجموعتين
   * (Pivot + Camarilla) يكدّس وسوماً فوق بعضها. الآن «R1 1.08650» يسار اللوح بنمط وسم الخطّ
   * الأفقي، والتزاحم يُحلّ بـ`thinByGap` بأهمية `pivotLabelRank`.
   */
  const pivotLevels = useMemo(() => {
    const out: { key: string; label: string; price: number; color: string; opacity: number }[] = [];
    const add = (
      prefix: string,
      rows: readonly (readonly [string, number])[],
      color: (label: string) => string,
      opacity: number
    ) => {
      for (const [label, price] of rows) {
        if (Number.isFinite(price)) out.push({ key: `${prefix}${label}`, label, price, color: color(label), opacity });
      }
    };
    if (pivots) {
      add(
        'pv',
        [
          ['R3', pivots.r3],
          ['R2', pivots.r2],
          ['R1', pivots.r1],
          ['PP', pivots.pp],
          ['S1', pivots.s1],
          ['S2', pivots.s2],
          ['S3', pivots.s3],
        ],
        (l) => (l === 'PP' ? colors.accent : l.startsWith('R') ? colors.bear : colors.bull),
        0.75
      );
    }
    if (fibPivots) {
      add(
        'fpv',
        [
          ['FR3', fibPivots.r3],
          ['FR2', fibPivots.r2],
          ['FR1', fibPivots.r1],
          ['FPP', fibPivots.pp],
          ['FS1', fibPivots.s1],
          ['FS2', fibPivots.s2],
          ['FS3', fibPivots.s3],
        ],
        () => colors.infoAccent,
        0.6
      );
    }
    if (camarilla) {
      add(
        'cam',
        [
          ['CR4', camarilla.r4],
          ['CR3', camarilla.r3],
          ['CR2', camarilla.r2],
          ['CR1', camarilla.r1],
          ['CS1', camarilla.s1],
          ['CS2', camarilla.s2],
          ['CS3', camarilla.s3],
          ['CS4', camarilla.s4],
        ],
        () => colors.warn,
        0.55
      );
    }
    if (woodiePivots) {
      add(
        'wpv',
        [
          ['WR3', woodiePivots.r3],
          ['WR2', woodiePivots.r2],
          ['WR1', woodiePivots.r1],
          ['WPP', woodiePivots.pp],
          ['WS1', woodiePivots.s1],
          ['WS2', woodiePivots.s2],
          ['WS3', woodiePivots.s3],
        ],
        () => '#C4B5FD',
        0.6
      );
    }
    if (demarkPivots) {
      add(
        'dpv',
        [
          ['DR1', demarkPivots.r1],
          ['DS1', demarkPivots.s1],
        ],
        () => '#FDA4AF',
        0.6
      );
    }
    if (cpr) {
      add(
        'cpr',
        [
          ['CPR-T', cpr.top],
          ['CPR-P', cpr.pp],
          ['CPR-B', cpr.bottom],
        ],
        () => '#FEF08A',
        0.55
      );
    }
    // أعلى/أدنى/إغلاق الجلسة السابقة نفسها (PDH/PDL/PDC) — أكثر مستويات الفوركس تداولاً بعد
    // الارتكاز، ومن الأساس ذاته (D1 أوّلاً). لون محايد: ليسا دعماً/مقاومة بالمعنى الدلالي.
    const prevDay = indicators.includes('pdhl') && pivotBars ? pivotBars[0] : null;
    if (prevDay) {
      add(
        'pd',
        [
          ['PDH', prevDay.high],
          ['PDL', prevDay.low],
        ],
        () => colors.textMuted,
        0.85
      );
      add('pd', [['PDC', prevDay.close]], () => colors.textDim, 0.55);
    }
    return out;
  }, [pivots, fibPivots, camarilla, woodiePivots, demarkPivots, cpr, indicators, pivotBars]);
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

  // القالب يُحمَّل عند التركيب (وعند تبدّل `interactive`) لا بكل تبديل زوج أو تغيّر مؤشّرات
  // الأمّ: كان يعيد نوع الشارت واللوغاريتمي والمغناطيس للقالب مع كل زوج — Heikin مختار
  // بالشريط يصير شموعاً عادية والزرّ ما زال مضاءً — ويمسح المؤشّرات المضافة. القيم الأوّلية
  // من الأمّ تُقرأ من مرجع، ولكلٍّ منها تأثيره أعلاه حين يتغيّر فعلاً.
  const initialPropsRef = useRef({ initialLens, initialKind, initialIndicators });
  initialPropsRef.current = { initialLens, initialKind, initialIndicators };
  useEffect(() => {
    const init = initialPropsRef.current;
    if (!interactive) {
      setPineOn(false);
      setPineFormula('');
      setLens(init.initialLens ?? 'clean');
      setExtraInd(init.initialIndicators ?? []);
      return;
    }
    let alive = true;
    loadTemplates().then((t) => {
      if (!alive) return;
      const tpl = t[0] ?? DEFAULT_TEMPLATE;
      const cur = initialPropsRef.current;
      if (!cur.initialKind) setKind(tpl.kind);
      if (!cur.initialLens) setLens(tpl.lens ?? 'clean');
      if (!cur.initialIndicators?.length) setExtraInd(tpl.indicators ?? []);
      // Pine اختياري — لا نفعّله تلقائياً من القالب
      setPineFormula(tpl.pineFormula || '');
      setPineOn(false);
      setLogScale(tpl.logScale);
      setMagnet(tpl.magnet);
    });
    return () => {
      alive = false;
    };
  }, [interactive]);

  useEffect(() => {
    if (!drawingsPersisted) return;
    const k = drawingsKey(series.symbol, series.timeframe);
    // ما تأجّل يخصّ المفتاح **السابق** — يُكتب الآن بمفتاحه هو قبل أن تُستبدل الحمولة.
    // بلا هذا: من يرسم خطّاً ثم يبدّل خلال أقلّ من 400ms يفقده، ومؤقّت الرمز السابق
    // قد ينطلق بعد التبديل فيكتب رسوماته تحت مفتاح الرمز الجديد.
    saveQueue.flush();
    loadedDrawingsKey.current = null;
    setDrawings(NO_DRAWINGS);
    setSelectedId(null);
    setPending(null);
    setDragEnd(null);
    let alive = true;
    // القائمة مشتركة بين الفريمات، ففهارسها قد تخصّ فريماً آخر: تُرسى على شموع هذا
    // الفريم **قبل** العرض، وإلا رُسمت إطاراً واحداً بمواضع الفريم الآخر قبل تأثير الإرساء.
    // البصمة من القائمة كما وصلت: ختم نقاط بلا زمن تعديلٌ يستحقّ الكتابة.
    const anchorHere = (d: Drawing[]) => {
      const km = kindRef.current;
      const synthetic = km === 'renko' || km === 'kagi' || km === 'pnf' || km === 'range';
      return anchorDrawings(
        d,
        sourceRef.current.all as { time: number }[],
        timeframeStepSec(series.timeframe),
        synthetic
      );
    };
    loadDrawings(series.symbol, series.timeframe).then((d) => {
      if (!alive) return;
      loadedDrawingsKey.current = k;
      savedDrawingsSig.current = drawingsSignature(d);
      setDrawings(anchorHere(d));
    });
    // شارت آخر على الرمز نفسه كتب (نافذة التركيز فوق الشاشة، أو فريم آخر): يُعرض هنا
    // فوراً، ولا يبقى هنا قديمه ليُكتب فوقه عند أوّل تعديل. تاريخ التراجع يخصّ القائمة
    // السابقة فيُفرَغ.
    const unsubscribe = subscribeDrawings(series.symbol, drawingsOwner, (d) => {
      if (!alive || loadedDrawingsKey.current !== k) return;
      savedDrawingsSig.current = drawingsSignature(d);
      drawHistory.current = [];
      setCanUndo(false);
      setSelectedId(null);
      setDragEnd(null);
      setDrawings(anchorHere(d));
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [series.symbol, series.timeframe, drawingsPersisted, saveQueue, drawingsOwner]);

  useEffect(() => {
    if (!drawingsPersisted) return;
    // `drawings` هنا هي المحجوبة بالمفتاح: قبل انتهاء التحميل تساوي NO_DRAWINGS،
    // فالشرط يمنع كتابة فراغ فوق رسومات محفوظة للرمز الجديد.
    if (loadedDrawingsKey.current !== drawingsKey(series.symbol, series.timeframe)) return;
    // ما جاء من التخزين توّاً، أو إعادة فهرسة بحتة، لا تُكتب — كتابة بلا تغيير.
    const sig = drawingsSignature(drawings);
    if (sig === savedDrawingsSig.current) return;
    savedDrawingsSig.current = sig;
    saveQueue.schedule(series.symbol, series.timeframe, drawings);
  }, [drawings, series.symbol, series.timeframe, drawingsPersisted, saveQueue]);

  // تفكيك المكوّن: يُكتب ما تأجّل بدل إسقاطه — إغلاق نافذة التركيز بعد رسم مباشرةً
  // كان يضيع الرسم لنفس سبب التبديل.
  useEffect(() => {
    return () => {
      saveQueue.flush();
    };
  }, [saveQueue]);

  useEffect(() => {
    drawingsRef.current = drawings;
  }, [drawings]);

  /** لقطة لما قبل التغيير — تُستدعى مرة واحدة قبل كل تعديل (ومرة واحدة عند بدء السحب). */
  const pushDrawHistory = useCallback(() => {
    const next = [...drawHistory.current, drawingsRef.current];
    drawHistory.current = next.length > DRAW_HISTORY_MAX ? next.slice(-DRAW_HISTORY_MAX) : next;
    setCanUndo(true);
  }, []);

  const undoDrawing = useCallback(() => {
    const hist = drawHistory.current;
    if (!hist.length) return;
    const prev = hist[hist.length - 1]!;
    drawHistory.current = hist.slice(0, -1);
    setCanUndo(drawHistory.current.length > 0);
    // اللقطة قد تكون من فريم آخر (التاريخ يبقى عبر تبديل الفريم): تُرسى على شموع هذا الفريم
    // قبل العرض، لا إطاراً بمواضع ذلك الفريم.
    const km = kindRef.current;
    const synthetic = km === 'renko' || km === 'kagi' || km === 'pnf' || km === 'range';
    setDrawings(
      anchorDrawings(
        prev,
        sourceRef.current.all as { time: number }[],
        timeframeStepSec(series.timeframe),
        synthetic
      )
    );
    setSelectedId(null);
    setPending(null);
    setDragEnd(null);
  }, [series.timeframe]);

  // تبديل الرمز يحمّل رسومات أخرى، فتاريخ الرسم السابق لم يعد يخصّها. تبديل **الفريم**
  // لا يمسّه: الرسومات للرمز على كل فريماته (`drawingStore.ts`) — خطّ رُسم على 4H خطأً يُتراجع
  // عنه بعد النزول للساعة.
  useEffect(() => {
    drawHistory.current = [];
    setCanUndo(false);
  }, [series.symbol]);

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

  // المؤشرات على التاريخ حتى آخر شمعة معروضة ثم تُقصّ للنافذة (`indicatorWindow.ts`): كانت على
  // المعروضة وحدها فيفرغ يسارها، ولا تظهر سحابة Ichimoku، وتتغيّر قيمة الشمعة نفسها بالسحب.
  const indBase = useMemo(
    () => indicatorBase(source.all, source.start, source.plot),
    [source.all, source.start, source.plot]
  );
  const indBars = indBase.bars;
  const closes = useMemo(() => indBars.map((c) => c.close), [indBars]);
  const ind = <R,>(r: R): R => trimIndicator(r, indBars.length, indBase.cut);
  const overlays = useMemo(() => ind(computeOverlays(closes)), [closes]);
  const rsi = useMemo(
    () => (indicators.includes('rsi') ? ind(computeRsi(closes)) : null),
    [closes, indicators]
  );
  const macd = useMemo(
    () => (indicators.includes('macd') ? ind(computeMacd(closes)) : null),
    [closes, indicators]
  );
  const stoch = useMemo(
    () => (indicators.includes('stoch') ? ind(computeStoch(indBars)) : null),
    [indBars, indicators]
  );
  const atr = useMemo(
    () => (indicators.includes('atr') ? ind(computeAtr(indBars)) : null),
    [indBars, indicators]
  );
  const willr = useMemo(
    () => (indicators.includes('willr') ? ind(computeWilliamsR(indBars)) : null),
    [indBars, indicators]
  );
  const cci = useMemo(
    () => (indicators.includes('cci') ? ind(computeCci(indBars)) : null),
    [indBars, indicators]
  );
  const roc = useMemo(
    () => (indicators.includes('roc') ? ind(computeRoc(closes)) : null),
    [closes, indicators]
  );
  // VWAP يُصفَّر كل يوم تداول (17:00 نيويورك) على الفريمات داخل اليوم كـTradingView — كان تراكماً من أوّل شمعة
  // محمَّلة: على 15m بعد أيام يصير متوسطاً شبه ثابت بعيداً عن السعر، ويتغيّر مع كل تحميل تاريخ إضافي.
  // اليومي فأكبر: كل شمعة جلسة، فيبقى التراكم المستمر. `barTime` ⇒ زمن الشمعة المصدر للّبنات.
  const vwapSessionOf = useMemo(
    () =>
      timeframeStepSec(series.timeframe) < 86400
        ? (c: Candle) => tradingDayStartSec(series.symbol, candleTimeSec(barTime(c)))
        : undefined,
    [series.symbol, series.timeframe]
  );
  const vwap = useMemo(
    () => (indicators.includes('vwap') ? ind(computeVwap(indBars, vwapSessionOf)) : null),
    [indBars, indicators, vwapSessionOf]
  );
  const vwapBands = useMemo(
    () => (indicators.includes('vwapBands') ? ind(computeVwapBands(indBars, 2, vwapSessionOf)) : null),
    [indBars, indicators, vwapSessionOf]
  );
  const twap = useMemo(
    // TWAP يُصفَّر مع VWAP بالجلسة نفسها — كان تراكماً من أوّل شمعة محمَّلة فيتسطّح على 15m بعد أيام
    () => (indicators.includes('twap') ? ind(computeTwap(indBars, vwapSessionOf)) : null),
    [indBars, indicators, vwapSessionOf]
  );
  // انقطاع خطَّي VWAP وTWAP بين آخر شمعة من يوم وأوّل شمعة من التالي — لا قطعة مائلة بين قيمتَي جلستين
  const vwapSessionBreak = useCallback(
    (i: number) =>
      vwapSessionOf != null &&
      i > 0 &&
      source.plot[i] != null &&
      source.plot[i - 1] != null &&
      vwapSessionOf(source.plot[i]) !== vwapSessionOf(source.plot[i - 1]),
    [source.plot, vwapSessionOf]
  );
  const obv = useMemo(
    () => (indicators.includes('obv') ? ind(computeObv(indBars)) : null),
    [indBars, indicators]
  );
  /**
   * أحجام نافذة الرسم كسلسلة — لرأس لوحة الفوليوم وحده؛ الأعمدة تقرأ `source.plot`
   * مباشرةً كما كانت. الشمعة بلا حجم ⇐ `null` لا `0`: المصدر الذي لا يرسل أحجاماً
   * أصلاً يجب أن يُظهر رأساً بلا رقم، لا صفراً يوهم بحجم مقيس.
   */
  const volumeSeries = useMemo(
    () =>
      indicators.includes('volume')
        ? source.plot.map((c) => (typeof c.volume === 'number' ? c.volume : null))
        : null,
    [source.plot, indicators]
  );
  const mfi = useMemo(
    () => (indicators.includes('mfi') ? ind(computeMfi(indBars)) : null),
    [indBars, indicators]
  );
  const adx = useMemo(
    () => (indicators.includes('adx') ? ind(computeAdx(indBars)) : null),
    [indBars, indicators]
  );
  const psar = useMemo(
    () => (indicators.includes('psar') ? ind(computePsar(indBars)) : null),
    [indBars, indicators]
  );
  const gannHiLo = useMemo(
    () => (indicators.includes('gannHiLo') ? ind(computeGannHiLo(indBars)) : null),
    [indBars, indicators]
  );
  const stddev = useMemo(
    () => (indicators.includes('stddev') ? ind(computeStdDev(closes)) : null),
    [closes, indicators]
  );
  const aroon = useMemo(
    () => (indicators.includes('aroon') ? ind(computeAroonOsc(indBars)) : null),
    [indBars, indicators]
  );
  const cmf = useMemo(
    () => (indicators.includes('cmf') ? ind(computeCmf(indBars)) : null),
    [indBars, indicators]
  );
  const supertrend = useMemo(
    () => (indicators.includes('supertrend') ? ind(computeSuperTrend(indBars)) : null),
    [indBars, indicators]
  );
  const keltner = useMemo(
    () => (indicators.includes('keltner') ? ind(computeKeltner(indBars)) : null),
    [indBars, indicators]
  );
  const envelopes = useMemo(
    () => (indicators.includes('envelopes') ? ind(computeEnvelopes(closes)) : null),
    [closes, indicators]
  );
  const donchian = useMemo(
    () => (indicators.includes('donchian') ? ind(computeDonchian(indBars)) : null),
    [indBars, indicators]
  );
  const ultimateOsc = useMemo(
    () => (indicators.includes('ultimateOsc') ? ind(computeUltimateOsc(indBars)) : null),
    [indBars, indicators]
  );
  const cmo = useMemo(
    () => (indicators.includes('cmo') ? ind(computeCmo(closes)) : null),
    [closes, indicators]
  );
  const trix = useMemo(
    () => (indicators.includes('trix') ? ind(computeTrix(closes)) : null),
    [closes, indicators]
  );
  const force = useMemo(
    () => (indicators.includes('force') ? ind(computeForceIndex(indBars)) : null),
    [indBars, indicators]
  );
  const chaikinOsc = useMemo(
    () => (indicators.includes('chaikinOsc') ? ind(computeChaikinOsc(indBars)) : null),
    [indBars, indicators]
  );
  const dpo = useMemo(
    () => (indicators.includes('dpo') ? ind(computeDpo(closes)) : null),
    [closes, indicators]
  );
  const ao = useMemo(
    () => (indicators.includes('ao') ? ind(computeAwesomeOsc(indBars)) : null),
    [indBars, indicators]
  );
  const ac = useMemo(
    () => (indicators.includes('ac') ? ind(computeAcceleratorOsc(indBars)) : null),
    [indBars, indicators]
  );
  const bop = useMemo(
    () => (indicators.includes('bop') ? ind(computeBop(indBars)) : null),
    [indBars, indicators]
  );
  const bullPower = useMemo(
    () => (indicators.includes('bullPower') ? ind(computeBullPower(indBars)) : null),
    [indBars, indicators]
  );
  const bearPower = useMemo(
    () => (indicators.includes('bearPower') ? ind(computeBearPower(indBars)) : null),
    [indBars, indicators]
  );
  const tsi = useMemo(
    () => (indicators.includes('tsi') ? ind(computeTsi(closes)) : null),
    [closes, indicators]
  );
  const coppock = useMemo(
    () => (indicators.includes('coppock') ? ind(computeCoppock(closes)) : null),
    [closes, indicators]
  );
  const eom = useMemo(
    () => (indicators.includes('eom') ? ind(computeEom(indBars)) : null),
    [indBars, indicators]
  );
  const nvi = useMemo(
    () => (indicators.includes('nvi') ? ind(computeNvi(indBars)) : null),
    [indBars, indicators]
  );
  const massIndex = useMemo(
    () => (indicators.includes('massIndex') ? ind(computeMassIndex(indBars)) : null),
    [indBars, indicators]
  );
  const ppo = useMemo(
    () => (indicators.includes('ppo') ? ind(computePpo(closes)) : null),
    [closes, indicators]
  );
  const chaikinVol = useMemo(
    () => (indicators.includes('chaikinVol') ? ind(computeChaikinVolatility(indBars)) : null),
    [indBars, indicators]
  );
  const qstick = useMemo(
    () => (indicators.includes('qstick') ? ind(computeQstick(indBars)) : null),
    [indBars, indicators]
  );
  const chop = useMemo(
    () => (indicators.includes('chop') ? ind(computeChoppiness(indBars)) : null),
    [indBars, indicators]
  );
  const bwmfi = useMemo(
    () => (indicators.includes('bwmfi') ? ind(computeBwMfi(indBars)) : null),
    [indBars, indicators]
  );
  const pvo = useMemo(
    () => (indicators.includes('pvo') ? ind(computePvo(indBars)) : null),
    [indBars, indicators]
  );
  const apo = useMemo(
    () => (indicators.includes('apo') ? ind(computeApo(closes)) : null),
    [closes, indicators]
  );
  const vo = useMemo(
    () => (indicators.includes('vo') ? ind(computeVolumeOscillator(indBars)) : null),
    [indBars, indicators]
  );
  const vpt = useMemo(
    () => (indicators.includes('vpt') ? ind(computeVpt(indBars)) : null),
    [indBars, indicators]
  );
  const hv = useMemo(
    () => (indicators.includes('hv') ? ind(computeHistoricalVolatility(closes)) : null),
    [closes, indicators]
  );
  const stochRsi = useMemo(
    () => (indicators.includes('stochRsi') ? ind(computeStochRsi(closes)) : null),
    [closes, indicators]
  );
  const rvi = useMemo(
    () => (indicators.includes('rvi') ? ind(computeRvi(indBars)) : null),
    [indBars, indicators]
  );
  const linRegSlope = useMemo(
    () => (indicators.includes('linRegSlope') ? ind(computeLinRegSlope(closes)) : null),
    [closes, indicators]
  );
  const linRegR2 = useMemo(
    () => (indicators.includes('linRegR2') ? ind(computeLinRegR2(closes)) : null),
    [closes, indicators]
  );
  const percentB = useMemo(
    () => (indicators.includes('percentB') ? ind(computePercentB(closes)) : null),
    [closes, indicators]
  );
  const bbw = useMemo(
    () => (indicators.includes('bbw') ? ind(computeBollingerBandwidth(closes)) : null),
    [closes, indicators]
  );
  const medianPrice = useMemo(
    () => (indicators.includes('medianPrice') ? ind(computeMedianPrice(indBars)) : null),
    [indBars, indicators]
  );
  const typicalPrice = useMemo(
    () => (indicators.includes('typicalPrice') ? ind(computeTypicalPrice(indBars)) : null),
    [indBars, indicators]
  );
  const weightedClose = useMemo(
    () => (indicators.includes('weightedClose') ? ind(computeWeightedClose(indBars)) : null),
    [indBars, indicators]
  );
  const mcginley = useMemo(
    () => (indicators.includes('mcginley') ? ind(computeMcGinleyDynamic(closes)) : null),
    [closes, indicators]
  );
  const lsma = useMemo(
    () => (indicators.includes('lsma') ? ind(computeLsma(closes)) : null),
    [closes, indicators]
  );
  const tsf = useMemo(
    () => (indicators.includes('tsf') ? ind(computeTsf(closes)) : null),
    [closes, indicators]
  );
  const linRegChannel = useMemo(
    () => (indicators.includes('linRegChannel') ? ind(computeLinRegChannel(closes)) : null),
    [closes, indicators]
  );
  const momentum = useMemo(
    () => (indicators.includes('momentum') ? ind(computeMomentum(closes)) : null),
    [closes, indicators]
  );
  const vhf = useMemo(
    () => (indicators.includes('vhf') ? ind(computeVhf(closes)) : null),
    [closes, indicators]
  );
  const pvi = useMemo(
    () => (indicators.includes('pvi') ? ind(computePvi(indBars)) : null),
    [indBars, indicators]
  );
  const ravi = useMemo(
    () => (indicators.includes('ravi') ? ind(computeRavi(closes)) : null),
    [closes, indicators]
  );
  const ulcer = useMemo(
    () => (indicators.includes('ulcer') ? ind(computeUlcerIndex(closes)) : null),
    [closes, indicators]
  );
  const fisher = useMemo(
    () => (indicators.includes('fisher') ? ind(computeFisherTransform(indBars)) : null),
    [indBars, indicators]
  );
  const kst = useMemo(
    () => (indicators.includes('kst') ? ind(computeKst(closes)) : null),
    [closes, indicators]
  );
  const vortex = useMemo(
    () => (indicators.includes('vortex') ? ind(computeVortex(indBars)) : null),
    [indBars, indicators]
  );
  const klinger = useMemo(
    () => (indicators.includes('klinger') ? ind(computeKlinger(indBars)) : null),
    [indBars, indicators]
  );
  const ichimoku = useMemo(
    () => (indicators.includes('ichimoku') ? ind(computeIchimoku(indBars)) : null),
    [indBars, indicators]
  );
  const alligator = useMemo(
    () => (indicators.includes('alligator') ? ind(computeAlligator(indBars)) : null),
    [indBars, indicators]
  );
  const gator = useMemo(() => {
    if (!indicators.includes('gator')) return null;
    const alli = alligator ?? ind(computeAlligator(indBars));
    return computeGator(alli.jaw, alli.teeth, alli.lips);
  }, [indBars, indicators, alligator]);
  const vwma = useMemo(
    () => (indicators.includes('vwma') ? ind(computeVwma(indBars)) : null),
    [indBars, indicators]
  );
  const alma = useMemo(
    () => (indicators.includes('alma') ? ind(computeAlma(closes)) : null),
    [closes, indicators]
  );
  const chandeKroll = useMemo(
    () => (indicators.includes('chandeKroll') ? ind(computeChandeKrollStop(indBars)) : null),
    [indBars, indicators]
  );
  const smi = useMemo(
    () => (indicators.includes('smi') ? ind(computeSmi(indBars)) : null),
    [indBars, indicators]
  );
  const smiErgodic = useMemo(
    () =>
      indicators.includes('smiErgodic') ? ind(computeSmiErgodicOscillator(indBars)) : null,
    [indBars, indicators]
  );
  const dmi = useMemo(
    () => (indicators.includes('dmi') ? ind(computeDmi(indBars)) : null),
    [indBars, indicators]
  );
  const chandelierExit = useMemo(
    () => (indicators.includes('chandelierExit') ? ind(computeChandelierExit(indBars)) : null),
    [indBars, indicators]
  );
  const gmma = useMemo(
    () => (indicators.includes('gmma') ? ind(computeGmma(closes)) : null),
    [closes, indicators]
  );
  const rwi = useMemo(
    () => (indicators.includes('rwi') ? ind(computeRwi(indBars)) : null),
    [indBars, indicators]
  );
  const aroonUpDown = useMemo(
    () => (indicators.includes('aroonUpDown') ? ind(computeAroonUpDown(indBars)) : null),
    [indBars, indicators]
  );
  const zigzag = useMemo(
    () => (indicators.includes('zigzag') ? ind(computeZigZag(closes)) : null),
    [closes, indicators]
  );
  const adl = useMemo(
    () => (indicators.includes('adl') ? ind(computeAccumDist(indBars)) : null),
    [indBars, indicators]
  );
  const fractals = useMemo(
    () => (indicators.includes('fractals') ? ind(computeFractals(indBars)) : null),
    [indBars, indicators]
  );
  const fractalChaosOsc = useMemo(
    () => (indicators.includes('fractalChaosOsc') ? ind(computeFractalChaosOsc(indBars)) : null),
    [indBars, indicators]
  );
  const fractalChaosBands = useMemo(
    () => (indicators.includes('fractalChaosBands') ? ind(computeFractalChaosBands(indBars)) : null),
    [indBars, indicators]
  );
  const elderImpulse = useMemo(
    () => (indicators.includes('elderImpulse') ? ind(computeElderImpulse(indBars)) : null),
    [indBars, indicators]
  );
  const t3 = useMemo(
    () => (indicators.includes('t3') ? ind(computeT3(closes)) : null),
    [closes, indicators]
  );
  const rvix = useMemo(
    () => (indicators.includes('rvix') ? ind(computeRelativeVolatilityIndex(closes)) : null),
    [closes, indicators]
  );
  const smma20 = useMemo(
    () => (indicators.includes('smma20') ? ind(computeSmma(closes)) : null),
    [closes, indicators]
  );
  const kama = useMemo(
    () => (indicators.includes('kama') ? ind(computeKama(closes)) : null),
    [closes, indicators]
  );
  const frama = useMemo(
    () => (indicators.includes('frama') ? ind(computeFrama(indBars)) : null),
    [indBars, indicators]
  );
  const parkinsonVol = useMemo(
    () => (indicators.includes('parkinsonVol') ? ind(computeParkinsonVolatility(indBars)) : null),
    [indBars, indicators]
  );
  const garmanKlassVol = useMemo(
    () => (indicators.includes('garmanKlassVol') ? ind(computeGarmanKlassVolatility(indBars)) : null),
    [indBars, indicators]
  );
  const rogersSatchellVol = useMemo(
    () =>
      indicators.includes('rogersSatchellVol') ? ind(computeRogersSatchellVolatility(indBars)) : null,
    [indBars, indicators]
  );
  const yangZhangVol = useMemo(
    () =>
      indicators.includes('yangZhangVol') ? ind(computeYangZhangVolatility(indBars)) : null,
    [indBars, indicators]
  );
  const stc = useMemo(
    () => (indicators.includes('stc') ? ind(computeStc(closes)) : null),
    [closes, indicators]
  );
  const zlema = useMemo(
    () => (indicators.includes('zlema') ? ind(computeZlema(closes)) : null),
    [closes, indicators]
  );
  const cog = useMemo(
    () => (indicators.includes('cog') ? ind(computeCog(indBars)) : null),
    [indBars, indicators]
  );
  const squeeze = useMemo(
    () => (indicators.includes('squeeze') ? ind(computeSqueeze(indBars)) : null),
    [indBars, indicators]
  );
  const netVolume = useMemo(
    () => (indicators.includes('netVolume') ? ind(computeNetVolume(indBars)) : null),
    [indBars, indicators]
  );
  const pivotsHL = useMemo(
    () => (indicators.includes('pivotsHL') ? ind(computePivotsHighLow(indBars)) : null),
    [indBars, indicators]
  );
  const woodieCci = useMemo(
    () => (indicators.includes('woodieCci') ? ind(computeWoodieCci(indBars)) : null),
    [indBars, indicators]
  );
  const stdErrorBands = useMemo(
    () => (indicators.includes('stdErrorBands') ? ind(computeStdErrorBands(closes)) : null),
    [closes, indicators]
  );
  const donchianWidth = useMemo(
    () => (indicators.includes('donchianWidth') ? ind(computeDonchianWidth(indBars)) : null),
    [indBars, indicators]
  );
  const connorsRsi = useMemo(
    () => (indicators.includes('connorsRsi') ? ind(computeConnorsRsi(closes)) : null),
    [closes, indicators]
  );
  const keltnerWidth = useMemo(
    () => (indicators.includes('keltnerWidth') ? ind(computeKeltnerWidth(indBars)) : null),
    [indBars, indicators]
  );
  const cfo = useMemo(
    () => (indicators.includes('cfo') ? ind(computeCfo(closes)) : null),
    [closes, indicators]
  );
  const vwMacd = useMemo(
    () => (indicators.includes('vwMacd') ? ind(computeVwMacd(indBars)) : null),
    [indBars, indicators]
  );
  const disparityIndex = useMemo(
    () => (indicators.includes('disparityIndex') ? ind(computeDisparityIndex(closes)) : null),
    [closes, indicators]
  );
  const tii = useMemo(
    () => (indicators.includes('tii') ? ind(computeTrendIntensityIndex(closes)) : null),
    [closes, indicators]
  );
  const demarker = useMemo(
    () => (indicators.includes('demarker') ? ind(computeDemarker(indBars)) : null),
    [indBars, indicators]
  );
  const rmi = useMemo(
    () => (indicators.includes('rmi') ? ind(computeRmi(closes)) : null),
    [closes, indicators]
  );
  const pgo = useMemo(
    () => (indicators.includes('pgo') ? ind(computePgo(indBars)) : null),
    [indBars, indicators]
  );
  const twiggsMoneyFlow = useMemo(
    () => (indicators.includes('twiggsMoneyFlow') ? ind(computeTwiggsMoneyFlow(indBars)) : null),
    [indBars, indicators]
  );
  const vzo = useMemo(
    () => (indicators.includes('vzo') ? ind(computeVzo(indBars)) : null),
    [indBars, indicators]
  );
  const avgPrice = useMemo(
    () => (indicators.includes('avgPrice') ? ind(computeAveragePrice(indBars)) : null),
    [indBars, indicators]
  );
  const atrp = useMemo(
    () => (indicators.includes('atrp') ? ind(computeAtrPercent(indBars)) : null),
    [indBars, indicators]
  );
  const vidya = useMemo(
    () => (indicators.includes('vidya') ? ind(computeVidya(closes)) : null),
    [closes, indicators]
  );
  const gmmaOsc = useMemo(() => {
    if (!indicators.includes('gmmaOsc')) return null;
    const g = gmma ?? ind(computeGmma(closes));
    return computeGmmaOscillator(g.shortLines, g.longLines);
  }, [closes, indicators, gmma]);
  const iftRsi = useMemo(
    () => (indicators.includes('iftRsi') ? ind(computeInverseFisherRsi(closes)) : null),
    [closes, indicators]
  );
  const waveTrend = useMemo(
    () => (indicators.includes('waveTrend') ? ind(computeWaveTrend(indBars)) : null),
    [indBars, indicators]
  );
  const accelBands = useMemo(
    () => (indicators.includes('accelBands') ? ind(computeAccelerationBands(indBars)) : null),
    [indBars, indicators]
  );
  const cutlerRsi = useMemo(
    () => (indicators.includes('cutlerRsi') ? ind(computeCutlerRsi(closes)) : null),
    [closes, indicators]
  );
  const starcBands = useMemo(
    () => (indicators.includes('starcBands') ? ind(computeStarcBands(indBars)) : null),
    [indBars, indicators]
  );
  const pmo = useMemo(
    () => (indicators.includes('pmo') ? ind(computePmo(closes)) : null),
    [closes, indicators]
  );
  const trueRange = useMemo(
    () => (indicators.includes('trueRange') ? ind(computeTrueRange(indBars)) : null),
    [indBars, indicators]
  );
  const stdError = useMemo(
    () => (indicators.includes('stdError') ? ind(computeStandardError(closes)) : null),
    [closes, indicators]
  );
  const ewmaVol = useMemo(
    () => (indicators.includes('ewmaVol') ? ind(computeEwmaVolatility(closes)) : null),
    [closes, indicators]
  );
  const volRoc = useMemo(
    () => (indicators.includes('volRoc') ? ind(computeVolumeRoc(indBars)) : null),
    [indBars, indicators]
  );
  const adxr = useMemo(
    () => (indicators.includes('adxr') ? ind(computeAdxr(indBars)) : null),
    [indBars, indicators]
  );
  const volatilityRatio = useMemo(
    () => (indicators.includes('volatilityRatio') ? ind(computeVolatilityRatio(indBars)) : null),
    [indBars, indicators]
  );
  const williamsAd = useMemo(
    () => (indicators.includes('williamsAd') ? ind(computeWilliamsAd(indBars)) : null),
    [indBars, indicators]
  );
  const gapo = useMemo(
    () => (indicators.includes('gapo') ? ind(computeGapo(indBars)) : null),
    [indBars, indicators]
  );
  const pfe = useMemo(
    () => (indicators.includes('pfe') ? ind(computePfe(closes)) : null),
    [closes, indicators]
  );
  const dma = useMemo(
    () => (indicators.includes('dma') ? ind(computeDma(closes)) : null),
    [closes, indicators]
  );
  const rainbowOsc = useMemo(
    () => (indicators.includes('rainbowOsc') ? ind(computeRainbowOscillator(closes)) : null),
    [closes, indicators]
  );
  const trima = useMemo(
    () => (indicators.includes('trima') ? ind(computeTrima(closes)) : null),
    [closes, indicators]
  );
  const efficiencyRatio = useMemo(
    () => (indicators.includes('efficiencyRatio') ? ind(computeEfficiencyRatio(closes)) : null),
    [closes, indicators]
  );
  const vpci = useMemo(
    () => (indicators.includes('vpci') ? ind(computeVpci(indBars)) : null),
    [indBars, indicators]
  );
  const ttf = useMemo(
    () => (indicators.includes('ttf') ? ind(computeTtf(indBars)) : null),
    [indBars, indicators]
  );
  const tdi = useMemo(
    () => (indicators.includes('tdi') ? ind(computeTdi(closes)) : null),
    [closes, indicators]
  );
  const vfi = useMemo(
    () => (indicators.includes('vfi') ? ind(computeVfi(indBars)) : null),
    [indBars, indicators]
  );
  const laguerreRsi = useMemo(
    () => (indicators.includes('laguerreRsi') ? ind(computeLaguerreRsi(closes)) : null),
    [closes, indicators]
  );

  // تعداد اللوحات وارتفاعاتها وأيّها يُطوى: كلّه بـ`planPanes` (./panes) أعلى الملف —
  // كان هنا تعدادٌ يدويّ من 108 سطر يقسم الارتفاع بلا فرضٍ للحدّ الأدنى، فتفيض اللوحات
  // خارج صندوق الشارت بصمت عند 5 لوحات فأكثر أو داخل خلية التخطيط الرباعي.

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
    // سلسلة مسطّحة: ±0.2% من السعر لا وحدة سعرية كاملة — `priceSpan.ts`.
    const span = priceSpan(min, max, logScale);
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

  sourceRef.current = source;

  const chartPlotW = Math.max(80, chartW - PRICE_AXIS_WIDTH);
  const chartPlotH = Math.max(100, mainH - timeAxisH);
  chartPlotWRef.current = chartPlotW;
  chartPlotHRef.current = chartPlotH;

  // مفتاح ألوان طبقات السعر. `legendTokens` يحلّ رموز السمة المكتوبة بجدول priceLegend
  // بنصّها كما هي بمواضع الرسم — فالمفتاح واللوحة يقرآن اللون نفسه لا نسختين تتباعدان.
  const legendTokens = useMemo(
    () => ({
      accent,
      'colors.infoAccent': colors.infoAccent,
      'colors.white': colors.white,
      'colors.bull': colors.bull,
      'colors.bear': colors.bear,
      'colors.dxy': colors.dxy,
    }),
    [accent]
  );
  const priceLegend = useMemo(
    () => planPriceLegendForWidth(indicators, chartPlotW - 12),
    [indicators, chartPlotW]
  );
  const viewXPan =
    syncFollow && syncWindow?.xPanNorm != null
      ? syncWindow.xPanNorm * chartPlotW
      : xPan;
  const toScale = (price: number) => (logScale ? Math.log(Math.max(price, 1e-12)) : price);
  const fromScale = (scaled: number) => (logScale ? Math.exp(scaled) : scaled);

  const xOf = (i: number) =>
    ((i + 0.5) / Math.max(1, source.plot.length)) * chartPlotW + viewXPan;
  // آخر خانة يبلغها اللوح يميناً: آخر شمعة، أو أبعد منها حين يُسحب الشارت يساراً فتظهر منطقة المستقبل.
  // خطّ الترند يُقصّ عندها لا عند آخر شمعة — ترند رُسم نحو المستقبل كان ينقطع عند الشمعة الحيّة.
  const lastDrawLocal = Math.max(
    source.plot.length - 1,
    Math.ceil(((chartPlotW - viewXPan) / chartPlotW) * Math.max(1, source.plot.length))
  );
  const colW = Math.min(
    48,
    Math.max(2, chartPlotW / Math.max(1, source.plot.length) - 1)
  );
  /**
   * عرض شريحة النطاق (بولنجر/كلتنر/دونشيان…) = خطوة العمود، فالمساحة متّصلة بكل تكبير
   * وشفافيّتها لا تتبدّل بتراكب الشرائح. `polyline.bandStripWidth` تشرح العطلين.
   */
  const bandW = bandStripWidth(chartPlotW, source.plot.length);

  const viewPriceScale =
    syncFollow && syncWindow?.priceScale != null ? syncWindow.priceScale : priceScale;
  const viewPricePan =
    syncFollow && syncWindow?.pricePan != null ? syncWindow.pricePan : pricePan;

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

    // تكبير/إزاحة المحور الرأسي على الحارة الأساسية — كانت بمدى شموعها وحده فالسحب الرأسي
    // وعجلة المحور بلا أثر مع الظلال. الإزاحة بوحدة الإطار الممدود (`priceFrame`) لا الحارة،
    // فالشمعة تتبع الإصبع بكسلاً ببكسل كما بلا ظلال.
    const primaryFit = laneRange(
      source.plot.map((c) => c.low),
      source.plot.map((c) => c.high)
    );
    const frameSpan = (primaryFit.span * chartPlotH) / Math.max(1, primaryH);
    const primaryCenter = (primaryFit.max + primaryFit.min) / 2 + viewPricePan * frameSpan;
    const primarySpan = primaryFit.span * viewPriceScale;
    const primaryLane = {
      id: 'primary',
      label: tr.mcPrimaryLane,
      top: 0,
      height: primaryH,
      min: primaryCenter - primarySpan / 2,
      max: primaryCenter + primarySpan / 2,
      span: primarySpan,
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
  }, [
    shadowLayers,
    chartPlotH,
    source.plot,
    range.min,
    range.max,
    range.span,
    logScale,
    tr,
    viewPriceScale,
    viewPricePan,
  ]);

  // إطار السعر الذي يقرأ به **كل شيء** (المحور، التقاطع و`priceAtY`، الرسومات، وسم السعر
  // الحيّ، التنبيه): مع الظلال الشموع الأساسية تُرسم بمدى حارتها العليا (`yPrimary`)، بينما
  // كان الباقي بالمدى الكامل مع الظلال — لمسة على ذيل تقرأ سعراً آخر، وتنبيه 🔔 يُضبط عليه،
  // وخطّ أفقي يُرسم بعيداً عن القمّة التي وُضع عليها. الآن مدى الحارة ممدوداً لارتفاع اللوح
  // (الحارة تبدأ من 0)، فتطابق `yOf` و`yPrimary` بالضبط. بلا ظلال: المدى كما كان.
  const priceFrame = useMemo(() => {
    if (!shadowStack) return range;
    const lane = shadowStack.primaryLane;
    const span = (lane.span * chartPlotH) / Math.max(1, lane.height);
    return { min: lane.max - span, max: lane.max, span };
  }, [shadowStack, range, chartPlotH]);
  rangeRef.current = priceFrame;
  const yOf = (price: number) =>
    ((priceFrame.max - toScale(price)) / priceFrame.span) * chartPlotH;

  const hasShadows = !!shadowStack;
  const primaryColW = colW;
  // الجسم متمركز تحت الفتيل (`left: colW/2 − 0.5`) — كان يبدأ من 0 بعرض colW − 1 فينحرف نصف بكسل.
  const primaryBodyW = candleBodyWidth(primaryColW);
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
      const raw = priceAtY(y);
      const local = hitIndex(x);
      const candle = sourceRef.current.plot[local];
      // مغناطيس ضعيف كالتقاطع (`CROSS_SNAP_PX`): يجذب لـO/H/L/C متى اقترب الإصبع منها فقط. كان يجذب
      // دائماً لأقرب الأربعة (`snapPrice`) مهما بعُد — والمغناطيس مفعَّل افتراضياً: خطّ مقاومة يُرسم 30 pip
      // فوق السعر يقفز لقمّة الشمعة تحت الإصبع، ووقف خطّة الشراء لا يُسحب إلا بين أسعار الشموع.
      // خارج الجذب: السعر مقرَّب لمنازل الأداة (1.08500 لا 1.0849973) كوسم التقاطع.
      const snapTol = Math.abs(priceAtY(y - CROSS_SNAP_PX) - raw);
      const price =
        crossPriceAt(raw, candle, magnet, symbolPriceDecimals(series.symbol), snapTol, priceDecimalsRef) ?? raw;
      const index = sourceRef.current.start + local;
      // مختومة بزمنها من الولادة: السحب لا يمرّ بتأثير الختم إطاراً إطاراً (رسمتان لكل حركة).
      const stamp = stampAtIndex(
        sourceRef.current.all as { time: number }[],
        index,
        timeframeStepSec(series.timeframe)
      );
      return stamp == null ? { index, price } : { index, price, ...stamp };
    },
    [hitIndex, priceAtY, magnet, series.timeframe, series.symbol, priceDecimalsRef]
  );

  // طرف `b` لخطّة شراء/بيع: يمين الدخول دائماً (`positionEndIndex`)، مختوماً بزمنه الجديد — وإلا
  // أعاده الإرساء لموضع الإصبع الأصلي يسار الدخول عند تبديل الفريم.
  const positionEndPoint = useCallback(
    (a: ChartPoint, b: ChartPoint): ChartPoint => {
      const index = positionEndIndex(a.index, b.index);
      if (index === b.index) return b;
      const stamp = stampAtIndex(
        sourceRef.current.all as { time: number }[],
        index,
        timeframeStepSec(series.timeframe)
      );
      return stamp == null ? { index, price: b.price } : { index, price: b.price, ...stamp };
    },
    [series.timeframe]
  );

  const finalizeDrawing = useCallback(
    (a: ChartPoint, b?: ChartPoint) => {
      const t = tool;
      if (t === 'none') return;
      if (t === 'measure' && b) {
        // بالنقاط (pip) بحجم pip الأداة — راجع `measureReadout.ts`. كان الفرق السعري
        // الخام وحده، ومصاغاً بلا رمز (فتُقدَّر منازله من حجم الرقم: خمس منازل لكل فرق
        // دون العشرة مهما كانت الأداة).
        setMeasureDone({ a, b });
        setPending(null);
        setDragEnd(null);
        setTool('none');
        return;
      }
      if (t === 'hline' || t === 'vline' || t === 'note') {
        pushDrawHistory();
        setDrawings((d) => [
          ...d,
          {
            id: nextDrawingId(),
            tool: t,
            a,
            text: t === 'note' ? tr.mcNoteDefault : undefined,
            color: accent,
          },
        ]);
      } else if (b) {
        pushDrawHistory();
        // شراء/بيع: `b` يُخزَّن عند الوقف بجهته الصحيحة (المقبض حيث يُرى الوقف) — `positionTool.ts`.
        const end = isPositionTool(t)
          ? { ...positionEndPoint(a, b), price: positionStop(t, a.price, b.price, series.symbol) }
          : b;
        setDrawings((d) => [
          ...d,
          { id: nextDrawingId(), tool: t, a, b: end, color: accent },
        ]);
      }
      setPending(null);
      setDragEnd(null);
      setTool('none');
    },
    [tool, accent, tr, pushDrawHistory, series.symbol, positionEndPoint]
  );

  /**
   * تحريك طرف رسم. **الكتابة تُسقَط إن لم تتغيّر النقطة** — مع المغناطيس مفعّلاً تعطي حركة
   * إصبع داخل الشمعة نفسها النقطةَ ذاتها حرفياً، وكل كتابة تُنشئ مصفوفة جديدة تُشغّل مؤقّت
   * الحفظ (`saveQueue`) وتُعيد رسم الشارت بلا أي فرق مرئي. (الفرعان كانا متطابقين قبلاً:
   * `d.b ? {...d, b} : {...d, b}` — والسحب لطرف `b` لا يقع أصلاً إلا على رسمٍ له `b`.)
   */
  const moveDrawing = useCallback(
    (id: string, point: ChartPoint, end: 'a' | 'b') => {
      setDrawings((list) => {
        const cur = list.find((x) => x.id === id);
        // وقف مركز شراء/بيع سُحب لجهة الهدف ⇒ يُعكس لجهته (المقبض يتبع ما يُرسم).
        const next =
          cur && end === 'b' && isPositionTool(cur.tool)
            ? {
                ...positionEndPoint(cur.a, point),
                price: positionStop(cur.tool, cur.a.price, point.price, series.symbol),
              }
            : point;
        if (!dragChangesDrawing(cur, end, next)) return list;
        return list.map((d) =>
          d.id !== id ? d : end === 'a' ? { ...d, a: next } : { ...d, b: next }
        );
      });
    },
    [series.symbol, positionEndPoint]
  );

  /** مقبض الهدف لأداتَي شراء/بيع: يغيّر النسبة وحدها (الهدف مشتقّ من الدخول والوقف). */
  const setDrawingRr = useCallback((id: string, rr: number) => {
    setDrawings((list) => {
      const cur = list.find((x) => x.id === id);
      if (!cur || cur.rr === rr) return list;
      return list.map((d) => (d.id !== id ? d : { ...d, rr }));
    });
  }, []);

  /**
   * هندسة صندوقَي شراء/بيع على الشاشة: الحافّة اليسرى عند الأقدم من الدخول والوقف، ولا يقلّ العرض
   * عن 36px (نقرتان على الشمعة نفسها كانتا ستعطيان صندوقاً بلا عرض لا يُرى ولا يُلمس). مقبضا الوقف
   * والهدف عند طرف `b`، ومقبض الدخول عند `a`.
   */
  const positionBox = (
    side: PositionSide,
    a: ChartPoint,
    b: ChartPoint,
    rr: number | undefined,
    aLocal: number,
    bLocal: number
  ) => {
    const lv = positionLevels(side, a.price, b.price, rr, series.symbol);
    const xEntry = xOf(aLocal);
    const xEnd = xOf(bLocal);
    const left = Math.min(xEntry, xEnd);
    const right = Math.max(xEntry, xEnd, left + 36);
    return {
      lv,
      left,
      right,
      xEntry,
      xEnd,
      yEntry: yOf(lv.entry),
      yStop: yOf(lv.stop),
      yTarget: yOf(lv.target),
    };
  };

  /**
   * صندوقا الهدف (أخضر) والوقف (أحمر) وخطّ الدخول، ووسما TP/SL **خارج** حافّتيهما البعيدتين
   * (داخل صندوق ارتفاعه بضعة بكسلات لا يتّسع الوسم). `preview`: أثناء السحب الأول بلا مقابض.
   */
  const renderPosition = (
    key: string,
    side: PositionSide,
    a: ChartPoint,
    b: ChartPoint,
    rr: number | undefined,
    color: string,
    sel: boolean,
    preview: boolean
  ) => {
    const box = positionBox(side, a, b, rr, a.index - source.start, b.index - source.start);
    const labels = positionLabels(box.lv, series.symbol);
    const width = box.right - box.left;
    // النتيجة على الشموع الحقيقية (هايكن آشي أسعار مُركّبة بالفهارس نفسها)، حتى الشمعة الحيّة —
    // وبالإعادة حتى شمعة الإعادة فلا تُكشف قبل أوانها. كانت «آخر شمعة معروضة» دائماً: سحب الشارت
    // للخلف لقراءة الدخول يغيّر ربح الصفقة المفتوحة، بل يعيد صفقة منفَّذة إلى «Entry ⌛».
    const outcome = positionOutcome(
      box.lv,
      kind === 'heikin' ? liveSeries.candles : source.all,
      a.index,
      b.index,
      replayOn ? source.start + source.plot.length - 1 : source.all.length - 1
    );
    const outcomeUp = outcome != null && outcome.r >= 0;
    // لم يبلغ السعر الدخول بعد (أمر معلّق) ⇒ وسم محايد بلا شريط مسار: لا ربح ولا خسارة لصفقة لم تُفتح.
    const unfilled = outcome != null && (outcome.state === 'pending' || outcome.state === 'missed');
    const outcomeTone = unfilled ? colors.textMuted : outcomeUp ? colors.bull : colors.bear;
    const outcomeText = outcome ? positionOutcomeText(box.lv, outcome, series.symbol) : '';
    const xExit = outcome ? Math.min(box.right, xOf(outcome.exitIndex - source.start)) : 0;
    // المسار يبدأ من شمعة التنفيذ لا شمعة الرسم — دخول معلّق نُفّذ بعد عشر شمعات يُظلَّل منها.
    const xFill = outcome ? Math.max(box.xEntry, xOf(outcome.fillIndex - source.start)) : 0;
    const band = (y1: number, y2: number, fill: string, edge: string) => (
      <View
        style={{
          position: 'absolute',
          left: box.left,
          top: Math.min(y1, y2),
          width,
          height: Math.max(1, Math.abs(y2 - y1)),
          backgroundColor: fill,
          borderColor: edge,
          borderWidth: sel ? 1.5 : 1,
        }}
      />
    );
    const tag = (y: number, beyondEntry: boolean, text: string, tone: string) => (
      <Text
        numberOfLines={1}
        style={[
          styles.positionLabel,
          {
            // يُزاح يساراً عند حافّة اللوح بدل قصّ النسبة.
            left: positionLabelLeft(box.left, text, chartPlotW),
            // الحافّة العليا ⇒ الوسم فوقها، والسفلى ⇒ تحتها.
            top: beyondEntry ? y - 16 : y + 2,
            maxWidth: Math.max(60, chartPlotW - positionLabelLeft(box.left, text, chartPlotW) - 2),
            color: tone,
            borderColor: tone,
          },
        ]}
      >
        {text}
      </Text>
    );
    return (
      <View key={key} pointerEvents="none" style={StyleSheet.absoluteFill}>
        {band(box.yEntry, box.yTarget, 'rgba(34,197,94,0.14)', 'rgba(34,197,94,0.55)')}
        {band(box.yEntry, box.yStop, 'rgba(244,63,94,0.14)', 'rgba(244,63,94,0.55)')}
        <View
          style={{
            position: 'absolute',
            left: box.left,
            top: box.yEntry,
            width,
            borderTopWidth: sel ? 2 : 1,
            borderColor: color,
          }}
        />
        {outcome && !unfilled && xExit > xFill ? (
          // ما قطعه السعر من الدخول إلى الخروج/السعر الجاري — أغمق من الصندوق كما في TradingView.
          <View
            style={{
              position: 'absolute',
              left: xFill,
              top: Math.min(box.yEntry, yOf(outcome.exit)),
              width: xExit - xFill,
              height: Math.max(1, Math.abs(yOf(outcome.exit) - box.yEntry)),
              backgroundColor: outcomeUp ? 'rgba(34,197,94,0.22)' : 'rgba(244,63,94,0.22)',
            }}
          />
        ) : null}
        {tag(box.yTarget, box.yTarget < box.yEntry, labels.target, colors.bull)}
        {tag(box.yStop, box.yStop < box.yEntry, labels.stop, colors.bear)}
        {outcome ? (
          <Text
            numberOfLines={1}
            style={[
              styles.positionLabel,
              {
                // بعد مقبض الدخول لا فوقه (إلا إن لم يتّسع حتى حافّة اللوح).
                left: positionLabelLeft(box.left + 10, outcomeText, chartPlotW),
                top: box.yEntry - 7,
                maxWidth: Math.max(60, chartPlotW - positionLabelLeft(box.left + 10, outcomeText, chartPlotW) - 2),
                color: outcomeTone,
                borderColor: outcomeTone,
              },
            ]}
          >
            {outcomeText}
          </Text>
        ) : null}
        {sel && !preview ? (
          <>
            <View style={[styles.grabHandle, { left: box.xEntry, top: box.yEntry, borderColor: color }]} />
            <View style={[styles.grabHandle, { left: box.xEnd, top: box.yStop, borderColor: colors.bear }]} />
            <View style={[styles.grabHandle, { left: box.xEnd, top: box.yTarget, borderColor: colors.bull }]} />
          </>
        ) : null}
      </View>
    );
  };

  /**
   * أي رسم تحت الإصبع.
   *
   * كانت المسافات بثلاث وحدات مختلفة تُقارن ببعضها: الخط الأفقي بوحدة السعر، الرأسي بعدد
   * الشموع، والبقية بالبكسل — فخطٌّ أفقي على بُعد 0.0004 كان «أقرب» من خط ترند تحت الإصبع
   * تماماً. صارت كلها بالبكسل. وكان الالتقاط عند طرفَي الرسم فقط، فلمس منتصف خط الترند
   * (وهو ما يفعله المتداول) لا يحدّد شيئاً؛ صار جسم الخط/حدّ المستطيل/مستويات فيبو قابلة
   * للّمس. والملاحظة `note` لم تكن قابلة للتحديد إطلاقاً — لا سبيل لحذفها إلا بمسح الكل.
   */
  const hitDrawing = useCallback(
    (x: number, y: number) => {
      const HANDLE_R = DRAW_HANDLE_R; // مقبض الطرف: هدف سحب، مدى ألطف
      const BODY_R = 14; // جسم الخط/الحدّ
      let best: DrawingHit = null;
      for (const d of drawings) {
        const aLocal = d.a.index - source.start;
        const ax = xOf(aLocal);
        const ay = yOf(d.a.price);
        if (d.tool === 'hline') {
          best = considerHit(d.id, Math.abs(y - ay), BODY_R, best);
          continue;
        }
        if (d.tool === 'vline') {
          best = considerHit(d.id, Math.abs(x - ax), BODY_R, best);
          continue;
        }
        if (d.tool === 'note') {
          best = considerHit(d.id, Math.hypot(x - ax, y - ay), HANDLE_R, best);
          continue;
        }
        if (!d.b) continue;
        const bLocal = d.b.index - source.start;
        const bx = xOf(bLocal);
        const by = yOf(d.b.price);
        let endDist = Math.min(Math.hypot(x - ax, y - ay), Math.hypot(x - bx, y - by));
        let bodyDist = Infinity;
        if (isPositionTool(d.tool)) {
          // الصندوقان كلاهما هدف لمس (لا الحدود وحدها كالمستطيل): المتداول يلمس «صفقته».
          const box = positionBox(d.tool, d.a, d.b, d.rr, aLocal, bLocal);
          const t = Math.min(box.yTarget, box.yStop);
          const b = Math.max(box.yTarget, box.yStop);
          const inside = x >= box.left && x <= box.right && y >= t && y <= b;
          bodyDist = inside
            ? 0
            : Math.min(
                segmentDistance(x, y, box.left, t, box.right, t, 1),
                segmentDistance(x, y, box.left, b, box.right, b, 1),
                segmentDistance(x, y, box.left, t, box.left, b, 1),
                segmentDistance(x, y, box.right, t, box.right, b, 1)
              );
          endDist = Math.min(
            Math.hypot(x - box.xEntry, y - box.yEntry),
            Math.hypot(x - box.xEnd, y - box.yStop),
            Math.hypot(x - box.xEnd, y - box.yTarget)
          );
        } else if (d.tool === 'trend' || d.tool === 'ray') {
          // نفس ما يُرسَم: الطرفان مقصوصان على النافذة (على الخطّ)، والشعاع يمتدّ حتى حافّة اللوح.
          const seg = clipSegmentToBars(aLocal, ay, bLocal, by, lastDrawLocal);
          const sx1 = xOf(seg.ai);
          const sx2 = xOf(seg.bi);
          bodyDist = segmentDistance(
            x,
            y,
            sx1,
            seg.ay,
            sx2,
            seg.by,
            d.tool === 'ray' ? rayReach(sx1, seg.ay, sx2, seg.by, chartPlotW, chartPlotH) : 1
          );
        } else if (d.tool === 'rect' || d.tool === 'zone') {
          const l = Math.min(ax, bx);
          const r = Math.max(ax, bx);
          const t = Math.min(ay, by);
          const b = Math.max(ay, by);
          bodyDist = Math.min(
            segmentDistance(x, y, l, t, r, t, 1),
            segmentDistance(x, y, l, b, r, b, 1),
            segmentDistance(x, y, l, t, l, b, 1),
            segmentDistance(x, y, r, t, r, b, 1)
          );
        } else if (d.tool === 'fib') {
          // مستويات فيبو خطوط أفقية بعرض الشارت — المسافة الرأسية لأقرب مستوى.
          // نفس `fibLevelPrice` التي يُرسم بها المستوى — وإلا اختلف ما يُلمس عمّا يُرى
          // (المدى الصفري كان يُحسب هنا وهناك بـ`|| 1`، أي على مدى وحدة سعرية كاملة).
          const hi = Math.max(d.a.price, d.b.price);
          const lo = Math.min(d.a.price, d.b.price);
          for (const lv of FIB_DRAW_LEVELS) {
            bodyDist = Math.min(bodyDist, Math.abs(y - yOf(fibLevelPrice(hi, lo, lv, d.a.price > d.b.price))));
          }
        }
        const dist = Math.min(endDist, bodyDist);
        best = considerHit(d.id, dist, endDist <= HANDLE_R ? HANDLE_R : BODY_R, best);
      }
      return best?.id ?? null;
    },
    [drawings, source.start, source.plot.length, xOf, yOf, positionBox, chartPlotW, chartPlotH, lastDrawLocal]
  );

  const exportChart = async () => {
    if (!plotRef.current) return;
    try {
      const uri = await captureRef(plotRef, { format: 'png', quality: 0.95 });
      if (Platform.OS === 'web') {
        Alert.alert('MATRIX', tr.mcSnapshotSaved);
        return;
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'MATRIX Chart' });
      }
    } catch {
      Alert.alert('MATRIX', tr.mcSnapshotFailed);
    }
  };

  // التقاطع عند (x, y) داخل اللوح: الشمعة من x، والسعر من y لا من إغلاقها.
  const placeCross = (x: number, y: number, hover = false) => {
    const candle = source.plot[hitIndex(x)];
    if (!candle) return;
    const raw = priceAtY(y);
    // 14px حول الإصبع بوحدة السعر عند موضعه (يصحّ مع المقياس اللوغاريتمي كذلك).
    const snapTol = Math.abs(priceAtY(y - CROSS_SNAP_PX) - raw);
    const price = crossPriceAt(raw, candle, magnet, symbolPriceDecimals(series.symbol), snapTol, priceDecimalsRef);
    crossPinned.current = !hover;
    crossFromSync.current = false;
    setCrossHover(hover);
    // حركة الفأرة داخل الشمعة نفسها وعلى السعر المقرَّب نفسه لا تعيد رسم الشارت كلّه.
    if (cross && cross.time === candle.time && cross.price === price) return;
    setCross({ time: candle.time, price });
  };

  const onChartPress = (x: number, y: number) => {
    const index = hitIndex(x);
    const candle = source.plot[index];
    if (!candle) return;
    webKeyChart = keyToken.current;
    setMeasureDone(null);
    placeCross(x, y);
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
  crossAtRef.current = placeCross;
  offsetRef.current = offset;
  priceScaleRef.current = priceScale;
  windowCountRef.current = windowCount;
  pricePanRef.current = pricePan;
  xPanRef.current = xPan;

  // Drawing gesture: a drag draws the line in one stroke; a short tap only drops the first anchor
  // (a second tap completes it) instead of committing a zero-length line. The gesture refuses
  // termination so a parent vertical ScrollView cannot steal a diagonal stroke mid-draw.
  const drawGestureHadPending = useRef(false);
  const drawAnchorRef = useRef<ChartPoint | null>(null);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => interactive && tool !== 'none' && tool !== 'select',
        onMoveShouldSetPanResponder: () => interactive && tool !== 'none' && tool !== 'select',
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (evt) => {
          webKeyChart = keyToken.current;
          const { locationX, locationY } = evt.nativeEvent;
          const p = pointFromXY(locationX, locationY);
          if (tool === 'hline' || tool === 'vline' || tool === 'note') return;
          if (tool === 'measure') setMeasureDone(null);
          drawGestureHadPending.current = !!pending;
          drawAnchorRef.current = pending ?? p;
          if (!pending) setPending(p);
          setDragEnd(p);
        },
        onPanResponderMove: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          setDragEnd(pointFromXY(locationX, locationY));
        },
        onPanResponderRelease: (evt, g) => {
          const { locationX, locationY } = evt.nativeEvent;
          const end = pointFromXY(locationX, locationY);
          if (tool === 'hline' || tool === 'vline' || tool === 'note') {
            onChartPress(locationX, locationY);
            return;
          }
          // Read the anchor from a ref: the handler may still close over the pre-grant `pending`.
          const anchor = drawAnchorRef.current;
          const moved = Math.hypot(g.dx, g.dy) >= 8;
          if (!anchor) return;
          if (moved || drawGestureHadPending.current) {
            drawAnchorRef.current = null;
            finalizeDrawing(anchor, end);
          }
        },
        onPanResponderTerminate: () => {
          if (!drawGestureHadPending.current) {
            drawAnchorRef.current = null;
            setPending(null);
            setDragEnd(null);
          }
        },
      }),
    [interactive, tool, pending, pointFromXY, finalizeDrawing]
  );

  // حالة سحب المقبض بمراجع لا بمتغيّرات داخل `useMemo`: `selectPan` يُعاد بناؤه مع كل تغيّر بـ`drawings`
  // (وأوّل خطوة سحب تغيّرها)، ونظام المستجيب يستدعي معالجات **الخصائص الحالية** — فمتغيّر الإغلاق
  // يبدأ `null` بالكائن الجديد ويتوقّف المقبض بعد خطوة واحدة تحت الإصبع.
  // `t`: مقبض هدف شراء/بيع — يغيّر النسبة `rr` لا نقطة (`selDragRr` آخر نسبة بلغها بهذه السحبة).
  // `body`: جسم الرسم لا مقبضه ⇒ يتحرّك كلّه (`translateDrawing`) من الرسم كما كان عند بدء السحب.
  const selDragEnd = useRef<'a' | 'b' | 't' | 'body' | null>(null);
  const selBodyFrom = useRef<{ x: number; y: number; d: Drawing } | null>(null);
  const selBodyLast = useRef<Drawing | null>(null);
  // النقطة التي يقف عندها الطرف المسحوب الآن، و«هل دُفِعت لقطة تراجع لهذه السحبة؟».
  // راجع `drawEdit.ts`: اللقطة تُدفَع عند **أول حركة تُغيّر الطرف فعلاً** لا عند بدء
  // اللمس — وإلا استهلكت لمسةٌ لم تغيّر شيئاً مكاناً من سجلّ التراجع (25 لقطة).
  const selDragAt = useRef<ChartPoint | null>(null);
  const selDragPushed = useRef(false);
  const selDragRr = useRef<number | null>(null);
  const selectPan = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => interactive && tool === 'select' && !!selectedId,
      onMoveShouldSetPanResponder: () => interactive && tool === 'select' && !!selectedId,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        webKeyChart = keyToken.current;
        selDragEnd.current = null;
        selDragAt.current = null;
        selDragRr.current = null;
        selDragPushed.current = false;
        selBodyFrom.current = null;
        selBodyLast.current = null;
        if (!selectedId) return;
        const { locationX, locationY } = evt.nativeEvent;
        const d = drawings.find((x) => x.id === selectedId);
        if (!d) return;
        // لمسة على جسم الرسم المحدَّد (لا على مقبض) ⇒ تحريكه كلّه بشكله.
        const grabBody = () => {
          if (hitDrawing(locationX, locationY)?.id !== d.id) return;
          selDragEnd.current = 'body';
          selBodyFrom.current = { x: locationX, y: locationY, d };
          selBodyLast.current = d;
        };
        let end: 'a' | 'b' = 'a';
        if (d.b && isPositionTool(d.tool)) {
          const box = positionBox(d.tool, d.a, d.b, d.rr, d.a.index - source.start, d.b.index - source.start);
          const handles: ['a' | 'b' | 't', number][] = [
            ['a', Math.hypot(locationX - box.xEntry, locationY - box.yEntry)],
            ['b', Math.hypot(locationX - box.xEnd, locationY - box.yStop)],
            ['t', Math.hypot(locationX - box.xEnd, locationY - box.yTarget)],
          ];
          handles.sort((x, y) => x[1] - y[1]);
          if (handles[0][1] > DRAW_HANDLE_R) return grabBody();
          const grabbed = handles[0][0];
          selDragEnd.current = grabbed;
          selDragAt.current = grabbed === 't' ? null : drawingEnd(d, grabbed);
          selDragRr.current = grabbed === 't' ? box.lv.rr : null;
          return;
        }
        if (d.b) {
          const da = Math.hypot(locationX - xOf(d.a.index - source.start), locationY - yOf(d.a.price));
          const db = Math.hypot(locationX - xOf(d.b.index - source.start), locationY - yOf(d.b.price));
          // صار يمكن تحديد الخط من أي نقطة على جسمه، فالسحب من المنتصف كان سيجرّ أقرب
          // طرف ويشوّه خطاً لمسه المتداول ليحدّده فقط: المقبض يحرّك طرفه، والجسم يحرّك الرسم كلّه.
          if (Math.min(da, db) > DRAW_HANDLE_R) return grabBody();
          end = db < da ? 'b' : 'a';
        }
        selDragEnd.current = end;
        selDragAt.current = drawingEnd(d, end);
      },
      onPanResponderMove: (evt) => {
        const end = selDragEnd.current;
        if (!selectedId || !end) return;
        if (end === 'body') {
          const from = selBodyFrom.current;
          if (!from) return;
          const { locationX, locationY } = evt.nativeEvent;
          // إزاحة السعر بمقياس المحور الجاري (خطّي/لوغاريتمي) لا بفرق سعري ثابت.
          const dScaled = toScale(priceAtY(locationY)) - toScale(priceAtY(from.y));
          const next = translateDrawing(
            from.d,
            hitIndex(locationX) - hitIndex(from.x),
            (price) => fromScale(toScale(price) + dScaled),
            (index) =>
              stampAtIndex(
                sourceRef.current.all as { time: number }[],
                index,
                timeframeStepSec(series.timeframe)
              )
          );
          if (sameDrawingPlace(selBodyLast.current, next)) return;
          if (!selDragPushed.current) {
            pushDrawHistory();
            selDragPushed.current = true;
          }
          selBodyLast.current = next;
          setDrawings((list) => list.map((x) => (x.id === next.id ? next : x)));
          return;
        }
        const p = pointFromXY(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
        if (end === 't') {
          const d = drawings.find((x) => x.id === selectedId);
          if (!d?.b || !isPositionTool(d.tool)) return;
          const lv = positionLevels(d.tool, d.a.price, d.b.price, d.rr, series.symbol);
          const rr = rrFromTarget(lv, p.price);
          if (rr === selDragRr.current) return;
          if (!selDragPushed.current) {
            pushDrawHistory();
            selDragPushed.current = true;
          }
          selDragRr.current = rr;
          setDrawingRr(selectedId, rr);
          return;
        }
        // المقارنة بـ`selDragAt.current` (آخر موضع بلغه الطرف بهذه السحبة) لا بحالة React: الحالة
        // تصل متأخّرة إطاراً عن أحداث الحركة، فمقارنتها كانت ستسمح بلقطة مكرّرة.
        if (samePoint(selDragAt.current, p)) return;
        if (!selDragPushed.current) {
          pushDrawHistory();
          selDragPushed.current = true;
        }
        selDragAt.current = p;
        moveDrawing(selectedId, p, end);
      },
      onPanResponderRelease: () => {
        selDragEnd.current = null;
        selDragAt.current = null;
        selDragRr.current = null;
        selBodyFrom.current = null;
        selBodyLast.current = null;
      },
      onPanResponderTerminate: () => {
        selDragEnd.current = null;
        selDragAt.current = null;
        selDragRr.current = null;
        selBodyFrom.current = null;
        selBodyLast.current = null;
      },
    });
  }, [
    interactive,
    tool,
    selectedId,
    drawings,
    moveDrawing,
    setDrawingRr,
    positionBox,
    series.symbol,
    pointFromXY,
    pushDrawHistory,
    source.start,
    xOf,
    yOf,
    hitDrawing,
    hitIndex,
    priceAtY,
    logScale,
    series.timeframe,
  ]);

  // لوحة المفاتيح للرسم على الويب (كما بـTradingView): Delete/Backspace تحذف الرسم المحدَّد، وEsc
  // تلغي رسماً بدأ (النقطة الأولى) ثم التحديد ثم الأداة، وCtrl/⌘+Z تتراجع. للشارت الذي لُمس
  // أخيراً وحده (`webKeyChart`)، ولا تسرق المفاتيح من خانة كتابة (Backspace بخانة الملاحظة).
  useEffect(() => {
    if (Platform.OS !== 'web' || !interactive) return;
    const onKey = (event: KeyboardEvent) => {
      if (webKeyChart !== keyToken.current) return;
      const target = event.target as { tagName?: string; isContentEditable?: boolean } | null;
      if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? '')) return;
      const key = event.key;
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && key.toLowerCase() === 'z') {
        if (!drawHistory.current.length) return;
        event.preventDefault();
        undoDrawing();
        return;
      }
      if (key === 'Escape') {
        if (pending) {
          setPending(null);
          setDragEnd(null);
        } else if (selectedId) {
          setSelectedId(null);
        } else if (tool !== 'none') {
          setTool('none');
        }
        return;
      }
      if ((key === 'Delete' || key === 'Backspace') && selectedId) {
        event.preventDefault();
        pushDrawHistory();
        setDrawings((list) => list.filter((x) => x.id !== selectedId));
        setSelectedId(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [interactive, pending, selectedId, tool, undoDrawing, pushDrawHistory]);

  const applyChartDrag = useCallback(
    (dx: number, dy: number) => {
      const mul = panSpeedMulRef.current;
      const sdx = dx * mul;
      const sdy = dy * mul;
      // عرض الشمعة **المرسومة**: الرسم يقسم العرض على طول السلسلة المرسومة لا على النافذة،
      // فسلسلة أقصر من النافذة (Renko، أو أقدم التاريخ) كانت تتحرّك أسرع من الإصبع بنسبتهما.
      const barWidth = chartPlotW / Math.max(2, panStartBars.current || windowCountRef.current);
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

  // زرّا ‹ › : الحدّ كان من `series.candles` لا من السلسلة المرسومة — بـRenko/Kagi/P&F/Range
  // (لبنات أقلّ بكثير من الشموع) يدفع ‹ الإزاحة أبعد من طول السلسلة فيفرغ الشارت كلّه ولا
  // يعيده إلا عدّة نقرات › عمياء. وسلسلة أقصر من 10 كانت تعطي إزاحة سالبة. ولم يكن الزرّ
  // ينشر نافذته بالتخطيط الرباعي كما يفعل السحب.
  const panByButton = useCallback(
    (bars: number) => {
      const maxOffset = Math.max(0, sourceRef.current.all.length - 10);
      const next = Math.max(0, Math.min(maxOffset, offsetRef.current + bars));
      if (next === offsetRef.current) return;
      offsetRef.current = next;
      setOffset(next);
      schedulePublishSync(false);
    },
    [schedulePublishSync]
  );

  const beginDrag = useCallback(() => {
    panStartOffset.current = offsetRef.current;
    // مثبَّت طوال السحب: تغيّره إطاراً إطاراً عند أوّل التاريخ يجعل السحب غير خطّي.
    panStartBars.current = Math.min(
      windowCountRef.current,
      sourceRef.current.plot.length || windowCountRef.current
    );
    panStartX.current = xPanRef.current;
    panStartPrice.current = pricePanRef.current;
    panMoved.current = false;
    crossPinned.current = false;
    crossFromSync.current = false;
    setCross(null);
  }, []);

  const endDrag = useCallback(() => {
    schedulePublishSync(true);
  }, [schedulePublishSync]);

  // حول المركز، إلا عند متابعة الحيّ (offset 0) فالطرف الأيمن مثبَّت — `zoomWindow.ts`.
  const zoomAroundCenter = useCallback(
    (factor: number) => {
      const current = windowCountRef.current;
      const z = zoomWindow(sourceRef.current.all.length, current, offsetRef.current, factor);
      if (z.count === current && z.offset === offsetRef.current) return;
      windowCountRef.current = z.count;
      offsetRef.current = z.offset;
      setWindowCount(z.count);
      setOffset(z.offset);
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

  // سحب المحورَين يمطّ/يضغط كـTradingView (`axisDrag.ts`) — كان نسخة ثانية من سحب الشارت،
  // فلا سبيل على الهاتف لمطّ السعر. كلاهما من حالة بدء السحب؛ نقرتان تعيدان مقياس المحور وحده.
  const beginAxisDrag = useCallback(() => {
    beginDrag();
    priceScaleStart.current = priceScaleRef.current;
    timeWindowStart.current = windowCountRef.current;
  }, [beginDrag]);

  const scalePriceByDrag = useCallback(
    (dy: number) => {
      const next = priceAxisDragScale(priceScaleStart.current, dy);
      if (next === priceScaleRef.current) return;
      priceScaleRef.current = next;
      setPriceScale(next);
      schedulePublishSync(false);
    },
    [schedulePublishSync]
  );

  const zoomTimeByDrag = useCallback(
    (dx: number) => {
      const z = timeAxisDragWindow(
        sourceRef.current.all.length,
        timeWindowStart.current,
        panStartOffset.current,
        dx
      );
      if (z.count === windowCountRef.current && z.offset === offsetRef.current) return;
      windowCountRef.current = z.count;
      offsetRef.current = z.offset;
      setWindowCount(z.count);
      setOffset(z.offset);
      schedulePublishSync(false);
    },
    [schedulePublishSync]
  );

  const priceAxisTap = useRef<AxisTap | null>(null);
  const timeAxisTap = useRef<AxisTap | null>(null);
  // نقرة (لا سحب) على محور: الثانية خلال `DOUBLE_TAP_MS` تعيد مقياسه — السعر: المقياس والإزاحة
  // الرأسية (تلقائي من جديد)؛ الزمن: 80 شمعة والطرف الأيمن كما هو. الآخر لا يُلمس.
  const axisTapped = useCallback(
    (axis: 'price' | 'time', tap: AxisTap) => {
      const last = axis === 'price' ? priceAxisTap : timeAxisTap;
      if (!isDoubleTap(last.current, tap)) {
        last.current = tap;
        return;
      }
      last.current = null;
      if (axis === 'price') {
        priceScaleRef.current = 1;
        pricePanRef.current = 0;
        setPriceScale(1);
        setPricePan(0);
      } else {
        windowCountRef.current = 80;
        xPanRef.current = 0;
        setWindowCount(80);
        setXPan(0);
      }
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

  // القرص بإصبعين — مشترك بين مسار الهاتف (`chartPan`) ومسار لمس الويب (`webChartHandlers`).
  // `x1/x2` بإحداثيات الصفحة/النافذة، و`plotLeft` حافّة اللوح بنفس الإحداثيات.
  const beginPinch = useCallback(
    (x1: number, x2: number, plotLeft: number) => {
      if (scrubTimer.current) clearTimeout(scrubTimer.current);
      scrubTimer.current = null;
      scrubbing.current = false;
      panMoved.current = true;
      pinchUsed.current = true;
      crossPinned.current = false;
      setCross(null);
      pinchStart.current = {
        spread: pinchSpread(x1, x2),
        count: windowCountRef.current,
        offset: offsetRef.current,
        focus: ((x1 + x2) / 2 - plotLeft) / Math.max(1, chartPlotW),
      };
    },
    [chartPlotW]
  );

  const movePinch = useCallback(
    (x1: number, x2: number) => {
      const st = pinchStart.current;
      if (!st) return;
      const z = pinchWindow(
        sourceRef.current.all.length,
        st.count,
        st.offset,
        st.spread,
        pinchSpread(x1, x2),
        st.focus
      );
      if (z.count === windowCountRef.current && z.offset === offsetRef.current) return;
      windowCountRef.current = z.count;
      offsetRef.current = z.offset;
      setWindowCount(z.count);
      setOffset(z.offset);
      schedulePublishSync(false);
    },
    [schedulePublishSync]
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
        onPanResponderGrant: (evt) => {
          beginDrag();
          // موضع اللمسة داخل اللوح — النقرة بلا سحب تضع التقاطع **هنا**. لم يكن يُسجَّل
          // إلا بمسار الويب، فكانت كل نقرة على الهاتف تضع التقاطع عند (0,0): أوّل شمعة
          // ظاهرة، وسطر OHLC يقرأ شمعةً لم يلمسها المتداول. السطح نفسه يبدأ عند (0,0) اللوح.
          panStartPoint.current = {
            x: evt.nativeEvent.locationX,
            y: evt.nativeEvent.locationY,
          };
          plotPageLeft.current = evt.nativeEvent.pageX - evt.nativeEvent.locationX;
          pinchStart.current = null;
          pinchUsed.current = false;
          // إصبع ثابت 350ms ⇒ وضع التتبّع: كان كل سحب يحرّك الشارت، فقراءة شموع متتالية
          // تعني نقرة لكل شمعة. الانزياح ≤4px قبل المؤقّت يُلغى كي لا يبدأ التتبّع بشارت مزاح.
          scrubbing.current = false;
          if (scrubTimer.current) clearTimeout(scrubTimer.current);
          scrubTimer.current = setTimeout(() => {
            scrubTimer.current = null;
            if (panMoved.current) return;
            scrubbing.current = true;
            applyChartDrag(0, 0);
            chartPressRef.current(panStartPoint.current.x, panStartPoint.current.y);
          }, 350);
        },
        onPanResponderMove: (evt, g) => {
          // إصبع ثانٍ ⇒ قرص يكبّر/يصغّر الشموع كـTradingView على الهاتف. لم يكن بالشارت أيّ
          // تكبير باللمس: زرّا − + وحدهما (وعجلة الفأرة بالويب)، والإصبع الثاني كان يُقرأ
          // سحباً فيقفز الشارت بمقدار انتقال مركز اللمسات.
          const touches = evt.nativeEvent.touches;
          if (touches && touches.length >= 2) {
            if (!pinchStart.current) beginPinch(touches[0].pageX, touches[1].pageX, plotPageLeft.current);
            movePinch(touches[0].pageX, touches[1].pageX);
            return;
          }
          pinchStart.current = null;
          // رُفع أحد الإصبعين: الباقي لا يسحب الشارت حتى يُرفع — كان سيقفز بفرق مركز اللمسات.
          if (pinchUsed.current) return;
          if (scrubbing.current) {
            crossAtRef.current(
              Math.max(0, Math.min(chartPlotW - 1, panStartPoint.current.x + g.dx)),
              Math.max(0, Math.min(chartPlotH, panStartPoint.current.y + g.dy))
            );
            return;
          }
          if (Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4) panMoved.current = true;
          applyChartDrag(g.dx, g.dy);
        },
        // أثناء التتبّع لا يُسلَّم الإصبع لتمرير الصفحة الأب — وإلا قطع سحبٌ رأسي التتبّع.
        onPanResponderTerminationRequest: () => !scrubbing.current && !pinchUsed.current,
        onPanResponderRelease: () => {
          if (scrubTimer.current) clearTimeout(scrubTimer.current);
          scrubTimer.current = null;
          // بعد التتبّع يبقى التقاطع حيث رُفع الإصبع؛ النقرة العادية كما كانت.
          if (!panMoved.current && !scrubbing.current) {
            chartPressRef.current(panStartPoint.current.x, panStartPoint.current.y);
          }
          scrubbing.current = false;
          pinchStart.current = null;
          pinchUsed.current = false;
          endDrag();
        },
        onPanResponderTerminate: () => {
          if (scrubTimer.current) clearTimeout(scrubTimer.current);
          scrubTimer.current = null;
          scrubbing.current = false;
          panMoved.current = false;
          pinchStart.current = null;
          pinchUsed.current = false;
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
      beginPinch,
      movePinch,
    ]
  );
  useEffect(
    () => () => {
      if (scrubTimer.current) clearTimeout(scrubTimer.current);
    },
    []
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
          beginAxisDrag();
        },
        onPanResponderMove: (_, gesture) => {
          scalePriceByDrag(gesture.dy);
        },
        onPanResponderRelease: (_, gesture) => {
          if (Platform.OS !== 'web' && Math.hypot(gesture.dx, gesture.dy) < AXIS_TAP_SLOP) {
            axisTapped('price', { at: Date.now(), x: gesture.x0, y: gesture.y0 });
          }
          endDrag();
        },
        onPanResponderTerminate: () => endDrag(),
      }),
    [canPan, beginAxisDrag, endDrag, scalePriceByDrag, axisTapped]
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
          beginAxisDrag();
        },
        onPanResponderMove: (_, gesture) => {
          zoomTimeByDrag(gesture.dx);
        },
        onPanResponderRelease: (_, gesture) => {
          if (Platform.OS !== 'web' && Math.hypot(gesture.dx, gesture.dy) < AXIS_TAP_SLOP) {
            axisTapped('time', { at: Date.now(), x: gesture.x0, y: gesture.y0 });
          }
          endDrag();
        },
        onPanResponderTerminate: () => endDrag(),
      }),
    [canPan, beginAxisDrag, endDrag, zoomTimeByDrag, axisTapped]
  );

  // React Native Web forwards these browser pointer events to the host element.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webChartHandlers: any =
    Platform.OS === 'web'
      ? ({
          onPointerDown: (event: PointerEventLike) => {
            event.preventDefault?.();
            const point = pointerXY(event);
            // لا سحب جارٍ ⇒ لا مؤشّر مضغوط: رفعٌ فات الحدث (خروج النافذة) لا يترك قرصاً وهمياً.
            if (!webChartPointer.current.active) webPointers.current.clear();
            webPointers.current.set(point.pointerId, point.x);
            // إصبع ثانٍ على شاشة لمس ⇒ قرص. كان يستبدل مؤشّر السحب الأوّل، فيُقاس
            // الإصبعان كلاهما من أصل الثاني ويقفز الشارت؛ و`touchAction: none` يمنع تكبير
            // المتصفّح، فلم يكن بالويب على الهاتف أيّ تكبير إطلاقاً.
            if (webChartPointer.current.active && webPointers.current.size >= 2) {
              event.currentTarget?.setPointerCapture?.(point.pointerId);
              const [a, b] = [...webPointers.current.values()];
              const rect = event.currentTarget?.getBoundingClientRect?.();
              beginPinch(a, b, rect?.left ?? 0);
              return;
            }
            pinchStart.current = null;
            pinchUsed.current = false;
            webChartPointer.current = {
              active: true,
              x: point.x,
              y: point.y,
              pointerId: point.pointerId,
            };
            event.currentTarget?.setPointerCapture?.(point.pointerId);
            webKeyChart = keyToken.current;
            beginDrag();
            // `clientX/Y` إحداثيات النافذة؛ `onChartPress` تريدها داخل اللوح.
            const rect = event.currentTarget?.getBoundingClientRect?.();
            panStartPoint.current = {
              x: point.x - (rect?.left ?? 0),
              y: point.y - (rect?.top ?? 0),
            };
          },
          onPointerMove: (event: PointerEventLike) => {
            if (!webChartPointer.current.active) {
              // مرور الفأرة بلا زرّ مضغوط ⇒ معاينة التقاطع (شمعة وسعر) ما لم يكن مثبَّتاً بنقرة.
              // كان التقاطع على الويب بالنقر وحده: قراءة عشر شموع = عشر نقرات. إطار واحد لكل
              // رسم (`requestAnimationFrame`) لا رسم لكل حدث حركة.
              if (crossPinned.current || event.nativeEvent?.pointerType === 'touch') return;
              const rect = event.currentTarget?.getBoundingClientRect?.();
              const point = pointerXY(event);
              hoverPoint.current = {
                x: Math.max(0, point.x - (rect?.left ?? 0)),
                y: Math.max(0, point.y - (rect?.top ?? 0)),
              };
              if (hoverRaf.current == null) {
                hoverRaf.current = requestAnimationFrame(() => {
                  hoverRaf.current = null;
                  if (crossPinned.current || webChartPointer.current.active) return;
                  crossAtRef.current(hoverPoint.current.x, hoverPoint.current.y, true);
                });
              }
              return;
            }
            event.preventDefault?.();
            const point = pointerXY(event);
            if (webPointers.current.has(point.pointerId)) webPointers.current.set(point.pointerId, point.x);
            if (pinchStart.current && webPointers.current.size >= 2) {
              const [a, b] = [...webPointers.current.values()];
              movePinch(a, b);
              return;
            }
            // رُفع أحد الإصبعين: الباقي لا يسحب حتى يُرفع.
            if (pinchUsed.current || point.pointerId !== webChartPointer.current.pointerId) return;
            applyChartDrag(
              point.x - webChartPointer.current.x,
              point.y - webChartPointer.current.y
            );
          },
          onPointerUp: (event: PointerEventLike) => {
            const point = pointerXY(event);
            webPointers.current.delete(point.pointerId);
            if (pinchUsed.current) {
              event.currentTarget?.releasePointerCapture?.(point.pointerId);
              pinchStart.current = null;
              if (webPointers.current.size > 0) return;
              pinchUsed.current = false;
              webChartPointer.current.active = false;
              endDrag();
              return;
            }
            const wasActive = webChartPointer.current.active;
            webChartPointer.current.active = false;
            event.currentTarget?.releasePointerCapture?.(point.pointerId);
            // نقرة بلا سحب ⇒ تقاطع عند موضعها (كمسار الهاتف). كان الرفع يُنهي السحب
            // فقط، فالنقر على شارت الويب لا يضع تقاطعاً أبداً.
            if (
              wasActive &&
              Math.hypot(point.x - webChartPointer.current.x, point.y - webChartPointer.current.y) <= 4
            ) {
              chartPressRef.current(panStartPoint.current.x, panStartPoint.current.y);
            }
            endDrag();
          },
          onPointerCancel: (event: PointerEventLike) => {
            webPointers.current.delete(pointerXY(event).pointerId);
            if (webPointers.current.size > 0) return;
            pinchStart.current = null;
            pinchUsed.current = false;
            webChartPointer.current.active = false;
            endDrag();
          },
          // خروج الفأرة من اللوح يمسح المعاينة؛ التقاطع المثبَّت يبقى (زرّ 🔔 خارج اللوح).
          onPointerLeave: () => {
            if (hoverRaf.current != null) cancelAnimationFrame(hoverRaf.current);
            hoverRaf.current = null;
            if (!crossPinned.current && !webChartPointer.current.active) setCross(null);
          },
        } as const)
      : {};

  // Esc على الويب يفكّ تثبيت التقاطع ويمسحه فتعود المعاينة مع حركة الفأرة. و←/→ تنقل
  // التقاطع المثبَّت شمعةً شمعة (السعر المثبَّت كما هو) — قراءة شموع متتالية بدقّة لا تبلغها
  // الفأرة على شموع بعرض 3px. عند حافّة النافذة تُزاح شمعةً ويتابع التقاطع (`stepCrossBar`)؛
  // بالإعادة وبالتابع المتزامن النافذة ليست ملكه فيقف عند حافّتها. ولا تسرق الأسهم من خانة كتابة.
  useEffect(() => {
    if (Platform.OS !== 'web' || !canPan) return;
    const onKey = (event: KeyboardEvent) => {
      if (!crossPinned.current || webKeyChart !== keyToken.current) return;
      if (event.key === 'Escape') {
        crossPinned.current = false;
        setCross(null);
        return;
      }
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const target = event.target as { tagName?: string; isContentEditable?: boolean } | null;
      if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? '')) return;
      const plot = sourceRef.current.plot as { time: number }[];
      const step = event.key === 'ArrowRight' ? 1 : -1;
      event.preventDefault();
      if (!replayOn && !syncFollow) {
        const time = crossTimeRef.current;
        if (time == null) return;
        const moved = stepCrossBar(
          sourceRef.current.all as { time: number }[],
          offsetRef.current,
          windowCountRef.current,
          time,
          step
        );
        if (!moved) return;
        if (moved.offset !== offsetRef.current) {
          offsetRef.current = moved.offset;
          setOffset(moved.offset);
          schedulePublishSync(false);
        }
        setCross((prev) => (prev ? { ...prev, time: moved.time } : prev));
        return;
      }
      setCross((prev) => {
        if (!prev) return prev;
        const i = indexOfBarTime(plot, prev.time);
        if (i == null) return prev;
        const next = plot[Math.max(0, Math.min(plot.length - 1, i + step))];
        return next && next.time !== prev.time ? { ...prev, time: next.time } : prev;
      });
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (hoverRaf.current != null) cancelAnimationFrame(hoverRaf.current);
    };
  }, [canPan, replayOn, syncFollow, schedulePublishSync]);

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
              x: point.x,
              y: point.y,
              pointerId: point.pointerId,
            };
            beginAxisDrag();
            event.currentTarget?.setPointerCapture?.(point.pointerId);
          },
          onPointerMove: (event: PointerEventLike) => {
            if (!webPricePointer.current.active) return;
            event.preventDefault?.();
            event.stopPropagation?.();
            const point = pointerXY(event);
            scalePriceByDrag(point.y - webPricePointer.current.y);
          },
          onPointerUp: (event: PointerEventLike) => {
            const point = pointerXY(event);
            const start = webPricePointer.current;
            if (start.active && Math.hypot(point.x - start.x, point.y - start.y) < AXIS_TAP_SLOP) {
              axisTapped('price', { at: Date.now(), x: point.x, y: point.y });
            }
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
              y: point.y,
              pointerId: point.pointerId,
            };
            beginAxisDrag();
            event.currentTarget?.setPointerCapture?.(point.pointerId);
          },
          onPointerMove: (event: PointerEventLike) => {
            if (!webTimePointer.current.active) return;
            event.preventDefault?.();
            event.stopPropagation?.();
            const point = pointerXY(event);
            zoomTimeByDrag(point.x - webTimePointer.current.x);
          },
          onPointerUp: (event: PointerEventLike) => {
            const point = pointerXY(event);
            const start = webTimePointer.current;
            if (start.active && Math.hypot(point.x - start.x, point.y - start.y) < AXIS_TAP_SLOP) {
              axisTapped('time', { at: Date.now(), x: point.x, y: point.y });
            }
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
        // فوق محور الزمن: الطرف الأيمن مثبَّت دائماً (الإزاحة كما هي) — بعدّ `zoomWindow` نفسه
        // (شمعة على الأقلّ لكل حزّة، فلا تضيع حزّات العجلة الصغيرة بنافذة ضيّقة). كان يغيّر
        // `windowCount` وحده بلا `windowCountRef`، فالنشر للرباعي يرسل العدد القديم والتوابع تتأخّر حزّة.
        const current = windowCountRef.current;
        const z = zoomWindow(sourceRef.current.all.length, current, 0, factor);
        if (z.count === current) return;
        windowCountRef.current = z.count;
        setWindowCount(z.count);
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
      name: tr.mcTemplateDefaultName,
      kind,
      lens,
      indicators: extraInd,
      pineFormula,
      logScale,
      magnet,
    }).then(() => {
      const err = getTemplatesSaveError();
      Alert.alert('MATRIX', err ? tr[err] : tr.mcTemplateSaved);
    });
  };

  // فهرس شمعة التقاطع داخل النافذة الحاليّة — يُحلّ من الزمن عند كل رسم، فالتقاطع
  // يتبع الشمعة عبر التيكات الحيّة وزرّي التكبير والتصغير، ويسقط من نفسه إن خرجت
  // الشمعة من النافذة أو بدّل المتداول الفريم/الرمز. رؤوس اللوحات تقرأ عنده.
  const crossIndex = cross ? indexOfBarTime(source.plot, cross.time) : null;
  const crossCandle = crossIndex != null ? source.plot[crossIndex] ?? null : null;
  // Recomputed every render so the crosshair and its axis tags stay glued to the
  // candle after zoom buttons / live ticks.
  const crossX = crossIndex != null && crossCandle ? xOf(crossIndex) : 0;
  // السعر المحفوظ لا الإغلاق: الخطّ يبقى على المستوى الذي لُمس عبر التكبير والإزاحة.
  const crossPrice = crossCandle ? cross?.price ?? null : null;
  const crossY = crossPrice != null ? yOf(crossPrice) : 0;

  // القياس الجاري (أثناء السحب) أو آخر قياس مكتمل — نصّ واحد لسطر القراءة ولوسم الشارت.
  const liveMeasure = tool === 'measure' && pending && dragEnd ? { a: pending, b: dragEnd } : null;
  const shownMeasure = liveMeasure ?? measureDone;
  const measureText = (m: { a: ChartPoint; b: ChartPoint }) =>
    measureReadoutText({
      symbol: series.symbol,
      a: m.a,
      b: m.b,
      stats: measureStats(m.a, m.b),
      barsWord: tr.mcMeasureBarsWord,
      lang,
      durationSec: measureDurationSec(m.a, m.b, timeframeStepSec(series.timeframe)),
      priceRef: priceDecimalsRef,
    });
  const measureReadout = measureDone ? measureText(measureDone) : null;
  // الرسم المحدَّد بطرفين يُقرأ كقياس بسطر القراءة («+24.0 pip · 12 شمعة · 3h») — كم قطع خطّ
  // الترند وبكم شمعة، وكم عرض المنطقة زمنياً، بلا إعادة رسمه بأداة القياس. كـTradingView.
  const selectedSpan = selectedId ? drawings.find((d) => d.id === selectedId) : undefined;
  const selectedSpanReadout =
    selectedSpan?.b &&
    (selectedSpan.tool === 'trend' ||
      selectedSpan.tool === 'ray' ||
      selectedSpan.tool === 'fib' ||
      selectedSpan.tool === 'rect' ||
      selectedSpan.tool === 'zone')
      ? measureText({ a: selectedSpan.a, b: selectedSpan.b })
      : null;

  const visibleDrawings = drawings
    .map((d) => {
      const aLocal = d.a.index - source.start;
      const bLocal = d.b ? d.b.index - source.start : aLocal;
      return { d, aLocal, bLocal };
    })
    // الخطّ الأفقي وفيبو بعرض الشارت كلّه: موضع مرساتهما لا يحدّد ظهورهما. كان خطّ دعم
    // مرسوم عند قاع قبل 120 شمعة يختفي (ووسم سعره) بمجرّد العودة للحيّ، ويبقى قابلاً للتحديد.
    .filter(
      ({ d, aLocal, bLocal }) =>
        d.tool === 'hline' || d.tool === 'fib' || aLocal >= -2 || bLocal >= -2
    );

  /**
   * أي الخطوط الأفقية يحمل وسم سعره. الخطّ الأفقي هو أداة الدعم/المقاومة الأولى عند
   * متداول التجزئة، وكان يُرسم **بلا سعر إطلاقاً**: ثلاثة خطوط على الشارت ولا سبيل
   * لمعرفة أيّها عند 1.0850 إلا بجرّ التقاطع إلى كل واحد. والوسوم تُنقّى بـ`thinByGap`
   * لأن خطّين متقاربين (وهو الشائع: حدّا منطقة واحدة) يضعان وسميهما فوق بعضهما.
   * الأهمية بالسعر الأعلى أولاً — ترتيب ثابت لا يتبدّل بترتيب الرسم.
   *
   * تُحسب عند كل رسم بلا `useMemo` عن قصد: `visibleDrawings` مصفوفة جديدة بكل إطار
   * (ومواضع `yOf` تتبدّل بالتكبير والإزاحة والتيك الحيّ)، فالتذكير كان سيعيد الحساب
   * دائماً ويضيف وهم استقرار. والخطوط الأفقية قليلة بطبيعتها.
   */
  const hlinePriceLabels = new Set(
    thinByGap(
      visibleDrawings.filter(({ d }) => d.tool === 'hline'),
      ({ d }) => yOf(d.a.price),
      ({ d }) => -d.a.price,
      HLINE_LABEL_GAP
    ).map(({ d }) => d.id)
  );

  /**
   * وسوم الخطّ الأفقي وفيبو والارتكاز كلّها على الحافّة اليسرى (`left: 4`) وكانت تُنقّى كلّ
   * مجموعة على حدة: خطّ دعم عند 1.08500 وPP عند 1.08497 ⇒ وسمان فوق بعضهما لا يُقرأ أيّهما.
   * الآن بالترتيب: خطّ المتداول أوّلاً (هو ما رسمه ليقرأه)، ثم فيبو بترتيب الرسم، ثم الارتكاز
   * — وكلّ مجموعة تتجنّب مواضع وسوم ما قبلها (`taken`). الخطوط نفسها تُرسم كلّها كما كانت.
   */
  const takenLabelYs: number[] = visibleDrawings
    .filter(({ d }) => d.tool === 'hline' && hlinePriceLabels.has(d.id))
    .map(({ d }) => yOf(d.a.price));
  const fibLabelPlans = new Map<string, FibLabelPlan[]>();
  for (const { d } of visibleDrawings) {
    if (d.tool !== 'fib' || !d.b) continue;
    const plan = planFibLabels({
      levels: FIB_DRAW_LEVELS,
      hi: Math.max(d.a.price, d.b.price),
      lo: Math.min(d.a.price, d.b.price),
      down: d.a.price > d.b.price,
      yOf,
      format: fmtPrice,
      minGapPx: FIB_LABEL_GAP,
      plotH: chartPlotH,
      taken: [...takenLabelYs],
    });
    fibLabelPlans.set(d.id, plan);
    for (const l of plan) takenLabelYs.push(l.y);
  }

  // خطوط الارتكاز من بداية الجلسة الجارية لا بعرض اللوح (`pivotSessionStartIndex`): داخل
  // اليوم وحده — على D فأكبر الجلسة شمعة واحدة، فتبقى بعرض اللوح كما كانت. `null` ⇒ بعرض اللوح.
  let pivotStartX: number | null = null;
  // بالإعادة الجلسة الجارية جلسة شمعة الإعادة.
  const lastAll = replayOn ? source.plot[source.plot.length - 1] : source.all[source.all.length - 1];
  if (pivotLevels.length && lastAll && timeframeStepSec(series.timeframe) < 86400) {
    const i = pivotSessionStartIndex(
      source.plot.map((b) => candleTimeSec(barTime(b))),
      candleTimeSec(barTime(lastAll)),
      series.symbol
    );
    if (i >= source.plot.length) pivotStartX = Infinity;
    else if (i > 0) pivotStartX = Math.max(0, (xOf(i - 1) + xOf(i)) / 2);
  }
  const sessionRuns =
    indicators.includes('sessions') && kind !== 'renko' && kind !== 'kagi' && kind !== 'pnf' && kind !== 'range'
      ? planSessionRuns(
          source.plot.map((b) => candleTimeSec(b.time)),
          timeframeStepSec(series.timeframe),
          chartPlotW
        )
      : [];
  // أقلّ من هذا بين بداية الخطّ وحافّة اللوح ⇒ الوسم يُثبَّت يمين اللوح لا يسار الخطّ. وسم
  // PDH/PDL أطول بـ«· +23.4 pip» (~70px) فيُثبَّت أبكر، وإلّا قُصّ البُعد تحت محور السعر.
  const pivotLabelAtEnd =
    pivotStartX != null && chartPlotW - pivotStartX < (indicators.includes('pdhl') ? 190 : 120);

  // يسار وسم الارتكاز: عند الحافّة (بعرض اللوح)، أو بعد بداية الجلسة، أو مثبَّتاً يميناً (تقدير
  // محافظ لعرضه). خارج حارة الحافّة اليسرى ⇒ لا يُنقّى مع وسوم الخطّ الأفقي وفيبو هناك.
  const pivotLabelLeft =
    pivotStartX == null
      ? 4
      : pivotLabelAtEnd
        ? chartPlotW - PRICE_AXIS_WIDTH - LEFT_LABEL_LANE_W
        : pivotStartX + 4;
  // وسوم الارتكاز: الظاهرة باللوح وحدها تتنافس على المكان (مستوى خارج اللوح لا يحجز وسماً).
  const pivotLabelKeys = new Set(
    thinByGap(
      pivotLevels.filter((lv) => {
        if (pivotStartX === Infinity) return false;
        const y = yOf(lv.price);
        return y >= 11 && y <= chartPlotH - 2;
      }),
      (lv) => yOf(lv.price),
      (lv) => pivotLabelRank(lv.label),
      HLINE_LABEL_GAP,
      inLeftLabelLane(pivotLabelLeft) ? takenLabelYs : []
    ).map((lv) => lv.key)
  );

  // عدد علامات السعر من ارتفاع اللوح لا رقماً ثابتاً: السبع الثابتة كانت تتباعد
  // 16.6px بلوح 100px (حدّه الأدنى عند فتح لوحات المؤشرات) وعلوّ النصّ 14px.
  // مدى القصّ `chartPlotH − 2` كي يطابق `maxStart` ما كانت الشاشة تقصّ عنده بالضبط.
  const priceTicks = axisTickRatios(
    axisTickCount(chartPlotH - 2, PRICE_LABEL_H, PRICE_LABEL_GAP, 7)
  )
    // مع الظلال: علامات السعر بجوار الحارة الأساسية وحدها — ما تحتها حارات بمدى آخر.
    .filter((ratio) => !shadowStack || ratio * chartPlotH <= shadowStack.primaryLane.height)
    .map((ratio) => ({ ratio, price: fromScale(priceFrame.max - ratio * priceFrame.span) }));
  const priceTickBoxes = layoutAxisLabels(
    priceTicks.map((t) => t.ratio * chartPlotH),
    PRICE_LABEL_H,
    PRICE_LABEL_GAP,
    chartPlotH - 2
  );
  // Renko/Kagi/P&F: زمن اللبنة مختلَق (أوّل شمعة + 60 ث لكل لبنة) — المحور والتقاطع كانا يطبعانه،
  // فـRenko الساعة يقرأ ساعات من الدقائق عند بداية السلسلة. يُطبع زمن شمعتها المصدر (`barTime`).
  const firstVisibleTime = source.plot[0] ? barTime(source.plot[0]) : 0;
  const lastVisible = source.plot[source.plot.length - 1];
  const lastVisibleTime = lastVisible ? barTime(lastVisible) : firstVisibleTime;
  const visibleTimeSpan = Math.abs(lastVisibleTime - firstVisibleTime);
  const dayCandles = timeframeStepSec(series.timeframe) >= 86400;
  const timeLabelW = chartPlotW < 200 ? 56 : chartPlotW < 280 ? 72 : 88;
  // العدد من عرض العلامة نفسها لا من عتبة مكتوبة: أربع علامات عرضها 88px تلزمها
  // 414px بعد القصّ، ولوح هاتف كبير ≈ 338px — فكانت الأولى والثانية تتراكبان.
  const timeTickIndexes = Array.from(
    new Set(
      axisTickRatios(axisTickCount(chartPlotW, timeLabelW, TIME_LABEL_GAP, 4)).map((ratio) =>
        Math.max(0, Math.round((source.plot.length - 1) * ratio))
      )
    )
  );
  // المواضع المرسومة نفسها: المراكز من `xOf` فتحمل إزاحة التمرير، والقصّ والإخفاء
  // من `layoutAxisLabels` — فلا يتباعد المفحوص عن المرسوم.
  const timeTickBoxes = layoutAxisLabels(
    timeTickIndexes.map((i) => xOf(i)),
    timeLabelW,
    TIME_LABEL_GAP,
    chartPlotW
  );
  const timeAxisHours = axisShowsHours(
    timeTickIndexes.map((i) => (source.plot[i] ? barTime(source.plot[i]) : Number.NaN)),
    visibleTimeSpan,
    dayCandles
  );
  // بلا تيك حيّ (السوق مغلق، أو قبل أوّل تيك): إغلاق **آخر شمعة بالسلسلة** لا آخر شمعة ظاهرة —
  // بعد الرجوع 50 شمعة كان الوسم والخطّ المتقطّع يقفزان لإغلاق قديم والرأس يقول غيره، وبـHeikin
  // يعرضان إغلاقاً متوسَّطاً لا السعر. بالإعادة وحدها: شمعة الإعادة هي «الآن».
  // `livePrice` يصل من المستدعي؛ الحاليّون يمرّرونه عبر `livePriceForChart` (محروس)، لكن تيكاً
  // خاماً — تيك الرمز الجديد فوق شموع القديم أثناء التبديل، أو صفراً من عطل مزوّد — كان يضع
  // الوسم والخطّ المتقطّع خارج المحور ويحسب بُعد التقاطع بالـpip منه. يُحرس هنا بالقاعدة نفسها.
  // وبالإعادة لا تيك إطلاقاً: كان التيك الحيّ يغلب شمعة الإعادة (`??`)، فوسم السعر وخطّه المتقطّع يكشفان
  // سعر اليوم فوق شموع الأسبوع الماضي، وبُعد التقاطع والخطوط الأفقية بالـpip يُقاس منه لا من «الآن» المُعاد.
  const liveTagPrice =
    !replayOn &&
    livePrice != null &&
    Number.isFinite(livePrice) &&
    livePrice > 0 &&
    tickPlausibleForSeries(series, livePrice)
      ? livePrice
      : null;
  const currentPrice =
    liveTagPrice ??
    (replayOn
      ? source.plot[source.plot.length - 1]?.close
      : liveSeries.candles[liveSeries.candles.length - 1]?.close) ??
    series.last;
  const currentPriceY = yOf(currentPrice);
  // الترند/الشعاع المحدَّد: سعره عند الشمعة الحيّة وبُعد السعر عنه («1.08520 · −6.2 pip») — يُلحق
  // بقراءته، فمنتظر الكسر يعرف كم بقي بلا جرّ التقاطع إلى الخطّ.
  // «الآن» بالإعادة خطوة الإعادة لا آخر شمعة بالسلسلة: وإلا يُقرأ الخطّ عند شمعة لم تُكشف بعد،
  // ويُقاس بُعده من سعر الإعادة (`currentPrice`) — رقم يخلط الماضي بالمستقبل.
  const nowIndex = replayOn ? source.start + source.plot.length - 1 : source.all.length - 1;
  const selectedLineNow = selectedSpan
    ? lineNowText(selectedSpan, nowIndex, currentPrice, series.symbol, fmtPrice)
    : null;
  const selectedSpanText =
    selectedSpanReadout && selectedLineNow
      ? `${selectedSpanReadout} | ${selectedLineNow}`
      : selectedSpanReadout;

  // الوسوم تُرسم **فوق** علامات المحور، وعرضها عرض المحور كلّه — فعلامة تقع تحت وسم
  // كانت تظهر شريحةً من أرقامها حول حافته: تشويش يُقرأ كرقم ثالث لا كرقم مقصوص.
  // ووسم التقاطع (فاتح) ووسم السعر الحيّ (فيروزيّ) يتكدّسان متى لمس المتداول شمعة
  // قرب السعر الحاليّ — وهي الحالة الأكثر وقوعاً لا الأندر. تُحسب مواضعها هنا مرّة
  // واحدة فالفحص والرسم يقرآن الرقم نفسه.
  // عدّاد إغلاق الشمعة سطرٌ ثانٍ تحت السعر (`barCountdown.ts`) — للفريمات الزمنية وحدها،
  // لا بالإعادة (الشمعة «الجارية» هناك تاريخ مُغلق) ولا حين يكون السعر خارج المدى المرئيّ.
  const lastRawBar = liveSeries.candles[liveSeries.candles.length - 1];
  const countdownStep = timeframeStepSec(series.timeframe);
  const countdownSynthetic =
    kind === 'renko' || kind === 'kagi' || kind === 'pnf' || kind === 'range';
  const countdownKey = lastRawBar ? `${series.symbol}|${countdownStep}|${lastRawBar.time}` : null;
  const showCountdown =
    !hidePriceLabels &&
    countdownKey !== countdownEndedKey &&
    !replayOn &&
    !countdownSynthetic &&
    lastRawBar != null &&
    offAxisSide(currentPriceY, chartPlotH) == null &&
    barCloseCountdown(lastRawBar.time, countdownStep, Date.now(), series.symbol) != null;
  const currentTagH = showCountdown ? PRICE_TAG_H + COUNTDOWN_LINE_H : PRICE_TAG_H;
  const currentTagTop = Math.max(0, Math.min(chartPlotH - currentTagH - 2, currentPriceY - 9));
  // بُعد التقاطع عن السعر الحالي بالـpip تحت سعره: «أين أضع الوقف/الهدف» كان يعني فتح أداة
  // القياس وسحبها من السعر إلى المستوى. الإشارة من السعر الحالي إلى التقاطع (+ فوقه، − تحته)،
  // وأداة بلا مواصفة pip (DXY، مؤشرات) تبقى بسطر السعر وحده.
  const crossPipsText =
    crossPrice != null && Number.isFinite(currentPrice)
      ? measurePipsText(series.symbol, currentPrice, crossPrice)
      : null;
  const crossTagH = crossPipsText ? PRICE_TAG_H + COUNTDOWN_LINE_H : PRICE_TAG_H;
  const crossTagTop = crossPrice != null
    ? Math.max(0, Math.min(chartPlotH - crossTagH - 2, crossY - 9))
    : null;
  // وسم السعر الحيّ هو ما يُخفى عند التكدّس: وسم التقاطع هو ما طلبه المتداول للتوّ،
  // وسعره على بُعد أقلّ من علوّ وسم واحد فلا يضيع شيء.
  const currentTagHidden =
    crossTagTop != null && boxesTouch(currentTagTop, currentTagH, crossTagTop, crossTagH, 0);
  // أسعار الرسم المحدَّد على المحور بلونه (`selectionTags.ts`) — تتبع الإصبع أثناء سحب طرفه.
  // وسم السعر الحيّ محجوز لا يُغطّى؛ وسم التقاطع يُرسم فوقها.
  const selectedDrawing = selectedId && !hidePriceLabels ? drawings.find((d) => d.id === selectedId) : undefined;
  const selectionTags = selectedDrawing
    ? placeSelectionTags(
        selectionPrices(selectedDrawing, series.symbol, nowIndex),
        yOf,
        chartPlotH,
        PRICE_TAG_H,
        currentTagHidden ? [] : [{ top: currentTagTop, h: currentTagH }]
      )
    : [];
  const priceTickUnderTag = (start: number) =>
    (!currentTagHidden &&
      boxesTouch(start, PRICE_LABEL_H, currentTagTop, currentTagH, TAG_CLEAR_GAP)) ||
    (crossTagTop != null &&
      boxesTouch(start, PRICE_LABEL_H, crossTagTop, crossTagH, TAG_CLEAR_GAP)) ||
    selectionTags.some((t) => boxesTouch(start, PRICE_LABEL_H, t.top, PRICE_TAG_H, TAG_CLEAR_GAP));
  const crossTimeTagLeft = crossCandle
    ? Math.max(0, Math.min(chartPlotW - CROSS_TIME_TAG_W, crossX - CROSS_TIME_TAG_W / 2))
    : null;
  // سعر خارج المدى المرئيّ (بعد تكبير محور السعر أو تحريكه): الوسم يُقصّ إلى الحافة
  // فيبدو كأن السوق هناك، وأعلى علامة تحته تقول رقماً آخر — ويُقَصّ الخطّ المتقطّع
  // خارج اللوح فلا يبقى ما يكذّبه. تُعلَّم الجهة بسهم، ولا يُرسم خطٌّ لا موضع له.
  const currentPriceOff = offAxisSide(currentPriceY, chartPlotH);
  const crossPriceOff = crossPrice != null ? offAxisSide(crossY, chartPlotH) : null;
  const offMark = (side: 'above' | 'below' | null) =>
    side === 'above' ? '▲ ' : side === 'below' ? '▼ ' : '';

  return (
    <View style={[styles.root, dense && styles.rootDense]}>
      {interactive && compactUi ? (
        <View style={styles.compactToolbar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.compactToolsRow}
          >
            {localizedDrawTools(tr).map((t) => (
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
            {/* حذف العنصر المحدَّد كان بالرصيف الكامل وحده، فبالواجهة المدمجة (الهاتف)
                لا سبيل لحذف رسم واحد إلا بمسح الكل. يظهر عند وجود تحديد فقط. */}
            {selectedId ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tr.deleteWord}
                style={({ pressed }) => [
                  styles.compactTool,
                  pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                ]}
                onPress={() => {
                  pushDrawHistory();
                  setDrawings((list) => list.filter((x) => x.id !== selectedId));
                  setSelectedId(null);
                }}
              >
                <Text style={[styles.compactToolIcon, { color: colors.bear }]}>✕</Text>
                <Text style={styles.compactToolLabel}>{tr.deleteWord}</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={canUndo ? tr.mcUndoA11y : tr.mcNothingToUndo}
              accessibilityState={{ disabled: !canUndo }}
              disabled={!canUndo}
              style={({ pressed }) => [
                styles.compactTool,
                !canUndo && styles.toolDisabled,
                pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
              ]}
              onPress={undoDrawing}
            >
              <Text style={styles.compactToolIcon}>↶</Text>
              <Text style={styles.compactToolLabel}>{tr.mcUndo}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.compactTool,
                pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
              ]}
              onPress={() => {
                Alert.alert(tr.mcClearAllTitle, chartExtraLabels(lang).clearAllBody, [
                  { text: tr.cancel, style: 'cancel' },
                  {
                    text: tr.mcClearWord,
                    style: 'destructive',
                    onPress: () => {
                      pushDrawHistory();
                      setDrawings([]);
                      setPending(null);
                      setSelectedId(null);
                      void clearDrawings(series.symbol, drawingsOwner);
                    },
                  },
                ]);
              }}
            >
              <Text style={styles.compactToolIcon}>⌫</Text>
              <Text style={styles.compactToolLabel}>{tr.mcClearWord}</Text>
            </Pressable>
          </ScrollView>
        </View>
      ) : interactive ? (
        <View style={styles.toolbar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {localizedChartKinds(tr).map((k) => (
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
            {localizedLenses(tr).map((l) => (
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
        <Text style={styles.drawingsSaveError}>{tr[drawingsSaveError]}</Text>
      ) : null}

      {!dense ? (
      <View style={styles.readout}>
        {measureReadout ? (
          <Text style={styles.readoutText}>{measureReadout}</Text>
        ) : crossCandle ? (
          <Text style={styles.readoutText}>
            O {fmtPrice(crossCandle.open)} H {fmtPrice(crossCandle.high)} L{' '}
            {fmtPrice(crossCandle.low)} C {fmtPrice(crossCandle.close)}
            {crossCandle.open > 0
              ? (() => {
                  // جسم الشمعة بالنسبة: شمعة دوجي كانت تُكتب «+0.00%» (الشرط `>=`)، وجسمٌ صاعد
                  // دون 0.005% يُكتب «+0.00%» **بالأخضر**. الآن `formatPct` كرأس الإطار، واللون
                  // من الرقم المطبوع نفسه فلا يخالف ما يُقرأ.
                  const bodyPct = ((crossCandle.close - crossCandle.open) / crossCandle.open) * 100;
                  const r = Math.round(bodyPct * 100) / 100;
                  return (
                    <Text
                      style={{
                        color: r > 0 ? colors.bull : r < 0 ? colors.bear : colors.textDim,
                        fontWeight: '800',
                      }}
                    >
                      {` ${formatPct(bodyPct)}`}
                    </Text>
                  );
                })()
              : null}
            {(() => {
              const range = candleRangePipsText(series.symbol, crossCandle.high, crossCandle.low);
              return range ? ` ${range}` : '';
            })()}
            {compareSeries ? ` · ${compareSeries.symbol} ${formatPrice(compareSeries.last, compareSeries.symbol)}` : ''}
          </Text>
        ) : selectedSpanReadout ? (
          <Text style={[styles.readoutText, selectedSpan ? { color: selectedSpan.color } : null]}>
            {selectedSpanText}
          </Text>
        ) : (
          <Text style={styles.readoutMuted}>
            {replayOn
              ? `Bar Replay · ${source.plot.length}/${source.windowLen}`
              : tool !== 'none'
                ? tr.mcHintDraw
                : tr.mcHintNavigate}
          </Text>
        )}
        {onCreateAlert && crossPrice != null && !crossHover && !measureReadout && !replayOn ? (
          // تنبيه بلمستين من الشارت: المس المستوى (يظهر الـcrosshair بسعر موضع اللمسة) ثم 🔔 — بلا كتابة رقم.
          // الاتجاه (فوق/تحت) يحدّده المستدعي من السعر الحالي، والتأكيد «مُفعَّل» يظهر عنده.
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${tr.mcAlertAtCrossA11y} ${fmtPrice(crossPrice)}`}
            hitSlop={6}
            style={({ pressed }) => [
              styles.crossAlertBtn,
              { borderColor: accent },
              pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
            ]}
            onPress={() => onCreateAlert(crossPrice, 'crosshair')}
          >
            <Text style={[styles.crossAlertText, { color: accent }]}>🔔 {fmtPrice(crossPrice)}</Text>
          </Pressable>
        ) : null}
        {interactive && !compactUi ? (
          <View style={styles.zoomRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr.mcZoomOutA11y}
              style={({ pressed }) => [
                styles.zoomBtn,
                pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
              ]}
              onPress={() => zoomAroundCenter(1.25)}
            >
              <Text style={styles.zoomText}>−</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr.mcZoomInA11y}
              style={({ pressed }) => [
                styles.zoomBtn,
                pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
              ]}
              onPress={() => zoomAroundCenter(0.8)}
            >
              <Text style={styles.zoomText}>+</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr.mcPanBackA11y}
              style={({ pressed }) => [
                styles.zoomBtn,
                pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
              ]}
              onPress={() => panByButton(15)}
            >
              <Text style={styles.zoomText}>‹</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr.mcPanForwardA11y}
              style={({ pressed }) => [
                styles.zoomBtn,
                pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
              ]}
              onPress={() => panByButton(-15)}
            >
              <Text style={styles.zoomText}>›</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr.mcReplayModeA11y}
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
                  accessibilityLabel={tr.mcReplayStepBackA11y}
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
                  accessibilityLabel={replayPlaying ? tr.mcReplayPauseA11y : tr.mcReplayPlayA11y}
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
                  accessibilityLabel={tr.mcReplayStepFwdA11y}
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
              accessibilityLabel={tr.mcMagnetA11y}
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

        {/* فواصل أيام التداول (17:00 نيويورك) على الفريمات داخل اليوم — راجع `dayBreaks.ts`.
            لا على Renko/Kagi/P&F/Range: خانتها ليست زمناً فالكثافة لا تُقدَّر بالفريم. */}
        {!hideGrid && kind !== 'renko' && kind !== 'kagi' && kind !== 'pnf' && kind !== 'range'
          ? planDayBreaks(
              source.plot.map((b) => candleTimeSec(b.time)),
              timeframeStepSec(series.timeframe),
              series.symbol,
              chartPlotW
            ).map((i) => {
              const x = (xOf(i - 1) + xOf(i)) / 2;
              if (!(x >= 0 && x <= chartPlotW)) return null;
              return (
                <View
                  key={`dbrk${i}`}
                  pointerEvents="none"
                  style={[styles.dayBreak, { left: x, height: chartPlotH }]}
                />
              );
            })
          : null}

        {/* جلسات طوكيو/لندن/نيويورك (مؤشّر «Sessions»): تظليل خافت بعرض الجلسة وشريط رفيع
            بلونها أسفل اللوح مع اسمها (أعلاه لمفتاح المؤشّرات) — راجع `sessions.ts`. داخل اليوم حتى 1H، وليس على
            Renko/Kagi/P&F/Range (خانتها ليست زمناً). كل شريحة تحمل اسمها ⇒ لا مدخل بالمفتاح. */}
        {sessionRuns.map((run) => {
          const slot = chartPlotW / Math.max(1, source.plot.length);
          const left = Math.max(0, xOf(run.from) - slot / 2);
          const right = Math.min(chartPlotW, xOf(run.to) + slot / 2);
          if (!(right - left >= 1)) return null;
          const color = SESSION_COLOR[run.id];
          return (
            <View
              key={`ses${run.id}${run.from}`}
              pointerEvents="none"
              style={[styles.sessionBand, { left, width: right - left, height: chartPlotH, backgroundColor: `${color}0F` }]}
            >
              <View style={[styles.sessionStrip, { backgroundColor: color }]} />
              {right - left >= 44 ? (
                <Text style={[styles.sessionLabel, { color }]} numberOfLines={1}>
                  {SESSION_LABEL[run.id]}
                  {/* مدى الجلسة (أعلى − أدنى) بالـpip: نطاق آسيا الضيّق الذي يُكسر بلندن، وحركة
                      لندن مقابل متوسّطها — بحقيقي الشموع لا هايكن آشي. متى اتّسعت الشريحة. */}
                  {right - left >= 110
                    ? (() => {
                        let hi = -Infinity;
                        let lo = Infinity;
                        for (let i = run.from; i <= run.to; i++) {
                          const c = liveSeries.candles[source.start + i] ?? source.plot[i];
                          if (!c) continue;
                          hi = Math.max(hi, c.high);
                          lo = Math.min(lo, c.low);
                        }
                        const range = candleRangePipsText(series.symbol, hi, lo);
                        return range ? ` ${range}` : null;
                      })()
                    : null}
                </Text>
              ) : null}
            </View>
          );
        })}

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
            <Text style={{ color: colors.accent, fontSize: 10, fontWeight: '800' }}>{tr.mcPrimaryLane}</Text>
          </View>
        ) : null}

        {/* مفتاح ألوان طبقات السعر: أيّ خطّ منقّط هو أيّ مؤشّر. بدونه تقاطع متوسطَين
            إشارةٌ لا تُقرأ أصلاً — ثلاثة ألوان بلا أسماء. pointerEvents="none" فلا
            يعترض السحب ولا الرسم، ويُزاح لأسفل عند وجود شارة الطبقة الأساسية. */}
        {priceLegend.chips.length > 0 || priceLegend.more > 0 ? (
          <View
            pointerEvents="none"
            style={[styles.priceLegend, { top: shadowStack ? 24 : 4 }]}
          >
            {priceLegend.chips.map((chip) => (
              <View key={chip.id} style={styles.priceLegendChip}>
                {chip.swatch.map((expr, si) => (
                  <View
                    key={si}
                    style={[
                      styles.priceLegendSwatch,
                      { backgroundColor: resolveColorExpr(expr, legendTokens) },
                    ]}
                  />
                ))}
                <Text style={styles.priceLegendText}>{chip.label}</Text>
              </View>
            ))}
            {priceLegend.more > 0 ? (
              <Text style={styles.priceLegendMore}>{`+${priceLegend.more}`}</Text>
            ) : null}
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
            // مع الظلال والتكبير الرأسي: شمعة خارج حارتها كلّها لا تُرسم فوق حارات الظلال.
            if (
              shadowStack &&
              (top >= shadowStack.primaryLane.height || top + wickH <= 0)
            ) {
              return null;
            }
            const bodyH = Math.max(2, bodyBot - bodyTop);
            // وشمعة على حدّ الحارة تُقصّ عنده: كان ذيلها/جسمها يمتدّ فوق أولى حارات الظلال.
            // بلا ظلال الحدّان لانهائيان فالهندسة كما هي.
            const laneTop = shadowStack ? 0 : -Infinity;
            const laneBot = shadowStack ? shadowStack.primaryLane.height : Infinity;
            const wickTop = Math.max(laneTop, top);
            const wickClipH = Math.min(laneBot, top + wickH) - wickTop;
            const bodyClipTop = Math.max(laneTop, bodyTop);
            const bodyClipH = Math.min(laneBot, bodyTop + bodyH) - bodyClipTop;
            const inLane = (y: number) => y >= laneTop && y + 2 <= laneBot;
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
                      top: wickTop,
                      width: 1.5,
                      height: wickClipH,
                      backgroundColor: color,
                    }}
                  />
                  {inLane(yP(c.open)) ? (
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
                  ) : null}
                  {inLane(yP(c.close)) ? (
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
                  ) : null}
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
                    top: wickTop,
                    width: 1,
                    height: wickClipH,
                    backgroundColor: color,
                    opacity: 0.9,
                  }}
                />
                {bodyClipH > 0 ? (
                  <View
                    style={{
                      position: 'absolute',
                      left: (primaryColW - primaryBodyW) / 2,
                      top: bodyClipTop,
                      width: primaryBodyW,
                      height: bodyClipH,
                      backgroundColor: kind === 'hollow' && bull ? 'transparent' : color,
                      borderWidth: kind === 'hollow' ? 1.5 : 0,
                      borderColor: color,
                      borderRadius: 1,
                    }}
                  />
                ) : null}
              </View>
            );
          })}

        {/* أعلى قمّة وأدنى قاع بالنافذة المرئيّة بسعرهما (راجع `hiLoLabels.ts`). للشموع والأعمدة
            فقط: قمم Heikin/Renko/Kagi/P&F مشتقّة لا أسعار تداول حقيقية. */}
        {!hidePriceLabels && (kind === 'candles' || kind === 'hollow' || kind === 'bars')
          ? (() => {
              const plan = planHiLoLabels(source.plot, xOf, chartPlotW, chartPlotH);
              if (!plan) return null;
              const yP = hasShadows ? yPrimary : yOf;
              const laneBot = shadowStack ? shadowStack.primaryLane.height : chartPlotH;
              return (['high', 'low'] as const).map((which) => {
                const m = plan[which];
                const y = yP(m.price);
                if (!(y >= 0 && y <= laneBot)) return null;
                const text = fmtPrice(m.price);
                const w = text.length * 5.6 + 12;
                const x = xOf(m.index);
                const top = Math.max(0, Math.min(laneBot - HILO_LABEL_H, y - HILO_LABEL_H / 2));
                return (
                  <View
                    key={`hilo-${which}`}
                    pointerEvents="none"
                    style={[
                      styles.hiLoLabel,
                      {
                        top,
                        left: m.leftSide ? x - primaryColW / 2 - 2 - w : x + primaryColW / 2 + 2,
                        width: w,
                        flexDirection: m.leftSide ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <View style={styles.hiLoLeader} />
                    <Text style={styles.hiLoText}>{text}</Text>
                  </View>
                );
              });
            })()
          : null}

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

        {/* طبقات السعر: الثلاثة الشائعة (SMA20/SMA50/EMA21) قطعاً متّصلة، والباقي نقاطاً */}
        {indicators.includes('sma20') &&
          planLineSegments(overlays.sma20, xOf, yOf).map((sg) => (
            <View
              key={`s20${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#FBBF24',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('sma50') &&
          planLineSegments(overlays.sma50, xOf, yOf).map((sg) => (
            <View
              key={`s50${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: colors.infoAccent,
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('ema21') &&
          planLineSegments(overlays.ema21, xOf, yOf).map((sg) => (
            <View
              key={`e21${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: accent,
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('wma20') &&
          planLineSegments(overlays.wma20, xOf, yOf).map((sg) => (
            <View
              key={`w20${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#F472B6',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('dema20') &&
          planLineSegments(overlays.dema20, xOf, yOf).map((sg) => (
            <View
              key={`d20${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#34D399',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('tema20') &&
          planLineSegments(overlays.tema20, xOf, yOf).map((sg) => (
            <View
              key={`t20${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#FB923C',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('hma20') &&
          planLineSegments(overlays.hma20, xOf, yOf).map((sg) => (
            <View
              key={`h20${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#818CF8',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('vwap') &&
          vwap &&
          planLineSegments(vwap, xOf, yOf, {
            // لا قطعة مائلة من VWAP أمس إلى أوّل قيمة اليوم — الخطّ ينقطع عند التصفير كـTradingView
            breakBetween: vwapSessionBreak,
          }).map((sg) => (
            <View
              key={`vw${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: colors.white,
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('vwapBands') &&
          vwapBands &&
          planBandStrips(vwapBands.upper, vwapBands.lower, xOf, yOf, bandW).map((bnd) => (
            <View
              key={`vwb${bnd.at}`}
              style={{
                position: 'absolute',
                left: bnd.left,
                top: bnd.top,
                width: bnd.width,
                height: bnd.height,
                backgroundColor: 'rgba(234,179,8,0.14)',
              }}
            />
          ))}
        {indicators.includes('twap') &&
          twap &&
          planLineSegments(twap, xOf, yOf, { breakBetween: vwapSessionBreak }).map((sg) => (
            <View
              key={`tw${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#BAE6FD',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
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
          planLineSegments(gannHiLo, xOf, yOf).map((sg) => (
            <View
              key={`ghl${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#FCD34D',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
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
          planLineSegments(medianPrice, xOf, yOf).map((sg) => (
            <View
              key={`mp${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#94A3B8',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('typicalPrice') &&
          typicalPrice &&
          planLineSegments(typicalPrice, xOf, yOf).map((sg) => (
            <View
              key={`tp${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#FDE68A',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('weightedClose') &&
          weightedClose &&
          planLineSegments(weightedClose, xOf, yOf).map((sg) => (
            <View
              key={`wc${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#FCA5A5',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('avgPrice') &&
          avgPrice &&
          planLineSegments(avgPrice, xOf, yOf).map((sg) => (
            <View
              key={`avgp${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#C4B5FD',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('dma') &&
          dma &&
          planLineSegments(dma, xOf, yOf).map((sg) => (
            <View
              key={`dma${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#C7D2FE',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('trima') &&
          trima &&
          planLineSegments(trima, xOf, yOf).map((sg) => (
            <View
              key={`trima${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#D9F99D',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('mcginley') &&
          mcginley &&
          planLineSegments(mcginley, xOf, yOf).map((sg) => (
            <View
              key={`mg${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#5EEAD4',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('lsma') &&
          lsma &&
          planLineSegments(lsma, xOf, yOf).map((sg) => (
            <View
              key={`lsma${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#22D3EE',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('tsf') &&
          tsf &&
          planLineSegments(tsf, xOf, yOf).map((sg) => (
            <View
              key={`tsf${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#A5B4FC',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('vwma') &&
          vwma &&
          planLineSegments(vwma, xOf, yOf).map((sg) => (
            <View
              key={`vwma${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#FACC15',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('alma') &&
          alma &&
          planLineSegments(alma, xOf, yOf).map((sg) => (
            <View
              key={`alma${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#E879F9',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('t3') &&
          t3 &&
          planLineSegments(t3, xOf, yOf).map((sg) => (
            <View
              key={`t3${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#0EA5E9',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('vidya') &&
          vidya &&
          planLineSegments(vidya, xOf, yOf).map((sg) => (
            <View
              key={`vidya${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#FDA4AF',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('smma20') &&
          smma20 &&
          planLineSegments(smma20, xOf, yOf).map((sg) => (
            <View
              key={`smma20_${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#F97316',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('kama') &&
          kama &&
          planLineSegments(kama, xOf, yOf).map((sg) => (
            <View
              key={`kama${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#67E8F9',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('frama') &&
          frama &&
          planLineSegments(frama, xOf, yOf).map((sg) => (
            <View
              key={`frama${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#7DD3FC',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('zlema') &&
          zlema &&
          planLineSegments(zlema, xOf, yOf).map((sg) => (
            <View
              key={`zl${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#FDBA74',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('gmma') &&
          gmma &&
          gmma.shortLines.map((line, li) =>
            planLineSegments(line, xOf, yOf).map((sg) => (
              <View
                key={`gmmaS${li}_${sg.at}`}
                style={{
                  position: 'absolute',
                  left: sg.left,
                  top: sg.top - 1,
                  width: sg.len,
                  height: 2,
                  backgroundColor: '#6EE7B7',
                  transform: [{ rotate: `${sg.deg}deg` }],
                  transformOrigin: 'left center',
                }}
              />
            ))
          )}
        {indicators.includes('gmma') &&
          gmma &&
          gmma.longLines.map((line, li) =>
            planLineSegments(line, xOf, yOf).map((sg) => (
              <View
                key={`gmmaL${li}_${sg.at}`}
                style={{
                  position: 'absolute',
                  left: sg.left,
                  top: sg.top - 1,
                  width: sg.len,
                  height: 2,
                  backgroundColor: '#93C5FD',
                  transform: [{ rotate: `${sg.deg}deg` }],
                  transformOrigin: 'left center',
                }}
              />
            ))
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
                      backgroundColor: '#D946EF',
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
          planLineSegments(supertrend.value, xOf, yOf, {
            // الانقلاب **نهاية مقطع**: وصل الوقف من تحت السعر إلى فوقه يرسم عموداً
            // يمرّ بكل سعر بينهما، وهو يقول «كان وقفك هنا» ولم يكن بأيٍّ منها قطّ.
            breakBetween: (i) => supertrend.up[i] !== supertrend.up[i - 1],
          }).map((sg) => (
            <View
              key={`st${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                // `sg.at` فهرس الطرف الثاني ⇒ القطعة بلون الاتجاه الذي وصلت إليه.
                backgroundColor: supertrend.up[sg.at] ? colors.bull : colors.bear,
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('bb') && (
          <>
            {planBandStrips(
              overlays.bbUpper,
              overlays.bbLower,
              xOf,
              yOf,
              bandW
            ).map((bnd) => (
              <View
                key={`bb${bnd.at}`}
                style={{
                  position: 'absolute',
                  left: bnd.left,
                  top: bnd.top,
                  width: bnd.width,
                  height: bnd.height,
                  backgroundColor: 'rgba(56,189,248,0.18)',
                  borderTopWidth: 1,
                  borderBottomWidth: 1,
                  borderColor: 'rgba(56,189,248,0.7)',
                }}
              />
            ))}
            {planLineSegments(overlays.bbMid, xOf, yOf).map((sg) => (
              <View
                key={`bbm${sg.at}`}
                style={{
                  position: 'absolute',
                  left: sg.left,
                  top: sg.top - 1,
                  width: sg.len,
                  height: 2,
                  backgroundColor: 'rgba(56,189,248,0.55)',
                  transform: [{ rotate: `${sg.deg}deg` }],
                  transformOrigin: 'left center',
                }}
              />
            ))}
          </>
        )}
        {indicators.includes('keltner') &&
          keltner &&
          planBandStrips(keltner.upper, keltner.lower, xOf, yOf, bandW).map((bnd) => (
            <View
              key={`kc${bnd.at}`}
              style={{
                position: 'absolute',
                left: bnd.left,
                top: bnd.top,
                width: bnd.width,
                height: bnd.height,
                backgroundColor: 'rgba(216,180,254,0.18)',
              }}
            />
          ))}
        {indicators.includes('starcBands') &&
          starcBands &&
          planBandStrips(starcBands.upper, starcBands.lower, xOf, yOf, bandW).map((bnd) => (
            <View
              key={`starc${bnd.at}`}
              style={{
                position: 'absolute',
                left: bnd.left,
                top: bnd.top,
                width: bnd.width,
                height: bnd.height,
                backgroundColor: 'rgba(249,168,212,0.14)',
              }}
            />
          ))}
        {indicators.includes('linRegChannel') &&
          linRegChannel &&
          planBandStrips(linRegChannel.upper, linRegChannel.lower, xOf, yOf, bandW).map((bnd) => (
            <View
              key={`lrc${bnd.at}`}
              style={{
                position: 'absolute',
                left: bnd.left,
                top: bnd.top,
                width: bnd.width,
                height: bnd.height,
                backgroundColor: 'rgba(191,219,254,0.14)',
              }}
            />
          ))}
        {indicators.includes('stdErrorBands') &&
          stdErrorBands &&
          planBandStrips(stdErrorBands.upper, stdErrorBands.lower, xOf, yOf, bandW).map((bnd) => (
            <View
              key={`seb${bnd.at}`}
              style={{
                position: 'absolute',
                left: bnd.left,
                top: bnd.top,
                width: bnd.width,
                height: bnd.height,
                backgroundColor: 'rgba(190,242,100,0.14)',
              }}
            />
          ))}
        {indicators.includes('envelopes') &&
          envelopes &&
          planBandStrips(envelopes.upper, envelopes.lower, xOf, yOf, bandW).map((bnd) => (
            <View
              key={`env${bnd.at}`}
              style={{
                position: 'absolute',
                left: bnd.left,
                top: bnd.top,
                width: bnd.width,
                height: bnd.height,
                backgroundColor: 'rgba(245,158,11,0.14)',
              }}
            />
          ))}
        {indicators.includes('accelBands') &&
          accelBands &&
          planBandStrips(accelBands.upper, accelBands.lower, xOf, yOf, bandW).map((bnd) => (
            <View
              key={`acb${bnd.at}`}
              style={{
                position: 'absolute',
                left: bnd.left,
                top: bnd.top,
                width: bnd.width,
                height: bnd.height,
                backgroundColor: 'rgba(254,215,170,0.14)',
              }}
            />
          ))}
        {indicators.includes('donchian') &&
          donchian &&
          planBandStrips(donchian.upper, donchian.lower, xOf, yOf, bandW).map((bnd) => (
            <View
              key={`dc${bnd.at}`}
              style={{
                position: 'absolute',
                left: bnd.left,
                top: bnd.top,
                width: bnd.width,
                height: bnd.height,
                backgroundColor: 'rgba(163,180,208,0.14)',
              }}
            />
          ))}
        {indicators.includes('fractalChaosBands') &&
          fractalChaosBands &&
          planBandStrips(fractalChaosBands.upper, fractalChaosBands.lower, xOf, yOf, bandW).map((bnd) => (
            <View
              key={`fcb${bnd.at}`}
              style={{
                position: 'absolute',
                left: bnd.left,
                top: bnd.top,
                width: bnd.width,
                height: bnd.height,
                backgroundColor: 'rgba(240,171,252,0.14)',
              }}
            />
          ))}
        {indicators.includes('chandeKroll') &&
          chandeKroll &&
          planBandStrips(
            chandeKroll.shortStop,
            chandeKroll.longStop,
            xOf,
            yOf,
            bandW
          ).map((bnd) => (
            <View
              key={`ck${bnd.at}`}
              style={{
                position: 'absolute',
                left: bnd.left,
                top: bnd.top,
                width: bnd.width,
                height: bnd.height,
                backgroundColor: 'rgba(153,246,228,0.16)',
              }}
            />
          ))}
        {indicators.includes('chandelierExit') &&
          chandelierExit &&
          planBandStrips(
            chandelierExit.longStop,
            chandelierExit.shortStop,
            xOf,
            yOf,
            bandW
          ).map((bnd) => (
            <View
              key={`ce${bnd.at}`}
              style={{
                position: 'absolute',
                left: bnd.left,
                top: bnd.top,
                width: bnd.width,
                height: bnd.height,
                backgroundColor: 'rgba(253,224,71,0.16)',
              }}
            />
          ))}
        {indicators.includes('ichimoku') &&
          ichimoku &&
          planBandStrips(ichimoku.spanA, ichimoku.spanB, xOf, yOf, bandW).map((bnd) => (
            <View
              key={`ichc${bnd.at}`}
              style={{
                position: 'absolute',
                left: bnd.left,
                top: bnd.top,
                width: bnd.width,
                height: bnd.height,
                // لون السحابة من اتجاهها: A فوق B صاعدة. `bnd.at` فهرس الشمعة نفسه.
                backgroundColor:
                  (ichimoku.spanA[bnd.at] ?? 0) >= (ichimoku.spanB[bnd.at] ?? 0)
                    ? 'rgba(34,197,94,0.14)'
                    : 'rgba(244,63,94,0.14)',
              }}
            />
          ))}
        {indicators.includes('ichimoku') &&
          ichimoku &&
          planLineSegments(ichimoku.tenkan, xOf, yOf).map((sg) => (
            <View
              key={`icht${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#60A5FA',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('ichimoku') &&
          ichimoku &&
          planLineSegments(ichimoku.kijun, xOf, yOf).map((sg) => (
            <View
              key={`ichk${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#F87171',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('ichimoku') &&
          ichimoku &&
          planLineSegments(ichimoku.chikou, xOf, yOf).map((sg) => (
            <View
              key={`ichc2-${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#C084FC',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('alligator') &&
          alligator &&
          planLineSegments(alligator.jaw, xOf, yOf).map((sg) => (
            <View
              key={`agj${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#3B82F6',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('alligator') &&
          alligator &&
          planLineSegments(alligator.teeth, xOf, yOf).map((sg) => (
            <View
              key={`agt${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#EF4444',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('alligator') &&
          alligator &&
          planLineSegments(alligator.lips, xOf, yOf).map((sg) => (
            <View
              key={`agl${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#84CC16',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}

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

        {/* مستويات الارتكاز الستّ بقائمة واحدة (`pivotLevels`)، وكل وسم يحمل سعره. */}
        {pivotLevels.map((lv) => {
          const y = yOf(lv.price);
          if (!Number.isFinite(y) || y < -1 || y > chartPlotH + 1) return null;
          if (pivotStartX === Infinity) return null;
          return (
            <View
              key={lv.key}
              style={[
                styles.hLine,
                { top: y, borderColor: lv.color, opacity: lv.opacity },
                pivotStartX != null && { left: pivotStartX },
              ]}
            >
              {pivotLabelKeys.has(lv.key) ? (
                <Text
                  style={[
                    styles.levelPriceLabel,
                    { color: lv.color },
                    pivotLabelAtEnd && { left: undefined, right: PRICE_AXIS_WIDTH + 4 },
                  ]}
                  numberOfLines={1}
                >
                  {lv.label} {fmtPrice(lv.price)}
                  {/* أعلى/أدنى الأمس هدفا اليوم الأوّلان: كم بقي للسعر ليبلغهما بالـpip، كوسم الخطّ
                      الأفقي. لا لبقيّة الارتكاز — ستّة وسوم بأبعادها تزحم اللوح. */}
                  {(() => {
                    const pips =
                      (lv.label === 'PDH' || lv.label === 'PDL') && Number.isFinite(currentPrice)
                        ? measurePipsText(series.symbol, currentPrice, lv.price)
                        : null;
                    return pips ? <Text style={styles.levelPipText}>{` · ${pips}`}</Text> : null;
                  })()}
                </Text>
              ) : null}
            </View>
          );
        })}

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
                    // `borderTopWidth` لا `borderWidth`: الأخيرة تُلوّن الأضلاع الأربعة،
                    // وبـ`left:0/right:0` وبلا ارتفاع كان خطّ الدعم يُرسم **شريطاً مجوّفاً**
                    // (حدّ أعلى وحدّ أسفل وطرفان) لا خطّاً واحداً — وحالة التحديد تُسمِك
                    // الشريط بدل الخطّ. بقيّة الرسوم تستعمل الخاصيّة الاتجاهية أصلاً.
                    borderTopWidth: sel ? 2.5 : 1,
                  },
                ]}
              >
                {hlinePriceLabels.has(d.id) ? (
                  <Text
                    style={[styles.levelPriceLabel, { color: d.color }, sel && styles.levelPriceLabelSel]}
                    numberOfLines={1}
                  >
                    {fmtPrice(d.a.price)}
                    {/* كم يبعد المستوى عن السعر الجاري بالـpip (+ فوقه، − تحته) — المتداول يرسم
                        الدعم ليعرف كم بقي للوصول إليه؛ الرقم نفسه الذي تعطيه أداة القياس. */}
                    {(() => {
                      const pips = Number.isFinite(currentPrice)
                        ? measurePipsText(series.symbol, currentPrice, d.a.price)
                        : null;
                      return pips ? <Text style={styles.levelPipText}>{` · ${pips}`}</Text> : null;
                    })()}
                  </Text>
                ) : null}
              </View>
            );
          }
          if (d.tool === 'vline' && aLocal >= 0 && aLocal < source.plot.length) {
            return (
              <View
                key={d.id}
                style={[
                  styles.vLine,
                  { left: xOf(aLocal), borderColor: d.color, borderLeftWidth: sel ? 2.5 : 1 },
                ]}
              />
            );
          }
          if (d.tool === 'note' && aLocal >= 0 && aLocal < source.plot.length) {
            return (
              <Text
                key={d.id}
                style={[
                  styles.note,
                  { left: xOf(aLocal), top: yOf(d.a.price), color: d.color },
                  sel ? [styles.noteSel, { borderColor: d.color }] : null,
                ]}
              >
                {d.text || '•'}
              </Text>
            );
          }
          if ((d.tool === 'trend' || d.tool === 'ray') && d.b) {
            const seg = clipSegmentToBars(
              aLocal,
              yOf(d.a.price),
              bLocal,
              yOf(d.b.price),
              lastDrawLocal
            );
            const x1 = xOf(seg.ai);
            const y1 = seg.ay;
            const x2 = xOf(seg.bi);
            const y2 = seg.by;
            const len =
              Math.hypot(x2 - x1, y2 - y1) * (d.tool === 'ray' ? rayReach(x1, y1, x2, y2, chartPlotW, chartPlotH) : 1);
            const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
            return (
              <React.Fragment key={d.id}>
                <View
                  style={{
                    position: 'absolute',
                    left: x1,
                    top: y1,
                    width: len,
                    height: sel ? 3.5 : 2,
                    backgroundColor: d.color,
                    transform: [{ rotate: `${angle}deg` }],
                    transformOrigin: 'left center',
                  }}
                />
                {sel ? (
                  <>
                    <View style={[styles.grabHandle, { left: x1, top: y1, borderColor: d.color }]} />
                    <View style={[styles.grabHandle, { left: x2, top: y2, borderColor: d.color }]} />
                  </>
                ) : null}
              </React.Fragment>
            );
          }
          if ((d.tool === 'rect' || d.tool === 'zone') && d.b) {
            const left = xOf(Math.min(aLocal, bLocal));
            const right = xOf(Math.max(aLocal, bLocal));
            const top = yOf(Math.max(d.a.price, d.b.price));
            const bot = yOf(Math.min(d.a.price, d.b.price));
            return (
              <React.Fragment key={d.id}>
                <View
                  style={{
                    position: 'absolute',
                    left,
                    top,
                    width: Math.max(4, right - left),
                    height: Math.max(4, bot - top),
                    backgroundColor:
                      d.tool === 'zone' ? 'rgba(45,212,191,0.12)' : 'rgba(251,191,36,0.1)',
                    borderWidth: sel ? 2.5 : 1,
                    borderColor: d.color,
                  }}
                />
                {/* ارتفاع المنطقة بالـpip («↕ 18.4 pip») — منطقة العرض/الطلب تُقاس بعرضها قبل
                    أيّ شيء (وقف خلفها بقدرها). داخل الزاوية العليا إن اتّسعت، وإلّا فوق الحدّ. */}
                {(() => {
                  const txt =
                    right - Math.max(left, 0) >= 64
                      ? candleRangePipsText(
                          series.symbol,
                          Math.max(d.a.price, d.b.price),
                          Math.min(d.a.price, d.b.price)
                        )
                      : null;
                  if (!txt) return null;
                  // حدّ علويّ فوق اللوح ⇒ الوسم عند أعلى الجزء المرئيّ من المنطقة.
                  const topVis = Math.max(top, 0);
                  const inside = bot - topVis >= 18;
                  if (!inside && top < 13) return null;
                  return (
                    <Text
                      pointerEvents="none"
                      numberOfLines={1}
                      style={[
                        styles.zoneRangeLabel,
                        { left: Math.max(left, 0) + 3, top: inside ? topVis + 2 : top - 14, color: d.color },
                      ]}
                    >
                      {txt}
                    </Text>
                  );
                })()}
                {sel ? (
                  <>
                    <View
                      style={[
                        styles.grabHandle,
                        { left: xOf(aLocal), top: yOf(d.a.price), borderColor: d.color },
                      ]}
                    />
                    <View
                      style={[
                        styles.grabHandle,
                        { left: xOf(bLocal), top: yOf(d.b.price), borderColor: d.color },
                      ]}
                    />
                  </>
                ) : null}
              </React.Fragment>
            );
          }
          if (isPositionTool(d.tool) && d.b) {
            return renderPosition(d.id, d.tool, d.a, d.b, d.rr, d.color, sel, false);
          }
          if (d.tool === 'fib' && d.b) {
            const hi = Math.max(d.a.price, d.b.price);
            const lo = Math.min(d.a.price, d.b.price);
            // الخطوط كلّها تُرسم (هي الأداة)، والوسوم وحدها تُنقّى — راجع `fibLabels.ts`
            // و`fibLabelPlans` أعلاه (تتجنّب وسوم الخطوط الأفقية وفيبو المرسوم قبله).
            const labelled = new Map((fibLabelPlans.get(d.id) ?? []).map((l) => [l.level, l.text]));
            return (
              <View key={d.id}>
                {FIB_DRAW_LEVELS.map((lv) => {
                  const price = fibLevelPrice(hi, lo, lv, d.a.price > d.b.price);
                  const text = labelled.get(lv);
                  // الامتداد هدف لا مستوى دخول: منقّط وأخفت، فلا تُقرأ الأداة تسعة خطوط متساوية.
                  const ext = isFibExtension(lv);
                  return (
                    <View
                      key={lv}
                      style={[
                        styles.hLine,
                        { top: yOf(price), borderColor: d.color, borderTopWidth: sel ? 2.5 : 1 },
                        ext ? styles.fibExtLine : null,
                      ]}
                    >
                      {text ? <Text style={styles.fibLevelLabel}>{text}</Text> : null}
                    </View>
                  );
                })}
              </View>
            );
          }
          return null;
        })}

        {pending && dragEnd && isPositionTool(tool)
          ? // المعاينة هي الأداة نفسها: المتداول يرى الوقف والهدف ونقاطهما وهو يسحب، لا خطّاً يُخمّن منه.
            renderPosition('positionPreview', tool, pending, positionEndPoint(pending, dragEnd), undefined, accent, false, true)
          : null}

        {pending && dragEnd && tool !== 'none' && tool !== 'select' && tool !== 'hline' && tool !== 'vline' && tool !== 'note' && !isPositionTool(tool) ? (
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

        {shownMeasure ? (
          // القراءة **أثناء** السحب لا بعده: كان الرقم يظهر بسطر القراءة أسفل الشارت بعد رفع
          // الإصبع فقط — فالمتداول يسحب أعمى ثم يعيد القياس حتى يصيب 30 pip. وبالوضع المدمج
          // (`dense`، الهاتف) سطر القراءة مخفيّ أصلاً فلا رقم إطلاقاً. الوسم فوق الإصبع بـ44px
          // (الإصبع يغطّي طرف الخطّ)، ويمتدّ بعيداً عن الحافة الأقرب فلا يُقصّ. وبعد الرفع يبقى
          // الخطّ ووسمه حتى النقرة التالية (خطّ المعاينة يختفي مع `pending`).
          (() => {
            const m = shownMeasure;
            const x1 = xOf(m.a.index - source.start);
            const y1 = yOf(m.a.price);
            const x2 = xOf(m.b.index - source.start);
            const y2 = yOf(m.b.price);
            const up = m.b.price >= m.a.price;
            const edge = up ? colors.bull : colors.bear;
            const top = Math.max(2, Math.min(chartPlotH - 22, y2 - 44 >= 2 ? y2 - 44 : y2 + 24));
            // السطر صار أطول بخانة الزمن («12 bars · 2d 4h · +24.0 pip · +0.22%» ≈ 235px):
            // يُقيَّد بعرض ما بقي حتى الحافة البعيدة ويُصغَّر الخطّ قليلاً بدل الخروج منها.
            const side =
              x2 < chartPlotW / 2
                ? { left: Math.max(2, x2 - 12) }
                : { right: Math.max(2, chartW - x2 - 12) };
            const tagMaxW = chartW - 2 - ('left' in side ? side.left : side.right);
            return (
              <>
                {liveMeasure ? null : (
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      left: x1,
                      top: y1,
                      width: Math.hypot(x2 - x1, y2 - y1),
                      height: 2,
                      backgroundColor: edge,
                      opacity: 0.7,
                      transform: [{ rotate: `${(Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI}deg` }],
                      transformOrigin: 'left center',
                    }}
                  />
                )}
                <View
                  pointerEvents="none"
                  style={[styles.measureLive, { top, borderColor: edge, maxWidth: tagMaxW }, side]}
                >
                  <Text
                    style={styles.measureLiveText}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    {measureText(m)}
                  </Text>
                </View>
              </>
            );
          })()
        ) : null}

        {/* الوضع المدمج (الهاتف) بلا سطر قراءة: قياس الرسم المحدَّد وسمٌ عند طرفه الثاني، بموضع
            وسم أداة القياس نفسه وحدّه. طرف خارج اللوح ⇒ لا وسم (لا يُعلَّق على لا شيء). */}
        {dense && selectedSpan?.b && selectedSpanReadout && !shownMeasure
          ? (() => {
              const end = selectedSpan.b;
              const color = selectedSpan.color;
              const bi = end.index - source.start;
              const x2 = xOf(bi);
              const y2 = yOf(end.price);
              if (bi < 0 || bi > source.plot.length - 1 || !(y2 >= 0 && y2 <= chartPlotH)) return null;
              const tagH = selectedLineNow ? 38 : 22;
              const top = Math.max(2, Math.min(chartPlotH - tagH, y2 - 44 >= 2 ? y2 - 44 : y2 + 24));
              const inset = x2 < chartPlotW / 2 ? Math.max(2, x2 - 12) : Math.max(2, chartW - x2 - 12);
              const side = x2 < chartPlotW / 2 ? { left: inset } : { right: inset };
              const tagMaxW = chartW - 2 - inset;
              return (
                <View
                  pointerEvents="none"
                  style={[styles.measureLive, { top, borderColor: color, maxWidth: tagMaxW }, side]}
                >
                  <Text
                    style={styles.measureLiveText}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    {selectedSpanReadout}
                  </Text>
                  {/* سطر ثانٍ لا لاحقة: السطر الأول يملأ عرض الهاتف أصلاً. */}
                  {selectedLineNow ? (
                    <Text
                      style={[styles.measureLiveText, { color }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}
                    >
                      {selectedLineNow}
                    </Text>
                  ) : null}
                </View>
              );
            })()
          : null}

        {pending ? (
          <View
            style={[
              styles.pending,
              { left: xOf(pending.index - source.start), top: yOf(pending.price) },
            ]}
          />
        ) : null}

        {cross && crossCandle ? (
          <>
            <View pointerEvents="none" style={[styles.crossV, { left: crossX, bottom: timeAxisH }]} />
            {crossPriceOff || crossPrice == null ? null : (
              <View
                pointerEvents="none"
                style={[styles.crossH, { top: crossY, right: PRICE_AXIS_WIDTH }]}
              />
            )}
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

        {!hidePriceLabels && !currentPriceOff ? (
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
        {priceTicks.map((tick, i) =>
          hidePriceLabels ||
          !priceTickBoxes[i] ||
          priceTickBoxes[i].hidden ||
          priceTickUnderTag(priceTickBoxes[i].start) ? null : (
            <Text
              key={tick.ratio}
              pointerEvents="none"
              style={[styles.priceAxisLabel, { top: priceTickBoxes[i].start }]}
            >
              {fmtPrice(tick.price)}
            </Text>
          )
        )}
          {!hidePriceLabels && !currentTagHidden ? (
          <View
            pointerEvents="none"
            style={[
              styles.currentPriceTag,
              { top: currentTagTop, minHeight: currentTagH, backgroundColor: accent },
            ]}
          >
            <Text style={styles.currentPriceText}>
              {offMark(currentPriceOff)}
              {fmtPrice(currentPrice)}
            </Text>
            {showCountdown && lastRawBar ? (
              <BarCountdown
                lastBarTime={lastRawBar.time}
                stepSec={countdownStep}
                symbol={series.symbol}
                style={styles.currentPriceCountdown}
                onEnd={() => setCountdownEndedKey(countdownKey)}
              />
            ) : null}
          </View>
          ) : null}
          {selectionTags.map((t) =>
            t.tone === 'now' ? (
              // سعر الترند عند الشمعة الحيّة: مفرَّغ بلون الخطّ — مستوى يتحرّك مع كل شمعة، لا طرف مرسوم.
              <View
                key={`sel-now-${t.price}`}
                pointerEvents="none"
                style={[
                  styles.selectionPriceTag,
                  styles.selectionNowTag,
                  { top: t.top, borderColor: selectedDrawing?.color ?? accent },
                ]}
              >
                <Text style={[styles.crossTagText, { color: selectedDrawing?.color ?? accent }]}>
                  {fmtPrice(t.price)}
                </Text>
              </View>
            ) : (
              <View
                key={`sel-${t.tone}-${t.price}`}
                pointerEvents="none"
                style={[
                  styles.selectionPriceTag,
                  {
                    top: t.top,
                    backgroundColor:
                      t.tone === 'bull' ? colors.bull : t.tone === 'bear' ? colors.bear : selectedDrawing?.color ?? accent,
                  },
                ]}
              >
                <Text style={styles.crossTagText}>{fmtPrice(t.price)}</Text>
              </View>
            )
          )}
          {!hidePriceLabels && crossPrice != null && crossTagTop != null ? (
          <View pointerEvents="none" style={[styles.crossPriceTag, { top: crossTagTop }]}>
            <Text style={styles.crossTagText}>
              {offMark(crossPriceOff)}
              {fmtPrice(crossPrice)}
            </Text>
            {crossPipsText ? (
              <Text
                style={styles.crossPipsText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {crossPipsText}
              </Text>
            ) : null}
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
            {timeTickBoxes.map((box) => {
              if (box.hidden) return null;
              // تحت وسم زمن التقاطع: الوسم يغطّيها فلا يظهر منها إلا طرفٌ مبتور
              if (
                crossTimeTagLeft != null &&
                boxesTouch(box.start, timeLabelW, crossTimeTagLeft, CROSS_TIME_TAG_W, TAG_CLEAR_GAP)
              )
                return null;
              const index = timeTickIndexes[box.i];
              const candle = source.plot[index];
              if (!candle) return null;
              return (
                <Text
                  key={`${candle.time}-${index}`}
                  pointerEvents="none"
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  style={[
                    styles.timeAxisLabel,
                    chartPlotW < 280 && styles.timeAxisLabelCompact,
                    { width: timeLabelW, left: box.start },
                  ]}
                >
                  {formatAxisTime(
                    barTime(candle),
                    visibleTimeSpan,
                    tr.mcMonths,
                    chartPlotW < 280,
                    dayCandles,
                    timeAxisHours
                  )}
                </Text>
              );
            })}
            {crossCandle ? (
              <View
                pointerEvents="none"
                style={[
                  styles.crossTimeTag,
                  { width: CROSS_TIME_TAG_W, left: crossTimeTagLeft ?? 0 },
                ]}
              >
                <Text style={styles.crossTagText} numberOfLines={1}>
                  {formatCrossTime(barTime(crossCandle), visibleTimeSpan, tr.mcMonths, dayCandles)}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {canPan && !hideTimeLabels ? (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.axisCorner,
              { width: PRICE_AXIS_WIDTH, height: timeAxisH },
              // مقياس السعر يدوي (مطّ المحور أو سحب رأسي) ⇒ AUTO ممتلئ: السعر لم يعد يلحق الشموع
              // تلقائياً، وشمعة جديدة خارج المدى قد تختفي — ضغطة تعيده.
              priceManual && styles.axisCornerManual,
              pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
            ]}
            onPress={() => {
              // المراجع قبل النشر: `publishSyncWindow` يقرؤها لا الحالة، وبلا نشر كانت توابع
              // الرباعي تبقى على النافذة القديمة بينما القائد عاد للحيّ.
              priceScaleRef.current = 1;
              windowCountRef.current = 80;
              pricePanRef.current = 0;
              xPanRef.current = 0;
              offsetRef.current = 0;
              setPriceScale(1);
              setWindowCount(80);
              setPricePan(0);
              setXPan(0);
              setOffset(0);
              schedulePublishSync(false);
            }}
            hitSlop={8}
          >
            <Text style={[styles.axisCornerText, priceManual && styles.axisCornerTextManual]}>AUTO</Text>
          </Pressable>
        ) : null}

        {/* «»» العودة لآخر شمعة (كزرّ TradingView على محور الزمن): بعد السحب للخلف لا سبيل للحيّ
            إلا بسحب مئات الشموع أو AUTO — والأخير يمحو التكبير أيضاً. هذا يُبقي التكبير
            الأفقي والرأسي ويعيد النافذة وحدها للطرف الأيمن. لا يظهر بالإعادة ولا بالتابع المتزامن. */}
        {canPan && !replayOn && offset > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={chartExtraLabels(lang).toLatest}
            style={({ pressed }) => [
              styles.toLatestBtn,
              { right: PRICE_AXIS_WIDTH + 8, bottom: timeAxisH + 8 },
              pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
            ]}
            onPress={() => {
              pricePanRef.current = 0;
              xPanRef.current = 0;
              offsetRef.current = 0;
              setPricePan(0);
              setXPan(0);
              setOffset(0);
              schedulePublishSync(false);
            }}
            hitSlop={10}
          >
            <Text style={styles.toLatestText}>»</Text>
          </Pressable>
        ) : null}
      </View>

      {/* panes */}
      {indicators.includes('volume') ? (
        <View style={[styles.pane, { height: paneH }]}>
          {/* بلا لون: أعمدة اللوحة ملوّنة باتجاه الشمعة (شراء/بيع)، فلونٌ ثانٍ على
              الرقم بمعنى ثالث (أعلى/أدنى من السابق) يجعل اللوحة تقول شيئين متنافسين. */}
          <PaneValueHead name="VOL" values={volumeSeries ?? []} at={crossIndex} tone="none" />
          <View style={styles.paneInner}>
            {(() => {
              // Max computed once per render (was recomputed per bar → O(n²) at 1000 bars).
              let maxV = 1;
              for (const x of source.plot) maxV = Math.max(maxV, x.volume ?? 0);
              return source.plot.map((c, i) => {
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
              });
            })()}
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
          {/* اللون بالاتّجاه لا بالإشارة: OBV تراكمي فإشارته تعتمد على نقطة البدء
              (نافذة الرسم) لا على السوق، بينما ألوان أعمدته أصلاً `v >= obv[i-1]`. */}
          <PaneValueHead name="OBV" values={obv} at={crossIndex} tone="trend" />
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
          <PaneValueHead name="COG" values={cog} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = cog.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxCog = Math.max(...vals, 1e-9);
              return cog.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxCog, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="Squeeze" values={squeeze.momentum} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = squeeze.momentum
                .filter((x): x is number => x != null)
                .map((v) => Math.abs(v));
              const maxSq = Math.max(...vals, 1e-9);
              return squeeze.momentum.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxSq, paneH);
                const on = squeeze.squeezeOn[i];
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="Woodie CCI" values={woodieCci.cci} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = woodieCci.cci.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxWc = Math.max(...vals, 1e-9);
              return woodieCci.cci.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxWc, paneH);
                const turbo = woodieCci.turbo[i];
                const turboAbove = turbo != null && turbo > v;
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="CFO" values={cfo} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = cfo.filter((x): x is number => x != null).map((x) => Math.abs(x));
              const maxC = Math.max(...vals, 1e-9);
              return cfo.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxC, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="VW-MACD" values={vwMacd.hist} at={crossIndex} />
          <View style={styles.paneInner}>
            {(() => {
              // كان آخر موضع بقي فيه المقياس الثابت `Math.abs(v) * 8000` بعد إصلاح MACD —
              // ومخرجات هذه الدالة بنفس شكل computeMacd تماماً (macdLine/signal/hist)
              // وبنفس ثغرة signal المبنيّ على null معوَّضاً بصفر، فتنطبق macdPaneGeom حرفياً.
              const g = macdPaneGeom(vwMacd.hist, vwMacd.macdLine, vwMacd.signal, paneH);
              return (
                <>
                  <View
                    pointerEvents="none"
                    style={[styles.paneZeroLine, { top: g.zeroY }]}
                  />
                  {vwMacd.hist.map((v, i) => {
                    if (!g.valid(i)) return <View key={i} style={{ flex: 1 }} />;
                    const m = vwMacd.macdLine[i];
                    const sg = vwMacd.signal[i];
                    const bh = v == null ? 0 : g.barH(v);
                    return (
                      <View key={i} style={{ flex: 1, height: g.innerH, position: 'relative' }}>
                        {v != null ? (
                          <View
                            style={{
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              top: v >= 0 ? g.zeroY - bh : g.zeroY,
                              height: Math.max(1, bh),
                              backgroundColor: v >= 0 ? colors.bull : colors.bear,
                              opacity: 0.55,
                            }}
                          />
                        ) : null}
                        {sg != null ? (
                          <View
                            style={{
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              top: g.y(sg),
                              height: 2,
                              backgroundColor: colors.warn,
                              opacity: 0.9,
                            }}
                          />
                        ) : null}
                        {m != null ? (
                          <View
                            style={{
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              top: g.y(m),
                              height: 2,
                              backgroundColor: accent,
                            }}
                          />
                        ) : null}
                      </View>
                    );
                  })}
                </>
              );
            })()}
          </View>
        </View>
      ) : null}

      {disparityIndex ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="Disparity" values={disparityIndex} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = disparityIndex.filter((x): x is number => x != null).map((x) => Math.abs(x));
              const maxD = Math.max(...vals, 1e-9);
              return disparityIndex.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxD, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="PGO" values={pgo} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = pgo.filter((x): x is number => x != null).map((x) => Math.abs(x));
              const maxP = Math.max(...vals, 1e-9);
              return pgo.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxP, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="PFE" values={pfe} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = pfe.filter((x): x is number => x != null).map((x) => Math.abs(x));
              const maxP = Math.max(...vals, 1e-9);
              return pfe.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxP, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="VPCI" values={vpci} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = vpci.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxV = Math.max(...vals, 1e-9);
              return vpci.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxV, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="TTF" values={ttf} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = ttf.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxT = Math.max(...vals, 1e-9);
              return ttf.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxT, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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

      {tdi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>TDI</Text>
          <View style={styles.paneInner}>
            {(() => {
              const tdiVals = tdi.tdi.filter((x): x is number => x != null);
              const diVals = tdi.di.filter((x): x is number => x != null);
              const allVals = [...tdiVals, ...diVals, 0];
              const minV = Math.min(...allVals);
              const maxV = Math.max(...allVals);
              const span = maxV - minV || 1;
              const innerH = paneH - 16;
              return tdi.tdi.map((tv, i) => {
                const dv = tdi.di[i];
                return (
                  <View key={i} style={{ flex: 1, height: innerH, position: 'relative' }}>
                    {tv != null ? (
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          height: 3,
                          top: ((maxV - tv) / span) * innerH,
                          backgroundColor: tv >= 0 ? colors.bull : colors.bear,
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
                          backgroundColor: colors.accent,
                          opacity: 0.55,
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

      {vfi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="VFI" values={vfi} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = vfi.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxV = Math.max(...vals, 1e-9);
              return vfi.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxV, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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

      {laguerreRsi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>Laguerre RSI</Text>
          <View style={styles.paneInner}>
            {laguerreRsi.map((v, i) =>
              v == null ? (
                <View key={i} style={{ flex: 1 }} />
              ) : (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    marginTop: (1 - v) * (paneH - 16),
                    backgroundColor: v > 0.85 ? colors.bear : v < 0.15 ? colors.bull : accent,
                    borderRadius: 2,
                  }}
                />
              )
            )}
          </View>
        </View>
      ) : null}

      {twiggsMoneyFlow ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="Twiggs MF" values={twiggsMoneyFlow} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {twiggsMoneyFlow.map((v, i) => {
              if (v == null) return <View key={i} style={{ flex: 1 }} />;
              const h = centeredBarH(v, 1, paneH);
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: Math.max(2, h),
                    marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="VZO" values={vzo} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {vzo.map((v, i) => {
              if (v == null) return <View key={i} style={{ flex: 1 }} />;
              const h = centeredBarH(v, 100, paneH);
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: Math.max(2, h),
                    marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="GMMA Osc" values={gmmaOsc} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = gmmaOsc.filter((x): x is number => x != null).map((x) => Math.abs(x));
              const maxG = Math.max(...vals, 1e-9);
              return gmmaOsc.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxG, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="IFT-RSI" values={iftRsi} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              // محصورة نظرياً بصرامة داخل (−1,1) — نطاق ثابت معروف مسبقاً بدل تطبيع ديناميكي
              // بالحد الأقصى، بنفس أسلوب Twiggs MF/VZO أعلاه (رياضياً محصورة لا تجريبياً فقط).
              return iftRsi.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, 1, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneHead paneId="rsi" name="RSI" values={rsi} at={crossIndex} />
          <View style={styles.paneInner}>
            <PaneGuideLines paneId="rsi" innerH={paneH - 16} />
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
          <PaneHead paneId="mfi" name="MFI" values={mfi} at={crossIndex} />
          <View style={styles.paneInner}>
            <PaneGuideLines paneId="mfi" innerH={paneH - 16} />
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
          <PaneHead paneId="adx" name="ADX" values={adx} highColor={colors.warn} at={crossIndex} />
          <View style={styles.paneInner}>
            <PaneGuideLines paneId="adx" innerH={paneH - 16} />
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
          <PaneValueHead name="TRIX" values={trix} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = trix.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxT = Math.max(...vals, 1e-9);
              return trix.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxT, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="Force" values={force} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = force.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxF = Math.max(...vals, 1e-9);
              return force.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxF, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="Chaikin" values={chaikinOsc} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = chaikinOsc.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxC = Math.max(...vals, 1e-9);
              return chaikinOsc.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxC, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="DPO" values={dpo} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = dpo.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxD = Math.max(...vals, 1e-9);
              return dpo.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxD, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="AO" values={ao} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = ao.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxA = Math.max(...vals, 1e-9);
              return ao.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxA, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="AC" values={ac} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = ac.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxAc = Math.max(...vals, 1e-9);
              return ac.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxAc, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="Fractal Chaos Osc" values={fractalChaosOsc} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = fractalChaosOsc
                .filter((x): x is number => x != null)
                .map((v) => Math.abs(v));
              const maxF = Math.max(...vals, 1e-9);
              return fractalChaosOsc.map((v, i) => {
                if (v == null || v === 0) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxF, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="BOP" values={bop} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = bop.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxB = Math.max(...vals, 1e-9);
              return bop.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxB, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="Bull Power" values={bullPower} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = bullPower.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxBp = Math.max(...vals, 1e-9);
              return bullPower.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxBp, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="Bear Power" values={bearPower} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = bearPower.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxBe = Math.max(...vals, 1e-9);
              return bearPower.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxBe, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="TSI" values={tsi} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = tsi.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxTsi = Math.max(...vals, 1e-9);
              return tsi.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxTsi, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="Coppock" values={coppock} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = coppock.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxCop = Math.max(...vals, 1e-9);
              return coppock.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxCop, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="EOM" values={eom} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = eom.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxEom = Math.max(...vals, 1e-9);
              return eom.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxEom, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="PPO" values={ppo} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = ppo.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxP = Math.max(...vals, 1e-9);
              return ppo.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxP, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="Chaikin Vol" values={chaikinVol} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = chaikinVol.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxCv = Math.max(...vals, 1e-9);
              return chaikinVol.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxCv, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="Qstick" values={qstick} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = qstick.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxQ = Math.max(...vals, 1e-9);
              return qstick.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxQ, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="PVO" values={pvo} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = pvo.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxPv = Math.max(...vals, 1e-9);
              return pvo.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxPv, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="APO" values={apo} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = apo.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxA = Math.max(...vals, 1e-9);
              return apo.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxA, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="Volume Osc" values={vo} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = vo.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxVo = Math.max(...vals, 1e-9);
              return vo.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxVo, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="ATR%" values={atrp} at={crossIndex} tone="trend" />
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
          <PaneHead paneId="stochRsi" name="StochRSI" values={stochRsi.k} at={crossIndex} />
          <View style={styles.paneInner}>
            <PaneGuideLines paneId="stochRsi" innerH={paneH - 16} />
            {(() => {
              // K وD كـTradingView (نمط لوحة الستوكاستيك): التقاطع هو الإشارة، و%K وحده كان بلا D
              const g = stochPaneGeom(paneH);
              return stochRsi.k.map((v, i) => {
                const kY = g.y(v);
                const dY = g.y(stochRsi.d[i]);
                if (kY == null && dY == null) return <View key={i} style={{ flex: 1 }} />;
                return (
                  <View key={i} style={{ flex: 1, height: g.innerH, position: 'relative' }}>
                    {dY != null ? (
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: dY,
                          height: STOCH_LINE_H,
                          backgroundColor: colors.warn,
                          opacity: 0.9,
                        }}
                      />
                    ) : null}
                    {kY != null ? (
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: kY,
                          height: STOCH_LINE_H,
                          backgroundColor: accent,
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

      {rvi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="RVI" values={rvi} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = rvi.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxR = Math.max(...vals, 1e-9);
              return rvi.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxR, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="LR Slope" values={linRegSlope} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = linRegSlope
                .filter((x): x is number => x != null)
                .map((v) => Math.abs(v));
              const maxL = Math.max(...vals, 1e-9);
              return linRegSlope.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxL, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneHead paneId="percentB" name="%B" values={percentB} at={crossIndex} />
          <View style={styles.paneInner}>
            <PaneGuideLines paneId="percentB" innerH={paneH - 16} />
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
          <PaneValueHead name="BBW" values={bbw} at={crossIndex} tone="trend" />
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
          <PaneValueHead name="Momentum" values={momentum} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = momentum.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxM = Math.max(...vals, 1e-9);
              return momentum.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxM, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="RAVI" values={ravi} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = ravi.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxR = Math.max(...vals, 1e-9);
              return ravi.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxR, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="Fisher Transform" values={fisher} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = fisher.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxF = Math.max(...vals, 1e-9);
              return fisher.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxF, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="KST" values={kst} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = kst.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxK = Math.max(...vals, 1e-9);
              return kst.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxK, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneSpreadHead
            name="DMI"
            upper={dmi.plusDI}
            lower={dmi.minusDI}
            at={crossIndex}
            tone="sign"
          />
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
          <PaneValueHead name="SMI Ergodic Osc" values={smiErgodic} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = smiErgodic.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxM = Math.max(...vals, 1e-9);
              return smiErgodic.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxM, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="PMO" values={pmo} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = pmo.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxP = Math.max(...vals, 1e-9);
              return pmo.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxP, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="Volume ROC" values={volRoc} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = volRoc.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxV = Math.max(...vals, 1e-9);
              return volRoc.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxV, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneSpreadHead name="Gator" upper={gator.upper} lower={gator.lower} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = [...gator.upper, ...gator.lower].filter(
                (x): x is number => x != null
              );
              const maxG = Math.max(0.00001, ...vals.map((v) => Math.abs(v)));
              return gator.upper.map((uv, i) => {
                const lv = gator.lower[i];
                if (uv == null && lv == null) return <View key={i} style={{ flex: 1 }} />;
                // نفس مرجع بقية اللوحات ثنائية الجانب: مركز مساحة الرسم لا مركز اللوحة.
                const zeroY = centeredPaneZeroY(paneH);
                const uh = uv != null ? centeredBarH(uv, maxG, paneH) : 0;
                const lh = lv != null ? centeredBarH(lv, maxG, paneH) : 0;
                const upGrow = gator.upperGrowing[i];
                const lowGrow = gator.lowerGrowing[i];
                return (
                  <View
                    key={i}
                    style={{ flex: 1, position: 'relative', height: centeredPaneInnerH(paneH) }}
                  >
                    {uv != null ? (
                      <View
                        style={{
                          position: 'absolute',
                          left: 1,
                          right: 1,
                          top: zeroY - uh,
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
                          top: zeroY,
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
          <PaneValueHead name="MACD" values={macd.hist} at={crossIndex} />
          <View style={styles.paneInner}>
            {(() => {
              // المقياس من مدى البيانات بالنافذة، لا من الثابت 8000 الذي كان يجعل
              // الهيستوغرام كتلة مصمتة على الذهب والين وخيطاً غير مرئي على اليورو.
              const g = macdPaneGeom(macd.hist, macd.macdLine, macd.signal, paneH);
              return (
                <>
                  {/* خطّ الصفر: مرجع التقاطع الذي كان غائباً */}
                  <View
                    pointerEvents="none"
                    style={[styles.paneZeroLine, { top: g.zeroY }]}
                  />
                  {macd.hist.map((v, i) => {
                    if (!g.valid(i)) return <View key={i} style={{ flex: 1 }} />;
                    const m = macd.macdLine[i];
                    const sg = macd.signal[i];
                    const bh = v == null ? 0 : g.barH(v);
                    return (
                      <View key={i} style={{ flex: 1, height: g.innerH, position: 'relative' }}>
                        {v != null ? (
                          <View
                            style={{
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              top: v >= 0 ? g.zeroY - bh : g.zeroY,
                              height: Math.max(1, bh),
                              backgroundColor: v >= 0 ? colors.bull : colors.bear,
                              opacity: 0.55,
                            }}
                          />
                        ) : null}
                        {sg != null ? (
                          <View
                            style={{
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              top: g.y(sg),
                              height: 2,
                              backgroundColor: colors.warn,
                              opacity: 0.9,
                            }}
                          />
                        ) : null}
                        {m != null ? (
                          <View
                            style={{
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              top: g.y(m),
                              height: 2,
                              backgroundColor: accent,
                            }}
                          />
                        ) : null}
                      </View>
                    );
                  })}
                </>
              );
            })()}
          </View>
        </View>
      ) : null}

      {stoch ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneHead paneId="stoch" name="STO" values={stoch.k} at={crossIndex} />
          <View style={styles.paneInner}>
            <PaneGuideLines paneId="stoch" innerH={paneH - 16} />
            {(() => {
              // %D كان محسوباً ولا يُرسم — والتقاطع بينه وبين %K هو غرض المؤشّر كلّه.
              // نفس نمط حاوية MACD: عمود `position: 'relative'` لكل شمعة يحمل الخطّين معاً.
              const g = stochPaneGeom(paneH);
              return stoch.k.map((v, i) => {
                const kY = g.y(v);
                const dY = g.y(stoch.d[i]);
                if (kY == null && dY == null) return <View key={i} style={{ flex: 1 }} />;
                return (
                  <View key={i} style={{ flex: 1, height: g.innerH, position: 'relative' }}>
                    {dY != null ? (
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: dY,
                          height: STOCH_LINE_H,
                          backgroundColor: colors.warn,
                          opacity: 0.9,
                        }}
                      />
                    ) : null}
                    {kY != null ? (
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: kY,
                          height: STOCH_LINE_H,
                          backgroundColor: accent,
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

      {atr ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="ATR" values={atr} at={crossIndex} tone="trend" />
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
          <PaneHead paneId="willr" name="%R" values={willr} at={crossIndex} />
          <View style={styles.paneInner}>
            <PaneGuideLines paneId="willr" innerH={paneH - 16} />
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
          <PaneValueHead name="CCI" values={cci} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = cci.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxC = Math.max(...vals, 1e-9);
              return cci.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxC, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="ROC" values={roc} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = roc.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxR = Math.max(...vals, 1e-9);
              return roc.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxR, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="STDEV" values={stddev} at={crossIndex} tone="trend" />
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
          <PaneValueHead name="AROON" values={aroon} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = aroon.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxA = Math.max(...vals, 1e-9);
              return aroon.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxA, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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
          <PaneValueHead name="CMF" values={cmf} at={crossIndex} />
          <View style={styles.paneInner}>
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = cmf.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxC = Math.max(...vals, 1e-9);
              return cmf.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxC, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
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

      {/* شريط اللوحات المطويّة: بديل الفيض الصامت خارج صندوق الشارت.
          وبضغطة واحدة يعرض المطويّ بدل الظاهر — فالمؤشّر المطويّ لم يعد مفقوداً
          حتى يُلغى اختيار غيره. يبقى نصّاً غير قابل للضغط إذا كانت صفحة واحدة
          (لا يتّسع ولا لوحة) فلا يَعِد الشريط بتبديل لا يحدث. */}
      {collapsedPanes.length ? (
        panePageCount > 1 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr.mcPanesCollapsedA11y}
            accessibilityHint={tr.mcPanesPageA11y}
            onPress={nextPanePage}
            hitSlop={6}
            style={({ pressed }) => [
              styles.collapsedBar,
              styles.collapsedBarTappable,
              { height: collapsedBarH },
              pressed && styles.collapsedBarPressed,
            ]}
          >
            <Text numberOfLines={1} style={styles.collapsedCount}>
              {`${tr.mcPanesCollapsed} ${collapsedPanes.length}`}
            </Text>
            <Text numberOfLines={1} style={styles.collapsedNames}>
              {collapsedBarText(collapsedPanes)}
            </Text>
            {/* عدّاد الصفحة كشارة تيل: أرقام بلا نصّ مترجَم وبلا سهم — السهم اتجاهه
                ينقلب بين العربية والإنجليزية، ورموز الدوران قد تسقط بخطوط أندرويد. */}
            <View style={styles.collapsedPageChip}>
              <Text style={styles.collapsedPage}>
                {`${panePageShown + 1}/${panePageCount}`}
              </Text>
            </View>
          </Pressable>
        ) : (
          <View
            accessibilityRole="text"
            accessibilityLabel={tr.mcPanesCollapsedA11y}
            style={[styles.collapsedBar, { height: collapsedBarH }]}
          >
            <Text numberOfLines={1} style={styles.collapsedCount}>
              {`${tr.mcPanesCollapsed} ${collapsedPanes.length}`}
            </Text>
            <Text numberOfLines={1} style={styles.collapsedNames}>
              {collapsedBarText(collapsedPanes)}
            </Text>
          </View>
        )
      ) : null}

      {interactive && !compactUi ? (
        <View style={styles.dock}>
          <Text style={styles.dockTitle}>{tr.mcDockTitle}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {localizedDrawTools(tr).map((t) => (
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
              accessibilityLabel={canUndo ? tr.mcUndoA11y : tr.mcNothingToUndo}
              accessibilityState={{ disabled: !canUndo }}
              disabled={!canUndo}
              style={({ pressed }) => [
                styles.tool,
                !canUndo && styles.toolDisabled,
                pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
              ]}
              onPress={undoDrawing}
            >
              <Text style={styles.toolText}>↶ {tr.mcUndo}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.tool,
                pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
              ]}
              onPress={() => {
                Alert.alert(tr.mcClearAllTitle, chartExtraLabels(lang).clearAllBody, [
                  { text: tr.cancel, style: 'cancel' },
                  {
                    text: tr.mcClearWord,
                    style: 'destructive',
                    onPress: () => {
                      pushDrawHistory();
                      setDrawings([]);
                      setPending(null);
                      setSelectedId(null);
                      void clearDrawings(series.symbol, drawingsOwner);
                    },
                  },
                ]);
              }}
            >
              <Text style={styles.toolText}>{tr.mcClearWord}</Text>
            </Pressable>
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {localizedIndicators(tr).map((ind) => {
              const on = selectedInd.includes(ind.id);
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
              <Text style={[styles.indText, !pineOn && styles.indTextOn]}>{tr.mcNoPineLine}</Text>
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
              <Text style={styles.toolText}>{tr.mcExportPng}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.tool,
                pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
              ]}
              onPress={persistTemplate}
            >
              <Text style={styles.toolText}>{tr.mcSaveTemplate}</Text>
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
                    // بلا نافذة تأكيد: حذف عنصر واحد صار قابلاً للتراجع بزرّ «تراجع»
                    // المجاور، والتأكيد على كل حذف يجعل تنظيف الشارت عملاً شاقاً بالهاتف.
                    pushDrawHistory();
                    setDrawings((list) => list.filter((x) => x.id !== selectedId));
                    setSelectedId(null);
                  }}
                >
                  <Text style={styles.toolText}>{tr.deleteWord}</Text>
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
                        <Text style={styles.toolTextOn}>{tr.mcAlertLine}</Text>
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
                        <Text style={styles.toolTextOn}>{tr.mcAlertZone}</Text>
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
                    // «الشمعة الحالية» = آخر شمعة بالسلسلة، لا آخر شمعة ظاهرة: بعد الرجوع
                    // بالشارت كان التنبيه يُضبط على قيمة الخطّ عند حافّة الشاشة (بعيداً بنقاط
                    // عن مستواه الآن). بالإعادة الحالية هي شمعة الإعادة. ويُقرَّب لمنازل الزوج
                    // كسعر التقاطع، لا 1.0852347 بنموذج التنبيه.
                    const lastGlobalIndex = replayOn
                      ? source.start + source.plot.length - 1
                      : source.all.length - 1;
                    const rawLinePrice = d.a.price + slope * (lastGlobalIndex - d.a.index);
                    const lineDecimals = symbolPriceDecimals(series.symbol);
                    const currentPrice =
                      lineDecimals != null ? Number(rawLinePrice.toFixed(lineDecimals)) : rawLinePrice;
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
                        <Text style={styles.toolTextOn}>{tr.mcAlertAtLineLevel}</Text>
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
  crossAlertBtn: {
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.controlBg,
  },
  crossAlertText: { fontWeight: '800', fontSize: 11, fontFamily: 'monospace' },
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
  sessionBand: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  sessionStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    opacity: 0.7,
  },
  sessionLabel: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    fontSize: 9,
    fontWeight: '600',
    opacity: 0.8,
  },
  dayBreak: {
    position: 'absolute',
    top: 0,
    width: 0,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(255,255,255,0.14)',
    borderStyle: 'dashed',
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
  hiLoLabel: {
    position: 'absolute',
    height: HILO_LABEL_H,
    alignItems: 'center',
    gap: 2,
    zIndex: 6,
  },
  hiLoLeader: { width: 6, height: 1, backgroundColor: colors.textMuted, opacity: 0.8 },
  hiLoText: {
    color: colors.textMuted,
    fontSize: 9,
    lineHeight: HILO_LABEL_H,
    fontWeight: '700',
    fontFamily: 'monospace',
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
  currentPriceCountdown: {
    color: '#041514',
    opacity: 0.72,
    fontSize: 8,
    lineHeight: 11,
    fontWeight: '700',
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
  axisCornerManual: { backgroundColor: colors.accent, borderColor: colors.accent },
  axisCornerTextManual: { color: '#041514' },
  toLatestBtn: {
    position: 'absolute',
    zIndex: 61,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  toLatestText: { color: '#0B1220', fontSize: 18, lineHeight: 20, fontWeight: '900', marginTop: -2 },
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
  // وسم سعر على خطٍّ أفقي (خطّ المتداول): بلون الخطّ نفسه ليُقرأ كتابعٍ له لا كوسم
  // محور. يسار اللوح لنفس سبب وسم فيبو أدناه.
  levelPriceLabel: {
    position: 'absolute',
    left: 4,
    top: -11,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
    paddingHorizontal: 3,
    borderRadius: radii.sm,
    backgroundColor: colors.bgGlass,
    overflow: 'hidden',
  },
  levelPriceLabelSel: { backgroundColor: colors.bgPanel },
  // ارتفاع المستطيل/المنطقة بالـpip: أخفّ من وسم الخطّ (ليس مستوى سعر بل مقاس).
  zoneRangeLabel: {
    position: 'absolute',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    opacity: 0.9,
  },
  levelPipText: { fontWeight: '600', opacity: 0.8 },
  // وسم مستوى فيبو: **يسار اللوح** لا يمينه. اليمين هو محور السعر ووسماه (الحيّ
  // والتقاطع) يُرسمان فوق كل شيء، ووسمٌ صار يحمل سعراً أعرض من أن يشاركهما الحافة.
  // وخلفية خفيفة لأن النصّ يقع الآن فوق الشموع لا فوق حافة فارغة.
  fibExtLine: {
    borderStyle: 'dotted',
    opacity: 0.7,
  },
  fibLevelLabel: {
    position: 'absolute',
    left: 4,
    top: -11,
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    paddingHorizontal: 3,
    borderRadius: radii.sm,
    backgroundColor: colors.bgGlass,
    overflow: 'hidden',
  },
  note: { position: 'absolute', fontSize: 10, fontWeight: '800' },
  // حالة التحديد كانت مطبَّقة على الخط الأفقي وحده، فالمتداول يختار خط ترند أو مستطيلاً
  // ثم يضغط «حذف» بلا أي دليل بصري على العنصر الذي سيُحذف.
  noteSel: {
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: 3,
    backgroundColor: 'rgba(45,212,191,0.16)',
  },
  positionLabel: {
    position: 'absolute',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
    paddingHorizontal: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.sm,
    backgroundColor: colors.bgGlass,
    overflow: 'hidden',
  },
  grabHandle: {
    position: 'absolute',
    width: 12,
    height: 12,
    marginLeft: -6,
    marginTop: -6,
    borderRadius: 6,
    borderWidth: 2,
    backgroundColor: '#0B1220',
  },
  measureLive: {
    position: 'absolute',
    zIndex: 45,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    borderWidth: 1,
    backgroundColor: colors.bgGlass,
  },
  measureLiveText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
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
  crossPriceTag: {
    position: 'absolute',
    left: 2,
    right: 2,
    minHeight: 18,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    backgroundColor: colors.text,
    zIndex: 2,
  },
  selectionPriceTag: {
    position: 'absolute',
    left: 2,
    right: 2,
    height: 18,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    zIndex: 1,
  },
  selectionNowTag: {
    backgroundColor: '#071018',
    borderWidth: 1,
  },
  crossTimeTag: {
    position: 'absolute',
    top: 3,
    minHeight: 18,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    backgroundColor: colors.text,
    zIndex: 2,
  },
  crossTagText: {
    color: '#041514',
    fontSize: 9,
    lineHeight: 14,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  crossPipsText: {
    color: '#041514',
    opacity: 0.72,
    fontSize: 8,
    lineHeight: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
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
  // محاذاة العمود: **flex-start وليس flex-end**. كل اللوحات الـ108 تضع شريطها بـ`marginTop`
  // محسوباً من قيمة المؤشر، ومع `alignItems: 'flex-end'` يُلغي Yoga هذا الهامش تماماً:
  // الموضع = ارتفاع الحاوية − ارتفاع الشريط، فـ`marginTop` يدخل ويخرج من المعادلة
  // (pos = marginTop + (H − (marginTop + h)) ). النتيجة عملياً: كل لوحة شريطها بارتفاع ثابت
  // (RSI، ستوكاستيك، %R، MFI، ADX، CVD…) كانت **خطاً مسطَّحاً على قاع اللوحة** مهما كانت
  // القيمة — لا يميّز المتداول RSI عند 55 من RSI عند 85 إلا بتغيّر اللون؛ وهيستوغرام MACD
  // كان يرسم الموجب والسالب بنفس الموضع تماماً فيختفي اتجاه الزخم.
  // مع flex-start يصير الموضع = marginTop كما تقصده كل المعادلات (مداها 0..paneH−16).
  paneInner: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 2 },
  // خطّ الصفر داخل لوحة ذات قيم موجبة/سالبة (MACD وأمثاله): مرجع التقاطع.
  // رأس اللوحة: الاسم فوق قيمة الشمعة الأخيرة، بنفس عرض paneLabel (36px) فلا يتغيّر
  // تخطيط أي لوحة أخرى ما زالت تستعمل paneLabel وحده.
  paneHead: { width: 36, paddingTop: 5, alignItems: 'center' },
  paneHeadName: { color: colors.textDim, fontSize: 9, fontWeight: '800', textAlign: 'center' },
  paneHeadValue: { color: colors.textMuted, fontSize: 9, fontWeight: '700', textAlign: 'center', marginTop: 1 },
  // رقم طويل (مقياس دقيق كـMACD على زوج عملات) — 8 محارف لا تتّسع بـ36px عند حجم 9.
  paneHeadValueLong: { fontSize: 8 },
  // خطّ عتبة داخل لوحة محصورة المدى. الرقم عند أقصى اليسار — أبعد موضع عن اسم اللوحة
  // (اللوحة row-reverse فاسمها يميناً) وأقلّها حجباً للشموع الأخيرة التي يقرؤها المتداول.
  paneGuideLine: {
    position: 'absolute',
    left: 2,
    right: 2,
    height: 1,
    backgroundColor: colors.border,
  },
  paneGuideLineMid: { opacity: 0.45 },
  paneGuideLabelBox: { position: 'absolute', left: 3 },
  paneGuideLabel: { color: colors.textDim, fontSize: 8, fontWeight: '700' },
  // مفتاح ألوان طبقات السعر: صفّ شارات أعلى يسار لوحة السعر، فوق الشموع بلا اعتراضها.
  priceLegend: {
    position: 'absolute',
    left: 6,
    // لا يتجاوز محور السعر أبداً مهما طال اسم مؤشّر (McGinley أطول من تقدير
    // LEGEND_CHIP_W)، وما زاد يُقصّ بدل أن يغطّي الأسعار على اليمين.
    right: PRICE_AXIS_WIDTH + 6,
    overflow: 'hidden',
    zIndex: 8,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  priceLegendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    backgroundColor: 'rgba(7,16,24,0.78)',
  },
  priceLegendSwatch: { width: 6, height: 6, borderRadius: 1, marginRight: 3 },
  priceLegendText: { color: colors.text, fontSize: 9, fontWeight: '700' },
  priceLegendMore: { color: colors.textDim, fontSize: 9, fontWeight: '700' },
  paneZeroLine: {
    position: 'absolute',
    left: 2,
    right: 2,
    height: 1,
    backgroundColor: colors.border,
  },
  // شريط اللوحات المطويّة: بارتفاع لوحة مصغَّرة (16px) — يذكر العدد والأسماء بدل
  // إخفاء اللوحات بصمت عند ضيق ارتفاع الشارت.
  collapsedBar: {
    backgroundColor: '#070F18',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 6,
    gap: 6,
    overflow: 'hidden',
  },
  collapsedCount: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: '800',
  },
  collapsedNames: {
    flex: 1,
    color: colors.textDim,
    fontSize: 9,
    fontWeight: '600',
  },
  /** الشريط القابل للضغط: حدّ تيل خفيف يميّزه عن الشريط الإخباري الصامت. */
  collapsedBarTappable: {
    borderColor: colors.accentBorderGlow,
  },
  collapsedBarPressed: {
    backgroundColor: colors.accentFaint,
  },
  /** شارة «2/3»: خلفية تيل خفيفة تقول إن الشريط زرّ لا نصّ. */
  collapsedPageChip: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.sm,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  collapsedPage: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: '800',
  },
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
  /** زرّ معطَّل (لا شيء للتراجع عنه) — باهت لا مخفيّ، فلا يقفز مكان الأزرار بالشريط. */
  toolDisabled: { opacity: 0.35 },
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
