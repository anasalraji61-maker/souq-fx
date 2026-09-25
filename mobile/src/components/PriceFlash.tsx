import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { motion } from '../theme';
import type { Direction } from '../chart/dailyChange';

/**
 * DESIGN-PRO §6 — الحركة الوحيدة المسموحة بالواجهة: وميض خلفية خانة السعر 180ms عند تغيّر قيمتها
 * (up/down بشفافية 12%) يخفت إلى لا شيء. `flashKey` يتغيّر مع كل تيك مغيِّر (لحظة التيك) فيُعاد الوميض؛
 * `dir` يختار اللون. «تقليل الحركة» بالنظام ⇒ لا وميض (لون نصّ السعر يحمل الاتجاه أصلاً).
 */
export function PriceFlash({
  dir,
  flashKey,
  style,
  children,
}: {
  dir: Direction | undefined;
  flashKey: number | undefined;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (alive) setReduceMotion(v);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (flashKey == null || reduceMotion || (dir !== 'up' && dir !== 'down')) return;
    opacity.setValue(1);
    const anim = Animated.timing(opacity, {
      toValue: 0,
      duration: motion.flash,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
    // `dir` مقروء لحظة التيك؛ الوميض يُطلقه `flashKey` وحده
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flashKey, reduceMotion]);

  return (
    <View style={style}>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { opacity, backgroundColor: dir === 'down' ? motion.flashDown : motion.flashUp },
        ]}
      />
      {children}
    </View>
  );
}
