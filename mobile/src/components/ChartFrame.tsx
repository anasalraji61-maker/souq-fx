import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, radii, spacing } from '../theme';
import type { ChartSeries } from '../api';
import { TimeframeBar } from './TimeframeBar';
import type { Timeframe } from '../timeframes';
import { MatrixChart } from '../chart/MatrixChart';
import { formatPrice } from '../chart/math';

import { FRAME_CHART_H, FRAME_CHART_H_PHONE } from './FrameSizedGrid';

type Size = 'hero' | 'large' | 'medium' | 'small';

type Props = {
  series: ChartSeries;
  size?: Size;
  accent?: string;
  label?: string;
  showTimeframes?: boolean;
  onTimeframeChange?: (tf: Timeframe) => void;
  phone?: boolean;
  /** وضع أدوات كاملة داخل الإطار */
  interactive?: boolean;
  livePrice?: number | null;
  onFocus?: () => void;
};

const HEIGHT: Record<Size, number> = {
  hero: FRAME_CHART_H,
  large: FRAME_CHART_H,
  medium: FRAME_CHART_H - 40,
  small: FRAME_CHART_H - 60,
};

const HEIGHT_PHONE: Record<Size, number> = {
  hero: FRAME_CHART_H_PHONE,
  large: FRAME_CHART_H_PHONE,
  medium: FRAME_CHART_H_PHONE - 20,
  small: FRAME_CHART_H_PHONE - 30,
};

export function ChartFrame({
  series,
  size = 'medium',
  accent = colors.accent,
  label,
  showTimeframes = false,
  onTimeframeChange,
  phone = false,
  interactive = false,
  livePrice = null,
  onFocus,
}: Props) {
  const chartH = (phone ? HEIGHT_PHONE : HEIGHT)[size] + (interactive ? 220 : 0);
  const up = series.change_pct >= 0;

  const subtitle = useMemo(() => {
    if (interactive) return 'محرك MATRIX · عدسات وأدوات';
    return 'اضغط للتحليل الكامل';
  }, [interactive]);

  return (
    <View style={[styles.wrap, size === 'hero' && styles.heroWrap]}>
      {showTimeframes && onTimeframeChange ? (
        <View style={styles.tfTopLeft}>
          <TimeframeBar
            value={series.timeframe}
            onChange={onTimeframeChange}
            compact={size === 'small'}
          />
        </View>
      ) : null}

      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.dot, { backgroundColor: accent }]} />
          <Text style={styles.symbol}>{label || series.symbol}</Text>
          {!showTimeframes ? <Text style={styles.tf}>{series.timeframe}</Text> : null}
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(livePrice ?? series.last)}</Text>
          {livePrice != null ? <Text style={styles.liveTag}>حي</Text> : null}
          <Text style={[styles.chg, { color: up ? colors.bull : colors.bear }]}>
            {up ? '+' : ''}
            {series.change_pct.toFixed(2)}%
          </Text>
        </View>
      </View>

      {interactive ? (
        <View style={styles.chartPad}>
          <Text style={styles.hint}>{subtitle}</Text>
          <MatrixChart
            series={series}
            height={chartH}
            interactive
            accent={accent}
            livePrice={livePrice}
            initialLens="clean"
            initialIndicators={[]}
          />
        </View>
      ) : (
        <Pressable onPress={onFocus} disabled={!onFocus}>
          <Text style={styles.hint}>{subtitle}</Text>
          <View style={styles.chartPad} pointerEvents="none">
            <MatrixChart
              series={series}
              height={chartH}
              interactive={false}
              persistDrawings={false}
              accent={accent}
              livePrice={livePrice}
              initialLens="clean"
              initialIndicators={[]}
            />
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    height: '100%',
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    minWidth: 140,
  },
  heroWrap: {
    borderColor: '#1E3A5F',
    backgroundColor: '#0E1728',
  },
  tfTopLeft: {
    alignItems: 'flex-start',
    paddingLeft: 40,
    paddingRight: spacing.sm,
    paddingTop: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  symbol: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.4,
  },
  tf: { color: colors.textDim, fontSize: 11, marginLeft: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  price: { color: colors.text, fontWeight: '600', fontSize: 13 },
  liveTag: { color: colors.bull, fontSize: 9, fontWeight: '800' },
  chg: { fontSize: 12, fontWeight: '700' },
  hint: {
    color: colors.textDim,
    fontSize: 10,
    textAlign: 'right',
    paddingHorizontal: spacing.md,
    marginBottom: 2,
  },
  chartPad: { paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
});
