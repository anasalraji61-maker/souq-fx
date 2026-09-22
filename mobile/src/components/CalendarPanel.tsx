import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radii, spacing, buttons } from '../theme';
import { api } from '../api';
import { useI18n } from '../i18n/I18nContext';
import { instrumentSpec } from '../positionSize';

type Ev = {
  id: string;
  title: string;
  currency: string;
  impact: string;
  when: string;
  forecast: string;
  /** أرقام مسمّاة منفصلة (باك-إند أحدث). `forecast` وحده يخلط «السابق» بالتوقّع عند غيابه — يُستخدم
   * فقط إن لم تصل هذه الحقول (باك-إند أقدم). */
  forecast_value?: string;
  previous?: string;
  actual?: string;
  /** ثوانٍ UTC — إن وُجد يُعرض الحدث بتوقيت جهاز المستخدم مع عدّ تنازلي؛ غيابه (باك-إند أقدم/مصدر XML)
   * يعيد السلوك السابق (نص `when` كما هو). */
  ts?: number | null;
  /** بيانات مثال احتياطية من الباك-إند عند تعذّر جلب التقويم الحي */
  sample?: boolean;
};

const SOON_MS = 24 * 60 * 60 * 1000;
const NOW_WINDOW_MS = 15 * 60 * 1000;
/** إعادة جلب صامتة للتقويم وهو مفتوح — الخادم يخزّن النتيجة 30 دقيقة (`econ_calendar.TTL`)
 * فالطلب لا يمسّ حدّ المزوّد، لكنه يلتقط «الفعلي» بعد صدور الرقم. */
const RELOAD_MS = 5 * 60 * 1000;
const pad2 = (n: number) => String(n).padStart(2, '0');

