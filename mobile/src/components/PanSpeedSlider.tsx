import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  PanResponder,
  type LayoutChangeEvent,
  type GestureResponderEvent,
} from 'react-native';
import { colors, spacing, buttons } from '../theme';
import { clampPanSpeed } from '../chart/panSpeed';

type Props = {
  value: number;
  onChange: (next: number) => void;
};

/** علامة مثبت السرعة (كروز) بأسلوب السيارات الأمريكية/اليابانية */
export function CruiseSpeedMark({
  size = 16,
  active = false,
}: {
  size?: number;
  active?: boolean;
}) {
  const stroke = active ? colors.accent : colors.textMuted;
  const rim = size;
  const needleW = Math.max(1.5, size * 0.1);
  const needleH = size * 0.38;

  return (
    <View style={[styles.markBox, { width: rim, height: rim }]} accessibilityLabel="مثبت السرعة">
      <View
        style={[
          styles.markRim,
          {
            width: rim,
            height: rim,
            borderRadius: rim / 2,
            borderColor: stroke,
          },
        ]}
      />
      <View
        style={[
          styles.markNeedle,
          {
            width: needleW,
            height: needleH,
            backgroundColor: stroke,
            bottom: rim * 0.42,
            transform: [{ rotate: '-38deg' }],
          },
        ]}
      />
      <View
        style={[
          styles.markHub,
          {
            width: size * 0.18,
            height: size * 0.18,
            borderRadius: size * 0.09,
            backgroundColor: stroke,
          },
        ]}
      />
      <View
        style={[
          styles.markArrow,
          {
            borderLeftWidth: size * 0.14,
            borderRightWidth: size * 0.14,
            borderBottomWidth: size * 0.16,
            borderBottomColor: stroke,
            bottom: size * 0.06,
          },
        ]}
      />
    </View>
  );
}

/**
 * مربع صغير بعلامة الكروز — بالضغط يظهر الشريط والنسبة، وبالضغط ثانية يختصر
 */
export function PanSpeedSlider({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const trackW = useRef(72);
  const [width, setWidth] = useState(72);

  const setFromX = useCallback(
    (x: number) => {
      const w = Math.max(1, trackW.current);
      const ratio = Math.max(0, Math.min(1, x / w));
      onChange(clampPanSpeed(ratio * 100));
    },
    [onChange]
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e: GestureResponderEvent) => {
          setFromX(e.nativeEvent.locationX);
        },
        onPanResponderMove: (e: GestureResponderEvent) => {
          setFromX(e.nativeEvent.locationX);
        },
      }),
    [setFromX]
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) {
      trackW.current = w;
      setWidth(w);
    }
  };

  const pct = clampPanSpeed(value);
  const fill = (pct / 100) * width;
  const thumbSize = 9;
  const thumbLeft = Math.max(0, Math.min(width - thumbSize, fill - thumbSize / 2));

  const toggle = () => setOpen((v) => !v);

  if (!open) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.square,
          pct >= 40 && styles.squareOn,
          pressed && {
            opacity: buttons.pressedOpacity,
            transform: [{ scale: buttons.pressedScale }],
          },
        ]}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={`مثبت السرعة ${pct} — اضغط للتفاصيل`}
        hitSlop={6}
      >
        <CruiseSpeedMark size={15} active={pct >= 40} />
      </Pressable>
    );
  }

  return (
    <View
      style={styles.wrap}
      accessibilityRole="adjustable"
      accessibilityLabel={`مثبت سرعة الشارت ${pct}`}
    >
      <Pressable
        onPress={toggle}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="إخفاء تفاصيل السرعة"
        style={({ pressed }) => [
          styles.markBtn,
          pressed && {
            opacity: buttons.pressedOpacity,
            transform: [{ scale: buttons.pressedScale }],
          },
        ]}
      >
        <CruiseSpeedMark size={15} active />
      </Pressable>
      <View style={styles.trackHit} onLayout={onLayout} {...responder.panHandlers}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: fill }]} />
          <View
            style={[
              styles.thumb,
              {
                left: thumbLeft,
                width: thumbSize,
                height: thumbSize,
                borderRadius: thumbSize / 2,
              },
            ]}
          />
        </View>
      </View>
      <Text style={styles.percent}>{pct}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  square: {
    width: 30,
    height: 30,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.controlBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.controlBg,
    minWidth: 118,
    maxWidth: 138,
    height: 30,
  },
  markBtn: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackHit: {
    flex: 1,
    height: 18,
    justifyContent: 'center',
    minWidth: 56,
  },
  track: {
    height: 4,
    borderRadius: 3,
    backgroundColor: 'rgba(148,163,184,0.28)',
    overflow: 'visible',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  thumb: {
    position: 'absolute',
    top: -2.5,
    backgroundColor: colors.sliderThumb,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  percent: {
    color: colors.text,
    fontSize: 9,
    fontWeight: '900',
    minWidth: 16,
    textAlign: 'right',
  },
  markBox: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  markRim: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  markNeedle: {
    position: 'absolute',
    borderRadius: 1,
  },
  markHub: {
    position: 'absolute',
  },
  markArrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
