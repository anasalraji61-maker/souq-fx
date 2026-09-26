import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radii, spacing, frameEmbed, frameEmbedHead, frameEmbedTitleBlock, frameEmbedTitle, frameEmbedSub, buttons, numeric } from '../theme';
import { api } from '../api';
import { dirColor, dirLabel, formatScore, levelsUnavailableText } from './signalDirection';
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

export function SocialConsensusPanel({ symbol, timeframe = '15m', embedded }: Props) {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const [sources, setSources] = useState<Source[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState('neutral');
  const [avg, setAvg] = useState(0);
  const [split, setSplit] = useState({ buy: 0, sell: 0, neutral: 0 });
  const [levels, setLevels] = useState<{ entry: number; sl: number; tp: number } | null>(null);
  const [levelsWhy, setLevelsWhy] = useState<string | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  /** نتيجة إجماع محسوبة فعلاً — قبلها لا يُعرض «محايد · +0.00» كأنه قراءة. */
  const [hasResult, setHasResult] = useState(false);
  /** backend-r2: لا مصدر مرخَّص ⇒ `status: 'unavailable'`، `direction`/`avg_score` null. */
  const [unavailable, setUnavailable] = useState(false);
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
          // مصادر محفوظة لم تعد بالكتالوج (backend-r2 أفرغه) لا تُرسل — وإلا يُحسب «إجماع» على لا شيء.
          const known = new Set(catalog.sources.map((x) => x.id));
          const parsed = JSON.parse(raw) as unknown;
          const ids = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string' && known.has(x)) : [];
          if (ids.length) {
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

  // النتيجة تُعرض لرمزها وفريمها ومصادرها فقط: ردّ أقدم (تبديل رمز أو مصادر بسرعة) كان يكتب فوق الأحدث
  // فتظهر «صفقة مقترحة» لأداة أخرى أو لمجموعة مصادر أخرى، وعدّ المصادر كان من الاختيار الجاري لا ممّا
  // حُسبت منه النتيجة (أزلت مصدراً ⇒ «المصادر 4» بجانب متوسط الخمسة). `reqRef` يُسقط المتأخر، و`resultKey`
  // يُخفي نتيجة اختيار سابق حتى يصل حسابه.
  const reqRef = useRef(0);
  const key = `${symbol}|${timeframe}|${selected.join(',')}`;
  const [resultKey, setResultKey] = useState<string | null>(null);
  const fresh = resultKey === key;

  const run = useCallback(async () => {
    if (!selected.length) return;
    const id = ++reqRef.current;
    const forKey = `${symbol}|${timeframe}|${selected.join(',')}`;
    setLoading(true);
    try {
      const res = await api.socialConsensus({
        symbol,
        timeframe,
        source_ids: selected,
      });
      if (!mountedRef.current || id !== reqRef.current) return;
      setResultKey(forKey);
      // كان `avg_score: null` يرمي عند `toFixed` فتسقط الشاشة كلّها إلى «حدث خطأ» (launch103).
      if (res.status === 'unavailable' || res.data_kind === 'unavailable' || res.direction == null) {
        setUnavailable(true);
        setHasResult(false);
        setLevels(null);
        setLevelsWhy(null);
        setVotes([]);
        setNote('');
        return;
      }
      setUnavailable(false);
      setHasResult(true);
      setDirection(res.direction);
      setAvg(res.avg_score ?? NaN);
      setSplit(res.split ?? { buy: 0, sell: 0, neutral: 0 });
      setLevels(res.levels);
      setLevelsWhy(levelsUnavailableText(res.levels_basis, t));
      setVotes(Array.isArray(res.votes) ? res.votes : []);
      setNote(res.disclaimer);
    } catch {
      if (mountedRef.current && id === reqRef.current) {
        setResultKey(forKey);
        setUnavailable(false);
        setHasResult(false);
        setVotes([]);
        setNote(t.socialComputeError);
      }
    } finally {
      if (mountedRef.current && id === reqRef.current) setLoading(false);
    }
  }, [symbol, timeframe, selected, t]);

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
            (loading || !selected.length) && styles.refreshDisabled,
            pressed && {
              opacity: buttons.pressedOpacity,
              transform: [{ scale: buttons.pressedScale }],
            },
          ]}
          onPress={() => void run()}
          disabled={loading || !selected.length}
          accessibilityState={{ disabled: loading || !selected.length }}
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
                accessibilityState={{ selected: on }}
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

      {(fresh && unavailable) || (ready && !sourcesError && sources.length === 0) ? (
        <View style={styles.consensus}>
          <Text style={[styles.meta, { textAlign: align }]}>{t.socialUnavailable}</Text>
        </View>
      ) : fresh && hasResult ? (
        <View style={styles.consensus}>
          <Text style={[styles.dir, { color: dirColor(direction), textAlign: align }]}>
            {dirLabel(direction, t)}
          </Text>
          <Text style={[styles.meta, { textAlign: align }]}>
            {/* «درجة الاتفاق n%» أُزيلت: معادلة ثابتة بالخادم تُقرأ كاحتمال نجاح؛ عدّ الآراء بالسطر التالي. */}
            {t.avgLabel} {formatScore(avg)} · {t.sourcesCountLabel} {selected.length}
          </Text>
          <Text style={[styles.meta, { textAlign: align }]}>
            {t.dirBuy} {split.buy} · {t.dirSell} {split.sell} · {t.dirNeutral} {split.neutral}
          </Text>
          {levels && direction !== 'neutral' ? (
            <Text style={[styles.levels, { textAlign: align }]}>
              {t.suggestedTradeLabel}: {t.entryLabel} {formatPrice(levels.entry, symbol, levels.entry)} · {t.slLabel}{' '}
              {formatPrice(levels.sl, symbol, levels.entry)} · {t.tpLabel} {formatPrice(levels.tp, symbol, levels.entry)}
            </Text>
          ) : direction === 'neutral' || levelsWhy ? (
            <Text style={[styles.levels, { textAlign: align }]}>{levelsWhy ?? t.socialNoClearTrade}</Text>
          ) : null /* شراء/بيع بلا مستويات لسبب لا نعرفه: «الآراء متضاربة أو محايدة» كانت تناقض الاتجاه (backend-r37) */}
        </View>
      ) : null}

      <ScrollView style={styles.list} nestedScrollEnabled>
        {(fresh ? votes : []).map((v) => (
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
  pickHint: { color: colors.textMuted, fontSize: 11 },
  sourcesError: { color: colors.bear, fontSize: 11, fontWeight: '500' },
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
  refreshDisabled: { opacity: 0.4 },
  chips: { flexDirection: 'row', gap: 4, paddingVertical: 4 },
  chipsRtl: { flexDirection: 'row-reverse' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPanel,
    maxWidth: 200,
  },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  chipText: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },
  chipTextOn: { color: colors.accent },
  consensus: {
    backgroundColor: colors.bgPanel,
    borderRadius: radii.sm,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    gap: 4,
  },
  dir: { fontWeight: '500', fontSize: 18 },
  meta: { ...numeric, color: colors.textMuted, fontSize: 11 },
  levels: { ...numeric, color: colors.text, fontSize: 11, fontWeight: '500', marginTop: 4 },
  list: { maxHeight: 110 },
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
