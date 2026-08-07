import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, spacing } from '../theme';
import { api, type ChartSeries } from '../api';
import { MatrixChart } from '../chart/MatrixChart';
import { TimeframeBar } from './TimeframeBar';
import { type Timeframe } from '../timeframes';
import { WATCHLIST } from '../chart/watchlist';
import { loadWatchlistItems } from '../chart/watchlistStore';
import { formatPrice } from '../chart/math';
import { mockSeries } from '../mock';
import { SymbolSearchBar } from './SymbolSearchBar';
import { AlertsPanel } from './AlertsPanel';
import { SymbolSnapshot } from './SymbolSnapshot';
import { BacktestPanel } from './BacktestPanel';
import { IndicatorAlertsPanel } from './IndicatorAlertsPanel';
import { useLiveTicks } from '../hooks/useLiveTicks';
import type { ChartKind, DrawTool, IndicatorId, LensMode } from '../chart/types';

type Props = {
  visible: boolean;
  symbol: string;
  timeframe: Timeframe;
  onClose: () => void;
  onSymbolChange?: (symbol: string) => void;
  initialTool?: DrawTool;
  initialLens?: LensMode;
  initialKind?: ChartKind;
  initialIndicators?: IndicatorId[];
};

const BASES: Record<string, number> = {
  DXY: 104.25,
  EURUSD: 1.0854,
  GBPUSD: 1.2732,
  USDJPY: 157.42,
  AUDUSD: 0.662,
  USDCAD: 1.364,
  NZDUSD: 0.601,
  USDCHF: 0.884,
  EURJPY: 162.15,
  GBPJPY: 200.4,
  EURGBP: 0.852,
  AUDJPY: 104.2,
  EURAUD: 1.64,
  EURCHF: 0.96,
  CADJPY: 115.3,
  XAUUSD: 2348.6,
  XAGUSD: 28.4,
  USOIL: 78.35,
  UKOIL: 82.1,
  BTCUSD: 67420,
  ETHUSD: 3450,
};

