/**
 * سحب طرف رسم: متى يُعدّ السحب **تغييراً** فعلاً.
 *
 * المشكلة التي نشأت عنها هذه الوحدة: لقطة التراجع كانت تُؤخذ عند **بدء اللمس**
 * (`onPanResponderGrant`) لا عند أول حركة تُغيّر شيئاً. فكل لمسة على رسمٍ محدَّد
 * تدفع لقطة مطابقة لما قبلها:
 *
 * - **الخط الأفقي والعمودي والملاحظة بلا طرف ثانٍ** (`d.b` غائب)، فشرط «لا سحب إلا من
 *   مقبض طرفي» لا يُفحص أصلاً ⇐ كل لمسة عليها وهي محدَّدة تدفع لقطة.
 * - ومع **المغناطيس مفعّلاً افتراضياً** (`snapPrice` يجذب السعر لأقرب O/H/L/C) تعطي
 *   حركة إصبع بضعة بكسلات داخل الشمعة نفسها **النقطة ذاتها حرفياً** — فالسحب «وقع»
 *   بلا أي تغيّر، ويكتب `setDrawings` نسخةً جديدة تُشغّل مؤقّت الحفظ بلا داعٍ.
 *
 * الأثر على المتداول ليس تجميلياً: سجلّ التراجع محدود بـ25 لقطة، فبضع لمسات على خطٍّ
 * محدَّد تطرد اللقطات الحقيقية من آخر السجلّ. ثم يضغط «تراجع» فلا يتغيّر شيء مرّة تلو
 * مرّة (لقطات مطابقة تُستهلك)، وحين يبدأ التأثير أخيراً يكون ما أراد التراجع عنه قد خرج
 * من السجلّ. أي: **زرّ التراجع يُستهلك بلمسات لم تُغيّر شيئاً**.
 *
 * الدوال هنا خالصة بلا حالة، فتُفحص بـ`drawEdit.selftest.ts` بلا شجرة مكوّنات.
 */
import type { ChartPoint, DrawTool, Drawing } from './types';

/** طرف الرسم المسحوب: `a` البداية، `b` النهاية (الأخيرة للرسوم ذات الطرفين فقط). */
export type DrawEnd = 'a' | 'b';

/**
 * تطابق نقطتين **بالضبط**: الفهرس عدد صحيح، والسعر يأتي إمّا من `snapPrice` (قيمة شمعة
 * منقولة كما هي) أو من `priceAtY` (حساب عائم). فلا هامش تقريب هنا عن قصد: هامشٌ بوحدة
 * السعر لا معنى له عبر الأدوات (0.0001 على اليورو تساوي pip، وعلى الذهب لا شيء)، والغرض
 * إسقاط ما **لم يتغيّر إطلاقاً** لا ما تغيّر قليلاً. مع المغناطيس هذا هو الشائع الغالب،
 * وبدونه تُمرَّر الحركة كما هي وهي تغيّر حقيقي يستحقّ التراجع.
 */
export function samePoint(a: ChartPoint | null | undefined, b: ChartPoint | null | undefined): boolean {
  if (!a || !b) return false;
  return a.index === b.index && a.price === b.price;
}

/**
 * النقطة الحالية لطرفٍ من رسم. `b` غير موجود على `hline`/`vline`/`note` ⇒ `null`:
 * المستدعي يعامل ذلك كـ«لا سحب لهذا الطرف» لا كنقطةٍ عند الصفر.
 */
export function drawingEnd(d: Drawing | null | undefined, end: DrawEnd): ChartPoint | null {
  if (!d) return null;
  if (end === 'a') return d.a;
  return d.b ?? null;
}

/**
 * هل تُغيّر `next` هذا الطرف فعلاً؟ نقطة مرجعية غائبة (رسم غير موجود، أو طرف `b` على رسم
 * بطرف واحد) ⇒ `false`: لا يُدفَع تراجع لسحبٍ لا هدف له.
 */
export function dragChangesDrawing(
  d: Drawing | null | undefined,
  end: DrawEnd,
  next: ChartPoint
): boolean {
  const cur = drawingEnd(d, end);
  if (!cur) return false;
  return !samePoint(cur, next);
}

