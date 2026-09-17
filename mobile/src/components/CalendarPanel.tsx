import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
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
};

const IMPACT_COLOR: Record<string, string> = {
  high: colors.bear,
  medium: colors.warn,
  low: colors.textDim,
};

const CURRENCIES = ['ALL', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'];

type Props = {
  compact?: boolean;
  onPickCurrency?: (currency: string) => void;
};

export function CalendarPanel({ compact = false, onPickCurrency }: Props) {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const [events, setEvents] = useState<Ev[]>([]);
  const [currency, setCurrency] = useState('ALL');
  const [impact, setImpact] = useState<'ALL' | 'high' | 'medium' | 'low'>('ALL');
  /** وضوح الحالة: تمييز "جاري التحميل" و"فشل الاتصال" عن "لا أحداث فعلاً بهذا الفلتر" */
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    setStatus('loading');
    api
      .calendar({
        currency: currency === 'ALL' ? undefined : currency,
        impact: impact === 'ALL' ? undefined : impact,
      })
      .then((r) => {
        setEvents(r.events);
        setStatus('ok');
      })
      .catch(() => {
        setEvents([]);
        setStatus('error');
      });
  }, [currency, impact]);

  const IMPACT_LABEL: Record<'high' | 'medium' | 'low', string> = {
    high: t.impactHigh,
    medium: t.impactMedium,
    low: t.impactLow,
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { textAlign: align }]}>{t.calendarTitle}</Text>
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
            >
              <Text style={[styles.chipText, currency === c && styles.chipTextOn]}>{c}</Text>
            </Pressable>
          ))}
          {(['ALL', 'high', 'medium', 'low'] as const).map((imp) => (
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
          events.map((e) => (
            <View key={e.id} style={[styles.row, rtl && styles.rowRtl]}>
              <View
                style={[styles.dot, { backgroundColor: IMPACT_COLOR[e.impact] ?? colors.textDim }]}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.evTitle, { textAlign: align }]}>{e.title}</Text>
                <Text style={[styles.meta, { textAlign: align }]}>
                  {e.currency} · {e.when} · {e.forecast}
                </Text>
              </View>
            </View>
          ))
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
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: spacing.xs },
  evTitle: { color: colors.text, textAlign: 'right', fontSize: 12, fontWeight: '600' },
  meta: { color: colors.textDim, textAlign: 'right', fontSize: 10, marginTop: 2 },
});
