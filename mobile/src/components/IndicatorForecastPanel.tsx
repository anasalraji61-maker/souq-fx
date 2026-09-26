import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { colors, radii, spacing, frameEmbed, frameEmbedHead, frameEmbedTitleBlock, frameEmbedTitle, frameEmbedSub, buttons, numeric, selectedMarkerWidth } from '../theme';
import { api } from '../api';
import { dirColor, dirLabel, formatScore, levelsUnavailableText } from './signalDirection';
import { formatPrice } from '../chart/math';
import { symbolPriceDecimals } from '../chart/indicators/utils';
import { forecastDisclaimer, forecastVoteDetail, forecastVoteName } from '../chart/forecastText';
import { formatRR } from '../tradePlan';
import { pipsBetween } from '../positionSize';
import { chartPipSpec } from '../chart/pipSpec';
import { pipsNumber, pipUnit } from '../chart/measureReadout';
import { formatLocalStamp } from '../localStamp';
import { providerUnavailableReason, serverNowSec } from '../chart/dataSource';
import { useI18n } from '../i18n/I18nContext';
import { isTimeframe } from '../timeframes';
import type { Dict } from '../i18n/locales';

type Props = { symbol: string; timeframe?: string; embedded?: boolean };

/** سعر المستويات أقدم من هذا ⇒ يُطبع وقته تحتها (backend-r16): السبت دخول = إغلاق الجمعة، وكاش المزوّد حتى 15د
 * — كانت تُقرأ أسعاراً حيّة. ما دونه = جلب طازج فلا ضجيج. */
const PRICE_STALE_SEC = 5 * 60;

function indicatorOpts(t: Dict) {
  return [
    { id: 'rsi', label: 'RSI' },
    { id: 'ma', label: 'MA' },
    { id: 'macd', label: 'MACD' },
    { id: 'bb', label: t.indicatorBollinger },
    { id: 'stoch', label: 'Stoch' },
    { id: 'trend', label: t.indicatorTrend },
  ];
}

// مشتقّ من ردّ `api.indicatorForecast` (QA51) كي لا يتباعد عن حقول الخادم.
type Vote = Awaited<ReturnType<typeof api.indicatorForecast>>['votes'][number];

