import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { colors, radii, buttons } from '../theme';
import { DRAW_TOOLS, LENSES, type DrawTool, type LensMode } from '../chart/types';
import type { EdgePanelId } from './MatrixSidePanel';
import type { FrameLayoutCount, FrameLayoutShape } from './FrameSizedGrid';

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
  layoutCount?: FrameLayoutCount;
  layoutShape?: FrameLayoutShape;
  onLayoutPick?: (count: FrameLayoutCount, shape: FrameLayoutShape) => void;
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
            accessibilityRole="button"
            key={l.id}
            style={({ pressed }) => [
              styles.railBtn,
              on && styles.railBtnOn,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={() => onLens(l.id)}
            accessibilityLabel={`عدسة: ${l.label}`}
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
              accessibilityRole="button"
              key={t.id}
              style={({ pressed }) => [
                styles.railBtn,
                on && styles.railBtnOn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => onTool(t.id)}
              accessibilityLabel={`أداة رسم: ${t.label}`}
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
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.railBtn,
            pressed && {
              opacity: buttons.pressedOpacity,
              transform: [{ scale: buttons.pressedScale }],
            },
          ]}
          onPress={onQuad}
          accessibilityLabel="فتح تخطيط 2×2"
        >
          <Text style={styles.railMark}>▦</Text>
          <Text style={styles.railTip}>2×2</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

export function RightPanelRail({
  activePanel,
  onOpenPanel,
  layoutCount,
  layoutShape = 'square',
  onLayoutPick,
}: RightProps) {
  const squareOn = (count: FrameLayoutCount) =>
    layoutCount === count && layoutShape === 'square';
  const rectOn = (count: FrameLayoutCount) =>
    layoutCount === count && layoutShape === 'rect';

  return (
    <View style={styles.rightRail}>
      {layoutCount && onLayoutPick ? (
        <>
          <View style={styles.railTag}>
            <Text style={styles.railTagTop}>فريم</Text>
            <Text style={styles.railTagBottom}>مربع</Text>
          </View>
          <View style={styles.layoutGroup}>
            {([1, 2, 3, 4] as FrameLayoutCount[]).map((count) => {
              const on = squareOn(count);
              return (
                <Pressable
                  accessibilityRole="button"
                  key={`sq-${count}`}
                  accessibilityLabel={`${count} فريم مربع`}
                  style={({ pressed }) => [
                    styles.layoutBtn,
                    on && styles.layoutBtnOn,
                    pressed && {
                      opacity: buttons.pressedOpacity,
                      transform: [{ scale: buttons.pressedScale }],
                    },
                  ]}
                  onPress={() => onLayoutPick(count, 'square')}
                >
                  <Text style={[styles.layoutNum, on && styles.layoutNumOn]}>{count}</Text>
                  <View style={styles.layoutMini}>
                    {Array.from({ length: count }).map((_, index) => (
                      <View
                        key={index}
                        style={[styles.layoutCell, on && styles.layoutCellOn]}
                      />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.railSep} />
          <View style={styles.railTag}>
            <Text style={styles.railTagTop}>فريم</Text>
            <Text style={styles.railTagBottom}>مستطيل</Text>
          </View>
          <View style={styles.layoutGroup}>
            {([2, 3, 4] as FrameLayoutCount[]).map((count) => {
              const on = rectOn(count);
              return (
                <Pressable
                  accessibilityRole="button"
                  key={`rect-${count}`}
                  accessibilityLabel={`${count} فريم مستطيل`}
                  style={({ pressed }) => [
                    styles.layoutBtn,
                    on && styles.layoutBtnOn,
                    pressed && {
                      opacity: buttons.pressedOpacity,
                      transform: [{ scale: buttons.pressedScale }],
                    },
                  ]}
                  onPress={() => onLayoutPick(count, 'rect')}
                >
                  <Text style={[styles.layoutNum, on && styles.layoutNumOn]}>{count}</Text>
                  <View
                    style={[
                      styles.layoutMini,
                      count === 2 && styles.layoutMiniRow,
                      count === 3 && styles.layoutMiniRow3,
                      count === 4 && styles.layoutMiniRow4,
                    ]}
                  >
                    {Array.from({ length: count }).map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.layoutCellRect,
                          count === 2 && styles.layoutCellRect2,
                          count === 3 && styles.layoutCellRect3,
                          count === 4 && styles.layoutCellRect4,
                          on && styles.layoutCellOn,
                        ]}
                      />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.railSep} />
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.railTag,
              layoutShape === 'shadow' && styles.layoutBtnOn,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={() => onLayoutPick(1, 'shadow')}
            accessibilityLabel="فريم الظل"
          >
            <Text style={styles.railTagTop}>فريم</Text>
            <Text
              style={[
                styles.railTagBottom,
                layoutShape === 'shadow' && styles.layoutNumOn,
              ]}
            >
              الظل
            </Text>
          </Pressable>
          <View style={styles.railSep} />
        </>
      ) : null}
      <Text style={styles.railTitle}>لوحات</Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {RIGHT_ICONS.map((x) => {
          const on = activePanel === x.id;
          return (
            <Pressable
              accessibilityRole="button"
              key={x.id}
              style={({ pressed }) => [
                styles.railBtn,
                on && styles.railBtnOn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => onOpenPanel(activePanel === x.id ? null : x.id)}
              accessibilityLabel={`لوحة: ${x.tip}`}
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
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginBottom: 4,
  },
  railTag: {
    width: 44,
    height: 34,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.bgPanel,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
    paddingHorizontal: 3,
  },
  railTagTop: {
    color: colors.accent,
    fontSize: 8,
    fontWeight: '900',
    lineHeight: 10,
    textAlign: 'center',
  },
  railTagBottom: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: '800',
    lineHeight: 10,
    textAlign: 'center',
  },
  railBtn: {
    width: 44,
    minHeight: 40,
    paddingVertical: 6,
    borderRadius: radii.sm,
    alignItems: 'center',
    gap: 2,
  },
  railBtnOn: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  railMark: { color: colors.textMuted, fontSize: 13, fontWeight: '800' },
  railMarkOn: { color: colors.accent },
  railTip: { color: colors.textDim, fontSize: 8, fontWeight: '700' },
  railTipOn: { color: colors.accent },
  layoutGroup: { gap: 4, alignItems: 'center', marginBottom: 2 },
  layoutBtn: {
    width: 42,
    height: 34,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.bgPanel,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  layoutBtnOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  layoutNum: { color: colors.textDim, fontSize: 9, fontWeight: '900' },
  layoutNumOn: { color: colors.accent },
  layoutMini: {
    width: 17,
    height: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
    alignContent: 'center',
  },
  layoutMiniRow: {
    flexWrap: 'nowrap',
    width: 18,
    height: 10,
  },
  layoutMiniRow3: {
    flexWrap: 'nowrap',
    width: 20,
    height: 10,
  },
  layoutMiniRow4: {
    flexWrap: 'nowrap',
    width: 22,
    height: 10,
  },
  layoutCell: {
    width: 7,
    height: 6,
    borderRadius: 1,
    backgroundColor: colors.textDim,
    opacity: 0.65,
  },
  layoutCellRect: {
    width: 7,
    height: 5,
    borderRadius: 1,
    backgroundColor: colors.textDim,
    opacity: 0.65,
  },
  layoutCellRect2: {
    width: 8,
    height: 9,
  },
  layoutCellRect3: {
    width: 5,
    height: 9,
  },
  layoutCellRect4: {
    width: 4,
    height: 9,
  },
  layoutCellOn: { backgroundColor: colors.accent, opacity: 1 },
  railSep: {
    width: 28,
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 5,
  },
});
