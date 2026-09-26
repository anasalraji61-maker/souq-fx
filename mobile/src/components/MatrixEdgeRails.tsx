import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { colors, radii, spacing, buttons, selectedMarkerWidth } from '../theme';
import { type DrawTool, type LensMode } from '../chart/types';
import { localizedDrawTools, localizedLenses } from '../chart/typeLabels';
import type { EdgePanelId } from './MatrixSidePanel';
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
  a11yHint?: string;
  on?: boolean;
  /** زرّ يفتح قائمة (العدسة، مجموعة رسم) ⇒ قارئ الشاشة يسمع «موسَّع/مطويّ». */
  expanded?: boolean;
  /** العدسة دائماً مختارة بجانب أداة رسم ⇒ علامتها محايدة كي يبقى تأكيدٌ واحد بالشريط (DESIGN-PRO §1). */
  neutralMarker?: boolean;
  onPress: () => void;
  railTip: ReturnType<typeof useRailTip>;
};

function RailButton({ mark, tip, a11yLabel, a11yHint, on, expanded, neutralMarker, onPress, railTip }: RailButtonProps) {
  const ref = useRef<View>(null);
  return (
    <Pressable
      ref={ref}
      accessibilityState={
        expanded === undefined && on === undefined
          ? undefined
          : { ...(expanded !== undefined ? { expanded } : null), ...(on !== undefined ? { selected: on } : null) }
      }
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint={a11yHint}
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

/** DESIGN-PRO §7: الشريط الأيسر ≤12 عنصراً وقت السكون — كانت 15 أداة رسم دائمة + 4 عدسات + 2×2 (20).
 * المؤشّر والتحديد يبقيان زرّين؛ البقية مجموعات، كلّ منها زرّ واحد يفتح قائمة بجانب الشريط. */
const DRAW_GROUPS: { id: string; tools: DrawTool[] }[] = [
  { id: 'none', tools: ['none'] },
  { id: 'select', tools: ['select'] },
  { id: 'lines', tools: ['trend', 'ray', 'channel', 'hline', 'hray', 'vline'] },
  { id: 'shapes', tools: ['rect', 'zone', 'fib'] },
  { id: 'annotate', tools: ['note', 'measure'] },
  { id: 'position', tools: ['long', 'short'] },
];

type RailMenuItem = { id: string; mark: string; label: string; hint?: string; on: boolean; a11yLabel: string };

function RailMenu({ top, items, onPick }: { top: number; items: RailMenuItem[]; onPick: (id: string) => void }) {
  return (
    <View accessibilityRole="menu" style={[styles.railMenu, { top }]}>
      {items.map((it) => (
        <Pressable
          key={it.id}
          accessibilityRole="menuitem"
          accessibilityLabel={it.a11yLabel}
          accessibilityState={{ selected: it.on }}
          style={({ pressed }) => [
            styles.railMenuItem,
            it.on && styles.railBtnOn,
            pressed && { opacity: buttons.pressedOpacity },
          ]}
          onPress={() => onPick(it.id)}
        >
          {it.on ? <View style={[styles.railMarker, styles.railMarkerNeutral]} /> : null}
          <Text style={[styles.railMark, it.on && styles.railMarkOn]}>{it.mark}</Text>
          <View>
            <Text style={[styles.railMenuLabel, it.on && styles.railMarkOn]}>{it.label}</Text>
            {it.hint ? <Text style={styles.railMenuHint}>{it.hint}</Text> : null}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

export function LeftDrawRail({ activeLens, activeTool, onLens, onTool, onQuad }: LeftProps) {
  const { t } = useI18n();
  const railTip = useRailTip();
  const lenses = localizedLenses(t);
  const currentLens = lenses.find((l) => l.id === activeLens) ?? lenses[0];
  const toolLabel = new Map(localizedDrawTools(t).map((x) => [x.id, x.label]));
  const groupName: Record<string, string> = {
    lines: t.railDrawGroupLines,
    shapes: t.railDrawGroupShapes,
    annotate: t.railDrawGroupAnnotate,
    position: t.railDrawGroupPosition,
  };
  // قائمة واحدة مفتوحة على الأكثر: «lens» أو معرّف مجموعة رسم؛ `top` بإحداثيات الشريط.
  const [menu, setMenu] = useState<{ id: string; top: number } | null>(null);
  const btnRefs = useRef<Record<string, View | null>>({});
  const toggleMenu = (id: string) => {
    if (menu?.id === id) {
      setMenu(null);
      return;
    }
    const btn = btnRefs.current[id];
    const rail = railTip.railRef.current;
    if (!btn || !rail) return;
    btn.measureInWindow((_bx, by) => {
      rail.measureInWindow((_rx, ry) => setMenu({ id, top: by - ry }));
    });
  };

  let menuItems: RailMenuItem[] | null = null;
  if (menu?.id === 'lens') {
    menuItems = lenses.map((l) => ({
      id: l.id,
      mark: LENS_MARK[l.id],
      label: l.label,
      hint: l.hint,
      on: l.id === activeLens,
      a11yLabel: `${t.lensA11yPrefix}${l.label} — ${l.hint}`,
    }));
  } else if (menu) {
    const g = DRAW_GROUPS.find((x) => x.id === menu.id);
    menuItems = (g?.tools ?? []).map((id) => ({
      id,
      mark: DRAW_MARK[id],
      label: toolLabel.get(id) ?? id,
      on: id === activeTool,
      a11yLabel: `${t.drawToolA11yPrefix}${toolLabel.get(id) ?? id}`,
    }));
  }

  return (
    <View ref={railTip.railRef} style={styles.leftRail}>
      <Text style={styles.railTitle}>{t.lensSectionTitle}</Text>
      <View ref={(r) => { btnRefs.current.lens = r; }}>
        <RailButton
          mark={LENS_MARK[currentLens.id]}
          tip={`${t.lensA11yPrefix}${currentLens.label}`}
          a11yLabel={`${t.lensA11yPrefix}${currentLens.label}`}
          expanded={menu?.id === 'lens'}
          onPress={() => toggleMenu('lens')}
          railTip={railTip}
        />
      </View>
      <View style={styles.railSep} />
      <Text style={styles.railTitle}>{t.railDrawSectionTitle}</Text>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        onScrollBeginDrag={() => {
          railTip.hide();
          setMenu(null);
        }}
      >
        {DRAW_GROUPS.map((g) => {
          const labels = g.tools.map((id) => toolLabel.get(id) ?? id);
          if (g.tools.length === 1) {
            const id = g.tools[0];
            return (
              <RailButton
                key={g.id}
                mark={DRAW_MARK[id]}
                tip={labels[0]}
                a11yLabel={`${t.drawToolA11yPrefix}${labels[0]}`}
                on={activeTool === id}
                onPress={() => {
                  setMenu(null);
                  onTool(id);
                }}
                railTip={railTip}
              />
            );
          }
          // الزرّ يحمل رمز الأداة الفعّالة من مجموعته إن وُجدت؛ الاختيار تعبئة + علامة كبقية الشريط (§4).
          const activeInGroup = g.tools.includes(activeTool) ? activeTool : null;
          const shown = activeInGroup ?? g.tools[0];
          // اسم قصير للمجموعة (launch171a) بدل وصل أسماء أدواتها كلها؛ الأداة الفعّالة تُذكر بعده.
          const groupLabel = groupName[g.id] ?? labels.join(' / ');
          const activeLabel = activeInGroup ? (toolLabel.get(activeInGroup) ?? activeInGroup) : null;
          return (
            <View key={g.id} ref={(r) => { btnRefs.current[g.id] = r; }}>
              <RailButton
                mark={DRAW_MARK[shown]}
                tip={activeLabel ?? groupLabel}
                a11yLabel={`${t.drawToolA11yPrefix}${groupLabel}${activeLabel ? ` — ${activeLabel}` : ''}`}
                a11yHint={t.railDrawGroupMenuHint}
                on={activeInGroup !== null}
                expanded={menu?.id === g.id}
                onPress={() => toggleMenu(g.id)}
                railTip={railTip}
              />
            </View>
          );
        })}
        <View style={styles.railSep} />
        <RailButton mark="▦" tip="2×2" a11yLabel={t.railOpenQuadA11y} onPress={onQuad} railTip={railTip} />
      </ScrollView>
      {menu && menuItems ? (
        <RailMenu
          top={menu.top}
          items={menuItems}
          onPick={(id) => {
            const which = menu.id;
            setMenu(null);
            if (which === 'lens') onLens(id as MatrixLensId);
            else onTool(id as DrawTool);
          }}
        />
      ) : null}
      <RailTipBubble tip={railTip.tip} side="left" />
    </View>
  );
}

export function RightPanelRail({ activePanel, onOpenPanel }: RightProps) {
  const { t } = useI18n();
  const RIGHT_ICONS: { id: Exclude<EdgePanelId, null>; mark: string; tip: string }[] = [
    // DESIGN-PRO §1/§4: «⚡» يُرسم رمزاً تعبيرياً ملوّناً (أصفر) و«☢» إشعاعي — لون ثالث وعائلة ثانية.
    // «⚑»/«⚐» (علم مستوى سعر / علم مؤشّر) بلا صيغة تعبيرية في يونيكود فيبقيان أحاديي اللون كبقية الشريط.
    { id: 'alerts', mark: '⚑', tip: t.railTipAlert },
    { id: 'indAlerts', mark: '⚐', tip: t.railTipIndicator },
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
    paddingTop: 8,
    alignItems: 'center',
  },
  rightRail: {
    zIndex: 10,
    width: 48,
    backgroundColor: colors.bgElevated,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    paddingTop: 8,
    alignItems: 'center',
  },
  scroll: { alignItems: 'center', gap: 4, paddingBottom: spacing.md },
  railTitle: {
    color: colors.textMuted,
    fontSize: 11,
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
  // قائمة العدسة/مجموعة الرسم: حدّ وحده بلا ظلّ (§5.5)، وخلفية أعلى من الشريط كي تنفصل عنه.
  railMenu: {
    position: 'absolute',
    zIndex: 30,
    left: '100%',
    marginLeft: spacing.xs,
    padding: spacing.xs,
    gap: spacing.xs,
    borderRadius: 6,
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  railMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 28,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
  },
  railMenuLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  railMenuHint: { color: colors.textDim, fontSize: 11 },
  tipBubbleLeftRail: { left: '100%', marginLeft: spacing.xs },
  tipBubbleRightRail: { right: '100%', marginRight: spacing.xs },
  tipText: { color: colors.text, fontSize: 12, fontWeight: '500' },
  railSep: {
    width: 28,
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
});