/**
 * طرفا خطّ الاتجاه/الشعاع مقصوصان على النافذة **على الخطّ نفسه**.
 *
 * كان الفهرس يُقصّ على `[0, last]` بينما يبقى الارتفاع عند سعر الطرف الأصلي: خطّ من شمعة
 * خارج يسار الشاشة يُرسم من أول شمعة ظاهرة بسعر ذلك الطرف البعيد، فيصير أشدّ ميلاً ولا يمرّ
 * بالقمم التي وصلها المتداول. الآن يُحسب الارتفاع عند الفهرس المقصوص خطّياً بين الطرفين.
 * الاستيفاء بإحداثي الشاشة (`y`) لا بالسعر، فيبقى مستقيماً بالمقياس اللوغاريتمي كما يُرى.
 */
export function clipSegmentToBars(
  aIdx: number,
  aY: number,
  bIdx: number,
  bY: number,
  lastIdx: number
): { ai: number; ay: number; bi: number; by: number } {
  const hi = Math.max(0, lastIdx);
  const clamp = (i: number) => Math.max(0, Math.min(hi, i));
  const ai = clamp(aIdx);
  const bi = clamp(bIdx);
  if (aIdx === bIdx) return { ai, ay: aY, bi, by: bY };
  const yAt = (i: number) => aY + ((bY - aY) * (i - aIdx)) / (bIdx - aIdx);
  return {
    ai,
    ay: ai === aIdx ? aY : yAt(ai),
    bi,
    by: bi === bIdx ? bY : yAt(bi),
  };
}

/**
 * قطعة **الشعاع** المرسومة: كـ`clipSegmentToBars`، إلا حين يقع طرفاه كلاهما يسار النافذة والشعاع متّجه يميناً
 * (أو يمينها والشعاع متّجه يساراً — المرآة).
 * هناك يقصّ القصُّ الطرفين لخانة 0 فتصير القطعة صفرية ويختفي الشعاع — بينما امتداده ما زال يعبر الشموع
 * الظاهرة (خطّ ترند من قمّتين قبل 300 شمعة هو ما يريد المتداول رؤية أين يلتقي بالسعر الآن، كـTradingView).
 * فتُؤخذ قطعة شمعة واحدة على الخطّ نفسه من الخانة 0، ويمدّها `rayReach` حتى حافّة اللوح. `extended` ⇒
 * الطرفان المرسومان ليسا طرفي الرسم (لا مقبض عندهما).
 */
export function raySegment(
  aIdx: number,
  aY: number,
  bIdx: number,
  bY: number,
  lastIdx: number
): { ai: number; ay: number; bi: number; by: number; extended: boolean } {
  if (bIdx > aIdx && bIdx < 0 && lastIdx >= 1) {
    const yAt = (i: number) => aY + ((bY - aY) * (i - aIdx)) / (bIdx - aIdx);
    return { ai: 0, ay: yAt(0), bi: 1, by: yAt(1), extended: true };
  }
  // المرآة: شعاع متّجه **يساراً** وطرفاه يمين النافذة (شارت مُمرَّر للخلف) — كان يُقصّ لنقطة صفرية على الحافّة اليمنى.
  if (bIdx < aIdx && bIdx > lastIdx && lastIdx >= 1) {
    const yAt = (i: number) => aY + ((bY - aY) * (i - aIdx)) / (bIdx - aIdx);
    return { ai: lastIdx, ay: yAt(lastIdx), bi: lastIdx - 1, by: yAt(lastIdx - 1), extended: true };
  }
  return { ...clipSegmentToBars(aIdx, aY, bIdx, bY, lastIdx), extended: false };
}

/**
 * كم ضعفاً من القطعة (الطرف الأوّل ⇐ الثاني) يمتدّ الشعاع حتى يخرج من اللوح `[0,w]×[0,h]` — كـTradingView
 * حيث الشعاع يبلغ حافّة الشارت. كان ثابتاً 1.6: شعاع قصير على خمس شموع يتوقّف بعد ثلاث أخرى، فلا يرى
 * المتداول أين يلتقي خطّ الترند الممتدّ بالسعر القادم — وهذا سبب رسم الشعاع لا الخطّ. ≥1 دائماً (القطعة
 * نفسها تُرسم ولو كان طرفها خارج اللوح)، وقطعة صفرية ⇒ 1.
 */
