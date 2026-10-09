import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { colors, radii, spacing, frameEmbed, numeric } from '../theme';
import { api } from '../api';
import { useI18n } from '../i18n/I18nContext';
import { ALERT_CHANNEL_ID, ensureAlertChannel, ensureAlertNotifications } from '../notifications';

type L3 = { ar: string; en: string; ku: string };
type Ev = {
  id: string;
  title: string;
  currency: string;
  impact: string;
  ts?: number | null;
  forecast_value?: string;
  previous?: string;
  actual?: string;
  time_tbd?: boolean;
  sample?: boolean;
};

const CCYS = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'NZD', 'CHF'] as const;

/** Topic groups: matched against the English release title (our own keyword rules — not a news feed). */
const TOPICS: { id: string; label: L3; re: RegExp }[] = [
  {
    id: 'rates',
    label: { ar: 'الفائدة والبنوك المركزية', en: 'Rates & central banks', ku: 'سوود و بانکی ناوەندی' },
    re: /(rate|fomc|ecb|boe|boj|rba|rbnz|boc|snb|monetary|policy|central bank|minutes|statement|press conference)/i,
  },
  {
    id: 'inflation',
    label: { ar: 'التضخم', en: 'Inflation', ku: 'هەڵاوسان' },
    re: /(cpi|ppi|pce|inflation|price index|prices)/i,
  },
  {
    id: 'jobs',
    label: { ar: 'الوظائف', en: 'Jobs', ku: 'کار' },
    re: /(non-?farm|nfp|payroll|employment|unemployment|jobless|claims|adp|jobs|wage|earnings)/i,
  },
  {
    id: 'growth',
    label: { ar: 'النمو والنشاط', en: 'Growth & activity', ku: 'گەشە و چالاکی' },
    re: /(gdp|pmi|ism|retail sales|industrial|manufacturing|services|confidence|sentiment|durable|trade balance|housing)/i,
  },
  {
    id: 'speeches',
    label: { ar: 'خطابات المسؤولين', en: 'Official speeches', ku: 'وتاری بەرپرسان' },
    re: /(speaks|speech|testifies|testimony|press|president|governor|chair)/i,
  },
];

const LEADS = [0, 5, 15, 30] as const;

