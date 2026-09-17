import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  PanResponder,
} from 'react-native';
import { colors, radii, spacing, buttons } from '../theme';
import { WATCHLIST } from '../chart/watchlist';
import { loadWatchlistItems } from '../chart/watchlistStore';
import { playSoftClick, unlockSoftClick } from '../audio/playSoftClick';

type Props = {
  value: string;
  onChange: (symbol: string) => void;
  onClose: () => void;
};

const ITEM_H = 24;
const DRUM_W = 86;

const wrap = (i: number, n: number) => {
  if (n <= 0) return 0;
  return ((i % n) + n) % n;
};

export function PairDrumWheel({ value, onChange, onClose }: Props) {
  const [pairs, setPairs] = useState<string[]>(() => WATCHLIST.map((w) => w.symbol));
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  const startIndex = useMemo(() => {
    const i = pairs.findIndex((s) => s === value);
    return i >= 0 ? i : 0;
  }, [pairs, value]);

  useEffect(() => {
    unlockSoftClick();
    playSoftClick();
    let alive = true;
    void loadWatchlistItems().then((items) => {
      if (!alive || !items.length) return;
      setPairs(items.map((x) => x.symbol));
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    activeRef.current = startIndex;
    setActive(startIndex);
  }, [startIndex]);

  const moveBy = (dir: number) => {
    if (!pairs.length) return;
    const next = wrap(activeRef.current + dir, pairs.length);
    if (next === activeRef.current) return;
    activeRef.current = next;
    setActive(next);
    playSoftClick();
  };

  const pick = (index: number) => {
    const next = wrap(index, pairs.length);
    const sym = pairs[next];
    if (!sym) return;
    playSoftClick();
    if (sym !== value) onChange(sym);
    onClose();
  };

  const above = pairs[wrap(active - 1, pairs.length)] ?? '';
  const current = pairs[wrap(active, pairs.length)] ?? '';
  const below = pairs[wrap(active + 1, pairs.length)] ?? '';

  const dragStart = useRef(0);
  const dragPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          dragStart.current = activeRef.current;
        },
        onPanResponderMove: (_, g) => {
          const steps = Math.round(-g.dy / ITEM_H);
          const next = wrap(dragStart.current + steps, pairs.length);
          if (next !== activeRef.current) {
            activeRef.current = next;
            setActive(next);
            playSoftClick();
          }
        },
        onPanResponderRelease: () => {
          /* يبقى مفتوحاً حتى يضغط زوجاً */
        },
      }),
    [pairs.length]
  );

  return (
    <View
      style={styles.drum}
      {...dragPan.panHandlers}
      {...(Platform.OS === 'web'
        ? {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onWheel: (event: any) => {
              event?.preventDefault?.();
              event?.stopPropagation?.();
              const dy = event?.nativeEvent?.deltaY ?? event?.deltaY ?? 0;
              if (dy > 4) moveBy(1);
              else if (dy < -4) moveBy(-1);
            },
          }
        : {})}
    >
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.side,
          pressed && {
            opacity: buttons.pressedOpacity,
            transform: [{ scale: buttons.pressedScale }],
          },
        ]}
        onPress={() => pick(active - 1)}
        accessibilityLabel={`الزوج السابق: ${above}`}
      >
        <Text numberOfLines={1} style={styles.sideText}>
          {above}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.mid,
          pressed && {
            opacity: buttons.pressedOpacity,
            transform: [{ scale: buttons.pressedScale }],
          },
        ]}
        onPress={() => pick(active)}
        accessibilityLabel={`اختيار الزوج الحالي: ${current}`}
      >
        <Text numberOfLines={1} style={styles.midText}>
          {current}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.side,
          pressed && {
            opacity: buttons.pressedOpacity,
            transform: [{ scale: buttons.pressedScale }],
          },
        ]}
        onPress={() => pick(active + 1)}
        accessibilityLabel={`الزوج التالي: ${below}`}
      >
        <Text numberOfLines={1} style={styles.sideText}>
          {below}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  drum: {
    width: DRUM_W,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.controlBg,
    overflow: 'hidden',
    paddingVertical: spacing.xs,
    paddingHorizontal: 5,
    gap: 2,
  },
  side: {
    height: ITEM_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    opacity: 0.45,
    textAlign: 'center',
  },
  mid: {
    height: 28,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  midText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
});