export function rayReach(x1: number, y1: number, x2: number, y2: number, w: number, h: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (Math.hypot(dx, dy) < 1e-6) return 1;
  const tx = dx > 0 ? (w - x1) / dx : dx < 0 ? -x1 / dx : Infinity;
  const ty = dy > 0 ? (h - y1) / dy : dy < 0 ? -y1 / dy : Infinity;
  const t = Math.min(tx, ty);
  return Number.isFinite(t) ? Math.max(1, t) : 1;
}

export type TrendExtend = 'none' | 'past' | 'future' | 'both';
/** بترتيب `tr.mcExtendModes`، والنقر يدور عليها. */
export const TREND_EXTENDS: readonly TrendExtend[] = ['none', 'past', 'future', 'both'];

export function drawingExtend(d: Pick<Drawing, 'tool' | 'extend'>): TrendExtend {
  return d.tool === 'trend' && d.extend && TREND_EXTENDS.includes(d.extend) ? d.extend : 'none';
}

/** الامتداد التالي لخطّ الترند؛ «بلا امتداد» يحذف المفتاح كالسهم. غير الترند لا يتغيّر. */
export function withNextExtend(d: Drawing): Drawing {
  if (d.tool !== 'trend') return d;
  const cur = drawingExtend(d);
  const next = TREND_EXTENDS[(TREND_EXTENDS.indexOf(cur) + 1) % TREND_EXTENDS.length]!;
  const { extend: _drop, ...rest } = d;
  return next === 'none' ? rest : { ...rest, extend: next };
}

/**
 * قطعة خطّ الترند **الممتدّ** بالبكسل، مقصوصة للّوح `[0,w]×[0,h]` (Liang–Barsky)، أو `null` إن لم يبقَ منها شيء
 * ظاهر. `(x1,y1)` الطرف A و`(x2,y2)` الطرف B بمواضعهما الحقيقية ولو خارج اللوح (`xOf` خطّية). الماضي = نحو اليسار
 * (الزمن يسار⇐يمين بكل اللغات)، والمستقبل نحو اليمين، أيّاً كان الطرف المرسوم أولاً. خطّ رأسي (A وB بخانة واحدة)
 * لا اتجاه زمنياً له ⇒ لا يمتدّ. ما يُرسم وما يُلمس من هذه الدالة نفسها.
 */
export function extendedSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  w: number,
  h: number,
  extend: TrendExtend
): { x1: number; y1: number; x2: number; y2: number } | null {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;
  if (Math.abs(dx) > 1e-9) {
    // t يزيد نحو B؛ إن كان B يسار A فالمستقبل نحو t السالب.
    const futureUp = dx > 0;
    const past = extend === 'past' || extend === 'both';
    const future = extend === 'future' || extend === 'both';
    if (future) {
      if (futureUp) t1 = Infinity;
      else t0 = -Infinity;
    }
    if (past) {
      if (futureUp) t0 = -Infinity;
      else t1 = Infinity;
    }
  }
  const clip = (p: number, q: number): boolean => {
    if (Math.abs(p) < 1e-12) return q >= 0;
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
    return true;
  };
  if (!clip(-dx, x1) || !clip(dx, w - x1) || !clip(-dy, y1) || !clip(dy, h - y1)) return null;
  if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 < t0) return null;
  return { x1: x1 + t0 * dx, y1: y1 + t0 * dy, x2: x1 + t1 * dx, y2: y1 + t1 * dy };
}

/** ختم الزمن لخانة (`stampAtIndex` مربوطة بالسلسلة والفريم) — يُمرَّر لتبقى الدالة خالصة. */
export type StampAt = (index: number) => { time: number; ahead?: number; aheadStep?: number; sub?: number } | null;

