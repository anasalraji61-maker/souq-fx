/**
 * حفظ رسومات الشارت المؤجَّل — طابور يعرف **لأيّ رمز/فريم** حمولته.
 *
 * السبب: الحفظ مؤجَّل ‎400ms‎ (فلا تُكتب كل نقطة أثناء السحب)، بينما تبديل الرمز أو
 * الفريم يغيّر `series.symbol` **فوراً** ويحمّل الرسومات الجديدة **لا تزامنياً**. بين
 * اللحظتين كان التأجيل يقع بلا صاحب، فينشأ خطآن حقيقيّان:
 *
 * 1) **كتابة بمفتاح الرمز الخطأ**: مؤقّت مجدوَل برسومات اليورو ينطلق بعد التبديل
 *    فيكتبها تحت مفتاح الذهب متى سبق ‎400ms‎ انتهاءَ `loadDrawings` (تخزين بارد أو
 *    جهاز مشغول). النتيجة خطوط دعم اليورو تظهر على شارت الذهب — وتبقى محفوظة.
 * 2) **ضياع آخر ما رُسم**: من يرسم خطّاً ثم يبدّل الفريم خلال أقلّ من ‎400ms‎ كان
 *    المؤقّت يُلغى بتغيّر التبعيات ولا يُكتب شيء — الخطّ يختفي بلا أثر.
 *
 * الطابور يحمل مفتاح حمولته معه، و`flush` تكتب ما تأجّل **فوراً** قبل استبدال
 * الحمولة عند التبديل. خالص من React ومن التخزين: الكتابة والمؤقّتات مُحقَنة.
 */
import type { Drawing } from './types';

/** تأجيل الكتابة — يكفي لابتلاع سحبة كاملة ولا يُحسّ به المتداول. */
export const DRAWINGS_SAVE_DELAY_MS = 400;

/**
 * مفتاح الرمز/الفريم. الفاصل `\u0000` لا يَرِد برمز ولا بفريم، فلا يلتبس
 * `('EURUSD','1H')` بـ`('EUR','USD1H')`.
 */
export function drawingsKey(symbol: string, timeframe: string): string {
  return `${symbol}\u0000${timeframe}`;
}

export type DrawingsSaveFn = (symbol: string, timeframe: string, drawings: Drawing[]) => void;

/** مؤقّتات مُحقَنة — الافتراضي مؤقّتات البيئة، وبالاختبار مؤقّتات وهمية. */
export interface DrawingsTimers {
  set: (fn: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
}

const realTimers: DrawingsTimers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

export class DrawingsSaveQueue {
  private pending: {
    key: string;
    symbol: string;
    timeframe: string;
    drawings: Drawing[];
  } | null = null;
  private handle: unknown = null;

  constructor(
    private readonly save: DrawingsSaveFn,
    private readonly timers: DrawingsTimers = realTimers,
    private readonly delayMs: number = DRAWINGS_SAVE_DELAY_MS
  ) {}

  /** يؤجّل كتابة هذه الحمولة، ويُلغي ما كان مؤجَّلاً قبلها (آخر حالة تكفي). */
  schedule(symbol: string, timeframe: string, drawings: Drawing[]): void {
    this.cancelTimer();
    this.pending = { key: drawingsKey(symbol, timeframe), symbol, timeframe, drawings };
    this.handle = this.timers.set(() => {
      this.handle = null;
      this.run();
    }, this.delayMs);
  }

  /**
   * يكتب ما تأجّل فوراً — يُستدعى عند تبديل الرمز/الفريم **قبل** استبدال الحمولة،
   * فتُكتب بمفتاحها هي. بلا شيء مؤجَّل لا يفعل شيئاً (لا كتابة فارغة).
   */
  flush(): void {
    this.cancelTimer();
    this.run();
  }

  /** يُسقط ما تأجّل بلا كتابة — لتفكيك المكوّن. */
  cancel(): void {
    this.cancelTimer();
    this.pending = null;
  }

  /** مفتاح ما ينتظر الكتابة، أو null — للتشخيص والاختبار. */
  pendingKey(): string | null {
    return this.pending ? this.pending.key : null;
  }

  private run(): void {
    const p = this.pending;
    this.pending = null;
    if (p) this.save(p.symbol, p.timeframe, p.drawings);
  }

  private cancelTimer(): void {
    if (this.handle != null) {
      this.timers.clear(this.handle);
      this.handle = null;
    }
  }
}

/**
 * بصمة الرسومات **بلا الفهرس المشتقّ**: نقطة لها زمن فهرسها يُعاد حسابه من السلسلة
 * (`drawingAnchors.ts`)، ويختلف بين الفريمات وكلّما زحفت نافذة الخادم شمعة. المقارنة
 * بالبصمة تمنع (1) كتابة التخزين عند كل شمعة جديدة بلا تعديل من المتداول، و(2) ارتداداً
 * بين شارتَين على الرمز نفسه بفريمين: كلٌّ يعيد الفهرسة على شموعه فيكتب فيُبلَّغ الآخر.
 */
export function drawingsSignature(drawings: readonly Drawing[]): string {
  return JSON.stringify(drawings, function (this: { time?: unknown }, key: string, value: unknown) {
    // نقطة بلا زمن: فهرسها هو الحقيقة فيبقى بالبصمة.
    return key === 'index' && typeof this.time === 'number' && Number.isFinite(this.time)
      ? undefined
      : value;
  });
}
