import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { colors, radii, spacing, buttons } from '../theme';
import type { EdgePanelId } from './MatrixSidePanel';
import { AlertsPanel } from './AlertsPanel';
import { IndicatorAlertsPanel } from './IndicatorAlertsPanel';
import { CalendarPanel } from './CalendarPanel';
import { ScreenerMini } from './ScreenerMini';
import { WeeklyReportPanel } from './WeeklyReportPanel';
import { BacktestPanel } from './BacktestPanel';
import { NewsPanel } from './NewsPanel';
import { DomLitePanel } from './DomLitePanel';
import { TradeJournalPanel } from './TradeJournalPanel';
import { GroupChatPanel } from './GroupChatPanel';
import { VotePanel } from './VotePanel';
import { AnalystsPanel } from './AnalystsPanel';
import { SocialConsensusPanel } from './SocialConsensusPanel';
import { IndicatorForecastPanel } from './IndicatorForecastPanel';
import type { Timeframe } from '../timeframes';
import { type DrawTool } from '../chart/types';
import { localizedDrawTools, localizedLenses } from '../chart/typeLabels';
import { DRAW_MARK, LENS_MARK, type MatrixLensId } from './MatrixEdgeRails';
import { useI18n } from '../i18n/I18nContext';

export type DockTabId =
  | 'draw'
  | 'screener'
  | 'backtest'
  | 'alerts'
  | 'news'
  | 'calendar'
  | 'journal'
  | 'community'
  | 'dom'
  | 'reports'
  | 'analysts'
  | 'social'
  | 'indForecast'
  | 'signals'
  | null;

type Tab = { id: Exclude<DockTabId, null>; label: string; mark: string };

type Props = {
  tab: DockTabId;
  onTab: (tab: DockTabId) => void;
  symbol: string;
  timeframe: Timeframe;
  /** فتح لوحة جانبية إضافية إن لزم */
  onOpenEdge?: (panel: EdgePanelId) => void;
  /** أداة الرسم النشطة (تبويب "رسم") */
  activeTool?: DrawTool;
  onTool?: (tool: DrawTool) => void;
  activeLens?: MatrixLensId;
  onLens?: (lens: MatrixLensId) => void;
};

