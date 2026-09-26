import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, spacing, buttons, numeric } from '../theme';
import { api, type ChartSeries } from '../api';
import { MatrixChart } from '../chart/MatrixChart';
import { TimeframeBar } from './TimeframeBar';
import { type Timeframe } from '../timeframes';
import { WATCHLIST } from '../chart/watchlist';
import { loadWatchlistItems } from '../chart/watchlistStore';
import { formatPrice } from '../chart/math';
import { notify } from '../chart/confirmDestructive';
import { COMPARE_COLOR } from '../chart/compare';
import { headerChangePct, livePriceForChart, livePriceForHeader } from '../chart/liveSeries';
import { useDailyRefs } from '../chart/dailyRefStore';
import { formatPct, pctDirection } from '../chart/dailyChange';
import { provenanceLabel, tickStatusLabel, normalizeProvenance } from '../chart/dataSource';
import {
  armedText,
  createChartAlert,
  seriesRefPrice,
  type ChartAlertOrigin,
} from '../chart/alertFromChart';
import { marketStatusLabel } from '../chart/marketHours';
import { useTickFreshnessClock } from '../hooks/useTickFreshnessClock';
import {
  ProviderUnavailableNotice,
  serverUnreachableSeries,
  seriesHasNoRealData,
} from './ProviderUnavailableNotice';
import { SymbolSearchBar } from './SymbolSearchBar';
import { AlertsPanel } from './AlertsPanel';
import { NewsRiskBanner } from './NewsRiskBanner';
import { SymbolSnapshot } from './SymbolSnapshot';
import { BacktestPanel } from './BacktestPanel';
import { IndicatorAlertsPanel } from './IndicatorAlertsPanel';
import { useLiveTicks } from '../hooks/useLiveTicks';
import { cachedChartSeries, rememberChartSeries } from '../hooks/chartSeriesCache';
import { useI18n } from '../i18n/I18nContext';
import { playSoftClick } from '../audio/playSoftClick';
import type { ChartKind, DrawTool, IndicatorId, LensMode } from '../chart/types';

const NO_SYMBOLS: string[] = [];

type Props = {
  visible: boolean;
  symbol: string;
  timeframe: Timeframe;
  onClose: () => void;
  onSymbolChange?: (symbol: string) => void;
  initialTool?: DrawTool;
  initialLens?: LensMode;
  initialKind?: ChartKind;
  initialIndicators?: IndicatorId[];
};

