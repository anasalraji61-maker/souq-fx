import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, LayoutChangeEvent } from 'react-native';
import { colors, radii, spacing, buttons, numeric } from '../theme';
import { api, type ChartSeries, type LiveTick } from '../api';
import { TimeframeBar } from './TimeframeBar';
import { isTimeframe, type Timeframe } from '../timeframes';
import { MatrixChart, type SyncTimeWindow } from '../chart/MatrixChart';
import { formatPrice } from '../chart/math';
import { useStickyPriceRef } from '../chart/useStickyPriceRef';
import { formatPct, pctDirection } from '../chart/dailyChange';
import { pipsBetween } from '../positionSize';
import { chartPipSpec } from '../chart/pipSpec';
import { pipUnit } from '../chart/measureReadout';
import {
  candleTimeSec,
  provenanceLabel,
  tickStatusKind,
  normalizeProvenance,
} from '../chart/dataSource';
import {
  headerChangePct,
  livePriceForChart,
  livePriceForHeader,
  replayPrevClose,
  tickPlausibleForSeries,
  tickPredatesLastBar,
} from '../chart/liveSeries';
import { useDailyRefs } from '../chart/dailyRefStore';
import { useTickFreshnessClock } from '../hooks/useTickFreshnessClock';
import { isSeriesLoading, ProviderUnavailableNotice, seriesHasNoRealData } from './ProviderUnavailableNotice';
import { isForexMarketOpen } from '../chart/marketHours';

import { FRAME_CHART_H, FRAME_CHART_H_PHONE, FrameCellContext } from './FrameSizedGrid';
import type { PanSpeedPercent } from '../chart/panSpeed';
import { SymbolListPicker } from '../chart/SymbolListPicker';
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
  /** DESIGN-PRO §5.6 — يُمرَّر إلى `MatrixChart.onChartInteract`: مسك اللوح ⇒ true، الرفع ⇒ false. */
  onChartInteract?: (active: boolean) => void;
};

