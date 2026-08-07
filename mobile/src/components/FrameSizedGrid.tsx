import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  useWindowDimensions,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radii, spacing } from '../theme';

/** نفس أبعاد فريمات الشارت (size=large) */
export const FRAME_CHART_H = 280;
export const FRAME_CHART_H_PHONE = 210;
export const FRAME_BOX_H = FRAME_CHART_H + 72 + 28;
export const FRAME_BOX_H_PHONE = FRAME_CHART_H_PHONE + 64 + 28;

export type GridItem = {
  id: string;
  node: React.ReactNode;
};

type Props = {
  items: GridItem[];
  storageKey?: string;
  onOrderChange?: (ids: string[]) => void;
};

type CellLayout = { x: number; y: number; w: number; h: number };

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
 * شبكة 2×2 بنفس مقاس الفريمات + مقبض سحب لتبديل أماكن المربعات
 */
export function FrameSizedGrid({ items, storageKey, onOrderChange }: Props) {
  const { width } = useWindowDimensions();
  const phone = width < 700;
  const boxH = phone ? FRAME_BOX_H_PHONE : FRAME_BOX_H;
  const [order, setOrder] = useState<string[] | null>(null);
  const [ready, setReady] = useState(!storageKey);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const ordered = useMemo(() => applyOrder(items, order), [items, order]);
  const orderedRef = useRef(ordered);
  orderedRef.current = ordered;

  const cellLayouts = useRef<Record<string, CellLayout>>({});
  const cellRefs = useRef<Record<string, View | null>>({});
  const dragFromId = useRef<string | null>(null);
  const hoverRef = useRef<string | null>(null);

  useEffect(() => {
    if (!storageKey) {
      setOrder(null);
      setReady(true);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw && alive) {
          const parsed = JSON.parse(raw) as string[];
          if (Array.isArray(parsed)) setOrder(parsed);
        }
      } catch {
        /* ignore */
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [storageKey]);

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
        onMoveShouldSetPanResponder: (_, g) =>
          !!storageKey && (Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4),
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
    for (const it of ordered) map[it.id] = makeHandleResponder(it.id);
    return map;
  }, [ordered, makeHandleResponder]);

  if (!ready) return null;

  return (
    <View style={[styles.grid, phone && styles.gridCol]}>
      {ordered.map((item) => {
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
              phone ? styles.cellPhone : styles.cellDesk,
              { height: boxH },
              hovered && styles.cellHover,
              dragging && styles.cellDragging,
              dragging && {
                transform: [{ translateX: dragOffset.x }, { translateY: dragOffset.y }],
                zIndex: 20,
              },
            ]}
          >
            {storageKey ? (
              <View style={styles.handleBar} {...responders[item.id].panHandlers}>
                <View style={styles.dotsGrid}>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <View key={i} style={styles.dot} />
                  ))}
                </View>
              </View>
            ) : null}
            <View style={styles.inner} pointerEvents={dragging ? 'none' : 'auto'}>
              {item.node}
            </View>
          </View>
        );
      })}
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
  cell: {
    overflow: 'hidden',
    borderRadius: radii.md,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cellDesk: {
    width: '48.5%',
    flexGrow: 1,
    minWidth: 240,
    maxWidth: '49%',
  },
  cellPhone: {
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
  },
  cellHover: {
    borderColor: colors.accent,
    borderWidth: 2,
    backgroundColor: colors.accentSoft,
  },
  cellDragging: {
    opacity: 0.92,
    borderColor: colors.accent,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  handleBar: {
    position: 'absolute',
    top: 6,
    left: 6,
    zIndex: 5,
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.92)',
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  dotsGrid: {
    width: 14,
    height: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    alignContent: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.accent,
  },
  inner: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
});
