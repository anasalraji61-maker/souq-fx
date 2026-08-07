import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, spacing } from '../theme';
import { api } from '../api';
import { TimeframeBar } from '../components/TimeframeBar';
import { type Timeframe } from '../timeframes';
import { BacktestPanel } from '../components/BacktestPanel';
import { IndicatorAlertsPanel } from '../components/IndicatorAlertsPanel';
import { CalendarPanel } from '../components/CalendarPanel';
import { LayoutPanel } from '../components/LayoutPanel';
import { WeeklyReportPanel } from '../components/WeeklyReportPanel';
import { TradeJournalPanel } from '../components/TradeJournalPanel';
import { AiPanel } from '../components/AiPanel';
import { AnalystsPanel } from '../components/AnalystsPanel';
import { SocialConsensusPanel } from '../components/SocialConsensusPanel';
import { IndicatorForecastPanel } from '../components/IndicatorForecastPanel';
import { AlertsPanel } from '../components/AlertsPanel';
import { NewsPanel } from '../components/NewsPanel';
import { GroupChatPanel } from '../components/GroupChatPanel';
import { VotePanel } from '../components/VotePanel';
import { FrameSizedGrid } from '../components/FrameSizedGrid';
import { DEFAULT_LAYOUT } from '../chart/layoutStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FILTERS = [
  { id: 'ma_cross_up', label: 'MA صعودي' },
  { id: 'ma_cross_down', label: 'MA هبوطي' },
  { id: 'rsi_oversold', label: 'RSI oversold' },
  { id: 'rsi_overbought', label: 'RSI overbought' },
  { id: 'macd_cross_up', label: 'MACD up' },
  { id: 'bullish', label: 'زخم +' },
  { id: 'bearish', label: 'زخم -' },
];

type Hit = {
  symbol: string;
  last: number;
  change_pct: number;
  rsi: number;
  filters_matched: string[];
};

type TabId =
  | 'hub'
  | 'reports'
  | 'journal'
  | 'screener'
  | 'backtest'
  | 'indAlerts'
  | 'calendar'
  | 'layouts'
  | 'ai';

const TABS: { id: TabId; label: string }[] = [
  { id: 'hub', label: 'إشارات ومجتمع' },
  { id: 'reports', label: 'تقارير' },
  { id: 'journal', label: 'PnL' },
  { id: 'screener', label: 'فحص' },
  { id: 'backtest', label: 'Backtest' },
  { id: 'indAlerts', label: 'تنبيهات+' },
  { id: 'calendar', label: 'تقويم' },
  { id: 'layouts', label: 'تخطيط' },
  { id: 'ai', label: 'AI' },
];

