import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  PanResponder,
  useWindowDimensions,
  type GestureResponderEvent,
  type PanResponderGestureState,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radii, spacing, buttons } from '../theme';
import { useI18n } from '../i18n/I18nContext';

/** نفس أبعاد فريمات الشارت (size=large) */
export const FRAME_CHART_H = 280;
export const FRAME_CHART_H_PHONE = 210;
/** مساحة إضافية للهيدر + الأوقات + شريط التواريخ السفلي */
export const FRAME_BOX_H = FRAME_CHART_H + 140;
export const FRAME_BOX_H_PHONE = FRAME_CHART_H_PHONE + 130;
/** ارتفاع أقصر عند عرض فريمين بكل صف على الهاتف (وضع الشبكة) */
export const FRAME_CHART_H_PHONE_GRID = 150;
export const FRAME_BOX_H_PHONE_GRID = FRAME_CHART_H_PHONE_GRID + 110;

/**
 * تفضيل المتداول على الهاتف — خانة "الفريمات": مربعات (فريمان جنباً إلى
 * جنب، صغيرة) أو مستطيلات (فريم واحد عمودي بكل صف، بعرض الشاشة وأطول).
 * كلا الوضعين عمودي التمرير (لا تمرير أفقي)، ويُحفظ الاختيار محلياً.
 */
type PhoneMode = 'single' | 'grid' | 'stack';

/** How a chart cell is shown: `column` = four tall rectangles side by side, `square` = 2×2 squares.
 * Both are "clean" on the phone: candles only, one short line on top (no axes, no timeframe bar). */
export type FrameCellMode = 'normal' | 'square' | 'column';
export const FrameCellContext = createContext<FrameCellMode>('normal');

export type GridItem = {
  id: string;
  node: React.ReactNode;
};

export type FrameLayoutCount = 1 | 2 | 3 | 4;
/** مربعات · مستطيلات · فريم الظل (واحد بطيّات زمنية) */
export type FrameLayoutShape = 'square' | 'rect' | 'shadow';

type Props = {
  items: GridItem[];
  storageKey?: string;
  onOrderChange?: (ids: string[]) => void;
  layoutCount?: FrameLayoutCount;
  /** square = مقاس ثابت · rect = يملأ الشاشة (2/3/4) */
  shape?: FrameLayoutShape;
  /** إظهار كل البلاطات (أدوات) بدل قصّها إلى 4 */
  showAll?: boolean;
  /** ترتيب البداية للمتداول الجديد */
  defaultOrder?: string[];
  /** phone "one large chart" mode shows this item (default: the first one) */
  singleId?: string;
};

type CellLayout = { x: number; y: number; w: number; h: number };

function resolveOrder(itemIds: string[], stored: string[] | null, defaultOrder?: string[]): string[] {
  const fallback = defaultOrder?.length
    ? [
        ...defaultOrder.filter((id) => itemIds.includes(id)),
        ...itemIds.filter((id) => !defaultOrder.includes(id)),
      ]
    : itemIds;
  if (!stored?.length) return fallback;
  const next: string[] = [];
  for (const id of stored) {
    if (itemIds.includes(id) && !next.includes(id)) next.push(id);
  }
  for (const id of fallback) {
    if (!next.includes(id)) next.push(id);
  }
  return next;
}

function applyOrder(items: GridItem[], order: string[] | null): GridItem[] {
  if (!order?.length) return items;
  const map = new Map(items.map((it) => [it.id, it]));
  const next: GridItem[] = [];
  for (const id of order) {
    const hit = map.get(id);
    if (hit) {
      next.push(hit);
      map.delete(id);
    }
  }
  for (const left of map.values()) next.push(left);
  return next;
}

/**
 * شبكة فريمات قابلة للسحب — مربعات ثابتة أو مستطيلات تملأ الشاشة
 */