// مصفوفة ثابتة لا `[]` بالسطر: الجديدة بكل رسم (كل تيك) تُطلق تأثير `initialIndicators`
// بالشارت فيعيد رسمه مرّة ثانية ويمسح أي مؤشّر أضافه المتداول.
const NO_INDICATORS: never[] = [];

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
  onChartInteract,
}: Props) {
  const { t, rtl, lang } = useI18n();
  const [wheelOpen, setWheelOpen] = useState(false);
  // Clean cells (phone squares / four side-by-side rectangles): candles only + one short line on top.
  const cellMode = useContext(FrameCellContext);
  const bare = cellMode !== 'normal';

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
  // شريط الفريمات والكتابة فوق الشارت على الويب («15»/«4h» ثم Enter) يمرّان من هنا.
  // العودة للفريم الحاليّ قبل وصول المطلوب تُلغي الانتظار — كان الشريط يبقى على
  // الفريم المتروك والشارت باهتاً «قيد التبديل» حتى مهلة 8 ثوانٍ.
  // الطلبان يُدمجان لا يستبدل أحدهما الآخر: EURUSD ثم 1H قبل وصول الشموع كان يمحو الرمز المنتظَر ⇒ الرأس يعود
  // «XAUUSD · مغلق» بسعر الذهب حتى تصل؛ و1H ثم رمز كان يُرجع شريط الفريمات إلى 15m.
  const mergePending = (part: { tf?: Timeframe; symbol?: string }) =>
    setPendingSwitch((p) => {
      const n = { ...p, ...part };
      if (n.tf === series.timeframe) delete n.tf;
      if (n.symbol === series.symbol) delete n.symbol;
      return n.tf || n.symbol ? n : null;
    });
  const switchTimeframe = (next: Timeframe) => {
    mergePending({ tf: next });
    onTimeframeChange?.(next);
  };
  const navigate = panControls || interactive;
  const CYCLE_TFS: Timeframe[] = ['1m', '5m', '15m', '1H', '4H', 'D'];
  const cycleTimeframe = () => {
    const cur = (pendingSwitch?.tf ?? series.timeframe) as Timeframe;
    const i = CYCLE_TFS.indexOf(cur);
    switchTimeframe(CYCLE_TFS[(i + 1) % CYCLE_TFS.length]);
  };
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
  const passedTick: LiveTick | null =
    liveTick ??
    (livePrice != null
      ? { price: livePrice, source: { kind: 'unknown', as_of: null, channel: null } }
      : null);
  // بعد تبديل الرمز يصل تيك الرمز الجديد قبل شموعه: الرأس كان يطبع سعر الذهب بخانات اليورو
  // («2650.35000») موسوماً «حيّ» فوق شموع اليورو حتى وصول الجلب. تيك لا يمتّ للسلسلة بصلة يُترك
  // حتى تصل شموعه — إلا فوق شموع تجريبية (أساسها ثابت قديم)، فالسعر الحقيقي أنفع للمتداول.
  const resolvedTick: LiveTick | null =
    passedTick &&
    normalizeProvenance(series.data_source).kind !== 'demo' &&
    !tickPlausibleForSeries(series, passedTick.price)
      ? null
      : passedTick;
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
  // والنسبة تتبع السعر الحيّ المطبوع بجانبها (`livePriceForHeader`) لا الجلب الأخير وحده.
  // بالإعادة الرأس يقرأ شمعة الإعادة: كان يطبع سعر اليوم ونسبته و«حيّ» والسبريد فوق شموع الأسبوع
  // الماضي — الجواب مكشوف قبل أن يقرّر المتداول. النسبة تغيّر يوم شمعة الإعادة (`replayPrevClose`).
  const [chartTouch, setChartTouch] = useState(false);
  const [replay, setReplay] = useState<{ price: number; time: number | null } | null>(null);
  const replayPrice = replay?.price ?? null;
  const onReplayPrice = useCallback(
    (price: number | null, time?: number | null) => setReplay(price == null ? null : { price, time: time ?? null }),
    []
  );
  // خارج الإعادة: تغيّر اليوم من إغلاق الجلسة السابقة (`headerChangePct`) — الرقم نفسه بقائمة المتابعة.
  const dailyRefs = useDailyRefs([series.symbol]);
  // تيك أقدم من آخر شمعة جلبها التحديث (رمز غاب عن البثّ ~20ث) لا يُطبع — كالرباعي (`QuadChartModal`):
  // كان سعر ما قبل الجلب يبقى بالرأس والشارت تحته على الإغلاق الأحدث.
  const tickOlder = tickPredatesLastBar(series, resolvedTick?.source.as_of);
  const headTick = tickOlder ? null : resolvedTick;
  const headPx = livePriceForHeader(series, headTick);
  const livePct =
    replayPrice != null
      ? headerChangePct(series, replayPrice, replayPrevClose(series, replay?.time))
      : headerChangePct(series, headPx, dailyRefs[series.symbol.toUpperCase()]);
  // تيك يُطبع ولا تُحسب منه النسبة (حقيقي فوق شموع تجريبية، أو تجريبي فوق حقيقية): النسبة كانت من
  // `series.last` بجانب سعر آخر — «1.09000 +0.00%» وهي لـ1.08500. سعر بلا نسبة أصدق من نسبة لسعر غيره.
  const pctMismatch = replayPrice == null && headTick != null && headPx == null;
  const chgPct = !pctMismatch && Number.isFinite(livePct) ? livePct : null;
  // اللون من الرقم المطبوع (`pctDirection` = تقريب `formatPct`): `Math.round` يرفع النصف نحو +∞ فكان
  // ‎−0.005%‎ يُطبع «−0.01%» بالرمادي.
  const chgDir = pctDirection(chgPct);
  const chgColor = chgDir === 'up' ? colors.bull : chgDir === 'down' ? colors.bear : colors.textDim;
  const headerPrice = replayPrice ?? headTick?.price ?? series.last;
  // منازل الرأس بمرجع الشارت نفسه (`useStickyPriceRef`) — لا يقفز الرأس وحده عند عبور 10/100.
  const priceRef = useStickyPriceRef(series.symbol, series.last);
  const tickKind = replayPrice == null && headTick
    ? tickStatusKind(headTick.source, headTick.source.as_of, nowSec)
    : null;
  const tickTag =
    tickKind === 'live'
      ? t.dsTickLive
      : tickKind === 'demo'
        ? t.dsTickDemo
        : tickKind === 'lastPrice'
          ? t.dsLastPriceWord
          : null;
  // DXY وأمثاله (backend-r1): المزوّد لا يقدّمه أصلاً ⇒ «غير متاح» لا «تجريبي» التي توحي بعطل مؤقّت.
  // backend-r19: لا بيانات حقيقية أصلاً ⇒ لا شموع ولا سعر ولا نسبة ولا سبريد — الجملة مكان الشارت، والوسم
  // بالرأس «غير متاح» القصير (الطويلة كانت تقول «الرسم مولَّد للعرض» فوق شموع البذرة).
  const noRealData = seriesHasNoRealData(series.data_source);
  // tools81: قبل أوّل ردّ لا مصدر بعد — وسم «غير متاح» سيكون كاذباً، والإشعار يعرض «جارٍ التحميل».
  const seriesLoading = isSeriesLoading(series.data_source);
  const candleTag = noRealData
    ? t.dsKindUnavailable
    : provenanceLabel(candleSrc, {
        provider: t.dsKindProvider,
        demo: t.dsKindDemo,
        cache: t.dsKindCache,
        unknown: t.dsKindUnknown,
        unavailable: t.dsKindUnavailable,
      });
  // يُعاد فحصه كل 30ث: عند إغلاق الجمعة (أو كسر الذهب اليومي) تتوقّف التيكات فلا يُعاد الرسم،
  // وكان الوسم يبقى بلا «مغلق» حتى يلمس المتداول شيئاً.
  // موسوم برمزه: الحالة يحدّثها تأثير بعد الرسم ⇒ أوّل رسم بشموع EURUSD كان يقرأ «مغلق» الذهب (استراحة 17:00) إطاراً.
  const [closedState, setMarketClosed] = useState(() => ({
    sym: series.symbol,
    v: !isForexMarketOpen(series.symbol),
  }));
  const marketClosed =
    closedState.sym === series.symbol ? closedState.v : !isForexMarketOpen(series.symbol);
  useEffect(() => {
    const check = () => setMarketClosed({ sym: series.symbol, v: !isForexMarketOpen(series.symbol) });
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [series.symbol]);

  // السبريد مربوط بالرمز الذي جُلب له: كان `quote` يبقى على قيم الرمز السابق حتى
  // يصل جلب الرمز الجديد، فيقرأ المتداول سبريد زوج بجانب سعر زوج آخر.
  const [quote, setQuote] = useState<{
    forSymbol: string;
    bid?: number | null;
    ask?: number | null;
    price?: number | null;
  } | null>(null);
  useEffect(() => {
    let alive = true;
    const forSymbol = series.symbol;
    api
      .marketQuote(forSymbol)
      .then((q) => {
        if (alive) setQuote({ forSymbol, bid: q?.bid ?? null, ask: q?.ask ?? null, price: q?.price ?? null });
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
    replayPrice == null &&
    liveQuote?.bid != null && liveQuote?.ask != null && liveQuote.ask > liveQuote.bid;
  // السبريد كان سعرَين خامَين يطرحهما المتداول بذهنه — وهو يقرؤه بالـpip (كلفة دخوله الفعلية).
  // حجم الـpip من `instrumentSpec` (الين 0.01، الذهب 0.1…) و`pipsBetween` نفسها التي تبني
  // عليها الحاسبة وأداة القياس؛ أداة بلا مواصفة pip (مؤشر، رمز بلاحقة وسيط) تبقى بالسعرين وحدهما.
  const spreadSpec = hasSpread ? chartPipSpec(series.symbol) : null;
  const spreadPips =
    spreadSpec && hasSpread ? pipsBetween(spreadSpec, liveQuote!.bid!, liveQuote!.ask!) : null;
  // العرض/الطلب يُجلبان مع تغيّر `series.last` وحده (كل جلب ~90ث) والسعر بجانبهما تيك كل ثانية: بخبر
  // قويّ كان الرأس «1.08760 · B 1.08540 · A 1.08550» — عرض وطلب بعيدان 21 pip عن السعر المطبوع. حين
  // يخرج السعر الحيّ عن [bid − 3×spread، ask + 3×spread] يُخفى السعران ويبقى السبريد بالـpip وحده.
  const quoteStale =
    hasSpread &&
    headTick != null &&
    (() => {
      const sp = liveQuote!.ask! - liveQuote!.bid!;
      return (
        headerPrice != null &&
        (headerPrice < liveQuote!.bid! - 3 * sp || headerPrice > liveQuote!.ask! + 3 * sp)
      );
    })();

  // خطّ Ask بالشارت: بُعد الطلب عن سعر الاقتباس نفسه (لا عن التيك) فيصحّ أكانت الشموع عرضاً أم وسطاً. دفترٌ
  // خرج السعر عنه (`quoteStale`) لا يُرسم — سبريد الخبر غير سبريد ما قبله.
  const askOffset =
    hasSpread && !quoteStale && liveQuote!.price != null && liveQuote!.price > 0
      ? liveQuote!.ask! - liveQuote!.price
      : null;

  const subtitle = useMemo(() => {
    if (interactive) return t.cfSubtitleInteractive;
    if (navigate) return t.cfSubtitleNavigate;
    return t.cfSubtitleDefault;
  }, [interactive, navigate, t]);

  const onChartPadLayout = (e: LayoutChangeEvent) => {
    if (!fill) return;
    const h = e.nativeEvent.layout.height;
    const next = Math.max(120, Math.floor(h) - spacing.sm);
    setMeasuredH((prev) => (Math.abs(prev - next) > 2 ? next : prev));
  };

  const isWeb = Platform.OS === 'web';
  // DESIGN-PRO §5.6 — مسك شارت الإطار يُخفت شريط فريماته وزرّ ⛶ إلى 40% كشريط الشارت نفسه؛ الرمز والسعر يبقيان.
  // كان المضيف يُخفت شريطه العلويّ والجانبيّ فقط ⇒ فريمات الإطار الملموس تبقى أعلى صوتاً من الشموع تحت الإصبع.
  const handleChartInteract = (active: boolean) => {
    setChartTouch(active);
    onChartInteract?.(active);
  };
  const frameSymbol = (pendingSwitch?.symbol || label || series.symbol).toUpperCase();
  // أثناء التبديل الرأس يقول الفريم المختار (كشريط الفريمات)، ووسما المصدر و«مغلق» للرمز السابق يُخفيان —
  // كان «EURUSD · مغلق» يُقرأ حتى تصل شموع اليورو لأن الذهب باستراحته، ووسم المصدر للذهب بجانب اسم اليورو.
  const headerTf = pendingSwitch?.tf ?? series.timeframe;
  const symbolSwitching = !!pendingSwitch?.symbol && pendingSwitch.symbol.toUpperCase() !== series.symbol.toUpperCase();
  // القائد لا يُفعَّل (هو المفعَّل) — إجراء بلا أثر يُربك القارئ. شارته («قائد») نصّ مقروء بجانب الرمز.
  const syncA11yActions =
    !isWeb && onSyncActivate && syncBadge !== 'leader'
      ? [{ name: 'syncActivate', label: `${t.cfSyncActivateA11yPrefix}${frameSymbol}` }]
      : undefined;
  const focusButton = onFocus ? (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.focusBtn,
        chartTouch && styles.chromeDim,
        pressed && {
          opacity: buttons.pressedOpacity,
          transform: [{ scale: buttons.pressedScale }],
        },
      ]}
      onPress={onFocus}
      // أربعة إطارات بزرّ ⛶ لكلّ منها — بلا الرمز كان قارئ الشاشة يقرأ أربعة أزرار متطابقة
      accessibilityLabel={`${frameSymbol} — ${t.termOpenFullscreenA11y}`}
      hitSlop={8}
    >
      <Text style={styles.focusBtnText}>⛶</Text>
    </Pressable>
  ) : null;

  return (
    <Pressable
      // iOS/Android: عنصر `accessible` يخفي كل ما بداخله عن VoiceOver — والتزامن يمرّر `onSyncActivate` لكل
      // الإطارات (القائد أيضاً) ⇒ كان كل إطار زرّاً واحداً «تفعيل مزامنة…» لا يُبلغ منه شريط الفريمات ولا الرمز
      // ولا السعر ولا ملء الشاشة. الإطار لا يُجمَّع على الجوال؛ التفعيل إجراء مخصّص على زرّ الرمز (`syncA11yActions`).
      // الويب: الحاوية لا تخفي أبناءها ⇒ يبقى زرّاً للوحة المفاتيح كما كان.
      accessible={isWeb && !!onSyncActivate}
      accessibilityRole={isWeb && onSyncActivate ? 'button' : undefined}
      style={[styles.wrap, size === 'hero' && styles.heroWrap, fill && styles.wrapFill, bare && styles.wrapBare]}
      onPress={onSyncActivate}
      disabled={!onSyncActivate}
      accessibilityState={
        isWeb ? { disabled: !onSyncActivate, selected: !!onSyncActivate && syncBadge === 'leader' } : undefined
      }
      accessibilityLabel={
        isWeb && onSyncActivate
          ? `${t.cfSyncActivateA11yPrefix}${frameSymbol}${badge ? ` · ${badge}` : ''}`
          : undefined
      }
    >
      {bare ? (
        <View style={[styles.bareHead, cellMode === 'column' && styles.bareHeadColumn]}>
          <View style={styles.bareLine}>
            <Pressable
              accessibilityRole={onSymbolChange ? 'button' : 'text'}
              onPress={() => {
                if (onSymbolChange) setWheelOpen((v) => !v);
              }}
              accessibilityLabel={onSymbolChange ? `${frameSymbol} — ${t.cfChangeSymbolA11y}` : frameSymbol}
              hitSlop={{ top: 10, bottom: 6, left: 6, right: 6 }}
              style={styles.bareSymHit}
            >
              <Text style={[styles.bareSym, cellMode === 'column' && styles.bareSymColumn]} numberOfLines={1}>
                {frameSymbol}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={cycleTimeframe}
              disabled={!onTimeframeChange}
              hitSlop={{ top: 10, bottom: 6, left: 6, right: 6 }}
              accessibilityLabel={isTimeframe(headerTf) ? t.tfLabelsA11y[headerTf] : headerTf}
            >
              <Text style={styles.bareTf}>{headerTf}</Text>
            </Pressable>
          </View>
          <View style={styles.bareLine}>
            {headerPrice != null && !symbolSwitching && !noRealData ? (
              <Text style={[styles.barePrice, cellMode === 'column' && styles.barePriceColumn]} numberOfLines={1}>
                {formatPrice(headerPrice, series.symbol, priceRef)}
                {chgPct != null && cellMode === 'square' ? (
                  <Text style={{ color: chgColor }}>{` ${formatPct(chgPct)}`}</Text>
                ) : null}
              </Text>
            ) : (
              <Text style={styles.barePrice}>—</Text>
            )}
            {onFocus ? (
              <Pressable
                accessibilityRole="button"
                onPress={onFocus}
                hitSlop={8}
                accessibilityLabel={`${frameSymbol} — ${t.termOpenFullscreenA11y}`}
              >
                <Text style={styles.bareFocus}>⛶</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {!bare && showTimeframes && onTimeframeChange ? (
        <View style={[styles.tfTopLeft, chartTouch && styles.chromeDim]}>
          <TimeframeBar
            value={pendingSwitch?.tf ?? series.timeframe}
            onChange={switchTimeframe}
            compact={size === 'small' || fill}
          />
        </View>
      ) : null}

      {/* الهاتف: إطار الشبكة 2×2 بعرض ~155pt ومحتوى ~135pt، وسطرا الرأس معاً (الرمز+المصدر ~125، السعر+حي+السبريد
          +النسبة+⛶ ~210) كانا يُحشران بسطر واحد ⇒ `titleRow` ينكمش إلى الصفر فيختفي اسم الزوج، والنسبة وزرّ ملء
          الشاشة يُقصّان خارج الإطار. على الهاتف يلتفّ الرأس (السعر تحت الرمز) ويلتفّ سطر السعر نفسه إن ضاق —
          لا شيء يُقصّ. بوضع المستطيلات (عرض الشاشة) يتّسع السطر فلا التفاف، كما كان. */}
      {!bare ? (
      <View style={[styles.header, phone && styles.headerPhone]}>
        <View style={styles.titleRow}>
          {/* DESIGN-PRO §1 — نقطة زخرفية محايدة: كانت `accent` بكل إطار ⇒ أربع نقاط تأكيد بالشبكة وقت السكون. */}
          <View style={styles.dot} />
          <Pressable
            accessibilityRole={onSymbolChange ? 'button' : 'text'}
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
            // الوسم يحلّ محلّ النصّ: «تغيير الرمز» وحده كان يُقرأ بكل إطارات الشبكة الأربعة — الزوج لا يُعرف.
            accessibilityLabel={onSymbolChange ? `${frameSymbol} — ${t.cfChangeSymbolA11y}` : undefined}
            accessibilityState={onSymbolChange ? { expanded: wheelOpen } : undefined}
            accessibilityActions={syncA11yActions}
            onAccessibilityAction={(e) => {
              if (e.nativeEvent.actionName === 'syncActivate') onSyncActivate?.();
            }}
            // رأس الإطار ضيّق فلا يُكبَّر الزرّ نفسه: المنطقة تمتدّ عمودياً إلى ~42pt (كانت ~32pt)؛ أسفلها 10 فقط كي لا تأكل أعلى الشارت.
            hitSlop={{ top: 14, bottom: 10, left: 8, right: 8 }}
          >
            <Text
              style={styles.symbol}
              numberOfLines={1}
              {...(Platform.OS === 'web'
                ? ({ translate: 'no', className: 'notranslate' } as object)
                : {})}
            >
              {frameSymbol}
            </Text>
            {onSymbolChange ? <Text style={styles.symbolCaret}>▾</Text> : null}
          </Pressable>
          {/* الهاتف: شريط الفريمات المضغوط (8 أزرار ≈ 272pt) يتمرّر داخل إطار ~139pt ⇒ 4H/D/W خارج النظر، فإطار
              على 4H لا يقول فريمه أبداً. الفريم بجانب الزوج على الهاتف دائماً (مكان «مزوّد» المُخفاة). */}
          {!showTimeframes || phone ? (
            <Text
              style={styles.tf}
              accessibilityLabel={isTimeframe(headerTf) ? t.tfLabelsA11y[headerTf] : undefined}
              {...(Platform.OS === 'web'
                ? ({ translate: 'no', className: 'notranslate' } as object)
                : {})}
            >
              {isTimeframe(headerTf) ? t.tfLabels[headerTf] : headerTf}
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
          {/* «مزوّد» هي الحالة العادية ولا تضيف للهاتف إلا عرضاً (سطر السعر يقول «حي» أصلاً)؛ تجريبي/مخزّن/مجهول
              تبقى ظاهرة — هي ما يجب ألّا يفوت المتداول. */}
          {seriesLoading || symbolSwitching || (phone && candleSrc.kind === 'provider') ? null : (
            <Text
              style={[
                styles.sourceTag,
                candleSrc.kind === 'demo' && styles.sourceTagDemo,
                candleSrc.kind === 'unknown' && styles.sourceTagUnknown,
              ]}
              accessibilityLabel={candleTag}
            >
              {candleTag}
            </Text>
          )}
          {marketClosed && !symbolSwitching ? (
            <Text style={styles.marketClosedTag} accessibilityLabel={t.cfMarketClosedA11y}>
              {t.cfMarketClosedTag}
            </Text>
          ) : null}
        </View>
        {/* `headerPrice` null = `last: null` بلا تيك (backend-r19) — لا «null» ولا سقوط `toFixed`. زرّ ملء الشاشة
            يبقى: منذ launch121 كل طلب فاشل (بلا شبكة/خادم) إطار بلا شموع، فكان يختفي معه المدخل الوحيد للشارت الكامل. */}
        {noRealData || headerPrice == null ? (
          focusButton ? <View style={styles.priceRow}>{focusButton}</View> : null
        ) : (
          <View style={[styles.priceRow, phone && styles.priceRowPhone, switching && styles.stale]}>
            {/* تبديل الرمز: الرأس يسمّي الرمز الجديد (`frameSymbol`) والسعر ما زال للسابق حتى تصل سلسلته ⇒
                «EURUSD 3,652.40» بسعر الذهب ونسبته وسبريده، يقرؤه قارئ الشاشة كما هو. «—» يحفظ ارتفاع السطر. */}
            {symbolSwitching ? (
              <Text style={[styles.price, phone && styles.pricePhone]} accessibilityLabel={t.cfPriceLoadingA11y.replace('{symbol}', frameSymbol)}>
                —
              </Text>
            ) : (
              <>
                <Text
                  style={[styles.price, phone && styles.pricePhone]}
                  accessibilityLabel={
                    replayPrice != null
                      ? `${formatPrice(headerPrice, series.symbol, priceRef)} — ${t.cfReplayPriceA11y}`
                      : undefined
                  }
                >
                  {formatPrice(headerPrice, series.symbol, priceRef)}
                </Text>
                {replayPrice != null ? (
                  <Text style={[styles.liveTag, styles.liveTagMuted]} accessibilityLabel={t.mcReplayModeA11y}>
                    ⏪
                  </Text>
                ) : null}
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
                {/* الهاتف: إطار بعرض 48% (~135pt) ورأس بسطر واحد لا يلتفّ — «B 1.08540 · A 1.08550 · 0.9 pips»
                    (~165pt) كان أعرض من الإطار كلّه فيقصّ النسبة وزرّ ملء الشاشة ويُسحق اسم الزوج. السبريد بالـpip وحده. */}
                {hasSpread && !((quoteStale || phone) && spreadPips == null) ? (
                  <Text
                    style={styles.spreadTag}
                    // launch111: وسم ثابت كان يحلّ محلّ النصّ ⇒ VoiceOver «سبريد البيع والشراء» بلا رقم. يُقرأ ما يظهر فقط.
                    accessibilityLabel={[
                      quoteStale || phone
                        ? null
                        : t.cfSpreadBidAskA11y
                            .replace('{bid}', formatPrice(liveQuote!.bid!, series.symbol, priceRef))
                            .replace('{ask}', formatPrice(liveQuote!.ask!, series.symbol, priceRef)),
                      spreadPips != null ? t.cfSpreadPipsA11y.replace('{pips}', spreadPips.toFixed(1)) : null,
                    ]
                      .filter(Boolean)
                      .join(rtl ? '، ' : ', ')}
                  >
                    {quoteStale || phone
                      ? ''
                      : `${t.quoteBidShort} ${formatPrice(liveQuote!.bid!, series.symbol, priceRef)} · ${t.quoteAskShort} ${formatPrice(liveQuote!.ask!, series.symbol, priceRef)}`}
                    {spreadPips != null ? (
                      <Text style={styles.spreadPips}>{`${quoteStale || phone ? '' : ' · '}${spreadPips.toFixed(1)} ${pipUnit(lang)}`}</Text>
                    ) : null}
                  </Text>
                ) : null}
                <Text
                  style={[styles.chg, { color: chgColor }]}
                  // منذ 8aeaf13 يصل VoiceOver لهذا النصّ منفرداً: «+0.12%» بلا سياق و«—» علامة ترقيم (launch109).
                  accessibilityLabel={
                    chgPct == null ? t.cfDayChangeNoneA11y : t.cfDayChangeA11y.replace('{pct}', formatPct(chgPct))
                  }
                >
                  {chgPct == null ? '—' : formatPct(chgPct)}
                </Text>
              </>
            )}
            {focusButton}
          </View>
        )}
      </View>

      ) : null}

      {wheelOpen && onSymbolChange ? (
        <View style={styles.wheelLayer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.closeWord}
            style={StyleSheet.absoluteFill}
            onPress={() => setWheelOpen(false)}
          />
          <SymbolListPicker
            value={series.symbol}
            onChange={(next) => {
              mergePending({ symbol: next });
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
        {noRealData ? (
          <ProviderUnavailableNotice
            symbol={series.symbol}
            timeframe={series.timeframe}
            height={fill ? undefined : chartH}
            showSwitchHint={!!onSymbolChange}
            dataSource={series.data_source}
          />
        ) : (
          <View style={fill ? styles.fillAbs : undefined}>
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
              slimAxes={cellMode === 'square' || cellMode === 'column'}
              tinyAxes={cellMode === 'column'}
              panSpeed={panSpeed}
              initialLens="clean"
              initialIndicators={NO_INDICATORS}
              syncWindow={syncWindow}
              onSyncWindow={onSyncWindow}
              syncFollow={syncFollow}
              onAxisActivate={onSyncActivate}
              syncTimeOnly
              onReplayPrice={onReplayPrice}
              onChartInteract={handleChartInteract}
              askOffset={askOffset}
              onTimeframeKey={showTimeframes && onTimeframeChange ? switchTimeframe : undefined}
            />
          </View>
        )}
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
  headerPhone: {
    paddingHorizontal: spacing.sm,
    flexWrap: 'wrap',
    rowGap: 4,
    columnGap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    minWidth: 0,
  },
  symbolHit: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  // بيانات الفريم/الرمز السابق أثناء انتظار الجديد: باهتة لا مخفيّة — الإطار لا يقفز،
  // والمتداول يرى أنها ليست أرقام ما ضغط عليه بعد.
  stale: { opacity: 0.38 },
  chromeDim: { opacity: 0.4 },
  // DESIGN-PRO §1/§2 — وسوم الرأس 11px ولا تأكيد على شارة: «جارٍ التبديل» حالة عابرة تخفت (والبيانات نفسها باهتة `stale`).
  switchTag: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
    paddingHorizontal: 4,
    paddingVertical: 0,
    borderRadius: radii.sm,
    backgroundColor: colors.selectedFill,
    flexShrink: 0,
  },
  symbolCaret: { color: colors.textDim, fontSize: 11, fontWeight: '500' },
  // W6: المنتقي ملاصق لزرّ الرمز تحت الرأس، لا وسط اللوح — والشارت بلا تعتيم (يبقى أعلى العناصر صوتاً).
  wheelLayer: {
    ...StyleSheet.absoluteFill, // RN 0.86 أزال absoluteFillObject وقت التشغيل (كان يُنشر undefined فتفقد الطبقة position:absolute)
    zIndex: 50,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingTop: 36,
    paddingHorizontal: 8,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.textDim },
  symbol: {
    color: colors.text,
    fontWeight: '500',
    fontSize: 13,
    letterSpacing: 0.4,
    flexShrink: 1,
  },
  tf: { color: colors.textDim, fontSize: 11, marginLeft: spacing.xs },
  wrapBare: { minWidth: 0, borderRadius: radii.sm, width: '100%', alignSelf: 'stretch' },
  // full-height frames: the chart sits on top of the measured area, so its own height can never push the box
  // taller (on iPhone that cut off the bottom time labels and the top candles)
  fillAbs: { position: 'absolute', top: 0, left: spacing.sm, right: spacing.sm, bottom: spacing.sm },
  bareHead: {
    paddingHorizontal: 6,
    paddingTop: 4,
    paddingBottom: 2,
    gap: 1,
  },
  bareHeadColumn: { paddingHorizontal: 4 },
  bareLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  bareSymHit: { flexShrink: 1, minWidth: 0 },
  bareSym: { color: colors.text, fontWeight: '700', fontSize: 12, letterSpacing: 0.2 },
  bareSymColumn: { fontSize: 11 },
  bareTf: { color: colors.accent, fontSize: 11, fontWeight: '700' },
  barePrice: { ...numeric, color: colors.textMuted, fontSize: 11, fontWeight: '600', flexShrink: 1 },
  barePriceColumn: { fontSize: 10 },
  bareFocus: { color: colors.textDim, fontSize: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 0 },
  priceRowPhone: { flexWrap: 'wrap', flexShrink: 1, columnGap: 4, rowGap: 4 },
  // DESIGN-PRO §2: سعر رأس الشارت 15px. الهاتف يبقى 13 — الإطار بعرض 48% (~135pt) وسطر السعر فيه السبريد والنسبة وزرّ
  // ملء الشاشة؛ 15 هناك يدفع النسبة لسطر ثانٍ فيقصر اللوح.
  price: { ...numeric, color: colors.text, fontWeight: '600', fontSize: 15 },
  pricePhone: { fontSize: 13 },
  // DESIGN-PRO §1/§5.3: الأخضر للاتجاه وحده، و«مباشر» حالة طبيعية تخفت؛ ما تدهور (سعر أخير/تجريبي) أعلى صوتاً.
  liveTag: { color: colors.textDim, fontSize: 11, fontWeight: '500' },
  liveTagMuted: { color: colors.textMuted, fontWeight: '500' },
  spreadTag: { ...numeric, color: colors.textDim, fontSize: 11, fontWeight: '600' },
  /** السبريد بالـpip هو الرقم الذي يُقرأ؛ أبرز قليلاً من السعرين بجانبه. */
  spreadPips: { ...numeric, color: colors.text, fontWeight: '600' },
  // مصدر البيانات الطبيعي (مزوّد) يخفت؛ تجريبي `warn` ومجهول `textMuted` فقط (§5.3). كان تأكيداً على شارة.
  sourceTag: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '500',
    marginInlineStart: 4,
    opacity: 0.9,
  },
  sourceTagDemo: { color: colors.warn },
  sourceTagUnknown: { color: colors.textMuted },
  marketClosedTag: {
    color: colors.warn,
    fontSize: 11,
    fontWeight: '500',
    marginInlineStart: 4,
    opacity: 0.9,
  },
  chg: { ...numeric, fontSize: 12, fontWeight: '600' },
  focusBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // §5.5 فاصل واحد (حدّ، بلا خلفية)؛ §1 أيقونة ثانوية لا تأكيد — كانت تأكيداً بكل إطار من أربعة بالشبكة.
  focusBtnText: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  hint: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'right',
    paddingHorizontal: spacing.sm,
    marginBottom: 4,
  },
  hintLtr: { textAlign: 'left' },
  syncBadge: {
    marginLeft: 8,
    paddingHorizontal: 4,
    paddingVertical: 0,
    borderRadius: 4,
    overflow: 'hidden',
    // §1/§5.5 — شارة محايدة بفاصل واحد (خلفية): كانت تأكيداً بحدّ وخلفية، والقائد أخضر (الأخضر للاتجاه وحده).
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
    backgroundColor: colors.selectedFill,
  },
  syncBadgeLeader: { color: colors.text },
  syncBadgePartial: {
    color: colors.warn,
    backgroundColor: colors.warnSoft,
  },
  chartPad: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    minHeight: 0,
  },
});
