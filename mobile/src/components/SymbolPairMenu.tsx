import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { colors, radii, spacing, buttons } from '../theme';
import { WATCHLIST } from '../chart/watchlist';
import { loadWatchlistItems } from '../chart/watchlistStore';
import { playSoftClick, unlockSoftClick } from '../audio/playSoftClick';
import { useI18n } from '../i18n/I18nContext';

type Item = { symbol: string; label: string; group?: string };

type Props = {
  value: string;
  onPick: (symbol: string) => void;
  onLongPress?: () => void;
  /** عنوان كبير بجانب الجارت */
  large?: boolean;
};

export function SymbolPairMenu({ value, onPick, onLongPress, large = false }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([...WATCHLIST]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    void loadWatchlistItems().then((next) => {
      if (alive && next.length) setItems(next);
    });
    return () => {
      alive = false;
    };
  }, [open]);

  /**
   * قرار ١٦ (الويب): القائمة كانت تُغلق باختيار رمز أو بالزرّ نفسه فقط — تبقى مفتوحة فوق الشموع بعد نقرة
   * خارجها، وEsc لا يفعل شيئاً. نمط قائمة التخطيط (`TerminalScreen`) حرفاً بحرف: Esc يغلقها وحدها (التقاط،
   * لا يلغي رسماً جارياً تحتها)، والنقر خارجها يغلقها ويصل لهدفه كما هو.
   */
  const wrapRef = useRef<View>(null);
  useEffect(() => {
    if (Platform.OS !== 'web' || !open || typeof document === 'undefined') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    };
    const onDown = (event: PointerEvent) => {
      const node = wrapRef.current as unknown as { contains?: (n: unknown) => boolean } | null;
      if (node?.contains?.(event.target)) return;
      setOpen(false);
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onDown, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onDown, true);
    };
  }, [open]);

  const toggle = () => {
    unlockSoftClick();
    playSoftClick();
    setOpen((v) => !v);
  };

  const pick = (symbol: string) => {
    playSoftClick();
    onPick(symbol);
    setOpen(false);
  };

  return (
    <View ref={wrapRef} style={styles.wrap}>
      <Pressable
        accessibilityState={{ expanded: open }}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.trigger,
          large && styles.triggerLarge,
          open && styles.triggerOn,
          pressed && {
            opacity: buttons.pressedOpacity,
            transform: [{ scale: buttons.pressedScale }],
          },
        ]}
        onPress={toggle}
        onLongPress={onLongPress}
        accessibilityLabel={open ? t.spmCloseA11y : t.spmOpenA11y}
        hitSlop={8}
      >
        <Text style={[styles.triggerText, large && styles.triggerTextLarge]}>{value}</Text>
        <Text style={[styles.caret, large && styles.caretLarge]}>{open ? '▴' : '▾'}</Text>
      </Pressable>

      {open ? (
        <View style={[styles.panel, large && styles.panelLarge]}>
          <Text style={styles.panelTitle}>{t.spmPanelTitle}</Text>
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listInner}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {items.map((item) => {
              const on = item.symbol === value;
              return (
                <Pressable
                  accessibilityState={{ selected: on }}
                  accessibilityRole="button"
                  key={item.symbol}
                  style={({ pressed }) => [
                    styles.row,
                    on && styles.rowOn,
                    pressed && {
                      opacity: buttons.pressedOpacity,
                      transform: [{ scale: buttons.pressedScale }],
                    },
                  ]}
                  onPress={() => pick(item.symbol)}
                  accessibilityLabel={`${t.focusPickSymbolA11yPrefix}: ${item.symbol}${item.group ? ' · ' + item.group : ''}`}
                >
                  <Text style={[styles.sym, on && styles.symOn]}>{item.symbol}</Text>
                  {item.group ? (
                    <Text style={[styles.group, on && styles.groupOn]}>{item.group}</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    zIndex: 80,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
    borderWidth: 1,
    // الرمز والفريم بالشريط نفسه: التأكيد للفريم النشط وحده (DESIGN-PRO §1) ⇒ الزرّ محايد.
    borderColor: 'rgba(255,255,255,0.12)',
  },
  triggerLarge: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  triggerOn: { backgroundColor: colors.selectedFill },
  triggerText: { color: colors.text, fontWeight: '500', fontSize: 13 },
  triggerTextLarge: { color: colors.text, fontSize: 15 },
  caret: { color: colors.textMuted, fontWeight: '500', fontSize: 11 },
  caretLarge: { color: colors.textMuted },
  panel: {
    position: 'absolute',
    top: 38,
    left: 0,
    width: 210,
    maxHeight: 340,
    zIndex: 90,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingTop: spacing.sm,
    paddingBottom: 8,
    overflow: 'hidden',
  },
  panelLarge: {
    top: 28,
  },
  panelTitle: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '500',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  list: { maxHeight: 300 },
  listInner: { paddingHorizontal: 8, paddingBottom: spacing.xs, gap: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  rowOn: { backgroundColor: colors.selectedFill },
  sym: {
    color: colors.textMuted,
    fontWeight: '500',
    fontSize: 13,
  },
  symOn: {
    color: colors.text,
  },
  group: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '500',
  },
  // DESIGN-PRO §1: الصفّ المختار يحمل التعبئة ونصّ الرمز الأساسي — وسم الفئة لا يأخذ التأكيد (شارة).
  groupOn: {
    color: colors.textMuted,
  },
});
