import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { api } from '../api';

type Props = {
  symbol: string;
  timeframe?: string;
};

export function SymbolSnapshot({ symbol, timeframe = '15m' }: Props) {
  const [snap, setSnap] = useState<{
    rsi?: number;
    change_pct?: number;
    ma_cross_up?: boolean;
    ma_cross_down?: boolean;
    macd_cross_up?: boolean;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .indicatorSnapshot(symbol, timeframe)
      .then((s) => {
        if (alive) setSnap(s);
      })
      .catch(() => {
        if (alive) setSnap(null);
      });
    return () => {
      alive = false;
    };
  }, [symbol, timeframe]);

  if (!snap?.rsi) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.chip}>RSI {snap.rsi?.toFixed(0)}</Text>
      <Text style={styles.chip}>
        {snap.change_pct != null ? `${snap.change_pct >= 0 ? '+' : ''}${snap.change_pct.toFixed(2)}%` : '—'}
      </Text>
      {snap.ma_cross_up ? <Text style={[styles.chip, styles.bull]}>MA ↑</Text> : null}
      {snap.ma_cross_down ? <Text style={[styles.chip, styles.bear]}>MA ↓</Text> : null}
      {snap.macd_cross_up ? <Text style={[styles.chip, styles.bull]}>MACD ↑</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  bull: { color: colors.bull, borderColor: colors.bull },
  bear: { color: colors.bear, borderColor: colors.bear },
});
