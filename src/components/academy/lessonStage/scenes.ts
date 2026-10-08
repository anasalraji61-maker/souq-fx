/**
 * Lesson "screen recording": every lesson part gets a scripted chart scene — candles, a mouse pointer that moves,
 * clicks and drags, and drawings (order blocks, FVG, waves, Gann fans, Wyckoff phases, risk boxes…) that appear
 * in step with the narration, like a teacher recording a laptop screen.
 *
 * Pure TypeScript, shared by the web app and the phone app (the two copies must stay identical — a self-test
 * checks it). The platforms only turn the draw operations from `drawOps` into SVG.
 *
 * Coordinates: candle index `i` (0 = oldest) and price. Scenes are written in "units" in a bullish
 * orientation and converted to real prices at the end (`u` ≈ 0.12% of the price; a mirrored scene flips them).
 */

export type Lang = 'ar' | 'en' | 'ku';
export type Candle = { o: number; h: number; l: number; c: number };
export type Pt = { i: number; p: number; pane?: boolean };

export type Shape =
  | { k: 'line'; a: Pt; b: Pt; color: string; dash?: boolean; w?: number; label?: string }
  | { k: 'box'; a: Pt; b: Pt; color: string; label?: string; fill?: number }
  | { k: 'path'; pts: Pt[]; color: string; labels?: string[]; w?: number; dash?: boolean }
  | { k: 'label'; at: Pt; text: string; color: string; below?: boolean }
  | { k: 'ring'; at: Pt; color: string; label?: string; below?: boolean }
  | { k: 'arrow'; a: Pt; b: Pt; color: string; label?: string }
  | { k: 'vline'; i: number; color: string; label?: string }
  | { k: 'hline'; p: number; color: string; label?: string; dash?: boolean; i0?: number }
  | { k: 'band'; i0: number; i1: number; color: string; label?: string }
  | { k: 'ruler'; a: Pt; b: Pt; text: string }
  | { k: 'fib'; a: Pt; b: Pt; levels: number[]; color: string };

export type Step = {
  s?: Shape;
  /** share of the part's time this step takes (default 1) */
  w?: number;
  /** short line shown under the chart while this step runs */
  cap?: string;
  /** play candles forward until this many are visible */
  reveal?: number;
  /** zoom to these candle indexes */
  view?: [number, number];
};

export type Pane = { values: number[]; kind: 'line' | 'hist'; min: number; max: number; guides?: number[]; label: string; color: string };

export type Scene = {
  id: string;
  symbol: string;
  dec: number;
  candles: Candle[];
  n0: number;
  steps: Step[];
  pane?: Pane;
  view: [number, number];
};

export type Frame = {
  n: number;
  view: [number, number];
  shapes: { s: Shape; q: number }[];
  cursor: { i: number; p: number; pane?: boolean; down: boolean; click: number };
  caption: string;
};

// ------------------------------------------------------------------ colours
const BULL = '#22C55E';
const BEAR = '#EF4444';
const ACC = '#2DD4BF';
const GOLD = '#E8B86D';
const BLUE = '#60A5FA';
const PURP = '#A78BFA';
const GRAY = '#94A3B8';

// ------------------------------------------------------------------ words on the chart
const W: Record<string, [string, string]> = {
  uptrend: ['اتجاه صاعد', 'Uptrend'],
  downtrend: ['اتجاه هابط', 'Downtrend'],
  trendline: ['خط الاتجاه', 'Trendline'],
  support: ['دعم', 'Support'],
  resistance: ['مقاومة', 'Resistance'],
  demand: ['طلب', 'Demand'],
  supply: ['عرض', 'Supply'],
  retest: ['إعادة اختبار', 'Retest'],
  break: ['كسر', 'Break'],
  breakout: ['اختراق', 'Breakout'],
  touch: ['لمسة', 'Touch'],
  entry: ['دخول', 'Entry'],
  target: ['الهدف', 'Target'],
  lastBear: ['آخر شمعة هابطة', 'Last down candle'],
  lastBull: ['آخر شمعة صاعدة', 'Last up candle'],
  reaction: ['ارتداد', 'Reaction'],
  sweep: ['صيد السيولة', 'Liquidity sweep'],
  stops: ['أوامر وقف', 'Stops'],
  closeBack: ['إغلاق عائد', 'Closed back'],
  fakeBreak: ['اختراق كاذب', 'False break'],
  lateEntry: ['دخول متأخر', 'Late entry'],
  betterEntry: ['دخول أفضل', 'Better entry'],
  pullback: ['تصحيح', 'Pullback'],
  dynSupport: ['دعم متحرك', 'Dynamic support'],
  cross: ['تقاطع', 'Cross'],
  divergence: ['دايفرجنس', 'Divergence'],
  neckline: ['خط العنق', 'Neckline'],
  pole: ['السارية', 'Pole'],
  trend: ['الاتجاه', 'Trend'],
  zone: ['المنطقة', 'Zone'],
  confirm: ['التأكيد', 'Confirmation'],
  risk: ['المخاطرة', 'Risk'],
  range: ['النطاق', 'Range'],
  asiaRange: ['نطاق آسيا', 'Asia range'],
  asia: ['آسيا', 'Asia'],
  london: ['لندن', 'London'],
  ny: ['نيويورك', 'New York'],
  inverse: ['حركة معاكسة', 'Opposite move'],
  invalid: ['مستوى الإبطال', 'Invalidation'],
  firstTouch: ['أول لمسة', 'First touch'],
  base: ['القاعدة', 'Base'],
  departure: ['الانطلاق', 'Departure'],
  refined: ['بعد التنقية', 'Refined'],
  priceTime: ['السعر = الزمن', 'Price = Time'],
  effort: ['جهد كبير بلا نتيجة', 'Effort, no result'],
  open: ['الافتتاح', 'Open'],
  close: ['الإغلاق', 'Close'],
  high: ['القمة', 'High'],
  low: ['القاع', 'Low'],
  body: ['الجسم', 'Body'],
  wick: ['الذيل', 'Wick'],
  trail: ['وقف متحرك', 'Trailing stop'],
  alt: ['عدّ بديل', 'Alternate'],
  impulse: ['موجة دافعة 1-2-3-4-5', 'Impulse 1-2-3-4-5'],
  // captions
  c_watch: ['نتابع حركة السعر على الشارت', 'Watching price move'],
  c_swings: ['نحدد القمم والقيعان', 'Marking the highs and lows'],
  c_trendline: ['نرسم خط الاتجاه على القيعان', 'Drawing the trendline'],
  c_measure: ['نقيس المسافة بالنقاط', 'Measuring the distance in pips'],
  c_entry: ['نحدد نقطة الدخول', 'Choosing the entry'],
  c_sl: ['نضع وقف الخسارة', 'Placing the stop loss'],
  c_tp: ['نضع الهدف', 'Placing the target'],
  c_result: ['نرى ماذا فعل السعر', 'Seeing what price did'],
  c_zone: ['نرسم المنطقة', 'Drawing the zone'],
  c_ob: ['نحدد الـ Order Block', 'Marking the order block'],
  c_fvg: ['نرسم الفجوة السعرية FVG', 'Drawing the fair value gap'],
  c_bos: ['كسر هيكلي على شمعة مغلقة', 'Structure break on a closed candle'],
  c_liq: ['السيولة فوق القمم المتساوية', 'Liquidity above equal highs'],
  c_waves: ['نعدّ الموجات', 'Counting the waves'],
  c_fib: ['نسحب الفيبوناتشي', 'Dragging the Fibonacci'],
  c_fan: ['نرسم مروحة جان من القاع', 'Drawing the Gann fan from the low'],
  c_levels: ['نحسب مستويات مربع 9', 'Calculating Square of 9 levels'],
  c_cycles: ['نقيس الدورات الزمنية', 'Measuring time cycles'],
  c_phases: ['نحدد مراحل وايكوف', 'Labelling the Wyckoff phases'],
  c_volume: ['نقرأ الحجم تحت الشارت', 'Reading the volume'],
  c_mistake: ['هذا هو الخطأ الشائع', 'This is the common mistake'],
  c_check: ['قائمة التحقق قبل الدخول', 'Checklist before entering'],
  c_sessions: ['نحدد الجلسات', 'Marking the sessions'],
  c_candle: ['نكبّر على شمعة واحدة', 'Zooming into one candle'],
  c_pattern: ['نرسم النموذج', 'Drawing the pattern'],
  c_indicator: ['نقرأ المؤشر', 'Reading the indicator'],
  c_manage: ['ندير الصفقة', 'Managing the trade'],
  c_journal: ['نسجل نتيجة كل صفقة', 'Recording each trade'],
  c_pd: ['نقسم النطاق إلى غالٍ ورخيص', 'Splitting the range: premium and discount'],
};

// ------------------------------------------------------------------ symbols
type Sym = { B: number; dec: number; pip: number; pv: number; contract: number };
const SYMS: Record<string, Sym> = {
  EURUSD: { B: 1.085, dec: 5, pip: 0.0001, pv: 10, contract: 100000 },
  GBPUSD: { B: 1.27, dec: 5, pip: 0.0001, pv: 10, contract: 100000 },
  USDJPY: { B: 151.5, dec: 3, pip: 0.01, pv: 6.6, contract: 100000 },
  XAUUSD: { B: 2350, dec: 2, pip: 0.1, pv: 10, contract: 100 },
};

const SCHOOL_SYMBOL: Record<string, string> = { gann: 'XAUUSD', sk: 'XAUUSD' };