export function IndicatorForecastPanel({ symbol, timeframe = '15m', embedded }: Props) {
  const { t, rtl, lang } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const opts = indicatorOpts(t);
  const [enabled, setEnabled] = useState(opts.map((x) => x.id));
  const [loading, setLoading] = useState(false);
  // لا نتيجة بعد (تحميل أول/خطأ/demo): لا يُعرض «محايد — لا إشارة قوية» كأنه حُسب من السوق.
  const [hasResult, setHasResult] = useState(false);
  const [direction, setDirection] = useState('neutral');
  const [avg, setAvg] = useState(0);
  const [levels, setLevels] = useState<{ entry: number; sl: number; tp: number } | null>(null);
  // لماذا لا مستويات (`levels_basis.unavailable` من الخادم): no_live_price | not_enough_candles | neutral.
  const [levelsGap, setLevelsGap] = useState<string | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [rsi, setRsi] = useState<number | null>(null);
  const [note, setNote] = useState('');
  // تنبيه الخادم برمزه (backend-r3) — يُترجم عند العرض فيتبع تبديل اللغة دون طلب جديد.
  const [disclaimer, setDisclaimer] = useState<{ code: string | null; text: string } | null>(null);
  // منازل الخادم (`price_decimals`) لأداة لا نعرف منازلها (الرموز المعروفة تبقى بمواصفتها).
  const [serverDecimals, setServerDecimals] = useState<number | null>(null);
  const [priceAsOf, setPriceAsOf] = useState<number | null>(null);

  const toggle = (id: string) => {
    setEnabled((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        return next.length ? next : prev;
      }
      return [...prev, id];
    });
  };

  // حارس "alive" مبني على ref يمنع تحديث الحالة بعد إلغاء تركيب اللوحة (تبديل قسم hub قبل
  // اكتمال الطلب) — نفس مبدأ ChartFrame/SymbolSnapshot المؤسَّس بالكود، بصيغة ref هنا لأن
  // `run` يُعاد استدعاؤها عند تغيّر المؤشرات/الرمز/الفريم لا التركيب الأول فقط.
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const clearResult = () => {
    setHasResult(false);
    setDirection('neutral');
    setAvg(0);
    setLevels(null);
    setLevelsGap(null);
    setVotes([]);
    setRsi(null);
    setDisclaimer(null);
    setServerDecimals(null);
    setPriceAsOf(null);
  };

  // رقم الطلب: ردّ طلب أقدم (رمز سابق/مؤشرات سابقة) يصل بعد الأحدث لا يكتب فوقه.
  const reqRef = useRef(0);

  const run = useCallback(async () => {
    const req = ++reqRef.current;
    setLoading(true);
    try {
      const res = await api.indicatorForecast({
        symbol,
        timeframe,
        indicators: enabled,
        // backend-r3: الأسماء والتفاصيل بالإنجليزية لـ`en*`؛ الكردي تُبنى جمله من `detail_code` هنا.
        lang,
      });
      if (!mountedRef.current || req !== reqRef.current) return;
      // demo = اتجاه ومستويات دخول/وقف/هدف من شموع مختلَقة (المزوّد متعذّر) — لا تُعرض كإشارة.
      // و`unavailable`/اتجاه null (backend-r2): لا مصدر أصلاً — الحالة نفسها لا «محايد» محسوب.
      if (res.data_kind === 'demo' || res.data_kind === 'unavailable' || res.direction == null) {
        clearResult();
        // كل غياب كان «لا بيانات حقيقية الآن — حاول لاحقاً»: DXY لا يقدّمه المزوّد أصلاً (المحاولة لن تنجح)،
        // وشموع حقيقية بلا صوت مؤشّر واحد (MACD وحده على تاريخ قصير) ليست «أسعاراً تجريبية».
        const real = res.data_kind !== 'demo' && res.data_kind !== 'unavailable';
        // backend-r54: سلسلة كاملة بلا حركة (سوق مغلق) تصل بلا اتجاه أيضاً — ليست «لا بيانات حيّة».
        setNote(
          real && res.disclaimer_code === 'not_enough_data'
            ? t.forecastDisclaimerNoData
            : real && res.disclaimer_code === 'no_movement'
              ? t.forecastDisclaimerNoMovement
              : providerUnavailableReason(res) === 'not_offered_by_provider'
              ? t.chartNotOfferedTitle.replace('{symbol}', symbol.toUpperCase())
              : t.noLiveDataResult
        );
        return;
      }
      setHasResult(true);
      setDirection(res.direction);
      setAvg(res.avg_score ?? NaN);
      setLevels(res.levels ?? null);
      const gap = (res as { levels_basis?: { unavailable?: unknown } | null }).levels_basis?.unavailable;
      setLevelsGap(typeof gap === 'string' ? gap : null);
      setVotes(Array.isArray(res.votes) ? res.votes : []);
      setRsi(typeof res.snapshot?.rsi === 'number' ? res.snapshot.rsi : null);
      setNote('');
      setDisclaimer({ code: res.disclaimer_code ?? null, text: res.disclaimer ?? '' });
      const pd = res.price_decimals;
      setServerDecimals(typeof pd === 'number' && Number.isInteger(pd) && pd >= 0 && pd <= 12 ? pd : null);
      const pa = res.price_as_of;
      setPriceAsOf(typeof pa === 'number' && Number.isFinite(pa) && pa > 0 ? pa : null);
    } catch {
      if (mountedRef.current && req === reqRef.current) {
        // كان يُبقي اتجاه/مستويات الطلب السابق (رمز آخر أحياناً) ظاهرة تحت رسالة الخطأ.
        clearResult();
        setNote(t.forecastError);
      }
    } finally {
      if (mountedRef.current && req === reqRef.current) setLoading(false);
    }
  }, [symbol, timeframe, enabled, t, lang]);

  // تبديل الرمز/الفريم: اتجاه ومستويات الرمز السابق لا تبقى ظاهرة أثناء تحميل الجديد
  // (قد يُقرأ دخول/وقف EURUSD على الذهب). يسبق تأثير `run` بالترتيب.
  useEffect(() => {
    clearResult();
    setNote('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, timeframe]);

  useEffect(() => {
    void run();
  }, [run]);

  // «السعر حتى HH:MM» يظهر لحظة تقادم السعر لا بإعادة رسم عارضة: بلا مؤقّت كان ردّ طازج يبقى بلا تنبيه
  // والدخول/الوقف/الهدف معروضة نصف ساعة ما دامت اللوحة مفتوحة. بساعة الخادم (`priceAsOf` طابعه).
  const [, setStaleBeat] = useState(0);
  useEffect(() => {
    if (priceAsOf == null) return;
    const remainMs = (priceAsOf + PRICE_STALE_SEC - serverNowSec()) * 1000;
    if (remainMs < 0) return;
    const id = setTimeout(() => setStaleBeat((n) => n + 1), remainMs + 1000);
    return () => clearTimeout(id);
  }, [priceAsOf]);

  // «ثقة 83%» كانت معادلة ثابتة (|المعدل|×0.75+0.35) تُقرأ كاحتمال نجاح — نعرض بدلها عدد المؤشرات
  // المتوافقة مع الاتجاه (قابل للتحقق من القائمة تحتها)، ونسبة الربح:المخاطرة للمستويات المقترحة.
  const agreeing = votes.filter((v) => v.direction === direction).length;
  // النصّ نفسه بلوحتي المحلّلين والإجماع (`levelsUnavailableText`) — كانت سلسلة شروط منسوخة هنا.
  const levelsWhy = levelsUnavailableText({ unavailable: levelsGap }, t);
  // الوقف والهدف كانا سعرَين فقط، والمتداول يزن الصفقة بالـpip (حجم لوته من مسافة وقفه).
  // `pipsBetween` نفسها التي تبني عليها الحاسبة؛ أداة بلا مواصفة pip تبقى بالأسعار وحدها.
  const levelSpec = levels ? chartPipSpec(symbol) : null;
  const pipsTag = (a: number, b: number) => {
    const p = levelSpec ? pipsBetween(levelSpec, a, b) : null;
    // «pips» بالإنجليزية كسطر السبريد والقياس بالشارت (كانت «12.0 pip» ثابتة)، وبلا عُشر من 1000.
    return p != null ? ` (${pipsNumber(p)} ${pipUnit(lang)})` : '';
  };
  const px = (n: number, ref: number) =>
    serverDecimals != null && symbolPriceDecimals(symbol) == null ? n.toFixed(serverDecimals) : formatPrice(n, symbol, ref);
  const noteText = disclaimer ? forecastDisclaimer(disclaimer.code, disclaimer.text, t) : note;
  const rr =
    levels && direction !== 'neutral' && Math.abs(levels.entry - levels.sl) > 0
      ? Math.abs(levels.tp - levels.entry) / Math.abs(levels.entry - levels.sl)
      : null;
  const staleAt =
    priceAsOf != null && serverNowSec() - priceAsOf > PRICE_STALE_SEC
      ? t.forecastPriceAsOf.replace('{time}', formatLocalStamp(priceAsOf, lang))
      : null;

  return (
    <View style={[styles.wrap, embedded && styles.wrapInFrame]}>
      <View style={[styles.head, rtl && styles.headRtl, embedded && frameEmbedHead]}>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.refresh,
            loading && styles.refreshDisabled,
            pressed && {
              opacity: buttons.pressedOpacity,
              transform: [{ scale: buttons.pressedScale }],
            },
          ]}
          onPress={() => void run()}
          disabled={loading}
          accessibilityState={{ disabled: loading, busy: loading }}
          accessibilityLabel={loading ? t.a11yBusy : t.forecastRunA11y}
          hitSlop={8}
        >
          <Text style={styles.refreshText}>{loading ? '...' : t.forecastRunBtn}</Text>
        </Pressable>
        <View style={embedded ? frameEmbedTitleBlock : undefined}>
          <Text style={[styles.title, embedded && frameEmbedTitle, { textAlign: align }]}>
            {t.forecastTitle}
          </Text>
          <Text
            style={[styles.sub, embedded && frameEmbedSub, { textAlign: align }]}
            accessibilityLabel={`${symbol} · ${isTimeframe(timeframe) ? t.tfLabelsA11y[timeframe] : timeframe}${
              rsi != null ? ` · RSI ${rsi.toFixed(1)}` : ''
            }`}
          >
            {symbol} · {isTimeframe(timeframe) ? t.tfLabels[timeframe] : timeframe}
            {rsi != null ? ` · RSI ${rsi.toFixed(1)}` : ''}
          </Text>
        </View>
      </View>

      <View style={[styles.chips, rtl && styles.chipsRtl]}>
        {opts.map((opt) => {
          const on = enabled.includes(opt.id);
          return (
            <Pressable
              accessibilityRole="button"
              key={opt.id}
              style={({ pressed }) => [
                styles.chip,
                on && styles.chipOn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => toggle(opt.id)}
              accessibilityLabel={`${opt.label} · ${on ? t.enabledWord : t.disabledWord}`}
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{opt.label}</Text>
              {on ? <View pointerEvents="none" style={styles.chipMark} /> : null}
            </Pressable>
          );
        })}
      </View>

      {loading ? <ActivityIndicator color={colors.accent} /> : null}

      {hasResult ? (
        <View style={styles.consensus}>
          <Text style={[styles.dir, { color: dirColor(direction), textAlign: align }]}>
            {dirLabel(direction, t)}
          </Text>
          <Text style={[styles.meta, { textAlign: align }]}>
            {votes.length ? `${t.forecastAgreeLabel} ${agreeing}/${votes.length} · ` : ''}
            {t.forecastAvgLabel} {formatScore(avg)}
          </Text>
          {levels && direction !== 'neutral' ? (
            <>
              <Text style={[styles.levels, { textAlign: align }]}>
                {/* منازل واحدة للثلاثة من الدخول (أداة بلا مواصفة كـUSOIL): كانت كلٌّ من حجمه ⇒ «99.850 · 100.45» */}
                {t.forecastTradeLabel}: {t.entryLabel} {px(levels.entry, levels.entry)} · {t.slLabel}{' '}
                {px(levels.sl, levels.entry)}
                {pipsTag(levels.entry, levels.sl)} · {t.tpLabel} {px(levels.tp, levels.entry)}
                {pipsTag(levels.entry, levels.tp)}
                {rr != null ? ` · R:R ${formatRR(rr)}` : ''}
              </Text>
              {staleAt ? <Text style={[styles.asOf, { textAlign: align }]}>{staleAt}</Text> : null}
            </>
          ) : direction === 'neutral' ? (
            <Text style={[styles.levels, { textAlign: align }]}>{t.forecastNoSignal}</Text>
          ) : levelsWhy ? (
            // «لا اتجاه غالب» تحت «شراء» كانت تناقض نفسها حين غابت المستويات لسبب آخر (لا سعر حيّ، شموع أقلّ
            // من ATR14) — السبب كما قاله الخادم، و«لا اتجاه غالب» للمحايد فقط. سبب لا نعرفه ⇒ لا سطر، لا «لا اتجاه
            // غالب» تحت «بيع».
            <Text style={[styles.levels, { textAlign: align }]}>{levelsWhy}</Text>
          ) : null}
        </View>
      ) : null}

      <ScrollView style={styles.list} nestedScrollEnabled>
        {votes.map((v) => (
          <View key={v.id} style={[styles.row, rtl && styles.rowRtl]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { textAlign: align }]}>{forecastVoteName(v, t)}</Text>
              <Text style={[styles.summary, { textAlign: align }]}>{forecastVoteDetail(v, t)}</Text>
            </View>
            <Text style={[styles.badge, { color: dirColor(v.direction) }]}>
              {dirLabel(v.direction, t)}
            </Text>
          </View>
        ))}
      </ScrollView>
      {noteText ? <Text style={[styles.note, { textAlign: align }]}>{noteText}</Text> : null}
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
    padding: spacing.md,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  wrapInFrame: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingTop: frameEmbed.padTop,
    paddingLeft: frameEmbed.padLeft,
    paddingRight: frameEmbed.padRight,
    paddingBottom: frameEmbed.padBottom,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headRtl: { flexDirection: 'row-reverse' },
  title: { color: colors.text, fontWeight: '500', fontSize: 13 },
  sub: { ...numeric, color: colors.textDim, fontSize: 11, marginTop: 4 },
  refresh: {
    flexShrink: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
    borderWidth: 1,
    // DESIGN-PRO §1: زرّ غير نشِط بلا تأكيد — التأكيد للمختار وحده (الرقاقة/الرمز)، لا لحدّ زرّ بالسكون.
    borderColor: colors.border,
  },
  refreshDisabled: { opacity: 0.4 },
  refreshText: { color: colors.textMuted, fontWeight: '500', fontSize: 11 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipsRtl: { flexDirection: 'row-reverse' },
  // كانت ~28pt بفجوة 6 ⇒ تبديل الجار بالخطأ؛ 44pt (حدّ اللمس بالهاتف، DESIGN-PRO §3) + فجوة 8
  // (لا hitSlop: يتراكب بين الشرائح).
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // DESIGN-PRO §1/§4: عدّة مؤشّرات مفعَّلة معاً ⇒ كانت كلّها حدّاً وتعبئة ونصّاً بلون التأكيد وقت السكون.
  // الآن كالشارت: تعبئة محايدة + علامة 2px محايدة بالأسفل + نصّ أساسي — الاختيار لا يُقال باللون وحده.
  chipOn: { backgroundColor: colors.selectedFill },
  chipMark: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 0,
    height: selectedMarkerWidth,
    backgroundColor: colors.text,
  },
  chipText: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },
  chipTextOn: { color: colors.text },
  consensus: {
    backgroundColor: colors.bgPanel,
    borderRadius: radii.sm,
    padding: 12,
    gap: 4,
  },
  // DESIGN-PRO §1/§2: 18px محجوز لآخر سعر وقيمة التقاطع — كلمة «شراء/بيع» بلون الاتجاه بذلك الحجم كانت
  // أعلى صوتاً من الشارت ⇒ 15 (سلّم قراءات السعر). والصندوق خلفية وحدها بلا حدّ (§5.5 فاصل واحد).
  dir: { fontWeight: '500', fontSize: 15 },
  meta: { ...numeric, color: colors.textMuted, fontSize: 11 },
  levels: { ...numeric, color: colors.text, fontSize: 11, fontWeight: '600', marginTop: 4 },
  // DESIGN-PRO §2 — 11px؛ وقت البيانات رقم متغيّر ⇒ `numeric`.
  asOf: { ...numeric, color: colors.warn, fontSize: 11 },
  list: { maxHeight: 120 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft,
  },
  rowRtl: { flexDirection: 'row-reverse' },
  name: { color: colors.text, fontWeight: '500', fontSize: 12 },
  summary: { color: colors.textDim, fontSize: 11, marginTop: 0 },
  badge: { fontWeight: '500', fontSize: 12 },
  note: { color: colors.textDim, fontSize: 11 },
});
