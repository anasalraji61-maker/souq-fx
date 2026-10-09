import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Svg, { Rect, Line, Polyline, Polygon, Text as SvgText, Circle } from 'react-native-svg';
import { colors, radii } from '../theme';
import { drawOps, frameAt, type Op, type Scene } from './scenes';

type Props = {
  scene: Scene;
  /** 0 → 1: how far the narration of this part has played */
  getProgress: () => number;
  height?: number;
  title?: string;
  rtl?: boolean;
};

/** The lesson "screen recording": chart, moving mouse pointer and drawings, in step with the narration. */
export function LessonStage({ scene, getProgress, height = 250, title, rtl }: Props) {
  const [w, setW] = useState(0);
  const [p, setP] = useState(0);
  const getRef = useRef(getProgress);
  getRef.current = getProgress;

  useEffect(() => {
    setP(getRef.current());
    const id = setInterval(() => {
      const next = getRef.current();
      setP((cur) => (Math.abs(cur - next) > 0.0015 ? next : cur));
    }, 60);
    return () => clearInterval(id);
  }, [scene]);

  const frame = useMemo(() => frameAt(scene, p), [scene, p]);
  const ops = useMemo(() => (w > 0 ? drawOps(scene, frame, w, height) : []), [scene, frame, w, height]);
  const onLayout = (e: LayoutChangeEvent) => setW(Math.round(e.nativeEvent.layout.width));

  return (
    <View style={styles.wrap}>
      <View style={[styles.head, rtl && styles.headRtl]}>
        <View style={styles.rec} />
        <Text style={styles.headText} numberOfLines={1}>
          {frame.symbol ?? scene.symbol}
          {title ? ` · ${title}` : ''}
        </Text>
      </View>
      <View style={{ height }} onLayout={onLayout}>
        {w > 0 ? (
          <Svg width={w} height={height}>
            {ops.map((o, k) => renderOp(o, k))}
          </Svg>
        ) : null}
      </View>
      <Text style={[styles.caption, { textAlign: rtl ? 'right' : 'left' }]} numberOfLines={1}>
        {frame.caption || ' '}
      </Text>
    </View>
  );
}

function renderOp(o: Op, k: number) {
  const op = o.o ?? 1;
  switch (o.t) {
    case 'rect':
      return (
        <Rect
          key={k}
          x={o.x}
          y={o.y}
          width={Math.max(0, o.w)}
          height={Math.max(0, o.h)}
          rx={o.r ?? 0}
          fill={o.fill ?? 'none'}
          fillOpacity={o.fo ?? 1}
          stroke={o.stroke ?? 'none'}
          strokeWidth={o.sw ?? 0}
          strokeDasharray={o.dash ? '4 3' : undefined}
          opacity={op}
        />
      );
    case 'line':
      return (
        <Line key={k} x1={o.x1} y1={o.y1} x2={o.x2} y2={o.y2} stroke={o.stroke} strokeWidth={o.sw} strokeDasharray={o.dash ? '4 3' : undefined} opacity={op} />
      );
    case 'poly': {
      const pts = o.pts.map((q) => `${q[0]},${q[1]}`).join(' ');
      return o.closed ? (
        <Polygon key={k} points={pts} fill={o.fill ?? 'none'} stroke={o.stroke ?? 'none'} strokeWidth={o.sw ?? 0} opacity={op} />
      ) : (
        <Polyline key={k} points={pts} fill="none" stroke={o.stroke ?? 'none'} strokeWidth={o.sw ?? 0} strokeDasharray={o.dash ? '5 4' : undefined} strokeLinejoin="round" opacity={op} />
      );
    }
    case 'text':
      return (
        <SvgText key={k} x={o.x} y={o.y} fill={o.fill} fontSize={o.size} textAnchor={o.anchor} fontWeight={o.bold ? '700' : '400'} opacity={op}>
          {o.text}
        </SvgText>
      );
    case 'circle':
      return <Circle key={k} cx={o.cx} cy={o.cy} r={Math.max(0, o.r)} fill={o.fill ?? 'none'} stroke={o.stroke ?? 'none'} strokeWidth={o.sw ?? 0} opacity={op} />;
  }
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#0B1220',
    borderRadius: radii.md,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingTop: 6, paddingBottom: 2 },
  headRtl: { flexDirection: 'row-reverse' },
  rec: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444' },
  headText: { color: colors.textMuted, fontSize: 11, fontWeight: '500', flexShrink: 1 },
  caption: { color: colors.accent, fontSize: 12.5, fontWeight: '600', paddingHorizontal: 10, paddingBottom: 7, paddingTop: 2 },
});
