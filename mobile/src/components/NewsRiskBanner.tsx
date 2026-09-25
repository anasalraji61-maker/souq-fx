import React, { useEffect, useState } from 'react';
import { AppState, type AppStateStatus, View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { api } from '../api';
import { useI18n } from '../i18n/I18nContext';
import {
  calendarAfterFetch,
  calendarFetchEvents,
  calendarUnavailable,
  newsCountdown,
  newsBannerText,
  newsTickDelayMs,
  nextHighImpact,
  sameMinuteHighImpact,
  symbolCurrencies,
  type CalendarCache,
} from '../chart/newsRisk';

/**
 * سطر تحذير «خبر قوي قريب» فوق الشارت: أقرب حدث عالي التأثير لعملتي الزوج خلال 3 ساعات
 * (أو جارٍ الآن). لا يظهر شيء إن لم يوجد حدث؛ وفشل التقويم بلا بيانات محفوظة يُقال صراحةً (`newsUnavailable`)
 * بدل أن يبدو كـ«لا خبر» — راجع `calendarUnavailable`.
 *
 * مخزن ذاكرة مشترك: طلب `/api/calendar?impact=high` واحد كل 10 دقائق مهما تعدّدت الشاشات
 * (دقيقتان بعد فشل) — التقويم أسبوعي ولا يتغيّر كل دقيقة.
 */
const TTL_MS = 10 * 60 * 1000;
const FAIL_TTL_MS = 2 * 60 * 1000;
/** فشل التحديث يُبقي آخر تقويم ناجح (حتى يوم) بدل محو تحذير قائم — راجع `calendarAfterFetch`. */
let cache: CalendarCache | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function ensureFresh(now: number) {
  if (cache && now - cache.at < (cache.ok ? TTL_MS : FAIL_TTL_MS)) return;
  if (inflight) return;
  inflight = api
    .calendar({ impact: 'high' })
    .then((r) => {
      // ردّ الأمثلة (الخادم لم يبلغ مصدره) فشلٌ لا نجاح — لا يمحو تقويماً محفوظاً، راجع `calendarFetchEvents`
      cache = calendarAfterFetch(cache, calendarFetchEvents(r), Date.now());
    })
    .catch(() => {
      cache = calendarAfterFetch(cache, null, Date.now());
    })
    .finally(() => {
      inflight = null;
      for (const l of listeners) l();
    });
}

type Props = { symbol: string };

export function NewsRiskBanner({ symbol }: Props) {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const [now, setNow] = useState(() => Date.now());
  const [, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    const onUpdate = () => {
      if (!alive) return;
      setVersion((v) => v + 1);
      // تقويم جديد يُقاس بساعة اللحظة لا بآخر دقّة (حتى 60ث قديمة)
      setNow(Date.now());
    };
    listeners.add(onUpdate);
    ensureFresh(Date.now());
    // ساعة دقيقة: تعيد الجلب عند انتهاء صلاحية المخزن (العدّ نفسه يُجدَّد بمؤقّته أدناه).
    const id = setInterval(() => {
      const n = Date.now();
      if (alive) setNow(n);
      ensureFresh(n);
    }, 60_000);
    // العودة من الخلفية: مؤقّتات JS متوقّفة هناك، فكان «بعد 12د» يبقى على الشاشة عن خبرٍ بعد دقيقتين
    // حتى تدقّ الساعة — وهي لحظة فتح التطبيق للدخول بالضبط.
    const sub = AppState.addEventListener('change', (st: AppStateStatus) => {
      if (st !== 'active' || !alive) return;
      const n = Date.now();
      setNow(n);
      ensureFresh(n);
    });
    return () => {
      alive = false;
      listeners.delete(onUpdate);
      clearInterval(id);
      sub.remove();
    };
  }, []);

  const currencies = symbolCurrencies(symbol);
  const currencyKey = currencies.join(',');
  // تبديل الرمز والشريط مركَّب (الطرفية، الحاسبة، كتابة رمز الدفتر): `now` كان آخر دقّة للساعة — حتى 60ث قديمة —
  // فخبر الزوج الجديد بعد 40ث يُكتب «بعد 1د» 35ث، ومؤقّت التجديد يُجدول من الفرق الخطأ نفسه
  useEffect(() => {
    setNow(Date.now());
  }, [currencyKey]);
  const hit = cache ? nextHighImpact(cache.events, currencies, now) : null;
  const hitDelta = hit ? hit.deltaMs : null;
  // تجديد العدّ **لحظة يتغيّر** لا بساعة من لحظة التركيب — وإلا بقي «بعد 3د» والخبر بعد 2:50، راجع `newsTickDelayMs`
  useEffect(() => {
    const id = setTimeout(() => setNow(Date.now()), newsTickDelayMs(hitDelta));
    return () => clearTimeout(id);
  }, [now, hitDelta]);
  if (!hit) {
    if (!calendarUnavailable(cache, symbol)) return null;
    // فشلٌ بلا محفوظ: الغياب كان يُقرأ «لا خطر» — سطرٌ هادئ (عنبري لا أحمر: لا نعرف بخبر، نعرف أننا لا نعرف)
    return (
      <View style={[styles.wrap, styles.wrapUnavailable]} accessible accessibilityRole="alert" accessibilityLabel={t.newsUnavailable}>
        <Text style={[styles.hint, styles.unavailable, { textAlign: align }]} numberOfLines={2}>
          {`⚠ ${t.newsUnavailable}`}
        </Text>
      </View>
    );
  }

  const { event, deltaMs } = hit;
  // الدقائق مقرَّبة للأسفل و«0د» لا تُكتب بجانب ساعات — راجع `newsCountdown`
  const cd = newsCountdown(deltaMs);
  const when = cd.now
    ? t.calNow
    : `${t.calInPrefix} ${[cd.h ? `${cd.h}${t.calHourShort}` : '', cd.m || !cd.h ? `${cd.m}${t.calMinShort}` : '']
        .filter(Boolean)
        .join(' ')}`;
  // الموعد قبل العنوان: السطر يُقصّ من آخره، و«+2» لأخبار الدقيقة نفسها (الرواتب + البطالة + الأجور) — راجع `newsBannerText`
  const more = cache ? sameMinuteHighImpact(cache.events, currencies, event) : 0;
  const text = newsBannerText({ head: t.newsRiskHigh, currency: event.currency, when, title: event.title, more });
  // التحذير من تقويمٍ محفوظ بعد فشل التحديث: يُعرض (الوقت مطلق فيبقى صادقاً) مع قول ذلك
  const stale = cache != null && !cache.ok;

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="alert"
      accessibilityLabel={`${text}. ${t.newsRiskHint}${stale ? `. ${t.newsStale}` : ''}`}
    >
      <Text style={[styles.main, { textAlign: align }]} numberOfLines={1}>
        {text}
      </Text>
      <Text style={[styles.hint, { textAlign: align }]} numberOfLines={1}>
        {t.newsRiskHint}
      </Text>
      {stale ? (
        <Text style={[styles.hint, { textAlign: align }]} numberOfLines={1}>
          {t.newsStale}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: spacing.sm,
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.bear,
    backgroundColor: colors.bearSoft,
  },
  main: { color: colors.text, fontSize: 12, fontWeight: '800' },
  hint: { color: colors.textMuted, fontSize: 10, marginTop: 1 },
  wrapUnavailable: { borderColor: colors.warn, backgroundColor: colors.warnSoft },
  unavailable: { color: colors.text, fontSize: 11, marginTop: 0 },
});
