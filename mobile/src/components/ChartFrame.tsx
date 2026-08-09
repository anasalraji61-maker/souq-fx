import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, LayoutChangeEvent } from 'react-native';
import { colors, radii, spacing } from '../theme';
import type { ChartSeries } from '../api';
import { TimeframeBar } from './TimeframeBar';
import type { Timeframe } from '../timeframes';
import { MatrixChart } from '../chart/MatrixChart';
import { formatPrice } from '../chart/math';

import { FRAME_CHART_H, FRAME_CHART_H_PHONE } from './FrameSizedGrid';
import type { PanSpeedPercent } from '../chart/panSpeed';

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
  /** تحريك الشموع والمحاور داخل الفريم */
  panControls?: boolean;
  /** يملأ ارتفاع الخلية (مستطيلات تملأ الشاشة) */
  fill?: boolean;
  /** نسبة سرعة السحب 1–100 */
  panSpeed?: PanSpeedPercent;
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
  panControls = false,
  fill = false,
  panSpeed,
  livePrice = null,
  onFocus,
}: Props) {
  const navigate = panControls || interactive;
  const baseH = (phone ? HEIGHT_PHONE : HEIGHT)[size] + (interactive ? 220 : 0);
  const [measuredH, setMeasuredH] = useState(baseH);
  const chartH = fill ? measuredH : baseH;
  const up = series.change_pct >= 0;

  const subtitle = useMemo(() => {
    if (interactive) return 'محرك MATRIX · عدسات وأدوات';
    if (navigate) return 'اسحب الوسط · السعر · التواريخ';
    return 'اضغط للتحليل الكامل';
  }, [interactive, navigate]);

  const onChartPadLayout = (e: LayoutChangeEvent) => {
    if (!fill) return;
    const h = e.nativeEvent.layout.height;
    const next = Math.max(120, Math.floor(h));
    setMeasuredH((prev) => (Math.abs(prev - next) > 2 ? next : prev));
  };

  return (
    <View style={[styles.wrap, size === 'hero' && styles.heroWrap, fill && styles.wrapFill]}>
      {showTimeframes && onTimeframeChange ? (
        <View style={styles.tfTopLeft}>
          <TimeframeBar
            value={series.timeframe}
            onChange={onTimeframeChange}
            compact={size === 'small' || fill}
          />
        </View>
      ) : null}

      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.dot, { backgroundColor: accent }]} />
          <Text
            style={styles.symbol}
            numberOfLines={1}
            {...(Platform.OS === 'web'
              ? ({ translate: 'no', className: 'notranslate' } as object)
              : {})}
          >
            {(label || series.symbol).toUpperCase()}
          </Text>
          {!showTimeframes ? (
            <Text
              style={styles.tf}
              {...(Platform.OS === 'web'
                ? ({ translate: 'no', className: 'notranslate' } as object)
                : {})}
            >
              {series.timeframe}
            </Text>
          ) : null}
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(livePrice ?? series.last)}</Text>
          {livePrice != null ? <Text style={styles.liveTag}>حي</Text> : null}
          <Text style={[styles.chg, { color: up ? colors.bull : colors.bear }]}>
            {up ? '+' : ''}
            {series.change_pct.toFixed(2)}%
          </Text>
          {onFocus ? (
            <Pressable style={styles.focusBtn} onPress={onFocus}>
              <Text style={styles.focusBtnText}>⛶</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.chartPad} onLayout={onChartPadLayout}>
        {navigate && !fill ? <Text style={styles.hint}>{subtitle}</Text> : null}
        <MatrixChart
          series={series}
          height={chartH}
          interactive={interactive}
          panControls={navigate}
          persistDrawings={interactive}
          accent={accent}
          livePrice={livePrice}
          dense={fill}
          panSpeed={panSpeed}
          initialLens="clean"
          initialIndicators={[]}
        />
      </View>
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
  wrapFill: {
    minHeight: 0,
  },
  heroWrap: {
    borderColor: '#1E3A5F',
    backgroundColor: '#0E1728',
  },
  tfTopLeft: {
    alignItems: 'flex-start',
    paddingLeft: spacing.sm,
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
    gap: 8,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, minWidth: 0 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  symbol: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.4,
    flexShrink: 1,
  },
  tf: { color: colors.textDim, fontSize: 11, marginLeft: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  price: { color: colors.text, fontWeight: '600', fontSize: 13 },
  liveTag: { color: colors.bull, fontSize: 9, fontWeight: '800' },
  chg: { fontSize: 12, fontWeight: '700' },
  focusBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPanel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusBtnText: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  hint: {
    color: colors.textDim,
    fontSize: 9,
    textAlign: 'right',
    paddingHorizontal: spacing.sm,
    marginBottom: 2,
  },
  chartPad: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    minHeight: 0,
  },
});
