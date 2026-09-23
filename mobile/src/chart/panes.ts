/**
 * تخطيط لوحات المؤشرات (دالة خالصة، بلا React) — MATRIX.
 *
 * كان `MatrixChart.tsx` يحصي اللوحات بتعداد يدويّ من 108 سطر ثم يقسم الارتفاع عليها
 * بحدٍّ أدنى 34px للوحة. لكن الحدّ الأدنى **لم يكن يُفرض**: بخمس لوحات فأكثر على الهاتف،
 * أو بأي لوحة داخل خلية التخطيط الرباعي (~170px)، تخرج اللوحات صامتةً خارج صندوق الشارت
 * وتركب على رصيف الأدوات. هنا مصدر واحد لمعرّفات اللوحات، وحساب يقرّر كم لوحة **تتّسع
 * فعلاً**، ويطوي الباقي في شريط واحد (16px) يذكر عددها وأسماءها بدل إخفائها بصمت.
 *
 * الترتيب المعروض هو ترتيب الرسم بـ`MatrixChart.tsx` (PANE_IDS)، أما **أيّها يبقى ظاهراً**
 * عند الضيق فيُقرَّر بـ`PANE_PRIORITY`: مؤشرات المتداول الفردي الشائعة أولاً، فلا يُطوى
 * RSI ليبقى Woodie CCI ظاهراً لمجرّد موضعه بترتيب الرسم.
 */

/** معرّفات اللوحات بترتيب الرسم داخل `MatrixChart.tsx` — مصدر واحد للتعداد والبوّابة. */
export const PANE_IDS: readonly string[] = [
  'volume',
  'cvd',
  'obv',
  'nvi',
  'adl',
  'rvix',
  'stc',
  'cog',
  'squeeze',
  'woodieCci',
  'netVolume',
  'donchianWidth',
  'connorsRsi',
  'keltnerWidth',
  'cfo',
  'vwMacd',
  'disparityIndex',
  'tii',
  'demarker',
  'rmi',
  'cutlerRsi',
  'pgo',
  'pfe',
  'rainbowOsc',
  'efficiencyRatio',
  'vpci',
  'ttf',
  'tdi',
  'vfi',
  'laguerreRsi',
  'twiggsMoneyFlow',
  'vzo',
  'gmmaOsc',
  'iftRsi',
  'waveTrend',
  'massIndex',
  'rsi',
  'mfi',
  'adx',
  'ultimateOsc',
  'cmo',
  'trix',
  'force',
  'chaikinOsc',
  'dpo',
  'ao',
  'ac',
  'fractalChaosOsc',
  'bop',
  'bullPower',
  'bearPower',
  'tsi',
  'coppock',
  'eom',
  'ppo',
  'chaikinVol',
  'qstick',
  'chop',
  'bwmfi',
  'pvo',
  'apo',
  'vo',
  'vpt',
  'hv',
  'atrp',
  'parkinsonVol',
  'garmanKlassVol',
  'rogersSatchellVol',
  'yangZhangVol',
  'stochRsi',
  'rvi',
  'linRegSlope',
  'linRegR2',
  'percentB',
  'bbw',
  'momentum',
  'vhf',
  'pvi',
  'gapo',
  'ravi',
  'ulcer',
  'fisher',
  'kst',
  'vortex',
  'dmi',
  'rwi',
  'aroonUpDown',
  'klinger',
  'smi',
  'smiErgodic',
  'pmo',
  'trueRange',
  'stdError',
  'ewmaVol',
  'volRoc',
  'adxr',
  'volatilityRatio',
  'williamsAd',
  'gator',
  'macd',
  'stoch',
  'atr',
  'willr',
  'cci',
  'roc',
  'stddev',
  'aroon',
  'cmf'
];