export function FocusChartModal({
  visible,
  symbol,
  timeframe: initialTf,
  onClose,
  onSymbolChange,
  initialTool,
  initialLens,
  initialKind,
  initialIndicators,
}: Props) {
  const { width, height } = useWindowDimensions();
  const phone = width < 700;
  const [sym, setSym] = useState(symbol);
  const [compareSym, setCompareSym] = useState<string | null>(null);
  const [tf, setTf] = useState<Timeframe>(initialTf);
  const [series, setSeries] = useState<ChartSeries | null>(null);
  const [compareSeries, setCompareSeries] = useState<ChartSeries | null>(null);
  const [loading, setLoading] = useState(false);
  const [watchlist, setWatchlist] = useState<{ symbol: string; label: string; group?: string }[]>([
    ...WATCHLIST,
  ]);
  const livePrice = useLiveTicks(sym, visible);

  useEffect(() => {
    if (visible) void loadWatchlistItems().then(setWatchlist);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    setSym(symbol);
    setTf(initialTf);
    setCompareSym(null);
  }, [visible, symbol, initialTf]);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const s = await api.chart(sym, tf);
        if (alive) setSeries(s);
        if (compareSym && alive) {
          try {
            const c = await api.chart(compareSym, tf);
            if (alive) setCompareSeries(c);
          } catch {
            if (alive) setCompareSeries(mockSeries(compareSym, BASES[compareSym] ?? 1, tf));
          }
        } else if (alive) {
          setCompareSeries(null);
        }
      } catch {
        if (alive) setSeries(mockSeries(sym, BASES[sym] ?? 1, tf));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [visible, sym, tf, compareSym]);

  const pick = (next: string) => {
    setSym(next);
    onSymbolChange?.(next);
  };

  const toggleCompare = (next: string) => {
    if (next === sym) return;
    setCompareSym((prev) => (prev === next ? null : next));
  };

  const alertFromDrawing = async (price: number) => {
    try {
      await api.createAlert({
        symbol: sym,
        condition: price >= (livePrice ?? series?.last ?? price) ? 'above' : 'below',
        price,
        note: 'من خط رسم',
      });
    } catch {
      /* ignore */
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.top}>
          <Pressable onPress={onClose}>
            <Text style={styles.close}>إغلاق</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>
              {sym}
              {compareSym ? ` vs ${compareSym}` : ''}
            </Text>
            <Text style={styles.sub}>محطة التحليل · رسم · مقارنة · تنبيهات</Text>
          </View>
          {series ? (
            <Text style={styles.price}>
              {formatPrice(livePrice ?? series.last)}
              {livePrice != null ? ' · حي' : ''}
            </Text>
          ) : null}
        </View>

        <View style={[styles.body, phone && styles.bodyPhone]}>
          {!phone ? (
            <ScrollView style={styles.watch} contentContainerStyle={{ gap: 6, padding: 8 }}>
              <Text style={styles.watchTitle}>قائمة المراقبة</Text>
              <SymbolSearchBar onPick={pick} />
              <Text style={styles.watchHint}>اضغط مرتين للمقارنة</Text>
              {watchlist.map((w) => (
                <Pressable
                  key={w.symbol}
                  style={[
                    styles.watchItem,
                    sym === w.symbol && styles.watchOn,
                    compareSym === w.symbol && styles.watchCompare,
                  ]}
                  onPress={() => pick(w.symbol)}
                  onLongPress={() => toggleCompare(w.symbol)}
                >
                  <Text style={styles.watchSym}>{w.symbol}</Text>
                  <Text style={styles.watchLabel}>{w.label}</Text>
                  {compareSym === w.symbol ? (
                    <Text style={styles.compareTag}>مقارنة</Text>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <ScrollView style={styles.main} contentContainerStyle={{ padding: spacing.md, gap: 10 }}>
            {phone ? (
              <>
                <SymbolSearchBar onPick={pick} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
                    {watchlist.map((w) => (
                      <Pressable
                        key={w.symbol}
                        style={[styles.pill, sym === w.symbol && styles.pillOn]}
                        onPress={() => pick(w.symbol)}
                        onLongPress={() => toggleCompare(w.symbol)}
                      >
                        <Text style={[styles.pillText, sym === w.symbol && styles.pillTextOn]}>
                          {w.symbol}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
                {compareSym ? (
                  <Text style={styles.compareNote}>مقارنة مع {compareSym} (بنفسجي)</Text>
                ) : null}
              </>
            ) : null}

            <TimeframeBar value={tf} onChange={setTf} />
            <SymbolSnapshot symbol={sym} timeframe={tf} />

            {loading || !series ? (
              <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
            ) : (
              <MatrixChart
                series={series}
                compareSeries={compareSeries}
                height={Math.max(320, height * (phone ? 0.55 : 0.62))}
                interactive
                persistDrawings
                accent={sym === 'DXY' ? colors.dxy : colors.accent}
                livePrice={livePrice}
                onCreateAlert={alertFromDrawing}
                initialTool={initialTool}
                initialLens={initialLens}
                initialKind={initialKind}
                initialIndicators={initialIndicators}
              />
            )}

            <AlertsPanel defaultSymbol={sym} />
            <IndicatorAlertsPanel defaultSymbol={sym} />
            <BacktestPanel defaultSymbol={sym} defaultTimeframe={tf} />
          </ScrollView>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  close: { color: colors.accent, fontWeight: '800' },
  title: { color: colors.text, fontSize: 18, fontWeight: '900', textAlign: 'right' },
  sub: { color: colors.textDim, fontSize: 11, textAlign: 'right' },
  price: { color: colors.text, fontWeight: '700', fontSize: 14 },
  body: { flex: 1, flexDirection: 'row-reverse' },
  bodyPhone: { flexDirection: 'column' },
  watch: {
    width: 200,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  watchTitle: {
    color: colors.textMuted,
    fontWeight: '800',
    fontSize: 11,
    textAlign: 'right',
    marginBottom: 4,
  },
  watchHint: { color: colors.textDim, fontSize: 9, textAlign: 'right', marginBottom: 6 },
  watchItem: {
    padding: 8,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.bgPanel,
  },
  watchOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  watchCompare: { borderColor: '#A78BFA' },
  watchSym: { color: colors.text, fontWeight: '800', textAlign: 'right' },
  watchLabel: { color: colors.textMuted, fontSize: 11, textAlign: 'right' },
  compareTag: { color: '#A78BFA', fontSize: 9, textAlign: 'right', marginTop: 2 },
  compareNote: { color: '#A78BFA', fontSize: 11, textAlign: 'right' },
  main: { flex: 1 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  pillText: { color: colors.textMuted, fontWeight: '700', fontSize: 11 },
  pillTextOn: { color: colors.accent },
});