/**
 * تحريك الرسم **كلّه** (سحب جسمه لا مقبضه) كما في TradingView: الطرفان بالإزاحة نفسها بالشموع
 * وبالسعر، فيبقى الشكل (ميل الترند، ارتفاع المستطيل، مسافة وقف شراء/بيع ونسبته) كما هو.
 *
 * - الإزاحة تُحسب دائماً من **الرسم كما كان عند بدء السحب** لا من آخر إطار: تراكم الإطارات كان
 *   سيجمع أخطاء التقريب، والعودة بالإصبع لمكانه الأوّل تعيد الرسم لمكانه حرفياً.
 * - `priceOf` تنقل السعر بإزاحة الشاشة (بمقياس السعر الجاري: خطّي أو لوغاريتمي) — بلا مغناطيس،
 *   فالجذب لأقرب O/H/L/C لكل طرف وحده كان سيشوّه الشكل الذي يريد المتداول نقله كما هو.
 * - لا خانة قبل أوّل السلسلة: الإزاحة يساراً تتوقّف حين يبلغ أقدم الطرفين الخانة 0 (وإن كان قبلها أصلاً: أحدثهما).
 * - كل نقطة تُختم من جديد (`stamp`): الزمن القديم لو بقي لأعاد الإرساء بين الفريمات الرسمَ لمكانه
 *   الأوّل عند أوّل تبديل فريم.
 * - إلا تحريكاً **رأسياً بحتاً** (0 شمعة): الختم يبقى كما هو والسعر وحده يتغيّر. على Renko/Range/Kagi/P&F
 *   نقطةٌ رُسمت على الشموع تقع على آخر لبنة قبل زمنها، فإعادة ختمها كانت تستبدل زمن شمعتها الحقيقي بزمن
 *   تلك اللبنة الأقدم: ▲ واحدة ثم العودة للشموع ⇒ طرفا الترند قفزا لشموع سابقة (وحُفظ ذلك).
 * - `scaleWidth` (المقياس اللوغاريتمي): عرض القناة `width` إزاحة **سعرية** ثابتة، لكن التحريك هناك ضربٌ لا جمع ⇒
 *   قناة ذهب 2000/2100 بعرض 100 سُحبت لأعلى 25% ضاقت ~20% على الشاشة (ولأسفل اتّسعت). حينها يُنقل مقبض العرض
 *   (`channelHandlePrice`) بـ`priceOf` كالطرفين ويُشتقّ العرض منه ⇒ ×1.25 تماماً والشكل كما هو. بالخطّي لا يُمسّ.
 */
export function translateDrawing(
  orig: Drawing,
  dIndex: number,
  priceOf: (price: number) => number,
  stamp: StampAt,
  scaleWidth = false
): Drawing {
  const minIndex = Math.min(orig.a.index, orig.b?.index ?? orig.a.index);
  const maxIndex = Math.max(orig.a.index, orig.b?.index ?? orig.a.index);
  // طرف قبل أوّل شمعة محمَّلة أصلاً (ترند قديم خرج طرفه من نافذة الجلب): الحدّ كان −0 فلا يتحرّك يساراً
  // إطلاقاً. هناك الحدّ ألّا يعبر **أحدث** الطرفين الخانة 0 (الختم قبل السلسلة بزمنه صحيح).
  const floor = minIndex >= 0 ? -minIndex : -Math.max(0, maxIndex);
  const di = Math.max(Math.round(dIndex), floor);
  const move = (p: ChartPoint): ChartPoint => {
    // نقطة بلا ختم (رسم قديم) تُختم كالمعتاد كي تُرسى بين الفريمات.
    if (di === 0 && p.time != null) return { ...p, price: priceOf(p.price) };
    const index = p.index + di;
    const price = priceOf(p.price);
    const s = stamp(index);
    return s == null ? { index, price } : { index, price, ...s };
  };
  if (!orig.b) return { ...orig, a: move(orig.a) };
  const a = move(orig.a);
  const b = move(orig.b);
  if (scaleWidth && orig.tool === 'channel' && orig.width != null && Number.isFinite(orig.width)) {
    const handle = (orig.a.price + orig.b.price) / 2 + orig.width;
    const w = priceOf(handle) - (a.price + b.price) / 2;
    if (Number.isFinite(w)) return { ...orig, a, b, width: w };
  }
  return { ...orig, a, b };
}

/** هل غيّر التحريك موضع الرسم؟ (يُسقط كتابة لا تغيّر شيئاً — راجع رأس الملف). */
export function sameDrawingPlace(x: Drawing | null | undefined, y: Drawing | null | undefined): boolean {
  if (!x || !y) return false;
  return samePoint(x.a, y.a) && (x.b == null ? y.b == null : samePoint(x.b, y.b));
}

