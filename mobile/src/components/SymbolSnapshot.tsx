import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { api } from '../api';
import { useI18n } from '../i18n/I18nContext';

type Props = {
  symbol: string;
  timeframe?: string;
};

export function SymbolSnapshot({ symbol, timeframe = '15m' }: Props) {
  const { rtl } = useI18n();
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
        // demo = RSI/تقاطعات على شموع مختلَقة (المزوّد متعذّر) — لا شارات بدل أرقام مضلِّلة.
        if (alive) setSnap(s.data_kind === 'demo' ? null : s);
      })
      .catch(() => {
        if (alive) setSnap(null);
      });
    return () => {
      alive = false;
    };
  }, [symbol, timeframe]);

  // `!snap.rsi` كان يُخفي الشريط كلّه عند RSI = 0 — وهي قيمة حقيقية ممكنة (كل إغلاقات الفترة هابطة،
  // يحدث بفريم صغير وسط حركة أحادية الاتجاه)، أي يختفي التلميح باللحظة التي يعني فيها أكثر ما يعني.
  if (snap?.rsi == null) return null;
  const rsi = snap.rsi;

  return (
    <View style={[styles.wrap, rtl && styles.wrapRtl]}>
      <Text style={styles.chip}>RSI {rsi.toFixed(0)}</Text>
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
  // كان `row-reverse` ثابتاً — أي أن الشرائح تُقرأ معكوسة بالإنجليزية (وأمريكا/أوروبا سوقان
  // مستهدفان)؛ بقية ألواح التطبيق تقلب الاتجاه بشرط `rtl` لا دائماً.
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  wrapRtl: { flexDirection: 'row-reverse' },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
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
