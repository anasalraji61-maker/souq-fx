import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, spacing, buttons } from '../theme';
import { api, type ChartSeries } from '../api';
import { MatrixChart } from '../chart/MatrixChart';
import { livePriceForChart } from '../chart/liveSeries';
import { useMultiLiveTicks } from '../hooks/useMultiLiveTicks';
import { type Timeframe } from '../timeframes';
import { mockSeries } from '../mock';

type Props = {
  visible: boolean;
  onClose: () => void;
  symbols?: [string, string, string, string];
  timeframe?: Timeframe;
};

const DEFAULT: [string, string, string, string] = ['EURUSD', 'GBPUSD', 'XAUUSD', 'DXY'];
const BASES: Record<string, number> = {
  EURUSD: 1.0854,
  GBPUSD: 1.2732,
  XAUUSD: 2348.6,
  DXY: 104.25,
  USDJPY: 157.4,
  BTCUSD: 67420,
};

export function QuadChartModal({
  visible,
  onClose,
  symbols = DEFAULT,
  timeframe = '15m',
}: Props) {
  const { width, height } = useWindowDimensions();
  const phone = width < 700;
  const cellH = phone ? height * 0.28 : height * 0.32;
  const [series, setSeries] = useState<(ChartSeries | null)[]>([null, null, null, null]);
  const ticks = useMultiLiveTicks(symbols, visible);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    (async () => {
      const out: ChartSeries[] = [];
      for (const sym of symbols) {
        try {
          out.push(await api.chart(sym, timeframe));
        } catch {
          out.push(mockSeries(sym, BASES[sym] ?? 1, timeframe, 80));
        }
      }
      if (alive) setSeries(out);
    })();
    return () => {
      alive = false;
    };
  }, [visible, symbols, timeframe]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.top}>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
          >
            <Text style={styles.close}>إغلاق</Text>
          </Pressable>
          <Text style={styles.title}>محطة 2×2 · {timeframe}</Text>
        </View>
        <View style={[styles.grid, phone && styles.gridPhone]}>
          {symbols.map((sym, i) => (
            <View key={sym} style={[styles.cell, phone && styles.cellPhone]}>
              <Text style={styles.sym}>{sym}</Text>
              {series[i] ? (
                <MatrixChart
                  series={series[i]!}
                  height={cellH}
                  interactive={false}
                  persistDrawings={false}
                  livePrice={livePriceForChart(series[i]!, ticks[sym] ?? null, {
                    tickAsOf: ticks[sym]?.source.as_of ?? null,
                    timeframe: series[i]!.timeframe,
                  })}
                  liveTickSource={ticks[sym]?.source ?? null}
                  accent={sym === 'DXY' ? colors.dxy : colors.accent}
                  initialLens="clean"
                  initialIndicators={[]}
                />
              ) : (
                <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
              )}
            </View>
          ))}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  top: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  close: { color: colors.accent, fontWeight: '800' },
  title: { flex: 1, color: colors.text, fontWeight: '800', textAlign: 'right', fontSize: 16 },
  grid: {
    flex: 1,
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  gridPhone: { flexDirection: 'column', flexWrap: 'nowrap' },
  cell: {
    width: '49%',
    flexGrow: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
    minHeight: 200,
  },
  cellPhone: { width: '100%' },
  sym: { color: colors.accent, fontWeight: '800', textAlign: 'right', marginBottom: 4 },
});
