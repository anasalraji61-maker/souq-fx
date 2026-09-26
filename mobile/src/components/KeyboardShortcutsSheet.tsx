import React, { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { useI18n } from '../i18n/I18nContext';

/**
 * W4 (قرار ١٦): «?» على الويب يفتح قائمة اختصارات لوحة المفاتيح. النصوص نفسها التي يعرضها الشارت
 * بتلميحه (`mcHintNavigateWeb` + `mcHintTypeTfWeb`) مقسومة سطراً سطراً عند « · » — مصدر واحد، فلا
 * تختلف القائمة عن التلميح إن تغيّر اختصار. لا شيء على الهاتف.
 */
function isTypingTarget(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node || !node.tagName) return false;
  const tag = node.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || node.isContentEditable === true;
}

export function KeyboardShortcutsSheet() {
  const { t, rtl } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        // الالتقاط: Esc يغلق القائمة وحدها ولا يلغي رسماً جارياً تحتها.
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        return;
      }
      if (event.key !== '?' || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      setOpen((v) => !v);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open]);

  if (Platform.OS !== 'web') return null;

  const lines = `${t.mcHintNavigateWeb}${t.mcHintTypeTfWeb}`
    .split(' · ')
    .map((s) => s.trim())
    .filter(Boolean);
  const align = rtl ? ('right' as const) : ('left' as const);

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
      <Pressable
        style={styles.backdrop}
        onPress={() => setOpen(false)}
        accessibilityRole="button"
        accessibilityLabel={t.closeWord}
      >
        <Pressable style={styles.sheet} onPress={() => undefined} accessible={false}>
          <View accessibilityRole="list">
            {lines.map((line, i) => (
              <Text key={i} style={[styles.line, { textAlign: align }]}>
                {line}
              </Text>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.closeWord}
            onPress={() => setOpen(false)}
            style={({ pressed }) => [styles.closeBtn, rtl ? styles.closeBtnRtl : null, pressed && styles.closePressed]}
          >
            <Text style={styles.closeText}>{t.closeWord}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 16,
    gap: 8,
    maxWidth: 520,
    width: '100%',
  },
  line: { color: colors.text, fontSize: 13, lineHeight: 20, fontVariant: ['tabular-nums'] },
  closeBtn: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 12, marginTop: 4 },
  closeBtnRtl: { alignSelf: 'flex-start' },
  closePressed: { opacity: 0.6 },
  closeText: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
});