export function FocusChartModal({
  visible,
  symbol,
  timeframe: initialTf,
  onClose,
  onSymbolChange,
  initialTool,
  initialLens,
  initialKind,
  initialIndicators,
}: Props) {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const { width, height } = useWindowDimensions();
  const phone = width < 700;
  const [sym, setSym] = useState(symbol);
  const [compareSym, setCompareSym] = useState<string | null>(null);
  const [tf, setTf] = useState<Timeframe>(initialTf);
  const [series, setSeries] = useState<ChartSeries | null>(null);
  /** الرمز الذي طُلبت له `series` — الخادم قد يعيد اسماً مطبَّعاً، فلا يُقارن بـ`series.symbol`. */
  const [seriesSym, setSeriesSym] = useState<string | null>(null);
  const [compareSeries, setCompareSeries] = useState<ChartSeries | null>(null);
  /** تعذّر تحميل رمز المقارنة (أو جاء تجريبياً فوق شارت حقيقي): لا خط بنفسجي مختلَق — ملاحظة صريحة. */
  const [compareFailed, setCompareFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phonePickerOpen, setPhonePickerOpen] = useState(false);
  const [watchlist, setWatchlist] = useState<{ symbol: string; label: string; group?: string }[]>([
    ...WATCHLIST,
  ]);
  const liveTick = useLiveTicks(sym, visible);
  const dailyRefs = useDailyRefs(visible ? [sym] : NO_SYMBOLS);
  const nowMs = useTickFreshnessClock(liveTick?.source.as_of ?? null);
  const nowSec = nowMs / 1000;

  useEffect(() => {
    if (visible) void loadWatchlistItems().then(setWatchlist);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    setSym(symbol);
    setTf(initialTf);
    setCompareSym(null);
    setPhonePickerOpen(false);
  }, [visible, symbol, initialTf]);

  // chart-r66b: خطّ المقارنة ومفتاحه كانا يبقيان بشموع الفريم القديم طوال الطلب الجديد (15m→1H: إغلاق
  // ربع ساعة بوسم ساعة). عند تغيّر الفريم أو رمز المقارنة يُمسح فوراً؛ تبديل الرمز الرئيسي وحده لا يمسّه.
  const compareKeyRef = useRef('');
  useEffect(() => {
    if (!visible) return;
    const compareKey = `${compareSym ?? ''}|${tf}`;
    if (compareKeyRef.current !== compareKey) {
      compareKeyRef.current = compareKey;
      setCompareSeries(null);
      setCompareFailed(false);
    }
    let alive = true;
    // chart-r74c: شموع (الرمز، الفريم) نفسه من ذاكرة الجلسة (التركيز/الرباعي، 5 دقائق على الأكثر) تُعرض فوراً
    // والجلب يستبدلها — 15m→1H→15m كان ينتظر الشبكة مرّتين خلف مؤشّر دوّار. بلا ذاكرة ⇒ مؤشّر التحميل كما كان.
    const cached = cachedChartSeries(sym, tf);
    if (cached) {
      setSeries(cached);
      setSeriesSym(sym);
    }
    (async () => {
      setLoading(!cached);
      try {
        const s = rememberChartSeries(sym, tf, await api.chart(sym, tf));
        if (alive) {
          setSeries(s);
          setSeriesSym(sym);
        }
        if (compareSym && alive) {
          // كان الفشل يرسم `mockSeries` كخط مقارنة بنفسجي فوق الشارت الحقيقي — علاقة/تباعد مختلَق بين
          // زوجين يُبنى عليه قرار. الآن: لا خط + ملاحظة. وسلسلة demo من الخادم فوق شارت حقيقي = نفس الشيء.
          try {
            const c = await api.chart(compareSym, tf);
            const fake =
              normalizeProvenance(c.data_source).kind === 'demo' &&
              normalizeProvenance(s.data_source).kind !== 'demo';
            if (alive) {
              setCompareSeries(fake ? null : c);
              setCompareFailed(fake);
            }
          } catch {
            if (alive) {
              setCompareSeries(null);
              setCompareFailed(true);
            }
          }
        } else if (alive) {
          setCompareSeries(null);
          setCompareFailed(false);
        }
      } catch {
        if (alive && cached) {
          // فشل التحديث وبالذاكرة شموع حقيقية حديثة (معروضة للتوّ) ⇒ تبقى هي لا إشعار «لا اتصال».
          setCompareSeries(null);
          setCompareFailed(compareSym != null);
        } else if (alive) {
          // launch122: كان الفشل يرسم `mockSeries` حول أسعار 2024 (EURUSD 1.0854). الآن سلسلة فارغة ⇒ إشعار «لا اتصال».
          setSeries(serverUnreachableSeries(sym, tf));
          setSeriesSym(sym);
          // لا تُبقِ خط مقارنة الرمز السابق فوق الإشعار
          setCompareSeries(null);
          setCompareFailed(compareSym != null);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [visible, sym, tf, compareSym]);

  // الجلب أعلاه مرّة لكل فتح/تبديل: على 15m بعد ربع ساعة يقع التيك خارج آخر شمعة فيقف الشارت
  // والرأس يطبع السعر الحيّ. تحديث صامت كل 90 ث كالرباعي والطرفية: شموع حقيقية جديدة تستبدل
  // القديمة بلا «جاري التحميل»، وفشل الجلب أو رجوع بيانات تجريبية يُبقي المعروض.
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    const id = setInterval(() => {
      api
        .chart(sym, tf)
        .then((s) => {
          if (!alive || normalizeProvenance(s.data_source).kind === 'demo') return;
          rememberChartSeries(sym, tf, s);
          setSeries(s);
          setSeriesSym(sym);
        })
        .catch(() => {});
      if (compareSym) {
        api
          .chart(compareSym, tf)
          .then((c) => {
            if (!alive || normalizeProvenance(c.data_source).kind === 'demo') return;
            setCompareSeries(c);
            setCompareFailed(false);
          })
          .catch(() => {});
      }
    }, 90_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [visible, sym, tf, compareSym]);

  // chart-r66b: العرض مربوط برمز العرض — XAUUSD → EURUSD كان يطبع «B 2650.30000» حتى يعود الطلب الجديد
  const [quoteState, setQuote] = useState<{
    forSymbol: string;
    bid?: number | null;
    ask?: number | null;
  } | null>(null);
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    api
      .marketQuote(sym)
      .then((q) => {
        if (alive) setQuote({ forSymbol: sym, bid: q.bid, ask: q.ask });
      })
      .catch(() => {
        if (alive) setQuote(null);
      });
    return () => {
      alive = false;
    };
  }, [visible, sym, series?.last]);
  const quote = quoteState?.forSymbol === sym ? quoteState : null;
  const hasSpread = quote?.bid != null && quote?.ask != null && quote.ask > quote.bid;

  const pick = (next: string) => {
    setSym(next);
    onSymbolChange?.(next);
  };

  const toggleCompare = (next: string) => {
    if (next === sym) return;
    setCompareSym((prev) => (prev === next ? null : next));
  };

  /** تأكيد «مُفعَّل» مرئي بعد إنشاء تنبيه من الشارت (خط رسم أو 🔔 الـcrosshair) — كان النقر يُصدر صوتاً
   * فقط، ولوحة التنبيهات تحت الشارت لا تُحدَّث إلا بعد دقيقة. الآن سطر تأكيد 4 ثوانٍ + تحديث فوري للقائمة. */
  const [armedMsg, setArmedMsg] = useState<string | null>(null);
  const armedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [alertsRefreshKey, setAlertsRefreshKey] = useState(0);
  useEffect(
    () => () => {
      if (armedTimerRef.current) clearTimeout(armedTimerRef.current);
    },
    []
  );
  useEffect(() => {
    if (!visible) setArmedMsg(null);
  }, [visible]);

  const alertFromDrawing = async (price: number, origin?: ChartAlertOrigin) => {
    try {
      // السعر المرجعي للاتجاه من الرمز الحالي فقط: الشموع المحمّلة قد تكون للرمز السابق لحظة التبديل
      // (والشموع التجريبية ليست سعراً حقيقياً)، والسعر غير الصالح يُرفض قبل الطلب — راجع
      // chart/alertFromChart.ts (المنطق نفسه يخدم شارت الشاشة الرئيسية أيضاً).
      const res = await createChartAlert({
        symbol: sym,
        price,
        refPrice: liveTick?.price ?? seriesRefPrice(series, sym),
        note: origin === 'crosshair' ? t.focusAlertFromChartNote : t.focusAlertFromDrawingNote,
      });
      playSoftClick();
      setArmedMsg(`${t.alertsArmedPrefix}: ${armedText(sym, res.condition, formatPrice(price, sym))}`);
      if (armedTimerRef.current) clearTimeout(armedTimerRef.current);
      armedTimerRef.current = setTimeout(() => setArmedMsg(null), 4000);
      setAlertsRefreshKey((k) => k + 1);
    } catch {
      notify(t.focusAlertCreateFailedTitle, t.focusAlertCreateFailedBody);
    }
  };

  /**
   * رأس النافذة بقواعد رؤوس الإطارات والرباعي نفسها:
   * - `series` يبقى سلسلة الرمز السابق طوال تحميل الجديد، فكان الرأس يطبع تيك الرمز الجديد فوق شموع
   *   القديم (أو إغلاق القديم تحت اسم الجديد) ⇒ لا رأس حتى تصل سلسلة الرمز المعروض.
   * - النسبة كانت `series.change_pct` (أول شمعة محمّلة ← آخرها): الزوج نفسه +0.1% على 15د و−1.8% على
   *   4س. الآن `headerChangePct` (من إغلاق اليوم السابق) كباقي الرؤوس، والسعر `livePriceForHeader`
   *   (تيك مقبول للسلسلة لا خام).
   * - اللون من الرقم المطبوع: «+0.00%» كانت خضراء ⇒ صفرها مكتوم.
   */
  const headSeries = series && seriesSym === sym ? series : null;
  // backend-r19: رمز بلا بيانات حقيقية أصلاً (DXY) ⇒ لا سعر ولا نسبة بالرأس ولا شموع بذرة مكان الشارت.
  const noReal = headSeries != null && seriesHasNoRealData(headSeries.data_source);
  const headPx = headSeries ? livePriceForHeader(headSeries, liveTick) : null;
  // `last: null` (backend-r19) بلا تيك ⇒ لا سعر يُطبع.
  const headPrice = headPx ?? headSeries?.last ?? null;
  const headPctRaw = headSeries ? headerChangePct(headSeries, headPx, dailyRefs[sym.toUpperCase()]) : NaN;
  const headPct = Number.isFinite(headPctRaw) ? headPctRaw : null;
  const headDir = pctDirection(headPct);
  const headPctColor = headDir === 'up' ? colors.bull : headDir === 'down' ? colors.bear : colors.textDim;
  // ذيل سطر النسبة (حالة التيك · المصدر · السوق · العرض/الطلب) — نصّاً ووسماً لقارئ الشاشة معاً.
  const headTail = !headSeries
    ? ''
    : (liveTick
      ? ` · ${
          tickStatusLabel(liveTick.source, liveTick.source.as_of, nowSec, {
            live: t.dsTickLive,
            demoTick: t.dsTickDemo,
            lastPrice: t.dsLastPriceWord,
          }) ?? t.focusLastPriceWord
        }`
      : '') +
    (` · ${provenanceLabel(normalizeProvenance(headSeries.data_source), {
      provider: t.dsKindProvider,
      demo: t.dsKindDemo,
      cache: t.dsKindCache,
      unknown: t.dsKindUnknown,
      unavailable: t.dsKindUnavailable,
    })}`) +
    (` · ${marketStatusLabel(sym, { open: t.dsMarketOpen, closed: t.dsMarketClosed })}`) +
    (hasSpread ? ` · B ${formatPrice(quote!.bid!, sym, quote!.bid)}/A ${formatPrice(quote!.ask!, sym, quote!.bid)}` : '');

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={[styles.top, rtl && styles.topRtl, phone && styles.topPhone]}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.closeButton,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={onClose}
            accessibilityLabel={t.closeWord}
            hitSlop={4}
          >
            <Text style={styles.close}>{phone ? '×' : t.closeWord}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.symbolHeading,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={() => {
              if (phone) setPhonePickerOpen((open) => !open);
            }}
            accessibilityLabel={`${t.focusSymbolA11yPrefix}: ${sym}${compareSym ? ` ${t.focusVsWord} ` + compareSym : ''}`}
          >
            <Text style={[styles.title, { textAlign: align }]}>
              {sym}
              {compareSym ? ` ${t.focusVsWord} ${compareSym}` : ''}
            </Text>
            <Text style={[styles.sub, { textAlign: align }]}>
              {phone
                ? `${tf} · ${t.focusPhoneSubHint}`
                : t.focusDesktopSub}
            </Text>
          </Pressable>
          {headSeries && !noReal && headPrice != null ? (
            <View style={styles.quote}>
              <Text style={styles.price}>{formatPrice(headPrice, sym)}</Text>
              <Text
                style={[styles.change, { color: headPctColor }]}
                // النسبة وحدها «+0.12%» بلا سياق و«—» علامة ترقيم لقارئ الشاشة (launch109)؛ الذيل كما يُرى.
                accessibilityLabel={
                  (headPct == null ? t.cfDayChangeNoneA11y : t.cfDayChangeA11y.replace('{pct}', formatPct(headPct))) +
                  headTail
                }
              >
                {headPct == null ? '—' : formatPct(headPct)}
                {headTail}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.body, rtl && styles.bodyRtl, phone && styles.bodyPhone]}>
          {!phone ? (
            <ScrollView
              style={styles.watch}
              contentContainerStyle={{ gap: 4, padding: spacing.sm }}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.watchTitle, { textAlign: align }]}>{t.focusWatchlistTitle}</Text>
              <SymbolSearchBar onPick={pick} />
              <Text style={[styles.watchHint, { textAlign: align }]}>{t.focusCompareHint}</Text>
              {watchlist.map((w) => (
                <Pressable
                  accessibilityState={{ selected: sym === w.symbol }}
                  accessibilityRole="button"
                  key={w.symbol}
                  style={({ pressed }) => [
                    styles.watchItem,
                    sym === w.symbol && styles.watchOn,
                    compareSym === w.symbol && styles.watchCompare,
                    pressed && {
                      opacity: buttons.pressedOpacity,
                      transform: [{ scale: buttons.pressedScale }],
                    },
                  ]}
                  onPress={() => pick(w.symbol)}
                  onLongPress={() => toggleCompare(w.symbol)}
                  accessibilityLabel={`${w.symbol} · ${w.label}${compareSym === w.symbol ? t.focusInComparisonSuffix : ''}`}
                >
                  <Text style={[styles.watchSym, { textAlign: align }]}>{w.symbol}</Text>
                  <Text style={[styles.watchLabel, { textAlign: align }]}>{w.label}</Text>
                  {compareSym === w.symbol ? (
                    <Text style={[styles.compareTag, { textAlign: align }]}>{t.focusCompareTag}</Text>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <ScrollView
            style={styles.main}
            contentContainerStyle={{
              padding: phone ? spacing.sm : spacing.md,
              gap: phone ? 7 : 10,
            }}
            keyboardShouldPersistTaps="handled"
          >
            {phone && phonePickerOpen ? (
              <>
                <SymbolSearchBar onPick={pick} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', gap: 4 }}>
                    {watchlist.map((w) => (
                      <Pressable
                        accessibilityState={{ selected: sym === w.symbol }}
                        accessibilityRole="button"
                        key={w.symbol}
                        style={({ pressed }) => [
                          styles.pill,
                          sym === w.symbol && styles.pillOn,
                          pressed && {
                            opacity: buttons.pressedOpacity,
                            transform: [{ scale: buttons.pressedScale }],
                          },
                        ]}
                        onPress={() => pick(w.symbol)}
                        onLongPress={() => toggleCompare(w.symbol)}
                        accessibilityLabel={`${t.focusPickSymbolA11yPrefix}: ${w.symbol}${compareSym === w.symbol ? t.focusInComparisonSuffix : ''}`}
                      >
                        <Text style={[styles.pillText, sym === w.symbol && styles.pillTextOn]}>
                          {w.symbol}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
                {compareSym && compareFailed && !loading ? (
                  <Text style={[styles.compareNote, styles.compareNoteWarn, { textAlign: align }]}>
                    {t.focusCompareUnavailable.replace('{sym}', compareSym)}
                  </Text>
                ) : compareSym ? (
                  <Text style={[styles.compareNote, { textAlign: align }]}>
                    {t.focusCompareNotePrefix} {compareSym} {t.focusCompareNoteSuffix}
                  </Text>
                ) : null}
              </>
            ) : null}

            <TimeframeBar value={tf} onChange={setTf} />
            <NewsRiskBanner symbol={sym} />
            {!phone ? <SymbolSnapshot symbol={sym} timeframe={tf} /> : null}

            {/* كان `loading ? spinner : MatrixChart` يفكّ الشارت بكل تبديل رمز/فريم فيضيع نوع الشموع
                والمؤشرات واللوغاريتمي. الآن يبقى مركَّباً، باهتاً تحت مؤشّر التحميل حتى تصل الشموع الجديدة. */}
            {!series ? (
              <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
            ) : noReal ? (
              <ProviderUnavailableNotice
                symbol={sym}
                height={Math.max(360, height * (phone ? 0.64 : 0.62))}
                dataSource={headSeries?.data_source}
              />
            ) : (
              <View accessibilityState={{ busy: loading }}>
                <View pointerEvents={loading ? 'none' : 'auto'} style={loading ? styles.chartLoading : undefined}>
                  <MatrixChart
                    series={series}
                    compareSeries={compareSeries}
                    height={Math.max(360, height * (phone ? 0.64 : 0.62))}
                    interactive
                    persistDrawings
                    compactUi={phone}
                    accent={sym === 'DXY' ? colors.dxy : colors.accent}
                    // شموع الرمز السابق ما زالت ظاهرة أثناء التحميل: لا يُرسم تيك الرمز الجديد فوقها
                    livePrice={
                      seriesSym === sym
                        ? livePriceForChart(series, liveTick, {
                            tickAsOf: liveTick?.source.as_of ?? null,
                            timeframe: series.timeframe,
                            nowSec,
                          })
                        : null
                    }
                    liveTickSource={seriesSym === sym ? liveTick?.source ?? null : null}
                    onCreateAlert={alertFromDrawing}
                    // الويب: كتابة «15» ثم Enter تبدّل الفريم كشريط `TimeframeBar` أعلاه (chart-r82a)
                    onTimeframeKey={setTf}
                    initialTool={initialTool}
                    initialLens={initialLens}
                    initialKind={initialKind}
                    initialIndicators={initialIndicators}
                  />
                </View>
                {loading ? (
                  <ActivityIndicator color={colors.accent} style={styles.chartSpinner} />
                ) : null}
              </View>
            )}

            {armedMsg ? (
              <Text style={[styles.armed, { textAlign: align }]} accessibilityLiveRegion="polite">
                ✓ {armedMsg}
              </Text>
            ) : null}
            <AlertsPanel defaultSymbol={sym} refreshKey={alertsRefreshKey} />
            <IndicatorAlertsPanel defaultSymbol={sym} defaultTimeframe={tf} />
            <BacktestPanel defaultSymbol={sym} defaultTimeframe={tf} />
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  chartLoading: { opacity: 0.35 },
  chartSpinner: { position: 'absolute', top: 40, alignSelf: 'center' },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topRtl: { flexDirection: 'row-reverse' },
  topPhone: { paddingVertical: 8, gap: spacing.sm },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
  },
  close: { color: colors.accent, fontWeight: '500' },
  symbolHeading: { flex: 1 },
  title: { color: colors.text, fontSize: 18, fontWeight: '500' },
  sub: { color: colors.textDim, fontSize: 11 },
  price: { ...numeric, color: colors.text, fontWeight: '600', fontSize: 15 },
  quote: { alignItems: 'flex-start' },
  change: { ...numeric, fontWeight: '500', fontSize: 11, marginTop: 4 },
  body: { flex: 1, flexDirection: 'row' },
  bodyRtl: { flexDirection: 'row-reverse' },
  bodyPhone: { flexDirection: 'column' },
  watch: {
    width: 200,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  watchTitle: {
    color: colors.textMuted,
    fontWeight: '500',
    fontSize: 11,
    marginBottom: spacing.xs,
  },
  watchHint: { color: colors.textDim, fontSize: 11, marginBottom: 4 },
  watchItem: {
    padding: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.bgPanel,
  },
  // المختار بالتعبئة وحدها (DESIGN-PRO §5.5)؛ الحدّ يبقى لـ`watchCompare` (لون خطّ المقارنة).
  watchOn: { backgroundColor: colors.accentSoft },
  // لون خطّ المقارنة نفسه على الرسم (`COMPARE_COLOR`) — `infoAccent` هو لون SMA 50 فكان
  // يوحي بالخطّ الخطأ.
  watchCompare: { borderColor: COMPARE_COLOR },
  watchSym: { color: colors.text, fontWeight: '500' },
  watchLabel: { color: colors.textMuted, fontSize: 11 },
  compareTag: { color: COMPARE_COLOR, fontSize: 11, marginTop: 4 },
  compareNote: { color: COMPARE_COLOR, fontSize: 11 },
  compareNoteWarn: { color: colors.warn, fontWeight: '500' },
  armed: { color: colors.textMuted, fontSize: 12, fontWeight: '500' },
  main: { flex: 1 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillOn: { borderColor: 'transparent', backgroundColor: colors.accentSoft },
  pillText: { color: colors.textMuted, fontWeight: '500', fontSize: 11 },
  pillTextOn: { color: colors.text },
});
