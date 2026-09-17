import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { colors, radii, spacing, buttons } from '../theme';
import { api } from '../api';

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

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>تقويم اقتصادي · حي</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.filters}>
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
              accessibilityLabel={`تصفية حسب العملة: ${c === 'ALL' ? 'الكل' : c}`}
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
              accessibilityLabel={`تصفية حسب الأهمية: ${imp === 'ALL' ? 'الكل' : imp}`}
            >
              <Text style={[styles.chipText, impact === imp && styles.chipTextOn]}>
                {imp === 'ALL' ? 'كل' : imp}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <ScrollView style={{ maxHeight: compact ? 140 : 280 }}>
        {status === 'loading' ? (
          <Text style={styles.empty}>جاري تحميل التقويم…</Text>
        ) : events.length === 0 ? (
          status === 'error' ? (
            <Text style={styles.empty}>تعذر تحميل التقويم — تحقق من الاتصال</Text>
          ) : (
            <Text style={styles.empty}>لا أحداث بهذا الفلتر</Text>
          )
        ) : (
          events.map((e) => (
            <View key={e.id} style={styles.row}>
              <View
                style={[styles.dot, { backgroundColor: IMPACT_COLOR[e.impact] ?? colors.textDim }]}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.evTitle}>{e.title}</Text>
                <Text style={styles.meta}>
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
  filters: { flexDirection: 'row-reverse', gap: 6, paddingVertical: spacing.xs },
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
  row: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: spacing.xs },
  evTitle: { color: colors.text, textAlign: 'right', fontSize: 12, fontWeight: '600' },
  meta: { color: colors.textDim, textAlign: 'right', fontSize: 10, marginTop: 2 },
});
