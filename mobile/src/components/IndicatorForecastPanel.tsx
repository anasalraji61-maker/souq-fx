import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { colors, radii, spacing, frameEmbed, frameEmbedHead, frameEmbedTitleBlock, frameEmbedTitle, frameEmbedSub, buttons } from '../theme';
import { api } from '../api';
import { formatPrice } from '../chart/math';

type Props = { symbol: string; timeframe?: string; embedded?: boolean };

const INDICATOR_OPTS = [
  { id: 'rsi', label: 'RSI' },
  { id: 'ma', label: 'MA' },
  { id: 'macd', label: 'MACD' },
  { id: 'bb', label: 'بولنجر' },
  { id: 'stoch', label: 'Stoch' },
  { id: 'trend', label: 'ميل' },
];

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

function dirLabel(d: string) {
  if (d === 'buy') return 'شراء';
  if (d === 'sell') return 'بيع';
  return 'محايد';
}

export function IndicatorForecastPanel({ symbol, timeframe = '15m', embedded }: Props) {
  const [enabled, setEnabled] = useState(INDICATOR_OPTS.map((x) => x.id));
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState('neutral');
  const [confidence, setConfidence] = useState(0);
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

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.indicatorForecast({
        symbol,
        timeframe,
        indicators: enabled,
      });
      setDirection(res.direction);
      setConfidence(res.confidence);
      setAvg(res.avg_score);
      setLevels(res.levels);
      setVotes(res.votes);
      setRsi(typeof res.snapshot?.rsi === 'number' ? res.snapshot.rsi : null);
      setNote(res.disclaimer);
    } catch {
      setVotes([]);
      setNote('تعذر حساب توقعات المؤشرات');
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe, enabled]);

  useEffect(() => {
    void run();
  }, [run]);

  return (
    <View style={[styles.wrap, embedded && styles.wrapInFrame]}>
      <View style={[styles.head, embedded && frameEmbedHead]}>
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
          accessibilityLabel="توقّع المؤشرات"
        >
          <Text style={styles.refreshText}>{loading ? '...' : 'توقّع'}</Text>
        </Pressable>
        <View style={embedded ? frameEmbedTitleBlock : undefined}>
          <Text style={[styles.title, embedded && frameEmbedTitle]}>توقعات المؤشرات</Text>
          <Text style={[styles.sub, embedded && frameEmbedSub]}>
            {symbol} · {timeframe}
            {rsi != null ? ` · RSI ${rsi.toFixed(1)}` : ''}
          </Text>
        </View>
      </View>

      <View style={styles.chips}>
        {INDICATOR_OPTS.map((opt) => {
          const on = enabled.includes(opt.id);
          return (
            <Pressable
              accessibilityRole="button"
              key={opt.id}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => toggle(opt.id)}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? <ActivityIndicator color={colors.accent} /> : null}

      <View style={styles.consensus}>
        <Text style={[styles.dir, { color: dirColor(direction) }]}>{dirLabel(direction)}</Text>
        <Text style={styles.meta}>
          ثقة {(confidence * 100).toFixed(0)}% · معدل مؤشرات {avg >= 0 ? '+' : ''}
          {avg.toFixed(2)}
        </Text>
        {levels && direction !== 'neutral' ? (
          <Text style={styles.levels}>
            صفقة: دخول {formatPrice(levels.entry)} · وقف {formatPrice(levels.sl)} · هدف{' '}
            {formatPrice(levels.tp)}
          </Text>
        ) : (
          <Text style={styles.levels}>لا إشارة قوية — انتظر تأكيد المؤشرات</Text>
        )}
      </View>

      <ScrollView style={styles.list} nestedScrollEnabled>
        {votes.map((v) => (
          <View key={v.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{v.name}</Text>
              <Text style={styles.summary}>{v.detail}</Text>
            </View>
            <Text style={[styles.badge, { color: dirColor(v.direction) }]}>
              {dirLabel(v.direction)}
            </Text>
          </View>
        ))}
      </ScrollView>
      {note ? <Text style={styles.note}>{note}</Text> : null}
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
    gap: 8,
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
  head: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { color: colors.text, fontWeight: '900', fontSize: 14, textAlign: 'right' },
  sub: { color: colors.textDim, fontSize: 11, textAlign: 'right', marginTop: 2 },
  refresh: {
    flexShrink: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  refreshDisabled: { opacity: 0.5 },
  refreshText: { color: colors.accent, fontWeight: '700', fontSize: 11 },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 },
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
  dir: { fontWeight: '900', fontSize: 18, textAlign: 'right' },
  meta: { color: colors.textMuted, fontSize: 11, textAlign: 'right' },
  levels: { color: colors.text, fontSize: 11, textAlign: 'right', fontWeight: '700', marginTop: 2 },
  list: { maxHeight: 120 },
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft,
  },
  name: { color: colors.text, fontWeight: '800', fontSize: 12, textAlign: 'right' },
  summary: { color: colors.textDim, fontSize: 10, textAlign: 'right', marginTop: 1 },
  badge: { fontWeight: '900', fontSize: 12 },
  note: { color: colors.textDim, fontSize: 9, textAlign: 'right' },
});