const COPY = {
  title: { ar: 'أخباري', en: 'My news', ku: 'هەواڵەکانم' },
  sub: {
    ar: 'اختر العملات والأخبار التي تهمّك وسنعرض لك أقربها ونذكّرك قبلها',
    en: 'Pick the currencies and releases you care about — we show the nearest and remind you',
    ku: 'دراو و هەواڵەکانی گرنگ بۆ خۆت هەڵبژێرە، نزیکترینەکان پیشان دەدەین',
  },
  settings: { ar: 'إعداداتي', en: 'My settings', ku: 'ڕێکخستنەکانم' },
  done: { ar: 'تم', en: 'Done', ku: 'تەواو' },
  ccys: { ar: 'العملات', en: 'Currencies', ku: 'دراوەکان' },
  topics: { ar: 'نوع الأخبار (بلا اختيار = الكل)', en: 'Release types (none = all)', ku: 'جۆری هەواڵ (هیچ = هەموو)' },
  impact: { ar: 'الأهمية', en: 'Importance', ku: 'گرنگی' },
  impHigh: { ar: 'عالية فقط', en: 'High only', ku: 'تەنها بەرز' },
  impMed: { ar: 'متوسطة وعالية', en: 'Medium + high', ku: 'ناوەند و بەرز' },
  remind: { ar: 'نبّهني قبل الخبر', en: 'Remind me before', ku: 'ئاگادارم بکەرەوە پێش' },
  off: { ar: 'إيقاف', en: 'Off', ku: 'ناچالاک' },
  min: { ar: 'د', en: 'm', ku: 'خ' },
  noPerm: { ar: 'فعّل إذن الإشعارات من إعدادات الهاتف ليصلك التنبيه', en: 'Allow notifications in phone settings to get reminders', ku: 'مۆڵەتی ئاگادارکردنەوە لە ڕێکخستنەکانی مۆبایل چالاک بکە' },
  webNote: { ar: 'التنبيهات تعمل على الهاتف فقط', en: 'Reminders work on the phone app only', ku: 'ئاگادارکردنەوە تەنها لە مۆبایل کاردەکات' },
  none: { ar: 'لا أخبار تطابق اختياراتك خلال 7 أيام', en: 'No releases match your picks in the next 7 days', ku: 'هیچ هەواڵێک لەگەڵ هەڵبژاردنەکانت ناگونجێت' },
  loading: { ar: 'جارٍ تحميل التقويم…', en: 'Loading the calendar…', ku: 'تەقویم بار دەکرێت…' },
  unavailable: { ar: 'التقويم غير متاح الآن', en: 'Calendar unavailable right now', ku: 'تەقویم ئێستا بەردەست نییە' },
  soon: { ar: 'قريب', en: 'Soon', ku: 'نزیکە' },
  now: { ar: 'الآن', en: 'now', ku: 'ئێستا' },
  inWord: { ar: 'بعد', en: 'in', ku: 'دوای' },
  forecast: { ar: 'المتوقع', en: 'Forecast', ku: 'چاوەڕوان' },
  previous: { ar: 'السابق', en: 'Prev', ku: 'پێشوو' },
  actual: { ar: 'الفعلي', en: 'Actual', ku: 'ڕاستەقینە' },
  today: { ar: 'اليوم', en: 'Today', ku: 'ئەمڕۆ' },
  tomorrow: { ar: 'غداً', en: 'Tomorrow', ku: 'سبەی' },
  tbd: { ar: 'الوقت غير معلن', en: 'time TBD', ku: 'کات نادیارە' },
  edu: { ar: 'تعليمي وليس نصيحة استثمارية.', en: 'Educational only — not investment advice.', ku: 'تەنها فێرکارییە.' },
} satisfies Record<string, L3>;

type Prefs = { ccys: string[]; topics: string[]; impact: 'high' | 'med'; lead: number };
const DEFAULTS: Prefs = { ccys: ['USD', 'EUR', 'GBP'], topics: [], impact: 'high', lead: 15 };
const PREFS_KEY = 'matrix.mynews.prefs.v1';
const HORIZON_MS = 7 * 24 * 3600 * 1000;
const NOTIF_PREFIX = 'mynews-';

const pad2 = (n: number) => String(n).padStart(2, '0');

