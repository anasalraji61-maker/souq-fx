import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  StatusBar,
  Pressable,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radii } from '../theme';
import { api, type ChartSeries } from '../api';
import { mockSeries } from '../mock';
import { ChartFrame } from '../components/ChartFrame';
import { FrameSizedGrid } from '../components/FrameSizedGrid';
import { FocusChartModal } from '../components/FocusChartModal';
import { WatchlistPanel } from '../components/WatchlistPanel';
import { MatrixBottomDock, type DockTabId } from '../components/MatrixBottomDock';
import { QuadChartModal } from '../components/QuadChartModal';
import {
  LeftDrawRail,
  RightPanelRail,
  type MatrixLensId,
} from '../components/MatrixEdgeRails';
import { MatrixSidePanel, type EdgePanelId } from '../components/MatrixSidePanel';
import { TimeframeBar } from '../components/TimeframeBar';
import { useMultiLiveTicks } from '../hooks/useMultiLiveTicks';
import { WATCHLIST } from '../chart/watchlist';
import { DEFAULT_LAYOUT } from '../chart/layoutStore';
import { formatPrice } from '../chart/math';
import {
  CHART_KINDS,
  type ChartKind,
  type DrawTool,
  type IndicatorId,
} from '../chart/types';
import {
  DEFAULT_FRAME_TIMEFRAMES,
  isTimeframe,
  type Timeframe,
} from '../timeframes';

const PREFS_KEY = 'matrix.frameTimeframes.v1';
const SYMBOLS_KEY = 'matrix.frameSymbols.v1';

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

function offlineFrame(symbol: string, tf: Timeframe): ChartSeries {
  return mockSeries(symbol, BASES[symbol] ?? 1, tf, 120);
}

