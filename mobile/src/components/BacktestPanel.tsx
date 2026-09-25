import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { colors, radii, spacing, buttons, numeric } from '../theme';
import { api } from '../api';
import { playSoftClick } from '../audio/playSoftClick';
import { TimeframeBar } from './TimeframeBar';
import { type Timeframe } from '../timeframes';
import { useI18n } from '../i18n/I18nContext';
import { formatPrice } from '../chart/math';
import { QUICK_SYMBOLS, journalWinRateLine } from '../tradePlan';

type Stats = {
  trade_count: number;
  /** null = لا صفقة حاسمة (كلّها تعادل) — backend-r7؛ خادم أقدم يرسل 0 فيُكشف بـ`breakeven_count`. */
  win_rate: number | null;
  total_return_pct: number;
  final_equity: number;
  /** null = لا صفقة رابحة/خاسرة (backend-r15a) — كان 0 فيُقرأ «متوسّط الربح 0%». */
  avg_win_pct?: number | null;
  avg_loss_pct?: number | null;
  max_drawdown_pct?: number;
  /** سبريد تقديري مخصوم من كل صفقة (باك-إند أحدث)؛ null = ليس زوجاً قابلاً للتداول (DXY). */
  spread_pips?: number | null;
  /** false = لا تقدير سبريد للرمز (DXY، الرقمية) ⇒ النتيجة قبل التكاليف (backend-r3)؛ غائب = باك-إند أقدم */
  costs_included?: boolean;
  /** صفقات خرجت عند الدخول — لا ربح ولا خسارة، خارج `win_rate` (backend-r5)؛ غائب = باك-إند أقدم */
  breakeven_count?: number;
  /** ربح/خسارة المركز المفتوح بآخر شمعة — خارج كل ما سبق (backend-r10 أ)؛ null = لا مركز، غائب = باك-إند أقدم */
  open_pnl_pct?: number | null;
};

type Strategy = 'ma_cross' | 'rsi_reversal' | 'macd_cross' | 'bb_bounce';

type Props = {
  defaultSymbol?: string;
  defaultTimeframe?: Timeframe;
};

/** التسمية مفتاح قاموس لا نصّ إنجليزي: رمز المؤشّر (MA/RSI/MACD/BB) يبقى لاتينياً كما يعرفه المتداول،
 * والفعل (تقاطع/انعكاس/ارتداد) يُترجَم. */
type StrategyLabelKey =
  | 'backtestStratMaCross'
  | 'backtestStratRsi'
  | 'backtestStratMacd'
  | 'backtestStratBb';

const STRATEGIES: { id: Strategy; labelKey: StrategyLabelKey }[] = [
  { id: 'ma_cross', labelKey: 'backtestStratMaCross' },
  { id: 'rsi_reversal', labelKey: 'backtestStratRsi' },
  { id: 'macd_cross', labelKey: 'backtestStratMacd' },
  { id: 'bb_bounce', labelKey: 'backtestStratBb' },
];

/** نفس قائمة الأزواج السريعة بحاسبة المخاطرة والدفتر — اختبار زوج شائع بنقرة بيد واحدة بدل الكتابة. */

