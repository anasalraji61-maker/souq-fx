import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { colors, radii, spacing, frameEmbed, frameEmbedHead, frameEmbedTitleBlock, frameEmbedTitle, frameEmbedSub, buttons } from '../theme';
import { api } from '../api';
import { formatPrice } from '../chart/math';
import { useI18n } from '../i18n/I18nContext';
import type { Dict } from '../i18n/locales';

type Props = { symbol: string; timeframe?: string; embedded?: boolean };

type AnalystRow = {
  id: string;
  name: string;
  house: string;
  direction: string;
  score: number;
  target: number;
  horizon: string;
  summary: string;
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

export function AnalystsPanel({ symbol, timeframe = '15m', embedded }: Props) {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState('neutral');
  const [confidence, setConfidence] = useState(0);
  const [avg, setAvg] = useState(0);
  const [levels, setLevels] = useState<{ entry: number; sl: number; tp: number } | null>(null);
  const [rows, setRows] = useState<AnalystRow[]>([]);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.analystsForecast(symbol, timeframe);
      setDirection(res.direction);
      setConfidence(res.confidence);
      setAvg(res.avg_score);
      setLevels(res.levels);
      setRows(res.analysts);
      setNote(res.disclaimer);
    } catch {
      setRows([]);
      setNote(t.analystsLoadError);
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe, t.analystsLoadError]);

  useEffect(() => {
    void load();
  }, [load]);

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

      <View style={styles.consensus}>
        <Text style={[styles.dir, { color: dirColor(direction), textAlign: align }]}>
          {dirLabel(direction, t)}
        </Text>
        <Text style={[styles.meta, { textAlign: align }]}>
          {t.confidenceLabel} {(confidence * 100).toFixed(0)}% · {t.avgLabel} {avg >= 0 ? '+' : ''}
          {avg.toFixed(2)}
        </Text>
        {levels ? (
          <Text style={[styles.levels, { textAlign: align }]}>
            {t.entryLabel} {formatPrice(levels.entry)} · {t.slLabel} {formatPrice(levels.sl)} ·{' '}
            {t.tpLabel} {formatPrice(levels.tp)}
          </Text>
        ) : null}
      </View>

      <ScrollView style={styles.list} nestedScrollEnabled>
        {rows.map((a) => (
          <View key={a.id} style={[styles.row, rtl && styles.rowRtl]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { textAlign: align }]}>{a.name}</Text>
              <Text style={[styles.summary, { textAlign: align }]}>{a.summary}</Text>
            </View>
            <View style={styles.right}>
              <Text style={[styles.badge, { color: dirColor(a.direction) }]}>
                {dirLabel(a.direction, t)}
              </Text>
              <Text style={styles.target}>
                {t.tpLabel} {formatPrice(a.target)}
              </Text>
              <Text style={styles.horizon}>{a.horizon}</Text>
            </View>
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
  refreshText: { color: colors.accent, fontWeight: '700', fontSize: 11 },
  consensus: {
    backgroundColor: colors.bgPanel,
    borderRadius: radii.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    gap: spacing.xs,
  },
  dir: { fontWeight: '900', fontSize: 18 },
  meta: { color: colors.textMuted, fontSize: 11 },
  levels: { color: colors.text, fontSize: 11, fontWeight: '700' },
  list: { maxHeight: 120, flexGrow: 0 },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft,
  },
  rowRtl: { flexDirection: 'row-reverse' },
  name: { color: colors.text, fontWeight: '800', fontSize: 12 },
  summary: { color: colors.textDim, fontSize: 10, marginTop: 2 },
  right: { alignItems: 'flex-start', minWidth: 72 },
  badge: { fontWeight: '900', fontSize: 12 },
  target: { color: colors.textMuted, fontSize: 10 },
  horizon: { color: colors.textDim, fontSize: 9 },
  note: { color: colors.textDim, fontSize: 9, marginTop: spacing.xs },
});
