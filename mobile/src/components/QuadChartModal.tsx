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
import { colors, radii, spacing, buttons, numeric, selectedMarkerWidth } from '../theme';
import { api, type ChartSeries } from '../api';
import { MatrixChart, type SyncTimeWindow } from '../chart/MatrixChart';
import { headerChangePct, livePriceForChart, livePriceForHeader, tickPredatesLastBar } from '../chart/liveSeries';
import { useDailyRefs } from '../chart/dailyRefStore';
import { useMultiLiveTicks } from '../hooks/useMultiLiveTicks';
import { type Timeframe } from '../timeframes';
import { TimeframeBar } from './TimeframeBar';
import { isSyntheticProvenance, normalizeProvenance } from '../chart/dataSource';
import { formatPrice } from '../chart/math';
import { formatPct, pctDirection } from '../chart/dailyChange';
import { isForexMarketOpen } from '../chart/marketHours';
import { cachedChartSeries, rememberChartSeries, sharedSeriesCache } from '../hooks/chartSeriesCache';
import { seriesCacheKey } from '../chart/seriesCache';
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

/** حشو الخلية وحدّها ورأسها (الرمز والسعر) فوق الشارت — راجع `shortCellH`. */
const PHONE_CELL_CHROME = 2 * spacing.xs + 2 + 18 + spacing.xs;