/** اسم اللوحة كما يظهر بـ`styles.paneLabel` — يُستعمل بشريط المطويّات. */
export const PANE_LABELS: Readonly<Record<string, string>> = {
  volume: 'VOL',
  cvd: 'CVD',
  obv: 'OBV',
  nvi: 'NVI',
  adl: 'A/D',
  rvix: 'RVI (Vol)',
  stc: 'STC',
  cog: 'COG',
  squeeze: 'Squeeze',
  woodieCci: 'Woodie CCI',
  netVolume: 'Net Vol',
  donchianWidth: 'DC Width',
  connorsRsi: 'Connors RSI',
  keltnerWidth: 'KC Width',
  cfo: 'CFO',
  vwMacd: 'VW-MACD',
  disparityIndex: 'Disparity',
  tii: 'TII',
  demarker: 'DeMarker',
  rmi: 'RMI',
  cutlerRsi: 'Cutler\'s RSI',
  pgo: 'PGO',
  pfe: 'PFE',
  rainbowOsc: 'Rainbow Osc',
  efficiencyRatio: 'Efficiency Ratio',
  vpci: 'VPCI',
  ttf: 'TTF',
  tdi: 'TDI',
  vfi: 'VFI',
  laguerreRsi: 'Laguerre RSI',
  twiggsMoneyFlow: 'Twiggs MF',
  vzo: 'VZO',
  gmmaOsc: 'GMMA Osc',
  iftRsi: 'IFT-RSI',
  waveTrend: 'WaveTrend',
  massIndex: 'Mass Index',
  rsi: 'RSI',
  mfi: 'MFI',
  adx: 'ADX',
  ultimateOsc: 'UO',
  cmo: 'CMO',
  trix: 'TRIX',
  force: 'Force',
  chaikinOsc: 'Chaikin',
  dpo: 'DPO',
  ao: 'AO',
  ac: 'AC',
  fractalChaosOsc: 'Fractal Chaos Osc',
  bop: 'BOP',
  bullPower: 'Bull Power',
  bearPower: 'Bear Power',
  tsi: 'TSI',
  coppock: 'Coppock',
  eom: 'EOM',
  ppo: 'PPO',
  chaikinVol: 'Chaikin Vol',
  qstick: 'Qstick',
  chop: 'Choppiness',
  bwmfi: 'BW MFI',
  pvo: 'PVO',
  apo: 'APO',
  vo: 'Volume Osc',
  vpt: 'VPT',
  hv: 'HV',
  atrp: 'ATR%',
  parkinsonVol: 'Parkinson Vol',
  garmanKlassVol: 'G-K Vol',
  rogersSatchellVol: 'R-S Vol',
  yangZhangVol: 'Y-Z Vol',
  stochRsi: 'StochRSI',
  rvi: 'RVI',
  linRegSlope: 'LR Slope',
  linRegR2: 'LR R²',
  percentB: '%B',
  bbw: 'BBW',
  momentum: 'Momentum',
  vhf: 'VHF',
  pvi: 'PVI',
  gapo: 'GAPO',
  ravi: 'RAVI',
  ulcer: 'Ulcer Index',
  fisher: 'Fisher Transform',
  kst: 'KST',
  vortex: 'Vortex',
  dmi: 'DMI',
  rwi: 'RWI',
  aroonUpDown: 'Aroon Up/Down',
  klinger: 'Klinger',
  smi: 'SMI',
  smiErgodic: 'SMI Ergodic Osc',
  pmo: 'PMO',
  trueRange: 'True Range',
  stdError: 'Std Error',
  ewmaVol: 'EWMA Vol',
  volRoc: 'Volume ROC',
  adxr: 'ADXR',
  volatilityRatio: 'Volatility Ratio',
  williamsAd: 'Williams A/D',
  gator: 'Gator',
  macd: 'MACD',
  stoch: 'STO',
  atr: 'ATR',
  willr: '%R',
  cci: 'CCI',
  roc: 'ROC',
  stddev: 'STDEV',
  aroon: 'AROON',
  cmf: 'CMF',
};

/**
 * ما يبقى ظاهراً عند ضيق الارتفاع، الأعلى أولاً: المؤشرات التي يستعملها المتداول الفردي
 * فعلاً. ما ليس بالقائمة يُرتَّب بترتيب الرسم بعدها.
 */
export const PANE_PRIORITY: readonly string[] = [
  'volume',
  'rsi',
  'macd',
  'stoch',
  'atr',
  'adx',
  'stochRsi',
  'mfi',
  'cci',
  'willr',
  'obv',
  'momentum',
  'roc',
  'cmf',
  'bbw',
  'percentB',
  'dmi',
  'ao',
  'atrp',
  'stddev',
];

/** أصغر ارتفاع تبقى عنده اللوحة مقروءة (تسمية + أعمدة). */
export const MIN_PANE_H = 34;
/** أكبر ارتفاع للوحة — فوقه تهدر مساحةَ السعر بلا فائدة. */
export const MAX_PANE_H = 48;
/** ارتفاع شريط المطويّات. */
export const COLLAPSED_BAR_H = 16;

/**
 * فجوة اللوحة = فجوة الجذر الفعلية: `styles.root` بـ`gap: 6` و`rootDense` بـ`gap: 0`.
 * أي تعديل على `root.gap` بـ`MatrixChart.tsx` يجب أن يتبعه هنا.
 */
export function paneGap(dense: boolean): number {
  return dense ? 0 : 6;
}

export type PanePlan = {
  /** ارتفاع كل لوحة ظاهرة. */
  paneH: number;
  /** ارتفاع لوحة السعر. */
  mainH: number;
  /** الفجوة بين اللوحات (= فجوة الجذر). */
  gap: number;
  /** ما يُرسم فعلاً، بترتيب الرسم. */
  shown: readonly string[];
  /** ما طُوي لضيق المساحة، بترتيب الرسم. */
  collapsed: readonly string[];
  /** ارتفاع شريط المطويّات (0 إذا لا يوجد مطويّ). */
  barH: number;
  /** صفحة اللوحات المعروضة (0 = الأعلى أولوية) بعد الحصر داخل `pageCount`. */
  page: number;
  /** عدد صفحات اللوحات عند الضيق (1 = الكل يتّسع، فلا تبديل). */
  pageCount: number;
};

