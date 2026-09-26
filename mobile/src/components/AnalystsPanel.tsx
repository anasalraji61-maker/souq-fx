import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { colors, radii, spacing, frameEmbed, frameEmbedHead, frameEmbedTitleBlock, frameEmbedTitle, frameEmbedSub, buttons, numeric } from '../theme';
import { api } from '../api';
import { dirColor, dirLabel, formatScore, levelsUnavailableText } from './signalDirection';
import { formatPrice } from '../chart/math';
import { useI18n } from '../i18n/I18nContext';

type Props = { symbol: string; timeframe?: string; embedded?: boolean };

type AnalystRow = {
  id: string;
  name: string;
  house: string;
  direction: string;
  score: number;
  target: number | null;
  horizon: string;
  summary: string;
};

export function AnalystsPanel({ symbol, timeframe = '15m', embedded }: Props) {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState('neutral');
  const [avg, setAvg] = useState(0);
  const [levels, setLevels] = useState<{ entry: number; sl: number; tp: number } | null>(null);
  const [rows, setRows] = useState<AnalystRow[]>([]);
  const [note, setNote] = useState('');
  const [levelsWhy, setLevelsWhy] = useState<string | null>(null);
  /** backend-r2: لا مصدر مرخَّص ⇒ `status: 'unavailable'`، `direction`/`avg_score` null — لا يُعرض «محايد» كرأي. */
  const [unavailable, setUnavailable] = useState(false);

  // حارس "alive" مبني على ref يمنع تحديث الحالة بعد إلغاء تركيب اللوحة (تبديل قسم hub قبل
  // اكتمال الطلب) — نفس مبدأ ChartFrame/SymbolSnapshot المؤسَّس بالكود، بصيغة ref هنا لأن
  // `load` يُعاد استدعاؤها عند تغيّر symbol/timeframe لا التركيب الأول فقط.
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // النتيجة تُعرض لرمزها وفريمها فقط: تبديل EURUSD → XAUUSD كان يُبقي اتجاه EURUSD ومحلّليه ومستوياته
  // (~1.08 مطبوعة بمنازل الذهب) تحت عنوان XAUUSD حتى يصل الردّ الجديد — وإلى الأبد إن وصل ردّ EURUSD
  // الأبطأ أخيراً. `reqRef` يُسقط الردود المتأخرة، و`loadedKey` يُخفي نتيجة رمز سابق أثناء التحميل.
  const reqRef = useRef(0);
  const key = `${symbol}|${timeframe}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    const id = ++reqRef.current;
    const forKey = `${symbol}|${timeframe}`;
    setLoading(true);
    try {
      const res = await api.analystsForecast(symbol, timeframe);
      if (!mountedRef.current || id !== reqRef.current) return;
      setLoadedKey(forKey);
      // كان `avg_score: null` يرمي عند `toFixed` فتسقط الشاشة كلّها إلى «حدث خطأ» (launch103).
      if (res.status === 'unavailable' || res.data_kind === 'unavailable' || res.direction == null) {
        setUnavailable(true);
        setDirection('neutral');
        setAvg(0);
        setLevels(null);
        setLevelsWhy(null);
        setRows([]);
        setNote('');
        return;
      }
      setUnavailable(false);
      setDirection(res.direction);
      setAvg(res.avg_score ?? NaN);
      setLevels(res.levels);
      setLevelsWhy(levelsUnavailableText(res.levels_basis, t));
      setRows(Array.isArray(res.analysts) ? res.analysts : []);
      setNote(res.disclaimer);
    } catch {
      if (mountedRef.current && id === reqRef.current) {
        setLoadedKey(forKey);
        setUnavailable(false);
        setRows([]);
        setLevels(null);
        setLevelsWhy(null);
        setNote(t.analystsLoadError);
      }
    } finally {
      if (mountedRef.current && id === reqRef.current) setLoading(false);
    }
  }, [symbol, timeframe, t]);

  const fresh = loadedKey === key;
  const shownRows = fresh ? rows : [];

  useEffect(() => {
    void load();
  }, [load]);

  const split = { buy: 0, sell: 0, neutral: 0 };
  for (const a of shownRows) {
    if (a.direction === 'buy') split.buy += 1;
    else if (a.direction === 'sell') split.sell += 1;
    else split.neutral += 1;
  }
  // chart-r70: مرجع منازل واحد للوحة كلها — بدونه رمز بلا منازل معروفة (النفط) يطبع كل رقم بمنازل حجمه
  // («99.950 | 100.45»). الدخول إن وُجد، وإلا أول هدف.
  const priceRef =
    levels?.entry ?? shownRows.find((a) => typeof a.target === 'number' && Number.isFinite(a.target))?.target ?? null;

  return (
    <View style={[styles.wrap, embedded && styles.wrapInFrame]}>
      <View style={[styles.head, rtl && styles.headRtl, embedded && frameEmbedHead]}>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.refresh,
            pressed && {
              opacity: buttons.pressedOpacity,
              transform: [{ scale: buttons.pressedScale }],
            },
          ]}
          onPress={() => void load()}
          accessibilityLabel={t.analystsRefreshA11y}
          hitSlop={8}
        >
          <Text style={styles.refreshText}>{t.refreshBtn}</Text>
        </Pressable>
        <View style={embedded ? frameEmbedTitleBlock : undefined}>
          <Text style={[styles.title, embedded && frameEmbedTitle, { textAlign: align }]}>
            {t.analystsTitle}
          </Text>
          <Text style={[styles.sub, embedded && frameEmbedSub, { textAlign: align }]}>
            {symbol} · {t.analystsSubSuffix}
          </Text>
        </View>
      </View>

      {loading ? <ActivityIndicator color={colors.accent} /> : null}

      {fresh && unavailable ? (
        <View style={styles.consensus}>
          <Text style={[styles.meta, { textAlign: align }]}>{t.analystsUnavailable}</Text>
        </View>
      ) : shownRows.length ? (
        <View style={styles.consensus}>
          <Text style={[styles.dir, { color: dirColor(direction), textAlign: align }]}>
            {dirLabel(direction, t)}
          </Text>
          {/* «درجة الاتفاق n%» أُزيلت: معادلة ثابتة بالخادم (|avg|×0.75+0.35، `signal_hub.py`) تُقرأ
              كاحتمال نجاح — كما أزالها `IndicatorForecastPanel`. عدّ الآراء بدلها: رقم لا يُختلَق. */}
          <Text style={[styles.meta, { textAlign: align }]}>
            {t.dirBuy} {split.buy} · {t.dirSell} {split.sell} · {t.dirNeutral} {split.neutral} · {t.avgLabel}{' '}
            {formatScore(avg)}
          </Text>
          {/* محايد ⇒ الخادم يعيد دخول = وقف = هدف: لا مستويات تُطبع لصفقة غير موجودة. */}
          {levels && direction !== 'neutral' ? (
            <Text style={[styles.levels, { textAlign: align }]}>
              {t.entryLabel} {formatPrice(levels.entry, symbol, priceRef)} · {t.slLabel} {formatPrice(levels.sl, symbol, priceRef)}{' '}
              · {t.tpLabel} {formatPrice(levels.tp, symbol, priceRef)}
            </Text>
          ) : direction === 'neutral' || levelsWhy ? (
            <Text style={[styles.levels, { textAlign: align }]}>{levelsWhy ?? t.socialNoClearTrade}</Text>
          ) : null /* شراء/بيع بلا مستويات لسبب لا نعرفه: «الآراء متضاربة أو محايدة» كانت تناقض الاتجاه (backend-r37) */}
        </View>
      ) : null}

      <ScrollView style={styles.list} nestedScrollEnabled>
        {shownRows.map((a) => (
          <View key={a.id} style={[styles.row, rtl && styles.rowRtl]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { textAlign: align }]}>{a.name}</Text>
              <Text style={[styles.summary, { textAlign: align }]}>{a.summary}</Text>
            </View>
            <View style={styles.right}>
              <Text style={[styles.badge, { color: dirColor(a.direction) }]}>
                {dirLabel(a.direction, t)}
              </Text>
              {/* backend-r1: `target` null حين لا مستويات — لا «هدف null» ولا رقم مصطنع */}
              {typeof a.target === 'number' && Number.isFinite(a.target) ? (
                <Text style={styles.target}>
                  {t.tpLabel} {formatPrice(a.target, symbol, priceRef)}
                </Text>
              ) : null}
              <Text style={styles.horizon}>{a.horizon}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      {fresh && note ? <Text style={[styles.note, { textAlign: align }]}>{note}</Text> : null}
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
  title: { color: colors.text, fontWeight: '500', fontSize: 14 },
  sub: { color: colors.textDim, fontSize: 11, marginTop: 4 },
  refresh: {
    flexShrink: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
    borderWidth: 1,
    // DESIGN-PRO §1: زرّ غير نشِط بلا تأكيد — التأكيد للمختار وحده (الرقاقة/الرمز)، لا لحدّ زرّ بالسكون.
    borderColor: colors.border,
  },
  refreshText: { color: colors.textMuted, fontWeight: '500', fontSize: 11 },
  consensus: {
    backgroundColor: colors.bgPanel,
    borderRadius: radii.sm,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    gap: spacing.xs,
  },
  dir: { fontWeight: '500', fontSize: 18 },
  meta: { ...numeric, color: colors.textMuted, fontSize: 11 },
  levels: { ...numeric, color: colors.text, fontSize: 11, fontWeight: '500' },
  list: { maxHeight: 120, flexGrow: 0 },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft,
  },
  rowRtl: { flexDirection: 'row-reverse' },
  name: { color: colors.text, fontWeight: '500', fontSize: 12 },
  summary: { color: colors.textDim, fontSize: 11, marginTop: 4 },
  right: { alignItems: 'flex-start', minWidth: 72 },
  badge: { fontWeight: '500', fontSize: 12 },
  target: { ...numeric, color: colors.textMuted, fontSize: 11 },
  horizon: { color: colors.textDim, fontSize: 11 },
  note: { color: colors.textDim, fontSize: 11, marginTop: spacing.xs },
});
