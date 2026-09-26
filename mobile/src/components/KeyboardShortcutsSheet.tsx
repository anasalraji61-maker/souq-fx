import React, { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { useI18n } from '../i18n/I18nContext';

/**
 * W4 (قرار ١٦): «?» على الويب يفتح قائمة اختصارات لوحة المفاتيح. النصوص نفسها التي يعرضها الشارت
 * بتلميحه (`mcHintNavigateWeb` + `mcHintTypeTfWeb` + `mcHintTypeDateWeb` + `mcHintDrawWeb` + `mcHintSelectedWeb`) مقسومة سطراً سطراً عند « · » — مصدر واحد، فلا
 * تختلف القائمة عن التلميح إن تغيّر اختصار. ويُلحق بها `shortcutsMouseWeb` (الزرّ الأيمن والنقر، chart-r93a). لا شيء على الهاتف.
 */
function isTypingTarget(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node || !node.tagName) return false;
  const tag = node.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || node.isContentEditable === true;
}

/**
 * «?» بالتخطيط اللاتيني و«؟» (U+061F) بالعربي والكردي: Shift+/ بهما يعطي «؟» فكانت القائمة لا تُفتح
 * لمن يكتب بالعربية أو الكردية. `event.key` لا `event.code` — «?» على AZERTY فوق الفاصلة لا الشرطة.
 */
const HELP_KEYS = new Set(['?', '\u061F']);

/** مفتاح يتكرّر بين التلميحات السياقية (Esc، Ctrl+Z / Ctrl+Y، Alt+T/H/V/F): يُبقى أول سطر يبدأ به. */
const REPEATABLE_KEY = /^(Esc|Ctrl\+\S+|Alt\+\S+)$/;

/**
 * launch179a: التلميحات السياقية (تنقّل، رسم، رسم محدَّد، فأرة) تُضمّ بـ« · » ثم تُقسم سطراً سطراً.
 * `mcHintDrawWeb`/`mcHintSelectedWeb` لا تبدأ بـ« · » فتُضمّ هنا لا بالسلسلة. الأسطر المكرّرة حرفياً،
 * أو التي تبدأ بمفتاح سبق (Esc للإلغاء/لإلغاء التحديد)، تُحذف.
 */
function shortcutLines(sources: string[]): string[] {
  const seenText = new Set<string>();
  const seenKey = new Set<string>();
  const out: string[] = [];
  for (const raw of sources.join(' · ').split(' · ')) {
    const line = raw.trim();
    if (!line || seenText.has(line)) continue;
    const first = line.split(' ')[0];
    if (REPEATABLE_KEY.test(first)) {
      if (seenKey.has(first)) continue;
      seenKey.add(first);
    }
    seenText.add(line);
    out.push(line);
  }
  return out;
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
      if (!HELP_KEYS.has(event.key) || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      setOpen((v) => !v);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open]);

  if (Platform.OS !== 'web') return null;

  const lines = shortcutLines([
    `${t.mcHintNavigateWeb}${t.mcHintTypeTfWeb}${t.mcHintTypeDateWeb}`,
    t.mcHintDrawWeb,
    t.mcHintSelectedWeb,
    t.shortcutsMouseWeb,
  ]);
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
          <Text accessibilityRole="header" style={[styles.title, { textAlign: align }]}>
            {t.shortcutsSheetTitle}
          </Text>
          <View accessibilityRole="list" accessibilityLabel={t.shortcutsSheetTitle}>
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
  title: { color: colors.text, fontSize: 15, fontWeight: '500', marginBottom: 4 },
  line: { color: colors.text, fontSize: 13, lineHeight: 20, fontVariant: ['tabular-nums'] },
  closeBtn: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 12, marginTop: 4 },
  closeBtnRtl: { alignSelf: 'flex-start' },
  closePressed: { opacity: 0.6 },
  closeText: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
});