/** آخر شموع ناجحة لكل (رمز، فريم) عبر الجلسة، مشتركة مع التركيز — الرجوع لفريم أو إعادة فتح الرباعي فوري. */
const quadSeriesCache = sharedSeriesCache;

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
  // قرار أنس ١٦: الرباعي على الهاتف **شارت واحد كامل مع تبديل سريع** — كانت أربع خلايا بعمود واحد، كلّ منها
  // ربع الشبكة ناقص رأسها (~64–150pt بشموع مضغوطة لا تُقرأ ذيولها). الآن ألسنة الرموز الأربعة (الرمز والسعر ونسبة
  // اليوم) فوق شارت واحد بكامل ما تبقّى، ولمسة على لسان تبدّله. الارتفاع من صندوق الشارت المقيس فعلاً.
  const [gridH, setGridH] = useState(0);
  const [phoneChartH, setPhoneChartH] = useState(0);
  // هاتف بالعرض (844×390) يتجاوز حدّ العرض فيأخذ شبكة 2×2 اللوحيّ: خليتان بارتفاع 32% وحدّ أدنى 200pt
  // + الرأس وشريط الفريمات ≈ 530pt على 390pt ⇒ الصفّ الثاني (XAUUSD وDXY) تحت الشاشة بلا تمرير. الشاشة
  // القصيرة تقسم الشبكة المقيسة على صفّين بلا سطر القراءة كالهاتف.
  const short = !phone && height < 600;
  const shortCellH =
    gridH > 0 ? Math.max(80, (gridH - 3 * spacing.sm) / 2 - PHONE_CELL_CHROME) : height * 0.22;
  const cellH = short ? shortCellH : height * 0.32;
  const [series, setSeries] = useState<(ChartSeries | null)[]>([null, null, null, null]);
  const ticks = useMultiLiveTicks(symbols, visible);
  // نسبة رأس الخلية = تغيّر اليوم (كقائمة المتابعة) لا «منذ أول شمعة محمّلة» — تختلف بين الخلايا بالفريم.
  const dailyRefs = useDailyRefs(visible ? symbols : NO_SYMBOLS);
  // الفريم كان ثابتاً من الشاشة الأمّ: مقارنة الأزواج الأربعة على فريم آخر تعني إغلاق الرباعي،
  // وتغيير فريم الإطار الأول، ثم فتحه من جديد. الآن شريط فريمات داخله يبدّل الأربعة معاً.
  // الاختيار يخصّ هذه الجلسة وحدها: يُنسى عند الإغلاق (وعند تغيّر فريم الأمّ) فلا يُفتح
  // الرباعي لاحقاً على فريم لا يطابق ما يوحي به الإطار الأول.
  const [tfOverride, setTfOverride] = useState<Timeframe | null>(null);
  // DESIGN-PRO §5.6 — مسك أيّ خلية ⇒ الرأس وشريط الفريمات إلى 40% حتى الرفع (كـ`TerminalScreen`).
  const [chartTouch, setChartTouch] = useState(false);
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
  }, [visible, symbols, tf]);
  // القائد اختيار المتداول لخانة لا لفريم: تبديل الفريم من شريط الرباعي كان يعيده إلى الخانة الأولى
  // (الإطار والشارة و«يقود — X» تقفز إلى EURUSD بعد أن اختار XAUUSD). يُصفَّر مع إعادة الفتح أو تغيير الرموز فقط.
  useEffect(() => {
    setLeader(0);
  }, [visible, symbols]);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    // حتى ينتهي جلب الرموز كانت الخلايا تعرض شموع الفريم/الرموز السابقة
    // (وسعرها بالرأس) بلا أي أثر. الآن مؤشّر تحميل صريح بدل بيانات قديمة تُقرأ كحالية —
    // إلا شموع الرمز/الفريم **نفسه** من ذاكرة الجلسة (`seriesCache`، 5 دقائق على الأكثر).
    // والجلب كان ينتظر الأربعة **واحداً بعد واحد** ثم يعرضها دفعة واحدة: أبطأ رمز يحجب
    // الثلاثة الجاهزة، والانتظار مجموع أزمنتها. الآن متوازٍ، وكل خلية تُملأ لحظة وصول شموعها.
    // الرجوع لفريم فُتح قبل قليل: شموعه المحفوظة فوراً بدل مؤشّر التحميل، والجلب يستبدلها.
    setSeries(symbols.map((sym) => cachedChartSeries(sym, tf)));
    symbols.forEach((sym, i) => {
      const key = seriesCacheKey(sym, tf);
      api
        .chart(sym, tf)
        // المزوّد معطّل والخادم ردّ بشموع تجريبية: شموع حقيقية حديثة بالذاكرة (معروضة للتوّ) تبقى — كانت تُستبدل
        // بعد لحظة بسلسلة «تجريبي» مختلفة. كفشل الجلب أدناه وكالتحديث الدوري.
        .then((s) => rememberChartSeries(sym, tf, s))
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

  // قراءة خلية واحدة (السعر والنسبة والشموع المدموجة بالتيك) — مشتركة بين شبكة اللوح وألسنة الهاتف.
  const cellData = (i: number) => {
    const sym = symbols[i]!;
    // رأس الخلية كان الرمز وحده: أربعة أزواج بلا سعر ولا نسبة، فالمقارنة — سبب فتح
    // الرباعي أصلاً — تتطلّب قراءة محور كل شارت. السعر الحيّ (أو آخر إغلاق) بخانات
    // الزوج، والنسبة بقاعدة رأس الإطار نفسها: اللون من الرقم المطبوع، وصفره مكتوم.
    const s = series[i];
    // السعر والنسبة من الرقم نفسه: كان السعر المطبوع التيك الخام (ولو تيك بثّ تجريبي بجانب شموع
    // حقيقية، أو سعراً بعيداً عن السلسلة) والنسبة بجانبه من سعر الخادم — فيتناقضان.
    // والتيك الأقدم من آخر شمعة جلبها التحديث (رمز غاب عن البثّ — `useMultiLiveTicks` يُبقيه حتى
    // 20 ث) لا يُطبع: كان سعر الساعة الماضية يبقى بالرأس والشارت تحته يتحرّك مع كل تحديث 90 ث.
    const tk = ticks[sym];
    const tickOlder = s != null && tickPredatesLastBar(s, tk?.source.as_of);
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
    return { s, px, pct, pctColor, merged, noReal };
  };

  // chart-r47: الدوّار وحده كان لا يقول ماذا يُحمَّل — والخلايا الأربع تبدو متطابقة أثناء التحميل.
  const renderLoading = (sym: string, h: number) => (
    <View
      style={[styles.cellLoading, { height: h }]}
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
  );

  const chromeDim = chartTouch ? styles.chromeDim : null;

  // الهاتف: ألسنة الرموز الأربعة ثم شارت اللسان المختار وحده. اللسان المختار = `leader` نفسه، فتدوير الهاتف
  // بالعرض (شبكة 2×2) يُبقي الرمز الذي كان المتداول ينظر إليه قائداً. لا مزامنة زمن هنا — شارت واحد لا يُقارَن
  // بشيء على الشاشة؛ كل رمز يُفتح على نافذته الافتراضية ويُسحب ويُقرص بحرّية.
  const renderPhone = () => {
    const focus = Math.min(leader, symbols.length - 1);
    const sym = symbols[focus]!;
    const { s, merged, noReal } = cellData(focus);
    const chartH = phoneChartH > 0 ? phoneChartH : height * 0.5;
    const demo = s != null && !noReal && normalizeProvenance(s.data_source).kind === 'demo';
    return (
      <View style={styles.phoneBody}>
        <View style={[styles.tabs, rtl && styles.tabsRtl, chromeDim]} accessibilityRole="tablist">
          {symbols.map((tabSym, i) => {
            const on = i === focus;
            const d = cellData(i);
            // لسان سلسلته تجريبية كان يطبع سعرها ونسبتها الملوّنة بلا وسم (الوسم تحت الشارت للسان المختار وحده)
            // ⇒ ثلاثة ألسنة بأسعار مولَّدة تُقرأ كسوق. الوسم مكان السعر كـ«غير متاح»، ولا نسبة من بيانات مولَّدة.
            const tabDemo = d.s != null && !d.noReal && normalizeProvenance(d.s.data_source).kind === 'demo';
            const tabTag = d.noReal ? t.dsKindUnavailable : tabDemo ? t.dsKindDemo : null;
            const priceText =
              d.s && !tabTag && Number.isFinite(d.px) ? formatPrice(d.px, tabSym, d.s.last) : null;
            const pctText = d.s && !tabTag ? (d.pct == null ? '—' : formatPct(d.pct)) : null;
            const a11y = [
              tabSym,
              priceText,
              tabTag
                ? tabTag
                : d.s
                  ? d.pct == null
                    ? t.cfDayChangeNoneA11y
                    : t.cfDayChangeA11y.replace('{pct}', formatPct(d.pct))
                  : null,
              closed[i] ? t.cfMarketClosedA11y : null,
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <Pressable
                key={`${i}:${tabSym}`}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={a11y}
                onPress={() => setLeader(i)}
                style={({ pressed }) => [
                  styles.tab,
                  on && styles.tabOn,
                  pressed && { opacity: buttons.pressedOpacity },
                ]}
              >
                <Text style={[styles.tabSym, on && styles.tabSymOn]} numberOfLines={1}>
                  {tabSym}
                </Text>
                {tabTag ? (
                  <Text style={styles.demoTag} numberOfLines={1}>
                    {tabTag}
                  </Text>
                ) : (
                  <Text style={styles.tabPrice} numberOfLines={1}>
                    {priceText ?? '—'}
                  </Text>
                )}
                <Text style={[styles.tabPct, { color: d.pct == null ? colors.textDim : d.pctColor }]} numberOfLines={1}>
                  {pctText ?? ' '}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {closed[focus] || demo ? (
          <View style={[styles.phoneTags, rtl && styles.cellHeadRtl]}>
            {closed[focus] ? (
              <Text style={styles.closedTag} accessibilityLabel={t.cfMarketClosedA11y}>
                {t.cfMarketClosedTag}
              </Text>
            ) : null}
            {demo ? <Text style={styles.demoTag}>{t.dsKindDemo}</Text> : null}
          </View>
        ) : null}
        <View style={styles.phoneChart} onLayout={(e) => setPhoneChartH(Math.floor(e.nativeEvent.layout.height))}>
          {noReal ? (
            <ProviderUnavailableNotice symbol={sym} height={chartH} dataSource={s?.data_source} />
          ) : s ? (
            <MatrixChart
              key={sym}
              series={s}
              height={chartH}
              interactive={false}
              persistDrawings={false}
              livePrice={merged}
              liveTickSource={ticks[sym]?.source ?? null}
              accent={sym === 'DXY' ? colors.dxy : colors.accent}
              initialLens="clean"
              initialIndicators={NO_INDICATORS}
              panControls
              onTimeframeKey={setTfOverride}
              onChartInteract={setChartTouch}
            />
          ) : (
            renderLoading(sym, chartH)
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="none" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={[styles.top, rtl && styles.topRtl, chromeDim]}>
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
          {phone ? null : (
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
          )}
        </View>
        <View style={[styles.tfRow, rtl && styles.tfRowRtl, chromeDim]}>
          <TimeframeBar value={tf} onChange={setTfOverride} compact />
        </View>
        {syncTime && !phone ? (
          <Text style={[styles.syncHint, { textAlign: align }, chromeDim]}>
            {`${t.mcSyncLeadHint} — ${symbols[leader]}`}
          </Text>
        ) : null}
        {phone ? (
          renderPhone()
        ) : (
          <View
            style={[styles.grid, rtl && styles.gridRtl]}
            onLayout={(e) => setGridH(e.nativeEvent.layout.height)}
          >
            {symbols.map((sym, i) => {
              const isLeader = i === leader;
              const following = syncTime && !isLeader;
              const { s, px, pct, pctColor, merged, noReal } = cellData(i);
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
                      dense={short}
                      panControls={!syncTime || isLeader}
                      syncWindow={following ? syncWindow : null}
                      onSyncWindow={syncTime && isLeader ? setSyncWindow : undefined}
                      syncFollow={following}
                      syncTimeOnly
                      syncCrossTime={following ? crossTime : undefined}
                      onCrossTime={syncTime && isLeader ? setCrossTime : undefined}
                      // الويب: «15»/«4h» ثم Enter فوق أيّ خلية = شريط الفريمات المشترك أعلى النافذة.
                      onTimeframeKey={setTfOverride}
                      onChartInteract={setChartTouch}
                    />
                  ) : (
                    renderLoading(sym, cellH)
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  chromeDim: { opacity: 0.4 },
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
  close: { color: colors.textMuted, fontWeight: '500', fontSize: 13 },
  tfRow: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  tfRowRtl: { flexDirection: 'row-reverse' },
  // DESIGN-PRO §2: 13px للعناصر والعناوين (16 خارج السلّم، وأعلى صوتاً من أسعار الخلايا 12px تحته).
  title: { flex: 1, color: colors.text, fontWeight: '500', fontSize: 13 },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  gridRtl: { flexDirection: 'row-reverse' },
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
  cellShort: { minHeight: 0 },
  cellHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  cellHeadRtl: { flexDirection: 'row-reverse' },
  // DESIGN-PRO §1: كان تأكيداً بكل خلية (أربعة عناصر تأكيد وقت السكون) ⇒ نصّ أساسي؛ التأكيد
  // الوحيد بالشبكة حدّ الخلية القائدة، وبالشريط العلوي الفريم النشط.
  // §2: 12px كرمز قائمة المتابعة (بلا حجم كان 14 افتراضياً — أعلى من سعر الخلية 12 بجواره).
  sym: { color: colors.text, fontWeight: '500', fontSize: 12 },
  cellPrice: { ...numeric, color: colors.text, fontSize: 12, fontWeight: '600' },
  cellPct: { ...numeric, fontSize: 11, fontWeight: '600' },
  // DESIGN-PRO §2 — وسوم الخلية 11px (كانت 9–10، أصغر من علامات المحور بالخلية نفسها).
  demoTag: { color: colors.warn, fontSize: 11, fontWeight: '500' },
  closedTag: { color: colors.warn, fontSize: 11, fontWeight: '500', opacity: 0.9 },
  // القيادة والتبعية موسومتان بالرأس وبحدّ الخلية: المزامنة لا تعمل بصمت.
  // الهاتف (قرار ١٦): ألسنة الرموز فوق شارت واحد. اللسان المختار بتعبئة + علامة سفلية 2px (لا باللون وحده، §4)،
  // والعلامة بلون النصّ لا التأكيد: الفريم النشط بالشريط فوقها هو عنصر التأكيد الوحيد (§1).
  phoneBody: { flex: 1, paddingHorizontal: spacing.sm, paddingTop: spacing.sm },
  tabs: { flexDirection: 'row', gap: spacing.xs },
  tabsRtl: { flexDirection: 'row-reverse' },
  tab: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    borderBottomWidth: selectedMarkerWidth,
    borderBottomColor: 'transparent',
  },
  tabOn: { backgroundColor: colors.selectedFill, borderBottomColor: colors.text },
  tabSym: { color: colors.textDim, fontSize: 12, fontWeight: '500' },
  tabSymOn: { color: colors.text },
  tabPrice: { ...numeric, color: colors.text, fontSize: 12, fontWeight: '600' },
  tabPct: { ...numeric, fontSize: 11, fontWeight: '500' },
  phoneTags: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.xs },
  phoneChart: { flex: 1, marginTop: spacing.sm, marginBottom: spacing.sm },
  syncBadge: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '500',
    paddingHorizontal: 4,
    paddingVertical: 0,
    borderRadius: radii.sm,
    backgroundColor: colors.borderSoft,
  },
  syncBadgeLeader: { color: colors.text, backgroundColor: colors.selectedFill },
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
  syncToggleOn: { borderColor: colors.textDim, backgroundColor: colors.selectedFill },
  syncToggleText: { color: colors.textDim, fontSize: 11, fontWeight: '500' },
  syncToggleTextOn: { color: colors.text },
  syncHint: {
    color: colors.textMuted,
    fontSize: 11,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
});
