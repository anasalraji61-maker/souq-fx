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
import type { Candle } from '../api';
import type { Timeframe } from '../timeframes';

export type DockTabId =
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

const TABS: Tab[] = [
  { id: 'signals', label: 'توقعات', mark: '✦' },
  { id: 'analysts', label: 'محللون', mark: '◎' },
  { id: 'social', label: 'قنوات', mark: '☰' },
  { id: 'indForecast', label: 'مؤشرات+', mark: '∑' },
  { id: 'screener', label: 'ماسح', mark: '⌕' },
  { id: 'backtest', label: 'اختبار', mark: '↺' },
  { id: 'alerts', label: 'تنبيهات', mark: '⚡' },
  { id: 'news', label: 'أخبار', mark: '📰' },
  { id: 'calendar', label: 'تقويم', mark: '◷' },
  { id: 'journal', label: 'PnL', mark: '₴' },
  { id: 'community', label: 'مجتمع', mark: '◈' },
  { id: 'dom', label: 'عمق', mark: '▥' },
  { id: 'reports', label: 'تقارير', mark: '≡' },
];

type Props = {
  tab: DockTabId;
  onTab: (tab: DockTabId) => void;
  symbol: string;
  timeframe: Timeframe;
  lastPrice: number;
  candles?: Candle[];
  /** فتح لوحة جانبية إضافية إن لزم */
  onOpenEdge?: (panel: EdgePanelId) => void;
};

export function MatrixBottomDock({
  tab,
  onTab,
  symbol,
  timeframe,
  lastPrice,
  candles = [],
}: Props) {
  const toggle = (id: Exclude<DockTabId, null>) => {
    onTab(tab === id ? null : id);
  };

  return (
    <View style={styles.wrap}>
      {tab ? (
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Pressable
              onPress={() => onTab(null)}
              style={({ pressed }) => [
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
            >
              <Text style={styles.close}>إخفاء</Text>
            </Pressable>
            <Text style={styles.sheetTitle}>
              {TABS.find((t) => t.id === tab)?.label ?? 'مكتبة'}
            </Text>
          </View>
          <ScrollView
            style={styles.sheetBody}
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}
          >
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
                <IndicatorAlertsPanel defaultSymbol={symbol} />
              </>
            ) : null}
            {tab === 'news' ? <NewsPanel /> : null}
            {tab === 'calendar' ? <CalendarPanel /> : null}
            {tab === 'journal' ? <TradeJournalPanel /> : null}
            {tab === 'community' ? (
              <View style={styles.community}>
                <GroupChatPanel />
                <VotePanel />
              </View>
            ) : null}
            {tab === 'dom' ? (
              <DomLitePanel last={lastPrice} candles={candles} symbol={symbol} />
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
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <Pressable
              key={t.id}
              style={({ pressed }) => [
                styles.tab,
                on && styles.tabOn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => toggle(t.id)}
            >
              <Text style={[styles.tabMark, on && styles.tabMarkOn]}>{t.mark}</Text>
              <Text style={[styles.tabLabel, on && styles.tabLabelOn]}>{t.label}</Text>
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
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  sheetTitle: { color: colors.text, fontWeight: '800', fontSize: 12 },
  close: { color: colors.accent, fontWeight: '700', fontSize: 11 },
  sheetBody: { maxHeight: 280 },
  sheetContent: { paddingHorizontal: spacing.sm, paddingBottom: 10, gap: 8 },
  community: { gap: 8 },
  tabBar: { maxHeight: 44 },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