export function FrameSizedGrid({
  items,
  storageKey,
  onOrderChange,
  layoutCount = 4,
  shape = 'square',
  showAll = false,
  defaultOrder,
  singleId,
}: Props) {
  const { t } = useI18n();
  const { width, height: windowH } = useWindowDimensions();
  const phone = width < 700;
  /** تعبئة الشاشة لشارتات المحطة فقط — ليست لشبكة الأدوات متعددة اللوحات (showAll) */
  const fillRect = !phone && !showAll && shape === 'rect' && layoutCount > 1;
  const fillSquare = !phone && !showAll && shape === 'square' && layoutCount > 1;
  const fill = fillRect || fillSquare;
  const boxH = phone ? FRAME_BOX_H_PHONE : FRAME_BOX_H;
  const [order, setOrder] = useState<string[] | null>(null);
  const [ready, setReady] = useState(!storageKey);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const ordered = useMemo(() => applyOrder(items, order), [items, order]);
  const itemIdsKey = useMemo(() => items.map((it) => it.id).join('|'), [items]);
  const defaultOrderKey = defaultOrder?.join('|') ?? '';
  const displayed = useMemo(
    () => (phone || showAll ? ordered : ordered.slice(0, layoutCount)),
    [phone, showAll, ordered, layoutCount]
  );
  const orderedRef = useRef(displayed);
  orderedRef.current = displayed;

  const cellLayouts = useRef<Record<string, CellLayout>>({});
  const cellRefs = useRef<Record<string, View | null>>({});
  const dragFromId = useRef<string | null>(null);
  const hoverRef = useRef<string | null>(null);

  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    if (!storageKey) {
      setOrder(null);
      setReady(true);
      return;
    }
    let alive = true;
    const ids = itemsRef.current.map((it) => it.id);
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        const parsed = raw ? (JSON.parse(raw) as unknown) : null;
        const stored = Array.isArray(parsed) ? (parsed as string[]) : null;
        if (alive) {
          const resolved = resolveOrder(ids, stored, defaultOrder);
          setOrder(resolved);
          onOrderChange?.(resolved);
        }
      } catch {
        if (alive) {
          const resolved = resolveOrder(ids, null, defaultOrder);
          setOrder(resolved);
          onOrderChange?.(resolved);
        }
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [storageKey, itemIdsKey, defaultOrderKey, defaultOrder]);

  const persist = useCallback(
    async (ids: string[]) => {
      setOrder(ids);
      onOrderChange?.(ids);
      if (!storageKey) return;
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(ids));
      } catch {
        /* ignore */
      }
    },
    [storageKey, onOrderChange]
  );

  /** وضع عرض الهاتف: شبكة (اثنان بكل صف) أو قائمة (واحد بكل صف) — بحسب اختيار المتداول */
  // v2: the phone now opens on one large chart (four small frames left the candles hard to read).
  const phoneModeKey = storageKey ? `${storageKey}.phoneMode.v2` : null;
  const [phoneMode, setPhoneMode] = useState<PhoneMode>('single');

  useEffect(() => {
    if (!phoneModeKey) return;
    let alive = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(phoneModeKey);
        if (alive && (raw === 'single' || raw === 'grid' || raw === 'stack')) setPhoneMode(raw);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, [phoneModeKey]);

  const choosePhoneMode = useCallback(
    (mode: PhoneMode) => {
      setPhoneMode(mode);
      if (phoneModeKey) {
        AsyncStorage.setItem(phoneModeKey, mode).catch(() => {
          /* ignore */
        });
      }
    },
    [phoneModeKey]
  );

  const measureCell = useCallback((id: string) => {
    const node = cellRefs.current[id];
    if (!node) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const n = node as any;
    if (typeof n.measureInWindow === 'function') {
      n.measureInWindow((x: number, y: number, w: number, h: number) => {
        cellLayouts.current[id] = { x, y, w, h };
      });
    }
  }, []);

  const remasureAll = useCallback(() => {
    for (const it of orderedRef.current) measureCell(it.id);
  }, [measureCell]);

  const findTargetAt = useCallback((pageX: number, pageY: number, skipId: string) => {
    for (const it of orderedRef.current) {
      if (it.id === skipId) continue;
      const L = cellLayouts.current[it.id];
      if (!L) continue;
      if (pageX >= L.x && pageX <= L.x + L.w && pageY >= L.y && pageY <= L.y + L.h) {
        return it.id;
      }
    }
    return null;
  }, []);

  const swap = useCallback(
    (a: string, b: string) => {
      if (a === b) return;
      const ids = orderedRef.current.map((x) => x.id);
      const i = ids.indexOf(a);
      const j = ids.indexOf(b);
      if (i < 0 || j < 0) return;
      const next = [...ids];
      next[i] = b;
      next[j] = a;
      void persist(next);
    },
    [persist]
  );

  const makeHandleResponder = useCallback(
    (id: string) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !!storageKey,
        onStartShouldSetPanResponderCapture: () => !!storageKey,
        onMoveShouldSetPanResponder: (_, g) =>
          !!storageKey && (Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3),
        onMoveShouldSetPanResponderCapture: (_, g) =>
          !!storageKey && (Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3),
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          remasureAll();
          dragFromId.current = id;
          hoverRef.current = null;
          setDraggingId(id);
          setHoverId(null);
          setDragOffset({ x: 0, y: 0 });
        },
        onPanResponderMove: (e: GestureResponderEvent, g: PanResponderGestureState) => {
          setDragOffset({ x: g.dx, y: g.dy });
          const { pageX, pageY } = e.nativeEvent;
          const target = findTargetAt(pageX, pageY, id);
          hoverRef.current = target;
          setHoverId(target);
        },
        onPanResponderRelease: () => {
          const from = dragFromId.current;
          const to = hoverRef.current;
          if (from && to) swap(from, to);
          dragFromId.current = null;
          hoverRef.current = null;
          setDraggingId(null);
          setHoverId(null);
          setDragOffset({ x: 0, y: 0 });
        },
        onPanResponderTerminate: () => {
          dragFromId.current = null;
          hoverRef.current = null;
          setDraggingId(null);
          setHoverId(null);
          setDragOffset({ x: 0, y: 0 });
        },
      }),
    [storageKey, findTargetAt, swap, remasureAll]
  );

  const responders = useMemo(() => {
    const map: Record<string, ReturnType<typeof PanResponder.create>> = {};
    for (const it of displayed) map[it.id] = makeHandleResponder(it.id);
    return map;
  }, [displayed, makeHandleResponder]);

  if (!ready) return null;

  const renderCell = (item: GridItem, index: number, cellStyle?: StyleProp<ViewStyle>, compact = false) => {
    const dragging = draggingId === item.id;
    const hovered = hoverId === item.id && draggingId !== item.id;
    return (
      <View
        key={item.id}
        ref={(node) => {
          cellRefs.current[item.id] = node;
        }}
        onLayout={() => measureCell(item.id)}
        style={[
          styles.cell,
          cellStyle,
          hovered && styles.cellHover,
          dragging && styles.cellDragging,
          dragging && {
            transform: [{ translateX: dragOffset.x }, { translateY: dragOffset.y }],
            zIndex: 20,
          },
        ]}
      >
        {storageKey && !compact ? (
          <View
            style={styles.handleBar}
            {...responders[item.id].panHandlers}
            // السحب وحده لا يصل لقارئ الشاشة: «قابل للضبط» ⇒ سحب لأعلى/لأسفل يبدّله مع جاره.
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={t.gridHandleA11y}
            accessibilityValue={{
              min: 1,
              max: displayed.length,
              now: index + 1,
              // بلا `text` ينطق iOS القيمة نسبةً مئوية («33 percent») — launch148.
              text: t.gridHandlePosA11y.replace('{n}', String(index + 1)).replace('{total}', String(displayed.length)),
            }}
            accessibilityActions={[
              ...(index > 0 ? [{ name: 'decrement' as const, label: t.wlMoveUpA11y }] : []),
              ...(index < displayed.length - 1 ? [{ name: 'increment' as const, label: t.wlMoveDownA11y }] : []),
            ]}
            onAccessibilityAction={(e) => {
              const j = e.nativeEvent.actionName === 'decrement' ? index - 1 : e.nativeEvent.actionName === 'increment' ? index + 1 : -1;
              if (displayed[j]) swap(item.id, displayed[j].id);
            }}
          >
            <View style={styles.handleInset}>
              <View style={styles.dotsGrid}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <View key={i} style={styles.dot} />
                ))}
              </View>
            </View>
          </View>
        ) : null}
        <View style={styles.inner} pointerEvents={dragging ? 'none' : 'auto'}>
          {item.node}
        </View>
      </View>
    );
  };

  if (fillRect) {
    return (
      <View style={styles.gridFillRow}>
        {displayed.map((item, index) => renderCell(item, index, styles.cellFillFlex))}
      </View>
    );
  }

  if (fillSquare) {
    if (layoutCount === 2) {
      return (
        <View style={styles.gridFillRow}>
          {displayed.map((item, index) => renderCell(item, index, styles.cellFillFlex))}
        </View>
      );
    }
    if (layoutCount === 3) {
      return (
        <View style={styles.gridFillCol}>
          <View style={styles.gridFillRow}>
            {displayed[0] ? renderCell(displayed[0], 0, styles.cellFillFlex) : null}
          </View>
          <View style={styles.gridFillRow}>
            {displayed[1] ? renderCell(displayed[1], 1, styles.cellFillFlex) : null}
            {displayed[2] ? renderCell(displayed[2], 2, styles.cellFillFlex) : null}
          </View>
        </View>
      );
    }
    // 4 = شبكة 2×2 تملأ الارتفاع المتاح
    return (
      <View style={styles.gridFillCol}>
        <View style={styles.gridFillRow}>
          {displayed[0] ? renderCell(displayed[0], 0, styles.cellFillFlex) : null}
          {displayed[1] ? renderCell(displayed[1], 1, styles.cellFillFlex) : null}
        </View>
        <View style={styles.gridFillRow}>
          {displayed[2] ? renderCell(displayed[2], 2, styles.cellFillFlex) : null}
          {displayed[3] ? renderCell(displayed[3], 3, styles.cellFillFlex) : null}
        </View>
      </View>
    );
  }

  const phoneModeToggle = phone && !showAll && (
    <View style={styles.phoneModeSwitcher}>
      <View style={styles.phoneModeTag}>
        <Text style={styles.phoneModeTagText}>{t.gridFramesWord}</Text>
      </View>
      <Pressable
        accessibilityState={{ selected: phoneMode === 'single' }}
        accessibilityRole="button"
        onPress={() => choosePhoneMode('single')}
        style={({ pressed }) => [
          styles.phoneModeBtn,
          phoneMode === 'single' && styles.phoneModeBtnActive,
          pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
        ]}
        accessibilityLabel={t.gridSingleA11y}
      >
        <Text style={[styles.phoneModeText, phoneMode === 'single' && styles.phoneModeTextActive]}>
          {t.gridSingleWord}
        </Text>
      </Pressable>
      <Pressable
        accessibilityState={{ selected: phoneMode === 'grid' }}
        accessibilityRole="button"
        onPress={() => choosePhoneMode('grid')}
        style={({ pressed }) => [
          styles.phoneModeBtn,
          phoneMode === 'grid' && styles.phoneModeBtnActive,
          pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
        ]}
        accessibilityLabel={t.gridSquaresA11y}
      >
        <Text style={[styles.phoneModeText, phoneMode === 'grid' && styles.phoneModeTextActive]}>
          {t.gridSquaresWord}
        </Text>
      </Pressable>
      <Pressable
        accessibilityState={{ selected: phoneMode === 'stack' }}
        accessibilityRole="button"
        onPress={() => choosePhoneMode('stack')}
        style={({ pressed }) => [
          styles.phoneModeBtn,
          phoneMode === 'stack' && styles.phoneModeBtnActive,
          pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
        ]}
        accessibilityLabel={t.gridRectanglesA11y}
      >
        <Text style={[styles.phoneModeText, phoneMode === 'stack' && styles.phoneModeTextActive]}>
          {t.gridRectanglesWord}
        </Text>
      </Pressable>
    </View>
  );

  // Phone, one large chart: the first frame fills most of the screen (switch its pair from its own symbol menu).
  const singleItem = (singleId && items.find((it) => it.id === singleId)) || displayed[0];
  if (phone && !showAll && phoneMode === 'single' && singleItem) {
    const bigH = Math.max(420, Math.round(windowH * 0.64));
    return (
      <View>
        {phoneModeToggle}
        <View style={[styles.grid, styles.gridCol]}>{renderCell(singleItem, 0, [styles.cellPhone, { height: bigH }])}</View>
      </View>
    );
  }

  // Phone, squares: a clean 2×2 that fills the screen (candles only, one short line per square).
  if (phone && !showAll && phoneMode === 'grid') {
    const areaH = Math.max(380, windowH - 330);
    const cellH = Math.floor((areaH - spacing.xs) / 2);
    return (
      <View>
        {phoneModeToggle}
        <FrameCellContext.Provider value="square">
          <View style={styles.compactGrid}>
            {displayed.slice(0, 4).map((item, index) =>
              renderCell(item, index, [styles.cellCompactSquare, { height: cellH }], true)
            )}
          </View>
        </FrameCellContext.Provider>
      </View>
    );
  }

  // Phone, rectangles: four tall, thin charts side by side across the screen (all visible at once).
  if (phone && !showAll && phoneMode === 'stack') {
    const areaH = Math.max(380, windowH - 330);
    return (
      <View>
        {phoneModeToggle}
        <FrameCellContext.Provider value="column">
          <View style={[styles.compactRow, { height: areaH }]}>
            {displayed.slice(0, 4).map((item, index) => renderCell(item, index, styles.cellCompactColumn, true))}
          </View>
        </FrameCellContext.Provider>
      </View>
    );
  }

  return (
    <View>
      {phoneModeToggle}
      <View style={[styles.grid, phone && styles.gridCol]}>
        {displayed.map((item, index) =>
          renderCell(item, index, [
            phone ? styles.cellPhone : styles.cellDesk,
            !phone && layoutCount === 1 && styles.cellOne,
            !phone && layoutCount === 2 && styles.cellTwo,
            !phone && layoutCount === 3 && index === 0 && styles.cellThreeTop,
            !phone && layoutCount === 3 && index > 0 && styles.cellThreeBottom,
            { height: boxH },
          ])
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    width: '100%',
  },
  gridCol: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
  },
  gridFillCol: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    width: '100%',
    gap: spacing.sm,
  },
  gridFillRow: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    width: '100%',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cell: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radii.md,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cellFillFlex: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    height: '100%',
    maxWidth: '100%',
  },
  cellDesk: {
    width: '49%',
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 240,
    maxWidth: '49%',
  },
  cellOne: { width: '100%', maxWidth: '100%', minWidth: 0 },
  cellTwo: { width: '49%', maxWidth: '49%', minWidth: 240 },
  cellThreeTop: { width: '100%', maxWidth: '100%', minWidth: 0 },
  cellThreeBottom: { width: '49%', maxWidth: '49%', minWidth: 240 },
  cellPhone: {
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
  },
  compactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.xs,
    width: '100%',
  },
  cellCompactSquare: {
    width: '49.4%',
    minWidth: 0,
    flexGrow: 0,
    flexShrink: 0,
  },
  compactRow: {
    flexDirection: 'row',
    gap: 3,
    width: '100%',
  },
  cellCompactColumn: {
    flex: 1,
    minWidth: 0,
    height: '100%',
  },
  gridPhoneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    width: '100%',
  },
  cellPhoneGrid: {
    width: '48%',
    minWidth: 0,
    maxWidth: '48%',
    flexGrow: 0,
    flexShrink: 0,
  },
  phoneModeSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    // §5.5: خلفية وحدها — كان حدّاً وخلفية معاً.
    backgroundColor: colors.controlBg,
    alignSelf: 'flex-end',
    marginBottom: spacing.sm,
  },
  // DESIGN-PRO §1: «الفريمات» تسمية لا زرّ — كانت بالتأكيد داخل صندوق كزرّ بجانب الزرّ المختار (عنصرا
  // تأكيد بشريط واحد، وتسمية تشبه زرّاً لا يستجيب). الآن نصّ ثانوي بلا صندوق؛ التأكيد للمختار وحده.
  phoneModeTag: {
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  phoneModeTagText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  phoneModeBtn: {
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.bgPanel,
  },
  /** DESIGN-PRO §1/§4: الاختيار تعبئة محايدة + حدّ أقوى + نصّ أساسي — لا تأكيد بحدّ وتعبئة ونصّ معاً
   * بجانب الشارت؛ `accessibilityState.selected` يحمله لقارئ الشاشة. */
  phoneModeBtnActive: {
    borderColor: colors.border,
    backgroundColor: colors.selectedFill,
  },
  phoneModeText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
  },
  phoneModeTextActive: {
    color: colors.text,
    fontWeight: '500',
  },
  cellHover: {
    borderColor: colors.accent,
    borderWidth: 2,
    backgroundColor: colors.accentSoft,
  },
  cellDragging: {
    opacity: 0.92,
    // DESIGN-PRO §5.5: حدّ التأكيد وحده يدلّ على الإطار المسحوب — لا ظلّ فوق الحدّ والخلفية.
    borderColor: colors.accent,
  },
  handleBar: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 30,
    width: 36,
    height: 36,
    borderRadius: 7,
    padding: spacing.xs,
    // DESIGN-PRO §1/§5.5: مقبض كل فريم بالسكون محايد — كان حدّاً بالتأكيد + حدّاً داخلياً بالتأكيد + 9 نقاط
    // بالتأكيد على **كل** فريم (4 فريمات ⇒ 4 عناصر تأكيد بمنطقة واحدة). خلفية وحدها تكفي فوق الشارت.
    backgroundColor: 'rgba(8, 17, 30, 0.55)',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cursor: 'grab' as any,
  },
  handleInset: {
    flex: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsGrid: {
    width: 14,
    height: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignContent: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textDim,
  },
  inner: {
    position: 'relative',
    flex: 1,
    width: '100%',
    minHeight: 0,
    overflow: 'hidden',
  },
});
