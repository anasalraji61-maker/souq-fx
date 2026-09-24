import type { Dict, LangId } from '../i18n/locales';
import type { SessionId } from './sessions';
import {
  CHART_KINDS,
  DRAW_TOOLS,
  INDICATORS,
  LENSES,
  type ChartKind,
  type DrawTool,
  type IndicatorId,
  type LensMode,
} from './types';

/**
 * تسميات أنواع الشارت/أدوات الرسم/العدسات/المؤشرات بلغة الواجهة.
 *
 * `chart/types.ts` يحتفظ بالتسميات العربية كقيم افتراضية (مصدر المعرّفات الوحيد، ولا يستورد i18n)؛
 * هنا تُستبدَل التسمية من القاموس حسب المعرّف فقط. المعرّف غير الموجود بالخرائط يبقى على تسميته
 * الأصلية — عمداً للمصطلحات الدولية (Renko/Kagi/P&F، SMA/EMA/RSI/MACD…) التي يستخدمها المتداول كما هي
 * بكل اللغات. الخرائط مقيَّدة بمفاتيح `Dict` فأي مفتاح ناقص/خاطئ يكسر فحص الأنواع.
 */
type LabelKey = { [K in keyof Dict]: Dict[K] extends string ? K : never }[keyof Dict];

const KIND_KEYS: Partial<Record<ChartKind, LabelKey>> = {
  candles: 'ctlKindCandles',
  hollow: 'ctlKindHollow',
  heikin: 'ctlKindHeikin',
  bars: 'ctlKindBars',
  line: 'ctlKindLine',
  area: 'ctlKindArea',
  baseline: 'ctlKindBaseline',
  range: 'ctlKindRange',
};

const TOOL_KEYS: Partial<Record<DrawTool, LabelKey>> = {
  none: 'ctlToolNone',
  select: 'ctlToolSelect',
  trend: 'ctlToolTrend',
  ray: 'ctlToolRay',
  hline: 'ctlToolHline',
  vline: 'ctlToolVline',
  rect: 'ctlToolRect',
  fib: 'ctlToolFib',
  zone: 'ctlToolZone',
  note: 'ctlToolNote',
  measure: 'ctlToolMeasure',
  // خطّة شراء/بيع (دخول، وقف، هدف) — «خطة» كي لا تُقرأ الأداة زرّ أمر.
  long: 'ctlToolLong',
  short: 'ctlToolShort',
  hray: 'ctlToolHray',
  channel: 'ctlToolChannel',
};

const LENS_KEYS: Record<LensMode, { label: LabelKey; hint: LabelKey }> = {
  clean: { label: 'ctlLensClean', hint: 'ctlLensCleanHint' },
  structure: { label: 'ctlLensStructure', hint: 'ctlLensStructureHint' },
  momentum: { label: 'ctlLensMomentum', hint: 'ctlLensMomentumHint' },
  liquidity: { label: 'ctlLensLiquidity', hint: 'ctlLensLiquidityHint' },
};

const INDICATOR_KEYS: Partial<Record<IndicatorId, LabelKey>> = {
  bb: 'ctlIndBollinger',
  volume: 'ctlIndVolume',
};

export function localizedChartKinds(t: Dict): typeof CHART_KINDS {
  return CHART_KINDS.map((k) => {
    const key = KIND_KEYS[k.id];
    return key ? { ...k, label: t[key] } : k;
  });
}

export function localizedDrawTools(t: Dict): typeof DRAW_TOOLS {
  return DRAW_TOOLS.map((tool) => {
    const key = TOOL_KEYS[tool.id];
    return { ...tool, label: key ? t[key] : tool.label };
  });
}

export function localizedLenses(t: Dict): typeof LENSES {
  return LENSES.map((l) => ({
    ...l,
    label: t[LENS_KEYS[l.id].label],
    hint: t[LENS_KEYS[l.id].hint],
  }));
}

export function localizedIndicators(t: Dict): typeof INDICATORS {
  return INDICATORS.map((ind) => {
    const key = INDICATOR_KEYS[ind.id];
    return key ? { ...ind, label: t[key] } : ind;
  });
}

const SESSION_KEYS: Record<SessionId, keyof Dict> = {
  tokyo: 'mcSessTokyo',
  london: 'mcSessLondon',
  ny: 'mcSessNewYork',
};

/** اسم الجلسة فوق تظليل مؤشّر «Sessions» بلغة الواجهة. */
export function sessionLabel(t: Dict, id: SessionId): string {
  return t[SESSION_KEYS[id]] as string;
}

/**
 * تسميات زرّ لون الرسم المحدَّد — مؤقّتة هنا حتى تُنقل إلى `locales.ts` (`mcDrawColor`/`mcDrawColorA11y`،
 * طلب تنسيق بسجلّ الشارت 2026-09-24) ثم تُحذف هذه الدالة.
 */
export function drawColorLabels(lang: LangId): { word: string; a11y: string } {
  if (lang === 'en-US') return { word: 'Color', a11y: 'Drawing color — tap for the next color' };
  if (lang === 'en-GB') return { word: 'Colour', a11y: 'Drawing colour — tap for the next colour' };
  if (lang === 'ku') return { word: 'ڕەنگ', a11y: 'ڕەنگی وێنەکە — بۆ ڕەنگی دواتر لێبدە' };
  return { word: 'لون', a11y: 'لون الرسم — انقر للّون التالي' };
}
