import React from 'react';
import { Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { colors, radii, spacing, buttons } from '../theme';
import { TIMEFRAMES, TIMEFRAME_LABELS, type Timeframe } from '../timeframes';
import { useI18n } from '../i18n/I18nContext';

type Props = {
  value: string;
  onChange: (tf: Timeframe) => void;
  compact?: boolean;
  /** عرض التسمية العربية بجانب الرمز */
  arabic?: boolean;
};

export function TimeframeBar({ value, onChange, compact, arabic = false }: Props) {
  const { t } = useI18n();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {TIMEFRAMES.map((tf) => {
        const active = value === tf;
        const label = arabic ? TIMEFRAME_LABELS[tf] : tf;
        return (
          <Pressable
            accessibilityState={{ selected: active }}
            accessibilityRole="button"
            key={tf}
            onPress={() => onChange(tf)}
            accessibilityLabel={`${t.termTimeframeA11yPrefix} ${label}`}
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
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPanel,
    minWidth: 36,
    alignItems: 'center',
  },
  chipCompact: {
    paddingHorizontal: 6,
    paddingVertical: spacing.xs,
    minWidth: 30,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
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
