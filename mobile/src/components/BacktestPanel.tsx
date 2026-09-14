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

type Stats = {
  trade_count: number;
  win_rate: number;
  total_return_pct: number;
  final_equity: number;
  avg_win_pct?: number;
  avg_loss_pct?: number;
  max_drawdown_pct?: number;
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

  useEffect(() => {
    setSymbol(defaultSymbol);
    setTf(defaultTimeframe);
  }, [defaultSymbol, defaultTimeframe]);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.backtest({
        symbol: symbol.trim().toUpperCase(),
        timeframe: tf,
        strategy,
      });
      setStats(res.stats as Stats);
      setTrades(res.trades ?? []);
      setEquity(res.equity_curve ?? []);
      playSoftClick();
    } catch {
      setStats(null);
      setTrades([]);
      setEquity([]);
      setError('تعذر تشغيل الاختبار الخلفي — تحقق من الاتصال وحاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  const maxEq = Math.max(...equity.map((e) => e.equity), 100);
  const minEq = Math.min(...equity.map((e) => e.equity), 100);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Strategy Backtest</Text>
      <Text style={styles.sub}>MA · RSI · MACD · BB · منحنى Equity</Text>
      <TextInput
        style={styles.input}
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
        accessibilityLabel="رمز الأداة للاختبار الخلفي"
      />
      <TimeframeBar value={tf} onChange={setTf} />
      <View style={styles.row}>
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
          >
            <Text style={[styles.chipText, strategy === s.id && styles.chipTextOn]}>{s.label}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.btn,
          pressed && {
            opacity: buttons.pressedOpacity,
            transform: [{ scale: buttons.pressedScale }],
          },
        ]}
        onPress={run}
        disabled={loading}
        accessibilityState={{ disabled: loading }}
      >
        <Text style={styles.btnText}>{loading ? '...' : 'تشغيل Backtest'}</Text>
      </Pressable>
      {loading ? <ActivityIndicator color={colors.accent} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {stats ? (
        <View style={styles.stats}>
          <Text style={styles.statLine}>صفقات: {stats.trade_count}</Text>
          <Text style={styles.statLine}>نسبة نجاح: {stats.win_rate}%</Text>
          <Text style={styles.statLine}>عائد إجمالي: {stats.total_return_pct}%</Text>
          <Text style={styles.statLine}>Equity نهائي: {stats.final_equity}</Text>
          {stats.max_drawdown_pct != null ? (
            <Text style={styles.statLine}>أقصى هبوط: {stats.max_drawdown_pct}%</Text>
          ) : null}
          {stats.avg_win_pct != null ? (
            <Text style={styles.statLine}>
              متوسط ربح/خسارة: {stats.avg_win_pct}% / {stats.avg_loss_pct}%
            </Text>
          ) : null}
        </View>
      ) : null}
      {equity.length > 1 ? (
        <View style={styles.curve}>
          <Text style={styles.curveTitle}>Equity Curve</Text>
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
        {trades.map((t, i) => (
          <Text key={i} style={styles.trade}>
            {t.side} {t.entry} → {t.exit} · {t.pnl_pct >= 0 ? '+' : ''}
            {t.pnl_pct}%
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
    gap: 8,
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
  row: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
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
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: buttons.shadowColor,
    shadowOpacity: buttons.shadowOpacity,
    shadowRadius: buttons.shadowRadius,
    shadowOffset: { width: 0, height: buttons.shadowOffsetY },
    elevation: buttons.elevation,
  },
  btnText: { color: '#042F2E', fontWeight: '800' },
  error: {
    color: colors.bear,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: 4,
  },
  stats: { gap: 4, marginTop: 8 },
  statLine: { color: colors.text, textAlign: 'right', fontWeight: '600' },
  curve: { marginTop: 6, gap: 4 },
  curveTitle: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textAlign: 'right' },
  curveRow: { flexDirection: 'row', height: 48, alignItems: 'flex-end' },
  trade: { color: colors.textDim, textAlign: 'right', fontSize: 11, marginTop: 4 },
});