/**
 * أسهم لوحة المفاتيح على رسم محدَّد (الويب، كـTradingView): ←/→ شمعة، ↑/↓ خطوة سعر (pip للأزواج
 * والمعادن، وإلا بكسل واحد من المحور). Shift ⇒ ×10. غير الأسهم ⇒ null. الإزاحة تُطبَّق بـ`translateDrawing`
 * فيبقى الشكل كما هو (ميل الترند، مسافة الوقف) ويُختم كل طرف من جديد.
 */
export function arrowNudge(key: string, shift: boolean): { bars: number; steps: number } | null {
  const k = shift ? 10 : 1;
  if (key === 'ArrowLeft') return { bars: -k, steps: 0 };
  if (key === 'ArrowRight') return { bars: k, steps: 0 };
  if (key === 'ArrowUp') return { bars: 0, steps: k };
  if (key === 'ArrowDown') return { bars: 0, steps: -k };
  return null;
}

/**
 * الحرف اللاتيني لاختصار Ctrl/⌘ (Z تراجع، Y إعادة) أيّاً كان تخطيط لوحة المفاتيح. `event.key` بلوحة عربية أو
 * كردية حرفٌ عربي (Ctrl+Z ⇒ «ئ») فكان التراجع لا يعمل أصلاً لمتداولينا الأساسيين؛ الموضع الفيزيائي
 * (`event.code` «KeyZ») هو الثابت. لكن الحرف اللاتيني يُقدَّم إن وُجد: بـAZERTY الـZ بموضع «KeyW» — فالمتداول
 * يضغط الحرف المكتوب على مفتاحه.
 */
export function shortcutLetter(key: string, code: string | undefined): string {
  if (/^[a-z]$/i.test(key)) return key.toLowerCase();
  const m = /^Key([A-Z])$/.exec(code ?? '');
  return m ? m[1]!.toLowerCase() : '';
}

/**
 * اختصارات أدوات الرسم على الويب: Alt+حرف (الحرف من `shortcutLetter` فيعمل بلوحة عربية/كردية، وبـOption على ماك حيث
 * `event.key` رمز خاص «†»). بلا اختصار كان كل خطّ أفقي يعني رحلة إلى الشريط ثم العودة للشمعة — والمتداول على الويب
 * يرسم عشرات المستويات بالجلسة. Alt وحده: Ctrl/⌘ محجوزان للتراجع/الإعادة والمتصفّح، والحرف المجرّد يسرق الكتابة.
 */
export const DRAW_TOOL_SHORTCUTS: Readonly<Record<string, DrawTool>> = {
  t: 'trend',
  h: 'hline',
  v: 'vline',
  // مستطيل = B (box) لا R: Alt+R إعادة العرض (كـAUTO، `resetChartView`)؛ بـR كان المفتاح يفعل الاثنين معاً.
  b: 'rect',
  f: 'fib',
  c: 'channel',
  m: 'measure',
  n: 'note',
};

export function drawToolShortcut(
  key: string,
  code: string | undefined,
  mods: { alt: boolean; ctrl: boolean; meta: boolean; shift: boolean }
): DrawTool | null {
  if (!mods.alt || mods.ctrl || mods.meta || mods.shift) return null;
  return DRAW_TOOL_SHORTCUTS[shortcutLetter(key, code)] ?? null;
}

/** «Alt+T» لتلميح الأداة على الويب؛ فارغ لأداة بلا اختصار. */
export function drawToolShortcutLabel(tool: DrawTool): string {
  const letter = Object.keys(DRAW_TOOL_SHORTCUTS).find((k) => DRAW_TOOL_SHORTCUTS[k] === tool);
  return letter ? `Alt+${letter.toUpperCase()}` : '';
}

/**
 * قفل الرسم أو فكّه. الفكّ يحذف المفتاح لا يكتب `false` — فرسمٌ لم يُقفل قطّ ورسمٌ فُكّ قفله متطابقان بالحفظ
 * (ولا يكبر JSON كل الرسوم بحقل ميت).
 */
export function withDrawingLock(d: Drawing, locked: boolean): Drawing {
  if (locked) return { ...d, locked: true };
  const { locked: _drop, ...rest } = d;
  return rest;
}

