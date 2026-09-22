import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { colors, radii, spacing, frameEmbed, frameEmbedHead, frameEmbedTitleBlock, frameEmbedTitle, frameEmbedSub, buttons } from '../theme';
import { api } from '../api';
import { formatPrice } from '../chart/math';
import { formatRR } from '../tradePlan';
import { useI18n } from '../i18n/I18nContext';
import type { Dict } from '../i18n/locales';

type Props = { symbol: string; timeframe?: string; embedded?: boolean };

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

type Vote = {
  id: string;
  name: string;
  direction: string;
  score: number;
  detail: string;
};

function dirColor(d: string) {
  if (d === 'buy') return colors.bull;
  if (d === 'sell') return colors.bear;
  return colors.textMuted;
}

function dirLabel(d: string, t: Dict) {
  if (d === 'buy') return t.dirBuy;
  if (d === 'sell') return t.dirSell;
  return t.dirNeutral;
}

export function IndicatorForecastPanel({ symbol, timeframe = '15m', embedded }: Props) {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const opts = indicatorOpts(t);
  const [enabled, setEnabled] = useState(opts.map((x) => x.id));
  const [loading, setLoading] = useState(false);
  // لا نتيجة بعد (تحميل أول/خطأ/demo): لا يُعرض «محايد — لا إشارة قوية» كأنه حُسب من السوق.
  const [hasResult, setHasResult] = useState(false);
  const [direction, setDirection] = useState('neutral');
  const [avg, setAvg] = useState(0);
  const [levels, setLevels] = useState<{ entry: number; sl: number; tp: number } | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [rsi, setRsi] = useState<number | null>(null);
  const [note, setNote] = useState('');

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
    setVotes([]);
    setRsi(null);
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
      });
      if (!mountedRef.current || req !== reqRef.current) return;
      // demo = اتجاه ومستويات دخول/وقف/هدف من شموع مختلَقة (المزوّد متعذّر) — لا تُعرض كإشارة.
      if (res.data_kind === 'demo') {
        clearResult();
        setNote(t.noLiveDataResult);
        return;
      }
      setHasResult(true);
      setDirection(res.direction);
      setAvg(res.avg_score);
      setLevels(res.levels);
      setVotes(res.votes);
      setRsi(typeof res.snapshot?.rsi === 'number' ? res.snapshot.rsi : null);
      setNote(res.disclaimer);
    } catch {
      if (mountedRef.current && req === reqRef.current) {
        // كان يُبقي اتجاه/مستويات الطلب السابق (رمز آخر أحياناً) ظاهرة تحت رسالة الخطأ.
        clearResult();
        setNote(t.forecastError);
      }
    } finally {
      if (mountedRef.current && req === reqRef.current) setLoading(false);
    }
  }, [symbol, timeframe, enabled, t.forecastError, t.noLiveDataResult]);

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

  // «ثقة 83%» كانت معادلة ثابتة (|المعدل|×0.75+0.35) تُقرأ كاحتمال نجاح — نعرض بدلها عدد المؤشرات
  // المتوافقة مع الاتجاه (قابل للتحقق من القائمة تحتها)، ونسبة الربح:المخاطرة للمستويات المقترحة.
  const agreeing = votes.filter((v) => v.direction === direction).length;
  const rr =
    levels && direction !== 'neutral' && Math.abs(levels.entry - levels.sl) > 0
      ? Math.abs(levels.tp - levels.entry) / Math.abs(levels.entry - levels.sl)
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
          accessibilityState={{ disabled: loading }}
          accessibilityLabel={t.forecastRunA11y}
          hitSlop={8}
        >
          <Text style={styles.refreshText}>{loading ? '...' : t.forecastRunBtn}</Text>
        </Pressable>
        <View style={embedded ? frameEmbedTitleBlock : undefined}>
          <Text style={[styles.title, embedded && frameEmbedTitle, { textAlign: align }]}>
            {t.forecastTitle}
          </Text>
          <Text style={[styles.sub, embedded && frameEmbedSub, { textAlign: align }]}>
            {symbol} · {timeframe}
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
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{opt.label}</Text>
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
            {t.forecastAvgLabel} {avg >= 0 ? '+' : ''}
            {avg.toFixed(2)}
          </Text>
          {levels && direction !== 'neutral' ? (
            <Text style={[styles.levels, { textAlign: align }]}>
              {t.forecastTradeLabel}: {t.entryLabel} {formatPrice(levels.entry, symbol)} · {t.slLabel}{' '}
              {formatPrice(levels.sl, symbol)} · {t.tpLabel} {formatPrice(levels.tp, symbol)}
              {rr != null ? ` · R:R ${formatRR(rr)}` : ''}
            </Text>
          ) : (
            <Text style={[styles.levels, { textAlign: align }]}>{t.forecastNoSignal}</Text>
          )}
        </View>
      ) : null}

      <ScrollView style={styles.list} nestedScrollEnabled>
        {votes.map((v) => (
          <View key={v.id} style={[styles.row, rtl && styles.rowRtl]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { textAlign: align }]}>{v.name}</Text>
              <Text style={[styles.summary, { textAlign: align }]}>{v.detail}</Text>
            </View>
            <Text style={[styles.badge, { color: dirColor(v.direction) }]}>
              {dirLabel(v.direction, t)}
            </Text>
          </View>
        ))}
      </ScrollView>
      {note ? <Text style={[styles.note, { textAlign: align }]}>{note}</Text> : null}
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
  title: { color: colors.text, fontWeight: '900', fontSize: 14 },
  sub: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  refresh: {
    flexShrink: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  refreshDisabled: { opacity: 0.4 },
  refreshText: { color: colors.accent, fontWeight: '700', fontSize: 11 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chipsRtl: { flexDirection: 'row-reverse' },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPanel,
  },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  chipText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  chipTextOn: { color: colors.accent },
  consensus: {
    backgroundColor: colors.bgPanel,
    borderRadius: radii.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    gap: 3,
  },
  dir: { fontWeight: '900', fontSize: 18 },
  meta: { color: colors.textMuted, fontSize: 11 },
  levels: { color: colors.text, fontSize: 11, fontWeight: '700', marginTop: 2 },
  list: { maxHeight: 120 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft,
  },
  rowRtl: { flexDirection: 'row-reverse' },
  name: { color: colors.text, fontWeight: '800', fontSize: 12 },
  summary: { color: colors.textDim, fontSize: 10, marginTop: 1 },
  badge: { fontWeight: '900', fontSize: 12 },
  note: { color: colors.textDim, fontSize: 9 },
});