export function MyNewsPanel({ embedded }: { embedded?: boolean }) {
  const { rtl, lang } = useI18n();
  const k: keyof L3 = lang === 'ar' ? 'ar' : lang === 'ku' ? 'ku' : 'en';
  const align = rtl ? ('right' as const) : ('left' as const);
  const dir = rtl ? ('row-reverse' as const) : ('row' as const);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loadedPrefs, setLoadedPrefs] = useState(false);
  const [editing, setEditing] = useState(false);
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [bad, setBad] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [permMsg, setPermMsg] = useState(false);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY)
      .then((raw) => {
        if (!raw) return;
        const p = JSON.parse(raw) as Partial<Prefs>;
        setPrefs({
          ccys: Array.isArray(p.ccys) ? p.ccys.filter((c) => (CCYS as readonly string[]).includes(c)) : DEFAULTS.ccys,
          topics: Array.isArray(p.topics) ? p.topics.filter((x) => TOPICS.some((t) => t.id === x)) : [],
          impact: p.impact === 'med' ? 'med' : 'high',
          lead: typeof p.lead === 'number' && (LEADS as readonly number[]).includes(p.lead) ? p.lead : DEFAULTS.lead,
        });
      })
      .catch(() => {})
      .finally(() => setLoadedPrefs(true));
  }, []);

  const save = useCallback((next: Prefs) => {
    setPrefs(next);
    AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .calendar()
        .then((r) => {
          if (!alive) return;
          if (r.status === 'unavailable' && r.events.length === 0) setBad(true);
          else {
            setBad(false);
            setEvents(r.events as Ev[]);
          }
        })
        .catch(() => alive && setBad(true));
    load();
    const a = setInterval(load, 5 * 60 * 1000);
    const b = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => {
      alive = false;
      clearInterval(a);
      clearInterval(b);
    };
  }, []);

  const matches = useMemo(() => {
    const list = (events ?? []).filter((e) => {
      if (e.sample) return false;
      if (typeof e.ts !== 'number') return false;
      const ms = e.ts * 1000;
      if (ms < now - 30 * 60 * 1000 || ms > now + HORIZON_MS) return false;
      if (!prefs.ccys.includes(String(e.currency).toUpperCase())) return false;
      const high = e.impact === 'high';
      if (!(high || (prefs.impact === 'med' && e.impact === 'medium'))) return false;
      if (prefs.topics.length > 0) {
        const hit = prefs.topics.some((id) => TOPICS.find((t) => t.id === id)?.re.test(e.title));
        if (!hit) return false;
      }
      return true;
    });
    return list.sort((a, b) => (a.ts as number) - (b.ts as number));
  }, [events, prefs, now]);

  // Local reminders (phone only): re-planned whenever the picks or the calendar change.
  useEffect(() => {
    if (Platform.OS === 'web' || !loadedPrefs || events === null) return;
    let cancelled = false;
    (async () => {
      try {
        const all = await Notifications.getAllScheduledNotificationsAsync();
        for (const n of all) {
          if (n.identifier.startsWith(NOTIF_PREFIX)) await Notifications.cancelScheduledNotificationAsync(n.identifier);
        }
        if (cancelled || prefsRef.current.lead <= 0) return;
        await ensureAlertChannel();
        const lead = prefsRef.current.lead * 60 * 1000;
        const t = Date.now();
        for (const e of matches.slice(0, 20)) {
          if (cancelled) return;
          if (e.time_tbd) continue;
          const at = (e.ts as number) * 1000 - lead;
          if (at <= t + 5000) continue;
          await Notifications.scheduleNotificationAsync({
            identifier: `${NOTIF_PREFIX}${e.id}`,
            content: {
              title: `${e.currency} · ${e.title}`,
              body: `${COPY.inWord[k]} ${prefsRef.current.lead} ${COPY.min[k]}${e.forecast_value ? ` · ${COPY.forecast[k]} ${e.forecast_value}` : ''}`,
              sound: true,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: new Date(at),
              channelId: ALERT_CHANNEL_ID,
            } as Notifications.NotificationTriggerInput,
          });
        }
      } catch {
        /* notifications unavailable (Expo Go / permissions) — the list still works */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [matches, loadedPrefs, events, prefs.lead, k]);

  const toggle = (key: 'ccys' | 'topics', v: string) => {
    const cur = prefs[key];
    const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
    if (key === 'ccys' && next.length === 0) return;
    save({ ...prefs, [key]: next });
  };

  const setLead = async (m: number) => {
    save({ ...prefs, lead: m });
    setPermMsg(false);
    if (m > 0 && Platform.OS !== 'web') {
      const ok = await ensureAlertNotifications();
      if (!ok) setPermMsg(true);
    }
  };

  const countdown = (ts: number) => {
    const d = ts * 1000 - now;
    if (d <= 60_000 && d > -30 * 60 * 1000) return COPY.now[k];
    if (d < 0) return '';
    const m = Math.floor(d / 60_000);
    const h = Math.floor(m / 60);
    if (h >= 24) return `${COPY.inWord[k]} ${Math.floor(h / 24)}d`;
    return `${COPY.inWord[k]} ${h > 0 ? `${h}h ` : ''}${m % 60}m`;
  };

  const dayLabel = (ts: number) => {
    const d = new Date(ts * 1000);
    const t0 = new Date(now);
    const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
    if (sameDay(d, t0)) return COPY.today[k];
    if (sameDay(d, new Date(now + 86400000))) return COPY.tomorrow[k];
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const hhmm = (ts: number) => {
    const d = new Date(ts * 1000);
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };

  const soonEv = matches.find((e) => {
    const d = (e.ts as number) * 1000 - now;
    return d > -10 * 60 * 1000 && d <= Math.max(prefs.lead, 15) * 60 * 1000;
  });

  const chip = (label: string, on: boolean, onPress: () => void, key?: string) => (
    <Pressable
      key={key ?? label}
      onPress={onPress}
      style={[styles.chip, on && styles.chipOn]}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
    >
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={[styles.panel, embedded && styles.panelInFrame]}>
      <View style={[styles.head, { flexDirection: dir }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { textAlign: align }]}>{COPY.title[k]}</Text>
          <Text style={[styles.sub, { textAlign: align }]} numberOfLines={2}>
            {COPY.sub[k]}
          </Text>
        </View>
        <Pressable
          onPress={() => setEditing((v) => !v)}
          style={[styles.gear, editing && styles.chipOn]}
          accessibilityRole="button"
          accessibilityLabel={COPY.settings[k]}
        >
          <Text style={[styles.gearText, editing && styles.chipTextOn]}>{editing ? COPY.done[k] : `⚙ ${COPY.settings[k]}`}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.sm }} nestedScrollEnabled>
        {editing ? (
          <View style={styles.settings}>
            <Text style={[styles.label, { textAlign: align }]}>{COPY.ccys[k]}</Text>
            <View style={[styles.chips, { flexDirection: dir }]}>{CCYS.map((c) => chip(c, prefs.ccys.includes(c), () => toggle('ccys', c)))}</View>
            <Text style={[styles.label, { textAlign: align }]}>{COPY.topics[k]}</Text>
            <View style={[styles.chips, { flexDirection: dir }]}>
              {TOPICS.map((tp) => chip(tp.label[k], prefs.topics.includes(tp.id), () => toggle('topics', tp.id), tp.id))}
            </View>
            <Text style={[styles.label, { textAlign: align }]}>{COPY.impact[k]}</Text>
            <View style={[styles.chips, { flexDirection: dir }]}>
              {chip(COPY.impHigh[k], prefs.impact === 'high', () => save({ ...prefs, impact: 'high' }), 'ih')}
              {chip(COPY.impMed[k], prefs.impact === 'med', () => save({ ...prefs, impact: 'med' }), 'im')}
            </View>
            <Text style={[styles.label, { textAlign: align }]}>{COPY.remind[k]}</Text>
            <View style={[styles.chips, { flexDirection: dir }]}>
              {LEADS.map((m) => chip(m === 0 ? COPY.off[k] : `${m} ${COPY.min[k]}`, prefs.lead === m, () => void setLead(m), `l${m}`))}
            </View>
            {Platform.OS === 'web' && prefs.lead > 0 ? <Text style={[styles.dim, { textAlign: align }]}>{COPY.webNote[k]}</Text> : null}
            {permMsg ? <Text style={[styles.warn, { textAlign: align }]}>{COPY.noPerm[k]}</Text> : null}
          </View>
        ) : null}

        {soonEv ? (
          <View style={styles.soonBox}>
            <Text style={[styles.soonTag, { textAlign: align }]}>
              ● {COPY.soon[k]} · {countdown(soonEv.ts as number)}
            </Text>
            <Text style={[styles.soonTitle, { textAlign: align }]}>
              {soonEv.currency} · {soonEv.title}
            </Text>
          </View>
        ) : null}

        {events === null && !bad ? (
          <Text style={[styles.dim, { textAlign: align }]}>{COPY.loading[k]}</Text>
        ) : bad && events === null ? (
          <Text style={[styles.dim, { textAlign: align }]}>{COPY.unavailable[k]}</Text>
        ) : matches.length === 0 ? (
          <Text style={styles.empty}>{COPY.none[k]}</Text>
        ) : (
          matches.slice(0, 12).map((e) => {
            const high = e.impact === 'high';
            const ts = e.ts as number;
            return (
              <View key={e.id} style={styles.row}>
                <View style={[styles.rowTop, { flexDirection: dir }]}>
                  <View style={styles.ccyBadge}>
                    <Text style={styles.ccyText}>{e.currency}</Text>
                  </View>
                  <Text style={[styles.dots, { color: high ? colors.text : colors.textDim }]}>{high ? '●●●' : '●●○'}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={styles.when}>
                    {dayLabel(ts)} {e.time_tbd ? COPY.tbd[k] : hhmm(ts)}
                  </Text>
                  {countdown(ts) ? <Text style={styles.count}>{countdown(ts)}</Text> : null}
                </View>
                <Text style={[styles.evTitle, { textAlign: 'left', writingDirection: 'ltr' }]} numberOfLines={2}>
                  {e.title}
                </Text>
                {e.forecast_value || e.previous || e.actual ? (
                  <Text style={[styles.dim, { textAlign: align }]}>
                    {e.actual ? `${COPY.actual[k]} ${e.actual}  ` : ''}
                    {e.forecast_value ? `${COPY.forecast[k]} ${e.forecast_value}  ` : ''}
                    {e.previous ? `${COPY.previous[k]} ${e.previous}` : ''}
                  </Text>
                ) : null}
              </View>
            );
          })
        )}
        <Text style={[styles.edu, { textAlign: align }]}>{COPY.edu[k]}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    height: '100%',
    backgroundColor: colors.bgPanel,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    overflow: 'hidden',
    gap: spacing.sm,
  },
  panelInFrame: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingTop: frameEmbed.padTop,
    paddingLeft: frameEmbed.padLeft,
    paddingRight: frameEmbed.padRight,
    paddingBottom: frameEmbed.padBottom,
  },
  head: { alignItems: 'flex-start', gap: spacing.sm },
  title: { color: colors.text, fontSize: 15, fontWeight: '700' },
  sub: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  gear: { borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.bgElevated },
  gearText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  settings: { backgroundColor: colors.bgElevated, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.borderSoft, padding: spacing.sm, gap: 6 },
  label: { color: colors.warmAccent, fontSize: 11.5, fontWeight: '600', marginTop: 4 },
  chips: { flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.bgPanel },
  chipOn: { backgroundColor: colors.selectedFill, borderColor: colors.accent },
  chipText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  chipTextOn: { color: colors.text },
  soonBox: { borderRadius: radii.sm, borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.selectedFill, padding: spacing.sm, gap: 2 },
  soonTag: { color: colors.accent, fontSize: 11.5, fontWeight: '700' },
  soonTitle: { color: colors.text, fontSize: 13, fontWeight: '600' },
  row: { backgroundColor: colors.bgElevated, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.borderSoft, padding: spacing.sm, gap: 3 },
  rowTop: { alignItems: 'center', gap: 8 },
  ccyBadge: { backgroundColor: colors.bgPanel, borderRadius: 6, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 7, paddingVertical: 2 },
  ccyText: { ...numeric, color: colors.accent, fontSize: 11.5, fontWeight: '700' },
  dots: { fontSize: 9, letterSpacing: 1 },
  when: { ...numeric, color: colors.textDim, fontSize: 11 },
  count: { ...numeric, color: colors.text, fontSize: 11, fontWeight: '700' },
  evTitle: { color: colors.text, fontSize: 12.5, fontWeight: '600', lineHeight: 18 },
  dim: { color: colors.textDim, fontSize: 11.5 },
  warn: { color: colors.warn, fontSize: 11.5 },
  empty: { color: colors.textDim, fontSize: 11.5, textAlign: 'center', paddingVertical: spacing.lg },
  edu: { color: colors.textDim, fontSize: 10.5, marginTop: 4 },
});
