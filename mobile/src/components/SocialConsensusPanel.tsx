import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radii, spacing, frameEmbed, frameEmbedHead, frameEmbedTitleBlock, frameEmbedTitle, frameEmbedSub, buttons } from '../theme';
import { api } from '../api';
import { formatPrice } from '../chart/math';

type Props = { symbol: string; timeframe?: string; embedded?: boolean };

type Source = { id: string; name: string; platform: string; weight: number };
type Vote = {
  id: string;
  name: string;
  platform: string;
  direction: string;
  score: number;
  note: string;
};

const PREFS_KEY = 'matrix.socialSources.v1';

const PLATFORM_AR: Record<string, string> = {
  telegram: 'تيليجرام',
  facebook: 'فيسبوك',
  instagram: 'إنستغرام',
  x: 'X',
  youtube: 'يوتيوب',
  discord: 'ديسكورد',
  app: 'تطبيق',
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

export function SocialConsensusPanel({ symbol, timeframe = '15m', embedded }: Props) {
  const [sources, setSources] = useState<Source[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState('neutral');
  const [confidence, setConfidence] = useState(0);
  const [avg, setAvg] = useState(0);
  const [split, setSplit] = useState({ buy: 0, sell: 0, neutral: 0 });
  const [levels, setLevels] = useState<{ entry: number; sl: number; tp: number } | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [note, setNote] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const catalog = await api.socialSources();
        setSources(catalog.sources);
        const raw = await AsyncStorage.getItem(PREFS_KEY);
        if (raw) {
          const ids = JSON.parse(raw) as string[];
          if (Array.isArray(ids) && ids.length) {
            setSelected(ids);
            setReady(true);
            return;
          }
        }
        setSelected(catalog.sources.slice(0, 5).map((s) => s.id));
      } catch {
        setSources([]);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const persist = async (ids: string[]) => {
    setSelected(ids);
    try {
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(ids));
    } catch {
      /* ignore */
    }
  };

  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    void persist(next.length ? next : selected);
  };

  const run = useCallback(async () => {
    if (!selected.length) return;
    setLoading(true);
    try {
      const res = await api.socialConsensus({
        symbol,
        timeframe,
        source_ids: selected,
      });
      setDirection(res.direction);
      setConfidence(res.confidence);
      setAvg(res.avg_score);
      setSplit(res.split);
      setLevels(res.levels);
      setVotes(res.votes);
      setNote(res.disclaimer);
    } catch {
      setVotes([]);
      setNote('تعذر حساب إجماع القنوات');
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe, selected]);

  useEffect(() => {
    if (!ready || !selected.length) return;
    void run();
  }, [ready, run, selected, symbol]);

  return (
    <View style={[styles.wrap, embedded && styles.wrapInFrame]}>
      <View style={[styles.head, embedded && frameEmbedHead]}>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.refresh,
            pressed && {
              opacity: buttons.pressedOpacity,
              transform: [{ scale: buttons.pressedScale }],
            },
          ]}
          onPress={() => void run()}
          disabled={loading}
          accessibilityState={{ disabled: loading }}
        >
          <Text style={styles.refreshText}>احسب</Text>
        </Pressable>
        <View style={embedded ? frameEmbedTitleBlock : undefined}>
          <Text style={[styles.title, embedded && frameEmbedTitle]}>المعدل التقريبي للتوصيات والصفقات</Text>
          <Text style={[styles.sub, embedded && frameEmbedSub]}>تيليجرام · فيسبوك · إنستغرام · X · تطبيقات</Text>
        </View>
      </View>

      <Text style={styles.pickHint}>اختر المصادر التي تتابعها — ثم يُحسب المعدل العام</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 44 }}>
        <View style={styles.chips}>
          {sources.map((s) => {
            const on = selected.includes(s.id);
            return (
              <Pressable
                accessibilityRole="button"
                key={s.id}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => toggle(s.id)}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>
                  {PLATFORM_AR[s.platform] ?? s.platform} · {s.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {loading ? <ActivityIndicator color={colors.accent} /> : null}

      <View style={styles.consensus}>
        <Text style={[styles.dir, { color: dirColor(direction) }]}>{dirLabel(direction)}</Text>
        <Text style={styles.meta}>
          ثقة {(confidence * 100).toFixed(0)}% · معدل {avg >= 0 ? '+' : ''}
          {avg.toFixed(2)} · مصادر {selected.length}
        </Text>
        <Text style={styles.meta}>
          شراء {split.buy} · بيع {split.sell} · محايد {split.neutral}
        </Text>
        {levels && direction !== 'neutral' ? (
          <Text style={styles.levels}>
            صفقة مقترحة: دخول {formatPrice(levels.entry)} · وقف {formatPrice(levels.sl)} · هدف{' '}
            {formatPrice(levels.tp)}
          </Text>
        ) : (
          <Text style={styles.levels}>لا صفقة واضحة — الآراء متضاربة أو محايدة</Text>
        )}
      </View>

      <ScrollView style={styles.list} nestedScrollEnabled>
        {votes.map((v) => (
          <View key={v.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{v.name}</Text>
              <Text style={styles.summary}>{v.note}</Text>
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
  sub: { color: colors.textDim, fontSize: 10, textAlign: 'right', marginTop: 2 },
  pickHint: { color: colors.textMuted, fontSize: 10, textAlign: 'right' },
  refresh: {
    flexShrink: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  refreshText: { color: colors.accent, fontWeight: '700', fontSize: 11 },
  chips: { flexDirection: 'row-reverse', gap: 6, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPanel,
    maxWidth: 200,
  },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  chipText: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
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
  list: { maxHeight: 110 },
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
