import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, LayoutChangeEvent } from 'react-native';
import { colors, radii, spacing, buttons } from '../theme';
import type { ChartSeries, LiveTick } from '../api';
import { TimeframeBar } from './TimeframeBar';
import type { Timeframe } from '../timeframes';
import { MatrixChart, type SyncTimeWindow } from '../chart/MatrixChart';
import { formatPrice } from '../chart/math';
import {
  provenanceLabel,
  tickStatusLabel,
  normalizeProvenance,
} from '../chart/dataSource';
import { livePriceForChart } from '../chart/liveSeries';
import { useTickFreshnessClock } from '../hooks/useTickFreshnessClock';

import { FRAME_CHART_H, FRAME_CHART_H_PHONE } from './FrameSizedGrid';
import type { PanSpeedPercent } from '../chart/panSpeed';
import { PairDrumWheel } from './PairDrumWheel';

type Size = 'hero' | 'large' | 'medium' | 'small';

type Props = {
  series: ChartSeries;
  size?: Size;
  accent?: string;
  label?: string;
  showTimeframes?: boolean;
  onTimeframeChange?: (tf: Timeframe) => void;
  phone?: boolean;
  interactive?: boolean;
  panControls?: boolean;
  fill?: boolean;
  panSpeed?: PanSpeedPercent;
  /** @deprecated prefer liveTick */
  livePrice?: number | null;
  liveTick?: LiveTick | null;
  onFocus?: () => void;
  onSymbolChange?: (symbol: string) => void;
  syncWindow?: SyncTimeWindow | null;
  onSyncWindow?: (next: SyncTimeWindow) => void;
  syncFollow?: boolean;
  onSyncActivate?: () => void;
  syncBadge?: 'leader' | 'follow' | 'partial' | 'off' | null;
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

function candleTimeSec(t: number): number {
  return t > 1e12 ? t / 1000 : t;
}

function isPartialTimeCover(series: ChartSeries, win: SyncTimeWindow | null | undefined): boolean {
  if (!win || !(win.end > win.start) || !series.candles?.length) return false;
  const first = candleTimeSec(series.candles[0]!.time);
  const last = candleTimeSec(series.candles[series.candles.length - 1]!.time);
  const lo = Math.min(first, last);
  const hi = Math.max(first, last);
  return lo > win.start + 30 || hi < win.end - 30;
}

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
  liveTick = null,
  onFocus,
  onSymbolChange,
  syncWindow = null,
  onSyncWindow,
  syncFollow = false,
  onSyncActivate,
  syncBadge = null,
}: Props) {
  const [wheelOpen, setWheelOpen] = useState(false);
  const navigate = panControls || interactive;
  const baseH = (phone ? HEIGHT_PHONE : HEIGHT)[size] + (interactive ? 220 : 0);
  const [measuredH, setMeasuredH] = useState(baseH);
  const chartH = fill ? measuredH : baseH;
  const up = series.change_pct >= 0;
  const partial = syncFollow && isPartialTimeCover(series, syncWindow);
  const badge =
    syncBadge === 'leader'
      ? 'قائد الزمن'
      : syncBadge === 'partial' || partial
        ? 'متزامن · جزئي'
        : syncBadge === 'follow'
          ? 'متزامن'
          : null;
  const candleSrc = normalizeProvenance(series.data_source);
  const resolvedTick: LiveTick | null =
    liveTick ??
    (livePrice != null
      ? { price: livePrice, source: { kind: 'unknown', as_of: null, channel: null } }
      : null);
  const nowMs = useTickFreshnessClock(resolvedTick?.source.as_of ?? null);
  const nowSec = nowMs / 1000;
  const mergeOpts = {
    tickAsOf: resolvedTick?.source.as_of ?? null,
    timeframe: series.timeframe,
    nowSec,
  };
  const mergePrice = livePriceForChart(series, resolvedTick, mergeOpts);
  const headerPrice = resolvedTick?.price ?? series.last;
  const tickTag = resolvedTick
    ? tickStatusLabel(resolvedTick.source, resolvedTick.source.as_of, nowSec)
    : null;
  const candleTag = provenanceLabel(candleSrc);

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
    <Pressable
      accessibilityRole="button"
      style={[styles.wrap, size === 'hero' && styles.heroWrap, fill && styles.wrapFill]}
      onPress={onSyncActivate}
      disabled={!onSyncActivate}
      accessibilityState={{ disabled: !onSyncActivate }}
    >
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
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.symbolHit,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={() => {
              if (onSymbolChange) setWheelOpen((v) => !v);
            }}
            accessibilityLabel={onSymbolChange ? 'تغيير الرمز' : undefined}
          >
            <Text
              style={styles.symbol}
              numberOfLines={1}
              {...(Platform.OS === 'web'
                ? ({ translate: 'no', className: 'notranslate' } as object)
                : {})}
            >
              {(label || series.symbol).toUpperCase()}
            </Text>
            {onSymbolChange ? <Text style={styles.symbolCaret}>▾</Text> : null}
          </Pressable>
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
          {badge ? (
            <Text
              style={[
                styles.syncBadge,
                syncBadge === 'leader' && styles.syncBadgeLeader,
                (syncBadge === 'partial' || partial) && styles.syncBadgePartial,
              ]}
            >
              {badge}
            </Text>
          ) : null}
          <Text
            style={[
              styles.sourceTag,
              candleSrc.kind === 'demo' && styles.sourceTagDemo,
              candleSrc.kind === 'unknown' && styles.sourceTagUnknown,
            ]}
          >
            {candleTag}
          </Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(headerPrice)}</Text>
          {tickTag ? (
            <Text
              style={[
                styles.liveTag,
                tickTag !== 'حي' && styles.liveTagMuted,
                tickTag === 'تيك تجريبي' && styles.sourceTagDemo,
              ]}
            >
              {tickTag}
            </Text>
          ) : null}
          <Text style={[styles.chg, { color: up ? colors.bull : colors.bear }]}>
            {up ? '+' : ''}
            {series.change_pct.toFixed(2)}%
          </Text>
          {onFocus ? (
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.focusBtn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={onFocus}
              accessibilityLabel="فتح الشارت بملء الشاشة"
              hitSlop={8}
            >
              <Text style={styles.focusBtnText}>⛶</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {wheelOpen && onSymbolChange ? (
        <View style={styles.wheelLayer}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setWheelOpen(false)} />
          <PairDrumWheel
            value={series.symbol}
            onChange={(next) => onSymbolChange(next)}
            onClose={() => setWheelOpen(false)}
          />
        </View>
      ) : null}

      <View style={styles.chartPad} onLayout={onChartPadLayout}>
        {navigate && !fill ? <Text style={styles.hint}>{subtitle}</Text> : null}
        <MatrixChart
          series={series}
          height={chartH}
          interactive={interactive}
          panControls={navigate}
          persistDrawings={interactive}
          accent={accent}
          livePrice={mergePrice}
          liveTickSource={resolvedTick?.source ?? null}
          dense={fill}
          panSpeed={panSpeed}
          initialLens="clean"
          initialIndicators={[]}
          syncWindow={syncWindow}
          onSyncWindow={onSyncWindow}
          syncFollow={syncFollow}
          syncTimeOnly
        />
      </View>
    </Pressable>
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
    position: 'relative',
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    minWidth: 0,
  },
  symbolHit: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 0 },
  symbolCaret: { color: colors.textDim, fontSize: 10, fontWeight: '800' },
  wheelLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 14, 22, 0.35)',
  },
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
  liveTagMuted: { color: colors.textMuted, fontWeight: '700' },
  sourceTag: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: '700',
    marginInlineStart: 4,
    opacity: 0.9,
  },
  sourceTagDemo: { color: colors.warn },
  sourceTagUnknown: { color: colors.textMuted },
  chg: { fontSize: 12, fontWeight: '700' },
  focusBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPanel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusBtnText: { color: colors.accent, fontSize: 13, fontWeight: '800' },
  hint: {
    color: colors.textMuted,
    fontSize: 10,
    textAlign: 'right',
    paddingHorizontal: spacing.sm,
    marginBottom: 2,
  },
  syncBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    color: colors.accent,
    fontSize: 9,
    fontWeight: '800',
    backgroundColor: colors.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(45,212,191,0.45)',
  },
  syncBadgeLeader: {
    color: '#4ADE80',
    borderColor: 'rgba(74,222,128,0.5)',
    backgroundColor: 'rgba(74,222,128,0.12)',
  },
  syncBadgePartial: {
    color: colors.warn,
    borderColor: 'rgba(245,158,11,0.45)',
    backgroundColor: 'rgba(245,158,11,0.12)',
  },
  chartPad: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    minHeight: 0,
  },
});