export function ToolsScreen() {
  const [tab, setTab] = useState<TabId>('hub');
  const [tf, setTf] = useState<Timeframe>('15m');
  const [signalSym, setSignalSym] = useState('EURUSD');
  const [selected, setSelected] = useState<string[]>(['ma_cross_up']);
  const [results, setResults] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [frameTfs, setFrameTfs] = useState<string[]>([...DEFAULT_LAYOUT.frameTfs]);
  const [frameSymbols, setFrameSymbols] = useState<[string, string, string]>(
    DEFAULT_LAYOUT.frameSymbols
  );

  React.useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('matrix.frameTimeframes.v1');
        if (raw) {
          const p = JSON.parse(raw) as string[];
          if (Array.isArray(p) && p.length === 3) setFrameTfs(p);
        }
        const sym = await AsyncStorage.getItem('matrix.frameSymbols.v1');
        if (sym) {
          const p = JSON.parse(sym) as string[];
          if (Array.isArray(p) && p.length === 3) setFrameSymbols([p[0], p[1], p[2]]);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const toggleFilter = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.screenerRun({ timeframe: tf, filters: selected });
      setResults(res.results);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [tf, selected]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Text style={styles.title}>Tools · أدوات</Text>
        <Text style={styles.sub}>إشارات ومجتمع معاً · 4 مربعات ثم انزل للأسفل</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
        <View style={styles.tabs}>
          {TABS.map((t) => (
            <Pressable
              key={t.id}
              style={[styles.tab, tab === t.id && styles.tabOn]}
              onPress={() => setTab(t.id)}
            >
              <Text style={[styles.tabText, tab === t.id && styles.tabTextOn]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {tab === 'hub' ? (
        <ScrollView
          style={styles.pageScroll}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator
        >
          <View style={styles.toolbar}>
            <TimeframeBar value={tf} onChange={setTf} compact />
            <View style={styles.filters}>
              {['EURUSD', 'GBPUSD', 'XAUUSD', 'DXY'].map((s) => (
                <Pressable
                  key={s}
                  style={[styles.chip, signalSym === s && styles.chipOn]}
                  onPress={() => setSignalSym(s)}
                >
                  <Text style={[styles.chipText, signalSym === s && styles.chipTextOn]}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Text style={styles.gridHint}>
            نفس حجم الفريمات · امسك الشريط واسحب للتبديل · انزل ↓ للباقي
          </Text>
          <FrameSizedGrid
            storageKey="matrix.tools.hub.order.v1"
            items={[
              {
                id: 'analysts',
                node: <AnalystsPanel symbol={signalSym} timeframe={tf} />,
              },
              {
                id: 'social',
                node: <SocialConsensusPanel symbol={signalSym} timeframe={tf} />,
              },
              {
                id: 'forecast',
                node: <IndicatorForecastPanel symbol={signalSym} timeframe={tf} />,
              },
              {
                id: 'alerts',
                node: <AlertsPanel defaultSymbol={signalSym} />,
              },
              { id: 'news', node: <NewsPanel /> },
              { id: 'chat', node: <GroupChatPanel /> },
              { id: 'votes', node: <VotePanel /> },
            ]}
          />
        </ScrollView>
      ) : null}

      {tab === 'reports' ? (
        <ScrollView contentContainerStyle={styles.body}>
          <WeeklyReportPanel grid />
        </ScrollView>
      ) : null}

      {tab === 'journal' ? (
        <ScrollView contentContainerStyle={styles.body}>
          <TradeJournalPanel />
        </ScrollView>
      ) : null}

      {tab === 'screener' ? (
        <ScrollView contentContainerStyle={styles.body}>
          <TimeframeBar value={tf} onChange={setTf} />
          <Text style={styles.label}>الفلاتر</Text>
          <View style={styles.filters}>
            {FILTERS.map((f) => (
              <Pressable
                key={f.id}
                style={[styles.chip, selected.includes(f.id) && styles.chipOn]}
                onPress={() => toggleFilter(f.id)}
              >
                <Text style={[styles.chipText, selected.includes(f.id) && styles.chipTextOn]}>
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.runBtn} onPress={run} disabled={loading || !selected.length}>
            <Text style={styles.runText}>{loading ? 'جاري الفحص...' : 'تشغيل Screener'}</Text>
          </Pressable>
          {loading ? <ActivityIndicator color={colors.accent} /> : null}
          <FrameSizedGrid
            storageKey="matrix.tools.screener.order.v1"
            items={results.slice(0, 8).map((r) => ({
              id: r.symbol,
              node: (
                <View style={styles.hitCard}>
                  <Text style={styles.sym}>{r.symbol}</Text>
                  <Text style={styles.meta}>
                    {r.last} · RSI {r.rsi} · {r.change_pct >= 0 ? '+' : ''}
                    {r.change_pct}%
                  </Text>
                  <Text style={styles.match}>{r.filters_matched.join(' · ')}</Text>
                </View>
              ),
            }))}
          />
        </ScrollView>
      ) : null}

      {tab === 'backtest' ? (
        <ScrollView contentContainerStyle={styles.body}>
          <BacktestPanel />
        </ScrollView>
      ) : null}

      {tab === 'indAlerts' ? (
        <ScrollView contentContainerStyle={styles.body}>
          <IndicatorAlertsPanel />
        </ScrollView>
      ) : null}

      {tab === 'calendar' ? (
        <ScrollView contentContainerStyle={styles.body}>
          <CalendarPanel />
        </ScrollView>
      ) : null}

      {tab === 'layouts' ? (
        <ScrollView contentContainerStyle={styles.body}>
          <LayoutPanel
            frameTfs={frameTfs}
            frameSymbols={frameSymbols}
            onApply={async (layout) => {
              setFrameSymbols(layout.frameSymbols);
              setFrameTfs(layout.frameTfs);
              await AsyncStorage.setItem(
                'matrix.frameSymbols.v1',
                JSON.stringify(layout.frameSymbols)
              );
              await AsyncStorage.setItem(
                'matrix.frameTimeframes.v1',
                JSON.stringify(layout.frameTfs)
              );
            }}
          />
        </ScrollView>
      ) : null}

      {tab === 'ai' ? (
        <View style={{ flex: 1, padding: spacing.md }}>
          <AiPanel />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { color: colors.text, fontSize: 22, fontWeight: '900', textAlign: 'right' },
  sub: { color: colors.textDim, fontSize: 12, textAlign: 'right' },
  tabsScroll: { maxHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  tabs: { flexDirection: 'row-reverse', padding: spacing.sm, gap: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tabOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  tabText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  tabTextOn: { color: colors.accent },
  body: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: 8, paddingBottom: 48 },
  pageScroll: { flex: 1 },
  toolbar: { gap: 6 },
  gridHint: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  label: { color: colors.textMuted, fontWeight: '700', textAlign: 'right' },
  filters: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  chipText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  chipTextOn: { color: colors.accent },
  hitCard: {
    flex: 1,
    height: '100%',
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 4,
    justifyContent: 'center',
  },
  runBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  runText: { color: '#042F2E', fontWeight: '800' },
  sym: { color: colors.accent, fontWeight: '800', textAlign: 'right', fontSize: 15 },
  meta: { color: colors.text, textAlign: 'right', fontSize: 13 },
  match: { color: colors.textDim, textAlign: 'right', fontSize: 11 },
});
