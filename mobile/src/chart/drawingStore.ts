import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSaveErrorSignal } from './saveErrorSignal';
import type { Drawing } from './types';
import { timeframeStepSec } from './dataSource';

const PREFIX = 'matrix.drawings.v1';

/** رمز حالة ثابت لا نص معروض — الترجمة بطبقة العرض عبر `t[code]` (نفس المبدأ الموثَّق
 *  بـchart/dataSource.ts: لا تقارن الواجهة نصاً حرفياً). أسماء الرموز مطابقة لمفاتيح
 *  Dict بـi18n/locales.ts. */
export type DrawingsSaveErrorCode = 'drawingsSaveFailed' | 'drawingsDeleteFailed' | 'drawingsReadFailed';

const saveError = createSaveErrorSignal<DrawingsSaveErrorCode>();
const setSaveError = saveError.set;

export const subscribeDrawingsSaveError = saveError.subscribe;

/**
 * **الرسومات للرمز لا للفريم.** كانت تُحفظ تحت `v1.<رمز>.<فريم>`: خطّ دعم رُسم على 4H
 * يختفي حين ينزل المتداول للساعة ليختار الدخول — وهو أكثر ما يفعله (تحليل على الأكبر،
 * تنفيذ على الأصغر). الآن مفتاح واحد للرمز `v2.<رمز>`، والنقاط مرسوّة بالزمن
 * (`drawingAnchors.ts`) فتجد شموعها على أي فريم.
 *
 * الترحيل: أوّل تحميل لرمز بلا مفتاح v2 يجمع مفاتيح v1 لكل فريماته — الفريم المفتوح
 * كاملاً، والبقيّة ما كانت نقاطه مختومة بزمن فقط (فهرس بلا زمن يخصّ سلسلة فريم آخر ولا
 * معنى له هنا). مفاتيح v1 لا تُحذف (رجوع آمن)، ولا تعود بعد أوّل كتابة v2 — حتى «مسح الكل»
 * يكتب قائمة فارغة لا يحذف المفتاح، وإلا بُعثت رسومات v1 عند التحميل التالي.
 */
const PREFIX_V2 = 'matrix.drawings.v2';

function keyV2(symbol: string) {
  return `${PREFIX_V2}.${symbol}`;
}

function keyV1(symbol: string, timeframe: string) {
  return `${PREFIX}.${symbol}.${timeframe}`;
}

/**
 * آخر قائمة معروفة لكل رمز. التحميل يقرأ منها قبل التخزين: تبديل الفريم يكتب القائمة
 * (`flush`) ثم يحمّلها فوراً، وترتيب `setItem`/`getItem` غير المتزامنَين غير مضمون — بلا
 * هذا قد يقرأ الفريم الجديد القائمة قبل آخر خطّ رُسم.
 */
const cache = new Map<string, Drawing[]>();

/** مستمعو رمز: شارتان على الرمز نفسه (نافذة التركيز فوق الشاشة) يريان الرسم نفسه. */
type DrawingsListener = { owner: unknown; cb: (drawings: Drawing[]) => void };
const listeners = new Map<string, Set<DrawingsListener>>();

/**
 * يُبلَّغ `cb` بكل كتابة لرسومات `symbol` من **مالك آخر** (`owner` يميّز الشارت الكاتب
 * فلا يُعاد إليه ما كتبه للتوّ).
 */
export function subscribeDrawings(
  symbol: string,
  owner: unknown,
  cb: (drawings: Drawing[]) => void
): () => void {
  const entry: DrawingsListener = { owner, cb };
  let set = listeners.get(symbol);
  if (!set) {
    set = new Set();
    listeners.set(symbol, set);
  }
  set.add(entry);
  return () => {
    const cur = listeners.get(symbol);
    if (!cur) return;
    cur.delete(entry);
    if (!cur.size) listeners.delete(symbol);
  };
}

function publish(symbol: string, drawings: Drawing[], owner: unknown) {
  cache.set(symbol, drawings);
  const set = listeners.get(symbol);
  if (!set) return;
  for (const l of [...set]) {
    if (owner != null && l.owner === owner) continue;
    try {
      l.cb(drawings);
    } catch {
      /* ignore */
    }
  }
}

