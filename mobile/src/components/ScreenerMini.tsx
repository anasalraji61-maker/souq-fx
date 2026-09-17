import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { colors, radii, spacing, buttons } from '../theme';
import { api } from '../api';

const QUICK = [
  { id: 'ma_cross_up', label: 'MA ↑' },
  { id: 'rsi_oversold', label: 'RSI↓' },
  { id: 'bullish', label: 'زخم+' },
];

/** وصف مسموع كامل لكل فلتر سريع — النص المرئي مختصر (رموز/اختصارات إنجليزية) بلا معنى واضح
 * لقارئ الشاشة، فيُستخدَم هذا بدلاً منه فقط لـaccessibilityLabel. */
const QUICK_A11Y: Record<string, string> = {
  ma_cross_up: 'تقاطع المتوسط المتحرك صعوداً',
  rsi_oversold: 'تشبّع بيعي بمؤشر RSI',
  bullish: 'زخم صعودي',
};

export function ScreenerMini() {
  const [hits, setHits] = useState<
    { symbol: string; rsi: number; change_pct: number; filters_matched: string[] }[]
  >([]);
  const [loading, setLoading] = useState(false);
  /** وضوح الحالة: يميّز "لا نتائج مطابقة للفلتر" عن "فشل الاتصال بالفحص" بدل صمت كامل. */
  const [error, setError] = useState(false);

  const run = useCallback(async (filter: string) => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.screenerRun({ timeframe: '15m', filters: [filter] });
      setHits(res.results.slice(0, 5));
    } catch {
      setHits([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>فحص سريع</Text>
      <View style={styles.row}>
        {QUICK.map((q) => (
          <Pressable
            accessibilityRole="button"
            key={q.id}
            style={({ pressed }) => [
              styles.chip,
              loading && styles.chipDisabled,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={() => run(q.id)}
            disabled={loading}
            accessibilityState={{ disabled: loading }}
            accessibilityLabel={QUICK_A11Y[q.id] ?? q.label}
          >
            <Text style={styles.chipText}>{q.label}</Text>
          </Pressable>
        ))}
      </View>
      {loading ? <ActivityIndicator color={colors.accent} size="small" /> : null}
      {!loading && error ? <Text style={styles.errorNote}>تعذر تشغيل الفحص — حاول لاحقاً</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row-reverse', gap: spacing.sm }}>
          {hits.map((h) => (
            <View key={h.symbol} style={styles.hit}>
              <Text style={styles.sym}>{h.symbol}</Text>
              <Text style={styles.meta}>
                RSI {h.rsi} ·{' '}
                <Text
                  style={{
                    color: h.change_pct >= 0 ? colors.bull : colors.bear,
                    fontWeight: '800',
                  }}
                >
                  {h.change_pct >= 0 ? '+' : ''}
                  {h.change_pct}%
                </Text>
              </Text>
            </View>
          ))}
        </View>
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
    gap: spacing.sm,
  },
  title: { color: colors.textMuted, fontWeight: '800', textAlign: 'right', fontSize: 12 },
  errorNote: { color: colors.warn, textAlign: 'right', fontSize: 11 },
  row: { flexDirection: 'row-reverse', gap: 6 },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { color: colors.accent, fontWeight: '700', fontSize: 11 },
  chipDisabled: { opacity: 0.4 },
  hit: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  sym: { color: colors.text, fontWeight: '800', fontSize: 12 },
  meta: { color: colors.textDim, fontSize: 10 },
});
