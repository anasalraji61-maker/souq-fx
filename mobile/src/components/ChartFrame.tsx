import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, LayoutChangeEvent } from 'react-native';
import { colors, radii, spacing, buttons } from '../theme';
import { api, type ChartSeries, type LiveTick } from '../api';
import { TimeframeBar } from './TimeframeBar';
import type { Timeframe } from '../timeframes';
import { MatrixChart, type SyncTimeWindow } from '../chart/MatrixChart';
import { formatPrice } from '../chart/math';
import { formatPct } from '../chart/dailyChange';
import { instrumentSpec, pipsBetween } from '../positionSize';
import {
  provenanceLabel,
  tickStatusKind,
  normalizeProvenance,
} from '../chart/dataSource';
import { liveChangePct, livePriceForChart } from '../chart/liveSeries';
import { useTickFreshnessClock } from '../hooks/useTickFreshnessClock';
import { isForexMarketOpen } from '../chart/marketHours';

import { FRAME_CHART_H, FRAME_CHART_H_PHONE } from './FrameSizedGrid';
import type { PanSpeedPercent } from '../chart/panSpeed';
import { PairDrumWheel } from './PairDrumWheel';
import { useI18n } from '../i18n/I18nContext';

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
  const { t, rtl } = useI18n();
  const [wheelOpen, setWheelOpen] = useState(false);

  // تبديل الفريم/الرمز يمرّ بجولة شبكة عند الشاشة المالكة: حتى تصل السلسلة الجديدة
  // كان الإطار يعرض **شموع الفريم السابق وسعره** بلا أي أثر، وشريط الفريمات يرتدّ
  // للقيمة القديمة وكأن الضغطة ضاعت. الآن: الزرّ المضغوط يضيء فوراً، والأرقام والشموع
  // القديمة تبهت حتى وصول الجديدة (وسقف زمني يمنع بقاء الإطار باهتاً لو فشل الجلب).
  const [pendingSwitch, setPendingSwitch] = useState<{ tf?: Timeframe; symbol?: string } | null>(
    null
  );
  useEffect(() => {
    if (!pendingSwitch) return;
    const tfDone = !pendingSwitch.tf || pendingSwitch.tf === series.timeframe;
    const symDone = !pendingSwitch.symbol || pendingSwitch.symbol === series.symbol;
    if (tfDone && symDone) {
      setPendingSwitch(null);
      return;
    }
    const id = setTimeout(() => setPendingSwitch(null), 8000);
    return () => clearTimeout(id);
  }, [pendingSwitch, series.timeframe, series.symbol]);
  const switching = pendingSwitch != null;
  const navigate = panControls || interactive;
  const baseH = (phone ? HEIGHT_PHONE : HEIGHT)[size] + (interactive ? 220 : 0);
  const [measuredH, setMeasuredH] = useState(baseH);
  const chartH = fill ? measuredH : baseH;
  const partial = syncFollow && isPartialTimeCover(series, syncWindow);
  const badge =
    syncBadge === 'leader'
      ? t.cfSyncLeaderBadge
      : syncBadge === 'partial' || partial
        ? t.cfSyncPartialBadge
        : syncBadge === 'follow'
          ? t.cfSyncFollowBadge
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
  // نسبة الرأس كانت تُطبع خاماً بشرط `>= 0`: الصفر يُكتب «+0.00%» بالأخضر، وسالبُ الصفر
  // (`round(chg, 2)` بالخادم يُخرج ‎-0.0‎ لهبوط دقيق) كذلك — فزوجٌ هابط يقرأ صاعداً.
  // الآن `formatPct` المعتمدة، واللون من **الرقم المطبوع** نفسه: ما يُقرّب إلى صفر مكتوم.
  // والنسبة تتبع السعر الحيّ المدموج بالشمعة (`liveChangePct`) لا الجلب الأخير وحده.
  const livePct = liveChangePct(series, mergePrice);
  const chgPct = Number.isFinite(livePct) ? livePct : null;
  const chgRounded = chgPct == null ? 0 : Math.round(chgPct * 100) / 100;
  const chgColor = chgRounded > 0 ? colors.bull : chgRounded < 0 ? colors.bear : colors.textDim;
  const headerPrice = resolvedTick?.price ?? series.last;
  const tickKind = resolvedTick
    ? tickStatusKind(resolvedTick.source, resolvedTick.source.as_of, nowSec)
    : null;
  const tickTag =
    tickKind === 'live'
      ? t.dsTickLive
      : tickKind === 'demo'
        ? t.dsTickDemo
        : tickKind === 'lastPrice'
          ? t.dsLastPriceWord
          : null;
  const candleTag = provenanceLabel(candleSrc, {
    provider: t.dsKindProvider,
    demo: t.dsKindDemo,
    cache: t.dsKindCache,
    unknown: t.dsKindUnknown,
  });
  const marketClosed = !isForexMarketOpen(series.symbol);

  // السبريد مربوط بالرمز الذي جُلب له: كان `quote` يبقى على قيم الرمز السابق حتى
  // يصل جلب الرمز الجديد، فيقرأ المتداول سبريد زوج بجانب سعر زوج آخر.
  const [quote, setQuote] = useState<{
    forSymbol: string;
    bid?: number | null;
    ask?: number | null;
  } | null>(null);
  useEffect(() => {
    let alive = true;
    const forSymbol = series.symbol;
    api
      .marketQuote(forSymbol)
      .then((q) => {
        if (alive) setQuote({ forSymbol, bid: q?.bid ?? null, ask: q?.ask ?? null });
      })
      .catch(() => {
        if (alive) setQuote(null);
      });
    return () => {
      alive = false;
    };
  }, [series.symbol, series.last]);
  const liveQuote = quote && quote.forSymbol === series.symbol ? quote : null;
  const hasSpread =
    liveQuote?.bid != null && liveQuote?.ask != null && liveQuote.ask > liveQuote.bid;
  // السبريد كان سعرَين خامَين يطرحهما المتداول بذهنه — وهو يقرؤه بالـpip (كلفة دخوله الفعلية).
  // حجم الـpip من `instrumentSpec` (الين 0.01، الذهب 0.1…) و`pipsBetween` نفسها التي تبني
  // عليها الحاسبة وأداة القياس؛ أداة بلا مواصفة pip (مؤشر، رمز بلاحقة وسيط) تبقى بالسعرين وحدهما.
  const spreadSpec = hasSpread ? instrumentSpec(series.symbol) : null;
  const spreadPips =
    spreadSpec && hasSpread ? pipsBetween(spreadSpec, liveQuote!.bid!, liveQuote!.ask!) : null;

  const subtitle = useMemo(() => {
    if (interactive) return t.cfSubtitleInteractive;
    if (navigate) return t.cfSubtitleNavigate;
    return t.cfSubtitleDefault;
  }, [interactive, navigate, t]);

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
      accessibilityLabel={onSyncActivate ? `${t.cfSyncActivateA11yPrefix}${(label || series.symbol).toUpperCase()}` : undefined}
    >
      {showTimeframes && onTimeframeChange ? (
        <View style={styles.tfTopLeft}>
          <TimeframeBar
            value={pendingSwitch?.tf ?? series.timeframe}
            onChange={(next) => {
              if (next !== series.timeframe) setPendingSwitch({ tf: next });
              onTimeframeChange?.(next);
            }}
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
            accessibilityLabel={onSymbolChange ? t.cfChangeSymbolA11y : undefined}
            hitSlop={8}
          >
            <Text
              style={styles.symbol}
              numberOfLines={1}
              {...(Platform.OS === 'web'
                ? ({ translate: 'no', className: 'notranslate' } as object)
                : {})}
            >
              {(pendingSwitch?.symbol || label || series.symbol).toUpperCase()}
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
          {switching ? (
            <Text style={styles.switchTag} accessibilityLabel={t.mcSwitchingA11y}>
              {t.mcSwitching}
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
          {marketClosed ? (
            <Text style={styles.marketClosedTag} accessibilityLabel={t.cfMarketClosedA11y}>
              {t.cfMarketClosedTag}
            </Text>
          ) : null}
        </View>
        <View style={[styles.priceRow, switching && styles.stale]}>
          <Text style={styles.price}>{formatPrice(headerPrice, series.symbol)}</Text>
          {tickTag ? (
            <Text
              style={[
                styles.liveTag,
                tickKind !== 'live' && styles.liveTagMuted,
                tickKind === 'demo' && styles.sourceTagDemo,
              ]}
            >
              {tickTag}
            </Text>
          ) : null}
          {hasSpread ? (
            <Text style={styles.spreadTag} accessibilityLabel={t.cfSpreadA11y}>
              {`B ${formatPrice(liveQuote!.bid!, series.symbol)} · A ${formatPrice(liveQuote!.ask!, series.symbol)}`}
              {spreadPips != null ? (
                <Text style={styles.spreadPips}>{` · ${spreadPips.toFixed(1)} pip`}</Text>
              ) : null}
            </Text>
          ) : null}
          <Text style={[styles.chg, { color: chgColor }]}>
            {chgPct == null ? '—' : formatPct(chgPct)}
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
              accessibilityLabel={t.termOpenFullscreenA11y}
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
            onChange={(next) => {
              if (next !== series.symbol) setPendingSwitch({ symbol: next });
              onSymbolChange?.(next);
            }}
            onClose={() => setWheelOpen(false)}
          />
        </View>
      ) : null}

      <View style={[styles.chartPad, switching && styles.stale]} onLayout={onChartPadLayout}>
        {/* سطر التلميح نصّ واجهة مترجَم («اسحب للتنقّل…») وكان `textAlign: 'right'` ثابتاً بالنمط —
            `rtl` لم تكن تُقرأ بهذا الملف أصلاً. فمتداول الإنجليزية يقرأ التلميح ملتصقاً بالحافة
            المقابلة لقراءته فوق كل إطار شارت بالشاشة الرئيسية. بقية رأس الإطار أرقام ورموز لاتينية
            (EURUSD · 1.08540) فتبقى بترتيبها كما هي عمداً — سوقان من الثلاثة يقرآن من اليسار. */}
        {navigate && !fill ? (
          <Text style={[styles.hint, !rtl && styles.hintLtr]}>{subtitle}</Text>
        ) : null}
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
    borderColor: colors.heroBorder,
    backgroundColor: colors.heroBg,
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
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    minWidth: 0,
  },
  symbolHit: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 0 },
  // بيانات الفريم/الرمز السابق أثناء انتظار الجديد: باهتة لا مخفيّة — الإطار لا يقفز،
  // والمتداول يرى أنها ليست أرقام ما ضغط عليه بعد.
  stale: { opacity: 0.38 },
  switchTag: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radii.sm,
    backgroundColor: colors.accentSoft,
    flexShrink: 0,
  },
  symbolCaret: { color: colors.textDim, fontSize: 10, fontWeight: '800' },
  wheelLayer: {
    ...StyleSheet.absoluteFill, // RN 0.86 أزال absoluteFillObject وقت التشغيل (كان يُنشر undefined فتفقد الطبقة position:absolute)
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
  tf: { color: colors.textDim, fontSize: 11, marginLeft: spacing.xs },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 0 },
  price: { color: colors.text, fontWeight: '600', fontSize: 13 },
  liveTag: { color: colors.bull, fontSize: 9, fontWeight: '800' },
  liveTagMuted: { color: colors.textMuted, fontWeight: '700' },
  spreadTag: { color: colors.textDim, fontSize: 9, fontWeight: '700' },
  /** السبريد بالـpip هو الرقم الذي يُقرأ؛ أبرز قليلاً من السعرين بجانبه. */
  spreadPips: { color: colors.text, fontWeight: '800' },
  sourceTag: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: '700',
    marginInlineStart: 4,
    opacity: 0.9,
  },
  sourceTagDemo: { color: colors.warn },
  sourceTagUnknown: { color: colors.textMuted },
  marketClosedTag: {
    color: colors.warn,
    fontSize: 9,
    fontWeight: '700',
    marginInlineStart: 4,
    opacity: 0.9,
  },
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
  hintLtr: { textAlign: 'left' },
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
    borderColor: colors.accentBorderGlow,
  },
  syncBadgeLeader: {
    color: colors.leaderGreen,
    borderColor: 'rgba(74,222,128,0.5)',
    backgroundColor: 'rgba(74,222,128,0.12)',
  },
  syncBadgePartial: {
    color: colors.warn,
    borderColor: 'rgba(245,158,11,0.45)',
    backgroundColor: colors.warnSoft,
  },
  chartPad: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    minHeight: 0,
  },
});
