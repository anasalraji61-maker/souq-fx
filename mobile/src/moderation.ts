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
const listeners = new Set<(list: string[]) => void>();

const norm = (name: string) => name.trim().toLowerCase();

function loadBlocked(): Promise<string[]> {
  if (cache) return Promise.resolve(cache);
  if (!loading) {
    loading = AsyncStorage.getItem(KEY)
      .then((raw) => {
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        const list = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
        // حظر تمّ أثناء القراءة لا يُمسح بقيمة القرص القديمة
        cache = cache ?? list;
        return cache;
      })
      .catch(() => {
        cache = cache ?? [];
        return cache;
      });
  }
  return loading;
}

function publish(list: string[]) {
  cache = list;
  listeners.forEach((fn) => fn(list));
  AsyncStorage.setItem(KEY, JSON.stringify(list)).catch(() => {
    /* ignore — الحظر يبقى فعّالاً لهذه الجلسة */
  });
}

export function useBlockedUsers() {
  const [blocked, setBlocked] = useState<string[]>(cache ?? []);

  useEffect(() => {
    let alive = true;
    listeners.add(setBlocked);
    loadBlocked().then((list) => {
      if (alive) setBlocked(list);
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

  const block = useCallback(async (name: string) => {
    const n = norm(name);
    if (!n) return;
    const list = await loadBlocked();
    if (list.includes(n)) return;
    publish([...list, n].slice(-MAX_BLOCKED));
  }, []);

  const unblockAll = useCallback(() => publish([]), []);

  return { blocked, isBlocked, block, unblockAll };
}
