import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { colors, radii, spacing, buttons, selectedMarkerWidth } from '../theme';
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

const PRIMARY_TABS: DockTabId[] = ['draw', 'alerts', 'calendar', 'journal'];

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

  /** DESIGN-PRO §5.4: خمسة مداخل بالشريط — أربعة أساسية و«المزيد» يفتح بقية اللوحات شبكةً. */
  const primary = TABS.filter((tb) => PRIMARY_TABS.includes(tb.id));
  const secondary = TABS.filter((tb) => !PRIMARY_TABS.includes(tb.id));
  const [moreOpen, setMoreOpen] = useState(false);
  // لوحةٌ فُتحت من خارج الرصيف (الشاشة تضبط `tab`) تُغلق شبكة «المزيد» لا تُرسم فوقها.
  useEffect(() => {
    if (tab != null) setMoreOpen(false);
  }, [tab]);
  const moreOn = moreOpen || (tab != null && !PRIMARY_TABS.includes(tab));
  const activeLabel = TABS.find((tb) => tb.id === tab)?.label;

  const toggle = (id: Exclude<DockTabId, null>) => {
    setMoreOpen(false);
    onTab(tab === id ? null : id);
  };
  const toggleMore = () => {
    if (moreOpen) {
      setMoreOpen(false);
      return;
    }
    onTab(null);
    setMoreOpen(true);
  };
  const closeSheet = () => {
    setMoreOpen(false);
    onTab(null);
  };

  return (
    <View style={styles.wrap}>
      {tab || moreOpen ? (
        <View style={styles.sheet}>
          <View style={[styles.sheetHead, rtl && styles.sheetHeadRtl]}>
            <Pressable
              accessibilityRole="button"
              onPress={closeSheet}
              style={({ pressed }) => [
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              hitSlop={8}
              accessibilityLabel={`${t.dockHideA11yPrefix}${moreOpen ? t.dockMoreTab : (activeLabel ?? t.dockPanelFallback)}`}
            >
              <Text style={styles.close}>{t.dockHideBtn}</Text>
            </Pressable>
            <Text style={styles.sheetTitle}>
              {moreOpen ? t.dockMoreTab : (activeLabel ?? t.dockLibraryFallback)}
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
            {moreOpen ? (
              <View style={styles.drawGrid}>
                {secondary.map((tb) => (
                  <Pressable
                    accessibilityRole="button"
                    key={tb.id}
                    style={({ pressed }) => [
                      styles.drawChip,
                      pressed && {
                        opacity: buttons.pressedOpacity,
                        transform: [{ scale: buttons.pressedScale }],
                      },
                    ]}
                    onPress={() => toggle(tb.id)}
                    accessibilityLabel={`${t.dockTabA11yPrefix}${tb.label}`}
                  >
                    <Text style={styles.drawChipMark}>{tb.mark}</Text>
                    <Text style={styles.drawChipLabel} numberOfLines={1}>
                      {tb.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
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
                        {on ? <View style={[styles.chipMarker, styles.chipMarkerNeutral]} /> : null}
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
                        {on ? <View style={styles.chipMarker} /> : null}
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

      <View style={[styles.tabs, rtl && styles.tabsRtl]}>
        {primary.map((tb) => {
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
              {on ? <View style={styles.tabMarker} /> : null}
              <Text style={[styles.tabMark, on && styles.tabMarkOn]}>{tb.mark}</Text>
              <Text style={[styles.tabLabel, on && styles.tabLabelOn]} numberOfLines={1}>
                {tb.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityState={{ selected: moreOn, expanded: moreOpen }}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.tab,
            moreOn && styles.tabOn,
            pressed && {
              opacity: buttons.pressedOpacity,
              transform: [{ scale: buttons.pressedScale }],
            },
          ]}
          onPress={toggleMore}
          accessibilityLabel={`${t.dockTabA11yPrefix}${t.dockMoreTab}${!moreOpen && moreOn && activeLabel ? ` · ${activeLabel}` : ''}`}
        >
          {moreOn ? <View style={styles.tabMarker} /> : null}
          <Text style={[styles.tabMark, moreOn && styles.tabMarkOn]}>⋯</Text>
          <Text style={[styles.tabLabel, moreOn && styles.tabLabelOn]} numberOfLines={1}>
            {t.dockMoreTab}
          </Text>
        </Pressable>
      </View>
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
    paddingVertical: 8,
  },
  sheetHeadRtl: { flexDirection: 'row-reverse' },
  sheetTitle: { color: colors.text, fontWeight: '500', fontSize: 12 },
  close: { color: colors.textMuted, fontWeight: '500', fontSize: 11 },
  sheetBody: { maxHeight: 280 },
  sheetContent: { paddingHorizontal: spacing.sm, paddingBottom: 12, gap: spacing.sm },
  community: { gap: spacing.sm },
  drawWrap: { gap: 4 },
  drawSectionTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    overflow: 'hidden',
  },
  // DESIGN-PRO §4: تعبئة محايدة + علامة 2px سفلية؛ العدسة (مختارة دائماً) علامتها محايدة كي
  // يبقى التأكيد لأداة الرسم وحدها (§1).
  drawChipOn: { backgroundColor: colors.selectedFill },
  chipMarker: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: 0,
    height: selectedMarkerWidth,
    backgroundColor: colors.accent,
  },
  chipMarkerNeutral: { backgroundColor: colors.text },
  drawChipMark: { color: colors.textMuted, fontSize: 16, fontWeight: '500' },
  drawChipMarkOn: { color: colors.text },
  drawChipLabel: { color: colors.textDim, fontSize: 10, fontWeight: '500' },
  drawChipLabelOn: { color: colors.text },
  tabs: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  tabsRtl: { flexDirection: 'row-reverse' },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
  },
  tabOn: { backgroundColor: colors.selectedFill },
  tabMarker: {
    position: 'absolute',
    top: 0,
    left: spacing.md,
    right: spacing.md,
    height: selectedMarkerWidth,
    backgroundColor: colors.accent,
  },
  tabMark: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },
  tabMarkOn: { color: colors.text },
  tabLabel: { color: colors.textDim, fontSize: 10, fontWeight: '500' },
  tabLabelOn: { color: colors.text },
});