export function TerminalScreen() {
  const { width } = useWindowDimensions();
  const phone = width < 700;
  const narrowWatch = width < 1100;

  const [dxy, setDxy] = useState<ChartSeries>(() => mockSeries('DXY', 104.25, '15m', 120));
  const [frames, setFrames] = useState<ChartSeries[]>(() =>
    DEFAULT_LAYOUT.frameSymbols.map((s, i) =>
      offlineFrame(s, DEFAULT_FRAME_TIMEFRAMES[i])
    )
  );
  const [frameSymbols, setFrameSymbols] = useState<[string, string, string]>(
    DEFAULT_LAYOUT.frameSymbols
  );
  const [frameTfs, setFrameTfs] = useState<Timeframe[]>([...DEFAULT_FRAME_TIMEFRAMES]);
  const [prefsReady, setPrefsReady] = useState(false);

  const [symbol, setSymbol] = useState('EURUSD');
  const [tf, setTf] = useState<Timeframe>('15m');
  const [series, setSeries] = useState<ChartSeries | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline] = useState(false);

  const [lens, setLens] = useState<MatrixLensId>('clean');
  const [tool, setTool] = useState<DrawTool>('none');
  const [kind, setKind] = useState<ChartKind>('candles');
  const [indicators, setIndicators] = useState<IndicatorId[]>([]);
  const [edgePanel, setEdgePanel] = useState<EdgePanelId>(null);
  const [dockTab, setDockTab] = useState<DockTabId>(null);
  const [quadOpen, setQuadOpen] = useState(false);
  const [showKinds, setShowKinds] = useState(false);
  const [focus, setFocus] = useState<{
    symbol: string;
    tf: Timeframe;
    tool?: DrawTool;
    kind?: ChartKind;
    indicators?: IndicatorId[];
  } | null>(null);

  const watchSymbols = useMemo(
    () => ['DXY', ...frameSymbols, ...WATCHLIST.map((w) => w.symbol)],
    [frameSymbols]
  );
  const liveTicks = useMultiLiveTicks(watchSymbols, true);

  const openFocus = (
    sym: string,
    timeframe: Timeframe = tf,
    opts?: { tool?: DrawTool; kind?: ChartKind; indicators?: IndicatorId[] }
  ) => {
    setSymbol(sym);
    setTf(timeframe);
    setFocus({
      symbol: sym,
      tf: timeframe,
      tool: opts?.tool,
      kind: opts?.kind ?? kind,
      indicators: opts?.indicators ?? (indicators.length ? indicators : undefined),
    });
  };

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PREFS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as string[];
          if (Array.isArray(parsed) && parsed.length === 3 && parsed.every(isTimeframe)) {
            setFrameTfs(parsed);
          }
        }
        const symRaw = await AsyncStorage.getItem(SYMBOLS_KEY);
        if (symRaw) {
          const syms = JSON.parse(symRaw) as string[];
          if (Array.isArray(syms) && syms.length === 3) {
            setFrameSymbols([syms[0], syms[1], syms[2]]);
          }
        }
      } catch {
        /* defaults */
      } finally {
        setPrefsReady(true);
      }
    })();
  }, []);

  const persistTfs = useCallback(async (next: Timeframe[]) => {
    setFrameTfs(next);
    try {
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const loadTerminal = useCallback(
    async (tfs: Timeframe[]) => {
      try {
        const bundle = await api.terminal(tfs[0], tfs[1], tfs[2], '15m');
        setDxy(bundle.dxy);
        setFrames(bundle.frames);
        setOnline(true);
      } catch {
        setDxy(mockSeries('DXY', 104.25, '15m', 120));
        setFrames(frameSymbols.map((s, i) => offlineFrame(s, tfs[i])));
        setOnline(false);
      }
    },
    [frameSymbols]
  );

  const loadChart = useCallback(async (sym: string, timeframe: Timeframe) => {
    try {
      const s = await api.chart(sym, timeframe);
      setSeries(s);
      setOnline(true);
    } catch {
      setSeries(mockSeries(sym, BASES[sym] ?? 1, timeframe, 180));
      setOnline(false);
    }
  }, []);

  useEffect(() => {
    if (!prefsReady || focus) return;
    void loadTerminal(frameTfs);
    const id = setInterval(() => void loadTerminal(frameTfs), 90_000);
    return () => clearInterval(id);
  }, [prefsReady, frameTfs, loadTerminal, focus]);

  useEffect(() => {
    void loadChart(symbol, tf);
    const id = setInterval(() => void loadChart(symbol, tf), 90_000);
    return () => clearInterval(id);
  }, [symbol, tf, loadChart]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadTerminal(frameTfs), loadChart(symbol, tf)]);
    setRefreshing(false);
  };

  const changeFrameTf = async (index: number, nextTf: Timeframe) => {
    if (frameTfs[index] === nextTf) return;
    const next = [...frameTfs] as Timeframe[];
    next[index] = nextTf;
    await persistTfs(next);
    const sym = frameSymbols[index];
    setFrames((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], timeframe: nextTf };
      return copy;
    });
    try {
      const s = await api.chart(sym, nextTf);
      setFrames((prev) => {
        const copy = [...prev];
        copy[index] = s;
        return copy;
      });
      setOnline(true);
    } catch {
      setFrames((prev) => {
        const copy = [...prev];
        copy[index] = offlineFrame(sym, nextTf);
        return copy;
      });
    }
  };

  const pickSymbol = (sym: string, timeframe?: Timeframe) => {
    setSymbol(sym);
    if (timeframe) setTf(timeframe);
  };

  const price = liveTicks[symbol] ?? series?.last ?? 0;
  const dxyPrice = liveTicks.DXY ?? dxy.last;
  const dxyUp = dxy.change_pct >= 0;

  const topActions = [
    {
      id: 'ind',
      mark: '∑',
      tip: 'مؤشرات',
      run: () => setEdgePanel(edgePanel === 'indicators' ? null : 'indicators'),
    },
    {
      id: 'al',
      mark: '⚡',
      tip: 'تنبيه',
      run: () => setEdgePanel(edgePanel === 'alerts' ? null : 'alerts'),
    },
    { id: 'rp', mark: '↺', tip: 'تحديث', run: () => void onRefresh() },
    { id: 'q2', mark: '▦', tip: '2×2', run: () => setQuadOpen(true) },
    { id: 'set', mark: '⚙', tip: 'نوع', run: () => setShowKinds((v) => !v) },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.topBar, phone && styles.topBarPhone]}>
        <View style={styles.brandBlock}>
          <Text style={styles.brand}>مصفوفة</Text>
          <Text style={styles.tag}>Home · 4 فريمات نظيفة</Text>
        </View>

        <Pressable style={styles.symbolBtn} onPress={() => openFocus(symbol, tf)}>
          <Text style={styles.symbolText}>{symbol}</Text>
        </Pressable>

        <View style={styles.tfScroll}>
          <TimeframeBar value={tf} onChange={setTf} arabic />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.topDock}
          style={styles.topDockScroll}
        >
          {topActions.map((a) => (
            <Pressable key={a.id} style={styles.topBtn} onPress={a.run}>
              <Text style={styles.topMark}>{a.mark}</Text>
              <Text style={styles.topTip}>{a.tip}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {showKinds ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kindRow}
        >
          {CHART_KINDS.map((k) => (
            <Pressable
              key={k.id}
              style={[styles.kindChip, kind === k.id && styles.kindChipOn]}
              onPress={() => {
                setKind(k.id);
                setShowKinds(false);
              }}
            >
              <Text style={[styles.kindText, kind === k.id && styles.kindTextOn]}>{k.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {phone ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.phoneWatchRow}
          style={styles.phoneWatch}
        >
          {WATCHLIST.map((w) => (
            <Pressable
              key={w.symbol}
              style={[styles.pill, symbol === w.symbol && styles.pillOn]}
              onPress={() => pickSymbol(w.symbol)}
            >
              <Text style={[styles.pillText, symbol === w.symbol && styles.pillTextOn]}>
                {w.symbol}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.workspace}>
        {!phone ? (
          <LeftDrawRail
            activeLens={lens}
            activeTool={tool}
            onLens={setLens}
            onTool={(t) => {
              setTool(t);
              if (t !== 'none') openFocus(symbol, tf, { tool: t });
            }}
            onQuad={() => setQuadOpen(true)}
          />
        ) : null}

        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={[styles.scrollContent, !phone && styles.scrollFill]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        >
          <Text style={styles.section}>
            4 فريمات · قدّم/أخّر كل مربع بمزاجك · المؤشرات اختيارية
          </Text>
          <FrameSizedGrid
            storageKey="matrix.home.frames.order.v1"
            items={[
              {
                id: 'DXY',
                node: (
                  <View style={styles.dxySlotFill}>
                    <ChartFrame
                      series={dxy}
                      size="large"
                      accent={colors.dxy}
                      label={`DXY · ${formatPrice(dxyPrice)}${dxyUp ? ' ↑' : ' ↓'}`}
                      phone={phone}
                      livePrice={liveTicks.DXY ?? null}
                      onFocus={() => openFocus('DXY', '15m')}
                    />
                  </View>
                ),
              },
              ...frames.map((f, i) => ({
                id: `pair-${i}`,
                node: (
                  <ChartFrame
                    series={f}
                    size="large"
                    accent={i === 2 ? colors.warn : colors.accent}
                    showTimeframes
                    phone={phone}
                    livePrice={liveTicks[f.symbol] ?? null}
                    onTimeframeChange={(t) => void changeFrameTf(i, t)}
                    onFocus={() => {
                      pickSymbol(f.symbol, frameTfs[i]);
                      openFocus(f.symbol, frameTfs[i]);
                    }}
                  />
                ),
              })),
            ]}
          />
          <Text style={styles.hintMove}>
            التوقعات · التنبيهات · الأخبار · المجتمع → Tools · امسك الشريط واسحب لتبديل أماكن الفريمات
          </Text>
        </ScrollView>

        {!phone ? (
          <>
            <WatchlistPanel
              activeSymbol={symbol}
              ticks={liveTicks}
              bases={BASES}
              onPick={(s) => pickSymbol(s)}
              compact={narrowWatch}
            />
            <RightPanelRail activePanel={edgePanel} onOpenPanel={setEdgePanel} />
          </>
        ) : null}
      </View>

      <MatrixBottomDock
        tab={dockTab}
        onTab={setDockTab}
        symbol={symbol}
        timeframe={tf}
        lastPrice={price}
        candles={series?.candles}
      />

      <MatrixSidePanel
        panel={edgePanel}
        onClose={() => setEdgePanel(null)}
        symbol={symbol}
        timeframe={tf}
        lastPrice={price}
        candles={series?.candles}
        activeIndicators={indicators}
        activeKind={kind}
        onPickDraw={(t) => {
          setTool(t);
          setEdgePanel(null);
        }}
        onToggleIndicator={(id) => {
          setIndicators((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
          );
        }}
        onPickKind={(k) => {
          setKind(k);
          setEdgePanel(null);
        }}
      />

      <FocusChartModal
        visible={!!focus}
        symbol={focus?.symbol ?? symbol}
        timeframe={focus?.tf ?? tf}
        onClose={() => setFocus(null)}
        onSymbolChange={pickSymbol}
        initialTool={focus?.tool}
        initialLens={lens}
        initialKind={focus?.kind}
        initialIndicators={focus?.indicators}
      />

      <QuadChartModal
        visible={quadOpen}
        onClose={() => setQuadOpen(false)}
        symbols={[frameSymbols[0], frameSymbols[1], frameSymbols[2], 'DXY']}
        timeframe={frameTfs[0]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    backgroundColor: colors.bgElevated,
    zIndex: 5,
  },
  topBarPhone: { flexWrap: 'wrap', paddingVertical: 4 },
  brandBlock: { minWidth: 72 },
  brand: { color: colors.text, fontSize: 16, fontWeight: '900' },
  tag: { color: colors.textDim, fontSize: 8, marginTop: 1 },
  symbolBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  symbolText: { color: colors.accent, fontWeight: '900', fontSize: 13 },
  tfScroll: { flexGrow: 0, flexShrink: 1, maxWidth: 520, minWidth: 200 },
  topDockScroll: { flexGrow: 1, flexShrink: 1 },
  topDock: { flexDirection: 'row', gap: 4, paddingHorizontal: 2 },
  topBtn: {
    width: 42,
    paddingVertical: 4,
    borderRadius: radii.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPanel,
  },
  topMark: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
  topTip: { color: colors.textDim, fontSize: 7, fontWeight: '700' },
  kindRow: { gap: 6, padding: 8, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },  kindChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPanel,
  },
  kindChipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  kindText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  kindTextOn: { color: colors.accent },
  workspace: { flex: 1, flexDirection: 'row' },
  mainScroll: { flex: 1 },
  scrollContent: { padding: spacing.sm, gap: spacing.sm, paddingBottom: 8 },
  scrollFill: { flexGrow: 1 },
  section: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'right',
    marginTop: 2,
  },
  hintMove: {
    color: colors.textDim,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
  dxySlotFill: {
    flex: 1,
    height: '100%',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.dxy,
    overflow: 'hidden',
  },
  phoneWatch: { maxHeight: 44, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  phoneWatchRow: { gap: 6, paddingHorizontal: 8, paddingVertical: 6 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPanel,
  },
  pillOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  pillText: { color: colors.textMuted, fontWeight: '700', fontSize: 11 },
  pillTextOn: { color: colors.accent },
});
