import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSaveErrorSignal } from './saveErrorSignal';

export type TerminalLayout = {
  id: string;
  name: string;
  dxyTf: string;
  frameSymbols: [string, string, string];
  frameTfs: [string, string, string];
  frameSizes: ['small' | 'medium' | 'large', 'small' | 'medium' | 'large', 'small' | 'medium' | 'large'];
};

const KEY = 'matrix.layouts.v1';

/** سقف القائمة المحلية. كان 12: حفظ التخطيط الثالث عشر يطرد الأقدم بصمت (يظهر باللوحة ثم يختفي عند فتحها
 *  التالي). التخطيط بضع عشرات من البايتات، فالسقف حارس نموّ لا حدّ يلمسه متداول. */
export const MAX_LAYOUTS = 60;

/** رمز حالة ثابت لا نص معروض — الترجمة بطبقة العرض عبر `t[code]` (نفس المبدأ الموثَّق
 *  بـchart/dataSource.ts: لا تقارن الواجهة نصاً حرفياً). أسماء الرموز مطابقة لمفاتيح
 *  Dict بـi18n/locales.ts. */
export type LayoutsSaveErrorCode = 'layoutSaveFailed' | 'layoutDeleteFailed';

const saveError = createSaveErrorSignal<LayoutsSaveErrorCode>();
const setSaveError = saveError.set;

export const subscribeLayoutsSaveError = saveError.subscribe;
export const getLayoutsSaveError = saveError.get;

/**
 * كل كتابة (حفظ/حذف/دمج الخادم) قراءةٌ ثم كتابة للقائمة كاملة — فتُنفَّذ بالتسلسل. كان حفظ
 * تخطيط أثناء انتظار دمج الخادم يُمحى: الدمج قرأ القائمة قبل الحفظ ثم كتبها فوقه.
 */
let writeChain: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.catch(() => undefined);
  return run;
}

/** محذوفات هذه الجلسة — استجابة خادم طُلبت قبل الحذف تحملها بعد، فلا يُعيدها الدمج. */
const deletedIds = new Set<string>();

export async function loadLayouts(): Promise<TerminalLayout[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TerminalLayout[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLayout(layout: TerminalLayout): Promise<void> {
  deletedIds.delete(layout.id);
  return serial(() => saveLayoutNow(layout));
}

async function saveLayoutNow(layout: TerminalLayout): Promise<void> {
  try {
    const all = await loadLayouts();
    const idx = all.findIndex((l) => l.id === layout.id);
    if (idx >= 0) all[idx] = layout;
    else all.unshift(layout);
    await AsyncStorage.setItem(KEY, JSON.stringify(all.slice(0, MAX_LAYOUTS)));
    setSaveError(null);
  } catch {
    setSaveError('layoutSaveFailed');
  }
}

export function deleteLayout(id: string): Promise<void> {
  deletedIds.add(id);
  return serial(() => deleteLayoutNow(id));
}

async function deleteLayoutNow(id: string): Promise<void> {
  try {
    const all = (await loadLayouts()).filter((l) => l.id !== id);
    await AsyncStorage.setItem(KEY, JSON.stringify(all));
    setSaveError(null);
  } catch {
    setSaveError('layoutDeleteFailed');
  }
}

const SIZES = ['small', 'medium', 'large'] as const;

/** حمولة تخطيط من الخادم → TerminalLayout صالح أو null (صف تالف/قديم لا يكسر الشاشة الرئيسية). */
export function parseServerLayout(payload: unknown): TerminalLayout | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  const str3 = (v: unknown): v is [string, string, string] =>
    Array.isArray(v) && v.length === 3 && v.every((x) => typeof x === 'string' && x.length > 0);
  if (typeof p.id !== 'string' || !p.id || p.id === 'default') return null;
  if (typeof p.name !== 'string' || !p.name.trim()) return null;
  if (!str3(p.frameSymbols) || !str3(p.frameTfs)) return null;
  const sizes =
    Array.isArray(p.frameSizes) &&
    p.frameSizes.length === 3 &&
    p.frameSizes.every((x) => (SIZES as readonly unknown[]).includes(x))
      ? (p.frameSizes as TerminalLayout['frameSizes'])
      : (['small', 'medium', 'large'] as TerminalLayout['frameSizes']);
  return {
    id: p.id,
    name: p.name,
    dxyTf: typeof p.dxyTf === 'string' ? p.dxyTf : '15m',
    frameSymbols: p.frameSymbols,
    frameTfs: p.frameTfs,
    frameSizes: sizes,
  };
}

/**
 * يضيف للقائمة المحلية تخطيطات الحساب المحفوظة بالخادم وغير الموجودة محلياً (تسجيل الدخول على جهاز آخر،
 * إعادة تثبيت التطبيق) — بمعرّفها المحلي أو باسمها، فلا نسخ مكرّرة. يعيد القائمة المدمجة (≤ MAX_LAYOUTS).
 */
export function mergeServerLayouts(payloads: unknown[]): Promise<TerminalLayout[]> {
  return serial(() => mergeServerLayoutsNow(payloads));
}

async function mergeServerLayoutsNow(payloads: unknown[]): Promise<TerminalLayout[]> {
  const local = await loadLayouts();
  const ids = new Set(local.map((l) => l.id));
  const names = new Set(local.map((l) => l.name));
  const added: TerminalLayout[] = [];
  for (const raw of payloads) {
    const l = parseServerLayout(raw);
    if (!l || ids.has(l.id) || names.has(l.name) || deletedIds.has(l.id)) continue;
    ids.add(l.id);
    names.add(l.name);
    added.push(l);
  }
  if (!added.length) return local;
  const merged = [...local, ...added].slice(0, MAX_LAYOUTS);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(merged));
  } catch {
    /* العرض يكفي — الحفظ المحلي يُعاد عند أول حفظ تالٍ */
  }
  return merged;
}

export const DEFAULT_LAYOUT: TerminalLayout = {
  id: 'default',
  name: 'افتراضي',
  dxyTf: '15m',
  frameSymbols: ['EURUSD', 'GBPUSD', 'XAUUSD'],
  frameTfs: ['15m', '1H', '4H'],
  frameSizes: ['small', 'medium', 'large'],
};
