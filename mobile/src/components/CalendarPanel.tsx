import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radii, spacing, buttons } from '../theme';
import { api } from '../api';
import { useI18n } from '../i18n/I18nContext';

type Ev = {
  id: string;
  title: string;
  currency: string;
  impact: string;
  when: string;
  forecast: string;
  /** ثوانٍ UTC — إن وُجد يُعرض الحدث بتوقيت جهاز المستخدم مع عدّ تنازلي؛ غيابه (باك-إند أقدم/مصدر XML)
   * يعيد السلوك السابق (نص `when` كما هو). */
  ts?: number | null;
  /** بيانات مثال احتياطية من الباك-إند عند تعذّر جلب التقويم الحي */
  sample?: boolean;
};

const SOON_MS = 24 * 60 * 60 * 1000;
const NOW_WINDOW_MS = 15 * 60 * 1000;
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
const IMPACTS = ['ALL', 'high', 'medium', 'low'] as const;
type ImpactFilter = (typeof IMPACTS)[number];
/** يتذكّر فلتر العملة/التأثير بين الجلسات — المتداول يتابع عملاته نفسها كل يوم. */
const FILTER_KEY = 'matrix.calendar.filters.v1';

type Props = {
  compact?: boolean;
  onPickCurrency?: (currency: string) => void;
};

export function CalendarPanel({ compact = false, onPickCurrency }: Props) {
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
        if (typeof v.currency === 'string' && CURRENCIES.includes(v.currency)) setCurrency(v.currency);
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

  useEffect(() => {
    if (!filtersReady) return;
    // حارس "alive" يمنع تحديث الحالة بعد إلغاء تركيب اللوحة أو تغيّر الفلتر قبل اكتمال الطلب
    // السابق — نفس نمط ChartFrame/SymbolSnapshot/FocusChartModal المؤسَّس بالكود.
    let alive = true;
    setStatus('loading');
    api
      .calendar({
        currency: currency === 'ALL' ? undefined : currency,
        impact: impact === 'ALL' ? undefined : impact,
      })
      .then((r) => {
        if (alive) {
          setEvents(r.events);
          setStatus('ok');
        }
      })
      .catch(() => {
        if (alive) {
          setEvents([]);
          setStatus('error');
        }
      });
    return () => {
      alive = false;
    };
  }, [filtersReady, currency, impact]);

  const IMPACT_LABEL: Record<'high' | 'medium' | 'low', string> = {
    high: t.impactHigh,
    medium: t.impactMedium,
    low: t.impactLow,
  };

  const hasTs = (e: Ev): e is Ev & { ts: number } => typeof e.ts === 'number' && Number.isFinite(e.ts);
  const timed = events.filter(hasTs);
  const upcoming = timed.filter((e) => e.ts * 1000 >= now - NOW_WINDOW_MS).sort((a, b) => a.ts - b.ts);
  const past = timed.filter((e) => e.ts * 1000 < now - NOW_WINDOW_MS).sort((a, b) => b.ts - a.ts);
  const untimed = events.filter((e) => !hasTs(e));
  /** الأحداث القادمة أولاً (الأقرب فالأبعد)، ثم ما بلا وقت دقيق، ثم المنتهية (باهتة) */
  const ordered: Ev[] = [...upcoming, ...untimed, ...past];
  const soonCount = upcoming.filter((e) => e.ts * 1000 <= now + SOON_MS).length;
  const isSample = events.some((e) => e.sample);

  const fmtLocal = (ts: number) => {
    const d = new Date(ts * 1000);
    const day = sameDay(d, new Date(now))
      ? t.calToday
      : sameDay(d, new Date(now + 86_400_000))
        ? t.calTomorrow
        : `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
    return `${day} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };

  const relLabel = (ts: number) => {
    const diff = ts * 1000 - now;
    if (Math.abs(diff) <= NOW_WINDOW_MS) return t.calNow;
    if (diff < 0) return t.calPast;
    const mins = Math.round(diff / 60_000);
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
          {CURRENCIES.map((c) => (
            <Pressable
              accessibilityRole="button"
              key={c}
              style={({ pressed }) => [
                styles.chip,
                currency === c && styles.chipOn,
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
              accessibilityState={{ selected: currency === c }}
            >
              <Text style={[styles.chipText, currency === c && styles.chipTextOn]}>{c}</Text>
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
              accessibilityLabel={`${t.calendarImpactA11yPrefix}: ${imp === 'ALL' ? t.calendarAllWord : IMPACT_LABEL[imp]}`}
              accessibilityState={{ selected: impact === imp }}
            >
              <Text style={[styles.chipText, impact === imp && styles.chipTextOn]}>
                {imp === 'ALL' ? t.calendarAllShort : IMPACT_LABEL[imp]}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <ScrollView style={{ maxHeight: compact ? 140 : 280 }}>
        {status === 'loading' ? (
          <Text style={[styles.empty, { textAlign: align }]}>{t.calendarLoading}</Text>
        ) : events.length === 0 ? (
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
            return (
              <View key={e.id} style={[styles.row, rtl && styles.rowRtl, soon && styles.rowSoon, done && styles.rowDone]}>
                <View
                  style={[styles.dot, { backgroundColor: IMPACT_COLOR[e.impact] ?? colors.textDim }]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.evTitle, { textAlign: align }]}>{e.title}</Text>
                  <Text style={[styles.meta, { textAlign: align }]}>
                    {e.currency} · {ts != null ? fmtLocal(ts) : e.when} · {e.forecast}
                  </Text>
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
});
