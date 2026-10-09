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
  /** several worked examples played one after the other inside one lesson part */
  seq?: Scene[];
};

export type Frame = {
  n: number;
  view: [number, number];
  shapes: { s: Shape; q: number }[];
  cursor: { i: number; p: number; pane?: boolean; down: boolean; click: number };
  caption: string;
  /** which example of the part is on screen, and its instrument */
  part?: number;
  symbol?: string;
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
  mirrorOB: ['Order Block معاكس', 'Opposite OB'],
  noNewLow: ['لا قاع جديد', 'No new low'],
  closeThrough: ['إغلاق عبر الفجوة', 'Closed through the gap'],
  c_sweep: ['السعر يصطاد السيولة', 'Price sweeps the liquidity'],
  longWick: ['ذيل طويل', 'Long wick'],
  pushAway: ['دفعة بعيداً', 'Push away'],
  openPrice: ['سعر الافتتاح', 'Open price'],
  realMove: ['الحركة الحقيقية', 'The real move'],
  weekOpen: ['افتتاح الأسبوع', 'Week open'],
  height: ['الارتفاع', 'Height'],
  filled: ['تنفيذ الأمر', 'Order filled'],
  c_trend: ['نحدد الاتجاه', 'Reading the trend'],
  strongDep: ['انطلاق قوي = منطقة قوية', 'Strong departure = strong zone'],
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

/** Candle i closes at `cl`, opening at the previous close; optional absolute high / low. */
function K(c: Candle[], i: number, cl: number, h?: number, l?: number) {
  const o = i > 0 ? c[i - 1].c : c[i].o;
  c[i] = { o, c: cl, h: Math.max(h ?? 0, Math.max(o, cl) + (h === undefined ? 0.12 : 0)), l: Math.min(l ?? 1e9, Math.min(o, cl) - (l === undefined ? 0.12 : 0)) };
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
    if (v === 'strength') steps.splice(2, 0, { s: { k: 'ruler', a: P(24, 3.2), b: P(24, c[30].h), text: ctx.T('strongDep') }, w: 1.4 });
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

  // ============================================================== more scenes (ICT / SMC)
  breaker(ctx) {
    const c = walk(ctx, [[0, 4], [8, 8], [13, 9.6], [14, 10], [18, 5.5], [24, 2.4], [27, 3.4], [31, 8.5], [35, 11.8], [38, 10.8], [40, 10.4], [46, 13], [55, 16.5]], 0.26);
    K(c, 14, 10.4);
    K(c, 15, 8.6);
    const lo = c[14].l;
    const hi = c[14].h;
    const sw = loIdx(c, 20, 28);
    let brk = 33;
    for (let i = 29; i < 44; i++)
      if (c[i].c > hi) {
        brk = i;
        break;
      }
    wickTo(c, 41, hi - 0.3);
    return {
      candles: c,
      n0: 24,
      steps: [
        { s: { k: 'box', a: P(14, lo), b: P(brk, hi), color: BEAR, label: ctx.T('mirrorOB') }, cap: ctx.T('c_ob'), w: 1.3 },
        { reveal: 30, w: 1.2 },
        { s: { k: 'ring', at: P(sw, c[sw].l), color: GOLD, label: ctx.T('sweep'), below: true } },
        { s: { k: 'line', a: P(14, hi), b: P(brk, hi), color: ACC, label: 'BOS' }, cap: ctx.T('c_bos') },
        { s: { k: 'box', a: P(brk, lo), b: P(55, hi), color: ACC, label: 'Breaker' }, cap: ctx.T('c_zone'), w: 1.4 },
        { reveal: 56, cap: ctx.T('c_result'), w: 1.8 },
        { s: { k: 'ring', at: P(41, c[41].l), color: BULL, label: ctx.T('retest'), below: true } },
      ],
    };
  },

  mitigation(ctx) {
    const c = walk(ctx, [[0, 9], [8, 10], [16, 2], [24, 7], [29, 3.4], [32, 3.6], [34, 8.4], [40, 10.5], [44, 7], [46, 6.2], [55, 12]], 0.26);
    const a = loIdx(c, 12, 20);
    const hl = loIdx(c, 27, 33);
    K(c, hl, c[hl].c);
    const zl = c[hl].l;
    const zh = Math.max(c[hl].o, c[hl].c) + 0.5;
    wickTo(c, 45, zh - 0.2);
    return {
      candles: c,
      n0: 26,
      steps: [
        { s: { k: 'ring', at: P(a, c[a].l), color: BEAR, label: 'Low', below: true }, cap: ctx.T('c_swings') },
        { reveal: 36, w: 1.4 },
        { s: { k: 'line', a: P(a, c[a].l), b: P(hl, c[a].l), color: GRAY, dash: true, label: ctx.T('noNewLow') }, w: 1.2 },
        { s: { k: 'box', a: P(hl - 1, zl), b: P(55, zh), color: BLUE, label: 'MB' }, cap: ctx.T('c_zone'), w: 1.4 },
        { s: { k: 'line', a: P(24, c[24].h), b: P(35, c[24].h), color: ACC, label: 'BOS' } },
        { reveal: 56, cap: ctx.T('c_result'), w: 1.8 },
        { s: { k: 'ring', at: P(45, c[45].l), color: BULL, label: ctx.T('reaction'), below: true } },
      ],
    };
  },

  ifvg(ctx) {
    const c = walk(ctx, [[0, 0], [12, -2], [16, -1], [18, 1], [19, 4], [20, 5.5], [26, 8], [30, 7], [33, 3.5], [36, -0.5], [40, 2.5], [46, -2], [55, -6]], 0.26);
    setCandle(c, 18, 0.4, 1.1, 0.12);
    setCandle(c, 19, 1.1, 4.3, 0.1);
    setCandle(c, 20, 4.3, 5.6, 0.12);
    c[20].l = Math.max(c[20].l, c[18].h + 1.2);
    const lo = c[18].h;
    const hi = c[20].l;
    let cl = 34;
    for (let i = 28; i < 44; i++)
      if (c[i].c < lo) {
        cl = i;
        break;
      }
    c[41] = { o: lo - 1, h: lo + 0.5, l: lo - 1.6, c: lo - 1.2 };
    c[42].o = lo - 1.2;
    return {
      candles: c,
      n0: 28,
      steps: [
        { view: [10, 34], w: 0.8 },
        { s: { k: 'box', a: P(18, lo), b: P(cl, hi), color: PURP, label: 'FVG' }, cap: ctx.T('c_fvg'), w: 1.3 },
        { reveal: 38, w: 1.3 },
        { s: { k: 'ring', at: P(cl, c[cl].c), color: BEAR, label: ctx.T('closeThrough'), below: true } },
        { s: { k: 'box', a: P(cl, lo), b: P(55, hi), color: BEAR, label: 'IFVG' }, cap: ctx.T('c_zone'), w: 1.4 },
        { view: [-0.5, 61], w: 0.8 },
        { reveal: 56, cap: ctx.T('c_result'), w: 1.6 },
        { s: { k: 'ring', at: P(41, c[41].h), color: BEAR, label: ctx.T('reaction') } },
      ],
    };
  },

  bpr(ctx) {
    const c = walk(ctx, [[0, 0], [12, -2], [16, -1], [18, 1], [19, 4], [20, 5.6], [23, 6.4], [26, 5.2], [27, 3.2], [28, 1.5], [32, -1], [35, 0.5], [38, 2.6], [44, 6], [55, 10]], 0.24);
    K(c, 18, 1.1);
    K(c, 19, 4.3);
    K(c, 20, 5.6, undefined, 3.0);
    K(c, 25, 6.0);
    K(c, 26, 4.9, undefined, 4.4);
    K(c, 27, 1.8);
    K(c, 28, 1.0, 1.9);
    wickTo(c, 38, 2.4);
    const f1: [number, number] = [c[18].h, c[20].l];
    const f2: [number, number] = [c[28].h, c[26].l];
    const lo = Math.max(f1[0], f2[0]);
    const hi = Math.min(f1[1], f2[1]);
    return {
      candles: c,
      n0: 21,
      steps: [
        { s: { k: 'box', a: P(18, f1[0]), b: P(30, f1[1]), color: PURP, label: 'FVG ↑' }, cap: ctx.T('c_fvg'), w: 1.3 },
        { reveal: 30, w: 1.4 },
        { s: { k: 'box', a: P(26, f2[0]), b: P(40, f2[1]), color: BLUE, label: 'FVG ↓' }, w: 1.3 },
        { s: { k: 'box', a: P(18, lo), b: P(55, hi), color: GOLD, label: 'BPR' }, cap: ctx.T('c_zone'), w: 1.5 },
        { reveal: 56, cap: ctx.T('c_result'), w: 1.8 },
        { s: { k: 'ring', at: P(38, c[38].l), color: BULL, label: ctx.T('reaction'), below: true } },
      ],
    };
  },

  rejection(ctx) {
    const c = walk(ctx, [[0, 0], [10, 4], [20, 6.5], [29, 7.2], [30, 7.0], [34, 4], [40, 6.4], [43, 8.4], [44, 8.2], [48, 5], [55, 1.5]], 0.26);
    c[30] = { o: 7.2, c: 7.0, h: 9.8, l: 6.8 };
    c[31].o = 7.0;
    const bodyTop = 7.2;
    c[44] = { o: c[43].c, h: 9.6, l: 8.0, c: 8.2 };
    c[45].o = 8.2;
    return {
      candles: c,
      n0: 32,
      steps: [
        { view: [20, 40], w: 0.8 },
        { s: { k: 'ring', at: P(30, 9.8), color: GOLD, label: ctx.T('longWick') }, cap: ctx.T('c_candle') },
        { s: { k: 'box', a: P(29, bodyTop), b: P(55, 9.8), color: BEAR, label: 'RB' }, cap: ctx.T('c_zone'), w: 1.4 },
        { view: [-0.5, 61], w: 0.8 },
        { reveal: 56, cap: ctx.T('c_result'), w: 2 },
        { s: { k: 'ring', at: P(44, 9.6), color: BEAR, label: ctx.T('reaction') } },
      ],
    };
  },

  propulsion(ctx) {
    const c = walk(ctx, [[0, 8], [10, 3], [14, 4.6], [18, 1.6], [21, 0.6], [22, 3], [24, 8], [28, 6], [30, 3.0], [31, 5], [36, 10.5], [44, 13], [55, 16]], 0.26);
    setCandle(c, 21, 1.5, 0.6, 0.2);
    setCandle(c, 22, 0.6, 3.1, 0.1);
    setCandle(c, 23, 3.1, 6.0, 0.1);
    setCandle(c, 24, 6.0, 8.0, 0.15);
    const obLo = c[21].l;
    const obHi = c[21].h;
    wickTo(c, 30, obHi + 0.1);
    return {
      candles: c,
      n0: 26,
      steps: [
        { s: { k: 'box', a: P(21, obLo), b: P(55, obHi), color: BLUE, label: 'OB' }, cap: ctx.T('c_ob'), w: 1.3 },
        { reveal: 31, w: 1.4 },
        { s: { k: 'box', a: P(29.5, c[30].l), b: P(31.5, c[30].h), color: GOLD, label: 'PB' }, cap: ctx.T('c_zone'), w: 1.3 },
        { reveal: 56, cap: ctx.T('c_result'), w: 1.8 },
        { s: { k: 'arrow', a: P(31, c[31].c), b: P(40, c[40].h), color: BULL, label: ctx.T('pushAway') } },
      ],
    };
  },

  displacement(ctx) {
    const c = walk(ctx, [[0, 3], [10, 1.2], [17, 2.0], [18, 2.4], [19, 5.4], [20, 8.2], [28, 9.8], [36, 8.4], [55, 12]], 0.12, 0.18);
    for (let i = 8; i <= 17; i++) c[i] = { o: 1.5 + (i % 2) * 0.4, c: 1.9 - (i % 2) * 0.4, h: 2.3, l: 1.1 };
    c[18].o = c[17].c;
    K(c, 18, 2.9, undefined, 1.9);
    K(c, 19, 5.5, undefined, undefined);
    K(c, 20, 8.2, undefined, 6.1);
    c[20].l = Math.max(c[20].l, c[18].h + 0.5);
    const rh = Math.max(...c.slice(8, 18).map((x) => x.h));
    const rl = Math.min(...c.slice(8, 18).map((x) => x.l));
    return {
      candles: c,
      n0: 18,
      steps: [
        { view: [4, 30], w: 0.8 },
        { s: { k: 'box', a: P(8, rl), b: P(17.5, rh), color: GRAY, label: ctx.T('range') }, cap: ctx.T('c_zone'), w: 1.3 },
        { reveal: 24, w: 1.2 },
        { s: { k: 'arrow', a: P(18, c[18].l), b: P(21, c[20].h), color: BULL, label: 'Displacement' }, w: 1.5 },
        { s: { k: 'box', a: P(19, c[18].h), b: P(30, c[20].l), color: PURP, label: 'FVG' }, cap: ctx.T('c_fvg') },
        { s: { k: 'line', a: P(9, rh), b: P(20, rh), color: ACC, label: 'MSS' }, cap: ctx.T('c_bos') },
        { reveal: 56, w: 1.4 },
      ],
    };
  },

  structure_int(ctx) {
    const c = walk(ctx, [[0, 0], [6, 5], [9, 3.4], [12, 6.2], [15, 4.6], [20, 9.8], [24, 6.6], [27, 8.2], [30, 6.9], [36, 13], [40, 10.4], [43, 12], [46, 11], [55, 16]], 0.22);
    const sw = [0, 6, 15, 20, 24, 36, 40, 55];
    const swing = [6, 15, 20, 24, 36, 40].map((i, k) => P(i, k % 2 === 0 ? c[i].h : c[i].l));
    const hh = hiIdx(c, 33, 38);
    return {
      candles: c,
      n0: 30,
      steps: [
        { reveal: 56, w: 1.4 },
        { s: { k: 'path', pts: swing, color: GOLD, labels: ['HH', 'HL', 'HH', 'HL', 'HH', 'HL'] }, cap: ctx.T('c_swings'), w: 2.2 },
        { s: { k: 'path', pts: [P(20, c[20].h), P(24, c[24].l), P(27, c[27].h), P(30, c[30].l)], color: PURP, labels: ['', 'i-L', 'i-H', 'i-L'], dash: true }, w: 1.8 },
        { s: { k: 'line', a: P(27, c[27].h), b: P(34, c[27].h), color: PURP, label: 'iBOS' }, cap: ctx.T('c_bos') },
        { s: { k: 'ring', at: P(24, c[24].l), color: BULL, label: 'Strong Low', below: true } },
        { s: { k: 'ring', at: P(hh, c[hh].h), color: BEAR, label: 'Weak High' } },
        { s: { k: 'label', at: P(2, c[36].h), text: `${sw.length ? 'Swing' : ''} ≠ Internal`, color: GOLD } },
      ],
    };
  },

  turtle(ctx) {
    const c = walk(ctx, [[0, 0], [8, 5], [12, 7], [14, 4], [20, 5.8], [26, 6.6], [27, 6.9], [28, 5.5], [34, 2.5], [40, 3], [46, 0], [55, -3]], 0.26);
    const hi = c[hiIdx(c, 6, 13)].h;
    c[27] = { o: 6.2, c: 6.0, h: hi + 1.4, l: 5.8 };
    c[28].o = 6.0;
    return {
      candles: c,
      n0: 24,
      steps: [
        { s: { k: 'hline', p: hi, i0: hiIdx(c, 6, 13), color: GOLD, dash: true, label: 'Old High' }, cap: ctx.T('c_liq'), w: 1.4 },
        { reveal: 28, w: 1.2 },
        { s: { k: 'ring', at: P(27, c[27].h), color: BEAR, label: 'Turtle Soup' }, cap: ctx.T('c_sweep'), w: 1.3 },
        { s: { k: 'ring', at: P(28, c[28].c), color: ACC, label: ctx.T('closeBack'), below: true } },
        { reveal: 56, cap: ctx.T('c_result'), w: 1.8 },
        { s: { k: 'arrow', a: P(28, c[28].c), b: P(46, c[46].l), color: BEAR, label: ctx.T('target') } },
      ],
    };
  },

  judas(ctx) {
    const c = walk(ctx, [[0, 5], [10, 5.2], [18, 5], [20, 5], [22, 7.2], [24, 5.2], [30, 2.5], [40, 1], [55, 0]], 0.2);
    const op = c[20].o;
    return {
      candles: c,
      n0: 19,
      steps: [
        { s: { k: 'vline', i: 20, color: BLUE, label: 'Open' }, cap: ctx.T('c_sessions') },
        { s: { k: 'hline', p: op, i0: 20, color: GOLD, dash: true, label: ctx.T('openPrice') } },
        { reveal: 24, w: 1.2 },
        { s: { k: 'ring', at: P(22, c[22].h), color: BEAR, label: 'Judas Swing' }, cap: ctx.T('c_sweep'), w: 1.3 },
        { reveal: 56, cap: ctx.T('c_result'), w: 1.8 },
        { s: { k: 'arrow', a: P(24, c[24].c), b: P(42, c[40].l), color: BEAR, label: ctx.T('realMove') } },
      ],
    };
  },

  smt(ctx) {
    const c = walk(ctx, [[0, 8], [10, 2], [16, 6], [26, 0.6], [32, 4], [40, 7], [55, 12]], 0.22);
    const a = loIdx(c, 6, 14);
    const b = loIdx(c, 22, 30);
    const vals: number[] = [];
    const pa: [number, number][] = [[0, 8], [10, 3.0], [16, 6], [26, 3.9], [32, 5], [40, 7], [55, 10]];
    for (let i = 0; i < 56; i++) {
      let v = pa[pa.length - 1][1];
      for (let k = 1; k < pa.length; k++)
        if (i <= pa[k][0]) {
          v = lerp(pa[k - 1][1], pa[k][1], (i - pa[k - 1][0]) / (pa[k][0] - pa[k - 1][0]));
          break;
        }
      vals.push(v + Math.sin(i * 1.7) * 0.15);
    }
    return {
      candles: c,
      n0: 34,
      pane: { values: vals, kind: 'line', min: 0, max: 12, label: 'GBPUSD', color: BLUE },
      steps: [
        { s: { k: 'ring', at: P(a, c[a].l), color: GOLD, label: 'L1', below: true }, cap: ctx.T('c_swings') },
        { s: { k: 'ring', at: P(b, c[b].l), color: BEAR, label: 'LL', below: true } },
        { s: { k: 'ring', at: P(a, vals[a], true), color: GOLD, label: 'L1' }, w: 1.1 },
        { s: { k: 'ring', at: P(b, vals[b], true), color: BULL, label: 'HL' }, w: 1.1 },
        { s: { k: 'label', at: P(34, c[16].h + 1), text: 'SMT Divergence', color: PURP } },
        { reveal: 56, cap: ctx.T('c_result'), w: 1.8 },
      ],
    };
  },

  amd(ctx) {
    const c = walk(ctx, [[0, 5], [10, 5.2], [18, 4.9], [22, 3.4], [24, 3.2], [26, 5], [36, 9], [46, 11.5], [55, 12.5]], 0.2);
    const op = c[19].o;
    const low = loIdx(c, 20, 25);
    return {
      candles: c,
      n0: 19,
      steps: [
        { s: { k: 'hline', p: op, i0: 0, color: GOLD, dash: true, label: ctx.T('openPrice') }, cap: ctx.T('c_sessions') },
        { s: { k: 'band', i0: 0, i1: 19, color: BLUE, label: 'Accumulation' }, w: 1.3 },
        { reveal: 26, w: 1.1 },
        { s: { k: 'band', i0: 20, i1: 25, color: BEAR, label: 'Manipulation' } },
        { s: { k: 'ring', at: P(low, c[low].l), color: BEAR, label: ctx.T('sweep'), below: true } },
        { reveal: 56, cap: ctx.T('c_result'), w: 1.6 },
        { s: { k: 'band', i0: 26, i1: 55, color: BULL, label: 'Distribution' } },
      ],
    };
  },

  bias(ctx, v) {
    const b = S.ob(ctx, 'entry');
    const lab = v === 'mtf' ? ['D1 / H4', 'M15'] : v === 'sk' ? ['H4 zone', 'M15'] : ['HTF Bias ↑', 'LTF'];
    const first: Step = { s: { k: 'arrow', a: P(2, b.candles[2].l), b: P(52, b.candles[54].h), color: GOLD, label: lab[0] }, cap: ctx.T('c_trend'), w: 1.6 };
    const steps = [first, ...b.steps];
    steps.splice(2, 0, { view: [26, 52], cap: lab[1], w: 1 });
    return { ...b, steps };
  },

  model2022(ctx, v) {
    const c = walk(ctx, [[0, 6], [6, 4], [10, 3.2], [14, 4.4], [18, 3.25], [22, 4], [24, 2.2], [25, 3.6], [26, 6.2], [27, 7.6], [30, 6.6], [32, 6.2], [34, 8], [40, 10], [55, 13]], 0.22);
    for (const i of [10, 18]) c[i].l = 3.15;
    K(c, 24, 3.0, undefined, 2.0);
    K(c, 25, 4.4);
    K(c, 26, 6.4);
    K(c, 27, 7.6, undefined, 5.6);
    const fl = c[25].h;
    const fh = c[27].l;
    wickTo(c, 31, (fl + fh) / 2 - 0.1);
    const ie = 31;
    const entry = c[ie].c;
    const sl = c[24].l - 0.3;
    const steps: Step[] = [];
    if (v === 'silver') steps.push({ s: { k: 'band', i0: 22, i1: 38, color: GOLD, label: 'Silver Bullet 10–11 NY' }, cap: ctx.T('c_sessions') });
    steps.push(
      { s: { k: 'hline', p: 3.15, i0: 10, color: GOLD, dash: true, label: 'SSL' }, cap: ctx.T('c_liq'), w: 1.2 },
      { reveal: 25, w: 1.1 },
      { s: { k: 'ring', at: P(24, c[24].l), color: BEAR, label: ctx.T('sweep'), below: true }, w: 1.1 },
      { s: { k: 'arrow', a: P(25, c[25].l), b: P(28, c[27].h), color: BULL, label: 'Displacement' }, w: 1.3 },
      { s: { k: 'box', a: P(26, fl), b: P(40, fh), color: PURP, label: 'FVG' }, cap: ctx.T('c_fvg') },
      { reveal: 32, w: 1.2 },
      ...positionSteps(ctx, c, ie, entry, sl, 2, 48),
    );
    return { candles: c, n0: 22, steps };
  },

  targets(ctx) {
    const c = walk(ctx, [[0, 0], [8, 6], [12, 4], [16, 6.1], [20, 3], [24, 2.6], [30, 6.4], [34, 5], [40, 8.2], [44, 7.6], [50, 11.6], [55, 10.5]], 0.2);
    for (const i of [8, 16]) c[i].h = 6.4;
    const hiB = c[hiIdx(c, 40, 52)].h;
    const ie = 25;
    const entry = c[ie].c;
    const sl = c[loIdx(c, 20, 25)].l - 0.5;
    return {
      candles: c,
      n0: 26,
      steps: [
        { s: { k: 'hline', p: 6.4, i0: 8, color: GOLD, dash: true, label: 'BSL 1' }, cap: ctx.T('c_liq'), w: 1.2 },
        { s: { k: 'hline', p: hiB, i0: 8, color: GOLD, dash: true, label: 'BSL 2' }, w: 1.2 },
        { s: { k: 'ring', at: P(ie, entry), color: ACC, label: ctx.T('entry') }, cap: ctx.T('c_entry') },
        { s: { k: 'hline', p: sl, i0: ie, color: BEAR, dash: true, label: 'SL' } },
        { reveal: 32, cap: ctx.T('c_manage'), w: 1.5 },
        { s: { k: 'ring', at: P(30, 6.4), color: BULL, label: 'TP1 50%' } },
        { s: { k: 'hline', p: entry, i0: 31, color: GOLD, label: 'SL → BE' } },
        { reveal: 56, w: 1.6 },
        { s: { k: 'ring', at: P(50, hiB), color: BULL, label: 'TP2' } },
      ],
    };
  },

  nwog(ctx) {
    const c = walk(ctx, [[0, 5], [12, 7], [26, 8], [27, 8.2], [28, 9.7], [30, 11], [34, 10], [38, 9.5], [44, 12], [55, 14]], 0.2);
    c[27].c = 8.2;
    c[28] = { o: 9.6, c: 10.2, h: 10.5, l: 9.4 };
    c[29].o = 10.2;
    const ce = (8.2 + 9.6) / 2;
    wickTo(c, 38, ce);
    return {
      candles: c,
      n0: 30,
      steps: [
        { s: { k: 'vline', i: 27.5, color: BLUE, label: ctx.T('weekOpen') }, cap: ctx.T('c_sessions') },
        { s: { k: 'box', a: P(27, 8.2), b: P(55, 9.6), color: PURP, label: 'NWOG' }, cap: ctx.T('c_zone'), w: 1.5 },
        { s: { k: 'hline', p: ce, i0: 27, color: GOLD, dash: true, label: 'CE 50%' } },
        { reveal: 56, cap: ctx.T('c_result'), w: 2 },
        { s: { k: 'ring', at: P(38, c[38].l), color: BULL, label: ctx.T('reaction'), below: true } },
      ],
    };
  },

  // ============================================================== other schools
  candles_patterns(ctx, v) {
    const c = walk(ctx, [[0, 0], [10, 5], [20, 9], [29, 11.5], [30, 11.9], [31, 10.4], [36, 6.5], [44, 3], [55, 0]], 0.26);
    if (v === 'pin') {
      c[30] = { o: 11.5, c: 11.3, h: 14.2, l: 11.1 };
      c[31] = { o: 11.3, c: 10.4, h: 11.4, l: 10.2 };
    } else if (v === 'doji') {
      c[30] = { o: 11.6, c: 11.62, h: 12.6, l: 10.7 };
      c[31] = { o: 11.62, c: 10.3, h: 11.7, l: 10.2 };
    } else {
      K(c, 30, 12.0, 12.2);
      c[30].o = c[29].c;
      c[31] = { o: 12.2, c: 10.2, h: 12.3, l: 10.1 };
    }
    const nm = v === 'pin' ? 'Pin Bar' : v === 'doji' ? 'Doji' : 'Engulfing';
    return {
      candles: c,
      n0: 31,
      steps: [
        { view: [20, 42], w: 0.8 },
        { s: { k: 'hline', p: 12.3, i0: 20, color: GOLD, dash: true, label: ctx.T('resistance') }, cap: ctx.T('c_zone') },
        { s: { k: 'box', a: P(29.4, c[31].l), b: P(31.6, c[30].h), color: BEAR, label: nm }, cap: ctx.T('c_pattern'), w: 1.4 },
        { reveal: 56, cap: ctx.T('c_result'), w: 1.8 },
        { s: { k: 'arrow', a: P(31, c[31].c), b: P(46, c[44].l), color: BEAR, label: ctx.T('target') } },
        { view: [-0.5, 61], w: 0.8 },
      ],
    };
  },

  double_top(ctx) {
    const c = walk(ctx, [[0, 0], [10, 8], [16, 4], [24, 8.05], [30, 3.8], [34, 2], [40, 3], [55, -3]], 0.24);
    c[10].h = 8.5;
    c[24].h = 8.45;
    const neck = c[loIdx(c, 14, 19)].l;
    let brk = 31;
    for (let i = 26; i < 40; i++)
      if (c[i].c < neck) {
        brk = i;
        break;
      }
    const h = 8.5 - neck;
    return {
      candles: c,
      n0: 28,
      steps: [
        { s: { k: 'ring', at: P(10, 8.5), color: BEAR, label: 'Top 1' }, cap: ctx.T('c_pattern') },
        { s: { k: 'ring', at: P(24, 8.45), color: BEAR, label: 'Top 2' } },
        { s: { k: 'line', a: P(6, neck), b: P(brk, neck), color: GOLD, label: ctx.T('neckline') }, w: 1.4 },
        { reveal: 56, cap: ctx.T('c_result'), w: 1.6 },
        { s: { k: 'ring', at: P(brk, neck), color: ACC, label: ctx.T('break') } },
        { s: { k: 'ruler', a: P(46, 8.5), b: P(46, neck), text: ctx.T('height') } },
        { s: { k: 'arrow', a: P(brk, neck), b: P(brk + 14, neck - h), color: BEAR, label: ctx.T('target') } },
      ],
    };
  },

  channel(ctx, v) {
    const c = walk(ctx, [[0, 0], [6, 4], [10, 1.4], [18, 6.5], [22, 3.6], [30, 9.2], [34, 6.4], [42, 12], [46, 9.2], [55, 14.4]], 0.2);
    const slope = (c[22].l - c[10].l) / 12;
    const lows = [10, 22, 34, 46];
    const base = c[10].l;
    const w = 3.6;
    const up = (i: number, off: number) => base + slope * (i - 10) + off;
    const steps: Step[] = [
      { s: { k: 'line', a: P(10, up(10, 0)), b: P(55, up(55, 0)), color: ACC, label: v === 'ew' ? '2–4' : ctx.T('support') }, cap: ctx.T('c_trendline'), w: 1.6 },
      { s: { k: 'line', a: P(6, up(6, w + 0.8)), b: P(55, up(55, w + 0.8)), color: BLUE, label: v === 'ew' ? '1–3–5' : ctx.T('resistance'), dash: true }, cap: ctx.T('c_pattern'), w: 1.6 },
      { s: { k: 'label', at: P(2, c[42].h), text: 'Channel', color: GOLD } },
      { s: { k: 'ring', at: P(lows[3], c[lows[3]].l), color: BULL, label: ctx.T('touch'), below: true } },
      { reveal: 56, w: 1.4 },
    ];
    return { candles: c, n0: 40, steps };
  },

  fib(ctx) {
    const c = walk(ctx, [[0, 4], [6, 0], [22, 12], [28, 9.4], [34, 6.1], [40, 8], [48, 12.5], [55, 15.5]], 0.22);
    const a = loIdx(c, 3, 10);
    const b = hiIdx(c, 18, 26);
    const lo = c[a].l;
    const hi = c[b].h;
    const r618 = hi - 0.618 * (hi - lo);
    wickTo(c, 34, r618);
    return {
      candles: c,
      n0: 28,
      steps: [
        { s: { k: 'fib', a: P(a, lo), b: P(b, hi), levels: [0, 0.382, 0.5, 0.618, 1], color: GOLD }, cap: ctx.T('c_fib'), w: 2 },
        { reveal: 36, cap: ctx.T('c_watch'), w: 1.4 },
        { s: { k: 'ring', at: P(34, c[34].l), color: BULL, label: '61.8%', below: true } },
        { reveal: 56, cap: ctx.T('c_result'), w: 1.6 },
        { s: { k: 'hline', p: hi + 0.272 * (hi - lo), i0: b, color: BULL, dash: true, label: '127.2%' } },
      ],
    };
  },

  volatility(ctx) {
    const c = walk(ctx, [[0, 0], [8, 1.2], [16, 0.2], [24, 1.0], [30, 0.6], [34, 3.5], [38, 7], [44, 9], [48, 8], [55, 12]], 0.2);
    const cl = c.map((x) => x.c);
    const mid: Pt[] = [];
    const up: Pt[] = [];
    const dn: Pt[] = [];
    for (let i = 19; i < 56; i++) {
      const w = cl.slice(i - 19, i + 1);
      const m = w.reduce((a, b) => a + b, 0) / 20;
      const sd = Math.sqrt(w.reduce((a, b) => a + (b - m) * (b - m), 0) / 20);
      mid.push(P(i, m));
      up.push(P(i, m + 2 * sd));
      dn.push(P(i, m - 2 * sd));
    }
    const ie = 36;
    const atr = c.slice(ie - 14, ie).reduce((a, k) => a + (k.h - k.l), 0) / 14;
    const entry = c[ie].c;
    return {
      candles: c,
      n0: 30,
      steps: [
        { s: { k: 'path', pts: up, color: BLUE, labels: [] }, cap: ctx.T('c_indicator'), w: 1.6 },
        { s: { k: 'path', pts: dn, color: BLUE, labels: [] }, w: 1.2 },
        { s: { k: 'path', pts: mid, color: GRAY, labels: [], dash: true }, w: 1 },
        { s: { k: 'label', at: P(26, 3), text: 'Squeeze', color: GOLD } },
        { reveal: 56, w: 1.6 },
        { s: { k: 'ring', at: P(ie, entry), color: ACC, label: ctx.T('entry') } },
        { s: { k: 'hline', p: entry - 2 * atr, i0: ie, color: BEAR, dash: true, label: 'SL = 2×ATR' }, cap: ctx.T('c_sl') },
      ],
    };
  },

  breakout_retest(ctx) {
    const c = walk(ctx, [[0, 2], [8, 5.6], [14, 4], [20, 5.8], [26, 7.2], [30, 8.8], [34, 6.3], [40, 9], [55, 13]], 0.22);
    for (const i of [8, 20]) c[i].h = 6.1;
    let brk = 26;
    for (let i = 21; i < 32; i++)
      if (c[i].c > 6.1) {
        brk = i;
        break;
      }
    wickTo(c, 34, 6.0);
    const entry = c[34].c;
    return {
      candles: c,
      n0: 24,
      steps: [
        { s: { k: 'hline', p: 6.1, i0: 8, color: GOLD, dash: true, label: ctx.T('resistance') }, cap: ctx.T('c_zone'), w: 1.3 },
        { reveal: 30, w: 1.2 },
        { s: { k: 'ring', at: P(brk, c[brk].c), color: ACC, label: ctx.T('breakout') }, cap: ctx.T('c_bos') },
        { reveal: 35, w: 1.1 },
        { s: { k: 'ring', at: P(34, c[34].l), color: BULL, label: ctx.T('retest'), below: true } },
        { s: { k: 'box', a: P(34, entry), b: P(46, 5.2), color: BEAR, label: 'SL' }, cap: ctx.T('c_sl') },
        { reveal: 56, cap: ctx.T('c_result'), w: 1.6 },
      ],
    };
  },

  pivots(ctx) {
    const c = walk(ctx, [[0, 4], [10, 6], [20, 5], [28, 2.4], [36, 4.8], [42, 8.8], [48, 7], [55, 9]], 0.22);
    const pp = 5;
    const lv: [string, number, string][] = [['R2', 10, BEAR], ['R1', 7.4, BEAR], ['PP', pp, GOLD], ['S1', 2.6, BULL], ['S2', 0.4, BULL]];
    wickTo(c, 28, 2.5);
    return {
      candles: c,
      n0: 22,
      steps: [
        ...lv.map(([l, p, col], k) => ({ s: { k: 'hline', p, i0: 0, color: col, label: l, dash: l !== 'PP' } as Shape, cap: k === 0 ? ctx.T('c_levels') : undefined, w: 0.9 })),
        { reveal: 56, cap: ctx.T('c_result'), w: 2 },
        { s: { k: 'ring', at: P(28, c[28].l), color: BULL, label: ctx.T('reaction'), below: true } },
      ],
    };
  },

  orders(ctx) {
    const c = walk(ctx, [[0, 2], [10, 5], [20, 3.5], [30, 5.5], [34, 5], [40, 7.6], [46, 6.4], [55, 9]], 0.2);
    const px = c[33].c;
    const L: [string, number, string][] = [['Sell Limit', px + 3, BEAR], ['Buy Stop', px + 1.8, BULL], ['Market', px, GOLD], ['Sell Stop', px - 1.8, BEAR], ['Buy Limit', px - 3, BULL]];
    return {
      candles: c,
      n0: 34,
      steps: [
        ...L.map(([l, p, col], k) => ({ s: { k: 'hline', p, i0: 28, color: col, label: l, dash: l !== 'Market' } as Shape, cap: k === 0 ? ctx.T('c_entry') : undefined, w: 1 })),
        { reveal: 56, cap: ctx.T('c_result'), w: 2 },
        { s: { k: 'ring', at: P(38, px + 1.8), color: BULL, label: ctx.T('filled') } },
      ],
    };
  },

  spread(ctx) {
    const c = walk(ctx, [[0, 0], [20, 3], [40, 1], [55, 2.5]], 0.25);
    const last = c[c.length - 1].c;
    const sp = (ctx.sym === SYMS.XAUUSD ? 3 : 1.4) * ctx.sym.pip / ctx.u;
    return {
      candles: c,
      n0: 56,
      steps: [
        { view: [44, 61], w: 0.8 },
        { s: { k: 'hline', p: last, i0: 44, color: BEAR, label: 'Bid' }, cap: ctx.T('c_measure') },
        { s: { k: 'hline', p: last + sp, i0: 44, color: BULL, label: 'Ask' } },
        { s: { k: 'ruler', a: P(52, last), b: P(52, last + sp), text: `${ctx.sym === SYMS.XAUUSD ? 30 : 1.4} pips` }, w: 1.4 },
        { s: { k: 'label', at: P(46, last + sp * 3), text: 'Spread = Ask − Bid', color: GOLD } },
      ],
    };
  },

  ew_diagonal(ctx) {
    const c = walk(ctx, [[0, 0], [8, 5], [12, 2.5], [22, 7.5], [27, 4.5], [36, 8.5], [40, 6], [55, 0]], 0.2);
    const p5 = hiIdx(c, 32, 38);
    const pts = [P(0, c[0].l), P(8, c[8].h), P(12, c[12].l), P(22, c[22].h), P(27, c[27].l), P(p5, c[p5].h)];
    return {
      candles: c,
      n0: 38,
      steps: [
        { s: { k: 'path', pts, color: GOLD, labels: ['', '1', '2', '3', '4', '5'] }, cap: ctx.T('c_waves'), w: 2.2 },
        { s: { k: 'line', a: P(8, c[8].h), b: P(p5, c[p5].h), color: ACC, label: '1–3–5' }, cap: ctx.T('c_trendline') },
        { s: { k: 'line', a: P(12, c[12].l), b: P(p5, c[27].l + (c[27].l - c[12].l) * ((p5 - 27) / 15)), color: ACC, label: '2–4' } },
        { s: { k: 'label', at: P(4, c[p5].h), text: 'Wedge', color: GOLD } },
        { reveal: 56, cap: ctx.T('c_result'), w: 1.6 },
      ],
    };
  },

  ew_complex(ctx) {
    const c = walk(ctx, [[0, 12], [7, 6], [10, 8], [16, 3], [22, 8], [28, 4.5], [32, 6], [40, 1.5], [55, 9]], 0.22);
    const idx = [0, 16, 22, 40];
    const pts = [P(0, c[0].h), P(16, c[16].l), P(22, c[22].h), P(40, c[40].l)];
    return {
      candles: c,
      n0: 42,
      steps: [
        { s: { k: 'path', pts: pts.slice(0, 2), color: BEAR, labels: ['', 'W'] }, cap: ctx.T('c_waves'), w: 1.4 },
        { s: { k: 'path', pts: pts.slice(1, 3), color: GOLD, labels: ['', 'X'] }, w: 1.2 },
        { s: { k: 'path', pts: pts.slice(2, 4), color: BEAR, labels: ['', 'Y'] }, w: 1.6 },
        { s: { k: 'label', at: P(3, c[idx[0]].h - 1), text: 'W–X–Y', color: GOLD } },
        { reveal: 56, cap: ctx.T('c_result'), w: 1.6 },
        { s: { k: 'ring', at: P(40, c[40].l), color: BULL, label: ctx.T('entry'), below: true } },
      ],
    };
  },

  gann_eighths(ctx) {
    const c = walk(ctx, [[0, 2], [10, 6], [20, 1], [30, 7], [36, 4.3], [40, 5.2], [48, 9], [55, 12]], 0.24);
    const lo = 0;
    const hi = 12;
    const steps: Step[] = [{ s: { k: 'ruler', a: P(3, lo), b: P(3, hi), text: ctx.T('range') }, cap: ctx.T('c_levels'), w: 1.2 }];
    for (let k = 0; k <= 8; k++) {
      const col = k === 4 ? GOLD : k === 2 || k === 6 ? ACC : GRAY;
      steps.push({ s: { k: 'hline', p: lo + (hi * k) / 8, i0: 3, color: col, label: `${k}/8`, dash: k !== 4 }, w: 0.5 });
    }
    wickTo(c, 36, 4.2);
    steps.push({ reveal: 56, cap: ctx.T('c_result'), w: 1.8 }, { s: { k: 'ring', at: P(36, c[36].l), color: BULL, label: '4/8', below: true } });
    return { candles: c, n0: 34, steps };
  },

  wy_phases(ctx) {
    const b = S.wy(ctx, 'accum');
    const bands: [number, number, string][] = [[10, 25, 'A'], [25, 34, 'B'], [34, 40, 'C'], [40, 47, 'D'], [47, 55, 'E']];
    const steps = [...b.steps];
    bands.forEach(([i0, i1, l], k) => steps.push({ s: { k: 'band', i0, i1, color: [BLUE, GRAY, BULL, ACC, GOLD][k], label: l }, w: 1 }));
    return { ...b, steps };
  },

  wy_reacc(ctx) {
    const c = walk(ctx, [[0, 0], [10, 6], [16, 8], [20, 6.6], [26, 7.4], [30, 6.2], [32, 5.6], [34, 6.8], [40, 11], [46, 13.5], [55, 16]], 0.2);
    wickTo(c, 32, 5.5);
    return {
      candles: c,
      n0: 18,
      steps: [
        { s: { k: 'arrow', a: P(0, c[0].l), b: P(16, c[16].h), color: BULL, label: ctx.T('uptrend') }, cap: ctx.T('c_phases') },
        { reveal: 34, w: 1.3 },
        { s: { k: 'box', a: P(16, 5.4), b: P(36, 8.4), color: BLUE, label: 'Re-accumulation' }, cap: ctx.T('c_zone'), w: 1.5 },
        { s: { k: 'ring', at: P(32, c[32].l), color: GOLD, label: 'Shakeout', below: true } },
        { reveal: 56, cap: ctx.T('c_result'), w: 1.8 },
        { s: { k: 'arrow', a: P(36, 8.4), b: P(52, c[52].h), color: BULL, label: 'SOS' } },
      ],
    };
  },

  vsa(ctx) {
    const c = walk(ctx, [[0, 12], [10, 6], [16, 2], [18, 1.8], [24, 4], [30, 2.6], [34, 3.4], [42, 8], [55, 11]], 0.22);
    c[18] = { o: 2.6, c: 2.3, h: 2.8, l: 1.5 };
    c[19].o = 2.3;
    const vol = c.map((_, i) => 24 + ((i * 31) % 15) + (i === 18 ? 80 : 0) + (i > 14 && i < 18 ? 30 : 0) + (i === 31 ? -8 : 0));
    return {
      candles: c,
      n0: 28,
      pane: { values: vol, kind: 'hist', min: 0, max: 120, label: 'Volume' },
      steps: [
        { s: { k: 'ring', at: P(18, vol[18], true), color: GOLD, label: 'Volume ↑↑' }, cap: ctx.T('c_volume'), w: 1.3 },
        { s: { k: 'ring', at: P(18, c[18].l), color: BULL, label: 'Stopping Volume', below: true }, w: 1.3 },
        { reveal: 34, w: 1.3 },
        { s: { k: 'ring', at: P(31, vol[31], true), color: ACC, label: 'Test' }, w: 1.2 },
        { reveal: 56, cap: ctx.T('c_result'), w: 1.8 },
      ],
    };
  },

  pnf(ctx) {
    const c = walk(ctx, [[0, 6], [8, 2], [12, 4.4], [16, 2], [20, 5.2], [24, 2.4], [28, 6], [34, 3.2], [38, 7], [44, 12], [55, 16]], 0.22);
    const sw = [8, 12, 16, 20, 24, 28, 34, 38];
    const pts = sw.map((i, k) => P(i, k % 2 === 0 ? c[i].l : c[i].h));
    return {
      candles: c,
      n0: 40,
      steps: [
        { s: { k: 'path', pts, color: GOLD, labels: ['O', 'X', 'O', 'X', 'O', 'X', 'O', 'X'] }, cap: ctx.T('c_swings'), w: 2 },
        { s: { k: 'box', a: P(8, 1.6), b: P(38, 7.4), color: BLUE, label: ctx.T('base') }, cap: ctx.T('c_zone'), w: 1.4 },
        { s: { k: 'ruler', a: P(41, 2), b: P(41, 7), text: 'count' }, w: 1.2 },
        { s: { k: 'arrow', a: P(38, 7), b: P(52, 14), color: BULL, label: ctx.T('target') } },
        { reveal: 56, cap: ctx.T('c_result'), w: 1.6 },
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
  breaker: ['breaker', ''],
  mitigation: ['mitigation', ''],
  ifvg: ['ifvg', ''],
  bpr: ['bpr', ''],
  rejection: ['rejection', ''],
  propulsion: ['propulsion', ''],
  displacement: ['displacement', ''],
  structure_int: ['structure_int', ''],
  turtle: ['turtle', ''],
  judas: ['judas', ''],
  smt: ['smt', ''],
  amd: ['amd', ''],
  bias: ['bias', ''],
  silver: ['model2022', 'silver'],
  nwog: ['nwog', ''],
  model2022: ['model2022', ''],
  targets: ['targets', ''],
  candles_patterns: ['candles_patterns', ''],
  engulfing: ['candles_patterns', ''],
  pinbar: ['candles_patterns', 'pin'],
  doji: ['candles_patterns', 'doji'],
  double_top: ['double_top', ''],
  channel: ['channel', ''],
  fib: ['fib', ''],
  volatility: ['volatility', ''],
  mtf: ['bias', 'mtf'],
  breakout_retest: ['breakout_retest', ''],
  pivots: ['pivots', ''],
  orders: ['orders', ''],
  spread: ['spread', ''],
  platform: ['position', ''],
  psychology: ['journal', ''],
  ew_diagonal: ['ew_diagonal', ''],
  ew_complex: ['ew_complex', ''],
  ew_channel: ['channel', 'ew'],
  gann_eighths: ['gann_eighths', ''],
  wy_phases: ['wy_phases', ''],
  wy_reacc: ['wy_reacc', ''],
  vsa: ['vsa', ''],
  pnf: ['pnf', ''],
  sk_mtf: ['bias', 'sk'],
  sk_strength: ['sk_zone', 'strength'],
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
  'basics-l0-01': ['overview', 'sessions', 'overview', 'platform', 'trend', 'trend_down@EURUSD', 'trend@XAUUSD', 'psychology', 'checklist'],
  'basics-l0-02': ['overview', 'pips', 'overview', 'spread', 'position', 'candle@XAUUSD', 'position@GBPUSD', 'position@XAUUSD', 'spread', 'checklist'],
  'basics-l0-03': ['overview', 'sessions', 'sessions', 'sessions', 'spread', 'volatility', 'sessions@EURUSD', 'volatility@XAUUSD', 'psychology', 'checklist'],
  'basics-l0-04': ['overview', 'candle', 'candle', 'candle', 'mtf', 'mtf', 'candle@EURUSD', 'mtf@XAUUSD', 'candle', 'checklist'],
  'basics-l2-01': ['orders', 'orders', 'orders', 'orders', 'position', 'orders', 'nwog@GBPUSD', 'orders@EURUSD', 'orders@XAUUSD', 'checklist'],
  'basics-l2-02': ['spread', 'spread', 'spread', 'spread', 'spread', 'spread', 'spread@EURUSD', 'spread@XAUUSD', 'spread', 'checklist'],
  'basics-l2-03': ['platform', 'spread', 'candle@EURUSD', 'orders', 'lot', 'position@EURUSD', 'position@XAUUSD', 'journal', 'checklist'],
  'basics-l2-04': ['psychology', 'psychology', 'position', 'psychology@GBPUSD', 'checklist', 'chase@XAUUSD', 'journal', 'checklist', 'plan'],
  'basics-l2-05': ['plan', 'sessions', 'checklist', 'position', 'lot', 'plan@EURUSD', 'journal', 'journal@USDJPY', 'journal', 'checklist'],
  'classic-l2-04': ['overview', 'candles_patterns', 'candle', 'candles_patterns', 'candles_patterns', 'sr', 'candles_patterns@EURUSD', 'candle@XAUUSD', 'fakeout', 'checklist'],
  'classic-l2-05': ['overview', 'double_top', 'double_top', 'position', 'channel', 'channel', 'double_top@GBPUSD', 'channel@USDJPY', 'fakeout', 'checklist'],
  'classic-l2-06': ['overview', 'fib', 'fib', 'sr', 'fib', 'position', 'fib@EURUSD', 'fib@XAUUSD', 'fakeout', 'checklist'],
  'classic-l2-07': ['overview', 'volatility', 'volatility', 'volatility', 'position', 'volatility', 'volatility@GBPUSD', 'volatility@XAUUSD', 'fakeout', 'checklist'],
  'classic-l3-03': ['mtf', 'mtf', 'trend', 'sr', 'candles_patterns', 'position', 'mtf@EURUSD', 'mtf@XAUUSD', 'chase', 'checklist'],
  'classic-l3-04': ['breakout_retest', 'sr', 'breakout_retest', 'breakout_retest', 'position', 'breakout_retest@GBPUSD', 'breakout_retest@USDJPY', 'fakeout', 'checklist'],
  'classic-l3-05': ['pivots', 'pivots', 'pivots', 'sr', 'pivots', 'position', 'pivots@EURUSD', 'pivots@XAUUSD', 'fakeout', 'checklist'],
  'classic-l3-06': ['overview', 'checklist', 'lot', 'journal', 'journal', 'journal@EURUSD', 'journal@XAUUSD', 'platform', 'chase', 'plan'],
  'ew-l1-03': ['ew', 'ew_rules', 'ew', 'mtf', 'ew_rules', 'ew_trade', 'ew_trade@EURUSD', 'ew_trade@XAUUSD', 'ew_invalid', 'checklist'],
  'ew-l1-04': ['ew_diagonal', 'ew_diagonal', 'ew_channel', 'ew_rules', 'ew_trade', 'ew_diagonal@GBPUSD', 'ew_diagonal@USDJPY', 'ew_invalid', 'checklist'],
  'ew-l2-02': ['ew_complex', 'ew_complex', 'ew_complex', 'ew_complex', 'ew_rules', 'ew_trade', 'ew_complex@EURUSD', 'ew_complex@XAUUSD', 'ew_invalid', 'checklist'],
  'ew-l2-03': ['ew_channel', 'ew_channel', 'ew_alt', 'ew_rules', 'ew_trade', 'ew_channel@EURUSD', 'ew_alt@XAUUSD', 'ew_invalid', 'checklist'],
  'ew-l3-02': ['ew', 'ew', 'ew_ext', 'ew_alt', 'ew_zigzag', 'ew_trade', 'ew_ext@GBPUSD', 'ew_zigzag@USDJPY', 'ew_invalid', 'checklist'],
  'ew-l5-02': ['mtf', 'ew_alt', 'ew_fib', 'ew_trade', 'position', 'ew_trade@EURUSD', 'ew_trade@XAUUSD', 'journal', 'plan'],
  'gann-l1-02': ['overview', 'lot', 'position', 'trend', 'position', 'position@EURUSD', 'trend_down@XAUUSD', 'psychology', 'checklist'],
  'gann-l2-03': ['overview', 'gann_1x1', 'gann_fan', 'gann_fan@EURUSD', 'gann_1x1', 'position', 'gann_1x1@XAUUSD', 'gann_fan@USDJPY', 'fakeout', 'checklist'],
  'gann-l2-04': ['gann_eighths', 'gann_eighths@GBPUSD', 'gann_balance', 'mtf', 'gann_eighths', 'position', 'gann_eighths@GBPUSD', 'gann_eighths@XAUUSD', 'fib', 'checklist'],
  'gann-l4-02': ['overview', 'gann_1x1@EURUSD', 'gann_cycles', 'gann_cycles@EURUSD', 'gann_cycles', 'position', 'gann_cycles@EURUSD', 'gann_cycles@XAUUSD', 'psychology', 'checklist'],
  'gann-l5-01': ['overview', 'mtf', 'gann_eighths', 'gann_cycles', 'position', 'plan@USDJPY', 'plan@GBPUSD', 'psychology', 'journal', 'checklist'],
  'sk-l2-03': ['overview', 'sk_base', 'displacement', 'sk_touch', 'sk_strength', 'sk_strength@EURUSD', 'sk_zone@XAUUSD', 'fakeout', 'checklist'],
  'sk-l2-04': ['overview', 'mtf', 'sk_mtf', 'trend', 'sk_strength', 'sk_mtf@GBPUSD', 'sk_mtf@USDJPY', 'chase', 'checklist'],
  'sk-l3-02': ['overview', 'orders', 'position', 'choch', 'ob_entry', 'sk_touch@EURUSD', 'choch@XAUUSD', 'fakeout', 'checklist'],
  'sk-l4-02': ['overview', 'checklist', 'plan@XAUUSD', 'sk_touch@XAUUSD', 'sk_manage@XAUUSD', 'sk_zone@EURUSD', 'sk_mtf@GBPUSD', 'journal', 'plan'],
  'sk-l5-01': ['psychology', 'psychology', 'psychology', 'psychology', 'journal', 'journal', 'journal@EURUSD', 'psychology@XAUUSD', 'chase', 'checklist'],
  'smc-l1-03': ['overview', 'structure_int', 'structure_int', 'structure_int', 'bos', 'position', 'structure_int@EURUSD', 'structure_int@XAUUSD', 'chase', 'checklist'],
  'smc-l1-04': ['overview', 'displacement', 'displacement', 'fvg', 'position', 'displacement@GBPUSD', 'displacement@USDJPY', 'fakeout', 'checklist'],
  'smc-l2-04': ['overview', 'breaker', 'breaker', 'mitigation', 'position', 'breaker@EURUSD', 'breaker@XAUUSD', 'mitigation@GBPUSD', 'fakeout', 'checklist'],
  'smc-l2-05': ['fvg', 'ifvg', 'ifvg', 'bpr', 'checklist', 'position', 'ifvg@EURUSD', 'bpr@XAUUSD', 'fakeout', 'checklist'],
  'smc-l2-06': ['rejection', 'rejection', 'propulsion', 'propulsion', 'checklist', 'position', 'rejection@GBPUSD', 'propulsion@USDJPY', 'fakeout', 'checklist'],
  'smc-l3-03': ['pd_ote', 'displacement', 'fib', 'checklist', 'position', 'pd_ote@EURUSD', 'pd_ote@XAUUSD', 'pd_ote@USDJPY', 'fakeout', 'checklist'],
  'smc-l3-04': ['liquidity', 'turtle', 'judas', 'checklist', 'position', 'turtle@EURUSD', 'judas@GBPUSD', 'fakeout', 'checklist'],
  'smc-l3-05': ['overview', 'smt', 'dxy', 'smt', 'checklist', 'position', 'smt@EURUSD', 'smt@GBPUSD', 'fakeout', 'checklist'],
  'smc-l4-02': ['overview', 'amd', 'sessions', 'amd', 'checklist', 'position', 'amd@EURUSD', 'amd@XAUUSD', 'fakeout', 'checklist'],
  'smc-l4-03': ['bias', 'mtf', 'pd', 'liquidity', 'checklist', 'model2022', 'bias@EURUSD', 'bias@XAUUSD', 'chase', 'plan'],
  'smc-l4-04': ['silver', 'sessions', 'bias', 'displacement', 'checklist', 'position', 'silver@EURUSD', 'silver@XAUUSD', 'fakeout', 'plan'],
  'smc-l4-05': ['nwog', 'nwog', 'nwog', 'fvg_partial', 'checklist', 'position', 'nwog@EURUSD', 'nwog@XAUUSD', 'spread', 'plan'],
  'smc-l5-02': ['overview', 'bias', 'liquidity', 'model2022', 'position', 'model2022@EURUSD', 'model2022@XAUUSD', 'fakeout@GBPUSD', 'chase', 'checklist'],
  'smc-l5-03': ['overview', 'targets', 'structure_int', 'targets', 'bos', 'choch', 'targets@EURUSD', 'targets@XAUUSD', 'psychology', 'checklist'],
  'wy-l1-03': ['overview', 'trend', 'wy_accum', 'wy_effort', 'wy_spring', 'wy_accum@EURUSD', 'wy_dist@XAUUSD', 'fakeout', 'checklist'],
  'wy-l2-03': ['wy_phases', 'wy_accum', 'wy_phases', 'wy_spring', 'wy_accum', 'position', 'wy_accum@GBPUSD', 'wy_dist@XAUUSD', 'fakeout', 'checklist'],
  'wy-l3-02': ['wy_reacc', 'wy_reacc', 'wy_dist', 'trend_down', 'wy_effort', 'position', 'wy_reacc@USDJPY', 'wy_dist@EURUSD', 'fakeout', 'checklist'],
  'wy-l3-03': ['vsa', 'candle', 'vsa', 'vsa', 'wy_effort', 'position', 'vsa@EURUSD', 'wy_effort@XAUUSD', 'fakeout', 'checklist'],
  'wy-l4-02': ['overview', 'dxy', 'dxy', 'pnf', 'wy_spring', 'mtf', 'plan@GBPUSD', 'wy_dist@XAUUSD', 'chase', 'checklist'],
  'wy-l5-01': ['pnf', 'pnf', 'pnf', 'pnf', 'wy_phases', 'targets', 'pnf@EURUSD', 'pnf@XAUUSD', 'fakeout', 'checklist'],
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
  const ids = examplesFor(schoolId, sceneIdFor(schoolId, lectureId, index), lectureId, index);
  if (ids.length === 1) return buildOne(schoolId, lectureId, index, lang, ids[0]);
  const seq = ids.map((id) => buildOne(schoolId, lectureId, index, lang, id));
  return { ...seq[0], id: ids.join('+'), seq };
}

const NO_EXTRA = new Set(['overview', 'checklist', 'journal', 'psychology', 'plan', 'chase', 'pips', 'pipvalue', 'lot', 'margin', 'candle']);
const SYM_CYCLE = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD'];

/** A part shows its picture on one instrument, then the same idea again (often mirrored) on another one, like a teacher giving a second example. */
function examplesFor(schoolId: string, full: string, lectureId: string, index: number): string[] {
  if (full.includes('+')) return full.split('+');
  const [name, sym] = full.split('@');
  const base = name.replace('!', '');
  if (NO_EXTRA.has(base)) return [full];
  const cur = sym || SCHOOL_SYMBOL[schoolId] || 'EURUSD';
  const h = hash(`${lectureId}:${index}`);
  let next = SYM_CYCLE[h % 4];
  if (next === cur) next = SYM_CYCLE[(h + 1) % 4];
  return [full, `${name.endsWith('!') ? base : base + '!'}@${next}`];
}

function buildOne(schoolId: string, lectureId: string, index: number, lang: Lang, full: string): Scene {
  const [rawName, symOverride] = full.split('@');
  const flip = rawName.endsWith('!');
  const name = rawName.replace('!', '');
  const [builder, variant, mirror0] = ALIAS[name] ?? ['overview', ''];
  let mirror = flip ? !mirror0 : !!mirror0;
  const symbol = symOverride || SCHOOL_SYMBOL[schoolId] || 'EURUSD';
  const sym = SYMS[symbol] ?? SYMS.EURUSD;
  const ctx: Ctx = { rng: rngOf(hash(`${lectureId}#${index}#${full}`)), T: translate(lang), sym, u: sym.B * 0.0012, N: 56, mirror: !!mirror };
  let b = S[builder](ctx, variant);
  if (mirror && b.pane) {
    // an indicator pane cannot be mirrored: build the normal picture instead
    mirror = !!mirror0 && !flip ? mirror : false;
    ctx.mirror = !!mirror;
    b = S[builder](ctx, variant);
  }
  // units → prices (mirror flips the picture for the bearish versions)
  for (const k of b.candles) {
    k.h = Math.max(k.h, k.o, k.c);
    k.l = Math.min(k.l, k.o, k.c);
  }
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
  if (sc.seq && sc.seq.length > 1) {
    const m = sc.seq.length;
    const k = Math.min(m - 1, Math.floor(p * m));
    const f = frameAt(sc.seq[k], clamp(p * m - k));
    return { ...f, part: k, caption: f.caption ? `${f.caption}  ·  ${k + 1}/${m}` : f.caption };
  }
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
  return { n: Math.max(1, Math.min(sc.candles.length, n)), view, shapes, cursor: { ...cursor, down, click }, caption, part: 0, symbol: sc.symbol };
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

export function drawOps(sc0: Scene, f: Frame, Wpx: number, Hpx: number): Op[] {
  const sc = sc0.seq && sc0.seq.length > 1 ? sc0.seq[Math.min(f.part ?? 0, sc0.seq.length - 1)] : sc0;
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
