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
import { colors, radii, spacing, buttons } from '../theme';
import { api } from '../api';
import { playSoftClick } from '../audio/playSoftClick';
import { TimeframeBar } from './TimeframeBar';
import { type Timeframe } from '../timeframes';
import { useI18n } from '../i18n/I18nContext';
import { formatPrice } from '../chart/math';

type Stats = {
  trade_count: number;
  win_rate: number;
  total_return_pct: number;
  final_equity: number;
  avg_win_pct?: number;
  avg_loss_pct?: number;
  max_drawdown_pct?: number;
  /** سبريد تقديري مخصوم من كل صفقة (باك-إند أحدث)؛ null = ليس زوجاً قابلاً للتداول (DXY). */
  spread_pips?: number | null;
};

type Strategy = 'ma_cross' | 'rsi_reversal' | 'macd_cross' | 'bb_bounce';

type Props = {
  defaultSymbol?: string;
  defaultTimeframe?: Timeframe;
};

const STRATEGIES: { id: Strategy; label: string }[] = [
  { id: 'ma_cross', label: 'MA Cross' },
  { id: 'rsi_reversal', label: 'RSI' },
  { id: 'macd_cross', label: 'MACD' },
  { id: 'bb_bounce', label: 'BB Bounce' },
];

export function BacktestPanel({ defaultSymbol = 'EURUSD', defaultTimeframe = '15m' }: Props) {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [tf, setTf] = useState<Timeframe>(defaultTimeframe);
  const [strategy, setStrategy] = useState<Strategy>('ma_cross');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [trades, setTrades] = useState<
    { side: string; entry: number; exit: number; pnl_pct: number }[]
  >([]);
  const [equity, setEquity] = useState<{ i: number; equity: number }[]>([]);
  /** وضوح الحالة: يعلم المستخدم إذا فشل تشغيل الاختبار الخلفي بدل صمت كامل (نتائج فارغة كأنه لا صفقات) */
  const [error, setError] = useState<string | null>(null);
  /** لأي رمز·فريم·استراتيجية حُسبت النتيجة الظاهرة — تُعرض فوقها كي لا تُقرأ لاختيار آخر. */
  const [ranFor, setRanFor] = useState<string | null>(null);

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
      const label = STRATEGIES.find((s) => s.id === strategy)?.label ?? strategy;
      setRanFor(`${symbol.trim().toUpperCase()} · ${tf} · ${label}`);
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

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { textAlign: align }]}>Strategy Backtest</Text>
      <Text style={[styles.sub, { textAlign: align }]}>{t.backtestSub}</Text>
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
            accessibilityLabel={`${t.backtestStrategyA11yPrefix}: ${s.label}`}
          >
            <Text style={[styles.chipText, strategy === s.id && styles.chipTextOn]}>{s.label}</Text>
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
          {stats.trade_count > 0 ? (
            <>
              <Text style={[styles.statLine, { textAlign: align }]}>
                {t.backtestStatWinRate.replace('{pct}', String(stats.win_rate))}
              </Text>
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
              {stats.avg_win_pct != null ? (
                <Text style={[styles.statLine, { textAlign: align }]}>
                  {t.backtestStatAvgWinLoss
                    .replace('{win}', String(stats.avg_win_pct))
                    .replace('{loss}', String(stats.avg_loss_pct))}
                </Text>
              ) : null}
              {typeof stats.spread_pips === 'number' && stats.spread_pips > 0 ? (
                <Text style={[styles.ranFor, { textAlign: align }]}>
                  {t.backtestSpreadNote.replace('{pips}', String(stats.spread_pips))}
                </Text>
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}
      {equity.length > 1 ? (
        <View style={styles.curve}>
          <Text style={[styles.curveTitle, { textAlign: align }]}>Equity Curve</Text>
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
        {trades.map((tr, i) => (
          <Text key={i} style={[styles.trade, { textAlign: align }]}>
            {tr.side} {formatPrice(tr.entry)} → {formatPrice(tr.exit)} · {tr.pnl_pct >= 0 ? '+' : ''}
            {tr.pnl_pct}%
          </Text>
        ))}
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
  title: { color: colors.text, fontWeight: '800', textAlign: 'right', fontSize: 16 },
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
  chipText: { color: colors.textMuted, fontWeight: '700', fontSize: 11 },
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
  btnText: { color: colors.onAccent, fontWeight: '800' },
  btnDisabled: { opacity: 0.4 },
  error: {
    color: colors.bear,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  stats: { gap: spacing.xs, marginTop: spacing.sm },
  statLine: { color: colors.text, textAlign: 'right', fontWeight: '600' },
  ranFor: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  sampleWarn: { color: colors.warn, fontSize: 11, fontWeight: '700' },
  curve: { marginTop: 6, gap: spacing.xs },
  curveTitle: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textAlign: 'right' },
  curveRow: { flexDirection: 'row', height: 48, alignItems: 'flex-end' },
  trade: { color: colors.textDim, textAlign: 'right', fontSize: 11, marginTop: spacing.xs },
});