// ------------------------------------------------------------------ helpers
function rngOf(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let k = 0; k < s.length; k++) {
    h ^= s.charCodeAt(k);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

type Ctx = {
  rng: () => number;
  T: (k: string) => string;
  sym: Sym;
  u: number;
  N: number;
  mirror: boolean;
};

/** Candles that follow the anchor path (units), with small noise; anchors are hit exactly. */
function walk(ctx: Ctx, anchors: [number, number][], noise = 0.32, wick = 0.4): Candle[] {
  const N = ctx.N;
  const at = (i: number) => {
    if (i <= anchors[0][0]) return anchors[0][1];
    for (let k = 1; k < anchors.length; k++) {
      const [i1, v1] = anchors[k];
      const [i0, v0] = anchors[k - 1];
      if (i <= i1) return lerp(v0, v1, (i - i0) / (i1 - i0));
    }
    return anchors[anchors.length - 1][1];
  };
  const isAnchor = new Set(anchors.map((a) => a[0]));
  const out: Candle[] = [];
  let prev = at(-1) + (ctx.rng() - 0.5) * 0.3;
  for (let i = 0; i < N; i++) {
    const target = at(i);
    const c = isAnchor.has(i) ? target : target + (ctx.rng() - 0.5) * 2 * noise;
    const o = prev;
    const top = Math.max(o, c);
    const bot = Math.min(o, c);
    const h = top + ctx.rng() * wick * 0.8 + 0.05;
    const l = bot - ctx.rng() * wick * 0.8 - 0.05;
    out.push({ o, h, l, c });
    prev = c;
  }
  return out;
}

function hiIdx(c: Candle[], i0: number, i1: number) {
  let b = i0;
  for (let i = i0; i <= i1; i++) if (c[i].h > c[b].h) b = i;
  return b;
}
function loIdx(c: Candle[], i0: number, i1: number) {
  let b = i0;
  for (let i = i0; i <= i1; i++) if (c[i].l < c[b].l) b = i;
  return b;
}
const P = (i: number, p: number, pane?: boolean): Pt => (pane ? { i, p, pane } : { i, p });

/** Force candle i to be a solid candle in one direction (units). */
function setCandle(c: Candle[], i: number, o: number, cl: number, wick = 0.15) {
  c[i] = { o, c: cl, h: Math.max(o, cl) + wick, l: Math.min(o, cl) - wick };
  if (i + 1 < c.length) {
    c[i + 1].o = cl;
    c[i + 1].h = Math.max(c[i + 1].h, cl);
    c[i + 1].l = Math.min(c[i + 1].l, cl);
  }
}

/** Candle i dips exactly to `low` with a wick and closes back above it (a rejection). */
function wickTo(c: Candle[], i: number, low: number) {
  const o = low + 0.55;
  const cl = low + 0.85;
  c[i] = { o, c: cl, l: low, h: cl + 0.2 };
  if (i + 1 < c.length) {
    c[i + 1].o = cl;
    c[i + 1].h = Math.max(c[i + 1].h, cl);
    c[i + 1].l = Math.min(c[i + 1].l, cl);
  }
}

function ema(vals: number[], n: number) {
  const k = 2 / (n + 1);
  const out: number[] = [];
  vals.forEach((v, i) => out.push(i === 0 ? v : v * k + out[i - 1] * (1 - k)));
  return out;
}

function rsi(closes: number[], n = 14) {
  const out: number[] = [50];
  let g = 0;
  let l = 0;
  for (let i = 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    const up = Math.max(d, 0);
    const dn = Math.max(-d, 0);
    if (i <= n) {
      g += up / n;
      l += dn / n;
    } else {
      g = (g * (n - 1) + up) / n;
      l = (l * (n - 1) + dn) / n;
    }
    out.push(l === 0 ? 100 : 100 - 100 / (1 + g / l));
  }
  return out;
}

const pipsOf = (ctx: Ctx, units: number) => Math.round((Math.abs(units) * ctx.u) / ctx.sym.pip);
const money = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;

type Built = { candles: Candle[]; steps: Step[]; n0?: number; pane?: Omit<Pane, 'label' | 'color'> & { label?: string; color?: string }; view?: [number, number] };
type Builder = (ctx: Ctx, variant: string) => Built;

// ------------------------------------------------------------------ position tool (shared by many scenes)
function positionSteps(ctx: Ctx, c: Candle[], ie: number, entry: number, sl: number, rr: number, i1: number, extra: Step[] = []): Step[] {
  const risk = entry - sl;
  const tp = entry + rr * risk;
  let hit = -1;
  for (let i = ie + 1; i < c.length; i++)
    if (c[i].h >= tp) {
      hit = i;
      break;
    }
  const steps: Step[] = [
    { s: { k: 'ring', at: P(ie, entry), color: ACC }, cap: ctx.T('c_entry') },
    { s: { k: 'hline', p: entry, i0: ie, color: ACC, label: ctx.T('entry') }, w: 0.8 },
    { s: { k: 'box', a: P(ie, entry), b: P(i1, sl), color: BEAR, label: `SL · ${pipsOf(ctx, risk)} pips` }, cap: ctx.T('c_sl'), w: 1.3 },
    { s: { k: 'box', a: P(ie, entry), b: P(i1, tp), color: BULL, label: `TP · 1:${rr}` }, cap: ctx.T('c_tp'), w: 1.3 },
    ...extra,
    { reveal: c.length, cap: ctx.T('c_result'), w: 2 },
  ];
  if (hit > 0) steps.push({ s: { k: 'ring', at: P(hit, tp), color: BULL, label: '✓ TP' } });
  return steps;
}

// ------------------------------------------------------------------ scenes
const S: Record<string, Builder> = {
  overview(ctx) {
    const c = walk(ctx, [[0, 0], [8, 4], [12, 2], [22, 9], [27, 6], [38, 14], [43, 11], [55, 19]]);
    const a = loIdx(c, 9, 15);
    const b = loIdx(c, 40, 46);
    return {
      candles: c,
      n0: 22,
      steps: [
        { reveal: 56, cap: ctx.T('c_watch'), w: 2.5 },
        { s: { k: 'ring', at: P(a, c[a].l), color: BULL, label: 'HL', below: true }, cap: ctx.T('c_swings') },
        { s: { k: 'arrow', a: P(a, c[a].l), b: P(b, c[b].l), color: ACC, label: ctx.T('uptrend') }, w: 1.5 },
      ],
    };
  },

  checklist(ctx) {
    const c = walk(ctx, [[0, 0], [10, 8], [14, 6], [18, 4.2], [20, 4], [22, 4.8], [26, 7], [38, 13], [55, 16]]);
    setCandle(c, 21, 4.0, 5.6);
    const top = Math.max(...c.map((x) => x.h));
    const items = [`✓ ${ctx.T('trend')}`, `✓ ${ctx.T('zone')}`, `✓ ${ctx.T('confirm')}`, `✓ ${ctx.T('risk')} 1%`];
    return {
      candles: c,
      n0: 23,
      steps: [
        { s: { k: 'arrow', a: P(0, c[0].l), b: P(10, c[10].h), color: ACC, label: items[0] }, cap: ctx.T('c_check') },
        { s: { k: 'box', a: P(15, 3.6), b: P(55, 4.7), color: BLUE, label: items[1] } },
        { s: { k: 'ring', at: P(21, c[21].c), color: BULL, label: items[2], below: true } },
        { s: { k: 'label', at: P(3, top), text: items[3], color: GOLD } },
        { reveal: 56, cap: ctx.T('c_result'), w: 1.6 },
      ],
    };
  },

  pips(ctx, v) {
    const c = walk(ctx, [[0, 0], [10, -3], [20, 5], [30, 1], [42, 9], [55, 6]]);
    const a = loIdx(c, 5, 15);
    const b = hiIdx(c, 36, 47);
    const pips = pipsOf(ctx, c[b].h - c[a].l);
    const steps: Step[] = [
      { s: { k: 'ring', at: P(a, c[a].l), color: GOLD, below: true }, cap: ctx.T('c_measure') },
      { s: { k: 'ruler', a: P(a, c[a].l), b: P(b, c[b].h), text: `${pips} pips` }, w: 2 },
      { s: { k: 'label', at: P(2, c[b].h), text: `1 pip = ${ctx.sym.pip}`, color: GOLD } },
    ];
    if (v === 'value')
      steps.push({ s: { k: 'label', at: P(2, lerp(c[a].l, c[b].h, 0.72)), text: `1 lot: ${pips} × $${ctx.sym.pv} = ${money(pips * ctx.sym.pv)}`, color: BULL } });
    return { candles: c, steps };
  },

  position(ctx, v) {
    const c = walk(ctx, [[0, 0], [14, 8], [22, 4], [26, 3.5], [40, 12], [55, 15]]);
    const ie = 26;
    const entry = c[ie].c;
    const sl = c[loIdx(c, 19, 26)].l - 1.4;
    const slPips = pipsOf(ctx, entry - sl);
    const extra: Step[] = [];
    if (v === 'lot') {
      const lot = Math.max(0.01, Math.round((100 / (slPips * ctx.sym.pv)) * 100) / 100);
      extra.push({ s: { k: 'label', at: P(2, c[hiIdx(c, 0, 25)].h), text: `$100 ÷ (${slPips} × $${ctx.sym.pv}) = ${lot} lot`, color: GOLD }, w: 1.4 });
    } else if (v === 'margin') {
      const lotValue = ctx.sym.contract * (ctx.sym === SYMS.USDJPY ? 1 : ctx.sym.B);
      extra.push({ s: { k: 'label', at: P(2, c[hiIdx(c, 0, 25)].h), text: `1 lot = ${money(lotValue)} · 1:100 → ${money(lotValue / 100)}`, color: GOLD }, w: 1.4 });
    } else {
      extra.push({ s: { k: 'label', at: P(2, c[hiIdx(c, 0, 25)].h), text: `${ctx.T('risk')} 1% · 1:2`, color: GOLD } });
    }
    return { candles: c, n0: 27, steps: positionSteps(ctx, c, ie, entry, sl, 2, 40, extra) };
  },

  candle(ctx) {
    const c = walk(ctx, [[0, 0], [20, 4], [34, 2], [48, 6], [55, 6.5]]);
    const k = 49;
    setCandle(c, k, 5.2, 7.4, 0);
    c[k].h = 8.4;
    c[k].l = 4.5;
    const lab = (p: number, t: string, col: string): Step => ({ s: { k: 'line', a: P(k + 2.6, p), b: P(k + 0.45, p), color: col, label: t } });
    return {
      candles: c,
      view: [-0.5, 61],
      steps: [
        { view: [40, 56], cap: ctx.T('c_candle'), w: 1.4 },
        { s: { k: 'ring', at: P(k, 6.3), color: ACC } },
        lab(7.4, ctx.T('close'), BULL),
        lab(5.2, ctx.T('open'), GRAY),
        lab(8.4, ctx.T('high'), GOLD),
        lab(4.5, ctx.T('low'), GOLD),
        { s: { k: 'label', at: P(k - 3.5, 6.4), text: `${ctx.T('body')} / ${ctx.T('wick')}`, color: ACC } },
      ],
    };
  },

  sd(ctx) {
    const c = walk(ctx, [[0, 6], [8, 6.3], [12, 1], [15, 0.6], [17, 0.9], [22, 8], [27, 10], [30, 9.6], [36, 3], [40, 1.6], [44, 5], [55, 9]]);
    const dLo = c[loIdx(c, 12, 18)].l;
    const dHi = Math.max(...[13, 14, 15, 16, 17].map((i) => Math.max(c[i].o, c[i].c)));
    const sHi = c[hiIdx(c, 25, 31)].h;
    const sLo = Math.min(...[26, 27, 28, 29].map((i) => Math.min(c[i].o, c[i].c)));
    wickTo(c, 40, dLo + 0.1);
    return {
      candles: c,
      n0: 33,
      steps: [
        { s: { k: 'box', a: P(12, dLo), b: P(55, dHi), color: BULL, label: ctx.T('demand') }, cap: ctx.T('c_zone'), w: 1.4 },
        { s: { k: 'box', a: P(25, sLo), b: P(55, sHi), color: BEAR, label: ctx.T('supply') }, w: 1.4 },
        { reveal: 56, cap: ctx.T('c_result'), w: 2 },
        { s: { k: 'ring', at: P(40, c[40].l), color: BULL, label: ctx.T('reaction'), below: true } },
      ],
    };
  },

  trend(ctx, v) {
    const c = walk(ctx, [[0, 0], [6, 5], [10, 2.5], [18, 8], [23, 5], [32, 12], [37, 9], [46, 15], [50, 12.5], [55, 16]]);
    const sw = [0, 6, 10, 18, 23, 32, 37, 46, 50];
    const pts = sw.map((i, k) => P(i, k % 2 === 0 ? c[i].l : c[i].h));
    const labels = ['', 'HH', 'HL', 'HH', 'HL', 'HH', 'HL', 'HH', 'HL'];
    const slope = (c[23].l - c[10].l) / 13;
    const steps: Step[] = [
      { s: { k: 'path', pts, color: GOLD, labels }, cap: ctx.T('c_swings'), w: 2.4 },
      { s: { k: 'line', a: P(10, c[10].l), b: P(55, c[10].l + slope * 45), color: ACC, label: ctx.T('trendline'), w: 2 }, cap: ctx.T('c_trendline'), w: 1.6 },
    ];
    if (v !== 'line') steps.push({ s: { k: 'ring', at: P(37, c[37].l), color: ACC, label: ctx.T('touch'), below: true } });
    steps.push({ s: { k: 'label', at: P(2, c[46].h), text: ctx.mirror ? ctx.T('downtrend') : ctx.T('uptrend'), color: ctx.mirror ? BEAR : BULL } });
    return { candles: c, steps };
  },

  tlbreak(ctx) {
    const c = walk(ctx, [[0, 0], [8, 5], [12, 3], [20, 8], [25, 6], [32, 11], [37, 8], [41, 5], [45, 6.4], [48, 3.6], [55, 0]]);
    const slope = (c[25].l - c[12].l) / 13;
    const lineAt = (i: number) => c[12].l + slope * (i - 12);
    let brk = 38;
    for (let i = 33; i < 55; i++)
      if (c[i].c < lineAt(i)) {
        brk = i;
        break;
      }
    return {
      candles: c,
      n0: 34,
      steps: [
        { s: { k: 'line', a: P(12, c[12].l), b: P(55, lineAt(55)), color: ACC, label: ctx.T('trendline'), w: 2 }, cap: ctx.T('c_trendline'), w: 1.6 },
        { reveal: 56, cap: ctx.T('c_watch'), w: 2 },
        { s: { k: 'ring', at: P(brk, c[brk].c), color: BEAR, label: ctx.T('break') } },
        { s: { k: 'ring', at: P(45, c[45].h), color: GOLD, label: ctx.T('retest') } },
      ],
    };
  },

  sr(ctx, v) {
    const c = walk(ctx, [[0, 4], [5, 8], [10, 0.5], [16, 7.8], [22, 0.4], [28, 8.1], [33, 3], [38, 12], [42, 8.6], [46, 9.2], [55, 14]]);
    for (const i of [5, 16, 28]) c[i].h = Math.min(c[i].h, 8.5);
    for (const i of [10, 22]) c[i].l = Math.max(c[i].l, -0.2);
    wickTo(c, 42, 8.0);
    const steps: Step[] = [
      { s: { k: 'box', a: P(0, 7.4), b: P(55, 8.5), color: BEAR, label: ctx.T('resistance') }, cap: ctx.T('c_zone'), w: 1.4 },
      { s: { k: 'box', a: P(0, -0.2), b: P(55, 0.9), color: BULL, label: ctx.T('support') }, w: 1.4 },
      { s: { k: 'ring', at: P(16, c[16].h), color: BEAR, label: ctx.T('touch') } },
      { s: { k: 'ring', at: P(22, c[22].l), color: BULL, label: ctx.T('touch'), below: true } },
      { reveal: 56, cap: ctx.T('c_watch'), w: 2 },
      { s: { k: 'ring', at: P(42, c[42].l), color: GOLD, label: `${ctx.T('retest')} · ${ctx.T('resistance')} → ${ctx.T('support')}`, below: true }, w: v === 'retest' ? 2 : 1 },
    ];
    return { candles: c, n0: 31, steps };
  },

  ema(ctx) {
    const c = walk(ctx, [[0, 8], [18, 0], [24, 1], [30, -0.5], [40, 6], [46, 4.6], [55, 10]]);
    const closes = c.map((x) => x.c);
    const e9 = ema(closes, 9);
    const e21 = ema(closes, 21);
    let x = 34;
    for (let i = 26; i < 55; i++)
      if (e9[i] > e21[i] && e9[i - 1] <= e21[i - 1]) {
        x = i;
        break;
      }
    const pts = (e: number[]) => e.map((p, i) => P(i, p));
    return {
      candles: c,
      steps: [
        { s: { k: 'path', pts: pts(e9), color: GOLD, labels: [], w: 1.6 }, cap: ctx.T('c_indicator'), w: 2 },
        { s: { k: 'label', at: P(52, e9[52]), text: 'EMA 9', color: GOLD } },
        { s: { k: 'path', pts: pts(e21), color: BLUE, w: 1.6 }, w: 2 },
        { s: { k: 'label', at: P(52, e21[52]), text: 'EMA 21', color: BLUE, below: true } },
        { s: { k: 'ring', at: P(x, e9[x]), color: ACC, label: ctx.T('cross') } },
        { s: { k: 'ring', at: P(46, c[46].l), color: BULL, label: ctx.T('dynSupport'), below: true } },
      ],
    };
  },

  rsi(ctx, v) {
    const c = walk(ctx, [[0, 0], [10, 7], [16, 3.5], [24, 10.5], [29, 8], [43, 11.4], [55, 4]], 0.22);
    const r = rsi(c.map((x) => x.c));
    const h1 = hiIdx(c, 20, 28);
    const h2 = hiIdx(c, 38, 46);
    if (v === 'macd') {
      const closes = c.map((x) => x.c);
      const e12 = ema(closes, 12);
      const e26 = ema(closes, 26);
      const m = e12.map((x, i) => x - e26[i]);
      const sig = ema(m, 9);
      const hist = m.map((x, i) => x - sig[i]);
      const mx = Math.max(...hist.map(Math.abs)) || 1;
      let cross = 30;
      for (let i = 28; i < 55; i++)
        if (hist[i] < 0 && hist[i - 1] >= 0) {
          cross = i;
          break;
        }
      return {
        candles: c,
        pane: { values: hist, kind: 'hist', min: -mx, max: mx, guides: [0], label: 'MACD' },
        steps: [
          { s: { k: 'line', a: P(h1, c[h1].h), b: P(h2, c[h2].h), color: GOLD, label: 'HH' }, cap: ctx.T('c_indicator'), w: 1.4 },
          { s: { k: 'line', a: P(h1, hist[h1], true), b: P(h2, hist[h2], true), color: GOLD, label: 'LH' }, w: 1.4 },
          { s: { k: 'ring', at: P(cross, 0, true), color: BEAR, label: ctx.T('cross') } },
          { s: { k: 'label', at: P(2, c[h2].h), text: ctx.T('divergence'), color: GOLD } },
        ],
      };
    }
    return {
      candles: c,
      pane: { values: r, kind: 'line', min: 0, max: 100, guides: [30, 70], label: 'RSI 14' },
      steps: [
        { s: { k: 'ring', at: P(h1, r[h1], true), color: BEAR, label: '70+' }, cap: ctx.T('c_indicator') },
        { s: { k: 'line', a: P(h1, c[h1].h), b: P(h2, c[h2].h), color: GOLD, label: 'HH' }, w: 1.4 },
        { s: { k: 'line', a: P(h1, r[h1], true), b: P(h2, r[h2], true), color: GOLD, label: 'LH' }, w: 1.4 },
        { s: { k: 'label', at: P(2, c[h2].h), text: ctx.T('divergence'), color: GOLD } },
      ],
    };
  },

  hs(ctx) {
    const c = walk(ctx, [[0, 0], [8, 6], [12, 3.5], [20, 10], [26, 3.4], [33, 6.2], [38, 3.2], [42, 1], [46, 2.6], [55, -4]]);
    const n1 = loIdx(c, 10, 14);
    const n2 = loIdx(c, 24, 28);
    const slope = (c[n2].l - c[n1].l) / (n2 - n1);
    const neck = (i: number) => c[n1].l + slope * (i - n1);
    let brk = 39;
    for (let i = 34; i < 55; i++)
      if (c[i].c < neck(i)) {
        brk = i;
        break;
      }
    const head = hiIdx(c, 17, 23);
    const height = c[head].h - neck(head);
    return {
      candles: c,
      n0: 35,
      steps: [
        { s: { k: 'ring', at: P(hiIdx(c, 6, 10), c[hiIdx(c, 6, 10)].h), color: GOLD, label: 'LS' }, cap: ctx.T('c_pattern') },
        { s: { k: 'ring', at: P(head, c[head].h), color: GOLD, label: 'H' } },
        { s: { k: 'ring', at: P(hiIdx(c, 31, 35), c[hiIdx(c, 31, 35)].h), color: GOLD, label: 'RS' } },
        { s: { k: 'line', a: P(n1, c[n1].l), b: P(55, neck(55)), color: ACC, label: ctx.T('neckline'), w: 2 }, w: 1.5 },
        { reveal: 56, cap: ctx.T('c_watch'), w: 1.6 },
        { s: { k: 'arrow', a: P(brk, neck(brk)), b: P(brk, neck(brk) - height), color: BEAR, label: ctx.T('target') } },
      ],
    };
  },

  triangle(ctx) {
    const c = walk(ctx, [[0, 0], [6, 10], [12, 2], [18, 8.5], [24, 3.5], [30, 7.2], [35, 4.6], [39, 6.4], [42, 5.6], [47, 12], [55, 14]]);
    const s1 = (c[18].h - c[6].h) / 12;
    const s2 = (c[24].l - c[12].l) / 12;
    return {
      candles: c,
      n0: 41,
      steps: [
        { s: { k: 'line', a: P(6, c[6].h), b: P(44, c[6].h + s1 * 38), color: BEAR, w: 2 }, cap: ctx.T('c_pattern'), w: 1.5 },
        { s: { k: 'line', a: P(12, c[12].l), b: P(44, c[12].l + s2 * 32), color: BULL, w: 2 }, w: 1.5 },
        { reveal: 56, cap: ctx.T('c_watch'), w: 2 },
        { s: { k: 'ring', at: P(44, c[44].c), color: ACC, label: ctx.T('breakout') } },
      ],
    };
  },

  flag(ctx) {
    const c = walk(ctx, [[0, 0], [6, 0.5], [14, 10], [17, 8.8], [20, 9.6], [23, 8], [26, 8.8], [30, 7.2], [35, 13], [55, 17]]);
    const s = (c[26].h - c[14].h) / 12;
    return {
      candles: c,
      n0: 31,
      steps: [
        { s: { k: 'arrow', a: P(6, c[6].l), b: P(14, c[14].h), color: BULL, label: ctx.T('pole') }, cap: ctx.T('c_pattern') },
        { s: { k: 'line', a: P(14, c[14].h), b: P(32, c[14].h + s * 18), color: GOLD, w: 2 }, w: 1.3 },
        { s: { k: 'line', a: P(17, c[17].l), b: P(32, c[17].l + s * 15), color: GOLD, w: 2 }, w: 1.3 },
        { reveal: 56, cap: ctx.T('c_watch'), w: 2 },
        { s: { k: 'ring', at: P(33, c[33].c), color: ACC, label: ctx.T('breakout') } },
      ],
    };
  },

  plan(ctx) {
    const c = walk(ctx, [[0, 0], [10, 8], [14, 6], [18, 4.3], [20, 4.1], [22, 4.8], [24, 6], [38, 13], [55, 16]]);
    setCandle(c, 21, 4.1, 5.4);
    const zoneLo = c[loIdx(c, 16, 21)].l;
    return {
      candles: c,
      n0: 22,
      steps: [
        { s: { k: 'arrow', a: P(0, c[0].l), b: P(10, c[10].h), color: ACC, label: `✓ ${ctx.T('trend')}` }, cap: ctx.T('c_check') },
        { s: { k: 'box', a: P(15, zoneLo), b: P(40, zoneLo + 1.2), color: BLUE, label: `✓ ${ctx.T('zone')}` }, cap: ctx.T('c_zone') },
        { s: { k: 'ring', at: P(21, c[21].c), color: BULL, label: `✓ ${ctx.T('confirm')}` } },
        ...positionSteps(ctx, c, 21, c[21].c, zoneLo - 0.4, 2, 38),
      ],
    };
  },

  chase(ctx) {
    const c = walk(ctx, [[0, 0], [18, 2], [20, 2.4], [24, 9], [25, 9.6], [31, 5], [38, 6.5], [55, 11]]);
    for (const i of [21, 22, 23]) setCandle(c, i, c[i - 1].c, c[i - 1].c + 2.1, 0.1);
    return {
      candles: c,
      n0: 26,
      steps: [
        { s: { k: 'ring', at: P(25, c[25].h), color: BEAR, label: `✗ ${ctx.T('lateEntry')}` }, cap: ctx.T('c_mistake'), w: 1.4 },
        { reveal: 34, w: 1.8 },
        { s: { k: 'arrow', a: P(25, c[25].h), b: P(31, c[31].l), color: BEAR, label: ctx.T('pullback') } },
        { s: { k: 'ring', at: P(31, c[31].l), color: BULL, label: `✓ ${ctx.T('betterEntry')}`, below: true } },
        { reveal: 56, w: 1.4 },
      ],
    };
  },

  fakeout(ctx) {
    const c = walk(ctx, [[0, 2], [8, 7.6], [14, 3], [22, 7.7], [28, 4], [36, 7.4], [38, 8.2], [40, 6.6], [46, 2], [55, 0]]);
    const lvl = 8;
    for (const i of [8, 22]) c[i].h = Math.min(c[i].h, lvl - 0.05);
    c[38] = { o: 7.4, h: 9.6, l: 7.2, c: 7.7 };
    c[39].o = 7.7;
    return {
      candles: c,
      n0: 37,
      steps: [
        { s: { k: 'hline', p: lvl, color: BEAR, label: ctx.T('resistance'), dash: true }, cap: ctx.T('c_zone') },
        { reveal: 39, w: 1.2 },
        { s: { k: 'ring', at: P(38, c[38].h), color: BEAR, label: `✗ ${ctx.T('fakeBreak')}` }, cap: ctx.T('c_mistake'), w: 1.4 },
        { s: { k: 'ring', at: P(38, c[38].c), color: GOLD, label: ctx.T('closeBack'), below: true } },
        { reveal: 56, cap: ctx.T('c_result'), w: 1.8 },
      ],
    };
  },

  liquidity(ctx, v) {
    const c = walk(ctx, [[0, 0], [6, 6], [10, 3], [16, 6.05], [20, 2.5], [26, 6], [30, 3], [33, 5], [34, 6.2], [36, 4], [40, 1], [44, 2], [55, -4]]);
    const lvl = 6.4;
    for (const i of [6, 16, 26]) c[i].h = lvl - 0.05 + i * 0.002;
    c[34] = { o: 5.6, h: lvl + 1.3, l: 5.3, c: 5.8 };
    c[35].o = 5.8;
    const sl = loIdx(c, 28, 32);
    let brk = 38;
    for (let i = 35; i < 55; i++)
      if (c[i].c < c[sl].l) {
        brk = i;
        break;
      }
    const steps: Step[] = [
      { s: { k: 'line', a: P(6, lvl), b: P(36, lvl), color: GOLD, dash: true, label: '$$$ BSL' }, cap: ctx.T('c_liq'), w: 1.5 },
    ];
    if (v === 'stops') {
      steps.push({ s: { k: 'box', a: P(6, lvl), b: P(30, lvl + 0.9), color: BEAR, label: ctx.T('stops') } });
      steps.push({ s: { k: 'box', a: P(10, c[10].l), b: P(30, c[10].l - 0.9), color: BEAR, label: ctx.T('stops') } });
    }
    if (v === 'idm') steps.push({ s: { k: 'ring', at: P(30, c[30].l), color: PURP, label: 'IDM', below: true } });
    steps.push(
      { reveal: 36, cap: ctx.T('c_watch'), w: 1.2 },
      { s: { k: 'ring', at: P(34, c[34].h), color: BEAR, label: ctx.T('sweep') } },
      { reveal: 56, w: 1.6 },
      { s: { k: 'line', a: P(sl, c[sl].l), b: P(brk, c[sl].l), color: BEAR, label: 'MSS' }, cap: ctx.T('c_bos') },
    );
    return { candles: c, n0: 32, steps };
  },

  sessions(ctx) {
    const c = walk(ctx, [[0, 3], [4, 4], [8, 2.5], [12, 4.2], [18, 3], [22, 5.6], [26, 1], [34, 8], [40, 6], [48, 11], [55, 10]]);
    const ah = hiIdx(c, 0, 18);
    const al = loIdx(c, 0, 18);
    const sw = hiIdx(c, 19, 24);
    c[sw].h = Math.max(c[sw].h, c[ah].h + 0.8);
    return {
      candles: c,
      n0: 19,
      steps: [
        { s: { k: 'band', i0: 0, i1: 18, color: BLUE, label: ctx.T('asia') }, cap: ctx.T('c_sessions') },
        { s: { k: 'box', a: P(0, c[al].l), b: P(18, c[ah].h), color: GOLD, label: ctx.T('asiaRange') }, w: 1.4 },
        { reveal: 35, w: 1.4 },
        { s: { k: 'band', i0: 19, i1: 34, color: PURP, label: ctx.T('london') } },
        { s: { k: 'ring', at: P(sw, c[sw].h), color: BEAR, label: ctx.T('sweep') } },
        { reveal: 56, w: 1.2 },
        { s: { k: 'band', i0: 35, i1: 55, color: GOLD, label: ctx.T('ny') } },
      ],
    };
  },

  ob(ctx, v) {
    const c = walk(ctx, [[0, 8], [10, 3], [14, 4.6], [18, 1.6], [20, 1.2], [21, 0.6], [22, 3], [23, 6], [24, 8], [28, 10.5], [32, 8.4], [36, 5], [38, 2.2], [40, 4], [44, 9], [55, 14]], 0.28);
    setCandle(c, 21, 1.5, 0.6, 0.2); // last down candle
    setCandle(c, 22, 0.6, 3.1, 0.1);
    setCandle(c, 23, 3.1, 6.0, 0.1);
    setCandle(c, 24, 6.0, 8.0, 0.15);
    c[24].l = Math.max(c[24].l, c[22].h + 0.5);
    const obLo = c[21].l;
    const obHi = c[21].h;
    c[38] = { o: 2.6, h: 2.9, l: lerp(obLo, obHi, 0.55), c: 2.4 };
    c[39].o = 2.4;
    const swing = hiIdx(c, 12, 16);
    let brk = 23;
    for (let i = 22; i < 30; i++)
      if (c[i].c > c[swing].h) {
        brk = i;
        break;
      }
    const steps: Step[] = [];
    if (v === 'refine') {
      steps.push(
        { view: [14, 30], cap: ctx.T('c_candle'), w: 1.2 },
        { s: { k: 'box', a: P(21, obLo), b: P(29, obHi), color: BLUE, label: 'OB' }, cap: ctx.T('c_ob'), w: 1.4 },
        { s: { k: 'box', a: P(21, c[21].c), b: P(29, c[21].o), color: ACC, label: ctx.T('refined') }, w: 1.4 },
        { view: [-0.5, 61], w: 1 },
      );
      return { candles: c, steps };
    }
    steps.push(
      { s: { k: 'ring', at: P(21, obLo), color: BEAR, label: ctx.T(ctx.mirror ? 'lastBull' : 'lastBear'), below: true }, cap: ctx.T('c_ob') },
      { s: { k: 'box', a: P(21, obLo), b: P(55, obHi), color: BLUE, label: 'OB' }, w: 1.4 },
      { s: { k: 'line', a: P(swing, c[swing].h), b: P(brk, c[swing].h), color: ACC, label: 'BOS' }, cap: ctx.T('c_bos') },
      { s: { k: 'box', a: P(22, c[22].h), b: P(55, c[24].l), color: PURP, label: 'FVG' }, cap: ctx.T('c_fvg') },
    );
    if (v === 'entry') {
      steps.push({ reveal: 39, w: 1.4 }, ...positionSteps(ctx, c, 38, obHi, obLo - 0.35, 3, 50));
      return { candles: c, n0: 33, steps };
    }
    steps.push({ reveal: 56, cap: ctx.T('c_result'), w: 1.8 }, { s: { k: 'ring', at: P(38, c[38].l), color: BULL, label: ctx.T('reaction'), below: true } });
    return { candles: c, n0: 33, steps };
  },

  fvg(ctx, v) {
    const c = walk(ctx, [[0, 0], [12, -2], [16, -1], [18, 1], [19, 4], [20, 5.5], [26, 9], [30, 7], [33, 4.4], [36, 6], [55, 12]], 0.28);
    setCandle(c, 18, 0.4, 1.1, 0.12);
    setCandle(c, 19, 1.1, 4.3, 0.1);
    setCandle(c, 20, 4.3, 5.6, 0.12);
    c[20].l = Math.max(c[20].l, c[18].h + 1.2);
    const lo = c[18].h;
    const hi = c[20].l;
    const ce = (lo + hi) / 2;
    c[33] = { o: 4.9, h: 5.1, l: v === 'partial' ? ce : lo + 0.2, c: 4.7 };
    c[34].o = 4.7;
    const steps: Step[] = [
      { view: [10, 30], w: 1 },
      { s: { k: 'ring', at: P(19, (c[19].o + c[19].c) / 2), color: GOLD, label: '1 · 2 · 3' }, cap: ctx.T('c_fvg') },
      { s: { k: 'box', a: P(18, lo), b: P(55, hi), color: PURP, label: 'FVG' }, w: 1.4 },
      { view: [-0.5, 61], w: 0.8 },
    ];
    if (v === 'partial' || v === 'filter') steps.push({ s: { k: 'hline', p: ce, i0: 18, color: GOLD, label: 'CE 50%', dash: true } });
    if (v === 'filter') steps.push({ s: { k: 'label', at: P(2, c[26].h), text: '✓ BOS · ✓ OB', color: BULL } });
    steps.push({ reveal: 56, cap: ctx.T('c_result'), w: 1.6 }, { s: { k: 'ring', at: P(33, c[33].l), color: BULL, label: ctx.T('reaction'), below: true } });
    return { candles: c, n0: 30, steps };
  },

  bos(ctx) {
    const c = walk(ctx, [[0, 0], [6, 5], [10, 2.5], [18, 8], [23, 5], [32, 12], [37, 9], [46, 15], [50, 12.5], [55, 16]]);
    const lines: Step[] = [];
    for (const [h, from, to] of [[6, 7, 18], [18, 19, 32], [32, 33, 46]]) {
      let b = to;
      for (let i = from; i <= to; i++)
        if (c[i].c > c[h].h) {
          b = i;
          break;
        }
      lines.push({ s: { k: 'line', a: P(h, c[h].h), b: P(b, c[h].h), color: ACC, label: 'BOS' }, cap: ctx.T('c_bos'), w: 1.2 });
    }
    return { candles: c, steps: [{ s: { k: 'path', pts: [0, 6, 10, 18, 23, 32, 37, 46].map((i, k) => P(i, k % 2 ? c[i].h : c[i].l)), color: GOLD, labels: ['', 'H', 'L', 'H', 'L', 'H', 'L', 'H'] }, cap: ctx.T('c_swings'), w: 2 }, ...lines] };
  },

  choch(ctx) {
    const c = walk(ctx, [[0, 0], [6, 5], [10, 2.5], [18, 8], [23, 5], [32, 11], [36, 7.5], [40, 4], [44, 6], [55, 0]]);
    let brk = 40;
    for (let i = 33; i < 55; i++)
      if (c[i].c < c[23].l) {
        brk = i;
        break;
      }
    return {
      candles: c,
      n0: 34,
      steps: [
        { s: { k: 'path', pts: [0, 6, 10, 18, 23, 32].map((i, k) => P(i, k % 2 ? c[i].h : c[i].l)), color: GOLD, labels: ['', 'HH', 'HL', 'HH', 'HL', 'HH'] }, cap: ctx.T('c_swings'), w: 2 },
        { s: { k: 'hline', p: c[23].l, i0: 23, color: BEAR, dash: true, label: 'HL' } },
        { reveal: 56, cap: ctx.T('c_watch'), w: 1.8 },
        { s: { k: 'line', a: P(23, c[23].l), b: P(brk, c[23].l), color: BEAR, label: 'CHOCH' }, cap: ctx.T('c_bos') },
      ],
    };
  },

  pd(ctx, v) {
    const c = walk(ctx, [[0, 6], [8, 0], [22, 12], [30, 8], [36, 4.5], [40, 3.4], [44, 6], [55, 13]]);
    const a = loIdx(c, 5, 11);
    const b = hiIdx(c, 19, 25);
    const lo = c[a].l;
    const hi = c[b].h;
    const mid = (lo + hi) / 2;
    const ote1 = hi - 0.62 * (hi - lo);
    const ote2 = hi - 0.79 * (hi - lo);
    wickTo(c, 40, (ote1 + ote2) / 2);
    const steps: Step[] = [
      { s: { k: 'fib', a: P(a, lo), b: P(b, hi), levels: [0, 0.5, 1], color: GRAY }, cap: ctx.T('c_fib'), w: 1.5 },
      { s: { k: 'box', a: P(b, mid), b: P(55, hi), color: BEAR, label: 'Premium' }, cap: ctx.T('c_pd') },
      { s: { k: 'box', a: P(b, lo), b: P(55, mid), color: BULL, label: 'Discount' } },
    ];
    steps.push({ s: { k: 'box', a: P(b, ote2), b: P(55, ote1), color: GOLD, label: 'OTE 62–79%' } });
    steps.push({ reveal: 56, cap: ctx.T('c_result'), w: 1.6 }, { s: { k: 'ring', at: P(40, c[40].l), color: BULL, label: ctx.T('reaction'), below: true } });
    return { candles: c, n0: 30, steps };
  },

  dxy(ctx) {
    const c = walk(ctx, [[0, 0], [10, 5], [18, 2], [30, 9], [40, 6], [55, 12]]);
    const vals = c.map((x, i) => 100 - x.c * 3 + Math.sin(i * 1.3) * 1.2);
    const mn = Math.min(...vals);
    const mx = Math.max(...vals);
    return {
      candles: c,
      pane: { values: vals, kind: 'line', min: mn - 2, max: mx + 2, label: 'DXY' },
      steps: [
        { s: { k: 'arrow', a: P(18, c[18].l), b: P(30, c[30].h), color: BULL, label: ctx.T('uptrend') }, cap: ctx.T('c_indicator'), w: 1.4 },
        { s: { k: 'arrow', a: P(18, vals[18], true), b: P(30, vals[30], true), color: BEAR, label: 'DXY ↓' }, w: 1.4 },
        { s: { k: 'label', at: P(2, c[30].h), text: ctx.T('inverse'), color: GOLD } },
      ],
    };
  },

  journal(ctx) {
    const c = walk(ctx, [[0, 0], [8, 4], [12, 2], [20, 7], [24, 5], [30, 3], [36, 8], [42, 6], [48, 9], [55, 11]]);
    const box = (i: number, rr: string, win: boolean): Step[] => [
      { s: { k: 'box', a: P(i, c[i].c), b: P(i + 5, c[i].c + (win ? 1.6 : -0.9)), color: win ? BULL : BEAR, label: `${win ? '✓' : '✗'} ${rr}` }, w: 1.1 },
    ];
    return {
      candles: c,
      steps: [
        { s: { k: 'label', at: P(2, c[48].h), text: `+2R · −1R · +1.5R = +2.5R`, color: GOLD }, cap: ctx.T('c_journal') },
        ...box(12, '+2R', true),
        ...box(30, '−1R', false),
        ...box(42, '+1.5R', true),
      ],
    };
  },

  // -------------------------------------------------------------- Elliott
  ew(ctx, v) {
    const anchors: [number, number][] =
      v === 'ext'
        ? [[0, 0], [7, 5], [11, 2.4], [15, 6], [17, 4.6], [24, 13], [26, 11.4], [29, 16], [34, 12], [44, 19], [48, 15.5], [55, 14]]
        : [[0, 0], [8, 6], [13, 2.8], [28, 16], [34, 11.5], [44, 19], [48, 15], [55, 13]];
    const c = walk(ctx, anchors, 0.28);
    const piv = v === 'ext' ? [0, 7, 11, 29, 34, 44] : [0, 8, 13, 28, 34, 44];
    const pts = piv.map((i, k) => P(i, k % 2 ? c[i].h : c[i].l));
    const steps: Step[] = [{ s: { k: 'path', pts, color: GOLD, labels: ['0', '1', '2', '3', '4', '5'] }, cap: ctx.T('c_waves'), w: 2.6 }];
    if (v === 'ext') {
      const sub = [11, 15, 17, 24, 26, 29];
      steps.push({ s: { k: 'path', pts: sub.map((i, k) => P(i, k % 2 ? c[i].h : c[i].l)), color: ACC, labels: ['', 'i', 'ii', 'iii', 'iv', 'v'], w: 1.2 }, w: 2 });
    }
    if (v === '') steps.push({ s: { k: 'label', at: P(2, c[piv[5]].h), text: ctx.T('impulse'), color: GOLD } }, { s: { k: 'ring', at: P(piv[3], c[piv[3]].h), color: ACC, label: '3' } });
    if (v === 'rules') {
      steps.push(
        { s: { k: 'hline', p: c[0].l, color: BEAR, dash: true, label: '2 > 0' } },
        { s: { k: 'hline', p: c[piv[1]].h, i0: piv[1], color: BLUE, dash: true, label: '4 > 1' } },
        { s: { k: 'label', at: P(2, c[44].h), text: '3 ≠ shortest', color: GOLD } },
      );
    }
    return { candles: c, steps };
  },

  ew_zigzag(ctx, v) {
    const flat = v === 'flat';
    const c = walk(ctx, flat ? [[0, 10], [10, 2], [18, 10.3], [28, 1.2], [36, 6], [55, 9]] : [[0, 14], [10, 4], [16, 10], [28, -1], [34, 2], [55, 8]], 0.28);
    const piv = flat ? [0, 10, 18, 28] : [0, 10, 16, 28];
    return {
      candles: c,
      steps: [
        { s: { k: 'path', pts: piv.map((i, k) => P(i, k % 2 ? c[i].l : c[i].h)), color: GOLD, labels: ['', 'A', 'B', 'C'] }, cap: ctx.T('c_waves'), w: 2.4 },
        { s: { k: 'label', at: P(2, c[0].h), text: flat ? 'Flat 3-3-5' : 'Zigzag 5-3-5', color: ACC } },
        { s: { k: 'ring', at: P(28, c[28].l), color: BULL, label: ctx.T('reaction'), below: true } },
      ],
    };
  },

  ew_tri(ctx) {
    const c = walk(ctx, [[0, 0], [6, 12], [14, 3], [22, 10], [29, 4.5], [35, 8.5], [40, 6], [44, 7.4], [48, 14], [55, 16]], 0.25);
    const piv = [6, 14, 22, 29, 35, 40];
    return {
      candles: c,
      n0: 42,
      steps: [
        { s: { k: 'path', pts: piv.map((i, k) => P(i, k % 2 ? c[i].l : c[i].h)), color: GOLD, labels: ['', 'A', 'B', 'C', 'D', 'E'] }, cap: ctx.T('c_waves'), w: 2.4 },
        { s: { k: 'line', a: P(6, c[6].h), b: P(42, lerp(c[22].h, c[35].h, (42 - 22) / 13)), color: BEAR } },
        { s: { k: 'line', a: P(14, c[14].l), b: P(42, lerp(c[14].l, c[29].l, (42 - 14) / 15)), color: BULL } },
        { reveal: 56, cap: ctx.T('c_result'), w: 1.4 },
      ],
    };
  },

  ew_fib(ctx) {
    const c = walk(ctx, [[0, 0], [8, 6], [13, 2.3], [28, 12], [34, 9], [44, 15], [55, 12]], 0.25);
    const w1 = c[8].h - c[0].l;
    const t = c[13].l + 1.618 * w1;
    return {
      candles: c,
      n0: 15,
      steps: [
        { s: { k: 'path', pts: [P(0, c[0].l), P(8, c[8].h), P(13, c[13].l)], color: GOLD, labels: ['0', '1', '2'] }, cap: ctx.T('c_waves'), w: 1.4 },
        { s: { k: 'fib', a: P(0, c[0].l), b: P(8, c[8].h), levels: [0.5, 0.618], color: GRAY }, cap: ctx.T('c_fib'), w: 1.5 },
        { s: { k: 'ring', at: P(13, c[13].l), color: BULL, label: '0.618', below: true } },
        { s: { k: 'hline', p: t, i0: 13, color: ACC, dash: true, label: '1.618 → 3' } },
        { reveal: 56, cap: ctx.T('c_result'), w: 1.8 },
      ],
    };
  },

  ew_invalid(ctx) {
    const c = walk(ctx, [[0, 0], [8, 6], [13, 2.4], [28, 13], [34, 10], [44, 16], [55, 14]], 0.28);
    return {
      candles: c,
      n0: 15,
      steps: [
        { s: { k: 'path', pts: [P(0, c[0].l), P(8, c[8].h), P(13, c[13].l)], color: GOLD, labels: ['0', '1', '2'] }, cap: ctx.T('c_waves'), w: 1.4 },
        { s: { k: 'hline', p: c[0].l, color: BEAR, dash: true, label: ctx.T('invalid') }, w: 1.2 },
        { reveal: 56, cap: ctx.T('c_result'), w: 2 },
        { s: { k: 'label', at: P(30, c[28].h), text: '3', color: GOLD } },
      ],
    };
  },

  ew_alt(ctx) {
    const c = walk(ctx, [[0, 0], [8, 6], [13, 2.8], [28, 14], [34, 10.5], [44, 16], [55, 12]], 0.28);
    const piv = [0, 8, 13, 28, 34, 44];
    const pts = piv.map((i, k) => P(i, k % 2 ? c[i].h : c[i].l));
    return {
      candles: c,
      steps: [
        { s: { k: 'path', pts, color: GOLD, labels: ['0', '1', '2', '3', '4', '5'] }, cap: ctx.T('c_waves'), w: 2 },
        { s: { k: 'path', pts: [pts[0], pts[3], pts[4], pts[5]], color: GRAY, dash: true, labels: ['', '(A)', '(B)', '(C)'] }, w: 1.8 },
        { s: { k: 'label', at: P(2, c[44].h), text: ctx.T('alt'), color: GRAY } },
      ],
    };
  },

  ew_trade(ctx) {
    const c = walk(ctx, [[0, 0], [8, 6], [13, 2.4], [15, 3.4], [28, 13], [34, 10], [44, 16], [55, 14]], 0.25);
    const w1 = c[8].h - c[0].l;
    return {
      candles: c,
      n0: 16,
      steps: [
        { s: { k: 'path', pts: [P(0, c[0].l), P(8, c[8].h), P(13, c[13].l)], color: GOLD, labels: ['0', '1', '2'] }, cap: ctx.T('c_waves'), w: 1.4 },
        { s: { k: 'hline', p: c[13].l + 1.618 * w1, i0: 13, color: ACC, dash: true, label: '1.618' } },
        ...positionSteps(ctx, c, 15, c[15].c, c[0].l - 0.3, 2, 32),
      ],
    };
  },

  // -------------------------------------------------------------- Gann
  gann_fan(ctx, v) {
    const c = walk(ctx, [[0, 4], [10, 0], [22, 5], [30, 8.2], [36, 7], [44, 8.6], [55, 9.6]]);
    const piv = loIdx(c, 7, 13);
    const s = 0.38;
    const cap = Math.max(...c.map((x) => x.h)) + 1.5;
    const L = (m: number, lab: string, col: string): Step => {
      const end = Math.min(55, piv + (cap - c[piv].l) / (s * m));
      return { s: { k: 'line', a: P(piv, c[piv].l), b: P(end, c[piv].l + s * m * (end - piv)), color: col, label: lab, w: m === 1 ? 2 : 1.2 }, w: 1.1 };
    };
    const steps: Step[] = [{ s: { k: 'ring', at: P(piv, c[piv].l), color: GOLD, below: true }, cap: ctx.T('c_fan') }, L(1, '1×1 · 45°', GOLD)];
    if (v !== '1x1') steps.push(L(2, '2×1', BULL), L(0.5, '1×2', BLUE), L(4, '4×1', GRAY), L(0.25, '1×4', GRAY));
    steps.push({ s: { k: 'ring', at: P(36, c[36].l), color: ACC, label: ctx.T('touch'), below: true } });
    return { candles: c, steps };
  },

  gann_sq9(ctx) {
    const c = walk(ctx, [[0, -3], [10, 4], [18, -1], [30, 6], [40, 1], [55, 5]]);
    // Square of 9 on the price (scaled to whole numbers): each 45° adds 0.125 to the square root.
    const sym = ctx.sym;
    const scale = sym.pip < 0.001 ? 10000 : sym.pip < 0.05 ? 100 : 1;
    const root = Math.sqrt(sym.B * scale);
    const toUnits = (price: number) => (price - sym.B) / ctx.u;
    const steps: Step[] = [{ s: { k: 'label', at: P(2, 7), text: `√${Math.round(sym.B * scale)} = ${root.toFixed(2)}`, color: GOLD }, cap: ctx.T('c_levels') }];
    for (const k of [-2, -1, 1, 2]) {
      const price = Math.pow(root + k * 0.125, 2) / scale;
      steps.push({ s: { k: 'hline', p: toUnits(price), color: k > 0 ? BEAR : BULL, dash: true, label: `${k * 45 > 0 ? '+' : ''}${k * 45}°` } });
    }
    steps.push({ s: { k: 'hline', p: 0, color: GOLD, label: '0°' } }, { s: { k: 'ring', at: P(30, c[30].h), color: ACC, label: ctx.T('touch') } });
    return { candles: c, steps };
  },

  gann_cycles(ctx) {
    const c = walk(ctx, [[0, 4], [6, 0], [13, 6], [19, 1], [26, 7], [32, 2], [39, 8], [45, 3], [52, 9], [55, 7]]);
    const lows = [6, 19, 32, 45];
    return {
      candles: c,
      n0: 33,
      steps: [
        { s: { k: 'vline', i: 6, color: GOLD, label: 'T0' }, cap: ctx.T('c_cycles') },
        { s: { k: 'ruler', a: P(6, c[6].l - 0.5), b: P(19, c[6].l - 0.5), text: '13' }, w: 1.4 },
        { s: { k: 'vline', i: 19, color: GOLD, label: 'T+13' } },
        { s: { k: 'vline', i: 32, color: GOLD, label: 'T+26' } },
        { s: { k: 'vline', i: 45, color: ACC, label: 'T+39' } },
        { reveal: 56, cap: ctx.T('c_result'), w: 1.6 },
        { s: { k: 'ring', at: P(45, c[lows[3]].l), color: BULL, label: ctx.T('reaction'), below: true } },
      ],
    };
  },

  gann_balance(ctx) {
    const c = walk(ctx, [[0, 3], [8, 0], [20, 5], [26, 4], [34, 8], [55, 12]]);
    const s = 0.38;
    return {
      candles: c,
      steps: [
        { s: { k: 'ring', at: P(8, c[8].l), color: GOLD, below: true }, cap: ctx.T('c_fan') },
        { s: { k: 'box', a: P(8, c[8].l), b: P(28, c[8].l + s * 20), color: GOLD, label: ctx.T('priceTime') }, w: 1.6 },
        { s: { k: 'line', a: P(8, c[8].l), b: P(28, c[8].l + s * 20), color: ACC, label: '45°', w: 2 } },
      ],
    };
  },

  // -------------------------------------------------------------- Wyckoff
  wy(ctx, v) {
    const dist = v === 'dist' || v === 'utad';
    const c = walk(ctx, [[0, 15], [6, 9], [10, 6], [12, 7], [14, 0], [19, 8], [25, 1], [30, 6], [33, 3], [36, -1.6], [39, 0.8], [45, 10], [48, 6.5], [55, 14]], 0.3);
    const vol = c.map((_, i) => 30 + ((i * 37) % 17) + (i === 14 ? 70 : i === 45 ? 60 : i === 36 ? 35 : i === 10 ? 30 : 0));
    const names = dist ? ['PSY', 'BC', 'AR', 'ST', 'UTAD', 'SOW', 'LPSY'] : ['PS', 'SC', 'AR', 'ST', 'Spring', 'SOS', 'LPS'];
    const at = (i: number, low: boolean, k: number, col = GOLD): Step => ({ s: { k: 'ring', at: P(i, low ? c[i].l : c[i].h), color: col, label: names[k], below: low } });
    const steps: Step[] = [];
    if (v === 'spring' || v === 'utad') steps.push({ view: [24, 50], w: 1 });
    steps.push(
      at(10, true, 0),
      at(14, true, 1, BEAR),
      at(19, false, 2),
      at(25, true, 3),
      { s: { k: 'box', a: P(14, c[14].l), b: P(44, c[19].h), color: BLUE, label: ctx.T('range') }, cap: ctx.T('c_zone'), w: 1.2 },
      { reveal: 41, w: 1.2 },
      at(36, true, 4, BULL),
      { reveal: 56, cap: ctx.T('c_result'), w: 1.4 },
      at(45, false, 5, ACC),
      at(48, true, 6),
    );
    steps[0].cap = ctx.T('c_phases');
    return { candles: c, n0: 34, steps, pane: { values: vol, kind: 'hist', min: 0, max: 110, label: 'Volume' } };
  },

  wy_effort(ctx) {
    const c = walk(ctx, [[0, 0], [12, 6], [20, 8], [26, 9], [28, 9.2], [34, 6], [44, 2], [55, 0]]);
    setCandle(c, 27, 9.0, 9.3, 0.25);
    const vol = c.map((_, i) => 25 + ((i * 29) % 19) + (i === 27 ? 85 : 0));
    return {
      candles: c,
      n0: 30,
      pane: { values: vol, kind: 'hist', min: 0, max: 120, label: 'Volume' },
      steps: [
        { s: { k: 'ring', at: P(27, vol[27], true), color: GOLD, label: 'Volume ↑' }, cap: ctx.T('c_volume'), w: 1.3 },
        { s: { k: 'ring', at: P(27, c[27].h), color: BEAR, label: ctx.T('effort') }, w: 1.3 },
        { reveal: 56, cap: ctx.T('c_result'), w: 2 },
      ],
    };
  },

  // -------------------------------------------------------------- SK
  sk_zone(ctx, v) {
    const c = walk(ctx, [[0, 8], [10, 3], [13, 2.6], [16, 2.9], [18, 2.5], [20, 7], [22, 10], [30, 12], [38, 4.4], [40, 3.6], [42, 6], [55, 12]], 0.22);
    for (const i of [13, 14, 15, 16, 17, 18]) c[i] = { o: 2.6 + (i % 2) * 0.25, c: 2.85 - (i % 2) * 0.25, h: 3.2, l: 2.3 };
    c[19].o = c[18].c;
    wickTo(c, 40, 3.0);
    const steps: Step[] = [
      { s: { k: 'box', a: P(13, 2.3), b: P(55, 3.2), color: BLUE, label: ctx.T('base') }, cap: ctx.T('c_zone'), w: 1.4 },
      { s: { k: 'arrow', a: P(18, 3.2), b: P(22, c[22].h), color: BULL, label: ctx.T('departure') } },
      { reveal: 56, cap: ctx.T('c_watch'), w: 1.8 },
      { s: { k: 'ring', at: P(40, c[40].l), color: GOLD, label: ctx.T('firstTouch'), below: true } },
    ];
    if (v === 'base') steps.unshift({ view: [8, 26], w: 1 }, { view: [-0.5, 61], w: 0.6 });
    return { candles: c, n0: 30, steps };
  },

  sk_manage(ctx) {
    const c = walk(ctx, [[0, 0], [10, 6], [16, 3], [18, 2.8], [26, 7], [30, 6], [38, 11], [42, 9.5], [55, 15]]);
    const ie = 18;
    const entry = c[ie].c;
    const sl = c[loIdx(c, 14, 18)].l - 0.5;
    const r = entry - sl;
    return {
      candles: c,
      n0: 19,
      steps: [
        { s: { k: 'ring', at: P(ie, entry), color: ACC, label: ctx.T('entry') }, cap: ctx.T('c_entry') },
        { s: { k: 'hline', p: sl, i0: ie, color: BEAR, label: 'SL', dash: true } },
        { s: { k: 'hline', p: entry + r, i0: ie, color: BULL, label: 'TP1', dash: true } },
        { s: { k: 'hline', p: entry + 2.5 * r, i0: ie, color: BULL, label: 'TP2', dash: true } },
        { reveal: 31, cap: ctx.T('c_manage'), w: 1.5 },
        { s: { k: 'hline', p: entry, i0: 26, color: GOLD, label: 'SL → BE' } },
        { reveal: 56, w: 1.5 },
        { s: { k: 'path', pts: [P(30, c[30].l - 0.3), P(36, c[30].l - 0.3), P(36, c[42].l - 0.3), P(48, c[42].l - 0.3)], color: PURP, labels: [], w: 1.6 }, cap: ctx.T('trail') },
      ],
    };
  },
};

/** Scene id → builder + variant + whether it is the mirrored (bearish) picture. */
const ALIAS: Record<string, [string, string, boolean?]> = {
  overview: ['overview', ''],
  checklist: ['checklist', ''],
  pips: ['pips', ''],
  pipvalue: ['pips', 'value'],
  position: ['position', ''],
  lot: ['position', 'lot'],
  margin: ['position', 'margin'],
  candle: ['candle', ''],
  sd: ['sd', ''],
  trend: ['trend', ''],
  trendline: ['trend', 'line'],
  trend_down: ['trend', '', true],
  tlbreak: ['tlbreak', ''],
  sr: ['sr', ''],
  sr_retest: ['sr', 'retest'],
  ema: ['ema', ''],
  rsi: ['rsi', ''],
  macd: ['rsi', 'macd'],
  hs: ['hs', ''],
  triangle: ['triangle', ''],
  flag: ['flag', ''],
  plan: ['plan', ''],
  chase: ['chase', ''],
  fakeout: ['fakeout', ''],
  liquidity: ['liquidity', ''],
  liq_stops: ['liquidity', 'stops'],
  idm: ['liquidity', 'idm'],
  sessions: ['sessions', ''],
  ob: ['ob', ''],
  ob_bear: ['ob', '', true],
  ob_refine: ['ob', 'refine'],
  ob_entry: ['ob', 'entry'],
  fvg: ['fvg', ''],
  fvg_partial: ['fvg', 'partial'],
  fvg_filter: ['fvg', 'filter'],
  bos: ['bos', ''],
  choch: ['choch', ''],
  pd: ['pd', ''],
  pd_ote: ['pd', 'ote'],
  dxy: ['dxy', ''],
  journal: ['journal', ''],
  ew: ['ew', ''],
  ew_rules: ['ew', 'rules'],
  ew_ext: ['ew', 'ext'],
  ew_zigzag: ['ew_zigzag', ''],
  ew_flat: ['ew_zigzag', 'flat'],
  ew_tri: ['ew_tri', ''],
  ew_fib: ['ew_fib', ''],
  ew_invalid: ['ew_invalid', ''],
  ew_alt: ['ew_alt', ''],
  ew_trade: ['ew_trade', ''],
  gann_fan: ['gann_fan', ''],
  gann_1x1: ['gann_fan', '1x1'],
  gann_sq9: ['gann_sq9', ''],
  gann_cycles: ['gann_cycles', ''],
  gann_balance: ['gann_balance', ''],
  wy_accum: ['wy', 'accum'],
  wy_spring: ['wy', 'spring'],
  wy_dist: ['wy', 'dist', true],
  wy_utad: ['wy', 'utad', true],
  wy_effort: ['wy_effort', ''],
  sk_zone: ['sk_zone', ''],
  sk_base: ['sk_zone', 'base'],
  sk_touch: ['sk_zone', 'touch'],
  sk_manage: ['sk_manage', ''],
};

/** What is drawn for each part of each lesson (same order as the lesson's parts, every language). */
export const LESSON_SCENES: Record<string, string[]> = {
  'basics-l1-01': ['pips', 'pips', 'pipvalue', 'pipvalue', 'chase', 'position'],
  'basics-l1-02': ['lot', 'lot', 'lot', 'lot@EURUSD', 'lot@XAUUSD', 'chase', 'position'],
  'basics-l1-03': ['margin', 'margin', 'margin', 'margin', 'margin@XAUUSD', 'chase', 'position'],
  'basics-l1-04': ['position', 'position', 'position', 'lot', 'position', 'chase', 'checklist'],
  'basics-l1-05': ['overview', 'overview', 'checklist', 'checklist', 'journal', 'chase', 'checklist'],
  'classic-l1-01': ['overview', 'overview', 'sd', 'candle', 'sd', 'fakeout', 'checklist'],
  'classic-l1-02': ['trend', 'trend', 'trendline', 'trend_down', 'tlbreak', 'checklist'],
  'classic-l1-03': ['sr', 'sr', 'sr', 'sr_retest', 'sr', 'fakeout', 'checklist'],
  'classic-l2-01': ['ema', 'ema', 'ema', 'ema', 'ema', 'chase', 'checklist'],
  'classic-l2-02': ['rsi', 'rsi', 'macd', 'rsi', 'rsi@XAUUSD', 'chase', 'checklist'],
  'classic-l2-03': ['hs', 'hs', 'triangle', 'flag', 'hs', 'fakeout', 'checklist'],
  'classic-l3-01': ['plan', 'plan', 'trend', 'plan', 'position', 'plan', 'journal'],
  'classic-l3-02': ['chase', 'chase', 'chase', 'fakeout', 'fakeout', 'position', 'checklist'],
  'ew-l1-01': ['ew', 'ew_rules', 'ew', 'ew_ext', 'ew@EURUSD', 'ew_rules', 'ew_invalid'],
  'ew-l1-02': ['ew_zigzag', 'ew_zigzag', 'ew_flat', 'ew_tri', 'ew_zigzag@GBPUSD', 'ew_flat', 'ew_zigzag'],
  'ew-l2-01': ['ew_fib', 'ew_fib', 'ew_ext', 'ew_fib@XAUUSD', 'ew_rules', 'ew_fib'],
  'ew-l3-01': ['ew_alt', 'ew', 'ew_alt', 'ew_invalid', 'ew_alt@USDJPY', 'ew_rules', 'ew_invalid'],
  'ew-l4-01': ['ew_fib', 'ew', 'liquidity', 'ew_fib@XAUUSD', 'ew_rules', 'ew_trade'],
  'ew-l5-01': ['ew_trade', 'ew_trade', 'ew_invalid', 'ew_fib', 'ew_trade@EURUSD', 'chase', 'ew_trade'],
  'gann-l1-01': ['gann_fan', 'gann_balance', 'gann_cycles', 'gann_fan', 'gann_fan@EURUSD', 'gann_sq9'],
  'gann-l2-01': ['gann_sq9', 'gann_sq9', 'gann_sq9', 'gann_sq9@XAUUSD', 'gann_sq9@EURUSD', 'gann_sq9'],
  'gann-l2-02': ['gann_fan', 'gann_1x1', 'gann_fan', 'gann_fan', 'gann_fan@USDJPY', 'gann_fan'],
  'gann-l3-01': ['gann_fan', 'gann_sq9', 'plan', 'gann_fan@EURUSD', 'sk_manage', 'fakeout'],
  'gann-l4-01': ['gann_cycles', 'gann_cycles', 'gann_cycles@EURUSD', 'gann_cycles@XAUUSD', 'fakeout', 'gann_cycles'],
  'smc-l1-01': ['liquidity', 'liq_stops', 'liquidity', 'idm', 'liquidity@EURUSD', 'fakeout', 'liquidity'],
  'smc-l1-02': ['sessions', 'sessions', 'sessions', 'sessions', 'sessions@XAUUSD', 'chase', 'sessions'],
  'smc-l2-01': ['ob', 'ob_bear', 'ob_refine', 'ob_entry', 'ob_entry@GBPUSD', 'fakeout', 'ob'],
  'smc-l2-02': ['fvg', 'fvg', 'fvg_partial', 'fvg_filter', 'fvg@USDJPY', 'chase', 'fvg'],
  'smc-l2-03': ['bos', 'trend', 'bos', 'choch', 'ob', 'choch@EURUSD', 'fakeout', 'bos'],
  'smc-l3-01': ['liquidity', 'fakeout', 'choch', 'ob_entry', 'liquidity@GBPUSD', 'chase', 'liquidity'],
  'smc-l3-02': ['pd', 'pd', 'pd', 'pd_ote', 'pd@XAUUSD', 'chase', 'pd'],
  'smc-l4-01': ['dxy', 'dxy', 'dxy', 'dxy', 'plan', 'dxy', 'chase', 'checklist'],
  'smc-l5-01': ['journal', 'position', 'journal', 'journal', 'journal', 'journal', 'chase', 'checklist'],
  'sk-l1-01': ['sk_zone', 'overview', 'plan', 'sk_zone', 'sk_zone@EURUSD', 'chase', 'checklist'],
  'sk-l2-01': ['sk_zone', 'sk_base', 'sk_zone', 'sk_zone', 'sk_zone@GBPUSD', 'fakeout', 'sk_zone'],
  'sk-l2-02': ['sk_zone', 'sk_touch', 'plan', 'sk_touch', 'sk_touch@XAUUSD', 'chase', 'sk_zone'],
  'sk-l3-01': ['sk_manage', 'sk_manage', 'sk_manage', 'sk_manage', 'sk_manage@USDJPY', 'chase', 'sk_manage'],
  'sk-l4-01': ['checklist', 'sessions', 'sessions', 'sessions', 'plan@EURUSD', 'journal', 'chase', 'checklist'],
  'wy-l1-01': ['wy_accum', 'wy_effort', 'wy_accum', 'wy_effort', 'wy_accum@EURUSD', 'fakeout', 'wy_accum'],
  'wy-l1-02': ['wy_accum', 'wy_accum', 'wy_accum', 'wy_spring', 'wy_accum@XAUUSD', 'fakeout', 'wy_accum'],
  'wy-l2-01': ['wy_dist', 'wy_dist', 'wy_dist', 'wy_utad', 'wy_dist@GBPUSD', 'fakeout', 'wy_dist'],
  'wy-l2-02': ['fakeout', 'liquidity', 'tlbreak', 'wy_spring', 'wy_spring@USDJPY', 'wy_utad@EURUSD', 'fakeout', 'wy_accum'],
  'wy-l3-01': ['wy_effort', 'wy_effort', 'candle', 'trend', 'wy_effort@GBPUSD', 'fakeout', 'wy_effort'],
  'wy-l4-01': ['dxy@XAUUSD', 'trend', 'dxy@XAUUSD', 'sessions@XAUUSD', 'plan@XAUUSD', 'position@XAUUSD', 'chase', 'checklist'],
};

const SCHOOL_FALLBACK: Record<string, string[]> = {
  basics: ['position', 'pips', 'lot', 'checklist'],
  classic: ['trend', 'sr', 'hs', 'checklist'],
  elliott: ['ew', 'ew_fib', 'ew_zigzag', 'ew_trade'],
  gann: ['gann_fan', 'gann_sq9', 'gann_cycles'],
  'ict-smc': ['liquidity', 'ob', 'fvg', 'choch', 'pd'],
  sk: ['sk_zone', 'sk_manage', 'plan'],
  wyckoff: ['wy_accum', 'wy_dist', 'wy_effort'],
};

export function sceneIdFor(schoolId: string, lectureId: string, index: number): string {
  const list = LESSON_SCENES[lectureId];
  if (list && list[index]) return list[index];
  const fb = SCHOOL_FALLBACK[schoolId] ?? ['overview', 'position', 'checklist'];
  return fb[index % fb.length];
}

const translate = (lang: Lang) => (k: string) => {
  const w = W[k];
  if (!w) return k;
  return lang === 'ar' ? w[0] : w[1];
};

/** Build the scene for one lesson part. Deterministic: the same part always draws the same picture. */
export function buildScene(schoolId: string, lectureId: string, index: number, lang: Lang): Scene {
  const full = sceneIdFor(schoolId, lectureId, index);
  const [name, symOverride] = full.split('@');
  const [builder, variant, mirror] = ALIAS[name] ?? ['overview', ''];
  const symbol = symOverride || SCHOOL_SYMBOL[schoolId] || 'EURUSD';
  const sym = SYMS[symbol] ?? SYMS.EURUSD;
  const ctx: Ctx = { rng: rngOf(hash(`${lectureId}#${index}#${full}`)), T: translate(lang), sym, u: sym.B * 0.0012, N: 56, mirror: !!mirror };
  const b = S[builder](ctx, variant);
  // units → prices (mirror flips the picture for the bearish versions)
  const sgn = mirror ? -1 : 1;
  const px = (v: number) => sym.B + sgn * v * ctx.u;
  const pt = (q: Pt): Pt => (q.pane ? q : { ...q, p: px(q.p) });
  const candles = b.candles.map((k) => (mirror ? { o: px(k.o), c: px(k.c), h: px(k.l), l: px(k.h) } : { o: px(k.o), c: px(k.c), h: px(k.h), l: px(k.l) }));
  const mapShape = (s: Shape): Shape => {
    switch (s.k) {
      case 'line':
      case 'box':
      case 'arrow':
      case 'ruler':
      case 'fib':
        return { ...s, a: pt(s.a), b: pt(s.b) } as Shape;
      case 'path':
        return { ...s, pts: s.pts.map(pt) };
      case 'label':
      case 'ring':
        return { ...s, at: pt(s.at), below: mirror && !s.at.pane ? !s.below : s.below } as Shape;
      case 'hline':
        return { ...s, p: px(s.p) };
      default:
        return s;
    }
  };
  const steps = b.steps.map((st) => (st.s ? { ...st, s: mapShape(st.s) } : st));
  return {
    id: full,
    symbol,
    dec: sym.dec,
    candles,
    n0: b.n0 ?? candles.length,
    steps,
    pane: b.pane ? { label: '', color: GOLD, ...b.pane } : undefined,
    view: b.view ?? [-0.5, ctx.N + 5],
  };
}

// ------------------------------------------------------------------ timeline
const T0 = 0.04;
const T1 = 0.93;
const APPROACH = 0.32;

type Win = { t0: number; t1: number; ta: number };
function windows(sc: Scene): Win[] {
  const total = sc.steps.reduce((a, s) => a + (s.w ?? 1), 0) || 1;
  let t = T0;
  return sc.steps.map((s) => {
    const d = ((s.w ?? 1) / total) * (T1 - T0);
    const w = { t0: t, t1: t + d, ta: t + d * APPROACH };
    t += d;
    return w;
  });
}

function startOf(s: Shape, sc: Scene, n: number): Pt {
  switch (s.k) {
    case 'line':
    case 'box':
    case 'arrow':
    case 'ruler':
    case 'fib':
      return s.a;
    case 'path':
      return s.pts[0];
    case 'label':
    case 'ring':
      return s.at;
    case 'vline':
      return { i: s.i, p: midPrice(sc, n) };
    case 'hline':
      return { i: s.i0 ?? Math.max(0, n - 18), p: s.p };
    case 'band':
      return { i: s.i0, p: topPrice(sc, n) };
  }
}

function tipOf(s: Shape, q: number, sc: Scene, n: number): Pt {
  switch (s.k) {
    case 'line':
    case 'box':
    case 'arrow':
    case 'ruler':
    case 'fib':
      return { i: lerp(s.a.i, s.b.i, q), p: lerp(s.a.p, s.b.p, q), pane: s.b.pane };
    case 'path': {
      const segs = s.pts.length - 1;
      if (segs <= 0) return s.pts[0];
      const f = q * segs;
      const k = Math.min(segs - 1, Math.floor(f));
      const r = f - k;
      return { i: lerp(s.pts[k].i, s.pts[k + 1].i, r), p: lerp(s.pts[k].p, s.pts[k + 1].p, r), pane: s.pts[k].pane };
    }
    case 'hline':
      return { i: lerp(s.i0 ?? Math.max(0, n - 18), n + 2, q), p: s.p };
    case 'band':
      return { i: lerp(s.i0, s.i1, q), p: topPrice(sc, n) };
    default:
      return startOf(s, sc, n);
  }
}

const DRAG = new Set(['line', 'box', 'arrow', 'ruler', 'fib', 'path', 'hline', 'band']);

function midPrice(sc: Scene, n: number) {
  const vis = sc.candles.slice(0, Math.max(1, n));
  return (Math.max(...vis.map((c) => c.h)) + Math.min(...vis.map((c) => c.l))) / 2;
}
function topPrice(sc: Scene, n: number) {
  return Math.max(...sc.candles.slice(0, Math.max(1, n)).map((c) => c.h));
}

/** Where everything is at time p (0 → 1) of the narration of this part. */
export function frameAt(sc: Scene, pIn: number): Frame {
  const p = clamp(pIn);
  const wins = windows(sc);
  let n = sc.n0;
  let view: [number, number] = sc.view;
  const shapes: { s: Shape; q: number }[] = [];
  let cursor: Pt = { i: sc.n0 - 4, p: midPrice(sc, sc.n0) };
  let down = false;
  let click = 0;
  let caption = '';
  for (let k = 0; k < sc.steps.length; k++) {
    const st = sc.steps[k];
    const w = wins[k];
    if (p < w.t0) break;
    if (st.cap) caption = st.cap;
    if (st.reveal !== undefined) {
      const from = n;
      const q = clamp((p - w.t0) / (w.t1 - w.t0));
      n = Math.round(lerp(from, st.reveal, ease(q)));
      const last = sc.candles[Math.max(0, n - 1)];
      const target = { i: n + 1.5, p: last.c };
      cursor = { i: lerp(cursor.i, target.i, ease(clamp(q * 3))), p: lerp(cursor.p, target.p, ease(clamp(q * 3))) };
    }
    if (st.view) {
      const from = view;
      const q = ease(clamp((p - w.t0) / (w.t1 - w.t0)));
      view = [lerp(from[0], st.view[0], q), lerp(from[1], st.view[1], q)];
    }
    if (st.s) {
      const start = startOf(st.s, sc, n);
      if (p < w.ta) {
        const q = ease(clamp((p - w.t0) / (w.ta - w.t0)));
        if (start.pane !== cursor.pane) cursor = { ...start };
        else cursor = { i: lerp(cursor.i, start.i, q), p: lerp(cursor.p, start.p, q), pane: start.pane };
        break;
      }
      const q = clamp((p - w.ta) / ((w.t1 - w.ta) * 0.85));
      shapes.push({ s: st.s, q });
      cursor = tipOf(st.s, q, sc, n);
      const drawing = p < w.t1;
      down = drawing && DRAG.has(st.s.k) && q < 1;
      click = drawing && !DRAG.has(st.s.k) ? clamp(q * 1.6) : 0;
      if (DRAG.has(st.s.k) && q < 0.18 && drawing) click = clamp(q / 0.18);
    }
  }
  return { n: Math.max(1, Math.min(sc.candles.length, n)), view, shapes, cursor: { ...cursor, down, click }, caption };
}

/** Narration length estimate when the real audio length is unknown (seconds at 1×). */
export function estimateSeconds(text: string): number {
  const words = (text || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(8, words / 2.3);
}

// ------------------------------------------------------------------ drawing → primitive operations
export type Op =
  | { t: 'rect'; x: number; y: number; w: number; h: number; fill?: string; fo?: number; stroke?: string; sw?: number; dash?: boolean; r?: number; o?: number }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: string; sw: number; dash?: boolean; o?: number }
  | { t: 'poly'; pts: [number, number][]; stroke?: string; sw?: number; fill?: string; dash?: boolean; o?: number; closed?: boolean }
  | { t: 'text'; x: number; y: number; text: string; fill: string; size: number; anchor: 'start' | 'middle' | 'end'; bold?: boolean; o?: number; bg?: string }
  | { t: 'circle'; cx: number; cy: number; r: number; stroke?: string; fill?: string; sw?: number; o?: number };

const fmtPrice = (v: number, dec: number) => v.toFixed(Math.max(0, dec - 1));
const textW = (s: string, size: number) => s.length * size * 0.56 + 8;

export function drawOps(sc: Scene, f: Frame, Wpx: number, Hpx: number): Op[] {
  const ops: Op[] = [];
  const axisW = 52;
  const paneH = sc.pane ? Math.round(Hpx * 0.24) : 0;
  const top = 8;
  const chartH = Hpx - top - (paneH ? paneH + 10 : 8);
  const plotW = Wpx - axisW;
  const [v0, v1] = f.view;
  const X = (i: number) => ((i - v0) / (v1 - v0)) * plotW;
  // price range: candles in view (all of them, so playing forward never rescales) + drawn shapes
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = Math.max(0, Math.floor(v0)); i < Math.min(sc.candles.length, Math.ceil(v1)); i++) {
    lo = Math.min(lo, sc.candles[i].l);
    hi = Math.max(hi, sc.candles[i].h);
  }
  const fullView = v1 - v0 > 40;
  if (fullView)
    for (const st of sc.steps) {
      const s = st.s;
      if (!s) continue;
      const ps: number[] = [];
      if (s.k === 'hline') ps.push(s.p);
      if ((s.k === 'box' || s.k === 'line' || s.k === 'arrow' || s.k === 'ruler' || s.k === 'fib') && !s.a.pane) ps.push(s.a.p, s.b.p);
      for (const v of ps) {
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    }
  const padP = (hi - lo) * 0.1 || 1;
  lo -= padP;
  hi += padP;
  const Y = (p: number) => top + ((hi - p) / (hi - lo)) * chartH;
  const paneTop = top + chartH + 10;
  const PY = (v: number) => {
    const pn = sc.pane!;
    return paneTop + ((pn.max - v) / (pn.max - pn.min || 1)) * (paneH - 4);
  };
  const XY = (q: Pt): [number, number] => [X(q.i), q.pane && sc.pane ? PY(q.p) : Y(q.p)];

  // grid + price axis
  const step = niceStep((hi - lo) / 5);
  for (let v = Math.ceil(lo / step) * step; v < hi; v += step) {
    const y = Y(v);
    ops.push({ t: 'line', x1: 0, y1: y, x2: plotW, y2: y, stroke: '#1E293B', sw: 1 });
    ops.push({ t: 'text', x: Wpx - 4, y: y + 3.5, text: fmtPrice(v, sc.dec), fill: '#64748B', size: 9.5, anchor: 'end' });
  }
  ops.push({ t: 'line', x1: plotW, y1: top, x2: plotW, y2: top + chartH, stroke: '#243049', sw: 1 });
  if (sc.pane) {
    ops.push({ t: 'line', x1: 0, y1: paneTop - 5, x2: Wpx, y2: paneTop - 5, stroke: '#243049', sw: 1 });
    ops.push({ t: 'text', x: 4, y: paneTop + 9, text: sc.pane.label, fill: '#64748B', size: 9, anchor: 'start' });
    for (const g of sc.pane.guides ?? []) {
      const y = PY(g);
      ops.push({ t: 'line', x1: 0, y1: y, x2: plotW, y2: y, stroke: '#334155', sw: 1, dash: true });
      ops.push({ t: 'text', x: Wpx - 4, y: y + 3.5, text: String(g), fill: '#64748B', size: 9, anchor: 'end' });
    }
  }

  // candles
  const cw = Math.max(1.5, (plotW / (v1 - v0)) * 0.64);
  for (let i = 0; i < f.n; i++) {
    const x = X(i);
    if (x < -cw || x > plotW) continue;
    const k = sc.candles[i];
    const col = k.c >= k.o ? BULL : BEAR;
    ops.push({ t: 'line', x1: x, y1: Y(k.h), x2: x, y2: Y(k.l), stroke: col, sw: 1 });
    const y1 = Y(Math.max(k.o, k.c));
    const y2 = Y(Math.min(k.o, k.c));
    ops.push({ t: 'rect', x: x - cw / 2, y: y1, w: cw, h: Math.max(1, y2 - y1), fill: col });
  }
  // pane values
  if (sc.pane) {
    const pn = sc.pane;
    if (pn.kind === 'hist') {
      const base = PY(Math.max(pn.min, Math.min(pn.max, 0)));
      for (let i = 0; i < f.n; i++) {
        const x = X(i);
        if (x < 0 || x > plotW) continue;
        const y = PY(pn.values[i]);
        const c = sc.candles[i];
        ops.push({ t: 'rect', x: x - cw / 2, y: Math.min(y, base), w: cw, h: Math.max(1, Math.abs(base - y)), fill: pn.min < 0 ? (pn.values[i] >= 0 ? BULL : BEAR) : c.c >= c.o ? BULL : BEAR, o: 0.55 });
      }
    } else {
      ops.push({ t: 'poly', pts: pn.values.slice(0, f.n).map((v, i) => [X(i), PY(v)] as [number, number]), stroke: pn.color, sw: 1.4 });
    }
  }
  // last price tag
  const last = sc.candles[f.n - 1];
  const ly = Y(last.c);
  ops.push({ t: 'line', x1: 0, y1: ly, x2: plotW, y2: ly, stroke: last.c >= last.o ? BULL : BEAR, sw: 1, dash: true, o: 0.5 });
  ops.push({ t: 'rect', x: plotW + 1, y: ly - 8, w: axisW - 2, h: 16, fill: last.c >= last.o ? BULL : BEAR, r: 3 });
  ops.push({ t: 'text', x: Wpx - 4, y: ly + 3.5, text: fmtPrice(last.c, sc.dec), fill: '#04121A', size: 9.5, anchor: 'end', bold: true });

  // drawings
  const label = (x: number, y: number, text: string, col: string, o = 1, anchor: 'start' | 'middle' | 'end' = 'start') => {
    const size = 10.5;
    const w = textW(text, size);
    let lx = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
    lx = Math.max(2, Math.min(plotW - w - 2, lx));
    const ly2 = Math.max(top + 2, Math.min(Hpx - 16, y - 8));
    ops.push({ t: 'rect', x: lx, y: ly2, w, h: 16, fill: '#0B1220', fo: 0.88, stroke: col, sw: 1, r: 4, o });
    ops.push({ t: 'text', x: lx + w / 2, y: ly2 + 11.5, text, fill: col, size, anchor: 'middle', bold: true, o });
  };
  for (const { s, q } of f.shapes) {
    const appear = clamp(q * 2.5);
    switch (s.k) {
      case 'line': {
        const [x1, y1] = XY(s.a);
        const [x2b, y2b] = XY(s.b);
        const x2 = lerp(x1, x2b, q);
        const y2 = lerp(y1, y2b, q);
        ops.push({ t: 'line', x1, y1, x2, y2, stroke: s.color, sw: s.w ?? 1.6, dash: s.dash });
        if (s.label && q > 0.7) label(x2b, y2b - 4, s.label, s.color, clamp((q - 0.7) / 0.3), 'end');
        break;
      }
      case 'arrow': {
        const [x1, y1] = XY(s.a);
        const [x2b, y2b] = XY(s.b);
        const x2 = lerp(x1, x2b, q);
        const y2 = lerp(y1, y2b, q);
        ops.push({ t: 'line', x1, y1, x2, y2, stroke: s.color, sw: 2.2 });
        const ang = Math.atan2(y2 - y1, x2 - x1);
        const hd = 8;
        if (q > 0.15)
          ops.push({ t: 'poly', pts: [[x2, y2], [x2 - hd * Math.cos(ang - 0.45), y2 - hd * Math.sin(ang - 0.45)], [x2 - hd * Math.cos(ang + 0.45), y2 - hd * Math.sin(ang + 0.45)]], fill: s.color, closed: true });
        if (s.label && q > 0.7) label((x1 + x2b) / 2, (y1 + y2b) / 2 - 12, s.label, s.color, clamp((q - 0.7) / 0.3), 'middle');
        break;
      }
      case 'box': {
        const [x1, y1] = XY(s.a);
        const [x2b, y2b] = XY(s.b);
        const x2 = lerp(x1, Math.min(x2b, plotW), q);
        const y2 = lerp(y1, y2b, q);
        ops.push({ t: 'rect', x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), fill: s.color, fo: s.fill ?? 0.16, stroke: s.color, sw: 1.2 });
        if (s.label && q > 0.75) label(Math.max(x1, x2) - 3, Math.min(y1, y2b) + 9, s.label, s.color, clamp((q - 0.75) / 0.25), 'end');
        break;
      }
      case 'path': {
        const pts = s.pts.map(XY);
        const segs = pts.length - 1;
        const f2 = q * segs;
        const k = Math.min(segs, Math.floor(f2));
        const shown: [number, number][] = pts.slice(0, k + 1);
        if (k < segs) shown.push([lerp(pts[k][0], pts[k + 1][0], f2 - k), lerp(pts[k][1], pts[k + 1][1], f2 - k)]);
        ops.push({ t: 'poly', pts: shown, stroke: s.color, sw: s.w ?? 1.8, dash: s.dash });
        (s.labels ?? []).forEach((lab, j) => {
          if (!lab || j > k) return;
          const isHigh = j > 0 ? pts[j][1] <= pts[j - 1][1] : pts.length > 1 && pts[0][1] <= pts[1][1];
          const yy = pts[j][1] + (isHigh ? -12 : 14);
          ops.push({ t: 'text', x: pts[j][0], y: yy, text: lab, fill: s.color, size: 11.5, anchor: 'middle', bold: true });
        });
        break;
      }
      case 'ring': {
        const [x, y] = XY(s.at);
        ops.push({ t: 'circle', cx: x, cy: y, r: 9 + (1 - appear) * 10, stroke: s.color, sw: 2, o: appear });
        if (s.label && q > 0.4) label(x, s.below ? y + 22 : y - 18, s.label, s.color, clamp((q - 0.4) / 0.4), 'middle');
        break;
      }
      case 'label': {
        const [x, y] = XY(s.at);
        label(x, s.below ? y + 18 : y, s.text, s.color, appear);
        break;
      }
      case 'hline': {
        const y = Y(s.p);
        const x0 = X(s.i0 ?? 0);
        const xe = lerp(x0, plotW, q);
        ops.push({ t: 'line', x1: x0, y1: y, x2: xe, y2: y, stroke: s.color, sw: 1.5, dash: s.dash });
        if (s.label && q > 0.6) label(plotW - 4, y - 2, s.label, s.color, clamp((q - 0.6) / 0.4), 'end');
        break;
      }
      case 'vline': {
        const x = X(s.i);
        ops.push({ t: 'line', x1: x, y1: top, x2: x, y2: lerp(top, top + chartH, q), stroke: s.color, sw: 1.3, dash: true });
        if (s.label) label(x, top + 12, s.label, s.color, appear, 'middle');
        break;
      }
      case 'band': {
        const x0 = X(s.i0 - 0.5);
        const x1 = X(lerp(s.i0, s.i1, q) + 0.5);
        ops.push({ t: 'rect', x: x0, y: top, w: Math.max(0, x1 - x0), h: chartH, fill: s.color, fo: 0.09 });
        if (s.label) label((x0 + X(s.i1 + 0.5)) / 2, top + 12, s.label, s.color, appear, 'middle');
        break;
      }
      case 'ruler': {
        const [x1, y1] = XY(s.a);
        const [x2b, y2b] = XY(s.b);
        const x2 = lerp(x1, x2b, q);
        const y2 = lerp(y1, y2b, q);
        ops.push({ t: 'rect', x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), fill: BLUE, fo: 0.13, stroke: BLUE, sw: 1, dash: true });
        ops.push({ t: 'line', x1, y1, x2, y2, stroke: BLUE, sw: 1.4 });
        if (q > 0.6) label((x1 + x2b) / 2, Math.min(y1, y2b) - 6, s.text, BLUE, clamp((q - 0.6) / 0.4), 'middle');
        break;
      }
      case 'fib': {
        const [x1] = XY(s.a);
        const [x2b] = XY(s.b);
        const x2 = lerp(x1, x2b, q);
        ops.push({ t: 'line', x1, y1: Y(s.a.p), x2, y2: lerp(Y(s.a.p), Y(s.b.p), q), stroke: s.color, sw: 1, dash: true });
        if (q > 0.5)
          for (const lv of s.levels) {
            const p = s.b.p - lv * (s.b.p - s.a.p);
            const y = Y(p);
            ops.push({ t: 'line', x1: Math.min(x1, x2b), y1: y, x2: plotW, y2: y, stroke: GOLD, sw: 1, o: clamp((q - 0.5) * 2) * 0.8 });
            ops.push({ t: 'text', x: Math.min(x1, x2b) + 2, y: y - 3, text: String(lv), fill: GOLD, size: 9.5, anchor: 'start', o: clamp((q - 0.5) * 2) });
          }
        break;
      }
    }
  }

  // mouse pointer
  const [cx, cy] = XY(f.cursor);
  const mx = Math.max(0, Math.min(Wpx - 4, cx));
  const my = Math.max(0, Math.min(Hpx - 4, cy));
  if (f.cursor.click > 0 && f.cursor.click < 1) ops.push({ t: 'circle', cx: mx, cy: my, r: 4 + f.cursor.click * 16, stroke: '#FFFFFF', sw: 2, o: 1 - f.cursor.click });
  if (f.cursor.down) ops.push({ t: 'circle', cx: mx, cy: my, r: 7, fill: ACC, o: 0.35 });
  const a: [number, number][] = [
    [0, 0],
    [0, 17],
    [4.5, 13],
    [7.5, 19.5],
    [10.5, 18.2],
    [7.6, 11.8],
    [13, 11.8],
  ];
  ops.push({ t: 'poly', pts: a.map(([x, y]) => [mx + x, my + y] as [number, number]), fill: '#FFFFFF', stroke: '#0B1220', sw: 1.3, closed: true });
  return ops;
}

function niceStep(raw: number) {
  const p = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const n = raw / p;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * p;
}

/** All scene ids used by the lessons (for the self-test). */
export function allSceneIds(): string[] {
  return Object.keys(ALIAS);
}
