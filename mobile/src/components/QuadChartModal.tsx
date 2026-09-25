import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, spacing, buttons, numeric } from '../theme';
import { api, type ChartSeries } from '../api';
import { MatrixChart, type SyncTimeWindow } from '../chart/MatrixChart';
import { headerChangePct, livePriceForChart, livePriceForHeader } from '../chart/liveSeries';
import { useDailyRefs } from '../chart/dailyRefStore';
import { useMultiLiveTicks } from '../hooks/useMultiLiveTicks';
import { type Timeframe } from '../timeframes';
import { TimeframeBar } from './TimeframeBar';
import { candleTimeSec, isSyntheticProvenance, normalizeProvenance } from '../chart/dataSource';
import { formatPrice } from '../chart/math';
import { formatPct, pctDirection } from '../chart/dailyChange';
import { isForexMarketOpen } from '../chart/marketHours';
import { createSeriesCache, seriesCacheKey } from '../chart/seriesCache';
import { useI18n } from '../i18n/I18nContext';
import { ProviderUnavailableNotice, serverUnreachableSeries, seriesHasNoRealData } from './ProviderUnavailableNotice';

type Props = {
  visible: boolean;
  onClose: () => void;
  symbols?: [string, string, string, string];
  timeframe?: Timeframe;
};

// مصفوفة ثابتة لا `[]` بالسطر: الجديدة بكل رسم (كل تيك) تُطلق تأثير `initialIndicators`
// بالشارت فيعيد رسمه مرّة ثانية ويمسح أي مؤشّر أضافه المتداول.
const NO_INDICATORS: never[] = [];
const NO_SYMBOLS: string[] = [];
const isWeb = Platform.OS === 'web';

/** حشو الخلية وحدّها ورأسها (الرمز والسعر) فوق الشارت — راجع `phoneCellH`. */
const PHONE_CELL_CHROME = 2 * spacing.xs + 2 + 18 + spacing.xs;

/** آخر شموع ناجحة لكل (رمز، فريم) عبر الجلسة — الرجوع لفريم أو إعادة فتح الرباعي فوري. */
const quadSeriesCache = createSeriesCache<ChartSeries>();

const DEFAULT: [string, string, string, string] = ['EURUSD', 'GBPUSD', 'XAUUSD', 'DXY'];