/** رأس السهم على خطّ الترند فقط؛ الإزالة تحذف المفتاح (الرسومات المحفوظة القديمة تبقى كما هي حرفياً). */
export function withDrawingArrow(d: Drawing, arrow: boolean): Drawing {
  if (arrow && d.tool === 'trend') return { ...d, arrow: true };
  const { arrow: _drop, ...rest } = d;
  return rest;
}

/** عكس فيبو (0% ↔ 100%) — على فيبو فقط؛ الإلغاء يحذف المفتاح كالسهم والقفل. */
export function withDrawingFibReverse(d: Drawing, reversed: boolean): Drawing {
  if (reversed && d.tool === 'fib') return { ...d, reversed: true };
  const { reversed: _drop, ...rest } = d;
  return rest;
}

/** إزاحة النسخة عن أصلها بالبكسل: تكفي ليُرى أنّ رسماً ثانياً ظهر، ولا تبعده عن منطقته. */
export const CLONE_SHIFT_PX = 24;

/**
 * أين توضع **نسخة** الرسم المحدَّد (زرّ «نسخة»): نسخةٌ فوق أصلها حرفياً (كـTradingView) لا تُرى بالهاتف، فيظنّ
 * المتداول أنّ الزرّ لم يعمل ثم يسحب الأصل. فتُزاح `CLONE_SHIFT_PX` رأسياً — لأسفل، أو لأعلى إن كان الرسم
 * بالنصف السفلي كي لا تخرج من اللوح — والخطّ الرأسي (لا سعر له) ثلاث شموع يميناً. `px` موجب = لأسفل بالشاشة.
 */
export function cloneShift(tool: Drawing['tool'], inLowerHalf: boolean): { bars: number; px: number } {
  if (tool === 'vline') return { bars: 3, px: 0 };
  return { bars: 0, px: inLowerHalf ? -CLONE_SHIFT_PX : CLONE_SHIFT_PX };
}

/**
 * الضغط المطوَّل على ▲▼◀▶ (chart15): تكرار كل `NUDGE_REPEAT_MS` بعد `NUDGE_HOLD_DELAY_MS`. أوّل
 * `NUDGE_REPEAT_SLOW_TICKS` تكراراً خطوة واحدة (ضبط دقيق)، ثم خمس خطوات لكل تكرار — وقف على بعد 40 pip
 * يُنقل بثانيتين بدل 40 نقرة. السلسلة كلّها تراجع واحد.
 */
export const NUDGE_HOLD_DELAY_MS = 350;
export const NUDGE_REPEAT_MS = 90;
export const NUDGE_REPEAT_SLOW_TICKS = 10;
export const NUDGE_REPEAT_FAST_STEP = 5;

/** مُضاعِف الخطوة للتكرار رقم `tick` (1 أوّل تكرار بعد الخطوة الأولى). */
export function nudgeRepeatMultiplier(tick: number): number {
  return tick > NUDGE_REPEAT_SLOW_TICKS ? NUDGE_REPEAT_FAST_STEP : 1;
}

/** سعر مُزاح بـ`steps` pip، مُقرَّب لمنازل الـpip +1 (منازل عرض الزوج) فلا يتراكم ضجيج الفاصلة العائمة. */
export function nudgePipPrice(price: number, steps: number, pipSize: number): number {
  const decimals = Math.max(0, Math.round(-Math.log10(pipSize)) + 1);
  return Number((price + steps * pipSize).toFixed(decimals));
}

/**
 * أيّ محورَي الإزاحة (▲▼ سعر، ◀▶ زمن) يُرى على الأداة. الأفقي بعرض اللوح بلا مقبض ⇒ زمنه لا يُرى؛ الرأسي بطول
 * اللوح ⇒ سعره لا يُرى. كانت ◀▶ على الأفقي و▲▼ على الرأسي تغيّر المرساة بلا أيّ أثر مرئي، وكلّ ضغطة لقطة تراجع
 * وحفظ ⇒ «تراجع» لا يفعل شيئاً ظاهراً، والضغط المطوَّل يملأ سجلّ التراجع كلّه.
 */
export function nudgeAxes(tool: DrawTool): { time: boolean; price: boolean } {
  return { time: tool !== 'hline', price: tool !== 'vline' };
}
