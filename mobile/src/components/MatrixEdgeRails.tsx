import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { colors, radii } from '../theme';
import { DRAW_TOOLS, LENSES, type DrawTool, type LensMode } from '../chart/types';
import type { EdgePanelId } from './MatrixSidePanel';

export type MatrixLensId = LensMode;

type LeftProps = {
  activeLens: MatrixLensId;
  activeTool: DrawTool;
  onLens: (id: MatrixLensId) => void;
  onTool: (tool: DrawTool) => void;
  onQuad: () => void;
};

type RightProps = {
  activePanel: EdgePanelId;
  onOpenPanel: (panel: EdgePanelId) => void;
};

const RIGHT_ICONS: { id: Exclude<EdgePanelId, null>; mark: string; tip: string }[] = [
  { id: 'alerts', mark: '⚡', tip: 'تنبيه' },
  { id: 'indAlerts', mark: '☢', tip: 'مؤشّر' },
  { id: 'calendar', mark: '◷', tip: 'تقويم' },
  { id: 'screener', mark: '⌕', tip: 'فحص' },
  { id: 'reports', mark: '≡', tip: 'تقرير' },
  { id: 'news', mark: '☰', tip: 'خبر' },
  { id: 'dom', mark: '▥', tip: 'عمق' },
  { id: 'journal', mark: '₴', tip: 'PnL' },
  { id: 'backtest', mark: '↺', tip: 'اختبار' },
];

const DRAW_MARK: Partial<Record<DrawTool, string>> = {
  none: '✚',
  select: '⬚',
  trend: '╱',
  ray: '↗',
  hline: '―',
  vline: '│',
  rect: '▭',
  fib: 'Ƒ',
  zone: '▦',
  note: 'T',
  measure: '⌖',
};

const LENS_MARK: Record<LensMode, string> = {
  clean: '◇',
  structure: '⬡',
  momentum: '△',
  liquidity: '◎',
};

export function LeftDrawRail({ activeLens, activeTool, onLens, onTool, onQuad }: LeftProps) {
  return (
    <View style={styles.leftRail}>
      <Text style={styles.railTitle}>عدسة</Text>
      {LENSES.map((l) => {
        const on = activeLens === l.id;
        return (
          <Pressable
            key={l.id}
            style={[styles.railBtn, on && styles.railBtnOn]}
            onPress={() => onLens(l.id)}
          >
            <Text style={[styles.railMark, on && styles.railMarkOn]}>{LENS_MARK[l.id]}</Text>
            <Text style={[styles.railTip, on && styles.railTipOn]}>{l.label}</Text>
          </Pressable>
        );
      })}
      <View style={styles.railSep} />
      <Text style={styles.railTitle}>رسم</Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {DRAW_TOOLS.map((t) => {
          const on = activeTool === t.id;
          return (
            <Pressable
              key={t.id}
              style={[styles.railBtn, on && styles.railBtnOn]}
              onPress={() => onTool(t.id)}
            >
              <Text style={[styles.railMark, on && styles.railMarkOn]}>
                {DRAW_MARK[t.id] ?? '·'}
              </Text>
              <Text style={[styles.railTip, on && styles.railTipOn]} numberOfLines={1}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
        <View style={styles.railSep} />
        <Pressable style={styles.railBtn} onPress={onQuad}>
          <Text style={styles.railMark}>▦</Text>
          <Text style={styles.railTip}>2×2</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

export function RightPanelRail({ activePanel, onOpenPanel }: RightProps) {
  return (
    <View style={styles.rightRail}>
      <Text style={styles.railTitle}>لوحات</Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {RIGHT_ICONS.map((x) => {
          const on = activePanel === x.id;
          return (
            <Pressable
              key={x.id}
              style={[styles.railBtn, on && styles.railBtnOn]}
              onPress={() => onOpenPanel(activePanel === x.id ? null : x.id)}
            >
              <Text style={[styles.railMark, on && styles.railMarkOn]}>{x.mark}</Text>
              <Text style={[styles.railTip, on && styles.railTipOn]}>{x.tip}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** توافق خلفي */
export function MatrixEdgeRails(props: LeftProps & RightProps & { visible?: boolean }) {
  if (props.visible === false) return null;
  return (
    <>
      <LeftDrawRail {...props} />
      <RightPanelRail {...props} />
    </>
  );
}

const styles = StyleSheet.create({
  leftRail: {
    width: 52,
    backgroundColor: colors.bgElevated,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingTop: 6,
    alignItems: 'center',
  },
  rightRail: {
    width: 48,
    backgroundColor: colors.bgElevated,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    paddingTop: 6,
    alignItems: 'center',
  },
  scroll: { alignItems: 'center', gap: 2, paddingBottom: 12 },
  railTitle: {
    color: colors.textDim,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.4,
    textAlign: 'center',
    marginBottom: 4,
  },
  railBtn: {
    width: 44,
    paddingVertical: 5,
    borderRadius: radii.sm,
    alignItems: 'center',
    gap: 1,
  },
  railBtnOn: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  railMark: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  railMarkOn: { color: colors.accent },
  railTip: { color: colors.textDim, fontSize: 7, fontWeight: '700' },
  railTipOn: { color: colors.accent },
  railSep: {
    width: 28,
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 5,
  },
});
