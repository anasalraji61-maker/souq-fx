import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radii, spacing, frameEmbed, frameEmbedHead, frameEmbedTitleBlock, frameEmbedTitle, frameEmbedSub, buttons } from '../theme';
import { api } from '../api';
import { formatPrice } from '../chart/math';
import { useI18n } from '../i18n/I18nContext';
import type { Dict } from '../i18n/locales';

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

function platformLabel(platform: string, t: Dict): string {
  const map: Record<string, string> = {
    telegram: t.socialPlatformTelegram,
    facebook: t.socialPlatformFacebook,
    instagram: t.socialPlatformInstagram,
    x: t.socialPlatformX,
    youtube: t.socialPlatformYoutube,
    discord: t.socialPlatformDiscord,
    app: t.socialPlatformApp,
  };
  return map[platform] ?? platform;
}

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

export function SocialConsensusPanel({ symbol, timeframe = '15m', embedded }: Props) {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
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
  /** وضوح الحالة: يميّز فشل تحميل كتالوج المصادر عن عدم توفّر مصادر فعلاً */
  const [sourcesError, setSourcesError] = useState(false);

  // حارس "alive" مبني على ref يمنع تحديث الحالة بعد إلغاء تركيب اللوحة (تبديل قسم hub قبل
  // اكتمال الطلب) — نفس مبدأ ChartFrame/SymbolSnapshot المؤسَّس بالكود، بصيغة ref هنا لأنه
  // يُستخدَم بأكثر من مؤثّر بهذا الملف (تحميل المصادر + `run`).
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const catalog = await api.socialSources();
        if (!mountedRef.current) return;
        setSources(catalog.sources);
        setSourcesError(false);
        const raw = await AsyncStorage.getItem(PREFS_KEY);
        if (!mountedRef.current) return;
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
        if (mountedRef.current) {
          setSources([]);
          setSourcesError(true);
        }
      } finally {
        if (mountedRef.current) setReady(true);
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
      if (!mountedRef.current) return;
      setDirection(res.direction);
      setConfidence(res.confidence);
      setAvg(res.avg_score);
      setSplit(res.split);
      setLevels(res.levels);
      setVotes(res.votes);
      setNote(res.disclaimer);
    } catch {
      if (mountedRef.current) {
        setVotes([]);
        setNote(t.socialComputeError);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [symbol, timeframe, selected, t.socialComputeError]);

  useEffect(() => {
    if (!ready || !selected.length) return;
    void run();
  }, [ready, run, selected, symbol]);

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
          accessibilityLabel={t.socialComputeA11y}
          hitSlop={8}
        >
          <Text style={styles.refreshText}>{t.socialComputeBtn}</Text>
        </Pressable>
        <View style={embedded ? frameEmbedTitleBlock : undefined}>
          <Text style={[styles.title, embedded && frameEmbedTitle, { textAlign: align }]}>
            {t.socialTitle}
          </Text>
          <Text style={[styles.sub, embedded && frameEmbedSub, { textAlign: align }]}>{t.socialSub}</Text>
        </View>
      </View>

      <Text style={[styles.pickHint, { textAlign: align }]}>{t.socialPickHint}</Text>
      {sourcesError ? (
        <Text style={[styles.sourcesError, { textAlign: align }]}>{t.socialSourcesError}</Text>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 44 }}>
        <View style={[styles.chips, rtl && styles.chipsRtl]}>
          {sources.map((s) => {
            const on = selected.includes(s.id);
            return (
              <Pressable
                accessibilityRole="button"
                key={s.id}
                style={({ pressed }) => [
                  styles.chip,
                  on && styles.chipOn,
                  pressed && {
                    opacity: buttons.pressedOpacity,
                    transform: [{ scale: buttons.pressedScale }],
                  },
                ]}
                onPress={() => toggle(s.id)}
                accessibilityLabel={`${t.a11ySourcePrefix}: ${platformLabel(s.platform, t)} · ${s.name}${on ? ' · ' + t.enabledWord : ''}`}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>
                  {platformLabel(s.platform, t)} · {s.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {loading ? <ActivityIndicator color={colors.accent} /> : null}

      <View style={styles.consensus}>
        <Text style={[styles.dir, { color: dirColor(direction), textAlign: align }]}>
          {dirLabel(direction, t)}
        </Text>
        <Text style={[styles.meta, { textAlign: align }]}>
          {t.confidenceLabel} {(confidence * 100).toFixed(0)}% · {t.avgLabel} {avg >= 0 ? '+' : ''}
          {avg.toFixed(2)} · {t.sourcesCountLabel} {selected.length}
        </Text>
        <Text style={[styles.meta, { textAlign: align }]}>
          {t.dirBuy} {split.buy} · {t.dirSell} {split.sell} · {t.dirNeutral} {split.neutral}
        </Text>
        {levels && direction !== 'neutral' ? (
          <Text style={[styles.levels, { textAlign: align }]}>
            {t.suggestedTradeLabel}: {t.entryLabel} {formatPrice(levels.entry)} · {t.slLabel}{' '}
            {formatPrice(levels.sl)} · {t.tpLabel} {formatPrice(levels.tp)}
          </Text>
        ) : (
          <Text style={[styles.levels, { textAlign: align }]}>{t.socialNoClearTrade}</Text>
        )}
      </View>

      <ScrollView style={styles.list} nestedScrollEnabled>
        {votes.map((v) => (
          <View key={v.id} style={[styles.row, rtl && styles.rowRtl]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { textAlign: align }]}>{v.name}</Text>
              <Text style={[styles.summary, { textAlign: align }]}>{v.note}</Text>
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
  sub: { color: colors.textDim, fontSize: 10, marginTop: 2 },
  pickHint: { color: colors.textMuted, fontSize: 10 },
  sourcesError: { color: colors.bear, fontSize: 10, fontWeight: '700' },
  refresh: {
    flexShrink: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  refreshText: { color: colors.accent, fontWeight: '700', fontSize: 11 },
  refreshDisabled: { opacity: 0.4 },
  chips: { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  chipsRtl: { flexDirection: 'row-reverse' },
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
  dir: { fontWeight: '900', fontSize: 18 },
  meta: { color: colors.textMuted, fontSize: 11 },
  levels: { color: colors.text, fontSize: 11, fontWeight: '700', marginTop: 2 },
  list: { maxHeight: 110 },
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
