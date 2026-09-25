import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { colors, radii, spacing, buttons, selectedMarkerWidth } from '../theme';
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

/** DESIGN-PRO §4: الشريطان أيقونات فقط؛ اسم الأداة تلميحٌ بعد 400ms من المرور (ويب) أو بالضغط
 * الطويل (لمس). يُرسَم التلميح على مستوى الشريط لا داخل `ScrollView` كي لا يُقصّ. */
const TIP_DELAY_MS = 400;

type RailTip = { text: string; top: number } | null;

function useRailTip() {
  const railRef = useRef<View>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tip, setTip] = useState<RailTip>(null);
  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  useEffect(() => clear, [clear]);
  const show = useCallback((text: string, btn: View | null) => {
    const rail = railRef.current;
    if (!btn || !rail) return;
    btn.measureInWindow((_bx, by, _bw, bh) => {
      rail.measureInWindow((_rx, ry) => setTip({ text, top: by - ry + bh / 2 - 12 }));
    });
  }, []);
  const hoverIn = useCallback(
    (text: string, btn: View | null) => {
      clear();
      timer.current = setTimeout(() => show(text, btn), TIP_DELAY_MS);
    },
    [clear, show],
  );
  const hide = useCallback(() => {
    clear();
    setTip(null);
  }, [clear]);
  return { railRef, tip, show, hoverIn, hide };
}

type RailButtonProps = {
  mark: string;
  tip: string;
  a11yLabel: string;
  on?: boolean;
  /** العدسة دائماً مختارة بجانب أداة رسم ⇒ علامتها محايدة كي يبقى تأكيدٌ واحد بالشريط (DESIGN-PRO §1). */
  neutralMarker?: boolean;
  onPress: () => void;
  railTip: ReturnType<typeof useRailTip>;
};

function RailButton({ mark, tip, a11yLabel, on, neutralMarker, onPress, railTip }: RailButtonProps) {
  const ref = useRef<View>(null);
  return (
    <Pressable
      ref={ref}
      accessibilityState={on === undefined ? undefined : { selected: on }}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      style={({ pressed }) => [
        styles.railBtn,
        on && styles.railBtnOn,
        pressed && {
          opacity: buttons.pressedOpacity,
          transform: [{ scale: buttons.pressedScale }],
        },
      ]}
      onPress={onPress}
      onHoverIn={() => railTip.hoverIn(tip, ref.current)}
      onHoverOut={railTip.hide}
      onLongPress={() => railTip.show(tip, ref.current)}
      delayLongPress={TIP_DELAY_MS}
      onPressOut={railTip.hide}
    >
      {on ? <View style={[styles.railMarker, neutralMarker && styles.railMarkerNeutral]} /> : null}
      <Text style={[styles.railMark, on && styles.railMarkOn]}>{mark}</Text>
    </Pressable>
  );
}

function RailTipBubble({ tip, side }: { tip: RailTip; side: 'left' | 'right' }) {
  if (!tip) return null;
  return (
    <View
      pointerEvents="none"
      style={[styles.tipBubble, side === 'left' ? styles.tipBubbleLeftRail : styles.tipBubbleRightRail, { top: tip.top }]}
    >
      <Text style={styles.tipText} numberOfLines={1}>
        {tip.text}
      </Text>
    </View>
  );
}

export function LeftDrawRail({ activeLens, activeTool, onLens, onTool, onQuad }: LeftProps) {
  const { t } = useI18n();
  const railTip = useRailTip();
  return (
    <View ref={railTip.railRef} style={styles.leftRail}>
      <Text style={styles.railTitle}>{t.lensSectionTitle}</Text>
      {localizedLenses(t).map((l) => (
        <RailButton
          key={l.id}
          mark={LENS_MARK[l.id]}
          tip={l.label}
          a11yLabel={`${t.lensA11yPrefix}${l.label}`}
          on={activeLens === l.id}
          neutralMarker
          onPress={() => onLens(l.id)}
          railTip={railTip}
        />
      ))}
      <View style={styles.railSep} />
      <Text style={styles.railTitle}>{t.railDrawSectionTitle}</Text>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        onScrollBeginDrag={railTip.hide}
      >
        {localizedDrawTools(t).map((tool) => (
          <RailButton
            key={tool.id}
            mark={DRAW_MARK[tool.id]}
            tip={tool.label}
            a11yLabel={`${t.drawToolA11yPrefix}${tool.label}`}
            on={activeTool === tool.id}
            onPress={() => onTool(tool.id)}
            railTip={railTip}
          />
        ))}
        <View style={styles.railSep} />
        <RailButton mark="▦" tip="2×2" a11yLabel={t.railOpenQuadA11y} onPress={onQuad} railTip={railTip} />
      </ScrollView>
      <RailTipBubble tip={railTip.tip} side="left" />
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

  const railTip = useRailTip();
  return (
    <View ref={railTip.railRef} style={styles.rightRail}>
      <Text style={styles.railTitle}>{t.railPanelsSectionTitle}</Text>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        onScrollBeginDrag={railTip.hide}
      >
        {RIGHT_ICONS.map((x) => (
          <RailButton
            key={x.id}
            mark={x.mark}
            tip={x.tip}
            a11yLabel={`${t.railPanelA11yPrefix}${x.tip}`}
            on={activePanel === x.id}
            onPress={() => onOpenPanel(activePanel === x.id ? null : x.id)}
            railTip={railTip}
          />
        ))}
      </ScrollView>
      <RailTipBubble tip={railTip.tip} side="right" />
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
    zIndex: 10,
    width: 52,
    backgroundColor: colors.bgElevated,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingTop: 6,
    alignItems: 'center',
  },
  rightRail: {
    zIndex: 10,
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
    fontWeight: '500',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  railBtn: {
    width: 36,
    minHeight: 28,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // DESIGN-PRO §4: الاختيار تعبئة محايدة + علامة 2px داخلية، لا حدّ ولا رمز بالتأكيد.
  railBtnOn: { backgroundColor: colors.selectedFill },
  railMarker: {
    position: 'absolute',
    left: 0,
    top: spacing.xs,
    bottom: spacing.xs,
    width: selectedMarkerWidth,
    borderRadius: 1,
    backgroundColor: colors.accent,
  },
  railMarkerNeutral: { backgroundColor: colors.text },
  railMark: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  railMarkOn: { color: colors.text },
  tipBubble: {
    position: 'absolute',
    zIndex: 20,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 6,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  tipBubbleLeftRail: { left: '100%', marginLeft: spacing.xs },
  tipBubbleRightRail: { right: '100%', marginRight: spacing.xs },
  tipText: { color: colors.text, fontSize: 12, fontWeight: '500' },
  railSep: {
    width: 28,
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 5,
  },
});
