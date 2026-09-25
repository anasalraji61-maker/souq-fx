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
  Platform,
  TextInput,
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
import { compareOverlay } from './compare';
import { watermarkFontSize, watermarkSymbol } from './watermark';
import { moveArmedAlert, refreshArmedAlertsSoon, useArmedAlerts } from './useArmedAlerts';
import { tickPlausibleForSeries, withLiveExtremes, withLivePrice, type LiveExtremes } from './liveSeries';
import { computeVolumeProfile, pocPrice, computeTpo } from './volumeProfile';
import { evalPineLite, INDICATOR_LIBRARY, pineIsPriceScale } from './pineLite';
import { renko, measureStats } from './renko';
import { kagi } from './kagi';
import { pointFigure } from './pointFigure';
import { rangeBars } from './range';
import { LINE_BREAK_COUNT, lineBreak, nextLineBreakCount } from './lineBreak';
import { loadLineBreakCount, saveLineBreakCount, subscribeLineBreakCount } from './lineBreakPrefs';
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
import { indicatorBase, indicatorRangeBase, trimIndicator, trimIndicatorRange } from './indicatorWindow';
import {
  axisTickCount,
  axisTickRatios,
  nicePriceTicks,
  niceLogPriceTicks,
  percentScaleTicks,
  formatScalePercent,
  niceTimeTickIndexes,
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
  risingBars,
} from './centeredPane';
import { STOCH_LINE_H, stochPaneGeom } from './stochPane';
import {
  legendBandAt,
  legendMultiAt,
  legendValueAt,
  planPriceLegendForWidth,
  PRICE_OVERLAY_ORDER,
  PRICE_OVERLAYS,
  resolveColorExpr,
} from './priceLegend';
import { placeOverlayTags, tagTextColor, type OverlayTagInput } from './overlayTags';
import {
  formatPaneValue,
  paneBoundedDecimals,
  formatPaneValueScaled,
  paneSpreadSeries,
  paneValueAt,
  paneValueState,
  paneValueTrend,
  placeGuides,
  placeScaledGuides,
  GUIDES_LABEL_MIN_INNER_H,
  GUIDES_MIN_INNER_H,
} from './paneGuides';
import { DrawingsSaveQueue, drawingsKey, drawingsSignature } from './drawingsPersist';
import {
  arrowNudge,
  clipSegmentToBars,
  raySegment,
  dragChangesDrawing,
  drawingEnd,
  nudgePipPrice,
  nudgeRepeatMultiplier,
  NUDGE_HOLD_DELAY_MS,
  NUDGE_REPEAT_MS,
  rayReach,
  sameDrawingPlace,
  samePoint,
  translateDrawing,
  cloneShift,
  withDrawingArrow,
  withDrawingLock,
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
import { channelHandlePrice, channelLinePrices, channelWidthAt, fitChannelWidth } from './channel';
import { anchorDrawings, barTime, drawSlotAt, stampAtIndex, type TimeBar } from './drawingAnchors';
import { lineNowText, lineValueAt, placeSelectionTags, selectionPrices } from './selectionTags';
import { appendedAfter, offsetAtTime } from './holdView';
import { priceSpan } from './priceSpan';
import { FIB_EXTENSIONS, fibLevelPrice, isFibExtension, planFibLabels, type FibLabelPlan } from './fibLabels';
import {
  barChangeRef,
  candleRangePipsText,
  measureDurationSec,
  signedDistanceText,
  measureReadoutText,
} from './measureReadout';
import { inLeftLabelLane, LEFT_LABEL_LANE_W, thinByGap } from './levelLabels';
import { zigzagWindowSegments } from './zigzagLegs';
import { nextZigzagDeviation, ZIGZAG_DEVIATION_PCT, zigzagLegendText } from './zigzagLegend';
import { loadZigzagDeviation, saveZigzagDeviation, subscribeZigzagDeviation } from './zigzagPrefs';
import { paneInlineFits } from './paneHeadFit';
import { noteBox } from './noteLabel';
import { playSoftClick } from '../audio/playSoftClick';
import { chartPipSpec } from './pipSpec';
import { planHiLoLabels } from './hiLoLabels';
import { planDayBreaks } from './dayBreaks';
import { projectBarTimeSec, tradingDayStartSec } from './marketHours';
import { planSessionRuns, type SessionId } from './sessions';
import { formatPct, pctDirection, prevSessionFromDaily, validSessionBar } from './dailyChange';
import { useDailyCurrOpen, useDailyPrevBar } from './dailyRefStore';
import { candlesThrough, currentSessionOpen, currentSessionOpenAfter, pivotInput, pivotLabelRank, pivotSessionStartIndex, prevDayFromIntraday } from './pivotBase';
import { candleTimeSec, isSyntheticProvenance, timeframeStepSec } from './dataSource';
import { planLineSegments, planBandStrips, bandStripWidth } from './polyline';
import { loadTemplates, saveTemplate, getTemplatesSaveError, DEFAULT_TEMPLATE } from './chartTemplateStore';
import { useI18n } from '../i18n/I18nContext';
import {
  localizedChartKinds,
  sessionLabel,
  localizedDrawTools,
  localizedIndicators,
  localizedLenses,
} from './typeLabels';
import { confirmDestructive, notify } from './confirmDestructive';
import {
  type ChartKind,
  type ChartPoint,
  type DrawTool,
  type Drawing,
  type IndicatorId,
  type LensMode,
  type SyntheticBar,
  withVolume,
  seriesHasVolume,
  isSyntheticKind,
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
  computeRviSignal,
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
  computeZigZagLegs,
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
  onReplayPrice?: (price: number | null, timeSec?: number | null) => void;
};

/** جذب التقاطع لـO/H/L/C: أقرب من هذا (px) فقط — وإلا يبقى على المستوى الملموس. */
const CROSS_SNAP_PX = 14;
/** مدّة سطر «الرسم مقفول» بعد محاولة سحبه — تكفي لقراءته ولا تبقى فوق الشموع. */
const LOCKED_HINT_MS = 1800;
/** علامة القفل على الرسم نفسه (px) — صغيرة كي لا تغطّي شمعة. */
const LOCK_BADGE_W = 16;
const LOCK_BADGE_H = 15;
/** أقصى شموع مستقبلية لتقاطع التابع بالرباعي — أبعد من ذلك (قائد يومي والتابع دقيقة) لا خطّ. */
const CROSS_SYNC_MAX_AHEAD = 500;
/** الهامش الأيمن الافتراضي من عرض اللوح (≈8 خانات من 80) — `restXPan`. */
const RIGHT_MARGIN_FRAC = 0.1;

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
  channel: '⫽',
  hline: '━',
  hray: '⊢',
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
/** ارتفاع وسم سعر الخطّ/فيبو فوق خطّه (`top: -11` + خطّ 13) — أقرب من ذلك للحافّة العليا يُقلب تحته. */
const LEVEL_LABEL_H = 13;
/** مقبض سحب خطّ التنبيه: بعرض وسمه («🔔 ▲ 1.09250 · +23.4 pip») وارتفاع إصبع حول الخطّ. */
const ALERT_HANDLE_W = 150;
const ALERT_HANDLE_H = 28;
/** أقلّ من هذا (بكسل) رأسياً ⇒ لمسة لا سحب — لا يُعدَّل التنبيه. */
const ALERT_DRAG_SLOP = 4;
const ALERT_NUDGE_ACTIONS = [{ name: 'increment' }, { name: 'decrement' }] as const;
/** أضيق شعاع أفقي يتّسع لوسمه («150.123 · +123.4 pip») داخله؛ أضيق ⇒ الوسم يُقلب يسار بدايته. */
const HRAY_LABEL_ROOM = 150;
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
/** سطر OHLC التقاطع أعلى اللوح بالوضع المدمج (`denseOhlc`). */
const DENSE_OHLC_LINE_H = 12;
/** سطر عدّاد إغلاق الشمعة تحت سعر الوسم الحيّ. */
const COUNTDOWN_LINE_H = 11;

/** آخر شارت نُقر على الويب — أسهم لوحة المفاتيح وEsc له وحده لا لكل شارت بالصفحة. */
let webKeyChart: object | null = null;

/** Alt+حرف ⇒ أداة رسم (اختصارات TradingView الافتراضية)، بالموضع الفيزيائي `KeyboardEvent.code`. */
const WEB_TOOL_HOTKEYS: Partial<Record<string, DrawTool>> = {
  KeyT: 'trend',
  KeyH: 'hline',
  KeyV: 'vline',
  KeyF: 'fib',
};

type DrawingHit = { id: string; dist: number } | null;

/** جناحا رأس السهم على خطّ الترند (`Drawing.arrow`): طول كل جناح بالبكسل وزاويته عن الخطّ. */
const ARROW_HEAD_LEN = 12;
const ARROW_HEAD_SPREAD = [-28, 28] as const;

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
  withHours = spanSeconds <= 2 * 86400,
  prevUnixTime?: number
): string {
  const milliseconds = unixTime > 1e12 ? unixTime : unixTime * 1000;
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime())) return '';
  const p = candleDateParts(date, dayCandles);
  const hh = String(p.hours).padStart(2, '0');
  const mm = String(p.minutes).padStart(2, '0');
  const mon = months[p.month] ?? '';
  // أوّل علامة بعد رأس السنة تحمل السنة: «28 ديسمبر · 4 يناير» بلا سنة لا يُعرف أنّ بينهما سنة جديدة.
  const prevMs = prevUnixTime == null ? Number.NaN : prevUnixTime > 1e12 ? prevUnixTime : prevUnixTime * 1000;
  const newYear =
    Number.isFinite(prevMs) && candleDateParts(new Date(prevMs), dayCandles).year !== p.year;
  const dayMonth = compact
    ? newYear
      ? `${p.day}/${p.month + 1}/${String(p.year).slice(-2)}`
      : `${p.day}/${p.month + 1}`
    : newYear
      ? `${p.day} ${mon}\n${p.year}`
      : `${p.day} ${mon}`;
  if (withHours && !dayCandles) {
    // علامة حدّ اليوم (00:00 بتوقيت العرض) تُطبع بتاريخها وحده كما بـTradingView: «00:00 ↵ 25 سبتمبر»
    // يزاحم علامات الساعة بسطر زائد، والتاريخ وحده يفصل الأيام بنظرة. شمعة الأحد 22:00 تبقى بساعتها.
    if (p.hours === 0 && p.minutes === 0) return dayMonth;
    return `${hh}:${mm}\n${newYear && !compact ? `${p.day} ${mon} ${p.year}` : dayMonth}`;
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
        weekday: date.getUTCDay(),
        hours: date.getUTCHours(),
        minutes: date.getUTCMinutes(),
      }
    : {
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDate(),
        weekday: date.getDay(),
        hours: date.getHours(),
        minutes: date.getMinutes(),
      };
}

/** Full date + time for the crosshair time tag (always explicit, unlike axis ticks). */
function formatCrossTime(
  unixTime: number,
  spanSeconds: number,
  months: string[],
  dayCandles = false,
  weekdays: string[] = [],
  weekCandles = false
): string {
  const milliseconds = unixTime > 1e12 ? unixTime : unixTime * 1000;
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime())) return '';
  const p = candleDateParts(date, dayCandles);
  const mon = months[p.month] ?? '';
  // اليوم بالاسم كما TradingView («Fri 25 Sep 14:00»): شمعة NFP أو إغلاق الجمعة تُقرأ بنظرة بلا حساب
  // تقويم. الأسبوعي والشهري بلا يوم — شمعتهما تبدأ الإثنين/اليوم الأول دائماً فلا يقول الاسم شيئاً.
  const wd = weekCandles ? '' : weekdays[p.weekday] ? `${weekdays[p.weekday]} ` : '';
  // شمعة داخل اليوم تحمل ساعتها دائماً: بمدى > 120 يوماً (4H أو 1H بعد تحميل تاريخ طويل) كان
  // الوسم يطبع «12 سبتمبر 2026» لشمعة 4 ساعات — ست شموع بالوسم نفسه ولا يُعرف أيّها تحت الإصبع.
  if (dayCandles) return `${wd}${p.day} ${mon} ${p.year}`;
  const hh = String(p.hours).padStart(2, '0');
  const mm = String(p.minutes).padStart(2, '0');
  // شمعة من سنة سابقة تحمل سنتها («3 Dec '25 14:00»): تاريخ 4H/1H الطويل يعبر رأس السنة، و«3 Dec»
  // وحدها لا تقول أيّ ديسمبر. شموع السنة الجارية تبقى بلا سنة (الوسم قصير على الهاتف).
  const yr = p.year !== new Date().getFullYear() ? ` '${String(p.year).slice(-2)}` : '';
  return `${wd}${p.day} ${mon}${yr} ${hh}:${mm}`;
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
/**
 * مقبض سحب خطّ التنبيه المُسلَّح (كـTradingView: اسحب التنبيه لسعر آخر بدل حذفه وإنشاء غيره). يُرسم **فوق**
 * سطح إيماءات الشارت وإلا يبتلع اللمسة. المستجيب واحد طوال عمر المقبض والمستدعيات من مرجع يُحدَّث كل إطار —
 * مستجيب جديد كل إطار يفقد حالة السحب الجارية.
 */
function AlertDragHandle({
  top,
  right,
  onStart,
  onDrag,
  onDrop,
}: {
  top: number;
  right: number;
  onStart: () => void;
  onDrag: (dy: number) => void;
  onDrop: (dy: number) => void;
}) {
  const cb = useRef({ onStart, onDrag, onDrop });
  cb.current = { onStart, onDrag, onDrop };
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => cb.current.onStart(),
        onPanResponderMove: (_, g) => cb.current.onDrag(g.dy),
        onPanResponderRelease: (_, g) => cb.current.onDrop(g.dy),
        // سحب قُطع (مكالمة، إيماءة نظام) ⇒ إلغاء لا حفظ نصف سحب.
        onPanResponderTerminate: () => cb.current.onDrop(0),
      }),
    []
  );
  return (
    <View
      style={[
        // فوق سطح الإيماءات (`chartGestureSurface` zIndex 40).
        { position: 'absolute', zIndex: 41, top: top - ALERT_HANDLE_H / 2, right, width: ALERT_HANDLE_W, height: ALERT_HANDLE_H },
        Platform.OS === 'web' && ({ cursor: 'ns-resize', touchAction: 'none', userSelect: 'none' } as never),
      ]}
      {...pan.panHandlers}
    />
  );
}

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

