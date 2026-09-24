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

/**
 * نصوص بلا مفتاح بالقاموس بعد (`i18n/locales.ts` خارج نطاق وكيل الشارت — «طلب تنسيق» بـ`docs/LOG-CHART.md`،
 * المقترح: `mcLogScaleA11y` / `mcShareDialogTitle` / `mcSessTokyo|London|NewYork`). حين تُضاف تُستبدل هذه بـ`tr.*`.
 * زرّ «Log» يبقى نصّه اللاتيني القصير (مصطلح المقياس كما يعرفه المتداول) ويُوصف لقارئ الشاشة فقط.
 */
export function chartLocalLabels(lang: LangId): {
  logScaleA11y: string;
  shareDialogTitle: string;
  sessions: Record<SessionId, string>;
} {
  if (lang === 'ar') {
    return {
      logScaleA11y: 'مقياس لوغاريتمي للسعر',
      shareDialogTitle: 'شارت MATRIX',
      sessions: { tokyo: 'طوكيو', london: 'لندن', ny: 'نيويورك' },
    };
  }
  if (lang === 'ku') {
    return {
      logScaleA11y: 'پێوەری لۆگاریتمی بۆ نرخ',
      shareDialogTitle: 'چارتی MATRIX',
      sessions: { tokyo: 'تۆکیۆ', london: 'لەندەن', ny: 'نیویۆرک' },
    };
  }
  return {
    logScaleA11y: 'Logarithmic price scale',
    shareDialogTitle: 'MATRIX Chart',
    sessions: { tokyo: 'Tokyo', london: 'London', ny: 'New York' },
  };
}
