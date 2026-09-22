import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal } from 'react-native';
import { colors, radii, spacing, buttons } from '../theme';
import { type ChartKind, type DrawTool, type IndicatorId } from '../chart/types';
import { localizedChartKinds, localizedDrawTools, localizedIndicators } from '../chart/typeLabels';
import { AlertsPanel } from './AlertsPanel';
import { CalendarPanel } from './CalendarPanel';
import { ScreenerMini } from './ScreenerMini';
import { WeeklyReportPanel } from './WeeklyReportPanel';
import { IndicatorAlertsPanel } from './IndicatorAlertsPanel';
import { BacktestPanel } from './BacktestPanel';
import { NewsPanel } from './NewsPanel';
import { DomLitePanel } from './DomLitePanel';
import { TradeJournalPanel } from './TradeJournalPanel';
import type { Candle } from '../api';
import type { Timeframe } from '../timeframes';
import { useI18n } from '../i18n/I18nContext';

export type EdgePanelId =
  | 'draw'
  | 'indicators'
  | 'kinds'
  | 'alerts'
  | 'indAlerts'
  | 'calendar'
  | 'screener'
  | 'reports'
  | 'backtest'
  | 'news'
  | 'dom'
  | 'journal'
  | null;

type Props = {
  panel: EdgePanelId;
  onClose: () => void;
  symbol: string;
  timeframe: Timeframe;
  lastPrice?: number;
  candles?: Candle[];
  onPickDraw: (tool: DrawTool) => void;
  onToggleIndicator: (id: IndicatorId) => void;
  onPickKind: (kind: ChartKind) => void;
  activeIndicators?: IndicatorId[];
  activeKind?: ChartKind;
};

export function MatrixSidePanel({
  panel,
  onClose,
  symbol,
  timeframe,
  lastPrice = 0,
  candles = [],
  onPickDraw,
  onToggleIndicator,
  onPickKind,
  activeIndicators = [],
  activeKind = 'candles',
}: Props) {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const TITLES: Record<Exclude<EdgePanelId, null>, string> = {
    draw: t.mspDrawTitle,
    indicators: t.mspIndicatorsTitle,
    kinds: t.mspKindsTitle,
    alerts: t.mspAlertsTitle,
    indAlerts: t.mspIndAlertsTitle,
    calendar: t.mspCalendarTitle,
    screener: t.mspScreenerTitle,
    reports: t.mspReportsTitle,
    backtest: t.mspBacktestTitle,
    news: t.mspNewsTitle,
    dom: t.mspDomTitle,
    journal: t.mspJournalTitle,
  };

  if (!panel) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dim} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={[styles.head, rtl && styles.headRtl]}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              hitSlop={8}
              accessibilityLabel={`${t.closeWord} ${TITLES[panel]}`}
            >
              <Text style={styles.close}>{t.closeWord}</Text>
            </Pressable>
            <Text style={[styles.title, { textAlign: align }]}>{TITLES[panel]}</Text>
          </View>
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {panel === 'draw' ? (
              <View style={[styles.grid, rtl && styles.gridRtl]}>
                {localizedDrawTools(t).filter((tool) => tool.id !== 'none').map((tool) => (
                  <Pressable
                    accessibilityRole="button"
                    key={tool.id}
                    style={({ pressed }) => [
                      styles.cell,
                      pressed && {
                        opacity: buttons.pressedOpacity,
                        transform: [{ scale: buttons.pressedScale }],
                      },
                    ]}
                    onPress={() => {
                      onPickDraw(tool.id);
                      onClose();
                    }}
                    accessibilityLabel={`${t.drawToolA11yPrefix}${tool.label}`}
                  >
                    <Text style={styles.cellText}>{tool.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {panel === 'indicators' ? (
              <View style={[styles.grid, rtl && styles.gridRtl]}>
                {localizedIndicators(t).map((ind) => {
                  const on = activeIndicators.includes(ind.id);
                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={ind.id}
                      style={({ pressed }) => [
                        styles.cell,
                        on && styles.cellOn,
                        pressed && {
                          opacity: buttons.pressedOpacity,
                          transform: [{ scale: buttons.pressedScale }],
                        },
                      ]}
                      onPress={() => onToggleIndicator(ind.id)}
                      accessibilityLabel={`${t.mspIndicatorA11yPrefix}${ind.label}${on ? t.mspIndicatorEnabledSuffix : ''}`}
                    >
                      <Text style={[styles.cellText, on && styles.cellTextOn]}>{ind.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {panel === 'kinds' ? (
              <View style={[styles.grid, rtl && styles.gridRtl]}>
                {localizedChartKinds(t).map((k) => (
                  <Pressable
                    accessibilityRole="button"
                    key={k.id}
                    style={({ pressed }) => [
                      styles.cell,
                      activeKind === k.id && styles.cellOn,
                      pressed && {
                        opacity: buttons.pressedOpacity,
                        transform: [{ scale: buttons.pressedScale }],
                      },
                    ]}
                    onPress={() => {
                      onPickKind(k.id);
                      onClose();
                    }}
                    accessibilityLabel={`${t.mspKindA11yPrefix}${k.label}`}
                  >
                    <Text style={[styles.cellText, activeKind === k.id && styles.cellTextOn]}>
                      {k.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {panel === 'alerts' ? <AlertsPanel defaultSymbol={symbol} /> : null}
            {panel === 'indAlerts' ? <IndicatorAlertsPanel defaultSymbol={symbol} defaultTimeframe={timeframe} /> : null}
            {panel === 'calendar' ? <CalendarPanel symbol={symbol} /> : null}
            {panel === 'screener' ? <ScreenerMini /> : null}
            {panel === 'reports' ? <WeeklyReportPanel /> : null}
            {panel === 'backtest' ? (
              <BacktestPanel defaultSymbol={symbol} defaultTimeframe={timeframe} />
            ) : null}
            {panel === 'news' ? <NewsPanel /> : null}
            {panel === 'dom' ? (
              <DomLitePanel last={lastPrice} candles={candles} symbol={symbol} />
            ) : null}
            {panel === 'journal' ? <TradeJournalPanel defaultSymbol={symbol} /> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  dim: { flex: 1 },
  sheet: {
    width: 340,
    maxWidth: '92%',
    backgroundColor: colors.bg,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingBottom: spacing.lg,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headRtl: { flexDirection: 'row-reverse' },
  title: { color: colors.text, fontWeight: '900', fontSize: 14, flex: 1 },
  close: { color: colors.accent, fontWeight: '800', fontSize: 13 },
  body: { padding: spacing.md, gap: 10, paddingBottom: 40 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gridRtl: { flexDirection: 'row-reverse' },
  cell: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  cellOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  cellText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  cellTextOn: { color: colors.accent },
});
