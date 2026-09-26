import React, { useEffect, useState } from 'react';
import { AppState, type AppStateStatus, View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing, numeric } from '../theme';
import { api } from '../api';
import { useI18n } from '../i18n/I18nContext';
import {
  bankHolidayToday,
  calendarAfterFetch,
  calendarFetchEvents,
  calendarSourceMs,
  calendarStaleSilent,
  calendarUnavailable,
  openCalendarUnavailable,
  newsCountdown,
  newsBannerText,
  newsCurrencies,
  newsTickDelayMs,
  nextHighImpact,
  openPositionsNewsRisk,
  sameMinuteCurrencyLabel,
  sameMinuteHighImpact,
  shownHolidayCurrencies,
  shownNewsCurrencies,
  unannouncedHighImpactToday,
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
/**
 * آخر جلب ناجح جاء من تقويم **الخادم** المحفوظ (`stale: true`، backend-r27 — مصدره فشل، حتى 6 س): الأحداث
 * حقيقية فتبقى `ok`، لكن السطر يقول «من تقويم محفوظ» كفشلنا نحن.
 */
let cacheServerStale = false;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

/**
 * عطل البنوك (`impact=holiday`، backend-r3) بطلبٍ منفصل لا `impact=high,holiday`: خادمٌ أقدم يطابق القيمة حرفياً فيُرجع
 * قائمة فارغة = «لا خبر قوي» صامتة. هنا فشله يُسقط سطر العطلة وحده؛ تحذير الخبر القوي لا يتأثّر.
 */
let holidayCache: CalendarCache | null = null;
let holidayInflight: Promise<void> | null = null;

function ensureHolidaysFresh(now: number) {
  if (holidayInflight || (holidayCache && now - holidayCache.at < (holidayCache.ok ? TTL_MS : FAIL_TTL_MS))) return;
  holidayInflight = api
    .calendar({ impact: 'holiday' })
    .then((r) => {
      holidayCache = calendarAfterFetch(holidayCache, calendarFetchEvents(r), Date.now());
    })
    .catch(() => {
      holidayCache = calendarAfterFetch(holidayCache, null, Date.now());
    })
    .finally(() => {
      holidayInflight = null;
      for (const l of listeners) l();
    });
}

function ensureFresh(now: number) {
  // سطر العطلة للرمز المكتوب/المعروض فقط (المستدعي يقرّر)؛ الجلب مشترك بمهلته
  ensureHolidaysFresh(now);
  if (cache && now - cache.at < (cache.ok ? TTL_MS : FAIL_TTL_MS)) return;
  if (inflight) return;
  inflight = api
    .calendar({ impact: 'high' })
    .then((r) => {
      // ردّ الأمثلة (الخادم لم يبلغ مصدره) فشلٌ لا نجاح — لا يمحو تقويماً محفوظاً، راجع `calendarFetchEvents`
      const events = calendarFetchEvents(r);
      const n = Date.now();
      // تقويم الخادم المحفوظ يُؤرَّخ بوقت جلبه عند المصدر لا بلحظة الردّ — راجع `calendarSourceMs`
      cache = calendarAfterFetch(cache, events, n, calendarSourceMs(r, n));
      if (events && cache.ok) cacheServerStale = r.stale === true;
    })
    .catch(() => {
      cache = calendarAfterFetch(cache, null, Date.now());
    })
    .finally(() => {
      inflight = null;
      for (const l of listeners) l();
    });
}

/**
 * `symbol` = الرمز الذي يُكتب/يُعرض (الشارت، الحاسبة، نموذج الدفتر). `openSymbols` = رموز الصفقات **المفتوحة** بالدفتر: الحدث
 * الأقرب لعملاتها كلها، والسطر الثاني يسمّي الرموز التي يمسّها (`openPositionsNewsRisk`). بلا سطر «التقويم غير متاح» هنا —
 * يقوله شريط النموذج مرّة واحدة.
 */
type Props =
  | {
      symbol: string;
      /**
       * رموز أخرى **ظاهرة** بالشاشة نفسها (إطارات شبكة الطرفية): الخبر والعطلة وتعطّل التقويم لعملاتها كلها مع `symbol`
       * — راجع `shownNewsCurrencies`.
       */
      alsoSymbols?: readonly string[];
      openSymbols?: never;
      shownSymbol?: never;
    }
  | {
      symbol?: never;
      alsoSymbols?: never;
      openSymbols: readonly string[];
      /** رمز شريطٍ آخر ظاهر بالشاشة نفسها: اللحظة نفسها لا تُعلَن مرّتين — راجع `openPositionsNewsRisk` */
      shownSymbol?: string;
    };

export function NewsRiskBanner({ symbol = '', alsoSymbols, openSymbols, shownSymbol }: Props) {
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

  // الخبر: مؤشر غير دولاري (GER40) يُحذَّر له بخبر الدولار كذلك — `newsCurrencies`؛ العطلة بعملته وحدها
  const shown = alsoSymbols?.length ? [symbol, ...alsoSymbols] : [symbol];
  const currencies = openSymbols ? [...new Set(openSymbols.flatMap((s) => newsCurrencies(s)))] : shownNewsCurrencies(shown);
  const currencyKey = currencies.join(',');
  // تبديل الرمز والشريط مركَّب (الطرفية، الحاسبة، كتابة رمز الدفتر): `now` كان آخر دقّة للساعة — حتى 60ث قديمة —
  // فخبر الزوج الجديد بعد 40ث يُكتب «بعد 1د» 35ث، ومؤقّت التجديد يُجدول من الفرق الخطأ نفسه
  useEffect(() => {
    setNow(Date.now());
  }, [currencyKey]);
  const openHit = cache && openSymbols ? openPositionsNewsRisk(openSymbols, cache.events, now, shownSymbol) : null;
  const hit = openSymbols ? openHit : cache ? nextHighImpact(cache.events, currencies, now) : null;
  const hitDelta = hit ? hit.deltaMs : null;
  // تجديد العدّ **لحظة يتغيّر** لا بساعة من لحظة التركيب — وإلا بقي «بعد 3د» والخبر بعد 2:50، راجع `newsTickDelayMs`
  useEffect(() => {
    const id = setTimeout(() => setNow(Date.now()), newsTickDelayMs(hitDelta));
    return () => clearTimeout(id);
  }, [now, hitDelta]);
  // خبرٌ قويّ اليوم **بلا ساعة معلنة** (قرار بنك اليابان «Tentative»): كان يُعدّ لمنتصف ليل نيويورك كأنه موعد — الآن سطرٌ
  // كالخبر الموقوت بلا عدّ. للرمز المعروض فقط (الصفقات المفتوحة تبقى على الموقوت). **ومع خبرٍ موقوت كذلك** سطراً ثانياً: يوم
  // بنك اليابان «BOJ Policy Rate» بلا ساعة والمؤتمر الصحفي 06:30 UTC — من 03:31 كان السطر «بعد 2س 59د · المؤتمر» وحده، والقرار
  // نفسه (يصدر عادةً 03:00–04:30) قد يسقط أيّ دقيقة
  const tbd = !openSymbols && cache ? unannouncedHighImpactToday(cache.events, currencies, now) : null;
  // يومُه غداً بتقويم الجهاز (21:00–24:00 نيويورك بالأمريكتين) ⇒ «غداً» لا «اليوم» — `unannouncedHighImpactToday().tomorrow`
  const tbdText = tbd
    ? newsBannerText({
        head: t.newsRiskHigh,
        // `ALL` (G20 «All Day») ⇒ «كل العملات» كالسطر الموقوت أدناه
        currency: tbd.currencies.map((c) => (c === 'ALL' ? t.newsAllCurrencies : c)).join('/'),
        when: tbd.tomorrow ? t.newsTimeTbdTomorrow : t.newsTimeTbd,
        title: tbd.titles[0] ?? '',
        more: Math.max(0, tbd.titles.length - 1),
      })
    : null;
  if (tbdText && !hit) {
    const text = tbdText;
    const stale = cache != null && (!cache.ok || cacheServerStale);
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
  // عطلة بنوك اليوم لعملتَي الرمز — حين لا خبر قوي فقط (الخبر أخطر ويشغل الشريط). لا للصفقات المفتوحة ولا للرقمية (سوقٌ بلا عطلة)
  const holiday =
    !hit && !openSymbols && holidayCache ? bankHolidayToday(holidayCache.events, shownHolidayCurrencies(shown), now) : null;
  if (holiday) {
    const text = `🏦 ${t.newsHolidayToday
      .split('{ccy}')
      .join(holiday.currencies.join('/'))
      .split('{title}')
      .join(holiday.titles.length ? ` · ${holiday.titles.join(t.listSep)}` : '')}`;
    return (
      <View style={[styles.wrap, styles.wrapUnavailable]} accessible accessibilityRole="alert" accessibilityLabel={text}>
        <Text style={[styles.hint, styles.unavailable, { textAlign: align }]} numberOfLines={2}>
          {text}
        </Text>
      </View>
    );
  }
  if (!hit) {
    // وتقويمٌ محفوظ قديم بلا خبرٍ فيه يُقال كذلك — كان يبدو «لا خبر» والأحداث الجديدة غائبة (`calendarStaleSilent`).
    // للرمز المعروض فقط: شريط الصفقات المفتوحة يسكت عن التعطّل حين يقوله شريطٌ آخر، كـ`openCalendarUnavailable`
    const down = openSymbols
      ? openCalendarUnavailable(cache, openSymbols, shownSymbol)
      : shown.some((s) => calendarUnavailable(cache, s) || calendarStaleSilent(cache, cacheServerStale, s, now));
    if (!down) return null;
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
  // «USD/EUR» حين يكون بين الـ+N خبرٌ قويّ لعملة الساق الأخرى — راجع `sameMinuteCurrencyLabel`
  // حدث `ALL` (G20) يُطبع «كل العملات» لا «ALL» حرفياً، ولو داخل «USD/ALL» (launch128)
  const ccyLabel = (cache ? sameMinuteCurrencyLabel(cache.events, currencies, event) : event.currency)
    .split('/')
    .map((c) => (c.trim().toUpperCase() === 'ALL' ? t.newsAllCurrencies : c))
    .join('/');
  const text = newsBannerText({ head: t.newsRiskHigh, currency: ccyLabel, when, title: event.title, more });
  // التحذير من تقويمٍ محفوظ بعد فشل التحديث: يُعرض (الوقت مطلق فيبقى صادقاً) مع قول ذلك
  const stale = cache != null && (!cache.ok || cacheServerStale);
  // صفقات مفتوحة: الرموز التي يمسّها الخبر، والخطر الفعلي انزلاق الوقف لا «حجم الصفقة» (launch89) — سطران كي لا تُقصّ النصيحة
  const hint = openHit?.symbols.length
    ? t.newsRiskOpenHint.replace('{symbols}', () => openHit.symbols.join(t.listSep))
    : t.newsRiskHint;

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="alert"
      accessibilityLabel={`${text}. ${tbdText ? `${tbdText}. ` : ''}${hint}${stale ? `. ${t.newsStale}` : ''}`}
    >
      <Text style={[styles.main, { textAlign: align }]} numberOfLines={1}>
        {text}
      </Text>
      {tbdText ? (
        <Text style={[styles.main, { textAlign: align }]} numberOfLines={1}>
          {tbdText}
        </Text>
      ) : null}
      <Text style={[styles.hint, { textAlign: align }]} numberOfLines={openHit ? 2 : 1}>
        {hint}
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
    paddingVertical: 4,
    borderRadius: radii.sm,
    // DESIGN-PRO §1/§5.5: خطر الخبر ليس اتجاه سعر ⇒ لا أحمر؛ حدّ أقوى وحده (فاصل واحد) والنصّ الأساسي يحمل الرسالة
    borderWidth: 1,
    borderColor: colors.textDim,
  },
  main: { ...numeric, color: colors.text, fontSize: 12, fontWeight: '500' },
  hint: { ...numeric, color: colors.textMuted, fontSize: 11, marginTop: 0 },
  wrapUnavailable: { borderColor: colors.warn },
  unavailable: { color: colors.text, fontSize: 11, marginTop: 0 },
});
