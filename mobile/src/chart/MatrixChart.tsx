import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  LayoutChangeEvent,
  PanResponder,
  Alert,
  Platform,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { colors, radii, spacing } from '../theme';
import type { ChartSeries } from '../api';
import { loadDrawings, saveDrawings, clearDrawings } from './drawingStore';
import { compareOverlayPrices } from './compare';
import { withLivePrice } from './liveSeries';
import { computeVolumeProfile, pocPrice, computeTpo } from './volumeProfile';
import { evalPineLite, INDICATOR_LIBRARY } from './pineLite';
import { renko, measureStats, snapPrice } from './renko';
import { kagi } from './kagi';
import { pointFigure } from './pointFigure';
import { computeCvd, computeFootprint } from './orderflow';
import { loadTemplates, saveTemplate, DEFAULT_TEMPLATE } from './chartTemplateStore';
import {
  CHART_KINDS,
  DRAW_TOOLS,
  INDICATORS,
  LENSES,
  type ChartKind,
  type ChartPoint,
  type DrawTool,
  type Drawing,
  type IndicatorId,
  type LensMode,
  withVolume,
} from './types';
import {
  FIB_LEVELS,
  computeAtr,
  computeMacd,
  computeOverlays,
  computeRsi,
  computeStoch,
  formatPrice,
  heikinAshi,
} from './math';

type Props = {
  series: ChartSeries;
  compareSeries?: ChartSeries | null;
  height?: number;
  interactive?: boolean;
  accent?: string;
  persistDrawings?: boolean;
  livePrice?: number | null;
  onCreateAlert?: (price: number) => void;
  initialTool?: DrawTool;
  initialLens?: LensMode;
  initialKind?: ChartKind;
  initialIndicators?: IndicatorId[];
};

const LENS_PRESETS: Record<LensMode, IndicatorId[]> = {
  clean: [],
  structure: ['sma20', 'sma50', 'ema21'],
  momentum: ['rsi', 'macd'],
  liquidity: ['volume', 'bb', 'cvd'],
};