export function QuadChartModal({
  visible,
  onClose,
  symbols: symbolsProp = DEFAULT,
  timeframe = '15m',
}: Props) {
  // المستدعي يمرّر مصفوفة حرفية جديدة بكل رسم (`[a, b, c, 'DXY']`): كانت كل إعادة رسم
  // للشاشة الأمّ تعيد جلب الشارتات الأربعة وتُرجع القيادة للخلية الأولى. الهوية الآن بالمحتوى.
  const symKey = symbolsProp.join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const symbols = useMemo(() => symbolsProp, [symKey]);
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const { width, height } = useWindowDimensions();
  const phone = width < 700;
  // الهاتف: أربع خلايا بعمود واحد بلا تمرير. كانت كل خلية 28% من الشاشة + رأسها وسطر قراءتها
  // وحشوها (~285pt على 844pt) فالأربع ≈ 1140pt: الخلية الرابعة (DXY) ونصف الثالثة خارج الشاشة
  // ولا سبيل إليهما. الآن الارتفاع من الشبكة المقيسة فعلاً مقسوماً على أربع، والشارت بلا سطر
  // القراءة (`dense`، كإطارات الشاشة الرئيسية المملوءة). الحدّ الأدنى 64 لا 96: بـ96 تحتاج الأربع
  // 4×(96+32)+40 = 552pt — هاتف 360×640 (شبكة ≈524pt) أو iPhone SE الأول كان يقصّ خلية DXY تحت الشاشة
  // بلا تمرير. 64pt شموع مضغوطة لكنها تُقرأ، والخلية الغائبة لا تُقرأ أبداً.
  const [gridH, setGridH] = useState(0);
  const phoneCellH =
    gridH > 0
      ? Math.max(64, (gridH - 5 * spacing.sm) / 4 - PHONE_CELL_CHROME)
      : height * 0.18;
  // هاتف بالعرض (844×390) يتجاوز حدّ العرض فيأخذ شبكة 2×2 اللوحيّ: خليتان بارتفاع 32% وحدّ أدنى 200pt
  // + الرأس وشريط الفريمات ≈ 530pt على 390pt ⇒ الصفّ الثاني (XAUUSD وDXY) تحت الشاشة بلا تمرير. الشاشة
  // القصيرة تقسم الشبكة المقيسة على صفّين بلا سطر القراءة كالهاتف.
  const short = !phone && height < 600;
  const shortCellH =
    gridH > 0 ? Math.max(80, (gridH - 3 * spacing.sm) / 2 - PHONE_CELL_CHROME) : height * 0.22;
  const cellH = phone ? phoneCellH : short ? shortCellH : height * 0.32;
  const [series, setSeries] = useState<(ChartSeries | null)[]>([null, null, null, null]);
  const ticks = useMultiLiveTicks(symbols, visible);
  // نسبة رأس الخلية = تغيّر اليوم (كقائمة المتابعة) لا «منذ أول شمعة محمّلة» — تختلف بين الخلايا بالفريم.
  const dailyRefs = useDailyRefs(visible ? symbols : NO_SYMBOLS);
  // الفريم كان ثابتاً من الشاشة الأمّ: مقارنة الأزواج الأربعة على فريم آخر تعني إغلاق الرباعي،
  // وتغيير فريم الإطار الأول، ثم فتحه من جديد. الآن شريط فريمات داخله يبدّل الأربعة معاً.
  // الاختيار يخصّ هذه الجلسة وحدها: يُنسى عند الإغلاق (وعند تغيّر فريم الأمّ) فلا يُفتح
  // الرباعي لاحقاً على فريم لا يطابق ما يوحي به الإطار الأول.
  const [tfOverride, setTfOverride] = useState<Timeframe | null>(null);
  useEffect(() => {
    if (!visible) setTfOverride(null);
  }, [visible]);
  useEffect(() => {
    setTfOverride(null);
  }, [timeframe]);
  const tf = tfOverride ?? timeframe;

  // «مغلق» لكل خلية كوسم ChartFrame: عطلة الأسبوع كان الرباعي يطبع أربعة أسعار بلا أثر أنها
  // أسعار إغلاق الجمعة، والذهب/المؤشرات تُغلق وحدها بكسر 17:00 نيويورك بينما العملات مفتوحة.
  // يُعاد الفحص كل 30ث: بالإغلاق تتوقّف التيكات فلا يُعاد الرسم.
  const [closed, setClosed] = useState<boolean[]>(() => symbols.map((sym) => !isForexMarketOpen(sym)));
  useEffect(() => {
    if (!visible) return;
    const check = () =>
      setClosed((prev) => {
        const next = symbols.map((sym) => !isForexMarketOpen(sym));
        return next.every((c, i) => c === prev[i]) && next.length === prev.length ? prev : next;
      });
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [visible, symbols]);

  // أربعة شارتات بنفس الفريم كانت تُرسم مستقلّة تماماً: لا شيء يربط نافذتها الزمنية
  // ولا يقول للمتداول إن ما يراه هو نفس المدى على الأزواج الأربعة. الآن شارت واحد
  // **يقود** الزمن (قابل للسحب) والثلاثة تتبعه زمنياً فقط، والقيادة تُنقل بضغطة على
  // أي شارت — وكلا الحالتين موسومة بالرأس فلا مزامنة خفيّة.
  const [syncTime, setSyncTime] = useState(true);
  const [leader, setLeader] = useState(0);
  const [syncWindow, setSyncWindow] = useState<SyncTimeWindow | null>(null);
  // زمن تقاطع القائد (ثوانٍ): التوابع ترسم خطّاً عمودياً وقراءة OHLC لشمعتها عنده.
  const [crossTime, setCrossTime] = useState<number | null>(null);

  // النافذة المشتركة تخصّ رموزاً وفريماً بعينهما: تُصفَّر مع أي تبديل أو إعادة فتح،
  // وإلا تُطبَّق نافذة فريم سابق على شموع فريم جديد.
  useEffect(() => {
    setSyncWindow(null);
    setCrossTime(null);
    setLeader(0);
  }, [visible, symbols, tf]);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    // حتى ينتهي جلب الرموز كانت الخلايا تعرض شموع الفريم/الرموز السابقة
    // (وسعرها بالرأس) بلا أي أثر. الآن مؤشّر تحميل صريح بدل بيانات قديمة تُقرأ كحالية —
    // إلا شموع الرمز/الفريم **نفسه** من ذاكرة الجلسة (`seriesCache`، 5 دقائق على الأكثر).
    // والجلب كان ينتظر الأربعة **واحداً بعد واحد** ثم يعرضها دفعة واحدة: أبطأ رمز يحجب
    // الثلاثة الجاهزة، والانتظار مجموع أزمنتها. الآن متوازٍ، وكل خلية تُملأ لحظة وصول شموعها.
    // الرجوع لفريم فُتح قبل قليل: شموعه المحفوظة فوراً بدل مؤشّر التحميل، والجلب يستبدلها.
    setSeries(symbols.map((sym) => quadSeriesCache.get(seriesCacheKey(sym, tf))));
    symbols.forEach((sym, i) => {
      const key = seriesCacheKey(sym, tf);
      api
        .chart(sym, tf)
        .then((s) => {
          if (!isSyntheticProvenance(s.data_source)) {
            quadSeriesCache.put(key, s);
            return s;
          }
          // المزوّد معطّل والخادم ردّ بشموع تجريبية: شموع حقيقية حديثة بالذاكرة (معروضة للتوّ) تبقى — كانت تُستبدل
          // بعد لحظة بسلسلة «تجريبي» مختلفة. كفشل الجلب أدناه وكالتحديث الدوري.
          return quadSeriesCache.get(key) ?? s;
        })
        .catch(() => {
          // فشل التحديث وبالذاكرة شموع حقيقية حديثة ⇒ تبقى هي لا الوهمية.
          const cached = quadSeriesCache.get(key);
          if (cached) return cached;
          // launch121: لا شموع وهمية حول أسعار 2024 — سلسلة فارغة ⇒ إشعار «لا اتصال بخادم MATRIX».
          return serverUnreachableSeries(sym, tf);
        })
        .then((s) => {
          if (!alive) return;
          setSeries((prev) => {
            const next = [...prev];
            next[i] = s;
            return next;
          });
        });
    });
    return () => {
      alive = false;
    };
  }, [visible, symbols, tf]);

  // الجلب أعلاه مرّة واحدة لكل فتح/تبديل: على 15m بعد ربع ساعة يقع التيك خارج آخر شمعة
  // فيُرفض، ويقف الشارت بينما الرأس يطبع السعر الحيّ. تحديث صامت كل 90 ث كالطرفية:
  // شموع حقيقية جديدة تستبدل القديمة، وفشل الجلب (أو رجوع بيانات وهمية) يُبقي ما هو معروض.
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    const refresh = () => {
      symbols.forEach((sym, i) => {
        api
          .chart(sym, tf)
          .then((s) => {
            if (!alive || isSyntheticProvenance(s.data_source)) return;
            quadSeriesCache.put(seriesCacheKey(sym, tf), s);
            setSeries((prev) => {
              const next = [...prev];
              next[i] = s;
              return next;
            });
          })
          .catch(() => {});
      });
    };
    const id = setInterval(refresh, 90_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [visible, symbols, tf]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={[styles.top, rtl && styles.topRtl]}>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeHit,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            hitSlop={8}
            accessibilityLabel={t.quadCloseA11y}
          >
            <Text style={styles.close}>{t.closeWord}</Text>
          </Pressable>
          {/* اسم الفريم المحلي كشريط الفريمات («15 د» لا «15m» بالعربية؛ القارئ «15 دقيقة» لا «15 متر»). */}
          <Text
            style={[styles.title, { textAlign: align }]}
            accessibilityLabel={`${t.quadTitlePrefix} · ${t.tfLabelsA11y[tf]}`}
          >
            {t.quadTitlePrefix} · {t.tfLabels[tf]}
          </Text>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: syncTime }}
            accessibilityLabel={t.mcSyncToggleA11y}
            onPress={() => setSyncTime((v) => !v)}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            style={({ pressed }) => [
              styles.syncToggle,
              syncTime && styles.syncToggleOn,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
          >
            <Text style={[styles.syncToggleText, syncTime && styles.syncToggleTextOn]}>
              {syncTime ? t.mcSyncTimeOn : t.mcSyncTimeOff}
            </Text>
          </Pressable>
        </View>
        <View style={[styles.tfRow, rtl && styles.tfRowRtl]}>
          <TimeframeBar value={tf} onChange={setTfOverride} compact />
        </View>
        {syncTime ? (
          <Text style={[styles.syncHint, { textAlign: align }]}>
            {`${t.mcSyncLeadHint} — ${symbols[leader]}`}
          </Text>
        ) : null}
        <View
          style={[styles.grid, rtl && styles.gridRtl, phone && styles.gridPhone]}
          onLayout={(e) => setGridH(e.nativeEvent.layout.height)}
        >
          {symbols.map((sym, i) => {
            const isLeader = i === leader;
            const following = syncTime && !isLeader;
            // رأس الخلية كان الرمز وحده: أربعة أزواج بلا سعر ولا نسبة، فالمقارنة — سبب فتح
            // الرباعي أصلاً — تتطلّب قراءة محور كل شارت. السعر الحيّ (أو آخر إغلاق) بخانات
            // الزوج، والنسبة بقاعدة رأس الإطار نفسها: اللون من الرقم المطبوع، وصفره مكتوم.
            const s = series[i];
            // السعر والنسبة من الرقم نفسه: كان السعر المطبوع التيك الخام (ولو تيك بثّ تجريبي بجانب شموع
            // حقيقية، أو سعراً بعيداً عن السلسلة) والنسبة بجانبه من سعر الخادم — فيتناقضان.
            // والتيك الأقدم من آخر شمعة جلبها التحديث (رمز غاب عن البثّ — `useMultiLiveTicks` يُبقيه حتى
            // 20 ث) لا يُطبع: كان سعر الساعة الماضية يبقى بالرأس والشارت تحته يتحرّك مع كل تحديث 90 ث.
            const tk = ticks[sym];
            const lastBar = s?.candles[s.candles.length - 1];
            const tickOlder =
              tk?.source.as_of != null && lastBar != null && tk.source.as_of < candleTimeSec(lastBar.time);
            const headPx = s && !tickOlder ? livePriceForHeader(s, tk ?? null) : null;
            const px = headPx ?? s?.last ?? NaN;
            // النسبة تتبع التيك المطبوع بجانبها (لا نسبة الجلب الأخير بجانب سعر أحدث منه)، ولو بعد
            // إغلاق الشمعة الأخيرة وقبل الجلب التالي.
            const livePct = s ? headerChangePct(s, headPx, dailyRefs[sym.toUpperCase()]) : NaN;
            // الشمعة الحيّة تأخذ التيك الواقع بها وحده.
            const merged = s
              ? livePriceForChart(s, ticks[sym] ?? null, {
                  tickAsOf: ticks[sym]?.source.as_of ?? null,
                  timeframe: s.timeframe,
                })
              : null;
            const pct = s && Number.isFinite(livePct) ? livePct : null;
            const pctDir = pctDirection(pct);
            const pctColor = pctDir === 'up' ? colors.bull : pctDir === 'down' ? colors.bear : colors.textDim;
            // backend-r19: رمز بلا بيانات حقيقية أصلاً (DXY) ⇒ لا سعر ولا نسبة ولا شموع بذرة.
            const noReal = s != null && seriesHasNoRealData(s.data_source);
            return (
              <Pressable
                key={`${i}:${sym}`}
                // iOS/Android: الخلية `accessible` تخفي كل ما بداخلها — والمزامنة مفعّلة افتراضياً ⇒ الخلايا التابعة
                // الثلاث كانت عنصراً واحداً «تفعيل مزامنة GBPUSD» لا يُبلغ منه السعر ولا النسبة ولا «مغلق»/«تجريبي»،
                // والمقارنة سبب فتح الرباعي. كإطار ChartFrame: لا تُجمَّع على الجوال، والقيادة إجراء مخصّص على الرمز.
                // الويب: الحاوية لا تخفي أبناءها ⇒ تبقى زرّاً للوحة المفاتيح.
                accessible={isWeb && following}
                accessibilityRole={isWeb && following ? 'button' : undefined}
                accessibilityLabel={isWeb && following ? `${t.cfSyncActivateA11yPrefix}${sym}` : undefined}
                disabled={!syncTime || isLeader}
                accessibilityState={
                  isWeb ? { disabled: !syncTime || isLeader, selected: syncTime && isLeader } : undefined
                }
                onPress={() => setLeader(i)}
                style={[
                  styles.cell,
                  phone && styles.cellPhone,
                  short && styles.cellShort,
                  syncTime && isLeader && styles.cellLeader,
                ]}
              >
                {/* شموع تجريبية (سلسلة demo قديمة من الخادم؛ فشل الطلب صار إشعاراً، launch121) كانت تُرسم هنا بلا أي
                    وسم فتُقرأ كسوق حقيقي — بعكس ChartFrame/الشارت الرئيسي اللذين يوسمانها «تجريبي». */}
                <View style={[styles.cellHead, rtl && styles.cellHeadRtl]}>
                  <Text
                    style={[styles.sym, { textAlign: align }]}
                    accessibilityActions={
                      !isWeb && following ? [{ name: 'syncActivate', label: `${t.cfSyncActivateA11yPrefix}${sym}` }] : undefined
                    }
                    onAccessibilityAction={(e) => {
                      if (e.nativeEvent.actionName === 'syncActivate') setLeader(i);
                    }}
                  >
                    {sym}
                  </Text>
                  {syncTime ? (
                    <Text style={[styles.syncBadge, isLeader && styles.syncBadgeLeader]}>
                      {isLeader ? t.cfSyncLeaderBadge : t.cfSyncFollowBadge}
                    </Text>
                  ) : null}
                  {s && !noReal && Number.isFinite(px) ? (
                    <Text style={styles.cellPrice}>{formatPrice(px, sym, s?.last)}</Text>
                  ) : null}
                  {s && !noReal ? (
                    <Text
                      style={[styles.cellPct, { color: pctColor }]}
                      accessibilityLabel={
                        pct == null ? t.cfDayChangeNoneA11y : t.cfDayChangeA11y.replace('{pct}', formatPct(pct))
                      }
                    >
                      {pct == null ? '—' : formatPct(pct)}
                    </Text>
                  ) : null}
                  {closed[i] ? (
                    <Text style={styles.closedTag} accessibilityLabel={t.cfMarketClosedA11y}>
                      {t.cfMarketClosedTag}
                    </Text>
                  ) : null}
                  {noReal ? (
                    // DXY: لا يقدّمه المزوّد أصلاً — الجملة مكان الشارت (backend-r19)، والوسم القصير هنا.
                    <Text style={styles.demoTag}>{t.dsKindUnavailable}</Text>
                  ) : series[i] && normalizeProvenance(series[i]!.data_source).kind === 'demo' ? (
                    <Text style={styles.demoTag}>{t.dsKindDemo}</Text>
                  ) : null}
                </View>
                {noReal ? (
                  <ProviderUnavailableNotice symbol={sym} height={cellH} dataSource={s?.data_source} />
                ) : series[i] ? (
                  <MatrixChart
                    series={series[i]!}
                    height={cellH}
                    interactive={false}
                    persistDrawings={false}
                    livePrice={merged}
                    liveTickSource={ticks[sym]?.source ?? null}
                    accent={sym === 'DXY' ? colors.dxy : colors.accent}
                    initialLens="clean"
                    initialIndicators={NO_INDICATORS}
                    dense={phone || short}
                    panControls={!syncTime || isLeader}
                    syncWindow={following ? syncWindow : null}
                    onSyncWindow={syncTime && isLeader ? setSyncWindow : undefined}
                    syncFollow={following}
                    syncTimeOnly
                    syncCrossTime={following ? crossTime : undefined}
                    onCrossTime={syncTime && isLeader ? setCrossTime : undefined}
                  />
                ) : (
                  // chart-r47: الدوّار وحده كان لا يقول ماذا يُحمَّل — والخلايا الأربع تبدو متطابقة أثناء التحميل.
                  <View
                    style={[styles.cellLoading, { height: cellH }]}
                    accessible
                    accessibilityRole="progressbar"
                    accessibilityState={{ busy: true }}
                    accessibilityLabel={t.chartFirstLoad.replace('{symbol}', sym).replace('{tf}', t.tfLabelsA11y[tf])}
                  >
                    <ActivityIndicator color={colors.accent} />
                    <Text style={styles.cellLoadingText} numberOfLines={2}>
                      {t.chartFirstLoad.replace('{symbol}', sym).replace('{tf}', t.tfLabels[tf])}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  cellLoading: { alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm },
  cellLoadingText: { color: colors.textDim, fontSize: 11, textAlign: 'center' },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topRtl: { flexDirection: 'row-reverse' },
  close: { color: colors.accent, fontWeight: '500' },
  tfRow: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  tfRowRtl: { flexDirection: 'row-reverse' },
  title: { flex: 1, color: colors.text, fontWeight: '500', fontSize: 16 },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  gridRtl: { flexDirection: 'row-reverse' },
  gridPhone: { flexDirection: 'column', flexWrap: 'nowrap' },
  cell: {
    width: '49%',
    flexGrow: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
    minHeight: 200,
  },
  cellPhone: { width: '100%', minHeight: 0 },
  cellShort: { minHeight: 0 },
  cellHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  cellHeadRtl: { flexDirection: 'row-reverse' },
  sym: { color: colors.accent, fontWeight: '500' },
  cellPrice: { ...numeric, color: colors.text, fontSize: 12, fontWeight: '600' },
  cellPct: { ...numeric, fontSize: 11, fontWeight: '600' },
  demoTag: { color: colors.warn, fontSize: 10, fontWeight: '500' },
  closedTag: { color: colors.warn, fontSize: 9, fontWeight: '500', opacity: 0.9 },
  // القيادة والتبعية موسومتان بالرأس وبحدّ الخلية: المزامنة لا تعمل بصمت.
  syncBadge: {
    color: colors.textDim,
    fontSize: 9,
    fontWeight: '500',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radii.sm,
    backgroundColor: colors.borderSoft,
  },
  syncBadgeLeader: { color: colors.accent, backgroundColor: colors.accentSoft },
  cellLeader: { borderColor: colors.accent },
  // المخرج الوحيد من النافذة على iOS: كان نصّاً ~33pt — الآن ≥44 كهدف لمس.
  closeHit: { minHeight: 44, minWidth: 44, justifyContent: 'center' },
  syncToggle: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  syncToggleOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  syncToggleText: { color: colors.textDim, fontSize: 11, fontWeight: '500' },
  syncToggleTextOn: { color: colors.accent },
  syncHint: {
    color: colors.textMuted,
    fontSize: 10,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
});