export function MatrixBottomDock({
  tab,
  onTab,
  symbol,
  timeframe,
  activeTool = 'none',
  onTool,
  activeLens = 'clean',
  onLens,
}: Props) {
  const { t, rtl } = useI18n();
  const TABS: Tab[] = [
    { id: 'draw', label: t.dockDrawTab, mark: '✏' },
    { id: 'signals', label: t.dockSignalsTab, mark: '✦' },
    { id: 'analysts', label: t.dockAnalystsTab, mark: '◎' },
    { id: 'social', label: t.dockSocialTab, mark: '☰' },
    { id: 'indForecast', label: t.dockIndForecastTab, mark: '∑' },
    { id: 'screener', label: t.dockScreenerTab, mark: '⌕' },
    { id: 'backtest', label: t.backtestWord, mark: '↺' },
    { id: 'alerts', label: t.dockAlertsTab, mark: '⚡' },
    { id: 'news', label: t.dockNewsTab, mark: '📰' },
    { id: 'calendar', label: t.toolsTabCalendar, mark: '◷' },
    { id: 'journal', label: t.toolsTabJournal, mark: '▤' },
    { id: 'community', label: t.dockCommunityTab, mark: '◈' },
    { id: 'dom', label: t.depthWord, mark: '▥' },
    { id: 'reports', label: t.toolsTabReports, mark: '≡' },
  ];

  const toggle = (id: Exclude<DockTabId, null>) => {
    onTab(tab === id ? null : id);
  };

  return (
    <View style={styles.wrap}>
      {tab ? (
        <View style={styles.sheet}>
          <View style={[styles.sheetHead, rtl && styles.sheetHeadRtl]}>
            <Pressable
              accessibilityRole="button"
              onPress={() => onTab(null)}
              style={({ pressed }) => [
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              hitSlop={8}
              accessibilityLabel={`${t.dockHideA11yPrefix}${TABS.find((tb) => tb.id === tab)?.label ?? t.dockPanelFallback}`}
            >
              <Text style={styles.close}>{t.dockHideBtn}</Text>
            </Pressable>
            <Text style={styles.sheetTitle}>
              {TABS.find((tb) => tb.id === tab)?.label ?? t.dockLibraryFallback}
            </Text>
          </View>
          {/* النماذج التي تعيش داخل هذه الورقة (سعر التنبيه، حدّ تنبيه المؤشر، صفقة الدفتر، الباكتست،
              الدردشة) أزرارُها خارج ScrollView الداخلي لكل لوحة، أي داخل هذا الـScrollView. وبلا
              keyboardShouldPersistTaps تُبتلع أول لمسة بعد الكتابة لإغلاق لوحة المفاتيح وحدها: يكتب
              المتداول سعر التنبيه ثم يضغط «إضافة» فلا يحدث شيء ظاهر، ويضغط ثانية. وهذه ورقة الهاتف —
              المسار الأساسي لإنشاء تنبيه بضغطات قليلة. "handled" هو النمط المتّبع بالتطبيق أصلاً
              (شاشة الأدوات، لوح التصويت، الدفتر)، والنقر على فراغ يظلّ يُغلق لوحة المفاتيح كما هو. */}
          <ScrollView
            style={styles.sheetBody}
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {tab === 'draw' ? (
              <View style={styles.drawWrap}>
                <Text style={styles.drawSectionTitle}>{t.lensSectionTitle}</Text>
                <View style={styles.drawGrid}>
                  {localizedLenses(t).map((l) => {
                    const on = activeLens === l.id;
                    return (
                      <Pressable
                        accessibilityState={{ selected: on }}
                        accessibilityRole="button"
                        key={l.id}
                        style={({ pressed }) => [
                          styles.drawChip,
                          on && styles.drawChipOn,
                          pressed && {
                            opacity: buttons.pressedOpacity,
                            transform: [{ scale: buttons.pressedScale }],
                          },
                        ]}
                        onPress={() => onLens?.(l.id)}
                        accessibilityLabel={`${t.lensA11yPrefix}${l.label}`}
                      >
                        <Text style={[styles.drawChipMark, on && styles.drawChipMarkOn]}>
                          {LENS_MARK[l.id]}
                        </Text>
                        <Text style={[styles.drawChipLabel, on && styles.drawChipLabelOn]}>
                          {l.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.drawSectionTitle}>{t.dockDrawToolSectionTitle}</Text>
                <View style={styles.drawGrid}>
                  {localizedDrawTools(t).map((tool) => {
                    const on = activeTool === tool.id;
                    return (
                      <Pressable
                        accessibilityState={{ selected: on }}
                        accessibilityRole="button"
                        key={tool.id}
                        style={({ pressed }) => [
                          styles.drawChip,
                          on && styles.drawChipOn,
                          pressed && {
                            opacity: buttons.pressedOpacity,
                            transform: [{ scale: buttons.pressedScale }],
                          },
                        ]}
                        onPress={() => onTool?.(tool.id)}
                        accessibilityLabel={`${t.drawToolA11yPrefix}${tool.label}`}
                      >
                        <Text style={[styles.drawChipMark, on && styles.drawChipMarkOn]}>
                          {DRAW_MARK[tool.id]}
                        </Text>
                        <Text style={[styles.drawChipLabel, on && styles.drawChipLabelOn]}>
                          {tool.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}
            {tab === 'screener' ? <ScreenerMini /> : null}
            {tab === 'signals' || tab === 'analysts' ? (
              <AnalystsPanel symbol={symbol} timeframe={timeframe} />
            ) : null}
            {tab === 'signals' || tab === 'social' ? (
              <SocialConsensusPanel symbol={symbol} timeframe={timeframe} />
            ) : null}
            {tab === 'signals' || tab === 'indForecast' ? (
              <IndicatorForecastPanel symbol={symbol} timeframe={timeframe} />
            ) : null}
            {tab === 'backtest' ? (
              <BacktestPanel defaultSymbol={symbol} defaultTimeframe={timeframe} />
            ) : null}
            {tab === 'alerts' ? (
              <>
                <AlertsPanel defaultSymbol={symbol} />
                <IndicatorAlertsPanel defaultSymbol={symbol} defaultTimeframe={timeframe} />
              </>
            ) : null}
            {tab === 'news' ? <NewsPanel /> : null}
            {tab === 'calendar' ? <CalendarPanel symbol={symbol} /> : null}
            {/* الرصيف مدمج تحت الشارت وشريط أخبار `symbol` ظاهر فوقه (`TerminalScreen` `<NewsRiskBanner symbol={symbol} />`)
                ⇒ لا تكرار لتحذيره. **لا** تمرّرها بـ`MatrixSidePanel`: اللوح يغطّي الشريط */}
            {tab === 'journal' ? <TradeJournalPanel defaultSymbol={symbol} chartBannerVisible /> : null}
            {tab === 'community' ? (
              <View style={styles.community}>
                <GroupChatPanel />
                <VotePanel />
              </View>
            ) : null}
            {tab === 'dom' ? (
              <DomLitePanel symbol={symbol} />
            ) : null}
            {tab === 'reports' ? <WeeklyReportPanel /> : null}
          </ScrollView>
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
        style={styles.tabBar}
      >
        {TABS.map((tb) => {
          const on = tab === tb.id;
          return (
            <Pressable
              accessibilityState={{ selected: on }}
              accessibilityRole="button"
              key={tb.id}
              style={({ pressed }) => [
                styles.tab,
                on && styles.tabOn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => toggle(tb.id)}
              accessibilityLabel={`${t.dockTabA11yPrefix}${tb.label}`}
            >
              <Text style={[styles.tabMark, on && styles.tabMarkOn]}>{tb.mark}</Text>
              <Text style={[styles.tabLabel, on && styles.tabLabelOn]}>{tb.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  sheet: {
    maxHeight: 320,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    backgroundColor: colors.bg,
  },
  sheetHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  sheetHeadRtl: { flexDirection: 'row-reverse' },
  sheetTitle: { color: colors.text, fontWeight: '800', fontSize: 12 },
  close: { color: colors.accent, fontWeight: '700', fontSize: 11 },
  sheetBody: { maxHeight: 280 },
  sheetContent: { paddingHorizontal: spacing.sm, paddingBottom: 10, gap: spacing.sm },
  community: { gap: spacing.sm },
  drawWrap: { gap: 6 },
  drawSectionTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.3,
    marginTop: spacing.xs,
  },
  drawGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  drawChip: {
    width: 66,
    minHeight: 52,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPanel,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  drawChipOn: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  drawChipMark: { color: colors.textMuted, fontSize: 16, fontWeight: '800' },
  drawChipMarkOn: { color: colors.accent },
  drawChipLabel: { color: colors.textDim, fontSize: 10, fontWeight: '700' },
  drawChipLabelOn: { color: colors.accent },
  tabBar: { maxHeight: 44 },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPanel,
  },
  tabOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  tabMark: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
  tabMarkOn: { color: colors.accent },
  tabLabel: { color: colors.textDim, fontSize: 10, fontWeight: '700' },
  tabLabelOn: { color: colors.accent },
});