/** طبقات سعر محسوبة من الحجم — «≈» بشارتها حين الحجم تقديري (`volName`). */
const VOLUME_PRICE_OVERLAYS: ReadonlySet<string> = new Set(['vwap', 'vwma', 'vwapBands']);

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
  lowColor = colors.bull,
  signal,
  compact = false,
}: {
  paneId: string;
  name: string;
  values: readonly (number | null)[];
  /** شمعة التقاطع (فهرس داخل نافذة الرسم)، أو null فآخر شمعة. */
  at?: number | null;
  highColor?: string;
  /** لون ما تحت العتبة السفلى — يُعكَس للوحات «فوق = قوّة صاعدة» (TII) كألوان خطّها. */
  lowColor?: string;
  /** الخطّ الثاني (%D) — راجع `PaneSignalValue`. */
  signal?: PaneSignalSpec;
  /** لوحة لا تتّسع لسطر ثالث: ‎%D‎ بجانب ‎%K‎ إن اتّسعا (`PaneInlinePair`)، وإلا ‎%K‎ وحده. */
  compact?: boolean;
}) {
  const v = paneValueAt(values, at);
  // خانات الكسر من **مدى اللوحة** لا ثابتة: ‎%B‎ بين 0 و1 فخانة واحدة تطمس كل قراءاته.
  const txt = formatPaneValue(v, paneBoundedDecimals(paneId));
  const state = paneValueState(paneId, v);
  const sv = signal ? paneValueAt(signal.values, at) : null;
  const stxt = formatPaneValue(sv, paneBoundedDecimals(paneId));
  const stateColor = state === 'high' ? highColor : state === 'low' ? lowColor : null;
  const inline = compact && signal && txt && stxt && paneInlineFits(txt, stxt);
  return (
    <View style={styles.paneHead}>
      <Text style={styles.paneHeadName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {name}
      </Text>
      {inline ? (
        <PaneInlinePair
          first={{ text: txt, style: stateColor ? { color: stateColor } : null }}
          second={{ text: stxt, color: signal.color }}
        />
      ) : txt ? (
        <Text
          style={[
            styles.paneHeadValue,
            state === 'high' && { color: highColor },
            state === 'low' && { color: lowColor },
          ]}
        >
          {txt}
        </Text>
      ) : null}
      {!compact && signal && stxt ? <PaneSignalValue text={stxt} color={signal.color} /> : null}
    </View>
  );
}

/**
 * خطّ الإشارة للوحات ذات الخطّين (MACD، Stoch/StochRSI ‎%D‎، KST، TSI، PMO): كان الرأس يطبع الخطّ الأول وحده
 * — و«MACD» كان يطبع **الهيستوغرام** تحت اسم MACD — بينما التقاطع بين الخطّين هو ما يُقرأ. كـTradingView:
 * القيمتان، كلّ واحدة بلون خطّها. بسطر ثالث حين يتّسع ارتفاع اللوحة (`PANE_SIGNAL_MIN_H`)، وإلا (`compact`)
 * بجانب القيمة الأولى إن اتّسعتا بسطر واحد (`PaneInlinePair`)، فلا يُقصّ نصف رقم بلوحة مضغوطة.
 */
interface PaneSignalSpec {
  values: readonly (number | null | undefined)[];
  color: string;
}
/** أقلّ ارتفاع لوحة يتّسع فيه رأسها لثلاثة أسطر (الاسم، الخطّ، الإشارة) بلا قصّ. */
const PANE_SIGNAL_MIN_H = 42;

function PaneSignalValue({ text, color }: { text: string; color: string }) {
  return (
    <Text style={[styles.paneHeadValue, text.length >= 7 && styles.paneHeadValueLong, { color }]}>
      {text}
    </Text>
  );
}

/**
 * اللوحة المضغوطة (<`PANE_SIGNAL_MIN_H`): القيمتان جنباً لجنب بسطر واحد حين تتّسعان (`paneInlineFits`)
 * — «82.4 71.0» لـStoch بلوحة 34px بدل ‎%K‎ وحده. الأولى يساراً كترتيب TradingView.
 */
function PaneInlinePair({
  first,
  second,
}: {
  first: { text: string; style?: object | false | null };
  second: { text: string; color: string };
}) {
  return (
    <View style={styles.paneHeadRow}>
      <Text style={[styles.paneHeadInline, first.style]}>{first.text}</Text>
      <Text style={[styles.paneHeadInline, { color: second.color }]}>{second.text}</Text>
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
  center = 0,
  signal,
  compact = false,
  hint,
}: {
  name: string;
  values: readonly (number | null | undefined)[];
  /** شرح لقارئ الشاشة — الرأس يصير عنصراً واحداً (الاسم + القيمة) يحمله (حجم تقديري). */
  hint?: string;
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
  /** مركز `'sign'`: الجانب نسبةً إليه لا إلى الصفر (RVI (Vol) حول 50). */
  center?: number;
  /** خطّ الإشارة بلونه — راجع `PaneSignalValue`. */
  signal?: PaneSignalSpec;
  /** لوحة لا تتّسع لسطر ثالث: الإشارة بجانب القيمة إن اتّسعتا، وإلا القيمة وحدها. */
  compact?: boolean;
}) {
  const v = paneValueAt(values, at);
  // المقياس من السلسلة كاملةً لا من الشمعة المقروءة — فلا يتبدّل شكل الرقم
  // بتحرّك التقاطع، وهو نفس سبب اشتقاق الصياغة من مقياس اللوحة أصلاً.
  const txt = formatPaneValueScaled(values, v);
  // الاتّجاه محدود بشمعة التقاطع كالقيمة نفسها — فاللون والرقم يصفان شمعة واحدة.
  const trend = tone === 'trend' ? paneValueTrend(values, at) : null;
  // مقياس السلسلة الأولى نفسه ⇒ الرقمان بالخانات واللاحقة ذاتها فيُقارَنان بنظرة.
  const sv = signal ? paneValueAt(signal.values, at) : null;
  const stxt = signal ? formatPaneValueScaled(values, sv) : null;
  const toneColor =
    (tone === 'sign' && v != null && v > center) || trend === 'up'
      ? colors.bull
      : (tone === 'sign' && v != null && v < center) || trend === 'down'
        ? colors.bear
        : null;
  const inline = compact && signal && txt && stxt && paneInlineFits(txt, stxt);
  return (
    <View style={styles.paneHead} accessible={hint ? true : undefined} accessibilityHint={hint}>
      <Text style={styles.paneHeadName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {name}
      </Text>
      {inline ? (
        <PaneInlinePair
          first={{ text: txt, style: toneColor ? { color: toneColor } : null }}
          second={{ text: stxt, color: signal.color }}
        />
      ) : txt ? (
        <Text
          style={[
            styles.paneHeadValue,
            txt.length >= 7 && styles.paneHeadValueLong,
            toneColor ? { color: toneColor } : null,
          ]}
        >
          {txt}
        </Text>
      ) : null}
      {!compact && signal && stxt ? <PaneSignalValue text={stxt} color={signal.color} /> : null}
    </View>
  );
}

/**
 * رأس لوحة **ذات سلسلتين** (Gator، وبـ`tone="sign"` DMI وVortex وRWI وAroon وKlinger):
 * الاسم، وتحته الفارق `upper − lower` عند شمعة التقاطع — للتقاطعات إشارته هي أيّ الخطّين فوق.
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
  lineColors,
  compact = false,
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
  /**
   * لونا الخطّين (الأعلى ثم الأدنى) ⇒ القيمتان نفسهما سطرين بلونيهما بدل الفارق — كـTradingView:
   * «+DI 25.1 / −DI 20.8» لا «4.3» الذي لا تطبعه أيّ منصّة، ومنه لا يُعرف أقويّ الاتجاه (ADX يُقرأ مع
   * مستوى DI لا فارقه). يُمرَّر فقط حين تتّسع اللوحة لثلاثة أسطر (`PANE_SIGNAL_MIN_H`)، وإلا الفارق.
   */
  lineColors?: readonly [string, string];
  /** لوحة لا تتّسع لسطر ثالث: القيمتان بسطر واحد إن اتّسعتا (`paneInlineFits`)، وإلا الفارق. */
  compact?: boolean;
}) {
  const spread = useMemo(() => paneSpreadSeries(upper, lower), [upper, lower]);
  // مقياس واحد للسلسلتين ⇒ الرقمان بالخانات واللاحقة ذاتها.
  const both = useMemo(() => [...upper, ...lower], [upper, lower]);
  const v = paneValueAt(spread, at);
  const txt = formatPaneValueScaled(spread, v);
  const trend = tone === 'trend' ? paneValueTrend(spread, at) : null;
  if (lineColors) {
    const u = formatPaneValueScaled(both, paneValueAt(upper, at));
    const l = formatPaneValueScaled(both, paneValueAt(lower, at));
    if (u && l && (!compact || paneInlineFits(u, l))) {
      return (
        <View style={styles.paneHead}>
          <Text style={styles.paneHeadName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {name}
          </Text>
          {compact ? (
            <PaneInlinePair first={{ text: u, style: { color: lineColors[0] } }} second={{ text: l, color: lineColors[1] }} />
          ) : (
            <>
              <PaneSignalValue text={u} color={lineColors[0]} />
              <PaneSignalValue text={l} color={lineColors[1]} />
            </>
          )}
        </View>
      );
    }
  }
  return (
    <View style={styles.paneHead}>
      <Text style={styles.paneHeadName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {name}
      </Text>
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

/**
 * لوحة **خطّ واحد يدور حول الصفر** (TRIX، DPO، Coppock، CCI، ROC، Momentum، Force، Chaikin،
 * CMF، EOM، BOP) — كما ترسمها TradingView: خطّ
 * وخطّ صفر، لا أعمدة. كانت أعمدة بلون الجانب وحده، فانعطاف الخطّ (ما يُقرأ من TRIX
 * وCoppock قبل تقاطع الصفر بشموع) لا يُرى إلا بمقارنة أطوال أعمدة متجاورة بالعين.
 * اللون يبقى للجانب — نفس دلالة رقم الرأس فوقها. المقياس والموضع بهندسة MACD
 * (`macdPaneGeom` بالسلسلة نفسها للثلاث)، فالصفر بمنتصف مساحة الرسم كالأعمدة سابقاً.
 */
/** خطّ واحد بطبقة `PaneLineLayer`: قيمه ولونه (ثابت، أو لكل قطعة بفهرس طرفها الثاني). */
interface PaneLineSpec {
  values: readonly (number | null)[];
  color: string | ((i: number) => string);
  opacity?: number;
}

/**
 * خطوط لوحة المؤشّر قطعاً متّصلة بين الشموع (`planLineSegments`، كطبقات السعر) لا شرطة
 * أفقية لكل عمود: الشرطات تُقرأ خطّاً ما دامت الحركة بطيئة، وعند قفزة (خبر، أو تكبير
 * لعشرين شمعة فخطوة العمود ‎~16px‎) تصير درجات منفصلة بفراغات عمودية — بالضبط حيث يُقرأ
 * الانعطاف والتقاطع. الطبقة مطلقة بعرض صفّ الأعمدة كلّه (`paneInner` بلا حشوة)،
 * فالعمود `i` مركزه ‎(i + ½) × w / n‎ كما كان عمود ‎flex: 1‎ تماماً، والتقاطع العمودي
 * ما زال فوق شمعته. `y` تعطي **مركز** الخطّ (سُمكه 2px).
 */
function PaneLineLayer({
  lines,
  y,
  innerH,
}: {
  lines: readonly PaneLineSpec[];
  y: (v: number) => number;
  innerH: number;
}) {
  const [w, setW] = useState(0);
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, right: 0, top: 0, height: innerH }}
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
    >
      {w > 0
        ? lines.map((ln, k) => {
            const n = ln.values.length;
            return planLineSegments(ln.values, (i) => ((i + 0.5) * w) / n, y).map((sg) => (
              <View
                key={`${k}:${sg.at}`}
                style={{
                  position: 'absolute',
                  left: sg.left,
                  top: sg.top - 1,
                  width: sg.len,
                  height: 2,
                  backgroundColor: typeof ln.color === 'string' ? ln.color : ln.color(sg.at),
                  opacity: ln.opacity,
                  transform: [{ rotate: `${sg.deg}deg` }],
                  transformOrigin: 'left center',
                }}
              />
            ));
          })
        : null}
    </View>
  );
}

/**
 * لوحة بمدى ثابت (RSI وأخواته 0..100، CMO ‎−100..100‎) خطّاً متّصلاً. كانت شرطة 3px لكل
 * عمود حافّتها العليا عند القيمة — فالخطّ عند 70 يقع **تحت** خطّ العتبة 70 بـ1.5px، وقيمة 0
 * تخرج كلّها أسفل مساحة الرسم. الآن مركز الخطّ على القيمة بمعادلة `paneGuides` نفسها
 * (‎top = (max − v) / (max − min) × innerH‎)، مقصوصاً داخل المساحة. اللون لكل قطعة بقيمة
 * طرفها الثاني — دلالة المنطقة كما كانت الشرطات.
 */
/** مركز خطّ قيمته `v` بلوحة مداها ثابت ‎[min, max]‎ — معادلة `paneGuides`، مقصوصاً داخل المساحة. */
function boundedPaneY(innerH: number, min: number, max: number) {
  return (v: number) => Math.min(Math.max(((max - v) / (max - min)) * innerH, 1), Math.max(1, innerH - 1));
}

function BoundedLineSeries({
  values,
  paneH,
  color,
  min = 0,
  max = 100,
}: {
  values: readonly (number | null)[];
  paneH: number;
  color: (v: number) => string;
  min?: number;
  max?: number;
}) {
  const innerH = Math.max(0, paneH - 16);
  return (
    <PaneLineLayer
      innerH={innerH}
      y={boundedPaneY(innerH, min, max)}
      lines={[{ values, color: (i) => color(values[i] ?? min) }]}
    />
  );
}

/**
 * لوحة تراكمية بلا مدى ثابت (OBV، A/D، CVD، NVI/PVI، VPT، Net Vol، Williams A/D) خطّاً
 * متّصلاً على مدى النافذة المرئية. كانت شرطة 3px لكل عمود حافّتها العليا عند القيمة: قاع
 * النافذة يقع كلّه تحت مساحة الرسم، وتباعد OBV عن السعر — ما يُقرأ منه — يتفكّك درجاتٍ عند
 * كل قفزة حجم. اللون لكل قطعة باتّجاهها (طرفها الثاني ≥ الأوّل) كما كانت الشرطات؛ أوّل شمعة
 * بلا قطعة كما كانت بلا شرطة.
 */
function TrendLineSeries({
  values,
  paneH,
  levels,
}: {
  values: readonly (number | null)[];
  paneH: number;
  /**
   * عتبات ثابتة (Mass Index ‎27 / 26.5‎). تدخل المقياس كـCCI ‎±100‎: بلا ذلك تقصّها نافذة
   * هادئة (Mass Index بين 24 و26) على الحافّة العليا فيبدو كل ارتفاع عادي «انتفاخاً».
   */
  levels?: readonly number[];
}) {
  const innerH = Math.max(0, paneH - 16);
  const vals = values.filter((x): x is number => x != null);
  const scaleVals = levels && vals.length ? [...vals, ...levels] : vals;
  const min = Math.min(...scaleVals);
  const max = Math.max(...scaleVals);
  const guides = levels ? placeScaledGuides(levels, min, max, innerH) : [];
  return (
    <>
      {guides.map((g) => (
        <React.Fragment key={g.v}>
          <View pointerEvents="none" style={[styles.paneGuideLine, { top: g.top }]} />
          {g.label ? (
            <View pointerEvents="none" style={[styles.paneGuideLabelBox, { top: Math.max(0, g.top - 5) }]}>
              <Text style={styles.paneGuideLabel}>{g.label}</Text>
            </View>
          ) : null}
        </React.Fragment>
      ))}
      <PaneLineLayer
        innerH={innerH}
        // نافذة مسطّحة (مدى صفر) ⇒ الخطّ بمنتصف اللوحة لا قسمة على صفر.
        y={max > min ? boundedPaneY(innerH, min, max) : () => innerH / 2}
        lines={[
          {
            values,
            color: (i) => {
              const prev = values[i - 1];
              return prev == null || (values[i] ?? prev) >= prev ? colors.bull : colors.bear;
            },
            opacity: 0.9,
          },
        ]}
      />
    </>
  );
}

/**
 * Mass Index (Dorsey، مجموع 25): «انتفاخ الانعكاس» — صعود فوق 27 ثم هبوط تحت 26.5.
 * العتبتان لطول 25 تحديداً (طول 10 بـTradingView يدور حول 10 فلا ينطبقان عليه).
 */
const MASS_INDEX_LEVELS = [27, 26.5] as const;

/** Net Volume قيمة لكل شمعة حول الصفر (±فوليومها) ⇒ خطّ الصفر يفصل ضغط الشراء عن البيع. */
const NET_VOLUME_LEVELS = [0] as const;

/** CCI: ‎±100‎ حدّا «النطاق العادي» اللذان يُقرأ المؤشّر بتجاوزهما (خطّا TradingView الافتراضيّان). */
const CCI_LEVELS = [100, -100] as const;

/** Fisher Transform: خطوط TradingView الافتراضية — ‎±1.5‎ تطرّف و‎±0.75‎ منطقة الانعطاف. */
const FISHER_LEVELS = [1.5, 0.75, -0.75, -1.5] as const;

function ZeroLineSeries({
  values,
  paneH,
  levels,
}: {
  values: readonly (number | null)[];
  paneH: number;
  /**
   * مستويات ثابتة متناظرة حول الصفر تُرسم خطوطاً (CCI ‎±100‎). تدخل **بالمقياس** نفسه:
   * لولا ذلك لقصّ نافذةٌ هادئة (CCI بين ‎±60‎) الخطّين على حافتَي اللوحة فيبدو كل
   * تذبذب عادي «تجاوزاً» لهما.
   */
  levels?: readonly number[];
}) {
  const reach = levels && levels.length ? Math.max(...levels.map(Math.abs)) : null;
  // `hist` بـmacdPaneGeom يدخل المقياس عند الشموع الصالحة وحدها — فسلسلة ثابتة بقيمة
  // أبعد مستوى تضمن اتّساع المقياس له دون أن تُرسم.
  const floor = useMemo(() => (reach == null ? values : values.map(() => reach)), [values, reach]);
  const g = macdPaneGeom(floor, values, values, paneH);
  const showLevels = levels && g.innerH >= GUIDES_MIN_INNER_H;
  const showLabels = g.innerH >= GUIDES_LABEL_MIN_INNER_H;
  return (
    <>
      <View pointerEvents="none" style={[styles.paneZeroLine, { top: g.zeroY }]} />
      {showLevels
        ? levels.map((lv) => (
            <React.Fragment key={lv}>
              <View pointerEvents="none" style={[styles.paneGuideLine, { top: g.y(lv) }]} />
              {showLabels ? (
                <View
                  pointerEvents="none"
                  style={[styles.paneGuideLabelBox, { top: Math.max(0, g.y(lv) - 5) }]}
                >
                  <Text style={styles.paneGuideLabel}>{String(lv)}</Text>
                </View>
              ) : null}
            </React.Fragment>
          ))
        : null}
      <PaneLineLayer
        innerH={g.innerH}
        y={g.y}
        lines={[{ values, color: (i) => ((values[i] ?? 0) >= 0 ? colors.bull : colors.bear) }]}
      />
    </>
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
  const [zigzagDev, setZigzagDev] = useState<number>(ZIGZAG_DEVIATION_PCT);
  const [lineBreakCount, setLineBreakCount] = useState<number>(LINE_BREAK_COUNT);
  const panSpeedMulRef = useRef(panSpeedMultiplier(panSpeed));
  panSpeedMulRef.current = panSpeedMultiplier(panSpeed);
  const [pineFormula, setPineFormula] = useState('');
  const [pineOn, setPineOn] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const noteEditPushed = useRef(false);
  const [kind, setKind] = useState<ChartKind>(initialKind ?? 'candles');
  const kindRef = useRef(kind);
  kindRef.current = kind;
  // مفتاح الشمعة التي انتهى عدّادها (رمز|فريم|وقت) — يُقصَّر وسم السعر لسطر واحد حتى شمعة جديدة.
  const [countdownEndedKey, setCountdownEndedKey] = useState<string | null>(null);
  const [lens, setLens] = useState<LensMode>(initialLens ?? 'clean');
  const [extraInd, setExtraInd] = useState<IndicatorId[]>(initialIndicators ?? []);
  const [tool, setTool] = useState<DrawTool>(initialTool ?? 'none');
  // إخفاء الرسومات مؤقّتاً لقراءة الشموع نظيفة (خطوط وقنوات تغطّي شاشة الهاتف) بلا حذفها.
  // اختيار أي أداة رسم يُظهرها: لا يرسم المتداول خطّاً لا يراه.
  const [drawingsHidden, setDrawingsHidden] = useState(false);
  useEffect(() => {
    if (tool !== 'none') setDrawingsHidden(false);
  }, [tool]);
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
  // لمعالج أسهم العرض: لا يحرّك العرض والأسهم تحرّك الرسم المحدَّد.
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;
  const drawHistory = useRef<Drawing[][]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [pending, setPending] = useState<ChartPoint | null>(null);
  const [dragEnd, setDragEnd] = useState<ChartPoint | null>(null);
  // مرساة التقاطع **بزمن الشمعة** لا بفهرسها داخل النافذة — راجع `crossAnchor.ts`:
  // النافذة متحرّكة، فالفهرس وحده يجعل القراءة تتبع الخانة لا الشمعة المختارة.
  // `price` سعر موضع اللمسة (بالمغناطيس إن كان مفعّلاً) — `null` ⇒ لا خطّ أفقي.
  // `ahead`: خانات فارغة يمين الشمعة `time` (منطقة المستقبل) — الخطّ ووسم الزمن هناك، والقيم من الشمعة.
  const [cross, setCross] = useState<{ time: number; price: number | null; ahead?: number } | null>(null);
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
  const replayOnRef = useRef(false);
  replayOnRef.current = replayOn;
  // تبديل الرمز/الفريم يُنهي الإعادة (أدناه) — كانت تختفي بلا أثر فيظنّ المتداول أن الشموع الظاهرة
  // ما زالت نقطة الإعادة. سطر القراءة يقول ذلك لبضع ثوانٍ.
  const [replayEndedNotice, setReplayEndedNotice] = useState(false);
  useEffect(() => {
    if (!replayEndedNotice) return;
    const id = setTimeout(() => setReplayEndedNotice(false), 6000);
    return () => clearTimeout(id);
  }, [replayEndedNotice]);
  const [replayStep, setReplayStep] = useState(15);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [logScale, setLogScale] = useState(false);
  /** مقياس النسبة (كـTradingView «Percent»): المحور يقرأ التغيّر عن أول شمعة ظاهرة — يستبعد اللوغاريتمي. */
  const [percentScale, setPercentScale] = useState(false);
  const [magnet, setMagnet] = useState(true);
  // طرفا آخر قياس لا نصّه: النصّ المجمَّد كان **لا يُمسح أبداً** — بعد قياس واحد يحلّ محلّ
  // سطر OHLC للتقاطع ويُخفي زرّ 🔔 للأبد، ويبقى pip اليورو مكتوباً فوق شارت الين بعد
  // التبديل. الآن يُمسح بأول نقرة/قياس جديد وبتبديل الرمز/الفريم/نوع الشارت، ويُحسب نصّه عند الرسم.
  // نوع الشارت أيضاً: طرفاه فهارس شموع، فعلى Renko/Range تقع فوق لبنات أخرى وعدد الشموع والمدّة كاذبان.
  const [measureDone, setMeasureDone] = useState<{ a: ChartPoint; b: ChartPoint } | null>(null);
  useEffect(() => {
    setMeasureDone(null);
  }, [series.symbol, series.timeframe, kind]);
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
  // هامش يمين افتراضي كـTradingView: آخر شمعة لا تلتصق بمحور السعر، وتظهر منطقة المستقبل (سحابة
  // Ichimoku المُسقَطة، Alligator، التقاطع بعد الشمعة الحيّة) بلا سحب. كان 0 ⇒ السحابة القادمة لا تُرى إلا
  // بسحب الشارت يساراً. بكسلات من عرض اللوح الحالي؛ `xPanAtRest` يعيد حسابه إن تغيّر العرض قبل أي سحب.
  const restXPan = useCallback(
    () => (canPan ? -Math.round(chartPlotWRef.current * RIGHT_MARGIN_FRAC) : 0),
    [canPan]
  );
  const xPanAtRest = useRef(true);
  const chartPlotHRef = useRef(200);
  const sourceRef = useRef({
    plot: [] as { time: number; close: number; open: number; high: number; low: number }[],
    start: 0,
    windowLen: 80,
    all: [] as unknown[],
  });
  // زمن آخر شمعة مصدر: على Renko/Range آخر لبنة قد تسبقه بساعات — نهاية السلسلة لإرساء الرسومات
  // (`drawingAnchors.ts` `endTime`)، وإلا وقع طرف المستقبل المرسوم على Renko بالماضي على الشموع.
  const sourceEndRef = useRef<number | undefined>(undefined);
  const sourceEndTime = () => sourceEndRef.current;

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
  const paneSignalFits = paneH >= PANE_SIGNAL_MIN_H;
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
    xPanRef.current = restXPan();
    xPanAtRest.current = true;
    setXPan(xPanRef.current);
    // التقاطع المثبَّت يخصّ الرمز السابق: بالفريم نفسه تُوجد شمعة بزمنه غالباً، فكان يبقى
    // على الزوج الجديد بسعر الزوج القديم (وسم «1.085» فوق محور الين) ما دام الشارت مركَّباً.
    setCross(null);
    crossPinned.current = false;
    syncKeyRef.current = '';
    // الإعادة تخرج مع التبديل: خطوتها فهرس داخل نافذة الفريم السابق، فكانت الخطوة 12 من 80 على 15m
    // (~17 ساعة للخلف) تصير على 1H ~68 ساعة ويوماً آخر، وعلى زوج آخر يستمرّ التشغيل فوق شموع لم يخترها.
    if (replayOnRef.current) setReplayEndedNotice(true);
    setReplayOn(false);
    setReplayPlaying(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- restXPan تتبع canPan وعرض اللوح وحدهما
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

  useEffect(() => {
    let alive = true;
    void loadZigzagDeviation().then((pct) => {
      if (alive) setZigzagDev(pct);
    });
    void loadLineBreakCount().then((n) => {
      if (alive) setLineBreakCount(n);
    });
    // الشارتات المفتوحة معاً تتبع تغيير الشريحة بأيّها فوراً.
    const offZz = subscribeZigzagDeviation(setZigzagDev);
    const offLb = subscribeLineBreakCount(setLineBreakCount);
    return () => {
      alive = false;
      offZz();
      offLb();
    };
  }, []);

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
                : kind === 'lineBreak'
                  ? lineBreak(all, lineBreakCount)
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
    lineBreakCount,
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
  const heldViewRef = useRef<{ key: string; lastSec: number | null; len: number; all: TimeBar[] }>({
    key: '',
    lastSec: null,
    len: 0,
    all: [],
  });
  useLayoutEffect(() => {
    const all = source.all as TimeBar[];
    const key = `${series.symbol}|${series.timeframe}|${kind}`;
    const last = all[all.length - 1];
    const lastSec = last ? barTime(last) : null;
    const prev = heldViewRef.current;
    if (prev.key === key && prev.len === all.length && prev.lastSec === lastSec) return; // تيك بالشمعة نفسها
    heldViewRef.current = { key, lastSec, len: all.length, all };
    // تبديل نوع الشارت (الرمز/الفريم نفساهما): الإزاحة بالخانات لا تعني شيئاً بالنوع الجديد — تُنقل
    // بالزمن (`offsetAtTime`) فيبقى الطرف الأيمن على الموضع الذي كان المتداول يدرسه.
    if (
      prev.key !== key &&
      !syncFollow &&
      offsetRef.current > 0 &&
      prev.key.slice(0, prev.key.lastIndexOf('|')) === key.slice(0, key.lastIndexOf('|')) &&
      prev.all.length > 0
    ) {
      const right = prev.all[prev.all.length - 1 - Math.min(offsetRef.current, Math.max(0, prev.all.length - 10))];
      const next = offsetAtTime(all.map(barTime), right ? barTime(right) : null);
      if (next !== offsetRef.current) {
        offsetRef.current = next;
        setOffset(next);
      }
      return;
    }
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
  // تقاطع بالمنطقة المستقبلية (`ahead` بعد آخر شمعة): يُنشر زمنه المستقبلي من آخر شمعة مصدر + `ahead` خطوة.
  // كان يُنشر زمن آخر شمعة وحده ⇒ خطّ التابعين على شمعتهم الحيّة والقائد بعدها بعشر شموع.
  const lastCandleTime = liveSeries.candles[liveSeries.candles.length - 1]?.time;
  const crossFutureSec =
    cross?.ahead && crossBar && crossBar === source.all[source.all.length - 1] && lastCandleTime != null
      ? Math.max(candleTimeSec(barTime(crossBar)), candleTimeSec(lastCandleTime)) +
        cross.ahead * timeframeStepSec(series.timeframe)
      : null;
  const crossTimeSec = cross
    ? crossFutureSec ?? candleTimeSec(crossBar ? barTime(crossBar) : cross.time)
    : null;
  const crossTimeRef = useRef<number | null>(null);
  crossTimeRef.current = cross?.time ?? null;
  // تبديل نوع الشارت يُسقط التقاطع المثبَّت: زمنه زمن خانة النوع السابق، وخانات Renko/Range/Kagi/P&F أزمنة
  // تركيبية (أول شمعة + 60ث × الترتيب) ⇒ على 1m تطابق شمعةً حقيقية لا علاقة لها باللبنة، فيقفز الخطّ (ووسمه
  // وسطر OHLC) إلى الماضي بصمت. تقاطع التابع بالرباعي يعيد ربطه أثر المزامنة أدناه بالزمن الحقيقي.
  useEffect(() => {
    if (crossFromSync.current) return;
    crossPinned.current = false;
    setCross(null);
  }, [kind]);
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
    const synthetic = isSyntheticKind(kind);
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
    let time = i != null ? source.plot[i]!.time : null;
    // زمن القائد بعد آخر شمعة هنا (تقاطعه بالمنطقة المستقبلية) ⇒ الخطّ بعد آخر شمعة بعدد خطوات فريم هذا
    // الشارت (ساعة +3 على الساعة = +12 على 15د)، كما يرسم المتداول تقاطعه هناك بنفسه.
    let ahead = 0;
    const step = timeframeStepSec(series.timeframe);
    // قبل `i`: زمن = آخر شمعة + خطوة بالضبط (قائد +1 على الفريم نفسه) يقع بحدّ `indexAtOrBeforeTime` على الحيّة.
    // Renko/Kagi/P&F/Range: خانة بعد آخر لبنة ليست خطوة فريم (لبنةٌ قد تستغرق ساعات أو ثوانٍ) — كان الخطّ يُرسم
    // k لبنةً يمينها فيوحي بزمن لا يقابله شيء؛ لا خطّ بالمستقبل هنا (تقاطع المتداول نفسه لا يدخله كذلك).
    if (!synthetic && syncCrossTime != null && atSeriesEnd && lastCandle && step > 0) {
      const k = Math.floor((syncCrossTime - candleTimeSec(lastCandle.time)) / step);
      if (k >= 1 && k <= CROSS_SYNC_MAX_AHEAD) {
        time = source.plot[source.plot.length - 1]!.time;
        ahead = k;
      }
    }
    crossFromSync.current = true;
    setCross((prev) =>
      time == null
        ? null
        : prev && prev.time === time && prev.price == null && (prev.ahead ?? 0) === ahead
          ? prev
          : ahead
            ? { time, price: null, ahead }
            : { time, price: null }
    );
  }, [syncCrossTime, source.plot, source.all, kind, liveSeries.candles, series.timeframe]);

  // الرسومات تتبع شموعها بالزمن لا بالخانة — راجع `drawingAnchors.ts`. لا يعمل قبل أن
  // تُحمَّل رسومات هذا الرمز/الفريم (`drawings === loadedDrawings`)، ويعيد المصفوفة نفسها
  // حين لا تغيير فلا رسم ولا كتابة بكل تيك.
  useEffect(() => {
    if (drawings !== loadedDrawings) return;
    const synthetic = isSyntheticKind(kind);
    const next = anchorDrawings(
      loadedDrawings,
      source.all as { time: number }[],
      timeframeStepSec(series.timeframe),
      synthetic,
      liveSeries.candles[liveSeries.candles.length - 1]?.time
    );
    if (next !== loadedDrawings) setDrawings(next);
  }, [drawings, loadedDrawings, source.all, kind, series.timeframe, liveSeries.candles]);

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
  const seriesDemo = isSyntheticProvenance(series.data_source);
  // تنبيهات الرمز المُسلَّحة خطوطاً على الشارت (`armedAlerts.ts`) — لا على سلسلة تجريبية (سلّمها ليس السوق) ولا شارت درس.
  const armedAlerts = useArmedAlerts(interactive && !seriesDemo && !hideGrid ? series.symbol : null);
  // سحب خطّ تنبيه: السعر المعاين أثناء السحب (الخطّ والوسم يتبعان الإصبع)، والحفظ عند الإفلات.
  const [alertDrag, setAlertDrag] = useState<{ id: string; price: number } | null>(null);
  const alertDragStartY = useRef(0);
  // ضبط التنبيه بقارئ الشاشة (سحبة أعلى/أسفل): المعاين كالسحب، والحفظ بعد توقّف قصير — `nudgeAlert`.
  const alertNudge = useRef<{ al: { id: string; price: number; condition: 'above' | 'below' }; price: number } | null>(null);
  const alertNudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (alertNudgeTimer.current) clearTimeout(alertNudgeTimer.current);
  }, []);
  const createAlert = (price: number, origin?: 'drawing' | 'crosshair') => {
    if (!onCreateAlert) return;
    onCreateAlert(price, origin);
    refreshArmedAlertsSoon();
  };
  const dailyPrevBar = useDailyPrevBar(anyPivot && !seriesDemo ? series.symbol : null);
  const dailyCurrOpen = useDailyCurrOpen(
    indicators.includes('woodiePivots') && !seriesDemo ? series.symbol : null
  );
  // بالإعادة: «الجلسة السابقة» لشمعة الإعادة لا لليوم — كانت PDH/PDL والارتكاز كلّها مستويات اليوم
  // مرسومةً فوق شموع الأسبوع الماضي، أي أهدافاً من المستقبل يرتدّ عندها السعر «بدقّة» في التمرين.
  // شموع D1 من المخزن مستويات اليوم فتُترك، والأساس من شموع السلسلة حتى شمعة الإعادة (ناقصة ⇒ لا خطوط).
  const replayLast = replayOn ? source.plot[source.plot.length - 1] : undefined;
  const replayCutSec = replayLast ? candleTimeSec(barTime(replayLast)) : null;
  const replayClose = replayLast && Number.isFinite(replayLast.close) ? replayLast.close : null;
  const onReplayPriceRef = useRef(onReplayPrice);
  onReplayPriceRef.current = onReplayPrice;
  useEffect(() => {
    onReplayPriceRef.current?.(replayClose, replayCutSec);
  }, [replayClose, replayCutSec]);
  useEffect(() => () => onReplayPriceRef.current?.(null), []);
  const pivotBars = useMemo(() => {
    if (!anyPivot) return null;
    const candles = candlesThrough(series.candles ?? [], replayCutSec);
    const intraday = timeframeStepSec(series.timeframe) < 86400;
    // داخل اليوم: الجلسة المجمَّعة بحدّ 17:00 نيويورك **أوّلاً** — هو يوم منصّات MT4/MT5 (خوادم
    // GMT+2/+3). شموع D1 من المزوّد بيوم UTC، فكانت PDH/PDL تقفز بين حدّين حسب نجاح جلبها؛ الآن D1
    // احتياط فقط حين لا تغطّي السلسلة الجلسة السابقة كاملة (مثلاً 1m بـ180 شمعة).
    const fromIntraday = intraday ? validSessionBar(prevDayFromIntraday(candles, series.symbol)) : null;
    // افتتاح الجلسة الجارية لمحور Woodie. D/W: شمعة D1 التالية للسابقة (مخزن D1) — كان إغلاق السابقة دائماً.
    const currOpen = intraday ? currentSessionOpen(candles, series.symbol) : null;
    if (fromIntraday) return pivotInput(fromIntraday, currOpen);
    const fromDaily = seriesDemo || replayCutSec != null ? null : validSessionBar(dailyPrevBar);
    if (fromDaily) return pivotInput(fromDaily, intraday ? currOpen : dailyCurrOpen);
    if (!intraday) {
      const secs = candles.map((c) => ({ ...c, time: candleTimeSec(c.time) }));
      const prev = validSessionBar(prevSessionFromDaily(secs, replayCutSec ?? Date.now() / 1000, series.symbol));
      return pivotInput(prev, currentSessionOpenAfter(secs, prev));
    }
    return null;
  }, [anyPivot, seriesDemo, dailyPrevBar, dailyCurrOpen, series.candles, series.timeframe, series.symbol, replayCutSec]);
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
      setPercentScale(!tpl.logScale && tpl.percentScale === true);
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
      const synthetic = isSyntheticKind(km);
      return anchorDrawings(
        d,
        sourceRef.current.all as { time: number }[],
        timeframeStepSec(series.timeframe),
        synthetic,
        sourceEndTime()
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
      // تعديل هنا ينتظر الحفظ المؤجَّل (400ms) أقدمُ من كتابة الشارت الآخر: كان يُكتب بعدها فوقها ⇒ التخزين
      // يعود لقائمة هذا الشارت القديمة بينما الشاشتان تعرضان الأحدث، ويضيع تعديل الآخر عند الفتح التالي.
      saveQueue.cancel();
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

  const toggleDrawingsHidden = useCallback(() => {
    setDrawingsHidden((h) => !h);
    setSelectedId(null);
    setPending(null);
    setDragEnd(null);
    setTool('none');
  }, []);

  const undoDrawing = useCallback(() => {
    const hist = drawHistory.current;
    if (!hist.length) return;
    const prev = hist[hist.length - 1]!;
    drawHistory.current = hist.slice(0, -1);
    setCanUndo(drawHistory.current.length > 0);
    setDrawingsHidden(false); // لا تراجع عن رسم لا يُرى
    // اللقطة قد تكون من فريم آخر (التاريخ يبقى عبر تبديل الفريم): تُرسى على شموع هذا الفريم
    // قبل العرض، لا إطاراً بمواضع ذلك الفريم.
    const km = kindRef.current;
    const synthetic = isSyntheticKind(km);
    setDrawings(
      anchorDrawings(
        prev,
        sourceRef.current.all as { time: number }[],
        timeframeStepSec(series.timeframe),
        synthetic,
        sourceEndTime()
      )
    );
    setSelectedId(null);
    setPending(null);
    setDragEnd(null);
  }, [series.timeframe]);

  // لون الرسم المحدَّد: كل رسم كان يُرسم بلون تمييز الشارت وحده، فالدعم والمقاومة وخطّ الترند وفيبو
  // بلون واحد لا يُفرَّق بينها بنظرة (TradingView يلوّن كل رسم). النقر يدور على لوحة قصيرة؛ قابل للتراجع
  // ويُحفظ مع الرسم (`color` جزء منه أصلاً). خطّتا شراء/بيع والقياس ألوانها دلالية (ربح/خسارة) فلا تُلوَّن.
  // `drawPaletteNames[i]` ← `tr.mcColorNames` بنفس الترتيب؛ إزالة المكرّر (لون التمييز = أحد الألوان) تُسقط الاسم معه.
  const [drawPalette, drawPaletteNames] = useMemo(() => {
    const raw = [accent, colors.bull, colors.bear, colors.warn, colors.dxy, colors.text];
    const cols: string[] = [];
    const names: string[] = [];
    raw.forEach((c, i) => {
      if (cols.includes(c)) return;
      cols.push(c);
      names.push(tr.mcColorNames[i] ?? '');
    });
    return [cols, names] as const;
  }, [accent, tr]);
  const recolorTarget = selectedId ? drawings.find((x) => x.id === selectedId) ?? null : null;
  const canRecolor =
    !!recolorTarget &&
    recolorTarget.tool !== 'long' &&
    recolorTarget.tool !== 'short' &&
    recolorTarget.tool !== 'measure';
  const cycleSelectedColor = useCallback(() => {
    if (!selectedId) return;
    const d = drawingsRef.current.find((x) => x.id === selectedId);
    if (!d) return;
    const i = drawPalette.indexOf(d.color);
    const color = drawPalette[(i + 1) % drawPalette.length]!;
    pushDrawHistory();
    setDrawings((list) => list.map((x) => (x.id === selectedId ? { ...x, color } : x)));
  }, [selectedId, drawPalette, pushDrawHistory]);
  const recolorIdx = recolorTarget ? drawPalette.indexOf(recolorTarget.color) : -1;
  const colorLabels = {
    word: tr.mcDrawColorWord,
    a11y: tr.mcDrawColorA11y.replace('{color}', drawPaletteNames[recolorIdx] ?? drawPaletteNames[0] ?? ''),
  };
  // أزرار الإزاحة للرسم المحدَّد (`nudgeSelectedDrawing`) — الزمن يسار⇐يمين بالشارت بكل اللغات.
  const nudgeButtons = [
    { key: 'up', icon: '▲', bars: 0, steps: 1, a11y: tr.mcNudgeUpA11y },
    { key: 'down', icon: '▼', bars: 0, steps: -1, a11y: tr.mcNudgeDownA11y },
    { key: 'earlier', icon: '◀', bars: -1, steps: 0, a11y: tr.mcNudgeEarlierA11y },
    { key: 'later', icon: '▶', bars: 1, steps: 0, a11y: tr.mcNudgeLaterA11y },
  ];

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

  const compareOv = useMemo(() => {
    if (!compareSeries?.candles?.length || source.plot.length < 2) return null;
    return compareOverlay(source.plot, compareSeries.candles, timeframeStepSec(series.timeframe));
  }, [compareSeries, source.plot, series.timeframe]);
  const comparePrices = compareOv?.prices ?? null;

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
  // السلسلة بلا فوليوم (الفوركس يُرسل 0) ⇒ كل لوحة مشتقّة من الحجم تُحسب من تقدير `withVolume` ⇒ «≈» برأسها،
  // كي لا يقارن المتداول OBV/Klinger/MFI هنا بأرقام منصّة تعرض حجم التيك من وسيطها (QA35).
  const volEstimated = useMemo(() => !seriesHasVolume(liveSeries.candles), [liveSeries.candles]);
  const volName = (name: string) => (volEstimated ? `${name} ≈` : name);
  const closes = useMemo(() => indBars.map((c) => c.close), [indBars]);
  const ind = <R,>(r: R): R => trimIndicator(r, indBars.length, indBase.cut);
  // الناظرة للأمام (Chikou/Fractals/Pivots HL/ZigZag) على السلسلة كلّها ثم تُقصّ من الطرفين — التمرير للخلف كان
  // يُفرغ حافّتها اليمنى رغم تحميل الشموع اللاحقة (`indicatorRangeBase`). بالإعادة حتى شمعتها فقط.
  const aheadBase = useMemo(
    () => indicatorRangeBase(source.all, source.start, source.plot, !replayOn),
    [source.all, source.start, source.plot, replayOn]
  );
  const aheadBars = aheadBase.bars;
  const indAhead = <R,>(r: R): R => trimIndicatorRange(r, aheadBars.length, aheadBase.from, aheadBase.to);
  const overlays = useMemo(() => ind(computeOverlays(closes)), [closes]);
  // Pine-lite على التاريخ كباقي المؤشرات — كان على النافذة وحدها: EMA 50 فارغة لأوّل 49 شمعة وتتغيّر بالسحب.
  const pineLine = useMemo(
    () => (pineOn && pineFormula.trim() ? ind(evalPineLite(pineFormula, indBars)) : []),
    [pineOn, pineFormula, indBars]
  );
  const pineOnPrice = useMemo(() => pineIsPriceScale(pineFormula), [pineFormula]);
  const rsi = useMemo(
    () => (indicators.includes('rsi') ? ind(computeRsi(closes)) : null),
    [closes, indicators]
  );
  const macd = useMemo(
    () => {
      if (!indicators.includes('macd')) return null;
      const r = computeMacd(closes);
      return ind({ ...r, histUp: risingBars(r.hist) });
    },
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
    // الطول 9 = افتراضي TradingView («Rate Of Change») — كان 10 فتختلف كل قيمة وكل عبور للصفر عنه
    () => (indicators.includes('roc') ? ind(computeRoc(closes, 9)) : null),
    [closes, indicators]
  );
  // VWAP يُصفَّر كل يوم تداول (17:00 نيويورك) على الفريمات داخل اليوم كـTradingView — كان تراكماً من أوّل شمعة
  // محمَّلة: على 15m بعد أيام يصير متوسطاً شبه ثابت بعيداً عن السعر، ويتغيّر مع كل تحميل تاريخ إضافي.
  // اليومي فأكبر: كل شمعة جلسة (Anchor = Session كـTradingView) ⇒ VWAP = (H+L+C)/3 للشمعة — كان تراكماً
  // مستمراً من أوّل شمعة محمَّلة يتغيّر مع تحميل تاريخ إضافي. `barTime` ⇒ زمن الشمعة المصدر للّبنات.
  const vwapIntraday = timeframeStepSec(series.timeframe) < 86400;
  const vwapSessionOf = useMemo(
    () =>
      vwapIntraday
        ? (c: Candle) => tradingDayStartSec(series.symbol, candleTimeSec(barTime(c)))
        : (c: Candle) => candleTimeSec(barTime(c)),
    [series.symbol, vwapIntraday]
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
      // على اليومي كل شمعة جلسة ⇒ خطّ متّصل بين قيمها (لا قطع عند كل شمعة فيختفي الخطّ)
      vwapIntraday &&
      i > 0 &&
      source.plot[i] != null &&
      source.plot[i - 1] != null &&
      vwapSessionOf(source.plot[i]) !== vwapSessionOf(source.plot[i - 1]),
    [source.plot, vwapSessionOf, vwapIntraday]
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
    // الطول 9 = افتراضي TradingView («Chande Momentum Oscillator») — كان 14
    () => (indicators.includes('cmo') ? ind(computeCmo(closes, 9)) : null),
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
    () => {
      if (!indicators.includes('ao')) return null;
      const v = computeAwesomeOsc(indBars);
      return ind({ v, up: risingBars(v) });
    },
    [indBars, indicators]
  );
  const ac = useMemo(
    () => {
      if (!indicators.includes('ac')) return null;
      const v = computeAcceleratorOsc(indBars);
      return ind({ v, up: risingBars(v) });
    },
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
  // سنوياً كـTradingView: √(365/per)، per = 7 فوق اليومي (أسبوعي/شهري) و1 غيره — 252 ثابتاً كان يُظهر
  // الأسبوعي ضعف قيمته ~2.2 واليومي أقلّ بـ17%.
  // المقدِّرات الخمسة (Parkinson/G-K/R-S/Y-Z/EWMA) تأخذ العامل نفسه كي لا تظهر بجانب HV بمقياس آخر.
  const hvStepSec = timeframeStepSec(series.timeframe);
  const volAnnual = 365 / (hvStepSec > 86400 ? 7 : 1);
  const hv = useMemo(
    () => (indicators.includes('hv') ? ind(computeHistoricalVolatility(closes, 10, volAnnual)) : null),
    [closes, indicators, volAnnual]
  );
  const stochRsi = useMemo(
    () => (indicators.includes('stochRsi') ? ind(computeStochRsi(closes)) : null),
    [closes, indicators]
  );
  const rvi = useMemo(
    () => {
      if (!indicators.includes('rvi')) return null;
      const line = computeRvi(indBars);
      return ind({ rvi: line, signal: computeRviSignal(line) });
    },
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
  // الزناد كـTradingView = `fish1[1]` (القيمة نفسها متأخّرة شمعة) — تقاطعهما هو الإشارة المعتادة.
  const fisher = useMemo(() => {
    if (!indicators.includes('fisher')) return null;
    const f = computeFisherTransform(indBars);
    return ind({ fisher: f, trigger: [null, ...f.slice(0, -1)] });
  }, [indBars, indicators]);
  // سلسلة ثابتة بأبعد مستوى تدخل `hist` بـmacdPaneGeom كي يتّسع المقياس لـ‎±1.5‎ دون أن تُرسم.
  const fisherFloor = useMemo(
    () => (fisher ? fisher.fisher.map(() => FISHER_LEVELS[0]) : []),
    [fisher]
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
  const ichimoku = useMemo(() => {
    if (!indicators.includes('ichimoku')) return null;
    const full = computeIchimoku(aheadBars);
    const r = indAhead(full);
    // السحابة المُسقَطة يمين النافذة = Span A/B الحقيقيّتان بعدها (لا تنظران للأمام)، ثم إسقاط آخر السلسلة.
    const k = full.lead.spanA.length;
    return {
      ...r,
      lead: {
        spanA: [...full.spanA.slice(aheadBase.to), ...full.lead.spanA].slice(0, k),
        spanB: [...full.spanB.slice(aheadBase.to), ...full.lead.spanB].slice(0, k),
      },
    };
  }, [aheadBars, aheadBase, indicators]);
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
    () => {
      if (!indicators.includes('zigzag')) return null;
      // على السلسلة كلّها: الساق الداخلة من يسار النافذة والخارجة من يمينها + الساق الجارية غير المؤكَّدة.
      const legs = computeZigZagLegs(aheadBars.map((c) => c.close), zigzagDev);
      return zigzagWindowSegments(legs.pivots, legs.tail, aheadBase.from, aheadBase.to - aheadBase.from);
    },
    [aheadBars, aheadBase, indicators, zigzagDev]
  );
  const adl = useMemo(
    () => (indicators.includes('adl') ? ind(computeAccumDist(indBars)) : null),
    [indBars, indicators]
  );
  const fractals = useMemo(
    () => (indicators.includes('fractals') ? indAhead(computeFractals(aheadBars)) : null),
    [aheadBars, aheadBase, indicators]
  );
  const fractalChaosOsc = useMemo(
    () => (indicators.includes('fractalChaosOsc') ? indAhead(computeFractalChaosOsc(aheadBars)) : null),
    [aheadBars, aheadBase, indicators]
  );
  const fractalChaosBands = useMemo(
    () => (indicators.includes('fractalChaosBands') ? indAhead(computeFractalChaosBands(aheadBars)) : null),
    [aheadBars, aheadBase, indicators]
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
    () =>
      indicators.includes('parkinsonVol') ? ind(computeParkinsonVolatility(indBars, 10, volAnnual)) : null,
    [indBars, indicators, volAnnual]
  );
  const garmanKlassVol = useMemo(
    () =>
      indicators.includes('garmanKlassVol') ? ind(computeGarmanKlassVolatility(indBars, 10, volAnnual)) : null,
    [indBars, indicators, volAnnual]
  );
  const rogersSatchellVol = useMemo(
    () =>
      indicators.includes('rogersSatchellVol') ? ind(computeRogersSatchellVolatility(indBars, 10, volAnnual)) : null,
    [indBars, indicators, volAnnual]
  );
  const yangZhangVol = useMemo(
    () =>
      indicators.includes('yangZhangVol') ? ind(computeYangZhangVolatility(indBars, 10, volAnnual)) : null,
    [indBars, indicators, volAnnual]
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
    () => (indicators.includes('pivotsHL') ? indAhead(computePivotsHighLow(aheadBars)) : null),
    [aheadBars, aheadBase, indicators]
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
    () => {
      if (!indicators.includes('vwMacd')) return null;
      const r = computeVwMacd(indBars);
      return ind({ ...r, histUp: risingBars(r.hist) });
    },
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
    () => (indicators.includes('ewmaVol') ? ind(computeEwmaVolatility(closes, 0.94, 20, volAnnual)) : null),
    [closes, indicators, volAnnual]
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
    // مذبذب (RSI/MACD/ATR…) بمقياسه الخاص أسفل اللوح لا بمدى السعر
    if (pineOnPrice) pineLine.forEach(push);
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
    pineOnPrice,
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
  sourceEndRef.current = liveSeries.candles[liveSeries.candles.length - 1]?.time;

  const chartPlotW = Math.max(80, chartW - PRICE_AXIS_WIDTH);
  const chartPlotH = Math.max(100, mainH - timeAxisH);
  // حافّة اللوح اليمنى لما يُرسم ملاصقاً لها (أعمدة Volume Profile، وسما POC/TPO، وسم القياس): محور السعر ابن
  // اللوح بعرض 68px وخلفية مصمتة فوق كل شيء — أعمدة `right: 2` بعرض ≤ 16% (57px بهاتف 360px)
  // كانت تقع تحته كلّها، فلا يُرى من الطبقة إلا خطّ POC بلا اسم.
  const plotRightInset = hidePriceLabels ? 2 : PRICE_AXIS_WIDTH + 2;
  chartPlotWRef.current = chartPlotW;
  // الهامش الافتراضي يُحسب من العرض الحقيقي بعد القياس (يبدأ 320) وبعد تدوير الشاشة — ما لم يُسحب الشارت.
  useEffect(() => {
    if (!xPanAtRest.current) return;
    const rest = restXPan();
    if (rest === xPanRef.current) return;
    xPanRef.current = rest;
    setXPan(rest);
    schedulePublishSync(false);
  }, [chartPlotW, restXPan, schedulePublishSync]);
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
  // خطوط الطبقات ذات الخطّ الواحد: قيمتها تُطبع بالمفتاح عند شمعة التقاطع (أو الأخيرة) — راجع
  // `legendValueAt`. متعدّدة الخطوط (إيشيموكو، التمساح…) بالاسم وحده؛ النطاقات بحدّيها أدناه.
  // خلية رباعي ضيّقة ⇒ الأسماء وحدها: القيمة تُضاعف عرض الشارة فتنطوي الطبقات تحت «+ن».
  const legendLines = useMemo((): Readonly<Record<string, readonly (number | null)[] | null | undefined>> => {
    if (dense && chartPlotW < 320) return {};
    return {
      sma20: overlays.sma20, sma50: overlays.sma50, ema21: overlays.ema21, wma20: overlays.wma20,
      dema20: overlays.dema20, tema20: overlays.tema20, hma20: overlays.hma20,
      vwap, twap, psar, gannHiLo, medianPrice, typicalPrice, weightedClose, mcginley, lsma, tsf,
      vwma, alma, t3, smma20, kama, frama, zlema, avgPrice, dma, trima, vidya,
      supertrend: supertrend?.value,
    };
  }, [
    dense, chartPlotW, overlays, vwap, twap, psar, gannHiLo, medianPrice, typicalPrice, weightedClose,
    mcginley, lsma, tsf, vwma, alma, t3, smma20, kama, frama, zlema, avgPrice, dma, trima, vidya, supertrend,
  ]);
  // النطاقات: الحدّان (أعلى ثم أدنى) بشارة واحدة «BB 1.08732 1.08332» — ما يقرؤه متداول النطاق.
  const legendBands = useMemo((): Readonly<Record<string, { upper: readonly (number | null)[]; lower: readonly (number | null)[] } | null | undefined>> => {
    if (dense && chartPlotW < 320) return {};
    return {
      bb: { upper: overlays.bbUpper, lower: overlays.bbLower },
      keltner,
      donchian,
    };
  }, [dense, chartPlotW, overlays, keltner, donchian]);
  // متعدّدة الخطوط: قيمة كل خطّ بلونه — إيشيموكو Tenkan/Kijun (المتأخر = إغلاق بعد 25 شمعة، فارغ عند
  // الأخيرة فلا يُطبع) والتمساح الفكّ/الأسنان/الشفاه. الألوان حرفياً كمواضع رسمها.
  const legendMulti = useMemo((): Readonly<Record<string, { lines: readonly (readonly (number | null)[])[]; colors: readonly string[] } | null>> => {
    if (dense && chartPlotW < 320) return {};
    return {
      ichimoku: ichimoku ? { lines: [ichimoku.tenkan, ichimoku.kijun], colors: ['#60A5FA', '#F87171'] } : null,
      alligator: alligator
        ? { lines: [alligator.jaw, alligator.teeth, alligator.lips], colors: ['#3B82F6', '#EF4444', '#84CC16'] }
        : null,
      chandeKroll: chandeKroll
        ? { lines: [chandeKroll.longStop, chandeKroll.shortStop], colors: ['#99F6E4', '#F9A66C'] }
        : null,
    };
  }, [dense, chartPlotW, ichimoku, alligator, chandeKroll]);
  const legendMultiParts = (id: string, index: number | null): { text: string; color: string }[] | null => {
    const m = legendMulti[id];
    if (!m) return null;
    const vs = legendMultiAt(m.lines, index);
    return vs ? vs.map((v, k) => ({ text: fmtPrice(v), color: m.colors[k]! })) : null;
  };
  const legendValueText = (id: string, index: number | null): string | null => {
    // ZigZag: العتبة، و«≈540.0 pip» حين لا ساق على الشاشة — راجع `zigzagLegendText`.
    if (id === 'zigzag') {
      if (!zigzag || (dense && chartPlotW < 320)) return null;
      return zigzagLegendText(
        series.symbol,
        source.plot[source.plot.length - 1]?.close,
        zigzag.length > 0,
        lang,
        zigzagDev
      );
    }
    const parts = legendMultiParts(id, index);
    if (parts) return parts.map((p) => p.text).join(' ');
    const band = legendBands[id];
    if (band) {
      const hl = legendBandAt(band.upper, band.lower, index);
      return hl ? `${fmtPrice(hl[0])} ${fmtPrice(hl[1])}` : null;
    }
    const v = legendValueAt(legendLines[id], index);
    return v == null ? null : fmtPrice(v);
  };
  // العرض يُحجز بطول قيمة الشمعة الأخيرة (منازل الرمز ثابتة ⇒ الطول نفسه تقريباً عند التقاطع)،
  // فلا تتبدّل الشارات الظاهرة أثناء سحب التقاطع.
  const legendLastIdx = source.plot.length - 1;
  const legendValueChars: Record<string, number> = {};
  for (const id of indicators) {
    const t = legendValueText(id, legendLastIdx);
    if (t) legendValueChars[id] = t.length;
  }
  const legendCharsKey = JSON.stringify(legendValueChars);
  const priceLegend = useMemo(
    () => planPriceLegendForWidth(indicators, chartPlotW - 12, legendValueChars),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `legendCharsKey` يمثّل `legendValueChars`
    [indicators, chartPlotW, legendCharsKey]
  );
  const viewXPan =
    syncFollow && syncWindow?.xPanNorm != null
      ? syncWindow.xPanNorm * chartPlotW
      : xPan;
  // أعمدة لوحات المؤشرات تُزاح أفقياً مع الشموع (السحب بين شمعتين، ومنطقة المستقبل) — `styles.paneHead`.
  const paneShift = useMemo(() => ({ transform: [{ translateX: viewXPan }] }), [viewXPan]);
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
  // سحابة Ichimoku ممتدّة لمنطقة المستقبل (25 خانة كـTradingView) حتى آخر خانة ظاهرة — كانت تنتهي
  // عند الشمعة الحيّة فلا يرى المتداول انقلاب السحابة القادم (Kumo twist)، أهمّ ما يُقرأ منها.
  const ichimokuCloud = ichimoku
    ? {
        spanA: [...ichimoku.spanA, ...ichimoku.lead.spanA.slice(0, lastDrawLocal + 1 - source.plot.length)],
        spanB: [...ichimoku.spanB, ...ichimoku.lead.spanB.slice(0, lastDrawLocal + 1 - source.plot.length)],
      }
    : null;
  // Alligator كذلك: الفك/الأسنان/الشفاه مُزاحة 8/5/3 للأمام — كانت تنتهي قبل الشمعة الحيّة بـ8/5/3 خانات
  // فيبدو «الفم» مغلقاً أو مفتوحاً على شموع مضت لا على الحالية.
  const futureSlots = lastDrawLocal + 1 - source.plot.length;
  const alligatorLines = alligator
    ? {
        jaw: [...alligator.jaw, ...alligator.lead.jaw.slice(0, futureSlots)],
        teeth: [...alligator.teeth, ...alligator.lead.teeth.slice(0, futureSlots)],
        lips: [...alligator.lips, ...alligator.lead.lips.slice(0, futureSlots)],
      }
    : null;

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

  // شريط Pine غير السعري: أدنى 22% من اللوح بمدى قيمه المرئية — لا يمسّ محور السعر.
  const pineStripY = (() => {
    let lo = Infinity;
    let hi = -Infinity;
    if (!pineOnPrice) for (const v of pineLine) if (v != null && Number.isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    const h = chartPlotH * 0.22;
    const bottom = chartPlotH - 4;
    const span = hi > lo ? hi - lo : 1;
    return (v: number) => bottom - ((v - (hi > lo ? lo : v - 0.5)) / span) * h;
  })();
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

  // خانة الرسم: كـ`hitIndex` لكن تبلغ منطقة المستقبل الظاهرة يمين آخر شمعة (`drawSlotAt`).
  const drawIndex = useCallback((x: number) => {
    const w = chartPlotW || 1;
    const pan = syncFollow && syncWindow?.xPanNorm != null
      ? syncWindow.xPanNorm * w
      : xPanRef.current;
    return drawSlotAt(x, pan, w, sourceRef.current.plot.length);
  }, [chartPlotW, syncFollow, syncWindow?.xPanNorm]);

  const priceAtY = useCallback(
    (y: number) => {
      const r = rangeRef.current;
      const scaled = r.max - (y / chartPlotH) * r.span;
      return fromScale(scaled);
    },
    [chartPlotH, logScale]
  );

  // زرّ «نسخة» (chart12): نسخة مستقلّة من الرسم المحدَّد بجانبه (`cloneShift`) تصير هي المحدَّدة، فيسحبها
  // المتداول ويعدّلها وحده — كنسخ مستوى دعم لقمّة أخرى أو مركز شراء بنفس المسافة. قابلة للتراجع.
  const cloneSelectedDrawing = () => {
    const d = selectedId ? drawingsRef.current.find((x) => x.id === selectedId) : null;
    if (!d) return;
    const shift = cloneShift(d.tool, yOf(d.a.price) > chartPlotH / 2);
    const pip = chartPipSpec(series.symbol)?.pipSize ?? null;
    const pxScaled = toScale(priceAtY(0)) - toScale(priceAtY(1));
    const next = translateDrawing(
      // النسخة غير مقفولة وإن قُفل أصلها: تُنسخ لتُسحب إلى مكانها.
      withDrawingLock({ ...d, id: nextDrawingId() }, false),
      shift.bars,
      (price) => {
        if (!shift.px) return price;
        const moved = fromScale(toScale(price) - shift.px * pxScaled);
        return pip ? nudgePipPrice(price, Math.round((moved - price) / pip), pip) : moved;
      },
      (index) =>
        stampAtIndex(sourceRef.current.all as { time: number }[], index, timeframeStepSec(series.timeframe), sourceEndTime())
    );
    pushDrawHistory();
    setDrawings((list) => [...list, next]);
    setSelectedId(next.id);
  };

  // قفل الرسم المحدَّد (كقفل TradingView): المقفول لا يُسحب ولا تتحرّك مقابضه بلمسة عابرة — مستوى وقف مدروس
  // لا يزحف لأنّ الإصبع مرّ عليه أثناء التمرير. التحديد والحذف واللون والتنبيه تبقى. قابل للتراجع كأيّ تعديل.
  const toggleSelectedLock = () => {
    const d = selectedId ? drawingsRef.current.find((x) => x.id === selectedId) : null;
    if (!d) return;
    pushDrawHistory();
    const next = withDrawingLock(d, !d.locked);
    drawingsRef.current = drawingsRef.current.map((x) => (x.id === next.id ? next : x));
    setDrawings((list) => list.map((x) => (x.id === next.id ? next : x)));
    setLockedHint(false);
  };
  // رأس سهم على خطّ الترند المحدَّد (طرفه الثاني): «السعر ذاهب إلى هنا» بلا أداة مستقلّة — قابل للتراجع ويُحفظ مع الرسم.
  const toggleSelectedArrow = () => {
    const d = selectedId ? drawingsRef.current.find((x) => x.id === selectedId) : null;
    if (!d || d.tool !== 'trend') return;
    pushDrawHistory();
    const next = withDrawingArrow(d, !d.arrow);
    drawingsRef.current = drawingsRef.current.map((x) => (x.id === next.id ? next : x));
    setDrawings((list) => list.map((x) => (x.id === next.id ? next : x)));
  };
  // «الرسم مقفول — فكّ القفل لتحريكه» فوق اللوح لحظةَ محاولة سحبه، ثم يختفي.
  const [lockedHint, setLockedHint] = useState(false);
  const lockedHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashLockedHint = () => {
    setLockedHint(true);
    if (lockedHintTimer.current) clearTimeout(lockedHintTimer.current);
    lockedHintTimer.current = setTimeout(() => setLockedHint(false), LOCKED_HINT_MS);
  };
  useEffect(() => () => {
    if (lockedHintTimer.current) clearTimeout(lockedHintTimer.current);
  }, []);
  const selectedLocked = !!(selectedId && drawings.find((x) => x.id === selectedId)?.locked);
  const selectedTrend = selectedId ? drawings.find((x) => x.id === selectedId && x.tool === 'trend') : undefined;
  const selectedArrow = !!selectedTrend?.arrow;
  const arrowA11y = tr.mcArrowHeadA11y;

  /**
   * إزاحة الرسم المحدَّد `bars` شمعة و`steps` خطوة سعر (pip للأزواج والمعادن، وإلا بكسل رأسي واحد) — لأسهم
   * لوحة المفاتيح ولأزرار ▲▼◀▶ بالهاتف (chart15): الإصبع لا يضع مستوى على pip بعينه، والسحب يقفز بكسلات.
   * `false` إن لا رسم محدَّد، `'same'` إن لم يتحرّك (حافّة البيانات)، وإلا `'moved'`. قابلة للتراجع كل خطوة،
   * إلا `record = false` (تكرار الضغط المطوَّل بعد لقطته الأولى) فالسلسلة كلّها تراجع واحد.
   */
  const nudgeSelectedDrawing = (bars: number, steps: number, record = true): false | 'same' | 'moved' => {
    const d = selectedId ? drawingsRef.current.find((x) => x.id === selectedId) : null;
    if (!d) return false;
    // مقفول ⇒ لا إزاحة (الأسهم بالويب؛ أزرار ▲▼◀▶ مخفيّة أصلاً) — وسطر «مقفول» يقول لماذا.
    if (d.locked) {
      flashLockedHint();
      return 'same';
    }
    const pip = chartPipSpec(series.symbol)?.pipSize ?? null;
    const pxScaled = toScale(priceAtY(0)) - toScale(priceAtY(1));
    const next = translateDrawing(
      d,
      bars,
      (price) =>
        !steps ? price : pip ? nudgePipPrice(price, steps, pip) : fromScale(toScale(price) + steps * pxScaled),
      (index) =>
        stampAtIndex(sourceRef.current.all as { time: number }[], index, timeframeStepSec(series.timeframe), sourceEndTime())
    );
    if (sameDrawingPlace(d, next)) return 'same';
    if (record) pushDrawHistory();
    // المرجع يُحدَّث فوراً: تكرار الضغط المطوَّل قد يسبق الرسم التالي فيُزيح النسخة القديمة من جديد.
    drawingsRef.current = drawingsRef.current.map((x) => (x.id === next.id ? next : x));
    setDrawings((list) => list.map((x) => (x.id === next.id ? next : x)));
    return 'moved';
  };
  const nudgeRef = useRef(nudgeSelectedDrawing);
  nudgeRef.current = nudgeSelectedDrawing;
  const nudgeHoldTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopNudgeHold = useCallback(() => {
    if (nudgeHoldTimer.current) clearInterval(nudgeHoldTimer.current);
    nudgeHoldTimer.current = null;
  }, []);
  useEffect(() => stopNudgeHold, [stopNudgeHold]);
  /**
   * ضغط مطوَّل على ▲▼◀▶: تكرار حتى رفع الإصبع (`onPressOut`)، أسرع بعد `NUDGE_REPEAT_SLOW_TICKS`
   * (`nudgeRepeatMultiplier`). لقطة تراجع واحدة عند أوّل خطوة تحرّك فعلاً — لا عشرات خطوات بالتاريخ
   * ولا تراجع يمحو قبل الضغطة. يتوقّف إن أُلغي التحديد أثناءه.
   */
  const startNudgeHold = (bars: number, steps: number) => {
    stopNudgeHold();
    let recorded = nudgeRef.current(bars, steps, true) === 'moved';
    let tick = 0;
    nudgeHoldTimer.current = setInterval(() => {
      tick += 1;
      const k = nudgeRepeatMultiplier(tick);
      const r = nudgeRef.current(bars * k, steps * k, !recorded);
      if (r === false) stopNudgeHold();
      else if (r === 'moved') recorded = true;
    }, NUDGE_REPEAT_MS);
  };

  const pointFromXY = useCallback(
    (x: number, y: number): ChartPoint => {
      const raw = priceAtY(y);
      const local = drawIndex(x);
      // بمنطقة المستقبل لا شمعة تحت الإصبع ⇒ بلا مغناطيس، السعر من y مقرَّباً.
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
        timeframeStepSec(series.timeframe),
        sourceEndTime()
      );
      return stamp == null ? { index, price } : { index, price, ...stamp };
    },
    [drawIndex, priceAtY, magnet, series.timeframe, series.symbol, priceDecimalsRef]
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
        timeframeStepSec(series.timeframe),
        sourceEndTime()
      );
      return stamp == null ? { index, price: b.price } : { index, price: b.price, ...stamp };
    },
    [series.timeframe]
  );

  const finalizeDrawing = useCallback(
    (a: ChartPoint, b?: ChartPoint) => {
      const t = tool;
      if (t === 'none') return;
      // نقرة خفيفة (اهتزاز 8ms بالهاتف) عند تثبيت رسم — كان الوضع صامتاً فلا يعرف الإصبع أن المستوى نزل
      // حتى ينظر. التثبيت وحده لا كل لمسة (matrix-tactile-feel).
      if (b || t === 'hline' || t === 'hray' || t === 'vline' || t === 'note') playSoftClick();
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
      if (t === 'hline' || t === 'hray' || t === 'vline' || t === 'note') {
        pushDrawHistory();
        const id = nextDrawingId();
        // الملاحظة الجديدة بلا نصّ مخزَّن: تُعرض `tr.mcNoteDefault` بلغة الواجهة الجارية (كانت تُجمَّد
        // «ملاحظة» بلغة إنشائها)، وتُحدَّد فوراً فيظهر محرّر نصّها.
        setDrawings((d) => [...d, { id, tool: t, a, color: accent }]);
        if (t === 'note') setSelectedId(id);
      } else if (b) {
        pushDrawHistory();
        // شراء/بيع: `b` يُخزَّن عند الوقف بجهته الصحيحة (المقبض حيث يُرى الوقف) — `positionTool.ts`.
        const end = isPositionTool(t)
          ? { ...positionEndPoint(a, b), price: positionStop(t, a.price, b.price, series.symbol) }
          : b;
        // القناة سحبة واحدة: الموازي يُقدَّر من الشموع بين الطرفين (احتياطه سُبع المدى الظاهر).
        const width =
          t === 'channel'
            ? fitChannelWidth(
                sourceRef.current.all as { high: number; low: number }[],
                a,
                end,
                Math.abs(priceAtY(0) - priceAtY(chartPlotH)) / 7,
                logScale
              )
            : undefined;
        setDrawings((d) => [
          ...d,
          width == null
            ? { id: nextDrawingId(), tool: t, a, b: end, color: accent }
            : { id: nextDrawingId(), tool: t, a, b: end, color: accent, width },
        ]);
      }
      setPending(null);
      setDragEnd(null);
      setTool('none');
    },
    [tool, accent, tr, pushDrawHistory, series.symbol, positionEndPoint, priceAtY, chartPlotH, logScale]
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

  /** مقبض عرض القناة: يحرّك الخطّ الموازي وحده. */
  const setChannelWidth = useCallback((id: string, width: number) => {
    setDrawings((list) => {
      const cur = list.find((x) => x.id === id);
      if (!cur || cur.width === width) return list;
      return list.map((d) => (d.id !== id ? d : { ...d, width }));
    });
  }, []);

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
    const labels = positionLabels(box.lv, series.symbol, lang, priceDecimalsRef);
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
    const outcomeText = outcome ? positionOutcomeText(box.lv, outcome, series.symbol, tr.entryLabel, lang, priceDecimalsRef) : '';
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
      if (drawingsHidden) return null;
      for (const d of drawings) {
        const aLocal = d.a.index - source.start;
        const ax = xOf(aLocal);
        const ay = yOf(d.a.price);
        if (d.tool === 'hline') {
          best = considerHit(d.id, Math.abs(y - ay), BODY_R, best);
          continue;
        }
        if (d.tool === 'hray') {
          // من مرساته إلى حافّة اللوح كما يُرسم — يسار المرساة ليس من الرسم.
          const sx = Math.max(0, ax);
          best = considerHit(d.id, segmentDistance(x, y, sx, ay, Math.max(sx + 1, chartPlotW), ay, 1), BODY_R, best);
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
          const seg = (d.tool === 'ray' ? raySegment : clipSegmentToBars)(aLocal, ay, bLocal, by, lastDrawLocal);
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
        } else if (d.tool === 'channel') {
          // خطّا القناة كما يُرسمان (مقصوصان على النافذة)، ومقبض العرض بمنتصف الموازي هدفٌ كالطرفين.
          const w = d.width ?? 0;
          const base = clipSegmentToBars(aLocal, ay, bLocal, by, lastDrawLocal);
          const pp = channelLinePrices(d.a, d.b, w, 1, logScale);
          const par = clipSegmentToBars(aLocal, yOf(pp.a), bLocal, yOf(pp.b), lastDrawLocal);
          bodyDist = Math.min(
            segmentDistance(x, y, xOf(base.ai), base.ay, xOf(base.bi), base.by, 1),
            segmentDistance(x, y, xOf(par.ai), par.ay, xOf(par.bi), par.by, 1)
          );
          endDist = Math.min(
            endDist,
            Math.hypot(x - xOf((aLocal + bLocal) / 2), y - yOf(channelHandlePrice(d.a, d.b, w)))
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
    [drawings, drawingsHidden, source.start, source.plot.length, xOf, yOf, positionBox, chartPlotW, chartPlotH, lastDrawLocal]
  );

  const exportChart = async () => {
    if (!plotRef.current) return;
    try {
      const uri = await captureRef(plotRef, { format: 'png', quality: 0.95 });
      if (Platform.OS === 'web') {
        notify('MATRIX', tr.mcSnapshotSaved);
        return;
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: tr.mcShareDialogTitle });
      }
    } catch {
      notify('MATRIX', tr.mcSnapshotFailed);
    }
  };

  // التقاطع عند (x, y) داخل اللوح: الشمعة من x، والسعر من y لا من إغلاقها.
  const placeCross = (x: number, y: number, hover = false) => {
    const local = hitIndex(x);
    const candle = source.plot[local];
    if (!candle) return;
    // يمين آخر شمعة (منطقة المستقبل بعد سحب الشارت): الخطّ يتبع الإصبع لا يلتصق بالشمعة الحيّة،
    // ووسم الزمن يُسقَط بخطوة الفريم. لا على Renko/Kagi/P&F/Range — خانتها ليست زمناً.
    const syntheticX = isSyntheticKind(kind);
    const ahead = syntheticX ? 0 : Math.max(0, drawIndex(x) - local);
    const raw = priceAtY(y);
    // 14px حول الإصبع بوحدة السعر عند موضعه (يصحّ مع المقياس اللوغاريتمي كذلك).
    const snapTol = Math.abs(priceAtY(y - CROSS_SNAP_PX) - raw);
    // بالمستقبل لا شمعة تحت الإصبع ⇒ بلا مغناطيس.
    const price = crossPriceAt(raw, ahead ? null : candle, magnet, symbolPriceDecimals(series.symbol), snapTol, priceDecimalsRef);
    crossPinned.current = !hover;
    crossFromSync.current = false;
    setCrossHover(hover);
    // حركة الفأرة داخل الشمعة نفسها وعلى السعر المقرَّب نفسه لا تعيد رسم الشارت كلّه.
    if (cross && cross.time === candle.time && cross.price === price && (cross.ahead ?? 0) === ahead) return;
    setCross(ahead ? { time: candle.time, price, ahead } : { time: candle.time, price });
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
    if (tool === 'hline' || tool === 'hray' || tool === 'vline' || tool === 'note') {
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
          if (tool === 'hline' || tool === 'hray' || tool === 'vline' || tool === 'note') return;
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
          if (tool === 'hline' || tool === 'hray' || tool === 'vline' || tool === 'note') {
            // من ref كباقي مسارات النقر: المستجيب لا يُبنى من جديد مع التمرير/التكبير/شمعة جديدة، فـ`onChartPress`
            // المغلَق عليه يحمل نافذة لحظة اختيار الأداة ⇒ التقاطع وقراءة OHLC على شمعة مجاورة أو بعيدة.
            chartPressRef.current(locationX, locationY);
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
  const selDragEnd = useRef<'a' | 'b' | 't' | 'w' | 'body' | null>(null);
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
        // مقفول ⇒ لا جسم ولا مقابض؛ لمسةٌ عليه تُظهر لماذا لم يتحرّك بدل صمتٍ يبدو عطلاً.
        if (d.locked) {
          if (hitDrawing(locationX, locationY) === d.id) flashLockedHint();
          return;
        }
        // لمسة على جسم الرسم المحدَّد (لا على مقبض) ⇒ تحريكه كلّه بشكله.
        const grabBody = () => {
          if (hitDrawing(locationX, locationY) !== d.id) return;
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
        if (d.b && d.tool === 'channel') {
          const aL = d.a.index - source.start;
          const bL = d.b.index - source.start;
          const handles: ['a' | 'b' | 'w', number][] = [
            ['a', Math.hypot(locationX - xOf(aL), locationY - yOf(d.a.price))],
            ['b', Math.hypot(locationX - xOf(bL), locationY - yOf(d.b.price))],
            [
              'w',
              Math.hypot(
                locationX - xOf((aL + bL) / 2),
                locationY - yOf(channelHandlePrice(d.a, d.b, d.width ?? 0))
              ),
            ],
          ];
          handles.sort((x, y) => x[1] - y[1]);
          if (handles[0][1] > DRAW_HANDLE_R) return grabBody();
          const grabbed = handles[0][0];
          selDragEnd.current = grabbed;
          selDragAt.current = grabbed === 'w' ? null : drawingEnd(d, grabbed);
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
          // لقطة بداية السحب بفهارس السلسلة يومها: إغلاق شمعة حيّة يُسقط أقدم شمعة فتزحف الفهارس خانة
          // ⇒ الرسم كان يقفز شمعة تحت الإصبع ويُحفظ هناك. تُرسى بزمنها على السلسلة الحالية أولاً.
          const km = kindRef.current;
          const [fromNow] = anchorDrawings(
            [from.d],
            sourceRef.current.all as { time: number }[],
            timeframeStepSec(series.timeframe),
            isSyntheticKind(km),
            sourceEndTime()
          );
          const next = translateDrawing(
            fromNow!,
            drawIndex(locationX) - drawIndex(from.x),
            (price) => fromScale(toScale(price) + dScaled),
            (index) =>
              stampAtIndex(
                sourceRef.current.all as { time: number }[],
                index,
                timeframeStepSec(series.timeframe),
                sourceEndTime()
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
        if (end === 'w') {
          // السعر تحت الإصبع مباشرةً لا المُمغنَط: العرض يتبع الإصبع كما يُرى.
          const d = drawings.find((x) => x.id === selectedId);
          if (!d?.b) return;
          const width = channelWidthAt(d.a, d.b, priceAtY(evt.nativeEvent.locationY));
          if (width === d.width) return;
          if (!selDragPushed.current) {
            pushDrawHistory();
            selDragPushed.current = true;
          }
          setChannelWidth(selectedId, width);
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
    setChannelWidth,
    positionBox,
    series.symbol,
    pointFromXY,
    pushDrawHistory,
    source.start,
    xOf,
    yOf,
    hitDrawing,
    hitIndex,
    drawIndex,
    priceAtY,
    logScale,
    series.timeframe,
  ]);

  // لوحة المفاتيح للرسم على الويب (كما بـTradingView): Delete/Backspace تحذف الرسم المحدَّد، وEsc
  // تلغي رسماً بدأ (النقطة الأولى) ثم التحديد ثم الأداة، وCtrl/⌘+Z تتراجع، والأسهم تُزيح المحدَّد
  // (↑/↓ pip — وبلا pip بكسل من المحور —، ←/→ شمعة، Shift ×10): خطّ دعم على 1.08500 بالضبط لا
  // يبلغه الإصبع ولا الفأرة على محور 300px، فكان المتداول يسحب ويفلت ويعيد. للشارت الذي لُمس
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
        return;
      }
      const nudge =
        selectedId && !pending && !event.altKey && !event.ctrlKey && !event.metaKey
          ? arrowNudge(key, event.shiftKey)
          : null;
      if (!nudge) return;
      if (nudgeSelectedDrawing(nudge.bars, nudge.steps)) event.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toScale/fromScale تتبع logScale
  }, [interactive, pending, selectedId, tool, undoDrawing, pushDrawHistory, series.symbol, series.timeframe, priceAtY, logScale]);

  const applyChartDrag = useCallback(
    (dx: number, dy: number) => {
      const mul = panSpeedMulRef.current;
      const sdx = dx * mul;
      const sdy = dy * mul;
      // عرض الشمعة **المرسومة**: الرسم يقسم العرض على طول السلسلة المرسومة لا على النافذة،
      // فسلسلة أقصر من النافذة (Renko، أو أقدم التاريخ) كانت تتحرّك أسرع من الإصبع بنسبتهما.
      const barWidth = chartPlotW / Math.max(2, panStartBars.current || windowCountRef.current);
      const requestedBars = Math.round(sdx / Math.max(2, barWidth));
      // الحدّ نفسه الذي يرسمه `source` (آخر 10) وزرّا ‹ ›: كان `طول − 2` ⇒ سحب قويّ لأقدم التاريخ يترك
      // الإزاحة 8 شموع أبعد من المرسوم، فالسحبة التالية/› تمرّ بمنطقة ميتة لا يتحرّك فيها الشارت.
      const maxOffset = Math.max(0, source.all.length - 10);
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
      xPanAtRest.current = false;
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

  // AUTO (زاوية المحورين) وAlt+R على الويب: مقياس السعر تلقائي، 80 شمعة، والطرف الأيمن حيّ.
  const resetChartView = useCallback(() => {
    // المراجع قبل النشر: `publishSyncWindow` يقرؤها لا الحالة، وبلا نشر كانت توابع
    // الرباعي تبقى على النافذة القديمة بينما القائد عاد للحيّ.
    priceScaleRef.current = 1;
    windowCountRef.current = 80;
    pricePanRef.current = 0;
    xPanRef.current = restXPan();
    xPanAtRest.current = true;
    offsetRef.current = 0;
    setPriceScale(1);
    setWindowCount(80);
    setPricePan(0);
    setXPan(xPanRef.current);
    setOffset(0);
    schedulePublishSync(false);
  }, [restXPan, schedulePublishSync]);

  // اختصارات TradingView على الويب: Alt+T ترند، Alt+H أفقي، Alt+V عمودي، Alt+F فيبو، Alt+R إعادة
  // العرض (كـAUTO). بـ`event.code` لا `event.key`: Alt على ماك يُخرج «†»/«˙»، وبلوحة عربية أو كردية
  // يُخرج حرفاً عربياً — الموضع الفيزيائي للمفتاح هو الثابت. `preventDefault` يمنع Alt+F من فتح
  // قائمة «ملف» بالمتصفّح. للشارت الذي لُمس أخيراً وحده، ولا يسرق المفاتيح من خانة كتابة.
  useEffect(() => {
    if (Platform.OS !== 'web' || (!interactive && !canPan)) return;
    const onKey = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (webKeyChart !== keyToken.current) return;
      const target = event.target as { tagName?: string; isContentEditable?: boolean } | null;
      if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? '')) return;
      if (event.code === 'KeyR') {
        if (!canPan) return;
        event.preventDefault();
        resetChartView();
        return;
      }
      const next = WEB_TOOL_HOTKEYS[event.code];
      if (!next || !interactive) return;
      event.preventDefault();
      setTool(next);
      setPending(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [interactive, canPan, resetChartView]);

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
        xPanRef.current = restXPan();
        xPanAtRest.current = true;
        setWindowCount(80);
        setXPan(xPanRef.current);
      }
      schedulePublishSync(false);
    },
    [restXPan, schedulePublishSync]
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
        // الشموع مُزاحة بـ`xPan` (السحب بين شمعتين/منطقة المستقبل) ⇒ تُطرح كي تكون البؤرة الشمعة تحت الإصبعين
        // لا خانة بجوارها.
        focus: ((x1 + x2) / 2 - plotLeft - xPanRef.current) / Math.max(1, chartPlotW),
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
  //
  // بلا تقاطع مثبَّت الأسهم تحرّك **العرض** كـTradingView: ←/→ شمعة (Shift: عشر شموع)، ↑/↓ تكبير/تصغير
  // حول المركز. كانت لا تفعل شيئاً فيضطرّ متداول الويب للسحب أو لأزرار ‹ › بخطوة 15 شمعة. لا يُعترَض
  // Alt/Ctrl/⌘ مع الأسهم (Alt+← رجوع المتصفّح)، ولا يُمسّ العرض بالإعادة (نافذتها ليست ملكه).
  useEffect(() => {
    if (Platform.OS !== 'web' || !canPan) return;
    const onKey = (event: KeyboardEvent) => {
      if (webKeyChart !== keyToken.current) return;
      // رسم محدَّد: الأسهم له (معالج الرسم أعلاه)، لا للعرض ولا للتقاطع.
      if (selectedIdRef.current && event.key.startsWith('Arrow')) return;
      if (!crossPinned.current) {
        if (event.altKey || event.ctrlKey || event.metaKey || replayOn) return;
        const k = event.key;
        if (k !== 'ArrowLeft' && k !== 'ArrowRight' && k !== 'ArrowUp' && k !== 'ArrowDown') return;
        const target = event.target as { tagName?: string; isContentEditable?: boolean } | null;
        if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? '')) return;
        event.preventDefault();
        if (k === 'ArrowUp') zoomAroundCenter(0.8);
        else if (k === 'ArrowDown') zoomAroundCenter(1.25);
        else panByButton((k === 'ArrowLeft' ? 1 : -1) * (event.shiftKey ? 10 : 1));
        return;
      }
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
  }, [canPan, replayOn, syncFollow, schedulePublishSync, zoomAroundCenter, panByButton]);

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

  const wheelPanCarry = useRef(0);
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

      // سحبة أفقية على لوح اللمس (أو Shift+عجلة) فوق اللوح تمرّر الزمن كـTradingView — كانت تُقرأ
      // تكبيراً (deltaY الجانبي الصغير) أو لا شيء، فمتداول الماك يسحب بالنقر ليرى التاريخ.
      // بكسلات السحبة ÷ عرض الشمعة، والكسر يُحمَل للحزّة التالية فلا تضيع السحبات البطيئة.
      const lineMul = event.deltaMode === 1 ? 16 : 1;
      const dx = event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX;
      if (overPlot && !overPrice && !overTime && (event.shiftKey || Math.abs(dx) > Math.abs(event.deltaY))) {
        if (replayOnRef.current) return;
        const barW = chartPlotW / Math.max(2, windowCountRef.current);
        wheelPanCarry.current -= (dx * lineMul * panSpeedMulRef.current) / barW;
        const bars = Math.trunc(wheelPanCarry.current);
        if (bars) {
          wheelPanCarry.current -= bars;
          panByButton(bars);
        }
        return;
      }
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
  }, [canPan, chartW, chartPlotW, schedulePublishSync, zoomAroundCenter, zoomPrice, panByButton]);

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
      percentScale,
      magnet,
    }).then(() => {
      const err = getTemplatesSaveError();
      notify('MATRIX', err ? tr[err] : tr.mcTemplateSaved);
    });
  };

  // فهرس شمعة التقاطع داخل النافذة الحاليّة — يُحلّ من الزمن عند كل رسم، فالتقاطع
  // يتبع الشمعة عبر التيكات الحيّة وزرّي التكبير والتصغير، ويسقط من نفسه إن خرجت
  // الشمعة من النافذة أو بدّل المتداول الفريم/الرمز. رؤوس اللوحات تقرأ عنده.
  const crossIndex = cross ? indexOfBarTime(source.plot, cross.time) : null;
  const crossCandle = crossIndex != null ? source.plot[crossIndex] ?? null : null;
  // Recomputed every render so the crosshair and its axis tags stay glued to the
  // candle after zoom buttons / live ticks.
  // `ahead` يصحّ لآخر شمعة بالنافذة وحدها — بعد تيك يفتح شمعة جديدة أو تمرير يسقط.
  const crossAhead =
    cross?.ahead && crossIndex != null && crossIndex === source.plot.length - 1 ? cross.ahead : 0;
  const crossX = crossIndex != null && crossCandle ? xOf(crossIndex + crossAhead) : 0;
  // التقاطع العمودي ممتدّاً عبر لوحات المؤشرات (كـTradingView): عمود اللوحة تحت شمعته (`styles.paneHead`)،
  // فالخطّ يدلّ أيّ عمود تقرأ قيمته رؤوس اللوحات. داخل صفّ مُزاح بـ`viewXPan` ⇒ يُطرح منه.
  const paneCrossLine =
    cross && crossCandle ? (
      <View pointerEvents="none" style={[styles.paneCrossV, { left: crossX - viewXPan }]} />
    ) : null;
  // تغيّر شمعة التقاطع عن إغلاق السابقة (كـTradingView) لا جسمها — راجع `barChangeRef`. واحد لسطر
  // القراءة ولسطر OHLC المدمج. اللون من الرقم المطبوع (`pctDirection`) فلا يخالف ما يُقرأ.
  const crossChange = (() => {
    if (!crossCandle) return null;
    const prev = crossIndex != null ? source.all[source.start + crossIndex - 1] : null;
    const ref = barChangeRef(crossCandle, prev);
    if (ref == null) return null;
    const pct = ((crossCandle.close - ref) / ref) * 100;
    const dir = pctDirection(pct);
    return {
      ref,
      pct,
      pctText: formatPct(pct),
      color: dir === 'up' ? colors.bull : dir === 'down' ? colors.bear : colors.textDim,
    };
  })();
  const denseOhlc = dense ? crossCandle : null;
  // «O 1.08520  H 1.08545  L 1.08501  C 1.08532» ≈ 40 حرفاً × ~5.4px (9pt عريض) ≈ 216px؛ والتغيّر
  // «  +0.32%» ≈ 45px آخر ⇒ من 270px؛ ومع «  ↕ 4.4 pip» ≈ 60px آخر ⇒ المدى من 360px — فلا يُقصّ شيء
  // بنقاط حذف. خلية رباعي بسطرين (أضيق من 240px): التغيّر بالسطر الثاني متى اتّسع (150px).
  const denseOhlcWide = chartPlotW >= 240;
  const denseOhlcPct =
    denseOhlc && crossChange && chartPlotW >= (denseOhlcWide ? 270 : 150) ? crossChange : null;
  const denseOhlcRange =
    denseOhlc && chartPlotW >= 360 ? candleRangePipsText(series.symbol, denseOhlc.high, denseOhlc.low, lang) : null;
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
      durationSec: measureDurationSec(m.a, m.b, timeframeStepSec(series.timeframe), series.symbol),
      durationUnits: tr.mcMeasureDurUnits,
      barForms: { one: tr.mcMeasureBarOne, two: tr.mcMeasureBarTwo },
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

  const visibleDrawings = (drawingsHidden ? [] : drawings)
    .map((d) => {
      const aLocal = d.a.index - source.start;
      const bLocal = d.b ? d.b.index - source.start : aLocal;
      return { d, aLocal, bLocal };
    })
    // الخطّ الأفقي وفيبو بعرض الشارت كلّه: موضع مرساتهما لا يحدّد ظهورهما. كان خطّ دعم
    // مرسوم عند قاع قبل 120 شمعة يختفي (ووسم سعره) بمجرّد العودة للحيّ، ويبقى قابلاً للتحديد.
    // والشعاع المتّجه يميناً كذلك: امتداده يعبر الشموع الظاهرة ولو كان طرفاه يسارها (`raySegment`).
    .filter(
      ({ d, aLocal, bLocal }) =>
        d.tool === 'hline' ||
        d.tool === 'hray' ||
        d.tool === 'fib' ||
        (d.tool === 'ray' && bLocal > aLocal) ||
        aLocal >= -2 ||
        bLocal >= -2
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
      visibleDrawings.filter(({ d }) => d.tool === 'hline' || d.tool === 'hray'),
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
    .filter(({ d }) => (d.tool === 'hline' || d.tool === 'hray') && hlinePriceLabels.has(d.id))
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
    indicators.includes('sessions') && !isSyntheticKind(kind)
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
  // الأسعار نفسها بخطوات مستديرة (`nicePriceTicks`): 1.0860 / 1.0880 ثابتة مع التيك، وخطوط الشبكة
  // عليها. أصغر خطوة = أصغر منزلة تُطبع. مدى أضيق منها ⇒ النِّسَب المتساوية القديمة احتياطاً.
  const priceTickCap = axisTickCount(chartPlotH - 2, PRICE_LABEL_H, PRICE_LABEL_GAP, 7);
  const priceTickHi = fromScale(priceFrame.max);
  const priceTickLo = fromScale(priceFrame.max - priceFrame.span);
  const priceTickDecimals = (fmtPrice(priceTickHi).split('.')[1] ?? '').replace(/\D/g, '').length;
  // المقياس اللوغاريتمي: مواضع متساوية بالسجلّ لا بالسعر (وإلا تتكدّس العلامات بأعلى المحور).
  const nicePrices = (logScale ? niceLogPriceTicks : nicePriceTicks)(
    priceTickLo,
    priceTickHi,
    priceTickCap,
    Math.pow(10, -priceTickDecimals)
  );
  // مقياس النسبة: الأساس إغلاق أول شمعة ظاهرة، والعلامات مستديرة بالنسبة (`percentScaleTicks`).
  const percentBase = percentScale && !logScale ? source.plot[0]?.close ?? null : null;
  const percentTicks =
    percentBase != null ? percentScaleTicks(priceTickLo, priceTickHi, percentBase, priceTickCap) : [];
  const priceTicks: { ratio: number; price: number; label?: string }[] = (
    percentTicks.length
      ? percentTicks.map((t) => ({ ratio: (priceFrame.max - toScale(t.price)) / priceFrame.span, price: t.price, label: t.label }))
      : nicePrices.length
      ? nicePrices.map((price) => ({ ratio: (priceFrame.max - toScale(price)) / priceFrame.span, price }))
      : axisTickRatios(priceTickCap).map((ratio) => ({
          ratio,
          price: fromScale(priceFrame.max - ratio * priceFrame.span),
        }))
  )
    // مع الظلال: علامات السعر بجوار الحارة الأساسية وحدها — ما تحتها حارات بمدى آخر.
    .filter((t) => Number.isFinite(t.ratio) && (!shadowStack || t.ratio * chartPlotH <= shadowStack.primaryLane.height));
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
  // على حدود مستديرة (12:00، بداية اليوم/الشهر) بتوقيت العرض نفسه (`candleDateParts`: محلّي دون اليوم، UTC
  // لليومي) — كانت نِسَباً من النافذة تقع على 13:45 ثم 14:00 مع كل تمرير. النِّسَب احتياط لنافذة قصيرة.
  const timeTickCap = axisTickCount(chartPlotW, timeLabelW, TIME_LABEL_GAP, 4);
  // `source.plot` يشمل شموعاً خلف الحافة اليسرى (هامش اليمين 10% والتمرير): علامتها تُقصّ إلى x=0 وتبقى
  // (الأولى مضمونة) — فتاريخ الحافة لشمعة لا تُرى، يوماً قبل ما تحته بعد سحب إلى المستقبل. المرئية وحدها.
  const timeTickIndexes = (
    niceTimeTickIndexes(
      source.plot.map((c) => barTime(c)),
      timeframeStepSec(series.timeframe),
      timeTickCap,
      dayCandles ? undefined : (t) => -new Date(t * 1000).getTimezoneOffset() * 60
    ) ??
    Array.from(
      new Set(
        axisTickRatios(timeTickCap).map((ratio) => Math.max(0, Math.round((source.plot.length - 1) * ratio)))
      )
    )
  ).filter((i) => {
    const x = xOf(i);
    return x >= 0 && x <= chartPlotW;
  });
  // المواضع المرسومة نفسها: المراكز من `xOf` فتحمل إزاحة التمرير، والقصّ والإخفاء
  // من `layoutAxisLabels` — فلا يتباعد المفحوص عن المرسوم.
  const timeTickBoxes = layoutAxisLabels(
    timeTickIndexes.map((i) => xOf(i)),
    timeLabelW,
    TIME_LABEL_GAP,
    chartPlotW
  );
  // الفجوة بين العلامات **المرسومة** وحدها: علامة مخفيّة بالتراكب كانت تقرّب جارتَيها فتُطبع الساعة
  // على محور تفصل علاماته الظاهرة أيام.
  const timeAxisHours = axisShowsHours(
    timeTickIndexes
      .filter((_, k) => !timeTickBoxes[k]?.hidden)
      .map((i) => (source.plot[i] ? barTime(source.plot[i]) : Number.NaN)),
    visibleTimeSpan,
    dayCandles
  );
  const prevShownTickTime = (k: number, fallback: Candle): number | undefined => {
    for (let j = k - 1; j >= 0; j--) {
      if (timeTickBoxes[j]?.hidden) continue;
      return barTime(source.plot[timeTickIndexes[j]!] ?? fallback);
    }
    return undefined;
  };
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
  // سحب خطّ التنبيه: السعر من موضع الإصبع مقصوصاً للوح ومدوَّراً لمنازل الأداة (1.09250 لا 1.0925031…).
  // الاتجاه يتبع موضعه من السعر الحيّ: خطّ سُحب من فوق السعر إلى تحته صار تنبيه نزول — كما يفهمه المتداول.
  const alertDragPrice = (dy: number) =>
    Number(fmtPrice(priceAtY(Math.max(0, Math.min(chartPlotH, alertDragStartY.current + dy)))));
  const alertDirection = (price: number, fallback: 'above' | 'below'): 'above' | 'below' =>
    Number.isFinite(currentPrice) ? (price >= currentPrice ? 'above' : 'below') : fallback;
  // وسما تنبيهين متقاربين (سقف وقاع منطقة، أو تنبيهان على المستوى نفسه تقريباً) يتراكبان فلا يُقرأ أيّهما.
  // يبقى وسم الأقرب للسعر الحيّ (هو ما سيُطلق أوّلاً)، والمسحوب دائماً؛ الخطوط نفسها كلّها تُرسم.
  const alertLabelIds = new Set(
    thinByGap(
      armedAlerts,
      (al) => yOf(alertDrag?.id === al.id ? alertDrag.price : al.price),
      (al) =>
        alertDrag?.id === al.id
          ? -Infinity
          : Number.isFinite(currentPrice)
            ? Math.abs(al.price - currentPrice)
            : 0,
      LEVEL_LABEL_H
    ).map((al) => al.id)
  );
  const commitAlertMove = (al: { id: string; price: number; condition: 'above' | 'below' }, price: number) => {
    if (!(price > 0) || price === al.price) return;
    // الفشل (خادم أقدم بلا PATCH، تنبيه حُذف، انقطاع) يعيد الخطّ لمكانه — فنقول ذلك بدل قفزة صامتة.
    const was = fmtPrice(al.price);
    void moveArmedAlert(al.id, price, alertDirection(price, al.condition)).then((ok) => {
      if (!ok) notify('MATRIX', tr.mcAlertMoveFailed.replace('{price}', was));
    });
  };
  const dropAlert = (al: { id: string; price: number; condition: 'above' | 'below' }, dy: number) => {
    setAlertDrag(null);
    if (Math.abs(dy) < ALERT_DRAG_SLOP) return;
    commitAlertMove(al, alertDragPrice(dy));
  };
  const flushAlertNudge = () => {
    if (alertNudgeTimer.current) clearTimeout(alertNudgeTimer.current);
    alertNudgeTimer.current = null;
    const n = alertNudge.current;
    alertNudge.current = null;
    if (!n) return;
    setAlertDrag(null);
    commitAlertMove(n.al, n.price);
  };
  // قارئ الشاشة لا يسحب المقبض: الخطّ «قابل للضبط» (VoiceOver/TalkBack: سحبة أعلى/أسفل) — كل سحبة pip واحد
  // (أداة بلا مواصفة: عشر خانات أخيرة). سحبات متتالية تتراكم معاينةً ثم PATCH واحد بعد توقّف 900ms — لا طلب
  // لكل سحبة تتسابق نتائجه فيستقرّ التنبيه على سحبة أقدم.
  const nudgeAlert = (al: { id: string; price: number; condition: 'above' | 'below' }, dir: 1 | -1) => {
    if (alertNudge.current && alertNudge.current.al.id !== al.id) flushAlertNudge();
    const from = alertNudge.current?.price ?? al.price;
    const txt = fmtPrice(from);
    const dec = txt.includes('.') ? txt.length - txt.indexOf('.') - 1 : 0;
    const step = chartPipSpec(series.symbol)?.pipSize ?? 10 ** (1 - dec);
    const price = Number(fmtPrice(from + dir * step));
    if (!(price > 0)) return;
    alertNudge.current = { al, price };
    setAlertDrag({ id: al.id, price });
    if (alertNudgeTimer.current) clearTimeout(alertNudgeTimer.current);
    alertNudgeTimer.current = setTimeout(flushAlertNudge, 900);
  };
  // الترند/الشعاع المحدَّد: سعره عند الشمعة الحيّة وبُعد السعر عنه («1.08520 · −6.2 pip») — يُلحق
  // بقراءته، فمنتظر الكسر يعرف كم بقي بلا جرّ التقاطع إلى الخطّ.
  // «الآن» بالإعادة خطوة الإعادة لا آخر شمعة بالسلسلة: وإلا يُقرأ الخطّ عند شمعة لم تُكشف بعد،
  // ويُقاس بُعده من سعر الإعادة (`currentPrice`) — رقم يخلط الماضي بالمستقبل.
  const nowIndex = replayOn ? source.start + source.plot.length - 1 : source.all.length - 1;
  const selectedLineNow = selectedSpan
    ? lineNowText(selectedSpan, nowIndex, currentPrice, series.symbol, fmtPrice, lang, logScale)
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
    isSyntheticKind(kind);
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
  // وأداة بلا مواصفة pip (DXY، مؤشرات، كريبتو) بفرق السعر «+125.50» (`signedDistanceText`).
  const crossPipsText =
    crossPrice != null && Number.isFinite(currentPrice)
      ? signedDistanceText(series.symbol, currentPrice, crossPrice, lang, priceDecimalsRef)
      : null;
  // مقياس النسبة: سطر ثالث بنسبة التقاطع عن أساس المحور نفسه (إغلاق أول شمعة ظاهرة) — المحور يقول «+0.40%»
  // والوسم كان سعراً فقط، فالمتداول يطابق المستوى بعينه. السعر يبقى الأول: الوقف يوضع بسعر لا بنسبة.
  const crossPctText =
    crossPrice != null && percentBase != null && percentBase > 0
      ? formatScalePercent((crossPrice / percentBase - 1) * 100)
      : null;
  const crossTagH =
    PRICE_TAG_H + (crossPipsText ? COUNTDOWN_LINE_H : 0) + (crossPctText ? COUNTDOWN_LINE_H : 0);
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
        selectionPrices(selectedDrawing, series.symbol, nowIndex, logScale),
        yOf,
        chartPlotH,
        PRICE_TAG_H,
        currentTagHidden ? [] : [{ top: currentTagTop, h: currentTagH }]
      )
    : [];
  // قيم طبقات السعر على المحور بلون خطوطها (`overlayTags.ts`) عند آخر شمعة بالنافذة — حيث يلتقي الخطّ
  // بالمحور. أقلّ أهمية من كل وسم آخر: السعر الحيّ والتقاطع والرسم المحدَّد محجوزة، والطبقات بترتيب
  // أولوية المفتاح (`PRICE_OVERLAY_ORDER`). خلية رباعي ضيّقة ⇒ الجداول فارغة ⇒ لا وسوم.
  const overlayTags = (() => {
    if (hidePriceLabels) return [];
    const at = legendLastIdx;
    const items: OverlayTagInput[] = [];
    for (const id of PRICE_OVERLAY_ORDER) {
      if (!(indicators as readonly string[]).includes(id)) continue;
      const spec = PRICE_OVERLAYS[id]!;
      const multi = legendMulti[id];
      if (multi) {
        const vs = legendMultiAt(multi.lines, at);
        vs?.forEach((v, k) => items.push({ key: `${id}-${k}`, price: v, color: multi.colors[k]! }));
        continue;
      }
      const color = resolveColorExpr(spec.swatch[0]!, legendTokens);
      const band = legendBands[id];
      if (band) {
        const hl = legendBandAt(band.upper, band.lower, at);
        if (hl) {
          items.push({ key: `${id}-u`, price: hl[0], color });
          items.push({ key: `${id}-l`, price: hl[1], color });
        }
        continue;
      }
      const v = legendValueAt(legendLines[id], at);
      if (v == null) continue;
      items.push({
        key: id,
        price: v,
        color: id === 'supertrend' && supertrend ? (supertrend.up[at] ? colors.bull : colors.bear) : color,
      });
    }
    return placeOverlayTags(items, yOf, chartPlotH, PRICE_TAG_H, [
      ...(currentTagHidden ? [] : [{ top: currentTagTop, h: currentTagH }]),
      ...(crossTagTop != null ? [{ top: crossTagTop, h: crossTagH }] : []),
      ...selectionTags.map((t) => ({ top: t.top, h: PRICE_TAG_H })),
    ]);
  })();
  const priceTickUnderTag = (start: number) =>
    overlayTags.some((t) => boxesTouch(start, PRICE_LABEL_H, t.top, PRICE_TAG_H, TAG_CLEAR_GAP)) ||
    (!currentTagHidden &&
      boxesTouch(start, PRICE_LABEL_H, currentTagTop, currentTagH, TAG_CLEAR_GAP)) ||
    (crossTagTop != null &&
      boxesTouch(start, PRICE_LABEL_H, crossTagTop, crossTagH, TAG_CLEAR_GAP)) ||
    selectionTags.some((t) => boxesTouch(start, PRICE_LABEL_H, t.top, PRICE_TAG_H, TAG_CLEAR_GAP));
  const crossTimeText = crossCandle
    ? formatCrossTime(
        // منطقة المستقبل تتخطّى عطلة نهاية الأسبوع: يمين شمعة الجمعة يُقرأ افتتاح الأحد لا «السبت 03:00»
        projectBarTimeSec(series.symbol, barTime(crossCandle), timeframeStepSec(series.timeframe), crossAhead),
        visibleTimeSpan,
        tr.mcMonths,
        dayCandles,
        tr.mcWeekdays,
        timeframeStepSec(series.timeframe) >= 7 * 86400
      )
    : '';
  // العرض من طول النصّ: اسم اليوم («الأربعاء»، «چوارشەممە») وسنة شمعة قديمة يطيلان الوسم، وبالعرض
  // الثابت كانت الساعة تُقصّ «…». ~5.8px للحرف بخطّ 9 + الحشوة، لا أضيق من القديم ولا أعرض من اللوح.
  const crossTimeTagW = Math.min(
    Math.max(CROSS_TIME_TAG_W, Math.ceil(crossTimeText.length * 5.8) + 12),
    Math.max(CROSS_TIME_TAG_W, chartPlotW)
  );
  const crossTimeTagLeft = crossCandle
    ? Math.max(0, Math.min(chartPlotW - crossTimeTagW, crossX - crossTimeTagW / 2))
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
                accessibilityLabel={t.label}
                accessibilityState={{ selected: tool === t.id }}
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
            {selectedId ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tr.mcCloneDrawingA11y}
                style={({ pressed }) => [
                  styles.compactTool,
                  pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                ]}
                onPress={cloneSelectedDrawing}
              >
                <Text style={styles.compactToolIcon}>❐</Text>
                <Text style={styles.compactToolLabel}>{tr.mcCloneDrawing}</Text>
              </Pressable>
            ) : null}
            {selectedTrend ? (
              <Pressable
                accessibilityRole="switch"
                accessibilityLabel={arrowA11y}
                accessibilityState={{ checked: selectedArrow }}
                style={({ pressed }) => [
                  styles.compactTool,
                  selectedArrow && styles.compactToolOn,
                  pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                ]}
                onPress={toggleSelectedArrow}
              >
                <Text style={[styles.compactToolIcon, selectedArrow && styles.compactToolTextOn]}>➚</Text>
              </Pressable>
            ) : null}
            {selectedId ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={selectedLocked ? tr.mcUnlockDrawing : tr.mcLockDrawingA11y}
                accessibilityState={{ checked: selectedLocked }}
                style={({ pressed }) => [
                  styles.compactTool,
                  selectedLocked && styles.compactToolOn,
                  pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                ]}
                onPress={toggleSelectedLock}
              >
                <Text style={[styles.compactToolIcon, selectedLocked && styles.compactToolTextOn]}>
                  {selectedLocked ? '🔒' : '🔓'}
                </Text>
                <Text style={[styles.compactToolLabel, selectedLocked && styles.compactToolTextOn]}>
                  {selectedLocked ? tr.mcUnlockDrawing : tr.mcLockDrawing}
                </Text>
              </Pressable>
            ) : null}
            {selectedId && !selectedLocked
              ? nudgeButtons.map((b) => (
                  <Pressable
                    key={b.key}
                    accessibilityRole="button"
                    accessibilityLabel={b.a11y}
                    style={({ pressed }) => [
                      styles.compactTool,
                      pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                    ]}
                    onPress={() => nudgeSelectedDrawing(b.bars, b.steps)}
                    delayLongPress={NUDGE_HOLD_DELAY_MS}
                    onLongPress={() => startNudgeHold(b.bars, b.steps)}
                    onPressOut={stopNudgeHold}
                  >
                    <Text style={styles.compactToolIcon}>{b.icon}</Text>
                    <Text style={styles.compactToolLabel}>{tr.mcNudgeWord}</Text>
                  </Pressable>
                ))
              : null}
            {canRecolor ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={colorLabels.a11y}
                style={({ pressed }) => [
                  styles.compactTool,
                  pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                ]}
                onPress={cycleSelectedColor}
              >
                <Text style={[styles.compactToolIcon, { color: recolorTarget!.color }]}>●</Text>
                <Text style={styles.compactToolLabel}>{colorLabels.word}</Text>
              </Pressable>
            ) : null}
            {drawings.length ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={drawingsHidden ? tr.mcShowDrawings : tr.mcHideDrawings}
                accessibilityState={{ selected: drawingsHidden }}
                style={({ pressed }) => [
                  styles.compactTool,
                  drawingsHidden && styles.compactToolOn,
                  pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                ]}
                onPress={toggleDrawingsHidden}
              >
                <Text style={[styles.compactToolIcon, drawingsHidden && styles.compactToolTextOn]}>
                  {drawingsHidden ? '◎' : '◉'}
                </Text>
                <Text style={[styles.compactToolLabel, drawingsHidden && styles.compactToolTextOn]}>
                  {drawingsHidden ? `${tr.mcShowDrawings} (${drawings.length})` : tr.mcHideDrawings}
                </Text>
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
              accessibilityLabel={tr.mcClearAllTitle}
              style={({ pressed }) => [
                styles.compactTool,
                pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
              ]}
              onPress={() => {
                confirmDestructive({
                  title: tr.mcClearAllTitle,
                  body: tr.mcClearAllBody,
                  cancelText: tr.cancel,
                  confirmText: tr.mcClearWord,
                  onConfirm: () => {
                    pushDrawHistory();
                    setDrawings([]);
                    setPending(null);
                    setSelectedId(null);
                    void clearDrawings(series.symbol, drawingsOwner);
                  },
                });
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
            {localizedChartKinds(tr).flatMap((k) => [
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: kind === k.id }}
                key={k.id}
                style={({ pressed }) => [
                  styles.chip,
                  kind === k.id && styles.chipOn,
                  pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                ]}
                onPress={() => setKind(k.id)}
              >
                <Text style={[styles.chipText, kind === k.id && styles.chipTextOn]}>{k.label}</Text>
              </Pressable>,
              // Line Break مختار ⇒ عدد خطوط الانعكاس بجانبه يدور 2→3→4 (كشريحة انحراف ZigZag).
              ...(k.id === 'lineBreak' && kind === 'lineBreak'
                ? [
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={tr.mcLineBreakCountA11y
                        .replace('{count}', String(lineBreakCount))
                        .replace('{next}', String(nextLineBreakCount(lineBreakCount)))}
                      key="lineBreakCount"
                      style={({ pressed }) => [
                        styles.chip,
                        pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                      ]}
                      onPress={() => void saveLineBreakCount(nextLineBreakCount(lineBreakCount))}
                    >
                      <Text style={styles.chipText}>{`${lineBreakCount} ↻`}</Text>
                    </Pressable>,
                  ]
                : []),
            ])}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {localizedLenses(tr).map((l) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${l.label} — ${l.hint}`}
                accessibilityState={{ selected: lens === l.id }}
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
            {(() => {
              // التغيّر عن إغلاق الشمعة السابقة (`crossChange`)، بالنقاط أولاً لرموز الفوركس/المعادن
              // «+35.0 pips (+0.32%)».
              if (!crossChange) return null;
              const { ref } = crossChange;
              // بلا مواصفة pip (US30، BTC، DXY، النفط) ⇒ الفرق بمنازل السعر «+125.00 (+0.30%)» كـTradingView
              // لا النسبة وحدها — متداول المؤشرات يقيس الشمعة بالنقاط السعرية.
              const pips = signedDistanceText(series.symbol, ref, crossCandle.close, lang, priceDecimalsRef);
              return (
                <Text style={{ color: crossChange.color, fontWeight: '800' }}>
                  {pips ? ` ${pips} (${crossChange.pctText})` : ` ${crossChange.pctText}`}
                </Text>
              );
            })()}
            {(() => {
              const range = candleRangePipsText(series.symbol, crossCandle.high, crossCandle.low, lang);
              return range ? ` ${range}` : '';
            })()}
            {compareSeries
              ? (() => {
                  // إغلاق رمز المقارنة عند شمعة التقاطع (كان `last` الحاليّ أيّاً كانت الشمعة)
                  const c = crossIndex != null ? compareOv?.closes[crossIndex] : null;
                  return ` · ${compareSeries.symbol} ${c != null ? formatPrice(c, compareSeries.symbol, compareSeries.last) : '—'}`;
                })()
              : ''}
          </Text>
        ) : selectedSpanReadout ? (
          <Text style={[styles.readoutText, selectedSpan ? { color: selectedSpan.color } : null]}>
            {selectedSpanText}
          </Text>
        ) : (
          <Text style={styles.readoutMuted}>
            {replayEndedNotice && !replayOn
              ? tr.mcReplayEndedOnSwitch
              : replayOn
              ? tr.mcReplayReadout
                  .replace('{n}', String(source.plot.length))
                  .replace('{total}', String(source.windowLen))
              : tool === 'select'
                ? selectedId
                  ? selectedSpan?.tool === 'note'
                    ? Platform.OS === 'web'
                      ? tr.mcHintNoteSelectedWeb
                      : tr.mcHintNoteSelected
                    : Platform.OS === 'web'
                    ? tr.mcHintSelectedWeb
                    : tr.mcHintSelected
                  : tr.mcHintSelect
                : tool !== 'none'
                  ? Platform.OS === 'web'
                    ? tr.mcHintDrawWeb
                    : tr.mcHintDraw
                  : Platform.OS === 'web'
                    ? tr.mcHintNavigateWeb
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
            onPress={() => createAlert(crossPrice, 'crosshair')}
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
              accessibilityState={{ selected: replayOn }}
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
                  accessibilityState={{ selected: replayPlaying }}
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
              accessibilityLabel={tr.mcLogScaleA11y}
              accessibilityState={{ selected: logScale }}
              style={({ pressed }) => [
                styles.zoomBtn,
                logScale && styles.replayOn,
                pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
              ]}
              onPress={() => {
                setLogScale((v) => !v);
                setPercentScale(false);
              }}
            >
              <Text style={[styles.zoomText, logScale && styles.replayTextOn]}>Log</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr.mcPercentScaleA11y}
              accessibilityState={{ selected: percentScale }}
              style={({ pressed }) => [
                styles.zoomBtn,
                percentScale && styles.replayOn,
                pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
              ]}
              onPress={() => {
                setPercentScale((v) => !v);
                setLogScale(false);
              }}
            >
              <Text style={[styles.zoomText, percentScale && styles.replayTextOn]}>%</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr.mcMagnetA11y}
              accessibilityState={{ selected: magnet }}
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
            // لقارئ الشاشة: اسم الشارت (رمز · فريم) بدل عنصر بلا اسم؛ التفعيل (نقر مزدوج)
            // يلمس مركز اللوح فيضع الـcrosshair هناك ويُقرأ سطر OHLC أعلاه.
            accessibilityRole="image"
            accessibilityLabel={`${series.symbol} · ${series.timeframe}`}
            accessibilityHint={tr.mcHintNavigate}
            style={StyleSheet.absoluteFill}
            onPress={(e) =>
              onChartPress(e.nativeEvent.locationX, e.nativeEvent.locationY)
            }
          />
        ) : null}
        {/* grid */}
        {!hideGrid
          ? // على أسعار علامات المحور نفسها (كما بـTradingView)، لا على الأرباع — خطّ الشبكة يقرأ سعراً.
            priceTicks
              .filter((t) => t.ratio * chartPlotH > 2 && t.ratio * chartPlotH < chartPlotH - 2)
              .map((t) => (
                <View
                  key={t.price}
                  style={[styles.gridLine, { top: chartPlotH * t.ratio, right: PRICE_AXIS_WIDTH }]}
                />
              ))
          : null}

        {/* علامة الخلفية: الزوج والفريم خافتان وسط اللوح (قبل الشموع ⇒ خلفها) — راجع `watermark.ts`. */}
        {!hideGrid
          ? (() => {
              const mark = watermarkSymbol(series.symbol);
              const size = watermarkFontSize(chartPlotW, chartPlotH, mark);
              if (size == null) return null;
              return (
                <View
                  pointerEvents="none"
                  style={[styles.watermark, { width: chartPlotW, height: chartPlotH }]}
                >
                  <Text style={[styles.watermarkSymbol, { fontSize: size, lineHeight: size * 1.15 }]} numberOfLines={1}>
                    {mark}
                  </Text>
                  <Text style={[styles.watermarkTf, { fontSize: Math.round(size * 0.45) }]} numberOfLines={1}>
                    {series.timeframe}
                  </Text>
                </View>
              );
            })()
          : null}

        {/* فواصل أيام التداول (17:00 نيويورك) على الفريمات داخل اليوم — راجع `dayBreaks.ts`.
            لا على Renko/Kagi/P&F/Range: خانتها ليست زمناً فالكثافة لا تُقدَّر بالفريم. */}
        {!hideGrid && !isSyntheticKind(kind)
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
                  {sessionLabel(tr, run.id)}
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
                        const range = candleRangePipsText(series.symbol, hi, lo, lang);
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
        {/* الوضع المدمج (إطارات الشاشة الرئيسية المملوءة، وخلايا الرباعي بالهاتف) يُخفي سطر القراءة
            أسفل الشارت، فكان وضع التقاطع يعطي سعر المحور وزمنه فقط — بلا فتح/أعلى/أدنى/إغلاق.
            كـTradingView بالهاتف: OHLC أعلى يسار اللوح ما دام التقاطع قائماً، بأرقام ثابتة العرض فلا
            يرتجّ السطر أثناء السحب، والإغلاق بلون الشمعة. لوح أضيق من 240px (خلية رباعي) ⇒ سطران. */}
        {denseOhlc ? (
          <View
            pointerEvents="none"
            style={[styles.denseOhlc, { top: shadowStack ? 24 : 4 }]}
          >
            <Text style={styles.denseOhlcText} numberOfLines={1}>
              {`O ${fmtPrice(denseOhlc.open)}  H ${fmtPrice(denseOhlc.high)}`}
              {denseOhlcWide ? '  ' : null}
              {denseOhlcWide ? (
                <>
                  {`L ${fmtPrice(denseOhlc.low)}  C `}
                  <Text style={{ color: denseOhlc.close >= denseOhlc.open ? colors.bull : colors.bear }}>
                    {fmtPrice(denseOhlc.close)}
                  </Text>
                  {denseOhlcPct ? (
                    <Text style={{ color: denseOhlcPct.color }}>{`  ${denseOhlcPct.pctText}`}</Text>
                  ) : null}
                  {denseOhlcRange ? `  ${denseOhlcRange}` : null}
                </>
              ) : null}
            </Text>
            {!denseOhlcWide ? (
              <Text style={styles.denseOhlcText} numberOfLines={1}>
                {`L ${fmtPrice(denseOhlc.low)}  C `}
                <Text style={{ color: denseOhlc.close >= denseOhlc.open ? colors.bull : colors.bear }}>
                  {fmtPrice(denseOhlc.close)}
                </Text>
                {denseOhlcPct ? (
                  <Text style={{ color: denseOhlcPct.color }}>{`  ${denseOhlcPct.pctText}`}</Text>
                ) : null}
              </Text>
            ) : null}
          </View>
        ) : null}

        {priceLegend.chips.length > 0 || priceLegend.more > 0 ? (
          <View
            pointerEvents="none"
            style={[
              styles.priceLegend,
              {
                top:
                  (shadowStack ? 24 : 4) +
                  (denseOhlc ? (denseOhlcWide ? DENSE_OHLC_LINE_H : DENSE_OHLC_LINE_H * 2) + 6 : 0),
              },
            ]}
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
                <Text style={styles.priceLegendText}>
                  {VOLUME_PRICE_OVERLAYS.has(chip.id) ? volName(chip.label) : chip.label}
                </Text>
                {(() => {
                  const at = crossIndex ?? legendLastIdx;
                  const parts = legendMultiParts(chip.id, at);
                  if (parts) {
                    return parts.map((p, k) => (
                      <Text key={k} style={[styles.priceLegendValue, { color: p.color }]}>
                        {p.text}
                      </Text>
                    ));
                  }
                  const v = legendValueText(chip.id, at);
                  if (!v) return null;
                  // Supertrend بلونين: القيمة بلون جانب الترند عند الشمعة (أخضر تحت السعر، أحمر فوقه).
                  const color =
                    chip.id === 'supertrend' && supertrend
                      ? supertrend.up[at] ? colors.bull : colors.bear
                      : chip.swatch.length === 1
                        ? resolveColorExpr(chip.swatch[0]!, legendTokens)
                        : null;
                  return (
                    <Text style={[styles.priceLegendValue, color ? { color } : null]}>
                      {v}
                    </Text>
                  );
                })()}
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
          kind === 'range' ||
          kind === 'lineBreak') &&
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
              // خطّ عمودي لكل انعكاس (`kagi.ts`) + وصلة أفقية من الخطّ السابق عند `open`. السميك (yang) بلون
              // الصعود والرفيع (yin) بلون الهبوط، ويتبدّل وسط الخطّ عند `flipAt` (كسر كتف/خصر).
              const k = (c as SyntheticBar).kagi;
              const thickOpen = k ? k.thickAtOpen : bull;
              const w = (thick: boolean) => (thick ? 3.5 : 1.5);
              const tint = (thick: boolean) => (thick ? candleBull : candleBear);
              const x = xOf(i);
              const vSeg = (from: number, to: number, thick: boolean, key: string) => {
                const y1 = Math.max(laneTop, Math.min(yP(from), yP(to)));
                const y2 = Math.min(laneBot, Math.max(yP(from), yP(to)));
                return y2 > y1 ? (
                  <View
                    key={key}
                    style={{
                      position: 'absolute',
                      left: x - w(thick) / 2,
                      top: y1 - w(thick) / 2,
                      width: w(thick),
                      height: y2 - y1 + w(thick),
                      backgroundColor: tint(thick),
                    }}
                  />
                ) : null;
              };
              const yOpen = yP(c.open);
              const xPrev = i > 0 ? xOf(i - 1) : x;
              return (
                <View key={i} pointerEvents="none" style={StyleSheet.absoluteFill}>
                  {i > 0 && inLane(yOpen) ? (
                    <View
                      style={{
                        position: 'absolute',
                        left: xPrev,
                        top: yOpen - w(thickOpen) / 2,
                        width: x - xPrev,
                        height: w(thickOpen),
                        backgroundColor: tint(thickOpen),
                      }}
                    />
                  ) : null}
                  {k?.flipAt != null
                    ? [vSeg(c.open, k.flipAt, thickOpen, 'a'), vSeg(k.flipAt, c.close, !thickOpen, 'b')]
                    : vSeg(c.open, c.close, thickOpen, 'a')}
                </View>
              );
            }
            if (kind === 'pnf') {
              // عمود كامل بخانة واحدة (`pointFigure.ts`): رمز لكل صندوق متمركز على مستواه، ‎open ± box … close‎.
              // الخلية أصغر من 6px (تصغير بعيد) ⇒ عمود مصمت/مفرّغ بدل رموز متراكبة لا تُقرأ.
              const box = (c as SyntheticBar).box;
              const n = box ? Math.max(1, Math.round(Math.abs(c.close - c.open) / box)) : 1;
              const step = box ? (bull ? box : -box) : c.close - c.open;
              const cellPx = box ? Math.abs(yP(c.open) - yP(c.open + box)) : bodyH;
              const glyphW = Math.max(4, primaryBodyW);
              if (cellPx < 6) {
                const y1 = Math.max(laneTop, Math.min(yP(c.open + step), yP(c.close)) - cellPx / 2);
                const y2 = Math.min(laneBot, Math.max(yP(c.open + step), yP(c.close)) + cellPx / 2);
                return y2 > y1 ? (
                  <View
                    key={i}
                    style={{
                      position: 'absolute',
                      left: xOf(i) - glyphW / 2,
                      top: y1,
                      width: glyphW,
                      height: y2 - y1,
                      backgroundColor: bull ? color : 'transparent',
                      borderWidth: bull ? 0 : 1.5,
                      borderColor: color,
                    }}
                  />
                ) : null;
              }
              const font = Math.max(7, Math.min(16, cellPx * 0.95, glyphW * 1.1));
              const glyphs = [];
              for (let k = 1; k <= n; k++) {
                const y = yP(c.open + step * k);
                if (y - cellPx / 2 < laneTop || y + cellPx / 2 > laneBot) continue;
                glyphs.push(
                  <Text
                    key={k}
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: y - cellPx / 2,
                      height: cellPx,
                      lineHeight: cellPx,
                      color,
                      fontSize: font,
                      fontWeight: '900',
                      textAlign: 'center',
                      includeFontPadding: false,
                    }}
                  >
                    {bull ? 'X' : 'O'}
                  </Text>
                );
              }
              return (
                <View
                  key={i}
                  pointerEvents="none"
                  style={{ position: 'absolute', left, top: 0, width: primaryColW, height: mainH }}
                >
                  {glyphs}
                </View>
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
            const prev = i > 0 ? comparePrices[i - 1] : null;
            if (p == null || prev == null) return null;
            const x1 = xOf(i - 1);
            const y1 = yOf(prev);
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
              return zigzag.map((sg, idx) => {
                const x1 = xOf(sg.x1);
                const y1 = yOf(sg.y1);
                const x2 = xOf(sg.x2);
                const y2 = yOf(sg.y2);
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
                      // الساق الجارية لم تنعكس بعد ⇒ قد تمتدّ أو تُلغى، فتُخفَّف.
                      opacity: sg.tentative ? 0.45 : 0.9,
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
        {/* Chande Kroll: خطّا الوقف كـTradingView (يتقاطعان) — وقف الشراء ثم وقف البيع. */}
        {indicators.includes('chandeKroll') &&
          chandeKroll &&
          planLineSegments(chandeKroll.longStop, xOf, yOf).map((sg) => (
            <View
              key={`ckl${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#99F6E4',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
              }}
            />
          ))}
        {indicators.includes('chandeKroll') &&
          chandeKroll &&
          planLineSegments(chandeKroll.shortStop, xOf, yOf).map((sg) => (
            <View
              key={`cks${sg.at}`}
              style={{
                position: 'absolute',
                left: sg.left,
                top: sg.top - 1,
                width: sg.len,
                height: 2,
                backgroundColor: '#F9A66C',
                transform: [{ rotate: `${sg.deg}deg` }],
                transformOrigin: 'left center',
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
          ichimokuCloud &&
          planBandStrips(ichimokuCloud.spanA, ichimokuCloud.spanB, xOf, yOf, bandW).map((bnd) => (
            <View
              key={`ichc${bnd.at}`}
              style={{
                position: 'absolute',
                left: bnd.left,
                top: bnd.top,
                width: bnd.width,
                height: bnd.height,
                // لون السحابة من اتجاهها: A فوق B صاعدة. `bnd.at` فهرس الشمعة نفسه.
                // المُسقَطة يمين آخر شمعة أبهت قليلاً — تُقرأ «قادمة» لا سعراً مضى.
                backgroundColor:
                  (ichimokuCloud.spanA[bnd.at] ?? 0) >= (ichimokuCloud.spanB[bnd.at] ?? 0)
                    ? bnd.at >= source.plot.length ? 'rgba(34,197,94,0.09)' : 'rgba(34,197,94,0.14)'
                    : bnd.at >= source.plot.length ? 'rgba(244,63,94,0.09)' : 'rgba(244,63,94,0.14)',
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
          alligatorLines &&
          planLineSegments(alligatorLines.jaw, xOf, yOf).map((sg) => (
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
          alligatorLines &&
          planLineSegments(alligatorLines.teeth, xOf, yOf).map((sg) => (
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
          alligatorLines &&
          planLineSegments(alligatorLines.lips, xOf, yOf).map((sg) => (
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

        {/* Pine-lite overlay — ناتج غير سعري بمقياسه الخاص بشريط أسفل اللوح (كـ«No scale» بـTradingView) */}
        {pineLine.map((v, i) => {
          if (i === 0 || v == null || pineLine[i - 1] == null) return null;
          const yP = pineOnPrice ? yOf : pineStripY;
          const x1 = xOf(i - 1);
          const y1 = yP(pineLine[i - 1]!);
          const x2 = xOf(i);
          const y2 = yP(v);
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
            {/* ملفّ الحجم بلا شارة بالمفتاح: «≈» هنا حين الحجم تقديري (فوليوم الفوركس `null`). TPO يعدّ الزمن
                لا الحجم، والـfootprint موسوم «≈» بأرقامه. */}
            <Text style={[styles.fibLabel, { right: plotRightInset + 2 }]}>{volName('POC')}</Text>
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
                        ? signedDistanceText(series.symbol, currentPrice, lv.price, lang, priceDecimalsRef)
                        : null;
                    return pips ? <Text style={styles.levelPipText}>{` · ${pips}`}</Text> : null;
                  })()}
                </Text>
              ) : null}
            </View>
          );
        })}

        {/* التنبيهات المُسلَّحة لهذا الرمز: خطّ كهرماني متقطّع + وسم عند المحور «🔔 ▲ السعر · المسافة بالـpip». */}
        {armedAlerts.map((al) => {
          const dragging = alertDrag?.id === al.id;
          const price = dragging ? alertDrag.price : al.price;
          const condition = dragging ? alertDirection(price, al.condition) : al.condition;
          const y = yOf(price);
          if (!Number.isFinite(y) || y < 0 || y > chartPlotH) return null;
          const pips = Number.isFinite(currentPrice)
            ? signedDistanceText(series.symbol, currentPrice, price, lang, priceDecimalsRef)
            : null;
          // قارئ الشاشة: الوسم رموز («🔔 ▲») — جملة كاملة على الخطّ نفسه، فتُقرأ ولو أُخفيت وسوم الأسعار.
          const a11yTpl = condition === 'above' ? tr.mcArmedAlertAboveA11y : tr.mcArmedAlertBelowA11y;
          const a11y = (pips ? a11yTpl.replace('{dist}', pips) : a11yTpl.replace(/\s*—\s*\{dist\}/, '')).replace(
            '{price}',
            fmtPrice(price)
          );
          return (
            <View
              key={`alert${al.id}`}
              pointerEvents="none"
              accessible
              accessibilityLabel={a11y}
              accessibilityHint={tr.mcArmedAlertAdjustHint}
              accessibilityRole="adjustable"
              accessibilityValue={{ text: fmtPrice(price) }}
              accessibilityActions={ALERT_NUDGE_ACTIONS}
              onAccessibilityAction={(e) => {
                const act = e.nativeEvent.actionName;
                if (act === 'increment' || act === 'decrement') nudgeAlert(al, act === 'increment' ? 1 : -1);
              }}
              style={[styles.hLine, styles.alertLine, { top: y }]}
            >
              {!hidePriceLabels && alertLabelIds.has(al.id) ? (
                <Text
                  style={[
                    styles.levelPriceLabel,
                    styles.alertLabel,
                    dragging && styles.levelPriceLabelSel,
                    y < LEVEL_LABEL_H && styles.levelLabelBelow,
                    { right: plotRightInset + 2 },
                  ]}
                  numberOfLines={1}
                >
                  🔔 {condition === 'above' ? '▲' : '▼'} {fmtPrice(price)}
                  {pips ? <Text style={styles.levelPipText}>{` · ${pips}`}</Text> : null}
                </Text>
              ) : null}
            </View>
          );
        })}

        {volProfile
          ? (() => {
              const maxV = Math.max(...volProfile.map((r) => r.volume), 1);
              // كل عمود يملأ خانته السعرية (فجوة 1px) كـTradingView — كانت خطوطاً بسُمك 2px تفصلها فراغات
              // واسعة على الهاتف، فلا يُقرأ شكل التوزيع ولا أين يتكدّس الحجم. عمود 2px على الأقل.
              const step = volProfile.length > 1 ? volProfile[1].price - volProfile[0].price : 0;
              return volProfile.map((row, i) => {
                const yTop = yOf(row.price + step / 2);
                const h = Math.max(2, Math.abs(yOf(row.price - step / 2) - yTop) - 1);
                return (
                  <View
                    key={`vp${i}`}
                    style={{
                      position: 'absolute',
                      right: plotRightInset,
                      top: step > 0 ? Math.min(yTop, yOf(row.price - step / 2)) + 0.5 : yOf(row.price),
                      width: (row.volume / maxV) * Math.max(24, chartPlotW * 0.16),
                      height: step > 0 ? h : 2,
                      backgroundColor: 'rgba(56,189,248,0.3)',
                    }}
                  />
                );
              });
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
                      <Text style={[styles.fibLabel, { right: plotRightInset + 2 }]}>TPO</Text>
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
                  {/* «≈»: دلتا تقديرية من شكل الشمعة (`computeFootprint`) لا أحجام شراء/بيع حقيقية. */}
                  {fp.delta >= 0 ? '≈+' : '≈'}
                  {Math.round(fp.delta / 100)}
                </Text>
              );
            })
          : null}

        {/* drawings */}
        {visibleDrawings.map(({ d, aLocal, bLocal }) => {
          const sel = d.id === selectedId;
          if (d.tool === 'hline' || d.tool === 'hray') {
            // الشعاع الأفقي: مستوى يبدأ من قمّة/قاع بعينه ويمتدّ يميناً فقط — ما يرسمه متداول
            // الفوركس للدعم/المقاومة كي لا يقطع الخطّ تاريخاً سابقاً لم يكن فيه المستوى قائماً.
            // خطّ متّصل لا متقطّع كي لا يُخلَط بالأفقي الكامل، ووسمه عند بدايته.
            const rayX = d.tool === 'hray' ? Math.max(0, xOf(aLocal)) : 0;
            if (d.tool === 'hray' && rayX >= chartPlotW - 2) return null;
            return (
              <View
                key={d.id}
                style={[
                  styles.hLine,
                  d.tool === 'hray' && [styles.hRay, { left: rayX, width: chartPlotW - rayX }],
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
                {d.tool === 'hray' && sel ? (
                  <View style={[styles.grabHandle, { left: 0, top: -1.25, borderColor: d.color }]} />
                ) : null}
                {hlinePriceLabels.has(d.id) ? (() => {
                  // شعاع يبدأ قرب الشمعة الحيّة: الوسم داخل عرض الشعاع (أحياناً بضع بكسلات) فيُقصّ «1.0…»
                  // (أو يمرّ تحت المحور على الويب). حينها يُقلب يسار بداية الشعاع ويُحاذى يميناً — كـ`noteBox`.
                  // (خلية رباعي ضيّقة لا يتّسع يسارها للوسم ⇒ يبقى كما كان.)
                  const flip =
                    d.tool === 'hray' && chartPlotW - rayX < HRAY_LABEL_ROOM && rayX >= HRAY_LABEL_ROOM + 8;
                  const below = yOf(d.a.price) < LEVEL_LABEL_H;
                  const label = (
                  <Text
                    style={[
                      styles.levelPriceLabel,
                      { color: d.color },
                      d.tool === 'hray' && styles.hRayLabel,
                      sel && styles.levelPriceLabelSel,
                      below && styles.levelLabelBelow,
                      flip && styles.hRayLabelFlipped,
                    ]}
                    numberOfLines={1}
                  >
                    {fmtPrice(d.a.price)}
                    {/* كم يبعد المستوى عن السعر الجاري بالـpip (+ فوقه، − تحته) — المتداول يرسم
                        الدعم ليعرف كم بقي للوصول إليه؛ الرقم نفسه الذي تعطيه أداة القياس. */}
                    {(() => {
                      const pips = Number.isFinite(currentPrice)
                        ? signedDistanceText(series.symbol, currentPrice, d.a.price, lang, priceDecimalsRef)
                        : null;
                      return pips ? <Text style={styles.levelPipText}>{` · ${pips}`}</Text> : null;
                    })()}
                  </Text>
                  );
                  return flip ? (
                    <View
                      pointerEvents="none"
                      style={[
                        styles.hRayLabelBox,
                        { left: -HRAY_LABEL_ROOM - 8 },
                        below && styles.levelLabelBelow,
                      ]}
                    >
                      {label}
                    </View>
                  ) : (
                    label
                  );
                })() : null}
              </View>
            );
          }
          if (d.tool === 'vline' && aLocal >= 0 && aLocal <= lastDrawLocal) {
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
          if (d.tool === 'note' && aLocal >= 0 && aLocal <= lastDrawLocal) {
            // قرب الشمعة الحيّة يُقلب لينتهي عند الإرساء بدل المرور تحت محور السعر (`noteBox`).
            const noteText = d.text || tr.mcNoteDefault;
            const box = noteBox(xOf(aLocal), noteText, chartPlotW);
            return (
              <Text
                key={d.id}
                numberOfLines={1}
                style={[
                  styles.note,
                  {
                    left: box.left,
                    maxWidth: box.width,
                    top: yOf(d.a.price),
                    color: d.color,
                    textAlign: box.flipped ? 'right' : 'left',
                  },
                  box.flipped ? { width: box.width } : null,
                  sel ? [styles.noteSel, { borderColor: d.color }] : null,
                ]}
              >
                {noteText}
              </Text>
            );
          }
          if ((d.tool === 'trend' || d.tool === 'ray') && d.b) {
            const seg = (d.tool === 'ray' ? raySegment : clipSegmentToBars)(
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
                {/* رأس السهم عند الطرف الثاني (وجهة الحركة المتوقّعة) — فقط إن ظهر الطرف بالنافذة لا حين قُصّ. */}
                {d.tool === 'trend' && d.arrow && seg.bi === bLocal && len >= 6
                  ? ARROW_HEAD_SPREAD.map((spread) => (
                      <View
                        key={spread}
                        style={{
                          position: 'absolute',
                          left: x2,
                          top: y2,
                          width: Math.min(ARROW_HEAD_LEN, len * 0.6),
                          height: sel ? 3.5 : 2,
                          borderRadius: 1,
                          backgroundColor: d.color,
                          transform: [{ rotate: `${angle + 180 + spread}deg` }],
                          transformOrigin: 'left center',
                        }}
                      />
                    ))
                  : null}
                {sel && !('extended' in seg && seg.extended) ? (
                  <>
                    <View style={[styles.grabHandle, { left: x1, top: y1, borderColor: d.color }]} />
                    <View style={[styles.grabHandle, { left: x2, top: y2, borderColor: d.color }]} />
                  </>
                ) : null}
              </React.Fragment>
            );
          }
          if (d.tool === 'channel' && d.b) {
            // خطّ الأساس والموازي بلون الرسم، والوسط متقطّع باهت (نصف القناة — حيث يرتدّ السعر كثيراً).
            const w = d.width ?? 0;
            const yA = yOf(d.a.price);
            const yB = yOf(d.b.price);
            const line = (key: string, ay: number, by: number, style: object) => {
              const seg = clipSegmentToBars(aLocal, ay, bLocal, by, lastDrawLocal);
              const x1 = xOf(seg.ai);
              const x2 = xOf(seg.bi);
              return (
                <View
                  key={key}
                  style={[
                    {
                      position: 'absolute',
                      left: x1,
                      top: seg.ay,
                      width: Math.hypot(x2 - x1, seg.by - seg.ay),
                      transform: [{ rotate: `${(Math.atan2(seg.by - seg.ay, x2 - x1) * 180) / Math.PI}deg` }],
                      transformOrigin: 'left center',
                    },
                    style,
                  ]}
                />
              );
            };
            const solid = { height: sel ? 3.5 : 2, backgroundColor: d.color };
            // متوازية بالبكسل بالمقياس اللوغاريتمي أيضاً (`channelLinePrices`).
            const par = channelLinePrices(d.a, d.b, w, 1, logScale);
            const mid = channelLinePrices(d.a, d.b, w, 0.5, logScale);
            return (
              <React.Fragment key={d.id}>
                {line('base', yA, yB, solid)}
                {line('par', yOf(par.a), yOf(par.b), solid)}
                {line('mid', yOf(mid.a), yOf(mid.b), [
                  styles.channelMid,
                  { borderColor: d.color },
                ])}
                {sel ? (
                  <>
                    <View style={[styles.grabHandle, { left: xOf(aLocal), top: yA, borderColor: d.color }]} />
                    <View style={[styles.grabHandle, { left: xOf(bLocal), top: yB, borderColor: d.color }]} />
                    <View
                      style={[
                        styles.grabHandle,
                        styles.channelWidthHandle,
                        {
                          left: xOf((aLocal + bLocal) / 2),
                          top: yOf(channelHandlePrice(d.a, d.b, w)),
                          borderColor: d.color,
                        },
                      ]}
                    />
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
                    // لون أعاد المتداول اختياره ⇒ التعبئة بصبغته (hex + شفافية)؛ وإلا الأصل كما كان.
                    backgroundColor:
                      d.color !== accent && /^#[0-9a-f]{6}$/i.test(d.color)
                        ? `${d.color}${d.tool === 'zone' ? '1F' : '1A'}`
                        : d.tool === 'zone'
                          ? 'rgba(45,212,191,0.12)'
                          : 'rgba(251,191,36,0.1)',
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
                          Math.min(d.a.price, d.b.price),
                          lang
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
            const fromHigh = d.a.price > d.b.price;
            // الخطوط كلّها تُرسم (هي الأداة)، والوسوم وحدها تُنقّى — راجع `fibLabels.ts`
            // و`fibLabelPlans` أعلاه (تتجنّب وسوم الخطوط الأفقية وفيبو المرسوم قبله).
            const labelled = new Map((fibLabelPlans.get(d.id) ?? []).map((l) => [l.level, l.text]));
            return (
              <View key={d.id}>
                {FIB_DRAW_LEVELS.map((lv) => {
                  const price = fibLevelPrice(hi, lo, lv, fromHigh);
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
                      {text ? (
                        <Text style={[styles.fibLevelLabel, yOf(price) < LEVEL_LABEL_H && styles.levelLabelBelow]}>
                          {text}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
                {/* قطر التأرجح A→B متقطّعاً (كـTradingView): المستويات أفقية بعرض اللوح، فبلا القطر لا يُرى
                    على أيّ قمّة وقاع رُسم فيبو — ولا أين طرفاه اللذان يُسحبان لتعديله (مقبضان عند التحديد). */}
                {(() => {
                  const seg = clipSegmentToBars(aLocal, yOf(d.a.price), bLocal, yOf(d.b.price), lastDrawLocal);
                  const x1 = xOf(seg.ai);
                  const x2 = xOf(seg.bi);
                  const len = Math.hypot(x2 - x1, seg.by - seg.ay);
                  if (!(len > 0)) return null;
                  const angle = (Math.atan2(seg.by - seg.ay, x2 - x1) * 180) / Math.PI;
                  return (
                    <View
                      pointerEvents="none"
                      style={[
                        styles.fibSwingLine,
                        {
                          left: x1,
                          top: seg.ay,
                          width: len,
                          borderColor: d.color,
                          transform: [{ rotate: `${angle}deg` }],
                        },
                      ]}
                    />
                  );
                })()}
                {sel ? (
                  <>
                    <View style={[styles.grabHandle, { left: xOf(aLocal), top: yOf(d.a.price), borderColor: d.color }]} />
                    <View style={[styles.grabHandle, { left: xOf(bLocal), top: yOf(d.b.price), borderColor: d.color }]} />
                  </>
                ) : null}
              </View>
            );
          }
          return null;
        })}

        {/* علامة 🔒 صغيرة عند مرساة كل رسم مقفول (كـTradingView): كان القفل يُرى بالشريط فقط حين يُحدَّد الرسم،
            فيحاول المتداول سحب خطّ لا يتحرّك ولا يعرف لماذا. مقصوصة لحدود اللوح (الأفقي مرساته قد تكون خارج النافذة). */}
        {interactive
          ? visibleDrawings.map(({ d, aLocal }) => {
              if (!d.locked) return null;
              const x = Math.max(2, Math.min(chartPlotW - LOCK_BADGE_W - 2, xOf(aLocal) + 4));
              const y = Math.max(0, Math.min(chartPlotH - LOCK_BADGE_H, yOf(d.a.price) - LOCK_BADGE_H - 2));
              if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
              return (
                <View
                  key={`lock-${d.id}`}
                  pointerEvents="none"
                  style={[styles.lockBadge, { left: x, top: y, borderColor: d.color }]}
                >
                  <Text style={styles.lockBadgeText}>🔒</Text>
                </View>
              );
            })
          : null}

        {/* محرّر نصّ الملاحظة المحدَّدة — تحتها مباشرةً. التراجع يعيد النصّ السابق كلّه (لقطة واحدة
            عند أوّل حرف لا لكل حرف). Backspace هنا لا يحذف الرسم (`webKeyChart` يتجاهل خانات الكتابة). */}
        {(() => {
          if (!interactive || drawingsHidden || !selectedId) return null;
          const hit = visibleDrawings.find((v) => v.d.id === selectedId);
          if (!hit || hit.d.tool !== 'note') return null;
          const d = hit.d;
          const noteW = Math.min(180, Math.max(96, chartPlotW - 8));
          const left = Math.max(2, Math.min(chartPlotW - noteW - 2, xOf(hit.aLocal)));
          const below = yOf(d.a.price) + 18;
          const top = below + 30 > chartPlotH ? Math.max(0, yOf(d.a.price) - 32) : Math.max(0, below);
          return (
            <TextInput
              key={`noteEdit-${d.id}`}
              accessibilityLabel={tr.mcNoteTextA11y}
              defaultValue={d.text ?? ''}
              placeholder={tr.mcNoteDefault}
              placeholderTextColor={colors.textMuted}
              maxLength={60}
              returnKeyType="done"
              blurOnSubmit
              selectTextOnFocus
              onFocus={() => {
                noteEditPushed.current = false;
              }}
              onChangeText={(value) => {
                if (!noteEditPushed.current) {
                  pushDrawHistory();
                  noteEditPushed.current = true;
                }
                const text = value.trim() ? value : undefined;
                setDrawings((list) => list.map((x) => (x.id === d.id ? { ...x, text } : x)));
              }}
              style={[styles.noteEdit, { left, top, width: noteW, borderColor: d.color, color: d.color }]}
            />
          );
        })()}

        {pending && dragEnd && isPositionTool(tool)
          ? // المعاينة هي الأداة نفسها: المتداول يرى الوقف والهدف ونقاطهما وهو يسحب، لا خطّاً يُخمّن منه.
            renderPosition('positionPreview', tool, pending, positionEndPoint(pending, dragEnd), undefined, accent, false, true)
          : null}

        {pending && dragEnd && tool !== 'none' && tool !== 'select' && tool !== 'hline' && tool !== 'hray' && tool !== 'vline' && tool !== 'note' && !isPositionTool(tool) ? (
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
                : { right: Math.max(plotRightInset, chartW - x2 - 12) };
            // اليسار يُقاس حتى المحور لا حتى حافّة الشارت: كان الوسم عند شمعة الحيّة أو من منتصف اللوح
            // يمرّ تحت المحور (68px مصمتة) فتُقصّ «%» آخر السطر.
            const tagMaxW =
              side.left != null ? chartW - plotRightInset - side.left : chartW - 2 - (side.right ?? 0);
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
              const onLeft = x2 < chartPlotW / 2;
              const inset = onLeft ? Math.max(2, x2 - 12) : Math.max(plotRightInset, chartW - x2 - 12);
              const side = onLeft ? { left: inset } : { right: inset };
              const tagMaxW = onLeft ? chartW - plotRightInset - inset : chartW - 2 - inset;
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

        {/* مقابض سحب خطوط التنبيه — فوق سطح الإيماءات، بموضع وسم كل خطّ. */}
        {canPan && tool === 'none' && !replayOn && !hidePriceLabels
          ? armedAlerts.map((al) => {
              const y = yOf(alertDrag?.id === al.id ? alertDrag.price : al.price);
              if (!Number.isFinite(y) || y < 0 || y > chartPlotH) return null;
              return (
                <AlertDragHandle
                  key={`alertDrag${al.id}`}
                  top={y}
                  right={plotRightInset}
                  onStart={() => {
                    alertDragStartY.current = yOf(al.price);
                    setAlertDrag({ id: al.id, price: al.price });
                  }}
                  onDrag={(dy) => setAlertDrag({ id: al.id, price: alertDragPrice(dy) })}
                  onDrop={(dy) => dropAlert(al, dy)}
                />
              );
            })
          : null}

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
              key={tick.price}
              pointerEvents="none"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={[styles.priceAxisLabel, { top: priceTickBoxes[i].start }]}
            >
              {tick.label ?? fmtPrice(tick.price)}
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
              {percentBase != null && percentBase > 0
                ? formatScalePercent((currentPrice / percentBase - 1) * 100)
                : fmtPrice(currentPrice)}
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
          {overlayTags.map((t) => (
            <View
              key={`ov-${t.key}`}
              pointerEvents="none"
              style={[styles.selectionPriceTag, styles.overlayPriceTag, { top: t.top, backgroundColor: t.color }]}
            >
              <Text style={[styles.crossTagText, { color: tagTextColor(t.color) }]}>{fmtPrice(t.price)}</Text>
            </View>
          ))}
          {lockedHint && selectedLocked ? (
            <View pointerEvents="none" style={styles.lockedHint}>
              <Text style={styles.lockedHintText}>🔒 {tr.mcDrawingLockedHint}</Text>
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
            {crossPctText ? (
              <Text
                style={styles.crossPipsText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {crossPctText}
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
              // السابق **المطبوع** لا السابق بالفهرس: علامة يناير المخفيّة بالتراكب كانت «السابقة» لفبراير فلا
              // تُطبع السنة — المحور «1 نوف · 1 ديس · 1 فبر» بلا إشارة لسنة جديدة.
              // تحت وسم زمن التقاطع: الوسم يغطّيها فلا يظهر منها إلا طرفٌ مبتور
              if (
                crossTimeTagLeft != null &&
                boxesTouch(box.start, timeLabelW, crossTimeTagLeft, crossTimeTagW, TAG_CLEAR_GAP)
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
                    timeAxisHours,
                    prevShownTickTime(box.i, candle)
                  )}
                </Text>
              );
            })}
            {crossCandle ? (
              <View
                pointerEvents="none"
                style={[
                  styles.crossTimeTag,
                  { width: crossTimeTagW, left: crossTimeTagLeft ?? 0 },
                ]}
              >
                <Text style={styles.crossTagText} numberOfLines={1}>
                  {crossTimeText}
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
            onPress={resetChartView}
            hitSlop={8}
            accessibilityLabel={priceManual ? tr.mcAutoManualA11y : tr.mcAutoA11y}
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
            accessibilityLabel={tr.mcToLatestA11y}
            style={({ pressed }) => [
              styles.toLatestBtn,
              { right: PRICE_AXIS_WIDTH + 8, bottom: timeAxisH + 8 },
              pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
            ]}
            onPress={() => {
              pricePanRef.current = 0;
              xPanRef.current = restXPan();
              xPanAtRest.current = true;
              offsetRef.current = 0;
              setPricePan(0);
              setXPan(xPanRef.current);
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
          {/* «≈»: السلسلة بلا فوليوم (الفوركس يُرسل 0) فالأعمدة تقدير من مدى الشموع (`estimatedVolume`) لا حجم تداول. */}
          <PaneValueHead
            name={volName('VOL')}
            values={volumeSeries ?? []}
            at={crossIndex}
            tone="none"
            hint={volEstimated ? tr.mcVolEstimatedHint : undefined}
          />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          {/* تقديري من اتجاه الشموع (`orderflow.ts`)، لا دلتا تدفّق أوامر — الفوركس بلا شريط مركزي. */}
          <PaneValueHead name={`CVD (${tr.mcEstimatedTag})`} values={cvd} at={crossIndex} tone="trend" />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <TrendLineSeries values={cvd} paneH={paneH} />
          </View>
        </View>
      ) : null}

      {obv ? (
        <View style={[styles.pane, { height: paneH }]}>
          {/* اللون بالاتّجاه لا بالإشارة: OBV تراكمي فإشارته تعتمد على نقطة البدء
              (نافذة الرسم) لا على السوق، بينما ألوان أعمدته أصلاً `v >= obv[i-1]`. */}
          <PaneValueHead name={volName('OBV')} values={obv} at={crossIndex} tone="trend" />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <TrendLineSeries values={obv} paneH={paneH} />
          </View>
        </View>
      ) : null}

      {nvi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name={volName('NVI')} values={nvi} at={crossIndex} tone="trend" />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <TrendLineSeries values={nvi} paneH={paneH} />
          </View>
        </View>
      ) : null}

      {adl ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name={volName('A/D')} values={adl} at={crossIndex} tone="trend" />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <TrendLineSeries values={adl} paneH={paneH} />
          </View>
        </View>
      ) : null}

      {rvix ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="RVI (Vol)" values={rvix} at={crossIndex} tone="sign" center={50} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <PaneGuideLines paneId="rvix" innerH={paneH - 16} />
            <BoundedLineSeries values={rvix} paneH={paneH} color={(v) => (v > 50 ? colors.bull : v < 50 ? colors.bear : accent)} />
          </View>
        </View>
      ) : null}

      {stc ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneHead paneId="stc" name="STC" values={stc} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <PaneGuideLines paneId="stc" innerH={paneH - 16} />
            <BoundedLineSeries values={stc} paneH={paneH} color={(v) => (v > 75 ? colors.bear : v < 25 ? colors.bull : accent)} />
          </View>
        </View>
      ) : null}

      {cog ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="COG" values={cog} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneValueHead name={volName('Net Vol')} values={netVolume} at={crossIndex} tone="trend" />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <TrendLineSeries values={netVolume} paneH={paneH} levels={NET_VOLUME_LEVELS} />
          </View>
        </View>
      ) : null}

      {donchianWidth ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="DC Width" values={donchianWidth} at={crossIndex} tone="trend" />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneHead paneId="connorsRsi" name="Connors RSI" values={connorsRsi} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <PaneGuideLines paneId="connorsRsi" innerH={paneH - 16} />
            <BoundedLineSeries values={connorsRsi} paneH={paneH} color={(v) => (v > 90 ? colors.bear : v < 10 ? colors.bull : accent)} />
          </View>
        </View>
      ) : null}

      {keltnerWidth ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="KC Width" values={keltnerWidth} at={crossIndex} tone="trend" />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneValueHead name={volName('VW-MACD')} values={vwMacd.hist} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
                              // درجتان كهيستوغرام MACD أدناه: يقوى مُشبَع، يخبو باهت.
                              opacity: (v >= 0) === vwMacd.histUp[i] ? 0.85 : 0.3,
                            }}
                          />
                        ) : null}
                      </View>
                    );
                  })}
                  <PaneLineLayer
                    innerH={g.innerH}
                    y={g.y}
                    lines={[
                      { values: vwMacd.signal, color: colors.warn, opacity: 0.9 },
                      { values: vwMacd.macdLine, color: accent },
                    ]}
                  />
                </>
              );
            })()}
          </View>
        </View>
      ) : null}

      {disparityIndex ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="Disparity" values={disparityIndex} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneHead paneId="tii" name="TII" values={tii} at={crossIndex} highColor={colors.bull} lowColor={colors.bear} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <PaneGuideLines paneId="tii" innerH={paneH - 16} />
            <BoundedLineSeries values={tii} paneH={paneH} color={(v) => (v > 80 ? colors.bull : v < 20 ? colors.bear : accent)} />
          </View>
        </View>
      ) : null}

      {demarker ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneHead paneId="demarker" name="DeMarker" values={demarker} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <PaneGuideLines paneId="demarker" innerH={paneH - 16} />
            <BoundedLineSeries values={demarker} paneH={paneH} color={(v) => (v > 70 ? colors.bear : v < 30 ? colors.bull : accent)} />
          </View>
        </View>
      ) : null}

      {rmi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneHead paneId="rmi" name="RMI" values={rmi} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <PaneGuideLines paneId="rmi" innerH={paneH - 16} />
            <BoundedLineSeries values={rmi} paneH={paneH} color={(v) => (v > 70 ? colors.bear : v < 30 ? colors.bull : accent)} />
          </View>
        </View>
      ) : null}

      {cutlerRsi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneHead paneId="cutlerRsi" name="Cutler's RSI" values={cutlerRsi} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <PaneGuideLines paneId="cutlerRsi" innerH={paneH - 16} />
            <BoundedLineSeries values={cutlerRsi} paneH={paneH} color={(v) => (v > 70 ? colors.bear : v < 30 ? colors.bull : accent)} />
          </View>
        </View>
      ) : null}

      {pgo ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="PGO" values={pgo} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneValueHead name="Rainbow Osc" values={rainbowOsc} at={crossIndex} tone="trend" />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneValueHead name="Efficiency Ratio" values={efficiencyRatio} at={crossIndex} tone="none" />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneValueHead name={volName('VPCI')} values={vpci} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneValueHead name="TDI" values={tdi.tdi} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            {(() => {
              const tdiVals = tdi.tdi.filter((x): x is number => x != null);
              const diVals = tdi.di.filter((x): x is number => x != null);
              const allVals = [...tdiVals, ...diVals, 0];
              const minV = Math.min(...allVals);
              const maxV = Math.max(...allVals);
              const span = maxV - minV || 1;
              const innerH = Math.max(0, paneH - 16);
              // خطّان متّصلان (`PaneLineLayer`) لا شرطة 3px لكل عمود: تقاطعهما — القراءة كلّها — يقع
              // غالباً بين شمعتين. المقياس نفسه (‎minV..maxV‎)، والقيمة بمركز الخطّ لا حافّته العليا.
              return (
                <PaneLineLayer
                  innerH={innerH}
                  y={boundedPaneY(innerH, maxV - span, maxV)}
                  lines={[
                    { values: tdi.tdi, color: (i) => ((tdi.tdi[i] ?? 0) >= 0 ? colors.bull : colors.bear), opacity: 0.85 },
                    { values: tdi.di, color: colors.accent, opacity: 0.55 },
                  ]}
                />
              );
            })()}
          </View>
        </View>
      ) : null}

      {vfi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name={volName('VFI')} values={vfi} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneHead paneId="laguerreRsi" name="Laguerre RSI" values={laguerreRsi} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <PaneGuideLines paneId="laguerreRsi" innerH={paneH - 16} />
            {/* خطّ متّصل بمداه الثابت 0..1 لا شرطة 3px حافّتها العليا عند القيمة (قيمة 0 كانت خارج المساحة). */}
            <BoundedLineSeries
              values={laguerreRsi}
              paneH={paneH}
              min={0}
              max={1}
              color={(v) => (v > 0.85 ? colors.bear : v < 0.15 ? colors.bull : accent)}
            />
          </View>
        </View>
      ) : null}

      {twiggsMoneyFlow ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name={volName('Twiggs MF')} values={twiggsMoneyFlow} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneValueHead name={volName('VZO')} values={vzo} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneValueHead name="WaveTrend" values={waveTrend.wt1} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            {(() => {
              const wt1Vals = waveTrend.wt1.filter((x): x is number => x != null);
              const wt2Vals = waveTrend.wt2.filter((x): x is number => x != null);
              const allVals = [...wt1Vals, ...wt2Vals, 0];
              const minV = Math.min(...allVals);
              const maxV = Math.max(...allVals);
              const span = maxV - minV || 1;
              const innerH = Math.max(0, paneH - 16);
              // خطّان متّصلان (`PaneLineLayer`) لا شرطة 3px لكل عمود: تقاطعهما — القراءة كلّها — يقع
              // غالباً بين شمعتين. المقياس نفسه (‎minV..maxV‎)، والقيمة بمركز الخطّ لا حافّته العليا.
              return (
                <PaneLineLayer
                  innerH={innerH}
                  y={boundedPaneY(innerH, maxV - span, maxV)}
                  lines={[
                    { values: waveTrend.wt1, color: colors.accent, opacity: 0.85 },
                    { values: waveTrend.wt2, color: colors.infoAccent, opacity: 0.85 },
                  ]}
                />
              );
            })()}
          </View>
        </View>
      ) : null}

      {massIndex ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="Mass Index" values={massIndex} at={crossIndex} tone="trend" />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            {/* على مدى النافذة لا من الصفر: Mass Index يدور حول 25–27، فأرضية 0 كانت تحشر «الانتفاخ»
                (فوق 27 ثم تحت 26.5) — القراءة كلّها — بأعلى عُشر اللوحة. */}
            <TrendLineSeries values={massIndex} paneH={paneH} levels={MASS_INDEX_LEVELS} />
          </View>
        </View>
      ) : null}

      {rsi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneHead paneId="rsi" name="RSI" values={rsi} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <PaneGuideLines paneId="rsi" innerH={paneH - 16} />
            <BoundedLineSeries values={rsi} paneH={paneH} color={(v) => (v > 70 ? colors.bear : v < 30 ? colors.bull : accent)} />
          </View>
        </View>
      ) : null}

      {mfi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneHead paneId="mfi" name={volName('MFI')} values={mfi} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <PaneGuideLines paneId="mfi" innerH={paneH - 16} />
            <BoundedLineSeries values={mfi} paneH={paneH} color={(v) => (v > 80 ? colors.bear : v < 20 ? colors.bull : accent)} />
          </View>
        </View>
      ) : null}

      {adx ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneHead paneId="adx" name="ADX" values={adx} highColor={colors.warn} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <PaneGuideLines paneId="adx" innerH={paneH - 16} />
            <BoundedLineSeries values={adx} paneH={paneH} color={(v) => (v >= 25 ? colors.warn : colors.textDim)} />
          </View>
        </View>
      ) : null}

      {ultimateOsc ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneHead paneId="ultimateOsc" name="UO" values={ultimateOsc} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <PaneGuideLines paneId="ultimateOsc" innerH={paneH - 16} />
            <BoundedLineSeries values={ultimateOsc} paneH={paneH} color={(v) => (v > 70 ? colors.bear : v < 30 ? colors.bull : accent)} />
          </View>
        </View>
      ) : null}

      {cmo ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneHead paneId="cmo" name="CMO" values={cmo} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <PaneGuideLines paneId="cmo" innerH={paneH - 16} />
            <BoundedLineSeries values={cmo} paneH={paneH} min={-100} color={(v) => (v > 50 ? colors.bear : v < -50 ? colors.bull : accent)} />
          </View>
        </View>
      ) : null}

      {trix ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="TRIX" values={trix} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <ZeroLineSeries values={trix} paneH={paneH} />
          </View>
        </View>
      ) : null}

      {force ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name={volName('Force')} values={force} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <ZeroLineSeries values={force} paneH={paneH} />
          </View>
        </View>
      ) : null}

      {chaikinOsc ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name={volName('Chaikin')} values={chaikinOsc} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <ZeroLineSeries values={chaikinOsc} paneH={paneH} />
          </View>
        </View>
      ) : null}

      {dpo ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="DPO" values={dpo} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <ZeroLineSeries values={dpo} paneH={paneH} />
          </View>
        </View>
      ) : null}

      {ao ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="AO" values={ao.v} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = ao.v.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxA = Math.max(...vals, 1e-9);
              return ao.v.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxA, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
                      // لون بارتفاع العمود عن سابقه لا بإشارته، كـTradingView (`risingBars`).
                      backgroundColor: ao.up[i] ? colors.bull : colors.bear,
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
          <PaneValueHead name="AC" values={ac.v} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            {/* خطّ الصفر: مرجع الجانبين. كان يُرسم بـMACD وVW-MACD وحدهما، فبقية
                اللوحات ثنائية الجانب تُظهر اللون وحده دون الخطّ الذي يُقاس عليه. */}
            <View
              pointerEvents="none"
              style={[styles.paneZeroLine, { top: centeredPaneZeroY(paneH) }]}
            />
            {(() => {
              const vals = ac.v.filter((x): x is number => x != null).map((v) => Math.abs(v));
              const maxAc = Math.max(...vals, 1e-9);
              return ac.v.map((v, i) => {
                if (v == null) return <View key={i} style={{ flex: 1 }} />;
                const h = centeredBarH(v, maxAc, paneH);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, h),
                      marginTop: centeredBarTop(v, h, paneH),
                      // لون بارتفاع العمود عن سابقه لا بإشارته، كـTradingView (`risingBars`).
                      backgroundColor: ac.up[i] ? colors.bull : colors.bear,
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
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <ZeroLineSeries values={bop} paneH={paneH} />
          </View>
        </View>
      ) : null}

      {bullPower ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="Bull Power" values={bullPower} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneValueHead
            name="TSI"
            values={tsi.tsi}
            at={crossIndex}
            signal={{ values: tsi.signal, color: colors.warn }}
            compact={!paneSignalFits}
          />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            {(() => {
              // خطّان كـTradingView — TSI وإشارته `ema(13)` — بهندسة MACD كلوحة KST. كانت أعمدة TSI
              // وحدها، فتقاطع الخطّين (إشارة الدخول المعتادة) لا يُرى إلا بعبور الصفر المتأخّر.
              const g = macdPaneGeom(tsi.tsi, tsi.tsi, tsi.signal, paneH);
              return (
                <>
                  <View
                    pointerEvents="none"
                    style={[styles.paneZeroLine, { top: g.zeroY }]}
                  />
                  <PaneLineLayer
                    innerH={g.innerH}
                    y={g.y}
                    lines={[
                      { values: tsi.signal, color: colors.warn, opacity: 0.9 },
                      {
                        values: tsi.tsi,
                        // لون القطعة بجانبها من الإشارة عند طرفها الثاني — دلالة الشرطات السابقة.
                        color: (i) => ((tsi.tsi[i] ?? 0) >= (tsi.signal[i] ?? tsi.tsi[i] ?? 0) ? colors.bull : colors.bear),
                      },
                    ]}
                  />
                </>
              );
            })()}
          </View>
        </View>
      ) : null}

      {coppock ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="Coppock" values={coppock} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <ZeroLineSeries values={coppock} paneH={paneH} />
          </View>
        </View>
      ) : null}

      {eom ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name={volName('EOM')} values={eom} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <ZeroLineSeries values={eom} paneH={paneH} />
          </View>
        </View>
      ) : null}

      {ppo ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="PPO" values={ppo} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneHead paneId="chop" name="Choppiness" values={chop} at={crossIndex} highColor={colors.textDim} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <PaneGuideLines paneId="chop" innerH={paneH - 16} />
            <BoundedLineSeries values={chop} paneH={paneH} color={(v) => (v > 61.8 ? colors.textDim : v < 38.2 ? colors.bull : accent)} />
          </View>
        </View>
      ) : null}

      {bwmfi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name={volName('BW MFI')} values={bwmfi} at={crossIndex} tone="trend" />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneValueHead name={volName('PVO')} values={pvo} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneValueHead name={volName('Volume Osc')} values={vo} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneValueHead name={volName('VPT')} values={vpt} at={crossIndex} tone="trend" />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <TrendLineSeries values={vpt} paneH={paneH} />
          </View>
        </View>
      ) : null}

      {hv ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="HV" values={hv} at={crossIndex} tone="trend" />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneValueHead name="Parkinson Vol" values={parkinsonVol} at={crossIndex} tone="trend" />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneValueHead name="G-K Vol" values={garmanKlassVol} at={crossIndex} tone="trend" />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneValueHead name="R-S Vol" values={rogersSatchellVol} at={crossIndex} tone="trend" />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneValueHead name="Y-Z Vol" values={yangZhangVol} at={crossIndex} tone="trend" />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneHead
            paneId="stochRsi"
            name="StochRSI"
            values={stochRsi.k}
            at={crossIndex}
            signal={{ values: stochRsi.d, color: colors.warn }}
            compact={!paneSignalFits}
          />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneValueHead
            name="RVI"
            values={rvi.rvi}
            at={crossIndex}
            signal={{ values: rvi.signal, color: colors.warn }}
            compact={!paneSignalFits}
          />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            {(() => {
              // خطّان كـTradingView — RVI وإشارته `swma` — بهندسة MACD كلوحة KST. كانت أعمدة RVI وحدها
              // بلا إشارة، فتقاطعهما (إشارة الدخول التي يُستعمل لها Relative Vigor) لا يُرى.
              const g = macdPaneGeom(rvi.rvi, rvi.rvi, rvi.signal, paneH);
              return (
                <>
                  <View
                    pointerEvents="none"
                    style={[styles.paneZeroLine, { top: g.zeroY }]}
                  />
                  <PaneLineLayer
                    innerH={g.innerH}
                    y={g.y}
                    lines={[
                      { values: rvi.signal, color: colors.warn, opacity: 0.9 },
                      {
                        values: rvi.rvi,
                        color: (i) => ((rvi.rvi[i] ?? 0) >= (rvi.signal[i] ?? rvi.rvi[i] ?? 0) ? colors.bull : colors.bear),
                      },
                    ]}
                  />
                </>
              );
            })()}
          </View>
        </View>
      ) : null}

      {linRegSlope ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="LR Slope" values={linRegSlope} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneValueHead name="LR R²" values={linRegR2} at={crossIndex} tone="none" />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <PaneGuideLines paneId="percentB" innerH={paneH - 16} />
            {/* ‎%B‎ خارج 0..1 (السعر خارج البولنجر) يُقصّ على حافّة اللوحة بلون التحذير كما كان. */}
            <BoundedLineSeries
              values={percentB}
              paneH={paneH}
              max={1}
              color={(v) => (v > 1 || v < 0 ? colors.warn : v > 0.8 ? colors.bear : v < 0.2 ? colors.bull : accent)}
            />
          </View>
        </View>
      ) : null}

      {bbw ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="BBW" values={bbw} at={crossIndex} tone="trend" />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <ZeroLineSeries values={momentum} paneH={paneH} />
          </View>
        </View>
      ) : null}

      {vhf ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="VHF" values={vhf} at={crossIndex} tone="none" />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <BoundedLineSeries
              values={vhf}
              paneH={paneH}
              min={0}
              max={1}
              color={(v) => (v > 0.618 ? colors.bull : v < 0.382 ? colors.textDim : accent)}
            />
          </View>
        </View>
      ) : null}

      {pvi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name={volName('PVI')} values={pvi} at={crossIndex} tone="trend" />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <TrendLineSeries values={pvi} paneH={paneH} />
          </View>
        </View>
      ) : null}

      {gapo ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="GAPO" values={gapo} at={crossIndex} tone="trend" />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            {/* على مدى النافذة لا من الصفر: مدى زوج فوركس أقلّ من 1 فلوغاريتم GAPO سالب غالباً، وأرضية
                0 كانت تحشر الخطّ كلّه بأسفل اللوحة (‎−3.3..−2.8‎ على مقياس ‎−3.3..0‎ ⇒ سُدسها). */}
            <TrendLineSeries values={gapo} paneH={paneH} />
          </View>
        </View>
      ) : null}

      {ravi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="RAVI" values={ravi} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneValueHead name="Ulcer Index" values={ulcer} at={crossIndex} tone="trend" />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneValueHead
            name="Fisher Transform"
            values={fisher.fisher}
            at={crossIndex}
            signal={{ values: fisher.trigger, color: colors.warn }}
            compact={!paneSignalFits}
          />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            {(() => {
              // خطّان كـTradingView — Fisher وزناده — بهندسة KST/MACD (مقياس واحد متمركز على الصفر).
              // كانت أعمدة Fisher وحدها، فالتقاطع الذي يُقرأ منه الانعكاس لا يُرى.
              // مستويات TradingView ‎±1.5 / ±0.75‎ تدخل المقياس (كـCCI ‎±100‎) فلا تقصّها نافذة
              // هادئة؛ رقم 0.75 يُسقَط متى لاصق 1.5 بلوحة قصيرة (`placeScaledGuides`) والخطّ يبقى.
              const g = macdPaneGeom(fisherFloor, fisher.fisher, fisher.trigger, paneH);
              const guides = placeScaledGuides(FISHER_LEVELS, -g.maxAbs, g.maxAbs, g.innerH);
              return (
                <>
                  <View
                    pointerEvents="none"
                    style={[styles.paneZeroLine, { top: g.zeroY }]}
                  />
                  {guides.map((gd) => (
                    <React.Fragment key={gd.v}>
                      <View pointerEvents="none" style={[styles.paneGuideLine, { top: gd.top }]} />
                      {gd.label ? (
                        <View
                          pointerEvents="none"
                          style={[styles.paneGuideLabelBox, { top: Math.max(0, gd.top - 5) }]}
                        >
                          <Text style={styles.paneGuideLabel}>{gd.label}</Text>
                        </View>
                      ) : null}
                    </React.Fragment>
                  ))}
                  <PaneLineLayer
                    innerH={g.innerH}
                    y={g.y}
                    lines={[
                      { values: fisher.trigger, color: colors.warn, opacity: 0.9 },
                      {
                        values: fisher.fisher,
                        color: (i) =>
                          (fisher.fisher[i] ?? 0) >= (fisher.trigger[i] ?? fisher.fisher[i] ?? 0)
                            ? colors.bull
                            : colors.bear,
                      },
                    ]}
                  />
                </>
              );
            })()}
          </View>
        </View>
      ) : null}

      {kst ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead
            name="KST"
            values={kst.kst}
            at={crossIndex}
            signal={{ values: kst.signal, color: colors.warn }}
            compact={!paneSignalFits}
          />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            {(() => {
              // خطّان كـTradingView — KST وإشارته `sma(9)` — بهندسة MACD (مقياس واحد متمركز على الصفر
              // للخطّين). كانت أعمدة KST وحدها بلا إشارة، فتقاطعهما — ما يُقرأ من المؤشّر — لا يُرى.
              const g = macdPaneGeom(kst.kst, kst.kst, kst.signal, paneH);
              return (
                <>
                  <View
                    pointerEvents="none"
                    style={[styles.paneZeroLine, { top: g.zeroY }]}
                  />
                  <PaneLineLayer
                    innerH={g.innerH}
                    y={g.y}
                    lines={[
                      { values: kst.signal, color: colors.warn, opacity: 0.9 },
                      {
                        values: kst.kst,
                        // لون القطعة بجانبها من الإشارة عند طرفها الثاني — دلالة الشرطات السابقة.
                        color: (i) => ((kst.kst[i] ?? 0) >= (kst.signal[i] ?? kst.kst[i] ?? 0) ? colors.bull : colors.bear),
                      },
                    ]}
                  />
                </>
              );
            })()}
          </View>
        </View>
      ) : null}

      {vortex ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneSpreadHead
            name="Vortex"
            upper={vortex.plus}
            lower={vortex.minus}
            at={crossIndex}
            tone="sign"
            lineColors={[colors.bull, colors.bear]}
            compact={!paneSignalFits}
          />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            {(() => {
              const plusVals = vortex.plus.filter((x): x is number => x != null);
              const minusVals = vortex.minus.filter((x): x is number => x != null);
              const allVals = [...plusVals, ...minusVals, 0.5, 1.5];
              const minV = Math.min(...allVals);
              const maxV = Math.max(...allVals);
              const span = maxV - minV || 1;
              const innerH = Math.max(0, paneH - 16);
              // خطّان متّصلان (`PaneLineLayer`) لا شرطة 3px لكل عمود: تقاطعهما — القراءة كلّها — يقع
              // غالباً بين شمعتين. المقياس نفسه (‎minV..maxV‎)، والقيمة بمركز الخطّ لا حافّته العليا.
              return (
                <PaneLineLayer
                  innerH={innerH}
                  y={boundedPaneY(innerH, maxV - span, maxV)}
                  lines={[
                    { values: vortex.plus, color: colors.bull, opacity: 0.85 },
                    { values: vortex.minus, color: colors.bear, opacity: 0.85 },
                  ]}
                />
              );
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
            lineColors={[colors.bull, colors.bear]}
            compact={!paneSignalFits}
          />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            {(() => {
              const plusVals = dmi.plusDI.filter((x): x is number => x != null);
              const minusVals = dmi.minusDI.filter((x): x is number => x != null);
              const allVals = [...plusVals, ...minusVals, 0];
              const minV = Math.min(...allVals);
              const maxV = Math.max(...allVals);
              const span = maxV - minV || 1;
              const innerH = Math.max(0, paneH - 16);
              // خطّان متّصلان (`PaneLineLayer`) لا شرطة 3px لكل عمود: تقاطعهما — القراءة كلّها — يقع
              // غالباً بين شمعتين. المقياس نفسه (‎minV..maxV‎)، والقيمة بمركز الخطّ لا حافّته العليا.
              return (
                <PaneLineLayer
                  innerH={innerH}
                  y={boundedPaneY(innerH, maxV - span, maxV)}
                  lines={[
                    { values: dmi.plusDI, color: colors.bull, opacity: 0.85 },
                    { values: dmi.minusDI, color: colors.bear, opacity: 0.85 },
                  ]}
                />
              );
            })()}
          </View>
        </View>
      ) : null}

      {rwi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneSpreadHead
            name="RWI"
            upper={rwi.rwiHigh}
            lower={rwi.rwiLow}
            at={crossIndex}
            tone="sign"
            lineColors={[colors.bull, colors.bear]}
            compact={!paneSignalFits}
          />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            {(() => {
              const highVals = rwi.rwiHigh.filter((x): x is number => x != null);
              const lowVals = rwi.rwiLow.filter((x): x is number => x != null);
              const allVals = [...highVals, ...lowVals, 0];
              const minV = Math.min(...allVals);
              const maxV = Math.max(...allVals);
              const span = maxV - minV || 1;
              const innerH = Math.max(0, paneH - 16);
              // خطّان متّصلان (`PaneLineLayer`) لا شرطة 3px لكل عمود: تقاطعهما — القراءة كلّها — يقع
              // غالباً بين شمعتين. المقياس نفسه (‎minV..maxV‎)، والقيمة بمركز الخطّ لا حافّته العليا.
              return (
                <PaneLineLayer
                  innerH={innerH}
                  y={boundedPaneY(innerH, maxV - span, maxV)}
                  lines={[
                    { values: rwi.rwiHigh, color: colors.bull, opacity: 0.85 },
                    { values: rwi.rwiLow, color: colors.bear, opacity: 0.85 },
                  ]}
                />
              );
            })()}
          </View>
        </View>
      ) : null}

      {aroonUpDown ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneSpreadHead
            name="Aroon Up/Down"
            upper={aroonUpDown.up}
            lower={aroonUpDown.down}
            at={crossIndex}
            tone="sign"
            lineColors={[colors.bull, colors.bear]}
            compact={!paneSignalFits}
          />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            {(() => {
              // Aroon بين 0 و100 دائماً: خطّان متّصلان (تقاطع Up/Down هو القراءة) لا شرطة لكل عمود.
              const innerH = Math.max(0, paneH - 16);
              return (
                <PaneLineLayer
                  innerH={innerH}
                  y={boundedPaneY(innerH, 0, 100)}
                  lines={[
                    { values: aroonUpDown.up, color: colors.bull, opacity: 0.85 },
                    { values: aroonUpDown.down, color: colors.bear, opacity: 0.85 },
                  ]}
                />
              );
            })()}
          </View>
        </View>
      ) : null}

      {klinger ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneSpreadHead
            name={volName('Klinger')}
            upper={klinger.kvo}
            lower={klinger.signal}
            at={crossIndex}
            tone="sign"
            lineColors={[colors.accent, colors.infoAccent]}
            compact={!paneSignalFits}
          />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            {(() => {
              const kvoVals = klinger.kvo.filter((x): x is number => x != null);
              const sigVals = klinger.signal.filter((x): x is number => x != null);
              const allVals = [...kvoVals, ...sigVals, 0];
              const minV = Math.min(...allVals);
              const maxV = Math.max(...allVals);
              const span = maxV - minV || 1;
              const innerH = Math.max(0, paneH - 16);
              // خطّان متّصلان (`PaneLineLayer`) لا شرطة 3px لكل عمود: تقاطعهما — القراءة كلّها — يقع
              // غالباً بين شمعتين. المقياس نفسه (‎minV..maxV‎)، والقيمة بمركز الخطّ لا حافّته العليا.
              return (
                <PaneLineLayer
                  innerH={innerH}
                  y={boundedPaneY(innerH, maxV - span, maxV)}
                  lines={[
                    { values: klinger.kvo, color: colors.accent, opacity: 0.85 },
                    { values: klinger.signal, color: colors.infoAccent, opacity: 0.85 },
                  ]}
                />
              );
            })()}
          </View>
        </View>
      ) : null}

      {smi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="SMI" values={smi.smi} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            {(() => {
              const smiVals = smi.smi.filter((x): x is number => x != null);
              const sigVals = smi.signal.filter((x): x is number => x != null);
              const allVals = [...smiVals, ...sigVals, 0];
              const minV = Math.min(...allVals);
              const maxV = Math.max(...allVals);
              const span = maxV - minV || 1;
              const innerH = Math.max(0, paneH - 16);
              // خطّان متّصلان (`PaneLineLayer`) لا شرطة 3px لكل عمود: تقاطعهما — القراءة كلّها — يقع
              // غالباً بين شمعتين. المقياس نفسه (‎minV..maxV‎)، والقيمة بمركز الخطّ لا حافّته العليا.
              return (
                <PaneLineLayer
                  innerH={innerH}
                  y={boundedPaneY(innerH, maxV - span, maxV)}
                  lines={[
                    { values: smi.smi, color: colors.accent, opacity: 0.85 },
                    { values: smi.signal, color: colors.infoAccent, opacity: 0.85 },
                  ]}
                />
              );
            })()}
          </View>
        </View>
      ) : null}

      {smiErgodic ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="SMI Ergodic Osc" values={smiErgodic} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneValueHead
            name="PMO"
            values={pmo.pmo}
            at={crossIndex}
            signal={{ values: pmo.signal, color: colors.warn }}
            compact={!paneSignalFits}
          />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            {(() => {
              // خطّان كـTradingView — PMO وإشارته `ema(10)` — كلوحة TSI/KST. كانت أعمدة PMO وحدها، وتقاطع
              // الخطّين هو قراءة DecisionPoint الأساسية.
              const g = macdPaneGeom(pmo.pmo, pmo.pmo, pmo.signal, paneH);
              return (
                <>
                  <View
                    pointerEvents="none"
                    style={[styles.paneZeroLine, { top: g.zeroY }]}
                  />
                  <PaneLineLayer
                    innerH={g.innerH}
                    y={g.y}
                    lines={[
                      { values: pmo.signal, color: colors.warn, opacity: 0.9 },
                      {
                        values: pmo.pmo,
                        // لون القطعة بجانبها من الإشارة عند طرفها الثاني — دلالة الشرطات السابقة.
                        color: (i) => ((pmo.pmo[i] ?? 0) >= (pmo.signal[i] ?? pmo.pmo[i] ?? 0) ? colors.bull : colors.bear),
                      },
                    ]}
                  />
                </>
              );
            })()}
          </View>
        </View>
      ) : null}

      {trueRange ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="True Range" values={trueRange} at={crossIndex} tone="trend" />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneValueHead name="Std Error" values={stdError} at={crossIndex} tone="trend" />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneValueHead name="EWMA Vol" values={ewmaVol} at={crossIndex} tone="trend" />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneValueHead name={volName('Volume ROC')} values={volRoc} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneHead paneId="adxr" name="ADXR" values={adxr} at={crossIndex} highColor={colors.warn} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <PaneGuideLines paneId="adxr" innerH={paneH - 16} />
            <BoundedLineSeries values={adxr} paneH={paneH} color={(v) => (v >= 25 ? colors.warn : colors.textDim)} />
          </View>
        </View>
      ) : null}

      {volatilityRatio ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="Volatility Ratio" values={volatilityRatio} at={crossIndex} tone="trend" />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneValueHead name="Williams A/D" values={williamsAd} at={crossIndex} tone="trend" />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <TrendLineSeries values={williamsAd} paneH={paneH} />
          </View>
        </View>
      ) : null}

      {gator ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneSpreadHead name="Gator" upper={gator.upper} lower={gator.lower} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneValueHead
            name="MACD"
            values={macd.macdLine}
            at={crossIndex}
            signal={{ values: macd.signal, color: colors.warn }}
            compact={!paneSignalFits}
          />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
                              // أربع درجات كـTradingView: عمود يبتعد عن الصفر (زخم يقوى) مُشبَع، وعمود
                              // يعود نحوه (زخم يخبو) باهت — كان لوناً واحداً لكل جانب فلا يُرى الخفوت
                              // الذي يسبق تقاطع الخطّين.
                              opacity: (v >= 0) === macd.histUp[i] ? 0.85 : 0.3,
                            }}
                          />
                        ) : null}
                      </View>
                    );
                  })}
                  <PaneLineLayer
                    innerH={g.innerH}
                    y={g.y}
                    lines={[
                      { values: macd.signal, color: colors.warn, opacity: 0.9 },
                      { values: macd.macdLine, color: accent },
                    ]}
                  />
                </>
              );
            })()}
          </View>
        </View>
      ) : null}

      {stoch ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneHead
            paneId="stoch"
            name="STO"
            values={stoch.k}
            at={crossIndex}
            signal={{ values: stoch.d, color: colors.warn }}
            compact={!paneSignalFits}
          />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <PaneGuideLines paneId="stoch" innerH={paneH - 16} />
            {(() => {
              // %D كان محسوباً ولا يُرسم — والتقاطع بينه وبين %K هو غرض المؤشّر كلّه.
              const g = stochPaneGeom(paneH);
              // %K و%D قطعاً متّصلة (`PaneLineLayer`) لا شرطة لكل عمود: تقاطعهما يقع غالباً **بين**
              // شمعتين، والشرطتان المنفصلتان عند 80/20 تُظهران درجتين لا عبوراً. `g.y` حافّة خطّ
              // بسُمك STOCH_LINE_H مقصوصة داخل المساحة، فمركزه نصف السُّمك تحتها.
              const y = (v: number) => (g.y(v) ?? NaN) + STOCH_LINE_H / 2;
              return (
                <PaneLineLayer
                  innerH={g.innerH}
                  y={y}
                  lines={[
                    { values: stoch.d, color: colors.warn, opacity: 0.9 },
                    { values: stoch.k, color: accent },
                  ]}
                />
              );
            })()}
          </View>
        </View>
      ) : null}

      {atr ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="ATR" values={atr} at={crossIndex} tone="trend" />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <PaneGuideLines paneId="willr" innerH={paneH - 16} />
            <BoundedLineSeries values={willr} paneH={paneH} min={-100} max={0} color={() => '#60A5FA'} />
          </View>
        </View>
      ) : null}

      {cci ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="CCI" values={cci} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <ZeroLineSeries values={cci} paneH={paneH} levels={CCI_LEVELS} />
          </View>
        </View>
      ) : null}

      {roc ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="ROC" values={roc} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <ZeroLineSeries values={roc} paneH={paneH} />
          </View>
        </View>
      ) : null}

      {stddev ? (
        <View style={[styles.pane, { height: paneH }]}>
          <PaneValueHead name="STDEV" values={stddev} at={crossIndex} tone="trend" />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
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
          <PaneValueHead name={volName('CMF')} values={cmf} at={crossIndex} />
          <View style={[styles.paneInner, paneShift]}>
            {paneCrossLine}
            <ZeroLineSeries values={cmf} paneH={paneH} />
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
                accessibilityLabel={t.label}
                accessibilityState={{ selected: tool === t.id }}
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
            {drawings.length ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={drawingsHidden ? tr.mcShowDrawings : tr.mcHideDrawings}
                accessibilityState={{ selected: drawingsHidden }}
                style={({ pressed }) => [
                  styles.tool,
                  drawingsHidden && styles.toolOn,
                  pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                ]}
                onPress={toggleDrawingsHidden}
              >
                <Text style={[styles.toolText, drawingsHidden && styles.toolTextOn]}>
                  {drawingsHidden
                    ? `◎ ${tr.mcShowDrawings} (${drawings.length})`
                    : `◉ ${tr.mcHideDrawings}`}
                </Text>
              </Pressable>
            ) : null}
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
                confirmDestructive({
                  title: tr.mcClearAllTitle,
                  body: tr.mcClearAllBody,
                  cancelText: tr.cancel,
                  confirmText: tr.mcClearWord,
                  onConfirm: () => {
                    pushDrawHistory();
                    setDrawings([]);
                    setPending(null);
                    setSelectedId(null);
                    void clearDrawings(series.symbol, drawingsOwner);
                  },
                });
              }}
            >
              <Text style={styles.toolText}>{tr.mcClearWord}</Text>
            </Pressable>
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {localizedIndicators(tr).map((ind) => {
              const on = selectedInd.includes(ind.id);
              return [
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  key={ind.id}
                  style={({ pressed }) => [
                    styles.ind,
                    on && styles.indOn,
                    pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                  ]}
                  onPress={() => toggleInd(ind.id)}
                >
                  <Text style={[styles.indText, on && styles.indTextOn]}>{ind.label}</Text>
                </Pressable>,
                // ZigZag مفعَّل ⇒ شريحة انحرافه بجانبه تدور 1→2→3→5→10%: 5% على شارت 15د للفوركس لا تنعطف أبداً.
                ...(ind.id === 'zigzag' && on
                  ? [
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={tr.mcZigzagDevA11y
                          .replace('{pct}', String(zigzagDev))
                          .replace('{next}', String(nextZigzagDeviation(zigzagDev)))}
                        key="zigzagDev"
                        style={({ pressed }) => [
                          styles.ind,
                          pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                        ]}
                        onPress={() => {
                          void saveZigzagDeviation(nextZigzagDeviation(zigzagDev));
                        }}
                      >
                        <Text style={styles.indText}>{`${zigzagDev}% ↻`}</Text>
                      </Pressable>,
                    ]
                  : []),
              ];
            })}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: !pineOn }}
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
                  accessibilityState={{ selected: on }}
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
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={tr.mcCloneDrawingA11y}
                  style={({ pressed }) => [
                    styles.tool,
                    pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                  ]}
                  onPress={cloneSelectedDrawing}
                >
                  <Text style={styles.toolText}>❐ {tr.mcCloneDrawing}</Text>
                </Pressable>
                {selectedTrend ? (
                  <Pressable
                    accessibilityRole="switch"
                    accessibilityLabel={arrowA11y}
                    accessibilityState={{ checked: selectedArrow }}
                    style={({ pressed }) => [
                      styles.tool,
                      selectedArrow && styles.toolOn,
                      pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                    ]}
                    onPress={toggleSelectedArrow}
                  >
                    <Text style={selectedArrow ? styles.toolTextOn : styles.toolText}>➚</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={selectedLocked ? tr.mcUnlockDrawing : tr.mcLockDrawingA11y}
                  accessibilityState={{ checked: selectedLocked }}
                  style={({ pressed }) => [
                    styles.tool,
                    selectedLocked && styles.toolOn,
                    pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                  ]}
                  onPress={toggleSelectedLock}
                >
                  <Text style={selectedLocked ? styles.toolTextOn : styles.toolText}>
                    {selectedLocked ? `🔒 ${tr.mcUnlockDrawing}` : `🔓 ${tr.mcLockDrawing}`}
                  </Text>
                </Pressable>
                {(selectedLocked ? [] : nudgeButtons).map((b) => (
                  <Pressable
                    key={b.key}
                    accessibilityRole="button"
                    accessibilityLabel={b.a11y}
                    style={({ pressed }) => [
                      styles.tool,
                      pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                    ]}
                    onPress={() => nudgeSelectedDrawing(b.bars, b.steps)}
                    delayLongPress={NUDGE_HOLD_DELAY_MS}
                    onLongPress={() => startNudgeHold(b.bars, b.steps)}
                    onPressOut={stopNudgeHold}
                  >
                    <Text style={styles.toolText}>{b.icon}</Text>
                  </Pressable>
                ))}
                {canRecolor ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={colorLabels.a11y}
                    style={({ pressed }) => [
                      styles.tool,
                      pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                    ]}
                    onPress={cycleSelectedColor}
                  >
                    <Text style={styles.toolText}>
                      <Text style={{ color: recolorTarget!.color }}>● </Text>
                      {colorLabels.word}
                    </Text>
                  </Pressable>
                ) : null}
                {(() => {
                  const d = drawings.find((x) => x.id === selectedId);
                  if ((d?.tool === 'hline' || d?.tool === 'hray') && onCreateAlert) {
                    return (
                      <Pressable
                        accessibilityRole="button"
                        style={({ pressed }) => [
                          styles.tool,
                          styles.toolOn,
                          pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                        ]}
                        onPress={() => createAlert(d.a.price)}
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
                          createAlert(Math.max(aPrice, bPrice));
                          createAlert(Math.min(aPrice, bPrice));
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
                    // «الشمعة الحالية» = آخر شمعة بالسلسلة، لا آخر شمعة ظاهرة: بعد الرجوع
                    // بالشارت كان التنبيه يُضبط على قيمة الخطّ عند حافّة الشاشة (بعيداً بنقاط
                    // عن مستواه الآن). بالإعادة الحالية هي شمعة الإعادة. ويُقرَّب لمنازل الزوج
                    // كسعر التقاطع، لا 1.0852347 بنموذج التنبيه.
                    const lastGlobalIndex = replayOn
                      ? source.start + source.plot.length - 1
                      : source.all.length - 1;
                    // باللوغاريتمي استيفاء باللوغاريتم كالخطّ المرسوم (`lineValueAt`). خطّ هابط بلغ ≤ 0 ⇒ لا زرّ
                    // (كان يُنشئ تنبيهاً بسعر سالب لا يُبلغ أبداً).
                    const rawLinePrice = lineValueAt(d.a, d.b, lastGlobalIndex, true, logScale, true);
                    if (rawLinePrice == null) return null;
                    // بمنازل الشارت نفسها (`fmtPrice`): لأداة بلا منازل معروفة (US30، BTCUSD، النفط) كان
                    // المستوى المحفوظ 39123.4567891234 والمعروض 39123.46.
                    const currentPrice = Number(fmtPrice(rawLinePrice));
                    return (
                      <Pressable
                        accessibilityRole="button"
                        style={({ pressed }) => [
                          styles.tool,
                          styles.toolOn,
                          pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
                        ]}
                        onPress={() => createAlert(currentPrice)}
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
  lockedHint: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.warn,
  },
  lockedHintText: { color: colors.warn, fontSize: 12, fontWeight: '700' },
  lockBadge: {
    position: 'absolute',
    width: LOCK_BADGE_W,
    height: LOCK_BADGE_H,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: colors.bgPanel,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },
  lockBadgeText: { fontSize: 8, lineHeight: 10 },
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
  watermark: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // تيل MATRIX (`colors.accent`) شبه شفّاف: يُقرأ بلقطة الشاشة ولا يُخلط بسعر أو شمعة.
  watermarkSymbol: { color: 'rgba(45, 212, 191, 0.07)', fontWeight: '900', letterSpacing: 1 },
  watermarkTf: { color: 'rgba(45, 212, 191, 0.08)', fontWeight: '800', marginTop: 2 },
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
  hRay: { right: undefined, borderStyle: 'solid' },
  channelMid: { height: 0, borderTopWidth: 1, borderStyle: 'dashed', opacity: 0.55 },
  /** مقبض العرض مربّع لا دائرة: يحرّك الموازي وحده، لا طرفاً. */
  channelWidthHandle: { borderRadius: 3 },
  /** بعد مقبض البداية (نصف قطره 6) لا فوقه. */
  hRayLabel: { left: 10 },
  /** وسم الشعاع المقلوب: صندوق بعرض ثابت ينتهي قبيل بداية الشعاع (بعد مقبضها) والنصّ محاذى يميناً داخله. */
  hRayLabelBox: { position: 'absolute', top: -11, width: HRAY_LABEL_ROOM, alignItems: 'flex-end' },
  hRayLabelFlipped: { position: 'relative', left: 0, top: 0 },
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
  // خطّ على بُعد أقلّ من ارتفاع الوسم من حافّة اللوح العليا: الوسم تحته لا فوقه — فوقه يُقصّ
  // (`overflow: hidden`) فيضيع سعر المقاومة المرسومة عند قمّة الشاشة (كـTradingView).
  levelLabelBelow: { top: 3 },
  fibSwingLine: {
    position: 'absolute',
    height: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    opacity: 0.6,
    transformOrigin: 'left center',
  },
  // ارتفاع المستطيل/المنطقة بالـpip: أخفّ من وسم الخطّ (ليس مستوى سعر بل مقاس).
  zoneRangeLabel: {
    position: 'absolute',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    opacity: 0.9,
  },
  levelPipText: { fontWeight: '600', opacity: 0.8 },
  alertLine: { borderColor: colors.warn, opacity: 0.85 },
  alertLabel: { left: undefined, color: colors.warn },
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
  noteEdit: {
    position: 'absolute',
    height: 28,
    paddingHorizontal: 6,
    paddingVertical: 0,
    borderWidth: 1,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(6,10,14,0.92)',
    fontSize: 12,
    fontWeight: '700',
  },
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
  paneCrossV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    zIndex: 2,
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
  // تحت وسوم السعر الحيّ/التقاطع/الرسم المحدَّد (`zIndex` 1–2) إن تلامست يوماً رغم الحجز.
  overlayPriceTag: { zIndex: 0, opacity: 0.92 },
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
  paneInner: { flex: 1, flexDirection: 'row', alignItems: 'flex-start' },
  // خطّ الصفر داخل لوحة ذات قيم موجبة/سالبة (MACD وأمثاله): مرجع التقاطع.
  // رأس اللوحة: الاسم فوق قيمة الشمعة الأخيرة، بنفس عرض paneLabel (36px) فلا يتغيّر
  // تخطيط أي لوحة أخرى ما زالت تستعمل paneLabel وحده.
  // عرض الرأس = عمود محور السعر (68 − حدّا اللوحة 2px): فصفّ الأعمدة بعرض لوح الشموع تماماً ويبدأ من
  // حافّته، فعمود اللوحة `i` تحت الشمعة `i`. كان 36px وحشوة 2px ⇒ الأعمدة أعرض بـ26px فانزاحت الأخيرة ~29px
  // يميناً (تحت المحور) على هاتف 360px: شمعة التقاطع وعمود RSI/MACD تحتها شمعتان مختلفتان. معتم وفوق
  // الأعمدة (`zIndex`) لأن الأعمدة تُزاح مع السحب الأفقي كالشموع (`paneShift`) فلا تمرّ تحت الرقم.
  paneHead: {
    width: PRICE_AXIS_WIDTH - 2,
    paddingTop: 5,
    paddingHorizontal: 2,
    alignItems: 'center',
    zIndex: 1,
    backgroundColor: '#070F18',
  },
  // سطر واحد (يُصغَّر حتى 75% ثم «…»): «Fractal Chaos Osc» كان يلتفّ لثلاثة أسطر فيدفع الرقم تحت قاع
  // لوحة بـ34px (`overflow: hidden`) — الاسم يُقرأ والرقم يختفي.
  paneHeadName: { color: colors.textDim, fontSize: 9, fontWeight: '800', textAlign: 'center' },
  paneHeadValue: { color: colors.textMuted, fontSize: 9, fontWeight: '700', textAlign: 'center', marginTop: 1 },
  // رقم طويل (مقياس دقيق كـMACD على زوج عملات) — 8 محارف لا تتّسع بـ36px عند حجم 9.
  paneHeadValueLong: { fontSize: 8 },
  paneHeadRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 1 },
  paneHeadInline: { color: colors.textMuted, fontSize: 8, fontWeight: '700', marginHorizontal: 2.5 },
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
    // `legendChipWidth`)، وما زاد يُقصّ بدل أن يغطّي الأسعار على اليمين.
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
  denseOhlc: {
    position: 'absolute',
    left: 6,
    right: PRICE_AXIS_WIDTH + 6,
    zIndex: 8,
    alignItems: 'flex-start',
  },
  denseOhlcText: {
    color: colors.text,
    fontSize: 9,
    lineHeight: DENSE_OHLC_LINE_H,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    paddingHorizontal: 4,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: 'rgba(7,16,24,0.78)',
  },
  priceLegendSwatch: { width: 6, height: 6, borderRadius: 1, marginRight: 3 },
  priceLegendText: { color: colors.text, fontSize: 9, fontWeight: '700' },
  priceLegendValue: { color: colors.text, fontSize: 9, fontWeight: '700', marginLeft: 4, fontVariant: ['tabular-nums'] },
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
