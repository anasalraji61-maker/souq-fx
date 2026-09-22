import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, radii, spacing, buttons } from '../theme';
import { api } from '../api';
import { playSoftClick } from '../audio/playSoftClick';
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
import { PositionSizePanel } from '../components/PositionSizePanel';
import { NewsPanel } from '../components/NewsPanel';
import { GroupChatPanel } from '../components/GroupChatPanel';
import { VotePanel } from '../components/VotePanel';
import { FrameSizedGrid } from '../components/FrameSizedGrid';
import { DEFAULT_LAYOUT } from '../chart/layoutStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useI18n } from '../i18n/I18nContext';
import type { Dict } from '../i18n/locales';

/** كل فلتر يحمل تلميحاً عربياً مختصراً (hint) — فجوة موثَّقة بتدقيق أنس المباشر: مصطلحات
 * "RSI oversold/overbought"/"MACD up" بلا أي شرح بالعربية لمتداول لا يعرف هذه المؤشرات أصلاً. */
function buildFilters(t: Dict): { id: string; label: string; hint: string }[] {
  return [
    { id: 'ma_cross_up', label: t.filterMaUpLabel, hint: t.filterMaUpHint },
    { id: 'ma_cross_down', label: t.filterMaDownLabel, hint: t.filterMaDownHint },
    { id: 'rsi_oversold', label: t.filterRsiOversoldLabel, hint: t.filterRsiOversoldHint },
    { id: 'rsi_overbought', label: t.filterRsiOverboughtLabel, hint: t.filterRsiOverboughtHint },
    { id: 'macd_cross_up', label: t.filterMacdUpLabel, hint: t.filterMacdUpHint },
    { id: 'bullish', label: t.filterBullishLabel, hint: t.filterBullishHint },
    { id: 'bearish', label: t.filterBearishLabel, hint: t.filterBearishHint },
  ];
}

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
  | 'risk'
  | 'screener'
  | 'backtest'
  | 'indAlerts'
  | 'calendar'
  | 'layouts'
  | 'ai';

/** نفس رموز التبويبات المعتمدة أصلاً بـMatrixBottomDock.tsx (نسخة اللابتوب) —
 * توحيد بصري بين نسخة الهاتف ونسخة اللابتوب بدل تبويبات نصّ فقط بلا أيقونة. */
function buildTabs(t: Dict): { id: TabId; label: string; mark: string }[] {
  return [
    { id: 'hub', label: t.toolsTabHub, mark: '✦' },
    { id: 'reports', label: t.toolsTabReports, mark: '≡' },
    { id: 'journal', label: t.toolsTabJournal, mark: '₴' },
    { id: 'risk', label: t.toolsTabRisk, mark: '%' },
    { id: 'screener', label: t.toolsTabScreener, mark: '⌕' },
    { id: 'backtest', label: t.toolsTabBacktest, mark: '↺' },
    { id: 'indAlerts', label: t.toolsTabIndAlerts, mark: '⚡' },
    { id: 'calendar', label: t.toolsTabCalendar, mark: '◷' },
    { id: 'layouts', label: t.toolsTabLayouts, mark: '▦' },
    { id: 'ai', label: t.toolsTabAi, mark: '✧' },
  ];
}

/** قسما لوحة "إشارات ومجتمع" — تقسيم القسم الواحد (8 لوحات بشبكة سحب واحدة) إلى
 * قسمين قابلَين للتبديل بدل الاعتماد على "الصف الأول/الأسفل" (لا معنى لهما فعلياً
 * لأن ترتيب اللوحات متغيّر بيد المتداول نفسه بالسحب) — يطابق التقسيم الذي كان موصوفاً
 * أصلاً بنص العنوان الفرعي وتلميح الشبكة (مجتمع/أخبار مقابل تحليل/تنبيهات)، فقرار
 * تصميمي مستقر لا تخمين جديد. راجع docs/ROADMAP.md بند (ب.5). */
type HubSection = 'community' | 'analysis';

function buildHubSections(t: Dict): { id: HubSection; label: string; mark: string }[] {
  return [
    { id: 'community', label: t.toolsHubCommunity, mark: '◆' },
    { id: 'analysis', label: t.toolsHubAnalysis, mark: '◈' },
  ];
}

