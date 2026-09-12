import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { colors, radii, spacing, buttons } from '../theme';
import { api } from '../api';

const QUICK = [
  { id: 'ma_cross_up', label: 'MA ↑' },
  { id: 'rsi_oversold', label: 'RSI↓' },
  { id: 'bullish', label: 'زخم+' },
];

export function ScreenerMini() {
  const [hits, setHits] = useState<
    { symbol: string; rsi: number; change_pct: number; filters_matched: string[] }[]
  >([]);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async (filter: string) => {
    setLoading(true);
    try {
      const res = await api.screenerRun({ timeframe: '15m', filters: [filter] });
      setHits(res.results.slice(0, 5));
    } catch {
      setHits([]);
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
            key={q.id}
            style={({ pressed }) => [
              styles.chip,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={() => run(q.id)}
            disabled={loading}
          >
            <Text style={styles.chipText}>{q.label}</Text>
          </Pressable>
        ))}
      </View>
      {loading ? <ActivityIndicator color={colors.accent} size="small" /> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
          {hits.map((h) => (
            <View key={h.symbol} style={styles.hit}>
              <Text style={styles.sym}>{h.symbol}</Text>
              <Text style={styles.meta}>
                RSI {h.rsi} · {h.change_pct >= 0 ? '+' : ''}
                {h.change_pct}%
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
    gap: 8,
  },
  title: { color: colors.textMuted, fontWeight: '800', textAlign: 'right', fontSize: 12 },
  row: { flexDirection: 'row-reverse', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { color: colors.accent, fontWeight: '700', fontSize: 11 },
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