function rankOf(id: string): number {
  const p = PANE_PRIORITY.indexOf(id);
  if (p >= 0) return p;
  return PANE_PRIORITY.length + PANE_IDS.indexOf(id);
}

/**
 * يقرّر ارتفاعات اللوحات وأيّها يُطوى.
 *
 * @param active معرّفات المؤشرات المفعَّلة (بأي ترتيب) — غير اللوحات يُتجاهَل.
 * @param availableH الارتفاع المتاح للشارت كاملاً (سعر + لوحات + شريط).
 * @param dense الوضع المدمج (فجوة الجذر صفر).
 */
export function planPanes(opts: {
  active: readonly string[];
  availableH: number;
  dense: boolean;
  /**
   * صفحة اللوحات عند الضيق. الطيّ كان يُخفي الأولوية الأدنى **نهائياً** فلا سبيل لرؤيتها
   * إلا بإلغاء اختيار مؤشّر آخر؛ فصارت اللوحات صفحاتٍ يدوّرها المتداول بضغطة على الشريط
   * بلا إلغاء أي اختيار. أي رقم مقبول — يُحصر دورياً داخل `pageCount` — فلا يحتاج
   * المستدعي لتصفيره عند تغيّر الارتفاع أو عدد المؤشرات.
   */
  page?: number;
}): PanePlan {
  const gap = paneGap(opts.dense);
  const availableH = Math.max(0, Math.floor(opts.availableH));
  const activeSet = new Set(opts.active);
  const panes = PANE_IDS.filter((id) => activeSet.has(id));

  if (panes.length === 0) {
    return {
      paneH: MAX_PANE_H,
      mainH: availableH,
      gap,
      shown: [],
      collapsed: [],
      barH: 0,
      page: 0,
      pageCount: 1,
    };
  }

  const step = MIN_PANE_H + gap;
  const barCost = COLLAPSED_BAR_H + gap;

  // أرضية السعر لا تتجاوز المتاح، ولا تمنع شريط المطويّات من الظهور: 16px تُقتطع من
  // السعر أهون من اختفاء اللوحات بلا أثر يدلّ عليها.
  let minMainH = Math.min(availableH, Math.max(140, Math.round(availableH * 0.55)));
  minMainH = Math.min(minMainH, Math.max(0, availableH - barCost));
  const paneBudget = Math.max(0, availableH - minMainH);

  const fitsAll = Math.floor(paneBudget / step);
  let shownIds: string[];
  let collapsedIds: string[];
  let barH: number;
  let page = 0;
  let pageCount = 1;

  if (panes.length <= fitsAll) {
    shownIds = panes.slice();
    collapsedIds = [];
    barH = 0;
  } else {
    const fits = Math.max(0, Math.floor(Math.max(0, paneBudget - barCost) / step));
    const ordered = [...panes].sort((a, b) => rankOf(a) - rankOf(b));
    // fits = 0 يعني لا تتّسع ولا لوحة واحدة: صفحة واحدة فارغة، لا قسمة على صفر ولا
    // شريط يَعِد بتبديل لا يحدث.
    pageCount = fits > 0 ? Math.ceil(ordered.length / fits) : 1;
    const raw = Number.isFinite(opts.page) ? Math.floor(opts.page as number) : 0;
    page = fits > 0 ? ((raw % pageCount) + pageCount) % pageCount : 0;
    const keep = new Set(ordered.slice(page * fits, page * fits + fits));
    shownIds = panes.filter((id) => keep.has(id));
    collapsedIds = panes.filter((id) => !keep.has(id));
    barH = collapsedIds.length ? COLLAPSED_BAR_H : 0;
  }

  const barCostUsed = barH ? barH + gap : 0;
  const paneH = shownIds.length
    ? Math.max(
        MIN_PANE_H,
        Math.min(MAX_PANE_H, Math.floor((paneBudget - barCostUsed) / shownIds.length) - gap)
      )
    : MAX_PANE_H;
  const used = shownIds.length * (paneH + gap) + barCostUsed;
  const mainH = Math.max(minMainH, availableH - used);

  return { paneH, mainH, gap, shown: shownIds, collapsed: collapsedIds, barH, page, pageCount };
}

/** نص شريط المطويّات: «+3 مطويّة: RSI · MACD · ATR» (يقصّ الأسماء الطويلة). */
export function collapsedBarText(collapsed: readonly string[], maxNames = 4): string {
  const names = collapsed.map((id) => PANE_LABELS[id] ?? id);
  const head = names.slice(0, maxNames).join(' \u00b7 ');
  return names.length > maxNames ? head + ' \u2026' : head;
}
