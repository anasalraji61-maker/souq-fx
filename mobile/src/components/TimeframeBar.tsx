import React, { useCallback, useEffect, useRef } from 'react';
import { Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { colors, radii, spacing, buttons } from '../theme';
import { TIMEFRAMES, type Timeframe } from '../timeframes';
import { useI18n } from '../i18n/I18nContext';

type Props = {
  value: string;
  onChange: (tf: Timeframe) => void;
  compact?: boolean;
  /** التسمية المحلية (`t.tfLabels`: «ساعة» عربي، «1H» إنجليزي/كردي) بدل الرمز. كانت `TIMEFRAME_LABELS` العربية لكل اللغات ⇒ الكردي يرى أطراً عربية. */
  arabic?: boolean;
};

export function TimeframeBar({ value, onChange, compact, arabic = false }: Props) {
  const { t } = useI18n();
  /** chart-r60: بإطار ضيّق (شبكة الهاتف) الفريم المختار (4H/D/W) كان خارج النظر ⇒ الشريط يبدو بلا اختيار.
   *  نحفظ موضع كل زرّ ونمرّر للنشط عند التركيب وتغيّر `value` — فقط إن كان خارج النافذة (لا قفز عند كل نقرة). */
  const scrollRef = useRef<ScrollView>(null);
  const chipBox = useRef<Partial<Record<string, { x: number; w: number }>>>({});
  const viewW = useRef(0);
  const scrollX = useRef(0);
  const revealActive = useCallback(
    (animated: boolean) => {
      const box = chipBox.current[value];
      const vw = viewW.current;
      if (!box || vw <= 0) return;
      const left = scrollX.current;
      if (box.x >= left && box.x + box.w <= left + vw) return;
      const x = Math.max(0, box.x + box.w / 2 - vw / 2);
      scrollRef.current?.scrollTo({ x, animated });
    },
    [value],
  );
  useEffect(() => {
    revealActive(true);
  }, [revealActive]);
  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
      scrollEventThrottle={32}
      onScroll={(e) => {
        scrollX.current = e.nativeEvent.contentOffset.x;
      }}
      onLayout={(e) => {
        viewW.current = e.nativeEvent.layout.width;
        revealActive(false);
      }}
    >
      {TIMEFRAMES.map((tf) => {
        const active = value === tf;
        const label = arabic ? t.tfLabels[tf] : tf;
        return (
          <Pressable
            accessibilityState={{ selected: active }}
            accessibilityRole="button"
            key={tf}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              chipBox.current[tf] = { x, w: width };
              if (active) revealActive(false);
            }}
            onPress={() => onChange(tf)}
            accessibilityLabel={`${t.termTimeframeA11yPrefix} ${t.tfLabelsA11y[tf]}`}
            style={({ pressed }) => [
              styles.chip,
              active && styles.chipActive,
              compact && styles.chipCompact,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            hitSlop={4}
          >
            <Text style={[styles.text, active && styles.textActive, compact && styles.textCompact]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, alignSelf: 'flex-start', maxWidth: '100%' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    minWidth: 36,
    alignItems: 'center',
  },
  chipCompact: {
    paddingHorizontal: 6,
    paddingVertical: spacing.xs,
    minWidth: 30,
  },
  // DESIGN-PRO §1/§4: الفريم النشط هو عنصر التأكيد الوحيد بالشريط العلوي — تعبئة محايدة + نصّ بالتأكيد.
  chipActive: { backgroundColor: colors.selectedFill },
  text: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  textCompact: { fontSize: 10 },
  textActive: {
    color: colors.accent,
  },
});
