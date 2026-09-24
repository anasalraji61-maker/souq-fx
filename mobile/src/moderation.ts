import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/**
 * حظر المستخدمين محلياً — شرط أبل 1.2 (App Store Review Guideline 1.2: المحتوى الذي ينشئه
 * المستخدمون يلزمه إبلاغ + «حظر المستخدمين المسيئين») وسياسة Google Play المماثلة.
 *
 * الحظر محلي على الجهاز (AsyncStorage) ويعمل للمجهول أيضاً: رسائل المحظور بالمجموعة وأفكاره
 * بالتصويت تختفي عندك فوراً، ولا يحتاج خادماً. البلاغ (api.report) منفصل ويصل للخادم.
 * حالة مشتركة بين اللوحتين (المجموعة + الأفكار) عبر مستمعين — حظر من إحداهما يُخفي من الأخرى.
 * نفس نمط `onboarding.ts`/`achievements.ts`: فشل التخزين لا يجوز أن يُعطّل الواجهة.
 */
const KEY = 'matrix.moderation.blockedUsers.v1';
const MAX_BLOCKED = 500;

let cache: string[] | null = null;
let loading: Promise<string[]> | null = null;
/**
 * قراءة القرص فشلت (خطأ تخزين، لا JSON تالف): القائمة بالذاكرة تبدأ فارغة، و**لا تُكتب فوق المحفوظة** —
 * كان أول حظر بعد فشلٍ عابر يحفظ «[الاسم]» وحده فتُمسح قائمة المتداول كلّها بصمت. الحظر يعمل لهذه الجلسة.
 */
let diskUnread = false;
const listeners = new Set<(list: string[]) => void>();

const norm = (name: string) => name.trim().toLowerCase();

/**
 * القائمة كما تُقرأ من القرص → أسماء مطبَّعة (`norm`) بلا فراغ ولا تكرار، آخر `MAX_BLOCKED` منها.
 * `isBlocked` يقارن بالاسم **مطبَّعاً**، فاسمٌ محفوظ بحروف كبيرة أو بمسافة (تعديل يدوي، نسخة احتياطية،
 * إصدار لاحق يكتب بشكل آخر) كان يبقى بالقائمة ولا يُحظر أبداً — وحظره ثانيةً يُضيف نسخة ثانية.
 */
export function sanitizeBlocked(parsed: unknown): string[] {
  if (!Array.isArray(parsed)) return [];
  const out: string[] = [];
  for (const x of parsed) {
    if (typeof x !== 'string') continue;
    const n = norm(x);
    if (n && !out.includes(n)) out.push(n);
  }
  return out.slice(-MAX_BLOCKED);
}

function loadBlocked(): Promise<string[]> {
  if (cache) return Promise.resolve(cache);
  if (!loading) {
    loading = AsyncStorage.getItem(KEY)
      .then((raw) => {
        let parsed: unknown = [];
        try {
          parsed = raw ? JSON.parse(raw) : [];
        } catch {
          // تالفٌ لا يُستعاد — الكتابة فوقه لا تُضيّع شيئاً
        }
        const list = sanitizeBlocked(parsed);
        // حظر تمّ أثناء القراءة لا يُمسح بقيمة القرص القديمة
        cache = cache ?? list;
        return cache;
      })
      .catch(() => {
        diskUnread = true;
        cache = cache ?? [];
        return cache;
      });
  }
  return loading;
}

function publish(list: string[]) {
  cache = list;
  listeners.forEach((fn) => fn(list));
  if (diskUnread) return;
  AsyncStorage.setItem(KEY, JSON.stringify(list)).catch(() => {
    /* ignore — الحظر يبقى فعّالاً لهذه الجلسة */
  });
}

/**
 * حظر اسمٍ (مطبَّعاً) وإضافته **لآخر قائمة** بالذاكرة لا لما أعادته القراءة: حظران سريعان قبل انتهاء أول قراءة
 * للقرص كانا ينتظران الوعد نفسه فيبني كلٌّ منهما على القائمة الأصلية — الثاني يكتب «[…، B]» فيضيع A (يعود ظاهراً).
 */
export async function blockUser(name: string): Promise<void> {
  const n = norm(name);
  if (!n) return;
  await loadBlocked();
  const list = cache ?? [];
  if (list.includes(n)) return;
  publish([...list, n].slice(-MAX_BLOCKED));
}

export function useBlockedUsers() {
  const [blocked, setBlocked] = useState<string[]>(cache ?? []);

  useEffect(() => {
    let alive = true;
    listeners.add(setBlocked);
    // `cache` لا قيمة الوعد: وعد القراءة يحمل القائمة **لحظة القراءة**، وحظرٌ من اللوحة الأخرى نُشر قبل أن يصل
    // دور هذا الـthen كان يُكتب فوقه بالقائمة القديمة فيعود المحظور ظاهراً بهذه اللوحة (و«إلغاء الكل» كذلك يرتدّ)
    loadBlocked().then(() => {
      if (alive) setBlocked(cache ?? []);
    });
    return () => {
      alive = false;
      listeners.delete(setBlocked);
    };
  }, []);

  const isBlocked = useCallback(
    (name: string | null | undefined) => !!name && blocked.includes(norm(name)),
    [blocked]
  );

  const block = useCallback((name: string) => blockUser(name), []);

  const unblockAll = useCallback(() => {
    // «إلغاء حظر الكل» يقصد القرص أيضاً — يُكتب حتى بعد قراءة فاشلة
    diskUnread = false;
    publish([]);
  }, []);

  return { blocked, isBlocked, block, unblockAll };
}
