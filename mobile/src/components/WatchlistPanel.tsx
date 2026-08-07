import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { WATCHLIST } from '../chart/watchlist';
import { formatPrice } from '../chart/math';
import { SymbolSearchBar } from './SymbolSearchBar';

type Props = {
  activeSymbol: string;
  ticks: Record<string, number>;
  bases?: Record<string, number>;
  onPick: (symbol: string) => void;
  compact?: boolean;
};

const FALLBACK: Record<string, number> = {
  DXY: 104.25,
  EURUSD: 1.0854,
  GBPUSD: 1.2732,
  USDJPY: 157.42,
  XAUUSD: 2348.6,
  XAGUSD: 28.4,
  BTCUSD: 67420,
  ETHUSD: 3450,
};

export function WatchlistPanel({
  activeSymbol,
  ticks,
  bases = FALLBACK,
  onPick,
  compact = false,
}: Props) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <Text style={styles.title}>قائمة متابعة</Text>
      {!compact ? <SymbolSearchBar onPick={onPick} placeholder="بحث رمز…" /> : null}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {WATCHLIST.map((w) => {
          const on = activeSymbol === w.symbol;
          const price = ticks[w.symbol] ?? bases[w.symbol];
          const isDxy = w.symbol === 'DXY';
          return (
            <Pressable
              key={w.symbol}
              style={[styles.row, on && styles.rowOn, isDxy && styles.rowDxy]}
              onPress={() => onPick(w.symbol)}
            >
              <View style={styles.left}>
                <Text style={[styles.sym, on && styles.symOn, isDxy && styles.symDxy]}>
                  {w.symbol}
                </Text>
                {!compact ? (
                  <Text style={styles.label} numberOfLines={1}>
                    {w.label}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.price, on && styles.priceOn]}>
                {price != null ? formatPrice(price) : '—'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 198,
    backgroundColor: colors.bgElevated,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    paddingTop: 6,
    paddingHorizontal: 6,
  },
  wrapCompact: { width: 132, paddingHorizontal: 4 },
  title: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'right',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  list: { gap: 3, paddingBottom: 16 },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.bgPanel,
  },
  rowOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  rowDxy: {
    borderColor: '#1E3A5F',
    backgroundColor: '#0E1728',
  },
  left: { flex: 1, alignItems: 'flex-end', minWidth: 0 },
  sym: { color: colors.textMuted, fontWeight: '800', fontSize: 11 },
  symOn: { color: colors.accent },
  symDxy: { color: colors.dxy },
  label: { color: colors.textDim, fontSize: 9, marginTop: 1 },
  price: { color: colors.textMuted, fontSize: 10, fontWeight: '700', marginLeft: 6 },
  priceOn: { color: colors.text },
});
