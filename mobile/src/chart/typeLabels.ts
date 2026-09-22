import type { Dict } from '../i18n/locales';
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

const TOOL_KEYS: Record<DrawTool, LabelKey> = {
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
  return DRAW_TOOLS.map((tool) => ({ ...tool, label: t[TOOL_KEYS[tool.id]] }));
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

/**
 * نصوص خاصة بالشارت ليست بعدُ في `i18n/locales.ts`.
 *
 * `locales.ts` ملك وكيل آخر بهذا المستودع ولا يُعدَّل من هنا، فحتى تُنقَل هذه المفاتيح
 * إليه رسمياً تعيش هنا بثلاث لغات الواجهة نفسها (راجع «طلب تنسيق» بـdocs/LOG-CHART.md).
 * لا تُضَف هنا نصوص جديدة إلا لهذا السبب بالضبط.
 */
export type ChartExtraLabels = {
  undo: string;
  undoA11y: string;
  nothingToUndo: string;
  panesCollapsed: string;
  panesCollapsedA11y: string;
  switching: string;
  switchingA11y: string;
};

const CHART_EXTRA: Record<'ar' | 'en' | 'ku', ChartExtraLabels> = {
  ar: {
    undo: 'تراجع',
    undoA11y: 'تراجع عن آخر تغيير بالرسم',
    nothingToUndo: 'لا يوجد ما يُتراجَع عنه',
    panesCollapsed: 'لا تتّسع',
    panesCollapsedA11y: 'لوحات مؤشرات مطويّة: ارتفاع الشارت لا يتّسع لها',
    switching: 'جارٍ…',
    switchingA11y: 'جارٍ تحميل الفريم الجديد — المعروض بيانات سابقة',
  },
  en: {
    undo: 'Undo',
    undoA11y: 'Undo the last drawing change',
    nothingToUndo: 'Nothing to undo',
    panesCollapsed: 'No room',
    panesCollapsedA11y: 'Indicator panes collapsed: the chart is not tall enough',
    switching: 'Loading…',
    switchingA11y: 'Loading the new timeframe — what is shown is the previous data',
  },
  ku: {
    undo: 'گەڕاندنەوە',
    undoA11y: 'گەڕاندنەوەی دوایین گۆڕانکاری لە کێشان',
    nothingToUndo: 'هیچ شتێک نییە بگەڕێندرێتەوە',
    panesCollapsed: 'جێگا نییە',
    panesCollapsedA11y: 'پانێلی ئاماژەکان نوقاون: بەرزی چارتەکە بەشیان ناکات',
    switching: 'بارکردن…',
    switchingA11y: 'بارکردنی ماوەی نوێ — ئەوەی پیشان دەدرێت داتای پێشووە',
  },
};

export function chartExtraLabels(lang: string): ChartExtraLabels {
  if (lang === 'ar') return CHART_EXTRA.ar;
  if (lang === 'ku') return CHART_EXTRA.ku;
  return CHART_EXTRA.en;
}