export function BacktestPanel({ defaultSymbol = 'EURUSD', defaultTimeframe = '15m' }: Props) {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [tf, setTf] = useState<Timeframe>(defaultTimeframe);
  const [strategy, setStrategy] = useState<Strategy>('ma_cross');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [trades, setTrades] = useState<
    { side: string; entry: number; exit: number; pnl_pct: number; open?: boolean }[]
  >([]);
  const [equity, setEquity] = useState<{ i: number; equity: number }[]>([]);
  /** وضوح الحالة: يعلم المستخدم إذا فشل تشغيل الاختبار الخلفي بدل صمت كامل (نتائج فارغة كأنه لا صفقات) */
  const [error, setError] = useState<string | null>(null);
  /** لأي رمز·فريم·استراتيجية حُسبت النتيجة الظاهرة — تُعرض فوقها كي لا تُقرأ لاختيار آخر. */
  const [ranFor, setRanFor] = useState<string | null>(null);
  /** رمز التشغيل الظاهر — لازم لتنسيق أسعار الصفقات بمنازل الأداة (الين 3 منازل لا 5). */
  const [ranSymbol, setRanSymbol] = useState<string | null>(null);

  useEffect(() => {
    setSymbol(defaultSymbol);
    setTf(defaultTimeframe);
  }, [defaultSymbol, defaultTimeframe]);

  // تغيير الرمز/الفريم/الاستراتيجية: نتيجة التشغيل السابق لم تعد تصف الاختيار الظاهر — كانت نسبة نجاح
  // MA Cross على EURUSD تبقى تحت «RSI» و«XAUUSD» كأنها نتيجتهما.
  useEffect(() => {
    setStats(null);
    setTrades([]);
    setEquity([]);
    setError(null);
    setRanFor(null);
    setRanSymbol(null);
  }, [symbol, tf, strategy]);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.backtest({
        symbol: symbol.trim().toUpperCase(),
        timeframe: tf,
        strategy,
      });
      // مسار بذري مختلَق (المزوّد متعذّر): نسبة الربح والعائد عليه ليست أداء الاستراتيجية.
      if (res.data_kind === 'demo') {
        setStats(null);
        setTrades([]);
        setEquity([]);
        setError(t.noLiveDataResult);
        return;
      }
      const key = STRATEGIES.find((s) => s.id === strategy)?.labelKey;
      const label = key ? t[key] : strategy;
      setRanFor(`${symbol.trim().toUpperCase()} · ${tf} · ${label}`);
      setRanSymbol(symbol.trim().toUpperCase());
      setStats(res.stats as Stats);
      setTrades(res.trades ?? []);
      setEquity(res.equity_curve ?? []);
      playSoftClick();
    } catch {
      setStats(null);
      setTrades([]);
      setEquity([]);
      setError(t.backtestRunError);
    } finally {
      setLoading(false);
    }
  };

  const maxEq = Math.max(...equity.map((e) => e.equity), 100);
  const minEq = Math.min(...equity.map((e) => e.equity), 100);

  // المركز المفتوح آخر صفّ بقائمة محدودة الارتفاع ⇒ قد لا يُرى؛ سطر بجانب الإحصاء (التي لا تشمله).
  const openTrade = trades.find((x) => x.open);
  const openLine =
    stats && typeof stats.open_pnl_pct === 'number' && openTrade
      ? `${openTrade.side === 'short' || openTrade.side === 'sell' ? t.dirSell : t.dirBuy} ${t.journalOpenSuffix}: ${
          stats.open_pnl_pct >= 0 ? '+' : ''
        }${stats.open_pnl_pct}%`
      : null;
  // كل طرف يُعرض وحده حين الآخر null (launch114)؛ كلاهما null ⇒ لا سطر
  const avgWin = typeof stats?.avg_win_pct === 'number' ? stats.avg_win_pct : null;
  const avgLoss = typeof stats?.avg_loss_pct === 'number' ? stats.avg_loss_pct : null;
  const avgWinLossLine =
    avgWin != null && avgLoss != null
      ? t.backtestStatAvgWinLoss.replace('{win}', String(avgWin)).replace('{loss}', String(avgLoss))
      : avgWin != null
        ? t.backtestStatAvgWin.replace('{win}', String(avgWin))
        : avgLoss != null
          ? t.backtestStatAvgLoss.replace('{loss}', String(avgLoss))
          : null;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { textAlign: align }]}>{t.backtestTitle}</Text>
      <Text style={[styles.sub, { textAlign: align }]}>{t.backtestSub}</Text>
      <View style={[styles.row, rtl && styles.rowRtl]}>
        {QUICK_SYMBOLS.map((q) => {
          const on = symbol.trim().toUpperCase() === q;
          return (
            <Pressable
              key={q}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={({ pressed }) => [
                styles.chip,
                on && styles.chipOn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => setSymbol(q)}
              accessibilityLabel={`${t.backtestSymbolA11y}: ${q}`}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{q}</Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        style={[styles.input, { textAlign: align }]}
        value={symbol}
        onChangeText={setSymbol}
        placeholder="EURUSD"
        placeholderTextColor={colors.textDim}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="done"
        underlineColorAndroid="transparent"
        clearButtonMode="while-editing"
        keyboardAppearance="dark"
        selectionColor={colors.accent}
        accessibilityLabel={t.backtestSymbolA11y}
      />
      <TimeframeBar value={tf} onChange={setTf} />
      <View style={[styles.row, rtl && styles.rowRtl]}>
        {STRATEGIES.map((s) => (
          <Pressable
            accessibilityState={{ selected: strategy === s.id }}
            accessibilityRole="button"
            key={s.id}
            style={({ pressed }) => [
              styles.chip,
              strategy === s.id && styles.chipOn,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={() => setStrategy(s.id)}
            accessibilityLabel={`${t.backtestStrategyA11yPrefix}: ${t[s.labelKey]}`}
          >
            <Text style={[styles.chipText, strategy === s.id && styles.chipTextOn]}>
              {t[s.labelKey]}
            </Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.btn,
          loading && styles.btnDisabled,
          pressed && {
            opacity: buttons.pressedOpacity,
            transform: [{ scale: buttons.pressedScale }],
          },
        ]}
        onPress={run}
        disabled={loading}
        accessibilityState={{ disabled: loading }}
        accessibilityLabel={t.backtestRunA11y}
        hitSlop={8}
      >
        <Text style={styles.btnText}>{loading ? '...' : t.backtestRunBtn}</Text>
      </Pressable>
      {loading ? <ActivityIndicator color={colors.accent} /> : null}
      {error ? <Text style={[styles.error, { textAlign: align }]}>{error}</Text> : null}
      {stats ? (
        <View style={styles.stats}>
          {ranFor ? <Text style={[styles.ranFor, { textAlign: align }]}>{ranFor}</Text> : null}
          <Text style={[styles.statLine, { textAlign: align }]}>
            {t.backtestStatTrades.replace('{n}', String(stats.trade_count))}
          </Text>
          {stats.trade_count === 0 ? (
            <Text style={[styles.sampleWarn, { textAlign: align }]}>{t.backtestNoTrades}</Text>
          ) : null}
          {stats.trade_count > 0 && stats.trade_count < 30 ? (
            <Text style={[styles.sampleWarn, { textAlign: align }]}>
              {t.backtestSmallSample.replace('{n}', String(stats.trade_count))}
            </Text>
          ) : null}
          {stats.trade_count > 0 && stats.costs_included === false ? (
            <Text style={[styles.sampleWarn, { textAlign: align }]}>{t.backtestBeforeCosts}</Text>
          ) : null}
          {stats.trade_count > 0 ? (
            <>
              <Text style={[styles.statLine, { textAlign: align }]}>
                {/* tools71: كل الصفقات خرجت عند الدخول ⇒ «—» لا «0%» (تُقرأ «خسر كل صفقاته»). الدالة تفحص مجموع
                    الحاسمة فقط، فتُمرَّر كلّها بخانة win_count. */}
                {journalWinRateLine(t.backtestStatWinRate, {
                  win_rate: stats.win_rate,
                  win_count: stats.trade_count - (stats.breakeven_count ?? 0),
                  loss_count: 0,
                })}
              </Text>
              {typeof stats.breakeven_count === 'number' && stats.breakeven_count > 0 ? (
                <Text style={[styles.statLine, { textAlign: align }]}>
                  {t.journalStatBreakeven.replace('{n}', String(stats.breakeven_count))}
                </Text>
              ) : null}
              <Text style={[styles.statLine, { textAlign: align }]}>
                {t.backtestStatReturn.replace('{pct}', String(stats.total_return_pct))}
              </Text>
              <Text style={[styles.statLine, { textAlign: align }]}>
                {t.backtestStatEquity.replace('{v}', String(stats.final_equity))}
              </Text>
              {stats.max_drawdown_pct != null ? (
                <Text style={[styles.statLine, { textAlign: align }]}>
                  {t.backtestStatDrawdown.replace('{pct}', String(stats.max_drawdown_pct))}
                </Text>
              ) : null}
              {avgWinLossLine ? (
                <Text style={[styles.statLine, { textAlign: align }]}>{avgWinLossLine}</Text>
              ) : null}
              {typeof stats.spread_pips === 'number' && stats.spread_pips > 0 ? (
                <Text style={[styles.ranFor, { textAlign: align }]}>
                  {t.backtestSpreadNote.replace('{pips}', String(stats.spread_pips))}
                </Text>
              ) : null}
            </>
          ) : null}
          {openLine ? <Text style={[styles.statLine, { textAlign: align }]}>{openLine}</Text> : null}
        </View>
      ) : null}
      {equity.length > 1 ? (
        <View style={styles.curve}>
          <Text style={[styles.curveTitle, { textAlign: align }]}>{t.backtestEquityTitle}</Text>
          <View style={styles.curveRow}>
            {equity.map((e) => {
              const span = maxEq - minEq || 1;
              const h = 8 + ((e.equity - minEq) / span) * 40;
              return (
                <View
                  key={e.i}
                  style={{
                    flex: 1,
                    height: h,
                    marginTop: 48 - h,
                    backgroundColor: e.equity >= 100 ? colors.bull : colors.bear,
                    opacity: 0.75,
                    marginHorizontal: 0.5,
                    borderRadius: 1,
                  }}
                />
              );
            })}
          </View>
        </View>
      ) : null}
      <ScrollView style={{ maxHeight: 180 }}>
        {trades.map((tr, i) => {
          const isSell = tr.side === 'short' || tr.side === 'sell';
          const sym = ranSymbol ?? undefined;
          return (
            <Text key={i} style={[styles.trade, { textAlign: align }]}>
              <Text style={{ color: isSell ? colors.bear : colors.bull, fontWeight: '500' }}>
                {isSell ? t.dirSell : t.dirBuy}
              </Text>{' '}
              {/* backend-r10 (أ): المركز الباقي بآخر شمعة لم يُغلق — `exit` آخر إغلاق لا خروج، والنسبة غير محقّقة
                  وخارج الإحصاء أعلاه ⇒ «(مفتوحة)» كالدفتر بدل «→ سعر» يُقرأ صفقةً منتهية. */}
              {formatPrice(tr.entry, sym)}
              {tr.open ? ` ${t.journalOpenSuffix}` : ` → ${formatPrice(tr.exit, sym)}`} ·{' '}
              <Text style={{ color: tr.pnl_pct >= 0 ? colors.bull : colors.bear }}>
                {tr.pnl_pct >= 0 ? '+' : ''}
                {tr.pnl_pct}%
              </Text>
            </Text>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: { color: colors.text, fontWeight: '500', textAlign: 'right', fontSize: 16 },
  sub: { color: colors.textDim, textAlign: 'right', fontSize: 11 },
  input: {
    backgroundColor: colors.bgPanel,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: 10,
    textAlign: 'right',
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rowRtl: { flexDirection: 'row-reverse' },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  chipText: { color: colors.textMuted, fontWeight: '500', fontSize: 11 },
  chipTextOn: { color: colors.accent },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    shadowColor: buttons.shadowColor,
    shadowOpacity: buttons.shadowOpacity,
    shadowRadius: buttons.shadowRadius,
    shadowOffset: { width: 0, height: buttons.shadowOffsetY },
    elevation: buttons.elevation,
  },
  btnText: { color: colors.onAccent, fontWeight: '500' },
  btnDisabled: { opacity: 0.4 },
  error: {
    color: colors.bear,
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  stats: { gap: spacing.xs, marginTop: spacing.sm },
  statLine: { ...numeric, color: colors.text, textAlign: 'right', fontWeight: '600' },
  ranFor: { ...numeric, color: colors.textMuted, fontSize: 11, fontWeight: '500' },
  sampleWarn: { ...numeric, color: colors.warn, fontSize: 11, fontWeight: '500' },
  curve: { marginTop: 6, gap: spacing.xs },
  curveTitle: { color: colors.textMuted, fontSize: 11, fontWeight: '500', textAlign: 'right' },
  curveRow: { flexDirection: 'row', height: 48, alignItems: 'flex-end' },
  trade: { ...numeric, color: colors.textDim, textAlign: 'right', fontSize: 11, marginTop: spacing.xs },
});
