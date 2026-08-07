import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { computeDomLite, computeFootprint } from '../chart/orderflow';
import { formatPrice } from '../chart/math';
import { api, type Candle } from '../api';

type Props = {
  last: number;
  candles?: Candle[];
  symbol?: string;
};

export function DomLitePanel({ last, candles = [], symbol = 'EURUSD' }: Props) {
  const [book, setBook] = useState<{ bid?: number | null; ask?: number | null; price?: number } | null>(
    null
  );

  useEffect(() => {
    let alive = true;
    api
      .marketQuote(symbol)
      .then((q) => {
        if (alive) setBook(q);
      })
      .catch(() => {
        if (alive) setBook(null);
      });
    return () => {
      alive = false;
    };
  }, [symbol, last]);

  const mid = book?.price ?? last;
  const rows = useMemo(() => {
    const fp = candles.length ? computeFootprint(candles) : [];
    const lastFp = fp.length ? fp[fp.length - 1] : null;
    return computeDomLite(mid, lastFp, 12, book?.bid, book?.ask);
  }, [mid, candles, book?.bid, book?.ask]);

  if (!mid || !rows.length) return null;
  const maxDepth = Math.max(...rows.flatMap((r) => [r.bid, r.ask]), 1);
  const liveBook = book?.bid != null && book?.ask != null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>DOM · عمق السوق</Text>
      <Text style={styles.sub}>
        {liveBook
          ? `Bid ${formatPrice(book!.bid!)} · Ask ${formatPrice(book!.ask!)} · من Quote`
          : 'عمق تقديري (عند غياب L2 من المزود)'}
      </Text>
      {rows.map((r) => {
        const atMid = Math.abs(r.price - mid) < mid * 0.00025;
        return (
          <View key={r.price} style={[styles.row, atMid && styles.rowMid]}>
            <View style={styles.side}>
              <View
                style={[
                  styles.bar,
                  styles.bidBar,
                  { flexGrow: Math.max(0.15, r.bid / maxDepth), flexBasis: 0 },
                ]}
              />
              <Text style={styles.bid}>{r.bid}</Text>
            </View>
            <Text style={[styles.price, atMid && styles.priceMid]}>{formatPrice(r.price)}</Text>
            <View style={styles.side}>
              <Text style={styles.ask}>{r.ask}</Text>
              <View
                style={[
                  styles.bar,
                  styles.askBar,
                  { flexGrow: Math.max(0.15, r.ask / maxDepth), flexBasis: 0 },
                ]}
              />
            </View>
          </View>
        );
      })}
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
    gap: 4,
  },
  title: { color: colors.text, fontWeight: '800', textAlign: 'right', fontSize: 14 },
  sub: { color: colors.textDim, textAlign: 'right', fontSize: 10, marginBottom: 4 },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  rowMid: { backgroundColor: 'rgba(45,212,191,0.08)', borderRadius: 4 },
  side: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  bar: { height: 8, borderRadius: 2, minWidth: 8 },
  bidBar: { backgroundColor: 'rgba(34,197,94,0.45)' },
  askBar: { backgroundColor: 'rgba(239,68,68,0.45)' },
  bid: { color: colors.bull, fontSize: 10, fontWeight: '700', width: 36, textAlign: 'left' },
  ask: { color: colors.bear, fontSize: 10, fontWeight: '700', width: 36, textAlign: 'right' },
  price: { color: colors.textMuted, fontSize: 11, fontWeight: '700', width: 72, textAlign: 'center' },
  priceMid: { color: colors.accent },
});