export function MatrixChart({
  series,
  compareSeries = null,
  height = 280,
  interactive = true,
  accent = colors.accent,
  persistDrawings = true,
  livePrice = null,
  onCreateAlert,
  initialTool,
  initialLens,
  initialKind,
  initialIndicators,
}: Props) {
  const plotRef = useRef<View>(null);
  const [pineFormula, setPineFormula] = useState('');
  const [pineOn, setPineOn] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [kind, setKind] = useState<ChartKind>(initialKind ?? 'candles');
  const [lens, setLens] = useState<LensMode>(initialLens ?? 'clean');
  const [extraInd, setExtraInd] = useState<IndicatorId[]>(initialIndicators ?? []);
  const [tool, setTool] = useState<DrawTool>(initialTool ?? 'none');
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [pending, setPending] = useState<ChartPoint | null>(null);
  const [dragEnd, setDragEnd] = useState<ChartPoint | null>(null);
  const [cross, setCross] = useState<{ index: number; x: number; y: number } | null>(null);
  const [windowCount, setWindowCount] = useState(80);
  const [offset, setOffset] = useState(0);
  const [replayOn, setReplayOn] = useState(false);
  const [replayStep, setReplayStep] = useState(15);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [logScale, setLogScale] = useState(false);
  const [magnet, setMagnet] = useState(true);
  const [measureReadout, setMeasureReadout] = useState<string | null>(null);
  const [chartW, setChartW] = useState(320);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rangeRef = useRef({ min: 0, max: 1, span: 1 });
  const sourceRef = useRef({
    plot: [] as { close: number; open: number; high: number; low: number }[],
    start: 0,
    windowLen: 80,
  });

  const indicators = useMemo(() => {
    const set = new Set([...LENS_PRESETS[lens], ...extraInd]);
    return [...set];
  }, [lens, extraInd]);

  const liveSeries = useMemo(
    () => withLivePrice(series, livePrice),
    [series, livePrice]
  );

  const source = useMemo(() => {
    const all = withVolume(liveSeries.candles);
    let plot =
      kind === 'heikin'
        ? heikinAshi(all)
        : kind === 'renko'
          ? renko(all)
          : kind === 'kagi'
            ? kagi(all)
            : kind === 'pnf'
              ? pointFigure(all)
              : all;
    const end = plot.length - offset;
    const start = Math.max(0, end - windowCount);
    const windowPlot = plot.slice(start, end);
    const windowLen = windowPlot.length;
    const visiblePlot = replayOn
      ? windowPlot.slice(0, Math.max(1, Math.min(replayStep, windowLen)))
      : windowPlot;
    return { plot: visiblePlot, start, all: plot, windowLen };
  }, [liveSeries.candles, kind, windowCount, offset, replayOn, replayStep]);

  const volProfile = useMemo(
    () => (indicators.includes('volumeProfile') ? computeVolumeProfile(source.plot, 20) : null),
    [source.plot, indicators]
  );
  const poc = useMemo(() => (volProfile ? pocPrice(volProfile) : null), [volProfile]);
  const tpo = useMemo(
    () => (indicators.includes('tpo') ? computeTpo(source.plot, 18) : null),
    [source.plot, indicators]
  );
  const footprint = useMemo(
    () => (indicators.includes('footprint') ? computeFootprint(source.plot) : null),
    [source.plot, indicators]
  );
  const cvd = useMemo(
    () => (indicators.includes('cvd') ? computeCvd(source.plot) : null),
    [source.plot, indicators]
  );
  const pineLine = useMemo(
    () => (pineOn && pineFormula.trim() ? evalPineLite(pineFormula, source.plot) : []),
    [pineOn, pineFormula, source.plot]
  );

  useEffect(() => {
    if (initialTool) setTool(initialTool);
  }, [initialTool, series.symbol]);

  useEffect(() => {
    if (initialLens) setLens(initialLens);
  }, [initialLens]);

  useEffect(() => {
    if (initialKind) setKind(initialKind);
  }, [initialKind]);

  useEffect(() => {
    if (initialIndicators) setExtraInd(initialIndicators);
  }, [initialIndicators]);

  useEffect(() => {
    if (!replayPlaying || !replayOn) return;
    const id = setInterval(() => {
      setReplayStep((s) => {
        const max = sourceRef.current.windowLen;
        if (s >= max) {
          setReplayPlaying(false);
          return max;
        }
        return s + 1;
      });
    }, 450);
    return () => clearInterval(id);
  }, [replayPlaying, replayOn]);

  useEffect(() => {
    if (!interactive) {
      setPineOn(false);
      setPineFormula('');
      setLens(initialLens ?? 'clean');
      setExtraInd(initialIndicators ?? []);
      return;
    }
    loadTemplates().then((t) => {
      const tpl = t[0] ?? DEFAULT_TEMPLATE;
      setKind(tpl.kind);
      if (!initialLens) setLens(tpl.lens ?? 'clean');
      if (!initialIndicators?.length) setExtraInd(tpl.indicators ?? []);
      // Pine اختياري — لا نفعّله تلقائياً من القالب
      setPineFormula(tpl.pineFormula || '');
      setPineOn(false);
      setLogScale(tpl.logScale);
      setMagnet(tpl.magnet);
    });
  }, [series.symbol, interactive, initialLens, initialIndicators]);

  useEffect(() => {
    if (!persistDrawings || !interactive) return;
    let alive = true;
    loadDrawings(series.symbol, series.timeframe).then((d) => {
      if (alive) setDrawings(d);
    });
    return () => {
      alive = false;
    };
  }, [series.symbol, series.timeframe, persistDrawings, interactive]);

  useEffect(() => {
    if (!persistDrawings || !interactive) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveDrawings(series.symbol, series.timeframe, drawings);
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [drawings, series.symbol, series.timeframe, persistDrawings, interactive]);

  const comparePrices = useMemo(() => {
    if (!compareSeries?.candles?.length) return null;
    return compareOverlayPrices(source.plot, compareSeries.candles.slice(-source.plot.length));
  }, [compareSeries, source.plot]);

  const closes = source.plot.map((c) => c.close);
  const overlays = useMemo(() => computeOverlays(closes), [closes]);
  const rsi = useMemo(
    () => (indicators.includes('rsi') ? computeRsi(closes) : null),
    [closes, indicators]
  );
  const macd = useMemo(
    () => (indicators.includes('macd') ? computeMacd(closes) : null),
    [closes, indicators]
  );
  const stoch = useMemo(
    () => (indicators.includes('stoch') ? computeStoch(source.plot) : null),
    [source.plot, indicators]
  );
  const atr = useMemo(
    () => (indicators.includes('atr') ? computeAtr(source.plot) : null),
    [source.plot, indicators]
  );

  const paneCount =
    (indicators.includes('volume') ? 1 : 0) +
    (indicators.includes('rsi') ? 1 : 0) +
    (indicators.includes('macd') ? 1 : 0) +
    (indicators.includes('stoch') ? 1 : 0) +
    (indicators.includes('atr') ? 1 : 0) +
    (indicators.includes('cvd') ? 1 : 0);

  const mainH = Math.max(140, height - paneCount * 52 - (interactive ? 8 : 0));
  const paneH = 48;

  const range = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    const push = (v: number | null | undefined) => {
      if (v == null || Number.isNaN(v)) return;
      const p = logScale ? Math.log(Math.max(v, 1e-12)) : v;
      min = Math.min(min, p);
      max = Math.max(max, p);
    };
    for (const c of source.plot) {
      push(c.low);
      push(c.high);
    }
    if (indicators.includes('sma20')) overlays.sma20.forEach(push);
    if (indicators.includes('sma50')) overlays.sma50.forEach(push);
    if (indicators.includes('ema21')) overlays.ema21.forEach(push);
    if (indicators.includes('bb')) {
      overlays.bbUpper.forEach(push);
      overlays.bbLower.forEach(push);
    }
    if (comparePrices) comparePrices.forEach(push);
    if (poc != null) push(poc);
    if (tpo?.poc != null) push(tpo.poc);
    if (tpo?.vah != null) push(tpo.vah);
    if (tpo?.val != null) push(tpo.val);
    pineLine.forEach(push);
    const span = max - min || 1;
    const pad = span * 0.06;
    return { min: min - pad, max: max + pad, span: span + pad * 2 };
  }, [source.plot, overlays, indicators, comparePrices, poc, pineLine, logScale, tpo]);

  rangeRef.current = range;
  sourceRef.current = source;

  const toScale = (price: number) => (logScale ? Math.log(Math.max(price, 1e-12)) : price);
  const fromScale = (scaled: number) => (logScale ? Math.exp(scaled) : scaled);

  const yOf = (price: number) => ((range.max - toScale(price)) / range.span) * mainH;
  const xOf = (i: number) => ((i + 0.5) / Math.max(1, source.plot.length)) * chartW;
  const colW = Math.max(2, chartW / Math.max(1, source.plot.length) - 1);

  const onLayout = (e: LayoutChangeEvent) => {
    setChartW(Math.max(120, e.nativeEvent.layout.width));
  };

  const hitIndex = useCallback((x: number) => {
    const len = sourceRef.current.plot.length || 1;
    const w = chartW || 1;
    const i = Math.floor((x / w) * len);
    return Math.max(0, Math.min(len - 1, i));
  }, [chartW]);

  const priceAtY = useCallback(
    (y: number) => {
      const r = rangeRef.current;
      const scaled = r.max - (y / mainH) * r.span;
      return fromScale(scaled);
    },
    [mainH, logScale]
  );

  const pointFromXY = useCallback(
    (x: number, y: number): ChartPoint => {
      let price = priceAtY(y);
      const local = hitIndex(x);
      const candle = sourceRef.current.plot[local];
      if (magnet && candle) price = snapPrice(price, candle);
      return { index: sourceRef.current.start + local, price };
    },
    [hitIndex, priceAtY, magnet]
  );

  const finalizeDrawing = useCallback(
    (a: ChartPoint, b?: ChartPoint) => {
      const t = tool;
      if (t === 'none') return;
      if (t === 'measure' && b) {
        const stats = measureStats(a, b);
        setMeasureReadout(
          `${stats.bars} شموع · ${stats.diff >= 0 ? '+' : ''}${formatPrice(stats.diff)} (${stats.pct.toFixed(2)}%)`
        );
        setPending(null);
        setDragEnd(null);
        setTool('none');
        return;
      }
      if (t === 'hline' || t === 'vline' || t === 'note') {
        setDrawings((d) => [
          ...d,
          {
            id: `d${Date.now()}`,
            tool: t,
            a,
            text: t === 'note' ? 'ملاحظة' : undefined,
            color: accent,
          },
        ]);
      } else if (b) {
        setDrawings((d) => [
          ...d,
          { id: `d${Date.now()}`, tool: t, a, b, color: accent },
        ]);
      }
      setPending(null);
      setDragEnd(null);
      setTool('none');
    },
    [tool, accent]
  );

  const moveDrawing = useCallback((id: string, point: ChartPoint, end: 'a' | 'b') => {
    setDrawings((list) =>
      list.map((d) => {
        if (d.id !== id) return d;
        if (end === 'a') return { ...d, a: point };
        return d.b ? { ...d, b: point } : { ...d, b: point };
      })
    );
  }, []);

  const hitDrawing = useCallback(
    (x: number, y: number) => {
      const price = priceAtY(y);
      const idx = hitIndex(x) + source.start;
      let best: { id: string; dist: number } | null = null;
      for (const d of drawings) {
        if (d.tool === 'hline') {
          const dist = Math.abs(d.a.price - price);
          if (dist < range.span * 0.012 && (!best || dist < best.dist)) best = { id: d.id, dist };
        } else if (d.tool === 'vline') {
          const dist = Math.abs(d.a.index - idx);
          if (dist <= 1 && (!best || dist < best.dist)) best = { id: d.id, dist: dist };
        } else if (d.b) {
          const d1 = Math.hypot(x - xOf(d.a.index - source.start), y - yOf(d.a.price));
          const d2 = Math.hypot(x - xOf(d.b.index - source.start), y - yOf(d.b.price));
          const dist = Math.min(d1, d2);
          if (dist < 18 && (!best || dist < best.dist)) best = { id: d.id, dist };
        }
      }
      return best?.id ?? null;
    },
    [drawings, hitIndex, priceAtY, source.start, range.span, xOf, yOf]
  );

  const exportChart = async () => {
    if (!plotRef.current) return;
    try {
      const uri = await captureRef(plotRef, { format: 'png', quality: 0.95 });
      if (Platform.OS === 'web') {
        Alert.alert('MATRIX', 'تم حفظ لقطة الشارت');
        return;
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'MATRIX Chart' });
      }
    } catch {
      Alert.alert('MATRIX', 'تعذر تصدير الشارت');
    }
  };

  const onChartPress = (x: number, y: number) => {
    const index = hitIndex(x);
    const candle = source.plot[index];
    if (!candle) return;
    setCross({ index, x: xOf(index), y: yOf(candle.close) });
    if (!interactive) return;

    if (tool === 'select') {
      setSelectedId(hitDrawing(x, y));
      return;
    }

    if (tool === 'none') {
      setSelectedId(null);
      return;
    }
    const point = pointFromXY(x, y);
    if (tool === 'hline' || tool === 'vline' || tool === 'note') {
      finalizeDrawing(point);
      return;
    }
    if (!pending) {
      setPending(point);
      return;
    }
    finalizeDrawing(pending, point);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => interactive && tool !== 'none' && tool !== 'select',
        onMoveShouldSetPanResponder: () => interactive && tool !== 'none' && tool !== 'select',
        onPanResponderGrant: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const p = pointFromXY(locationX, locationY);
          if (tool === 'hline' || tool === 'vline' || tool === 'note') return;
          setPending(p);
          setDragEnd(p);
        },
        onPanResponderMove: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          setDragEnd(pointFromXY(locationX, locationY));
        },
        onPanResponderRelease: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const end = pointFromXY(locationX, locationY);
          if (tool === 'hline' || tool === 'vline' || tool === 'note') {
            onChartPress(locationX, locationY);
            return;
          }
          if (pending) finalizeDrawing(pending, end);
        },
      }),
    [interactive, tool, pending, pointFromXY, finalizeDrawing]
  );

  const selectPan = useMemo(() => {
    let dragging: 'a' | 'b' | null = null;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => interactive && tool === 'select' && !!selectedId,
      onMoveShouldSetPanResponder: () => interactive && tool === 'select' && !!selectedId,
      onPanResponderGrant: (evt) => {
        if (!selectedId) return;
        const { locationX, locationY } = evt.nativeEvent;
        dragging = 'a';
        const d = drawings.find((x) => x.id === selectedId);
        if (d?.b) {
          const da = Math.hypot(locationX - xOf(d.a.index - source.start), locationY - yOf(d.a.price));
          const db = Math.hypot(locationX - xOf(d.b.index - source.start), locationY - yOf(d.b.price));
          dragging = db < da ? 'b' : 'a';
        }
      },
      onPanResponderMove: (evt) => {
        if (!selectedId || !dragging) return;
        const p = pointFromXY(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
        moveDrawing(selectedId, p, dragging);
      },
      onPanResponderRelease: () => {
        dragging = null;
      },
    });
  }, [interactive, tool, selectedId, drawings, moveDrawing, pointFromXY, source.start, xOf, yOf]);

  const chartPan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          interactive && tool === 'none' && !replayOn && Math.abs(g.dx) > 12,
        onPanResponderMove: (_, g) => {
          const step = Math.round(-g.dx / Math.max(8, chartW / source.windowLen));
          if (step) setOffset((o) => Math.max(0, o + step));
        },
      }),
    [interactive, tool, replayOn, chartW, source.windowLen]
  );

  const toggleInd = (id: IndicatorId) => {
    setExtraInd((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const persistTemplate = () => {
    void saveTemplate({
      id: 'default',
      name: 'افتراضي',
      kind,
      lens,
      indicators: extraInd,
      pineFormula,
      logScale,
      magnet,
    }).then(() => Alert.alert('MATRIX', 'تم حفظ قالب الشارت'));
  };

  const crossCandle = cross ? source.plot[cross.index] : null;

  const visibleDrawings = drawings
    .map((d) => {
      const aLocal = d.a.index - source.start;
      const bLocal = d.b ? d.b.index - source.start : aLocal;
      return { d, aLocal, bLocal };
    })
    .filter(({ aLocal, bLocal }) => aLocal >= -2 || bLocal >= -2);

  return (
    <View style={styles.root}>
      {interactive ? (
        <View style={styles.toolbar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {CHART_KINDS.map((k) => (
              <Pressable
                key={k.id}
                style={[styles.chip, kind === k.id && styles.chipOn]}
                onPress={() => setKind(k.id)}
              >
                <Text style={[styles.chipText, kind === k.id && styles.chipTextOn]}>{k.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {LENSES.map((l) => (
              <Pressable
                key={l.id}
                style={[styles.lens, lens === l.id && { borderColor: accent }]}
                onPress={() => setLens(l.id)}
              >
                <Text style={styles.lensTitle}>{l.label}</Text>
                <Text style={styles.lensHint}>{l.hint}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.readout}>
        {measureReadout ? (
          <Text style={styles.readoutText}>{measureReadout}</Text>
        ) : crossCandle ? (
          <Text style={styles.readoutText}>
            O {formatPrice(crossCandle.open)} H {formatPrice(crossCandle.high)} L{' '}
            {formatPrice(crossCandle.low)} C {formatPrice(crossCandle.close)}
            {compareSeries ? ` · ${compareSeries.symbol} ${formatPrice(compareSeries.last)}` : ''}
          </Text>
        ) : (
          <Text style={styles.readoutMuted}>
            {replayOn
              ? `Bar Replay · ${source.plot.length}/${source.windowLen}`
              : tool !== 'none'
                ? 'اسحب لرسم · يُحفظ تلقائياً'
                : 'المس للصليب · MATRIX Lens'}
          </Text>
        )}
        {interactive ? (
          <View style={styles.zoomRow}>
            <Pressable
              style={styles.zoomBtn}
              onPress={() => setWindowCount((n) => Math.min(160, n + 20))}
            >
              <Text style={styles.zoomText}>−</Text>
            </Pressable>
            <Pressable
              style={styles.zoomBtn}
              onPress={() => setWindowCount((n) => Math.max(30, n - 20))}
            >
              <Text style={styles.zoomText}>+</Text>
            </Pressable>
            <Pressable
              style={styles.zoomBtn}
              onPress={() => setOffset((o) => Math.min(series.candles.length - 10, o + 15))}
            >
              <Text style={styles.zoomText}>‹</Text>
            </Pressable>
            <Pressable
              style={styles.zoomBtn}
              onPress={() => setOffset((o) => Math.max(0, o - 15))}
            >
              <Text style={styles.zoomText}>›</Text>
            </Pressable>
            <Pressable
              style={[styles.zoomBtn, replayOn && styles.replayOn]}
              onPress={() => {
                setReplayOn((on) => {
                  const next = !on;
                  if (next) {
                    setReplayStep(12);
                    setReplayPlaying(false);
                  } else {
                    setReplayPlaying(false);
                  }
                  return next;
                });
              }}
            >
              <Text style={[styles.zoomText, replayOn && styles.replayTextOn]}>⏪</Text>
            </Pressable>
            {replayOn ? (
              <>
                <Pressable
                  style={styles.zoomBtn}
                  onPress={() => setReplayStep((s) => Math.max(1, s - 1))}
                >
                  <Text style={styles.zoomText}>-1</Text>
                </Pressable>
                <Pressable
                  style={[styles.zoomBtn, replayPlaying && styles.replayOn]}
                  onPress={() => setReplayPlaying((p) => !p)}
                >
                  <Text style={[styles.zoomText, replayPlaying && styles.replayTextOn]}>
                    {replayPlaying ? '⏸' : '▶'}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.zoomBtn}
                  onPress={() =>
                    setReplayStep((s) => Math.min(source.windowLen, s + 1))
                  }
                >
                  <Text style={styles.zoomText}>+1</Text>
                </Pressable>
              </>
            ) : null}
            <Pressable
              style={[styles.zoomBtn, logScale && styles.replayOn]}
              onPress={() => setLogScale((v) => !v)}
            >
              <Text style={[styles.zoomText, logScale && styles.replayTextOn]}>Log</Text>
            </Pressable>
            <Pressable
              style={[styles.zoomBtn, magnet && styles.replayOn]}
              onPress={() => setMagnet((v) => !v)}
            >
              <Text style={[styles.zoomText, magnet && styles.replayTextOn]}>🧲</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View
        ref={plotRef}
        collapsable={false}
        style={[styles.plot, { height: mainH }]}
        onLayout={onLayout}
        {...(interactive && tool !== 'none' && tool !== 'select' ? panResponder.panHandlers : {})}
        {...(interactive && tool === 'select' ? selectPan.panHandlers : {})}
        {...(interactive && tool === 'none' && !replayOn ? chartPan.panHandlers : {})}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={(e) => {
            if (tool === 'none') onChartPress(e.nativeEvent.locationX, e.nativeEvent.locationY);
          }}
        />
        {/* grid */}
        {[0.25, 0.5, 0.75].map((p) => (
          <View key={p} style={[styles.gridLine, { top: mainH * p }]} />
        ))}

        {/* area / line */}
        {(kind === 'line' || kind === 'area') &&
          source.plot.map((c, i) => {
            if (i === 0) return null;
            const x1 = xOf(i - 1);
            const y1 = yOf(source.plot[i - 1].close);
            const x2 = xOf(i);
            const y2 = yOf(c.close);
            const len = Math.hypot(x2 - x1, y2 - y1);
            const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
            return (
              <View
                key={`ln${i}`}
                style={{
                  position: 'absolute',
                  left: x1,
                  top: y1,
                  width: len,
                  height: kind === 'area' ? 2.5 : 1.6,
                  backgroundColor: accent,
                  opacity: 0.9,
                  transform: [{ rotate: `${angle}deg` }],
                  transformOrigin: 'left center',
                }}
              />
            );
          })}

        {/* candles / bars / hollow / heikin */}
        {(kind === 'candles' ||
          kind === 'hollow' ||
          kind === 'heikin' ||
          kind === 'bars' ||
          kind === 'renko' ||
          kind === 'kagi' ||
          kind === 'pnf') &&
          source.plot.map((c, i) => {
            const bull = c.close >= c.open;
            const color = bull ? colors.bull : colors.bear;
            const top = yOf(c.high);
            const bodyTop = yOf(Math.max(c.open, c.close));
            const bodyBot = yOf(Math.min(c.open, c.close));
            const wickH = Math.max(2, yOf(c.low) - yOf(c.high));
            const bodyH = Math.max(2, bodyBot - bodyTop);
            const left = xOf(i) - colW / 2;
            if (kind === 'kagi') {
              const x1 = i === 0 ? xOf(0) : xOf(i - 1);
              const y1 = i === 0 ? yOf(c.open) : yOf(source.plot[i - 1].close);
              const x2 = xOf(i);
              const y2 = yOf(c.close);
              const len = Math.hypot(x2 - x1, y2 - y1);
              const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
              return (
                <View
                  key={i}
                  style={{
                    position: 'absolute',
                    left: x1,
                    top: y1,
                    width: len,
                    height: bull ? 3.5 : 1.5,
                    backgroundColor: color,
                    opacity: 0.95,
                    transform: [{ rotate: `${angle}deg` }],
                    transformOrigin: 'left center',
                  }}
                />
              );
            }
            if (kind === 'pnf') {
              return (
                <Text
                  key={i}
                  style={{
                    position: 'absolute',
                    left: left,
                    top: bodyTop - 4,
                    width: Math.max(10, colW),
                    color,
                    fontSize: Math.min(14, Math.max(8, colW)),
                    fontWeight: '900',
                    textAlign: 'center',
                  }}
                >
                  {bull ? 'X' : 'O'}
                </Text>
              );
            }
            if (kind === 'bars') {
              return (
                <View key={i} style={{ position: 'absolute', left, top: 0, width: colW, height: mainH }}>
                  <View
                    style={{
                      position: 'absolute',
                      left: colW / 2,
                      top,
                      width: 1.5,
                      height: wickH,
                      backgroundColor: color,
                    }}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: yOf(c.open),
                      width: colW / 2,
                      height: 2,
                      backgroundColor: color,
                    }}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      left: colW / 2,
                      top: yOf(c.close),
                      width: colW / 2,
                      height: 2,
                      backgroundColor: color,
                    }}
                  />
                </View>
              );
            }
            return (
              <View key={i} style={{ position: 'absolute', left, top: 0, width: colW, height: mainH }}>
                <View
                  style={{
                    position: 'absolute',
                    left: colW / 2 - 0.5,
                    top,
                    width: 1,
                    height: wickH,
                    backgroundColor: color,
                    opacity: 0.9,
                  }}
                />
                <View
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: bodyTop,
                    width: Math.max(2, colW - 1),
                    height: bodyH,
                    backgroundColor: kind === 'hollow' && bull ? 'transparent' : color,
                    borderWidth: kind === 'hollow' ? 1.5 : 0,
                    borderColor: color,
                    borderRadius: 1,
                  }}
                />
              </View>
            );
          })}

        {/* compare symbol overlay */}
        {comparePrices &&
          comparePrices.map((p, i) => {
            if (i === 0) return null;
            const x1 = xOf(i - 1);
            const y1 = yOf(comparePrices[i - 1]);
            const x2 = xOf(i);
            const y2 = yOf(p);
            const len = Math.hypot(x2 - x1, y2 - y1);
            const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
            return (
              <View
                key={`cmp${i}`}
                style={{
                  position: 'absolute',
                  left: x1,
                  top: y1,
                  width: len,
                  height: 2,
                  backgroundColor: '#A78BFA',
                  opacity: 0.85,
                  transform: [{ rotate: `${angle}deg` }],
                  transformOrigin: 'left center',
                }}
              />
            );
          })}

        {/* overlay lines as dots */}
        {indicators.includes('sma20') &&
          overlays.sma20.map((v, i) =>
            v == null ? null : (
              <View
                key={`s20${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#FBBF24' }]}
              />
            )
          )}
        {indicators.includes('sma50') &&
          overlays.sma50.map((v, i) =>
            v == null ? null : (
              <View
                key={`s50${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: '#A78BFA' }]}
              />
            )
          )}
        {indicators.includes('ema21') &&
          overlays.ema21.map((v, i) =>
            v == null ? null : (
              <View
                key={`e21${i}`}
                style={[styles.dot, { left: xOf(i) - 1.5, top: yOf(v) - 1.5, backgroundColor: accent }]}
              />
            )
          )}
        {indicators.includes('bb') &&
          overlays.bbUpper.map((v, i) => {
            const lo = overlays.bbLower[i];
            if (v == null || lo == null) return null;
            return (
              <View
                key={`bb${i}`}
                style={{
                  position: 'absolute',
                  left: xOf(i) - 1,
                  top: yOf(v),
                  width: 2,
                  height: Math.max(2, yOf(lo) - yOf(v)),
                  backgroundColor: 'rgba(56,189,248,0.18)',
                }}
              />
            );
          })}

        {/* Pine-lite overlay */}
        {pineLine.map((v, i) => {
          if (i === 0 || v == null || pineLine[i - 1] == null) return null;
          const x1 = xOf(i - 1);
          const y1 = yOf(pineLine[i - 1]!);
          const x2 = xOf(i);
          const y2 = yOf(v);
          const len = Math.hypot(x2 - x1, y2 - y1);
          const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
          return (
            <View
              key={`pine${i}`}
              style={{
                position: 'absolute',
                left: x1,
                top: y1,
                width: len,
                height: 1.5,
                backgroundColor: '#38BDF8',
                opacity: 0.9,
                transform: [{ rotate: `${angle}deg` }],
                transformOrigin: 'left center',
              }}
            />
          );
        })}

        {poc != null ? (
          <View style={[styles.hLine, { top: yOf(poc), borderColor: '#F59E0B', opacity: 0.75 }]}>
            <Text style={styles.fibLabel}>POC</Text>
          </View>
        ) : null}

        {volProfile
          ? (() => {
              const maxV = Math.max(...volProfile.map((r) => r.volume), 1);
              return volProfile.map((row, i) => (
                <View
                  key={`vp${i}`}
                  style={{
                    position: 'absolute',
                    right: 2,
                    top: yOf(row.price),
                    width: (row.volume / maxV) * Math.max(24, chartW * 0.16),
                    height: 2,
                    backgroundColor: 'rgba(56,189,248,0.45)',
                  }}
                />
              ));
            })()
          : null}

        {tpo
          ? (() => {
              const maxC = Math.max(...tpo.rows.map((r) => r.count), 1);
              return (
                <>
                  {tpo.rows.map((row, i) =>
                    row.count ? (
                      <View
                        key={`tpo${i}`}
                        style={{
                          position: 'absolute',
                          left: 2,
                          top: yOf(row.price) - 1,
                          width: (row.count / maxC) * Math.max(20, chartW * 0.14),
                          height: 3,
                          backgroundColor: 'rgba(167,139,250,0.55)',
                        }}
                      />
                    ) : null
                  )}
                  {tpo.poc != null ? (
                    <View style={[styles.hLine, { top: yOf(tpo.poc), borderColor: '#A78BFA' }]}>
                      <Text style={styles.fibLabel}>TPO</Text>
                    </View>
                  ) : null}
                  {tpo.vah != null ? (
                    <View style={[styles.hLine, { top: yOf(tpo.vah), borderColor: 'rgba(167,139,250,0.4)' }]} />
                  ) : null}
                  {tpo.val != null ? (
                    <View style={[styles.hLine, { top: yOf(tpo.val), borderColor: 'rgba(167,139,250,0.4)' }]} />
                  ) : null}
                </>
              );
            })()
          : null}

        {footprint
          ? footprint.map((fp, i) => {
              if (Math.abs(fp.imbalance) < 0.25) return null;
              return (
                <Text
                  key={`fp${i}`}
                  style={{
                    position: 'absolute',
                    left: xOf(i) - 6,
                    top: yOf(source.plot[i].high) - 12,
                    color: fp.delta >= 0 ? colors.bull : colors.bear,
                    fontSize: 8,
                    fontWeight: '800',
                  }}
                >
                  {fp.delta >= 0 ? '+' : ''}
                  {Math.round(fp.delta / 100)}
                </Text>
              );
            })
          : null}

        {/* drawings */}
        {visibleDrawings.map(({ d, aLocal, bLocal }) => {
          const sel = d.id === selectedId;
          if (d.tool === 'hline') {
            return (
              <View
                key={d.id}
                style={[
                  styles.hLine,
                  {
                    top: yOf(d.a.price),
                    borderColor: d.color,
                    borderWidth: sel ? 2.5 : 1,
                  },
                ]}
              />
            );
          }
          if (d.tool === 'vline' && aLocal >= 0 && aLocal < source.plot.length) {
            return (
              <View
                key={d.id}
                style={[styles.vLine, { left: xOf(aLocal), borderColor: d.color }]}
              />
            );
          }
          if (d.tool === 'note' && aLocal >= 0 && aLocal < source.plot.length) {
            return (
              <Text
                key={d.id}
                style={[styles.note, { left: xOf(aLocal), top: yOf(d.a.price), color: d.color }]}
              >
                {d.text || '•'}
              </Text>
            );
          }
          if ((d.tool === 'trend' || d.tool === 'ray') && d.b) {
            const x1 = xOf(Math.max(0, Math.min(source.plot.length - 1, aLocal)));
            const y1 = yOf(d.a.price);
            const x2 = xOf(Math.max(0, Math.min(source.plot.length - 1, bLocal)));
            const y2 = yOf(d.b.price);
            const len = Math.hypot(x2 - x1, y2 - y1) * (d.tool === 'ray' ? 1.6 : 1);
            const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
            return (
              <View
                key={d.id}
                style={{
                  position: 'absolute',
                  left: x1,
                  top: y1,
                  width: len,
                  height: 2,
                  backgroundColor: d.color,
                  transform: [{ rotate: `${angle}deg` }],
                  transformOrigin: 'left center',
                }}
              />
            );
          }
          if ((d.tool === 'rect' || d.tool === 'zone') && d.b) {
            const left = xOf(Math.min(aLocal, bLocal));
            const right = xOf(Math.max(aLocal, bLocal));
            const top = yOf(Math.max(d.a.price, d.b.price));
            const bot = yOf(Math.min(d.a.price, d.b.price));
            return (
              <View
                key={d.id}
                style={{
                  position: 'absolute',
                  left,
                  top,
                  width: Math.max(4, right - left),
                  height: Math.max(4, bot - top),
                  backgroundColor:
                    d.tool === 'zone' ? 'rgba(45,212,191,0.12)' : 'rgba(251,191,36,0.1)',
                  borderWidth: 1,
                  borderColor: d.color,
                }}
              />
            );
          }
          if (d.tool === 'fib' && d.b) {
            const hi = Math.max(d.a.price, d.b.price);
            const lo = Math.min(d.a.price, d.b.price);
            const span = hi - lo || 1;
            return (
              <View key={d.id}>
                {FIB_LEVELS.map((lv) => {
                  const price = hi - span * lv;
                  return (
                    <View key={lv} style={[styles.hLine, { top: yOf(price), borderColor: d.color }]}>
                      <Text style={styles.fibLabel}>{lv.toFixed(3)}</Text>
                    </View>
                  );
                })}
              </View>
            );
          }
          return null;
        })}

        {pending && dragEnd && tool !== 'none' && tool !== 'select' && tool !== 'hline' && tool !== 'vline' && tool !== 'note' ? (
          (() => {
            const x1 = xOf(pending.index - source.start);
            const y1 = yOf(pending.price);
            const x2 = xOf(dragEnd.index - source.start);
            const y2 = yOf(dragEnd.price);
            const len = Math.hypot(x2 - x1, y2 - y1);
            const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
            return (
              <View
                style={{
                  position: 'absolute',
                  left: x1,
                  top: y1,
                  width: len,
                  height: 2,
                  backgroundColor: colors.warn,
                  opacity: 0.7,
                  transform: [{ rotate: `${angle}deg` }],
                  transformOrigin: 'left center',
                }}
              />
            );
          })()
        ) : null}

        {pending ? (
          <View
            style={[
              styles.pending,
              { left: xOf(pending.index - source.start), top: yOf(pending.price) },
            ]}
          />
        ) : null}

        {cross ? (
          <>
            <View style={[styles.crossV, { left: cross.x }]} />
            <View style={[styles.crossH, { top: cross.y }]} />
          </>
        ) : null}
      </View>

      {/* panes */}
      {indicators.includes('volume') ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>VOL</Text>
          <View style={styles.paneInner}>
            {source.plot.map((c, i) => {
              const vols = source.plot.map((x) => x.volume ?? 0);
              const maxV = Math.max(...vols, 1);
              const vol = c.volume ?? 0;
              const h = (vol / maxV) * (paneH - 14);
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: Math.max(2, h),
                    marginTop: paneH - 14 - Math.max(2, h),
                    backgroundColor: c.close >= c.open ? colors.bull : colors.bear,
                    opacity: 0.55,
                    marginHorizontal: 0.5,
                  }}
                />
              );
            })}
          </View>
        </View>
      ) : null}

      {cvd ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>CVD</Text>
          <View style={styles.paneInner}>
            {(() => {
              const minC = Math.min(...cvd);
              const maxC = Math.max(...cvd);
              const span = maxC - minC || 1;
              return cvd.map((v, i) => {
                if (i === 0) return <View key={i} style={{ flex: 1 }} />;
                const yNorm = (v - minC) / span;
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: 3,
                      marginTop: (1 - yNorm) * (paneH - 16),
                      backgroundColor: v >= cvd[i - 1] ? colors.bull : colors.bear,
                      opacity: 0.8,
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>
      ) : null}

      {rsi ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>RSI</Text>
          <View style={styles.paneInner}>
            {rsi.map((v, i) =>
              v == null ? (
                <View key={i} style={{ flex: 1 }} />
              ) : (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    marginTop: ((100 - v) / 100) * (paneH - 16),
                    backgroundColor: v > 70 ? colors.bear : v < 30 ? colors.bull : accent,
                    borderRadius: 2,
                  }}
                />
              )
            )}
          </View>
        </View>
      ) : null}

      {macd ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>MACD</Text>
          <View style={styles.paneInner}>
            {macd.hist.map((v, i) => {
              if (v == null) return <View key={i} style={{ flex: 1 }} />;
              const h = Math.min(paneH - 16, Math.abs(v) * 8000);
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: Math.max(2, h),
                    marginTop: v >= 0 ? paneH / 2 - h : paneH / 2,
                    backgroundColor: v >= 0 ? colors.bull : colors.bear,
                    opacity: 0.7,
                  }}
                />
              );
            })}
          </View>
        </View>
      ) : null}

      {stoch ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>STO</Text>
          <View style={styles.paneInner}>
            {stoch.k.map((v, i) =>
              v == null ? (
                <View key={i} style={{ flex: 1 }} />
              ) : (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    marginTop: ((100 - v) / 100) * (paneH - 16),
                    backgroundColor: '#F472B6',
                  }}
                />
              )
            )}
          </View>
        </View>
      ) : null}

      {atr ? (
        <View style={[styles.pane, { height: paneH }]}>
          <Text style={styles.paneLabel}>ATR</Text>
          <View style={styles.paneInner}>
            {(() => {
              const vals = atr.filter((x): x is number => x != null);
              const maxA = Math.max(...vals, 1e-9);
              return atr.map((v, i) =>
                v == null ? (
                  <View key={i} style={{ flex: 1 }} />
                ) : (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: Math.max(2, (v / maxA) * (paneH - 16)),
                      marginTop: paneH - 16 - (v / maxA) * (paneH - 16),
                      backgroundColor: colors.warn,
                      opacity: 0.7,
                    }}
                  />
                )
              );
            })()}
          </View>
        </View>
      ) : null}

      {interactive ? (
        <View style={styles.dock}>
          <Text style={styles.dockTitle}>مرسى الأدوات · MATRIX</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {DRAW_TOOLS.map((t) => (
              <Pressable
                key={t.id}
                style={[styles.tool, tool === t.id && styles.toolOn]}
                onPress={() => {
                  setTool(t.id);
                  setPending(null);
                }}
              >
                <Text style={[styles.toolText, tool === t.id && styles.toolTextOn]}>{t.label}</Text>
              </Pressable>
            ))}
            <Pressable
              style={styles.tool}
              onPress={() => {
                setDrawings([]);
                setPending(null);
                void clearDrawings(series.symbol, series.timeframe);
              }}
            >
              <Text style={styles.toolText}>مسح</Text>
            </Pressable>
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {INDICATORS.map((ind) => {
              const on = indicators.includes(ind.id);
              return (
                <Pressable
                  key={ind.id}
                  style={[styles.ind, on && styles.indOn]}
                  onPress={() => toggleInd(ind.id)}
                >
                  <Text style={[styles.indText, on && styles.indTextOn]}>{ind.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            <Pressable
              style={[styles.ind, !pineOn && styles.indOn]}
              onPress={() => setPineOn(false)}
            >
              <Text style={[styles.indText, !pineOn && styles.indTextOn]}>بدون خط Pine</Text>
            </Pressable>
            {INDICATOR_LIBRARY.map((p) => {
              const on = pineOn && pineFormula === p.formula;
              return (
                <Pressable
                  key={p.id}
                  style={[styles.ind, on && styles.indOn]}
                  onPress={() => {
                    if (on) {
                      setPineOn(false);
                      return;
                    }
                    setPineFormula(p.formula);
                    setPineOn(true);
                  }}
                >
                  <Text style={[styles.indText, on && styles.indTextOn]}>{p.name}</Text>
                </Pressable>
              );
            })}
            <Pressable style={styles.tool} onPress={() => void exportChart()}>
              <Text style={styles.toolText}>تصدير PNG</Text>
            </Pressable>
            <Pressable style={styles.tool} onPress={persistTemplate}>
              <Text style={styles.toolText}>حفظ قالب</Text>
            </Pressable>
            {selectedId ? (
              <>
                <Pressable
                  style={styles.tool}
                  onPress={() => {
                    setDrawings((list) => list.filter((x) => x.id !== selectedId));
                    setSelectedId(null);
                  }}
                >
                  <Text style={styles.toolText}>حذف</Text>
                </Pressable>
                {(() => {
                  const d = drawings.find((x) => x.id === selectedId);
                  if (d?.tool === 'hline' && onCreateAlert) {
                    return (
                      <Pressable style={[styles.tool, styles.toolOn]} onPress={() => onCreateAlert(d.a.price)}>
                        <Text style={styles.toolTextOn}>تنبيه خط</Text>
                      </Pressable>
                    );
                  }
                  return null;
                })()}
              </>
            ) : null}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 6 },
  toolbar: { gap: 6 },
  row: { flexDirection: 'row-reverse', gap: 6, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  chipText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  chipTextOn: { color: colors.accent },
  lens: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: '#0A1524',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    minWidth: 78,
  },
  lensTitle: { color: colors.text, fontWeight: '800', fontSize: 11, textAlign: 'right' },
  lensHint: { color: colors.textDim, fontSize: 9, textAlign: 'right', marginTop: 2 },
  readout: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  readoutText: { color: colors.text, fontSize: 11, fontFamily: 'monospace', flex: 1, textAlign: 'right' },
  readoutMuted: { color: colors.textDim, fontSize: 11, flex: 1, textAlign: 'right' },
  zoomRow: { flexDirection: 'row', gap: 4 },
  zoomBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: { color: colors.text, fontWeight: '800', fontSize: 14 },
  replayOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  replayTextOn: { color: colors.accent },
  plot: {
    backgroundColor: '#071018',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    overflow: 'hidden',
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  dot: { position: 'absolute', width: 3, height: 3, borderRadius: 2 },
  hLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  vLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderLeftWidth: 1,
    borderStyle: 'dashed',
  },
  fibLabel: {
    position: 'absolute',
    right: 4,
    top: -10,
    color: colors.textDim,
    fontSize: 9,
  },
  note: { position: 'absolute', fontSize: 10, fontWeight: '800' },
  pending: {
    position: 'absolute',
    width: 10,
    height: 10,
    marginLeft: -5,
    marginTop: -5,
    borderRadius: 5,
    backgroundColor: colors.warn,
    borderWidth: 2,
    borderColor: '#fff',
  },
  crossV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(232,238,249,0.35)',
  },
  crossH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(232,238,249,0.35)',
  },
  pane: {
    backgroundColor: '#070F18',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    flexDirection: 'row-reverse',
    overflow: 'hidden',
  },
  paneLabel: {
    width: 36,
    color: colors.textDim,
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
    paddingTop: 6,
  },
  paneInner: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 2 },
  dock: {
    marginTop: 4,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 6,
  },
  dockTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'right',
    letterSpacing: 0.6,
  },
  tool: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toolOn: { backgroundColor: colors.warn, borderColor: colors.warn },
  toolText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  toolTextOn: { color: '#111' },
  ind: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: '#0A1524',
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  indOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  indText: { color: colors.textDim, fontSize: 10, fontWeight: '700' },
  indTextOn: { color: colors.accent },
});