function tzLabel(): string {
  const off = -new Date().getTimezoneOffset();
  const a = Math.abs(off);
  return `UTC${off >= 0 ? '+' : '-'}${Math.floor(a / 60)}${a % 60 ? `:${pad2(a % 60)}` : ''}`;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const IMPACT_COLOR: Record<string, string> = {
  high: colors.bear,
  medium: colors.warn,
  low: colors.textDim,
};

const CURRENCIES = ['ALL', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'NZD', 'CHF'];
/** «متوسط+» (عالي ومتوسط معاً) هو الفلتر الأكثر استخداماً لدى متداول التجزئة: المنخفض ضجيج، والعالي وحده
 * يُخفي بيانات متوسطة تحرّك الزوج فعلاً. يُصفّى محلياً (الخادم يقبل أهمية واحدة). */
const IMPACTS = ['ALL', 'medplus', 'high', 'medium', 'low'] as const;
type ImpactFilter = (typeof IMPACTS)[number];
/** قيمة فلتر العملة لـ«عملتا زوج الشارت» (EURUSD → EUR + USD) — تُصفّى محلياً. */
const PAIR = 'PAIR';
/** يتذكّر فلتر العملة/التأثير بين الجلسات — المتداول يتابع عملاته نفسها كل يوم. */
const FILTER_KEY = 'matrix.calendar.filters.v1';

type Props = {
  compact?: boolean;
  /** زوج الشارت/الإشارة المفتوح — يضيف رقاقة بعملتَي الزوج معاً (أخبار ما يتداوله الآن فعلاً). */
  symbol?: string;
  onPickCurrency?: (currency: string) => void;
};

export function CalendarPanel({ compact = false, symbol, onPickCurrency }: Props) {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const [events, setEvents] = useState<Ev[]>([]);
  const [currency, setCurrency] = useState('ALL');
  const [impact, setImpact] = useState<ImpactFilter>('ALL');
  /** لا نجلب قبل قراءة الفلتر المحفوظ — وإلا طلبان متتاليان (الكل ثم المحفوظ) ووميض قائمة خاطئة. */
  const [filtersReady, setFiltersReady] = useState(false);
  /** وضوح الحالة: تمييز "جاري التحميل" و"فشل الاتصال" عن "لا أحداث فعلاً بهذا الفلتر" */
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  /** ساعة داخلية للعدّ التنازلي ("بعد 2س 15د") — تُحدَّث كل دقيقة */
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(FILTER_KEY)
      .then((raw) => {
        if (!alive || !raw) return;
        const v = JSON.parse(raw) as { currency?: unknown; impact?: unknown };
        if (typeof v.currency === 'string' && (CURRENCIES.includes(v.currency) || v.currency === PAIR)) {
          setCurrency(v.currency);
        }
        if (typeof v.impact === 'string' && (IMPACTS as readonly string[]).includes(v.impact)) {
          setImpact(v.impact as ImpactFilter);
        }
      })
      .catch(() => {
        /* تخزين تالف/غير متاح — نبدأ بـ«الكل» كما كان */
      })
      .finally(() => {
        if (alive) setFiltersReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!filtersReady) return;
    AsyncStorage.setItem(FILTER_KEY, JSON.stringify({ currency, impact })).catch(() => {
      /* فشل الحفظ لا يمنع استخدام الفلتر */
    });
  }, [filtersReady, currency, impact]);

  /**
   * جلب التقويم. **كانت اللوحة تجلب مرة واحدة فقط ثم لا تُعيد أبداً وهي مفتوحة**: العدّ التنازلي
   * وحده كان يتحرّك (ساعة داخلية)، فيصل حدث «الرواتب غير الزراعية» إلى «الآن» ثم لا يظهر الرقم
   * **الفعلي** إطلاقاً حتى يبدّل المتداول التبويب ويعود — والرقم الفعلي هو كل الغرض لحظة الصدور.
   * الآن تُعاد كل `RELOAD_MS` صامتةً: `silent` لا يُظهر «جاري التحميل» ولا يمسح القائمة عند فشل
   * الشبكة (اللوحة تبقى على آخر أحداث معروفة بدل أن تُفرَّغ تحت المتداول بسبب انقطاع لحظي).
   */
  const load = useCallback(
    (silent: boolean, alive: { on: boolean }) => {
      if (!silent) setStatus('loading');
      api
        .calendar({
          // فلترا «الزوج» و«متوسط+» محليان: نجلب الكل ثم نصفّي
          currency: currency === 'ALL' || currency === PAIR ? undefined : currency,
          impact: impact === 'ALL' || impact === 'medplus' ? undefined : impact,
        })
        .then((r) => {
          if (!alive.on) return;
          setEvents(r.events);
          setStatus('ok');
        })
        .catch(() => {
          if (!alive.on || silent) return;
          setEvents([]);
          setStatus('error');
        });
    },
    [currency, impact]
  );

  useEffect(() => {
    if (!filtersReady) return;
    // حارس "alive" واحد يغطّي الطلب الأول **وكل إعادة جلب دورية** — يمنع تحديث الحالة بعد إلغاء
    // تركيب اللوحة أو تغيّر الفلتر قبل وصول طلب سابق (نفس نمط ChartFrame/SymbolSnapshot/
    // FocusChartModal المؤسَّس بالكود).
    const alive = { on: true };
    load(false, alive);
    const id = setInterval(() => load(true, alive), RELOAD_MS);
    return () => {
      alive.on = false;
      clearInterval(id);
    };
  }, [filtersReady, load]);

  const IMPACT_LABEL: Record<'high' | 'medium' | 'low', string> = {
    high: t.impactHigh,
    medium: t.impactMedium,
    low: t.impactLow,
  };

  /** عملتا زوج الشارت المعروفتان بالتقويم (XAUUSD → USD فقط)؛ فارغة لرمز ليس فوركس/معدن → لا رقاقة. */
  const pairCcys = useMemo(() => {
    const spec = symbol ? instrumentSpec(symbol) : null;
    if (!spec) return [] as string[];
    return [spec.base, spec.quote].filter((c) => CURRENCIES.includes(c));
  }, [symbol]);
  const pairLabel = symbol && pairCcys.length > 0 ? instrumentSpec(symbol)?.symbol ?? null : null;
  /** فلتر «الزوج» محفوظ لكن الرمز الحالي ليس زوجاً معروفاً → يُعامل كـ«الكل» بدل قائمة فارغة غامضة */
  const pairActive = currency === PAIR && pairCcys.length > 0;

  const visible = events.filter(
    (e) =>
      (!pairActive || pairCcys.includes(e.currency)) &&
      (impact !== 'medplus' || e.impact === 'high' || e.impact === 'medium')
  );

  const impactWord = (imp: string): string | null =>
    imp === 'high' || imp === 'medium' || imp === 'low' ? IMPACT_LABEL[imp] : null;

  const hasTs = (e: Ev): e is Ev & { ts: number } => typeof e.ts === 'number' && Number.isFinite(e.ts);
  const timed = visible.filter(hasTs);
  const upcoming = timed.filter((e) => e.ts * 1000 >= now - NOW_WINDOW_MS).sort((a, b) => a.ts - b.ts);
  const past = timed.filter((e) => e.ts * 1000 < now - NOW_WINDOW_MS).sort((a, b) => b.ts - a.ts);
  const untimed = visible.filter((e) => !hasTs(e));
  /** الأحداث القادمة أولاً (الأقرب فالأبعد)، ثم ما بلا وقت دقيق، ثم المنتهية (باهتة) */
  const ordered: Ev[] = [...upcoming, ...untimed, ...past];
  const soonCount = upcoming.filter((e) => e.ts * 1000 <= now + SOON_MS).length;
  const isSample = events.some((e) => e.sample);

  const fmtLocal = (ts: number) => {
    const d = new Date(ts * 1000);
    // «غداً» بالتقويم المحلي لا «بعد 24 ساعة»: يوم تغيير التوقيت الصيفي 25 ساعة فكان now+24h يقع باليوم نفسه
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const day = sameDay(d, new Date(now))
      ? t.calToday
      : sameDay(d, tomorrow)
        ? t.calTomorrow
        : `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
    return `${day} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };

  /** «فعلي 0.4% · توقّع 0.3% · سابق 0.2%» — الفارغ يُحذف؛ باك-إند أقدم → نص `forecast` كما كان. */
  const figuresLine = (e: Ev): string => {
    if (e.forecast_value === undefined && e.previous === undefined && e.actual === undefined) {
      return e.forecast && e.forecast !== '—' ? e.forecast : '';
    }
    const parts: string[] = [];
    if (e.actual) parts.push(`${t.calActual} ${e.actual}`);
    if (e.forecast_value) parts.push(`${t.calForecast} ${e.forecast_value}`);
    if (e.previous) parts.push(`${t.calPrevious} ${e.previous}`);
    return parts.join(' · ');
  };

  const relLabel = (ts: number) => {
    const diff = ts * 1000 - now;
    if (Math.abs(diff) <= NOW_WINDOW_MS) return t.calNow;
    if (diff < 0) return t.calPast;
    const mins = Math.round(diff / 60_000);
    // التقويم أسبوعي (حدث الجمعة يبعد ~96س يوم الاثنين): «بعد 4ي 2س» أوضح من «بعد 96س 15د»
    if (mins >= 1440) {
      const days = Math.floor(mins / 1440);
      const h = Math.floor((mins % 1440) / 60);
      return `${t.calInPrefix} ${days}${t.calDayShort}${h ? ` ${h}${t.calHourShort}` : ''}`;
    }
    const h = Math.floor(mins / 60);
    return `${t.calInPrefix} ${h ? `${h}${t.calHourShort} ` : ''}${mins % 60}${t.calMinShort}`;
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { textAlign: align }]}>{t.calendarTitle}</Text>
      {timed.length > 0 ? (
        <Text style={[styles.tzNote, { textAlign: align }]}>
          {t.calTimesLocal} ({tzLabel()}) · {t.calUpcomingHead}: {soonCount}
        </Text>
      ) : null}
      {isSample ? <Text style={[styles.sampleNote, { textAlign: align }]}>{t.calSampleBanner}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[styles.filters, rtl && styles.filtersRtl]}>
          {pairLabel ? (
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.chip,
                pairActive && styles.chipOn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => setCurrency(PAIR)}
              accessibilityLabel={`${t.calendarCurrencyA11yPrefix}: ${pairCcys.join(' + ')}`}
              accessibilityState={{ selected: pairActive }}
            >
              <Text style={[styles.chipText, pairActive && styles.chipTextOn]}>{pairLabel}</Text>
            </Pressable>
          ) : null}
          {CURRENCIES.map((c) => (
            <Pressable
              accessibilityRole="button"
              key={c}
              style={({ pressed }) => [
                styles.chip,
                (currency === c || (c === 'ALL' && currency === PAIR && !pairActive)) && styles.chipOn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => {
                setCurrency(c);
                if (c !== 'ALL') onPickCurrency?.(c);
              }}
              accessibilityLabel={`${t.calendarCurrencyA11yPrefix}: ${c === 'ALL' ? t.calendarAllWord : c}`}
              accessibilityState={{ selected: currency === c || (c === 'ALL' && currency === PAIR && !pairActive) }}
            >
              <Text
                style={[
                  styles.chipText,
                  (currency === c || (c === 'ALL' && currency === PAIR && !pairActive)) && styles.chipTextOn,
                ]}
              >
                {c}
              </Text>
            </Pressable>
          ))}
          {IMPACTS.map((imp) => (
            <Pressable
              accessibilityRole="button"
              key={imp}
              style={({ pressed }) => [
                styles.chip,
                impact === imp && styles.chipOn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => setImpact(imp)}
              accessibilityLabel={`${t.calendarImpactA11yPrefix}: ${
                imp === 'ALL' ? t.calendarAllWord : imp === 'medplus' ? t.calImpactMedPlusA11y : IMPACT_LABEL[imp]
              }`}
              accessibilityState={{ selected: impact === imp }}
            >
              <Text style={[styles.chipText, impact === imp && styles.chipTextOn]}>
                {imp === 'ALL' ? t.calendarAllShort : imp === 'medplus' ? t.calImpactMedPlus : IMPACT_LABEL[imp]}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <ScrollView style={{ maxHeight: compact ? 140 : 280 }}>
        {status === 'loading' ? (
          <Text style={[styles.empty, { textAlign: align }]}>{t.calendarLoading}</Text>
        ) : visible.length === 0 ? (
          status === 'error' ? (
            <Text style={[styles.empty, { textAlign: align }]}>{t.calendarLoadError}</Text>
          ) : (
            <Text style={[styles.empty, { textAlign: align }]}>{t.calendarEmpty}</Text>
          )
        ) : (
          ordered.map((e) => {
            const ts = hasTs(e) ? e.ts : null;
            const soon = ts != null && ts * 1000 >= now - NOW_WINDOW_MS && ts * 1000 <= now + SOON_MS;
            const done = ts != null && ts * 1000 < now - NOW_WINDOW_MS;
            const figures = figuresLine(e);
            return (
              <View key={e.id} style={[styles.row, rtl && styles.rowRtl, soon && styles.rowSoon, done && styles.rowDone]}>
                <View
                  style={[styles.dot, { backgroundColor: IMPACT_COLOR[e.impact] ?? colors.textDim }]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.evTitle, { textAlign: align }]}>{e.title}</Text>
                  {/* الأهمية كلمة ملوّنة لا نقطة لون فقط — نقطة حمراء/برتقالية وحدها لا تُقرأ لمن لديه عمى
                      ألوان ولا لقارئ الشاشة */}
                  <Text style={[styles.meta, { textAlign: align }]}>
                    {e.currency}
                    {impactWord(e.impact) ? (
                      <Text style={{ color: IMPACT_COLOR[e.impact] ?? colors.textDim, fontWeight: '700' }}>
                        {` · ${impactWord(e.impact)}`}
                      </Text>
                    ) : null}
                    {` · ${ts != null ? fmtLocal(ts) : e.when}`}
                  </Text>
                  {figures ? (
                    <Text style={[styles.figures, { textAlign: align }]}>{figures}</Text>
                  ) : null}
                </View>
                {ts != null && !done ? (
                  <Text style={[styles.rel, soon && styles.relSoon]}>{relLabel(ts)}</Text>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 6,
  },
  title: { color: colors.text, fontWeight: '800', textAlign: 'right', fontSize: 14 },
  filters: { flexDirection: 'row', gap: 6, paddingVertical: spacing.xs },
  filtersRtl: { flexDirection: 'row-reverse' },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPanel,
  },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  chipText: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  chipTextOn: { color: colors.accent },
  empty: { color: colors.textDim, textAlign: 'right', fontSize: 11, paddingVertical: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: 6 },
  rowRtl: { flexDirection: 'row-reverse' },
  rowSoon: { backgroundColor: colors.accentFaint, borderRadius: radii.sm, paddingHorizontal: spacing.xs },
  rowDone: { opacity: 0.45 },
  rel: { color: colors.textDim, fontSize: 10, fontWeight: '700', marginTop: 2 },
  relSoon: { color: colors.accent },
  tzNote: { color: colors.textDim, fontSize: 10 },
  sampleNote: { color: colors.warn, fontSize: 10, fontWeight: '700' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: spacing.xs },
  evTitle: { color: colors.text, textAlign: 'right', fontSize: 12, fontWeight: '600' },
  meta: { color: colors.textDim, textAlign: 'right', fontSize: 10, marginTop: 2 },
  figures: { color: colors.textMuted, textAlign: 'right', fontSize: 10, marginTop: 1 },
});