function parseList(raw: string | null | undefined): Drawing[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Drawing[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function timed(d: Drawing): boolean {
  const ok = (p: Drawing['a'] | undefined) => p == null || (p.time != null && Number.isFinite(p.time));
  return ok(d.a) && ok(d.b);
}

/** نقاط المستقبل من فريم آخر: `ahead` عُدّ بخطوة ذلك الفريم (`aheadStep`). */
function withAheadStep(d: Drawing, stepSec: number): Drawing {
  const fix = (p: Drawing['a']) =>
    p.ahead != null && p.aheadStep == null ? { ...p, aheadStep: stepSec } : p;
  const a = fix(d.a);
  const b = d.b ? fix(d.b) : d.b;
  if (a === d.a && b === d.b) return d;
  return b === undefined ? { ...d, a } : { ...d, a, b };
}

async function migrateV1(symbol: string, timeframe: string): Promise<Drawing[]> {
  const head = `${PREFIX}.${symbol}.`;
  let keys: readonly string[] = [];
  try {
    keys = (await AsyncStorage.getAllKeys()).filter(
      (k) => k.startsWith(head) && !k.slice(head.length).includes('.')
    );
  } catch {
    keys = [];
  }
  const current = keyV1(symbol, timeframe);
  if (!keys.includes(current)) keys = [current, ...keys];
  let pairs: readonly (readonly [string, string | null])[] = [];
  try {
    pairs = (await AsyncStorage.multiGet([...keys])) as readonly (readonly [string, string | null])[];
  } catch {
    return [];
  }
  const out: Drawing[] = [];
  const seen = new Set<string>();
  // الفريم المفتوح أوّلاً وكاملاً (نقاطه بلا زمن تُختم على شموعه هو).
  const ordered = [...pairs].sort((x, y) => (x[0] === current ? -1 : y[0] === current ? 1 : 0));
  for (const [k, raw] of ordered) {
    const list = parseList(raw);
    if (!list) continue;
    const tf = k.slice(head.length);
    const own = k === current;
    for (const d of list) {
      if (!d || typeof d.id !== 'string' || seen.has(d.id)) continue;
      if (!own && !timed(d)) continue;
      seen.add(d.id);
      // الفريم المفتوح أيضاً: `ahead` بلا `aheadStep` كان يُعدّ بفريم **العرض** لاحقاً ⇒ ترند رُسم طرفه 5 شموع
      // بعد آخر شمعة على 1H يصير 5 أيام على D1 بعد أوّل تبديل (الختم الجديد يحمل خطوته دائماً).
      out.push(withAheadStep(d, timeframeStepSec(tf)));
    }
  }
  return out;
}

/**
 * رموز تعذّرت قراءة مفتاحها (خطأ تخزين عابر). كانت القراءة الفاشلة تُعامل كـ«لا رسومات» وتُخبَّأ `[]` لبقية الجلسة،
 * فأوّل خطّ يُرسم يكتب `[خط]` فوق كل رسومات الرمز المحفوظة. الآن لا تُخبَّأ، والكتابة تعيد القراءة أولاً وتدمج.
 */
const unread = new Set<string>();

/** القائمة المخبّأة للرمز إن قُرئت بهذه الجلسة، بلا انتظار — `null` ⇒ تحتاج `loadDrawings`. */
export function peekDrawings(symbol: string): Drawing[] | null {
  return cache.get(symbol) ?? null;
}

export async function loadDrawings(symbol: string, timeframe: string): Promise<Drawing[]> {
  const hit = cache.get(symbol);
  if (hit) return hit;
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(keyV2(symbol));
  } catch {
    unread.add(symbol);
    // launch172a: كانت صامتة — شارت بلا رسوماته يبدو كأنها مُحيت.
    setSaveError('drawingsReadFailed');
    return cache.get(symbol) ?? [];
  }
  unread.delete(symbol);
  if (saveError.get() === 'drawingsReadFailed' && !unread.size) setSaveError(null);
  let list = parseList(raw);
  if (!list && raw) {
    // JSON تالف: نسخة احتياطية قبل أن تكتب أوّل كتابة فوقه.
    AsyncStorage.setItem(`${keyV2(symbol)}.corrupt`, raw).catch(() => undefined);
  }
  if (!list) list = await migrateV1(symbol, timeframe);
  // كتابة وصلت أثناء القراءة أحدث من المقروء.
  const raced = cache.get(symbol);
  if (raced) return raced;
  cache.set(symbol, list);
  return list;
}

/** `owner`: الشارت الكاتب — لا يُبلَّغ هو بكتابته (`subscribeDrawings`). */
export async function saveDrawings(
  symbol: string,
  drawings: Drawing[],
  owner?: unknown
): Promise<void> {
  publish(symbol, drawings, owner);
  try {
    if (unread.has(symbol)) {
      // لم تُقرأ المحفوظة قطّ ⇒ لم يرَها المتداول ولم يحذف منها شيئاً: تُضاف لما رسمه. قراءة فاشلة مجدداً ترمي ⇒ لا كتابة.
      const stored = parseList(await AsyncStorage.getItem(keyV2(symbol))) ?? [];
      // رسمٌ أو مسحٌ أحدث وصل أثناء القراءة ⇒ الكتابة والدمج له (و`unread` باقٍ حتى يدمج هو): كان الدمج يُبنى من
      // القائمة **القديمة** ويُنشر للشارت الكاتب نفسه فيمحو الخطّ الجديد من الشاشة ويلغي حفظه، ويعيد ما مُسح.
      if (cache.get(symbol) !== drawings) return;
      unread.delete(symbol);
      const ids = new Set(drawings.map((d) => d.id));
      const kept = stored.filter((d) => d && !ids.has(d.id));
      if (kept.length) {
        drawings = [...drawings, ...kept];
        publish(symbol, drawings, undefined);
      }
    }
    await AsyncStorage.setItem(keyV2(symbol), JSON.stringify(drawings));
    // رمز آخر ما زالت رسوماته غير مقروءة ⇒ يبقى تنبيهه.
    setSaveError(unread.size ? 'drawingsReadFailed' : null);
  } catch {
    setSaveError('drawingsSaveFailed');
  }
}

/** مسح رسومات الرمز على **كل** فريماته — قائمة فارغة لا حذف مفتاح (راجع رأس القسم). */
export async function clearDrawings(symbol: string, owner?: unknown): Promise<void> {
  publish(symbol, [], owner);
  unread.delete(symbol);
  try {
    await AsyncStorage.setItem(keyV2(symbol), '[]');
    setSaveError(unread.size ? 'drawingsReadFailed' : null);
  } catch {
    setSaveError('drawingsDeleteFailed');
  }
}
