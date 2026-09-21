import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, spacing, buttons } from '../theme';
import { useI18n } from '../i18n/I18nContext';

type Props = {
  visible: boolean;
  onDone: () => void;
};

/** جولة ترحيبية قصيرة (5 خطوات) تُعرض مرة واحدة فقط لأول متداول يفتح التطبيق —
 * تبديل الزوج/أدوات الرسم/المؤشرات/التنبيهات/حاسبة المخاطرة، ثم تنبيه مخاطرة صريح بالخطوة الأخيرة. */
export function OnboardingOverlay({ visible, onDone }: Props) {
  const { t, rtl } = useI18n();
  const [step, setStep] = useState(0);

  const steps = [
    { title: t.onboardStep1Title, body: t.onboardStep1Body },
    { title: t.onboardStep2Title, body: t.onboardStep2Body },
    { title: t.onboardStep3Title, body: t.onboardStep3Body },
    { title: t.onboardStep4Title, body: t.onboardStep4Body },
    { title: t.onboardStep5Title, body: t.onboardStep5Body },
  ];
  const last = step === steps.length - 1;
  const align = rtl ? 'right' : 'left';

  const finish = () => {
    setStep(0);
    onDone();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={finish}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.card}>
            <View style={styles.dots}>
              {steps.map((_, i) => (
                <View key={i} style={[styles.dot, i <= step && styles.dotOn, i < step && styles.dotDone]} />
              ))}
            </View>
            <Text style={[styles.title, { textAlign: align }]}>{steps[step]!.title}</Text>
            <Text style={[styles.body, { textAlign: align }]}>{steps[step]!.body}</Text>
            {last ? (
              <Text style={[styles.riskNote, { textAlign: align }]}>{t.onboardRiskNote}</Text>
            ) : null}
            <View style={[styles.actions, rtl && styles.actionsRtl]}>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.skipBtn,
                  pressed && {
                    opacity: buttons.pressedOpacity,
                    transform: [{ scale: buttons.pressedScale }],
                  },
                ]}
                onPress={finish}
                accessibilityLabel={t.onboardSkip}
              >
                <Text style={styles.skipText}>{t.onboardSkip}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.nextBtn,
                  pressed && {
                    opacity: buttons.pressedOpacity,
                    transform: [{ scale: buttons.pressedScale }],
                  },
                ]}
                onPress={() => (last ? finish() : setStep((s) => s + 1))}
                accessibilityLabel={last ? t.onboardStart : t.onboardNext}
              >
                <Text style={styles.nextText}>{last ? t.onboardStart : t.onboardNext}</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 14, 22, 0.72)',
    justifyContent: 'flex-end',
  },
  safe: { width: '100%' },
  card: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    shadowColor: buttons.shadowColor,
    shadowOpacity: buttons.shadowOpacity,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: buttons.elevation,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: spacing.xs },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotOn: { backgroundColor: colors.accent, width: 18 },
  dotDone: { width: 6, opacity: 0.55 },
  title: { color: colors.text, fontWeight: '900', fontSize: 17 },
  body: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  riskNote: {
    color: colors.textDim,
    fontSize: 11,
    lineHeight: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  actionsRtl: { flexDirection: 'row-reverse' },
  skipBtn: { paddingHorizontal: 10, paddingVertical: 10 },
  skipText: { color: colors.textDim, fontWeight: '700', fontSize: 13 },
  nextBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    shadowColor: buttons.shadowColor,
    shadowOpacity: buttons.shadowOpacity,
    shadowRadius: buttons.shadowRadius,
    shadowOffset: { width: 0, height: buttons.shadowOffsetY },
    elevation: buttons.elevation,
  },
  nextText: { color: colors.onAccent, fontWeight: '900', fontSize: 14 },
});
