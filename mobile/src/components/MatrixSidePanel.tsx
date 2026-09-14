import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal } from 'react-native';
import { colors, radii, spacing, buttons } from '../theme';
import {
  CHART_KINDS,
  DRAW_TOOLS,
  INDICATORS,
  type ChartKind,
  type DrawTool,
  type IndicatorId,
} from '../chart/types';
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

const TITLES: Record<Exclude<EdgePanelId, null>, string> = {
  draw: 'أدوات الرسم · MATRIX',
  indicators: 'المؤشرات · MATRIX',
  kinds: 'أنواع الشارت',
  alerts: 'تنبيهات السعر',
  indAlerts: 'تنبيهات المؤشرات',
  calendar: 'التقويم الاقتصادي',
  screener: 'فحص السوق',
  reports: 'تقارير MATRIX',
  backtest: 'Strategy Backtest',
  news: 'الأخبار',
  dom: 'DOM',
  journal: 'دفتر الصفقات',
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
  if (!panel) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dim} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.head}>
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
            >
              <Text style={styles.close}>إغلاق</Text>
            </Pressable>
            <Text style={styles.title}>{TITLES[panel]}</Text>
          </View>
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {panel === 'draw' ? (
              <View style={styles.grid}>
                {DRAW_TOOLS.filter((t) => t.id !== 'none').map((t) => (
                  <Pressable
                    accessibilityRole="button"
                    key={t.id}
                    style={({ pressed }) => [
                      styles.cell,
                      pressed && {
                        opacity: buttons.pressedOpacity,
                        transform: [{ scale: buttons.pressedScale }],
                      },
                    ]}
                    onPress={() => {
                      onPickDraw(t.id);
                      onClose();
                    }}
                  >
                    <Text style={styles.cellText}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {panel === 'indicators' ? (
              <View style={styles.grid}>
                {INDICATORS.map((ind) => {
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
                    >
                      <Text style={[styles.cellText, on && styles.cellTextOn]}>{ind.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {panel === 'kinds' ? (
              <View style={styles.grid}>
                {CHART_KINDS.map((k) => (
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
                  >
                    <Text style={[styles.cellText, activeKind === k.id && styles.cellTextOn]}>
                      {k.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {panel === 'alerts' ? <AlertsPanel defaultSymbol={symbol} /> : null}
            {panel === 'indAlerts' ? <IndicatorAlertsPanel defaultSymbol={symbol} /> : null}
            {panel === 'calendar' ? <CalendarPanel /> : null}
            {panel === 'screener' ? <ScreenerMini /> : null}
            {panel === 'reports' ? <WeeklyReportPanel /> : null}
            {panel === 'backtest' ? (
              <BacktestPanel defaultSymbol={symbol} defaultTimeframe={timeframe} />
            ) : null}
            {panel === 'news' ? <NewsPanel /> : null}
            {panel === 'dom' ? (
              <DomLitePanel last={lastPrice} candles={candles} symbol={symbol} />
            ) : null}
            {panel === 'journal' ? <TradeJournalPanel /> : null}
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
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { color: colors.text, fontWeight: '900', fontSize: 14, textAlign: 'right', flex: 1 },
  close: { color: colors.accent, fontWeight: '800', fontSize: 13 },
  body: { padding: spacing.md, gap: 10, paddingBottom: 40 },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  cell: {
    paddingHorizontal: 12,
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