const HUB_COMMUNITY_ORDER = ['news', 'social', 'chat', 'votes'] as const;
const HUB_ANALYSIS_ORDER = ['ai', 'analysts', 'forecast', 'alerts'] as const;

export function ToolsScreen() {
  const { t, rtl } = useI18n();
  const navigation = useNavigation();
  const align = rtl ? ('right' as const) : ('left' as const);
  const FILTERS = buildFilters(t);
  const TABS = buildTabs(t);
  const HUB_SECTIONS = buildHubSections(t);
  const [tab, setTab] = useState<TabId>('hub');
  const [hubSection, setHubSection] = useState<HubSection>('community');
  const [tf, setTf] = useState<Timeframe>('15m');
  const [signalSym, setSignalSym] = useState('EURUSD');
  const [selected, setSelected] = useState<string[]>(['ma_cross_up']);
  const [results, setResults] = useState<Hit[]>([]);
  const [providerConfigured, setProviderConfigured] = useState<boolean | null>(null);
  const [scanDone, setScanDone] = useState(false);
  /** كم رمزاً قُرئ فعلاً وأيّها تعذّر — بدونها «لا نتائج» بعد حدّ طلبات المزوّد تُقرأ «لا تطابق». */
  const [scanInfo, setScanInfo] = useState<{ scanned?: number; failed: string[]; total?: number; tf: string }>({
    failed: [],
    tf: '15m',
  });
  const [loading, setLoading] = useState(false);
  const [frameTfs, setFrameTfs] = useState<string[]>([...DEFAULT_LAYOUT.frameTfs]);
  const [frameSymbols, setFrameSymbols] = useState<[string, string, string]>(
    DEFAULT_LAYOUT.frameSymbols
  );

  // يُعاد القراءة عند كل عودة للتبويب: كانت تُقرأ مرة عند التركيب فقط، فتغيير أزواج/فريمات الشارت بالشاشة
  // الرئيسية ثم «حفظ التخطيط الحالي» هنا يحفظ إعداداً قديماً، و«الحالي» يُعلَّم على تخطيط غير المطبَّق.
  React.useEffect(() => {
    const load = async () => {
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
    };
    load();
    const unsub = (
      navigation as unknown as { addListener: (e: 'focus', cb: () => void) => () => void }
    ).addListener('focus', load);
    return unsub;
  }, [navigation]);

  /** لا رمز قُرئ أصلاً (كل الطلبات فشلت) — «لا تطابق» هنا كاذبة. */
  const scanNone = scanInfo.scanned === 0 && scanInfo.failed.length > 0;

  /** نتائج فحص سابق لا تُعرض تحت فلاتر/فريم تغيّرت — كانت تبقى فتُقرأ كأنها نتيجة الاختيار الجديد. */
  const scanKey = `${tf}|${selected.join(',')}`;
  const lastScanKey = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (lastScanKey.current !== null && lastScanKey.current !== scanKey) {
      lastScanKey.current = null;
      setResults([]);
      setScanDone(false);
      setScanInfo({ failed: [], tf });
    }
  }, [scanKey, tf]);
  const filterLabel = (id: string) => FILTERS.find((f) => f.id === id)?.label ?? id;
  /** نتيجة فحص بلا طريق للشارت = نسخ الرمز يدوياً والبحث عنه — الآن نقرة تفتح شارت التركيز
   * بنفس الفريم المفحوص (TerminalScreen يقرأ openSymbol/openTf؛ nonce يسمح بفتح نفس الرمز مرتين). */
  const openOnChart = (sym: string) => {
    playSoftClick();
    (navigation as unknown as { navigate: (name: string, params: object) => void }).navigate('Home', {
      openSymbol: sym,
      openTf: scanInfo.tf,
      nonce: Date.now(),
    });
  };

  const toggleFilter = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.screenerRun({ timeframe: tf, filters: selected });
      setResults(res.results);
      setScanInfo({ scanned: res.scanned, failed: res.failed ?? [], total: res.total, tf });
      lastScanKey.current = `${tf}|${selected.join(',')}`;
      setProviderConfigured(res.provider_configured !== false);
      setScanDone(true);
      playSoftClick();
    } catch {
      setResults([]);
      setScanInfo({ failed: [], tf });
      lastScanKey.current = `${tf}|${selected.join(',')}`;
      setProviderConfigured(null);
      setScanDone(true);
    } finally {
      setLoading(false);
    }
  }, [tf, selected]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" />

      <View style={styles.head}>
        <Text style={[styles.title, { textAlign: align }]}>{t.toolsTitle}</Text>
        <Text style={[styles.sub, { textAlign: align }]}>{t.toolsSub}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
        <View style={[styles.tabs, rtl && styles.tabsRtl]}>
          {TABS.map((tItem) => (
            <Pressable
              accessibilityRole="button"
              key={tItem.id}
              style={({ pressed }) => [
                styles.tab,
                tab === tItem.id && styles.tabOn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => setTab(tItem.id)}
              accessibilityLabel={`${t.a11yTabPrefix}: ${tItem.label}`}
            >
              <Text style={[styles.tabMark, tab === tItem.id && styles.tabMarkOn]}>{tItem.mark}</Text>
              <Text style={[styles.tabText, tab === tItem.id && styles.tabTextOn]}>{tItem.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {tab === 'hub' ? (
        <ScrollView
          style={styles.pageScroll}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.toolbar}>
            <TimeframeBar value={tf} onChange={setTf} compact />
            <View style={[styles.filters, rtl && styles.filtersRtl]}>
              {['EURUSD', 'GBPUSD', 'XAUUSD', 'DXY'].map((s) => (
                <Pressable
                  accessibilityRole="button"
                  key={s}
                  style={({ pressed }) => [
                    styles.chip,
                    signalSym === s && styles.chipOn,
                    pressed && {
                      opacity: buttons.pressedOpacity,
                      transform: [{ scale: buttons.pressedScale }],
                    },
                  ]}
                  onPress={() => setSignalSym(s)}
                  accessibilityLabel={`${t.a11ySignalSymbolPrefix}: ${s}`}
                >
                  <Text style={[styles.chipText, signalSym === s && styles.chipTextOn]}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={[styles.hubSectionTabs, rtl && styles.hubSectionTabsRtl]}>
            {HUB_SECTIONS.map((s) => (
              <Pressable
                accessibilityRole="button"
                key={s.id}
                style={({ pressed }) => [
                  styles.hubSectionTab,
                  hubSection === s.id && styles.hubSectionTabOn,
                  pressed && {
                    opacity: buttons.pressedOpacity,
                    transform: [{ scale: buttons.pressedScale }],
                  },
                ]}
                onPress={() => setHubSection(s.id)}
                accessibilityLabel={`${t.a11yHubSectionPrefix}: ${s.label}`}
              >
                <Text style={[styles.hubSectionMark, hubSection === s.id && styles.hubSectionMarkOn]}>
                  {s.mark}
                </Text>
                <Text style={[styles.hubSectionText, hubSection === s.id && styles.hubSectionTextOn]}>
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.gridHint}>{t.toolsGridHint}</Text>
          {hubSection === 'community' ? (
            <FrameSizedGrid
              key="hub-community"
              storageKey="matrix.tools.hub.community.order.v1"
              showAll
              defaultOrder={[...HUB_COMMUNITY_ORDER]}
              items={[
                { id: 'news', node: <NewsPanel embedded /> },
                {
                  id: 'social',
                  node: <SocialConsensusPanel embedded symbol={signalSym} timeframe={tf} />,
                },
                { id: 'chat', node: <GroupChatPanel embedded /> },
                { id: 'votes', node: <VotePanel embedded /> },
              ]}
            />
          ) : (
            <FrameSizedGrid
              key="hub-analysis"
              storageKey="matrix.tools.hub.analysis.order.v1"
              showAll
              defaultOrder={[...HUB_ANALYSIS_ORDER]}
              items={[
                { id: 'ai', node: <AiPanel embedded symbol={signalSym} /> },
                {
                  id: 'analysts',
                  node: <AnalystsPanel embedded symbol={signalSym} timeframe={tf} />,
                },
                {
                  id: 'forecast',
                  node: <IndicatorForecastPanel embedded symbol={signalSym} timeframe={tf} />,
                },
                {
                  id: 'alerts',
                  node: <AlertsPanel embedded defaultSymbol={signalSym} />,
                },
              ]}
            />
          )}
        </ScrollView>
      ) : null}

      {tab === 'reports' ? (
        <ScrollView contentContainerStyle={styles.body}>
          <WeeklyReportPanel grid />
        </ScrollView>
      ) : null}

      {tab === 'journal' ? (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <TradeJournalPanel defaultSymbol={signalSym} />
        </ScrollView>
      ) : null}

      {tab === 'risk' ? (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <PositionSizePanel defaultSymbol={signalSym} />
        </ScrollView>
      ) : null}

      {tab === 'screener' ? (
        <ScrollView contentContainerStyle={styles.body}>
          <TimeframeBar value={tf} onChange={setTf} />
          <Text style={[styles.label, { textAlign: align }]}>{t.toolsFiltersLabel}</Text>
          <View style={[styles.filters, rtl && styles.filtersRtl]}>
            {FILTERS.map((f) => (
              <Pressable
                accessibilityRole="button"
                key={f.id}
                style={({ pressed }) => [
                  styles.chip,
                  selected.includes(f.id) && styles.chipOn,
                  pressed && {
                    opacity: buttons.pressedOpacity,
                    transform: [{ scale: buttons.pressedScale }],
                  },
                ]}
                onPress={() => toggleFilter(f.id)}
                accessibilityLabel={`${t.a11yFilterPrefix}: ${f.label} — ${f.hint}`}
              >
                <Text style={[styles.chipText, selected.includes(f.id) && styles.chipTextOn]}>
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </View>
          {selected.length ? (
            <View style={styles.filterHints}>
              {FILTERS.filter((f) => selected.includes(f.id)).map((f) => (
                <Text key={f.id} style={[styles.filterHintText, { textAlign: align }]}>
                  {f.label}: {f.hint}
                </Text>
              ))}
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.runBtn,
              !loading && !selected.length && styles.runBtnDisabled,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={run}
            disabled={loading || !selected.length}
            accessibilityState={{ disabled: loading || !selected.length }}
            accessibilityLabel={!selected.length ? t.screenerRunNeedFilter : t.screenerRunBtn}
            hitSlop={8}
          >
            <Text style={styles.runText}>{loading ? t.screenerRunning : t.screenerRunBtn}</Text>
          </Pressable>
          {loading ? <ActivityIndicator color={colors.accent} /> : null}
          {!loading && scanDone && providerConfigured === false ? (
            <Text style={[styles.scanHint, { textAlign: align }]}>{t.screenerNeedApiKey}</Text>
          ) : null}
          {!loading && scanDone && providerConfigured === true && scanNone ? (
            <Text style={[styles.scanHint, { textAlign: align }]}>{t.screenerScanNone}</Text>
          ) : null}
          {!loading && scanDone && providerConfigured === true && !scanNone && scanInfo.failed.length > 0 ? (
            <Text style={[styles.scanHint, { textAlign: align }]}>
              {t.screenerScanPartial
                .replace('{k}', String(scanInfo.scanned ?? 0))
                .replace('{total}', String(scanInfo.total ?? scanInfo.failed.length))
                .replace('{list}', scanInfo.failed.join(rtl ? '، ' : ', '))}
            </Text>
          ) : null}
          {!loading && scanDone && providerConfigured === true && !scanNone && results.length === 0 ? (
            <Text style={[styles.scanHint, { textAlign: align }]}>
              {scanInfo.scanned != null
                ? t.screenerNoMatchOf
                    .replace('{k}', String(scanInfo.scanned))
                    .replace('{tf}', scanInfo.tf)
                : t.screenerNoResults}
            </Text>
          ) : null}
          {!loading && scanDone && providerConfigured === null ? (
            <Text style={[styles.scanHint, { textAlign: align }]}>{t.screenerFailed}</Text>
          ) : null}
          {!loading && results.length > 0 ? (
            <Text style={[styles.filterHintText, { textAlign: align }]}>{t.screenerTapToOpen}</Text>
          ) : null}
          {!loading && results.length > 8 ? (
            <Text style={[styles.filterHintText, { textAlign: align }]}>
              {t.screenerShowingOf.replace('{n}', '8').replace('{total}', String(results.length))}
            </Text>
          ) : null}
          <FrameSizedGrid
            storageKey="matrix.tools.screener.order.v1"
            showAll
            items={results.slice(0, 8).map((r) => ({
              id: r.symbol,
              node: (
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.hitCard,
                    pressed && {
                      opacity: buttons.pressedOpacity,
                      transform: [{ scale: buttons.pressedScale }],
                    },
                  ]}
                  onPress={() => openOnChart(r.symbol)}
                  accessibilityLabel={`${t.screenerOpenChartA11y}: ${r.symbol} ${scanInfo.tf}`}
                >
                  <Text style={[styles.sym, { textAlign: align }]}>{r.symbol}</Text>
                  <Text style={[styles.meta, { textAlign: align }]}>
                    {r.last} · RSI {r.rsi} ·{' '}
                    <Text
                      style={{
                        color: r.change_pct >= 0 ? colors.bull : colors.bear,
                        fontWeight: '800',
                      }}
                    >
                      {r.change_pct >= 0 ? '+' : ''}
                      {r.change_pct}%
                    </Text>{' '}
                    <Text style={styles.match}>{t.screenerChangeSpan}</Text>
                  </Text>
                  <Text style={[styles.match, { textAlign: align }]}>
                    {r.filters_matched.map(filterLabel).join(' · ')}
                  </Text>
                </Pressable>
              ),
            }))}
          />
        </ScrollView>
      ) : null}

      {tab === 'backtest' ? (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <BacktestPanel defaultSymbol={signalSym} />
        </ScrollView>
      ) : null}

      {tab === 'indAlerts' ? (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <IndicatorAlertsPanel defaultSymbol={signalSym} />
        </ScrollView>
      ) : null}

      {tab === 'calendar' ? (
        <ScrollView contentContainerStyle={styles.body}>
          <CalendarPanel symbol={signalSym} />
        </ScrollView>
      ) : null}

      {tab === 'layouts' ? (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
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
              // الشاشة الرئيسية مركّبة مسبقاً وتقرأ التخزين عند التركيب فقط — كان التطبيق يبدو بلا أثر
              // حتى إعادة تشغيل التطبيق. نمرّر التخطيط كمعاملات (نفس نمط openSymbol) وننتقل للشارت.
              (navigation as unknown as { navigate: (name: string, params: object) => void }).navigate(
                'Home',
                {
                  layoutSymbols: layout.frameSymbols,
                  layoutTfs: layout.frameTfs,
                  layoutNonce: Date.now(),
                }
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
  title: { color: colors.text, fontSize: 22, fontWeight: '900' },
  sub: { color: colors.textDim, fontSize: 12 },
  tabsScroll: { maxHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  tabs: { flexDirection: 'row', padding: spacing.sm, gap: spacing.sm },
  tabsRtl: { flexDirection: 'row-reverse' },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  tabMark: { color: colors.textDim, fontWeight: '800', fontSize: 13 },
  tabMarkOn: { color: colors.accent },
  tabText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  tabTextOn: { color: colors.accent },
  body: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.sm, paddingBottom: 48 },
  pageScroll: { flex: 1 },
  toolbar: { gap: 6 },
  hubSectionTabs: { flexDirection: 'row', gap: spacing.sm },
  hubSectionTabsRtl: { flexDirection: 'row-reverse' },
  hubSectionTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hubSectionTabOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  hubSectionMark: { color: colors.textDim, fontWeight: '800', fontSize: 13 },
  hubSectionMarkOn: { color: colors.accent },
  hubSectionText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  hubSectionTextOn: { color: colors.accent, fontWeight: '900' },
  gridHint: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  label: { color: colors.textMuted, fontWeight: '700' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filtersRtl: { flexDirection: 'row-reverse' },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  chipText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  chipTextOn: { color: colors.accent },
  filterHints: { gap: 3, marginTop: 2 },
  filterHintText: { color: colors.textDim, fontSize: 10 },
  hitCard: {
    flex: 1,
    height: '100%',
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    justifyContent: 'center',
  },
  runBtn: {
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
  runBtnDisabled: { opacity: 0.4 },
  runText: { color: colors.onAccent, fontWeight: '800' },
  scanHint: {
    color: colors.warn,
    fontSize: 12,
    fontWeight: '700',
    paddingVertical: spacing.sm,
  },
  sym: { color: colors.accent, fontWeight: '800', fontSize: 15 },
  meta: { color: colors.text, fontSize: 13 },
  match: { color: colors.textDim, fontSize: 11 },
});
