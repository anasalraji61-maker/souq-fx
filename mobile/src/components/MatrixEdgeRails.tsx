import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { colors, radii, spacing, buttons } from '../theme';
import { type DrawTool, type LensMode } from '../chart/types';
import { localizedDrawTools, localizedLenses } from '../chart/typeLabels';
import type { EdgePanelId } from './MatrixSidePanel';
import type { FrameLayoutCount, FrameLayoutShape } from './FrameSizedGrid';
import { useI18n } from '../i18n/I18nContext';

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
  /** @deprecated لا تُستعمل — مختار الإطارات بيته الشريط العلوي وحده (DESIGN-PRO §5.1)؛
   * باقية حتى يكفّ `TerminalScreen` عن تمريرها (tools). */
  layoutCount?: FrameLayoutCount;
  /** @deprecated انظر `layoutCount`. */
  layoutShape?: FrameLayoutShape;
  /** @deprecated انظر `layoutCount`. */
  onLayoutPick?: (count: FrameLayoutCount, shape: FrameLayoutShape) => void;
};

/** كامل لا `Partial`: القناة والشعاع الأفقي وأداتا الشراء/البيع كانت تظهر «·» بالشريط والرصيف — أداة بلا علامة. */
export const DRAW_MARK: Record<DrawTool, string> = {
  none: '✚',
  select: '⬚',
  trend: '╱',
  ray: '↗',
  channel: '⫽',
  hline: '―',
  hray: '↦',
  vline: '│',
  rect: '▭',
  fib: 'Ƒ',
  zone: '▦',
  note: 'T',
  measure: '⌖',
  long: '⤒',
  short: '⤓',
};

export const LENS_MARK: Record<LensMode, string> = {
  clean: '◇',
  structure: '⬡',
  momentum: '△',
  liquidity: '◎',
};

export function LeftDrawRail({ activeLens, activeTool, onLens, onTool, onQuad }: LeftProps) {
  const { t } = useI18n();
  return (
    <View style={styles.leftRail}>
      <Text style={styles.railTitle}>{t.lensSectionTitle}</Text>
      {localizedLenses(t).map((l) => {
        const on = activeLens === l.id;
        return (
          <Pressable
            accessibilityState={{ selected: on }}
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
            accessibilityLabel={`${t.lensA11yPrefix}${l.label}`}
          >
            <Text style={[styles.railMark, on && styles.railMarkOn]}>{LENS_MARK[l.id]}</Text>
            <Text style={[styles.railTip, on && styles.railTipOn]}>{l.label}</Text>
          </Pressable>
        );
      })}
      <View style={styles.railSep} />
      <Text style={styles.railTitle}>{t.railDrawSectionTitle}</Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {localizedDrawTools(t).map((tool) => {
          const on = activeTool === tool.id;
          return (
            <Pressable
              accessibilityState={{ selected: on }}
              accessibilityRole="button"
              key={tool.id}
              style={({ pressed }) => [
                styles.railBtn,
                on && styles.railBtnOn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => onTool(tool.id)}
              accessibilityLabel={`${t.drawToolA11yPrefix}${tool.label}`}
            >
              <Text style={[styles.railMark, on && styles.railMarkOn]}>
                {DRAW_MARK[tool.id]}
              </Text>
              <Text style={[styles.railTip, on && styles.railTipOn]} numberOfLines={1}>
                {tool.label}
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
          accessibilityLabel={t.railOpenQuadA11y}
        >
          <Text style={styles.railMark}>▦</Text>
          <Text style={styles.railTip}>2×2</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

export function RightPanelRail({ activePanel, onOpenPanel }: RightProps) {
  const { t } = useI18n();
  const RIGHT_ICONS: { id: Exclude<EdgePanelId, null>; mark: string; tip: string }[] = [
    { id: 'alerts', mark: '⚡', tip: t.railTipAlert },
    { id: 'indAlerts', mark: '☢', tip: t.railTipIndicator },
    { id: 'calendar', mark: '◷', tip: t.toolsTabCalendar },
    { id: 'screener', mark: '⌕', tip: t.toolsTabScreener },
    { id: 'reports', mark: '≡', tip: t.railTipReport },
    { id: 'news', mark: '☰', tip: t.railTipNewsItem },
    { id: 'dom', mark: '▥', tip: t.depthWord },
    // «₴» رمز الهريفنيا الأوكرانية لا دفتر؛ «▤» صفحةٌ مسطّرة كما `ToolsScreen` (launch4).
    { id: 'journal', mark: '▤', tip: t.toolsTabJournal },
    { id: 'backtest', mark: '↺', tip: t.backtestWord },
  ];

  return (
    <View style={styles.rightRail}>
      <Text style={styles.railTitle}>{t.railPanelsSectionTitle}</Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {RIGHT_ICONS.map((x) => {
          const on = activePanel === x.id;
          return (
            <Pressable
              accessibilityState={{ selected: on }}
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
              accessibilityLabel={`${t.railPanelA11yPrefix}${x.tip}`}
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
  scroll: { alignItems: 'center', gap: 2, paddingBottom: spacing.md },
  railTitle: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginBottom: spacing.xs,
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
  railSep: {
    width: 28,
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 5,
  },
});
